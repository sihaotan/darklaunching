import { isValidCssSelector } from './dom.js';
import { sanitizeKey } from './sanitize.js';

export const OWNERSHIP_TAG = 'darklaunching';
const MAX_TAG_LENGTH = 64;

export function customerTag(customerName) {
  const words = String(customerName ?? '').match(/[A-Za-z0-9]+/g);
  if (!words) return '';
  const tag = words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
    .slice(0, MAX_TAG_LENGTH);
  return /^[A-Za-z0-9]{1,64}$/.test(tag) ? tag : '';
}

function legacyCustomerTags(customerName) {
  const key = sanitizeKey(customerName);
  if (!key) return [];
  return [`customer.${key}`, `customer:${key}`]
    .map((tag) => tag.slice(0, MAX_TAG_LENGTH).replace(/[.:-]+$/g, ''))
    .filter((tag) => tag && tag !== 'customer');
}

export function customerTagChange(flag, customerName) {
  const addTag = customerTag(customerName);
  const tags = Array.isArray(flag?.tags) ? flag.tags : [];
  if (!addTag || tags.includes(addTag)) return null;
  return {
    addTag,
    removeTags: legacyCustomerTags(customerName).filter((tag) => tags.includes(tag))
  };
}

export function flagIdentity(customerName, divName) {
  const name = `${String(customerName ?? '').trim()} - ${String(divName ?? '').trim()}`;
  return { name, key: sanitizeKey(name) };
}

export function isOwned(flag, customerName) {
  const tags = new Set(flag?.tags || []);
  const tag = customerTag(customerName);
  if (!tag || !tags.has(OWNERSHIP_TAG)) return false;
  if (tags.has(tag)) return true;
  return legacyCustomerTags(customerName).some((legacy) => tags.has(legacy));
}

export function isBooleanFlag(flag) {
  const values = new Set((flag?.variations || []).map((variation) => variation?.value));
  return values.has(true) && values.has(false);
}

function offVariationIndex(flag, environmentKey) {
  const env = flag?.environments?.[environmentKey];
  if (typeof env?.offVariation === 'number') return env.offVariation;
  const summary = env?._summary?.variations;
  if (summary && typeof summary === 'object') {
    const found = Object.entries(summary).find(([, item]) => item?.isOff === true);
    if (found) {
      const index = Number(found[0]);
      if (Number.isInteger(index) && index >= 0) return index;
    }
  }
  return typeof flag?.defaults?.offVariation === 'number' ? flag.defaults.offVariation : undefined;
}

export function divNameFromFlag(flag, customerName) {
  const name = String(flag?.name || flag?.key || '').trim();
  const prefix = `${String(customerName || '').trim()} - `;
  if (String(customerName || '').trim() && name.startsWith(prefix)) return name.slice(prefix.length).trim();
  return name;
}

