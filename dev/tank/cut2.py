import numpy as np
from PIL import Image
from scipy import ndimage as nd
im=np.asarray(Image.open('src.png').convert('RGB')).astype(np.int32)
H,W,_=im.shape
wall=im.max(2)<32
wall=nd.binary_closing(wall,iterations=1)
free=~wall
lab,n=nd.label(free)
sizes=nd.sum(free,lab,range(1,n+1))
# regions touching the border are background
border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
bg=np.isin(lab,list(border))
# enclosed regions: background if big and smooth (low local variance)
g=im.mean(2); var=nd.uniform_filter(g*g,9)-nd.uniform_filter(g,9)**2
for i in range(1,n+1):
    if i in border or sizes[i-1]<2000: continue
    r=lab==i
    if np.median(var[r])<6: bg|=r; print('hole',i,int(sizes[i-1]),np.median(var[r]))
fg=~bg
fg=nd.binary_fill_holes(fg)&~bg | (fg)
# trim outer outline by 0 (keep outline)
Image.fromarray((fg*255).astype(np.uint8)).resize((768,512)).save('mask2_s.png')
np.save('fg.npy',fg)
