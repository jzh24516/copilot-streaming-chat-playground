# Copilot Studio · Streaming Chat Playground

A playground "canvas" that demonstrates **progressive live-streaming responses**
from a **Microsoft Copilot Studio** agent, rendered with **Bot Framework Web Chat**.
It streams over **both** transports so you can compare them side by side:

- **Direct-to-Engine** via the Copilot Studio SDK (`@microsoft/agents-copilotstudio-client`) —
  the native generative-streaming path, with Entra ID sign-in.
- **Direct Line** (WebSocket) — including an experimental **live-streaming** mode that
  opts into `deliveryMode:"stream"` and coalesces interim chunks into a single growing bubble.

It shows streamed responses building up in real time *and* an **Activity Inspector**
that surfaces the underlying livestreaming protocol (the `typing` activities with
`streamType` of `informative` / `streaming` / `final`) so you can verify streaming
end-to-end on either transport.

## 📊 Tech-note deck

A 21-slide walkthrough of what works, what doesn't, and the gotchas we hit — across
Direct Line, delegated Direct-to-Engine, Agent Framework, and the app-only S2S private
preview diagnostic. Available in **English, 简体中文, 繁體中文, 日本語, and 한국어**
(HTML view + PowerPoint export):

- Run locally: <http://localhost:3978/docs/streaming-tech-note.html>
- On GitHub: [docs/streaming-tech-note.html](docs/streaming-tech-note.html)
- Rendered (raw.githack): <https://raw.githack.com/jzh24516/copilot-streaming-chat-playground/main/docs/streaming-tech-note.html>

Use the language switcher in the deck (or `?lang=zh-CN|zh-TW|ja|ko`) and **Export to
PowerPoint** to download a fully localized `.pptx`.

## Dynamics 365 side pane deployment guide

The interactive runbook for packaging the streamed GHCP `/3p` widget into a
Dynamics 365 model-driven app side pane is available at:

- Run locally: <http://localhost:3978/docs/dynamics-sidepane-deployment.html>
- In the repository: [docs/dynamics-sidepane-deployment.html](docs/dynamics-sidepane-deployment.html)

It covers the production support gate, delegated Entra/OBO architecture, Azure
App Service relay hardening, model-driven app web resources and command bar,
copyable `Xrm.App.sidePanes` code, and the release validation matrix.

## How livestreaming works (in short)

