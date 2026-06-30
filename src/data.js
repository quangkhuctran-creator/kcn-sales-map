export const PLOTS = [
  { id:"A1", coords:[[106.9480,10.9795],[106.9492,10.9795],[106.9492,10.9786],[106.9480,10.9786],[106.9480,10.9795]], area:8500,  price:95, status:"available",   zone:"A", power:"2×2000 kVA", water:"500 m³/ngày", road:"25m", floor:"30t/m²", note:"Lô góc, 2 mặt tiền đường" },
  { id:"A2", coords:[[106.9493,10.9795],[106.9503,10.9795],[106.9503,10.9786],[106.9493,10.9786],[106.9493,10.9795]], area:6200,  price:95, status:"negotiating", zone:"A", power:"1500 kVA",    water:"350 m³/ngày", road:"25m", floor:"25t/m²", note:"Đàm phán với doanh nghiệp Hàn Quốc" },
  { id:"A3", coords:[[106.9504,10.9795],[106.9515,10.9795],[106.9515,10.9786],[106.9504,10.9786],[106.9504,10.9795]], area:7800,  price:95, status:"available",   zone:"A", power:"2000 kVA",    water:"400 m³/ngày", road:"25m", floor:"30t/m²", note:"Gần trạm PCCC" },
  { id:"A4", coords:[[106.9516,10.9795],[106.9526,10.9795],[106.9526,10.9786],[106.9516,10.9786],[106.9516,10.9795]], area:5500,  price:95, status:"leased",      zone:"A", power:"1200 kVA",    water:"300 m³/ngày", road:"25m", floor:"20t/m²", note:"Cho thuê: Daewon (Hàn Quốc)" },
  { id:"B1", coords:[[106.9478,10.9782],[106.9492,10.9782],[106.9492,10.9771],[106.9478,10.9771],[106.9478,10.9782]], area:12000, price:85, status:"available",   zone:"B", power:"3×2000 kVA",  water:"800 m³/ngày", road:"30m", floor:"40t/m²", note:"Phù hợp nhà máy nặng, logistics" },
  { id:"B2", coords:[[106.9493,10.9782],[106.9505,10.9782],[106.9505,10.9771],[106.9493,10.9771],[106.9493,10.9782]], area:9800,  price:85, status:"leased",      zone:"B", power:"2500 kVA",    water:"600 m³/ngày", road:"30m", floor:"35t/m²", note:"Cho thuê: Lego Vietnam" },
  { id:"B3", coords:[[106.9506,10.9782],[106.9517,10.9782],[106.9517,10.9771],[106.9506,10.9771],[106.9506,10.9782]], area:8200,  price:85, status:"negotiating", zone:"B", power:"2000 kVA",    water:"500 m³/ngày", road:"30m", floor:"30t/m²", note:"Đàm phán với doanh nghiệp Nhật Bản" },
  { id:"B4", coords:[[106.9518,10.9782],[106.9527,10.9782],[106.9527,10.9771],[106.9518,10.9771],[106.9518,10.9782]], area:6500,  price:85, status:"available",   zone:"B", power:"1800 kVA",    water:"400 m³/ngày", road:"30m", floor:"30t/m²", note:"Gần cổng phụ B" },
  { id:"C1", coords:[[106.9476,10.9768],[106.9492,10.9768],[106.9492,10.9755],[106.9476,10.9755],[106.9476,10.9768]], area:15000, price:75, status:"available",   zone:"C", power:"4×2000 kVA",  water:"1200 m³/ngày",road:"40m", floor:"50t/m²", note:"Siêu lô – chip, data center" },
  { id:"C2", coords:[[106.9493,10.9768],[106.9506,10.9768],[106.9506,10.9755],[106.9493,10.9755],[106.9493,10.9768]], area:11500, price:75, status:"leased",      zone:"C", power:"3000 kVA",    water:"900 m³/ngày", road:"40m", floor:"45t/m²", note:"Cho thuê: Samsung SDI" },
  { id:"C3", coords:[[106.9507,10.9768],[106.9518,10.9768],[106.9518,10.9755],[106.9507,10.9755],[106.9507,10.9768]], area:8800,  price:75, status:"available",   zone:"C", power:"2500 kVA",    water:"700 m³/ngày", road:"40m", floor:"40t/m²", note:"Gần hệ thống xử lý nước thải" },
  { id:"C4", coords:[[106.9519,10.9768],[106.9528,10.9768],[106.9528,10.9755],[106.9519,10.9755],[106.9519,10.9768]], area:7200,  price:75, status:"negotiating", zone:"C", power:"2000 kVA",    water:"500 m³/ngày", road:"40m", floor:"35t/m²", note:"Đàm phán với Foxconn" },
];

export const INFRA = [
  { lon:106.9465, lat:10.9776, icon:"🚧", label:"Cổng chính" },
  { lon:106.9535, lat:10.9776, icon:"🚧", label:"Cổng phụ B" },
  { lon:106.9510, lat:10.9748, icon:"⚡", label:"Trạm 110kV" },
  { lon:106.9528, lat:10.9748, icon:"💧", label:"WWTP" },
  { lon:106.9490, lat:10.9748, icon:"🚒", label:"PCCC" },
  { lon:106.9510, lat:10.9802, icon:"🏢", label:"Ban QL" },
];

