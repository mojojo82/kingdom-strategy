# UI skins / style switcher (Harley, 18 Oct 2026) — planned, not built

- Player-swappable UI styles (Options). Before launch Harley may keep only one; he wants time to decide, so every skin must be fully usable.
- Skin = art (frames, sky, buttons) + a slot map (where each slot/button sits in the art, in 430-px phone units). Game layout, tap areas and code stay the same.
- Skin 0 = current brown/gold UI. Skin 1 = blue concept (art/ui/blue2_top.png, blue2_bottom.png; mockup script in scratchpad uimock4.js — numbers in it:
  weapon frame inner edges x [153.9-200.8, 207.6-254.6, 261.6-308.4, 315.9-362.5, 369.9-416.9], y [111.8-156.6, 163.8-209.2] from the panel top;
  hero rings centre x [102.6,164.9,236.5,304.7,372.5], y 64.8, inner diameter 41; panel top = battle canvas bottom - 30).
- Night sky (art/conquest/night_sky_loop.webp + moon.webp) is separate from the skin; drift on/off toggle planned.
- Order: switcher + skin plumbing first, then blue on Conquest, then Arena. Other phone sizes: stretch the gaps between sections, not the frames.
- Still open on the blue skin: top lip (~6-8 px), merged bottom-left card slot, Challenge Boss / round buttons / Stats / toggle / Forge text styling.
