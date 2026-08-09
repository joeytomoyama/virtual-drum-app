// React hooks:
// - useEffect: run/clean up the animation when the groove changes
// - useMemo: avoid recalculating groove events unnecessarily
// - useRef: store the running Motion animation instance
// - useState: track which groove is selected and whether playback is paused
import { useEffect, useMemo, useRef, useState } from "react";

// Icons used in the UI
import {
  ChevronDown,
  Music2,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";

// Motion:
// - animate() lets us animate a MotionValue manually
// - motion.div gives us animated div elements
// - useMotionValue() stores the scrolling x-position efficiently
// - useMotionValueEvent lets us react to the scroll position as it changes
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
} from "motion/react";

// shadcn dropdown menu components
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Our groove definitions
import { grooves } from "./grooves.js";

const MotionDiv = motion.div;

/**
 * Labels shown inside each scrolling note.
 *
 * These match the current keyboard bindings used by the drum app.
 */
const TRACK_LABELS = {
  kick: "▁",
  snare: "S",
  hihat: "A",
};

const TRACK_KEY_MAP = {
  kick: " ",
  snare: "S",
  hihat: "A",
};

const HIT_LINE_OFFSET = 16;
const HIT_TOLERANCE_PX = 120;

/**
 * Vertical position of each drum lane.
 *
 * These percentages are relative to the scrolling area's height.
 *
 * Hi-hat is near the top,
 * snare in the middle,
 * kick near the bottom.
 */
const TRACK_POSITIONS = {
  hihat: "20%",
  snare: "50%",
  kick: "80%",
};

/**
 * Converts the groove's track arrays into a simpler list of note events.
 *
 * Our groove data looks roughly like:
 *
 * tracks: {
 *   kick:  [1, 0, 0, 0, ...],
 *   snare: [0, 0, 0, 0, ...],
 *   hihat: [1, 0, 1, 0, ...],
 * }
 *
 * But rendering is easier if we turn that into:
 *
 * [
 *   {
 *     track: "kick",
 *     stepIndex: 0,
 *     label: "K"
 *   },
 *   ...
 * ]
 */
function getGrooveEvents(groove) {
  const events = [];

  // Loop over each track:
  // "kick", "snare", "hihat"
  Object.entries(groove.tracks).forEach(([track, steps]) => {
    // Loop over all 16 subdivision positions
    steps.forEach((isActive, stepIndex) => {
      // 0 means there is no note at this position
      if (!isActive) {
        return;
      }

      // 1 means there is a note here,
      // so create an event for React to render.
      events.push({
        // Unique ID for this event
        id: `${track}-${stepIndex}`,

        // Which drum this belongs to
        track,

        // The letter shown visually
        label: TRACK_LABELS[track] ?? track[0].toUpperCase(),

        // Position inside the 16-step pattern
        stepIndex,
      });
    });
  });

  return events;
}

/**
 * Responsible for:
 *
 * - rendering the drum lanes
 * - rendering the scrolling notes
 * - moving the entire pattern horizontally
 * - play / pause
 * - restarting
 */
