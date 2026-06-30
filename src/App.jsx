import { useState, useRef, useEffect, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { PLOTS, INFRA, STATUS_CFG, STATS, KCN_SYSTEM_PROMPT, TOUR_STOPS } from './data.js';

const QUICK = ["Lô còn trống","Giá thuê Zone B","Kết nối cảng biển","Hạ tầng điện","Thủ tục FDI","Lô lớn nhất"];

function renderBold(text) {
  return text.split(/\*\*(.*?)\*\*/g).map((p,i) =>
    i%2===1 ? <strong key={i} style={{color:'#60a5fa'}}>{p}</strong> : <span key={i}>{p}</span>
  );
}

export default function App() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const chatRef = useRef(null);

  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const [messages, setMessages] = useState([
    { role:'assistant', content:'Xin chào! Tôi là **Sales AI** của KCN Long Thành – Đồng Nai.\n\nBản đồ vệ tinh 3D đã sẵn sàng! Bạn có thể:\n• **Click vào lô đất** để xem chi tiết\n• Nhấn **Auto Tour** để xem toàn khu\n• Hỏi tôi về giá thuê, hạ tầng, logistics' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [touring, setTouring] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const tourCancelRef = useRef(false);

  // ── MAP INIT ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          satellite: {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            attribution: '© Esri World Imagery'
          },
          labels: {
            type: 'raster',
            tiles: ['https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
          }
        },
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        layers: [
          { id:'satellite', type:'raster', source:'satellite' },
          { id:'labels',    type:'raster', source:'labels', paint:{'raster-opacity':0.7} },
        ]
      },
      center: [106.952, 10.976],
      zoom: 15,
      pitch: 55,
      bearing: -10,
      antialias: true,
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    map.on('load', () => {
      // GeoJSON source
      const features = PLOTS.map(p => ({
        type: 'Feature',
        properties: { id:p.id, status:p.status, area:p.area, price:p.price, zone:p.zone },
        geometry: { type:'Polygon', coordinates:[p.coords] }
      }));

      map.addSource('plots', { type:'geojson', data:{ type:'FeatureCollection', features } });

      // Fill
      map.addLayer({ id:'plots-fill', type:'fill', source:'plots', paint:{
        'fill-color':['match',['get','status'],'available','#22c55e','negotiating','#f59e0b','leased','#475569','#94a3b8'],
        'fill-opacity':['match',['get','status'],'available',0.35,'negotiating',0.35,'leased',0.2,0.2],
      }});

      // 3D extrusion
      map.addLayer({ id:'plots-3d', type:'fill-extrusion', source:'plots', paint:{
        'fill-extrusion-color':['match',['get','status'],'available','#22c55e','negotiating','#f59e0b','leased','#475569','#94a3b8'],
        'fill-extrusion-height': 8,
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.65,
      }});

      // Outline
      map.addLayer({ id:'plots-line', type:'line', source:'plots', paint:{
        'line-color':['match',['get','status'],'available','#22c55e','negotiating','#f59e0b','leased','#64748b','#94a3b8'],
        'line-width': 2,
      }});

      // Labels
      map.addLayer({ id:'plots-label', type:'symbol', source:'plots', layout:{
        'text-field':['concat',['get','id'],'\n',['to-string',['get','area']],' m²'],
        'text-size':11, 'text-anchor':'center',
        'text-font':['Open Sans Bold','Arial Unicode MS Bold'],
      }, paint:{
        'text-color':['match',['get','status'],'available','#4ade80','negotiating','#fbbf24','leased','#94a3b8','#fff'],
        'text-halo-color':'#000000','text-halo-width':1.5,
      }});

      // Infra markers
      INFRA.forEach(i => {
        const el = document.createElement('div');
        el.style.cssText = 'font-size:22px;cursor:default;filter:drop-shadow(0 2px 6px rgba(0,0,0,.9));user-select:none';
        el.textContent = i.icon;
        new maplibregl.Marker({ element:el })
          .setLngLat([i.lon, i.lat])
          .setPopup(new maplibregl.Popup({ offset:25 }).setHTML(
            `<div style="background:#0d1117;color:#e2e8f0;padding:6px 10px;font-size:12px;border-radius:6px">${i.icon} ${i.label}</div>`
          ))
          .addTo(map);
      });

      // Click
      map.on('click', 'plots-fill', e => {
        const id = e.features[0].properties.id;
        const plot = PLOTS.find(p => p.id === id);
        if (plot) handlePlotClick(plot);
      });
      map.on('mouseenter','plots-fill',()=>{ map.getCanvas().style.cursor='pointer'; });
      map.on('mouseleave','plots-fill',()=>{ map.getCanvas().style.cursor=''; });
    });

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // ── FILTER ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const f = filter === 'all' ? null : ['==',['get','status'],filter];
    ['plots-fill','plots-line','plots-3d','plots-label'].forEach(id => {
      try { map.setFilter(id, f); } catch(e) {}
    });
  }, [filter]);

  // ── PLOT CLICK ────────────────────────────────────────────────────────────
  const handlePlotClick = useCallback((plot) => {
    setSelected(plot);
    const map = mapRef.current;
    if (map) {
      const c = plot.coords[0];
      const cx = (plot.coords[0][0] + plot.coords[2][0]) / 2;
      const cy = (plot.coords[0][1] + plot.coords[2][1]) / 2;
      map.flyTo({ center:[cx,cy], zoom:17.5, pitch:55, bearing:-10, duration:1200 });
    }
    sendMessage(`Cho tôi xem chi tiết lô ${plot.id} Zone ${plot.zone}`);
  }, []);

  // ── FLY TO ────────────────────────────────────────────────────────────────
  const flyTo = useCallback((center, zoom, pitch=55, bearing=-10) => {
    mapRef.current?.flyTo({ center, zoom, pitch, bearing, duration:1800 });
  }, []);

  // ── AUTO TOUR ─────────────────────────────────────────────────────────────
  const startTour = useCallback(async () => {
    if (touring) { tourCancelRef.current = true; return; }
    tourCancelRef.current = false;
    setTouring(true);
    addMsg('assistant','🎬 Bắt đầu Auto Tour KCN Long Thành...');

    for (const stop of TOUR_STOPS) {
      if (tourCancelRef.current) break;
      mapRef.current?.flyTo({ center:stop.center, zoom:stop.zoom, pitch:stop.pitch, bearing:stop.bearing, duration:2200 });
      await sleep(3000);
      if (tourCancelRef.current) break;
      addMsg('assistant', stop.label);
    }

    setTouring(false);
    if (!tourCancelRef.current) addMsg('assistant','✅ Tour hoàn thành! Click vào lô đất để xem chi tiết.');
  }, [touring]);

  // ── AI CHAT ───────────────────────────────────────────────────────────────
  const addMsg = (role, content) => {
    setMessages(m => [...m, { role, content }]);
  };

  const sendMessage = async (text) => {
    if (!text?.trim() || loading) return;
    const userMsg = text.trim();
    setInput('');
    const newMsgs = [...messages, { role:'user', content:userMsg }];
    setMessages(newMsgs);
    setLoading(true);
    if (!chatOpen) setChatOpen(true);

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          model:'claude-sonnet-4-6',
          max_tokens:800,
          system: KCN_SYSTEM_PROMPT,
          messages: newMsgs.slice(-12).map(m=>({ role:m.role, content:m.content }))
        })
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || 'Xin lỗi, thử lại nhé!';
      setMessages(m => [...m, { role:'assistant', content:reply }]);
    } catch(e) {
      setMessages(m => [...m, { role:'assistant', content:'Lỗi kết nối. Vui lòng thử lại!' }]);
    }
    setLoading(false);
  };

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight);
  }, [messages]);

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // ── UI ────────────────────────────────────────────────────────────────────
  const isMobile = window.innerWidth < 768;

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'#060b14',color:'#e2e8f0',fontFamily:"-apple-system,'Segoe UI',sans-serif",overflow:'hidden'}}>

      {/* TOPBAR */}
      <div style={{background:'#0d1117',borderBottom:'1px solid #1e293b',padding:'9px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,zIndex:10}}>
        <div>
          <div style={{fontSize:9,color:'#3b82f6',textTransform:'uppercase',letterSpacing:3}}>PROtech · PROBIM Platform</div>
          <div style={{fontSize:isMobile?12:15,fontWeight:700,color:'#f1f5f9'}}>KCN LONG THÀNH – ĐỒNG NAI · SALES MAP 3D</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <div style={{width:7,height:7,borderRadius:'50%',background:'#22c55e',boxShadow:'0 0 8px #22c55e',animation:'blink 2s infinite'}}/>
          <span style={{fontSize:10,color:'#22c55e',fontWeight:600}}>LIVE 3D</span>
        </div>
      </div>

      {/* STATS */}
      <div style={{background:'#0d1117',borderBottom:'1px solid #1e293b',padding:'6px 16px',display:'flex',gap:isMobile?14:24,flexShrink:0,overflowX:'auto'}}>
        {[
          {l:'Tổng lô',v:STATS.total,c:'#94a3b8'},
          {l:'Còn trống',v:STATS.available,c:'#22c55e'},
          {l:'Đàm phán',v:STATS.negotiating,c:'#f59e0b'},
          {l:'Đã thuê',v:STATS.leased,c:'#64748b'},
          {l:'Trống (ha)',v:STATS.availableHa,c:'#60a5fa'},
          {l:'Giá từ',v:'75 USD',c:'#a78bfa'},
        ].map(s=>(
          <div key={s.l} style={{flexShrink:0}}>
            <div style={{fontSize:9,color:'#475569',textTransform:'uppercase',letterSpacing:.5}}>{s.l}</div>
            <div style={{fontSize:15,fontWeight:700,color:s.c,lineHeight:1.1}}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* MAIN */}
      <div style={{flex:1,display:'flex',overflow:'hidden',position:'relative'}}>

        {/* MAP */}
        <div style={{flex:1,position:'relative'}}>
          <div ref={mapContainer} style={{width:'100%',height:'100%'}}/>

          {/* LEFT CONTROLS */}
          <div style={{position:'absolute',top:10,left:10,zIndex:20,display:'flex',flexDirection:'column',gap:6}}>
            <div style={{background:'#0d1117dd',border:'1px solid #1e293b',borderRadius:10,padding:'8px 10px',backdropFilter:'blur(10px)'}}>
              <div style={{fontSize:9,color:'#475569',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Lọc trạng thái</div>
              {[
                {k:'all',l:'Tất cả lô',c:'#94a3b8'},
                {k:'available',l:'🟢 Còn trống (5)',c:'#22c55e'},
                {k:'negotiating',l:'🟡 Đàm phán (3)',c:'#f59e0b'},
                {k:'leased',l:'⚫ Đã thuê (4)',c:'#64748b'},
              ].map(f=>(
                <button key={f.k} onClick={()=>{setFilter(f.k);setSelected(null);}} style={{
                  display:'flex',alignItems:'center',gap:7,
                  background:filter===f.k?'#172554':'#1e293b',
                  color:filter===f.k?'#93c5fd':f.c,
                  border:`1px solid ${filter===f.k?'#2563eb':'#334155'}`,
                  borderRadius:7,padding:'5px 10px',fontSize:11,cursor:'pointer',
                  width:'100%',textAlign:'left',marginBottom:4,
                }}>{f.l}</button>
              ))}
            </div>

            <div style={{background:'#0d1117dd',border:'1px solid #1e293b',borderRadius:10,padding:'8px 10px',backdropFilter:'blur(10px)'}}>
              <div style={{fontSize:9,color:'#475569',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Góc nhìn nhanh</div>
              {[
                {l:'🏭 Toàn khu KCN', fn:()=>flyTo([106.952,10.976],15)},
                {l:'📍 Zone A',        fn:()=>flyTo([106.9503,10.9791],16.5)},
                {l:'📍 Zone B',        fn:()=>flyTo([106.9503,10.9777],16.5)},
                {l:'📍 Zone C',        fn:()=>flyTo([106.9503,10.9762],16.5)},
                {l:'⚡ Hạ tầng kỹ thuật', fn:()=>flyTo([106.9510,10.9748],17,45)},
              ].map(b=>(
                <button key={b.l} onClick={b.fn} style={{
                  display:'block',background:'#1e293b',color:'#64748b',
                  border:'1px solid #334155',borderRadius:7,padding:'5px 10px',
                  fontSize:11,cursor:'pointer',width:'100%',textAlign:'left',marginBottom:4,
                }}>{b.l}</button>
              ))}
            </div>
          </div>

          {/* LEGEND */}
          <div style={{position:'absolute',bottom:50,left:10,zIndex:20,background:'#0d1117dd',border:'1px solid #1e293b',borderRadius:10,padding:'9px 12px',backdropFilter:'blur(10px)'}}>
            <div style={{fontSize:9,color:'#475569',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Chú giải</div>
            {Object.entries(STATUS_CFG).map(([k,v])=>(
              <div key={k} style={{display:'flex',alignItems:'center',gap:7,marginBottom:4}}>
                <div style={{width:11,height:11,borderRadius:2,background:v.fill+'55',border:`2px solid ${v.fill}`}}/>
                <span style={{fontSize:11,color:v.fill}}>{v.label}</span>
              </div>
            ))}
          </div>

          {/* TOUR BUTTON */}
          <button onClick={startTour} style={{
            position:'absolute',bottom:50,right:chatOpen&&!isMobile?366:10,zIndex:20,
            background:touring?'#7c3aed':'linear-gradient(135deg,#7c3aed,#1d4ed8)',
            color:'#fff',border:'none',borderRadius:10,padding:'10px 16px',
            fontSize:12,fontWeight:600,cursor:'pointer',
            display:'flex',alignItems:'center',gap:7,
            boxShadow:'0 4px 20px rgba(124,58,237,.4)',
            transition:'right .3s ease',
          }}>
            {touring ? '⏹ Dừng tour' : '🎬 Auto Tour KCN'}
          </button>

          {/* PLOT INFO POPUP */}
          {selected && (
            <div style={{
              position:'absolute',top:10,right:chatOpen&&!isMobile?366:10,zIndex:25,
              width:220,background:'#0d1117f2',
              border:`1px solid ${STATUS_CFG[selected.status].line}`,
              borderRadius:12,padding:'14px 16px',backdropFilter:'blur(12px)',
              boxShadow:`0 0 30px ${STATUS_CFG[selected.status].line}33`,
              transition:'right .3s ease',
            }}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div>
                  <div style={{fontSize:8,color:'#64748b',textTransform:'uppercase',letterSpacing:2}}>Lô · Zone {selected.zone}</div>
                  <div style={{fontSize:24,fontWeight:800,fontFamily:'monospace',color:STATUS_CFG[selected.status].badgeT}}>{selected.id}</div>
                </div>
                <div style={{background:STATUS_CFG[selected.status].badge,border:`1px solid ${STATUS_CFG[selected.status].line}`,color:STATUS_CFG[selected.status].badgeT,borderRadius:20,padding:'2px 8px',fontSize:10,fontWeight:600}}>
                  {STATUS_CFG[selected.status].label}
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px 12px',marginBottom:10}}>
                {[['Diện tích',`${selected.area.toLocaleString()} m²`],['Giá',`${selected.price} USD/m²`],['Điện',selected.power],['Nước',selected.water],['Đường',selected.road],['Tải trọng',selected.floor]].map(([l,v])=>(
                  <div key={l}>
                    <div style={{fontSize:8,color:'#475569',textTransform:'uppercase',marginBottom:1}}>{l}</div>
                    <div style={{fontSize:11,fontWeight:600,color:'#e2e8f0'}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{background:'#1e293b',borderRadius:7,padding:'7px 9px',marginBottom:10,fontSize:11,color:'#94a3b8',lineHeight:1.5}}>{selected.note}</div>
              <div style={{display:'flex',gap:6}}>
                {selected.status==='available'&&<button style={{flex:1,background:'#16a34a',color:'#fff',border:'none',borderRadius:7,padding:'7px',fontSize:11,fontWeight:600,cursor:'pointer'}}>📋 Đặt lịch xem lô</button>}
                <button onClick={()=>setSelected(null)} style={{flex:selected.status==='available'?0:1,background:'#1e293b',color:'#64748b',border:'1px solid #334155',borderRadius:7,padding:'7px 10px',fontSize:11,cursor:'pointer'}}>✕</button>
              </div>
            </div>
          )}
        </div>

        {/* CHAT PANEL */}
        {!isMobile && (
          <div style={{width:chatOpen?350:44,background:'#0a0f1a',borderLeft:'1px solid #1e293b',display:'flex',flexDirection:'column',flexShrink:0,transition:'width .3s ease',overflow:'hidden'}}>
            <div onClick={()=>setChatOpen(!chatOpen)} style={{padding:'12px 12px',borderBottom:'1px solid #1e293b',display:'flex',alignItems:'center',gap:9,cursor:'pointer',userSelect:'none',flexShrink:0}}>
              <div style={{width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,#1d4ed8,#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,flexShrink:0}}>🤖</div>
              {chatOpen&&<div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:'#f1f5f9',whiteSpace:'nowrap'}}>Sales AI · Claude</div>
                <div style={{fontSize:10,color:'#22c55e'}}>● Anthropic API</div>
              </div>}
              {chatOpen&&<span style={{color:'#475569',fontSize:12}}>◀</span>}
            </div>

            {chatOpen && <>
              <div ref={chatRef} style={{flex:1,overflowY:'auto',padding:'10px 10px',scrollbarWidth:'thin',scrollbarColor:'#1e293b transparent'}}>
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
                {QUICK.map(q=><button key={q} onClick={()=>sendMessage(q)} style={{background:'#1e293b',color:'#64748b',border:'1px solid #334155',borderRadius:20,padding:'3px 8px',fontSize:10,cursor:'pointer',whiteSpace:'nowrap'}}>{q}</button>)}
              </div>

              <div style={{padding:'8px',borderTop:'1px solid #1e293b',display:'flex',gap:6}}>
                <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMessage(input)}
                  placeholder="Hỏi về lô đất, giá thuê..."
                  style={{flex:1,background:'#1e293b',border:'1px solid #334155',borderRadius:20,padding:'7px 12px',color:'#e2e8f0',fontSize:12,outline:'none'}}
                />
                <button onClick={()=>sendMessage(input)} disabled={loading} style={{background:loading?'#1e293b':'#1d4ed8',color:loading?'#475569':'#fff',border:'none',borderRadius:'50%',width:32,height:32,cursor:loading?'default':'pointer',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>➤</button>
              </div>
            </>}
          </div>
        )}
      </div>

      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes bounce{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-4px);opacity:1}}
        input::placeholder{color:#334155}
        .maplibregl-popup-content{background:transparent!important;box-shadow:none!important;padding:0!important}
        .maplibregl-popup-tip{display:none}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:2px}
      `}</style>
    </div>
  );
}
