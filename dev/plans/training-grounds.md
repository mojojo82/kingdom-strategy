# Training Grounds (working name) - plan

The ATK / HP / DEF bonus screen. Not built yet. Mockup: dev/plans/bonus-screen-mockup.html
(artifact https://claude.ai/artifact/73VLDxpy8Ac76eXRHupAaY).

## Decided so far (Harley)
- Lives in one of the slots near the backpack icon.
- Three lanes: ATK, HP, DEF. Each level adds a flat amount to the game's global ATK / HP / DEF Bonus
  (the same total Equipment adds to: heroBonusTotal). Account-wide, so bots pick it up automatically (botBonusFrom).
- One item levels all three (working name "Essence"). Screen shows owned vs needed per lane.
- Milestones: when ALL three lanes reach every 10th level, an extra bonus to all three + a reward (gold Claim button).
- Look: ruby (ATK), emerald (HP), sapphire (DEF); very basic 3D gems, upright, slowly spinning, translucent, shiny,
  little shake on upgrade. Solid borders (no dashed/dotted) on this screen. Smaller bonus number font (numbers get big).
- Late game is around Lv 240 per lane, about +3,500% (mockup: +10% per level, +50% per milestone).
- Keep item numbers small (cost about 5 + 4 x level in the mockup); small costs just mean sources give fewer.
- Pacing comes from how much Essence players earn: a free player should NOT reach Lv 10 in week 1; paying is the way to rush.
- Cost shape under discussion: High Seas Hero style sawtooth - every 10 levels starts cheap, the 10th level is very expensive,
  then resets (Claude's suggestion: each block starts a bit higher than the last, and the 10th level gives a bigger bonus).

## Where Essence comes from
Harley's first picks:
- Chapter completions (no chapter-complete reward exists today).
- Gauntlet milestones (every 10th floor).
Other ideas on the table: Arena wins / seasons, Fortress Defense daily runs, Idle Chest drop, world map (rare node / gathering chance),
events and shop (the big amounts, for payers).

## Open
- Item name, screen name.
- Cap by Town Hall level or Conquest chapter?
- Milestone rewards (chest? Essence back? gems? a card?).
- Exact Essence amounts per source; check with the free-player sim once sources are set.
- Achievement #1 (all lanes Lv 20) ties in: dev/plans/achievements.md
