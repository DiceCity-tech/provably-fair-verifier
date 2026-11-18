// @ts-check
// Cases prize tables, rules version "c1": [multiplier in hundredths, weight
// out of 100,000], lowest prize first (the order tickets walk).

/** @type {Record<string, [number, number][]>} */
export const TABLES = {
  easy: [[40, 30000], [80, 25000], [120, 25000], [150, 15000], [200, 4000], [500, 900], [2000, 100]],
  medium: [[0, 24250], [30, 30000], [120, 30000], [200, 12000], [400, 3000], [1000, 600], [5000, 120], [20000, 30]],
  hard: [[0, 66346], [50, 15000], [200, 12250], [500, 5000], [1500, 1200], [10000, 200], [100000, 4]],
  expert: [[0, 82229], [200, 15000], [1000, 2400], [5000, 300], [25000, 60], [100000, 10], [500000, 1]],
};
