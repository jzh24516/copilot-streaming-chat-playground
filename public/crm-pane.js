// @ts-check
/**
 * Dynamics 365 side-pane widget.
 *
 * Scope is deliberately narrow compared with the diagnostic playground: sign in,
 * hold one conversation with one server-pinned agent, render progressive
 * answers, recover from failure. There is no runtime selector, no environment or
 * schema input, and no raw activity inspector — the pane cannot choose which
 * agent it talks to, and shouldn't be able to.
 */

const CONTEXT_KEYS = /** @type {const} */ (['entityName', 'recordId', 'appId', 'organizationUrl']);

const el = {
  agentName: /** @type {HTMLElement} */ (document.getElementById('agentName')),
  recordContext: /** @type {HTMLElement} */ (document.getElementById('recordContext')),
  signOutButton: /** @type {HTMLButtonElement} */ (document.getElementById('signOutButton')),
  status: /** @type {HTMLElement} */ (document.getElementById('status')),
  alert: /** @type {HTMLElement} */ (document.getElementById('alert')),
  alertText: /** @type {HTMLElement} */ (document.getElementById('alertText')),
  alertAction: /** @type {HTMLButtonElement} */ (document.getElementById('alertAction')),
  transcript: /** @type {HTMLElement} */ (document.getElementById('transcript')),
  composer: /** @type {HTMLFormElement} */ (document.getElementById('composer')),
  messageInput: /** @type {HTMLTextAreaElement} */ (document.getElementById('messageInput')),
  sendButton: /** @type {HTMLButtonElement} */ (document.getElementById('sendButton'))
};

const state = {
  /** @type {any} */ msalInstance: null,
  /** @type {any} */ account: null,
  /** @type {{ clientId: string, tenantId: string, authority: string, scope: string, agentDisplayName: string, maxMessageLength: number } | null} */
  config: null,
  /** @type {string} */ conversationId: '',
  /** @type {Record<string, string>} */ recordContext: {},
  /** @type {string} */ loginHint: '',
  contextSent: false,
  busy: false
};

// ---------------------------------------------------------------------------
// Record context
// ---------------------------------------------------------------------------

/** Reads the non-secret record context the launcher web resource passed in. */
function readRecordContext() {
  const params = new URLSearchParams(window.location.search);
  /** @type {Record<string, string>} */
  const context = {};
  for (const key of CONTEXT_KEYS) {
    const value = (params.get(key) || '').trim();
    // Bound the values: they are attacker-influenceable via the URL and end up
    // in the prompt. Anything longer is not a real Dynamics identifier.
    if (value && value.length <= 256) context[key] = value;
  }
  return context;
}

function renderRecordContext() {
  const { entityName, recordId } = state.recordContext;
  if (!entityName && !recordId) return;
  const label = entityName && recordId ? `${entityName} · ${recordId}` : entityName || recordId;
  el.recordContext.textContent = label;
  el.recordContext.title = `${label}\nThis record context is shared with the assistant.`;
  el.recordContext.hidden = false;
}

/**
 * The signed-in Dynamics user, forwarded by the launcher purely as an Entra SSO
 * hint. Kept out of `CONTEXT_KEYS` on purpose: it must never reach the agent
 * prompt, and it grants nothing on its own — Entra still has to have a live
 * session for that user.
 */
function readLoginHint() {
  const value = (new URLSearchParams(window.location.search).get('loginHint') || '').trim();
  return value.length <= 256 ? value : '';
}

/**
 * The agent has no other way to know which record the user is looking at, so
 * the context rides along on the first turn only. It is prepended to the
 * outbound text, not to the bubble the user sees.
 */
function decorateFirstTurn(text) {
  const entries = CONTEXT_KEYS.map((key) => (state.recordContext[key] ? `${key}=${state.recordContext[key]}` : ''))
    .filter(Boolean);
  if (state.contextSent || !entries.length) return text;
  state.contextSent = true;
  return `[Dynamics record context: ${entries.join('; ')}]\n\n${text}`;
}

// ---------------------------------------------------------------------------
// Markdown rendering
//
// Agents answer in Markdown — tables, bold, lists. Rendering it as text shows
// the raw pipes and asterisks; rendering it as raw HTML would hand untrusted
// model output a DOM. So: marked parses, DOMPurify sanitizes, and only the
// sanitized fragment is inserted.
//
// If either library fails to load (SRI mismatch, CDN blocked by policy) the
// pane degrades to plain text rather than failing open with unsanitized HTML.
// ---------------------------------------------------------------------------

