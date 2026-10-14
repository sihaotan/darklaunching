import { basicLogger, createClient } from '@launchdarkly/js-client-sdk';
import {
  buildContext,
  detectOsBrowserFromNavigator,
  isEvaluationContext,
  resolveCountry,
  sameEvaluationContext
} from './lib/context.js';
import { cleanSettings, validateUserContext } from './lib/config.js';
import { applyMappings, createMemory, findElements, resetManagedElements } from './lib/dom.js';
import { hostMatchesTarget } from './lib/domain.js';
import { isLaunchDarklyEventsUrl } from './lib/events.js';
import { flagIdentity } from './lib/flags.js';
import { ANON_KEY, CONTEXT_DELIVERY_KEY, COUNTRY_CACHE_KEY, SDK_STATUS_KEY, SETTINGS_KEY } from './lib/keys.js';
import { MSG } from './lib/messages.js';
import { ensureAnonymousKey } from './lib/uuid.js';

const memory = createMemory();
const storage = {
  anonKey: ANON_KEY,
  async get(key) {
    const data = await chrome.storage.local.get(key);
    return data[key];
  },
  async set(key, value) {
    await chrome.storage.local.set({ [key]: value });
  }
};

let chain = Promise.resolve();
let client = null;
let activeClientId = '';
let activeContext = null;
let settings = cleanSettings();
let observer = null;
let applyQueued = false;
let flushTimer = 0;
let lastEvaluations = [];

const nativeFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (input, init) => {
  const url = requestUrl(input);
  if (!isLaunchDarklyEventsUrl(url)) return nativeFetch(input, init);
  return relayEvents(url, init);
};

function requestUrl(input) {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  if (input && typeof input.url === 'string') return input.url;
  return '';
}

