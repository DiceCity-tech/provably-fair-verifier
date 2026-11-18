// @ts-check
// Every seed-pair game, by id.

import * as baccarat from "./baccarat.js";
import * as bars from "./bars.js";
import * as cases from "./cases.js";
import * as chicken from "./chicken.js";
import * as darts from "./darts.js";
import * as diamonds from "./diamonds.js";
import * as dice from "./dice.js";
import * as flip from "./flip.js";
import * as hilo from "./hilo.js";
import * as keno from "./keno.js";
import * as limbo from "./limbo.js";
import * as mines from "./mines.js";
import * as moles from "./moles.js";
import * as packs from "./packs.js";
import * as plinko from "./plinko.js";
import * as pump from "./pump.js";
import * as roulette from "./roulette.js";
import * as rps from "./rps.js";
import * as snakes from "./snakes.js";
import * as tower from "./tower.js";
import * as videopoker from "./videopoker.js";
import * as wheel from "./wheel.js";

/**
 * @typedef {object} SeedGame
 * @property {string} id
 * @property {string} name
 * @property {string} rulesVersion
 * @property {boolean} [stepped]
 * @property {(params: any) => any} parseParams
 * @property {(serverSeed: string, clientSeed: string, nonce: number | bigint, params: any) => Promise<{outcome: any, multiplier: number}>} outcome
 */

/** @type {Record<string, SeedGame>} */
export const GAMES = Object.fromEntries(
  [baccarat, bars, cases, chicken, darts, diamonds, dice, flip, hilo, keno, limbo, mines, moles, packs, plinko, pump, roulette, rps, snakes, tower, videopoker, wheel].map(
    (g) => [g.id, /** @type {SeedGame} */ (g)],
  ),
);
