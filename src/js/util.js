export const roundTo = (number, numOfDecPlaces = 2) => {
  const power = Math.pow(10, numOfDecPlaces);
  return Math.round(number * power) / power;
};

export const wrapProgress = (p) => ((p % 1) + 1) % 1;
