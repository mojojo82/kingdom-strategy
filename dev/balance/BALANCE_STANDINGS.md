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
