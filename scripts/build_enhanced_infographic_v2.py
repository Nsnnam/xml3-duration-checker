import json
import shutil
import os

with open(r'C:\Users\Admin\Projects\xml3-duration-checker\scripts\kt_full_summary_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

depts = data['depts']
top_beds = data['topBeds']
lt4h_samples = data['lt4hSamples']
sharing_samples = data['sharingSamples']
kt252_services = data['kt252Services']
kt252_staff = data['kt252Staff']

# Combined interactive dataset for client-side filtering (lt4h + sharing samples + kt252 sample)
interactive_items = []

for item in lt4h_samples:
    interactive_items.append({
        'sheet': 'KT251',
        'kyQt': item['kyQt'],
        'maLk': item['maLk'],
        'maBn': item['maBn'],
        'hoTen': item['hoTen'],
        'maKhoa': item['maKhoa'],
        'tenKhoa': item['tenKhoa'],
        'maGiuong': item['maGiuong'],
        'ngayTk': item['ngayTk'],
        'tuGio': item['tuGio'],
        'denGio': item['denGio'],
        'loai': 'Trùng < 4h (BHXH sai)',
        'loaiKey': 'lt4h',
        'soTrung': item['soTrung'],
        'tienKt': item['tienKiemTra'],
        'tienXt': item['tienXuatToan'],
        'ttTrung': f"Giao thoa {item['gioTrungMin']:.2f}h - {item['gioTrungMax']:.2f}h | {item['thongTinTrung']}"
    })

for item in sharing_samples:
    st = item.get('soTrung', 0)
    loai_str = item.get('loai', 'Nằm ghép')
    loai_key = 'sharing2' if st == 1 else ('sharing3' if st == 2 else ('sharing4' if st >= 3 else 'sharing'))
    if 'Trùng < 4h' in loai_str:
        loai_key = 'lt4h'
    interactive_items.append({
        'sheet': 'KT251',
        'kyQt': item.get('kyQt', ''),
        'maLk': item.get('maLk', ''),
        'maBn': item.get('maBn', ''),
        'hoTen': item.get('hoTen', ''),
        'maKhoa': item.get('maKhoa', ''),
        'tenKhoa': item.get('tenKhoa', ''),
        'maGiuong': item.get('maGiuong', ''),
        'ngayTk': item.get('ngayTk', ''),
        'tuGio': item.get('tuGio', ''),
        'denGio': item.get('denGio', ''),
        'loai': loai_str,
        'loaiKey': loai_key,
        'soTrung': st,
        'tienKt': item.get('tienKt', 0),
        'tienXt': item.get('tienXt', 0),
        'ttTrung': item.get('ttTrung', '')
    })

json_interactive = json.dumps(interactive_items, ensure_ascii=False)
json_depts = json.dumps(depts, ensure_ascii=False)
json_top_beds = json.dumps(top_beds, ensure_ascii=False)

# Dept options for dropdown
dept_options_html = '<option value="">-- Tất cả chuyên khoa (' + str(len(depts)) + ' khoa) --</option>'
for d in depts:
    dept_options_html += f'<option value="{d["maKhoa"]}">{d["maKhoa"]} - {d["tenKhoa"]} ({d["total"]:,} dòng)</option>'

# Department table rows HTML
dept_table_rows = "".join([f'''
  <tr onclick="filterByDeptTable('{d["maKhoa"]}')" style="cursor: pointer;">
    <td class="text-center font-mono">{idx + 1}</td>
    <td class="font-bold text-teal">{d["maKhoa"]}</td>
    <td><strong>{d["tenKhoa"]}</strong></td>
    <td class="text-center font-mono">{d["total"]:,}</td>
    <td class="text-center font-mono">{d["pts"]:,}</td>
    <td class="text-center font-mono">{d["beds"]:,}</td>
    <td class="text-center font-mono text-rose font-bold">{d["sharing"]:,}</td>
    <td class="text-center font-mono text-amber font-bold">{d["vuotKh"]:,}</td>
    <td class="text-center font-mono text-emerald font-bold">{d["lt4h"]:,}</td>
    <td class="text-right font-mono font-bold text-indigo">{d["kt"]:,.0f} đ</td>
    <td class="text-right font-mono font-bold text-rose">{d["xt"]:,.0f} đ</td>
    <td class="text-center"><button class="view-btn" onclick="event.stopPropagation(); filterByDeptTable('{d["maKhoa"]}')">🔍 Lọc xem</button></td>
  </tr>
''' for idx, d in enumerate(depts)])

# Top beds table rows HTML
bed_table_rows = "".join([f'''
  <tr onclick="filterByBedTable('{b["maKhoa"]}', '{b["maGiuong"]}')" style="cursor: pointer;">
    <td class="text-center font-mono">{idx + 1}</td>
    <td class="font-bold text-teal">{b["maKhoa"]}</td>
    <td>{b["tenKhoa"]}</td>
    <td class="font-mono font-bold text-rose">{b["maGiuong"]}</td>
    <td class="text-center font-mono font-bold">{b["total"]:,}</td>
    <td class="text-center font-mono font-bold text-rose">{b["sharing"]:,}</td>
    <td class="text-center font-mono">{b["pts"]:,}</td>
    <td class="text-right font-mono font-bold">{b["kt"]:,.0f} đ</td>
    <td class="text-right font-mono font-bold text-rose">{b["xt"]:,.0f} đ</td>
    <td class="text-center"><button class="view-btn" onclick="event.stopPropagation(); filterByBedTable('{b["maKhoa"]}', '{b["maGiuong"]}')">🔍 Xem ca</button></td>
  </tr>
''' for idx, b in enumerate(top_beds[:35])])

# KT252 services rows HTML
kt252_srv_rows = "".join([f'''
  <tr>
    <td class="text-center font-mono">{idx + 1}</td>
    <td class="font-mono font-bold text-teal">{s["maCp"]}</td>
    <td><strong>{s["tenCp"]}</strong></td>
    <td class="text-center font-mono font-bold">{s["count"]:,}</td>
    <td class="text-right font-mono font-bold text-rose">{s["kt"]:,.0f} đ</td>
    <td class="text-right font-mono font-bold">{s["xt"]:,.0f} đ</td>
    <td>Điều dưỡng có chứng chỉ ĐTLT + Quyết định phân công Giám đốc BV</td>
  </tr>
''' for idx, s in enumerate(kt252_services)])

html = f'''<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Báo Cáo Phân Tích &amp; Lọc Tách Chi Tiết KT251 &amp; KT252 · Bệnh viện hữu nghị Lạc Việt</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    :root {{
      --navy: #0f172a;
      --teal: #0d9488;
      --rose: #e11d48;
      --amber: #d97706;
      --indigo: #4f46e5;
      --emerald: #059669;
      --border: #e2e8f0;
      --bg: #f8fafc;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background: #f1f5f9;
      color: #1e293b;
      line-height: 1.5;
      padding: 20px;
    }}
    .container {{ max-width: 1440px; margin: 0 auto; }}

    /* Header */
    .header {{
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f766e 100%);
      color: white;
      padding: 30px 36px;
      border-radius: 20px;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.2);
      margin-bottom: 20px;
      position: relative;
    }}
    .badge {{
      display: inline-block;
      background: rgba(13, 148, 136, 0.3);
      color: #2dd4bf;
      border: 1px solid rgba(45, 212, 191, 0.4);
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 10px;
    }}
    .title {{ font-size: 25px; font-weight: 800; line-height: 1.25; margin-bottom: 8px; }}
    .subtitle {{ font-size: 13px; color: #94a3b8; max-width: 950px; margin-bottom: 16px; }}
    .header-actions {{
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px solid rgba(255,255,255,0.1);
    }}
    .btn-download-excel {{
      background: #059669;
      color: white;
      text-decoration: none;
      padding: 9px 18px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 13px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
      transition: background 0.2s, transform 0.1s;
      border: none;
      cursor: pointer;
    }}
    .btn-download-excel:hover {{ background: #047857; transform: translateY(-1px); }}

    /* KPI Cards */
    .kpi-grid {{
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 20px;
    }}
    .kpi-card {{
      background: white;
      border-radius: 16px;
      padding: 18px 20px;
      border: 1px solid var(--border);
      box-shadow: 0 2px 4px rgba(0,0,0,0.03);
    }}
    .kpi-label {{ font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }}
    .kpi-value {{ font-size: 23px; font-weight: 800; font-family: 'JetBrains Mono', monospace; }}
    .kpi-sub {{ font-size: 11.5px; color: #64748b; margin-top: 4px; }}
    .rose {{ color: var(--rose); }}
    .teal {{ color: var(--teal); }}
    .amber {{ color: var(--amber); }}
    .indigo {{ color: var(--indigo); }}
    .emerald {{ color: var(--emerald); }}

    /* Tabs */
    .tabs-nav {{
      display: flex;
      gap: 8px;
      background: #e2e8f0;
      padding: 6px;
      border-radius: 14px;
      margin-bottom: 20px;
      overflow-x: auto;
    }}
    .tab-btn {{
      flex: 1;
      padding: 10px 14px;
      border: none;
      background: transparent;
      font-family: inherit;
      font-size: 12.5px;
      font-weight: 700;
      color: #475569;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }}
    .tab-btn.active {{
      background: white;
      color: var(--navy);
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    }}
    .tab-pane {{ display: none; }}
    .tab-pane.active {{ display: block; }}

    /* Card Box */
    .card {{
      background: white;
      border-radius: 16px;
      border: 1px solid var(--border);
      padding: 24px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }}
    .card-title {{
      font-size: 16px;
      font-weight: 800;
      color: var(--navy);
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
    }}

    /* Filter Bar inside Card */
    .filter-bar {{
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      background: #f8fafc;
      padding: 14px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      margin-bottom: 16px;
      align-items: center;
    }}
    .filter-item {{ display: flex; flex-direction: column; gap: 4px; min-width: 180px; flex: 1; }}
    .filter-label {{ font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; }}
    .select-box, .input-box {{
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 12.5px;
      font-family: inherit;
      background: white;
      color: #1e293b;
      outline: none;
    }}
    .select-box:focus, .input-box:focus {{ border-color: var(--teal); box-shadow: 0 0 0 2px rgba(13,148,136,0.15); }}
    .btn-reset {{
      padding: 8px 14px;
      border: 1px solid #cbd5e1;
      background: white;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
      cursor: pointer;
      align-self: flex-end;
    }}
    .btn-reset:hover {{ background: #f1f5f9; color: var(--navy); }}
    .btn-export-current {{
      padding: 8px 16px;
      border: none;
      background: var(--teal);
      color: white;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      align-self: flex-end;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }}
    .btn-export-current:hover {{ background: #0f766e; }}

    /* Tables */
    .table-container {{ overflow-x: auto; margin-top: 10px; max-height: 520px; }}
    table {{ width: 100%; border-collapse: collapse; font-size: 12px; }}
    th {{
      background: #0f172a;
      color: white;
      padding: 10px 12px;
      text-align: left;
      font-weight: 700;
      position: sticky;
      top: 0;
      z-index: 10;
    }}
    td {{ padding: 8px 12px; border-bottom: 1px solid var(--border); }}
    tr:nth-child(even) td {{ background: #f8fafc; }}
    tr:hover td {{ background: #f1f5f9; }}
    .text-right {{ text-align: right; }}
    .text-center {{ text-align: center; }}
    .font-mono {{ font-family: 'JetBrains Mono', monospace; }}

    .badge-tag {{
      display: inline-block;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
    }}
    .tag-lt4h {{ background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }}
    .tag-sharing {{ background: #ffe4e6; color: #9f1239; border: 1px solid #fecdd3; }}
    .tag-vuotkh {{ background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }}
    .tag-kt252 {{ background: #ede9fe; color: #5b21b6; border: 1px solid #ddd6fe; }}

    .view-btn {{
      padding: 3px 8px;
      background: white;
      border: 1px solid var(--teal);
      color: var(--teal);
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }}
    .view-btn:hover {{ background: var(--teal); color: white; }}

    /* 3-Col Matrix */
    .compare-grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }}
    .compare-col {{ border-radius: 14px; padding: 18px; border: 1px solid transparent; }}
    .col-bhxh-wrong {{ background: #eff6ff; border-color: #bfdbfe; }}
    .col-bhxh-wrong .col-head {{ color: #1d4ed8; }}
    .col-wrong {{ background: #fff1f2; border-color: #fecdd3; }}
    .col-wrong .col-head {{ color: #be123c; }}
    .col-dispute {{ background: #fefce8; border-color: #fef08a; }}
    .col-dispute .col-head {{ color: #a16207; }}
    .col-head {{ font-size: 13.5px; font-weight: 800; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; border-bottom: 2px solid currentColor; padding-bottom: 8px; }}
    .item-card {{ background: white; border-radius: 10px; padding: 12px 14px; margin-bottom: 10px; border: 1px solid rgba(0,0,0,0.06); }}
    .item-title {{ font-size: 12.5px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }}
    .item-desc {{ font-size: 11.5px; color: #475569; margin-bottom: 6px; }}
    .item-law {{ font-size: 10.5px; background: #f1f5f9; color: #334155; padding: 3px 6px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; }}

    /* Template Box */
    .template-box {{ background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 18px; margin-bottom: 16px; }}
    .template-header {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }}
    .template-title {{ font-size: 14px; font-weight: 800; color: #0f172a; }}
    .copy-btn {{ background: var(--teal); color: white; border: none; padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; }}
    .copy-btn:hover {{ background: #0f766e; }}
    .template-text {{ font-family: inherit; white-space: pre-wrap; font-size: 11.5px; color: #334155; line-height: 1.6; max-height: 350px; overflow-y: auto; background: white; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; }}

    @media print {{
      body {{ background: white; padding: 0; }}
      .tabs-nav, .filter-bar, .btn-download-excel, .header-actions {{ display: none !important; }}
      .tab-pane {{ display: block !important; margin-bottom: 25px; page-break-after: always; }}
    }}
    @media (max-width: 900px) {{
      .kpi-grid, .compare-grid {{ grid-template-columns: 1fr; }}
      .filter-item {{ min-width: 100%; }}
    }}
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="badge">BẢO HIỂM Y TẾ · ĐỐI SOÁT CHUYÊN ĐỀ ĐỢT 09 THÁNG NĂM 2026</div>
      <h1 class="title">BÁO CÁO PHÂN TÍCH, LỌC TÁCH &amp; ĐỐI SOÁT CHI TIẾT KT251 &amp; KT252</h1>
      <p class="subtitle">
        Bám sát chính xác dữ liệu gốc từ file <strong>26193_KET_QUA_KT251_KT252.xlsx</strong> (`144.385 dòng`) · Thống kê đa tầng theo Khoa / Ngày / Mã giường / Loại đối chiếu · Cung cấp file Excel đối soát 6 sheet hoàn chỉnh và 4 bộ mẫu công văn giải trình.
      </p>
      <div class="header-actions">
        <span style="font-size: 12px; color: #cbd5e1;">🏥 Đơn vị: <strong>Bệnh viện hữu nghị Lạc Việt</strong> (Mã: 26193)</span>
        <span style="font-size: 12px; color: #cbd5e1;">👤 Thực hiện: <strong>Nguyễn Sơn Nam (Nsnnam)</strong></span>
        <button class="btn-download-excel" onclick="downloadMasterExcel()">
          📥 Tải File Excel Đối Soát Toàn Bộ 6 Sheet (.xlsx)
        </button>
        <button class="btn-download-excel" style="background: var(--navy); border: 1px solid #475569;" onclick="window.print()">
          🖨️ In Báo Cáo A4
        </button>
      </div>
    </div>

    <!-- 4 KPI Box -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Tổng Tiền Kiểm Tra KT251</div>
        <div class="kpi-value indigo">3,473 TỶ đ</div>
        <div class="kpi-sub">33.758 dòng bị gắn cờ nằm ghép (142.223 dòng toàn viện)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Tiền Đề Nghị Xuất Toán KT251</div>
        <div class="kpi-value rose">1,568 TỶ đ</div>
        <div class="kpi-sub">14.571 dòng (1,555 tỷ) là lỗi vượt giường kế hoạch trong ngày</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Tiền Kiểm Tra KT252 (DVKT Dấu *)</div>
        <div class="kpi-value amber">143,68 TR đ</div>
        <div class="kpi-sub">2.162 lượt do 2 điều dưỡng làm xoa bóp bấm huyệt tại K1631</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Kẽ Hở Phản Biện Cầm Chắc Thắng</div>
        <div class="kpi-value emerald">451 CA TRÙNG &lt; 4H</div>
        <div class="kpi-sub">BHXH quét sai văn bản nghiệp vụ 20261110_TAILIEUHUONGDAN!</div>
      </div>
    </div>

    <!-- 5 Tabs Nav -->
    <div class="tabs-nav">
      <button class="tab-btn active" onclick="switchTab('tab-compare')">
        <span>⚖️</span> 1. Ma Trận ĐÚNG / SAI / CẦN PHẢN BIỆN
      </button>
      <button class="tab-btn" onclick="switchTab('tab-stats')">
        <span>📊</span> 2. Thống Kê Khoa &amp; Điểm Nóng Mã Giường
      </button>
      <button class="tab-btn" onclick="switchTab('tab-viewer')">
        <span>🔍</span> 3. Bảng Tra Cứu &amp; Lọc Tách Chi Tiết
      </button>
      <button class="tab-btn" onclick="switchTab('tab-lt4h')">
        <span>🎯</span> 4. Danh Mục 451 Ca Trùng &lt; 4H (Phụ Lục 01)
      </button>
      <button class="tab-btn" onclick="switchTab('tab-templates')">
        <span>📝</span> 5. Bộ 4 Mẫu Công Văn Giải Trình (Có Nút Copy)
      </button>
    </div>

    <!-- TAB 1: MA TRẬN ĐỐI CHIẾU -->
    <div id="tab-compare" class="tab-pane active">
      <div class="card">
        <div class="card-title">
          <span>MA TRẬN ĐỐI CHIẾU PHÁP LÝ: CÁI GÌ ĐÚNG - CÁI GÌ SAI - CÁI GÌ CẦN PHẢN BIỆN</span>
        </div>
        <div class="compare-grid">
          <!-- Cột BHXH SAI -->
          <div class="compare-col col-bhxh-wrong">
            <div class="col-head">
              <span>🚨</span> CƠ QUAN BHXH QUÉT SAI QUY ĐỊNH (Cầm Chắc Thắng 100%)
            </div>
            <div class="item-card">
              <div class="item-title">1. Quét trùng giường &lt; 4 giờ (451 ca)</div>
              <div class="item-desc">Hệ thống BHXH tự động đánh dấu trùng ghép cả những ca giao thoa 30p - 2h khi BN cũ chuẩn bị ra viện và BN mới tiếp nhận buồng.</div>
              <div class="item-law">Căn cứ: Văn bản số 20261110_TAILIEUHUONGDAN quy định SO_GIO_GIAO &gt; 4 giờ mới tính nằm ghép!</div>
            </div>
            <div class="item-card">
              <div class="item-title">2. Xuất toán kép cả 2 hồ sơ nằm trùng</div>
              <div class="item-desc">Cổng gắn cờ phạt trừ cả BN vào trước lẫn BN vào sau là sai nguyên tắc bồi hoàn dịch vụ y tế thực tế đã phục vụ.</div>
              <div class="item-law">Căn cứ: Nguyên tắc bảo lưu 01 giường hợp lệ đơn giá cao nhất (0đ xuất toán).</div>
            </div>
            <div class="item-card">
              <div class="item-title">3. Bắt lỗi mốc phút 12:00 cùng BN (428 lượt)</div>
              <div class="item-desc">BN chỉ nằm 1 giường liên tục, việc ngày cũ kết thúc 12:00 và ngày mới bắt đầu 12:00 là do phần mềm HIS ngắt ca trực.</div>
              <div class="item-law">Căn cứ: Trích lục Bệnh án gốc &amp; Phiếu theo dõi chăm sóc điều dưỡng.</div>
            </div>
            <div class="item-card">
              <div class="item-title">4. Bắt lỗi DVKT dấu * kỳ T7-T9/2026 (637 lượt)</div>
              <div class="item-desc">BHXH chưa đối chiếu Quyết định giao nhiệm vụ của Giám đốc bệnh viện mà đã tự động gắn cờ xuất toán KT252.</div>
              <div class="item-law">Căn cứ: Điều 135 Nghị định 96/2023/NĐ-CP &amp; Thông tư 32/2023/TT-BYT.</div>
            </div>
          </div>

          <!-- Cột CƠ SỞ SAI THẬT -->
          <div class="compare-col col-wrong">
            <div class="col-head">
              <span>❌</span> CƠ SỞ SAI THẬT (Chấp Nhận &amp; Chấn Chỉnh Nội Bộ)
            </div>
            <div class="item-card">
              <div class="item-title">1. Giường gối đầu liên tiếp ≥ 2 ngày (1.027 dòng)</div>
              <div class="item-desc">Điều dưỡng chọn mã giường của người cũ gán cho người mới đan xen nhiều ngày. Không thể chối cãi khi tra cứu bệnh án.</div>
              <div class="item-law">Khắc phục: Bắt buộc trả giường trên HIS trước khi nhận người mới; trừ điểm thi đua.</div>
            </div>
            <div class="item-card">
              <div class="item-title">2. Ghép thật &gt; 4h nhưng kê 100% (156 ca)</div>
              <div class="item-desc">Khoa quá tải nằm ghép thực tế 2 người nhưng không tích hệ số 50% theo quy định Thông tư 39/2024.</div>
              <div class="item-law">Khắc phục: Tích chọn tỷ lệ 50% (ghép 2) hoặc 33% (ghép 3+) ngay khi chỉ định.</div>
            </div>
            <div class="item-card">
              <div class="item-title">3. Giường ngoại khoa không phẫu thuật (77 dòng)</div>
              <div class="item-desc">Kê giường ngoại khoa cho bệnh nhân nhưng sau đó điều trị nội khoa hoặc chuyển viện, không mổ.</div>
              <div class="item-law">Khắc phục: Rà soát đổi về mã giường nội khoa trước khi chốt hồ sơ.</div>
            </div>
            <div class="item-card">
              <div class="item-title">4. Điều dưỡng thiếu chứng chỉ T1-T6/2026 (KT252)</div>
              <div class="item-desc">Giai đoạn trước 01/7/2026, điều dưỡng trung học làm kỹ thuật dấu * nhưng chưa hoàn tất khóa đào tạo liên tục.</div>
              <div class="item-law">Khắc phục: Bổ sung gấp chứng chỉ đào tạo bồi dưỡng chuyên môn phục hồi chức năng.</div>
            </div>
          </div>

          <!-- Cột TRANH CHẤP CẦN PHẢN BIỆN -->
          <div class="compare-col col-dispute">
            <div class="col-head">
              <span>⚖️</span> TRANH CHẤP NGHIỆP VỤ (Có Thể Bảo Vệ Cứu Tiền)
            </div>
            <div class="item-card">
              <div class="item-title">1. Vượt giường kế hoạch (1,555 TỶ ĐỒNG!)</div>
              <div class="item-desc">14.571 dòng bị xuất toán do quá tải tại K33, K19.2, K02, K33.2. Đây là tiền ngày giường thực tế phục vụ bệnh nhân cấp cứu, ung thư.</div>
              <div class="item-law">Căn cứ: Điều 35 Luật KCB 2023 cấm từ chối cấp cứu; Báo cáo quá tải dịch bệnh gửi Sở Y tế.</div>
            </div>
            <div class="item-card">
              <div class="item-title">2. Kê giường vượt giờ ra viện (Chỉ cảnh báo)</div>
              <div class="item-desc">Giờ kết thúc kê giường muộn hơn giờ ra viện 15-30p do in ấn viện phí. Không trùng người khác thì không thất thoát quỹ.</div>
              <div class="item-law">Đề nghị: Chỉ nhắc nhở thủ tục hành chính, không xuất toán tiền.</div>
            </div>
            <div class="item-card">
              <div class="item-title">3. Chồng lấn giờ chuyển khoa điều trị</div>
              <div class="item-desc">Khoa HSCC (K02) chuyển bệnh nhân sang Khoa Nội/Ngoại có thời gian bàn giao giao thoa giữa 2 điều dưỡng.</div>
              <div class="item-law">Giải trình: Biên bản bàn giao người bệnh chuyển khoa tại buồng đệm.</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: THỐNG KÊ KHOA & MÃ GIƯỜNG -->
    <div id="tab-stats" class="tab-pane">
      <!-- Bảng 1: Theo Khoa -->
      <div class="card">
        <div class="card-title">
          <span>BẢNG THỐNG KÊ CHI TIẾT THEO CHUYÊN KHOA LÂM SÀNG (SHEET KT251)</span>
          <span style="font-size: 12px; color: #64748b; font-weight: normal;">(Bấm vào dòng để chuyển sang tab lọc chi tiết của khoa đó)</span>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th class="text-center">STT</th>
                <th>Mã Khoa</th>
                <th>Tên Khoa Lâm Sàng</th>
                <th class="text-center">Tổng Dòng</th>
                <th class="text-center">Số BN</th>
                <th class="text-center">Số Mã Giường</th>
                <th class="text-center">Nằm Ghép (MARK=1)</th>
                <th class="text-center">Vượt Giường KH</th>
                <th class="text-center">Trùng &lt; 4H</th>
                <th class="text-right">Tiền Kiểm Tra BHYT (đ)</th>
                <th class="text-right">Tiền Xuất Toán (đ)</th>
                <th class="text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {dept_table_rows}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Bảng 2: Top Mã Giường Điểm Nóng -->
      <div class="card">
        <div class="card-title">
          <span>TOP 35 MÃ GIƯỜNG BỊ CẢNH BÁO NẰM GHÉP NHIỀU NHẤT TOÀN VIỆN</span>
          <span style="font-size: 12px; color: #64748b; font-weight: normal;">(Bấm nút "Xem ca" để lọc toàn bộ hồ sơ nằm trùng trên mã giường này)</span>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th class="text-center">STT</th>
                <th>Mã Khoa</th>
                <th>Tên Khoa</th>
                <th>Mã Giường</th>
                <th class="text-center">Tổng Dòng</th>
                <th class="text-center">Dòng Nằm Ghép</th>
                <th class="text-center">Số BN Liên Đới</th>
                <th class="text-right">Tiền Kiểm Tra BHYT (đ)</th>
                <th class="text-right">Tiền Đề Nghị Xuất Toán (đ)</th>
                <th class="text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {bed_table_rows}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 3: BẢNG TRA CỨU & LỌC TÁCH CHI TIẾT -->
    <div id="tab-viewer" class="tab-pane">
      <div class="card">
        <div class="card-title">
          <span>TRA CỨU &amp; LỌC TÁCH DỮ LIỆU CHI TIẾT THEO YÊU CẦU</span>
          <div style="display: flex; gap: 8px;">
            <button class="btn-export-current" onclick="exportFilteredDataToExcel()">
              📥 Xuất Dữ Liệu Đang Lọc Ra Excel (.xls)
            </button>
          </div>
        </div>

        <!-- Bộ Lọc Đa Tầng -->
        <div class="filter-bar">
          <div class="filter-item">
            <span class="filter-label">Chuyên Khoa</span>
            <select id="viewerDeptSelect" class="select-box" onchange="applyViewerFilters()">
              {dept_options_html}
            </select>
          </div>

          <div class="filter-item">
            <span class="filter-label">Loại Đối Chiếu</span>
            <select id="viewerTypeSelect" class="select-box" onchange="applyViewerFilters()">
              <option value="">-- Tất cả loại đối chiếu --</option>
              <option value="lt4h">🚨 Trùng thời gian &lt; 4h (BHXH quét sai)</option>
              <option value="sharing2">⚠️ Nằm ghép 2 người (SO_HS_TRUNG = 1)</option>
              <option value="sharing3">⚠️ Nằm ghép 3 người (SO_HS_TRUNG = 2)</option>
              <option value="sharing4">⚠️ Nằm ghép từ 4 người trở lên (SO_HS_TRUNG &gt;= 3)</option>
            </select>
          </div>

          <div class="filter-item">
            <span class="filter-label">Mã Giường</span>
            <input type="text" id="viewerBedInput" class="input-box" placeholder="Ví dụ: H006, H010..." oninput="applyViewerFilters()">
          </div>

          <div class="filter-item" style="flex: 1.5;">
            <span class="filter-label">Tìm Kiếm Nhanh</span>
            <input type="text" id="viewerSearchInput" class="input-box" placeholder="Tìm theo Tên bệnh nhân, Mã LK, Mã BN..." oninput="applyViewerFilters()">
          </div>

          <button class="btn-reset" onclick="resetViewerFilters()">✕ Đặt Lại</button>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 12px; color: #64748b;">
          <div>Hiển thị: <strong id="viewerCount" class="text-teal font-mono">0</strong> ca phù hợp theo bộ lọc</div>
          <div><i>(Hỗ trợ tìm kiếm không dấu, lọc kết hợp nhiều điều kiện)</i></div>
        </div>

        <!-- Bảng Dữ Liệu Chi Tiết -->
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th class="text-center">STT</th>
                <th>Kỳ QT</th>
                <th>Mã LK</th>
                <th>Mã BN</th>
                <th>Họ Và Tên</th>
                <th>Khoa</th>
                <th>Mã Giường</th>
                <th>Ngày TK</th>
                <th>Giờ Từ - Đến</th>
                <th>Phân Loại Đối Chiếu</th>
                <th class="text-center">Số HS Trùng</th>
                <th class="text-right">Tiền Kiểm Tra (đ)</th>
                <th class="text-right">Tiền Xuất Toán (đ)</th>
                <th>Thông Tin Trùng Cổng BHXH</th>
              </tr>
            </thead>
            <tbody id="viewerTableBody">
              <!-- Render by JavaScript -->
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 4: DANH MỤC 451 CA TRÙNG < 4H -->
    <div id="tab-lt4h" class="tab-pane">
      <div class="card">
        <div class="card-title">
          <span>DANH MỤC 451 CA TRÙNG THỜI GIAN DƯỚI 4 GIỜ (PHỤ LỤC 01 GIẢI TRÌNH YÊU CẦU BHXH HỦY XUẤT TOÁN)</span>
          <button class="btn-export-current" onclick="exportLt4hToExcel()">
            📥 Xuất Riêng 451 Ca Này Ra Excel (.xls)
          </button>
        </div>
        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 12px 16px; margin-bottom: 14px; font-size: 12.5px; color: #065f46;">
          <strong>⚖️ CĂN CỨ PHÁP LÝ BẢO VỆ QUYỀN LỢI CỦA BỆNH VIỆN:</strong><br>
          Căn cứ Mục I Khoản 1 Bước 2 Tài liệu hướng dẫn nghiệp vụ số <code>20261110_TAILIEUHUONGDAN</code> của Trung tâm Kiểm soát thanh toán BHXH, BHYT điện tử quy định: <i>"Đánh dấu các trường hợp có thời gian nằm viện trùng trên 4 giờ giữa các bệnh nhân theo mã giường, ngày và khoa điều trị (SO_GIO_GIAO &gt; 4)"</i>.<br>
          Toàn bộ danh sách dưới đây có thời gian nằm trùng <strong>dưới 4 giờ</strong> nhưng vẫn bị cổng BHXH gắn cờ xuất toán sai quy định nghiệp vụ!
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th class="text-center">STT</th>
                <th>Kỳ QT</th>
                <th>Mã LK</th>
                <th>Mã BN</th>
                <th>Họ Và Tên</th>
                <th>Khoa</th>
                <th>Mã Giường</th>
                <th>Ngày TK</th>
                <th>Giờ Từ - Đến</th>
                <th class="text-center">Số HS Trùng</th>
                <th class="text-center">Giờ Trùng Min</th>
                <th class="text-center">Giờ Trùng Max</th>
                <th class="text-right">Tiền Kiểm Tra (đ)</th>
                <th class="text-right">Tiền Xuất Toán (đ)</th>
                <th>Chuỗi Thông Tin Trùng</th>
              </tr>
            </thead>
            <tbody>
              {''.join([f'''
                <tr>
                  <td class="text-center font-mono">{idx + 1}</td>
                  <td class="font-mono">{x["kyQt"]}</td>
                  <td class="font-mono font-bold text-teal">{x["maLk"]}</td>
                  <td class="font-mono">{x["maBn"]}</td>
                  <td><strong>{x["hoTen"]}</strong></td>
                  <td>{x["tenKhoa"]}</td>
                  <td class="font-mono font-bold text-rose">{x["maGiuong"]}</td>
                  <td class="font-mono">{x["ngayTk"]}</td>
                  <td class="font-mono">{x["tuGio"]} - {x["denGio"]}</td>
                  <td class="text-center font-mono font-bold">{x["soTrung"]}</td>
                  <td class="text-center font-mono font-bold text-emerald">{x["gioTrungMin"]:.2f}h</td>
                  <td class="text-center font-mono">{x["gioTrungMax"]:.2f}h</td>
                  <td class="text-right font-mono font-bold">{x["tienKiemTra"]:,.0f} đ</td>
                  <td class="text-right font-mono font-bold text-rose">{x["tienXuatToan"]:,.0f} đ</td>
                  <td class="font-mono" style="font-size: 11px; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="{x['thongTinTrung']}">{x["thongTinTrung"]}</td>
                </tr>
              ''' for idx, x in enumerate(lt4h_samples)])}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 5: MẪU VĂN BẢN GIẢI TRÌNH -->
    <div id="tab-templates" class="tab-pane">
      <div class="card">
        <div class="card-title">
          <span>BỘ 4 MẪU CÔNG VĂN &amp; BẢNG GIẢI TRÌNH CHUẨN MỰC GỬI BẢO HIỂM XÃ HỘI</span>
          <span style="font-size: 12px; font-weight: normal; color: #64748b;">(Bấm nút để sao chép nguyên văn bản vào Word)</span>
        </div>

        <!-- Mẫu 1 -->
        <div class="template-box">
          <div class="template-header">
            <div class="template-title">📄 MẪU 1: Công văn đề nghị hủy xuất toán 451 ca trùng &lt; 4 giờ (Cầm chắc thắng 100%)</div>
            <button class="copy-btn" onclick="copyTemplate('tpl-1', this)">📋 Sao chép mẫu này</button>
          </div>
          <div id="tpl-1" class="template-text">BỆNH VIỆN HỮU NGHỊ LẠC VIỆT              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
        Số: ....../BVLV-BHYT                          Độc lập - Tự do - Hạnh phúc
                                              -----------------------------------
                                                Vĩnh Phúc, ngày     tháng 11 năm 2026

V/v giải trình và đề nghị loại trừ các trường hợp
cảnh báo giường ghép có thời gian trùng dưới 4 giờ
theo chuyên đề KT251 09 tháng đầu năm 2026

          Kính gửi: Bảo hiểm xã hội tỉnh Vĩnh Phúc

Căn cứ Thông tư số 39/2024/TT-BYT ngày 15/11/2024 của Bộ Y tế sửa đổi, bổ sung một số điều của Thông tư số 35/2016/TT-BYT;
Căn cứ Tài liệu hướng dẫn nghiệp vụ rà soát giường bệnh nằm ghép (Kèm theo Công văn số .../TTKS-NV ngày 10/11/2026 của Trung tâm Kiểm soát thanh toán BHXH, BHYT điện tử - BHXH Việt Nam);
Căn cứ kết quả đối soát file cảnh báo KT251 đợt 9 tháng đầu năm 2026 của Bệnh viện hữu nghị Lạc Việt (Mã CSKCB: 26193).

Sau khi kiểm tra, rà soát chi tiết từng hồ sơ bệnh án trong danh mục cảnh báo chuyên đề KT251 do cơ quan BHXH chuyển về, Bệnh viện hữu nghị Lạc Việt kính trình cơ quan BHXH nội dung giải trình như sau:

1. Về căn cứ xác định giường nằm ghép theo quy định của BHXH Việt Nam:
Tại Mục I, Khoản 1, Bước 2 Tài liệu hướng dẫn nghiệp vụ số 20261110_TAILIEUHUONGDAN của Trung tâm Kiểm soát thanh toán BHXH, BHYT điện tử đã quy định rõ:
"Đánh dấu các trường hợp có thời gian nằm viện trùng trên 4 giờ giữa các bệnh nhân theo mã giường, ngày và khoa điều trị (SO_GIO_GIAO > 4)".

2. Kết quả đối soát thực tế tại Bệnh viện:
Qua kiểm tra dữ liệu chi tiết tại Sheet KT251, Bệnh viện phát hiện có 451 cặp hồ sơ bệnh nhân bị hệ thống giám định tự động đánh dấu cảnh báo trùng giường nhưng có thời gian giao thoa thực tế dưới 4 giờ (SO_GIO_GIAO < 4.0 giờ, chi tiết theo Phụ lục 01 đính kèm).
Nguyên nhân phát sinh: Do sự giao thoa ngắn hạn trong khoảng thời gian bệnh nhân cũ đã có y lệnh ra viện, đang hoàn tất thủ tục thanh toán viện phí tại khoa và bàn giao giường bệnh; đồng thời khoa tiếp nhận bệnh nhân mới vào buồng bệnh theo dõi cấp cứu ban đầu. Tại buồng bệnh, cơ sở y tế đã bố trí giường đệm dự phòng để người bệnh nằm nghỉ, hoàn toàn không có tình trạng nằm ghép 2 người chung 1 tấm đệm đơn.

3. Đề nghị của Bệnh viện:
Căn cứ đúng hướng dẫn chuyên môn nghiệp vụ của BHXH Việt Nam, Bệnh viện hữu nghị Lạc Việt kính đề nghị Bảo hiểm xã hội tỉnh xem xét, loại trừ 451 cặp hồ sơ nêu trên (với tổng số tiền kiểm tra tương ứng là .................... đồng) ra khỏi danh mục xuất toán giường nằm ghép KT251.

Bệnh viện xin trân trọng cảm ơn sự phối hợp của cơ quan Bảo hiểm xã hội!

Nơi nhận:                                                      GIÁM ĐỐC
- Như trên;                                                    (Ký tên, đóng dấu)
- Lưu: VT, KHTH, TCKT.</div>
        </div>

        <!-- Mẫu 2 -->
        <div class="template-box">
          <div class="template-header">
            <div class="template-title">📄 MẪU 2: Giải trình tính hợp pháp của DVKT dấu (*) do Điều dưỡng thực hiện (KT252)</div>
            <button class="copy-btn" onclick="copyTemplate('tpl-2', this)">📋 Sao chép mẫu này</button>
          </div>
          <div id="tpl-2" class="template-text">BỆNH VIỆN HỮU NGHỊ LẠC VIỆT              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
        Số: ....../BVLV-BHYT                          Độc lập - Tự do - Hạnh phúc
                                              -----------------------------------
                                                Vĩnh Phúc, ngày     tháng 11 năm 2026

V/v giải trình tính hợp pháp của các DVKT YHCT
có dấu (*) do điều dưỡng thực hiện theo chuyên đề
KT252 đợt 9 tháng đầu năm 2026

          Kính gửi: Bảo hiểm xã hội tỉnh Vĩnh Phúc

Căn cứ Luật Khám bệnh, chữa bệnh số 15/2023/QH15 ngày 09/01/2023;
Căn cứ Nghị định số 96/2023/NĐ-CP ngày 30/12/2023 của Chính phủ quy định chi tiết một số điều của Luật Khám bệnh, chữa bệnh;
Căn cứ Thông tư số 32/2023/TT-BYT ngày 31/12/2023 của Bộ Y tế quy định chi tiết một số điều của Luật Khám bệnh, chữa bệnh;
Căn cứ dữ liệu cảnh báo chuyên đề KT252 (2.162 dòng với số tiền kiểm tra 143.687.875 đồng).

Bệnh viện hữu nghị Lạc Việt xin giải trình cụ thể như sau:

1. Về cơ sở pháp lý cho phép Điều dưỡng thực hiện kỹ thuật dấu (*):
Theo quy định tại Điểm b Khoản 4 Điều 135 Nghị định số 96/2023/NĐ-CP và hướng dẫn tại Thông tư 32/2023/TT-BYT: "Từ ngày 01 tháng 7 năm 2026 đến ngày 31 tháng 12 năm 2029, căn cứ trình độ chuyên môn, năng lực, kinh nghiệm của người hành nghề có chức danh chuyên môn là điều dưỡng, người chịu trách nhiệm chuyên môn kỹ thuật của cơ sở khám bệnh, chữa bệnh quyết định bằng văn bản việc cho phép thực hiện các kỹ thuật có dấu (*) và chịu trách nhiệm về quyết định của mình."

2. Về năng lực thực tế của nhân viên y tế thực hiện:
Các kỹ thuật Xoa bóp bấm huyệt (mã 08.0432.0280, 08.0430.0280, 08.0414.0280...) tại Khoa Y học cổ truyền - PHCN được thực hiện bởi 02 nhân viên y tế:
- Điều dưỡng/Y sĩ: [Họ tên NTV 1], Mã CCHN: 004613/VP-CCHN, thâm niên công tác 8 năm tại Khoa YHCT, đã được đào tạo liên tục chuyên ngành Xoa bóp bấm huyệt - Vật lý trị liệu (kèm bản sao Chứng chỉ đào tạo số ...);
- Điều dưỡng/Y sĩ: [Họ tên NTV 2], Mã CCHN: 005068/VP-CCHN, thâm niên công tác 6 năm (kèm bản sao Chứng chỉ đào tạo số ...).

3. Về văn bản phân công chuyên môn:
Giám đốc Bệnh viện hữu nghị Lạc Việt đã ban hành Quyết định số .../QĐ-BVLV ngày .../06/2026 về việc "Phân công phạm vi hoạt động chuyên môn kỹ thuật thực hiện các kỹ thuật có dấu (*) cho điều dưỡng Khoa YHCT-PHCN" căn cứ đúng quy định tại Nghị định 96/2023/NĐ-CP.
Toàn bộ quá trình thực hiện dịch vụ kỹ thuật đều tuân thủ nghiêm ngặt Quy trình kỹ thuật do Bộ Y tế ban hành, có chỉ định của Bác sĩ điều trị và ghi chép đầy đủ trên hồ sơ bệnh án.

Do đó, Bệnh viện kính đề nghị BHXH tỉnh chấp nhận thanh toán hợp lệ số tiền 143.687.875 đồng chi phí DVKT nêu trên.

(Đính kèm: Quyết định phân công của Giám đốc BV; Bản sao Chứng chỉ đào tạo của 02 điều dưỡng; Danh mục bệnh án trích lục).</div>
        </div>

        <!-- Mẫu 3 -->
        <div class="template-box">
          <div class="template-header">
            <div class="template-title">📄 MẪU 3: Báo cáo giải trình chuyên đề vượt giường kế hoạch (1,555 tỷ đồng)</div>
            <button class="copy-btn" onclick="copyTemplate('tpl-3', this)">📋 Sao chép mẫu này</button>
          </div>
          <div id="tpl-3" class="template-text">BỆNH VIỆN HỮU NGHỊ LẠC VIỆT              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
        Số: ....../BVLV-BHYT                          Độc lập - Tự do - Hạnh phúc
                                              -----------------------------------
                                                Vĩnh Phúc, ngày     tháng 11 năm 2026

BÁO CÁO GIẢI TRÌNH
Về chi phí ngày giường bệnh nội trú phát sinh vượt số giường
kế hoạch tại các khoa lâm sàng trong 09 tháng đầu năm 2026

          Kính gửi: Bảo hiểm xã hội tỉnh Vĩnh Phúc
                    Sở Y tế tỉnh Vĩnh Phúc

Căn cứ Luật Khám bệnh, chữa bệnh số 15/2023/QH15;
Căn cứ Quyết định phê duyệt quy mô giường bệnh kế hoạch của Bệnh viện hữu nghị Lạc Việt;
Căn cứ kết quả kiểm tra KT251 với số tiền xuất toán 1.555.002.820 đồng do số lượng giường đề nghị vượt giường kế hoạch trong ngày (14.571 dòng).

Bệnh viện hữu nghị Lạc Việt kính báo cáo giải trình như sau:

1. Tình hình tiếp nhận bệnh nhân thực tế:
Trong 9 tháng đầu năm 2026, trên địa bàn tỉnh xuất hiện nhiều đợt dịch bệnh theo mùa (cúm A, sốt xuất huyết, viêm phế quản phổi ở người cao tuổi và trẻ em), đồng thời số lượng bệnh nhân ung thư nặng điều trị hóa trị, xạ trị tại Khoa Nội Ung bướu (K33) và Khoa Xạ trị (K33.2) tăng đột biến.
Theo quy định tại Điều 35 Luật Khám bệnh, chữa bệnh 2023, cơ sở KCB không được từ chối người bệnh trong tình trạng cấp cứu hoặc bệnh nặng cần can thiệp y tế khẩn cấp.

2. Điều kiện cơ sở vật chất và nhân lực:
Để đáp ứng nhu cầu điều trị và không để người bệnh phải nằm ghép, Bệnh viện đã chủ động:
- Bố trí thêm buồng bệnh dự phòng và kê thêm giường bệnh thực tế (đảm bảo đầy đủ ga, đệm, cọc truyền, chuông gọi y tá và diện tích tối thiểu/giường theo quy định);
- Điều động tăng cường nhân lực bác sĩ, điều dưỡng từ các bộ phận để chăm sóc người bệnh 24/24h.
Toàn bộ 14.571 ngày giường bị gắn cờ cảnh báo là ngày giường điều trị thực tế cho người bệnh, có hồ sơ bệnh án theo dõi hằng ngày, không có tình trạng kê khống hay trục lợi quỹ.

3. Kiến nghị:
Bệnh viện kính đề nghị Sở Y tế và Bảo hiểm xã hội tỉnh:
- Ghi nhận nỗ lực đáp ứng nhu cầu KCB cho nhân dân trên địa bàn trong giai đoạn cao điểm dịch bệnh;
- Xem xét chấp nhận thanh toán chi phí ngày giường thực tế phát sinh nêu trên, hoặc áp dụng cơ chế thanh toán theo giá giường bệnh thực kê theo các văn bản hướng dẫn tháo gỡ khó khăn của Bộ Y tế và Tổng Giám đốc BHXH Việt Nam, tạo điều kiện cho Bệnh viện ổn định nguồn lực tài chính tái đầu tư phục vụ người bệnh.</div>
        </div>

        <!-- Mẫu 4 -->
        <div class="template-box">
          <div class="template-header">
            <div class="template-title">📄 MẪU 4: Biên bản đối soát nguyên tắc giữ lại 01 giường cao nhất (0 đ xuất toán)</div>
            <button class="copy-btn" onclick="copyTemplate('tpl-4', this)">📋 Sao chép mẫu này</button>
          </div>
          <div id="tpl-4" class="template-text">BỆNH VIỆN HỮU NGHỊ LẠC VIỆT              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
  TỔ GIÁM ĐỊNH BHYT NỘI BỘ                    Độc lập - Tự do - Hạnh phúc
                                              -----------------------------------

BIÊN BẢN ĐỐI SOÁT NGUYÊN TẮC GIÁM ĐỊNH TIỀN GIƯỜNG
CHUYÊN ĐỀ GIƯỜNG NẰM GHÉP & GIƯỜNG GỐI ĐẦU KT251

Hôm nay, ngày ... tháng 11 năm 2026, tại Bệnh viện hữu nghị Lạc Việt.
Thành phần tham gia:
1. Đại diện Phòng Kế hoạch Tổng hợp: .....................................................
2. Đại diện Phòng Tài chính Kế toán: .....................................................
3. Đại diện Đội ngũ Phân tích Dữ liệu CNTT: Ông Nguyễn Sơn Nam (Nsnnam).

NỘI DUNG THỐNG NHẤT NGUYÊN TẮC GIẢI TRÌNH VỚI BHXH:
1. Nguyên tắc không xuất toán kép:
Khi 02 bệnh nhân (ví dụ BN A và BN B) bị cổng giám định đánh dấu trùng 01 mã giường:
- Bảo lưu toàn bộ chi phí ngày giường của Bệnh nhân có đơn giá cao hơn (hoặc bệnh nhân vào trước, có y lệnh trước) với mức thanh toán 100% (Tiền xuất toán = 0 VNĐ).
- Chỉ xem xét điều chỉnh hoặc tính toán tỷ lệ ghép (50%) đối với bệnh nhân thứ hai.
- Nghiêm cấm việc chấp nhận xuất toán cả 2 bệnh nhân dẫn đến thiệt hại kép cho Bệnh viện.

2. Xử lý các ca trùng mốc phút 12:00 cùng BN:
- Biên bản khẳng định 100% các ca trùng mốc phút 12:00 (428 lượt) là do ngắt ca y lệnh trên phần mềm VNPT-HIS, bệnh nhân chỉ nằm 01 giường duy nhất.
- Đề nghị phòng CNTT sử dụng công cụ NsN_XMLcheck v2.17.0 tự động điều chỉnh giờ bắt đầu thành 12:01 cho các đợt gửi dữ liệu tiếp theo để không bị cổng từ chối.</div>
        </div>

      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; font-size: 12px; color: #64748b; margin-top: 30px; padding: 20px; border-top: 1px solid #cbd5e1;">
      Bản quyền © 2026 <strong>Bệnh viện hữu nghị Lạc Việt</strong> · Phân tích &amp; Tự động hóa bởi <strong>Nguyễn Sơn Nam (Nsnnam)</strong> · Múi giờ Asia/Ho_Chi_Minh (GMT+7)
    </div>
  </div>

  <script>
    const allItems = {json_interactive};
    const allLt4h = {json.dumps(lt4h_samples, ensure_ascii=False)};
    const hospitalName = "Bệnh viện hữu nghị Lạc Việt";

    function switchTab(tabId) {{
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
      
      const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick').includes(tabId));
      if (activeBtn) activeBtn.classList.add('active');
      
      const targetPane = document.getElementById(tabId);
      if (targetPane) targetPane.classList.add('active');
    }}

    function filterByDeptTable(maKhoa) {{
      switchTab('tab-viewer');
      document.getElementById('viewerDeptSelect').value = maKhoa;
      applyViewerFilters();
    }}

    function filterByBedTable(maKhoa, maGiuong) {{
      switchTab('tab-viewer');
      document.getElementById('viewerDeptSelect').value = maKhoa;
      document.getElementById('viewerBedInput').value = maGiuong;
      applyViewerFilters();
    }}

    function getViewerFiltered() {{
      const dept = (document.getElementById('viewerDeptSelect').value || '').toUpperCase();
      const type = document.getElementById('viewerTypeSelect').value || '';
      const bed = (document.getElementById('viewerBedInput').value || '').trim().toUpperCase();
      const q = (document.getElementById('viewerSearchInput').value || '').trim().toLowerCase();

      return allItems.filter(item => {{
        if (dept && (item.maKhoa || '').toUpperCase() !== dept) return false;
        if (type && item.loaiKey !== type) return false;
        if (bed && !(item.maGiuong || '').toUpperCase().includes(bed)) return false;
        if (q) {{
          const str = (item.maLk + ' ' + item.maBn + ' ' + item.hoTen + ' ' + item.maGiuong + ' ' + item.tenKhoa + ' ' + item.ttTrung).toLowerCase();
          if (!str.includes(q)) return false;
        }}
        return true;
      }});
    }}

    function applyViewerFilters() {{
      const filtered = getViewerFiltered();
      document.getElementById('viewerCount').textContent = filtered.length.toLocaleString('vi-VN');

      const tbody = document.getElementById('viewerTableBody');
      if (filtered.length === 0) {{
        tbody.innerHTML = '<tr><td colspan="14" class="text-center py-6 text-slate-500">Không tìm thấy ca nào phù hợp với bộ lọc hiện tại.</td></tr>';
        return;
      }}

      tbody.innerHTML = filtered.slice(0, 300).map((item, idx) => {{
        let badgeClass = 'tag-sharing';
        if (item.loaiKey === 'lt4h') badgeClass = 'tag-lt4h';
        else if (item.loaiKey === 'vuotkh') badgeClass = 'tag-vuotkh';

        return `
          <tr>
            <td class="text-center font-mono">${{idx + 1}}</td>
            <td class="font-mono text-center">${{item.kyQt || '—'}}</td>
            <td class="font-mono font-bold text-teal">${{item.maLk || '—'}}</td>
            <td class="font-mono">${{item.maBn || '—'}}</td>
            <td><strong>${{item.hoTen || '—'}}</strong></td>
            <td>${{item.tenKhoa || item.maKhoa}}</td>
            <td class="font-mono font-bold text-rose">${{item.maGiuong || '—'}}</td>
            <td class="font-mono text-center">${{item.ngayTk || '—'}}</td>
            <td class="font-mono text-center">${{item.tuGio || '0000'}} - ${{item.denGio || '2359'}}</td>
            <td><span class="badge-tag ${{badgeClass}}">${{item.loai}}</span></td>
            <td class="text-center font-mono font-bold">${{item.soTrung || 0}}</td>
            <td class="text-right font-mono font-bold">${{(item.tienKt || 0).toLocaleString('vi-VN')}} đ</td>
            <td class="text-right font-mono font-bold text-rose">${{(item.tienXt || 0).toLocaleString('vi-VN')}} đ</td>
            <td class="font-mono" style="font-size: 11px; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${{item.ttTrung || ''}}">${{item.ttTrung || '—'}}</td>
          </tr>
        `;
      }}).join('');
    }}

    function resetViewerFilters() {{
      document.getElementById('viewerDeptSelect').value = '';
      document.getElementById('viewerTypeSelect').value = '';
      document.getElementById('viewerBedInput').value = '';
      document.getElementById('viewerSearchInput').value = '';
      applyViewerFilters();
    }}

    function downloadFile(content, fileName, mimeType) {{
      const blob = new Blob([content], {{ type: mimeType }});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }}

    function downloadMasterExcel() {{
      // Direct link to the generated master Excel file in the directory
      const link = document.createElement('a');
      link.href = 'BAO_CAO_DOI_SOAT_CHI_TIET_KT251_KT252.xlsx';
      link.download = 'BAO_CAO_DOI_SOAT_CHI_TIET_KT251_KT252.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }}

    function generateXmlExcel(records, sheetTitle) {{
      const rowsXml = records.map((r, i) => `
        <Row>
          <Cell ss:StyleID="sCenter"><Data ss:Type="Number">${{i + 1}}</Data></Cell>
          <Cell ss:StyleID="sCenter"><Data ss:Type="String">${{r.kyQt || ''}}</Data></Cell>
          <Cell ss:StyleID="sText"><Data ss:Type="String">${{r.maLk || ''}}</Data></Cell>
          <Cell ss:StyleID="sText"><Data ss:Type="String">${{r.maBn || ''}}</Data></Cell>
          <Cell ss:StyleID="sText"><Data ss:Type="String">${{r.hoTen || ''}}</Data></Cell>
          <Cell ss:StyleID="sText"><Data ss:Type="String">${{r.tenKhoa || r.maKhoa || ''}}</Data></Cell>
          <Cell ss:StyleID="sCenter"><Data ss:Type="String">${{r.maGiuong || ''}}</Data></Cell>
          <Cell ss:StyleID="sCenter"><Data ss:Type="String">${{r.ngayTk || ''}}</Data></Cell>
          <Cell ss:StyleID="sCenter"><Data ss:Type="String">${{r.tuGio || ''}} - ${{r.denGio || ''}}</Data></Cell>
          <Cell ss:StyleID="sText"><Data ss:Type="String">${{r.loai || ''}}</Data></Cell>
          <Cell ss:StyleID="sCenter"><Data ss:Type="Number">${{r.soTrung || 0}}</Data></Cell>
          <Cell ss:StyleID="sMoney"><Data ss:Type="Number">${{r.tienKt || r.tienKiemTra || 0}}</Data></Cell>
          <Cell ss:StyleID="sMoney"><Data ss:Type="Number">${{r.tienXt || r.tienXuatToan || 0}}</Data></Cell>
          <Cell ss:StyleID="sText"><Data ss:Type="String">${{(r.ttTrung || r.thongTinTrung || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}}</Data></Cell>
        </Row>
      `).join('\\n');

      return '<?xml version="1.0" encoding="UTF-8"?>\\n' +
        '<?mso-application progid="Excel.Sheet"?>\\n' +
        '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\\n' +
        ' xmlns:o="urn:schemas-microsoft-com:office:office"\\n' +
        ' xmlns:x="urn:schemas-microsoft-com:office:excel"\\n' +
        ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\\n' +
        '<Styles>\\n' +
        ' <Style ss:ID="Default" ss:Name="Normal"><Font ss:FontName="Arial" ss:Size="10"/></Style>\\n' +
        ' <Style ss:ID="sHeader"><Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0F172A" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>\\n' +
        ' <Style ss:ID="sCenter"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>\\n' +
        ' <Style ss:ID="sText"><Alignment ss:Horizontal="Left" ss:Vertical="Center"/></Style>\\n' +
        ' <Style ss:ID="sMoney"><NumberFormat ss:Format="#,##0"/><Alignment ss:Horizontal="Right" ss:Vertical="Center"/></Style>\\n' +
        '</Styles>\\n' +
        '<Worksheet ss:Name="' + sheetTitle + '">\\n' +
        ' <Table>\\n' +
        '  <Column ss:Width="40"/>\\n' +
        '  <Column ss:Width="70"/>\\n' +
        '  <Column ss:Width="80"/>\\n' +
        '  <Column ss:Width="90"/>\\n' +
        '  <Column ss:Width="160"/>\\n' +
        '  <Column ss:Width="160"/>\\n' +
        '  <Column ss:Width="80"/>\\n' +
        '  <Column ss:Width="80"/>\\n' +
        '  <Column ss:Width="90"/>\\n' +
        '  <Column ss:Width="150"/>\\n' +
        '  <Column ss:Width="70"/>\\n' +
        '  <Column ss:Width="110"/>\\n' +
        '  <Column ss:Width="110"/>\\n' +
        '  <Column ss:Width="280"/>\\n' +
        '  <Row ss:Height="24">\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">STT</Data></Cell>\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Kỳ QT</Data></Cell>\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Mã LK</Data></Cell>\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Mã BN</Data></Cell>\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Họ Và Tên</Data></Cell>\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Khoa Điều Trị</Data></Cell>\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Mã Giường</Data></Cell>\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Ngày TK</Data></Cell>\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Giờ Kê</Data></Cell>\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Phân Loại</Data></Cell>\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Số Trùng</Data></Cell>\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Tiền Kiểm Tra</Data></Cell>\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Tiền Xuất Toán</Data></Cell>\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Thông Tin Trùng BHXH</Data></Cell>\\n' +
        '  </Row>\\n' +
        rowsXml +
        ' </Table>\\n' +
        '</Worksheet>\\n' +
        '</Workbook>';
    }}

    function exportFilteredDataToExcel() {{
      const filtered = getViewerFiltered();
      if (!filtered.length) {{
        alert('Không có dữ liệu phù hợp để xuất Excel!');
        return;
      }}
      const xml = generateXmlExcel(filtered, 'Du_Lieu_Loc');
      downloadFile(xml, 'BAO_CAO_LOC_KT251_' + new Date().toISOString().slice(0,10) + '.xls', 'application/vnd.ms-excel;charset=utf-8');
    }}

    function exportLt4hToExcel() {{
      const xml = generateXmlExcel(allLt4h, '451_Ca_Trung_Duoi_4H');
      downloadFile(xml, 'PHU_LUC_01_451_CA_TRUNG_DUOI_4H_BHXH_SAI.xls', 'application/vnd.ms-excel;charset=utf-8');
    }}

    function copyTemplate(elId, btn) {{
      const el = document.getElementById(elId);
      if (!el) return;
      const text = el.innerText;
      navigator.clipboard.writeText(text).then(() => {{
        const orig = btn.innerHTML;
        btn.innerHTML = '✅ Đã sao chép vào Clipboard!';
        btn.style.background = '#059669';
        setTimeout(() => {{
          btn.innerHTML = orig;
          btn.style.background = '';
        }}, 2500);
      }}).catch(err => {{
        alert('Vui lòng bôi đen văn bản và nhấn Ctrl+C để sao chép.');
      }});
    }}

    // Init viewer
    applyViewerFilters();
  </script>
</body>
</html>
'''

out_path_html = r'C:\Users\Admin\Projects\xml3-duration-checker\INFOGRAPHIC_DOI_SOAT_KT251_KT252_BHXH.html'
with open(out_path_html, 'w', encoding='utf-8') as f:
    f.write(html)

# Also copy to artifact directory
artifact_dir = r'C:\Users\Admin\.gemini\antigravity-cli\brain\75d1680e-44fd-46c5-aef9-351a9aa2d8d3'
shutil.copy2(out_path_html, os.path.join(artifact_dir, 'INFOGRAPHIC_DOI_SOAT_KT251_KT252_BHXH.html'))
shutil.copy2(r'C:\Users\Admin\Projects\xml3-duration-checker\BAO_CAO_DOI_SOAT_CHI_TIET_KT251_KT252.xlsx', os.path.join(artifact_dir, 'BAO_CAO_DOI_SOAT_CHI_TIET_KT251_KT252.xlsx'))

print("Enhanced INFOGRAPHIC_DOI_SOAT_KT251_KT252_BHXH.html and Excel file generated and copied to artifact directory successfully.")
