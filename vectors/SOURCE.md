# Where the test vectors come from

Every expected value in this folder was printed by the game servers' own
functions, with made-up seeds. None was typed by hand, and none was made by
this repository's code. No real player seed, round hash or chain commitment
is in here.

- `stream.json`, the 22 seed-game files, `crash.json`, `slide.json`: printed
  on 16 November 2026 by the games server's vector script, commit `5169dfe`.
  The game code there is the same as on the live release that day.
- `blackjack.json`: printed on 16 November 2026 by the Blackjack server's
  vector script, commit `b697f16`. The shuffle code there is the same as on
  the live release that day.

Each seed-game file carries the game's rules version. When a game's rules
change, its rules version changes, the vectors are printed again and this
verifier is released the same day.

Run the tests with `node --test`. Every vector must match exactly.
