import ExcelJS from "exceljs";
import {
  DEFAULT_MANDATORY_MACHINE_SERVICES,
  type MachineServiceRule,
} from "./mandatory-machine-services-data.ts";
import { formatXmlDateTime, formatXmlDate } from "./timezone.ts";
import { addMinutesToXmlDateTime } from "./correction-plan.ts";

export type { MachineServiceRule };
export { DEFAULT_MANDATORY_MACHINE_SERVICES };

export const DEFAULT_MANDATORY_MACHINE_MAP: ReadonlyMap<string, MachineServiceRule> = new Map(
  DEFAULT_MANDATORY_MACHINE_SERVICES.map((item) => [item.code.trim().toUpperCase(), item]),
);

export const DURATION_LIMIT_MINUTES = 70;
export const DEFAULT_GROUP_CODES = ["2", "3", "8", "18"] as const;
export const GROUP_OPTIONS = [
  { code: "1", title: "Xét nghiệm" },
  { code: "2", title: "Chẩn đoán hình ảnh" },
  { code: "3", title: "Thăm dò chức năng" },
  { code: "4", title: "Thuốc" },
  { code: "5", title: "Mã nhóm 5 (chưa có mô tả trong Phụ lục 3)" },
  { code: "6", title: "Mã nhóm 6 (chưa có mô tả trong Phụ lục 3)" },
  { code: "7", title: "Máu" },
  { code: "8", title: "Phẫu thuật" },
  { code: "9", title: "Mã nhóm 9 (chưa có mô tả trong Phụ lục 3)" },
  { code: "10", title: "Vật tư y tế" },
  { code: "11", title: "Mã nhóm 11 (chưa có mô tả trong Phụ lục 3)" },
  { code: "12", title: "Vận chuyển" },
  { code: "13", title: "Khám bệnh" },
  { code: "14", title: "Ngày giường bệnh ban ngày" },
  { code: "15", title: "Ngày giường bệnh điều trị nội trú" },
  { code: "16", title: "Ngày giường lưu" },
  { code: "17", title: "Chế phẩm máu" },
  { code: "18", title: "Thủ thuật" },
] as const;

export type ServiceRule = {
  MA_DICH_VU: string;
  TEN_DICH_VU: string;
  minMinutes?: number | null; // Thời gian tối thiểu (phút), mặc định > 0 (tối thiểu 1 phút)
  maxMinutes: number | null; // Thời gian tối đa (phút), null = loại trừ hoàn toàn
};

export type DrugRule = {
  MA_THUOC: string;
  TEN_THUOC: string;
  excluded: boolean;
};

export type DuplicateMachineInfo = {
  machineCode: string;
  timeMinute: number;
  timeDisplay: string;
  isSamePatient: boolean;
  peerMaLk: string;
  peerMaBn: string;
  peerHoTen: string;
  peerDichVu: string;
  peerMaDichVu: string;
  peerStt: string;
  peerFile: string;
};

export type BedSharingPeerInfo = {
  peerMaLk: string;
  peerMaBn: string;
  peerHoTen: string;
  peerGiuong: string;
  peerKhoa: string;
  overlapDate: string;
  overlapHours: number;
  startTimeDisplay: string;
  endTimeDisplay: string;
};

export type Xml3Record = {
  fileName: string;
  table: "XML3";
  MA_LK: string;
  MA_BN: string;
  HO_TEN: string;
  STT: string;
  MA_DICH_VU: string;
  MA_VAT_TU: string;
  TEN_DICH_VU: string;
  TEN_VAT_TU: string;
  MA_NHOM: string;
  MA_KHOA: string;
  MA_GIUONG: string;
  MA_BAC_SI: string;
  NGUOI_THUC_HIEN: string;
  MA_BENH: string;
  MA_BENH_YHCT: string;
  NGAY_YL: string;
  NGAY_TH_YL: string;
  NGAY_KQ: string;
  MA_MAY: string;
  MA_HIEU_SP: string;
  TT_THAU: string;
  SO_LUONG?: number;
  DON_GIA?: number;
  DON_GIA_BV?: number;
  DON_GIA_BH?: number;
  TYLE_TT?: number;
  TYLE_TT_DV?: number;
  TYLE_TT_BH?: number;
  THANH_TIEN?: number;
  THANH_TIEN_BV?: number;
  THANH_TIEN_BH?: number;
  T_BHTT?: number;
  T_BNTT?: number;
  T_BNCCT?: number;
  MUC_HUONG?: number;
  MA_GIUONG_TRUNG?: string;
  bedWarningType?:
    | "bed-sharing"
    | "multi-day-overlap"
    | "minute-duplicate"
    | "multiple-beds"
    | "missing-bed-code"
    | "bed-exceeds-discharge";
  bedSharingCount?: number;
  bedOverlapDaysCount?: number;
  suggestedTyleTt?: number;
  potentialBedRefusal?: number;
  bedOverlapDate?: string;
  bedOverlapHours?: number;
  bedSharingInfo?: BedSharingPeerInfo[];
  isRetainedBed?: boolean;
  isAdministrativeWarning?: boolean;
  bedAuditAction?: "retained" | "rejected" | "warning";
  durationMinutes: number | null;
  serviceRule?: ServiceRule;
  patient?: PatientInfo;
  hasOrderWarning: boolean;
  hasEqualWarning: boolean;
  hasBedWarning: boolean;
  hasTtThauWarning: boolean;
  hasMaMayWarning: boolean;
  hasDuplicateMachineWarning?: boolean;
  duplicateMachineInfo?: DuplicateMachineInfo[];
  hasZ000Warning?: boolean;
  orderIssues: string[];
  status:
    | "warning"
    | "order-warning"
    | "equal-warning"
    | "bed-warning"
    | "tt-thau-warning"
    | "ma-may-warning"
    | "duplicate-machine-warning"
    | "ok"
    | "missing"
    | "invalid"
    | "negative";
  detail: string;
};

export type WarningSource = string;

export type ValidationWarning = {
  source: WarningSource;
  detailIndex: number;
  MA_LK: string;
  HO_TEN: string;
  MA_BN: string;
  MA_DICH_VU: string;
  TEN_DICH_VU: string;
  message: string;
  record?: Xml3Record;
  patient?: PatientInfo;
  giaTri?: string;
};

export type Xml4Record = {
  fileName: string;
  MA_LK: string;
  STT: string;
  MA_DICH_VU: string;
  NGAY_KQ: string;
  KET_LUAN: string;
  GIA_TRI?: string;
  MA_BENH?: string;
};

export type PatientTableData = {
  tableType: string; // XML1, XML2, ..., XML15
  tableName: string; // Tên hiển thị tiếng Việt
  rawXml: string; // Chuỗi XML gốc
  rows: Record<string, string>[]; // Dữ liệu từng dòng
  headers: string[]; // Danh sách cột
};

export type PatientDossier = {
  maLk: string;
  patient: PatientInfo;
  fileName: string;
  tables: Record<string, PatientTableData>; // "XML1" -> PatientTableData
  warnings: ValidationWarning[];
  xml3Records: Xml3Record[];
  hasWarnings: boolean;
  warningCount: number;
};

export type Xml3Analysis = {
  fileName: string;
  tableFiles: number;
  records: Xml3Record[];
  warnings: Xml3Record[];
  xml1Warnings: ValidationWarning[];
  xml2Warnings: ValidationWarning[];
  xml3Warnings: ValidationWarning[];
  xml4Warnings: ValidationWarning[];
  xml7Warnings: ValidationWarning[];
  z000Warnings: ValidationWarning[];
  missingTimes: number;
  invalidTimes: number;
  negativeTimes: number;
  orderWarnings: number;
  bedWarnings: number;
  ttThauWarnings: number;
  maMayWarnings: number;
  duplicateMachineWarnings: number;
  log: string[];
};

export type BatchAnalysis = {
  records: Xml3Record[];
  warnings: Xml3Record[];
  xml1Warnings: ValidationWarning[];
  xml2Warnings: ValidationWarning[];
  xml3Warnings: ValidationWarning[];
  xml4Warnings: ValidationWarning[];
  xml7Warnings: ValidationWarning[];
  z000Warnings: ValidationWarning[];
  allValidationWarnings: ValidationWarning[];
  files: string[];
  errors: string[];
  tableFiles: number;
  missingTimes: number;
  invalidTimes: number;
  negativeTimes: number;
  orderWarnings: number;
  bedWarnings: number;
  ttThauWarnings: number;
  maMayWarnings: number;
  duplicateMachineWarnings: number;
  dossiers: PatientDossier[];
  dossierMap: Map<string, PatientDossier>;
  patients: Map<string, PatientInfo>;
};

export const XML3_FIELDS = [
  "MA_LK",
  "STT",
  "MA_DICH_VU",
  "MA_VAT_TU",
  "TEN_DICH_VU",
  "TEN_VAT_TU",
  "MA_NHOM",
  "MA_KHOA",
  "MA_GIUONG",
  "MA_BAC_SI",
  "NGUOI_THUC_HIEN",
  "MA_BENH",
  "MA_BENH_YHCT",
  "NGAY_YL",
  "NGAY_TH_YL",
  "NGAY_KQ",
  "MA_MAY",
  "MA_HIEU_SP",
  "TT_THAU",
  "SO_LUONG",
  "DON_GIA",
  "DON_GIA_BV",
  "DON_GIA_BH",
  "TYLE_TT",
  "TYLE_TT_DV",
  "TYLE_TT_BH",
  "THANH_TIEN",
  "THANH_TIEN_BV",
  "THANH_TIEN_BH",
  "T_BHTT",
  "T_BNTT",
  "T_BNCCT",
  "T_NGOAIDS",
  "T_TRANTT",
  "MUC_HUONG",
] as const;

type Xml3Field = (typeof XML3_FIELDS)[number];

function cleanBase64(value: string): string {
  return value.replace(/^data:[^,]+,/, "").replace(/\s+/g, "");
}

function base64ToUtf8(value: string): string {
  const binary = atob(cleanBase64(value));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes).replace(/^\uFEFF/, "");
}

function parseXml(text: string, label: string): Document {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) {
    throw new Error(`${label}: nội dung XML không hợp lệ`);
  }
  return doc;
}

function textOf(parent: Element, tag: Xml3Field): string {
  return parent.getElementsByTagName(tag)[0]?.textContent?.trim() ?? "";
}

function textOfGeneral(parent: Element, tag: string): string {
  return parent.getElementsByTagName(tag)[0]?.textContent?.trim() ?? "";
}

export const XML1_FIELD_LABELS: Record<string, string> = {
  MA_LK: "Mã liên kết",
  MA_BN: "Mã bệnh nhân",
  HO_TEN: "Họ và tên bệnh nhân",
  SO_CCCD: "Số CCCD / Định danh",
  NGAY_SINH: "Ngày sinh",
  NAM_SINH: "Năm sinh",
  GIOI_TINH: "Giới tính",
  DIA_CHI: "Địa chỉ thường trú",
  MA_THE_BHYT: "Mã thẻ BHYT",
  MA_THE: "Mã thẻ BHYT",
  MA_DKBD: "Mã nơi ĐK KCB ban đầu",
  GT_THE_TU: "Giá trị thẻ từ ngày",
  GT_THE_DEN: "Giá trị thẻ đến ngày",
  MIEN_CUNG_CT: "Miễn cùng chi trả từ ngày",
  NAM_NAM_LIEN_TUC: "Thời điểm đủ 5 năm liên tục",
  MA_DOITUONG_KCB: "Mã đối tượng KCB",
  MA_CSKCB: "Mã cơ sở KCB",
  MA_NOI_CHUYEN: "Mã cơ sở chuyển đến/đi",
  MA_TAI_NAN: "Mã tai nạn",
  NGAY_VAO: "Thời gian vào viện",
  NGAY_RA: "Thời gian ra viện",
  SO_NGAY_DTRI: "Số ngày điều trị",
  MA_KHOA: "Mã khoa điều trị ra viện",
  KET_QUA_DTRI: "Kết quả điều trị",
  TINH_TRANG_RV: "Tình trạng ra viện",
  CHAN_DOAN_VAO: "Chẩn đoán khi vào viện",
  CHAN_DOAN_RV: "Chẩn đoán khi ra viện (Cột 26)",
  MA_BENH: "Mã bệnh chính",
  MA_BENH_CHINH: "Mã bệnh chính",
  TEN_BENH: "Tên bệnh chính",
  MA_BENHKEMTHEO: "Mã bệnh kèm theo",
  MA_BENH_KT: "Mã bệnh kèm theo",
  MA_QUOCTICH: "Mã quốc tịch",
  MA_DANTOC: "Mã dân tộc",
  MA_KHUVUC: "Mã khu vực sống",
  NGHE_NGHIEP: "Nghề nghiệp",
  NOI_LAM_VIEC: "Nơi làm việc",
  CAN_NANG: "Cân nặng (kg)",
  NGAY_TTOAN: "Ngày thanh toán",
  TIEN_TONG: "Tổng chi phí KCB",
  TIEN_BHYT: "Chi phí BHYT thanh toán",
  TIEN_BNTT: "Bệnh nhân tự trả",
  TIEN_BNCT: "Bệnh nhân cùng chi trả",
  TIEN_NGUONKHAC: "Nguồn kinh phí khác",
  TIEN_NGOAIDS: "Chi phí ngoài danh mục",
};

export type PatientInfo = {
  MA_LK: string;
  MA_BN: string;
  HO_TEN: string;
  NGAY_VAO?: string;
  NGAY_RA?: string;
  NGAY_SINH?: string;
  GIOI_TINH?: string;
  DIA_CHI?: string;
  MA_THE_BHYT?: string;
  MA_DKBD?: string;
  MA_BENH?: string;
  TEN_BENH?: string;
  SO_CCCD?: string;
  MA_CSKCB?: string;
  MA_KHOA?: string;
  MA_DOITUONG_KCB?: string;
  KET_QUA_DTRI?: string;
  TINH_TRANG_RV?: string;
  CHAN_DOAN_RV?: string;
  CHAN_DOAN_VAO?: string;
  MA_BENHKEMTHEO?: string;
  MA_BENH_CHINH?: string;
  GT_THE_TU?: string;
  GT_THE_DEN?: string;
  MA_KHUVUC?: string;
  MA_QUOCTICH?: string;
  MA_DANTOC?: string;
  NGHE_NGHIEP?: string;
  NOI_LAM_VIEC?: string;
  MA_NOI_CHUYEN?: string;
  MA_TAI_NAN?: string;
  SO_NGAY_DTRI?: string;
  NGAY_TTOAN?: string;
  CAN_NANG?: string;
  NAM_NAM_LIEN_TUC?: string;
  MIEN_CUNG_CT?: string;
  MUC_HUONG?: string;
  TIEN_TONG?: string;
  TIEN_BHYT?: string;
  TIEN_BNTT?: string;
  rawFields?: Record<string, string>;
};

/**
 * Trích xuất chẩn đoán chính từ cột 26 trong bảng XML1 (CHAN_DOAN_RV).
 * Lấy mã bệnh từ chi tiết mã bệnh đầu tiên (trước dấu ;) ở cột CHAN_DOAN_RV.
 */
export function extractPrimaryDiagnosis(
  chanDoanRv?: string,
  fallbackMaBenh?: string,
  fallbackTenBenh?: string,
): { code: string; full: string } {
  const raw = chanDoanRv ? chanDoanRv.trim() : "";
  if (raw) {
    // Chi tiết mã bệnh đầu tiên (trước dấu ;)
    const firstPart = raw.split(";")[0]?.trim() ?? "";
    if (firstPart) {
      // Tìm xem có mã ICD ở đầu không (VD: "I10", "K29.7", "Z00.0", "A00.1 - Tả")
      const match = firstPart.match(/^([A-Za-z][0-9][0-9A-Za-z.]*)/);
      if (match) {
        return {
          code: match[1],
          full: firstPart,
        };
      }
      return {
        code: firstPart,
        full: firstPart,
      };
    }
  }
  const code = fallbackMaBenh ? fallbackMaBenh.trim() : "";
  const full = fallbackTenBenh ? fallbackTenBenh.trim() : code;
  return { code, full };
}

export type WarningCategory =
  | "all"
  | "overMax"
  | "underMin"
  | "dupMachine"
  | "maMay"
  | "ttThau"
  | "order"
  | "equal"
  | "z000"
  | "bed"
  | "ketLuan"
  | "cccd";

export const DEFAULT_WARNING_COLORS: Record<WarningCategory, string> = {
  all: "#E11D48",
  overMax: "#E11D48",
  underMin: "#D97706",
  dupMachine: "#4338CA",
  maMay: "#7C3AED",
  ttThau: "#0284C7",
  order: "#CA8A04",
  equal: "#EA580C",
  z000: "#C026D3",
  bed: "#78716C",
  ketLuan: "#0F766E",
  cccd: "#2563EB",
};

export const WARNING_COLORS_KEY = "nsn-xmlcheck-warning-colors";

export function loadWarningColors(): Record<WarningCategory, string> {
  try {
    const saved = localStorage.getItem(WARNING_COLORS_KEY);
    if (!saved) return { ...DEFAULT_WARNING_COLORS };
    const parsed = JSON.parse(saved);
    return { ...DEFAULT_WARNING_COLORS, ...parsed };
  } catch {
    return { ...DEFAULT_WARNING_COLORS };
  }
}

export function saveWarningColors(colors: Partial<Record<WarningCategory, string>>): void {
  const current = loadWarningColors();
  const next = { ...current, ...colors };
  localStorage.setItem(WARNING_COLORS_KEY, JSON.stringify(next));
}

export function resetWarningColors(): Record<WarningCategory, string> {
  localStorage.removeItem(WARNING_COLORS_KEY);
  return { ...DEFAULT_WARNING_COLORS };
}

export type WarningCategoryMeta = {
  id: WarningCategory;
  label: string;
  badgeText: string;
  badgeClass: string;
  chipClass: string;
  activeChipClass: string;
  icon: string;
  defaultColor: string;
};