Based on the Bot Framework Web Chat
[LIVESTREAMING.md](https://github.com/microsoft/BotFramework-WebChat/blob/main/docs/LIVESTREAMING.md):

- The bot sends **interim `typing` activities** with `channelData.streamType: "streaming"`
  (or `"informative"`), each carrying overlapping partial `text` and an incrementing
  `streamSequence`. The first activity's id becomes the **`streamId`** (session id).
- It **concludes** with a `message` activity and `channelData.streamType: "final"`
  containing the complete text.
- Supported channels: **Direct Line (Web Socket)** and Teams. Direct Line **REST**
  ignores typing activities, so this app **forces Web Socket transport**.
- [Proactive messaging](https://learn.microsoft.com/en-us/azure/bot-service/bot-builder-howto-proactive-message?view=azure-bot-service-4.0&tabs=csharp)
  is recommended on the bot side to avoid client timeouts during long generations.
- Copilot Studio supports livestreaming natively (no code required).

## Prerequisites

- Node.js 18+
- A published Copilot Studio agent.
- For **Copilot Studio SDK / Direct-to-Engine** mode:
  - Copilot Studio **Environment Id** and **Schema name** from Settings > Advanced > Metadata.
  - An Entra ID SPA app registration with delegated `CopilotStudio.Copilots.Invoke` permission.
- For Direct Line comparison modes, one of:
  - a **Token endpoint** URL (Settings > Channels > Custom website / Mobile app), or
  - an Azure Bot **Direct Line** channel **secret**.

## Setup

```powershell
npm install
Copy-Item .env.example .env   # then edit .env
npm start
```

Open http://localhost:3978

## Connecting your agent

The UI includes dedicated modes for the supported transports and runtime experiments:

| Mode | Transport | Use when | Secret exposure |
| --- | --- | --- | --- |
| **Copilot Studio SDK · Direct-to-Engine** | Direct Engine | You need native Copilot Studio generative streaming chunks | No secret; user signs in with Entra ID |
| **Server relay** | Direct Line | You set `COPILOT_TOKEN_ENDPOINT` or `DIRECT_LINE_SECRET` in `.env` | Secret stays on the server |
| **Token endpoint URL** | Direct Line | Quick test with a Copilot Studio token endpoint | Token only (low risk) |
| **Direct Line secret / token** | Direct Line | Local testing | Secret/token in browser (test only) |
| **Direct Line · live streaming** *(experimental)* | Direct Line (WebSocket) | Diagnose progressive Web Chat livestream activities | Secret/token/URL in browser (test only) |
| **No-auth agent · Agentic Direct Line** *(diagnostic)* | Direct Line (WebSocket) | Probe a no-auth agenticruntime token endpoint; responses may still be final-only | Short-lived Direct Line token in browser |
| **GHCP harness · Agentic Runtime /3p** *(experimental)* | Direct-to-Engine (SSE) | Test a published Dracarys/GitHub Copilot harness agent with delegated Entra authentication | No secret; signed-in user's delegated token is relayed through the local sidecar |
| **No-auth GHCP harness · S2S app identity /3p** *(private preview diagnostic)* | Direct-to-Engine (SSE) | Test whether an app-only identity can reach a published no-auth GHCP harness through `/3p` | Client secret and app token stay on the Node server |
| **Copilot Studio GHCP harness · .NET Agent Framework /3p POC** | Agent Framework over Copilot Studio SSE | Compare the same `/3p` agent through `CopilotStudioAgent.RunStreamingAsync` | No secret; browser sends the delegated token to loopback, which forwards it only to the allowlisted Power Platform `/3p` host |
| **GHCP harness · latest .NET Agent Framework** *(experimental)* | Latest Agent Framework over guarded Copilot Studio `/3p` SSE | Compatibility-test a Microsoft-authenticated GHCP agent against the latest validated provider without replacing the proven POC | No secret; delegated user token is sent only to the loopback sidecar and allowlisted Power Platform host |

### GHCP harness · Agentic Runtime /3p

This mode targets a published GitHub Copilot harness agent whose cloned
`settings.mcs.yml` uses `CLICopilotRecognizer` (or the older
`CLIAgentRecognizer`) and `authenticationMode: Integrated`. It follows the
connection implemented by Microsoft's experimental Copilot Studio plugin rather
than the legacy published-bot URL.

The generated `/3p` and no-auth Agentic Direct Line hosts currently support
commercial **Prod** environment IDs only. The playground uses the Prod 30/2 GUID
host split and does not yet map sovereign or preproduction cloud suffixes.

1. Create or reuse a single-tenant SPA app registration with redirect URI
  `http://localhost:3978`.
2. Add the Power Platform API delegated permission
  `CopilotStudio.Copilots.Invoke` and grant consent as required.
3. Publish the GHCP harness agent and share it with the signed-in user.
4. Select **GHCP harness · Agentic Runtime /3p** and enter the client ID, tenant
  ID, environment ID, and case-sensitive agent schema name.
5. Confirm the generated base URL has this shape:

```text
https://{environment-host}/copilotstudio/agenticruntime/3p/dataverse-backed/authenticated/bots/{schemaName}?api-version=1
```

6. Click **Connect** to sign in, or **Test connection** after an Entra session is
  cached. The Node sidecar performs a one-shot preflight before starting the SSE
  client, so `404`, `401`, and `403` failures return without the SDK retry loop.

The mode always supplies the `/3p` URL as `directConnectUrl`, uses
`api-version=1`, and disables the legacy experimental-island redirect. The SDK
adds `/conversations` and `/conversations/{id}` as needed.

**Live verification — August 5, 2026:** this mode connected to a published
Microsoft-authenticated GHCP harness agent and displayed its real progressive
response in the Web Chat canvas. The `/3p` SSE stream delivered cumulative
typing updates and the final answer through the existing normalization tap. This
confirms the route is technically workable for developer testing; it doesn't
change the support boundary below.

> [!IMPORTANT]
> Microsoft Learn currently says new-experience agents aren't yet officially
> supported by the Copilot Studio client library. The `/3p` route is verified in
> Microsoft-owned experimental plugin source, but it isn't a documented
> production support contract. Use the documented Teams, Microsoft 365, or Web
> app iframe channel for production unless Microsoft confirms support for your
> scenario.

### No-auth GHCP harness · S2S app identity `/3p`

This isolated mode tests the private-preview Copilot Studio Server-to-Server
(S2S) authentication model against the same guarded GHCP `/3p` route. It is a
connectivity experiment, not evidence of official client-library support for
GitHub Copilot harness agents.

Prerequisites:

1. Ask Microsoft to enable S2S D2E for the nonproduction tenant/environment.
2. Publish a GHCP harness agent configured with **No Authentication**.
3. Create a same-tenant confidential app registration.
4. Add the Power Platform API **application** permission
   `CopilotStudio.Copilots.Invoke` and grant tenant admin consent.
5. Share the agent with the app identity as a viewer.
6. Start the app and select **No-auth GHCP harness · S2S app identity /3p**.
7. Enter the client ID, tenant ID, client secret, environment ID, and agent
  schema name, then select **Save S2S settings locally**.

The server writes these values to `config/s2s.local.json`. That file and its
temporary write files are explicitly listed in `.gitignore`, so they aren't
included by `git add`, commits, or GitHub pushes. The secret is submitted once
to the local server over the current page, cleared from the password field after
save, and never returned by `/api/config`. A blank secret on later saves keeps
the existing saved secret. The local diagnostic file is plaintext and requests
owner-only file permissions where the OS supports them, so use a short-lived
test secret and protect access to the workstation.

Environment variables remain available as an optional fallback when no local
file exists: `S2S_CLIENT_ID`, `S2S_TENANT_ID`, and `S2S_CLIENT_SECRET`.

After saving, click **Test connection**. You don't need to restart the server;
the new app identity becomes active immediately.
The Node server requests an app-only token for
`https://api.powerplatform.com/.default`. Chat and preflight requests contain
only environment, schema, and generated `/3p` routing settings. Expected
failures are useful:

- `401`: token audience, app credential, or private-preview enablement problem.
- `403`: application permission/admin consent, agent sharing, policy, or S2S ACL.
- `404`: wrong environment/schema, unpublished agent, or `/3p` not enabled for
  this harness/runtime.
- `S2SDirectEngineRequiresNoAuthentication`: the target agent is authenticated
  and cannot use true app-only S2S.

The mode uses a client secret only for local diagnosis. For a hosted service,
prefer a certificate or workload/managed identity after Microsoft confirms that
credential type and GHCP runtime support for the intended environment.

### .NET Agent Framework `/3p` proof of concept

This isolated mode wraps the same Copilot Studio `/3p` connection in Microsoft
Agent Framework for .NET. It does **not** use the direct GitHub Copilot CLI
provider described in the Agent Framework announcement, and it does not modify
the proven Node-sidecar mode.

References:

- [Build Production-Ready Agents with the GitHub Copilot Harness and Agent Framework](https://devblogs.microsoft.com/agent-framework/build-production-ready-agents-with-the-github-copilot-harness-and-agent-framework/)
  describes the separate, direct GitHub Copilot CLI/SDK provider.
- [Agent Framework Copilot Studio provider](https://learn.microsoft.com/agent-framework/agents/providers/copilot-studio)
  supplies the `CopilotStudioAgent` wrapper used by this POC.

Run the two local processes in separate terminals:

```powershell
npm start
npm run agent-framework:poc
```

Prerequisites for the POC are the .NET 8 SDK and network access to restore the
preview NuGet packages on the first run. Confirm the SDK with `dotnet --version`.

The second command starts
`sidecars/AgentFrameworkGhcp/AgentFrameworkGhcp.csproj` on
`http://127.0.0.1:3980`. In the playground:

1. Select **Copilot Studio GHCP harness · .NET Agent Framework /3p POC**.
2. Use the same client ID, tenant ID, environment ID, and schema name as the
   working Node `/3p` mode.
3. Click **Test connection** to prove the .NET provider can start a real Copilot
   Studio conversation through the generated `/3p` URL.
4. Click **Connect**, then send a longer generative prompt.

The visible proof is:

- status changes to **Online · .NET Agent Framework connected**;
- the answer bubble grows from the real `RunStreamingAsync` updates;
- inspector activities include `channelData.pocProvider =
  "agent-framework-dotnet"`;
- the same `streamType`, `streamId`, and cumulative text behavior can be
  compared with the Node mode.

Agent Framework's preview Copilot Studio provider projects streaming `typing`
activities into `AgentResponseUpdate` objects and keeps the original activity in
`RawRepresentation`. In the live Agent Framework path, those `typing` texts are
**delta fragments**, unlike the cumulative snapshots observed through the Node
client. The browser consolidates each ordered fragment by `streamId`, emits a
growing snapshot under the stable Web Chat activity ID, and finalizes the last
consolidated snapshot when the provider completes. Raw inspector entries include
`pocTextShape` and `pocFragmentLength` so this transformation remains visible.
If the provider emits no streaming updates, the canvas shows an explicit
provider-gap message instead of presenting cosmetic streaming as evidence.

**Live verification — August 6, 2026:** a real Copilot Studio GHCP-harness turn
arrived as 15 Agent Framework delta fragments. The browser consolidated them
into snapshots growing from 4 to 1,164 characters, every snapshot extended the
previous one, and the single final message exactly matched the last snapshot.

The connection panel has a sticky mini-chevron control and a desktop resize
separator on its right edge. Drag the separator, or focus it and use the arrow
keys, to resize the expanded panel between its safe bounds. The last resized
width is stored locally and restored after collapse/expand and reload; when no
saved width exists it falls back to 320px. On desktop, collapse reduces the form
to a 48px rail so the chat canvas expands; on mobile it reduces the panel to a
48px header and hides the resize separator. Agent Framework initialization
activities are held until the adapter reports `Online`, then delivered one
event-loop turn at a time. This ensures the agent's streamed welcome/final
greeting appears in Web Chat instead of being consumed while the connection is
still starting.

This POC uses `Microsoft.Agents.AI.CopilotStudio`
`1.13.0-preview.260703.1`. Agent Framework provides a useful `AIAgent` hosting
surface, sessions, middleware, and telemetry, but it does not turn the
undocumented Copilot Studio `/3p` route into a production-supported contract.
That provider currently restores `Microsoft.Agents.CopilotStudio.Client`
`1.3.171-beta`; the POC's outbound request guard pins every request back to the
validated host/path and `api-version=1` before the delegated bearer is attached.

#### Latest Agent Framework compatibility mode

The separate **GHCP harness · latest .NET Agent Framework** mode uses
`Microsoft.Agents.AI.CopilotStudio` `1.19.0-preview.260822.1` on port `3981`.
It links the same guarded implementation and guard tests as the port-3980 POC,
so package behavior can be compared without changing the known-working project.
Start it beside the playground:

```powershell
npm start
npm run agent-framework:latest
```

Use the same SPA client ID, tenant ID, environment ID, and case-sensitive agent
schema name as the working delegated `/3p` mode. The agent must be published,
configured with **Authenticate with Microsoft**, and shared with the signed-in
user. **Test connection** reports the resolved Agent Framework and Copilot
Studio provider assembly versions before **Connect** starts the streamed turn.

The browser now derives the Power Platform scope through the documented
`ScopeHelper.getScopeFromSettings` API, with a compatibility fallback for older
bundles. As of August 30, 2026, the latest top-level provider still resolves
`Microsoft.Agents.CopilotStudio.Client` `1.3.171-beta`. Microsoft also still
states that the Copilot Studio client library officially supports only the
standard harness. This mode therefore measures compatibility; it does not make
the authenticated GHCP `/3p` route a supported production contract. See the
[Microsoft 365 Agents SDK quickstart](https://learn.microsoft.com/microsoft-365/agents-sdk/quickstart)
and [Copilot Studio integration support note](https://learn.microsoft.com/microsoft-365/agents-sdk/integrate-with-mcs).

### Copilot Studio SDK · Direct-to-Engine

This is the native streaming Copilot Studio path. It uses MSAL in the browser to
sign in a user, acquires a delegated Power Platform token, and connects to the
published agent through `@microsoft/agents-copilotstudio-client`. Because the SDK's
`activity$` is a **cold observable** that keeps only one subscriber, the app taps
activities *inside* Web Chat's single subscription (rather than subscribing twice)
so the canvas and the inspector both stay live.

1. In Azure Portal, open **Microsoft Entra ID > App registrations > New registration**.
2. Use **Accounts in this organizational directory only**.
3. Under **Redirect URI**, choose **Single-page application (SPA)** and enter:
  `http://localhost:3978`
4. After registration, copy the **Application (client) ID** and **Directory (tenant) ID**.
5. Open **API permissions > Add a permission > APIs my organization uses**.
6. Search for **Power Platform API**.
7. Add delegated permission **CopilotStudio.Copilots.Invoke**.
8. Grant admin consent if your tenant requires it.
9. In `.env`, fill:

```ini
ENTRA_CLIENT_ID=<application-client-id>
ENTRA_TENANT_ID=<directory-tenant-id>
COPILOT_ENVIRONMENT_ID=<copilot-studio-environment-id>
COPILOT_SCHEMA_NAME=mjsrc_agent
COPILOT_AGENT_CLOUD=Prod
```

Restart `npm start`, open http://localhost:3978, choose **Copilot Studio SDK · Direct-to-Engine**,
then click **Connect**. The first connection opens an Entra sign-in popup.

### Direct Line · live streaming (experimental)

Direct Line WebSocket is capable of carrying Web Chat livestream activities, but
that does not guarantee the selected agent runtime emits token chunks. This mode
reproduces the opt-in observed in the Copilot Studio test canvas:

1. Forces **WebSocket** transport (Direct Line REST drops `typing` activities).
2. On connect, sends a `startConversation` **event** carrying `deliveryMode: "stream"`
  and a `ClientCapabilities` entity, then adds `deliveryMode:"stream"` to every
  outgoing user message. This is an empirical canvas behavior, not a documented
  GHCP integration contract.
3. **Coalesces** every interim chunk of one answer (keyed on `streamId`) into a
   single growing bubble and drops the duplicate trailing `final`, so the bubble
   grows in place instead of stacking dozens of partial messages.

Paste a Direct Line secret, a Direct Line token, **or** a Copilot Studio token-endpoint
URL (auto-detected) and click **Connect**.

The separate **No-auth agent · Agentic Direct Line** mode obtains its token from
`/copilotstudio/agenticruntime/botsbyschema/{schema}/directline/token`. It is a
no-auth diagnostic, not a GHCP harness connection. Our tested no-auth new agent
connected and returned a correct generative answer, but the wire contained only
an empty `typing`, one complete `message`, and `turn.complete` — no
`streamType`, `streamId`, or `streamSequence`, so it was final-only.

As of the Microsoft documentation updated August 3, 2026, GHCP harness agents
support a Web app **iframe**, while Native app / Direct Line is listed as **No**.
Use the experimental authenticated `/3p` mode above to investigate progressive
GHCP responses; use the documented iframe, Teams, or Microsoft 365 channel for
production.

#### Research basis — checked August 5, 2026

- [Available channels for GHCP harness agents](https://learn.microsoft.com/microsoft-copilot-studio/agents-experience/publication-channels-overview)
  lists Web app iframe as available and Native app / Direct Line as unavailable
  (page updated August 3, 2026).
- [Integrate with Copilot Studio](https://learn.microsoft.com/microsoft-365/agents-sdk/integrate-with-mcs)
  says new-experience agents aren't yet officially supported by the Copilot
  Studio client library (dated July 27, 2026).
- [Web Chat livestreaming](https://github.com/microsoft/BotFramework-WebChat/blob/main/docs/LIVESTREAMING.md)
  defines the `typing` + `streamType` + `streamId` + `streamSequence` protocol;
  Direct Line WebSocket and Teams are capable channels, while Direct Line REST
  drops typing activities.
- [Direct Line performance testing](https://learn.microsoft.com/microsoft-copilot-studio/guidance/conversational-agents-performance-testing-direct-line)
  applies to conversational agents and documents WebSocket transport, not a
  guarantee of token-level livestreaming for GHCP.
- Microsoft's experimental
  [Copilot Studio plugin](https://github.com/microsoft/copilot-studio-plugin/blob/main/scripts/src/chat-with-agent.js)
  gates GHCP/CLI recognizers onto authenticated Agentic Runtime `/3p` SSE and
  explicitly does not use Direct Line.

### Server relay

1. Put your token endpoint URL or Direct Line secret in `.env`.
2. `npm start`, open the page — it auto-selects **Server relay**.
3. Click **Test connection** to validate (acquires a token + opens a conversation
  and checks for a `streamUrl`, which confirms WebSocket delivery is available).
4. Click **Connect** and chat.

## Validating streaming

1. Connect, then send a prompt that produces a longer answer.
2. Watch the bubble fill progressively in the canvas.
3. In the **Activity inspector** you should see:
   - optional `informative` chunk(s) ("Searching…"),
   - multiple `streaming` chunks with incrementing `#sequence`,
   - one `final` activity with the complete text.

The inspector reads streaming metadata from **`channelData`** *or*
**`entities[type="streaminfo"]`** (channelData wins). It checks the key Web Chat
requirements: activity ID/type, sequence shape and ordering, session lifecycle,
and final-after-interim behavior. It separately reports progressive answer text,
protocol-only activity, and final-only responses. This is a focused diagnostic,
not a substitute for the full Web Chat schema implementation.

If you only ever see a single `final` activity (no `streaming` chunks):

- For Direct Line modes, confirm **WebSocket** transport is on (REST drops typing activities).
- For **Direct Line · live streaming**, the `deliveryMode:"stream"` opt-in is sent
  automatically on connect and on each user message. If you still see only a
  final response, the selected agent/runtime isn't emitting the livestream protocol.
- If the inspector shows `typing` but not `streaming`, the channel is connected
  but the bot/agent is not emitting livestream metadata for that response.

Official Web Chat livestreaming requires interim `typing` activities with
`streamType:"streaming"` or `"informative"` and increasing `streamSequence`.
The first activity ID becomes the session ID when `streamId` is absent; later
activities use that session ID, and a final activity concludes it. WebSocket
transport alone is not proof of progressive answer streaming.

## Files

- `server.js` — Express server: serves the UI, relays Direct Line tokens, and runs delegated or S2S Direct-to-Engine sidecars with guarded GHCP `/3p` preflight.
- `s2s-token.js` — server-only confidential-client token acquisition and cache for the private-preview S2S diagnostic.
- `test/s2s-token.test.js` — focused fail-closed and token-cache tests for S2S authentication.
- `public/index.html` / `styles.css` / `app.js` — the playground canvas + streaming inspector (SDK tap, Direct Line streaming coalescer, metadata detection).
- `public/i18n.js` — shared 5-language dictionary + DOM and PowerPoint-export localization helpers.
- `docs/streaming-tech-note.html` — the multilingual tech-note deck (HTML view + PptxGenJS export).
- `.env.example` — connection configuration template.

## Endpoints

- `GET /api/config` — reports the configured connection mode (no secrets).
- `GET /api/directline/token` — returns a short-lived Direct Line token.
- `GET /api/test-connection` — validates the connection end-to-end.
- `POST /api/dte/preflight` — validates and probes a GHCP `/3p` runtime before the streaming client starts.
- `POST /api/dte/start` / `POST /api/dte/send` — streams sidecar activities to the browser as NDJSON.
- `POST /api/dte/s2s/config` — localhost-only save to the git-ignored S2S configuration file; returns redacted metadata.
- `POST /api/dte/s2s/preflight` — acquires an app-only token on the server and probes a no-auth GHCP `/3p` target.
- `POST /api/dte/s2s/start` / `POST /api/dte/s2s/send` — streams an app-identity conversation without accepting browser authentication material.
- `GET /healthz` — health check.
