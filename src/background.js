import { listAllFlags, listProjects } from './lib/api.js';
import { cleanSettings, preserveDivs, validateApiKey, validateConnectionInput } from './lib/config.js';
import { hostMatchesTarget, isValidHostname, normalizeDomain, permissionOrigins, toolbarIconColored } from './lib/domain.js';
import { OWNERSHIP_TAG, ownedFlagSummary, planSync } from './lib/flags.js';
import { ANON_KEY, CONTEXT_DELIVERY_KEY, LAST_SYNC_KEY, REGISTRATION_KEY, SETTINGS_KEY } from './lib/keys.js';
import { contextEventBatch, isClientSideId, isLaunchDarklyEventsUrl, isLaunchDarklyTelemetryUrl, LD_EVENTS_ORIGIN } from './lib/events.js';
import { MSG } from './lib/messages.js';
import { selectProjectEnvironment } from './lib/projects.js';
import { executeSync, summarizeResults } from './lib/sync.js';
import { readExtensionApiKey } from './lib/secret.js';
import { ensureAnonymousKey } from './lib/uuid.js';

const SCRIPT_ID = 'darklaunching';
const COLORED_ICON = {
  16: 'icons/icon16.png',
  32: 'icons/icon32.png',
  48: 'icons/icon48.png',
  128: 'icons/icon128.png'
};
const GREY_ICON = {
  16: 'icons/icon16-grey.png',
  32: 'icons/icon32-grey.png',
  48: 'icons/icon48-grey.png',
  128: 'icons/icon128-grey.png'
};

let registrationChain = Promise.resolve();
let connectionChain = Promise.resolve();
let disconnectRequested = false;

function enqueueConnection(task) {
  const run = connectionChain.then(task, task);
  connectionChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function enqueueRegistration(task) {
  const run = registrationChain.then(task, task);
  registrationChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function readApiKey() {
  return readExtensionApiKey();
}

async function loadSettings() {
  const data = await chrome.storage.local.get(SETTINGS_KEY);
  return cleanSettings(data[SETTINGS_KEY] || {});
}

async function saveSettings(settings) {
  const cleaned = cleanSettings(settings);
  await chrome.storage.local.set({ [SETTINGS_KEY]: cleaned });
  return cleaned;
}

async function injectMatchingTabs(domain) {
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs.map(async (tab) => {
      if (!tab.id || !tab.url) return;
      let hostname = '';
      try {
        hostname = new URL(tab.url).hostname;
      } catch {
        return;
      }
      if (!hostMatchesTarget(hostname, domain)) return;
      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['telemetry.js'], world: 'MAIN' });
      } catch {
        // The page can still evaluate flags when telemetry cannot load.
      }
      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
      } catch {
        // Restricted pages and discarded tabs cannot accept the script.
      }
    })
  );
}

async function syncRegistrationNow() {
  try {
    const registered = await chrome.scripting.getRegisteredContentScripts();
    const ids = [SCRIPT_ID, `${SCRIPT_ID}-telemetry`].filter((id) => registered.some((script) => script.id === id));
    if (ids.length) await chrome.scripting.unregisterContentScripts({ ids });
  } catch {
    // Registration state is rebuilt below.
  }

  const settings = await loadSettings();
  if (!settings.connected || !isValidHostname(settings.targetDomain) || !settings.clientSideId) {
    await chrome.storage.local.set({ [REGISTRATION_KEY]: { ok: true, error: '' } });
    return { ok: true, registered: false };
  }

  const origins = permissionOrigins(settings.targetDomain);
  const granted = await chrome.permissions.contains({ origins });
  if (!granted) {
    const error = 'Target domain permission was denied. DOM changes stay off until you allow access.';
    await chrome.storage.local.set({ [REGISTRATION_KEY]: { ok: false, error } });
    return { ok: false, registered: false, error };
  }

  try {
    await chrome.scripting.registerContentScripts([
      {
        id: `${SCRIPT_ID}-telemetry`,
        matches: origins,
        js: ['telemetry.js'],
        world: 'MAIN',
        runAt: 'document_start',
        persistAcrossSessions: true,
        allFrames: false
      },
      {
        id: SCRIPT_ID,
        matches: origins,
        js: ['content.js'],
        runAt: 'document_idle',
        persistAcrossSessions: true,
        allFrames: false
      }
    ]);
  } catch (error) {
    const message = error?.message || 'Could not register the content script.';
    await chrome.storage.local.set({ [REGISTRATION_KEY]: { ok: false, error: message } });
    return { ok: false, registered: false, error: message };
  }

  await chrome.storage.local.set({ [REGISTRATION_KEY]: { ok: true, error: '' } });
  await injectMatchingTabs(settings.targetDomain);
  return { ok: true, registered: true };
}