function ScrollingGroove({ groove }) {
  /**
   * Holds the active Motion animation object.
   *
   * We use a ref instead of state because changing this value
   * should NOT cause React to re-render.
   */
  const animationRef = useRef(null);

  /**
   * This is the horizontal position of the entire scrolling strip.
   *
   * A MotionValue can update many times per second without causing
   * React to re-render on every frame.
   *
   * This is one reason Motion works well for animation.
   */
  const x = useMotionValue(0);

  /**
   * This state is only used for the button UI.
   *
   * true  -> show "Pause"
   * false -> show "Play"
   */
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeTargetId, setActiveTargetId] = useState(null);
  const [feedbackState, setFeedbackState] = useState({});

  /**
   * Convert the selected groove into renderable note events.
   *
   * useMemo means this is only recalculated when the groove changes.
   */
  const events = useMemo(() => getGrooveEvents(groove), [groove]);

  /**
   * Figure out how many steps are in one bar.
   *
   * For our current grooves:
   *
   * timeSignature[0] = 4 beats
   * stepsPerQuarter = 4 subdivisions per beat
   *
   * 4 × 4 = 16 total steps
   */
  const stepCount =
    groove.timeSignature[0] * groove.stepsPerQuarter;

  /**
   * Distance between each subdivision on screen.
   *
   * Increase this if you want notes spaced farther apart.
   */
  const pixelsPerStep = 88;

  /**
   * Total pixel width of one full groove pattern.
   *
   * Example:
   *
   * 16 steps × 88 pixels = 1408px
   */
  const patternWidth = stepCount * pixelsPerStep;

  /**
   * How long one subdivision lasts.
   *
   * Example:
   *
   * BPM = 120
   *
   * One quarter note:
   * 60 / 120 = 0.5 seconds
   *
   * We have 4 subdivisions per quarter:
   * 0.5 / 4 = 0.125 seconds per step
   */
  const secondsPerStep =
    60 / groove.bpm / groove.stepsPerQuarter;

  /**
   * How many seconds one complete groove takes.
   *
   * 16 steps × duration of each step
   */
  const loopDuration = stepCount * secondsPerStep;

  useMotionValueEvent(x, "change", (latestValue) => {
    if (!events.length) {
      setActiveTargetId(null);
      return;
    }

    const nearestTarget = events.reduce((bestMatch, eventItem) => {
      const noteLeft =
        eventItem.stepIndex * pixelsPerStep + pixelsPerStep / 2;
      const distance = Math.abs(noteLeft + latestValue - HIT_LINE_OFFSET);

      if (!bestMatch || distance < bestMatch.distance) {
        return { eventItem, distance };
      }

      return bestMatch;
    }, null);

    if (
      !nearestTarget ||
      nearestTarget.distance > HIT_TOLERANCE_PX
    ) {
      setActiveTargetId(null);
      return;
    }

    setActiveTargetId(nearestTarget.eventItem.id);
  });

  useEffect(() => {
    const handleKeyDown = (event) => {
      const pressedKey =
        event.code === "Space" || event.key === " "
          ? " "
          : event.key?.toUpperCase?.() ?? "";

      if (!pressedKey || pressedKey.length > 1 || !activeTargetId) {
        return;
      }

      event.preventDefault();

      const targetEvent = events.find(({ id }) => id === activeTargetId);
      if (!targetEvent) {
        return;
      }

      const isCorrect = TRACK_KEY_MAP[targetEvent.track] === pressedKey;
      const feedbackId = targetEvent.id;

      setFeedbackState((prev) => ({
        ...prev,
        [feedbackId]: isCorrect ? "correct" : "wrong",
      }));

      window.setTimeout(() => {
        setFeedbackState((prev) => {
          const next = { ...prev };
          delete next[feedbackId];
          return next;
        });
      }, 500);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTargetId, events]);

  /**
   * Start the scrolling animation.
   *
   * This runs whenever values such as BPM or pattern width change.
   */
  useEffect(() => {
    /**
     * Put the pattern back at its starting position.
     *
     * Important:
     *
     * x.set() updates the MotionValue directly.
     * It does NOT trigger a normal React render.
     */
    x.set(0);

    /**
     * Animate the entire strip from:
     *
     * x = 0
     *
     * to:
     *
     * x = -patternWidth
     *
     * Negative x means move left.
     */
    const animation = animate(x, -patternWidth, {
      /**
       * The duration is calculated from BPM,
       * so faster grooves scroll faster.
       */
      duration: loopDuration,

      /**
       * "linear" means constant speed.
       *
       * This is important for rhythm-style scrolling.
       * We don't want notes accelerating or slowing down.
       */
      ease: "linear",

      /**
       * Loop forever.
       */
      repeat: Infinity,

      /**
       * After reaching the end,
       * immediately start again from the beginning.
       */
      repeatType: "loop",
    });

    /**
     * Store the animation object so our buttons
     * can pause(), play(), or stop() it later.
     */
    animationRef.current = animation;

    /**
     * Cleanup function.
     *
     * React calls this when:
     *
     * - the component unmounts
     * - the selected groove changes
     * - one of the effect dependencies changes
     *
     * This prevents an old animation from continuing to run.
     */
    return () => {
      animation.stop();
      animationRef.current = null;
    };
  }, [loopDuration, patternWidth, x]);

  /**
   * Called when the user clicks Play / Pause.
   */
  const togglePlayback = () => {
    const animation = animationRef.current;

    // If there is no active animation for some reason,
    // there is nothing to control.
    if (!animation) {
      return;
    }

    if (isPlaying) {
      /**
       * Pause exactly where the animation currently is.
       */
      animation.pause();

      /**
       * Update the button UI.
       */
      setIsPlaying(false);

      return;
    }

    /**
     * Continue from the exact point where it was paused.
     */
    animation.play();

    /**
     * Update the button UI.
     */
    setIsPlaying(true);
  };

  /**
   * Restart the groove from the beginning.
   */
  const restart = () => {
    /**
     * Stop the currently running animation.
     */
    animationRef.current?.stop();

    /**
     * Move the strip back to the starting point.
     */
    x.set(0);

    /**
     * Create a fresh animation.
     */
    animationRef.current = animate(x, -patternWidth, {
      duration: loopDuration,
      ease: "linear",
      repeat: Infinity,
      repeatType: "loop",
    });

    /**
     * Restart always means we're playing again.
     */
    setIsPlaying(true);
  };

  return (
    /**
     * Main scrolling-groove area.
     *
     * min-h-80 gives it enough vertical space
     * for the three drum lanes.
     */
    <div className="flex h-full min-h-60 flex-col">
      {/* Playback controls */}
      <div className="flex items-center justify-end gap-2 px-3 py-2">
        {/* Restart button */}
        <button
          type="button"
          onClick={restart}
          aria-label="Restart groove"
          className="grid size-10 place-items-center rounded-full border border-white/10 bg-black/20 text-white transition hover:bg-white/10 active:scale-95"
        >
          <RotateCcw className="size-4" />
        </button>

        {/* Play / Pause button */}
        <button
          type="button"
          onClick={togglePlayback}
          aria-label={isPlaying ? "Pause groove" : "Play groove"}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 active:scale-95"
        >
          {/* Change the icon based on playback state */}
          {isPlaying ? (
            <Pause className="size-4" />
          ) : (
            <Play className="size-4" />
          )}

          {/* Change the text too */}
          {isPlaying ? "Pause" : "Play"}
        </button>
      </div>

      {/*
       * Actual scrolling area.
       *
       * overflow-hidden is important:
       * anything outside this box becomes invisible.
       */}
      <div className="relative flex-1 overflow-hidden">
        {/*
         * Horizontal separator lines.
         *
         * These visually divide the three drum lanes.
         */}
        <div className="absolute inset-x-0 top-1/3 border-t border-white/10" />
        <div className="absolute inset-x-0 top-2/3 border-t border-white/10" />

        {/*
         * Hit line.
         *
         * Notes move from right to left and eventually cross this line.
         */}
        <div className="absolute bottom-3 left-28 top-3 z-10 w-px bg-cyan-300/80 shadow-[0_0_18px_rgba(103,232,249,0.8)]">
          <span className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-cyan-300 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-950">
            Hit
          </span>
        </div>

        {/*
         * Gradient on the left edge.
         *
         * Makes notes fade visually as they exit.
         */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-24 bg-linear-to-r from-slate-950 to-transparent" />

        {/*
         * Gradient on the right edge.
         *
         * Makes notes fade visually as they enter.
         */}
        <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-24 bg-linear-to-l from-slate-950 to-transparent" />

        {/*
         * THIS is the element that actually scrolls.
         *
         * style={{ x }}
         *
         * connects the MotionValue to this div's horizontal transform.
         *
         * Instead of moving every note individually,
         * we move ONE parent containing all the notes.
         *
         * This is much simpler and more efficient.
         */}
        <motion.div
          style={{ x }}
          className="absolute inset-y-0 left-24 flex"
        >
          {/*
           * Render two identical copies of the groove.
           *
           * Why?
           *
           * Copy 1:
           * [ groove ]
           *
           * Copy 2:
           *          [ groove ]
           *
           * As the first one moves off-screen,
           * the second is already following it.
           *
           * This avoids an empty gap while looping.
           */}
          {[0, 1].map((copyIndex) => (
            <div
              key={copyIndex}
              className="relative shrink-0"
              style={{ width: patternWidth }}
              /**
               * The second copy is only visual,
               * so screen readers can ignore it.
               */
              aria-hidden={copyIndex === 1}
            >
              {/*
               * Draw one vertical guide line for every subdivision.
               *
               * With a 16-step groove, this generates 16 guide lines.
               */}
              {Array.from({ length: stepCount }).map(
                (_, stepIndex) => (
                  <div
                    key={stepIndex}
                    className="absolute bottom-0 top-0 border-l border-white/4"
                    style={{
                      /**
                       * Position each guide:
                       *
                       * step 0 -> 0px
                       * step 1 -> 88px
                       * step 2 -> 176px
                       * etc.
                       */
                      left: stepIndex * pixelsPerStep,
                    }}
                  >
                    {/*
                     * Currently displays raw step numbers.
                     *
                     * Later you could replace this with:
                     *
                     * 1 e & a 2 e & a ...
                     */}
                    <span className="absolute bottom-3 -translate-x-1/2 text-[10px] text-white/30">
                      {stepIndex + 1}
                    </span>
                  </div>
                ),
              )}

              {/*
               * Render all actual drum notes.
               */}
              {events.map((event) => (
                <MotionDiv
                  /**
                   * The copy index is included because we render
                   * every note twice.
                   */
                  key={`${copyIndex}-${event.id}`}

                  /**
                   * Small entrance animation:
                   *
                   * start slightly smaller and invisible
                   */
                  initial={{
                    opacity: 0,
                    scale: 0.75,
                  }}

                  /**
                   * animate to normal appearance
                   */
                  animate={{
                    opacity: 1,
                    scale: 1,
                  }}

                  /**
                   * Small stagger based on the note's position.
                   *
                   * Purely cosmetic.
                   */
                  transition={{
                    delay: event.stepIndex * 0.025,
                    duration: 0.2,
                  }}

                  /**
                   * Slightly enlarge notes when hovered.
                   *
                   * Also purely cosmetic.
                   */
                  whileHover={{
                    scale: 1.12,
                  }}

                  className={`absolute grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl border text-lg font-bold text-white shadow-lg backdrop-blur-sm transition-colors duration-200 ${
                    feedbackState[event.id] === "correct"
                      ? "border-emerald-400/80 bg-emerald-500/90 shadow-[0_0_16px_rgba(74,222,128,0.35)]"
                      : feedbackState[event.id] === "wrong"
                        ? "border-rose-400/80 bg-rose-500/90 shadow-[0_0_16px_rgba(248,113,113,0.35)]"
                        : "border-white/15 bg-white/10"
                  }`}

                  style={{
                    /**
                     * Horizontal note position.
                     *
                     * Each event knows which subdivision it belongs to.
                     *
                     * Example:
                     *
                     * step 4 × 88px = 352px
                     *
                     * We add half a step so the note sits
                     * in the center of its column.
                     */
                    left:
                      event.stepIndex * pixelsPerStep +
                      pixelsPerStep / 2,

                    /**
                     * Vertical lane:
                     *
                     * hihat -> 20%
                     * snare -> 50%
                     * kick  -> 80%
                     */
                    top: TRACK_POSITIONS[event.track],
                  }}
                >
                  {/* K, S, or H */}
                  {event.label}
                </MotionDiv>
              ))}
            </div>
          ))}
        </motion.div>

        {/*
         * Static labels on the left side.
         *
         * These don't move with the groove.
         */}
        <div className="pointer-events-none absolute left-4 top-[20%] -translate-y-1/2 text-xs font-medium text-white/40">
          Hi-hat
        </div>

        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-medium text-white/40">
          Snare
        </div>

        <div className="pointer-events-none absolute left-4 top-[80%] -translate-y-1/2 text-xs font-medium text-white/40">
          Kick
        </div>
      </div>
    </div>
  );
}

/**
 * TopSection is the outer component.
 *
 * Its main jobs are:
 *
 * 1. remember which groove is selected
 * 2. display the groove dropdown
 * 3. render ScrollingGroove with that groove
 */
export default function TopSection({ className = "" }) {
  /**
   * Default to the first groove in our grooves array.
   */
  const [selectedGroove, setSelectedGroove] = useState(grooves[0]);

  return (
    <section
      className={`relative w-full overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl ${className}`}
    >
      {/*
       * Groove selector.
       *
       * z-30 keeps it above the animation and gradients.
       */}
      <div className="absolute left-4 top-4 z-30">
        <DropdownMenu>
          {/*
           * Button that opens the dropdown.
           */}
          <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-2 text-xs font-medium text-white shadow-lg transition hover:bg-black/50 focus:outline-none">
            <Music2 className="size-3.5" />

            {/* Show the currently selected groove */}
            {selectedGroove.name}

            <ChevronDown className="size-3.5 opacity-80" />
          </DropdownMenuTrigger>

          {/*
           * Popup menu contents.
           */}
          <DropdownMenuContent className="min-w-52">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Grooves</DropdownMenuLabel>

              <DropdownMenuSeparator />

              {/*
               * Create one dropdown item for every groove.
               */}
              {grooves.map((groove) => (
                <DropdownMenuItem
                  key={groove.id}

                  /**
                   * Selecting an item updates React state.
                   *
                   * That causes TopSection to re-render
                   * with the newly selected groove.
                   */
                  onSelect={() => setSelectedGroove(groove)}
                >
                  <span className="flex flex-col">
                    {/* Groove name */}
                    <span>{groove.name}</span>

                    {/* Extra groove information */}
                    <span className="text-xs text-slate-400">
                      {groove.bpm} BPM ·{" "}
                      {groove.timeSignature[0]}/
                      {groove.timeSignature[1]}
                    </span>
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/*
       * The key is intentional.
       *
       * When selectedGroove.id changes,
       * React destroys the old ScrollingGroove
       * and creates a completely fresh one.
       *
       * That means switching grooves naturally resets:
       *
       * - x position
       * - animation
       * - play state
       *
       * without needing extra synchronization code.
       */}
      <ScrollingGroove
        key={selectedGroove.id}
        groove={selectedGroove}
      />
    </section>
  );
}