import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";

/*
  ------------------------------------------------------------------
  Drumset Layout App
  ------------------------------------------------------------------
  Plain React version.

  No shadcn imports.
  No path aliases.
  Just:
  - React
  - framer-motion
  - lucide-react
  - Tailwind classes

  Audio features:
  - sample playback
  - overlapping hits
  - open hi-hat choke group
  - master volume
  - small random pitch variation

  Put your audio files in /public/samples.
  ------------------------------------------------------------------
*/

const STORAGE_KEY = "drum-key-map-v1";
const ACTIVE_FLASH_MS = 140;
const DEFAULT_MASTER_VOLUME = 0.85;
const HARD_CODED_PITCH_VARIATION = 0.03;
const HI_HAT_OPEN_GROUP = "open-hi-hat";

// Default keyboard bindings.
const DEFAULT_KEY_MAP = {
  crashLeft: "Q",
  crashTop: "W",
  ride: "E",
  hiHatClosed: "A",
  hiHatOpen: "Z",
  snare: "S",
  rackTomLeft: "D",
  rackTomRight: "F",
  floorTom: "G",
  kick: " ",
};

// Shared visual styles for the round stage pieces.
const DRUM_STYLE = {
  cymbal:
    "border-yellow-100/80 bg-[radial-gradient(circle_at_35%_35%,_rgba(255,255,255,0.95),_rgba(255,222,89,0.95)_30%,_rgba(222,180,46,0.95)_100%)] text-zinc-800",
  snare: "border-zinc-400 bg-zinc-200 text-zinc-800",
  tom: "border-zinc-300 bg-zinc-900 text-white",
};

// Audio file setup.
const SAMPLE_LIBRARY = {
  kick: {
    path: "/samples/kick.wav",
    baseGain: 1,
    pitchJitter: 0.4,
  },
  snare: {
    path: "/samples/snare.wav",
    baseGain: 0.95,
    pitchJitter: 0.55,
  },
  hiHatClosed: {
    path: "/samples/hihat-closed.wav",
    baseGain: 0.82,
    pitchJitter: 0.45,
    chokeGroups: [HI_HAT_OPEN_GROUP],
  },
  hiHatOpen: {
    path: "/samples/hihat-open.wav",
    baseGain: 0.82,
    pitchJitter: 0.45,
    registerGroups: [HI_HAT_OPEN_GROUP],
  },
  crashLeft: {
    path: "/samples/crash-left.wav",
    baseGain: 0.9,
    pitchJitter: 0.18,
  },
  crashTop: {
    path: "/samples/crash-top.wav",
    baseGain: 0.9,
    pitchJitter: 0.18,
  },
  ride: {
    path: "/samples/ride.wav",
    baseGain: 0.88,
    pitchJitter: 0.12,
  },
  rackTomLeft: {
    path: "/samples/tom-high.wav",
    baseGain: 0.95,
    pitchJitter: 0.4,
  },
  rackTomRight: {
    path: "/samples/tom-mid.wav",
    baseGain: 0.95,
    pitchJitter: 0.4,
  },
  floorTom: {
    path: "/samples/tom-floor.wav",
    baseGain: 0.95,
    pitchJitter: 0.35,
  },
};

// Circular pieces shown on the stage.
const DRUMS = [
  {
    id: "crashLeft",
    label: '16" Crash',
    kind: "cymbal",
    x: 9,
    y: 6,
    w: 24,
    h: 24,
  },
  {
    id: "crashTop",
    label: '14" Crash',
    kind: "cymbal",
    x: 37,
    y: 3,
    w: 20,
    h: 20,
  },
  {
    id: "ride",
    label: '20" Ride',
    kind: "cymbal",
    x: 61,
    y: 8,
    w: 28,
    h: 28,
  },
  {
    id: "rackTomLeft",
    label: '10" Rack Tom',
    kind: "tom",
    x: 28,
    y: 20,
    w: 17,
    h: 17,
  },
  {
    id: "rackTomRight",
    label: '14" Rack Tom',
    kind: "tom",
    x: 48,
    y: 20,
    w: 21,
    h: 21,
  },
  {
    id: "hiHatClosed",
    label: '14" Hi-Hat',
    kind: "cymbal",
    x: 5,
    y: 49,
    w: 19,
    h: 19,
  },
  {
    id: "snare",
    label: '12" Snare',
    kind: "snare",
    x: 22,
    y: 51,
    w: 18,
    h: 18,
  },
  {
    id: "floorTom",
    label: '16" Floor Tom',
    kind: "tom",
    x: 58,
    y: 53,
    w: 24,
    h: 24,
  },
];

