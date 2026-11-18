# DiceCity provably fair verifier

Check a DiceCity game result yourself, on your own computer, with no network.
You give it the values the game shows you. It works out the result again and
tells you if it matches.

DiceCity is an online casino. Our one address is dicecity.com. Operator and
licence details are on dicecity.com. You must be 18 or older to play.

The code is plain JavaScript with no dependencies. It needs Node.js 20 or newer.

## Quick start

```sh
node bin/verify.mjs dice \
  --server-seed 9c1f4e7a2b8d3065f1a7c4e92d0b6f38a5e1c7d94b2f6083e7a1d5c9f3b8e026 \
  --client-seed lucky-street-7 --nonce 42 \
  --target 50.50 --condition over \
  --hash ba83514ec5dc3fd819fb8b06a098f3b947538f139dca913cf5776a2a98f18c6f
```

```
dice
  server seed hash: ba83514ec5dc3fd819fb8b06a098f3b947538f139dca913cf5776a2a98f18c6f
  options: {"target":5050,"condition":"over"}
  outcome: {"roll":5110,"win":true}
  multiplier: 2.0000x
  PASS server seed fits the hash shown before the bet
```

This is the same worked example as on dicecity.com/fair-play. The roll 5110
means 51.10.

Run `node bin/verify.mjs --help` for every game and option. Add `--json` for
output a program can read. To check many bets at once, put them in a JSON
file and run `node bin/verify.mjs --file bets.json` (see "Checking many bets").

Exit code: `0` every check passed, `1` a check failed, `2` bad input.

## What you need, and where to find it

Open the game, then its **Fairness** window.

| Method | Value | Name in the Fairness window | When you can see it |
|---|---|---|---|
| Seed pair | hash of the server seed | Active server seed (hashed) | before you bet |
| | client seed | Client seed | before you bet |
| | nonce | Nonce | on every bet |
| | server seed | Revealed server seed | after you change your seed pair |
| Hash chain (Crash, Slide) | round hash | Round hash | after the round ends |
| | salt | Salt | always |
| | commitment | Commitment (hash 0) | before round 1 of the chain |
| | previous hash | Previous hash | after that round ends |
| Blackjack | server seed hash | shown before the hand | before the hand |
| | server seed, client seed, final shuffle | in the hand's fairness record | after the hand ends |

A server seed is shown only after its seed pair is retired. To see it, change
your seed pair in the Fairness window. You cannot change it while a bet of that
pair is still in play.

## The three methods

### 1. Seed pair (22 games)

Every seed game uses the same stream of numbers.

- **Server seed**: 32 random bytes, written as 64 lower-case hex characters.
- **Hash shown before you bet**: SHA-256 of the server seed **text** (its 64
  characters as bytes), written as lower-case hex.
- **Client seed**: your text, 1 to 64 printable characters.
- **Nonce**: the bet number in this seed pair: 0, 1, 2 ...

For one bet, round `r` (0, 1, 2 ...) of the stream is:

```
HMAC-SHA256(key = server seed text, message = "<client seed>:<nonce>:<r>")
```

The rounds are joined. Every 4 bytes, read big-endian, are one unsigned 32-bit
number `n`. One round gives 8 numbers. A game that needs more reads round 1,
then round 2, and so on.

A game turns `n` into a whole number below `k` with:

```
floor(n * k / 2^32)
```

This repository does that with exact integers.

Worked example (the quick start above): HMAC-SHA256 with key
`9c1f4e7a...e026` over `lucky-street-7:42:0` starts with the number
`2194913779`. Dice uses `k = 10001`: `floor(2194913779 * 10001 / 2^32) = 5110`,
so the roll is 51.10.

"Without replacement" below means: start from a list; step `i` takes position
`floor(n_i * (items left) / 2^32)` of the items still left and removes it.

All seed games share one seed pair per player, except Plinko, which has its own.

### 2. Hash chain (Crash, Slide)

Crash and Slide have one result per round, the same for every player.

- The chain is made backwards from a hidden random last hash. Each hash is the
  SHA-256 of the next one: `hash(k - 1) = SHA-256(hash k)`. The hash is hashed
  as its 64-character hex **text**.
