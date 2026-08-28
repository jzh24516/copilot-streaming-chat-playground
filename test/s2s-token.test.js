import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  POWER_PLATFORM_SCOPE,
  createS2STokenProvider,
  createS2STokenProviderManager
} from '../s2s-token.js';
import {
  publicS2SConfig,
  readLocalS2SConfig,
  writeLocalS2SConfig
} from '../s2s-local-config.js';

const validConfig = {
  clientId: '11111111-1111-4111-8111-111111111111',
  tenantId: '22222222-2222-4222-8222-222222222222',
  clientSecret: 'server-only-secret'
};

test('fails closed when S2S credentials are incomplete', async () => {
  let factoryCalled = false;
  const provider = createS2STokenProvider({
    config: { clientId: '', tenantId: '', clientSecret: '' },
    clientFactory: () => {
      factoryCalled = true;
    }
  });

  assert.equal(provider.configured, false);
  await assert.rejects(
    provider.acquireToken(),
    (error) => error.code === 'S2S_NOT_CONFIGURED' && error.httpStatus === 412
  );
  assert.equal(factoryCalled, false);
});

test('acquires and caches an app-only Power Platform token', async () => {
  let factoryConfig;
  let tokenRequests = 0;
  const provider = createS2STokenProvider({
    config: validConfig,
    now: () => Date.parse('2026-08-13T00:00:00Z'),
    clientFactory: (config) => {
      factoryConfig = config;
      return {
        async acquireTokenByClientCredential(request) {
          tokenRequests += 1;
          assert.deepEqual(request.scopes, [POWER_PLATFORM_SCOPE]);
          return {
            accessToken: 'app-only-token',
            expiresOn: new Date('2026-08-13T01:00:00Z')
          };
        }
      };
    }
  });

  assert.equal(provider.configured, true);
  assert.equal(await provider.acquireToken(), 'app-only-token');
  assert.equal(await provider.acquireToken(), 'app-only-token');
  assert.equal(tokenRequests, 1);
  assert.equal(factoryConfig.auth.clientId, validConfig.clientId);
  assert.equal(factoryConfig.auth.authority, `https://login.microsoftonline.com/${validConfig.tenantId}`);
  assert.equal(factoryConfig.auth.clientSecret, validConfig.clientSecret);
  assert.deepEqual(Object.keys(provider).sort(), ['acquireToken', 'configurationError', 'configured']);
});

test('rejects malformed app-registration identifiers before creating MSAL', async () => {
  let factoryCalled = false;
  const provider = createS2STokenProvider({
    config: { ...validConfig, tenantId: 'organizations' },
    clientFactory: () => {
      factoryCalled = true;
    }
  });

  await assert.rejects(provider.acquireToken(), /S2S tenant ID must be a GUID/);
  assert.equal(factoryCalled, false);
});

test('replaces the active provider when local settings are saved', async () => {
  const requestedConfigs = [];
  const manager = createS2STokenProviderManager({
    config: { clientId: '', tenantId: '', clientSecret: '' },
    providerFactory: (config) => {
      requestedConfigs.push(config);
      return {
        configured: Boolean(config.clientSecret),
        configurationError: config.clientSecret ? null : 'missing',
        acquireToken: async () => config.clientSecret
      };
    }
  });

  assert.equal(manager.configured, false);
  manager.update(validConfig);
  assert.equal(manager.configured, true);
  assert.equal(await manager.acquireToken(), validConfig.clientSecret);
  assert.deepEqual(requestedConfigs, [{ clientId: '', tenantId: '', clientSecret: '' }, validConfig]);
});

test('persists local S2S settings but redacts the secret from public metadata', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'streaming-chat-s2s-'));
  const filePath = path.join(directory, 'config', 's2s.local.json');
  const saved = {
    ...validConfig,
    environmentId: '33333333-3333-4333-8333-333333333333',
    schemaName: 'cr123_noAuthHarness'
  };

  try {
    await writeLocalS2SConfig(saved, filePath);
    assert.deepEqual(await readLocalS2SConfig(filePath), saved);
    const publicConfig = publicS2SConfig(saved, 'local-file');
    assert.equal(publicConfig.hasClientSecret, true);
    assert.equal(publicConfig.source, 'local-file');
    assert.equal('clientSecret' in publicConfig, false);
    assert.equal(JSON.stringify(publicConfig).includes(saved.clientSecret), false);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});