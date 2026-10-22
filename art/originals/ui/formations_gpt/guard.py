from PIL import Image;import numpy as np,cv2
K='../kit/'
base=np.asarray(Image.open(K+'fs/card_blue.png').convert('RGB')).astype(np.float32)
red=np.asarray(Image.open(K+'fs/card_red.png').convert('RGB')).astype(np.float32)
H,W,_=base.shape
M=np.zeros((H,W),np.uint8)
poly=np.array([(14,0),(214,0),(214,54),(199,54),(199,178),(156,194),(128,244),(54,198),(54,54),(14,54)],np.int32)
cv2.fillPoly(M,[poly],1); M=cv2.dilate(M,np.ones((5,5),np.uint8)); cv2.circle(M,(61,73),39,1,-1)
out=base.copy()
# a) top-left corner from mirrored top-right
tr=base[0:64,W-38:W][:,::-1]; out[0:64,0:38]=tr
# b) top border from x 250..
out[0:19,38:214]=base[0:19,250:426]
keep=np.zeros((H,W),np.uint8); keep[0:64,0:38]=1; keep[0:19,38:214]=1
mask=(M&(1-keep)).astype(np.uint8)
# don't inpaint the title bar / panel to the right of x 212
mask[:, 212:]=0
img=out.clip(0,255).astype(np.uint8)
inp=cv2.inpaint(img,mask,9,cv2.INPAINT_TELEA).astype(np.float32)
# add a little parchment grain where inpainted
rng=np.random.default_rng(1); noise=cv2.GaussianBlur(rng.normal(0,4,(H,W)).astype(np.float32),(0,0),1.2)[...,None]
inp=np.where(mask[...,None]>0,inp+noise,inp)
Image.fromarray(inp.clip(0,255).astype(np.uint8)).save('nobanner.png')
Image.fromarray(mask*255).save('mask.png')