function headerRecord(headers) {
  const record = {};
  if (!headers) return record;
  new Headers(headers).forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

async function relayEvents(url, init = {}) {
  let response;
  try {
    response = await chrome.runtime.sendMessage({
      type: MSG.RELAY_EVENTS,
      url,
      method: init.method || 'POST',
      headers: headerRecord(init.headers),
      body: typeof init.body === 'string' ? init.body : ''
    });
  } catch (error) {
    throw new Error(error?.message || 'Could not send the user context to LaunchDarkly.');
  }
  if (!response?.ok) throw new Error(response?.error || 'Could not send the user context to LaunchDarkly.');
  const status = Number(response.status);
  if (!Number.isInteger(status) || status < 200 || status > 599) {
    throw new Error('LaunchDarkly did not receive the user context.');
  }
  if (status > 204) writeSdkStatus(false, 'LaunchDarkly did not receive the user context.');
  const date = response.headers?.date || response.headers?.Date;
  return new Response(response.body ?? '', { status, headers: date ? { date } : {} });
}

function enqueue(task) {
  const run = chain.then(task, task);
  chain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function memoryStorage() {
  const data = new Map();
  return {
    async get(key) {
      return data.has(key) ? data.get(key) : null;
    },
    async set(key, value) {
      data.set(key, value);
    },
    async clear(key) {
      data.delete(key);
    }
  };
}

function sameContext(left, right) {
  return sameEvaluationContext(left, right);
}

function scheduleApply() {
  if (applyQueued) return;
  applyQueued = true;
  requestAnimationFrame(() => {
    applyQueued = false;
    try {
      applyFlags();
    } catch {
      // A DOM failure must not break the host page.
    }
  });
}

function applyFlags() {
  if (!client) return;
  const mappings = [];
  const evaluations = [];
  for (const div of settings.divs) {
    const name = String(div.name ?? '').trim();
    const selector = String(div.selector ?? '').trim();
    if (!name || !selector) continue;
    const identity = flagIdentity(settings.customerName, name);
    if (!identity.key) continue;
    const fallback = div.whenFalse === 'show' ? false : true;
    const detail = client.variationDetail(identity.key, fallback);
    evaluations.push({
      key: identity.key,
      value: detail?.value,
      default: fallback,
      variation: detail?.variationIndex
    });
    mappings.push({
      elements: findElements(document, selector),
      action: div.whenFalse,
      value: detail?.value
    });
  }
  lastEvaluations = evaluations;
  applyMappings(mappings, memory);
  scheduleFlush();
}

function ensureObserver() {
  if (observer || !document.documentElement) return;
  observer = new MutationObserver(() => scheduleApply());
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

async function writeSdkStatus(ok, message) {
  await chrome.storage.local.set({
    [SDK_STATUS_KEY]: { ok: Boolean(ok), message: message || '', at: Date.now() }
  });
}

function scheduleFlush() {
  clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushClient().catch(() => {});
  }, 250);
}

async function flushClient(ld = client) {
  if (!ld?.flush) return;
  try {
    const result = await ld.flush();
    if (result?.result === false) {
      await writeSdkStatus(false, 'LaunchDarkly did not receive the user context.');
    }
  } catch {
    await writeSdkStatus(false, 'LaunchDarkly did not receive the user context.');
  }
}

async function stopClient() {
  clearTimeout(flushTimer);
  const current = client;
  client = null;
  activeClientId = '';
  if (!current) return;
  try {
    await current.flush();
  } catch {
    // Closing still has to proceed when the last event batch cannot be sent.
  }
  try {
    await current.close();
  } catch {
    // The client may already be closed.
  }
}

async function publishContext(clientSideId, context) {
  let delivery;
  try {
    const result = await chrome.runtime.sendMessage({
      type: MSG.PUBLISH_CONTEXT,
      clientSideId,
      context,
      evaluations: lastEvaluations
    });
    delivery = result?.ok
      ? { ok: true, key: result.key, anonymous: Boolean(result.anonymous), at: result.at || Date.now() }
      : { ok: false, error: result?.error || 'LaunchDarkly did not receive the user context.', at: Date.now() };
  } catch (error) {
    delivery = { ok: false, error: error?.message || 'LaunchDarkly did not receive the user context.', at: Date.now() };
  }
  await chrome.storage.local.set({ [CONTEXT_DELIVERY_KEY]: delivery });
  if (!delivery.ok) await writeSdkStatus(false, delivery.error);
}

async function startClient(clientSideId, context) {
  try {
    await startClientNow(clientSideId, context);
  } catch (error) {
    await stopClient();
    await writeSdkStatus(false, error?.message || 'LaunchDarkly client failed to start.');
  }
}

async function startClientNow(clientSideId, context) {
  await stopClient();
  ensureObserver();
  const ld = createClient(clientSideId, context, {
    streaming: true,
    sendEvents: true,
    flushInterval: 2,
    fetchGoals: false,
    automaticBackgroundHandling: true,
    storage: memoryStorage(),
    applicationInfo: { id: 'darklaunching', version: '1.0.0' },
    logger: basicLogger({ level: 'warn' })
  });
  client = ld;
  activeClientId = clientSideId;
  activeContext = context;
  ld.on('change', () => scheduleApply());
  ld.on('initialized', () => {
    writeSdkStatus(true, '');
    scheduleApply();
  });
  const result = await ld.start({ timeout: 5 });
  if (client !== ld) return;
  if (result?.status === 'failed') {
    await writeSdkStatus(false, result.error?.message || 'LaunchDarkly client failed to initialize.');
  } else if (result?.status !== 'complete') {
    await writeSdkStatus(false, 'LaunchDarkly client is still connecting. Flag changes will apply when it does.');
  } else {
    await writeSdkStatus(true, '');
  }
  try {
    applyFlags();
  } catch {
    // A DOM failure must not block the context event.
  }
  await flushClient(ld);
  await publishContext(clientSideId, context);
}

async function buildPageContext(currentSettings) {
  const detected = await detectOsBrowserFromNavigator(navigator);
  const cache = await storage.get(COUNTRY_CACHE_KEY);
  const country = await resolveCountry({
    fetchImpl: fetch,
    locale: navigator.language,
    cache
  });
  if (country.cache) await storage.set(COUNTRY_CACHE_KEY, country.cache);
  const anonymousKey = currentSettings.anonymous ? await ensureAnonymousKey(storage) : '';
  return buildContext({
    anonymous: currentSettings.anonymous,
    userKey: currentSettings.userKey,
    anonymousKey,
    os: detected.os,
    browser: detected.browser,
    country: country.country,
    org: currentSettings.customerName,
    domain: currentSettings.targetDomain,
    attributes: currentSettings.attributes
  });
}

async function shutdownNow() {
  const hadClient = Boolean(client);
  resetManagedElements(memory);
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  activeContext = null;
  await stopClient();
  if (hadClient) await writeSdkStatus(true, '');
}

async function reconfigureNow({ force = false } = {}) {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  settings = cleanSettings(stored[SETTINGS_KEY] || {});
  if (!settings.connected || !settings.clientSideId || !hostMatchesTarget(location.hostname, settings.targetDomain)) {
    await shutdownNow();
    return;
  }
  if (!validateUserContext(settings).ok) {
    await shutdownNow();
    return;
  }
  const context = await buildPageContext(settings);
  if (!isEvaluationContext(context)) {
    await shutdownNow();
    return;
  }
  ensureObserver();
  if (!force && client && activeClientId === settings.clientSideId && sameContext(activeContext, context)) {
    scheduleApply();
    return;
  }
  if (!force && client && activeClientId === settings.clientSideId) {
    activeContext = context;
    await client.identify(context, { timeout: 5 });
    try {
      applyFlags();
    } catch {
      // A DOM failure must not block the context event.
    }
    await flushClient();
    await publishContext(settings.clientSideId, context);
    return;
  }
  await startClient(settings.clientSideId, context);
}

async function identifyNow(context) {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  settings = cleanSettings(stored[SETTINGS_KEY] || {});
  if (!settings.connected || !settings.clientSideId || !hostMatchesTarget(location.hostname, settings.targetDomain)) {
    await shutdownNow();
    return;
  }
  if (!isEvaluationContext(context)) {
    await shutdownNow();
    return;
  }
  if (!client || activeClientId !== settings.clientSideId) {
    await startClient(settings.clientSideId, context);
    return;
  }
  activeContext = context;
  await client.identify(context, { timeout: 5 });
  try {
    applyFlags();
  } catch {
    // A DOM failure must not block the context event.
  }
  await flushClient();
  await publishContext(settings.clientSideId, context);
}

function createController() {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message.type !== 'string') return false;
    if (message.type === MSG.IDENTIFY) {
      enqueue(() => identifyNow(message.context))
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({ ok: false, error: error?.message || 'Could not update the user context.' }));
      return true;
    }
    if (message.type === MSG.RECONFIGURE) {
      enqueue(() => reconfigureNow({ force: message.force === true }))
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({ ok: false, error: error?.message || 'Could not reconfigure flags.' }));
      return true;
    }
    if (message.type === MSG.SHUTDOWN) {
      enqueue(() => shutdownNow())
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({ ok: false, error: error?.message || 'Could not stop flag evaluation.' }));
      return true;
    }
    return false;
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[SETTINGS_KEY]) return;
    enqueue(() => reconfigureNow());
  });

  enqueue(() => reconfigureNow());
  return {
    reconfigure() {
      return enqueue(() => reconfigureNow());
    }
  };
}

if (globalThis.__darklaunching?.reconfigure) {
  globalThis.__darklaunching.reconfigure();
} else {
  globalThis.__darklaunching = createController();
}
