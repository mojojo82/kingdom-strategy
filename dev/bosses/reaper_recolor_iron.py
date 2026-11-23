import numpy as np, cv2, sys
def recolor(bgr):
  hsv=cv2.cvtColor(bgr,cv2.COLOR_BGR2HSV_FULL).astype(float)
  h=hsv[:,:,0]*360/255; s=hsv[:,:,1]/255; v=hsv[:,:,2]/255
  glow=((h<20)|(h>345))&(s>0.62)&(v>0.42)
  bone=(h>=15)&(h<=65)&(s<0.38)&(v>0.55)
  steel=s<0.12
  iron=~(glow|bone|steel)
  out_h=h.copy(); out_s=s.copy(); out_v=v.copy()
  warm=(h>=20)&(h<=70)  # was gold: keep a little more contrast for the rims and rivets
  out_h[iron]=30; out_s[iron]=0.11
  out_v[iron&warm]=0.07+0.56*v[iron&warm]**1.45
  out_v[iron&~warm]=0.07+0.58*v[iron&~warm]
  out_v[steel]=0.12+0.72*v[steel]; out_h[steel]=30; out_s[steel]=0.06
  # bone: slightly cooler / less yellow, like the concept
  out_s[bone]=s[bone]*0.6
  hsv2=np.dstack([out_h*255/360,out_s*255,out_v*255]).clip(0,255).astype(np.uint8)
  return cv2.cvtColor(hsv2,cv2.COLOR_HSV2BGR_FULL)
if __name__=='__main__':
  im=cv2.imread(sys.argv[1],cv2.IMREAD_UNCHANGED)
  rgb=recolor(im[:,:,:3]); out=np.dstack([rgb,im[:,:,3]]) if im.shape[2]==4 else rgb
  cv2.imwrite(sys.argv[2],out)