export const WARNING_CATEGORY_CONFIG: Record<WarningCategory, WarningCategoryMeta> = {
  all: {
    id: "all",
    label: "Tất cả cảnh báo",
    badgeText: "CẢNH BÁO",
    badgeClass: "bg-rose-600 text-white",
    chipClass: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    activeChipClass: "bg-slate-800 text-white border-slate-800 shadow-sm",
    icon: "📋",
    defaultColor: DEFAULT_WARNING_COLORS.all,
  },
  overMax: {
    id: "overMax",
    label: "Vượt thời lượng (>70p)",
    badgeText: "VƯỢT MAX",
    badgeClass: "bg-rose-600 text-white border border-rose-700 shadow-xs",
    chipClass: "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100",
    activeChipClass: "bg-rose-600 text-white border-rose-600 shadow-sm",
    icon: "🔴",
    defaultColor: DEFAULT_WARNING_COLORS.overMax,
  },
  underMin: {
    id: "underMin",
    label: "Thời gian ≤ 0 / Thiếu",
    badgeText: "THIẾU MIN",
    badgeClass: "bg-amber-600 text-white border border-amber-700 shadow-xs",
    chipClass: "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100",
    activeChipClass: "bg-amber-600 text-white border-amber-600 shadow-sm",
    icon: "🟠",
    defaultColor: DEFAULT_WARNING_COLORS.underMin,
  },
  dupMachine: {
    id: "dupMachine",
    label: "Trùng máy (XML3)",
    badgeText: "TRÙNG MÁY",
    badgeClass: "bg-indigo-700 text-white border border-indigo-800 shadow-xs",
    chipClass: "border-indigo-200 bg-indigo-50 text-indigo-900 hover:bg-indigo-100",
    activeChipClass: "bg-indigo-700 text-white border-indigo-700 shadow-sm",
    icon: "⚡",
    defaultColor: DEFAULT_WARNING_COLORS.dupMachine,
  },
  maMay: {
    id: "maMay",
    label: "Mã máy sai/thiếu",
    badgeText: "MÃ MÁY",
    badgeClass: "bg-purple-600 text-white border border-purple-700 shadow-xs",
    chipClass: "border-purple-200 bg-purple-50 text-purple-900 hover:bg-purple-100",
    activeChipClass: "bg-purple-600 text-white border-purple-600 shadow-sm",
    icon: "🟣",
    defaultColor: DEFAULT_WARNING_COLORS.maMay,
  },
  ttThau: {
    id: "ttThau",
    label: "Thiếu TT_THAU",
    badgeText: "TT_THAU",
    badgeClass: "bg-sky-600 text-white border border-sky-700 shadow-xs",
    chipClass: "border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100",
    activeChipClass: "bg-sky-600 text-white border-sky-600 shadow-sm",
    icon: "🔵",
    defaultColor: DEFAULT_WARNING_COLORS.ttThau,
  },
  order: {
    id: "order",
    label: "Sai thứ tự thời gian",
    badgeText: "SAI THỨ TỰ",
    badgeClass: "bg-yellow-600 text-white border border-yellow-700 shadow-xs",
    chipClass: "border-yellow-200 bg-yellow-50 text-yellow-900 hover:bg-yellow-100",
    activeChipClass: "bg-yellow-600 text-white border-yellow-600 shadow-sm",
    icon: "🟡",
    defaultColor: DEFAULT_WARNING_COLORS.order,
  },
  equal: {
    id: "equal",
    label: "Trùng mốc thời gian",
    badgeText: "TRÙNG MỐC",
    badgeClass: "bg-orange-600 text-white border border-orange-700 shadow-xs",
    chipClass: "border-orange-200 bg-orange-50 text-orange-900 hover:bg-orange-100",
    activeChipClass: "bg-orange-600 text-white border-orange-600 shadow-sm",
    icon: "🟠",
    defaultColor: DEFAULT_WARNING_COLORS.equal,
  },
  z000: {
    id: "z000",
    label: "Mã bệnh Z00.0 / Z30.1",
    badgeText: "Z00.0/Z30.1",
    badgeClass: "bg-fuchsia-600 text-white border border-fuchsia-700 shadow-xs",
    chipClass: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900 hover:bg-fuchsia-100",
    activeChipClass: "bg-fuchsia-600 text-white border-fuchsia-600 shadow-sm",
    icon: "🌸",
    defaultColor: DEFAULT_WARNING_COLORS.z000,
  },
  bed: {
    id: "bed",
    label: "Giường ghép & Ngày giường > 1 (KT251)",
    badgeText: "GIƯỜNG GHÉP",
    badgeClass: "bg-amber-700 text-white border border-amber-800 shadow-xs",
    chipClass: "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100",
    activeChipClass: "bg-amber-700 text-white border-amber-700 shadow-sm",
    icon: "🛏️",
    defaultColor: DEFAULT_WARNING_COLORS.bed,
  },
  ketLuan: {
    id: "ketLuan",
    label: "Thiếu kết luận XML4",
    badgeText: "KẾT LUẬN",
    badgeClass: "bg-teal-700 text-white border border-teal-800 shadow-xs",
    chipClass: "border-teal-200 bg-teal-50 text-teal-900 hover:bg-teal-100",
    activeChipClass: "bg-teal-700 text-white border-teal-700 shadow-sm",
    icon: "🟢",
    defaultColor: DEFAULT_WARNING_COLORS.ketLuan,
  },
  cccd: {
    id: "cccd",
    label: "CCCD dưới 12 số (XML1)",
    badgeText: "CCCD",
    badgeClass: "bg-blue-600 text-white border border-blue-700 shadow-xs",
    chipClass: "border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100",
    activeChipClass: "bg-blue-600 text-white border-blue-600 shadow-sm",
    icon: "🪪",
    defaultColor: DEFAULT_WARNING_COLORS.cccd,
  },
};

export function getXml3RecordCategory(record: Xml3Record): WarningCategory {
  if (record.hasDuplicateMachineWarning) return "dupMachine";
  if (record.hasZ000Warning) return "z000";
  if (record.hasMaMayWarning) return "maMay";
  if (record.hasTtThauWarning) return "ttThau";
  if (record.hasBedWarning) return "bed";
  if (record.hasEqualWarning) return "equal";
  if (record.hasOrderWarning) return "order";
  if (
    record.status === "negative" ||
    record.status === "missing" ||
    record.status === "invalid" ||
    (record.durationMinutes !== null && record.durationMinutes <= 0) ||
    record.detail.includes("nhỏ hơn thời gian tối thiểu") ||
    record.detail.includes("Thời lượng 0 phút")
  ) {
    return "underMin";
  }
  if (record.status === "warning" || record.detail.includes("Vượt")) {
    return "overMax";
  }
  return "all";
}

export function getRecordStatusLabel(record: Xml3Record): string {
  if (record.hasDuplicateMachineWarning) return "TRÙNG MÁY";
  if (record.hasZ000Warning) {
    return record.detail.includes("Z30.1") ? "Z30.1" : "Z00.0";
  }
  if (record.hasOrderWarning) return "SAI THỨ TỰ";
  if (record.hasEqualWarning) return "TRÙNG MỐC";
  if (record.hasBedWarning) {
    if (record.bedWarningType === "multiple-beds") {
      return record.bedAuditAction === "rejected" ? "NGÀY GIƯỜNG > 1 (XT)" : "NGÀY GIƯỜNG > 1";
    }
    if (record.bedWarningType === "bed-exceeds-discharge") return "VƯỢT GIỜ RA";
    if (record.bedWarningType === "minute-duplicate") return "TRÙNG PHÚT";
    if (record.bedAuditAction === "retained") return "GIƯỜNG (GIỮ LẠI)";
    if (record.bedAuditAction === "rejected") {
      if (record.bedOverlapDaysCount && record.bedOverlapDaysCount >= 2) {
        return `GỐI ĐẦU ${record.bedOverlapDaysCount}N (XT)`;
      }
      return "GIƯỜNG GHÉP (XT)";
    }
    if (record.bedOverlapDaysCount && record.bedOverlapDaysCount >= 2) {
      return `GỐI ĐẦU ${record.bedOverlapDaysCount}N`;
    }
    if (record.bedWarningType === "bed-sharing") {
      return (record.bedSharingCount ?? 2) >= 3 ? "GHÉP 3+ NGƯỜI" : "GHÉP 2 NGƯỜI";
    }
    if (record.bedWarningType === "missing-bed-code") return "THIẾU MÃ GIƯỜNG";
    return "GIƯỜNG";
  }
  if (record.hasTtThauWarning) return "TT_THAU";
  if (record.hasMaMayWarning) return "MÃ MÁY";
  if (record.status === "warning") return "VƯỢT MAX";
  if (record.status === "ok") return "ĐẠT";
  if (record.status === "missing") return "THIẾU";
  if (record.status === "invalid") return "LỖI";
  if (record.status === "negative") return "THỜI GIAN ÂM";
  return record.status.toUpperCase();
}

export function getValidationWarningCategory(warning: ValidationWarning): WarningCategory {
  if (
    warning.message.includes("trên cùng mã máy") ||
    warning.message.includes("trùng thời gian thực hiện y lệnh")
  )
    return "dupMachine";
  if (
    warning.source === "XML1" &&
    (warning.message.includes("CCCD") || warning.message.includes("12 ký tự"))
  )
    return "cccd";
  if (warning.message.includes("Z00.0") || warning.message.includes("Z30.1")) return "z000";
  if (warning.message.includes("TT_THAU")) return "ttThau";
  if (warning.source === "XML4" && warning.message.includes("KET_LUAN")) return "ketLuan";
  if (warning.message.includes("MA_MAY") || warning.message.includes("mã máy")) return "maMay";
  if (warning.message.includes("giường") || warning.message.includes("GIUONG")) return "bed";
  if (warning.message.includes("trùng mốc") || warning.message.includes("=")) return "equal";
  if (warning.message.includes("thứ tự") || warning.message.includes("sớm hơn")) return "order";
  return "all";
}

export function withPatientInfo(
  record: Xml3Record,
  patients: ReadonlyMap<string, PatientInfo>,
): Xml3Record {
  const patient = patients.get(record.MA_LK);
  return {
    ...record,
    MA_BN: patient?.MA_BN ?? record.MA_BN ?? "",
    HO_TEN: patient?.HO_TEN ?? record.HO_TEN ?? "",
    patient: patient ?? record.patient,
  };
}

function directTextOf(parent: Element, tag: string): string {
  return (
    Array.from(parent.children)
      .find((child) => child.tagName.toUpperCase() === tag.toUpperCase())
      ?.textContent?.trim() ?? ""
  );
}

export function isDiseaseCodeField(tag: string): boolean {
  if (!tag) return false;
  const upper = tag.trim().toUpperCase();
  if (upper.startsWith("TEN_") || upper.includes("TEN_BENH")) {
    return false;
  }
  if (
    upper === "MA_BENH" ||
    upper === "MA_BENH_CHINH" ||
    upper === "MA_BENH_KT" ||
    upper === "MA_BENHKEMTHEO" ||
    upper === "MA_BENH_YHCT" ||
    upper === "MA_BENH_PHU" ||
    upper === "MA_BENH_MAN_TINH"
  ) {
    return true;
  }
  if (upper.includes("MA_BENH") || upper.includes("BENHKEMTHEO")) {
    return true;
  }
  return false;
}

export function hasZ000DiseaseCode(value: string | undefined | null): boolean {
  if (!value) return false;
  const normalized = value.trim().toUpperCase();
  if (!normalized) return false;
  return /(^|[;,|\s/():+-])(Z00\.0|Z000)($|[;,|\s/():+-])/i.test(normalized);
}

export function hasZ301DiseaseCode(value: string | undefined | null): boolean {
  if (!value) return false;
  const normalized = value.trim().toUpperCase();
  if (!normalized) return false;
  return /(^|[;,|\s/():+-])(Z30\.1|Z301)($|[;,|\s/():+-])/i.test(normalized);
}

export function formatZ000WarningMessage(tableType: string, detailIndex: number | string): string {
  const tableNum = tableType.replace(/^XML[\s_]*/i, "") || tableType;
  return `XML ${tableNum}. Chi tiết thứ ${detailIndex}: Mã bệnh  'Z00.0' là mã khám sức khỏe không được thanh toán BHYT.`;
}

export function formatZ301WarningMessage(tableType: string, detailIndex: number | string): string {
  const tableNum = tableType.replace(/^XML[\s_]*/i, "") || tableType;
  return `XML ${tableNum}. Chi tiết thứ ${detailIndex}: Mã bệnh 'Z30.1' (Đặt dụng cụ tránh thai) không được thanh toán BHYT theo Khoản 10 Điều 23 Luật BHYT (Kế hoạch hóa gia đình).`;
}

export function findZ000WarningsInRows(
  tableType: string,
  rows: Record<string, string>[],
  patients: ReadonlyMap<string, PatientInfo> = new Map(),
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  rows.forEach((row, index) => {
    let hasZ000 = false;
    let hasZ301 = false;
    let foundValZ000 = "";
    let foundValZ301 = "";
    for (const [key, val] of Object.entries(row)) {
      const isDiseaseKey =
        isDiseaseCodeField(key) || key === "CHAN_DOAN_RV" || key === "CHAN_DOAN_VAO";
      if (isDiseaseKey) {
        if (hasZ000DiseaseCode(val)) {
          hasZ000 = true;
          foundValZ000 = val;
        }
        if (hasZ301DiseaseCode(val)) {
          hasZ301 = true;
          foundValZ301 = val;
        }
      }
    }
    const maLk = row.MA_LK || "";
    const patient = patients.get(maLk);
    const stt = row.STT || row.stt || "";
    const detailIndex = Number(stt) || index + 1;
    const baseWarning = {
      source: tableType,
      detailIndex,
      MA_LK: maLk,
      HO_TEN: row.HO_TEN || patient?.HO_TEN || "",
      MA_BN: row.MA_BN || patient?.MA_BN || "",
      patient: patient ?? { MA_LK: maLk, MA_BN: row.MA_BN || "", HO_TEN: row.HO_TEN || "" },
    };
    if (hasZ000) {
      warnings.push({
        ...baseWarning,
        MA_DICH_VU: row.MA_DICH_VU || row.MA_THUOC || foundValZ000 || "Z00.0",
        TEN_DICH_VU: row.TEN_DICH_VU || row.TEN_THUOC || row.TEN_BENH || "Khám sức khỏe",
        message: formatZ000WarningMessage(tableType, detailIndex),
      });
    }
    if (hasZ301) {
      warnings.push({
        ...baseWarning,
        MA_DICH_VU: row.MA_DICH_VU || row.MA_THUOC || foundValZ301 || "Z30.1",
        TEN_DICH_VU: row.TEN_DICH_VU || row.TEN_THUOC || row.TEN_BENH || "Đặt dụng cụ tránh thai",
        message: formatZ301WarningMessage(tableType, detailIndex),
      });
    }
  });
  return warnings;
}

export function readXml1Patients(doc: Document): Map<string, PatientInfo> {
  const patients = new Map<string, PatientInfo>();
  for (const node of Array.from(doc.getElementsByTagName("*"))) {
    const maLk = directTextOf(node, "MA_LK") || textOfGeneral(node, "MA_LK");
    const maBn = directTextOf(node, "MA_BN") || textOfGeneral(node, "MA_BN");
    const hoTen = directTextOf(node, "HO_TEN") || textOfGeneral(node, "HO_TEN");
    if (maLk && (maBn || hoTen)) {
      const rawFields: Record<string, string> = {};
      for (const child of Array.from(node.children)) {
        const tag = child.tagName;
        const val = child.textContent?.trim() ?? "";
        if (tag && val) {
          rawFields[tag] = val;
        }
      }

      const patient: PatientInfo = {
        MA_LK: maLk,
        MA_BN: maBn,
        HO_TEN: hoTen,
        NGAY_VAO: directTextOf(node, "NGAY_VAO") || textOfGeneral(node, "NGAY_VAO"),
        NGAY_RA: directTextOf(node, "NGAY_RA") || textOfGeneral(node, "NGAY_RA"),
        NGAY_SINH:
          directTextOf(node, "NGAY_SINH") ||
          textOfGeneral(node, "NGAY_SINH") ||
          directTextOf(node, "NAM_SINH") ||
          textOfGeneral(node, "NAM_SINH"),
        GIOI_TINH: directTextOf(node, "GIOI_TINH") || textOfGeneral(node, "GIOI_TINH"),
        DIA_CHI: directTextOf(node, "DIA_CHI") || textOfGeneral(node, "DIA_CHI"),
        MA_THE_BHYT:
          directTextOf(node, "MA_THE_BHYT") ||
          textOfGeneral(node, "MA_THE_BHYT") ||
          directTextOf(node, "MA_THE") ||
          textOfGeneral(node, "MA_THE"),
        MA_DKBD: directTextOf(node, "MA_DKBD") || textOfGeneral(node, "MA_DKBD"),
        MA_BENH: directTextOf(node, "MA_BENH") || textOfGeneral(node, "MA_BENH"),
        TEN_BENH: directTextOf(node, "TEN_BENH") || textOfGeneral(node, "TEN_BENH"),
        SO_CCCD:
          directTextOf(node, "SO_CCCD") ||
          textOfGeneral(node, "SO_CCCD") ||
          directTextOf(node, "CCCD") ||
          textOfGeneral(node, "CCCD"),
        MA_CSKCB: directTextOf(node, "MA_CSKCB") || textOfGeneral(node, "MA_CSKCB"),
        MA_KHOA: directTextOf(node, "MA_KHOA") || textOfGeneral(node, "MA_KHOA"),
        MA_DOITUONG_KCB:
          directTextOf(node, "MA_DOITUONG_KCB") || textOfGeneral(node, "MA_DOITUONG_KCB"),
        KET_QUA_DTRI: directTextOf(node, "KET_QUA_DTRI") || textOfGeneral(node, "KET_QUA_DTRI"),
        TINH_TRANG_RV: directTextOf(node, "TINH_TRANG_RV") || textOfGeneral(node, "TINH_TRANG_RV"),
        CHAN_DOAN_RV: directTextOf(node, "CHAN_DOAN_RV") || textOfGeneral(node, "CHAN_DOAN_RV"),
        CHAN_DOAN_VAO: directTextOf(node, "CHAN_DOAN_VAO") || textOfGeneral(node, "CHAN_DOAN_VAO"),
        MA_BENHKEMTHEO:
          directTextOf(node, "MA_BENHKEMTHEO") ||
          textOfGeneral(node, "MA_BENHKEMTHEO") ||
          directTextOf(node, "MA_BENH_KT") ||
          textOfGeneral(node, "MA_BENH_KT"),
        MA_BENH_CHINH: directTextOf(node, "MA_BENH_CHINH") || textOfGeneral(node, "MA_BENH_CHINH"),
        GT_THE_TU: directTextOf(node, "GT_THE_TU") || textOfGeneral(node, "GT_THE_TU"),
        GT_THE_DEN: directTextOf(node, "GT_THE_DEN") || textOfGeneral(node, "GT_THE_DEN"),
        MA_KHUVUC: directTextOf(node, "MA_KHUVUC") || textOfGeneral(node, "MA_KHUVUC"),
        MA_QUOCTICH: directTextOf(node, "MA_QUOCTICH") || textOfGeneral(node, "MA_QUOCTICH"),
        MA_DANTOC: directTextOf(node, "MA_DANTOC") || textOfGeneral(node, "MA_DANTOC"),
        NGHE_NGHIEP: directTextOf(node, "NGHE_NGHIEP") || textOfGeneral(node, "NGHE_NGHIEP"),
        NOI_LAM_VIEC: directTextOf(node, "NOI_LAM_VIEC") || textOfGeneral(node, "NOI_LAM_VIEC"),
        MA_NOI_CHUYEN: directTextOf(node, "MA_NOI_CHUYEN") || textOfGeneral(node, "MA_NOI_CHUYEN"),
        MA_TAI_NAN: directTextOf(node, "MA_TAI_NAN") || textOfGeneral(node, "MA_TAI_NAN"),
        SO_NGAY_DTRI: directTextOf(node, "SO_NGAY_DTRI") || textOfGeneral(node, "SO_NGAY_DTRI"),
        NGAY_TTOAN: directTextOf(node, "NGAY_TTOAN") || textOfGeneral(node, "NGAY_TTOAN"),
        CAN_NANG: directTextOf(node, "CAN_NANG") || textOfGeneral(node, "CAN_NANG"),
        NAM_NAM_LIEN_TUC:
          directTextOf(node, "NAM_NAM_LIEN_TUC") || textOfGeneral(node, "NAM_NAM_LIEN_TUC"),
        MIEN_CUNG_CT: directTextOf(node, "MIEN_CUNG_CT") || textOfGeneral(node, "MIEN_CUNG_CT"),
        TIEN_TONG: directTextOf(node, "TIEN_TONG") || textOfGeneral(node, "TIEN_TONG"),
        TIEN_BHYT: directTextOf(node, "TIEN_BHYT") || textOfGeneral(node, "TIEN_BHYT"),
        TIEN_BNTT: directTextOf(node, "TIEN_BNTT") || textOfGeneral(node, "TIEN_BNTT"),
        rawFields,
      };
      patients.set(maLk, patient);
    }
  }
  return patients;
}

