/**
 * Thư viện Quản lý Danh mục 6 Bảng theo Thông tư 12
 * Cho phép thiết lập thông tin cơ sở khám chữa bệnh (CSKCB) và quản lý 6 bảng danh mục:
 * - Bảng 1: Danh mục bộ phận chuyên môn / Khoa phòng, giường bệnh (MAU_01)
 * - Bảng 2: Danh mục nhân lực khám chữa bệnh / Nhân viên y tế hành nghề (MAU_02)
 * - Bảng 3: Danh mục thuốc, chế phẩm máu (MAU_03)
 * - Bảng 4: Danh mục vật tư y tế, thiết bị dùng chung (MAU_04)
 * - Bảng 5: Danh mục dịch vụ kỹ thuật KCB (MAU_05)
 * - Bảng 6: Danh mục trang thiết bị y tế thực hiện dịch vụ kỹ thuật (MAU_06)
 *
 * Tác giả: Nguyễn Sơn Nam (Nsnnam)
 */

import ExcelJS from "exceljs";
import fileSaver from "file-saver";
import { formatTimestampForFilename, formatXmlDate } from "./timezone.ts";
import { DEFAULT_TT12_CATALOGS } from "./tt12-default-data.ts";

const saveAs =
  typeof fileSaver === "function"
    ? fileSaver
    : (fileSaver as unknown as { saveAs: typeof fileSaver }).saveAs || fileSaver;

export interface CskcbUnit {
  maCskcb: string; // ví dụ: "26066", "26193"
  tenCskcb: string; // Tên cơ sở khám chữa bệnh
  capKcb: "co_ban" | "chuyen_sau" | "ban_dau"; // Cấp KCB theo Luật BHYT sửa đổi
  ghiChu?: string;
}

export interface Tt12Bang1KhoaPhong {
  stt?: number;
  maKhoa: string;
  tenKhoa: string;
  banKham?: string;
  giuongPd?: number | null;
  giuongTk?: number | null;
  giuongHstc?: number | null;
  giuongHscc?: number | null;
  tuNgay?: string;
  denNgay?: string;
  maCskcb?: string;
}

export interface Tt12Bang2NhanLuc {
  stt?: number;
  maKhoa?: string;
  tenKhoa?: string;
  hoTen: string;
  gioiTinh?: string;
  soDinhDanh?: string;
  chucDanhNn?: string;
  viTri?: string;
  macchn: string; // Số CCHN bác sĩ
  ngayCapCchn?: string;
  noiCapCchn?: string;
  phamViCm?: string;
  maCskcb?: string;
}

export interface Tt12Bang3Thuoc {
  stt?: number;
  maThuoc: string;
  tenHoatChat?: string;
  tenThuoc: string;
  donViTinh?: string;
  hamLuong?: string;
  duongDung?: string;
  maDuongDung?: string;
  dangBaoChe?: string;
  soDangKy?: string;
  soLuong?: number | null;
  donGia?: number | null;
  maCskcb?: string;
}

export interface Tt12Bang4VatTu {
  stt?: number;
  maVatTu: string;
  nhomVatTu?: string;
  tenVatTu: string;
  maHieu?: string;
  soLuuHanh?: string;
  tinhNangKt?: string;
  quyCach?: string;
  hangSx?: string;
  nuocSx?: string;
  donViTinh?: string;
  donGia?: number | null;
  maCskcb?: string;
}

export interface Tt12Bang5DichVu {
  stt?: number;
  maDichVu: string;
  tenDichVu: string;
  tenDvktGia?: string;
  donGia?: number | null;
  quyTrinh?: string;
  soLuongCgkt?: number | null;
  cskcbCgkt?: string;
  cskcbCls?: string;
  qdDvkt?: string;
  qdPdGia?: string;
  ghiChu?: string;
  maCskcb?: string;
}

export interface Tt12Bang6ThietBi {
  stt?: number;
  tenTb: string;
  kyHieu?: string;
  congTySx?: string;
  nuocSx?: string;
  namSx?: number | string;
  namSd?: number | string;
  maMay: string; // Mã máy chuẩn, ví dụ KX.3[vontuco].K7JB19E
  soLuuHanh?: string;
  hdTu?: string;
  hdDen?: string;
  tuNgay?: string; // Ngày bắt đầu hiệu lực (YYYYMMDD)
  denNgay?: string; // Ngày hết hạn hiệu lực (YYYYMMDD)
  maCskcb?: string;
}

export interface Tt12UnitData {
  unit: CskcbUnit;
  bang1: Tt12Bang1KhoaPhong[];
  bang2: Tt12Bang2NhanLuc[];
  bang3: Tt12Bang3Thuoc[];
  bang4: Tt12Bang4VatTu[];
  bang5: Tt12Bang5DichVu[];
  bang6: Tt12Bang6ThietBi[];
  updatedAt?: string;
}

export const TT12_CATALOGS_STORAGE_KEY = "nsn-xmlcheck-tt12-catalogs";

