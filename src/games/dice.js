// @ts-check
// Dice: roll = floor(n0 * 10001 / 2^32), 0..10000 in hundredths (0.00 to
// 100.00). "over" wins when the roll is above the target, "under" when it is
// below; a roll equal to the target loses. Win chance in hundredths of a
// percent: 10000 - target (over) or target (under), 1 to 9800. A win pays
// floor(99,000,000 / chance) ten-thousandths (99 / chance%).

import { ints, scale } from "../stream.js";
import { int, oneOf, need } from "../params.js";

export const id = "dice";
export const name = "Dice";
export const rulesVersion = "d1";

/** @param {any} p */
export function parseParams(p) {
  const target = int(p?.target, 0, 10000, "target (hundredths)");
  const condition = oneOf(p?.condition, ["over", "under"], "condition");
  const chance = condition === "over" ? 10000 - target : target;
  need(chance >= 1 && chance <= 9800, "win chance must be 0.01% to 98%");
  return { target, condition };
}

/** @param {string} s @param {string} c @param {number|bigint} nonce @param {any} params */
export async function outcome(s, c, nonce, params) {
  const { target, condition } = parseParams(params);
  const [n] = await ints(s, c, nonce, 1);
  const roll = scale(n, 10001);
  const win = condition === "over" ? roll > target : roll < target;
  const chance = condition === "over" ? 10000 - target : target;
  return { outcome: { roll, win }, multiplier: win ? Math.floor(99000000 / chance) : 0 };
}
