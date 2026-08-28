/* global WebChat */
'use strict';

// ---------------------------------------------------------------------------
// Elements
// ---------------------------------------------------------------------------
const el = (id) => document.getElementById(id);
const modeSel = el('mode');
const tokenEndpointField = el('tokenEndpointField');
const secretField = el('secretField');
const dlStreamField = el('dlStreamField');
const sdkField = el('sdkField');
const sdkClientId = el('sdkClientId');
const sdkTenantId = el('sdkTenantId');
const sdkEnvironmentId = el('sdkEnvironmentId');
const sdkSchemaName = el('sdkSchemaName');
const newAgentField = el('newAgentField');
const newClientId = el('newClientId');
const newTenantId = el('newTenantId');
const newEnvironmentId = el('newEnvironmentId');
const newSchemaName = el('newSchemaName');
const newDirectConnectUrl = el('newDirectConnectUrl');
const newAgentType = el('newAgentType');
const newExperimental = el('newExperimental');
const tokenEndpointInput = el('tokenEndpoint');
const secretInput = el('secret');
const dlStreamCred = el('dlStreamCred');
const newAgentDLField = el('newAgentDLField');
const newDlEnvironmentId = el('newDlEnvironmentId');
const newDlSchemaName = el('newDlSchemaName');
  // Published-bot DTE island diagnostic — Entra-authenticated, non-GHCP
const newAgentDTEField = el('newAgentDTEField');
const dtClientId = el('dtClientId');
const dtTenantId = el('dtTenantId');
const dtEnvironmentId = el('dtEnvironmentId');
const dtSchemaName = el('dtSchemaName');
const dtDirectConnectUrl = el('dtDirectConnectUrl');
const dtExperimental = el('dtExperimental');
const dtViaSidecar = el('dtViaSidecar');
const ghcp3pField = el('ghcp3pField');
const ghcp3pClientId = el('ghcp3pClientId');
const ghcp3pTenantId = el('ghcp3pTenantId');
const ghcp3pEnvironmentId = el('ghcp3pEnvironmentId');
const ghcp3pSchemaName = el('ghcp3pSchemaName');
const ghcp3pUrl = el('ghcp3pUrl');
const ghcpS2SField = el('ghcpS2SField');
const ghcpS2SClientId = el('ghcpS2SClientId');
const ghcpS2STenantId = el('ghcpS2STenantId');
const ghcpS2SClientSecret = el('ghcpS2SClientSecret');
const ghcpS2SEnvironmentId = el('ghcpS2SEnvironmentId');
const ghcpS2SSchemaName = el('ghcpS2SSchemaName');
const ghcpS2SUrl = el('ghcpS2SUrl');
const ghcpS2SStatus = el('ghcpS2SStatus');
const ghcpS2SSaveBtn = el('ghcpS2SSaveBtn');
const ghcpAgentFrameworkField = el('ghcpAgentFrameworkField');
const afGhcpClientId = el('afGhcpClientId');
const afGhcpTenantId = el('afGhcpTenantId');
const afGhcpEnvironmentId = el('afGhcpEnvironmentId');
const afGhcpSchemaName = el('afGhcpSchemaName');
const afGhcpUrl = el('afGhcpUrl');
const afGhcpSidecarUrl = el('afGhcpSidecarUrl');
const forceWebSocket = el('forceWebSocket');
const autoInspect = el('autoInspect');
const typewriterToggle = el('typewriter');
const connectBtn = el('connectBtn');
const testBtn = el('testBtn');
const disconnectBtn = el('disconnectBtn');
const serverHint = el('serverHint');
const statusDot = document.querySelector('.status-dot');
const statusLabel = el('statusLabel');
const placeholder = el('placeholder');
const convoIdLabel = el('convoId');
const thinkingEl = el('thinking');
const logEl = el('log');
const clearLogBtn = el('clearLog');
const mStreams = el('mStreams');
const mChunks = el('mChunks');
const mFinal = el('mFinal');
const diagnosisEl = el('diagnosis');
const languageSelect = el('languageSelect');
const deckLink = document.querySelector('.deck-link');
const layoutEl = document.querySelector('.layout');
const configToggle = el('configToggle');
const configToggleIcon = configToggle && configToggle.querySelector('span');
const configResizeHandle = el('configResizeHandle');

const i18n = window.StreamingI18n;
let currentLang = i18n ? i18n.getInitialLang() : 'en';
let lastHint = { message: '', kind: '', vars: null };
let connectionPanelCollapsed = false;
let s2sServerConfigured = false;
let s2sHasClientSecret = false;
const CONNECTION_PANEL_WIDTH_KEY = 'connectionPanelWidth';
const CONNECTION_PANEL_DEFAULT_WIDTH = 320;
const CONNECTION_PANEL_MIN_WIDTH = 260;
const CONNECTION_PANEL_MAX_WIDTH = 560;
let connectionPanelWidth = readStoredConnectionPanelWidth();
let connectionPanelResizeState = null;

function t(key, vars) {
  return i18n ? i18n.translate(key, currentLang, vars) : key;
}

function formatConversation(id) {
  return t('conversation: {id}', { id: id || '—' });
}

function readStoredConnectionPanelWidth() {
  try {
    const stored = Number(localStorage.getItem(CONNECTION_PANEL_WIDTH_KEY));
    if (Number.isFinite(stored) && stored >= CONNECTION_PANEL_MIN_WIDTH) {
      return Math.min(stored, CONNECTION_PANEL_MAX_WIDTH);
    }
  } catch { /* storage unavailable */ }
  return CONNECTION_PANEL_DEFAULT_WIDTH;
}

function getConnectionPanelMaxWidth() {
  if (!layoutEl) return CONNECTION_PANEL_MAX_WIDTH;
  const available = layoutEl.clientWidth - 32 - 32 - 360 - 320;
  return Math.max(
    CONNECTION_PANEL_MIN_WIDTH,
    Math.min(CONNECTION_PANEL_MAX_WIDTH, available)
  );
}

function getRenderedConnectionPanelWidth(width = connectionPanelWidth) {
  return Math.round(Math.max(
    CONNECTION_PANEL_MIN_WIDTH,
    Math.min(width, getConnectionPanelMaxWidth())
  ));
}

function renderConnectionPanelWidth() {
  if (!layoutEl) return;
  const renderedWidth = getRenderedConnectionPanelWidth();
  layoutEl.style.setProperty('--connection-panel-width', `${renderedWidth}px`);
  if (configResizeHandle) {
    configResizeHandle.setAttribute('aria-valuemax', String(getConnectionPanelMaxWidth()));
    configResizeHandle.setAttribute('aria-valuenow', String(renderedWidth));
  }
}

function storeConnectionPanelWidth() {
  try {
    localStorage.setItem(CONNECTION_PANEL_WIDTH_KEY, String(connectionPanelWidth));
  } catch { /* storage unavailable */ }
}

function renderConnectionPanelState() {
  if (!layoutEl || !configToggle) return;
  renderConnectionPanelWidth();
  layoutEl.classList.toggle('connection-collapsed', connectionPanelCollapsed);
  const label = t(
    connectionPanelCollapsed ? 'Expand connection panel' : 'Collapse connection panel'
  );
  configToggle.setAttribute('aria-label', label);
  configToggle.setAttribute('title', label);
  configToggle.setAttribute('aria-expanded', String(!connectionPanelCollapsed));
  if (configToggleIcon) configToggleIcon.textContent = connectionPanelCollapsed ? '›' : '‹';
}

function syncDeckLink() {
  if (!deckLink) return;
  const url = new URL(deckLink.getAttribute('href'), window.location.origin);
  if (currentLang === 'en') url.searchParams.delete('lang');
  else url.searchParams.set('lang', currentLang);
  deckLink.href = url.pathname + url.search + url.hash;
}

function applyLanguage(lang) {
  currentLang = i18n ? i18n.setStoredLang(lang) : lang;
  if (i18n) {
    i18n.populateSelect(languageSelect, currentLang);
    i18n.apply(document.body, currentLang);
  }
  document.title = t('Copilot Studio · Streaming Chat Playground');
  syncDeckLink();
  renderConnectionPanelState();
  renderHint(lastHint.message, lastHint.kind, lastHint.vars);
  if (convoIdLabel && convoIdLabel.textContent.trim().endsWith('—')) {
    convoIdLabel.textContent = formatConversation('—');
  }
  updateDiagnosis();
}

if (configToggle) {
  configToggle.addEventListener('click', () => {
    connectionPanelCollapsed = !connectionPanelCollapsed;
    renderConnectionPanelState();
  });
}

if (configResizeHandle) {
  configResizeHandle.addEventListener('pointerdown', (event) => {
    if (
      connectionPanelCollapsed ||
      !window.matchMedia('(min-width: 1101px)').matches ||
      event.button !== 0
    ) return;
    event.preventDefault();
    configResizeHandle.setPointerCapture(event.pointerId);
    connectionPanelResizeState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: getRenderedConnectionPanelWidth()
    };
    document.body.classList.add('connection-panel-resizing');
  });

  configResizeHandle.addEventListener('pointermove', (event) => {
    if (!connectionPanelResizeState || event.pointerId !== connectionPanelResizeState.pointerId) {
      return;
    }
    connectionPanelWidth = getRenderedConnectionPanelWidth(
      connectionPanelResizeState.startWidth + event.clientX - connectionPanelResizeState.startX
    );
    renderConnectionPanelWidth();
  });

  const finishConnectionPanelResize = (event) => {
    if (!connectionPanelResizeState || event.pointerId !== connectionPanelResizeState.pointerId) {
      return;
    }
    connectionPanelResizeState = null;
    document.body.classList.remove('connection-panel-resizing');
    storeConnectionPanelWidth();
  };
  configResizeHandle.addEventListener('pointerup', finishConnectionPanelResize);
  configResizeHandle.addEventListener('pointercancel', finishConnectionPanelResize);
  configResizeHandle.addEventListener('lostpointercapture', finishConnectionPanelResize);

  configResizeHandle.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') {
      connectionPanelWidth = CONNECTION_PANEL_DEFAULT_WIDTH;
    } else {
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      connectionPanelWidth = getRenderedConnectionPanelWidth(
        getRenderedConnectionPanelWidth() + direction * (event.shiftKey ? 32 : 16)
      );
    }
    renderConnectionPanelWidth();
    storeConnectionPanelWidth();
  });
}

window.addEventListener('resize', renderConnectionPanelWidth);

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let directLine = null;
let subscriptions = [];
let sdkCloud = 'Prod';
const seenStreamIds = new Set();
const progressiveStreamIds = new Set();
const streamObservations = new Map();
const seenFinalKeys = new Set();
let chunkCount = 0;
let informativeCount = 0;
let finalCount = 0;

// Keeps the transcript pinned to the newest content so the streaming answer
// bubble stays visible in realtime as it grows.
let autoScrollObserver = null;

// Agent "thinking" transition: a styled "Plan"-look card (floating over the
// canvas) that lists the agent's DYNAMIC informative streaminfo chunks as they
// arrive, then DISAPPEARS the moment the streamed answer starts to grow.
let thinkingSteps = []; // [{ text, status: 'active' | 'done' }]
let thinkingActive = false;
let thinkingHideTimer = null;
// True once the answer has started and we've begun fading the card out. Guards
// finishThinkingSoon() so the SDK's rapid streaming chunks (one every ~60-90ms)
// can't each re-show the overlay and reschedule its removal — which previously
// parked the "Thought process" card over the streaming answer for the entire
// turn, making the canvas look frozen until the final message arrived.
let thinkingFinishing = false;

// ---------------------------------------------------------------------------
// Connection status helpers (DirectLine ConnectionStatus enum)
//   0 Uninitialized · 1 Connecting · 2 Online · 3 ExpiredToken
//   4 FailedToConnect · 5 Ended
// ---------------------------------------------------------------------------
const STATUS = {
  0: { label: 'Initializing…', state: 'connecting' },
  1: { label: 'Connecting…', state: 'connecting' },
  2: { label: 'Online · streaming ready', state: 'online' },
  3: { label: 'Token expired', state: 'error' },
  4: { label: 'Failed to connect', state: 'error' },
  5: { label: 'Conversation ended', state: 'idle' }
};

function setStatus(state, label) {
  statusDot.setAttribute('data-state', state);
  statusLabel.textContent = t(label);
}

function renderHint(message, kind = '', vars = null) {
  serverHint.textContent = message ? t(message, vars) : '';
  serverHint.className = `hint ${kind}`.trim();
}

function setHint(message, kind = '', vars = null) {
  lastHint = { message, kind, vars };
  renderHint(message, kind, vars);
}

// ---------------------------------------------------------------------------
// Mode UI
// ---------------------------------------------------------------------------
function refreshModeUI() {
  const mode = modeSel.value;
  tokenEndpointField.hidden = mode !== 'tokenEndpoint';
  secretField.hidden = mode !== 'secret';
  dlStreamField.hidden = mode !== 'dlStream';
  sdkField.hidden = mode !== 'sdk';
  if (newAgentField) newAgentField.hidden = mode !== 'newAgent';
  if (newAgentDLField) newAgentDLField.hidden = mode !== 'newAgentDL';
  if (newAgentDTEField) newAgentDTEField.hidden = mode !== 'newAgentDTE';
  if (ghcp3pField) ghcp3pField.hidden = mode !== 'ghcp3p';
  if (ghcpS2SField) ghcpS2SField.hidden = mode !== 'ghcpS2S';
  if (ghcpAgentFrameworkField) ghcpAgentFrameworkField.hidden = mode !== 'ghcpAgentFramework';
  // Web Socket transport only applies to Direct Line modes (and is mandatory
  // for the live-streaming adapter, so it is forced/locked there).
  forceWebSocket.disabled =
    mode === 'sdk' || mode === 'newAgent' || mode === 'dlStream' || mode === 'newAgentDL' || mode === 'newAgentDTE' || mode === 'ghcp3p' || mode === 'ghcpS2S' || mode === 'ghcpAgentFramework';
  if (mode === 'dlStream' || mode === 'newAgentDL') forceWebSocket.checked = true;
}
modeSel.addEventListener('change', () => {
  refreshModeUI();
  if (modeSel.value === 'ghcpAgentFramework') {
    setHint('Start the .NET sidecar with npm run agent-framework:poc, then click Test connection or Connect.');
  } else if (modeSel.value === 'ghcpS2S') {
    setHint(
      s2sServerConfigured
        ? 'Saved S2S settings are active. Test the connection or connect to the no-auth GHCP agent.'
        : 'Enter the S2S app credentials and no-auth GHCP agent details, then save them locally.'
    );
  }
});