export function readXml1Warnings(
  doc: Document,
  patients: ReadonlyMap<string, PatientInfo> = new Map(),
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const rows = Array.from(doc.getElementsByTagName("*"))
    .filter((node) => directTextOf(node, "MA_LK"))
    .map((node, index) => ({ node, detailIndex: index + 1 }));

  rows.forEach(({ node, detailIndex }) => {
    const cccdRaw =
      directTextOf(node, "SO_CCCD") ||
      textOfGeneral(node, "SO_CCCD") ||
      directTextOf(node, "CCCD") ||
      textOfGeneral(node, "CCCD");
    const value = cccdRaw.trim();
    const maDkbd = directTextOf(node, "MA_DKBD") || textOfGeneral(node, "MA_DKBD");
    const maCskcb = directTextOf(node, "MA_CSKCB") || textOfGeneral(node, "MA_CSKCB");
    const maDoiTuong =
      directTextOf(node, "MA_DOITUONG_KCB") || textOfGeneral(node, "MA_DOITUONG_KCB");
    const maLk = directTextOf(node, "MA_LK") || textOfGeneral(node, "MA_LK");
    const hoTen = directTextOf(node, "HO_TEN") || textOfGeneral(node, "HO_TEN");
    const maBn = directTextOf(node, "MA_BN") || textOfGeneral(node, "MA_BN");
    const patient = patients.get(maLk);

    const base = {
      source: "XML1" as const,
      detailIndex,
      MA_LK: maLk,
      HO_TEN: hoTen || patient?.HO_TEN || "",
      MA_BN: maBn || patient?.MA_BN || "",
      MA_DICH_VU: "",
      TEN_DICH_VU: "",
      patient: patient ?? { MA_LK: maLk, MA_BN: maBn, HO_TEN: hoTen },
    };
    if (value) {
      if (value.length < 12) {
        warnings.push({
          ...base,
          MA_DICH_VU: "SO_CCCD",
          TEN_DICH_VU: "Số CCCD / Định danh",
          message: `XML 1. Chi tiết thứ ${detailIndex}: Trường SO_CCCD dưới 12 ký tự (hiện có ${value.length} ký tự). Giá trị: ${value}`,
        });
      } else if (!/^\d{12}$/.test(value)) {
        warnings.push({
          ...base,
          MA_DICH_VU: "SO_CCCD",
          TEN_DICH_VU: "Số CCCD / Định danh",
          message: `XML 1. Chi tiết thứ ${detailIndex}: SO_CCCD không đúng định dạng (phải đúng 12 chữ số). Giá trị sai: ${value}`,
        });
      }
    }
    if (maDkbd && maCskcb && maDkbd === maCskcb && maDoiTuong !== "1.1") {
      warnings.push({
        ...base,
        MA_DICH_VU: "MA_DKBD",
        TEN_DICH_VU: "Nơi ĐK KCB ban đầu",
        message: `XML 1. Chi tiết thứ ${detailIndex}: MA_DKBD phải khác MA_CSKCB cho đối tượng khác 1.1`,
      });
    }

    // Kiểm tra mã bệnh Z00.0 và Z30.1 trong XML1
    const maBenh =
      directTextOf(node, "MA_BENH") ||
      textOfGeneral(node, "MA_BENH") ||
      directTextOf(node, "MA_BENH_CHINH") ||
      textOfGeneral(node, "MA_BENH_CHINH");
    const maBenhKt =
      directTextOf(node, "MA_BENHKEMTHEO") ||
      textOfGeneral(node, "MA_BENHKEMTHEO") ||
      directTextOf(node, "MA_BENH_KT") ||
      textOfGeneral(node, "MA_BENH_KT");
    const maBenhYhct = directTextOf(node, "MA_BENH_YHCT") || textOfGeneral(node, "MA_BENH_YHCT");
    const chanDoanRv = directTextOf(node, "CHAN_DOAN_RV") || textOfGeneral(node, "CHAN_DOAN_RV");
    const chanDoanVao = directTextOf(node, "CHAN_DOAN_VAO") || textOfGeneral(node, "CHAN_DOAN_VAO");

    const hasZ000InXml1 =
      hasZ000DiseaseCode(maBenh) ||
      hasZ000DiseaseCode(maBenhKt) ||
      hasZ000DiseaseCode(maBenhYhct) ||
      hasZ000DiseaseCode(chanDoanRv) ||
      hasZ000DiseaseCode(chanDoanVao) ||
      Array.from(node.children).some(
        (child) => isDiseaseCodeField(child.tagName) && hasZ000DiseaseCode(child.textContent),
      );

    if (hasZ000InXml1) {
      warnings.push({
        ...base,
        MA_DICH_VU: "Z00.0",
        TEN_DICH_VU:
          directTextOf(node, "TEN_BENH") || textOfGeneral(node, "TEN_BENH") || "Khám sức khỏe",
        message: formatZ000WarningMessage("XML1", detailIndex),
      });
    }

    const hasZ301InXml1 =
      hasZ301DiseaseCode(maBenh) ||
      hasZ301DiseaseCode(maBenhKt) ||
      hasZ301DiseaseCode(maBenhYhct) ||
      hasZ301DiseaseCode(chanDoanRv) ||
      hasZ301DiseaseCode(chanDoanVao) ||
      Array.from(node.children).some(
        (child) => isDiseaseCodeField(child.tagName) && hasZ301DiseaseCode(child.textContent),
      );

    if (hasZ301InXml1) {
      warnings.push({
        ...base,
        MA_DICH_VU: "Z30.1",
        TEN_DICH_VU:
          directTextOf(node, "TEN_BENH") ||
          textOfGeneral(node, "TEN_BENH") ||
          "Đặt dụng cụ tránh thai",
        message: formatZ301WarningMessage("XML1", detailIndex),
      });
    }
  });
  return warnings;
}

export function readXml2Warnings(
  doc: Document,
  patients: ReadonlyMap<string, PatientInfo> = new Map(),
  drugRules: ReadonlyMap<string, DrugRule> | ReadonlyArray<DrugRule> = [],
): ValidationWarning[] {
  const drugRuleMap: ReadonlyMap<string, DrugRule> = Array.isArray(drugRules)
    ? new Map(
        (drugRules as ReadonlyArray<DrugRule>).map((r) => [r.MA_THUOC.trim().toUpperCase(), r]),
      )
    : (drugRules as ReadonlyMap<string, DrugRule>);
  const warnings: ValidationWarning[] = [];
  const candidateTags = ["CHI_TIET_THUOC", "CHI_TIET"];
  let rows: Element[] = [];
  for (const tag of candidateTags) {
    const list = Array.from(doc.getElementsByTagName(tag));
    if (list.length > 0) {
      rows = list;
      break;
    }
  }
  if (rows.length === 0) {
    rows = Array.from(doc.getElementsByTagName("*")).filter(
      (node) =>
        (directTextOf(node, "MA_LK") || textOfGeneral(node, "MA_LK")) &&
        (directTextOf(node, "MA_THUOC") ||
          textOfGeneral(node, "MA_THUOC") ||
          directTextOf(node, "MA_DICH_VU") ||
          textOfGeneral(node, "MA_DICH_VU") ||
          directTextOf(node, "STT")),
    );
  }

  rows.forEach((node, index) => {
    const stt = directTextOf(node, "STT") || textOfGeneral(node, "STT");
    const detailIndex = Number(stt) || index + 1;
    const ttThau = directTextOf(node, "TT_THAU") || textOfGeneral(node, "TT_THAU");
    const maLk = directTextOf(node, "MA_LK") || textOfGeneral(node, "MA_LK");
    const maThuoc =
      directTextOf(node, "MA_THUOC") ||
      textOfGeneral(node, "MA_THUOC") ||
      directTextOf(node, "MA_DICH_VU") ||
      textOfGeneral(node, "MA_DICH_VU");
    const tenThuoc =
      directTextOf(node, "TEN_THUOC") ||
      textOfGeneral(node, "TEN_THUOC") ||
      directTextOf(node, "TEN_DICH_VU") ||
      textOfGeneral(node, "TEN_DICH_VU");
    const patient = patients.get(maLk);

    // Kiểm tra xem mã thuốc có thuộc danh mục loại trừ XML2 không
    const cleanMaThuoc = maThuoc ? maThuoc.trim().toUpperCase() : "";
    const isDrugExcludedFromTtThau = Boolean(
      cleanMaThuoc && drugRuleMap.get(cleanMaThuoc)?.excluded,
    );

    // Kiểm tra XML2 cột 15 TT_THAU bắt buộc không được để rỗng (null)
    if (!isDrugExcludedFromTtThau && (!ttThau || !ttThau.trim())) {
      warnings.push({
        source: "XML2",
        detailIndex,
        MA_LK: maLk,
        HO_TEN: patient?.HO_TEN || "",
        MA_BN: patient?.MA_BN || "",
        MA_DICH_VU: maThuoc,
        TEN_DICH_VU: tenThuoc,
        message: `XML2. Chi tiết thứ ${detailIndex}: Thiếu thông tin TT_THAU`,
        patient: patient ?? { MA_LK: maLk, MA_BN: "", HO_TEN: "" },
      });
    }

    // Kiểm tra mã bệnh Z00.0 trong XML2
    const maBenh =
      directTextOf(node, "MA_BENH") ||
      textOfGeneral(node, "MA_BENH") ||
      directTextOf(node, "MA_BENH_CHINH") ||
      textOfGeneral(node, "MA_BENH_CHINH") ||
      directTextOf(node, "MA_BENHKEMTHEO") ||
      textOfGeneral(node, "MA_BENHKEMTHEO") ||
      directTextOf(node, "MA_BENH_KT") ||
      textOfGeneral(node, "MA_BENH_KT");

    const hasZ000InXml2 =
      hasZ000DiseaseCode(maBenh) ||
      Array.from(node.children).some(
        (child) => isDiseaseCodeField(child.tagName) && hasZ000DiseaseCode(child.textContent),
      );

    if (hasZ000InXml2) {
      warnings.push({
        source: "XML2",
        detailIndex,
        MA_LK: maLk,
        HO_TEN: patient?.HO_TEN || "",
        MA_BN: patient?.MA_BN || "",
        MA_DICH_VU: maThuoc || "Z00.0",
        TEN_DICH_VU: tenThuoc || "Khám sức khỏe",
        message: formatZ000WarningMessage("XML2", detailIndex),
        patient: patient ?? { MA_LK: maLk, MA_BN: "", HO_TEN: "" },
      });
    }

    const hasZ301InXml2 =
      hasZ301DiseaseCode(maBenh) ||
      Array.from(node.children).some(
        (child) => isDiseaseCodeField(child.tagName) && hasZ301DiseaseCode(child.textContent),
      );

    if (hasZ301InXml2) {
      warnings.push({
        source: "XML2",
        detailIndex,
        MA_LK: maLk,
        HO_TEN: patient?.HO_TEN || "",
        MA_BN: patient?.MA_BN || "",
        MA_DICH_VU: maThuoc || "Z30.1",
        TEN_DICH_VU: tenThuoc || "Đặt dụng cụ tránh thai",
        message: formatZ301WarningMessage("XML2", detailIndex),
        patient: patient ?? { MA_LK: maLk, MA_BN: "", HO_TEN: "" },
      });
    }
  });

  return warnings;
}

function readXml4Records(doc: Document, fileName: string): Xml4Record[] {
  return Array.from(doc.getElementsByTagName("*"))
    .filter((item) => directTextOf(item, "MA_DICH_VU") || directTextOf(item, "NGAY_KQ"))
    .map((item) => ({
      fileName,
      MA_LK: directTextOf(item, "MA_LK") || textOfGeneral(item, "MA_LK"),
      STT: directTextOf(item, "STT") || textOfGeneral(item, "STT"),
      MA_DICH_VU: directTextOf(item, "MA_DICH_VU") || textOfGeneral(item, "MA_DICH_VU"),
      NGAY_KQ: directTextOf(item, "NGAY_KQ") || textOfGeneral(item, "NGAY_KQ"),
      KET_LUAN: directTextOf(item, "KET_LUAN") || textOfGeneral(item, "KET_LUAN"),
      GIA_TRI: directTextOf(item, "GIA_TRI") || textOfGeneral(item, "GIA_TRI"),
      MA_BENH:
        directTextOf(item, "MA_BENH") ||
        textOfGeneral(item, "MA_BENH") ||
        directTextOf(item, "MA_BENH_CHINH") ||
        textOfGeneral(item, "MA_BENH_CHINH") ||
        directTextOf(item, "MA_BENH_KT") ||
        textOfGeneral(item, "MA_BENH_KT") ||
        directTextOf(item, "MA_BENHKEMTHEO") ||
        textOfGeneral(item, "MA_BENHKEMTHEO"),
    }));
}

function createXml4Warnings(
  xml3Records: Xml3Record[],
  xml4Records: Xml4Record[],
  patients: ReadonlyMap<string, PatientInfo>,
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  xml4Records.forEach((xml4, index) => {
    const detailIndex = Number(xml4.STT) || index + 1;
    const patient = patients.get(xml4.MA_LK);

    // Kiểm tra Z00.0 và Z30.1 trong XML4
    if (hasZ000DiseaseCode(xml4.MA_BENH)) {
      warnings.push({
        source: "XML4",
        detailIndex,
        MA_LK: xml4.MA_LK,
        HO_TEN: patient?.HO_TEN || "",
        MA_BN: patient?.MA_BN || "",
        MA_DICH_VU: xml4.MA_DICH_VU || "Z00.0",
        TEN_DICH_VU: "Cận lâm sàng",
        message: formatZ000WarningMessage("XML4", detailIndex),
        patient: patient ?? { MA_LK: xml4.MA_LK, MA_BN: "", HO_TEN: "" },
      });
    }
    if (hasZ301DiseaseCode(xml4.MA_BENH)) {
      warnings.push({
        source: "XML4",
        detailIndex,
        MA_LK: xml4.MA_LK,
        HO_TEN: patient?.HO_TEN || "",
        MA_BN: patient?.MA_BN || "",
        MA_DICH_VU: xml4.MA_DICH_VU || "Z30.1",
        TEN_DICH_VU: "Đặt dụng cụ tránh thai",
        message: formatZ301WarningMessage("XML4", detailIndex),
        patient: patient ?? { MA_LK: xml4.MA_LK, MA_BN: "", HO_TEN: "" },
      });
    }

    if (xml4.NGAY_KQ.trim() && xml4.KET_LUAN.trim()) return;
    const match = xml3Records.find(
      (xml3) =>
        xml3.MA_NHOM.trim() === "2" &&
        xml3.MA_LK === xml4.MA_LK &&
        xml3.MA_DICH_VU === xml4.MA_DICH_VU,
    );
    if (!match) return;
    warnings.push({
      source: "XML4" as const,
      detailIndex,
      MA_LK: match.MA_LK,
      HO_TEN: match.HO_TEN || patient?.HO_TEN || "",
      MA_BN: match.MA_BN || patient?.MA_BN || "",
      MA_DICH_VU: match.MA_DICH_VU,
      TEN_DICH_VU: match.TEN_DICH_VU || match.TEN_VAT_TU || "",
      message: `XML 4. Chi tiết thứ ${detailIndex}: Thiếu thông tin KET_LUAN khi XML3 MA_NHOM = 2. Mã dịch vụ: ${match.MA_DICH_VU || "—"}. Tên dịch vụ: ${match.TEN_DICH_VU || match.TEN_VAT_TU || "—"}`,
      record: match,
      patient: patient ?? match.patient,
      giaTri: xml4.GIA_TRI?.trim() || "",
    });
  });
  return warnings;
}

export function readXml7Warnings(
  doc: Document,
  patients: ReadonlyMap<string, PatientInfo> = new Map(),
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const candidateTags = ["CHI_TIEU_DU_LIEU_GIAY_RA_VIEN", "GIAY_RA_VIEN", "CHI_TIET"];
  let rows: Element[] = [];
  for (const tag of candidateTags) {
    const list = Array.from(doc.getElementsByTagName(tag));
    if (list.length > 0) {
      rows = list;
      break;
    }
  }
  if (rows.length === 0) {
    rows = Array.from(doc.getElementsByTagName("*")).filter(
      (node) =>
        (directTextOf(node, "MA_LK") || textOfGeneral(node, "MA_LK")) &&
        (directTextOf(node, "NGOAITRU_TUNGAY") ||
          textOfGeneral(node, "NGOAITRU_TUNGAY") ||
          directTextOf(node, "NGAY_RA") ||
          textOfGeneral(node, "NGAY_RA")),
    );
  }

  rows.forEach((node, index) => {
    const stt = directTextOf(node, "STT") || textOfGeneral(node, "STT");
    const detailIndex = Number(stt) || index + 1;
    const maLk = directTextOf(node, "MA_LK") || textOfGeneral(node, "MA_LK");
    const patient = patients.get(maLk);

    // Lấy ngày ra viện: ưu tiên từ XML7, nếu không có lấy từ XML1 (patient.NGAY_RA)
    const xml7NgayRa = directTextOf(node, "NGAY_RA") || textOfGeneral(node, "NGAY_RA");
    const ngayRaRaw = (xml7NgayRa || patient?.NGAY_RA || "").trim();

    // Lấy ngày bắt đầu ngoại trú
    const ngoaiTruTuNgayRaw = (
      directTextOf(node, "NGOAITRU_TUNGAY") ||
      textOfGeneral(node, "NGOAITRU_TUNGAY") ||
      ""
    ).trim();

    // Kiểm tra quy tắc: NGOAITRU_TUNGAY không được nhỏ hơn NGAY_RA
    if (ngoaiTruTuNgayRaw && ngayRaRaw) {
      const ngoaiTruDigits = ngoaiTruTuNgayRaw.replace(/\D/g, "");
      const ngayRaDigits = ngayRaRaw.replace(/\D/g, "");

      // So sánh theo ngày YYYYMMDD (8 chữ số đầu)
      const ngoaiTruYmd = ngoaiTruDigits.slice(0, 8);
      const ngayRaYmd = ngayRaDigits.slice(0, 8);

      if (ngoaiTruYmd.length === 8 && ngayRaYmd.length === 8 && ngoaiTruYmd < ngayRaYmd) {
        // Tính ngày gợi ý: +1 ngày sau ngày ra viện
        const y = Number(ngayRaYmd.slice(0, 4));
        const m = Number(ngayRaYmd.slice(4, 6)) - 1;
        const d = Number(ngayRaYmd.slice(6, 8));
        const nextDay = new Date(Date.UTC(y, m, d + 1));
        const nextYmd = `${nextDay.getUTCFullYear()}${String(nextDay.getUTCMonth() + 1).padStart(2, "0")}${String(nextDay.getUTCDate()).padStart(2, "0")}`;

        const displayNgoaiTru = `${ngoaiTruYmd.slice(6, 8)}/${ngoaiTruYmd.slice(4, 6)}/${ngoaiTruYmd.slice(0, 4)}`;
        const displayNgayRa = `${ngayRaYmd.slice(6, 8)}/${ngayRaYmd.slice(4, 6)}/${ngayRaYmd.slice(0, 4)}`;
        const displayGoiY = `${nextYmd.slice(6, 8)}/${nextYmd.slice(4, 6)}/${nextYmd.slice(0, 4)}`;

        warnings.push({
          source: "XML7",
          detailIndex,
          MA_LK: maLk,
          HO_TEN: patient?.HO_TEN || "",
          MA_BN:
            patient?.MA_BN ||
            directTextOf(node, "MA_YTE") ||
            directTextOf(node, "SO_LUU_TRU") ||
            "",
          MA_DICH_VU: "NGOAITRU_TUNGAY",
          TEN_DICH_VU: "Giấy ra viện - Thời gian ngoại trú",
          message: `XML7. Chi tiết thứ ${detailIndex}: NGOAITRU_TUNGAY (${displayNgoaiTru}) không được nhỏ hơn ngày ra viện NGAY_RA (${displayNgayRa}). Gợi ý sửa: +1 ngày sau ra viện (➔ ${displayGoiY}).`,
          patient: patient ?? { MA_LK: maLk, MA_BN: "", HO_TEN: "" },
          giaTri: ngoaiTruTuNgayRaw,
        });
      }
    }
  });

  return warnings;
}