function selectorFromDescription(description) {
  const value = String(description ?? '').trim();
  if (!value || !/[#.\[>:~+]/.test(value)) return '';
  return isValidCssSelector(value) ? value : '';
}

export function ownedFlagSummary(flag, environmentKey) {
  const env = flag?.environments?.[environmentKey] || {};
  return {
    key: String(flag?.key || ''),
    name: String(flag?.name || ''),
    description: String(flag?.description || ''),
    tags: Array.isArray(flag?.tags) ? flag.tags.filter((tag) => typeof tag === 'string') : [],
    variations: Array.isArray(flag?.variations) ? flag.variations.map((variation) => ({ value: variation?.value })) : [],
    defaults: flag?.defaults,
    environments: {
      [environmentKey]: {
        offVariation: env.offVariation,
        _summary: env._summary
      }
    }
  };
}

export function rowsFromOwnedFlags({ flags, customerName, environmentKey, existingDivs = [], uuid = () => '' }) {
  const customer = String(customerName || '').trim();
  const owned = (flags || []).filter((flag) => {
    const tags = new Set(flag?.tags || []);
    if (!tags.has(OWNERSHIP_TAG)) return false;
    return customer ? isOwned(flag, customer) : true;
  });
  const existingByKey = new Map();
  for (const div of existingDivs) {
    const identity = flagIdentity(customer, div?.name || '');
    if (identity.key) existingByKey.set(identity.key, div);
  }
  const usedIds = new Set();
  const rows = owned.map((flag) => {
    const name = divNameFromFlag(flag, customer);
    const previous = existingByKey.get(flag.key) || existingByKey.get(flagIdentity(customer, name).key);
    if (previous?.id) usedIds.add(previous.id);
    const off = offVariationValue(flag, environmentKey);
    return {
      id: previous?.id || uuid(),
      name,
      selector: String(previous?.selector || selectorFromDescription(flag.description) || ''),
      defaultState: typeof off === 'boolean' ? off : false,
      whenFalse: previous?.whenFalse === 'show' ? 'show' : 'hide'
    };
  });
  const extras = existingDivs.filter((div) => div?.id && !usedIds.has(div.id));
  return [...rows, ...extras];
}

export function offVariationValue(flag, environmentKey) {
  const index = offVariationIndex(flag, environmentKey);
  if (typeof index !== 'number') return undefined;
  const variation = flag?.variations?.[index];
  if (!variation || !Object.prototype.hasOwnProperty.call(variation, 'value')) return undefined;
  return variation.value;
}

export function variationIdForValue(flag, value) {
  const variation = (flag?.variations || []).find((item) => item?.value === value && item._id);
  return variation?._id || '';
}

export function createFlagBody(customerName, div) {
  const identity = flagIdentity(customerName, div.name);
  const offVariation = div.defaultState === true ? 0 : 1;
  return {
    name: identity.name,
    key: identity.key,
    tags: [OWNERSHIP_TAG, customerTag(customerName)].filter(Boolean),
    variations: [{ value: true }, { value: false }],
    defaults: { offVariation, onVariation: offVariation === 0 ? 1 : 0 },
    clientSideAvailability: { usingEnvironmentId: true, usingMobileKey: false }
  };
}

export function validateDivRows(divs, customerName) {
  const errors = {};
  const keys = [];
  for (const div of divs) {
    const name = String(div?.name ?? '').trim();
    const selector = String(div?.selector ?? '').trim();
    if (!name) {
      errors[div.id] = 'Name is required.';
      continue;
    }
    if (!sanitizeKey(name)) {
      errors[div.id] = 'Name does not produce a valid flag key.';
      continue;
    }
    if (!selector) {
      errors[div.id] = 'CSS selector is required.';
      continue;
    }
    if (!isValidCssSelector(selector)) {
      errors[div.id] = 'Enter a CSS selector from Copy selector.';
      continue;
    }
    const identity = flagIdentity(customerName, name);
    if (!identity.key) {
      errors[div.id] = 'Name does not produce a valid flag key.';
      continue;
    }
    keys.push({ id: div.id, key: identity.key });
  }
  const counts = new Map();
  for (const item of keys) counts.set(item.key, (counts.get(item.key) || 0) + 1);
  for (const item of keys) {
    if (counts.get(item.key) > 1) errors[item.id] = 'Duplicate flag key.';
  }
  return errors;
}

export function planSync({ divs, flags, customerName, environmentKey }) {
  const rowErrors = validateDivRows(divs, customerName);
  const desired = new Map();
  const blocked = new Set();

  for (const div of divs) {
    const identity = flagIdentity(customerName, div.name || '');
    if (rowErrors[div.id]) {
      if (identity.key && sanitizeKey(div.name)) blocked.add(identity.key);
      continue;
    }
    desired.set(identity.key, { div, identity });
  }

  const remoteByKey = new Map((flags || []).map((flag) => [flag.key, flag]));
  const creates = [];
  const updates = [];
  const prunes = [];
  const skips = [];
  const failures = [];

  for (const [key, item] of desired) {
    const remote = remoteByKey.get(key);
    if (!remote) {
      creates.push(item);
      continue;
    }
    if (!isOwned(remote, customerName)) {
      skips.push({
        key,
        name: remote.name || key,
        divId: item.div.id,
        reason: 'Key already used by another flag'
      });
      continue;
    }
    if (!isBooleanFlag(remote)) {
      failures.push({
        key,
        name: remote.name || key,
        divId: item.div.id,
        message: 'Flag exists but is not a boolean flag.'
      });
      continue;
    }
    const tagChange = customerTagChange(remote, customerName);
    const current = offVariationValue(remote, environmentKey);
    if (current === undefined) {
      failures.push({
        key,
        name: remote.name || key,
        divId: item.div.id,
        message: 'Could not read the off variation for this environment.'
      });
      continue;
    }
    const variationChanged = current !== item.div.defaultState;
    if (!variationChanged && !tagChange) continue;
    let variationId = '';
    if (variationChanged) {
      variationId = variationIdForValue(remote, item.div.defaultState);
      if (!variationId) {
        failures.push({
          key,
          name: remote.name || key,
          divId: item.div.id,
          message: 'Could not find a variation id for the selected default.'
        });
        continue;
      }
    }
    updates.push({ ...item, ...(variationId ? { variationId } : {}), ...(tagChange || {}) });
  }

  for (const flag of flags || []) {
    if (!isOwned(flag, customerName)) continue;
    if (desired.has(flag.key) || blocked.has(flag.key)) continue;
    prunes.push({ key: flag.key, name: flag.name || flag.key });
  }

  return { creates, updates, prunes, skips, failures, rowErrors };
}
