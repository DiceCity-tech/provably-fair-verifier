import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { vectors } from "./helpers.mjs";

const BIN = fileURLToPath(new URL("../bin/verify.mjs", import.meta.url));
const run = (/** @type {string[]} */ args) => spawnSync(process.execPath, [BIN, ...args], { encoding: "utf8" });

// The worked example on dicecity.com/fair-play; the result was printed by the games engine.
const EXAMPLE = ["--server-seed", "9c1f4e7a2b8d3065f1a7c4e92d0b6f38a5e1c7d94b2f6083e7a1d5c9f3b8e026", "--client-seed", "lucky-street-7", "--nonce", "42"];

test("dice: the worked example, with its hash", () => {
  const r = run(["dice", ...EXAMPLE, "--target", "50.50", "--condition", "over", "--hash", "BA83514EC5DC3FD819FB8B06A098F3B947538F139DCA913CF5776A2A98F18C6F", "--json"]);
  assert.equal(r.status, 0, r.stderr);
  const report = JSON.parse(r.stdout);
  assert.deepEqual(report.result.outcome, { roll: 5110, win: true });
  assert.equal(report.result.multiplier, 20000);
  assert.deepEqual(report.checks, [{ check: "server seed fits the hash shown before the bet", pass: true }]);
});

test("a wrong hash exits 1", () => {
  const r = run(["mines", ...EXAMPLE, "--mines", "3", "--hash", "00".repeat(32)]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /FAIL server seed fits/);
  assert.match(r.stdout, /"mines":\[2,12,24\]/);
});

test("bad input exits 2", () => {
  assert.equal(run(["dice", ...EXAMPLE, "--target", "50.50", "--condition", "sideways"]).status, 2);
  assert.equal(run(["nosuchgame", ...EXAMPLE]).status, 2);
  assert.equal(run(["dice", "--server-seed", "s", "--nonce", "1"]).status, 2);
  assert.equal(run(["dice", ...EXAMPLE, "--unknown-flag", "1"]).status, 2);
  assert.equal(run([]).status, 2);
  assert.equal(run(["--help"]).status, 0);
});

test("--file: every engine vector of every game passes, and one changed record fails", () => {
  const checks = [];
  for (const id of ["baccarat", "bars", "cases", "chicken", "darts", "diamonds", "dice", "flip", "hilo", "keno", "limbo", "mines", "moles", "packs", "plinko", "pump", "roulette", "rps", "snakes", "tower", "videopoker", "wheel"]) {
    for (const c of vectors(id).cases.slice(0, 5)) {
      checks.push({ game: id, server_seed: c.server_seed, client_seed: c.client_seed, nonce: c.nonce, params: c.params, expect: { outcome: c.outcome, multiplier: c.multiplier } });
    }
  }
  for (const game of ["crash", "slide"]) {
    const doc = vectors(game);
    const [a, b] = doc.rounds;
    checks.push({ game, hash: b.hash, salt: doc.salt, previous_hash: a.hash, commitment: doc.commitment, round: b.round, expect: { result: b.result } });
  }
  const bj = vectors("blackjack").shoes[1];
  checks.push({ game: "blackjack", server_seed: bj.server_seed, client_seed: bj.client_seed, hash: bj.server_seed_hash, deck: bj.shoe, cards: bj.shoe.split(",").slice(0, 5).join(",") });

  const dir = mkdtempSync(join(tmpdir(), "pfv-"));
  try {
    const file = join(dir, "checks.json");
    writeFileSync(file, JSON.stringify(checks));
    const ok = run(["--file", file, "--json"]);
    assert.equal(ok.status, 0, ok.stdout.slice(0, 2000));
    assert.equal(JSON.parse(ok.stdout).length, checks.length);

    checks[3] = { ...checks[3], expect: { multiplier: checks[3].expect.multiplier + 1 } };
    writeFileSync(file, JSON.stringify(checks));
    assert.equal(run(["--file", file]).status, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("crash: link and commitment checks from the command line", () => {
  const doc = vectors("crash");
  const r = doc.rounds[9];
  const ok = run(["crash", "--hash", r.hash, "--salt", doc.salt, "--previous-hash", doc.rounds[8].hash, "--commitment", doc.commitment, "--round", String(r.round)]);
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, new RegExp(`result: ${(r.result / 100).toFixed(2)}x`));
  const off = run(["crash", "--hash", r.hash, "--salt", doc.salt, "--commitment", doc.commitment, "--round", String(r.round + 1)]);
  assert.equal(off.status, 1);
});

test("crash and slide: a chain-only check needs no salt", () => {
  for (const game of ["crash", "slide"]) {
    const doc = vectors(game);
    const r = doc.rounds[4];
    const ok = run([game, "--hash", r.hash, "--previous-hash", doc.rounds[3].hash, "--commitment", doc.commitment, "--round", String(r.round)]);
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, /no salt given/);
    assert.equal((ok.stdout.match(/PASS/g) ?? []).length, 2);
    assert.equal(run([game, "--hash", r.hash, "--previous-hash", doc.rounds[2].hash]).status, 1);
  }
  // With nothing to check and no salt there is nothing to do.
  assert.equal(run(["crash", "--hash", vectors("crash").rounds[0].hash]).status, 2);
});

test("blackjack: hash, shoe and dealt cards from the command line", () => {
  const s = vectors("blackjack").shoes[0];
  const cards = s.shoe.split(",").slice(0, 4).join(",");
  const ok = run(["blackjack", "--server-seed", s.server_seed, "--client-seed", s.client_seed, "--hash", s.server_seed_hash, "--deck", s.shoe, "--cards", cards]);
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal((ok.stdout.match(/PASS/g) ?? []).length, 3);
  const bad = run(["blackjack", "--server-seed", s.server_seed, "--client-seed", s.client_seed + "x", "--deck", s.shoe]);
  assert.equal(bad.status, 1);
});