function readXml3Records(
  doc: Document,
  fileName: string,
  patients: Map<string, PatientInfo>,
  serviceRules: ReadonlyMap<string, ServiceRule>,
  mandatoryMachineRules: ReadonlyMap<string, MachineServiceRule> = DEFAULT_MANDATORY_MACHINE_MAP,
): Xml3Record[] {
  const detailTagCandidates = ["CHI_TIET_DVKT", "CHI_TIET_VTYT", "CHI_TIET"];
  let detailElements: Element[] = [];

  for (const tag of detailTagCandidates) {
    const list = Array.from(doc.getElementsByTagName(tag));
    if (list.length > 0) {
      detailElements = list;
      break;
    }
  }

  if (detailElements.length === 0) {
    detailElements = Array.from(doc.getElementsByTagName("*")).filter(
      (el) =>
        (directTextOf(el, "MA_DICH_VU") || textOfGeneral(el, "MA_DICH_VU")) &&
        (directTextOf(el, "NGAY_TH_YL") || textOfGeneral(el, "NGAY_TH_YL")),
    );
  }

  return detailElements.map((item) => {
    const rawAllFields: Record<string, string> = {};
    for (let i = 0; i < item.children.length; i++) {
      const child = item.children[i];
      if (child.tagName) {
        rawAllFields[child.tagName] = child.textContent?.trim() ?? "";
      }
    }
    const fields = Object.fromEntries(
      XML3_FIELDS.map((field) => [
        field,
        rawAllFields[field] ?? textOf(item, field) ?? directTextOf(item, field) ?? "",
      ]),
    ) as Record<Xml3Field, string> & Record<string, string>;

    // Gộp tất cả các thẻ còn lại từ XML (kể cả các thẻ mới hoặc đặc thù của QĐ 130)
    Object.assign(fields, rawAllFields);

    const record = evaluateRecord(fields, fileName, serviceRules, mandatoryMachineRules);
    return withPatientInfo(record, patients);
  });
}

function parseDigits(raw: string): Date | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 12) return null;
  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  const hour = Number(digits.slice(8, 10));
  const minute = Number(digits.slice(10, 12));
  const second = digits.length >= 14 ? Number(digits.slice(12, 14)) : 0;
  if (
    !year ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date
    : null;
}

export function parseXmlDateTime(raw: string): Date | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^\d{8,14}$/.test(value)) return parseDigits(value);
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  return parseDigits(value);
}

export function minutesBetween(startRaw: string, endRaw: string): number | null {
  const start = parseXmlDateTime(startRaw);
  const end = parseXmlDateTime(endRaw);
  if (!start || !end) return null;
  return Math.round(((end.getTime() - start.getTime()) / 60000) * 100) / 100;
}

export function getChronologyIssues(ngayYl: string, ngayThYl: string, ngayKq: string): string[] {
  const order: Array<[string, string, string, string]> = [
    ["NGAY_YL", ngayYl, "NGAY_TH_YL", ngayThYl],
    ["NGAY_TH_YL", ngayThYl, "NGAY_KQ", ngayKq],
  ];
  const parsedYl = parseXmlDateTime(ngayYl);
  const parsedThYl = parseXmlDateTime(ngayThYl);
  const parsedKq = parseXmlDateTime(ngayKq);
  return order
    .filter(([, startRaw, , endRaw]) => {
      const start = parseXmlDateTime(startRaw);
      const end = parseXmlDateTime(endRaw);
      return Boolean(start && end && end.getTime() < start.getTime());
    })
    .map(([startName, , endName]) => `${endName} sớm hơn ${startName}`)
    .concat(
      parsedYl &&
        parsedThYl &&
        parsedKq &&
        parsedYl.getTime() === parsedThYl.getTime() &&
        parsedThYl.getTime() === parsedKq.getTime()
        ? ["NGAY_YL = NGAY_TH_YL = NGAY_KQ"]
        : parsedThYl && parsedKq && parsedThYl.getTime() === parsedKq.getTime()
          ? ["NGAY_TH_YL = NGAY_KQ"]
          : [],
    );
}

export type BedDailyInterval = {
  recordIndex: number;
  record: Xml3Record;
  dayStr: string;
  startMinute: number;
  endMinute: number;
  startDisplay: string;
  endDisplay: string;
};

