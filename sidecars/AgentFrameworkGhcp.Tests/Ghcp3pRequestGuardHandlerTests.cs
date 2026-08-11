using System.Net;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

public sealed class Ghcp3pRequestGuardHandlerTests
{
    private const string BaseUrl =
        "https://d37505ad37dfeccfb17239255da7a5.12.environment.api.powerplatform.com/" +
        "copilotstudio/agenticruntime/3p/dataverse-backed/authenticated/bots/test?api-version=1";

    [Fact]
    public async Task RedirectResponseIsRejectedAfterApiVersionIsForced()
    {
        var inner = new RecordingHandler(_ => new HttpResponseMessage(HttpStatusCode.TemporaryRedirect)
        {
            Headers = { Location = new Uri("https://evil.example.com/") }
        });
        using var client = CreateClient(inner);

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            client.PostAsync(
                BaseUrl.Replace("?api-version=1", "/conversations?api-version=2022-03-01-preview"),
                new StringContent("{}")));

        Assert.Contains("refuses to follow", error.Message, StringComparison.Ordinal);
        Assert.Equal(
            BaseUrl.Replace("?api-version=1", "/conversations?api-version=1"),
            inner.LastRequestUri?.AbsoluteUri);
        Assert.Equal(1, inner.CallCount);
    }

    [Theory]
    [InlineData("/conversations/")]
    [InlineData("/conversations/id/extra")]
    [InlineData("/conversations/id%2Fextra")]
    [InlineData("/conversations/id%5Cextra")]
    public async Task InvalidConversationPathNeverReachesInnerHandler(string suffix)
    {
        var inner = new RecordingHandler(_ => new HttpResponseMessage(HttpStatusCode.OK));
        using var client = CreateClient(inner);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            client.PostAsync(BaseUrl.Replace("?api-version=1", suffix), new StringContent("{}")));

        Assert.Equal(0, inner.CallCount);
    }

    [Fact]
    public async Task SingleConversationIdIsAllowedAndQueryIsPinned()
    {
        var inner = new RecordingHandler(_ => new HttpResponseMessage(HttpStatusCode.OK));
        using var client = CreateClient(inner);

        using var response = await client.PostAsync(
            BaseUrl.Replace("?api-version=1", "/conversations/conversation-123?api-version=preview&extra=x"),
            new StringContent("{}"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(
            BaseUrl.Replace("?api-version=1", "/conversations/conversation-123?api-version=1"),
            inner.LastRequestUri?.AbsoluteUri);
        Assert.Equal(1, inner.CallCount);
    }

    private static HttpClient CreateClient(HttpMessageHandler inner)
    {
        var guard = new Ghcp3pRequestGuardHandler(
            BaseUrl,
            NullLogger<Ghcp3pRequestGuardHandler>.Instance)
        {
            InnerHandler = inner
        };
        return new HttpClient(guard);
    }

    private sealed class RecordingHandler(
        Func<HttpRequestMessage, HttpResponseMessage> responseFactory) : HttpMessageHandler
    {
        public int CallCount { get; private set; }
        public Uri? LastRequestUri { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            CallCount += 1;
            LastRequestUri = request.RequestUri;
            return Task.FromResult(responseFactory(request));
        }
    }
}
