# Strong builds

Reference list of builds that tested as unusually strong. Newest findings at the bottom of each section. Test only: nothing here has changed the game.

## How these were tested (18 Nov 2026, after v1722)

- Scripts: `dev/balance/op_builds.js` (search) and `dev/balance/op_builds_confirm.js` (confirmation). Results: `dev/balance/results/op_builds*.json` / `.log`.
- Engine: World PvP / PvP Simulator path with 0 troops, which is Arena-style (heroes + fortress). Lv80, 25 stars, skills Lv5, no weapons.
- Our side: no Hanzo, Kessa, Baelgor or Iron Lily (they may sit on the opposing team).
- Cards: every PvP card except Critical Mass and Regen. Boss Slayer does nothing in PvP, and Drop Signal needs summon weapons, so neither was used.
- Fortress tech: Fortress I / II / III trees filled in research order, at 5M and full (100M) spend. Both sides on the same tree and spend unless noted.
- Opponents:
  - **Meta:** Hanzo, Kessa, Iron Lily, Lyra, Sera.
  - **Hanzo team:** Gareth, Lyra, Kessa, Sera, Hanzo.
  - Each was tested with no cards and with Kessa's cards (#3 Kessa ATK +200%, #2 Arc Burst, #8 Quick Study, #9, #15 All HP).
- Confirmation runs: 30 seeds x attack and defend = 60 fights per number.

## 1. Halo-7 team on Fortress II (overpowered)

**Team:** Halo-7, Bram, Lyra, Sera, Juno. **No cards.** Full Fortress II, opponent also on full Fortress II.

| Opponent | Win % |
|---|---|
| Meta, no cards | 95% |
| Meta + Kessa cards | 82% |
| Hanzo team + Kessa cards | 97% |

- Fortress II (faster skills + hero damage) suits Halo-7's Core Beam.
- The same team on Fortress I wins only 5-20%, and on Fortress III 0-17%.
- A plain team (Gareth, Lyra, Sera, Torvald, Aurek) on Fortress II wins 0-5%, so the strength comes from Halo-7 + Fortress II, not from Fortress II alone.
- Halo-7 is the best hero outside the banned four. In a base team (Gareth, Lyra, Sera, Torvald + X) vs Meta on full Fortress III, Halo-7 got 25%, Bram 5% and everyone else 0%.
- Adding cards barely changes it: the best 5 (Infantry ATK, Last Bastion, Polar Flux, Super-burst, Quick Study) gives 85-100%.

## 2. Fortress III dominates hero-only fights (needs checking)

- At equal research spend, Fortress III beat Fortress I and Fortress II **100% of the time**, at both 5M and full spend, with every team tested (Halo team, plain team, Meta).
- Fortress I vs Fortress II at full spend: Fortress I wins about 30-38%.
- **Caveat:** the trees were balanced in tests with troops (`f1vf3_ladder.js`, `f2_ladder.js`). These fights have no troops. Check this in the real Arena code before acting on it.

## 3. Polar Flux + Last Bastion on Fortress I

- On full Fortress I, these two cards lift almost any team to about **40-45%** vs Meta / Hanzo team, flat across opponents:
  - plain team 3% -> 40%;
  - Halo team 8% -> 42%.
- No effect on Fortress II or III in these fights.

## 4. Cannon Doctrine stack on Fortress I

- **Halo team + Cannon Doctrine, Type-1 Defence, Infantry ATK, Last Bastion, Polar Flux**, full Fortress I.
- Results: 67% vs Meta with no cards, 47-48% vs teams with Kessa cards.

## 5. Lone Wolf solo (strong for one hero, not overpowered)

- **One hero (Aurek or Halo-7) + Lone Wolf**, optionally with Super-burst, Polar Flux, Last Bastion and Infantry ATK, on full Fortress I.
- Results: 27-30% vs full 5-hero Meta / Hanzo teams. 0% on Fortress II / III.
- Lone Wolf alone (Aurek) gives 27%.

## Open questions

- Re-check findings 1 and 2 in the real Arena code (arenaMakeSim with fortress tech), not only the World PvP engine.
- Test the opponent with its own best fortress tree instead of a mirror.
- Weapons were left out entirely. The meta weapon build may change these numbers.
