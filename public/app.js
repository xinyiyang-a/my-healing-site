// public/app.js
// 完整前端逻辑：360°场景 + 音频 + 自定义生成（调用后端/api/generate）

/* ══ SCENE DATA ══ */
const SCENES = [
  { id:'fuchun',  name:'富春山居', tag:'山水水墨 · 视觉疗愈', desc:'远山淡墨、云雾缓流、江面平阔、轻舟无痕', mood:'焦虑 · 烦躁 · 压力过载',   filter:'brightness(1.9) contrast(1.05)' },
  { id:'yunshan', name:'云山禅境', tag:'极简禅意 · 静心安神', desc:'孤峰耸立、云海漫涌、古松挺立、留白深远', mood:'精神内耗 · 失眠 · 注意力涣散', filter:'brightness(1.8) contrast(1.05)' },
  { id:'xishan',  name:'溪山行旅', tag:'自然疗愈 · 疲惫修复', desc:'浅溪、石桥、远山、雾霭、林间微光',       mood:'情绪低落 · 紧绷 · 疲惫',   filter:'brightness(1.8) contrast(1.05)' },
  { id:'tingyu',  name:'听雨轩窗', tag:'中式园林 · 思绪纾解', desc:'苏式园林、漏窗、荷塘、芭蕉、细雨轻落',   mood:'嘈杂环境 · 抑郁 · 思绪杂乱', filter:'brightness(2.8) contrast(1.0) saturate(1.3)' },
  { id:'bimo',    name:'笔墨静心', tag:'书房禅意 · 专注提升', desc:'明式书房、文房四宝、竹影窗纱、青烟袅袅',  mood:'浮躁 · 考前紧张 · 专注力差', filter:'brightness(3.2) contrast(0.95) saturate(0.8) sepia(0.2)' },
  { id:'lanting', name:'兰亭曲水', tag:'竹林胜境 · 心情舒缓', desc:'茂林修竹、曲水流觞、落花逐水',           mood:'社交压力 · 心情压抑',       filter:'brightness(1.9) contrast(1.05)' },
]

/* ══ THREE.JS ══ */
let renderer, scene3, camera, mat, canvas
let isDrag=false, px=0, py=0, vy=0, vx=0, ry=0, rx=0
const RS=0.0028, DAMP=0.90, MRX=Math.PI*0.38
let autoRotSpeed=0.0004

function initThree() {
  canvas = document.getElementById('glc')
  if (!canvas || !window.THREE) return

  renderer = new THREE.WebGLRenderer({ canvas, antialias:true })
  renderer.setPixelRatio(Math.min(devicePixelRatio,2))
  renderer.setSize(innerWidth,innerHeight)
  renderer.outputEncoding = THREE.sRGBEncoding
  renderer.toneMapping = THREE.NoToneMapping

  scene3 = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(80,innerWidth/innerHeight,0.1,1000)
  camera.position.set(0,0,0.01)

  window.addEventListener('resize',()=>{
    camera.aspect=innerWidth/innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(innerWidth,innerHeight)
  })

  const geo = new THREE.SphereGeometry(500,96,48)
  geo.scale(-1,1,1)
  mat = new THREE.MeshBasicMaterial({ color:0x111008 })
  scene3.add(new THREE.Mesh(geo,mat))

  const capMat = new THREE.MeshBasicMaterial({ color:0x0a0806 })
  const top = new THREE.Mesh(new THREE.CircleGeometry(500,64),capMat)
  top.rotation.x=-Math.PI/2; top.position.y=90; scene3.add(top)
  const bot = new THREE.Mesh(new THREE.CircleGeometry(500,64),capMat)
  bot.rotation.x=Math.PI/2; bot.position.y=-90; scene3.add(bot)

  canvas.addEventListener('mousedown',e=>{isDrag=true;px=e.clientX;py=e.clientY;autoRotSpeed=0})
  window.addEventListener('mouseup',()=>isDrag=false)
  window.addEventListener('mousemove',e=>{
    if(!isDrag)return
    vy+=(e.clientX-px)*RS; vx+=(e.clientY-py)*RS*0.6
    px=e.clientX; py=e.clientY
  })
  canvas.addEventListener('touchstart',e=>{isDrag=true;px=e.touches[0].clientX;py=e.touches[0].clientY;autoRotSpeed=0},{passive:true})
  window.addEventListener('touchend',()=>isDrag=false)
  window.addEventListener('touchmove',e=>{
    if(!isDrag)return
    vy+=(e.touches[0].clientX-px)*RS; vx+=(e.touches[0].clientY-py)*RS*0.6
    px=e.touches[0].clientX; py=e.touches[0].clientY
  },{passive:true})
  canvas.addEventListener('wheel',e=>{
    camera.fov=Math.max(40,Math.min(100,camera.fov+e.deltaY*0.04))
    camera.updateProjectionMatrix()
  },{passive:true});

  (function loop(){
    requestAnimationFrame(loop)
    vy*=DAMP; vx*=DAMP
    if(!isDrag) { vy-=autoRotSpeed; }
    ry+=vy; rx+=vx
    rx=Math.max(-MRX,Math.min(MRX,rx))
    const qY=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),ry)
    const qX=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),rx)
    camera.quaternion.copy(qY).multiply(qX)
    renderer.render(scene3,camera)
  })()
}

/* ══ TEXTURE ══ */
const loader3 = new THREE.TextureLoader()
const texCache = {}

function loadTex(id) {
  if (texCache[id]) { applyTex(texCache[id]); return }
  fetch(id+'.jpg')
    .then(r=>{ if(!r.ok) throw new Error(); return r.blob() })
    .then(blob=>{
      const url=URL.createObjectURL(blob)
      const img=new Image()
      img.onload=()=>{
        const t=new THREE.Texture(img)
        t.encoding=THREE.sRGBEncoding
        t.wrapS=THREE.RepeatWrapping
        t.repeat.x=-1; t.offset.x=1
        t.needsUpdate=true
        texCache[id]=t; applyTex(t)
      }
      img.src=url
    })
    .catch(()=>buildProcTex(id))
}

function applyTex(t) {
  if(!mat)return
  mat.map=t; mat.needsUpdate=true
}

/* ══ PROCEDURAL TEXTURES ══ */
const offC=document.getElementById('offC')
const g=offC&&offC.getContext('2d')
const PW=2048,PH=1024

