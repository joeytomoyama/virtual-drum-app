// Add a groove here to make it available in the picker. Track names are drum IDs,
// so new patterns automatically use the kit's current bindings and sounds.
export const grooves = [
  {
    id: 'basic-rock', name: 'Basic Rock', difficulty: 'Beginner', bpm: 90,
    beatsPerBar: 4, stepsPerQuarter: 4,
    tracks: {
      kick: [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
      snare: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
      hiHatClosed: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
    },
  },
  {
    id: 'four-on-the-floor', name: 'Four on the Floor', difficulty: 'Beginner', bpm: 120,
    beatsPerBar: 4, stepsPerQuarter: 4,
    tracks: {
      kick: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
      snare: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
      hiHatClosed: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
    },
  },
  {
    id: 'half-time', name: 'Half-Time', difficulty: 'Beginner', bpm: 80,
    beatsPerBar: 4, stepsPerQuarter: 4,
    tracks: {
      kick: [1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0],
      snare: [0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
      hiHatClosed: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
    },
  },
  {
    id: 'syncopated-rock', name: 'Syncopated Rock', difficulty: 'Intermediate', bpm: 100,
    beatsPerBar: 4, stepsPerQuarter: 4,
    tracks: {
      kick: [1,0,0,0,0,0,1,0,1,0,0,1,0,0,0,0],
      snare: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
      hiHatClosed: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
    },
  },
  {
    id: 'sixteenth-rock', name: 'Sixteenth-note Rock', difficulty: 'Intermediate', bpm: 80,
    beatsPerBar: 4, stepsPerQuarter: 4,
    tracks: {
      kick: [1,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0],
      snare: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
      hiHatClosed: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    },
  },
];
