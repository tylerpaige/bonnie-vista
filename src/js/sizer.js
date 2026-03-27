import { ELLIPSE_VIEWPORT_FACTOR, STARTING_ANGLE_DEGREES } from "./config.js";
import { roundTo, wrapProgress } from "./util.js";

export const getEllipseDimensions = () => ({
  a: (window.innerWidth * ELLIPSE_VIEWPORT_FACTOR) / 2,
  A: window.innerWidth,
  b: (window.innerHeight * ELLIPSE_VIEWPORT_FACTOR) / 2,
  B: window.innerHeight,
});

export const getPointAlongEllipse = ({ a, A, b, B, iteration = 0 }) => {
  const angle = (iteration % 360) * ((Math.PI) / 180) - STARTING_ANGLE_DEGREES;
  const x = (a * Math.cos(angle) + a) / A + 0.05;
  const y = (b * Math.sin(angle) + b) / B + 0.05;
  return { x, y };
};

export const pointToPositions = ({ x, y }) => {
  const topLeftScale = [x, y];
  const topRightScale = [1 - x, y];
  const bottomRightScale = [1 - x, 1 - y];
  const bottomLeftScale = [x, 1 - y];
  const inverseScales = [
    topLeftScale,
    topRightScale,
    bottomRightScale,
    bottomLeftScale,
  ].map((s) => {
    return s.map((p) => 1 / p);
  });
  const [
    topLeftInverseScale,
    topRightInverseScale,
    bottomRightInverseScale,
    bottomLeftInverseScale,
  ] = inverseScales;
  return [
    [topLeftScale, topLeftInverseScale],
    [topRightScale, topRightInverseScale],
    [bottomLeftScale, bottomLeftInverseScale],
    [bottomRightScale, bottomRightInverseScale],
  ];
};

export const pointToScales = ([scaleArr, inverseScaleArr]) => {
  return {
    scale: scaleArr.map((s) => roundTo(s, 4)).join(", "),
    inverseScale: inverseScaleArr.map((s) => roundTo(s, 4)).join(", "),
  };
};

export const getOuterScaleProductAtProgress = ({
  a,
  A,
  b,
  B,
  panelIndex,
  progress,
}) => {
  const p = wrapProgress(progress);
  const pt = getPointAlongEllipse({ a, A, b, B, iteration: p * 360 });
  const positions = pointToPositions(pt);
  const [sx, sy] = positions[panelIndex][0];
  return sx * sy;
};

export const getArgminPanelAtProgress = ({ a, A, b, B, progress }) => {
  const products = [0, 1, 2, 3].map((i) =>
    getOuterScaleProductAtProgress({ a, A, b, B, panelIndex: i, progress }),
  );
  const min = Math.min(...products);
  return products.indexOf(min);
};

export const applyPanelTransforms = ({ a, A, b, B, panels, progress }) => {
  const p = wrapProgress(progress);
  const point = getPointAlongEllipse({ a, A, b, B, iteration: p * 360 });
  const positions = pointToPositions(point);
  const scales = positions.map(pointToScales);
  panels.forEach(({ inner, outer }, index) => {
    outer.style.transform = `scale(${scales[index].scale})`;
    inner.style.transform = `scale(${scales[index].inverseScale})`;
  });
};