// ---------------------------------------------------------------------------
// Discover server-side configuration
// ---------------------------------------------------------------------------
async function loadServerConfig() {
  try {
    const resp = await fetch('/api/config');
    const cfg = await resp.json();

    // Pre-fill the SDK (Direct-to-Engine) inputs from non-secret server config.
    const sdk = cfg.sdk || {};
    if (sdk.clientId) sdkClientId.value = sdk.clientId;
    if (sdk.tenantId) sdkTenantId.value = sdk.tenantId;
    if (sdk.environmentId) sdkEnvironmentId.value = sdk.environmentId;
    if (sdk.schemaName) sdkSchemaName.value = sdk.schemaName;
    if (sdk.cloud) sdkCloud = sdk.cloud;

    // Seed the isolated "New Agent" mode with the same Entra identity (client +
    // tenant) so testing a new agent only requires its environment + schema.
    if (sdk.clientId && newClientId && !newClientId.value) newClientId.value = sdk.clientId;
    if (sdk.tenantId && newTenantId && !newTenantId.value) newTenantId.value = sdk.tenantId;

    // The no-auth Agentic Direct Line diagnostic lives in the same environment,
    // so seed its Environment ID too (schema name is agent-specific — left blank).
    if (sdk.environmentId && newDlEnvironmentId && !newDlEnvironmentId.value) {
      newDlEnvironmentId.value = sdk.environmentId;
    }
    // The published-bot DTE island diagnostic shares the same
    // Entra identity and environment — pre-seed so the user only has to fill
    // the schema name for their employee-facing agent.
    if (sdk.clientId && dtClientId && !dtClientId.value) dtClientId.value = sdk.clientId;
    if (sdk.tenantId && dtTenantId && !dtTenantId.value) dtTenantId.value = sdk.tenantId;
    if (sdk.environmentId && dtEnvironmentId && !dtEnvironmentId.value) dtEnvironmentId.value = sdk.environmentId;
    if (sdk.clientId && ghcp3pClientId && !ghcp3pClientId.value) ghcp3pClientId.value = sdk.clientId;
    if (sdk.tenantId && ghcp3pTenantId && !ghcp3pTenantId.value) ghcp3pTenantId.value = sdk.tenantId;
    if (sdk.environmentId && ghcp3pEnvironmentId && !ghcp3pEnvironmentId.value) {
      ghcp3pEnvironmentId.value = sdk.environmentId;
    }
    const s2s = cfg.s2s || {};
    if (s2s.clientId && ghcpS2SClientId && !ghcpS2SClientId.value) ghcpS2SClientId.value = s2s.clientId;
    if (s2s.tenantId && ghcpS2STenantId && !ghcpS2STenantId.value) ghcpS2STenantId.value = s2s.tenantId;
    if (s2s.environmentId && ghcpS2SEnvironmentId && !ghcpS2SEnvironmentId.value) {
      ghcpS2SEnvironmentId.value = s2s.environmentId;
    } else if (sdk.environmentId && ghcpS2SEnvironmentId && !ghcpS2SEnvironmentId.value) {
      ghcpS2SEnvironmentId.value = sdk.environmentId;
    }
    if (s2s.schemaName && ghcpS2SSchemaName && !ghcpS2SSchemaName.value) {
      ghcpS2SSchemaName.value = s2s.schemaName;
    }
    if (sdk.clientId && afGhcpClientId && !afGhcpClientId.value) afGhcpClientId.value = sdk.clientId;
    if (sdk.tenantId && afGhcpTenantId && !afGhcpTenantId.value) afGhcpTenantId.value = sdk.tenantId;
    if (sdk.environmentId && afGhcpEnvironmentId && !afGhcpEnvironmentId.value) {
      afGhcpEnvironmentId.value = sdk.environmentId;
    }

    s2sServerConfigured = Boolean(s2s.configured);
    s2sHasClientSecret = Boolean(s2s.hasClientSecret);
    if (ghcpS2SClientSecret) {
      ghcpS2SClientSecret.value = '';
      ghcpS2SClientSecret.placeholder = s2sHasClientSecret
        ? 'Saved secret is set — leave blank to keep it'
        : 'Enter a secret to save locally';
    }
    if (ghcpS2SStatus) {
      ghcpS2SStatus.textContent = s2sServerConfigured
        ? t('S2S settings saved locally and active. The secret is not returned to the browser.')
        : t('S2S is not configured: {message}', {
            message: s2s.configurationError || 'missing server credentials'
          });
    }

    // Pre-fill the client-side "Direct Line secret / token" input from .env
    // (DIRECT_LINE_SECRET_CLIENT) so it survives reloads.
    if (cfg.directLineSecret && !secretInput.value) {
      secretInput.value = cfg.directLineSecret;
    }
    // The experimental live-streaming mode reuses the same credential.
    if (cfg.directLineSecret && dlStreamCred && !dlStreamCred.value) {
      dlStreamCred.value = cfg.directLineSecret;
    }
    // Pre-fill the "Copilot Studio token endpoint URL" mode from .env
    // (COPILOT_TOKEN_ENDPOINT_CLIENT) so it survives reloads.
    if (cfg.tokenEndpointUrl && tokenEndpointInput && !tokenEndpointInput.value) {
      tokenEndpointInput.value = cfg.tokenEndpointUrl;
    }

    const sdkReady = Boolean(sdk.clientId && sdk.environmentId && sdk.schemaName);
    const sdkConfigured = Boolean(
      sdk.clientId || sdk.tenantId || sdk.environmentId || sdk.schemaName
    );

    if (sdkReady) {
      modeSel.value = 'sdk';
      setHint(
        'Copilot Studio SDK ready · Direct-to-Engine. Click Connect to sign in and stream.',
        'ok'
      );
    } else if (sdkConfigured || cfg.mode === 'none') {
      modeSel.value = 'sdk';
      setHint(
        'Fill in the Entra client ID and Environment ID below (or add them to .env), then Connect. SDK mode is the only one that streams generatively.'
      );
    } else {
      modeSel.value = 'sdk';
      const host = cfg.tokenEndpointHost ? ` (${cfg.tokenEndpointHost})` : '';
      setHint(
        'Server relay ready · mode: {mode}{host}. For generative streaming, switch to SDK mode.',
        'ok'
        , { mode: cfg.mode, host }
      );
    }
  } catch {
    modeSel.value = 'sdk';
    setHint('Could not reach the server. Using client-side SDK mode.');
  }
  refreshModeUI();
}

// ---------------------------------------------------------------------------
// Token acquisition for each mode
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// No-auth Agentic Runtime · Direct Line diagnostic
//
// Reproduces the observed Web app canvas bootstrap for a no-auth agent:
//   1. derive the environment API host from the environment id
//   2. (best-effort) discover the agent's regional Direct Line host
//   3. mint a Direct Line token from the agenticruntime token endpoint
//   4. open Direct Line 3.0 over WebSocket against that regional host
// The client requests livestreaming, but whether chunks are emitted is a
// server/runtime capability. This mode is not a GHCP harness integration.
// ---------------------------------------------------------------------------

// Mirrors the SDK's getEnvironmentEndpoint host shaping for Prod: the 32-char
// environment GUID (dashes removed) is split as <first 30>.<last 2>.
function environmentApiHost(envId) {
  const compact = String(envId || '').replace(/-/g, '').toLowerCase();
  if (compact.length < 3) throw new Error('Environment ID looks invalid.');
  const suffixLen = 2; // Prod / Mooncake share a 2-char suffix split.
  const first = compact.slice(0, compact.length - suffixLen);
  const last = compact.slice(compact.length - suffixLen);
  return `${first}.${last}.environment.api.powerplatform.com`;
}

const NEWDL_FIELDS_KEY = 'newAgentDlFields';

function readNewAgentDLConfigRaw() {
  return {
    environmentId: (newDlEnvironmentId && newDlEnvironmentId.value.trim()) || '',
    schemaName: (newDlSchemaName && newDlSchemaName.value.trim()) || ''
  };
}

function saveNewAgentDLConfig() {
  try {
    sessionStorage.setItem(NEWDL_FIELDS_KEY, JSON.stringify(readNewAgentDLConfigRaw()));
  } catch {
    /* storage unavailable - ignore */
  }
}

function restoreNewAgentDLConfig() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(NEWDL_FIELDS_KEY) || '{}');
    if (saved.environmentId && newDlEnvironmentId && !newDlEnvironmentId.value) {
      newDlEnvironmentId.value = saved.environmentId;
    }
    if (saved.schemaName && newDlSchemaName && !newDlSchemaName.value) {
      newDlSchemaName.value = saved.schemaName;
    }
  } catch {
    /* ignore */
  }
}

[newDlEnvironmentId, newDlSchemaName]
  .filter(Boolean)
  .forEach((input) => input.addEventListener('change', saveNewAgentDLConfig));

// ---------------------------------------------------------------------------
// Published-bot DTE island diagnostic — Entra-authenticated, non-GHCP
// ---------------------------------------------------------------------------
const NEWDTE_FIELDS_KEY = 'newAgentDTEFields';

function readNewAgentDTEConfigRaw() {
  return {
    clientId: (dtClientId && dtClientId.value.trim()) || '',
    tenantId: (dtTenantId && dtTenantId.value.trim()) || '',
    environmentId: (dtEnvironmentId && dtEnvironmentId.value.trim()) || '',
    schemaName: (dtSchemaName && dtSchemaName.value.trim()) || '',
    directConnectUrl: (dtDirectConnectUrl && dtDirectConnectUrl.value.trim()) || '',
    cloud: sdkCloud || 'Prod',
    copilotAgentType: 'Published',
    useExperimentalEndpoint: Boolean(dtExperimental && dtExperimental.checked),
    viaSidecar: Boolean(dtViaSidecar && dtViaSidecar.checked)
  };
}

function readNewAgentDTEConfig() {
  const cfg = readNewAgentDTEConfigRaw();
  // Experimental island gateway takes precedence — drop manual URL to let the
  // SDK follow the x-ms-d2e-experimental redirect instead.
  if (cfg.useExperimentalEndpoint) cfg.directConnectUrl = '';
  if (!window.CopilotStudioSDK || !window.CopilotStudioSDK.ready) {
    throw new Error('Copilot Studio SDK is still loading. Wait a moment and retry.');
  }
  if (!window.msal) {
    throw new Error('MSAL did not load. Check your network/CDN access and reload.');
  }
  if (!cfg.clientId) throw new Error('Enter the Entra application (client) ID.');
  if (!cfg.tenantId) throw new Error('Enter the directory (tenant) ID.');
  if (!cfg.directConnectUrl) {
    if (!cfg.environmentId) throw new Error('Enter the Copilot Studio Environment ID.');
    if (!cfg.schemaName) throw new Error('Enter the agent schema name.');
  }
  return cfg;
}

function saveNewAgentDTEConfig() {
  try {
    sessionStorage.setItem(NEWDTE_FIELDS_KEY, JSON.stringify(readNewAgentDTEConfigRaw()));
  } catch { /* storage unavailable */ }
}

function readNewAgentDTEConfigSafe() {
  if (!window.CopilotStudioSDK || !window.CopilotStudioSDK.ready || !window.msal) return null;
  const cfg = readNewAgentDTEConfigRaw();
  if (!cfg.clientId || !cfg.tenantId) return null;
  return cfg;
}

function restoreNewAgentDTEConfig() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(NEWDTE_FIELDS_KEY) || '{}');
    if (saved.clientId && dtClientId && !dtClientId.value) dtClientId.value = saved.clientId;
    if (saved.tenantId && dtTenantId && !dtTenantId.value) dtTenantId.value = saved.tenantId;
    if (saved.environmentId && dtEnvironmentId && !dtEnvironmentId.value) dtEnvironmentId.value = saved.environmentId;
    if (saved.schemaName && dtSchemaName && !dtSchemaName.value) dtSchemaName.value = saved.schemaName;
  } catch { /* ignore */ }
}

[dtClientId, dtTenantId, dtEnvironmentId, dtSchemaName, dtDirectConnectUrl, dtExperimental, dtViaSidecar]
  .filter(Boolean)
  .forEach((input) => input.addEventListener('change', saveNewAgentDTEConfig));

const GHCP3P_FIELDS_KEY = 'ghcp3pFields';

function buildGhcp3pDirectConnectUrl(environmentId, schemaName) {
  if (!environmentId || !schemaName) return '';
  return (
    `https://${environmentApiHost(environmentId)}` +
    '/copilotstudio/agenticruntime/3p/dataverse-backed/authenticated/bots/' +
    `${encodeURIComponent(schemaName)}?api-version=1`
  );
}

function readGhcp3pConfigRaw() {
  const environmentId = (ghcp3pEnvironmentId && ghcp3pEnvironmentId.value.trim()) || '';
  const schemaName = (ghcp3pSchemaName && ghcp3pSchemaName.value.trim()) || '';
  return {
    clientId: (ghcp3pClientId && ghcp3pClientId.value.trim()) || '',
    tenantId: (ghcp3pTenantId && ghcp3pTenantId.value.trim()) || '',
    environmentId,
    schemaName,
    directConnectUrl: buildGhcp3pDirectConnectUrl(environmentId, schemaName),
    cloud: sdkCloud || 'Prod',
    copilotAgentType: 'Published',
    useExperimentalEndpoint: false,
    viaSidecar: true,
    runtime: 'ghcp3p'
  };
}

function syncGhcp3pUrl() {
  if (!ghcp3pUrl) return;
  try {
    ghcp3pUrl.value = readGhcp3pConfigRaw().directConnectUrl;
  } catch {
    ghcp3pUrl.value = '';
  }
}

function readGhcp3pConfig() {
  const cfg = readGhcp3pConfigRaw();
  if (!window.CopilotStudioSDK || !window.CopilotStudioSDK.ready) {
    throw new Error('Copilot Studio SDK is still loading. Wait a moment and retry.');
  }
  if (!window.msal) throw new Error('MSAL did not load. Check your network/CDN access and reload.');
  if (!cfg.clientId) throw new Error('Enter the Entra application (client) ID.');
  if (!cfg.tenantId) throw new Error('Enter the directory (tenant) ID.');
  if (!cfg.environmentId) throw new Error('Enter the Copilot Studio Environment ID.');
  if (!cfg.schemaName) throw new Error('Enter the GHCP agent schema name.');
  return cfg;
}

function readGhcp3pConfigSafe() {
  if (!window.CopilotStudioSDK || !window.CopilotStudioSDK.ready || !window.msal) return null;
  const cfg = readGhcp3pConfigRaw();
  if (!cfg.clientId || !cfg.tenantId || !cfg.environmentId || !cfg.schemaName) return null;
  return cfg;
}

function saveGhcp3pConfig() {
  try {
    const cfg = readGhcp3pConfigRaw();
    sessionStorage.setItem(GHCP3P_FIELDS_KEY, JSON.stringify({
      clientId: cfg.clientId,
      tenantId: cfg.tenantId,
      environmentId: cfg.environmentId,
      schemaName: cfg.schemaName
    }));
  } catch { /* storage unavailable */ }
  syncGhcp3pUrl();
}

