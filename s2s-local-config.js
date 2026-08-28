import fs from 'node:fs/promises';
import path from 'node:path';

import { validateS2SConfig } from './s2s-token.js';

export const S2S_LOCAL_CONFIG_PATH = path.join('config', 's2s.local.json');

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeLocalS2SConfig(value = {}) {
  return {
    clientId: clean(value.clientId),
    tenantId: clean(value.tenantId),
    clientSecret: clean(value.clientSecret),
    environmentId: clean(value.environmentId),
    schemaName: clean(value.schemaName)
  };
}

export function publicS2SConfig(config, source = 'none') {
  return {
    configured: !validateS2SConfig(config),
    configurationError: validateS2SConfig(config) || null,
    clientId: config.clientId || '',
    tenantId: config.tenantId || '',
    environmentId: config.environmentId || '',
    schemaName: config.schemaName || '',
    hasClientSecret: Boolean(config.clientSecret),
    source
  };
}

export async function readLocalS2SConfig(filePath = S2S_LOCAL_CONFIG_PATH) {
  try {
    const value = JSON.parse(await fs.readFile(filePath, 'utf8'));
    return normalizeLocalS2SConfig(value);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw new Error(`Could not read local S2S configuration: ${error.message}`);
  }
}

export async function writeLocalS2SConfig(config, filePath = S2S_LOCAL_CONFIG_PATH) {
  const normalized = normalizeLocalS2SConfig(config);
  const errorMessage = validateS2SConfig(normalized);
  if (errorMessage) throw new Error(errorMessage);
  if (!normalized.environmentId) throw new Error('Enter the Copilot Studio Environment ID.');
  if (!normalized.schemaName) throw new Error('Enter the no-auth GHCP agent schema name.');

  const directory = path.dirname(filePath);
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.mkdir(directory, { recursive: true });
  try {
    await fs.writeFile(temporaryPath, `${JSON.stringify(normalized, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
      flag: 'wx'
    });
    await fs.rename(temporaryPath, filePath);
    await fs.chmod(filePath, 0o600).catch(() => {});
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch(() => {});
    throw error;
  }
  return normalized;
}