import { useState, useRef, useEffect, useCallback } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { PLOTS, INFRA, STATUS_CFG, STATS, KCN_SYSTEM_PROMPT, TOUR_STOPS } from './data.js';

Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2YWEzMTlmMy03M2NlLTQ0YTQtYWI1NS0yMzlmNGJhMzIxMDYiLCJpZCI6NDI3MjkyLCJzdWIiOiJLRVZJTiBUUkFOIiwiaXNzIjoiaHR0cHM6Ly9hcGkuY2VzaXVtLmNvbSIsImF1ZCI6IjAxIiwiaWF0IjoxNzgyNzI4MDIyfQ.Aa9PVqMgNKUz3C5kWyKefugN4dqq_QqYhLflgPd061o';

const QUICK = ["Lô còn trống","Giá thuê Zone B","Kết nối cảng biển","Hạ tầng điện","Thủ tục FDI","Lô lớn nhất"];

function renderBold(text) {
  return text.split(/\*\*(.*?)\*\*/g).map((p,i) =>
    i%2===1 ? <strong key={i} style={{color:'#60a5fa'}}>{p}</strong> : <span key={i}>{p}</span>
  );
}

function plotCenter(coords) {
  const lons = coords.map(c=>c[0]);
  const lats = coords.map(c=>c[1]);
  return [(Math.min(...lons)+Math.max(...lons))/2, (Math.min(...lats)+Math.max(...lats))/2];
}