export function getBedDailyIntervals(record: Xml3Record, recordIndex: number): BedDailyInterval[] {
  const startDigits = (record.NGAY_TH_YL || "").replace(/\D/g, "");
  const endDigits = (record.NGAY_KQ || "").replace(/\D/g, "");
  if (startDigits.length < 8 || endDigits.length < 8) return [];

  const sy = parseInt(startDigits.slice(0, 4), 10);
  const sm = parseInt(startDigits.slice(4, 6), 10) - 1;
  const sd = parseInt(startDigits.slice(6, 8), 10);
  const sh = startDigits.length >= 10 ? parseInt(startDigits.slice(8, 10), 10) : 0;
  const smin = startDigits.length >= 12 ? parseInt(startDigits.slice(10, 12), 10) : 0;

  const ey = parseInt(endDigits.slice(0, 4), 10);
  const em = parseInt(endDigits.slice(4, 6), 10) - 1;
  const ed = parseInt(endDigits.slice(6, 8), 10);
  const eh = endDigits.length >= 10 ? parseInt(endDigits.slice(8, 10), 10) : 23;
  const emin = endDigits.length >= 12 ? parseInt(endDigits.slice(10, 12), 10) : 59;

  const startDate = new Date(Date.UTC(sy, sm, sd));
  const endDate = new Date(Date.UTC(ey, em, ed));
  if (endDate.getTime() < startDate.getTime()) return [];

  const intervals: BedDailyInterval[] = [];
  const curr = new Date(startDate.getTime());

  while (curr.getTime() <= endDate.getTime()) {
    const y = curr.getUTCFullYear();
    const m = curr.getUTCMonth() + 1;
    const d = curr.getUTCDate();
    const dayStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    const isFirstDay = curr.getTime() === startDate.getTime();
    const isLastDay = curr.getTime() === endDate.getTime();

    const startMinute = isFirstDay ? sh * 60 + smin : 0;
    const endMinute = isLastDay ? eh * 60 + emin : 1440;

    if (endMinute > startMinute) {
      intervals.push({
        recordIndex,
        record,
        dayStr,
        startMinute,
        endMinute,
        startDisplay: isFirstDay
          ? `${String(sh).padStart(2, "0")}:${String(smin).padStart(2, "0")}`
          : "00:00",
        endDisplay: isLastDay
          ? `${String(eh).padStart(2, "0")}:${String(emin).padStart(2, "0")}`
          : "23:59",
      });
    }

    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  return intervals;
}

export function addBedWarnings(
  records: Xml3Record[],
  patientsMap?: Map<string, PatientInfo>,
): Xml3Record[] {
  const result: Xml3Record[] = records.map((r) => ({ ...r }));

  // 1. Kiểm tra thiếu mã giường cho chi phí ngày giường (MA_NHOM = 14 hoặc 15)
  for (let i = 0; i < result.length; i++) {
    const rec = result[i];
    const nhom = (rec.MA_NHOM || "").trim();
    if ((nhom === "14" || nhom === "15") && (!rec.MA_GIUONG || !rec.MA_GIUONG.trim())) {
      const detailIndex = rec.STT || "xx";
      const message = `XML3. Chi tiết thứ ${detailIndex}: Chi phí ngày giường (MA_NHOM ${nhom}) nhưng thiếu MA_GIUONG.`;
      rec.hasBedWarning = true;
      rec.bedWarningType = "missing-bed-code";
      rec.isAdministrativeWarning = true;
      rec.bedAuditAction = "warning";
      rec.potentialBedRefusal = 0;
      rec.MA_GIUONG_TRUNG = "(thiếu mã giường)";
      rec.status = rec.status === "ok" ? "bed-warning" : rec.status;
      rec.detail = rec.detail ? `${rec.detail} · ${message}` : message;
    }
  }

  // Helper tính giá trị ngày giường và số tiền xuất toán BHYT
  const calculateRecordBedValue = (rec: Xml3Record): number => {
    if (rec.T_BHTT !== undefined && rec.T_BHTT > 0) return rec.T_BHTT;
    if (rec.THANH_TIEN !== undefined && rec.THANH_TIEN > 0) return rec.THANH_TIEN;
    const soLuong = rec.SO_LUONG ?? 1;
    const donGia = rec.DON_GIA ?? 0;
    return soLuong * donGia;
  };

  const calculateBedPotentialRefusal = (rec: Xml3Record): number => {
    if (rec.T_BHTT !== undefined && rec.T_BHTT > 0) return Math.round(rec.T_BHTT);
    const soLuong = rec.SO_LUONG ?? 1;
    const donGia = rec.DON_GIA ?? 0;
    const thanhTien =
      rec.THANH_TIEN !== undefined && rec.THANH_TIEN > 0 ? rec.THANH_TIEN : soLuong * donGia;
    const mucHuong =
      rec.MUC_HUONG ?? (rec.patient?.MUC_HUONG ? parseFloat(rec.patient.MUC_HUONG) : 100);
    return Math.round(thanhTien * (mucHuong / 100));
  };

  // 2. Kiểm tra cùng bệnh nhân: Trùng số phút chuyển tiếp kê giường (minute-duplicate) và chồng lấn thời gian (multiple-beds / Ngày giường > 1)
  const bedRecordsByPatient = new Map<string, number[]>();
  for (let i = 0; i < result.length; i++) {
    const rec = result[i];
    const nhom = (rec.MA_NHOM || "").trim();
    if (nhom === "14" || nhom === "15") {
      const patKey = rec.MA_LK || rec.MA_BN;
      if (!patKey) continue;
      const list = bedRecordsByPatient.get(patKey) || [];
      list.push(i);
      bedRecordsByPatient.set(patKey, list);
    }
  }

  for (const [, indices] of bedRecordsByPatient.entries()) {
    if (indices.length <= 1) continue;
    indices.sort((idxA, idxB) => {
      const sA = result[idxA].NGAY_TH_YL || "";
      const sB = result[idxB].NGAY_TH_YL || "";
      return sA.localeCompare(sB);
    });

    // A. Quét trùng mốc phút chuyển tiếp kê giường (minute-duplicate)
    for (let k = 0; k < indices.length - 1; k++) {
      const idxPrev = indices[k];
      const idxNext = indices[k + 1];
      const prev = result[idxPrev];
      const next = result[idxNext];

      if (!prev.NGAY_KQ || !next.NGAY_TH_YL) continue;

      if (prev.NGAY_KQ === next.NGAY_TH_YL) {
        const prevEndDisp = formatXmlDateTime(prev.NGAY_KQ) || prev.NGAY_KQ;
        const nextStartDisp = formatXmlDateTime(next.NGAY_TH_YL) || next.NGAY_TH_YL;
        const suggestStart = addMinutesToXmlDateTime(next.NGAY_TH_YL, 1);
        const suggestStartDisp = formatXmlDateTime(suggestStart) || suggestStart;
        const suggestPrevEnd = addMinutesToXmlDateTime(prev.NGAY_KQ, -1);
        const suggestPrevEndDisp = formatXmlDateTime(suggestPrevEnd) || suggestPrevEnd;

        // Đánh dấu dòng sau (next)
        next.hasBedWarning = true;
        next.bedWarningType = next.bedWarningType || "minute-duplicate";
        next.isAdministrativeWarning = true;
        next.bedAuditAction = next.bedAuditAction || "warning";
        next.potentialBedRefusal = next.potentialBedRefusal ?? 0;
        next.status = next.status === "ok" ? "bed-warning" : next.status;
        next.MA_GIUONG_TRUNG = `${next.MA_GIUONG || "Giường"} (Trùng phút STT ${prev.STT || "xx"}: ${nextStartDisp})`;
        const msgNext = `XML3. Chi tiết thứ ${next.STT || "xx"}: Trùng số phút chuyển tiếp kê giường cùng BN với chi tiết STT ${prev.STT || "xx"} (Dòng trước kết thúc lúc ${prevEndDisp} trùng chính xác phút bắt đầu dòng sau ${nextStartDisp}). (Cảnh báo mốc phút - 0 đ xuất toán do cùng BN). Gợi ý: Tăng 1 phút cho giờ bắt đầu dòng sau (${suggestStartDisp}) hoặc lùi 1 phút ở dòng trước (${suggestPrevEndDisp}) để tránh bị BHYT bắt lỗi kê đồng thời 2 giường.`;
        next.detail = next.detail ? `${next.detail} · ${msgNext}` : msgNext;

        // Đánh dấu dòng trước (prev) để không bị ẩn khi lọc "Chỉ cảnh báo"
        prev.hasBedWarning = true;
        prev.bedWarningType = prev.bedWarningType || "minute-duplicate";
        prev.isAdministrativeWarning = true;
        prev.bedAuditAction = prev.bedAuditAction || "warning";
        prev.potentialBedRefusal = prev.potentialBedRefusal ?? 0;
        prev.status = prev.status === "ok" ? "bed-warning" : prev.status;
        prev.MA_GIUONG_TRUNG =
          prev.MA_GIUONG_TRUNG ||
          `${prev.MA_GIUONG || "Giường"} (Trùng phút STT ${next.STT || "xx"}: ${nextStartDisp})`;
        const msgPrev = `XML3. Chi tiết thứ ${prev.STT || "xx"}: Trùng số phút chuyển tiếp kê giường cùng BN với chi tiết STT ${next.STT || "xx"} (Kết thúc lúc ${prevEndDisp} trùng chính xác phút bắt đầu dòng sau ${nextStartDisp}). (Cảnh báo mốc phút - 0 đ xuất toán do cùng BN).`;
        prev.detail = prev.detail ? `${prev.detail} · ${msgPrev}` : msgPrev;
      }
    }

    // B. Quét chồng lấn thời gian kê giường cùng BN (Ngày giường > 1 / DTsheet45)
    const overlapPairs: Array<{ idxA: number; idxB: number; overlapMins: number }> = [];
    for (let a = 0; a < indices.length; a++) {
      for (let b = a + 1; b < indices.length; b++) {
        const idxA = indices[a];
        const idxB = indices[b];
        const rA = result[idxA];
        const rB = result[idxB];
        if (!rA.NGAY_TH_YL || !rA.NGAY_KQ || !rB.NGAY_TH_YL || !rB.NGAY_KQ) continue;

        if (rB.NGAY_TH_YL < rA.NGAY_KQ && rA.NGAY_TH_YL < rB.NGAY_KQ) {
          const overlapStart = rA.NGAY_TH_YL > rB.NGAY_TH_YL ? rA.NGAY_TH_YL : rB.NGAY_TH_YL;
          const overlapEnd = rA.NGAY_KQ < rB.NGAY_KQ ? rA.NGAY_KQ : rB.NGAY_KQ;
          const overlapMins = minutesBetween(overlapStart, overlapEnd);
          if (overlapMins !== null && overlapMins > 0) {
            overlapPairs.push({ idxA, idxB, overlapMins });
          }
        }
      }
    }

    if (overlapPairs.length > 0) {
      const adj = new Map<number, Set<number>>();
      const pairOverlapMap = new Map<string, number>();
      for (const pair of overlapPairs) {
        if (!adj.has(pair.idxA)) adj.set(pair.idxA, new Set());
        if (!adj.has(pair.idxB)) adj.set(pair.idxB, new Set());
        adj.get(pair.idxA)!.add(pair.idxB);
        adj.get(pair.idxB)!.add(pair.idxA);
        pairOverlapMap.set(
          `${Math.min(pair.idxA, pair.idxB)}_${Math.max(pair.idxA, pair.idxB)}`,
          pair.overlapMins,
        );
      }

      const visited = new Set<number>();
      for (const startIdx of adj.keys()) {
        if (visited.has(startIdx)) continue;
        const cluster: number[] = [];
        const queue = [startIdx];
        visited.add(startIdx);
        while (queue.length > 0) {
          const curr = queue.shift()!;
          cluster.push(curr);
          for (const neighbor of adj.get(curr) || []) {
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              queue.push(neighbor);
            }
          }
        }

        if (cluster.length > 1) {
          // Sắp xếp: Ưu tiên giữ lại giường có giá trị thanh toán cao nhất; nếu bằng nhau, dòng bắt đầu sớm hơn lên đầu
          cluster.sort((a, b) => {
            const rA = result[a];
            const rB = result[b];
            const valA = calculateRecordBedValue(rA);
            const valB = calculateRecordBedValue(rB);
            if (valB !== valA) return valB - valA;
            return (rA.NGAY_TH_YL || "").localeCompare(rB.NGAY_TH_YL || "");
          });

          // Giữ lại 01 dòng đầu tiên (0 đ xuất toán)
          const retainedIdx = cluster[0];
          const retainedRec = result[retainedIdx];
          retainedRec.hasBedWarning = true;
          retainedRec.bedWarningType = "multiple-beds";
          retainedRec.bedAuditAction = "retained";
          retainedRec.isRetainedBed = true;
          retainedRec.potentialBedRefusal = 0;
          retainedRec.status = retainedRec.status === "ok" ? "bed-warning" : retainedRec.status;

          const rejectedStts: string[] = [];
          for (let c = 1; c < cluster.length; c++) {
            const rejIdx = cluster[c];
            const rejRec = result[rejIdx];
            rejRec.hasBedWarning = true;
            rejRec.bedWarningType = "multiple-beds";
            rejRec.bedAuditAction = "rejected";
            rejRec.isRetainedBed = false;
            rejRec.status = rejRec.status === "ok" ? "bed-warning" : rejRec.status;
            rejRec.potentialBedRefusal = calculateBedPotentialRefusal(rejRec);

            const pKey = `${Math.min(retainedIdx, rejIdx)}_${Math.max(retainedIdx, rejIdx)}`;
            const overlapMins =
              pairOverlapMap.get(pKey) ||
              minutesBetween(rejRec.NGAY_TH_YL || "", retainedRec.NGAY_KQ || "") ||
              0;
            rejRec.MA_GIUONG_TRUNG = `${rejRec.MA_GIUONG || "Giường"} (Chồng lấn ${overlapMins}p cùng BN với STT ${retainedRec.STT || "xx"})`;
            const msgRej = `XML3. Chi tiết thứ ${rejRec.STT || "xx"}: Số lượng giường trong ngày lớn hơn 01. Chồng lấn ${overlapMins} phút thời gian kê giường cùng BN với chi tiết STT ${retainedRec.STT || "xx"} (từ ${formatXmlDateTime(rejRec.NGAY_TH_YL)} đến ${formatXmlDateTime(retainedRec.NGAY_KQ)}). NGUY CƠ XUẤT TOÁN (-${rejRec.potentialBedRefusal.toLocaleString("vi-VN")} đ) do kê trùng đồng thời nhiều giường cho một bệnh nhân.`;
            rejRec.detail = rejRec.detail ? `${rejRec.detail} · ${msgRej}` : msgRej;
            rejectedStts.push(rejRec.STT || "xx");
          }

          retainedRec.MA_GIUONG_TRUNG = `${retainedRec.MA_GIUONG || "Giường"} (Giữ lại 0đ - Trùng cùng BN STT ${rejectedStts.join(", ")})`;
          const msgRet = `XML3. Chi tiết thứ ${retainedRec.STT || "xx"}: Số lượng giường trong ngày lớn hơn 01. Giữ lại thanh toán (0 đ xuất toán); phát hiện kê trùng cùng BN với chi tiết STT ${rejectedStts.join(", ")}.`;
          retainedRec.detail = retainedRec.detail ? `${retainedRec.detail} · ${msgRet}` : msgRet;
        }
      }
    }

    // C. Quét tổng số lượng giường theo ngày dương lịch (DTsheet45: NGAY_GIUONG > 1)
    const bedByDay = new Map<string, number[]>();
    for (const idx of indices) {
      const rec = result[idx];
      const day = (rec.NGAY_TH_YL || rec.NGAY_YL || "").slice(0, 8);
      if (!day || day.length < 8) continue;
      const dayList = bedByDay.get(day) || [];
      dayList.push(idx);
      bedByDay.set(day, dayList);
    }

    for (const [dayStr, dayIndices] of bedByDay.entries()) {
      if (dayIndices.length <= 1) continue;
      let totalQty = 0;
      for (const idx of dayIndices) {
        totalQty += result[idx].SO_LUONG ?? 1;
      }
      if (totalQty > 1.0) {
        for (const idx of dayIndices) {
          const rec = result[idx];
          if (!rec.hasBedWarning) {
            rec.hasBedWarning = true;
            rec.bedWarningType = "multiple-beds";
            rec.status = rec.status === "ok" ? "bed-warning" : rec.status;
            const dateDisp = formatXmlDate(dayStr) || dayStr;
            const msg = `XML3. Chi tiết thứ ${rec.STT || "xx"}: Số lượng giường trong ngày lớn hơn 01 (Tổng số lượng giường ngày ${dateDisp} là ${totalQty.toFixed(1)} > 1.0).`;
            rec.detail = rec.detail ? `${rec.detail} · ${msg}` : msg;
          }
        }
      }
    }
  }

  // 3. Thu thập intervals theo từng ngày cho các dòng có MA_GIUONG
  const intervalsByBedDay = new Map<string, BedDailyInterval[]>();

  for (let i = 0; i < result.length; i++) {
    const rec = result[i];
    if (!rec.MA_GIUONG || !rec.MA_GIUONG.trim()) continue;

    const dailyIntervals = getBedDailyIntervals(rec, i);
    for (const interval of dailyIntervals) {
      // Nhóm theo giường: dayStr|MA_KHOA|MA_GIUONG
      const bedKey = `${interval.dayStr}|${(rec.MA_KHOA || "").trim().toUpperCase()}|${rec.MA_GIUONG.trim().toUpperCase()}`;
      const bedList = intervalsByBedDay.get(bedKey) || [];
      bedList.push(interval);
      intervalsByBedDay.set(bedKey, bedList);
    }
  }

  // 4. Quét Giường Nằm Ghép & Giường gối đầu liên tiếp (KT251) - Các BN khác nhau nằm cùng giường, trùng > 240 phút (4 giờ)
  type SharingRecordMeta = {
    patientCount: number;
    maxOverlapHours: number;
    overlapDay: string;
    peers: BedSharingPeerInfo[];
  };
  const sharingMetaByRecord = new Map<number, SharingRecordMeta>();
  const pairOverlapDays = new Map<string, Set<string>>();
  const retainedRecordIndices = new Set<number>();
  const rejectedRecordIndices = new Set<number>();

  for (const [bedKey, intervals] of intervalsByBedDay.entries()) {
    if (intervals.length <= 1) continue;

    // Tìm các cặp giao nhau > 240 phút giữa các bệnh nhân khác nhau
    const overlapPairs: Array<{
      intA: BedDailyInterval;
      intB: BedDailyInterval;
      overlapMins: number;
    }> = [];

    for (let a = 0; a < intervals.length; a++) {
      for (let b = a + 1; b < intervals.length; b++) {
        const intA = intervals[a];
        const intB = intervals[b];
        const rA = intA.record;
        const rB = intB.record;

        // Phải là 2 bệnh nhân khác nhau (khác MA_LK, hoặc nếu có MA_BN thì khác MA_BN)
        const isSame =
          rA.MA_LK === rB.MA_LK ||
          (Boolean(rA.MA_BN) && Boolean(rB.MA_BN) && rA.MA_BN === rB.MA_BN);
        if (isSame) continue;

        const overlap = Math.max(
          0,
          Math.min(intA.endMinute, intB.endMinute) - Math.max(intA.startMinute, intB.startMinute),
        );
        if (overlap > 240) {
          // Lớn hơn 4 giờ (240 phút) -> Giường nằm ghép!
          overlapPairs.push({ intA, intB, overlapMins: overlap });

          const pairKey =
            [rA.MA_LK, rB.MA_LK].sort().join("__") +
            "__" +
            (rA.MA_KHOA || "").trim() +
            "__" +
            (rA.MA_GIUONG || "").trim();
          const daySet = pairOverlapDays.get(pairKey) || new Set<string>();
          daySet.add(intA.dayStr);
          pairOverlapDays.set(pairKey, daySet);
        }
      }
    }

    if (!overlapPairs.length) continue;

    // Xây dựng đồ thị các ca trùng trên cùng buồng giường trong ngày
    const adj = new Map<number, Set<number>>();
    for (const pair of overlapPairs) {
      const idxA = pair.intA.recordIndex;
      const idxB = pair.intB.recordIndex;
      if (!adj.has(idxA)) adj.set(idxA, new Set());
      if (!adj.has(idxB)) adj.set(idxB, new Set());
      adj.get(idxA)!.add(idxB);
      adj.get(idxB)!.add(idxA);
    }

    const visitedCluster = new Set<number>();
    for (const startIdx of adj.keys()) {
      if (visitedCluster.has(startIdx)) continue;
      const clusterIndices: number[] = [];
      const queue = [startIdx];
      visitedCluster.add(startIdx);
      while (queue.length > 0) {
        const curr = queue.shift()!;
        clusterIndices.push(curr);
        for (const neighbor of adj.get(curr) || []) {
          if (!visitedCluster.has(neighbor)) {
            visitedCluster.add(neighbor);
            queue.push(neighbor);
          }
        }
      }

      if (clusterIndices.length > 1) {
        // Sắp xếp: Giường có T_BHTT hoặc THANH_TIEN cao nhất lên đầu; nếu bằng nhau, NGAY_TH_YL sớm hơn lên đầu
        clusterIndices.sort((idxA, idxB) => {
          const rA = result[idxA];
          const rB = result[idxB];
          const amtA =
            rA.T_BHTT !== undefined && rA.T_BHTT > 0
              ? rA.T_BHTT
              : rA.THANH_TIEN !== undefined && rA.THANH_TIEN > 0
                ? rA.THANH_TIEN
                : (rA.DON_GIA || 0) * (rA.SO_LUONG || 1);
          const amtB =
            rB.T_BHTT !== undefined && rB.T_BHTT > 0
              ? rB.T_BHTT
              : rB.THANH_TIEN !== undefined && rB.THANH_TIEN > 0
                ? rB.THANH_TIEN
                : (rB.DON_GIA || 0) * (rB.SO_LUONG || 1);
          if (amtB !== amtA) return amtB - amtA;
          const sA = rA.NGAY_TH_YL || "";
          const sB = rB.NGAY_TH_YL || "";
          return sA.localeCompare(sB);
        });

        // Giữ lại 01 giường cao nhất/vào trước
        retainedRecordIndices.add(clusterIndices[0]);
        // Xuất toán các giường phía sau
        for (let c = 1; c < clusterIndices.length; c++) {
          rejectedRecordIndices.add(clusterIndices[c]);
        }
      }
    }

    // Thu thập danh sách bệnh nhân tham gia nằm ghép trên giường này trong ngày
    const bedDayParticipatingPatients = new Set<string>();
    for (const pair of overlapPairs) {
      bedDayParticipatingPatients.add(pair.intA.record.MA_LK);
      bedDayParticipatingPatients.add(pair.intB.record.MA_LK);
    }

    const patientCount = bedDayParticipatingPatients.size;
    const [dayStr] = bedKey.split("|");

    for (const pair of overlapPairs) {
      const overlapHours = Math.round((pair.overlapMins / 60) * 10) / 10;
      const { intA, intB } = pair;
      const rA = intA.record;
      const rB = intB.record;

      // Cập nhật cho intA
      let metaA = sharingMetaByRecord.get(intA.recordIndex);
      if (!metaA) {
        metaA = {
          patientCount,
          maxOverlapHours: overlapHours,
          overlapDay: dayStr,
          peers: [],
        };
        sharingMetaByRecord.set(intA.recordIndex, metaA);
      }
      metaA.patientCount = Math.max(metaA.patientCount, patientCount);
      metaA.maxOverlapHours = Math.max(metaA.maxOverlapHours, overlapHours);
      if (!metaA.peers.some((p) => p.peerMaLk === rB.MA_LK)) {
        metaA.peers.push({
          peerMaLk: rB.MA_LK,
          peerMaBn: rB.MA_BN,
          peerHoTen: rB.HO_TEN,
          peerGiuong: rB.MA_GIUONG,
          peerKhoa: rB.MA_KHOA,
          overlapDate: dayStr,
          overlapHours,
          startTimeDisplay: intB.startDisplay,
          endTimeDisplay: intB.endDisplay,
        });
      }

      // Cập nhật cho intB
      let metaB = sharingMetaByRecord.get(intB.recordIndex);
      if (!metaB) {
        metaB = {
          patientCount,
          maxOverlapHours: overlapHours,
          overlapDay: dayStr,
          peers: [],
        };
        sharingMetaByRecord.set(intB.recordIndex, metaB);
      }
      metaB.patientCount = Math.max(metaB.patientCount, patientCount);
      metaB.maxOverlapHours = Math.max(metaB.maxOverlapHours, overlapHours);
      if (!metaB.peers.some((p) => p.peerMaLk === rA.MA_LK)) {
        metaB.peers.push({
          peerMaLk: rA.MA_LK,
          peerMaBn: rA.MA_BN,
          peerHoTen: rA.HO_TEN,
          peerGiuong: rA.MA_GIUONG,
          peerKhoa: rA.MA_KHOA,
          overlapDate: dayStr,
          overlapHours,
          startTimeDisplay: intA.startDisplay,
          endTimeDisplay: intA.endDisplay,
        });
      }
    }
  }

  // Gắn cảnh báo Giường nằm ghép & Giường gối đầu liên tiếp vào kết quả
  for (const [recIdx, meta] of sharingMetaByRecord.entries()) {
    const rec = result[recIdx];
    const tyleTt = rec.TYLE_TT ?? 100;
    const suggestedTyleTt = meta.patientCount >= 3 ? 33 : 50;

    const maxMultiDayCount = Math.max(
      ...meta.peers.map((p) => {
        const pairKey =
          [rec.MA_LK, p.peerMaLk].sort().join("__") +
          "__" +
          (rec.MA_KHOA || "").trim() +
          "__" +
          (rec.MA_GIUONG || "").trim();
        return pairOverlapDays.get(pairKey)?.size || 1;
      }),
      1,
    );

    const isMultiDay = maxMultiDayCount >= 2;
    rec.bedWarningType = isMultiDay ? "multi-day-overlap" : "bed-sharing";
    rec.bedSharingCount = meta.patientCount;
    rec.bedOverlapDaysCount = isMultiDay ? maxMultiDayCount : undefined;
    rec.suggestedTyleTt = suggestedTyleTt;
    rec.bedOverlapDate = meta.overlapDay;
    rec.bedOverlapHours = meta.maxOverlapHours;
    rec.bedSharingInfo = meta.peers;

    const isRejected = rejectedRecordIndices.has(recIdx);
    const isRetained = !isRejected && retainedRecordIndices.has(recIdx);
    rec.isRetainedBed = isRetained;
    rec.bedAuditAction = isRejected ? "rejected" : isRetained ? "retained" : "warning";

    const soLuong = rec.SO_LUONG ?? 1;
    const donGia = rec.DON_GIA ?? 0;
    const tBhtt = rec.T_BHTT;
    const thanhTien =
      rec.THANH_TIEN !== undefined && rec.THANH_TIEN > 0 ? rec.THANH_TIEN : soLuong * donGia;
    const mucHuong =
      rec.MUC_HUONG ?? (rec.patient?.MUC_HUONG ? parseFloat(rec.patient.MUC_HUONG) : 100);

    // Xuất toán các giường phía sau, giữ lại 01 giường có giá tiền cao nhất (0 đ xuất toán)
    if (isRejected) {
      if (tBhtt !== undefined && tBhtt > 0) {
        rec.potentialBedRefusal = Math.round(tBhtt);
      } else {
        rec.potentialBedRefusal = Math.round(thanhTien * (mucHuong / 100));
      }
    } else {
      rec.potentialBedRefusal = 0;
    }

    const peerNames = meta.peers
      .map((p) => p.peerHoTen || p.peerMaBn || p.peerMaLk)
      .slice(0, 2)
      .join(", ");
    const moreCount = meta.peers.length > 2 ? ` +${meta.peers.length - 2}` : "";
    const gpoiInfo = isMultiDay ? ` [gối ${maxMultiDayCount} ngày]` : ` [${meta.maxOverlapHours}h]`;
    const actionTag = isRetained ? " [GIỮ LẠI]" : " [XUẤT TOÁN]";
    rec.MA_GIUONG_TRUNG = `${rec.MA_GIUONG}${actionTag} (Trùng BN: ${peerNames}${moreCount}${gpoiInfo})`;

    rec.hasBedWarning = true;
    rec.status = rec.status === "ok" ? "bed-warning" : rec.status;

    const detailIndex = rec.STT || "xx";
    const peerDetailStr = meta.peers
      .map(
        (p) =>
          `[BN: ${p.peerHoTen || "—"} - Mã BN: ${p.peerMaBn || "—"}, LK: ${p.peerMaLk}, Giường: ${p.peerGiuong || rec.MA_GIUONG}, Khoa: ${p.peerKhoa}, Giờ: ${p.startTimeDisplay}–${p.endTimeDisplay}, Giao: ${p.overlapHours}h ngày ${p.overlapDate}]`,
      )
      .join("; ");

    const bedTypeTitle = isMultiDay
      ? `Giường gối đầu liên tiếp ${maxMultiDayCount} ngày (${meta.patientCount} người, giao nhau ${meta.maxOverlapHours}h ngày ${meta.overlapDay})`
      : meta.patientCount >= 3
        ? `Giường ghép từ 3 người trở lên (${meta.patientCount} người, giao nhau ${meta.maxOverlapHours}h ngày ${meta.overlapDay})`
        : `Giường ghép 2 người (giao nhau ${meta.maxOverlapHours}h ngày ${meta.overlapDay})`;

    const actionMessage = isRetained
      ? `Được GIỮ LẠI THANH TOÁN (0 đ xuất toán) do có giá trị thanh toán cao nhất trong lượt trùng.`
      : `NGUY CƠ XUẤT TOÁN 100% (-${rec.potentialBedRefusal.toLocaleString("vi-VN")} đ) do trùng giường với hồ sơ khác có giá trị thanh toán cao hơn/trước đó.`;

    const message = `XML3. Chi tiết thứ ${detailIndex}: ${bedTypeTitle}. Đề nghị thanh toán TYLE_TT=${tyleTt}%. ${actionMessage} Hồ sơ trùng ghép: ${peerDetailStr}.`;

    rec.detail = rec.detail ? `${rec.detail} · ${message}` : message;
  }

  // 5. Kiểm tra thời gian kết thúc kê giường vượt quá thời gian ra viện của bệnh nhân (NGAY_RA)
  for (let i = 0; i < result.length; i++) {
    const rec = result[i];
    const nhom = (rec.MA_NHOM || "").trim();
    if (nhom !== "14" && nhom !== "15") continue;

    const pat = rec.patient || (patientsMap && rec.MA_LK ? patientsMap.get(rec.MA_LK) : undefined);
    const ngayRaRaw = (pat?.NGAY_RA || "").trim();
    if (!ngayRaRaw) continue;

    const ngayRaDigits = ngayRaRaw.replace(/\D/g, "");
    const ngayKqDigits = (rec.NGAY_KQ || "").replace(/\D/g, "");
    const checkTimeDigits = ngayKqDigits || (rec.NGAY_TH_YL || "").replace(/\D/g, "");

    if (!checkTimeDigits || !ngayRaDigits) continue;

    // So sánh thời gian (chuẩn 12 số YYYYMMDDHHmm hoặc 8 số YYYYMMDD)
    const cmpLen = Math.min(12, checkTimeDigits.length, ngayRaDigits.length);
    if (cmpLen >= 8 && checkTimeDigits.slice(0, cmpLen) > ngayRaDigits.slice(0, cmpLen)) {
      rec.hasBedWarning = true;
      rec.bedWarningType = "bed-exceeds-discharge";
      rec.isAdministrativeWarning = true;
      rec.bedAuditAction = "warning";
      rec.potentialBedRefusal = 0; // Cảnh báo thủ tục, KHÔNG tính xuất toán trực tiếp
      const displayRa = formatXmlDateTime(ngayRaDigits) || ngayRaDigits;
      const displayKq = formatXmlDateTime(checkTimeDigits) || checkTimeDigits;
      const detailIndex = rec.STT || String(i + 1);
      const message = `XML3. Chi tiết thứ ${detailIndex}: Thời gian kết thúc kê giường (${displayKq}) vượt quá thời gian ra viện của bệnh nhân (${displayRa}). (Cảnh báo nghiệp vụ - 0 đ xuất toán do không trùng giường). Gợi ý sửa: Sửa NGAY_KQ = ${ngayRaDigits.slice(0, 12)}`;
      rec.MA_GIUONG_TRUNG = `(vượt ra viện: ${displayRa})`;
      rec.status = rec.status === "ok" ? "bed-warning" : rec.status;
      rec.detail = rec.detail ? `${rec.detail} · ${message}` : message;
    }
  }

  return result;
}

