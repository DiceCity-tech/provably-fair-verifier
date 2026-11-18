// @ts-check
// Darts boards, rules version "t1": [multiplier in hundredths, weight out of
// 100,000], from the outside in (the bullseye last, the order tickets walk).

/** @type {Record<string, [number, number][]>} */
export const TABLES = {
  low: [[0, 2480], [40, 40000], [120, 30000], [150, 20000], [200, 7000], [500, 500], [2500, 20]],
  medium: [[0, 39420], [50, 30000], [150, 20000], [300, 8000], [600, 2000], [2000, 500], [10000, 80]],
  high: [[0, 74282], [200, 20000], [500, 5000], [2500, 600], [10000, 100], [50000, 18]],
};