/**
 * Tải danh mục TT12 từ localStorage, nếu chưa có thì khởi tạo từ DEFAULT_TT12_CATALOGS
 */
export function loadTt12Catalogs(): Record<string, Tt12UnitData> {
  try {
    const raw = localStorage.getItem(TT12_CATALOGS_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_TT12_CATALOGS };
    }
    const parsed = JSON.parse(raw);
    // Bổ sung các đơn vị mặc định nếu chưa có
    return { ...DEFAULT_TT12_CATALOGS, ...parsed };
  } catch {
    return { ...DEFAULT_TT12_CATALOGS };
  }
}

/**
 * Lưu toàn bộ danh mục TT12 vào localStorage
 */
export function saveTt12Catalogs(catalogs: Record<string, Tt12UnitData>): void {
  try {
    localStorage.setItem(TT12_CATALOGS_STORAGE_KEY, JSON.stringify(catalogs));
  } catch (err) {
    console.error("Lỗi khi lưu danh mục Thông tư 12:", err);
  }
}

/**
 * Lấy danh mục TT12 theo mã cơ sở KCB
 */
export function getUnitCatalog(maCskcb: string): Tt12UnitData | undefined {
  if (!maCskcb) return undefined;
  const clean = maCskcb.trim();
  const catalogs = loadTt12Catalogs();
  return catalogs[clean];
}

/**
 * Lưu hoặc cập nhật thông tin đơn vị
 */
export function upsertUnitInfo(unit: CskcbUnit): Tt12UnitData {
  const catalogs = loadTt12Catalogs();
  const key = unit.maCskcb.trim();
  const existing = catalogs[key];
  const updated: Tt12UnitData = existing
    ? { ...existing, unit, updatedAt: new Date().toISOString() }
    : {
        unit,
        bang1: [],
        bang2: [],
        bang3: [],
        bang4: [],
        bang5: [],
        bang6: [],
        updatedAt: new Date().toISOString(),
      };
  catalogs[key] = updated;
  saveTt12Catalogs(catalogs);
  return updated;
}

/**
 * Xóa một đơn vị và toàn bộ 6 bảng của đơn vị đó
 */
export function deleteUnitCatalog(maCskcb: string): void {
  const catalogs = loadTt12Catalogs();
  const key = maCskcb.trim();
  delete catalogs[key];
  saveTt12Catalogs(catalogs);
}

/**
 * Cập nhật một bảng cụ thể của đơn vị
 */
export function saveUnitTableData<
  K extends "bang1" | "bang2" | "bang3" | "bang4" | "bang5" | "bang6",
>(maCskcb: string, tableKey: K, data: Tt12UnitData[K]): void {
  const catalogs = loadTt12Catalogs();
  const key = maCskcb.trim();
  const unitData = catalogs[key] || {
    unit: { maCskcb: key, tenCskcb: `CSKCB ${key}`, capKcb: "co_ban" },
    bang1: [],
    bang2: [],
    bang3: [],
    bang4: [],
    bang5: [],
    bang6: [],
  };
  unitData[tableKey] = data;
  unitData.updatedAt = new Date().toISOString();
  catalogs[key] = unitData;
  saveTt12Catalogs(catalogs);
}

// ---------------------------------------------------------------------------
// LOGIC RÀ SOÁT ĐỐI CHIẾU MA_MAY TRONG XML3 VỚI BẢNG 6 TT12
// ---------------------------------------------------------------------------

export interface MaMayAuditResult {
  hasWarning: boolean;
  message: string;
  machine?: Tt12Bang6ThietBi;
}

/**
 * Rà soát mã máy XML3 đối chiếu với Bảng 6 TT12 của cơ sở KCB
 */
