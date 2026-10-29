export function createUuid(cryptoObj = globalThis.crypto) {
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  const bytes = cryptoObj.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function anonymousKeyForDomain({ anonymous, key, keyDomain, domain, uuid = createUuid }) {
  const nextDomain = String(domain ?? '').trim();
  const currentKey = typeof key === 'string' ? key.trim() : '';
  const currentDomain = typeof keyDomain === 'string' ? keyDomain.trim() : '';
  if (!anonymous || !nextDomain || (currentKey && currentDomain === nextDomain)) {
    return { key: currentKey, domain: currentDomain };
  }
  return { key: uuid(), domain: nextDomain };
}

export async function ensureAnonymousKey(storage, uuid = createUuid) {
  const current = await storage.get(storage.anonKey);
  if (typeof current === 'string' && current.trim()) return current;
  const next = uuid();
  await storage.set(storage.anonKey, next);
  return next;
}
