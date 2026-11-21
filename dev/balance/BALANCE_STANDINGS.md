# Balance standings: snapshot before Iron Lily

Taken 15 Nov 2026 on TEST **v1613**. Harley's decision: **no more balance changes until Iron Lily is complete.** Then rerun these tests and compare. First Iron Lily results are in section 5. Latest tier list: section 9.

**Test setup:** every hero Lv80, 5 stars, all skills Lv5, no weapons, no cards, Hanzo left out. All headless (not tested on a phone).

**Skills switched off at this point:**
- Bram's Pressure Build ("very very strong")
- Vesper's Clean Code ("very very strong")
- Caelum's Wing Guard
- Aurek's Faithful
- Lyra's Eagle Eye

Seraphine has Shatterpoint (boss damage only, so it does nothing here).

## 1. Ranged vs melee team fights

5 ranged (fortress riders) vs 5 melee heroes. Every team against every team, both sides, 3 seeds each: 2,016 fights, no draws.

**Overall: ranged 31%, melee 69%.**

| Melee team | Win % |
|---|---|
| Gareth, Bram, Torvald, Aurek, Halo-7 | 91 |
| Gareth, Bram, Torvald, Halo-7, Caelum | 90 |
| Bram, Torvald, Aurek, Halo-7, Caelum | 77 |
| Gareth, Torvald, Aurek, Halo-7, Caelum (no Bram) | 63 |
| Gareth, Bram, Aurek, Halo-7, Caelum | 58 |
| Gareth, Bram, Torvald, Aurek, Caelum (no Halo-7) | 32 |

| Best ranged teams | Win % |
|---|---|
| Lyra, Roran, Kessa, Juno, Pip | 75 |
| Lyra, Roran, Kessa, Pip, Vesper | 75 |
| Lyra, Roran, Kessa, Sera, Pip | 64 |
| Roran, Kessa, Juno, Pip, Vesper | 61 |
| Lyra, Roran, Kessa, Pip, Seraphine | 58 |

- **Worst ranged teams:** Sera + Vesper + Seraphine together, 0–3%.
- **Ranged teams with Vesper:** 30%. **Without her:** 34%.
- **Bram and Halo-7** are the key melee heroes. **Pip** is the key ranged hero.

**Why melee looks stronger even though the best ranged teams win 75%:**
- Melee has only 7 heroes (Hanzo left out), so there are just 6 melee teams, each nearly the full melee line-up. You can't build a bad melee team.
- Ranged has 9 heroes, so there are 126 ranged teams. Most of them include weak ranged heroes (Sera, Vesper, Seraphine, Juno) and lose badly. That drags the average down.
- **So when balance is looked at again:** lifting the weakest ranged heroes may matter more than weakening melee.

## 2. 1v1 duels (hero strength ranking)

Each hero fights every other hero 1v1 (3 seeds each way, Hanzo included). The second number is solo damage to the Boss Rush kaiju in 60 seconds.

| Hero | Duel win % | Kaiju damage |
|---|---|---|
| Hanzo | 100 | 64,000 |
| Roran | 85 | 43,848 |
| Kessa | 74 | 42,266 |
| Lyra | 70 | 41,468 |
| Gareth | 67 | 42,496 |
| Pip | 65 | 34,949 |
| Bram | 61 | 30,931 |
| Torvald | 57 | 37,333 |
| Caelum | 56 | 19,435 |
| Halo-7 | 38 | 18,656 |
| Juno | 30 | 26,616 |
| Sera | 20 | 15,189 |
| Aurek | 20 | 19,510 |
| Vesper | 8 | 16,034 |
| Seraphine | 0 | 14,273 |

## 3. History of the swing

| Version | Change | Ranged | Melee |
|---|---|---|---|
| before v1607 | (morning of 15 Nov) | 87% | 13% |
| v1607 | Seraphine's Crystal Focus gone | 64% | 36% |
| v1608 | Vesper's Clean Code gone | 27% | 73% |
| v1609 | Bram's Pressure Build added | 21% | 79% |
| v1611 | Wing Guard and Faithful off | 23% | 77% |
| v1612 | Pressure Build off | 31% | 69% |
| v1613 | Clean Code back on her card, off | **31%** | **69%** |
| v1640 | (Lily in the melee pool, now 8 melee / 21 melee teams) | **55%** | **45%** |
| v1641 | Roran's Arena hit = card; Hanzo and Lily both left out | **23%** | **77%** |

