// @ts-check
// Crates card table, rules version "p1": [rarity, multiplier in
// ten-thousandths, weight out of 10,000,000], highest multiplier first (the
// order tickets walk).

/** @type {[string, number, number][]} */
export const TABLE = [
  ["crown", 100000000, 2],
  ["legendary", 10000000, 15],
  ["legendary", 5000000, 40],
  ["epic", 1500000, 400],
  ["epic", 500000, 2000],
  ["rare", 150000, 10000],
  ["rare", 50000, 30000],
  ["rare", 20000, 100000],
  ["rare", 10000, 300000],
  ["uncommon", 8000, 400000],
  ["uncommon", 4000, 600000],
  ["uncommon", 2000, 900000],
  ["uncommon", 1000, 1200000],
  ["common", 400, 400000],
  ["common", 300, 700000],
  ["common", 200, 1442457],
  ["common", 100, 3915086],
];
