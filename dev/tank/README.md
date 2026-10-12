# Steam Tank boss - 2D cutout test (not in the game)
Source: art/originals/tank_boss_gpt_parts.png (GPT parts sheet: turret, hull, track loop, road wheel, sprocket).
- cut2.py: background removal using the black outline as the wall (flood fill from the edges; big smooth enclosed holes = background) -> fg.npy
- parts.py: splits into hull / turret / barrel (barrel cut at x<592 so it can recoil behind the mantlet) / wheel / sprocket / one 48px tread plate -> PNGs + parts.json
- build.py: embeds parts into tank.tpl.html -> tank.html
Track = the single plate repeated round a stadium path (pitch ~47.7px, plate count rounded so it loops seamlessly); wheels spin to match.
Run from a folder holding src.png: python3 cut2.py && python3 parts.py && python3 build.py
- tankdraw.js: the tank drawer as one function (TK.draw); ingame.js swaps it in for the boss in the TEST game and records old-boss vs tank clips (old.webm / tank.webm). HS=1.0 env = tank height vs the boss size slot.
