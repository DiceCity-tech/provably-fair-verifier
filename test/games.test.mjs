import { test } from "node:test";
import assert from "node:assert/strict";
import { GAMES } from "../src/games/index.js";
import * as hilo from "../src/games/hilo.js";
import * as mines from "../src/games/mines.js";
import * as pump from "../src/games/pump.js";
import * as tower from "../src/games/tower.js";
import * as chicken from "../src/games/chicken.js";
import * as flip from "../src/games/flip.js";
import * as rps from "../src/games/rps.js";
import * as moles from "../src/games/moles.js";
import * as snakes from "../src/games/snakes.js";
import * as videopoker from "../src/games/videopoker.js";
import * as baccarat from "../src/games/baccarat.js";
import * as diamonds from "../src/games/diamonds.js";
import * as packs from "../src/games/packs.js";
import { table as plinkoTable } from "../src/tables/plinko.js";
import { TABLES as KENO } from "../src/tables/keno.js";
import { TABLES as WHEEL } from "../src/tables/wheel.js";
import { TABLES as CASES } from "../src/tables/cases.js";
import { TABLES as DARTS } from "../src/tables/darts.js";
import { TABLES as BARS } from "../src/tables/bars.js";
import { TABLE as PACKS } from "../src/tables/packs.js";
import { ticketRow } from "../src/stream.js";
import { vectors } from "./helpers.mjs";

const IDS = ["baccarat", "bars", "cases", "chicken", "darts", "diamonds", "dice", "flip", "hilo", "keno", "limbo", "mines", "moles", "packs", "plinko", "pump", "roulette", "rps", "snakes", "tower", "videopoker", "wheel"];

test("all 22 seed-pair games are here", () => {
  assert.deepEqual(Object.keys(GAMES).sort(), IDS);
});

for (const id of IDS) {
  test(`${id}: every engine vector gives the same outcome and multiplier`, async () => {
    const doc = vectors(id);
    const game = GAMES[id];
    assert.equal(game.rulesVersion, doc.rules_version, "rules version");
    assert.ok(new Set(doc.cases.map((c) => c.nonce)).size >= 50, "at least 50 nonces");
    for (const c of doc.cases) {
      const label = `${c.server_seed.slice(0, 8)} / ${c.client_seed} / ${c.nonce} / ${JSON.stringify(c.params)}`;
      assert.deepEqual(game.parseParams(c.params), c.params, `params ${label}`);
      const got = await game.outcome(c.server_seed, c.client_seed, c.nonce, c.params);
      assert.deepEqual(got.outcome, c.outcome, `outcome ${label}`);
      assert.equal(got.multiplier, c.multiplier, `multiplier ${label}`);
    }
  });
}

test("step multipliers match the engine", () => {
  for (const s of vectors("mines").steps) assert.equal(mines.stepMultiplier(s.mines, s.gems), s.multiplier, `mines ${s.mines}/${s.gems}`);
  for (const s of vectors("pump").steps) assert.equal(pump.stepMultiplier(s.difficulty, s.pumps), s.multiplier);
  for (const s of vectors("tower").steps) assert.equal(tower.stepMultiplier(s.difficulty, s.rows), s.multiplier);
  for (const s of vectors("chicken").steps) assert.equal(chicken.stepMultiplier(s.difficulty, s.lanes), s.multiplier);
  for (const s of vectors("flip").steps) assert.equal(flip.stepMultiplier(s.wins), s.multiplier);
  for (const s of vectors("rps").steps) assert.equal(rps.stepMultiplier(s.wins), s.multiplier);
  for (const s of vectors("moles").steps) assert.equal(moles.stepMultiplier(s.moles, s.hits), s.multiplier);
  for (const s of vectors("hilo").steps) assert.equal(hilo.stepMultiplier(s.counts), s.multiplier);
});

test("Alley Run walks match the engine on every board", () => {
  for (const c of vectors("snakes").cases) assert.deepEqual(snakes.walk(c.params.difficulty, c.outcome.dice), c.walk, `nonce ${c.nonce}`);
});

test("Baccarat: every third-card branch deals as the engine does", () => {
  for (const d of vectors("baccarat").deals) {
    const { player, banker } = baccarat.deal(d.cards);
    assert.deepEqual({ player, banker }, { player: d.player, banker: d.banker }, JSON.stringify(d.cards));
    const [pt, bt] = [baccarat.total(player), baccarat.total(banker)];
    assert.equal(pt > bt ? "player" : pt < bt ? "banker" : "tie", d.winner);
  }
});

test("Video Poker: every paying hand is named as the engine names it", () => {
  for (const h of vectors("videopoker").hands) {
    assert.equal(videopoker.evaluate(h.hand), h.name, JSON.stringify(h.hand));
    assert.equal(videopoker.pays(h.name), h.pays);
  }
});

test("Video Poker final hands match the engine", () => {
  for (const c of vectors("videopoker").cases) {
    for (const d of c.draws) {
      const hand = videopoker.finalHand(c.outcome.cards, d.held);
      assert.deepEqual(hand, d.hand);
      assert.equal(videopoker.evaluate(hand), d.name);
      assert.equal(videopoker.pays(d.name), d.pays);
    }
  }
});

test("Diamonds: every hand shape is named and paid as the engine does", () => {
  for (const h of vectors("diamonds").hands) assert.deepEqual(diamonds.hand(h.gems), { hand: h.hand, multiplier: h.multiplier }, JSON.stringify(h.gems));
});

test("every pay table equals the engine's, cell for cell", () => {
  for (const t of vectors("plinko").tables) assert.deepEqual(plinkoTable(t.rows, t.risk), t.table, `plinko ${t.rows} ${t.risk}`);
  for (const t of vectors("keno").tables) assert.deepEqual(KENO[t.risk][t.picks - 1], t.table, `keno ${t.risk} ${t.picks}`);
  for (const t of vectors("wheel").tables) assert.deepEqual(WHEEL[t.risk][t.segments], t.table, `wheel ${t.risk} ${t.segments}`);
  for (const t of vectors("cases").tables) assert.deepEqual(CASES[t.risk], t.table, `cases ${t.risk}`);
  for (const t of vectors("darts").tables) assert.deepEqual(DARTS[t.risk], t.table, `darts ${t.risk}`);
  for (const t of vectors("bars").tables) assert.deepEqual(BARS[t.difficulty], t.table, `bars ${t.difficulty}`);
  assert.deepEqual(PACKS, vectors("packs").table);
  assert.equal(Object.keys(KENO).length * 10, vectors("keno").tables.length);
});

test("tickets on every table edge land where the engine puts them", () => {
  const w = (/** @type {[number, number][]} */ t) => t.map(([, x]) => x);
  for (const x of vectors("cases").walks) assert.equal(ticketRow(w(CASES[x.risk]), x.ticket), x.prize, `cases ${x.risk} ${x.ticket}`);
  for (const x of vectors("darts").walks) assert.equal(ticketRow(w(DARTS[x.risk]), x.ticket), x.zone, `darts ${x.risk} ${x.ticket}`);
  for (const x of vectors("bars").walks) assert.equal(ticketRow(w(BARS[x.difficulty]), x.ticket), x.row, `bars ${x.difficulty} ${x.ticket}`);
  for (const x of vectors("packs").walks) assert.deepEqual(packs.card(x.ticket), x, `packs ${x.ticket}`);
  for (const x of vectors("packs").sums) assert.equal(packs.multiplierFor(x.sum), x.multiplier, `packs sum ${x.sum}`);
});
