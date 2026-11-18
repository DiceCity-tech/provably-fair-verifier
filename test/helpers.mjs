// Shared by the tests: read a vector file.
import { readFileSync } from "node:fs";

/** @param {string} name */
export const vectors = (name) => JSON.parse(readFileSync(new URL(`../vectors/${name}.json`, import.meta.url), "utf8"));