function mkRng(s){let n=s|0;return()=>{n=Math.imul(48271,n)|0;return(n>>>0)/2**32}}
function lg(x0,y0,x1,y1,s){const r=g.createLinearGradient(x0,y0,x1,y1);s.forEach(([t,c])=>r.addColorStop(t,c));return r}
function rg(cx,cy,r0,r1,s){const r=g.createRadialGradient(cx,cy,r0,cx,cy,r1);s.forEach(([t,c])=>r.addColorStop(t,c));return r}
function bl(b,fn){g.save();g.filter=`blur(${b}px)`;fn();g.restore()}
function ridge(rng,by,amp,freq,oct,col){
  g.fillStyle=col;g.beginPath();g.moveTo(0,PH)
  for(let x=0;x<=PW;x+=4){let n=0,a=1,f=freq;for(let o=0;o<oct;o++){n+=Math.sin(x*f*Math.PI*2/PW+(rng()+o)*.5)*a;a*=.5;f*=2.1}g.lineTo(x,by+n*amp)}
  g.lineTo(PW,PH);g.closePath();g.fill()
}
function pine(x,y,h,a){
  g.strokeStyle=`rgba(44,30,14,${a*.9})`;g.lineWidth=6;g.beginPath();g.moveTo(x,y);g.lineTo(x+4,y-h);g.stroke()
  for(let l=0;l<6;l++){const ly=y-h*(.22+l*.14),lw=h*(.36-l*.04);g.fillStyle=`rgba(30,65,34,${a*(.52+l*.07)})`;[-1,1].forEach(d=>{g.beginPath();g.moveTo(x+3,ly-h*.09);g.bezierCurveTo(x+d*lw*.1,ly,x+d*lw,ly+h*.07,x+d*lw*1.1,ly+h*.03);g.bezierCurveTo(x+d*lw*.5,ly-h*.05,x+d*lw*.2,ly-h*.06,x+3,ly-h*.09);g.fill()})}
}

