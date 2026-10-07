import { useCallback, useEffect, useState } from 'react';
import { RhythmSession } from './engine.js';

export function useRhythmSession(groove, bpm) {
  // The parent remounts on a groove, tempo, or fill change. A session owns its
  // clock and results; React state is only a view of it, never the scoring clock.
  const [session] = useState(() => new RhythmSession(groove, bpm));
  const [view, setView] = useState(() => session.snapshot());
  const refresh = useCallback(() => setView(session.snapshot()), [session]);
  const pause = useCallback(() => { session.pause(); refresh(); }, [session, refresh]);
  const toggle = () => { if (session.playing) session.pause(); else session.play(); refresh(); };
  const restart = () => { session.restart(); refresh(); };
  const hit = useCallback((drumId, at) => {
    session.hit(drumId, at);
    refresh();
  }, [session, refresh]);

  useEffect(() => {
    if (!view.playing) return;
    let frame;
    const tick = () => {
      session.advance();
      refresh();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const onVisibility = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', pause);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', pause);
    };
  }, [view.playing, session, refresh, pause]);

  return { session, view, toggle, restart, pause, hit };
}
