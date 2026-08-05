// @ts-check
import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CopilotStudioClient,
  ConnectionSettings
} from '@microsoft/agents-copilotstudio-client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3978;

// ---------------------------------------------------------------------------
// Diagnostics: log every Copilot Studio request URL the SDK actually fires.
//
// This is the whole point of the server-side sidecar. The browser SDK is CORS-
// blocked from reading the `x-ms-d2e-experimental` response header, so it can
// never follow the redirect to the generative "island" runtime and stays pinned
// to /dataverse-backed/authenticated (which returns the classic fallback for a
// next-gen agent). A Node process has no such restriction, so wrapping global
// fetch lets us SEE the island switch happen (the 2nd turn hits a different
// host/path than the 1st).
// ---------------------------------------------------------------------------
// Set DTE_RAW_CAPTURE=1 to dump the FULL response headers + body for every
// Copilot Studio /conversations call. This is the diagnostic for "is the
// server emitting any generative-orchestration signal (or x-ms-* hint) that the
// SDK silently discards before we ever see the rendered fallback text?".
const DTE_RAW_CAPTURE = /^(1|true|yes)$/i.test(process.env.DTE_RAW_CAPTURE || '1');
const __nativeFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input?.url || String(input);
  const isCs = /copilotstudio|powerplatform/i.test(url);
  if (isCs) {
    console.log(`[dte] ${init?.method || 'GET'} ${url.split('?')[0]}`);
  }
  const resp = await __nativeFetch(input, init);
  if (isCs && !resp.ok) {
    // Surface the failure status + a short body snippet so we can tell WHY a
    // runtime (e.g. agenticruntime/botsbyschema) rejected the request.
    let snippet = '';
    try { snippet = (await resp.clone().text()).slice(0, 400); } catch { /* noop */ }
    console.log(`[dte] <- ${resp.status} ${resp.statusText} ${snippet}`);
  }
  // Full raw capture for conversation turns (start + send). Runs on a CLONE so
  // the SDK still consumes the original stream untouched. Logs every response
  // header (the x-ms-d2e-experimental / x-ms-* family is the thing to look for)
  // and the entire SSE/event-stream body the runtime returns.
  if (isCs && DTE_RAW_CAPTURE && resp.ok && /\/conversations(\/|\?|$)/i.test(url)) {
    const clone = resp.clone();
    const headerDump = [...clone.headers.entries()]
      .map(([k, v]) => `      ${k}: ${v}`)
      .join('\n');
    console.log(`\n[dte:raw] ===== ${init?.method || 'GET'} ${url.split('?')[0]} =====`);
    console.log(`[dte:raw] status: ${resp.status} ${resp.statusText}`);
    console.log(`[dte:raw] response headers:\n${headerDump}`);
    // Drain the cloned SSE body with our own reader so we can dump WHATEVER the
    // server sent even when the SDK aborts the underlying stream right after the
    // final frame (clone.text() would throw "aborted" and lose the buffer).
    (async () => {
      let acc = '';
      try {
        const reader = clone.body?.getReader();
        const dec = new TextDecoder();
        if (reader) {
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            acc += dec.decode(value, { stream: true });
          }
          acc += dec.decode();
        }
      } catch (err) {
        acc += `\n[dte:raw] (stream ended: ${err?.message || err})`;
      }
      console.log(`[dte:raw] body (${acc.length} bytes):\n${acc}`);
      console.log(`[dte:raw] ===== end ${url.split('?')[0]} =====\n`);
    })();
  }
  return resp;
};

// ---------------------------------------------------------------------------
// Non-secret SDK defaults stored in the repo (config/sdk.json). Environment
// variables of the same name override these when present.
// ---------------------------------------------------------------------------
/** @type {{ clientId?: string, tenantId?: string, environmentId?: string, schemaName?: string, cloud?: string }} */
let sdkFileConfig = {};
try {
  const sdkConfigPath = path.join(__dirname, 'config', 'sdk.json');
  if (fs.existsSync(sdkConfigPath)) {
    sdkFileConfig = JSON.parse(fs.readFileSync(sdkConfigPath, 'utf8'));
  }
} catch (err) {
  console.warn('[config] Could not read config/sdk.json:', err.message);
}

