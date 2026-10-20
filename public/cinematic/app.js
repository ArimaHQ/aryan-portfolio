/* ARIMA home — rendering and interaction. Content comes from content.js (window.ARIMA). */
(()=>{
'use strict';
const A=window.ARIMA;
document.documentElement.lang='en';document.documentElement.dir='ltr';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)], body=document.body, root=document.documentElement;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse=matchMedia('(pointer: coarse)').matches;
const DPR=Math.min(devicePixelRatio||1,2);
body.classList.add('locked');
if(reduce)body.classList.add('reduced');

/* ---------- device tier ---------- */
const cores=navigator.hardwareConcurrency||4, mem=navigator.deviceMemory||4, conn=navigator.connection||{};
let tier=2; if(cores<=4||mem<=4||coarse||innerWidth<760) tier=1; if(reduce||conn.saveData||cores<=2||mem<=2) tier=0;
if(tier===0) body.classList.add('lite');

/* ---------- helpers ---------- */
const NS='http://www.w3.org/2000/svg';
const el=(t,a,p)=>{const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);p&&p.appendChild(e);return e};
const h=(t,a,html)=>{const e=document.createElement(t);if(a)for(const k in a){if(k==='class')e.className=a[k];else e.setAttribute(k,a[k])}if(html!=null)e.innerHTML=html;return e};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const chip=s=>`<span class="st" data-s="${s}">${esc(A.statuses[s]?A.statuses[s].label:s)}</span>`;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t, mix=(P,Q,t)=>P.map((v,i)=>lerp(v,Q[i],t));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
function seeded(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return((s>>>0)/4294967296)}}
function gauss(r){let u=0,v=0;while(u===0)u=r();v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(6.283185307*v)}
const WC=['105,200,255','255,49,78','193,141,240','99,220,143'];
function visible(node,cb,margin='200px'){const o=new IntersectionObserver(es=>es.forEach(e=>cb(e.isIntersecting)),{rootMargin:margin});o.observe(node);return o}
function fitCanvas(c,ctx){const r=c.getBoundingClientRect();const w=Math.max(2,Math.round(r.width*DPR)),hh=Math.max(2,Math.round(r.height*DPR));if(c.width!==w||c.height!==hh){c.width=w;c.height=hh}ctx.setTransform(DPR,0,0,DPR,0,0);return[r.width,r.height]}
const fmt=n=>Math.round(n).toLocaleString('en-GB');

/* =====================================================================
   1. WORLD PALETTE + SCULPTED WEBGL SURFACE
   ===================================================================== */
const WORLDS=[
  {deep:[9,32,61],  acc:[105,200,255],hi:[190,232,255],motif:1},  // blue · market curve
  {deep:[37,3,12],  acc:[255,49,78],  hi:[255,180,185],motif:0},  // red · candles
  {deep:[17,7,35],  acc:[193,141,240],hi:[243,234,255],motif:3},  // violet · simulation paths
  {deep:[6,34,20],  acc:[99,220,143], hi:[190,245,210],motif:2},  // green · mesh
];
let worldF=0,needsFrame=true;
function palette(f){const i=Math.min(2,Math.floor(f)),t=f-i,s=t*t*(3-2*t);
  return{deep:mix(WORLDS[i].deep,WORLDS[i+1].deep,s),acc:mix(WORLDS[i].acc,WORLDS[i+1].acc,s),hi:mix(WORLDS[i].hi,WORLDS[i+1].hi,s)}}
const worldsEls=$$('.world');
const worldLinks=$$('.worlds a');
function updateWorld(){
  const mid=innerHeight*.5;let f=0;
  for(let i=0;i<worldsEls.length;i++){const r=worldsEls[i].getBoundingClientRect();
    if(r.top<=mid){f=i+(i<3?clamp((mid-r.bottom+innerHeight*.35)/(innerHeight*.7),0,1):0)}}
  worldF=clamp(f,0,3);
  const p=palette(worldF);
  root.style.setProperty('--acc',p.acc.map(Math.round).join(','));root.style.setProperty('--hi',p.hi.map(Math.round).join(','));
  const max=root.scrollHeight-innerHeight;$('#prog').style.setProperty('--p',max>0?scrollY/max:0);
  const wi=Math.round(worldF);worldLinks.forEach((a,k)=>a.classList.toggle('on',k===wi));audio.world(wi);
  needsFrame=true;
}

/* ---------- the descent: one scroll-driven journey behind the content ----------
   Keyframes describe the environment at each chapter (mist, receding floor, tunnel, opposing currents, exposure, light angle).
   Each chapter is entered through its own threshold, driven by scroll so reversing plays it backwards. */
const journey=(function(){
  //            id            cloud floor tunnel dual  expo  tilt
  const K=[['top',          1,   0,   0,   0,   1.1,  0],
           ['about',        .6,  0,   0,   0,   1.04, .1],
           ['ecosystem',    .32, 0,   0,   0,   1,    .2],
           ['founder',      .14, 0,   0,   0,   .95,  .3],
           ['data',         0,   .85, 0,   0,   .9,   .5],
           ['miniapp',      0,   .7,  0,   0,   .85,  .55],
           ['research',     0,   0,   .8,  .1,  .8,   .62],
           ['behaviour',    0,   0,   .38, 1,   .62,  .85],
           ['university',   0,   0,   .2,  .75, .66,  .8],
           ['etf',          0,   0,   0,   .55, .7,   .75],
           ['brain',        0,   .9,  0,   .2,  .86,  .6],
           ['individuals',  0,   .6,  0,   .05, .9,   .5],
           ['businesses',   0,   .6,  0,   0,   .9,   .5],
           ['world',        0,   .8,  0,   .12, .86,  .55],
           ['execution',    0,   .5,  0,   0,   .93,  .45],
           ['contact',      0,   .42, 0,   0,   1,    .4]];
  const PORTALS=[['about',0],['data',1],['research',2],['brain',3],['world',4],['contact',5]];
  const names=['cloud','floor','tunnel','dual','expo','tilt'];
  const state={cloud:1,floor:0,tunnel:0,dual:0,expo:1.1,tilt:0,scr:0,pt:0,pp:0};
  let anchors=[],goal=K[0].slice(1),last={};
  function measure(){anchors=K.map(k=>{const e=document.getElementById(k[0]);return{y:e?e.getBoundingClientRect().top+scrollY:0,v:k.slice(1)}})}
  function update(){
    if(!anchors.length)measure();
    const y=scrollY+innerHeight*.5;let i=0;while(i<anchors.length-1&&anchors[i+1].y<=y)i++;
    const A=anchors[i],B=anchors[Math.min(i+1,anchors.length-1)];const t=B===A?0:smooth(.15,.85,(y-A.y)/Math.max(1,B.y-A.y));
    goal=A.v.map((v,k)=>lerp(v,B.v[k],t));
    state.scr=scrollY/innerHeight;state.pp=0;
    if(!reduce)for(const[id,type]of PORTALS){const e=document.getElementById(id);if(!e)continue;const top=e.getBoundingClientRect().top;
      const u=(innerHeight-top)/(innerHeight*1.25);
      const was=last[id]||0;if(u>.35&&was<=.35||u<.35&&was>=.35&&u>0)audio.portal(type);last[id]=u;
      if(u>0&&u<1&&state.pp===0){state.pt=type;state.pp=u}}
    if(reduce)names.forEach((n,k)=>state[n]=goal[k]);
    needsFrame=true;
  }
  function tick(dt){if(reduce)return;const r=Math.min(1,dt*3.5);names.forEach((n,k)=>state[n]+=(goal[k]-state[n])*r)}
  return{state,update,measure,tick};
})();

