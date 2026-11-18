// @ts-check
// Checks on bet options. A bad option is an input error, not a mismatch.

export class InputError extends Error {}

/**
 * @param {unknown} ok
 * @param {string} message
 * @returns {asserts ok}
 */
export function need(ok, message) {
  if (!ok) throw new InputError(message);
}

/**
 * @param {unknown} value
 * @param {number} min
 * @param {number} max
 * @param {string} name
 * @returns {number}
 */
export function int(value, min, max, name) {
  need(Number.isInteger(value) && /** @type {number} */ (value) >= min && /** @type {number} */ (value) <= max, `${name} must be a whole number from ${min} to ${max}`);
  return /** @type {number} */ (value);
}

/**
 * @param {unknown} value
 * @param {readonly string[]} allowed
 * @param {string} name
 * @returns {string}
 */
export function oneOf(value, allowed, name) {
  need(typeof value === "string" && allowed.includes(value), `${name} must be one of: ${allowed.join(", ")}`);
  return /** @type {string} */ (value);
}