// ---------------------------------------------------------------------------
// Configuration (server side - keeps secrets out of the browser)
//
// Provide ONE of the following in your .env file:
//   1. COPILOT_TOKEN_ENDPOINT  - the Copilot Studio "Token Endpoint" URL
//                                (Settings > Channels > Mobile app / Direct Line).
//   2. DIRECT_LINE_SECRET      - a Direct Line channel secret.
//
// The browser never sees the secret; it only receives a short-lived token.
// ---------------------------------------------------------------------------
const COPILOT_TOKEN_ENDPOINT = process.env.COPILOT_TOKEN_ENDPOINT?.trim();
const DIRECT_LINE_SECRET = process.env.DIRECT_LINE_SECRET?.trim();
// Convenience-only prefill for the CLIENT-SIDE "Direct Line secret / token"
// mode. Unlike DIRECT_LINE_SECRET (which the server keeps to itself and only
// exchanges for a token), this value is sent to the browser to pre-fill the
// secret input so it survives page reloads. Intended for LOCAL testing only.
const DIRECT_LINE_SECRET_CLIENT = process.env.DIRECT_LINE_SECRET_CLIENT?.trim() || '';
// Convenience-only prefill for the CLIENT-SIDE "Copilot Studio token endpoint
// URL" mode. The token endpoint is anonymous (it mints short-lived tokens), so
// this is safe to send to the browser; it just saves re-pasting the URL after
// every reload. Must be the Direct Line TOKEN endpoint
// (.../botsbyschema/<schema>/directline/token), NOT the Direct-to-Engine
// .../bots/<schema>/conversations URL.
const COPILOT_TOKEN_ENDPOINT_CLIENT = process.env.COPILOT_TOKEN_ENDPOINT_CLIENT?.trim() || '';
const DIRECT_LINE_TOKEN_GENERATE_URL =
  process.env.DIRECT_LINE_TOKEN_GENERATE_URL?.trim() ||
  'https://directline.botframework.com/v3/directline/tokens/generate';

// ---------------------------------------------------------------------------
// SDK / Direct-to-Engine defaults (NOT secrets - safe to send to the browser).
// These pre-fill the "Copilot Studio SDK" connection mode, which authenticates
// the signed-in user via Entra ID (MSAL) and streams over the Direct Engine
// protocol - the only path that emits generative streaming chunks.
// ---------------------------------------------------------------------------
const ENTRA_CLIENT_ID = process.env.ENTRA_CLIENT_ID?.trim() || sdkFileConfig.clientId?.trim() || '';
const ENTRA_TENANT_ID = process.env.ENTRA_TENANT_ID?.trim() || sdkFileConfig.tenantId?.trim() || '';
const COPILOT_ENVIRONMENT_ID = process.env.COPILOT_ENVIRONMENT_ID?.trim() || sdkFileConfig.environmentId?.trim() || '';
const COPILOT_SCHEMA_NAME = process.env.COPILOT_SCHEMA_NAME?.trim() || sdkFileConfig.schemaName?.trim() || '';
const COPILOT_AGENT_CLOUD = process.env.COPILOT_AGENT_CLOUD?.trim() || sdkFileConfig.cloud?.trim() || 'Prod';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
// Also expose public assets under /public so docs pages can reference them with
// a relative path (../public/...) that also works on static hosts (GitHub Pages).
app.use('/public', express.static(path.join(__dirname, 'public')));
// Serve the knowledge-sharing tech note deck (and any future docs).
app.use('/docs', express.static(path.join(__dirname, 'docs')));

/**
 * Reports which connection mode the server is configured for, without leaking
 * secrets. The client uses this to drive the UI.
 */
app.get('/api/config', (_req, res) => {
  let mode = 'none';
  if (COPILOT_TOKEN_ENDPOINT) mode = 'copilot-token-endpoint';
  else if (DIRECT_LINE_SECRET) mode = 'direct-line-secret';

  res.json({
    mode,
    serverManagedToken: mode !== 'none',
    // A non-secret hint so the operator can confirm the right bot is wired up.
    tokenEndpointHost: COPILOT_TOKEN_ENDPOINT
      ? safeHost(COPILOT_TOKEN_ENDPOINT)
      : null,
    // Optional prefill for the client-side "Direct Line secret / token" mode so
    // the operator does not have to paste it after every reload (local testing).
    directLineSecret: DIRECT_LINE_SECRET_CLIENT || null,
    // Optional prefill for the client-side "Copilot Studio token endpoint URL"
    // mode (anonymous token endpoint - safe for the browser, local testing).
    tokenEndpointUrl: COPILOT_TOKEN_ENDPOINT_CLIENT || null,
    // Non-secret defaults for the SDK (Direct-to-Engine) mode.
    sdk: {
      clientId: ENTRA_CLIENT_ID,
      tenantId: ENTRA_TENANT_ID,
      environmentId: COPILOT_ENVIRONMENT_ID,
      schemaName: COPILOT_SCHEMA_NAME,
      cloud: COPILOT_AGENT_CLOUD
    }
  });
});

