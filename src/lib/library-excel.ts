import ExcelJS from "exceljs";
import fileSaver from "file-saver";
import { formatTimestampForFilename } from "./timezone.ts";
import type { ServiceRule, DrugRule } from "./xml3-duration.ts";

const saveAs =
  typeof fileSaver === "function"
    ? fileSaver
    : (fileSaver as unknown as { saveAs: typeof fileSaver }).saveAs || fileSaver;

function styleHeader(sheet: ExcelJS.Worksheet, fgColor: string = "0F766E", filterCols: number = 6) {
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fgColor } };
  headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  headerRow.height = 32;
  sheet.autoFilter = {
    from: "A1",
    to: `${String.fromCharCode(64 + Math.min(filterCols, 26))}1`,
  };
}

function autoFitColumns(sheet: ExcelJS.Worksheet, minWidths: number[] = []) {
  sheet.columns.forEach((column, idx) => {
    let maxLen = minWidths[idx] || 15;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > maxLen) maxLen = len;
    });
    column.width = Math.min(Math.max(maxLen + 4, minWidths[idx] || 12), 60);
  });
}

/**
 * Xuất file Excel mẫu để người dùng điền và nạp danh mục vào Thư viện
 */
export async function exportLibraryTemplate(): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Nguyễn Sơn Nam (Nsnnam)";
  workbook.created = new Date();

  // Sheet 1: DVKT & VTYT
  const sheetDv = workbook.addWorksheet("DVKT_VTYT");
  sheetDv.columns = [
    { header: "Mã DVKT / VTYT (*)", key: "MA_DICH_VU" },
    { header: "Tên dịch vụ kỹ thuật / Vật tư", key: "TEN_DICH_VU" },
    { header: "Thời gian tối thiểu (phút) [Mặc định > 0]", key: "minMinutes" },
    { header: "Thời gian tối đa (phút) [Mặc định 70]", key: "maxMinutes" },
    { header: "Loại trừ hoàn toàn (1=Có, 0=Không)", key: "excluded" },
    { header: "Ghi chú", key: "GHI_CHU" },
  ];

  sheetDv.addRow({
    MA_DICH_VU: "04.0123",
    TEN_DICH_VU: "Nội soi thực quản dạ dày can thiệp",
    minMinutes: 15,
    maxMinutes: 90,
    excluded: 0,
    GHI_CHU: "Ví dụ: Tối thiểu 15 phút, tối đa 90 phút",
  });
  sheetDv.addRow({
    MA_DICH_VU: "01.0045",
    TEN_DICH_VU: "Phẫu thuật nội soi cắt ruột thừa",
    minMinutes: 30,
    maxMinutes: 180,
    excluded: 0,
    GHI_CHU: "Ví dụ: Tối thiểu 30 phút, tối đa 180 phút",
  });
  sheetDv.addRow({
    MA_DICH_VU: "C01.002",
    TEN_DICH_VU: "Chụp X-quang ngực thẳng",
    minMinutes: 1,
    maxMinutes: 45,
    excluded: 0,
    GHI_CHU: "Ví dụ: Tối thiểu 1 phút (> 0), tối đa 45 phút",
  });
  sheetDv.addRow({
    MA_DICH_VU: "08.9999",
    TEN_DICH_VU: "Dịch vụ đặc thù loại trừ thời lượng",
    minMinutes: "",
    maxMinutes: "",
    excluded: 1,
    GHI_CHU: "Ví dụ: Điền 1 vào cột Loại trừ để không kiểm tra thời lượng",
  });

  styleHeader(sheetDv, "0F766E", 6);
  autoFitColumns(sheetDv, [22, 38, 25, 25, 25, 35]);

  // Sheet 2: Thuốc XML2
  const sheetThuoc = workbook.addWorksheet("THUOC_XML2");
  sheetThuoc.columns = [
    { header: "Mã thuốc (*)", key: "MA_THUOC" },
    { header: "Tên thuốc / Hoạt chất", key: "TEN_THUOC" },
    { header: "Loại trừ TT_THAU XML2 (1=Có, 0=Không)", key: "excluded" },
    { header: "Ghi chú", key: "GHI_CHU" },
  ];

  sheetThuoc.addRow({
    MA_THUOC: "40.123",
    TEN_THUOC: "Paracetamol 500mg viên nén",
    excluded: 1,
    GHI_CHU: "Ví dụ: Loại trừ khỏi cảnh báo thiếu TT_THAU ở XML2",
  });
  sheetThuoc.addRow({
    MA_THUOC: "40.456",
    TEN_THUOC: "Cefuroxim 500mg",
    excluded: 1,
    GHI_CHU: "Ví dụ: Loại trừ khỏi cảnh báo thiếu TT_THAU ở XML2",
  });

  styleHeader(sheetThuoc, "D97706", 4);
  autoFitColumns(sheetThuoc, [22, 35, 28, 35]);

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = "mau_nhap_thu_vien_nsn_xmlcheck.xlsx";
  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}

