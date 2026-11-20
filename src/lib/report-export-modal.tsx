import { useState, useMemo } from "react";
import type { Xml3Record, PatientInfo } from "./xml3-duration";
import { formatXmlDateTime } from "./timezone";
import { SLIDE_PPTX_BASE64 } from "./slide-pptx-data";

export interface ReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: Xml3Record[];
  patients?: Map<string, PatientInfo>;
  onExportExcel?: () => void;
}

export function ReportExportModal({
  isOpen,
  onClose,
  records,
  patients,
  onExportExcel,
}: ReportExportModalProps) {
  const [hospitalName, setHospitalName] = useState<string>(() => {
    try {
      return localStorage.getItem("nsn_hospital_name") || "Bệnh viện hữu nghị Lạc Việt";
    } catch {
      return "Bệnh viện hữu nghị Lạc Việt";
    }
  });

  const handleHospitalNameChange = (name: string) => {
    setHospitalName(name);
    try {
      localStorage.setItem("nsn_hospital_name", name);
    } catch {
      // ignore
    }
  };

  // Tính toán thống kê dữ liệu thực tế từ records
  const stats = useMemo(() => {
    const totalRecords = records.length;
    const bedRecords = records.filter(
      (r) => (r.MA_NHOM || "").trim() === "14" || (r.MA_NHOM || "").trim() === "15",
    );

    const bedPatients = new Set<string>();
    let totalRefusal = 0;
    let multiDayCount = 0;
    let sharingCount = 0;
    let minuteDupCount = 0;
    let multipleBedsCount = 0;
    let missingBedCount = 0;
    let exceedDischargeCount = 0;

    const deptMap = new Map<
      string,
      {
        count: number;
        multiDay: number;
        pts: Set<string>;
        loss: number;
      }
    >();

    for (const r of bedRecords) {
      if (r.MA_LK) bedPatients.add(r.MA_LK);
      const khoa = (r.MA_KHOA || "KHOA_KHAC").trim().toUpperCase();
      let d = deptMap.get(khoa);
      if (!d) {
        d = { count: 0, multiDay: 0, pts: new Set(), loss: 0 };
        deptMap.set(khoa, d);
      }

      if (r.hasBedWarning) {
        d.count++;
        if (r.MA_LK) d.pts.add(r.MA_LK);
        const loss = r.potentialBedRefusal || Math.round((r.THANH_TIEN || 0) * 0.5);
        d.loss += loss;
        totalRefusal += loss;

        if (r.bedWarningType === "multi-day-overlap") {
          multiDayCount++;
          d.multiDay++;
        } else if (r.bedWarningType === "bed-sharing") {
          sharingCount++;
        } else if (r.bedWarningType === "minute-duplicate") {
          minuteDupCount++;
        } else if (r.bedWarningType === "multiple-beds") {
          multipleBedsCount++;
        } else if (r.bedWarningType === "missing-bed-code") {
          missingBedCount++;
        } else if (r.bedWarningType === "bed-exceeds-discharge") {
          exceedDischargeCount++;
        }
      }
    }

    const deptList = Array.from(deptMap.entries())
      .map(([khoa, data]) => ({
        khoa,
        count: data.count,
        multiDay: data.multiDay,
        patientCount: data.pts.size,
        loss: data.loss,
      }))
      .sort((a, b) => b.loss - a.loss);

    const allViolations = bedRecords.filter((r) => r.hasBedWarning);

    return {
      totalRecords,
      bedCount: bedRecords.length,
      patientCount: bedPatients.size,
      violationCount: allViolations.length,
      multiDayCount,
      sharingCount,
      minuteDupCount,
      multipleBedsCount,
      missingBedCount,
      exceedDischargeCount,
      totalRefusal,
      deptList,
      allViolations,
    };
  }, [records]);

  // Xuất Infographic HTML Tương Tác
  const handleExportInteractiveInfographic = () => {
    const todayStr = new Date().toLocaleDateString("vi-VN");
    const jsonViolations = JSON.stringify(
      stats.allViolations.map((r) => ({
        maLk: r.MA_LK,
        maBn: r.MA_BN,
        hoTen: r.HO_TEN,
        stt: r.STT,
        khoa: r.MA_KHOA,
        giuong: r.MA_GIUONG,
        ngayTh: formatXmlDateTime(r.NGAY_TH_YL) || r.NGAY_TH_YL,
        ngayKq: formatXmlDateTime(r.NGAY_KQ) || r.NGAY_KQ,
        loai:
          r.bedWarningType === "multi-day-overlap"
            ? `Gối đầu (${r.bedOverlapDaysCount || 2}N)`
            : r.bedWarningType === "minute-duplicate"
              ? "Trùng phút chuyển tiếp"
              : r.bedWarningType === "bed-exceeds-discharge"
                ? "Vượt giờ ra viện"
                : r.bedWarningType === "missing-bed-code"
                  ? "Thiếu mã giường"
                  : r.bedWarningType === "multiple-beds"
                    ? "Trùng nhiều giường cùng BN"
                    : "Giường ghép",
        typeKey: r.bedWarningType || "other",
        trung: r.MA_GIUONG_TRUNG || "—",
        chiTiet: r.detail || "",
        tienXuatToan: r.potentialBedRefusal || Math.round((r.THANH_TIEN || 0) * 0.5),
      })),
    );

    const deptRowsHtml = stats.deptList
      .slice(0, 10)
      .map(
        (d, idx) => `
        <tr class="dept-row" onclick="filterByDept('${d.khoa}')">
          <td class="text-center font-bold">${idx + 1}</td>
          <td class="font-bold text-teal-800">${d.khoa}</td>
          <td class="text-center font-bold text-rose-700">${d.count}</td>
          <td class="text-center text-amber-700 font-bold">${d.multiDay}</td>
          <td class="text-center">${d.patientCount}</td>
          <td class="text-right font-bold text-rose-800 font-mono">${d.loss.toLocaleString("vi-VN")} đ</td>
          <td class="text-center"><button class="view-btn" onclick="event.stopPropagation(); filterByDept('${d.khoa}')">🔍 Xem ca</button></td>
        </tr>
      `,
      )
      .join("");

    const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Infographic Tương Tác: Rà Soát Giường Bệnh KT251 · ${hospitalName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --navy: #0f172a;
      --teal: #0d9488;
      --rose: #e11d48;
      --amber: #d97706;
      --purple: #7c3aed;
      --bg: #f8fafc;
      --border: #e2e8f0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg); color: #1e293b; padding: 20px; line-height: 1.5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.08); overflow: hidden; border: 1px solid var(--border); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0d9488 100%); color: white; padding: 32px 40px; position: relative; }
    .badge { display: inline-block; background: rgba(13,148,136,0.3); border: 1px solid #2dd4bf; color: #5eead4; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 5px 12px; border-radius: 999px; margin-bottom: 12px; }
    .title { font-size: 26px; font-weight: 800; margin-bottom: 8px; color: white; }
    .subtitle { font-size: 14.5px; color: #cbd5e1; max-width: 900px; }
    .meta { margin-top: 16px; display: flex; flex-wrap: wrap; gap: 16px; font-size: 13px; color: #94a3b8; }
    .meta span { display: inline-flex; align-items: center; gap: 5px; }

    .content { padding: 30px 40px; display: flex; flex-direction: column; gap: 28px; }
    .section-title { font-size: 18px; font-weight: 800; color: var(--navy); display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 14px; }
    
    /* INTERACTIVE METRIC CARDS */
    .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
    .card { padding: 16px; border-radius: 12px; border: 1.5px solid var(--border); background: #fafaf9; cursor: pointer; transition: all 0.2s ease; position: relative; }
    .card:hover { transform: translateY(-3px); box-shadow: 0 6px 16px rgba(0,0,0,0.06); }
    .card.active { border-color: var(--teal); background: #f0fdfa; box-shadow: 0 0 0 2px var(--teal); }
    .card-lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; }
    .card-val { font-size: 24px; font-weight: 800; font-family: 'JetBrains Mono', monospace; margin: 4px 0; }
    .card-val.rose { color: var(--rose); }
    .card-val.amber { color: var(--amber); }
    .card-val.purple { color: var(--purple); }
    .card-val.teal { color: var(--teal); }
    .card-sub { font-size: 11.5px; color: #64748b; }
    .click-hint { font-size: 10px; font-weight: 700; color: #0d9488; margin-top: 4px; display: block; }

    /* RULES GRID */
    .rules-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .rule-box { border-radius: 12px; padding: 18px; border: 1.5px solid var(--border); background: white; }
    .rule-box.highlight { border-color: var(--teal); background: #f0fdfa; }
    .rule-box.rose-box { border-color: #fca5a5; background: #fff1f2; }
    .rule-title { font-weight: 800; font-size: 15px; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; }
    .rule-text { font-size: 13px; color: #334155; line-height: 1.5; }

    /* TABLE */
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-weight: 700; color: #334155; border-bottom: 2px solid var(--border); }
    td { padding: 9px 12px; border-bottom: 1px solid var(--border); vertical-align: top; }
    .dept-row { cursor: pointer; transition: background 0.15s; }
    .dept-row:hover { background: #f0fdfa; }
    .view-btn { background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc; border-radius: 6px; padding: 3px 8px; font-size: 11px; font-weight: 700; cursor: pointer; }
    .view-btn:hover { background: #0284c7; color: white; }

    /* INTERACTIVE VIOLATION VIEWER */
    .viewer-panel { background: #f8fafc; border: 1.5px solid var(--border); border-radius: 14px; padding: 20px; }
    .filter-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 14px; }
    .search-input { flex: 1; min-width: 200px; padding: 8px 12px; border-radius: 8px; border: 1.5px solid var(--border); font-size: 13px; }
    .reset-btn { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; border-radius: 8px; padding: 8px 14px; font-size: 12px; font-weight: 700; cursor: pointer; }
    .reset-btn:hover { background: #ef4444; color: white; }
    .table-scroll { max-height: 480px; overflow-y: auto; background: white; border-radius: 8px; border: 1px solid var(--border); }
    .tag { display: inline-block; padding: 2px 7px; border-radius: 999px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; }
    .tag.multi { background: #fee2e2; color: #991b1b; }
    .tag.minute { background: #f3e8ff; color: #6b21a8; }
    .tag.discharge { background: #ffedd5; color: #9a3412; }
    .tag.sharing { background: #fef3c7; color: #92400e; }

    .footer { background: var(--navy); color: #94a3b8; padding: 18px 40px; display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; }
    .footer strong { color: white; }
    .print-btn { background: #0d9488; color: white; border: none; border-radius: 8px; padding: 8px 16px; font-weight: 700; cursor: pointer; }
    .print-btn:hover { background: #0f766e; }

    @media print {
      body { padding: 0; background: white; }
      .container { box-shadow: none; border: none; max-width: 100%; }
      .table-scroll { max-height: none; overflow: visible; }
      .print-btn, .search-input, .reset-btn { display: none; }
    }
    @media (max-width: 768px) {
      .metric-grid, .rules-grid { grid-template-columns: 1fr; }
      .content { padding: 20px; }
      .header { padding: 24px 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">HỘI ĐỒNG CHUYÊN MÔN & QUẢN LÝ CHẤT LƯỢNG BHYT</div>
      <h1 class="title">CẨM NANG RÀ SOÁT TIỀN GIƯỜNG & GIƯỜNG NẰM GHÉP (KT251)</h1>
      <p class="subtitle">
        Báo cáo phân tích dữ liệu thực tế XML3, đối soát giường gối đầu nhiều ngày, trùng phút chuyển tiếp và kê giường vượt giờ ra viện tại <strong>${hospitalName}</strong>.
      </p>
      <div class="meta">
        <span>🏥 Đơn vị: <strong>${hospitalName}</strong></span>
        <span>📅 Ngày trích xuất: ${todayStr}</span>
        <span>👤 Chuyên viên phân tích: Nguyễn Sơn Nam (Nsnnam)</span>
        <span>🚀 Hệ thống: NsN_XMLcheck v2.16.0</span>
      </div>
    </div>

    <div class="content">
      <!-- 4 THẺ TỔNG QUAN CÓ THỂ CLICK -->
      <div>
        <div class="section-title">
          <span>🚨 TỔNG QUAN DỮ LIỆU & NGUY CƠ XUẤT TOÁN (BẤM VÀO THẺ ĐỂ LỌC CHI TIẾT)</span>
          <button class="print-btn" onclick="window.print()">🖨️ In ấn / Xuất PDF A4</button>
        </div>
        <div class="metric-grid">
          <div class="card" onclick="filterByType('all')">
            <div class="card-lbl">Nguy cơ xuất toán KT251</div>
            <div class="card-val rose">${stats.totalRefusal.toLocaleString("vi-VN")} đ</div>
            <div class="card-sub">${stats.violationCount} dòng vi phạm (${stats.patientCount} BN)</div>
            <span class="click-hint">👉 Bấm xem tất cả ca vi phạm</span>
          </div>
          <div class="card" onclick="filterByType('multi-day-overlap')">
            <div class="card-lbl">Giường gối đầu liên tiếp (≥2N)</div>
            <div class="card-val amber">${stats.multiDayCount} dòng</div>
            <div class="card-sub">Chiếm ${Math.round((stats.multiDayCount / (stats.violationCount || 1)) * 100)}% tổng số vi phạm</div>
            <span class="click-hint">👉 Bấm lọc riêng ca gối đầu</span>
          </div>
          <div class="card" onclick="filterByType('minute-duplicate')">
            <div class="card-lbl">Trùng mốc phút chuyển tiếp</div>
            <div class="card-val purple">${stats.minuteDupCount} lượt</div>
            <div class="card-sub">12:00 kết thúc ➔ 12:00 bắt đầu</div>
            <span class="click-hint">👉 Bấm lọc ca trùng phút</span>
          </div>
          <div class="card" onclick="filterByType('bed-exceeds-discharge')">
            <div class="card-lbl">Vượt thời gian ra viện</div>
            <div class="card-val teal">${stats.exceedDischargeCount} ca</div>
            <div class="card-sub">NGAY_KQ > NGAY_RA của BN</div>
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
            ${deptRowsHtml}
          </tbody>
        </table>
      </div>

      <!-- 4 QUY TẮC VÀNG -->
      <div>
        <div class="section-title">
          <span>⭐ 4 QUY TẮC VÀNG ĐIỀU DƯỠNG & BÁC SĨ CẦN TUÂN THỦ TUYỆT ĐỐI</span>
        </div>
        <div class="rules-grid">
          <div class="rule-box highlight">
            <div class="rule-title">⏱️ 1. Quy tắc 1 phút chuyển tiếp giữa 2 ngày</div>
            <div class="rule-text">Ngày trước kết thúc lúc <code>12:00</code> thì ngày tiếp theo bắt đầu từ <code>12:01</code>. Tuyệt đối không đánh trùng mốc phút (<code>12:00 ➔ 12:00</code>) vì BHYT sẽ bắt lỗi thanh toán 2 lần trong 1 phút.</div>
          </div>
          <div class="rule-box rose-box">
            <div class="rule-title">🛏️ 2. Không gán nhầm mã giường đang có bệnh nhân</div>
            <div class="rule-text">Trước khi gán giường, phải tra cứu sơ đồ buồng giường trên HIS. Không gán mã giường đang có bệnh nhân khác nằm điều trị chưa làm thủ tục ra viện/chuyển khoa.</div>
          </div>
          <div class="rule-box highlight">
            <div class="rule-title">🏥 3. Giờ kê giường không được vượt quá giờ ra viện</div>
            <div class="rule-text">Thời gian kết thúc ngày giường cuối cùng (<code>NGAY_KQ</code>) bắt buộc phải nhỏ hơn hoặc bằng thời gian ra viện của bệnh nhân (<code>NGAY_RA</code>).</div>
          </div>
          <div class="rule-box rose-box">
            <div class="rule-title">👥 4. Nằm ghép thật phải áp đúng tỷ lệ 50% / 33%</div>
            <div class="rule-text">Trường hợp bất khả kháng phải nằm ghép 2 người, phải tích áp tỷ lệ thanh toán 50% theo Thông tư 22/2023/TT-BYT; nằm ghép 3 người trở lên áp 33%.</div>
          </div>
        </div>
      </div>

      <!-- INTERACTIVE VIOLATION LIST VIEWER -->
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
        <strong>${hospitalName}</strong> · Hệ thống NsN_XMLcheck v2.16.0
      </div>
      <div>
        Bản quyền © 2026 <strong>Nguyễn Sơn Nam (Nsnnam)</strong> · Múi giờ Asia/Ho_Chi_Minh
      </div>
    </div>
  </div>

  <script>
    const allViolations = ${jsonViolations};
    let currentTypeFilter = 'all';
    let currentDeptFilter = '';

    function filterByType(type) {
      currentTypeFilter = type;
      currentDeptFilter = '';
      document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
      const activeCard = event.currentTarget;
      if (activeCard && activeCard.classList) activeCard.classList.add('active');
      
      const titleEl = document.getElementById('viewerTitle');
      if (type === 'multi-day-overlap') titleEl.textContent = '🔍 CÁC CA VI PHẠM: GIƯỜNG GỐI ĐẦU LIÊN TIẾP (≥ 2 NGÀY)';
      else if (type === 'minute-duplicate') titleEl.textContent = '🔍 CÁC CA VI PHẠM: TRÙNG MỐC PHÚT CHUYỂN TIẾP (12:00 -> 12:00)';
      else if (type === 'bed-exceeds-discharge') titleEl.textContent = '🔍 CÁC CA VI PHẠM: THỜI GIAN KÊ GIƯỜNG VƯỢT QUÁ GIỜ RA VIỆN';
      else titleEl.textContent = '🔍 DANH SÁCH CHI TIẾT TẤT CẢ CÁC CA VI PHẠM KT251';

      renderTable();
      document.getElementById('viewerSection').scrollIntoView({ behavior: 'smooth' });
    }

    function filterByDept(dept) {
      currentDeptFilter = dept;
      currentTypeFilter = 'all';
      document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
      document.getElementById('viewerTitle').textContent = '🔍 DANH SÁCH VI PHẠM CỦA KHOA ' + dept;
      renderTable();
      document.getElementById('viewerSection').scrollIntoView({ behavior: 'smooth' });
    }

    function resetFilters() {
      currentTypeFilter = 'all';
      currentDeptFilter = '';
      document.getElementById('searchInput').value = '';
      document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
      document.getElementById('viewerTitle').textContent = '🔍 DANH SÁCH CHI TIẾT CÁC CA VI PHẠM (TẤT CẢ)';
      renderTable();
    }

    function renderTable() {
      const q = (document.getElementById('searchInput').value || '').toLowerCase().trim();
      const filtered = allViolations.filter(r => {
        if (currentTypeFilter !== 'all' && r.typeKey !== currentTypeFilter) return false;
        if (currentDeptFilter && (r.khoa || '').toUpperCase() !== currentDeptFilter.toUpperCase()) return false;
        if (q) {
          const text = (r.maLk + ' ' + r.maBn + ' ' + r.hoTen + ' ' + r.khoa + ' ' + r.giuong + ' ' + r.trung).toLowerCase();
          if (!text.includes(q)) return false;
        }
        return true;
      });

      document.getElementById('recordCounter').textContent = filtered.length + ' ca vi phạm';

      const tbody = document.getElementById('violationTableBody');
      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-6 text-slate-500">Không tìm thấy ca vi phạm nào phù hợp với bộ lọc hiện tại.</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.slice(0, 300).map((r, i) => {
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
      }).join('');
    }

    // Khởi chạy render ban đầu
    renderTable();
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `INFOGRAPHIC_KT251_${hospitalName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Xuất Báo cáo Markdown
  const handleExportMarkdown = () => {
    const todayStr = new Date().toLocaleDateString("vi-VN");
    const deptTable = stats.deptList
      .map(
        (d, idx) =>
          `| ${idx + 1} | **${d.khoa}** | **${d.count}** | ${d.multiDay} | ${d.patientCount} | **${d.loss.toLocaleString("vi-VN")} đ** |`,
      )
      .join("\n");

    const mdContent = `# BÁO CÁO RÀ SOÁT CẢNH BÁO TIỀN GIƯỜNG & GIƯỜNG NẰM GHÉP (KT251)
## ĐƠN VỊ: ${hospitalName.toUpperCase()}
**Thời gian lập báo cáo:** ${todayStr}  
**Người thực hiện:** Nguyễn Sơn Nam (Nsnnam)  
**Công cụ rà soát:** Hệ thống **NsN_XMLcheck v2.16.0**

---

### 1. TỔNG HỢP TOÀN VIỆN
- **Tổng số dòng XML3:** ${stats.totalRecords.toLocaleString("vi-VN")} dòng
- **Dòng tiền giường (Nhóm 14, 15):** ${stats.bedCount.toLocaleString("vi-VN")} dòng (${stats.patientCount} BN nội trú)
- **Tổng số dòng vi phạm cảnh báo Giường ghép & Gối đầu (KT251):** **${stats.violationCount.toLocaleString("vi-VN")} dòng**
  - Giường gối đầu liên tiếp (≥ 2 ngày): **${stats.multiDayCount.toLocaleString("vi-VN")} dòng**
  - Trùng mốc phút chuyển tiếp (12:00 -> 12:00): **${stats.minuteDupCount} lượt**
  - Thời gian kê giường vượt quá giờ ra viện (NGAY_RA): **${stats.exceedDischargeCount} ca**
  - Chồng lấn thời gian cùng BN: **${stats.multipleBedsCount} ca**
  - Thiếu mã giường: **${stats.missingBedCount} ca**
- **Tổng nguy cơ xuất toán BHYT dự kiến:** **${stats.totalRefusal.toLocaleString("vi-VN")} VNĐ**

---

### 2. BẢNG PHÂN BỔ NGUY CƠ THEO KHOA LÂM SÀNG
| STT | Khoa lâm sàng | Số dòng vi phạm | Gối đầu (≥2N) | Số BN | Nguy cơ xuất toán (VNĐ) |
| :-: | :--- | :-: | :-: | :-: | :-: |
${deptTable}

---

### 3. QUY TRÌNH CHUẨN HÓA DÀNH CHO ĐIỀU DƯỠNG
1. **Quy tắc 1 phút chuyển tiếp:** Ngày trước kết thúc lúc 12:00 thì ngày tiếp theo bắt đầu từ 12:01.
2. **Kiểm tra buồng giường trống:** Không chọn mã giường đang có bệnh nhân khác nằm điều trị chưa làm thủ tục ra viện/chuyển khoa.
3. **Kiểm soát giờ ra viện:** Giờ kết thúc kê giường (NGAY_KQ) bắt buộc phải ≤ giờ ra viện (NGAY_RA).
4. **Nằm ghép bất khả kháng:** Phải áp tỷ lệ thanh toán 50% (ghép 2 người) hoặc 33% (ghép từ 3 người trở lên).

---
*Báo cáo được xuất tự động từ hệ thống NsN_XMLcheck v2.16.0.*
`;

    const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BAO_CAO_KT251_${hospitalName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Tải Slide PowerPoint trực tiếp qua Blob Base64 (hoạt động 100% cả Online GitHub Pages lẫn Offline)
  const handleDownloadSlidePptx = () => {
    try {
      const binaryString = atob(SLIDE_PPTX_BASE64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cleanName = (hospitalName || "Lạc_Việt").trim().replace(/[\s/\\?%*:|"<>]+/g, "_");
      a.download = `SLIDE_BAO_CAO_GIUONG_GHEP_VA_TIEN_GIUONG_${cleanName}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Lỗi tải slide PPTX:", err);
      window.open("./SLIDE_BAO_CAO_GIUONG_GHEP_VA_TIEN_GIUONG_LANH_DAO.pptx", "_blank");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header modal */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-linear-to-r from-slate-900 via-slate-800 to-teal-800 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <h3 className="text-base font-bold">Xuất Báo Cáo &amp; Infographics Rà Soát KT251</h3>
              <p className="text-xs text-teal-200">
                Tiền giường, giường nằm ghép, trùng mốc phút &amp; vượt thời gian ra viện
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Nội dung modal */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-slate-800">
          {/* Ô nhập Tên đơn vị / Bệnh viện */}
          <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-teal-900 mb-1.5">
              🏥 Tên Bệnh viện / Cơ sở khám chữa bệnh:
            </label>
            <input
              type="text"
              value={hospitalName}
              onChange={(e) => handleHospitalNameChange(e.target.value)}
              placeholder="Nhập tên bệnh viện..."
              className="w-full rounded-lg border border-teal-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-teal-600 focus:outline-none shadow-2xs"
            />
            <p className="mt-1 text-[11px] text-teal-700">
              * Tên này sẽ xuất hiện trên tiêu đề Slide thuyết trình, Báo cáo và Infographics HTML.
            </p>
          </div>

          {/* Khối thống kê tóm tắt */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600 flex justify-between">
              <span>Số liệu rà soát thực tế trong phiên làm việc:</span>
              <span className="font-mono text-teal-700">
                {records.length.toLocaleString("vi-VN")} dòng XML3
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                <div className="text-slate-500 font-medium">Chi phí ngày giường:</div>
                <div className="text-base font-bold text-slate-900 font-mono">
                  {stats.bedCount.toLocaleString("vi-VN")} dòng{" "}
                  <span className="text-xs font-normal text-slate-500">
                    ({stats.patientCount} BN)
                  </span>
                </div>
              </div>
              <div className="rounded-lg bg-white p-2.5 border border-rose-200">
                <div className="text-rose-600 font-medium">Nguy cơ xuất toán KT251:</div>
                <div className="text-base font-bold text-rose-700 font-mono">
                  {stats.totalRefusal.toLocaleString("vi-VN")} đ
                </div>
              </div>
            </div>

            {/* Chi tiết từng loại lỗi */}
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div className="rounded-lg bg-amber-50 p-2 border border-amber-200">
                <span className="text-amber-800 font-bold">Gối đầu ≥ 2 ngày:</span>
                <div className="font-mono font-bold text-amber-900 text-sm">
                  {stats.multiDayCount} dòng
                </div>
              </div>
              <div className="rounded-lg bg-purple-50 p-2 border border-purple-200">
                <span className="text-purple-800 font-bold">Trùng phút 12:00:</span>
                <div className="font-mono font-bold text-purple-900 text-sm">
                  {stats.minuteDupCount} lượt
                </div>
              </div>
              <div className="rounded-lg bg-rose-50 p-2 border border-rose-200">
                <span className="text-rose-800 font-bold">Vượt giờ ra viện:</span>
                <div className="font-mono font-bold text-rose-900 text-sm">
                  {stats.exceedDischargeCount} ca
                </div>
              </div>
            </div>
          </div>

          {/* Các nút hành động xuất báo cáo */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Chọn định dạng xuất deliverable:
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* Nút 1: Infographic HTML Tương tác */}
              <button
                type="button"
                onClick={handleExportInteractiveInfographic}
                className="flex items-center gap-3 rounded-xl border-2 border-teal-500 bg-teal-50/80 p-3 text-left hover:bg-teal-100/80 transition group shadow-xs cursor-pointer"
              >
                <span className="text-2xl group-hover:scale-110 transition">🌐</span>
                <div>
                  <div className="text-xs font-bold text-teal-950">
                    Xuất Infographic HTML Tương Tác
                  </div>
                  <div className="text-[11px] text-teal-800">
                    Click xem chi tiết từng ca vi phạm, tìm kiếm &amp; in ấn A4
                  </div>
                </div>
              </button>

              {/* Nút 2: Báo cáo Markdown */}
              <button
                type="button"
                onClick={handleExportMarkdown}
                className="flex items-center gap-3 rounded-xl border border-slate-300 bg-white p-3 text-left hover:bg-slate-50 transition group shadow-xs cursor-pointer"
              >
                <span className="text-2xl group-hover:scale-110 transition">📑</span>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Xuất Báo Cáo Chuyên Đề (.md)
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Báo cáo đầy đủ số liệu theo khoa cho Ban Giám đốc
                  </div>
                </div>
              </button>

              {/* Nút 3: Excel Đối chiếu Giường ghép */}
              {onExportExcel && (
                <button
                  type="button"
                  onClick={onExportExcel}
                  className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50/60 p-3 text-left hover:bg-amber-100/70 transition group shadow-xs cursor-pointer"
                >
                  <span className="text-2xl group-hover:scale-110 transition">📊</span>
                  <div>
                    <div className="text-xs font-bold text-amber-950">
                      Xuất File Excel Giám Định (KT251)
                    </div>
                    <div className="text-[11px] text-amber-800">
                      Gồm Sheet Tổng hợp theo Khoa &amp; Chi tiết từng cặp trùng
                    </div>
                  </div>
                </button>
              )}

              {/* Nút 4: Slide PowerPoint */}
              <button
                type="button"
                onClick={handleDownloadSlidePptx}
                className="flex items-center gap-3 rounded-xl border border-indigo-300 bg-indigo-50/60 p-3 text-left hover:bg-indigo-100/70 transition group shadow-xs cursor-pointer"
              >
                <span className="text-2xl group-hover:scale-110 transition">📽️</span>
                <div>
                  <div className="text-xs font-bold text-indigo-950">
                    Tải Slide PowerPoint (.pptx)
                  </div>
                  <div className="text-[11px] text-indigo-800">
                    10 slide 16:9 thiết kế sẵn báo cáo Ban Giám đốc
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer modal */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-3.5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-2xs cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