const markdown = (() => {
  const parser = /** @type {any} */ (window).marked;
  const purifier = /** @type {any} */ (window).DOMPurify;
  if (!parser || !purifier?.sanitize) return null;

  parser.setOptions({
    gfm: true, // tables, strikethrough, autolinks
    breaks: true // agents rely on single newlines for line breaks
  });

  // Links open outside the CRM iframe and carry no referrer or ranking weight.
  purifier.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer nofollow');
    }
  });

  const config = {
    ALLOWED_TAGS: [
      'p', 'br', 'hr', 'span', 'strong', 'em', 'del', 'code', 'pre', 'blockquote',
      'ul', 'ol', 'li', 'a',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'table', 'thead', 'tbody', 'tr', 'th', 'td'
    ],
    // No `style`: it would let model output restyle the host pane.
    ALLOWED_ATTR: ['href', 'title', 'colspan', 'rowspan'],
    // Images are excluded on purpose — a remote src is an outbound request
    // driven by model output. Add 'img' + 'src' here if you decide to allow it.
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
    RETURN_DOM_FRAGMENT: true
  };

  return {
    /** @param {string} text @returns {DocumentFragment} */
    toFragment(text) {
      return purifier.sanitize(parser.parse(text), config);
    }
  };
})();

/**
 * Renders agent text into an element, as Markdown when available.
 * Skips redundant work when the text has not changed between stream chunks.
 * @param {HTMLElement} element
 * @param {string} text
 */
