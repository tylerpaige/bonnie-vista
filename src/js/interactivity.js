import { SCALE_CYCLE_DURATION_MS } from "./config.js";
import {
  getScaleAnimationProgress,
  getScaleCycleAnimation,
  scaleProgressState,
} from "./animation.js";
import { applyAnimationProgressToScript } from "./script-looper.js";
import { applyPanelTransforms } from "./sizer.js";
import { wrapProgress } from "./util.js";

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

/**
 * Pointer drag scrubs the scale cycle: clockwise advances, counter-clockwise reverses.
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

  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    dragging = true;
    container.setPointerCapture(e.pointerId);
    progress = getScaleAnimationProgress();
    lastAngle = getPointerAngle(e.clientX, e.clientY, container);
    scriptLooper.pause();
    applyScrubProgress({ a, A, b, B, panels, progress });
    applyAnimationProgressToScript(panels, lines, progress);
    e.preventDefault();
  };

  const onPointerMove = (e) => {
    if (!dragging) return;
    const angle = getPointerAngle(e.clientX, e.clientY, container);
    const delta = shortestAngleDelta(lastAngle, angle);
    progress += delta / (2 * Math.PI);
    lastAngle = angle;
    applyScrubProgress({ a, A, b, B, panels, progress });
    applyAnimationProgressToScript(panels, lines, progress);
  };

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    try {
      container.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer may already be released */
    }
    scriptLooper.syncToProgress(progress);
    resumeScaleAnimations({ a, A, b, B, panels, progress });
    scriptLooper.resume();
  };

  container.addEventListener("pointerdown", onPointerDown);
  container.addEventListener("pointermove", onPointerMove);
  container.addEventListener("pointerup", endDrag);
  container.addEventListener("pointercancel", endDrag);
};
