import ExcelJS from "exceljs";
import fileSaver from "file-saver";
import { formatTimestampForFilename, formatXmlDateTime } from "./timezone.ts";
import type { BatchAnalysis, ValidationWarning, Xml3Record, PatientInfo } from "./xml3-duration.ts";
import { parseXmlDateTime } from "./xml3-duration.ts";

const saveAs =
  typeof fileSaver === "function"
    ? fileSaver
    : (fileSaver as unknown as { saveAs: typeof fileSaver }).saveAs || fileSaver;

function styleSheet(sheet: ExcelJS.Worksheet) {
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0F766E" } };
  sheet.getRow(1).alignment = { vertical: "middle", wrapText: true };
  sheet.getRow(1).height = 30;
  sheet.autoFilter = {
    from: "A1",
    to: `${String.fromCharCode(64 + Math.min(sheet.columnCount, 26))}1`,
  };
}

function fitColumns(sheet: ExcelJS.Worksheet) {
  for (const column of sheet.columns) {
    let width = 12;
    column.eachCell?.((cell) => {
      width = Math.max(width, String(cell.value ?? "").length + 2);
    });
    column.width = Math.min(width, 48);
  }
}

function detailRows(records: Xml3Record[]) {
  return records.map((record) => ({
    Trạng_thái: record.hasDuplicateMachineWarning
      ? "TRÙNG MÁY"
      : record.hasZ000Warning
        ? record.detail.includes("Z30.1")
          ? "Z30.1"
          : "Z00.0"
        : record.hasOrderWarning
          ? "SAI THỨ TỰ"
          : record.hasEqualWarning
            ? "TRÙNG MỐC"
            : record.hasBedWarning
              ? record.bedWarningType === "bed-sharing"
                ? (record.bedSharingCount ?? 2) >= 3
                  ? "GHÉP 3+ NGƯỜI"
                  : "GHÉP 2 NGƯỜI"
                : record.bedWarningType === "missing-bed-code"
                  ? "THIẾU MÃ GIƯỜNG"
                  : "TRÙNG GIƯỜNG"
              : record.hasTtThauWarning
                ? "TT_THAU"
                : record.hasMaMayWarning
                  ? "MÃ MÁY"
                  : record.status === "warning"
                    ? "CB"
                    : record.status === "ok"
                      ? "Đạt"
                      : record.status,
    MA_LK: record.MA_LK,
    HO_TEN: record.HO_TEN,
    MA_BN: record.MA_BN,
    So_phut: record.durationMinutes ?? "",
    Vuot_nguong_phut:
      record.status === "warning" && record.durationMinutes !== null
        ? Math.round((record.durationMinutes - (record.serviceRule?.maxMinutes ?? 70)) * 100) / 100
        : "",
    Chi_tiet: record.detail,
    MA_DICH_VU: record.MA_DICH_VU,
    MA_VAT_TU: record.MA_VAT_TU,
    TEN_DICH_VU: record.TEN_DICH_VU,
    TEN_VAT_TU: record.TEN_VAT_TU,
    MA_NHOM: record.MA_NHOM,
    TT_THAU: record.TT_THAU || "",
    MA_MAY: record.MA_MAY || "",
    MA_KHOA: record.MA_KHOA,
    MA_GIUONG: record.MA_GIUONG,
    SO_LUONG: record.SO_LUONG ?? "",
    DON_GIA: record.DON_GIA ?? "",
    TYLE_TT: record.TYLE_TT ?? "",
    MUC_HUONG: record.MUC_HUONG ?? "",
    THANH_TIEN: record.THANH_TIEN ?? "",
    TIEN_XUAT_TOAN_DU_KIEN: record.potentialBedRefusal ?? "",
    MA_BAC_SI: record.MA_BAC_SI,
    NGUOI_THUC_HIEN: record.NGUOI_THUC_HIEN,
    NGAY_YL: formatXmlDateTime(record.NGAY_YL) || record.NGAY_YL,
    NGAY_TH_YL: formatXmlDateTime(record.NGAY_TH_YL) || record.NGAY_TH_YL,
    NGAY_KQ: formatXmlDateTime(record.NGAY_KQ) || record.NGAY_KQ,
    File: record.fileName,
    STT: record.STT,
  }));
}

