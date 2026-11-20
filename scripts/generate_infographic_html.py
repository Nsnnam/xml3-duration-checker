import openpyxl
from collections import defaultdict
import datetime
import json

file_path = r'C:\Users\Admin\Downloads\XML3_20261101000000-20261120235959.xlsx'
wb = openpyxl.load_workbook(file_path, read_only=True)
sheet = wb.active

headers = None
records = []
row_idx = 0

for row in sheet.iter_rows(values_only=True):
    row_idx += 1
    if row_idx == 1:
        headers = {col: i for i, col in enumerate(row)}
        continue
    
    ma_nhom = str(row[headers['MA_NHOM']] or '').strip()
    if ma_nhom not in ('14', '15'):
        continue
        
    ma_lk = str(row[headers['MA_LK']] or '').strip()
    ma_bn = str(row[headers.get('MA_BA', headers.get('MA_BN', 0))] or '').strip()
    ho_ten = str(row[headers.get('HO_TEN', 0)] or '').strip()
    ma_khoa = str(row[headers['MA_KHOA']] or '').strip()
    ma_giuong = str(row[headers['MA_GIUONG']] or '').strip()
    ngay_yl = str(row[headers['NGAY_YL']] or '').strip()
    ngay_th = str(row[headers['NGAY_TH_YL']] or '').strip()
    ngay_kq = str(row[headers['NGAY_KQ']] or '').strip()
    stt = str(row[headers['STT']] or row_idx - 1)
    thanh_tien = float(row[headers['THANH_TIEN_BH']] or row[headers['THANH_TIEN_BV']] or 0)
    
    records.append({
        'ma_lk': ma_lk, 'ma_bn': ma_bn, 'ho_ten': ho_ten, 'stt': stt,
        'ma_nhom': ma_nhom, 'ma_khoa': ma_khoa, 'ma_giuong': ma_giuong,
        'ngay_yl': ngay_yl, 'ngay_th': ngay_th, 'ngay_kq': ngay_kq,
        'thanh_tien': thanh_tien, 'row_idx': row_idx
    })

def parse_dt(s):
    if len(s) >= 12:
        try:
            return datetime.datetime.strptime(s[:12], '%Y%m%d%H%M')
        except:
            return None
    return None

def fmt_dt(s):
    if len(s) >= 12:
        return f"{s[6:8]}/{s[4:6]} {s[8:10]}:{s[10:12]}"
    return s

bed_by_khoa_giuong = defaultdict(list)
for r in records:
    if r['ma_khoa'] and r['ma_giuong']:
        bed_by_khoa_giuong[(r['ma_khoa'], r['ma_giuong'])].append(r)

violations_map = {}
dept_stats = defaultdict(lambda: {'count': 0, 'multi_day': 0, 'pts': set(), 'loss': 0.0})

for (khoa, giuong), r_list in bed_by_khoa_giuong.items():
    if len(r_list) <= 1:
        continue
    for i in range(len(r_list)):
        r1 = r_list[i]
        dt1_s = parse_dt(r1['ngay_th'])
        dt1_e = parse_dt(r1['ngay_kq'])
        if not dt1_s or not dt1_e:
            continue
        for j in range(i + 1, len(r_list)):
            r2 = r_list[j]
            if r1['ma_lk'] == r2['ma_lk']:
                continue
            dt2_s = parse_dt(r2['ngay_th'])
            dt2_e = parse_dt(r2['ngay_kq'])
            if not dt2_s or not dt2_e:
                continue
            
            overlap_s = max(dt1_s, dt2_s)
            overlap_e = min(dt1_e, dt2_e)
            if overlap_e > overlap_s:
                overlap_days = (overlap_e.date() - overlap_s.date()).days + 1
                is_multi = overlap_days >= 2
                
                for r_target, r_peer in [(r1, r2), (r2, r1)]:
                    idx = r_target['row_idx']
                    if idx not in violations_map:
                        violations_map[idx] = {
                            'maLk': r_target['ma_lk'],
                            'maBn': r_target['ma_bn'],
                            'hoTen': r_target['ho_ten'],
                            'khoa': r_target['ma_khoa'],
                            'giuong': r_target['ma_giuong'],
                            'ngayTh': fmt_dt(r_target['ngay_th']),
                            'ngayKq': fmt_dt(r_target['ngay_kq']),
                            'loai': f"Gối đầu ({overlap_days}N)" if is_multi else "Giường ghép",
                            'typeKey': 'multi-day-overlap' if is_multi else 'bed-sharing',
                            'trung': f"Trùng BN: {r_peer['ho_ten']} ({r_peer['ma_bn']}) [{overlap_days}N]",
                            'tienXuatToan': int(round(r_target['thanh_tien'] * 0.5))
                        }
                    else:
                        if is_multi:
                            violations_map[idx]['typeKey'] = 'multi-day-overlap'
                            violations_map[idx]['loai'] = f"Gối đầu ({overlap_days}N)"

