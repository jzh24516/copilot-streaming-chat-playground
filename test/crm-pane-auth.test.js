// @ts-check
import assert from 'node:assert/strict';
import test from 'node:test';

import { createRateLimiter, inspectDelegatedToken } from '../crm-pane-auth.js';

const TENANT_ID = '00000000-1111-2222-3333-444444444444';
const CLIENT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const NOW = 1_800_000_000_000; // fixed clock so expiry assertions stay stable

/** Builds an unsigned JWT. Signature content is irrelevant: this relay is not the audience. */
function makeToken(overrides = {}) {
  const payload = {
    aud: 'https://api.powerplatform.com',
    tid: TENANT_ID,
    appid: CLIENT_ID,
    scp: 'CopilotStudio.Copilots.Invoke',
    oid: 'e2a1b6d4-0000-4000-8000-abcdefabcdef',
    exp: Math.floor(NOW / 1000) + 3600,
    ...overrides
  };
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode(payload)}.signature`;
}

const expected = { tenantId: TENANT_ID, clientId: CLIENT_ID, now: NOW };

test('accepts a well-formed delegated Power Platform token', () => {
  const result = inspectDelegatedToken(makeToken(), expected);
  assert.equal(result.tenantId, TENANT_ID);
  assert.equal(result.subject, 'e2a1b6d4-0000-4000-8000-abcdefabcdef');
});

test('accepts the trailing-slash audience form Entra also issues', () => {
  assert.doesNotThrow(() =>
    inspectDelegatedToken(makeToken({ aud: 'https://api.powerplatform.com/' }), expected)
  );
});

test('rejects a token minted for a different resource', () => {
  assert.throws(
    () => inspectDelegatedToken(makeToken({ aud: 'https://graph.microsoft.com' }), expected),
    /audience is not the Power Platform API/
  );
});

test('rejects a token from another tenant', () => {
  assert.throws(
    () => inspectDelegatedToken(makeToken({ tid: '11111111-1111-1111-1111-111111111111' }), expected),
    /different tenant/
  );
});

test('rejects a token issued to another client application', () => {
  assert.throws(
    () => inspectDelegatedToken(makeToken({ appid: '22222222-2222-2222-2222-222222222222' }), expected),
    /different client application/
  );
});

test('accepts azp when appid is absent', () => {
  const token = makeToken({ appid: undefined, azp: CLIENT_ID });
  assert.doesNotThrow(() => inspectDelegatedToken(token, expected));
});

test('rejects an app-only identity', () => {
  assert.throws(
    () => inspectDelegatedToken(makeToken({ idtyp: 'app' }), expected),
    /requires a signed-in user/
  );
});

test('rejects a token without the Copilots.Invoke scope', () => {
  assert.throws(
    () => inspectDelegatedToken(makeToken({ scp: 'User.Read' }), expected),
    /missing the delegated CopilotStudio.Copilots.Invoke scope/
  );
});

test('scope matching is case-insensitive and tolerates multiple scopes', () => {
  const token = makeToken({ scp: 'User.Read copilotstudio.copilots.invoke offline_access' });
  assert.doesNotThrow(() => inspectDelegatedToken(token, expected));
});

test('rejects an expired token but allows minor clock skew', () => {
  const nowSeconds = Math.floor(NOW / 1000);
  assert.doesNotThrow(() => inspectDelegatedToken(makeToken({ exp: nowSeconds - 60 }), expected));
  assert.throws(() => inspectDelegatedToken(makeToken({ exp: nowSeconds - 600 }), expected), /expired/);
});

test('rejects a token that is not yet valid', () => {
  const nowSeconds = Math.floor(NOW / 1000);
  assert.throws(
    () => inspectDelegatedToken(makeToken({ nbf: nowSeconds + 600 }), expected),
    /not valid yet/
  );
});

test('rejects structurally invalid input', () => {
  for (const value of ['', 'not-a-jwt', 'a.b', 'a.@@@.c']) {
    assert.throws(() => inspectDelegatedToken(value, expected), `expected rejection for ${JSON.stringify(value)}`);
  }
});

test('rejects a token with no subject claim', () => {
  assert.throws(
    () => inspectDelegatedToken(makeToken({ oid: undefined, sub: undefined }), expected),
    /no subject claim/
  );
});

test('rate limiter allows the quota then blocks with a retry hint', () => {
  const limiter = createRateLimiter({ requestsPerMinute: 3 });
  const now = NOW;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    assert.equal(limiter.check('user-a', now).allowed, true, `attempt ${attempt} should pass`);
  }

  const blocked = limiter.check('user-a', now);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds > 0);

  // Buckets are per user, so one busy user cannot lock out another.
  assert.equal(limiter.check('user-b', now).allowed, true);

  // The window resets.
  assert.equal(limiter.check('user-a', now + 60_001).allowed, true);
});
