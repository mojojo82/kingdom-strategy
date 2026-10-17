# March capacity + assigned troops (plan, Oct 2026)

Harley (17 Oct): troops assigned to a formation can't be put in another formation unless released or sent to the infirmary.
Marches get a capacity like Kingshot instead of "everything you own". Decisions so far:
- Hero capacity at **x0.6** of the reference numbers for now (we have 5 hero slots, Kingshot has 3). **Keep the 1:1 numbers below — Harley may switch to 1:1 later.**
- **Command Center = a new building** (Kingshot's table).

## Kingshot march (squad deployment) capacity
March = **500 base + Command Center + research (Regimental Expansion I–VI, War Academy) + the march's heroes** + temporary city boosts (+10% 2 h / +20% 12 h).
Town Center itself adds nothing (it gates the Command Center: unlocks at Town Center 10, needs Embassy 1). Troop buildings = training capacity only.

### Command Center (Kingshot)
| Lv | Deploy | Rally cap | Power |
|---|---|---|---|
| 1 | 400 | 1,500 | 280 |
| 2 | 700 | 3,500 | 532 |
| 3 | 1,000 | 5,700 | 910 |
| 4 | 1,400 | 8,000 | 1,414 |
| 5 | 1,800 | 11,500 | 2,170 |
| 6 | 2,800 | 15,000 | 3,304 |
| 7 | 3,800 | 19,000 | 4,942 |
| 8 | 5,000 | 24,000 | 6,580 |
| 9 | 6,500 | 29,500 | 8,218 |
| 10 | 8,000 | 35,500 | 10,598 |
| 11 | 10,500 | 43,500 | 12,978 |
| 12 | 13,000 | 52,000 | 15,358 |
| 13 | 16,000 | 62,000 | 19,376 |
| 14 | 19,000 | 73,500 | 23,394 |
| 15 | 22,000 | 87,500 | 27,412 |
| 16 | 27,000 | 105,000 | 33,068 |
| 17 | 32,000 | 120,000 | 38,724 |
| 18 | 34,000 | 140,000 | 44,380 |
| 19 | 36,000 | 165,000 | 52,416 |
| 20 | 38,000 | 195,000 | 60,452 |
| 21 | 40,500 | 225,000 | 68,488 |
| 22 | 43,000 | 260,000 | 80,542 |
| 23 | 46,000 | 305,000 | 92,596 |
| 24 | 48,500 | 350,000 | 104,650 |
| 25 | 52,000 | 400,000 | 116,704 |
| 26 | 54,500 | 470,000 | 134,414 |
| 27 | 57,000 | 550,000 | 152,124 |
| 28 | 60,500 | 630,000 | 169,834 |
| 29 | 64,000 | 725,000 | 187,544 |
| 30 | 67,000 | 840,000 | 213,290 |
Truegold TG1–TG8: deploy 70,500 → 95,000 (+3,500 per tier). Rally cap = 2,000 base + CC rally value + total deployment.
Sources: kingshotoptimizer.com/buildings/command-center, heaven-guardian.com/kingshot-command-center-guide

### Research
Regimental Expansion I: 3 levels, +320 / +320 / +360 = +1,000. II–VI: numbers not found yet. Truegold Battalion (archer): 5 x 200 = +1,000.

### Hero troops capacity (Harley's screenshots, 1:1 reference numbers)
Stars and rarity make NO difference (SSR 5★ Lv80 = SSR 4.5★ Lv80 = 13,470; SR Lv79 = 13,430).
| Lv | Capacity |
|---|---|
| 17 | 2,040 (= 120 x 17) |
| 30 | 4,905 |
| 45 | 9,245 |
| 50 | 10,685 |
| 60 | 12,370 |
| 72 | 13,150 |
| 79 | 13,430 |
| 80 | 13,470 |
Between points: straight lines (Lv1–17 = 120 per level). Ours uses **x0.6** (Lv80 = 8,082 per hero, 5 heroes = 40,410).
Escorts (not used by us): Lv17 4, Lv30 6, Lv45 7, Lv50 8, Lv60 9, Lv72+ 10.

## Assigned troops (open questions from the discussion)
- Reserve pool for unassigned troops; new troops land there; "Fill formation" button.
- Healed troops: back to their formation, or to the Reserve? (Harley to decide)
- Losses come off the formation; promotions stay in the formation; every troop at home defends the base; bots follow the same rules.

## Assigned troops — decisions (Harley, 17 Oct)
- Healed troops go to the **Reserve**.
- **Auto-refill**, no taps ("we can't be stopping to do refill taps in the middle of an intense fight"): each formation remembers its set numbers and tops itself up from the Reserve.
- When several formations are short: **whichever returns to base first** gets refilled first.
- If the exact tier has run out: **fill with what's available** (assumption: same troop type, best tier first).
- Build order: step 1 march cap + Command Center (v1240) done; step 2 assigned troops after a mockup.
- Formation quick buttons (Harley's mockup notes): **⚖️ Equalise** = fill to march size, even split across the 3 troop types, best tiers first. **⭐ Preset** = fill with a saved preset.
- **5 presets** per account. Each preset = troop mix (% ratio OR exact numbers, trimmed to the march size) **+ heroes**. ⭐ opens the 5 to pick from; ✏️ edits them.
