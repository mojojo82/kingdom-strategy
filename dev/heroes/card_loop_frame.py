"""v1512: the frame of a card clip at LOOP_START (seconds), saved as a PNG on its original flat background, for the card's Atlas loop clip
(Image = End Image = this frame). Run: python3 dev/heroes/card_loop_frame.py CLIP.mp4 LOOP_START OUT.png"""
import subprocess, sys
src, ls, out = sys.argv[1], float(sys.argv[2]), sys.argv[3]
subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", src, "-vf", "fps=24,select=eq(n\\,%d)" % round(ls * 24), "-frames:v", "1", out], check=True)
print(out)