/**
 * Exchanges the server-side secret/endpoint for a short-lived Direct Line token.
 * Returns: { token, conversationId?, expires_in?, source }
 */
app.get('/api/directline/token', async (_req, res) => {
  try {
    if (COPILOT_TOKEN_ENDPOINT) {
      const result = await fetchCopilotStudioToken(COPILOT_TOKEN_ENDPOINT);
      return res.json({ ...result, source: 'copilot-token-endpoint' });
    }

    if (DIRECT_LINE_SECRET) {
      const result = await generateDirectLineToken(DIRECT_LINE_SECRET);
      return res.json({ ...result, source: 'direct-line-secret' });
    }

    return res.status(412).json({
      error:
        'Server is not configured. Set COPILOT_TOKEN_ENDPOINT or DIRECT_LINE_SECRET in .env, ' +
        'or use a client-side connection mode in the playground.'
    });
  } catch (err) {
    console.error('[token] failed:', err);
    return res
      .status(502)
      .json({ error: `Failed to acquire Direct Line token: ${err.message}` });
  }
});

/**
 * Validates the configured connection end-to-end by acquiring a token and (when
 * possible) confirming a conversation id is issued. Used by the "Test
 * connection" button in the playground.
 */
app.get('/api/test-connection', async (_req, res) => {
  const started = Date.now();
  try {
    let token;
    let source;
    if (COPILOT_TOKEN_ENDPOINT) {
      ({ token } = await fetchCopilotStudioToken(COPILOT_TOKEN_ENDPOINT));
      source = 'copilot-token-endpoint';
    } else if (DIRECT_LINE_SECRET) {
      ({ token } = await generateDirectLineToken(DIRECT_LINE_SECRET));
      source = 'direct-line-secret';
    } else {
      return res.status(412).json({
        ok: false,
        error: 'Server has no connection configured.'
      });
    }

    // Open a conversation to prove the token is valid and streaming-capable.
    const convo = await startConversation(token);

    return res.json({
      ok: true,
      source,
      conversationId: convo.conversationId,
      streamUrl: Boolean(convo.streamUrl),
      tokenAcquired: true,
      elapsedMs: Date.now() - started
    });
  } catch (err) {
    return res.status(502).json({
      ok: false,
      error: err.message,
      elapsedMs: Date.now() - started
    });
  }
});

// ---------------------------------------------------------------------------
// Direct-to-Engine sidecar (server-side streaming for next-gen agents)
//
// Why a server hop at all? The browser SDK opens the SAME streaming SSE we use
// here, but it is CORS-blocked from reading the `x-ms-d2e-experimental` header,
// so it cannot follow the redirect to the generative "island" runtime and gets
// the classic fallback. Running the identical SDK in Node bypasses CORS and
// lets the experimental-island redirect engage, which is where the generative
// progressive answer activities stream from when supported by the runtime.
//
// State: the island URL is learned from a response header on the FIRST request
// and only applies to SUBSEQUENT requests on the SAME client instance. So we
// MUST keep the client alive across the start -> send turns. We cache it by the
// conversation id the SDK issues on start.
// ---------------------------------------------------------------------------

/** @type {Map<string, { client: CopilotStudioClient, lastUsed: number }>} */
const dteSessions = new Map();
const DTE_SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes idle
const DTE_SESSION_MAX = 200;

function pruneDteSessions() {
  const now = Date.now();
  for (const [id, s] of dteSessions) {
    if (now - s.lastUsed > DTE_SESSION_TTL_MS) dteSessions.delete(id);
  }
  // Hard cap: drop the oldest if we somehow blow past the limit.
  while (dteSessions.size > DTE_SESSION_MAX) {
    const oldest = [...dteSessions.entries()].sort(
      (a, b) => a[1].lastUsed - b[1].lastUsed
    )[0];
    if (!oldest) break;
    dteSessions.delete(oldest[0]);
  }
}

/**
 * Builds a CopilotStudioClient from a browser-supplied delegated token + the
 * connection knobs. enableDiagnostics surfaces the SDK's own request logging;
 * combined with the global fetch wrapper above we get a full picture of which
 * runtime each turn hits.
 * @param {string} token
 * @param {Record<string, any>} settings
 */
