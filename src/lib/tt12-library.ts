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
export const EXCLUDED_DEPTS_STORAGE_KEY = "nsn-xmlcheck-excluded-depts";
export const DEFAULT_EXCLUDED_DEPTS: readonly string[] = ["K01"];

/**
 * Tải danh sách mã khoa loại trừ kiểm tra Bảng 1 Thông tư 12
 * Mặc định có K01 (Khoa Khám bệnh theo Phụ lục 5 Quyết định 5937/QĐ-BYT).
 */
export function loadExcludedDepts(): string[] {
  try {
    const raw = localStorage.getItem(EXCLUDED_DEPTS_STORAGE_KEY);
    if (!raw) return [...DEFAULT_EXCLUDED_DEPTS];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const cleaned = parsed.map((x) => String(x).trim().toUpperCase()).filter((x) => Boolean(x));
      return cleaned.length > 0 ? cleaned : [...DEFAULT_EXCLUDED_DEPTS];
    }
    return [...DEFAULT_EXCLUDED_DEPTS];
  } catch {
    return [...DEFAULT_EXCLUDED_DEPTS];
  }
}

/**
 * Lưu danh sách mã khoa loại trừ vào localStorage
 */
export function saveExcludedDepts(depts: string[]): void {
  try {
    const cleaned = Array.from(
      new Set(depts.map((x) => x.trim().toUpperCase()).filter((x) => Boolean(x))),
    );
    localStorage.setItem(EXCLUDED_DEPTS_STORAGE_KEY, JSON.stringify(cleaned));
  } catch (err) {
    console.error("Lỗi khi lưu danh sách mã khoa loại trừ:", err);
  }
}

/**
 * Kiểm tra xem một mã khoa có thuộc danh sách loại trừ cảnh báo không
 */
export function isExcludedDept(maKhoa: string, customList?: string[]): boolean {
  if (!maKhoa) return false;
  const upper = maKhoa.trim().toUpperCase();
  const list = customList && customList.length > 0 ? customList : loadExcludedDepts();
  return list.some((item) => item.trim().toUpperCase() === upper);
}

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
    const merged: Record<string, Tt12UnitData> = { ...DEFAULT_TT12_CATALOGS };
    for (const [k, v] of Object.entries(parsed as Record<string, Tt12UnitData>)) {
      if (!merged[k]) {
        merged[k] = v;
      } else {
        // Tự động bảo lưu dữ liệu người dùng (kể cả khi mảng rỗng [] do người dùng chủ động xóa)
        merged[k] = {
          unit: v.unit || merged[k].unit,
          bang1: Array.isArray(v.bang1) ? v.bang1 : merged[k].bang1,
          bang2: Array.isArray(v.bang2) ? v.bang2 : merged[k].bang2,
          bang3: Array.isArray(v.bang3) ? v.bang3 : merged[k].bang3,
          bang4: Array.isArray(v.bang4) ? v.bang4 : merged[k].bang4,
          bang5: Array.isArray(v.bang5) ? v.bang5 : merged[k].bang5,
          bang6: Array.isArray(v.bang6) ? v.bang6 : merged[k].bang6,
          updatedAt: v.updatedAt || merged[k].updatedAt,
        };
      }
    }
    return merged;
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

/**
 * Chuẩn hóa mã máy để đối chiếu: bỏ khoảng trắng thừa quanh các dấu phân cách ';', chuyển chữ in hoa
 */
export function normalizeMaMayKey(code: string): string {
  return (code || "")
    .trim()
    .toUpperCase()
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean)
    .join(";");
}

/**
 * Phân tích chuỗi MA_MAY (theo QĐ 130 & QĐ 3176) thành danh sách các máy hoặc hệ thống máy.
 * Theo QĐ 3176:
 * - Cấu trúc máy: XX.n.Z (với n = 1, 2 hoặc 3[xxx]).
 * - Đối với hệ thống máy gồm nhiều máy thì ghi tất cả các serial của các máy, cách nhau bằng dấu ';'.
 *   Ví dụ: "HTM.3[vontuco].C249-02;4275-07;22J2-07;22J2-01" là MỘT hệ thống máy duy nhất.
 * - Khi có nhiều máy độc lập được khai báo cùng nhau:
 *   Ví dụ: "XQ.1.01;XQ.1.02" sẽ được phân tách thành 2 máy: "XQ.1.01" và "XQ.1.02".
 */