// Everything that gets a row in the right-hand panel.
const REMAP_ITEMS = [
  ...DRUMS.map(({ id, label }) => ({ id, label })),
  { id: "hiHatOpen", label: "Open Hi-Hat" },
  { id: "kick", label: '22" Bass Drum' },
];

// Shared button look for simple native buttons.
const BUTTON_BASE =
  "rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/15";

// Convert stored values into friendly labels.
function getDisplayKey(value) {
  if (value === " ") return "Space";
  if (!value) return "Unassigned";
  return value.toUpperCase();
}

// Normalize browser key values so bindings stay consistent.
function normalizeKey(key) {
  if (key === " " || key === "Spacebar") return " ";
  if (key.length === 1) return key.toUpperCase();
  return key;
}

// Break labels into lines inside round pads.
function splitLabel(label) {
  return label.split(" ");
}

// Keep numbers in a safe range.
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// Read saved key mappings from localStorage.
function loadSavedKeyMap() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...DEFAULT_KEY_MAP, ...JSON.parse(saved) } : DEFAULT_KEY_MAP;
  } catch {
    return DEFAULT_KEY_MAP;
  }
}

// Wrap decodeAudioData in a promise.
function decodeAudioData(ctx, arrayBuffer) {
  return new Promise((resolve, reject) => {
    ctx.decodeAudioData(arrayBuffer.slice(0), resolve, reject);
  });
}

// Add a little random pitch movement to repeated hits.
function getPitchRate(baseRate = 1, globalVariation = 0, drumPitchJitter = 1) {
  const variationAmount = globalVariation * drumPitchJitter;
  const randomOffset = (Math.random() * 2 - 1) * variationAmount;
  return clamp(baseRate * (1 + randomOffset), 0.75, 1.25);
}