function buildDteClient(token, settings = {}) {
  const cs = new ConnectionSettings({
    directConnectUrl: settings.directConnectUrl || undefined,
    environmentId: settings.environmentId || undefined,
    schemaName: settings.schemaName || undefined,
    agentIdentifier: settings.schemaName || undefined,
    cloud: settings.cloud || 'Prod',
    copilotAgentType: settings.copilotAgentType || 'Published',
    useExperimentalEndpoint: Boolean(settings.useExperimentalEndpoint),
    enableDiagnostics: true
  });
  return new CopilotStudioClient(cs, token);
}

function getGhcp3pConversationUrl(settings = {}) {
  const value = String(settings.directConnectUrl || '').trim();
  if (!value) throw new Error('Missing GHCP /3p Direct Connect URL.');

  const url = new URL(value);
  const validHost = /^[a-f0-9]{30}\.[a-f0-9]{2}\.environment\.api\.powerplatform\.com$/i.test(
    url.hostname
  );
  const validPath = /^\/copilotstudio\/agenticruntime\/3p\/dataverse-backed\/authenticated\/bots\/[^/]+$/i.test(
    url.pathname.replace(/\/+$/, '').replace(/\/conversations(?:\/[^/]+)?$/i, '')
  );
  if (
    url.protocol !== 'https:' ||
    url.port ||
    url.username ||
    url.password ||
    !validHost ||
    !validPath ||
    url.searchParams.get('api-version') !== '1'
  ) {
    throw new Error('Invalid GHCP /3p Direct Connect URL.');
  }

  url.pathname = url.pathname
    .replace(/\/+$/, '')
    .replace(/\/conversations(?:\/[^/]+)?$/i, '') + '/conversations';
  return url;
}

async function preflightGhcp3p(token, settings) {
  const url = getGhcp3pConversationUrl(settings);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  const started = Date.now();
  let response;
  try {
    response = await __nativeFetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream'
      },
      body: JSON.stringify({ emitStartConversationEvent: true }),
      signal: controller.signal
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error('GHCP /3p runtime preflight timed out after 25 seconds.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).trim().split('\n')[0].slice(0, 240);
    const error = new Error(
      `GHCP /3p runtime returned HTTP ${response.status}${detail ? `: ${detail}` : ''}`
    );
    error.httpStatus = response.status;
    throw error;
  }

  await response.body?.cancel().catch(() => {});
  return {
    ok: true,
    status: response.status,
    endpoint: url.href,
    elapsedMs: Date.now() - started
  };
}

/**
 * Sets up an NDJSON streaming response (one JSON object per line). We use NDJSON
 * rather than SSE because the browser drives these turns with POST bodies
 * (token + settings), which the native EventSource API cannot send.
 * @param {import('express').Response} res
 */
function openNdjsonStream(res) {
  res.set({
    'Content-Type': 'application/x-ndjson; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive'
  });
  res.flushHeaders?.();
  return {
    write: (obj) => res.write(JSON.stringify(obj) + '\n'),
    end: () => res.end()
  };
}

/**
 * Streams a turn (start or send) to the browser as NDJSON activity frames.
 * Each yielded activity is forwarded verbatim; the browser normalizes streaming
 * chunks into a single growing Web Chat bubble.
 * @param {import('express').Response} res
 * @param {AsyncGenerator<any>} activities
 * @param {() => string} getConversationId
 */
async function pumpTurn(res, activities, getConversationId) {
  const out = openNdjsonStream(res);
  let count = 0;
  try {
    for await (const activity of activities) {
      count += 1;
      const cd = activity?.channelData || {};
      console.log(
        `[dte:act] #${count} type=${activity?.type} ` +
        `streamType=${cd.streamType || '-'} streamId=${cd.streamId || '-'} ` +
        `textLen=${(activity?.text || '').length} ` +
        `entities=${Array.isArray(activity?.entities) ? activity.entities.map((e) => e?.type).join(',') || '[]' : '-'}`
      );
      out.write({ type: 'activity', activity });
    }
    out.write({ type: 'done', conversationId: getConversationId(), count });
  } catch (err) {
    console.error('[dte] turn failed:', err);
    out.write({ type: 'error', error: err?.message || String(err) });
  } finally {
    out.end();
  }
}

/**
 * Start a conversation: creates (or reuses) a server-side client, emits any
 * greeting activities, and returns the conversation id the browser uses for
 * subsequent turns. The client is cached so the experimental-island redirect
 * learned here persists into the send turns.
 */
