import pptxgen from "pptxgenjs";
import fileSaver from "file-saver";
import { APP_META } from "./meta";

const saveAs =
  typeof (fileSaver as unknown as { default?: typeof fileSaver }).default === "function"
    ? (fileSaver as unknown as { default: typeof fileSaver }).default
    : (fileSaver as unknown as { saveAs: typeof fileSaver }).saveAs || fileSaver;

export interface ReportStatsForPptx {
  totalRecords: number;
  bedCount: number;
  patientCount: number;
  violationCount: number;
  rejectedCount: number;
  retainedCount: number;
  multiDayCount: number;
  minuteDupCount: number;
  exceedDischargeCount: number;
  multipleBedsCount: number;
  missingBedCount: number;
  totalRefusal: number;
  deptList: Array<{
    khoa: string;
    count: number;
    rejected: number;
    retained: number;
    multiDay: number;
    patientCount: number;
    loss: number;
  }>;
  allViolations: Array<{
    MA_LK: string;
    MA_BN?: string;
    HO_TEN?: string;
    MA_KHOA?: string;
    MA_GIUONG?: string;
    NGAY_TH_YL?: string;
    NGAY_KQ?: string;
    bedWarningType?: string;
    isRetainedBed?: boolean;
    bedAuditAction?: string;
    potentialBedRefusal?: number;
  }>;
}

