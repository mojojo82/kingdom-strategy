# Key a ChatGPT skin restyle off its flat magenta background and trim it. Run: python3 dev/skins/key_magenta.py IN.png OUT.png
import sys, numpy as np
from PIL import Image
sys.path.insert(0,'/home/claude/kingdom-strategy/dev/levels')
from build_graveyard import key
src,out=sys.argv[1],sys.argv[2]
im=key(Image.open(src)); bb=im.getchannel('A').point(lambda v:255 if v>20 else 0).getbbox(); im=im.crop(bb); im.save(out); print(out,im.size)
