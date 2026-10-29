import { createUuid } from './uuid.js';
import { normalizeDomain, isValidHostname } from './domain.js';
import { sanitizeKey } from './sanitize.js';

export function defaultSettings() {
  return {
    customerName: '',
    targetDomain: '',
    projectKey: '',
    environmentKey: '',
    clientSideId: '',
    projects: [],
    anonymous: true,
    userKey: '',
    observability: false,
    sessionReplay: false,
    collecting: false,
    attributes: [],
    divs: [],
    connected: false,
    notice: ''
  };
}

export function preserveText(stored, incoming) {
  const next = String(incoming ?? '');
  return next.trim() ? next : String(stored ?? '');
}

export function preserveDivs(stored, incoming) {
  const previous = new Map((Array.isArray(stored) ? stored : []).map((div) => [div?.id, div]));
  const next = Array.isArray(incoming) ? incoming : stored;
  if (!Array.isArray(next)) return [];
  return next.map((div) => {
    const prior = previous.get(div?.id);
    const name = String(div?.name ?? '').trim() ? div.name : prior?.name ?? '';
    const selector = String(div?.selector ?? '').trim() ? div.selector : prior?.selector ?? '';
    return {
      ...prior,
      ...div,
      name: String(name ?? ''),
      selector: String(selector ?? '')
    };
  });
}

export function normalizeStoredDiv(div, uuid = createUuid) {
  const name = String(div?.name ?? '');
  const selector = String(div?.selector ?? '');
  return {
    id: typeof div?.id === 'string' && div.id ? div.id : uuid(),
    name,
    selector,
    defaultState: typeof div?.defaultState === 'boolean' ? div.defaultState : true,
    whenFalse: div?.whenFalse === 'show' || div?.whenFalse === 'blockClicks' ? 'show' : 'hide'
  };
}

export function normalizeStoredAttributes(attributes, uuid = createUuid) {
  if (!Array.isArray(attributes)) return [];
  return attributes
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      id: typeof item.id === 'string' && item.id ? item.id : uuid(),
      key: String(item.key ?? ''),
      value: String(item.value ?? '')
    }));
}

export function normalizeStoredProjects(projects) {
  if (!Array.isArray(projects)) return [];
  return projects
    .map((project) => ({
      key: String(project?.key ?? ''),
      name: String(project?.name ?? project?.key ?? ''),
      environments: (Array.isArray(project?.environments) ? project.environments : [])
        .map((env) => ({
          key: String(env?.key ?? ''),
          name: String(env?.name ?? env?.key ?? ''),
          clientSideId: String(env?.clientSideId ?? '')
        }))
        .filter((env) => env.key)
    }))
    .filter((project) => project.key);
}

export function cleanSettings(partial = {}, uuid = createUuid) {
  const merged = { ...defaultSettings(), ...partial };
  return {
    customerName: String(merged.customerName ?? '').trim(),
    targetDomain: normalizeDomain(merged.targetDomain || ''),
    projectKey: String(merged.projectKey ?? ''),
    environmentKey: String(merged.environmentKey ?? ''),
    clientSideId: String(merged.clientSideId ?? ''),
    projects: normalizeStoredProjects(merged.projects),
    anonymous: Boolean(merged.anonymous),
    userKey: String(merged.userKey ?? ''),
    observability: Boolean(merged.observability),
    sessionReplay: Boolean(merged.sessionReplay),
    collecting: Boolean(merged.collecting),
    attributes: normalizeStoredAttributes(merged.attributes, uuid),
    divs: Array.isArray(merged.divs) ? merged.divs.map((div) => normalizeStoredDiv(div, uuid)) : [],
    connected: Boolean(merged.connected),
    notice: String(merged.notice ?? '')
  };
}

export function validateApiKey(apiKey) {
  if (!String(apiKey ?? '').trim()) return { ok: false, error: 'API key is required.' };
  return { ok: true, error: '' };
}

export function validateConnectionInput({ apiKey, customerName, targetDomain }) {
  const errors = {};
  if (!String(apiKey ?? '').trim()) errors.apiKey = 'API key is required.';
  if (!sanitizeKey(customerName)) errors.customerName = 'Customer name must include letters or numbers.';
  const domain = normalizeDomain(targetDomain);
  if (!domain) errors.targetDomain = 'Target domain is required.';
  else if (!isValidHostname(domain)) errors.targetDomain = 'Enter a hostname such as launchdarkly.com.';
  return {
    ok: Object.keys(errors).length === 0,
    errors,
    domain,
    customerName: String(customerName ?? '').trim()
  };
}

export function validateUserContext({ anonymous, userKey }) {
  if (anonymous) return { ok: true, error: '' };
  if (!String(userKey ?? '').trim()) {
    return { ok: false, error: 'User key is required for a defined user.' };
  }
  return { ok: true, error: '' };
}