function renderRichText(element, text) {
  if (element.dataset.rendered === text) return;
  element.dataset.rendered = text;

  if (!markdown) {
    element.textContent = text;
    return;
  }

  try {
    const fragment = markdown.toFragment(text);
    element.replaceChildren(fragment);
    // Wide tables must not stretch the pane; give each its own scroll area.
    for (const table of element.querySelectorAll('table')) {
      const scroller = document.createElement('div');
      scroller.className = 'table-scroll';
      table.replaceWith(scroller);
      scroller.appendChild(table);
    }
  } catch {
    element.textContent = text;
  }
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

function setStatus(text, stateName = 'idle') {
  el.status.textContent = text;
  el.status.dataset.state = stateName;
}

function showAlert(message, actionLabel, onAction) {
  el.alertText.textContent = message;
  el.alert.hidden = false;
  if (actionLabel && onAction) {
    el.alertAction.textContent = actionLabel;
    el.alertAction.hidden = false;
    el.alertAction.onclick = onAction;
  } else {
    el.alertAction.hidden = true;
    el.alertAction.onclick = null;
  }
}

function clearAlert() {
  el.alert.hidden = true;
  el.alertAction.hidden = true;
  el.alertAction.onclick = null;
}

function setBusy(busy) {
  state.busy = busy;
  el.transcript.setAttribute('aria-busy', busy ? 'true' : 'false');
  updateComposerState();
}

function updateComposerState() {
  const ready = Boolean(state.account && state.conversationId) && !state.busy;
  el.messageInput.disabled = !ready;
  el.sendButton.disabled = !ready || !el.messageInput.value.trim();
}

function scrollToLatest() {
  el.transcript.scrollTop = el.transcript.scrollHeight;
}

/**
 * Appends a message element. Agent text is always assigned with textContent, so
 * model output can never be interpreted as markup.
 */
function appendMessage(role, text = '') {
  const message = document.createElement('div');
  message.className = 'message';
  message.dataset.role = role;

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;

  message.appendChild(bubble);
  el.transcript.appendChild(message);
  scrollToLatest();
  return { message, bubble };
}

function appendTypingIndicator() {
  const { message, bubble } = appendMessage('bot', '');
  message.dataset.kind = 'pending';
  const dots = document.createElement('span');
  dots.className = 'typing-dots';
  for (let index = 0; index < 3; index += 1) dots.appendChild(document.createElement('span'));
  bubble.replaceChildren(dots);
  return { message, bubble };
}

// ---------------------------------------------------------------------------
// Streaming activity handling
//
// Mirrors the validated parser from the playground: streaming metadata lives in
// channelData, or in an entity of type "streaminfo", with channelData winning.
// ---------------------------------------------------------------------------

function getStreamInfo(activity) {
  const raw =
    (activity?.channelData && activity.channelData.streamType && activity.channelData) ||
    (activity?.entities || []).find((entity) => entity && entity.type === 'streaminfo' && entity.streamType);
  if (!raw) return null;
  return {
    streamType: raw.streamType,
    streamId: raw.streamId || activity?.id || '',
    streamSequence: raw.streamSequence
  };
}

/**
 * Folds a progressive update into the text already rendered.
 *
 * The Node Copilot Studio client emits cumulative `typing.text` snapshots over
 * `/3p`, while other providers emit independent deltas. Detecting the shape per
 * chunk means the pane renders correctly either way instead of duplicating or
 * truncating the answer.
 */
function mergeProgressiveText(previous, incoming) {
  const before = String(previous || '');
  const next = String(incoming || '');
  if (!before) return next;
  if (!next) return before;
  if (next === before) return before;
  if (next.startsWith(before)) return next; // cumulative snapshot
  if (before.startsWith(next)) return before; // stale/out-of-order snapshot
  return before + next; // delta
}

/** Renders one turn's activities into a single growing bot bubble. */
function createTurnRenderer() {
  /** @type {{ message: HTMLElement, bubble: HTMLElement } | null} */
  let node = appendTypingIndicator();
  /** @type {Map<string, string>} */
  const streams = new Map();
  let activeStreamId = '';
  let finalized = false;

  function ensureNode() {
    if (!node) node = appendMessage('bot', '');
    return node;
  }

  function paint(text, kind) {
    const target = ensureNode();
    target.message.dataset.kind = kind;
    if (kind === 'informative') {
      // Interim status ("Working on it") is a plain sentence, not an answer.
      target.bubble.textContent = text;
      delete target.bubble.dataset.rendered;
    } else {
      renderRichText(target.bubble, text);
    }
    scrollToLatest();
  }

  return {
    /** @param {any} activity */
    handle(activity) {
      if (!activity || activity.from?.role === 'user') return;

      const info = getStreamInfo(activity);
      const text = typeof activity.text === 'string' ? activity.text : '';

      if (info?.streamType === 'informative') {
        if (text) paint(text, 'informative');
        return;
      }

      if (info?.streamType === 'streaming') {
        const streamId = info.streamId || 'default';
        activeStreamId = streamId;
        const merged = mergeProgressiveText(streams.get(streamId) || '', text);
        streams.set(streamId, merged);
        paint(merged, 'streaming');
        return;
      }

      if (info?.streamType === 'final' || activity.type === 'message') {
        if (!text) return;
        // The runtime often sends the answer twice: once tagged final and once
        // as a plain message. Painting the same text again is harmless, but a
        // *new* bubble would duplicate the answer, so reuse the same node.
        const streamId = info?.streamId || activeStreamId || 'default';
        streams.set(streamId, text);
        paint(text, 'final');
        finalized = true;
        return;
      }

      // A bare `typing` with no streaming metadata is just an indicator.
    },

    /** Called once the turn ends, so an empty bubble never lingers. */
    complete() {
      if (finalized) return;
      const best = activeStreamId ? streams.get(activeStreamId) : '';
      const fallback = best || [...streams.values()].find(Boolean) || '';
      if (fallback) {
        paint(fallback, 'final');
      } else if (node) {
        node.message.remove();
        node = null;
      }
    },

    fail(message) {
      paint(message, 'final');
    }
  };
}

// ---------------------------------------------------------------------------
// Relay transport (NDJSON over fetch)
// ---------------------------------------------------------------------------

/**
 * Posts to a relay endpoint and dispatches each NDJSON frame as it arrives.
 * @param {string} url
 * @param {Record<string, any>} body
 * @param {(frame: any) => void} onFrame
 */
async function streamRelay(url, body, onFrame) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      const payload = await response.json();
      if (payload?.error) message = payload.error;
    } catch {
      /* non-JSON error body */
    }
    const error = new Error(message);
    /** @type {any} */ (error).status = response.status;
    throw error;
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('This browser cannot read streamed responses.');

  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex;
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (!line) continue;
      try {
        onFrame(JSON.parse(line));
      } catch {
        /* ignore a partial or malformed frame rather than killing the turn */
      }
    }
  }

  const tail = (buffer + decoder.decode()).trim();
  if (tail) {
    try {
      onFrame(JSON.parse(tail));
    } catch {
      /* ignore */
    }
  }
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

