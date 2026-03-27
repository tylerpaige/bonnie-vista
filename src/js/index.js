const roundTo = (number, numOfDecPlaces = 2) => {
  const power = Math.pow(10, numOfDecPlaces);
  return Math.round(number * power) / power;
};

const a = window.innerWidth * 0.9 / 2;
const A = window.innerWidth;
const b = window.innerHeight * 0.9 / 2;
const B = window.innerHeight;

const getPointAlongEllipse = (iteration = 0) => {
  /*
    (h, k) = center
    a = horizontal radius
    b = vertical radius
  */
  const angle = (iteration % 360) * (Math.PI / 180);
  const x = (a * Math.cos(angle) + a) / A + 0.05;
  const y = (b * Math.sin(angle) + b) / B + 0.05;
  return {
    x, 
    y
  };
};

const pointToPositions = ({ x, y }) => {
  const topLeftScale = [x, y];
  const topRightScale = [(1 - x), y];
  const bottomRightScale = [1 - x, (1 - y)];
  const bottomLeftScale = [x, (1 - y)];
  const inverseScales = [
    topLeftScale,
    topRightScale,
    bottomRightScale,
    bottomLeftScale
  ].map(s => {
    return s.map(p => 1 / p);
  });
  const [
    topLeftInverseScale,
    topRightInverseScale,
    bottomRightInverseScale,
    bottomLeftInverseScale
  ] = inverseScales;
  return [
    [
      topLeftScale,
      topLeftInverseScale
    ],
    [
      topRightScale,
      topRightInverseScale
    ],
    [
      bottomLeftScale,
      bottomLeftInverseScale
    ],
    [
      bottomRightScale,
      bottomRightInverseScale
    ]
  ]
};

const pointToScales = ([scaleArr, inverseScaleArr]) => {
  return {
    scale : scaleArr.map(s => roundTo(s, 4)).join(', '),
    inverseScale : inverseScaleArr.map(s => roundTo(s, 4)).join(', ')
  };
}

let RAF;
let LOOPING = true;
let INTERVAL = 1000 / 60;

const animate = (panels, iteration = 0) => {
  // debugger;
  const point = getPointAlongEllipse(iteration);
  const positions = pointToPositions(point);
  const scales = positions.map(pointToScales);
  
  requestAnimationFrame(() => {
    panels.forEach(({inner, outer}, index) => {
      outer.style.transform = `scale(${scales[index].scale})`;
      inner.style.transform = `scale(${scales[index].inverseScale})`;
    })
  })

  if (LOOPING) {
    setTimeout(() => {
      animate(panels, iteration + 1);
    }, INTERVAL);
  }
};

const keyframesToAnimationDefinition = (name, keyframes) => {
  return `@keyframes ${name} { ${keyframes} }`
};

const constructCSSAnimations = () => {
  const numberOfKeyframes = 100;
  const baseObject = Array.from({ length : 4 }).map((_, index) => {
    return {
      outerAnimationName : `scale${index}outer`,
      innerAnimationName : `scale${index}inner`,
      outerKeyframes : '',
      innerKeyframes : ''
    }
  });
  const keyframes = Array.from({ length : numberOfKeyframes})
    .reduce((acc, _, keyframeIndex) => {
      const percentageValue = roundTo(keyframeIndex / (numberOfKeyframes - 1) * 100, 0);
      const point = getPointAlongEllipse(keyframeIndex / numberOfKeyframes * 360);
      const points = pointToPositions(point);
      const scales = points.map(pointToScales);
      scales.forEach(({ scale, inverseScale }, scaleIndex) => {
        acc[scaleIndex].outerKeyframes += `${percentageValue}% { transform: scale(${scale}); }`;
        acc[scaleIndex].innerKeyframes += `${percentageValue}% { transform: scale(${inverseScale}); }`;
      });
      return acc;
    }, baseObject);
  const animationCSS = keyframes.map((config) => {
    const outerAnimation = keyframesToAnimationDefinition(config.outerAnimationName, config.outerKeyframes);
    const innerAnimation = keyframesToAnimationDefinition(config.innerAnimationName, config.innerKeyframes);
    return outerAnimation + innerAnimation;
  }).join('');
  const style = document.createElement('style');
  style.innerHTML = animationCSS;
  document.body.appendChild(style);

}


const ensureStylesheet = () => {
  const existing = document.querySelector('link[data-rotating-windows-style="true"]');
  if (existing) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './style.css';
  link.setAttribute('data-rotating-windows-style', 'true');
  document.head.appendChild(link);
};

const init = () => {
  ensureStylesheet();
  const panels = Array.from(document.querySelectorAll('.panel')).map(outer => {
    const inner = outer.querySelector('.panel__inner');
    return {
      outer,
      inner
    };
  });
  // animate(panels);
  constructCSSAnimations()
};

document.addEventListener('DOMContentLoaded', init);