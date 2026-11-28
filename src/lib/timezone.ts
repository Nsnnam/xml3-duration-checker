/**
 * Múi giờ chuẩn của ứng dụng: Việt Nam (GMT+7 / Asia/Ho_Chi_Minh).
 * Dùng khi đặt tên file log/export hoặc hiển thị timestamp — không phụ thuộc
 * múi giờ máy local hay UTC thuần (toISOString).
 */
export const APP_TIMEZONE = "Asia/Ho_Chi_Minh";
export const APP_GMT_OFFSET = 7;
export const APP_GMT_LABEL = "GMT+7";

export interface AppDateTimeParts {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** Thành phần ngày-giờ theo GMT+7. */
export function nowPartsInAppTz(date: Date = new Date()): AppDateTimeParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** Chuỗi ngày giờ hiển thị (vi-VN, GMT+7). */
export function formatNowVi(date: Date = new Date()): string {
  return date.toLocaleString("vi-VN", { timeZone: APP_TIMEZONE });
}

/** Timestamp an toàn cho tên file: yyyyMMdd-HHmmss (GMT+7). */
export function formatTimestampForFilename(date: Date = new Date()): string {
  const p = nowPartsInAppTz(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}${pad(p.month)}${pad(p.day)}-${pad(p.hour)}${pad(p.minute)}${pad(p.second)}`;
}

/**
 * Định dạng ngày/giờ XML BHYT (thường YYYYMMDD, YYYYMMDDHHmm hoặc YYYYMMDDHHmmss).
 * Trả về dạng hiển thị DD/MM/YYYY HH:mm; nếu không nhận ra thì giữ nguyên chuỗi gốc.
 */
export function formatXmlDateTime(raw: string | undefined | null): string {
  if (!raw) return "";
  const s = String(raw).trim();
  if (!s) return "";
  // Đã có dấu phân cách (ISO / dd/mm/yyyy…)
  if (/[-/T:\s]/.test(s) && !/^\d{8,14}$/.test(s)) return s;
  const digits = s.replace(/\D/g, "");
  if (digits.length < 8) return s;
  const y = digits.slice(0, 4);
  const m = digits.slice(4, 6);
  const d = digits.slice(6, 8);
  if (digits.length >= 12) {
    const hh = digits.slice(8, 10);
    const mm = digits.slice(10, 12);
    if (digits.length >= 14) {
      const ss = digits.slice(12, 14);
      return `${d}/${m}/${y} ${hh}:${mm}:${ss}`;
    }
    return `${d}/${m}/${y} ${hh}:${mm}`;
  }
  return `${d}/${m}/${y}`;
}

/** Chỉ phần ngày (DD/MM/YYYY) từ chuỗi XML BHYT. */
export function formatXmlDate(raw: string | undefined | null): string {
  const full = formatXmlDateTime(raw);
  if (!full) return "";
  return full.split(" ")[0] || full;
}

/**
 * Loại bỏ dấu tiếng Việt chuẩn xác (hỗ trợ cả Unicode dựng sẵn NFC và tổ hợp NFD).
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/**
 * So khớp văn bản thông minh tiếng Việt:
 * - Chuẩn hóa NFC/NFD tự động
 * - Không phân biệt chữ hoa/thường
 * - Hỗ trợ gõ tiếng Việt có dấu, không dấu
 * - Hỗ trợ tìm kiếm nhiều từ (tokenized multi-word) không cần đúng thứ tự
 * - Bỏ qua ký tự phân cách (như dấu gạch ngang: x-quang vs xquang)
 * - Nhận diện "trống" / "rỗng" / "empty"
 */
export function matchesTextFilter(text: string | null | undefined, query: string): boolean {
  if (!query) return true;
  const qClean = query.trim().normalize("NFC").toLowerCase();
  if (!qClean) return true;

  if (qClean === "trống" || qClean === "rỗng" || qClean === "empty") {
    return !text || text.trim() === "" || text.trim() === "—";
  }

  if (!text) return false;
  const tNormNFC = text.normalize("NFC").toLowerCase();
  if (tNormNFC.includes(qClean)) return true;

  // Hỗ trợ tìm kiếm theo nhiều từ (tokenized) có dấu: ví dụ "nguyễn thoa", "giường nội", "x quang"
  const words = qClean.split(/\s+/).filter(Boolean);
  if (words.length > 1 && words.every((w) => tNormNFC.includes(w))) {
    return true;
  }

  // Hỗ trợ tìm kiếm tiếng Việt không dấu (loại bỏ dấu hoàn toàn cả chữ hoa lẫn chữ thường)
  const tUnaccented = removeVietnameseTones(tNormNFC);
  const qUnaccented = removeVietnameseTones(qClean);
  if (tUnaccented.includes(qUnaccented)) return true;

  // Hỗ trợ tìm kiếm tiếng Việt không dấu theo từng từ
  const unaccentedWords = words.map(removeVietnameseTones).filter(Boolean);
  if (unaccentedWords.length > 0 && unaccentedWords.every((w) => tUnaccented.includes(w))) {
    return true;
  }

  // Hỗ trợ bỏ qua ký tự phân cách (như dấu gạch ngang, dấu chấm, dấu phẩy: ví dụ "x-quang" vs "xquang")
  const tCompact = tUnaccented.replace(/[^a-z0-9]/g, "");
  const qCompact = qUnaccented.replace(/[^a-z0-9]/g, "");
  if (qCompact.length >= 3 && tCompact.includes(qCompact)) {
    return true;
  }

  return false;
}
