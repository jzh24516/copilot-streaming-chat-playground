// @ts-check
import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3978;

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
const DIRECT_LINE_TOKEN_GENERATE_URL =
  process.env.DIRECT_LINE_TOKEN_GENERATE_URL?.trim() ||
  'https://directline.botframework.com/v3/directline/tokens/generate';

// ---------------------------------------------------------------------------
// SDK / Direct-to-Engine defaults (NOT secrets - safe to send to the browser).
// These pre-fill the "Copilot Studio SDK" connection mode, which authenticates
// the signed-in user via Entra ID (MSAL) and streams over the Direct Engine
// protocol - the only path that emits generative streaming chunks.
// ---------------------------------------------------------------------------
const ENTRA_CLIENT_ID = process.env.ENTRA_CLIENT_ID?.trim() || '';
const ENTRA_TENANT_ID = process.env.ENTRA_TENANT_ID?.trim() || '';
const COPILOT_ENVIRONMENT_ID = process.env.COPILOT_ENVIRONMENT_ID?.trim() || '';
const COPILOT_SCHEMA_NAME = process.env.COPILOT_SCHEMA_NAME?.trim() || '';
const COPILOT_AGENT_CLOUD = process.env.COPILOT_AGENT_CLOUD?.trim() || 'Prod';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
