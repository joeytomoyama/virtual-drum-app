import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_KEY_MAP, remapKey, normalizeKey, getDisplayKey } from '../src/keyBindings.js';

test('remapping uses the same drum IDs and frees the previously assigned key', () => {
  const map = remapKey(DEFAULT_KEY_MAP, 'snare', 'a');
  assert.equal(map.snare, 'A');
  assert.equal(map.hiHatClosed, '');
  assert.equal(DEFAULT_KEY_MAP.hiHatClosed, 'A');
  assert.equal(getDisplayKey(map.snare), 'A');
  assert.equal(getDisplayKey(map.hiHatClosed), 'Unassigned');
});

test('space and special keys remain playable and display correctly', () => {
  assert.equal(normalizeKey('Spacebar'), ' ');
  assert.equal(getDisplayKey(' '), 'Space');
  assert.equal(normalizeKey('ArrowUp'), 'ArrowUp');
  assert.equal(remapKey(DEFAULT_KEY_MAP, 'kick', 'ArrowUp').kick, 'ArrowUp');
});