export function splitMaMayToMachines(maMay: string): string[] {
  const clean = (maMay || "").trim();
  if (!clean) return [];
  if (!clean.includes(";")) return [clean];

  const rawParts = clean
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);
  if (rawParts.length <= 1) return rawParts;

  // Regex nhận diện sự bắt đầu của một máy mới (có header XX.n. hoặc XX.3[xxx].)
  const headerRegex = /^[A-Za-zÀ-ỹ0-9]{2,4}\.(?:[1-9]|3\[[^\]\r\n\t]+\])\./u;

  const machines: string[] = [];
  let currentMachine = "";

  for (const part of rawParts) {
    const isNewHeader = headerRegex.test(part);
    if (isNewHeader) {
      if (currentMachine) {
        machines.push(currentMachine);
      }
      currentMachine = part;
    } else {
      // Không có header máy mới -> Là serial con nối tiếp của hệ thống máy
      if (currentMachine) {
        currentMachine += `;${part}`;
      } else {
        currentMachine = part;
      }
    }
  }

  if (currentMachine) {
    machines.push(currentMachine);
  }

  return machines.length > 0 ? machines : [clean];
}

function checkMachineValidityDates(
  machine: Tt12Bang6ThietBi,
  machineLabel: string,
  ngayThYlRaw: string,
): string[] {
  const issues: string[] = [];
  if (!ngayThYlRaw) return issues;

  const execDigits = ngayThYlRaw.replace(/\D/g, "").slice(0, 8); // YYYYMMDD
  if (execDigits.length !== 8) return issues;

  if (machine.tuNgay) {
    const fromDigits = machine.tuNgay.replace(/\D/g, "").slice(0, 8);
    if (fromDigits.length === 8 && execDigits < fromDigits) {
      issues.push(
        `Mã máy '${machineLabel}' (${machine.tenTb}) thực hiện ngày ${formatXmlDate(ngayThYlRaw)} trước ngày hiệu lực TT12 (${formatXmlDate(machine.tuNgay)})`,
      );
    }
  }

  if (machine.denNgay) {
    const toDigits = machine.denNgay.replace(/\D/g, "").slice(0, 8);
    if (toDigits.length === 8 && execDigits > toDigits) {
      issues.push(
        `Mã máy '${machineLabel}' (${machine.tenTb}) đã HẾT HẠN HIỆU LỰC TT12 vào ngày ${formatXmlDate(machine.denNgay)} (ngày thực hiện ${formatXmlDate(ngayThYlRaw)})`,
      );
    }
  }

  return issues;
}

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

  const normalizedInput = normalizeMaMayKey(cleanMaMay);

  // 1. Kiểm tra khớp toàn bộ chuỗi MA_MAY (bao gồm cả hệ thống máy nhiều serial theo QĐ 3176)
  const exactMatch = unitData.bang6.find(
    (m) => m.maMay && normalizeMaMayKey(m.maMay) === normalizedInput,
  );

  if (exactMatch) {
    const issues = checkMachineValidityDates(exactMatch, cleanMaMay, ngayThYlRaw);
    return {
      hasWarning: issues.length > 0,
      message: issues.length > 0 ? `XML3: ${issues.join(" · ")}` : "",
      machine: exactMatch,
    };
  }

  // 2. Nếu không khớp trực tiếp toàn bộ chuỗi, phân tách thành từng máy / hệ thống máy độc lập
  const machines = splitMaMayToMachines(cleanMaMay);
  const issues: string[] = [];
  let matchedMachine: Tt12Bang6ThietBi | undefined;

  for (const machineStr of machines) {
    const normMachine = normalizeMaMayKey(machineStr);

    let machine = unitData.bang6.find((m) => m.maMay && normalizeMaMayKey(m.maMay) === normMachine);

    // Nếu không khớp trực tiếp cả hệ thống máy, kiểm tra các trường hợp tương thích theo QĐ 3176:
    // Ví dụ: Bảng 6 lưu cả hệ thống "HTM.3[vontuco].C249-02;4275-07;22J2-07;22J2-01",
    // còn XML3 ghi 1 serial hoặc chuỗi serial con thuộc hệ thống đó (hoặc ngược lại)
    if (!machine) {
      machine = unitData.bang6.find((m) => {
        if (!m.maMay) return false;
        const normTable = normalizeMaMayKey(m.maMay);
        if (normTable === normMachine) return true;

        const matchTable = normTable.match(/^([A-Za-zÀ-ỹ0-9]{2,4}\.(?:[1-9]|3\[[^\]]+\])\.)(.+)$/u);
        const matchInput = normMachine.match(
          /^([A-Za-zÀ-ỹ0-9]{2,4}\.(?:[1-9]|3\[[^\]]+\])\.)(.+)$/u,
        );

        if (matchTable && matchInput && matchTable[1] === matchInput[1]) {
          const tableSerials = matchTable[2].split(";").map((s) => s.trim());
          const inputSerials = matchInput[2].split(";").map((s) => s.trim());
          const allInputInTable = inputSerials.every((s) => tableSerials.includes(s));
          if (allInputInTable) return true;
        }
        return false;
      });
    }

    if (!machine) {
      issues.push(
        `Mã máy '${machineStr}' không tồn tại trong Bảng 6 TT12 của CSKCB ${unitData.unit.maCskcb} (${unitData.unit.tenCskcb})`,
      );
      continue;
    }

    matchedMachine = machine;
    const dateIssues = checkMachineValidityDates(machine, machineStr, ngayThYlRaw);
    if (dateIssues.length > 0) {
      issues.push(...dateIssues);
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

    const fileName = (file.name || "").toLowerCase();
    if (!resolvedMaCskcb) {
      const matchUnit = file.name.match(/\b(26\d{3})\b/);
      if (matchUnit) resolvedMaCskcb = matchUnit[1];
    }

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
          map.MA_CCHN ||
          map.HO_TEN ||
          map.MA_THUOC ||
          map.TEN_THUOC ||
          map.MA_VAT_TU ||
          map.TEN_VAT_TU ||
          map.MA_DICH_VU ||
          map.MA_TUONG_DUONG ||
          map.TEN_DVKT_PHEDUYET ||
          map.TEN_DVKT_GIA
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

      // 1. Bảng 5: Dịch vụ kỹ thuật (Ưu tiên nhận diện trước vì file DVKT xuất từ BHXH thường có các cột thuốc phụ ở cuối)
      const isBang5 =
        sheetName.includes("05") ||
        sheetName.includes("dichvu") ||
        sheetName.includes("dvkt") ||
        fileName.includes("dichvu") ||
        fileName.includes("dvkt") ||
        !!headerMap.TEN_DVKT_PHEDUYET ||
        !!headerMap.TEN_DVKT_GIA ||
        !!headerMap.MA_TUONG_DUONG ||
        !!headerMap.PHAN_LOAI_PTTT ||
        !!headerMap.GIA_DVKT ||
        (!!headerMap.MA_DICH_VU && !headerMap.MA_THUOC && !headerMap.MA_VAT_TU);

      // 2. Bảng 6: Trang thiết bị / Mã máy
      const isBang6 =
        !isBang5 &&
        (sheetName.includes("06") ||
          sheetName.includes("thietbi") ||
          sheetName.includes("tbyte") ||
          fileName.includes("thietbi") ||
          fileName.includes("trangthietbi") ||
          !!headerMap.MA_MAY ||
          !!headerMap.TEN_TB);

      // 3. Bảng 1: Khoa phòng / Giường
      const isBang1 =
        !isBang5 &&
        !isBang6 &&
        (sheetName.includes("01") ||
          sheetName.includes("khoaphong") ||
          sheetName.includes("giuong") ||
          fileName.includes("khoaphong") ||
          fileName.includes("giuong") ||
          (!!headerMap.MA_KHOA &&
            (!!headerMap.BAN_KHAM ||
              !!headerMap.GIUONG_PD ||
              !!headerMap.GIUONG_TK ||
              !!headerMap.LOAI_KHOA)));

      // 4. Bảng 2: Nhân lực KCB (CCHN)
      const isBang2 =
        !isBang5 &&
        !isBang6 &&
        !isBang1 &&
        (sheetName.includes("02") ||
          sheetName.includes("nhanluc") ||
          sheetName.includes("nhanvien") ||
          sheetName.includes("cchn") ||
          fileName.includes("nhanluc") ||
          fileName.includes("nhanvien") ||
          !!headerMap.MACCHN ||
          !!headerMap.MA_CCHN ||
          (!!headerMap.HO_TEN &&
            (!!headerMap.PHAMVI_CM || !!headerMap.CHUCDANH_NN || !!headerMap.SO_CCCD)));

      // 5. Bảng 4: Vật tư y tế
      const isBang4 =
        !isBang5 &&
        !isBang6 &&
        !isBang1 &&
        !isBang2 &&
        (sheetName.includes("04") ||
          sheetName.includes("vattu") ||
          sheetName.includes("vtyt") ||
          fileName.includes("vattu") ||
          fileName.includes("vtyt") ||
          !!headerMap.MA_VAT_TU ||
          (!!headerMap.TEN_VAT_TU && !headerMap.MA_THUOC));

      // 6. Bảng 3: Thuốc & Chế phẩm máu
      const isBang3 =
        !isBang5 &&
        !isBang6 &&
        !isBang1 &&
        !isBang2 &&
        !isBang4 &&
        (sheetName.includes("03") ||
          sheetName.includes("thuoc") ||
          fileName.includes("thuoc") ||
          (!!headerMap.MA_THUOC &&
            (!!headerMap.TEN_HOAT_CHAT ||
              !!headerMap.HAM_LUONG ||
              !!headerMap.DUONG_DUNG ||
              !!headerMap.TEN_THUOC)));

      for (let r = headerRowIndex + 1; r <= sheet.rowCount; r++) {
        const row = sheet.getRow(r);
        const rowCskcb =
          getVal(row, "MA_CSKCB") ||
          getVal(row, "MA_CO_SO") ||
          getVal(row, "MA_CS") ||
          getVal(row, "MA_DON_VI");
        if (rowCskcb && !resolvedMaCskcb) {
          resolvedMaCskcb = rowCskcb;
        }

        if (isBang6) {
          const maMay = getVal(row, "MA_MAY");
          const tenTb = getVal(row, "TEN_TB") || getVal(row, "TEN_THIET_BI");
          if (maMay || tenTb) {
            b6Items.push({
              stt: b6Items.length + 1,
              tenTb: tenTb || maMay,
              kyHieu: getVal(row, "KY_HIEU") || getVal(row, "MODEL"),
              congTySx: getVal(row, "CONGTY_SX") || getVal(row, "HANG_SX"),
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
          const macchn = getVal(row, "MACCHN") || getVal(row, "MA_CCHN") || getVal(row, "SO_CCHN");
          const hoTen = getVal(row, "HO_TEN") || getVal(row, "HOTEN");
          if (macchn || hoTen) {
            b2Items.push({
              stt: b2Items.length + 1,
              maKhoa: getVal(row, "MA_KHOA"),
              tenKhoa: getVal(row, "TEN_KHOA"),
              hoTen: hoTen || macchn,
              gioiTinh: getVal(row, "GIOI_TINH"),
              soDinhDanh:
                getVal(row, "SO_CCCD") || getVal(row, "CCCD") || getVal(row, "SO_DINH_DANH"),
              chucDanhNn: getVal(row, "CHUCDANH_NN") || getVal(row, "CHUC_DANH"),
              viTri: getVal(row, "VI_TRI"),
              macchn: macchn || hoTen,
              ngayCapCchn: getVal(row, "NGAYCAP_CCHN") || getVal(row, "NGAY_CAP_CCHN"),
              noiCapCchn: getVal(row, "NOICAP_CCHN") || getVal(row, "NOI_CAP_CCHN"),
              phamViCm:
                getVal(row, "PHAMVI_CM") ||
                getVal(row, "PHAM_VI_CM") ||
                getVal(row, "PHAM_VI_CHUYEN_MON"),
              maCskcb: rowCskcb || resolvedMaCskcb,
            });
          }
        } else if (isBang3) {
          const maThuoc = getVal(row, "MA_THUOC");
          const tenThuoc = getVal(row, "TEN_THUOC");
          if (maThuoc || tenThuoc) {
            b3Items.push({
              stt: b3Items.length + 1,
              maThuoc: maThuoc || tenThuoc,
              tenHoatChat: getVal(row, "TEN_HOAT_CHAT"),
              tenThuoc: tenThuoc || maThuoc,
              donViTinh: getVal(row, "DON_VI_TINH") || getVal(row, "DVT"),
              hamLuong: getVal(row, "HAM_LUONG"),
              duongDung: getVal(row, "DUONG_DUNG"),
              maDuongDung: getVal(row, "MA_DUONG_DUNG"),
              dangBaoChe: getVal(row, "DANG_BAO_CHE"),
              soDangKy: getVal(row, "SO_DANG_KY") || getVal(row, "SDK"),
              soLuong: Number(getVal(row, "SO_LUONG")) || null,
              donGia: Number(getVal(row, "DON_GIA")) || Number(getVal(row, "DON_GIA_BH")) || null,
              maCskcb: rowCskcb || resolvedMaCskcb,
            });
          }
        } else if (isBang4) {
          const maVatTu = getVal(row, "MA_VAT_TU");
          const tenVatTu = getVal(row, "TEN_VAT_TU");
          if (maVatTu || tenVatTu) {
            b4Items.push({
              stt: b4Items.length + 1,
              maVatTu: maVatTu || tenVatTu,
              nhomVatTu: getVal(row, "NHOM_VAT_TU"),
              tenVatTu: tenVatTu || maVatTu,
              maHieu: getVal(row, "MA_HIEU"),
              soLuuHanh: getVal(row, "SO_LUU_HANH"),
              tinhNangKt: getVal(row, "TINHNANG_KT"),
              quyCach: getVal(row, "QUY_CACH"),
              hangSx: getVal(row, "HANG_SX"),
              nuocSx: getVal(row, "NUOC_SX"),
              donViTinh: getVal(row, "DON_VI_TINH") || getVal(row, "DVT"),
              donGia: Number(getVal(row, "DON_GIA")) || Number(getVal(row, "DON_GIA_BH")) || null,
              maCskcb: rowCskcb || resolvedMaCskcb,
            });
          }
        } else if (isBang5) {
          const maDichVu =
            getVal(row, "MA_DICH_VU") || getVal(row, "MA_TUONG_DUONG") || getVal(row, "MA");
          const tenDichVu =
            getVal(row, "TEN_DICH_VU") ||
            getVal(row, "TEN_DVKT_PHEDUYET") ||
            getVal(row, "TEN_DVKT_GIA") ||
            getVal(row, "TEN");
          if (maDichVu || tenDichVu) {
            b5Items.push({
              stt: b5Items.length + 1,
              maDichVu: maDichVu || tenDichVu,
              tenDichVu: tenDichVu || maDichVu,
              tenDvktGia: getVal(row, "TEN_DVKT_GIA"),
              donGia:
                Number(getVal(row, "DON_GIA")) ||
                Number(getVal(row, "GIA")) ||
                Number(getVal(row, "GIA_DVKT")) ||
                null,
              quyTrinh: getVal(row, "QUY_TRINH"),
              soLuongCgkt: Number(getVal(row, "SO_LUONG_CGKT")) || null,
              cskcbCgkt: getVal(row, "CSKCB_CGKT"),
              cskcbCls: getVal(row, "CSKCB_CLS"),
              qdDvkt:
                getVal(row, "QD_DVKT") || getVal(row, "QUYET_DINH") || getVal(row, "SO_QUYET_DINH"),
              qdPdGia: getVal(row, "QD_PD_GIA"),
              ghiChu: getVal(row, "GHI_CHU") || getVal(row, "GHICHU"),
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

    const details = [
      b1Items.length > 0 ? `Bảng 1: ${b1Items.length.toLocaleString("vi-VN")} khoa phòng` : "",
      b2Items.length > 0 ? `Bảng 2: ${b2Items.length.toLocaleString("vi-VN")} nhân lực CCHN` : "",
      b3Items.length > 0 ? `Bảng 3: ${b3Items.length.toLocaleString("vi-VN")} thuốc` : "",
      b4Items.length > 0 ? `Bảng 4: ${b4Items.length.toLocaleString("vi-VN")} vật tư` : "",
      b5Items.length > 0 ? `Bảng 5: ${b5Items.length.toLocaleString("vi-VN")} DVKT` : "",
      b6Items.length > 0 ? `Bảng 6: ${b6Items.length.toLocaleString("vi-VN")} thiết bị/máy` : "",
    ]
      .filter(Boolean)
      .join(", ");

    return {
      success: true,
      message: `Đã nạp thành công ${totalImported.toLocaleString("vi-VN")} dòng dữ liệu (${details}) cho cơ sở KCB ${resolvedMaCskcb}.`,
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