- `hash 0` is the **commitment**. It is shown before round 1 of the chain.
- Round `k` uses `hash k`. So a revealed round hash, hashed once, must equal
  the previous round's hash; hashed `k` times, it must equal the commitment.

The result of a round:

```
n      = first 52 bits of HMAC-SHA256(key = round hash text, message = salt)
result = max(100, floor(99 * 2^52 / (2^52 - n)))      # hundredths: 172 = 1.72x
```

Crash ends at the result. A Slide target wins when it is at or below the result.
About 1.98% of rounds end at 1.00x.

Example (made-up chain from `vectors/crash.json`):

```sh
node bin/verify.mjs crash \
  --hash 99e2736d1beda4186f0465ffd0c94977860023cdea1eb74d0e0ee32eb23fa555 \
  --salt pf-vector-crash-salt \
  --commitment 6845e0f5f8e60d955dc592a46df62e00833fcdd43707acc21a4ed8a6da1c9630 --round 1
```

```
crash
  result: 1.72x
  PASS hash walks back 1 step to the commitment
```

For a late round, `--round` can be in the millions. Each step is one SHA-256,
about 10 to 15 seconds per million steps on a laptop. `--previous-hash` checks
just one link and is instant. The salt is needed only for the result: without `--salt`,
the verifier checks just the chain links.

### 3. Blackjack shuffle

Each hand has a new shuffle of an 8-deck shoe (416 cards). There is no nonce.

- **Server seed**: 12 random bytes, written as 24 upper-case hex characters.
- **Hash shown before the hand**: SHA-256 of the server seed text, upper-case
  hex. Compare it without regard to case.
- **Client seed**: letters and digits only. Other characters are removed. If
  fewer than 2 are left, the table uses a random 128-character seed instead.
  Use the seed the hand's record shows. A multiplayer hand can have several
  client seeds; they are joined newest first, right after the server seed.

Draw `k`, for `k = 0, 1, ... 414`:

```
input   = server seed text + client seed text + k as 4 bytes big-endian   (no separator)
digest  = SHA3-384(input)                           # 48 bytes
key     = digest[0..31]                             # AES-256 key
counter = digest[32..47]                            # first counter block
block   = AES-256-CTR(key, counter), first 16 bytes of keystream
acc     = XOR of the block's four 32-bit parts, each read little-endian
r[k]    = 0.5 + int32(acc) / 0xFFFFFFFF             # a number in about [0, 1)
```

The shoe before the shuffle is 8 times: clubs, diamonds, hearts, spades, each
from Ace down to 2. Card codes are rank then suit: `AC,KC,QC,JC,10C,9C,...,2S`.

The shuffle (Fisher-Yates, from the last card down):

```
for i = 415 down to 1:
  j = trunc(r[415 - i] * (i + 1))      # trunc, not floor: r can be a hair below 0
  swap(shoe[i], shoe[j])
```

Cards are dealt from the top of the shoe (position 0 first): player, dealer,
player, dealer, then the rest as the hand is played.

Example (made-up seeds from `vectors/blackjack.json`):

```sh
node bin/verify.mjs blackjack \
  --server-seed 7E1A2A98FB117828EE8740BE --client-seed lucky7 \
  --hash 90FE976F1AFA079F60DA9B7B54311DA7C419D6D13A14D318A2105D2C40D9F57F \
  --cards 2D,JS,10C,7S
```

The verifier checks the hash, the full shoe (`--deck`, the hand's recorded
final shuffle) and that the dealt cards (`--cards`) are the top of the shoe. It
does not replay the playing rules.

## The games

The id is what you type on the command line. "n0" is the first number of the
stream, "n_j" the number at position j. Multipliers are shown as `x`;
in the code they are whole ten-thousandths (2.0000x is 20000).

