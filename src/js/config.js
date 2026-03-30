/**
 * Look & feel: copy, imagery, layout tuning, and presentation timing.
 */
export const SCRIPT = [
  { type: "text", text: "It is my opinion that" },
  { type: "text", text: "shaking an 8-ball" },
  { type: "text", text: "should produce" },
  { type: "text", text: "a legally binding contract" },
  { type: "text", text: "with destiny." },
  { type: "text", text: "Next right" },
  { type: "text", text: "Exit 8" },
  { type: "text", text: "Drive-thru Clairvoyant" },
  { type: "text", text: "“A medium on the double!”" },
  { type: "text", text: "Miss Bonnie Vista" },
  {
    type: "image",
    src: "./images/bonnie-vista.jpg",
    alt: "Bonnie Vista billboard",
  },
  { type: "text", text: "" },
];

/** Fraction of viewport used for the ellipse radii (visual weight of the layout). */
export const ELLIPSE_VIEWPORT_FACTOR = 0.9;

/** Duration of one full panel scale cycle (ms). */
export const SCALE_CYCLE_DURATION_MS = 10000;

export const STARTING_ANGLE_DEGREES = 0;

/** Ring buffer length for flick velocity (progress is unwrapped cycles). */
export const VELOCITY_MAX_SAMPLES = 24;
/** Scales measured velocity (touch often under-samples; coalesced events help). */
export const MOMENTUM_GAIN = 2.2;
/** Exponential drag: v *= exp(-k*dt) — low k = heavy flywheel, long coast. */
export const MOMENTUM_DRAG = 0.88;
/**
 * Linear scale loop speed (cycles/s): one full cycle per {@link SCALE_CYCLE_DURATION_MS}.
 * Hand off from inertia when |v| falls below this so motion stays continuous with playback.
 */
export const MOMENTUM_STOP_VELOCITY = 1000 / SCALE_CYCLE_DURATION_MS;
/**
 * Start coast only if release speed exceeds playback; avoids ending on the first frame when
 * |v| is already below {@link MOMENTUM_STOP_VELOCITY}. Floor keeps noisy tiny input idle.
 */
export const MOMENTUM_MIN_VELOCITY = Math.max(
  0.012,
  MOMENTUM_STOP_VELOCITY * 1.02,
);
/** Cap initial spin so a bad velocity sample cannot jump the scene. */
export const MOMENTUM_MAX_VELOCITY = 4;
