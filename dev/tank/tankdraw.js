// drawTank(ctx, x, feetY, height, st): draws the tank (facing left) with its track bottom at feetY, centred on x, total height = height.
// st = {dist, fireT, t} (dist = tread travel in source px, fireT = seconds when last fired)
var TK=(function(){
  var TUR_DY=74, TRK={x0:300,x1:1370,top:646,r:84,th:56}; TRK.cy=TRK.top+TRK.th/2+TRK.r;
  var L=TRK.x1-TRK.x0, per=2*L+2*Math.PI*TRK.r, NPL=Math.round(per/47.67), pitch=per/NPL, GROUND=TRK.cy+TRK.r+TRK.th/2;
  var TOP=12+TUR_DY, CX=(36+1460)/2, WR=48, SR=62, wheelsX=[TRK.x0,420,540,660,780,900,1020,1140,1260,TRK.x1];
  function tp(s){s=((s%per)+per)%per;if(s<L)return{x:TRK.x1-s,y:TRK.cy-TRK.r,a:0};s-=L;var arc=Math.PI*TRK.r;
    if(s<arc){var t=s/TRK.r;return{x:TRK.x0-Math.sin(t)*TRK.r,y:TRK.cy-Math.cos(t)*TRK.r,a:-t}}s-=arc;
    if(s<L)return{x:TRK.x0+s,y:TRK.cy+TRK.r,a:Math.PI};s-=L;var t=s/TRK.r;return{x:TRK.x1+Math.sin(t)*TRK.r,y:TRK.cy+Math.cos(t)*TRK.r,a:Math.PI-t}}
  return {GROUND:GROUND,TOP:TOP,CX:CX,TUR_DY:TUR_DY,draw:function(x,I,P,st){
    var dist=st.dist,t=st.t,ft=t-st.fireT,recoil=0,kick=0,rock=0;
    if(ft>=0&&ft<1.2){recoil=ft<.06?ft/.06:Math.max(0,1-(ft-.06)/.7);recoil=Math.pow(recoil,1.5);kick=recoil;rock=Math.sin(Math.min(1,ft/.9)*Math.PI*2.5)*Math.exp(-ft*3)}
    function img(k,dx,dy){var p=P[k];x.drawImage(I[k],p[0]+(dx||0),p[1]+(dy||0))}
    function spin(k,cx,cy,rad,ang){var im=I[k],s=rad*2/Math.max(im.width,im.height);x.save();x.translate(cx,cy);x.rotate(ang);x.drawImage(im,-im.width*s/2,-im.height*s/2,im.width*s,im.height*s);x.restore()}
    var bob=st.moving?Math.sin(dist/pitch*Math.PI*2)*1.2:0;
    x.save();x.translate(TRK.x1,GROUND);x.rotate(-rock*0.025);x.translate(-TRK.x1+rock*6,-GROUND+bob);
    x.save();x.translate(kick*10,TUR_DY-kick*2);x.translate(900,250);x.rotate(kick*0.03);x.translate(-900,-250);
    img('barrel',recoil*48,0);img('turret');
    var gl=.25+.2*Math.sin(t*9)+.1*Math.sin(t*23);x.globalCompositeOperation='lighter';x.fillStyle='rgba(255,140,40,'+gl+')';x.fillRect(1094,222,56,78);x.globalCompositeOperation='source-over';
    x.restore();
    img('hull');
    x.globalCompositeOperation='lighter';x.fillStyle='rgba(255,140,40,'+(gl*.8)+')';x.fillRect(1322,458,46,80);x.globalCompositeOperation='source-over';
    x.fillStyle='#16100a';x.beginPath();x.moveTo(TRK.x0,TRK.cy-TRK.r);x.lineTo(TRK.x1,TRK.cy-TRK.r);x.arc(TRK.x1,TRK.cy,TRK.r,-Math.PI/2,Math.PI/2);x.lineTo(TRK.x0,TRK.cy+TRK.r);x.arc(TRK.x0,TRK.cy,TRK.r,Math.PI/2,Math.PI*1.5);x.fill();
    for(var i=0;i<wheelsX.length;i++){if(i==0)spin('wheel',wheelsX[i],TRK.cy,TRK.r-TRK.th/2+4,-dist/(TRK.r-24));else if(i==wheelsX.length-1)spin('sprocket',wheelsX[i],TRK.cy,SR,-dist/SR);else spin('wheel',wheelsX[i],TRK.cy+TRK.r-TRK.th/2-WR+4,WR,-dist/WR)}
    var pl=I.plate;for(var k=0;k<NPL;k++){var q=tp(k*pitch+dist);x.save();x.translate(q.x,q.y);x.rotate(q.a);x.drawImage(pl,-pl.width/2,-pl.height/2,pl.width*1.02,pl.height);x.restore()}
    x.restore();
    if(ft>=0&&ft<.2){var f=1-ft/.2,mx=36+recoil*48,my=236+TUR_DY;x.save();x.globalCompositeOperation='lighter';
      for(var j=0;j<3;j++){x.fillStyle=['rgba(255,240,180,','rgba(255,170,60,','rgba(255,90,20,'][j]+(f*.9)+')';x.beginPath();x.ellipse(mx-60-j*30,my,90+j*50,40+j*18,0,0,7);x.fill()}x.restore()}
  }};
})();