| Game | id | How the stream becomes the result | Rules version |
|---|---|---|---|
| Dice | `dice` | roll = floor(n0 * 10001 / 2^32), 0.00 to 100.00; over wins above the target, under below it; win pays floor(99 / chance%) to 4 decimals | d1 |
| Limbo | `limbo` | result = floor(99 * 2^32 / (n0 + 1)) hundredths, between 1.00x and 1,000,000x; wins when the result is at least the target, pays the target | l1 |
| Plinko | `plinko` | row i goes right when floor(n_i * 2 / 2^32) = 1; slot = number of rights; pays the table for rows and risk | rh1 |
| Keno | `keno` | 10 numbers without replacement from 1..40; pays the table for risk, picks and hits | k1 |
| Mines | `mines` | the first `mines` tiles without replacement from 0..24 are the mines | m1 |
| Balloon Pop | `pump` | 1, 3, 5 or 10 pops placed like Mines over 0..24; pump k is safe unless position k - 1 is a pop | p1 |
| HiLo | `hilo` | card j = floor(n_j * 52 / 2^32): rank floor(card / 4) + 1 (Ace = 1), suit card mod 4; card 0 is the start card | h1 |
| Wheel | `wheel` | segment = floor(n0 * segments / 2^32); pays that segment | w1 |
| Skyscraper | `tower` | 9 rows; row r uses its own numbers, eggs drawn without replacement from its tiles | t1 |
| Chicken | `chicken` | lane j is deadly when floor(n_j * 25 / 2^32) < risk | c1 |
| Roulette | `roulette` | pocket = floor(n0 * 37 / 2^32), 0..36 (single zero); a chip on k numbers pays floor(36 / k) times its units | r1 |
| Baccarat | `baccarat` | 6 cards, floor(n * 52 / 2^32) each; dealt player, banker, player, banker, then third cards by the standard table | b1 |
| Video Poker | `videopoker` | 10 cards without replacement from 0..51; 0-4 the deal, 5-9 replace discards from left to right | v1 |
| Diamonds | `diamonds` | 5 gems, floor(n * 7 / 2^32) each; pays by how the colours group | d1 |
| Flip | `flip` | 20 coins, heads when floor(n_j * 2 / 2^32) = 0 | f1 |
| Rock Paper Scissors | `rps` | 64 house throws, floor(n_j * 3 / 2^32): 0 rock, 1 paper, 2 scissors | r1 |
| Cases | `cases` | ticket = floor(n0 * 100000 / 2^32), walked through the prize table, lowest prize first | c1 |
| Darts | `darts` | ticket as Cases, walked through the zones from the outside in | t1 |
| Alley Run | `snakes` | 20 dice, floor(n_j * 6 / 2^32) + 1, two per roll | s1 |
| Manholes | `moles` | 8 or 9 rounds; each round's holes drawn without replacement from 0..6 | o1 |
| Crates | `packs` | 5 tickets, floor(n_i * 10000000 / 2^32), walked through the card table highest first; pays the sum, trimmed | p1 |
| Vault | `bars` | 30 tickets, floor(n_j * 100000 / 2^32), walked through the table lowest first; pays the average of your picks | b1 |
| Crash | `crash` | hash chain, see above | x1 |
| Slide | `slide` | hash chain, see above | s1 |
| Blackjack | `blackjack` | seeded shuffle, see above | |

The full tables (Plinko, Keno, Wheel, Cases, Darts, Crates, Vault) are in
`src/tables/`. Each game's exact rules are in `src/games/<id>.js`.

**Stepped games** (Mines, Balloon Pop, HiLo, Skyscraper, Chicken, Flip, Rock
Paper Scissors, Alley Run, Manholes, Video Poker): the whole hidden layout is
fixed when you bet. The verifier prints that layout and the multiplier after
each safe step. What your bet paid then follows from your own moves. For
Video Poker, add `--held 0,1` to see the final hand for the cards you held.

## What a check proves, and what it does not

A check that passes proves this: **the result of the bet was fixed before you
bet, by a server seed (or chain) that was committed to with a hash, and it was
not changed after.**

Please also read these limits. We state them plainly because they are true of
the system as it is today.

**1. New seed pairs.** When you change your seed pair, the new server seed is
made in the same step that takes your new client seed. Its hash is not shown to
you before you choose that client seed. The client seed of your first seed pair
is made by the server. So a check proves that each result was fixed before the
bet and not changed after. It does **not** prove that the house could not have
picked the server seed with your client seed in view.

