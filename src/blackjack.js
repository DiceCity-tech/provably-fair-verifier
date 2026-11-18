// @ts-check
// Blackjack: a seeded shuffle of an 8-deck shoe (416 cards), new for every
// hand. There is no nonce.
//
// Draw k (k = 0, 1, ... 414):
//   digest  = SHA3-384(server seed text + client seed text + k as 4 bytes big-endian)
//   key     = digest[0..31], counter = digest[32..47]
//   block   = first 16 bytes of AES-256-CTR(key, counter) keystream
//   acc     = XOR of the block's four little-endian unsigned 32-bit parts
//   r[k]    = 0.5 + int32(acc) / 0xFFFFFFFF
// Shuffle (Fisher-Yates from the last card down), on the default shoe:
//   for i = 415 down to 1: j = trunc(r[415 - i] x (i + 1)); swap(shoe[i], shoe[j])
// r can be a hair below 0, so it is trunc (towards zero), never floor.
// Cards are dealt from the top of the shoe (index 0 first).

import { aes256CtrBlock, sha256Hex, utf8 } from "./crypto.js";
import { sha3_384 } from "./sha3.js";

export const DECKS = 8;

const RANKS = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];
const SUITS = ["C", "D", "H", "S"];

/**
 * The shoe before the shuffle: 8 times clubs, diamonds, hearts, spades, each
 * Ace down to 2 ("AC,KC,QC,...,2S"). Card codes: rank then suit letter.
 * @returns {string[]}
 */
export function defaultShoe() {
  /** @type {string[]} */
  const shoe = [];
  for (let d = 0; d < DECKS; d++) for (const s of SUITS) for (const r of RANKS) shoe.push(r + s);
  return shoe;
}

/**
 * The SHA3-384 input for draw k: the seed texts joined with no separator,
 * then k as 4 bytes big-endian.
 * @param {string[]} seeds server seed first, then the client seed(s), newest first
 * @param {number} k
 */
export function drawInput(seeds, k) {
  const parts = seeds.map(utf8);
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0) + 4);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  new DataView(out.buffer).setUint32(off, k, false);
  return out;
}

/**
 * Draw k as a number in about [0, 1).
 * @param {Uint8Array} input the full SHA3-384 input (see drawInput)
 * @returns {Promise<number>}
 */
export async function randomNumber(input) {
  const digest = sha3_384(input);
  const block = await aes256CtrBlock(digest.slice(0, 32), digest.slice(32, 48));
  const view = new DataView(block.buffer);
  let acc = 0;
  for (let i = 0; i < 4; i++) acc = (acc ^ view.getUint32(i * 4, true)) >>> 0;
  const signed = acc > 0x7fffffff ? acc - 0x100000000 : acc;
  return 0.5 + signed / 0xffffffff;
}

/**
 * The shuffled shoe for a hand.
 * @param {string} serverSeed
 * @param {string | string[]} clientSeed one seed, or several, newest first
 * @returns {Promise<string[]>}
 */
export async function shuffle(serverSeed, clientSeed) {
  const seeds = [serverSeed, ...(Array.isArray(clientSeed) ? clientSeed : [clientSeed])];
  const shoe = defaultShoe();
  for (let i = shoe.length - 1, k = 0; i >= 1; i--, k++) {
    const j = Math.trunc((await randomNumber(drawInput(seeds, k))) * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  return shoe;
}

/**
 * The hash shown before the hand: SHA-256 of the server seed text. The table
 * shows it in upper case; compare without regard to case.
 * @param {string} serverSeed
 */
export async function serverSeedHash(serverSeed) {
  return (await sha256Hex(serverSeed)).toUpperCase();
}

/**
 * Check a hand. Every field but the seeds is optional.
 * @param {{serverSeed: string, clientSeed: string | string[], hash?: string, shoe?: string | string[], cards?: string | string[]}} hand
 */
export async function verifyHand({ serverSeed, clientSeed, hash, shoe, cards }) {
  const expected = await shuffle(serverSeed, clientSeed);
  /** @param {string | string[]} x */
  const list = (x) => (Array.isArray(x) ? x : x.split(",")).map((c) => c.trim().toUpperCase()).filter(Boolean);
  /** @type {{check: string, pass: boolean}[]} */
  const checks = [];
  if (hash !== undefined) checks.push({ check: "hash fits the server seed", pass: (await serverSeedHash(serverSeed)) === hash.trim().toUpperCase() });
  if (shoe !== undefined) checks.push({ check: "recorded shoe equals the shuffle", pass: list(shoe).join(",") === expected.join(",") });
  if (cards !== undefined) {
    const dealt = list(cards);
    checks.push({ check: "dealt cards are the top of the shoe", pass: dealt.join(",") === expected.slice(0, dealt.length).join(",") });
  }
  return { shoe: expected, checks, pass: checks.every((c) => c.pass) };
}
