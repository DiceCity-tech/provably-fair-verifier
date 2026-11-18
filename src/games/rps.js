// @ts-check
// Rock Paper Scissors: 64 house throws, throw j = floor(n_j * 3 / 2^32)
// (0 rock, 1 paper, 2 scissors). A loss ends the bet, a draw changes nothing,
// a win doubles up: after k wins the multiplier is 0.99 x 2^k, trimmed and
// rounded down. The 20th win cashes out.

import { ints, scale, trimmed } from "../stream.js";
import { int, need } from "../params.js";

export const id = "rps";
export const name = "Rock Paper Scissors";
export const rulesVersion = "r1";
export const stepped = true;

const HANDS = ["rock", "paper", "scissors"];

/** @param {any} p */
export function parseParams(p) {
  need(p == null || Object.keys(p).length === 0, "Rock Paper Scissors takes no options");
  return {};
}

/** "win", "draw" or "loss" for the player's throw against the house's. @param {string} player @param {string} house */
export function result(player, house) {
  if (player === house) return "draw";
  const beats = { rock: "scissors", paper: "rock", scissors: "paper" };
  return beats[/** @type {"rock"|"paper"|"scissors"} */ (player)] === house ? "win" : "loss";
}

/** @param {number} wins */
export function stepMultiplier(wins) {
  int(wins, 0, 20, "wins");
  return wins === 0 ? 0 : trimmed(2n ** BigInt(wins), 1n);
}

/** @param {string} s @param {string} c @param {number|bigint} nonce @param {any} params */
export async function outcome(s, c, nonce, params) {
  parseParams(params);
  const house = (await ints(s, c, nonce, 64)).map((n) => HANDS[scale(n, 3)]);
  return { outcome: { house, plays: [], wins: 0 }, multiplier: 0 };
}
