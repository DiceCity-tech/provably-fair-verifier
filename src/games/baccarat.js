// @ts-check
// Baccarat (punto banco, endless deck): the first 6 numbers are cards,
// floor(n * 52 / 2^32) each, rank floor(card / 4) + 1; tens and faces count
// 0. Dealt player, banker, player, banker, then the player's third card and
// the banker's third card as the standard table says. Player pays 2x, banker
// 1.95x, tie 9x; on a tie player and banker chips are returned.

import { ints, scale, toNumber } from "../stream.js";
import { need } from "../params.js";

export const id = "baccarat";
export const name = "Baccarat";
export const rulesVersion = "b1";

const SIDES = ["player", "banker", "tie"];
/** Pay per unit in ten-thousandths when [player, banker, tie] wins. @type {Record<string, number[]>} */
const PAYS = { player: [20000, 0, 10000], banker: [0, 19500, 10000], tie: [0, 0, 90000] };

/** @param {any} p */
export function parseParams(p) {
  const chips = p?.chips;
  need(chips && typeof chips === "object" && !Array.isArray(chips), "chips must be an object like {\"player\": 1}");
  const entries = Object.entries(chips);
  need(entries.length >= 1 && entries.length <= 3, "chips need 1 to 3 sides");
  need(entries.every(([side, u]) => SIDES.includes(side) && Number.isInteger(u) && Number(u) > 0), "chips: sides player, banker, tie with positive whole units");
  return { chips: /** @type {Record<string, number>} */ (chips) };
}

/** @param {number} card */
export const value = (card) => {
  const rank = Math.floor(card / 4) + 1;
  return rank >= 10 ? 0 : rank;
};

/** @param {number[]} cards */
export const total = (cards) => cards.reduce((a, x) => a + value(x), 0) % 10;

/** @param {number} bt banker total @param {number} third player's third card value */
function bankerDraws(bt, third) {
  if (bt <= 2) return true;
  if (bt === 3) return third !== 8;
  if (bt === 4) return third >= 2 && third <= 7;
  if (bt === 5) return third >= 4 && third <= 7;
  if (bt === 6) return third >= 6 && third <= 7;
  return false;
}

/**
 * Deal a hand from six cards.
 * @param {number[]} cards
 * @returns {{player: number[], banker: number[]}}
 */
export function deal([p1, b1, p2, b2, c5, c6]) {
  const player = [p1, p2];
  const banker = [b1, b2];
  const pt = total(player);
  const bt = total(banker);
  if (pt >= 8 || bt >= 8) return { player, banker };
  if (pt > 5) return { player, banker: bt <= 5 ? [...banker, c5] : banker };
  return { player: [...player, c5], banker: bankerDraws(bt, value(c5)) ? [...banker, c6] : banker };
}

/** @param {Record<string, number>} chips @param {string} winner */
export function multiplierFor(chips, winner) {
  const index = SIDES.indexOf(winner);
  let won = 0n;
  let units = 0n;
  for (const [side, u] of Object.entries(chips)) {
    units += BigInt(u);
    won += BigInt(u) * BigInt(PAYS[side][index]);
  }
  return toNumber(won / units);
}

/** @param {string} s @param {string} c @param {number|bigint} nonce @param {any} params */
export async function outcome(s, c, nonce, params) {
  const { chips } = parseParams(params);
  const cards = (await ints(s, c, nonce, 6)).map((n) => scale(n, 52));
  const { player, banker } = deal(cards);
  const [pt, bt] = [total(player), total(banker)];
  const winner = pt > bt ? "player" : pt < bt ? "banker" : "tie";
  return { outcome: { player, banker, winner }, multiplier: multiplierFor(chips, winner) };
}