**2. Crash and Slide salt.** A chain's salt is set when the chain is made, and
it is stored together with the chain. So the house knows the whole chain and
its salt before round 1. A check proves that a round's result follows from the
commitment shown before the chain started, and was not changed after. It
cannot prove that the chain itself was not picked.

**3. A matching hash alone does not check the result.** It only proves the
server seed is the one that was committed. Run the game's check to see that the
result follows from it.

**4. Provably fair does not change the house edge.** Over many bets every game
pays back less than you bet. Each game's return to player (RTP) is listed on
dicecity.com/fair-play. As listed there on 16 November 2026:

| Game | RTP |
|---|---|
| Alley Run, Cases, Chicken, Crates, Darts, Flip, HiLo, Manholes, Mines, Balloon Pop, Rock Paper Scissors, Skyscraper, Vault | 98.99% |
| Dice | 98.98-98.99% |
| Limbo | 98.97-99.00% |
| Crash, Slide, Wheel | 98.99-99.00% |
| Keno | 98.65-98.99%, depends on risk |
| Plinko | 98.86-99.35%, depends on rows and risk |
| Diamonds | 98.91% |
| Video Poker | 98.94% with perfect play |
| Roulette | 97.29% |
| Baccarat | 85.88-98.93% (the tie bet is 85.88%) |
| Blackjack | about 99.3% with basic strategy |

The page dicecity.com/fair-play is the reference. If it differs from this
table, the page is right.

## How this repository is kept identical to the game servers

- Every expected value in `vectors/` was printed by the game servers' own
  functions, with made-up seeds. None was typed by hand or made by this code.
  See `vectors/SOURCE.md`.
- For each seed game: at least 50 nonces, every option value, client seeds
  with spaces and a colon, a 64-character client seed, and games that read past
  the first 8 numbers. Also the full pay tables, both sides of every table
  edge, every Baccarat third-card case, and every Video Poker and Diamonds hand.
- Crash and Slide: 200 rounds of a made-up chain each, with every link.
- Blackjack: the default shoe, raw draws and six full shuffled shoes.

Run the tests (Node 20 or newer, nothing to install):

```sh
node --test
```

Every vector must match exactly. When a game's rules change, its rules version
changes, the vectors are printed again from the servers and this verifier is
released the same day.

## Checking many bets

```json
[
  { "game": "dice", "server_seed": "...", "client_seed": "...", "nonce": 42,
    "params": { "target": 5050, "condition": "over" }, "hash": "...",
    "expect": { "outcome": { "roll": 5110 }, "multiplier": 20000 } },
  { "game": "crash", "hash": "...", "salt": "...", "previous_hash": "...", "expect": { "result": 172 } },
  { "game": "blackjack", "server_seed": "...", "client_seed": "...", "hash": "...", "deck": "AC,KC,...", "cards": "2D,JS" }
]
```

In a file, options use the games' own units: targets in hundredths
(50.50% is 5050, 2.00x is 200) and multipliers in ten-thousandths. `expect` is
what the bet's record shows; only the fields you give are compared.

The library in `src/` can be used by other programs and pages: see
`src/index.js` and `verify()` in `src/verify.js`.

## Not covered

- **Book of Gold and Gilded Ronin**: they use the same seed stream, but
  checking them needs their full slot tables. Planned for a later version.
- **Games from partner studios**: these are not provably fair. This verifier
  cannot check them.
- **Player-versus-player and chat games**: not in this version.

## Reporting a problem

- **A bug in the verifier or the method**: open an issue with the template.
  Use revealed seeds only.
- **A security problem**: do not open an issue. See `SECURITY.md`.
- **Your account, a deposit, a withdrawal or a bet**: contact support on
  dicecity.com. These are not answered here.

Never post the seeds of a seed pair you are still playing with.

## Licence

The code is under the MIT licence (`LICENSE`). The DiceCity name and logo are
not covered by the licence. Changes are listed in `CHANGELOG.md`.
