const { useState, useEffect, useRef, useCallback } = React;

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const ALL_FACTORS   = [2,3,4,5,6,7,8,9,10];
const W=800, H=540;
const PLAYER_Y      = H-100;
const PLAYER_W=72, PLAYER_H=54;
const LANE_COUNT    = 7;
const LANE_W        = W/LANE_COUNT;
const BASE_MAX_HP   = 50;
const BASE_SPEED    = 2.8;
const BOOST_SPEED   = 7.5;
const SLOW_DELTA    = -1.2;
const BOOST_DUR     = 1800;
const BOOST_CD      = 5000;
const STAR_COUNT    = 110;
const COMET_COUNT   = 3;

const DIFFICULTIES = [
  { id:"easy",   label:"Lett",      speedMult:0.45, spawnMs:1200, doubleChance:0.10 },
  { id:"medium", label:"Middels",   speedMult:0.65, spawnMs:950,  doubleChance:0.20 },
  { id:"hard",   label:"Vanskelig", speedMult:1.00, spawnMs:680,  doubleChance:0.35 },
  { id:"deadly", label:"Dødelig",   speedMult:1.45, spawnMs:480,  doubleChance:0.50 },
];

const rnd  = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
const rndF = (a,b) => Math.random()*(b-a)+a;

/* ─────────────────────────────────────────────
   HIGH SCORES (localStorage-backed)
───────────────────────────────────────────── */
const SCORE_KEY = 'rr-scores-v1';
let _scores = [];
try { _scores = JSON.parse(localStorage.getItem(SCORE_KEY) || '[]'); } catch (_) { _scores = []; }
const getScores = () => [..._scores];
const addScore  = (name,score,factor,gems) => {
  _scores = [..._scores,{name,score,factor,gems,date:new Date().toLocaleDateString("nb-NO")}]
    .sort((a,b)=>b.score-a.score).slice(0,10);
  try { localStorage.setItem(SCORE_KEY, JSON.stringify(_scores)); } catch (_) {}
};

/* ─────────────────────────────────────────────
   AUDIO ENGINE  (Web Audio API, no files needed)
───────────────────────────────────────────── */
let _audioCtx = null;
function getCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  return _audioCtx;
}
function playTone(freq, type, dur, vol=0.18, delay=0) {
  try {
    const ctx = getCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime+delay);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+delay+dur);
    o.start(ctx.currentTime+delay);
    o.stop(ctx.currentTime+delay+dur+0.02);
  } catch(e){}
}
const SFX = {
  correct : (on) => { if(!on) return; playTone(523,  "sine",   0.12, 0.22); playTone(659,"sine",0.12,0.18,0.08); },
  wrong   : (on) => { if(!on) return; playTone(180,  "sawtooth",0.18,0.20); },
  gem     : (on) => { if(!on) return; playTone(880,  "sine",   0.09, 0.25); playTone(1100,"sine",0.07,0.20,0.06); },
  boost   : (on) => { if(!on) return; playTone(200,  "sawtooth",0.08,0.14); playTone(320,"sawtooth",0.1,0.14,0.1); playTone(480,"sine",0.12,0.18,0.2); },
  slow    : (on) => { if(!on) return; playTone(300,  "sine",   0.06, 0.12); },
  shield  : (on) => { if(!on) return; playTone(660,  "sine",   0.14, 0.20); playTone(880,"sine",0.10,0.15,0.1); },
  powerup : (on) => { if(!on) return; [440,554,659,880].forEach((f,i)=>playTone(f,"sine",0.1,0.18,i*0.07)); },
};

/* Simple looping synth music */
let _musicNodes = [];
let _musicRunning = false;
function startMusic() {
  if (_musicRunning) return;
  _musicRunning = true;
  const ctx = getCtx();
  const NOTES = [130.8,146.8,164.8,174.6,196,220,246.9];
  let step = 0;
  const tick = () => {
    if (!_musicRunning) return;
    const freq = NOTES[step % NOTES.length] * (step % 14 < 7 ? 1 : 1.5);
    playTone(freq, "triangle", 0.22, 0.05);
    if (step % 4 === 0) playTone(65.4, "sine", 0.3, 0.08);
    step++;
    _musicNodes.push(setTimeout(tick, 240));
  };
  tick();
}
function stopMusic() {
  _musicRunning = false;
  _musicNodes.forEach(clearTimeout);
  _musicNodes = [];
}