/**
 * Acquires a delegated Power Platform token.
 *
 * Order is silent-cache, then silent-SSO against the Entra session the user
 * already has in Dynamics, then popup. A popup is only opened when
 * `interactive` is true, because popups outside a user gesture are blocked —
 * and an Entra page cannot render inside the CRM iframe, which is why redirect
 * is not used here at all.
 * @param {boolean} interactive
 */
async function acquireToken(interactive = false) {
  const request = { scopes: [/** @type {any} */ (state.config).scope] };

  if (state.account) {
    try {
      const result = await state.msalInstance.acquireTokenSilent({ ...request, account: state.account });
      return result.accessToken;
    } catch (error) {
      if (!interactive) throw error;
    }
  } else if (state.loginHint) {
    // No cached account, but Dynamics told us who is signed in. Entra can
    // usually mint a token from that existing session without any prompt.
    // Blocked third-party cookies make this fail; the popup then covers it.
    try {
      const result = await state.msalInstance.ssoSilent({ ...request, loginHint: state.loginHint });
      adoptAccount(result.account);
      return result.accessToken;
    } catch (error) {
      if (!interactive) throw error;
    }
  }

  if (!interactive) throw new Error('Interactive sign-in required.');

  const result = await state.msalInstance.acquireTokenPopup({
    ...request,
    ...(state.loginHint ? { loginHint: state.loginHint } : {})
  });
  adoptAccount(result.account);
  return result.accessToken;
}

/** @param {any} account */
function adoptAccount(account) {
  state.account = account;
  state.msalInstance.setActiveAccount(account);
}

/**
 * Turns an MSAL failure into something a CRM user can act on.
 *
 * The pane authenticates with a popup because an Entra page cannot render in
 * the Dynamics iframe. Popups are therefore a hard dependency, and "blocked by
 * the browser" is a real, recoverable state that must not look like an outage.
 */
function describeSignInError(error) {
  const code = String(error?.errorCode || error?.name || '');
  if (code === 'user_cancelled') return 'Sign-in was cancelled. Select Sign in to try again.';
  if (code === 'popup_window_error' || code === 'empty_window_error') {
    return 'Your browser blocked the sign-in window. Allow pop-ups for this site, then select Sign in again.';
  }
  return 'Sign in to start using the assistant.';
}

function promptForSignIn(reason) {
  setStatus('Sign-in required', 'error');
  showAlert(reason, 'Sign in', async () => {
    clearAlert();
    await connect(true);
  });
}

// ---------------------------------------------------------------------------
// Conversation lifecycle
// ---------------------------------------------------------------------------

/** @param {boolean} interactive True when triggered by a user gesture. */
async function connect(interactive) {
  setStatus('Connecting…');
  setBusy(true);

  let token;
  try {
    token = await acquireToken(interactive);
  } catch (error) {
    setBusy(false);
    promptForSignIn(interactive ? describeSignInError(error) : 'Sign in to start using the assistant.');
    return;
  }

  el.signOutButton.hidden = false;

  const renderer = createTurnRenderer();
  try {
    await streamRelay('/api/pane/start', { token }, (frame) => {
      if (frame.type === 'activity') renderer.handle(frame.activity);
      else if (frame.type === 'done') state.conversationId = frame.conversationId || '';
      else if (frame.type === 'error') throw new Error(frame.error);
    });
    renderer.complete();

    if (!state.conversationId) throw new Error('The assistant did not return a conversation.');

    clearAlert();
    setStatus('Ready');
    el.messageInput.focus();
  } catch (error) {
    renderer.complete();
    handleTurnFailure(error, () => connect(true));
  } finally {
    setBusy(false);
  }
}

async function send(text) {
  clearAlert();
  appendMessage('user', text);
  setBusy(true);
  setStatus('Thinking…');

  const renderer = createTurnRenderer();
  try {
    const token = await acquireToken(false);
    await streamRelay(
      '/api/pane/send',
      { token, conversationId: state.conversationId, text: decorateFirstTurn(text) },
      (frame) => {
        if (frame.type === 'activity') renderer.handle(frame.activity);
        else if (frame.type === 'error') throw new Error(frame.error);
      }
    );
    renderer.complete();
    setStatus('Ready');
  } catch (error) {
    renderer.complete();
    handleTurnFailure(error, () => send(text));
  } finally {
    setBusy(false);
    el.messageInput.focus();
  }
}