const cv=$('#surface');
let gl=null;try{gl=cv.getContext('webgl',{antialias:false,alpha:false,premultipliedAlpha:false,powerPreference:'high-performance'})}catch(e){}
const VS=`attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;
const FS=`
precision highp float;
uniform vec2 uRes;uniform float uTime;uniform vec2 uMouse;uniform float uHover;
uniform vec3 uRip[8];uniform vec4 uMotif;uniform vec3 uDeep,uAcc,uHi;
uniform float uCloud,uFloor,uTunnel,uDual,uExpo,uTilt,uScr,uPT,uPP;
float h1(float n){return fract(sin(n)*43758.5453);}
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<3;i++){s+=a*vnoise(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
float candles(vec2 p){
  float cw=.06;float x=p.x+uTime*.012;float ix=floor(x/cw);float fx=(fract(x/cw)-.5)*cw;
  float r2=h1(ix+17.3),r3=h1(ix+41.1);
  float c=.5+.13*sin(ix*.33)+.05*(h1(ix)-.5);float bh=.02+.075*r2;
  float body=1.-smoothstep(-.003,.004,max(abs(fx)-cw*.27,abs(fract(p.y*.5)*2.-c)-bh));
  float wick=(1.-smoothstep(0.,.003,abs(fx)-.0015))*(1.-smoothstep(0.,.006,abs(fract(p.y*.5)*2.-c)-bh*1.8));
  float s=r3>.42?1.:-1.;return s*(body*.045+wick*.016);}
float curve(vec2 p){float y=.52+.14*sin(p.x*2.3+uTime*.15)+.05*sin(p.x*7.1-uTime*.1)+.022*sin(p.x*17.+uTime*.2);
  float d=p.y-y;return .07*exp(-d*d*1500.)+.035*exp(-d*d*80.)-.015*smoothstep(0.,-.3,d);}
float grid(vec2 p){vec2 q=p*10.;vec2 f=abs(fract(q)-.5);vec2 cell=floor(q+.5);
  float line=1.-smoothstep(0.,.04,min(f.x,f.y));float node=1.-smoothstep(.04,.13,length(f));
  float pulse=step(.8,h2(cell))*(.5+.5*sin(uTime*1.6+h2(cell+3.)*6.28));
  return line*.018+node*(.025+.06*pulse);}
float paths(vec2 p){float x0=.18;float dx=p.x-x0;if(dx<0.)return .04*exp(-dot(p-vec2(x0,.5),p-vec2(x0,.5))*400.);
  float h=0.;for(int k=0;k<7;k++){float fk=float(k);float dr=(h1(fk*3.1+.5)-.5)*.5;
    float y=.5+dr*dx+.07*dx*sin(dx*(5.+fk*1.7)+fk*4.+uTime*.25)+.025*dx*sin(dx*23.+fk*2.);
    float d=p.y-y;h-=.045*exp(-d*d*2600.)*smoothstep(0.,.08,dx);}
  return h+.04*exp(-dot(p-vec2(x0,.5),p-vec2(x0,.5))*400.);}
/* the world: screen point -> point on the current surface (flat sheet, receding floor or tunnel) */
vec2 warp(vec2 uv,float asp,out float fog){
  vec2 p=vec2(uv.x*asp,uv.y);vec2 c=(uv-.5)*vec2(asp,1.);
  float dz=max(.66-uv.y,.012);
  vec2 gF=vec2(c.x/dz*.3+asp*.5,.28/dz+uScr*.35);
  float r=max(length(c),.015);float a=atan(c.y,c.x)+uTime*.03*uDual;
  vec2 gT=vec2(abs(a)/3.1416*1.4,.2/r+uScr*.5);
  fog=max(clamp(.04/dz-.12,0.,1.)*uFloor,clamp(.05/r-.15,0.,1.)*uTunnel);
  vec2 q=mix(p,gF,uFloor);q=mix(q,gT,uTunnel);return q;}
float field(vec2 q){
  float h=.11*fbm(q*2.2+vec2(uTime*.03,-uTime*.02))+.035*sin(q.x*5.+uTime*.35+sin(q.y*4.+uTime*.25));
  if(uMotif.x>.01)h+=uMotif.x*candles(q)*(1.+uFloor*1.6);
  if(uMotif.y>.01)h+=uMotif.y*curve(vec2(q.x,fract(q.y*.5)*2.));
  if(uMotif.z>.01)h+=uMotif.z*grid(q)*(1.+uFloor);
  if(uMotif.w>.01)h+=uMotif.w*paths(vec2(mod(q.x,2.),fract(q.y)))*(1.+uTunnel);
  return h;}
float touch(vec2 p){
  vec2 dm=p-uMouse;float d2=dot(dm,dm);float h=uHover*(.14*exp(-d2*30.)-.05*exp(-d2*6.));
  for(int i=0;i<8;i++){vec3 r=uRip[i];float age=uTime-r.z;if(age>0.&&age<3.5){float rad=age*.42;float d=length(p-r.xy)-rad;
    h+=.035*sin(d*55.)*exp(-d*d*120.)*exp(-age*1.2);}}
  return h;}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;float asp=uRes.x/uRes.y;vec2 p=vec2(uv.x*asp,uv.y);vec2 c=(uv-.5)*vec2(asp,1.);
  float e=1.6/uRes.y;float fog,f2;
  float h=field(warp(uv,asp,fog))+touch(p);
  float hx=field(warp(uv+vec2(e/asp,0.),asp,f2))+touch(p+vec2(e,0.));
  float hy=field(warp(uv+vec2(0.,e),asp,f2))+touch(p+vec2(0.,e));
  vec3 n=normalize(vec3(-(hx-h)/e*.75,-(hy-h)/e*.75,1.));
  vec3 L1=normalize(vec3(-.45,.65,mix(1.5,.32,uTilt)));
  vec3 L2=normalize(vec3(uMouse-p,.32));
  float att=uHover*exp(-dot(uMouse-p,uMouse-p)*3.);
  float df1=max(dot(n,L1),0.),df2=max(dot(n,L2),0.);
  vec3 V=vec3(0,0,1);
  float sp1=pow(max(dot(reflect(-L1,n),V),0.),mix(18.,48.,uTilt));float sp2=pow(max(dot(reflect(-L2,n),V),0.),60.);
  float slope=1.-n.z;
  vec3 col=uDeep*(.35+1.1*df1);
  col+=uAcc*(.05+.5*df2*att);
  col+=uHi*(sp1*mix(.35,.6,uTilt)+sp2*1.05*att);
  col+=uAcc*pow(slope,1.3)*1.05;
  col+=uHi*smoothstep(.02,.09,h)*.09;
  /* depth haze: far floor / tunnel throat fade into the world's own deep light */
  col=mix(col,uDeep*.6+uAcc*.12,fog);
  /* luminous heights: layered mist that rises past as you descend */
  if(uCloud>.01){vec2 cq=vec2(p.x*.9+uTime*.01,p.y*1.6+uScr*1.1);
    float m1=smoothstep(.42,.85,fbm(cq*1.4));float m2=smoothstep(.5,.9,fbm(cq*2.6+vec2(4.,uScr*.6)));
    vec3 mist=mix(uHi,vec3(.96,.98,1.),.55);
    col=mix(col,mist*.8,(m1*.56+m2*.28)*uCloud);
    col+=mix(uHi,vec3(1.),.45)*uCloud*.2*smoothstep(.25,1.,uv.y);}
  /* primordial tension: two opposing currents meeting in the middle */
  if(uDual>.01){float wa=sin((c.y+.22*sin(c.x*2.6+uTime*.25))*13.+c.x*2.-uTime*.9);
    float wb=sin((c.y-.22*sin(c.x*2.3-uTime*.2))*11.-c.x*2.5+uTime*.8);
    float A=pow(max(wa,0.),14.)*smoothstep(.75,-.35,c.x);float B=pow(max(wb,0.),14.)*smoothstep(-.75,.35,c.x);
    float meet=exp(-c.x*c.x*10.)*A*B*6.;
    col+=uDual*(uHi*A*.32+vec3(.91,.75,.44)*B*.26+vec3(1.)*meet*.4);
    col*=1.-uDual*.18*smoothstep(.2,.9,length(c));}
  col*=uExpo;
  /* chapter entrances */
  float env=sin(3.1416*clamp(uPP,0.,1.));
  if(env>.001){vec3 pc=col;float k=0.;
    if(uPT<.5){ /* clouds part around a luminous fracture */
      float wob=(fbm(vec2(c.y*3.,uTime*.15))-.5)*.12*(1.-uPP);float dx=abs(c.x+wob);float w=.01+uPP*uPP*.9;
      float inside=1.-smoothstep(w-.03,w+.03,dx);float edge=exp(-pow((dx-w)*38.,2.));
      float m=smoothstep(.4,.85,fbm(vec2(p.x*1.3+sign(c.x)*uPP*1.5,p.y*1.8)));
      pc=mix(col+vec3(.9,.95,1.)*m*.35*(1.-inside),uDeep*.5+uAcc*.25+uHi*.25*exp(-c.y*c.y*3.),inside);
      pc+=vec3(.92,.97,1.)*edge*.9;k=.85;}
    else if(uPT<1.5){ /* candlestick architecture separates to reveal depth */
      float open=uPP*asp*.58;float side=abs(c.x)-open;
      float w=.11;float idx=floor(side/w)+(c.x>0.?40.:0.);float fx=fract(side/w)-.5;
      float y0=-.5+h1(idx)*.45,y1=y0+.25+h1(idx+3.)*.6;
      float body=step(abs(fx),.3)*step(y0,c.y)*step(c.y,y1);float wick=step(abs(fx),.025);
      float sh=.25+.75*sqrt(max(0.,1.-pow(fx/.3,2.)));
      vec3 pil=(h1(idx+9.)>.45?uAcc:uDeep*2.+uAcc*.25)*sh*body+uHi*wick*.25;
      vec3 voidc=uDeep*.4+uAcc*.35*exp(-dot(c,c)*5.)+uHi*.15*exp(-c.x*c.x*60.);
      pc=side>0.?mix(uDeep*.25,pil,max(body,wick*.6)):voidc;pc+=uHi*exp(-pow(side*45.,2.))*.6;k=.8;}
    else if(uPT<2.5){ /* a tunnel formed from market curves */
      float r=length(c),a=atan(c.y,c.x);float z=log(max(r,.002))*3.-uPP*7.;
      float v=z+.18*sin(a*6.+floor(z)*1.9)+.06*sin(a*17.+floor(z));
      float line=pow(abs(sin(3.1416*v)),36.)*smoothstep(.03,.2,r);
      pc=col*.4+uAcc*line*.62+uHi*line*.22+uHi*.6*exp(-r*r*30.)*uPP;k=.78;}
    else if(uPT<3.5){ /* darkness folds away to reveal a structured core */
      float open=uPP*.62;float d=abs(c.y)-open;
      vec2 g=abs(fract(c*vec2(9.,9.))-.5);float gl=1.-smoothstep(0.,.05,min(g.x,g.y));
      float ring=exp(-pow((max(abs(c.x)*.8,abs(c.y)*1.4)-.3)*30.,2.));
      vec3 core=col*.5+uAcc*(gl*.28+ring*.6)+uHi*exp(-dot(c,c)*14.)*.35;
      vec3 dark=uDeep*.12*(1.+d*2.);
      pc=d>0.?dark:core;pc+=uHi*exp(-pow(d*60.,2.))*.8;k=.85;}
    else if(uPT<4.5){ /* one candle becomes an entire world */
      float s=mix(.03,2.6,uPP*uPP);vec2 q=c/s;
      float body=step(abs(q.x),.07)*step(abs(q.y),.2);float wick=step(abs(q.x),.008)*step(abs(q.y),.34);
      float hz=step(-.02,q.y)*exp(-q.y*3.);vec2 gq=abs(fract(vec2(q.x/(abs(q.y+.25)+.05),1./(abs(q.y+.25)+.05))*vec2(1.,.6))-.5);
      float floorg=(1.-smoothstep(0.,.06,min(gq.x,gq.y)))*step(q.y,-.0);
      vec3 inside=uDeep*.5+uAcc*floorg*.35+uHi*hz*.4;
      pc=mix(col*.55,inside,body)+uAcc*wick*(1.-body)*.7+uHi*exp(-pow((max(abs(q.x)/.07,abs(q.y)/.2)-1.)*25.,2.))*.5;k=.8;}
    else{ /* an order-book passage opens into clarity */
      float row=floor((c.y+.5)/.034);float fr=fract((c.y+.5)/.034);
      float len=(.15+h1(row)*.55)*(1.-uPP*.95);float bandL=step(c.x+asp*.5,len*asp*.5),bandR=step(asp*.5-c.x,(.15+h1(row+50.)*.55)*(1.-uPP*.95)*asp*.5);
      float bar=step(.18,fr)*step(fr,.82);
      vec3 bk=mix(uAcc,uHi,.3)*bar*bandL*.55+vec3(.91,.75,.44)*bar*bandR*.45;
      float lane=exp(-c.x*c.x*mix(60.,4.,uPP));
      pc=col*.6+bk+uHi*lane*.35;k=.75;}
    col=mix(col,pc,env*k);}
  col*=.55+.65*smoothstep(1.25,.1,length((uv-vec2(.5,.48))*vec2(1.,1.15))*1.35);
  col+=(h2(gl_FragCoord.xy+fract(uTime))-.5)*.025;
  col=1.-exp(-col*1.2);
  gl_FragColor=vec4(pow(col,vec3(.95)),1.);}
`;
let prog,U={},glOK=false;
(function initGL(){
  if(!gl)return;
  const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw gl.getShaderInfoLog(o);return o};
  try{prog=gl.createProgram();gl.attachShader(prog,sh(gl.VERTEX_SHADER,VS));gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw gl.getProgramInfoLog(prog);}catch(err){console.warn('surface fallback',err);return}
  gl.useProgram(prog);
  const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const a=gl.getAttribLocation(prog,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
  for(const n of['uRes','uTime','uMouse','uHover','uRip','uMotif','uDeep','uAcc','uHi','uCloud','uFloor','uTunnel','uDual','uExpo','uTilt','uScr','uPT','uPP'])U[n]=gl.getUniformLocation(prog,n);
  glOK=true;
  cv.addEventListener('webglcontextlost',e=>{e.preventDefault();glOK=false});
})();
if(!glOK)body.classList.add('no-gl');

const SCALE_MAX=[.32,.5,.66][tier];let scale=SCALE_MAX;
function resizeSurface(){if(glOK){cv.width=Math.max(2,Math.round(innerWidth*scale));cv.height=Math.max(2,Math.round(innerHeight*scale));gl.viewport(0,0,cv.width,cv.height)}needsFrame=true}

/* pointer → bulge + ripples. Over reading areas the response is calmer. */
const mouse={x:.5,y:.5,tx:.5,ty:.5,hover:0,th:0,last:-9};
const rips=new Float32Array(24).fill(-99);let ripI=0,lastRip={x:0,y:0};
const CALM='.glass,p,h1,h2,h3,h4,li,button,a,input,label,table,pre,canvas,svg';
function toSurf(cx,cy){const asp=innerWidth/innerHeight;return[(cx/innerWidth)*asp,1-cy/innerHeight]}
function addRip(x,y,t){rips[ripI*3]=x;rips[ripI*3+1]=y;rips[ripI*3+2]=t;ripI=(ripI+1)%8}
addEventListener('pointermove',e=>{if(reduce)return;const[x,y]=toSurf(e.clientX,e.clientY);mouse.tx=x;mouse.ty=y;mouse.last=clock;
  const calm=e.target&&e.target.closest&&e.target.closest(CALM);mouse.th=calm?.35:1;
  if(!calm&&Math.hypot(x-lastRip.x,y-lastRip.y)>(e.pointerType==='touch'?.06:.12)){addRip(x,y,clock);lastRip={x,y}}needsFrame=true},{passive:true});
addEventListener('pointerdown',e=>{if(reduce)return;const calm=e.target&&e.target.closest&&e.target.closest(CALM);if(calm)return;
  const[x,y]=toSurf(e.clientX,e.clientY);mouse.tx=x;mouse.ty=y;mouse.x=x;mouse.y=y;mouse.th=1;mouse.last=clock;addRip(x,y,clock)},{passive:true});
document.addEventListener('pointerleave',()=>{mouse.th=0});

const motif=[0,0,0,0];
function motifTargets(t){
  const cyc=Math.floor(t/7)%4, ph=(t%7)/7, env=Math.sin(Math.PI*Math.min(1,ph*1.15));
  const lead=WORLDS[Math.round(worldF)].motif;
  return[0,1,2,3].map(k=>Math.min(1,(k===lead?.85:0)+(k===cyc&&k!==lead?.6*env:0)));
}

/* surface pauses while the DNA stage covers the screen or the tab is hidden */
let surfacePaused=false;
let clock=0,last=performance.now(),fAcc=0,fN=0;
const loops=new Set();
function frame(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(!reduce)clock+=dt;
  mouse.x+=(mouse.tx-mouse.x)*Math.min(1,dt*7);mouse.y+=(mouse.ty-mouse.y)*Math.min(1,dt*7);
  if(coarse&&clock-mouse.last>1.6)mouse.th=0;
  if(!coarse&&tier>0&&clock-mouse.last>4){const a=clock*.18;mouse.tx=(innerWidth/innerHeight)*(.5+.28*Math.cos(a));mouse.ty=.5+.22*Math.sin(a*1.3);mouse.th=.5}
  mouse.hover+=(mouse.th-mouse.hover)*Math.min(1,dt*3);
  journey.tick(dt);
  const tg=motifTargets(clock);for(let k=0;k<4;k++)motif[k]+=(tg[k]-motif[k])*Math.min(1,dt*(reduce?99:1.2));
  if(glOK&&!surfacePaused&&(needsFrame||!reduce)){
    const p=palette(worldF);
    gl.uniform2f(U.uRes,cv.width,cv.height);gl.uniform1f(U.uTime,clock);gl.uniform2f(U.uMouse,mouse.x,mouse.y);gl.uniform1f(U.uHover,mouse.hover);
    gl.uniform3fv(U.uRip,rips);const J=journey.state;gl.uniform1f(U.uCloud,J.cloud);gl.uniform1f(U.uFloor,J.floor);gl.uniform1f(U.uTunnel,J.tunnel);gl.uniform1f(U.uDual,J.dual);gl.uniform1f(U.uExpo,J.expo);gl.uniform1f(U.uTilt,J.tilt);gl.uniform1f(U.uScr,J.scr);gl.uniform1f(U.uPT,J.pt);gl.uniform1f(U.uPP,J.pp);gl.uniform4f(U.uMotif,motif[0],motif[1],motif[2],motif[3]);
    gl.uniform3f(U.uDeep,...p.deep.map(v=>v/255));gl.uniform3f(U.uAcc,...p.acc.map(v=>v/255));gl.uniform3f(U.uHi,...p.hi.map(v=>v/255));
    gl.drawArrays(gl.TRIANGLES,0,3);needsFrame=false;
    fAcc+=dt;fN++;if(fN===45){const avg=fAcc/fN;
      if(avg>1/45&&scale>.22){scale=Math.max(.22,scale-.08);resizeSurface()}
      else if(avg<1/58&&scale<SCALE_MAX){scale=Math.min(SCALE_MAX,scale+.04);resizeSurface()}
      fAcc=0;fN=0;}
  }
  if(introOn)drawIntro(dt);
  loops.forEach(fn=>fn(dt,clock));
  requestAnimationFrame(frame);
}

/* =====================================================================
   2. INTRO: wand streak + corridor of arches, optional generated music
   ===================================================================== */
const ic=$('#intro'),ig=ic.getContext('2d');
let introOn=true,introMode='idle',flyT=0,speed=.03,it=0,streak=null;
const dust=Array.from({length:[40,110,200][tier]},()=>({x:Math.random()*2-1,y:Math.random()*2-1,z:Math.random(),s:Math.random()*1.4+.3}));
function arch(x,y,w,hh){ig.beginPath();ig.moveTo(x-w/2,y+hh/2);ig.lineTo(x-w/2,y-hh/2+w/2);ig.arc(x,y-hh/2+w/2,w/2,Math.PI,0);ig.lineTo(x+w/2,y+hh/2)}
function catmull(p,u){const n=p.length-1,s=Math.min(n-1e-4,u*n),i=Math.floor(s),f=s-i;
  const p0=p[Math.max(0,i-1)],p1=p[i],p2=p[i+1],p3=p[Math.min(n,i+2)];
  const c=(a,b,c2,d)=>.5*((2*b)+(-a+c2)*f+(2*a-5*b+4*c2-d)*f*f+(-a+3*b-3*c2+d)*f*f*f);return[c(p0[0],p1[0],p2[0],p3[0]),c(p0[1],p1[1],p2[1],p3[1])]}
function resizeIntro(){const d=Math.min(devicePixelRatio||1,1.5);ic.width=innerWidth*d;ic.height=innerHeight*d}
function drawIntro(dt){
  const D=ic.width/innerWidth,W=innerWidth,H=innerHeight;ig.setTransform(D,0,0,D,0,0);
  it+=dt;if(introMode==='fly'){flyT=Math.min(1,flyT+dt/2.4);speed=.03+Math.sin(flyT*Math.PI)*.9}
  const cx=W/2,cy=H*.46,base=Math.min(W,H);
  ig.globalCompositeOperation='source-over';
  const g=ig.createRadialGradient(cx,cy,0,cx,cy,Math.max(W,H)*.75);g.addColorStop(0,'#0c2c52');g.addColorStop(.4,'#09203d');g.addColorStop(1,'#020914');
  ig.fillStyle=g;ig.fillRect(0,0,W,H);
  ig.globalCompositeOperation='lighter';
  const N=[7,11,15][tier];
  for(let i=0;i<N;i++){let z=((i/N)-(it*speed))%1;if(z<0)z+=1;z=.06+z*.94;
    const a=(1-z)*Math.min(1,(z-.06)*6)*.85;if(a<=.003)continue;arch(cx,cy,base*.22/z,base*.36/z);
    if(tier>0){ig.strokeStyle=`rgba(60,147,255,${a*.25})`;ig.lineWidth=8;ig.stroke()}
    ig.strokeStyle=`rgba(105,200,255,${a*.75})`;ig.lineWidth=1.2;ig.stroke()}
  const dz=dt*(introMode==='fly'?.9:.05);
  for(const p of dust){p.z-=dz;if(p.z<=.02){p.z=1;p.x=Math.random()*2-1;p.y=Math.random()*2-1}
    const sx=cx+p.x/p.z*W*.25,sy=cy+p.y/p.z*H*.25;if(sx<-20||sx>W+20||sy<-20||sy>H+20){p.z=1;continue}
    ig.fillStyle=`rgba(190,232,255,${Math.min(1,(1-p.z)*1.4)*.8})`;ig.beginPath();ig.arc(sx,sy,p.s*(1.2-p.z)*1.6,0,6.283);ig.fill()}
  if(streak){const s=streak;s.t+=dt;const u=Math.min(1,s.t/s.dur),e=u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2;
    if(u<1){const hd=catmull(s.pts,e);s.trail.push({x:hd[0],y:hd[1],l:1});
      for(let i=0;i<[3,6,9][tier];i++)s.sp.push({x:hd[0],y:hd[1],vx:(Math.random()-.5)*120,vy:(Math.random()-.5)*120+30,l:1,r:Math.random()*1.8+.4})}
    ig.lineCap='round';
    for(let i=1;i<s.trail.length;i++){const a=s.trail[i-1],b=s.trail[i];b.l-=dt*1.1;if(b.l<=0)continue;
      ig.strokeStyle=`rgba(60,147,255,${b.l*.35})`;ig.lineWidth=14*b.l;ig.beginPath();ig.moveTo(a.x,a.y);ig.lineTo(b.x,b.y);ig.stroke();
      ig.strokeStyle=`rgba(230,245,255,${b.l})`;ig.lineWidth=2.4*b.l+.4;ig.beginPath();ig.moveTo(a.x,a.y);ig.lineTo(b.x,b.y);ig.stroke()}
    s.trail=s.trail.filter(p=>p.l>0);
    for(const p of s.sp){p.l-=dt*1.4;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=60*dt;if(p.l>0){ig.fillStyle=`rgba(190,232,255,${p.l})`;ig.beginPath();ig.arc(p.x,p.y,p.r,0,6.283);ig.fill()}}
    s.sp=s.sp.filter(p=>p.l>0);
    if(u>=1){const f=Math.max(0,1-(s.t-s.dur)*1.6);ig.fillStyle=`rgba(105,200,255,${f*.22})`;ig.fillRect(0,0,W,H)}}
  ig.globalCompositeOperation='source-over';
}
function startStreak(ox,oy){const W=innerWidth,H=innerHeight;
  streak={pts:[[ox,oy],[W*.88,H*.8],[W*.92,H*.2],[W*.38,H*.08],[W*.1,H*.4],[W*.3,H*.72],[W/2,H*.46]],t:0,dur:1.6,trail:[],sp:[]}}
let flyTimer;
function enter(music,ev,skip){
  if(music)audio.on();
  $('#gate').classList.add('out');
  if(skip||reduce){finish();return}
  const r=ev?ev.currentTarget.getBoundingClientRect():{left:innerWidth/2,top:innerHeight*.7,width:0,height:0};
  startStreak(r.left+r.width/2,r.top+r.height/2);body.classList.add('flying');
  setTimeout(()=>{introMode='fly';flyT=0},1100);flyTimer=setTimeout(finish,3800);
  $('#skipFly').focus({preventScroll:true});
}
function finish(){
  if(body.classList.contains('entered'))return;
  clearTimeout(flyTimer);streak=null;body.classList.remove('flying','locked');body.classList.add('entered');
  const gate=$('#gate');gate.classList.add('out');gate.setAttribute('aria-hidden','true');setTimeout(()=>gate.hidden=true,1000);
  ic.classList.add('gone');setTimeout(()=>{if(ic.classList.contains('gone'))introOn=false},1500);
  setTimeout(()=>$$('.hero .rv').forEach(x=>x.classList.add('in')),reduce?0:300);
  journey.measure();journey.update();updateWorld();
  const h1=$('.hero h1');h1.setAttribute('tabindex','-1');h1.focus({preventScroll:true});
}
$('#enterMusic').onclick=e=>enter(true,e);
$('#enterQuiet').onclick=e=>enter(false,e);
$('#skipIntro').onclick=()=>enter(false,null,true);
$('#skipFly').onclick=finish;
addEventListener('keydown',e=>{if(e.key==='Escape'&&!body.classList.contains('entered')&&body.classList.contains('flying'))finish()});

/* Music is generated in the page (original, no recorded assets). Its texture shifts with each world;
   chapter thresholds add a soft filtered swell with slow envelopes. */
const audio=(()=>{let ctx,master,lp,dl,on=false,built=false,world=0,noise=null,lastPortal=0;
  const BELLS=[[587.33,659.25,880,698.46,523.25],[440,523.25,587.33,392,349.23],[369.99,440,554.37,329.63,493.88],[523.25,587.33,783.99,659.25,392]];
  const CUT=[1100,780,620,950];
  function build(){ctx=new(window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.gain.value=0;
    lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=CUT[world];
    dl=ctx.createDelay(2);dl.delayTime.value=.45;const fb=ctx.createGain();fb.gain.value=.35;dl.connect(fb);fb.connect(dl);
    lp.connect(master);lp.connect(dl);dl.connect(master);master.connect(ctx.destination);
    const lfo=ctx.createOscillator();lfo.frequency.value=.05;const lg=ctx.createGain();lg.gain.value=420;lfo.connect(lg);lg.connect(lp.frequency);lfo.start();
    [73.42,110,146.83,174.61,220,329.63].forEach((f,i)=>{for(const d of[-6,6]){const o=ctx.createOscillator();o.type=i<2?'sine':'triangle';o.frequency.value=f;o.detune.value=d;
      const v=ctx.createGain();v.gain.value=i<2?.07:.035;o.connect(v);v.connect(lp);o.start()}});
    const len=ctx.sampleRate*2;noise=ctx.createBuffer(1,len,ctx.sampleRate);const ch=noise.getChannelData(0);for(let i=0;i<len;i++)ch[i]=Math.random()*2-1;
    setInterval(()=>{if(!on)return;const o=ctx.createOscillator(),v=ctx.createGain();const set=BELLS[world];o.frequency.value=set[Math.floor(Math.random()*set.length)];
      v.gain.setValueAtTime(0,ctx.currentTime);v.gain.linearRampToValueAtTime(.045,ctx.currentTime+.03);v.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+4);
      o.connect(v);v.connect(dl);v.connect(master);o.start();o.stop(ctx.currentTime+4.2)},world===2?4200:3200);built=true}
  function ui(){const b=$('#soundBtn');b.setAttribute('aria-label',on?'Mute music':'Play music');b.setAttribute('aria-pressed',on);
    b.innerHTML=on?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"/></svg>'
      :'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>'}
  function start(){try{if(!built)build();ctx.resume();master.gain.cancelScheduledValues(ctx.currentTime);master.gain.linearRampToValueAtTime(.55,ctx.currentTime+2.5);on=true}catch(e){on=false}ui()}
  function stop(){if(built){master.gain.cancelScheduledValues(ctx.currentTime);master.gain.setValueAtTime(master.gain.value,ctx.currentTime);master.gain.linearRampToValueAtTime(0,ctx.currentTime+.6)}on=false;ui()}
  function setWorld(w){if(w===world)return;world=w;if(built)lp.frequency.setTargetAtTime(CUT[w],ctx.currentTime,2.5)}
  function portal(type){if(!on||!built)return;const now=performance.now();if(now-lastPortal<2500)return;lastPortal=now;
    const src=ctx.createBufferSource();src.buffer=noise;const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.Q.value=6;
    const f0=[1800,500,900,300,700,1200][type]||800;const t=ctx.currentTime;
    bp.frequency.setValueAtTime(f0,t);bp.frequency.exponentialRampToValueAtTime(f0*(type===3?3:.45),t+3.2);
    const g=ctx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.05,t+1.2);g.gain.linearRampToValueAtTime(0,t+3.4);
    src.connect(bp);bp.connect(g);g.connect(master);g.connect(dl);src.start(t);src.stop(t+3.5)}
  document.addEventListener('visibilitychange',()=>{if(built)document.hidden?ctx.suspend():on&&ctx.resume()});
  ui();return{on:start,toggle(){on?stop():start()},world:setWorld,portal}})();
$('#soundBtn').onclick=()=>audio.toggle();

/* =====================================================================
   3. NAVIGATION: Explore overlay, status legend
   ===================================================================== */
const worldNames=['Identity','Data','Research','Command'];
(function(){
  const cols=$('#exploreCols');
  worldNames.forEach((n,w)=>{const d=h('div',{style:`--c:${WC[w]}`});d.appendChild(h('h4',null,`${['I','II','III','IV'][w]} · ${n}`));
    A.nav.filter(x=>x.world===w).forEach(x=>{const a=h('a',{href:'#'+x.id},esc(x.label));a.addEventListener('click',()=>closeExplore(false));d.appendChild(a)});cols.appendChild(d)});
  const lg=$('#legend');
  Object.keys(A.statuses).forEach(k=>lg.appendChild(h('div',null,chip(k)+`<span>${esc(A.statuses[k].note)}</span>`)));
  lg.appendChild(h('div',null,'<span class="st" data-s="illus">Illustration</span><span>Example data or a browser calculation, shown to explain an idea. Not live data.</span>'));
})();
let lastFocus=null;
function openExplore(){lastFocus=document.activeElement;const x=$('#explore');x.hidden=false;$('#exploreBtn').setAttribute('aria-expanded','true');body.style.overflow='hidden';$('#exploreClose').focus()}
function closeExplore(restore=true){const x=$('#explore');if(x.hidden)return;x.hidden=true;$('#exploreBtn').setAttribute('aria-expanded','false');body.style.overflow='';if(restore&&lastFocus)lastFocus.focus()}
$('#exploreBtn').onclick=openExplore;$('#exploreClose').onclick=()=>closeExplore();
function trap(container,e){if(e.key!=='Tab')return;const f=[...container.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(n=>n.offsetParent!==null);if(!f.length)return;
  const first=f[0],lastEl=f[f.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();lastEl.focus()}else if(!e.shiftKey&&document.activeElement===lastEl){e.preventDefault();first.focus()}}
$('#explore').addEventListener('keydown',e=>{if(e.key==='Escape')closeExplore();trap($('#explore'),e)});

/* =====================================================================
   4. IDENTITY WORLD: signal layers, ecosystem map, drawer, routes, founder
   ===================================================================== */
(function signal(){
  const svg=$('#signalSvg');const r=seeded(11);const N=120;
  const sig=[],noise=[],price=[];let nz=0;
  for(let i=0;i<N;i++){const x=i/(N-1);const s=130-55*x+18*Math.sin(x*7)+10*Math.sin(x*15+1);nz=nz*.55+gauss(r)*6;sig.push(s);noise.push(nz);price.push(s+nz)}
  const X=i=>20+i*(560/(N-1));
  const line=(arr,off=0)=>arr.map((v,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+(v+off).toFixed(1)).join('');
  for(let y=40;y<=220;y+=45)el('line',{x1:20,x2:580,y1:y,y2:y,stroke:'rgba(255,255,255,.06)'},svg);
  const band=el('path',{d:(()=>{let up='',lo='';for(let i=70;i<N;i++){const w=(i-70)*.9;up+=(up?'L':'M')+X(i)+' '+(sig[i]-w);lo='L'+X(i)+' '+(sig[i]+w)+lo}return up+lo+'Z'})(),fill:'rgba(193,141,240,.22)'},svg);
  const pNoise=el('path',{d:line(noise,200),fill:'none',stroke:'rgba(233,192,112,.9)','stroke-width':1.2},svg);
  const pSig=el('path',{d:line(sig),fill:'none',stroke:'rgba(99,220,143,.95)','stroke-width':2.4},svg);
  const pPrice=el('path',{d:line(price),fill:'none',stroke:'rgba(238,248,255,.95)','stroke-width':1.6},svg);
  const story=el('g',{},svg);
  [[24,'Rate decision'],[58,'Headline'],[92,'Earnings']].forEach(([i,t])=>{el('line',{x1:X(i),x2:X(i),y1:20,y2:240,stroke:'rgba(255,49,78,.6)','stroke-dasharray':'3 4'},story);
    const tx=el('text',{x:X(i)+6,y:30,fill:'rgba(255,180,185,.95)','font-size':12,'font-family':'Helvetica Neue,Arial'},story);tx.textContent=t});
  const caps={all:'One price, four layers. Choose a layer to separate it out.',signal:'Signal: the slower movement a model tries to explain.',noise:'Noise: day-to-day movement with no lasting meaning. Shown beneath the price.',story:'Narrative: events people use to explain moves, whether or not they caused them.',band:'Uncertainty: the range a forecast cannot rule out. It widens with time.'};
  function show(k){const on={all:[1,.18,.2,.25,.25],signal:[.25,1,.1,0,0],noise:[.25,.15,1,0,0],story:[1,.15,.1,1,0],band:[.35,1,.1,0,1]}[k];
    [pPrice,pSig,pNoise,story,band].forEach((n,i)=>{n.style.transition='opacity .5s';n.style.opacity=on[i]});$('#sigCap').textContent=caps[k];
    $$('#sigTabs button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.k===k))}
  $$('#sigTabs button').forEach(b=>b.onclick=()=>show(b.dataset.k));show('all');
})();

/* drawer with the eight answers */
const drawer=$('#drawer'),scrim=$('#scrim');let drawerReturn=null;
function openPlatform(id,from){
  const p=A.platforms.find(x=>x.id===id);if(!p)return;drawerReturn=from||document.activeElement;
  const q=[['What it is',p.what],['Who it is for',p.who],['The problem it addresses',p.problem],['What it receives',p.receives],['What it produces',p.produces],['How it connects',p.connects]];
  drawer.style.setProperty('--hi',WORLDS[p.world].hi.join(','));
  drawer.innerHTML=`<div class="dw-top"><span class="mono" style="color:rgb(${WC[p.world]})">World ${['I','II','III','IV'][p.world]} · ${worldNames[p.world]}</span>
    <button class="icon-btn" type="button" id="dwClose" aria-label="Close details"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    <h3 id="dwTitle">${esc(p.name)}</h3>
    <div class="chips">${p.status.map(chip).join('')}</div>
    <dl>${q.map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}
      <div><dt>Status today</dt><dd>${esc(p.statusNote||p.status.map(s=>A.statuses[s].label+': '+A.statuses[s].note).join(' '))}</dd></div>
      ${p.limits?`<div><dt>Limits</dt><dd class="limit">${esc(p.limits)}</dd></div>`:''}
      <div><dt>What to do next</dt><dd>${p.next?`<a class="btn primary" href="${esc(p.next.href)}" id="dwNext" style="--acc:${WC[p.world]}">${esc(p.next.label)}</a>`:'<span class="small">A public next step will be added once this platform is confirmed.</span>'}</dd></div>
    </dl>
    <p class="srcs">Sources: ${p.src.map(esc).join(' · ')}</p>`;
  drawer.classList.add('open');scrim.classList.add('on');body.style.overflow='hidden';
  $('#dwClose').onclick=closeDrawer;const n=$('#dwNext');if(n&&n.getAttribute('href').startsWith('#'))n.addEventListener('click',()=>closeDrawer(false));
  setTimeout(()=>$('#dwClose').focus(),30);
}
function closeDrawer(restore=true){if(!drawer.classList.contains('open'))return;drawer.classList.remove('open');scrim.classList.remove('on');body.style.overflow='';if(restore!==false&&drawerReturn)drawerReturn.focus()}
scrim.onclick=closeDrawer;
drawer.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer();trap(drawer,e)});

(function ecosystem(){
  const svg=$('#ecoSvg');const C=320;
  for(let r=90;r<=290;r+=50)el('circle',{cx:C,cy:C,r,fill:'none',stroke:'rgba(255,255,255,.05)'},svg);
  const ring=A.platforms.filter(p=>p.id!=='brain');
  const pos={};ring.forEach((p,i)=>{const a=-Math.PI/2+i*2*Math.PI/ring.length;const R=228+(i%2?22:-6);pos[p.id]=[C+R*Math.cos(a),C+R*Math.sin(a)]});
  pos.brain=[C,C];
  const links=[['os','brain'],['research','brain'],['wealth','brain'],['business','brain'],['world','brain'],['etf','brain'],['miniapp','brain'],['website','os'],['website','world'],['research','university'],['qtrader','miniapp'],['portfoliolab','research'],['university','world']];
  const lg=el('g',{},svg);
  links.forEach(([a,b],k)=>{const P=pos[a],Q=pos[b];const mx=(P[0]+Q[0])/2+(C-(P[0]+Q[0])/2)*.25,my=(P[1]+Q[1])/2+(C-(P[1]+Q[1])/2)*.25;
    const off=(a==='os'&&b==='brain');
    const path=el('path',{id:'el'+k,d:`M${P[0]} ${P[1]} Q${mx} ${my} ${Q[0]} ${Q[1]}`,fill:'none',stroke:off?'rgba(255,110,125,.5)':'rgba(255,255,255,.16)','stroke-width':1.2,'stroke-dasharray':off?'4 5':'0'},lg);
    if(!reduce&&!off){const c=el('circle',{r:2.4,fill:'rgba(238,248,255,.85)'},lg);const am=el('animateMotion',{dur:(4+k*.37)+'s',repeatCount:'indefinite'},c);el('mpath',{href:'#el'+k},am)}});
  A.platforms.forEach(p=>{const[x,y]=pos[p.id];const s=p.status[0];const dashed=s==='concept'||s==='unverified';const big=p.id==='brain';
    const g=el('g',{class:'node',tabindex:0,role:'button','aria-label':`${p.name}, ${p.status.map(k=>A.statuses[k].label).join(' and ')}. Open details.`},svg);
    el('circle',{cx:x,cy:y,r:big?64:30,fill:'rgba(255,255,255,0)'},g);
    if(big)el('circle',{cx:x,cy:y,r:76,fill:'none',stroke:`rgba(${WC[3]},.2)`},g);
    el('circle',{class:'ring',cx:x,cy:y,r:big?58:24,fill:big?`rgba(${WC[3]},.12)`:'rgba(6,10,18,.9)',stroke:`rgba(${WC[p.world]},.85)`,'stroke-width':1.3,'stroke-dasharray':dashed?'3 3':'0'},g);
    el('circle',{cx:x,cy:y,r:big?7:5,fill:`rgb(${WC[p.world]})`},g);
    const label=p.name.replace(' · ARIMA Finance Engine','').replace(' · operating layer','').replace('Telegram ','').replace(' tools & services',' tools').replace('Personal finance tools','Personal finance');
    const below=y>C;const tx=el('text',{x,y:big?y+28:y+(below?44:-34),'text-anchor':'middle'},g);tx.textContent=label;if(big)tx.setAttribute('font-size','15');
    const open=()=>openPlatform(p.id,g);g.addEventListener('click',open);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});});
  const list=$('#ecoList');
  A.platforms.forEach(p=>{const b=h('button',{type:'button','aria-haspopup':'dialog'},`<span class="nm"><span class="dot" style="--c:${WC[p.world]}"></span>${esc(p.name)}</span>${chip(p.status[0])}`);b.onclick=()=>openPlatform(p.id,b);list.appendChild(b)});
})();

(function routes(){const r=$('#routes');A.routes.forEach(x=>r.appendChild(h('a',{href:x.href},`<b>${esc(x.who)}</b><span>${esc(x.line)}</span><span class="arrow small" style="color:rgb(var(--hi))">Go</span>`)))})();

(function founder(){const f=A.founder;$('#fName').textContent=f.name;$('#fRole').textContent=`${f.role}. ${f.fields}.`;
  const rows=[['Education',f.education.map(e=>esc(e.degree)+(e.place?`, ${esc(e.place)}`:'')).join('<br>')],['Professional experience',f.environments.map(e=>`${esc(e.org)} · ${esc(e.area)}`).join('<br>')],['Qualifications',f.qualifications.map(esc).join('<br>')]];
  $('#fFacts').innerHTML=rows.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  $('#fQuote').textContent='“'+f.statement+'”';$('#fDisc').textContent=f.disclaimer})();

/* =====================================================================
   5. DATA WORLD: sources, stages, Mini App
   ===================================================================== */
$('#srcTable tbody').innerHTML=A.sources.map(s=>`<tr><td>${esc(s.name)}<span class="k">${esc(s.kind)}</span></td><td>${esc(s.what)}</td><td>${chip(s.status)}</td></tr>`).join('');
$('#stages').innerHTML=A.stages.map((s,i)=>`<div><i>0${i+1}</i><b>${esc(s.name)}</b><span>${esc(s.line)}</span></div>`).join('');
$('#miniChecks').innerHTML=A.miniChecks.map(c=>`<div><span>${esc(c.name)}<br><span class="small">${esc(c.note)}</span></span>${chip(c.status)}</div>`).join('');
(function(){const b=$('#alertBtn'),m=$('#alertMore');b.onclick=()=>{const o=m.hidden;m.hidden=!o;b.setAttribute('aria-expanded',o);b.textContent=o?'Hide the evidence ↑':'Why am I seeing this? ↓'}})();

/* =====================================================================
   6. SIGNATURE SEQUENCE: data → DNA → Brain → outputs → decision
   ===================================================================== */
const dna=(function(){
  const sec=$('#dna'),c=$('#dnaCanvas');let g=c.getContext('2d');
  const labelsEl=$('#dnaLabels');
  const SC=A.dnaScenes;
  const SCOL=[[255,49,78],[255,49,78],[193,141,240],[193,141,240],[99,220,143],[99,220,143]];
  const STREAMS=[
    {name:'Exchange rates',col:[255,180,185],o:-.75,amp:.05,freq:5,burst:0},
    {name:'News headlines',col:[233,192,112],o:-.25,amp:.09,freq:13,burst:1},
    {name:'Market observations',col:[255,49,78],o:.25,amp:.07,freq:21,burst:0},
    {name:'Official releases',col:[238,248,255],o:.75,amp:.03,freq:3,burst:2}];
  const PATHS=['Evidence','Context','Research','Valuation','Regime','Risk','Scenarios'];
  const OUT_FROM=[6,5,2,0,1,1,3]; // output j fed by pathway k
  const M=[40,70,110][tier];
  const parts=STREAMS.map((s,i)=>{const r=seeded(31+i);return Array.from({length:M},()=>({ph:r(),j:r(),bad:r()<.08,sz:.6+r()*1.2,br:r()}))});
  const pathParts=Array.from({length:7},(_,k)=>{const r=seeded(91+k);return Array.from({length:Math.round(M/4)},()=>({ph:r(),sz:.6+r()}))});
  const pool=[];function label(i){if(!pool[i]){const d=h('div',{class:'dna-label'});labelsEl.appendChild(d);pool[i]=d}return pool[i]}
  const outs=A.outputs.map(o=>{const d=h('div',{class:'dna-out glass'},`${chip(o.status)}<b>${esc(o.name)}</b><span class="l">${esc(o.line)}</span>`);labelsEl.appendChild(d);return d});
  let W=0,H=0,port=false,scene=-1,active=false,progress=0,curT=0;
  function size(){[W,H]=fitCanvas(c,g);port=H>W*1.05}
  // axis mapping: s along the strand (0..1), o across it (-1..1)
  function P(s,o){if(!port)return[lerp(W*.06,W*.94,s),H*.44+o*H*.21];return[W*.5+o*W*.36,lerp(H*.12,H*.5,s)]}
  function laneOff(st,s,t,clean){const n=Math.sin(s*st.freq*6.283+t*1.3+st.o*9)*st.amp+(st.burst===1?Math.sin(s*41+t*3)*.035:0);
    return st.o+n*(1-clean)}
  const GATES=[.2,.3,.4,.5,.6,.7,.8];
  function helixO(s,t,strand,i){const th=s*6.283*3.2+t*.6;return(strand?-1:1)*.62*Math.cos(th)+(i<2?-.04:.04)}
  function helixZ(s,t,strand){const th=s*6.283*3.2+t*.6;return(strand?-1:1)*Math.sin(th)}
  function nodePos(k){if(!port)return[W*.62,H*(.14+k*.6/6)];return[W*(.1+k*.8/6),H*.48]}
  function outPos(j){if(!port){return[W*(j%2?.905:.765),H*(.14+j*.62/6)]}return[W*(j%2?.73:.27),H*(.55+Math.floor(j/2)*.06)+(j%2?H*.028:0)]}
  function dot(x,y,r,col,a){g.fillStyle=`rgba(${col[0]|0},${col[1]|0},${col[2]|0},${a})`;g.beginPath();g.arc(x,y,r,0,6.283);g.fill()}
  function bez(P0,P1,P2,u){const a=(1-u)*(1-u),b=2*(1-u)*u,cc=u*u;return[a*P0[0]+b*P1[0]+cc*P2[0],a*P0[1]+b*P1[1]+cc*P2[1]]}

  function render(sc,u,t,staticMode){
    g.setTransform(DPR,0,0,DPR,0,0);g.globalCompositeOperation='source-over';
    g.fillStyle='#010204';g.fillRect(0,0,W,H);
    const sc0=SCOL[sc];
    const glow=g.createRadialGradient(W*.5,H*.42,0,W*.5,H*.42,Math.max(W,H)*.6);glow.addColorStop(0,`rgba(${sc0},.10)`);glow.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=glow;g.fillRect(0,0,W,H);
    g.globalCompositeOperation='lighter';
    const L=[];
    const sz=Math.min(W,H)/520;
    // how far along each phase is, derived from scene + local u
    const helixM=sc<2?0:sc===2?smooth(.05,.9,u):1;            // lanes → helix
    const gateM=sc<1?0:sc===1?smooth(0,.8,u):1;               // gates appear
    const compress=sc<3?0:sc===3?smooth(0,.6,u):1;            // helix shortens to make room
    const branch=sc<3?0:sc===3?smooth(.3,1,u):1;              // pathways grow
    const outM=sc<4?0:sc===4?smooth(.1,.8,u):1;                // outputs appear
    const decM=sc<5?0:smooth(0,.7,u);                          // decision scene
    const reveal=sc===0?smooth(0,.7,u)*1.15:1.2;               // streams flow in
    const sEnd=lerp(.98,port?.8:.5,compress);
    const fade=1-decM*.75;

    // gates (engineering stages)
    if(gateM>0&&helixM<1){const ga=gateM*(1-helixM);
      GATES.forEach((gs,k)=>{const vis=smooth(k/8,k/8+.25,gateM);if(vis<=0)return;const[x0,y0]=P(gs,-1.05),[x1,y1]=P(gs,1.05);
        g.strokeStyle=`rgba(255,180,185,${.35*vis*ga})`;g.lineWidth=1;g.setLineDash([2,4]);g.beginPath();g.moveTo(x0,y0);g.lineTo(x1,y1);g.stroke();g.setLineDash([]);
        L.push({t:A.stages[k].name,x:port?W-10:x0,y:port?y1:y0-14,a:vis*ga,right:port,small:port})})}

    // rungs of the helix
    if(helixM>0){const n=port?18:32;for(let k=0;k<=n;k++){const s=.05+k/n*(sEnd-.05);const oa=helixO(s,t,0,0),ob=helixO(s,t,1,2);
      const[xa,ya]=P(s,oa*helixM+(-.5)*(1-helixM)),[xb,yb]=P(s,ob*helixM+(.5)*(1-helixM));const z=(helixZ(s,t,0)+1)/2;
      g.strokeStyle=`rgba(${SCOL[Math.max(2,sc)]},${(.08+.25*z)*helixM*fade})`;g.lineWidth=1;g.beginPath();g.moveTo(xa,ya);g.lineTo(xb,yb);g.stroke()}}

    // stream particles
    STREAMS.forEach((st,i)=>{const strand=i%2;const col=mix(st.col,SCOL[Math.max(2,sc)],helixM*.55);
      for(const q of parts[i]){
        let s=(q.ph+t*(.035+q.br*.02))%1;
        if(s>reveal)continue;
        // validation drop-outs: bad records stop at the Validate gate during engineering
        if(q.bad&&gateM>.3&&s>GATES[2]){if(helixM>0)continue;const fadeOut=1-clamp((s-GATES[2])*12,0,1);if(fadeOut<=0)continue;
          const[x,y]=P(GATES[2]+(s-GATES[2])*.2,laneOff(st,s,t,0)+.12);dot(x,y,1.6*sz,[255,110,125],fadeOut*.9);continue}
        const passed=GATES.filter(gs=>s>gs).length/GATES.length*gateM;
        const lo=laneOff(st,s,t,passed)+(q.j-.5)*.06*(1-passed);
        const sh=lerp(.05,sEnd,s);
        const ho=helixO(sh,t,strand,i);
        const sx=lerp(s,sh,helixM),o=lerp(lo,ho,helixM);
        const z=helixM>0?(helixZ(sh,t,strand)+1)/2:1;
        if(st.burst===2&&helixM<.5&&Math.sin(s*30+q.ph*40)<.6)continue; // sparse releases
        const[x,y]=P(sx,o);
        const r=(q.sz*(.6+.8*z))*sz*1.4;
        dot(x,y,r*2.4,col,.08*fade);dot(x,y,r,col,(.45+.5*z)*fade);
      }
      if(sc===0||(sc===1&&u<.4)){const a=sc===0?smooth(.1,.5,u):1-smooth(0,.4,u);const[x,y]=P(.02,st.o);L.push({t:port?st.name.split(' ')[0]:st.name,x:port?x:x+4,y:port?y-(i%2?8:22):y-14,a,left:!port,small:true})}
    });

    // strand names once the helix has formed
    if(helixM>.6&&decM<.5){const a=smooth(.6,1,helixM)*(1-decM*2);const[xa,ya]=P(.05,-.78),[xb,yb]=P(.05,.78);
      L.push({t:'Evidence strand',x:xa+(port?0:10),y:ya-(port?10:12),a,left:!port,small:true});L.push({t:'Context strand',x:xb+(port?0:10),y:yb+(port?18:18),a,left:!port,small:true})}

    // pathways into the Brain
    if(branch>0){const[ex,ey]=P(sEnd,0);
      PATHS.forEach((nm,k)=>{const[nx,ny]=nodePos(k);const cp=port?[ex,(ey+ny)/2]:[(ex+nx)/2,ey];
        g.strokeStyle=`rgba(${SCOL[3]},${.35*branch*fade})`;g.lineWidth=1.2;g.beginPath();
        for(let u2=0;u2<=branch;u2+=.04){const[x,y]=bez([ex,ey],cp,[nx,ny],Math.min(u2,branch));u2?g.lineTo(x,y):g.moveTo(x,y)}g.stroke();
        for(const q of pathParts[k]){const v=(q.ph+t*.25)%1;if(v>branch)continue;const[x,y]=bez([ex,ey],cp,[nx,ny],v);dot(x,y,1.3*sz*q.sz,[233,215,255],.8*fade)}
        if(branch>.95){dot(nx,ny,5*sz,SCOL[3],.9*fade);dot(nx,ny,12*sz,SCOL[3],.15*fade);
          L.push({t:nm,x:port?nx:nx+12,y:port?ny+(k%2?22:-16):ny,a:smooth(.95,1,branch)*(1-decM),left:!port})}});
      const[bx,by]=port?[W*.5,H*.3]:[ex+(W*.62-ex)*.35,H*.1];
      if(branch>.9)L.push({t:'Brain',x:bx,y:by,a:smooth(.9,1,branch)*(1-decM),big:true});
    }

    // outputs: flows from pathways to output cards (cards are DOM)
    if(outM>0){A.outputs.forEach((o,j)=>{const[nx,ny]=nodePos(OUT_FROM[j]);const[ox,oy]=outPos(j);const cp=[(nx+ox)/2,(ny+oy)/2-(port?0:20)];
      g.strokeStyle=`rgba(${SCOL[4]},${.28*outM*fade})`;g.lineWidth=1;g.beginPath();g.moveTo(nx,ny);g.quadraticCurveTo(cp[0],cp[1],ox,oy);g.stroke();
      for(let m=0;m<3;m++){const v=((t*.3+m/3+j*.13)%1);if(v>outM)continue;const[x,y]=bez([nx,ny],cp,[ox,oy],v);dot(x,y,1.6*sz,[190,245,210],.85*fade)}})}

    // decision and execution
    if(decM>0){
      const chain=port?[[.5,.6],[.5,.68],[.5,.76]]:[[.5,.5],[.62,.5],[.74,.5]];
      const names=['Human decision','Permission & audit','Paper execution'];
      const pts=chain.map(([a,b])=>[W*a,H*b]);
      const live=port?[W*.84,H*.64]:[W*.86,H*.32];
      g.strokeStyle=`rgba(${SCOL[5]},${.6*decM})`;g.lineWidth=1.6;g.beginPath();g.moveTo(pts[0][0],pts[0][1]);pts.slice(1).forEach(p=>g.lineTo(p[0],p[1]));g.stroke();
      // the live route stops at a closed gate
      const gateP=[lerp(pts[1][0],live[0],.55),lerp(pts[1][1],live[1],.55)];
      g.strokeStyle=`rgba(255,110,125,${.55*decM})`;g.setLineDash([4,5]);g.beginPath();g.moveTo(pts[1][0],pts[1][1]);g.lineTo(live[0],live[1]);g.stroke();g.setLineDash([]);
      g.strokeStyle=`rgba(255,110,125,${.95*decM})`;g.lineWidth=3;const ang=Math.atan2(live[1]-pts[1][1],live[0]-pts[1][0])+Math.PI/2;
      g.beginPath();g.moveTo(gateP[0]+Math.cos(ang)*14,gateP[1]+Math.sin(ang)*14);g.lineTo(gateP[0]-Math.cos(ang)*14,gateP[1]-Math.sin(ang)*14);g.stroke();
      for(let m=0;m<6;m++){const v=(t*.2+m/6)%1;const seg=v*2;const a=Math.min(1,Math.floor(seg)),f=seg-a;const P0=pts[a],P1=pts[a+1];dot(lerp(P0[0],P1[0],f),lerp(P0[1],P1[1],f),2*sz,[190,245,210],decM)}
      for(let m=0;m<3;m++){const v=((t*.2+m/3)%1)*.52;dot(lerp(pts[1][0],live[0],v),lerp(pts[1][1],live[1],v),1.8*sz,[255,150,160],decM*(1-v/.55))}
      pts.forEach((p,k)=>{dot(p[0],p[1],6*sz,SCOL[5],decM);dot(p[0],p[1],16*sz,SCOL[5],.12*decM);L.push({t:names[k],x:p[0],y:p[1]+(port?(k%2?0:0):24),a:decM,dx:port?(k%2?-80:80):0})});
      dot(live[0],live[1],6*sz,[255,110,125],decM);L.push({t:'Live execution · switched off',x:port?W-10:live[0],y:live[1]+(port?18:-20),a:decM,warn:true,right:port});
      const[ix,iy]=port?[W*.5,H*.53]:[W*.36,H*.5];L.push({t:'Outputs',x:ix,y:iy,a:decM});
      g.strokeStyle=`rgba(${SCOL[5]},${.35*decM})`;g.lineWidth=1.2;g.beginPath();g.moveTo(ix+(port?0:30),iy+(port?10:0));g.lineTo(pts[0][0]-(port?0:10),pts[0][1]-(port?10:0));g.stroke();
    }
    g.globalCompositeOperation='source-over';
    return{labels:L,outM,decM};
  }

  function placeLabels(L,outM,decM){
    let i=0;for(const l of L){if(l.a<=.01)continue;const d=label(i++);if(d.textContent!==l.t)d.textContent=l.t;
      d.style.left=(l.x+(l.dx||0))+'px';d.style.top=l.y+'px';d.style.opacity=Math.min(.95,l.a);d.style.transform=l.left?'translate(0,-50%)':l.right?'translate(-100%,-50%)':'translate(-50%,-50%)';
      d.style.fontSize=l.big?'14px':l.small?'10px':'11px';d.style.color=l.warn?'rgb(255,150,160)':l.big?'#fff':'';d.style.letterSpacing=l.big?'.3em':''}
    for(;i<pool.length;i++)pool[i].style.opacity=0;
    outs.forEach((d,j)=>{const[ox,oy]=outPos(j);d.style.left=ox+'px';d.style.top=oy+'px';d.classList.toggle('show',outM>.15+j*.08&&decM<.4)});
  }
  function setScene(sc){if(sc===scene)return;scene=sc;const s=SC[sc];$('#dnaKicker').textContent=s.k;$('#dnaHead').textContent=s.h;$('#dnaText').textContent=s.t;
    sec.style.setProperty('--dc',SCOL[sc].join(','));$$('.dna-steps i').forEach((x,k)=>x.classList.toggle('on',k<=sc))}
  function update(){const r=sec.getBoundingClientRect();const span=r.height-innerHeight;progress=clamp(-r.top/span,0,1);
    surfacePaused=r.top<=1&&r.bottom>=innerHeight-1;if(!surfacePaused)needsFrame=true}
  function tick(dt){if(!active||reduce)return;curT+=dt;const p=progress*6;const sc=Math.min(5,Math.floor(p));const u=sc===5&&progress>=1?1:p-sc;
    setScene(sc);const res=render(sc,smooth(.08,.85,u),curT,false);placeLabels(res.labels,res.outM,res.decM)}
  function buildStatic(){const box=$('#dnaStatic');box.innerHTML='<p class="eyebrow">How data becomes ARIMA’s DNA</p>';
    const figs=SC.map((s,k)=>{const f=h('figure');const cc=h('canvas',{role:'img','aria-label':`${s.k}: ${s.h}. ${s.t}`});f.appendChild(cc);
      f.appendChild(h('figcaption',null,`<span class="mono" style="color:rgb(${SCOL[k]})">${esc(s.k)}</span><h3 style="margin:8px 0">${esc(s.h)}</h3><p class="small">${esc(s.t)}</p>`+(k===4?`<div class="chips" style="margin-top:12px">${A.outputs.map(o=>`<span class="st" data-s="${o.status}">${esc(o.name)}</span>`).join('')}</div>`:'')));
      box.appendChild(f);return cc});
    const paint=()=>figs.forEach((cc,k)=>{const w=cc.getBoundingClientRect().width||800,hh=w*9/16;cc.width=Math.round(w*DPR);cc.height=Math.round(hh*DPR);
      const saved=[g,W,H,port];g=cc.getContext('2d');W=w;H=hh;port=false;
      const res=render(k,1,3,true);
      g.setTransform(DPR,0,0,DPR,0,0);g.font='10px SFMono-Regular,Consolas,monospace';g.textAlign='center';g.fillStyle='rgba(238,248,255,.85)';
      res.labels.forEach(l=>{if(l.a>.3)g.fillText(l.t.toUpperCase(),l.x+(l.dx||0)+(l.left?30:0),l.y+3)});
      if(k===4)A.outputs.forEach((o,j)=>{const[ox,oy]=outPos(j);g.fillText(o.name,ox,oy+3)});
      [g,W,H,port]=saved});
    requestAnimationFrame(paint);addEventListener('resize',()=>requestAnimationFrame(paint));}
  if(reduce){buildStatic()}
  else{
    visible(sec,v=>{active=v;if(!v){surfacePaused=false;needsFrame=true}},'100px');
    loops.add(tick);
  }
  return{size,update};
})();

/* =====================================================================
   7. RESEARCH LAB: browser Monte Carlo on a synthetic history
   ===================================================================== */
const lab=(function(){
  // synthetic daily history with volatility clustering and fat tails (illustration only)
  const r0=seeded(2026);const hist=[];let v=.00012;
  for(let i=0;i<750;i++){const z=gauss(r0)*(r0()<.04?2:1);const ret=.0003+Math.sqrt(v)*z;hist.push(ret);v=Math.min(.0009,.000003+.06*(ret-.0003)**2+.9*v)}
  const mu=hist.reduce((a,b)=>a+b,0)/hist.length;const sd=Math.sqrt(hist.reduce((a,b)=>a+(b-mu)**2,0)/(hist.length-1));
  const HZ=63,NP=[400,800,1200][tier],S0=100;
  let model=A.models[0],seed=7,res=null;
  const list=$('#modelList');
  A.models.forEach(m=>{const b=h('button',{type:'button','aria-pressed':m===model},`<b>${esc(m.name)}</b>${chip(m.status)}`);b.onclick=()=>{model=m;seed=7;$$('#modelList button').forEach(x=>x.setAttribute('aria-pressed',x===b));run()};list.appendChild(b)});
  function tdraw(r,df){let s=0;for(let i=0;i<df;i++){const g2=gauss(r);s+=g2*g2}return gauss(r)/Math.sqrt(s/df)}
  function simulate(){
    const r=seeded(seed*7919+A.models.indexOf(model)*31);const paths=new Array(NP);
    for(let p=0;p<NP;p++){const a=new Float32Array(HZ+1);a[0]=S0;let s=S0,var_=sd*sd,state=0;const crashDay=Math.floor(r()*HZ);
      for(let d=1;d<=HZ;d++){let x;
        switch(model.id){
          case'bootstrap':x=hist[Math.floor(r()*hist.length)];break;
          case'block':{if((d-1)%10===0)a.bi=Math.floor(r()*(hist.length-10));x=hist[a.bi+((d-1)%10)];break}
          case'normal':x=mu+sd*gauss(r);break;
          case'gbm':x=(mu-sd*sd/2)+sd*gauss(r);break;
          case'studentt':x=mu+sd*Math.sqrt(2/4)*tdraw(r,4);break;
          case'garch':{const z=gauss(r);x=mu+Math.sqrt(var_)*z;var_=sd*sd*.02+.08*(x-mu)**2+.9*var_;break}
          case'regime':{if(state===0&&r()<.02)state=1;else if(state===1&&r()<.08)state=0;x=state?(-.002+sd*2.4*gauss(r)):(mu+sd*.7*gauss(r));break}
          case'jump':{x=mu+sd*.85*gauss(r);if(r()<.02)x+=-.03+.025*gauss(r);break}
          case'crash':{x=hist[Math.floor(r()*hist.length)];if(d===crashDay)x+=-.15;break}
          default:x=mu+sd*gauss(r)}
        s*=Math.exp(x);a[d]=s}
      paths[p]=a}
    return paths;
  }
  function q(sorted,p){const i=(sorted.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);return sorted[lo]+(sorted[hi]-sorted[lo])*(i-lo)}
  function run(){
    const paths=simulate();const lvlPct=+$('#lvl').value;const L=S0*(1+lvlPct/100);const below=lvlPct<=0;
    let fin=0,touch=0;const term=[],dds=[],rets=[];
    for(const a of paths){let mx=a[0],mn=a[0],peak=a[0],dd=0;for(let d=1;d<=HZ;d++){const v2=a[d];if(v2>mx)mx=v2;if(v2<mn)mn=v2;if(v2>peak)peak=v2;dd=Math.max(dd,1-v2/peak)}
      const e=a[HZ];term.push(e);dds.push(dd);rets.push(e/S0-1);
      if(below?e<=L:e>=L)fin++;if(below?mn<=L:mx>=L)touch++}
    const sr=[...rets].sort((x,y)=>x-y);const q5=q(sr,.05);const tail=sr.filter(x=>x<=q5);
    const st=[...term].sort((x,y)=>x-y);
    res={paths,L,below,term:st,
      pFin:fin/NP,pTouch:touch/NP,mdd:q([...dds].sort((x,y)=>x-y),.5),var95:-q5,es95:-(tail.reduce((x,y)=>x+y,0)/tail.length),
      bands:Array.from({length:HZ+1},(_,d)=>{const col=paths.map(a=>a[d]).sort((x,y)=>x-y);return[q(col,.05),q(col,.25),q(col,.5),q(col,.75),q(col,.95)]})};
    const pct=x=>(x*100).toFixed(1)+'%';
    $('#metrics').innerHTML=[[`P(finish ${below?'below':'above'} level)`,pct(res.pFin)],[`P(touch level during period)`,pct(res.pTouch)],['Median max drawdown',pct(res.mdd)],['VaR 95% (period)',pct(res.var95)],['Expected shortfall 95%',pct(res.es95)]]
      .map(([k,v2])=>`<div><span>${k}</span><strong>${v2}</strong></div>`).join('');
    $('#pathsInfo').textContent=`${NP.toLocaleString('en-GB')} paths · ${HZ} trading days · start 100`;
    const engine=model.status==='local'?'Matches a method in ARIMA’s Research Lab (Monte Carlo validation). Here it runs in your browser on a synthetic history.':'Not part of ARIMA’s engine today. A browser illustration of a research concept.';
    $('#modelNotes').innerHTML=`<div><b>Explores</b>${esc(model.explores)}</div><div><b>Assumes</b>${esc(model.assumes)}</div><div><b>Limits</b>${esc(model.limits)}</div><div style="grid-column:1/-1"><b>Where this runs</b>${engine}</div>`;
    $('#pathsCanvas').setAttribute('aria-label',`${model.name}: ${NP} simulated paths over ${HZ} days. Chance of finishing ${below?'below':'above'} ${L.toFixed(0)} is ${pct(res.pFin)}; chance of touching it is ${pct(res.pTouch)}.`);
    draw();
  }
  const pc=$('#pathsCanvas'),pg=pc.getContext('2d'),hc=$('#histCanvas'),hg=hc.getContext('2d');
  function draw(){if(!res)return;
    const[W,H]=fitCanvas(pc,pg);const all=res.term;const lo=Math.min(res.bands.reduce((m,b)=>Math.min(m,b[0]),1e9),res.L)*0.96,hi=Math.max(res.bands.reduce((m,b)=>Math.max(m,b[4]),0),res.L)*1.04;
    const X=d=>16+d/HZ*(W-32),Y=v2=>H-14-(v2-lo)/(hi-lo)*(H-28);
    pg.clearRect(0,0,W,H);
    const band=(i,j,a)=>{pg.fillStyle=`rgba(193,141,240,${a})`;pg.beginPath();res.bands.forEach((b,d)=>d?pg.lineTo(X(d),Y(b[i])):pg.moveTo(X(d),Y(b[i])));for(let d=HZ;d>=0;d--)pg.lineTo(X(d),Y(res.bands[d][j]));pg.fill()};
    band(0,4,.12);band(1,3,.2);
    pg.lineWidth=1;const show=Math.min(60,res.paths.length);
    for(let p=0;p<show;p++){const a=res.paths[p];let hit=false;for(let d=0;d<=HZ;d++)if(res.below?a[d]<=res.L:a[d]>=res.L){hit=true;break}
      pg.strokeStyle=hit?'rgba(233,192,112,.35)':'rgba(238,248,255,.13)';pg.beginPath();for(let d=0;d<=HZ;d++)d?pg.lineTo(X(d),Y(a[d])):pg.moveTo(X(d),Y(a[d]));pg.stroke()}
    pg.strokeStyle='rgba(243,234,255,.95)';pg.lineWidth=2;pg.beginPath();res.bands.forEach((b,d)=>d?pg.lineTo(X(d),Y(b[2])):pg.moveTo(X(d),Y(b[2])));pg.stroke();
    pg.setLineDash([5,5]);pg.strokeStyle='rgba(233,192,112,.95)';pg.lineWidth=1.2;pg.beginPath();pg.moveTo(16,Y(res.L));pg.lineTo(W-16,Y(res.L));pg.stroke();pg.setLineDash([]);
    pg.fillStyle='rgba(233,192,112,.95)';pg.font='11px SFMono-Regular,Consolas,monospace';pg.fillText(`level ${res.L.toFixed(0)}`,20,Y(res.L)-6);
    pg.fillStyle='rgba(238,248,255,.6)';pg.fillText('gold paths touch the level',W-190>20?W-190:20,16);
    const[W2,H2]=fitCanvas(hc,hg);hg.clearRect(0,0,W2,H2);const bins=32,cnt=new Array(bins).fill(0);
    const Y2=v2=>H2-14-(v2-lo)/(hi-lo)*(H2-28);
    for(const v2 of all){const b=Math.floor((v2-lo)/(hi-lo)*bins);if(b>=0&&b<bins)cnt[b]++}const mx=Math.max(...cnt);
    for(let b=0;b<bins;b++){const v0=lo+b/bins*(hi-lo),v1=lo+(b+1)/bins*(hi-lo);const w=cnt[b]/mx*(W2-30);const beyond=res.below?v1<=res.L:v0>=res.L;
      hg.fillStyle=beyond?'rgba(233,192,112,.75)':'rgba(193,141,240,.6)';hg.fillRect(14,Y2(v1),w,Math.max(1,Y2(v0)-Y2(v1)-1))}
    hg.setLineDash([5,5]);hg.strokeStyle='rgba(233,192,112,.95)';hg.beginPath();hg.moveTo(10,Y2(res.L));hg.lineTo(W2-6,Y2(res.L));hg.stroke();hg.setLineDash([]);
    hg.fillStyle='rgba(238,248,255,.6)';hg.font='11px SFMono-Regular,Consolas,monospace';hg.fillText('final prices',14,16);
  }
  $('#lvl').addEventListener('input',()=>{const v2=+$('#lvl').value;$('#lvlOut').textContent=(v2>0?'+':v2<0?'−':'')+Math.abs(v2)+'%';run()});
  $('#rerun').onclick=()=>{seed++;run()};
  let ran=false;visible($('#pathsCanvas'),vv=>{if(vv&&!ran){ran=true;run()}},'300px');
  return{draw};
})();

/* =====================================================================
   8. BEHAVIOUR + BRAIN & OS diagrams
   ===================================================================== */
(function brains(){const svg=$('#brainsSvg');
  const box=(x,y,w,hh,col,title,sub)=>{el('rect',{x,y,width:w,height:hh,rx:18,fill:`rgba(${col},.08)`,stroke:`rgba(${col},.6)`},svg);
    const t=el('text',{x:x+20,y:y+32},svg);t.textContent=title;t.setAttribute('font-weight','500');
    sub.forEach((s,i)=>{const tt=el('text',{x:x+20,y:y+58+i*21,class:'sub'},svg);tt.textContent=s})};
  box(20,40,280,220,'105,200,255','Left Brain · calculation',['Valuation and DCF','Volatility regimes and bubbles','Monte Carlo, VaR and CVaR','Backtests and stress tests','Deterministic, reproducible']);
  box(660,40,280,220,'193,141,240','Right Brain · context',['Profile and goals','News sentiment','Intent and culture','Spending habits','Credit timing']);
  box(370,90,220,120,'99,220,143','Middle · synthesis',['Weighs both sides','Writes the conclusion','Keeps the evidence']);
  const ar=(x1,x2,y,col,lab)=>{el('line',{x1,x2,y1:y,y2:y,stroke:`rgba(${col},.8)`,'stroke-width':1.6,'marker-end':'url(#ah)'},svg);const t=el('text',{x:(x1+x2)/2,y:y-10,'text-anchor':'middle',class:'sub'},svg);t.textContent=lab};
  const defs=el('defs',{},svg);const mk=el('marker',{id:'ah',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto-start-reverse'},defs);el('path',{d:'M0 0L10 5L0 10z',fill:'rgba(238,248,255,.8)'},mk);
  ar(300,368,130,'105,200,255','numbers');ar(658,592,130,'193,141,240','reframes');
  el('path',{d:'M660 240 C 560 300, 400 300, 300 240',fill:'none',stroke:'rgba(255,110,125,.6)','stroke-dasharray':'4 5'},svg);
  el('line',{x1:472,x2:488,y1:274,y2:290,stroke:'rgba(255,110,125,.95)','stroke-width':2.4},svg);el('line',{x1:488,x2:472,y1:274,y2:290,stroke:'rgba(255,110,125,.95)','stroke-width':2.4},svg);
  const t=el('text',{x:480,y:295+18,'text-anchor':'middle',class:'sub'},svg);t.textContent='context can never change the calculation';
})();

(function arch(){const svg=$('#archSvg');
  const defs=el('defs',{},svg);const mk=el('marker',{id:'ah2',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto-start-reverse'},defs);el('path',{d:'M0 0L10 5L0 10z',fill:'rgba(238,248,255,.7)'},mk);
  const T=(x,y,s,cls,anchor)=>{const t=el('text',{x,y,class:cls||'','text-anchor':anchor||'start'},svg);t.textContent=s;return t};
  const R=(x,y,w,hh,col,dash,fill)=>el('rect',{x,y,width:w,height:hh,rx:16,fill:fill||`rgba(${col},.07)`,stroke:`rgba(${col},.55)`,'stroke-dasharray':dash?'5 5':'0'},svg);
  // sources
  R(20,60,170,330,'255,49,78');T(40,90,'SOURCES','m');
  ['ECB rates','BBC RSS','CoinGecko','Twelve Data','Dukascopy','Official releases'].forEach((s,i)=>T(40,124+i*28,s));
  T(40,310,'Company · social','m');T(40,330,'not configured','m');
  // brain
  R(240,40,520,370,'99,220,143');T(262,72,'ARIMA BRAIN · canonical','m');
  R(262,92,476,54,'255,49,78',false,'rgba(255,49,78,.06)');T(282,124,'collect → validate → normalise → persist → observe → trace');
  R(262,166,140,120,'105,200,255');T(280,196,'Left Brain','t');T(280,220,'calculations','m');
  R(430,166,140,120,'99,220,143');T(448,196,'Middle','t');T(448,220,'synthesis','m');
  R(598,166,140,120,'193,141,240');T(616,196,'Right Brain','t');T(616,220,'context','m');
  T(262,320,'12 family agents · Research Lab · Financial Intelligence Core');T(262,346,'Wealth OS · finance module · decision artifacts with hashes','m');
  T(262,390,'tested locally · not deployed','m');
  // OS
  R(820,60,260,220,'233,192,112');T(840,90,'EXECUTIVE OS · operating layer','m');
  ['Orchestration and jobs','Permissions and approvals','Audit trail','Voice gateway','Founder control'].forEach((s,i)=>T(840,124+i*26,s));
  // execution
  R(820,320,260,90,'255,110,125',true,'rgba(255,110,125,.05)');T(840,352,'LIVE EXECUTION','m');T(840,380,'switched off · paper only');
  // arrows
  el('line',{x1:190,x2:238,y1:120,y2:120,stroke:'rgba(238,248,255,.6)','stroke-width':1.4,'marker-end':'url(#ah2)'},svg);
  el('path',{d:'M760 170 C 790 170, 790 150, 818 150',fill:'none',stroke:'rgba(255,110,125,.75)','stroke-width':1.4,'stroke-dasharray':'5 5','marker-end':'url(#ah2)'},svg);
  T(770,200,'read-only client','m');T(770,214,'built · switched off','m');
  el('line',{x1:402,x2:428,y1:226,y2:226,stroke:'rgba(238,248,255,.6)','marker-end':'url(#ah2)'},svg);
  el('line',{x1:598,x2:572,y1:226,y2:226,stroke:'rgba(238,248,255,.6)','marker-end':'url(#ah2)'},svg);
  el('line',{x1:950,x2:950,y1:282,y2:318,stroke:'rgba(255,110,125,.6)','stroke-dasharray':'4 4'},svg);
  T(560,480,'Which system will carry the name “ARIMA OS” is not settled. This diagram shows the systems as they exist in the code.','m','middle');
})();

/* =====================================================================
   9. INDIVIDUALS, BUSINESSES
   ===================================================================== */
(function journey(){const wrap=$('#journeyInd'),det=$('#indDetail');
  const show=i=>{const s=A.journeyInd[i];$$('#journeyInd button').forEach((b,k)=>b.setAttribute('aria-pressed',k===i));
    det.innerHTML=`<span class="mono" style="color:rgb(var(--hi))">Step ${i+1} of 6</span><h3 style="margin:12px 0 10px">${esc(s.name)}</h3><p class="body">${esc(s.line)}</p><div class="chips" style="margin-top:18px">${chip(s.status)}<span class="small">${esc(s.tool)}</span></div>`};
  A.journeyInd.forEach((s,i)=>{const b=h('button',{type:'button','aria-pressed':i===0},`<i>0${i+1}</i><b>${esc(s.name)}</b>`);b.onclick=()=>show(i);wrap.appendChild(b)});show(0);
  const ids=['iIncome','iEss','iOther','iSave','iGoal'];
  const calc=()=>{const[inc,ess,oth,sav,goal]=ids.map(id=>Math.max(0,+$('#'+id).value||0));const sur=inc-ess-oth;
    $('#oSurplus').textContent=(sur<0?'−':'')+fmt(Math.abs(sur));$('#oBuffer').textContent=ess>0?(sav/ess).toFixed(1):'–';
    $('#oGoal').textContent=goal<=sav?'Reached':sur>0?Math.ceil((goal-sav)/sur):'Not with this surplus'};
  ids.forEach(id=>$('#'+id).addEventListener('input',calc));calc();
})();

const cash=(function(){const c=$('#cashCanvas'),g=c.getContext('2d');let data=null;
  function compute(){const d=+$('#bDelay').value,cp=+$('#bCost').value;$('#bDelayOut').textContent=d+' days';$('#bCostOut').textContent=cp+'%';
    const rev=42000,cost=38000,start=60000,dl=d/30,cost2=cost*(1+cp/100);const base=[],sc=[];
    for(let m=0;m<12;m++){base.push(start+(m+1)*(rev-cost));sc.push(start+rev*Math.max(0,m+1-dl)-(m+1)*cost2)}
    data={base,sc};const mb=Math.min(...base),ms=Math.min(...sc);const neg=sc.findIndex(v=>v<0);
    $('#bBase').textContent=fmt(mb);$('#bScen').textContent=(ms<0?'−':'')+fmt(Math.abs(ms));$('#bNeg').textContent=neg<0?'None':'Month '+(neg+1);
    c.setAttribute('aria-label',`Twelve-month cash position. Lowest cash in the baseline is ${fmt(mb)}; in the scenario it is ${fmt(ms)}${neg<0?'':`, falling below zero in month ${neg+1}`}.`);draw()}
  function draw(){if(!data)return;const[W,H]=fitCanvas(c,g);g.clearRect(0,0,W,H);
    const all=[...data.base,...data.sc,0];const lo=Math.min(...all)*1.1-5000,hi=Math.max(...all)*1.05;
    const X=m=>30+m/11*(W-50),Y=v=>H-24-(v-lo)/(hi-lo)*(H-40);
    g.strokeStyle='rgba(255,255,255,.18)';g.beginPath();g.moveTo(30,Y(0));g.lineTo(W-20,Y(0));g.stroke();
    g.fillStyle='rgba(238,248,255,.5)';g.font='10.5px SFMono-Regular,Consolas,monospace';g.fillText('0',12,Y(0)+4);
    for(let m=0;m<12;m+=3)g.fillText('M'+(m+1),X(m)-8,H-6);
    const line=(arr,col,w)=>{g.strokeStyle=col;g.lineWidth=w;g.beginPath();arr.forEach((v,m)=>m?g.lineTo(X(m),Y(v)):g.moveTo(X(m),Y(v)));g.stroke()};
    line(data.base,'rgba(238,248,255,.55)',1.4);line(data.sc,'rgb(99,220,143)',2.2);
    data.sc.forEach((v,m)=>{if(v<0){g.fillStyle='rgba(255,110,125,.9)';g.beginPath();g.arc(X(m),Y(v),3.5,0,6.283);g.fill()}});
    g.fillStyle='rgba(238,248,255,.7)';g.fillText('baseline',X(11)-50,Y(data.base[11])-8);g.fillStyle='rgb(99,220,143)';g.fillText('scenario',X(11)-50,Y(data.sc[11])+16);}
  $('#bDelay').addEventListener('input',compute);$('#bCost').addEventListener('input',compute);
  let done=false;visible(c,v=>{if(v&&!done){done=true;compute()}},'300px');
  return{draw};
})();

/* =====================================================================
   10. ARIMA WORLD: visual impression + relational map
   ===================================================================== */
const worldViz=(function(){const c=$('#worldCanvas'),g=c.getContext('2d');let on=false,W=0,H=0,t=0;
  const r=seeded(404);const stars=Array.from({length:[60,120,180][tier]},()=>[r(),r()*.55,r()*1.2+.2,r()]);
  const city=Array.from({length:[80,160,240][tier]},()=>[r(),r(),r()]);
  function size(){[W,H]=fitCanvas(c,g)}
  function draw(dt){t+=dt;const mx=((mouse.x/(innerWidth/innerHeight))-.5)||0;
    const hz=H*.6, vx=W*(.5-mx*.04);
    g.globalCompositeOperation='source-over';
    const sky=g.createLinearGradient(0,0,0,hz);sky.addColorStop(0,'#010604');sky.addColorStop(.7,'#06281a');sky.addColorStop(1,'#0d472a');g.fillStyle=sky;g.fillRect(0,0,W,hz);
    const gr=g.createLinearGradient(0,hz,0,H);gr.addColorStop(0,'#04170d');gr.addColorStop(1,'#010402');g.fillStyle=gr;g.fillRect(0,hz,W,H-hz);
    g.globalCompositeOperation='lighter';
    // aurora
    for(let k=0;k<3;k++){g.strokeStyle=`rgba(${k===1?'121,217,186':'99,220,143'},${.06-k*.015})`;g.lineWidth=40-k*10;g.beginPath();
      for(let x=0;x<=W;x+=16){const y=H*(.12+k*.05)+Math.sin(x*.004+t*.15+k)*H*.04;x?g.lineTo(x,y):g.moveTo(x,y)}g.stroke()}
    for(const s2 of stars){g.fillStyle=`rgba(220,255,235,${.2+.5*Math.abs(Math.sin(t*.6+s2[3]*9))*s2[3]})`;g.fillRect(s2[0]*W,s2[1]*hz*.8,s2[2],s2[2])}
    g.globalCompositeOperation='source-over';
    // far ridges and the summit
    const sx=W*(.7-mx*.02),sy=H*.17;
    g.fillStyle='#062014';g.beginPath();g.moveTo(0,hz);for(let x=0;x<=W;x+=20)g.lineTo(x,hz-H*.08-Math.abs(Math.sin(x*.011))*H*.07);g.lineTo(W,hz);g.fill();
    g.fillStyle='#03130b';g.beginPath();g.moveTo(W*.35,hz);g.lineTo(sx-W*.12,sy+H*.2);g.lineTo(sx-W*.03,sy+H*.05);g.lineTo(sx,sy);g.lineTo(sx+W*.05,sy+H*.07);g.lineTo(sx+W*.18,sy+H*.26);g.lineTo(W,hz-H*.05);g.lineTo(W,hz);g.fill();
    g.strokeStyle='rgba(142,215,167,.55)';g.lineWidth=1.2;g.beginPath();g.moveTo(sx-W*.12,sy+H*.2);g.lineTo(sx-W*.03,sy+H*.05);g.lineTo(sx,sy);g.lineTo(sx+W*.05,sy+H*.07);g.lineTo(sx+W*.18,sy+H*.26);g.stroke();
    g.globalCompositeOperation='lighter';
    // ground grid in perspective
    g.strokeStyle='rgba(99,220,143,.16)';g.lineWidth=1;
    for(let k=-14;k<=14;k++){g.beginPath();g.moveTo(vx+k*W*.012,hz);g.lineTo(vx+k*W*.16,H);g.stroke()}
    for(let k=1;k<14;k++){const z=((k+(t*.25)%1))/14;const y=hz+(H-hz)*z*z;g.globalAlpha=z;g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke()}
    g.globalAlpha=1;
    // city on the plain
    for(const p of city){const x=p[0]*W,z=p[1];const y=hz+(H-hz)*z*z*.55+2;if(Math.abs(x-vx)<W*.06*(1+z*3))continue;
      const hgt=(4+p[2]*22)*(.4+z*1.6),w=(3+p[2]*6)*(.4+z*1.4);g.fillStyle=`rgba(99,220,143,${.05+.08*z})`;g.fillRect(x,y-hgt,w,hgt);
      if(p[2]>.35){const tw=.5+.5*Math.sin(t*.7+p[2]*30);g.fillStyle=`rgba(${p[2]>.85?'233,192,112':'190,245,210'},${(.35+.4*tw)*(.4+z)})`;g.fillRect(x+w*.3,y-hgt*.7,1.6,1.6)}}
    // summit beam and the Brain hall (Left · Middle · Right)
    const beam=g.createLinearGradient(0,0,0,sy);beam.addColorStop(0,'rgba(99,220,143,0)');beam.addColorStop(1,`rgba(99,220,143,${.22+.08*Math.sin(t)})`);g.fillStyle=beam;g.fillRect(sx-3,0,6,sy);
    const halo=g.createRadialGradient(sx,sy,0,sx,sy,H*.3);halo.addColorStop(0,'rgba(99,220,143,.5)');halo.addColorStop(1,'rgba(99,220,143,0)');g.fillStyle=halo;g.fillRect(sx-H*.3,sy-H*.3,H*.6,H*.6);
    [[-12,'105,200,255'],[0,'99,220,143'],[12,'193,141,240']].forEach(([dx,col])=>{g.fillStyle=`rgba(${col},.95)`;g.fillRect(sx+dx-2,sy-10,4,10)});
    // processional way: foreground → Assembly → ascent → Brain hall
    const ax=vx+W*.02,ay=hz+(H-hz)*.18;
    const way=[[vx-W*.02,H+10],[vx-W*.01,H*.88],[ax,ay+18],[ax+W*.08,hz-H*.02],[sx-W*.06,sy+H*.14],[sx-W*.02,sy+H*.06],[sx,sy]];
    g.strokeStyle='rgba(99,220,143,.18)';g.lineWidth=10;g.beginPath();way.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.stroke();
    g.strokeStyle='rgba(190,245,210,.7)';g.lineWidth=1.6;g.stroke();
    for(let k=0;k<10;k++){const u=((t*.04+k/10)%1);const seg=u*(way.length-1),i=Math.floor(seg),f=seg-i;const P0=way[i],P1=way[i+1];
      g.fillStyle='rgba(230,255,240,.95)';g.beginPath();g.arc(lerp(P0[0],P1[0],f),lerp(P0[1],P1[1],f),2.2,0,6.283);g.fill()}
    // the Assembly: 20 seats around a lectern, in perspective
    const rx=W*.075,ry=rx*.32;
    g.strokeStyle='rgba(99,220,143,.35)';g.lineWidth=1;g.beginPath();g.ellipse(ax,ay,rx*1.15,ry*1.15,0,0,6.283);g.stroke();
    for(let k=0;k<20;k++){const a=Math.PI*(.95+k/19*1.1);const row=k%2;const r2=row?1:.78;
      g.fillStyle=`rgba(190,245,210,${.55+.35*Math.sin(t*1.2+k)})`;g.beginPath();g.arc(ax+Math.cos(a)*rx*r2,ay+Math.sin(a)*ry*r2,2.4,0,6.283);g.fill()}
    g.fillStyle='rgba(233,192,112,1)';g.beginPath();g.arc(ax,ay+ry*.4,3.2,0,6.283);g.fill();
    g.globalCompositeOperation='source-over';
    g.font='11px SFMono-Regular,Consolas,monospace';g.fillStyle='rgba(238,248,255,.82)';
    g.fillText('BRAIN HALL',sx+20,sy-2);g.fillText('ASSEMBLY · 20 SEATS',ax+rx*1.25,ay+4);g.fillText('ARRIVAL',vx+W*.01,H-24);g.fillText('SUMMIT ASCENT',ax+W*.1,hz-H*.06);
  }
  function tick(dt){if(on&&!reduce)draw(dt)}
  visible(c,v=>{on=v;if(v){size();draw(0)}},'100px');loops.add(tick);
  return{size:()=>{size();draw(0)}};
})();

(function worldMap(){const svg=$('#worldSvg');let mode='built';
  function render(){svg.innerHTML='';const P={};A.worldPlaces.forEach(p=>P[p.name]=p);
    for(let i=0;i<A.worldPath.length-1;i++){const a=P[A.worldPath[i]],b=P[A.worldPath[i+1]];el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'rgba(99,220,143,.6)','stroke-width':2},svg)}
    [['Central plaza','Garden villas'],['Central plaza','Civic boulevard'],['Civic boulevard','River terraces'],['Processional Way','Amphitheatre']].forEach(([a,b])=>el('line',{x1:P[a].x,y1:P[a].y,x2:P[b].x,y2:P[b].y,stroke:'rgba(99,220,143,.25)','stroke-dasharray':'3 4'},svg));
    A.worldPlaces.forEach(p=>{if(!p.built&&mode==='built')return;const gg=el('g',{},svg);
      el('circle',{cx:p.x,cy:p.y,r:p.built?7:6,fill:p.built?'rgba(99,220,143,.9)':'none',stroke:p.built?'none':'rgba(193,141,240,.9)','stroke-dasharray':p.built?'0':'3 3','stroke-width':1.4},gg);
      const t=el('text',{x:p.x+12,y:p.y+4},gg);t.textContent=p.name;
      if(p.note||!p.built){const m=el('text',{x:p.x+12,y:p.y+19,class:'m'},gg);m.textContent=(p.built?p.note:'proposed · masterplan').toUpperCase()}});
    const lg=el('g',{},svg);el('circle',{cx:30,cy:30,r:6,fill:'rgba(99,220,143,.9)'},lg);el('text',{x:44,y:34},lg).textContent='Built and tested locally';
    if(mode==='all'){el('circle',{cx:230,cy:30,r:6,fill:'none',stroke:'rgba(193,141,240,.9)','stroke-dasharray':'3 3'},lg);el('text',{x:244,y:34},lg).textContent='Proposed in the masterplan, not built'}}
  $$('#worldTabs button').forEach(b=>b.onclick=()=>{mode=b.dataset.v;$$('#worldTabs button').forEach(x=>x.setAttribute('aria-pressed',x===b));render()});render();
})();

/* =====================================================================
   11. NEXT STEPS + GAPS
   ===================================================================== */
$('#nextLinks').innerHTML=A.next.map((n,i)=>n.href?`<a class="glass pad rv d${i%3}" href="${esc(n.href)}">${chip(n.status)}<b>${esc(n.name)}</b><span class="small">${esc(n.line)}</span><span class="arrow small" style="color:rgb(var(--hi))">Open</span></a>`
  :`<div class="glass pad rv d${i%3}">${chip(n.status)}<b>${esc(n.name)}</b><span class="small">${esc(n.line)}</span></div>`).join('');

/* The ARIMA film card opens the official teaser in an on-page player */
(function film(){
  const n=A.next.find(x=>x.video);if(!n)return;
  const card=$(`#nextLinks a[href="${n.href}"]`);if(!card)return;
  const st=document.createElement('style');
  st.textContent=`#filmPlayer{padding:0;border:0;background:transparent;width:min(1100px,calc(100vw - 32px),calc((100dvh - 120px) * 16 / 9));max-width:none;max-height:none;overflow:visible;color:inherit}
#filmPlayer::backdrop{background:rgba(1,3,5,.88)}
#filmPlayer .film-top{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px}
#filmPlayer video{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:contain;background:#000;border-radius:14px}`;
  document.head.appendChild(st);
  const dlg=h('dialog',{id:'filmPlayer','aria-label':n.name},`<div class="film-top"><span class="mono" style="color:rgb(var(--hi))">${esc(n.name)}</span>
    <button class="icon-btn" type="button" id="filmClose" aria-label="Close film"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    <video controls playsinline preload="none" poster="${esc(n.video.poster)}"><source src="${esc(n.video.src)}" type="video/mp4"><source src="${esc(n.video.webm)}" type="video/webm"></video>`);
  body.appendChild(dlg);
  const v=dlg.querySelector('video');
  const stop=()=>{v.pause();try{v.currentTime=0}catch(e){}};
  card.addEventListener('click',e=>{if(typeof dlg.showModal!=='function')return;e.preventDefault();dlg.showModal();body.style.overflow='hidden';const p=v.play();if(p&&p.catch)p.catch(()=>{})});
  dlg.addEventListener('close',()=>{stop();if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});body.style.overflow='';card.focus()});
  $('#filmClose').onclick=()=>dlg.close();
  dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});
})();

