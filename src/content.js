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
import { isLaunchDarklyEventsUrl, isLaunchDarklyTelemetryUrl } from './lib/events.js';
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
let clientReady = false;
let needsEvaluation = true;
const evaluationCache = new Map();
const TELEMETRY_SOURCE = 'darklaunching-telemetry';
const TELEMETRY_REQUEST = 'darklaunching-telemetry-request';
const TELEMETRY_RESPONSE = 'darklaunching-telemetry-response';

const nativeFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = async (input, init) => {
  const url = requestUrl(input);
  if (!isLaunchDarklyTelemetryUrl(url)) return nativeFetch(input, init);
  const method = String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  if (method !== 'POST') return nativeFetch(input, init);
  const headers = init?.headers || (input instanceof Request ? input.headers : undefined);
  const body = init?.body !== undefined ? init.body : input instanceof Request ? await input.clone().arrayBuffer() : undefined;
  return relayEvents(url, { method, headers, body });
};

window.addEventListener('message', (event) => {
  if (event.source !== window || event.data?.source !== TELEMETRY_REQUEST) return;
  const request = event.data;
  const body = request.encoding === 'base64' ? base64ToBytes(request.body) : request.body;
  relayEvents(request.url, { method: request.method || 'POST', headers: request.headers, body })
    .then(async (response) => {
      window.postMessage({
        source: TELEMETRY_RESPONSE,
        id: request.id,
        ok: true,
        status: response.status,
        body: await response.text()
      }, '*');
    })
    .catch((error) => {
      window.postMessage({
        source: TELEMETRY_RESPONSE,
        id: request.id,
        ok: false,
        error: error?.message || 'LaunchDarkly did not receive the telemetry.'
      }, '*');
    });
});

if (typeof navigator.sendBeacon === 'function') {
  const nativeBeacon = navigator.sendBeacon.bind(navigator);
  navigator.sendBeacon = (url, data) => {
    const target = String(url || '');
    if (!isLaunchDarklyTelemetryUrl(target)) return nativeBeacon(url, data);
    const contentType = data instanceof Blob && data.type ? data.type : 'text/plain;charset=UTF-8';
    relayEvents(target, { method: 'POST', headers: { 'content-type': contentType }, body: data }).catch(() => {});
    return true;
  };
}

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

function base64ToBytes(value) {
  const binary = atob(String(value || ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

async function encodeBody(body) {
  if (body == null || body === '') return { encoding: 'text', body: '' };
  if (typeof body === 'string') return { encoding: 'text', body };
  if (body instanceof URLSearchParams) return { encoding: 'text', body: body.toString() };
  let bytes;
  if (body instanceof Blob) bytes = new Uint8Array(await body.arrayBuffer());
  else if (body instanceof ArrayBuffer) bytes = new Uint8Array(body);
  else if (ArrayBuffer.isView(body)) bytes = new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
  else if (typeof body.getReader === 'function') bytes = new Uint8Array(await new Response(body).arrayBuffer());
  else return { encoding: 'text', body: '' };
  return { encoding: 'base64', body: bytesToBase64(bytes) };
}

async function relayEvents(url, init = {}) {
  const encoded = await encodeBody(init.body);
  let response;
  try {
    response = await chrome.runtime.sendMessage({
      type: MSG.RELAY_EVENTS,
      url,
      method: init.method || 'POST',
      headers: headerRecord(init.headers),
      encoding: encoded.encoding,
      body: encoded.body
    });
  } catch (error) {
    throw new Error(error?.message || 'Could not send the user context to LaunchDarkly.');
  }
  if (!response?.ok) throw new Error(response?.error || 'Could not send the user context to LaunchDarkly.');
  const status = Number(response.status);
  if (!Number.isInteger(status) || status < 200 || status > 599) {
    throw new Error('LaunchDarkly did not receive the user context.');
  }
  if (status > 204 && isLaunchDarklyEventsUrl(url)) writeSdkStatus(false, 'LaunchDarkly did not receive the user context.');
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

function invalidateEvaluations() {
  needsEvaluation = true;
}

function applyFlags() {
  if (!client) return;
  const evaluate = needsEvaluation && clientReady;
  if (evaluate) needsEvaluation = false;
  const mappings = [];
  const evaluations = [];
  const seen = new Set();
  let counted = false;
  for (const div of settings.divs) {
    const name = String(div.name ?? '').trim();
    const selector = String(div.selector ?? '').trim();
    if (!name || !selector) continue;
    const identity = flagIdentity(settings.customerName, name);
    if (!identity.key) continue;
    seen.add(identity.key);
    const fallback = div.whenFalse === 'show' ? false : true;
    let cached = evaluationCache.get(identity.key);
    if (clientReady && (evaluate || !cached || cached.default !== fallback)) {
      const detail = client.variationDetail(identity.key, fallback);
      cached = {
        value: detail?.value,
        default: fallback,
        variation: detail?.variationIndex
      };
      evaluationCache.set(identity.key, cached);
      counted = true;
    }
    const value = cached ? cached.value : fallback;
    evaluations.push({
      key: identity.key,
      value,
      default: fallback,
      variation: cached?.variation
    });
    mappings.push({
      elements: findElements(document, selector),
      action: div.whenFalse,
      value
    });
  }
  for (const key of evaluationCache.keys()) {
    if (!seen.has(key)) evaluationCache.delete(key);
  }
  lastEvaluations = evaluations;
  applyMappings(mappings, memory);
  if (counted) scheduleFlush();
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

function publishTelemetry(active) {
  window.postMessage({
    source: TELEMETRY_SOURCE,
    active: active === true,
    clientSideId: active ? activeClientId : '',
    context: active ? activeContext : null,
    observability: settings.collecting === true && settings.observability === true,
    sessionReplay: settings.collecting === true && settings.sessionReplay === true,
    targetDomain: settings.targetDomain || location.hostname
  }, '*');
}

async function stopClient() {
  clearTimeout(flushTimer);
  const current = client;
  client = null;
  activeClientId = '';
  clientReady = false;
  needsEvaluation = true;
  evaluationCache.clear();
  publishTelemetry(false);
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
      context
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
  publishTelemetry(true);
  ld.on('change', () => {
    invalidateEvaluations();
    scheduleApply();
  });
  ld.on('initialized', () => {
    clientReady = true;
    invalidateEvaluations();
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
    clientReady = true;
    await writeSdkStatus(true, '');
  }
  if (client === ld) publishTelemetry(true);
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
    publishTelemetry(true);
    return;
  }
  if (!force && client && activeClientId === settings.clientSideId) {
    activeContext = context;
    await client.identify(context, { timeout: 5 });
    invalidateEvaluations();
    publishTelemetry(true);
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
  invalidateEvaluations();
  publishTelemetry(true);
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
