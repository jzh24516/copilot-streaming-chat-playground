# Copilot Studio · Streaming Chat Playground

A playground "canvas" that demonstrates **live-streaming (token-by-token) responses**
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

A 12-slide walkthrough of what works, what doesn't, and the gotchas we hit — across
both Direct Line and the Direct-to-Engine SDK. Available in **English, 简体中文, 繁體中文,
日本語, and 한국어** (HTML view + PowerPoint export):

- Run locally: <http://localhost:3978/docs/streaming-tech-note.html>
- On GitHub: [docs/streaming-tech-note.html](docs/streaming-tech-note.html)
- Rendered (raw.githack): <https://raw.githack.com/jzh24516/copilot-streaming-chat-playground/main/docs/streaming-tech-note.html>

Use the language switcher in the deck (or `?lang=zh-CN|zh-TW|ja|ko`) and **Export to
PowerPoint** to download a fully localized `.pptx`.

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

You can connect five ways from the UI:

| Mode | Transport | Use when | Secret exposure |
| --- | --- | --- | --- |
| **Copilot Studio SDK · Direct-to-Engine** | Direct Engine | You need native Copilot Studio generative streaming chunks | No secret; user signs in with Entra ID |
| **Server relay** | Direct Line | You set `COPILOT_TOKEN_ENDPOINT` or `DIRECT_LINE_SECRET` in `.env` | Secret stays on the server |
| **Token endpoint URL** | Direct Line | Quick test with a Copilot Studio token endpoint | Token only (low risk) |
| **Direct Line secret / token** | Direct Line | Local testing | Secret/token in browser (test only) |
| **Direct Line · live streaming** *(experimental)* | Direct Line (WebSocket) | You want Direct Line to stream token-by-token like the official test canvas | Secret/token/URL in browser (test only) |

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

Direct Line doesn't stream token-by-token unless the client explicitly asks for it.
This mode reproduces what the official Copilot Studio test canvas does:

1. Forces **WebSocket** transport (Direct Line REST drops `typing` activities).
2. On connect, sends a `startConversation` **event** carrying `deliveryMode: "stream"`
   and a `ClientCapabilities` entity — the opt-in that makes Copilot Studio emit
   generative chunks. Plain Web Chat never sends this, so without it you only get
   the final message.
3. **Coalesces** every interim chunk of one answer (keyed on `streamId`) into a
   single growing bubble and drops the duplicate trailing `final`, so the bubble
   grows in place instead of stacking dozens of partial messages.

Paste a Direct Line secret, a Direct Line token, **or** a Copilot Studio token-endpoint
URL (auto-detected) and click **Connect**.

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

The inspector reads streaming metadata from **`channelData`** *or*
**`entities[type="streaminfo"]`** (channelData wins), and re-validates `activity.type`
and `streamSequence` against the livestreaming schema — malformed chunks are flagged
rather than trusted. Live metrics (streams / chunks / final) plus a one-glance
diagnosis tell you whether the agent is *actually* streaming or just sending a final
message.

If you only ever see a single `final` activity (no `streaming` chunks):

- Confirm the agent has streaming enabled in Copilot Studio.
- For Direct Line modes, confirm **WebSocket** transport is on (REST drops typing activities).
- For **Direct Line · live streaming**, the `deliveryMode:"stream"` opt-in is sent
  automatically on connect — if you still see only `final`, the agent may not have
  generative streaming enabled.
- If the inspector shows `typing` but not `streaming`, the channel is connected
  but the bot/agent is not emitting livestream metadata for that response.

## Files

- `server.js` — Express server: serves the UI and relays Direct Line tokens; `/api/test-connection` validates end-to-end.
- `public/index.html` / `styles.css` / `app.js` — the playground canvas + streaming inspector (SDK tap, Direct Line streaming coalescer, metadata detection).
- `public/i18n.js` — shared 5-language dictionary + DOM and PowerPoint-export localization helpers.
- `docs/streaming-tech-note.html` — the multilingual tech-note deck (HTML view + PptxGenJS export).
- `.env.example` — connection configuration template.

## Endpoints

- `GET /api/config` — reports the configured connection mode (no secrets).
- `GET /api/directline/token` — returns a short-lived Direct Line token.
- `GET /api/test-connection` — validates the connection end-to-end.
- `GET /healthz` — health check.
