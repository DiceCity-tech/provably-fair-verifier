#!/usr/bin/env node
// @ts-check
// Check a DiceCity game result offline.
//
//   node bin/verify.mjs dice --server-seed S --client-seed C --nonce 42 [--hash H] [--target 50.50 --condition over]
//   node bin/verify.mjs crash --hash H --salt X [--previous-hash P] [--commitment K --round N]
//   node bin/verify.mjs blackjack --server-seed S --client-seed C [--hash H] [--deck "AC,KC,..."] [--cards "10H,AS,..."]
//   node bin/verify.mjs --file bets.json
//
// Exit code: 0 every check passed, 1 a check failed, 2 bad input.

import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { InputError, verify } from "../src/verify.js";
import { GAMES } from "../src/games/index.js";

const USAGE = `Check a DiceCity game result offline.

  node bin/verify.mjs <game> [options]
  node bin/verify.mjs --file checks.json

Seed games (${Object.keys(GAMES).sort().join(", ")}):
  --server-seed S --client-seed C --nonce N   from the game's Fairness window
  --hash H                                    the server seed hash shown before the bet
  game options, as the game shows them:
    --target 50.50 --condition over|under     dice (target in %)
    --target 2.00                             limbo (target multiplier)
    --rows 16 --risk low|medium|high          plinko
    --picks 3,7,12 --risk classic|low|...     keno
    --mines 3                                 mines
    --difficulty easy|medium|...              pump, tower, chicken, snakes, bars
    --segments 10 --risk low|medium|high      wheel
    --risk ...                                cases, darts
    --moles 2                                 moles
    --picks 0,5,9 --difficulty easy|...       bars
    --chips '[{"numbers":[17],"units":1}]'    roulette
    --chips '{"player":1}'                    baccarat
    --held 0,1                                videopoker: the final hand for these holds
    --params '{"rows":16,"risk":"low"}'       any game, the options as JSON

Crash and Slide:
  --hash H --salt X                           the round's hash and the chain's salt (salt only for the result)
  --previous-hash P                           the round before: checks the link
  --commitment K --round N                    walks the hash back N steps to the commitment

Blackjack:
  --server-seed S --client-seed C             C may be given more than once, newest first
  --hash H --deck "AC,KC,..." --cards "10H,AS,..."

  --json   print machine-readable JSON
  --help   this text

Exit code: 0 every check passed, 1 a check failed, 2 bad input.`;

/** @param {string} s */
const list = (s) => s.split(",").map((x) => x.trim()).filter(Boolean);

/** @param {string} s @param {string} name */
function number(s, name) {
  if (!/^-?\d+(\.\d+)?$/.test(s.trim())) throw new InputError(`${name} must be a number`);
  return Number(s);
}

/** @param {string} s @param {string} name */
function json(s, name) {
  try {
    return JSON.parse(s);
  } catch {
    throw new InputError(`${name} must be valid JSON`);
  }
}

/** A target as the game shows it (50.50, 2.00) in hundredths. @param {string} s */
function hundredths(s) {
  const x = number(s, "target");
  const h = Math.round(x * 100);
  if (Math.abs(x * 100 - h) > 1e-6) throw new InputError("target can have at most two decimals");
  return h;
}

/**
 * The check for one game from the command line's options.
 * @param {string} game
 * @param {Record<string, any>} o
 */
function entryFrom(game, o) {
  if (game === "blackjack") {
    return { game, server_seed: o["server-seed"]?.[0], client_seed: o["client-seed"]?.length > 1 ? o["client-seed"] : o["client-seed"]?.[0], hash: o.hash, deck: o.deck, cards: o.cards };
  }
  if (game === "crash" || game === "slide") {
    return {
      game,
      hash: o.hash,
      salt: o.salt,
      previous_hash: o["previous-hash"],
      commitment: o.commitment,
      round: o.round === undefined ? undefined : number(o.round, "round"),
    };
  }
  /** @type {Record<string, any>} */
  const params = {};
  if (o.target !== undefined) params.target = hundredths(o.target);
  if (o.condition !== undefined) params.condition = o.condition;
  if (o.risk !== undefined) params.risk = o.risk;
  if (o.difficulty !== undefined) params.difficulty = o.difficulty;
  for (const key of ["rows", "mines", "segments", "moles"]) if (o[key] !== undefined) params[key] = number(o[key], key);
  if (o.picks !== undefined) params.picks = list(o.picks).map((p) => number(p, "picks"));
  if (o.chips !== undefined) params.chips = json(o.chips, "chips");
  if (o.params !== undefined) Object.assign(params, json(o.params, "params"));
  return {
    game,
    server_seed: o["server-seed"]?.[0],
    client_seed: o["client-seed"]?.[0],
    nonce: o.nonce,
    hash: o.hash,
    params,
    held: o.held === undefined ? undefined : list(o.held).map((p) => number(p, "held")),
  };
}