export function formatDuplicateMachineWarningMessage(
  detailIndex: string | number,
  machineCode?: string,
): string {
  if (machineCode) {
    return `XML3. Chi tiết thứ ${detailIndex}: DVKT trùng thời gian thực hiện y lệnh cho một hoặc nhiều người bệnh trên cùng mã máy (${machineCode}).`;
  }
  return `XML3. Chi tiết thứ ${detailIndex}: DVKT trùng thời gian thực hiện y lệnh cho một hoặc nhiều người bệnh trên cùng mã máy.`;
}

export function addDuplicateMachineWarnings(records: Xml3Record[]): Xml3Record[] {
  const groups = new Map<string, Xml3Record[]>();
  for (const record of records) {
    if (!record.MA_MAY || !record.MA_MAY.trim()) continue;
    // Bỏ qua cảnh báo trùng thời gian trên cùng mã máy đối với các dịch vụ có mã nhóm bằng 1 (MA_NHOM = 1) hoặc mã nhóm 10 (vật tư đi kèm DVKT)
    const nhom = String(record.MA_NHOM || "").trim();
    if (nhom === "1" || nhom === "01" || nhom === "10") continue;

    const date = parseXmlDateTime(record.NGAY_TH_YL);
    if (!date) continue;
    const timeMinute = Math.floor(date.getTime() / 60000);
    const machines = record.MA_MAY.split(";")
      .map((m) => m.trim().toUpperCase())
      .filter(Boolean);
    const uniqueMachines = Array.from(new Set(machines));
    for (const machine of uniqueMachines) {
      const key = `${machine}|${timeMinute}`;
      const list = groups.get(key) ?? [];
      list.push(record);
      groups.set(key, list);
    }
  }

  // Thu thập danh sách các bản ghi đối chiếu cho từng record
  const flaggedDetails = new Map<
    Xml3Record,
    { machines: Set<string>; peers: DuplicateMachineInfo[] }
  >();

  for (const [key, rows] of groups.entries()) {
    if (rows.length <= 1) continue;
    const [machine, timeMinStr] = key.split("|");
    const timeMinute = Number(timeMinStr);

    for (let i = 0; i < rows.length; i++) {
      const current = rows[i];
      let entry = flaggedDetails.get(current);
      if (!entry) {
        entry = { machines: new Set<string>(), peers: [] };
        flaggedDetails.set(current, entry);
      }
      entry.machines.add(machine);

      for (let j = 0; j < rows.length; j++) {
        if (i === j) continue;
        const peer = rows[j];
        const isSamePatient =
          Boolean(peer.MA_LK && current.MA_LK && peer.MA_LK === current.MA_LK) ||
          Boolean(peer.MA_BN && current.MA_BN && peer.MA_BN === current.MA_BN);
        const timeDisplay = formatXmlDateTime(peer.NGAY_TH_YL) || peer.NGAY_TH_YL;

        // Tránh trùng lặp peer
        if (
          !entry.peers.some(
            (p) =>
              p.machineCode === machine &&
              p.peerMaLk === peer.MA_LK &&
              p.peerStt === peer.STT &&
              p.peerMaDichVu === (peer.MA_DICH_VU || peer.MA_VAT_TU),
          )
        ) {
          entry.peers.push({
            machineCode: machine,
            timeMinute,
            timeDisplay,
            isSamePatient,
            peerMaLk: peer.MA_LK,
            peerMaBn: peer.MA_BN,
            peerHoTen: peer.HO_TEN || peer.patient?.HO_TEN || "",
            peerDichVu: peer.TEN_DICH_VU || peer.TEN_VAT_TU || peer.MA_DICH_VU,
            peerMaDichVu: peer.MA_DICH_VU || peer.MA_VAT_TU,
            peerStt: peer.STT || "",
            peerFile: peer.fileName,
          });
        }
      }
    }
  }

  return records.map((record) => {
    const detailData = flaggedDetails.get(record);
    if (!detailData || detailData.machines.size === 0) return record;

    const detailIndex = record.STT || "xx";
    const machineListStr = Array.from(detailData.machines).join(", ");

    // Tạo chuỗi tóm tắt đối chiếu
    let peerSummary = "";
    if (detailData.peers.length > 0) {
      const diffPatientPeers = detailData.peers.filter((p) => !p.isSamePatient);
      const samePatientPeers = detailData.peers.filter((p) => p.isSamePatient);

      const parts: string[] = [];
      if (diffPatientPeers.length > 0) {
        const bnNames = Array.from(
          new Set(
            diffPatientPeers.map(
              (p) =>
                `${p.peerHoTen || "BN chưa rõ tên"} (Mã BN: ${p.peerMaBn || "—"}, LK: ${p.peerMaLk})`,
            ),
          ),
        );
        parts.push(`Trùng với BN: ${bnNames.join("; ")} lúc ${diffPatientPeers[0].timeDisplay}`);
      }
      if (samePatientPeers.length > 0) {
        const dvNames = Array.from(
          new Set(samePatientPeers.map((p) => `"${p.peerDichVu}" (STT ${p.peerStt})`)),
        );
        parts.push(
          `Trùng cùng BN: DV ${dvNames.join(", ")} lúc ${samePatientPeers[0].timeDisplay}`,
        );
      }
      peerSummary = ` [${parts.join(" · ")}]`;
    }

    const baseMessage = formatDuplicateMachineWarningMessage(detailIndex, machineListStr);
    const message = `${baseMessage}${peerSummary}`;

    const alreadyHasMessage = record.detail.includes("trùng thời gian thực hiện y lệnh");
    const newDetail = alreadyHasMessage
      ? record.detail
      : record.detail
        ? `${record.detail} · ${message}`
        : message;

    return {
      ...record,
      hasDuplicateMachineWarning: true,
      duplicateMachineInfo: detailData.peers,
      status: record.status === "ok" ? "duplicate-machine-warning" : record.status,
      detail: newDetail,
    };
  });
}

function chronologyIssues(fields: Record<Xml3Field, string>): string[] {
  return getChronologyIssues(fields.NGAY_YL, fields.NGAY_TH_YL, fields.NGAY_KQ);
}

export function isValidMaMayUnit(code: string): boolean {
  const trimmed = code.trim();
  if (!trimmed) return false;
  // Format XX.3[xxx].Z (XX: 2-4 ký tự chữ/số/tiếng Việt, . 3[xxx] ., Z: serial/mã quản lý)
  const unitRegex = /^[A-Za-zÀ-ỹ0-9]{2,4}\.3\[[^\]\r\n\t]+\]\.[^;\r\n\t]+$/u;
  return unitRegex.test(trimmed);
}

export function isValidMaMay(maMay: string): boolean {
  const trimmed = maMay ? maMay.trim() : "";
  if (!trimmed) return false;

  const rawParts = trimmed.split(";").map((p) => p.trim());
  if (rawParts.length === 0 || rawParts.some((p) => !p)) {
    return false;
  }
  const parts = rawParts;

  // Trường hợp 1: Tất cả các phần đều là mã máy hoàn chỉnh XX.3[xxx].Z
  if (parts.every((p) => isValidMaMayUnit(p))) {
    return true;
  }

  // Trường hợp 2: Phần đầu tiên là XX.3[xxx].Z1 và các phần sau là các số serial bổ sung
  if (isValidMaMayUnit(parts[0])) {
    const remainingAreSerials = parts.slice(1).every((p) => {
      // Nếu có ngoặc vuông hoặc chứa pattern nguồn kinh phí (như .2[, .3.), đây là máy riêng biệt bị gõ sai
      if (p.includes("[") || p.includes("]") || /\.\d/u.test(p)) {
        return false;
      }
      return p.length > 0;
    });
    if (remainingAreSerials) return true;
  }

  return false;
}

export function normalizeDichVuCode(code: string): string {
  const clean = (code || "").trim().toUpperCase();
  if (/^\d\.\d{4}\.\d{4}$/.test(clean)) {
    return "0" + clean;
  }
  return clean;
}

export function isMandatoryMachineService(
  maDichVu: string,
  mandatoryRules:
    | ReadonlyMap<string, MachineServiceRule>
    | ReadonlyArray<MachineServiceRule> = DEFAULT_MANDATORY_MACHINE_MAP,
): boolean {
  if (!maDichVu || !maDichVu.trim()) return false;
  const raw = maDichVu.trim().toUpperCase();
  const normalized = normalizeDichVuCode(raw);
  if (mandatoryRules instanceof Map) {
    return mandatoryRules.has(raw) || mandatoryRules.has(normalized);
  }
  if (Array.isArray(mandatoryRules)) {
    return mandatoryRules.some((r) => {
      const c = r.code.trim().toUpperCase();
      return c === raw || c === normalized;
    });
  }
  return false;
}

export function evaluateRecord(
  fields: Record<Xml3Field, string> & {
    MA_BN?: string;
    HO_TEN?: string;
    patient?: PatientInfo;
  },
  fileName: string,
  serviceRules: ReadonlyMap<string, ServiceRule> = new Map(),
  mandatoryMachineRules:
    | ReadonlyMap<string, MachineServiceRule>
    | ReadonlyArray<MachineServiceRule> = DEFAULT_MANDATORY_MACHINE_MAP,
): Xml3Record {
  const durationMinutes = minutesBetween(fields.NGAY_TH_YL, fields.NGAY_KQ);
  const serviceRule = serviceRules.get(fields.MA_DICH_VU.trim());
  const minLimit =
    serviceRule?.minMinutes !== undefined && serviceRule?.minMinutes !== null
      ? serviceRule.minMinutes
      : 1; // Mặc định quy ước thời gian tối thiểu > 0 phút (tối thiểu 1 phút)
  const maxLimit = serviceRule?.maxMinutes ?? DURATION_LIMIT_MINUTES;
  const orderIssues = chronologyIssues(fields);
  const hasOrderWarning = orderIssues.some((issue) => issue.includes("sớm hơn"));
  const hasEqualWarning = orderIssues.some((issue) => issue.includes("="));

  const groupCode = fields.MA_NHOM.trim();
  const isGroup10Or11 = groupCode === "10" || groupCode === "11";
  const hasTtThauWarning = isGroup10Or11 && (!fields.TT_THAU || !fields.TT_THAU.trim());

  // Mã nhóm bằng 10 (vật tư đi kèm dịch vụ kỹ thuật) loại trừ ra khỏi cảnh báo mã máy
  const isGroup10 = groupCode === "10";
  const isMandatoryMachine =
    !isGroup10 && isMandatoryMachineService(fields.MA_DICH_VU, mandatoryMachineRules);
  const maMayVal = fields.MA_MAY ? fields.MA_MAY.trim() : "";
  let hasMaMayWarning = false;
  let maMayWarningMessage = "";

  if (!isGroup10) {
    if (isMandatoryMachine) {
      if (!maMayVal) {
        hasMaMayWarning = true;
        maMayWarningMessage =
          "XML3: Dịch vụ kỹ thuật bắt buộc gửi kèm mã máy nhưng cột MA_MAY rỗng";
      } else if (!isValidMaMay(maMayVal)) {
        hasMaMayWarning = true;
        maMayWarningMessage = `XML3: Mã máy '${maMayVal}' sai định dạng chuẩn (yêu cầu XX.3[xxx].Z)`;
      }
    } else if (maMayVal && !isValidMaMay(maMayVal)) {
      hasMaMayWarning = true;
      maMayWarningMessage = `XML3: Mã máy '${maMayVal}' sai định dạng chuẩn (yêu cầu XX.3[xxx].Z)`;
    }
  }

  let status: Xml3Record["status"] = "ok";
  const details: string[] = [];

  if (!fields.NGAY_TH_YL || !fields.NGAY_KQ) {
    status = "missing";
    details.push("Thiếu NGAY_TH_YL hoặc NGAY_KQ");
  } else if (durationMinutes === null) {
    status = "invalid";
    details.push("Không đọc được định dạng NGAY_TH_YL hoặc NGAY_KQ");
  } else if (durationMinutes < 0) {
    status = "negative";
    details.push("NGAY_KQ sớm hơn NGAY_TH_YL");
  } else if (serviceRule?.maxMinutes === null) {
    details.push("Dịch vụ được loại trừ khỏi cảnh báo thời lượng");
  } else if (durationMinutes < minLimit) {
    status = "warning";
    if (minLimit === 1 && durationMinutes === 0) {
      details.push("Thời lượng 0 phút (yêu cầu thời gian > 0 phút)");
    } else {
      details.push(
        `Thời lượng ${formatMinutes(durationMinutes)} phút nhỏ hơn thời gian tối thiểu quy định (${minLimit} phút)`,
      );
    }
  } else if (durationMinutes > maxLimit) {
    status = "warning";
    details.push(
      `Vượt ${formatMinutes(durationMinutes - maxLimit)} phút so với ngưỡng tối đa ${maxLimit} phút`,
    );
  } else {
    details.push(
      `Trong ngưỡng thời gian (${minLimit > 1 ? `${minLimit}–` : "≤ "}${maxLimit} phút)`,
    );
  }

  if (!fields.NGAY_YL) {
    details.push("Thiếu NGAY_YL; không ảnh hưởng phép tính NGAY_KQ − NGAY_TH_YL");
  }

  if (hasOrderWarning) {
    if (status === "ok") status = "order-warning";
    details.unshift(
      `Kiểm tra thứ tự: ${orderIssues.filter((issue) => issue.includes("sớm hơn")).join("; ")}`,
    );
  }
  if (hasEqualWarning) {
    if (status === "ok") status = "equal-warning";
    details.unshift(
      `Kiểm tra trùng mốc: ${orderIssues.filter((issue) => issue.includes("=")).join("; ")}`,
    );
  }
  if (hasTtThauWarning) {
    if (status === "ok") status = "tt-thau-warning";
    details.unshift("XML3: TT_THAU không được để trống khi mã nhóm bằng 10 hoặc 11");
  }
  if (hasMaMayWarning) {
    if (status === "ok") status = "ma-may-warning";
    details.unshift(maMayWarningMessage);
  }

  const extraFields = fields as Record<string, string>;
  const hasZ000Warning =
    hasZ000DiseaseCode(fields.MA_BENH) ||
    hasZ000DiseaseCode(fields.MA_BENH_YHCT) ||
    hasZ000DiseaseCode(extraFields.MA_BENH_CHINH) ||
    hasZ000DiseaseCode(extraFields.MA_BENH_KT) ||
    hasZ000DiseaseCode(extraFields.MA_BENHKEMTHEO);

  const hasZ301Warning =
    hasZ301DiseaseCode(fields.MA_BENH) ||
    hasZ301DiseaseCode(fields.MA_BENH_YHCT) ||
    hasZ301DiseaseCode(extraFields.MA_BENH_CHINH) ||
    hasZ301DiseaseCode(extraFields.MA_BENH_KT) ||
    hasZ301DiseaseCode(extraFields.MA_BENHKEMTHEO);

  if (hasZ000Warning) {
    if (status === "ok") status = "warning";
    const stt = fields.STT || "1";
    details.unshift(formatZ000WarningMessage("XML3", stt));
  }
  if (hasZ301Warning) {
    if (status === "ok") status = "warning";
    const stt = fields.STT || "1";
    details.unshift(formatZ301WarningMessage("XML3", stt));
  }

  const rawFields = fields as Record<string, string>;
  const soLuong = rawFields.SO_LUONG ? parseFloat(rawFields.SO_LUONG) : undefined;
  const donGia =
    rawFields.DON_GIA || rawFields.DON_GIA_BH || rawFields.DON_GIA_BV
      ? parseFloat(rawFields.DON_GIA || rawFields.DON_GIA_BH || rawFields.DON_GIA_BV)
      : undefined;
  const donGiaBh = rawFields.DON_GIA_BH ? parseFloat(rawFields.DON_GIA_BH) : donGia;
  const donGiaBv = rawFields.DON_GIA_BV ? parseFloat(rawFields.DON_GIA_BV) : donGia;

  const tyleTt =
    rawFields.TYLE_TT || rawFields.TYLE_TT_BH || rawFields.TYLE_TT_DV
      ? parseFloat(rawFields.TYLE_TT || rawFields.TYLE_TT_BH || rawFields.TYLE_TT_DV)
      : undefined;
  const tyleTtBh = rawFields.TYLE_TT_BH ? parseFloat(rawFields.TYLE_TT_BH) : tyleTt;
  const tyleTtDv = rawFields.TYLE_TT_DV ? parseFloat(rawFields.TYLE_TT_DV) : tyleTt;

  const mucHuong = rawFields.MUC_HUONG
    ? parseFloat(rawFields.MUC_HUONG)
    : fields.patient?.MUC_HUONG
      ? parseFloat(fields.patient.MUC_HUONG)
      : undefined;

  const tBhtt = rawFields.T_BHTT ? parseFloat(rawFields.T_BHTT) : undefined;
  const tBntt = rawFields.T_BNTT ? parseFloat(rawFields.T_BNTT) : undefined;
  const tBncct = rawFields.T_BNCCT ? parseFloat(rawFields.T_BNCCT) : undefined;

  let thanhTien =
    rawFields.THANH_TIEN || rawFields.THANH_TIEN_BH || rawFields.THANH_TIEN_BV
      ? parseFloat(rawFields.THANH_TIEN || rawFields.THANH_TIEN_BH || rawFields.THANH_TIEN_BV)
      : undefined;

  if (thanhTien === undefined && soLuong !== undefined && donGia !== undefined) {
    thanhTien = Math.round(soLuong * donGia);
  }

  const thanhTienBh = rawFields.THANH_TIEN_BH ? parseFloat(rawFields.THANH_TIEN_BH) : thanhTien;
  const thanhTienBv = rawFields.THANH_TIEN_BV ? parseFloat(rawFields.THANH_TIEN_BV) : thanhTien;

  return {
    ...fields,
    SO_LUONG: Number.isNaN(soLuong) ? undefined : soLuong,
    DON_GIA: Number.isNaN(donGia) ? undefined : donGia,
    DON_GIA_BV: Number.isNaN(donGiaBv) ? undefined : donGiaBv,
    DON_GIA_BH: Number.isNaN(donGiaBh) ? undefined : donGiaBh,
    TYLE_TT: Number.isNaN(tyleTt) ? undefined : tyleTt,
    TYLE_TT_DV: Number.isNaN(tyleTtDv) ? undefined : tyleTtDv,
    TYLE_TT_BH: Number.isNaN(tyleTtBh) ? undefined : tyleTtBh,
    THANH_TIEN: Number.isNaN(thanhTien) ? undefined : thanhTien,
    THANH_TIEN_BV: Number.isNaN(thanhTienBv) ? undefined : thanhTienBv,
    THANH_TIEN_BH: Number.isNaN(thanhTienBh) ? undefined : thanhTienBh,
    T_BHTT: Number.isNaN(tBhtt) ? undefined : tBhtt,
    T_BNTT: Number.isNaN(tBntt) ? undefined : tBntt,
    T_BNCCT: Number.isNaN(tBncct) ? undefined : tBncct,
    MUC_HUONG: Number.isNaN(mucHuong) ? undefined : mucHuong,
    MA_BN: fields.MA_BN || "",
    HO_TEN: fields.HO_TEN || "",
    patient: fields.patient,
    fileName,
    table: "XML3",
    durationMinutes,
    serviceRule,
    hasOrderWarning,
    hasEqualWarning,
    hasBedWarning: false,
    hasTtThauWarning,
    hasMaMayWarning,
    hasDuplicateMachineWarning: false,
    hasZ000Warning: Boolean(hasZ000Warning || hasZ301Warning),
    orderIssues,
    status,
    detail: details.join(" · "),
  };
}

