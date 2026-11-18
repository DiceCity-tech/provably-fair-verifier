// @ts-check
// One entry point for a check of any kind, shared by the command line and
// any page: give it what the game's Fairness window shows, get back the
// result and a list of checks that each pass or fail.

import { InputError, need } from "./params.js";
import { hashMatches, serverSeedHash } from "./stream.js";
import { GAMES } from "./games/index.js";
import { previousHash, roundResult, walkBack } from "./chain.js";
import { verifyHand } from "./blackjack.js";
import * as chicken from "./games/chicken.js";
import * as flip from "./games/flip.js";
import * as mines from "./games/mines.js";
import * as moles from "./games/moles.js";
import * as pump from "./games/pump.js";
import * as rps from "./games/rps.js";
import * as snakes from "./games/snakes.js";
import * as tower from "./games/tower.js";
import * as videopoker from "./games/videopoker.js";

/**
 * @typedef {{check: string, pass: boolean}} Check
 * @typedef {{game: string, result: any, checks: Check[], pass: boolean}} Report
 */

const CHAIN_GAMES = ["crash", "slide"];

/** @param {number} from @param {number} to @param {(k: number) => number} f */
const table = (from, to, f) => Array.from({ length: to - from + 1 }, (_, i) => ({ step: from + i, multiplier: f(from + i) }));

/**
 * What a stepped game's hidden layout means for play: the multiplier after
 * each safe step, the Alley Run walk, or a Video Poker draw for given holds.
 * @param {string} game @param {any} params @param {any} outcome @param {any} entry
 */
function stepped(game, params, outcome, entry) {
  switch (game) {
    case "mines":
      return { steps: table(1, 25 - params.mines, (k) => mines.stepMultiplier(params.mines, k)) };
    case "pump":
      return { steps: table(1, 25 - pump.POPS[params.difficulty], (k) => pump.stepMultiplier(params.difficulty, k)) };
    case "tower":
      return { steps: table(1, tower.ROWS, (k) => tower.stepMultiplier(params.difficulty, k)) };
    case "chicken":
      return { steps: table(1, chicken.LEVELS[params.difficulty][1], (k) => chicken.stepMultiplier(params.difficulty, k)) };
    case "flip":
      return { steps: table(1, 20, flip.stepMultiplier) };
    case "rps":
      return { steps: table(1, 20, rps.stepMultiplier) };
    case "moles":
      return { steps: table(1, moles.maxRounds(params.moles), (k) => moles.stepMultiplier(params.moles, k)) };
    case "snakes":
      return { walk: snakes.walk(params.difficulty, outcome.dice) };
    case "videopoker": {
      if (entry.held === undefined) return {};
      need(Array.isArray(entry.held), "held must be a list of positions 0 to 4");
      const hand = videopoker.finalHand(outcome.cards, entry.held);
      const name = videopoker.evaluate(hand);
      return { draw: { held: entry.held, hand, name, multiplier: videopoker.pays(name) * 10000 } };
    }
    default:
      return {};
  }
}

/** @param {unknown} v @param {string} name */
const text = (v, name) => {
  need(typeof v === "string" && v.length > 0, `${name} is missing`);
  return /** @type {string} */ (v);
};

/** @param {unknown} v */
function nonceOf(v) {
  need(v !== undefined && v !== null && /^\d+$/.test(String(v)), "nonce must be a whole number, 0 or more");
  const big = BigInt(String(v));
  return big <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(big) : big;
}

/**
 * Whether `actual` has every field `expected` has, with the same value.
 * @param {any} actual @param {any} expected
 * @returns {boolean}
 */
function includes(actual, expected) {
  if (expected === null || typeof expected !== "object") return actual === expected;
  if (Array.isArray(expected)) return Array.isArray(actual) && actual.length === expected.length && expected.every((e, i) => includes(actual[i], e));
  return actual !== null && typeof actual === "object" && Object.keys(expected).every((k) => includes(actual[k], expected[k]));
}

