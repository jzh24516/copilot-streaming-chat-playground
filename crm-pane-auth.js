// @ts-check
/**
 * Fail-fast inspection of the delegated bearer the pane widget sends up.
 *
 * IMPORTANT — this is not the authorization boundary.
 *
 * The pilot deliberately skips on-behalf-of: the browser acquires a Power
 * Platform token directly and the relay forwards it. That means this service is
 * not the token's audience and cannot meaningfully validate its signature — only
 * Copilot Studio can. The real access decision is made by the Agentic Runtime
 * `/3p` endpoint, which checks the user against the published agent's sharing.
 *
 * What these checks *do* buy us:
 *   - the relay refuses to act as an open forwarder for arbitrary bearer tokens
 *   - a wrong tenant, wrong audience, wrong app or expired token fails here with
 *     an actionable message instead of a bare 401 from a remote service
 *   - obviously malformed input never reaches an outbound request
 *
 * If this ever needs to be a true security boundary, move to the two-app OBO
 * design: expose `access_as_user` on a relay API, validate that token's
 * signature against the tenant JWKS, and exchange it server-side.
 */

/** Audiences Entra issues for the Power Platform API. */
const ALLOWED_AUDIENCES = new Set([
  'https://api.powerplatform.com',
  'https://api.powerplatform.com/'
]);

const REQUIRED_SCOPE = 'copilotstudio.copilots.invoke';

/** Tolerance for clock skew between this host and Entra. */
const CLOCK_SKEW_SECONDS = 120;

/**
 * Decodes a JWT payload without verifying the signature.
 * @param {string} token
 * @returns {Record<string, any>}
 */
function decodePayload(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('Access token is not a JWT.');
  const segment = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = segment.padEnd(segment.length + ((4 - (segment.length % 4)) % 4), '=');
  let json;
  try {
    json = Buffer.from(padded, 'base64').toString('utf8');
  } catch {
    throw new Error('Access token payload is not valid base64url.');
  }
  try {
    return JSON.parse(json);
  } catch {
    throw new Error('Access token payload is not valid JSON.');
  }
}

/**
 * @typedef {object} InspectedToken
 * @property {string} tenantId
 * @property {string} subject      Stable per-user id, used only for rate limiting.
 * @property {number} expiresAt    Unix seconds.
 */

/**
 * @param {string} token
 * @param {{ tenantId: string, clientId: string, now?: number }} expected
 * @returns {InspectedToken}
 */
export function inspectDelegatedToken(token, { tenantId, clientId, now = Date.now() }) {
  const claims = decodePayload(token);
  const nowSeconds = Math.floor(now / 1000);

  const audience = String(claims.aud || '');
  if (!ALLOWED_AUDIENCES.has(audience)) {
    throw new Error(
      'Access token audience is not the Power Platform API. ' +
      'Request the scope https://api.powerplatform.com/.default.'
    );
  }

  if (String(claims.tid || '').toLowerCase() !== String(tenantId).toLowerCase()) {
    throw new Error('Access token was issued by a different tenant than this pane is pinned to.');
  }

  const tokenAppId = String(claims.appid || claims.azp || '').toLowerCase();
  if (tokenAppId !== String(clientId).toLowerCase()) {
    throw new Error('Access token was issued to a different client application than this pane is pinned to.');
  }

  // `idtyp: app` marks an app-only token. The pane is a delegated-user
  // experience, so an application identity here is a misconfiguration.
  if (String(claims.idtyp || '').toLowerCase() === 'app') {
    throw new Error('Access token is an application identity. The side pane requires a signed-in user.');
  }

  const scopes = String(claims.scp || '')
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((entry) => entry.toLowerCase());
  if (!scopes.includes(REQUIRED_SCOPE)) {
    throw new Error('Access token is missing the delegated CopilotStudio.Copilots.Invoke scope.');
  }

  const expiresAt = Number(claims.exp);
  if (!Number.isFinite(expiresAt)) throw new Error('Access token has no expiry claim.');
  if (expiresAt + CLOCK_SKEW_SECONDS < nowSeconds) throw new Error('Access token has expired.');

  const notBefore = Number(claims.nbf);
  if (Number.isFinite(notBefore) && notBefore - CLOCK_SKEW_SECONDS > nowSeconds) {
    throw new Error('Access token is not valid yet.');
  }

  const subject = String(claims.oid || claims.sub || '');
  if (!subject) throw new Error('Access token has no subject claim.');

  return { tenantId: String(claims.tid), subject, expiresAt };
}

/**
 * Fixed-window per-user request limiter.
 *
 * The pane is a low-volume internal surface, so an in-process counter is
 * proportionate. A multi-instance deployment should move this to a shared store
 * (or pin the pilot to a single instance) before widening the audience.
 */
export function createRateLimiter({ requestsPerMinute, windowMs = 60_000 }) {
  /** @type {Map<string, { count: number, resetAt: number }>} */
  const buckets = new Map();

  return {
    /**
     * @param {string} key
     * @returns {{ allowed: boolean, retryAfterSeconds: number }}
     */
    check(key, now = Date.now()) {
      for (const [id, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(id);
      }
      const bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, retryAfterSeconds: 0 };
      }
      bucket.count += 1;
      if (bucket.count > requestsPerMinute) {
        return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
      }
      return { allowed: true, retryAfterSeconds: 0 };
    }
  };
}
