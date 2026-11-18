// @ts-check
// Plinko payout tables, rules version "rh1". Multipliers in hundredths
// (150 is 1.5x), each table kept as its edge-to-centre half and mirrored.

export const version = "rh1";

/** @type {Record<number, Record<string, number[]>>} */
const HALVES = {
  8: { low: [550, 280, 150, 70, 50], medium: [1200, 420, 140, 50, 40], high: [3000, 600, 110, 20, 20] },
  9: { low: [600, 320, 200, 100, 50], medium: [1700, 610, 200, 70, 40], high: [4500, 970, 220, 20, 20] },
  10: { low: [850, 440, 250, 110, 70, 50], medium: [2400, 860, 290, 110, 40, 40], high: [8000, 1500, 310, 60, 20, 20] },
  11: { low: [900, 530, 280, 160, 90, 50], medium: [2600, 1100, 400, 160, 60, 40], high: [12500, 2600, 510, 100, 20, 20] },
  12: {
    low: [1100, 610, 350, 210, 110, 60, 50],
    medium: [3500, 1400, 560, 230, 90, 40, 40],
    high: [18000, 3800, 830, 180, 40, 20, 20],
  },
  13: {
    low: [900, 570, 380, 230, 140, 90, 50],
    medium: [4500, 1800, 770, 320, 130, 50, 40],
    high: [27000, 6500, 1500, 360, 20, 20, 20],
  },
  14: {
    low: [800, 540, 350, 260, 160, 110, 70, 50],
    medium: [6000, 2500, 1000, 440, 190, 70, 40, 40],
    high: [43000, 9800, 2200, 510, 110, 20, 20, 20],
  },
  15: {
    low: [1400, 870, 550, 330, 210, 130, 80, 50],
    medium: [9000, 3700, 1500, 630, 260, 100, 40, 40],
    high: [64000, 15100, 3600, 860, 200, 20, 20, 20],
  },
  16: {
    low: [1700, 1000, 650, 410, 250, 150, 100, 60, 50],
    medium: [12000, 4900, 2000, 840, 350, 140, 60, 40, 40],
    high: [100000, 23500, 5600, 1300, 300, 70, 20, 20, 20],
  },
};

export const ROWS = [8, 9, 10, 11, 12, 13, 14, 15, 16];
export const RISKS = ["low", "medium", "high"];

/**
 * The full table in hundredths, slot 0 (all left) to slot `rows`.
 * @param {number} rows
 * @param {string} risk
 * @returns {number[]}
 */
export function table(rows, risk) {
  const half = HALVES[rows]?.[risk];
  if (!half) throw new RangeError(`no Plinko table for ${rows} rows, risk ${risk}`);
  const mirror = rows % 2 === 1 ? [...half].reverse() : half.slice(0, -1).reverse();
  return [...half, ...mirror];
}
