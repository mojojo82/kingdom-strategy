from PIL import Image, ImageOps
import glob, json
W=1052; AX,AY=526,670
bb=None
for f in glob.glob('frames/*.png'):
    b=Image.open(f).getchannel('A').point(lambda v:255 if v>8 else 0).getbbox()
    bb=b if bb is None else (min(bb[0],b[0]),min(bb[1],b[1]),max(bb[2],b[2]),max(bb[3],b[3]))
L,R,U,D=W-bb[2]-8, W-bb[0]+8, bb[1]-8, max(bb[3],AY)+6
s=3*61/551
rows=[('Idleready',8),('OverheadChop',12),('MixamoSlash',16),('MixamoRun',16),('MixamoHit',14)]
cw=round((R-L)*s); ch=round((D-U)*s)
sheet=Image.new('RGBA',(cw*max(k for _,k in rows),ch*len(rows)))
for r,(n,k) in enumerate(rows):
    for f in range(k):
        im=ImageOps.mirror(Image.open(f'frames/{n}_{f:02d}.png').convert('RGBA')).crop((L,U,R,D)).resize((cw,ch),Image.LANCZOS)
        sheet.paste(im,(f*cw,r*ch))
sheet.save('knight_sheet.webp',quality=90,method=4)
meta={'cw':cw,'ch':ch,'ax':round((AX-L)*s,2),'ay':round((AY-U)*s,2),'rows':{'idle':[0,8],'attack':[1,12],'mixamo':[2,16],'mixrun':[3,16],'run':[3,16],'hit':[4,14]},'fps':{'idle':8,'run':24,'attack':22,'hit':20}}
json.dump(meta,open('knight_sheet.json','w')); print(meta)
