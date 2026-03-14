// ═══════════════════════════════════════════════════════════════
//  ZvZ Tactical Planner v4
//  All features: themes, zoom/pan, large maps, erase shapes only,
//  skill image effects, text labels, playback speed, snapshots,
//  notes panel, grid snap, duplicate unit, path smoothing,
//  presentation mode, donation modal, session autosave
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Input }      from "@/components/ui/input";
import { Label }      from "@/components/ui/label";
import { Slider }     from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Play, Pause, RotateCcw, Upload, Save, Trash2,
  Route, MousePointer2, Plus, Download, Clock,
  Map, X, Timer, Users, MoveIcon, Pen,
  Circle, Triangle, ArrowRight, Square, Minus,
  ChevronDown, ZoomIn, ZoomOut, Maximize2, Heart,
  Copy, Type, StickyNote, Camera, Layers,
} from "lucide-react";

// ─── PRESET ROLE ICONS ───────────────────────────────────────
const PRESET_ICONS = {
  mdps:       ["/assets/roles/dps1.png","/assets/roles/dps2.png","/assets/roles/dps3.png","/assets/roles/dps4.png","/assets/roles/dps5.png","/assets/roles/dps6.png","/assets/roles/dps7.png","/assets/roles/dps8.png"],
  rdps:       ["/assets/roles/dps1.png","/assets/roles/dps2.png","/assets/roles/dps3.png","/assets/roles/dps4.png","/assets/roles/dps5.png","/assets/roles/dps6.png","/assets/roles/dps7.png","/assets/roles/dps8.png"],
  healer:     ["/assets/roles/healer1.png","/assets/roles/healer2.png"],
  support:    ["/assets/roles/support1.png","/assets/roles/support2.png","/assets/roles/support3.png","/assets/roles/support4.png"],
  tank:       ["/assets/roles/tank1.png","/assets/roles/tank2.png","/assets/roles/tank3.png"],
  frontline:  ["/assets/roles/tank1.png","/assets/roles/tank2.png","/assets/roles/tank3.png"],
  shotcaller: ["/assets/roles/support1.png","/assets/roles/support2.png","/assets/roles/support3.png","/assets/roles/support4.png"],
  clapper:    ["/assets/roles/dps1.png","/assets/roles/dps2.png","/assets/roles/dps3.png","/assets/roles/dps4.png"],
};

// ─── PRESET MAPS ─────────────────────────────────────────────
const PRESET_MAPS = [
  { label: "Snow",  src: "/assets/maps/Snow_Map.png"  },
  { label: "Swamp", src: "/assets/maps/Swamp_Map.png" },
];
const THEMES = {
  tactical: {
    name: "Tactical",
    bg:         "#060810",
    panel:      "#0b0f1a",
    panel2:     "#080c15",
    panelGlass: "rgba(11,15,26,0.92)",
    border:     "rgba(56,189,248,0.1)",
    borderHov:  "rgba(56,189,248,0.25)",
    text:       "#e2e8f0",
    dim:        "#4a5568",
    accent:     "#f59e0b",
    accent2:    "#38bdf8",
    accentDim:  "#b45309",
    accentBg:   "rgba(245,158,11,0.12)",
    accentGlow: "0 0 16px rgba(245,158,11,0.35)",
    btnActive:  "linear-gradient(135deg,rgba(245,158,11,0.25),rgba(245,158,11,0.1))",
    canvasBg:   "#040608",
    mapBg1:     "#070b12",
    mapBg2:     "#0c1420",
  },
  albion: {
    name: "Albion",
    bg:         "#0e0a06",
    panel:      "#1a1208",
    panel2:     "#140e06",
    panelGlass: "rgba(26,18,8,0.92)",
    border:     "rgba(251,191,36,0.1)",
    borderHov:  "rgba(251,191,36,0.28)",
    text:       "#f0dfc0",
    dim:        "#6b5a3e",
    accent:     "#f59e0b",
    accent2:    "#fb923c",
    accentDim:  "#92400e",
    accentBg:   "rgba(245,158,11,0.12)",
    accentGlow: "0 0 16px rgba(245,158,11,0.4)",
    btnActive:  "linear-gradient(135deg,rgba(245,158,11,0.28),rgba(245,158,11,0.1))",
    canvasBg:   "#080500",
    mapBg1:     "#100b04",
    mapBg2:     "#1a1008",
  },
};

// ─── CONSTANTS ───────────────────────────────────────────────
const CANVAS_W       = 3840;
const CANVAS_H       = 2160;
const UNIT_R         = 90;
const SKILL_FLASH_MS = 1800;
const AUTOSAVE_KEY   = "zvz_autosave";
const MAX_AUTOSAVES  = 10;

const ROLE_PRESETS = [
  { type:"tank",       label:"Tank",       color:"#3b82f6", letter:"T" },
  { type:"healer",     label:"Healer",     color:"#22c55e", letter:"H" },
  { type:"mdps",       label:"Melee DPS",  color:"#ef4444", letter:"M" },
  { type:"rdps",       label:"Ranged DPS", color:"#f59e0b", letter:"R" },
  { type:"support",    label:"Support",    color:"#8b5cf6", letter:"S" },
  { type:"shotcaller", label:"Caller",     color:"#06b6d4", letter:"C" },
  { type:"clapper",    label:"Clapper",    color:"#e11d48", letter:"X" },
  { type:"frontline",  label:"Frontline",  color:"#64748b", letter:"F" },
];

const SHAPE_COLORS = ["#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#8b5cf6","#ec4899","#ffffff","#94a3b8"];

// ─── UTILS ───────────────────────────────────────────────────
function uid(p="id"){ return `${p}_${Math.random().toString(36).slice(2,9)}`; }
function clamp(v,lo,hi){ return Math.max(lo,Math.min(hi,v)); }
function dist(a,b){ return Math.hypot(b.x-a.x,b.y-a.y); }
function pathLen(pts){ let t=0; for(let i=0;i<pts.length-1;i++) t+=dist(pts[i],pts[i+1]); return t; }

function snapToGrid(v,snap){ return snap>0?Math.round(v/snap)*snap:v; }

function posAtTime(unit,t){
  const {path,speed=200,delay=0,x,y}=unit;
  if(!path||path.length<2) return {x,y};
  const len=pathLen(path),end=delay+len/speed;
  if(t<=delay) return {x:path[0].x,y:path[0].y};
  if(t>=end)   return {x:path[path.length-1].x,y:path[path.length-1].y};
  let rem=(t-delay)*speed;
  for(let i=0;i<path.length-1;i++){
    const s=dist(path[i],path[i+1]);
    if(rem<=s){ const tf=s===0?0:rem/s; return {x:path[i].x+(path[i+1].x-path[i].x)*tf,y:path[i].y+(path[i+1].y-path[i].y)*tf}; }
    rem-=s;
  }
  return {x:path[path.length-1].x,y:path[path.length-1].y};
}

function calcTotalDuration(units){
  let max=8;
  for(const u of units){
    if(u.path?.length>=2){ const d=(u.delay||0)+pathLen(u.path)/(u.speed||200); if(d>max) max=d; }
    for(const sk of u.skills||[]){ const t=sk.triggerTime+(sk.duration||SKILL_FLASH_MS)/1000+1; if(t>max) max=t; }
  }
  return max;
}

function getRoleColor(r) { return ROLE_PRESETS.find(p=>p.type===r)?.color||"#94a3b8"; }
function getRoleLetter(r){ return ROLE_PRESETS.find(p=>p.type===r)?.letter||"?"; }
function getRoleLabel(r) { return ROLE_PRESETS.find(p=>p.type===r)?.label||r; }

// Smooth catmull-rom path
function catmullRomPoints(pts, segments=12){
  if(pts.length<2) return pts;
  const out=[];
  const p=pts;
  for(let i=0;i<p.length-1;i++){
    const p0=p[Math.max(0,i-1)], p1=p[i], p2=p[i+1], p3=p[Math.min(p.length-1,i+2)];
    for(let t=0;t<segments;t++){
      const tt=t/segments, tt2=tt*tt, tt3=tt2*tt;
      const x=0.5*((2*p1.x)+(-p0.x+p2.x)*tt+(2*p0.x-5*p1.x+4*p2.x-p3.x)*tt2+(-p0.x+3*p1.x-3*p2.x+p3.x)*tt3);
      const y=0.5*((2*p1.y)+(-p0.y+p2.y)*tt+(2*p0.y-5*p1.y+4*p2.y-p3.y)*tt2+(-p0.y+3*p1.y-3*p2.y+p3.y)*tt3);
      out.push({x,y});
    }
  }
  out.push(p[p.length-1]);
  return out;
}

