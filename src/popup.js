import { buildContext, detectOsBrowserFromNavigator, resolveCountry, validateContextAttributes } from './lib/context.js';
import {
  buildExportPayload,
  cleanSettings,
  defaultSettings,
  parseImportedConfig,
  preserveText,
  validateApiKey,
  validateConnectionInput,
  validateUserContext
} from './lib/config.js';
import { hostMatchesTarget, isValidHostname, normalizeDomain, permissionOrigins } from './lib/domain.js';
import { flagIdentity, rowsFromOwnedFlags, validateDivRows } from './lib/flags.js';
import { sanitizeKey } from './lib/sanitize.js';
import { ANON_DOMAIN_KEY, ANON_KEY, CONTEXT_DELIVERY_KEY, COUNTRY_CACHE_KEY, DIV_SNAPSHOT_KEY, LAST_SYNC_KEY, REGISTRATION_KEY, SDK_STATUS_KEY, SETTINGS_KEY } from './lib/keys.js';
import { clientEnvironmentReady, findEnvironmentByClientId } from './lib/projects.js';
import { MSG } from './lib/messages.js';
import { readExtensionApiKey, writeExtensionApiKey } from './lib/secret.js';
import { anonymousKeyForDomain, createUuid } from './lib/uuid.js';

const $ = (id) => document.getElementById(id);

const apiKeyInput = $('api-key');
const customerNameInput = $('customer-name');
const targetDomainInput = $('target-domain');
const anonymousInput = $('anonymous');
const observabilityInput = $('observability');
const sessionReplayInput = $('session-replay');
const userKeyInput = $('user-key');
const projectName = $('project-name');
const environmentName = $('environment-name');
const divList = $('div-list');
const divEmpty = $('div-empty');
const connectButton = $('connect');
const startButton = $('start-target');
const updateButton = $('update-flags');
const importButton = $('import-config');
const clearButton = $('clear-settings');
const fileInput = $('import-file');
const exportButton = $('export-config');
const addButton = $('add-div');
const refreshDivsButton = $('refresh-divs');
const statusDot = $('status-dot');
const siteStatus = $('site-status');
const clientIdInput = $('client-id-input');
const confirmClientIdButton = $('confirm-client-id');
const clientIdStatus = $('client-id-status');
const clientIdError = $('client-id-error');
const contextJson = $('context-json');
const contextDelivery = $('context-delivery');
const attrOs = $('attr-os');
const attrBrowser = $('attr-browser');
const attrCountry = $('attr-country');
const attrOrg = $('attr-org');
const attrDomain = $('attr-domain');
const attributeList = $('attribute-list');
const addAttributeButton = $('add-attribute');
const updateContextButton = $('update-context');
const environmentSection = $('environment-section');
const targetSection = $('target-section');
const userContextSection = $('user-context-section');
const flagsSection = $('flags-section');
const syncResults = $('sync-results');
const modal = $('modal');
const modalTitle = $('modal-title');
const modalBody = $('modal-body');
const modalList = $('modal-list');
const modalConfirm = $('modal-confirm');
const modalKeep = $('modal-keep');
const modalCancel = $('modal-cancel');
const modalActions = document.querySelector('.modal-actions');

const apiKeyError = $('api-key-error');
const customerError = $('customer-error');
const customerPreview = $('customer-preview');
const domainError = $('domain-error');
const connectError = $('connect-error');
const targetError = $('target-error');
const notice = $('notice');
const userKeyError = $('user-key-error');
const sdkStatus = $('sdk-status');

const state = {
  ...defaultSettings(),
  apiKey: '',
  anonymousUserKey: '',
  anonymousKeyDomain: '',
  os: 'Detecting…',
  browser: 'Detecting…',
  country: 'Detecting…',
  persistedDomain: '',
  busy: false
};

const serverRowErrors = {};
let persistTimer = 0;
let savedDivs = [];
let applyingClientId = false;
let loadedClientId = '';
let clientLookup = 0;
let contextTimer = 0;
let editVersion = 0;
let domainPermissionPending = false;