export async function createXml3ReportWorkbook(
  analysis: BatchAnalysis,
  records = analysis.records,
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Nguyễn Sơn Nam (Nsnnam)";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Tóm tắt");
  summary.columns = [
    { header: "Chỉ tiêu", key: "label" },
    { header: "Giá trị", key: "value" },
  ];
  summary.addRows([
    { label: "Số file đã nạp", value: analysis.files.length },
    { label: "Số FILEHOSO XML3", value: analysis.tableFiles },
    { label: "Tổng dòng XML3 theo nhóm", value: records.length },
    {
      label: "Cảnh báo theo nhóm",
      value: records.filter(
        (record) =>
          record.status === "warning" ||
          record.hasOrderWarning ||
          record.hasEqualWarning ||
          record.hasBedWarning ||
          record.hasTtThauWarning ||
          record.hasMaMayWarning ||
          Boolean(record.hasZ000Warning),
      ).length,
    },
    {
      label: "Cảnh báo sai thứ tự",
      value: records.filter((record) => record.hasOrderWarning).length,
    },
    {
      label: "Cảnh báo trùng mốc",
      value: records.filter((record) => record.hasEqualWarning).length,
    },
    {
      label: "Cảnh báo số lượng giường",
      value: records.filter((record) => record.hasBedWarning).length,
    },
    {
      label: "Cảnh báo XML3 thiếu TT_THAU (nhóm 10/11)",
      value: records.filter((record) => record.hasTtThauWarning).length,
    },
    {
      label: "Cảnh báo XML3 mã máy (MA_MAY)",
      value: records.filter((record) => record.hasMaMayWarning).length,
    },
    {
      label: "Cảnh báo XML3 trùng thời gian trên mã máy",
      value: records.filter((record) => record.hasDuplicateMachineWarning).length,
    },
    {
      label: "Cảnh báo XML1",
      value: analysis.xml1Warnings.length,
    },
    {
      label: "Cảnh báo XML2 thiếu TT_THAU",
      value: analysis.xml2Warnings.length,
    },
    {
      label: "Cảnh báo XML4 thiếu KET_LUAN",
      value: analysis.xml4Warnings.length,
    },
    {
      label: "Cảnh báo mã bệnh Z00.0 / Z30.1",
      value: analysis.z000Warnings?.length ?? 0,
    },
    {
      label: "Dòng thiếu thời gian",
      value: records.filter((record) => record.status === "missing").length,
    },
    {
      label: "Dòng thời gian không hợp lệ",
      value: records.filter((record) => record.status === "invalid").length,
    },
    {
      label: "Dòng thời gian âm",
      value: records.filter((record) => record.status === "negative").length,
    },
    { label: "Ngưỡng cảnh báo mặc định (phút)", value: 70 },
  ]);
  styleSheet(summary);
  fitColumns(summary);

  const detail = workbook.addWorksheet("Chi tiết");
  const rows = detailRows(records);
  if (rows.length) {
    detail.columns = Object.keys(rows[0]).map((key) => ({ header: key, key }));
    detail.addRows(rows);
  } else {
    detail.addRow({ Chi_tiet: "Không có dòng XML3" });
  }
  styleSheet(detail);
  for (const row of detail.getRows(2, detail.rowCount) ?? []) {
    const statusVal = String(row.getCell(1).value);
    if (
      [
        "CB",
        "Z00.0",
        "Z30.1",
        "SAI THỨ TỰ",
        "TRÙNG MỐC",
        "GIƯỜNG",
        "TT_THAU",
        "MÃ MÁY",
        "TRÙNG MÁY",
      ].includes(statusVal)
    ) {
      row.eachCell(
        (cell) =>
          (cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDE68A" } }),
      );
    }
  }
  fitColumns(detail);

  const log = workbook.addWorksheet("Nhật ký");
  log.columns = [{ header: "Nội dung", key: "message" }];
  for (const line of analysis.errors) log.addRow({ message: line });
  styleSheet(log);
  fitColumns(log);

  return workbook;
}

export async function exportXml3Report(analysis: BatchAnalysis, records = analysis.records) {
  const workbook = await createXml3ReportWorkbook(analysis, records);
  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `${formatTimestampForFilename()}_XML3_duration.xlsx`;
  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}

