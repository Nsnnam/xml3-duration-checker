import ExcelJS from "exceljs";
import fileSaver from "file-saver";
import { formatTimestampForFilename, formatXmlDateTime } from "./timezone.ts";
import type { BatchAnalysis, ValidationWarning, Xml3Record } from "./xml3-duration.ts";

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
    Trạng_thái: record.hasOrderWarning
      ? "SAI THỨ TỰ"
      : record.hasEqualWarning
        ? "TRÙNG MỐC"
        : record.hasBedWarning
          ? "GIƯỜNG"
          : record.hasTtThauWarning
            ? "TT_THAU"
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
    MA_KHOA: record.MA_KHOA,
    MA_GIUONG: record.MA_GIUONG,
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
          record.hasTtThauWarning,
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
    if (["CB", "SAI THỨ TỰ", "TRÙNG MỐC", "GIƯỜNG", "TT_THAU"].includes(statusVal)) {
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
