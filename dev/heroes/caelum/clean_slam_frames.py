# v2: only the impact frames (58-90): drop semi-transparent neutral-white swoosh pixels (alpha < 240, low saturation, bright) and grey dust;
# opaque white hair and the warm cream wings stay. Earlier frames untouched (the blurred hammer in 57 must stay).
import glob, numpy as np, os, shutil
from PIL import Image
import scipy.ndimage as nd
L='/home/claude/kingdom-strategy/art/originals/heroes/caelum/large/slam_down/'
OUT=os.path.join(os.path.dirname(L.rstrip('/')),'slam_clean')+'/'
os.makedirs(OUT,exist_ok=True)
fs=sorted(glob.glob(L+'*.webp'))
for i,f in enumerate(fs):
    im=Image.open(f).convert('RGBA')
    if 58 <= i <= 92:
        a=np.asarray(im).astype(float); al=a[...,3]; rgb=a[...,:3]; mx=rgb.max(2); mn=rgb.min(2); sat=(mx-mn)/np.maximum(mx,1)
        swoosh=(al<240)&(sat<0.10)&(mx>120)
        dust=(sat<0.12)&(mx>60)&(mx<215)&(al<250)
        rm=nd.binary_dilation(swoosh|dust,iterations=1)&(al<250)
        al2=al.copy(); al2[rm]=0
        # leftover specks: drop tiny islands
        lab,n=nd.label(al2>40)
        if n>1:
            sz=nd.sum(al2>40,lab,range(1,n+1))
            for k,s_ in enumerate(sz):
                if s_<400: al2[lab==k+1]=0
        a[...,3]=al2; im=Image.fromarray(a.astype(np.uint8))
    im.save(OUT+'%04d.webp'%i,'WEBP',quality=92)
print('done')