export function auditXml3MaMayWithTt12(
  maMay: string,
  ngayThYlRaw: string,
  unitData?: Tt12UnitData,
): MaMayAuditResult {
  const cleanMaMay = (maMay || "").trim();
  if (!cleanMaMay) {
    return {
      hasWarning: false,
      message: "",
    };
  }

  // Nếu cơ sở chưa có Bảng 6 TT12 được nạp trong hệ thống
  if (!unitData || !unitData.bang6 || unitData.bang6.length === 0) {
    return {
      hasWarning: false,
      message: "",
    };
  }

  const parts = cleanMaMay
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);
  const issues: string[] = [];
  let matchedMachine: Tt12Bang6ThietBi | undefined;

  for (const part of parts) {
    const upperPart = part.toUpperCase();
    const machine = unitData.bang6.find(
      (m) => m.maMay && m.maMay.trim().toUpperCase() === upperPart,
    );

    if (!machine) {
      issues.push(
        `Mã máy '${part}' không tồn tại trong Bảng 6 TT12 của CSKCB ${unitData.unit.maCskcb} (${unitData.unit.tenCskcb})`,
      );
      continue;
    }

    matchedMachine = machine;

    // Kiểm tra thời hạn hiệu lực
    if (ngayThYlRaw) {
      const execDigits = ngayThYlRaw.replace(/\D/g, "").slice(0, 8); // YYYYMMDD
      if (execDigits.length === 8) {
        if (machine.tuNgay) {
          const fromDigits = machine.tuNgay.replace(/\D/g, "").slice(0, 8);
          if (fromDigits.length === 8 && execDigits < fromDigits) {
            issues.push(
              `Mã máy '${part}' (${machine.tenTb}) thực hiện ngày ${formatXmlDate(ngayThYlRaw)} trước ngày hiệu lực TT12 (${formatXmlDate(machine.tuNgay)})`,
            );
          }
        }

        if (machine.denNgay) {
          const toDigits = machine.denNgay.replace(/\D/g, "").slice(0, 8);
          if (toDigits.length === 8 && execDigits > toDigits) {
            issues.push(
              `Mã máy '${part}' (${machine.tenTb}) đã HẾT HẠN HIỆU LỰC TT12 vào ngày ${formatXmlDate(machine.denNgay)} (ngày thực hiện ${formatXmlDate(ngayThYlRaw)})`,
            );
          }
        }
      }
    }
  }

  if (issues.length > 0) {
    return {
      hasWarning: true,
      message: `XML3: ${issues.join(" · ")}`,
      machine: matchedMachine,
    };
  }

  return {
    hasWarning: false,
    message: "",
    machine: matchedMachine,
  };
}

// ---------------------------------------------------------------------------
// EXCEL EXPORT & IMPORT FOR TT12
// ---------------------------------------------------------------------------

function styleSheetHeader(sheet: ExcelJS.Worksheet, fgColor: string = "0F766E") {
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fgColor } };
  headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  headerRow.height = 28;
}

/**
 * Xuất file Excel mẫu chuẩn 6 bảng Thông tư 12
 */
