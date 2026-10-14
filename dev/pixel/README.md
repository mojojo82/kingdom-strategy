# Pixel Lab

- **pixel-lab.tpl.html + assets.json**: the Pixel Lab page Harley uses (takes pictures or short MP4/WEBM clips) (published as a claude.ai artifact, "Pixel Lab"). Build: replace `__ASSETS__` with the JSON from assets.json (Conquest + Arena 3x phone screenshots, Gareth example).
- **pixelize.py**: the same pixel pipeline for full-size originals. `python3 pixelize.py src.png out_prefix ART_HEIGHT COLOURS [checker]` writes `out_prefix_naive.png` (smooth shrink) and `out_prefix_pixel.png` (average-shrink, sharpen, median-cut palette, hard edges, dark outline).
- Harley sends a settings line from the Lab, e.g. `pixel h=45 px=2 colours=40 sharpen=60 outline=75 edge=110 bg=none`:
  - h = height on screen in phone points
  - px = phone pixels per art pixel at 3x, so art height = h*3/px
  - bg = none / plain / checker, tol = background tolerance
  - flip = mirrored
  - `smooth h=..` means a plain smooth shrink (keep the art as close as possible)
- Mirror the Lab's settings when running it on the original: outline/sharpen/edge are percentages and the 0-255 alpha cut-off.