export async function createWarningWorkbook(
  source: ValidationWarning["source"],
  warnings: ValidationWarning[],
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Nguyễn Sơn Nam (Nsnnam)";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(`Cảnh báo ${source}`);
  const rows = warnings.map((warning) => ({
    Chi_tiet: warning.detailIndex,
    MA_LK: warning.MA_LK,
    HO_TEN: warning.HO_TEN,
    MA_BN: warning.MA_BN,
    Mã_DV_hoặc_Thuốc: warning.MA_DICH_VU,
    Tên_DV_hoặc_Thuốc: warning.TEN_DICH_VU,
    Cảnh_báo: warning.message,
  }));
  sheet.columns = [
    { header: "Chi tiết thứ", key: "Chi_tiet" },
    { header: "MA_LK", key: "MA_LK" },
    { header: "HO_TEN", key: "HO_TEN" },
    { header: "MA_BN", key: "MA_BN" },
    { header: source === "XML2" ? "Mã thuốc" : "Mã dịch vụ", key: "Mã_DV_hoặc_Thuốc" },
    { header: source === "XML2" ? "Tên thuốc" : "Tên dịch vụ", key: "Tên_DV_hoặc_Thuốc" },
    { header: "Cảnh báo", key: "Cảnh_báo" },
  ];
  if (rows.length) sheet.addRows(rows);
  else sheet.addRow({ Cảnh_báo: `Không có cảnh báo ${source}` });
  styleSheet(sheet);
  fitColumns(sheet);
  return workbook;
}

export async function exportWarningList(
  source: ValidationWarning["source"],
  warnings: ValidationWarning[],
) {
  const workbook = await createWarningWorkbook(source, warnings);
  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `${formatTimestampForFilename()}_${source}_warnings.xlsx`;
  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}