function syncRegistration() {
  return enqueueRegistration(syncRegistrationNow);
}

function cancelledConnection() {
  return loadSettings().then((settings) => ({ ok: false, cancelled: true, settings }));
}

async function saveConnection(settings) {
  const latest = await loadSettings();
  return saveSettings({ ...settings, divs: latest.divs });
}

async function connect(message) {
  if (disconnectRequested) return cancelledConnection();
  const apiKey = await readApiKey();
  const existing = await loadSettings();
  const apiValidation = validateApiKey(apiKey);
  if (!apiValidation.ok) return { ok: false, error: apiValidation.error };
  const customerName = String(message.customerName ?? existing.customerName).trim();
  const requestedDomain = normalizeDomain(String(message.targetDomain ?? existing.targetDomain));
  const targetDomain = isValidHostname(requestedDomain) ? requestedDomain : requestedDomain ? existing.targetDomain : '';

  const base = {
    ...existing,
    customerName,
    targetDomain,
    anonymous: Boolean(message.anonymous),
    userKey: String(message.userKey ?? ''),
    divs: Array.isArray(message.divs) ? message.divs : existing.divs
  };

  let projects;
  try {
    projects = await listProjects({ apiKey });
  } catch (error) {
    const settings = await saveConnection({ ...base, connected: false, notice: '' });
    await syncRegistration();
    return { ok: false, error: error.message, settings };
  }

  const selection = selectProjectEnvironment(
    projects,
    String(message.projectKey || existing.projectKey || ''),
    String(message.environmentKey || existing.environmentKey || '')
  );
  const clientSideId = selection.environment?.clientSideId || '';
  if (selection.environment && !clientSideId) {
    const settings = await saveConnection({
      ...base,
      projects,
      projectKey: selection.project?.key || '',
      environmentKey: '',
      clientSideId: '',
      connected: false,
      notice: selection.notices.join(' ')
    });
    await syncRegistration();
    return { ok: false, error: 'The selected environment is missing a client-side ID.', settings };
  }

  if (disconnectRequested) return cancelledConnection();
  const settings = await saveConnection({
    ...base,
    projects,
    projectKey: selection.project?.key || '',
    environmentKey: selection.environment?.key || '',
    clientSideId,
    connected: true,
    notice: selection.notices.join(' ')
  });
  if (disconnectRequested) {
    const reverted = await saveConnection({ ...settings, connected: false, notice: '' });
    return { ok: false, cancelled: true, settings: reverted };
  }
  await syncRegistration();
  return { ok: true, settings };
}

async function disconnect(message) {
  const existing = await loadSettings();
  const divs = Array.isArray(message?.divs) ? preserveDivs(existing.divs, message.divs) : existing.divs;
  const settings = await saveSettings({ ...existing, divs, connected: false, notice: '' });
  await chrome.storage.local.remove(CONTEXT_DELIVERY_KEY);
  await syncRegistration();
  disconnectRequested = false;
  return { ok: true, settings };
}

async function refresh() {
  const existing = await loadSettings();
  return connect({
    customerName: existing.customerName,
    targetDomain: existing.targetDomain,
    projectKey: existing.projectKey,
    environmentKey: existing.environmentKey,
    anonymous: existing.anonymous,
    userKey: existing.userKey,
    divs: existing.divs
  });
}

async function readyForSync() {
  const apiKey = await readApiKey();
  const settings = await loadSettings();
  const validation = validateConnectionInput({
    apiKey,
    customerName: settings.customerName,
    targetDomain: settings.targetDomain
  });
  if (!validation.ok) return { ok: false, error: Object.values(validation.errors)[0] };
  if (!settings.connected) return { ok: false, error: 'Connect to LaunchDarkly before updating flags.' };
  if (!settings.projectKey || !settings.environmentKey) {
    return { ok: false, error: 'Choose a project and environment first.' };
  }
  return { ok: true, apiKey, settings };
}

