# Oil rig city (concept, Oct 2026) — parked, not in the game yet

Harley's idea (17 Oct): the city becomes the cutaway side view of an oil rig. Each room = one building.
Players unlock extra floors (added at the bottom, under the water) and can decorate rooms with small items.

## Art (art/originals/rig/, ChatGPT images, 941x1672, green background)
- `rig_frame_empty.png` — rugged frame, 4 floors x 2 empty rooms, lift in the middle, flat roof, legs. The base for every edit.
- `rig_frame_engine_room.png` — same frame, bottom floor = one wide engine room (Town Hall), lift stops above it.
- `rig_rooms_set1.png` — rooms filled: war room, barracks, research lab, medical bay, magic lab, archery range, warehouse, defence control.
- `rig_rooms_set2.png` — top 2 floors filled: hydroponic farm, timber workshop, stone crusher, gold refinery.
- `rig_decor_items_sheet.png` — 64 decoration items (beds, seats, tables, storage, clothes, tech, wall items, lights, plants, kitchen, fun). Spaced apart, so they can be cut out automatically (connected parts on the green, then mask each one). Not needed yet.
- `rig_tower_stacked.png` — all pieces stacked (roof, 6 room floors, engine room, legs), green removed.
- `rig_mockup.png` — phone mockup (level badges, tap card, sky + sea).

## Cutting notes (pixel rows in the 941x1672 images)
- Dark floor beams at y = 260, 504, 755, 1006, 1249. Repeating floor piece = rows 504..755 (251 px).
- Top floor (260..504) is ~9 px shorter than the others; rooms from it need a ~4% stretch to fit a 251 px floor.
- Rooms: left x 92..426, lift 426..514, right x 514..850.
- Legs = rows 1249..end. Engine floor = rows 1006..1249 of the engine image.
- Green key: g>150 and g > r+60 and g > b+60; despill fringe.

## Room mapping in the mockup (Harley may reorder)
Top to bottom: Command Center | Barracks, Academy | Infirmary, Mage Tower | Archery Range, Warehouse | Wall (defence control, undecided),
Farm | Sawmill, Quarry | Gold Mine, then the Town Hall engine room, then the legs. New floors slot in above the engine room.

## Decisions so far
- Rooms show only a level badge (no names). Tapping a room opens its info card over the room next to it.
- Sky gloomy/overcast; sea darker blue. Waterline at the top of the Quarry/Gold Mine floor; rooms stay dry, frame and legs underwater.
- Water is **static for now** (Harley has his own idea for animated waves later — code-drawn waves were too clean/cartoony; reference = choppy painted swells with thin pale highlight lines).
- Open: where the Wall goes, room order, how decorating works, and swapping the city view (build in TEST behind the current city first).

## Prompts that worked (attach the empty frame each time, so pieces line up)
- Frame: "Edit the first image, using the second image only as a style reference. Keep the exact same layout ... only redraw the steel frame to be much more detailed, gritty and rugged ..."
- Engine room: "... On the bottom floor only, the elevator does NOT continue down ... one single wide open room ... engine machinery, generators, pipes and one big control console in the centre."
- Rooms: "Keep the tower frame ... exactly the same, and keep every room the same size. Only fill the empty rooms ... in the same gritty, weathered art style as the frame, each room a different theme: ..."
