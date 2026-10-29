(() => {
  // src/lib/context.js
  var BROWSER_BRANDS = [
    ["Google Chrome", "Chrome"],
    ["Microsoft Edge", "Edge"],
    ["Opera", "Opera"],
    ["Brave", "Brave"],
    ["Chromium", "Chromium"],
    ["Firefox", "Firefox"]
  ];
  var COUNTRY_TTL_MS = 24 * 60 * 60 * 1e3;
  var CLOUDFLARE_TRACE_URL = "https://www.cloudflare.com/cdn-cgi/trace";
  function majorVersion(version) {
    const match = String(version ?? "").match(/\d+/);
    return match ? match[0] : "";
  }
  function normalizePlatform(platform) {
    const value = String(platform ?? "").toLowerCase();
    if (!value) return "";
    if (value.includes("android")) return "Android";
    if (value.includes("ios") || value.includes("iphone") || value.includes("ipad")) return "iOS";
    if (value.includes("mac")) return "macOS";
    if (value.includes("win")) return "Windows";
    if (value.includes("cros") || value.includes("chrome os")) return "ChromeOS";
    if (value.includes("linux")) return "Linux";
    return "";
  }
  function osFromUserAgent(userAgent) {
    if (/Android/i.test(userAgent)) return "Android";
    if (/iPhone|iPad|iPod/i.test(userAgent)) return "iOS";
    if (/Mac OS X|Macintosh/i.test(userAgent)) return "macOS";
    if (/Windows/i.test(userAgent)) return "Windows";
    if (/CrOS/i.test(userAgent)) return "ChromeOS";
    if (/Linux/i.test(userAgent)) return "Linux";
    return "";
  }
  function browserFromBrands(brands) {
    if (!Array.isArray(brands)) return "";
    for (const [needle, label] of BROWSER_BRANDS) {
      const match = brands.find((brand) => brand?.brand === needle || String(brand?.brand ?? "").includes(needle));
      if (!match) continue;
      const version = majorVersion(match.version);
      return version ? `${label} ${version}` : label;
    }
    return "";
  }
  function browserFromUserAgent(userAgent) {
    const edge = userAgent.match(/Edg\/(\d+)/);
    if (edge) return `Edge ${edge[1]}`;
    const opera = userAgent.match(/OPR\/(\d+)/);
    if (opera) return `Opera ${opera[1]}`;
    const firefox = userAgent.match(/Firefox\/(\d+)/);
    if (firefox) return `Firefox ${firefox[1]}`;
    const chrome2 = userAgent.match(/Chrome\/(\d+)/);
    if (chrome2) return `Chrome ${chrome2[1]}`;
    const safari = userAgent.match(/Version\/(\d+).+Safari/);
    if (safari) return `Safari ${safari[1]}`;
    return "";
  }
  function detectOsBrowser({ userAgent = "", userAgentData = null } = {}) {
    const brands = userAgentData?.fullVersionList || userAgentData?.brands;
    const os = normalizePlatform(userAgentData?.platform) || osFromUserAgent(userAgent) || "Unknown";
    const browser = browserFromBrands(brands) || browserFromUserAgent(userAgent) || "Unknown";
    return { os, browser };
  }
  function parseCloudflareLoc(text) {
    if (typeof text !== "string") return null;
    for (const line of text.split(/\r?\n/)) {
      if (!line.startsWith("loc=")) continue;
      const code = line.slice(4).trim().toUpperCase();
      return /^[A-Z]{2}$/.test(code) ? code : null;
    }
    return null;
  }
  function countryNameFromCode(code, displayNames) {
    if (!code || !/^[A-Za-z]{2}$/.test(code)) return null;
    try {
      const names = displayNames || new Intl.DisplayNames(["en"], { type: "region" });
      const name = names.of(code.toUpperCase());
      if (!name || name.toUpperCase() === code.toUpperCase()) return null;
      return name;
    } catch {
      return null;
    }
  }
  function countryFromLocale(language, displayNames) {
    if (!language || typeof language !== "string") return null;
    try {
      const locale = new Intl.Locale(language);
      if (!locale.region) return null;
      return countryNameFromCode(locale.region, displayNames);
    } catch {
      const match = language.match(/[-_]([A-Za-z]{2})$/);
      return match ? countryNameFromCode(match[1], displayNames) : null;
    }
  }
  function readCountryCache(cache, now = Date.now()) {
    if (!cache || typeof cache.country !== "string" || !cache.country || cache.country === "Unknown") return null;
    if (typeof cache.fetchedAt !== "number") return null;
    if (now - cache.fetchedAt >= COUNTRY_TTL_MS) return null;
    return cache.country;
  }
  async function resolveCountry({ fetchImpl, locale, cache, now = Date.now(), displayNames } = {}) {
    const cached = readCountryCache(cache, now);
    if (cached) return { country: cached, cache: null, fromCache: true };
    try {
      const response = await fetchImpl(CLOUDFLARE_TRACE_URL, {
        method: "GET",
        cache: "no-store",
        signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(4e3) : void 0
      });
      if (response?.ok) {
        const code = parseCloudflareLoc(await response.text());
        const name = code ? countryNameFromCode(code, displayNames) : null;
        if (name) return { country: name, fromCache: false, cache: { country: name, fetchedAt: now } };
      }
    } catch {
    }
    const fromLocale = countryFromLocale(locale, displayNames);
    if (fromLocale) return { country: fromLocale, fromCache: false, cache: null };
    return { country: "Unknown", fromCache: false, cache: null };
  }
  var RESERVED_ATTRIBUTE_KEYS = /* @__PURE__ */ new Set(["kind", "key", "anonymous", "os", "browser", "country", "org", "domain"]);
  function attributeKeyError(key, seen = /* @__PURE__ */ new Set()) {
    const name = String(key ?? "").trim();
    if (!name) return "Attribute key is required.";
    if (name === "os" || name === "browser" || name === "country" || name === "org" || name === "domain") return `${name} is already detected.`;
    if (RESERVED_ATTRIBUTE_KEYS.has(name)) return `${name} is reserved.`;
    if (!/^[A-Za-z][A-Za-z0-9._-]{0,63}$/.test(name)) return 'Start with a letter. Then use letters, numbers, ".", "_", or "-".';
    if (seen.has(name)) return "This attribute is already used.";
    return "";
  }
  function validateContextAttributes(attributes) {
    const errors = {};
    const seen = /* @__PURE__ */ new Set();
    for (const item of Array.isArray(attributes) ? attributes : []) {
      const key = String(item?.key ?? "").trim();
      const value = String(item?.value ?? "").trim();
      if (!key && !value) continue;
      const keyError = attributeKeyError(key, seen);
      if (keyError) {
        errors[item.id] = keyError;
        continue;
      }
      if (!value) {
        errors[item.id] = "Attribute value is required.";
        continue;
      }
      seen.add(key);
    }
    return errors;
  }
  function customAttributes(attributes) {
    const applied = {};
    const seen = /* @__PURE__ */ new Set();
    for (const item of Array.isArray(attributes) ? attributes : []) {
      const key = String(item?.key ?? "").trim();
      const value = String(item?.value ?? "");
      if (!String(value).trim() || attributeKeyError(key, seen)) continue;
      seen.add(key);
      applied[key] = value;
    }
    return applied;
  }
  function buildContext({ anonymous, userKey, anonymousKey, os, browser, country, org = "", domain = "", attributes = [] }) {
    return {
      kind: "user",
      key: anonymous ? anonymousKey : String(userKey ?? "").trim(),
      anonymous: Boolean(anonymous),
      os,
      browser,
      country,
      org: String(org ?? "").trim(),
      domain: String(domain ?? "").trim(),
      ...customAttributes(attributes)
    };
  }
  async function detectOsBrowserFromNavigator(nav = globalThis.navigator) {
    let userAgentData = nav?.userAgentData || null;
    if (userAgentData?.getHighEntropyValues) {
      try {
        const high = await userAgentData.getHighEntropyValues(["platform", "fullVersionList"]);
        userAgentData = {
          platform: high.platform || userAgentData.platform,
          brands: high.fullVersionList || userAgentData.brands,
          fullVersionList: high.fullVersionList
        };
      } catch {
      }
    }
    return detectOsBrowser({ userAgent: nav?.userAgent || "", userAgentData });
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
  function anonymousKeyForDomain({ anonymous, key, keyDomain, domain, uuid = createUuid }) {
    const nextDomain = String(domain ?? "").trim();
    const currentKey = typeof key === "string" ? key.trim() : "";
    const currentDomain = typeof keyDomain === "string" ? keyDomain.trim() : "";
    if (!anonymous || !nextDomain || currentKey && currentDomain === nextDomain) {
      return { key: currentKey, domain: currentDomain };
    }
    return { key: uuid(), domain: nextDomain };
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
      observability: false,
      sessionReplay: false,
      collecting: false,
      attributes: [],
      divs: [],
      connected: false,
      notice: ""
    };
  }
  function preserveText(stored, incoming) {
    const next = String(incoming ?? "");
    return next.trim() ? next : String(stored ?? "");
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
      observability: Boolean(merged.observability),
      sessionReplay: Boolean(merged.sessionReplay),
      collecting: Boolean(merged.collecting),
      attributes: normalizeStoredAttributes(merged.attributes, uuid),
      divs: Array.isArray(merged.divs) ? merged.divs.map((div) => normalizeStoredDiv(div, uuid)) : [],
      connected: Boolean(merged.connected),
      notice: String(merged.notice ?? "")
    };
  }
  function validateApiKey(apiKey) {
    if (!String(apiKey ?? "").trim()) return { ok: false, error: "API key is required." };
    return { ok: true, error: "" };
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
  function validateUserContext({ anonymous, userKey }) {
    if (anonymous) return { ok: true, error: "" };
    if (!String(userKey ?? "").trim()) {
      return { ok: false, error: "User key is required for a defined user." };
    }
    return { ok: true, error: "" };
  }
  function buildExportPayload(state2) {
    return {
      apiKey: String(state2.apiKey ?? ""),
      customerName: String(state2.customerName ?? ""),
      targetDomain: normalizeDomain(state2.targetDomain || ""),
      projectKey: String(state2.projectKey ?? ""),
      environmentKey: String(state2.environmentKey ?? ""),
      observability: Boolean(state2.observability),
      sessionReplay: Boolean(state2.sessionReplay),
      userContext: {
        anonymous: Boolean(state2.anonymous),
        userKey: String(state2.userKey ?? ""),
        attributes: (Array.isArray(state2.attributes) ? state2.attributes : []).map((item) => ({
          key: String(item?.key ?? ""),
          value: String(item?.value ?? "")
        }))
      },
      divs: (state2.divs || []).map((div) => ({
        name: String(div.name ?? ""),
        selector: String(div.selector ?? ""),
        defaultState: Boolean(div.defaultState),
        whenFalse: div.whenFalse === "show" || div.whenFalse === "blockClicks" ? "show" : "hide"
      }))
    };
  }
  function invalid(message) {
    const error = new Error(message);
    error.code = "MALFORMED_CONFIG";
    return error;
  }
  function parseImportedConfig(data, uuid = createUuid) {
    if (!data || typeof data !== "object" || Array.isArray(data)) throw invalid("Config file is not a JSON object.");
    for (const key of ["apiKey", "customerName", "targetDomain"]) {
      if (typeof data[key] !== "string" || !data[key].trim()) throw invalid(`Config file is missing ${key}.`);
    }
    if (!Array.isArray(data.divs)) throw invalid("Config file is missing a divs array.");
    if (data.projectKey != null && typeof data.projectKey !== "string") throw invalid("projectKey must be a string.");
    if (data.environmentKey != null && typeof data.environmentKey !== "string") throw invalid("environmentKey must be a string.");
    const domain = normalizeDomain(data.targetDomain);
    if (!domain || !isValidHostname(domain)) throw invalid("Config file has an invalid targetDomain.");
    const observability = optionalBoolean(data.observability, "observability");
    const sessionReplay = optionalBoolean(data.sessionReplay, "sessionReplay");
    let anonymous = true;
    let userKey = "";
    let attributes = [];
    if (data.userContext != null) {
      if (typeof data.userContext !== "object" || Array.isArray(data.userContext)) {
        throw invalid("userContext must be an object.");
      }
      if (data.userContext.anonymous != null && typeof data.userContext.anonymous !== "boolean") {
        throw invalid("userContext.anonymous must be a boolean.");
      }
      if (data.userContext.userKey != null && typeof data.userContext.userKey !== "string") {
        throw invalid("userContext.userKey must be a string.");
      }
      anonymous = data.userContext.anonymous !== false;
      userKey = typeof data.userContext.userKey === "string" ? data.userContext.userKey : "";
      if (data.userContext.attributes != null) {
        if (!Array.isArray(data.userContext.attributes)) throw invalid("userContext.attributes must be an array.");
        attributes = data.userContext.attributes.map((item, index) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) throw invalid(`Attribute at index ${index} is invalid.`);
          if (typeof item.key !== "string") throw invalid(`Attribute at index ${index} is missing a key.`);
          if (typeof item.value !== "string") throw invalid(`Attribute at index ${index} is missing a value.`);
          return { id: uuid(), key: item.key, value: item.value };
        });
      }
    }
    const divs = data.divs.map((div, index) => {
      if (!div || typeof div !== "object" || Array.isArray(div)) throw invalid(`Div at index ${index} is invalid.`);
      if (typeof div.name !== "string" || !div.name.trim()) throw invalid(`Div at index ${index} is missing a name.`);
      if (typeof div.selector !== "string" || !div.selector.trim()) throw invalid(`Div "${div.name}" is missing a selector.`);
      if (typeof div.defaultState !== "boolean") throw invalid(`Div "${div.name}" has an invalid defaultState.`);
      if (div.whenFalse !== "hide" && div.whenFalse !== "show" && div.whenFalse !== "blockClicks") {
        throw invalid(`Div "${div.name}" has an invalid whenFalse action.`);
      }
      return {
        id: uuid(),
        name: div.name.trim(),
        selector: div.selector.trim(),
        defaultState: div.defaultState,
        whenFalse: div.whenFalse === "hide" ? "hide" : "show"
      };
    });
    return {
      apiKey: data.apiKey.trim(),
      customerName: data.customerName.trim(),
      targetDomain: domain,
      projectKey: typeof data.projectKey === "string" ? data.projectKey : "",
      environmentKey: typeof data.environmentKey === "string" ? data.environmentKey : "",
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
    if (typeof value !== "boolean") throw invalid(`${name} must be a boolean.`);
    return value;
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
  function divNameFromFlag(flag, customerName) {
    const name = String(flag?.name || flag?.key || "").trim();
    const prefix = `${String(customerName || "").trim()} - `;
    if (String(customerName || "").trim() && name.startsWith(prefix)) return name.slice(prefix.length).trim();
    return name;
  }
  function selectorFromDescription(description) {
    const value = String(description ?? "").trim();
    if (!value || !isValidCssSelector(value)) return "";
    if (/\s/.test(value) && !/[#.\[>:~+]/.test(value)) return "";
    return value;
  }
  function rowsFromOwnedFlags({ flags, customerName, environmentKey, existingDivs = [], uuid = () => "" }) {
    const customer = String(customerName || "").trim();
    const owned = (flags || []).filter((flag) => {
      const tags = new Set(flag?.tags || []);
      if (!tags.has(OWNERSHIP_TAG)) return false;
      return customer ? isOwned(flag, customer) : true;
    });
    const existingByKey = /* @__PURE__ */ new Map();
    for (const div of existingDivs) {
      const identity = flagIdentity(customer, div?.name || "");
      if (identity.key) existingByKey.set(identity.key, div);
    }
    const usedIds = /* @__PURE__ */ new Set();
    const rows = owned.map((flag) => {
      const name = divNameFromFlag(flag, customer);
      const previous = existingByKey.get(flag.key) || existingByKey.get(flagIdentity(customer, name).key);
      if (previous?.id) usedIds.add(previous.id);
      const off = offVariationValue(flag, environmentKey);
      const described = selectorFromDescription(flag.description);
      return {
        id: previous?.id || uuid(),
        name,
        selector: described || String(previous?.selector || ""),
        defaultState: typeof off === "boolean" ? off : false,
        whenFalse: previous?.whenFalse === "show" ? "show" : "hide"
      };
    });
    const extras = existingDivs.filter((div) => div?.id && !usedIds.has(div.id));
    return [...rows, ...extras];
  }
  function offVariationValue(flag, environmentKey) {
    const index = offVariationIndex(flag, environmentKey);
    if (typeof index !== "number") return void 0;
    const variation = flag?.variations?.[index];
    if (!variation || !Object.prototype.hasOwnProperty.call(variation, "value")) return void 0;
    return variation.value;
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

  // src/lib/keys.js
  var SETTINGS_KEY = "settings";
  var ANON_KEY = "anonymousUserKey";
  var ANON_DOMAIN_KEY = "anonymousUserDomain";
  var COUNTRY_CACHE_KEY = "countryCache";
  var SDK_STATUS_KEY = "sdkStatus";
  var CONTEXT_DELIVERY_KEY = "contextDelivery";
  var LAST_SYNC_KEY = "lastSyncResult";
  var REGISTRATION_KEY = "registrationStatus";
  var DIV_SNAPSHOT_KEY = "divSnapshot";

  // src/lib/projects.js
  function findEnvironmentByClientId(projects, clientId) {
    const needle = String(clientId ?? "").trim();
    if (!needle || !Array.isArray(projects)) return null;
    for (const project of projects) {
      const environment = (project?.environments || []).find((item) => item?.clientSideId === needle);
      if (environment) return { project, environment };
    }
    return null;
  }
  function clientEnvironmentReady({ connected, projects, clientSideId, projectKey, environmentKey }) {
    if (!connected) return false;
    const match = findEnvironmentByClientId(projects, clientSideId);
    if (!match?.project?.key || !match?.environment?.key) return false;
    return match.project.key === projectKey && match.environment.key === environmentKey;
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

  // src/popup.js
  var $ = (id) => document.getElementById(id);
  var apiKeyInput = $("api-key");
  var customerNameInput = $("customer-name");
  var targetDomainInput = $("target-domain");
  var anonymousInput = $("anonymous");
  var observabilityInput = $("observability");
  var sessionReplayInput = $("session-replay");
  var userKeyInput = $("user-key");
  var projectName = $("project-name");
  var environmentName = $("environment-name");
  var divList = $("div-list");
  var divEmpty = $("div-empty");
  var connectButton = $("connect");
  var startButton = $("start-target");
  var updateButton = $("update-flags");
  var importButton = $("import-config");
  var clearButton = $("clear-settings");
  var fileInput = $("import-file");
  var exportButton = $("export-config");
  var addButton = $("add-div");
  var refreshDivsButton = $("refresh-divs");
  var statusDot = $("status-dot");
  var siteStatus = $("site-status");
  var clientIdInput = $("client-id-input");
  var confirmClientIdButton = $("confirm-client-id");
  var clientIdStatus = $("client-id-status");
  var clientIdError = $("client-id-error");
  var contextJson = $("context-json");
  var contextDelivery = $("context-delivery");
  var attrOs = $("attr-os");
  var attrBrowser = $("attr-browser");
  var attrCountry = $("attr-country");
  var attrOrg = $("attr-org");
  var attrDomain = $("attr-domain");
  var attributeList = $("attribute-list");
  var addAttributeButton = $("add-attribute");
  var updateContextButton = $("update-context");
  var environmentSection = $("environment-section");
  var targetSection = $("target-section");
  var userContextSection = $("user-context-section");
  var flagsSection = $("flags-section");
  var syncResults = $("sync-results");
  var modal = $("modal");
  var modalTitle = $("modal-title");
  var modalBody = $("modal-body");
  var modalList = $("modal-list");
  var modalConfirm = $("modal-confirm");
  var modalKeep = $("modal-keep");
  var modalCancel = $("modal-cancel");
  var modalActions = document.querySelector(".modal-actions");
  var apiKeyError = $("api-key-error");
  var customerError = $("customer-error");
  var customerPreview = $("customer-preview");
  var domainError = $("domain-error");
  var connectError = $("connect-error");
  var targetError = $("target-error");
  var notice = $("notice");
  var userKeyError = $("user-key-error");
  var sdkStatus = $("sdk-status");
  var state = {
    ...defaultSettings(),
    apiKey: "",
    anonymousUserKey: "",
    anonymousKeyDomain: "",
    os: "Detecting\u2026",
    browser: "Detecting\u2026",
    country: "Detecting\u2026",
    persistedDomain: "",
    busy: false
  };
  var serverRowErrors = {};
  var persistTimer = 0;
  var savedDivs = [];
  var applyingClientId = false;
  var loadedClientId = "";
  var clientLookup = 0;
  var contextTimer = 0;
  var editVersion = 0;
  var domainPermissionPending = false;
  function renderContextDelivery(delivery) {
    if (!delivery) {
      setMessage(contextDelivery, "");
      return;
    }
    if (!delivery.ok) {
      setMessage(contextDelivery, delivery.error || "LaunchDarkly did not receive the user context.");
      return;
    }
    setMessage(contextDelivery, `Sent context key ${delivery.key}.`);
  }
  function setMessage(element, text) {
    const slot = element.querySelector?.(":scope > .message-text");
    if (slot) {
      slot.textContent = text || "";
      element.hidden = !text;
      const tip = element.querySelector(":scope > .tip");
      if (tip) tip.hidden = !String(text || "").startsWith("Target domain permission");
      return;
    }
    element.textContent = text || "";
    element.hidden = !text;
  }
  function setDot(connected) {
    statusDot.classList.toggle("is-on", connected);
    statusDot.classList.toggle("is-off", !connected);
    const label = connected ? "Connected" : "Disconnected";
    statusDot.title = label;
    statusDot.setAttribute("aria-label", label);
  }
  function settingsFromState() {
    return cleanSettings({
      customerName: state.customerName,
      targetDomain: state.targetDomain,
      projectKey: state.projectKey,
      environmentKey: state.environmentKey,
      clientSideId: state.clientSideId,
      projects: state.projects,
      anonymous: state.anonymous,
      userKey: state.userKey,
      observability: state.observability,
      sessionReplay: state.sessionReplay,
      collecting: state.collecting,
      attributes: state.attributes,
      divs: state.divs,
      connected: state.connected,
      notice: state.notice
    });
  }
  function captureForm({ keepDivs = false, keepDomain = false, keepAttributes = false } = {}) {
    state.apiKey = apiKeyInput.value;
    state.customerName = customerNameInput.value;
    state.targetDomain = keepDomain ? preserveText(state.targetDomain, targetDomainInput.value) : targetDomainInput.value;
    state.anonymous = anonymousInput.checked;
    state.observability = observabilityInput.checked;
    state.sessionReplay = sessionReplayInput.checked;
    state.userKey = userKeyInput.value;
    if (!keepDivs) readDivsFromDom();
    if (!keepAttributes) readAttributesFromDom();
  }
  var anonymousKeyWrite = Promise.resolve();
  async function assignAnonymousKey(domain) {
    const next = anonymousKeyForDomain({
      anonymous: state.anonymous,
      key: state.anonymousUserKey,
      keyDomain: state.anonymousKeyDomain,
      domain: normalizeDomain(domain || "")
    });
    if (next.key === state.anonymousUserKey && next.domain === state.anonymousKeyDomain) {
      await anonymousKeyWrite;
      return;
    }
    state.anonymousUserKey = next.key;
    state.anonymousKeyDomain = next.domain;
    updateContextPreview();
    const write = chrome.storage.local.set({
      [ANON_KEY]: state.anonymousUserKey,
      [ANON_DOMAIN_KEY]: state.anonymousKeyDomain
    });
    anonymousKeyWrite = write;
    await write;
  }
  var persistSerial = 0;
  async function persist({ keepDivs = false, keepDomain = false } = {}) {
    captureForm({ keepDivs, keepDomain });
    const serial = ++persistSerial;
    const settings = settingsFromState();
    const apiKey = state.apiKey;
    await writeExtensionApiKey(apiKey);
    if (serial !== persistSerial) return;
    await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  }
  function schedulePersist() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      persist().catch(() => {
      });
    }, 250);
  }
  async function send(message) {
    try {
      return await chrome.runtime.sendMessage(message);
    } catch {
      return { ok: false, error: "The extension background service stopped. Reopen the popup and try again." };
    }
  }
  function currentProject() {
    return state.projects.find((project) => project.key === state.projectKey) || null;
  }
  function showProjectEnvironment() {
    const project = currentProject();
    const environment = project?.environments?.find((item) => item.key === state.environmentKey) || null;
    projectName.textContent = project?.name || "Not selected";
    environmentName.textContent = environment?.name || "Not selected";
    updateClientId();
    updateVisibility();
  }
  function updateClientId() {
    const next = state.clientSideId || "";
    if (clientIdInput.value === next) return;
    applyingClientId = true;
    clientIdInput.value = next;
    applyingClientId = false;
  }
  async function loadOwnedFlags(token) {
    const result = await send({ type: MSG.LIST_OWNED_FLAGS });
    if (token !== clientLookup) return;
    if (!result?.ok) {
      setMessage(clientIdStatus, "");
      setMessage(clientIdError, result?.error || "Could not load DarkLaunching flags.");
      return;
    }
    state.divs = rowsFromOwnedFlags({
      flags: result.flags,
      customerName: state.customerName,
      environmentKey: state.environmentKey,
      existingDivs: state.divs,
      uuid: createUuid
    });
    const count = (result.flags || []).filter((flag) => state.divs.some((div) => flag.key === flagIdentity(state.customerName, div.name).key)).length;
    renderDivList();
    updateVisibility();
    editVersion += 1;
    await persist();
    await writeDivSnapshot(state.divs);
    if (token !== clientLookup) return;
    await reinstrumentPage();
    if (token !== clientLookup) return;
    setMessage(clientIdError, "");
    setMessage(
      clientIdStatus,
      count ? `Loaded ${count} DarkLaunching ${count === 1 ? "flag" : "flags"}.` : "No DarkLaunching flags for this customer in this environment."
    );
    loadedClientId = state.clientSideId;
  }
  function setClientIdInvalid(invalid2) {
    clientIdInput.classList.toggle("is-invalid", invalid2);
  }
  async function lookupClientId({ reportMiss = false } = {}) {
    if (applyingClientId || state.busy || state.collecting) return;
    const token = ++clientLookup;
    const value = clientIdInput.value.trim();
    const match = findEnvironmentByClientId(state.projects, value);
    if (!value || !match) {
      setMessage(clientIdStatus, "");
      if (reportMiss) {
        setClientIdInvalid(true);
        setMessage(clientIdError, value ? "No environment uses this client ID." : "Enter a client ID.");
      } else {
        setMessage(clientIdError, "");
      }
      updateVisibility();
      return;
    }
    setClientIdInvalid(false);
    setMessage(clientIdError, "");
    const changed = match.project.key !== state.projectKey || match.environment.key !== state.environmentKey || state.clientSideId !== match.environment.clientSideId;
    if (changed) {
      state.projectKey = match.project.key;
      state.environmentKey = match.environment.key;
      state.clientSideId = match.environment.clientSideId;
      editVersion += 1;
      showProjectEnvironment();
      await persist();
      await reinstrumentPage();
    }
    if (token !== clientLookup) return;
    if (loadedClientId === state.clientSideId && !changed) return;
    await loadOwnedFlags(token);
  }
  function setFieldLocked(input, locked) {
    input.disabled = locked;
    const field = input.closest(".field");
    if (!field) return;
    field.classList.toggle("is-locked", locked);
    const icon = field.querySelector(".lock");
    if (icon) icon.hidden = !locked;
  }
  function enteredClientId() {
    return clientIdInput.value.trim();
  }
  function updateVisibility() {
    const connected = state.connected;
    const clientSideId = enteredClientId();
    const clientReady = clientEnvironmentReady({
      connected,
      projects: state.projects,
      clientSideId,
      projectKey: state.projectKey,
      environmentKey: state.environmentKey
    });
    const collecting = state.collecting;
    environmentSection.hidden = !connected;
    targetSection.hidden = !clientReady;
    userContextSection.hidden = !(clientReady && collecting);
    if (clientReady) {
      const match = findEnvironmentByClientId(state.projects, clientSideId);
      projectName.textContent = match.project.name || match.project.key;
      environmentName.textContent = match.environment.name || match.environment.key;
    } else if (connected) {
      projectName.textContent = "Not selected";
      environmentName.textContent = "Not selected";
    }
    flagsSection.hidden = !(clientReady && collecting);
    clearButton.hidden = state.connected;
    setFieldLocked(apiKeyInput, state.connected);
    const targetLocked = state.collecting;
    setFieldLocked(clientIdInput, targetLocked);
    confirmClientIdButton.disabled = targetLocked || state.busy;
    setFieldLocked(customerNameInput, targetLocked);
    setFieldLocked(targetDomainInput, targetLocked);
    observabilityInput.disabled = targetLocked;
    sessionReplayInput.disabled = targetLocked;
    updateStartButton();
  }
  function updateCustomerPreview() {
    const key = sanitizeKey(state.customerName);
    if (!String(state.customerName).trim()) {
      setMessage(customerPreview, "");
      setMessage(customerError, "");
      return;
    }
    if (!key) {
      setMessage(customerPreview, "");
      setMessage(customerError, "Customer name must include letters or numbers.");
      return;
    }
    setMessage(customerError, "");
    customerPreview.hidden = false;
    customerPreview.textContent = `Flag prefix: ${key}`;
  }
  function updateContextPreview() {
    userKeyInput.disabled = state.anonymous;
    const user = validateUserContext(state);
    setMessage(userKeyError, state.anonymous ? "" : user.error);
    const org = String(state.customerName ?? "").trim();
    const domain = normalizeDomain(state.targetDomain || "");
    attrOs.textContent = state.os;
    attrBrowser.textContent = state.browser;
    attrCountry.textContent = state.country;
    attrOrg.textContent = org || "Not set";
    attrDomain.textContent = domain || "Not set";
    if (!user.ok || state.country === "Detecting\u2026" || state.os === "Detecting\u2026") {
      contextJson.textContent = user.ok ? "Detecting context attributes\u2026" : user.error;
      return null;
    }
    const context = buildContext({
      anonymous: state.anonymous,
      userKey: state.userKey,
      anonymousKey: state.anonymousUserKey,
      os: state.os,
      browser: state.browser,
      country: state.country,
      org: String(state.customerName ?? "").trim(),
      domain: normalizeDomain(state.targetDomain || ""),
      attributes: state.attributes
    });
    contextJson.textContent = JSON.stringify(context, null, 2);
    return context;
  }
  function readAttributesFromDom() {
    state.attributes = [...attributeList.querySelectorAll(".attr-row")].map((row) => ({
      id: row.dataset.id,
      key: row.querySelector(".attr-key").value,
      value: row.querySelector(".attr-value").value
    }));
  }
  function paintAttributeErrors() {
    const errors = validateContextAttributes(state.attributes);
    for (const row of attributeList.querySelectorAll(".attr-row")) {
      const error = errors[row.dataset.id] || "";
      const errorElement = row.querySelector(".row-error");
      errorElement.textContent = error;
      errorElement.hidden = !error;
      row.classList.toggle("has-error", Boolean(error));
    }
    return Object.keys(errors).length === 0;
  }
  function createAttributeRow(attribute) {
    const row = document.createElement("div");
    row.className = "attr-row";
    row.dataset.id = attribute.id;
    const keyInput = document.createElement("input");
    keyInput.className = "attr-key";
    keyInput.type = "text";
    keyInput.placeholder = "Key";
    keyInput.setAttribute("aria-label", "Attribute key");
    keyInput.autocomplete = "off";
    keyInput.spellcheck = false;
    keyInput.value = attribute.key || "";
    const valueInput = document.createElement("input");
    valueInput.className = "attr-value";
    valueInput.type = "text";
    valueInput.placeholder = "Value";
    valueInput.setAttribute("aria-label", "Attribute value");
    valueInput.autocomplete = "off";
    valueInput.spellcheck = false;
    valueInput.value = attribute.value || "";
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "icon remove";
    removeButton.setAttribute("aria-label", "Remove attribute");
    removeButton.textContent = "X";
    const error = document.createElement("p");
    error.className = "row-error error";
    error.hidden = true;
    const onEdit = () => {
      readAttributesFromDom();
      schedulePersist();
    };
    keyInput.addEventListener("input", onEdit);
    valueInput.addEventListener("input", onEdit);
    removeButton.addEventListener("click", () => {
      row.remove();
      readAttributesFromDom();
      schedulePersist();
    });
    row.append(keyInput, valueInput, removeButton, error);
    return row;
  }
  function renderAttributeList() {
    attributeList.replaceChildren(...(state.attributes || []).map(createAttributeRow));
  }
  function showConnectionErrors(errors) {
    setMessage(apiKeyError, errors.apiKey || "");
    setMessage(customerError, errors.customerName || "");
    setMessage(domainError, errors.targetDomain || "");
  }
  function readDivsFromDom() {
    const rows = [...divList.querySelectorAll(".div-row")];
    if (!rows.length) {
      state.divs = [];
      return;
    }
    state.divs = rows.map((row) => {
      const previous = state.divs.find((div) => div.id === row.dataset.id);
      const nameInput = row.querySelector(".flag-name");
      const selectorInput = row.querySelector(".css-selector");
      const defaultInput = row.querySelector(".default-state");
      const actionInput = row.querySelector(".when-false");
      return {
        id: row.dataset.id,
        name: nameInput ? nameInput.value : previous?.name || "",
        selector: selectorInput ? selectorInput.value : previous?.selector || "",
        defaultState: defaultInput ? defaultInput.value === "true" : previous?.defaultState !== false,
        whenFalse: actionInput ? actionInput.value : previous?.whenFalse || "hide"
      };
    });
  }
  function paintRowErrors() {
    readDivsFromDom();
    const local = validateDivRows(state.divs, state.customerName);
    for (const row of divList.querySelectorAll(".div-row")) {
      const error = serverRowErrors[row.dataset.id] || local[row.dataset.id] || "";
      const errorElement = row.querySelector(".row-error");
      errorElement.textContent = error;
      errorElement.hidden = !error;
      row.classList.toggle("has-error", Boolean(error));
      const flagName = row.querySelector(".flag-name").value.trim();
      const identity = flagIdentity(state.customerName, flagName);
      row.querySelector(".row-title").textContent = flagName || "Untitled selector";
      row.querySelector(".key-preview").textContent = flagName && identity.name ? identity.name : "Flag name will appear here";
      if (error) row.open = true;
    }
    divEmpty.hidden = state.divs.length > 0;
  }
  function createDivRow(div) {
    const row = document.createElement("details");
    row.className = "div-row";
    row.dataset.id = div.id;
    row.open = !String(div.name || "").trim();
    const summary = document.createElement("summary");
    const title = document.createElement("span");
    title.className = "row-title";
    title.textContent = String(div.name || "").trim() || "Untitled selector";
    summary.append(title);
    const top = document.createElement("div");
    top.className = "row-top";
    const flagNameLabel = document.createElement("label");
    flagNameLabel.append("Name");
    const nameField = document.createElement("div");
    nameField.className = "name-field";
    const flagNameInput = document.createElement("input");
    flagNameInput.className = "flag-name";
    flagNameInput.type = "text";
    flagNameInput.required = true;
    flagNameInput.placeholder = "Travel logo";
    flagNameInput.value = div.name;
    flagNameInput.autocomplete = "off";
    flagNameInput.spellcheck = false;
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "icon remove";
    removeButton.setAttribute("aria-label", "Remove row");
    removeButton.textContent = "X";
    nameField.append(flagNameInput, removeButton);
    flagNameLabel.append(nameField);
    const nameLabel = document.createElement("label");
    nameLabel.append("CSS Selector");
    const nameInput = document.createElement("input");
    nameInput.className = "css-selector";
    nameInput.type = "text";
    nameInput.placeholder = "#header > a > img";
    nameInput.value = div.selector || "";
    nameInput.autocomplete = "off";
    nameInput.spellcheck = false;
    nameLabel.append(nameInput);
    top.append(flagNameLabel, nameLabel);
    const defaultLabel = document.createElement("label");
    defaultLabel.append("Default State when Disabled");
    const defaultSelect = document.createElement("select");
    defaultSelect.className = "default-state";
    for (const [value, label] of [
      ["false", "Serve False"],
      ["true", "Serve True"]
    ]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      defaultSelect.append(option);
    }
    defaultSelect.value = div.defaultState ? "true" : "false";
    defaultLabel.append(defaultSelect);
    const actionLabel = document.createElement("label");
    actionLabel.append("When false");
    const actionSelect = document.createElement("select");
    actionSelect.className = "when-false";
    for (const [value, label] of [
      ["hide", "Hide element"],
      ["show", "Show element"]
    ]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      actionSelect.append(option);
    }
    actionSelect.value = div.whenFalse === "show" ? "show" : "hide";
    actionLabel.append(actionSelect);
    const preview = document.createElement("p");
    preview.className = "key-preview help";
    const error = document.createElement("p");
    error.className = "row-error error";
    error.hidden = true;
    row.append(summary, top, defaultLabel, actionLabel, preview, error);
    const onEdit = () => {
      delete serverRowErrors[row.dataset.id];
      editVersion += 1;
      paintRowErrors();
      schedulePersist();
    };
    flagNameInput.addEventListener("input", onEdit);
    nameInput.addEventListener("input", onEdit);
    defaultSelect.addEventListener("change", onEdit);
    actionSelect.addEventListener("change", onEdit);
    removeButton.addEventListener("click", () => {
      delete serverRowErrors[row.dataset.id];
      row.remove();
      editVersion += 1;
      paintRowErrors();
      schedulePersist();
    });
    return row;
  }
  function cloneDivs(divs) {
    return cleanSettings({ divs }).divs.map((div) => ({ ...div }));
  }
  async function writeDivSnapshot(divs) {
    savedDivs = cloneDivs(divs);
    await chrome.storage.local.set({ [DIV_SNAPSHOT_KEY]: savedDivs });
  }
  function renderDivList() {
    divList.replaceChildren(...state.divs.map(createDivRow));
    paintRowErrors();
  }
  function renderSummary(summary) {
    syncResults.replaceChildren();
    if (!summary?.line) return;
    const line = document.createElement("p");
    line.textContent = summary.line;
    syncResults.append(line);
    if (summary.details?.length) {
      const list = document.createElement("ul");
      for (const detail of summary.details) {
        const item = document.createElement("li");
        item.textContent = detail;
        list.append(item);
      }
      syncResults.append(list);
    }
  }
  function applyRemoteConnection(settings) {
    state.connected = settings.connected;
    state.projects = settings.projects;
    state.projectKey = settings.projectKey;
    state.environmentKey = settings.environmentKey;
    state.clientSideId = settings.clientSideId;
    state.notice = settings.notice;
    state.persistedDomain = settings.targetDomain;
    showProjectEnvironment();
    setDot(settings.connected);
    updateConnectButton();
    setMessage(notice, settings.notice);
  }
  function updateConnectButton() {
    if (state.busy) return;
    connectButton.textContent = state.connected ? "Disconnect" : "Connect";
  }
  function updateStartButton() {
    if (state.busy) return;
    startButton.textContent = state.collecting ? "Stop" : "Start";
  }
  function setBusy(busy, which) {
    state.busy = busy;
    connectButton.disabled = busy;
    startButton.disabled = busy;
    updateButton.disabled = busy;
    importButton.disabled = busy;
    clearButton.disabled = busy;
    addButton.disabled = busy;
    refreshDivsButton.disabled = busy;
    confirmClientIdButton.disabled = busy || state.collecting;
    addAttributeButton.disabled = busy;
    updateContextButton.disabled = busy;
    if (busy && which === "connect") connectButton.textContent = "Connecting\u2026";
    else if (busy && which === "disconnect") connectButton.textContent = "Disconnecting\u2026";
    else updateConnectButton();
    if (busy && which === "start") startButton.textContent = "Starting\u2026";
    else if (busy && which === "stop") startButton.textContent = "Stopping\u2026";
    else updateStartButton();
    updateButton.textContent = busy && which === "update" ? "Updating\u2026" : "Update Flags";
  }
  function openModal({ title, body, items, confirmLabel, danger, keepLabel }) {
    return new Promise((resolve) => {
      modalTitle.textContent = title;
      modalBody.textContent = body;
      modalList.replaceChildren();
      for (const item of items || []) {
        const li = document.createElement("li");
        li.textContent = item;
        modalList.append(li);
      }
      modalList.hidden = !items?.length;
      modalConfirm.textContent = confirmLabel;
      modalConfirm.classList.toggle("danger", Boolean(danger));
      modalKeep.hidden = !keepLabel;
      modalKeep.textContent = keepLabel || "Clear settings, keep API key and client ID";
      modalActions.classList.toggle("stacked", Boolean(keepLabel));
      modal.hidden = false;
      const finish = (value) => {
        modal.hidden = true;
        modalKeep.hidden = true;
        modalActions.classList.remove("stacked");
        modalConfirm.removeEventListener("click", onConfirm);
        modalKeep.removeEventListener("click", onKeep);
        modalCancel.removeEventListener("click", onCancel);
        document.removeEventListener("keydown", onKey);
        resolve(value);
      };
      const onConfirm = () => finish(true);
      const onKeep = () => finish("keep");
      const onCancel = () => finish(false);
      const onKey = (event) => {
        if (event.key === "Escape") finish(false);
      };
      modalConfirm.addEventListener("click", onConfirm);
      modalKeep.addEventListener("click", onKeep);
      modalCancel.addEventListener("click", onCancel);
      document.addEventListener("keydown", onKey);
      (keepLabel ? modalKeep : modalConfirm).focus();
    });
  }
  async function messageTabs(message, domain = state.targetDomain) {
    const target = normalizeDomain(domain);
    const tabs = await chrome.tabs.query({});
    let matching = 0;
    let delivered = 0;
    await Promise.all(
      tabs.map(async (tab) => {
        if (!tab.id || !tab.url || !target) return;
        let hostname = "";
        try {
          hostname = new URL(tab.url).hostname;
        } catch {
          return;
        }
        if (!hostMatchesTarget(hostname, target)) return;
        matching += 1;
        try {
          await chrome.tabs.sendMessage(tab.id, message);
          delivered += 1;
        } catch {
        }
      })
    );
    return matching === 0 || delivered > 0;
  }
  async function messageEveryTab(message) {
    const tabs = await chrome.tabs.query({});
    await Promise.all(
      tabs.map(async (tab) => {
        if (!tab.id) return;
        try {
          await chrome.tabs.sendMessage(tab.id, message);
        } catch {
        }
      })
    );
  }
  async function retireDomain(previous, next) {
    if (!previous || previous === next || !isValidHostname(previous)) return;
    try {
      await chrome.permissions.remove({ origins: permissionOrigins(previous) });
    } catch {
    }
  }
  async function pushContext() {
    await persist();
    const context = updateContextPreview();
    if (!state.connected) return;
    if (!context) {
      await messageTabs({ type: MSG.SHUTDOWN });
      return;
    }
    const delivered = await messageTabs({ type: MSG.IDENTIFY, context });
    if (!delivered) {
      await send({ type: MSG.SYNC_REGISTRATION });
      await messageTabs({ type: MSG.IDENTIFY, context });
    }
  }
  function scheduleContextPush() {
    clearTimeout(contextTimer);
    contextTimer = setTimeout(() => {
      pushContext().catch(() => {
      });
    }, 300);
  }
  async function updateSiteStatus() {
    const domain = normalizeDomain(state.targetDomain);
    if (!domain) {
      setMessage(siteStatus, "");
      return;
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) {
      setMessage(siteStatus, "");
      return;
    }
    let hostname = "";
    try {
      hostname = new URL(tab.url).hostname;
    } catch {
      setMessage(siteStatus, "");
      return;
    }
    if (hostMatchesTarget(hostname, domain)) {
      setMessage(siteStatus, "");
      return;
    }
    setMessage(siteStatus, `Inactive on this site (target: ${domain})`);
  }
  async function runConnect(permissionPromise) {
    setBusy(true, "connect");
    setMessage(connectError, "");
    const previousDomain = state.persistedDomain;
    state.targetDomain = normalizeDomain(state.targetDomain);
    targetDomainInput.value = state.targetDomain;
    state.customerName = state.customerName.trim();
    customerNameInput.value = state.customerName;
    await assignAnonymousKey(state.targetDomain);
    await persist({ keepDomain: true });
    const [granted, result] = await Promise.all([
      permissionPromise,
      send({
        type: MSG.CONNECT,
        customerName: state.customerName,
        targetDomain: state.targetDomain,
        projectKey: state.projectKey,
        environmentKey: state.environmentKey,
        anonymous: state.anonymous,
        userKey: state.userKey,
        divs: state.divs
      })
    ]);
    if (previousDomain !== state.targetDomain) await retireDomain(previousDomain, state.targetDomain);
    if (!granted) {
      setMessage(domainError, "Target domain permission was denied. DOM changes stay off until you allow access.");
    } else if (domainError.querySelector(".message-text")?.textContent.startsWith("Target domain permission")) {
      setMessage(domainError, "");
    }
    if (result?.settings) applyRemoteConnection(result.settings);
    if (!result?.ok) {
      state.connected = false;
      setDot(false);
      updateVisibility();
      setMessage(connectError, result?.error || "Could not connect to LaunchDarkly.");
    } else {
      setMessage(connectError, "");
      setDot(true);
    }
    state.persistedDomain = state.targetDomain;
    await send({ type: MSG.SYNC_REGISTRATION });
    if (previousDomain && previousDomain !== state.targetDomain) {
      await messageTabs({ type: MSG.SHUTDOWN }, previousDomain);
    }
    if (result?.ok) await messageTabs({ type: MSG.RECONFIGURE, force: true });
    else await messageEveryTab({ type: MSG.SHUTDOWN });
    await pushContext();
    if (state.targetDomain && !targetDomainInput.value.trim()) targetDomainInput.value = state.targetDomain;
    setBusy(false);
    await updateSiteStatus();
  }
  function connectFields() {
    return {
      apiKey: state.apiKey,
      customerName: state.customerName,
      targetDomain: state.targetDomain
    };
  }
  async function runDisconnect() {
    captureForm();
    const divs = state.divs.map((div) => ({ ...div }));
    editVersion += 1;
    setBusy(true, "disconnect");
    setMessage(connectError, "");
    state.connected = false;
    state.collecting = false;
    state.divs = divs;
    state.notice = "";
    setDot(false);
    setMessage(notice, "");
    updateVisibility();
    updateConnectButton();
    try {
      await send({ type: MSG.DISCONNECT, divs });
      await persist({ keepDivs: true });
      await messageEveryTab({ type: MSG.SHUTDOWN });
    } catch {
      setMessage(connectError, "Could not disconnect. Try again.");
    } finally {
      setBusy(false);
    }
  }
  connectButton.addEventListener("click", () => {
    if (state.connected) {
      runDisconnect();
      return;
    }
    captureForm();
    editVersion += 1;
    const apiValidation = validateApiKey(state.apiKey);
    setMessage(apiKeyError, apiValidation.error);
    setMessage(connectError, "");
    if (!apiValidation.ok) return;
    const domain = normalizeDomain(state.targetDomain);
    const domainReady = Boolean(domain && isValidHostname(domain));
    if (domain && !domainReady) setMessage(domainError, "Enter a hostname such as launchdarkly.com.");
    if (domainReady) {
      state.targetDomain = domain;
      targetDomainInput.value = domain;
    }
    domainPermissionPending = domainReady;
    const permissionPromise = domainReady ? chrome.permissions.request({ origins: permissionOrigins(domain) }).catch(() => false) : Promise.resolve(true);
    runConnect(permissionPromise).finally(() => {
      domainPermissionPending = false;
    });
  });
  targetDomainInput.addEventListener("change", () => {
    if (state.collecting) {
      targetDomainInput.value = state.targetDomain;
      return;
    }
    if (!targetDomainInput.value.trim() && domainPermissionPending && state.targetDomain) {
      targetDomainInput.value = state.targetDomain;
      return;
    }
    captureForm();
    const normalized = normalizeDomain(state.targetDomain);
    const previous = state.persistedDomain;
    state.targetDomain = normalized;
    targetDomainInput.value = normalized;
    editVersion += 1;
    updateContextPreview();
    updateSiteStatus();
    if (!normalized || !isValidHostname(normalized)) {
      setMessage(domainError, normalized ? "Enter a hostname such as launchdarkly.com." : "");
      schedulePersist();
      return;
    }
    setMessage(domainError, "");
    void assignAnonymousKey(normalized);
    domainPermissionPending = true;
    void persist({ keepDomain: true });
    const permissionPromise = chrome.permissions.request({ origins: permissionOrigins(normalized) }).catch(() => false);
    permissionPromise.then(async (granted) => {
      try {
        await assignAnonymousKey(normalized);
        await retireDomain(previous, normalized);
        state.persistedDomain = normalized;
        state.targetDomain = normalized;
        if (!targetDomainInput.value.trim()) targetDomainInput.value = normalized;
        if (!granted) {
          setMessage(domainError, "Target domain permission was denied. DOM changes stay off until you allow access.");
        }
        await persist({ keepDomain: true });
        await send({ type: MSG.SYNC_REGISTRATION });
        if (previous && previous !== normalized) await messageTabs({ type: MSG.SHUTDOWN }, previous);
        if (state.connected) await messageTabs({ type: MSG.RECONFIGURE, force: true });
        await pushContext();
      } finally {
        domainPermissionPending = false;
      }
    });
  });
  customerNameInput.addEventListener("input", () => {
    state.customerName = customerNameInput.value;
    loadedClientId = "";
    editVersion += 1;
    updateCustomerPreview();
    updateContextPreview();
    paintRowErrors();
    schedulePersist();
    scheduleContextPush();
  });
  customerNameInput.addEventListener("change", () => {
    if (clientIdInput.value.trim()) lookupClientId().catch(() => {
    });
  });
  apiKeyInput.addEventListener("input", () => {
    state.apiKey = apiKeyInput.value;
    editVersion += 1;
    setMessage(apiKeyError, "");
    setMessage(connectError, "");
    schedulePersist();
  });
  anonymousInput.addEventListener("change", () => {
    state.anonymous = anonymousInput.checked;
    editVersion += 1;
    updateContextPreview();
    scheduleContextPush();
  });
  async function applyTelemetryChange() {
    if (state.collecting) return;
    state.observability = observabilityInput.checked;
    state.sessionReplay = sessionReplayInput.checked;
    editVersion += 1;
    await persist();
  }
  observabilityInput.addEventListener("change", () => {
    applyTelemetryChange().catch(() => {
    });
  });
  sessionReplayInput.addEventListener("change", () => {
    applyTelemetryChange().catch(() => {
    });
  });
  function targetTabs() {
    const target = normalizeDomain(state.targetDomain);
    return chrome.tabs.query({}).then((tabs) => tabs.filter((tab) => {
      if (!tab.id || !tab.url || !target) return false;
      try {
        return hostMatchesTarget(new URL(tab.url).hostname, target);
      } catch {
        return false;
      }
    }));
  }
  async function startCollection(permissionPromise) {
    setBusy(true, "start");
    setMessage(targetError, "");
    const previousDomain = state.persistedDomain;
    state.collecting = true;
    updateVisibility();
    await assignAnonymousKey(state.targetDomain);
    await persist({ keepDomain: true });
    const granted = await permissionPromise;
    if (previousDomain !== state.targetDomain) await retireDomain(previousDomain, state.targetDomain);
    if (!granted) {
      state.collecting = false;
      await persist({ keepDomain: true });
      updateVisibility();
      setMessage(domainError, "Target domain permission was denied. DOM changes stay off until you allow access.");
      setBusy(false);
      return;
    }
    state.persistedDomain = state.targetDomain;
    await send({ type: MSG.SYNC_REGISTRATION });
    const delivered = await messageTabs({ type: MSG.RECONFIGURE, force: true });
    if (!delivered) {
      const tabs = await targetTabs();
      if (tabs.length) {
        const proceed = await openModal({
          title: "Reload target page",
          body: "The target page will reload so Observability and Session replay can start.",
          confirmLabel: "Reload"
        });
        if (!proceed) {
          state.collecting = false;
          await persist({ keepDomain: true });
          updateVisibility();
          setBusy(false);
          return;
        }
        await Promise.all(tabs.map((tab) => chrome.tabs.reload(tab.id)));
      }
    }
    updateVisibility();
    setBusy(false);
  }
  async function stopCollection() {
    setBusy(true, "stop");
    setMessage(targetError, "");
    state.collecting = false;
    updateVisibility();
    await persist({ keepDomain: true });
    await messageTabs({ type: MSG.RECONFIGURE, force: true });
    setBusy(false);
  }
  startButton.addEventListener("click", () => {
    if (state.collecting) {
      stopCollection();
      return;
    }
    captureForm();
    editVersion += 1;
    setMessage(targetError, "");
    if (!state.connected) {
      setMessage(targetError, "Connect to LaunchDarkly before starting.");
      return;
    }
    if (!state.clientSideId) {
      setMessage(targetError, "Enter a client ID before starting.");
      return;
    }
    if (!state.observability && !state.sessionReplay) {
      setMessage(targetError, "Turn on Observability or Session replay before starting.");
      return;
    }
    const domain = normalizeDomain(state.targetDomain);
    if (!domain || !isValidHostname(domain)) {
      setMessage(domainError, domain ? "Enter a hostname such as launchdarkly.com." : "Target domain is required.");
      return;
    }
    state.targetDomain = domain;
    targetDomainInput.value = domain;
    domainPermissionPending = true;
    const permissionPromise = chrome.permissions.request({ origins: permissionOrigins(domain) }).catch(() => false);
    startCollection(permissionPromise).finally(() => {
      domainPermissionPending = false;
    });
  });
  userKeyInput.addEventListener("input", () => {
    state.userKey = userKeyInput.value;
    editVersion += 1;
    updateContextPreview();
    scheduleContextPush();
  });
  addAttributeButton.addEventListener("click", () => {
    const row = createAttributeRow({ id: createUuid(), key: "", value: "" });
    attributeList.append(row);
    row.querySelector(".attr-key").focus();
  });
  updateContextButton.addEventListener("click", async () => {
    readAttributesFromDom();
    if (!paintAttributeErrors()) return;
    updateContextButton.disabled = true;
    try {
      await pushContext();
    } finally {
      updateContextButton.disabled = state.busy;
    }
  });
  clientIdInput.addEventListener("input", () => {
    if (applyingClientId) return;
    if (state.collecting) {
      clientIdInput.value = state.clientSideId;
      return;
    }
    setClientIdInvalid(false);
    setMessage(clientIdError, "");
    updateVisibility();
  });
  confirmClientIdButton.addEventListener("click", () => {
    if (state.collecting) return;
    lookupClientId({ reportMiss: true }).catch(() => {
    });
  });
  refreshDivsButton.addEventListener("click", () => {
    if (state.busy) return;
    const token = ++clientLookup;
    refreshDivsButton.disabled = true;
    loadOwnedFlags(token).finally(() => {
      refreshDivsButton.disabled = state.busy;
    });
  });
  addButton.addEventListener("click", () => {
    const row = createDivRow({ id: createUuid(), name: "", selector: "", defaultState: false, whenFalse: "hide" });
    divList.append(row);
    paintRowErrors();
    row.querySelector(".flag-name").focus();
    schedulePersist();
  });
  updateButton.addEventListener("click", async () => {
    captureForm();
    const validation = validateConnectionInput(connectFields());
    showConnectionErrors(validation.errors);
    if (!validation.ok || !state.connected) {
      if (!state.connected) setMessage(connectError, "Connect to LaunchDarkly before updating flags.");
      return;
    }
    for (const key of Object.keys(serverRowErrors)) delete serverRowErrors[key];
    paintRowErrors();
    const localErrors = validateDivRows(state.divs, state.customerName);
    if (Object.keys(localErrors).length) {
      renderSummary({ line: "Fix the highlighted rows before updating flags.", details: [] });
      return;
    }
    setBusy(true, "update");
    setMessage(connectError, "");
    await persist();
    const prepared = await send({ type: MSG.PREPARE_SYNC });
    if (!prepared?.ok) {
      setBusy(false);
      renderSummary({ line: prepared?.error || "Could not read flags from LaunchDarkly.", details: [] });
      await reinstrumentPage();
      return;
    }
    let deleteConfirmed = true;
    let confirmedDeleteKeys = [];
    if (prepared.plan.prunes.length) {
      deleteConfirmed = await openModal({
        title: "Delete flags?",
        body: "These flags belong to this customer and are no longer in the list. They will be deleted from LaunchDarkly. Cancelling keeps them. Creates and updates still run.",
        items: prepared.plan.prunes.map((flag) => `${flag.name} (${flag.key})`),
        confirmLabel: "Delete flags",
        danger: true
      });
      if (deleteConfirmed) confirmedDeleteKeys = prepared.plan.prunes.map((flag) => flag.key);
    }
    const executed = await send({ type: MSG.EXECUTE_SYNC, deleteConfirmed, confirmedDeleteKeys });
    setBusy(false);
    if (!executed?.ok) {
      renderSummary({ line: executed?.error || "Flag update failed.", details: [] });
      await reinstrumentPage();
      return;
    }
    for (const key of Object.keys(serverRowErrors)) delete serverRowErrors[key];
    for (const item of [...executed.results.skipped, ...executed.results.failed]) {
      if (item.divId && (item.reason || item.message)) serverRowErrors[item.divId] = item.reason || item.message;
    }
    paintRowErrors();
    renderSummary(executed.summary);
    await writeDivSnapshot(state.divs);
    await reinstrumentPage();
  });
  async function reinstrumentPage() {
    const delivered = await messageTabs({ type: MSG.RECONFIGURE, force: true });
    if (!delivered) {
      await send({ type: MSG.SYNC_REGISTRATION });
      await messageTabs({ type: MSG.RECONFIGURE, force: true });
    }
  }
  importButton.addEventListener("click", () => fileInput.click());
  clearButton.addEventListener("click", async () => {
    if (state.connected || state.busy) return;
    const choice = await openModal({
      title: "Clear settings?",
      body: "Keep API key and client ID keeps those two. Clear all removes everything.",
      confirmLabel: "Clear settings all",
      keepLabel: "Clear settings, keep API key and client ID",
      danger: true
    });
    if (!choice || state.connected) return;
    captureForm({ keepDivs: true });
    const previousDomain = state.targetDomain;
    const kept = choice === "keep" ? {
      apiKey: state.apiKey,
      clientSideId: state.clientSideId,
      projectKey: state.projectKey,
      environmentKey: state.environmentKey,
      projects: state.projects
    } : { apiKey: "" };
    editVersion += 1;
    clearTimeout(persistTimer);
    Object.assign(state, defaultSettings(), kept, { persistedDomain: "", anonymousKeyDomain: "" });
    apiKeyInput.value = state.apiKey;
    customerNameInput.value = "";
    targetDomainInput.value = "";
    anonymousInput.checked = state.anonymous;
    userKeyInput.value = "";
    renderDivList();
    renderAttributeList();
    showProjectEnvironment();
    updateCustomerPreview();
    updateContextPreview();
    setDot(false);
    updateConnectButton();
    showConnectionErrors({});
    setMessage(connectError, "");
    setMessage(notice, "");
    setMessage(sdkStatus, "");
    setMessage(clientIdStatus, "");
    setMessage(clientIdError, "");
    renderSummary(null);
    renderContextDelivery(null);
    for (const key of Object.keys(serverRowErrors)) delete serverRowErrors[key];
    await writeExtensionApiKey(state.apiKey);
    await chrome.storage.local.set({ [SETTINGS_KEY]: settingsFromState() });
    await chrome.storage.local.remove([CONTEXT_DELIVERY_KEY, LAST_SYNC_KEY, SDK_STATUS_KEY, REGISTRATION_KEY, DIV_SNAPSHOT_KEY, ANON_DOMAIN_KEY]);
    savedDivs = [];
    await retireDomain(previousDomain, "");
    await messageEveryTab({ type: MSG.SHUTDOWN });
  });
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (!file) return;
    runImport(file);
  });
  async function runImport(file) {
    let config;
    try {
      if (file.size > 1e6) throw new Error("Config file is too large.");
      const parsed = JSON.parse(await file.text());
      config = parseImportedConfig(parsed);
    } catch (error) {
      const message = error instanceof SyntaxError ? "Config file is not valid JSON." : error.message;
      setMessage(connectError, message || "Config file is malformed.");
      return;
    }
    state.apiKey = config.apiKey;
    state.customerName = config.customerName;
    state.targetDomain = config.targetDomain;
    state.projectKey = config.projectKey;
    state.environmentKey = config.environmentKey;
    state.anonymous = config.anonymous;
    state.observability = config.observability;
    state.sessionReplay = config.sessionReplay;
    state.collecting = false;
    state.userKey = config.userKey;
    state.attributes = config.attributes;
    state.divs = config.divs;
    await writeDivSnapshot(state.divs);
    apiKeyInput.value = config.apiKey;
    customerNameInput.value = config.customerName;
    targetDomainInput.value = config.targetDomain;
    anonymousInput.checked = config.anonymous;
    observabilityInput.checked = config.observability;
    sessionReplayInput.checked = config.sessionReplay;
    userKeyInput.value = config.userKey;
    renderAttributeList();
    renderDivList();
    updateCustomerPreview();
    updateContextPreview();
    setMessage(connectError, "");
    showConnectionErrors({});
    const permissionPromise = navigator.userActivation?.isActive === false ? Promise.resolve(false) : chrome.permissions.request({ origins: permissionOrigins(config.targetDomain) }).catch(() => false);
    await runConnect(permissionPromise);
  }
  exportButton.addEventListener("click", async () => {
    captureForm();
    const confirmed = await openModal({
      title: "Export configuration",
      body: "This file contains your API key in plain text. Store it securely.",
      confirmLabel: "Download",
      danger: false
    });
    if (!confirmed) return;
    const blob = new Blob([JSON.stringify(buildExportPayload(state), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ld_config.json";
    link.click();
    URL.revokeObjectURL(url);
  });
  function applyStoredSettings(settings) {
    state.customerName = settings.customerName;
    state.targetDomain = settings.targetDomain;
    state.projectKey = settings.projectKey;
    state.environmentKey = settings.environmentKey;
    state.clientSideId = settings.clientSideId;
    state.projects = settings.projects;
    state.anonymous = settings.anonymous;
    state.observability = settings.observability;
    state.sessionReplay = settings.sessionReplay;
    state.collecting = Boolean(settings.connected && settings.collecting);
    state.userKey = settings.userKey;
    state.attributes = settings.attributes;
    state.divs = settings.divs;
    state.connected = settings.connected;
    state.notice = settings.notice;
    state.persistedDomain = settings.targetDomain;
    customerNameInput.value = settings.customerName;
    targetDomainInput.value = settings.targetDomain;
    anonymousInput.checked = settings.anonymous;
    observabilityInput.checked = settings.observability;
    sessionReplayInput.checked = settings.sessionReplay;
    userKeyInput.value = settings.userKey;
    renderAttributeList();
    renderDivList();
    showProjectEnvironment();
    updateCustomerPreview();
    updateContextPreview();
    setDot(settings.connected);
    updateConnectButton();
    setMessage(notice, settings.notice);
  }
  async function loadAttributes() {
    const detected = await detectOsBrowserFromNavigator(navigator);
    state.os = detected.os;
    state.browser = detected.browser;
    const stored = await chrome.storage.local.get(COUNTRY_CACHE_KEY);
    const country = await resolveCountry({
      fetchImpl: fetch,
      locale: navigator.language,
      cache: stored[COUNTRY_CACHE_KEY]
    });
    state.country = country.country;
    if (country.cache) await chrome.storage.local.set({ [COUNTRY_CACHE_KEY]: country.cache });
    updateContextPreview();
    if (state.connected) scheduleContextPush();
  }
  async function init() {
    const stored = await chrome.storage.local.get([
      SETTINGS_KEY,
      ANON_KEY,
      ANON_DOMAIN_KEY,
      SDK_STATUS_KEY,
      LAST_SYNC_KEY,
      REGISTRATION_KEY,
      CONTEXT_DELIVERY_KEY,
      DIV_SNAPSHOT_KEY
    ]);
    state.apiKey = await readExtensionApiKey();
    apiKeyInput.value = state.apiKey;
    state.anonymousUserKey = typeof stored[ANON_KEY] === "string" && stored[ANON_KEY] ? stored[ANON_KEY] : createUuid();
    state.anonymousKeyDomain = normalizeDomain(typeof stored[ANON_DOMAIN_KEY] === "string" ? stored[ANON_DOMAIN_KEY] : "");
    const storedDomain = normalizeDomain(cleanSettings(stored[SETTINGS_KEY] || {}).targetDomain);
    if (!state.anonymousKeyDomain && storedDomain) state.anonymousKeyDomain = storedDomain;
    if (stored[ANON_KEY] !== state.anonymousUserKey || stored[ANON_DOMAIN_KEY] !== state.anonymousKeyDomain) {
      await chrome.storage.local.set({
        [ANON_KEY]: state.anonymousUserKey,
        [ANON_DOMAIN_KEY]: state.anonymousKeyDomain
      });
    }
    applyStoredSettings(cleanSettings(stored[SETTINGS_KEY] || {}));
    savedDivs = Array.isArray(stored[DIV_SNAPSHOT_KEY]) ? cloneDivs(stored[DIV_SNAPSHOT_KEY]) : cloneDivs(state.divs);
    if (!Array.isArray(stored[DIV_SNAPSHOT_KEY])) await writeDivSnapshot(savedDivs);
    if (stored[SDK_STATUS_KEY]?.message && !stored[SDK_STATUS_KEY]?.ok) setMessage(sdkStatus, stored[SDK_STATUS_KEY].message);
    if (stored[REGISTRATION_KEY]?.error) setMessage(domainError, stored[REGISTRATION_KEY].error);
    if (stored[LAST_SYNC_KEY]?.line) renderSummary(stored[LAST_SYNC_KEY]);
    renderContextDelivery(stored[CONTEXT_DELIVERY_KEY]);
    await updateSiteStatus();
    await loadAttributes();
    if (state.connected && state.apiKey.trim()) {
      const version = editVersion;
      const refreshed = await send({ type: MSG.REFRESH });
      if (version !== editVersion || !state.connected || refreshed?.cancelled) return;
      if (refreshed?.settings) applyRemoteConnection(refreshed.settings);
      if (!refreshed?.ok) setMessage(connectError, refreshed?.error || "Could not refresh the LaunchDarkly connection.");
      else setMessage(connectError, "");
    }
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes[CONTEXT_DELIVERY_KEY]) renderContextDelivery(changes[CONTEXT_DELIVERY_KEY].newValue);
    if (changes[SDK_STATUS_KEY]) {
      const next = changes[SDK_STATUS_KEY].newValue;
      setMessage(sdkStatus, next && !next.ok ? next.message : "");
    }
    if (changes[REGISTRATION_KEY]?.newValue?.error) setMessage(domainError, changes[REGISTRATION_KEY].newValue.error);
    if (changes[REGISTRATION_KEY] && !changes[REGISTRATION_KEY].newValue?.error && domainError.querySelector(".message-text")?.textContent.startsWith("Target domain permission")) {
      setMessage(domainError, "");
    }
  });
  window.addEventListener("pagehide", () => {
    captureForm({ keepDivs: true, keepDomain: true, keepAttributes: true });
    writeExtensionApiKey(state.apiKey);
    chrome.storage.local.set({ [SETTINGS_KEY]: settingsFromState() });
  });
  init();
})();
