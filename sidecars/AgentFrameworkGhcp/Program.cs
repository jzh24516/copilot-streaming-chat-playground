using System.Collections.Concurrent;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Agents.AI;
using Microsoft.Agents.AI.CopilotStudio;
using Microsoft.Agents.CopilotStudio.Client;
using Microsoft.Agents.CopilotStudio.Client.Discovery;
using Microsoft.Agents.Core.Models;
using Microsoft.Extensions.AI;

#if LATEST_COPILOTSTUDIO
const string ProviderName = "Microsoft Agent Framework · Copilot Studio GHCP /3p latest SDK";
#else
const string ProviderName = "Microsoft Agent Framework · Copilot Studio GHCP /3p POC";
#endif
const string HttpClientName = "AgentFrameworkGhcp";
const int SessionLimit = 100;
var sessionTtl = TimeSpan.FromMinutes(30);
var sessions = new ConcurrentDictionary<string, AgentFrameworkSession>();
var jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);
using var cleanupTimer = new Timer(
    _ => _ = PruneSessionsAsync(),
    null,
    TimeSpan.FromMinutes(5),
    TimeSpan.FromMinutes(5));

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy => policy
        .WithOrigins("http://localhost:3978", "http://127.0.0.1:3978")
        .AllowAnyHeader()
        .AllowAnyMethod());
});

var app = builder.Build();
app.UseCors();

app.MapGet("/healthz", () => Results.Ok(new
{
    status = "ok",
    provider = ProviderName,
    frameworkVersion = typeof(AIAgent).Assembly.GetName().Version?.ToString(),
    copilotStudioProviderVersion = typeof(CopilotStudioAgent).Assembly.GetName().Version?.ToString(),
    copilotStudioClientVersion = typeof(CopilotClient).Assembly.GetName().Version?.ToString(),
    activeSessions = sessions.Count
}));

app.MapPost("/api/agent-framework/preflight", async (
    ConnectionRequest request,
    ILoggerFactory loggerFactory,
    CancellationToken cancellationToken) =>
{
    try
    {
        ValidateRequest(request);
        using var resources = CreateAgentResources(request.Token, request.Settings.DirectConnectUrl, loggerFactory);
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(25));
        var remoteConversationId = await StartRemoteConversationAsync(
            resources.Client,
            onActivity: null,
            timeout.Token);

        return Results.Ok(new
        {
            ok = true,
            provider = ProviderName,
            frameworkVersion = typeof(AIAgent).Assembly.GetName().Version?.ToString(),
            copilotStudioProviderVersion = typeof(CopilotStudioAgent).Assembly.GetName().Version?.ToString(),
            copilotStudioClientVersion = typeof(CopilotClient).Assembly.GetName().Version?.ToString(),
            conversationId = remoteConversationId,
            endpoint = request.Settings.DirectConnectUrl
        });
    }
    catch (Exception error)
    {
        return Results.Problem(
            title: "Agent Framework preflight failed",
            detail: DescribeError(error, cancellationToken),
            statusCode: StatusCodes.Status502BadGateway);
    }
});

app.MapPost("/api/agent-framework/start", async (
    ConnectionRequest request,
    HttpResponse response,
    ILoggerFactory loggerFactory,
    CancellationToken cancellationToken) =>
{
    response.ContentType = "application/x-ndjson; charset=utf-8";
    response.Headers.CacheControl = "no-cache, no-transform";
    response.Headers.Append("X-Accel-Buffering", "no");

    AgentFrameworkResources? resources = null;
    try
    {
        ValidateRequest(request);
        await PruneSessionsAsync();
        resources = CreateAgentResources(request.Token, request.Settings.DirectConnectUrl, loggerFactory);
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(25));

        var remoteConversationId = await StartRemoteConversationAsync(
            resources.Client,
            activity => WriteFrameAsync(response, new
            {
                type = "activity",
                provider = "agent-framework-dotnet",
                textMode = "delta",
                activity
            }, jsonOptions, timeout.Token),
            timeout.Token);

        var agentSession = await resources.Agent.CreateSessionAsync(remoteConversationId);
        var state = new AgentFrameworkSession(resources, agentSession);
        resources = null;
        sessions[remoteConversationId] = state;

        await WriteFrameAsync(response, new
        {
            type = "done",
            provider = "agent-framework-dotnet",
            conversationId = remoteConversationId,
            count = 0
        }, jsonOptions, cancellationToken);
    }
    catch (Exception error)
    {
        resources?.Dispose();
        await WriteFrameAsync(response, new
        {
            type = "error",
            provider = "agent-framework-dotnet",
            error = DescribeError(error, cancellationToken)
        }, jsonOptions, CancellationToken.None);
    }
});

