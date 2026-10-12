# Hero-card portrait test in Harley's Blender (run through the Blender MCP add-on, 13 Oct 2026). First test: Kessa, 640x640, Eevee, ~18 s on his Ryzen 5 3400G (Vega 11).
# Steps used: model downloaded from GitHub raw to C:\Users\Harley\KingdomArt\kessa_rigged.glb; import with disable_bone_shape=True inside a VIEW_3D temp_override
# (read_factory_settings is blocked by the add-on's sandbox; read_homefile breaks the importer's context); arms down = "Walking" action frame 1.
# Camera 85 mm at (0.75,-2.35,1.22) looking at (0,-0.05,1.08). Lights (area): Key warm 160 W (1.4,-1.6,2.1) size 1.2; Fill cool 45 W (-1.6,-1.4,1.2) size 2; Rim 220 W (-0.9,1.4,1.8) size 0.6.
# World (0.32,0.36,0.45) x0.6. Eevee raytracing on, 48 samples, film transparent, view transform Standard; material roughness 0.72, specular 0.25.
# Round 2-3 (Harley: Kingshot heroes = very soft lighting): Key 120 W at (0.9,-2.4,1.7) size 3.5 warm (1,.95,.88); Fill 50 W (-1.8,-1.9,1.0) size 4 (.92,.95,1);
# Rim 110 W (-0.8,1.6,1.7) size 2; world (0.7,0.72,0.78) x0.55; view transform Standard (AgX low-contrast looked washed out); skin subsurface 0.08;
# camera 70 mm at (0.55,-2.35,1.12) -> (0.02,-0.05,1.0). Renders in ~1 s once warmed up. Preview images come back as base64 (pad the result so it lands in a file).
# Arc Burst hold test (13 Oct): pose from dev/kessa/blpose.json (skin matrices at tamed-cast t=1.132 s) applied as world deltas: pb.matrix = mw^-1 @ (C @ D @ C^-1) @ mw @ bone.matrix_local,
# C = glTF Y-up -> Blender Z-up. Staff = staff.py mesh posed at that frame. Palm: emission ball 0.045 + halo spheres; HandLight point 110 W (0.45,0.72,1); 3 jagged bolt curves
# (core emission 1.6, halo copies bevel 0.022/0.05 transparent-blended). Camera ortho 2.4 at azimuth -0.75 from her front (she casts toward Blender -Y, faces screen right), exposure -0.45.
# Head: Harley wants straight right / slight 3/4 right, never looking at us -> Spine2/Neck/Head turned about world Z (+0.135/+0.135/+0.225 from the state after the earlier tests).
# Saved on his PC: C:\Users\Harley\KingdomArt\kessa_arcburst.blend / .png
# In-between brightness (Harley, 13 Oct): exposure -0.55 (bright was -0.1). Frames: art/originals/sprites_hires/kessa/mid.
# Softer (Harley 'tone back slightly more'): exposure -0.85. Frames: art/originals/sprites_hires/kessa/softer.
# Hero card / overlord hi-res (Harley spec 13 Oct): full body, transparent, max detail, looping idle. Test: HeroCam persp 85 mm at (-1.05,-4.6,0.95) -> (0,-0.05,0.74),
# 1600x2400 (body ~2020 px tall), Eevee 96 samples, exposure -0.7, 4096 texture, smooth shading ON. Subdivision BROKE the skinned low-poly mesh (holes in hair, face cracks) - don't use it.
# Limit: the 10k-face Meshy remesh shows facets in the hair / cheeks at full size -> a higher-poly Meshy export (30-50k+) is needed for card quality. Test on his PC: KingdomArt\kessa_hero_test.png
