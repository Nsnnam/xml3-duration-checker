import { useMemo, useState, useRef } from "react";
import { exportWarningList, exportXml3Report, createXml3ReportWorkbook } from "../lib/export.ts";
import {
  exportLibraryTemplate,
  exportLibraryToExcel,
  importLibraryFromExcel,
} from "../lib/library-excel.ts";
import { APP_META } from "../lib/meta.ts";
import { formatTimestampForFilename, formatXmlDateTime } from "../lib/timezone.ts";
import {
  DEFAULT_GROUP_CODES,
  DURATION_LIMIT_MINUTES,
  GROUP_OPTIONS,
  analyzeXml3Files,
  type BatchAnalysis,
  type Xml3Record,
  type ServiceRule,
  type DrugRule,
  type ValidationWarning,
} from "../lib/xml3-duration.ts";
import {
  loadTelegramConfig,
  saveTelegramConfig,
  testTelegramConnection,
  sendTelegramDocument,
  TELEGRAM_CONFIG_KEY,
  type TelegramConfig,
} from "../lib/telegram.ts";
import {
  exportLibraryBackup,
  exportFullConfigBackup,
  parseBackupJson,
  createLibraryBackupContent,
  createFullConfigBackupContent,
  type TabColumnState,
  type AllTabsColumnConfig,
  type ParsedBackupResult,
} from "../lib/backup.ts";
import coffeeQr from "../assets/coffee-qr.jpg";

type View = "checker" | "library" | "settings" | "guide" | "about" | "support";
type AlertTab = "XML1" | "XML2" | "XML3" | "XML4";
const SERVICE_RULES_KEY = "nsn-xmlcheck-service-rules";
const DRUG_RULES_KEY = "nsn-xmlcheck-drug-rules";
const COLUMNS_CONFIG_KEY = "nsn-xmlcheck-columns-config-v2";

type ColumnDef = {
  key: string;
  label: string;
  defaultWidth: number;
  isCompact?: boolean;
  isWide?: boolean;
};

const TAB_COLUMNS: Record<AlertTab, ColumnDef[]> = {
  XML3: [
    { key: "status", label: "Trạng thái", defaultWidth: 85 },
    { key: "maLk", label: "MA_LK", defaultWidth: 125 },
    { key: "hoTen", label: "Họ và tên", defaultWidth: 155 },
    { key: "maBn", label: "MA_BN", defaultWidth: 110 },
    { key: "duration", label: "Số phút", defaultWidth: 75 },
    { key: "overLimit", label: "Vượt ngưỡng", defaultWidth: 90 },
    { key: "detail", label: "Chi tiết (thu gọn)", defaultWidth: 230, isCompact: true },
    { key: "service", label: "Dịch vụ / Vật tư (mở rộng)", defaultWidth: 380, isWide: true },
    { key: "group", label: "Mã nhóm", defaultWidth: 75 },
    { key: "ttThau", label: "TT_THAU", defaultWidth: 100 },
    { key: "khoa", label: "Khoa", defaultWidth: 75 },
    { key: "ngayYl", label: "NGAY_YL", defaultWidth: 130 },
    { key: "ngayThYl", label: "NGAY_TH_YL", defaultWidth: 130 },
    { key: "ngayKq", label: "NGAY_KQ", defaultWidth: 130 },
    { key: "fileName", label: "File", defaultWidth: 120 },
    { key: "stt", label: "STT", defaultWidth: 60 },
  ],
  XML1: [
    { key: "detailIndex", label: "Chi tiết thứ", defaultWidth: 95 },
    { key: "maLk", label: "MA_LK", defaultWidth: 130 },
    { key: "hoTen", label: "Họ và tên", defaultWidth: 170 },
    { key: "maBn", label: "MA_BN", defaultWidth: 120 },
    { key: "maDichVu", label: "Mã trường / DV", defaultWidth: 130 },
    { key: "tenDichVu", label: "Tên thông tin / DV", defaultWidth: 200 },
    { key: "message", label: "Nội dung cảnh báo", defaultWidth: 420 },
  ],
  XML2: [
    { key: "action", label: "Thao tác", defaultWidth: 115 },
    { key: "detailIndex", label: "Chi tiết thứ", defaultWidth: 95 },
    { key: "maLk", label: "MA_LK", defaultWidth: 130 },
    { key: "hoTen", label: "Họ và tên", defaultWidth: 170 },
    { key: "maBn", label: "MA_BN", defaultWidth: 120 },
    { key: "maThuoc", label: "Mã thuốc", defaultWidth: 130 },
    { key: "tenThuoc", label: "Tên thuốc", defaultWidth: 220 },
    { key: "message", label: "Nội dung cảnh báo", defaultWidth: 380 },
  ],
  XML4: [
    { key: "detailIndex", label: "Chi tiết thứ", defaultWidth: 95 },
    { key: "maLk", label: "MA_LK", defaultWidth: 130 },
    { key: "hoTen", label: "Họ và tên", defaultWidth: 170 },
    { key: "maBn", label: "MA_BN", defaultWidth: 120 },
    { key: "maDichVu", label: "Mã dịch vụ", defaultWidth: 130 },
    { key: "tenDichVu", label: "Tên dịch vụ", defaultWidth: 220 },
    { key: "message", label: "Nội dung cảnh báo", defaultWidth: 400 },
  ],
};

function getDefaultTabState(tab: AlertTab): TabColumnState {
  const widths: Record<string, number> = {};
  const visible: Record<string, boolean> = {};
  for (const col of TAB_COLUMNS[tab]) {
    widths[col.key] = col.defaultWidth;
    visible[col.key] = true;
  }
  return { widths, visible };
}

function getDefaultColumnsConfig(): AllTabsColumnConfig {
  return {
    XML1: getDefaultTabState("XML1"),
    XML2: getDefaultTabState("XML2"),
    XML3: getDefaultTabState("XML3"),
    XML4: getDefaultTabState("XML4"),
  };
}

function loadColumnsConfig(): AllTabsColumnConfig {
  const defaults = getDefaultColumnsConfig();
  try {
    const saved = localStorage.getItem(COLUMNS_CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") {
        for (const tab of ["XML1", "XML2", "XML3", "XML4"] as AlertTab[]) {
          if (parsed[tab]) {
            defaults[tab] = {
              widths: { ...defaults[tab].widths, ...(parsed[tab].widths || {}) },
              visible: { ...defaults[tab].visible, ...(parsed[tab].visible || {}) },
            };
          }
        }
      }
    }
  } catch {
    /* ignore */
  }
  return defaults;
}

function loadServiceRules(): ServiceRule[] {
  try {
    const value = JSON.parse(localStorage.getItem(SERVICE_RULES_KEY) ?? "[]");
    return Array.isArray(value)
      ? value.filter(
          (rule): rule is ServiceRule =>
            typeof rule?.MA_DICH_VU === "string" &&
            typeof rule?.TEN_DICH_VU === "string" &&
            (rule.maxMinutes === null ||
              (typeof rule.maxMinutes === "number" &&
                Number.isFinite(rule.maxMinutes) &&
                rule.maxMinutes >= 0)),
        )
      : [];
  } catch {
    return [];
  }
}

function loadDrugRules(): DrugRule[] {
  try {
    const value = JSON.parse(localStorage.getItem(DRUG_RULES_KEY) ?? "[]");
    return Array.isArray(value)
      ? value.filter(
          (rule): rule is DrugRule =>
            typeof rule?.MA_THUOC === "string" && rule.MA_THUOC.trim().length > 0,
        )
      : [];
  } catch {
    return [];
  }
}

type SummaryFocus =
  | "files"
  | "xml3"
  | "rows"
  | "warnings"
  | "order"
  | "equal"
  | "bed"
  | "ttThau"
  | "missing"
  | "invalid"
  | "negative"
  | "xml1"
  | "xml2"
  | "xml4";

