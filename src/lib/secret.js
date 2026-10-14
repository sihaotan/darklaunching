const API_KEY_NAME = 'apiKey';
const DB_NAME = 'darklaunching-private';
const STORE = 'secrets';

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
    const value = await requestResult(db.transaction(STORE, 'readonly').objectStore(STORE).get(API_KEY_NAME));
    return typeof value === 'string' ? value.trim() : '';
  } finally {
    db.close();
  }
}

async function writePrivateApiKey(value) {
  const db = await openPrivateDb();
  try {
    const store = db.transaction(STORE, 'readwrite').objectStore(STORE);
    const request = value ? store.put(value, API_KEY_NAME) : store.delete(API_KEY_NAME);
    await requestResult(request);
  } finally {
    db.close();
  }
}

async function trustedSession() {
  if (!chrome.storage?.session?.setAccessLevel) return;
  try {
    await chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
  } catch {
    // The trusted access level is already the default for session storage.
  }
}

async function readSessionApiKey() {
  if (!chrome.storage?.session) return '';
  await trustedSession();
  const data = await chrome.storage.session.get(API_KEY_NAME);
  return typeof data[API_KEY_NAME] === 'string' ? data[API_KEY_NAME].trim() : '';
}

async function writeSessionApiKey(value) {
  if (!chrome.storage?.session) return;
  await trustedSession();
  if (value) await chrome.storage.session.set({ [API_KEY_NAME]: value });
  else await chrome.storage.session.remove(API_KEY_NAME);
}

export async function readExtensionApiKey() {
  const sessionKey = await readSessionApiKey();
  if (sessionKey) {
    await chrome.storage.local.remove(API_KEY_NAME);
    return sessionKey;
  }
  const privateKey = await readPrivateApiKey().catch(() => '');
  if (privateKey) {
    await writeSessionApiKey(privateKey);
    await chrome.storage.local.remove(API_KEY_NAME);
    return privateKey;
  }
  const legacy = await chrome.storage.local.get(API_KEY_NAME);
  const localKey = typeof legacy[API_KEY_NAME] === 'string' ? legacy[API_KEY_NAME].trim() : '';
  if (!localKey) return '';
  await writeExtensionApiKey(localKey);
  return localKey;
}

export async function writeExtensionApiKey(value) {
  const key = String(value ?? '').trim();
  await writeSessionApiKey(key);
  await writePrivateApiKey(key).catch(() => {});
  await chrome.storage.local.remove(API_KEY_NAME);
}
