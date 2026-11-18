import { test } from "node:test";
import assert from "node:assert/strict";
import { previousHash, roundResult, walkBack } from "../src/chain.js";
import { vectors } from "./helpers.mjs";

for (const game of ["crash", "slide"]) {
  const doc = vectors(game);

  test(`${game}: every round's result matches the engine`, async () => {
    for (const r of doc.rounds) assert.equal(await roundResult(r.hash, doc.salt), r.result, `round ${r.round}`);
  });

  test(`${game}: each hash links to the one before, back to the commitment`, async () => {
    let before = doc.commitment;
    for (const r of doc.rounds) {
      assert.equal(await previousHash(r.hash), before, `round ${r.round}`);
      before = r.hash;
    }
    const last = doc.rounds.at(-1);
    assert.equal(await walkBack(last.hash, last.round), doc.commitment);
    assert.notEqual(await walkBack(last.hash, last.round - 1), doc.commitment);
  });
}

test("results are never below 1.00x", async () => {
  for (const game of ["crash", "slide"]) for (const r of vectors(game).rounds) assert.ok(r.result >= 100);
});
