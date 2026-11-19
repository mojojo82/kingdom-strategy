# Mail cards (v1751): no 9-slice (hairline seams). Row card = the card picture made at the rows' exact shape (3.903:1) by stretching only
# its plain middle rows; open-mail card = top cap + bottom cap + a plain middle band (stacked backgrounds, stretched only vertically).
from PIL import Image; import io, hashlib, json
M='art/originals/ui/mail_v2/'
card=Image.open(M+'card.png').convert('RGBA'); w,h=card.size   # colour-matched below like before
import numpy as np
B='art/originals/ui/backpack_v2/'
def med(im,box): a=np.array(im.convert('RGB').crop(box)).reshape(-1,3).astype(float); return np.median(a,0)
P_SEL=med(Image.open(B+'tab_sel_overlay.png'),(80,40,160,80)); src=med(card,(300,80,1000,180))
a=np.array(card).astype(float); a[:,:,:3]=np.clip(a[:,:,:3]*(P_SEL/src),0,255); card=Image.fromarray(a.astype(np.uint8))
def save(im,name):
    b=io.BytesIO(); im.save(b,'WEBP',quality=92,method=6); d=b.getvalue(); hh=hashlib.md5(d).hexdigest()[:8]
    fn=f'test/assets/ui-mail-{name}-{hh}.webp'; open(fn,'wb').write(d); return fn.split('test/')[1]
out={}
th=round(w/3.903); top,bot=int(h*0.36),int(h*0.64)
row=Image.new('RGBA',(w,th)); row.paste(card.crop((0,0,w,top)),(0,0)); row.paste(card.crop((0,top,w,bot)).resize((w,th-top-(h-bot)),Image.BICUBIC),(0,top)); row.paste(card.crop((0,bot,w,h)),(0,th-(h-bot)))
row.save(M+'card_row.png'); out['row']=save(row,'cardrow')
out['top']=save(card.crop((0,0,w,top)),'cardtop'); out['mid']=save(card.crop((0,top,w,bot)),'cardmid'); out['bot']=save(card.crop((0,bot,w,h)),'cardbot')
out['cap_top_ratio']=top/w; out['cap_bot_ratio']=(h-bot)/w
json.dump(out,open(M+'mail_card3.json','w'),indent=1); print(out)
