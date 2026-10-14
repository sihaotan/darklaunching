import { normalizeProjectPayload } from './projects.js';

export const LD_API_ORIGIN = 'https://app.launchdarkly.com';
const MAX_PAGES = 200;
const MAX_RETRY_WAIT_MS = 20000;

export class LdError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'LdError';
    this.status = status;
  }
}

export function parseRetryAfter(header, now = Date.now()) {
  if (header == null || header === '') return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000);
  const date = Date.parse(String(header));
  if (!Number.isNaN(date)) return Math.max(0, date - now);
  return null;
}

export function toApiPath(href) {
  if (!href || typeof href !== 'string') return null;
  if (href.startsWith('http://') || href.startsWith('https://')) {
    const url = new URL(href);
    if (url.origin !== LD_API_ORIGIN) {
      throw new LdError('Refusing to follow a pagination link off app.launchdarkly.com.');
    }
    return `${url.pathname}${url.search}`;
  }
  if (href.startsWith('/')) return href;
  return `/${href}`;
}

export function resolveApiUrl(path) {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    const url = new URL(path);
    if (url.origin !== LD_API_ORIGIN) throw new LdError('Refusing to send the API key to a non-LaunchDarkly host.');
    return url.toString();
  }
  const pathOnly = path.startsWith('/') ? path : `/${path}`;
  return `${LD_API_ORIGIN}${pathOnly}`;
}

function buildHeaders({ apiKey, headers, body }) {
  const result = { Authorization: apiKey, Accept: 'application/json' };
  if (body !== undefined) result['Content-Type'] = 'application/json';
  if (headers) Object.assign(result, headers);
  return result;
}

export async function readError(response) {
  let apiMessage = '';
  try {
    const data = await response.json();
    apiMessage = typeof data?.message === 'string' ? data.message : '';
  } catch {
    apiMessage = '';
  }
  if (apiMessage.length > 300 || /api-[A-Za-z0-9]/.test(apiMessage)) apiMessage = '';
  if (response.status === 401 || response.status === 403) {
    return apiMessage
      ? `The API key was rejected or lacks permission to manage flags. ${apiMessage}`
      : 'The API key was rejected or lacks permission to manage flags.';
  }
  if (response.status === 429) {
    const retry = response.headers?.get?.('Retry-After');
    const suffix = retry ? ` Retry after ${retry}.` : '';
    return `LaunchDarkly rate limit reached.${suffix}`;
  }
  return apiMessage || `LaunchDarkly request failed (${response.status}).`;
}

export async function ldRequest(path, options = {}) {
  const url = resolveApiUrl(path);
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  let attempt = 0;
  while (true) {
    let response;
    try {
      response = await fetchImpl(url, {
        method: options.method ?? 'GET',
        headers: buildHeaders(options),
        body: options.body === undefined ? undefined : typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
      });
    } catch {
      throw new LdError('Could not reach LaunchDarkly. Check your connection and try again.', 0);
    }
    if (response.status === 429 && attempt < 3) {
      const delay = parseRetryAfter(response.headers?.get?.('Retry-After')) ?? Math.min(1000 * 2 ** attempt, 8000);
      if (delay <= MAX_RETRY_WAIT_MS) {
        attempt += 1;
        try {
          await response.body?.cancel?.();
        } catch {
          // The body is unused when we retry.
        }
        await sleep(delay);
        continue;
      }
    }
    return response;
  }
}

export function nextHref(data) {
  const next = data?._links?.next;
  if (!next) return null;
  if (typeof next === 'string') return next;
  return next.href || null;
}

async function getJsonPages(firstPath, options) {
  const items = [];
  let path = firstPath;
  const seen = new Set();
  let pages = 0;
  while (path) {
    if (seen.has(path) || pages >= MAX_PAGES) break;
    seen.add(path);
    pages += 1;
    const response = await ldRequest(path, options);
    if (!response.ok) throw new LdError(await readError(response), response.status);
    const data = await response.json();
    if (Array.isArray(data.items)) items.push(...data.items);
    const next = nextHref(data);
    path = next ? toApiPath(next) : null;
    if (path && options.environmentKey) path = flagListPath(path, options.environmentKey);
  }
  return items;
}

export async function listProjects(options) {
  const items = await getJsonPages('/api/v2/projects?expand=environments&limit=100', options);
  return items.map(normalizeProjectPayload).filter((project) => project.key);
}

function flagListPath(path, environmentKey) {
  const url = new URL(path, LD_API_ORIGIN);
  if (environmentKey && !url.searchParams.has('env')) url.searchParams.set('env', environmentKey);
  url.searchParams.set('summary', '0');
  return `${url.pathname}${url.search}`;
}

export function listAllFlags({ projectKey, environmentKey, ...options }) {
  const path = flagListPath(
    `/api/v2/flags/${encodeURIComponent(projectKey)}?limit=100&env=${encodeURIComponent(environmentKey)}`,
    environmentKey
  );
  return getJsonPages(path, { ...options, environmentKey });
}
