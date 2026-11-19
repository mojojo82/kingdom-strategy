# Mail tab bar: one "selected" piece per slot, cut from the slab's own tab bar (same shape as the unselected tabs),
# dark fill recoloured to the Backpack's selected-tab parchment, bottom rim opened into the panel below. Harley v1748.
from PIL import Image, ImageFilter; import numpy as np, io, hashlib, json
from scipy import ndimage
M='art/originals/ui/mail_v2/'; B='art/originals/ui/backpack_v2/'
slab=Image.open(M+'mail_slab_clean.png').convert('RGBA'); A=np.array(slab).astype(float); H,W=A.shape[:2]
selref=np.array(Image.open(B+'tab_sel_overlay.png').convert('RGB')).astype(float)
P_LO=np.median(selref[60:80,60:170].reshape(-1,3),0)*0.93; P_HI=np.median(selref[30:50,60:170].reshape(-1,3),0)*1.02
Y0,Y1=186,322; BAR_T,BAR_B=190,316
slots=[(64,238),(238,398),(398,562),(562,726),(726,884)]
out={'slots':[]}
for i,(L,R) in enumerate(slots):
    x0,x1=L-3,R+3; c=A[Y0:Y1,x0:x1].copy(); rgb=c[:,:,:3]; s=rgb.sum(2)
    dark=(s>140)&(s<470)
    lab,n=ndimage.label(dark); cy,cx=(BAR_T+BAR_B)//2-Y0,(x1-x0)//2; m=lab==lab[cy,cx]
    m=ndimage.binary_dilation(m,iterations=1)&(s<520)&(s>120)
    lum=s[m]; lo,hi=np.percentile(lum,5),np.percentile(lum,95); t=np.clip((s-lo)/(hi-lo+1e-6),0,1)
    rgb[m]=(P_LO+(P_HI-P_LO)*t[m][:,None])
    # open the bottom: from the fill's last row down, between its inner edges, paint the panel parchment that lies below the bar
    rows=np.where(m.any(1))[0]; fb=rows.max(); cols=np.where(m[fb-6])[0]; il,ir=cols.min()+1,cols.max()-1
    below=A[Y1+6:Y1+14,x0:x1,:3].mean(0)  # panel parchment just under the bar, per column
    for y in range(fb-2,Y1-Y0):
        w=min(1,(y-(fb-2))/4)
        rgb[y,il:ir]=rgb[y,il:ir]*(1-w)+below[il:ir]*w
    c[:,:,:3]=np.clip(rgb,0,255)
    im=Image.fromarray(c.astype(np.uint8))
    im.save(f'{M}tab_on_slot{i}.png')
    b=io.BytesIO(); im.save(b,'WEBP',quality=92,method=6); d=b.getvalue(); h=hashlib.md5(d).hexdigest()[:8]
    fn=f'test/assets/ui-mail-tabon{i}-{h}.webp'; open(fn,'wb').write(d)
    out['slots'].append({'src':fn.split('test/')[1],'L':L,'R':R,'x0':x0,'x1':x1})
out.update({'Y0':Y0,'Y1':Y1,'BAR_T':BAR_T,'BAR_B':BAR_B,'BX':60,'BW':853,'W':W,'H':H})
json.dump(out,open(M+'mail_tabs.json','w'),indent=1); print(json.dumps(out,indent=1))
# preview: all 5 states
prev=Image.new('RGBA',(W,(Y1-Y0+30)*5),(30,40,60,255))
for i,sl in enumerate(out['slots']):
    v=slab.copy(); v.alpha_composite(Image.open(f'{M}tab_on_slot{i}.png'),(sl['x0'],Y0)); prev.alpha_composite(v.crop((0,Y0-10,W,Y1+20)),(0,i*(Y1-Y0+30)))
prev.convert('RGB').save('/tmp/claude-0/-home-claude/14deb026-a209-5dd6-bb00-0d996b7bcaaa/scratchpad/mtabs.png')