export async function createDuplicateMachineWorkbook(
  records: Xml3Record[],
  patients: ReadonlyMap<string, PatientInfo> = new Map(),
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Nguyễn Sơn Nam (Nsnnam)";
  workbook.created = new Date();

  const dupRecords = records.filter((r) => r.hasDuplicateMachineWarning);

  // Sheet 1: Tóm tắt
  const summarySheet = workbook.addWorksheet("Tóm tắt");
  const groupMap = new Map<string, Xml3Record[]>();
  for (const record of dupRecords) {
    if (!record.MA_MAY) continue;
    const date = parseXmlDateTime(record.NGAY_TH_YL);
    if (!date) continue;
    const timeMinute = Math.floor(date.getTime() / 60000);
    const machines = record.MA_MAY.split(";")
      .map((m) => m.trim().toUpperCase())
      .filter(Boolean);
    for (const machine of machines) {
      const key = `${machine}|${timeMinute}`;
      const list = groupMap.get(key) ?? [];
      list.push(record);
      groupMap.set(key, list);
    }
  }

  summarySheet.columns = [
    { header: "Chỉ tiêu", key: "label", width: 40 },
    { header: "Số lượng / Giá trị", key: "value", width: 25 },
  ];
  summarySheet.addRows([
    { label: "Tổng số lượt dịch vụ bị trùng máy", value: dupRecords.length },
    { label: "Số cụm mốc thời điểm bị trùng", value: groupMap.size },
    {
      label: "Số bệnh nhân liên quan",
      value: new Set(dupRecords.map((r) => r.MA_LK)).size,
    },
    {
      label: "Số mã máy bị trùng",
      value: new Set(Array.from(groupMap.keys()).map((k) => k.split("|")[0])).size,
    },
    {
      label: "Thời gian xuất báo cáo",
      value: new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
    },
  ]);
  styleSheet(summarySheet);
  fitColumns(summarySheet);

  // Sheet 2: Chi tiết đối chiếu
  const detailSheet = workbook.addWorksheet("Đối chiếu trùng máy");
  detailSheet.columns = [
    { header: "STT", key: "stt", width: 8 },
    { header: "Mã máy", key: "maMay", width: 26 },
    { header: "Thời gian TH y lệnh", key: "ngayThYl", width: 20 },
    { header: "Phân loại trùng", key: "phanLoai", width: 18 },
    { header: "Họ và tên BN", key: "hoTen", width: 25 },
    { header: "Mã BN", key: "maBn", width: 15 },
    { header: "Mã LK", key: "maLk", width: 16 },
    { header: "CCCD / Định danh", key: "cccd", width: 16 },
    { header: "Thẻ BHYT", key: "theBhyt", width: 18 },
    { header: "Mã DV", key: "maDv", width: 15 },
    { header: "Tên dịch vụ kỹ thuật", key: "tenDv", width: 35 },
    { header: "Nhóm DV", key: "maNhom", width: 10 },
    { header: "Khoa thực hiện", key: "khoa", width: 15 },
    { header: "Bác sĩ chỉ định", key: "bacSi", width: 15 },
    { header: "Người thực hiện", key: "nguoiTh", width: 18 },
    { header: "Thời gian YL", key: "ngayYl", width: 20 },
    { header: "Thời gian KQ", key: "ngayKq", width: 20 },
    { header: "Đối chiếu chi tiết (Trùng với ai)", key: "doiChieu", width: 50 },
    { header: "File nguồn", key: "fileName", width: 20 },
  ];

  let rowStt = 1;
  const sortedKeys = Array.from(groupMap.keys()).sort();

  for (let gIdx = 0; gIdx < sortedKeys.length; gIdx++) {
    const gKey = sortedKeys[gIdx];
    const rows = groupMap.get(gKey) ?? [];
    const [machine] = gKey.split("|");
    const isEvenGroup = gIdx % 2 === 0;
    const groupBgColor = isEvenGroup ? "FFF8FAFC" : "FFFFFBEB"; // Slate-50 vs Amber-50

    for (const r of rows) {
      const pat = patients.get(r.MA_LK) || r.patient;
      const peers = r.duplicateMachineInfo || [];
      const samePeers = peers.filter((p) => p.isSamePatient);
      const diffPeers = peers.filter((p) => !p.isSamePatient);

      let phanLoai = "Trùng khác BN";
      if (samePeers.length > 0 && diffPeers.length === 0) {
        phanLoai = "Trùng cùng BN";
      } else if (samePeers.length > 0 && diffPeers.length > 0) {
        phanLoai = "Cả cùng & khác BN";
      }

      const peerText = peers
        .map((p) =>
          p.isSamePatient
            ? `Cùng BN: DV "${p.peerDichVu}" (STT ${p.peerStt})`
            : `BN khác: ${p.peerHoTen} (Mã BN: ${p.peerMaBn || "—"}, LK: ${p.peerMaLk}, DV: "${p.peerDichVu}")`,
        )
        .join(" | ");

      const addedRow = detailSheet.addRow({
        stt: rowStt++,
        maMay: machine,
        ngayThYl: formatXmlDateTime(r.NGAY_TH_YL) || r.NGAY_TH_YL,
        phanLoai,
        hoTen: r.HO_TEN || pat?.HO_TEN || "",
        maBn: r.MA_BN || pat?.MA_BN || "",
        maLk: r.MA_LK,
        cccd: pat?.SO_CCCD || "",
        theBhyt: pat?.MA_THE_BHYT || "",
        maDv: r.MA_DICH_VU || r.MA_VAT_TU,
        tenDv: r.TEN_DICH_VU || r.TEN_VAT_TU,
        maNhom: r.MA_NHOM,
        khoa: r.MA_KHOA,
        bacSi: r.MA_BAC_SI,
        nguoiTh: r.NGUOI_THUC_HIEN,
        ngayYl: formatXmlDateTime(r.NGAY_YL) || r.NGAY_YL,
        ngayKq: formatXmlDateTime(r.NGAY_KQ) || r.NGAY_KQ,
        doiChieu: peerText,
        fileName: r.fileName,
      });

      addedRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: groupBgColor },
        };
      });
    }
  }

  styleSheet(detailSheet);
  fitColumns(detailSheet);

  return workbook;
}

export async function exportDuplicateMachineComparisonExcel(
  records: Xml3Record[],
  patients: ReadonlyMap<string, PatientInfo> = new Map(),
) {
  const workbook = await createDuplicateMachineWorkbook(records, patients);
  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `${formatTimestampForFilename()}_Doi_chieu_trung_ma_may_XML3.xlsx`;
  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}

