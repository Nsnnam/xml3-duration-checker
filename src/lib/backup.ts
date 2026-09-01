import fileSaver from "file-saver";
import { formatTimestampForFilename } from "./timezone.ts";
import type { ServiceRule } from "./xml3-duration.ts";
import type { TelegramConfig } from "./telegram.ts";

const saveAs =
  typeof fileSaver === "function"
    ? fileSaver
    : (fileSaver as unknown as { saveAs: typeof fileSaver }).saveAs || fileSaver;

export type ColumnWidths = Record<string, number>;

export type FullAppConfig = {
  version: string;
  createdAt: string;
  type: "nsn_xmlcheck_full_config" | "nsn_xmlcheck_library";
  serviceRules: ServiceRule[];
  groupCodes: string[];
  telegramConfig?: TelegramConfig;
  columnWidths?: ColumnWidths;
  onlyWarnings?: boolean;
};

export function createLibraryBackupContent(rules: ServiceRule[]): string {
  const payload = {
    version: "1.7.0",
    type: "nsn_xmlcheck_library" as const,
    createdAt: new Date().toISOString(),
    itemCount: rules.length,
    serviceRules: rules,
  };
  return JSON.stringify(payload, null, 2);
}

export function createFullConfigBackupContent(config: {
  serviceRules: ServiceRule[];
  groupCodes: string[];
  telegramConfig?: TelegramConfig;
  columnWidths?: ColumnWidths;
  onlyWarnings?: boolean;
}): string {
  const payload: FullAppConfig = {
    version: "1.7.0",
    type: "nsn_xmlcheck_full_config",
    createdAt: new Date().toISOString(),
    serviceRules: config.serviceRules,
    groupCodes: config.groupCodes,
    telegramConfig: config.telegramConfig,
    columnWidths: config.columnWidths,
    onlyWarnings: config.onlyWarnings,
  };
  return JSON.stringify(payload, null, 2);
}

export function exportLibraryBackup(rules: ServiceRule[]): void {
  const json = createLibraryBackupContent(rules);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const filename = `${formatTimestampForFilename()}_backup_thu_vien_dvkt.json`;
  saveAs(blob, filename);
}

export function exportFullConfigBackup(config: {
  serviceRules: ServiceRule[];
  groupCodes: string[];
  telegramConfig?: TelegramConfig;
  columnWidths?: ColumnWidths;
  onlyWarnings?: boolean;
}): void {
  const json = createFullConfigBackupContent(config);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const filename = `${formatTimestampForFilename()}_backup_cau_hinh_toan_trang.json`;
  saveAs(blob, filename);
}

export type ParsedBackupResult =
  | {
      type: "library";
      serviceRules: ServiceRule[];
      createdAt?: string;
      itemCount: number;
    }
  | {
      type: "full";
      serviceRules: ServiceRule[];
      groupCodes?: string[];
      telegramConfig?: TelegramConfig;
      columnWidths?: ColumnWidths;
      onlyWarnings?: boolean;
      createdAt?: string;
      itemCount: number;
    };

export function parseBackupJson(content: string): ParsedBackupResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("File không đúng định dạng JSON.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Cấu trúc file backup không hợp lệ.");
  }

  const record = parsed as Record<string, unknown>;

  // Handle direct array of rules or wrapped object
  let rawRules: unknown[] = [];
  if (Array.isArray(parsed)) {
    rawRules = parsed;
  } else if (Array.isArray(record.serviceRules)) {
    rawRules = record.serviceRules;
  } else if (Array.isArray(record.rules)) {
    rawRules = record.rules;
  }

  const validRules: ServiceRule[] = rawRules
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) &&
        typeof (item as Record<string, unknown>).MA_DICH_VU === "string" &&
        ((item as Record<string, unknown>).MA_DICH_VU as string).trim().length > 0 &&
        ((item as Record<string, unknown>).maxMinutes === null ||
          (typeof (item as Record<string, unknown>).maxMinutes === "number" &&
            Number.isFinite((item as Record<string, unknown>).maxMinutes as number) &&
            ((item as Record<string, unknown>).maxMinutes as number) >= 0)),
    )
    .map((item) => ({
      MA_DICH_VU: String(item.MA_DICH_VU).trim(),
      TEN_DICH_VU: typeof item.TEN_DICH_VU === "string" ? item.TEN_DICH_VU.trim() : "",
      maxMinutes: item.maxMinutes === null ? null : Number(item.maxMinutes),
    }));

  if (record.type === "nsn_xmlcheck_full_config" || record.groupCodes || record.telegramConfig) {
    const rawTg = record.telegramConfig as Record<string, unknown> | undefined;
    return {
      type: "full",
      serviceRules: validRules,
      groupCodes: Array.isArray(record.groupCodes) ? record.groupCodes.map(String) : undefined,
      telegramConfig:
        rawTg && typeof rawTg === "object"
          ? {
              botToken: String(rawTg.botToken || ""),
              chatId: String(rawTg.chatId || ""),
              enabled: Boolean(rawTg.enabled),
              autoSendOnAnalysis: Boolean(rawTg.autoSendOnAnalysis),
            }
          : undefined,
      columnWidths:
        record.columnWidths && typeof record.columnWidths === "object"
          ? (record.columnWidths as ColumnWidths)
          : undefined,
      onlyWarnings: typeof record.onlyWarnings === "boolean" ? record.onlyWarnings : undefined,
      createdAt: typeof record.createdAt === "string" ? record.createdAt : undefined,
      itemCount: validRules.length,
    };
  }

  return {
    type: "library",
    serviceRules: validRules,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : undefined,
    itemCount: validRules.length,
  };
}
