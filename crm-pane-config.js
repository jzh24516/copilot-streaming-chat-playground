// @ts-check
/**
 * Pinned configuration for the Dynamics 365 side-pane widget.
 *
 * The diagnostic playground lets the browser choose the environment, schema and
 * Direct Connect URL. The pane must not: a browser inside a CRM iframe is the
 * least trustworthy input we have. Everything that selects *which agent is
 * reached* is resolved here, server-side, from immutable process configuration.
 *
 * Nothing in this module is a secret. The delegated user token still decides
 * what the caller is allowed to do; the Agentic Runtime `/3p` endpoint remains
 * the actual authorization boundary.
 */

import fs from 'node:fs';
import path from 'node:path';

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Copilot Studio agent schema names are alphanumeric plus `_` and `-`. */
const SCHEMA_NAME = /^[A-Za-z0-9_-]{1,128}$/;

const POWER_PLATFORM_SCOPE = 'https://api.powerplatform.com/.default';

/**
 * Derives the Power Platform environment API host.
 *
 * The commercial (Prod) rule is: strip dashes from the environment GUID, then
 * split the resulting 32 characters into the first 30 and the last 2.
 * `11111111-2222-3333-4444-555555555555`
 *   -> `111111112222333344445555555555.55.environment.api.powerplatform.com`
 *
 * @param {string} environmentId
 * @returns {string}
 */
export function environmentApiHost(environmentId) {
  const compact = String(environmentId || '').replace(/-/g, '').toLowerCase();
  if (compact.length !== 32 || !/^[0-9a-f]{32}$/.test(compact)) {
    throw new Error('environmentId must be a GUID.');
  }
  return `${compact.slice(0, 30)}.${compact.slice(30)}.environment.api.powerplatform.com`;
}

/**
 * Builds the authenticated Agentic Runtime `/3p` base URL for one agent.
 *
 * This is the exact shape `server.js#getGhcp3pConversationUrl` re-validates
 * before any outbound call, so a change here cannot silently widen the guard.
 *
 * @param {{ environmentId: string, schemaName: string }} target
 * @returns {string}
 */
export function build3pDirectConnectUrl({ environmentId, schemaName }) {
  if (!SCHEMA_NAME.test(String(schemaName || ''))) {
    throw new Error('schemaName must be 1-128 characters of A-Z, a-z, 0-9, underscore or hyphen.');
  }
  const host = environmentApiHost(environmentId);
  return (
    `https://${host}/copilotstudio/agenticruntime/3p/dataverse-backed` +
    `/authenticated/bots/${schemaName}?api-version=1`
  );
}

/**
 * Normalizes one browser origin that is allowed to frame the pane.
 *
 * Returned values go into a `Content-Security-Policy: frame-ancestors`
 * directive, so anything that could terminate or extend that directive
 * (whitespace, `;`, `,`) is rejected rather than escaped.
 *
 * @param {string} value
 * @returns {string}
 */
