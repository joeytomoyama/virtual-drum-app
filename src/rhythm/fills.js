// Full-bar fills use the same drum IDs and subdivisions as the groove library.
export const fills = [
  {
    id: 'snare-eighths', name: 'Snare Eighths', beatsPerBar: 4, stepsPerQuarter: 4,
    tracks: {
      snare: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
    },
  },
  {
    id: 'around-the-kit', name: 'Around the Kit', beatsPerBar: 4, stepsPerQuarter: 4,
    tracks: {
      snare: [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
      rackTomLeft: [0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0],
      rackTomRight: [0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0],
      floorTom: [0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0],
    },
  },
  {
    id: 'kick-and-snare', name: 'Kick & Snare', beatsPerBar: 4, stepsPerQuarter: 4,
    tracks: {
      kick: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
      snare: [0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0],
    },
  },
];