const DRAWS = {
  fuchun(rng){
    g.fillStyle=lg(0,0,0,PH,[[0,'#c2d2e2'],[.38,'#d8e4ea'],[.62,'#e0e9e2'],[1,'#c8c4b2']]);g.fillRect(0,0,PW,PH)
    bl(72,()=>{g.fillStyle=rg(PW*.76,PH*.13,0,PW*.3,[[0,'rgba(255,238,172,.9)'],[1,'rgba(0,0,0,0)']]);g.fillRect(0,0,PW,PH)})
    [{y:.71,a:58,d:.44,c:'rgba(178,195,212,'},{y:.65,a:78,d:.63,c:'rgba(142,163,184,'},{y:.59,a:98,d:.77,c:'rgba(100,128,150,'},{y:.53,a:118,d:.89,c:'rgba(65,92,114,'},{y:.47,a:132,d:.97,c:'rgba(40,63,86,'}].forEach((m,i)=>{
      if(i<3)bl((3-i)*6,()=>ridge(rng,PH*m.y,m.a,1.8+i*.6,4,m.c+m.d+')'))
      else ridge(rng,PH*m.y,m.a,1.8+i*.6,4,m.c+m.d+')')
    })
    bl(22,()=>{[[.63,.07],[.57,.10],[.50,.065]].forEach(([y,a])=>{g.fillStyle=lg(0,PH*(y-.03),0,PH*(y+.04),[[0,'rgba(255,255,255,0)'],[.5,`rgba(255,255,255,${a})`],[1,'rgba(255,255,255,0)']]);g.fillRect(0,PH*(y-.03),PW,PH*.07)})})
    g.fillStyle=lg(0,PH*.72,0,PH*.88,[[0,'rgba(148,175,205,0)'],[.3,'rgba(148,175,205,.8)'],[1,'rgba(118,152,184,.92)']]);g.fillRect(0,PH*.72,PW,PH*.18)
    for(let i=0;i<22;i++){g.strokeStyle=`rgba(195,212,232,${.43-i*.018})`;g.lineWidth=.9;g.beginPath();g.moveTo(PW*.04,PH*.757+i*7);g.lineTo(PW*.96,PH*.757+i*7);g.stroke()}
    bl(4,()=>{g.save();g.globalAlpha=.22;g.scale(1,-1);g.translate(0,-PH*1.54);ridge(rng,PH*.50,115,1.8,4,'rgba(65,92,114,.72)');g.restore();g.globalAlpha=1})
    const bx=PW*.33,by=PH*.797;g.fillStyle='rgba(34,22,10,.94)';g.beginPath();g.moveTo(bx,by-5);g.bezierCurveTo(bx+8,by-12,bx+57,by-12,bx+67,by-5);g.lineTo(bx+71,by+3);g.lineTo(bx-4,by+3);g.closePath();g.fill()
    g.strokeStyle='rgba(34,22,10,.82)';g.lineWidth=2;g.beginPath();g.moveTo(bx+35,by+2);g.lineTo(bx+33,by-42);g.stroke()
    g.fillStyle=lg(0,PH*.87,0,PH,[[0,'rgba(105,125,144,0)'],[1,'#748898']]);g.fillRect(0,PH*.87,PW,PH*.13)
    g.fillStyle=rg(PW/2,PH/2,PH*.35,PH*.9,[[0,'rgba(0,0,0,0)'],[1,'rgba(0,0,0,.3)']]);g.fillRect(0,0,PW,PH)
  },
  yunshan(rng){
    g.fillStyle=lg(0,0,0,PH,[[0,'#d8e5ea'],[.4,'#e8f0ec'],[1,'#d5e2de']]);g.fillRect(0,0,PW,PH)
    bl(48,()=>{for(let i=0;i<14;i++){g.fillStyle=`rgba(255,255,255,${.62+rng()*.3})`;g.beginPath();g.ellipse(rng()*PW,PH*(.50+rng()*.07),PW*(.2+rng()*.15),PH*(.07+rng()*.05),0,0,Math.PI*2);g.fill()}})
    bl(10,()=>{ridge(rng,PH*.66,72,.9,3,'rgba(148,165,176,.28)');ridge(rng,PH*.60,98,1.2,3,'rgba(115,135,150,.38)')})
    g.fillStyle='rgba(62,82,98,.97)';g.beginPath();g.moveTo(PW*.02,PH);g.bezierCurveTo(PW*.15,PH*.72,PW*.32,PH*.3,PW*.5,PH*.1);g.bezierCurveTo(PW*.58,PH*.22,PW*.68,PH*.46,PW*.82,PH*.62);g.bezierCurveTo(PW*.88,PH*.72,PW*.94,PH*.84,PW*.98,PH);g.closePath();g.fill()
    g.fillStyle='rgba(62,82,98,.97)';g.beginPath();g.moveTo(0,PH);g.bezierCurveTo(PW*.02,PH*.84,0,PH*.72,0,PH);g.fill()
    bl(10,()=>{g.fillStyle='rgba(228,240,246,.78)';g.beginPath();g.ellipse(PW*.5,PH*.12,88,32,0,0,Math.PI*2);g.fill()})
    bl(22,()=>{g.fillStyle='rgba(255,255,255,.72)';g.fillRect(0,PH*.44,PW,PH*.09);g.fillStyle='rgba(255,255,255,.52)';g.fillRect(0,PH*.55,PW,PH*.065)})
    pine(PW*.22,PH*.63,142,1.0);pine(PW*.74,PH*.65,110,.92)
    g.fillStyle=lg(0,PH*.83,0,PH,[[0,'rgba(142,170,142,0)'],[1,'rgba(110,142,114,.94)']]);g.fillRect(0,PH*.83,PW,PH*.17)
    g.fillStyle=rg(PW/2,PH/2,PH*.3,PH*.9,[[0,'rgba(0,0,0,0)'],[1,'rgba(0,0,0,.2)']]);g.fillRect(0,0,PW,PH)
  },
  xishan(rng){
    g.fillStyle=lg(0,0,0,PH,[[0,'#a2c2b2'],[.4,'#b6d2c0'],[1,'#90b2a0']]);g.fillRect(0,0,PW,PH)
    bl(28,()=>{for(let r=0;r<10;r++){const rx=rng()*PW;g.fillStyle='rgba(255,246,188,.22)';g.beginPath();g.moveTo(rx,0);g.lineTo(rx+45,PH*.68);g.lineTo(rx+112,PH*.68);g.lineTo(rx+68,0);g.fill()}})
    bl(8,()=>{ridge(rng,PH*.62,88,.9,3,'rgba(75,115,90,.72)');ridge(rng,PH*.56,108,1.2,3,'rgba(52,92,70,.82)')})
    const tc=['rgba(90,148,102,','rgba(60,115,76,','rgba(36,94,52,','rgba(22,74,40,'];[0,1,2,3].forEach(L=>{const cnt=14+L*5;for(let t=0;t<cnt;t++){const tx=(t/cnt)*PW+rng()*55-27,th=PH*(.25+rng()*.13);g.fillStyle=tc[L]+(.72+L*.07)+')';g.beginPath();g.moveTo(tx,PH*(.87-L*.04));g.bezierCurveTo(tx-th*.5,PH*(.87-L*.04)-th*.4,tx-th*.4,PH*(.87-L*.04)-th,tx,PH*(.87-L*.04)-th);g.bezierCurveTo(tx+th*.4,PH*(.87-L*.04)-th,tx+th*.5,PH*(.87-L*.04)-th*.4,tx,PH*(.87-L*.04));g.fill()}})
    g.fillStyle=lg(0,PH*.72,0,PH*.85,[[0,'rgba(130,188,202,0)'],[.35,'rgba(130,190,205,.88)'],[1,'rgba(100,165,188,.72)']]);g.beginPath();g.moveTo(PW*.06,PH);g.bezierCurveTo(PW*.22,PH*.84,PW*.38,PH*.73,PW*.52,PH*.72);g.bezierCurveTo(PW*.66,PH*.71,PW*.8,PH*.76,PW*.94,PH);g.lineTo(PW,PH);g.lineTo(0,PH);g.fill()
    g.fillStyle='rgba(90,72,52,.92)';g.beginPath();g.ellipse(PW*.52,PH*.74,PW*.055,PH*.016,0,0,Math.PI*2);g.fill()
    g.fillStyle=lg(0,PH*.85,0,PH,[[0,'rgba(45,100,58,0)'],[1,'rgba(30,82,46,.96)']]);g.fillRect(0,PH*.85,PW,PH*.15)
    g.fillStyle=rg(PW/2,PH/2,PH*.3,PH*.9,[[0,'rgba(0,0,0,0)'],[1,'rgba(0,0,0,.22)']]);g.fillRect(0,0,PW,PH)
  },
  tingyu(rng){
    g.fillStyle=lg(0,0,0,PH,[[0,'#7285a0'],[.4,'#8ca4b8'],[1,'#627282']]);g.fillRect(0,0,PW,PH)
    bl(28,()=>{for(let i=0;i<16;i++){g.fillStyle=`rgba(78,94,118,${.52+rng()*.32})`;g.beginPath();g.ellipse(rng()*PW,PH*(.1+rng()*.22),PW*(.17+rng()*.13),PH*(.055+rng()*.04),0,0,Math.PI*2);g.fill()}})
    for(let r=0;r<800;r++){const rx=rng()*PW,ry=rng()*PH*.88,len=18+rng()*26;g.strokeStyle=`rgba(170,198,222,${.22+rng()*.28})`;g.lineWidth=.65;g.beginPath();g.moveTo(rx,ry);g.lineTo(rx+.12*len,ry+len);g.stroke()}
    g.fillStyle='rgba(228,222,210,.92)';g.fillRect(PW*.54,PH*.36,PW*.22,PH*.38)
    g.fillStyle='rgba(70,72,78,.95)';g.beginPath();g.moveTo(PW*.5,PH*.36);g.lineTo(PW*.65,PH*.26);g.lineTo(PW*.8,PH*.36);g.closePath();g.fill()
    g.strokeStyle='rgba(70,58,40,.88)';g.lineWidth=15;g.beginPath();g.arc(PW*.22,PH*.6,76,0,Math.PI*2);g.stroke()
    g.fillStyle='rgba(140,162,142,.38)';g.beginPath();g.arc(PW*.22,PH*.6,61,0,Math.PI*2);g.fill()
    for(let l=0;l<18;l++){const lx=rng()*PW*.52+PW*.02,ly=PH*(.72+rng()*.12),lr=22+rng()*30;g.fillStyle=`rgba(50,108,62,${.62+rng()*.28})`;g.beginPath();g.ellipse(lx,ly,lr,lr*.45,rng()*.6,0,Math.PI*2);g.fill()}
    for(let f=0;f<8;f++){g.fillStyle='rgba(212,120,132,.88)';g.beginPath();g.arc(rng()*PW*.45+PW*.04,PH*(.73+rng()*.08),9,0,Math.PI*2);g.fill()}
    g.fillStyle=lg(0,PH*.86,0,PH,[[0,'rgba(65,82,102,0)'],[1,'rgba(46,62,82,.92)']]);g.fillRect(0,PH*.86,PW,PH*.14)
    g.fillStyle=rg(PW/2,PH/2,PH*.25,PH*.9,[[0,'rgba(0,0,0,0)'],[1,'rgba(0,0,0,.3)']]);g.fillRect(0,0,PW,PH)
  },
  bimo(rng){
    g.fillStyle=lg(0,0,0,PH,[[0,'#2a1802'],[.35,'#583408'],[1,'#764612']]);g.fillRect(0,0,PW,PH)
    bl(55,()=>{g.fillStyle=rg(PW*.6,PH*.47,0,PW*.52,[[0,'rgba(255,202,88,.88)'],[.4,'rgba(212,142,42,.45)'],[1,'rgba(0,0,0,0)']]);g.fillRect(0,0,PW,PH);g.fillStyle=rg(PW*.6,PH*.47,0,PW*.18,[[0,'rgba(255,230,148,.58)'],[1,'rgba(0,0,0,0)']]);g.fillRect(0,0,PW,PH)})
    g.fillStyle='rgba(66,40,12,.97)';g.fillRect(PW*.72,PH*.17,PW*.14,PH*.44)
    g.fillStyle='rgba(78,46,14,.97)';g.beginPath();g.moveTo(0,PH*.58);g.lineTo(PW,PH*.55);g.lineTo(PW,PH);g.lineTo(0,PH);g.fill()
    g.fillStyle='rgba(236,224,188,.97)';g.fillRect(PW*.28,PH*.36,PW*.3,PH*.21)
    g.strokeStyle='rgba(22,12,4,.78)';g.lineWidth=2.2;for(let l=0;l<5;l++){g.beginPath();g.moveTo(PW*.31,PH*.40+l*14);g.bezierCurveTo(PW*.39,PH*.40+l*14-4,PW*.49,PH*.40+l*14+4,PW*.55,PH*.40+l*14);g.stroke()}
    g.fillStyle='rgba(24,16,8,.98)';g.beginPath();g.ellipse(PW*.65,PH*.565,33,20,0,0,Math.PI*2);g.fill()
    g.strokeStyle='rgba(90,62,22,.92)';g.lineWidth=5;g.beginPath();g.moveTo(PW*.7,PH*.38);g.lineTo(PW*.655,PH*.585);g.stroke()
    g.fillStyle='rgba(232,210,150,.97)';g.fillRect(PW*.79-6,PH*.41,12,PH*.145)
    bl(5,()=>{g.fillStyle='rgba(255,195,50,.95)';g.beginPath();g.ellipse(PW*.79,PH*.41,20,28,0,0,Math.PI*2);g.fill()})
    g.fillStyle=lg(0,PH*.84,0,PH,[[0,'rgba(44,24,4,0)'],[1,'rgba(20,10,2,.97)']]);g.fillRect(0,PH*.84,PW,PH*.16)
    g.fillStyle=rg(PW*.6,PH*.5,PH*.1,PH*.88,[[0,'rgba(0,0,0,0)'],[1,'rgba(0,0,0,.72)']]);g.fillRect(0,0,PW,PH)
  },
  lanting(rng){
    g.fillStyle=lg(0,0,0,PH,[[0,'#6eac8c'],[.38,'#8cc2a4'],[1,'#5e9e78']]);g.fillRect(0,0,PW,PH)
    bl(22,()=>{for(let d=0;d<10;d++){g.fillStyle='rgba(212,252,170,.24)';g.beginPath();g.arc(rng()*PW,PH*(.18+rng()*.32),90+rng()*115,0,Math.PI*2);g.fill()}})
    for(let b=0;b<32;b++){
      const bx=(b/32)*PW+rng()*62-31,bw=9+rng()*13,a=.45+rng()*.5,cv=rng()*28-14
      const gr=g.createLinearGradient(bx,0,bx+bw,0);gr.addColorStop(0,`rgba(52,105,38,${a})`);gr.addColorStop(.5,`rgba(75,138,50,${a})`);gr.addColorStop(1,`rgba(40,85,28,${a})`)
      g.fillStyle=gr;g.beginPath();g.moveTo(bx,PH);g.bezierCurveTo(bx+cv*.3,PH*.65,bx+cv*.7,PH*.3,bx+cv,0);g.lineTo(bx+bw+cv,0);g.bezierCurveTo(bx+bw+cv*.7,PH*.3,bx+bw+cv*.3,PH*.65,bx+bw,PH);g.closePath();g.fill()
      for(let n=1;n<10;n++){const ny=PH-n*(PH/9);g.strokeStyle=`rgba(28,65,22,${a*.85})`;g.lineWidth=bw+3;g.beginPath();g.moveTo(bx-1,ny);g.lineTo(bx+bw+1,ny);g.stroke()}
    }
    g.fillStyle=lg(0,PH*.76,0,PH*.88,[[0,'rgba(88,175,152,0)'],[.4,'rgba(88,178,155,.85)'],[1,'rgba(65,152,128,.68)']]);g.beginPath();g.moveTo(0,PH);g.bezierCurveTo(PW*.14,PH*.83,PW*.3,PH*.78,PW*.48,PH*.77);g.bezierCurveTo(PW*.62,PH*.77,PW*.76,PH*.8,PW*.92,PH);g.lineTo(PW,PH);g.lineTo(0,PH);g.fill()
    for(let p=0;p<55;p++){const px=rng()*PW,py=PH*(.28+rng()*.58);g.fillStyle=`rgba(234,168,172,${.38+rng()*.48})`;g.save();g.translate(px,py);g.rotate(rng()*Math.PI*2);g.beginPath();g.ellipse(0,0,6+rng()*8,3+rng()*4,0,0,Math.PI*2);g.fill();g.restore()}
    g.fillStyle='rgba(128,110,80,.9)';g.beginPath();g.ellipse(PW*.54,PH*.73,55,17,0,0,Math.PI*2);g.fill()
    g.fillStyle=lg(0,PH*.84,0,PH,[[0,'rgba(55,132,75,0)'],[1,'rgba(36,105,50,.97)']]);g.fillRect(0,PH*.84,PW,PH*.16)
    g.fillStyle=rg(PW/2,PH/2,PH*.25,PH*.9,[[0,'rgba(0,0,0,0)'],[1,'rgba(0,0,0,.22)']]);g.fillRect(0,0,PW,PH)
  }
}