export async function createBedSharingWorkbook(
  records: Xml3Record[],
  patients: ReadonlyMap<string, PatientInfo> = new Map(),
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Nguyễn Sơn Nam (Nsnnam)";
  workbook.created = new Date();

  const bedRecords = records.filter(
    (r) =>
      r.hasBedWarning &&
      (r.bedWarningType === "bed-sharing" ||
        r.bedWarningType === "multi-day-overlap" ||
        r.bedWarningType === "minute-duplicate"),
  );

  // Nhóm theo cụm: overlapDay|MA_KHOA|MA_GIUONG
  const groupMap = new Map<string, Xml3Record[]>();
  for (const r of bedRecords) {
    const key = `${r.bedOverlapDate || ""}|${(r.MA_KHOA || "").trim()}|${(r.MA_GIUONG || "").trim()}`;
    const list = groupMap.get(key) || [];
    list.push(r);
    groupMap.set(key, list);
  }

  // Sheet 1: Tổng hợp KT251
  const summarySheet = workbook.addWorksheet("Tổng hợp KT251");
  summarySheet.columns = [
    { header: "Chỉ tiêu", key: "label", width: 50 },
    { header: "Số lượng / Giá trị", key: "value", width: 30 },
  ];

  const totalRefusalMoney = bedRecords.reduce((sum, r) => sum + (r.potentialBedRefusal ?? 0), 0);
  const count2Patients = bedRecords.filter((r) => (r.bedSharingCount ?? 2) === 2).length;
  const count3PlusPatients = bedRecords.filter((r) => (r.bedSharingCount ?? 2) >= 3).length;
  const countMultiDay = bedRecords.filter((r) => r.bedWarningType === "multi-day-overlap").length;
  const countMinuteDup = bedRecords.filter((r) => r.bedWarningType === "minute-duplicate").length;
  const uniquePatients = new Set(bedRecords.map((r) => r.MA_LK)).size;
  const uniqueBeds = new Set(bedRecords.map((r) => `${r.MA_KHOA}|${r.MA_GIUONG}`)).size;

  summarySheet.addRows([
    { label: "Tổng số lượt chi phí ngày giường nằm ghép (KT251)", value: bedRecords.length },
    { label: "Trong đó: Giường gối đầu liên tiếp (>= 2 ngày)", value: countMultiDay },
    { label: "Trong đó: Trùng số phút chuyển tiếp kê giường (cùng BN)", value: countMinuteDup },
    { label: "Số lượt ghép 2 người (đề nghị thanh toán > 50%)", value: count2Patients },
    {
      label: "Số lượt ghép từ 3 người trở lên (đề nghị thanh toán > 33%)",
      value: count3PlusPatients,
    },
    {
      label: "Tổng số tiền có nguy cơ xuất toán BHYT (VNĐ)",
      value: totalRefusalMoney.toLocaleString("vi-VN") + " VNĐ",
    },
    { label: "Số cụm ngày / buồng giường nằm ghép", value: groupMap.size },
    { label: "Số bệnh nhân liên quan", value: uniquePatients },
    { label: "Số mã giường phát hiện nằm ghép", value: uniqueBeds },
    {
      label: "Thời gian xuất báo cáo đối chiếu",
      value: new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
    },
    {
      label: "Căn cứ pháp lý rà soát",
      value: "Thông tư 39/2024/TT-BYT & Hướng dẫn kiểm tra KT251 BHXH Việt Nam",
    },
  ]);
  styleSheet(summarySheet);
  fitColumns(summarySheet);

  // Sheet 2: Chi tiết giường ghép (KT251)
  const detailSheet = workbook.addWorksheet("Chi tiết giường ghép KT251");
  detailSheet.columns = [
    { header: "STT", key: "stt", width: 8 },
    { header: "Khoa điều trị", key: "maKhoa", width: 14 },
    { header: "Mã giường", key: "maGiuong", width: 16 },
    { header: "Mã giường trùng", key: "maGiuongTrung", width: 25 },
    { header: "Phân loại", key: "phanLoai", width: 22 },
    { header: "Ngày nằm ghép", key: "ngayGhep", width: 15 },
    { header: "Số BN ghép", key: "soBnGhep", width: 12 },
    { header: "Giờ giao nhau", key: "soGioGiao", width: 14 },
    { header: "Tỷ lệ đề nghị (%)", key: "tyleDeNghi", width: 16 },
    { header: "Tỷ lệ quy định TT39 (%)", key: "tyleQuyDinh", width: 20 },
    { header: "Số lượng", key: "soLuong", width: 10 },
    { header: "Đơn giá BHYT (đ)", key: "donGia", width: 16 },
    { header: "Mức hưởng (%)", key: "mucHuong", width: 14 },
    { header: "Tiền xuất toán dự kiến (đ)", key: "tienXuatToan", width: 22 },
    { header: "Họ và tên bệnh nhân", key: "hoTen", width: 24 },
    { header: "Mã BN", key: "maBn", width: 14 },
    { header: "Mã LK", key: "maLk", width: 14 },
    { header: "CCCD / Định danh", key: "cccd", width: 16 },
    { header: "Mã thẻ BHYT", key: "theBhyt", width: 18 },
    { header: "Thời gian bắt đầu (TH_YL)", key: "ngayThYl", width: 20 },
    { header: "Thời gian kết thúc (KQ)", key: "ngayKq", width: 20 },
    { header: "Đối chiếu nằm ghép (Nằm cùng ai)", key: "doiChieu", width: 45 },
    { header: "Tên dịch vụ ngày giường", key: "tenDichVu", width: 35 },
    { header: "Mã dịch vụ", key: "maDichVu", width: 16 },
    { header: "File nguồn", key: "fileName", width: 20 },
    { header: "STT XML", key: "sttXml", width: 10 },
  ];

  let rowStt = 1;
  const sortedKeys = Array.from(groupMap.keys()).sort();

  for (let gIdx = 0; gIdx < sortedKeys.length; gIdx++) {
    const gKey = sortedKeys[gIdx];
    const rows = groupMap.get(gKey) ?? [];
    const isEvenGroup = gIdx % 2 === 0;
    const groupBgColor = isEvenGroup ? "FFFFFBEB" : "FFF8FAFC"; // Amber-50 vs Slate-50

    for (const r of rows) {
      const pat = patients.get(r.MA_LK) || r.patient;
      const peers = r.bedSharingInfo || [];
      const peerText = peers
        .map(
          (p) =>
            `${p.peerHoTen} (Mã BN: ${p.peerMaBn || "—"}, LK: ${p.peerMaLk}, Giờ: ${p.startTimeDisplay}–${p.endTimeDisplay}, Giao: ${p.overlapHours}h)`,
        )
        .join(" | ");

      const addedRow = detailSheet.addRow({
        stt: rowStt++,
        maKhoa: r.MA_KHOA,
        maGiuong: r.MA_GIUONG,
        maGiuongTrung: r.MA_GIUONG_TRUNG || r.MA_GIUONG,
        phanLoai:
          r.bedWarningType === "multi-day-overlap"
            ? `Gối đầu ${r.bedOverlapDaysCount || 2} ngày`
            : r.bedWarningType === "minute-duplicate"
              ? "Trùng phút giáp ranh"
              : `Ghép ${r.bedSharingCount ?? 2} người`,
        ngayGhep: r.bedOverlapDate || "",
        soBnGhep: r.bedSharingCount ?? 2,
        soGioGiao: r.bedOverlapHours ? `${r.bedOverlapHours}h` : "",
        tyleDeNghi: r.TYLE_TT ?? 100,
        tyleQuyDinh: r.suggestedTyleTt ?? 50,
        soLuong: r.SO_LUONG ?? 1,
        donGia: r.DON_GIA ? r.DON_GIA.toLocaleString("vi-VN") : "",
        mucHuong: r.MUC_HUONG ?? (pat?.MUC_HUONG ? pat.MUC_HUONG : 100),
        tienXuatToan: r.potentialBedRefusal ? r.potentialBedRefusal.toLocaleString("vi-VN") : "0",
        hoTen: r.HO_TEN || pat?.HO_TEN || "",
        maBn: r.MA_BN || pat?.MA_BN || "",
        maLk: r.MA_LK,
        cccd: pat?.SO_CCCD || "",
        theBhyt: pat?.MA_THE_BHYT || "",
        ngayThYl: formatXmlDateTime(r.NGAY_TH_YL) || r.NGAY_TH_YL,
        ngayKq: formatXmlDateTime(r.NGAY_KQ) || r.NGAY_KQ,
        doiChieu: peerText,
        tenDichVu: r.TEN_DICH_VU || r.TEN_VAT_TU || "",
        maDichVu: r.MA_DICH_VU || r.MA_VAT_TU || "",
        fileName: r.fileName,
        sttXml: r.STT,
      });

      addedRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: groupBgColor },
        };
      });
    }
  }

  styleSheet(detailSheet);
  fitColumns(detailSheet);

  return workbook;
}

export async function exportBedSharingComparisonExcel(
  records: Xml3Record[],
  patients: ReadonlyMap<string, PatientInfo> = new Map(),
) {
  const workbook = await createBedSharingWorkbook(records, patients);
  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `${formatTimestampForFilename()}_Doi_chieu_giuong_ghep_KT251.xlsx`;
  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}