// ─── SHAPE RENDERER ──────────────────────────────────────────
function renderShape(ctx,shape,alpha=1){
  const {type,x1,y1,x2,y2,color,lineWidth=2.5,fill=false,points,text,fontSize=18}=shape;
  ctx.save();
  ctx.globalAlpha=alpha; ctx.strokeStyle=color||"#ef4444";
  ctx.fillStyle=fill?(color||"#ef4444")+"55":"transparent";
  ctx.lineWidth=lineWidth; ctx.lineCap="round"; ctx.lineJoin="round";
  switch(type){
    case "draw":
      if(!points||points.length<2) break;
      ctx.beginPath(); ctx.moveTo(points[0].x,points[0].y);
      for(let i=1;i<points.length;i++) ctx.lineTo(points[i].x,points[i].y);
      ctx.stroke(); break;
    case "arrow":{
      const dx=x2-x1,dy=y2-y1,l=Math.hypot(dx,dy); if(l<5) break;
      const sz=Math.max(16, lineWidth*5);
      // shorten line so it doesn't poke through arrowhead
      const ux=dx/l,uy=dy/l;
      const tipX=x2, tipY=y2;
      const lineEndX=x2-ux*sz*0.8, lineEndY=y2-uy*sz*0.8;
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(lineEndX,lineEndY); ctx.stroke();
      ctx.fillStyle=color||"#ef4444"; ctx.globalAlpha=alpha;
      ctx.beginPath(); ctx.moveTo(tipX,tipY);
      ctx.lineTo(tipX-ux*sz-uy*sz*0.45,tipY-uy*sz+ux*sz*0.45);
      ctx.lineTo(tipX-ux*sz+uy*sz*0.45,tipY-uy*sz-ux*sz*0.45);
      ctx.closePath(); ctx.fill(); break;
    }
    case "circle":{
      const rx=Math.abs(x2-x1)/2,ry=Math.abs(y2-y1)/2,cx=(x1+x2)/2,cy=(y1+y2)/2;
      ctx.beginPath(); ctx.ellipse(cx,cy,rx||4,ry||4,0,0,Math.PI*2);
      if(fill) ctx.fill(); ctx.stroke(); break;
    }
    case "rect":{
      const w=x2-x1,h=y2-y1;
      if(fill) ctx.fillRect(x1,y1,w,h); ctx.strokeRect(x1,y1,w,h); break;
    }
    case "triangle":{
      const mx=(x1+x2)/2;
      ctx.beginPath(); ctx.moveTo(mx,y1); ctx.lineTo(x2,y2); ctx.lineTo(x1,y2); ctx.closePath();
      if(fill) ctx.fill(); ctx.stroke(); break;
    }
    case "line":
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); break;
    case "text":
      ctx.font=`bold ${fontSize}px 'Rajdhani',sans-serif`;
      ctx.fillStyle=color||"#ffffff";
      ctx.globalAlpha=alpha;
      ctx.textBaseline="top";
      // shadow for readability
      ctx.shadowColor="rgba(0,0,0,0.8)"; ctx.shadowBlur=4;
      ctx.fillText(text||"",x1,y1);
      ctx.shadowBlur=0;
      break;
  }
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════
//  APP
// ═══════════════════════════════════════════════════════════════
export default function App(){

  // ── Core state ───────────────────────────────────────────
  const [units,         setUnits]         = useState([]);
  const [shapes,        setShapes]        = useState([]);
  const [textLabels,    setTextLabels]    = useState([]); // {id,x,y,text,color,fontSize}
  const [selId,         setSelId]         = useState(null);
  const [mode,          setMode]          = useState("place");
  const [shapeTool,     setShapeTool]     = useState("arrow");
  const [shapeColor,    setShapeColor]    = useState("#ef4444");
  const [shapeFill,     setShapeFill]     = useState(false);
  const [shapeSize,     setShapeSize]     = useState(2.5);
  const [eraseSize,     setEraseSize]     = useState(30);
  const [unitScale,     setUnitScale]     = useState(1);
  const [selTeam,       setSelTeam]       = useState("A");
  const [mapImg,        setMapImg]        = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [isDrawPath,    setIsDrawPath]    = useState(false);
  const [playing,       setPlaying]       = useState(false);
  const [curTime,       setCurTime]       = useState(0);
  const [skillFlashes,  setSkillFlashes]  = useState({});
  const [showRoleMenu,  setShowRoleMenu]  = useState(false);
  const [selRole,       setSelRole]       = useState("tank");
  const [gridSnap,      setGridSnap]      = useState(0);  // 0=off, 40=on
  const [smoothPaths,   setSmoothPaths]   = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [theme,         setTheme]         = useState("tactical");
  const [presentMode,   setPresentMode]   = useState(false);
  const [showDonate,    setShowDonate]    = useState(false);
  const [showNotes,     setShowNotes]     = useState(false);
  const [notes,         setNotes]         = useState("");
  const [snapshots,     setSnapshots]     = useState([]); // [{id,name,units,shapes,textLabels}]
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [textInput,     setTextInput]     = useState("");
  const [textColor,     setTextColor]     = useState("#ffffff");
  const [textSize,      setTextSize]      = useState(18);
  const [showTextInput, setShowTextInput] = useState(false);
  const [pendingTextPos,setPendingTextPos]= useState(null);

  // Zoom/Pan
  const [zoom,    setZoom]    = useState(1);
  const [panX,    setPanX]    = useState(0);
  const [panY,    setPanY]    = useState(0);
  const isPanning   = useRef(false);
  const panStart    = useRef({x:0,y:0,px:0,py:0});

  const T = THEMES[theme] || THEMES.tactical;

  // ── Refs ──────────────────────────────────────────────────
  const canvasRef       = useRef(null);
  const wrapRef         = useRef(null);
  const mouseRef        = useRef({x:0,y:0});
  const dragRef         = useRef(null);
  const imgCache        = useRef({});
  const timeRef         = useRef(0);
  const playRef         = useRef(false);
  const lastTsRef       = useRef(null);
  const rafRef          = useRef(null);
  const firedRef        = useRef(new Set());
  const drawPending     = useRef(false);
  const shapeStartRef   = useRef(null);
  const shapeLiveRef    = useRef(null);
  const drawPointsRef   = useRef([]);
  const isErasingRef    = useRef(false);

  // mirror mutable state into refs
  const unitsRef        = useRef([]);
  const shapesRef       = useRef([]);
  const textLabelsRef   = useRef([]);
  const selIdRef        = useRef(null);
  const mapImgRef       = useRef(null);
  const isDrawPathRef   = useRef(false);
  const skillFlashRef   = useRef({});
  const selUnitRef      = useRef(null);
  const modeRef         = useRef("place");
  const shapeToolRef    = useRef("arrow");
  const shapeColorRef   = useRef("#ef4444");
  const shapeFillRef    = useRef(false);
  const shapeSizeRef    = useRef(2.5);
  const eraseSizeRef    = useRef(30);
  const unitScaleRef    = useRef(1);
  const gridSnapRef     = useRef(0);
  const smoothRef       = useRef(false);
  const zoomRef         = useRef(1);
  const panXRef         = useRef(0);
  const panYRef         = useRef(0);

  useEffect(()=>{unitsRef.current=units;},[units]);
  useEffect(()=>{shapesRef.current=shapes;},[shapes]);
  useEffect(()=>{textLabelsRef.current=textLabels;},[textLabels]);
  useEffect(()=>{selIdRef.current=selId;},[selId]);
  useEffect(()=>{mapImgRef.current=mapImg;},[mapImg]);
  useEffect(()=>{isDrawPathRef.current=isDrawPath;},[isDrawPath]);
  useEffect(()=>{skillFlashRef.current=skillFlashes;},[skillFlashes]);
  useEffect(()=>{modeRef.current=mode;},[mode]);
  useEffect(()=>{shapeToolRef.current=shapeTool;},[shapeTool]);
  useEffect(()=>{shapeColorRef.current=shapeColor;},[shapeColor]);
  useEffect(()=>{shapeFillRef.current=shapeFill;},[shapeFill]);
  useEffect(()=>{shapeSizeRef.current=shapeSize;},[shapeSize]);
  useEffect(()=>{eraseSizeRef.current=eraseSize;},[eraseSize]);
  useEffect(()=>{unitScaleRef.current=unitScale;scheduleDraw();},[unitScale]);
  useEffect(()=>{gridSnapRef.current=gridSnap;},[gridSnap]);
  useEffect(()=>{smoothRef.current=smoothPaths;},[smoothPaths]);
  useEffect(()=>{zoomRef.current=zoom;},[zoom]);
  useEffect(()=>{panXRef.current=panX;},[panX]);
  useEffect(()=>{panYRef.current=panY;},[panY]);

  const selUnit  = useMemo(()=>units.find(u=>u.id===selId)||null,[units,selId]);
  const duration = useMemo(()=>calcTotalDuration(units),[units]);
  useEffect(()=>{selUnitRef.current=selUnit;},[selUnit]);

  // ── Canvas scale ──────────────────────────────────────────
  const [canvasScale,setCanvasScale]=useState(1);
  const canvasScaleRef=useRef(1);
  useEffect(()=>{
    function resize(){
      if(!wrapRef.current) return;
      const sc=Math.min(wrapRef.current.offsetWidth/CANVAS_W, wrapRef.current.offsetHeight/CANVAS_H);
      setCanvasScale(sc); canvasScaleRef.current=sc;
    }
    resize();
    const ro=new ResizeObserver(resize);
    if(wrapRef.current) ro.observe(wrapRef.current);
    return()=>ro.disconnect();
  },[]);

  // ── Autosave ──────────────────────────────────────────────
  useEffect(()=>{
    if(units.length===0&&shapes.length===0) return;
    try{
      const saves=JSON.parse(localStorage.getItem(AUTOSAVE_KEY)||"[]");
      saves.unshift({ts:Date.now(),units,shapes,textLabels,notes});
      localStorage.setItem(AUTOSAVE_KEY,JSON.stringify(saves.slice(0,MAX_AUTOSAVES)));
    }catch(e){}
  },[units,shapes,textLabels]);

  // ── Image loader ──────────────────────────────────────────
  function loadImg(url){
    if(!url) return null;
    if(imgCache.current[url]?.complete) return imgCache.current[url];
    if(imgCache.current[url]) return null;
    const img=new Image(); img.src=url;
    img.onload=()=>{imgCache.current[url]=img;scheduleDraw();};
    imgCache.current[url]=img; return null;
  }

  // ── Draw scheduler ────────────────────────────────────────
  function scheduleDraw(){
    if(drawPending.current) return;
    drawPending.current=true;
    requestAnimationFrame(()=>{drawPending.current=false;drawCanvas(timeRef.current);});
  }

  // ── Main canvas draw ──────────────────────────────────────
  function drawCanvas(t){
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext("2d");
    const us=unitsRef.current, sh=shapesRef.current, tl=textLabelsRef.current;
    const sid=selIdRef.current, mi=mapImgRef.current;
    const idp=isDrawPathRef.current, su=selUnitRef.current;
    const flashes=skillFlashRef.current, now=Date.now();
    const z=zoomRef.current, px=panXRef.current, py=panYRef.current;

    ctx.clearRect(0,0,CANVAS_W,CANVAS_H);
    ctx.save();
    ctx.translate(px,py);
    ctx.scale(z,z);

    // Background
    if(mi){ ctx.drawImage(mi,0,0,CANVAS_W,CANVAS_H); ctx.fillStyle="rgba(0,0,0,0.2)"; ctx.fillRect(0,0,CANVAS_W,CANVAS_H); }
    else drawBg(ctx);

    // Shapes
    sh.forEach(s=>renderShape(ctx,s,1));
    if(shapeLiveRef.current) renderShape(ctx,shapeLiveRef.current,0.6);

    // Text labels
    tl.forEach(l=>renderShape(ctx,{type:"text",x1:l.x,y1:l.y,text:l.text,color:l.color,fontSize:l.fontSize},1));

    // Unit paths
    us.forEach(u=>drawPath(ctx,u));

    // Path preview
    if(idp&&su){
      const lp=su.path?.length>0?su.path[su.path.length-1]:{x:su.x,y:su.y},m=mouseRef.current;
      ctx.save(); ctx.setLineDash([4,6]); ctx.strokeStyle=su.color||getRoleColor(su.role);
      ctx.globalAlpha=0.35; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(lp.x,lp.y); ctx.lineTo(m.x,m.y); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
    }

    // Units
    us.forEach(u=>{
      const pos=(t>0&&u.path?.length>=2)?posAtTime(u,t):{x:u.x,y:u.y};
      drawUnit(ctx,u,pos.x,pos.y,u.id===sid,flashes[u.id],now);
    });

    ctx.restore(); // end zoom/pan transform

    // Eraser cursor — drawn in canvas-element pixel space (no zoom/pan transform)
    if(modeRef.current==="erase"&&eraserScreenRef.current){
      const sp=eraserScreenRef.current;
      // eraseSize is in world units; scale to canvas-element pixels accounting for zoom
      const cr=canvasRef.current?.getBoundingClientRect();
      if(cr){
        const worldToElem=cr.width/CANVAS_W;
        const screenR=eraseSizeRef.current*zoomRef.current*worldToElem;
        ctx.save();
        ctx.strokeStyle="rgba(255,255,255,0.9)";
        ctx.lineWidth=1.5;
        ctx.setLineDash([5,3]);
        ctx.beginPath(); ctx.arc(sp.x,sp.y,screenR,0,Math.PI*2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle="rgba(255,255,255,0.06)";
        ctx.beginPath(); ctx.arc(sp.x,sp.y,screenR,0,Math.PI*2); ctx.fill();
        ctx.restore();
      }
    }
  }

  function drawBg(ctx){
    const g=ctx.createLinearGradient(0,0,CANVAS_W,CANVAS_H);
    g.addColorStop(0,T.mapBg1); g.addColorStop(1,T.mapBg2);
    ctx.fillStyle=g; ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
    ctx.lineWidth=1; ctx.strokeStyle="rgba(255,255,255,0.03)";
    for(let x=0;x<=CANVAS_W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,CANVAS_H);ctx.stroke();}
    for(let y=0;y<=CANVAS_H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(CANVAS_W,y);ctx.stroke();}
    ctx.strokeStyle="rgba(255,255,255,0.06)";
    for(let x=0;x<=CANVAS_W;x+=200){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,CANVAS_H);ctx.stroke();}
    for(let y=0;y<=CANVAS_H;y+=200){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(CANVAS_W,y);ctx.stroke();}
    ctx.fillStyle="rgba(148,163,184,0.07)"; ctx.font="18px monospace";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText("Upload a map or start placing units on the tactical grid",CANVAS_W/2,CANVAS_H/2);
  }

  function drawPath(ctx,u){
    if(!u.path||u.path.length<2) return;
    const c=u.color||getRoleColor(u.role);
    ctx.save();
    // Outer glow
    ctx.setLineDash([12,8]); ctx.strokeStyle=c; ctx.globalAlpha=0.2; ctx.lineWidth=10;
    ctx.beginPath(); u.path.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y)); ctx.stroke();
    // Main line
    ctx.setLineDash([10,7]); ctx.strokeStyle=c; ctx.globalAlpha=0.75; ctx.lineWidth=5;
    ctx.beginPath(); u.path.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y)); ctx.stroke();
    ctx.setLineDash([]);
    // Arrow on last segment
    if(u.path.length>=2){
      const p1=u.path[u.path.length-2],p2=u.path[u.path.length-1],dx=p2.x-p1.x,dy=p2.y-p1.y,l=Math.hypot(dx,dy);
      if(l>10){
        const ux=dx/l,uy=dy/l,sz=22; ctx.globalAlpha=0.9; ctx.fillStyle=c;
        ctx.beginPath(); ctx.moveTo(p2.x,p2.y);
        ctx.lineTo(p2.x-ux*sz*1.5-uy*sz,p2.y-uy*sz*1.5+ux*sz);
        ctx.lineTo(p2.x-ux*sz*1.5+uy*sz,p2.y-uy*sz*1.5-ux*sz); ctx.closePath(); ctx.fill();
      }
    }
    // Waypoint dots
    u.path.slice(1).forEach(p=>{
      ctx.globalAlpha=0.9; ctx.fillStyle=c;
      ctx.beginPath(); ctx.arc(p.x,p.y,8,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=0.4; ctx.fillStyle="#000";
      ctx.beginPath(); ctx.arc(p.x,p.y,4,0,Math.PI*2); ctx.fill();
    });
    ctx.restore();
  }

  function drawUnit(ctx,u,x,y,isSel,flash,now){
    const R=Math.round(UNIT_R*unitScaleRef.current);
    const c=u.color||getRoleColor(u.role), isFlashing=flash&&flash.until>now;
    ctx.save();
    if(isSel||isFlashing){
      ctx.shadowColor=isFlashing?"#fbbf24":c; ctx.shadowBlur=isFlashing?36:22;
      ctx.globalAlpha=0.55; ctx.fillStyle=isFlashing?"#fbbf2420":`${c}20`;
      ctx.beginPath(); ctx.arc(x,y,R+(isFlashing?16:8),0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0; ctx.globalAlpha=1;
    }
    if(u.team){
      const tc=u.team==="A"?"#3b82f6":"#ef4444";
      ctx.strokeStyle=tc; ctx.lineWidth=Math.max(4,10*(R/UNIT_R)); ctx.globalAlpha=0.9;
      ctx.beginPath(); ctx.arc(x,y,R+Math.round(8*(R/UNIT_R)),0,Math.PI*2); ctx.stroke(); ctx.globalAlpha=1;
    }
    ctx.strokeStyle=c; ctx.lineWidth=isSel?2.5:2;
    ctx.beginPath(); ctx.arc(x,y,R,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle=`${c}22`; ctx.beginPath(); ctx.arc(x,y,R,0,Math.PI*2); ctx.fill();
    const iconImg=u.iconUrl?loadImg(u.iconUrl):null;
    if(iconImg){
      ctx.save(); ctx.beginPath(); ctx.arc(x,y,R-3,0,Math.PI*2); ctx.clip();
      const r2=R-3; ctx.drawImage(iconImg,x-r2,y-r2,r2*2,r2*2); ctx.restore();
    } else {
      const fs=Math.round(48*(R/UNIT_R));
      ctx.fillStyle=c; ctx.font=`bold ${fs}px monospace`; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(getRoleLetter(u.role),x,y+1);
    }
    if(u.label){
      const lfs=Math.round(36*(R/UNIT_R));
      ctx.font=`${lfs}px sans-serif`; const tw=ctx.measureText(u.label).width+18;
      const lh=Math.round(38*(R/UNIT_R));
      ctx.fillStyle="rgba(0,0,0,0.75)"; ctx.fillRect(x-tw/2,y+R+6,tw,lh);
      ctx.fillStyle=c; ctx.textAlign="center"; ctx.textBaseline="top"; ctx.fillText(u.label,x,y+R+10);
    }
    // Skill flash
    if(isFlashing){
      const sk=u.skills?.find(s=>s.id===flash.skillId);
      if(sk){
        const skImg=sk.iconUrl?loadImg(sk.iconUrl):null;
        if(skImg){
          const ew=Math.round(220*(R/UNIT_R)),eh=ew;
          ctx.save(); ctx.globalAlpha=0.92;
          ctx.drawImage(skImg, x-ew/2, y-eh/2, ew, eh);
          ctx.restore();
        } else {
          const bw=Math.round(160*(R/UNIT_R)),bh=Math.round(72*(R/UNIT_R)),bx=x-bw/2,by=y-R-bh-12;
          ctx.fillStyle="rgba(0,0,0,0.85)"; ctx.strokeStyle="#fbbf24"; ctx.lineWidth=2;
          ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(bx,by,bw,bh,6); else ctx.rect(bx,by,bw,bh);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle="#fbbf24"; ctx.font=`bold ${Math.round(26*(R/UNIT_R))}px monospace`;
          ctx.textAlign="center"; ctx.textBaseline="middle";
          ctx.fillText((sk.name||"SKILL").slice(0,8).toUpperCase(),x,by+bh/2);
        }
      }
    }
    ctx.restore();
  }

  useEffect(()=>{ if(!playing) scheduleDraw(); });

  // ── Animation ─────────────────────────────────────────────
  const playbackSpeedRef=useRef(1);
  useEffect(()=>{playbackSpeedRef.current=playbackSpeed;},[playbackSpeed]);

  function play(){
    if(playRef.current) return;
    const dur=calcTotalDuration(unitsRef.current);
    if(timeRef.current>=dur){timeRef.current=0;setCurTime(0);firedRef.current=new Set();setSkillFlashes({});}
    playRef.current=true; lastTsRef.current=null; setPlaying(true);
    function tick(ts){
      if(!playRef.current) return;
      if(!lastTsRef.current) lastTsRef.current=ts;
      const dt=Math.min((ts-lastTsRef.current)/1000,0.1)*playbackSpeedRef.current;
      lastTsRef.current=ts;
      const prev=timeRef.current, dur2=calcTotalDuration(unitsRef.current);
      let next=prev+dt;
      if(next>=dur2){next=dur2;playRef.current=false;setPlaying(false);}
      timeRef.current=next; setCurTime(next);
      const newF={};
      for(const u of unitsRef.current){
        for(const sk of u.skills||[]){
          const key=`${u.id}_${sk.id}`;
          if(!firedRef.current.has(key)&&sk.triggerTime>prev&&sk.triggerTime<=next){
            firedRef.current.add(key);
            newF[u.id]={skillId:sk.id,until:Date.now()+(sk.duration||SKILL_FLASH_MS)};
          }
        }
      }
      if(Object.keys(newF).length>0){setSkillFlashes(f=>({...f,...newF}));skillFlashRef.current={...skillFlashRef.current,...newF};}
      drawCanvas(next);
      if(playRef.current) rafRef.current=requestAnimationFrame(tick);
    }
    rafRef.current=requestAnimationFrame(tick);
  }

  function pause(){ playRef.current=false; if(rafRef.current) cancelAnimationFrame(rafRef.current); setPlaying(false); }
  function reset(){ pause(); timeRef.current=0; setCurTime(0); firedRef.current=new Set(); setSkillFlashes({}); skillFlashRef.current={}; scheduleDraw(); }
  function scrubTo(t){ pause(); timeRef.current=t; setCurTime(t); drawCanvas(t); }

  // ── Canvas coord helper (accounts for zoom+pan) ───────────
  function canvasPos(e){
    const r=canvasRef.current?.getBoundingClientRect(); if(!r) return {x:0,y:0};
    const cx=e.touches?.[0]?.clientX??e.clientX, cy=e.touches?.[0]?.clientY??e.clientY;
    const rawX=(cx-r.left)*(CANVAS_W/r.width);
    const rawY=(cy-r.top)*(CANVAS_H/r.height);
    const z=zoomRef.current, px=panXRef.current, py=panYRef.current;
    const wx=(rawX-px)/z, wy=(rawY-py)/z;
    const sn=gridSnapRef.current;
    return {x:snapToGrid(wx,sn), y:snapToGrid(wy,sn)};
  }

  function hitUnit(x,y){
    for(let i=unitsRef.current.length-1;i>=0;i--){
      const u=unitsRef.current[i];
      if(Math.hypot(x-u.x,y-u.y)<=Math.round(UNIT_R*unitScaleRef.current)+6) return u;
    }
    return null;
  }

  const eraserPosRef=useRef(null);      // world coords — for erase logic
  const eraserScreenRef=useRef(null);  // canvas-element px — for cursor draw

  function eraseAt(p){
    const r=eraseSizeRef.current;
    setShapes(sh=>sh.filter(s=>{
      if(s.type==="draw"&&s.points) return !s.points.some(pt=>Math.hypot(pt.x-p.x,pt.y-p.y)<r);
      if(s.type==="text") return !(Math.abs(s.x1-p.x)<r*2&&Math.abs(s.y1-p.y)<r);
      const cx=(s.x1+s.x2)/2,cy=(s.y1+s.y2)/2;
      return Math.hypot(cx-p.x,cy-p.y)>=r*1.5;
    }));
    setTextLabels(tl=>tl.filter(l=>!(Math.abs(l.x-p.x)<r*2&&Math.abs(l.y-p.y)<r)));
  }

  // ── Mouse events ──────────────────────────────────────────
  function onMouseMove(e){
    const p=canvasPos(e); mouseRef.current=p;

    // Pan (middle mouse or space+drag)
    if(isPanning.current){
      const r=canvasRef.current?.getBoundingClientRect(); if(!r) return;
      const cx=e.clientX,cy=e.clientY;
      const dx=cx-panStart.current.x, dy=cy-panStart.current.y;
      const newPx=panStart.current.px+dx*(CANVAS_W/r.width);
      const newPy=panStart.current.py+dy*(CANVAS_H/r.height);
      setPanX(newPx); setPanY(newPy);
      panXRef.current=newPx; panYRef.current=newPy;
      scheduleDraw(); return;
    }

    // Eraser — continuous brush while held, always show cursor
    if(modeRef.current==="erase"){
      eraserPosRef.current=p;
      // store raw canvas-element pixel position for cursor rendering
      const cr=canvasRef.current?.getBoundingClientRect();
      if(cr){
        const cx=e.touches?.[0]?.clientX??e.clientX;
        const cy=e.touches?.[0]?.clientY??e.clientY;
        eraserScreenRef.current={
          x:(cx-cr.left)*(CANVAS_W/cr.width),
          y:(cy-cr.top)*(CANVAS_H/cr.height),
        };
      }
      if(isErasingRef.current) eraseAt(p);
      scheduleDraw(); return;
    }

    if(dragRef.current){
      const dr=dragRef.current;
      setUnits(us=>us.map(u=>{
        if(u.id!==dr.id) return u;
        return{...u,x:p.x-dr.ox,y:p.y-dr.oy,
          path:u.path?.length>0?[{x:p.x-dr.ox,y:p.y-dr.oy},...u.path.slice(1)]:u.path};
      }));
    }

    if(shapeStartRef.current&&modeRef.current==="shape"){
      const s=shapeStartRef.current;
      if(shapeToolRef.current==="draw"){
        drawPointsRef.current.push({x:p.x,y:p.y});
        shapeLiveRef.current={type:"draw",points:[...drawPointsRef.current],color:shapeColorRef.current,lineWidth:shapeSizeRef.current};
      } else {
        shapeLiveRef.current={type:shapeToolRef.current,x1:s.x,y1:s.y,x2:p.x,y2:p.y,color:shapeColorRef.current,fill:shapeFillRef.current,lineWidth:shapeSizeRef.current};
      }
    }
    scheduleDraw();
  }

  function onMouseDown(e){
    if(e.button===1){ // middle mouse = pan
      isPanning.current=true;
      panStart.current={x:e.clientX,y:e.clientY,px:panXRef.current,py:panYRef.current};
      e.preventDefault(); return;
    }
    if(e.button!==0) return;
    const p=canvasPos(e), hit=hitUnit(p.x,p.y), m=modeRef.current;

    // Erase mode — start brushing
    if(m==="erase"){
      isErasingRef.current=true;
      eraseAt(p);
      scheduleDraw();
      return;
    }

    if(m==="move"){ if(hit){dragRef.current={id:hit.id,ox:p.x-hit.x,oy:p.y-hit.y};setSelId(hit.id);} return; }

    if(m==="path"){
      if(isDrawPathRef.current&&selUnitRef.current){
        setUnits(us=>us.map(u=>u.id===selIdRef.current?{...u,path:[...(u.path||[{x:u.x,y:u.y}]),{x:p.x,y:p.y}]}:u));
      } else if(hit){
        setSelId(hit.id); setIsDrawPath(true);
        setUnits(us=>us.map(u=>u.id===hit.id?{...u,path:u.path?.length>0?u.path:[{x:u.x,y:u.y}]}:u));
      }
      return;
    }

    if(m==="shape"){
      shapeStartRef.current={x:p.x,y:p.y};
      if(shapeToolRef.current==="draw"){
        drawPointsRef.current=[{x:p.x,y:p.y}];
        shapeLiveRef.current={type:"draw",points:[{x:p.x,y:p.y}],color:shapeColorRef.current,lineWidth:shapeSizeRef.current};
      }
      if(shapeToolRef.current==="text"){
        setPendingTextPos({x:p.x,y:p.y}); setShowTextInput(true); return;
      }
      return;
    }

    // place mode
    if(hit){ setSelId(hit.id); }
    else if(!presentMode) {
      const role=ROLE_PRESETS.find(r=>r.type===selRole);
      const nu={id:uid("u"),role:selRole,label:"",x:p.x,y:p.y,path:[],speed:200,delay:0,team:selTeam,color:role?.color||"#94a3b8",iconUrl:null,skills:[]};
      setUnits(u=>[...u,nu]); setSelId(nu.id);
    }
  }

  function onMouseUp(){
    isErasingRef.current=false;
    dragRef.current=null; isPanning.current=false;
    if(shapeStartRef.current&&modeRef.current==="shape"&&shapeLiveRef.current){
      const s=shapeLiveRef.current;
      if(s.type!=="text"){
        const valid=s.type==="draw"?(s.points?.length>1):(Math.hypot((s.x2||0)-(s.x1||0),(s.y2||0)-(s.y1||0))>5);
        if(valid) setShapes(sh=>[...sh,{...s,id:uid("sh")}]);
      }
      shapeLiveRef.current=null; shapeStartRef.current=null; drawPointsRef.current=[]; scheduleDraw();
    }
  }

  function onContextMenu(e){ e.preventDefault(); if(isDrawPath) setIsDrawPath(false); }

  // Zoom on scroll
  function onWheel(e){
    e.preventDefault();
    const delta=e.deltaY>0?-0.1:0.1;
    const oldZ=zoomRef.current;
    const newZ=clamp(oldZ+delta,0.1,4);

    // Zoom toward mouse position
    const rect=canvasRef.current?.getBoundingClientRect();
    if(rect){
      // Mouse position in canvas-element pixels
      const mx=(e.clientX-rect.left)*(CANVAS_W/rect.width);
      const my=(e.clientY-rect.top)*(CANVAS_H/rect.height);
      // Adjust pan so the point under the mouse stays fixed
      const px=panXRef.current, py=panYRef.current;
      const newPx=mx-(mx-px)*(newZ/oldZ);
      const newPy=my-(my-py)*(newZ/oldZ);
      setPanX(newPx); panXRef.current=newPx;
      setPanY(newPy); panYRef.current=newPy;
    }

    setZoom(newZ); zoomRef.current=newZ; scheduleDraw();
  }

  // ── Keyboard ──────────────────────────────────────────────
  useEffect(()=>{
    function onKey(e){
      if(e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA") return;
      if(e.key==="Escape"){ if(isDrawPath) setIsDrawPath(false); setPresentMode(false); }
      if(e.key===" "){ e.preventDefault(); playing?pause():play(); }
      if((e.key==="Delete"||e.key==="Backspace")&&selId) deleteUnit(selId);
      const km={p:"place",d:"path",m:"move",s:"shape",e:"erase"};
      if(km[e.key]&&!e.ctrlKey&&!e.metaKey) setMode(km[e.key]);
      if(e.key==="z"&&(e.ctrlKey||e.metaKey)) setShapes(sh=>sh.slice(0,-1));
      if(e.key==="f"&&!e.ctrlKey) setPresentMode(v=>!v);
      // Zoom
      if(e.key==="+"||e.key==="="){ const nz=clamp(zoomRef.current+0.15,0.1,4); setZoom(nz); zoomRef.current=nz; scheduleDraw(); }
      if(e.key==="-"){ const nz=clamp(zoomRef.current-0.15,0.1,4); setZoom(nz); zoomRef.current=nz; scheduleDraw(); }
      if(e.key==="0"){ setZoom(1);setPanX(0);setPanY(0);zoomRef.current=1;panXRef.current=0;panYRef.current=0;scheduleDraw(); }
    }
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[playing,isDrawPath,selId]);

  // ── Unit helpers ──────────────────────────────────────────
  function updateUnit(id,patch){ setUnits(us=>us.map(u=>u.id===id?{...u,...patch}:u)); }
  function deleteUnit(id){ setUnits(us=>us.filter(u=>u.id!==id)); setSelId(null); setIsDrawPath(false); }
  function clearPath(id){ setUnits(us=>us.map(u=>u.id===id?{...u,path:[]}:u)); setIsDrawPath(false); }
  function duplicateUnit(id){
    const u=units.find(x=>x.id===id); if(!u) return;
    const nu={...u,id:uid("u"),x:u.x+30,y:u.y+30,skills:(u.skills||[]).map(s=>({...s,id:uid("sk")}))};
    setUnits(us=>[...us,nu]); setSelId(nu.id);
  }
  function addSkill(uid2){ const sk={id:uid("sk"),name:"New Skill",triggerTime:2,iconUrl:null,duration:SKILL_FLASH_MS}; setUnits(us=>us.map(u=>u.id===uid2?{...u,skills:[...(u.skills||[]),sk]}:u)); }
  function updateSkill(uid2,sid,patch){ setUnits(us=>us.map(u=>u.id===uid2?{...u,skills:u.skills.map(s=>s.id===sid?{...s,...patch}:s)}:u)); }
  function deleteSkill(uid2,sid){ setUnits(us=>us.map(u=>u.id===uid2?{...u,skills:u.skills.filter(s=>s.id!==sid)}:u)); }

  // ── Snapshots ─────────────────────────────────────────────
  function saveSnapshot(){
    const name=prompt("Snapshot name:");
    if(!name) return;
    setSnapshots(ss=>[...ss,{id:uid("snap"),name,units:JSON.parse(JSON.stringify(units)),shapes:JSON.parse(JSON.stringify(shapes)),textLabels:JSON.parse(JSON.stringify(textLabels))}]);
  }
  function loadSnapshot(snap){ setUnits(snap.units||[]); setShapes(snap.shapes||[]); setTextLabels(snap.textLabels||[]); setSelId(null); reset(); }
  function deleteSnapshot(id){ setSnapshots(ss=>ss.filter(s=>s.id!==id)); }

  // ── File IO ───────────────────────────────────────────────
  function uploadMap(e){ const f=e.target.files[0]; if(!f) return; const img=new Image(); img.onload=()=>{setMapImg(img);mapImgRef.current=img;scheduleDraw();}; img.src=URL.createObjectURL(f); e.target.value=""; }
  function loadPresetMap(src){ const img=new Image(); img.onload=()=>{setMapImg(img);mapImgRef.current=img;setShowMapPicker(false);scheduleDraw();}; img.src=src; }
  function uploadUnitIcon(uid2,e){ const f=e.target.files[0]; if(!f) return; updateUnit(uid2,{iconUrl:URL.createObjectURL(f)}); e.target.value=""; }
  function uploadSkillIcon(uid2,sid,e){ const f=e.target.files[0]; if(!f) return; updateSkill(uid2,sid,{iconUrl:URL.createObjectURL(f)}); e.target.value=""; }
  function saveJSON(){ const blob=new Blob([JSON.stringify({units,shapes,textLabels,snapshots,notes,version:4},null,2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="zvz-plan.json"; a.click(); }
  function loadJSON(e){ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=ev=>{try{const d=JSON.parse(ev.target.result);setUnits(d.units||[]);setShapes(d.shapes||[]);setTextLabels(d.textLabels||[]);setSnapshots(d.snapshots||[]);setNotes(d.notes||"");setSelId(null);reset();}catch{alert("Invalid file");}}; r.readAsText(f); e.target.value=""; }
  function exportPNG(){ const a=document.createElement("a"); a.href=canvasRef.current?.toDataURL("image/png"); a.download="zvz-plan.png"; a.click(); }

  // ── Text label placement ──────────────────────────────────
  function confirmTextLabel(){
    if(!pendingTextPos||!textInput.trim()) return;
    setTextLabels(tl=>[...tl,{id:uid("txt"),x:pendingTextPos.x,y:pendingTextPos.y,text:textInput,color:textColor,fontSize:textSize}]);
    setTextInput(""); setShowTextInput(false); setPendingTextPos(null);
  }

  // ─── Shape tool definitions ───────────────────────────────
  const shapeTools=[
    {id:"draw",   icon:<Pen size={12}/>,         label:"Draw"},
    {id:"arrow",  icon:<ArrowRight size={12}/>,   label:"Arrow"},
    {id:"circle", icon:<Circle size={12}/>,       label:"Circle"},
    {id:"triangle",icon:<Triangle size={12}/>,    label:"Triangle"},
    {id:"rect",   icon:<Square size={12}/>,       label:"Rect"},
    {id:"line",   icon:<Minus size={12}/>,        label:"Line"},
    {id:"text",   icon:<Type size={12}/>,         label:"Text"},
  ];

  const modeBtns=[
    {id:"place", icon:<MousePointer2 size={12}/>, label:"Place",  key:"P"},
    {id:"path",  icon:<Route size={12}/>,         label:"Path",   key:"D"},
    {id:"move",  icon:<MoveIcon size={12}/>,      label:"Move",   key:"M"},
    {id:"shape", icon:<Pen size={12}/>,           label:"Draw",   key:"S"},
    {id:"erase", icon:<Trash2 size={12}/>,        label:"Erase",  key:"E"},
  ];

  const cursor=mode==="erase"?"none":mode==="move"?"grab":"crosshair";

  // ─── RENDER ───────────────────────────────────────────────
  if(presentMode){
    return(
      <div className="fixed inset-0 bg-black flex flex-col z-50" style={{fontFamily:"'Rajdhani','Share Tech Mono',sans-serif"}}>
        {/* Canvas */}
        <div ref={wrapRef} className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
            style={{maxWidth:"100vw",maxHeight:"100%",objectFit:"contain",cursor}}
            onMouseMove={onMouseMove} onMouseDown={onMouseDown} onMouseUp={onMouseUp}
            onContextMenu={onContextMenu} onWheel={onWheel}/>
          <div className="absolute top-3 left-3 font-mono text-[11px] bg-black/60 border border-white/10 text-amber-400 px-3 py-1 rounded-sm pointer-events-none">
            {mode.toUpperCase()}{mode==="shape"?` · ${shapeTool.toUpperCase()}`:""}{isDrawPath?" · PATH DRAW":""}
          </div>
          <button onClick={()=>setPresentMode(false)}
            className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-black/60 border border-white/20 text-white hover:bg-white/20 transition-all">
            <X size={14}/> Exit
          </button>
        </div>

        {/* Floating control bar */}
        <div className="flex-shrink-0 flex items-center justify-center gap-2 px-6 py-3 flex-wrap"
          style={{background:"rgba(0,0,0,0.85)",borderTop:"1px solid rgba(255,255,255,0.07)",backdropFilter:"blur(12px)"}}>
          {/* Playback */}
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)"}}>
            <button onClick={()=>playing?pause():play()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold border transition-all"
              style={playing?{background:"rgba(251,191,36,0.18)",color:"#fbbf24",borderColor:"rgba(251,191,36,0.4)"}:{background:"rgba(74,222,128,0.13)",color:"#4ade80",borderColor:"rgba(74,222,128,0.35)"}}>
              {playing?<><Pause size={13}/> Pause</>:<><Play size={13}/> Play</>}
            </button>
            <button onClick={reset} className="p-2 rounded-lg text-white/50 hover:bg-white/10 transition-all">
              <RotateCcw size={12}/>
            </button>
            <div className="w-px h-4 mx-0.5 bg-white/10"/>
            {[0.25,0.5,1,2].map(s=>(
              <button key={s} onClick={()=>setPlaybackSpeed(s)}
                className="px-2 py-1 rounded-lg text-[10px] font-bold border transition-all"
                style={playbackSpeed===s?{background:"rgba(245,158,11,0.2)",color:"#f59e0b",borderColor:"rgba(245,158,11,0.4)"}:{color:"rgba(255,255,255,0.35)",borderColor:"transparent"}}>
                {s}×
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-white/10"/>

          {/* Draw tools */}
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)"}}>
            {[
              {id:"shape",icon:<Pen size={13}/>,label:"Draw"},
              {id:"erase",icon:<Trash2 size={13}/>,label:"Erase"},
            ].map(b=>(
              <button key={b.id} onClick={()=>{setMode(b.id);if(isDrawPath)setIsDrawPath(false);}}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-xs font-semibold"
                style={mode===b.id?{background:"rgba(245,158,11,0.18)",color:"#f59e0b",borderColor:"rgba(245,158,11,0.4)"}:{color:"rgba(255,255,255,0.5)",borderColor:"transparent"}}>
                {b.icon}{b.label}
              </button>
            ))}
          </div>

          {/* Shape sub-tools */}
          {mode==="shape"&&(
            <div className="flex items-center gap-1 p-1 rounded-xl flex-wrap" style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)"}}>
              {[
                {id:"draw",icon:<Pen size={12}/>,label:"Draw"},
                {id:"arrow",icon:<ArrowRight size={12}/>,label:"Arrow"},
                {id:"circle",icon:<Circle size={12}/>,label:"Circle"},
                {id:"line",icon:<Minus size={12}/>,label:"Line"},
              ].map(t=>(
                <button key={t.id} onClick={()=>setShapeTool(t.id)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border transition-all"
                  style={shapeTool===t.id?{background:"rgba(255,255,255,0.12)",color:"#e2e8f0",borderColor:"rgba(255,255,255,0.2)"}:{color:"rgba(255,255,255,0.4)",borderColor:"transparent"}}>
                  {t.icon}{t.label}
                </button>
              ))}
              <div className="flex items-center gap-1.5 mx-1">
                <div className="w-4 h-4 rounded-full border-2 border-white/30" style={{background:shapeColor}}/>
                <input type="color" value={shapeColor} onChange={e=>setShapeColor(e.target.value)}
                  className="w-6 h-5 rounded cursor-pointer border-0 bg-transparent p-0"/>
              </div>
              <button onClick={()=>setShapes(sh=>sh.slice(0,-1))}
                className="px-2.5 py-1 rounded-lg text-xs border border-transparent text-white/40 hover:text-red-400 transition-all">
                Undo
              </button>
            </div>
          )}

          {/* Timeline scrubber */}
          <div className="flex items-center gap-2 ml-2">
            <span className="font-mono text-xs" style={{color:"#f59e0b"}}>{curTime.toFixed(1)}s</span>
            <PresentTimeline currentTime={curTime} duration={duration} onScrub={scrubTo}/>
            <span className="font-mono text-xs text-white/30">{duration.toFixed(1)}s</span>
          </div>
        </div>
      </div>
    );
  }

  return(
    <div className="h-screen w-screen flex flex-col overflow-hidden select-none"
      style={{fontFamily:"'Rajdhani','Share Tech Mono',sans-serif",background:T.bg,color:T.text}}>

      {/* ══ TOP BAR ════════════════════════════════════════ */}
      <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0 flex-wrap min-h-[50px]"
        style={{background:T.panel,borderBottom:`1px solid ${T.border}`,boxShadow:"0 4px 32px rgba(0,0,0,0.5)"}}>

        <div className="flex items-center gap-2 mr-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{background:T.accentBg,border:`1px solid ${T.accentDim}`,boxShadow:T.accentGlow}}>
            <span style={{color:T.accent,fontSize:11,fontWeight:900}}>Z</span>
          </div>
          <span className="font-bold text-sm tracking-widest" style={{color:T.text}}>ZVZ <span className="text-xs font-normal" style={{color:T.dim}}>PLANNER</span></span>
        </div>

        {/* Modes */}
        <div className="flex gap-1 p-1 rounded-xl flex-shrink-0" style={{background:T.panel2,border:`1px solid ${T.border}`}}>
          {modeBtns.map(b=>(
            <button key={b.id} onClick={()=>{setMode(b.id);if(isDrawPath)setIsDrawPath(false);}}
              style={mode===b.id?{background:T.btnActive,color:T.accent,borderColor:T.accentDim,boxShadow:T.accentGlow}:{color:T.dim,borderColor:"transparent"}}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border">
              {b.icon}{b.label}
            </button>
          ))}
        </div>

        {/* Eraser size — shown when erase mode active */}
        {mode==="erase"&&(
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl flex-shrink-0" style={{background:T.panel2,border:`1px solid ${T.border}`}}>
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{color:T.dim}}>Size</span>
            <input type="range" min={10} max={300} step={5} value={eraseSize}
              onChange={e=>{ const v=Number(e.target.value); setEraseSize(v); eraseSizeRef.current=v; scheduleDraw(); }}
              className="w-24 h-1 accent-amber-500 cursor-pointer"/>
            <span className="text-[10px] font-mono w-7 text-right" style={{color:T.accent}}>{eraseSize}</span>
          </div>
        )}

        {/* Shape sub-tools */}
        {mode==="shape"&&(
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl flex-shrink-0 flex-wrap" style={{background:T.panel2,border:`1px solid ${T.border}`}}>
            {shapeTools.map(t=>(
              <button key={t.id} onClick={()=>setShapeTool(t.id)}
                style={shapeTool===t.id?{background:T.btnActive,color:T.accent,borderColor:T.accentDim}:{color:T.dim,borderColor:"transparent"}}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border">
                {t.icon}{t.label}
              </button>
            ))}
            <div className="w-px h-4 mx-1 flex-shrink-0" style={{background:T.border}}/>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full border-2 border-white/20 flex-shrink-0" style={{background:shapeColor}}/>
              <input type="color" value={shapeColor} onChange={e=>setShapeColor(e.target.value)}
                className="w-7 h-6 rounded cursor-pointer border-0 bg-transparent p-0"/>
            </div>
            <div className="flex items-center gap-1 mx-1">
              <span className="text-[10px]" style={{color:T.dim}}>Size</span>
              <input type="range" min={1} max={20} step={0.5} value={shapeSize}
                onChange={e=>setShapeSize(Number(e.target.value))}
                className="w-16 h-1 accent-amber-500 cursor-pointer"/>
              <span className="text-[10px] font-mono w-5" style={{color:T.accent}}>{shapeSize}</span>
            </div>
            <button onClick={()=>setShapeFill(f=>!f)}
              style={shapeFill?{background:T.btnActive,color:T.accent,borderColor:T.accentDim}:{color:T.dim,borderColor:"transparent"}}
              className="px-2.5 py-1 rounded-lg text-xs border transition-all">Fill</button>
            <button onClick={()=>setShapes(sh=>sh.slice(0,-1))}
              className="px-2.5 py-1 rounded-lg text-xs transition-all hover:text-red-400 border border-transparent" style={{color:T.dim}}>Undo</button>
          </div>
        )}

        {/* Add Role */}
        <div className="relative flex-shrink-0">
          <button onClick={()=>setShowRoleMenu(r=>!r)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border"
            style={showRoleMenu?{background:"rgba(74,222,128,0.15)",color:"#4ade80",borderColor:"rgba(74,222,128,0.4)",boxShadow:"0 0 16px rgba(74,222,128,0.2)"}:{background:"rgba(74,222,128,0.07)",color:"#4ade80",borderColor:"rgba(74,222,128,0.2)"}}>
            <Plus size={13}/> Add Role <ChevronDown size={11} className={`transition-transform duration-200 ${showRoleMenu?"rotate-180":""}`}/>
          </button>
          {showRoleMenu&&(
            <div className="absolute top-full left-0 mt-2 rounded-2xl shadow-2xl z-50 min-w-[180px] overflow-hidden"
              style={{background:T.panel,border:`1px solid ${T.border}`,boxShadow:"0 20px 60px rgba(0,0,0,0.7)"}}>
              <div className="flex gap-1.5 p-2.5" style={{borderBottom:`1px solid ${T.border}`}}>
                {["A","B"].map(t=>(
                  <button key={t} onClick={()=>setSelTeam(t)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all"
                    style={selTeam===t?{background:t==="A"?"rgba(37,99,235,0.25)":"rgba(220,38,38,0.25)",color:t==="A"?"#60a5fa":"#f87171",borderColor:t==="A"?"rgba(37,99,235,0.4)":"rgba(220,38,38,0.4)"}:{color:T.dim,borderColor:T.border}}>
                    {t==="A"?"🔵 Team A":"🔴 Team B"}
                  </button>
                ))}
              </div>
              <div className="p-2">
                {ROLE_PRESETS.map(r=>(
                  <button key={r.type} onClick={()=>{setSelRole(r.type);setMode("place");setShowRoleMenu(false);}}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all text-left"
                    style={selRole===r.type?{background:T.panel2}:undefined}
                    onMouseEnter={e=>e.currentTarget.style.background=T.panel2}
                    onMouseLeave={e=>e.currentTarget.style.background=selRole===r.type?T.panel2:"transparent"}>
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:r.color,boxShadow:`0 0 8px ${r.color}80`}}/>
                    <span className="font-semibold" style={{color:r.color}}>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Playback */}
        <div className="flex items-center gap-1 p-1 rounded-xl flex-shrink-0" style={{background:T.panel2,border:`1px solid ${T.border}`}}>
          <button onClick={()=>playing?pause():play()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold border transition-all"
            style={playing?{background:"rgba(251,191,36,0.18)",color:"#fbbf24",borderColor:"rgba(251,191,36,0.4)",boxShadow:"0 0 14px rgba(251,191,36,0.25)"}:{background:"rgba(74,222,128,0.13)",color:"#4ade80",borderColor:"rgba(74,222,128,0.35)"}}>
            {playing?<><Pause size={12}/> Pause</>:<><Play size={12}/> Play</>}
          </button>
          <button onClick={reset} className="p-2 rounded-lg transition-all hover:bg-white/5" style={{color:T.dim}}>
            <RotateCcw size={12}/>
          </button>
          <div className="w-px h-4 mx-0.5 flex-shrink-0" style={{background:T.border}}/>
          {/* Speed */}
          <div className="flex items-center gap-0.5">
            {[0.25,0.5,1,2].map(s=>(
              <button key={s} onClick={()=>setPlaybackSpeed(s)}
                className="px-2 py-1 rounded-lg text-[10px] font-bold border transition-all"
                style={playbackSpeed===s?{background:T.btnActive,color:T.accent,borderColor:T.accentDim}:{color:T.dim,borderColor:"transparent"}}>
                {s}×
              </button>
            ))}
          </div>
        </div>

        {/* Unit Size */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl flex-shrink-0" style={{background:T.panel2,border:`1px solid ${T.border}`}}>
          <span className="text-[10px] font-semibold uppercase tracking-wider flex-shrink-0" style={{color:T.dim}}>Units</span>
          <input type="range" min={0.3} max={2} step={0.05} value={unitScale}
            onChange={e=>{ const v=Number(e.target.value); setUnitScale(v); unitScaleRef.current=v; scheduleDraw(); }}
            className="w-20 h-1 accent-amber-500 cursor-pointer"/>
          <span className="text-[10px] font-mono w-7 text-right" style={{color:T.accent}}>{Math.round(unitScale*100)}%</span>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-0.5 p-1 rounded-xl flex-shrink-0" style={{background:T.panel2,border:`1px solid ${T.border}`}}>
          <button onClick={()=>{const nz=clamp(zoom-0.2,0.1,4);setZoom(nz);zoomRef.current=nz;scheduleDraw();}} className="p-1.5 rounded-lg hover:bg-white/5 transition-all" style={{color:T.dim}}><ZoomOut size={12}/></button>
          <span className="text-[10px] font-mono w-9 text-center" style={{color:T.accent}}>{Math.round(zoom*100)}%</span>
          <button onClick={()=>{const nz=clamp(zoom+0.2,0.1,4);setZoom(nz);zoomRef.current=nz;scheduleDraw();}} className="p-1.5 rounded-lg hover:bg-white/5 transition-all" style={{color:T.dim}}><ZoomIn size={12}/></button>
          <button onClick={()=>{setZoom(1);setPanX(0);setPanY(0);zoomRef.current=1;panXRef.current=0;panYRef.current=0;scheduleDraw();}} className="px-2 py-1 rounded-lg text-[10px] hover:bg-white/5 transition-all" style={{color:T.dim}}>Fit</button>
        </div>

        {/* Map & IO */}
        <div className="flex items-center gap-1 ml-auto flex-wrap">
          {/* Map picker */}
          <div className="relative flex-shrink-0">
            <button onClick={()=>setShowMapPicker(v=>!v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all"
              style={showMapPicker?{background:T.btnActive,color:T.accent,borderColor:T.accentDim}:{color:T.dim,borderColor:"transparent"}}>
              <Map size={11}/> Map <ChevronDown size={10} className={`transition-transform duration-200 ${showMapPicker?"rotate-180":""}`}/>
            </button>
            {showMapPicker&&(
              <div className="absolute top-full left-0 mt-2 rounded-2xl shadow-2xl z-50 overflow-hidden"
                style={{background:T.panel,border:`1px solid ${T.border}`,boxShadow:"0 20px 60px rgba(0,0,0,0.7)",minWidth:240}}>
                <div className="p-2.5" style={{borderBottom:`1px solid ${T.border}`}}>
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{color:T.accent}}>Preset Maps</div>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESET_MAPS.map(m=>(
                      <button key={m.label} onClick={()=>loadPresetMap(m.src)}
                        className="relative rounded-xl overflow-hidden transition-all hover:scale-105 hover:opacity-90 aspect-video"
                        style={{border:`1px solid ${T.border}`}}>
                        <img src={m.src} className="w-full h-full object-cover"/>
                        <div className="absolute bottom-0 left-0 right-0 px-2 py-1 text-[10px] font-bold text-white text-center" style={{background:"rgba(0,0,0,0.6)"}}>{m.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-2">
                  <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs border cursor-pointer transition-all hover:border-white/20 w-full" style={{color:T.dim,borderColor:T.border}}>
                    <Upload size={11}/> Upload custom map<input type="file" accept="image/*" className="hidden" onChange={e=>{uploadMap(e);setShowMapPicker(false);}}/>
                  </label>
                </div>
              </div>
            )}
          </div>
          {mapImg&&<button onClick={()=>{setMapImg(null);mapImgRef.current=null;scheduleDraw();}} className="px-2 py-1.5 rounded-lg text-xs transition-all hover:text-red-400 border border-transparent" style={{color:T.dim}}>✕ Map</button>}
          <div className="w-px h-4" style={{background:T.border}}/>
          <button onClick={saveJSON} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-transparent transition-all hover:bg-white/5" style={{color:T.dim}}><Save size={11}/> Save</button>
          <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-transparent cursor-pointer transition-all hover:bg-white/5" style={{color:T.dim}}>
            <Download size={11}/> Load<input type="file" accept=".json" className="hidden" onChange={loadJSON}/>
          </label>
          <button onClick={exportPNG} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-transparent transition-all hover:bg-white/5" style={{color:T.dim}}><Download size={11}/> PNG</button>
          <div className="w-px h-4" style={{background:T.border}}/>
          <button onClick={()=>setShowNotes(v=>!v)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all" style={showNotes?{color:T.accent,borderColor:T.accentDim,background:T.accentBg,boxShadow:T.accentGlow}:{color:T.dim,borderColor:"transparent"}}><StickyNote size={11}/> Notes</button>
          <button onClick={()=>setPresentMode(true)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-transparent transition-all hover:bg-white/5" style={{color:T.dim}}><Maximize2 size={11}/> Present</button>
          <button onClick={()=>setTheme(t=>t==="tactical"?"albion":"tactical")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all"
            style={{color:T.accent,borderColor:T.accentDim,background:T.accentBg}}>
            🎨 {T.name}
          </button>
          <button onClick={()=>setShowDonate(true)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all" style={{color:"#f472b6",borderColor:"rgba(244,114,182,0.3)",background:"rgba(244,114,182,0.07)"}}>
            <Heart size={11}/> Support
          </button>
          <button onClick={()=>{if(confirm("Clear all?")){setUnits([]);setShapes([]);setTextLabels([]);setSelId(null);reset();}}}
            className="p-2 rounded-lg border border-transparent transition-all hover:border-red-500/30 hover:bg-red-500/10" style={{color:"#f87171"}}>
            <Trash2 size={11}/>
          </button>
        </div>

        <div className="font-mono text-[10px] ml-2 flex-shrink-0" style={{color:T.dim}}>
          {isDrawPath&&<span className="mr-2 font-bold" style={{color:T.accent}}>● PATH</span>}
          {curTime.toFixed(1)}s / {duration.toFixed(1)}s
        </div>
      </div>

      {/* ══ MIDDLE ═════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden" onClick={()=>{showRoleMenu&&setShowRoleMenu(false);showMapPicker&&setShowMapPicker(false);}}>

        {/* Canvas */}
        <div ref={wrapRef} className="flex-1 relative overflow-hidden flex items-center justify-center" style={{background:T.canvasBg}}>
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
            style={{width:`${CANVAS_W*canvasScale}px`,height:`${CANVAS_H*canvasScale}px`,cursor}}
            onMouseMove={onMouseMove} onMouseDown={onMouseDown} onMouseUp={onMouseUp}
            onMouseLeave={()=>{eraserPosRef.current=null;eraserScreenRef.current=null;scheduleDraw();}}
            onContextMenu={onContextMenu} onWheel={onWheel}/>
          <div className="absolute top-3 left-3 font-mono text-[11px] px-3 py-1.5 rounded-xl pointer-events-none" style={{color:T.accent,background:"rgba(0,0,0,0.7)",border:`1px solid ${T.border}`,backdropFilter:"blur(8px)"}}>
            {mode.toUpperCase()}{mode==="shape"?` · ${shapeTool.toUpperCase()}`:""}{isDrawPath?" · PATH DRAW":""}
          </div>
          {/* Zoom hint */}
          <div className="absolute bottom-3 left-3 font-mono text-[10px] px-2.5 py-1 rounded-lg pointer-events-none" style={{color:T.dim,background:"rgba(0,0,0,0.5)"}}>
            Scroll to zoom · Middle-drag to pan
          </div>
        </div>

        {/* Right panels */}
        <div className="flex flex-col" style={{background:T.panel,borderLeft:`1px solid ${T.border}`}}>

          {/* Snapshots panel */}
          {showSnapshots&&(
            <div className="w-64 border-b flex flex-col" style={{borderColor:T.border,maxHeight:200}}>
              <div className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 flex-shrink-0" style={{color:T.accent,borderBottom:`1px solid ${T.border}`}}>
                <div className="w-1 h-3 rounded-full" style={{background:T.accent}}/>
                <Layers size={10}/> Formations ({snapshots.length})
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2.5 space-y-1">
                  {snapshots.length===0&&<div className="text-xs text-center py-3" style={{color:T.dim}}>No formations saved yet</div>}
                  {snapshots.map(s=>(
                    <div key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all group"
                      style={{background:T.panel2,border:`1px solid ${T.border}`}}
                      onMouseEnter={e=>e.currentTarget.style.borderColor=T.borderHov}
                      onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                      <span className="flex-1 text-xs truncate font-medium" style={{color:T.text}} onClick={()=>loadSnapshot(s)}>{s.name}</span>
                      <button onClick={()=>deleteSnapshot(s.id)} className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all" style={{color:T.dim}}><X size={11}/></button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Notes panel */}
          {showNotes&&(
            <div className="w-64 border-b flex flex-col" style={{borderColor:T.border,height:190}}>
              <div className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 flex-shrink-0" style={{color:T.accent,borderBottom:`1px solid ${T.border}`}}>
                <div className="w-1 h-3 rounded-full" style={{background:T.accent}}/>
                <StickyNote size={10}/> Coaching Notes
              </div>
              <textarea value={notes} onChange={e=>setNotes(e.target.value)}
                placeholder="Add coaching notes here…"
                className="flex-1 resize-none px-4 py-3 text-xs outline-none leading-relaxed"
                style={{background:T.panel2,color:T.text,border:"none"}}/>
            </div>
          )}

          {/* Unit editor / list */}
          <div className="w-72 flex flex-col overflow-hidden flex-1">
            {selUnit
              ?<UnitEditor unit={selUnit}
                  theme={T}
                  onUpdate={p=>updateUnit(selUnit.id,p)}
                  onDelete={()=>deleteUnit(selUnit.id)}
                  onDuplicate={()=>duplicateUnit(selUnit.id)}
                  onClearPath={()=>clearPath(selUnit.id)}
                  onStartPath={()=>{setMode("path");setIsDrawPath(true);setUnits(us=>us.map(u=>u.id===selUnit.id?{...u,path:u.path?.length>0?u.path:[{x:u.x,y:u.y}]}:u));}}
                  onDeselect={()=>setSelId(null)}
                  onAddSkill={()=>addSkill(selUnit.id)}
                  onUpdateSkill={(sid,p)=>updateSkill(selUnit.id,sid,p)}
                  onDeleteSkill={sid=>deleteSkill(selUnit.id,sid)}
                  onUploadIcon={e=>uploadUnitIcon(selUnit.id,e)}
                  onUploadSkillIcon={(sid,e)=>uploadSkillIcon(selUnit.id,sid,e)}/>
              :<UnitList units={units} theme={T} onSelect={id=>setSelId(id)} onDelete={id=>deleteUnit(id)} onDuplicate={id=>duplicateUnit(id)}/>
            }
          </div>
        </div>
      </div>

      {/* ══ TIMELINE ══════════════════════════════════════ */}
      <Timeline units={units} currentTime={curTime} duration={duration} onScrub={scrubTo} theme={T}/>

      {/* ══ TEXT INPUT MODAL ══════════════════════════════ */}
      {showTextInput&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)"}}>
          <div className="rounded-2xl p-5 w-80 space-y-4" style={{background:T.panel,border:`1px solid ${T.border}`,boxShadow:"0 24px 64px rgba(0,0,0,0.7)"}}>
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full" style={{background:T.accent,boxShadow:T.accentGlow}}/>
              <div className="text-sm font-bold" style={{color:T.text}}>Add Text Label</div>
            </div>
            <Input value={textInput} onChange={e=>setTextInput(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter")confirmTextLabel();if(e.key==="Escape"){setShowTextInput(false);}}}
              placeholder="Label text…" autoFocus
              className="text-sm rounded-xl" style={{background:T.panel2,borderColor:T.border,color:T.text}}/>
            <div className="flex gap-3 items-center">
              <Label className="text-xs" style={{color:T.dim}}>Color</Label>
              <input type="color" value={textColor} onChange={e=>setTextColor(e.target.value)} className="h-7 w-10 rounded-lg cursor-pointer" style={{border:`1px solid ${T.border}`}}/>
              <Label className="text-xs ml-1" style={{color:T.dim}}>Size</Label>
              <input type="number" value={textSize} onChange={e=>setTextSize(Number(e.target.value))} className="w-16 h-7 text-xs px-2 rounded-lg" style={{background:T.panel2,border:`1px solid ${T.border}`,color:T.text}}/>
            </div>
            <div className="flex gap-2">
              <button onClick={confirmTextLabel} className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all" style={{background:T.accentBg,color:T.accent,border:`1px solid ${T.accentDim}`,boxShadow:T.accentGlow}}>Place</button>
              <button onClick={()=>{setShowTextInput(false);setTextInput("");}} className="px-4 py-2.5 rounded-xl text-sm transition-all" style={{color:T.dim,border:`1px solid ${T.border}`}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ DONATE MODAL ══════════════════════════════════ */}
      {showDonate&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:"rgba(0,0,0,0.8)",backdropFilter:"blur(8px)"}}>
          <div className="rounded-2xl p-6 w-96 space-y-5" style={{background:T.panel,border:`1px solid ${T.border}`,boxShadow:"0 32px 80px rgba(0,0,0,0.8)"}}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{background:"rgba(244,114,182,0.15)",border:"1px solid rgba(244,114,182,0.3)"}}>
                  <Heart size={16} className="text-pink-400"/>
                </div>
                <span className="text-base font-bold" style={{color:T.text}}>Support the Planner</span>
              </div>
              <button onClick={()=>setShowDonate(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition-all" style={{color:T.dim}}><X size={16}/></button>
            </div>
            <p className="text-sm leading-relaxed" style={{color:T.dim}}>
              This tool is free to use. If it's helped your guild's ZvZ coordination, a small tip keeps it going and helps add more features.
            </p>
            <div className="space-y-2">
              <a href="https://ko-fi.com/byakko10581" target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                style={{background:"#ff5e5b",color:"#fff",boxShadow:"0 4px 20px rgba(255,94,91,0.4)"}}>
                ☕ Buy me a coffee on Ko-fi
              </a>
              <a href="https://paypal.com" target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                style={{background:"#0070ba",color:"#fff",boxShadow:"0 4px 20px rgba(0,112,186,0.4)"}}>
                💳 Donate via PayPal
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  UNIT EDITOR
// ═══════════════════════════════════════════════════════════════
function UnitEditor({unit,theme:T,onUpdate,onDelete,onDuplicate,onClearPath,onStartPath,onDeselect,onAddSkill,onUpdateSkill,onDeleteSkill,onUploadIcon,onUploadSkillIcon}){
  const c=unit.color||getRoleColor(unit.role);
  const [showPresets, setShowPresets] = useState(false);
  const presets = PRESET_ICONS[unit.role] || [];
  return(
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{borderBottom:`1px solid ${T.border}`,borderLeft:`3px solid ${c}`,background:`linear-gradient(90deg,${c}12,transparent)`}}>
        <div>
          <div className="text-sm font-bold" style={{color:c}}>{getRoleLabel(unit.role)}</div>
          <div className="text-[11px]" style={{color:T.dim}}>{unit.label||"No label"}</div>
        </div>
        <div className="flex gap-1">
          <button onClick={onDuplicate} title="Duplicate" className="p-1.5 rounded-lg transition-all hover:bg-white/5" style={{color:T.dim}}><Copy size={13}/></button>
          <button onClick={onDeselect} className="px-2 py-1.5 rounded-lg text-xs transition-all hover:bg-white/5" style={{color:T.dim}}>← List</button>
          <button onClick={onDelete} className="p-1.5 rounded-lg transition-all hover:bg-red-500/10 hover:text-red-400" style={{color:T.dim}}><Trash2 size={13}/></button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-5">
          {/* Identity */}
          <section className="space-y-2">
            <SectionTitle theme={T}>Identity</SectionTitle>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label className="text-[11px] mb-1 block" style={{color:T.dim}}>Label</Label>
                <Input value={unit.label} onChange={e=>onUpdate({label:e.target.value})} placeholder="e.g. Alpha Tank" className="h-7 text-xs" style={{background:T.panel2,borderColor:T.border,color:T.text}}/>
              </div>
            </div>

            {/* Icon section */}
            <div>
              <Label className="text-[11px] mb-2 block" style={{color:T.dim}}>Icon</Label>
              <div className="flex items-center gap-2">
                {/* Current icon preview */}
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{background:T.panel2,border:`1px solid ${T.border}`}}>
                  {unit.iconUrl
                    ?<img src={unit.iconUrl} className="w-full h-full object-cover"/>
                    :<span style={{color:c,fontWeight:"bold",fontSize:18}}>{getRoleLetter(unit.role)}</span>
                  }
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  {/* Preset picker button */}
                  {presets.length>0&&(
                    <button onClick={()=>setShowPresets(v=>!v)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all w-full"
                      style={showPresets?{background:T.btnActive,color:T.accent,borderColor:T.accentDim}:{color:T.text,borderColor:T.border,background:T.panel2}}>
                      <Layers size={11}/> Choose Preset <ChevronDown size={10} className={`ml-auto transition-transform ${showPresets?"rotate-180":""}`}/>
                    </button>
                  )}
                  {/* Upload custom */}
                  <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border cursor-pointer transition-all hover:border-white/20 w-full" style={{color:T.dim,borderColor:T.border,background:T.panel2}}>
                    <Upload size={10}/> Upload custom<input type="file" accept="image/*" className="hidden" onChange={onUploadIcon}/>
                  </label>
                  {/* Clear */}
                  {unit.iconUrl&&(
                    <button onClick={()=>onUpdate({iconUrl:null})} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-transparent transition-all hover:text-red-400" style={{color:T.dim}}>
                      <X size={10}/> Clear icon
                    </button>
                  )}
                </div>
              </div>

              {/* Preset gallery */}
              {showPresets&&presets.length>0&&(
                <div className="mt-2 p-2 rounded-xl" style={{background:T.panel2,border:`1px solid ${T.border}`}}>
                  <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{color:T.dim}}>Select preset</div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {presets.map((src,i)=>(
                      <button key={i} onClick={()=>{onUpdate({iconUrl:src});setShowPresets(false);}}
                        className="aspect-square rounded-xl overflow-hidden transition-all hover:scale-105 hover:opacity-90"
                        style={{border:unit.iconUrl===src?`2px solid ${T.accent}`:`1px solid ${T.border}`,boxShadow:unit.iconUrl===src?T.accentGlow:undefined}}>
                        <img src={src} className="w-full h-full object-cover"/>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <div>
                <Label className="text-[11px] mb-1 block" style={{color:T.dim}}>Team</Label>
                <div className="flex gap-1">
                  {["A","B",""].map(t=>(
                    <button key={t} onClick={()=>onUpdate({team:t})}
                      className="px-3 py-1 rounded-lg text-xs font-bold border transition-all"
                      style={unit.team===t?{background:t==="A"?"rgba(37,99,235,0.25)":t==="B"?"rgba(220,38,38,0.25)":T.panel2,color:t==="A"?"#60a5fa":t==="B"?"#f87171":T.text,borderColor:t==="A"?"rgba(37,99,235,0.4)":t==="B"?"rgba(220,38,38,0.4)":T.dim}:{color:T.dim,borderColor:T.border}}>
                      {t||"—"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="ml-auto">
                <Label className="text-[11px] mb-1 block" style={{color:T.dim}}>Color</Label>
                <input type="color" value={unit.color||getRoleColor(unit.role)} onChange={e=>onUpdate({color:e.target.value})} className="h-8 w-10 rounded-xl cursor-pointer" style={{border:`1px solid ${T.border}`}}/>
              </div>
            </div>
          </section>
          {/* Movement */}
          <section className="space-y-2">
            <SectionTitle theme={T}>Movement</SectionTitle>
            <SliderRow theme={T} label="Speed" value={unit.speed} min={10} max={500} step={5} display={v=>`${v} px/s`} onChange={v=>onUpdate({speed:v})}/>
            <SliderRow theme={T} label="Start Delay" value={unit.delay} min={0} max={20} step={0.5} display={v=>`${v}s`} onChange={v=>onUpdate({delay:v})}/>
            <div className="flex gap-2">
              <button onClick={onStartPath} className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-bold border transition-all" style={{color:"#4ade80",borderColor:"rgba(74,222,128,0.3)",background:"rgba(74,222,128,0.08)"}}>
                <Route size={11}/> Draw Path
              </button>
              <button onClick={onClearPath} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs border transition-all hover:border-red-500/30 hover:text-red-400" style={{color:T.dim,borderColor:T.border}}>
                <Trash2 size={11}/> Clear
              </button>
            </div>
            <div className="text-[10px] font-mono" style={{color:T.dim}}>
              {unit.path?.length||0} waypoints{unit.path?.length>=2&&` · ${pathLen(unit.path).toFixed(0)}px · ${(pathLen(unit.path)/(unit.speed||200)).toFixed(1)}s`}
            </div>
          </section>
          {/* Skills */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <SectionTitle theme={T}>Skills / Effects</SectionTitle>
              <button onClick={onAddSkill} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] border transition-all" style={{color:T.accent,borderColor:T.accentDim,background:T.accentBg}}>
                <Plus size={10}/> Add
              </button>
            </div>
            <p className="text-[10px] leading-relaxed" style={{color:T.dim}}>Upload a skill effect image — it displays above the unit at the trigger time during playback.</p>
            {(unit.skills||[]).length===0&&<div className="text-center text-xs py-4 rounded-xl border border-dashed" style={{color:T.dim,borderColor:T.border}}>No skills added yet</div>}
            {(unit.skills||[]).map(sk=>(
              <SkillRow key={sk.id} skill={sk} theme={T}
                onUpdate={p=>onUpdateSkill(sk.id,p)}
                onDelete={()=>onDeleteSkill(sk.id)}
                onUploadIcon={e=>onUploadSkillIcon(sk.id,e)}/>
            ))}
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}

function SkillRow({skill,theme:T,onUpdate,onDelete,onUploadIcon}){
  return(
    <div className="rounded-xl p-3 space-y-2.5" style={{background:T.panel2,border:`1px solid ${T.border}`}}>
      <div className="flex items-center gap-2">
        {skill.iconUrl
          ?<img src={skill.iconUrl} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" style={{border:`1px solid ${T.border}`}}/>
          :<div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{background:T.panel,border:`1px solid ${T.border}`}}>⚡</div>
        }
        <Input value={skill.name} onChange={e=>onUpdate({name:e.target.value})} placeholder="Skill name"
          className="h-7 text-xs flex-1 rounded-lg" style={{background:T.panel,borderColor:T.border,color:T.text}}/>
        <label className="cursor-pointer p-1.5 rounded-lg hover:bg-white/5 transition-all" style={{color:T.dim}}>
          <Upload size={12}/><input type="file" accept="image/*" className="hidden" onChange={onUploadIcon}/>
        </label>
        <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-all" style={{color:T.dim}}><X size={12}/></button>
      </div>
      <SliderRow theme={T} label={<span className="flex items-center gap-1"><Clock size={9}/> Trigger</span>} value={skill.triggerTime} min={0} max={60} step={0.5} display={v=>`${v}s`} onChange={v=>onUpdate({triggerTime:v})}/>
      <SliderRow theme={T} label="Display duration" value={skill.duration} min={100} max={5000} step={100} display={v=>`${(v/1000).toFixed(1)}s`} onChange={v=>onUpdate({duration:v})}/>
      {skill.iconUrl&&<p className="text-[10px]" style={{color:T.dim}}>✓ Effect image set — will display during playback</p>}
    </div>
  );
}

// ─── UNIT LIST ──────────────────────────────────────────────
function UnitList({units,theme:T,onSelect,onDelete,onDuplicate}){
  if(!units.length) return(
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{background:T.panel2,border:`1px solid ${T.border}`}}>
        <MousePointer2 size={24} style={{color:T.dim,opacity:0.4}}/>
      </div>
      <span className="text-sm leading-relaxed" style={{color:T.dim}}>Click "Add Role" then click the map to place units</span>
    </div>
  );
  const byTeam=[["A",units.filter(u=>u.team==="A")],["B",units.filter(u=>u.team==="B")],["",units.filter(u=>!u.team)]].filter(([,g])=>g.length>0);
  return(
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 flex-shrink-0" style={{color:T.accent,borderBottom:`1px solid ${T.border}`}}>
        <div className="w-1 h-3 rounded-full" style={{background:T.accent,boxShadow:T.accentGlow}}/>
        <Users size={10}/> Units ({units.length})
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2.5">
          {byTeam.map(([team,grp])=>(
            <div key={team||"none"} className="mb-3">
              {team&&(
                <div className="flex items-center gap-2 px-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{background:team==="A"?"#3b82f6":"#ef4444"}}/>
                  <span className={`text-[9px] font-bold tracking-widest uppercase ${team==="A"?"text-blue-400":"text-red-400"}`}>Team {team}</span>
                  <div className="flex-1 h-px" style={{background:`linear-gradient(90deg,${team==="A"?"#3b82f630":"#ef444430"},transparent)`}}/>
                </div>
              )}
              {grp.map(u=>{const c=u.color||getRoleColor(u.role);return(
                <div key={u.id} onClick={()=>onSelect(u.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all group mb-1"
                  style={{borderColor:"transparent",background:"transparent"}}
                  onMouseEnter={e=>{e.currentTarget.style.background=T.panel2;e.currentTarget.style.borderColor=T.border;}}
                  onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="transparent";}}>
                  {u.iconUrl?<img src={u.iconUrl} className="w-6 h-6 rounded-full object-cover flex-shrink-0"/>:<div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold" style={{background:c+"22",color:c,border:`1px solid ${c}44`}}>{getRoleLetter(u.role)}</div>}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate" style={{color:c}}>{getRoleLabel(u.role)}{u.label?` · ${u.label}`:""}</div>
                    <div className="text-[10px]" style={{color:T.dim}}>
                      {(u.skills||[]).length>0&&<span className="mr-1" style={{color:T.accent}}>⚡{u.skills.length}</span>}
                      {u.path?.length>=2?`${pathLen(u.path).toFixed(0)}px`:"no path"}{u.delay>0&&` +${u.delay}s`}
                    </div>
                  </div>
                  <button onClick={e=>{e.stopPropagation();onDuplicate(u.id);}} className="opacity-0 group-hover:opacity-100 p-0.5 transition-all" style={{color:T.dim}} title="Duplicate"><Copy size={10}/></button>
                  <button onClick={e=>{e.stopPropagation();onDelete(u.id);}} className="opacity-0 group-hover:opacity-100 p-0.5 transition-all hover:text-red-400" style={{color:T.dim}}><X size={11}/></button>
                </div>
              );})}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── TIMELINE ───────────────────────────────────────────────
function Timeline({units,currentTime,duration,onScrub,theme:T}){
  const scrubRef=useRef(null),isDragging=useRef(false),dur=duration||1;
  function getT(e){const r=scrubRef.current?.getBoundingClientRect();if(!r)return 0;const cx=e.touches?.[0]?.clientX??e.clientX;return clamp(((cx-r.left)/r.width)*dur,0,dur);}
  function onDown(e){e.preventDefault();isDragging.current=true;onScrub(getT(e));}
  function onMove(e){if(isDragging.current)onScrub(getT(e));}
  function onUp(){isDragging.current=false;}
  useEffect(()=>{window.addEventListener("mousemove",onMove);window.addEventListener("mouseup",onUp);return()=>{window.removeEventListener("mousemove",onMove);window.removeEventListener("mouseup",onUp);};},[dur]);
  const pct=(currentTime/dur)*100;
  const ticks=[];for(let i=0;i<=Math.floor(dur);i++)ticks.push(i);
  const unitsWithSkills=units.filter(u=>(u.skills||[]).length>0);
  const skillMarkers=units.flatMap(u=>(u.skills||[]).map(sk=>{
    const c=u.color||getRoleColor(u.role),x=(sk.triggerTime/dur)*100;
    return(
      <div key={`${u.id}_${sk.id}`} className="absolute top-0 bottom-0 w-0.5 pointer-events-none" style={{left:`${x}%`,background:c,opacity:0.85}}>
        <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full" style={{background:c,border:"1px solid rgba(0,0,0,0.5)"}}/>
      </div>
    );
  }));
  return(
    <div className="flex-shrink-0" style={{background:T.panel2,borderTop:`1px solid ${T.border}`}}>
      <div className="flex items-center gap-3 px-4 py-2" style={{borderBottom:`1px solid ${T.border}`}}>
        <span className="text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5" style={{color:T.accent}}>
          <div className="w-1 h-3 rounded-full" style={{background:T.accent,boxShadow:T.accentGlow}}/>Timeline
        </span>
        <span className="font-mono text-[10px]" style={{color:T.accent}}>{currentTime.toFixed(2)}s</span>
        <span className="text-[10px]" style={{color:T.dim}}>/ {dur.toFixed(1)}s</span>
        <div className="flex-1"/>
        <span className="text-[10px]" style={{color:T.dim}}>drag to scrub · space to play</span>
      </div>
      <div className="px-4 pt-2 pb-3 space-y-1.5">
        <div ref={scrubRef} onMouseDown={onDown}
          className="relative h-6 rounded-xl cursor-pointer select-none overflow-hidden"
          style={{background:T.panel,border:`1px solid ${T.border}`}}>
          <div className="absolute left-0 top-0 h-full rounded-xl" style={{width:`${pct}%`,background:`linear-gradient(90deg,${T.accentBg},rgba(245,158,11,0.25))`}}/>
          {ticks.map(i=>{const x=(i/dur)*100,isMajor=i%5===0;return(
            <div key={i} className="absolute top-0 bottom-0 pointer-events-none" style={{left:`${x}%`,borderLeft:`1px solid ${isMajor?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.03)"}`}}>
              {isMajor&&i>0&&<span className="absolute bottom-0.5 left-0.5 text-[8px] font-mono leading-none" style={{color:T.dim}}>{i}s</span>}
            </div>
          );})}
          {skillMarkers}
          <div className="absolute top-0 bottom-0 w-0.5 pointer-events-none rounded-full" style={{left:`${pct}%`,background:T.accent,boxShadow:T.accentGlow}}>
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full" style={{background:T.accent,border:`2px solid ${T.panel2}`,boxShadow:T.accentGlow}}/>
          </div>
        </div>
        {unitsWithSkills.length>0&&(
          <div className="space-y-1 overflow-y-auto" style={{maxHeight:64}}>
            {unitsWithSkills.map(u=>{const c=u.color||getRoleColor(u.role),pathDur=u.path?.length>=2?pathLen(u.path)/(u.speed||200):0;return(
              <div key={u.id} className="flex items-center gap-2 h-5">
                <div className="w-20 flex-shrink-0 flex items-center gap-1.5 overflow-hidden">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:c,boxShadow:`0 0 4px ${c}`}}/>
                  <span className="text-[9px] truncate" style={{color:T.dim}}>{u.label||getRoleLabel(u.role)}</span>
                </div>
                <div className="flex-1 relative h-3 rounded-full" style={{background:T.panel}}>
                  {pathDur>0&&<div className="absolute top-0 h-full rounded-full" style={{background:c,opacity:0.18,left:`${((u.delay||0)/dur)*100}%`,width:`${(pathDur/dur)*100}%`}}/>}
                  {(u.skills||[]).map(sk=>(
                    <div key={sk.id} className="absolute top-0 bottom-0 flex items-center" style={{left:`${(sk.triggerTime/dur)*100}%`}}>
                      <div className="w-1.5 h-full rounded-full" style={{background:c,boxShadow:`0 0 4px ${c}`}}/>
                    </div>
                  ))}
                  <div className="absolute top-0 bottom-0 w-px pointer-events-none" style={{left:`${pct}%`,background:`${T.accent}50`}}/>
                </div>
              </div>
            );})}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SHARED SMALL COMPONENTS ────────────────────────────────
function SectionTitle({children,theme:T}){
  return(
    <div className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-1" style={{color:T.accent}}>
      <div className="w-1 h-3 rounded-full flex-shrink-0" style={{background:T.accent,boxShadow:T.accentGlow}}/>{children}
      <div className="flex-1 h-px" style={{background:`linear-gradient(90deg,${T.accentDim}60,transparent)`}}/>
    </div>
  );
}

function SliderRow({label,value,min,max,step,display,onChange,theme:T}){
  return(
    <div>
      <div className="flex justify-between mb-1">
        <Label className="text-[10px]" style={{color:T.dim}}>{label}</Label>
        <span className="text-[10px] font-mono" style={{color:T.accent}}>{display(value)}</span>
      </div>
      <Slider value={[value]} onValueChange={([v])=>onChange(v)} min={min} max={max} step={step} className="w-full"/>
    </div>
  );
}

// ─── PRESENT TIMELINE (slim scrubber for presentation mode) ──
function PresentTimeline({currentTime,duration,onScrub}){
  const ref=useRef(null),dragging=useRef(false),dur=duration||1;
  function getT(e){const r=ref.current?.getBoundingClientRect();if(!r)return 0;const cx=e.touches?.[0]?.clientX??e.clientX;return clamp(((cx-r.left)/r.width)*dur,0,dur);}
  function onDown(e){e.preventDefault();dragging.current=true;onScrub(getT(e));}
  function onMove(e){if(dragging.current)onScrub(getT(e));}
  function onUp(){dragging.current=false;}
  useEffect(()=>{window.addEventListener("mousemove",onMove);window.addEventListener("mouseup",onUp);return()=>{window.removeEventListener("mousemove",onMove);window.removeEventListener("mouseup",onUp);};},[dur]);
  const pct=(currentTime/dur)*100;
  return(
    <div ref={ref} onMouseDown={onDown}
      className="relative h-3 w-64 rounded-full cursor-pointer select-none"
      style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)"}}>
      <div className="absolute left-0 top-0 h-full rounded-full" style={{width:`${pct}%`,background:"rgba(217,119,6,0.6)"}}/>
      <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full" style={{left:`calc(${pct}% - 6px)`,background:"#fbbf24",border:"2px solid #000"}}/>
    </div>
  );
}
