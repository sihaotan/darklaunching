export function createMemory() {
  return {
    hidden: new Map(),
    blocked: new Map(),
    touched: new Set()
  };
}

function previousValue(element, styleName) {
  if (typeof element.style?.getPropertyValue === 'function') {
    return element.style.getPropertyValue(styleName) || '';
  }
  return '';
}

function toggleStyle(element, store, styleName, value, enabled) {
  if (enabled) {
    if (!store.has(element)) store.set(element, previousValue(element, styleName));
    element.style.setProperty(styleName, value, 'important');
    return;
  }
  if (!store.has(element)) return;
  const previous = store.get(element);
  element.style.removeProperty(styleName);
  if (previous) element.style.setProperty(styleName, previous);
  store.delete(element);
}

export function applyFlagToElement(element, action, flagValue, memory) {
  const hide = action === 'show' ? flagValue === true : flagValue === false;
  toggleStyle(element, memory.hidden, 'display', 'none', hide);
  toggleStyle(element, memory.blocked, 'pointer-events', 'none', false);
  if (memory.hidden.has(element)) memory.touched.add(element);
  else memory.touched.delete(element);
}

export function applyMappings(mappings, memory) {
  const next = new Map();
  for (const mapping of mappings) {
    for (const element of mapping.elements || []) next.set(element, mapping);
  }

  for (const element of [...memory.touched]) {
    if (!next.has(element) || element.isConnected === false) {
      applyFlagToElement(element, 'hide', true, memory);
      memory.touched.delete(element);
      memory.hidden.delete(element);
      memory.blocked.delete(element);
    }
  }

  for (const [element, mapping] of next) {
    if (element.isConnected === false) continue;
    applyFlagToElement(element, mapping.action, mapping.value, memory);
  }
}

export function resetManagedElements(memory) {
  for (const element of [...memory.touched]) applyFlagToElement(element, 'hide', true, memory);
  memory.hidden.clear();
  memory.blocked.clear();
  memory.touched.clear();
}

export function isValidCssSelector(selector) {
  const value = String(selector ?? '').trim();
  if (!value) return false;
  if (typeof document === 'undefined' || typeof document.querySelector !== 'function') return true;
  try {
    document.querySelector(value);
    return true;
  } catch {
    return false;
  }
}

export function findElements(doc, selector) {
  const value = String(selector ?? '').trim();
  if (!doc || !value || typeof doc.querySelectorAll !== 'function') return [];
  try {
    return Array.from(doc.querySelectorAll(value));
  } catch {
    return [];
  }
}