function restoreGhcp3pConfig() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(GHCP3P_FIELDS_KEY) || '{}');
    if (saved.clientId && ghcp3pClientId && !ghcp3pClientId.value) ghcp3pClientId.value = saved.clientId;
    if (saved.tenantId && ghcp3pTenantId && !ghcp3pTenantId.value) ghcp3pTenantId.value = saved.tenantId;
    if (saved.environmentId && ghcp3pEnvironmentId && !ghcp3pEnvironmentId.value) {
      ghcp3pEnvironmentId.value = saved.environmentId;
    }
    if (saved.schemaName && ghcp3pSchemaName && !ghcp3pSchemaName.value) ghcp3pSchemaName.value = saved.schemaName;
  } catch { /* ignore */ }
  syncGhcp3pUrl();
}

[ghcp3pClientId, ghcp3pTenantId, ghcp3pEnvironmentId, ghcp3pSchemaName]
  .filter(Boolean)
  .forEach((input) => {
    input.addEventListener('change', saveGhcp3pConfig);
    input.addEventListener('input', syncGhcp3pUrl);
  });

const GHCP_S2S_FIELDS_KEY = 'ghcpS2SFields';

function readGhcpS2SConfigRaw() {
  const environmentId = (ghcpS2SEnvironmentId && ghcpS2SEnvironmentId.value.trim()) || '';
  const schemaName = (ghcpS2SSchemaName && ghcpS2SSchemaName.value.trim()) || '';
  return {
    environmentId,
    schemaName,
    directConnectUrl: buildGhcp3pDirectConnectUrl(environmentId, schemaName),
    cloud: 'Prod',
    copilotAgentType: 'Published',
    useExperimentalEndpoint: false,
    runtime: 'ghcp3p-s2s'
  };
}

function syncGhcpS2SUrl() {
  if (!ghcpS2SUrl) return;
  try {
    ghcpS2SUrl.value = readGhcpS2SConfigRaw().directConnectUrl;
  } catch {
    ghcpS2SUrl.value = '';
  }
}

function readGhcpS2SConfig() {
  const cfg = readGhcpS2SConfigRaw();
  if (!s2sServerConfigured) {
    throw new Error('Enter and save the S2S settings locally before testing or connecting.');
  }
  if (!cfg.environmentId) throw new Error('Enter the Copilot Studio Environment ID.');
  if (!cfg.schemaName) throw new Error('Enter the no-auth GHCP agent schema name.');
  return cfg;
}

async function saveGhcpS2SServerConfig() {
  const clientId = (ghcpS2SClientId && ghcpS2SClientId.value.trim()) || '';
  const tenantId = (ghcpS2STenantId && ghcpS2STenantId.value.trim()) || '';
  const clientSecret = (ghcpS2SClientSecret && ghcpS2SClientSecret.value) || '';
  const target = readGhcpS2SConfigRaw();
  if (!clientId) throw new Error('Enter the S2S application (client) ID.');
  if (!tenantId) throw new Error('Enter the S2S directory (tenant) ID.');
  if (!clientSecret && !s2sHasClientSecret) throw new Error('Enter the S2S client secret.');
  if (!target.environmentId) throw new Error('Enter the Copilot Studio Environment ID.');
  if (!target.schemaName) throw new Error('Enter the no-auth GHCP agent schema name.');

  const response = await fetch('/api/dte/s2s/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId,
      tenantId,
      clientSecret,
      environmentId: target.environmentId,
      schemaName: target.schemaName
    })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.ok) throw new Error(body.error || `HTTP ${response.status}`);

  const saved = body.s2s || {};
  s2sServerConfigured = Boolean(saved.configured);
  s2sHasClientSecret = Boolean(saved.hasClientSecret);
  if (ghcpS2SClientSecret) {
    ghcpS2SClientSecret.value = '';
    ghcpS2SClientSecret.placeholder = 'Saved secret is set — leave blank to keep it';
  }
  if (ghcpS2SStatus) {
    ghcpS2SStatus.textContent = t('S2S settings saved locally and active. The secret is not returned to the browser.');
  }
  saveGhcpS2SConfig();
}

function saveGhcpS2SConfig() {
  try {
    const cfg = readGhcpS2SConfigRaw();
    sessionStorage.setItem(GHCP_S2S_FIELDS_KEY, JSON.stringify({
      environmentId: cfg.environmentId,
      schemaName: cfg.schemaName
    }));
  } catch { /* storage unavailable */ }
  syncGhcpS2SUrl();
}

function restoreGhcpS2SConfig() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(GHCP_S2S_FIELDS_KEY) || '{}');
    if (saved.environmentId && ghcpS2SEnvironmentId && !ghcpS2SEnvironmentId.value) {
      ghcpS2SEnvironmentId.value = saved.environmentId;
    }
    if (saved.schemaName && ghcpS2SSchemaName && !ghcpS2SSchemaName.value) {
      ghcpS2SSchemaName.value = saved.schemaName;
    }
  } catch { /* ignore */ }
  syncGhcpS2SUrl();
}

[ghcpS2SEnvironmentId, ghcpS2SSchemaName]
  .filter(Boolean)
  .forEach((input) => {
    input.addEventListener('change', saveGhcpS2SConfig);
    input.addEventListener('input', syncGhcpS2SUrl);
  });

if (ghcpS2SSaveBtn) {
  ghcpS2SSaveBtn.addEventListener('click', async () => {
    ghcpS2SSaveBtn.disabled = true;
    setHint('Saving S2S settings to the git-ignored local configuration…');
    try {
      await saveGhcpS2SServerConfig();
      setHint('✓ S2S settings saved locally and activated. They will not be included in Git pushes.', 'ok');
    } catch (error) {
      setHint('✗ {message}', 'err', { message: error.message });
    } finally {
      ghcpS2SSaveBtn.disabled = false;
    }
  });
}

const GHCP_AGENT_FRAMEWORK_FIELDS_KEY = 'ghcpAgentFrameworkFields';

function readGhcpAgentFrameworkConfigRaw() {
  const environmentId = (afGhcpEnvironmentId && afGhcpEnvironmentId.value.trim()) || '';
  const schemaName = (afGhcpSchemaName && afGhcpSchemaName.value.trim()) || '';
  return {
    clientId: (afGhcpClientId && afGhcpClientId.value.trim()) || '',
    tenantId: (afGhcpTenantId && afGhcpTenantId.value.trim()) || '',
    environmentId,
    schemaName,
    directConnectUrl: buildGhcp3pDirectConnectUrl(environmentId, schemaName),
    sidecarUrl: ((afGhcpSidecarUrl && afGhcpSidecarUrl.value.trim()) || 'http://127.0.0.1:3980').replace(/\/+$/, ''),
    cloud: sdkCloud || 'Prod',
    copilotAgentType: 'Published',
    useExperimentalEndpoint: false,
    runtime: 'ghcpAgentFramework'
  };
}

function syncGhcpAgentFrameworkUrl() {
  if (!afGhcpUrl) return;
  try {
    afGhcpUrl.value = readGhcpAgentFrameworkConfigRaw().directConnectUrl;
  } catch {
    afGhcpUrl.value = '';
  }
}

function readGhcpAgentFrameworkConfig() {
  const cfg = readGhcpAgentFrameworkConfigRaw();
  if (!window.CopilotStudioSDK || !window.CopilotStudioSDK.ready) {
    throw new Error('Copilot Studio SDK is still loading. Wait a moment and retry.');
  }
  if (!window.msal) throw new Error('MSAL did not load. Check your network/CDN access and reload.');
  if (!cfg.clientId) throw new Error('Enter the Entra application (client) ID.');
  if (!cfg.tenantId) throw new Error('Enter the directory (tenant) ID.');
  if (!cfg.environmentId) throw new Error('Enter the Copilot Studio Environment ID.');
  if (!cfg.schemaName) throw new Error('Enter the Copilot Studio GHCP agent schema name.');
  const sidecar = new URL(cfg.sidecarUrl);
  const loopbackHosts = new Set(['127.0.0.1', 'localhost', '[::1]']);
  if (
    !['http:', 'https:'].includes(sidecar.protocol) ||
    !loopbackHosts.has(sidecar.hostname) ||
    sidecar.username ||
    sidecar.password ||
    (sidecar.pathname !== '/' && sidecar.pathname !== '') ||
    sidecar.search ||
    sidecar.hash
  ) {
    throw new Error('Agent Framework sidecar URL must be a loopback origin, such as http://127.0.0.1:3980.');
  }
  cfg.sidecarUrl = sidecar.origin;
  return cfg;
}

function readGhcpAgentFrameworkConfigSafe() {
  if (!window.CopilotStudioSDK || !window.CopilotStudioSDK.ready || !window.msal) return null;
  const cfg = readGhcpAgentFrameworkConfigRaw();
  if (!cfg.clientId || !cfg.tenantId || !cfg.environmentId || !cfg.schemaName) return null;
  return cfg;
}

function saveGhcpAgentFrameworkConfig() {
  try {
    const cfg = readGhcpAgentFrameworkConfigRaw();
    sessionStorage.setItem(GHCP_AGENT_FRAMEWORK_FIELDS_KEY, JSON.stringify({
      clientId: cfg.clientId,
      tenantId: cfg.tenantId,
      environmentId: cfg.environmentId,
      schemaName: cfg.schemaName,
      sidecarUrl: cfg.sidecarUrl
    }));
  } catch { /* storage unavailable */ }
  syncGhcpAgentFrameworkUrl();
}

function restoreGhcpAgentFrameworkConfig() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(GHCP_AGENT_FRAMEWORK_FIELDS_KEY) || '{}');
    if (saved.clientId && afGhcpClientId && !afGhcpClientId.value) afGhcpClientId.value = saved.clientId;
    if (saved.tenantId && afGhcpTenantId && !afGhcpTenantId.value) afGhcpTenantId.value = saved.tenantId;
    if (saved.environmentId && afGhcpEnvironmentId && !afGhcpEnvironmentId.value) {
      afGhcpEnvironmentId.value = saved.environmentId;
    }
    if (saved.schemaName && afGhcpSchemaName && !afGhcpSchemaName.value) afGhcpSchemaName.value = saved.schemaName;
    if (saved.sidecarUrl && afGhcpSidecarUrl) afGhcpSidecarUrl.value = saved.sidecarUrl;
  } catch { /* ignore */ }
  syncGhcpAgentFrameworkUrl();
}

[afGhcpClientId, afGhcpTenantId, afGhcpEnvironmentId, afGhcpSchemaName, afGhcpSidecarUrl]
  .filter(Boolean)
  .forEach((input) => {
    input.addEventListener('change', saveGhcpAgentFrameworkConfig);
    input.addEventListener('input', syncGhcpAgentFrameworkUrl);
  });

async function acquireNewAgentDLToken() {
  const cfg = readNewAgentDLConfigRaw();
  if (!cfg.environmentId) throw new Error('Enter the Copilot Studio Environment ID.');
  if (!cfg.schemaName) throw new Error('Enter the agent schema name.');

  const host = environmentApiHost(cfg.environmentId);
  const apiVersion = 'api-version=2022-03-01-preview';

  // 1. Best-effort: discover the agent's regional Direct Line host so the
  //    WebSocket targets the same geo the canvas uses.
  let domain = 'https://directline.botframework.com/v3/directline';
  try {
    const rcs = await fetch(
      `https://${host}/powervirtualagents/regionalchannelsettings?${apiVersion}`,
      undefined
    );
    if (rcs.ok) {
      const body = await rcs.json();
      const dl = body && body.channelUrlsById && body.channelUrlsById.directline;
      if (dl) domain = dl.replace(/\/+$/, '') + '/v3/directline';
    }
  } catch {
    /* keep the default global Direct Line host */
  }

  // 2. Mint the Direct Line token from the generative (agenticruntime) runtime.
  const tokenUrl =
    `https://${host}/copilotstudio/agenticruntime/botsbyschema/` +
    `${encodeURIComponent(cfg.schemaName)}/directline/token?${apiVersion}`;
  const resp = await fetch(tokenUrl);
  if (!resp.ok) {
    throw new Error(
      `No-auth Direct Line token endpoint returned HTTP ${resp.status}. ` +
      'This diagnostic does not support Microsoft-authenticated or GHCP harness agents.'
    );
  }
  const body = await resp.json();
  if (!body.token) throw new Error('Token endpoint did not return a "token".');
  return { token: body.token, domain };
}

async function acquireToken(mode) {
  if (mode === 'newAgentDL') {
    return acquireNewAgentDLToken();
  }

  if (mode === 'server') {
    const resp = await fetch('/api/directline/token');
    if (!resp.ok) {
      const { error } = await resp.json().catch(() => ({}));
      throw new Error(error || `Server token request failed (HTTP ${resp.status})`);
    }
    const body = await resp.json();
    return { token: body.token };
  }

  if (mode === 'tokenEndpoint') {
    const url = tokenEndpointInput.value.trim();
    if (!url) throw new Error('Enter a token endpoint URL.');
    const resp = await fetch(url, { method: 'GET' });
    if (!resp.ok) throw new Error(`Token endpoint returned HTTP ${resp.status}`);
    const body = await resp.json();
    if (!body.token) throw new Error('Token endpoint did not return a "token".');
    return { token: body.token };
  }

  // Experimental live-streaming mode: accepts a secret, a Direct Line token, OR
  // a token-endpoint URL (the closest thing Copilot Studio has to an "agent
  // connection string"), auto-detecting which one was pasted.
  if (mode === 'dlStream') {
    const value = ((dlStreamCred && dlStreamCred.value) || secretInput.value || '').trim();
    if (!value) {
      throw new Error('Enter a Direct Line secret, token, or token-endpoint URL.');
    }
    // A URL is a token endpoint: GET it for a token.
    if (/^https?:\/\//i.test(value)) {
      const resp = await fetch(value, { method: 'GET' });
      if (!resp.ok) throw new Error(`Token endpoint returned HTTP ${resp.status}`);
      const body = await resp.json();
      if (!body.token) throw new Error('Token endpoint did not return a "token".');
      return { token: body.token };
    }
    // A JWT-looking value is a ready-to-use token.
    if (value.split('.').length === 3) return { token: value };
    // Otherwise treat it as a secret and exchange it for a token.
    const resp = await fetch(
      'https://directline.botframework.com/v3/directline/tokens/generate',
      { method: 'POST', headers: { Authorization: `Bearer ${value}` } }
    );
    if (!resp.ok) throw new Error(`Token generation failed (HTTP ${resp.status})`);
    const body = await resp.json();
    return { token: body.token };
  }

  // secret / token pasted directly
  const value = secretInput.value.trim();
  if (!value) throw new Error('Enter a Direct Line secret or token.');
  // A JWT-looking value is treated as a ready-to-use token.
  if (value.split('.').length === 3) {
    return { token: value };
  }
  // Otherwise treat as a secret and exchange it for a token.
  const resp = await fetch(
    'https://directline.botframework.com/v3/directline/tokens/generate',
    { method: 'POST', headers: { Authorization: `Bearer ${value}` } }
  );
  if (!resp.ok) throw new Error(`Token generation failed (HTTP ${resp.status})`);
  const body = await resp.json();
  return { token: body.token };
}

