import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildExportPayload, cleanSettings, parseImportedConfig, preserveDivs, preserveText, validateApiKey, validateConnectionInput, validateUserContext } from '../src/lib/config.js';
import { buildContext, countryFromLocale, detectOsBrowser, parseCloudflareLoc, resolveCountry, sameEvaluationContext, validateContextAttributes } from '../src/lib/context.js';
import { applyFlagToElement, applyMappings, createMemory, findElements, isValidCssSelector } from '../src/lib/dom.js';
import { hostMatchesTarget, normalizeDomain, permissionOrigins, toolbarIconColored } from '../src/lib/domain.js';
import { contextEventBatch, isClientSideId, isLaunchDarklyEventsUrl, isLaunchDarklyTelemetryUrl } from '../src/lib/events.js';
import { createFlagBody, customerTag, offVariationValue, planSync, rowsFromOwnedFlags } from '../src/lib/flags.js';
import { LD_API_VERSION, LdError, ldRequest, listAllFlags, listProjects, parseRetryAfter } from '../src/lib/api.js';
import { clientEnvironmentReady, filterProjects, findEnvironmentByClientId, normalizeProjectPayload } from '../src/lib/projects.js';
import { executeSync, summarizeResults } from '../src/lib/sync.js';
import { anonymousKeyForDomain } from '../src/lib/uuid.js';

function response({ status = 200, body = {}, headers = {} } = {}) {
  const normalized = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => normalized[name.toLowerCase()] ?? null },
    async json() {
      return body;
    },
    async text() {
      return typeof body === 'string' ? body : JSON.stringify(body);
    },
    body: { async cancel() {} }
  };
}

test('mints a new anonymous user for each target domain', () => {
  const same = anonymousKeyForDomain({
    anonymous: true,
    key: 'user-a',
    keyDomain: 'example.com',
    domain: 'example.com',
    uuid: () => 'user-b'
  });
  assert.deepEqual(same, { key: 'user-a', domain: 'example.com' });
  const changed = anonymousKeyForDomain({
    anonymous: true,
    key: 'user-a',
    keyDomain: 'example.com',
    domain: 'coupang.com',
    uuid: () => 'user-b'
  });
  assert.deepEqual(changed, { key: 'user-b', domain: 'coupang.com' });
  const named = anonymousKeyForDomain({
    anonymous: false,
    key: 'user-a',
    keyDomain: 'example.com',
    domain: 'coupang.com',
    uuid: () => 'user-b'
  });
  assert.deepEqual(named, { key: 'user-a', domain: 'example.com' });
});

test('normalizes domains and matches only real subdomains', () => {
  assert.equal(normalizeDomain('https://www.LaunchDarkly.com:443/pricing?q=1'), 'launchdarkly.com');
  assert.equal(normalizeDomain('http://user:pass@www.example.com/path'), 'example.com');
  assert.equal(normalizeDomain('//www.example.com.'), 'example.com');
  assert.equal(normalizeDomain('www.com'), 'www.com');
  assert.equal(normalizeDomain('http://localhost:3000/app'), 'localhost');
  assert.equal(hostMatchesTarget('app.launchdarkly.com', 'launchdarkly.com'), true);
  assert.equal(hostMatchesTarget('launchdarkly.com', 'launchdarkly.com'), true);
  assert.equal(hostMatchesTarget('notlaunchdarkly.com', 'launchdarkly.com'), false);
  assert.equal(hostMatchesTarget('launchdarkly.com.evil.com', 'launchdarkly.com'), false);
  assert.deepEqual(permissionOrigins('launchdarkly.com'), [
    'https://launchdarkly.com/*',
    'https://*.launchdarkly.com/*',
    'http://launchdarkly.com/*',
    'http://*.launchdarkly.com/*'
  ]);
  assert.deepEqual(permissionOrigins('localhost'), ['https://localhost/*', 'http://localhost/*']);
  assert.equal(toolbarIconColored({ connected: true, targetDomain: 'example.com', url: 'https://app.example.com/home' }), true);
  assert.equal(toolbarIconColored({ connected: true, targetDomain: 'example.com', url: 'https://other.com/' }), false);
  assert.equal(toolbarIconColored({ connected: false, targetDomain: 'example.com', url: 'https://example.com/' }), false);
  assert.equal(toolbarIconColored({ connected: true, targetDomain: 'example.com', url: 'chrome://newtab/' }), false);
});

