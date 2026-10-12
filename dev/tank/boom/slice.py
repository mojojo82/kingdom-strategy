import numpy as np, json
from PIL import Image
from scipy import ndimage as nd
a=np.asarray(Image.open('src.png').convert('RGB')).astype(float)
M=np.array([255,0,255.])
def key(c):  # magenta key with un-spill: alpha from distance, colour unblended
    d=np.sqrt(((c-M)**2).sum(2)); al=np.clip((d-40)/110,0,1)
    out=np.zeros(c.shape[:2]+(4,),np.uint8); safe=np.maximum(al,1e-3)[...,None]
    col=np.clip((c-(1-al[...,None])*M)/safe,0,255); out[...,:3]=col; out[...,3]=(al*255).astype(np.uint8); return out,al
def frames(y0,y1,name,gap=8):
    c=a[y0:y1]; rgba,al=key(c); m=al>0.25
    colm=nd.binary_dilation(m.any(0),iterations=gap//2)
    lab,n=nd.label(colm); fr=[]
    for i in range(1,n+1):
        xs=np.where(lab==i)[0]; x0,x1=xs.min(),xs.max()+1
        if m[:,x0:x1].sum()<15: continue
        fr.append((int(x0),int(x1)))
    # common cell: max width, full band height, frames centred on their x-centre, bottom-aligned as drawn
    W=max(x1-x0 for x0,x1 in fr)+4; H=y1-y0
    sheet=Image.new('RGBA',(W*len(fr),H))
    for i,(x0,x1) in enumerate(fr):
        cx=(x0+x1)//2; L=max(0,cx-W//2); im=Image.fromarray(rgba[:,L:L+W]); 
        # mask out neighbour bits outside this frame's span
        arr=np.asarray(im).copy(); lx0=x0-L; lx1=x1-L; arr[:,:max(0,lx0)]=0; arr[:,lx1:]=0
        sheet.paste(Image.fromarray(arr),(i*W,0))
    sheet.save(name+'.png'); print(name,len(fr),'frames cell',W,H,fr[:3],fr[-2:]); return {'n':len(fr),'w':W,'h':H}
info={'hit':frames(716,790,'hit'),'big':frames(497,620,'big')}
json.dump(info,open('boom.json','w'))
