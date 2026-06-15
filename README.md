# Copilot Studio · Streaming Chat Playground

A playground "canvas" that demonstrates **live-streaming (streaming) responses**
from a **Microsoft Copilot Studio** agent, rendered with **Bot Framework Web Chat**.
For Copilot Studio generative streaming, use the **Copilot Studio SDK / Direct-to-Engine**
mode. Direct Line modes are still included for comparison and transport diagnostics.

It shows streamed responses building up in real time *and* an **Activity Inspector**
that surfaces the underlying livestreaming protocol (the `typing` activities with
`streamType` of `informative` / `streaming` / `final`) so you can verify streaming
end-to-end.

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

You can connect four ways from the UI:

| Mode | Use when | Secret exposure |
| --- | --- | --- |
| **Copilot Studio SDK / Direct-to-Engine** | You need Copilot Studio generative streaming chunks | No secret; user signs in with Entra ID |
| **Server relay** | You set `COPILOT_TOKEN_ENDPOINT` or `DIRECT_LINE_SECRET` in `.env` | Secret stays on the server |
| **Token endpoint URL** | Quick test with a Copilot Studio token endpoint | Token only (low risk) |
| **Direct Line secret / token** | Local testing | Secret/token in browser (test only) |

### Copilot Studio SDK / Direct-to-Engine

This is the streaming-capable Copilot Studio path. It uses MSAL in the browser to
sign in a user, acquires a delegated Power Platform token, and connects to the
published agent through `@microsoft/agents-copilotstudio-client`.

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
ENTRA_TENANT_ID=
COPILOT_ENVIRONMENT_ID=<copilot-studio-environment-id>
COPILOT_SCHEMA_NAME=mjsrc_agent
COPILOT_AGENT_CLOUD=Prod
```

Restart `npm start`, open http://localhost:3978, choose **Copilot Studio SDK / Direct-to-Engine**,
then click **Connect**. The first connection opens an Entra sign-in popup.

### Server relay

1. Put your token endpoint URL or Direct Line secret in `.env`.
2. `npm start`, open the page — it auto-selects **Server relay**.
3. Click **Test connection** to validate (acquires a token + opens a conversation
   and checks for a `streamUrl`, which confirms Web Socket / streaming transport).
4. Click **Connect** and chat.

## Validating streaming

1. Connect, then send a prompt that produces a longer answer.
2. Watch the bubble fill progressively in the canvas.
3. In the **Activity inspector** you should see:
   - optional `informative` chunk(s) ("Searching…"),
   - multiple `streaming` chunks with incrementing `#sequence`,
   - one `final` activity with the complete text.

If you only ever see a single `final` activity (no `streaming` chunks):

- Confirm the agent has streaming enabled in Copilot Studio.
- Confirm **Force Web Socket transport** is on (Direct Line REST drops typing activities).
- If the inspector shows `typing` but not `streaming`, the channel is connected
  but the bot/agent is not emitting livestream metadata for that response.

## Files

- `server.js` — Express server: serves the UI and relays Direct Line tokens; `/api/test-connection` validates end-to-end.
- `public/index.html` / `styles.css` / `app.js` — the playground canvas + streaming inspector.
- `.env.example` — connection configuration template.

## Endpoints

- `GET /api/config` — reports the configured connection mode (no secrets).
- `GET /api/directline/token` — returns a short-lived Direct Line token.
- `GET /api/test-connection` — validates the connection end-to-end.
- `GET /healthz` — health check.
