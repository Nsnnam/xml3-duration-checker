import fileSaver from "file-saver";
import { formatTimestampForFilename } from "./timezone.ts";
import type { ServiceRule, DrugRule } from "./xml3-duration.ts";
import type { TelegramConfig } from "./telegram.ts";

const saveAs =
  typeof fileSaver === "function"
    ? fileSaver
    : (fileSaver as unknown as { saveAs: typeof fileSaver }).saveAs || fileSaver;

export type ColumnWidths = Record<string, number>;

export type TabColumnState = {
  widths: Record<string, number>;
  visible: Record<string, boolean>;
};

export type AllTabsColumnConfig = Record<string, TabColumnState>;

export type FullAppConfig = {
  version: string;
  createdAt: string;
  type: "nsn_xmlcheck_full_config" | "nsn_xmlcheck_library";
  serviceRules: ServiceRule[];
  drugRules?: DrugRule[];
  groupCodes?: string[];
  telegramConfig?: TelegramConfig;
  columnWidths?: ColumnWidths;
  columnsConfig?: AllTabsColumnConfig;
  onlyWarnings?: boolean;
};

export function createLibraryBackupContent(
  serviceRules: ServiceRule[],
  drugRules: DrugRule[] = [],
): string {
  const payload = {
    version: "1.8.0",
    type: "nsn_xmlcheck_library" as const,
    createdAt: new Date().toISOString(),
    serviceItemCount: serviceRules.length,
    drugItemCount: drugRules.length,
    totalItemCount: serviceRules.length + drugRules.length,
    serviceRules,
    drugRules,
  };
  return JSON.stringify(payload, null, 2);
}

export function createFullConfigBackupContent(config: {
  serviceRules: ServiceRule[];
  drugRules?: DrugRule[];
  groupCodes: string[];
  telegramConfig?: TelegramConfig;
  columnWidths?: ColumnWidths;
  columnsConfig?: AllTabsColumnConfig;
  onlyWarnings?: boolean;
}): string {
  const payload: FullAppConfig = {
    version: "1.8.0",
    type: "nsn_xmlcheck_full_config",
    createdAt: new Date().toISOString(),
    serviceRules: config.serviceRules,
    drugRules: config.drugRules ?? [],
    groupCodes: config.groupCodes,
    telegramConfig: config.telegramConfig,
    columnWidths: config.columnWidths,
    columnsConfig: config.columnsConfig,
    onlyWarnings: config.onlyWarnings,
  };
  return JSON.stringify(payload, null, 2);
}

export function exportLibraryBackup(serviceRules: ServiceRule[], drugRules: DrugRule[] = []): void {
  const json = createLibraryBackupContent(serviceRules, drugRules);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const filename = `${formatTimestampForFilename()}_backup_thu_vien_dvkt_thuoc.json`;
  saveAs(blob, filename);
}

export function exportFullConfigBackup(config: {
  serviceRules: ServiceRule[];
  drugRules?: DrugRule[];
  groupCodes: string[];
  telegramConfig?: TelegramConfig;
  columnWidths?: ColumnWidths;
  columnsConfig?: AllTabsColumnConfig;
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
      drugRules: DrugRule[];
      createdAt?: string;
      itemCount: number;
    }
  | {
      type: "full";
      serviceRules: ServiceRule[];
      drugRules: DrugRule[];
      groupCodes?: string[];
      telegramConfig?: TelegramConfig;
      columnWidths?: ColumnWidths;
      columnsConfig?: AllTabsColumnConfig;
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

  // Parse Service Rules
  let rawServiceRules: unknown[] = [];
  if (Array.isArray(parsed)) {
    rawServiceRules = parsed;
  } else if (Array.isArray(record.serviceRules)) {
    rawServiceRules = record.serviceRules;
  } else if (Array.isArray(record.rules)) {
    rawServiceRules = record.rules;
  }

  const validServiceRules: ServiceRule[] = rawServiceRules
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

  // Parse Drug Rules
  let rawDrugRules: unknown[] = [];
  if (Array.isArray(record.drugRules)) {
    rawDrugRules = record.drugRules;
  }

  const validDrugRules: DrugRule[] = rawDrugRules
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) &&
        typeof (item as Record<string, unknown>).MA_THUOC === "string" &&
        ((item as Record<string, unknown>).MA_THUOC as string).trim().length > 0,
    )
    .map((item) => ({
      MA_THUOC: String(item.MA_THUOC).trim(),
      TEN_THUOC: typeof item.TEN_THUOC === "string" ? item.TEN_THUOC.trim() : "",
      excluded: Boolean(item.excluded ?? true),
    }));

  if (record.type === "nsn_xmlcheck_full_config" || record.groupCodes || record.telegramConfig) {
    const rawTg = record.telegramConfig as Record<string, unknown> | undefined;
    return {
      type: "full",
      serviceRules: validServiceRules,
      drugRules: validDrugRules,
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
      columnsConfig:
        record.columnsConfig && typeof record.columnsConfig === "object"
          ? (record.columnsConfig as AllTabsColumnConfig)
          : undefined,
      onlyWarnings: typeof record.onlyWarnings === "boolean" ? record.onlyWarnings : undefined,
      createdAt: typeof record.createdAt === "string" ? record.createdAt : undefined,
      itemCount: validServiceRules.length + validDrugRules.length,
    };
  }

  return {
    type: "library",
    serviceRules: validServiceRules,
    drugRules: validDrugRules,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : undefined,
    itemCount: validServiceRules.length + validDrugRules.length,
  };
}
