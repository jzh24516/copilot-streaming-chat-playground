// @ts-check
/**
 * Relay + widget routes for the Dynamics 365 side pane.
 *
 * Differences from the diagnostic `/api/dte/*` routes, all deliberate:
 *   - the caller cannot choose the agent; settings come from pinned config
 *   - conversations are owned by the token subject and cannot be resumed by
 *     another user
 *   - its own session map, so a playground session can never be addressed by a
 *     pane request (or vice versa)
 *   - per-user rate limiting and a bounded message length
 *   - a `frame-ancestors` policy that names the Dynamics organization
 */

import express from 'express';
import { paneRuntimeSettings } from './crm-pane-config.js';
import { createRateLimiter, inspectDelegatedToken } from './crm-pane-auth.js';

const SESSION_TTL_MS = 30 * 60 * 1000;
const SESSION_MAX = 500;

/**
 * @param {object} deps
 * @param {import('./crm-pane-config.js').PaneConfig} deps.config
 * @param {string} deps.paneHtmlPath Absolute path to the widget shell. Kept outside
 *   the static directory so it can only be served with its CSP header attached.
 * @param {(token: string, settings: Record<string, any>) => any} deps.buildClient
 * @param {(token: string, settings: Record<string, any>) => Promise<any>} deps.preflight
 * @param {(res: import('express').Response, activities: AsyncGenerator<any>, getConversationId: () => string) => Promise<void>} deps.pumpTurn
 */
export function createPaneRouter({ config, paneHtmlPath, buildClient, preflight, pumpTurn }) {
  const router = express.Router();

  /** @type {Map<string, { client: any, owner: string, lastUsed: number }>} */
  const sessions = new Map();
  const limiter = createRateLimiter({ requestsPerMinute: config.requestsPerMinute });

  function pruneSessions(now = Date.now()) {
    for (const [id, session] of sessions) {
      if (now - session.lastUsed > SESSION_TTL_MS) sessions.delete(id);
    }
    while (sessions.size > SESSION_MAX) {
      let oldestId = null;
      let oldestAt = Infinity;
      for (const [id, session] of sessions) {
        if (session.lastUsed < oldestAt) {
          oldestAt = session.lastUsed;
          oldestId = id;
        }
      }
      if (!oldestId) break;
      sessions.delete(oldestId);
    }
  }

  const contentSecurityPolicy = [
    "default-src 'self'",
    "script-src 'self' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self' https://login.microsoftonline.com",
    // MSAL's silent SSO runs Entra in a hidden iframe; without this the
    // default-src fallback blocks it and every user gets the popup.
    'frame-src https://login.microsoftonline.com',
    "form-action 'self' https://login.microsoftonline.com",
    "object-src 'none'",
    "base-uri 'none'",
    `frame-ancestors ${config.frameAncestors.join(' ')}`
  ].join('; ');

  /**
   * Serves the widget shell.
   *
   * `X-Frame-Options` is intentionally NOT set here: it cannot express an
   * allow-list, and setting it would block the Dynamics iframe outright.
   * `frame-ancestors` is the control that matters.
   */
  router.get('/crm-pane', (_req, res) => {
    res.set({
      'Content-Security-Policy': contentSecurityPolicy,
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store'
    });
    res.sendFile(paneHtmlPath);
  });

  /** Non-secret bootstrap for the widget. Never includes a credential. */
  router.get('/api/pane/config', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({
      clientId: config.clientId,
      tenantId: config.tenantId,
      authority: config.authority,
      scope: config.scope,
      agentDisplayName: config.agentDisplayName,
      maxMessageLength: config.maxMessageLength
    });
  });

  /**
   * Validates the bearer and applies the rate limit.
   * @returns {{ subject: string } | null} null when a response was already sent.
   */
  function authorize(req, res) {
    const token = typeof req.body?.token === 'string' ? req.body.token : '';
    if (!token) {
      res.status(401).json({ error: 'Missing access token.' });
      return null;
    }

    let inspected;
    try {
      inspected = inspectDelegatedToken(token, {
        tenantId: config.tenantId,
        clientId: config.clientId
      });
    } catch (error) {
      res.status(401).json({ error: error.message });
      return null;
    }

    const limit = limiter.check(inspected.subject);
    if (!limit.allowed) {
      res.set('Retry-After', String(limit.retryAfterSeconds));
      res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
      return null;
    }

    return { subject: inspected.subject };
  }

  router.post('/api/pane/start', async (req, res) => {
    const auth = authorize(req, res);
    if (!auth) return;
    pruneSessions();

    const token = req.body.token;
    const settings = paneRuntimeSettings(config);

    try {
      await preflight(token, settings);
    } catch (error) {
      const status = error?.httpStatus || 502;
      return res.status(status).json({ error: describeUpstream(status, error?.message) });
    }

    let client;
    try {
      client = buildClient(token, settings);
    } catch (error) {
      console.error('[pane] client construction failed:', error.message);
      return res.status(500).json({ error: 'The assistant is not configured correctly. Contact your administrator.' });
    }

    await pumpTurn(res, client.startConversationStreaming(true), () => {
      const id = client.conversationId;
      if (id) sessions.set(id, { client, owner: auth.subject, lastUsed: Date.now() });
      return id;
    });
  });

  router.post('/api/pane/send', async (req, res) => {
    const auth = authorize(req, res);
    if (!auth) return;
    pruneSessions();

    const conversationId = typeof req.body?.conversationId === 'string' ? req.body.conversationId : '';
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';

    if (!conversationId) return res.status(400).json({ error: 'Missing conversationId.' });
    if (!text) return res.status(400).json({ error: 'Message cannot be empty.' });
    if (text.length > config.maxMessageLength) {
      return res.status(413).json({ error: `Message exceeds ${config.maxMessageLength} characters.` });
    }

    const session = sessions.get(conversationId);
    // A missing session and a session owned by someone else are reported
    // identically, so the response cannot be used to probe for live
    // conversation ids belonging to other users.
    if (!session || session.owner !== auth.subject) {
      return res.status(404).json({ error: 'Conversation not found. Start a new conversation.' });
    }

    session.client.token = req.body.token;
    session.lastUsed = Date.now();

    await pumpTurn(
      res,
      session.client.executeStreaming(
        { type: 'message', text, conversation: { id: conversationId } },
        conversationId
      ),
      () => session.client.conversationId || conversationId
    );
  });

  router.post('/api/pane/end', (req, res) => {
    const auth = authorize(req, res);
    if (!auth) return;

    const conversationId = typeof req.body?.conversationId === 'string' ? req.body.conversationId : '';
    const session = conversationId ? sessions.get(conversationId) : null;
    if (session && session.owner === auth.subject) sessions.delete(conversationId);
    res.json({ ok: true });
  });

  return router;
}

/**
 * Maps an upstream failure to a message that helps an operator without
 * echoing raw runtime output back into the CRM iframe.
 * @param {number} status
 * @param {string} [detail]
 */
function describeUpstream(status, detail) {
  if (status === 401) return 'Your session is no longer valid. Sign in again.';
  if (status === 403) return 'You do not have access to this agent. Ask the owner to share it with you.';
  if (status === 404) return 'The configured agent was not found. It may be unpublished or the environment is wrong.';
  if (status === 429) return 'The agent is busy. Please try again shortly.';
  console.error(`[pane] upstream ${status}: ${detail || '(no detail)'}`);
  return 'The assistant is temporarily unavailable. Please try again.';
}
