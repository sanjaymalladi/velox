import path from 'path'
import fs from 'fs-extra'
import http from 'http'
import chalk from 'chalk'
import ora from 'ora'
import { loadVideoConfig } from '../utils/loadVideo'
import { resolveSize, getTotalFrames } from '@velox-video/core'
import type { VeloxVideoConfig } from '@velox-video/core'

export async function previewCommand(inputFile: string) {
  const spinner = ora()

  try {
    const absInput = path.resolve(inputFile)
    if (!await fs.pathExists(absInput)) throw new Error(`File not found: ${absInput}`)

    // 1. Initial load
    spinner.start(chalk.cyan('Loading video config...'))
    let config = await loadVideoConfig(absInput)
    spinner.succeed(chalk.green(`Loaded: ${path.basename(absInput)}`))

    // 2. Start HTTP server serving the studio
    const { WebSocketServer } = require('ws')
    const studioDir = path.join(__dirname, '../studio')
    const studioHtml = await fs.readFile(path.join(studioDir, 'index.html'), 'utf8')

    const clients = new Set<any>()

    const server = http.createServer(async (req, res) => {
      const url = req.url ?? '/'

      // Serve engine JS (the browser-compatible drawFrame)
      if (url === '/velox-engine.js') {
        res.setHeader('Content-Type', 'application/javascript')
        res.end(getBrowserEngine(config))
        return
      }

      // Serve Studio HTML injected with velox-engine
      res.setHeader('Content-Type', 'text/html')
      const withEngine = studioHtml.replace(
        '</body>',
        `<script src="/velox-engine.js"></script></body>`
      )
      res.end(withEngine)
    })

    // 3. WebSocket for HMR + export
    const wss = new WebSocketServer({ server })

    wss.on('connection', (ws: import('ws').WebSocket) => {
      clients.add(ws)
      // Send current config on connect
      ws.send(JSON.stringify({ type: 'config', config: serializableConfig(config) }))

      ws.on('message', async (data: Buffer) => {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'export') {
          handleExport(config, msg.format, ws)
        }
      })

      ws.on('close', () => clients.delete(ws))
    })

    // 4. File watcher for HMR
    const chokidar = await import('chokidar')
    const watcher = chokidar.watch(absInput, { ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 300 } })

    watcher.on('change', async () => {
      try {
        const newConfig = await loadVideoConfig(absInput)
        config = newConfig
        const payload = JSON.stringify({ type: 'config', config: serializableConfig(newConfig) })
        clients.forEach(c => { if (c.readyState === 1) c.send(payload) })
        console.log(chalk.green(`\n  Hot reload: ${path.basename(absInput)}`))
      } catch (e: any) {
        console.error(chalk.red(`\n  HMR error: ${e.message}`))
      }
    })

    // 5. Start and open browser
    const PORT = 3333
    server.listen(PORT, async () => {
      console.log(chalk.cyan('\n  ⚡ Velox Studio\n'))
      console.log(chalk.white(`  ➜  ${chalk.bold(`http://localhost:${PORT}`)}`))
      console.log(chalk.gray(`  ➜  Watching: ${path.basename(absInput)}`))
      console.log(chalk.gray(`\n  Shortcuts: [Space] Play  [←→] Seek  [E] Export  [Ctrl+C] Stop\n`))

      // Open browser
      const { default: open } = await import('open')
      await open(`http://localhost:${PORT}`)
    })

    // Hold process alive
    await new Promise<void>((resolve) => {
      process.on('SIGINT', () => {
        server.close()
        watcher.close()
        resolve()
      })
    })

  } catch (err: unknown) {
    spinner.fail(chalk.red('Preview failed'))
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(message))
    process.exit(1)
  }
}

// ── Export handler (runs render in background, streams progress) ───────────

