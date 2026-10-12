import sys
from PIL import Image, ImageOps
n=int(sys.argv[1]); out=sys.argv[2]; mir=len(sys.argv)>3
ims=[Image.open(f'm{i}.png') for i in range(n)]
if mir: ims=[ImageOps.mirror(i) for i in ims]
w,h=ims[0].size;o=Image.new('RGB',(w*n,h))
[o.paste(im,(i*w,0)) for i,im in enumerate(ims)];o.thumbnail((1600,420));o.save(out)
