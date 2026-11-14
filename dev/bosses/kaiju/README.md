# Kaiju boss - coded animation prototype (14 Nov 2026)
Harley wants the Boss Rush kaiju "top tier smooth 60fps" (the Walker's frame animation looked choppy, so it went to code).
The ChatGPT parts sheet (art/originals/bosses/kaiju/rig/kaiju_parts_v1_gpt.png) didn't match the approved design, so instead the approved painting
(rig/kaiju_A_keyed.png, 1415x949) is drawn through a 30x20 triangle mesh that is bent every frame (kaiju_rig.js):
- idle: breathing (upper body rises / swells), head + jaw sway, arm sway, travelling tail wave, spine + reactor glow pulses
- blast (2.8 s): spines light up tail -> head, head pulls back, snaps forward, jaw opens, mouth glow, code-drawn beam to the target, recovery
- the spine glow is added into one flat texture first and the texture is warped once (warping the glow separately showed triangle seams)
- feet (y > ~700 px) never move
Preview: view.html + render_preview.js (60 fps frames -> art/originals/bosses/kaiju/clips/kaiju_coded_preview_v1.mp4). ~8 ms a frame in headless Chromium on a desktop CPU; phones will be slower - consider fewer cells / WebGL when it goes in.
Atlas clips (fallback): clips/kaiju_idle_v1.mp4, clips/kaiju_breath_v1.mp4.
- v3: stomp (2.1 s): the front (left) foot lifts ~110 px, holds, slams; weight shifts back then drops, knees give, tail whips, impact flash at the foot + shake. The creeping ground blast it starts is a separate effect (to do).
- Blast aim (Harley): the mouth points down-left at the ship - the head tilts by the angle from the mouth to the target (in the game: the player's skin hull target, SKIN_HULLT, so the tall Mecha gets a higher shot). The beam is drawn from the mouth to that point.
- kaiju_quake.js: creeping WATER blast after the stomp (the boss level is dark murky shallow ocean): surge crest, splash columns + spray, ripples, violet glow under the water, geyser under the target. KAIJU_QUAKE.draw(ctx, q, footX, targetX, waterY, scale). view.html draws a rough placeholder water floor until the real level exists.
