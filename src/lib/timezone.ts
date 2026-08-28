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
 * Trả về dạng hiển thị vi-VN; nếu không nhận ra thì giữ nguyên chuỗi gốc.
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

/** Chỉ phần ngày (dd/mm/yyyy) từ chuỗi XML BHYT. */
export function formatXmlDate(raw: string | undefined | null): string {
  const full = formatXmlDateTime(raw);
  if (!full) return "";
  return full.split(" ")[0] || full;
}
