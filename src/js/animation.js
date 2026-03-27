import { animate } from "animejs";
import { SCALE_CYCLE_DURATION_MS } from "./config.js";
import { applyPanelTransforms } from "./sizer.js";
import { wrapProgress } from "./util.js";

export const scaleProgressState = { p: 0 };

let scaleCycleAnimation = null;

export const getScaleCycleAnimation = () => scaleCycleAnimation;

export const getScaleAnimationProgress = () => {
  return wrapProgress(scaleProgressState.p);
};

export const createScaleCycleAnimation = (panels, { a, A, b, B }) => {
  const anim = animate(scaleProgressState, {
    p: 1,
    duration: SCALE_CYCLE_DURATION_MS,
    ease: "linear",
    loop: true,
    onUpdate: () => {
      applyPanelTransforms({
        a,
        A,
        b,
        B,
        panels,
        progress: scaleProgressState.p,
      });
    },
  });
  scaleCycleAnimation = anim;
  applyPanelTransforms({ a, A, b, B, panels, progress: 0 });
  return anim;
};