// ---------------------------------------------------------------------------
// SDK (Direct-to-Engine) mode
//
// This path authenticates the signed-in user with Entra ID (MSAL) and talks to
// standard published Copilot Studio agents over the Direct Engine protocol.
// GHCP harness experiments use the separate authenticated /3p route.
// ---------------------------------------------------------------------------
function readSdkConfigRaw() {
  return {
    clientId: sdkClientId.value.trim(),
    tenantId: sdkTenantId.value.trim(),
    environmentId: sdkEnvironmentId.value.trim(),
    schemaName: sdkSchemaName.value.trim(),
    cloud: sdkCloud || 'Prod'
  };
}

// The redirect sign-in reloads the page, which would wipe the manually-typed
// fields. Persist them so the returning redirect can be processed and resumed.
const SDK_FIELDS_KEY = 'sdkFields';

function saveSdkConfig() {
  try {
    sessionStorage.setItem(
      SDK_FIELDS_KEY,
      JSON.stringify({
        clientId: sdkClientId.value.trim(),
        tenantId: sdkTenantId.value.trim(),
        environmentId: sdkEnvironmentId.value.trim(),
        schemaName: sdkSchemaName.value.trim()
      })
    );
  } catch {
    /* storage unavailable - ignore */
  }
}

function restoreSdkConfig() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SDK_FIELDS_KEY) || '{}');
    if (saved.clientId && !sdkClientId.value) sdkClientId.value = saved.clientId;
    if (saved.tenantId && !sdkTenantId.value) sdkTenantId.value = saved.tenantId;
    if (saved.environmentId && !sdkEnvironmentId.value) {
      sdkEnvironmentId.value = saved.environmentId;
    }
    if (saved.schemaName && !sdkSchemaName.value) sdkSchemaName.value = saved.schemaName;
  } catch {
    /* ignore */
  }
}

// Keep persisted values in sync as the user edits the SDK fields.
[sdkClientId, sdkTenantId, sdkEnvironmentId, sdkSchemaName].forEach((input) => {
  input.addEventListener('change', saveSdkConfig);
});

// Non-throwing variant used on page load to process a returning redirect.
function readSdkConfigSafe() {
  if (!window.CopilotStudioSDK || !window.CopilotStudioSDK.ready || !window.msal) {
    return null;
  }
  const cfg = readSdkConfigRaw();
  if (!cfg.clientId || !cfg.tenantId) return null;
  return cfg;
}

function readSdkConfig() {
  const cfg = readSdkConfigRaw();
  if (!window.CopilotStudioSDK || !window.CopilotStudioSDK.ready) {
    throw new Error('Copilot Studio SDK is still loading. Wait a moment and retry.');
  }
  if (!window.msal) {
    throw new Error('MSAL did not load. Check your network/CDN access and reload.');
  }
  if (!cfg.clientId) throw new Error('Enter the Entra application (client) ID.');
  if (!cfg.tenantId) throw new Error('Enter the directory (tenant) ID.');
  if (!cfg.environmentId) throw new Error('Enter the Copilot Studio Environment ID.');
  if (!cfg.schemaName) throw new Error('Enter the agent schema name.');
  return cfg;
}

function buildSdkSettings(cfg) {
  const { ConnectionSettings } = window.CopilotStudioSDK;
  return new ConnectionSettings({
    directConnectUrl: cfg.directConnectUrl || undefined,
    environmentId: cfg.environmentId,
    schemaName: cfg.schemaName,
    cloud: cfg.cloud,
    copilotAgentType: cfg.copilotAgentType || 'Published',
    useExperimentalEndpoint: Boolean(cfg.useExperimentalEndpoint)
  });
}

// ---------------------------------------------------------------------------
// Published-bot Direct-to-Engine isolated diagnostic
//
// A second config for comparing environment/schema routing, Direct Connect URLs,
// and the experimental island redirect without disturbing SDK-mode defaults.
// This is not the GHCP harness /3p controller.
// ---------------------------------------------------------------------------
const NEW_AGENT_FIELDS_KEY = 'newAgentFields';

function readNewAgentConfigRaw() {
  return {
    clientId: (newClientId && newClientId.value.trim()) || '',
    tenantId: (newTenantId && newTenantId.value.trim()) || '',
    environmentId: (newEnvironmentId && newEnvironmentId.value.trim()) || '',
    schemaName: (newSchemaName && newSchemaName.value.trim()) || '',
    directConnectUrl: (newDirectConnectUrl && newDirectConnectUrl.value.trim()) || '',
    cloud: sdkCloud || 'Prod',
    copilotAgentType: (newAgentType && newAgentType.value) || 'Published',
    useExperimentalEndpoint: Boolean(newExperimental && newExperimental.checked)
  };
}

function readNewAgentConfig() {
  const cfg = readNewAgentConfigRaw();
  // Experimental island gateway and a manual Direct connect URL are mutually
  // exclusive: the SDK only follows the server's x-ms-d2e-experimental redirect
  // when directConnectUrl is empty. When experimental is on, drop the URL so the
  // generative island endpoint actually engages.
  if (cfg.useExperimentalEndpoint) {
    cfg.directConnectUrl = '';
  }
  if (!window.CopilotStudioSDK || !window.CopilotStudioSDK.ready) {
    throw new Error('Copilot Studio SDK is still loading. Wait a moment and retry.');
  }
  if (!window.msal) {
    throw new Error('MSAL did not load. Check your network/CDN access and reload.');
  }
  if (!cfg.clientId) throw new Error('Enter the Entra application (client) ID.');
  if (!cfg.tenantId) throw new Error('Enter the directory (tenant) ID.');
  if (!cfg.directConnectUrl) {
    if (!cfg.environmentId) {
      throw new Error('Enter the Copilot Studio Environment ID (or a Direct connect URL).');
    }
    if (!cfg.schemaName) {
      throw new Error('Enter the agent schema name (or a Direct connect URL).');
    }
  }
  return cfg;
}

function readNewAgentConfigSafe() {
  if (!window.CopilotStudioSDK || !window.CopilotStudioSDK.ready || !window.msal) {
    return null;
  }
  const cfg = readNewAgentConfigRaw();
  if (!cfg.clientId || !cfg.tenantId) return null;
  return cfg;
}

function saveNewAgentConfig() {
  try {
    sessionStorage.setItem(NEW_AGENT_FIELDS_KEY, JSON.stringify(readNewAgentConfigRaw()));
  } catch {
    /* storage unavailable - ignore */
  }
}

function restoreNewAgentConfig() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(NEW_AGENT_FIELDS_KEY) || '{}');
    if (saved.clientId && newClientId && !newClientId.value) newClientId.value = saved.clientId;
    if (saved.tenantId && newTenantId && !newTenantId.value) newTenantId.value = saved.tenantId;
    if (saved.environmentId && newEnvironmentId && !newEnvironmentId.value) {
      newEnvironmentId.value = saved.environmentId;
    }
    if (saved.schemaName && newSchemaName && !newSchemaName.value) {
      newSchemaName.value = saved.schemaName;
    }
    // NOTE: directConnectUrl and the experimental checkbox are intentionally NOT
    // restored. Experimental island endpoint defaults ON (see index.html) and is
    // mutually exclusive with a manual Direct connect URL, so we never re-fill a
    // stale URL nor override the default-checked box.
    if (saved.copilotAgentType && newAgentType) newAgentType.value = saved.copilotAgentType;
  } catch {
    /* ignore */
  }
}

[newClientId, newTenantId, newEnvironmentId, newSchemaName, newDirectConnectUrl, newAgentType, newExperimental]
  .filter(Boolean)
  .forEach((input) => input.addEventListener('change', saveNewAgentConfig));

let msalInstance = null;
async function getMsalInstance(cfg) {
  // Re-create if the client/tenant changed since last time.
  if (
    msalInstance &&
    msalInstance.__clientId === cfg.clientId &&
    msalInstance.__tenantId === cfg.tenantId
  ) {
    return msalInstance;
  }
  const instance = new window.msal.PublicClientApplication({
    auth: {
      clientId: cfg.clientId,
      authority: `https://login.microsoftonline.com/${cfg.tenantId}`,
      redirectUri: window.location.origin
    },
    cache: { cacheLocation: 'localStorage' }
  });
  await instance.initialize();
  instance.__clientId = cfg.clientId;
  instance.__tenantId = cfg.tenantId;
  msalInstance = instance;
  return instance;
}

const SDK_RESUME_KEY = 'sdkAutoConnect';

/**
 * Acquires a delegated Power Platform token.
 *
 * Uses the **redirect** flow for the interactive step (not a popup): popups are
 * unreliable here because the async work between the click and the popup call
 * trips browser popup blockers, leaving the UI stuck on "Signing in…". Redirect
 * navigates the whole tab to Entra and back, then we auto-resume via
 * processSdkRedirect() on load.
 */
async function acquireSdkToken(cfg, mode = 'sdk') {
  const { CopilotStudioClient } = window.CopilotStudioSDK;
  const settings = buildSdkSettings(cfg);
  const scope = CopilotStudioClient.scopeFromSettings(settings);
  const pca = await getMsalInstance(cfg);
  const request = { scopes: [scope], redirectUri: window.location.origin };

  const accounts = await pca.getAllAccounts();
  if (accounts.length > 0) {
    try {
      const silent = await pca.acquireTokenSilent({ ...request, account: accounts[0] });
      return { token: silent.accessToken, settings };
    } catch (e) {
      if (!(e instanceof window.msal.InteractionRequiredAuthError)) throw e;
    }
  }

  // Interactive sign-in required: remember intent, then redirect away.
  setHint('Redirecting to Microsoft sign-in…');
  if (mode === 'newAgent') saveNewAgentConfig();
  else if (mode === 'newAgentDTE') saveNewAgentDTEConfig();
  else if (mode === 'ghcp3p') saveGhcp3pConfig();
  else if (mode === 'ghcpAgentFramework') saveGhcpAgentFrameworkConfig();
  else saveSdkConfig();
  sessionStorage.setItem(SDK_RESUME_KEY, mode);
  await pca.acquireTokenRedirect(request);
  // Navigation has started; keep the caller pending until the page unloads.
  return new Promise(() => {});
}

/**
 * Silent-only token acquisition for "Test connection" — never redirects.
 */
async function acquireSdkTokenSilent(cfg) {
  const { CopilotStudioClient } = window.CopilotStudioSDK;
  const settings = buildSdkSettings(cfg);
  const scope = CopilotStudioClient.scopeFromSettings(settings);
  const pca = await getMsalInstance(cfg);
  const request = { scopes: [scope], redirectUri: window.location.origin };
  const accounts = await pca.getAllAccounts();
  if (accounts.length === 0) {
    throw new Error('Not signed in yet. Click Connect to sign in first.');
  }
  const silent = await pca.acquireTokenSilent({ ...request, account: accounts[0] });
  return { token: silent.accessToken, settings };
}

/**
 * On page load, completes any returning Entra redirect and resumes Connect.
 */
async function processSdkRedirect() {
  const resuming = sessionStorage.getItem(SDK_RESUME_KEY);
  const resumeMode =
    resuming === 'newAgent'
      ? 'newAgent'
      : resuming === 'newAgentDTE'
        ? 'newAgentDTE'
        : resuming === 'ghcp3p'
          ? 'ghcp3p'
          : resuming === 'ghcpAgentFramework'
            ? 'ghcpAgentFramework'
            : 'sdk';
  const cfg =
    resumeMode === 'newAgent'    ? readNewAgentConfigSafe()    :
    resumeMode === 'newAgentDTE' ? readNewAgentDTEConfigSafe() :
    resumeMode === 'ghcp3p'      ? readGhcp3pConfigSafe()      :
    resumeMode === 'ghcpAgentFramework' ? readGhcpAgentFrameworkConfigSafe() :
                                   readSdkConfigSafe();
  if (!cfg) return;
  const pca = await getMsalInstance(cfg);
  try {
    const result = await pca.handleRedirectPromise();
    if (result || resuming) {
      sessionStorage.removeItem(SDK_RESUME_KEY);
      modeSel.value = resumeMode;
      refreshModeUI();
      // Account is now cached; connect() will acquire the token silently.
      connect();
    }
  } catch (e) {
    sessionStorage.removeItem(SDK_RESUME_KEY);
    setStatus('error', 'Sign-in failed');
    setHint('✗ Sign-in failed: {message}', 'err', { message: e.message });
  }
}


// ---------------------------------------------------------------------------
// Livestreaming metadata detection
// Mirrors getActivityLivestreamingMetadata.ts (the doc's source of truth):
// streaming info can live in channelData OR entities[type="streaminfo"], with
// channelData taking precedence. We also re-validate activity.type +
// streamSequence so malformed chunks are flagged instead of trusted.
// ---------------------------------------------------------------------------
function getStreamInfo(activity) {
  const raw =
    (activity.channelData &&
      activity.channelData.streamType &&
      activity.channelData) ||
    (activity.entities || []).find(
      (e) => e && e.type === 'streaminfo' && e.streamType
    );
  if (!raw) return null;

  const { streamType, streamId, streamSequence } = raw;
  const idValid = typeof activity.id === 'string' && activity.id.length > 0;
  const seqValid = Number.isInteger(streamSequence) && streamSequence >= 1;

  // Validation rules from livestreamingActivitySchema:
  //  - streaming/informative: type must be "typing", streamSequence >= 1
  //  - final: type must be "message" or "typing", streamId required
  const valid =
    ((streamType === 'streaming' || streamType === 'informative') &&
      idValid &&
      activity.type === 'typing' &&
      seqValid) ||
    (streamType === 'final' &&
      idValid &&
      (activity.type === 'message' ||
        (activity.type === 'typing' && !activity.text)) &&
      typeof streamId === 'string' &&
      streamId.length > 0);

  return {
    streamType,
    streamId,
    streamSequence,
    sessionId: streamId || activity.id,
    valid
  };
}

function isUserActivity(activity) {
  if (activity?.from?.role === 'user') return true;
  if (activity?.from?.role === 'bot') return false;
  return Boolean(
    activity?.type === 'message' &&
    activity?.channelData?.clientActivityID &&
    !activity?.replyToId
  );
}