async function handleExport(config: VeloxVideoConfig, format: string, ws: any): Promise<void> {
  const { nativeRender } = await import('../render/nativeRender.js')
  const [w, h] = resolveSize(config.size)
  const outPath = path.join(process.cwd(), `output.${format === 'gif' ? 'gif' : 'mp4'}`)

  try {
    await nativeRender(config, {
      outputPath: outPath,
      format: format as any,
      onProgress: (progress: number, frame: number, total: number) => {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({ type: 'export-progress', progress, frame, total }))
        }
      }
    })
    ws.send(JSON.stringify({ type: 'export-done', path: outPath }))
    console.log(chalk.green(`\n  ✨ Exported: ${outPath}`))
  } catch (e: any) {
    console.error(chalk.red(`  Export failed: ${e.message}`))
  }
}

// ── Config serializer ─────────────────────────────────────────────────────

function serializableConfig(config: VeloxVideoConfig): any {
  return JSON.parse(JSON.stringify(config))
}

// ── Browser engine bundle (inlined, no bundler required) ──────────────────

function getBrowserEngine(config: VeloxVideoConfig): string {
  // We inline a minimal browser-compatible version of drawFrame
  // The full engine is in velox-core — here we emit the serialized config
  // and initialise the canvas drawing using the same logic re-implemented with no imports.
  // For a production setup we'd ship a pre-bundled ESM. For now we piggyback on the
  // serialized config + bundle the drawFrame logic inline via Function().
  return `
// ── Velox Browser Engine ──────────────────────────────────────────
(function() {
  const config = ${JSON.stringify(serializableConfig(config))};

  // ── Easing ──────────────────────────────────────────────────────
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }
  function springValue(t, s=170, d=26) {
    if (t <= 0) return 0; if (t >= 1) return 1;
    const dt = 1/600; let pos = 0, vel = 0;
    const steps = Math.round(t / dt);
    for (let i = 0; i < steps; i++) {
      vel += ((-s*(pos-1)) + (-d*vel)) * dt;
      pos += vel * dt;
    }
    return Math.min(Math.max(pos, 0), 1.5);
  }
  function lerp(a,b,t) { return a+(b-a)*t; }
  function clamp(v,mn=0,mx=1) { return Math.max(mn,Math.min(mx,v)); }

  // ── Animation state ──────────────────────────────────────────────
  function getState(el, localFrame, fps) {
    let s = { opacity: el.opacity??1, x:0, y:0, scaleX:1, scaleY:1, rotation:0, blur:0, clipReveal:1 };
    const { entrance, exit, loop } = el;
    if (entrance) {
      const delay = Math.round((entrance.options?.delay??0)*fps);
      const dur = Math.round(entrance.duration*fps);
      if (localFrame < delay) return {...s, opacity:0};
      const raw = clamp((localFrame-delay)/dur);
      if (raw < 1) {
        const p = easeOut(raw);
        switch(entrance.animation) {
          case 'fadeIn': s={...s,opacity:p}; break;
          case 'slideUp': s={...s,opacity:clamp(p*2),y:lerp(60,0,p)}; break;
          case 'slideDown': s={...s,opacity:clamp(p*2),y:lerp(-60,0,p)}; break;
          case 'slideLeft': s={...s,opacity:clamp(p*2),x:lerp(80,0,p)}; break;
          case 'slideRight': s={...s,opacity:clamp(p*2),x:lerp(-80,0,p)}; break;
          case 'zoomIn': s={...s,opacity:p,scaleX:lerp(0.4,1,p),scaleY:lerp(0.4,1,p)}; break;
          case 'spring': { const sp=springValue(raw); s={...s,opacity:clamp(p*3),y:lerp(50,0,sp),scaleY:lerp(0.85,1,sp)}; break; }
          case 'bounceIn': { const sp=springValue(raw,300,18); s={...s,opacity:clamp(p*3),scaleX:lerp(0.3,1,sp),scaleY:lerp(0.3,1,sp)}; break; }
          case 'expandX': s={...s,scaleX:p,opacity:clamp(p*3)}; break;
          case 'growUp': s={...s,scaleY:p,opacity:clamp(p*3)}; break;
          case 'typewriter': case 'revealLeft': s={...s,clipReveal:p}; break;
          default: s={...s,opacity:p};
        }
      }
    }
    if (exit) {
      const es = Math.round((exit.options?.at??0)*fps);
      const ed = Math.round(exit.duration*fps);
      const raw = clamp((localFrame-es)/ed);
      if (raw > 0) {
        const p = easeOut(raw), ip=1-p;
        switch(exit.animation) {
          case 'fadeOut': s={...s,opacity:ip}; break;
          case 'slideUpOut': s={...s,opacity:clamp(ip*2),y:lerp(0,-60,p)}; break;
          case 'slideDownOut': s={...s,opacity:clamp(ip*2),y:lerp(0,60,p)}; break;
          case 'zoomOut': s={...s,opacity:ip,scaleX:lerp(1,0.3,p),scaleY:lerp(1,0.3,p)}; break;
          default: s={...s,opacity:ip};
        }
      }
    }
    if (loop) {
      const dur = (loop.options?.duration??2)*fps;
      const t = (localFrame%dur)/dur;
      const sin = Math.sin(t*Math.PI*2);
      switch(loop.animation) {
        case 'pulse': s={...s,scaleX:1+sin*0.05,scaleY:1+sin*0.05}; break;
        case 'float': s={...s,y:s.y+sin*10}; break;
        case 'rotate': s={...s,rotation:t*360}; break;
        case 'shimmer': s={...s,opacity:0.7+Math.abs(sin)*0.3}; break;
      }
    }
    return s;
  }

  // ── Gradient helper ──────────────────────────────────────────────
  function makeGrad(ctx, g, x, y, w, h) {
    const a = parseFloat(g.angle)*Math.PI/180, len=Math.sqrt(w*w+h*h);
    const cx=x+w/2, cy=y+h/2;
    const gr = ctx.createLinearGradient(cx-Math.cos(a)*len/2,cy-Math.sin(a)*len/2,cx+Math.cos(a)*len/2,cy+Math.sin(a)*len/2);
    g.stops.forEach((s,i)=>gr.addColorStop(i/(g.stops.length-1),s));
    return gr;
  }

  // ── Rounded rect ─────────────────────────────────────────────────
  function rrect(ctx, x, y, w, h, r=0) {
    if (!r) { ctx.rect(x,y,w,h); return; }
    r=Math.min(r,w/2,h/2);
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
    ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
    ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
    ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
  }

  // ── Position resolver ────────────────────────────────────────────
  function resolvePos(pos, W, H) {
    if (!pos) return {x:W/2,y:H/2};
    if (pos.type==='absolute') return {x:pos.x,y:pos.y};
    if (pos.type==='center') return {x:W/2+(pos.offsetX??0),y:H/2+(pos.offsetY??0)};
    const ox=pos.offsetX??0, oy=pos.offsetY??0;
    switch(pos.name) {
      case 'topLeft': return {x:80+ox,y:80+oy};
      case 'topRight': return {x:W-80+ox,y:80+oy};
      case 'bottomLeft': return {x:80+ox,y:H-80+oy};
      case 'bottomRight': return {x:W-80+ox,y:H-80+oy};
      case 'topCenter': return {x:W/2+ox,y:80+oy};
      case 'bottomCenter': return {x:W/2+ox,y:H-80+oy};
      default: return {x:W/2+ox,y:H/2+oy};
    }
  }

  // ── Draw background ──────────────────────────────────────────────
  function drawBg(ctx, bg, W, H) {
    if (!bg) { ctx.fillStyle='#000'; }
    else if (typeof bg==='string') { ctx.fillStyle=bg; }
    else { ctx.fillStyle=makeGrad(ctx,bg,0,0,W,H); }
    ctx.fillRect(0,0,W,H);
  }

  // ── Draw element ─────────────────────────────────────────────────
  function drawEl(ctx, el, localFrame, fps, W, H) {
    const st = getState(el, localFrame, fps);
    if (st.opacity <= 0) return;
    const {x,y} = resolvePos(el.position, W, H);

    ctx.save();
    ctx.globalAlpha = clamp(st.opacity);
    if (st.blur>0) ctx.filter='blur('+st.blur+'px)';
    ctx.translate(x+st.x, y+st.y);
    if (st.scaleX!==1||st.scaleY!==1) ctx.scale(st.scaleX,st.scaleY);
    if (st.rotation!==0) ctx.rotate(st.rotation*Math.PI/180);

    if (el.type==='text') {
      const { content='', fontSize=48, fontWeight=400, fontFamily='Inter', color='#fff', gradient, letterSpacing=0, textTransform='none', textAlign='center' } = el;
      let txt = textTransform==='uppercase'?content.toUpperCase():textTransform==='lowercase'?content.toLowerCase():content;
      ctx.font = fontWeight+' '+fontSize+'px "'+fontFamily+'"';
      ctx.textAlign = textAlign;
      ctx.textBaseline = 'middle';
      const lines = txt.split('\\n');
      const lh = fontSize * (el.lineHeight??1.25);
      lines.forEach((line,li) => {
        const ly = (li-(lines.length-1)/2)*lh;
        if (st.clipReveal<1) {
          const mw = ctx.measureText(line).width;
          ctx.save(); ctx.beginPath(); ctx.rect(-mw/2,ly-fontSize,mw*st.clipReveal,fontSize*2); ctx.clip();
        }
        if (gradient) { ctx.fillStyle=makeGrad(ctx,gradient,-ctx.measureText(line).width/2,ly-fontSize/2,ctx.measureText(line).width,fontSize); }
        else { ctx.fillStyle=color; }
        if (letterSpacing) {
          let cx2=0; const tot=line.split('').reduce((a,c)=>a+ctx.measureText(c).width+letterSpacing,0);
          if (textAlign==='center') cx2=-tot/2;
          for(const ch of line){ctx.fillText(ch,cx2,ly);cx2+=ctx.measureText(ch).width+letterSpacing;}
        } else { ctx.fillText(line,0,ly); }
        if (st.clipReveal<1) ctx.restore();
      });
    }

    else if (el.type==='textList') {
      const { items=[], fontSize=28, fontWeight=400, fontFamily='Inter', color='#fff', gap=20, bullet='•', staggerAnimation, staggerInterval=0.15 } = el;
      ctx.font=fontWeight+' '+fontSize+'px "'+fontFamily+'"';
      ctx.textBaseline='middle'; ctx.textAlign='left';
      items.forEach((item,i) => {
        const delay=i*staggerInterval*fps;
        let op=1, offY=0;
        if (staggerAnimation) {
          const prog=clamp((localFrame-delay)/(0.3*fps));
          if (prog<=0){op=0;}else if(prog<1){op=prog;if(staggerAnimation==='slideUp')offY=(1-prog)*20;}
        }
        ctx.save(); ctx.globalAlpha=op; ctx.translate(0,offY);
        ctx.fillStyle=color;
        ctx.fillText((bullet?bullet+' ':'')+item, 0, i*(fontSize+gap));
        ctx.restore();
      });
    }

    else if (el.type==='shape') {
      const sh = el.shape;
      const sw=sh.width??200, shh=sh.height??200;
      ctx.globalAlpha=1;
      switch(sh.shapeType) {
        case 'rect':
          if(sh.gradient){ctx.fillStyle=makeGrad(ctx,sh.gradient,-sw/2,-shh/2,sw,shh);}else{ctx.fillStyle=sh.color??'#6C63FF';}
          rrect(ctx,-sw/2,-shh/2*st.clipReveal,sw,shh*st.clipReveal,sh.borderRadius??0); ctx.fill(); break;
        case 'circle':
          ctx.fillStyle=sh.color??'#6C63FF'; ctx.beginPath(); ctx.arc(0,0,(sh.width??100)/2,0,Math.PI*2); ctx.fill(); break;
        case 'line':
          ctx.strokeStyle=sh.color??'#6C63FF'; ctx.lineWidth=sh.thickness??2; ctx.lineCap='round';
          ctx.beginPath(); ctx.moveTo(-sw/2,0); ctx.lineTo(-sw/2+sw*st.clipReveal,0); ctx.stroke(); break;
        case 'particles':
          const cnt=sh.count??30;
          ctx.fillStyle=sh.color??'rgba(255,255,255,0.6)';
          for(let pi=0;pi<cnt;pi++){
            const seed=(pi*7919+13)%1000;
            const px2=-sw/2+((seed*97)%1000)/1000*sw;
            const speed=sh.speed??0.5;
            const py2=((-shh/2+((seed*43)%1000)/1000*shh)-localFrame*speed*((seed%3)+0.5))%(shh);
            const py3=py2<-shh/2?py2+shh:py2;
            const r2=1.5+(seed%4); const a2=0.1+(seed%7)/10;
            ctx.save();ctx.globalAlpha=a2;ctx.beginPath();ctx.arc(px2,py3,r2,0,Math.PI*2);ctx.fill();ctx.restore();
          }
          break;
        case 'barChart':
          const data=sh.data??[];
          if(data.length>0){
            const maxV=Math.max(...data.map(d=>d.value));
            const bw=(sw-(data.length-1)*12)/data.length;
            data.forEach((d,bi)=>{
              const bh=(d.value/maxV)*shh*st.clipReveal*0.85;
              const bx=-sw/2+bi*(bw+12), by=shh/2-bh-30;
              ctx.fillStyle=d.color??'#6C63FF'; rrect(ctx,bx,by,bw,bh,4); ctx.fill();
              ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.font='500 13px Inter'; ctx.textAlign='center'; ctx.textBaseline='top';
              ctx.fillText(d.label,bx+bw/2,shh/2-24);
            });
          }
          break;
        case 'progressBar':
          const pv=(sh.value??75)/100;
          ctx.fillStyle=sh.trackColor??'rgba(255,255,255,0.15)'; rrect(ctx,-sw/2,-4,sw,8,4); ctx.fill();
          ctx.fillStyle=sh.color??'#6C63FF'; rrect(ctx,-sw/2,-4,sw*pv*st.clipReveal,8,4); ctx.fill(); break;
      }
    }
    ctx.restore();
  }

  // ── Build timeline ───────────────────────────────────────────────
  function buildTimeline(cfg) {
    const tl=[]; let cur=0;
    cfg.scenes.forEach(s=>{
      const f=Math.round(s.duration*cfg.fps);
      const t=s.transition?Math.round(s.transition.duration*cfg.fps):0;
      tl.push({scene:s,startFrame:cur,endFrame:cur+f});
      cur+=f-t;
    });
    return tl;
  }

  // ── Master drawFrame ─────────────────────────────────────────────
  function drawFrame(ctx, config, frame, W, H) {
    ctx.clearRect(0,0,W,H);
    drawBg(ctx, config.background, W, H);
    const tl = buildTimeline(config);
    for(let i=0;i<tl.length;i++){
      const {scene,startFrame,endFrame}=tl[i];
      const sceneFrames=Math.round(scene.duration*config.fps);
      const transFrames=scene.transition?Math.round(scene.transition.duration*config.fps):0;
      const isActive=frame>=startFrame&&frame<endFrame;
      const next=tl[i+1];
      const isTrans=next&&scene.transition&&frame>=(endFrame-transFrames)&&frame<endFrame;
      if(!isActive&&!isTrans) continue;
      const lf=frame-startFrame;
      if(isTrans&&next&&scene.transition){
        const tp=(frame-(endFrame-transFrames))/transFrames;
        // Outgoing
        ctx.save();ctx.globalAlpha=1-tp;
        drawBg(ctx,scene.background,W,H);
        scene.elements.forEach(el=>drawEl(ctx,el,lf,config.fps,W,H));
        ctx.restore();
        // Incoming
        ctx.save();ctx.globalAlpha=tp;
        drawBg(ctx,next.scene.background,W,H);
        next.scene.elements.forEach(el=>drawEl(ctx,el,frame-next.startFrame,config.fps,W,H));
        ctx.restore();
      } else if(isActive){
        drawBg(ctx,scene.background,W,H);
        scene.elements.forEach(el=>drawEl(ctx,el,lf,config.fps,W,H));
      }
    }
  }

  // ── Dispatch ready event ─────────────────────────────────────────
  window.dispatchEvent(new CustomEvent('velox-ready', {
    detail: { drawFrame, config }
  }));
})();
`
}