/**
 * Xuất toàn bộ Thư viện dịch vụ & Thuốc hiện có ra file Excel
 */
export async function exportLibraryToExcel(
  serviceRules: ServiceRule[],
  drugRules: DrugRule[],
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Nguyễn Sơn Nam (Nsnnam)";
  workbook.created = new Date();

  // Sheet 1: DVKT_VTYT
  const sheetDv = workbook.addWorksheet("DVKT_VTYT");
  sheetDv.columns = [
    { header: "STT", key: "STT" },
    { header: "Mã DVKT / VTYT (*)", key: "MA_DICH_VU" },
    { header: "Tên dịch vụ kỹ thuật / Vật tư", key: "TEN_DICH_VU" },
    { header: "Thời gian tối thiểu (phút)", key: "minMinutes" },
    { header: "Thời gian tối đa (phút)", key: "maxMinutes" },
    { header: "Loại trừ hoàn toàn (1/0)", key: "excluded" },
  ];

  serviceRules.forEach((rule, idx) => {
    sheetDv.addRow({
      STT: idx + 1,
      MA_DICH_VU: rule.MA_DICH_VU,
      TEN_DICH_VU: rule.TEN_DICH_VU,
      minMinutes: rule.minMinutes ?? 1,
      maxMinutes: rule.maxMinutes ?? "",
      excluded: rule.maxMinutes === null ? 1 : 0,
    });
  });

  styleHeader(sheetDv, "0F766E", 6);
  autoFitColumns(sheetDv, [8, 22, 40, 22, 22, 20]);

  // Sheet 2: THUOC_XML2
  const sheetThuoc = workbook.addWorksheet("THUOC_XML2");
  sheetThuoc.columns = [
    { header: "STT", key: "STT" },
    { header: "Mã thuốc (*)", key: "MA_THUOC" },
    { header: "Tên thuốc / Hoạt chất", key: "TEN_THUOC" },
    { header: "Loại trừ TT_THAU XML2 (1/0)", key: "excluded" },
  ];

  drugRules.forEach((rule, idx) => {
    sheetThuoc.addRow({
      STT: idx + 1,
      MA_THUOC: rule.MA_THUOC,
      TEN_THUOC: rule.TEN_THUOC,
      excluded: rule.excluded ? 1 : 0,
    });
  });

  styleHeader(sheetThuoc, "D97706", 4);
  autoFitColumns(sheetThuoc, [8, 22, 38, 25]);

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `${formatTimestampForFilename()}_danh_muc_thu_vien.xlsx`;
  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}

/**
 * Đọc file Excel người dùng tải lên để nhập vào Thư viện
 */