/** Ten-thousandths as a multiplier. @param {number} m */
const times = (m) => `${(m / 10000).toFixed(4)}x`;

/** @param {import("../src/verify.js").Report} r */
function print(r) {
  const out = [`${r.game}`];
  const res = r.result;
  if (r.game === "blackjack") {
    out.push(`  shoe: ${res.shoe}`);
  } else if (r.game === "crash" || r.game === "slide") {
    out.push(res.result === undefined ? "  result: not worked out (no salt given)" : `  result: ${(res.result / 100).toFixed(2)}x`);
  } else {
    out.push(`  server seed hash: ${res.server_seed_hash}`);
    out.push(`  options: ${JSON.stringify(res.params)}`);
    out.push(`  outcome: ${JSON.stringify(res.outcome)}`);
    if (res.stepped) {
      out.push("  stepped game: this is the hidden layout. What it paid follows from your own moves.");
      if (res.steps) out.push(`  multiplier after each safe step: ${res.steps.map((/** @type {any} */ s) => `${s.step}: ${times(s.multiplier)}`).join(", ")}`);
      if (res.walk) {
        const rolls = res.walk.path.length - 1;
        const end = res.walk.end === "lost" ? `a hole on roll ${rolls} (lost)` : `cash-out after roll ${rolls} at ${times(res.walk.multipliers.at(-1))}`;
        out.push(`  walk if you roll every time: tiles ${res.walk.path.join(" > ")}, ${end}`);
      }
      if (res.draw) out.push(`  held ${JSON.stringify(res.draw.held)}: final hand ${JSON.stringify(res.draw.hand)}, ${res.draw.name}, ${times(res.draw.multiplier)}`);
    } else {
      out.push(`  multiplier: ${times(res.multiplier)}`);
    }
  }
  for (const c of r.checks) out.push(`  ${c.pass ? "PASS" : "FAIL"} ${c.check}`);
  return out.join("\n");
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      "server-seed": { type: "string", multiple: true },
      "client-seed": { type: "string", multiple: true },
      ...Object.fromEntries(
        ["nonce", "hash", "params", "target", "condition", "rows", "risk", "mines", "difficulty", "segments", "picks", "moles", "chips", "held", "salt", "previous-hash", "commitment", "round", "deck", "cards", "file"].map((k) => [k, { type: "string" }]),
      ),
      json: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help || (positionals.length === 0 && !values.file)) {
    console.log(USAGE);
    return values.help ? 0 : 2;
  }

  const entries = values.file ? json(readFileSync(values.file, "utf8"), "the file") : [entryFrom(positionals[0], values)];
  if (!Array.isArray(entries)) throw new InputError("the file must hold a list of checks");

  const progress = values.json ? undefined : (/** @type {number} */ done) => process.stderr.write(`  ... ${done} hashes\r`);
  const reports = [];
  for (const entry of entries) reports.push(await verify(entry, { progress }));

  if (values.json) console.log(JSON.stringify(reports.length === 1 && !values.file ? reports[0] : reports, null, 2));
  else console.log(reports.map(print).join("\n\n"));
  return reports.every((r) => r.pass) ? 0 : 1;
}

// exitCode, not exit(): a large --json answer must reach a pipe in full.
main().then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    console.error(error instanceof InputError || error?.code?.startsWith?.("ERR_PARSE_ARGS") ? `Input error: ${error.message}` : error);
    process.exitCode = 2;
  },
);
