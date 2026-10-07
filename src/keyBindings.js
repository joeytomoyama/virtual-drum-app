export const STORAGE_KEY = 'drum-key-map-v1';
export const DEFAULT_KEY_MAP = {
  crashLeft: 'Q', crashTop: 'W', ride: 'E', hiHatClosed: 'A', hiHatOpen: 'Z',
  snare: 'S', rackTomLeft: 'D', rackTomRight: 'F', floorTom: 'G', kick: ' ',
};

export function getDisplayKey(value) {
  if (value === ' ') return 'Space';
  return value ? value.toUpperCase() : 'Unassigned';
}

export function normalizeKey(key) {
  if (key === ' ' || key === 'Spacebar') return ' ';
  return key.length === 1 ? key.toUpperCase() : key;
}

export function remapKey(previous, drumId, key) {
  const normalized = normalizeKey(key);
  return Object.fromEntries(Object.entries(previous).map(([id, value]) =>
    [id, id === drumId ? normalized : value === normalized ? '' : value],
  ));
}

export function loadSavedKeyMap() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Object.fromEntries(Object.entries(DEFAULT_KEY_MAP).map(([id, fallback]) =>
      [id, typeof saved?.[id] === 'string' ? normalizeKey(saved[id]) : fallback],
    ));
  } catch {
    return { ...DEFAULT_KEY_MAP };
  }
}