/**
 * Check one bet, round or hand.
 *
 * Seed-pair games: { game, server_seed, client_seed, nonce, params, hash?, expect? }
 * Crash, Slide:    { game, hash, salt?, previous_hash?, commitment?, round?, expect? }
 *                  (the salt is needed only for the round's result)
 * Blackjack:       { game: "blackjack", server_seed, client_seed, hash?, deck?, cards? }
 *
 * `expect` is what the record shows: { outcome?: {...}, multiplier? } for a
 * seed game (only the fields given are compared), { result? } for a round.
 * @param {any} entry
 * @param {{progress?: (done: number) => void}} [options]
 * @returns {Promise<Report>}
 */
export async function verify(entry, options = {}) {
  need(entry && typeof entry === "object", "each check must be an object");
  const game = text(entry.game, "game");
  /** @type {Check[]} */
  const checks = [];

  if (game === "blackjack") {
    const r = await verifyHand({
      serverSeed: text(entry.server_seed, "server_seed"),
      clientSeed: Array.isArray(entry.client_seed) ? entry.client_seed : text(entry.client_seed, "client_seed"),
      hash: entry.hash,
      shoe: entry.deck,
      cards: entry.cards,
    });
    return { game, result: { shoe: r.shoe.join(",") }, checks: r.checks, pass: r.pass };
  }

  if (CHAIN_GAMES.includes(game)) {
    const hash = text(entry.hash, "hash").trim().toLowerCase();
    need(/^[0-9a-f]{64}$/.test(hash), "hash must be 64 hex characters");
    const hasSalt = entry.salt !== undefined;
    need(hasSalt || entry.previous_hash !== undefined || entry.commitment !== undefined, "give the salt for the round's result, or a previous hash or commitment to check the chain");
    need(hasSalt || entry.expect?.result === undefined, "salt is missing: it is needed to work out the round's result");
    const result = hasSalt ? await roundResult(hash, text(entry.salt, "salt")) : undefined;
    if (entry.previous_hash !== undefined) {
      checks.push({ check: "hash links to the previous round's hash", pass: (await previousHash(hash)) === String(entry.previous_hash).trim().toLowerCase() });
    }
    if (entry.commitment !== undefined) {
      need(Number.isInteger(entry.round) && entry.round >= 1, "round must be the round number (1 or more) to walk back to the commitment");
      const back = await walkBack(hash, entry.round, options.progress);
      checks.push({ check: `hash walks back ${entry.round} step${entry.round === 1 ? "" : "s"} to the commitment`, pass: back === String(entry.commitment).trim().toLowerCase() });
    }
    if (entry.expect?.result !== undefined) checks.push({ check: "result equals the record", pass: result === entry.expect.result });
    return { game, result: hasSalt ? { result } : {}, checks, pass: checks.every((c) => c.pass) };
  }

  const g = GAMES[game];
  need(g, `unknown game "${game}". Games: ${[...Object.keys(GAMES), ...CHAIN_GAMES, "blackjack"].sort().join(", ")}`);
  const serverSeed = text(entry.server_seed, "server_seed");
  const clientSeed = text(entry.client_seed, "client_seed");
  const nonce = nonceOf(entry.nonce);
  const params = g.parseParams(entry.params ?? {});
  const { outcome, multiplier } = await g.outcome(serverSeed, clientSeed, nonce, params);
  if (entry.hash !== undefined) checks.push({ check: "server seed fits the hash shown before the bet", pass: await hashMatches(serverSeed, String(entry.hash)) });
  if (entry.expect?.outcome !== undefined) checks.push({ check: "outcome equals the record", pass: includes(outcome, entry.expect.outcome) });
  if (entry.expect?.multiplier !== undefined) checks.push({ check: "multiplier equals the record", pass: multiplier === entry.expect.multiplier });
  return {
    game,
    result: { server_seed_hash: await serverSeedHash(serverSeed), params, outcome, multiplier, stepped: Boolean(g.stepped), ...stepped(game, params, outcome, entry) },
    checks,
    pass: checks.every((c) => c.pass),
  };
}

export { InputError };