## 4. Tested, not applied: a stronger Orbital Patch (Vesper's main skill)

Results by how much stronger Orbital Patch is made:

| Strength | Damage per beam (skill Lv5) | Ranged | Melee | Teams with Vesper | Teams without her |
|---|---|---|---|---|---|
| ×1 (now) | 66% | 31% | 69% | 30% | 34% |
| ×1.5 | 99% | 40% | 60% | 44% | 34% |
| ×2 | 132% | 51% | 49% | 61% | 34% |
| ×3 | 198% | 69% | 31% | 91% | 34% |
| ×4 and up | 264%+ | 75% | 25% | 99–100% | 34% |

- **×2 evens the overall number**, but only through teams that include Vesper. Ranged teams without her stay at 34%.
- **Her 1v1 duel stays at 8% even at ×2.** The skill fires every 12 seconds, and duels usually end before that.

## 5. Iron Lily added (v1615): first results

Her new main skill is **Crimson Tempest**, a sword flurry. It deals 120–400% of her attack to **every legal target inside the slash radius**, with no target limit. Crimson Oath and Blade Wall are switched off, and Iron Will is deleted. She is still "coming soon", so in these tests she was un-hidden on the test page only.

| Test | Result |
|---|---|
| 1v1 duels | Hanzo 100, **Lily 87**, Roran 78, Kessa 68 (her skill off: 49) |
| 5 ranged vs 5 melee, Lily in the melee team | **Melee 98%** (69% without her) |
| Best melee teams with Lily vs the 3 best ranged teams | **100%** (40–80% without her) |
| Hanzo + 4 vs Lily + the same 4 (all 15 teammate sets, 300 fights) | **Hanzo's team wins 300–0** |

- **Why she's so strong against ranged teams:** at the enemy fortress, one flurry catches the fortress and every hero on its deck.
- **Why Hanzo still beats her:** Shuriken Storm hits everything every 5 seconds, and Shadow Step makes him dodge her.
- **Harley's verdict:** "Lily is an absolute monster but Hanzo still dices her". Kept as is for now.

## 6. Tested, not applied: melee normal attacks can't hit ranged heroes (16 Nov, v1640)

Harley's idea: melee normal attacks only hit melee heroes and the fortress; skills (e.g. Aurek's full-screen slam) still hit ranged heroes. Same 5 vs 5 test (21 melee teams x 126 ranged teams, 2,016+ fights). Melee ATK multiplier also applies to their skills (skills ride on the basic hit).

| Setup | Ranged | Melee |
|---|---|---|
| Today | 55% | 45% |
| Rule on, melee ATK x1 | 100% | 0% |
| x2 | 100% | 0% |
| x3 | 100% | 0% |
| x4 | 53% | 47% |
| x5 | 52% | 48% |
| x6 | 52% | 48% |
| x8 | 5% | 95% |

- **x4 looks even, but it's all-or-nothing:** the 10 melee teams with **both Aurek and Halo-7** win ~100%; the other 11 win 0% (still 0–1% at x6).
- **Which ranged heroes you take stops mattering:** every ranged team scores ~51–54% at x4–x6.
- Why: without hitting riders, melee can only win the damage race on the fortress; the ranged team keeps all its damage the whole fight.
- Switches in the game (both off): `ARENA_MELEE_BASIC_SKIPS_RANGED`, `ARENA_MELEE_ATK_MULT`. Results: `dev/balance/results/rvm_v1640_*.json`.

## 7. Roran's Arena fix and how random Arena is (16 Nov, v1641)

All tests Lv80, 5 stars, skills Lv5, **Hanzo and Lily left out**.

**Roran's Arena normal attack now matches his card (v1641, applied).** Before, Arena added his ×1.54 on top (640 vs card 416).