function buildProcTex(id) {
  const seed=Array.from(id).reduce((a,c)=>a+c.charCodeAt(0)*31,0)
  const rng=mkRng(seed)
  g.clearRect(0,0,PW,PH)
  if(DRAWS[id]) DRAWS[id](rng)
  const t=new THREE.CanvasTexture(offC)
  t.wrapS=THREE.RepeatWrapping;t.repeat.x=-1;t.offset.x=1;t.needsUpdate=true
  texCache[id]=t; applyTex(t)
}

/* ══ AUDIO ══ */
let aC=null,masterGain=null,noiseNodes=[],musicNodes=[],noiseGain=null,musicGain=null,musicTimer=null
const aS={n:false,m:false}
let curSceneId='fuchun'

const AUDIO_CFG = {
  fuchun:  { noiseName:'流水松风', musicName:'古琴·平沙落雁',
    noise:(ac,out)=>{ const len=ac.sampleRate*3,buf=ac.createBuffer(1,len,ac.sampleRate),d=buf.getChannelData(0);let last=0;for(let i=0;i<len;i++){last=(Math.random()*2-1)*.3+last*.85;d[i]=last};const src=ac.createBufferSource();src.buffer=buf;src.loop=true;const lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=400;src.connect(lp);lp.connect(out);src.start();return[src,lp] },
    music:(ac,out,v)=>{ const notes=[261.63,329.63,392.00,440.00,523.25],mel=[0,2,1,3,2,4,2,1,0,3,2,1,4,3,2,0],durs=[3.5,2.5,3,2,4,3,2.5,3,4,2,3,2.5,4,3,3.5,4];let t=ac.currentTime+.3;const nodes=[];mel.forEach((ni,i)=>{const f=notes[ni],osc=ac.createOscillator(),gn=ac.createGain();osc.type='triangle';osc.frequency.setValueAtTime(f,t);gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(v*.22,t+.05);gn.gain.exponentialRampToValueAtTime(v*.08,t+durs[i]*.6);gn.gain.linearRampToValueAtTime(0.0001,t+durs[i]*.98);osc.connect(gn);gn.connect(out);osc.start(t);osc.stop(t+durs[i]);nodes.push(osc,gn);t+=durs[i]*.72});return nodes },
    musicDur:55000 },
  yunshan: { noiseName:'空山风声', musicName:'禅院·磬音',
    noise:(ac,out)=>{ const len=ac.sampleRate*4,buf=ac.createBuffer(1,len,ac.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*.15;const src=ac.createBufferSource();src.buffer=buf;src.loop=true;const lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1200;src.connect(lp);lp.connect(out);src.start();return[src,lp] },
    music:(ac,out,v)=>{ const bowls=[392,523.25,293.66,440,349.23,523.25,392],waits=[0,5,9,14,18,23,28];const nodes=[];const t0=ac.currentTime+.5;bowls.forEach((f,i)=>{const osc=ac.createOscillator(),gn=ac.createGain();osc.type='sine';osc.frequency.value=f;gn.gain.setValueAtTime(0,t0+waits[i]);gn.gain.linearRampToValueAtTime(v*.28,t0+waits[i]+.01);gn.gain.exponentialRampToValueAtTime(0.0001,t0+waits[i]+4.5);osc.connect(gn);gn.connect(out);osc.start(t0+waits[i]);osc.stop(t0+waits[i]+5);nodes.push(osc,gn)});return nodes },
    musicDur:34000 },
  xishan:  { noiseName:'溪流鸟鸣', musicName:'竹笛·山涧',
    noise:(ac,out)=>{ const len=ac.sampleRate*3,buf=ac.createBuffer(1,len,ac.sampleRate),d=buf.getChannelData(0);let v=0;for(let i=0;i<len;i++){v=v*.92+(Math.random()-.5)*.25;d[i]=v*(0.6+0.4*Math.sin(i/ac.sampleRate*1.2))};const src=ac.createBufferSource();src.buffer=buf;src.loop=true;const bp=ac.createBiquadFilter();bp.type='bandpass';bp.frequency.value=600;src.connect(bp);bp.connect(out);src.start();return[src,bp] },
    music:(ac,out,v)=>{ const scale=[392,440,493.88,523.25,587.33,659.25,739.99,783.99],mel=[0,2,4,3,2,4,5,4,2,0,1,2,4,6,5,4,2,4,3,2,0],durs=[.8,.6,1.2,.8,.6,.8,1,.8,.6,1.2,.6,.8,1,1.2,.8,1,.6,.8,.6,1,1.8];let t=ac.currentTime+.2;const nodes=[];mel.forEach((ni,i)=>{const osc=ac.createOscillator(),gn=ac.createGain();osc.type='sine';osc.frequency.value=scale[ni];gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(v*.2,t+.04);gn.gain.linearRampToValueAtTime(v*.12,t+durs[i]*.6);gn.gain.linearRampToValueAtTime(0.0001,t+durs[i]*.95);osc.connect(gn);gn.connect(out);osc.start(t);osc.stop(t+durs[i]);nodes.push(osc,gn);t+=durs[i]*.88});return nodes },
    musicDur:28000 },
  tingyu:  { noiseName:'听雨白噪音', musicName:'琵琶·雨打芭蕉',
    noise:(ac,out)=>{ const len=ac.sampleRate*3,buf=ac.createBuffer(1,len,ac.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*.22;const src=ac.createBufferSource();src.buffer=buf;src.loop=true;const hp=ac.createBiquadFilter();hp.type='highpass';hp.frequency.value=1200;src.connect(hp);hp.connect(out);src.start();return[src,hp] },
    music:(ac,out,v)=>{ const notes=[349.23,392,440,466.16,523.25,587.33,622.25,698.46],mel=[0,2,1,0,3,2,4,3,2,4,5,4,6,5,4,2,3,4,5,7,5,4,2,0],durs=[.3,.3,.3,.6,.3,.3,.6,.3,.3,.3,.6,.3,.3,.3,.6,.3,.3,.5,.3,.6,.3,.3,.5,1];let t=ac.currentTime+.2;const nodes=[];mel.forEach((ni,i)=>{const osc=ac.createOscillator(),f=ac.createBiquadFilter(),gn=ac.createGain();osc.type='sawtooth';osc.frequency.value=notes[ni];f.type='lowpass';f.frequency.value=2000;gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(v*.15,t+.01);gn.gain.exponentialRampToValueAtTime(0.0001,t+durs[i]*.85);osc.connect(f);f.connect(gn);gn.connect(out);osc.start(t);osc.stop(t+durs[i]);nodes.push(osc,f,gn);t+=durs[i]});return nodes },
    musicDur:16000 },
  bimo:    { noiseName:'笔尖·翻书声', musicName:'古筝·高山流水',
    noise:(ac,out)=>{ const len=ac.sampleRate*4,buf=ac.createBuffer(1,len,ac.sampleRate),d=buf.getChannelData(0);let v=0;for(let i=0;i<len;i++){v=v*.98+(Math.random()-.5)*.04;d[i]=v};const src=ac.createBufferSource();src.buffer=buf;src.loop=true;const lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=300;src.connect(lp);lp.connect(out);src.start();return[src,lp] },
    music:(ac,out,v)=>{ const base=[261.63,293.66,329.63,349.23,392,440,493.88,523.25,587.33,659.25],mel=[4,5,6,8,7,6,5,4,2,0,1,2,4,5,4,2,4,6,8,9,8,6,5,4,2,4,5,4,2,0],durs=[1.2,.8,1,1.5,1,.8,1,1.2,.8,1.5,.8,1,1.2,1,.8,1.2,1,1.2,1.5,1.8,1.2,1,1.2,.8,1.5,1,.8,1,1.2,2];let t=ac.currentTime+.4;const nodes=[];mel.forEach((ni,i)=>{const f=base[ni],osc=ac.createOscillator(),gn=ac.createGain();osc.type='triangle';osc.frequency.setValueAtTime(f*1.02,t);osc.frequency.linearRampToValueAtTime(f,t+.12);gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(v*.18,t+.06);gn.gain.exponentialRampToValueAtTime(v*.06,t+durs[i]*.7);gn.gain.linearRampToValueAtTime(0.0001,t+durs[i]*.96);osc.connect(gn);gn.connect(out);osc.start(t);osc.stop(t+durs[i]);nodes.push(osc,gn);t+=durs[i]*.78});return nodes },
    musicDur:52000 },
  lanting: { noiseName:'竹林风声', musicName:'洞箫·曲水流觞',
    noise:(ac,out)=>{ const len=ac.sampleRate*4,buf=ac.createBuffer(1,len,ac.sampleRate),d=buf.getChannelData(0);let v=0;for(let i=0;i<len;i++){const w=0.5+0.5*Math.sin(i/ac.sampleRate*.3);v=v*.94+(Math.random()-.5)*.18*w;d[i]=v};const src=ac.createBufferSource();src.buffer=buf;src.loop=true;const bp=ac.createBiquadFilter();bp.type='bandpass';bp.frequency.value=800;bp.Q.value=.6;src.connect(bp);bp.connect(out);src.start();return[src,bp] },
    music:(ac,out,v)=>{ const scale=[293.66,329.63,369.99,392,440,493.88,554.37,587.33],mel=[0,2,4,3,2,4,5,4,3,5,6,5,4,3,2,4,3,2,0,2,4,5,7,6,5,4,2,0],durs=[1.5,1,1.8,1.2,1,1.5,1.8,1.2,1,1.5,2,1.5,1.2,1,1.5,1.2,1,1.5,1.8,1.2,1.5,2,2.2,1.5,1.2,1.5,1.8,2.5];let t=ac.currentTime+.5;const nodes=[];mel.forEach((ni,i)=>{const f=scale[ni],osc=ac.createOscillator(),gn=ac.createGain();osc.type='sine';osc.frequency.value=f;gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(v*.16,t+.15);gn.gain.linearRampToValueAtTime(v*.12,t+durs[i]*.75);gn.gain.linearRampToValueAtTime(0.0001,t+durs[i]*.97);osc.connect(gn);gn.connect(out);osc.start(t);osc.stop(t+durs[i]);nodes.push(osc,gn);t+=durs[i]*.8});return nodes },
    musicDur:62000 },
  custom:  { noiseName:'流水松风', musicName:'古琴·平沙落雁' }
}

function initAudio(){
  if(aC)return
  aC=new(window.AudioContext||window.webkitAudioContext)()
  masterGain=aC.createGain();masterGain.gain.value=1;masterGain.connect(aC.destination)
  const irLen=aC.sampleRate*1.5,irBuf=aC.createBuffer(2,irLen,aC.sampleRate)
  for(let ch=0;ch<2;ch++){const d=irBuf.getChannelData(ch);for(let i=0;i<irLen;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/irLen,2.5)}
  const conv=aC.createConvolver();conv.buffer=irBuf
  const revG=aC.createGain();revG.gain.value=.18;conv.connect(revG);revG.connect(masterGain)
  aC._reverb=conv;aC._reverbG=revG
}

function stopAudio(){
  ;[...noiseNodes,...musicNodes].forEach(n=>{try{n.stop?n.stop():n.disconnect()}catch(e){}})
  noiseNodes=[];musicNodes=[];clearTimeout(musicTimer)
}

function startNoise(id){
  if(!aC||!aS.n)return
  const cfg=AUDIO_CFG[id]||AUDIO_CFG.fuchun
  if(!cfg.noise)return
  const gn=aC.createGain();gn.gain.value=0;gn.connect(masterGain);noiseGain=gn
  noiseNodes=cfg.noise(aC,gn)
  gn.gain.linearRampToValueAtTime(.55,aC.currentTime+.8)
}

function startMusic(id){
  if(!aC||!aS.m)return
  const cfg=AUDIO_CFG[id]||AUDIO_CFG.fuchun
  if(!cfg.music)return
  const gn=aC.createGain();gn.gain.value=0
  if(aC._reverb)gn.connect(aC._reverb);gn.connect(masterGain);musicGain=gn
  musicNodes=cfg.music(aC,gn,1.0)
  gn.gain.linearRampToValueAtTime(.72,aC.currentTime+1)
  musicTimer=setTimeout(()=>{if(aS.m)startMusic(curSceneId)},cfg.musicDur||30000)
}

function switchSceneAudio(id){
  curSceneId=id
  if(!aC)return
  if(noiseGain)noiseGain.gain.linearRampToValueAtTime(0,aC.currentTime+.8)
  if(musicGain)musicGain.gain.linearRampToValueAtTime(0,aC.currentTime+.8)
  clearTimeout(musicTimer)
  const old=[...noiseNodes,...musicNodes];noiseNodes=[];musicNodes=[]
  setTimeout(()=>old.forEach(n=>{try{n.stop?n.stop():n.disconnect()}catch(e){}}),1000)
  setTimeout(()=>{if(aS.n)startNoise(id);if(aS.m)startMusic(id);updateAudioLabels(id)},900)
}

function updateAudioLabels(id){
  const cfg=AUDIO_CFG[id]||{}
  const an=document.getElementById('an'),am=document.getElementById('am')
  if(an)an.innerHTML=`<div class="a-dot"></div>${cfg.noiseName||'自然白噪音'}`
  if(am)am.innerHTML=`<div class="a-dot"></div>${cfg.musicName||'传统疗愈音乐'}`
}

function togAudio(k){
  initAudio();if(aC.state==='suspended')aC.resume()
  aS[k]=!aS[k]
  document.getElementById(k==='n'?'an':'am').classList.toggle('on',aS[k])
  const gn=k==='n'?noiseGain:musicGain
  if(gn){gn.gain.cancelScheduledValues(aC.currentTime);gn.gain.linearRampToValueAtTime(aS[k]?.5:0,aC.currentTime+.6)}
  if(k==='n'){if(aS.n)startNoise(curSceneId);else{if(noiseGain)noiseGain.gain.linearRampToValueAtTime(0,aC.currentTime+.6);setTimeout(()=>{noiseNodes.forEach(n=>{try{n.stop?n.stop():n.disconnect()}catch(e){}});noiseNodes=[]},700)}}
  if(k==='m'){if(aS.m)startMusic(curSceneId);else{clearTimeout(musicTimer);if(musicGain)musicGain.gain.linearRampToValueAtTime(0,aC.currentTime+.6);setTimeout(()=>{musicNodes.forEach(n=>{try{n.stop?n.stop():n.disconnect()}catch(e){}});musicNodes=[]},700)}}
  toast(k==='n'?(aS.n?`🌿 ${AUDIO_CFG[curSceneId]?.noiseName||'自然白噪音'} 已开启`:'自然白噪音 已关闭'):(aS.m?`🎵 ${AUDIO_CFG[curSceneId]?.musicName||'传统疗愈音乐'} 已开启`:'传统疗愈音乐 已关闭'))
}

function toast(msg){
  const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show')
  clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2600)
}

/* ══ SCENE FLOW ══ */
function goSel(){
  document.getElementById('hud').classList.remove('on')
  document.getElementById('sel').classList.add('on')
  const cb=document.getElementById('customBg');if(cb){cb.remove();canvas.style.display='block'}
}

function enter(id){
  const s=SCENES.find(x=>x.id===id);if(!s)return
  const ov=document.getElementById('ov');ov.classList.add('on')
  setTimeout(()=>{
    document.getElementById('hname').textContent=s.name
    document.getElementById('hadp').textContent=s.mood
    document.querySelectorAll('.sw-btn').forEach(b=>b.classList.toggle('on',b.dataset.id===id))
    canvas.style.filter=s.filter||'brightness(1.8)'
    canvas.style.display='block'
    ry=0;rx=0;vy=0;vx=0;autoRotSpeed=0.0004
    loadTex(id);switchSceneAudio(id);updateAudioLabels(id)
    document.getElementById('sel').classList.remove('on')
    document.getElementById('hud').classList.add('on')
    ov.classList.remove('on')
  },480)
}

/* ══ CUSTOM SCENE GENERATOR ══ */
const GEN_HTML = `
  <div>
    <div class="gen-label">选择灵感</div>
    <div class="gen-examples">
      <button class="gen-eg" onclick="fillEg(this)">月色下的竹林小径</button>
      <button class="gen-eg" onclick="fillEg(this)">江南烟雨中的古桥</button>
      <button class="gen-eg" onclick="fillEg(this)">云雾缭绕的山间禅寺</button>
      <button class="gen-eg" onclick="fillEg(this)">荷花池边的亭台楼阁</button>
      <button class="gen-eg" onclick="fillEg(this)">松间明月照清泉</button>
      <button class="gen-eg" onclick="fillEg(this)">秋日芦苇荡漫天红霞</button>
    </div>
  </div>
  <div>
    <div class="gen-label">描述你的疗愈场景</div>
    <textarea id="ginput" placeholder="描述你想要的疗愈画面，比如：一片宁静的梅花林，雪后初晴，远处有隐隐青山…"></textarea>
  </div>
  <div class="gen-status" id="gstatus"></div>
  <div class="gen-btns">
    <button class="gen-btn cancel" onclick="closeGen()">取 消</button>
    <button class="gen-btn" id="gbtn" onclick="generateScene()">✦ 生 成 我 的 场 景</button>
  </div>
`

function openGen(){
  document.getElementById('sel').classList.remove('on')
  document.getElementById('gen').classList.add('on')
  document.getElementById('gen-inner').innerHTML=GEN_HTML
}
function closeGen(){
  document.getElementById('gen').classList.remove('on')
  document.getElementById('sel').classList.add('on')
}
function fillEg(btn){const ta=document.getElementById('ginput');if(ta)ta.value=btn.textContent}
function setStatus(html){const el=document.getElementById('gstatus');if(el)el.innerHTML=html}

// 中文关键词映射
const KW_MAP = [
  ['竹林小径','bamboo grove path'],['竹林','bamboo grove'],['竹','bamboo'],
  ['梅花林','plum blossom forest'],['梅花','plum blossom'],['梅','plum'],
  ['松间','among pine trees'],['松树','pine tree'],['松','pine'],
  ['荷花池','lotus pond'],['荷花','lotus flower'],['荷','lotus'],
  ['芦苇荡','reed marshland'],['芦苇','reed'],['桃花','peach blossom'],
  ['远山','distant mountains'],['山间','mountain valley'],['山峰','mountain peak'],['山','mountain'],
  ['溪流','stream'],['瀑布','waterfall'],['湖泊','lake'],
  ['江南烟雨','misty rainy Jiangnan'],['江南','Jiangnan countryside'],
  ['江','river'],['湖','lake'],['溪','stream'],['河','river'],
  ['云海','sea of clouds'],['云雾缭绕','swirling mist'],['云雾','misty clouds'],['雾','mist'],['云','cloud'],
  ['烟雨','misty rain'],['秋雨','autumn rain'],['细雨','gentle rain'],['雨','rain'],
  ['雪后初晴','clear sky after snow'],['雪','snow'],
  ['明月','bright moon'],['月色','moonlight'],['月照','moonlit'],['月','moon'],['星','star'],
  ['漫天红霞','crimson sky at dusk'],['夕阳','sunset'],['日出','sunrise'],['黄昏','dusk'],['清晨','dawn'],
  ['古石桥','ancient stone bridge'],['古桥','ancient bridge'],['桥','bridge'],
  ['山间禅寺','mountain zen temple'],['禅寺','zen temple'],['寺庙','temple'],['寺','temple'],
  ['亭台楼阁','pavilions and terraces'],['亭','pavilion'],
  ['庭院','courtyard'],['书房','study room'],
  ['孤舟','lone boat'],['船','boat'],
  ['秋天','autumn'],['春天','spring'],['冬天','winter'],['夏天','summer'],
  ['秋日','autumn day'],['春日','spring day'],
  ['清泉','clear spring'],['幽静','serene'],['宁静','peaceful'],['空灵','ethereal'],['禅意','zen spirit'],
  ['小径','winding path'],['中的','with'],['边的','beside'],['下的','under'],['照','illuminating'],
]

async function generateScene(){
  const input=document.getElementById('ginput')?.value.trim()
  if(!input){setStatus('请先输入场景描述～');return}
  const btn=document.getElementById('gbtn');btn.disabled=true
  setStatus('<span class="gen-dot-ani"><span>●</span><span>●</span><span>●</span></span> AI 正在构思你的水墨世界…')

  // 本地翻译
  let desc=input
  KW_MAP.forEach(([cn,en])=>{desc=desc.replace(new RegExp(cn,'g'),en)})
  const prompt=`Chinese ink wash painting shanshui style, ${desc}, wide panoramic landscape, misty atmosphere, soft grey brushstrokes, zen minimalist, no text, no people, traditional Chinese art, healing atmosphere`

  try {
    // 调用我们自己的后端接口（无 CORS 问题！）
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    })

    setStatus('<span class="gen-dot-ani"><span>●</span><span>●</span><span>●</span></span> 正在生成水墨画面…（约30秒）')

    const data = await res.json()
    if (!res.ok || !data.url) throw new Error(data.error || '生成失败')

    // 加载图片到球面
    const imgUrl = data.url
    await new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const t = new THREE.Texture(img)
        t.wrapS = THREE.RepeatWrapping
        t.repeat.x = -1; t.offset.x = 1
        t.needsUpdate = true
        applyTex(t)
        canvas.style.filter = 'brightness(1.85) contrast(1.05)'
        canvas.style.display = 'block'
        resolve()
      }
      img.onerror = () => {
        // 如果 crossOrigin 失败，改用 img 标签全屏显示
        const old=document.getElementById('customBg');if(old)old.remove()
        const imgEl=document.createElement('img')
        imgEl.id='customBg'
        imgEl.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:1;filter:brightness(1.85);cursor:grab;'
        imgEl.onload=()=>{canvas.style.display='none';document.body.appendChild(imgEl);resolve()}
        imgEl.onerror=()=>reject(new Error('图片加载失败'))
        imgEl.src=imgUrl
      }
      img.src = imgUrl
    })

    // 进入场景
    document.getElementById('hname').textContent='✦ '+input.slice(0,12)+(input.length>12?'…':'')
    document.getElementById('hadp').textContent='专属水墨疗愈场景'
    document.querySelectorAll('.sw-btn').forEach(b=>b.classList.remove('on'))
    curSceneId='custom';ry=0;rx=0;vy=0;vx=0;autoRotSpeed=0.0004
    updateAudioLabels('fuchun');switchSceneAudio('fuchun')
    document.getElementById('gen').classList.remove('on')
    document.getElementById('hud').classList.add('on')
    setStatus('')

  } catch(err) {
    setStatus('⚠ '+(err.message||'生成失败，请重试'))
  }

  btn.disabled=false
}

