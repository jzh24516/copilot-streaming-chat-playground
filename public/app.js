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
const tokenEndpointInput = el('tokenEndpoint');
const secretInput = el('secret');
const dlStreamCred = el('dlStreamCred');
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

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let directLine = null;
let subscriptions = [];
let sdkCloud = 'Prod';
const seenStreamIds = new Set();
let chunkCount = 0;
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
  statusLabel.textContent = label;
}

function setHint(message, kind = '') {
  serverHint.textContent = message || '';
  serverHint.className = `hint ${kind}`.trim();
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
  // Web Socket transport only applies to Direct Line modes (and is mandatory
  // for the live-streaming adapter, so it is forced/locked there).
  forceWebSocket.disabled = mode === 'sdk' || mode === 'dlStream';
  if (mode === 'dlStream') forceWebSocket.checked = true;
}
modeSel.addEventListener('change', refreshModeUI);

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
    } else if (cfg.directLineSecret && !sdkConfigured) {
      // No SDK config, but a saved Direct Line secret is available — land the
      // operator directly in the secret mode with the field pre-filled.
      modeSel.value = 'secret';
      setHint(
        'Direct Line secret loaded from .env · Direct Line secret / token mode. Click Connect.',
        'ok'
      );
    } else if (sdkConfigured || cfg.mode === 'none') {
      modeSel.value = 'sdk';
      setHint(
        'Fill in the Entra client ID and Environment ID below (or add them to .env), ' +
          'then Connect. SDK mode is the only one that streams generatively.'
      );
    } else {
      modeSel.value = 'server';
      const host = cfg.tokenEndpointHost ? ` (${cfg.tokenEndpointHost})` : '';
      setHint(
        `Server relay ready · mode: ${cfg.mode}${host}. For generative streaming, switch to SDK mode.`,
        'ok'
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
async function acquireToken(mode) {
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
// Copilot Studio over the Direct Engine protocol. It is the only mode that
// surfaces token-by-token generative streaming chunks.
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
    environmentId: cfg.environmentId,
    schemaName: cfg.schemaName,
    cloud: cfg.cloud,
    copilotAgentType: 'Published'
  });
}

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
async function acquireSdkToken(cfg) {
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
  saveSdkConfig();
  sessionStorage.setItem(SDK_RESUME_KEY, '1');
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
  const cfg = readSdkConfigSafe();
  if (!cfg) return;
  const pca = await getMsalInstance(cfg);
  try {
    const result = await pca.handleRedirectPromise();
    const resuming = sessionStorage.getItem(SDK_RESUME_KEY) === '1';
    if (result || resuming) {
      sessionStorage.removeItem(SDK_RESUME_KEY);
      modeSel.value = 'sdk';
      refreshModeUI();
      // Account is now cached; connect() will acquire the token silently.
      connect();
    }
  } catch (e) {
    sessionStorage.removeItem(SDK_RESUME_KEY);
    setStatus('error', 'Sign-in failed');
    setHint(`✗ Sign-in failed: ${e.message}`, 'err');
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
  const seqValid = Number.isInteger(streamSequence) && streamSequence >= 1;

  // Validation rules from livestreamingActivitySchema:
  //  - streaming/informative: type must be "typing", streamSequence >= 1
  //  - final: type must be "message" or "typing", streamId required
  const valid =
    ((streamType === 'streaming' || streamType === 'informative') &&
      activity.type === 'typing' &&
      seqValid) ||
    (streamType === 'final' &&
      (activity.type === 'message' || activity.type === 'typing') &&
      typeof streamId === 'string' &&
      streamId.length > 0);

  return { streamType, streamId, streamSequence, valid };
}

// ---------------------------------------------------------------------------
// Inspector
// ---------------------------------------------------------------------------
function logActivity(activity) {
  if (!autoInspect.checked) return;

  const info = getStreamInfo(activity);
  // Surface streaming-related activities plus plain bot typing/message events so
  // validation can distinguish "typing only" from true livestream metadata.
  const isBotMessage = activity.type === 'message' && activity.from?.role !== 'user';
  const isBotTyping = activity.type === 'typing' && activity.from?.role !== 'user';
  if (!info && !isBotMessage && !isBotTyping) return;

  const streamType = info?.streamType || activity.type;
  const malformed = Boolean(info) && info.valid === false;
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

  // Metrics (only count well-formed livestream activities).
  if (info && info.valid) {
    if (streamType === 'streaming' || streamType === 'informative') chunkCount++;
    if (streamType === 'final') finalCount++;
    const sid = info.streamId || activity.id;
    if (sid) seenStreamIds.add(sid);
  } else if (isBotMessage && !info) {
    finalCount++;
  }
  mStreams.textContent = String(seenStreamIds.size);
  mChunks.textContent = String(chunkCount);
  mFinal.textContent = String(finalCount);
  updateDiagnosis();

  const text = (activity.text || '').slice(0, 280);
  const seq = info?.streamSequence != null ? `#${info.streamSequence}` : '';
  const sid = (info?.streamId || activity.id || '').toString().slice(0, 18);

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
    <div class="meta">stream: ${escapeHtml(sid || '—')} · len ${text.length}${
      malformed ? ' · invalid per schema' : ''
    }</div>
    <details class="raw">
      <summary>Raw activity JSON</summary>
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
  if (chunkCount > 0) {
    state = 'ok';
    label = `Streaming ✓ — ${chunkCount} chunk(s) across ${seenStreamIds.size} livestream(s)`;
  } else if (finalCount > 0) {
    state = 'warn';
    label = 'Not streaming — only typing + final message (generative streaming not emitted)';
  } else {
    state = 'idle';
    label = 'Waiting for bot activity…';
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
  chunkCount = 0;
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
      <span class="plan-title">Thought process</span>
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
          convoIdLabel.textContent = `conversation: ${conn.conversationId}`;
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
        // so the canvas paints the token-by-token livestream bubble.
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
// final `message` activity — so there is no native token-by-token feel. We
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
  if (activity.from?.role === 'user') return false;
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
          convoIdLabel.textContent = `conversation: ${conn.conversationId}`;
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
  // streamId -> last full text we emitted, kept so we can recognise (and drop)
  // the trailing duplicate final message Direct Line re-sends after a stream.
  const completed = new Map();

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
      const id = info.streamId || activity.id;
      const text = activity.text || '';
      broadcast({
        ...activity,
        type: 'message',
        id,
        text,
        from: activity.from || { role: 'bot' }
      });
      completed.set(id, text);
      return;
    }

    // Final streamed message → replace the growing bubble with the full text.
    if (info && info.valid && info.streamType === 'final') {
      const id = info.streamId || activity.id;
      const text = activity.text || completed.get(id) || '';
      broadcast({ ...activity, type: 'message', id, text });
      completed.set(id, text);
      return;
    }

    // Plain bot message with no stream metadata: if it duplicates a stream we
    // just finished, drop it; otherwise pass it through (ordinary reply).
    const isBotMessage =
      activity.type === 'message' && activity.from?.role !== 'user';
    if (isBotMessage && !info && activity.text) {
      for (const doneText of completed.values()) {
        if (doneText && doneText === activity.text) return;
      }
    }

    broadcast(activity);
  };

  const startUpstream = () => {
    upstreamSub = conn.activity$.subscribe({
      next: (activity) => {
        if (conn.conversationId && convoIdLabel) {
          convoIdLabel.textContent = `conversation: ${conn.conversationId}`;
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

    if (mode === 'sdk') {
      // Direct-to-Engine: MSAL sign-in, then a Web Chat-compatible connection.
      const cfg = readSdkConfig();
      setHint('Signing in with Entra ID…');
      const { token, settings } = await acquireSdkToken(cfg);
      const { CopilotStudioClient, CopilotStudioWebChat } = window.CopilotStudioSDK;
      const client = new CopilotStudioClient(settings, token);
      const rawConnection = CopilotStudioWebChat.createConnection(client, { showTyping: true });
      // The SDK's activity$ is a COLD observable that keeps only a single
      // subscriber. If both Web Chat and our inspector subscribe, the last one
      // wins and the other goes blind. So we tap activities inside Web Chat's
      // one subscription instead of subscribing a second time.
      directLine = wrapWithInspectorTap(rawConnection);
    } else {
      const { token } = await acquireToken(mode);
      // Web Socket transport is required for livestreaming.
      directLine = webChatLib.createDirectLine({
        token,
        webSocket: mode === 'dlStream' ? true : forceWebSocket.checked
      });
      if (mode === 'dlStream') {
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
    // Copilot Studio only emits generative (token-by-token) streaming when the
    // client opts in with a `startConversation` event carrying
    // deliveryMode:"stream" + a ClientCapabilities entity — exactly what the
    // official test canvas sends. Plain Web Chat never sends it, so without this
    // the bot returns only the final message. Send it once when dlStream goes
    // online, before the first user message.
    let streamOptInSent = false;
    subscriptions.push(
      directLine.connectionStatus$.subscribe((status) => {
        const meta = STATUS[status] || { label: `Status ${status}`, state: 'idle' };
        setStatus(meta.state, meta.label);
        if (status === 2) {
          setHint('Connected. Send a message to see streaming chunks arrive.', 'ok');
          if (mode === 'dlStream' && !streamOptInSent) {
            streamOptInSent = true;
            try {
              const sdkMeta = (() => {
                try {
                  return readSdkConfig();
                } catch {
                  return {};
                }
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
                locale: 'en-US',
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
              if (sdkMeta.tenantId) optIn.cci_tenant_id = sdkMeta.tenantId;
              if (sdkMeta.environmentId)
                optIn.cci_environment_id = sdkMeta.environmentId;
              directLine.postActivity(optIn).subscribe({
                next: () =>
                  setHint(
                    'Streaming opt-in sent (deliveryMode:"stream") — send a message to see chunks.',
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
            convoIdLabel.textContent = `conversation: ${directLine.conversationId}`;
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
        }
      },
      mount
    );

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
  convoIdLabel.textContent = 'conversation: —';
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
          `✓ Connected via ${body.source}. Conversation ${body.conversationId} ` +
            `· streamUrl ${body.streamUrl ? 'present' : 'missing'} · ${body.elapsedMs}ms`,
          'ok'
        );
      } else {
        setHint(`✗ ${body.error}`, 'err');
      }
    } catch (err) {
      setHint(`✗ ${err.message}`, 'err');
    }
  } else if (modeSel.value === 'sdk') {
    setHint('Checking existing Entra session…');
    try {
      const cfg = readSdkConfig();
      const { token } = await acquireSdkTokenSilent(cfg);
      setHint(
        `✓ Signed in · token acquired (${token.length} chars). Click Connect to chat.`,
        'ok'
      );
    } catch (err) {
      setHint(`✗ ${err.message}`, 'err');
    }
  } else {
    // Client-side: prove we can mint a token.
    setHint('Testing token acquisition…');
    try {
      const { token } = await acquireToken(modeSel.value);
      setHint(`✓ Token acquired (${token.length} chars). Click Connect to chat.`, 'ok');
    } catch (err) {
      setHint(`✗ ${err.message}`, 'err');
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
  await loadServerConfig();
  // Restore any fields the user typed before an interactive redirect.
  restoreSdkConfig();
  await whenSdkReady();
  // Complete a returning Entra redirect (if any) and auto-resume Connect.
  await processSdkRedirect();
}

start();
