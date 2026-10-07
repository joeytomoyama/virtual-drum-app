import { useImperativeHandle, useRef, useState } from 'react';
import { Music2, Pause, Play, RotateCcw } from 'lucide-react';
import { getDisplayKey } from '../keyBindings.js';
import { grooves } from './grooves.js';
import { fills } from './fills.js';
import { buildPracticePattern } from './pattern.js';
import { HIT_WINDOW_MS, PERFECT_WINDOW_MS } from './engine.js';
import { useRhythmSession } from './useRhythmSession.js';

const LABELS = {
  kick: 'Kick', snare: 'Snare', hiHatClosed: 'Hi-hat', hiHatOpen: 'Open hi-hat',
  ride: 'Ride', crashLeft: 'Left crash', crashTop: 'Top crash',
  rackTomLeft: 'High tom', rackTomRight: 'Mid tom', floorTom: 'Floor tom',
};
const NOTE_STYLES = {
  pending: 'border-white/25 bg-slate-700 text-white',
  perfect: 'border-emerald-300 bg-emerald-500 text-emerald-950',
  good: 'border-cyan-200 bg-cyan-400 text-cyan-950',
  miss: 'border-rose-400/60 bg-rose-950 text-rose-200',
};
const HIT_LINE_X = 48;
const PIXELS_PER_STEP = 64;
const LANE_ORDER = { hiHatClosed: 0, hiHatOpen: 1, snare: 2, rackTomLeft: 3, rackTomRight: 4, floorTom: 5, kick: 6 };

