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
- **The defending side uses the same logic:** the city owner's heroes plus garrison reinforcements form the defender's line, 5 on the field, next one in when one is knocked out.
- **Troops still count on both sides:** every participant's troops are pooled into each side's army and fight as in world PvP today (worldPvpAddTroops), alongside the hero line.

## Still to decide
1. (Decided: defender uses the same line logic.) Garrison order: join order + city owner can reorder?
2. Fight length: time limit / defender fortress HP vs a 75-hero line.
3. A new arrival's skill timer: ready or full.
4. Whose fortress, weapons and cards count (the leader's today).
5. Damage credit per player for rewards.

## Next step
- Prototype in `dev/balance` only: 15x5 line vs a 5-hero defender, with and without a garrison line; report odds and fight length.

## Prototype results (19 Nov, `dev/balance/rally_line_proto.js`)
Lv80, random 5 heroes per player, 12 fights per row, hero line + pooled troops on both sides. Benched heroes deal no damage (checked).

| Troops per player | 15 v 15 | 15 v 10 | 15 v 5 | 15 v 1 | 15 v 15 fight length | Heroes used per side (15 v 15) |
|---|---|---|---|---|---|---|
| 3,000 | 63% | 100% | 100% | 100% | ~7 s | ~13 of 75 |
| 300 | 54% | 100% | 100% | 100% | ~31 s | ~29 of 75 |
| 0 | 46% | 25%* | 100% | 100% | hits the time limit | ~42 of 75 |

\* decided at the time limit (the prototype used the 60 s Arena limit; world PvP is 120 s).

- With thousands of pooled troops, troops do ~97% of the damage, the fight is over in seconds, and most of the line never gets used: the side with more troops wins outright.
- The hero line matters when troops are small (or scaled down for rallies).
- Open questions from this: how much troops vs heroes should decide a rally (e.g. troop damage with diminishing returns as the rally grows, or a lower rally troop cap), and the time limit / tie-break for long hero-heavy fights.

## Power vs numbers (19 Nov, `dev/balance/rally_power.js`)
Harley: progress and power must matter - in Kingshot one strong player can solo a 15-person rally.
Rally = 15 players with Lv40 heroes and T3 troops (3,000 each, 45,000 total). Defender = 1 player with Lv80 heroes and T10 troops. Rally win %:

| Solo defender | Linear troop damage (now) | Square-root troop damage |
|---|---|---|
| T10, 3,000 troops | 100% | 92% |
| T10, 9,000 troops | 79% | **0%** |
| T10, 9,000 troops, +100% ATK/HP | 0% | 0% |
| T10, 30,000 troops, +100% ATK/HP | 0% | 0% |

- Power already matters (tiers, bonuses), but with linear troop damage headcount is very strong.
- Square-root troop damage (damage grows with the square root of troop count, like Kingshot-style games) makes quality beat headcount much sooner, and fights last longer (9-13 s instead of 4-5 s), so the hero line gets more turns.
- Side finding: world PvP's 120 s time limit is NaN in the code (set before the Arena limit exists), so world PvP fights currently stop at 60 s.
