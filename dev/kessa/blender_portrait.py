# Hero-card portrait test in Harley's Blender (run through the Blender MCP add-on, 13 Oct 2026). First test: Kessa, 640x640, Eevee, ~18 s on his Ryzen 5 3400G (Vega 11).
# Steps used: model downloaded from GitHub raw to C:\Users\Harley\KingdomArt\kessa_rigged.glb; import with disable_bone_shape=True inside a VIEW_3D temp_override
# (read_factory_settings is blocked by the add-on's sandbox; read_homefile breaks the importer's context); arms down = "Walking" action frame 1.
# Camera 85 mm at (0.75,-2.35,1.22) looking at (0,-0.05,1.08). Lights (area): Key warm 160 W (1.4,-1.6,2.1) size 1.2; Fill cool 45 W (-1.6,-1.4,1.2) size 2; Rim 220 W (-0.9,1.4,1.8) size 0.6.
# World (0.32,0.36,0.45) x0.6. Eevee raytracing on, 48 samples, film transparent, view transform Standard; material roughness 0.72, specular 0.25.
