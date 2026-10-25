# Level art: ChatGPT prompt pipeline

Taken from Harley's screen recordings of the snow pass and sunlit cave chats (26 Oct 2026). One chat per level.

Order:
1. Full scene (attach the village image)
2. Road
3. Far
4. Near (with a fallback if it redraws)
5. Sky (outdoor levels only)

From step 2 on, each prompt starts "Using the last full scene, ..." so nothing needs re-attaching. Then `dev/levels/build_<level>.py` keys, seams and places the layers (see HANDOVER "Level art workflow").

**Camera (Harley, 26 Oct):** the player's viewpoint is a little ABOVE the characters, looking slightly down - they stand on a band of ground with real depth, NOT on a thin strip like a 2D platformer ledge. Never ask GPT to make the road's top surface thinner; ask it to keep the full scene's depth. The build script sets the final depth to the village eye level.

## 1. Full scene (snow pass version; attach the village picture)
```
Create a side-scrolling 2D game level background, in the same art style as the attached image: detailed hand-painted pixel-art look, rich colours.

Scene: <scene description>. Far in the background: <far description>.

Layout (important, this will be cut into layers for parallax scrolling):
- Flat side-on view (no perspective looking down), like a 2D platformer background
- Three clear depth bands with space between them: FAR (<...>, top-middle), MIDDLE (<...>), and a GROUND ROAD along the very bottom running the full width
- The ground road is seen from almost ground level, exactly like the road in the attached image: only a thin sliver of the path's top surface is visible (<surface>), and below it the cut-away face of the ground showing <underground>. Not cobblestones.
- The top of the road is a flat straight line with nothing standing on it, characters will walk on it
- The left and right edges should continue naturally so the image can repeat side by side
- The sky should be soft and atmospheric with gentle clouds, blending smoothly into the far mountains (no harsh dark band)
- No characters, no creatures, no text

Image size: landscape, 1536x1024 (the widest landscape format you can make).
```
Indoor (cave) version: "We are INSIDE the cave: there is no sky. Rock ceiling and stalactites fill the whole image right up to the top edge" + "Two depth bands, both reaching all the way to the top of the image".

## 2. Road
```
Using the last full scene, make ONLY the road and ground layer, on a plain flat solid magenta (#FF00FF) background:
- the path's top surface (the slightly raised strip ... seen at the same slight angle) ...
- below it, the cut-away ground ..., all the way to the bottom
- keep the exact same low ground-level view and the same thickness of the top surface as in the full scene, do not make it thicker
- everything above the top of the path is solid magenta
- same size, position, style and colours as the full scene
- landscape, 1536x1024
```
Fix used on the cave when it came out as tiles: "Close, but redo it: the top surface looks like square paving tiles and the front edge is a neat row of identical blocks. Make it a natural ... floor: ..."

## 3. Far
```
Using the last full scene, make ONLY the far background layer, on a plain flat solid magenta (#FF00FF) background:
- <far elements>
- remove everything in front of it (<near elements>, the road and the ground under it) and paint in the parts that were hidden behind them
- extend <far filler> down to where the road starts, no gaps at the bottom
- no sky: everything above the <far elements> is solid magenta   (cave: the far layer must fill the WHOLE image from the very top edge down to where the road starts, with no magenta gaps anywhere)
- keep it exactly the same size, position, style and colours as in the full scene
- landscape, 1536x1024
```

## 4. Near
```
Using the last full scene, make ONLY the near layer, on a plain flat solid magenta (#FF00FF) background:
- <near elements, and the snow/rocks/bushes at their base>
- include the thin line of <ground edge> along the very bottom, where the scene meets the road
- remove <far elements> and sky (make it solid magenta), and remove the road and everything under it
- keep the bottom edge of this layer exactly where it meets the top of the road
- keep it exactly the same size, position, style and colours as in the full scene
- landscape, 1536x1024
```
Fallback when GPT redraws it:
```
That redrew it in a different style and moved it down. Try again, but this time do not redraw anything:
- copy the near elements EXACTLY as they appear in the full scene, pixel for pixel: <near elements>
- keep the same soft, smooth, painterly look and the same muted colours as the full scene. Do not sharpen, do not add contrast, do not make the colours more saturated
- keep every element in exactly the same position as in the full scene; the bottom edge must sit exactly where the near scene meets the road in the full scene
- everything else (<far elements>, sky, road and ground) becomes plain flat solid magenta (#FF00FF)
- landscape, 1536x1024
```

## 5. Sky (outdoor levels)
```
Using the full scene, make ONLY the sky, on its own, with nothing else in it:
- the same <sky> as the full scene: <colours top to horizon>
- continue the sky and the glow smoothly all the way down to the bottom of the image, as if the mountains, trees and everything else were removed
- no mountains, no trees, no buildings, no ground, no silhouettes at all
- same colours, style and soft painterly look as the full scene
- the left and right edges should continue naturally so it can repeat side by side
- landscape, 1536x1024
```