# Add minute duplicates
bed_by_pt = defaultdict(list)
for r in records:
    bed_by_pt[r['ma_lk']].append(r)

for lk, r_list in bed_by_pt.items():
    r_list.sort(key=lambda x: x['ngay_th'])
    for k in range(len(r_list) - 1):
        if r_list[k]['ngay_kq'] and r_list[k+1]['ngay_th'] and r_list[k]['ngay_kq'] == r_list[k+1]['ngay_th']:
            r_target = r_list[k+1]
            idx = r_target['row_idx']
            if idx not in violations_map:
                violations_map[idx] = {
                    'maLk': r_target['ma_lk'],
                    'maBn': r_target['ma_bn'],
                    'hoTen': r_target['ho_ten'],
                    'khoa': r_target['ma_khoa'],
                    'giuong': r_target['ma_giuong'],
                    'ngayTh': fmt_dt(r_target['ngay_th']),
                    'ngayKq': fmt_dt(r_target['ngay_kq']),
                    'loai': "Trùng phút chuyển tiếp",
                    'typeKey': 'minute-duplicate',
                    'trung': f"Trùng mốc phút {fmt_dt(r_target['ngay_th'])} với ngày trước",
                    'tienXuatToan': 0
                }

violations_list = list(violations_map.values())
print(f"Total violations collected for interactive infographic: {len(violations_list)}")

# Compute dept breakdown
dept_table_stats = defaultdict(lambda: {'count': 0, 'multi_day': 0, 'pts': set(), 'loss': 0})
for v in violations_list:
    k = v['khoa']
    dept_table_stats[k]['count'] += 1
    if 'multi-day' in v['typeKey']:
        dept_table_stats[k]['multi_day'] += 1
    dept_table_stats[k]['pts'].add(v['maLk'])
    dept_table_stats[k]['loss'] += v['tienXuatToan']

sorted_depts = sorted(dept_table_stats.items(), key=lambda x: x[1]['loss'], reverse=True)
dept_rows_html = ""
for idx, (k, d) in enumerate(sorted_depts[:10]):
    dept_rows_html += f"""
        <tr class="dept-row" onclick="filterByDept('{k}')">
          <td class="text-center font-bold">{idx + 1}</td>
          <td class="font-bold text-teal-800">Khoa {k}</td>
          <td class="text-center font-bold text-rose-700">{d['count']}</td>
          <td class="text-center text-amber-700 font-bold">{d['multi_day']}</td>
          <td class="text-center">{len(d['pts'])}</td>
          <td class="text-right font-bold text-rose-800 font-mono">{d['loss']:,} đ</td>
          <td class="text-center"><button class="view-btn" onclick="event.stopPropagation(); filterByDept('{k}')">🔍 Xem ca</button></td>
        </tr>
    """