app.post('/api/dte/start', async (req, res) => {
  pruneDteSessions();
  const { token, settings } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Missing delegated token.' });
  if (settings?.runtime === 'ghcp3p') {
    try {
      await preflightGhcp3p(token, settings);
    } catch (err) {
      return res.status(err.httpStatus || 502).json({ error: err.message });
    }
  }
  let client;
  try {
    client = buildDteClient(token, settings);
  } catch (err) {
    return res.status(400).json({ error: `Invalid connection settings: ${err.message}` });
  }
  await pumpTurn(res, client.startConversationStreaming(true), () => {
    const id = client.conversationId;
    if (id) dteSessions.set(id, { client, lastUsed: Date.now() });
    return id;
  });
});

/**
 * Send a user message on an existing conversation. Reuses the cached client
 * (which already holds the island directConnectUrl) so generative streaming
 * engages. Falls back to creating a fresh client if the session expired.
 */
app.post('/api/dte/send', async (req, res) => {
  pruneDteSessions();
  const { token, conversationId, text, settings } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Missing delegated token.' });
  if (!conversationId) return res.status(400).json({ error: 'Missing conversationId.' });
  if (!text) return res.status(400).json({ error: 'Missing message text.' });

  const session = dteSessions.get(conversationId);
  let client = session?.client;
  if (client) {
    // Refresh the bearer in case the browser re-acquired a newer token.
    client.token = token;
    session.lastUsed = Date.now();
  } else {
    // Session evicted (idle/restart). Rebuild and target the conversation id.
    try {
      client = buildDteClient(token, settings);
      client.conversationId = conversationId;
      dteSessions.set(conversationId, { client, lastUsed: Date.now() });
    } catch (err) {
      return res.status(400).json({ error: `Invalid connection settings: ${err.message}` });
    }
  }

  await pumpTurn(
    res,
    client.executeStreaming(
      { type: 'message', text, conversation: { id: conversationId } },
      conversationId
    ),
    () => client.conversationId || conversationId
  );
});

app.post('/api/dte/preflight', async (req, res) => {
  const { token, settings } = req.body || {};
  if (!token) return res.status(400).json({ ok: false, error: 'Missing delegated token.' });
  if (settings?.runtime !== 'ghcp3p') {
    return res.status(400).json({ ok: false, error: 'GHCP /3p runtime settings are required.' });
  }
  try {
    return res.json(await preflightGhcp3p(token, settings));
  } catch (err) {
    return res.status(err.httpStatus || 502).json({ ok: false, error: err.message });
  }
});

app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(
    `\n  Copilot Studio Streaming Playground running:\n  -> http://localhost:${PORT}\n`
  );
  if (!COPILOT_TOKEN_ENDPOINT && !DIRECT_LINE_SECRET) {
    console.log(
      '  No server-side connection configured yet.\n' +
        '  Add COPILOT_TOKEN_ENDPOINT or DIRECT_LINE_SECRET to .env,\n' +
        '  or paste a token endpoint URL directly in the playground UI.\n'
    );
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Copilot Studio token endpoints respond to a GET with `{ token }`.
 * @param {string} endpoint
 */
async function fetchCopilotStudioToken(endpoint) {
  const resp = await fetch(endpoint, { method: 'GET' });
  if (!resp.ok) {
    throw new Error(`Token endpoint returned HTTP ${resp.status}`);
  }
  const body = await resp.json();
  if (!body?.token) {
    throw new Error('Token endpoint response did not contain a "token" field.');
  }
  return {
    token: body.token,
    conversationId: body.conversationId,
    expires_in: body.expires_in
  };
}

/**
 * Direct Line secret -> short-lived token via the generate endpoint.
 * @param {string} secret
 */
async function generateDirectLineToken(secret) {
  const resp = await fetch(DIRECT_LINE_TOKEN_GENERATE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  if (!resp.ok) {
    throw new Error(`Direct Line token generation returned HTTP ${resp.status}`);
  }
  const body = await resp.json();
  if (!body?.token) {
    throw new Error('Direct Line response did not contain a "token" field.');
  }
  return {
    token: body.token,
    conversationId: body.conversationId,
    expires_in: body.expires_in
  };
}

/**
 * Starts a Direct Line conversation. A valid streamUrl confirms WebSocket
 * (streaming-capable) transport is available.
 * @param {string} token
 */
async function startConversation(token) {
  const resp = await fetch(
    'https://directline.botframework.com/v3/directline/conversations',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  if (!resp.ok) {
    throw new Error(`Starting conversation returned HTTP ${resp.status}`);
  }
  return resp.json();
}

/** @param {string} url */
function safeHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}
