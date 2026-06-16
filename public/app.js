/* global WebChat */
'use strict';

// ---------------------------------------------------------------------------
// Elements
// ---------------------------------------------------------------------------
const el = (id) => document.getElementById(id);
const modeSel = el('mode');
const tokenEndpointField = el('tokenEndpointField');
const secretField = el('secretField');
const sdkField = el('sdkField');
const sdkClientId = el('sdkClientId');
const sdkTenantId = el('sdkTenantId');
const sdkEnvironmentId = el('sdkEnvironmentId');
const sdkSchemaName = el('sdkSchemaName');
const tokenEndpointInput = el('tokenEndpoint');
const secretInput = el('secret');
const forceWebSocket = el('forceWebSocket');
const autoInspect = el('autoInspect');
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
  sdkField.hidden = mode !== 'sdk';
  // Web Socket transport only applies to Direct Line modes.
  forceWebSocket.disabled = mode === 'sdk';
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
  thinkingSteps = [];
  if (thinkingEl) thinkingEl.classList.remove('hide');
  renderThinking();
}

// The streamed answer is starting — make the plan card disappear.
function finishThinkingSoon() {
  if (!thinkingActive) return;
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
// subscribe(), so we let only Web Chat subscribe (through this wrapper) and tap
// each activity on the way through.
function wrapWithInspectorTap(conn) {
  const originalActivity$ = conn.activity$;
  const tappedActivity$ = {
    subscribe(observerOrNext, error, complete) {
      const observer =
        typeof observerOrNext === 'function'
          ? { next: observerOrNext, error, complete }
          : observerOrNext || {};
      return originalActivity$.subscribe({
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
          if (observer.next) observer.next(normalizeStreamingForWebChat(activity));
        },
        error: (e) => observer.error && observer.error(e),
        complete: () => observer.complete && observer.complete()
      });
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

async function connect() {
  await disconnect();
  resetInspector();
  resetThinking();
  setStatus('connecting', 'Acquiring token…');
  setHint('Acquiring Direct Line token…');
  connectBtn.disabled = true;

  try {
    const mode = modeSel.value;

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
      directLine = WebChat.createDirectLine({
        token,
        webSocket: forceWebSocket.checked
      });
    }

    // Surface conversation id + inspect every activity.
    subscriptions.push(
      directLine.connectionStatus$.subscribe((status) => {
        const meta = STATUS[status] || { label: `Status ${status}`, state: 'idle' };
        setStatus(meta.state, meta.label);
        if (status === 2) {
          setHint('Connected. Send a message to see streaming chunks arrive.', 'ok');
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

    WebChat.renderWebChat(
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
      el('webchat')
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
