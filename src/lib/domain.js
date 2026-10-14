export function normalizeDomain(input) {
  let value = String(input ?? '').trim().toLowerCase();
  if (!value) return '';
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  value = value.replace(/^\/\//, '');
  value = value.split('/')[0].split('?')[0].split('#')[0];
  const at = value.lastIndexOf('@');
  if (at !== -1) value = value.slice(at + 1);
  if (value.startsWith('[')) {
    const end = value.indexOf(']');
    value = end === -1 ? value : value.slice(1, end);
  } else {
    value = value.replace(/:\d+$/, '');
  }
  value = value.replace(/\.$/, '');
  if (value.startsWith('www.')) {
    const rest = value.slice(4);
    if (rest && (rest.includes('.') || rest === 'localhost')) value = rest;
  }
  return value;
}

export function canonicalHost(hostname) {
  return String(hostname ?? '').trim().toLowerCase().replace(/\.$/, '');
}

export function isValidHostname(domain) {
  if (!domain || domain.length > 253) return false;
  if (domain === 'localhost') return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(domain)) {
    return domain.split('.').every((part) => Number(part) <= 255);
  }
  if (/[^a-z0-9.-]/.test(domain) || domain.includes('..') || domain.startsWith('.') || domain.endsWith('.')) {
    return false;
  }
  return domain.split('.').every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
}

export function allowsSubdomainWildcard(domain) {
  if (!domain || domain === 'localhost' || !domain.includes('.')) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(domain)) return false;
  return true;
}

export function permissionOrigins(domain) {
  const origins = [];
  for (const scheme of ['https', 'http']) {
    origins.push(`${scheme}://${domain}/*`);
    if (allowsSubdomainWildcard(domain)) origins.push(`${scheme}://*.${domain}/*`);
  }
  return origins;
}

export function hostMatchesTarget(hostname, targetDomain) {
  const host = canonicalHost(hostname);
  const target = canonicalHost(targetDomain);
  if (!host || !target) return false;
  return host === target || host.endsWith(`.${target}`);
}

export function toolbarIconColored({ connected, targetDomain, url }) {
  const target = normalizeDomain(targetDomain);
  if (!connected || !isValidHostname(target)) return false;
  try {
    return hostMatchesTarget(new URL(url).hostname, target);
  } catch {
    return false;
  }
}
