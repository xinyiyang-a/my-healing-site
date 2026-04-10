import Head from 'next/head'
import { useEffect, useRef, useState, useCallback } from 'react'

/* ─────────────────────────────────────────
   场景数据
───────────────────────────────────────── */
const SCENES = [
  { id:'fuchun',  name:'富春山居', tag:'山水水墨 · 视觉疗愈',
    desc:'远山淡墨、云雾缓流、江面平阔、轻舟无痕',
    mood:'焦虑 · 烦躁 · 压力过载',
    filter:'brightness(1.9) contrast(1.05)' },
  { id:'yunshan', name:'云山禅境', tag:'极简禅意 · 静心安神',
    desc:'孤峰耸立、云海漫涌、古松挺立、留白深远',
    mood:'精神内耗 · 失眠 · 注意力涣散',
    filter:'brightness(1.8) contrast(1.05)' },
  { id:'xishan',  name:'溪山行旅', tag:'自然疗愈 · 疲惫修复',
    desc:'浅溪、石桥、远山、雾霭、林间微光',
    mood:'情绪低落 · 紧绷 · 疲惫',
    filter:'brightness(1.8) contrast(1.05)' },
  { id:'tingyu',  name:'听雨轩窗', tag:'中式园林 · 思绪纾解',
    desc:'苏式园林、漏窗、荷塘、芭蕉、细雨轻落',
    mood:'嘈杂环境 · 抑郁 · 思绪杂乱',
    filter:'brightness(2.8) contrast(1.0) saturate(1.3)' },
  { id:'bimo',    name:'笔墨静心', tag:'书房禅意 · 专注提升',
    desc:'明式书房、文房四宝、竹影窗纱、青烟袅袅',
    mood:'浮躁 · 考前紧张 · 专注力差',
    filter:'brightness(3.2) contrast(0.95) saturate(0.8) sepia(0.2)' },
  { id:'lanting', name:'兰亭曲水', tag:'竹林胜境 · 心情舒缓',
    desc:'茂林修竹、曲水流觞、落花逐水',
    mood:'社交压力 · 心情压抑',
    filter:'brightness(1.9) contrast(1.05)' },
]
const NUMS = ['一','二','三','四','五','六']
const EXAMPLES = [
  '月色下的竹林小径','江南烟雨中的古桥',
  '云雾缭绕的山间禅寺','荷花池边的亭台楼阁',
  '松间明月照清泉','秋日芦苇荡漫天红霞',
]
const BREATH = { states:['缓缓吸气','屏息片刻','缓缓呼气','自然呼吸'], durs:[3500,1500,4500,1200] }

/* ─────────────────────────────────────────
   程序化兜底纹理
───────────────────────────────────────── */
function buildProcedural(THREE, id) {
  const W = 2048, H = 1024
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')
  let s = Array.from(id).reduce((a,ch) => a + ch.charCodeAt(0)*31, 0)|0
  const rng = () => { s = Math.imul(48271,s)|0; return (s>>>0)/2**32 }
  const lg = (x0,y0,x1,y1,stops) => {
    const gr = g.createLinearGradient(x0,y0,x1,y1)
    stops.forEach(([t,col]) => gr.addColorStop(t,col)); return gr
  }
  const ridge = (by,amp,freq,oct,col) => {
    g.fillStyle = col; g.beginPath(); g.moveTo(0,H)
    for(let x=0;x<=W;x+=4){
      let n=0,a=1,f=freq
      for(let o=0;o<oct;o++){n+=Math.sin(x*f*Math.PI*2/W+(rng()+o)*.5)*a;a*=.5;f*=2.1}
      g.lineTo(x,by+n*amp)
    }
    g.lineTo(W,H); g.closePath(); g.fill()
  }
  // 天空
  g.fillStyle = lg(0,0,0,H,[[0,'#b8ccdc'],[.4,'#ccd8e0'],[1,'#b4c4c8']])
  g.fillRect(0,0,W,H)
  // 山脉
  ;[
    ['rgba(165,185,205,',.44],['rgba(128,158,180,',.62],
    ['rgba(92,128,152,',.77],['rgba(62,98,122,',.89],['rgba(38,70,92,',.97]
  ].forEach(([c,d],i) => {
    if (i<3){ g.save(); g.filter=`blur(${(3-i)*5}px)`; ridge(H*(.72-i*.05),58+i*18,1.6+i*.5,4,c+d+')'); g.restore() }
    else ridge(H*(.72-i*.05),58+i*18,1.6+i*.5,4,c+d+')')
  })
  // 薄雾
  g.save(); g.filter='blur(18px)'
  g.fillStyle=lg(0,H*.59,0,H*.68,[[0,'rgba(255,255,255,0)'],[.5,'rgba(255,255,255,.09)'],[1,'rgba(255,255,255,0)']]);
  g.fillRect(0,H*.56,W,H*.14); g.restore()
  // 水面
  g.fillStyle=lg(0,H*.72,0,H*.88,[[0,'rgba(138,168,198,0)'],[.3,'rgba(138,168,198,.75)'],[1,'rgba(108,142,172,.88)']])
  g.fillRect(0,H*.72,W,H*.18)
  // 暗角
  const vi = g.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*.9)
  vi.addColorStop(0,'rgba(0,0,0,0)'); vi.addColorStop(1,'rgba(0,0,0,.28)')
  g.fillStyle=vi; g.fillRect(0,0,W,H)

  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = THREE.RepeatWrapping; tex.repeat.x = -1; tex.offset.x = 1; tex.needsUpdate = true
  return tex
}

