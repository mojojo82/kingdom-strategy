import numpy as np, json, base64, sys
d=np.load(sys.argv[1]); P=d['pos']; C=d['col']; T=d['T']
# weld exact duplicate positions back to shared verts (faces stay flat: colour + normal are per face)
U,inv=np.unique(np.round(P,6),axis=0,return_inverse=True); inv=inv.reshape(-1)
I=inv[T].astype(np.uint16)
c=(U.max(0)+U.min(0))/2; h=(U.max(0)-U.min(0))/2
q=np.round((U-c)/h*32767).astype(np.int16)
fc=np.clip(np.round(C[T[:,0]]),0,255).astype(np.uint8)
b=lambda a: base64.b64encode(a.tobytes()).decode()
M={"c":[round(float(x),5) for x in c],"h":[round(float(x),5) for x in h],"p":b(q),"i":b(I),"fc":b(fc)}
s=json.dumps(M,separators=(',',':')); open(sys.argv[2],'w').write(s)
print(len(U),'verts',len(T),'faces',len(s),'bytes', M['c'], M['h'])