export default function App() {
  const cesiumContainer = useRef(null);
  const viewerRef = useRef(null);
  const chatRef = useRef(null);
  const tourCancelRef = useRef(false);

  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const [messages, setMessages] = useState([
    { role:'assistant', content:'Xin chào! Tôi là **Sales AI** của KCN Long Thành – Đồng Nai.\n\n🌍 Bản đồ **Cesium 3D Globe** đã sẵn sàng!\n\n• Click vào lô đất để xem chi tiết\n• Nhấn **Auto Tour** để bay qua toàn khu\n• Hỏi tôi về giá thuê, hạ tầng, FDI' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [touring, setTouring] = useState(false);
  const [entities, setEntities] = useState([]);

  // ── CESIUM INIT ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (viewerRef.current) return;

    const viewer = new Cesium.Viewer(cesiumContainer.current, {
      terrainProvider: Cesium.createWorldTerrain(),
      baseLayerPicker: false,
      navigationHelpButton: false,
      sceneModePicker: false,
      geocoder: false,
      homeButton: false,
      fullscreenButton: false,
      animation: false,
      timeline: false,
      infoBox: false,
      selectionIndicator: false,
      creditContainer: document.createElement('div'),
    });

    viewer.scene.skyAtmosphere.show = true;
    viewer.scene.globe.enableLighting = false;
    viewerRef.current = viewer;

    const addedEntities = [];

    // Add plots
    PLOTS.forEach(p => {
      const cfg = STATUS_CFG[p.status];
      const color = Cesium.Color.fromCssColorString(cfg.fill).withAlpha(0.6);
      const outlineColor = Cesium.Color.fromCssColorString(cfg.line);

      const entity = viewer.entities.add({
        id: p.id,
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray(p.coords.flat()),
          material: color,
          outline: true,
          outlineColor: outlineColor,
          outlineWidth: 2,
          height: 0,
          extrudedHeight: 8,
        },
        label: {
          text: p.id,
          position: Cesium.Cartesian3.fromDegrees(...plotCenter(p.coords), 12),
          font: '700 14px monospace',
          fillColor: outlineColor,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(500, 1.2, 3000, 0.4),
        },
        _plotData: p,
      });
      addedEntities.push({ entity, plot: p });
    });

    setEntities(addedEntities);

    // Add infra labels
    INFRA.forEach(i => {
      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(i.lon, i.lat, 5),
        label: {
          text: i.icon + ' ' + i.label,
          font: '12px sans-serif',
          fillColor: Cesium.Color.fromCssColorString('#94a3b8'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(300, 1.0, 2000, 0.3),
        },
      });
    });

    // Click handler
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction(movement => {
      const picked = viewer.scene.pick(movement.position);
      if (Cesium.defined(picked) && picked.id && picked.id._plotData) {
        handlePlotClick(picked.id._plotData, viewer);
      } else {
        setSelected(null);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // Fly to KCN
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(106.952, 10.976, 1800),
      orientation: { heading:0, pitch: Cesium.Math.toRadians(-55), roll:0 },
      duration: 2,
    });

    return () => {
      handler.destroy();
      viewer.destroy();
      viewerRef.current = null;
    };
  }, []);

  // ── FILTER ────────────────────────────────────────────────────────────────
  useEffect(() => {
    entities.forEach(({ entity, plot }) => {
      entity.show = filter === 'all' || plot.status === filter;
    });
  }, [filter, entities]);

  // ── PLOT CLICK ────────────────────────────────────────────────────────────
  const handlePlotClick = useCallback((plot, viewer) => {
    setSelected(plot);
    const [cx, cy] = plotCenter(plot.coords);
    (viewer || viewerRef.current)?.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(cx, cy, 400),
      orientation: { heading:0, pitch: Cesium.Math.toRadians(-45), roll:0 },
      duration: 1.5,
    });
    sendAI(`Chi tiết lô ${plot.id} Zone ${plot.zone}`);
  }, []);

  const flyTo = useCallback((lon, lat, h, pitch=-55) => {
    viewerRef.current?.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, h),
      orientation: { heading:0, pitch: Cesium.Math.toRadians(pitch), roll:0 },
      duration: 2,
    });
  }, []);

  // ── AUTO TOUR ─────────────────────────────────────────────────────────────
  const startTour = useCallback(async () => {
    if (touring) { tourCancelRef.current = true; return; }
    tourCancelRef.current = false;
    setTouring(true);
    addMsg('assistant', '🎬 Bắt đầu Auto Tour KCN Long Thành...');

    for (const stop of TOUR_STOPS) {
      if (tourCancelRef.current) break;
      viewerRef.current?.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(stop.center[0], stop.center[1], stop.zoom * 80),
        orientation: { heading: Cesium.Math.toRadians(stop.bearing||0), pitch: Cesium.Math.toRadians(-(stop.pitch||50)), roll:0 },
        duration: 2.5,
      });
      await sleep(3200);
      if (!tourCancelRef.current) addMsg('assistant', stop.label);
    }

    setTouring(false);
    if (!tourCancelRef.current) addMsg('assistant', '✅ Tour hoàn thành! Click vào lô để xem chi tiết.');
  }, [touring]);

  // ── AI CHAT ───────────────────────────────────────────────────────────────
  const addMsg = (role, content) => setMessages(m => [...m, { role, content }]);

  const sendAI = async (text) => {
    if (!text?.trim() || loading) return;
    const userMsg = text.trim();
    setInput('');
    const newMsgs = [...messages, { role:'user', content:userMsg }];
    setMessages(newMsgs);
    setLoading(true);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          model:'claude-sonnet-4-6', max_tokens:800,
          system: KCN_SYSTEM_PROMPT,
          messages: newMsgs.slice(-12).map(m=>({ role:m.role, content:m.content }))
        })
      });
      const data = await res.json();
      setMessages(m => [...m, { role:'assistant', content: data.content?.[0]?.text || 'Thử lại nhé!' }]);
    } catch(e) {
      setMessages(m => [...m, { role:'assistant', content:'Lỗi kết nối!' }]);
    }
    setLoading(false);
  };

  useEffect(() => { chatRef.current?.scrollTo(0, chatRef.current.scrollHeight); }, [messages]);
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'#060b14',color:'#e2e8f0',fontFamily:"-apple-system,'Segoe UI',sans-serif",overflow:'hidden'}}>

      {/* TOPBAR */}
      <div style={{background:'#0d1117',borderBottom:'1px solid #1e293b',padding:'9px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,zIndex:10}}>
        <div>
          <div style={{fontSize:9,color:'#3b82f6',textTransform:'uppercase',letterSpacing:3}}>PROtech · PROBIM Platform</div>
          <div style={{fontSize:14,fontWeight:700,color:'#f1f5f9'}}>KCN LONG THÀNH – ĐỒNG NAI · CESIUM 3D GLOBE</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <div style={{width:7,height:7,borderRadius:'50%',background:'#22c55e',boxShadow:'0 0 8px #22c55e'}}/>
          <span style={{fontSize:10,color:'#22c55e',fontWeight:600}}>LIVE 3D</span>
        </div>
      </div>

      {/* STATS */}
      <div style={{background:'#0d1117',borderBottom:'1px solid #1e293b',padding:'6px 16px',display:'flex',gap:20,flexShrink:0,overflowX:'auto'}}>
        {[{l:'Tổng lô',v:STATS.total,c:'#94a3b8'},{l:'Còn trống',v:STATS.available,c:'#22c55e'},{l:'Đàm phán',v:STATS.negotiating,c:'#f59e0b'},{l:'Đã thuê',v:STATS.leased,c:'#64748b'},{l:'Trống (ha)',v:STATS.availableHa,c:'#60a5fa'},{l:'Giá từ',v:'75 USD',c:'#a78bfa'}].map(s=>(
          <div key={s.l} style={{flexShrink:0}}>
            <div style={{fontSize:9,color:'#475569',textTransform:'uppercase',letterSpacing:.5}}>{s.l}</div>
            <div style={{fontSize:15,fontWeight:700,color:s.c,lineHeight:1.1}}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* MAIN */}
      <div style={{flex:1,display:'flex',overflow:'hidden'}}>

        {/* CESIUM MAP */}
        <div style={{flex:1,position:'relative'}}>
          <div ref={cesiumContainer} style={{width:'100%',height:'100%'}}/>

          {/* LEFT CONTROLS */}
          <div style={{position:'absolute',top:10,left:10,zIndex:20,display:'flex',flexDirection:'column',gap:6}}>
            <div style={{background:'#0d1117dd',border:'1px solid #1e293b',borderRadius:10,padding:'8px 10px',backdropFilter:'blur(10px)'}}>
              <div style={{fontSize:9,color:'#475569',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Lọc trạng thái</div>
              {[{k:'all',l:'Tất cả lô',c:'#94a3b8'},{k:'available',l:'🟢 Còn trống (5)',c:'#22c55e'},{k:'negotiating',l:'🟡 Đàm phán (3)',c:'#f59e0b'},{k:'leased',l:'⚫ Đã thuê (4)',c:'#64748b'}].map(f=>(
                <button key={f.k} onClick={()=>{setFilter(f.k);setSelected(null);}} style={{display:'flex',alignItems:'center',gap:7,background:filter===f.k?'#172554':'#1e293b',color:filter===f.k?'#93c5fd':f.c,border:`1px solid ${filter===f.k?'#2563eb':'#334155'}`,borderRadius:7,padding:'5px 10px',fontSize:11,cursor:'pointer',width:'100%',textAlign:'left',marginBottom:4}}>{f.l}</button>
              ))}
            </div>
            <div style={{background:'#0d1117dd',border:'1px solid #1e293b',borderRadius:10,padding:'8px 10px',backdropFilter:'blur(10px)'}}>
              <div style={{fontSize:9,color:'#475569',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Góc nhìn nhanh</div>
              {[
                {l:'🌍 Toàn cầu',    fn:()=>flyTo(106.952,10.976,2000000,-30)},
                {l:'🏭 Toàn khu KCN',fn:()=>flyTo(106.952,10.976,1800,-55)},
                {l:'📍 Zone A',       fn:()=>flyTo(106.9503,10.9791,600,-50)},
                {l:'📍 Zone B',       fn:()=>flyTo(106.9503,10.9777,600,-50)},
                {l:'📍 Zone C',       fn:()=>flyTo(106.9503,10.9762,600,-50)},
                {l:'⚡ Hạ tầng',     fn:()=>flyTo(106.9510,10.9748,400,-45)},
              ].map(b=>(
                <button key={b.l} onClick={b.fn} style={{display:'block',background:'#1e293b',color:'#64748b',border:'1px solid #334155',borderRadius:7,padding:'5px 10px',fontSize:11,cursor:'pointer',width:'100%',textAlign:'left',marginBottom:4}}>{b.l}</button>
              ))}
            </div>
          </div>

          {/* LEGEND */}
          <div style={{position:'absolute',bottom:14,left:10,zIndex:20,background:'#0d1117dd',border:'1px solid #1e293b',borderRadius:10,padding:'9px 12px',backdropFilter:'blur(10px)'}}>
            <div style={{fontSize:9,color:'#475569',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Chú giải</div>
            {Object.entries(STATUS_CFG).map(([k,v])=>(
              <div key={k} style={{display:'flex',alignItems:'center',gap:7,marginBottom:4}}>
                <div style={{width:11,height:11,borderRadius:2,background:v.fill+'55',border:`2px solid ${v.fill}`}}/>
                <span style={{fontSize:11,color:v.fill}}>{v.label}</span>
              </div>
            ))}
          </div>

          {/* TOUR BUTTON */}
          <button onClick={startTour} style={{position:'absolute',bottom:14,right:366,zIndex:20,background:touring?'#7c3aed':'linear-gradient(135deg,#7c3aed,#1d4ed8)',color:'#fff',border:'none',borderRadius:10,padding:'10px 16px',fontSize:12,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:7,boxShadow:'0 4px 20px rgba(124,58,237,.4)'}}>
            {touring?'⏹ Dừng tour':'🎬 Auto Tour KCN'}
          </button>

          {/* PLOT INFO */}
          {selected && (
            <div style={{position:'absolute',top:10,right:366,zIndex:25,width:220,background:'#0d1117f2',border:`1px solid ${STATUS_CFG[selected.status].line}`,borderRadius:12,padding:'14px 16px',backdropFilter:'blur(12px)',boxShadow:`0 0 30px ${STATUS_CFG[selected.status].line}33`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div>
                  <div style={{fontSize:8,color:'#64748b',textTransform:'uppercase',letterSpacing:2}}>Lô · Zone {selected.zone}</div>
                  <div style={{fontSize:24,fontWeight:800,fontFamily:'monospace',color:STATUS_CFG[selected.status].badgeT}}>{selected.id}</div>
                </div>
                <div style={{background:STATUS_CFG[selected.status].badge,border:`1px solid ${STATUS_CFG[selected.status].line}`,color:STATUS_CFG[selected.status].badgeT,borderRadius:20,padding:'2px 8px',fontSize:10,fontWeight:600}}>{STATUS_CFG[selected.status].label}</div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px 12px',marginBottom:10}}>
                {[['Diện tích',`${selected.area.toLocaleString()} m²`],['Giá',`${selected.price} USD/m²`],['Điện',selected.power],['Nước',selected.water],['Đường',selected.road],['Tải trọng',selected.floor]].map(([l,v])=>(
                  <div key={l}><div style={{fontSize:8,color:'#475569',textTransform:'uppercase',marginBottom:1}}>{l}</div><div style={{fontSize:11,fontWeight:600,color:'#e2e8f0'}}>{v}</div></div>
                ))}
              </div>
              <div style={{background:'#1e293b',borderRadius:7,padding:'7px 9px',marginBottom:10,fontSize:11,color:'#94a3b8',lineHeight:1.5}}>{selected.note}</div>
              <div style={{display:'flex',gap:6}}>
                {selected.status==='available'&&<button style={{flex:1,background:'#16a34a',color:'#fff',border:'none',borderRadius:7,padding:'7px',fontSize:11,fontWeight:600,cursor:'pointer'}}>📋 Đặt lịch xem lô</button>}
                <button onClick={()=>setSelected(null)} style={{background:'#1e293b',color:'#64748b',border:'1px solid #334155',borderRadius:7,padding:'7px 10px',fontSize:11,cursor:'pointer'}}>✕</button>
              </div>
            </div>
          )}
        </div>

        {/* CHAT */}
        <div style={{width:350,background:'#0a0f1a',borderLeft:'1px solid #1e293b',display:'flex',flexDirection:'column',flexShrink:0}}>
          <div style={{padding:'12px 14px',borderBottom:'1px solid #1e293b',display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#1d4ed8,#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>🤖</div>
            <div><div style={{fontSize:13,fontWeight:700,color:'#f1f5f9'}}>Sales AI · Claude</div><div style={{fontSize:10,color:'#22c55e'}}>● Anthropic API</div></div>
          </div>
          <div ref={chatRef} style={{flex:1,overflowY:'auto',padding:'10px',scrollbarWidth:'thin',scrollbarColor:'#1e293b transparent'}}>
            {messages.map((m,i)=>(
              <div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start',marginBottom:9}}>
                {m.role==='assistant'&&<div style={{width:24,height:24,borderRadius:'50%',background:'linear-gradient(135deg,#1d4ed8,#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,marginRight:7,flexShrink:0,marginTop:2}}>🤖</div>}
                <div style={{maxWidth:'85%',padding:'8px 11px',fontSize:12,lineHeight:1.6,borderRadius:m.role==='user'?'14px 4px 14px 14px':'4px 14px 14px 14px',background:m.role==='user'?'#1d4ed8':'#1e293b',border:m.role==='user'?'none':'1px solid #334155',color:'#e2e8f0',whiteSpace:'pre-wrap'}}>
                  {renderBold(m.content)}
                </div>
              </div>
            ))}
            {loading&&<div style={{display:'flex',gap:7,alignItems:'center'}}>
              <div style={{width:24,height:24,borderRadius:'50%',background:'linear-gradient(135deg,#1d4ed8,#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11}}>🤖</div>
              <div style={{background:'#1e293b',border:'1px solid #334155',borderRadius:'4px 14px 14px 14px',padding:'10px 14px',display:'flex',gap:4}}>
                {[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:'50%',background:'#3b82f6',animation:`bounce .9s ease-in-out ${i*.2}s infinite`}}/>)}
              </div>
            </div>}
          </div>
          <div style={{padding:'6px 8px',borderTop:'1px solid #1e293b',display:'flex',flexWrap:'wrap',gap:4}}>
            {QUICK.map(q=><button key={q} onClick={()=>sendAI(q)} style={{background:'#1e293b',color:'#64748b',border:'1px solid #334155',borderRadius:20,padding:'3px 8px',fontSize:10,cursor:'pointer',whiteSpace:'nowrap'}}>{q}</button>)}
          </div>
          <div style={{padding:'8px',borderTop:'1px solid #1e293b',display:'flex',gap:6}}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendAI(input)} placeholder="Hỏi về lô đất, giá thuê..." style={{flex:1,background:'#1e293b',border:'1px solid #334155',borderRadius:20,padding:'7px 12px',color:'#e2e8f0',fontSize:12,outline:'none'}}/>
            <button onClick={()=>sendAI(input)} disabled={loading} style={{background:loading?'#1e293b':'#1d4ed8',color:loading?'#475569':'#fff',border:'none',borderRadius:'50%',width:32,height:32,cursor:loading?'default':'pointer',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>➤</button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-4px);opacity:1}}
        input::placeholder{color:#334155}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:2px}
      `}</style>
    </div>
  );
}