export const STATUS_CFG = {
  available:   { fill:"#22c55e", fillAlpha:0.35, line:"#22c55e", badge:"#052e16", badgeT:"#22c55e", label:"Còn trống" },
  negotiating: { fill:"#f59e0b", fillAlpha:0.35, line:"#f59e0b", badge:"#1c1400", badgeT:"#f59e0b", label:"Đàm phán" },
  leased:      { fill:"#475569", fillAlpha:0.25, line:"#64748b", badge:"#0f172a", badgeT:"#64748b", label:"Đã thuê" },
};

export const STATS = {
  total: PLOTS.length,
  available: PLOTS.filter(p=>p.status==="available").length,
  negotiating: PLOTS.filter(p=>p.status==="negotiating").length,
  leased: PLOTS.filter(p=>p.status==="leased").length,
  availableHa: (PLOTS.filter(p=>p.status==="available").reduce((s,p)=>s+p.area,0)/10000).toFixed(1),
};

export const KCN_SYSTEM_PROMPT = `Bạn là Sales AI Assistant của KCN Long Thành – Đồng Nai, thuộc nền tảng PROtech & PROBIM.

THÔNG TIN KCN:
- Vị trí: Long Thành, Đồng Nai. Tọa độ: 10.976°N, 106.952°E
- Diện tích: ~200 ha. Hạ tầng: Trạm 110kV (120 MVA), WWTP 8.000m³/ngày, PCCC
- Cảng Cái Mép: 35km (~30 phút). Sân bay Long Thành: 8km (~10 phút). Cao tốc HCM–Long Thành: 2km

LÔ ĐẤT HIỆN TẠI:
- Lô A1 Zone A: 8.500m², 95USD/m², Còn trống, Điện:2×2000kVA, Nước:500m³/ngày, Lô góc 2 mặt tiền
- Lô A2 Zone A: 6.200m², 95USD/m², Đàm phán (Hàn Quốc), Điện:1500kVA
- Lô A3 Zone A: 7.800m², 95USD/m², Còn trống, Gần PCCC
- Lô A4 Zone A: 5.500m², 95USD/m², Đã thuê (Daewon – Hàn Quốc)
- Lô B1 Zone B: 12.000m², 85USD/m², Còn trống, Điện:3×2000kVA – phù hợp nhà máy nặng/logistics
- Lô B2 Zone B: 9.800m², 85USD/m², Đã thuê (Lego Vietnam)
- Lô B3 Zone B: 8.200m², 85USD/m², Đàm phán (Nhật Bản)
- Lô B4 Zone B: 6.500m², 85USD/m², Còn trống, Gần cổng phụ B
- Lô C1 Zone C: 15.000m², 75USD/m², Còn trống, Điện:4×2000kVA – SIÊU LÔ phù hợp chip/data center
- Lô C2 Zone C: 11.500m², 75USD/m², Đã thuê (Samsung SDI)
- Lô C3 Zone C: 8.800m², 75USD/m², Còn trống, Gần WWTP
- Lô C4 Zone C: 7.200m², 75USD/m², Đàm phán (Foxconn)

GIÁ THUÊ: Zone A: 95 USD/m²/kỳ | Zone B: 85 USD/m²/kỳ | Zone C: 75 USD/m²/kỳ
FDI: Samsung SDI, Lego Vietnam, Daewon đã vào. Foxconn & Nhật đang đàm phán.
THỦ TỤC FDI: 15 ngày làm việc

Trả lời ngắn gọn, thực tế, bằng tiếng Việt. Cung cấp đủ thông số kỹ thuật khi được hỏi.`;

export const TOUR_STOPS = [
  { center:[106.952,10.976],  zoom:15,   pitch:55, bearing:-10, label:"🏭 Toàn khu KCN Long Thành" },
  { center:[106.9465,10.9776],zoom:17,   pitch:45, bearing:30,  label:"🚧 Cổng chính" },
  { center:[106.9503,10.9791],zoom:16.5, pitch:55, bearing:10,  label:"📍 Zone A – Đường trục 25m" },
  { center:[106.9503,10.9777],zoom:16.5, pitch:55, bearing:10,  label:"📍 Zone B – Đường trục 30m" },
  { center:[106.9503,10.9762],zoom:16.5, pitch:55, bearing:10,  label:"📍 Zone C – Siêu lô, đường 40m" },
  { center:[106.9510,10.9748],zoom:17,   pitch:50, bearing:20,  label:"⚡ Trạm 110kV & Xử lý nước thải" },
  { center:[106.9535,10.9776],zoom:17,   pitch:45, bearing:-30, label:"🚧 Cổng phụ B" },
  { center:[106.952,10.9776], zoom:15.5, pitch:60, bearing:0,   label:"🌐 Toàn cảnh KCN" },
];
