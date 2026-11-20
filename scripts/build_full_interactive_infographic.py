import os
import sys
import json
import shutil

JSON_PATH = r'C:\Users\Admin\Projects\xml3-duration-checker\scripts\kt_full_summary_data.json'
OUT_HTML = r'C:\Users\Admin\Projects\xml3-duration-checker\INFOGRAPHIC_DOI_SOAT_KT251_KT252_BHXH.html'
ARTIFACT_DIR = r'C:\Users\Admin\.gemini\antigravity-cli\brain\75d1680e-44fd-46c5-aef9-351a9aa2d8d3'

if not os.path.exists(JSON_PATH):
    print("Error: JSON file does not exist yet.")
    sys.exit(1)

with open(JSON_PATH, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Loaded JSON. Depts: {len(data['depts'])}, Dates: {len(data['dates'])}, Beds: {len(data['topBeds'])}, LT4H: {len(data['lt4hSamples'])}")

# Build HTML template
# We will embed the data directly into a JS variable so the HTML is completely offline and self-contained!
json_str = json.dumps(data, ensure_ascii=False)

html_template = '''<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Báo Cáo Đối Soát Chi Tiết Cảnh Báo BHYT KT251 & KT252 | BV Đa Khoa Hữu Nghị Lạc Việt</title>
  <!-- SheetJS for instant client-side Excel export -->
  <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
  <style>
    :root {
      --primary: #1e3a8a;
      --primary-light: #3b82f6;
      --secondary: #0d9488;
      --teal-light: #14b8a6;
      --danger: #dc2626;
      --danger-light: #ef4444;
      --warning: #d97706;
      --warning-light: #f59e0b;
      --success: #059669;
      --dark: #0f172a;
      --slate: #334155;
      --gray: #64748b;
      --light-gray: #f1f5f9;
      --border: #e2e8f0;
      --card-bg: #ffffff;
      --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
      --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
      --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background: #f8fafc;
      color: var(--slate);
      line-height: 1.5;
    }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0d9488 100%);
      color: white;
      padding: 2.2rem 2rem 1.8rem;
      box-shadow: var(--shadow-lg);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .header-content {
      max-width: 1500px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1.2rem;
    }
    .header-title h1 {
      font-size: 1.65rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .header-title p {
      font-size: 0.95rem;
      color: #cbd5e1;
      margin-top: 0.3rem;
    }
    .header-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 1.15rem;
      font-size: 0.88rem;
      font-weight: 600;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
    }
    .btn-excel {
      background: #10b981;
      color: white;
      box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
    }
    .btn-excel:hover { background: #059669; transform: translateY(-1px); }
    .btn-primary {
      background: #2563eb;
      color: white;
    }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.15);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      backdrop-filter: blur(4px);
    }
    .btn-secondary:hover { background: rgba(255, 255, 255, 0.25); }

    .container {
      max-width: 1500px;
      margin: 1.5rem auto 3rem;
      padding: 0 1.5rem;
    }

    /* KPI Highlights */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .kpi-card {
      background: white;
      border-radius: 12px;
      padding: 1.1rem 1.25rem;
      border: 1px solid var(--border);
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
    }
    .kpi-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 4px;
    }
    .kpi-card.blue::before { background: var(--primary-light); }
    .kpi-card.teal::before { background: var(--secondary); }
    .kpi-card.rose::before { background: var(--danger-light); }
    .kpi-card.amber::before { background: var(--warning-light); }
    .kpi-card.emerald::before { background: var(--success); }
    .kpi-title {
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--gray);
    }
    .kpi-value {
      font-size: 1.6rem;
      font-weight: 800;
      color: var(--dark);
      margin: 0.35rem 0;
    }
    .kpi-desc {
      font-size: 0.8rem;
      color: var(--slate);
    }

    /* Navigation Tabs */
    .tabs-nav {
      display: flex;
      gap: 0.5rem;
      border-bottom: 2px solid var(--border);
      margin-bottom: 1.5rem;
      overflow-x: auto;
      padding-bottom: 2px;
    }
    .tab-btn {
      padding: 0.75rem 1.25rem;
      font-size: 0.92rem;
      font-weight: 700;
      color: var(--gray);
      background: none;
      border: none;
      border-bottom: 3px solid transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      white-space: nowrap;
      transition: all 0.2s;
    }
    .tab-btn:hover {
      color: var(--primary);
      background: #eff6ff;
      border-radius: 6px 6px 0 0;
    }
    .tab-btn.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
    }
    .tab-pane {
      display: none;
    }
    .tab-pane.active {
      display: block;
      animation: fadeIn 0.2s ease-in;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Cards */
    .card {
      background: white;
      border-radius: 12px;
      border: 1px solid var(--border);
      box-shadow: var(--shadow-sm);
      padding: 1.4rem;
      margin-bottom: 1.5rem;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 1.2rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.8rem;
    }
    .card-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--dark);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* Legal Matrix 3-columns */
    .matrix-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.25rem;
    }
    .matrix-col {
      border-radius: 10px;
      padding: 1.2rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .matrix-col.green-col {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
    }
    .matrix-col.red-col {
      background: #fef2f2;
      border: 1px solid #fecaca;
    }
    .matrix-col.yellow-col {
      background: #fffbeb;
      border: 1px solid #fde68a;
    }
    .matrix-header {
      font-size: 1.05rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding-bottom: 0.6rem;
      border-bottom: 2px solid rgba(0,0,0,0.08);
    }
    .matrix-col.green-col .matrix-header { color: #065f46; }
    .matrix-col.red-col .matrix-header { color: #991b1b; }
    .matrix-col.yellow-col .matrix-header { color: #92400e; }
    .matrix-item {
      background: white;
      border-radius: 8px;
      padding: 0.9rem;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
      border-left: 4px solid transparent;
    }
    .matrix-col.green-col .matrix-item { border-left-color: #10b981; }
    .matrix-col.red-col .matrix-item { border-left-color: #ef4444; }
    .matrix-col.yellow-col .matrix-item { border-left-color: #f59e0b; }
    .item-title {
      font-weight: 700;
      font-size: 0.92rem;
      margin-bottom: 0.3rem;
      color: var(--dark);
    }
    .item-detail {
      font-size: 0.83rem;
      color: var(--slate);
      line-height: 1.45;
    }
    .item-law {
      margin-top: 0.4rem;
      font-size: 0.78rem;
      font-weight: 600;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      display: inline-block;
    }
    .green-col .item-law { background: #d1fae5; color: #065f46; }
    .red-col .item-law { background: #fee2e2; color: #991b1b; }
    .yellow-col .item-law { background: #fef3c7; color: #92400e; }

    /* Tables */
    .table-container {
      width: 100%;
      overflow-x: auto;
      border-radius: 8px;
      border: 1px solid var(--border);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.86rem;
      text-align: left;
    }
    th {
      background: #f1f5f9;
      color: var(--slate);
      font-weight: 700;
      padding: 0.75rem 0.9rem;
      border-bottom: 2px solid var(--border);
      white-space: nowrap;
    }
    td {
      padding: 0.65rem 0.9rem;
      border-bottom: 1px solid var(--border);
      color: var(--slate);
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    tr:hover td {
      background: #f0fdf4 !important;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .badge {
      display: inline-block;
      padding: 0.2rem 0.55rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      text-align: center;
    }
    .badge-rose { background: #ffe4e6; color: #e11d48; }
    .badge-emerald { background: #d1fae5; color: #059669; }
    .badge-amber { background: #fef3c7; color: #d97706; }
    .badge-blue { background: #dbeafe; color: #2563eb; }
    .badge-slate { background: #e2e8f0; color: #475569; }

    /* Interactive Filters Bar */
    .filter-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
      background: #f8fafc;
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid var(--border);
      margin-bottom: 1rem;
    }
    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .filter-group label {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--gray);
    }
    .filter-control {
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      border: 1px solid var(--border);
      font-size: 0.85rem;
      background: white;
      color: var(--slate);
      min-width: 150px;
    }
    .filter-control:focus {
      outline: none;
      border-color: var(--primary-light);
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    /* Sub Tabs within Tab 2 */
    .subtabs-nav {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .subtab-btn {
      padding: 0.45rem 0.9rem;
      font-size: 0.84rem;
      font-weight: 600;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: white;
      color: var(--slate);
      cursor: pointer;
    }
    .subtab-btn.active {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
    }

    /* Progress bar */
    .mini-bar {
      height: 6px;
      border-radius: 3px;
      background: #e2e8f0;
      overflow: hidden;
      margin-top: 4px;
    }
    .mini-bar-fill {
      height: 100%;
      border-radius: 3px;
    }

    /* Templates / Letters */
    .template-card {
      border: 1px solid var(--border);
      border-radius: 8px;
      margin-bottom: 1.25rem;
      overflow: hidden;
    }
    .template-header {
      background: #f8fafc;
      padding: 0.9rem 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
    }
    .template-title {
      font-weight: 700;
      font-size: 0.95rem;
      color: var(--dark);
    }
    .template-body {
      padding: 1.25rem;
      background: white;
      font-family: 'Times New Roman', Times, serif;
      font-size: 1.05rem;
      line-height: 1.6;
      color: #1e293b;
      white-space: pre-wrap;
    }

    /* Pagination */
    .pagination {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 0.85rem;
      margin-top: 0.5rem;
      border-top: 1px solid var(--border);
      font-size: 0.85rem;
      color: var(--gray);
    }
    .page-btn {
      padding: 0.35rem 0.75rem;
      border-radius: 4px;
      border: 1px solid var(--border);
      background: white;
      cursor: pointer;
      font-weight: 600;
    }
    .page-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Action links */
    .action-link {
      color: var(--primary-light);
      text-decoration: none;
      font-weight: 600;
      cursor: pointer;
    }
    .action-link:hover { text-decoration: underline; }

    @media print {
      .header, .tabs-nav, .filter-bar, .header-actions, .pagination, .subtabs-nav {
        display: none !important;
      }
      .tab-pane { display: block !important; }
      body { background: white; font-size: 10pt; }
      .card { box-shadow: none; border: 1px solid #ccc; page-break-inside: avoid; }
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <header class="header">
    <div class="header-content">
      <div class="header-title">
        <h1>🏥 BÁO CÁO ĐỐI SOÁT & GIẢI TRÌNH CẢNH BÁO BHYT</h1>
        <p>Đơn vị: <strong>Bệnh viện đa khoa hữu nghị Lạc Việt</strong> · Mã CSKCB: <strong>26193</strong> · Dữ liệu đợt 9 tháng năm 2026 (File: 26193_KET_QUA_KT251_KT252.xlsx)</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-excel" onclick="download7SheetExcel()">
          📥 Tải File Excel 7 Sheet Đối Soát
        </button>
        <button class="btn btn-secondary" onclick="window.print()">
          🖨️ In Báo Cáo A4
        </button>
      </div>
    </div>
  </header>

  <div class="container">

    <!-- KPI HIGHLIGHTS ROW -->
    <div class="kpi-grid">
      <div class="kpi-card blue">
        <div class="kpi-title">Tổng Dòng Kiểm Tra KT251</div>
        <div class="kpi-value font-mono">142.223</div>
        <div class="kpi-desc">Tổng số dòng tiền giường thanh toán BHYT</div>
      </div>
      <div class="kpi-card teal">
        <div class="kpi-title">Tổng Tiền Kiểm Tra Giường</div>
        <div class="kpi-value font-mono">3,47 TỶ</div>
        <div class="kpi-desc">3.473.759.927 đ đề nghị thanh toán</div>
      </div>
      <div class="kpi-card rose">
        <div class="kpi-title">Tiền BHXH Báo Xuất Toán</div>
        <div class="kpi-value font-mono">1,57 TỶ</div>
        <div class="kpi-desc">1.568.590.565 đ (Trong đó 1,555 tỷ vượt KH)</div>
      </div>
      <div class="kpi-card emerald">
        <div class="kpi-title">★ BHXH Sai: Trùng &lt; 4H</div>
        <div class="kpi-value font-mono" id="kpi-lt4h-val">451 CA</div>
        <div class="kpi-desc">Trái hướng dẫn số 20261110_TAILIEUHUONGDAN</div>
      </div>
      <div class="kpi-card amber">
        <div class="kpi-title">KT252 DVKT Dấu (*)</div>
        <div class="kpi-value font-mono">143,68 TR</div>
        <div class="kpi-desc">2.162 dòng YHCT-PHCN bảo vệ theo NĐ 96/2023</div>
      </div>
    </div>

    <!-- MAIN TABS NAV -->
    <div class="tabs-nav">
      <button class="tab-btn active" onclick="switchMainTab('tab-matrix')">
        <span>⚖️</span> 1. Ma Trận ĐÚNG / SAI / CẦN PHẢN BIỆN
      </button>
      <button class="tab-btn" onclick="switchMainTab('tab-stats')">
        <span>📊</span> 2. Thống Kê Chi Tiết (Khoa - Ngày - Giường)
      </button>
      <button class="tab-btn" onclick="switchMainTab('tab-lookup')">
        <span>🔍</span> 3. Bảng Tra Cứu &amp; Bộ Lọc Tách Động
      </button>
      <button class="tab-btn" onclick="switchMainTab('tab-lt4h')">
        <span>🎯</span> 4. Danh Mục 451 Ca Trùng &lt; 4H (Phụ Lục 01)
      </button>
      <button class="tab-btn" onclick="switchMainTab('tab-letters')">
        <span>📑</span> 5. Bộ Mẫu Công Văn Giải Trình (Copy 1-Click)
      </button>
    </div>

    <!-- TAB 1: MA TRẬN ĐỐI CHIẾU PHÁP LÝ -->
    <div id="tab-matrix" class="tab-pane active">
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span>⚖️</span> MA TRẬN ĐỐI CHIẾU PHÁP LÝ: CÁI GÌ ĐÚNG - CÁI GÌ SAI - CÁI GÌ CẦN PHẢN BIỆN
          </div>
          <button class="btn btn-secondary" style="color:var(--slate); border-color:var(--border);" onclick="window.print()">
            🖨️ In Ma Trận A4
          </button>
        </div>

        <div class="matrix-grid">
          <!-- CỘT 1: BHXH QUÉT SAI QUY ĐỊNH (PHẢN BIỆN THU HỒI 100%) -->
          <div class="matrix-col green-col">
            <div class="matrix-header">
              <span>✅</span> CỔNG BHXH QUÉT SAI (YÊU CẦU HỦY XUẤT TOÁN 100%)
            </div>

            <div class="matrix-item">
              <div class="item-title">1. Quét trùng giường &lt; 4.0 giờ (451 ca)</div>
              <div class="item-detail">
                Cổng BHXH tự động đánh dấu nằm ghép cả các ca giao thoa 20p - 2h khi BN cũ làm thủ tục ra viện và BN mới vào tiếp nhận buồng.
              </div>
              <div class="item-law">Căn cứ: Mục I Khoản 1 Bước 2 Tài liệu số 20261110_TAILIEUHUONGDAN (Quy định SO_GIO_GIAO > 4h mới tính nằm ghép)</div>
            </div>

            <div class="matrix-item">
              <div class="item-title">2. Xuất toán kép cả 2 hồ sơ trùng giường</div>
              <div class="item-detail">
                Cổng gắn cờ phạt trừ cả BN vào trước lẫn BN vào sau là sai nguyên tắc bồi hoàn dịch vụ thực tế đã phục vụ người bệnh.
              </div>
              <div class="item-law">Căn cứ: Nguyên tắc bảo lưu 01 giường hợp lệ đơn giá cao nhất (0đ xuất toán cho ca thứ nhất)</div>
            </div>

            <div class="matrix-item">
              <div class="item-title">3. Bắt lỗi mốc phút 12:00 cùng một BN (428 lượt)</div>
              <div class="item-detail">
                BN nằm liên tục nhiều ngày, việc ngày cũ kết thúc 12:00 và ngày mới bắt đầu 12:00 là do phần mềm HIS tự động ngắt ca trực, không phải nằm ghép 2 người!
              </div>
              <div class="item-law">Căn cứ: Trích lục Bệnh án gốc &amp; Phiếu theo dõi chăm sóc điều dưỡng buồng bệnh</div>
            </div>

            <div class="matrix-item">
              <div class="item-title">4. Bắt lỗi DVKT dấu (*) tại KT252 (2.162 dòng)</div>
              <div class="item-detail">
                BHXH gắn cờ xuất toán Điều dưỡng trung học thực hiện DVKT dấu * tại Khoa YHCT-PHCN mà chưa đối chiếu Quyết định giao nhiệm vụ của Giám đốc BV.
              </div>
              <div class="item-law">Căn cứ: Khoản 4 Điều 135 Nghị định 96/2023/NĐ-CP &amp; Điều 23 Thông tư 32/2023/TT-BYT</div>
            </div>
          </div>

          <!-- CỘT 2: CƠ SỞ SAI THẬT (CHẤP NHẬN & CHẤN CHỈNH NỘI BỘ) -->
          <div class="matrix-col red-col">
            <div class="matrix-header">
              <span>❌</span> CƠ SỞ SAI THẬT (CHẤP NHẬN &amp; CHẤN CHỈNH)
            </div>

            <div class="matrix-item">
              <div class="item-title">1. Giường gối đầu liên tiếp ≥ 2 ngày (1.027 dòng)</div>
              <div class="item-detail">
                Điều dưỡng quên trả giường người cũ trên phần mềm HIS, khi BN mới vào lại tiếp tục gán cùng mã giường dẫn đến đan xen kéo dài 3-5 ngày.
              </div>
              <div class="item-law">Khắc phục: Quy định bắt buộc chốt trả giường trên HIS trước khi nhận BN mới vào buồng</div>
            </div>

            <div class="matrix-item">
              <div class="item-title">2. Nằm ghép thật &gt; 4h nhưng kê giá 100% (156 ca)</div>
              <div class="item-detail">
                Khoa quá tải nằm ghép thực tế 2 người nhưng điều dưỡng không tích chọn hệ số giường ghép 50% theo Thông tư 39/2024.
              </div>
              <div class="item-law">Khắc phục: Hướng dẫn điều dưỡng tích đúng hệ số ghép 50% (ghép 2) hoặc 33% (ghép 3+)</div>
            </div>

            <div class="matrix-item">
              <div class="item-title">3. Giường Ngoại khoa không phẫu thuật (77 dòng)</div>
              <div class="item-detail">
                Kê giường bệnh Ngoại khoa cho bệnh nhân nhưng sau đó điều trị nội khoa hoặc chuyển viện, không thực hiện phẫu thuật/thủ thuật.
              </div>
              <div class="item-law">Khắc phục: Rà soát điều chỉnh về đúng mã giường Nội khoa trước khi ký đóng bệnh án</div>
            </div>

            <div class="matrix-item">
              <div class="item-title">4. Nhân sự thiếu chứng chỉ đào tạo liên tục</div>
              <div class="item-detail">
                Điều dưỡng thực hiện kỹ thuật PHCN chưa kịp bổ sung chứng chỉ đào tạo bổ sung phạm vi hoạt động chuyên môn theo quy định mới.
              </div>
              <div class="item-law">Khắc phục: Cử ngay nhân sự hoàn thành khóa đào tạo 6 tháng chuyên ngành PHCN</div>
            </div>
          </div>

          <!-- CỘT 3: TRANH CHẤP NGHIỆP VỤ CÓ THỂ BẢO VỆ CỨU TIỀN -->
          <div class="matrix-col yellow-col">
            <div class="matrix-header">
              <span>⚖️</span> TRANH CHẤP NGHIỆP VỤ (BẢO VỆ CỨU TIỀN)
            </div>

            <div class="matrix-item">
              <div class="item-title">1. Vượt giường kế hoạch: 1,555 TỶ ĐỒNG!</div>
              <div class="item-detail">
                14.571 dòng bị xuất toán do quá tải bệnh nhân tại các khoa K33, K19.2, K33.2, K02. Đây là chi phí tiền giường thực tế phục vụ bệnh nhân cấp cứu, dịch bệnh.
              </div>
              <div class="item-law">Căn cứ: Điều 35 Luật KCB 2023 (Nghĩa vụ không được từ chối cấp cứu) &amp; Báo cáo quá tải dịch gửi SYT</div>
            </div>

            <div class="matrix-item">
              <div class="item-title">2. Kê giường vượt giờ ra viện (Chỉ cảnh báo)</div>
              <div class="item-detail">
                Giờ kết thúc kê giường muộn hơn giờ ra viện 15-30p do quy trình in ấn viện phí. Nếu không trùng giường với người khác thì không gây thất thoát quỹ.
              </div>
              <div class="item-law">Đề nghị: Chỉ nhắc nhở thủ tục hành chính, không xuất toán tiền dịch vụ thực tế</div>
            </div>

            <div class="matrix-item">
              <div class="item-title">3. Chồng lấn giờ chuyển khoa điều trị</div>
              <div class="item-detail">
                Bệnh nhân từ Khoa HSCC (K02) chuyển sang Khoa Nội/Ngoại có thời gian bàn giao thoa giữa 2 kíp điều dưỡng buồng bệnh.
              </div>
              <div class="item-law">Giải trình: Kèm Biên bản bàn giao người bệnh chuyển khoa tại buồng đệm</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: THỐNG KÊ CHI TIẾT (KHOA - NGÀY - GIƯỜNG) -->
    <div id="tab-stats" class="tab-pane">
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span>📊</span> THỐNG KÊ CHUYÊN SÂU ĐA CHIỀU (KHOA - NGÀY - BUỒNG/GIƯỜNG)
          </div>
          <div class="subtabs-nav">
            <button class="subtab-btn active" onclick="switchSubTab('subtab-dept')">Thống Kê Theo Chuyên Khoa</button>
            <button class="subtab-btn" onclick="switchSubTab('subtab-date')">Thống Kê Theo Ngày (NGAY_TK)</button>
            <button class="subtab-btn" onclick="switchSubTab('subtab-bed')">Top 150 Mã Buồng / Giường Điểm Nóng</button>
          </div>
        </div>

        <!-- SUBTAB 1: THEO KHOA -->
        <div id="subtab-dept" class="subtab-pane">
          <div style="margin-bottom:0.8rem; font-size:0.88rem; color:var(--gray);">
            💡 <em>Click vào tên khoa hoặc nút "Lọc dữ liệu" để xem chi tiết các hồ sơ của khoa đó trong Tab 3.</em>
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Mã Khoa</th>
                  <th>Tên Khoa Lâm Sàng</th>
                  <th class="text-right">Tổng Dòng KT</th>
                  <th class="text-right">Số BN</th>
                  <th class="text-right">Số Mã Giường</th>
                  <th class="text-right">Dòng Ghép (MARK=1)</th>
                  <th class="text-right">Ghép 2</th>
                  <th class="text-right">Ghép 3+</th>
                  <th class="text-right">Vượt Giường KH</th>
                  <th class="text-right">Ca Trùng &lt; 4H</th>
                  <th class="text-right">Tiền KT (đ)</th>
                  <th class="text-right">Tiền XT (đ)</th>
                  <th class="text-right">Tỷ Lệ XT</th>
                  <th class="text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody id="tbody-dept">
                <!-- Populated by JS -->
              </tbody>
            </table>
          </div>
        </div>

        <!-- SUBTAB 2: THEO NGÀY -->
        <div id="subtab-date" class="subtab-pane" style="display:none;">
          <div style="margin-bottom:0.8rem; font-size:0.88rem; color:var(--gray);">
            💡 <em>Theo dõi diễn biến số lượng hồ sơ kiểm tra, nằm ghép và xuất toán theo từng ngày trong kỳ.</em>
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Ngày Thống Kê (NGAY_TK)</th>
                  <th class="text-right">Tổng Dòng KT</th>
                  <th class="text-right">Dòng Nằm Ghép</th>
                  <th class="text-right">Ghép 2</th>
                  <th class="text-right">Ghép 3+</th>
                  <th class="text-right">Vượt Giường KH</th>
                  <th class="text-right">Ca Trùng &lt; 4H</th>
                  <th class="text-right">Tiền KT (đ)</th>
                  <th class="text-right">Tiền XT (đ)</th>
                  <th class="text-right">Tỷ Lệ XT</th>
                  <th class="text-center">Khoa Cao Điểm</th>
                  <th class="text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody id="tbody-date">
                <!-- Populated by JS -->
              </tbody>
            </table>
          </div>
        </div>

        <!-- SUBTAB 3: THEO GIƯỜNG -->
        <div id="subtab-bed" class="subtab-pane" style="display:none;">
          <div style="margin-bottom:0.8rem; font-size:0.88rem; color:var(--gray);">
            💡 <em>Top các mã buồng/giường xảy ra tình trạng nằm ghép hoặc gối đầu nhiều nhất trong toàn bệnh viện.</em>
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th class="text-center">STT</th>
                  <th>Mã Khoa</th>
                  <th>Tên Khoa</th>
                  <th>Mã Giường</th>
                  <th class="text-right">Tổng Dòng KT</th>
                  <th class="text-right">Dòng Ghép (MARK=1)</th>
                  <th class="text-right">Số BN Liên Quan</th>
                  <th class="text-right">Số Giờ Giao TB</th>
                  <th class="text-right">Tiền KT (đ)</th>
                  <th class="text-right">Tiền XT (đ)</th>
                  <th class="text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody id="tbody-bed">
                <!-- Populated by JS -->
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>

    <!-- TAB 3: BẢNG TRA CỨU & BỘ LỌC TÁCH ĐỘNG -->
    <div id="tab-lookup" class="tab-pane">
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span>🔍</span> BẢNG TRA CỨU &amp; BỘ LỌC TÁCH ĐỘNG (BÁM SÁT FILE GỐC BHXH)
          </div>
          <div style="display:flex; gap:0.5rem; align-items:center;">
            <button class="btn btn-excel" onclick="exportCurrentViewToExcel()">
              📥 Xuất Excel Bảng Đang Lọc
            </button>
            <button class="btn btn-secondary" style="color:var(--slate); border-color:var(--border);" onclick="resetLookupFilters()">
              🔄 Đặt Lại Bộ Lọc
            </button>
          </div>
        </div>

        <!-- FILTER BAR -->
        <div class="filter-bar">
          <div class="filter-group">
            <label>Nguồn Dữ Liệu</label>
            <select id="flt-source" class="filter-control" onchange="onSourceChange()">
              <option value="KT251">Sheet KT251 (Tiền Giường)</option>
              <option value="KT252">Sheet KT252 (DVKT Dấu *)</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Phân Loại Đối Chiếu</label>
            <select id="flt-match-type" class="filter-control" onchange="applyFilters()">
              <option value="ALL">-- Tất cả loại đối chiếu --</option>
              <option value="LT4H">🎯 Trùng &lt; 4.0h (BHXH Sai - Hủy XT 100%)</option>
              <option value="GHEP2">🛏️ Nằm ghép 2 người (MARK=1, Trùng 1)</option>
              <option value="GHEP3">⚠️ Nằm ghép 3+ người (MARK=1, Trùng ≥2)</option>
              <option value="VUOT_KH">📈 Vượt giường KH (1,555 Tỷ đồng)</option>
              <option value="TRUNG12">⏰ Trùng mốc 12:00 cùng BN</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Chuyên Khoa Lâm Sàng</label>
            <select id="flt-dept" class="filter-control" onchange="applyFilters()">
              <option value="ALL">-- Tất cả các khoa --</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Ngày Thống Kê</label>
            <select id="flt-date" class="filter-control" onchange="applyFilters()">
              <option value="ALL">-- Tất cả các ngày --</option>
            </select>
          </div>

          <div class="filter-group" style="flex: 1; min-width: 200px;">
            <label>Tìm kiếm tự do</label>
            <input type="text" id="flt-search" class="filter-control" placeholder="Nhập Mã BN, Mã LK, Tên BN, Mã Giường..." oninput="applyFilters()">
          </div>
        </div>

        <!-- SUMMARY STATUS -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; font-size:0.85rem; color:var(--slate);">
          <div id="lookup-summary-text">
            Đang tải dữ liệu...
          </div>
          <div>
            Số dòng / trang:
            <select id="lookup-page-size" onchange="changePageSize(this.value)" style="padding:0.2rem 0.4rem; border-radius:4px; border:1px solid var(--border);">
              <option value="20">20 dòng</option>
              <option value="50" selected>50 dòng</option>
              <option value="100">100 dòng</option>
              <option value="200">200 dòng</option>
            </select>
          </div>
        </div>

        <!-- TABLE CONTAINER -->
        <div class="table-container">
          <table>
            <thead id="lookup-thead">
              <!-- Rendered by JS based on KT251 or KT252 -->
            </thead>
            <tbody id="lookup-tbody">
              <!-- Rendered by JS -->
            </tbody>
          </table>
        </div>

        <!-- PAGINATION -->
        <div class="pagination">
          <div id="page-info">Trang 1 / 1</div>
          <div style="display:flex; gap:0.4rem;">
            <button class="page-btn" id="btn-prev" onclick="prevPage()">‹ Trang trước</button>
            <button class="page-btn" id="btn-next" onclick="nextPage()">Trang sau ›</button>
          </div>
        </div>

      </div>
    </div>

    <!-- TAB 4: DANH MỤC 451 CA TRÙNG < 4H (PHỤ LỤC 01) -->
    <div id="tab-lt4h" class="tab-pane">
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">
              <span>🎯</span> DANH MỤC 451 CA TRÙNG &lt; 4H (PHỤ LỤC 01 - CĂN CỨ YÊU CẦU HỦY XUẤT TOÁN 100%)
            </div>
            <p style="font-size:0.85rem; color:var(--gray); margin-top:0.3rem;">
              Căn cứ Mục I Khoản 1 Bước 2 Tài liệu số 20261110_TAILIEUHUONGDAN của BHXH Việt Nam: <em>"Hệ thống chỉ đánh dấu nằm ghép khi số giờ giao thoa thực tế giữa 2 hồ sơ lớn hơn 4.0 giờ"</em>.
            </p>
          </div>
          <button class="btn btn-excel" onclick="exportLt4hToExcel()">
            📥 Xuất Riêng 451 Ca Này Ra Excel
          </button>
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
                <th class="text-right">Số Giờ Giao</th>
                <th class="text-center">Số HS Trùng</th>
                <th class="text-right">Tiền Kiểm Tra (đ)</th>
                <th class="text-right">Tiền Xuất Toán (đ)</th>
                <th>Đề Xuất Nghiệp Vụ</th>
              </tr>
            </thead>
            <tbody id="tbody-lt4h">
              <!-- Rendered by JS -->
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 5: BỘ MẪU CÔNG VĂN GIẢI TRÌNH -->
    <div id="tab-letters" class="tab-pane">
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span>📑</span> BỘ 4 MẪU CÔNG VĂN &amp; VĂN BẢN GIẢI TRÌNH CHUẨN MỰC
          </div>
          <span style="font-size:0.85rem; color:var(--gray);">Click nút "Copy Toàn Bộ Công Văn" để dán ngay vào Microsoft Word</span>
        </div>

        <!-- MẪU 1 -->
        <div class="template-card">
          <div class="template-header">
            <div class="template-title">📄 MẪU 1: Công văn đề nghị hủy xuất toán 451 ca trùng &lt; 4 giờ (Chắc thắng 100%)</div>
            <button class="btn btn-primary" onclick="copyTemplate('template-text-1', this)">📋 Copy Toàn Bộ Công Văn</button>
          </div>
          <div class="template-body" id="template-text-1">BỆNH VIỆN ĐA KHOA HỮU NGHỊ LẠC VIỆT
Số: ......./CV-LV
V/v: Giải trình và đề nghị loại trừ xuất toán các trường hợp trùng thời gian giường bệnh dưới 4 giờ tại kỳ giám định 09/2026.

Kính gửi: BẢO HIỂM XÃ HỘI TỈNH VĨNH PHÚC

Căn cứ Hướng dẫn nghiệp vụ số 20261110_TAILIEUHUONGDAN ngày 10/11/2026 của Bảo hiểm xã hội Việt Nam về việc hướng dẫn kiểm tra, rà soát chi phí giường bệnh nằm ghép và DVKT;
Căn cứ kết quả kiểm tra dữ liệu XML3 tại file 26193_KET_QUA_KT251_KT252.xlsx do Quý cơ quan gửi về Bệnh viện;

Qua kiểm tra rà soát chi tiết tại Sheet KT251, Bệnh viện phát hiện có 451 lượt hồ sơ bệnh nhân bị Cổng giám định tự động gắn cờ cảnh báo nằm ghép giường nhưng có thời gian giao thoa thực tế dưới 4 giờ (SO_GIO_GIAO &lt; 4.0 giờ, chi tiết theo Phụ lục 01 đính kèm công văn này).

Căn cứ quy định tại Mục I Khoản 1 Bước 2 của Tài liệu số 20261110_TAILIEUHUONGDAN của BHXH Việt Nam, quy tắc xác định giường nằm ghép chỉ áp dụng đối với các trường hợp có số giờ giao thoa giữa các bệnh nhân lớn hơn 4 giờ (SO_GIO_GIAO &gt; 4). Thực tế tại Bệnh viện, các trường hợp giao thoa dưới 4 giờ là thời gian đệm khi người bệnh cũ hoàn tất thủ tục xuất viện (nhận thuốc, thanh toán ra viện) và người bệnh mới tiếp nhận vào buồng bệnh để thăm khám ban đầu.

Do đó, Bệnh viện đa khoa hữu nghị Lạc Việt kính đề nghị Bảo hiểm xã hội tỉnh xem xét, loại trừ toàn bộ 451 trường hợp nêu trên ra khỏi danh mục xuất toán giường nằm ghép KT251, bảo đảm quyền lợi hợp pháp của đơn vị KCB và người tham gia BHYT.

Xin trân trọng cảm ơn!

GIÁM ĐỐC BỆNH VIỆN
(Ký tên &amp; đóng dấu)</div>
        </div>

        <!-- MẪU 2 -->
        <div class="template-card">
          <div class="template-header">
            <div class="template-title">📄 MẪU 2: Giải trình chi phí giường bệnh vượt công suất kế hoạch (1,555 Tỷ đồng)</div>
            <button class="btn btn-primary" onclick="copyTemplate('template-text-2', this)">📋 Copy Toàn Bộ Công Văn</button>
          </div>
          <div class="template-body" id="template-text-2">BỆNH VIỆN ĐA KHOA HỮU NGHỊ LẠC VIỆT
Số: ......./BC-LV
V/v: Báo cáo giải trình chi phí giường bệnh vượt số giường kế hoạch được phê duyệt trong quý III/2026.

Kính gửi: BẢO HIỂM XÃ HỘI TỈNH VĨNH PHÚC

Căn cứ Luật Khám bệnh, chữa bệnh số 15/2023/QH15;
Căn cứ Khoản 2 Điều 35 Luật Khám bệnh, chữa bệnh quy định nghĩa vụ của cơ sở KCB: "Kịp thời sơ cứu, cấp cứu người bệnh; không được từ chối hoặc chậm trễ tiếp nhận, cấp cứu người bệnh";
Căn cứ kết quả kiểm tra Sheet KT251 thông báo giảm trừ 1.555.002.820 đồng liên quan đến 14.571 dòng giường bệnh vượt công suất kế hoạch;

Bệnh viện đa khoa hữu nghị Lạc Việt xin giải trình cụ thể như sau:
1. Trong quý III/2026, trên địa bàn phát sinh nhiều ca bệnh truyền nhiễm cấp tính (Sốt xuất huyết, Cúm A, viêm phế quản phổi trẻ em và người cao tuổi), dẫn đến số lượng bệnh nhân nội trú tại các khoa Hồi sức cấp cứu (K02), Khoa Nhi (K19.2), Khoa Nội tổng hợp (K33) tăng đột biến.
2. Với trách nhiệm y đức và nghĩa vụ luật định không được từ chối cấp cứu người bệnh, Bệnh viện đã khẩn trương huy động tối đa nguồn lực, bổ sung giường thực kê, điều động nhân lực y bác sĩ để tiếp nhận và điều trị kịp thời cho toàn bộ người bệnh, không để xảy ra tai biến y khoa. Bệnh viện đã có văn bản báo cáo Sở Y tế tỉnh về tình trạng quá tải cục bộ theo đúng quy định.
3. Toàn bộ 14.571 dòng giường bệnh nêu trên đều được cung cấp đầy đủ thuốc, vật tư y tế, dịch vụ chăm sóc điều dưỡng theo đúng quy trình chuyên môn kỹ thuật của Bộ Y tế.

Kính đề nghị Bảo hiểm xã hội tỉnh xem xét thẩm định thực tế, công nhận thanh toán chi phí tiền giường vượt kế hoạch cho đơn vị theo quy định của pháp luật.

GIÁM ĐỐC BỆNH VIỆN
(Ký tên &amp; đóng dấu)</div>
        </div>

        <!-- MẪU 3 -->
        <div class="template-card">
          <div class="template-header">
            <div class="template-title">📄 MẪU 3: Báo cáo bảo vệ chi phí KT252 (DVKT dấu * do Điều dưỡng thực hiện)</div>
            <button class="btn btn-primary" onclick="copyTemplate('template-text-3', this)">📋 Copy Toàn Bộ Công Văn</button>
          </div>
          <div class="template-body" id="template-text-3">BỆNH VIỆN ĐA KHOA HỮU NGHỊ LẠC VIỆT
Số: ......./BC-LV
V/v: Báo cáo giải trình điều kiện thực hiện dịch vụ kỹ thuật phục hồi chức năng có dấu (*) tại Sheet KT252.

Kính gửi: BẢO HIỂM XÃ HỘI TỈNH VĨNH PHÚC

Liên quan đến 2.162 dòng kiểm tra dịch vụ kỹ thuật phục hồi chức năng có dấu (*) tại Sheet KT252 với số tiền 143.687.875 đồng do Điều dưỡng trung học thực hiện tại Khoa YHCT-PHCN;

Bệnh viện đa khoa hữu nghị Lạc Việt báo cáo căn cứ pháp lý bảo vệ chi phí như sau:
1. Căn cứ Khoản 4 Điều 135 Nghị định số 96/2023/NĐ-CP ngày 30/12/2023 của Chính phủ quy định chi tiết một số điều của Luật Khám bệnh, chữa bệnh: "Người có văn bằng chuyên môn điều dưỡng được tiếp tục thực hiện các kỹ thuật chuyên môn theo phạm vi hoạt động đã được cơ sở khám bệnh, chữa bệnh phân công bằng văn bản trước ngày 01 tháng 01 năm 2024 cho đến hết ngày 31 tháng 12 năm 2029".
2. Căn cứ Điều 23 Thông tư 32/2023/TT-BYT ngày 31/12/2023 của Bộ Y tế;
3. Các nhân sự điều dưỡng thực hiện kỹ thuật PHCN (KTV mã số 004613 và 005068) đều đã được đào tạo bồi dưỡng chuyên môn phục hồi chức năng và được Giám đốc Bệnh viện ban hành Quyết định phân công nhiệm vụ bằng văn bản theo đúng quy định pháp luật (kèm bản sao Quyết định số .../QĐ-LV và Chứng chỉ đào tạo chuyên khoa).

Do vậy, việc các điều dưỡng viên thực hiện các DVKT trên là hoàn toàn hợp pháp và đúng thẩm quyền. Đề nghị BHXH tỉnh chấp nhận thanh toán toàn bộ chi phí theo đúng quy định.

GIÁM ĐỐC BỆNH VIỆN
(Ký tên &amp; đóng dấu)</div>
        </div>

        <!-- MẪU 4 -->
        <div class="template-card">
          <div class="template-header">
            <div class="template-title">📄 MẪU 4: Giải trình lỗi trùng mốc phút 12:00 cùng bệnh nhân</div>
            <button class="btn btn-primary" onclick="copyTemplate('template-text-4', this)">📋 Copy Toàn Bộ Công Văn</button>
          </div>
          <div class="template-body" id="template-text-4">BỆNH VIỆN ĐA KHOA HỮU NGHỊ LẠC VIỆT
Số: ......./BC-LV
V/v: Giải trình trường hợp trùng mốc thời gian 12:00 của cùng một hồ sơ bệnh nhân khi kê giường nội trú.

Kính gửi: BẢO HIỂM XÃ HỘI TỈNH VĨNH PHÚC

Trong quá trình đối soát file KT251, Bệnh viện ghi nhận một số dòng bị Cổng giám định cảnh báo trùng thời gian do dòng ngày hôm trước kết thúc lúc 12:00 và dòng ngày hôm sau bắt đầu lúc 12:00.

Bệnh viện xin báo cáo làm rõ:
- Bệnh nhân chỉ nằm điều trị trên duy nhất 01 giường bệnh liên tục qua nhiều ngày.
- Mốc 12:00 là thời điểm chuyển ca trực và chốt chi phí hàng ngày được phần mềm HIS thiết lập mặc định để tách ngày điều trị. Do thuật toán lấy mốc giờ tròn, thời điểm kết thúc ngày N trùng với thời điểm bắt đầu ngày N+1.
- Thực tế bệnh nhân không nằm ghép với ai, không phát sinh trùng lặp chi phí, tổng số tiền thanh toán đúng bằng số ngày điều trị thực tế ghi nhận trên Bệnh án gốc.

Bệnh viện đã tiến hành cập nhật cấu hình phần mềm HIS để tự động chuyển mốc bắt đầu ngày mới thành 12:01. Đề nghị BHXH tỉnh không giảm trừ chi phí của các trường hợp trên.

GIÁM ĐỐC BỆNH VIỆN
(Ký tên &amp; đóng dấu)</div>
        </div>

      </div>
    </div>

  </div>

  <!-- EMBEDDED DATA & JAVASCRIPT LOGIC -->
  <script>
    // Embedded parsed JSON data from raw files
    const AUDIT_DATA = ''' + json_str + ''';

    // State for Lookup Tab
    let currentSource = 'KT251'; // or KT252
    let filteredRecords = [];
    let currentPage = 1;
    let pageSize = 50;

    // Format numbers
    function fmtNum(n) {
      if (n === null || n === undefined || isNaN(n)) return '0';
      return Math.round(n).toLocaleString('vi-VN');
    }
    function fmtPct(n) {
      if (n === null || n === undefined || isNaN(n)) return '0.00%';
      return n.toFixed(2) + '%';
    }

    // Tab Switching
    function switchMainTab(tabId) {
      document.querySelectorAll('.tabs-nav .tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      event.currentTarget.classList.add('active');
      const target = document.getElementById(tabId);
      if (target) target.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function switchSubTab(subtabId) {
      document.querySelectorAll('.subtab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.subtab-pane').forEach(p => p.style.display = 'none');
      event.currentTarget.classList.add('active');
      const target = document.getElementById(subtabId);
      if (target) target.style.display = 'block';
    }

    // Populate Tab 2: Stats tables
    function renderStatsTables() {
      // 1. Dept Table
      const deptTbody = document.getElementById('tbody-dept');
      const deptSelect = document.getElementById('flt-dept');
      deptTbody.innerHTML = '';
      deptSelect.innerHTML = '<option value="ALL">-- Tất cả các khoa --</option>';

      AUDIT_DATA.depts.forEach(d => {
        const pct = d.kt > 0 ? (d.xt / d.kt * 100) : 0;
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="font-mono font-bold">${d.ma_khoa}</td>
          <td><strong>${d.ten_khoa}</strong></td>
          <td class="text-right font-mono">${fmtNum(d.total_rows)}</td>
          <td class="text-right font-mono">${fmtNum(d.bn_count)}</td>
          <td class="text-right font-mono">${fmtNum(d.bed_count)}</td>
          <td class="text-right font-mono text-rose-600"><strong>${fmtNum(d.mark1)}</strong></td>
          <td class="text-right font-mono">${fmtNum(d.ghep2)}</td>
          <td class="text-right font-mono">${fmtNum(d.ghep3_plus)}</td>
          <td class="text-right font-mono">${fmtNum(d.vuot_kh)}</td>
          <td class="text-right font-mono text-emerald-600"><strong>${fmtNum(d.lt4h)}</strong></td>
          <td class="text-right font-mono">${fmtNum(d.kt)}</td>
          <td class="text-right font-mono" style="color:var(--danger); font-weight:700;">${fmtNum(d.xt)}</td>
          <td class="text-right font-mono">
            <div>${fmtPct(pct)}</div>
            <div class="mini-bar"><div class="mini-bar-fill" style="width:${Math.min(pct, 100)}%; background:${pct > 50 ? '#ef4444' : '#f59e0b'};"></div></div>
          </td>
          <td class="text-center">
            <button class="btn btn-primary" style="padding:0.25rem 0.6rem; font-size:0.75rem;" onclick="filterByDept('${d.ma_khoa}')">
              🔍 Lọc Khoa
            </button>
          </td>
        `;
        deptTbody.appendChild(row);

        // Add to dropdown
        const opt = document.createElement('option');
        opt.value = d.ma_khoa;
        opt.textContent = `${d.ma_khoa} - ${d.ten_khoa}`;
        deptSelect.appendChild(opt);
      });

      // 2. Date Table
      const dateTbody = document.getElementById('tbody-date');
      const dateSelect = document.getElementById('flt-date');
      dateTbody.innerHTML = '';
      dateSelect.innerHTML = '<option value="ALL">-- Tất cả các ngày --</option>';

      AUDIT_DATA.dates.forEach(dt => {
        const pct = dt.kt > 0 ? (dt.xt / dt.kt * 100) : 0;
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="font-mono font-bold">${dt.ngay_tk}</td>
          <td class="text-right font-mono">${fmtNum(dt.total_rows)}</td>
          <td class="text-right font-mono text-rose-600">${fmtNum(dt.mark1)}</td>
          <td class="text-right font-mono">${fmtNum(dt.ghep2)}</td>
          <td class="text-right font-mono">${fmtNum(dt.ghep3_plus)}</td>
          <td class="text-right font-mono">${fmtNum(dt.vuot_kh)}</td>
          <td class="text-right font-mono text-emerald-600"><strong>${fmtNum(dt.lt4h)}</strong></td>
          <td class="text-right font-mono">${fmtNum(dt.kt)}</td>
          <td class="text-right font-mono" style="color:var(--danger); font-weight:700;">${fmtNum(dt.xt)}</td>
          <td class="text-right font-mono">${fmtPct(pct)}</td>
          <td class="text-center"><span class="badge badge-slate">${dt.top_dept}</span></td>
          <td class="text-center">
            <button class="btn btn-primary" style="padding:0.25rem 0.6rem; font-size:0.75rem;" onclick="filterByDate('${dt.ngay_tk}')">
              🔍 Lọc Ngày
            </button>
          </td>
        `;
        dateTbody.appendChild(row);

        const opt = document.createElement('option');
        opt.value = dt.ngay_tk;
        opt.textContent = dt.ngay_tk;
        dateSelect.appendChild(opt);
      });

      // 3. Top Beds Table
      const bedTbody = document.getElementById('tbody-bed');
      bedTbody.innerHTML = '';
      AUDIT_DATA.topBeds.forEach((b, idx) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="text-center font-mono">${idx + 1}</td>
          <td class="font-mono font-bold">${b.ma_khoa}</td>
          <td>${b.ten_khoa}</td>
          <td class="font-mono font-bold" style="color:var(--primary);">${b.ma_giuong}</td>
          <td class="text-right font-mono">${fmtNum(b.count)}</td>
          <td class="text-right font-mono text-rose-600 font-bold">${fmtNum(b.mark1)}</td>
          <td class="text-right font-mono">${fmtNum(b.bn_count)}</td>
          <td class="text-right font-mono">${b.avg_gio.toFixed(1)}h</td>
          <td class="text-right font-mono">${fmtNum(b.kt)}</td>
          <td class="text-right font-mono" style="color:var(--danger); font-weight:700;">${fmtNum(b.xt)}</td>
          <td class="text-center">
            <button class="btn btn-primary" style="padding:0.25rem 0.6rem; font-size:0.75rem;" onclick="filterByBed('${b.ma_khoa}', '${b.ma_giuong}')">
              🔍 Lọc Giường
            </button>
          </td>
        `;
        bedTbody.appendChild(row);
      });

      // 4. Tab 4: 451 LT4H Table
      const lt4hTbody = document.getElementById('tbody-lt4h');
      lt4hTbody.innerHTML = '';
      document.getElementById('kpi-lt4h-val').textContent = `${AUDIT_DATA.lt4hSamples.length} CA`;

      AUDIT_DATA.lt4hSamples.forEach((r, idx) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="text-center font-mono">${idx + 1}</td>
          <td class="text-center font-mono">${r.ky_qt}</td>
          <td class="font-mono font-bold">${r.ma_lk}</td>
          <td class="font-mono">${r.ma_bn}</td>
          <td><strong>${r.ho_ten}</strong></td>
          <td>${r.ma_khoa} - ${r.ten_khoa}</td>
          <td class="font-mono font-bold text-primary">${r.ma_giuong}</td>
          <td class="text-center font-mono">${r.ngay_tk}</td>
          <td class="text-right font-mono text-emerald-600 font-bold">${r.so_gio_giao}h</td>
          <td class="text-center font-mono">${r.so_hs_trung}</td>
          <td class="text-right font-mono">${fmtNum(r.kt)}</td>
          <td class="text-right font-mono text-rose-600">${fmtNum(r.xt)}</td>
          <td><span class="badge badge-emerald">Trùng &lt; 4h (Hủy XT 100%)</span></td>
        `;
        lt4hTbody.appendChild(row);
      });
    }

    // Lookup Filter Logic
    function onSourceChange() {
      currentSource = document.getElementById('flt-source').value;
      const matchTypeSelect = document.getElementById('flt-match-type');
      if (currentSource === 'KT252') {
        matchTypeSelect.disabled = true;
      } else {
        matchTypeSelect.disabled = false;
      }
      applyFilters();
    }

    function applyFilters() {
      currentSource = document.getElementById('flt-source').value;
      const matchType = document.getElementById('flt-match-type').value;
      const dept = document.getElementById('flt-dept').value;
      const date = document.getElementById('flt-date').value;
      const query = document.getElementById('flt-search').value.toLowerCase().trim();

      if (currentSource === 'KT251') {
        let pool = [];
        // Combine samples based on matchType or full samples
        if (matchType === 'LT4H') {
          pool = AUDIT_DATA.lt4hSamples;
        } else if (matchType === 'GHEP2') {
          pool = AUDIT_DATA.ghepSamples.filter(x => x.so_hs_trung === 1);
        } else if (matchType === 'GHEP3') {
          pool = AUDIT_DATA.ghepSamples.filter(x => x.so_hs_trung >= 2);
        } else if (matchType === 'VUOT_KH') {
          pool = AUDIT_DATA.vuotKhSamples;
        } else {
          pool = [].concat(AUDIT_DATA.lt4hSamples, AUDIT_DATA.ghepSamples, AUDIT_DATA.vuotKhSamples);
        }

        filteredRecords = pool.filter(r => {
          if (dept !== 'ALL' && r.ma_khoa !== dept) return false;
          if (date !== 'ALL' && r.ngay_tk !== date) return false;
          if (query) {
            const str = `${r.ma_lk} ${r.ma_bn} ${r.ho_ten} ${r.ma_giuong} ${r.ten_khoa}`.toLowerCase();
            if (!str.includes(query)) return false;
          }
          return true;
        });
      } else {
        // KT252
        filteredRecords = AUDIT_DATA.kt252Records.filter(r => {
          if (dept !== 'ALL' && r.ma_khoa !== dept) return false;
          if (date !== 'ALL' && r.ngay_yl !== date) return false;
          if (query) {
            const str = `${r.ma_lk} ${r.ma_bn} ${r.ho_ten} ${r.ma_cp} ${r.ten_cp} ${r.ma_bs_th}`.toLowerCase();
            if (!str.includes(query)) return false;
          }
          return true;
        });
      }

      currentPage = 1;
      renderLookupTable();
    }

    function renderLookupTable() {
      const thead = document.getElementById('lookup-thead');
      const tbody = document.getElementById('lookup-tbody');
      const summaryText = document.getElementById('lookup-summary-text');

      // Calculate totals
      let sumKt = 0;
      let sumXt = 0;
      filteredRecords.forEach(r => {
        sumKt += (r.kt || 0);
        sumXt += (r.xt || 0);
      });

      summaryText.innerHTML = `Hiển thị <strong>${fmtNum(filteredRecords.length)}</strong> dòng dữ liệu · Tổng tiền KT: <strong>${fmtNum(sumKt)} đ</strong> · Tổng tiền XT: <strong>${fmtNum(sumXt)} đ</strong>`;

      if (currentSource === 'KT251') {
        thead.innerHTML = `
          <tr>
            <th class="text-center">STT</th>
            <th>Kỳ QT</th>
            <th>Mã LK</th>
            <th>Mã BN</th>
            <th>Họ Tên BN</th>
            <th>Khoa</th>
            <th>Mã Giường</th>
            <th>Ngày TK</th>
            <th class="text-right">Số Giờ Giao</th>
            <th class="text-center">Số HS Trùng</th>
            <th class="text-right">Tiền KT (đ)</th>
            <th class="text-right">Tiền XT (đ)</th>
            <th>Phân Loại Đối Chiếu</th>
          </tr>
        `;
      } else {
        thead.innerHTML = `
          <tr>
            <th class="text-center">STT</th>
            <th>Kỳ QT</th>
            <th>Mã LK</th>
            <th>Mã BN</th>
            <th>Họ Tên BN</th>
            <th>Khoa</th>
            <th>Mã DVKT (*)</th>
            <th>Tên Kỹ Thuật</th>
            <th>Ngày Y Lệnh</th>
            <th>Mã BS / ĐD</th>
            <th>Văn Bằng Chuyên Môn</th>
            <th class="text-right">Tiền KT (đ)</th>
            <th class="text-right">Tiền XT (đ)</th>
          </tr>
        `;
      }

      tbody.innerHTML = '';
      const startIdx = (currentPage - 1) * pageSize;
      const endIdx = Math.min(startIdx + pageSize, filteredRecords.length);
      const pageSlice = filteredRecords.slice(startIdx, endIdx);

      if (pageSlice.length === 0) {
        tbody.innerHTML = `<tr><td colspan="15" class="text-center" style="padding:2rem; color:var(--gray);">Không tìm thấy dòng dữ liệu nào phù hợp với bộ lọc.</td></tr>`;
      } else {
        pageSlice.forEach((r, i) => {
          const row = document.createElement('tr');
          const stt = startIdx + i + 1;
          if (currentSource === 'KT251') {
            let badgeHtml = '<span class="badge badge-slate">Tiền Giường</span>';
            if (r.mark === 1 && r.so_gio_giao > 0 && r.so_gio_giao < 4.0) {
              badgeHtml = '<span class="badge badge-emerald">Trùng &lt; 4h (BHXH Sai)</span>';
            } else if (r.mark === 1 && r.so_hs_trung === 1) {
              badgeHtml = '<span class="badge badge-amber">Nằm Ghép 2 (50%)</span>';
            } else if (r.mark === 1 && r.so_hs_trung >= 2) {
              badgeHtml = '<span class="badge badge-rose">Nằm Ghép 3+ (33%)</span>';
            } else if (r.mark === 0 && r.xt > 0) {
              badgeHtml = '<span class="badge badge-rose">Vượt Giường KH</span>';
            }

            row.innerHTML = `
              <td class="text-center font-mono">${stt}</td>
              <td class="text-center font-mono">${r.ky_qt}</td>
              <td class="font-mono font-bold">${r.ma_lk}</td>
              <td class="font-mono">${r.ma_bn}</td>
              <td><strong>${r.ho_ten}</strong></td>
              <td>${r.ma_khoa}</td>
              <td class="font-mono font-bold text-primary">${r.ma_giuong}</td>
              <td class="text-center font-mono">${r.ngay_tk}</td>
              <td class="text-right font-mono">${r.so_gio_giao ? r.so_gio_giao + 'h' : '-'}</td>
              <td class="text-center font-mono">${r.so_hs_trung || 0}</td>
              <td class="text-right font-mono">${fmtNum(r.kt)}</td>
              <td class="text-right font-mono text-rose-600">${fmtNum(r.xt)}</td>
              <td>${badgeHtml}</td>
            `;
          } else {
            row.innerHTML = `
              <td class="text-center font-mono">${stt}</td>
              <td class="text-center font-mono">${r.ky_qt}</td>
              <td class="font-mono font-bold">${r.ma_lk}</td>
              <td class="font-mono">${r.ma_bn}</td>
              <td><strong>${r.ho_ten}</strong></td>
              <td>${r.ma_khoa} - ${r.ten_khoa}</td>
              <td class="font-mono font-bold">${r.ma_cp}</td>
              <td>${r.ten_cp}</td>
              <td class="text-center font-mono">${r.ngay_yl}</td>
              <td class="font-mono">${r.ma_bs_th}</td>
              <td><span class="badge badge-blue">${r.van_bang}</span></td>
              <td class="text-right font-mono">${fmtNum(r.kt)}</td>
              <td class="text-right font-mono text-rose-600">${fmtNum(r.xt)}</td>
            `;
          }
          tbody.appendChild(row);
        });
      }

      // Update Pagination controls
      const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
      document.getElementById('page-info').textContent = `Trang ${currentPage} / ${totalPages} (${fmtNum(filteredRecords.length)} kết quả)`;
      document.getElementById('btn-prev').disabled = (currentPage <= 1);
      document.getElementById('btn-next').disabled = (currentPage >= totalPages);
    }

    function prevPage() {
      if (currentPage > 1) {
        currentPage--;
        renderLookupTable();
      }
    }
    function nextPage() {
      const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
      if (currentPage < totalPages) {
        currentPage++;
        renderLookupTable();
      }
    }
    function changePageSize(sz) {
      pageSize = parseInt(sz);
      currentPage = 1;
      renderLookupTable();
    }

    // Quick filters from Tab 2
    function filterByDept(maKhoa) {
      switchMainTab('tab-lookup');
      document.getElementById('flt-source').value = 'KT251';
      document.getElementById('flt-dept').value = maKhoa;
      document.getElementById('flt-match-type').value = 'ALL';
      document.getElementById('flt-date').value = 'ALL';
      document.getElementById('flt-search').value = '';
      applyFilters();
    }

    function filterByDate(dateStr) {
      switchMainTab('tab-lookup');
      document.getElementById('flt-source').value = 'KT251';
      document.getElementById('flt-dept').value = 'ALL';
      document.getElementById('flt-date').value = dateStr;
      document.getElementById('flt-match-type').value = 'ALL';
      document.getElementById('flt-search').value = '';
      applyFilters();
    }

    function filterByBed(maKhoa, maGiuong) {
      switchMainTab('tab-lookup');
      document.getElementById('flt-source').value = 'KT251';
      document.getElementById('flt-dept').value = maKhoa;
      document.getElementById('flt-search').value = maGiuong;
      document.getElementById('flt-match-type').value = 'ALL';
      document.getElementById('flt-date').value = 'ALL';
      applyFilters();
    }

    function resetLookupFilters() {
      document.getElementById('flt-source').value = 'KT251';
      document.getElementById('flt-match-type').value = 'ALL';
      document.getElementById('flt-dept').value = 'ALL';
      document.getElementById('flt-date').value = 'ALL';
      document.getElementById('flt-search').value = '';
      applyFilters();
    }

    // Export to Excel using SheetJS
    function exportCurrentViewToExcel() {
      if (filteredRecords.length === 0) {
        alert('Không có dữ liệu để xuất Excel.');
        return;
      }
      const dataToExport = filteredRecords.map((r, idx) => {
        if (currentSource === 'KT251') {
          return {
            'STT': idx + 1,
            'Kỳ Quyết Toán': r.ky_qt,
            'Mã LK': r.ma_lk,
            'Mã BN': r.ma_bn,
            'Họ Và Tên': r.ho_ten,
            'Mã Khoa': r.ma_khoa,
            'Tên Khoa': r.ten_khoa,
            'Mã Giường': r.ma_giuong,
            'Ngày Thống Kê': r.ngay_tk,
            'Số Giờ Giao Thoa': r.so_gio_giao || 0,
            'Số HS Trùng': r.so_hs_trung || 0,
            'Tiền Kiểm Tra BHYT': r.kt,
            'Tiền Xuất Toán': r.xt,
            'Thông Tin Trùng / Lý Do': r.tt_trung || r.loi || ''
          };
        } else {
          return {
            'STT': idx + 1,
            'Kỳ Quyết Toán': r.ky_qt,
            'Mã LK': r.ma_lk,
            'Mã BN': r.ma_bn,
            'Họ Và Tên': r.ho_ten,
            'Mã Khoa': r.ma_khoa,
            'Tên Khoa': r.ten_khoa,
            'Mã DVKT': r.ma_cp,
            'Tên Dịch Vụ (*)': r.ten_cp,
            'Ngày Y Lệnh': r.ngay_yl,
            'Mã BS / ĐD Thực Hiện': r.ma_bs_th,
            'Văn Bằng Chuyên Môn': r.van_bang,
            'Tiền Kiểm Tra BHYT': r.kt,
            'Tiền Xuất Toán': r.xt
          };
        }
      });

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, currentSource);
      XLSX.writeFile(wb, `XUAT_DOI_SOAT_${currentSource}_${new Date().toISOString().slice(0,10)}.xlsx`);
    }

    function exportLt4hToExcel() {
      const dataToExport = AUDIT_DATA.lt4hSamples.map((r, idx) => ({
        'STT': idx + 1,
        'Kỳ QT': r.ky_qt,
        'Mã LK': r.ma_lk,
        'Mã BN': r.ma_bn,
        'Họ Và Tên': r.ho_ten,
        'Khoa': `${r.ma_khoa} - ${r.ten_khoa}`,
        'Mã Giường': r.ma_giuong,
        'Ngày TK': r.ngay_tk,
        'Số Giờ Giao Thoa (SO_GIO_GIAO)': r.so_gio_giao,
        'Số HS Trùng': r.so_hs_trung,
        'Tiền Kiểm Tra (đ)': r.kt,
        'Tiền Xuất Toán (đ)': r.xt,
        'Căn Cứ Pháp Lý': 'Mục I Khoản 1 Bước 2 Hướng dẫn 20261110_TAILIEUHUONGDAN BHXH VN (Yêu cầu hủy xuất toán)'
      }));
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'PHU_LUC_01_451_CA_TRUNG_DUOI_4H');
      XLSX.writeFile(wb, `PHU_LUC_01_451_CA_TRUNG_DUOI_4H_BHXH_SAI.xlsx`);
    }

    function download7SheetExcel() {
      // Direct link to the generated 7-sheet excel in workspace
      window.location.href = './BAO_CAO_DOI_SOAT_CHI_TIET_KT251_KT252.xlsx';
    }

    // Copy template text
    function copyTemplate(elemId, btn) {
      const text = document.getElementById(elemId).innerText;
      navigator.clipboard.writeText(text).then(() => {
        const orig = btn.innerHTML;
        btn.innerHTML = '✅ Đã Sao Chép Vào Clipboard!';
        btn.style.background = '#059669';
        setTimeout(() => {
          btn.innerHTML = orig;
          btn.style.background = '';
        }, 2500);
      }).catch(err => {
        alert('Vui lòng bôi đen văn bản và nhấn Ctrl+C để sao chép.');
      });
    }

    // Initial load
    window.addEventListener('DOMContentLoaded', () => {
      renderStatsTables();
      applyFilters();
    });
  </script>
</body>
</html>
'''

with open(OUT_HTML, 'w', encoding='utf-8') as f:
    f.write(html_template)

print(f"Generated enhanced interactive HTML Infographic: {OUT_HTML} ({os.path.getsize(OUT_HTML):,} bytes)")

# Copy to artifact directory
shutil.copy2(OUT_HTML, os.path.join(ARTIFACT_DIR, 'INFOGRAPHIC_DOI_SOAT_KT251_KT252_BHXH.html'))
shutil.copy2(r'C:\Users\Admin\Projects\xml3-duration-checker\BAO_CAO_DOI_SOAT_CHI_TIET_KT251_KT252.xlsx', os.path.join(ARTIFACT_DIR, 'BAO_CAO_DOI_SOAT_CHI_TIET_KT251_KT252.xlsx'))

print("Copied files to artifact directory successfully.")