app.MapPost("/api/agent-framework/send", async (
    SendRequest request,
    HttpResponse response,
    CancellationToken cancellationToken) =>
{
    response.ContentType = "application/x-ndjson; charset=utf-8";
    response.Headers.CacheControl = "no-cache, no-transform";
    response.Headers.Append("X-Accel-Buffering", "no");

    try
    {
        if (string.IsNullOrWhiteSpace(request.Token))
        {
            throw new ArgumentException("Missing delegated token.");
        }
        if (string.IsNullOrWhiteSpace(request.ConversationId))
        {
            throw new ArgumentException("Missing conversationId.");
        }
        if (string.IsNullOrWhiteSpace(request.Text))
        {
            throw new ArgumentException("Missing message text.");
        }
        if (!sessions.TryGetValue(request.ConversationId, out var state))
        {
            throw new InvalidOperationException(
                "Agent Framework session was not found. Reconnect before sending another message.");
        }

        await state.Gate.WaitAsync(cancellationToken);
        try
        {
            state.ThrowIfDisposed();
            state.Resources.TokenHandler.Token = request.Token;
            state.LastUsed = DateTimeOffset.UtcNow;
            var count = 0;

            await foreach (var update in state.Resources.Agent.RunStreamingAsync(
                request.Text,
                state.Session,
                cancellationToken: cancellationToken))
            {
                count += 1;

                if (update.RawRepresentation is IActivity activity)
                {
                    await WriteFrameAsync(response, new
                    {
                        type = "activity",
                        provider = "agent-framework-dotnet",
                        textMode = "delta",
                        finishReason = update.FinishReason?.ToString(),
                        activity
                    }, jsonOptions, cancellationToken);
                }
                else
                {
                    await WriteFrameAsync(response, new
                    {
                        type = "agentFrameworkUpdate",
                        provider = "agent-framework-dotnet",
                        textMode = "delta",
                        finishReason = update.FinishReason?.ToString(),
                        text = update.Text,
                        messageId = update.MessageId
                    }, jsonOptions, cancellationToken);
                }
            }

            await WriteFrameAsync(response, new
            {
                type = "done",
                provider = "agent-framework-dotnet",
                conversationId = request.ConversationId,
                count
            }, jsonOptions, cancellationToken);
        }
        finally
        {
            state.Gate.Release();
        }
    }
    catch (Exception error)
    {
        await WriteFrameAsync(response, new
        {
            type = "error",
            provider = "agent-framework-dotnet",
            error = error.Message
        }, jsonOptions, CancellationToken.None);
    }
});

app.MapPost("/api/agent-framework/end", async (EndRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.ConversationId))
    {
        return Results.BadRequest(new { error = "Missing conversationId." });
    }

    if (sessions.TryRemove(request.ConversationId, out var state))
    {
        await state.DisposeAsync();
    }

    return Results.Ok(new { ok = true });
});

app.Lifetime.ApplicationStopping.Register(() =>
{
    cleanupTimer.Dispose();
    foreach (var session in sessions.Values)
    {
        session.Dispose();
    }
    sessions.Clear();
});

app.Run();

async Task PruneSessionsAsync()
{
    var cutoff = DateTimeOffset.UtcNow - sessionTtl;
    foreach (var entry in sessions)
    {
        if (entry.Value.LastUsed < cutoff && sessions.TryRemove(entry.Key, out var expired))
        {
            await expired.DisposeAsync();
        }
    }

    while (sessions.Count >= SessionLimit)
    {
        var oldest = sessions.OrderBy(entry => entry.Value.LastUsed).FirstOrDefault();
        if (oldest.Key is null || !sessions.TryRemove(oldest.Key, out var removed))
        {
            break;
        }
        await removed.DisposeAsync();
    }
}

static void ValidateRequest(ConnectionRequest request)
{
    if (string.IsNullOrWhiteSpace(request.Token))
    {
        throw new ArgumentException("Missing delegated token.");
    }
    ValidateDirectConnectUrl(request.Settings.DirectConnectUrl);
}

