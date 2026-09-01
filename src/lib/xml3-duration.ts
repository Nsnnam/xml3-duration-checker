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
  maxMinutes: number | null;
};

export type DrugRule = {
  MA_THUOC: string;
  TEN_THUOC: string;
  excluded: boolean;
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
  durationMinutes: number | null;
  serviceRule?: ServiceRule;
  hasOrderWarning: boolean;
  hasEqualWarning: boolean;
  hasBedWarning: boolean;
  hasTtThauWarning: boolean;
  orderIssues: string[];
  status:
    | "warning"
    | "order-warning"
    | "equal-warning"
    | "bed-warning"
    | "tt-thau-warning"
    | "ok"
    | "missing"
    | "invalid"
    | "negative";
  detail: string;
};

export type WarningSource = "XML1" | "XML2" | "XML3" | "XML4";

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
};

export type Xml4Record = {
  fileName: string;
  MA_LK: string;
  STT: string;
  MA_DICH_VU: string;
  NGAY_KQ: string;
  KET_LUAN: string;
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
  missingTimes: number;
  invalidTimes: number;
  negativeTimes: number;
  orderWarnings: number;
  bedWarnings: number;
  ttThauWarnings: number;
  log: string[];
};

export type BatchAnalysis = {
  records: Xml3Record[];
  warnings: Xml3Record[];
  xml1Warnings: ValidationWarning[];
  xml2Warnings: ValidationWarning[];
  xml3Warnings: ValidationWarning[];
  xml4Warnings: ValidationWarning[];
  files: string[];
  errors: string[];
  tableFiles: number;
  missingTimes: number;
  invalidTimes: number;
  negativeTimes: number;
  orderWarnings: number;
  bedWarnings: number;
  ttThauWarnings: number;
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

export type PatientInfo = { MA_LK: string; MA_BN: string; HO_TEN: string };

export function withPatientInfo(
  record: Xml3Record,
  patients: ReadonlyMap<string, PatientInfo>,
): Xml3Record {
  const patient = patients.get(record.MA_LK);
  return { ...record, MA_BN: patient?.MA_BN ?? "", HO_TEN: patient?.HO_TEN ?? "" };
}

function directTextOf(parent: Element, tag: string): string {
  return (
    Array.from(parent.children)
      .find((child) => child.tagName.toUpperCase() === tag.toUpperCase())
      ?.textContent?.trim() ?? ""
  );
}

function readXml1Patients(doc: Document): Map<string, PatientInfo> {
  const patients = new Map<string, PatientInfo>();
  for (const node of Array.from(doc.getElementsByTagName("*"))) {
    const patient = {
      MA_LK: directTextOf(node, "MA_LK") || textOfGeneral(node, "MA_LK"),
      MA_BN: directTextOf(node, "MA_BN") || textOfGeneral(node, "MA_BN"),
      HO_TEN: directTextOf(node, "HO_TEN") || textOfGeneral(node, "HO_TEN"),
    };
    if (patient.MA_LK && (patient.MA_BN || patient.HO_TEN)) patients.set(patient.MA_LK, patient);
  }
  return patients;
}

function readXml1Warnings(doc: Document): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const rows = Array.from(doc.getElementsByTagName("*"))
    .filter((node) => directTextOf(node, "MA_LK"))
    .map((node, index) => ({ node, detailIndex: index + 1 }));

  rows.forEach(({ node, detailIndex }) => {
    const value = directTextOf(node, "SO_CCCD") || textOfGeneral(node, "SO_CCCD");
    const maDkbd = directTextOf(node, "MA_DKBD") || textOfGeneral(node, "MA_DKBD");
    const maCskcb = directTextOf(node, "MA_CSKCB") || textOfGeneral(node, "MA_CSKCB");
    const maDoiTuong =
      directTextOf(node, "MA_DOITUONG_KCB") || textOfGeneral(node, "MA_DOITUONG_KCB");
    const maLk = directTextOf(node, "MA_LK") || textOfGeneral(node, "MA_LK");
    const hoTen = directTextOf(node, "HO_TEN") || textOfGeneral(node, "HO_TEN");
    const maBn = directTextOf(node, "MA_BN") || textOfGeneral(node, "MA_BN");

    const base = {
      source: "XML1" as const,
      detailIndex,
      MA_LK: maLk,
      HO_TEN: hoTen,
      MA_BN: maBn,
      MA_DICH_VU: "",
      TEN_DICH_VU: "",
    };
    if (value && !/^\d{9,12}$/.test(value)) {
      warnings.push({
        ...base,
        message: `XML 1. Chi tiết thứ ${detailIndex}: SO_CCCD không đúng định dạng. Giá trị sai: ${value}`,
      });
    }
    if (maDkbd && maCskcb && maDkbd === maCskcb && maDoiTuong !== "1.1") {
      warnings.push({
        ...base,
        message: `XML 1. Chi tiết thứ ${detailIndex}: MA_DKBD phải khác MA_CSKCB cho đối tượng khác 1.1`,
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
    if (cleanMaThuoc && drugRuleMap.get(cleanMaThuoc)?.excluded) {
      return; // Bỏ qua cảnh báo cho thuốc này
    }

    // Kiểm tra XML2 cột 15 TT_THAU bắt buộc không được để rỗng (null)
    if (!ttThau || !ttThau.trim()) {
      warnings.push({
        source: "XML2",
        detailIndex,
        MA_LK: maLk,
        HO_TEN: patient?.HO_TEN || "",
        MA_BN: patient?.MA_BN || "",
        MA_DICH_VU: maThuoc,
        TEN_DICH_VU: tenThuoc,
        message: `XML2. Chi tiết thứ ${detailIndex}: Thiếu thông tin TT_THAU`,
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
    }));
}

function createXml4Warnings(
  xml3Records: Xml3Record[],
  xml4Records: Xml4Record[],
  patients: ReadonlyMap<string, PatientInfo>,
): ValidationWarning[] {
  return xml4Records.flatMap((xml4, index) => {
    if (xml4.NGAY_KQ.trim() && xml4.KET_LUAN.trim()) return [];
    const match = xml3Records.find(
      (xml3) =>
        xml3.MA_NHOM.trim() === "2" &&
        xml3.MA_LK === xml4.MA_LK &&
        xml3.MA_DICH_VU === xml4.MA_DICH_VU,
    );
    if (!match) return [];
    const patient = patients.get(match.MA_LK);
    return [
      {
        source: "XML4" as const,
        detailIndex: index + 1,
        MA_LK: match.MA_LK,
        HO_TEN: match.HO_TEN || patient?.HO_TEN || "",
        MA_BN: match.MA_BN || patient?.MA_BN || "",
        MA_DICH_VU: match.MA_DICH_VU,
        TEN_DICH_VU: match.TEN_DICH_VU || match.TEN_VAT_TU || "",
        message: `XML 4. Chi tiết thứ ${index + 1}: Thiếu thông tin KET_LUAN khi XML3 MA_NHOM = 2. Mã dịch vụ: ${match.MA_DICH_VU || "—"}. Tên dịch vụ: ${match.TEN_DICH_VU || match.TEN_VAT_TU || "—"}`,
      },
    ];
  });
}

function readXml3Records(
  doc: Document,
  fileName: string,
  patients: Map<string, PatientInfo>,
  serviceRules: ReadonlyMap<string, ServiceRule>,
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
    const fields = Object.fromEntries(
      XML3_FIELDS.map((field) => [field, textOf(item, field) || directTextOf(item, field)]),
    ) as Record<Xml3Field, string>;
    const record = evaluateRecord(fields, fileName, serviceRules);
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

function addBedWarnings(records: Xml3Record[]): Xml3Record[] {
  const groups = new Map<string, Xml3Record[]>();
  for (const record of records) {
    if (!record.MA_GIUONG) continue;
    const date = parseXmlDateTime(record.NGAY_TH_YL) ?? parseXmlDateTime(record.NGAY_KQ);
    if (!date) continue;
    const day = date.toISOString().slice(0, 10);
    const key = `${record.MA_LK}|${record.MA_BN}|${day}`;
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  const flagged = new Set<Xml3Record>();
  for (const rows of groups.values()) {
    if (rows.length <= 1) continue;
    for (const row of rows) flagged.add(row);
  }
  return records.map((record) => {
    if (!flagged.has(record)) return record;
    const detailIndex = record.STT || "xx";
    const message = `XML3. Chi tiết thứ ${detailIndex}: Số lượng giường trong ngày lớn hơn 01.`;
    return {
      ...record,
      hasBedWarning: true,
      status: record.status === "ok" ? "bed-warning" : record.status,
      detail: record.detail ? `${record.detail} · ${message}` : message,
    };
  });
}

function chronologyIssues(fields: Record<Xml3Field, string>): string[] {
  return getChronologyIssues(fields.NGAY_YL, fields.NGAY_TH_YL, fields.NGAY_KQ);
}

export function evaluateRecord(
  fields: Record<Xml3Field, string>,
  fileName: string,
  serviceRules: ReadonlyMap<string, ServiceRule> = new Map(),
): Xml3Record {
  const durationMinutes = minutesBetween(fields.NGAY_TH_YL, fields.NGAY_KQ);
  const serviceRule = serviceRules.get(fields.MA_DICH_VU.trim());
  const durationLimit = serviceRule?.maxMinutes ?? DURATION_LIMIT_MINUTES;
  const orderIssues = chronologyIssues(fields);
  const hasOrderWarning = orderIssues.some((issue) => issue.includes("sớm hơn"));
  const hasEqualWarning = orderIssues.some((issue) => issue.includes("="));

  const groupCode = fields.MA_NHOM.trim();
  const isGroup10Or11 = groupCode === "10" || groupCode === "11";
  const hasTtThauWarning = isGroup10Or11 && (!fields.TT_THAU || !fields.TT_THAU.trim());

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
  } else if (durationMinutes > durationLimit) {
    status = "warning";
    details.push(
      `Vượt ${formatMinutes(durationMinutes - durationLimit)} phút so với ngưỡng ${durationLimit} phút`,
    );
  } else {
    details.push(`Trong ngưỡng ${durationLimit} phút`);
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

  return {
    ...fields,
    MA_BN: "",
    HO_TEN: "",
    fileName,
    table: "XML3",
    durationMinutes,
    serviceRule,
    hasOrderWarning,
    hasEqualWarning,
    hasBedWarning: false,
    hasTtThauWarning,
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
    record.hasOrderWarning ||
    record.hasEqualWarning ||
    record.hasBedWarning ||
    record.hasTtThauWarning
  );
}

function toXml3Warning(record: Xml3Record, index: number): ValidationWarning {
  return {
    source: "XML3",
    detailIndex: Number(record.STT) || index + 1,
    MA_LK: record.MA_LK,
    HO_TEN: record.HO_TEN,
    MA_BN: record.MA_BN,
    MA_DICH_VU: record.MA_DICH_VU || record.MA_VAT_TU,
    TEN_DICH_VU: record.TEN_DICH_VU || record.TEN_VAT_TU,
    message: record.detail,
    record,
  };
}

function decodeFileContent(content: string, label: string): Document {
  const value = content.trim();
  if (!value) throw new Error(`${label}: thiếu NOIDUNGFILE`);
  const decoded = value.startsWith("<") ? value : base64ToUtf8(value);
  return parseXml(decoded, label);
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
  for (const fileNode of Array.from(outer.getElementsByTagName("FILEHOSO"))) {
    const type = fileNode.getElementsByTagName("LOAIHOSO")[0]?.textContent?.trim() ?? "";
    if (type !== "XML1") continue;
    const content = fileNode.getElementsByTagName("NOIDUNGFILE")[0]?.textContent ?? "";
    const inner = decodeFileContent(content, `${file.name} XML1`);
    for (const [maLk, patient] of readXml1Patients(inner)) patients.set(maLk, patient);
  }
  return patients;
}

export async function analyzeXml3File(
  file: File,
  sharedPatients = new Map<string, PatientInfo>(),
  serviceRules: ReadonlyMap<string, ServiceRule> = new Map(),
  drugRules: ReadonlyMap<string, DrugRule> = new Map(),
): Promise<Xml3Analysis> {
  const text = await file.text();
  const outer = parseXml(text, file.name);
  const rawRecords: Xml3Record[] = [];
  const xml1Warnings: ValidationWarning[] = [];
  const xml2Warnings: ValidationWarning[] = [];
  const xml4Records: Xml4Record[] = [];
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
      xml1Warnings.push(...readXml1Warnings(inner));
    }
    if (type === "XML2") {
      const inner = decodeFileContent(content, `${file.name} XML2`);
      xml2Warnings.push(...readXml2Warnings(inner, patients, drugRules));
    }
    if (type === "XML4") {
      const inner = decodeFileContent(content, `${file.name} XML4`);
      xml4Records.push(...readXml4Records(inner, file.name));
    }
  }

  for (const fileNode of fileNodes) {
    const type = fileNode.getElementsByTagName("LOAIHOSO")[0]?.textContent?.trim() ?? "";
    if (type !== "XML3") continue;
    tableFiles++;
    const content = fileNode.getElementsByTagName("NOIDUNGFILE")[0]?.textContent ?? "";
    const inner = decodeFileContent(content, `${file.name} XML3`);
    rawRecords.push(...readXml3Records(inner, file.name, patients, serviceRules));
  }

  if (!fileNodes.length && outer.getElementsByTagName("CHI_TIET_DVKT").length) {
    tableFiles = 1;
    rawRecords.push(...readXml3Records(outer, file.name, patients, serviceRules));
  }
  if (!fileNodes.length && outer.getElementsByTagName("CHI_TIET_THUOC").length) {
    xml2Warnings.push(...readXml2Warnings(outer, patients, drugRules));
  }

  const hasOtherXml = fileNodes.some((fileNode) => {
    const type = fileNode.getElementsByTagName("LOAIHOSO")[0]?.textContent?.trim() ?? "";
    return type === "XML1" || type === "XML2" || type === "XML4";
  });
  if (!tableFiles && !hasOtherXml)
    throw new Error(`${file.name}: không tìm thấy FILEHOSO có LOAIHOSO=XML3`);

  const records = addBedWarnings(rawRecords);
  const warnings = records.filter(isWarning);
  const xml3Warnings = warnings.map(toXml3Warning);
  const xml4Warnings = createXml4Warnings(records, xml4Records, patients);
  const missingTimes = records.filter((record) => record.status === "missing").length;
  const invalidTimes = records.filter((record) => record.status === "invalid").length;
  const negativeTimes = records.filter((record) => record.status === "negative").length;
  const orderWarnings = records.filter((record) => record.hasOrderWarning).length;
  const bedWarnings = records.filter((record) => record.hasBedWarning).length;
  const ttThauWarnings = records.filter((record) => record.hasTtThauWarning).length;

  log.push(
    `XML3: ${records.length} dòng; cảnh báo: ${warnings.length}; thứ tự: ${orderWarnings}; giường: ${bedWarnings}; TT_THAU (nhóm 10/11): ${ttThauWarnings}; XML1: ${xml1Warnings.length}; XML2: ${xml2Warnings.length}; XML4: ${xml4Warnings.length}; thiếu thời gian: ${missingTimes}; không hợp lệ: ${invalidTimes}; âm: ${negativeTimes}`,
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
    missingTimes,
    invalidTimes,
    negativeTimes,
    orderWarnings,
    bedWarnings,
    ttThauWarnings,
    log,
  };
}

export async function analyzeXml3Files(
  files: File[],
  serviceRules: ReadonlyArray<ServiceRule> = [],
  drugRules: ReadonlyArray<DrugRule> = [],
): Promise<BatchAnalysis> {
  const allRecords: Xml3Record[] = [];
  const errors: string[] = [];
  const logs: string[] = [];
  let tableFiles = 0;
  const sharedPatients = new Map<string, PatientInfo>();
  const serviceRuleMap = new Map(serviceRules.map((rule) => [rule.MA_DICH_VU.trim(), rule]));
  const drugRuleMap = new Map(drugRules.map((rule) => [rule.MA_THUOC.trim().toUpperCase(), rule]));
  const xml1Warnings: ValidationWarning[] = [];
  const xml2Warnings: ValidationWarning[] = [];
  const xml3Warnings: ValidationWarning[] = [];
  const xml4Records: Xml4Record[] = [];

  for (const file of files) {
    try {
      for (const [maLk, patient] of await collectXml1Patients(file))
        sharedPatients.set(maLk, patient);
      xml4Records.push(...(await collectXml4Records(file)));
    } catch {
      // The normal analysis pass below records the user-facing file error.
    }
  }

  for (const file of files) {
    try {
      const analysis = await analyzeXml3File(file, sharedPatients, serviceRuleMap, drugRuleMap);
      allRecords.push(...analysis.records);
      tableFiles += analysis.tableFiles;
      xml1Warnings.push(...analysis.xml1Warnings);
      xml2Warnings.push(...analysis.xml2Warnings);
      xml3Warnings.push(...analysis.xml3Warnings);
      logs.push(...analysis.log);
    } catch (error) {
      errors.push(`[${file.name}] ${(error as Error).message}`);
    }
  }

  return {
    records: allRecords,
    warnings: allRecords.filter(isWarning),
    xml1Warnings,
    xml2Warnings,
    xml3Warnings,
    xml4Warnings: createXml4Warnings(allRecords, xml4Records, sharedPatients),
    files: files.map((file) => file.name),
    errors: [...errors, ...logs],
    tableFiles,
    missingTimes: allRecords.filter((record) => record.status === "missing").length,
    invalidTimes: allRecords.filter((record) => record.status === "invalid").length,
    negativeTimes: allRecords.filter((record) => record.status === "negative").length,
    orderWarnings: allRecords.filter((record) => record.hasOrderWarning).length,
    bedWarnings: allRecords.filter((record) => record.hasBedWarning).length,
    ttThauWarnings: allRecords.filter((record) => record.hasTtThauWarning).length,
  };
}
