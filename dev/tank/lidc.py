# closed hatch lid, drawn in 3px "art pixels" to match the GPT sprite, sits on the rim (src x 816..904, bottom y 106)
import numpy as np, json
from PIL import Image
O=(18,12,6);H=(226,196,122);M=(176,140,72);D=(112,86,42);S=(70,52,26);R=(240,220,160)
rows=[ # 30 wide art px; '.'=clear o=outline h=hi m=mid d=dark s=shadow r=rivet
"......oooooooooooooooooo......",
"....oohhhhhhhhhhhhhhhhhhoo....",
"...ohhmmmmmmmmmmmmmmmmmmmhoo..",
"..ohmmmrmmmmmmmrmmmmmmmrmmdooo",
".ohmmmmmmmmmmmmmmmmmmmmmmdddko",
"ohmmmmmmmmmmmmmmmmmmmmmmmmddko",
"odddddddddddddddddddddddddddso",
"oooooooooooooooooooooooooooooo"]
C={'o':O,'h':H,'m':M,'d':D,'s':S,'r':R,'k':(150,118,60)}
a=np.zeros((len(rows)*3,30*3,4),np.uint8)
for y,r in enumerate(rows):
    for x,ch in enumerate(r):
        if ch!='.': a[y*3:y*3+3,x*3:x*3+3,:3]=C[ch]; a[y*3:y*3+3,x*3:x*3+3,3]=255
Image.fromarray(a).save('lidc.png'); P=json.load(open('parts.json')); P['lidc']=[816,106-a.shape[0]+3,a.shape[1],a.shape[0]]; json.dump(P,open('parts.json','w')); print(P['lidc'])
