// @ts-check
// Roulette (single zero): pocket = floor(n0 * 37 / 2^32), 0..36. A chip
// covering k numbers pays floor(36 / k) times its units when the pocket is
// one of them. The bet's multiplier is sum(winning units x floor(36 / k)) /
// sum(units), shown in ten-thousandths, rounded down.

import { ints, scale, toNumber } from "../stream.js";
import { need } from "../params.js";

export const id = "roulette";
export const name = "Roulette";
export const rulesVersion = "r1";

export const RED = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

/** @param {any} p */
export function parseParams(p) {
  const chips = p?.chips;
  need(Array.isArray(chips) && chips.length >= 1 && chips.length <= 100, "chips must be a list of 1 to 100 bets");
  return {
    chips: chips.map((chip) => {
      need(Array.isArray(chip?.numbers) && chip.numbers.length >= 1 && chip.numbers.length <= 18, "each chip needs 1 to 18 numbers");
      need(chip.numbers.every((/** @type {unknown} */ x) => Number.isInteger(x) && Number(x) >= 0 && Number(x) <= 36), "numbers must be 0 to 36");
      need(Number.isInteger(chip.units) && chip.units > 0, "units must be a positive whole number");
      return { numbers: [...chip.numbers].sort((a, b) => a - b), units: chip.units };
    }),
  };
}

/** @param {{numbers: number[], units: number}[]} chips @param {number} pocket */
export function multiplierFor(chips, pocket) {
  let won = 0n;
  let total = 0n;
  for (const { numbers, units } of chips) {
    total += BigInt(units);
    if (numbers.includes(pocket)) won += BigInt(units) * BigInt(Math.floor(36 / numbers.length));
  }
  return toNumber((won * 10000n) / total);
}

/** @param {string} s @param {string} c @param {number|bigint} nonce @param {any} params */
export async function outcome(s, c, nonce, params) {
  const { chips } = parseParams(params);
  const [n] = await ints(s, c, nonce, 1);
  const pocket = scale(n, 37);
  return { outcome: { pocket }, multiplier: multiplierFor(chips, pocket) };
}
