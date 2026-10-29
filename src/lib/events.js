export const LD_EVENTS_ORIGIN = 'https://events.launchdarkly.com';

const TELEMETRY_HOSTS = new Set([
  'events.launchdarkly.com',
  'clientsdk.launchdarkly.com',
  'clientstream.launchdarkly.com',
  'pub.observability.app.launchdarkly.com',
  'otel.observability.app.launchdarkly.com',
  'pub.observability.app.eu.launchdarkly.com',
  'otel.observability.app.eu.launchdarkly.com'
]);

export function isLaunchDarklyEventsUrl(value) {
  return isLaunchDarklyHost(value, new Set(['events.launchdarkly.com']));
}

export function isLaunchDarklyTelemetryUrl(value) {
  return isLaunchDarklyHost(value, TELEMETRY_HOSTS);
}

function isLaunchDarklyHost(value, hosts) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && hosts.has(url.hostname) && url.username === '' && url.password === '';
  } catch {
    return false;
  }
}

export function isClientSideId(value) {
  return /^[A-Za-z0-9_-]{8,128}$/.test(String(value || ''));
}

export function contextEventBatch(context, evaluations = [], now = Date.now()) {
  if (!context || context.kind !== 'user' || typeof context.key !== 'string' || !context.key.trim()) return null;
  const safe = {
    kind: 'user',
    key: context.key.trim(),
    anonymous: context.anonymous === true,
    os: typeof context.os === 'string' ? context.os : '',
    browser: typeof context.browser === 'string' ? context.browser : '',
    country: typeof context.country === 'string' ? context.country : ''
  };
  for (const name of Object.keys(context)) {
    if (name === 'kind' || name === 'key' || name === 'anonymous' || name === 'os' || name === 'browser' || name === 'country') continue;
    if (typeof context[name] === 'string') safe[name] = context[name];
  }
  const events = [
    { kind: 'index', creationDate: now, context: safe },
    { kind: 'identify', creationDate: now, context: safe }
  ];
  const features = {};
  for (const evaluation of Array.isArray(evaluations) ? evaluations : []) {
    const key = String(evaluation?.key || '').trim();
    if (!key || Object.hasOwn(features, key)) continue;
    const counter = { value: evaluation.value, count: 1 };
    if (Number.isInteger(evaluation.variation)) counter.variation = evaluation.variation;
    if (Number.isInteger(evaluation.version)) counter.version = evaluation.version;
    else counter.unknown = true;
    features[key] = {
      default: evaluation.default,
      contextKinds: ['user'],
      counters: [counter]
    };
  }
  if (Object.keys(features).length) {
    events.push({ kind: 'summary', startDate: now, endDate: now, context: safe, features });
  }
  return events;
}
