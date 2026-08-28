export const DURATION_LIMIT_MINUTES = 70;
export const DEFAULT_GROUP_CODES = ["2", "3", "8", "18"] as const;

export type Xml3Record = {
  fileName: string;
  table: "XML3";
  MA_LK: string;
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
  durationMinutes: number | null;
  hasOrderWarning: boolean;
  orderIssues: string[];
  status: "warning" | "order-warning" | "ok" | "missing" | "invalid" | "negative";
  detail: string;
};

export type Xml3Analysis = {
  fileName: string;
  tableFiles: number;
  records: Xml3Record[];
  warnings: Xml3Record[];
  missingTimes: number;
  invalidTimes: number;
  negativeTimes: number;
  orderWarnings: number;
  log: string[];
};

export type BatchAnalysis = {
  records: Xml3Record[];
  warnings: Xml3Record[];
  files: string[];
  errors: string[];
  tableFiles: number;
  missingTimes: number;
  invalidTimes: number;
  negativeTimes: number;
  orderWarnings: number;
};

const XML3_FIELDS = [
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

function readXml3Records(doc: Document, fileName: string): Xml3Record[] {
  return Array.from(doc.getElementsByTagName("CHI_TIET_DVKT"), (item) => {
    const fields = Object.fromEntries(
      XML3_FIELDS.map((field) => [field, textOf(item, field)]),
    ) as Record<Xml3Field, string>;
    return evaluateRecord(fields, fileName);
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
  return order
    .filter(([, startRaw, , endRaw]) => {
      const start = parseXmlDateTime(startRaw);
      const end = parseXmlDateTime(endRaw);
      return Boolean(start && end && end.getTime() < start.getTime());
    })
    .map(([startName, , endName]) => `${endName} sớm hơn ${startName}`);
}

function chronologyIssues(fields: Record<Xml3Field, string>): string[] {
  return getChronologyIssues(fields.NGAY_YL, fields.NGAY_TH_YL, fields.NGAY_KQ);
}

function evaluateRecord(fields: Record<Xml3Field, string>, fileName: string): Xml3Record {
  const durationMinutes = minutesBetween(fields.NGAY_TH_YL, fields.NGAY_KQ);
  const orderIssues = chronologyIssues(fields);
  const hasOrderWarning = orderIssues.length > 0;
  let status: Xml3Record["status"] = "ok";
  const details: string[] = [];

  if (!fields.NGAY_YL || !fields.NGAY_TH_YL || !fields.NGAY_KQ) {
    status = "missing";
    details.push("Thiếu NGAY_YL, NGAY_TH_YL hoặc NGAY_KQ");
  } else if (durationMinutes === null) {
    status = "invalid";
    details.push("Không đọc được định dạng thời gian");
  } else if (durationMinutes < 0) {
    status = "negative";
    details.push("NGAY_KQ sớm hơn NGAY_TH_YL");
  } else if (durationMinutes > DURATION_LIMIT_MINUTES) {
    status = "warning";
    details.push(
      `Vượt ${formatMinutes(durationMinutes - DURATION_LIMIT_MINUTES)} phút so với ngưỡng`,
    );
  } else {
    details.push(`Trong ngưỡng ${DURATION_LIMIT_MINUTES} phút`);
  }

  if (hasOrderWarning) {
    if (status === "ok") status = "order-warning";
    details.unshift(`Kiểm tra thứ tự: ${orderIssues.join("; ")}`);
  }

  return {
    ...fields,
    fileName,
    table: "XML3",
    durationMinutes,
    hasOrderWarning,
    orderIssues,
    status,
    detail: details.join(" · "),
  };
}

function formatMinutes(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function isWarning(record: Xml3Record): boolean {
  return record.status === "warning" || record.hasOrderWarning;
}

function decodeFileContent(content: string, label: string): Document {
  const value = content.trim();
  if (!value) throw new Error(`${label}: thiếu NOIDUNGFILE`);
  const decoded = value.startsWith("<") ? value : base64ToUtf8(value);
  return parseXml(decoded, label);
}

export async function analyzeXml3File(file: File): Promise<Xml3Analysis> {
  const text = await file.text();
  const outer = parseXml(text, file.name);
  const records: Xml3Record[] = [];
  let tableFiles = 0;
  const log: string[] = [`[${file.name}] Bắt đầu đọc XML chứa 15 bảng`];
  const fileNodes = Array.from(outer.getElementsByTagName("FILEHOSO"));

  for (const fileNode of fileNodes) {
    const type = fileNode.getElementsByTagName("LOAIHOSO")[0]?.textContent?.trim() ?? "";
    if (type !== "XML3") continue;
    tableFiles++;
    const content = fileNode.getElementsByTagName("NOIDUNGFILE")[0]?.textContent ?? "";
    const inner = decodeFileContent(content, `${file.name} XML3`);
    records.push(...readXml3Records(inner, file.name));
  }

  if (!fileNodes.length && outer.getElementsByTagName("CHI_TIET_DVKT").length) {
    tableFiles = 1;
    records.push(...readXml3Records(outer, file.name));
  }
  if (!tableFiles) throw new Error(`${file.name}: không tìm thấy FILEHOSO có LOAIHOSO=XML3`);

  const warnings = records.filter(isWarning);
  const missingTimes = records.filter((record) => record.status === "missing").length;
  const invalidTimes = records.filter((record) => record.status === "invalid").length;
  const negativeTimes = records.filter((record) => record.status === "negative").length;
  const orderWarnings = records.filter((record) => record.hasOrderWarning).length;
  log.push(
    `XML3: ${records.length} dòng; cảnh báo nhóm/thời gian: ${warnings.length}; thứ tự thời gian: ${orderWarnings}; thiếu thời gian: ${missingTimes}; không hợp lệ: ${invalidTimes}; âm: ${negativeTimes}`,
  );
  return {
    fileName: file.name,
    tableFiles,
    records,
    warnings,
    missingTimes,
    invalidTimes,
    negativeTimes,
    orderWarnings,
    log,
  };
}

export async function analyzeXml3Files(files: File[]): Promise<BatchAnalysis> {
  const allRecords: Xml3Record[] = [];
  const errors: string[] = [];
  const logs: string[] = [];
  let tableFiles = 0;
  for (const file of files) {
    try {
      const analysis = await analyzeXml3File(file);
      allRecords.push(...analysis.records);
      tableFiles += analysis.tableFiles;
      logs.push(...analysis.log);
    } catch (error) {
      errors.push(`[${file.name}] ${(error as Error).message}`);
    }
  }
  return {
    records: allRecords,
    warnings: allRecords.filter(isWarning),
    files: files.map((file) => file.name),
    errors: [...errors, ...logs],
    tableFiles,
    missingTimes: allRecords.filter((record) => record.status === "missing").length,
    invalidTimes: allRecords.filter((record) => record.status === "invalid").length,
    negativeTimes: allRecords.filter((record) => record.status === "negative").length,
    orderWarnings: allRecords.filter((record) => record.hasOrderWarning).length,
  };
}
