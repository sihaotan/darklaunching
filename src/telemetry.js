import { basicLogger, createClient } from '@launchdarkly/js-client-sdk';
import Observability, { LDObserve } from '@launchdarkly/observability';
import SessionReplay, { LDRecord } from '@launchdarkly/session-replay';
import { isLaunchDarklyTelemetryUrl } from './lib/events.js';

const SOURCE = 'darklaunching-telemetry';
const REQUEST = 'darklaunching-telemetry-request';
const RESPONSE = 'darklaunching-telemetry-response';

if (!globalThis.__darklaunchingTelemetry) {
  globalThis.__darklaunchingTelemetry = true;
  installTelemetry();
}

function installTelemetry() {
  const nativeFetch = globalThis.fetch.bind(globalThis);
  const pending = new Map();
  let sequence = 0;
  let client = null;
  let activeClientId = '';
  let activeDomain = '';
  let chain = Promise.resolve();

  globalThis.fetch = async (input, init) => {
    const url = requestUrl(input);
    if (!isLaunchDarklyTelemetryUrl(url)) return nativeFetch(input, init);
    const method = String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (method !== 'GET' && method !== 'POST') return nativeFetch(input, init);
    const headers = init?.headers || (input instanceof Request ? input.headers : undefined);
    const body = method === 'GET'
      ? undefined
      : init?.body !== undefined
        ? init.body
        : input instanceof Request
          ? await input.clone().arrayBuffer()
          : undefined;
    try {
      const result = await relay({ url, method, headers, body });
      return new Response(result.body ?? '', { status: result.status });
    } catch {
      return nativeFetch(input, init);
    }
  };

  if (typeof navigator.sendBeacon === 'function') {
    const nativeBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url, data) => {
      const target = String(url || '');
      if (!isLaunchDarklyTelemetryUrl(target)) return nativeBeacon(url, data);
      const contentType = data instanceof Blob && data.type ? data.type : 'text/plain;charset=UTF-8';
      relay({ url: target, method: 'POST', headers: { 'content-type': contentType }, body: data }).catch(() => {
        nativeBeacon(url, data);
      });
      return true;
    };
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || typeof event.data !== 'object') return;
    if (event.data.source === RESPONSE) {
      const waiter = pending.get(event.data.id);
      if (!waiter) return;
      clearTimeout(waiter.timer);
      pending.delete(event.data.id);
      if (event.data.ok) waiter.resolve(event.data);
      else waiter.reject(new Error(event.data.error || 'LaunchDarkly did not receive the telemetry.'));
      return;
    }
    if (event.data.source !== SOURCE) return;
    const run = chain.then(() => applyTelemetry(event.data), () => applyTelemetry(event.data));
    chain = run.then(() => undefined, () => undefined);
  });

  function relay({ url, method, headers, body }) {
    const id = ++sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error('LaunchDarkly telemetry request timed out.'));
      }, 20000);
      pending.set(id, { resolve, reject, timer });
      encodeBody(body).then((encoded) => {
        window.postMessage({
          source: REQUEST,
          id,
          url,
          method,
          headers: headerRecord(headers),
          encoding: encoded.encoding,
          body: encoded.body
        }, '*');
      }).catch((error) => {
        clearTimeout(timer);
        pending.delete(id);
        reject(error);
      });
    });
  }

  async function applyTelemetry(message) {
    const enabled = message.active === true && (message.observability === true || message.sessionReplay === true);
    const clientSideId = typeof message.clientSideId === 'string' ? message.clientSideId : '';
    const domain = pageDomain(message);
    if (!enabled || !clientSideId || !message.context || !domain) {
      await stopPlugins();
      return;
    }
    const sessionKey = `${domain}:${message.context.key || ''}`;
    if (!client || activeClientId !== clientSideId || activeDomain !== domain) {
      await stopPlugins();
      const shared = {
        manualStart: true,
        serviceName: domain,
        version: '1.0.0',
        environment: domain,
        tracingOrigins: true,
        networkRecording: { enabled: true },
        contextFriendlyName: (context) => sessionName(context, domain)
      };
      const ld = createClient(clientSideId, message.context, {
        streaming: false,
        sendEvents: false,
        fetchGoals: false,
        logger: basicLogger({ level: 'warn' }),
        plugins: [
          new Observability(shared),
          new SessionReplay({
            ...shared,
            privacySetting: 'default',
            inlineStylesheet: true,
            sendMode: 'local'
          })
        ]
      });
      client = ld;
      activeClientId = clientSideId;
      activeDomain = domain;
      try {
        await ld.start({ timeout: 5 });
      } catch {
        // The plugins can still start from the client-side ID when the flag request is blocked.
      }
      if (client !== ld) return;
    }
    const active = client;
    try {
      if (message.observability === true) await LDObserve.start();
      else await LDObserve.stop();
    } catch {
      // Observability must not block session replay.
    }
    try {
      if (message.sessionReplay === true) await LDRecord.start({ sessionKey });
      else LDRecord.stop();
    } catch {
      // Session replay must not block observability.
    }
    if (client !== active) return;
    try {
      await active.identify(message.context);
    } catch {
      // The recording session still has to receive this domain's user.
    }
  }

  async function stopPlugins() {
    try {
      await LDObserve.stop();
    } catch {
      // Observability may not have started.
    }
    try {
      LDRecord.stop();
    } catch {
      // Session replay may not have started.
    }
    const current = client;
    client = null;
    activeClientId = '';
    activeDomain = '';
    if (!current) return;
    try {
      await current.close();
    } catch {
      // The client may already be closed.
    }
  }
}

function pageDomain(message) {
  const configured = typeof message?.targetDomain === 'string' ? message.targetDomain.trim() : '';
  const attribute = typeof message?.context?.domain === 'string' ? message.context.domain.trim() : '';
  const host = String(location.hostname || '').trim();
  return configured || attribute || host;
}

function sessionName(context, domain) {
  const org = typeof context?.org === 'string' ? context.org.trim() : '';
  const site = typeof context?.domain === 'string' && context.domain.trim() ? context.domain.trim() : domain;
  const key = typeof context?.key === 'string' ? context.key.trim() : '';
  return [org, site, key].filter(Boolean).join(' ');
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
