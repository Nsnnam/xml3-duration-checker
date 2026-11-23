import { useState, useMemo } from "react";
import type { Xml3Record, PatientInfo } from "./xml3-duration";
import { formatXmlDateTime } from "./timezone";
import { generateAndDownloadDynamicPptx } from "./dynamic-pptx-generator";
import { APP_META } from "./meta";

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
    let retainedCount = 0;
    let rejectedCount = 0;

    const deptMap = new Map<
      string,
      {
        count: number;
        multiDay: number;
        pts: Set<string>;
        loss: number;
        retained: number;
        rejected: number;
      }
    >();

    for (const r of bedRecords) {
      if (r.MA_LK) bedPatients.add(r.MA_LK);
      const khoa = (r.MA_KHOA || "KHOA_KHAC").trim().toUpperCase();
      let d = deptMap.get(khoa);
      if (!d) {
        d = { count: 0, multiDay: 0, pts: new Set(), loss: 0, retained: 0, rejected: 0 };
        deptMap.set(khoa, d);
      }

      if (r.hasBedWarning) {
        d.count++;
        if (r.MA_LK) d.pts.add(r.MA_LK);
        const loss = r.potentialBedRefusal || 0;
        d.loss += loss;
        totalRefusal += loss;

        if (r.isRetainedBed) {
          retainedCount++;
          d.retained++;
        }
        if (r.bedAuditAction === "rejected") {
          rejectedCount++;
          d.rejected++;
        }

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
        retained: data.retained,
        rejected: data.rejected,
      }))
      .sort((a, b) => b.loss - a.loss || b.count - a.count);

    const allViolations = bedRecords.filter((r) => r.hasBedWarning);

    return {
      totalRecords,
      bedCount: bedRecords.length,
      patientCount: bedPatients.size,
      violationCount: allViolations.length,
      retainedCount,
      rejectedCount,
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

  // Xuất Infographic HTML Tương Tác Có Lọc Đa Chiều & Nút Xuất Excel Trực Tiếp
  const handleExportInteractiveInfographic = () => {
    const todayStr = new Date().toLocaleDateString("vi-VN");
    const jsonViolations = JSON.stringify(
      stats.allViolations.map((r) => {
        let loaiLabel = "Giường ghép";
        if (r.bedWarningType === "multi-day-overlap") {
          loaiLabel = `Gối đầu (${r.bedOverlapDaysCount || 2}N)`;
        } else if (r.bedWarningType === "minute-duplicate") {
          loaiLabel = "Trùng phút 12:00";
        } else if (r.bedWarningType === "bed-exceeds-discharge") {
          loaiLabel = "Vượt giờ ra viện";
        } else if (r.bedWarningType === "missing-bed-code") {
          loaiLabel = "Thiếu mã giường";
        } else if (r.bedWarningType === "multiple-beds") {
          loaiLabel = "Trùng nhiều giường cùng BN";
        }

        let tinhTrangStr = "Chỉ cảnh báo";
        if (r.isRetainedBed) {
          tinhTrangStr = "Được giữ lại (0 đ XT)";
        } else if (r.bedAuditAction === "rejected") {
          tinhTrangStr = "Xuất toán do trùng";
        } else if (r.bedWarningType === "bed-exceeds-discharge") {
          tinhTrangStr = "Cảnh báo vượt giờ ra";
        } else if (r.bedWarningType === "minute-duplicate") {
          tinhTrangStr = "Cảnh báo trùng phút 12:00";
        }

        return {
          maLk: r.MA_LK,
          maBn: r.MA_BN || "—",
          hoTen: r.HO_TEN || "—",
          stt: r.STT || "—",
          khoa: r.MA_KHOA || "—",
          giuong: r.MA_GIUONG || "—",
          ngayTh: formatXmlDateTime(r.NGAY_TH_YL) || r.NGAY_TH_YL,
          ngayKq: formatXmlDateTime(r.NGAY_KQ) || r.NGAY_KQ,
          loai: loaiLabel,
          typeKey: r.bedWarningType || "other",
          action: r.bedAuditAction || (r.isRetainedBed ? "retained" : "warning"),
          isRetained: Boolean(r.isRetainedBed),
          tinhTrang: tinhTrangStr,
          trung: r.MA_GIUONG_TRUNG || "—",
          chiTiet: r.detail || "",
          tienXuatToan: r.potentialBedRefusal || 0,
        };
      }),
    );

    const jsonDeptList = JSON.stringify(stats.deptList);

    const deptOptionsHtml = stats.deptList
      .map((d) => `<option value="${d.khoa}">${d.khoa} (${d.count} ca)</option>`)
      .join("");

    const deptRowsHtml = stats.deptList
      .slice(0, 12)
      .map(
        (d, idx) => `
        <tr class="dept-row" onclick="filterByDept('${d.khoa}')">
          <td class="text-center font-bold">${idx + 1}</td>
          <td class="font-bold text-teal-800">${d.khoa}</td>
          <td class="text-center font-bold text-slate-800">${d.count}</td>
          <td class="text-center text-rose-700 font-bold">${d.rejected}</td>
          <td class="text-center text-emerald-700 font-bold">${d.retained}</td>
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
      --emerald: #059669;
      --bg: #f8fafc;
      --border: #e2e8f0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg); color: #1e293b; padding: 20px; line-height: 1.5; }
    .container { max-width: 1280px; margin: 0 auto; background: white; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.08); overflow: hidden; border: 1px solid var(--border); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #0d9488 100%); color: white; padding: 32px 40px; position: relative; }
    .badge { display: inline-block; background: rgba(13,148,136,0.3); border: 1px solid #2dd4bf; color: #5eead4; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 5px 12px; border-radius: 999px; margin-bottom: 12px; }
    .title { font-size: 26px; font-weight: 800; margin-bottom: 8px; color: white; }
    .subtitle { font-size: 14.5px; color: #cbd5e1; max-width: 950px; }
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
    .card-val { font-size: 23px; font-weight: 800; font-family: 'JetBrains Mono', monospace; margin: 4px 0; }
    .card-val.rose { color: var(--rose); }
    .card-val.amber { color: var(--amber); }
    .card-val.purple { color: var(--purple); }
    .card-val.emerald { color: var(--emerald); }
    .card-val.teal { color: var(--teal); }
    .card-sub { font-size: 11.5px; color: #64748b; }
    .click-hint { font-size: 10px; font-weight: 700; color: #0d9488; margin-top: 4px; display: block; }

    /* RULES & STRATEGY GRID */
    .rules-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .rule-box { border-radius: 12px; padding: 18px; border: 1.5px solid var(--border); background: white; }
    .rule-box.highlight { border-color: var(--teal); background: #f0fdfa; }
    .rule-box.rose-box { border-color: #fca5a5; background: #fff1f2; }
    .rule-box.emerald-box { border-color: #a7f3d0; background: #f0fdf4; }
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
    .search-input { flex: 2; min-width: 220px; padding: 8px 12px; border-radius: 8px; border: 1.5px solid var(--border); font-size: 13px; background: white; }
    .select-filter { flex: 1; min-width: 170px; padding: 8px 10px; border-radius: 8px; border: 1.5px solid var(--border); font-size: 13px; background: white; font-weight: 600; color: #334155; }
    .reset-btn { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; border-radius: 8px; padding: 8px 14px; font-size: 12px; font-weight: 700; cursor: pointer; }
    .reset-btn:hover { background: #ef4444; color: white; }
    .excel-btn { background: #059669; color: white; border: none; border-radius: 8px; padding: 8px 15px; font-size: 12px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 4px rgba(5,150,105,0.2); }
    .excel-btn:hover { background: #047857; }
    .excel-btn.secondary { background: #0284c7; box-shadow: 0 2px 4px rgba(2,132,199,0.2); }
    .excel-btn.secondary:hover { background: #0369a1; }

    .table-scroll { max-height: 520px; overflow-y: auto; background: white; border-radius: 8px; border: 1px solid var(--border); }
    
    .tag { display: inline-block; padding: 3px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 800; text-transform: uppercase; white-space: nowrap; }
    .tag-rejected { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
    .tag-retained { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
    .tag-multi { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
    .tag-minute { background: #ede9fe; color: #5b21b6; border: 1px solid #c4b5fd; }
    .tag-discharge { background: #ffedd5; color: #9a3412; border: 1px solid #fdba74; }
    .tag-sharing { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }

    .footer { background: var(--navy); color: #94a3b8; padding: 18px 40px; display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; }
    .footer strong { color: white; }
    .print-btn { background: #0d9488; color: white; border: none; border-radius: 8px; padding: 8px 16px; font-weight: 700; cursor: pointer; }
    .print-btn:hover { background: #0f766e; }

    @media print {
      body { padding: 0; background: white; }
      .container { box-shadow: none; border: none; max-width: 100%; }
      .table-scroll { max-height: none; overflow: visible; }
      .print-btn, .search-input, .select-filter, .reset-btn, .excel-btn { display: none; }
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
      <div class="badge">HỘI ĐỒNG CHUYÊN MÔN &amp; QUẢN LÝ CHẤT LƯỢNG BHYT</div>
      <h1 class="title">CẨM NANG RÀ SOÁT TIỀN GIƯỜNG &amp; GIƯỜNG NẰM GHÉP (KT251)</h1>
      <p class="subtitle">
        Báo cáo phân tích dữ liệu thực tế XML3, đối soát giường gối đầu nhiều ngày, nguyên tắc giữ lại 01 giường cao nhất và hướng dẫn giảm thiểu xuất toán tại <strong>${hospitalName}</strong>.
      </p>
      <div class="meta">
        <span>🏥 Đơn vị: <strong>${hospitalName}</strong></span>
        <span>📅 Ngày trích xuất: ${todayStr}</span>
        <span>👤 Chuyên viên phân tích: Nguyễn Sơn Nam (Nsnnam)</span>
        <span>🚀 Hệ thống: NsN_XMLcheck v${APP_META.version}</span>
      </div>
    </div>

    <div class="content">
      <!-- 4 THẺ TỔNG QUAN CÓ THỂ CLICK -->
      <div>
        <div class="section-title">
          <span>🚨 TỔNG QUAN DỮ LIỆU &amp; NGUY CƠ XUẤT TOÁN THỰC TẾ (BẤM VÀO THẺ ĐỂ LỌC CHI TIẾT)</span>
          <button class="print-btn" onclick="window.print()">🖨️ In ấn / Xuất PDF A4</button>
        </div>
        <div class="metric-grid">
          <div class="card" onclick="filterByCard('rejected')">
            <div class="card-lbl">Nguy cơ xuất toán thực tế (KT251)</div>
            <div class="card-val rose">${stats.totalRefusal.toLocaleString("vi-VN")} đ</div>
            <div class="card-sub">${stats.rejectedCount} giường bị loại trừ (sau khi giữ lại 1 giường cao nhất)</div>
            <span class="click-hint">👉 Bấm lọc các ca bị xuất toán</span>
          </div>
          <div class="card" onclick="filterByCard('retained')">
            <div class="card-lbl">Giường được giữ lại thanh toán</div>
            <div class="card-val emerald">${stats.retainedCount} ca</div>
            <div class="card-sub">0 đ xuất toán (ưu tiên giá cao nhất / vào trước)</div>
            <span class="click-hint">👉 Bấm lọc các ca được giữ lại</span>
          </div>
          <div class="card" onclick="filterByCard('multi-day-overlap')">
            <div class="card-lbl">Giường gối đầu liên tiếp (≥2N)</div>
            <div class="card-val amber">${stats.multiDayCount} dòng</div>
            <div class="card-sub">Trùng buồng giường giữa các BN khác nhau</div>
            <span class="click-hint">👉 Bấm lọc ca gối đầu</span>
          </div>
          <div class="card" onclick="filterByCard('procedural')">
            <div class="card-lbl">Cảnh báo thủ tục (0 đ xuất toán)</div>
            <div class="card-val teal">${stats.minuteDupCount + stats.exceedDischargeCount} ca</div>
            <div class="card-sub">${stats.minuteDupCount} trùng phút 12:00 · ${stats.exceedDischargeCount} vượt giờ ra</div>
            <span class="click-hint">👉 Bấm lọc ca cảnh báo thủ tục</span>
          </div>
        </div>
      </div>

      <!-- CẨM NANG GIẢI TRÌNH & GIẢM THIỂU XUẤT TOÁN VỚI BHXH -->
      <div>
        <div class="section-title">
          <span>⚖️ CĂN CỨ PHÁP LÝ &amp; CHIẾN LƯỢC GIẢI TRÌNH GIẢM THIỂU XUẤT TOÁN VỚI BHXH</span>
        </div>
        <div class="rules-grid">
          <div class="rule-box emerald-box">
            <div class="rule-title">🎯 1. Nguyên tắc giữ lại 01 giường có giá tiền cao nhất</div>
            <div class="rule-text">Theo nguyên tắc thanh toán thực tế của cơ quan BHXH: Khi xảy ra trùng giường giữa nhiều bệnh nhân, chỉ xuất toán các giường phía sau và <strong>bắt buộc giữ lại 01 giường có chi phí cao nhất</strong> (hoặc vào viện trước). Hệ thống NsN_XMLcheck đã phân tách rõ ràng để đơn vị đối chiếu chính xác, không bị tính trùng cả 2 ca.</div>
          </div>
          <div class="rule-box highlight">
            <div class="rule-title">⏱️ 2. Tiêu chí thời gian trùng dưới 4 giờ (Loại trừ xuất toán)</div>
            <div class="rule-text">Văn bản số <code>/TTKS-NV</code> của Trung tâm Kiểm soát thanh toán BHXH quy định: <em>Chỉ xác định nằm ghép khi người bệnh cùng nằm trên 01 mã giường với thời gian trùng nhau từ 4 giờ trở lên</em>. Các trường hợp bàn giao giường, làm thủ tục ra viện/chuyển khoa dưới 4 giờ <strong>hoàn toàn có cơ sở giải trình loại khỏi diện nằm ghép</strong>.</div>
          </div>
          <div class="rule-box highlight">
            <div class="rule-title">📋 3. Trùng mốc phút 12:00 do phần mềm HIS cắt ngày</div>
            <div class="rule-text">Nhiều ca bị gán lỗi trùng là do HIS tự động chia ngày điều trị lúc 12:00 (ngày trước kết thúc 12:00, ngày sau bắt đầu 12:00). Người bệnh thực tế chỉ nằm 1 giường duy nhất. Đơn vị giải trình bệnh án điều trị liên tục hoặc dùng tính năng <em>Lùi 1 phút (12:01)</em> trên NsN_XMLcheck để chuẩn hóa sạch lỗi.</div>
          </div>
          <div class="rule-box rose-box">
            <div class="rule-title">🏥 4. Kê giường vượt giờ ra viện là cảnh báo thủ tục</div>
            <div class="rule-text">Giờ kết thúc kê giường vượt quá giờ ra viện (<code>NGAY_KQ &gt; NGAY_RA</code>) là lỗi logic thời gian hành chính trong XML, <strong>không làm phát sinh trùng giường hoặc lạm dụng quỹ</strong> nếu không có người khác nằm đè lên. Đơn vị chỉ cần chuẩn hóa khớp giờ trên XML1 để giải trình bảo vệ chi phí.</div>
          </div>
        </div>
      </div>

      <!-- BẢNG THEO KHOA -->
      <div>
        <div class="section-title">
          <span>🏥 BẢNG THỐNG KÊ CHI TIẾT THEO KHOA LÂM SÀNG (BẤM VÀO KHOA ĐỂ LỌC NHANH)</span>
        </div>
        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 50px;">STT</th>
              <th>Khoa lâm sàng</th>
              <th class="text-center">Tổng vi phạm</th>
              <th class="text-center">Bị xuất toán</th>
              <th class="text-center">Được giữ lại</th>
              <th class="text-center">Gối đầu (≥2N)</th>
              <th class="text-center">Số BN</th>
              <th class="text-right">Nguy cơ xuất toán (VNĐ)</th>
              <th class="text-center" style="width: 90px;">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            ${deptRowsHtml}
          </tbody>
        </table>
      </div>

      <!-- INTERACTIVE VIOLATION LIST VIEWER -->
      <div class="viewer-panel" id="viewerSection">
        <div class="section-title">
          <span id="viewerTitle">🔍 DANH SÁCH CHI TIẾT CÁC CA RÀ SOÁT KT251</span>
          <span id="recordCounter" class="tag tag-sharing">0 ca</span>
        </div>
        
        <!-- BỘ LỌC ĐA CHIỀU & NÚT XUẤT EXCEL TRỰC TIẾP -->
        <div class="filter-bar">
          <input type="text" id="searchInput" class="search-input" placeholder="Tìm theo Mã BN, Họ tên, Mã LK, Khoa, Giường..." oninput="applyFilters()">
          
          <select id="typeSelect" class="select-filter" onchange="applyFilters()">
            <option value="all">-- Tất cả phân loại --</option>
            <option value="rejected">🚨 Chỉ ca bị xuất toán</option>
            <option value="retained">✅ Chỉ ca được giữ lại (0đ)</option>
            <option value="multi-day-overlap">🛏️ Giường gối đầu (≥2 ngày)</option>
            <option value="bed-sharing">👥 Giường ghép trong ngày</option>
            <option value="minute-duplicate">⏱️ Trùng phút 12:00</option>
            <option value="bed-exceeds-discharge">🏥 Vượt giờ ra viện</option>
            <option value="missing-bed-code">⚠️ Thiếu mã giường</option>
          </select>

          <select id="deptSelect" class="select-filter" onchange="applyFilters()">
            <option value="">-- Tất cả khoa phòng --</option>
            ${deptOptionsHtml}
          </select>

          <select id="riskSelect" class="select-filter" onchange="applyFilters()">
            <option value="all">-- Tất cả mức độ rủi ro --</option>
            <option value="hasLoss">🚨 Có nguy cơ xuất toán (&gt; 0 đ)</option>
            <option value="noLoss">ℹ️ Cảnh báo thủ tục (0 đ xuất toán)</option>
          </select>

          <button class="excel-btn" type="button" onclick="exportFilteredToExcel()" title="Tải file Excel gồm Sheet Tổng hợp theo Khoa và Danh sách chi tiết đang xem">
            📥 Xuất Excel đang lọc
          </button>
          
          <button class="excel-btn secondary" type="button" onclick="exportAllToExcel()" title="Tải file Excel toàn bộ dữ liệu đối soát KT251">
            📊 Xuất Toàn Bộ Excel
          </button>

          <button class="reset-btn" type="button" onclick="resetFilters()">↺ Xem lại tất cả</button>
        </div>

        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th class="text-center" style="width: 45px;">STT</th>
                <th>Tình trạng xử lý</th>
                <th>Mã LK / Bệnh nhân</th>
                <th>Khoa / Giường</th>
                <th>Thời gian kê giường</th>
                <th>Phân loại nghiệp vụ</th>
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
        <strong>${hospitalName}</strong> · Hệ thống NsN_XMLcheck v${APP_META.version}
      </div>
      <div>
        Bản quyền © 2026 <strong>Nguyễn Sơn Nam (Nsnnam)</strong> · Múi giờ Asia/Ho_Chi_Minh
      </div>
    </div>
  </div>

  <script>
    const allViolations = ${jsonViolations};
    const deptStats = ${jsonDeptList};
    const hospitalTitle = "${hospitalName.replace(/"/g, '\\"')}";

    let currentTypeFilter = 'all';
    let currentDeptFilter = '';
    let currentRiskFilter = 'all';

    function filterByCard(cardType) {
      document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
      const activeCard = event.currentTarget;
      if (activeCard && activeCard.classList) activeCard.classList.add('active');

      if (cardType === 'rejected') {
        currentTypeFilter = 'rejected';
        currentRiskFilter = 'all';
      } else if (cardType === 'retained') {
        currentTypeFilter = 'retained';
        currentRiskFilter = 'all';
      } else if (cardType === 'multi-day-overlap') {
        currentTypeFilter = 'multi-day-overlap';
        currentRiskFilter = 'all';
      } else if (cardType === 'procedural') {
        currentTypeFilter = 'procedural';
        currentRiskFilter = 'noLoss';
      } else {
        currentTypeFilter = 'all';
        currentRiskFilter = 'all';
      }

      document.getElementById('typeSelect').value = currentTypeFilter === 'procedural' ? 'all' : currentTypeFilter;
      document.getElementById('riskSelect').value = currentRiskFilter;
      applyFilters();
      document.getElementById('viewerSection').scrollIntoView({ behavior: 'smooth' });
    }

    function filterByDept(dept) {
      currentDeptFilter = dept;
      document.getElementById('deptSelect').value = dept;
      const deptInfo = deptStats.find(d => (d.khoa || '').toUpperCase() === (dept || '').toUpperCase());
      if (deptInfo && deptInfo.loss <= 0 && document.getElementById('riskSelect').value === 'hasLoss') {
        document.getElementById('riskSelect').value = 'all';
        currentRiskFilter = 'all';
      }
      applyFilters();
      document.getElementById('viewerSection').scrollIntoView({ behavior: 'smooth' });
    }

    function resetFilters() {
      currentTypeFilter = 'all';
      currentDeptFilter = '';
      currentRiskFilter = 'all';
      document.getElementById('searchInput').value = '';
      document.getElementById('typeSelect').value = 'all';
      document.getElementById('deptSelect').value = '';
      document.getElementById('riskSelect').value = 'all';
      document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
      applyFilters();
    }

    function getFilteredRecords() {
      const q = (document.getElementById('searchInput').value || '').toLowerCase().trim();
      const typeVal = document.getElementById('typeSelect').value;
      const deptVal = document.getElementById('deptSelect').value;
      const riskVal = document.getElementById('riskSelect').value;

      return allViolations.filter(r => {
        // Lọc Type
        if (currentTypeFilter === 'procedural') {
          if (r.typeKey !== 'minute-duplicate' && r.typeKey !== 'bed-exceeds-discharge' && r.typeKey !== 'missing-bed-code') return false;
        } else if (typeVal === 'rejected' && r.action !== 'rejected') return false;
        else if (typeVal === 'retained' && !r.isRetained) return false;
        else if (typeVal !== 'all' && typeVal !== 'rejected' && typeVal !== 'retained' && r.typeKey !== typeVal) return false;

        // Lọc Khoa
        if (deptVal && (r.khoa || '').toUpperCase() !== deptVal.toUpperCase()) return false;

        // Lọc Mức độ rủi ro
        if (riskVal === 'hasLoss' && (!r.tienXuatToan || r.tienXuatToan <= 0)) return false;
        if (riskVal === 'noLoss' && r.tienXuatToan > 0) return false;

        // Tìm kiếm tự do
        if (q) {
          const text = (r.maLk + ' ' + r.maBn + ' ' + r.hoTen + ' ' + r.khoa + ' ' + r.giuong + ' ' + r.trung + ' ' + r.tinhTrang).toLowerCase();
          if (!text.includes(q)) return false;
        }

        return true;
      });
    }

    function applyFilters() {
      const filtered = getFilteredRecords();
      document.getElementById('recordCounter').textContent = filtered.length + ' ca phù hợp';

      const tbody = document.getElementById('violationTableBody');
      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-slate-500">' +
          '<div class="text-sm font-bold text-slate-700 mb-1">Không tìm thấy ca nào phù hợp với bộ lọc hiện tại.</div>' +
          '<div class="text-xs text-slate-500">💡 Gợi ý: Nếu bạn đang chọn "Có nguy cơ xuất toán (> 0 đ)", các ca xuất toán có chi phí 0 đ (chưa có đơn giá XML) sẽ bị ẩn. Hãy chuyển về <b>"Tất cả mức độ rủi ro"</b> hoặc bấm nút <b>"↺ Xem lại tất cả"</b>.</div>' +
          '</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.slice(0, 400).map((r, i) => {
        let tagClass = 'tag-sharing';
        let statusBadge = '<span class="tag tag-sharing">Chỉ cảnh báo</span>';

        if (r.isRetained) {
          statusBadge = '<span class="tag tag-retained">✅ Giữ lại (0đ XT)</span>';
        } else if (r.action === 'rejected') {
          statusBadge = '<span class="tag tag-rejected">🚨 Bị xuất toán</span>';
        } else if (r.typeKey === 'bed-exceeds-discharge') {
          statusBadge = '<span class="tag tag-discharge">⚠️ Vượt giờ ra</span>';
        } else if (r.typeKey === 'minute-duplicate') {
          statusBadge = '<span class="tag tag-minute">⏱️ Trùng phút</span>';
        }

        let typeBadgeClass = 'tag-sharing';
        if (r.typeKey === 'multi-day-overlap') typeBadgeClass = 'tag-multi';
        else if (r.typeKey === 'minute-duplicate') typeBadgeClass = 'tag-minute';
        else if (r.typeKey === 'bed-exceeds-discharge') typeBadgeClass = 'tag-discharge';
        else if (r.action === 'rejected') typeBadgeClass = 'tag-rejected';

        return '<tr>' +
          '<td class="text-center font-bold text-slate-500">' + (i + 1) + '</td>' +
          '<td>' + statusBadge + '</td>' +
          '<td><strong class="text-slate-900">' + (r.hoTen || '—') + '</strong><br><span class="text-xs text-slate-500">Mã BN: ' + (r.maBn || '—') + ' · LK: ' + r.maLk + '</span></td>' +
          '<td><span class="font-bold text-teal-800">' + r.khoa + '</span><br><span class="font-mono text-xs text-slate-700">G: ' + r.giuong + '</span></td>' +
          '<td class="text-xs font-mono">' + r.ngayTh + '<br>➔ ' + r.ngayKq + '</td>' +
          '<td><span class="tag ' + typeBadgeClass + '">' + r.loai + '</span></td>' +
          '<td class="text-xs text-slate-700 max-w-[280px] break-words">' + r.trung + '</td>' +
          '<td class="text-right font-mono font-bold ' + (r.tienXuatToan > 0 ? 'text-rose-700' : 'text-emerald-700') + '">' +
            (r.tienXuatToan > 0 ? ('-' + r.tienXuatToan.toLocaleString('vi-VN') + ' đ') : (r.action === 'rejected' ? '<span class="text-amber-700 font-semibold">0 đ (Chưa có đơn giá)</span>' : '0 đ (Giữ lại)')) +
          '</td>' +
        '</tr>';
      }).join('');
    }

    // XUẤT EXCEL XML SPREADSHEET 2003 (Thuần Client, tương thích 100% mọi bản Microsoft Excel & Google Sheets)
    function generateExcelXml(recordsToExport, exportTitle) {
      const dateStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      const cleanHosp = hospitalTitle.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
      let totalLoss = 0;
      let totalRejected = 0;
      let totalRetained = 0;
      recordsToExport.forEach(r => {
        totalLoss += (r.tienXuatToan || 0);
        if (r.action === 'rejected') totalRejected++;
        if (r.isRetained) totalRetained++;
      });

      // Sheet 1: Tổng hợp theo Khoa
      let deptRowsXml = '';
      deptStats.forEach((d, idx) => {
        deptRowsXml += '<Row>' +
          '<Cell ss:StyleID="sTextCenter"><Data ss:Type="Number">' + (idx + 1) + '</Data></Cell>' +
          '<Cell ss:StyleID="sBold"><Data ss:Type="String">' + d.khoa + '</Data></Cell>' +
          '<Cell ss:StyleID="sNumber"><Data ss:Type="Number">' + d.count + '</Data></Cell>' +
          '<Cell ss:StyleID="sNumberRose"><Data ss:Type="Number">' + d.rejected + '</Data></Cell>' +
          '<Cell ss:StyleID="sNumberEmerald"><Data ss:Type="Number">' + d.retained + '</Data></Cell>' +
          '<Cell ss:StyleID="sNumber"><Data ss:Type="Number">' + d.multiDay + '</Data></Cell>' +
          '<Cell ss:StyleID="sNumber"><Data ss:Type="Number">' + d.patientCount + '</Data></Cell>' +
          '<Cell ss:StyleID="sCurrency"><Data ss:Type="Number">' + d.loss + '</Data></Cell>' +
        '</Row>';
      });

      // Sheet 2: Danh sách chi tiết
      let detailRowsXml = '';
      recordsToExport.forEach((r, idx) => {
        const cleanHoTen = (r.hoTen || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const cleanTrung = (r.trung || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const cleanChiTiet = (r.chiTiet || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const styleRefusal = r.tienXuatToan > 0 ? 'sCurrencyRose' : 'sCurrencyEmerald';

        detailRowsXml += '<Row>' +
          '<Cell ss:StyleID="sTextCenter"><Data ss:Type="Number">' + (idx + 1) + '</Data></Cell>' +
          '<Cell ss:StyleID="sBold"><Data ss:Type="String">' + r.tinhTrang + '</Data></Cell>' +
          '<Cell ss:StyleID="sText"><Data ss:Type="String">' + r.maLk + '</Data></Cell>' +
          '<Cell ss:StyleID="sText"><Data ss:Type="String">' + r.maBn + '</Data></Cell>' +
          '<Cell ss:StyleID="sBold"><Data ss:Type="String">' + cleanHoTen + '</Data></Cell>' +
          '<Cell ss:StyleID="sTextCenter"><Data ss:Type="String">' + r.khoa + '</Data></Cell>' +
          '<Cell ss:StyleID="sTextCenter"><Data ss:Type="String">' + r.giuong + '</Data></Cell>' +
          '<Cell ss:StyleID="sTextCenter"><Data ss:Type="String">' + r.ngayTh + '</Data></Cell>' +
          '<Cell ss:StyleID="sTextCenter"><Data ss:Type="String">' + r.ngayKq + '</Data></Cell>' +
          '<Cell ss:StyleID="sText"><Data ss:Type="String">' + r.loai + '</Data></Cell>' +
          '<Cell ss:StyleID="' + styleRefusal + '"><Data ss:Type="Number">' + r.tienXuatToan + '</Data></Cell>' +
          '<Cell ss:StyleID="sText"><Data ss:Type="String">' + cleanTrung + '</Data></Cell>' +
          '<Cell ss:StyleID="sText"><Data ss:Type="String">' + cleanChiTiet + '</Data></Cell>' +
        '</Row>';
      });

      const xml = '<?xml version="1.0" encoding="utf-8"?>\\n' +
        '<?mso-application progid="Excel.Sheet"?>\\n' +
        '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\\n' +
        ' xmlns:o="urn:schemas-microsoft-com:office:office"\\n' +
        ' xmlns:x="urn:schemas-microsoft-com:office:excel"\\n' +
        ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\\n' +
        ' xmlns:html="http://www.w3.org/TR/REC-html40">\\n' +
        '<Styles>\\n' +
        ' <Style ss:ID="Default" ss:Name="Normal"><Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/></Style>\\n' +
        ' <Style ss:ID="sHeader"><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0F172A" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>\\n' +
        ' <Style ss:ID="sTitle"><Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1" ss:Color="#0F172A"/><Alignment ss:Vertical="Center"/></Style>\\n' +
        ' <Style ss:ID="sSubtitle"><Font ss:FontName="Calibri" ss:Size="10" ss:Italic="1" ss:Color="#475569"/></Style>\\n' +
        ' <Style ss:ID="sBold"><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/></Style>\\n' +
        ' <Style ss:ID="sText"><Alignment ss:Vertical="Center"/></Style>\\n' +
        ' <Style ss:ID="sTextCenter"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>\\n' +
        ' <Style ss:ID="sNumber"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><NumberFormat ss:Format="#,##0"/></Style>\\n' +
        ' <Style ss:ID="sNumberRose"><Font ss:FontName="Calibri" ss:Bold="1" ss:Color="#991B1B"/><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><NumberFormat ss:Format="#,##0"/></Style>\\n' +
        ' <Style ss:ID="sNumberEmerald"><Font ss:FontName="Calibri" ss:Bold="1" ss:Color="#065F46"/><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><NumberFormat ss:Format="#,##0"/></Style>\\n' +
        ' <Style ss:ID="sCurrency"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><NumberFormat ss:Format="#,##0\\ \\&quot;đ\\&quot;"/></Style>\\n' +
        ' <Style ss:ID="sCurrencyRose"><Font ss:FontName="Calibri" ss:Bold="1" ss:Color="#991B1B"/><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><NumberFormat ss:Format="#,##0\\ \\&quot;đ\\&quot;"/></Style>\\n' +
        ' <Style ss:ID="sCurrencyEmerald"><Font ss:FontName="Calibri" ss:Bold="1" ss:Color="#065F46"/><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><NumberFormat ss:Format="#,##0\\ \\&quot;đ\\&quot;"/></Style>\\n' +
        '</Styles>\\n' +
        '<Worksheet ss:Name="Tong_Hop_Theo_Khoa">\\n' +
        ' <Table ss:DefaultRowHeight="20">\\n' +
        '  <Column ss:Width="40"/>\\n' +
        '  <Column ss:Width="100"/>\\n' +
        '  <Column ss:Width="110"/>\\n' +
        '  <Column ss:Width="110"/>\\n' +
        '  <Column ss:Width="110"/>\\n' +
        '  <Column ss:Width="110"/>\\n' +
        '  <Column ss:Width="80"/>\\n' +
        '  <Column ss:Width="170"/>\\n' +
        '  <Row ss:Height="26"><Cell ss:StyleID="sTitle"><Data ss:Type="String">BÁO CÁO TỔNG HỢP RÀ SOÁT TIỀN GIƯỜNG KT251 THEO KHOA</Data></Cell></Row>\\n' +
        '  <Row><Cell ss:StyleID="sSubtitle"><Data ss:Type="String">Đơn vị: ' + cleanHosp + ' · Xuất lúc: ' + dateStr + ' · Tác giả: Nguyễn Sơn Nam (Nsnnam)</Data></Cell></Row>\\n' +
        '  <Row><Cell ss:StyleID="sSubtitle"><Data ss:Type="String">Căn cứ: TT 39/2024/TT-BYT &amp; Hướng dẫn KT251 BHXH VN (Giữ lại 1 giường cao nhất)</Data></Cell></Row>\\n' +
        '  <Row/>\\n' +
        '  <Row ss:Height="24">\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">STT</Data></Cell>\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Khoa điều trị</Data></Cell>\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Tổng vi phạm</Data></Cell>\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Bị xuất toán</Data></Cell>\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Được giữ lại</Data></Cell>\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Gối đầu (&gt;=2N)</Data></Cell>\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Số BN</Data></Cell>\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Nguy cơ xuất toán (đ)</Data></Cell>\\n' +
        '  </Row>\\n' +
        deptRowsXml +
        ' </Table>\\n' +
        '</Worksheet>\\n' +
        '<Worksheet ss:Name="Danh_Sach_Chi_Tiet">\\n' +
        ' <Table ss:DefaultRowHeight="20">\\n' +
        '  <Column ss:Width="40"/>\\n' +
        '  <Column ss:Width="140"/>\\n' +
        '  <Column ss:Width="80"/>\\n' +
        '  <Column ss:Width="100"/>\\n' +
        '  <Column ss:Width="160"/>\\n' +
        '  <Column ss:Width="70"/>\\n' +
        '  <Column ss:Width="80"/>\\n' +
        '  <Column ss:Width="130"/>\\n' +
        '  <Column ss:Width="130"/>\\n' +
        '  <Column ss:Width="130"/>\\n' +
        '  <Column ss:Width="140"/>\\n' +
        '  <Column ss:Width="260"/>\\n' +
        '  <Column ss:Width="280"/>\\n' +
        '  <Row ss:Height="26"><Cell ss:StyleID="sTitle"><Data ss:Type="String">CHI TIẾT ĐỐI SOÁT CẢNH BÁO TIỀN GIƯỜNG &amp; GIƯỜNG NẰM GHÉP (KT251)</Data></Cell></Row>\\n' +
        '  <Row><Cell ss:StyleID="sSubtitle"><Data ss:Type="String">' + exportTitle + ' · Tổng số: ' + recordsToExport.length + ' ca · Nguy cơ xuất toán: ' + totalLoss.toLocaleString('vi-VN') + ' đ (Bị xuất toán: ' + totalRejected + ' ca, Giữ lại: ' + totalRetained + ' ca)</Data></Cell></Row>\\n' +
        '  <Row/>\\n' +
        '  <Row ss:Height="24">\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">STT</Data></Cell>\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Tình trạng xử lý</Data></Cell>\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Mã LK</Data></Cell>\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Mã BN</Data></Cell>\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Họ và tên</Data></Cell>\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Khoa</Data></Cell>\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Mã giường</Data></Cell>\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Bắt đầu (TH_YL)</Data></Cell>\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Kết thúc (KQ)</Data></Cell>\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Phân loại lỗi</Data></Cell>\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Tiền xuất toán (đ)</Data></Cell>\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Hồ sơ / Giường trùng</Data></Cell>\\n' +
        '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Gợi ý &amp; Chi tiết xử lý</Data></Cell>\\n' +
        '  </Row>\\n' +
        detailRowsXml +
        ' </Table>\\n' +
        '</Worksheet>\\n' +
        '</Workbook>';

      return xml;
    }

    function downloadFile(content, fileName, mimeType) {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    function exportFilteredToExcel() {
      const filtered = getFilteredRecords();
      if (!filtered.length) {
        alert('Không có dữ liệu phù hợp để xuất Excel!');
        return;
      }
      const title = 'Dữ liệu lọc đối chiếu KT251';
      const xml = generateExcelXml(filtered, title);
      const cleanName = hospitalTitle.trim().replace(/[\\s/\\\\?%*:|"<>]+/g, '_');
      const filename = 'BAO_CAO_LOC_GIUONG_KT251_' + cleanName + '_' + new Date().toISOString().slice(0, 10) + '.xls';
      downloadFile(xml, filename, 'application/vnd.ms-excel;charset=utf-8');
    }

    function exportAllToExcel() {
      if (!allViolations.length) {
        alert('Không có dữ liệu vi phạm để xuất Excel!');
        return;
      }
      const title = 'Toàn bộ danh sách rà soát giường KT251';
      const xml = generateExcelXml(allViolations, title);
      const cleanName = hospitalTitle.trim().replace(/[\\s/\\\\?%*:|"<>]+/g, '_');
      const filename = 'BAO_CAO_TOAN_BO_GIUONG_KT251_' + cleanName + '_' + new Date().toISOString().slice(0, 10) + '.xls';
      downloadFile(xml, filename, 'application/vnd.ms-excel;charset=utf-8');
    }

    // Khởi chạy render ban đầu
    applyFilters();
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

  // Xuất Báo cáo Markdown Chuyên Đề
  const handleExportMarkdown = () => {
    const todayStr = new Date().toLocaleDateString("vi-VN");
    const deptTable = stats.deptList
      .map(
        (d, idx) =>
          `| ${idx + 1} | **${d.khoa}** | **${d.count}** | **${d.rejected}** | **${d.retained}** | ${d.multiDay} | ${d.patientCount} | **${d.loss.toLocaleString("vi-VN")} đ** |`,
      )
      .join("\n");

    const mdContent = `# BÁO CÁO RÀ SOÁT CẢNH BÁO TIỀN GIƯỜNG & GIƯỜNG NẰM GHÉP (KT251)
## ĐƠN VỊ: ${hospitalName.toUpperCase()}
**Thời gian lập báo cáo:** ${todayStr}  
**Người thực hiện:** Nguyễn Sơn Nam (Nsnnam)  
**Công cụ rà soát:** Hệ thống **NsN_XMLcheck v${APP_META.version}**  
**Căn cứ pháp lý & Giám định:** Thông tư 39/2024/TT-BYT, Công văn rà soát nghiệp vụ KT251 BHXH Việt Nam.

---

### 1. TỔNG HỢP TOÀN VIỆN & NGUY CƠ XUẤT TOÁN THỰC TẾ
- **Tổng số dòng XML3 rà soát:** ${stats.totalRecords.toLocaleString("vi-VN")} dòng
- **Chi phí ngày giường (Nhóm 14, 15):** ${stats.bedCount.toLocaleString("vi-VN")} dòng (${stats.patientCount} BN nội trú)
- **Tổng số dòng phát hiện cảnh báo Giường bệnh:** **${stats.violationCount.toLocaleString("vi-VN")} dòng**
  - **Số lượt giường bị xuất toán (các giường phía sau):** **${stats.rejectedCount.toLocaleString("vi-VN")} dòng**
  - **Số lượt giường được giữ lại thanh toán (giá cao nhất/vào trước):** **${stats.retainedCount.toLocaleString("vi-VN")} dòng (0 đ xuất toán)**
  - Giường gối đầu liên tiếp (≥ 2 ngày): **${stats.multiDayCount.toLocaleString("vi-VN")} dòng**
  - Trùng mốc phút chuyển tiếp 12:00 (cùng BN): **${stats.minuteDupCount} lượt (Cảnh báo mốc giờ - 0 đ xuất toán)**
  - Giờ kê giường vượt quá giờ ra viện (NGAY_RA): **${stats.exceedDischargeCount} ca (Cảnh báo thủ tục - 0 đ xuất toán)**
  - Chồng lấn thời gian cùng BN: **${stats.multipleBedsCount} ca**
  - Thiếu mã giường: **${stats.missingBedCount} ca**
- **TỔNG NGUY CƠ XUẤT TOÁN BHYT THỰC TẾ:** **${stats.totalRefusal.toLocaleString("vi-VN")} VNĐ**

---

### 2. PHÂN TÍCH FILE KT251 CỦA BHXH & 4 GIẢI PHÁP GIẢM THIỂU XUẤT TOÁN
1. **Áp dụng nguyên tắc giữ lại 01 giường có giá trị cao nhất:**
   - Trong mỗi cụm trùng giường giữa các bệnh nhân khác nhau, cơ quan BHXH chấp thuận thanh toán 01 giường (ưu tiên giường có chi phí lớn nhất) và chỉ xuất toán giường còn lại. Nhờ đó, số tiền xuất toán thực tế đã giảm khoảng 50% so với việc cộng dồn toàn bộ các ca trùng.
2. **Loại trừ các trường hợp trùng thời gian dưới 4 giờ:**
   - Theo văn bản hướng dẫn chính thức số \`/TTKS-NV\` của BHXH Việt Nam, nằm ghép chỉ tính khi thời gian trùng từ 4 giờ trở lên. Đơn vị cần rà soát đối chiếu và lập biên bản giải trình loại trừ các ca trùng dưới 4 giờ do đặc thù bàn giao buồng bệnh, chuyển khoa.
3. **Giải trình lỗi trùng mốc phút 12:00 cùng một bệnh nhân:**
   - Lỗi này do phần mềm HIS tự động chia ngày y lệnh lúc 12:00. Bệnh nhân điều trị thực tế liên tục trên 1 giường duy nhất. Đơn vị giải trình kèm bệnh án gốc hoặc sử dụng công cụ NsN_XMLcheck để tự động lùi 1 phút (12:01) cho dòng tiếp theo để bảo toàn 100% chi phí.
4. **Chuẩn hóa thời gian ra viện:**
   - Trường hợp giờ kết thúc kê giường vượt giờ ra viện là lỗi logic hành chính, không gây trùng giường hoặc lạm dụng quỹ. Đơn vị chỉ cần chuẩn hóa khớp giờ trên XML1 để bảo vệ thanh toán.

---

### 3. BẢNG PHÂN BỔ NGUY CƠ THEO KHOA LÂM SÀNG
| STT | Khoa lâm sàng | Tổng vi phạm | Bị xuất toán | Được giữ lại | Gối đầu (≥2N) | Số BN | Nguy cơ xuất toán (VNĐ) |
| :-: | :--- | :-: | :-: | :-: | :-: | :-: | :--- |
${deptTable}

---

### 4. QUY TRÌNH CHUẨN HÓA DÀNH CHO ĐIỀU DƯỠNG & BÁC SĨ
1. **Quy tắc 1 phút chuyển tiếp:** Ngày trước kết thúc lúc 12:00 thì ngày tiếp theo bắt đầu từ 12:01.
2. **Kiểm tra buồng giường trống:** Không chọn mã giường đang có bệnh nhân khác nằm điều trị chưa làm thủ tục ra viện/chuyển khoa.
3. **Kiểm soát giờ ra viện:** Giờ kết thúc kê giường (NGAY_KQ) bắt buộc phải ≤ giờ ra viện (NGAY_RA).
4. **Nằm ghép bất khả kháng:** Phải tích áp tỷ lệ thanh toán 50% (ghép 2 người) hoặc 33% (ghép từ 3 người trở lên).

---
*Báo cáo được xuất tự động từ hệ thống NsN_XMLcheck v${APP_META.version}.*
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

  // Tải Slide PowerPoint trực tiếp sinh từ dữ liệu thực tế
  const [isGeneratingPptx, setIsGeneratingPptx] = useState(false);

  const handleDownloadSlidePptx = async () => {
    if (isGeneratingPptx) return;
    setIsGeneratingPptx(true);
    try {
      await generateAndDownloadDynamicPptx(stats, hospitalName);
    } catch (err) {
      console.error("Lỗi tạo slide PPTX:", err);
      alert("Đã xảy ra lỗi khi tạo slide PowerPoint. Vui lòng thử lại!");
    } finally {
      setIsGeneratingPptx(false);
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
            className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
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
                <div className="text-rose-600 font-medium">
                  Nguy cơ xuất toán KT251 (giữ lại 1 giường cao nhất):
                </div>
                <div className="text-base font-bold text-rose-700 font-mono">
                  {stats.totalRefusal.toLocaleString("vi-VN")} đ
                </div>
              </div>
            </div>

            {/* Chi tiết từng loại trạng thái */}
            <div className="grid grid-cols-4 gap-2 text-[11px]">
              <div className="rounded-lg bg-rose-50 p-2 border border-rose-200">
                <span className="text-rose-800 font-bold">Bị xuất toán:</span>
                <div className="font-mono font-bold text-rose-900 text-sm">
                  {stats.rejectedCount} dòng
                </div>
              </div>
              <div className="rounded-lg bg-emerald-50 p-2 border border-emerald-200">
                <span className="text-emerald-800 font-bold">Giữ lại (0đ XT):</span>
                <div className="font-mono font-bold text-emerald-900 text-sm">
                  {stats.retainedCount} dòng
                </div>
              </div>
              <div className="rounded-lg bg-amber-50 p-2 border border-amber-200">
                <span className="text-amber-800 font-bold">Gối đầu ≥ 2 ngày:</span>
                <div className="font-mono font-bold text-amber-900 text-sm">
                  {stats.multiDayCount} dòng
                </div>
              </div>
              <div className="rounded-lg bg-purple-50 p-2 border border-purple-200">
                <span className="text-purple-800 font-bold">Trùng phút / Giờ ra:</span>
                <div className="font-mono font-bold text-purple-900 text-sm">
                  {stats.minuteDupCount + stats.exceedDischargeCount} ca
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
                    Lọc theo khoa phòng &amp; xuất file Excel trực tiếp từ Infographic
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
                disabled={isGeneratingPptx}
                onClick={handleDownloadSlidePptx}
                className="flex items-center gap-3 rounded-xl border border-indigo-300 bg-indigo-50/60 p-3 text-left hover:bg-indigo-100/70 transition group shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="text-2xl group-hover:scale-110 transition">
                  {isGeneratingPptx ? "⏳" : "📽️"}
                </span>
                <div>
                  <div className="text-xs font-bold text-indigo-950">
                    {isGeneratingPptx
                      ? "Đang tạo Slide PPTX từ dữ liệu thực tế..."
                      : "Tải Slide PowerPoint (.pptx)"}
                  </div>
                  <div className="text-[11px] text-indigo-800">
                    10 slide 16:9 sinh động 100% từ dữ liệu import thực tế
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