function formatMinutes(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function isWarning(record: Xml3Record): boolean {
  return (
    record.status === "warning" ||
    record.status === "tt-thau-warning" ||
    record.status === "ma-may-warning" ||
    record.status === "duplicate-machine-warning" ||
    record.status === "bed-warning" ||
    record.hasOrderWarning ||
    record.hasEqualWarning ||
    record.hasBedWarning ||
    record.hasTtThauWarning ||
    record.hasMaMayWarning ||
    Boolean(record.hasDuplicateMachineWarning) ||
    Boolean(record.hasZ000Warning)
  );
}

function toXml3Warning(record: Xml3Record, index: number): ValidationWarning {
  return {
    source: "XML3",
    detailIndex: Number(record.STT) || index + 1,
    MA_LK: record.MA_LK,
    HO_TEN: record.HO_TEN || record.patient?.HO_TEN || "",
    MA_BN: record.MA_BN || record.patient?.MA_BN || "",
    MA_DICH_VU: record.MA_DICH_VU || record.MA_VAT_TU,
    TEN_DICH_VU: record.TEN_DICH_VU || record.TEN_VAT_TU,
    message: record.detail,
    record,
    patient: record.patient,
  };
}

function decodeFileContent(content: string, label: string): Document {
  const value = content.trim();
  if (!value) throw new Error(`${label}: thiếu NOIDUNGFILE`);
  const decoded = value.startsWith("<") ? value : base64ToUtf8(value);
  return parseXml(decoded, label);
}

export function decodeFileContentToString(content: string, label: string): string {
  const value = content.trim();
  if (!value) return "";
  return value.startsWith("<") ? value : base64ToUtf8(value);
}

export const XML_TABLE_META: Record<
  string,
  { title: string; shortName: string; desc: string; icon: string }
> = {
  XML1: {
    title: "Bảng 1: Chỉ tiêu tổng hợp khám chữa bệnh BHYT",
    shortName: "Tổng hợp KCB",
    desc: "Thông tin hành chính, ngày vào/ra, chẩn đoán, mã bệnh, nơi ĐKBD, chi phí tổng hợp",
    icon: "📋",
  },
  XML2: {
    title: "Bảng 2: Chỉ tiêu chi tiết thuốc thanh toán BHYT",
    shortName: "Chi tiết Thuốc",
    desc: "Mã thuốc, tên thuốc, hàm lượng, đường dùng, số lượng, đơn giá, TT_THAU, mã khoa",
    icon: "💊",
  },
  XML3: {
    title: "Bảng 3: Chỉ tiêu chi tiết DVKT & VTYT thanh toán BHYT",
    shortName: "DVKT & Vật tư",
    desc: "Mã DVKT, tên DV, thời gian YL - TH_YL - KQ, thời lượng, TT_THAU, mã nhóm",
    icon: "🩺",
  },
  XML4: {
    title: "Bảng 4: Chỉ tiêu chi tiết dịch vụ cận lâm sàng",
    shortName: "Cận lâm sàng & CĐHA",
    desc: "Mã dịch vụ CLS, kết quả, kết luận, ngày kết quả, mô tả hình ảnh",
    icon: "🔬",
  },
  XML5: {
    title: "Bảng 5: Chỉ tiêu chi tiết theo dõi diễn biến lâm sàng",
    shortName: "Diễn biến lâm sàng",
    desc: "Diễn biến bệnh theo ngày, tình trạng người bệnh, y lệnh điều trị",
    icon: "📈",
  },
  XML6: {
    title: "Bảng 6: Hồ sơ bệnh án phục hồi chức năng",
    shortName: "Phục hồi chức năng",
    desc: "Lượng giá chức năng, các kỹ thuật phục hồi chức năng đã thực hiện",
    icon: "♿",
  },
  XML7: {
    title: "Bảng 7: Dữ liệu giấy ra viện",
    shortName: "Giấy ra viện",
    desc: "Ngày vào, ngày ra, chẩn đoán ra viện, phương pháp điều trị, thời gian nghỉ ngoại trú (NGOAITRU_TUNGAY)",
    icon: "🏥",
  },
  XML8: {
    title: "Bảng 8: Tóm tắt bệnh án",
    shortName: "Tóm tắt bệnh án",
    desc: "Lý do vào viện, tóm tắt bệnh án, quá trình và hướng điều trị",
    icon: "📑",
  },
  XML9: {
    title: "Bảng 9: Giấy chứng sinh",
    shortName: "Giấy chứng sinh",
    desc: "Thông tin trẻ sơ sinh, cân nặng, tình trạng sức khỏe, người đỡ đẻ",
    icon: "👶",
  },
  XML10: {
    title: "Bảng 10: Giấy chứng nhận nghỉ dưỡng thai",
    shortName: "Nghỉ dưỡng thai",
    desc: "Thông tin thai phụ, tuổi thai, số ngày nghỉ, cơ sở cấp giấy",
    icon: "🤰",
  },
  XML11: {
    title: "Bảng 11: Giấy chứng nhận nghỉ việc hưởng BHXH",
    shortName: "Nghỉ việc BHXH",
    desc: "Chẩn đoán bệnh, số ngày nghỉ việc được hưởng bảo hiểm xã hội",
    icon: "📄",
  },
  XML12: {
    title: "Bảng 12: Giấy chuyển tuyến khám bệnh, chữa bệnh BHYT",
    shortName: "Giấy chuyển tuyến",
    desc: "Cơ sở chuyển đi, cơ sở chuyển đến, lý do chuyển tuyến, tóm tắt bệnh án",
    icon: "🚑",
  },
  XML13: {
    title: "Bảng 13: Giấy hẹn khám lại",
    shortName: "Giấy hẹn khám lại",
    desc: "Ngày hẹn khám lại, lý do hẹn, hướng dẫn người bệnh",
    icon: "📅",
  },
  XML14: {
    title: "Bảng 14: Thông tin bảng kê chi phí KCB",
    shortName: "Bảng kê chi phí",
    desc: "Chi tiết cơ cấu chi phí, mức hưởng BHYT, người bệnh cùng chi trả",
    icon: "💰",
  },
  XML15: {
    title: "Bảng 15: Thông tin giám định & phản hồi",
    shortName: "Giám định & Phản hồi",
    desc: "Kết quả giám định của cơ quan BHXH, mã lỗi, số tiền xuất toán / điều chỉnh",
    icon: "⚖️",
  },
};

export const ALL_XML_TABLE_KEYS = [
  "XML1",
  "XML2",
  "XML3",
  "XML4",
  "XML5",
  "XML6",
  "XML7",
  "XML8",
  "XML9",
  "XML10",
  "XML11",
  "XML12",
  "XML13",
  "XML14",
  "XML15",
];

export function parseXmlTableContent(
  xmlString: string,
  tableType: string,
): { rows: Record<string, string>[]; headers: string[]; rawXml: string } {
  if (!xmlString) return { rows: [], headers: [], rawXml: "" };
  try {
    const doc = parseXml(xmlString, tableType);
    const root = doc.documentElement;
    if (!root) return { rows: [], headers: [], rawXml: xmlString };

    const children = Array.from(root.children);
    let rowElements: Element[] = [];

    const hasComplexChildren = children.some((c) => c.children.length > 0);
    if (hasComplexChildren) {
      rowElements = children.filter((c) => c.children.length > 0);
      if (
        rowElements.length === 1 &&
        rowElements[0].children.length > 1 &&
        rowElements[0].children[0].children.length > 0
      ) {
        rowElements = Array.from(rowElements[0].children);
      }
    } else if (children.length > 0) {
      rowElements = [root];
    }

    const headerSet = new Set<string>();
    const rows: Record<string, string>[] = [];

    for (const rowEl of rowElements) {
      const rowData: Record<string, string> = {};
      for (const child of Array.from(rowEl.children)) {
        const tag = child.tagName;
        rowData[tag] = child.textContent?.trim() ?? "";
        headerSet.add(tag);
      }
      if (Object.keys(rowData).length > 0) {
        rows.push(rowData);
      }
    }

    return { rows, headers: Array.from(headerSet), rawXml: xmlString };
  } catch {
    return { rows: [], headers: [], rawXml: xmlString };
  }
}

export function formatXmlString(xml: string): string {
  if (!xml) return "";
  let formatted = "";
  let indent = "";
  const tab = "  ";
  xml.split(/>\s*</).forEach((node) => {
    if (node.match(/^\/\w/)) indent = indent.substring(tab.length);
    formatted += indent + "<" + node + ">\n";
    if (node.match(/^<?\w[^>]*[^/]$/)) indent += tab;
  });
  return formatted.trim();
}

async function collectXml4Records(file: File): Promise<Xml4Record[]> {
  const outer = parseXml(await file.text(), file.name);
  const records: Xml4Record[] = [];
  for (const fileNode of Array.from(outer.getElementsByTagName("FILEHOSO"))) {
    const type = fileNode.getElementsByTagName("LOAIHOSO")[0]?.textContent?.trim() ?? "";
    if (type !== "XML4") continue;
    const content = fileNode.getElementsByTagName("NOIDUNGFILE")[0]?.textContent ?? "";
    records.push(...readXml4Records(decodeFileContent(content, `${file.name} XML4`), file.name));
  }
  return records;
}

async function collectXml1Patients(file: File): Promise<Map<string, PatientInfo>> {
  const outer = parseXml(await file.text(), file.name);
  const patients = new Map<string, PatientInfo>();
  const fileNodes = Array.from(outer.getElementsByTagName("FILEHOSO"));
  if (fileNodes.length > 0) {
    for (const fileNode of fileNodes) {
      const type = fileNode.getElementsByTagName("LOAIHOSO")[0]?.textContent?.trim() ?? "";
      if (type !== "XML1") continue;
      const content = fileNode.getElementsByTagName("NOIDUNGFILE")[0]?.textContent ?? "";
      const inner = decodeFileContent(content, `${file.name} XML1`);
      for (const [maLk, patient] of readXml1Patients(inner)) patients.set(maLk, patient);
    }
  } else {
    for (const [maLk, patient] of readXml1Patients(outer)) patients.set(maLk, patient);
  }
  return patients;
}

export async function parseXml3FromExcel(
  file: File,
  serviceRules: ReadonlyMap<string, ServiceRule> = new Map(),
  mandatoryMachineRules: ReadonlyMap<string, MachineServiceRule> = DEFAULT_MANDATORY_MACHINE_MAP,
): Promise<{
  records: Xml3Record[];
  patients: Map<string, PatientInfo>;
  tableFiles: number;
}> {
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);

  const worksheet =
    workbook.worksheets.find((ws) => {
      const name = ws.name.toUpperCase();
      return name.includes("XML3") || name.includes("3") || name.includes("CHI_TIET");
    }) || workbook.worksheets[0];

  if (!worksheet) {
    throw new Error(`${file.name}: Không tìm thấy bảng tính hợp lệ trong file Excel`);
  }

  const colMap = new Map<string, number>();
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    const header = String(cell.value ?? "")
      .trim()
      .toUpperCase();
    if (header) colMap.set(header, colNumber);
  });

  const getColVal = (row: ExcelJS.Row, ...names: string[]): string => {
    for (const name of names) {
      const colNum = colMap.get(name.toUpperCase());
      if (colNum !== undefined) {
        const cell = row.getCell(colNum);
        let val = cell.value;
        if (val === null || val === undefined) continue;
        if (val instanceof Date) {
          const y = val.getFullYear();
          const m = String(val.getMonth() + 1).padStart(2, "0");
          const d = String(val.getDate()).padStart(2, "0");
          const h = String(val.getHours()).padStart(2, "0");
          const mi = String(val.getMinutes()).padStart(2, "0");
          const s = String(val.getSeconds()).padStart(2, "0");
          return `${y}${m}${d}${h}${mi}${s}`;
        }
        if (
          typeof val === "object" &&
          val !== null &&
          "text" in (val as unknown as Record<string, unknown>)
        ) {
          val = (val as unknown as { text: string }).text;
        }
        const str = String(val).trim();
        if (str) return str;
      }
    }
    return "";
  };

  const records: Xml3Record[] = [];
  const patients = new Map<string, PatientInfo>();

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const maLk = getColVal(row, "MA_LK", "MALK");
    if (!maLk) return;

    const stt = getColVal(row, "STT") || String(rowNumber - 1);
    const maBn = getColVal(row, "MA_BN", "MA_BA", "MABN", "SO_BENH_AN");
    const hoTen = getColVal(row, "HO_TEN", "HOTEN", "TEN_BENH_NHAN");
    const maThe = getColVal(row, "MA_THE", "MA_THE_BHYT", "MATHE");
    const cccd = getColVal(row, "SO_CCCD", "CCCD");
    const ngayVao = getColVal(row, "NGAY_VAO", "NGAYVAO");
    const ngayRa = getColVal(row, "NGAY_RA", "NGAYRA");

    if (!patients.has(maLk)) {
      patients.set(maLk, {
        MA_LK: maLk,
        MA_BN: maBn,
        HO_TEN: hoTen,
        MA_THE_BHYT: maThe,
        SO_CCCD: cccd,
        NGAY_VAO: ngayVao,
        NGAY_RA: ngayRa,
      });
    }

    const fields: Record<string, string> = {
      MA_LK: maLk,
      STT: stt,
      MA_DICH_VU: getColVal(row, "MA_DICH_VU", "MADICHVU", "MA_CP"),
      MA_VAT_TU: getColVal(row, "MA_VAT_TU", "MAVATTU"),
      TEN_DICH_VU: getColVal(row, "TEN_DICH_VU", "TENDICHVU", "TEN_CP"),
      TEN_VAT_TU: getColVal(row, "TEN_VAT_TU", "TENVATTU"),
      MA_NHOM: getColVal(row, "MA_NHOM", "MANHOM"),
      MA_KHOA: getColVal(row, "MA_KHOA", "MAKHOA"),
      MA_GIUONG: getColVal(row, "MA_GIUONG", "MAGIUONG"),
      MA_BAC_SI: getColVal(row, "MA_BAC_SI", "MABACSI"),
      NGUOI_THUC_HIEN: getColVal(row, "NGUOI_THUC_HIEN", "NGUOITHUCHIEN", "MA_BSI_THUC_HIEN"),
      MA_BENH: getColVal(row, "MA_BENH", "MABENH"),
      MA_BENH_YHCT: getColVal(row, "MA_BENH_YHCT", "MABENHYHCT"),
      NGAY_YL: getColVal(row, "NGAY_YL", "NGAYYL"),
      NGAY_TH_YL: getColVal(row, "NGAY_TH_YL", "NGAYTHYL"),
      NGAY_KQ: getColVal(row, "NGAY_KQ", "NGAYKQ"),
      MA_MAY: getColVal(row, "MA_MAY", "MAMAY"),
      MA_HIEU_SP: getColVal(row, "MA_HIEU_SP", "MAHIEUSP"),
      TT_THAU: getColVal(row, "TT_THAU", "TTTHAU"),
      SO_LUONG: getColVal(row, "SO_LUONG", "SOLUONG"),
      DON_GIA: getColVal(row, "DON_GIA_BH", "DON_GIA", "DONGIA", "DON_GIA_BV"),
      DON_GIA_BH: getColVal(row, "DON_GIA_BH", "DON_GIA"),
      DON_GIA_BV: getColVal(row, "DON_GIA_BV"),
      TYLE_TT: getColVal(row, "TYLE_TT_BH", "TYLE_TT", "TYLETT", "TYLE_TT_DV"),
      TYLE_TT_BH: getColVal(row, "TYLE_TT_BH", "TYLE_TT"),
      TYLE_TT_DV: getColVal(row, "TYLE_TT_DV"),
      THANH_TIEN: getColVal(row, "THANH_TIEN_BH", "THANH_TIEN", "THANHTIEN", "THANH_TIEN_BV"),
      THANH_TIEN_BH: getColVal(row, "THANH_TIEN_BH", "THANH_TIEN"),
      THANH_TIEN_BV: getColVal(row, "THANH_TIEN_BV"),
      T_BHTT: getColVal(row, "T_BHTT", "TBHTT", "TIEN_BHTT", "TIEN_BHYT"),
      T_BNTT: getColVal(row, "T_BNTT", "TBNTT", "TIEN_BNTT"),
      T_BNCCT: getColVal(row, "T_BNCCT", "TBNCCT", "TIEN_BNCCT"),
      MUC_HUONG: getColVal(row, "MUC_HUONG", "MUCHUONG"),
      MA_BN: maBn,
      HO_TEN: hoTen,
    };

    const patient = patients.get(maLk);
    const record = evaluateRecord(
      fields as Record<Xml3Field, string> & {
        MA_BN?: string;
        HO_TEN?: string;
        patient?: PatientInfo;
      },
      file.name,
      serviceRules,
      mandatoryMachineRules,
    );
    if (patient) {
      record.patient = patient;
    }
    records.push(record);
  });

  return {
    records,
    patients,
    tableFiles: 1,
  };
}

