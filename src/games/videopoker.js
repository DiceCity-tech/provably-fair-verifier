// @ts-check
// Video Poker (Jacks or Better): 10 cards drawn without replacement from
// 0..51 (rank floor(card / 4) + 1, Ace = 1 .. King = 13; suit card mod 4).
// Cards 0-4 are the deal; cards 5-9 replace the discarded cards from left to
// right. Pays per unit: royal flush 800, straight flush 60, four of a kind
// 22, full house 9, flush 6, straight 4, three of a kind 3, two pair 2,
// jacks or better 1.

import { drawWithoutReplacement, ints, range } from "../stream.js";
import { need } from "../params.js";

export const id = "videopoker";
export const name = "Video Poker";
export const rulesVersion = "v1";
export const stepped = true;

/** @type {[string, number][]} */
export const PAYS = [
  ["royal_flush", 800],
  ["straight_flush", 60],
  ["four_of_a_kind", 22],
  ["full_house", 9],
  ["flush", 6],
  ["straight", 4],
  ["three_of_a_kind", 3],
  ["two_pair", 2],
  ["jacks_or_better", 1],
];

/** @param {any} p */
export function parseParams(p) {
  need(p == null || Object.keys(p).length === 0, "Video Poker takes no options");
  return {};
}

/**
 * The final hand after holding positions `held` (0..4) of the deal.
 * @param {number[]} cards @param {number[]} held
 */
export function finalHand(cards, held) {
  need(held.every((i) => Number.isInteger(i) && i >= 0 && i <= 4) && new Set(held).size === held.length, "held must be distinct positions 0 to 4");
  const replacements = cards.slice(5);
  return cards.slice(0, 5).map((card, i) => (held.includes(i) ? card : /** @type {number} */ (replacements.shift())));
}

/**
 * The best paying hand in five cards, or "nothing".
 * @param {number[]} hand
 */
export function evaluate(hand) {
  const ranks = hand.map((x) => Math.floor(x / 4) + 1);
  /** @type {Map<number, number>} */
  const freq = new Map();
  for (const r of ranks) freq.set(r, (freq.get(r) ?? 0) + 1);
  const counts = [...freq.values()].sort((a, b) => b - a).join(",");
  const flush = new Set(hand.map((x) => x % 4)).size === 1;
  const sorted = [...ranks].sort((a, b) => a - b);
  const distinct = freq.size === 5;
  const royal = distinct && sorted.join(",") === "1,10,11,12,13";
  const straight = royal || (distinct && sorted[4] - sorted[0] === 4);
  if (flush && royal) return "royal_flush";
  if (flush && straight) return "straight_flush";
  if (counts === "4,1") return "four_of_a_kind";
  if (counts === "3,2") return "full_house";
  if (flush) return "flush";
  if (straight) return "straight";
  if (counts === "3,1,1") return "three_of_a_kind";
  if (counts === "2,2,1") return "two_pair";
  if (counts === "2,1,1,1") {
    const pair = [...freq].find(([, n]) => n === 2)?.[0] ?? 0;
    return pair === 1 || pair >= 11 ? "jacks_or_better" : "nothing";
  }
  return "nothing";
}

/** Pay per unit for a hand name (0 for nothing). @param {string} handName */
export const pays = (handName) => PAYS.find(([n]) => n === handName)?.[1] ?? 0;

/** @param {string} s @param {string} c @param {number|bigint} nonce @param {any} params */
export async function outcome(s, c, nonce, params) {
  parseParams(params);
  const cards = drawWithoutReplacement(await ints(s, c, nonce, 10), range(52));
  return { outcome: { cards, held: null, hand: null }, multiplier: 0 };
}