async function listOwnedFlags() {
  const apiKey = await readApiKey();
  const settings = await loadSettings();
  if (!String(apiKey || '').trim()) return { ok: false, error: 'API key is required.' };
  if (!settings.connected) return { ok: false, error: 'Connect to LaunchDarkly before loading flags.' };
  if (!settings.projectKey || !settings.environmentKey) {
    return { ok: false, error: 'Choose a project and environment first.' };
  }
  const flags = await listAllFlags({
    apiKey,
    projectKey: settings.projectKey,
    environmentKey: settings.environmentKey
  });
  return {
    ok: true,
    flags: flags
      .filter((flag) => (flag?.tags || []).includes(OWNERSHIP_TAG))
      .map((flag) => ownedFlagSummary(flag, settings.environmentKey))
  };
}

async function prepareSync() {
  const ready = await readyForSync();
  if (!ready.ok) return ready;
  const flags = await listAllFlags({
    apiKey: ready.apiKey,
    projectKey: ready.settings.projectKey,
    environmentKey: ready.settings.environmentKey
  });
  const plan = planSync({
    divs: ready.settings.divs,
    flags,
    customerName: ready.settings.customerName,
    environmentKey: ready.settings.environmentKey
  });
  return { ok: true, plan: { prunes: plan.prunes, rowErrors: plan.rowErrors } };
}

async function execute(message) {
  const ready = await readyForSync();
  if (!ready.ok) return ready;
  const flags = await listAllFlags({
    apiKey: ready.apiKey,
    projectKey: ready.settings.projectKey,
    environmentKey: ready.settings.environmentKey
  });
  const confirmedDeleteKeys = Array.isArray(message.confirmedDeleteKeys)
    ? message.confirmedDeleteKeys.filter((key) => typeof key === 'string')
    : [];
  const { results } = await executeSync({
    divs: ready.settings.divs,
    flags,
    customerName: ready.settings.customerName,
    environmentKey: ready.settings.environmentKey,
    projectKey: ready.settings.projectKey,
    apiKey: ready.apiKey,
    deleteConfirmed: Boolean(message.deleteConfirmed),
    confirmedDeleteKeys
  });
  const summary = summarizeResults(results);
  await chrome.storage.local.set({ [LAST_SYNC_KEY]: { ...summary, at: Date.now() } });
  return { ok: true, results, summary };
}

