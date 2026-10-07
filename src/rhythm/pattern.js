// Compile a repeating phrase before playback. Scrolling and scoring then see one
// uninterrupted timeline, including the transition out of the fill and back in.
export function buildPracticePattern(groove, fill, everyBars = 0) {
  if (everyBars === 0) return groove;
  if (![2, 4, 8].includes(everyBars)) throw new RangeError('Fill frequency must be Off, 2, 4, or 8 bars.');
  if (!fill || fill.beatsPerBar !== groove.beatsPerBar || fill.stepsPerQuarter !== groove.stepsPerQuarter) {
    throw new RangeError('The fill must use the same meter and subdivisions as the groove.');
  }
  const stepsPerBar = groove.beatsPerBar * groove.stepsPerQuarter;
  for (const pattern of [groove, fill]) {
    if (Object.values(pattern.tracks).some((track) => track.length !== stepsPerBar)) {
      throw new RangeError('Grooves and fills must contain one complete bar per track.');
    }
  }
  const drumIds = new Set([...Object.keys(groove.tracks), ...Object.keys(fill.tracks)]);
  const tracks = Object.fromEntries([...drumIds].map((id) => [id,
    Array.from({ length: everyBars }, (_, bar) => {
      const source = bar === everyBars - 1 ? fill : groove;
      return source.tracks[id] ?? Array(stepsPerBar).fill(0);
    }).flat(),
  ]));
  return { ...groove, bars: everyBars, fillBarIndex: everyBars - 1, fillName: fill.name, tracks };
}
