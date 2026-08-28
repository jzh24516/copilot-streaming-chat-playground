// @ts-check
/**
 * Outbound URL guard for the authenticated Agentic Runtime `/3p` route.
 *
 * Both the diagnostic playground (browser-supplied URL) and the Dynamics side
 * pane (server-pinned URL) funnel through this function before anything leaves
 * the process. Keeping it in one module means the pane cannot drift into a
 * weaker check than the playground, and it can be tested directly.
 *
 * The guard is deliberately strict — it is the SSRF boundary:
 *   - https only, default port, no credentials
 *   - host must be a Power Platform environment API host (30/2 GUID split)
 *   - path must be exactly the `/3p` published-bot route, optionally already
 *     carrying `/conversations` or `/conversations/{id}`
 *   - `api-version` must be `1`, and no other query or fragment is allowed
 */

const ENVIRONMENT_HOST =
  /^[a-f0-9]{30}\.[a-f0-9]{2}\.environment\.api\.powerplatform\.com$/i;

const THREE_P_PATH =
  /^\/copilotstudio\/agenticruntime\/3p\/dataverse-backed\/authenticated\/bots\/[A-Za-z0-9_-]+$/;

/**
 * Validates a `/3p` base or conversation URL and returns the normalized
 * conversations URL to call.
 *
 * @param {{ directConnectUrl?: string }} settings
 * @returns {URL}
 */
export function getGhcp3pConversationUrl(settings = {}) {
  const value = String(settings.directConnectUrl || '').trim();
  if (!value) throw new Error('Missing GHCP /3p Direct Connect URL.');

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Invalid GHCP /3p Direct Connect URL.');
  }

  // Strip a trailing /conversations or /conversations/{id} before matching, so
  // the same guard accepts the base URL and a resumed conversation URL.
  const basePath = url.pathname
    .replace(/\/+$/, '')
    .replace(/\/conversations(?:\/[^/]+)?$/i, '');

  // Reject encoded separators outright: they can smuggle a different path past
  // the regex once the server or a proxy decodes them.
  const hasEncodedSeparator = /%2f|%5c/i.test(url.pathname);

  if (
    url.protocol !== 'https:' ||
    url.port ||
    url.username ||
    url.password ||
    url.hash ||
    hasEncodedSeparator ||
    !ENVIRONMENT_HOST.test(url.hostname) ||
    !THREE_P_PATH.test(basePath) ||
    url.searchParams.get('api-version') !== '1' ||
    [...url.searchParams.keys()].length !== 1
  ) {
    throw new Error('Invalid GHCP /3p Direct Connect URL.');
  }

  const result = new URL(url.href);
  result.pathname = `${basePath}/conversations`;
  return result;
}