async function publishContext(message) {
  const clientSideId = String(message?.clientSideId || '');
  const events = contextEventBatch(message?.context, message?.evaluations);
  if (!isClientSideId(clientSideId) || !events) {
    return { ok: false, error: 'LaunchDarkly did not receive the user context.' };
  }
  const response = await fetch(`${LD_EVENTS_ORIGIN}/events/bulk/${clientSideId}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-launchdarkly-event-schema': '4',
      'x-launchdarkly-payload-id': crypto.randomUUID(),
      'x-launchdarkly-user-agent': 'JSClient/4.11.2'
    },
    body: JSON.stringify(events)
  });
  if (response.status > 204) {
    return { ok: false, error: 'LaunchDarkly did not receive the user context.' };
  }
  const context = events[0].context;
  const delivery = { ok: true, key: context.key, anonymous: context.anonymous, at: Date.now() };
  await chrome.storage.local.set({ [CONTEXT_DELIVERY_KEY]: delivery });
  return delivery;
}

function decodeRelayBody(message) {
  if (message?.encoding === 'base64') {
    const binary = atob(String(message.body || ''));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }
  return typeof message?.body === 'string' ? message.body : '';
}

async function relayEvents(message) {
  const url = String(message?.url || '');
  const method = String(message?.method || 'POST').toUpperCase();
  if (!isLaunchDarklyTelemetryUrl(url) || (method !== 'POST' && method !== 'GET')) {
    return { ok: false, error: 'Refused LaunchDarkly events request.' };
  }
  const body = method === 'GET' ? undefined : decodeRelayBody(message);
  const size = body == null ? 0 : typeof body === 'string' ? body.length : body.byteLength;
  const limit = isLaunchDarklyEventsUrl(url) || !url.includes('.observability.') ? 1_000_000 : 16_000_000;
  if (size > limit) return { ok: false, error: 'LaunchDarkly events payload is too large.' };
  const headers = {};
  if (message.headers && typeof message.headers === 'object') {
    for (const [key, value] of Object.entries(message.headers)) {
      const name = key.toLowerCase();
      if (name === 'cookie' || name === 'authorization' || name === 'proxy-authorization') continue;
      if (typeof value === 'string') headers[key] = value;
    }
  }
  const response = await fetch(url, body === undefined ? { method, headers } : { method, headers, body });
  const responseHeaders = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });
  return { ok: true, status: response.status, headers: responseHeaders, body: await response.text() };
}

async function ensureAnon() {
  const key = await ensureAnonymousKey({
    anonKey: ANON_KEY,
    async get(keyName) {
      const data = await chrome.storage.local.get(keyName);
      return data[keyName];
    },
    async set(keyName, value) {
      await chrome.storage.local.set({ [keyName]: value });
    }
  });
  return { ok: true, anonymousUserKey: key };
}

function handleMessage(message) {
  switch (message.type) {
    case MSG.CONNECT:
      return enqueueConnection(() => connect(message));
    case MSG.DISCONNECT:
      disconnectRequested = true;
      return enqueueConnection(() => disconnect(message));
    case MSG.REFRESH:
      return enqueueConnection(() => refresh());
    case MSG.PREPARE_SYNC:
      return prepareSync();
    case MSG.LIST_OWNED_FLAGS:
      return listOwnedFlags();
    case MSG.EXECUTE_SYNC:
      return execute(message);
    case MSG.SYNC_REGISTRATION:
      return syncRegistration();
    case MSG.ENSURE_ANON_KEY:
      return ensureAnon();
    case MSG.RELAY_EVENTS:
      return relayEvents(message);
    case MSG.PUBLISH_CONTEXT:
      return publishContext(message);
    default:
      return null;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== 'string' || sender.id !== chrome.runtime.id) return false;
  const pending = handleMessage(message);
  if (!pending) return false;
  pending.then(sendResponse).catch((error) => {
    sendResponse({ ok: false, error: error?.message || 'Unexpected extension error.' });
  });
  return true;
});

function iconPath(settings, url) {
  return toolbarIconColored({
    connected: settings.connected,
    targetDomain: settings.targetDomain,
    url
  })
    ? COLORED_ICON
    : GREY_ICON;
}

async function setToolbarIcon(tabId, path) {
  try {
    await chrome.action.setIcon(tabId ? { tabId, path } : { path });
  } catch {
    // The tab may already be closed.
  }
}

async function syncToolbarIcons(tabId) {
  const settings = await loadSettings();
  if (tabId) {
    let url = '';
    try {
      url = (await chrome.tabs.get(tabId)).url || '';
    } catch {
      return;
    }
    await setToolbarIcon(tabId, iconPath(settings, url));
    return;
  }

  await setToolbarIcon(undefined, GREY_ICON);
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.map((tab) => (tab.id ? setToolbarIcon(tab.id, iconPath(settings, tab.url || '')) : undefined)));
}

readExtensionApiKey().catch(() => {});

chrome.runtime.onInstalled.addListener(() => {
  readExtensionApiKey().catch(() => {});
  syncRegistration();
  syncToolbarIcons();
});

chrome.runtime.onStartup.addListener(() => {
  readExtensionApiKey().catch(() => {});
  syncRegistration();
  syncToolbarIcons();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes[SETTINGS_KEY]) return;
  syncToolbarIcons();
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  syncToolbarIcons(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!changeInfo.url && changeInfo.status !== 'complete') return;
  syncToolbarIcons(tabId);
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  chrome.tabs.query({ active: true, windowId }).then((tabs) => {
    if (tabs[0]?.id) syncToolbarIcons(tabs[0].id);
  });
});

chrome.permissions.onAdded.addListener(() => {
  syncRegistration();
});

chrome.permissions.onRemoved.addListener(() => {
  syncRegistration();
});