export async function exportTt12TemplateExcel(): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Nguyễn Sơn Nam (Nsnnam)";
  workbook.created = new Date();

  // Bảng 1
  const s1 = workbook.addWorksheet("MAU_01_KhoaPhong");
  s1.columns = [
    { header: "STT", key: "stt", width: 8 },
    { header: "MA_KHOA (*)", key: "maKhoa", width: 16 },
    { header: "TEN_KHOA (*)", key: "tenKhoa", width: 28 },
    { header: "BAN_KHAM", key: "banKham", width: 14 },
    { header: "GIUONG_PD", key: "giuongPd", width: 14 },
    { header: "GIUONG_TK", key: "giuongTk", width: 14 },
    { header: "GIUONG_HSTC", key: "giuongHstc", width: 14 },
    { header: "GIUONG_HSCC", key: "giuongHscc", width: 14 },
    { header: "TU_NGAY", key: "tuNgay", width: 14 },
    { header: "DEN_NGAY", key: "denNgay", width: 14 },
    { header: "MA_CSKCB (*)", key: "maCskcb", width: 14 },
  ];
  styleSheetHeader(s1, "0F766E");

  // Bảng 2
  const s2 = workbook.addWorksheet("MAU_02_NhanLuc");
  s2.columns = [
    { header: "STT", key: "stt", width: 8 },
    { header: "MA_KHOA", key: "maKhoa", width: 14 },
    { header: "TEN_KHOA", key: "tenKhoa", width: 24 },
    { header: "HO_TEN (*)", key: "hoTen", width: 26 },
    { header: "GIOI_TINH", key: "gioiTinh", width: 12 },
    { header: "SO_DINH_DANH", key: "soDinhDanh", width: 18 },
    { header: "CHUCDANH_NN", key: "chucDanhNn", width: 18 },
    { header: "VI_TRI", key: "viTri", width: 18 },
    { header: "MACCHN (*)", key: "macchn", width: 18 },
    { header: "NGAYCAP_CCHN", key: "ngayCapCchn", width: 14 },
    { header: "NOICAP_CCHN", key: "noiCapCchn", width: 22 },
    { header: "PHAMVI_CM", key: "phamViCm", width: 28 },
    { header: "MA_CSKCB (*)", key: "maCskcb", width: 14 },
  ];
  styleSheetHeader(s2, "1E3A8A");

  // Bảng 3
  const s3 = workbook.addWorksheet("MAU_03_Thuoc");
  s3.columns = [
    { header: "STT", key: "stt", width: 8 },
    { header: "MA_THUOC (*)", key: "maThuoc", width: 18 },
    { header: "TEN_HOAT_CHAT", key: "tenHoatChat", width: 26 },
    { header: "TEN_THUOC (*)", key: "tenThuoc", width: 28 },
    { header: "DON_VI_TINH", key: "donViTinh", width: 14 },
    { header: "HAM_LUONG", key: "hamLuong", width: 18 },
    { header: "DUONG_DUNG", key: "duongDung", width: 16 },
    { header: "MA_DUONG_DUNG", key: "maDuongDung", width: 16 },
    { header: "DANG_BAO_CHE", key: "dangBaoChe", width: 18 },
    { header: "SO_DANG_KY", key: "soDangKy", width: 18 },
    { header: "SO_LUONG", key: "soLuong", width: 14 },
    { header: "DON_GIA", key: "donGia", width: 14 },
    { header: "MA_CSKCB (*)", key: "maCskcb", width: 14 },
  ];
  styleSheetHeader(s3, "15803D");

  // Bảng 4
  const s4 = workbook.addWorksheet("MAU_04_VatTu");
  s4.columns = [
    { header: "STT", key: "stt", width: 8 },
    { header: "MA_VAT_TU (*)", key: "maVatTu", width: 18 },
    { header: "NHOM_VAT_TU", key: "nhomVatTu", width: 18 },
    { header: "TEN_VAT_TU (*)", key: "tenVatTu", width: 28 },
    { header: "MA_HIEU", key: "maHieu", width: 18 },
    { header: "SO_LUU_HANH", key: "soLuuHanh", width: 18 },
    { header: "TINHNANG_KT", key: "tinhNangKt", width: 24 },
    { header: "QUY_CACH", key: "quyCach", width: 18 },
    { header: "HANG_SX", key: "hangSx", width: 20 },
    { header: "NUOC_SX", key: "nuocSx", width: 16 },
    { header: "DON_VI_TINH", key: "donViTinh", width: 14 },
    { header: "DON_GIA", key: "donGia", width: 14 },
    { header: "MA_CSKCB (*)", key: "maCskcb", width: 14 },
  ];
  styleSheetHeader(s4, "0369A1");

  // Bảng 5
  const s5 = workbook.addWorksheet("MAU_05_DichVu");
  s5.columns = [
    { header: "STT", key: "stt", width: 8 },
    { header: "MA_DICH_VU (*)", key: "maDichVu", width: 18 },
    { header: "TEN_DICH_VU (*)", key: "tenDichVu", width: 32 },
    { header: "TEN_DVKT_GIA", key: "tenDvktGia", width: 28 },
    { header: "DON_GIA", key: "donGia", width: 14 },
    { header: "QUY_TRINH", key: "quyTrinh", width: 16 },
    { header: "SO_LUONG_CGKT", key: "soLuongCgkt", width: 16 },
    { header: "CSKCB_CGKT", key: "cskcbCgkt", width: 16 },
    { header: "CSKCB_CLS", key: "cskcbCls", width: 16 },
    { header: "QD_DVKT", key: "qdDvkt", width: 18 },
    { header: "QD_PD_GIA", key: "qdPdGia", width: 18 },
    { header: "GHI_CHU", key: "ghiChu", width: 24 },
    { header: "MA_CSKCB (*)", key: "maCskcb", width: 14 },
  ];
  styleSheetHeader(s5, "7C3AED");

  // Bảng 6
  const s6 = workbook.addWorksheet("MAU_06_ThietBi");
  s6.columns = [
    { header: "STT", key: "stt", width: 8 },
    { header: "TEN_TB (*)", key: "tenTb", width: 32 },
    { header: "KY_HIEU", key: "kyHieu", width: 20 },
    { header: "CONGTY_SX", key: "congTySx", width: 22 },
    { header: "NUOC_SX", key: "nuocSx", width: 16 },
    { header: "NAM_SX", key: "namSx", width: 12 },
    { header: "NAM_SD", key: "namSd", width: 12 },
    { header: "MA_MAY (*)", key: "maMay", width: 26 },
    { header: "SO_LUU_HANH", key: "soLuuHanh", width: 20 },
    { header: "HD_TU", key: "hdTu", width: 14 },
    { header: "HD_DEN", key: "hdDen", width: 14 },
    { header: "TU_NGAY", key: "tuNgay", width: 14 },
    { header: "DEN_NGAY", key: "denNgay", width: 14 },
    { header: "MA_CSKCB (*)", key: "maCskcb", width: 14 },
  ];
  styleSheetHeader(s6, "B45309");

  // Thêm dòng ví dụ cho Bảng 6
  s6.addRow({
    stt: 1,
    tenTb: "Máy chụp cắt lớp vi tính CT Scanner 16 lát, Access CT",
    kyHieu: "Access CT",
    congTySx: "PHILIPS",
    nuocSx: "TQ",
    namSx: 2019,
    namSd: 2020,
    maMay: "CL.3[vontuco].310228",
    soLuuHanh: "C.4441NK/BYT-TB-CT",
    tuNgay: "20240620",
    denNgay: "20260630",
    maCskcb: "26066",
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `MAU_6_BANG_DANH_MUC_THONG_TU_12_CHUAN_${formatTimestampForFilename()}.xlsx`);
}

/**
 * Xuất dữ liệu 6 bảng của một đơn vị cụ thể ra file Excel
 */