/**
 * @param {any} error
 * @param {() => void} retry
 */
function handleTurnFailure(error, retry) {
  const status = error?.status;
  const message = error?.message || 'Something went wrong.';

  if (status === 401) {
    state.conversationId = '';
    promptForSignIn(message);
    return;
  }

  if (status === 404) {
    // The conversation is gone (relay restarted or session expired). Starting a
    // new one is the only recovery, so don't offer a retry that will also fail.
    state.conversationId = '';
    setStatus('Conversation ended', 'error');
    showAlert('This conversation expired.', 'Start a new conversation', async () => {
      clearAlert();
      await connect(true);
    });
    return;
  }

  setStatus('Error', 'error');
  showAlert(message, 'Retry', () => {
    clearAlert();
    retry();
  });
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

function autoGrowInput() {
  el.messageInput.style.height = 'auto';
  el.messageInput.style.height = `${Math.min(el.messageInput.scrollHeight, 120)}px`;
}

el.messageInput.addEventListener('input', () => {
  autoGrowInput();
  updateComposerState();
});

el.messageInput.addEventListener('keydown', (event) => {
  // Enter sends; Shift+Enter inserts a newline. Matches the CRM chat idiom.
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    el.composer.requestSubmit();
  }
});

el.composer.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = el.messageInput.value.trim();
  if (!text || state.busy || !state.conversationId) return;

  const limit = state.config?.maxMessageLength ?? 4000;
  if (text.length > limit) {
    showAlert(`Message is too long. Keep it under ${limit} characters.`);
    return;
  }

  el.messageInput.value = '';
  autoGrowInput();
  updateComposerState();
  void send(text);
});

el.signOutButton.addEventListener('click', async () => {
  if (state.conversationId) {
    try {
      const token = await acquireToken(false);
      await fetch('/api/pane/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, conversationId: state.conversationId })
      });
    } catch {
      /* best effort — the session expires on its own regardless */
    }
  }

  state.conversationId = '';
  state.contextSent = false;
  el.transcript.replaceChildren();
  updateComposerState();

  // logoutPopup keeps the CRM page intact; a redirect would navigate the
  // top-level Dynamics window out from under the user.
  await state.msalInstance.logoutPopup({ account: state.account }).catch(() => {});
  state.account = null;
  el.signOutButton.hidden = true;
  promptForSignIn('You have been signed out.');
});

async function init() {
  state.recordContext = readRecordContext();
  state.loginHint = readLoginHint();
  renderRecordContext();

  try {
    const response = await fetch('/api/pane/config');
    if (!response.ok) throw new Error(`Configuration unavailable (${response.status}).`);
    state.config = await response.json();
  } catch (error) {
    setStatus('Unavailable', 'error');
    showAlert('The assistant is not configured. Contact your administrator.');
    return;
  }

  el.agentName.textContent = /** @type {any} */ (state.config).agentDisplayName;
  document.title = /** @type {any} */ (state.config).agentDisplayName;

  state.msalInstance = new /** @type {any} */ (window).msal.PublicClientApplication({
    auth: {
      clientId: /** @type {any} */ (state.config).clientId,
      authority: /** @type {any} */ (state.config).authority,
      redirectUri: `${window.location.origin}/crm-pane`
    },
    cache: {
      // sessionStorage, not localStorage: the pane is embedded in a shared CRM
      // surface and the token should not outlive the browser session.
      cacheLocation: 'sessionStorage',
      storeAuthStateInCookie: false
    }
  });

  await state.msalInstance.initialize();

  const accounts = state.msalInstance.getAllAccounts();
  if (accounts.length) {
    state.account = accounts[0];
    state.msalInstance.setActiveAccount(state.account);
  }

  if (state.account || state.loginHint) {
    await connect(false);
    // A cached account whose token has aged out, or an SSO attempt the browser
    // refused, still needs one click.
    if (!state.conversationId && el.alert.hidden) promptForSignIn('Sign in to start using the assistant.');
  } else {
    setStatus('Not signed in');
    promptForSignIn('Sign in to start using the assistant.');
  }
}

void init();
