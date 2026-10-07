export const HIT_WINDOW_MS = 100;
export const PERFECT_WINDOW_MS = 40;
const EPSILON = 0.00001;

// Absolute song times keep rendering and judgement independent of frame rate,
// viewport size, and repeated visual copies. Inject a clock for deterministic tests.
export class RhythmSession {
  constructor(groove, bpm, now = () => performance.now()) {
    this.now = now;
    this.stepMs = 60000 / bpm / groove.stepsPerQuarter;
    this.stepsPerBar = groove.beatsPerBar * groove.stepsPerQuarter;
    this.barMs = this.stepsPerBar * this.stepMs;
    this.bars = groove.bars ?? 1;
    this.fillBarIndex = groove.fillBarIndex;
    this.stepCount = this.stepsPerBar * this.bars;
    this.loopMs = this.stepCount * this.stepMs;
    this.countInMs = groove.beatsPerBar * 60000 / bpm;
    this.events = Object.entries(groove.tracks).flatMap(([drumId, steps]) =>
      steps.flatMap((active, step) => active ? [{
        drumId, step, timeMs: step * this.stepMs,
        section: Math.floor(step / this.stepsPerBar) === this.fillBarIndex ? 'fill' : 'groove',
      }] : []),
    ).sort((a, b) => a.timeMs - b.timeMs);
    this.reset();
  }

  reset() {
    this.playing = false;
    this.started = false;
    this.elapsedMs = -this.countInMs;
    this.anchorMs = this.now();
    this.cursor = 0;
    this.results = new Map();
    this.stats = { hits: 0, perfect: 0, misses: 0, extras: 0, streak: 0, bestStreak: 0 };
    this.feedback = null;
  }

  position(at = this.now()) {
    return this.elapsedMs + (this.playing ? Math.max(0, at - this.anchorMs) : 0);
  }

  barAt(timeMs = this.position()) {
    const index = Math.max(0, Math.floor(timeMs / this.barMs)) % this.bars;
    return { bar: index + 1, bars: this.bars, section: timeMs < 0 ? 'count-in' : index === this.fillBarIndex ? 'fill' : 'groove' };
  }

  play() {
    if (this.playing) return;
    this.anchorMs = this.now();
    this.started = true;
    this.playing = true;
  }

  pause() {
    if (!this.playing) return;
    this.advance();
    this.elapsedMs = this.position();
    this.playing = false;
  }

  restart() {
    this.reset();
    this.play();
  }

  note(event, loop) {
    return { ...event, id: `${loop}:${event.drumId}:${event.step}`, timeMs: loop * this.loopMs + event.timeMs };
  }

  advance(at = this.now()) {
    if (!this.playing || !this.events.length) return;
    const timeMs = this.position(at);
    for (;;) {
      const loop = Math.floor(this.cursor / this.events.length);
      const note = this.note(this.events[this.cursor % this.events.length], loop);
      if (note.timeMs + HIT_WINDOW_MS + EPSILON >= timeMs) break;
      if (!this.results.has(note.id)) {
        this.results.set(note.id, { rating: 'miss', timeMs: note.timeMs });
        this.stats.misses += 1;
        this.stats.streak = 0;
        this.feedback = { rating: 'miss', drumId: note.drumId, at: timeMs };
      }
      this.cursor += 1;
    }
    // Only recent results are needed for display and duplicate-hit protection.
    for (const [id, result] of this.results) {
      if (result.timeMs < timeMs - this.loopMs * 2) this.results.delete(id);
    }
  }

  hit(drumId, at = this.now()) {
    if (!this.playing) return null;
    this.advance(at);
    const timeMs = this.position(at);
    const loop = Math.floor(timeMs / this.loopMs);
    let nearest;
    for (let cycle = Math.max(0, loop - 1); cycle <= Math.max(0, loop + 1); cycle += 1) {
      for (const event of this.events) {
        if (event.drumId !== drumId) continue;
        const note = this.note(event, cycle);
        const offsetMs = timeMs - note.timeMs;
        const previous = this.results.get(note.id);
        // A queued key event can predate the frame that marked a note missed.
        // Its original timestamp may still be inside the window.
        if ((previous && previous.rating !== 'miss') || Math.abs(offsetMs) > HIT_WINDOW_MS + EPSILON) continue;
        if (!nearest || Math.abs(offsetMs) < Math.abs(nearest.offsetMs)) nearest = { ...note, offsetMs };
      }
    }
    if (!nearest) {
      // The count-in is for getting ready, not for penalizing warm-up hits.
      if (timeMs < -HIT_WINDOW_MS) return null;
      this.stats.extras += 1;
      this.stats.streak = 0;
      this.feedback = { rating: 'extra', drumId, at: timeMs };
      return this.feedback;
    }
    const rating = Math.abs(nearest.offsetMs) <= PERFECT_WINDOW_MS + EPSILON ? 'perfect' : 'good';
    if (this.results.get(nearest.id)?.rating === 'miss') this.stats.misses -= 1;
    this.results.set(nearest.id, { rating, timeMs: nearest.timeMs });
    this.stats.hits += 1;
    if (rating === 'perfect') this.stats.perfect += 1;
    this.stats.streak += 1;
    this.stats.bestStreak = Math.max(this.stats.bestStreak, this.stats.streak);
    this.feedback = { ...nearest, rating, at: timeMs };
    return this.feedback;
  }

  visibleNotes(timeMs = this.position(), aheadMs = this.stepMs * 24, behindMs = 250) {
    const notes = [];
    const firstLoop = Math.max(0, Math.floor((timeMs - behindMs) / this.loopMs));
    const lastLoop = Math.max(0, Math.floor((timeMs + aheadMs) / this.loopMs));
    for (let loop = firstLoop; loop <= lastLoop; loop += 1) {
      for (const event of this.events) {
        const note = this.note(event, loop);
        if (note.timeMs >= timeMs - behindMs && note.timeMs <= timeMs + aheadMs) {
          notes.push({ ...note, rating: this.results.get(note.id)?.rating ?? 'pending' });
        }
      }
    }
    return notes;
  }

  snapshot() {
    const timeMs = this.position();
    return { timeMs, playing: this.playing, stats: { ...this.stats }, feedback: this.feedback, notes: this.visibleNotes(timeMs) };
  }
}
