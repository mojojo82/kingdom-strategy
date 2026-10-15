# Arena targeting experiment (Harley, 16 Oct 2026) - PARKED, "interesting topic to come back to"

Nothing here is in the game. Cannon targeting stays as it is.

## How Arena targets today
- Hero ranged shots: while an enemy infantry hero stands in reach (ARENA_RANGED_RANGE 0.62), every 2nd shot hits it (HERO_KO_CFG.rangedPct 50), the rest hit the fortress. Frontline down -> 100% fortress.
- Enemy Casters / Ranged (back line) are never targeted by normal shots - only by AoE skills (aoeHit; Projection Wall blocks it), the Railgun KO, limit skills.
- The fortress cannon only ever hits the enemy fortress.
- Fortress Saga (Harley's reference game): players report enemies hit the slot-1 hero / summons first, then the fort; ranged heroes ride the fortress.

## Variants tested (scratch copies; patches below)
A. now. B. frontline down -> every hero shot at the back line (frontmost live non-infantry), then fortress.
C. B + the cannon follows frontline -> back line -> fortress (overflow carries on).
- B patch: in arenaMakeSim rangedHit, when no infantry `best`, pick the live non-infantry hero with highest d and hit it (dodge/def/KO as normal).
- C patch: before `playerDmg += landP; aiDmg += landA;` route landP/landA through heroes first (front infantry, then back line), leftover to the fortress.

## Results
6-hero round robin (run.js --only arena, no weapons/research): fight length A 40.5/30.2 s, B 40.5/29.3 s. B: teams without Sera 98% (back-liner gets focused), without Gareth/Torvald 56% (was 84) - infantry become essential; no-melee teams would be helpless (Harley: "would force every person to equip a melee").
Maxed F1 vs maxed F3, no weapons, 600 fights/level: F1 win% A 21/1, B 8/0, C 30/4 (Lv40/Lv80); length A 47/39 s, B 39/28 s, C 60/44 s; C cannon KOs ~4.5-5 heroes per fight.
Weapon builds (meta check builds): length A 39/38/34 s, B 59/42/38 s, C 60/59/50 s (Lv20/40/80). Lv40 C: Salvo builds (F1) jump to 81/79%, F3 shield builds drop (Clone+Rail+Hex 95 -> 69). Missile+Laser+Railgun never top.
Takeaway: C gives Fortress I an identity (hero shredder) and evens F1/F3, but fights drag ~1 min - would need tuning (e.g. revive time). Middle-ground ideas not tested: split back line/fortress 50/50; only ranged shots reach the back line; back line targetable only once fortress < 50%.