| Test | Before | After |
|---|---|---|
| Roran 1v1 duels | 92% (1st) | 42% (9th of 14) |
| Average 5 melee vs average 5 ranged: melee wins | 69% | 77% |
| Melee teams vs best ranged team (Lyra, Roran, Kessa, Juno, Pip) | 25% | 33% |

**Weapons (missile + laser + railgun):**
- Same heroes both sides, only one side armed: Lv50 wins 78%, Lv25 65%, Lv10 64%. Lv50 vs Lv25: 66%.
- Weaker hero team with Lv50 weapons vs stronger team unarmed: weaker wins 63%.

**How random fights are (Fortress 1):** same matchup run 10 times, about 85% of matchups end up between 3 and 7 wins out of 10 (with or without weapons, all-ranged or all-melee alike).

**How much stronger a side must be (same heroes, +X% ATK / HP / skill):**

| Stronger by | Fortress 1 | F1, cannon crits off | F1, first-swing random off | Fortress 2 | Fortress 3 |
|---|---|---|---|---|---|
| 5% | 60% | 99% | 60% | 91% | 100% |
| 10% | 62% | 100% | 62% | 96% | 100% |
| 20% | 68% | 100% | 68% | 100% | 100% |
| 50% | 93% | 100% | 93% | 100% | 100% |

- On Fortress 1, about **+45–50% is needed for 90% wins**, almost all because of cannon crits (20% chance of a ×2 "super burst", each side its own pattern). Fortress 2 and 3 have no cannon crits, so the stronger side wins almost every time.
- **Harley's decision:** keep it. He wants crits to be somewhat random.

## 8. Full team ranking with Tom (17 Nov, v1692)

100 random 5-hero teams from the whole roster: 20 each with Iron Lily, Kessa, Hanzo or Tom, and 20 with none of them. Never two of those four in one team. Every team fights every other team, both sides, 2 seeds: 19,800 fights per level. Tom here has v1692's kit: damage on two slashes that only hit what they touch, guard + push-back, untouchable mid-leap.

| Teams with | Lv40 avg win | Lv40 avg rank | Lv80 avg win | Lv80 avg rank |
|---|---|---|---|---|
| Hanzo | 57.4% | 43 | **86.8%** | **12** |
| Kessa | **65.9%** | **32** | 52.2% | 48 |
| none of the four | 48.1% | 52 | 45.7% | 54 |
| **Tom** | **47.1%** | **54** | **38.0%** | **64** |
| Iron Lily | 31.5% | 72 | 27.4% | 75 |

