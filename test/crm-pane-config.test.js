// @ts-check
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  build3pDirectConnectUrl,
  environmentApiHost,
  loadPaneConfig,
  normalizeFrameAncestor,
  paneRuntimeSettings
} from '../crm-pane-config.js';
import { getGhcp3pConversationUrl } from '../ghcp3p-url.js';

// Synthetic identifiers. The environment GUID is chosen so the derived 30/2
// host split is easy to verify by eye.
const ENVIRONMENT_ID = '11111111-2222-3333-4444-555555555555';
const ENVIRONMENT_HOST = '111111112222333344445555555555.55.environment.api.powerplatform.com';
const SCHEMA_NAME = 'contoso_exampleagent_a1B2c3';
const TENANT_ID = '00000000-1111-2222-3333-444444444444';
const CLIENT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

function baseEnv(overrides = {}) {
  return {
    PANE_TENANT_ID: TENANT_ID,
    PANE_CLIENT_ID: CLIENT_ID,
    PANE_ENVIRONMENT_ID: ENVIRONMENT_ID,
    PANE_SCHEMA_NAME: SCHEMA_NAME,
    PANE_DYNAMICS_ORIGINS: 'https://contoso.crm.dynamics.com',
    ...overrides
  };
}

test('environmentApiHost splits the compact GUID 30/2', () => {
  assert.equal(environmentApiHost(ENVIRONMENT_ID), ENVIRONMENT_HOST);
});

test('environmentApiHost rejects a non-GUID environment', () => {
  assert.throws(() => environmentApiHost('not-a-guid'), /must be a GUID/);
  assert.throws(() => environmentApiHost(''), /must be a GUID/);
});

test('build3pDirectConnectUrl rejects a schema name that could escape the path', () => {
  for (const schemaName of ['../../evil', 'agent/conversations', 'agent name', 'a'.repeat(129)]) {
    assert.throws(
      () => build3pDirectConnectUrl({ environmentId: ENVIRONMENT_ID, schemaName }),
      /schemaName must be/,
      `expected rejection for ${JSON.stringify(schemaName)}`
    );
  }
});

// The whole point of pinning: whatever the pane derives has to satisfy the same
// outbound guard the playground uses, or the pane would be a second, weaker way
// out of the process.
test('the derived pane URL passes the shared /3p outbound guard', () => {
  const config = loadPaneConfig({ baseDir: '/nonexistent', env: baseEnv() });
  assert.equal(config.enabled, true);

  const url = getGhcp3pConversationUrl(paneRuntimeSettings(config));
  assert.equal(
    url.href,
    `https://${ENVIRONMENT_HOST}` +
      `/copilotstudio/agenticruntime/3p/dataverse-backed/authenticated/bots/${SCHEMA_NAME}` +
      '/conversations?api-version=1'
  );
});

test('the /3p guard rejects hosts and paths outside the pinned route', () => {
  const path3p = '/copilotstudio/agenticruntime/3p/dataverse-backed/authenticated/bots/a';
  const rejected = [
    `http://${ENVIRONMENT_HOST}${path3p}?api-version=1`,
    `https://evil.example.com${path3p}?api-version=1`,
    `https://${ENVIRONMENT_HOST}/copilotstudio/dataverse-backed/authenticated/bots/a?api-version=1`,
    `https://${ENVIRONMENT_HOST}${path3p}?api-version=2`,
    `https://${ENVIRONMENT_HOST}:8443${path3p}?api-version=1`,
    `https://user:pass@${ENVIRONMENT_HOST}${path3p}?api-version=1`,
    `https://${ENVIRONMENT_HOST}${path3p}%2f..%2fother?api-version=1`,
    `https://${ENVIRONMENT_HOST}${path3p}?api-version=1&extra=1`,
    ''
  ];

  for (const directConnectUrl of rejected) {
    assert.throws(
      () => getGhcp3pConversationUrl({ directConnectUrl }),
      /GHCP \/3p Direct Connect URL/,
      `expected rejection for ${JSON.stringify(directConnectUrl)}`
    );
  }
});

test('the /3p guard accepts an already-resumed conversation URL', () => {
  const base =
    `https://${ENVIRONMENT_HOST}` +
    '/copilotstudio/agenticruntime/3p/dataverse-backed/authenticated/bots/agent';
  const resumed = getGhcp3pConversationUrl({
    directConnectUrl: `${base}/conversations/abc123?api-version=1`
  });
  assert.equal(resumed.pathname, '/copilotstudio/agenticruntime/3p/dataverse-backed/authenticated/bots/agent/conversations');
});

test('frame ancestors must be bare https origins', () => {
  assert.equal(normalizeFrameAncestor('https://contoso.crm.dynamics.com/'), 'https://contoso.crm.dynamics.com');

  for (const value of [
    'http://contoso.crm.dynamics.com',
    'https://contoso.crm.dynamics.com/main.aspx',
    "https://contoso.crm.dynamics.com'; script-src *",
    'https://a.com https://b.com',
    'contoso.crm.dynamics.com',
    'https://user:pass@contoso.crm.dynamics.com',
    ''
  ]) {
    assert.throws(() => normalizeFrameAncestor(value), `expected rejection for ${JSON.stringify(value)}`);
  }
});

test('the pane stays disabled until every pinned value is supplied', () => {
  const result = loadPaneConfig({ baseDir: '/nonexistent', env: {} });
  assert.equal(result.enabled, false);
  assert.match(result.reason, /PANE_ENVIRONMENT_ID/);
  assert.match(result.reason, /PANE_DYNAMICS_ORIGINS/);
});

test('a malformed pinned value fails at boot instead of at first use', () => {
  assert.throws(
    () => loadPaneConfig({ baseDir: '/nonexistent', env: baseEnv({ PANE_TENANT_ID: 'nope' }) }),
    /PANE_TENANT_ID must be a GUID/
  );
  assert.throws(
    () => loadPaneConfig({ baseDir: '/nonexistent', env: baseEnv({ PANE_ENVIRONMENT_ID: 'nope' }) }),
    /environmentId must be a GUID/
  );
  assert.throws(
    () => loadPaneConfig({ baseDir: '/nonexistent', env: baseEnv({ PANE_DYNAMICS_ORIGINS: 'http://insecure.example' }) }),
    /must use https/
  );
});

test('multiple Dynamics origins are parsed and de-duplicated', () => {
  const config = loadPaneConfig({
    baseDir: '/nonexistent',
    env: baseEnv({
      PANE_DYNAMICS_ORIGINS:
        ' https://contoso.crm.dynamics.com , https://contoso.crm4.dynamics.com ,https://contoso.crm.dynamics.com '
    })
  });
  assert.deepEqual(config.frameAncestors, [
    'https://contoso.crm.dynamics.com',
    'https://contoso.crm4.dynamics.com'
  ]);
});

test('runtime settings pin the agent and never expose a caller-controlled target', () => {
  const config = loadPaneConfig({ baseDir: '/nonexistent', env: baseEnv() });
  const settings = paneRuntimeSettings(config);

  assert.equal(settings.runtime, 'ghcp3p');
  assert.equal(settings.environmentId, ENVIRONMENT_ID);
  assert.equal(settings.schemaName, SCHEMA_NAME);
  assert.equal(settings.copilotAgentType, 'Published');

  // Mutating one turn's settings must not leak into the next.
  settings.directConnectUrl = 'https://evil.example.com';
  assert.notEqual(paneRuntimeSettings(config).directConnectUrl, 'https://evil.example.com');
});