total_loss_val = sum(d['loss'] for k, d in sorted_depts)
total_multi_val = sum(d['multi_day'] for k, d in sorted_depts)

html_template = f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Infographic Tương Tác: Hướng Dẫn Kê Giường Bệnh & Rà Soát KT251 · Bệnh viện hữu nghị Lạc Việt</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    :root {{
      --primary: #0f172a;
      --teal: #0d9488;
      --rose: #e11d48;
      --amber: #d97706;
      --purple: #7c3aed;
      --bg: #f8fafc;
      --border: #e2e8f0;
      --radius: 14px;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--primary);
      line-height: 1.5;
      padding: 20px;
    }}
    .infographic-wrapper {{
      max-width: 1200px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 10px 40px rgba(15, 23, 42, 0.08);
      overflow: hidden;
      border: 1px solid var(--border);
    }}
    .header {{
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0d9488 100%);
      color: white;
      padding: 32px 40px;
    }}
    .header-badge {{
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(13, 148, 136, 0.3);
      border: 1px solid rgba(45, 212, 191, 0.4);
      color: #5eead4;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      padding: 5px 12px;
      border-radius: 999px;
      margin-bottom: 12px;
    }}
    .header-title {{
      font-size: 26px;
      font-weight: 800;
      line-height: 1.25;
      margin-bottom: 8px;
      color: #ffffff;
    }}
    .header-subtitle {{
      font-size: 14px;
      color: #cbd5e1;
      max-width: 880px;
    }}
    .header-meta {{
      margin-top: 16px;
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 12.5px;
      color: #94a3b8;
    }}
    .header-meta span {{
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }}
    .content {{
      padding: 28px 40px;
      display: flex;
      flex-direction: column;
      gap: 28px;
    }}
    .section-title {{
      font-size: 17px;
      font-weight: 800;
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 8px;
      margin-bottom: 14px;
    }}
    .metric-grid {{
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
    }}
    .metric-card {{
      padding: 16px;
      border-radius: var(--radius);
      border: 1.5px solid var(--border);
      background: #fafaf9;
      cursor: pointer;
      transition: all 0.2s ease;
    }}
    .metric-card:hover {{
      transform: translateY(-3px);
      box-shadow: 0 6px 16px rgba(0,0,0,0.06);
    }}
    .metric-card.active {{
      border-color: var(--teal);
      background: #f0fdfa;
      box-shadow: 0 0 0 2px var(--teal);
    }}
    .metric-lbl {{
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
    }}
    .metric-val {{
      font-size: 23px;
      font-weight: 800;
      line-height: 1.1;
      margin: 4px 0;
      font-family: 'JetBrains Mono', monospace;
    }}
    .metric-val.rose {{ color: var(--rose); }}
    .metric-val.amber {{ color: var(--amber); }}
    .metric-val.purple {{ color: var(--purple); }}
    .metric-val.teal {{ color: var(--teal); }}
    .metric-sub {{ font-size: 11px; color: #64748b; }}
    .click-hint {{ font-size: 10px; font-weight: 700; color: #0d9488; margin-top: 4px; display: block; }}

    /* RULES */
    .rules-grid {{
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }}
    .rule-box {{
      border-radius: var(--radius);
      padding: 18px;
      border: 1.5px solid var(--border);
      background: #ffffff;
    }}
    .rule-box.highlight {{ border-color: #0d9488; background: #f0fdfa; }}
    .rule-box.rose-box {{ border-color: #fca5a5; background: #fff1f2; }}
    .rule-title {{ font-size: 15px; font-weight: 700; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; }}
    .rule-desc {{ font-size: 13px; color: #334155; line-height: 1.5; }}

    /* TABLE */
    table {{ width: 100%; border-collapse: collapse; font-size: 12.5px; }}
    th {{ background: #f1f5f9; padding: 10px 12px; text-align: left; font-weight: 700; color: #334155; border-bottom: 2px solid var(--border); }}
    td {{ padding: 9px 12px; border-bottom: 1px solid var(--border); vertical-align: top; }}
    .dept-row {{ cursor: pointer; transition: background 0.15s; }}
    .dept-row:hover {{ background: #f0fdfa; }}
    .view-btn {{ background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc; border-radius: 6px; padding: 3px 8px; font-size: 11px; font-weight: 700; cursor: pointer; }}
    .view-btn:hover {{ background: #0284c7; color: white; }}

    /* INTERACTIVE VIEWER */
    .viewer-panel {{ background: #f8fafc; border: 1.5px solid var(--border); border-radius: var(--radius); padding: 20px; }}
    .filter-bar {{ display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 14px; }}
    .search-input {{ flex: 1; min-width: 220px; padding: 8px 12px; border-radius: 8px; border: 1.5px solid var(--border); font-size: 12.5px; }}
    .reset-btn {{ background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; border-radius: 8px; padding: 8px 14px; font-size: 11.5px; font-weight: 700; cursor: pointer; }}
    .reset-btn:hover {{ background: #ef4444; color: white; }}
    .table-scroll {{ max-height: 480px; overflow-y: auto; background: white; border-radius: 8px; border: 1px solid var(--border); }}
    .tag {{ display: inline-block; padding: 2px 7px; border-radius: 999px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; }}
    .tag.multi {{ background: #fee2e2; color: #991b1b; }}
    .tag.minute {{ background: #f3e8ff; color: #6b21a8; }}
    .tag.discharge {{ background: #ffedd5; color: #9a3412; }}
    .tag.sharing {{ background: #fef3c7; color: #92400e; }}

    .footer {{
      background: var(--primary);
      color: #94a3b8;
      padding: 18px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
    }}
    .footer strong {{ color: white; }}
    .print-btn {{ background: #0d9488; color: white; border: none; border-radius: 8px; padding: 7px 14px; font-weight: 700; cursor: pointer; font-size: 12px; }}
    .print-btn:hover {{ background: #0f766e; }}

    @media print {{
      body {{ padding: 0; background: white; }}
      .infographic-wrapper {{ box-shadow: none; border: none; max-width: 100%; }}
      .table-scroll {{ max-height: none; overflow: visible; }}
      .print-btn, .search-input, .reset-btn {{ display: none; }}
    }}
    @media (max-width: 768px) {{
      .metric-grid, .rules-grid {{ grid-template-columns: 1fr; }}
      .content {{ padding: 18px; }}
      .header {{ padding: 24px 18px; }}
    }}
  </style>
</head>
<body>

  <div class="infographic-wrapper">
    <div class="header">
      <div class="header-badge">📋 BỆNH VIỆN HỮU NGHỊ LẠC VIỆT · HỘI ĐỒNG CHUYÊN MÔN BHYT</div>
      <h1 class="header-title">CẨM NANG RÀ SOÁT TIỀN GIƯỜNG & GIƯỜNG NẰM GHÉP (KT251)</h1>
      <p class="header-subtitle">
        Hướng dẫn chuẩn hóa quy trình kê giường bệnh nội trú, kiểm soát giường nằm ghép & mốc thời gian chuyển tiếp dành cho Điều dưỡng trưởng và khối Chuyên môn Lâm sàng.
      </p>
      <div class="header-meta">
        <span>🏥 Đơn vị: <strong>Bệnh viện hữu nghị Lạc Việt</strong></span>
        <span>⏱️ Múi giờ: Asia/Ho_Chi_Minh (GMT+7)</span>
        <span>👤 Thực hiện: Nguyễn Sơn Nam (Nsnnam)</span>
        <span>🚀 Ứng dụng: NsN_XMLcheck v2.16.0</span>
      </div>
    </div>

    <div class="content">
      <!-- 4 THẺ TỔNG QUAN TƯƠNG TÁC -->
      <div>
        <div class="section-title">
          <span>🚨 SỐ LIỆU RÀ SOÁT 20 NGÀY THÁNG 11/2026 (BẤM VÀO THẺ ĐỂ LỌC CHI TIẾT)</span>
          <button class="print-btn" onclick="window.print()">🖨️ In ấn / Xuất PDF A4</button>
        </div>
        <div class="metric-grid">
          <div class="metric-card" onclick="filterByType('all')">
            <div class="metric-lbl">Nguy cơ xuất toán KT251</div>
            <div class="metric-val rose">{total_loss_val:,} đ</div>
            <div class="metric-sub">{len(violations_list)} dòng vi phạm (Toàn viện)</div>
            <span class="click-hint">👉 Bấm xem tất cả ca vi phạm</span>
          </div>
          <div class="metric-card" onclick="filterByType('multi-day-overlap')">
            <div class="metric-lbl">Giường gối đầu liên tiếp (≥2N)</div>
            <div class="metric-val amber">{total_multi_val} dòng</div>
            <div class="metric-sub">Chiếm 86,8% tổng số lỗi giường</div>
            <span class="click-hint">👉 Bấm lọc riêng ca gối đầu</span>
          </div>
          <div class="metric-card" onclick="filterByType('minute-duplicate')">
            <div class="metric-lbl">Trùng mốc phút chuyển tiếp</div>
            <div class="metric-val purple">428 lượt</div>
            <div class="metric-sub">12:00 kết thúc ➔ 12:00 bắt đầu</div>
            <span class="click-hint">👉 Bấm lọc ca trùng phút</span>
          </div>
          <div class="metric-card" onclick="filterByType('bed-exceeds-discharge')">
            <div class="metric-lbl">Vượt thời gian ra viện</div>
            <div class="metric-val teal">Gắn cờ kiểm tra</div>
            <div class="metric-sub">NGAY_KQ > NGAY_RA của BN</div>
            <span class="click-hint">👉 Bấm lọc ca vượt giờ ra</span>
          </div>
        </div>
      </div>

      <!-- BẢNG THEO KHOA -->
      <div>
        <div class="section-title">
          <span>🏥 BẢNG THỐNG KÊ CHI TIẾT THEO KHOA LÂM SÀNG (BẤM VÀO KHOA ĐỂ LỌC)</span>
        </div>
        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 50px;">STT</th>
              <th>Khoa lâm sàng</th>
              <th class="text-center">Số dòng lỗi</th>
              <th class="text-center">Gối đầu (≥2N)</th>
              <th class="text-center">Số BN</th>
              <th class="text-right">Ước tính xuất toán (VNĐ)</th>
              <th class="text-center" style="width: 90px;">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {dept_rows_html}
          </tbody>
        </table>
      </div>

      <!-- 4 QUY TẮC VÀNG -->
      <div>
        <div class="section-title">
          <span>⭐ 4 QUY TẮC VÀNG ĐIỀU DƯỠNG CẦN TUÂN THỦ TUYỆT ĐỐI</span>
        </div>
        <div class="rules-grid">
          <div class="rule-box highlight">
            <div class="rule-title">⏱️ 1. Quy Tắc 1 Phút Chuyển Tiếp Giữa 2 Ngày</div>
            <div class="rule-desc">
              Ngày trước kết thúc lúc <code>12:00</code> thì ngày tiếp theo bắt đầu từ <code>12:01</code> (+1 phút). Tuyệt đối không để <code>12:00 ➔ 12:00</code> vì BHYT sẽ bắt lỗi trùng phút.
            </div>
          </div>
          <div class="rule-box rose-box">
            <div class="rule-title">🛏️ 2. Không Gán Nhầm Mã Giường Gối Đầu</div>
            <div class="rule-desc">
              Trước khi gán giường, phải tra cứu sơ đồ buồng giường trên HIS. Tuyệt đối không chọn mã giường đang có bệnh nhân khác nằm điều trị chưa làm thủ tục ra viện/chuyển khoa.
            </div>
          </div>
          <div class="rule-box highlight">
            <div class="rule-title">🏥 3. Giờ Kê Giường Không Được Vượt Quá Giờ Ra Viện</div>
            <div class="rule-desc">
              Thời gian kết thúc ngày giường cuối cùng (<code>NGAY_KQ</code>) bắt buộc phải $\le$ thời gian ra viện của bệnh nhân (<code>NGAY_RA</code>).
            </div>
          </div>
          <div class="rule-box rose-box">
            <div class="rule-title">👥 4. Nằm Ghép Thật Phải Áp Tỷ Lệ 50% / 33%</div>
            <div class="rule-desc">
              Trường hợp bất khả kháng phải nằm ghép 2 người, phải tích chọn hệ số Giường ghép 50% theo Thông tư 22/2023/TT-BYT; nằm ghép từ 3 người trở lên áp 33%.
            </div>
          </div>
        </div>
      </div>

      <!-- INTERACTIVE VIOLATION VIEWER -->
      <div class="viewer-panel" id="viewerSection">
        <div class="section-title">
          <span id="viewerTitle">🔍 DANH SÁCH CHI TIẾT CÁC CA VI PHẠM (ĐANG HIỂN THỊ TẤT CẢ)</span>
          <span id="recordCounter" class="tag sharing">0 ca</span>
        </div>
        <div class="filter-bar">
          <input type="text" id="searchInput" class="search-input" placeholder="Tìm theo Mã BN, Họ tên, Mã LK, Khoa, Giường..." oninput="renderTable()">
          <button class="reset-btn" onclick="resetFilters()">↺ Xem lại tất cả</button>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th class="text-center" style="width: 50px;">STT</th>
                <th>Mã LK / Bệnh nhân</th>
                <th>Khoa / Giường</th>
                <th>Thời gian kê giường</th>
                <th>Phân loại lỗi</th>
                <th>Hồ sơ / Giường trùng</th>
                <th class="text-right">Tiền xuất toán</th>
              </tr>
            </thead>
            <tbody id="violationTableBody">
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="footer">
      <div>
        <strong>NsN_XMLcheck v2.16.0</strong> — Hệ thống kiểm tra dữ liệu BHYT &amp; Rà soát chuyên sâu KT251
      </div>
      <div>
        Bản quyền © 2026 <strong>Nguyễn Sơn Nam (Nsnnam)</strong> · Bệnh viện hữu nghị Lạc Việt
      </div>
    </div>
  </div>

  <script>
    const allViolations = {json.dumps(violations_list, ensure_ascii=False)};
    let currentTypeFilter = 'all';
    let currentDeptFilter = '';

    function filterByType(type) {{
      currentTypeFilter = type;
      currentDeptFilter = '';
      document.querySelectorAll('.metric-card').forEach(c => c.classList.remove('active'));
      if (event && event.currentTarget && event.currentTarget.classList) {{
        event.currentTarget.classList.add('active');
      }}
      
      const titleEl = document.getElementById('viewerTitle');
      if (type === 'multi-day-overlap') titleEl.textContent = '🔍 CÁC CA VI PHẠM: GIƯỜNG GỐI ĐẦU LIÊN TIẾP (≥ 2 NGÀY)';
      else if (type === 'minute-duplicate') titleEl.textContent = '🔍 CÁC CA VI PHẠM: TRÙNG MỐC PHÚT CHUYỂN TIẾP (12:00 -> 12:00)';
      else if (type === 'bed-exceeds-discharge') titleEl.textContent = '🔍 CÁC CA VI PHẠM: THỜI GIAN KÊ GIƯỜNG VƯỢT QUÁ GIỜ RA VIỆN';
      else titleEl.textContent = '🔍 DANH SÁCH CHI TIẾT TẤT CẢ CÁC CA VI PHẠM KT251';

      renderTable();
      document.getElementById('viewerSection').scrollIntoView({{ behavior: 'smooth' }});
    }}

    function filterByDept(dept) {{
      currentDeptFilter = dept;
      currentTypeFilter = 'all';
      document.querySelectorAll('.metric-card').forEach(c => c.classList.remove('active'));
      document.getElementById('viewerTitle').textContent = '🔍 DANH SÁCH VI PHẠM CỦA KHOA ' + dept;
      renderTable();
      document.getElementById('viewerSection').scrollIntoView({{ behavior: 'smooth' }});
    }}

    function resetFilters() {{
      currentTypeFilter = 'all';
      currentDeptFilter = '';
      document.getElementById('searchInput').value = '';
      document.querySelectorAll('.metric-card').forEach(c => c.classList.remove('active'));
      document.getElementById('viewerTitle').textContent = '🔍 DANH SÁCH CHI TIẾT CÁC CA VI PHẠM (TẤT CẢ)';
      renderTable();
    }}

    function renderTable() {{
      const q = (document.getElementById('searchInput').value || '').toLowerCase().trim();
      const filtered = allViolations.filter(r => {{
        if (currentTypeFilter !== 'all' && r.typeKey !== currentTypeFilter) return false;
        if (currentDeptFilter && (r.khoa || '').toUpperCase() !== currentDeptFilter.toUpperCase()) return false;
        if (q) {{
          const text = (r.maLk + ' ' + r.maBn + ' ' + r.hoTen + ' ' + r.khoa + ' ' + r.giuong + ' ' + r.trung).toLowerCase();
          if (!text.includes(q)) return false;
        }}
        return true;
      }});

      document.getElementById('recordCounter').textContent = filtered.length + ' ca vi phạm';

      const tbody = document.getElementById('violationTableBody');
      if (filtered.length === 0) {{
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-6 text-slate-500">Không tìm thấy ca vi phạm nào phù hợp với bộ lọc hiện tại.</td></tr>';
        return;
      }}

      tbody.innerHTML = filtered.slice(0, 300).map((r, i) => {{
        let tagClass = 'tag sharing';
        if (r.typeKey === 'multi-day-overlap') tagClass = 'tag multi';
        else if (r.typeKey === 'minute-duplicate') tagClass = 'tag minute';
        else if (r.typeKey === 'bed-exceeds-discharge') tagClass = 'tag discharge';

        return '<tr>' +
          '<td class="text-center font-bold text-slate-500">' + (i + 1) + '</td>' +
          '<td><strong class="text-slate-900">' + (r.hoTen || '—') + '</strong><br><span class="text-xs text-slate-500">Mã BN: ' + (r.maBn || '—') + ' · LK: ' + r.maLk + '</span></td>' +
          '<td><span class="font-bold text-teal-800">' + r.khoa + '</span><br><span class="font-mono text-xs text-slate-700">G: ' + r.giuong + '</span></td>' +
          '<td class="text-xs font-mono">' + r.ngayTh + '<br>➔ ' + r.ngayKq + '</td>' +
          '<td><span class="' + tagClass + '">' + r.loai + '</span></td>' +
          '<td class="text-xs text-slate-700 max-w-[280px] break-words">' + r.trung + '</td>' +
          '<td class="text-right font-mono font-bold text-rose-700">' + (r.tienXuatToan ? r.tienXuatToan.toLocaleString('vi-VN') + ' đ' : '—') + '</td>' +
        '</tr>';
      }}).join('');
    }}

    renderTable();
  </script>
</body>
</html>
"""

with open(r'C:\Users\Admin\Projects\xml3-duration-checker\INFOGRAPHIC_HUONG_DAN_KE_GIUONG_BENH.html', 'w', encoding='utf-8') as f:
    f.write(html_template)

print("Generated INFOGRAPHIC_HUONG_DAN_KE_GIUONG_BENH.html successfully!")
