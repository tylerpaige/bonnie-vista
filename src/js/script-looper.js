import { SCALE_CYCLE_DURATION_MS } from "./config.js";
import { getScaleAnimationProgress } from "./animation.js";
import { getArgminPanelAtProgress } from "./sizer.js";

/* Matches the order panels become most collapsed (min outer scale product) as angle increases. */
const PANEL_UPDATE_ORDER = [0, 1, 3, 2];

/* Initial placement uses script indices 0–3 (one per panel); the next line to assign is always index 4.
   Do not use PANEL_UPDATE_ORDER.length % lines.length — when lines.length === 4, that is 0 and repeats line 0. */
const INITIAL_SCRIPT_LINE_COUNT = 4;

const updatePanelContent = (panel, item) => {
  const contentEl =
    panel.content ?? panel.outer?.querySelector?.(".js-panel-content");
  if (!contentEl) return;

  if (item.type === "image") {
    const img = document.createElement("img");
    img.src = item.src;
    img.alt = item.alt;
    img.className = "panel__image";
    contentEl.replaceChildren(img);
    return;
  }

  const p = document.createElement("p");
  p.textContent = item.text;
  contentEl.replaceChildren(p);
};

/**
 * Total sequential script updates for scrub: base from live playback plus quarter-steps
 * crossed since pointerdown (`progress` is unwrapped cycles: Δθ/2π).
 * Each full loop adds 4 quarter steps so the script keeps advancing instead of resetting at 100%.
 */
export const totalScriptUpdatesForScrub = (baseN, startProgress, progress) => {
  const deltaQ =
    Math.floor(progress * 4) - Math.floor(startProgress * 4);
  const n = baseN + deltaQ;
  return Math.max(0, n);
};

const getScriptStateAfterUpdates = (numUpdates, lines) => {
  const lineIndexByPanel = { 0: 0, 1: 1, 2: 3, 3: 2 };
  let panelOrderIndex = 0;
  let scriptIndex = INITIAL_SCRIPT_LINE_COUNT % lines.length;
  for (let u = 0; u < numUpdates; u++) {
    const panelIndex = PANEL_UPDATE_ORDER[panelOrderIndex];
    lineIndexByPanel[panelIndex] = scriptIndex;
    panelOrderIndex = (panelOrderIndex + 1) % PANEL_UPDATE_ORDER.length;
    scriptIndex = (scriptIndex + 1) % lines.length;
  }
  return { lineIndexByPanel, panelOrderIndex, scriptIndex };
};

const applyPanelScriptState = (panels, lines, lineIndexByPanel) => {
  const visiblePanels = panels.slice(0, 4);
  for (let i = 0; i < 4; i++) {
    updatePanelContent(visiblePanels[i], lines[lineIndexByPanel[i] % lines.length]);
  }
};

/**
 * Snap panel copy while scrubbing: one script advance per quarter-turn of unwrapped progress,
 * stacked on {@link totalScriptUpdatesForScrub}'s base from the looper.
 */
export const applyAnimationProgressToScript = (
  panels,
  lines,
  progress,
  scrub,
) => {
  const baseN = scrub?.baseN ?? 0;
  const startProgress = scrub?.startProgress ?? 0;
  const n = totalScriptUpdatesForScrub(baseN, startProgress, progress);
  const { lineIndexByPanel } = getScriptStateAfterUpdates(n, lines);
  applyPanelScriptState(panels, lines, lineIndexByPanel);
};

/**
 * @param {Array<{ outer: Element }>} panels
 * @param {unknown[]} lines
 * @param {{ a: number, A: number, b: number, B: number }} dims
 */
export const createPanelScriptLooper = (panels, lines, dims) => {
  const { a, A, b, B } = dims;

  if (!panels.length || !lines.length) {
    return {
      pause: () => {},
      resume: () => {},
      syncToProgress: () => {},
      getTotalScriptUpdates: () => 0,
      destroy: () => {},
    };
  }

  const visiblePanels = panels.slice(0, 4);
  [
    [0, 0],
    [1, 1],
    [3, 2],
    [2, 3],
  ].forEach(([panelIndex, lineIdx]) => {
    const panel = visiblePanels[panelIndex];
    if (!panel) return;
    updatePanelContent(panel, lines[lineIdx % lines.length]);
  });

  let panelOrderIndex = 0;
  let scriptIndex = INITIAL_SCRIPT_LINE_COUNT % lines.length;
  const stepDurationMs = SCALE_CYCLE_DURATION_MS / 4;

  let paused = false;
  let pendingSteps = 0;
  let alive = true;
  /** Matches {@link getScriptStateAfterUpdates}(n) for live RAF updates (argmin path). */
  let totalScriptUpdates = 0;

  const scheduleStep = () => {
    if (paused) return;
    pendingSteps++;
  };

  const syncToProgress = (progress, scrub) => {
    if (!scrub) return;
    const n = totalScriptUpdatesForScrub(
      scrub.baseN,
      scrub.startProgress,
      progress,
    );
    totalScriptUpdates = n;
    const state = getScriptStateAfterUpdates(n, lines);
    panelOrderIndex = state.panelOrderIndex;
    scriptIndex = state.scriptIndex;
  };

  const rafLoop = () => {
    if (!alive) return;
    if (!paused && pendingSteps > 0) {
      const targetPanel = PANEL_UPDATE_ORDER[panelOrderIndex];
      const prog = getScaleAnimationProgress();
      if (
        getArgminPanelAtProgress({ a, A, b, B, progress: prog }) === targetPanel
      ) {
        updatePanelContent(
          visiblePanels[targetPanel],
          lines[scriptIndex % lines.length],
        );
        panelOrderIndex = (panelOrderIndex + 1) % PANEL_UPDATE_ORDER.length;
        scriptIndex = (scriptIndex + 1) % lines.length;
        pendingSteps--;
        totalScriptUpdates++;
      }
    }
    requestAnimationFrame(rafLoop);
  };
  requestAnimationFrame(rafLoop);

  let intervalId = null;
  const initialDelayId = window.setTimeout(() => {
    scheduleStep();
    intervalId = window.setInterval(scheduleStep, stepDurationMs);
  }, stepDurationMs * 2);

  return {
    pause: () => {
      paused = true;
    },
    resume: () => {
      paused = false;
    },
    syncToProgress,
    getTotalScriptUpdates: () => totalScriptUpdates,
    destroy: () => {
      alive = false;
      window.clearTimeout(initialDelayId);
      if (intervalId !== null) window.clearInterval(intervalId);
    },
  };
};
