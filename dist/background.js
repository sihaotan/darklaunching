(() => {
  // src/lib/projects.js
  function environmentItems(environments) {
    if (Array.isArray(environments)) return environments;
    if (environments && Array.isArray(environments.items)) return environments.items;
    return [];
  }
  function normalizeProjectPayload(project) {
    return {
      key: String(project?.key ?? ""),
      name: String(project?.name || project?.key || ""),
      environments: environmentItems(project?.environments).map((env) => ({
        key: String(env?.key ?? ""),
        name: String(env?.name || env?.key || ""),
        clientSideId: String(env?._id ?? "")
      })).filter((env) => env.key)
    };
  }
  function selectProjectEnvironment(projects, preferredProjectKey, preferredEnvironmentKey) {
    const notices = [];
    if (!projects.length) {
      return { project: null, environment: null, notices: ["This account has no projects."] };
    }
    let project = projects.find((item) => item.key === preferredProjectKey);
    if (preferredProjectKey && !project) {
      project = projects[0];
      notices.push(`Saved project "${preferredProjectKey}" was not found. Selected "${project.name}" instead.`);
    } else if (!project) {
      project = projects[0];
    }
    const environments = project.environments || [];
    if (!environments.length) {
      notices.push(`Project "${project.name}" has no environments.`);
      return { project, environment: null, notices };
    }
    let environment = environments.find((item) => item.key === preferredEnvironmentKey);
    if (preferredEnvironmentKey && !environment) {
      environment = environments[0];
      notices.push(`Saved environment "${preferredEnvironmentKey}" was not found. Selected "${environment.name}" instead.`);
    } else if (!environment) {
      environment = environments[0];
    }
    return { project, environment, notices };
  }

  // src/lib/api.js
  var LD_API_ORIGIN = "https://app.launchdarkly.com";
  var MAX_PAGES = 200;
  var MAX_RETRY_WAIT_MS = 2e4;
  var LdError = class extends Error {
    constructor(message, status = 0) {
      super(message);
      this.name = "LdError";
      this.status = status;
    }
  };
  function parseRetryAfter(header, now = Date.now()) {
    if (header == null || header === "") return null;
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1e3);
    const date = Date.parse(String(header));
    if (!Number.isNaN(date)) return Math.max(0, date - now);
    return null;
  }
  function toApiPath(href) {
    if (!href || typeof href !== "string") return null;
    if (href.startsWith("http://") || href.startsWith("https://")) {
      const url = new URL(href);
      if (url.origin !== LD_API_ORIGIN) {
        throw new LdError("Refusing to follow a pagination link off app.launchdarkly.com.");
      }
      return `${url.pathname}${url.search}`;
    }
    if (href.startsWith("/")) return href;
    return `/${href}`;
  }
  function resolveApiUrl(path) {
    if (path.startsWith("http://") || path.startsWith("https://")) {
      const url = new URL(path);
      if (url.origin !== LD_API_ORIGIN) throw new LdError("Refusing to send the API key to a non-LaunchDarkly host.");
      return url.toString();
    }
    const pathOnly = path.startsWith("/") ? path : `/${path}`;
    return `${LD_API_ORIGIN}${pathOnly}`;
  }
  function buildHeaders({ apiKey, headers, body }) {
    const result = { Authorization: apiKey, Accept: "application/json" };
    if (body !== void 0) result["Content-Type"] = "application/json";
    if (headers) Object.assign(result, headers);
    return result;
  }
  async function readError(response) {
    let apiMessage = "";
    try {
      const data = await response.json();
      apiMessage = typeof data?.message === "string" ? data.message : "";
    } catch {
      apiMessage = "";
    }
    if (apiMessage.length > 300 || /api-[A-Za-z0-9]/.test(apiMessage)) apiMessage = "";
    if (response.status === 401 || response.status === 403) {
      return apiMessage ? `The API key was rejected or lacks permission to manage flags. ${apiMessage}` : "The API key was rejected or lacks permission to manage flags.";
    }
    if (response.status === 429) {
      const retry = response.headers?.get?.("Retry-After");
      const suffix = retry ? ` Retry after ${retry}.` : "";
      return `LaunchDarkly rate limit reached.${suffix}`;
    }
    return apiMessage || `LaunchDarkly request failed (${response.status}).`;
  }
  async function ldRequest(path, options = {}) {
    const url = resolveApiUrl(path);
    const fetchImpl = options.fetchImpl ?? fetch;
    const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    let attempt = 0;
    while (true) {
      let response;
      try {
        response = await fetchImpl(url, {
          method: options.method ?? "GET",
          headers: buildHeaders(options),
          body: options.body === void 0 ? void 0 : typeof options.body === "string" ? options.body : JSON.stringify(options.body)
        });
      } catch {
        throw new LdError("Could not reach LaunchDarkly. Check your connection and try again.", 0);
      }
      if (response.status === 429 && attempt < 3) {
        const delay = parseRetryAfter(response.headers?.get?.("Retry-After")) ?? Math.min(1e3 * 2 ** attempt, 8e3);
        if (delay <= MAX_RETRY_WAIT_MS) {
          attempt += 1;
          try {
            await response.body?.cancel?.();
          } catch {
          }
          await sleep(delay);
          continue;
        }
      }
      return response;
    }
  }
  function nextHref(data) {
    const next = data?._links?.next;
    if (!next) return null;
    if (typeof next === "string") return next;
    return next.href || null;
  }
  async function getJsonPages(firstPath, options) {
    const items = [];
    let path = firstPath;
    const seen = /* @__PURE__ */ new Set();
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
  async function listProjects(options) {
    const items = await getJsonPages("/api/v2/projects?expand=environments&limit=100", options);
    return items.map(normalizeProjectPayload).filter((project) => project.key);
  }
  function flagListPath(path, environmentKey) {
    const url = new URL(path, LD_API_ORIGIN);
    if (environmentKey && !url.searchParams.has("env")) url.searchParams.set("env", environmentKey);
    url.searchParams.set("summary", "0");
    return `${url.pathname}${url.search}`;
  }
  function listAllFlags({ projectKey, environmentKey, ...options }) {
    const path = flagListPath(
      `/api/v2/flags/${encodeURIComponent(projectKey)}?limit=100&env=${encodeURIComponent(environmentKey)}`,
      environmentKey
    );
    return getJsonPages(path, { ...options, environmentKey });
  }

  // src/lib/uuid.js
  function createUuid(cryptoObj = globalThis.crypto) {
    if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
    const bytes = cryptoObj.getRandomValues(new Uint8Array(16));
    bytes[6] = bytes[6] & 15 | 64;
    bytes[8] = bytes[8] & 63 | 128;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  async function ensureAnonymousKey(storage, uuid = createUuid) {
    const current = await storage.get(storage.anonKey);
    if (typeof current === "string" && current.trim()) return current;
    const next = uuid();
    await storage.set(storage.anonKey, next);
    return next;
  }

  // src/lib/domain.js
  function normalizeDomain(input) {
    let value = String(input ?? "").trim().toLowerCase();
    if (!value) return "";
    value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
    value = value.replace(/^\/\//, "");
    value = value.split("/")[0].split("?")[0].split("#")[0];
    const at = value.lastIndexOf("@");
    if (at !== -1) value = value.slice(at + 1);
    if (value.startsWith("[")) {
      const end = value.indexOf("]");
      value = end === -1 ? value : value.slice(1, end);
    } else {
      value = value.replace(/:\d+$/, "");
    }
    value = value.replace(/\.$/, "");
    if (value.startsWith("www.")) {
      const rest = value.slice(4);
      if (rest && (rest.includes(".") || rest === "localhost")) value = rest;
    }
    return value;
  }
  function canonicalHost(hostname) {
    return String(hostname ?? "").trim().toLowerCase().replace(/\.$/, "");
  }
  function isValidHostname(domain) {
    if (!domain || domain.length > 253) return false;
    if (domain === "localhost") return true;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(domain)) {
      return domain.split(".").every((part) => Number(part) <= 255);
    }
    if (/[^a-z0-9.-]/.test(domain) || domain.includes("..") || domain.startsWith(".") || domain.endsWith(".")) {
      return false;
    }
    return domain.split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
  }
  function allowsSubdomainWildcard(domain) {
    if (!domain || domain === "localhost" || !domain.includes(".")) return false;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(domain)) return false;
    return true;
  }
  function permissionOrigins(domain) {
    const origins = [];
    for (const scheme of ["https", "http"]) {
      origins.push(`${scheme}://${domain}/*`);
      if (allowsSubdomainWildcard(domain)) origins.push(`${scheme}://*.${domain}/*`);
    }
    return origins;
  }
  function hostMatchesTarget(hostname, targetDomain) {
    const host = canonicalHost(hostname);
    const target = canonicalHost(targetDomain);
    if (!host || !target) return false;
    return host === target || host.endsWith(`.${target}`);
  }
  function toolbarIconColored({ connected, targetDomain, url }) {
    const target = normalizeDomain(targetDomain);
    if (!connected || !isValidHostname(target)) return false;
    try {
      return hostMatchesTarget(new URL(url).hostname, target);
    } catch {
      return false;
    }
  }

  // src/lib/sanitize.js
  function sanitizeKey(input) {
    return String(input ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  // src/lib/config.js
  function defaultSettings() {
    return {
      customerName: "",
      targetDomain: "",
      projectKey: "",
      environmentKey: "",
      clientSideId: "",
      projects: [],
      anonymous: true,
      userKey: "",
      attributes: [],
      divs: [],
      connected: false,
      notice: ""
    };
  }
  function preserveDivs(stored, incoming) {
    const previous = new Map((Array.isArray(stored) ? stored : []).map((div) => [div?.id, div]));
    const next = Array.isArray(incoming) ? incoming : stored;
    if (!Array.isArray(next)) return [];
    return next.map((div) => {
      const prior = previous.get(div?.id);
      const name = String(div?.name ?? "").trim() ? div.name : prior?.name ?? "";
      const selector = String(div?.selector ?? "").trim() ? div.selector : prior?.selector ?? "";
      return {
        ...prior,
        ...div,
        name: String(name ?? ""),
        selector: String(selector ?? "")
      };
    });
  }
  function normalizeStoredDiv(div, uuid = createUuid) {
    const name = String(div?.name ?? "");
    const selector = String(div?.selector ?? "");
    return {
      id: typeof div?.id === "string" && div.id ? div.id : uuid(),
      name,
      selector,
      defaultState: typeof div?.defaultState === "boolean" ? div.defaultState : true,
      whenFalse: div?.whenFalse === "show" || div?.whenFalse === "blockClicks" ? "show" : "hide"
    };
  }
  function normalizeStoredAttributes(attributes, uuid = createUuid) {
    if (!Array.isArray(attributes)) return [];
    return attributes.filter((item) => item && typeof item === "object").map((item) => ({
      id: typeof item.id === "string" && item.id ? item.id : uuid(),
      key: String(item.key ?? ""),
      value: String(item.value ?? "")
    }));
  }
  function normalizeStoredProjects(projects) {
    if (!Array.isArray(projects)) return [];
    return projects.map((project) => ({
      key: String(project?.key ?? ""),
      name: String(project?.name ?? project?.key ?? ""),
      environments: (Array.isArray(project?.environments) ? project.environments : []).map((env) => ({
        key: String(env?.key ?? ""),
        name: String(env?.name ?? env?.key ?? ""),
        clientSideId: String(env?.clientSideId ?? "")
      })).filter((env) => env.key)
    })).filter((project) => project.key);
  }
  function cleanSettings(partial = {}, uuid = createUuid) {
    const merged = { ...defaultSettings(), ...partial };
    return {
      customerName: String(merged.customerName ?? "").trim(),
      targetDomain: normalizeDomain(merged.targetDomain || ""),
      projectKey: String(merged.projectKey ?? ""),
      environmentKey: String(merged.environmentKey ?? ""),
      clientSideId: String(merged.clientSideId ?? ""),
      projects: normalizeStoredProjects(merged.projects),
      anonymous: Boolean(merged.anonymous),
      userKey: String(merged.userKey ?? ""),
      attributes: normalizeStoredAttributes(merged.attributes, uuid),
      divs: Array.isArray(merged.divs) ? merged.divs.map((div) => normalizeStoredDiv(div, uuid)) : [],
      connected: Boolean(merged.connected),
      notice: String(merged.notice ?? "")
    };
  }
  function validateConnectionInput({ apiKey, customerName, targetDomain }) {
    const errors = {};
    if (!String(apiKey ?? "").trim()) errors.apiKey = "API key is required.";
    if (!sanitizeKey(customerName)) errors.customerName = "Customer name must include letters or numbers.";
    const domain = normalizeDomain(targetDomain);
    if (!domain) errors.targetDomain = "Target domain is required.";
    else if (!isValidHostname(domain)) errors.targetDomain = "Enter a hostname such as launchdarkly.com.";
    return {
      ok: Object.keys(errors).length === 0,
      errors,
      domain,
      customerName: String(customerName ?? "").trim()
    };
  }

  // src/lib/dom.js
  function isValidCssSelector(selector) {
    const value = String(selector ?? "").trim();
    if (!value) return false;
    if (typeof document === "undefined" || typeof document.querySelector !== "function") return true;
    try {
      document.querySelector(value);
      return true;
    } catch {
      return false;
    }
  }

  // src/lib/flags.js
  var OWNERSHIP_TAG = "darklaunching";
  var MAX_TAG_LENGTH = 64;
  function customerTag(customerName) {
    const words = String(customerName ?? "").match(/[A-Za-z0-9]+/g);
    if (!words) return "";
    const tag = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join("").slice(0, MAX_TAG_LENGTH);
    return /^[A-Za-z0-9]{1,64}$/.test(tag) ? tag : "";
  }
  function legacyCustomerTags(customerName) {
    const key = sanitizeKey(customerName);
    if (!key) return [];
    return [`customer.${key}`, `customer:${key}`].map((tag) => tag.slice(0, MAX_TAG_LENGTH).replace(/[.:-]+$/g, "")).filter((tag) => tag && tag !== "customer");
  }
  function customerTagChange(flag, customerName) {
    const addTag = customerTag(customerName);
    const tags = Array.isArray(flag?.tags) ? flag.tags : [];
    if (!addTag || tags.includes(addTag)) return null;
    return {
      addTag,
      removeTags: legacyCustomerTags(customerName).filter((tag) => tags.includes(tag))
    };
  }
  function flagIdentity(customerName, divName) {
    const name = `${String(customerName ?? "").trim()} - ${String(divName ?? "").trim()}`;
    return { name, key: sanitizeKey(name) };
  }
  function isOwned(flag, customerName) {
    const tags = new Set(flag?.tags || []);
    const tag = customerTag(customerName);
    if (!tag || !tags.has(OWNERSHIP_TAG)) return false;
    if (tags.has(tag)) return true;
    return legacyCustomerTags(customerName).some((legacy) => tags.has(legacy));
  }
  function isBooleanFlag(flag) {
    const values = new Set((flag?.variations || []).map((variation) => variation?.value));
    return values.has(true) && values.has(false);
  }
  function offVariationIndex(flag, environmentKey) {
    const env = flag?.environments?.[environmentKey];
    if (typeof env?.offVariation === "number") return env.offVariation;
    const summary = env?._summary?.variations;
    if (summary && typeof summary === "object") {
      const found = Object.entries(summary).find(([, item]) => item?.isOff === true);
      if (found) {
        const index = Number(found[0]);
        if (Number.isInteger(index) && index >= 0) return index;
      }
    }
    return typeof flag?.defaults?.offVariation === "number" ? flag.defaults.offVariation : void 0;
  }
  function ownedFlagSummary(flag, environmentKey) {
    const env = flag?.environments?.[environmentKey] || {};
    return {
      key: String(flag?.key || ""),
      name: String(flag?.name || ""),
      description: String(flag?.description || ""),
      tags: Array.isArray(flag?.tags) ? flag.tags.filter((tag) => typeof tag === "string") : [],
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
  function offVariationValue(flag, environmentKey) {
    const index = offVariationIndex(flag, environmentKey);
    if (typeof index !== "number") return void 0;
    const variation = flag?.variations?.[index];
    if (!variation || !Object.prototype.hasOwnProperty.call(variation, "value")) return void 0;
    return variation.value;
  }
  function variationIdForValue(flag, value) {
    const variation = (flag?.variations || []).find((item) => item?.value === value && item._id);
    return variation?._id || "";
  }
  function createFlagBody(customerName, div) {
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
  function validateDivRows(divs, customerName) {
    const errors = {};
    const keys = [];
    for (const div of divs) {
      const name = String(div?.name ?? "").trim();
      const selector = String(div?.selector ?? "").trim();
      if (!name) {
        errors[div.id] = "Name is required.";
        continue;
      }
      if (!sanitizeKey(name)) {
        errors[div.id] = "Name does not produce a valid flag key.";
        continue;
      }
      if (!selector) {
        errors[div.id] = "CSS selector is required.";
        continue;
      }
      if (!isValidCssSelector(selector)) {
        errors[div.id] = "Enter a CSS selector from Copy selector.";
        continue;
      }
      const identity = flagIdentity(customerName, name);
      if (!identity.key) {
        errors[div.id] = "Name does not produce a valid flag key.";
        continue;
      }
      keys.push({ id: div.id, key: identity.key });
    }
    const counts = /* @__PURE__ */ new Map();
    for (const item of keys) counts.set(item.key, (counts.get(item.key) || 0) + 1);
    for (const item of keys) {
      if (counts.get(item.key) > 1) errors[item.id] = "Duplicate flag key.";
    }
    return errors;
  }
  function planSync({ divs, flags, customerName, environmentKey }) {
    const rowErrors = validateDivRows(divs, customerName);
    const desired = /* @__PURE__ */ new Map();
    const blocked = /* @__PURE__ */ new Set();
    for (const div of divs) {
      const identity = flagIdentity(customerName, div.name || "");
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
          reason: "Key already used by another flag"
        });
        continue;
      }
      if (!isBooleanFlag(remote)) {
        failures.push({
          key,
          name: remote.name || key,
          divId: item.div.id,
          message: "Flag exists but is not a boolean flag."
        });
        continue;
      }
      const tagChange = customerTagChange(remote, customerName);
      const current = offVariationValue(remote, environmentKey);
      if (current === void 0) {
        failures.push({
          key,
          name: remote.name || key,
          divId: item.div.id,
          message: "Could not read the off variation for this environment."
        });
        continue;
      }
      const variationChanged = current !== item.div.defaultState;
      if (!variationChanged && !tagChange) continue;
      let variationId = "";
      if (variationChanged) {
        variationId = variationIdForValue(remote, item.div.defaultState);
        if (!variationId) {
          failures.push({
            key,
            name: remote.name || key,
            divId: item.div.id,
            message: "Could not find a variation id for the selected default."
          });
          continue;
        }
      }
      updates.push({ ...item, ...variationId ? { variationId } : {}, ...tagChange || {} });
    }
    for (const flag of flags || []) {
      if (!isOwned(flag, customerName)) continue;
      if (desired.has(flag.key) || blocked.has(flag.key)) continue;
      prunes.push({ key: flag.key, name: flag.name || flag.key });
    }
    return { creates, updates, prunes, skips, failures, rowErrors };
  }

  // src/lib/keys.js
  var SETTINGS_KEY = "settings";
  var ANON_KEY = "anonymousUserKey";
  var CONTEXT_DELIVERY_KEY = "contextDelivery";
  var LAST_SYNC_KEY = "lastSyncResult";
  var REGISTRATION_KEY = "registrationStatus";

  // src/lib/events.js
  var LD_EVENTS_ORIGIN = "https://events.launchdarkly.com";
  function isLaunchDarklyEventsUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && url.hostname === "events.launchdarkly.com" && url.username === "" && url.password === "";
    } catch {
      return false;
    }
  }
  function isClientSideId(value) {
    return /^[A-Za-z0-9_-]{8,128}$/.test(String(value || ""));
  }
  function contextEventBatch(context, evaluations = [], now = Date.now()) {
    if (!context || context.kind !== "user" || typeof context.key !== "string" || !context.key.trim()) return null;
    const safe = {
      kind: "user",
      key: context.key.trim(),
      anonymous: context.anonymous === true,
      os: typeof context.os === "string" ? context.os : "",
      browser: typeof context.browser === "string" ? context.browser : "",
      country: typeof context.country === "string" ? context.country : ""
    };
    for (const name of Object.keys(context)) {
      if (name === "kind" || name === "key" || name === "anonymous" || name === "os" || name === "browser" || name === "country") continue;
      if (typeof context[name] === "string") safe[name] = context[name];
    }
    const events = [
      { kind: "index", creationDate: now, context: safe },
      { kind: "identify", creationDate: now, context: safe }
    ];
    const features = {};
    for (const evaluation of Array.isArray(evaluations) ? evaluations : []) {
      const key = String(evaluation?.key || "").trim();
      if (!key || Object.hasOwn(features, key)) continue;
      const counter = { value: evaluation.value, count: 1 };
      if (Number.isInteger(evaluation.variation)) counter.variation = evaluation.variation;
      if (Number.isInteger(evaluation.version)) counter.version = evaluation.version;
      else counter.unknown = true;
      features[key] = {
        default: evaluation.default,
        contextKinds: ["user"],
        counters: [counter]
      };
    }
    if (Object.keys(features).length) {
      events.push({ kind: "summary", startDate: now, endDate: now, context: safe, features });
    }
    return events;
  }

  // src/lib/messages.js
  var MSG = {
    CONNECT: "CONNECT",
    DISCONNECT: "DISCONNECT",
    REFRESH: "REFRESH",
    PREPARE_SYNC: "PREPARE_SYNC",
    LIST_OWNED_FLAGS: "LIST_OWNED_FLAGS",
    EXECUTE_SYNC: "EXECUTE_SYNC",
    SYNC_REGISTRATION: "SYNC_REGISTRATION",
    ENSURE_ANON_KEY: "ENSURE_ANON_KEY",
    IDENTIFY: "DL_IDENTIFY",
    RECONFIGURE: "DL_RECONFIGURE",
    SHUTDOWN: "DL_SHUTDOWN",
    RELAY_EVENTS: "DL_RELAY_EVENTS",
    PUBLISH_CONTEXT: "DL_PUBLISH_CONTEXT"
  };

  // src/lib/sync.js
  var SEMANTIC_PATCH = "application/json; domain-model=launchdarkly.semanticpatch";
  async function mutate(path, options) {
    const response = await ldRequest(path, options);
    if (!response.ok) throw new LdError(await readError(response), response.status);
    return response;
  }
  function summarizeResults(results) {
    const line = `Created ${results.created.length}, updated ${results.updated.length}, deleted ${results.deleted.length}, skipped ${results.skipped.length}, failed ${results.failed.length}.`;
    const details = [];
    for (const item of results.skipped) {
      if (item.reason) details.push(`${item.name || item.key}: ${item.reason}`);
    }
    for (const item of results.failed) {
      if (item.message) details.push(`${item.name || item.key}: ${item.message}`);
    }
    const quiet = results.created.length + results.updated.length + results.deleted.length + results.skipped.length + results.failed.length === 0;
    return { line: quiet ? `${line} Everything already matches.` : line, details };
  }
  async function executeSync({
    divs,
    flags,
    customerName,
    environmentKey,
    projectKey,
    apiKey,
    deleteConfirmed = false,
    confirmedDeleteKeys = [],
    fetchImpl,
    sleep
  }) {
    const plan = planSync({ divs, flags, customerName, environmentKey });
    const confirmed = new Set(confirmedDeleteKeys);
    const request = { apiKey, fetchImpl, sleep };
    const results = {
      created: [],
      updated: [],
      deleted: [],
      skipped: [...plan.skips],
      failed: [...plan.failures]
    };
    for (const div of divs) {
      if (!plan.rowErrors[div.id]) continue;
      results.failed.push({ key: div.name || div.id, divId: div.id, message: plan.rowErrors[div.id] });
    }
    for (const item of plan.creates) {
      try {
        await mutate(`/api/v2/flags/${encodeURIComponent(projectKey)}`, {
          ...request,
          method: "POST",
          body: createFlagBody(customerName, item.div)
        });
        results.created.push({ key: item.identity.key, name: item.identity.name, divId: item.div.id });
      } catch (error) {
        results.failed.push({
          key: item.identity.key,
          name: item.identity.name,
          divId: item.div.id,
          message: error.message || "Could not create the flag."
        });
      }
    }
    for (const item of plan.updates) {
      let changed = false;
      if (item.variationId) {
        try {
          await mutate(`/api/v2/flags/${encodeURIComponent(projectKey)}/${encodeURIComponent(item.identity.key)}`, {
            ...request,
            method: "PATCH",
            headers: { "Content-Type": SEMANTIC_PATCH },
            body: {
              environmentKey,
              comment: "DarkLaunching updated the off variation",
              instructions: [{ kind: "updateOffVariation", variationId: item.variationId }]
            }
          });
          changed = true;
        } catch (error) {
          results.failed.push({
            key: item.identity.key,
            name: item.identity.name,
            divId: item.div.id,
            message: error.message || "Could not update the flag."
          });
        }
      }
      if (item.addTag) {
        const instructions = [{ kind: "addTags", values: [item.addTag] }];
        if (item.removeTags?.length) instructions.push({ kind: "removeTags", values: item.removeTags });
        try {
          await mutate(`/api/v2/flags/${encodeURIComponent(projectKey)}/${encodeURIComponent(item.identity.key)}`, {
            ...request,
            method: "PATCH",
            headers: { "Content-Type": SEMANTIC_PATCH },
            body: {
              environmentKey,
              comment: "DarkLaunching updated the customer tag",
              instructions
            }
          });
          changed = true;
        } catch (error) {
          results.failed.push({
            key: item.identity.key,
            name: item.identity.name,
            divId: item.div.id,
            message: error.message || "Could not update the flag tag."
          });
        }
      }
      if (changed) results.updated.push({ key: item.identity.key, name: item.identity.name, divId: item.div.id });
    }
    for (const flag of plan.prunes) {
      if (!deleteConfirmed || !confirmed.has(flag.key)) {
        results.skipped.push({
          key: flag.key,
          name: flag.name,
          reason: deleteConfirmed ? "Not confirmed" : "Deletion cancelled"
        });
        continue;
      }
      try {
        const response = await ldRequest(`/api/v2/flags/${encodeURIComponent(projectKey)}/${encodeURIComponent(flag.key)}`, {
          ...request,
          method: "DELETE"
        });
        if (!response.ok && response.status !== 404) {
          results.failed.push({ key: flag.key, name: flag.name, message: await readError(response) });
          continue;
        }
        results.deleted.push({ key: flag.key, name: flag.name });
      } catch (error) {
        results.failed.push({ key: flag.key, name: flag.name, message: error.message || "Could not delete the flag." });
      }
    }
    return { plan, results };
  }

  // src/lib/secret.js
  var API_KEY_NAME = "apiKey";
  var DB_NAME = "darklaunching-private";
  var STORE = "secrets";
  function openPrivateDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async function readPrivateApiKey() {
    const db = await openPrivateDb();
    try {
      const value = await requestResult(db.transaction(STORE, "readonly").objectStore(STORE).get(API_KEY_NAME));
      return typeof value === "string" ? value.trim() : "";
    } finally {
      db.close();
    }
  }
  async function writePrivateApiKey(value) {
    const db = await openPrivateDb();
    try {
      const store = db.transaction(STORE, "readwrite").objectStore(STORE);
      const request = value ? store.put(value, API_KEY_NAME) : store.delete(API_KEY_NAME);
      await requestResult(request);
    } finally {
      db.close();
    }
  }
  async function trustedSession() {
    if (!chrome.storage?.session?.setAccessLevel) return;
    try {
      await chrome.storage.session.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" });
    } catch {
    }
  }
  async function readSessionApiKey() {
    if (!chrome.storage?.session) return "";
    await trustedSession();
    const data = await chrome.storage.session.get(API_KEY_NAME);
    return typeof data[API_KEY_NAME] === "string" ? data[API_KEY_NAME].trim() : "";
  }
  async function writeSessionApiKey(value) {
    if (!chrome.storage?.session) return;
    await trustedSession();
    if (value) await chrome.storage.session.set({ [API_KEY_NAME]: value });
    else await chrome.storage.session.remove(API_KEY_NAME);
  }
  async function readExtensionApiKey() {
    const sessionKey = await readSessionApiKey();
    if (sessionKey) {
      await chrome.storage.local.remove(API_KEY_NAME);
      return sessionKey;
    }
    const privateKey = await readPrivateApiKey().catch(() => "");
    if (privateKey) {
      await writeSessionApiKey(privateKey);
      await chrome.storage.local.remove(API_KEY_NAME);
      return privateKey;
    }
    const legacy = await chrome.storage.local.get(API_KEY_NAME);
    const localKey = typeof legacy[API_KEY_NAME] === "string" ? legacy[API_KEY_NAME].trim() : "";
    if (!localKey) return "";
    await writeExtensionApiKey(localKey);
    return localKey;
  }
  async function writeExtensionApiKey(value) {
    const key = String(value ?? "").trim();
    await writeSessionApiKey(key);
    await writePrivateApiKey(key).catch(() => {
    });
    await chrome.storage.local.remove(API_KEY_NAME);
  }

  // src/background.js
  var SCRIPT_ID = "darklaunching";
  var COLORED_ICON = {
    16: "icons/icon16.png",
    32: "icons/icon32.png",
    48: "icons/icon48.png",
    128: "icons/icon128.png"
  };
  var GREY_ICON = {
    16: "icons/icon16-grey.png",
    32: "icons/icon32-grey.png",
    48: "icons/icon48-grey.png",
    128: "icons/icon128-grey.png"
  };
  var registrationChain = Promise.resolve();
  var connectionChain = Promise.resolve();
  var disconnectRequested = false;
  function enqueueConnection(task) {
    const run = connectionChain.then(task, task);
    connectionChain = run.then(
      () => void 0,
      () => void 0
    );
    return run;
  }
  function enqueueRegistration(task) {
    const run = registrationChain.then(task, task);
    registrationChain = run.then(
      () => void 0,
      () => void 0
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
        let hostname = "";
        try {
          hostname = new URL(tab.url).hostname;
        } catch {
          return;
        }
        if (!hostMatchesTarget(hostname, domain)) return;
        try {
          await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
        } catch {
        }
      })
    );
  }
  async function syncRegistrationNow() {
    try {
      const registered = await chrome.scripting.getRegisteredContentScripts();
      if (registered.some((script) => script.id === SCRIPT_ID)) {
        await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
      }
    } catch {
    }
    const settings = await loadSettings();
    if (!settings.connected || !isValidHostname(settings.targetDomain) || !settings.clientSideId) {
      await chrome.storage.local.set({ [REGISTRATION_KEY]: { ok: true, error: "" } });
      return { ok: true, registered: false };
    }
    const origins = permissionOrigins(settings.targetDomain);
    const granted = await chrome.permissions.contains({ origins });
    if (!granted) {
      const error = "Target domain permission was denied. DOM changes stay off until you allow access.";
      await chrome.storage.local.set({ [REGISTRATION_KEY]: { ok: false, error } });
      return { ok: false, registered: false, error };
    }
    try {
      await chrome.scripting.registerContentScripts([
        {
          id: SCRIPT_ID,
          matches: origins,
          js: ["content.js"],
          runAt: "document_idle",
          persistAcrossSessions: true,
          allFrames: false
        }
      ]);
    } catch (error) {
      const message = error?.message || "Could not register the content script.";
      await chrome.storage.local.set({ [REGISTRATION_KEY]: { ok: false, error: message } });
      return { ok: false, registered: false, error: message };
    }
    await chrome.storage.local.set({ [REGISTRATION_KEY]: { ok: true, error: "" } });
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
    const customerName = String(message.customerName ?? existing.customerName).trim();
    const targetDomain = String(message.targetDomain ?? existing.targetDomain);
    const validation = validateConnectionInput({ apiKey, customerName, targetDomain });
    if (!validation.ok) return { ok: false, error: Object.values(validation.errors)[0] };
    const base = {
      ...existing,
      customerName: validation.customerName,
      targetDomain: validation.domain,
      anonymous: Boolean(message.anonymous),
      userKey: String(message.userKey ?? ""),
      divs: Array.isArray(message.divs) ? message.divs : existing.divs
    };
    let projects;
    try {
      projects = await listProjects({ apiKey });
    } catch (error) {
      const settings2 = await saveConnection({ ...base, connected: false, notice: "" });
      await syncRegistration();
      return { ok: false, error: error.message, settings: settings2 };
    }
    const selection = selectProjectEnvironment(
      projects,
      String(message.projectKey || existing.projectKey || ""),
      String(message.environmentKey || existing.environmentKey || "")
    );
    const clientSideId = selection.environment?.clientSideId || "";
    if (selection.environment && !clientSideId) {
      const settings2 = await saveConnection({
        ...base,
        projects,
        projectKey: selection.project?.key || "",
        environmentKey: "",
        clientSideId: "",
        connected: false,
        notice: selection.notices.join(" ")
      });
      await syncRegistration();
      return { ok: false, error: "The selected environment is missing a client-side ID.", settings: settings2 };
    }
    if (disconnectRequested) return cancelledConnection();
    const settings = await saveConnection({
      ...base,
      projects,
      projectKey: selection.project?.key || "",
      environmentKey: selection.environment?.key || "",
      clientSideId,
      connected: true,
      notice: selection.notices.join(" ")
    });
    if (disconnectRequested) {
      const reverted = await saveConnection({ ...settings, connected: false, notice: "" });
      return { ok: false, cancelled: true, settings: reverted };
    }
    await syncRegistration();
    return { ok: true, settings };
  }
  async function disconnect(message) {
    const existing = await loadSettings();
    const divs = Array.isArray(message?.divs) ? preserveDivs(existing.divs, message.divs) : existing.divs;
    const settings = await saveSettings({ ...existing, divs, connected: false, notice: "" });
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
    if (!settings.connected) return { ok: false, error: "Connect to LaunchDarkly before updating flags." };
    if (!settings.projectKey || !settings.environmentKey) {
      return { ok: false, error: "Choose a project and environment first." };
    }
    return { ok: true, apiKey, settings };
  }
  async function listOwnedFlags() {
    const apiKey = await readApiKey();
    const settings = await loadSettings();
    if (!String(apiKey || "").trim()) return { ok: false, error: "API key is required." };
    if (!settings.connected) return { ok: false, error: "Connect to LaunchDarkly before loading flags." };
    if (!settings.projectKey || !settings.environmentKey) {
      return { ok: false, error: "Choose a project and environment first." };
    }
    const flags = await listAllFlags({
      apiKey,
      projectKey: settings.projectKey,
      environmentKey: settings.environmentKey
    });
    return {
      ok: true,
      flags: flags.filter((flag) => (flag?.tags || []).includes(OWNERSHIP_TAG)).map((flag) => ownedFlagSummary(flag, settings.environmentKey))
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
    const confirmedDeleteKeys = Array.isArray(message.confirmedDeleteKeys) ? message.confirmedDeleteKeys.filter((key) => typeof key === "string") : [];
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
    const clientSideId = String(message?.clientSideId || "");
    const events = contextEventBatch(message?.context, message?.evaluations);
    if (!isClientSideId(clientSideId) || !events) {
      return { ok: false, error: "LaunchDarkly did not receive the user context." };
    }
    const response = await fetch(`${LD_EVENTS_ORIGIN}/events/bulk/${clientSideId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-launchdarkly-event-schema": "4",
        "x-launchdarkly-payload-id": crypto.randomUUID(),
        "x-launchdarkly-user-agent": "JSClient/4.11.2"
      },
      body: JSON.stringify(events)
    });
    if (response.status > 204) {
      return { ok: false, error: "LaunchDarkly did not receive the user context." };
    }
    const context = events[0].context;
    const delivery = { ok: true, key: context.key, anonymous: context.anonymous, at: Date.now() };
    await chrome.storage.local.set({ [CONTEXT_DELIVERY_KEY]: delivery });
    return delivery;
  }
  async function relayEvents(message) {
    const url = String(message?.url || "");
    if (!isLaunchDarklyEventsUrl(url) || String(message?.method || "POST").toUpperCase() !== "POST") {
      return { ok: false, error: "Refused LaunchDarkly events request." };
    }
    const body = typeof message.body === "string" ? message.body : "";
    if (body.length > 1e6) return { ok: false, error: "LaunchDarkly events payload is too large." };
    const headers = {};
    if (message.headers && typeof message.headers === "object") {
      for (const [key, value] of Object.entries(message.headers)) {
        if (typeof value === "string") headers[key] = value;
      }
    }
    const response = await fetch(url, { method: "POST", headers, body });
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
    if (!message || typeof message.type !== "string" || sender.id !== chrome.runtime.id) return false;
    const pending = handleMessage(message);
    if (!pending) return false;
    pending.then(sendResponse).catch((error) => {
      sendResponse({ ok: false, error: error?.message || "Unexpected extension error." });
    });
    return true;
  });
  function iconPath(settings, url) {
    return toolbarIconColored({
      connected: settings.connected,
      targetDomain: settings.targetDomain,
      url
    }) ? COLORED_ICON : GREY_ICON;
  }
  async function setToolbarIcon(tabId, path) {
    try {
      await chrome.action.setIcon(tabId ? { tabId, path } : { path });
    } catch {
    }
  }
  async function syncToolbarIcons(tabId) {
    const settings = await loadSettings();
    if (tabId) {
      let url = "";
      try {
        url = (await chrome.tabs.get(tabId)).url || "";
      } catch {
        return;
      }
      await setToolbarIcon(tabId, iconPath(settings, url));
      return;
    }
    await setToolbarIcon(void 0, GREY_ICON);
    const tabs = await chrome.tabs.query({});
    await Promise.all(tabs.map((tab) => tab.id ? setToolbarIcon(tab.id, iconPath(settings, tab.url || "")) : void 0));
  }
  readExtensionApiKey().catch(() => {
  });
  chrome.runtime.onInstalled.addListener(() => {
    readExtensionApiKey().catch(() => {
    });
    syncRegistration();
    syncToolbarIcons();
  });
  chrome.runtime.onStartup.addListener(() => {
    readExtensionApiKey().catch(() => {
    });
    syncRegistration();
    syncToolbarIcons();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes[SETTINGS_KEY]) return;
    syncToolbarIcons();
  });
  chrome.tabs.onActivated.addListener(({ tabId }) => {
    syncToolbarIcons(tabId);
  });
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (!changeInfo.url && changeInfo.status !== "complete") return;
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
})();