export async function analyzeXml3File(
  file: File,
  sharedPatients = new Map<string, PatientInfo>(),
  serviceRules: ReadonlyMap<string, ServiceRule> = new Map(),
  drugRules: ReadonlyMap<string, DrugRule> = new Map(),
  mandatoryMachineRules: ReadonlyMap<string, MachineServiceRule> = DEFAULT_MANDATORY_MACHINE_MAP,
): Promise<Xml3Analysis> {
  const text = await file.text();
  const outer = parseXml(text, file.name);
  const rawRecords: Xml3Record[] = [];
  const xml1Warnings: ValidationWarning[] = [];
  const xml2Warnings: ValidationWarning[] = [];
  const xml4Records: Xml4Record[] = [];
  const xml7Warnings: ValidationWarning[] = [];
  let tableFiles = 0;
  const log: string[] = [`[${file.name}] Bắt đầu đọc XML chứa 15 bảng`];
  const fileNodes = Array.from(outer.getElementsByTagName("FILEHOSO"));
  const patients = sharedPatients;

  for (const fileNode of fileNodes) {
    const type = fileNode.getElementsByTagName("LOAIHOSO")[0]?.textContent?.trim() ?? "";
    const content = fileNode.getElementsByTagName("NOIDUNGFILE")[0]?.textContent ?? "";
    if (type === "XML1") {
      const inner = decodeFileContent(content, `${file.name} XML1`);
      for (const [maLk, patient] of readXml1Patients(inner)) patients.set(maLk, patient);
      xml1Warnings.push(...readXml1Warnings(inner, patients));
    }
    if (type === "XML2") {
      const inner = decodeFileContent(content, `${file.name} XML2`);
      xml2Warnings.push(...readXml2Warnings(inner, patients, drugRules));
    }
    if (type === "XML4") {
      const inner = decodeFileContent(content, `${file.name} XML4`);
      xml4Records.push(...readXml4Records(inner, file.name));
    }
    if (type === "XML7") {
      const inner = decodeFileContent(content, `${file.name} XML7`);
      xml7Warnings.push(...readXml7Warnings(inner, patients));
    }
  }

  for (const fileNode of fileNodes) {
    const type = fileNode.getElementsByTagName("LOAIHOSO")[0]?.textContent?.trim() ?? "";
    if (type !== "XML3") continue;
    tableFiles++;
    const content = fileNode.getElementsByTagName("NOIDUNGFILE")[0]?.textContent ?? "";
    const inner = decodeFileContent(content, `${file.name} XML3`);
    rawRecords.push(
      ...readXml3Records(inner, file.name, patients, serviceRules, mandatoryMachineRules),
    );
  }

  if (!fileNodes.length && outer.getElementsByTagName("CHI_TIET_DVKT").length) {
    tableFiles = 1;
    rawRecords.push(
      ...readXml3Records(outer, file.name, patients, serviceRules, mandatoryMachineRules),
    );
  }
  if (!fileNodes.length && outer.getElementsByTagName("CHI_TIET_THUOC").length) {
    xml2Warnings.push(...readXml2Warnings(outer, patients, drugRules));
  }

  const isStandaloneXml1 =
    !fileNodes.length &&
    (outer.getElementsByTagName("TONG_HOP").length > 0 ||
      outer.getElementsByTagName("THONGTINBENHNHAN").length > 0 ||
      (outer.getElementsByTagName("MA_LK").length > 0 &&
        !outer.getElementsByTagName("CHI_TIET_DVKT").length &&
        !outer.getElementsByTagName("CHI_TIET_THUOC").length &&
        !outer.getElementsByTagName("CHI_TIET_CLS").length));

  if (isStandaloneXml1) {
    for (const [maLk, patient] of readXml1Patients(outer)) patients.set(maLk, patient);
    xml1Warnings.push(...readXml1Warnings(outer, patients));
  }

  const hasOtherXml =
    fileNodes.some((fileNode) => {
      const type = fileNode.getElementsByTagName("LOAIHOSO")[0]?.textContent?.trim() ?? "";
      return type === "XML1" || type === "XML2" || type === "XML4" || type === "XML7";
    }) ||
    isStandaloneXml1 ||
    (!fileNodes.length && outer.getElementsByTagName("CHI_TIET_THUOC").length > 0);
  if (!tableFiles && !hasOtherXml)
    throw new Error(`${file.name}: không tìm thấy FILEHOSO có LOAIHOSO=XML3`);

  const recordsWithBed = addBedWarnings(rawRecords, patients);
  const records = addDuplicateMachineWarnings(recordsWithBed);
  const warnings = records.filter(isWarning);
  const xml3Warnings = warnings.map(toXml3Warning);
  const xml4Warnings = createXml4Warnings(records, xml4Records, patients);
  const z000Warnings = [
    ...xml1Warnings.filter((w) => w.message.includes("Z00.0") || w.message.includes("Z30.1")),
    ...xml2Warnings.filter((w) => w.message.includes("Z00.0") || w.message.includes("Z30.1")),
    ...xml3Warnings.filter((w) => w.message.includes("Z00.0") || w.message.includes("Z30.1")),
    ...xml4Warnings.filter((w) => w.message.includes("Z00.0") || w.message.includes("Z30.1")),
  ];
  const missingTimes = records.filter((record) => record.status === "missing").length;
  const invalidTimes = records.filter((record) => record.status === "invalid").length;
  const negativeTimes = records.filter((record) => record.status === "negative").length;
  const orderWarnings = records.filter((record) => record.hasOrderWarning).length;
  const bedWarnings = records.filter((record) => record.hasBedWarning).length;
  const ttThauWarnings = records.filter((record) => record.hasTtThauWarning).length;
  const maMayWarnings = records.filter((record) => record.hasMaMayWarning).length;
  const duplicateMachineWarnings = records.filter(
    (record) => record.hasDuplicateMachineWarning,
  ).length;

  log.push(
    `XML3: ${records.length} dòng; cảnh báo: ${warnings.length}; mã máy: ${maMayWarnings}; trùng máy: ${duplicateMachineWarnings}; thứ tự: ${orderWarnings}; giường: ${bedWarnings}; TT_THAU (nhóm 10/11): ${ttThauWarnings}; Z00.0/Z30.1: ${z000Warnings.length}; XML1: ${xml1Warnings.length}; XML2: ${xml2Warnings.length}; XML4: ${xml4Warnings.length}; thiếu thời gian: ${missingTimes}; không hợp lệ: ${invalidTimes}; âm: ${negativeTimes}`,
  );
  return {
    fileName: file.name,
    tableFiles,
    records,
    warnings,
    xml1Warnings,
    xml2Warnings,
    xml3Warnings,
    xml4Warnings,
    xml7Warnings,
    z000Warnings,
    missingTimes,
    invalidTimes,
    negativeTimes,
    orderWarnings,
    bedWarnings,
    ttThauWarnings,
    maMayWarnings,
    duplicateMachineWarnings,
    log,
  };
}

export async function analyzeXml3Files(
  files: File[],
  serviceRules: ReadonlyArray<ServiceRule> = [],
  drugRules: ReadonlyArray<DrugRule> = [],
  mandatoryMachineRules: ReadonlyArray<MachineServiceRule> = DEFAULT_MANDATORY_MACHINE_SERVICES,
): Promise<BatchAnalysis> {
  const allRecords: Xml3Record[] = [];
  const errors: string[] = [];
  const logs: string[] = [];
  let tableFiles = 0;
  const sharedPatients = new Map<string, PatientInfo>();
  const serviceRuleMap = new Map(serviceRules.map((rule) => [rule.MA_DICH_VU.trim(), rule]));
  const drugRuleMap = new Map(drugRules.map((rule) => [rule.MA_THUOC.trim().toUpperCase(), rule]));
  const mandatoryMachineMap = new Map(
    mandatoryMachineRules.map((rule) => [rule.code.trim().toUpperCase(), rule]),
  );
  const xml1Warnings: ValidationWarning[] = [];
  const xml2Warnings: ValidationWarning[] = [];
  const xml3Warnings: ValidationWarning[] = [];
  const xml4Records: Xml4Record[] = [];
  const xml7Warnings: ValidationWarning[] = [];
  const dossierMap = new Map<string, PatientDossier>();

  // Pass 1: Thu thập bệnh nhân từ XML1 và CLS từ XML4
  for (const file of files) {
    if (file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls")) {
      continue;
    }
    try {
      for (const [maLk, patient] of await collectXml1Patients(file)) {
        sharedPatients.set(maLk, patient);
      }
      xml4Records.push(...(await collectXml4Records(file)));
    } catch {
      // Bỏ qua lỗi pass 1 để pass chính báo chi tiết
    }
  }

  // Pass 2: Phân tích XML3 và thu thập các bảng XML (15 bảng)
  for (const file of files) {
    try {
      if (file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls")) {
        const parsedExcel = await parseXml3FromExcel(file, serviceRuleMap, mandatoryMachineMap);
        tableFiles += parsedExcel.tableFiles;
        allRecords.push(...parsedExcel.records);
        for (const [maLk, pat] of parsedExcel.patients.entries()) {
          sharedPatients.set(maLk, { ...(sharedPatients.get(maLk) || {}), ...pat });
          let dossier = dossierMap.get(maLk);
          if (!dossier) {
            dossier = {
              maLk,
              patient: pat,
              fileName: file.name,
              tables: {},
              warnings: [],
              xml3Records: [],
              hasWarnings: false,
              warningCount: 0,
            };
            dossierMap.set(maLk, dossier);
          } else {
            dossier.patient = { ...dossier.patient, ...pat };
          }
        }
        logs.push(
          `[${file.name}] Đã nạp bảng XML3 từ file Excel (${parsedExcel.records.length} dòng)`,
        );
        continue;
      }

      const text = await file.text();
      const outer = parseXml(text, file.name);
      const fileNodes = Array.from(outer.getElementsByTagName("FILEHOSO"));

      if (fileNodes.length > 0) {
        for (const fileNode of fileNodes) {
          const type = fileNode.getElementsByTagName("LOAIHOSO")[0]?.textContent?.trim() ?? "";
          const content = fileNode.getElementsByTagName("NOIDUNGFILE")[0]?.textContent ?? "";
          if (!type || !content) continue;
          const decodedXml = decodeFileContentToString(content, `${file.name} ${type}`);
          const parsed = parseXmlTableContent(decodedXml, type);

          let maLks = Array.from(new Set(parsed.rows.map((r) => r.MA_LK).filter(Boolean)));
          if (!maLks.length) {
            try {
              const innerDoc = parseXml(decodedXml, type);
              const found =
                directTextOf(innerDoc.documentElement, "MA_LK") ||
                textOfGeneral(innerDoc.documentElement, "MA_LK");
              if (found) maLks = [found];
            } catch {
              // ignore
            }
          }
          if (!maLks.length) {
            const filePatients = Array.from(sharedPatients.keys());
            if (filePatients.length === 1) maLks = [filePatients[0]];
          }

          for (const maLk of maLks) {
            let dossier = dossierMap.get(maLk);
            if (!dossier) {
              const pat = sharedPatients.get(maLk) || { MA_LK: maLk, MA_BN: "", HO_TEN: "" };
              dossier = {
                maLk,
                patient: pat,
                fileName: file.name,
                tables: {},
                warnings: [],
                xml3Records: [],
                hasWarnings: false,
                warningCount: 0,
              };
              dossierMap.set(maLk, dossier);
            }
            const patientRows =
              parsed.rows.length > 0 && parsed.rows.some((r) => r.MA_LK)
                ? parsed.rows.filter((r) => !r.MA_LK || r.MA_LK === maLk)
                : parsed.rows;

            dossier.tables[type] = {
              tableType: type,
              tableName: XML_TABLE_META[type]?.shortName || type,
              rawXml: decodedXml,
              rows: patientRows,
              headers: parsed.headers,
            };
          }
        }
      } else {
        // File đơn không có wrapper FILEHOSO
        let guessedType = "XML3";
        if (outer.getElementsByTagName("CHI_TIET_THUOC").length) guessedType = "XML2";
        else if (outer.getElementsByTagName("CHI_TIET_CLS").length) guessedType = "XML4";
        else if (
          outer.getElementsByTagName("TONG_HOP").length ||
          outer.getElementsByTagName("THONGTINBENHNHAN").length
        )
          guessedType = "XML1";

        const parsed = parseXmlTableContent(text, guessedType);
        let maLks = Array.from(new Set(parsed.rows.map((r) => r.MA_LK).filter(Boolean)));
        if (!maLks.length) {
          const found =
            directTextOf(outer.documentElement, "MA_LK") ||
            textOfGeneral(outer.documentElement, "MA_LK");
          if (found) maLks = [found];
        }

        for (const maLk of maLks) {
          let dossier = dossierMap.get(maLk);
          if (!dossier) {
            const pat = sharedPatients.get(maLk) || { MA_LK: maLk, MA_BN: "", HO_TEN: "" };
            dossier = {
              maLk,
              patient: pat,
              fileName: file.name,
              tables: {},
              warnings: [],
              xml3Records: [],
              hasWarnings: false,
              warningCount: 0,
            };
            dossierMap.set(maLk, dossier);
          }
          const patientRows =
            parsed.rows.length > 0 && parsed.rows.some((r) => r.MA_LK)
              ? parsed.rows.filter((r) => !r.MA_LK || r.MA_LK === maLk)
              : parsed.rows;

          dossier.tables[guessedType] = {
            tableType: guessedType,
            tableName: XML_TABLE_META[guessedType]?.shortName || guessedType,
            rawXml: text,
            rows: patientRows,
            headers: parsed.headers,
          };
        }
      }

      const analysis = await analyzeXml3File(
        file,
        sharedPatients,
        serviceRuleMap,
        drugRuleMap,
        mandatoryMachineMap,
      );
      allRecords.push(...analysis.records);
      tableFiles += analysis.tableFiles;
      xml1Warnings.push(...analysis.xml1Warnings);
      xml2Warnings.push(...analysis.xml2Warnings);
      xml3Warnings.push(...analysis.xml3Warnings);
      xml7Warnings.push(...analysis.xml7Warnings);
      logs.push(...analysis.log);
    } catch (error) {
      errors.push(`[${file.name}] ${(error as Error).message}`);
    }
  }

  // Đảm bảo tất cả bệnh nhân trong sharedPatients đều có dossier
  for (const [maLk, patient] of sharedPatients.entries()) {
    let dossier = dossierMap.get(maLk);
    if (!dossier) {
      dossier = {
        maLk,
        patient,
        fileName: files[0]?.name || "hoso.xml",
        tables: {},
        warnings: [],
        xml3Records: [],
        hasWarnings: false,
        warningCount: 0,
      };
      dossierMap.set(maLk, dossier);
    } else {
      dossier.patient = { ...dossier.patient, ...patient };
    }
  }

  // Quét kiểm tra trùng thời gian mã máy trên toàn bộ các file (cross-patient / cross-file)
  const updatedRecordsWithMachines = addDuplicateMachineWarnings(allRecords);
  allRecords.splice(0, allRecords.length, ...updatedRecordsWithMachines);

  // Quét kiểm tra tiền giường & giường nằm ghép KT251 trên toàn bộ các file (cross-patient / cross-file)
  const updatedRecordsWithBeds = addBedWarnings(allRecords, sharedPatients);
  allRecords.splice(0, allRecords.length, ...updatedRecordsWithBeds);

  const updatedXml3Warnings = allRecords.filter(isWarning).map(toXml3Warning);
  for (const uw of updatedXml3Warnings) {
    if (
      !xml3Warnings.some(
        (w) => w.MA_LK === uw.MA_LK && w.detailIndex === uw.detailIndex && w.message === uw.message,
      )
    ) {
      xml3Warnings.push(uw);
    }
  }

  const xml4Warnings = createXml4Warnings(allRecords, xml4Records, sharedPatients);

  const allValidationWarnings: ValidationWarning[] = [];
  const addedWarningKeys = new Set<string>();

  const registerWarning = (w: ValidationWarning) => {
    const key = `${w.source}|${w.MA_LK}|${w.detailIndex}|${w.message}`;
    if (!addedWarningKeys.has(key)) {
      addedWarningKeys.add(key);
      allValidationWarnings.push(w);
    }
  };

  for (const w of xml1Warnings) registerWarning(w);
  for (const w of xml2Warnings) registerWarning(w);
  for (const w of xml3Warnings) registerWarning(w);
  for (const w of xml4Warnings) registerWarning(w);
  for (const w of xml7Warnings) registerWarning(w);

  // Quét toàn bộ 15 bảng XML trong các hồ sơ để tìm cảnh báo Z00.0
  const z000Warnings: ValidationWarning[] = [];
  const addedZ000Keys = new Set<string>();

  const registerZ000 = (w: ValidationWarning) => {
    const key = `${w.source}|${w.MA_LK}|${w.detailIndex}`;
    if (!addedZ000Keys.has(key)) {
      addedZ000Keys.add(key);
      z000Warnings.push(w);
    }
  };

  for (const w of xml1Warnings)
    if (w.message.includes("Z00.0") || w.message.includes("Z30.1")) registerZ000(w);
  for (const w of xml2Warnings)
    if (w.message.includes("Z00.0") || w.message.includes("Z30.1")) registerZ000(w);
  for (const w of xml3Warnings)
    if (w.message.includes("Z00.0") || w.message.includes("Z30.1")) registerZ000(w);
  for (const w of xml4Warnings)
    if (w.message.includes("Z00.0") || w.message.includes("Z30.1")) registerZ000(w);

  for (const dossier of dossierMap.values()) {
    for (const [tableType, tableData] of Object.entries(dossier.tables)) {
      const z000List = findZ000WarningsInRows(tableType, tableData.rows, sharedPatients);
      for (const zw of z000List) {
        const zKey = `${zw.source}|${zw.MA_LK}|${zw.detailIndex}|${zw.MA_DICH_VU}`;
        if (!addedZ000Keys.has(zKey)) {
          addedZ000Keys.add(zKey);
          z000Warnings.push(zw);
          registerWarning(zw);
          if (tableType === "XML1") xml1Warnings.push(zw);
          else if (tableType === "XML2") xml2Warnings.push(zw);
          else if (tableType === "XML3") xml3Warnings.push(zw);
          else if (tableType === "XML4") xml4Warnings.push(zw);
        }
      }
    }
  }

  // Gắn cảnh báo và bản ghi XML3 vào từng hồ sơ bệnh nhân
  for (const warning of allValidationWarnings) {
    const dossier = dossierMap.get(warning.MA_LK);
    if (dossier) {
      if (
        !dossier.warnings.some(
          (w) =>
            w.source === warning.source &&
            w.detailIndex === warning.detailIndex &&
            w.message === warning.message,
        )
      ) {
        dossier.warnings.push(warning);
        dossier.hasWarnings = true;
        dossier.warningCount++;
      }
    }
  }
  for (const record of allRecords) {
    const dossier = dossierMap.get(record.MA_LK);
    if (dossier) {
      dossier.xml3Records.push(record);
    }
  }

  const dossiers = Array.from(dossierMap.values());

  return {
    records: allRecords,
    warnings: allRecords.filter(isWarning),
    xml1Warnings,
    xml2Warnings,
    xml3Warnings,
    xml4Warnings,
    xml7Warnings,
    z000Warnings,
    allValidationWarnings,
    files: files.map((file) => file.name),
    errors: [...errors, ...logs],
    tableFiles,
    missingTimes: allRecords.filter((record) => record.status === "missing").length,
    invalidTimes: allRecords.filter((record) => record.status === "invalid").length,
    negativeTimes: allRecords.filter((record) => record.status === "negative").length,
    orderWarnings: allRecords.filter((record) => record.hasOrderWarning).length,
    bedWarnings: allRecords.filter((record) => record.hasBedWarning).length,
    ttThauWarnings: allRecords.filter((record) => record.hasTtThauWarning).length,
    maMayWarnings: allRecords.filter((record) => record.hasMaMayWarning).length,
    duplicateMachineWarnings: allRecords.filter((record) => record.hasDuplicateMachineWarning)
      .length,
    dossiers,
    dossierMap,
    patients: sharedPatients,
  };
}