/* ─────────────────────────────────────────
   主组件
───────────────────────────────────────── */
export default function Home() {
  const [page, setPage] = useState('loading') // loading|select|scene|gen
  const [loadPct, setLoadPct] = useState(0)
  const [curScene, setCurScene] = useState(SCENES[0])
  const [breathIdx, setBreathIdx] = useState(0)
  const [audioN, setAudioN] = useState(false)
  const [audioM, setAudioM] = useState(false)
  const [genInput, setGenInput] = useState('')
  const [genBusy, setGenBusy] = useState(false)
  const [genProgress, setGenProgress] = useState(0)
  const [genMsg, setGenMsg] = useState('')
  const [genError, setGenError] = useState('')
  const [toast, setToast] = useState('')

  const canvasRef   = useRef(null)
  const threeRef    = useRef(null)  // { renderer, scene, camera, mat, loadTex }
  const customBgRef = useRef(null)  // custom img element
  const audioRef    = useRef({})

  /* ── Loading bar ── */
  useEffect(() => {
    let p = 0
    const iv = setInterval(() => {
      p += 10 + Math.random()*18; setLoadPct(Math.min(p,95))
      if (p >= 100) { clearInterval(iv); setLoadPct(100); setTimeout(()=>setPage('select'),700) }
    }, 130)
    return () => clearInterval(iv)
  }, [])

  /* ── Breath cycle ── */
  useEffect(() => {
    if (page !== 'scene') return
    const cycle = (idx) => setTimeout(() => {
      const next = (idx+1)%4; setBreathIdx(next); cycle(next)
    }, BREATH.durs[idx])
    const t = cycle(0); return () => clearTimeout(t)
  }, [page])

  /* ── Three.js init (once) ── */
  useEffect(() => {
    if (threeRef.current || !canvasRef.current) return
    import('three').then(THREE => {
      if (threeRef.current) return
      const canvas = canvasRef.current
      const renderer = new THREE.WebGLRenderer({ canvas, antialias:true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio,2))
      renderer.setSize(window.innerWidth, window.innerHeight)
      renderer.toneMapping = THREE.NoToneMapping

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(80, window.innerWidth/window.innerHeight, 0.1, 1000)
      camera.position.set(0,0,0.01)

      const geo = new THREE.SphereGeometry(500,96,48); geo.scale(-1,1,1)
      const mat = new THREE.MeshBasicMaterial({ color:0x111008 })
      scene.add(new THREE.Mesh(geo, mat))

      const capMat = new THREE.MeshBasicMaterial({ color:0x0a0806 })
      const top = new THREE.Mesh(new THREE.CircleGeometry(500,64), capMat)
      top.rotation.x = -Math.PI/2; top.position.y = 90; scene.add(top)
      const bot = new THREE.Mesh(new THREE.CircleGeometry(500,64), capMat)
      bot.rotation.x = Math.PI/2; bot.position.y = -90; scene.add(bot)

      /* orbit */
      let ry=0,rx=0,vy=0,vx=0,drag=false,px=0,py=0,autoRot=0.0004
      const RS=0.003,DAMP=0.91,MRX=Math.PI*.38
      const dn = e=>{drag=true;px=e.clientX??(e.touches?.[0]?.clientX??0);py=e.clientY??(e.touches?.[0]?.clientY??0);autoRot=0}
      const up = ()=>drag=false
      const mv = e=>{
        if(!drag)return
        const cx=e.clientX??(e.touches?.[0]?.clientX??0),cy=e.clientY??(e.touches?.[0]?.clientY??0)
        vy+=(cx-px)*RS;vx+=(cy-py)*RS*.55;px=cx;py=cy
      }
      canvas.addEventListener('mousedown',dn)
      canvas.addEventListener('touchstart',dn,{passive:true})
      window.addEventListener('mouseup',up)
      window.addEventListener('touchend',up)
      window.addEventListener('mousemove',mv)
      window.addEventListener('touchmove',mv,{passive:true})
      canvas.addEventListener('wheel',e=>{camera.fov=Math.max(40,Math.min(100,camera.fov+e.deltaY*.04));camera.updateProjectionMatrix()},{passive:true})
      window.addEventListener('resize',()=>{camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight)})

      /* texture */
      const loader = new THREE.TextureLoader()
      const texCache = {}
      const applyTex = (tex, filter) => { mat.map=tex; mat.needsUpdate=true; if(canvas)canvas.style.filter=filter||'' }
      const loadTex = (id, filter) => {
        if (texCache[id]) { applyTex(texCache[id], filter); return }
        loader.load(`/${id}.jpg`,
          tex => { tex.wrapS=THREE.RepeatWrapping;tex.repeat.x=-1;tex.offset.x=1;tex.needsUpdate=true;texCache[id]=tex;applyTex(tex,filter) },
          undefined,
          () => { const tex=buildProcedural(THREE,id);texCache[id]=tex;applyTex(tex,filter) }
        )
      }

      /* apply url texture (for custom AI scene) */
      const applyUrlTex = (url, filter) => {
        const img = new Image(); img.crossOrigin='anonymous'
        img.onload = () => { const tex=new THREE.Texture(img);tex.wrapS=THREE.RepeatWrapping;tex.repeat.x=-1;tex.offset.x=1;tex.needsUpdate=true;applyTex(tex,filter) }
        img.src = url
      }

      /* render loop */
      const animate = () => {
        requestAnimationFrame(animate)
        vy*=DAMP;vx*=DAMP;ry+=vy+autoRot;rx+=vx
        rx=Math.max(-MRX,Math.min(MRX,rx))
        const qY=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),ry)
        const qX=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),rx)
        camera.quaternion.copy(qY).multiply(qX)
        renderer.render(scene,camera)
      }
      animate()

      threeRef.current = { loadTex, applyUrlTex, mat }
      loadTex(SCENES[0].id, SCENES[0].filter)
    })
  }, [])

  /* ── Audio ── */
  const showToast = useCallback((msg) => {
    setToast(msg); setTimeout(()=>setToast(''),2600)
  }, [])

  useEffect(() => {
    const a = audioRef.current
    if (!a.ctx) {
      try {
        a.ctx = new (window.AudioContext||window.webkitAudioContext)()
        a.master = a.ctx.createGain(); a.master.connect(a.ctx.destination)
        a.noiseGain = a.ctx.createGain(); a.noiseGain.gain.value=0; a.noiseGain.connect(a.master)
        a.musicGain = a.ctx.createGain(); a.musicGain.gain.value=0; a.musicGain.connect(a.master)
        // noise buffer
        const len=a.ctx.sampleRate*4, buf=a.ctx.createBuffer(1,len,a.ctx.sampleRate)
        const d=buf.getChannelData(0); let v=0
        for(let i=0;i<len;i++){v=v*.94+(Math.random()-.5)*.2;d[i]=v}
        const lp=a.ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=500
        const ns=a.ctx.createBufferSource();ns.buffer=buf;ns.loop=true
        ns.connect(lp);lp.connect(a.noiseGain);ns.start()
        a.noiseNode = ns
      } catch(e){}
    }
  }, [page])

  const togNoise = () => {
    const a = audioRef.current; if(!a.ctx) return
    if(a.ctx.state==='suspended') a.ctx.resume()
    const on = !audioN; setAudioN(on)
    a.noiseGain.gain.linearRampToValueAtTime(on?.45:0, a.ctx.currentTime+.7)
    showToast(on?'🌿 自然白噪音 已开启':'自然白噪音 已关闭')
  }

  const togMusic = () => {
    const a = audioRef.current; if(!a.ctx) return
    if(a.ctx.state==='suspended') a.ctx.resume()
    const on = !audioM; setAudioM(on)
    if (on) {
      const scale=[261.63,293.66,329.63,392,440,523.25,587.33,659.25]
      const pat=[0,2,4,5,2,4,1,3,5,4,2,0,4,3,1,2]; const dur=2.2
      let t=a.ctx.currentTime+.1
      pat.forEach((ni,i)=>{
        const osc=a.ctx.createOscillator();osc.type='triangle';osc.frequency.value=scale[ni]
        const g=a.ctx.createGain();g.gain.setValueAtTime(0,t+i*dur);g.gain.linearRampToValueAtTime(.16,t+i*dur+.08);g.gain.linearRampToValueAtTime(.1,t+i*dur+dur*.75);g.gain.linearRampToValueAtTime(0,t+i*dur+dur*.97)
        osc.connect(g);g.connect(a.musicGain);osc.start(t+i*dur);osc.stop(t+i*dur+dur)
      })
      a.musicGain.gain.linearRampToValueAtTime(.6, a.ctx.currentTime+.7)
    } else {
      a.musicGain.gain.linearRampToValueAtTime(0, a.ctx.currentTime+.7)
    }
    showToast(on?'🎵 传统疗愈音乐 已开启':'传统疗愈音乐 已关闭')
  }

  /* ── Enter preset scene ── */
  const enterScene = (s) => {
    // 移除自定义背景
    if (customBgRef.current) { customBgRef.current.remove(); customBgRef.current=null }
    if (canvasRef.current) canvasRef.current.style.display='block'
    setCurScene(s); setPage('scene')
    if (threeRef.current) threeRef.current.loadTex(s.id, s.filter)
  }

  const goSelect = () => {
    if (customBgRef.current) { customBgRef.current.remove(); customBgRef.current=null }
    if (canvasRef.current) canvasRef.current.style.display='block'
    setPage('select')
  }

  /* ── AI 生成 ── */
  const handleGenerate = async () => {
    if (!genInput.trim() || genBusy) return
    setGenBusy(true); setGenError(''); setGenProgress(5); setGenMsg('正在构思画面…')

    const progIv = setInterval(()=>setGenProgress(p=>Math.min(p+2,85)), 1800)

    try {
      setGenMsg('AI 正在绘制水墨场景…（约30–60秒）')
      const resp = await fetch('/api/generate', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ description: genInput })
      })
      const data = await resp.json()
      clearInterval(progIv)

      if (!resp.ok || !data.url) {
        setGenError(data.error || '生成失败，请重试'); setGenBusy(false); setGenProgress(0); return
      }

      setGenProgress(92); setGenMsg('画面已生成，正在进入场景…')

      // 用 Three.js 贴到球面（后端图片无 CORS 问题）
      if (threeRef.current) {
        threeRef.current.applyUrlTex(data.url, 'brightness(1.85) contrast(1.05)')
      }
      if (customBgRef.current) { customBgRef.current.remove(); customBgRef.current=null }
      if (canvasRef.current) canvasRef.current.style.display='block'

      setCurScene({ id:'custom', name:'✦ 我的水墨世界', mood:'专属疗愈场景', filter:'' })
      setTimeout(() => {
        setGenProgress(100)
        setPage('scene')
        setGenBusy(false); setGenInput(''); setGenProgress(0); setGenMsg('')
      }, 800)

    } catch(err) {
      clearInterval(progIv)
      setGenError('网络错误，请重试'); setGenBusy(false); setGenProgress(0)
    }
  }

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <>
      <Head>
        <title>疗愈空间 · 360°</title>
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/>
        <link href="https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=ZCOOL+XiaoWei&family=Noto+Serif+SC:wght@300;400&display=swap" rel="stylesheet"/>
      </Head>

      <style jsx global>{`
        :root{--gold:#c4955a;--paper:#f0e8d8;--tf:'ZCOOL XiaoWei',serif;--tb:'Noto Serif SC',serif;--tm:'Ma Shan Zheng',cursive}
        .load{position:fixed;inset:0;z-index:300;background:#0a0806;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.8rem;transition:opacity 1s}
        .load.hide{opacity:0;pointer-events:none}
        .l-seal{width:68px;height:68px;border:1.5px solid #8b2020;display:flex;align-items:center;justify-content:center;font-family:var(--tm);font-size:1rem;color:#8b2020;text-align:center;line-height:1.5;animation:sp 2.2s ease-in-out infinite}
        @keyframes sp{0%,100%{opacity:.4;transform:scale(.94)}50%{opacity:1;transform:scale(1)}}
        .l-bar{width:140px;height:1px;background:rgba(196,149,90,.14)}
        .l-fill{height:1px;background:var(--gold);transition:width .3s ease}
        .l-txt{font-family:var(--tb);font-size:.62rem;letter-spacing:.6em;color:rgba(240,232,216,.28);animation:tf 2s ease-in-out infinite}
        @keyframes tf{0%,100%{opacity:.2}50%{opacity:.6}}

        .sel{position:fixed;inset:0;z-index:200;background:rgba(8,6,4,.96);backdrop-filter:blur(22px);display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .7s;padding:1.2rem 1rem}
        .sel.on{opacity:1;pointer-events:all}
        .sel-ttl{font-family:var(--tf);font-size:clamp(1.8rem,4vw,3rem);color:var(--paper);letter-spacing:.22em;text-align:center}
        .sel-sub{font-size:.62rem;letter-spacing:.5em;color:var(--gold);opacity:.52;margin:.6rem 0 2rem;text-align:center}
        .s-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;width:min(860px,94vw);border:.5px solid rgba(196,149,90,.1)}
        .s-card{position:relative;cursor:pointer;padding:1.5rem 1.3rem 1.3rem;background:rgba(20,14,6,.8);border:.5px solid rgba(196,149,90,.07);transition:all .28s}
        .s-card:hover{background:rgba(38,24,10,.9);border-color:rgba(196,149,90,.22)}
        .s-card:hover .s-go{color:rgba(240,232,216,.7);transform:translateX(3px)}
        .s-num{font-family:var(--tm);font-size:2.2rem;color:rgba(196,149,90,.07);position:absolute;top:.5rem;right:.9rem;line-height:1;transition:color .3s}
        .s-card:hover .s-num{color:rgba(196,149,90,.4)}
        .s-tag{font-size:.56rem;letter-spacing:.35em;color:var(--gold);opacity:.5;margin-bottom:.6rem}
        .s-name{font-family:var(--tf);font-size:1.15rem;color:var(--paper);letter-spacing:.15em;margin-bottom:.35rem}
        .s-desc{font-size:.63rem;color:rgba(240,232,216,.34);letter-spacing:.08em;line-height:1.65}
        .s-mood{margin-top:.75rem;padding-top:.65rem;border-top:.5px solid rgba(196,149,90,.1);font-size:.57rem;color:rgba(196,149,90,.42);letter-spacing:.18em}
        .s-go{position:absolute;bottom:1rem;right:1.1rem;font-size:.6rem;color:rgba(240,232,216,.16);letter-spacing:.3em;transition:all .28s}
        .gen-entry{margin-top:1.4rem;padding:1.2rem 1.6rem;background:rgba(196,149,90,.06);border:.5px solid rgba(196,149,90,.2);cursor:pointer;transition:all .3s;display:flex;align-items:center;gap:1.2rem;width:min(860px,94vw)}
        .gen-entry:hover{background:rgba(196,149,90,.12);border-color:rgba(196,149,90,.38)}
        .ge-icon{font-family:var(--tm);font-size:1.8rem;color:rgba(196,149,90,.6);flex-shrink:0}
        .ge-t1{font-family:var(--tf);font-size:1rem;color:rgba(240,232,216,.75);letter-spacing:.18em}
        .ge-t2{font-size:.6rem;color:rgba(196,149,90,.45);letter-spacing:.28em;margin-top:.3rem}

        .hud{position:fixed;inset:0;z-index:100;pointer-events:none;opacity:0;transition:opacity 1s}
        .hud.on{opacity:1}
        .h-top{position:absolute;top:0;left:0;right:0;padding:1.4rem 2rem;display:flex;align-items:center;justify-content:space-between;background:linear-gradient(180deg,rgba(0,0,0,.55) 0%,transparent 100%);pointer-events:all}
        .h-back{display:flex;align-items:center;gap:.5rem;font-family:var(--tb);font-size:.68rem;letter-spacing:.32em;color:rgba(240,232,216,.5);cursor:pointer;background:none;border:none;transition:color .2s}
        .h-back:hover{color:rgba(240,232,216,.9)}
        .h-name{font-family:var(--tf);font-size:.95rem;color:rgba(240,232,216,.62);letter-spacing:.3em}
        .h-hint{font-size:.58rem;letter-spacing:.3em;color:rgba(240,232,216,.22)}
        .h-breath{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:12px;pointer-events:none}
        .b-r1{animation:br1 7s ease-in-out infinite;transform-origin:center}
        .b-r2{animation:br2 7s ease-in-out infinite;transform-origin:center}
        .b-r3{animation:br3 7s ease-in-out infinite;transform-origin:center}
        @keyframes br1{0%,100%{transform:scale(1);opacity:.1}50%{transform:scale(1.2);opacity:.2}}
        @keyframes br2{0%,100%{transform:scale(1);opacity:.15}50%{transform:scale(1.26);opacity:.28}}
        @keyframes br3{0%,100%{transform:scale(1);opacity:.2}50%{transform:scale(1.32);opacity:.4}}
        .b-label{font-family:var(--tm);font-size:.72rem;color:rgba(240,232,216,.26);letter-spacing:.4em;animation:bfa 7s ease-in-out infinite}
        .b-state{font-size:.52rem;letter-spacing:.45em;color:rgba(196,149,90,.36);animation:bfa 7s 1.5s ease-in-out infinite}
        @keyframes bfa{0%,100%{opacity:.16}50%{opacity:.46}}
        .h-bot{position:absolute;bottom:0;left:0;right:0;padding:1.5rem 2rem 2rem;background:linear-gradient(0deg,rgba(0,0,0,.62) 0%,transparent 100%);pointer-events:all;display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;flex-wrap:wrap}
        .h-audio{display:flex;gap:.65rem}
        .a-btn{display:flex;align-items:center;gap:.42rem;padding:.38rem .88rem;cursor:pointer;border:.5px solid rgba(240,232,216,.15);background:rgba(240,232,216,.04);color:rgba(240,232,216,.38);font-family:var(--tb);font-size:.63rem;letter-spacing:.18em;transition:all .22s;border-radius:1px}
        .a-btn:hover{background:rgba(240,232,216,.09);color:rgba(240,232,216,.72)}
        .a-btn.on{border-color:rgba(196,149,90,.5);background:rgba(196,149,90,.13);color:rgba(240,232,216,.9)}
        .a-dot{width:5px;height:5px;border-radius:50%;background:currentColor;flex-shrink:0}
        .a-btn.on .a-dot{animation:dp 1.8s ease-in-out infinite}
        @keyframes dp{0%,100%{opacity:1}50%{opacity:.2}}
        .h-sw{display:flex;gap:.45rem;flex-wrap:wrap;justify-content:center}
        .sw-b{padding:.28rem .68rem;font-family:var(--tb);font-size:.6rem;letter-spacing:.18em;border:.5px solid rgba(240,232,216,.13);background:transparent;color:rgba(240,232,216,.3);cursor:pointer;transition:all .2s;border-radius:1px}
        .sw-b:hover{border-color:rgba(240,232,216,.38);color:rgba(240,232,216,.65)}
        .sw-b.on{border-color:rgba(196,149,90,.52);color:rgba(240,232,216,.9);background:rgba(196,149,90,.13)}
        .h-info{text-align:right}
        .h-il{font-size:.54rem;letter-spacing:.38em;color:rgba(240,232,216,.2)}
        .h-iv{font-size:.68rem;color:rgba(196,149,90,.65);letter-spacing:.14em;margin-top:2px}

        .gen-panel{position:fixed;inset:0;z-index:250;background:rgba(8,6,4,.96);backdrop-filter:blur(22px);display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .7s;padding:1.5rem 1rem}
        .gen-panel.on{opacity:1;pointer-events:all}
        .gen-ttl{font-family:var(--tf);font-size:clamp(1.6rem,3.5vw,2.5rem);color:var(--paper);letter-spacing:.2em;text-align:center;margin-bottom:.6rem}
        .gen-sub{font-size:.62rem;letter-spacing:.45em;color:rgba(196,149,90,.5);text-align:center;margin-bottom:1.8rem}
        .gen-box{width:min(580px,92vw);background:rgba(18,12,5,.8);border:.5px solid rgba(196,149,90,.18);padding:1.8rem;display:flex;flex-direction:column;gap:1.1rem}
        .gen-label{font-size:.6rem;letter-spacing:.38em;color:rgba(196,149,90,.55)}
        .gen-egs{display:flex;gap:.45rem;flex-wrap:wrap}
        .gen-eg{padding:.28rem .7rem;font-size:.6rem;letter-spacing:.15em;border:.5px solid rgba(196,149,90,.2);color:rgba(240,232,216,.4);cursor:pointer;border-radius:1px;transition:all .2s;background:transparent;font-family:var(--tb)}
        .gen-eg:hover{border-color:rgba(196,149,90,.5);color:rgba(240,232,216,.75);background:rgba(196,149,90,.08)}
        .gen-ta{width:100%;height:88px;padding:.85rem 1rem;background:rgba(10,7,3,.6);border:.5px solid rgba(196,149,90,.2);color:var(--paper);font-family:var(--tb);font-size:.85rem;line-height:1.7;resize:none;outline:none;transition:border-color .2s}
        .gen-ta:focus{border-color:rgba(196,149,90,.5)}
        .gen-ta::placeholder{color:rgba(240,232,216,.22);font-size:.75rem}
        .gen-prog-bar{height:1px;background:rgba(196,149,90,.15);margin-bottom:.5rem}
        .gen-prog-fill{height:1px;background:var(--gold);transition:width .5s ease}
        .gen-msg{font-size:.62rem;letter-spacing:.25em;color:rgba(196,149,90,.55);text-align:center}
        .gen-err{font-size:.62rem;letter-spacing:.2em;color:rgba(220,80,80,.75);text-align:center}
        .gen-btns{display:flex;gap:.7rem}
        .gen-cancel{flex:0 0 auto;padding:.72rem 1.1rem;background:transparent;border:.5px solid rgba(240,232,216,.14);color:rgba(240,232,216,.35);font-family:var(--tb);font-size:.65rem;letter-spacing:.2em;cursor:pointer}
        .gen-go{flex:1;padding:.72rem;background:rgba(196,149,90,.18);border:.5px solid rgba(196,149,90,.35);color:rgba(240,232,216,.88);font-family:var(--tf);font-size:.95rem;letter-spacing:.28em;cursor:pointer;transition:all .22s}
        .gen-go:hover:not(:disabled){background:rgba(196,149,90,.3);color:var(--paper)}
        .gen-go:disabled{opacity:.4;cursor:not-allowed}

        .toast{position:fixed;bottom:5.5rem;left:50%;transform:translateX(-50%);z-index:500;padding:.5rem 1.2rem;background:rgba(24,16,6,.9);border:.5px solid rgba(196,149,90,.32);color:rgba(240,232,216,.72);font-family:var(--tb);font-size:.68rem;letter-spacing:.2em;border-radius:2px;opacity:0;transition:opacity .4s;pointer-events:none;white-space:nowrap}
        .toast.show{opacity:1}
      `}</style>

      {/* Canvas */}
      <canvas ref={canvasRef} style={{position:'fixed',inset:0,width:'100%',height:'100%',display:'block'}}/>

      {/* Loading */}
      <div className={`load ${page!=='loading'?'hide':''}`}>
        <div className="l-seal">静<br/>心</div>
        <div className="l-bar"><div className="l-fill" style={{width:loadPct+'%'}}/></div>
        <div className="l-txt">正在展开山河</div>
      </div>

      {/* Scene Select */}
      <div className={`sel ${page==='select'?'on':''}`}>
        <p className="sel-ttl">进入疗愈场景吧</p>
        <p className="sel-sub">六境 · 360° 沉浸 · 归于当下</p>
        <div className="s-grid">
          {SCENES.map((s,i)=>(
            <div key={s.id} className="s-card" onClick={()=>enterScene(s)}>
              <div className="s-num">{NUMS[i]}</div>
              <div className="s-tag">{s.tag}</div>
              <div className="s-name">{s.name}</div>
              <div className="s-desc">{s.desc}</div>
              <div className="s-mood">· {s.mood}</div>
              <div className="s-go">进入 →</div>
            </div>
          ))}
        </div>
        <div className="gen-entry" onClick={()=>setPage('gen')}>
          <div className="ge-icon">✦</div>
          <div>
            <div className="ge-t1">创造我的专属场景</div>
            <div className="ge-t2">输入描述 · AI 生成水墨全景 · 沉浸其中</div>
          </div>
        </div>
      </div>

      {/* HUD */}
      <div className={`hud ${page==='scene'?'on':''}`}>
        <div className="h-top">
          <button className="h-back" onClick={goSelect}>← 返 回</button>
          <div className="h-name">{curScene.name}</div>
          <div className="h-hint">拖 拽 · 环 视 四 方</div>
        </div>
        <div className="h-breath">
          <svg overflow="visible" width="128" height="128" viewBox="-64 -64 128 128">
            <circle className="b-r1" r="54" fill="none" stroke="rgba(240,232,216,.09)" strokeWidth=".5"/>
            <circle className="b-r2" r="40" fill="none" stroke="rgba(240,232,216,.14)" strokeWidth=".5"/>
            <circle className="b-r3" r="26" fill="rgba(240,232,216,.04)" stroke="rgba(240,232,216,.28)" strokeWidth=".5"/>
          </svg>
          <div className="b-label">呼 · 吸</div>
          <div className="b-state">{BREATH.states[breathIdx]}</div>
        </div>
        <div className="h-bot">
          <div className="h-audio">
            <div className={`a-btn ${audioN?'on':''}`} onClick={togNoise}>
              <div className="a-dot"/>自然白噪音
            </div>
            <div className={`a-btn ${audioM?'on':''}`} onClick={togMusic}>
              <div className="a-dot"/>传统疗愈音乐
            </div>
          </div>
          <div className="h-sw">
            {SCENES.map(s=>(
              <button key={s.id} className={`sw-b ${curScene.id===s.id?'on':''}`}
                onClick={()=>enterScene(s)}>{s.name}</button>
            ))}
          </div>
          <div className="h-info">
            <div className="h-il">适 配 症 状</div>
            <div className="h-iv">{curScene.mood}</div>
          </div>
        </div>
      </div>

      {/* AI 生成器 */}
      <div className={`gen-panel ${page==='gen'?'on':''}`}>
        <p className="gen-ttl">创造你的水墨世界</p>
        <p className="gen-sub">用文字描绘心中的疗愈画面 · AI 为你生成专属场景</p>
        <div className="gen-box">
          <div>
            <div className="gen-label" style={{marginBottom:'.5rem'}}>选择灵感</div>
            <div className="gen-egs">
              {EXAMPLES.map(eg=>(
                <button key={eg} className="gen-eg" onClick={()=>setGenInput(eg)}>{eg}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="gen-label" style={{marginBottom:'.5rem'}}>描述你的场景</div>
            <textarea className="gen-ta"
              placeholder="描述你想要的疗愈画面，比如：雪后初晴的梅花林，远处青山隐隐…"
              value={genInput}
              onChange={e=>setGenInput(e.target.value)}
              disabled={genBusy}
            />
          </div>
          {genBusy && (
            <div>
              <div className="gen-prog-bar"><div className="gen-prog-fill" style={{width:genProgress+'%'}}/></div>
              <div className="gen-msg">{genMsg}</div>
            </div>
          )}
          {genError && <div className="gen-err">⚠ {genError}</div>}
          <div className="gen-btns">
            <button className="gen-cancel"
              onClick={()=>{setPage('select');setGenBusy(false);setGenInput('');setGenError('');setGenProgress(0)}}>
              取 消
            </button>
            <button className="gen-go"
              disabled={genBusy||!genInput.trim()}
              onClick={handleGenerate}>
              {genBusy?'AI 生成中…':'✦ 生 成 我 的 场 景'}
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      <div className={`toast ${toast?'show':''}`}>{toast}</div>
    </>
  )
}