function observeLivestreamActivity(activity, info) {
  if (!info?.valid || !info.sessionId) return { stale: false };

  const sessionId = info.sessionId;
  const existing = streamObservations.get(sessionId);

  if (info.streamType === 'final') {
    if (!existing) return { stale: false, invalidLifecycle: true };
    if (existing.concluded) return { stale: true };
    existing.concluded = true;
    streamObservations.set(sessionId, existing);
    return { stale: false };
  }

  const observation = existing || {
    lastSequence: 0,
    lastAnswerText: null,
    answerSnapshots: 0,
    concluded: false
  };

  if (observation.concluded || info.streamSequence <= observation.lastSequence) {
    return { stale: true };
  }

  observation.lastSequence = info.streamSequence;
  seenStreamIds.add(sessionId);

  if (info.streamType === 'informative') {
    informativeCount += 1;
  } else {
    chunkCount += 1;
    const answerText = activity.text || '';
    if (answerText && answerText !== observation.lastAnswerText) {
      observation.answerSnapshots += 1;
      observation.lastAnswerText = answerText;
      if (observation.answerSnapshots >= 2) progressiveStreamIds.add(sessionId);
    }
  }

  streamObservations.set(sessionId, observation);
  return { stale: false };
}

function countFinalActivity(activity) {
  const key = `${activity.replyToId || activity.id || ''}\u0000${activity.text || ''}`;
  if (seenFinalKeys.has(key)) return;
  seenFinalKeys.add(key);
  finalCount += 1;
}

// ---------------------------------------------------------------------------
// Inspector
// ---------------------------------------------------------------------------
function logActivity(activity) {
  if (!autoInspect.checked) return;

  const info = getStreamInfo(activity);
  const observation = observeLivestreamActivity(activity, info);
  // Surface streaming-related activities plus plain bot typing/message events so
  // validation can distinguish "typing only" from true livestream metadata.
  const isBotMessage = activity.type === 'message' && !isUserActivity(activity);
  const isBotTyping = activity.type === 'typing' && !isUserActivity(activity);
  if (!info && !isBotMessage && !isBotTyping) return;

  const streamType = info?.streamType || activity.type;
  const malformed = Boolean(info) && (
    info.valid === false ||
    observation.stale ||
    observation.invalidLifecycle
  );
  const cssClass = malformed
    ? 'malformed'
    : streamType === 'informative'
      ? 'informative'
      : streamType === 'streaming'
        ? 'streaming'
        : streamType === 'final'
          ? 'final'
          : streamType === 'typing'
            ? 'typing'
            : 'other';

  if (info?.valid && !observation.stale && streamType === 'final') countFinalActivity(activity);
  else if (isBotMessage && !info) countFinalActivity(activity);
  mStreams.textContent = String(seenStreamIds.size);
  mChunks.textContent = String(chunkCount);
  mFinal.textContent = String(finalCount);
  updateDiagnosis();

  const text = (activity.text || '').slice(0, 280);
  const seq = info?.streamSequence != null ? `#${info.streamSequence}` : '';
  const sid = (info?.sessionId || activity.id || '').toString().slice(0, 18);

  // Raw activity JSON — the fastest way to confirm with support whether
  // streaming metadata (channelData / entities[streaminfo]) is actually emitted.
  let rawJson = '';
  try {
    rawJson = JSON.stringify(activity, null, 2);
  } catch {
    rawJson = String(activity);
  }

  const li = document.createElement('li');
  li.className = `log-item ${cssClass}`;
  li.innerHTML = `
    <div class="row">
      <span class="tag ${cssClass}">${escapeHtml(malformed ? `${streamType} ⚠` : streamType)}</span>
      <span class="seq">${escapeHtml(seq)} · ${escapeHtml(activity.type)}</span>
    </div>
    ${text ? `<div class="text">${escapeHtml(text)}</div>` : ''}
    <div class="meta">${escapeHtml(
      t('stream: {id} · len {length}{suffix}', {
        id: sid || '—',
        length: text.length,
        suffix: observation.stale
          ? t(' · stale or out of order')
          : malformed
            ? t(' · invalid per schema')
            : ''
      })
    )}</div>
    <details class="raw">
      <summary>${escapeHtml(t('Raw activity JSON'))}</summary>
      <pre>${escapeHtml(rawJson)}</pre>
    </details>
  `;
  logEl.appendChild(li);
  logEl.scrollTop = logEl.scrollHeight;
}