export function normalizeFrameAncestor(value) {
  const raw = String(value || '').trim();
  if (!raw) throw new Error('Frame ancestor origin cannot be empty.');
  if (/[\s;,'"]/.test(raw)) {
    throw new Error(`Frame ancestor "${raw}" contains an unsupported character.`);
  }
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Frame ancestor "${raw}" is not an absolute URL.`);
  }
  if (url.protocol !== 'https:') {
    throw new Error(`Frame ancestor "${raw}" must use https.`);
  }
  if (url.username || url.password) {
    throw new Error(`Frame ancestor "${raw}" must not contain credentials.`);
  }
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error(`Frame ancestor "${raw}" must be an origin with no path, query or fragment.`);
  }
  return url.origin;
}

/**
 * Reads the optional non-secret config file. Environment variables win so a
 * deployed App Service can be configured without redeploying the file.
 *
 * @param {string} baseDir
 * @returns {Record<string, any>}
 */
function readPaneFile(baseDir) {
  const file = path.join(baseDir, 'config', 'crm-pane.json');
  try {
    if (!fs.existsSync(file)) return {};
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    console.warn(`[pane] Could not read config/crm-pane.json: ${error.message}`);
    return {};
  }
}

/**
 * @typedef {object} PaneConfig
 * @property {true} enabled
 * @property {string} tenantId
 * @property {string} clientId          Entra SPA application the pane signs in with.
 * @property {string} authority         MSAL authority URL.
 * @property {string} scope             Delegated scope requested by the browser.
 * @property {string} environmentId     Pinned Copilot Studio environment.
 * @property {string} schemaName        Pinned agent schema name.
 * @property {string} directConnectUrl  Derived `/3p` base URL.
 * @property {string} agentDisplayName  Label shown in the pane header.
 * @property {string[]} frameAncestors  Dynamics origins allowed to frame the pane.
 * @property {number} maxMessageLength
 * @property {number} requestsPerMinute
 */

/**
 * Loads and validates the pane configuration.
 *
 * Returns a disabled descriptor (rather than throwing) when the pane has not
 * been configured, so the existing playground keeps booting untouched.
 *
 * @param {{ baseDir: string, env?: NodeJS.ProcessEnv }} options
 * @returns {PaneConfig | { enabled: false, reason: string }}
 */
export function loadPaneConfig({ baseDir, env = process.env }) {
  const file = readPaneFile(baseDir);

  const pick = (envKey, fileKey) => {
    const fromEnv = env[envKey]?.trim();
    if (fromEnv) return fromEnv;
    const fromFile = file[fileKey];
    return typeof fromFile === 'string' ? fromFile.trim() : '';
  };

  const environmentId = pick('PANE_ENVIRONMENT_ID', 'environmentId');
  const schemaName = pick('PANE_SCHEMA_NAME', 'schemaName');
  const tenantId = pick('PANE_TENANT_ID', 'tenantId') || env.ENTRA_TENANT_ID?.trim() || '';
  const clientId = pick('PANE_CLIENT_ID', 'clientId') || env.ENTRA_CLIENT_ID?.trim() || '';

  const rawAncestors =
    env.PANE_DYNAMICS_ORIGINS?.trim() ||
    (Array.isArray(file.dynamicsOrigins) ? file.dynamicsOrigins.join(',') : '');

  const missing = [];
  if (!environmentId) missing.push('PANE_ENVIRONMENT_ID');
  if (!schemaName) missing.push('PANE_SCHEMA_NAME');
  if (!tenantId) missing.push('PANE_TENANT_ID');
  if (!clientId) missing.push('PANE_CLIENT_ID');
  if (!rawAncestors) missing.push('PANE_DYNAMICS_ORIGINS');
  if (missing.length) {
    return { enabled: false, reason: `Side pane disabled. Missing: ${missing.join(', ')}.` };
  }

  if (!GUID.test(tenantId)) throw new Error('PANE_TENANT_ID must be a GUID.');
  if (!GUID.test(clientId)) throw new Error('PANE_CLIENT_ID must be a GUID.');

  const frameAncestors = [
    ...new Set(rawAncestors.split(',').map((entry) => entry.trim()).filter(Boolean).map(normalizeFrameAncestor))
  ];
  if (!frameAncestors.length) {
    throw new Error('PANE_DYNAMICS_ORIGINS must contain at least one https origin.');
  }

  // Throws on a malformed environment/schema pair, which is what we want at
  // boot: a misconfigured pane must fail loudly instead of serving a widget
  // that can never reach its agent.
  const directConnectUrl = build3pDirectConnectUrl({ environmentId, schemaName });

  const toPositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  };

  return {
    enabled: true,
    tenantId,
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    scope: POWER_PLATFORM_SCOPE,
    environmentId,
    schemaName,
    directConnectUrl,
    agentDisplayName: pick('PANE_AGENT_DISPLAY_NAME', 'agentDisplayName') || 'AI assistant',
    frameAncestors,
    maxMessageLength: toPositiveInt(env.PANE_MAX_MESSAGE_LENGTH ?? file.maxMessageLength, 4000),
    requestsPerMinute: toPositiveInt(env.PANE_REQUESTS_PER_MINUTE ?? file.requestsPerMinute, 30)
  };
}

/**
 * The immutable Copilot Studio settings the pane relay passes to the SDK.
 * Built fresh per request so a caller cannot mutate shared state.
 *
 * @param {PaneConfig} config
 */
export function paneRuntimeSettings(config) {
  return {
    runtime: 'ghcp3p',
    directConnectUrl: config.directConnectUrl,
    environmentId: config.environmentId,
    schemaName: config.schemaName,
    cloud: 'Prod',
    copilotAgentType: 'Published',
    useExperimentalEndpoint: false
  };
}
