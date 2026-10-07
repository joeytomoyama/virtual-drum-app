import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RhythmSession, HIT_WINDOW_MS } from '../src/rhythm/engine.js';
import { grooves } from '../src/rhythm/grooves.js';

function setup(bpm = 120) {
  let now = 0;
  const session = new RhythmSession(grooves[0], bpm, () => now);
  return { session, setTime(value) { now = value; } };
}

test('simultaneous notes each accept their own drum, in either order', () => {
  for (const order of [['kick', 'hiHatClosed'], ['hiHatClosed', 'kick']]) {
    const { session, setTime } = setup();
    session.play();
    setTime(session.countInMs);
    for (const drum of order) assert.equal(session.hit(drum).rating, 'perfect');
    assert.equal(session.stats.hits, 2);
    assert.equal(session.stats.misses, 0);
  }
});

test('an early hit for the next loop is accepted before the boundary', () => {
  const { session, setTime } = setup();
  session.play();
  setTime(session.countInMs + session.loopMs - 60);
  const result = session.hit('kick');
  assert.equal(result.id, '1:kick:0');
  assert.equal(result.offsetMs, -60);
});

test('hit notes cannot be scored twice', () => {
  const { session, setTime } = setup();
  session.play();
  setTime(session.countInMs);
  assert.equal(session.hit('kick').rating, 'perfect');
  assert.equal(session.hit('kick').rating, 'extra');
  assert.equal(session.stats.hits, 1);
});

test('the wrong drum never consumes a different lane’s note', () => {
  const { session, setTime } = setup();
  session.play();
  setTime(session.countInMs);
  assert.equal(session.hit('snare').rating, 'extra');
  assert.equal(session.hit('kick').rating, 'perfect');
  assert.equal(session.hit('hiHatClosed').rating, 'perfect');
});

test('late notes become misses exactly once, even after a delayed frame', () => {
  const { session, setTime } = setup();
  session.play();
  setTime(session.countInMs + HIT_WINDOW_MS + 1);
  session.advance();
  assert.equal(session.stats.misses, 2);
  session.advance();
  assert.equal(session.stats.misses, 2);
  setTime(session.countInMs + session.loopMs + HIT_WINDOW_MS + 1);
  session.advance();
  assert.equal(session.stats.misses, session.events.length + 2);
});

test('the hit window is inclusive and identical at every tempo', () => {
  for (const bpm of [60, 90, 120, 180, 240]) {
    for (const offset of [-HIT_WINDOW_MS, -50, 0, 50, HIT_WINDOW_MS]) {
      const { session, setTime } = setup(bpm);
      session.play();
      setTime(session.countInMs + offset);
      assert.notEqual(session.hit('kick').rating, 'extra', `${bpm} BPM, ${offset} ms`);
    }
  }
});

test('hits outside the timing window do not score', () => {
  for (const offset of [-HIT_WINDOW_MS - 1, HIT_WINDOW_MS + 1]) {
    const { session, setTime } = setup();
    session.play();
    setTime(session.countInMs + session.loopMs / 2 + offset);
    assert.equal(session.hit('kick').rating, 'extra');
    assert.equal(session.stats.hits, 0);
  }
});

test('pause freezes scoring and position; resume preserves the remaining time', () => {
  const { session, setTime } = setup();
  session.play();
  setTime(500);
  session.pause();
  const pausedAt = session.position();
  setTime(9000);
  assert.equal(session.position(), pausedAt);
  assert.equal(session.hit('kick'), null);
  session.play();
  setTime(9100);
  assert.equal(session.position(), pausedAt + 100);
});

test('restart resets count-in, score, and consumed note identities', () => {
  const { session, setTime } = setup();
  session.play();
  setTime(session.countInMs);
  session.hit('kick');
  session.restart();
  assert.equal(session.position(), -session.countInMs);
  assert.equal(session.stats.hits, 0);
  setTime(session.countInMs * 2);
  assert.equal(session.hit('kick').rating, 'perfect');
});

test('event timestamps score correctly even when delivered after their frame', () => {
  const { session, setTime } = setup();
  session.play();
  setTime(session.countInMs + 130);
  // Even if a frame marked it missed, the original key arrived on the beat.
  session.advance();
  assert.equal(session.hit('kick', session.countInMs).rating, 'perfect');
  assert.equal(session.stats.misses, 1);
});

test('visible notes and scoring use the same absolute times over many loops', () => {
  const { session, setTime } = setup();
  session.play();
  for (let loop = 0; loop < 100; loop += 1) {
    const wallTime = session.countInMs + session.loopMs * loop;
    setTime(wallTime);
    const note = session.visibleNotes().find((note) => note.id === `${loop}:kick:0`);
    assert.equal(note.timeMs, session.position());
    assert.equal(session.hit('kick').id, note.id);
    session.advance();
  }
  assert.equal(session.stats.hits, 100);
  assert.ok(session.results.size < session.events.length * 4, 'old loop results are pruned');
});

test('every groove accepts its complete pattern with timing jitter and varied chord order', () => {
  let seed = 71;
  const jitter = () => {
    seed = (seed * 16807) % 2147483647;
    return seed % 41 - 20;
  };
  for (const groove of grooves) {
    for (const bpm of [40, 90, 120, 240]) {
      let now = 0;
      const session = new RhythmSession(groove, bpm, () => now);
      const attempts = Array.from({ length: 8 }, (_, loop) =>
        session.events.map((event) => ({
          drumId: event.drumId,
          at: session.countInMs + loop * session.loopMs + event.timeMs + jitter(),
        })),
      ).flat().sort((a, b) => a.at - b.at);
      session.play();
      for (const attempt of attempts) {
        now = attempt.at;
        const result = session.hit(attempt.drumId);
        assert.equal(result?.rating, 'perfect', `${groove.name} at ${bpm} BPM: ${attempt.drumId}`);
      }
      now = session.countInMs + session.loopMs * 8 - 1;
      session.advance();
      assert.equal(session.stats.hits, attempts.length);
      assert.equal(session.stats.misses, 0);
      assert.equal(session.stats.extras, 0);
    }
  }
});

test('warming up during the count-in does not penalize the player', () => {
  const { session } = setup();
  session.play();
  assert.equal(session.hit('kick'), null);
  assert.equal(session.stats.extras, 0);
});