export async function exportTt12UnitToExcel(unitData: Tt12UnitData): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Nguyễn Sơn Nam (Nsnnam)";
  workbook.created = new Date();

  // Bảng 1
  const s1 = workbook.addWorksheet("MAU_01_KhoaPhong");
  s1.columns = [
    { header: "STT", key: "stt", width: 8 },
    { header: "MA_KHOA", key: "maKhoa", width: 16 },
    { header: "TEN_KHOA", key: "tenKhoa", width: 28 },
    { header: "BAN_KHAM", key: "banKham", width: 14 },
    { header: "GIUONG_PD", key: "giuongPd", width: 14 },
    { header: "GIUONG_TK", key: "giuongTk", width: 14 },
    { header: "GIUONG_HSTC", key: "giuongHstc", width: 14 },
    { header: "GIUONG_HSCC", key: "giuongHscc", width: 14 },
    { header: "TU_NGAY", key: "tuNgay", width: 14 },
    { header: "DEN_NGAY", key: "denNgay", width: 14 },
    { header: "MA_CSKCB", key: "maCskcb", width: 14 },
  ];
  styleSheetHeader(s1, "0F766E");
  unitData.bang1.forEach((item, idx) =>
    s1.addRow({ ...item, stt: idx + 1, maCskcb: unitData.unit.maCskcb }),
  );

  // Bảng 2
  const s2 = workbook.addWorksheet("MAU_02_NhanLuc");
  s2.columns = [
    { header: "STT", key: "stt", width: 8 },
    { header: "MA_KHOA", key: "maKhoa", width: 14 },
    { header: "TEN_KHOA", key: "tenKhoa", width: 24 },
    { header: "HO_TEN", key: "hoTen", width: 26 },
    { header: "GIOI_TINH", key: "gioiTinh", width: 12 },
    { header: "SO_DINH_DANH", key: "soDinhDanh", width: 18 },
    { header: "CHUCDANH_NN", key: "chucDanhNn", width: 18 },
    { header: "VI_TRI", key: "viTri", width: 18 },
    { header: "MACCHN", key: "macchn", width: 18 },
    { header: "NGAYCAP_CCHN", key: "ngayCapCchn", width: 14 },
    { header: "NOICAP_CCHN", key: "noiCapCchn", width: 22 },
    { header: "PHAMVI_CM", key: "phamViCm", width: 28 },
    { header: "MA_CSKCB", key: "maCskcb", width: 14 },
  ];
  styleSheetHeader(s2, "1E3A8A");
  unitData.bang2.forEach((item, idx) =>
    s2.addRow({ ...item, stt: idx + 1, maCskcb: unitData.unit.maCskcb }),
  );

  // Bảng 3
  const s3 = workbook.addWorksheet("MAU_03_Thuoc");
  s3.columns = [
    { header: "STT", key: "stt", width: 8 },
    { header: "MA_THUOC", key: "maThuoc", width: 18 },
    { header: "TEN_HOAT_CHAT", key: "tenHoatChat", width: 26 },
    { header: "TEN_THUOC", key: "tenThuoc", width: 28 },
    { header: "DON_VI_TINH", key: "donViTinh", width: 14 },
    { header: "HAM_LUONG", key: "hamLuong", width: 18 },
    { header: "DUONG_DUNG", key: "duongDung", width: 16 },
    { header: "MA_DUONG_DUNG", key: "maDuongDung", width: 16 },
    { header: "DANG_BAO_CHE", key: "dangBaoChe", width: 18 },
    { header: "SO_DANG_KY", key: "soDangKy", width: 18 },
    { header: "SO_LUONG", key: "soLuong", width: 14 },
    { header: "DON_GIA", key: "donGia", width: 14 },
    { header: "MA_CSKCB", key: "maCskcb", width: 14 },
  ];
  styleSheetHeader(s3, "15803D");
  unitData.bang3.forEach((item, idx) =>
    s3.addRow({ ...item, stt: idx + 1, maCskcb: unitData.unit.maCskcb }),
  );

  // Bảng 4
  const s4 = workbook.addWorksheet("MAU_04_VatTu");
  s4.columns = [
    { header: "STT", key: "stt", width: 8 },
    { header: "MA_VAT_TU", key: "maVatTu", width: 18 },
    { header: "NHOM_VAT_TU", key: "nhomVatTu", width: 18 },
    { header: "TEN_VAT_TU", key: "tenVatTu", width: 28 },
    { header: "MA_HIEU", key: "maHieu", width: 18 },
    { header: "SO_LUU_HANH", key: "soLuuHanh", width: 18 },
    { header: "TINHNANG_KT", key: "tinhNangKt", width: 24 },
    { header: "QUY_CACH", key: "quyCach", width: 18 },
    { header: "HANG_SX", key: "hangSx", width: 20 },
    { header: "NUOC_SX", key: "nuocSx", width: 16 },
    { header: "DON_VI_TINH", key: "donViTinh", width: 14 },
    { header: "DON_GIA", key: "donGia", width: 14 },
    { header: "MA_CSKCB", key: "maCskcb", width: 14 },
  ];
  styleSheetHeader(s4, "0369A1");
  unitData.bang4.forEach((item, idx) =>
    s4.addRow({ ...item, stt: idx + 1, maCskcb: unitData.unit.maCskcb }),
  );

  // Bảng 5
  const s5 = workbook.addWorksheet("MAU_05_DichVu");
  s5.columns = [
    { header: "STT", key: "stt", width: 8 },
    { header: "MA_DICH_VU", key: "maDichVu", width: 18 },
    { header: "TEN_DICH_VU", key: "tenDichVu", width: 32 },
    { header: "TEN_DVKT_GIA", key: "tenDvktGia", width: 28 },
    { header: "DON_GIA", key: "donGia", width: 14 },
    { header: "QUY_TRINH", key: "quyTrinh", width: 16 },
    { header: "SO_LUONG_CGKT", key: "soLuongCgkt", width: 16 },
    { header: "CSKCB_CGKT", key: "cskcbCgkt", width: 16 },
    { header: "CSKCB_CLS", key: "cskcbCls", width: 16 },
    { header: "QD_DVKT", key: "qdDvkt", width: 18 },
    { header: "QD_PD_GIA", key: "qdPdGia", width: 18 },
    { header: "GHI_CHU", key: "ghiChu", width: 24 },
    { header: "MA_CSKCB", key: "maCskcb", width: 14 },
  ];
  styleSheetHeader(s5, "7C3AED");
  unitData.bang5.forEach((item, idx) =>
    s5.addRow({ ...item, stt: idx + 1, maCskcb: unitData.unit.maCskcb }),
  );

  // Bảng 6
  const s6 = workbook.addWorksheet("MAU_06_ThietBi");
  s6.columns = [
    { header: "STT", key: "stt", width: 8 },
    { header: "TEN_TB", key: "tenTb", width: 32 },
    { header: "KY_HIEU", key: "kyHieu", width: 20 },
    { header: "CONGTY_SX", key: "congTySx", width: 22 },
    { header: "NUOC_SX", key: "nuocSx", width: 16 },
    { header: "NAM_SX", key: "namSx", width: 12 },
    { header: "NAM_SD", key: "namSd", width: 12 },
    { header: "MA_MAY", key: "maMay", width: 26 },
    { header: "SO_LUU_HANH", key: "soLuuHanh", width: 20 },
    { header: "HD_TU", key: "hdTu", width: 14 },
    { header: "HD_DEN", key: "hdDen", width: 14 },
    { header: "TU_NGAY", key: "tuNgay", width: 14 },
    { header: "DEN_NGAY", key: "denNgay", width: 14 },
    { header: "MA_CSKCB", key: "maCskcb", width: 14 },
  ];
  styleSheetHeader(s6, "B45309");
  unitData.bang6.forEach((item, idx) =>
    s6.addRow({ ...item, stt: idx + 1, maCskcb: unitData.unit.maCskcb }),
  );

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(
    blob,
    `DANH_MUC_TT12_${unitData.unit.maCskcb}_${unitData.unit.tenCskcb.replace(/\s+/g, "_")}_${formatTimestampForFilename()}.xlsx`,
  );
}

