import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { defaultShoe, randomNumber, serverSeedHash, shuffle, verifyHand, drawInput } from "../src/blackjack.js";
import { sha3_384 } from "../src/sha3.js";
import { vectors } from "./helpers.mjs";

const doc = vectors("blackjack");

test("SHA3-384 known answers and Node's own sha3-384", () => {
  const hex = (b) => Buffer.from(b).toString("hex");
  assert.equal(hex(sha3_384(new Uint8Array())), "0c63a75b845e4f7d01107d852e4c2485c51a50aaaa94fc61995e71bbee983a2ac3713831264adb47fb6bd1e058d5f004");
  assert.equal(hex(sha3_384(new TextEncoder().encode("abc"))), "ec01498288516fc926459f58e2c6ad8df9b473cb0fc08c2596da7cf0e49be4b298d88cea927ac7f539f1edf228376d25");
  for (const len of [1, 71, 103, 104, 105, 207, 208, 500]) {
    const bytes = new Uint8Array(len).map((_, i) => (i * 31 + len) & 0xff);
    assert.equal(hex(sha3_384(bytes)), createHash("sha3-384").update(bytes).digest("hex"), `length ${len}`);
  }
});

test("the default shoe matches the engine", () => {
  assert.equal(defaultShoe().join(","), doc.default_shoe);
  assert.equal(defaultShoe().length, 416);
});

test("raw draws match the engine", async () => {
  for (const d of doc.draws) {
    const input = Buffer.concat(d.inputs_hex.map((h) => Buffer.from(h, "hex")));
    assert.equal(await randomNumber(new Uint8Array(input)), d.number, d.inputs_hex.join(" "));
  }
});

// The engine's own fixed value (backend RNG test): inputs 0x01, 0x10.
test("anchor: the engine's reference draw", async () => {
  assert.equal(await randomNumber(new Uint8Array([0x01, 0x10])), 0.4440414926372565);
});

test("every shoe, hash and draw matches the engine", async () => {
  assert.ok(doc.shoes.length >= 5);
  for (const s of doc.shoes) {
    assert.equal(await serverSeedHash(s.server_seed), s.server_seed_hash);
    for (let k = 0; k < s.draws.length; k++) assert.equal(await randomNumber(drawInput([s.server_seed, s.client_seed], k)), s.draws[k]);
    assert.equal((await shuffle(s.server_seed, s.client_seed)).join(","), s.shoe, s.client_seed);
  }
});

test("verifyHand passes a true hand and fails a changed one", async () => {
  const s = doc.shoes[0];
  const top = s.shoe.split(",").slice(0, 4);
  const good = await verifyHand({ serverSeed: s.server_seed, clientSeed: s.client_seed, hash: s.server_seed_hash.toLowerCase(), shoe: s.shoe, cards: top });
  assert.equal(good.pass, true);
  assert.equal(good.checks.length, 3);
  const swapped = [top[1], top[0], ...top.slice(2)];
  const bad = await verifyHand({ serverSeed: s.server_seed, clientSeed: s.client_seed, cards: top[0] === top[1] ? ["XX"] : swapped });
  assert.equal(bad.pass, false);
});
