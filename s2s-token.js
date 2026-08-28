import { ConfidentialClientApplication } from '@azure/msal-node';

export const POWER_PLATFORM_SCOPE = 'https://api.powerplatform.com/.default';

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_REFRESH_SKEW_MS = 60 * 1000;

export function readS2SConfig(env = process.env) {
  return {
    clientId: env.S2S_CLIENT_ID?.trim() || '',
    tenantId: env.S2S_TENANT_ID?.trim() || '',
    clientSecret: env.S2S_CLIENT_SECRET?.trim() || ''
  };
}

export function validateS2SConfig(config) {
  if (!config.clientId || !config.tenantId || !config.clientSecret) {
    return 'Enter the S2S client ID, tenant ID, and client secret, then save the configuration.';
  }
  if (!GUID_PATTERN.test(config.clientId)) return 'S2S client ID must be a GUID.';
  if (!GUID_PATTERN.test(config.tenantId)) return 'S2S tenant ID must be a GUID.';
  return '';
}

function createConfigurationError(message) {
  const error = new Error(message);
  error.code = 'S2S_NOT_CONFIGURED';
  error.httpStatus = 412;
  return error;
}

export function createS2STokenProvider({
  config = readS2SConfig(),
  clientFactory = (msalConfig) => new ConfidentialClientApplication(msalConfig),
  now = () => Date.now()
} = {}) {
  const errorMessage = validateS2SConfig(config);
  let client;
  let cachedToken;
  let pendingAcquisition;

  async function requestToken() {
    if (errorMessage) throw createConfigurationError(errorMessage);

    if (!client) {
      client = clientFactory({
        auth: {
          clientId: config.clientId,
          authority: `https://login.microsoftonline.com/${config.tenantId}`,
          clientSecret: config.clientSecret
        }
      });
    }

    let response;
    try {
      response = await client.acquireTokenByClientCredential({
        scopes: [POWER_PLATFORM_SCOPE]
      });
    } catch (cause) {
      const code = cause?.errorCode || cause?.code || 'token_acquisition_failed';
      const error = new Error(`S2S app-token acquisition failed (${code}).`);
      error.code = code;
      error.httpStatus = 502;
      error.cause = cause;
      throw error;
    }

    if (!response?.accessToken) {
      const error = new Error('Entra did not return an S2S access token.');
      error.code = 'S2S_TOKEN_MISSING';
      error.httpStatus = 502;
      throw error;
    }

    cachedToken = {
      value: response.accessToken,
      expiresAt: response.expiresOn?.getTime() || now() + 5 * 60 * 1000
    };
    return cachedToken.value;
  }

  return {
    configured: !errorMessage,
    configurationError: errorMessage || null,
    async acquireToken() {
      if (cachedToken && cachedToken.expiresAt - TOKEN_REFRESH_SKEW_MS > now()) {
        return cachedToken.value;
      }
      if (!pendingAcquisition) {
        pendingAcquisition = requestToken().finally(() => {
          pendingAcquisition = undefined;
        });
      }
      return pendingAcquisition;
    }
  };
}

export function createS2STokenProviderManager({
  config = readS2SConfig(),
  providerFactory = (nextConfig) => createS2STokenProvider({ config: nextConfig })
} = {}) {
  let provider = providerFactory(config);

  return {
    get configured() {
      return provider.configured;
    },
    get configurationError() {
      return provider.configurationError;
    },
    acquireToken() {
      return provider.acquireToken();
    },
    update(nextConfig) {
      provider = providerFactory(nextConfig);
    }
  };
}