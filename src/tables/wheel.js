// @ts-check
// Wheel layouts, rules version "w1". Multipliers in hundredths, by risk then
// number of segments, in wheel order.

const LOW10 = [150, 120, 120, 120, 0, 120, 120, 120, 120, 0];
const MEDIUM10 = [0, 190, 0, 150, 0, 200, 0, 150, 0, 300];

/** @param {number[]} list @param {number} times */
const repeat = (list, times) => Array.from({ length: times }, () => list).flat();

export const SEGMENTS = [10, 20, 30, 40, 50];
export const RISKS = ["low", "medium", "high"];

/** @type {Record<string, Record<number, number[]>>} */
export const TABLES = {
  low: { 10: LOW10, 20: repeat(LOW10, 2), 30: repeat(LOW10, 3), 40: repeat(LOW10, 4), 50: repeat(LOW10, 5) },
  medium: {
    10: MEDIUM10,
    20: [150, 0, 200, 0, 200, 0, 200, 0, 150, 0, 300, 0, 180, 0, 200, 0, 200, 0, 200, 0],
    30: [150, 0, 150, 0, 200, 0, 150, 0, 200, 0, 200, 0, 150, 0, 300, 0, 150, 0, 200, 0, 200, 0, 170, 0, 400, 0, 150, 0, 200, 0],
    40: [
      200, 0, 300, 0, 200, 0, 150, 0, 300, 0, 150, 0, 150, 0, 200, 0, 150, 0, 300, 0,
      150, 0, 200, 0, 200, 0, 160, 0, 200, 0, 150, 0, 300, 0, 150, 0, 200, 0, 150, 0,
    ],
    50: [
      200, 0, 150, 0, 200, 0, 150, 0, 300, 0, 150, 0, 200, 0, 150, 0, 200, 0, 200, 0, 150, 0, 200, 0, 450,
      0, 200, 0, 150, 0, 200, 0, 150, 0, 300, 0, 200, 0, 200, 0, 150, 0, 200, 0, 150, 0, 200, 0, 150, 0,
    ],
  },
  // High risk: every segment pays nothing except the last, which pays 0.99 x segments.
  high: Object.fromEntries(SEGMENTS.map((s) => [s, [...Array(s - 1).fill(0), 99 * s]])),
};
