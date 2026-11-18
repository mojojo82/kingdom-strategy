# Rally design (in progress)

Started 19 Nov 2026 with Harley. Built so far: square-root troop damage (v1724). See "How rallies are calculated".

## Today
- The only rallies are Alliance Siege rallies against the boss (`sgRallyBattle`): one Arena-style fight. The leader's 5 heroes, fortress, weapons and cards fight, and every member's troops are pooled into one army. Troop damage is shared by troops sent, and the rest goes to the leader. Up to 15 members.
- There are no player-vs-player rallies yet; world PvP is one march against one city.

## How rallies are calculated (the rules - keep this up to date)
Harley, 19 Nov 2026. This is the agreed maths for rally fights (and world PvP). Built so far: troop damage (v1724). The hero line is still design / prototype only.

1. **One fight per rally, using the Arena engine** (no dice, 0.45 s ticks, 120 s time limit in world PvP).
2. **Hero line:** every participant's heroes queue in join order (the leader can reorder). 5 are on the field; when one is knocked out, the next in line walks in. Defence works the same way (city owner + garrison, join order). *(prototype only)*
3. **From the leader only** (city owner / garrison leader on defence): fortress tech, research / troop tech, gear and stat bonuses (ATK, HP, DEF, skill %), Sword of Power and other items, weapons, cards. They apply to everyone's heroes and troops on that side.
4. **From every participant:** their heroes (own level, stars, skill levels) and their troops (count, tier, type mix). All troops on a side are pooled into one army.
5. **Troop damage is square-root (built in v1724, like Kingshot):** a side's troop damage is normal up to **3,000 troops** (`WORLD_PVP_TROOP_SQRT_REF`), then grows with the square root of the side's total troops: 4x the troops = 2x the damage (12,000 troops hit like 6,000; 48,000 like 12,000). Code: `worldPvpAddTroops(..., sqrtRef)`.
6. **Troop HP stays linear:** every troop still adds its full HP (and DEF to the side's armour). Big armies last longer, but don't win by headcount alone - quality (tier, bonuses, heroes) matters.
7. **Where it applies:** world PvP (attacker and defender) now, and player rallies when they're built. Not (yet) the Alliance Siege boss rally or the boss simulator - they still use linear troop damage until Harley decides (it would lower big rallies' boss damage and so reward tiers).

Measured (v1724, `dev/balance/rally_power.js`, same numbers as the prototype): 15 players (Lv40, T3, 45,000 troops) vs one Lv80 T10 player with 9,000 troops - the rally won 79% with linear damage, 0% with square-root.

## Kingshot, for reference (checked 19 Nov 2026)
- **Leader:** their research, governor gear, charms, pets, buffs/consumables, hero gear and hero stats apply to EVERY troop in the rally, whoever sent it. All expedition skills of their 3 heroes apply (plus exclusive-gear skills). Rally capacity comes from the leader's Command Center.
- **Joiners count only for:** their troops (number, tier, type mix - tier sets the base stats the leader's buffs multiply) and ONE skill: the first expedition skill of their first-slot hero. 4 joiner skill slots in total, highest level first, ties by join order; stat skills stack, chance-based skills don't. 2nd/3rd heroes only raise the joiner's own march size.
- **Excluded for joiners:** research, governor gear, charms, pets, buffs/consumables, city buffs, hero stats and gear, and their 2nd/3rd heroes' skills.
- **Garrison (defence):** works like a rally; the garrisoned player with the highest stats becomes the rally leader automatically (stats + all 3 heroes' skills), others act as joiners.
- Sources: kingshotguides.com Advanced Rally Guide, kingshotguide.org rally guide, kingshot.net rally guide, kingshotguides.com joiner hero mechanics.

## Harley's direction: the hero line (reinforcement queue)
- Every participant's heroes are in the fight as a LINE: 5 on the field at a time; when one is knocked out, the next hero in line walks in (instead of the same hero reviving).
- Keeps the fight 5 vs 5, so positions, targeting, the fortress deck and skills work as now (15 Hanzos don't stack, only the ones on the field fire).
- **Order: join order, and the rally leader can reorder the line.**
- **The defending side uses the same logic:** the city owner's heroes plus garrison reinforcements form the defender's line, 5 on the field, next one in when one is knocked out.
- **Troops still count on both sides:** every participant's troops are pooled into each side's army and fight as in world PvP today (worldPvpAddTroops), alongside the hero line.

## Decided: what comes from the leader vs everyone (Harley, 19 Nov 2026)
- **From the leader only** (the rally leader on attack, the city owner / garrison leader on defence): all tech and stat bonuses - fortress tech (Fortress I/II/III tree), research (troop tech), gear / stat bonuses (ATK, HP, DEF, skill %), the Sword of Power and other equipped items, weapons and cards. These apply to everyone's heroes and troops in the fight.
- **From every participant:** their heroes (in the hero line, at their own level, stars and skill levels) and their troops (number, tier and type mix).
- Simple, like Kingshot (leader's stats apply to everything), but every participant's heroes actually fight instead of adding one skill.
- The prototype (`rally_line_proto.js` / `rally_power.js`) already works this way: leader's fortress, bonuses and troop tech for the whole side; each player's own hero levels and troops.

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
- **Kingshot does scale troops this way (checked 19 Nov):** community-tested Kingshot formulas all use the square root of troop count (e.g. "Damage scales with the Square Root of your troop count, not linearly" - kingshotguide.org; "army = sqrt(remaining troops x ...)" - kingshotguides.com bear trap guide). Not official (the devs don't publish the maths), but every source agrees. Harley's rule: follow Kingshot, so square-root troop damage is the plan.
- Side finding (fixed in v1723): world PvP's 120 s time limit was NaN in the code (set before the Arena limit exists), so world PvP fights currently stop at 60 s.