/* ══ BREATH ══ */
const bStates=['缓缓吸气','屏息片刻','缓缓呼气','自然呼吸'],bDurs=[3500,1500,4500,1200]
let bI=0;(function cb(){const el=document.getElementById('bst');if(el)el.textContent=bStates[bI];bI=(bI+1)%4;setTimeout(cb,bDurs[bI])})()

/* ══ BUILD UI ══ */
const nums=['一','二','三','四','五','六']
const sgrid=document.getElementById('sgrid'),hsw=document.getElementById('hsw')
if(sgrid&&hsw){
  SCENES.forEach((s,i)=>{
    const c=document.createElement('div');c.className='s-card'
    c.innerHTML=`<div class="s-num">${nums[i]}</div><div class="s-tag">${s.tag}</div><div class="s-name">${s.name}</div><div class="s-desc">${s.desc}</div><div class="s-mood">· ${s.mood}</div><div class="s-go">进入 →</div>`
    c.onclick=()=>enter(s.id);sgrid.appendChild(c)
    const b=document.createElement('button');b.className='sw-btn'+(i===0?' on':'');b.dataset.id=s.id;b.textContent=s.name;b.onclick=()=>enter(s.id);hsw.appendChild(b)
  })
}

/* ══ BOOT ══ */
function initApp(){
  initThree()
  const bar=document.getElementById('lf');let p=0
  buildProcTex('fuchun');updateAudioLabels('fuchun')
  canvas.style.filter=SCENES[0].filter||'brightness(1.8)'
  const iv=setInterval(()=>{
    p+=12+Math.random()*18;bar.style.width=Math.min(p,95)+'%'
    if(p>=100){
      clearInterval(iv);bar.style.width='100%'
      setTimeout(()=>{
        document.getElementById('load').classList.add('out')
        setTimeout(()=>{document.getElementById('load').style.display='none';document.getElementById('sel').classList.add('on')},1400)
      },200)
    }
  },100)
}

// 等 Three.js 加载完再初始化
if(window.THREE) initApp()
else document.querySelector('script[src*="three"]')?.addEventListener('load', initApp)
