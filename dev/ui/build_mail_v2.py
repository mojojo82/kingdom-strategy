from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
import numpy as np
S=None
B='art/originals/ui/backpack_v2/'; M='art/originals/ui/mail_v2/'
def med(im,box): a=np.array(im.convert('RGB').crop(box)).reshape(-1,3).astype(float); return np.median(a,0)
def gain_dark(im, src, dst, lo=60, hi=200):
    """recolour only the dark fill toward dst (gold rims untouched)"""
    a=np.array(im).astype(float); rgb=a[:,:,:3]; lum=rgb.mean(2)
    w=np.clip((hi-lum)/(hi-lo),0,1)[:,:,None]
    g=np.array(dst)/np.array(src)
    a[:,:,:3]=np.clip(rgb*(1-w)+rgb*g*w,0,255); return Image.fromarray(a.astype(np.uint8))
def gain_all(im, src, dst):
    a=np.array(im).astype(float); a[:,:,:3]=np.clip(a[:,:,:3]*(np.array(dst)/np.array(src)),0,255); return Image.fromarray(a.astype(np.uint8))
# ---- palette (from the Backpack, the source of truth)
bp=Image.open(B+'slab_tabs_base_keyed.png')
P_TAB=med(bp,(330,1380,420,1420)); P_PANEL=med(bp,(300,1150,700,1250)); P_WELL=med(bp,(400,500,600,700))
P_SEL=med(Image.open(B+'tab_sel_overlay.png'),(80,40,160,80))
# ---- parts we have: slab (the Backpack family's tab-less slab), matched to the Backpack's panel
slab=Image.open(B+'slab_keyed.png').convert('RGBA')
slab=gain_all(slab, med(slab,(300,1150,700,1250)), P_PANEL)
W,H=slab.size
# repaint the interior: parchment from the Backpack panel texture
tex=bp.crop((120,960,860,1320)).convert('RGBA')
inner=(54,190,W-54,H-56)
fill=tex.resize((inner[2]-inner[0],inner[3]-inner[1]),Image.BICUBIC)
fa=Image.new('L',fill.size,0); ImageDraw.Draw(fa).rectangle((3,3,fill.size[0]-4,fill.size[1]-4),fill=255); fill.putalpha(fa.filter(ImageFilter.GaussianBlur(2)))
slab.alpha_composite(fill,(inner[0],inner[1]))
# tall well: 9-slice the Backpack's well
def nine(src,box,c,w,h):
    s=src.crop(box); sw,sh=s.size; out=Image.new('RGBA',(w,h))
    xs=[(0,c,0,c),(c,sw-c,c,w-c),(sw-c,sw,w-c,w)]; ys=[(0,c,0,c),(c,sh-c,c,h-c),(sh-c,sh,h-c,h)]
    for (x0,x1,X0,X1) in xs:
        for (y0,y1,Y0,Y1) in ys:
            out.paste(s.crop((x0,y0,x1,y1)).resize((max(1,X1-X0),max(1,Y1-Y0)),Image.BICUBIC),(X0,Y0))
    return out
WELL=(80,410,W-80,H-78)
well=nine(bp.convert('RGBA'),(80,195,920,885),48,WELL[2]-WELL[0],WELL[3]-WELL[1])
slab.alpha_composite(well,(WELL[0],WELL[1]))
# ---- parts GPT made: tab bar (dark fill matched to the Backpack's tab bronze), selected tab, card
bar=Image.open(M+'tabbar_off.png').convert('RGBA'); bar=gain_dark(bar, med(bar,(60,60,200,150)), P_TAB)
barW=W-120; bar=bar.resize((barW,round(bar.height*barW/bar.width)),Image.LANCZOS)
BX,BY=60,190
slab.alpha_composite(bar,(BX,BY))

sel=Image.open(M+'tab_sel.png').convert('RGBA'); sel=gain_all(sel, med(sel,(120,60,300,140)), P_SEL)
slotW=barW/5; selk=(slotW*1.18)/sel.width; sel=sel.resize((round(sel.width*selk),round(sel.height*selk)),Image.LANCZOS)
card=Image.open(M+'card.png').convert('RGBA'); card=gain_all(card, med(card,(300,80,1000,180)), P_SEL)
import json, hashlib, io
os=__import__('os')
def save(im,name,q=90):
    b=io.BytesIO(); im.save(b,'WEBP',quality=q,method=6); d=b.getvalue(); h=hashlib.md5(d).hexdigest()[:8]
    fn=f'test/assets/ui-mail-{name}-{h}.webp'; open(fn,'wb').write(d); return fn.split('test/')[1]
out={}
slab.save(M+'mail_slab_clean.png')
out['slab']=save(slab,'slab'); out['tabon']=save(sel,'tabon'); out['card']=save(card,'card')
for n in ['ti_wars','ti_alliance','ti_system','ti_reports','ti_saved','bookmark','dot']:
    im=Image.open(M+n+'.png').convert('RGBA'); k=96/max(im.size); out[n]=save(im.resize((round(im.width*k),round(im.height*k)),Image.LANCZOS),n.replace('_',''))
for n in ['mi_chest','mi_gift','mi_horn','mi_event','mi_letter']:
    im=Image.open(M+n+'.png').convert('RGBA').resize((160,160),Image.LANCZOS); out[n]=save(im,n.replace('_',''))
sy=BY+bar.height-sel.height+round(14*selk)+18
pc=lambda v,t: round(v/t*100,2)
geo={'W':W,'H':H,'bar':[pc(BX,W),pc(BY,H),pc(barW,W),pc(bar.height,H)],'slot':pc(slotW,W),
 'sel':{'w':pc(sel.width,W),'h':pc(sel.height,H),'top':pc(sy,H),'dx':pc(sel.width/2,W)},
 'well':[pc(WELL[0],W),pc(WELL[1],H),pc(W-WELL[2],W),pc(H-WELL[3],H)],'status_y':pc(BY+bar.height+70,H),'card_px':card.size}
out['geo']=geo
json.dump(out,open(M+'mail_assets.json','w'),indent=1); print(json.dumps(out,indent=1))