export function HomePage() {
  const [view, setView] = useState<View>("checker");
  const [files, setFiles] = useState<File[]>([]);
  const [analysis, setAnalysis] = useState<BatchAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [onlyWarnings, setOnlyWarnings] = useState(true);
  const [groupCodes, setGroupCodes] = useState<string[]>([...DEFAULT_GROUP_CODES]);
  const [patientQuery, setPatientQuery] = useState("");
  const [alertTab, setAlertTab] = useState<AlertTab>("XML3");
  const [summaryFocus, setSummaryFocus] = useState<SummaryFocus>("warnings");
  const [notice, setNotice] = useState("");
  const [serviceRules, setServiceRules] = useState<ServiceRule[]>(loadServiceRules);
  const [drugRules, setDrugRules] = useState<DrugRule[]>(loadDrugRules);
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>(loadTelegramConfig);
  const [columnsConfig, setColumnsConfig] = useState<AllTabsColumnConfig>(loadColumnsConfig);
  const [showColumnModal, setShowColumnModal] = useState(false);

  // Lưu columnsConfig vào localStorage khi thay đổi
  const saveColsConfig = (next: AllTabsColumnConfig) => {
    setColumnsConfig(next);
    localStorage.setItem(COLUMNS_CONFIG_KEY, JSON.stringify(next));
  };

  const updateColumnWidth = (tab: AlertTab, columnKey: string, width: number) => {
    setColumnsConfig((prev) => {
      const currentTab = prev[tab] || getDefaultTabState(tab);
      const nextTab: TabColumnState = {
        ...currentTab,
        widths: { ...currentTab.widths, [columnKey]: Math.max(45, width) },
      };
      const next: AllTabsColumnConfig = { ...prev, [tab]: nextTab };
      localStorage.setItem(COLUMNS_CONFIG_KEY, JSON.stringify(next));
      return next;
    });
  };

  const toggleColumnVisibility = (tab: AlertTab, columnKey: string) => {
    setColumnsConfig((prev) => {
      const currentTab = prev[tab] || getDefaultTabState(tab);
      const nextTab: TabColumnState = {
        ...currentTab,
        visible: { ...currentTab.visible, [columnKey]: !currentTab.visible[columnKey] },
      };
      const next: AllTabsColumnConfig = { ...prev, [tab]: nextTab };
      localStorage.setItem(COLUMNS_CONFIG_KEY, JSON.stringify(next));
      return next;
    });
  };

  const setAllTabColumnsVisibility = (tab: AlertTab, isVisible: boolean) => {
    setColumnsConfig((prev) => {
      const currentTab = prev[tab] || getDefaultTabState(tab);
      const nextVisible: Record<string, boolean> = {};
      for (const col of TAB_COLUMNS[tab]) {
        nextVisible[col.key] = isVisible;
      }
      const nextTab: TabColumnState = { ...currentTab, visible: nextVisible };
      const next: AllTabsColumnConfig = { ...prev, [tab]: nextTab };
      localStorage.setItem(COLUMNS_CONFIG_KEY, JSON.stringify(next));
      return next;
    });
  };

  const resetTabColumns = (tab: AlertTab) => {
    setColumnsConfig((prev) => {
      const next: AllTabsColumnConfig = { ...prev, [tab]: getDefaultTabState(tab) };
      localStorage.setItem(COLUMNS_CONFIG_KEY, JSON.stringify(next));
      return next;
    });
    setNotice(`Đã khôi phục cấu hình cột tab ${tab} về mặc định.`);
  };

  const resetAllColumns = () => {
    const defaults = getDefaultColumnsConfig();
    saveColsConfig(defaults);
    setNotice("Đã khôi phục cấu hình cột của tất cả các tab về mặc định.");
  };

  const filteredRecords = useMemo(
    () =>
      analysis
        ? analysis.records.filter((record) => {
            const isMandatoryDurationWarning =
              DEFAULT_GROUP_CODES.includes(
                record.MA_NHOM.trim() as (typeof DEFAULT_GROUP_CODES)[number],
              ) && record.status === "warning";
            const matchesGroup =
              isMandatoryDurationWarning ||
              groupCodes.includes(record.MA_NHOM.trim()) ||
              record.hasOrderWarning ||
              record.hasEqualWarning ||
              record.hasBedWarning ||
              record.hasTtThauWarning;
            const query = patientQuery.trim().toLocaleLowerCase("vi-VN");
            const matchesPatient =
              !query ||
              [record.MA_BN, record.HO_TEN, record.MA_LK].some((value) =>
                value.toLocaleLowerCase("vi-VN").includes(query),
              );
            return matchesGroup && matchesPatient;
          })
        : [],
    [analysis, groupCodes, patientQuery],
  );

  const filteredWarnings = useMemo(
    () =>
      filteredRecords.filter(
        (record) =>
          record.status === "warning" ||
          record.status === "tt-thau-warning" ||
          record.hasOrderWarning ||
          record.hasEqualWarning ||
          record.hasBedWarning ||
          record.hasTtThauWarning,
      ),
    [filteredRecords],
  );

  const records = useMemo(() => {
    const source = onlyWarnings ? filteredWarnings : filteredRecords;
    if (summaryFocus === "order") return source.filter((record) => record.hasOrderWarning);
    if (summaryFocus === "equal") return source.filter((record) => record.hasEqualWarning);
    if (summaryFocus === "bed") return source.filter((record) => record.hasBedWarning);
    if (summaryFocus === "ttThau") return source.filter((record) => record.hasTtThauWarning);
    if (summaryFocus === "missing") return source.filter((record) => record.status === "missing");
    if (summaryFocus === "invalid") return source.filter((record) => record.status === "invalid");
    if (summaryFocus === "negative") return source.filter((record) => record.status === "negative");
    return source;
  }, [filteredRecords, filteredWarnings, onlyWarnings, summaryFocus]);

  function focusSummary(focus: SummaryFocus) {
    setSummaryFocus(focus);
    if (focus === "xml1") setAlertTab("XML1");
    else if (focus === "xml2") setAlertTab("XML2");
    else if (focus === "xml4") setAlertTab("XML4");
    else setAlertTab("XML3");
    requestAnimationFrame(() =>
      document
        .getElementById("alert-detail")
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  const xmlWarnings: Record<AlertTab, ValidationWarning[]> = {
    XML1: analysis?.xml1Warnings ?? [],
    XML2: analysis?.xml2Warnings ?? [],
    XML3: analysis?.xml3Warnings ?? [],
    XML4: analysis?.xml4Warnings ?? [],
  };

  async function runAnalysis() {
    if (!files.length) {
      setNotice("Hãy chọn ít nhất một file XML trước khi phân tích.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const nextAnalysis = await analyzeXml3Files(files, serviceRules, drugRules);
      setSummaryFocus("warnings");
      setAlertTab("XML3");
      setAnalysis(nextAnalysis);

      // Tự động gửi báo cáo Telegram nếu bật cấu hình
      if (
        telegramConfig.enabled &&
        telegramConfig.autoSendOnAnalysis &&
        telegramConfig.botToken &&
        telegramConfig.chatId
      ) {
        handleSendTelegramReport(nextAnalysis);
      }
    } finally {
      setBusy(false);
    }
  }

  async function reanalyzeWithRules(
    nextServiceRules: ServiceRule[],
    nextDrugRules: DrugRule[] = drugRules,
  ) {
    if (!files.length) return;
    setBusy(true);
    try {
      setSummaryFocus("warnings");
      setAnalysis(await analyzeXml3Files(files, nextServiceRules, nextDrugRules));
    } finally {
      setBusy(false);
    }
  }

  // Cập nhật Thư viện Dịch vụ kỹ thuật
  async function updateServiceRule(
    record: Xml3Record,
    maxMinutes: number | null,
    minMinutes: number | null = 1,
  ) {
    const code = record.MA_DICH_VU.trim();
    if (!code) {
      setNotice("Dòng này chưa có MA_DICH_VU nên không thể lưu vào thư viện.");
      return;
    }
    const rule: ServiceRule = {
      MA_DICH_VU: code,
      TEN_DICH_VU: record.TEN_DICH_VU || record.TEN_VAT_TU || "",
      minMinutes: minMinutes !== null ? minMinutes : undefined,
      maxMinutes,
    };
    const nextRules = [...serviceRules.filter((item) => item.MA_DICH_VU !== code), rule];
    setServiceRules(nextRules);
    localStorage.setItem(SERVICE_RULES_KEY, JSON.stringify(nextRules));
    await reanalyzeWithRules(nextRules, drugRules);
    setNotice(`Đã cập nhật thư viện cho dịch vụ ${code} và phân tích lại toàn bộ cảnh báo.`);
  }

  async function removeServiceRule(code: string) {
    const nextRules = serviceRules.filter((rule) => rule.MA_DICH_VU !== code);
    setServiceRules(nextRules);
    localStorage.setItem(SERVICE_RULES_KEY, JSON.stringify(nextRules));
    await reanalyzeWithRules(nextRules, drugRules);
    setNotice(`Đã xóa dịch vụ ${code} khỏi thư viện.`);
  }

  async function handleSaveAllServiceRules(newRules: ServiceRule[]) {
    setServiceRules(newRules);
    localStorage.setItem(SERVICE_RULES_KEY, JSON.stringify(newRules));
    await reanalyzeWithRules(newRules, drugRules);
  }

  // Cập nhật Thư viện Thuốc loại trừ XML2
  async function handleAddExcludedDrug(code: string, name: string) {
    const cleanCode = code.trim();
    if (!cleanCode) return;
    const rule: DrugRule = {
      MA_THUOC: cleanCode,
      TEN_THUOC: name.trim(),
      excluded: true,
    };
    const nextDrugRules = [
      ...drugRules.filter((r) => r.MA_THUOC.toUpperCase() !== cleanCode.toUpperCase()),
      rule,
    ];
    setDrugRules(nextDrugRules);
    localStorage.setItem(DRUG_RULES_KEY, JSON.stringify(nextDrugRules));
    await reanalyzeWithRules(serviceRules, nextDrugRules);
    setNotice(`Đã thêm thuốc ${cleanCode} vào danh mục loại trừ XML2 và phân tích lại.`);
  }

  async function handleRemoveDrugRule(code: string) {
    const nextDrugRules = drugRules.filter((r) => r.MA_THUOC.toUpperCase() !== code.toUpperCase());
    setDrugRules(nextDrugRules);
    localStorage.setItem(DRUG_RULES_KEY, JSON.stringify(nextDrugRules));
    await reanalyzeWithRules(serviceRules, nextDrugRules);
    setNotice(`Đã xóa thuốc ${code} khỏi danh mục loại trừ XML2.`);
  }

  async function handleSaveAllDrugRules(newDrugRules: DrugRule[]) {
    setDrugRules(newDrugRules);
    localStorage.setItem(DRUG_RULES_KEY, JSON.stringify(newDrugRules));
    await reanalyzeWithRules(serviceRules, newDrugRules);
  }

  // Nhập dữ liệu thư viện từ file Excel
  async function handleImportExcel(file: File, mode: "merge" | "overwrite") {
    setBusy(true);
    try {
      const { serviceRules: importedServices, drugRules: importedDrugs } =
        await importLibraryFromExcel(file);
      let nextServices = serviceRules;
      let nextDrugs = drugRules;

      if (mode === "overwrite") {
        nextServices = importedServices;
        nextDrugs = importedDrugs;
      } else {
        // Merge: cập nhật hoặc thêm mới
        const serviceMap = new Map(serviceRules.map((r) => [r.MA_DICH_VU.trim(), r]));
        for (const s of importedServices) {
          serviceMap.set(s.MA_DICH_VU.trim(), s);
        }
        nextServices = Array.from(serviceMap.values());

        const drugMap = new Map(drugRules.map((r) => [r.MA_THUOC.trim().toUpperCase(), r]));
        for (const d of importedDrugs) {
          drugMap.set(d.MA_THUOC.trim().toUpperCase(), d);
        }
        nextDrugs = Array.from(drugMap.values());
      }

      setServiceRules(nextServices);
      localStorage.setItem(SERVICE_RULES_KEY, JSON.stringify(nextServices));
      setDrugRules(nextDrugs);
      localStorage.setItem(DRUG_RULES_KEY, JSON.stringify(nextDrugs));

      await reanalyzeWithRules(nextServices, nextDrugs);
      setNotice(
        `✅ Đã nạp thành công ${importedServices.length} dịch vụ kỹ thuật và ${importedDrugs.length} mã thuốc từ file Excel (${
          mode === "merge" ? "chế độ Gộp" : "chế độ Ghi đè"
        }).`,
      );
    } catch (err) {
      setNotice(
        `❌ Lỗi khi đọc file Excel: ${err instanceof Error ? err.message : "Định dạng không hợp lệ"}`,
      );
    } finally {
      setBusy(false);
    }
  }

  function addFiles(list: FileList | null) {
    const incoming = Array.from(list ?? []).filter((file) =>
      file.name.toLowerCase().endsWith(".xml"),
    );
    setFiles((current) => [
      ...current,
      ...incoming.filter((file) => !current.some((old) => old.name === file.name)),
    ]);
    setNotice(incoming.length ? "" : "Chỉ nhận file có phần mở rộng .xml.");
  }

  function clearAll() {
    setFiles([]);
    setAnalysis(null);
    setNotice("");
  }

  async function handleSendTelegramReport(targetAnalysis = analysis) {
    if (!targetAnalysis) {
      setNotice("Chưa có kết quả phân tích để gửi qua Telegram.");
      return;
    }
    if (!telegramConfig.botToken || !telegramConfig.chatId) {
      setNotice("Chưa cấu hình Bot Token hoặc Chat ID trong tab Cấu hình & Backup.");
      return;
    }

    setNotice("Đang tạo file Excel và gửi qua Telegram...");
    try {
      const workbook = await createXml3ReportWorkbook(targetAnalysis);
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const filename = `${formatTimestampForFilename()}_XML3_duration.xlsx`;
      const caption =
        `📊 <b>BÁO CÁO PHÂN TÍCH XML3 — NSN_XMLCHECK</b>\n\n` +
        `• Số file đã nạp: <b>${targetAnalysis.files.length}</b>\n` +
        `• FILEHOSO XML3: <b>${targetAnalysis.tableFiles}</b>\n` +
        `• Tổng dòng XML3: <b>${targetAnalysis.records.length.toLocaleString("vi-VN")}</b>\n` +
        `• Cảnh báo thời lượng & mốc: <b>${targetAnalysis.warnings.length.toLocaleString("vi-VN")}</b>\n` +
        `• Cảnh báo XML1: <b>${targetAnalysis.xml1Warnings.length}</b>\n` +
        `• Cảnh báo XML2 (Thiếu TT_THAU): <b>${targetAnalysis.xml2Warnings.length}</b>\n` +
        `• Cảnh báo XML3 (Thiếu TT_THAU): <b>${targetAnalysis.ttThauWarnings}</b>\n` +
        `• Cảnh báo XML4 (Thiếu KET_LUAN): <b>${targetAnalysis.xml4Warnings.length}</b>\n` +
        `• Thời gian: <b>${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</b>`;

      const result = await sendTelegramDocument(
        telegramConfig.botToken,
        telegramConfig.chatId,
        caption,
        blob,
        filename,
      );

      if (result.ok) {
        setNotice("✅ Đã gửi báo cáo Excel thành công qua Telegram!");
      } else {
        setNotice(`❌ Không gửi được báo cáo qua Telegram: ${result.description}`);
      }
    } catch (error) {
      setNotice(
        `❌ Lỗi khi gửi Telegram: ${error instanceof Error ? error.message : "Không xác định"}`,
      );
    }
  }

  async function handleSendTelegramBackup(type: "library" | "full") {
    if (!telegramConfig.botToken || !telegramConfig.chatId) {
      setNotice("Chưa cấu hình Bot Token hoặc Chat ID trong tab Cấu hình & Backup.");
      return;
    }

    setNotice("Đang gửi file backup qua Telegram...");
    try {
      let json = "";
      let filename = "";
      let caption = "";

      if (type === "library") {
        json = createLibraryBackupContent(serviceRules, drugRules);
        filename = `${formatTimestampForFilename()}_backup_thu_vien_dvkt_thuoc.json`;
        caption = `💾 <b>BACKUP THƯ VIỆN DỊCH VỤ & THUỐC — NSN_XMLCHECK</b>\n• Số quy tắc DVKT: <b>${serviceRules.length}</b>\n• Số thuốc loại trừ XML2: <b>${drugRules.length}</b>\n• Thời gian: <b>${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</b>`;
      } else {
        json = createFullConfigBackupContent({
          serviceRules,
          drugRules,
          groupCodes,
          telegramConfig,
          columnsConfig,
          onlyWarnings,
        });
        filename = `${formatTimestampForFilename()}_backup_cau_hinh_toan_trang.json`;
        caption = `⚙️ <b>BACKUP CẤU HÌNH TOÀN TRANG — NSN_XMLCHECK</b>\n• Quy tắc DVKT: <b>${serviceRules.length}</b>\n• Thuốc loại trừ XML2: <b>${drugRules.length}</b>\n• Mã nhóm: <b>${groupCodes.join(", ")}</b>\n• Thời gian: <b>${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</b>`;
      }

      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const result = await sendTelegramDocument(
        telegramConfig.botToken,
        telegramConfig.chatId,
        caption,
        blob,
        filename,
      );

      if (result.ok) {
        setNotice("✅ Đã gửi file backup thành công qua Telegram!");
      } else {
        setNotice(`❌ Không gửi được file backup qua Telegram: ${result.description}`);
      }
    } catch (error) {
      setNotice(
        `❌ Lỗi khi gửi Telegram: ${error instanceof Error ? error.message : "Không xác định"}`,
      );
    }
  }

  const currentTabCols = columnsConfig[alertTab] || getDefaultTabState(alertTab);

  return (
    <div className="min-h-screen bg-[#f5faf9] text-slate-900">
      <header className="border-b border-teal-900/10 bg-gradient-to-r from-[#0f766e] via-[#0d9488] to-[#0891b2] text-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-content-center rounded-2xl bg-white/15 text-2xl shadow-inner">
              ⏱
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight md:text-xl">
                {APP_META.name} · v{APP_META.version}
              </h1>
              <p className="text-xs text-teal-50">
                Kiểm tra thời gian (tối thiểu & tối đa), TT_THAU XML2/XML3 & Import Excel thư viện
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs md:flex">
            <span className="rounded-full bg-white/15 px-3 py-1">Bảng 3 · DVKT, VTYT</span>
            <span className="rounded-full bg-white/15 px-3 py-1">
              Ngưỡng {DURATION_LIMIT_MINUTES} phút
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1">Tối thiểu &gt; 0 phút</span>
            <span className="rounded-full bg-white/15 px-3 py-1">GMT+7</span>
          </div>
        </div>
      </header>

      <nav className="border-b border-slate-200 bg-white/90 shadow-sm sticky top-0 z-20">
        <div className="mx-auto flex max-w-[1440px] gap-1 overflow-x-auto px-4 md:px-8">
          {[
            ["checker", "Kiểm tra thời gian"],
            ["library", `Thư viện (${serviceRules.length} DV · ${drugRules.length} Thuốc)`],
            ["settings", "Cấu hình & Backup"],
            ["guide", "Hướng dẫn"],
            ["about", "Phiên bản & tác giả"],
            ["support", "Mời cà phê"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key as View)}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
                view === key
                  ? "border-teal-600 text-teal-700 bg-teal-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 md:py-8">
        {notice && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900 shadow-sm">
            <span>{notice}</span>
            <button
              onClick={() => setNotice("")}
              className="text-xs font-bold text-amber-700 hover:underline"
            >
              Đóng
            </button>
          </div>
        )}

        {view === "checker" && (
          <CheckerView
            files={files}
            analysis={analysis}
            records={records}
            filteredRecords={filteredRecords}
            filteredWarnings={filteredWarnings}
            groupCodes={groupCodes}
            patientQuery={patientQuery}
            alertTab={alertTab}
            xmlWarnings={xmlWarnings}
            onlyWarnings={onlyWarnings}
            busy={busy}
            currentTabCols={currentTabCols}
            onUpdateColumnWidth={(colKey, width) => updateColumnWidth(alertTab, colKey, width)}
            onOpenColumnModal={() => setShowColumnModal(true)}
            onAddFiles={addFiles}
            onRemoveFile={(name) =>
              setFiles((current) => current.filter((file) => file.name !== name))
            }
            onClear={clearAll}
            onAnalyze={runAnalysis}
            onGroupCodesChange={setGroupCodes}
            onPatientQueryChange={setPatientQuery}
            onAlertTabChange={setAlertTab}
            onSummaryFocus={focusSummary}
            onExportWarnings={(source, warnings) => exportWarningList(source, warnings)}
            onAddServiceRule={updateServiceRule}
            onAddExcludedDrug={handleAddExcludedDrug}
            onToggleWarnings={setOnlyWarnings}
            onExport={() => analysis && exportXml3Report(analysis, filteredRecords)}
            onSendTelegramReport={() => handleSendTelegramReport()}
            hasTelegramConfig={Boolean(telegramConfig.botToken && telegramConfig.chatId)}
            onOpenLibrary={() => setView("library")}
            onOpenSettings={() => setView("settings")}
          />
        )}

        {view === "library" && (
          <LibraryView
            serviceRules={serviceRules}
            drugRules={drugRules}
            onSaveServiceRules={handleSaveAllServiceRules}
            onAddServiceRule={async (rule) => {
              const next = [...serviceRules.filter((r) => r.MA_DICH_VU !== rule.MA_DICH_VU), rule];
              await handleSaveAllServiceRules(next);
              setNotice(`Đã thêm dịch vụ ${rule.MA_DICH_VU} vào thư viện.`);
            }}
            onRemoveServiceRule={removeServiceRule}
            onSaveDrugRules={handleSaveAllDrugRules}
            onAddDrugRule={handleAddExcludedDrug}
            onRemoveDrugRule={handleRemoveDrugRule}
            onExportBackup={() => exportLibraryBackup(serviceRules, drugRules)}
            onSendTelegramBackup={() => handleSendTelegramBackup("library")}
            hasTelegramConfig={Boolean(telegramConfig.botToken && telegramConfig.chatId)}
            onExportTemplate={exportLibraryTemplate}
            onExportToExcel={() => exportLibraryToExcel(serviceRules, drugRules)}
            onImportExcel={handleImportExcel}
          />
        )}

        {view === "settings" && (
          <SettingsBackupView
            telegramConfig={telegramConfig}
            columnsConfig={columnsConfig}
            onSaveTelegramConfig={(cfg) => {
              setTelegramConfig(cfg);
              saveTelegramConfig(cfg);
              setNotice("Đã lưu cấu hình Telegram.");
            }}
            onTestTelegram={async (token, chatId) => {
              const res = await testTelegramConnection(token, chatId);
              if (res.ok) {
                setNotice("✅ Kiểm tra kết nối Telegram thành công! Bot đã gửi tin nhắn thử.");
              } else {
                setNotice(`❌ Lỗi kết nối Telegram: ${res.description}`);
              }
              return res;
            }}
            onResetColumnsForTab={resetTabColumns}
            onResetAllColumns={resetAllColumns}
            onExportLibraryBackup={() => exportLibraryBackup(serviceRules, drugRules)}
            onExportFullBackup={() =>
              exportFullConfigBackup({
                serviceRules,
                drugRules,
                groupCodes,
                telegramConfig,
                columnsConfig,
                onlyWarnings,
              })
            }
            onSendTelegramBackup={handleSendTelegramBackup}
            onSendTelegramReport={() => handleSendTelegramReport()}
            hasAnalysis={Boolean(analysis)}
            onRestoreBackup={(parsed) => {
              if (parsed.type === "library") {
                handleSaveAllServiceRules(parsed.serviceRules);
                handleSaveAllDrugRules(parsed.drugRules || []);
                setNotice(
                  `Đã khôi phục thành công ${parsed.serviceRules.length} dịch vụ và ${parsed.drugRules?.length || 0} thuốc vào thư viện.`,
                );
              } else {
                handleSaveAllServiceRules(parsed.serviceRules);
                handleSaveAllDrugRules(parsed.drugRules || []);
                if (parsed.groupCodes) setGroupCodes(parsed.groupCodes);
                if (parsed.telegramConfig) {
                  setTelegramConfig(parsed.telegramConfig);
                  saveTelegramConfig(parsed.telegramConfig);
                }
                if (parsed.columnsConfig) {
                  saveColsConfig(parsed.columnsConfig);
                }
                if (typeof parsed.onlyWarnings === "boolean") setOnlyWarnings(parsed.onlyWarnings);
                setNotice("Đã khôi phục toàn bộ cấu hình trang và thư viện dịch vụ/thuốc!");
              }
            }}
            onResetAllDefaults={() => {
              if (
                window.confirm("Bạn có chắc chắn muốn đặt lại toàn bộ cài đặt và xóa thư viện?")
              ) {
                localStorage.removeItem(SERVICE_RULES_KEY);
                localStorage.removeItem(DRUG_RULES_KEY);
                localStorage.removeItem(TELEGRAM_CONFIG_KEY);
                localStorage.removeItem(COLUMNS_CONFIG_KEY);
                setServiceRules([]);
                setDrugRules([]);
                setGroupCodes([...DEFAULT_GROUP_CODES]);
                setTelegramConfig({ ...loadTelegramConfig() });
                setColumnsConfig(getDefaultColumnsConfig());
                setNotice("Đã đặt lại toàn bộ cài đặt về mặc định.");
              }
            }}
          />
        )}

        {view === "guide" && <GuideView />}
        {view === "about" && <AboutView />}
        {view === "support" && <SupportView />}
      </main>

      {/* Modal Tùy chỉnh cột */}
      {showColumnModal && (
        <ColumnCustomizerModal
          activeTab={alertTab}
          tabColumns={TAB_COLUMNS[alertTab]}
          tabState={currentTabCols}
          onToggleColumn={(key) => toggleColumnVisibility(alertTab, key)}
          onSetAll={(val) => setAllTabColumnsVisibility(alertTab, val)}
          onResetTab={() => resetTabColumns(alertTab)}
          onClose={() => setShowColumnModal(false)}
        />
      )}

      <footer className="border-t border-slate-200 bg-white px-4 py-4 text-center text-xs text-slate-500">
        v{APP_META.version} · {APP_META.author} ·{" "}
        <button className="text-teal-700 underline" onClick={() => setView("support")}>
          Mời cà phê
        </button>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CHECKER VIEW
// ---------------------------------------------------------------------------
function CheckerView({
  files,
  analysis,
  records,
  filteredRecords,
  filteredWarnings,
  groupCodes,
  patientQuery,
  alertTab,
  xmlWarnings,
  onlyWarnings,
  busy,
  currentTabCols,
  onUpdateColumnWidth,
  onOpenColumnModal,
  onAddFiles,
  onRemoveFile,
  onClear,
  onAnalyze,
  onGroupCodesChange,
  onPatientQueryChange,
  onAlertTabChange,
  onSummaryFocus,
  onExportWarnings,
  onAddServiceRule,
  onAddExcludedDrug,
  onToggleWarnings,
  onExport,
  onSendTelegramReport,
  hasTelegramConfig,
  onOpenLibrary,
  onOpenSettings,
}: {
  files: File[];
  analysis: BatchAnalysis | null;
  records: Xml3Record[];
  filteredRecords: Xml3Record[];
  filteredWarnings: Xml3Record[];
  groupCodes: string[];
  patientQuery: string;
  alertTab: AlertTab;
  xmlWarnings: Record<AlertTab, ValidationWarning[]>;
  onlyWarnings: boolean;
  busy: boolean;
  currentTabCols: TabColumnState;
  onUpdateColumnWidth: (key: string, width: number) => void;
  onOpenColumnModal: () => void;
  onAddFiles: (files: FileList | null) => void;
  onRemoveFile: (name: string) => void;
  onClear: () => void;
  onAnalyze: () => void;
  onGroupCodesChange: (value: string[]) => void;
  onPatientQueryChange: (value: string) => void;
  onAlertTabChange: (value: AlertTab) => void;
  onSummaryFocus: (value: SummaryFocus) => void;
  onExportWarnings: (source: AlertTab, warnings: ValidationWarning[]) => void;
  onAddServiceRule: (
    record: Xml3Record,
    maxMinutes: number | null,
    minMinutes?: number | null,
  ) => void;
  onAddExcludedDrug: (code: string, name: string) => void;
  onToggleWarnings: (value: boolean) => void;
  onExport: () => void;
  onSendTelegramReport: () => void;
  hasTelegramConfig: boolean;
  onOpenLibrary: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <details open={!analysis} className="group space-y-4">
          <summary className="cursor-pointer list-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-teal-800 shadow-sm flex items-center justify-between">
            <span>
              Cấu hình import, mã nhóm và quy tắc kiểm tra
              <span className="ml-2 text-xs font-normal text-slate-500">(bấm để mở/thu gọn)</span>
            </span>
            <span className="text-xs text-teal-700 font-semibold group-open:rotate-180 transition-transform">
              ▼
            </span>
          </summary>
          <div className="rounded-3xl border border-teal-100 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-5 flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-content-center rounded-2xl bg-teal-50 text-2xl">
                📤
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Nạp file XML chứa 15 bảng</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                  Công cụ giải mã nội dung <b>NOIDUNGFILE</b> theo Base64, lấy riêng <b>XML3</b>{" "}
                  (CHI_TIET_DVKT), kiểm tra thời gian (tối thiểu & tối đa), thông tin thầu{" "}
                  <b>XML2</b> (cột 15 TT_THAU) và <b>XML3</b> (MA_NHOM 10/11 bắt buộc có TT_THAU).
                </p>
              </div>
            </div>
            <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/50 px-4 text-center transition hover:border-teal-500 hover:bg-teal-50">
              <span className="text-3xl">＋</span>
              <span className="mt-2 text-sm font-semibold text-teal-800">
                Chọn hoặc thêm nhiều file XML
              </span>
              <span className="mt-1 text-xs text-slate-500">
                XML1–XML15 Base64 · Xử lý hoàn toàn trên trình duyệt local
              </span>
              <input
                type="file"
                accept=".xml"
                multiple
                className="hidden"
                onChange={(event) => {
                  onAddFiles(event.target.files);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <summary className="cursor-pointer list-none text-xs font-bold uppercase tracking-wide text-slate-500 flex items-center justify-between">
                <span>
                  Mã nhóm áp dụng cảnh báo thời lượng (MA_NHOM · cột 6)
                  <span className="ml-2 normal-case font-normal text-teal-700">
                    · bấm để mở danh sách 18 nhóm
                  </span>
                </span>
                <span className="text-xs text-slate-400">▼</span>
              </summary>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {GROUP_OPTIONS.map((option) => (
                  <label
                    key={option.code}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm transition hover:border-teal-300 hover:bg-teal-50"
                  >
                    <input
                      type="checkbox"
                      checked={groupCodes.includes(option.code)}
                      onChange={(event) =>
                        onGroupCodesChange(
                          event.target.checked
                            ? [...groupCodes, option.code]
                            : groupCodes.filter((code) => code !== option.code),
                        )
                      }
                      className="mt-0.5 accent-teal-700"
                    />
                    <span>
                      <b className="text-teal-800">Nhóm {option.code}</b>
                      <span className="block text-xs leading-5 text-slate-500">{option.title}</span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Nhóm 2, 3, 8, 18 luôn được kiểm tra thời lượng; bộ chọn này dùng để mở rộng thêm các
                nhóm khác trong bảng/báo cáo. Nhóm 10 và 11 bắt buộc có TT_THAU.
              </p>
            </details>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs">
              <span className="text-slate-600 font-medium">
                ⚙️ Thư viện dịch vụ kỹ thuật & danh mục thuốc loại trừ XML2 được quản lý tại tab Thư
                viện riêng.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onOpenLibrary}
                  className="rounded-lg bg-teal-700 px-3 py-1.5 font-bold text-white hover:bg-teal-800 shadow-sm"
                >
                  Mở Thư viện DV & Thuốc
                </button>
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cấu hình & Backup
                </button>
              </div>
            </div>

            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Danh sách file đã chọn ({files.length}):
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {files.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm"
                    >
                      <span className="min-w-0 truncate font-mono text-xs text-slate-800">
                        {file.name}
                      </span>
                      <button
                        className="shrink-0 text-xs font-semibold text-rose-600 hover:underline"
                        onClick={() => onRemoveFile(file.name)}
                      >
                        Gỡ
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    className="rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2"
                    disabled={busy}
                    onClick={onAnalyze}
                  >
                    {busy ? "Đang phân tích XML..." : "🚀 Bắt đầu Phân tích XML"}
                  </button>
                  <button
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    onClick={onClear}
                  >
                    Xóa tất cả file
                  </button>
                </div>
              </div>
            )}
          </div>
        </details>
      </section>

      {analysis && (
        <>
          <section className="grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-7">
            <Metric
              label="File đã nạp"
              value={analysis.files.length}
              onClick={() => onSummaryFocus("files")}
            />
            <Metric
              label="FILEHOSO XML3"
              value={analysis.tableFiles}
              tone="teal"
              onClick={() => onSummaryFocus("xml3")}
            />
            <Metric
              label="Dòng theo bộ lọc"
              value={filteredRecords.length}
              tone="teal"
              onClick={() => onSummaryFocus("rows")}
            />
            <Metric
              label="Cảnh báo XML3"
              value={filteredWarnings.length}
              tone="rose"
              onClick={() => onSummaryFocus("warnings")}
            />
            <Metric
              label="XML1 · Bệnh nhân"
              value={analysis.xml1Warnings.length}
              tone="amber"
              onClick={() => onSummaryFocus("xml1")}
            />
            <Metric
              label="XML2 · TT_THAU"
              value={analysis.xml2Warnings.length}
              tone="rose"
              onClick={() => onSummaryFocus("xml2")}
            />
            <Metric
              label="XML3 · TT_THAU"
              value={analysis.ttThauWarnings}
              tone="rose"
              onClick={() => onSummaryFocus("ttThau")}
            />
            <Metric
              label="XML4 · KET_LUAN"
              value={analysis.xml4Warnings.length}
              tone="amber"
              onClick={() => onSummaryFocus("xml4")}
            />
            <Metric
              label="Sai thứ tự"
              value={filteredRecords.filter((record) => record.hasOrderWarning).length}
              tone="rose"
              onClick={() => onSummaryFocus("order")}
            />
            <Metric
              label="Trùng mốc"
              value={filteredRecords.filter((record) => record.hasEqualWarning).length}
              tone="rose"
              onClick={() => onSummaryFocus("equal")}
            />
            <Metric
              label="Giường trong ngày"
              value={filteredRecords.filter((record) => record.hasBedWarning).length}
              tone="rose"
              onClick={() => onSummaryFocus("bed")}
            />
            <Metric
              label="Thiếu thời gian"
              value={filteredRecords.filter((record) => record.status === "missing").length}
              tone="amber"
              onClick={() => onSummaryFocus("missing")}
            />
            <Metric
              label="Thời gian lỗi"
              value={filteredRecords.filter((record) => record.status === "invalid").length}
              tone="amber"
              onClick={() => onSummaryFocus("invalid")}
            />
            <Metric
              label="Thời gian âm"
              value={filteredRecords.filter((record) => record.status === "negative").length}
              tone="slate"
              onClick={() => onSummaryFocus("negative")}
            />
          </section>

          <section
            id="alert-detail"
            className="overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-sm"
          >
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-rose-50 to-white px-5 py-4 md:flex-row md:items-center md:px-6">
              <div>
                <h2 className="font-bold text-rose-900">Chi tiết cảnh báo & Dữ liệu XML</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Hỗ trợ kéo thả chỉnh độ rộng cột và tùy chỉnh ẩn/hiện cột trên tất cả các tab
                  (XML1–XML4).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex min-w-[220px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">
                  <span className="font-bold text-teal-700">Tìm kiếm:</span>
                  <input
                    value={patientQuery}
                    onChange={(event) => onPatientQueryChange(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent font-semibold text-slate-800 outline-none"
                    placeholder="Mã BN, họ tên, MA_LK..."
                  />
                </label>
                {alertTab === "XML3" && (
                  <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={onlyWarnings}
                      onChange={(event) => onToggleWarnings(event.target.checked)}
                      className="accent-teal-700"
                    />{" "}
                    Chỉ cảnh báo
                  </label>
                )}
                <button
                  type="button"
                  onClick={onOpenColumnModal}
                  className="rounded-lg border border-teal-300 bg-teal-50 px-2.5 py-1.5 text-xs font-bold text-teal-800 hover:bg-teal-100 shadow-sm flex items-center gap-1"
                  title="Tùy chỉnh ẩn/hiện các cột của bảng này"
                >
                  <span>⚙️ Tùy chỉnh cột ({alertTab})</span>
                </button>
                <button
                  disabled={
                    alertTab === "XML3" ? !analysis.records.length : !xmlWarnings[alertTab].length
                  }
                  onClick={
                    alertTab === "XML3"
                      ? onExport
                      : () => onExportWarnings(alertTab, xmlWarnings[alertTab])
                  }
                  className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40 shadow-sm"
                >
                  📥 Xuất {alertTab} XLSX
                </button>
                {hasTelegramConfig && (
                  <button
                    onClick={onSendTelegramReport}
                    className="rounded-lg bg-[#229ED9] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1e8ec3] shadow-sm flex items-center gap-1.5"
                    title="Gửi báo cáo Excel kèm tóm tắt qua Telegram"
                  >
                    <span>✈️ Gửi Telegram</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-5 pt-3 md:px-6">
              {(["XML1", "XML2", "XML3", "XML4"] as AlertTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => onAlertTabChange(tab)}
                  className={`whitespace-nowrap rounded-t-xl border-b-2 px-4 py-2.5 text-xs font-black transition ${
                    alertTab === tab
                      ? "border-teal-700 text-teal-800 bg-teal-50/60"
                      : "border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {tab} · {xmlWarnings[tab].length.toLocaleString("vi-VN")} cảnh báo
                </button>
              ))}
            </div>

            {alertTab === "XML3" ? (
              records.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-slate-500">
                  Không có dòng phù hợp với bộ lọc hiện tại.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100/90 text-[11px] uppercase tracking-wide text-slate-600 sticky top-0 z-10 select-none">
                      <tr>
                        {TAB_COLUMNS.XML3.filter(
                          (col) => currentTabCols.visible[col.key] !== false,
                        ).map((col) => (
                          <ResizableTh
                            key={col.key}
                            width={currentTabCols.widths[col.key] || col.defaultWidth}
                            onResize={(w) => onUpdateColumnWidth(col.key, w)}
                            isCompact={col.isCompact}
                            isWide={col.isWide}
                          >
                            {col.label}
                          </ResizableTh>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record, index) => (
                        <WarningRow
                          key={`${record.fileName}-${record.MA_LK}-${record.STT}-${index}`}
                          record={record}
                          tabCols={currentTabCols}
                          onAddServiceRule={onAddServiceRule}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <ValidationTable
                source={alertTab}
                warnings={xmlWarnings[alertTab]}
                tabCols={currentTabCols}
                onUpdateColumnWidth={onUpdateColumnWidth}
                onExport={() => onExportWarnings(alertTab, xmlWarnings[alertTab])}
                onAddExcludedDrug={onAddExcludedDrug}
              />
            )}
          </section>

          {analysis.errors.length > 0 && (
            <details className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <summary className="cursor-pointer text-sm font-bold text-slate-700">
                Nhật ký xử lý ({analysis.errors.length} dòng)
              </summary>
              <pre className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-200">
                {analysis.errors.join("\n")}
              </pre>
            </details>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RESIZABLE TH
// ---------------------------------------------------------------------------
function ResizableTh({
  children,
  width,
  onResize,
  isCompact = false,
  isWide = false,
}: {
  children: React.ReactNode;
  width?: number;
  onResize: (width: number) => void;
  isCompact?: boolean;
  isWide?: boolean;
}) {
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startXRef.current = e.clientX;
    startWidthRef.current = width || 100;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.clientX - startXRef.current;
      onResize(Math.max(40, startWidthRef.current + diff));
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <th
      style={{
        width: width ? `${width}px` : undefined,
        minWidth: width ? `${width}px` : undefined,
        maxWidth: width ? `${width}px` : undefined,
      }}
      className={`relative px-3 py-3 font-bold border-r border-slate-200 last:border-r-0 ${
        isCompact ? "bg-amber-50/70 text-amber-900" : isWide ? "bg-teal-50/70 text-teal-900" : ""
      }`}
    >
      <div className="truncate pr-2">{children}</div>
      <div
        onMouseDown={handleMouseDown}
        className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-teal-500/50 select-none z-10"
        title="Kéo thả để chỉnh độ rộng cột"
      />
    </th>
  );
}

// ---------------------------------------------------------------------------
// WARNING ROW (XML3)
// ---------------------------------------------------------------------------
function WarningRow({
  record,
  tabCols,
  onAddServiceRule,
}: {
  record: Xml3Record;
  tabCols: TabColumnState;
  onAddServiceRule: (
    record: Xml3Record,
    maxMinutes: number | null,
    minMinutes?: number | null,
  ) => void;
}) {
  const isWarning =
    record.status === "warning" ||
    record.status === "tt-thau-warning" ||
    record.hasOrderWarning ||
    record.hasEqualWarning ||
    record.hasBedWarning ||
    record.hasTtThauWarning;

  const label = record.hasOrderWarning
    ? "SAI THỨ TỰ"
    : record.hasEqualWarning
      ? "TRÙNG MỐC"
      : record.hasBedWarning
        ? "GIƯỜNG"
        : record.hasTtThauWarning
          ? "TT_THAU"
          : record.status === "warning"
            ? "CB"
            : record.status === "ok"
              ? "ĐẠT"
              : record.status.toUpperCase();

  const isVisible = (key: string) => tabCols.visible[key] !== false;
  const colWidth = (key: string, def: number) => ({
    width: `${tabCols.widths[key] || def}px`,
    minWidth: `${tabCols.widths[key] || def}px`,
    maxWidth: `${tabCols.widths[key] || def}px`,
  });

  return (
    <tr
      className={`border-t border-slate-200/70 align-top ${
        isWarning ? "bg-rose-50/60 hover:bg-rose-100/50" : "hover:bg-slate-50/80"
      }`}
    >
      {isVisible("status") && (
        <td style={colWidth("status", 85)} className="px-3 py-2.5">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-black ${
              isWarning ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {label}
          </span>
        </td>
      )}
      {isVisible("maLk") && (
        <td
          style={colWidth("maLk", 125)}
          className="px-3 py-2.5 font-mono font-bold text-teal-800 break-all"
        >
          {record.MA_LK || "(trống)"}
        </td>
      )}
      {isVisible("hoTen") && (
        <td style={colWidth("hoTen", 155)} className="px-3 py-2.5">
          <div className="font-semibold text-slate-800 break-words leading-tight">
            {record.HO_TEN || "Chưa có họ tên"}
          </div>
        </td>
      )}
      {isVisible("maBn") && (
        <td style={colWidth("maBn", 110)} className="px-3 py-2.5 font-mono font-bold break-all">
          {record.MA_BN || "(chưa nối)"}
        </td>
      )}
      {isVisible("duration") && (
        <td
          style={colWidth("duration", 75)}
          className="px-3 py-2.5 text-right font-black text-slate-800"
        >
          {record.durationMinutes === null ? "—" : record.durationMinutes.toLocaleString("vi-VN")}
        </td>
      )}
      {isVisible("overLimit") && (
        <td
          style={colWidth("overLimit", 90)}
          className="px-3 py-2.5 text-right font-bold text-rose-700"
        >
          {record.status === "warning" && record.durationMinutes !== null
            ? `${(record.durationMinutes - (record.serviceRule?.maxMinutes ?? DURATION_LIMIT_MINUTES)).toLocaleString("vi-VN")} ph`
            : "—"}
        </td>
      )}
      {isVisible("detail") && (
        <td style={colWidth("detail", 230)} className="px-3 py-2.5 text-slate-600">
          <div className="text-xs leading-relaxed break-words">{record.detail}</div>
          {record.MA_DICH_VU && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              <button
                type="button"
                className="rounded border border-rose-200 bg-white px-1.5 py-0.5 text-[9px] font-bold text-rose-700 hover:bg-rose-50"
                onClick={() => onAddServiceRule(record, null)}
                title="Loại trừ dịch vụ này khỏi cảnh báo thời lượng"
              >
                Loại trừ
              </button>
              <button
                type="button"
                className="rounded border border-teal-200 bg-white px-1.5 py-0.5 text-[9px] font-bold text-teal-700 hover:bg-teal-50"
                onClick={() => {
                  const maxVal = window.prompt(
                    `Ngưỡng thời gian TỐI ĐA cho [${record.MA_DICH_VU}] (phút):`,
                    String(record.serviceRule?.maxMinutes ?? DURATION_LIMIT_MINUTES),
                  );
                  if (maxVal === null) return;
                  const maxMinutes = Number(maxVal);

                  const minVal = window.prompt(
                    `Thời gian TỐI THIỂU cho [${record.MA_DICH_VU}] (phút, mặc định > 0):`,
                    String(record.serviceRule?.minMinutes ?? 1),
                  );
                  if (minVal === null) return;
                  const minMinutes = Number(minVal);

                  if (
                    Number.isFinite(maxMinutes) &&
                    maxMinutes >= 0 &&
                    Number.isFinite(minMinutes) &&
                    minMinutes >= 0
                  ) {
                    onAddServiceRule(record, maxMinutes, minMinutes);
                  }
                }}
                title="Đặt ngưỡng số phút tối thiểu và tối đa riêng"
              >
                Đặt ngưỡng
              </button>
            </div>
          )}
        </td>
      )}
      {isVisible("service") && (
        <td style={colWidth("service", 380)} className="px-3 py-2.5">
          <div className="font-semibold text-slate-900 leading-snug break-words">
            {record.TEN_DICH_VU || record.TEN_VAT_TU || "(chưa có tên)"}
          </div>
          <div className="mt-1 font-mono text-[10px] text-slate-500">
            DV: <span className="text-teal-700 font-bold">{record.MA_DICH_VU || "—"}</span>
            {record.MA_VAT_TU && ` · VT: ${record.MA_VAT_TU}`}
          </div>
        </td>
      )}
      {isVisible("group") && (
        <td style={colWidth("group", 75)} className="px-3 py-2.5 font-mono text-center font-bold">
          {record.MA_NHOM || "—"}
        </td>
      )}
      {isVisible("ttThau") && (
        <td style={colWidth("ttThau", 100)} className="px-3 py-2.5 font-mono text-xs">
          {record.TT_THAU ? (
            <span className="text-slate-800 break-all">{record.TT_THAU}</span>
          ) : (
            <span className="text-rose-600 font-semibold italic">(trống)</span>
          )}
        </td>
      )}
      {isVisible("khoa") && (
        <td style={colWidth("khoa", 75)} className="px-3 py-2.5 font-mono text-slate-700">
          {record.MA_KHOA || "—"}
        </td>
      )}
      {isVisible("ngayYl") && (
        <td
          style={colWidth("ngayYl", 130)}
          className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px]"
        >
          {formatXmlDateTime(record.NGAY_YL) || record.NGAY_YL || "—"}
        </td>
      )}
      {isVisible("ngayThYl") && (
        <td
          style={colWidth("ngayThYl", 130)}
          className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px]"
        >
          {formatXmlDateTime(record.NGAY_TH_YL) || record.NGAY_TH_YL || "—"}
        </td>
      )}
      {isVisible("ngayKq") && (
        <td
          style={colWidth("ngayKq", 130)}
          className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px]"
        >
          {formatXmlDateTime(record.NGAY_KQ) || record.NGAY_KQ || "—"}
        </td>
      )}
      {isVisible("fileName") && (
        <td style={colWidth("fileName", 120)} className="px-3 py-2.5">
          <div className="truncate font-mono text-[10px] text-slate-500" title={record.fileName}>
            {record.fileName}
          </div>
        </td>
      )}
      {isVisible("stt") && (
        <td
          style={colWidth("stt", 60)}
          className="px-3 py-2.5 font-mono text-slate-500 text-center"
        >
          {record.STT || "—"}
        </td>
      )}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// VALIDATION TABLE (XML1, XML2, XML4)
// ---------------------------------------------------------------------------
function ValidationTable({
  source,
  warnings,
  tabCols,
  onUpdateColumnWidth,
  onExport,
  onAddExcludedDrug,
}: {
  source: AlertTab;
  warnings: ValidationWarning[];
  tabCols: TabColumnState;
  onUpdateColumnWidth: (key: string, width: number) => void;
  onExport: () => void;
  onAddExcludedDrug: (code: string, name: string) => void;
}) {
  const isVisible = (key: string) => tabCols.visible[key] !== false;
  const colWidth = (key: string, def: number) => ({
    width: `${tabCols.widths[key] || def}px`,
    minWidth: `${tabCols.widths[key] || def}px`,
    maxWidth: `${tabCols.widths[key] || def}px`,
  });

  const columns = TAB_COLUMNS[source] || [];

  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 md:px-6 bg-slate-50/50">
        <p className="text-xs text-slate-600">
          <b>{warnings.length.toLocaleString("vi-VN")}</b> cảnh báo {source}; thông tin liên kết
          theo MA_LK, HO_TEN, MA_BN.
        </p>
        <button
          disabled={!warnings.length}
          onClick={onExport}
          className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40 shadow-sm"
        >
          Xuất {source} XLSX
        </button>
      </div>
      {warnings.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-slate-500">
          Không có cảnh báo {source}.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-600 select-none">
              <tr>
                {columns
                  .filter((col) => isVisible(col.key))
                  .map((col) => (
                    <ResizableTh
                      key={col.key}
                      width={tabCols.widths[col.key] || col.defaultWidth}
                      onResize={(w) => onUpdateColumnWidth(col.key, w)}
                    >
                      {col.label}
                    </ResizableTh>
                  ))}
              </tr>
            </thead>
            <tbody>
              {warnings.map((warning, index) => (
                <tr
                  key={`${source}-${warning.MA_LK}-${warning.detailIndex}-${index}`}
                  className="border-t border-slate-100 bg-rose-50/60 hover:bg-rose-100/50 align-top"
                >
                  {source === "XML2" && isVisible("action") && (
                    <td style={colWidth("action", 115)} className="px-3 py-3">
                      {warning.MA_DICH_VU && (
                        <button
                          type="button"
                          onClick={() => onAddExcludedDrug(warning.MA_DICH_VU, warning.TEN_DICH_VU)}
                          className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800 hover:bg-amber-100 shadow-sm whitespace-nowrap"
                          title="Thêm thuốc này vào danh mục loại trừ XML2"
                        >
                          🛡️ Loại trừ thuốc
                        </button>
                      )}
                    </td>
                  )}
                  {isVisible("detailIndex") && (
                    <td
                      style={colWidth("detailIndex", 95)}
                      className="px-3 py-3 font-mono font-bold"
                    >
                      {warning.detailIndex}
                    </td>
                  )}
                  {isVisible("maLk") && (
                    <td
                      style={colWidth("maLk", 130)}
                      className="px-3 py-3 font-mono font-bold text-teal-800 break-all"
                    >
                      {warning.MA_LK || "—"}
                    </td>
                  )}
                  {isVisible("hoTen") && (
                    <td
                      style={colWidth("hoTen", 170)}
                      className="px-3 py-3 font-semibold text-slate-800 break-words"
                    >
                      {warning.HO_TEN || "Chưa có họ tên"}
                    </td>
                  )}
                  {isVisible("maBn") && (
                    <td
                      style={colWidth("maBn", 120)}
                      className="px-3 py-3 font-mono font-bold break-all"
                    >
                      {warning.MA_BN || "—"}
                    </td>
                  )}
                  {isVisible(source === "XML2" ? "maThuoc" : "maDichVu") && (
                    <td
                      style={colWidth(source === "XML2" ? "maThuoc" : "maDichVu", 130)}
                      className="px-3 py-3 font-mono"
                    >
                      {warning.MA_DICH_VU || "—"}
                    </td>
                  )}
                  {isVisible(source === "XML2" ? "tenThuoc" : "tenDichVu") && (
                    <td
                      style={colWidth(source === "XML2" ? "tenThuoc" : "tenDichVu", 220)}
                      className="px-3 py-3 font-medium text-slate-800 break-words"
                    >
                      {warning.TEN_DICH_VU || "—"}
                    </td>
                  )}
                  {isVisible("message") && (
                    <td
                      style={colWidth("message", 400)}
                      className="px-3 py-3 text-slate-700 font-semibold text-rose-800 break-words leading-relaxed"
                    >
                      {warning.message}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// COLUMN CUSTOMIZER MODAL
// ---------------------------------------------------------------------------
function ColumnCustomizerModal({
  activeTab,
  tabColumns,
  tabState,
  onToggleColumn,
  onSetAll,
  onResetTab,
  onClose,
}: {
  activeTab: AlertTab;
  tabColumns: ColumnDef[];
  tabState: TabColumnState;
  onToggleColumn: (key: string) => void;
  onSetAll: (isVisible: boolean) => void;
  onResetTab: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <span>⚙️</span> Tùy chỉnh cột hiển thị ·{" "}
              <span className="text-teal-700">{activeTab}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Chọn các cột muốn hiển thị hoặc ẩn trong bảng {activeTab}.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        <div className="my-4 flex items-center justify-between gap-2 border-b border-slate-100 pb-3 text-xs">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onSetAll(true)}
              className="rounded-lg bg-teal-50 px-2.5 py-1 text-teal-800 font-bold hover:bg-teal-100"
            >
              ✓ Hiện tất cả
            </button>
            <button
              type="button"
              onClick={() => onSetAll(false)}
              className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-600 font-semibold hover:bg-slate-200"
            >
              Ẩn tất cả
            </button>
          </div>
          <button
            type="button"
            onClick={onResetTab}
            className="rounded-lg border border-slate-300 px-2.5 py-1 text-slate-600 font-semibold hover:bg-slate-50"
          >
            ↺ Đặt lại cột mặc định
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto pr-1 grid grid-cols-2 gap-2">
          {tabColumns.map((col) => {
            const checked = tabState.visible[col.key] !== false;
            return (
              <label
                key={col.key}
                className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 text-xs transition ${
                  checked
                    ? "border-teal-300 bg-teal-50/50 text-teal-950 font-bold"
                    : "border-slate-200 bg-slate-50 text-slate-400"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleColumn(col.key)}
                  className="accent-teal-700 h-4 w-4"
                />
                <span className="truncate">{col.label}</span>
              </label>
            );
          })}
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-teal-700 px-5 py-2 text-xs font-bold text-white hover:bg-teal-800 shadow-sm"
          >
            Hoàn tất
          </button>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "blue",
  onClick,
}: {
  label: string;
  value: number;
  tone?: "blue" | "teal" | "rose" | "amber" | "slate";
  onClick?: () => void;
}) {
  const colors = {
    blue: "border-sky-200",
    teal: "border-teal-300",
    rose: "border-rose-400",
    amber: "border-amber-300",
    slate: "border-slate-300",
  };
  const content = (
    <>
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500 truncate">
        {label}
      </div>
      <div className="mt-0.5 text-xl font-black text-slate-800">
        {value.toLocaleString("vi-VN")}
      </div>
    </>
  );
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border-t-4 ${colors[tone]} bg-white px-3 py-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500`}
      title="Bấm để lọc chi tiết"
    >
      {content}
    </button>
  ) : (
    <div className={`rounded-2xl border-t-4 ${colors[tone]} bg-white px-3 py-2.5 shadow-sm`}>
      {content}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LIBRARY VIEW (DEDICATED TAB: SERVICE RULES & DRUG RULES & EXCEL IMPORT)
// ---------------------------------------------------------------------------
function LibraryView({
  serviceRules,
  drugRules,
  onSaveServiceRules,
  onAddServiceRule,
  onRemoveServiceRule,
  onSaveDrugRules,
  onAddDrugRule,
  onRemoveDrugRule,
  onExportBackup,
  onSendTelegramBackup,
  hasTelegramConfig,
  onExportTemplate,
  onExportToExcel,
  onImportExcel,
}: {
  serviceRules: ServiceRule[];
  drugRules: DrugRule[];
  onSaveServiceRules: (rules: ServiceRule[]) => Promise<void>;
  onAddServiceRule: (rule: ServiceRule) => Promise<void>;
  onRemoveServiceRule: (code: string) => Promise<void>;
  onSaveDrugRules: (rules: DrugRule[]) => Promise<void>;
  onAddDrugRule: (code: string, name: string) => Promise<void>;
  onRemoveDrugRule: (code: string) => Promise<void>;
  onExportBackup: () => void;
  onSendTelegramBackup: () => void;
  hasTelegramConfig: boolean;
  onExportTemplate: () => Promise<void>;
  onExportToExcel: () => Promise<void>;
  onImportExcel: (file: File, mode: "merge" | "overwrite") => Promise<void>;
}) {
  const [subTab, setSubTab] = useState<"service" | "drug">("service");

  // Service rule form state
  const [serviceSearch, setServiceSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "excluded" | "custom">("all");
  const [newServiceCode, setNewServiceCode] = useState("");
  const [newServiceName, setNewServiceName] = useState("");
  const [newRuleType, setNewRuleType] = useState<"exclude" | "limit">("limit");
  const [newMinMinutes, setNewMinMinutes] = useState("1");
  const [newMaxMinutes, setNewMaxMinutes] = useState("70");

  // Service editing state
  const [editingServiceCode, setEditingServiceCode] = useState<string | null>(null);
  const [editServiceName, setEditServiceName] = useState("");
  const [editServiceType, setEditServiceType] = useState<"exclude" | "limit">("limit");
  const [editMinMinutes, setEditMinMinutes] = useState("1");
  const [editMaxMinutes, setEditMaxMinutes] = useState("70");

  // Service simulator state
  const [testCode, setTestCode] = useState("");
  const [testDuration, setTestDuration] = useState("80");
  const [testResult, setTestResult] = useState<{
    appliedMin: number;
    appliedMax: number | null;
    isExcluded: boolean;
    isWarning: boolean;
    isUnderMin: boolean;
    isOverMax: boolean;
    diffMinutes: number;
    message: string;
  } | null>(null);

  // Drug rule form state
  const [drugSearch, setDrugSearch] = useState("");
  const [newDrugCode, setNewDrugCode] = useState("");
  const [newDrugName, setNewDrugName] = useState("");
  const [editingDrugCode, setEditingDrugCode] = useState<string | null>(null);
  const [editDrugName, setEditDrugName] = useState("");

  // Drug simulator state
  const [testDrugCode, setTestDrugCode] = useState("");
  const [testDrugResult, setTestDrugResult] = useState<{
    isExcluded: boolean;
    message: string;
  } | null>(null);

  // Excel Import state
  const [importMode, setImportMode] = useState<"merge" | "overwrite">("merge");
  const excelInputRef = useRef<HTMLInputElement>(null);

  // Filtered lists
  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    return serviceRules.filter((r) => {
      const matchSearch =
        !q || r.MA_DICH_VU.toLowerCase().includes(q) || r.TEN_DICH_VU.toLowerCase().includes(q);
      const matchFilter =
        filterType === "all" ||
        (filterType === "excluded" && r.maxMinutes === null) ||
        (filterType === "custom" && typeof r.maxMinutes === "number");
      return matchSearch && matchFilter;
    });
  }, [serviceRules, serviceSearch, filterType]);

  const filteredDrugs = useMemo(() => {
    const q = drugSearch.trim().toLowerCase();
    return drugRules.filter(
      (r) => !q || r.MA_THUOC.toLowerCase().includes(q) || r.TEN_THUOC.toLowerCase().includes(q),
    );
  }, [drugRules, drugSearch]);

  const excludedCount = useMemo(
    () => serviceRules.filter((r) => r.maxMinutes === null).length,
    [serviceRules],
  );
  const customLimitCount = useMemo(
    () => serviceRules.filter((r) => typeof r.maxMinutes === "number").length,
    [serviceRules],
  );

  const handleAddServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = newServiceCode.trim();
    if (!cleanCode) return;

    const minMinutes = Math.max(0, Number(newMinMinutes) || 1);
    const rule: ServiceRule = {
      MA_DICH_VU: cleanCode,
      TEN_DICH_VU: newServiceName.trim(),
      minMinutes,
      maxMinutes: newRuleType === "exclude" ? null : Math.max(0, Number(newMaxMinutes) || 70),
    };
    await onAddServiceRule(rule);
    setNewServiceCode("");
    setNewServiceName("");
    setNewMinMinutes("1");
    setNewMaxMinutes("70");
  };

  const handleAddDrugSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = newDrugCode.trim();
    if (!cleanCode) return;
    await onAddDrugRule(cleanCode, newDrugName.trim());
    setNewDrugCode("");
    setNewDrugName("");
  };

  const saveServiceEdit = async () => {
    if (!editingServiceCode) return;
    const updated = serviceRules.map((r) => {
      if (r.MA_DICH_VU === editingServiceCode) {
        return {
          ...r,
          TEN_DICH_VU: editServiceName.trim(),
          minMinutes: Math.max(0, Number(editMinMinutes) || 1),
          maxMinutes:
            editServiceType === "exclude" ? null : Math.max(0, Number(editMaxMinutes) || 70),
        };
      }
      return r;
    });
    await onSaveServiceRules(updated);
    setEditingServiceCode(null);
  };

  const saveDrugEdit = async () => {
    if (!editingDrugCode) return;
    const updated = drugRules.map((r) => {
      if (r.MA_THUOC === editingDrugCode) {
        return {
          ...r,
          TEN_THUOC: editDrugName.trim(),
        };
      }
      return r;
    });
    await onSaveDrugRules(updated);
    setEditingDrugCode(null);
  };

  const handleRunServiceTest = (e: React.FormEvent) => {
    e.preventDefault();
    const code = testCode.trim();
    const duration = Number(testDuration) || 0;
    const matched = serviceRules.find((r) => r.MA_DICH_VU.toLowerCase() === code.toLowerCase());

    const minLimit =
      matched?.minMinutes !== undefined && matched?.minMinutes !== null ? matched.minMinutes : 1;
    const maxLimit =
      matched?.maxMinutes !== undefined ? matched.maxMinutes : DURATION_LIMIT_MINUTES;

    if (matched && matched.maxMinutes === null) {
      setTestResult({
        appliedMin: minLimit,
        appliedMax: null,
        isExcluded: true,
        isWarning: false,
        isUnderMin: false,
        isOverMax: false,
        diffMinutes: 0,
        message: `Dịch vụ [${matched.MA_DICH_VU}] được cấu hình LOẠI TRỪ khỏi cảnh báo thời lượng.`,
      });
      return;
    }

    if (duration < minLimit) {
      const under = minLimit - duration;
      setTestResult({
        appliedMin: minLimit,
        appliedMax: maxLimit,
        isExcluded: false,
        isWarning: true,
        isUnderMin: true,
        isOverMax: false,
        diffMinutes: under,
        message:
          minLimit === 1 && duration === 0
            ? `CẢNH BÁO: Thời lượng 0 phút (yêu cầu thời gian phải > 0 phút).`
            : `CẢNH BÁO: Thời lượng ${duration} phút nhỏ hơn thời gian tối thiểu quy định (${minLimit} phút).`,
      });
    } else if (maxLimit !== null && duration > maxLimit) {
      const over = duration - maxLimit;
      setTestResult({
        appliedMin: minLimit,
        appliedMax: maxLimit,
        isExcluded: false,
        isWarning: true,
        isUnderMin: false,
        isOverMax: true,
        diffMinutes: over,
        message: `CẢNH BÁO: Vượt ${over} phút so với ngưỡng tối đa ${maxLimit} phút.`,
      });
    } else {
      setTestResult({
        appliedMin: minLimit,
        appliedMax: maxLimit,
        isExcluded: false,
        isWarning: false,
        isUnderMin: false,
        isOverMax: false,
        diffMinutes: 0,
        message: `ĐẠT YÊU CẦU: Nằm trong khoảng thời gian hợp lệ (${minLimit > 1 ? `${minLimit}–` : "≤ "}${maxLimit} phút).`,
      });
    }
  };

  const handleRunDrugTest = (e: React.FormEvent) => {
    e.preventDefault();
    const code = testDrugCode.trim();
    const matched = drugRules.find((r) => r.MA_THUOC.toLowerCase() === code.toLowerCase());
    if (matched && matched.excluded) {
      setTestDrugResult({
        isExcluded: true,
        message: `Thuốc [${matched.MA_THUOC}] ${matched.TEN_THUOC ? `(${matched.TEN_THUOC})` : ""} ĐƯỢC LOẠI TRỪ khỏi cảnh báo thiếu TT_THAU XML2.`,
      });
    } else {
      setTestDrugResult({
        isExcluded: false,
        message: `Thuốc [${code}] CHƯA LOẠI TRỪ. Nếu thiếu TT_THAU trong XML2, hệ thống sẽ cảnh báo.`,
      });
    }
  };

  const handleExcelFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onImportExcel(file, importMode);
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-teal-100 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-teal-700">
              Quản lý danh mục & quy tắc
            </div>
            <h2 className="mt-1 text-2xl font-black text-slate-900">
              Thư viện Dịch vụ kỹ thuật & Thuốc loại trừ XML2
            </h2>
            <p className="mt-1 text-sm text-slate-500 max-w-2xl">
              Cấu hình thời gian tối thiểu (mặc định &gt; 0) &amp; tối đa cho từng dịch vụ kỹ thuật,
              danh mục thuốc loại trừ TT_THAU, hỗ trợ nhập/xuất file Excel mẫu.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onExportTemplate}
              className="rounded-xl border border-teal-600 bg-teal-50 px-3.5 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100 shadow-sm flex items-center gap-1.5"
              title="Tải về file Excel mẫu chuẩn để điền và nạp vào thư viện"
            >
              <span>📥 Tải Excel mẫu</span>
            </button>
            <button
              onClick={onExportToExcel}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm flex items-center gap-1.5"
              title="Xuất danh mục DVKT và thuốc hiện có ra file Excel"
            >
              <span>📊 Xuất Excel Thư viện</span>
            </button>
            <label className="flex items-center gap-1 rounded-xl bg-teal-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-teal-800 shadow-sm cursor-pointer">
              <span>📤 Nạp từ Excel</span>
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleExcelFileInput}
              />
            </label>
            <select
              value={importMode}
              onChange={(e) => setImportMode(e.target.value as "merge" | "overwrite")}
              className="rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
              title="Chế độ nạp khi import file Excel"
            >
              <option value="merge">Chế độ: Gộp (Merge)</option>
              <option value="overwrite">Chế độ: Ghi đè (Overwrite)</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex gap-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => setSubTab("service")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              subTab === "service"
                ? "bg-teal-700 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            🩺 Dịch vụ kỹ thuật & VTYT ({serviceRules.length})
          </button>
          <button
            onClick={() => setSubTab("drug")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              subTab === "drug"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            💊 Thuốc loại trừ XML2 ({drugRules.length})
          </button>
        </div>

        {subTab === "service" ? (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4">
              <div className="text-xs font-bold text-teal-800 uppercase">Tổng quy tắc DVKT</div>
              <div className="mt-1 text-2xl font-black text-teal-900">{serviceRules.length}</div>
              <div className="mt-1 text-xs text-slate-500">
                Mặc định thời gian tối thiểu &gt; 0 phút
              </div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
              <div className="text-xs font-bold text-amber-800 uppercase">Loại trừ hoàn toàn</div>
              <div className="mt-1 text-2xl font-black text-amber-900">{excludedCount}</div>
              <div className="mt-1 text-xs text-slate-500">
                Không bao giờ tạo cảnh báo thời lượng
              </div>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4">
              <div className="text-xs font-bold text-sky-800 uppercase">Ngưỡng riêng</div>
              <div className="mt-1 text-2xl font-black text-sky-900">{customLimitCount}</div>
              <div className="mt-1 text-xs text-slate-500">
                Áp dụng thời gian tối thiểu &amp; tối đa riêng
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
              <div className="text-xs font-bold text-amber-800 uppercase">
                Tổng mã thuốc loại trừ XML2
              </div>
              <div className="mt-1 text-2xl font-black text-amber-900">{drugRules.length}</div>
              <div className="mt-1 text-xs text-slate-500">
                Các thuốc này khi thiếu TT_THAU trong XML2 sẽ không bị cảnh báo
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col justify-center">
              <div className="text-xs font-bold text-slate-700">
                Loại trừ nhanh từ bảng cảnh báo
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Khi xem tab <b>XML2</b> trong phần kiểm tra, bạn có thể bấm nút{" "}
                <b>[🛡️ Loại trừ thuốc]</b> trên từng dòng để thêm thuốc vào danh mục này ngay lập
                tức.
              </div>
            </div>
          </div>
        )}
      </div>

      {subTab === "service" ? (
        <>
          {/* Grid 2 cột: Thêm mới DVKT & Simulator DVKT */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <span>➕</span> Thêm dịch vụ vào thư viện
              </h3>
              <form onSubmit={handleAddServiceSubmit} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Mã dịch vụ (MA_DICH_VU) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newServiceCode}
                    onChange={(e) => setNewServiceCode(e.target.value)}
                    placeholder="VD: 04.0123, C01.002..."
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm font-bold text-slate-900 focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tên dịch vụ kỹ thuật / Vật tư
                  </label>
                  <input
                    type="text"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    placeholder="VD: Phẫu thuật nội soi ổ bụng, Chụp CT 128 dãy..."
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Thời gian tối thiểu (phút)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={newMinMinutes}
                      onChange={(e) => setNewMinMinutes(e.target.value)}
                      placeholder="Mặc định: 1 (> 0)"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm font-bold text-slate-900 focus:border-teal-500 focus:outline-none"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      Mặc định là 1 (yêu cầu &gt; 0 phút)
                    </p>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Thời gian tối đa (phút)
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      disabled={newRuleType === "exclude"}
                      required={newRuleType !== "exclude"}
                      value={newMaxMinutes}
                      onChange={(e) => setNewMaxMinutes(e.target.value)}
                      placeholder="Mặc định: 70"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm font-bold text-slate-900 focus:border-teal-500 focus:outline-none disabled:bg-slate-100 disabled:opacity-50"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">Mặc định chuẩn là 70 phút</p>
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quy tắc thời lượng</label>
                  <div className="grid grid-cols-2 gap-2">
                    <label
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 ${
                        newRuleType === "limit"
                          ? "border-teal-500 bg-teal-50 text-teal-900 font-bold"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      <input
                        type="radio"
                        name="ruleType"
                        checked={newRuleType === "limit"}
                        onChange={() => setNewRuleType("limit")}
                        className="accent-teal-600"
                      />
                      <span>Kiểm tra thời gian (Min/Max)</span>
                    </label>
                    <label
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 ${
                        newRuleType === "exclude"
                          ? "border-amber-500 bg-amber-50 text-amber-900 font-bold"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      <input
                        type="radio"
                        name="ruleType"
                        checked={newRuleType === "exclude"}
                        onChange={() => setNewRuleType("exclude")}
                        className="accent-amber-600"
                      />
                      <span>Loại trừ hoàn toàn</span>
                    </label>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-teal-700 py-2.5 text-xs font-bold text-white hover:bg-teal-800 shadow-sm"
                >
                  Lưu vào Thư viện
                </button>
              </form>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <span>🧪</span> Kiểm tra thử quy tắc DVKT (Simulator)
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Thử nghiệm nhanh xem một mã dịch vụ với thời lượng cụ thể có vi phạm thời gian tối
                thiểu hoặc tối đa không.
              </p>
              <form onSubmit={handleRunServiceTest} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã dịch vụ cần thử</label>
                  <input
                    type="text"
                    required
                    value={testCode}
                    onChange={(e) => setTestCode(e.target.value)}
                    placeholder="Nhập mã dịch vụ..."
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm font-bold text-slate-900 focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Thời gian thực tế (phút)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={testDuration}
                    onChange={(e) => setTestDuration(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm font-bold text-slate-900 focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-white hover:bg-slate-900 shadow-sm"
                >
                  Kiểm tra kết quả
                </button>
              </form>

              {testResult && (
                <div
                  className={`mt-4 rounded-2xl border p-4 text-xs ${
                    testResult.isWarning
                      ? "border-rose-300 bg-rose-50 text-rose-950"
                      : testResult.isExcluded
                        ? "border-amber-300 bg-amber-50 text-amber-950"
                        : "border-teal-300 bg-teal-50 text-teal-950"
                  }`}
                >
                  <div className="font-bold text-sm mb-1 flex items-center gap-2">
                    <span>{testResult.isWarning ? "⚠️" : testResult.isExcluded ? "🛡️" : "✅"}</span>
                    <span>
                      {testResult.isWarning
                        ? testResult.isUnderMin
                          ? "CẢNH BÁO: DƯỚI THỜI GIAN TỐI THIỂU"
                          : "CẢNH BÁO: VƯỢT THỜI GIAN TỐI ĐA"
                        : testResult.isExcluded
                          ? "ĐƯỢC LOẠI TRỪ HOÀN TOÀN"
                          : "ĐẠT YÊU CẦU THỜI LƯỢNG"}
                    </span>
                  </div>
                  <p className="leading-relaxed">{testResult.message}</p>
                </div>
              )}
            </div>
          </div>

          {/* Bảng danh sách DVKT */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
              <h3 className="font-bold text-slate-900">
                Danh sách dịch vụ trong thư viện ({filteredServices.length})
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  placeholder="Tìm theo mã hoặc tên..."
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none min-w-[200px]"
                />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as "all" | "excluded" | "custom")}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-700 bg-white focus:outline-none"
                >
                  <option value="all">Tất cả quy tắc</option>
                  <option value="excluded">Chỉ loại trừ</option>
                  <option value="custom">Chỉ có ngưỡng riêng</option>
                </select>
              </div>
            </div>

            {filteredServices.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                Không có dịch vụ nào phù hợp với tìm kiếm.
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-bold">STT</th>
                      <th className="px-4 py-3 font-bold">Mã dịch vụ</th>
                      <th className="px-4 py-3 font-bold">Tên dịch vụ</th>
                      <th className="px-4 py-3 font-bold">Thời gian tối thiểu</th>
                      <th className="px-4 py-3 font-bold">Thời gian tối đa</th>
                      <th className="px-4 py-3 font-bold text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredServices.map((rule, idx) => {
                      const isEditing = editingServiceCode === rule.MA_DICH_VU;
                      return (
                        <tr
                          key={rule.MA_DICH_VU}
                          className={`border-t border-slate-100 ${
                            isEditing ? "bg-teal-50/60" : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="px-4 py-3 font-mono text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-3 font-mono font-bold text-teal-800">
                            {rule.MA_DICH_VU}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editServiceName}
                                onChange={(e) => setEditServiceName(e.target.value)}
                                className="w-full rounded-lg border border-teal-400 bg-white px-2 py-1 text-xs"
                              />
                            ) : (
                              rule.TEN_DICH_VU || (
                                <span className="text-slate-400 italic">(chưa có tên)</span>
                              )
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono">
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                value={editMinMinutes}
                                onChange={(e) => setEditMinMinutes(e.target.value)}
                                className="w-20 rounded-lg border border-teal-400 bg-white px-2 py-1 text-xs font-mono"
                                placeholder="≥ 1"
                              />
                            ) : (
                              <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                                ≥ {rule.minMinutes ?? 1} phút
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <select
                                  value={editServiceType}
                                  onChange={(e) =>
                                    setEditServiceType(e.target.value as "exclude" | "limit")
                                  }
                                  className="rounded-lg border border-teal-400 bg-white px-2 py-1 text-xs"
                                >
                                  <option value="limit">Ngưỡng tối đa</option>
                                  <option value="exclude">Loại trừ</option>
                                </select>
                                {editServiceType === "limit" && (
                                  <input
                                    type="number"
                                    min="1"
                                    value={editMaxMinutes}
                                    onChange={(e) => setEditMaxMinutes(e.target.value)}
                                    className="w-20 rounded-lg border border-teal-400 bg-white px-2 py-1 text-xs font-mono"
                                  />
                                )}
                              </div>
                            ) : rule.maxMinutes === null ? (
                              <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                                🛡️ Loại trừ cảnh báo
                              </span>
                            ) : (
                              <span className="inline-block rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-bold text-teal-800 font-mono">
                                ≤ {rule.maxMinutes} phút
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isEditing ? (
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={saveServiceEdit}
                                  className="rounded-lg bg-teal-700 px-3 py-1 text-xs font-bold text-white hover:bg-teal-800"
                                >
                                  Lưu
                                </button>
                                <button
                                  onClick={() => setEditingServiceCode(null)}
                                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                  Hủy
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingServiceCode(rule.MA_DICH_VU);
                                    setEditServiceName(rule.TEN_DICH_VU);
                                    setEditMinMinutes(String(rule.minMinutes ?? 1));
                                    setEditServiceType(
                                      rule.maxMinutes === null ? "exclude" : "limit",
                                    );
                                    setEditMaxMinutes(
                                      rule.maxMinutes === null ? "70" : String(rule.maxMinutes),
                                    );
                                  }}
                                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                >
                                  Sửa
                                </button>
                                <button
                                  onClick={() => onRemoveServiceRule(rule.MA_DICH_VU)}
                                  className="rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                                >
                                  Xóa
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Grid 2 cột: Thêm mới Thuốc & Simulator Thuốc */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <span>💊</span> Thêm thuốc loại trừ XML2
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Các thuốc có mã trong danh mục này sẽ không bị báo lỗi thiếu TT_THAU ở XML2.
              </p>
              <form onSubmit={handleAddDrugSubmit} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Mã thuốc (MA_THUOC) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newDrugCode}
                    onChange={(e) => setNewDrugCode(e.target.value)}
                    placeholder="VD: 40.123, TH001..."
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm font-bold text-slate-900 focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tên thuốc / Hoạt chất
                  </label>
                  <input
                    type="text"
                    value={newDrugName}
                    onChange={(e) => setNewDrugName(e.target.value)}
                    placeholder="VD: Paracetamol 500mg, Kháng sinh..."
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-amber-600 py-2.5 text-xs font-bold text-white hover:bg-amber-700 shadow-sm"
                >
                  Thêm vào Danh mục Loại trừ Thuốc
                </button>
              </form>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <span>🧪</span> Kiểm tra thử mã thuốc (Simulator)
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Nhập mã thuốc để xem thuốc này đã được loại trừ khỏi cảnh báo TT_THAU XML2 chưa.
              </p>
              <form onSubmit={handleRunDrugTest} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã thuốc cần thử</label>
                  <input
                    type="text"
                    required
                    value={testDrugCode}
                    onChange={(e) => setTestDrugCode(e.target.value)}
                    placeholder="Nhập mã thuốc..."
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm font-bold text-slate-900 focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-white hover:bg-slate-900 shadow-sm"
                >
                  Kiểm tra trạng thái loại trừ
                </button>
              </form>

              {testDrugResult && (
                <div
                  className={`mt-4 rounded-2xl border p-4 text-xs ${
                    testDrugResult.isExcluded
                      ? "border-amber-300 bg-amber-50 text-amber-950"
                      : "border-slate-300 bg-slate-50 text-slate-900"
                  }`}
                >
                  <div className="font-bold text-sm mb-1 flex items-center gap-2">
                    <span>{testDrugResult.isExcluded ? "🛡️" : "ℹ️"}</span>
                    <span>
                      {testDrugResult.isExcluded ? "THUỐC ĐÃ ĐƯỢC LOẠI TRỪ" : "THUỐC CHƯA LOẠI TRỪ"}
                    </span>
                  </div>
                  <p className="leading-relaxed">{testDrugResult.message}</p>
                </div>
              )}
            </div>
          </div>

          {/* Bảng danh sách Thuốc loại trừ */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
              <h3 className="font-bold text-slate-900">
                Danh sách thuốc loại trừ XML2 ({filteredDrugs.length})
              </h3>
              <input
                type="text"
                value={drugSearch}
                onChange={(e) => setDrugSearch(e.target.value)}
                placeholder="Tìm theo mã thuốc hoặc tên..."
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none min-w-[240px]"
              />
            </div>

            {filteredDrugs.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                {drugRules.length === 0
                  ? "Danh mục thuốc loại trừ hiện đang trống. Bạn có thể thêm thuốc ở form trên hoặc bấm [Loại trừ thuốc] trong tab XML2."
                  : "Không tìm thấy mã thuốc nào phù hợp."}
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-bold">STT</th>
                      <th className="px-4 py-3 font-bold">Mã thuốc (MA_THUOC)</th>
                      <th className="px-4 py-3 font-bold">Tên thuốc / Hoạt chất</th>
                      <th className="px-4 py-3 font-bold">Trạng thái XML2</th>
                      <th className="px-4 py-3 font-bold text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDrugs.map((rule, idx) => {
                      const isEditing = editingDrugCode === rule.MA_THUOC;
                      return (
                        <tr
                          key={rule.MA_THUOC}
                          className={`border-t border-slate-100 ${
                            isEditing ? "bg-amber-50/60" : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="px-4 py-3 font-mono text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-3 font-mono font-bold text-amber-900">
                            {rule.MA_THUOC}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editDrugName}
                                onChange={(e) => setEditDrugName(e.target.value)}
                                className="w-full rounded-lg border border-amber-400 bg-white px-2 py-1 text-xs"
                              />
                            ) : (
                              rule.TEN_THUOC || (
                                <span className="text-slate-400 italic">(chưa có tên)</span>
                              )
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                              🛡️ Loại trừ cảnh báo TT_THAU
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isEditing ? (
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={saveDrugEdit}
                                  className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-bold text-white hover:bg-amber-700"
                                >
                                  Lưu
                                </button>
                                <button
                                  onClick={() => setEditingDrugCode(null)}
                                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                  Hủy
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingDrugCode(rule.MA_THUOC);
                                    setEditDrugName(rule.TEN_THUOC);
                                  }}
                                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                >
                                  Sửa
                                </button>
                                <button
                                  onClick={() => onRemoveDrugRule(rule.MA_THUOC)}
                                  className="rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                                >
                                  Xóa
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SETTINGS, TELEGRAM & BACKUP VIEW
// ---------------------------------------------------------------------------
function SettingsBackupView({
  telegramConfig,
  columnsConfig,
  onSaveTelegramConfig,
  onTestTelegram,
  onResetColumnsForTab,
  onResetAllColumns,
  onExportLibraryBackup,
  onExportFullBackup,
  onSendTelegramBackup,
  onSendTelegramReport,
  hasAnalysis,
  onRestoreBackup,
  onResetAllDefaults,
}: {
  telegramConfig: TelegramConfig;
  columnsConfig: AllTabsColumnConfig;
  onSaveTelegramConfig: (cfg: TelegramConfig) => void;
  onTestTelegram: (token: string, chatId: string) => Promise<{ ok: boolean; description?: string }>;
  onResetColumnsForTab: (tab: AlertTab) => void;
  onResetAllColumns: () => void;
  onExportLibraryBackup: () => void;
  onExportFullBackup: () => void;
  onSendTelegramBackup: (type: "library" | "full") => void;
  onSendTelegramReport: () => void;
  hasAnalysis: boolean;
  onRestoreBackup: (parsed: ParsedBackupResult) => void;
  onResetAllDefaults: () => void;
}) {
  const [botToken, setBotToken] = useState(telegramConfig.botToken);
  const [chatId, setChatId] = useState(telegramConfig.chatId);
  const [enabled, setEnabled] = useState(telegramConfig.enabled);
  const [autoSend, setAutoSend] = useState(telegramConfig.autoSendOnAnalysis);
  const [isTesting, setIsTesting] = useState(false);
  const [restoreNotice, setRestoreNotice] = useState("");

  const handleSaveTelegram = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveTelegramConfig({
      botToken: botToken.trim(),
      chatId: chatId.trim(),
      enabled,
      autoSendOnAnalysis: autoSend,
    });
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      await onTestTelegram(botToken, chatId);
    } finally {
      setIsTesting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseBackupJson(text);
      onRestoreBackup(parsed);
      setRestoreNotice(
        `✅ Khôi phục thành công từ file [${file.name}]: ${
          parsed.type === "library" ? "Thư viện dịch vụ & thuốc" : "Toàn bộ cấu hình"
        } (${parsed.itemCount} mục).`,
      );
    } catch (err) {
      setRestoreNotice(
        `❌ Lỗi khi đọc file backup: ${err instanceof Error ? err.message : "Định dạng không hợp lệ"}`,
      );
    }
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-teal-100 bg-white p-6 shadow-sm md:p-8">
        <div className="text-xs font-black uppercase tracking-wider text-teal-700">
          Cài đặt & Tích hợp
        </div>
        <h2 className="mt-1 text-2xl font-black text-slate-900">
          Cấu hình Telegram, Tùy chỉnh cột & Sao lưu
        </h2>
        <p className="mt-1 text-sm text-slate-500 max-w-3xl">
          Tùy chỉnh kết nối gửi báo cáo trực tiếp về kênh Telegram của bạn, quản lý kích thước cột
          từng bảng và xuất/nhập file sao lưu toàn trang.
        </p>
      </div>

      {/* Cấu hình Telegram */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="grid h-10 w-10 place-content-center rounded-2xl bg-[#229ED9]/10 text-xl text-[#229ED9]">
            ✈️
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Cấu hình Bot Telegram</h3>
            <p className="text-xs text-slate-500">
              Gửi trực tiếp báo cáo Excel và file backup về Telegram cá nhân hoặc Group giám định.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveTelegram} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Bot Token</label>
              <input
                type="text"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="VD: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900 focus:border-teal-500 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Lấy từ <b>@BotFather</b> trên Telegram
              </p>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Chat ID / Channel ID</label>
              <input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="VD: 987654321 hoặc -100123456789..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900 focus:border-teal-500 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Lấy qua <b>@userinfobot</b> hoặc <b>@getidsbot</b>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="accent-teal-700 h-4 w-4"
              />
              <span>Bật tính năng gửi Telegram</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={autoSend}
                onChange={(e) => setAutoSend(e.target.checked)}
                className="accent-teal-700 h-4 w-4"
              />
              <span>Tự động gửi báo cáo Excel khi phân tích xong</span>
            </label>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            <button
              type="submit"
              className="rounded-xl bg-teal-700 px-5 py-2 text-xs font-bold text-white hover:bg-teal-800 shadow-sm"
            >
              Lưu cấu hình Telegram
            </button>
            <button
              type="button"
              disabled={isTesting || !botToken || !chatId}
              onClick={handleTest}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              {isTesting ? "Đang gửi thử..." : "🔔 Gửi tin nhắn kiểm tra kết nối"}
            </button>
            {hasAnalysis && (
              <button
                type="button"
                onClick={onSendTelegramReport}
                className="rounded-xl bg-[#229ED9] px-4 py-2 text-xs font-bold text-white hover:bg-[#1e8ec3] shadow-sm"
              >
                📊 Gửi Báo cáo Excel hiện tại
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Quản lý Cột các tab */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="grid h-10 w-10 place-content-center rounded-2xl bg-teal-50 text-xl text-teal-700">
            📐
          </div>
          <div>
            <h3 className="font-bold text-slate-900">
              Quản lý Cột hiển thị (XML1, XML2, XML3, XML4)
            </h3>
            <p className="text-xs text-slate-500">
              Khôi phục nhanh kích thước hoặc danh sách cột cho từng bảng hoặc toàn bộ ứng dụng.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {(["XML1", "XML2", "XML3", "XML4"] as AlertTab[]).map((tab) => {
            const visibleCount = TAB_COLUMNS[tab].filter(
              (c) => columnsConfig[tab]?.visible[c.key] !== false,
            ).length;
            return (
              <div
                key={tab}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="font-bold text-slate-800 text-sm">{tab}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Hiển thị:{" "}
                    <b>
                      {visibleCount}/{TAB_COLUMNS[tab].length}
                    </b>{" "}
                    cột
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onResetColumnsForTab(tab)}
                  className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100 text-left text-[11px]"
                >
                  ↺ Đặt lại cột {tab}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onResetAllColumns}
            className="rounded-xl border border-teal-300 bg-teal-50 px-4 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100"
          >
            ↺ Đặt lại toàn bộ cột 4 tab về mặc định
          </button>
        </div>
      </div>

      {/* Sao lưu và Khôi phục */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Sao lưu */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-content-center rounded-2xl bg-amber-50 text-xl text-amber-700">
              💾
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Tạo File Sao Lưu (Backup)</h3>
              <p className="text-xs text-slate-500">
                Xuất file JSON lưu trữ dự phòng hoặc chia sẻ cấu hình sang máy khác.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-slate-800 text-xs">
                  Backup Thư viện (DVKT & Thuốc)
                </div>
                <div className="text-[11px] text-slate-500">
                  Sao lưu quy tắc DVKT và danh mục thuốc loại trừ XML2
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={onExportLibraryBackup}
                  className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-800 shadow-sm"
                >
                  Tải JSON
                </button>
                {botToken && chatId && (
                  <button
                    type="button"
                    onClick={() => onSendTelegramBackup("library")}
                    className="rounded-lg bg-[#229ED9] px-2.5 py-1.5 text-xs font-bold text-white hover:bg-[#1e8ec3]"
                    title="Gửi file backup thư viện qua Telegram"
                  >
                    Telegram
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-slate-800 text-xs">Backup Cấu hình Toàn Trang</div>
                <div className="text-[11px] text-slate-500">
                  Bao gồm thư viện, thuốc loại trừ, cấu hình cột 4 tab & Telegram
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={onExportFullBackup}
                  className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-800 shadow-sm"
                >
                  Tải JSON
                </button>
                {botToken && chatId && (
                  <button
                    type="button"
                    onClick={() => onSendTelegramBackup("full")}
                    className="rounded-lg bg-[#229ED9] px-2.5 py-1.5 text-xs font-bold text-white hover:bg-[#1e8ec3]"
                    title="Gửi file backup toàn trang qua Telegram"
                  >
                    Telegram
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Khôi phục */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-content-center rounded-2xl bg-teal-50 text-xl text-teal-700">
              📥
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Khôi phục từ File (Restore)</h3>
              <p className="text-xs text-slate-500">
                Nạp file backup JSON thư viện hoặc cấu hình toàn trang đã lưu trước đó.
              </p>
            </div>
          </div>

          <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 text-center transition hover:border-teal-500 hover:bg-teal-50">
            <span className="text-2xl">📁</span>
            <span className="mt-1 text-xs font-bold text-teal-800">
              Bấm để chọn file backup (.json)
            </span>
            <span className="mt-0.5 text-[11px] text-slate-400">
              Hỗ trợ cả file backup thư viện và backup toàn trang
            </span>
            <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
          </label>

          {restoreNotice && (
            <div className="rounded-xl bg-slate-100 p-3 text-xs text-slate-800 font-medium">
              {restoreNotice}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
            <span className="text-[11px] text-slate-400">Cài đặt mặc định hệ thống</span>
            <button
              type="button"
              onClick={onResetAllDefaults}
              className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
            >
              Đặt lại tất cả về mặc định
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GUIDE, ABOUT, SUPPORT VIEWS
// ---------------------------------------------------------------------------
function GuideView() {
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageTitle
        eyebrow="Hướng dẫn sử dụng"
        title="Kiểm tra thời gian XML3, Thông tin thầu TT_THAU & Import Excel thư viện"
        description="Quy trình kiểm tra chênh lệch thời gian NGAY_KQ - NGAY_TH_YL (tối thiểu & tối đa), TT_THAU trên XML2 và XML3, hỗ trợ nhập file Excel danh mục và tùy chỉnh cột."
      />
      <section className="grid gap-4 md:grid-cols-3">
        <GuideCard
          number="01"
          title="Chọn file XML"
          text="Chọn một hoặc nhiều file XML hồ sơ có các FILEHOSO (XML1, XML2, XML3, XML4) được mã hóa Base64."
        />
        <GuideCard
          number="02"
          title="Phân tích dữ liệu"
          text="Bấm Phân tích XML. Công cụ tự giải mã NOIDUNGFILE, liên kết thông tin bệnh nhân và kiểm tra toàn bộ quy tắc."
        />
        <GuideCard
          number="03"
          title="Tùy chỉnh & Báo cáo"
          text="Tùy biến cột hiển thị, thêm dịch vụ/thuốc loại trừ, kéo thả độ rộng cột và gửi báo cáo qua Telegram hoặc xuất Excel."
        />
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-bold text-slate-900">Các trường và quy tắc chính</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">Trường</th>
                <th className="px-3 py-3">Bảng</th>
                <th className="px-3 py-3">Quy tắc kiểm tra</th>
              </tr>
            </thead>
            <tbody>
              {[
                [
                  "TT_THAU",
                  "XML2 (cột 15)",
                  "Bắt buộc không được để rỗng (trừ các mã thuốc được thêm vào danh mục loại trừ). Cảnh báo: 'XML2. Chi tiết thứ xxx: Thiếu thông tin TT_THAU'",
                ],
                [
                  "TT_THAU",
                  "XML3 (cột 19)",
                  "Khi MA_NHOM = 10 hoặc 11 (VTYT), bắt buộc không được để rỗng. Cảnh báo: 'XML3: TT_THAU không được để trống khi mã nhóm bằng 10 hoặc 11'",
                ],
                [
                  "MA_NHOM",
                  "XML3 (cột 6)",
                  "Mã nhóm dùng để lọc cảnh báo thời lượng; có đủ 18 mã. Nhóm 2, 3, 8, 18 mặc định kiểm tra thời lượng.",
                ],
                [
                  "NGAY_TH_YL, NGAY_KQ",
                  "XML3 (cột 38, 39)",
                  "Thời lượng = NGAY_KQ - NGAY_TH_YL. Cảnh báo khi <= 0 phút (hoặc dưới thời gian tối thiểu), hoặc > 70 phút (hoặc vượt thời gian tối đa).",
                ],
                [
                  "NGAY_YL, NGAY_TH_YL, NGAY_KQ",
                  "XML3",
                  "Kiểm tra trình tự logic (YL ≤ TH_YL ≤ KQ) và cảnh báo trùng mốc thời gian.",
                ],
                ["SO_CCCD", "XML1", "Định dạng 9–12 chữ số."],
                ["KET_LUAN", "XML4", "Bắt buộc có KET_LUAN khi XML3 có MA_NHOM = 2 (CĐHA)."],
              ].map(([field, position, role]) => (
                <tr key={`${field}-${position}`} className="border-t border-slate-100">
                  <td className="px-3 py-3 font-mono font-semibold text-teal-700">{field}</td>
                  <td className="px-3 py-3 font-medium text-slate-800">{position}</td>
                  <td className="px-3 py-3 text-slate-600">{role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function GuideCard({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-teal-100 bg-white p-5 shadow-sm">
      <div className="text-3xl font-black text-teal-200">{number}</div>
      <h2 className="mt-3 font-bold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
    </div>
  );
}

function PageTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">{eyebrow}</div>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
        {title}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function AboutView() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageTitle
        eyebrow="Thông tin ứng dụng"
        title={APP_META.name}
        description="Công cụ rà soát thời lượng dịch vụ kỹ thuật, vật tư y tế và thông tin thầu trong hồ sơ XML giám định BHYT."
      />
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <Info label="Phiên bản" value={APP_META.version} />
          <Info label="Ngày phát hành" value={APP_META.date} />
          <Info label="Tác giả" value={APP_META.author} />
          <Info label="Múi giờ" value="Asia/Ho_Chi_Minh (GMT+7)" />
        </div>
        <div className="mt-6 border-t border-slate-100 pt-5 text-sm text-slate-600">
          Mã nguồn:{" "}
          <a
            className="font-semibold text-teal-700 underline"
            href={APP_META.github}
            target="_blank"
            rel="noreferrer"
          >
            {APP_META.github}
          </a>
        </div>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-bold text-slate-900">Lịch sử phiên bản</h2>
        <div className="mt-4 space-y-3">
          {APP_META.changelog.map((entry) => (
            <div key={entry.version} className="rounded-2xl bg-slate-50 p-4 text-sm">
              <div className="font-bold text-teal-700">
                v{entry.version} · {entry.date}
              </div>
              <ul className="mt-1.5 list-disc list-inside text-xs text-slate-600 space-y-1">
                {entry.changes.map((change, i) => (
                  <li key={i}>{change}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function SupportView() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle eyebrow="Ủng hộ tác giả" title="Mời cà phê" description={APP_META.coffee.blurb} />
      <section className="flex flex-col items-center gap-6 rounded-3xl border border-teal-100 bg-white p-8 text-center shadow-sm sm:flex-row sm:text-left">
        <img
          src={coffeeQr}
          alt="QR VietQR ủng hộ Nguyễn Sơn Nam"
          className="h-52 w-52 rounded-2xl border border-slate-200 object-cover"
        />
        <div>
          <h2 className="text-lg font-bold text-slate-900">{APP_META.coffee.accountName}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Số tài khoản: <b>{APP_META.coffee.accountNumber}</b>
            <br />
            Ngân hàng: <b>{APP_META.coffee.bank}</b>
          </p>
          <p className="mt-4 text-xs text-slate-500">
            Quét mã VietQR để chuyển khoản nhanh. Cảm ơn bạn đã ủng hộ!
          </p>
        </div>
      </section>
    </div>
  );
}
