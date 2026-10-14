const BROWSER_BRANDS = [
  ['Google Chrome', 'Chrome'],
  ['Microsoft Edge', 'Edge'],
  ['Opera', 'Opera'],
  ['Brave', 'Brave'],
  ['Chromium', 'Chromium'],
  ['Firefox', 'Firefox']
];

export const COUNTRY_TTL_MS = 24 * 60 * 60 * 1000;
export const CLOUDFLARE_TRACE_URL = 'https://www.cloudflare.com/cdn-cgi/trace';

function majorVersion(version) {
  const match = String(version ?? '').match(/\d+/);
  return match ? match[0] : '';
}

function normalizePlatform(platform) {
  const value = String(platform ?? '').toLowerCase();
  if (!value) return '';
  if (value.includes('android')) return 'Android';
  if (value.includes('ios') || value.includes('iphone') || value.includes('ipad')) return 'iOS';
  if (value.includes('mac')) return 'macOS';
  if (value.includes('win')) return 'Windows';
  if (value.includes('cros') || value.includes('chrome os')) return 'ChromeOS';
  if (value.includes('linux')) return 'Linux';
  return '';
}

function osFromUserAgent(userAgent) {
  if (/Android/i.test(userAgent)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS';
  if (/Mac OS X|Macintosh/i.test(userAgent)) return 'macOS';
  if (/Windows/i.test(userAgent)) return 'Windows';
  if (/CrOS/i.test(userAgent)) return 'ChromeOS';
  if (/Linux/i.test(userAgent)) return 'Linux';
  return '';
}

function browserFromBrands(brands) {
  if (!Array.isArray(brands)) return '';
  for (const [needle, label] of BROWSER_BRANDS) {
    const match = brands.find((brand) => brand?.brand === needle || String(brand?.brand ?? '').includes(needle));
    if (!match) continue;
    const version = majorVersion(match.version);
    return version ? `${label} ${version}` : label;
  }
  return '';
}

function browserFromUserAgent(userAgent) {
  const edge = userAgent.match(/Edg\/(\d+)/);
  if (edge) return `Edge ${edge[1]}`;
  const opera = userAgent.match(/OPR\/(\d+)/);
  if (opera) return `Opera ${opera[1]}`;
  const firefox = userAgent.match(/Firefox\/(\d+)/);
  if (firefox) return `Firefox ${firefox[1]}`;
  const chrome = userAgent.match(/Chrome\/(\d+)/);
  if (chrome) return `Chrome ${chrome[1]}`;
  const safari = userAgent.match(/Version\/(\d+).+Safari/);
  if (safari) return `Safari ${safari[1]}`;
  return '';
}

export function detectOsBrowser({ userAgent = '', userAgentData = null } = {}) {
  const brands = userAgentData?.fullVersionList || userAgentData?.brands;
  const os = normalizePlatform(userAgentData?.platform) || osFromUserAgent(userAgent) || 'Unknown';
  const browser = browserFromBrands(brands) || browserFromUserAgent(userAgent) || 'Unknown';
  return { os, browser };
}

export function parseCloudflareLoc(text) {
  if (typeof text !== 'string') return null;
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith('loc=')) continue;
    const code = line.slice(4).trim().toUpperCase();
    return /^[A-Z]{2}$/.test(code) ? code : null;
  }
  return null;
}

export function countryNameFromCode(code, displayNames) {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return null;
  try {
    const names = displayNames || new Intl.DisplayNames(['en'], { type: 'region' });
    const name = names.of(code.toUpperCase());
    if (!name || name.toUpperCase() === code.toUpperCase()) return null;
    return name;
  } catch {
    return null;
  }
}

export function countryFromLocale(language, displayNames) {
  if (!language || typeof language !== 'string') return null;
  try {
    const locale = new Intl.Locale(language);
    if (!locale.region) return null;
    return countryNameFromCode(locale.region, displayNames);
  } catch {
    const match = language.match(/[-_]([A-Za-z]{2})$/);
    return match ? countryNameFromCode(match[1], displayNames) : null;
  }
}

export function readCountryCache(cache, now = Date.now()) {
  if (!cache || typeof cache.country !== 'string' || !cache.country || cache.country === 'Unknown') return null;
  if (typeof cache.fetchedAt !== 'number') return null;
  if (now - cache.fetchedAt >= COUNTRY_TTL_MS) return null;
  return cache.country;
}

