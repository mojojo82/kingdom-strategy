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

## Colour matching (Harley, 2 Nov 2026)
Every GPT layer that is used directly (not cut from the composite) gets colour-matched to the composite in the build - GPT's splits come out
brighter / more saturated. Applies to road, far and any extend-up pass. Match only where the layer and composite show the same thing.

## Canvas passes (Nov 2026) - extend-up and widen
Asking GPT to "move the layer down and extend it" redraws and shifts things. Instead, I (Claude) build the canvas and GPT only fills the white.
Always use a FRESH chat with the canvas attached.

**Extend-up** (canvas = the layer pushed to the bottom, white on top):
```
The attached image is <the back wall / the foreground layer on magenta> of a castle <room> for a 2D side-scrolling game, with an empty white area across the top.

Fill ONLY the white area at the top:
- continue everything that is cut off at the top of the existing picture straight upwards from exactly where it is cut, so there is no visible join: <roof beams, rafters, pillars, chimney, lantern chains ...> up to the very top edge of the image
- <magenta layers: wherever the existing picture is magenta right below the white area, the new part above it stays solid flat magenta (#FF00FF) too>
- no white left anywhere

Do NOT change anything in the existing part of the picture: keep every pixel of it exactly where it is, same size, same position, same colours. Do not redraw, move, shrink or recolour it.

Same detailed hand-painted pixel-art style, same muted colours and the same warm lighting as the existing picture.
Landscape, 1536x1024.
```
Results: the armoury far and near both came back as near-copies shifted up 32 px (match 0.98 / 0.89). The build script joins the new top over an 80-row overlap and colour-matches it to the old layer.

**Widen** (canvas = the scene's last 400 cols | white | its first 400 cols, plus a strip of floor at the bottom):
```
The attached image is a castle <room> for a 2D side-scrolling game. The left part and the right part are finished artwork; the white area in the middle is empty.

Fill ONLY the white area with a new section of the same <room>, so the whole image reads as one continuous room from left to right:
- continue the <roof beams...> straight across from the left part into the right part, joining up with the beams on both sides with no visible join
- continue the <back wall> at the same height, with the same stone blocks, lighting and the same floor line along the bottom
- put NEW things against the wall so this section looks different from the rest: <list>
- <one hanging lantern ...>
- no <things that already exist elsewhere>
- everything stands on the same floor line as the objects in the left and right parts
- do NOT change anything in the left and right parts: keep every pixel of them exactly where it is, same size, position and colours, and keep the strip of stone floor along the bottom as it is
- no characters, no text
- same detailed hand-painted pixel-art style, same colours and warm lighting as the rest of the image
- landscape, 1536x1024
```

## Modular interior (armoury rebuild, Nov 2026)
Step 1 - plain base (fresh chat, attach the sharp village ref):
```
Create a side-scrolling 2D game level background, in the same art style as the attached image: detailed hand-painted pixel-art look, rich colours. Copy ONLY the art style and the road's camera angle from the attached image. Do NOT copy its buildings, village, cobblestone road or its underground roots and boulders.

Scene: INSIDE a castle armoury. There is no sky. A tall hall with a high wooden roof: heavy dark wooden beams, rafters and cross-braces fill the top of the image right up to the top edge. Below the roof, a plain dark stone back wall runs the whole width.

The back wall is deliberately PLAIN: only stone blocks, with a square stone pillar at the far left edge and an identical one at the far right edge, both running from the floor up into the roof. Nothing else on the wall: no windows, doors, banners, shields, racks, furniture, lanterns or objects of any kind. Even, warm, slightly dim lighting across the whole wall, with no light beams or bright spots, so any part of the wall looks like any other part.

Layout (important, this will be used as a looping game background):
- Flat side-on view, the camera slightly above the floor, looking straight at the back wall
- The floor is a band of large grey flagstones across the full width, seen at the same angle as the road in the attached image, with real depth. The front edge of the floor is a row of big stone blocks
- Below the floor, the cut-away underground is a brick cellar with arches, containing stacks of iron ingots, coal and crates. Not roots and boulders
- The top of the floor is a flat straight line with nothing standing on it: characters will walk on it
- The roof beams follow a regular, repeating pattern across the whole width, and the left and right edges must match so the image can repeat side by side
- No characters, no creatures, no text

Image size: landscape, 1536x1024 (the widest landscape format you can make).
```
Try 1 came out far too dark (banked: armoury2_base_composite). Step 1b - brightness (same chat):
```
Using the last image, keep EXACTLY the same layout, size and positions of everything (the roof beams, the two stone pillars at the left and right edges, the plain wall, the flagstone floor and the cellar below), but change the lighting and detail:
- make the whole scene much brighter: warm golden light, as if the hall is lit by many torches and daylight, like a bright medieval interior. The stone wall should be a warm mid grey-brown, clearly lit, not dark
- keep the lighting EVEN across the whole width, no light beams, no bright spots and no dark corners, so any part of the wall looks like any other part
- richer hand-painted pixel-art detail and texture on the stone blocks, beams and floor, in the same style as the first image I attached (the village), with the same level of detail and warm colours
- the wall stays completely plain: no windows, doors, banners, shields, lanterns or objects
- the left and right edges must still match so the image can repeat side by side
- landscape, 1536x1024
```
Then: the road (usual prompt), the extend-up canvas, making the base seamless (me), one widen-style canvas per module (plain | white | plain), and the module-strip code.
