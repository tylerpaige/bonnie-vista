import { SCALE_CYCLE_DURATION_MS } from "./config.js";
import {
  getScaleAnimationProgress,
  getScaleCycleAnimation,
  scaleProgressState,
} from "./animation.js";
import { applyAnimationProgressToScript } from "./script-looper.js";
import { applyPanelTransforms } from "./sizer.js";
import { wrapProgress } from "./util.js";

const maybeDebugScrub = () => {};

export const applyScrubProgress = ({ a, A, b, B, panels, progress }) => {
  const p = wrapProgress(progress);
  const anim = getScaleCycleAnimation();
  if (!anim) return;
  anim.pause();
  anim.seek(p * SCALE_CYCLE_DURATION_MS);
  scaleProgressState.p = p;
  applyPanelTransforms({ a, A, b, B, panels, progress: p });
};

export const resumeScaleAnimations = ({ a, A, b, B, panels, progress }) => {
  const p = wrapProgress(progress);
  const anim = getScaleCycleAnimation();
  if (!anim) return;
  anim.seek(p * SCALE_CYCLE_DURATION_MS);
  scaleProgressState.p = p;
  applyPanelTransforms({ a, A, b, B, panels, progress: p });
  anim.resume();
};

const shortestAngleDelta = (from, to) => {
  let d = to - from;
  if (d > Math.PI) d -= 2 * Math.PI;
  else if (d < -Math.PI) d += 2 * Math.PI;
  return d;
};

const getPointerAngle = (clientX, clientY, container) => {
  const rect = container.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  return Math.atan2(clientY - cy, clientX - cx);
};

/** Ring buffer length for flick velocity (progress is unwrapped cycles). */
const VELOCITY_MAX_SAMPLES = 24;
/** Scales measured velocity (touch often under-samples; coalesced events help). */
const MOMENTUM_GAIN = 2.2;
/** Exponential drag: v *= exp(-k*dt) — low k = heavy flywheel, long coast. */
const MOMENTUM_DRAG = 0.88;
/**
 * Linear scale loop speed (cycles/s): one full cycle per {@link SCALE_CYCLE_DURATION_MS}.
 * Hand off from inertia when |v| falls below this so motion stays continuous with playback.
 */
const MOMENTUM_STOP_VELOCITY = 1000 / SCALE_CYCLE_DURATION_MS;
/**
 * Start coast only if release speed exceeds playback; avoids ending on the first frame when
 * |v| is already below {@link MOMENTUM_STOP_VELOCITY}. Floor keeps noisy tiny input idle.
 */
const MOMENTUM_MIN_VELOCITY = Math.max(0.012, MOMENTUM_STOP_VELOCITY * 1.02);
/** Cap initial spin so a bad velocity sample cannot jump the scene. */
const MOMENTUM_MAX_VELOCITY = 4;

/**
 * Pointer drag scrubs the scale cycle: clockwise advances, counter-clockwise reverses.
 * `progress` is cumulative in full rotations (Δθ/2π). Each quarter adds a script step on
 * top of {@link getTotalScriptUpdates} at pointerdown so full loops advance the script.
 */