// ---------------------------------------------------------------------------
// One-glance diagnosis: classify what the agent is actually doing.
// ---------------------------------------------------------------------------
function updateDiagnosis() {
  if (!diagnosisEl) return;
  let state;
  let label;
  if (progressiveStreamIds.size > 0) {
    state = 'ok';
    label = t('Progressive answer ✓ — {chunks} streaming chunk(s) across {streams} livestream(s)', {
      chunks: chunkCount,
      streams: progressiveStreamIds.size
    });
  } else if (seenStreamIds.size > 0) {
    state = 'warn';
    label = t(
      'Livestream protocol observed — progressive answer text not proven ({informative} informative, {chunks} streaming)',
      { informative: informativeCount, chunks: chunkCount }
    );
  } else if (finalCount > 0) {
    state = 'warn';
    label = t('Final-only response — no livestream metadata emitted');
  } else {
    state = 'idle';
    label = t('Waiting for bot activity…');
  }
  diagnosisEl.dataset.state = state;
  diagnosisEl.textContent = label;
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

function resetInspector() {
  logEl.innerHTML = '';
  seenStreamIds.clear();
  progressiveStreamIds.clear();
  streamObservations.clear();
  seenFinalKeys.clear();
  chunkCount = 0;
  informativeCount = 0;
  finalCount = 0;
  mStreams.textContent = '0';
  mChunks.textContent = '0';
  mFinal.textContent = '0';
  updateDiagnosis();
}
clearLogBtn.addEventListener('click', resetInspector);

// ---------------------------------------------------------------------------
// Agent "thinking" transition
// While the agent emits informative livestream chunks (it is reasoning before
// the answer), we show a "Plan"-styled card whose steps ARE those dynamic
// informative chunks. The card is REMOVED entirely the instant the streamed
// answer starts to grow.
// ---------------------------------------------------------------------------
function renderThinking() {
  if (!thinkingEl) return;
  if (!thinkingActive || !thinkingSteps.length) {
    thinkingEl.hidden = true;
    thinkingEl.innerHTML = '';
    return;
  }
  thinkingEl.hidden = false;
  thinkingEl.classList.remove('hide');
  const steps = thinkingSteps
    .map(
      (s) =>
        `<li class="plan-step ${s.status}"><span class="plan-dot"></span><span class="plan-label">${escapeHtml(
          s.text
        )}</span></li>`
    )
    .join('');
  thinkingEl.innerHTML = `
    <div class="plan-head">
      <span class="plan-title">${escapeHtml(t('Thought process'))}</span>
    </div>
    <ol class="plan-steps">${steps}</ol>`;
}

// Push a dynamic informative step onto the card (deduping consecutive repeats).
function pushThinkingStep(text) {
  const clean = (text || '').trim();
  if (!clean) return;
  thinkingActive = true;
  // A fresh reasoning step means we're no longer finishing — re-arm so the next
  // streaming chunk can fade the card out again (handles informative chunks that
  // arrive interleaved with, or after, streaming text).
  thinkingFinishing = false;
  // The previously-active step is now complete.
  thinkingSteps.forEach((s) => {
    if (s.status === 'active') s.status = 'done';
  });
  const last = thinkingSteps[thinkingSteps.length - 1];
  if (!last || last.text !== clean) {
    thinkingSteps.push({ text: clean, status: 'active' });
  }
  renderThinking();
}

// Hide and clear the plan card immediately (used when the answer starts to
// stream, on a new user turn, and on disconnect).
function resetThinking() {
  clearTimeout(thinkingHideTimer);
  thinkingHideTimer = null;
  thinkingActive = false;
  thinkingFinishing = false;
  thinkingSteps = [];
  if (thinkingEl) thinkingEl.classList.remove('hide');
  renderThinking();
}

// The streamed answer is starting — make the plan card disappear.
function finishThinkingSoon() {
  // Run exactly once per reasoning burst. Without this guard every streaming
  // chunk re-entered here, and renderThinking() below strips the `hide` class
  // (snapping the card back to full opacity) before re-adding it and resetting
  // the 350ms removal timer — so with chunks arriving faster than 350ms the
  // card never finished fading and stayed over the canvas until the stream
  // ended.
  if (!thinkingActive || thinkingFinishing) return;
  thinkingFinishing = true;
  thinkingSteps.forEach((s) => (s.status = 'done'));
  renderThinking();
  if (thinkingEl) thinkingEl.classList.add('hide'); // quick fade
  clearTimeout(thinkingHideTimer);
  thinkingHideTimer = setTimeout(() => resetThinking(), 350);
}

// Returns true when the activity is an informative "thinking" chunk that drives
// the plan card and should not be forwarded to Web Chat as a raw chunk.
function handleThinking(activity, info) {
  if (info.streamType === 'informative') {
    // The agent is reasoning — add this dynamic informative chunk to the card.
    pushThinkingStep(activity.text);
    return true; // withhold from Web Chat
  }

  // First real text (streaming) or the final message — make the plan disappear.
  if (
    (info.streamType === 'streaming' || info.streamType === 'final') &&
    thinkingActive
  ) {
    finishThinkingSoon();
  }
  return false;
}

// ---------------------------------------------------------------------------
// Connect / disconnect
// ---------------------------------------------------------------------------

// Wrap a Copilot Studio SDK connection so the inspector can observe every
// activity WITHOUT opening a competing subscription. The SDK's activity$ is a
// cold observable that overwrites its single internal subscriber on each
// subscribe(), so we must subscribe to it EXACTLY ONCE and multicast the result
// to every downstream subscriber. Web Chat subscribes to `activity$` many times
// (this build does so ~5×); subscribing upstream per downstream subscribe would
// repeatedly overwrite the cold observable's single subscriber (starving all
// but the last) and run the inspector/thinking logic once per subscription.
function wrapWithInspectorTap(conn) {
  const observers = new Set();
  let upstreamSub = null;

  const broadcast = (activity) => {
    for (const observer of observers) {
      try {
        observer.next && observer.next(activity);
      } catch (e) {
        console.warn('webchat observer error', e);
      }
    }
  };

  const startUpstream = () => {
    upstreamSub = conn.activity$.subscribe({
      next: (activity) => {
        if (conn.conversationId && convoIdLabel) {
          convoIdLabel.textContent = formatConversation(conn.conversationId);
        }
        try {
          logActivity(activity);
        } catch (e) {
          console.warn('inspector error', e);
        }
        // A new user turn clears any leftover thinking stack.
        if (activity.type === 'message' && activity.from?.role === 'user') {
          resetThinking();
        }
        // Informative chunks become the "thinking" overlay and are withheld
        // from Web Chat; streaming/final chunks close the overlay and flow on
        // so the canvas paints the progressively growing livestream bubble.
        const info = getStreamInfo(activity);
        if (info && info.valid && handleThinking(activity, info)) {
          return;
        }
        broadcast(normalizeStreamingForWebChat(activity));
      },
      error: (e) => {
        for (const observer of observers) observer.error && observer.error(e);
      },
      complete: () => {
        for (const observer of observers) observer.complete && observer.complete();
      }
    });
  };

  const tappedActivity$ = {
    subscribe(observerOrNext, error, complete) {
      const observer =
        typeof observerOrNext === 'function'
          ? { next: observerOrNext, error, complete }
          : observerOrNext || {};
      observers.add(observer);
      if (observers.size === 1) startUpstream();
      return {
        unsubscribe() {
          observers.delete(observer);
          if (observers.size === 0 && upstreamSub) {
            try {
              upstreamSub.unsubscribe();
            } catch {
              /* noop */
            }
            upstreamSub = null;
          }
        }
      };
    }
  };
  // Delegate everything else (connectionStatus$, conversationId, postActivity,
  // end) to the real connection; override only activity$.
  const wrapped = Object.create(conn);
  wrapped.activity$ = tappedActivity$;
  wrapped.__inspectorTapped = true;
  return wrapped;
}

// Web Chat only renders the progressive livestream bubble when it can attribute
// every interim chunk to the bot. The SDK's interim `typing` chunks arrive with
// a `from` that has no `role`, so Web Chat treats them as a bare typing
// indicator and only paints the final message. We stamp `from.role = 'bot'` on
// streaming/informative chunks (without mutating the original the inspector
// logged) so Web Chat groups them by streamId into one growing message.
function normalizeStreamingForWebChat(activity) {
  const info = getStreamInfo(activity);
  if (!info) return activity;
  const isUser = activity.from?.role === 'user';
  if (isUser) return activity;
  // Each interim chunk arrives with a UNIQUE id (streamId + "-" + sequence),
  // so Web Chat — which dedupes by activity id — renders every chunk as its own
  // bubble (152 bubbles for a long answer). Forcing the id to the stable
  // streamId makes Web Chat update ONE bubble in place, so the user sees a
  // single response that streams progressively. The final `message` shares the
  // same streamId and therefore replaces the growing bubble seamlessly.
  const next = { ...activity };
  if (info.streamId) next.id = info.streamId;
  if (activity.from?.role !== 'bot') {
    next.from = { ...activity.from, role: 'bot' };
  }
  return next;
}

// ---------------------------------------------------------------------------
// Typewriter effect (Direct Line modes)
//
// Over the Direct Line channel, Copilot Studio sends the answer as a SINGLE
// final `message` activity — so there is no native progressive reveal. We
// simulate one by re-emitting that message as a series of same-id frames whose
// text grows a few characters at a time. Web Chat updates the SAME bubble in
// place (it dedupes by activity id), producing a typing animation. The final
// frame is the original activity (full text + any attachments / suggested
// actions), so cards never flash early.
//
// SDK (Direct-to-Engine) mode is left untouched: it already streams generative
// chunks natively.
// ---------------------------------------------------------------------------
const TYPEWRITER = {
  tickMs: 16, // delay between frames
  minStep: 2, // characters revealed per frame (floor)
  maxDurationMs: 3500 // long answers still finish within this budget
};

let typewriterTimers = [];
// Activity ids we've already started/finished animating. The Direct Line
// transport often delivers the SAME final message twice (WebSocket + resend);
// without this, the duplicate would launch a SECOND concurrent animation on the
// same bubble, and the two timer chains would fight — one revealing full text
// while the other rewinds it to a partial slice, which looks frozen/stuck.
const typedActivityIds = new Set();

function clearTypewriter() {
  typewriterTimers.forEach((t) => clearTimeout(t));
  typewriterTimers = [];
  typedActivityIds.clear();
}

function shouldTypewrite(activity) {
  if (!typewriterToggle || !typewriterToggle.checked) return false;
  if (activity.type !== 'message') return false;
  if (isUserActivity(activity)) return false;
  if (!activity.text) return false;
  // Real generative streaming chunks animate themselves — don't double up.
  if (getStreamInfo(activity)) return false;
  return true;
}

// Emits `activity` as progressive same-id frames via `emit`, then the original.
function emitTypewriter(activity, emit) {
  // Direct Line may deliver the same final message more than once. Animate each
  // distinct activity id exactly once; silently drop later duplicates so they
  // can't restart the reveal and rewind an already-growing/complete bubble.
  if (activity.id) {
    if (typedActivityIds.has(activity.id)) return;
    typedActivityIds.add(activity.id);
  }

  const fullText = activity.text || '';
  const total = fullText.length;

  // Pick a per-frame step so the whole reveal fits inside maxDurationMs.
  const maxTicks = Math.max(1, Math.floor(TYPEWRITER.maxDurationMs / TYPEWRITER.tickMs));
  const step = Math.max(TYPEWRITER.minStep, Math.ceil(total / maxTicks));

  // While animating, withhold attachments / suggested actions so cards and
  // quick replies appear only once the text is fully revealed.
  const base = { ...activity };
  delete base.attachments;
  delete base.suggestedActions;
  delete base.attachmentLayout;

  let shown = 0;
  const tick = () => {
    shown = Math.min(total, shown + step);
    if (shown >= total) {
      // Final frame: the untouched original (full text + attachments).
      emit(activity);
      return;
    }
    emit({ ...base, text: fullText.slice(0, shown) });
    typewriterTimers.push(setTimeout(tick, TYPEWRITER.tickMs));
  };
  tick();
}

// Wraps a Direct Line connection so bot final messages stream in with a
// typewriter effect. Also taps each (original) activity for the inspector so we
// don't open a second activity$ subscription.
//
// IMPORTANT: Web Chat subscribes to `activity$` MANY times (this build does so
// ~5×). The wrapper must therefore subscribe to the real connection EXACTLY
// ONCE and MULTICAST the (typewriter-transformed) stream to every downstream
// subscriber. The previous design re-subscribed upstream per `subscribe()` and
// ran the typewriter + its module-global de-dup (`typedActivityIds`) once per
// subscription, so the FIRST subscription consumed the message id and every
// later subscription — including the one Web Chat renders from — was starved
// and emitted nothing, leaving bot replies visible in the inspector but absent
// from the canvas. Subscribing upstream once and broadcasting fixes that and
// also logs each activity to the inspector exactly once.
function wrapWithTypewriter(conn) {
  const observers = new Set();
  let upstreamSub = null;

  const broadcast = (activity) => {
    for (const observer of observers) {
      try {
        observer.next && observer.next(activity);
      } catch (e) {
        console.warn('webchat observer error', e);
      }
    }
  };

  const startUpstream = () => {
    upstreamSub = conn.activity$.subscribe({
      next: (activity) => {
        if (conn.conversationId && convoIdLabel) {
          convoIdLabel.textContent = formatConversation(conn.conversationId);
        }
        try {
          logActivity(activity);
        } catch (e) {
          console.warn('inspector error', e);
        }
        if (shouldTypewrite(activity)) {
          emitTypewriter(activity, broadcast);
        } else {
          broadcast(activity);
        }
      },
      error: (e) => {
        for (const observer of observers) observer.error && observer.error(e);
      },
      complete: () => {
        for (const observer of observers) observer.complete && observer.complete();
      }
    });
  };

  const tappedActivity$ = {
    subscribe(observerOrNext, error, complete) {
      const observer =
        typeof observerOrNext === 'function'
          ? { next: observerOrNext, error, complete }
          : observerOrNext || {};
      observers.add(observer);
      if (observers.size === 1) startUpstream();
      return {
        unsubscribe() {
          observers.delete(observer);
          if (observers.size === 0 && upstreamSub) {
            try {
              upstreamSub.unsubscribe();
            } catch {
              /* noop */
            }
            upstreamSub = null;
          }
        }
      };
    }
  };

  const wrapped = Object.create(conn);
  wrapped.activity$ = tappedActivity$;
  wrapped.__inspectorTapped = true;
  return wrapped;
}

// Direct Line live-streaming adapter (experimental "dlStream" mode).
//
// When streaming is enabled on a Copilot Studio agent, interim answer chunks
// arrive over Direct Line as `typing` activities carrying livestreaming
// metadata — channelData.streamType="streaming", a stable `streamId`, and an
// incrementing `streamSequence` — whose `text` is the FULL answer-so-far
// snapshot. A `final` (or plain) `message` then delivers the completed text,
// often TWICE: once tagged streamType:"final" and once as an untagged duplicate
// message (the same double-send the peer's C# DirectLine client had to dedup).
//
// Web Chat re-renders an activity in place when a later activity reuses its
// `id`, so we coalesce every chunk of one stream onto a single synthetic
// `message` keyed on `streamId` → one bubble that grows in realtime. We also
// drop the trailing duplicate final message so the answer doesn't flash twice.
// Like the other wrappers, we subscribe upstream exactly once and multicast to
// every Web Chat subscriber.
function wrapWithDirectLineStreaming(conn) {
  const observers = new Set();
  let upstreamSub = null;
  const streams = new Map();
  const recentFinals = [];

  const broadcast = (activity) => {
    for (const observer of observers) {
      try {
        observer.next && observer.next(activity);
      } catch (e) {
        console.warn('webchat observer error', e);
      }
    }
  };

  const handle = (activity) => {
    const info = getStreamInfo(activity);

    // Interim streaming / informative chunk → grow ONE bubble keyed on streamId.
    if (
      info &&
      info.valid &&
      (info.streamType === 'streaming' || info.streamType === 'informative')
    ) {
      const id = info.sessionId;
      const stream = streams.get(id) || { lastSequence: 0, text: '', concluded: false };
      if (stream.concluded || info.streamSequence <= stream.lastSequence) return;
      stream.lastSequence = info.streamSequence;
      const text = activity.text || '';
      broadcast({
        ...activity,
        type: 'message',
        id,
        text,
        from: { ...(activity.from || {}), role: 'bot' }
      });
      if (info.streamType === 'streaming') stream.text = text;
      streams.set(id, stream);
      return;
    }

    // Final streamed message → replace the growing bubble with the full text.
    if (info && info.valid && info.streamType === 'final') {
      const id = info.sessionId;
      const stream = streams.get(id) || { lastSequence: 0, text: '', concluded: false };
      if (stream.concluded) return;
      const text = activity.text || stream.text || '';
      broadcast({
        ...activity,
        type: 'message',
        id,
        text,
        from: { ...(activity.from || {}), role: 'bot' }
      });
      stream.text = text;
      stream.concluded = true;
      streams.set(id, stream);
      recentFinals.push({ text, replyToId: activity.replyToId, at: Date.now() });
      return;
    }

    // Plain bot message with no stream metadata: if it duplicates a stream we
    // just finished, drop it; otherwise pass it through (ordinary reply).
    const isBotMessage = activity.type === 'message' && !isUserActivity(activity);
    if (isBotMessage && !info && activity.text) {
      const cutoff = Date.now() - 30000;
      while (recentFinals.length && recentFinals[0].at < cutoff) recentFinals.shift();
      if (
        activity.replyToId &&
        recentFinals.some(
          (final) =>
            final.replyToId === activity.replyToId &&
            final.text === activity.text
        )
      ) return;
    }

    broadcast(activity);
  };

  const startUpstream = () => {
    upstreamSub = conn.activity$.subscribe({
      next: (activity) => {
        if (conn.conversationId && convoIdLabel) {
          convoIdLabel.textContent = formatConversation(conn.conversationId);
        }
        try {
          logActivity(activity);
        } catch (e) {
          console.warn('inspector error', e);
        }
        try {
          handle(activity);
        } catch (e) {
          console.warn('stream adapter error', e);
          broadcast(activity);
        }
      },
      error: (e) => {
        for (const observer of observers) observer.error && observer.error(e);
      },
      complete: () => {
        for (const observer of observers) observer.complete && observer.complete();
      }
    });
  };

  const tappedActivity$ = {
    subscribe(observerOrNext, error, complete) {
      const observer =
        typeof observerOrNext === 'function'
          ? { next: observerOrNext, error, complete }
          : observerOrNext || {};
      observers.add(observer);
      if (observers.size === 1) startUpstream();
      return {
        unsubscribe() {
          observers.delete(observer);
          if (observers.size === 0 && upstreamSub) {
            try {
              upstreamSub.unsubscribe();
            } catch {
              /* noop */
            }
            upstreamSub = null;
          }
        }
      };
    }
  };

  const wrapped = Object.create(conn);
  wrapped.activity$ = tappedActivity$;
  wrapped.__inspectorTapped = true;
  // Copilot Studio streams a generative answer only when the triggering user
  // message carries deliveryMode:"stream" (the official test canvas's Web Chat
  // sets this on every outgoing message). Plain Web Chat does not, so inject it
  // here for outgoing user messages.
  wrapped.postActivity = (activity) => {
    let outgoing = activity;
    if (activity && activity.type === 'message') {
      outgoing = { ...activity, deliveryMode: 'stream' };
    }
    return conn.postActivity(outgoing);
  };
  return wrapped;
}

// Web Chat keeps the transcript pinned to the bottom when a *new* activity
// arrives, but a streaming answer updates the SAME activity in place — so the
// bubble grows without the view following it. We watch the scrollable
// transcript for DOM mutations and, as long as the user is already near the
// bottom (i.e. hasn't scrolled up to read history), snap back to the bottom so
// the growing content stays visible in realtime.
function attachAutoScroll() {
  if (autoScrollObserver) {
    autoScrollObserver.disconnect();
    autoScrollObserver = null;
  }
  const host = el('webchat');
  if (!host) return;

  const findScrollable = () =>
    host.querySelector('.webchat__basic-transcript__scrollable') ||
    host.querySelector('[class*="transcript"][class*="scrollable"]');

  const nearBottom = (node) =>
    node.scrollHeight - node.scrollTop - node.clientHeight < 80;

  const observer = new MutationObserver(() => {
    const scrollable = findScrollable();
    if (!scrollable) return;
    if (nearBottom(scrollable)) {
      scrollable.scrollTop = scrollable.scrollHeight;
    }
  });

  observer.observe(host, { childList: true, subtree: true, characterData: true });
  autoScrollObserver = observer;
}

function mergeProgressiveText(previousText, incomingText, textMode = 'delta') {
  const previous = String(previousText || '');
  const incoming = String(incomingText || '');
  if (!previous) return { text: incoming, shape: 'initial' };
  if (!incoming) return { text: previous, shape: 'empty' };

  if (textMode === 'cumulative') {
    if (incoming === previous) return { text: previous, shape: 'duplicate' };
    if (incoming.startsWith(previous)) return { text: incoming, shape: 'cumulative' };
    if (previous.startsWith(incoming)) return { text: previous, shape: 'stale' };
    return { text: incoming, shape: 'cumulative-replacement' };
  }
  return { text: previous + incoming, shape: 'delta' };
}

// ---------------------------------------------------------------------------
// Server-sidecar Direct-to-Engine adapter
//
// A minimal Direct Line-compatible connection that drives the Node sidecar
// (/api/dte/start + /api/dte/send) and feeds its NDJSON activity frames into
// Web Chat. The sidecar runs the identical Copilot Studio SDK server-side,
// where it is free to follow the x-ms-d2e-experimental redirect the browser
// cannot read (CORS) — so this path reaches the generative island runtime and
// streams progressive activities when the selected runtime emits them.
//
// Web Chat subscribes to `activity$` several times, so the subject MUST
// multicast. It also reads the latest `connectionStatus$` value on subscribe,
// so that one replays its current value. Streaming chunks are folded into one
// growing bubble by reusing normalizeStreamingForWebChat (stable id = streamId).
// ---------------------------------------------------------------------------
function createSidecarConnection({
  token,
  settings,
  startUrl = '/api/dte/start',
  sendUrl = '/api/dte/send',
  endUrl = '',
  serverManagedAuth = false,
  synthesizeAgentFrameworkFinal = false,
  serializeActivityDelivery = false
}) {
  const asObserver = (o, e, c) =>
    typeof o === 'function' ? { next: o, error: e, complete: c } : o || {};

  // connectionStatus$: replay the latest value to every new subscriber.
  const statusObservers = new Set();
  let status = 0; // Uninitialized
  const status$ = {
    subscribe(o, e, c) {
      const obs = asObserver(o, e, c);
      statusObservers.add(obs);
      try { obs.next && obs.next(status); } catch { /* noop */ }
      return { unsubscribe: () => statusObservers.delete(obs) };
    }
  };
  const setStatusValue = (v) => {
    status = v;
    for (const obs of statusObservers) {
      try { obs.next && obs.next(v); } catch { /* noop */ }
    }
  };

  // activity$: multicast, buffering activities until Web Chat has subscribed
  // (flush() is called right after renderWebChat) so the greeting is never lost.
  const activityObservers = new Set();
  const activityBuffer = [];
  const activityDeliveryQueue = [];
  let flushing = false;
  let activityDeliveryReady = !serializeActivityDelivery;
  let activityDeliveryTimer = null;
  const deliverActivity = (a) => {
    if (ended) return;
    for (const obs of activityObservers) {
      try { obs.next && obs.next(a); } catch { /* noop */ }
    }
  };
  const scheduleActivityDelivery = () => {
    if (
      activityDeliveryTimer ||
      ended ||
      !flushing ||
      !activityDeliveryReady ||
      !activityDeliveryQueue.length
    ) return;
    activityDeliveryTimer = setTimeout(() => {
      activityDeliveryTimer = null;
      if (ended) return;
      const activity = activityDeliveryQueue.shift();
      if (activity) deliverActivity(activity);
      scheduleActivityDelivery();
    }, 0);
  };
  const emitActivity = (a) => {
    if (ended) return;
    if (!flushing) { activityBuffer.push(a); return; }
    if (!serializeActivityDelivery) return deliverActivity(a);
    activityDeliveryQueue.push(a);
    scheduleActivityDelivery();
  };
  const activity$ = {
    subscribe(o, e, c) {
      const obs = asObserver(o, e, c);
      activityObservers.add(obs);
      return { unsubscribe: () => activityObservers.delete(obs) };
    }
  };

  let conversationId = '';
  let ended = false;
  let agentFrameworkTurn = 0;
  const activeControllers = new Set();
  const echoTimers = new Set();
  const agentFrameworkStreamText = new Map();

  const consolidateAgentFrameworkActivity = (activity, textMode = 'delta') => {
    const channelData = activity.channelData || {};
    const info = getStreamInfo(activity);
    const streamId = info?.sessionId;
    if (
      info?.streamType !== 'streaming' ||
      !streamId ||
      typeof activity.text !== 'string'
    ) {
      return {
        ...activity,
        channelData: { ...channelData, pocProvider: 'agent-framework-dotnet' }
      };
    }

    const fragment = activity.text;
    const merged = mergeProgressiveText(
      agentFrameworkStreamText.get(streamId)?.text,
      fragment,
      textMode
    );
    agentFrameworkStreamText.set(streamId, { text: merged.text, textMode });
    return {
      ...activity,
      text: merged.text,
      channelData: {
        ...channelData,
        pocProvider: 'agent-framework-dotnet',
        pocTextShape: merged.shape,
        pocFragmentLength: fragment.length
      }
    };
  };

  const toWebChat = (a) => {
    let act = normalizeStreamingForWebChat(a); // stable id=streamId + role:bot for chunks
    if (act.type === 'message' && act.from?.role !== 'user' && act.from?.role !== 'bot') {
      act = { ...act, from: { ...(act.from || {}), role: 'bot' } };
    }
    if (!act.id) act = { ...act, id: 'a-' + Math.random().toString(36).slice(2, 10) };
    // The sidecar never forwards the server-side activity that `replyToId`
    // points at (user echoes get a local `u-…` id, the typing frame is
    // `typing-1`). Web Chat's queueIncomingActivitySaga would otherwise wait
    // ~5s for that phantom parent, log a "Timed out while waiting for activity"
    // warning, and stall ordering. Drop the dangling reference.
    if (act.replyToId) { const { replyToId, ...rest } = act; act = rest; }
    return act;
  };

  async function streamTurn(url, body) {
    const agentFrameworkTurnId = body.text ? ++agentFrameworkTurn : agentFrameworkTurn;
    const controller = new AbortController();
    const touchedAgentFrameworkStreams = new Set();
    activeControllers.add(controller);
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      if (!resp.ok || !resp.body) {
        let msg = `HTTP ${resp.status}`;
        try {
          const errorBody = await resp.json();
          msg = errorBody.error || errorBody.detail || msg;
        } catch { /* noop */ }
        throw new Error(msg);
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let updateCount = 0;
      let sawDone = false;
      const finalizedAgentFrameworkStreams = new Set();
      const lastAgentFrameworkActivities = new Map();
      const handle = (line) => {
        if (!line.trim()) return;
        let frame;
        try { frame = JSON.parse(line); } catch { return; }
        if (frame.type === 'activity' && frame.activity) {
          let a = frame.provider === 'agent-framework-dotnet'
            ? consolidateAgentFrameworkActivity(frame.activity, frame.textMode || 'delta')
            : frame.activity;
          updateCount += 1;
          const info = getStreamInfo(a);
          if (frame.provider === 'agent-framework-dotnet') {
            const streamId = info?.sessionId;
            if (streamId) touchedAgentFrameworkStreams.add(streamId);
            if (info?.streamType === 'streaming' && streamId) {
              lastAgentFrameworkActivities.set(streamId, a);
            } else if (info?.streamType === 'final') {
              const accumulatedText = streamId
                ? agentFrameworkStreamText.get(streamId)?.text
                : '';
              if (!a.text && accumulatedText) a = { ...a, text: accumulatedText };
              if (streamId) finalizedAgentFrameworkStreams.add(streamId);
              if (streamId) agentFrameworkStreamText.delete(streamId);
            }
          }
          if (a.conversation?.id) conversationId = a.conversation.id;
          emitActivity(toWebChat(a));
          if (
            synthesizeAgentFrameworkFinal &&
            frame.finishReason &&
            info?.streamType !== 'final' &&
            a.text
          ) {
            const streamId = info?.sessionId || a.id;
            if (streamId && !finalizedAgentFrameworkStreams.has(streamId)) {
              const channelData = { ...(a.channelData || {}) };
              delete channelData.streamSequence;
              emitActivity(toWebChat({
                ...a,
                type: 'message',
                id: `${streamId}-agent-framework-final`,
                channelData: { ...channelData, streamType: 'final', streamId }
              }));
              touchedAgentFrameworkStreams.add(streamId);
              finalizedAgentFrameworkStreams.add(streamId);
              agentFrameworkStreamText.delete(streamId);
            }
          }
        } else if (frame.type === 'agentFrameworkUpdate' && frame.text) {
          updateCount += 1;
          const streamId = `${conversationId || 'agent-framework'}-turn-${agentFrameworkTurnId}`;
          touchedAgentFrameworkStreams.add(streamId);
          const activity = consolidateAgentFrameworkActivity({
            type: 'typing',
            id: `${streamId}-${updateCount}`,
            from: { id: 'agent-framework', role: 'bot' },
            text: frame.text,
            channelData: {
              streamType: 'streaming',
              streamId,
              streamSequence: updateCount,
              pocProvider: 'agent-framework-dotnet'
            }
          }, frame.textMode || 'delta');
          lastAgentFrameworkActivities.set(streamId, activity);
          emitActivity(toWebChat(activity));
          if (frame.finishReason && !finalizedAgentFrameworkStreams.has(streamId)) {
            emitActivity(toWebChat({
              ...activity,
              type: 'message',
              id: `${streamId}-agent-framework-final`,
              channelData: {
                streamType: 'final',
                streamId,
                pocProvider: 'agent-framework-dotnet'
              }
            }));
            finalizedAgentFrameworkStreams.add(streamId);
            agentFrameworkStreamText.delete(streamId);
          }
        } else if (frame.type === 'done') {
          sawDone = true;
          if (frame.conversationId) conversationId = frame.conversationId;
          if (synthesizeAgentFrameworkFinal) {
            for (const [streamId, lastActivity] of lastAgentFrameworkActivities) {
              if (finalizedAgentFrameworkStreams.has(streamId) || !lastActivity.text) continue;
              const channelData = { ...(lastActivity.channelData || {}) };
              delete channelData.streamSequence;
              emitActivity(toWebChat({
                ...lastActivity,
                type: 'message',
                id: `${streamId}-agent-framework-final`,
                channelData: { ...channelData, streamType: 'final', streamId }
              }));
              finalizedAgentFrameworkStreams.add(streamId);
              agentFrameworkStreamText.delete(streamId);
            }
          }
          if (
            synthesizeAgentFrameworkFinal &&
            body.text &&
            lastAgentFrameworkActivities.size === 0 &&
            finalizedAgentFrameworkStreams.size === 0
          ) {
            emitActivity({
              type: 'message',
              id: `af-empty-${Date.now().toString(36)}`,
              from: { id: 'agent-framework', role: 'bot' },
              text: 'Agent Framework completed without emitting typing updates. This runtime may have returned a final-only response that the preview provider does not surface in streaming mode.',
              channelData: {
                pocProvider: 'agent-framework-dotnet',
                finalOnlyProviderGap: true
              }
            });
          }
        } else if (frame.type === 'error') {
          throw new Error(frame.error || 'Sidecar returned an unknown error.');
        }
      };
      while (!ended) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf('\n')) >= 0) {
          handle(buf.slice(0, nl));
          buf = buf.slice(nl + 1);
        }
      }
      if (buf) handle(buf);
      if (!ended && !sawDone) throw new Error('Sidecar stream ended before its completion frame.');
      if (!ended && !body.text && !conversationId) {
        throw new Error('Sidecar start completed without a conversation ID.');
      }
    } finally {
      touchedAgentFrameworkStreams.forEach((streamId) => {
        agentFrameworkStreamText.delete(streamId);
      });
      activeControllers.delete(controller);
    }
  }

  // Open the conversation as soon as the adapter is created. The greeting
  // activities are buffered until flush().
  (async () => {
    setStatusValue(1); // Connecting
    try {
      await streamTurn(startUrl, {
        ...(serverManagedAuth ? {} : { token }),
        settings
      });
      if (!ended) {
        setStatusValue(2); // Online
        activityDeliveryReady = true;
        scheduleActivityDelivery();
      }
    } catch (e) {
      if (ended) return;
      console.error('[sidecar] start failed', e);
      emitActivity({
        type: 'message',
        id: 'err-start',
        from: { id: 'bot', role: 'bot' },
        text: `⚠️ Could not start the sidecar conversation: ${e.message}`,
        timestamp: new Date().toISOString()
      });
      if (!ended) {
        setStatusValue(4); // FailedToConnect
        activityDeliveryReady = true;
        scheduleActivityDelivery();
      }
    }
  })();

  return {
    get conversationId() { return conversationId; },
    connectionStatus$: status$,
    activity$,
    // Web Chat subscribes ~5×; flush replays the buffered greeting once to all
    // present subscribers, then switches to live pass-through.
    __flushActivities() {
      if (ended) return;
      flushing = true;
      const items = activityBuffer.splice(0);
      items.forEach(emitActivity);
    },
    postActivity(activity) {
      const id = 'u-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      if (!ended && activity && activity.type === 'message' && activity.from?.role !== 'bot') {
        // Echo the user's message so Web Chat moves the bubble from "sending"
        // to "sent" (it reconciles by channelData.clientActivityID). Defer so
        // Web Chat registers the outgoing activity before the echo arrives.
        const echoTimer = setTimeout(() => {
          echoTimers.delete(echoTimer);
          emitActivity({ ...activity, id, timestamp: new Date().toISOString() });
        }, 0);
        echoTimers.add(echoTimer);
        streamTurn(sendUrl, {
          ...(serverManagedAuth ? {} : { token }),
          conversationId,
          text: activity.text || '',
          settings
        }).catch((e) => {
          if (ended) return;
          console.error('[sidecar] send failed', e);
          emitActivity({
            type: 'message',
            id: 'err-' + id,
            from: { id: 'bot', role: 'bot' },
            text: `⚠️ Sidecar send failed: ${e.message}`,
            timestamp: new Date().toISOString()
          });
        });
      }
      return {
        subscribe(o, e, c) {
          const obs = asObserver(o, e, c);
          try { obs.next && obs.next(id); obs.complete && obs.complete(); } catch { /* noop */ }
          return { unsubscribe() {} };
        }
      };
    },
    end() {
      if (ended) return;
      ended = true;
      activeControllers.forEach((controller) => controller.abort());
      activeControllers.clear();
      echoTimers.forEach((timer) => clearTimeout(timer));
      echoTimers.clear();
      if (activityDeliveryTimer) clearTimeout(activityDeliveryTimer);
      activityDeliveryTimer = null;
      activityDeliveryQueue.length = 0;
      agentFrameworkStreamText.clear();
      if (endUrl && conversationId) {
        fetch(endUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId }),
          keepalive: true
        }).catch((e) => console.warn('sidecar session cleanup failed', e));
      }
      setStatusValue(5);
    }
  };
}

