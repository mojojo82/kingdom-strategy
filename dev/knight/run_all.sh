#!/bin/sh
# Rebuilds everything for the 3D knight from art/originals: model data, animations, preview page, sprite sheet, mockup.
# Run from dev/knight. Takes a few minutes (frame rendering is headless Chromium).
set -e
cd "$(dirname "$0")"
python3 -B bake2.py                                                   # knight2.json: knight mesh + skin + sword cut from knight_with_sword.glb
python3 -B chop4.py                                                   # knight3.json: + Overhead Chop + stand-in idle
python3 -B mixamo.py ../../art/originals/mixamo_sword_shield_slash.fbx "Mixamo Slash" inplace
python3 -B mixamo.py ../../art/originals/mixamo_standard_run.fbx "Mixamo Run" inplace
python3 -B mixamo.py ../../art/originals/mixamo_sword_shield_impact.fbx "Mixamo Hit" inplace
python3 -B build_fit.py                                               # fit.html (3D preview)
rm -rf frames && mkdir frames && node render.js "$(cat jobs.json)"    # side-view frames, see-through background
python3 -B pack.py                                                    # knight_sheet.webp + knight_sheet.json
python3 -B build_swap.py                                              # swap.html (mockup vs current Gareth)
rm -rf game_frames && mkdir game_frames && OUT=game_frames node render.js "$(cat jobs_game.json)"   # game rows (exact times per frame)
python3 -B pack_game.py                                               # gareth_game.webp / gareth_lunge.webp / gareth_game.json for test/index.html
