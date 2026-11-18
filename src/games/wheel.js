// @ts-check
// Wheel: segment = floor(n0 * segments / 2^32); pays that segment's multiplier.

import { ints, scale } from "../stream.js";
import { oneOf, need } from "../params.js";
import { RISKS, SEGMENTS, TABLES } from "../tables/wheel.js";

export const id = "wheel";
export const name = "Wheel";
export const rulesVersion = "w1";

/** @param {any} p */
export function parseParams(p) {
  need(SEGMENTS.includes(p?.segments), `segments must be one of: ${SEGMENTS.join(", ")}`);
  return { risk: oneOf(p?.risk, RISKS, "risk"), segments: /** @type {number} */ (p.segments) };
}

/** @param {string} s @param {string} c @param {number|bigint} nonce @param {any} params */
export async function outcome(s, c, nonce, params) {
  const { risk, segments } = parseParams(params);
  const [n] = await ints(s, c, nonce, 1);
  const segment = scale(n, segments);
  return { outcome: { segment }, multiplier: TABLES[risk][segments][segment] * 100 };
}