function renderContextDelivery(delivery) {
  if (!delivery) {
    setMessage(contextDelivery, '');
    return;
  }
  if (!delivery.ok) {
    setMessage(contextDelivery, delivery.error || 'LaunchDarkly did not receive the user context.');
    return;
  }
  setMessage(contextDelivery, `Sent context key ${delivery.key}.`);
}

function setMessage(element, text) {
  const slot = element.querySelector?.(':scope > .message-text');
  if (slot) {
    slot.textContent = text || '';
    element.hidden = !text;
    const tip = element.querySelector(':scope > .tip');
    if (tip) tip.hidden = !String(text || '').startsWith('Target domain permission');
    return;
  }
  element.textContent = text || '';
  element.hidden = !text;
}

function setDot(connected) {
  statusDot.classList.toggle('is-on', connected);
  statusDot.classList.toggle('is-off', !connected);
  const label = connected ? 'Connected' : 'Disconnected';
  statusDot.title = label;
  statusDot.setAttribute('aria-label', label);
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

let anonymousKeyWrite = Promise.resolve();

async function assignAnonymousKey(domain) {
  const next = anonymousKeyForDomain({
    anonymous: state.anonymous,
    key: state.anonymousUserKey,
    keyDomain: state.anonymousKeyDomain,
    domain: normalizeDomain(domain || '')
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

let persistSerial = 0;

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
    persist().catch(() => {});
  }, 250);
}

async function send(message) {
  try {
    return await chrome.runtime.sendMessage(message);
  } catch {
    return { ok: false, error: 'The extension background service stopped. Reopen the popup and try again.' };
  }
}

function currentProject() {
  return state.projects.find((project) => project.key === state.projectKey) || null;
}

function showProjectEnvironment() {
  const project = currentProject();
  const environment = project?.environments?.find((item) => item.key === state.environmentKey) || null;
  projectName.textContent = project?.name || 'Not selected';
  environmentName.textContent = environment?.name || 'Not selected';
  updateClientId();
  updateVisibility();
}

function updateClientId() {
  const next = state.clientSideId || '';
  if (clientIdInput.value === next) return;
  applyingClientId = true;
  clientIdInput.value = next;
  applyingClientId = false;
}

async function loadOwnedFlags(token) {
  const result = await send({ type: MSG.LIST_OWNED_FLAGS });
  if (token !== clientLookup) return;
  if (!result?.ok) {
    setMessage(clientIdStatus, '');
    setMessage(clientIdError, result?.error || 'Could not load DarkLaunching flags.');
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
  setMessage(clientIdError, '');
  setMessage(
    clientIdStatus,
    count
      ? `Loaded ${count} DarkLaunching ${count === 1 ? 'flag' : 'flags'}.`
      : 'No DarkLaunching flags for this customer in this environment.'
  );
  loadedClientId = state.clientSideId;
}

function setClientIdInvalid(invalid) {
  clientIdInput.classList.toggle('is-invalid', invalid);
}

async function lookupClientId({ reportMiss = false } = {}) {
  if (applyingClientId || state.busy || state.collecting) return;
  const token = ++clientLookup;
  const value = clientIdInput.value.trim();
  const match = findEnvironmentByClientId(state.projects, value);
  if (!value || !match) {
    setMessage(clientIdStatus, '');
    if (reportMiss) {
      setClientIdInvalid(true);
      setMessage(clientIdError, value ? 'No environment uses this client ID.' : 'Enter a client ID.');
    } else {
      setMessage(clientIdError, '');
    }
    updateVisibility();
    return;
  }
  setClientIdInvalid(false);
  setMessage(clientIdError, '');
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
  const field = input.closest('.field');
  if (!field) return;
  field.classList.toggle('is-locked', locked);
  const icon = field.querySelector('.lock');
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
    projectName.textContent = 'Not selected';
    environmentName.textContent = 'Not selected';
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
    setMessage(customerPreview, '');
    setMessage(customerError, '');
    return;
  }
  if (!key) {
    setMessage(customerPreview, '');
    setMessage(customerError, 'Customer name must include letters or numbers.');
    return;
  }
  setMessage(customerError, '');
  customerPreview.hidden = false;
  customerPreview.textContent = `Flag prefix: ${key}`;
}

function updateContextPreview() {
  userKeyInput.disabled = state.anonymous;
  const user = validateUserContext(state);
  setMessage(userKeyError, state.anonymous ? '' : user.error);
  const org = String(state.customerName ?? '').trim();
  const domain = normalizeDomain(state.targetDomain || '');
  attrOs.textContent = state.os;
  attrBrowser.textContent = state.browser;
  attrCountry.textContent = state.country;
  attrOrg.textContent = org || 'Not set';
  attrDomain.textContent = domain || 'Not set';
  if (!user.ok || state.country === 'Detecting…' || state.os === 'Detecting…') {
    contextJson.textContent = user.ok ? 'Detecting context attributes…' : user.error;
    return null;
  }
  const context = buildContext({
    anonymous: state.anonymous,
    userKey: state.userKey,
    anonymousKey: state.anonymousUserKey,
    os: state.os,
    browser: state.browser,
    country: state.country,
    org: String(state.customerName ?? '').trim(),
    domain: normalizeDomain(state.targetDomain || ''),
    attributes: state.attributes
  });
  contextJson.textContent = JSON.stringify(context, null, 2);
  return context;
}

function readAttributesFromDom() {
  state.attributes = [...attributeList.querySelectorAll('.attr-row')].map((row) => ({
    id: row.dataset.id,
    key: row.querySelector('.attr-key').value,
    value: row.querySelector('.attr-value').value
  }));
}

function paintAttributeErrors() {
  const errors = validateContextAttributes(state.attributes);
  for (const row of attributeList.querySelectorAll('.attr-row')) {
    const error = errors[row.dataset.id] || '';
    const errorElement = row.querySelector('.row-error');
    errorElement.textContent = error;
    errorElement.hidden = !error;
    row.classList.toggle('has-error', Boolean(error));
  }
  return Object.keys(errors).length === 0;
}

function createAttributeRow(attribute) {
  const row = document.createElement('div');
  row.className = 'attr-row';
  row.dataset.id = attribute.id;
  const keyInput = document.createElement('input');
  keyInput.className = 'attr-key';
  keyInput.type = 'text';
  keyInput.placeholder = 'Key';
  keyInput.setAttribute('aria-label', 'Attribute key');
  keyInput.autocomplete = 'off';
  keyInput.spellcheck = false;
  keyInput.value = attribute.key || '';
  const valueInput = document.createElement('input');
  valueInput.className = 'attr-value';
  valueInput.type = 'text';
  valueInput.placeholder = 'Value';
  valueInput.setAttribute('aria-label', 'Attribute value');
  valueInput.autocomplete = 'off';
  valueInput.spellcheck = false;
  valueInput.value = attribute.value || '';
  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'icon remove';
  removeButton.setAttribute('aria-label', 'Remove attribute');
  removeButton.textContent = 'X';
  const error = document.createElement('p');
  error.className = 'row-error error';
  error.hidden = true;
  const onEdit = () => {
    readAttributesFromDom();
    schedulePersist();
  };
  keyInput.addEventListener('input', onEdit);
  valueInput.addEventListener('input', onEdit);
  removeButton.addEventListener('click', () => {
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
  setMessage(apiKeyError, errors.apiKey || '');
  setMessage(customerError, errors.customerName || '');
  setMessage(domainError, errors.targetDomain || '');
}

function readDivsFromDom() {
  const rows = [...divList.querySelectorAll('.div-row')];
  if (!rows.length) {
    state.divs = [];
    return;
  }
  state.divs = rows.map((row) => {
    const previous = state.divs.find((div) => div.id === row.dataset.id);
    const nameInput = row.querySelector('.flag-name');
    const selectorInput = row.querySelector('.css-selector');
    const defaultInput = row.querySelector('.default-state');
    const actionInput = row.querySelector('.when-false');
    return {
      id: row.dataset.id,
      name: nameInput ? nameInput.value : previous?.name || '',
      selector: selectorInput ? selectorInput.value : previous?.selector || '',
      defaultState: defaultInput ? defaultInput.value === 'true' : previous?.defaultState !== false,
      whenFalse: actionInput ? actionInput.value : previous?.whenFalse || 'hide'
    };
  });
}

function paintRowErrors() {
  readDivsFromDom();
  const local = validateDivRows(state.divs, state.customerName);
  for (const row of divList.querySelectorAll('.div-row')) {
    const error = serverRowErrors[row.dataset.id] || local[row.dataset.id] || '';
    const errorElement = row.querySelector('.row-error');
    errorElement.textContent = error;
    errorElement.hidden = !error;
    row.classList.toggle('has-error', Boolean(error));
    const flagName = row.querySelector('.flag-name').value.trim();
    const identity = flagIdentity(state.customerName, flagName);
    row.querySelector('.row-title').textContent = flagName || 'Untitled selector';
    row.querySelector('.key-preview').textContent = flagName && identity.name ? identity.name : 'Flag name will appear here';
    if (error) row.open = true;
  }
  divEmpty.hidden = state.divs.length > 0;
}

function createDivRow(div) {
  const row = document.createElement('details');
  row.className = 'div-row';
  row.dataset.id = div.id;
  row.open = !String(div.name || '').trim();

  const summary = document.createElement('summary');
  const title = document.createElement('span');
  title.className = 'row-title';
  title.textContent = String(div.name || '').trim() || 'Untitled selector';
  summary.append(title);

  const top = document.createElement('div');
  top.className = 'row-top';
  const flagNameLabel = document.createElement('label');
  flagNameLabel.append('Name');
  const nameField = document.createElement('div');
  nameField.className = 'name-field';
  const flagNameInput = document.createElement('input');
  flagNameInput.className = 'flag-name';
  flagNameInput.type = 'text';
  flagNameInput.required = true;
  flagNameInput.placeholder = 'Travel logo';
  flagNameInput.value = div.name;
  flagNameInput.autocomplete = 'off';
  flagNameInput.spellcheck = false;
  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'icon remove';
  removeButton.setAttribute('aria-label', 'Remove row');
  removeButton.textContent = 'X';
  nameField.append(flagNameInput, removeButton);
  flagNameLabel.append(nameField);

  const nameLabel = document.createElement('label');
  nameLabel.append('CSS Selector');
  const nameInput = document.createElement('input');
  nameInput.className = 'css-selector';
  nameInput.type = 'text';
  nameInput.placeholder = '#header > a > img';
  nameInput.value = div.selector || '';
  nameInput.autocomplete = 'off';
  nameInput.spellcheck = false;
  nameLabel.append(nameInput);
  top.append(flagNameLabel, nameLabel);

  const defaultLabel = document.createElement('label');
  defaultLabel.append('Default State when Disabled');
  const defaultSelect = document.createElement('select');
  defaultSelect.className = 'default-state';
  for (const [value, label] of [
    ['false', 'Serve False'],
    ['true', 'Serve True']
  ]) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    defaultSelect.append(option);
  }
  defaultSelect.value = div.defaultState ? 'true' : 'false';
  defaultLabel.append(defaultSelect);

  const actionLabel = document.createElement('label');
  actionLabel.append('When false');
  const actionSelect = document.createElement('select');
  actionSelect.className = 'when-false';
  for (const [value, label] of [
    ['hide', 'Hide element'],
    ['show', 'Show element']
  ]) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    actionSelect.append(option);
  }
  actionSelect.value = div.whenFalse === 'show' ? 'show' : 'hide';
  actionLabel.append(actionSelect);

  const preview = document.createElement('p');
  preview.className = 'key-preview help';
  const error = document.createElement('p');
  error.className = 'row-error error';
  error.hidden = true;
  row.append(summary, top, defaultLabel, actionLabel, preview, error);

  const onEdit = () => {
    delete serverRowErrors[row.dataset.id];
    editVersion += 1;
    paintRowErrors();
    schedulePersist();
  };
  flagNameInput.addEventListener('input', onEdit);
  nameInput.addEventListener('input', onEdit);
  defaultSelect.addEventListener('change', onEdit);
  actionSelect.addEventListener('change', onEdit);
  removeButton.addEventListener('click', () => {
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
  const line = document.createElement('p');
  line.textContent = summary.line;
  syncResults.append(line);
  if (summary.details?.length) {
    const list = document.createElement('ul');
    for (const detail of summary.details) {
      const item = document.createElement('li');
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
  connectButton.textContent = state.connected ? 'Disconnect' : 'Connect';
}

function updateStartButton() {
  if (state.busy) return;
  startButton.textContent = state.collecting ? 'Stop' : 'Start';
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
  if (busy && which === 'connect') connectButton.textContent = 'Connecting…';
  else if (busy && which === 'disconnect') connectButton.textContent = 'Disconnecting…';
  else updateConnectButton();
  if (busy && which === 'start') startButton.textContent = 'Starting…';
  else if (busy && which === 'stop') startButton.textContent = 'Stopping…';
  else updateStartButton();
  updateButton.textContent = busy && which === 'update' ? 'Updating…' : 'Update Flags';
}

function openModal({ title, body, items, confirmLabel, danger, keepLabel }) {
  return new Promise((resolve) => {
    modalTitle.textContent = title;
    modalBody.textContent = body;
    modalList.replaceChildren();
    for (const item of items || []) {
      const li = document.createElement('li');
      li.textContent = item;
      modalList.append(li);
    }
    modalList.hidden = !items?.length;
    modalConfirm.textContent = confirmLabel;
    modalConfirm.classList.toggle('danger', Boolean(danger));
    modalKeep.hidden = !keepLabel;
    modalKeep.textContent = keepLabel || 'Clear settings, keep API key and client ID';
    modalActions.classList.toggle('stacked', Boolean(keepLabel));
    modal.hidden = false;
    const finish = (value) => {
      modal.hidden = true;
      modalKeep.hidden = true;
      modalActions.classList.remove('stacked');
      modalConfirm.removeEventListener('click', onConfirm);
      modalKeep.removeEventListener('click', onKeep);
      modalCancel.removeEventListener('click', onCancel);
      document.removeEventListener('keydown', onKey);
      resolve(value);
    };
    const onConfirm = () => finish(true);
    const onKeep = () => finish('keep');
    const onCancel = () => finish(false);
    const onKey = (event) => {
      if (event.key === 'Escape') finish(false);
    };
    modalConfirm.addEventListener('click', onConfirm);
    modalKeep.addEventListener('click', onKeep);
    modalCancel.addEventListener('click', onCancel);
    document.addEventListener('keydown', onKey);
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
      let hostname = '';
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
        // This tab does not have the content script yet.
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
        // This tab does not have the content script.
      }
    })
  );
}

async function retireDomain(previous, next) {
  if (!previous || previous === next || !isValidHostname(previous)) return;
  try {
    await chrome.permissions.remove({ origins: permissionOrigins(previous) });
  } catch {
    // The previous grant may already be gone.
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
    pushContext().catch(() => {});
  }, 300);
}

async function updateSiteStatus() {
  const domain = normalizeDomain(state.targetDomain);
  if (!domain) {
    setMessage(siteStatus, '');
    return;
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) {
    setMessage(siteStatus, '');
    return;
  }
  let hostname = '';
  try {
    hostname = new URL(tab.url).hostname;
  } catch {
    setMessage(siteStatus, '');
    return;
  }
  if (hostMatchesTarget(hostname, domain)) {
    setMessage(siteStatus, '');
    return;
  }
  setMessage(siteStatus, `Inactive on this site (target: ${domain})`);
}

async function runConnect(permissionPromise) {
  setBusy(true, 'connect');
  setMessage(connectError, '');
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
    setMessage(domainError, 'Target domain permission was denied. DOM changes stay off until you allow access.');
  } else if (domainError.querySelector('.message-text')?.textContent.startsWith('Target domain permission')) {
    setMessage(domainError, '');
  }
  if (result?.settings) applyRemoteConnection(result.settings);
  if (!result?.ok) {
    state.connected = false;
    setDot(false);
    updateVisibility();
    setMessage(connectError, result?.error || 'Could not connect to LaunchDarkly.');
  } else {
    setMessage(connectError, '');
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
  setBusy(true, 'disconnect');
  setMessage(connectError, '');
  state.connected = false;
  state.collecting = false;
  state.divs = divs;
  state.notice = '';
  setDot(false);
  setMessage(notice, '');
  updateVisibility();
  updateConnectButton();
  try {
    await send({ type: MSG.DISCONNECT, divs });
    await persist({ keepDivs: true });
    await messageEveryTab({ type: MSG.SHUTDOWN });
  } catch {
    setMessage(connectError, 'Could not disconnect. Try again.');
  } finally {
    setBusy(false);
  }
}

connectButton.addEventListener('click', () => {
  if (state.connected) {
    runDisconnect();
    return;
  }
  captureForm();
  editVersion += 1;
  const apiValidation = validateApiKey(state.apiKey);
  setMessage(apiKeyError, apiValidation.error);
  setMessage(connectError, '');
  if (!apiValidation.ok) return;
  const domain = normalizeDomain(state.targetDomain);
  const domainReady = Boolean(domain && isValidHostname(domain));
  if (domain && !domainReady) setMessage(domainError, 'Enter a hostname such as launchdarkly.com.');
  if (domainReady) {
    state.targetDomain = domain;
    targetDomainInput.value = domain;
  }
  domainPermissionPending = domainReady;
  const permissionPromise = domainReady
    ? chrome.permissions.request({ origins: permissionOrigins(domain) }).catch(() => false)
    : Promise.resolve(true);
  runConnect(permissionPromise).finally(() => {
    domainPermissionPending = false;
  });
});

targetDomainInput.addEventListener('change', () => {
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
    setMessage(domainError, normalized ? 'Enter a hostname such as launchdarkly.com.' : '');
    schedulePersist();
    return;
  }
  setMessage(domainError, '');
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
        setMessage(domainError, 'Target domain permission was denied. DOM changes stay off until you allow access.');
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

customerNameInput.addEventListener('input', () => {
  state.customerName = customerNameInput.value;
  loadedClientId = '';
  editVersion += 1;
  updateCustomerPreview();
  updateContextPreview();
  paintRowErrors();
  schedulePersist();
  scheduleContextPush();
});

customerNameInput.addEventListener('change', () => {
  if (clientIdInput.value.trim()) lookupClientId().catch(() => {});
});

apiKeyInput.addEventListener('input', () => {
  state.apiKey = apiKeyInput.value;
  editVersion += 1;
  setMessage(apiKeyError, '');
  setMessage(connectError, '');
  schedulePersist();
});

anonymousInput.addEventListener('change', () => {
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

observabilityInput.addEventListener('change', () => {
  applyTelemetryChange().catch(() => {});
});

sessionReplayInput.addEventListener('change', () => {
  applyTelemetryChange().catch(() => {});
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
  setBusy(true, 'start');
  setMessage(targetError, '');
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
    setMessage(domainError, 'Target domain permission was denied. DOM changes stay off until you allow access.');
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
        title: 'Reload target page',
        body: 'The target page will reload so Observability and Session replay can start.',
        confirmLabel: 'Reload'
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
  setBusy(true, 'stop');
  setMessage(targetError, '');
  state.collecting = false;
  updateVisibility();
  await persist({ keepDomain: true });
  await messageTabs({ type: MSG.RECONFIGURE, force: true });
  setBusy(false);
}

startButton.addEventListener('click', () => {
  if (state.collecting) {
    stopCollection();
    return;
  }
  captureForm();
  editVersion += 1;
  setMessage(targetError, '');
  if (!state.connected) {
    setMessage(targetError, 'Connect to LaunchDarkly before starting.');
    return;
  }
  if (!state.clientSideId) {
    setMessage(targetError, 'Enter a client ID before starting.');
    return;
  }
  if (!state.observability && !state.sessionReplay) {
    setMessage(targetError, 'Turn on Observability or Session replay before starting.');
    return;
  }
  const domain = normalizeDomain(state.targetDomain);
  if (!domain || !isValidHostname(domain)) {
    setMessage(domainError, domain ? 'Enter a hostname such as launchdarkly.com.' : 'Target domain is required.');
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

userKeyInput.addEventListener('input', () => {
  state.userKey = userKeyInput.value;
  editVersion += 1;
  updateContextPreview();
  scheduleContextPush();
});

addAttributeButton.addEventListener('click', () => {
  const row = createAttributeRow({ id: createUuid(), key: '', value: '' });
  attributeList.append(row);
  row.querySelector('.attr-key').focus();
});

updateContextButton.addEventListener('click', async () => {
  readAttributesFromDom();
  if (!paintAttributeErrors()) return;
  updateContextButton.disabled = true;
  try {
    await pushContext();
  } finally {
    updateContextButton.disabled = state.busy;
  }
});

clientIdInput.addEventListener('input', () => {
  if (applyingClientId) return;
  if (state.collecting) {
    clientIdInput.value = state.clientSideId;
    return;
  }
  setClientIdInvalid(false);
  setMessage(clientIdError, '');
  updateVisibility();
});

confirmClientIdButton.addEventListener('click', () => {
  if (state.collecting) return;
  lookupClientId({ reportMiss: true }).catch(() => {});
});

refreshDivsButton.addEventListener('click', () => {
  if (state.busy) return;
  const token = ++clientLookup;
  refreshDivsButton.disabled = true;
  loadOwnedFlags(token).finally(() => {
    refreshDivsButton.disabled = state.busy;
  });
});

addButton.addEventListener('click', () => {
  const row = createDivRow({ id: createUuid(), name: '', selector: '', defaultState: false, whenFalse: 'hide' });
  divList.append(row);
  paintRowErrors();
  row.querySelector('.flag-name').focus();
  schedulePersist();
});

updateButton.addEventListener('click', async () => {
  captureForm();
  const validation = validateConnectionInput(connectFields());
  showConnectionErrors(validation.errors);
  if (!validation.ok || !state.connected) {
    if (!state.connected) setMessage(connectError, 'Connect to LaunchDarkly before updating flags.');
    return;
  }
  for (const key of Object.keys(serverRowErrors)) delete serverRowErrors[key];
  paintRowErrors();
  const localErrors = validateDivRows(state.divs, state.customerName);
  if (Object.keys(localErrors).length) {
    renderSummary({ line: 'Fix the highlighted rows before updating flags.', details: [] });
    return;
  }
  setBusy(true, 'update');
  setMessage(connectError, '');
  await persist();
  const prepared = await send({ type: MSG.PREPARE_SYNC });
  if (!prepared?.ok) {
    setBusy(false);
    renderSummary({ line: prepared?.error || 'Could not read flags from LaunchDarkly.', details: [] });
    await reinstrumentPage();
    return;
  }
  let deleteConfirmed = true;
  let confirmedDeleteKeys = [];
  if (prepared.plan.prunes.length) {
    deleteConfirmed = await openModal({
      title: 'Delete flags?',
      body: 'These flags belong to this customer and are no longer in the list. They will be deleted from LaunchDarkly. Cancelling keeps them. Creates and updates still run.',
      items: prepared.plan.prunes.map((flag) => `${flag.name} (${flag.key})`),
      confirmLabel: 'Delete flags',
      danger: true
    });
    if (deleteConfirmed) confirmedDeleteKeys = prepared.plan.prunes.map((flag) => flag.key);
  }
  const executed = await send({ type: MSG.EXECUTE_SYNC, deleteConfirmed, confirmedDeleteKeys });
  setBusy(false);
  if (!executed?.ok) {
    renderSummary({ line: executed?.error || 'Flag update failed.', details: [] });
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

importButton.addEventListener('click', () => fileInput.click());

clearButton.addEventListener('click', async () => {
  if (state.connected || state.busy) return;
  const choice = await openModal({
    title: 'Clear settings?',
    body: 'Keep API key and client ID keeps those two. Clear all removes everything.',
    confirmLabel: 'Clear settings all',
    keepLabel: 'Clear settings, keep API key and client ID',
    danger: true
  });
  if (!choice || state.connected) return;
  captureForm({ keepDivs: true });
  const previousDomain = state.targetDomain;
  const kept = choice === 'keep'
    ? {
        apiKey: state.apiKey,
        clientSideId: state.clientSideId,
        projectKey: state.projectKey,
        environmentKey: state.environmentKey,
        projects: state.projects
      }
    : { apiKey: '' };
  editVersion += 1;
  clearTimeout(persistTimer);
  Object.assign(state, defaultSettings(), kept, { persistedDomain: '', anonymousKeyDomain: '' });
  apiKeyInput.value = state.apiKey;
  customerNameInput.value = '';
  targetDomainInput.value = '';
  anonymousInput.checked = state.anonymous;
  userKeyInput.value = '';
  renderDivList();
  renderAttributeList();
  showProjectEnvironment();
  updateCustomerPreview();
  updateContextPreview();
  setDot(false);
  updateConnectButton();
  showConnectionErrors({});
  setMessage(connectError, '');
  setMessage(notice, '');
  setMessage(sdkStatus, '');
  setMessage(clientIdStatus, '');
  setMessage(clientIdError, '');
  renderSummary(null);
  renderContextDelivery(null);
  for (const key of Object.keys(serverRowErrors)) delete serverRowErrors[key];
  await writeExtensionApiKey(state.apiKey);
  await chrome.storage.local.set({ [SETTINGS_KEY]: settingsFromState() });
  await chrome.storage.local.remove([CONTEXT_DELIVERY_KEY, LAST_SYNC_KEY, SDK_STATUS_KEY, REGISTRATION_KEY, DIV_SNAPSHOT_KEY, ANON_DOMAIN_KEY]);
  savedDivs = [];
  await retireDomain(previousDomain, '');
  await messageEveryTab({ type: MSG.SHUTDOWN });
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  fileInput.value = '';
  if (!file) return;
  runImport(file);
});

async function runImport(file) {
  let config;
  try {
    if (file.size > 1_000_000) throw new Error('Config file is too large.');
    const parsed = JSON.parse(await file.text());
    config = parseImportedConfig(parsed);
  } catch (error) {
    const message = error instanceof SyntaxError ? 'Config file is not valid JSON.' : error.message;
    setMessage(connectError, message || 'Config file is malformed.');
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
  setMessage(connectError, '');
  showConnectionErrors({});
  const permissionPromise =
    navigator.userActivation?.isActive === false
      ? Promise.resolve(false)
      : chrome.permissions.request({ origins: permissionOrigins(config.targetDomain) }).catch(() => false);
  await runConnect(permissionPromise);
}

exportButton.addEventListener('click', async () => {
  captureForm();
  const confirmed = await openModal({
    title: 'Export configuration',
    body: 'This file contains your API key in plain text. Store it securely.',
    confirmLabel: 'Download',
    danger: false
  });
  if (!confirmed) return;
  const blob = new Blob([JSON.stringify(buildExportPayload(state), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ld_config.json';
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
  state.anonymousUserKey = typeof stored[ANON_KEY] === 'string' && stored[ANON_KEY] ? stored[ANON_KEY] : createUuid();
  state.anonymousKeyDomain = normalizeDomain(typeof stored[ANON_DOMAIN_KEY] === 'string' ? stored[ANON_DOMAIN_KEY] : '');
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
    if (!refreshed?.ok) setMessage(connectError, refreshed?.error || 'Could not refresh the LaunchDarkly connection.');
    else setMessage(connectError, '');
  }
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes[CONTEXT_DELIVERY_KEY]) renderContextDelivery(changes[CONTEXT_DELIVERY_KEY].newValue);
  if (changes[SDK_STATUS_KEY]) {
    const next = changes[SDK_STATUS_KEY].newValue;
    setMessage(sdkStatus, next && !next.ok ? next.message : '');
  }
  if (changes[REGISTRATION_KEY]?.newValue?.error) setMessage(domainError, changes[REGISTRATION_KEY].newValue.error);
  if (changes[REGISTRATION_KEY] && !changes[REGISTRATION_KEY].newValue?.error && domainError.querySelector('.message-text')?.textContent.startsWith('Target domain permission')) {
    setMessage(domainError, '');
  }
});

window.addEventListener('pagehide', () => {
  captureForm({ keepDivs: true, keepDomain: true, keepAttributes: true });
  writeExtensionApiKey(state.apiKey);
  chrome.storage.local.set({ [SETTINGS_KEY]: settingsFromState() });
});

init();