/* =====================================================================
   12. REVEALS, SCROLL, RESIZE, START
   ===================================================================== */
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12,rootMargin:'0px 0px -6% 0px'});
$$('.rv').forEach(x=>{if(!x.closest('.hero'))io.observe(x)});
let ticking=false;
addEventListener('scroll',()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{ticking=false;updateWorld();dna.update();journey.update()})},{passive:true});
let rz;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{resizeSurface();resizeIntro();dna.size();dna.update();lab.draw();cash.draw();worldViz.size();journey.measure();journey.update();updateWorld()},120)});
// open links to sections smoothly even inside the overlay
document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[href^="#"]');if(!a)return;const id=a.getAttribute('href').slice(1);const t=id&&document.getElementById(id);if(!t)return;
  e.preventDefault();closeExplore(false);closeDrawer(false);t.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});history.replaceState(null,'','#'+id);
  setTimeout(()=>{const hd=t.querySelector('h1,h2,h3')||t;hd.setAttribute('tabindex','-1');hd.focus({preventScroll:true})},reduce?0:700)});
resizeSurface();resizeIntro();dna.size();dna.update();journey.measure();journey.update();updateWorld();requestAnimationFrame(frame);
window.__arima={finish,openPlatform,tier,glOK:()=>glOK};
})();
