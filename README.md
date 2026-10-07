# Virtual Drum App

Run `npm install` and `npm run dev`, then open the localhost URL printed by Vite.

The drum kit supports mouse/touch and keyboard play. Bindings save in your browser.
Rhythm Practice uses those same bindings for both the scrolling notes and scoring.
Choose a groove and tempo, then press Play for a four-beat count-in. Notes travel
right to left; play each drum when its note center reaches the cyan hit line.

Hits within 40 ms are Perfect; hits within 100 ms are Good. These windows are
independent of tempo and screen width. Simultaneous notes score independently.
Each note has a unique identity across loops and can be hit once. Late notes count
as misses; off-beat hits count as extras. Accuracy is hits / (hits + misses + extras).
Practice pauses while remapping keys or when the window loses focus. Play resumes
the current position; Restart resets the score and count-in. Changing the groove
or tempo starts a fresh, paused session. Assign any missing groove bindings before
playing. Free play still works while practice is paused.

Set Fills to Off or every 2, 4, or 8 bars, then choose Snare Eighths, Around the Kit,
or Kick & Snare. Every N bars means N−1 bars of groove followed by one full bar of
fill, repeating automatically. The fill replaces the groove in that bar, and the
scroll and clock continue straight back into the groove. Fill notes and their
section have an amber highlight. The bar indicator shows your position in the
phrase. Changing fill settings resets to a fresh, paused session; count-in remains
four beats. Fill lanes use the same saved bindings, including the toms.

Add rhythms in `src/rhythm/grooves.js`. Use kit drum IDs as track names, and supply
one bar of step arrays (beatsPerBar × stepsPerQuarter entries per track). The picker,
lanes, key labels, and judge use that data automatically. Rendering and scoring
share a monotonic clock in `src/rhythm/engine.js`; animation frames only update the
view. Input uses the original event timestamp, including keys queued behind a frame.

Run `npm test`, `npm run lint`, and `npm run build` to verify changes. The timing
tests cover chords, loop boundaries, misses, repeated hits, pause/resume, queued
events, remapping, and complete patterns with timing jitter at 40–240 BPM.
Add full-bar fill definitions in `src/rhythm/fills.js`, using the same meter and
subdivisions as their compatible grooves. Fill tests cover all three frequencies,
fill transitions, the return to the groove, and repeated phrases at 40–240 BPM.

## React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
