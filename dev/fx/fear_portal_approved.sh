#!/bin/sh
# Baelgor Fear - portal grab mockup as Harley approved it (19 Nov 2026):
# heartbeat pulse on Baelgor + heartbeat echo on the target, 4 carved lines (8 points) just before the portal opens,
# Atlas portal grab v2 (smoke edge-faded), fist sinks fast (4x), no end crack, embers as it shuts,
# residue on the target after release (dark wisps, red rim, 2 s). Portal + hand 4 px lower (PORTALDY default).
# Run: sh dev/fx/fear_portal_approved.sh BG.png OUT_DIR
EMBERS=1 NOCRACK=1 CARVE=8 CARVEROT=22.5 HZRESID=1 PORTALCLIP=portal_grab_v2.mp4 PORTALDESC=portal_descend_v1.mp4 \
PORTALY=500,975 PORTALFRONT=108 HZECHO=1 HZFX=portal python3 "$(dirname "$0")/fear_pulse_mock.py" "$1" "$2" 225,25,45 1