// Load samples once and return a playDrum function.
function useSampleDrumAudio({ masterVolume }) {
  const audioContextRef = useRef(null);
  const masterGainRef = useRef(null);
  const sampleBuffersRef = useRef(new Map());
  const activeGroupsRef = useRef(new Map());
  const loadPromiseRef = useRef(null);

  // Create the audio context and master gain once.
  const ensureAudioGraph = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContextClass();
      const masterGain = ctx.createGain();

      masterGain.gain.value = masterVolume;
      masterGain.connect(ctx.destination);

      audioContextRef.current = ctx;
      masterGainRef.current = masterGain;
    }

    return audioContextRef.current;
  }, [masterVolume]);

  // Keep the master volume synced to the UI slider.
  useEffect(() => {
    if (masterGainRef.current && audioContextRef.current) {
      masterGainRef.current.gain.setValueAtTime(masterVolume, audioContextRef.current.currentTime);
    }
  }, [masterVolume]);

  // Load and decode every sample file once.
  const loadAllSamples = useCallback(async () => {
    const ctx = ensureAudioGraph();

    if (loadPromiseRef.current) {
      return loadPromiseRef.current;
    }

    console.info("[drums] Loading samples from /public/samples...");

    loadPromiseRef.current = (async () => {
      const sampleEntries = Object.entries(SAMPLE_LIBRARY);
      const failedIds = [];
      let loadedCount = 0;

      await Promise.all(
        sampleEntries.map(async ([drumId, sample]) => {
          try {
            const response = await fetch(sample.path);
            if (!response.ok) {
              throw new Error(`Failed to load ${sample.path}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const decodedBuffer = await decodeAudioData(ctx, arrayBuffer);

            sampleBuffersRef.current.set(drumId, decodedBuffer);
            loadedCount += 1;
            console.info(`[drums] Loaded sample: ${drumId}`);
          } catch {
            failedIds.push(drumId);
          }
        }),
      );

      if (failedIds.length) {
        console.warn("[drums] Some samples failed to load:", failedIds);
      } else {
        console.info(`[drums] All samples loaded (${loadedCount}/${sampleEntries.length})`);
      }
    })();

    return loadPromiseRef.current;
  }, [ensureAudioGraph]);

  // Start preloading as soon as the component mounts.
  useEffect(() => {
    void loadAllSamples();
  }, [loadAllSamples]);

  // Stop every currently playing source in a named group.
  const stopGroup = useCallback((groupName, fadeOutSeconds = 0.04) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const groupEntries = activeGroupsRef.current.get(groupName);
    if (!groupEntries || groupEntries.size === 0) return;

    const now = ctx.currentTime;

    groupEntries.forEach((entry) => {
      const { source, gainNode } = entry;

      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(Math.max(gainNode.gain.value, 0.0001), now);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + fadeOutSeconds);

      try {
        source.stop(now + fadeOutSeconds);
      } catch {
        // Ignore if the source already ended.
      }
    });

    activeGroupsRef.current.delete(groupName);
  }, []);

  // Track a source inside one or more playback groups.
  const registerSourceInGroups = useCallback((groupNames, entry) => {
    if (!groupNames?.length) return;

    groupNames.forEach((groupName) => {
      if (!activeGroupsRef.current.has(groupName)) {
        activeGroupsRef.current.set(groupName, new Set());
      }

      activeGroupsRef.current.get(groupName).add(entry);
    });
  }, []);

  // Remove a finished source from its playback groups.
  const unregisterSourceFromGroups = useCallback((groupNames, entry) => {
    if (!groupNames?.length) return;

    groupNames.forEach((groupName) => {
      const groupEntries = activeGroupsRef.current.get(groupName);
      if (!groupEntries) return;

      groupEntries.delete(entry);
      if (groupEntries.size === 0) {
        activeGroupsRef.current.delete(groupName);
      }
    });
  }, []);

  // Play one drum sample.
  function playDrumInternal(drumId) {
    const ctx = ensureAudioGraph();
    const sample = SAMPLE_LIBRARY[drumId];
    if (!sample) return Promise.resolve();

    return (async () => {
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      await loadAllSamples();

      const buffer = sampleBuffersRef.current.get(drumId);
      if (!buffer || !masterGainRef.current) return;

      sample.chokeGroups?.forEach((groupName) => stopGroup(groupName));

      const source = ctx.createBufferSource();
      const gainNode = ctx.createGain();
      const entry = { source, gainNode };

      source.buffer = buffer;
      source.playbackRate.value = getPitchRate(1, HARD_CODED_PITCH_VARIATION, sample.pitchJitter ?? 1);
      gainNode.gain.value = sample.baseGain ?? 1;

      source.connect(gainNode);
      gainNode.connect(masterGainRef.current);

      registerSourceInGroups(sample.registerGroups, entry);

      source.onended = () => {
        unregisterSourceFromGroups(sample.registerGroups, entry);
      };

      source.start();
    })();
  }

  return { playDrum: playDrumInternal };
}

// Render one circular cymbal or drum on the stage.
function DrumPiece({ drum, isActive, keyMap, onTrigger }) {
  const isCymbal = drum.kind === "cymbal";
  const isSnare = drum.kind === "snare";

  return (
    <button
      type="button"
      onClick={() => onTrigger(drum.id)}
      aria-label={`${drum.label} (${getDisplayKey(keyMap[drum.id])})`}
      className={`absolute focus:outline-none ${isSnare ? "z-30" : "z-20"}`}
      style={{
        left: `${drum.x}%`,
        top: `${drum.y}%`,
        width: `${drum.w}%`,
        height: `${drum.h}%`,
      }}
    >
      <motion.div
        animate={{
          scale: isActive ? 0.96 : 1,
          rotate: isActive && isCymbal ? -2 : 0,
        }}
        transition={{ duration: 0.08 }}
        className={[
          "flex h-full w-full items-center justify-center rounded-full border-2 text-center shadow-xl",
          DRUM_STYLE[drum.kind],
        ].join(" ")}
      >
        <div className="px-2 leading-tight">
          <div className="text-[clamp(11px,1.4vw,18px)] font-medium">
            {splitLabel(drum.label).map((word, index, allWords) => (
              <React.Fragment key={`${drum.id}-${word}-${index}`}>
                {word}
                {index < allWords.length - 1 ? <br /> : null}
              </React.Fragment>
            ))}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.24em] opacity-75">
            {getDisplayKey(keyMap[drum.id])}
          </div>
        </div>
      </motion.div>
    </button>
  );
}

// Render the custom bass drum shape.
function BassDrum({ isActive, keyMap, onTrigger }) {
  return (
    <button
      type="button"
      aria-label={`22 inch Bass Drum (${getDisplayKey(keyMap.kick)})`}
      onClick={() => onTrigger("kick")}
      className="absolute left-[46%] top-[63%] z-10 h-[22%] w-[34%] -translate-x-1/2 -translate-y-1/2 focus:outline-none"
    >
      <motion.div
        animate={{ scale: isActive ? 0.98 : 1 }}
        transition={{ duration: 0.08 }}
        className="relative flex h-full w-full items-center justify-center"
      >
        <div className="absolute left-[4%] top-[18%] h-[64%] w-[92%] rounded-[999px] border-2 border-zinc-300 bg-zinc-700 shadow-2xl" />

        <div className="relative z-10 text-center text-[clamp(12px,1.4vw,16px)] font-medium text-zinc-200">
          <div>
            22&quot; Bass
            <br />
            Drum
            <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-zinc-400">
              {getDisplayKey(keyMap.kick)}
            </div>
          </div>
        </div>
      </motion.div>
    </button>
  );
}

// Render the small hover/focus master volume control.
function VolumeHoverControl({ value, onChange }) {
  return (
    <div className="group absolute right-6 top-6 z-40">
      <div className="relative flex items-center justify-end">
        <button
          type="button"
          aria-label="Master volume"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/25 text-white shadow-lg backdrop-blur transition hover:bg-black/35"
        >
          <Volume2 className="h-5 w-5" />
        </button>

        <div className="pointer-events-none absolute right-0 top-12 w-56 translate-y-1 rounded-2xl border border-white/10 bg-slate-900/95 p-4 opacity-0 shadow-2xl transition duration-150 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-white">Volume</span>
            <span className="text-slate-300">{Math.round(value * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1.25}
            step={0.01}
            value={value}
            onChange={(event) => onChange(Number(event.target.value))}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}

// Render one simple row in the right-hand panel.
function KeyMapRow({ item, value, isListening, onStartRemap, onTrigger }) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 rounded-2xl border border-white/10 bg-black/20 p-3">
      <div>
        <div className="font-medium text-white">{item.label}</div>
        <div className="text-xs uppercase tracking-[0.2em] text-slate-300">{item.id}</div>
      </div>

      <button
        type="button"
        className={BUTTON_BASE}
        onClick={() => onTrigger(item.id)}
      >
        Play
      </button>

      <input
        readOnly
        value={getDisplayKey(value)}
        className="w-24 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-center text-sm text-white outline-none"
      />

      <button
        type="button"
        className={`${BUTTON_BASE} ${isListening ? "bg-white/20" : ""}`}
        onClick={() => onStartRemap(item.id)}
      >
        {isListening ? "Listening..." : "Remap"}
      </button>
    </div>
  );
}

// Simple wrapper for the big panels.
function Panel({ title, subtitle, children }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur">
      <div className="p-6 pb-0">
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        {subtitle ? <p className="mt-2 text-sm text-slate-200">{subtitle}</p> : null}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// Main app component.
export default function DrumsetLayoutApp() {
  const [keyMap, setKeyMap] = useState(loadSavedKeyMap);
  const [activeDrums, setActiveDrums] = useState({});
  const [listeningFor, setListeningFor] = useState(null);
  const [masterVolume, setMasterVolume] = useState(DEFAULT_MASTER_VOLUME);

  const { playDrum } = useSampleDrumAudio({ masterVolume });
  const activeTimersRef = useRef({});

  // Save remapped keys.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keyMap));
  }, [keyMap]);

  // Build a lookup from key -> drum id.
  const keyToDrumMap = useMemo(() => {
    const map = new Map();

    Object.entries(keyMap).forEach(([drumId, key]) => {
      if (key) map.set(key, drumId);
    });

    return map;
  }, [keyMap]);

  // Play one drum and briefly flash its UI state.
  const triggerDrum = useCallback(
    (drumId) => {
      void playDrum(drumId);

      setActiveDrums((previous) => ({
        ...previous,
        [drumId]: true,
      }));

      if (activeTimersRef.current[drumId]) {
        clearTimeout(activeTimersRef.current[drumId]);
      }

      activeTimersRef.current[drumId] = setTimeout(() => {
        setActiveDrums((previous) => ({
          ...previous,
          [drumId]: false,
        }));
      }, ACTIVE_FLASH_MS);
    },
    [playDrum],
  );

  // Handle playing keys and remapping keys.
  useEffect(() => {
    const handleKeyDown = (event) => {
      const pressedKey = normalizeKey(event.key);

      if (event.repeat) {
        event.preventDefault();
        return;
      }

      if (listeningFor) {
        event.preventDefault();

        if (pressedKey === "Escape") {
          setListeningFor(null);
          return;
        }

        setKeyMap((previous) => {
          const next = { ...previous };

          Object.keys(next).forEach((drumId) => {
            if (next[drumId] === pressedKey) {
              next[drumId] = "";
            }
          });

          next[listeningFor] = pressedKey;
          return next;
        });

        setListeningFor(null);
        return;
      }

      const drumId = keyToDrumMap.get(pressedKey);
      if (!drumId) return;

      event.preventDefault();
      triggerDrum(drumId);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keyToDrumMap, listeningFor, triggerDrum]);

  // Restore the original keyboard mapping.
  function resetDefaults() {
    setKeyMap(DEFAULT_KEY_MAP);
    setListeningFor(null);
  }

  // Remove every mapping.
  function clearAllMappings() {
    setKeyMap(Object.fromEntries(Object.keys(DEFAULT_KEY_MAP).map((key) => [key, ""])));
    setListeningFor(null);
  }

  const listeningLabel = REMAP_ITEMS.find((item) => item.id === listeningFor)?.label || "Bass Drum";

  // There is one visible hi-hat on the stage.
  // Light it up for both closed and open hi-hat hits.
  const stageActiveDrums = {
    ...activeDrums,
    hiHatClosed: Boolean(activeDrums.hiHatClosed || activeDrums.hiHatOpen),
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800 p-6 text-white">
      <VolumeHoverControl value={masterVolume} onChange={setMasterVolume} />

      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Panel
          title="Interactive Drumset Layout"
          subtitle={
            <>
              Click any piece or use your keyboard. Choose <span className="font-semibold text-white">Remap</span> to assign a new key, then press the key you want.
            </>
          }
        >
          <div className="relative mx-auto aspect-[4/3] w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/15 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.14),_rgba(255,255,255,0.03)_45%,_rgba(0,0,0,0.12)_100%)]">
            <div className="absolute inset-0">
              {DRUMS.map((drum) => (
                <DrumPiece
                  key={drum.id}
                  drum={drum}
                  isActive={Boolean(stageActiveDrums[drum.id])}
                  keyMap={keyMap}
                  onTrigger={triggerDrum}
                />
              ))}

              <BassDrum
                isActive={Boolean(activeDrums.kick)}
                keyMap={keyMap}
                onTrigger={triggerDrum}
              />
            </div>
          </div>
        </Panel>

        <Panel
          title="Key Mapping"
          subtitle={
            listeningFor
              ? `Press a key for ${listeningLabel}. Press Escape to cancel.`
              : "Mappings save in your browser automatically."
          }
        >
          <div className="space-y-3">
            {REMAP_ITEMS.map((item) => (
              <KeyMapRow
                key={item.id}
                item={item}
                value={keyMap[item.id]}
                isListening={listeningFor === item.id}
                onStartRemap={setListeningFor}
                onTrigger={triggerDrum}
              />
            ))}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                className={BUTTON_BASE}
                onClick={resetDefaults}
              >
                Reset Defaults
              </button>

              <button
                type="button"
                className={BUTTON_BASE}
                onClick={clearAllMappings}
              >
                Clear All
              </button>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