export async function generateAndDownloadDynamicPptx(
  stats: ReportStatsForPptx,
  hospitalName: string,
): Promise<void> {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Nguyễn Sơn Nam (Nsnnam)";
  pres.company = hospitalName || "Bệnh viện đa khoa";
  pres.subject = "Báo Cáo Rà Soát Giường Bệnh & Tiền Giường BHYT";
  pres.title = `Báo Cáo Rà Soát Tiền Giường KT251 - ${hospitalName}`;

  // Theme Colors
  const C_NAVY = "0F172A";
  const C_TEAL = "0D9488";
  const C_TEAL_LIGHT = "2DD4BF";
  const C_WHITE = "FFFFFF";
  const C_SLATE = "334155";
  const C_MUTED = "94A3B8";
  const C_BG = "F8FAFC";
  const C_CARD_BG = "FFFFFF";
  const C_ROSE = "E11D48";
  const C_EMERALD = "059669";
  const C_AMBER = "D97706";
  const C_BLUE = "2563EB";

  const todayStr = new Date().toLocaleDateString("vi-VN");

  // Helper for Slide Header
  const addHeader = (
    slide: pptxgen.Slide,
    title: string,
    category = "BÁO CÁO CHUYÊN ĐỀ THANH QUYẾT TOÁN BHYT",
  ) => {
    slide.addText(
      [
        {
          text: `${category.toUpperCase()} · ${hospitalName.toUpperCase()}\n`,
          options: { fontSize: 10, bold: true, color: C_TEAL },
        },
        { text: title, options: { fontSize: 18, bold: true, color: C_NAVY } },
      ],
      { x: 0.8, y: 0.35, w: 11.7, h: 0.9, fontFace: "Segoe UI", margin: 0 },
    );
  };

  // -------------------------------------------------------------
  // SLIDE 1: COVER
  // -------------------------------------------------------------
  const s1 = pres.addSlide();
  s1.background = { color: C_NAVY };

  s1.addText(
    [
      {
        text: "BÁO CÁO RÀ SOÁT CẢNH BÁO TIỀN GIƯỜNG & GIƯỜNG NẰM GHÉP (KT251)\n",
        options: { fontSize: 24, bold: true, color: C_WHITE },
      },
      {
        text: `ĐƠN VỊ: ${hospitalName.toUpperCase()}\n\n`,
        options: { fontSize: 17, bold: true, color: C_TEAL_LIGHT },
      },
      { text: `• Thời gian rà soát: ${todayStr}\n`, options: { fontSize: 12, color: C_MUTED } },
      {
        text: "• Người thực hiện: Nguyễn Sơn Nam (Nsnnam) — Múi giờ Asia/Ho_Chi_Minh (GMT+7)\n",
        options: { fontSize: 12, color: C_MUTED },
      },
      {
        text: `• Công cụ phân tích: Hệ thống NsN_XMLcheck v${APP_META.version} (Thuật toán rà soát dữ liệu thực tế)\n`,
        options: { fontSize: 12, color: C_MUTED },
      },
      {
        text: "• Căn cứ pháp lý: Thông tư 39/2024/TT-BYT, Nghị định 96/2023/NĐ-CP & Quy định kiểm soát KT251 BHXH",
        options: { fontSize: 12, color: C_MUTED },
      },
    ],
    { x: 1.0, y: 1.8, w: 11.3, h: 4.5, fontFace: "Segoe UI", margin: 0 },
  );

  // -------------------------------------------------------------
  // SLIDE 2: CĂN CỨ PHÁP LÝ & QUY ĐỊNH GIÁM ĐỊNH KT251
  // -------------------------------------------------------------
  const s2 = pres.addSlide();
  s2.background = { color: C_BG };
  addHeader(s2, "CĂN CỨ PHÁP LÝ & NGUYÊN TẮC GIÁM ĐỊNH XUẤT TOÁN BHYT (KT251)");

  const legalItems = [
    {
      title: "1. Thông tư 39/2024/TT-BYT về Giường nằm ghép",
      desc: "Quy định nguyên tắc thanh toán ngày giường nội trú: Nằm ghép 2 người thanh toán tối đa 50% đơn giá; ghép từ 3 người trở lên thanh toán tối đa 33% đơn giá. Cơ sở phải tích chọn đúng hệ số khi quá tải.",
      color: C_TEAL,
    },
    {
      title: "2. Hướng dẫn nghiệp vụ KT251 của BHXH Việt Nam",
      desc: "Quy định rõ tại Mục I Khoản 1: Hệ thống chỉ đánh dấu nằm ghép khi số giờ giao thoa giữa 2 hồ sơ lớn hơn 4.0 giờ (SO_GIO_GIAO > 4). Các ca giao thoa dưới 4 giờ là thời gian đệm bàn giao/chuyển khoa, không tính nằm ghép.",
      color: C_BLUE,
    },
    {
      title: "3. Nguyên tắc bảo lưu 01 giường hợp lệ có chi phí cao nhất",
      desc: "Khi phát hiện các ca bệnh trùng nhau cùng thời điểm, cơ quan BHXH bắt buộc chấp thuận thanh toán 01 giường (ưu tiên giường có đơn giá cao nhất hoặc vào viện trước) và chỉ xuất toán giường thứ 2 trở đi.",
      color: C_EMERALD,
    },
    {
      title: "4. Điều 35 Luật Khám bệnh, chữa bệnh 2023 (Nghĩa vụ cấp cứu)",
      desc: "Quy định cơ sở KCB không được từ chối hoặc chậm trễ tiếp nhận, cấp cứu người bệnh. Vượt giường kế hoạch do dịch bệnh hoặc cấp cứu đột xuất là căn cứ pháp lý quan trọng để giải trình bảo vệ chi phí.",
      color: C_AMBER,
    },
  ];

  legalItems.forEach((item, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 0.8 + col * 5.95;
    const y = 1.5 + row * 2.6;

    s2.addShape(pres.ShapeType.roundRect, {
      x,
      y,
      w: 5.75,
      h: 2.35,
      fill: { color: C_CARD_BG },
      line: { color: item.color, width: 2 },
      rectRadius: 0.15,
    });

    s2.addText(
      [
        { text: `${item.title}\n\n`, options: { fontSize: 12.5, bold: true, color: item.color } },
        { text: item.desc, options: { fontSize: 10.5, color: C_SLATE } },
      ],
      { x: x + 0.25, y: y + 0.15, w: 5.25, h: 2.0, fontFace: "Segoe UI", margin: 0 },
    );
  });

  // -------------------------------------------------------------
  // SLIDE 3: TỔNG QUAN DỮ LIỆU RÀ SOÁT THỰC TẾ
  // -------------------------------------------------------------
  const s3 = pres.addSlide();
  s3.background = { color: C_BG };
  addHeader(s3, "TỔNG QUAN KẾT QUẢ RÀ SOÁT DỮ LIỆU THỰC TẾ TỪ FILE IMPORT");

  const kpis = [
    {
      title: "TỔNG DÒNG XML3 RÀ SOÁT",
      val: stats.totalRecords.toLocaleString("vi-VN"),
      sub: `Bao gồm ${stats.bedCount.toLocaleString("vi-VN")} dòng tiền giường (${stats.patientCount} BN nội trú)`,
      color: C_BLUE,
    },
    {
      title: "DÒNG CẢNH BÁO GIƯỜNG",
      val: stats.violationCount.toLocaleString("vi-VN"),
      sub: `Chiếm ${stats.bedCount > 0 ? ((stats.violationCount / stats.bedCount) * 100).toFixed(1) : 0}% tổng số lượt kê giường`,
      color: C_ROSE,
    },
    {
      title: "SỐ LƯỢT XUẤT TOÁN THẬT",
      val: stats.rejectedCount.toLocaleString("vi-VN"),
      sub: `Đã loại trừ ${stats.retainedCount.toLocaleString("vi-VN")} giường được giữ lại 0đ`,
      color: C_AMBER,
    },
    {
      title: "NGUY CƠ XUẤT TOÁN BHYT",
      val: `${(stats.totalRefusal / 1000000).toFixed(1)} TR Đ`,
      sub: `${stats.totalRefusal.toLocaleString("vi-VN")} VNĐ có thể bị cơ quan BHXH từ chối`,
      color: C_ROSE,
    },
  ];

  kpis.forEach((kpi, idx) => {
    const x = 0.8 + idx * 2.98;
    s3.addShape(pres.ShapeType.roundRect, {
      x,
      y: 1.5,
      w: 2.8,
      h: 2.0,
      fill: { color: C_CARD_BG },
      line: { color: kpi.color, width: 2 },
      rectRadius: 0.15,
    });
    s3.addText(
      [
        { text: `${kpi.title}\n`, options: { fontSize: 9.5, bold: true, color: C_MUTED } },
        { text: `${kpi.val}\n\n`, options: { fontSize: 22, bold: true, color: kpi.color } },
        { text: kpi.sub, options: { fontSize: 9.5, color: C_SLATE } },
      ],
      { x: x + 0.15, y: 1.62, w: 2.5, h: 1.75, fontFace: "Segoe UI", margin: 0 },
    );
  });

  // Summary box below KPIs
  s3.addShape(pres.ShapeType.roundRect, {
    x: 0.8,
    y: 3.75,
    w: 11.7,
    h: 3.1,
    fill: { color: C_CARD_BG },
    line: { color: "CBD5E1", width: 1 },
    rectRadius: 0.15,
  });

  s3.addText(
    [
      {
        text: "ĐÁNH GIÁ CHUNG VỀ TÌNH TRẠNG DỮ LIỆU ĐỢT NÀY:\n",
        options: { fontSize: 13, bold: true, color: C_NAVY },
      },
      {
        text: `• Dữ liệu rà soát ghi nhận tổng số ${stats.totalRecords.toLocaleString("vi-VN")} dòng XML3 với ${stats.bedCount.toLocaleString("vi-VN")} dòng tiền giường (Nhóm 14, 15).\n`,
        options: { fontSize: 11, color: C_SLATE },
      },
      {
        text: `• Phát hiện ${stats.violationCount.toLocaleString("vi-VN")} dòng vi phạm quy tắc tiền giường; trong đó có ${stats.rejectedCount.toLocaleString("vi-VN")} dòng có nguy cơ bị xuất toán trực tiếp với tổng số tiền ${stats.totalRefusal.toLocaleString("vi-VN")} VNĐ.\n`,
        options: { fontSize: 11, color: C_SLATE },
      },
      {
        text: `• Áp dụng quy tắc giám định bảo lưu 01 giường hợp lệ giá cao nhất, Bệnh viện đã tự động bảo vệ được ${stats.retainedCount.toLocaleString("vi-VN")} lượt giường (0 đ xuất toán), giảm thiểu gần 50% số tiền phạt so với việc cộng dồn toàn bộ.\n`,
        options: { fontSize: 11, color: C_SLATE },
      },
      {
        text: `• Ghi nhận ${stats.minuteDupCount} ca trùng mốc phút 12:00 và ${stats.exceedDischargeCount} ca kê giường vượt giờ ra viện. Đây là các cảnh báo lỗi thủ tục hành chính/phần mềm, không làm phát sinh lạm dụng quỹ BHYT.`,
        options: { fontSize: 11, color: C_SLATE },
      },
    ],
    { x: 1.1, y: 3.9, w: 11.1, h: 2.8, fontFace: "Segoe UI", margin: 0, lineSpacing: 18 },
  );

  // -------------------------------------------------------------
  // SLIDE 4: PHÂN TÍCH 4 NHÓM LỖI CỐT LÕI
  // -------------------------------------------------------------
  const s4 = pres.addSlide();
  s4.background = { color: C_BG };
  addHeader(s4, "PHÂN TÍCH 4 NHÓM LỖI TIỀN GIƯỜNG THỰC TẾ TRONG ĐỢT NẠP");

  const faultGroups = [
    {
      title: `1. Giường gối đầu liên tiếp (≥2 ngày): ${stats.multiDayCount} dòng`,
      desc: "Các bệnh nhân khác nhau cùng nằm chung 1 mã giường kéo dài qua nhiều ngày liên tiếp do điều dưỡng quên thao tác trả giường bệnh nhân cũ trên phần mềm HIS trước khi tiếp nhận bệnh nhân mới.",
      impact: "Hậu quả: BHXH quét tự động và xuất toán 100% tiền giường của các bệnh nhân vào sau.",
      color: C_ROSE,
    },
    {
      title: `2. Trùng mốc phút 12:00 cùng BN: ${stats.minuteDupCount} lượt`,
      desc: "Bệnh nhân nằm 1 buồng liên tục nhiều ngày, nhưng phần mềm HIS tự động chia ngày y lệnh lúc 12:00 (ngày cũ kết thúc 12:00, ngày mới bắt đầu 12:00) dẫn đến cảnh báo trùng mốc giờ.",
      impact:
        "Giải pháp: Khẳng định bệnh nhân chỉ nằm 1 giường, trích lục bệnh án gốc để giải trình 0đ xuất toán.",
      color: C_AMBER,
    },
    {
      title: `3. Kê giường vượt giờ ra viện: ${stats.exceedDischargeCount} ca`,
      desc: "Thời gian kết thúc kê giường NGAY_KQ muộn hơn thời gian ra viện NGAY_RA của bệnh nhân (thường lệch 15-30 phút do thời điểm in bảng kê viện phí).",
      impact:
        "Bản chất: Lỗi logic thời gian hành chính trong XML, không lạm dụng quỹ, cần chuẩn hóa giờ trên XML1.",
      color: C_BLUE,
    },
    {
      title: `4. Nằm ghép thật nhưng kê 100% đơn giá`,
      desc: "Buồng bệnh quá tải thực tế kê ghép 2 hoặc 3 bệnh nhân cùng nằm chung 1 giường nhưng điều dưỡng không tích chọn hệ số giường ghép 50% hoặc 33% theo Thông tư 39/2024.",
      impact:
        "Nguy cơ: BHXH kiểm tra bệnh án và truy thu phần chênh lệch tỷ lệ kê khai sai quy định.",
      color: C_EMERALD,
    },
  ];

  faultGroups.forEach((g, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 0.8 + col * 5.95;
    const y = 1.5 + row * 2.6;

    s4.addShape(pres.ShapeType.roundRect, {
      x,
      y,
      w: 5.75,
      h: 2.35,
      fill: { color: C_CARD_BG },
      line: { color: g.color, width: 2 },
      rectRadius: 0.15,
    });

    s4.addText(
      [
        { text: `${g.title}\n\n`, options: { fontSize: 12, bold: true, color: g.color } },
        { text: `${g.desc}\n\n`, options: { fontSize: 10.5, color: C_SLATE } },
        { text: `👉 ${g.impact}`, options: { fontSize: 10.5, bold: true, color: C_NAVY } },
      ],
      { x: x + 0.25, y: y + 0.15, w: 5.25, h: 2.05, fontFace: "Segoe UI", margin: 0 },
    );
  });

  // -------------------------------------------------------------
  // SLIDE 5: THỐNG KÊ CHI TIẾT THEO KHOA LÂM SÀNG
  // -------------------------------------------------------------
  const s5 = pres.addSlide();
  s5.background = { color: C_BG };
  addHeader(s5, "THỐNG KÊ NGUY CƠ XUẤT TOÁN THEO KHOA LÂM SÀNG THỰC TẾ");

  const deptRows: pptxgen.TableRow[] = [
    [
      {
        text: "STT",
        options: { bold: true, fill: { color: "1E3A8A" }, color: C_WHITE, align: "center" },
      },
      { text: "Khoa lâm sàng", options: { bold: true, fill: { color: "1E3A8A" }, color: C_WHITE } },
      {
        text: "Tổng vi phạm",
        options: { bold: true, fill: { color: "1E3A8A" }, color: C_WHITE, align: "center" },
      },
      {
        text: "Bị xuất toán",
        options: { bold: true, fill: { color: "1E3A8A" }, color: C_WHITE, align: "center" },
      },
      {
        text: "Được giữ lại",
        options: { bold: true, fill: { color: "1E3A8A" }, color: C_WHITE, align: "center" },
      },
      {
        text: "Gối đầu (≥2N)",
        options: { bold: true, fill: { color: "1E3A8A" }, color: C_WHITE, align: "center" },
      },
      {
        text: "Số BN",
        options: { bold: true, fill: { color: "1E3A8A" }, color: C_WHITE, align: "center" },
      },
      {
        text: "Tiền xuất toán (VNĐ)",
        options: { bold: true, fill: { color: "1E3A8A" }, color: C_WHITE, align: "right" },
      },
    ],
  ];

  const topDepts = stats.deptList.slice(0, 8);
  if (topDepts.length === 0) {
    deptRows.push([
      { text: "1", options: { align: "center" } },
      { text: "Không có vi phạm ghi nhận" },
      { text: "0", options: { align: "center" } },
      { text: "0", options: { align: "center" } },
      { text: "0", options: { align: "center" } },
      { text: "0", options: { align: "center" } },
      { text: "0", options: { align: "center" } },
      { text: "0 đ", options: { align: "right" } },
    ]);
  } else {
    topDepts.forEach((d, idx) => {
      deptRows.push([
        { text: String(idx + 1), options: { align: "center" } },
        { text: d.khoa, options: { bold: true } },
        { text: d.count.toLocaleString("vi-VN"), options: { align: "center", bold: true } },
        {
          text: d.rejected.toLocaleString("vi-VN"),
          options: { align: "center", color: C_ROSE, bold: true },
        },
        {
          text: d.retained.toLocaleString("vi-VN"),
          options: { align: "center", color: C_EMERALD, bold: true },
        },
        { text: d.multiDay.toLocaleString("vi-VN"), options: { align: "center", color: C_AMBER } },
        { text: d.patientCount.toLocaleString("vi-VN"), options: { align: "center" } },
        {
          text: `${d.loss.toLocaleString("vi-VN")} đ`,
          options: { align: "right", bold: true, color: C_ROSE },
        },
      ]);
    });
  }

  s5.addTable(deptRows, {
    x: 0.8,
    y: 1.5,
    w: 11.7,
    colW: [0.6, 2.8, 1.3, 1.3, 1.3, 1.3, 1.0, 2.1],
    fontSize: 9.5,
    fontFace: "Segoe UI",
    rowH: 0.32,
    border: { color: "CBD5E1", pt: 1 },
  });

  s5.addText(
    "* Ghi chú: Hiển thị các khoa trọng điểm có phát sinh cảnh báo. Chi tiết từng hồ sơ bệnh án tra cứu trong Báo cáo Excel hoặc Infographic HTML đi kèm.",
    {
      x: 0.8,
      y: 5.8,
      w: 11.7,
      h: 0.4,
      fontSize: 9.5,
      fontFace: "Segoe UI",
      color: C_MUTED,
      italic: true,
    },
  );

  // -------------------------------------------------------------
  // SLIDE 6: ĐIỂM NÓNG: CÁC MÃ GIƯỜNG VI PHẠM THỰC TẾ
  // -------------------------------------------------------------
  const s6 = pres.addSlide();
  s6.background = { color: C_BG };
  addHeader(s6, "ĐIỂM NÓNG: CÁC MÃ BUỒNG/GIƯỜNG VI PHẠM GỐI ĐẦU NHIỀU NHẤT");

  // Calculate top beds from actual allViolations
  const bedCountMap = new Map<
    string,
    { khoa: string; giuong: string; count: number; loss: number; bns: Set<string> }
  >();
  stats.allViolations.forEach((v) => {
    const k = `${v.MA_KHOA || "KHOA"}-${v.MA_GIUONG || "GIUONG"}`;
    let item = bedCountMap.get(k);
    if (!item) {
      item = {
        khoa: v.MA_KHOA || "—",
        giuong: v.MA_GIUONG || "—",
        count: 0,
        loss: 0,
        bns: new Set(),
      };
      bedCountMap.set(k, item);
    }
    item.count++;
    item.loss += v.potentialBedRefusal || 0;
    if (v.MA_BN) item.bns.add(v.MA_BN);
  });

  const sortedTopBeds = Array.from(bedCountMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const bedTableRows: pptxgen.TableRow[] = [
    [
      {
        text: "STT",
        options: { bold: true, fill: { color: "0F766E" }, color: C_WHITE, align: "center" },
      },
      { text: "Khoa lâm sàng", options: { bold: true, fill: { color: "0F766E" }, color: C_WHITE } },
      {
        text: "Mã buồng / Giường",
        options: { bold: true, fill: { color: "0F766E" }, color: C_WHITE, align: "center" },
      },
      {
        text: "Số lượt trùng",
        options: { bold: true, fill: { color: "0F766E" }, color: C_WHITE, align: "center" },
      },
      {
        text: "Số BN liên quan",
        options: { bold: true, fill: { color: "0F766E" }, color: C_WHITE, align: "center" },
      },
      {
        text: "Tiền xuất toán liên quan",
        options: { bold: true, fill: { color: "0F766E" }, color: C_WHITE, align: "right" },
      },
      {
        text: "Đánh giá mức độ rủi ro",
        options: { bold: true, fill: { color: "0F766E" }, color: C_WHITE, align: "center" },
      },
    ],
  ];

  if (sortedTopBeds.length === 0) {
    bedTableRows.push([
      { text: "1", options: { align: "center" } },
      { text: "Không có mã giường vi phạm" },
      { text: "—", options: { align: "center" } },
      { text: "0", options: { align: "center" } },
      { text: "0", options: { align: "center" } },
      { text: "0 đ", options: { align: "right" } },
      { text: "Bình thường", options: { align: "center" } },
    ]);
  } else {
    sortedTopBeds.forEach((b, idx) => {
      bedTableRows.push([
        { text: String(idx + 1), options: { align: "center" } },
        { text: b.khoa, options: { bold: true } },
        { text: b.giuong, options: { bold: true, color: C_TEAL, align: "center" } },
        { text: b.count.toLocaleString("vi-VN"), options: { align: "center", bold: true } },
        { text: b.bns.size.toLocaleString("vi-VN"), options: { align: "center" } },
        {
          text: `${b.loss.toLocaleString("vi-VN")} đ`,
          options: { align: "right", bold: true, color: C_ROSE },
        },
        {
          text: b.count >= 5 ? "🚨 Rất cao (Gối đầu)" : "⚠️ Cần rà soát",
          options: { align: "center", bold: true, color: b.count >= 5 ? C_ROSE : C_AMBER },
        },
      ]);
    });
  }

  s6.addTable(bedTableRows, {
    x: 0.8,
    y: 1.5,
    w: 11.7,
    colW: [0.6, 2.5, 2.2, 1.4, 1.4, 2.0, 1.6],
    fontSize: 9.5,
    fontFace: "Segoe UI",
    rowH: 0.32,
    border: { color: "CBD5E1", pt: 1 },
  });

  s6.addText(
    "* Khuyến nghị: Các buồng giường gối đầu nhiều lượt cần được kiểm tra lịch sử xếp giường trên HIS, thu hồi và chuẩn hóa trước khi ký số chốt đợt thanh toán.",
    {
      x: 0.8,
      y: 5.8,
      w: 11.7,
      h: 0.4,
      fontSize: 9.5,
      fontFace: "Segoe UI",
      color: C_MUTED,
      italic: true,
    },
  );

  // -------------------------------------------------------------
  // SLIDE 7: PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ
  // -------------------------------------------------------------
  const s7 = pres.addSlide();
  s7.background = { color: C_BG };
  addHeader(s7, "PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE ANALYSIS)");

  const rootCauses = [
    {
      num: "01",
      title: "Chưa trả giường trên HIS trước khi nhận người mới",
      desc: "Điều dưỡng buồng bệnh khi làm thủ tục cho bệnh nhân ra viện chỉ xuất viện trên hồ sơ giấy tờ, quên thao tác bấm 'Trả giường' trên phần mềm HIS. Khi bệnh nhân mới vào buồng, điều dưỡng tiếp tục xếp cùng mã giường cũ dẫn đến đan xen gối đầu kéo dài.",
      color: C_ROSE,
    },
    {
      num: "02",
      title: "Thuật toán HIS ngắt ca trực tự động mốc 12:00",
      desc: "Phần mềm quản lý bệnh viện tự động chốt chi phí ngày giường lúc 12:00 trưa hàng ngày. Do lấy mốc giờ tròn chẵn, giờ kết thúc ngày cũ trùng chính xác với giờ bắt đầu ngày mới dẫn đến việc Cổng giám định BHXH quét lỗi trùng thời gian.",
      color: C_AMBER,
    },
    {
      num: "03",
      title: "Thời gian in bảng kê chi phí trễ hơn giờ ra viện",
      desc: "Bệnh nhân hoàn tất thủ tục xuất viện lúc 09:00 sáng nhưng bảng kê chi phí tiền giường XML3 được in hoặc ký số lúc 09:30, tạo ra khoảng chênh lệch thời gian NGAY_KQ > NGAY_RA khiến Cổng BHXH báo lỗi logic hành chính.",
      color: C_BLUE,
    },
    {
      num: "04",
      title: "Thiếu công cụ rà soát tự động trước khi đóng hồ sơ",
      desc: "Các khoa lâm sàng chưa có công cụ kiểm tra tự động chéo trước khi đóng bệnh án gửi lên Cổng BHYT; việc rà soát hoàn toàn thủ công bằng mắt thường trên hàng nghìn dòng chi phí dẫn đến bỏ sót các ca trùng giường phức tạp.",
      color: C_TEAL,
    },
  ];

  rootCauses.forEach((rc, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 0.8 + col * 5.95;
    const y = 1.5 + row * 2.6;

    s7.addShape(pres.ShapeType.roundRect, {
      x,
      y,
      w: 5.75,
      h: 2.35,
      fill: { color: C_CARD_BG },
      line: { color: rc.color, width: 2 },
      rectRadius: 0.15,
    });

    s7.addText(
      [
        {
          text: `[${rc.num}] ${rc.title}\n\n`,
          options: { fontSize: 12, bold: true, color: rc.color },
        },
        { text: rc.desc, options: { fontSize: 10.5, color: C_SLATE } },
      ],
      { x: x + 0.25, y: y + 0.15, w: 5.25, h: 2.05, fontFace: "Segoe UI", margin: 0 },
    );
  });

  // -------------------------------------------------------------
  // SLIDE 8: HƯỚNG DẪN KHỐI CHUYÊN MÔN
  // -------------------------------------------------------------
  const s8 = pres.addSlide();
  s8.background = { color: C_BG };
  addHeader(s8, "HƯỚNG DẪN KHỐI CHUYÊN MÔN: NGUYÊN TẮC CHUẨN HÓA KÊ GIƯỜNG");

  const guidelines = [
    {
      title: "✅ QUY TẮC 1: BẮT BUỘC TRẢ GIƯỜNG TRÊN PHẦN MỀM HIS",
      body: "• Ngay khi bệnh nhân ra viện hoặc chuyển khoa, điều dưỡng buồng bệnh phải thực hiện thao tác trả giường trên HIS.\n• Tuyệt đối không gán bệnh nhân mới vào giường khi bệnh nhân cũ chưa được chốt trả giường hoàn tất.",
      color: C_EMERALD,
    },
    {
      title: "✅ QUY TẮC 2: ĐIỀU CHỈNH MỐC PHÚT KÊ GIƯỜNG KHÔNG TRÙNG",
      body: "• Ngày giường thứ nhất: Kết thúc lúc 12:00 (hoặc giờ chuyển ca).\n• Ngày giường thứ hai: Bắt đầu lúc 12:01 (cách 1 phút so với ngày cũ) để bảo đảm thời gian liên tục mà không bao giờ bị Cổng BHXH quét trùng mốc giờ.",
      color: C_BLUE,
    },
    {
      title: "✅ QUY TẮC 3: ĐỒNG BỘ GIỜ KÊ GIƯỜNG VÀ GIỜ RA VIỆN",
      body: "• Thời gian kết thúc kê giường (NGAY_KQ) phải nhỏ hơn hoặc bằng thời gian ra viện (NGAY_RA) ghi nhận trên XML1.\n• Sử dụng nút 'Đặt NGAY_KQ = Giờ ra viện' trên NsN_XMLcheck để tự động chuẩn hóa hàng loạt trước khi ký số.",
      color: C_TEAL,
    },
    {
      title: "✅ QUY TẮC 4: TÍCH CHỌN ĐÚNG HỆ SỐ NẰM GHÉP KHI QUÁ TẢI",
      body: "• Nếu buồng bệnh quá tải thực tế phải nằm ghép 2 người: Tích chọn tỷ lệ thanh toán 50% theo Thông tư 39/2024.\n• Nếu nằm ghép 3 người trở lên: Tích chọn tỷ lệ thanh toán 33% để minh bạch dữ liệu, tránh bị xuất toán toàn bộ.",
      color: C_AMBER,
    },
  ];

  guidelines.forEach((g, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 0.8 + col * 5.95;
    const y = 1.5 + row * 2.6;

    s8.addShape(pres.ShapeType.roundRect, {
      x,
      y,
      w: 5.75,
      h: 2.35,
      fill: { color: C_CARD_BG },
      line: { color: g.color, width: 2 },
      rectRadius: 0.15,
    });

    s8.addText(
      [
        { text: `${g.title}\n\n`, options: { fontSize: 11.5, bold: true, color: g.color } },
        { text: g.body, options: { fontSize: 10.5, color: C_SLATE } },
      ],
      {
        x: x + 0.25,
        y: y + 0.15,
        w: 5.25,
        h: 2.05,
        fontFace: "Segoe UI",
        margin: 0,
        lineSpacing: 16,
      },
    );
  });

  // -------------------------------------------------------------
  // SLIDE 9: ỨNG DỤNG CÔNG CỤ NSN_XMLCHECK TRONG KIỂM SOÁT
  // -------------------------------------------------------------
  const s9 = pres.addSlide();
  s9.background = { color: C_BG };
  addHeader(s9, `ỨNG DỤNG HỆ THỐNG NsN_XMLcheck v${APP_META.version} TRONG KIỂM SOÁT DỮ LIỆU`);

  const toolFeatures = [
    {
      title: "🔍 1. Tự Động Quét & Đối Soát KT251",
      desc: "Quét sạch 100% các dòng kê giường, phát hiện tức thì các ca gối đầu nhiều ngày, trùng mốc phút 12:00, vượt giờ ra viện và tính toán chính xác số tiền có nguy cơ xuất toán.",
      color: C_TEAL,
    },
    {
      title: "🎯 2. Bảo Lưu 01 Giường Hợp Lệ (0đ XT)",
      desc: "Tự động phân nhóm và giữ lại 01 giường có đơn giá cao nhất hoặc vào viện trước (0 đ xuất toán), chỉ xuất toán các giường phía sau, phản ánh trung thực thực tế giám định BHXH.",
      color: C_EMERALD,
    },
    {
      title: "⚡ 3. Sửa Trực Tiếp & Lập Kế Hoạch Sửa",
      desc: "Cung cấp các nút sửa nhanh: '+1p vào TH_YL', '-1p ở NGAY_KQ', 'Đặt NGAY_KQ = Giờ ra viện', trừ lùi phút tùy chọn và hỗ trợ giữ Shift/Ctrl để chọn hàng loạt hồ sơ cần chỉnh sửa.",
      color: C_BLUE,
    },
    {
      title: "📊 4. Xuất Báo Cáo, Slide & Infographic Động",
      desc: "Sinh tự động Báo cáo chuyên đề (.md), Infographic tương tác (.html), Slide PowerPoint (.pptx) và Bảng đối chiếu Excel chạy 100% theo dữ liệu thực tế vừa import.",
      color: C_AMBER,
    },
  ];

  toolFeatures.forEach((f, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 0.8 + col * 5.95;
    const y = 1.5 + row * 2.6;

    s9.addShape(pres.ShapeType.roundRect, {
      x,
      y,
      w: 5.75,
      h: 2.35,
      fill: { color: C_CARD_BG },
      line: { color: f.color, width: 2 },
      rectRadius: 0.15,
    });

    s9.addText(
      [
        { text: `${f.title}\n\n`, options: { fontSize: 12, bold: true, color: f.color } },
        { text: f.desc, options: { fontSize: 10.5, color: C_SLATE } },
      ],
      {
        x: x + 0.25,
        y: y + 0.15,
        w: 5.25,
        h: 2.05,
        fontFace: "Segoe UI",
        margin: 0,
      },
    );
  });

  // -------------------------------------------------------------
  // SLIDE 10: KIẾN NGHỊ BAN GIÁM ĐỐC & KẾ HOẠCH HÀNH ĐỘNG
  // (Thiết kế 3 Cột Card Độc Lập - Cực kỳ thoáng, không tràn khung)
  // -------------------------------------------------------------
  const s10 = pres.addSlide();
  s10.background = { color: C_BG };
  addHeader(s10, "KIẾN NGHỊ BAN GIÁM ĐỐC & KẾ HOẠCH HÀNH ĐỘNG CẤP BÁCH");

  const actionColumns = [
    {
      title: "1. Khối Lâm Sàng & Điều Dưỡng",
      subtitle: "Quản trị buồng bệnh & Xếp giường",
      color: C_TEAL,
      points: [
        "Chấn chỉnh điều dưỡng trưởng các khoa điểm nóng; đưa chỉ số trùng giường vào đánh giá thi đua tháng.",
        "Nghiêm cấm xếp đè BN mới vào mã giường cũ khi chưa hoàn thành thao tác trả giường trên HIS.",
        "Tích chọn đúng hệ số nằm ghép 50% hoặc 33% theo TT 39/2024 khi buồng bệnh quá tải thực tế.",
      ],
    },
    {
      title: "2. Phòng KHTH & Giám Định",
      subtitle: "Kiểm soát trước cổng & Pháp lý",
      color: C_BLUE,
      points: [
        "Ứng dụng NsN_XMLcheck quét chéo dữ liệu định kỳ hàng ngày/tuần trước khi đẩy cổng BHYT.",
        "Xây dựng biên bản giải trình các ca trùng dưới 4 giờ theo đúng hướng dẫn kiểm soát của BHXH VN.",
        "Lập hồ sơ bảo lưu cấp cứu quá tải căn cứ Điều 35 Luật Khám chữa bệnh 2023 để giữ 100% chi phí.",
      ],
    },
    {
      title: "3. Phòng Công Nghệ Thông Tin",
      subtitle: "Chuẩn hóa thuật toán HIS",
      color: C_EMERALD,
      points: [
        "Cập nhật cấu hình HIS tự động tách ngày điều trị lúc 12:01 (thay vì 12:00) triệt tiêu lỗi trùng mốc phút.",
        "Cài đặt cảnh báo pop-up trên HIS khi điều dưỡng xếp người bệnh mới vào giường đang có BN nằm.",
        "Tự động đồng bộ giờ kết thúc giường bằng giờ ra viện (NGAY_KQ = NGAY_RA) khi in bảng kê.",
      ],
    },
  ];

  actionColumns.forEach((col, idx) => {
    const x = 0.8 + idx * 4.0;
    const y = 1.5;
    const w = 3.7;
    const h = 5.2;

    // Card background
    s10.addShape(pres.ShapeType.roundRect, {
      x,
      y,
      w,
      h,
      fill: { color: C_CARD_BG },
      line: { color: col.color, width: 2 },
      rectRadius: 0.15,
    });

    // Card Header Bar
    s10.addShape(pres.ShapeType.roundRect, {
      x: x + 0.15,
      y: y + 0.15,
      w: w - 0.3,
      h: 0.85,
      fill: { color: col.color },
      line: { color: col.color },
      rectRadius: 0.1,
    });

    s10.addText(
      [
        { text: `${col.title}\n`, options: { fontSize: 11, bold: true, color: C_WHITE } },
        { text: col.subtitle, options: { fontSize: 9.5, color: "E2E8F0" } },
      ],
      {
        x: x + 0.25,
        y: y + 0.22,
        w: w - 0.5,
        h: 0.75,
        fontFace: "Segoe UI",
        margin: 0,
        align: "center",
      },
    );

    // Card Body Points
    const textRuns = col.points.flatMap((p, pIdx) => [
      { text: `• Điểm ${pIdx + 1}: `, options: { fontSize: 10, bold: true, color: C_NAVY } },
      { text: `${p}\n\n`, options: { fontSize: 9.5, color: C_SLATE } },
    ]);

    s10.addText(textRuns, {
      x: x + 0.25,
      y: y + 1.15,
      w: w - 0.5,
      h: 3.8,
      fontFace: "Segoe UI",
      margin: 0,
      lineSpacing: 14,
    });
  });

  // Trigger download directly in browser via safe Blob + saveAs (chống lỗi "Failed - No file" trên Chrome do revokeObjectURL sớm)
  const cleanName = (hospitalName || "Lạc_Việt").trim().replace(/[\s/\\?%*:|"<>]+/g, "_");
  const fileName = `SLIDE_BAO_CAO_GIUONG_GHEP_VA_TIEN_GIUONG_${cleanName}.pptx`;
  try {
    const blob = (await pres.write({ outputType: "blob" })) as Blob;
    saveAs(blob, fileName);
  } catch (err) {
    console.warn("Lỗi xuất blob pptx, thử lại với writeFile:", err);
    await pres.writeFile({ fileName });
  }
}