static string DescribeError(Exception error, CancellationToken requestCancellation) =>
    error is OperationCanceledException && !requestCancellation.IsCancellationRequested
        ? "Agent Framework connection setup timed out after 25 seconds."
        : error.Message;

static void ValidateDirectConnectUrl(string value)
{
    if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) ||
        uri.Scheme != Uri.UriSchemeHttps ||
        !string.IsNullOrEmpty(uri.UserInfo) ||
        !uri.IsDefaultPort)
    {
        throw new ArgumentException("Invalid GHCP /3p Direct Connect URL.");
    }

    var hostValid = Regex.IsMatch(
        uri.Host,
        "^[a-f0-9]{30}\\.[a-f0-9]{2}\\.environment\\.api\\.powerplatform\\.com$",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    var path = Ghcp3pUrlPolicy.GetEscapedPath(uri).TrimEnd('/');
    var hasEncodedSeparator = Regex.IsMatch(
        path,
        "%(?:2f|5c)",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    var pathValid = Regex.IsMatch(
        path,
        "^/copilotstudio/agenticruntime/3p/dataverse-backed/authenticated/bots/[^/]+$",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    var query = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(uri.Query);
    var versionValid = query.Count == 1 &&
        query.TryGetValue("api-version", out var version) &&
        version.Count == 1 && version[0] == "1";

    if (hasEncodedSeparator || !hostValid || !pathValid || !versionValid || !string.IsNullOrEmpty(uri.Fragment))
    {
        throw new ArgumentException("Invalid GHCP /3p Direct Connect URL.");
    }
}

static AgentFrameworkResources CreateAgentResources(
    string token,
    string directConnectUrl,
    ILoggerFactory loggerFactory)
{
    var settings = new ConnectionSettings
    {
        DirectConnectUrl = directConnectUrl,
        Cloud = PowerPlatformCloud.Prod,
        CopilotAgentType = AgentType.Published
    };
    var tokenHandler = new MutableBearerTokenHandler(token)
    {
        InnerHandler = new HttpClientHandler
        {
            AllowAutoRedirect = false,
            UseCookies = false
        }
    };
    var requestGuard = new Ghcp3pRequestGuardHandler(
        directConnectUrl,
        loggerFactory.CreateLogger<Ghcp3pRequestGuardHandler>())
    {
        InnerHandler = tokenHandler
    };
    var httpClient = new HttpClient(requestGuard)
    {
        Timeout = Timeout.InfiniteTimeSpan
    };
    var httpClientFactory = new SingleHttpClientFactory(httpClient);
    var client = new CopilotClient(
        settings,
        httpClientFactory,
        loggerFactory.CreateLogger<CopilotClient>(),
        HttpClientName);
    var agent = new CopilotStudioAgent(client, loggerFactory);
    return new AgentFrameworkResources(agent, client, tokenHandler, httpClient);
}

static async Task<string> StartRemoteConversationAsync(
    CopilotClient client,
    Func<IActivity, Task>? onActivity,
    CancellationToken cancellationToken)
{
    string? conversationId = null;
    await foreach (var activity in client.StartConversationAsync(
        emitStartConversationEvent: true,
        cancellationToken))
    {
        if (activity.Conversation?.Id is { Length: > 0 } id)
        {
            conversationId = id;
        }
        if (onActivity is not null)
        {
            await onActivity(activity);
        }
    }

    return conversationId ?? throw new InvalidOperationException(
        "Copilot Studio did not return a conversation ID.");
}

static async Task WriteFrameAsync(
    HttpResponse response,
    object frame,
    JsonSerializerOptions options,
    CancellationToken cancellationToken)
{
    await response.WriteAsync(JsonSerializer.Serialize(frame, options) + "\n", cancellationToken);
    await response.Body.FlushAsync(cancellationToken);
}

sealed record AgentFrameworkSettings(string DirectConnectUrl);
sealed record ConnectionRequest(string Token, AgentFrameworkSettings Settings);
sealed record SendRequest(string Token, string ConversationId, string Text);
sealed record EndRequest(string ConversationId);

sealed class AgentFrameworkSession : IDisposable
{
    public AgentFrameworkSession(AgentFrameworkResources resources, AgentSession session)
    {
        Resources = resources;
        Session = session;
    }

    public AgentFrameworkResources Resources { get; }
    public AgentSession Session { get; }
    public SemaphoreSlim Gate { get; } = new(1, 1);
    public DateTimeOffset LastUsed { get; set; } = DateTimeOffset.UtcNow;
    private bool IsDisposed { get; set; }

    public void ThrowIfDisposed()
    {
        if (IsDisposed)
        {
            throw new ObjectDisposedException(
                nameof(AgentFrameworkSession),
                "Agent Framework session has ended. Reconnect before sending another message.");
        }
    }

    public async ValueTask DisposeAsync()
    {
        await Gate.WaitAsync();
        try
        {
            if (IsDisposed)
            {
                return;
            }
            IsDisposed = true;
            Resources.Dispose();
        }
        finally
        {
            Gate.Release();
        }
    }

    public void Dispose()
    {
        if (IsDisposed)
        {
            return;
        }
        IsDisposed = true;
        Resources.Dispose();
    }
}

sealed class AgentFrameworkResources : IDisposable
{
    public AgentFrameworkResources(
        CopilotStudioAgent agent,
        CopilotClient client,
        MutableBearerTokenHandler tokenHandler,
        HttpClient httpClient)
    {
        Agent = agent;
        Client = client;
        TokenHandler = tokenHandler;
        HttpClient = httpClient;
    }

    public CopilotStudioAgent Agent { get; }
    public CopilotClient Client { get; }
    public MutableBearerTokenHandler TokenHandler { get; }
    private HttpClient HttpClient { get; }
    public void Dispose() => HttpClient.Dispose();
}

sealed class MutableBearerTokenHandler(string token) : DelegatingHandler
{
    public string Token { get; set; } = token;

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", Token);
        return base.SendAsync(request, cancellationToken);
    }
}

static class Ghcp3pUrlPolicy
{
    public static string GetEscapedPath(Uri uri)
    {
        var path = uri.GetComponents(UriComponents.Path, UriFormat.UriEscaped);
        return path.StartsWith('/') ? path : $"/{path}";
    }
}

sealed class Ghcp3pRequestGuardHandler : DelegatingHandler
{
    private readonly Uri _baseUri;
    private readonly string _basePath;
    private readonly Regex _requestPathPattern;
    private readonly ILogger<Ghcp3pRequestGuardHandler> _logger;

    public Ghcp3pRequestGuardHandler(
        string directConnectUrl,
        ILogger<Ghcp3pRequestGuardHandler> logger)
    {
        _baseUri = new Uri(directConnectUrl, UriKind.Absolute);
        _basePath = Ghcp3pUrlPolicy.GetEscapedPath(_baseUri).TrimEnd('/');
        _requestPathPattern = new Regex(
            $"^{Regex.Escape(_basePath)}/conversations(?:/[^/%\\\\]+)?$",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
        _logger = logger;
    }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        var uri = request.RequestUri ?? throw new InvalidOperationException(
            "Copilot Studio client created a request without a URI.");
        var requestPath = uri.IsAbsoluteUri
            ? Ghcp3pUrlPolicy.GetEscapedPath(uri)
            : string.Empty;
        var pathValid = _requestPathPattern.IsMatch(requestPath);
        if (
            !uri.IsAbsoluteUri ||
            uri.Scheme != Uri.UriSchemeHttps ||
            !uri.Host.Equals(_baseUri.Host, StringComparison.OrdinalIgnoreCase) ||
            !uri.IsDefaultPort ||
            !pathValid)
        {
            throw new InvalidOperationException(
                "Copilot Studio client attempted to leave the allowlisted GHCP /3p route.");
        }

        var guardedUri = new UriBuilder(uri)
        {
            Query = "api-version=1"
        }.Uri;
        request.RequestUri = guardedUri;
        _logger.LogInformation(
            "Agent Framework GHCP request: {Method} {Endpoint}",
            request.Method,
            guardedUri);
        var response = await base.SendAsync(request, cancellationToken);
        var statusCode = (int)response.StatusCode;
        if (statusCode is >= 300 and < 400)
        {
            response.Dispose();
            throw new InvalidOperationException(
                "Copilot Studio returned a redirect, which the GHCP /3p POC refuses to follow.");
        }
        return response;
    }
}

sealed class SingleHttpClientFactory(HttpClient client) : IHttpClientFactory
{
    public HttpClient CreateClient(string name) => client;
}
