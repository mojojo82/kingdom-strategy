# v1475 (Harley): the 3-way I / II / III fortress picker for the Formations screen. Built from pieces/pick1.png + pick3.png (rim, cyan, dark).
# Run from this folder with pick3way_base.py next to it (it reuses its rim/inside/fill code); writes pickRoman_1..3.png (copied to pieces/pickR1..3.png).
exec(open('mk2.py').read().split("outs=[state(k)")[0].replace("icons=[bomb,bolt,shield]","icons=None"))
from PIL import ImageFont
F='/usr/share/fonts/truetype/freefont/FreeSerifBold.ttf'
def numeral(txt, on):
    S=8; im=Image.new('RGBA',(60*S,44*S),(0,0,0,0)); d=ImageDraw.Draw(im); f=ImageFont.truetype(F,34*S)
    bb=d.textbbox((0,0),txt,font=f); x=(im.width-(bb[2]-bb[0]))//2-bb[0]; y=(im.height-(bb[3]-bb[1]))//2-bb[1]
    out=(20,14,6,255) if not on else (6,40,52,255); fill=(240,200,110,255) if not on else (12,52,66,255)
    d.text((x,y),txt,font=f,fill=fill,stroke_width=(3 if not on else 1.4)*S if False else int((2.2 if not on else 1.2)*S),stroke_fill=out)
    return im.resize((60,44),Image.LANCZOS)
labels=["I","II","III"]
def state2(k):
    on=np.zeros((H,W),bool); on[:,cuts[k]:cuts[k+1]]=True
    X=np.where(inside[...,None],np.where(on[...,None],cyan,dark),p1)
    for xb in cuts[1:3]: X[:,xb-1:xb+1]=np.where(inside[:,xb-1:xb+1,None],X[:,xb-1:xb+1]*0.35,X[:,xb-1:xb+1])
    im=Image.fromarray(np.clip(X,0,255).astype(np.uint8)).convert('RGBA')
    for i,(a,b) in enumerate(zip(cuts[:3],cuts[1:])):
        n=numeral(labels[i], False)  # Harley: same gold numeral on the lit segment, only the blue changes
        im.alpha_composite(n,((a+b)//2-n.width//2,27-n.height//2))
    return im
outs=[state2(k) for k in range(3)]
for k,o in enumerate(outs): o.save(f'pickRoman_{k+1}.png')
s=4; sheet=Image.new('RGB',(W*s*3+40,H*s+40),(24,20,18)); dr=ImageDraw.Draw(sheet)
dr.text((10,4),"MOCKUP: I on / II on / III on",fill=(230,200,120))
for i,o in enumerate(outs): sheet.paste(o.convert('RGB').resize((W*s,H*s),Image.LANCZOS),(10+i*(W*s+10),22))
sheet.save('pick_roman.png')