export async function resolveCountry({ fetchImpl, locale, cache, now = Date.now(), displayNames } = {}) {
  const cached = readCountryCache(cache, now);
  if (cached) return { country: cached, cache: null, fromCache: true };

  try {
    const response = await fetchImpl(CLOUDFLARE_TRACE_URL, {
      method: 'GET',
      cache: 'no-store',
      signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined
    });
    if (response?.ok) {
      const code = parseCloudflareLoc(await response.text());
      const name = code ? countryNameFromCode(code, displayNames) : null;
      if (name) return { country: name, fromCache: false, cache: { country: name, fetchedAt: now } };
    }
  } catch {
    // Fall through to the browser locale, then Unknown.
  }

  const fromLocale = countryFromLocale(locale, displayNames);
  if (fromLocale) return { country: fromLocale, fromCache: false, cache: null };
  return { country: 'Unknown', fromCache: false, cache: null };
}

const RESERVED_ATTRIBUTE_KEYS = new Set(['kind', 'key', 'anonymous', 'os', 'browser', 'country', 'org', 'domain']);

export function attributeKeyError(key, seen = new Set()) {
  const name = String(key ?? '').trim();
  if (!name) return 'Attribute key is required.';
  if (name === 'os' || name === 'browser' || name === 'country' || name === 'org' || name === 'domain') return `${name} is already detected.`;
  if (RESERVED_ATTRIBUTE_KEYS.has(name)) return `${name} is reserved.`;
  if (!/^[A-Za-z][A-Za-z0-9._-]{0,63}$/.test(name)) return 'Start with a letter. Then use letters, numbers, ".", "_", or "-".';
  if (seen.has(name)) return 'This attribute is already used.';
  return '';
}

export function validateContextAttributes(attributes) {
  const errors = {};
  const seen = new Set();
  for (const item of Array.isArray(attributes) ? attributes : []) {
    const key = String(item?.key ?? '').trim();
    const value = String(item?.value ?? '').trim();
    if (!key && !value) continue;
    const keyError = attributeKeyError(key, seen);
    if (keyError) {
      errors[item.id] = keyError;
      continue;
    }
    if (!value) {
      errors[item.id] = 'Attribute value is required.';
      continue;
    }
    seen.add(key);
  }
  return errors;
}

export function customAttributes(attributes) {
  const applied = {};
  const seen = new Set();
  for (const item of Array.isArray(attributes) ? attributes : []) {
    const key = String(item?.key ?? '').trim();
    const value = String(item?.value ?? '');
    if (!String(value).trim() || attributeKeyError(key, seen)) continue;
    seen.add(key);
    applied[key] = value;
  }
  return applied;
}

export function buildContext({ anonymous, userKey, anonymousKey, os, browser, country, org = '', domain = '', attributes = [] }) {
  return {
    kind: 'user',
    key: anonymous ? anonymousKey : String(userKey ?? '').trim(),
    anonymous: Boolean(anonymous),
    os,
    browser,
    country,
    org: String(org ?? '').trim(),
    domain: String(domain ?? '').trim(),
    ...customAttributes(attributes)
  };
}

export function sameEvaluationContext(left, right) {
  if (!left || !right) return false;
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    if (left[key] !== right[key]) return false;
  }
  return true;
}

export function isEvaluationContext(value) {
  return Boolean(
    value &&
      value.kind === 'user' &&
      typeof value.key === 'string' &&
      value.key.trim() &&
      typeof value.anonymous === 'boolean' &&
      typeof value.os === 'string' &&
      typeof value.browser === 'string' &&
      typeof value.country === 'string' &&
      typeof value.org === 'string' &&
      typeof value.domain === 'string'
  );
}

export async function detectOsBrowserFromNavigator(nav = globalThis.navigator) {
  let userAgentData = nav?.userAgentData || null;
  if (userAgentData?.getHighEntropyValues) {
    try {
      const high = await userAgentData.getHighEntropyValues(['platform', 'fullVersionList']);
      userAgentData = {
        platform: high.platform || userAgentData.platform,
        brands: high.fullVersionList || userAgentData.brands,
        fullVersionList: high.fullVersionList
      };
    } catch {
      // Low-entropy values and the user agent string still identify the browser.
    }
  }
  return detectOsBrowser({ userAgent: nav?.userAgent || '', userAgentData });
}
