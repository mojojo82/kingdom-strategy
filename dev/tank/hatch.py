# split the open hatch lid off the turret -> lid.png ; turret_closed.png (lid removed)
import numpy as np, json
from PIL import Image
P=json.load(open('parts.json')); x0,y0,w,h=P['turret']
t=np.asarray(Image.open('turret.png').convert('RGBA')).copy()
yy,xx=np.mgrid[:h,:w]; X=xx+x0; Y=yy+y0
lid=(t[...,3]>0)&(X>=806)&(X<=916)&(Y<104)&~((X<826)&(Y>78))
L=t.copy(); L[~lid,3]=0; ys,xs=np.where(lid)
Image.fromarray(L[ys.min():ys.max()+1,xs.min():xs.max()+1]).save('lid.png'); P['lid']=[int(xs.min()+x0),int(ys.min()+y0),int(xs.max()-xs.min()+1),int(ys.max()-ys.min()+1)]
t[lid,3]=0; Image.fromarray(t).save('turret.png'); json.dump(P,open('parts.json','w')); print(P['lid'])