export function buildExportPayload(state) {
  return {
    apiKey: String(state.apiKey ?? ''),
    customerName: String(state.customerName ?? ''),
    targetDomain: normalizeDomain(state.targetDomain || ''),
    projectKey: String(state.projectKey ?? ''),
    environmentKey: String(state.environmentKey ?? ''),
    observability: Boolean(state.observability),
    sessionReplay: Boolean(state.sessionReplay),
    userContext: {
      anonymous: Boolean(state.anonymous),
      userKey: String(state.userKey ?? ''),
      attributes: (Array.isArray(state.attributes) ? state.attributes : []).map((item) => ({
        key: String(item?.key ?? ''),
        value: String(item?.value ?? '')
      }))
    },
    divs: (state.divs || []).map((div) => ({
      name: String(div.name ?? ''),
      selector: String(div.selector ?? ''),
      defaultState: Boolean(div.defaultState),
      whenFalse: div.whenFalse === 'show' || div.whenFalse === 'blockClicks' ? 'show' : 'hide'
    }))
  };
}

function invalid(message) {
  const error = new Error(message);
  error.code = 'MALFORMED_CONFIG';
  return error;
}

export function parseImportedConfig(data, uuid = createUuid) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw invalid('Config file is not a JSON object.');
  for (const key of ['apiKey', 'customerName', 'targetDomain']) {
    if (typeof data[key] !== 'string' || !data[key].trim()) throw invalid(`Config file is missing ${key}.`);
  }
  if (!Array.isArray(data.divs)) throw invalid('Config file is missing a divs array.');
  if (data.projectKey != null && typeof data.projectKey !== 'string') throw invalid('projectKey must be a string.');
  if (data.environmentKey != null && typeof data.environmentKey !== 'string') throw invalid('environmentKey must be a string.');

  const domain = normalizeDomain(data.targetDomain);
  if (!domain || !isValidHostname(domain)) throw invalid('Config file has an invalid targetDomain.');

  const observability = optionalBoolean(data.observability, 'observability');
  const sessionReplay = optionalBoolean(data.sessionReplay, 'sessionReplay');
  let anonymous = true;
  let userKey = '';
  let attributes = [];
  if (data.userContext != null) {
    if (typeof data.userContext !== 'object' || Array.isArray(data.userContext)) {
      throw invalid('userContext must be an object.');
    }
    if (data.userContext.anonymous != null && typeof data.userContext.anonymous !== 'boolean') {
      throw invalid('userContext.anonymous must be a boolean.');
    }
    if (data.userContext.userKey != null && typeof data.userContext.userKey !== 'string') {
      throw invalid('userContext.userKey must be a string.');
    }
    anonymous = data.userContext.anonymous !== false;
    userKey = typeof data.userContext.userKey === 'string' ? data.userContext.userKey : '';
    if (data.userContext.attributes != null) {
      if (!Array.isArray(data.userContext.attributes)) throw invalid('userContext.attributes must be an array.');
      attributes = data.userContext.attributes.map((item, index) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) throw invalid(`Attribute at index ${index} is invalid.`);
        if (typeof item.key !== 'string') throw invalid(`Attribute at index ${index} is missing a key.`);
        if (typeof item.value !== 'string') throw invalid(`Attribute at index ${index} is missing a value.`);
        return { id: uuid(), key: item.key, value: item.value };
      });
    }
  }

  const divs = data.divs.map((div, index) => {
    if (!div || typeof div !== 'object' || Array.isArray(div)) throw invalid(`Div at index ${index} is invalid.`);
    if (typeof div.name !== 'string' || !div.name.trim()) throw invalid(`Div at index ${index} is missing a name.`);
    if (typeof div.selector !== 'string' || !div.selector.trim()) throw invalid(`Div "${div.name}" is missing a selector.`);
    if (typeof div.defaultState !== 'boolean') throw invalid(`Div "${div.name}" has an invalid defaultState.`);
    if (div.whenFalse !== 'hide' && div.whenFalse !== 'show' && div.whenFalse !== 'blockClicks') {
      throw invalid(`Div "${div.name}" has an invalid whenFalse action.`);
    }
    return {
      id: uuid(),
      name: div.name.trim(),
      selector: div.selector.trim(),
      defaultState: div.defaultState,
      whenFalse: div.whenFalse === 'hide' ? 'hide' : 'show'
    };
  });

  return {
    apiKey: data.apiKey.trim(),
    customerName: data.customerName.trim(),
    targetDomain: domain,
    projectKey: typeof data.projectKey === 'string' ? data.projectKey : '',
    environmentKey: typeof data.environmentKey === 'string' ? data.environmentKey : '',
    anonymous,
    userKey,
    observability,
    sessionReplay,
    attributes,
    divs
  };
}

function optionalBoolean(value, name) {
  if (value == null) return false;
  if (typeof value !== 'boolean') throw invalid(`${name} must be a boolean.`);
  return value;
}