- **Tom teams:** best rank 5 (Lv40) / 19 (Lv80), for Vesper + Lyra + Pip + Zarek + Tom. Worst 98 / 97.
- **Per hero** (average of the teams he's in), Lv80: Hanzo 87, Halo-7 65, Lyra 58 ... **Tom 38 (16th of 18)**, Torvald 35, Iron Lily 27. Lv40: Tom 11th.
- So Tom is now about an average hero at Lv40 and below average at Lv80, well under Kessa and Hanzo.
- Rerun: `node dev/balance/team_rank.js --per 20 --seeds 2 --levels 40,80`.

## 9. Tier list (18 Nov, v1722)

Fresh full team ranking (`team_rank.js --per 20 --seeds 2 --levels 40,80`, 100 random teams, 19,800 fights per level, no cards, no weapons). Per hero = average win % of the teams they are in. Pip's Spotter's Mark is off (v1721). Baelgor is not in the game yet.

| Tier | Heroes (Lv80 team win %) |
|---|---|
| **S+** | Hanzo 82 |
| **S** | Halo-7 66 |
| **A** | Lyra 57, Caelum 56, Zarek 54, Kessa 54 (66 at Lv40, card off), Roran 53 |
| **B** | Juno 51, Gareth 50, Seraphine 47, Vesper 46, Sera 46, Bram 46, Pip 45 |
| **C** | Aurek 43, Tom 38, Torvald 37, Iron Lily 31 |

Results: `dev/balance/results/team_rank_v1722.log`, `tier_list_v1722.json`.

## 10. Iron Lily: a niche counter-pick (18 Nov, v1722)

`dev/balance/lily_scenarios.js`: Lily teams of each make-up vs each opponent type, Lv80, ~2,000 fights.

| Lily's team | vs all-ranged | vs all-melee | vs mixed | vs Kessa teams | vs Hanzo teams |
|---|---|---|---|---|---|
| Lily + 4 melee | 99% | 85% | 56% | 43% | 12% |
| Lily + 2 melee + 2 ranged | 87% | 84% | 31% | 16% | 5% |
| Lily + 4 ranged | 64% | 58% | 29% | 14% | 6% |
| Same teams, Aurek instead of Lily | 64% | 58% | 31% | 19% | 3% |

- She ranks last in the tier list because random teams give her mostly ranged teammates and mixed / Hanzo / Kessa opponents, which are her worst matchups.
- **Harley's decision: leave her as is.** Her role is the counter-pick vs ranged-heavy teams and the anchor of melee line-ups. Don't buff her for mixed-team strength.

## How to rerun

- `dev/balance/ranged_vs_melee.js` (team fights; `SKIPR=1` turns the rule above on, `MULT=n` multiplies melee ATK)
- `dev/balance/hero_rank_solo.js` (duels + kaiju)
- `dev/balance/team_rank.js` (full random teams, at most one of Lily / Kessa / Hanzo / Tom each)
- `dev/balance/lily_scenarios.js` (Lily team make-ups vs opponent types)
- `dev/balance/weapons_impact.js`, `arena_determinism.js` (`POOL=ranged|melee`), `arena_statgap.js` (`NOCRIT=1`, `NOSTAGGER=1`, `FORT=1|2|3`)
- All take `EXCL=hanzo,ironlily`; ranged_vs_melee.js and hero_rank_solo.js also take `OLDARENA=1` (Roran's old Arena hit).

The Orbital Patch sweep is a copy of ranged_vs_melee that multiplies `HERO_DEFS.vesper.conquestSkills[0].pctByLevel` in the page.

## Arena fight length (20 Nov 2026, TEST v1752) - kept on purpose
Harley: long fights are fine - "it gives me room to make new things stronger". No change made.
Measured with dev/balance/fort_vs_fort.js (all heroes Lv80, 5 full stars, skills 5, maxed fortress research; no weapons / Esper / cards; 160 fights each; 60 s timer):
F1 vs F2 26 s (1% to the timer) | F1 vs F1 30 s (16%) | F2 vs F2 54 s (63%) | F1 vs F3 58 s (72%) | F2 vs F3 59 s (84%) | F3 vs F3 60 s (100%).
F3's maxed research (+90% HP, 33% damage reduction) is what drags fights out. Bots roll F1 no-research 20% / F1 ~27% / F2 ~27% / F3 ~27%.
Options noted if fights ever need shortening: trim F3's tank research, sudden death after 30 s, heroes x1.3 vs fortresses, -20% fortress HP, fewer F3 bots.

## Test: gear "hero skill damage" bonus in Arena (20 Nov 2026, TEST v1752) - test only, not in the game
Same setup as the fight-length baseline (all heroes Lv80, 5 full stars, skills 5, maxed research, no weapons/Esper/cards, 160 fights per matchup). Bonus = x on every hero skill's damage (test copy of cardSkMul).
| Skill dmg | F1v2 | F1v1 | F2v2 | F1v3 | F2v3 | F3v3 | (avg s / % to timer) |
| none | 25.5 / 1% | 30.3 / 16% | 53.6 / 63% | 57.9 / 72% | 59.1 / 84% | 59.9 / 100% |
| +25% both | 25.2 / 1% | 28.9 / 15% | 53.8 / 66% | 57.5 / 68% | 58.8 / 84% | 59.9 / 100% |
| +50% both | 24.3 / 0% | 28.3 / 15% | 53.2 / 63% | 57.0 / 68% | 58.6 / 79% | 59.9 / 100% |
| +100% both | 23.9 / 1% | 27.3 / 14% | 53.2 / 63% | 56.0 / 53% | 57.3 / 66% | 59.9 / 100% |
One side only (same fortress both sides), win % of the side with the bonus: +50% -> F1v1 51%, F2v2 80%, F3v3 83%; +100% -> 57% / 73% / 88%.
Takeaway: barely shortens fights (even +100% saves ~1-3 s; F3 v F3 still always hits the timer), but in an even fight (same fortress) the side with it wins far more often (+50% -> ~80% in F2/F3 mirrors). Fortress type still decides mismatched fights.
Pushed further (both sides, Harley "keep increasing it until you see a difference"):
| x3 | 21.0 / 1% | 25.4 / 10% | 52.3 / 63% | 52.3 / 39% | 55.1 / 58% | 59.9 / 100% |
| x5 | 18.9 / 1% | 23.7 / 10% | 51.4 / 63% | 44.7 / 16% | 48.8 / 38% | 59.9 / 100% |
| x10 | 18.7 / 1% | 22.8 / 5% | 44.7 / 51% | 31.7 / 4% | 39.5 / 14% | 59.4 / 94% |
| x20 | 13.2 / 0% | 20.1 / 3% | 32.4 / 31% | 25.7 / 0% | 34.3 / 6% | 55.3 / 69% |
Clear drop from x3-x5 (F1 v F3 58 s -> 45 s at x5); F2 v F2 needs ~x10; F3 v F3 only moves at x10-x20. Skill damage alone is a weak lever for fight length.
Hero survival in the same fights (both sides, all 10 heroes): knockouts per fight / share of hero-time spent knocked out (infantry only in brackets):
| today | F1v2 16 / 53% (61%) | F1v1 19 / 54% (68%) | F2v2 37 / 66% (75%) | F1v3 28 / 46% (51%) | F2v3 32 / 52% (59%) | F3v3 25 / 40% (58%) |
| x5 skill | 14 / 60% (68%) | 18 / 61% (70%) | 38 / 70% (79%) | 24 / 49% (54%) | 28 / 55% (64%) | 30 / 48% (61%) |
| x20 skill | 13 / 66% (73%) | 17 / 65% (73%) | 26 / 70% (80%) | 17 / 56% (62%) | 23 / 61% (68%) | 32 / 54% (63%) |
Finding: already TODAY at max level heroes spend about half the fight knocked out (infantry 51-75%) - they mostly trade with each other while the fortress does little. Likely why hero-damage bonuses barely move fight length.
Skill damage + hero HP together (both sides; avg s / % to timer / hero downtime):
| HP +50% | F1v2 26.2/1%/50% | F1v1 29.8/16%/48% | F2v2 54.0/62%/62% | F1v3 58.5/77%/42% | F2v3 58.6/86%/47% | F3v3 59.9/100%/33% |
| HP x2 | 28.2/1%/46% | 30.9/18%/42% | 55.5/66%/58% | 59.4/94%/38% | 59.5/93%/43% | 59.9/100%/28% |
| skill x2 + HP +50% | 23.7/1%/52% | 27.7/14%/50% | 52.3/63%/64% | 55.0/62%/43% | 58.6/82%/49% | 59.9/100%/36% |
| skill x2 + HP x2 | 25.0/1%/50% | 27.7/14%/46% | 53.4/63%/60% | 54.1/65%/40% | 58.7/88%/47% | 59.9/100%/31% |
| skill x3 + HP x2 | 22.6/1%/51% | 26.3/13%/47% | 51.7/61%/61% | 53.3/61%/41% | 57.1/78%/47% | 59.9/100%/34% |
| skill x5 + HP x3 | 21.8/2%/50% | 24.5/8%/44% | 46.2/52%/58% | 53.7/56%/39% | 53.7/67%/44% | 59.9/100%/32% |
Finding: HP alone makes fights LONGER; HP cuts downtime but heroes surviving longer doesn't speed up fortress kills. Pairing cancels most of skill damage's speed-up (skill x5 alone: F1v3 44.7 s; with HP x3: 53.7 s). F3 v F3 always hits the timer in every combo.

## Test: gear "basic attack damage to the fortress", one piece per class (20 Nov 2026, test only)
Harley's idea: 3 of the gear bonuses = one per class (Infantry / Caster / Ranged), each a multiplier on that class's BASIC attack damage when it lands on the enemy FORTRESS (not on heroes). Same max-level setup. (Code keys: Caster = `archer`, Ranged = `cavalry`.)
| Bonus (both sides) | F1v2 | F1v1 | F2v2 | F1v3 | F2v3 | F3v3 |  (avg s / % to timer)
| today | 25.5/1% | 30.3/16% | 53.6/63% | 57.9/72% | 59.1/84% | 59.9/100% |
| all 3 classes x1.5 | 22.0/0% | 27.3/13% | 53.2/66% | 50.6/28% | 54.3/43% | 59.9/100% |
| all 3 classes x2 | 19.6/0% | 25.6/9% | 51.4/64% | 42.2/4% | 47.6/19% | 59.9/100% |
| all 3 classes x3 | 16.2/0% | 23.9/7% | 50.6/54% | 30.7/0% | 36.7/4% | 59.9/100% |
| all 3 classes x5 | 13.9/0% | 21.1/4% | 42.6/29% | 20.3/0% | 26.5/0% | 59.9/100% |
| Infantry only x3 | 20.3/0% | 29.8/14% | 50.0/59% | 42.5/17% | 49.2/29% | 59.9/100% |
| Caster only x3 | 20.7/1% | 25.9/9% | 53.8/69% | 49.6/36% | 51.6/45% | 59.9/100% |
| Ranged only x3 | 22.2/1% | 27.8/14% | 52.8/62% | 51.3/38% | 53.7/48% | 59.9/100% |
One side only, all 3 x2: wins F1v1 58%, F2v2 86%, F3v3 88% (F3v3 still always on the timer -> decided on HP left).
Finding: far stronger lever for fight length than skill damage (x2 here ~ skill x5). Infantry's piece matters most. F3 v F3 never ends before the timer even at x5 - F3 mirrors need something else.

## Governor gear - first numbers (20 Nov 2026, test only, dev/balance/gear_build.py + gear_levels.py)
4 Arena pieces (boss + troop damage left out - own yardsticks). Max-level fort_vs_fort, 160 fights each. Baseline check: the test copy with no bonus = today's numbers exactly.
Value per +50% on ONE side (win % in mirrors F1v1 / F2v2 / F3v3; baseline 48 / 63 / 50): cannon 55/83/68, fortress HP 73/91/100, hero atk vs fort 57/86/82, hero skill vs fort 52/83/73.
-> fortress HP is worth ~2x the others per %, hero attack ~1.3x, cannon and skill about the same.
Caps set so each piece at max is worth about the same: **cannon +70%, fortress HP +15%, hero attack vs fortress +50%, hero skill vs fortress +65%** (40 steps each, growing towards Red: dev/balance/gear_levels_table.md).
At the caps (one side): cannon 56/83/68, HP(+15%) 61/90/99, atk 57/86/82, skill 53/84/74. Hero attack vs fortress (P) against fortress HP (A): F1v1 49%, F2v2 76%, F3v3 17%.
All 4 maxed on BOTH sides (fight length): F1v1 30->22 s, F1v2 26->22 s, F1v3 58->52 s (72%->41% to timer), F2v3 59->55 s (84%->52%), F2v2 and F3v3 unchanged (54 s / 60 s).
All 4 maxed on ONE side: wins F1v1 73%, F2v2 89%, F3v3 100%.
Open issue: a fight that hits the 60 s timer goes to whoever has more fortress HP LEFT (absolute HP). F3 v F3 always hits the timer, so ANY fortress HP bonus wins that mirror (~99% even at +15%). Either accept it, or change the timeout rule (e.g. whoever dealt more damage / lost the smaller share of HP).

## Governor Gear boss damage vs the kaiju (20 Nov 2026, v1754) - dev/balance/kaiju_gear_boss.js
Harley: a player reaches kaiju level 100 at 1 billion damage; the gear boss piece must get a whale there. Maxed account, Sword of Power 100, equipment Boss Damage 72% (best rolls), gear boss damage MULTIPLIED on top, 60 s fight, 5 fights each.
| Fortress / weapons | gear 0% | +100% | +200% | +300% | +400% | +500% |
| F2 Clone+Droid+Duplicate | 193M | 385M | 578M | 771M | 963M | 1.16B |
| F2 Meta | 93M | 180M | 268M | 355M | 442M | 530M |
| F1 Clone+Droid+Duplicate | 110M | 221M | 331M | 441M | 552M | 662M |
| F1 Meta | 61M | 115M | 170M | 224M | 278M | 333M |
| F3 Clone+Droid+Duplicate | 93M | 185M | 278M | 370M | 463M | 555M |
| F3 Meta | 51M | 91M | 132M | 172M | 212M | 253M |
Straight line. **Cap +420%** -> best whale ~1.00B (level 100). Meta builds grow slower (the Railgun's % hit isn't boosted). Note the no-gear F2 best is now 193M (was 212M at v1605) - the game has changed since.

## Kaiju + Critical Mass card (20 Nov 2026, v1755) - dev/balance/kaiju_critmass.js
Harley: F1 on the kaiju with Critical Mass (cannon x10 per burst, compounding: x10, x100, x1000 ...). Maxed account, Sword 100, equipment Boss Damage 72%, 5 fights each. The real kaiju fight does pass this card in (dmgRamp: equippedDmgRamp).
| F1 | no card, gear 0 | no card, gear +500% | Critical Mass, gear 0 | Critical Mass, gear +500% |
| Clone+Droid+Duplicate | 110M | 662M | 443 BILLION avg (43B - 1.6T) | 2.66 TRILLION avg (260B - 9.8T) |
| Meta | 61M | 333M | 361B avg (43B - 1.6T) | 2.16T avg (259B - 9.8T) |
~4,000x more damage; range depends on how many cannon bursts fire. Far past 1B -> level 100 instantly. (The kaiju's hidden health is 1e15 = 1,000 trillion, not reached.)

## Arena fortress HP x0.3 (21 Nov 2026, TEST v1784 has ARENA_HP_TEST = 0.3 in Arena fights only)
Harley: 0.3 "feels about right" on his low-level account; asked what x0.3 as the norm (no curve) means for whales. fort_vs_fort.js, maxed accounts (Lv80 5*, skills 5, maxed research, no weapons/cards/Esper), 40 teams, 160 fights per matchup. Full gear = all 4 Governor Gear Arena pieces at cap on both sides (gear_build.py; HP x0.3 via its hp knob).
| Matchup | today | x0.3 | full gear | full gear + x0.3 | (avg s; first side's win %: today / x0.3 / gear / gear+x0.3) |
| F1 vs F2 | 25.5 | 13.0 | 21.5 | 11.2 | 46 / 33 / 48 / 29 |
| F1 vs F3 | 57.9 | 24.5 | 51.8 | 16.1 | 0 / 6 / 3 / 28 |
| F2 vs F3 | 59.1 | 33.4 | 55.4 | 28.4 | 1 / 3 / 1 / 3 |
| F1 vs F1 | 30.3 | 19.3 | 22.1 | 18.0 | ~50 |
| F2 vs F2 | 53.6 | 42.4 | 53.5 | 37.5 | ~50 (timer 63% -> 31% / 21%) |
| F3 vs F3 | 59.9 | 59.8 | 59.9 | 59.7 | ~50 (timer 96-100% in all) |
Findings: whale fights 11-38 s instead of 22-60; fights shrink only 30-60% (much of a max-level fight is heroes walking in and trading), so x0.3 bites harder early than late. F3 mirrors stay on the timer. F1 gains vs F3 (0% -> 6%, 28% with gear), loses some vs F2 (46% -> 33%).
**Harley (21 Nov): likes all of it, including F3 mirrors staying long - no retuning planned.** Meta weapon builds not yet checked at x0.3.
