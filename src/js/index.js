import { SCRIPT } from "./config.js";
import { getEllipseDimensions } from "./sizer.js";
import { createScaleCycleAnimation } from "./animation.js";
import { createPanelScriptLooper } from "./script-looper.js";
import { attachRadialScrub } from "./interactivity.js";

const init = () => {
  const dims = getEllipseDimensions();
  const { a, A, b, B } = dims;
  const container = document.querySelector(".container");
  const panels = Array.from(document.querySelectorAll(".panel")).map(
    (outer) => {
      const inner = outer.querySelector(".panel__inner");
      const content = inner.querySelector(".panel__content");
      return {
        outer,
        inner,
        content,
      };
    },
  );

  createScaleCycleAnimation(panels, { a, A, b, B });

  const scriptLooper = createPanelScriptLooper(panels, SCRIPT, dims);
  if (container) {
    attachRadialScrub({
      a,
      A,
      b,
      B,
      container,
      panels,
      lines: SCRIPT,
      scriptLooper,
    });
  }
};

document.addEventListener("DOMContentLoaded", init);
