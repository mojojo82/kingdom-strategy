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