/* ─────────────────────────────────────────────
   BACKGROUND: STARS
───────────────────────────────────────────── */
function makeStars() {
  return Array.from({length:STAR_COUNT},(_,i)=>({
    id:i, x:rndF(0,W), y:rndF(0,H),
    r:rndF(0.4,2.1), opacity:rndF(0.2,1),
  }));
}
function StarField({stars, boosting}) {
  return (
    <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none"}}>
      {stars.map(s=>(
        <div key={s.id} style={{
          position:"absolute", left:s.x, top:s.y,
          width:s.r*2,
          height:boosting ? s.r*7 : s.r*2,
          borderRadius:boosting?"20%":"50%",
          background:"#fff", opacity:boosting?s.opacity*0.6:s.opacity,
          transition:"height 0.18s,border-radius 0.18s",
        }}/>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   BACKGROUND: PLANETS  (static, decorative)
───────────────────────────────────────────── */
const PLANET_DEFS = [
  {x:90,  y:160, r:52, c1:"#7c3aed",c2:"#4c1d95", rings:true,  speed:0.06},
  {x:690, y:300, r:38, c1:"#b45309",c2:"#78350f", rings:false, speed:0.04},
  {x:400, y:80,  r:28, c1:"#0e7490",c2:"#164e63", rings:false, speed:0.05},
  {x:140, y:430, r:18, c1:"#065f46",c2:"#022c22", rings:false, speed:0.07},
  {x:720, y:90,  r:22, c1:"#9f1239",c2:"#4c0519", rings:false, speed:0.055},
];
function Planets({scroll}) {
  return (
    <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden"}}>
      {PLANET_DEFS.map((p,i)=>{
        const yOff = (scroll * p.speed) % (H + p.r*2);
        const top  = (p.y + yOff) % (H + p.r*4) - p.r*2;
        return (
          <div key={i} style={{
            position:"absolute",
            left:p.x-p.r, top,
            width:p.r*2, height:p.r*2,
          }}>
            <svg width={p.r*2} height={p.r*2} viewBox={`0 0 ${p.r*2} ${p.r*2}`} style={{overflow:"visible"}}>
              <defs>
                <radialGradient id={`pg${i}`} cx="35%" cy="30%">
                  <stop offset="0%" stopColor={p.c1}/>
                  <stop offset="100%" stopColor={p.c2}/>
                </radialGradient>
              </defs>
              {/* atmosphere glow */}
              <circle cx={p.r} cy={p.r} r={p.r+4} fill={p.c1} opacity="0.12"/>
              {/* planet body */}
              <circle cx={p.r} cy={p.r} r={p.r} fill={`url(#pg${i})`}/>
              {/* surface bands */}
              <ellipse cx={p.r} cy={p.r*0.7} rx={p.r*0.9} ry={p.r*0.12} fill="#fff" opacity="0.07"/>
              <ellipse cx={p.r} cy={p.r*1.3} rx={p.r*0.8} ry={p.r*0.10} fill="#fff" opacity="0.05"/>
              {p.rings && <>
                <ellipse cx={p.r} cy={p.r} rx={p.r*1.7} ry={p.r*0.35}
                  fill="none" stroke={p.c1} strokeWidth="5" opacity="0.35"/>
                <ellipse cx={p.r} cy={p.r} rx={p.r*1.7} ry={p.r*0.35}
                  fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.15"/>
              </>}
            </svg>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   BACKGROUND: COMETS
───────────────────────────────────────────── */
function makeComets() {
  return Array.from({length:COMET_COUNT},(_,i)=>({
    id:i,
    x: rndF(-100, W+100),
    y: rndF(-60, H*0.4),
    vx: rndF(2.5,5) * (Math.random()<0.5?1:-1),
    vy: rndF(1.5,3.5),
    len: rndF(60,130),
    opacity: rndF(0.3,0.7),
  }));
}
function useComets() {
  const [comets, setComets] = useState(makeComets);
  useEffect(()=>{
    const iv = setInterval(()=>{
      setComets(prev=>prev.map(c=>{
        let nx=c.x+c.vx, ny=c.y+c.vy;
        if (ny>H+80||nx<-200||nx>W+200) {
          nx=rndF(-60,W+60); ny=rndF(-120,-40);
        }
        return {...c,x:nx,y:ny};
      }));
    },16);
    return ()=>clearInterval(iv);
  },[]);
  return comets;
}
function CometLayer({comets}) {
  return (
    <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden"}}>
      {comets.map(c=>{
        const angle = Math.atan2(c.vy,c.vx)*180/Math.PI;
        return (
          <div key={c.id} style={{
            position:"absolute",
            left:c.x, top:c.y,
            width:c.len, height:3,
            background:`linear-gradient(to right, transparent, rgba(147,197,253,${c.opacity}), #fff)`,
            borderRadius:2,
            transform:`rotate(${angle}deg)`,
            transformOrigin:"left center",
            boxShadow:`0 0 6px rgba(147,197,253,${c.opacity*0.6})`,
          }}/>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   GAME OBJECT SPAWNING
───────────────────────────────────────────── */
function getMultiples(factor) {
  const m=[];
  for(let i=factor;i<=100;i+=factor) m.push(i);
  return m;
}
function spawnObject(factor,usedLanes,score,diffMult=1) {
  let lane;
  for(let t=0;t<20;t++){lane=rnd(0,LANE_COUNT-1);if(!usedLanes.includes(lane))break;}
  const speedMult=diffMult*(1+Math.min(score/500,1.3));
  const speed=BASE_SPEED*speedMult*rndF(0.86,1.16);
  const roll=Math.random();

  // sapphire gem
  if(roll<0.07) return {id:crypto.randomUUID(),kind:"gem",
    x:lane*LANE_W+LANE_W/2,y:-44,w:32,h:36,speed:speed*0.85,lane,spin:rnd(0,5)};

  // powerup
  if(roll<0.13){
    const types=["shield","double","heal","maxhp"];
    return{id:crypto.randomUUID(),kind:"powerup",subtype:types[rnd(0,types.length-1)],
      x:lane*LANE_W+LANE_W/2,y:-50,w:52,h:52,speed:speed*0.85,lane};
  }
  // hazard — now 45% of spawns
  if(roll<0.45){
    const ast=Math.random()<0.55;
    return{id:crypto.randomUUID(),kind:ast?"asteroid":"junk",
      x:lane*LANE_W+LANE_W/2,y:-70,
      w:ast?rnd(56,76):rnd(58,72), h:ast?rnd(56,76):rnd(44,56),
      speed:speed*0.9,lane,variant:rnd(0,2)};
  }
  // number
  const multiples=getMultiples(factor);
  const correct=Math.random()<0.44;
  let num;
  if(correct){num=multiples[rnd(0,multiples.length-1)];}
  else{let t=0;do{num=rnd(2,100);t++;}while(multiples.includes(num)&&t<60);}
  return{id:crypto.randomUUID(),kind:"number",num,correct:multiples.includes(num),
    x:lane*LANE_W+LANE_W/2,y:-50,w:56,h:56,speed,lane};
}

/* ─────────────────────────────────────────────
   HUD
───────────────────────────────────────────── */
function HPBar({hp,maxHp}){
  const pct=Math.max(0,hp/maxHp);
  const color=pct>0.55?"#4ade80":pct>0.28?"#fbbf24":"#ef4444";
  return(
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <span style={{fontSize:10,color:"#94a3b8",letterSpacing:2}}>HP</span>
      <div style={{width:130,height:14,background:"rgba(255,255,255,0.08)",
        borderRadius:7,border:"1px solid rgba(255,255,255,0.12)",overflow:"hidden"}}>
        <div style={{width:`${pct*100}%`,height:"100%",borderRadius:7,
          background:`linear-gradient(90deg,${color}99,${color})`,
          transition:"width 0.3s,background 0.5s",boxShadow:`0 0 8px ${color}77`}}/>
      </div>
      <span style={{fontSize:12,fontWeight:700,color,fontFamily:"'Orbitron',monospace",minWidth:54}}>
        {hp}/{maxHp}
      </span>
    </div>
  );
}
function BoostBar({pct,boosting}){
  const color=boosting?"#f97316":pct>=1?"#fb923c":"#475569";
  return(
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      <span style={{fontSize:9,color,letterSpacing:2,minWidth:38}}>
        {boosting?"BOOST!":pct>=1?"BOOST ↑":"LADER"}
      </span>
      <div style={{width:70,height:7,background:"rgba(255,255,255,0.07)",
        borderRadius:4,border:"1px solid rgba(255,255,255,0.09)",overflow:"hidden"}}>
        <div style={{width:`${pct*100}%`,height:"100%",borderRadius:4,
          background:`linear-gradient(90deg,${color}88,${color})`,
          transition:"width 0.1s",boxShadow:pct>=1?`0 0 8px ${color}88`:"none"}}/>
      </div>
    </div>
  );
}
function HUD({hp,maxHp,score,factor,shield,doublePoints,streak,boostPct,boosting,gems,sfxOn,musicOn,onToggleSfx,onToggleMusic}){
  return(
    <div style={{position:"absolute",top:0,left:0,right:0,height:68,
      display:"flex",alignItems:"center",justifyContent:"space-between",
      padding:"0 14px",background:"rgba(2,8,23,0.88)",
      borderBottom:"1px solid rgba(96,165,250,0.13)",zIndex:10,gap:8}}>

      {/* left: HP + boost */}
      <div style={{display:"flex",flexDirection:"column",gap:5,minWidth:190}}>
        <HPBar hp={hp} maxHp={maxHp}/>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <BoostBar pct={boostPct} boosting={boosting}/>
          {shield&&<span style={{fontSize:13}}>🛡️</span>}
          {doublePoints&&<span style={{fontSize:13,color:"#fbbf24",fontWeight:900}}>×2</span>}
        </div>
      </div>

      {/* center: factor + streak */}
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
        <div style={{fontSize:9,letterSpacing:3,color:"#334155"}}>DU ER</div>
        <div style={{fontSize:22,fontWeight:900,color:"#475569",
          fontFamily:"'Orbitron',monospace",lineHeight:1}}>{factor}</div>
        {streak>1&&<div style={{fontSize:10,color:"#fbbf24",fontWeight:700}}>🔥 ×{streak}</div>}
      </div>

      {/* right: gems + score + sound toggles */}
      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:14}}>💎</span>
            <span style={{fontSize:14,fontWeight:900,color:"#7dd3fc",fontFamily:"'Orbitron',monospace"}}>{gems}</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end"}}>
            <div style={{fontSize:8,letterSpacing:3,color:"#60a5fa"}}>POENG</div>
            <div style={{fontSize:22,fontWeight:900,color:"#fff",fontFamily:"'Orbitron',monospace",lineHeight:1}}>{score}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={onToggleSfx} style={{...hudBtn, opacity:sfxOn?1:0.35}} title="SFX">🔊</button>
          <button onClick={onToggleMusic} style={{...hudBtn, opacity:musicOn?1:0.35}} title="Musikk">🎵</button>
        </div>
      </div>
    </div>
  );
}
const hudBtn={background:"transparent",border:"none",cursor:"pointer",fontSize:14,padding:2};

/* ─────────────────────────────────────────────
   SAPPHIRE GEM
───────────────────────────────────────────── */
function GemObj({obj}){
  return(
    <div style={{position:"absolute",left:obj.x-obj.w/2,top:obj.y-obj.h/2,
      width:obj.w,height:obj.h,
      display:"flex",alignItems:"center",justifyContent:"center",
      animation:"gemSpin 2s linear infinite",
      filter:"drop-shadow(0 0 10px #38bdf8) drop-shadow(0 0 4px #7dd3fc)",
    }}>
      <svg width={obj.w} height={obj.h} viewBox="0 0 32 36">
        <defs>
          <linearGradient id="gemg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#bae6fd"/>
            <stop offset="40%"  stopColor="#38bdf8"/>
            <stop offset="100%" stopColor="#0369a1"/>
          </linearGradient>
        </defs>
        {/* gem facets */}
        <polygon points="16,2 28,10 28,26 16,34 4,26 4,10" fill="url(#gemg)" stroke="#7dd3fc" strokeWidth="1"/>
        <polygon points="16,2 28,10 16,12 4,10"   fill="#bae6fd" opacity="0.4"/>
        <polygon points="16,12 28,10 28,26 16,22" fill="#0ea5e9" opacity="0.5"/>
        <polygon points="16,12 4,10  4,26  16,22" fill="#38bdf8" opacity="0.3"/>
        <polygon points="16,22 28,26 16,34 4,26"  fill="#0369a1" opacity="0.5"/>
        {/* sparkle */}
        <circle cx="10" cy="8" r="2" fill="#fff" opacity="0.6"/>
      </svg>
    </div>
  );
}

/* ─────────────────────────────────────────────
   NUMBER OBJ
───────────────────────────────────────────── */
function NumberObj({obj}){
  return(
    <div style={{position:"absolute",left:obj.x-obj.w/2,top:obj.y-obj.h/2,
      width:obj.w,height:obj.h,borderRadius:12,
      background:"radial-gradient(circle at 38% 38%,#1e2d4a,#0d1625)",
      border:"2px solid #4a7fa5",boxShadow:"0 0 14px #4a7fa544",
      display:"flex",alignItems:"center",justifyContent:"center",
      color:"#fff",fontSize:22,fontWeight:900,fontFamily:"'Orbitron',monospace",
    }}>{obj.num}</div>
  );
}

/* ─────────────────────────────────────────────
   ASTEROID  (scary SVG rock)
───────────────────────────────────────────── */
function AsteroidObj({obj}){
  const v=obj.variant||0;
  const pts=["30,2 52,12 68,28 62,52 44,68 20,65 4,48 6,24 18,8","36,2 58,10 72,30 66,55 48,70 22,68 5,52 8,26 22,10","28,4 55,8 70,26 68,50 50,70 24,70 6,52 4,28 16,10"][v];
  return(
    <div style={{position:"absolute",left:obj.x-obj.w/2,top:obj.y-obj.h/2,width:obj.w,height:obj.h,pointerEvents:"none"}}>
      <svg width={obj.w} height={obj.h} viewBox="0 0 74 74" style={{overflow:"visible"}}>
        <defs><radialGradient id={`ag${v}`} cx="40%" cy="35%">
          <stop offset="0%" stopColor="#78716c"/>
          <stop offset="50%" stopColor="#44403c"/>
          <stop offset="100%" stopColor="#1c1917"/>
        </radialGradient></defs>
        <polygon points={pts} fill="none" stroke="#ef4444" strokeWidth="3" opacity="0.55" style={{animation:"rockPulse 1.4s ease-in-out infinite"}}/>
        <polygon points={pts} fill={`url(#ag${v})`} stroke="#ef444488" strokeWidth="2"/>
        <circle cx="22" cy="28" r="6" fill="#1c1917" opacity="0.7"/>
        <circle cx="48" cy="44" r="4" fill="#1c1917" opacity="0.6"/>
        <circle cx="38" cy="18" r="3" fill="#1c1917" opacity="0.5"/>
        <text x="37" y="44" textAnchor="middle" fontSize="22" style={{userSelect:"none"}}>💀</text>
      </svg>
      <div style={{position:"absolute",inset:-6,borderRadius:"50%",
        background:"radial-gradient(circle,#ef444420 0%,transparent 70%)",
        animation:"rockPulse 1.4s ease-in-out infinite"}}/>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SPACE JUNK  (broken satellite)
───────────────────────────────────────────── */
function JunkObj({obj}){
  const v=obj.variant||0;
  return(
    <div style={{position:"absolute",left:obj.x-obj.w/2,top:obj.y-obj.h/2,width:obj.w,height:obj.h,pointerEvents:"none"}}>
      <svg width={obj.w} height={obj.h} viewBox="0 0 72 56" style={{overflow:"visible"}}>
        <defs><radialGradient id={`jg${v}`} cx="50%" cy="40%">
          <stop offset="0%" stopColor="#6b7280"/><stop offset="100%" stopColor="#1f2937"/>
        </radialGradient></defs>
        <ellipse cx="36" cy="28" rx="36" ry="28" fill="#f9731614" stroke="#f97316" strokeWidth="1.5" opacity="0.7"/>
        <rect x="1" y="20" width="14" height="18" rx="2" fill="#1e3a5f" stroke="#f97316" strokeWidth="1.5" transform="rotate(-12,8,29)"/>
        <line x1="1" y1="24" x2="15" y2="24" stroke="#60a5fa" strokeWidth="1" opacity="0.5" transform="rotate(-12,8,29)"/>
        <line x1="1" y1="29" x2="15" y2="29" stroke="#60a5fa" strokeWidth="1" opacity="0.5" transform="rotate(-12,8,29)"/>
        <line x1="15" y1="28" x2="22" y2="28" stroke="#9ca3af" strokeWidth="2"/>
        <line x1="17" y1="25" x2="21" y2="31" stroke="#f97316" strokeWidth="1.5"/>
        <rect x="22" y="16" width="28" height="24" rx="3" fill={`url(#jg${v})`} stroke="#6b7280" strokeWidth="1.5"/>
        <rect x="25" y="19" width="8" height="6" rx="1" fill="#0f172a"/>
        <rect x="36" y="19" width="8" height="6" rx="1" fill="#0f172a"/>
        <circle cx="36" cy="32" r="4" fill="#ef4444" opacity="0.8" style={{animation:"junkBlink 0.7s ease-in-out infinite"}}/>
        <line x1="50" y1="28" x2="57" y2="26" stroke="#9ca3af" strokeWidth="2"/>
        <line x1="52" y1="25" x2="56" y2="30" stroke="#f97316" strokeWidth="1.5"/>
        <rect x="57" y="18" width="13" height="20" rx="2" fill="#1e3a5f" stroke="#f97316" strokeWidth="1.5" transform="rotate(18,63,28)"/>
        <line x1="57" y1="23" x2="70" y2="23" stroke="#60a5fa" strokeWidth="1" opacity="0.5" transform="rotate(18,63,28)"/>
        <line x1="57" y1="28" x2="70" y2="28" stroke="#60a5fa" strokeWidth="1" opacity="0.3" transform="rotate(18,63,28)"/>
        <line x1="61" y1="20" x2="66" y2="36" stroke="#f97316" strokeWidth="1" opacity="0.8" transform="rotate(18,63,28)"/>
        <text x="36" y="52" textAnchor="middle" fontSize="9" fontWeight="900"
          fill="#f97316" fontFamily="monospace" style={{userSelect:"none",letterSpacing:1}}>⚠ DANGER ⚠</text>
      </svg>
    </div>
  );
}

/* ─────────────────────────────────────────────
   POWER-UPS  (labeled, obvious)
───────────────────────────────────────────── */
const PU_DESIGNS={
  shield:{border:"#38bdf8",glow:"#38bdf8",label:"SKJOLD",render:(w)=>(
    <svg width={w} height={w} viewBox="0 0 52 52">
      <defs><radialGradient id="shg" cx="50%" cy="35%"><stop offset="0%" stopColor="#0ea5e9"/><stop offset="100%" stopColor="#0c4a6e"/></radialGradient></defs>
      <circle cx="26" cy="26" r="24" fill="url(#shg)" stroke="#38bdf8" strokeWidth="2"/>
      <path d="M26,10 L38,15 L38,27 Q38,36 26,42 Q14,36 14,27 L14,15 Z" fill="#38bdf8" opacity="0.25" stroke="#7dd3fc" strokeWidth="1.5"/>
      <text x="26" y="31" textAnchor="middle" fontSize="16" fill="#fff" fontWeight="900" style={{userSelect:"none"}}>🛡</text>
    </svg>)},
  double:{border:"#fbbf24",glow:"#fbbf24",label:"×2 POENG",render:(w)=>(
    <svg width={w} height={w} viewBox="0 0 52 52">
      <defs><radialGradient id="dbg" cx="50%" cy="35%"><stop offset="0%" stopColor="#f59e0b"/><stop offset="100%" stopColor="#78350f"/></radialGradient></defs>
      <circle cx="26" cy="26" r="24" fill="url(#dbg)" stroke="#fbbf24" strokeWidth="2"/>
      <text x="26" y="22" textAnchor="middle" fontSize="13" fill="#fef08a" fontWeight="900" fontFamily="'Orbitron',monospace" style={{userSelect:"none"}}>×2</text>
      <text x="26" y="36" textAnchor="middle" fontSize="9"  fill="#fde68a" fontWeight="700" style={{userSelect:"none"}}>POENG</text>
    </svg>)},
  heal:{border:"#4ade80",glow:"#4ade80",label:"+10 HP",render:(w)=>(
    <svg width={w} height={w} viewBox="0 0 52 52">
      <defs><radialGradient id="hg" cx="50%" cy="35%"><stop offset="0%" stopColor="#22c55e"/><stop offset="100%" stopColor="#14532d"/></radialGradient></defs>
      <circle cx="26" cy="26" r="24" fill="url(#hg)" stroke="#4ade80" strokeWidth="2"/>
      <rect x="22" y="14" width="8" height="24" rx="3" fill="#fff" opacity="0.9"/>
      <rect x="14" y="22" width="24" height="8" rx="3" fill="#fff" opacity="0.9"/>
    </svg>)},
  maxhp:{border:"#a78bfa",glow:"#a78bfa",label:"MAX HP↑",render:(w)=>(
    <svg width={w} height={w} viewBox="0 0 52 52">
      <defs><radialGradient id="mhg" cx="50%" cy="35%"><stop offset="0%" stopColor="#8b5cf6"/><stop offset="100%" stopColor="#1e1b4b"/></radialGradient></defs>
      <circle cx="26" cy="26" r="24" fill="url(#mhg)" stroke="#a78bfa" strokeWidth="2"/>
      <text x="26" y="28" textAnchor="middle" fontSize="18" style={{userSelect:"none"}}>❤️</text>
      <text x="26" y="42" textAnchor="middle" fontSize="10" fill="#c4b5fd" fontWeight="900" fontFamily="'Orbitron',monospace" style={{userSelect:"none"}}>MAX↑</text>
    </svg>)},
};
function PowerupObj({obj}){
  const d=PU_DESIGNS[obj.subtype]||PU_DESIGNS.heal;
  return(
    <div style={{position:"absolute",left:obj.x-obj.w/2,top:obj.y-obj.h/2,
      width:obj.w,height:obj.h+14,
      display:"flex",flexDirection:"column",alignItems:"center",
      animation:"floatPulse 1.1s ease-in-out infinite",
      filter:`drop-shadow(0 0 10px ${d.glow}cc)`}}>
      {d.render(obj.w)}
      <div style={{fontSize:7,fontWeight:900,color:d.border,letterSpacing:1,
        fontFamily:"'Orbitron',monospace",marginTop:2,whiteSpace:"nowrap",
        textShadow:`0 0 8px ${d.glow}`}}>{d.label}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PLAYER SHIP  (tilt / lean animations)
───────────────────────────────────────────── */
function PlayerShip({x,damaged,shield,factor,boosting,slowing,moveDir}){
  const fontSize = String(factor).length >= 2 ? 13 : 16;
  const tilt=moveDir==="left"?-18:moveDir==="right"?18:0;
  const scaleY=boosting?1.08:slowing?0.92:1;
  const scaleX=boosting?0.94:1;
  const tY=boosting?-6:slowing?4:0;
  const thrW=boosting?22:slowing?8:14;
  const thrH=boosting?42:slowing?12:26;
  const thrBg=boosting
    ?"linear-gradient(to bottom,#fff 0%,#fbbf24 20%,#f97316 55%,#ef4444 80%,transparent)"
    :slowing?"linear-gradient(to bottom,#60a5fa 0%,#1d4ed8 60%,transparent)"
    :"linear-gradient(to bottom,#fff 0%,#93c5fd 25%,#3b82f6 65%,transparent)";
  return(
    <div style={{
      position:"absolute",left:x-PLAYER_W/2,top:PLAYER_Y-PLAYER_H/2,
      width:PLAYER_W,height:PLAYER_H,
      transform:`rotate(${tilt}deg) scaleY(${scaleY}) scaleX(${scaleX}) translateY(${tY}px)`,
      filter:damaged?"drop-shadow(0 0 18px #ef4444) drop-shadow(0 0 5px #fff)"
        :shield?"drop-shadow(0 0 16px #38bdf8)"
        :boosting?"drop-shadow(0 0 20px #f97316) drop-shadow(0 0 8px #fbbf24)"
        :slowing?"drop-shadow(0 0 12px #60a5fa88)"
        :"drop-shadow(0 0 10px #60a5fa)",
      zIndex:5,
      transitionProperty:"left,transform,filter",
      transitionDuration:"0.07s,0.12s,0.2s",
      transitionTimingFunction:"linear,cubic-bezier(0.34,1.56,0.64,1),ease",
    }}>
      <svg width={PLAYER_W} height={PLAYER_H} viewBox="0 0 72 54">
        <ellipse cx="36" cy="50" rx="14" ry="6" fill={boosting?"#f97316":"#3b82f6"} opacity="0.38"/>
        <polygon points="4,42 28,30 28,46"  fill="#1e3a5f"/>
        <polygon points="68,42 44,30 44,46" fill="#1e3a5f"/>
        <polygon points="4,42 20,36 20,44"  fill={boosting?"#ea580c":slowing?"#1e40af":"#2563eb"}/>
        <polygon points="68,42 52,36 52,44" fill={boosting?"#ea580c":slowing?"#1e40af":"#2563eb"}/>
        <ellipse cx="36" cy="30" rx="16" ry="24" fill={boosting?"#9a3412":slowing?"#1e3a5f":"#1d4ed8"}/>
        <ellipse cx="36" cy="25" rx="12" ry="19" fill={boosting?"#ea580c":slowing?"#1e40af":"#2563eb"}/>
        <rect x="22" y="26" width="28" height="18" rx="5" fill="#0f172a" opacity="0.75"/>
        <text x="36" y="39" textAnchor="middle" fontSize={fontSize} fontWeight="900"
          fontFamily="'Orbitron',monospace" fill="#fff" style={{userSelect:"none"}}>{factor}</text>
        <ellipse cx="36" cy="14" rx="8" ry="10" fill="#93c5fd" opacity="0.6"/>
        <ellipse cx="36" cy="13" rx="5"  ry="6"  fill="#dbeafe" opacity="0.35"/>
        <line x1="36" y1="6" x2="36" y2="44" stroke="#60a5fa" strokeWidth="1" opacity="0.3"/>
        {slowing&&<><rect x="10" y="26" width="6" height="4" rx="1" fill="#60a5fa" opacity="0.7"/>
          <rect x="56" y="26" width="6" height="4" rx="1" fill="#60a5fa" opacity="0.7"/></>}
        {shield&&<ellipse cx="36" cy="27" rx="30" ry="32" fill="none" stroke="#38bdf8" strokeWidth="2" opacity="0.55"/>}
      </svg>
      {/* main thruster */}
      <div style={{position:"absolute",bottom:boosting?-30:slowing?-10:-18,left:"50%",transform:"translateX(-50%)",
        width:thrW,height:thrH,background:thrBg,borderRadius:"50% 50% 80% 80%",opacity:slowing?0.5:0.95,
        animation:boosting?"thrusterBoost 0.08s ease-in-out infinite alternate":slowing?"none":"thruster 0.14s ease-in-out infinite alternate",
        transition:"width 0.12s,height 0.12s,bottom 0.12s,opacity 0.2s"}}/>
      {/* retro side flames on brake */}
      {slowing&&<>
        <div style={{position:"absolute",top:"48%",left:-10,width:12,height:6,
          background:"linear-gradient(to left,#93c5fd,transparent)",borderRadius:"80% 20% 20% 80%",
          opacity:0.8,animation:"retroFlame 0.1s ease-in-out infinite alternate"}}/>
        <div style={{position:"absolute",top:"48%",right:-10,width:12,height:6,
          background:"linear-gradient(to right,#93c5fd,transparent)",borderRadius:"20% 80% 80% 20%",
          opacity:0.8,animation:"retroFlame 0.1s ease-in-out infinite alternate"}}/>
      </>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   FLOAT LABELS  (combo text, damage, gems)
───────────────────────────────────────────── */
const COMBO_WORDS=["NICE!","SICK!","BANGER!","CRACKED!","GOATED!","W MOVE!","NO CAP!","BUSSIN!"];
function FloatLabels({labels}){
  return(
    <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:8}}>
      {labels.map(l=>(
        <div key={l.id} style={{
          position:"absolute",left:l.x-50,top:l.y-10,width:100,textAlign:"center",
          fontSize:l.big?22:15,fontWeight:900,color:l.color,fontFamily:"'Orbitron',monospace",
          textShadow:`0 0 12px ${l.color}`,animation:"floatUp 0.95s ease-out forwards",
        }}>{l.text}</div>
      ))}
    </div>
  );
}
function DamageFlash({active}){
  if(!active) return null;
  return <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:20,
    background:"radial-gradient(ellipse at center,transparent 35%,#ef444455 100%)",
    border:"4px solid #ef4444",animation:"flashIn 0.45s ease-out forwards"}}/>;
}
function BoostFlash({active}){
  if(!active) return null;
  return <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:19,
    background:"linear-gradient(to top,#f9731620 0%,transparent 40%)",
    borderBottom:"3px solid #f9731677"}}/>;
}

/* ─────────────────────────────────────────────
   GAME SCREEN
───────────────────────────────────────────── */
function GameScreen({factor,difficulty,onGameOver,onMenu,sfxOn,setSfxOn,musicOn,setMusicOn}){
  const diff = DIFFICULTIES.find(d=>d.id===difficulty) || DIFFICULTIES[1];
  const [lane,setLane]         = useState(Math.floor(LANE_COUNT/2));
  const [objects,setObjects]   = useState([]);
  const [hp,setHp]             = useState(BASE_MAX_HP);
  const [maxHp,setMaxHp]       = useState(BASE_MAX_HP);
  const [score,setScore]       = useState(0);
  const [gems,setGems]         = useState(0);
  const [shield,setShield]     = useState(false);
  const [double,setDouble]     = useState(false);
  const [damaged,setDamaged]   = useState(false);
  const [labels,setLabels]     = useState([]);
  const [streak,setStreak]     = useState(0);
  const [paused,setPaused]     = useState(false);
  const [dead,setDead]         = useState(false);
  const [stars]                = useState(makeStars);
  const [boosting,setBoosting] = useState(false);
  const [slowing,setSlowing]   = useState(false);
  const [moveDir,setMoveDir]   = useState(null);
  const [boostCD,setBoostCD]   = useState(0);
  const [scroll,setScroll]     = useState(0);
  const [activeDiff,setActiveDiff] = useState(difficulty);
  const comets                 = useComets();

  const R=useRef({});
  const currentDiff = DIFFICULTIES.find(d=>d.id===activeDiff) || DIFFICULTIES[2];
  R.current={lane,hp,maxHp,shield,double,score,streak,paused,dead,boosting,slowing,sfxOn,musicOn,currentDiff};

  const shieldT=useRef(null),doubleT=useRef(null),boostT=useRef(null);
  const slowT=useRef(null),cdInt=useRef(null),animRef=useRef(null);
  const boostRef=useRef(false),moveDirT=useRef(null);

  const addLabel=useCallback((x,y,text,color,big=false)=>{
    const id=Date.now()+Math.random();
    setLabels(p=>[...p,{id,x,y,text,color,big}]);
    setTimeout(()=>setLabels(p=>p.filter(l=>l.id!==id)),1000);
  },[]);

  const takeDamage=useCallback((amount,x,y)=>{
    if(R.current.shield){setShield(false);SFX.shield(R.current.sfxOn);addLabel(x,y,"SKJOLD!","#38bdf8",true);return;}
    SFX.wrong(R.current.sfxOn);
    setDamaged(true);setTimeout(()=>setDamaged(false),500);
    setHp(prev=>{
      const next=Math.max(0,prev-amount);
      if(next<=0&&!R.current.dead){setDead(true);setTimeout(()=>onGameOver(R.current.score,R.current.gems||0),1100);}
      addLabel(x,y,`-${amount} HP`,"#ef4444");
      return next;
    });
  },[addLabel,onGameOver]);

  const triggerBoost=useCallback(()=>{
    if(boostRef.current||R.current.dead) return;
    SFX.boost(R.current.sfxOn);
    boostRef.current=true;setBoosting(true);
    clearTimeout(boostT.current);
    boostT.current=setTimeout(()=>{
      boostRef.current=false;setBoosting(false);
      let rem=BOOST_CD;setBoostCD(rem);
      clearInterval(cdInt.current);
      cdInt.current=setInterval(()=>{rem-=50;setBoostCD(Math.max(0,rem));if(rem<=0)clearInterval(cdInt.current);},50);
    },BOOST_DUR);
  },[]);

  // sound effect on mount/unmount
  useEffect(()=>{
    if(musicOn) startMusic();
    return()=>stopMusic();
  },[]);
  useEffect(()=>{ musicOn?startMusic():stopMusic(); },[musicOn]);

  // keyboard
  useEffect(()=>{
    const down=e=>{
      if(R.current.dead) return;
      if(e.key==="ArrowLeft"){
        setLane(l=>Math.max(0,l-1));setMoveDir("left");
        clearTimeout(moveDirT.current);moveDirT.current=setTimeout(()=>setMoveDir(null),220);
      }
      if(e.key==="ArrowRight"){
        setLane(l=>Math.min(LANE_COUNT-1,l+1));setMoveDir("right");
        clearTimeout(moveDirT.current);moveDirT.current=setTimeout(()=>setMoveDir(null),220);
      }
      if(e.key==="ArrowUp"&&boostCD===0) triggerBoost();
      if(e.key==="ArrowDown"){
        SFX.slow(R.current.sfxOn);
        setSlowing(true);clearTimeout(slowT.current);slowT.current=setTimeout(()=>setSlowing(false),600);
      }
      if(e.key==="p"||e.key==="Escape") setPaused(p=>!p);
    };
    window.addEventListener("keydown",down);
    return()=>window.removeEventListener("keydown",down);
  },[boostCD,triggerBoost]);

  // spawn — interval and double-chance driven by difficulty
  useEffect(()=>{
    if(dead) return;
    const iv=setInterval(()=>{
      if(R.current.paused) return;
      const cd=R.current.currentDiff;
      setObjects(prev=>{
        const used=prev.filter(o=>o.y<80).map(o=>o.lane);
        const count = Math.random() < cd.doubleChance ? 2 : 1;
        let next=[...prev];
        const usedNow=[...used];
        for(let i=0;i<count;i++){
          const obj=spawnObject(factor,usedNow,R.current.score,cd.speedMult);
          next.push(obj);
          usedNow.push(obj.lane);
        }
        return next;
      });
    },R.current.currentDiff.spawnMs + Math.random()*200);
    return()=>clearInterval(iv);
  },[dead,factor,diff]);

  // game loop
  useEffect(()=>{
    if(dead) return;
    const loop=()=>{
      if(!R.current.paused){
        const extra=R.current.boosting?(BOOST_SPEED-BASE_SPEED)*R.current.currentDiff.speedMult:R.current.slowing?SLOW_DELTA*R.current.currentDiff.speedMult:0;
        setScroll(s=>s+BASE_SPEED+extra);
        setObjects(prev=>{
          const next=[];
          for(const obj of prev){
            const ny=obj.y+obj.speed+extra;
            if(ny>H+80) continue;
            const px=(R.current.lane+0.5)*LANE_W;
            const dx=Math.abs(obj.x-px),dy=Math.abs(ny-PLAYER_Y);
            const hw=(obj.w/2+PLAYER_W/2)*0.65,hh=(obj.h/2+PLAYER_H/2)*0.65;
            if(dx<hw&&dy<hh){
              if(obj.kind==="number"){
                if(obj.correct){
                  const str=R.current.streak+1;setStreak(str);
                  const mult=R.current.double?2:1;
                  const pts=Math.round((10+str*4)*mult);
                  setScore(s=>s+pts);
                  SFX.correct(R.current.sfxOn);
                  const word=str>=3?COMBO_WORDS[Math.min(str-3,COMBO_WORDS.length-1)]:null;
                  addLabel(obj.x,ny,`+${pts}`,"#4ade80",str>=3);
                  if(word) addLabel(obj.x,ny-36,word,"#fbbf24",true);
                }else{setStreak(0);takeDamage(8,obj.x,ny);}
              }else if(obj.kind==="asteroid"){takeDamage(15,obj.x,ny);
              }else if(obj.kind==="junk"){takeDamage(10,obj.x,ny);
              }else if(obj.kind==="gem"){
                SFX.gem(R.current.sfxOn);
                setGems(g=>g+1);addLabel(obj.x,ny,"💎 +1","#7dd3fc",false);
              }else if(obj.kind==="powerup"){
                SFX.powerup(R.current.sfxOn);
                if(obj.subtype==="shield"){setShield(true);clearTimeout(shieldT.current);shieldT.current=setTimeout(()=>setShield(false),9000);addLabel(obj.x,ny,"SKJOLD!","#38bdf8",true);
                }else if(obj.subtype==="double"){setDouble(true);clearTimeout(doubleT.current);doubleT.current=setTimeout(()=>setDouble(false),12000);addLabel(obj.x,ny,"2× POENG!","#fbbf24",true);
                }else if(obj.subtype==="heal"){setHp(h=>{const n=Math.min(h+10,R.current.maxHp);addLabel(obj.x,ny,"+10 HP","#4ade80",true);return n;});
                }else if(obj.subtype==="maxhp"){setMaxHp(m=>{const nm=m+10;setHp(h=>Math.min(h+10,nm));addLabel(obj.x,ny,"MAX HP↑","#a78bfa",true);return nm;});}
              }
              continue;
            }
            next.push({...obj,y:ny});
          }
          return next;
        });
      }
      animRef.current=requestAnimationFrame(loop);
    };
    animRef.current=requestAnimationFrame(loop);
    return()=>cancelAnimationFrame(animRef.current);
  },[dead,addLabel,takeDamage]);

  const boostPct=boostCD===0?1:1-(boostCD/BOOST_CD);

  return(
    <div style={S.root} tabIndex={0}>
      <style>{CSS}</style>
      <StarField stars={stars} boosting={boosting}/>
      <Planets scroll={scroll}/>
      <CometLayer comets={comets}/>
      <div style={{position:"absolute",inset:0,pointerEvents:"none",
        background:"radial-gradient(ellipse at 25% 40%,rgba(59,130,246,0.06) 0%,transparent 55%)"}}/>

      {Array.from({length:LANE_COUNT-1}).map((_,i)=>(
        <div key={i} style={{position:"absolute",left:(i+1)*LANE_W,top:68,bottom:0,width:1,
          background:"rgba(148,163,184,0.05)"}}/>
      ))}

      <HUD hp={hp} maxHp={maxHp} score={score} factor={factor} shield={shield}
        doublePoints={double} streak={streak} boostPct={boostPct} boosting={boosting}
        gems={gems} sfxOn={sfxOn} musicOn={musicOn}
        onToggleSfx={()=>setSfxOn(v=>!v)} onToggleMusic={()=>setMusicOn(v=>!v)}/>

      <div style={{
        position:"absolute", top:68, left:0, right:0,
        textAlign:"center", padding:"5px 16px",
        background:"rgba(2,8,23,0.7)",
        borderBottom:"1px solid rgba(96,165,250,0.08)",
        fontSize:11, color:"#60a5fa", letterSpacing:1, zIndex:9,
      }}>Fly inn i multipler av {factor} — unngå resten</div>

      {objects.map(obj=>{
        if(obj.kind==="number")   return <NumberObj   key={obj.id} obj={obj}/>;
        if(obj.kind==="asteroid") return <AsteroidObj key={obj.id} obj={obj}/>;
        if(obj.kind==="junk")     return <JunkObj     key={obj.id} obj={obj}/>;
        if(obj.kind==="powerup")  return <PowerupObj  key={obj.id} obj={obj}/>;
        if(obj.kind==="gem")      return <GemObj      key={obj.id} obj={obj}/>;
        return null;
      })}

      <PlayerShip x={(lane+0.5)*LANE_W} damaged={damaged} shield={shield}
        factor={factor} boosting={boosting} slowing={slowing} moveDir={moveDir}/>
      <FloatLabels labels={labels}/>
      <DamageFlash active={damaged}/>
      <BoostFlash active={boosting}/>

      <div style={{position:"absolute",bottom:8,left:"50%",transform:"translateX(-50%)",
        fontSize:10,color:"rgba(148,163,184,0.28)",letterSpacing:2}}>
        ← → BEVEG &nbsp;·&nbsp; ↑ BOOST &nbsp;·&nbsp; ↓ BREMSE &nbsp;·&nbsp; P = PAUSE
      </div>

      <div style={{position:"absolute",bottom:0,left:0,width:"50%",height:90,zIndex:15}}
        onClick={()=>!dead&&setLane(l=>Math.max(0,l-1))}/>
      <div style={{position:"absolute",bottom:0,right:0,width:"50%",height:90,zIndex:15}}
        onClick={()=>!dead&&setLane(l=>Math.min(LANE_COUNT-1,l+1))}/>

      {/* ☰ Menu button */}
      <button
        onClick={()=>setPaused(p=>!p)}
        style={{
          position:"absolute", top:74, right:12, zIndex:11,
          background:"rgba(15,23,42,0.8)", border:"1px solid rgba(96,165,250,0.2)",
          borderRadius:8, color:"#94a3b8", fontSize:18, width:36, height:36,
          cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
          lineHeight:1,
        }}>☰</button>

      {paused&&(
        <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.85)",
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
          gap:16,zIndex:30}}>
          <div style={{fontSize:28,fontWeight:900,color:"#fff",fontFamily:"'Orbitron',monospace",marginBottom:4}}>PAUSE ✋</div>

          {/* Difficulty picker */}
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,
            background:"rgba(15,23,42,0.7)",border:"1px solid rgba(96,165,250,0.15)",
            borderRadius:14,padding:"16px 24px"}}>
            <div style={{fontSize:9,letterSpacing:4,color:"#475569",textTransform:"uppercase"}}>Vanskelighetsgrad</div>
            <div style={{display:"flex",gap:10}}>
              {DIFFICULTIES.map(d=>(
                <button key={d.id} onClick={()=>setActiveDiff(d.id)} style={{
                  padding:"8px 14px", borderRadius:10, cursor:"pointer",
                  background:activeDiff===d.id?"rgba(30,58,138,0.6)":"rgba(15,23,42,0.8)",
                  border:activeDiff===d.id?"2px solid #60a5fa":"2px solid rgba(100,116,139,0.2)",
                  color:activeDiff===d.id?"#fff":"#64748b",
                  fontSize:12, fontWeight:700, letterSpacing:1,
                  transition:"all 0.15s",
                }}>{d.label}</button>
              ))}
            </div>
          </div>

          <button style={S.btn} onClick={()=>setPaused(false)}>Fortsett!</button>
          <button style={{...S.btn,background:"transparent",color:"#64748b",border:"1px solid #334155"}}
            onClick={onMenu}>🏠 Hjem</button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   NAME ENTRY
───────────────────────────────────────────── */
function NameEntry({score,factor,gems,onDone}){
  const [name,setName]=useState("");
  const submit=()=>{addScore(name.trim()||"Anonym",score,factor,gems);onDone();};
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14,
      background:"rgba(15,23,42,0.95)",border:"1px solid rgba(96,165,250,0.2)",
      borderRadius:16,padding:"24px 32px",maxWidth:320,width:"100%"}}>
      <div style={{fontSize:13,color:"#94a3b8",letterSpacing:2}}>SKRIV INN NAVN</div>
      <input autoFocus value={name} onChange={e=>setName(e.target.value)}
        onKeyDown={e=>e.key==="Enter"&&submit()} maxLength={12} placeholder="Ditt navn..."
        style={{background:"rgba(30,41,59,0.9)",border:"1.5px solid #334155",borderRadius:8,
          color:"#fff",fontSize:18,fontWeight:700,padding:"10px 16px",textAlign:"center",
          outline:"none",fontFamily:"'Orbitron',monospace",width:"100%"}}/>
      <button style={S.startBtn} onClick={submit}>Lagre →</button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   HIGH SCORE TABLE
───────────────────────────────────────────── */
function HighScoreTable(){
  const scores=getScores();
  if(!scores.length) return <div style={{fontSize:12,color:"#334155",letterSpacing:2,marginTop:8}}>Ingen rekorder ennå — vær den første!</div>;
  return(
    <div style={{width:"100%",maxWidth:420}}>
      <div style={{fontSize:10,letterSpacing:4,color:"#475569",textAlign:"center",marginBottom:10}}>🏆 TOPPLISTE</div>
      {scores.map((s,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 12px",marginBottom:4,
          borderRadius:8,
          background:i===0?"rgba(251,191,36,0.08)":"rgba(15,23,42,0.6)",
          border:i===0?"1px solid #fbbf2433":"1px solid rgba(100,116,139,0.12)"}}>
          <span style={{fontSize:14,minWidth:22,textAlign:"center"}}>{["🥇","🥈","🥉"][i]||`${i+1}.`}</span>
          <span style={{flex:1,fontSize:13,fontWeight:700,color:i===0?"#fbbf24":"#e2e8f0"}}>{s.name}</span>
          <span style={{fontSize:11,color:"#7dd3fc"}}>💎{s.gems||0}</span>
          <span style={{fontSize:10,color:"#64748b",fontFamily:"monospace"}}>×{s.factor}</span>
          <span style={{fontSize:14,fontWeight:900,color:"#fff",fontFamily:"'Orbitron',monospace",minWidth:56,textAlign:"right"}}>{s.score}</span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   GAME OVER
───────────────────────────────────────────── */
function GameOverScreen({factor,score,gems,onMenu}){
  const [entered,setEntered]=useState(false);
  const [stars]=useState(makeStars);
  return(
    <div style={S.root}>
      <style>{CSS}</style>
      <StarField stars={stars}/>
      <div style={{position:"relative",zIndex:5,display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",height:"100%",gap:18,padding:24}}>
        <div style={{fontSize:56}}>💥</div>
        <div style={{fontSize:32,fontWeight:900,fontFamily:"'Orbitron',monospace",color:"#ef4444"}}>GAME OVER</div>
        <div style={{fontSize:14,color:"#94a3b8",display:"flex",gap:20}}>
          <span>Faktor <strong style={{color:"#fff"}}>×{factor}</strong></span>
          <span>Poeng <strong style={{color:"#fff"}}>{score}</strong></span>
          <span>💎 <strong style={{color:"#7dd3fc"}}>{gems}</strong></span>
        </div>
        {!entered
          ?<NameEntry score={score} factor={factor} gems={gems} onDone={()=>setEntered(true)}/>
          :<><HighScoreTable/><button style={{...S.startBtn,marginTop:12}} onClick={onMenu}>Spill igjen</button></>
        }
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   LANDING SCREEN  (new start page)
───────────────────────────────────────────── */
function LandingScreen({onPlay,onHighscores,onInfo,sfxOn,setSfxOn,musicOn,setMusicOn}){
  const [stars]=useState(makeStars);
  const comets=useComets();
  return(
    <div style={S.root}>
      <style>{CSS}</style>
      <StarField stars={stars}/>
      <Planets scroll={0}/>
      <CometLayer comets={comets}/>
      <div style={{position:"absolute",inset:0,pointerEvents:"none",
        background:"radial-gradient(ellipse at 25% 40%,rgba(59,130,246,0.09) 0%,transparent 58%),radial-gradient(ellipse at 75% 60%,rgba(139,92,246,0.09) 0%,transparent 58%)"}}/>

      {/* back to arcade */}
      <a href="../elever.html" style={{position:"absolute",top:16,left:16,zIndex:10,
        fontSize:11,letterSpacing:2,color:"#475569",textDecoration:"none",
        padding:"6px 12px",borderRadius:8,
        border:"1px solid rgba(100,116,139,0.2)",
        background:"rgba(15,23,42,0.55)"}}>← ARKADE</a>

      {/* sound toggles */}
      <div style={{position:"absolute",top:16,right:16,display:"flex",gap:8,zIndex:10}}>
        <button onClick={()=>setSfxOn(v=>!v)} style={{...S.btn,padding:"6px 10px",fontSize:16,opacity:sfxOn?1:0.35}}>🔊</button>
        <button onClick={()=>setMusicOn(v=>!v)} style={{...S.btn,padding:"6px 10px",fontSize:16,opacity:musicOn?1:0.35}}>🎵</button>
      </div>

      <div style={{position:"relative",zIndex:5,display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",height:"100%",gap:40,padding:24}}>

        <div style={{textAlign:"center",animation:"drift 4s ease-in-out infinite"}}>
          <div style={{fontSize:52,fontWeight:900,fontFamily:"'Orbitron',monospace",
            color:"#fff",lineHeight:1,animation:"glow 3s ease-in-out infinite"}}>
            ROCKET<span style={{color:"#60a5fa"}}>RAIDER</span>
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14,width:"100%",maxWidth:280}}>
          <button onClick={onPlay} style={{
            ...S.startBtn, width:"100%", fontSize:20, padding:"18px 0",
            letterSpacing:3,
          }}>SPILL</button>

          <button onClick={onHighscores} style={{
            ...S.btn, width:"100%", textAlign:"center",
            fontSize:22, padding:"14px 0",
          }}>🏆</button>

          <button onClick={onInfo} style={{
            background:"transparent",
            border:"2px solid rgba(100,116,139,0.3)",
            borderRadius:12, color:"#64748b",
            fontWeight:700, fontSize:14,
            padding:"13px 0", cursor:"pointer",
            width:"100%", textAlign:"center",
            transition:"all 0.2s",
            letterSpacing:1,
          }}>Faktor?? O.o</button>
        </div>

        <div style={{position:"absolute",bottom:20,left:0,right:0,textAlign:"center",
          fontSize:10,letterSpacing:4,color:"#1e293b"}}>MATTESPILL LAGET AV LEKTOR TRONRUD</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   INFO SCREEN  (what is a factor?)
───────────────────────────────────────────── */
function InfoScreen({onBack}){
  const [stars]=useState(makeStars);
  const comets=useComets();
  return(
    <div style={S.root}>
      <style>{CSS}</style>
      <StarField stars={stars}/>
      <CometLayer comets={comets}/>
      <div style={{position:"absolute",inset:0,pointerEvents:"none",
        background:"radial-gradient(ellipse at 30% 50%,rgba(59,130,246,0.07) 0%,transparent 60%)"}}/>

      <div style={{position:"relative",zIndex:5,display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",height:"100%",padding:"80px 40px 80px 40px",gap:0,
        overflowY:"auto"}}>

        <div style={{maxWidth:520,width:"100%",paddingTop:56,paddingBottom:16}}>
          {/* heading 1 */}
          <div style={{fontSize:22,fontWeight:900,color:"#fff",fontFamily:"'Orbitron',monospace",
            marginBottom:24,letterSpacing:1}}>
            Hva er en faktor?
          </div>

          <div style={{
            background:"rgba(30,58,138,0.25)",border:"1px solid rgba(96,165,250,0.2)",
            borderRadius:14,padding:"32px 36px",marginBottom:52,
          }}>
            <div style={{fontSize:18,fontWeight:700,color:"#93c5fd",marginBottom:18,
              fontFamily:"'Orbitron',monospace",letterSpacing:2}}>
              faktor · faktor = produkt
            </div>
            <p style={{color:"#cbd5e1",fontSize:14,lineHeight:1.75,margin:"0 0 22px 0"}}>
              Når to tall ganges sammen, er begge tallene faktorer i svaret.
            </p>
            <div style={{background:"rgba(15,23,42,0.6)",borderRadius:10,padding:"20px 24px",marginBottom:22}}>
              <div style={{fontSize:12,letterSpacing:3,color:"#475569",marginBottom:12}}>EKSEMPEL</div>
              <div style={{fontSize:16,color:"#fff",fontWeight:700,marginBottom:6}}>
                Siden <span style={{color:"#60a5fa"}}>3</span> · <span style={{color:"#60a5fa"}}>4</span> = <span style={{color:"#4ade80"}}>12</span>, er både{" "}
                <span style={{color:"#60a5fa"}}>3</span> og <span style={{color:"#60a5fa"}}>4</span> faktorer i <span style={{color:"#4ade80"}}>12</span>.
              </div>
            </div>
            <p style={{color:"#94a3b8",fontSize:13,lineHeight:1.7,margin:0,fontStyle:"italic"}}>
              12 har faktisk ganske mange faktorer! Se om du kan finne alle! 🔍
            </p>
          </div>

          {/* heading 2 */}
          <div style={{fontSize:22,fontWeight:900,color:"#fff",fontFamily:"'Orbitron',monospace",
            marginBottom:24,letterSpacing:1}}>
            Hvorfor er dette viktig?
          </div>

          <div style={{
            background:"rgba(30,58,138,0.25)",border:"1px solid rgba(96,165,250,0.2)",
            borderRadius:14,padding:"32px 36px",marginBottom:52,
          }}>
            <p style={{color:"#cbd5e1",fontSize:14,lineHeight:1.8,margin:0}}>
              Alle tall er bygget opp av faktorer, som{" "}
              <span style={{color:"#fbbf24",fontWeight:700}}>legoklosser</span>.
              Når du vet hvilke faktorer et tall har, blir det mye lettere å regne.
              Da kan du forenkle brøker, dele ting likt og se mønstre i tallene.
            </p>
          </div>

          <button onClick={onBack} style={{
            ...S.btn, display:"block", width:"100%", textAlign:"center",
          }}>← Tilbake</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SETUP SCREEN  (factor + difficulty picker)
───────────────────────────────────────────── */
function SetupScreen({onStart,onBack,sfxOn,setSfxOn,musicOn,setMusicOn}){
  const [selected,setSelected]=useState(null);
  const [selDiff,setSelDiff]=useState("medium");
  const [stars]=useState(makeStars);
  const comets=useComets();

  const canStart=selected!==null;
  const handleStart=()=>onStart(selected,selDiff);

  return(
    <div style={S.root}>
      <style>{CSS}</style>
      <StarField stars={stars}/>
      <Planets scroll={0}/>
      <CometLayer comets={comets}/>
      <div style={{position:"absolute",inset:0,pointerEvents:"none",
        background:"radial-gradient(ellipse at 25% 40%,rgba(59,130,246,0.09) 0%,transparent 58%),radial-gradient(ellipse at 75% 60%,rgba(139,92,246,0.09) 0%,transparent 58%)"}}/>

      {/* sound toggles */}
      <div style={{position:"absolute",top:16,right:16,display:"flex",gap:8,zIndex:10}}>
        <button onClick={()=>setSfxOn(v=>!v)} style={{...S.btn,padding:"6px 10px",fontSize:16,opacity:sfxOn?1:0.35}}>🔊</button>
        <button onClick={()=>setMusicOn(v=>!v)} style={{...S.btn,padding:"6px 10px",fontSize:16,opacity:musicOn?1:0.35}}>🎵</button>
      </div>

      <div style={{position:"relative",zIndex:5,display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",height:"100%",padding:24}}>

        <div style={{textAlign:"center",animation:"drift 4s ease-in-out infinite",marginBottom:44}}>
          <div style={{fontSize:46,fontWeight:900,fontFamily:"'Orbitron',monospace",
            color:"#fff",lineHeight:1,animation:"glow 3s ease-in-out infinite"}}>
            ROCKET<span style={{color:"#60a5fa"}}>RAIDER</span>
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12,marginBottom:44}}>
          <div style={{fontSize:10,letterSpacing:4,color:"#475569",textTransform:"uppercase"}}>Velg tallfaktor</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:10,justifyContent:"center",maxWidth:480}}>
            {ALL_FACTORS.map(f=>{
              const on=selected===f;
              return(
                <button key={f} onClick={()=>setSelected(f)} style={{
                  width:66,height:66,borderRadius:14,cursor:"pointer",
                  background:on?"radial-gradient(circle,#1d4ed8,#1e3a8a)":"rgba(15,23,42,0.88)",
                  border:on?"2px solid #60a5fa":"2px solid rgba(100,116,139,0.22)",
                  color:on?"#fff":"#64748b",fontSize:26,fontWeight:900,fontFamily:"'Orbitron',monospace",
                  boxShadow:on?"0 0 20px #3b82f666":"none",transition:"all 0.17s",
                }}>{f}</button>
              );
            })}
          </div>
        </div>

        <div style={{display:"flex",gap:12,marginTop:0,marginBottom:32}}>
          {DIFFICULTIES.map(d=>(
            <button key={d.id} onClick={()=>setSelDiff(d.id)} style={{
              display:"flex",flexDirection:"column",alignItems:"center",gap:4,
              padding:"10px 14px",borderRadius:12,cursor:"pointer",
              background:selDiff===d.id?"rgba(30,58,138,0.55)":"rgba(15,23,42,0.8)",
              border:selDiff===d.id?"2px solid #60a5fa":"2px solid rgba(100,116,139,0.2)",
              color:selDiff===d.id?"#fff":"#64748b",
              boxShadow:selDiff===d.id?"0 0 16px #3b82f644":"none",
              transition:"all 0.15s", minWidth:72,
            }}>
              <span style={{fontSize:11,fontWeight:700,letterSpacing:1}}>{d.label}</span>
            </button>
          ))}
        </div>

        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <button onClick={onBack} style={{...S.btn,padding:"14px 18px",fontSize:18}}>←</button>
          <button disabled={!canStart} onClick={handleStart} style={{
            ...S.startBtn,opacity:canStart?1:0.28,cursor:canStart?"pointer":"not-allowed"}}>START</button>
        </div>

        <div style={{position:"absolute",bottom:20,left:0,right:0,textAlign:"center",
          fontSize:10,letterSpacing:4,color:"#1e293b"}}>MATTESPILL LAGET AV LEKTOR TRONRUD</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   HIGH SCORE SCREEN  (standalone)
───────────────────────────────────────────── */
function HighScoreScreen({onBack}){
  const [stars]=useState(makeStars);
  return(
    <div style={S.root}>
      <style>{CSS}</style>
      <StarField stars={stars}/>
      <div style={{position:"relative",zIndex:5,display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",height:"100%",gap:24,padding:24}}>
        <div style={{fontSize:24,fontWeight:900,color:"#fff",fontFamily:"'Orbitron',monospace",letterSpacing:2}}>
          🏆 TOPPLISTE
        </div>
        <HighScoreTable/>
        <button style={S.btn} onClick={onBack}>← Tilbake</button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ROOT
───────────────────────────────────────────── */
function App(){
  const [screen,setScreen]     = useState("landing");
  const [factor,setFactor]     = useState(null);
  const [difficulty,setDifficulty] = useState("medium");
  const [finalScore,setFinalScore] = useState(0);
  const [finalGems,setFinalGems]   = useState(0);
  const [sfxOn,setSfxOn]       = useState(true);
  const [musicOn,setMusicOn]   = useState(true);

  if(screen==="landing")    return <LandingScreen
    onPlay={()=>setScreen("setup")} onHighscores={()=>setScreen("highscores")} onInfo={()=>setScreen("info")}
    sfxOn={sfxOn} setSfxOn={setSfxOn} musicOn={musicOn} setMusicOn={setMusicOn}/>;
  if(screen==="info")       return <InfoScreen onBack={()=>setScreen("landing")}/>;
  if(screen==="highscores") return <HighScoreScreen onBack={()=>setScreen("landing")}/>;
  if(screen==="setup")      return <SetupScreen
    onStart={(f,d)=>{setFactor(f);setDifficulty(d);setScreen("game");}}
    onBack={()=>setScreen("landing")}
    sfxOn={sfxOn} setSfxOn={setSfxOn} musicOn={musicOn} setMusicOn={setMusicOn}/>;
  if(screen==="game")       return <GameScreen factor={factor} difficulty={difficulty}
    onGameOver={(s,g)=>{setFinalScore(s);setFinalGems(g);setScreen("gameover");}}
    onMenu={()=>setScreen("landing")}
    sfxOn={sfxOn} setSfxOn={setSfxOn} musicOn={musicOn} setMusicOn={setMusicOn}/>;
  return <GameOverScreen factor={factor} score={finalScore} gems={finalGems}
    onMenu={()=>setScreen("landing")}/>;
}

/* ─────────────────────────────────────────────
   STYLES + CSS
───────────────────────────────────────────── */
const S={
  root:{width:"100%",height:"100vh",maxWidth:W,margin:"0 auto",
    background:"#020817",position:"relative",overflow:"hidden",outline:"none"},
  btn:{background:"rgba(30,58,138,0.55)",border:"1px solid #3b82f6",
    borderRadius:10,color:"#fff",fontWeight:700,fontSize:14,padding:"10px 28px",cursor:"pointer"},
  startBtn:{background:"linear-gradient(135deg,#1d4ed8,#1e40af)",border:"none",
    borderRadius:12,color:"#fff",fontWeight:900,fontSize:16,fontFamily:"'Orbitron',monospace",
    padding:"14px 44px",cursor:"pointer",letterSpacing:2,boxShadow:"0 0 24px #3b82f655",transition:"all 0.2s"},
};

const CSS=`
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Exo+2:wght@400;600;700&display=swap');
  @keyframes thruster      { from{height:24px;opacity:0.8} to{height:34px;opacity:1} }
  @keyframes thrusterBoost { from{height:36px;opacity:0.9} to{height:48px;opacity:1} }
  @keyframes floatPulse    { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-8px) scale(1.06)} }
  @keyframes flashIn       { 0%{opacity:1} 100%{opacity:0} }
  @keyframes floatUp       { 0%{transform:translateY(0);opacity:1} 100%{transform:translateY(-60px);opacity:0} }
  @keyframes drift         { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  @keyframes glow          { 0%,100%{text-shadow:0 0 20px #60a5fa,0 0 40px #3b82f644} 50%{text-shadow:0 0 32px #93c5fd,0 0 60px #3b82f666} }
  @keyframes rockPulse     { 0%,100%{opacity:0.5} 50%{opacity:1} }
  @keyframes junkBlink     { 0%,100%{opacity:0.4} 50%{opacity:1} }
  @keyframes retroFlame    { from{width:8px;opacity:0.6} to{width:14px;opacity:1} }
  @keyframes gemSpin       { 0%{transform:rotateY(0deg)} 100%{transform:rotateY(360deg)} }
  * { box-sizing:border-box; font-family:'Exo 2',sans-serif; }
  input::placeholder { color:#475569; }
`;

/* Mount */
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