test('detects browser attributes and resolves country without timezone or geolocation', async () => {
  assert.deepEqual(
    detectOsBrowser({
      userAgent: '',
      userAgentData: { platform: 'macOS', brands: [{ brand: 'Google Chrome', version: '126.0.1' }] }
    }),
    { os: 'macOS', browser: 'Chrome 126' }
  );
  assert.equal(detectOsBrowser({ userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Edg/120.0' }).os, 'Windows');
  assert.equal(detectOsBrowser({ userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Edg/120.0' }).browser, 'Edge 120');
  assert.equal(detectOsBrowser({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Mobile Safari/605' }).os, 'iOS');
  assert.equal(detectOsBrowser({ userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/126.0 Mobile' }).os, 'Android');
  assert.equal(parseCloudflareLoc('ip=1.1.1.1\nloc=SG\n'), 'SG');
  assert.equal(countryFromLocale('en'), null);
  assert.equal(countryFromLocale('en-SG'), 'Singapore');

  let calls = 0;
  const cached = await resolveCountry({
    fetchImpl: async () => {
      calls += 1;
      throw new Error('should not fetch');
    },
    cache: { country: 'Singapore', fetchedAt: Date.now() },
    locale: 'en'
  });
  assert.equal(cached.country, 'Singapore');
  assert.equal(calls, 0);

  const lookedUp = await resolveCountry({
    fetchImpl: async () => response({ body: 'loc=SG\n' }),
    locale: 'en',
    cache: { country: 'Singapore', fetchedAt: Date.now() - 25 * 60 * 60 * 1000 }
  });
  assert.equal(lookedUp.country, 'Singapore');
  assert.equal(lookedUp.cache.country, 'Singapore');

  const fallback = await resolveCountry({
    fetchImpl: async () => {
      throw new Error('offline');
    },
    locale: 'en-SG'
  });
  assert.equal(fallback.country, 'Singapore');
  assert.equal(fallback.cache, null);

  const unknown = await resolveCountry({
    fetchImpl: async () => {
      throw new Error('offline');
    },
    locale: 'en'
  });
  assert.equal(unknown.country, 'Unknown');
  assert.deepEqual(
    buildContext({ anonymous: true, anonymousKey: 'uuid', userKey: '', os: 'macOS', browser: 'Chrome 126', country: 'Singapore' }),
    { kind: 'user', key: 'uuid', anonymous: true, os: 'macOS', browser: 'Chrome 126', country: 'Singapore', org: '', domain: '' }
  );
  assert.deepEqual(
    buildContext({
      anonymous: false,
      anonymousKey: 'uuid',
      userKey: 'jane.doe@acme.com',
      os: 'macOS',
      browser: 'Chrome 126',
      country: 'Singapore',
      org: 'Acme Corp',
      domain: 'example.com'
    }),
    { kind: 'user', key: 'jane.doe@acme.com', anonymous: false, os: 'macOS', browser: 'Chrome 126', country: 'Singapore', org: 'Acme Corp', domain: 'example.com' }
  );
  const withPlan = buildContext({
    anonymous: true,
    anonymousKey: 'uuid',
    userKey: '',
    os: 'macOS',
    browser: 'Chrome 126',
    country: 'Singapore',
    attributes: [
      { key: 'plan', value: 'gold' },
      { key: 'os', value: 'Windows' },
      { key: 'kind', value: 'org' },
      { key: 'empty', value: '  ' }
    ]
  });
  assert.equal(withPlan.plan, 'gold');
  assert.equal(withPlan.os, 'macOS');
  assert.equal(withPlan.kind, 'user');
  assert.equal(withPlan.empty, undefined);
  const attributeErrors = validateContextAttributes([
    { id: 'a', key: 'plan', value: 'gold' },
    { id: 'b', key: 'plan', value: 'silver' },
    { id: 'c', key: 'os', value: 'Windows' },
    { id: 'd', key: 'org', value: 'Other' }
  ]);
  assert.equal(attributeErrors.a, undefined);
  assert.equal(attributeErrors.b, 'This attribute is already used.');
  assert.equal(attributeErrors.c, 'os is already detected.');
  assert.equal(attributeErrors.d, 'org is already detected.');
  assert.equal(sameEvaluationContext(withPlan, { ...withPlan }), true);
  assert.equal(sameEvaluationContext(withPlan, { ...withPlan, plan: 'silver' }), false);
});

test('imports and exports configuration without detected attributes', () => {
  const payload = buildExportPayload({
    apiKey: 'api-123',
    customerName: 'Acme Corp',
    targetDomain: 'https://www.example.com/docs',
    projectKey: 'default',
    environmentKey: 'production',
    anonymous: false,
    userKey: 'jane.doe@acme.com',
    observability: false,
    sessionReplay: true,
    os: 'macOS',
    browser: 'Chrome 126',
    country: 'Singapore',
    anonymousUserKey: 'secret-uuid',
    attributes: [{ id: 'attr-1', key: 'plan', value: 'gold' }],
    divs: [{ name: 'sidebar-banner', selector: '#sidebar-banner', defaultState: false, whenFalse: 'show' }]
  });
  assert.deepEqual(Object.keys(payload).sort(), ['apiKey', 'customerName', 'divs', 'environmentKey', 'observability', 'projectKey', 'sessionReplay', 'targetDomain', 'userContext']);
  assert.equal(payload.observability, false);
  assert.equal(payload.sessionReplay, true);
  assert.equal(payload.targetDomain, 'example.com');
  assert.equal(payload.divs[0].defaultState, false);
  assert.equal(payload.divs[0].selector, '#sidebar-banner');
  assert.equal(payload.divs[0].name, 'sidebar-banner');
  assert.deepEqual(payload.userContext.attributes, [{ key: 'plan', value: 'gold' }]);
  const kept = cleanSettings({
    divs: [{ id: 'row-1', name: 'Travel logo', selector: '#header > a > img', defaultState: false, whenFalse: 'hide' }]
  });
  assert.equal(kept.divs[0].name, 'Travel logo');
  assert.equal(kept.divs[0].selector, '#header > a > img');
  const preserved = preserveDivs(
    [{ id: 'row-1', name: 'Travel logo', selector: '#header > a > img' }],
    [{ id: 'row-1', name: '', selector: '' }]
  );
  assert.equal(preserved[0].selector, '#header > a > img');
  assert.equal(preserved[0].name, 'Travel logo');
  assert.equal(preserveText('example.com', ''), 'example.com');
  assert.equal(preserveText('example.com', 'other.com'), 'other.com');
  assert.equal(preserveText('', ''), '');
  assert.equal(JSON.stringify(payload).includes('Singapore'), false);
  assert.equal(JSON.stringify(payload).includes('secret-uuid'), false);

  assert.throws(() => parseImportedConfig({ apiKey: 'x' }), /missing customerName/);
  assert.throws(() => parseImportedConfig({ apiKey: 'x', customerName: 'Acme', targetDomain: 'example.com', divs: {} }), /divs array/);
  const imported = parseImportedConfig({ ...payload, userContext: { anonymous: true, userKey: 'kept' } }, () => 'row-1');
  assert.equal(imported.divs[0].id, 'row-1');
  assert.equal(imported.anonymous, true);
  assert.deepEqual(imported.attributes, []);
  const withAttributes = parseImportedConfig(payload, () => 'row-1');
  assert.equal(withAttributes.attributes[0].key, 'plan');
  assert.equal(withAttributes.attributes[0].value, 'gold');
  assert.equal(withAttributes.attributes[0].id, 'row-1');
  assert.equal(withAttributes.observability, false);
  assert.equal(withAttributes.sessionReplay, true);
  assert.equal(cleanSettings({}).observability, false);
  assert.equal(cleanSettings({}).sessionReplay, false);
  assert.equal(cleanSettings({}).collecting, false);
  assert.equal(cleanSettings({ collecting: true }).collecting, true);
  assert.throws(() => parseImportedConfig({ ...payload, observability: 'yes' }), /observability must be a boolean/);
  const settings = cleanSettings({ ...imported, apiKey: 'api-123', projects: [{ key: 'default', environments: [{ key: 'production', clientSideId: 'c', apiKey: 'sdk-secret' }] }] });
  assert.equal(settings.apiKey, undefined);
  assert.equal(JSON.stringify(settings).includes('sdk-secret'), false);
  assert.equal(validateConnectionInput({ apiKey: '', customerName: '!!!', targetDomain: '' }).ok, false);
  assert.equal(validateApiKey('').ok, false);
  assert.equal(validateApiKey('api-123').ok, true);
  assert.equal(validateUserContext({ anonymous: true, userKey: '' }).ok, true);
  assert.equal(validateUserContext({ anonymous: false, userKey: ' ' }).ok, false);
});

test('plans flag creates, updates, skips, and owned deletes', () => {
  const divs = [
    { id: '1', name: 'sidebar-banner', selector: '#sidebar-banner', defaultState: true, whenFalse: 'hide' },
    { id: '2', name: 'sidebar banner', selector: '.sidebar-banner', defaultState: false, whenFalse: 'hide' },
    { id: '3', name: 'checkout', selector: '#checkout', defaultState: false, whenFalse: 'show' },
    { id: '4', name: 'taken', selector: '#taken', defaultState: true, whenFalse: 'hide' },
    { id: '5', name: '!!!', selector: '#invalid', defaultState: true, whenFalse: 'hide' },
    { id: '6', name: 'fresh', selector: '#fresh', defaultState: true, whenFalse: 'hide' }
  ];
  const flags = [
    {
      key: 'acme-corp-checkout',
      name: 'Acme Corp - checkout',
      tags: ['darklaunching', 'customer.acme-corp'],
      variations: [
        { _id: 'true-id', value: true },
        { _id: 'false-id', value: false }
      ],
      environments: { production: { offVariation: 0 } }
    },
    {
      key: 'acme-corp-taken',
      name: 'Taken',
      tags: ['other'],
      variations: [
        { _id: 't', value: true },
        { _id: 'f', value: false }
      ],
      environments: { production: { offVariation: 1 } }
    },
    {
      key: 'acme-corp-old',
      name: 'Old',
      tags: ['darklaunching', 'customer.acme-corp'],
      variations: [
        { _id: 't2', value: true },
        { _id: 'f2', value: false }
      ],
      environments: { production: { offVariation: 1 } }
    }
  ];
  const plan = planSync({ divs, flags, customerName: 'Acme Corp', environmentKey: 'production' });
  assert.deepEqual(plan.creates.map((item) => item.identity.key), ['acme-corp-fresh']);
  assert.equal(plan.updates[0].variationId, 'false-id');
  assert.equal(plan.skips[0].reason, 'Key already used by another flag');
  assert.deepEqual(plan.prunes.map((flag) => flag.key), ['acme-corp-old']);
  assert.equal(plan.rowErrors['1'], 'Duplicate flag key.');
  assert.equal(plan.rowErrors['2'], 'Duplicate flag key.');
  assert.equal(plan.rowErrors['5'], 'Name does not produce a valid flag key.');
  assert.equal(createFlagBody('Acme Corp', divs[0]).defaults.offVariation, 0);
  assert.equal(createFlagBody('Acme Corp', divs[2]).defaults.onVariation, 0);
  assert.deepEqual(createFlagBody('Acme Corp', divs[0]).clientSideAvailability, {
    usingEnvironmentId: true,
    usingMobileKey: false
  });
});

test('builds a customer tag LaunchDarkly will accept', () => {
  assert.equal(customerTag('coupang'), 'Coupang');
  assert.equal(customerTag('Acme Corp'), 'AcmeCorp');
  assert.equal(customerTag('acme-corp'), 'AcmeCorp');
  assert.equal(customerTag('!!!'), '');
  const tag = customerTag('a'.repeat(80));
  assert.equal(tag.length, 64);
  assert.match(tag, /^[A-Za-z0-9]{1,64}$/);
  const body = createFlagBody('coupang', { name: 'Travel logo', selector: '#header > a > img', defaultState: true });
  assert.equal(body.name, 'coupang - Travel logo');
  assert.equal(body.key, 'coupang-travel-logo');
  assert.equal(body.description, '#header > a > img');
  assert.deepEqual(body.tags, ['darklaunching', 'Coupang']);
  assert.equal(body.name.includes('header'), false);
  const plan = planSync({
    divs: [{ id: '1', name: 'travel-logo', selector: '#header > a > img', defaultState: true, whenFalse: 'hide' }],
    flags: [{
      key: 'coupang-travel-logo',
      name: 'coupang - travel-logo',
      tags: ['darklaunching', 'customer.coupang'],
      variations: [{ _id: 't', value: true }, { _id: 'f', value: false }],
      environments: { production: { offVariation: 0 } }
    }],
    customerName: 'coupang',
    environmentKey: 'production'
  });
  assert.equal(plan.skips.length, 0);
  assert.equal(offVariationValue({
    variations: [{ value: true }, { value: false }],
    environments: { production: { _summary: { variations: { 0: { isOff: false }, 1: { isOff: true } } } } }
  }, 'production'), false);
  assert.equal(plan.updates[0].addTag, 'Coupang');
  assert.deepEqual(plan.updates[0].removeTags, ['customer.coupang']);
  assert.equal(plan.updates[0].description, '#header > a > img');
  assert.equal(plan.updates[0].variationId, undefined);
});

test('filters projects by name or key', () => {
  const projects = [
    { key: 'default', name: 'Default project' },
    { key: 'mine-checkout', name: 'Checkout' },
    { key: 'other', name: 'Minefield' }
  ];
  assert.deepEqual(filterProjects(projects, '  ').map((project) => project.key), ['default', 'mine-checkout', 'other']);
  assert.deepEqual(filterProjects(projects, 'Mine').map((project) => project.key), ['mine-checkout', 'other']);
  assert.deepEqual(filterProjects(projects, 'checkout').map((project) => project.key), ['mine-checkout']);
  assert.deepEqual(filterProjects(projects, 'missing'), []);
  const located = findEnvironmentByClientId(
    [{ key: 'demo', name: 'Demo', environments: [{ key: 'production', name: 'Production', clientSideId: 'sdk-prod' }, { key: 'test', name: 'Test', clientSideId: 'sdk-test' }] }],
    'sdk-test'
  );
  assert.equal(located.project.key, 'demo');
  assert.equal(located.environment.key, 'test');
  assert.equal(findEnvironmentByClientId([{ key: 'demo', environments: [] }], 'missing'), null);
  const readyProjects = [{ key: 'demo', environments: [{ key: 'production', clientSideId: 'sdk-prod' }] }];
  assert.equal(clientEnvironmentReady({ connected: true, projects: readyProjects, clientSideId: 'sdk-prod', projectKey: 'demo', environmentKey: 'production' }), true);
  assert.equal(clientEnvironmentReady({ connected: false, projects: readyProjects, clientSideId: 'sdk-prod', projectKey: 'demo', environmentKey: 'production' }), false);
  assert.equal(clientEnvironmentReady({ connected: true, projects: readyProjects, clientSideId: 'missing', projectKey: 'demo', environmentKey: 'production' }), false);
  assert.equal(clientEnvironmentReady({ connected: true, projects: readyProjects, clientSideId: 'sdk-prod', projectKey: 'other', environmentKey: 'production' }), false);
  const rows = rowsFromOwnedFlags({
    flags: [
      {
        key: 'coupang-travel-logo',
        name: 'coupang - Travel logo',
        description: '#header > a > img',
        tags: ['darklaunching', 'Coupang'],
        variations: [{ value: true }, { value: false }],
        environments: { development: { offVariation: 1 } }
      },
      {
        key: 'coupang-nav',
        name: 'coupang - Nav',
        description: '.nav > a',
        tags: ['darklaunching', 'Coupang'],
        variations: [{ value: true }, { value: false }],
        environments: { development: { offVariation: 1 } }
      },
      {
        key: 'coupang-footer',
        name: 'coupang - Footer',
        description: '',
        tags: ['darklaunching', 'Coupang'],
        variations: [{ value: true }, { value: false }],
        environments: { development: { offVariation: 1 } }
      },
      { key: 'other-flag', name: 'Other', tags: ['beta'], variations: [{ value: true }, { value: false }] }
    ],
    customerName: 'coupang',
    environmentKey: 'development',
    existingDivs: [
      { id: 'manual', name: 'Manual row', selector: '.manual', defaultState: true, whenFalse: 'show' },
      { id: 'nav', name: 'Nav', selector: '.stale', defaultState: true, whenFalse: 'hide' },
      { id: 'footer', name: 'Footer', selector: 'footer', defaultState: false, whenFalse: 'hide' }
    ],
    uuid: () => 'loaded'
  });
  assert.equal(rows[0].name, 'Travel logo');
  assert.equal(rows[0].selector, '#header > a > img');
  assert.equal(rows[0].defaultState, false);
  assert.equal(rows[1].selector, '.nav > a');
  assert.equal(rows[2].selector, 'footer');
  assert.equal(rows[3].id, 'manual');
});

test('keeps the API key on the LaunchDarkly host and retries rate limits', async () => {
  let called = false;
  await assert.rejects(
    () => ldRequest('https://evil.example/collect', { apiKey: 'secret', fetchImpl: async () => { called = true; } }),
    LdError
  );
  assert.equal(called, false);

  let auth = '';
  let apiVersion = '';
  await ldRequest('/api/v2/projects?limit=1', {
    apiKey: 'api-123',
    fetchImpl: async (_url, init) => {
      auth = init.headers.Authorization;
      apiVersion = init.headers['LD-API-Version'];
      return response({ body: { items: [] } });
    }
  });
  assert.equal(auth, 'api-123');
  assert.equal(apiVersion, LD_API_VERSION);
  assert.equal(parseRetryAfter('2'), 2000);

  let attempts = 0;
  await listProjects({
    apiKey: 'api-123',
    sleep: async () => {},
    fetchImpl: async () => {
      attempts += 1;
      if (attempts === 1) return response({ status: 429, headers: { 'retry-after': '0' }, body: {} });
      return response({
        body: {
          items: [{ key: 'default', name: 'Default', environments: { items: [{ key: 'production', name: 'Production', _id: 'client-1', apiKey: 'sdk-secret' }] } }]
        }
      });
    }
  });
  assert.equal(attempts, 2);
  const stripped = normalizeProjectPayload({
    key: 'default',
    environments: { items: [{ key: 'production', _id: 'client-1', apiKey: 'sdk-secret', mobileKey: 'mob' }] }
  });
  assert.equal(JSON.stringify(stripped).includes('sdk-secret'), false);

  let hugeAttempts = 0;
  const limited = await ldRequest('/api/v2/projects', {
    apiKey: 'api-123',
    sleep: async () => {},
    fetchImpl: async () => {
      hugeAttempts += 1;
      return response({ status: 429, headers: { 'retry-after': '120' }, body: { message: 'slow down' } });
    }
  });
  assert.equal(hugeAttempts, 1);
  assert.equal(limited.status, 429);

  const flags = await listAllFlags({
    apiKey: 'api-123',
    projectKey: 'default',
    environmentKey: 'production',
    fetchImpl: async (url) => {
      assert.match(String(url), /summary=0/);
      assert.match(String(url), /env=production/);
      if (!String(url).includes('offset=100')) {
        return response({ body: { items: [{ key: 'one' }], _links: { next: { href: '/api/v2/flags/default?limit=100&offset=100' } } } });
      }
      return response({ body: { items: [{ key: 'two' }] } });
    }
  });
  assert.deepEqual(flags.map((flag) => flag.key), ['one', 'two']);
});

test('continues flag sync when one request fails', async () => {
  const calls = [];
  const divs = [
    { id: 'new', name: 'new-banner', selector: '#new-banner', defaultState: true, whenFalse: 'hide' },
    { id: 'bad', name: 'bad-create', selector: '#bad-create', defaultState: true, whenFalse: 'hide' },
    { id: 'existing', name: 'checkout', selector: '#checkout', defaultState: false, whenFalse: 'show' },
    { id: 'taken', name: 'taken', selector: '#taken', defaultState: true, whenFalse: 'hide' }
  ];
  const flags = [
    {
      key: 'acme-corp-checkout',
      name: 'Checkout',
      tags: ['darklaunching', 'customer.acme-corp'],
      variations: [
        { _id: 'true-id', value: true },
        { _id: 'false-id', value: false }
      ],
      environments: { production: { offVariation: 0 } }
    },
    { key: 'acme-corp-taken', name: 'Taken', tags: [], variations: [{ _id: 'a', value: true }, { _id: 'b', value: false }], environments: { production: { offVariation: 0 } } },
    { key: 'acme-corp-old', name: 'Old', tags: ['darklaunching', 'customer.acme-corp'], variations: [{ _id: 'a', value: true }, { _id: 'b', value: false }], environments: { production: { offVariation: 1 } } }
  ];
  const fetchImpl = async (url, init) => {
    calls.push({ url, method: init.method, headers: init.headers, body: init.body ? JSON.parse(init.body) : null });
    if (init.method === 'POST' && init.body.includes('bad-create')) return response({ status: 400, body: { message: 'nope' } });
    return response({ status: init.method === 'DELETE' ? 204 : 200, body: {} });
  };
  const { results } = await executeSync({
    divs,
    flags,
    customerName: 'Acme Corp',
    environmentKey: 'production',
    projectKey: 'default',
    apiKey: 'api-123',
    deleteConfirmed: true,
    confirmedDeleteKeys: ['acme-corp-old'],
    fetchImpl
  });
  assert.equal(results.created.length, 1);
  assert.equal(results.updated.length, 1);
  assert.equal(results.deleted.length, 1);
  assert.equal(results.failed.length, 1);
  assert.equal(results.skipped[0].reason, 'Key already used by another flag');
  const patch = calls.find((call) => call.method === 'PATCH');
  assert.equal(patch.headers['Content-Type'], 'application/json; domain-model=launchdarkly.semanticpatch');
  assert.equal(patch.body.instructions[0].kind, 'updateOffVariation');
  assert.equal(patch.body.instructions[0].variationId, 'false-id');
  const described = calls.find((call) => call.body?.instructions?.some((item) => item.kind === 'updateDescription'));
  assert.equal(described.body.instructions[0].value, '#checkout');
  const created = calls.find((call) => call.method === 'POST');
  assert.equal(created.body.description, '#new-banner');
  assert.equal(calls.every((call) => call.headers.Authorization === 'api-123'), true);
  assert.equal(calls.every((call) => call.headers['LD-API-Version'] === '20240415'), true);
  const summary = summarizeResults(results);
  assert.match(summary.line, /Created 1, updated 1, deleted 1, skipped 1, failed 1/);
});

test('hides and restores elements without touching an element whose flag is true', () => {
  const element = fakeElement('flex');
  const memory = createMemory();
  applyFlagToElement(element, 'hide', false, memory);
  assert.equal(element.props.display, 'none');
  applyFlagToElement(element, 'hide', true, memory);
  assert.equal(element.props.display, 'flex');
  applyFlagToElement(element, 'show', false, memory);
  assert.equal(element.props.display, 'flex');
  applyFlagToElement(element, 'show', true, memory);
  assert.equal(element.props.display, 'none');
  applyFlagToElement(element, 'show', false, memory);
  assert.equal(element.props.display, 'flex');
  const logo = { id: 'logo' };
  const found = findElements(
    {
      querySelectorAll: (selector) => (selector === '#header > a > img' ? [logo] : [])
    },
    '  #header > a > img  '
  );
  assert.deepEqual(found, [logo]);
  assert.deepEqual(findElements({ querySelectorAll: () => { throw new Error('invalid'); } }, '>>>'), []);
  assert.equal(isValidCssSelector(''), false);
  assert.equal(isValidCssSelector('#header > a > img'), true);
  applyMappings([{ elements: [element], action: 'hide', value: false }], memory);
  assert.equal(memory.touched.has(element), true);
});

test('relays LaunchDarkly analytics only to the events host', () => {
  const batch = contextEventBatch({
    kind: 'user',
    key: 'jane.doe@acme.com',
    anonymous: false,
    os: 'macOS',
    browser: 'Chrome 120',
    country: 'Singapore'
  }, [], 10);
  assert.deepEqual(batch.map((event) => event.kind), ['index', 'identify']);
  assert.equal(batch[0].context.key, 'jane.doe@acme.com');
  assert.equal(batch[0].context.anonymous, false);
  assert.equal(batch[0].creationDate, 10);
  const withPlan = contextEventBatch({
    kind: 'user',
    key: 'jane.doe@acme.com',
    anonymous: true,
    os: 'macOS',
    browser: 'Chrome 120',
    country: 'Singapore',
    plan: 'gold'
  }, [], 10);
  assert.equal(withPlan[0].context.plan, 'gold');
  assert.equal(withPlan[0].context.anonymous, true);
  const evaluated = contextEventBatch(
    { kind: 'user', key: 'uuid', anonymous: true, os: 'macOS', browser: 'Chrome 120', country: 'Singapore' },
    [{ key: 'coupang-travel-logo', value: false, default: true, variation: 1, version: 4 }],
    10
  );
  assert.equal(evaluated[0].context.anonymous, true);
  assert.equal(evaluated[2].kind, 'summary');
  assert.equal(evaluated[2].features['coupang-travel-logo'].counters[0].value, false);
  assert.equal(contextEventBatch({ kind: 'user', key: '  ' }), null);
  assert.equal(isClientSideId('64a1b2c3d4e5f678901234ab'), true);
  assert.equal(isClientSideId('short'), false);
  assert.equal(isClientSideId('../flags'), false);
  assert.equal(isLaunchDarklyEventsUrl('https://events.launchdarkly.com/events/bulk/client-id'), true);
  assert.equal(isLaunchDarklyEventsUrl('https://user:pass@events.launchdarkly.com/events/bulk/client-id'), false);
  assert.equal(isLaunchDarklyEventsUrl('http://events.launchdarkly.com/events/bulk/client-id'), false);
  assert.equal(isLaunchDarklyEventsUrl('https://clientsdk.launchdarkly.com/sdk/evalx/client-id/contexts/abc'), false);
  assert.equal(isLaunchDarklyEventsUrl('https://app.launchdarkly.com/api/v2/flags'), false);
  assert.equal(isLaunchDarklyTelemetryUrl('https://clientsdk.launchdarkly.com/sdk/evalx/client-id/contexts/abc'), true);
  assert.equal(isLaunchDarklyTelemetryUrl('https://pub.observability.app.launchdarkly.com'), true);
  assert.equal(isLaunchDarklyTelemetryUrl('https://otel.observability.app.launchdarkly.com/v1/traces'), true);
  assert.equal(isLaunchDarklyTelemetryUrl('https://app.launchdarkly.com/api/v2/flags'), false);
  assert.equal(isLaunchDarklyTelemetryUrl('https://user:pass@otel.observability.app.launchdarkly.com/v1/traces'), false);
});

test('content script source does not read the API key or geolocation', async () => {
  const source = await readFile(new URL('../src/content.js', import.meta.url), 'utf8');
  const telemetry = await readFile(new URL('../src/telemetry.js', import.meta.url), 'utf8');
  const context = await readFile(new URL('../src/lib/context.js', import.meta.url), 'utf8');
  assert.equal(source.includes('apiKey'), false);
  assert.equal(telemetry.includes('apiKey'), false);
  assert.equal(telemetry.includes('secret.js'), false);
  assert.equal(telemetry.includes('app.launchdarkly.com'), false);
  assert.equal(source.includes('secret.js'), false);
  assert.equal(source.includes('storage.session'), false);
  assert.equal(source.includes('app.launchdarkly.com'), false);
  assert.equal(source.includes('geolocation'), false);
  assert.equal(context.includes('timeZone'), false);
  assert.equal(context.includes('geolocation'), false);
});

function fakeElement(display = '') {
  const props = {};
  if (display) props.display = display;
  return {
    isConnected: true,
    props,
    style: {
      getPropertyValue: (name) => props[name] || '',
      setProperty: (name, value) => {
        props[name] = value;
      },
      removeProperty: (name) => {
        delete props[name];
      }
    }
  };
}