function ScrollingGroove({ groove, bpm, keyMap, listeningFor, controlsRef }) {
  const { session, view, toggle, restart, pause, hit } = useRhythmSession(groove, bpm);
  const stageRef = useRef(null);
  useImperativeHandle(controlsRef, () => ({ hit, pause }), [hit, pause]);
  const lanes = Object.keys(groove.tracks).filter((id) => groove.tracks[id].some(Boolean))
    .sort((a, b) => (LANE_ORDER[a] ?? 7) - (LANE_ORDER[b] ?? 7));
  const missing = lanes.filter((id) => !keyMap[id]);
  const canPlay = !listeningFor && !missing.length;
  const pixelSpeed = PIXELS_PER_STEP / session.stepMs;
  const displayTimeMs = session.started ? view.timeMs : 0;
  const notes = session.started ? view.notes : session.visibleNotes(0);
  const phrase = session.barAt(displayTimeMs);
  const firstVisibleBar = Math.max(0, Math.floor((displayTimeMs - 200) / session.barMs));
  const lastVisibleBar = Math.max(0, Math.floor((displayTimeMs + session.stepMs * 24) / session.barMs));
  const fillBars = Array.from({ length: lastVisibleBar - firstVisibleBar + 1 }, (_, index) => firstVisibleBar + index)
    .filter((bar) => bar % session.bars === session.fillBarIndex);
  const countIn = Math.max(0, Math.ceil(-view.timeMs / (60000 / bpm)));
  const total = view.stats.hits + view.stats.misses + view.stats.extras;
  const accuracy = total ? `${Math.round(view.stats.hits / total * 100)}%` : '—';
  const feedback = view.feedback && view.timeMs - view.feedback.at < 700 ? view.feedback : null;
  const beatStart = Math.max(0, Math.floor((displayTimeMs - 200) / session.stepMs));
  const guides = Array.from({ length: 26 }, (_, index) => beatStart + index);
  const onPlayback = () => { toggle(); stageRef.current?.focus({ preventScroll: true }); };
  const onRestart = () => { restart(); stageRef.current?.focus({ preventScroll: true }); };

  let feedbackText = 'Follow the notes to the hit line';
  if (countIn && view.playing) feedbackText = `Get ready · ${countIn}`;
  else if (!view.playing) feedbackText = 'Paused · press Play when you’re ready';
  else if (feedback?.rating === 'miss') feedbackText = `Missed · ${LABELS[feedback.drumId] ?? feedback.drumId}`;
  else if (feedback?.rating === 'extra') feedbackText = `${LABELS[feedback.drumId] ?? feedback.drumId} · off beat`;
  else if (feedback) {
    const timing = Math.abs(feedback.offsetMs) < 5 ? 'on time' : `${Math.round(Math.abs(feedback.offsetMs))} ms ${feedback.offsetMs < 0 ? 'early' : 'late'}`;
    feedbackText = `${feedback.rating === 'perfect' ? 'Perfect' : 'Good'} · ${timing}`;
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-3">
        <p className={`text-sm ${!view.playing ? 'text-slate-300' : feedback?.rating === 'miss' ? 'text-rose-200' : feedback?.rating === 'extra' ? 'text-amber-200' : feedback ? 'text-emerald-200' : 'text-slate-300'}`} role="status">{feedbackText}</p>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Restart groove" onClick={onRestart} disabled={!canPlay} className="grid size-10 place-items-center rounded-full border border-white/15 bg-white/5 transition hover:bg-white/10 disabled:opacity-40"><RotateCcw size={17} /></button>
          <button type="button" onClick={onPlayback} disabled={!canPlay} className="inline-flex h-10 items-center gap-2 rounded-full bg-cyan-200 px-5 font-semibold text-slate-950 transition hover:bg-cyan-100 disabled:opacity-40">
            {view.playing ? <Pause size={17} /> : <Play size={17} />}{view.playing ? 'Pause' : 'Play'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-3 text-xs">
        <p data-testid="phrase-status" data-section={phrase.section} data-bar={phrase.bar} className={phrase.section === 'fill' ? 'font-semibold text-amber-200' : 'text-cyan-100'}>
          {phrase.section === 'count-in' ? 'Count-in' : phrase.section === 'fill' ? `Fill · ${groove.fillName}` : 'Groove'}
          {session.bars > 1 && phrase.section !== 'count-in' && ` · bar ${phrase.bar} of ${phrase.bars}`}
        </p>
        <span className="text-slate-400">{session.bars > 1 ? `${session.bars - 1} groove ${session.bars === 2 ? 'bar' : 'bars'} → 1 fill bar` : 'Fills off'}</span>
      </div>

      <div ref={stageRef} tabIndex={0} role="region" aria-label="Rhythm practice play area" data-testid="rhythm-stage" data-playing={view.playing} data-song-time={view.timeMs.toFixed(2)} className="mx-3 mb-4 flex overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 sm:mx-5">
        <div className="z-10 w-20 shrink-0 border-r border-white/10 bg-slate-900 sm:w-28">
          {lanes.map((id) => (
            <div key={id} className="flex h-[72px] flex-col justify-center gap-1 border-b border-white/5 px-3">
              <span className="text-xs font-medium text-slate-300 sm:text-sm">{LABELS[id] ?? id}</span>
              <kbd data-testid={`lane-key-${id}`} className="w-fit max-w-full truncate rounded-md border border-white/15 bg-white/10 px-2 py-0.5 text-xs text-cyan-100" title={getDisplayKey(keyMap[id])}>{getDisplayKey(keyMap[id])}</kbd>
            </div>
          ))}
          <div className="h-8" />
        </div>
        <div className="relative min-w-0 flex-1 overflow-hidden" style={{ height: lanes.length * 72 + 32 }}>
          {fillBars.map((bar) => (
            <div key={bar} aria-hidden="true" className="absolute bottom-8 top-0 border-x border-amber-300/20 bg-amber-300/5" style={{ left: HIT_LINE_X + (bar * session.barMs - displayTimeMs) * pixelSpeed, width: session.barMs * pixelSpeed }}>
              <span className="absolute left-3 top-1 text-[9px] font-semibold uppercase tracking-widest text-amber-200/60">Fill</span>
            </div>
          ))}
          <div className="pointer-events-none absolute bottom-8 top-0 z-10 w-px bg-cyan-200 shadow-[0_0_14px_3px_rgba(103,232,249,0.2)]" style={{ left: HIT_LINE_X }} />
          <span className="absolute bottom-2 z-10 -translate-x-1/2 text-[9px] font-bold uppercase tracking-widest text-cyan-200" style={{ left: HIT_LINE_X }}>Hit</span>
          {guides.map((step) => {
            const isBeat = step % groove.stepsPerQuarter === 0;
            const left = HIT_LINE_X + (step * session.stepMs - displayTimeMs) * pixelSpeed;
            return <div aria-hidden="true" key={step} className={`absolute bottom-8 top-0 border-l ${isBeat ? 'border-white/15' : 'border-white/5'}`} style={{ left }}>
              {isBeat && <span className="absolute -bottom-6 -translate-x-1/2 text-[10px] text-slate-500">{Math.floor(step / groove.stepsPerQuarter) % groove.beatsPerBar + 1}</span>}
            </div>;
          })}
          {lanes.map((id, lane) => <div key={id} className="absolute inset-x-0 border-b border-white/5" style={{ top: (lane + 1) * 72 }} />)}
          {notes.map((note) => (
            <span key={note.id} aria-hidden="true" data-note-id={note.id} data-drum-id={note.drumId} data-section={note.section} data-rating={note.rating} data-in-window={view.playing && note.rating === 'pending' && Math.abs(note.timeMs - view.timeMs) <= 75} className={`absolute flex h-10 min-w-10 max-w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center truncate rounded-xl border px-2 text-xs font-bold shadow-lg ${note.rating === 'pending' && note.section === 'fill' ? 'border-amber-300/50 bg-amber-900 text-amber-100' : NOTE_STYLES[note.rating]}`} style={{ left: HIT_LINE_X + (note.timeMs - displayTimeMs) * pixelSpeed, top: lanes.indexOf(note.drumId) * 72 + 36 }} title={`${LABELS[note.drumId] ?? note.drumId}: ${getDisplayKey(keyMap[note.drumId])}`}>
              {getDisplayKey(keyMap[note.drumId])}
            </span>
          ))}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-slate-950 to-transparent" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 pb-4 text-sm text-slate-300">
        <span>Hits <output aria-label="Successful hits" className="ml-1 font-semibold text-emerald-200">{view.stats.hits}</output></span>
        <span>Missed <output aria-label="Missed notes" className="ml-1 font-semibold text-rose-200">{view.stats.misses}</output></span>
        <span>Extra <output aria-label="Extra hits" className="ml-1 font-semibold text-amber-200">{view.stats.extras}</output></span>
        <span>Accuracy <output aria-label="Hit accuracy" className="ml-1 font-semibold text-white">{accuracy}</output></span>
        <span>Streak <output aria-label="Current streak" className="ml-1 font-semibold text-white">{view.stats.streak}</output></span>
        <span className="ml-auto text-xs text-slate-400">Perfect ±{PERFECT_WINDOW_MS} ms · Good ±{HIT_WINDOW_MS} ms</span>
      </div>
      {missing.length > 0 && <p className="border-t border-white/10 px-5 py-3 text-sm text-amber-200">Assign a key to {missing.map((id) => LABELS[id] ?? id).join(', ')} in Key Mapping below to play this groove.</p>}
      {listeningFor && <p className="border-t border-white/10 px-5 py-3 text-sm text-cyan-200">Practice is paused while you change a key binding.</p>}
    </>
  );
}

export default function RhythmPractice({ keyMap, listeningFor, controlsRef }) {
  const [grooveId, setGrooveId] = useState(grooves[0].id);
  const groove = grooves.find((item) => item.id === grooveId);
  const [bpm, setBpm] = useState(groove.bpm);
  const [tempoDraft, setTempoDraft] = useState(String(groove.bpm));
  const [fillId, setFillId] = useState(fills[0].id);
  const [fillEvery, setFillEvery] = useState(0);
  const compatibleFills = fills.filter((item) => item.beatsPerBar === groove.beatsPerBar && item.stepsPerQuarter === groove.stepsPerQuarter);
  const fill = compatibleFills.find((item) => item.id === fillId) ?? compatibleFills[0];
  const pattern = buildPracticePattern(groove, fill, fill ? fillEvery : 0);
  const changeGroove = (event) => {
    const next = grooves.find((item) => item.id === event.target.value);
    setGrooveId(next.id);
    setBpm(next.bpm);
    setTempoDraft(String(next.bpm));
  };

  return (
    <section aria-label="Rhythm practice" className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 shadow-2xl">
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-5">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold"><Music2 className="text-cyan-200" size={22} />Rhythm Practice</h2>
          <p className="mt-1 max-w-xl text-sm text-slate-300">Play each drum as its note reaches the line. Start with a four-beat count-in, then keep the groove going.</p>
        </div>
        <div className="flex w-full flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-slate-300">Groove
            <select value={grooveId} onChange={changeGroove} className="h-10 max-w-full rounded-xl border border-white/15 bg-slate-800 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-200">
              {[...new Set(grooves.map((item) => item.difficulty ?? 'Grooves'))].map((difficulty) => <optgroup key={difficulty} label={difficulty}>{grooves.filter((item) => (item.difficulty ?? 'Grooves') === difficulty).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</optgroup>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-300">Fills
            <select value={fill ? fillEvery : 0} onChange={(event) => setFillEvery(Number(event.target.value))} disabled={!fill} className="h-10 rounded-xl border border-white/15 bg-slate-800 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-200 disabled:opacity-40">
              <option value={0}>Off</option>
              {[2, 4, 8].map((bars) => <option key={bars} value={bars}>Every {bars} bars</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-300">Fill type
            <select value={fill?.id ?? ''} onChange={(event) => setFillId(event.target.value)} disabled={!fillEvery || !fill} className="h-10 rounded-xl border border-white/15 bg-slate-800 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-200 disabled:opacity-40">
              {compatibleFills.length ? compatibleFills.map((item) => <option key={item.id} value={item.id}>{item.name}</option>) : <option value="">No compatible fills</option>}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-300">Tempo (BPM)
            <input type="number" aria-label="Tempo (BPM)" min={40} max={240} value={tempoDraft} onChange={(event) => {
              setTempoDraft(event.target.value);
              const value = Number(event.target.value);
              if (Number.isFinite(value) && value >= 40 && value <= 240) setBpm(value);
            }} onBlur={() => {
              const value = tempoDraft === '' ? bpm : Math.min(240, Math.max(40, Number(tempoDraft) || bpm));
              setTempoDraft(String(value));
              setBpm(value);
            }} className="h-10 w-24 rounded-xl border border-white/15 bg-slate-800 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-200" />
          </label>
        </div>
      </div>
      <ScrollingGroove key={`${groove.id}:${bpm}:${fill?.id}:${fill ? fillEvery : 0}`} groove={pattern} bpm={bpm} keyMap={keyMap} listeningFor={listeningFor} controlsRef={controlsRef} />
    </section>
  );
}
