import numpy as np, json, base64, io
from PIL import Image
from scipy import ndimage as nd
fg=np.load('fg.npy'); im=np.asarray(Image.open('src.png').convert('RGBA')).copy()
lab,n=nd.label(fg)
def comp(y,x): return lab==lab[y,x]
def crop(mask,name):
    a=im.copy(); a[...,3]=np.where(mask,255,0)
    ys,xs=np.where(mask); y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
    Image.fromarray(a[y0:y1,x0:x1]).save(name+'.png'); return [int(x0),int(y0),int(x1-x0),int(y1-y0)]
P={}
tur=comp(200,300); hull=comp(500,700)
# hull may be several touching blobs - take everything in its band
band=np.zeros_like(fg); band[345:712,:]=True; hull=fg&band&~comp(200,300)
hull=nd.binary_opening(hull,iterations=1)|(hull&nd.binary_erosion(hull))
hl,hn=nd.label(hull); s=nd.sum(hull,hl,range(1,hn+1)); hull=np.isin(hl,[i+1 for i,v in enumerate(s) if v>200])
yy,xx=np.mgrid[:fg.shape[0],:fg.shape[1]]
barrel=tur&(((xx<580)&(yy>100))|((xx<592)&(yy>150)))
P['barrel']=crop(barrel,'barrel'); P['turret']=crop(tur&~barrel,'turret'); P['hull']=crop(hull,'hull')
P['wheel']=crop(comp(873,1197),'wheel'); P['sprocket']=crop(comp(870,1396),'sprocket')
a=im.copy(); a[...,3]=fg*255; Image.fromarray(a[740:808,466:514]).save('plate.png'); P['plate']=[466,740,48,68]
json.dump(P,open('parts.json','w')); print(P)