// ---------------------------------------------------------------------------
// Web Chat rendering
//
// Every mode shares the single global `WebChat` loaded once in index.html from
// jsDelivr's @latest npm bundle (the genuine newest release). We intentionally
// do NOT load a second Web Chat bundle at runtime: each full bundle ships its
// own React, and two copies of React on one page break rendering with React
// error #321 ("Invalid hook call").
// ---------------------------------------------------------------------------

async function connect() {
  await disconnect();
  resetInspector();
  resetThinking();
  setStatus('connecting', 'Acquiring token…');
  setHint('Acquiring Direct Line token…');
  connectBtn.disabled = true;

  try {
    const mode = modeSel.value;
    // All Direct Line modes share the single global Web Chat bundle loaded in
    // index.html (jsDelivr genuine-latest). Loading a second full bundle would
    // put a second copy of React on the page and break rendering with React
    // error #321 ("Invalid hook call").
    let webChatLib = WebChat;

    if (mode === 'ghcpS2S') {
      const cfg = readGhcpS2SConfig();
      setStatus('connecting', 'Acquiring S2S app token…');
      setHint('Connecting to the no-auth GHCP /3p runtime with a server-managed app identity…');
      directLine = createSidecarConnection({
        settings: cfg,
        startUrl: '/api/dte/s2s/start',
        sendUrl: '/api/dte/s2s/send',
        serverManagedAuth: true
      });
    } else if (mode === 'sdk' || mode === 'newAgent' || mode === 'newAgentDTE' || mode === 'ghcp3p' || mode === 'ghcpAgentFramework') {
      // Direct-to-Engine: MSAL sign-in, then a Web Chat-compatible connection.
      const cfg =
        mode === 'newAgent'    ? readNewAgentConfig()    :
        mode === 'newAgentDTE' ? readNewAgentDTEConfig() :
        mode === 'ghcp3p'      ? readGhcp3pConfig()      :
        mode === 'ghcpAgentFramework' ? readGhcpAgentFrameworkConfig() :
                                 readSdkConfig();
      setHint('Signing in with Entra ID…');
      const { token, settings } = await acquireSdkToken(cfg, mode);
      if ((mode === 'newAgentDTE' && cfg.viaSidecar) || mode === 'ghcp3p' || mode === 'ghcpAgentFramework') {
        // Server-sidecar Direct-to-Engine: the correct transport for an MS-auth
        // modern agent. The server runs the identical CopilotStudioClient with
        // the delegated user token and — unlike the CORS-blocked browser — can
        // follow the `x-ms-d2e-experimental` redirect to the island gateway.
        //
        // OPTIMAL SETTINGS for MS-auth: keep useExperimentalEndpoint ON and
        // directConnectUrl EMPTY so the redirect engages (a manual directConnectUrl
        // would DISABLE it). The server caches the client per conversationId, so
        // the island URL the SDK learns from turn 1's response header persists
        // into every later turn — the first USER message already lands on the
        // island runtime.
        setHint(
          mode === 'ghcpAgentFramework'
            ? 'Connecting to the Copilot Studio GHCP harness through .NET Agent Framework…'
            : mode === 'ghcp3p'
              ? 'Connecting to GHCP /3p runtime via server sidecar…'
              : 'Streaming via server sidecar…'
        );

        // A manually pasted Direct connect URL (Channels → Web/Native app →
        // "Microsoft 365 Agents SDK") always wins; otherwise leave it empty so
        // the experimental island redirect can engage on the server.
        const directConnectUrl = mode === 'ghcp3p' || mode === 'ghcpAgentFramework'
          ? cfg.directConnectUrl
          : readNewAgentDTEConfigRaw().directConnectUrl || cfg.directConnectUrl || '';

        directLine = createSidecarConnection({
          token,
          settings: {
            environmentId: cfg.environmentId,
            schemaName: cfg.schemaName,
            cloud: cfg.cloud,
            copilotAgentType: cfg.copilotAgentType,
            useExperimentalEndpoint: cfg.useExperimentalEndpoint,
            directConnectUrl,
            runtime: cfg.runtime
          },
          ...(mode === 'ghcpAgentFramework'
            ? {
                startUrl: `${cfg.sidecarUrl}/api/agent-framework/start`,
                sendUrl: `${cfg.sidecarUrl}/api/agent-framework/send`,
                endUrl: `${cfg.sidecarUrl}/api/agent-framework/end`,
                synthesizeAgentFrameworkFinal: true,
                serializeActivityDelivery: true
              }
            : {})
        });
      } else {
        const { CopilotStudioClient, CopilotStudioWebChat } = window.CopilotStudioSDK;
        const client = new CopilotStudioClient(settings, token);
        const rawConnection = CopilotStudioWebChat.createConnection(client, { showTyping: true });
        // The SDK's activity$ is a COLD observable that keeps only a single
        // subscriber. If both Web Chat and our inspector subscribe, the last one
        // wins and the other goes blind. So we tap activities inside Web Chat's
        // one subscription instead of subscribing a second time.
        directLine = wrapWithInspectorTap(rawConnection);
      }
    } else {
      const tok = await acquireToken(mode);
      const isDlStreaming = mode === 'dlStream' || mode === 'newAgentDL';
      // Web Socket transport is required for livestreaming.
      const dlOptions = {
        token: tok.token,
        webSocket: isDlStreaming ? true : forceWebSocket.checked
      };
      // newAgentDL targets the no-auth agent's regional Direct Line host (discovered
      // from regionalchannelsettings); other modes use the global default.
      if (tok.domain) dlOptions.domain = tok.domain;
      directLine = webChatLib.createDirectLine(dlOptions);
      if (isDlStreaming) {
        // Coalesce real Copilot Studio livestreaming chunks into one growing
        // bubble keyed on streamId (and drop the trailing duplicate final).
        directLine = wrapWithDirectLineStreaming(directLine);
      } else {
        // Animate bot final messages with a typewriter effect (Direct Line sends
        // the answer as a single final message, so there's no native typing feel).
        directLine = wrapWithTypewriter(directLine);
      }
    }

    // Surface conversation id + inspect every activity.
    // Some Copilot Studio canvases request progressive streaming when the
    // client opts in with a `startConversation` event carrying
    // deliveryMode:"stream" + a ClientCapabilities entity — exactly what the
    // official test canvas sends. Plain Web Chat never sends it, so without this
    // the bot returns only the final message. Send it once when dlStream goes
    // online, before the first user message.
    let streamOptInSent = false;
    subscriptions.push(
      directLine.connectionStatus$.subscribe((status) => {
        const meta = STATUS[status] || { label: `Status ${status}`, state: 'idle' };
        setStatus(
          meta.state,
          status === 2 && mode === 'newAgentDL'
            ? 'Online · Direct Line connected'
            : status === 2 && mode === 'ghcpS2S'
              ? 'Online · S2S app identity connected'
            : status === 2 && mode === 'ghcpAgentFramework'
              ? 'Online · .NET Agent Framework connected'
              : meta.label
        );
        if (status === 2) {
          setHint(
            mode === 'ghcpAgentFramework'
              ? 'Connected through .NET Agent Framework. Send a prompt to observe real RunStreamingAsync updates.'
              : mode === 'ghcpS2S'
              ? 'Connected with a server-managed S2S app identity. Send a prompt to inspect the runtime stream.'
              : mode === 'newAgentDL'
              ? 'Connected to no-auth Agentic Direct Line. The runtime may return final-only.'
              : 'Connected. Send a message to see streaming chunks arrive.',
            'ok'
          );
          if ((mode === 'dlStream' || mode === 'newAgentDL') && !streamOptInSent) {
            streamOptInSent = true;
            try {
              const streamMeta = (() => {
                if (mode === 'newAgentDL') {
                  const c = readNewAgentDLConfigRaw();
                  return { environmentId: c.environmentId, schemaName: c.schemaName };
                }
                // Classic Direct Line should opt-in to streaming only. Do not
                // attach cci_* routing fields from SDK config, which can
                // accidentally steer the request to the wrong runtime/agent.
                return {};
              })();
              const optIn = {
                type: 'event',
                name: 'startConversation',
                deliveryMode: 'stream',
                channelId: 'webchat',
                from: {
                  id: 'user-' + Math.random().toString(36).slice(2),
                  role: 'user'
                },
                locale: i18n ? i18n.webChatLocale(currentLang) : 'en-US',
                channelData: { postBack: true },
                value: { __version__: '2' },
                entities: [
                  {
                    type: 'ClientCapabilities',
                    requiresBotState: true,
                    supportsListening: true,
                    supportsTts: true
                  }
                ]
              };
              if (streamMeta.tenantId) optIn.cci_tenant_id = streamMeta.tenantId;
              if (streamMeta.environmentId)
                optIn.cci_environment_id = streamMeta.environmentId;
              if (mode === 'newAgentDL') {
                // The observed no-auth agentic canvas keys routing off the agent
                // schema id; tenant is empty because this mode carries no user identity.
                optIn.cci_tenant_id = streamMeta.tenantId || '';
                if (streamMeta.schemaName) optIn.cci_bot_id = streamMeta.schemaName;
                optIn.value = {
                  __version__: '2',
                  enableFileAttachment: 'false',
                  cliAgent: 'true'
                };
              }
              directLine.postActivity(optIn).subscribe({
                next: () =>
                  setHint(
                    mode === 'newAgentDL'
                      ? 'Livestream opt-in sent; the runtime still decides whether chunks are emitted.'
                      : 'Streaming opt-in sent (deliveryMode:"stream") — send a message to see chunks.',
                    'ok'
                  ),
                error: (e) =>
                  console.warn('startConversation stream opt-in failed', e)
              });
            } catch (e) {
              console.warn('could not send streaming opt-in', e);
            }
          }
        }
      })
    );

    // For SDK mode the inspector is fed by the tap wrapper (see
    // wrapWithInspectorTap), so we must NOT subscribe to activity$ a second
    // time — doing so would steal the cold observable's only subscriber.
    if (!directLine.__inspectorTapped) {
      subscriptions.push(
        directLine.activity$.subscribe((activity) => {
          if (directLine.conversationId && convoIdLabel) {
            convoIdLabel.textContent = formatConversation(directLine.conversationId);
          }
          try {
            logActivity(activity);
          } catch (e) {
            console.warn('inspector error', e);
          }
        })
      );
    }

    placeholder.style.display = 'none';

    // The Web Chat bundle (jsDelivr) renders its send/upload icons as
    // <div class="component-icon"> glyphs (not <svg>). Tag the host so the
    // stylesheet can suppress those native glyphs and keep only our custom
    // icons.
    el('webchat').classList.add('wc-secret-mode');

    // Render Web Chat into a FRESH child node on every connect. Web Chat mounts
    // a React root onto the node we hand it. If we reused #webchat directly,
    // disconnect()'s `innerHTML = ''` would wipe the DOM but leave React's root
    // bound to #webchat; the NEXT renderWebChat would then collide with that
    // stale root and paint nothing (canvas stuck/empty on reconnect). A new
    // child node guarantees a clean root each time and is disposed wholesale
    // when disconnect() clears the host.
    const mount = document.createElement('div');
    mount.className = 'webchat-mount';
    el('webchat').appendChild(mount);

    webChatLib.renderWebChat(
      {
        directLine,
        styleOptions: {
          backgroundColor: '#ffffff',
          bubbleBackground: '#f1f4ff',
          bubbleFromUserBackground: '#5b8cff',
          bubbleFromUserTextColor: '#ffffff',
          bubbleBorderRadius: 14,
          bubbleFromUserBorderRadius: 14,
          rootHeight: '100%',

          // --- Modern, flat send box -------------------------------------
          // Show the file-upload (attachment) button and let users add files.
          hideUploadButton: false,
          sendAttachmentOn: 'send',
          // Flat canvas: drop Web Chat's default top border; our CSS draws the
          // pill-shaped composer instead.
          sendBoxBackground: 'transparent',
          sendBoxBorderTop: '',
          sendBoxBorderBottom: '',
          sendBoxHeight: 48,
          sendBoxMaxHeight: 180,
          // Render a multiline textarea that wraps text and auto-grows in
          // height (up to sendBoxMaxHeight) instead of a single-line input.
          sendBoxTextWrap: true,
          sendBoxTextColor: '#1f2430',
          sendBoxPlaceholderColor: '#9aa3bd',
          sendBoxButtonColor: '#5b8cff',
          sendBoxButtonColorOnHover: '#3f74ff',
          sendBoxButtonColorOnFocus: '#3f74ff',
          sendBoxButtonColorOnDisabled: '#c4ccde',
          sendBoxButtonShadeColor: 'transparent',
          // Subtle typing indicator that matches the new accent palette.
          sendTypingIndicator: true
        },
        locale: i18n ? i18n.webChatLocale(currentLang) : 'en-US'
      },
      mount
    );

    // The sidecar adapter buffers its greeting until Web Chat has subscribed
    // (which happens synchronously inside renderWebChat above); release it now.
    if (typeof directLine.__flushActivities === 'function') {
      directLine.__flushActivities();
    }

    attachAutoScroll();

    disconnectBtn.disabled = false;
    testBtn.disabled = false;
  } catch (err) {
    console.error(err);
    setStatus('error', 'Connection failed');
    setHint(err.message, 'err');
    placeholder.style.display = 'flex';
  } finally {
    connectBtn.disabled = false;
  }
}