export async function importLibraryFromExcel(file: File): Promise<{
  serviceRules: ServiceRule[];
  drugRules: DrugRule[];
}> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const importedServiceRules: ServiceRule[] = [];
  const importedDrugRules: DrugRule[] = [];

  // 1. Đọc sheet DVKT
  const sheetDv =
    workbook.getWorksheet("DVKT_VTYT") || workbook.getWorksheet("DVKT") || workbook.worksheets[0];

  if (sheetDv) {
    sheetDv.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const rawCode = row.getCell(1).value ?? row.getCell(2).value;
      // If column 1 is STT, column 2 might be MA_DICH_VU
      let maDichVu = "";
      let tenDichVu = "";
      let rawMin: unknown = null;
      let rawMax: unknown = null;
      let rawExcluded: unknown = null;

      // Determine column mappings based on row structure
      const cell1Val = String(row.getCell(1).value ?? "").trim();
      const cell2Val = String(row.getCell(2).value ?? "").trim();

      if (Number.isFinite(Number(cell1Val)) && cell2Val.length > 0) {
        // Col 1 is STT
        maDichVu = cell2Val;
        tenDichVu = String(row.getCell(3).value ?? "").trim();
        rawMin = row.getCell(4).value;
        rawMax = row.getCell(5).value;
        rawExcluded = row.getCell(6).value;
      } else if (cell1Val.length > 0) {
        // Col 1 is MA_DICH_VU
        maDichVu = cell1Val;
        tenDichVu = cell2Val;
        rawMin = row.getCell(3).value;
        rawMax = row.getCell(4).value;
        rawExcluded = row.getCell(5).value;
      }

      if (!maDichVu) return;

      const isExcluded =
        rawExcluded === 1 ||
        rawExcluded === "1" ||
        String(rawExcluded).toLowerCase() === "true" ||
        String(rawExcluded).toLowerCase() === "x" ||
        String(rawExcluded).toLowerCase() === "có";

      let minMinutes: number | undefined = undefined;
      if (rawMin !== null && rawMin !== undefined && rawMin !== "") {
        const num = Number(rawMin);
        if (Number.isFinite(num) && num >= 0) minMinutes = num;
      }

      let maxMinutes: number | null = 70;
      if (isExcluded) {
        maxMinutes = null;
      } else if (rawMax !== null && rawMax !== undefined && rawMax !== "") {
        const num = Number(rawMax);
        if (Number.isFinite(num) && num >= 0) maxMinutes = num;
      }

      importedServiceRules.push({
        MA_DICH_VU: maDichVu,
        TEN_DICH_VU: tenDichVu,
        minMinutes,
        maxMinutes,
      });
    });
  }

  // 2. Đọc sheet Thuốc XML2
  const sheetThuoc =
    workbook.getWorksheet("THUOC_XML2") ||
    workbook.getWorksheet("THUOC") ||
    (workbook.worksheets.length > 1 ? workbook.worksheets[1] : null);

  if (sheetThuoc && sheetThuoc !== sheetDv) {
    sheetThuoc.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const cell1Val = String(row.getCell(1).value ?? "").trim();
      const cell2Val = String(row.getCell(2).value ?? "").trim();
      let maThuoc = "";
      let tenThuoc = "";
      let rawExcluded: unknown = null;

      if (Number.isFinite(Number(cell1Val)) && cell2Val.length > 0) {
        // Col 1 is STT
        maThuoc = cell2Val;
        tenThuoc = String(row.getCell(3).value ?? "").trim();
        rawExcluded = row.getCell(4).value;
      } else if (cell1Val.length > 0) {
        maThuoc = cell1Val;
        tenThuoc = cell2Val;
        rawExcluded = row.getCell(3).value;
      }

      if (!maThuoc) return;

      const isExcluded =
        rawExcluded === null ||
        rawExcluded === undefined ||
        rawExcluded === "" ||
        rawExcluded === 1 ||
        rawExcluded === "1" ||
        String(rawExcluded).toLowerCase() === "true" ||
        String(rawExcluded).toLowerCase() === "x" ||
        String(rawExcluded).toLowerCase() === "có";

      importedDrugRules.push({
        MA_THUOC: maThuoc,
        TEN_THUOC: tenThuoc,
        excluded: isExcluded,
      });
    });
  }

  return {
    serviceRules: importedServiceRules,
    drugRules: importedDrugRules,
  };
}
