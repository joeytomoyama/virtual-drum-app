import assert from 'node:assert/strict';
import { test } from 'node:test';
import { grooves } from '../src/rhythm/grooves.js';
import { fills } from '../src/rhythm/fills.js';
import { buildPracticePattern } from '../src/rhythm/pattern.js';
import { RhythmSession } from '../src/rhythm/engine.js';

test('Off keeps the original groove and its lanes exactly', () => {
  for (const fill of fills) assert.equal(buildPracticePattern(grooves[0], fill, 0), grooves[0]);
});

test('every 2, 4, or 8 bars replaces only the final groove bar with the fill', () => {
  const groove = grooves[0];
  const fill = fills[1];
  const original = JSON.stringify([groove, fill]);
  for (const interval of [2, 4, 8]) {
    const pattern = buildPracticePattern(groove, fill, interval);
    const session = new RhythmSession(pattern, 120);
    assert.equal(session.loopMs, interval * 2000);
    assert.equal(session.countInMs, 2000, 'count-in stays one bar, not one phrase');
    for (const [id, steps] of Object.entries(pattern.tracks)) {
      assert.equal(steps.length, interval * 16);
      for (let bar = 0; bar < interval; bar += 1) {
        const source = bar === interval - 1 ? fill : groove;
        assert.deepEqual(steps.slice(bar * 16, (bar + 1) * 16), source.tracks[id] ?? Array(16).fill(0));
      }
    }
  }
  assert.equal(JSON.stringify([groove, fill]), original, 'source patterns are never mutated');
});

test('bar labels follow the phrase across boundaries and count-in', () => {
  const session = new RhythmSession(buildPracticePattern(grooves[0], fills[0], 4), 120);
  assert.deepEqual(session.barAt(-1), { bar: 1, bars: 4, section: 'count-in' });
  for (let bar = 0; bar < 12; bar += 1) {
    const status = session.barAt(bar * 2000);
    assert.equal(status.bar, bar % 4 + 1);
    assert.equal(status.section, bar % 4 === 3 ? 'fill' : 'groove');
  }
});

test('fill notes score on the transition, then the groove returns without a gap', () => {
  let now = 0;
  const session = new RhythmSession(buildPracticePattern(grooves[0], fills[0], 2), 120, () => now);
  session.play();
  now = session.countInMs + session.barMs - 50;
  assert.equal(session.hit('snare').section, 'fill');
  now = session.countInMs + session.barMs;
  assert.equal(session.hit('hiHatClosed').rating, 'extra', 'groove notes are replaced during the fill');
  now = session.countInMs + session.loopMs - 50;
  assert.equal(session.hit('kick').id, '1:kick:0');
  assert.equal(session.hit('hiHatClosed').section, 'groove');
});

test('all fill/frequency combinations score complete repeated phrases at different tempos', () => {
  for (const fill of fills) {
    for (const interval of [2, 4, 8]) {
      for (const bpm of [40, 120, 240]) {
        let now = 0;
        const session = new RhythmSession(buildPracticePattern(grooves[0], fill, interval), bpm, () => now);
        session.play();
        for (let cycle = 0; cycle < 3; cycle += 1) {
          for (const event of session.events) {
            now = session.countInMs + cycle * session.loopMs + event.timeMs - 20;
            assert.equal(session.hit(event.drumId).rating, 'perfect');
          }
        }
        now = session.countInMs + session.loopMs * 3 - 1;
        session.advance();
        assert.equal(session.stats.hits, session.events.length * 3);
        assert.equal(session.stats.misses, 0);
        assert.equal(session.stats.extras, 0);
      }
    }
  }
});

test('invalid fill schedules and incompatible patterns fail clearly', () => {
  assert.throws(() => buildPracticePattern(grooves[0], fills[0], 3), /frequency/);
  assert.throws(() => buildPracticePattern(grooves[0], { ...fills[0], beatsPerBar: 3 }, 2), /meter/);
  assert.throws(() => buildPracticePattern(grooves[0], { ...fills[0], tracks: { snare: [1] } }, 2), /complete bar/);
});
