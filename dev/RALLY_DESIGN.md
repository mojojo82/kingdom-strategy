# Rally design (in progress)

Started 19 Nov 2026 with Harley. Nothing built yet.

## Today
- The only rallies are Alliance Siege rallies against the boss (`sgRallyBattle`): one Arena-style fight. The leader's 5 heroes, fortress, weapons and cards fight, and every member's troops are pooled into one army. Troop damage is shared by troops sent, and the rest goes to the leader. Up to 15 members.
- There are no player-vs-player rallies yet; world PvP is one march against one city.

## Kingshot, for reference
- The leader's heroes and stats fight. Each joiner adds only the first expedition skill of their first-slot hero, at most 4 joiner skills, with same-type buffs adding and different types multiplying. Joiner hero stats don't count.

## Harley's direction: the hero line (reinforcement queue)
- Every participant's heroes are in the fight as a LINE: 5 on the field at a time; when one is knocked out, the next hero in line walks in (instead of the same hero reviving).
- Keeps the fight 5 vs 5, so positions, targeting, the fortress deck and skills work as now (15 Hanzos don't stack, only the ones on the field fire).
- **Order: join order, and the rally leader can reorder the line.**

## Still to decide
1. Defender side: a matching line (alliance garrison reinforcing a city, like Kingshot), or rally size scaling the defender.
2. Fight length: time limit / defender fortress HP vs a 75-hero line.
3. A new arrival's skill timer: ready or full.
4. Whose fortress, weapons and cards count (the leader's today).
5. Damage credit per player for rewards.

## Next step
- Prototype in `dev/balance` only: 15x5 line vs a 5-hero defender, with and without a garrison line; report odds and fight length.