/**
 * Nạp file Excel danh mục Thông tư 12
 */
export async function importTt12FromExcel(
  file: File,
  targetMaCskcb?: string,
): Promise<{
  success: boolean;
  message: string;
  importedCount: Record<string, number>;
  unitMaCskcb?: string;
}> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    let resolvedMaCskcb = targetMaCskcb?.trim() || "";
    const counts: Record<string, number> = {
      bang1: 0,
      bang2: 0,
      bang3: 0,
      bang4: 0,
      bang5: 0,
      bang6: 0,
    };

    const b1Items: Tt12Bang1KhoaPhong[] = [];
    const b2Items: Tt12Bang2NhanLuc[] = [];
    const b3Items: Tt12Bang3Thuoc[] = [];
    const b4Items: Tt12Bang4VatTu[] = [];
    const b5Items: Tt12Bang5DichVu[] = [];
    const b6Items: Tt12Bang6ThietBi[] = [];

    // Duyệt qua tất cả các sheet trong workbook
    for (const sheet of workbook.worksheets) {
      const sheetName = sheet.name.toLowerCase();

      // Tìm dòng header (thường là dòng 1 hoặc 2)
      let headerRowIndex = 1;
      let headerMap: Record<string, number> = {};

      for (let r = 1; r <= Math.min(5, sheet.rowCount); r++) {
        const row = sheet.getRow(r);
        const map: Record<string, number> = {};
        row.eachCell((cell, colNumber) => {
          const val = String(cell.value || "")
            .trim()
            .toUpperCase();
          if (val) map[val] = colNumber;
        });
        if (
          map.MA_MAY ||
          map.TEN_TB ||
          map.MA_KHOA ||
          map.MACCHN ||
          map.HO_TEN ||
          map.MA_THUOC ||
          map.MA_VAT_TU ||
          map.MA_DICH_VU
        ) {
          headerRowIndex = r;
          headerMap = map;
          break;
        }
      }

      const getVal = (row: ExcelJS.Row, colName: string): string => {
        const colIdx = headerMap[colName.toUpperCase()];
        if (!colIdx) return "";
        const cell = row.getCell(colIdx);
        return String(cell.value ?? "").trim();
      };

      // Nhận diện loại bảng
      const isBang6 =
        sheetName.includes("06") ||
        sheetName.includes("thietbi") ||
        sheetName.includes("tbyte") ||
        !!headerMap.MA_MAY;

      const isBang1 =
        !isBang6 &&
        (sheetName.includes("01") ||
          sheetName.includes("khoaphong") ||
          sheetName.includes("giuong") ||
          (!!headerMap.MA_KHOA && !!headerMap.BAN_KHAM));

      const isBang2 =
        !isBang6 &&
        !isBang1 &&
        (sheetName.includes("02") ||
          sheetName.includes("nhanluc") ||
          sheetName.includes("cchn") ||
          !!headerMap.MACCHN);

      const isBang3 =
        !isBang6 &&
        !isBang1 &&
        !isBang2 &&
        (sheetName.includes("03") ||
          sheetName.includes("thuoc") ||
          (!!headerMap.MA_THUOC && !!headerMap.TEN_HOAT_CHAT));

      const isBang4 =
        !isBang6 &&
        !isBang1 &&
        !isBang2 &&
        !isBang3 &&
        (sheetName.includes("04") || sheetName.includes("vattu") || !!headerMap.MA_VAT_TU);

      const isBang5 =
        !isBang6 &&
        !isBang1 &&
        !isBang2 &&
        !isBang3 &&
        !isBang4 &&
        (sheetName.includes("05") || sheetName.includes("dichvu") || !!headerMap.MA_DICH_VU);

      for (let r = headerRowIndex + 1; r <= sheet.rowCount; r++) {
        const row = sheet.getRow(r);
        const rowCskcb = getVal(row, "MA_CSKCB");
        if (rowCskcb && !resolvedMaCskcb) {
          resolvedMaCskcb = rowCskcb;
        }

        if (isBang6) {
          const maMay = getVal(row, "MA_MAY");
          const tenTb = getVal(row, "TEN_TB");
          if (maMay || tenTb) {
            b6Items.push({
              stt: b6Items.length + 1,
              tenTb: tenTb || maMay,
              kyHieu: getVal(row, "KY_HIEU"),
              congTySx: getVal(row, "CONGTY_SX"),
              nuocSx: getVal(row, "NUOC_SX"),
              namSx: getVal(row, "NAM_SX"),
              namSd: getVal(row, "NAM_SD"),
              maMay: maMay,
              soLuuHanh: getVal(row, "SO_LUU_HANH"),
              hdTu: getVal(row, "HD_TU"),
              hdDen: getVal(row, "HD_DEN"),
              tuNgay: getVal(row, "TU_NGAY"),
              denNgay: getVal(row, "DEN_NGAY"),
              maCskcb: rowCskcb || resolvedMaCskcb,
            });
          }
        } else if (isBang1) {
          const maKhoa = getVal(row, "MA_KHOA");
          const tenKhoa = getVal(row, "TEN_KHOA");
          if (maKhoa) {
            b1Items.push({
              stt: b1Items.length + 1,
              maKhoa,
              tenKhoa: tenKhoa || maKhoa,
              banKham: getVal(row, "BAN_KHAM"),
              giuongPd: Number(getVal(row, "GIUONG_PD")) || null,
              giuongTk: Number(getVal(row, "GIUONG_TK")) || null,
              giuongHstc: Number(getVal(row, "GIUONG_HSTC")) || null,
              giuongHscc: Number(getVal(row, "GIUONG_HSCC")) || null,
              tuNgay: getVal(row, "TU_NGAY"),
              denNgay: getVal(row, "DEN_NGAY"),
              maCskcb: rowCskcb || resolvedMaCskcb,
            });
          }
        } else if (isBang2) {
          const macchn = getVal(row, "MACCHN");
          const hoTen = getVal(row, "HO_TEN");
          if (macchn || hoTen) {
            b2Items.push({
              stt: b2Items.length + 1,
              maKhoa: getVal(row, "MA_KHOA"),
              tenKhoa: getVal(row, "TEN_KHOA"),
              hoTen: hoTen || macchn,
              gioiTinh: getVal(row, "GIOI_TINH"),
              soDinhDanh: getVal(row, "SO_DINH_DANH"),
              chucDanhNn: getVal(row, "CHUCDANH_NN"),
              viTri: getVal(row, "VI_TRI"),
              macchn: macchn,
              ngayCapCchn: getVal(row, "NGAYCAP_CCHN"),
              noiCapCchn: getVal(row, "NOICAP_CCHN"),
              phamViCm: getVal(row, "PHAMVI_CM"),
              maCskcb: rowCskcb || resolvedMaCskcb,
            });
          }
        } else if (isBang3) {
          const maThuoc = getVal(row, "MA_THUOC");
          const tenThuoc = getVal(row, "TEN_THUOC");
          if (maThuoc) {
            b3Items.push({
              stt: b3Items.length + 1,
              maThuoc,
              tenHoatChat: getVal(row, "TEN_HOAT_CHAT"),
              tenThuoc: tenThuoc || maThuoc,
              donViTinh: getVal(row, "DON_VI_TINH"),
              hamLuong: getVal(row, "HAM_LUONG"),
              duongDung: getVal(row, "DUONG_DUNG"),
              maDuongDung: getVal(row, "MA_DUONG_DUNG"),
              dangBaoChe: getVal(row, "DANG_BAO_CHE"),
              soDangKy: getVal(row, "SO_DANG_KY"),
              soLuong: Number(getVal(row, "SO_LUONG")) || null,
              donGia: Number(getVal(row, "DON_GIA")) || null,
              maCskcb: rowCskcb || resolvedMaCskcb,
            });
          }
        } else if (isBang4) {
          const maVatTu = getVal(row, "MA_VAT_TU");
          const tenVatTu = getVal(row, "TEN_VAT_TU");
          if (maVatTu) {
            b4Items.push({
              stt: b4Items.length + 1,
              maVatTu,
              nhomVatTu: getVal(row, "NHOM_VAT_TU"),
              tenVatTu: tenVatTu || maVatTu,
              maHieu: getVal(row, "MA_HIEU"),
              soLuuHanh: getVal(row, "SO_LUU_HANH"),
              tinhNangKt: getVal(row, "TINHNANG_KT"),
              quyCach: getVal(row, "QUY_CACH"),
              hangSx: getVal(row, "HANG_SX"),
              nuocSx: getVal(row, "NUOC_SX"),
              donViTinh: getVal(row, "DON_VI_TINH"),
              donGia: Number(getVal(row, "DON_GIA")) || null,
              maCskcb: rowCskcb || resolvedMaCskcb,
            });
          }
        } else if (isBang5) {
          const maDichVu = getVal(row, "MA_DICH_VU");
          const tenDichVu = getVal(row, "TEN_DICH_VU");
          if (maDichVu) {
            b5Items.push({
              stt: b5Items.length + 1,
              maDichVu,
              tenDichVu: tenDichVu || maDichVu,
              tenDvktGia: getVal(row, "TEN_DVKT_GIA"),
              donGia: Number(getVal(row, "DON_GIA")) || null,
              quyTrinh: getVal(row, "QUY_TRINH"),
              soLuongCgkt: Number(getVal(row, "SO_LUONG_CGKT")) || null,
              cskcbCgkt: getVal(row, "CSKCB_CGKT"),
              cskcbCls: getVal(row, "CSKCB_CLS"),
              qdDvkt: getVal(row, "QD_DVKT"),
              qdPdGia: getVal(row, "QD_PD_GIA"),
              ghiChu: getVal(row, "GHI_CHU"),
              maCskcb: rowCskcb || resolvedMaCskcb,
            });
          }
        }
      }
    }

    if (!resolvedMaCskcb) {
      resolvedMaCskcb = "CSKCB_CUSTOM";
    }

    counts.bang1 = b1Items.length;
    counts.bang2 = b2Items.length;
    counts.bang3 = b3Items.length;
    counts.bang4 = b4Items.length;
    counts.bang5 = b5Items.length;
    counts.bang6 = b6Items.length;

    const totalImported = Object.values(counts).reduce((a, b) => a + b, 0);
    if (totalImported === 0) {
      return {
        success: false,
        message: "Không tìm thấy dữ liệu hợp lệ theo mẫu 6 bảng Thông tư 12 trong file Excel.",
        importedCount: counts,
      };
    }

    // Cập nhật vào danh mục
    const catalogs = loadTt12Catalogs();
    const existing = catalogs[resolvedMaCskcb] || {
      unit: {
        maCskcb: resolvedMaCskcb,
        tenCskcb: `Cơ sở KCB ${resolvedMaCskcb}`,
        capKcb: "co_ban",
      },
      bang1: [],
      bang2: [],
      bang3: [],
      bang4: [],
      bang5: [],
      bang6: [],
    };

    if (b1Items.length > 0) existing.bang1 = b1Items;
    if (b2Items.length > 0) existing.bang2 = b2Items;
    if (b3Items.length > 0) existing.bang3 = b3Items;
    if (b4Items.length > 0) existing.bang4 = b4Items;
    if (b5Items.length > 0) existing.bang5 = b5Items;
    if (b6Items.length > 0) existing.bang6 = b6Items;
    existing.updatedAt = new Date().toISOString();

    catalogs[resolvedMaCskcb] = existing;
    saveTt12Catalogs(catalogs);

    return {
      success: true,
      message: `Đã nạp thành công ${totalImported} dòng dữ liệu cho đơn vị ${resolvedMaCskcb}.`,
      importedCount: counts,
      unitMaCskcb: resolvedMaCskcb,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Lỗi nạp file Excel Thông tư 12: ${errorMsg}`,
      importedCount: {},
    };
  }
}