async function disconnect() {
  clearTypewriter();
  subscriptions.forEach((s) => {
    try {
      s.unsubscribe();
    } catch {
      /* noop */
    }
  });
  subscriptions = [];
  if (autoScrollObserver) {
    autoScrollObserver.disconnect();
    autoScrollObserver = null;
  }
  if (directLine) {
    try {
      directLine.end();
    } catch {
      /* noop */
    }
    directLine = null;
  }
  el('webchat').innerHTML = '';
  el('webchat').classList.remove('wc-secret-mode');
  el('webchat').appendChild(placeholder);
  placeholder.style.display = 'flex';
  convoIdLabel.textContent = formatConversation('—');
  resetThinking();
  disconnectBtn.disabled = true;
  setStatus('idle', 'Not connected');
}

// ---------------------------------------------------------------------------
// Test connection (server-side validation when available)
// ---------------------------------------------------------------------------
async function testConnection() {
  testBtn.disabled = true;
  if (modeSel.value === 'server') {
    setHint('Testing server connection…');
    try {
      const resp = await fetch('/api/test-connection');
      const body = await resp.json();
      if (body.ok) {
        setHint(
          '✓ Connected via {source}. Conversation {conversationId} · streamUrl {streamUrlStatus} · {elapsedMs}ms',
          'ok',
          {
            source: body.source,
            conversationId: body.conversationId,
            streamUrlStatus: t(body.streamUrl ? 'present' : 'missing'),
            elapsedMs: body.elapsedMs
          }
        );
      } else {
        setHint('✗ {message}', 'err', { message: body.error });
      }
    } catch (err) {
      setHint('✗ {message}', 'err', { message: err.message });
    }
  } else if (modeSel.value === 'ghcpS2S') {
    setHint('Testing server-managed S2S app-token connectivity to GHCP /3p…');
    try {
      const cfg = readGhcpS2SConfig();
      const response = await fetch('/api/dte/s2s/preflight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: cfg })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.ok) throw new Error(body.error || `HTTP ${response.status}`);
      setHint(
        '✓ S2S app identity reached GHCP /3p · HTTP {status} · {elapsedMs}ms. Click Connect to chat.',
        'ok',
        { status: body.status, elapsedMs: body.elapsedMs }
      );
    } catch (err) {
      setHint('✗ {message}', 'err', { message: err.message });
    }
  } else if (modeSel.value === 'sdk' || modeSel.value === 'newAgent' || modeSel.value === 'newAgentDTE' || modeSel.value === 'ghcp3p' || modeSel.value === 'ghcpAgentFramework') {
    setHint('Checking existing Entra session…');
    try {
      const cfg =
        modeSel.value === 'newAgent'    ? readNewAgentConfig()    :
        modeSel.value === 'newAgentDTE' ? readNewAgentDTEConfig() :
        modeSel.value === 'ghcp3p'      ? readGhcp3pConfig()      :
        modeSel.value === 'ghcpAgentFramework' ? readGhcpAgentFrameworkConfig() :
                                          readSdkConfig();
      const { token } = await acquireSdkTokenSilent(cfg);
      if (modeSel.value === 'ghcp3p' || modeSel.value === 'ghcpAgentFramework') {
        const isAgentFramework = modeSel.value === 'ghcpAgentFramework';
        setHint('Testing GHCP /3p runtime…');
        const response = await fetch(
          isAgentFramework ? `${cfg.sidecarUrl}/api/agent-framework/preflight` : '/api/dte/preflight',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, settings: cfg })
          }
        );
        const body = await response.json().catch(() => ({}));
        if (!response.ok || !body.ok) throw new Error(body.error || body.detail || `HTTP ${response.status}`);
        setHint(
          isAgentFramework
            ? '✓ .NET Agent Framework reached the Copilot Studio GHCP /3p runtime. Click Connect to compare streaming.'
            : '✓ GHCP /3p runtime reached · HTTP {status} · {elapsedMs}ms. Click Connect to chat.',
          'ok',
          { status: body.status, elapsedMs: body.elapsedMs }
        );
      } else {
        setHint(
          '✓ Signed in · token acquired ({chars} chars). Click Connect to chat.',
          'ok',
          { chars: token.length }
        );
      }
    } catch (err) {
      setHint('✗ {message}', 'err', { message: err.message });
    }
  } else {
    // Client-side: prove we can mint a token.
    setHint('Testing token acquisition…');
    try {
      const { token } = await acquireToken(modeSel.value);
      setHint('✓ Token acquired ({chars} chars). Click Connect to chat.', 'ok', { chars: token.length });
    } catch (err) {
      setHint('✗ {message}', 'err', { message: err.message });
    }
  }
  testBtn.disabled = false;
}

// ---------------------------------------------------------------------------
// Wire up
// ---------------------------------------------------------------------------
connectBtn.addEventListener('click', connect);
disconnectBtn.addEventListener('click', disconnect);
testBtn.addEventListener('click', testConnection);
if (languageSelect) {
  languageSelect.addEventListener('change', () => applyLanguage(languageSelect.value));
}

// Wait until the SDK browser bundle bridge has loaded (it dispatches an event).
function whenSdkReady() {
  if (window.CopilotStudioSDK && window.CopilotStudioSDK.ready) return Promise.resolve();
  return new Promise((resolve) => {
    window.addEventListener('copilotsdkready', () => resolve(), { once: true });
    // Safety timeout so startup never hangs if the bundle fails to load.
    setTimeout(resolve, 8000);
  });
}

async function start() {
  applyLanguage(currentLang);
  await loadServerConfig();
  // Restore any fields the user typed before an interactive redirect.
  restoreSdkConfig();
  restoreNewAgentConfig();
  restoreNewAgentDLConfig();
  restoreNewAgentDTEConfig();
  restoreGhcp3pConfig();
  restoreGhcpS2SConfig();
  restoreGhcpAgentFrameworkConfig();
  await whenSdkReady();
  // Complete a returning Entra redirect (if any) and auto-resume Connect.
  await processSdkRedirect();
}

start();