export const attachRadialScrub = ({
  a,
  A,
  b,
  B,
  container,
  panels,
  lines,
  scriptLooper,
}) => {
  let dragging = false;
  let lastAngle = 0;
  let progress = 0;
  /** Sequential script updates from {@link createPanelScriptLooper} at pointerdown. */
  let scrubBaseN = 0;
  /** Unwrapped cycle count at pointerdown (same units as `progress` after drag). */
  let scrubStartProgress = 0;
  /** @type {{ t: number, p: number }[]} */
  let velocitySamples = [];
  let momentumRafId = null;

  const scrubContext = () => ({
    baseN: scrubBaseN,
    startProgress: scrubStartProgress,
  });

  /** Use event time (DOMHighResTimeStamp) so coalesced pointer samples get distinct times. */
  const recordVelocitySample = (timeStamp, pValue) => {
    velocitySamples.push({ t: timeStamp, p: pValue });
    while (velocitySamples.length > VELOCITY_MAX_SAMPLES) {
      velocitySamples.shift();
    }
  };

  /**
   * Release velocity from the last segment. Must use {@link PointerEvent.timeStamp} per
   * sample — calling performance.now() in a coalesced-event loop gives identical times and
   * zero measured speed.
   */
  const estimateReleaseVelocity = () => {
    const s = velocitySamples;
    if (s.length < 2) return 0;
    const a = s[s.length - 2];
    const b = s[s.length - 1];
    const dtSec = Math.max((b.t - a.t) / 1000, 1 / 1200);
    let v = ((b.p - a.p) / dtSec) * MOMENTUM_GAIN;
    if (Math.abs(v) > MOMENTUM_MAX_VELOCITY) {
      v = Math.sign(v) * MOMENTUM_MAX_VELOCITY;
    }
    return v;
  };

  const finishScrubCommit = () => {
    scriptLooper.syncToProgress(progress, scrubContext());
    resumeScaleAnimations({ a, A, b, B, panels, progress });
    scriptLooper.resume();
  };

  const clearMomentum = () => {
    if (momentumRafId == null) return;
    cancelAnimationFrame(momentumRafId);
    momentumRafId = null;
    finishScrubCommit();
  };

  const applyScrubFrame = () => {
    const scrub = scrubContext();
    applyScrubProgress({ a, A, b, B, panels, progress });
    applyAnimationProgressToScript(panels, lines, progress, scrub);
    maybeDebugScrub(progress, scrub);
  };

  const startMomentum = (initialVelocity) => {
    let v = initialVelocity;
    let lastT = performance.now();

    const step = (now) => {
      const rawDt = (now - lastT) / 1000;
      lastT = now;
      if (rawDt <= 0) {
        momentumRafId = requestAnimationFrame(step);
        return;
      }
      const dt = Math.min(rawDt, 0.05);
      progress += v * dt;
      v *= Math.exp(-MOMENTUM_DRAG * dt);
      applyScrubFrame();

      if (Math.abs(v) < MOMENTUM_STOP_VELOCITY) {
        momentumRafId = null;
        finishScrubCommit();
        return;
      }
      momentumRafId = requestAnimationFrame(step);
    };

    momentumRafId = requestAnimationFrame(step);
  };

  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    clearMomentum();
    dragging = true;
    container.setPointerCapture(e.pointerId);
    scrubBaseN = scriptLooper.getTotalScriptUpdates();
    progress = getScaleAnimationProgress();
    scrubStartProgress = progress;
    velocitySamples = [];
    recordVelocitySample(e.timeStamp, progress);
    lastAngle = getPointerAngle(e.clientX, e.clientY, container);
    scriptLooper.pause();
    const scrub = scrubContext();
    applyScrubProgress({ a, A, b, B, panels, progress });
    applyAnimationProgressToScript(panels, lines, progress, scrub);
    maybeDebugScrub(progress, scrub);
    e.preventDefault();
  };

  const onPointerMove = (e) => {
    if (!dragging) return;
    const coalesced =
      typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [];
    const toProcess = coalesced.length > 0 ? coalesced : [e];
    for (const ev of toProcess) {
      const angle = getPointerAngle(ev.clientX, ev.clientY, container);
      const delta = shortestAngleDelta(lastAngle, angle);
      progress += delta / (2 * Math.PI);
      lastAngle = angle;
      recordVelocitySample(ev.timeStamp, progress);
    }
    const scrub = scrubContext();
    applyScrubProgress({ a, A, b, B, panels, progress });
    applyAnimationProgressToScript(panels, lines, progress, scrub);
    maybeDebugScrub(progress, scrub);
  };

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    try {
      if (e?.pointerId != null) container.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer may already be released */
    }

    const cancelled = e?.type === "pointercancel";
    const v = cancelled ? 0 : estimateReleaseVelocity();

    if (!cancelled && Math.abs(v) >= MOMENTUM_MIN_VELOCITY) {
      startMomentum(v);
      return;
    }

    finishScrubCommit();
  };

  const pointerOpts = { passive: false };
  container.addEventListener("pointerdown", onPointerDown, pointerOpts);
  container.addEventListener("pointermove", onPointerMove, pointerOpts);
  container.addEventListener("pointerup", endDrag);
  container.addEventListener("pointercancel", endDrag);
};
