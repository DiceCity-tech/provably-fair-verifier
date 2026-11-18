import { test } from "node:test";
import assert from "node:assert/strict";
import { ints, scale, serverSeedHash, hashMatches } from "../src/stream.js";
import { vectors } from "./helpers.mjs";

const doc = vectors("stream");

test("SHA-256 of the seed text matches the engine", async () => {
  for (const { text, sha256 } of doc.hashes) assert.equal(await serverSeedHash(text), sha256, text);
});

test("the uint32 stream matches the engine, past the first HMAC round", async () => {
  for (const c of doc.streams) assert.deepEqual(await ints(c.server_seed, c.client_seed, c.nonce, 20), c.ints, `${c.server_seed} ${c.client_seed} ${c.nonce}`);
});

test("scaling matches the engine at the edges", () => {
  for (const { n, k, scaled } of doc.scales) assert.equal(scale(n, k), scaled, `${n} * ${k}`);
});

// The engine's own fixed values (games fairness test): "server-seed-test", "client".
test("anchor: the engine's reference numbers", async () => {
  const anchors = [[0, 1440271730], [1, 3489830792], [2, 1540319010], [3, 4149740263], [42, 3033091021]];
  for (const [nonce, n] of anchors) assert.deepEqual(await ints("server-seed-test", "client", nonce, 1), [n]);
  assert.equal(scale(0, 10001), 0);
  assert.equal(scale(4294967295, 10001), 10000);
  assert.equal(await serverSeedHash("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("a commitment is compared without regard to case", async () => {
  assert.equal(await hashMatches("abc", "BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD"), true);
  assert.equal(await hashMatches("abd", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"), false);
});
