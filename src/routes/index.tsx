import { useMemo, useState, useRef } from "react";
import { exportWarningList, exportXml3Report, createXml3ReportWorkbook } from "../lib/export.ts";
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
  type ColumnWidths,
  type ParsedBackupResult,
} from "../lib/backup.ts";
import coffeeQr from "../assets/coffee-qr.jpg";

type View = "checker" | "library" | "settings" | "guide" | "about" | "support";
type AlertTab = "XML1" | "XML2" | "XML3" | "XML4";
const SERVICE_RULES_KEY = "nsn-xmlcheck-service-rules";
const COLUMN_WIDTHS_KEY = "nsn-xmlcheck-col-widths";

const DEFAULT_COLUMN_WIDTHS: ColumnWidths = {
  status: 85,
  maLk: 125,
  hoTen: 155,
  maBn: 110,
  duration: 75,
  overLimit: 90,
  detail: 230, // Thu ngắn lại theo yêu cầu
  service: 380, // Kéo dài thêm theo yêu cầu
  group: 75,
  ttThau: 100, // Cột thông tin thầu
  khoa: 75,
  ngayYl: 130,
  ngayThYl: 130,
  ngayKq: 130,
  fileName: 120,
  stt: 60,
};

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

function loadColumnWidths(): ColumnWidths {
  try {
    const saved = localStorage.getItem(COLUMN_WIDTHS_KEY);
    if (saved) {
      return { ...DEFAULT_COLUMN_WIDTHS, ...JSON.parse(saved) };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_COLUMN_WIDTHS };
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
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>(loadTelegramConfig);
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(loadColumnWidths);

  // Lưu columnWidths vào localStorage khi thay đổi
  const updateColumnWidth = (columnKey: string, width: number) => {
    setColumnWidths((prev) => {
      const next = { ...prev, [columnKey]: Math.max(45, width) };
      localStorage.setItem(COLUMN_WIDTHS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const resetColumnWidths = () => {
    setColumnWidths({ ...DEFAULT_COLUMN_WIDTHS });
    localStorage.removeItem(COLUMN_WIDTHS_KEY);
    setNotice("Đã khôi phục kích thước cột về mặc định.");
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
      const nextAnalysis = await analyzeXml3Files(files, serviceRules);
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

  async function reanalyzeWithRules(nextRules: ServiceRule[]) {
    if (!files.length) return;
    setBusy(true);
    try {
      setSummaryFocus("warnings");
      setAlertTab("XML3");
      setAnalysis(await analyzeXml3Files(files, nextRules));
    } finally {
      setBusy(false);
    }
  }

  async function updateServiceRule(record: Xml3Record, maxMinutes: number | null) {
    const code = record.MA_DICH_VU.trim();
    if (!code) {
      setNotice("Dòng này chưa có MA_DICH_VU nên không thể lưu vào thư viện.");
      return;
    }
    const rule: ServiceRule = {
      MA_DICH_VU: code,
      TEN_DICH_VU: record.TEN_DICH_VU || record.TEN_VAT_TU || "",
      maxMinutes,
    };
    const nextRules = [...serviceRules.filter((item) => item.MA_DICH_VU !== code), rule];
    setServiceRules(nextRules);
    localStorage.setItem(SERVICE_RULES_KEY, JSON.stringify(nextRules));
    await reanalyzeWithRules(nextRules);
    setNotice(`Đã cập nhật thư viện cho dịch vụ ${code} và phân tích lại toàn bộ cảnh báo.`);
  }

  async function removeServiceRule(code: string) {
    const nextRules = serviceRules.filter((rule) => rule.MA_DICH_VU !== code);
    setServiceRules(nextRules);
    localStorage.setItem(SERVICE_RULES_KEY, JSON.stringify(nextRules));
    await reanalyzeWithRules(nextRules);
    setNotice(`Đã xóa dịch vụ ${code} khỏi thư viện.`);
  }

  async function handleSaveAllRules(newRules: ServiceRule[]) {
    setServiceRules(newRules);
    localStorage.setItem(SERVICE_RULES_KEY, JSON.stringify(newRules));
    await reanalyzeWithRules(newRules);
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
        json = createLibraryBackupContent(serviceRules);
        filename = `${formatTimestampForFilename()}_backup_thu_vien_dvkt.json`;
        caption = `💾 <b>BACKUP THƯ VIỆN DỊCH VỤ — NSN_XMLCHECK</b>\n• Số quy tắc: <b>${serviceRules.length}</b>\n• Thời gian: <b>${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</b>`;
      } else {
        json = createFullConfigBackupContent({
          serviceRules,
          groupCodes,
          telegramConfig,
          columnWidths,
          onlyWarnings,
        });
        filename = `${formatTimestampForFilename()}_backup_cau_hinh_toan_trang.json`;
        caption = `⚙️ <b>BACKUP CẤU HÌNH TOÀN TRANG — NSN_XMLCHECK</b>\n• Số quy tắc thư viện: <b>${serviceRules.length}</b>\n• Mã nhóm: <b>${groupCodes.join(", ")}</b>\n• Thời gian: <b>${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</b>`;
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
                Kiểm tra thời gian thực hiện dịch vụ, trả kết quả XML3 & kiểm tra TT_THAU
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs md:flex">
            <span className="rounded-full bg-white/15 px-3 py-1">Bảng 3 · DVKT, VTYT</span>
            <span className="rounded-full bg-white/15 px-3 py-1">
              Ngưỡng {DURATION_LIMIT_MINUTES} phút
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1">GMT+7</span>
          </div>
        </div>
      </header>

      <nav className="border-b border-slate-200 bg-white/90 shadow-sm sticky top-0 z-20">
        <div className="mx-auto flex max-w-[1440px] gap-1 overflow-x-auto px-4 md:px-8">
          {[
            ["checker", "Kiểm tra thời gian"],
            ["library", `Thư viện dịch vụ (${serviceRules.length})`],
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
            columnWidths={columnWidths}
            onUpdateColumnWidth={updateColumnWidth}
            onResetColumnWidths={resetColumnWidths}
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
            rules={serviceRules}
            onSaveRules={handleSaveAllRules}
            onAddRule={async (rule) => {
              const next = [...serviceRules.filter((r) => r.MA_DICH_VU !== rule.MA_DICH_VU), rule];
              await handleSaveAllRules(next);
              setNotice(`Đã thêm dịch vụ ${rule.MA_DICH_VU} vào thư viện.`);
            }}
            onRemoveRule={removeServiceRule}
            onExportBackup={() => exportLibraryBackup(serviceRules)}
            onSendTelegramBackup={() => handleSendTelegramBackup("library")}
            hasTelegramConfig={Boolean(telegramConfig.botToken && telegramConfig.chatId)}
          />
        )}

        {view === "settings" && (
          <SettingsBackupView
            telegramConfig={telegramConfig}
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
            onExportLibraryBackup={() => exportLibraryBackup(serviceRules)}
            onExportFullBackup={() =>
              exportFullConfigBackup({
                serviceRules,
                groupCodes,
                telegramConfig,
                columnWidths,
                onlyWarnings,
              })
            }
            onSendTelegramBackup={handleSendTelegramBackup}
            onSendTelegramReport={() => handleSendTelegramReport()}
            hasAnalysis={Boolean(analysis)}
            onRestoreBackup={(parsed) => {
              if (parsed.type === "library") {
                handleSaveAllRules(parsed.serviceRules);
                setNotice(
                  `Đã khôi phục thành công ${parsed.serviceRules.length} dịch vụ vào thư viện.`,
                );
              } else {
                handleSaveAllRules(parsed.serviceRules);
                if (parsed.groupCodes) setGroupCodes(parsed.groupCodes);
                if (parsed.telegramConfig) {
                  setTelegramConfig(parsed.telegramConfig);
                  saveTelegramConfig(parsed.telegramConfig);
                }
                if (parsed.columnWidths) {
                  setColumnWidths(parsed.columnWidths);
                  localStorage.setItem(COLUMN_WIDTHS_KEY, JSON.stringify(parsed.columnWidths));
                }
                if (typeof parsed.onlyWarnings === "boolean") setOnlyWarnings(parsed.onlyWarnings);
                setNotice("Đã khôi phục toàn bộ cấu hình trang và thư viện dịch vụ!");
              }
            }}
            onResetAllDefaults={() => {
              if (
                window.confirm("Bạn có chắc chắn muốn đặt lại toàn bộ cài đặt và xóa thư viện?")
              ) {
                localStorage.removeItem(SERVICE_RULES_KEY);
                localStorage.removeItem(TELEGRAM_CONFIG_KEY);
                localStorage.removeItem(COLUMN_WIDTHS_KEY);
                setServiceRules([]);
                setGroupCodes([...DEFAULT_GROUP_CODES]);
                setTelegramConfig({ ...loadTelegramConfig() });
                setColumnWidths({ ...DEFAULT_COLUMN_WIDTHS });
                setNotice("Đã đặt lại toàn bộ cài đặt về mặc định.");
              }
            }}
          />
        )}

        {view === "guide" && <GuideView />}
        {view === "about" && <AboutView />}
        {view === "support" && <SupportView />}
      </main>

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
  columnWidths,
  onUpdateColumnWidth,
  onResetColumnWidths,
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
  columnWidths: ColumnWidths;
  onUpdateColumnWidth: (key: string, width: number) => void;
  onResetColumnWidths: () => void;
  onAddFiles: (files: FileList | null) => void;
  onRemoveFile: (name: string) => void;
  onClear: () => void;
  onAnalyze: () => void;
  onGroupCodesChange: (value: string[]) => void;
  onPatientQueryChange: (value: string) => void;
  onAlertTabChange: (value: AlertTab) => void;
  onSummaryFocus: (value: SummaryFocus) => void;
  onExportWarnings: (source: AlertTab, warnings: ValidationWarning[]) => void;
  onAddServiceRule: (record: Xml3Record, maxMinutes: number | null) => void;
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
                  (CHI_TIET_DVKT), kiểm tra thông tin thầu <b>XML2</b> (cột 15 TT_THAU) và{" "}
                  <b>XML3</b> (MA_NHOM 10/11 bắt buộc có TT_THAU).
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
                ⚙️ Thư viện dịch vụ đã chuyển sang tab riêng trên thanh menu để tiện quản lý, sửa và
                thử nghiệm.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onOpenLibrary}
                  className="rounded-lg bg-teal-700 px-3 py-1.5 font-bold text-white hover:bg-teal-800 shadow-sm"
                >
                  Mở Thư viện DV
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
                  Cột Chi tiết đã được thu gọn và cột Dịch vụ/vật tư được kéo dài; bạn có thể kéo
                  thả viền cột để chỉnh độ rộng.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex min-w-[240px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">
                  <span className="font-bold text-teal-700">Tìm kiếm:</span>
                  <input
                    value={patientQuery}
                    onChange={(event) => onPatientQueryChange(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent font-semibold text-slate-800 outline-none"
                    placeholder="Mã BN, họ tên hoặc MA_LK"
                  />
                </label>
                <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyWarnings}
                    onChange={(event) => onToggleWarnings(event.target.checked)}
                    className="accent-teal-700"
                  />{" "}
                  Chỉ cảnh báo
                </label>
                <button
                  type="button"
                  onClick={onResetColumnWidths}
                  title="Đặt lại độ rộng các cột về chuẩn tối ưu"
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  ↺ Cột mặc định
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
                        <ResizableTh
                          width={columnWidths.status}
                          onResize={(w) => onUpdateColumnWidth("status", w)}
                        >
                          Trạng thái
                        </ResizableTh>
                        <ResizableTh
                          width={columnWidths.maLk}
                          onResize={(w) => onUpdateColumnWidth("maLk", w)}
                        >
                          MA_LK
                        </ResizableTh>
                        <ResizableTh
                          width={columnWidths.hoTen}
                          onResize={(w) => onUpdateColumnWidth("hoTen", w)}
                        >
                          HO_TEN
                        </ResizableTh>
                        <ResizableTh
                          width={columnWidths.maBn}
                          onResize={(w) => onUpdateColumnWidth("maBn", w)}
                        >
                          MA_BN
                        </ResizableTh>
                        <ResizableTh
                          width={columnWidths.duration}
                          onResize={(w) => onUpdateColumnWidth("duration", w)}
                        >
                          Số phút
                        </ResizableTh>
                        <ResizableTh
                          width={columnWidths.overLimit}
                          onResize={(w) => onUpdateColumnWidth("overLimit", w)}
                        >
                          Vượt ngưỡng
                        </ResizableTh>
                        <ResizableTh
                          width={columnWidths.detail}
                          onResize={(w) => onUpdateColumnWidth("detail", w)}
                          isCompact
                        >
                          Chi tiết (thu gọn)
                        </ResizableTh>
                        <ResizableTh
                          width={columnWidths.service}
                          onResize={(w) => onUpdateColumnWidth("service", w)}
                          isWide
                        >
                          Dịch vụ / Vật tư (mở rộng)
                        </ResizableTh>
                        <ResizableTh
                          width={columnWidths.group}
                          onResize={(w) => onUpdateColumnWidth("group", w)}
                        >
                          Mã nhóm
                        </ResizableTh>
                        <ResizableTh
                          width={columnWidths.ttThau}
                          onResize={(w) => onUpdateColumnWidth("ttThau", w)}
                        >
                          TT_THAU
                        </ResizableTh>
                        <ResizableTh
                          width={columnWidths.khoa}
                          onResize={(w) => onUpdateColumnWidth("khoa", w)}
                        >
                          Khoa
                        </ResizableTh>
                        <ResizableTh
                          width={columnWidths.ngayYl}
                          onResize={(w) => onUpdateColumnWidth("ngayYl", w)}
                        >
                          NGAY_YL
                        </ResizableTh>
                        <ResizableTh
                          width={columnWidths.ngayThYl}
                          onResize={(w) => onUpdateColumnWidth("ngayThYl", w)}
                        >
                          NGAY_TH_YL
                        </ResizableTh>
                        <ResizableTh
                          width={columnWidths.ngayKq}
                          onResize={(w) => onUpdateColumnWidth("ngayKq", w)}
                        >
                          NGAY_KQ
                        </ResizableTh>
                        <ResizableTh
                          width={columnWidths.fileName}
                          onResize={(w) => onUpdateColumnWidth("fileName", w)}
                        >
                          File
                        </ResizableTh>
                        <ResizableTh
                          width={columnWidths.stt}
                          onResize={(w) => onUpdateColumnWidth("stt", w)}
                        >
                          STT
                        </ResizableTh>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record, index) => (
                        <WarningRow
                          key={`${record.fileName}-${record.MA_LK}-${record.STT}-${index}`}
                          record={record}
                          columnWidths={columnWidths}
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
                onExport={() => onExportWarnings(alertTab, xmlWarnings[alertTab])}
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

function WarningRow({
  record,
  columnWidths,
  onAddServiceRule,
}: {
  record: Xml3Record;
  columnWidths: ColumnWidths;
  onAddServiceRule: (record: Xml3Record, maxMinutes: number | null) => void;
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

  return (
    <tr
      className={`border-t border-slate-200/70 align-top ${
        isWarning ? "bg-rose-50/60 hover:bg-rose-100/50" : "hover:bg-slate-50/80"
      }`}
    >
      <td style={{ width: columnWidths.status }} className="px-3 py-2.5">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-black ${
            isWarning ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          {label}
        </span>
      </td>
      <td
        style={{ width: columnWidths.maLk }}
        className="px-3 py-2.5 font-mono font-bold text-teal-800 break-all"
      >
        {record.MA_LK || "(trống)"}
      </td>
      <td style={{ width: columnWidths.hoTen }} className="px-3 py-2.5">
        <div className="font-semibold text-slate-800 break-words leading-tight">
          {record.HO_TEN || "Chưa có họ tên"}
        </div>
      </td>
      <td
        style={{ width: columnWidths.maBn }}
        className="px-3 py-2.5 font-mono font-bold break-all"
      >
        {record.MA_BN || "(chưa nối)"}
      </td>
      <td
        style={{ width: columnWidths.duration }}
        className="px-3 py-2.5 text-right font-black text-slate-800"
      >
        {record.durationMinutes === null ? "—" : record.durationMinutes.toLocaleString("vi-VN")}
      </td>
      <td
        style={{ width: columnWidths.overLimit }}
        className="px-3 py-2.5 text-right font-bold text-rose-700"
      >
        {record.status === "warning" && record.durationMinutes !== null
          ? `${(record.durationMinutes - (record.serviceRule?.maxMinutes ?? DURATION_LIMIT_MINUTES)).toLocaleString("vi-VN")} ph`
          : "—"}
      </td>
      <td style={{ width: columnWidths.detail }} className="px-3 py-2.5 text-slate-600">
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
                const value = window.prompt(
                  `Ngưỡng thời gian tối đa cho [${record.MA_DICH_VU}] (phút):`,
                  String(record.serviceRule?.maxMinutes ?? DURATION_LIMIT_MINUTES),
                );
                if (value === null) return;
                const maxMinutes = Number(value);
                if (Number.isFinite(maxMinutes) && maxMinutes >= 0) {
                  onAddServiceRule(record, maxMinutes);
                }
              }}
              title="Đặt ngưỡng số phút tối đa riêng"
            >
              Đặt ngưỡng
            </button>
          </div>
        )}
      </td>
      <td style={{ width: columnWidths.service }} className="px-3 py-2.5">
        <div className="font-semibold text-slate-900 leading-snug break-words">
          {record.TEN_DICH_VU || record.TEN_VAT_TU || "(chưa có tên)"}
        </div>
        <div className="mt-1 font-mono text-[10px] text-slate-500">
          DV: <span className="text-teal-700 font-bold">{record.MA_DICH_VU || "—"}</span>
          {record.MA_VAT_TU && ` · VT: ${record.MA_VAT_TU}`}
        </div>
      </td>
      <td
        style={{ width: columnWidths.group }}
        className="px-3 py-2.5 font-mono text-center font-bold"
      >
        {record.MA_NHOM || "—"}
      </td>
      <td style={{ width: columnWidths.ttThau }} className="px-3 py-2.5 font-mono text-xs">
        {record.TT_THAU ? (
          <span className="text-slate-800 break-all">{record.TT_THAU}</span>
        ) : (
          <span className="text-rose-600 font-semibold italic">(trống)</span>
        )}
      </td>
      <td style={{ width: columnWidths.khoa }} className="px-3 py-2.5 font-mono text-slate-700">
        {record.MA_KHOA || "—"}
      </td>
      <td
        style={{ width: columnWidths.ngayYl }}
        className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px]"
      >
        {formatXmlDateTime(record.NGAY_YL) || record.NGAY_YL || "—"}
      </td>
      <td
        style={{ width: columnWidths.ngayThYl }}
        className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px]"
      >
        {formatXmlDateTime(record.NGAY_TH_YL) || record.NGAY_TH_YL || "—"}
      </td>
      <td
        style={{ width: columnWidths.ngayKq }}
        className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px]"
      >
        {formatXmlDateTime(record.NGAY_KQ) || record.NGAY_KQ || "—"}
      </td>
      <td style={{ width: columnWidths.fileName }} className="px-3 py-2.5">
        <div className="truncate font-mono text-[10px] text-slate-500" title={record.fileName}>
          {record.fileName}
        </div>
      </td>
      <td
        style={{ width: columnWidths.stt }}
        className="px-3 py-2.5 font-mono text-slate-500 text-center"
      >
        {record.STT || "—"}
      </td>
    </tr>
  );
}

function ValidationTable({
  source,
  warnings,
  onExport,
}: {
  source: AlertTab;
  warnings: ValidationWarning[];
  onExport: () => void;
}) {
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
          <table className="min-w-[980px] w-full text-left text-xs">
            <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-600">
              <tr>
                {[
                  "Chi tiết thứ",
                  "MA_LK",
                  "HO_TEN",
                  "MA_BN",
                  source === "XML2" ? "Mã thuốc" : "Mã dịch vụ",
                  source === "XML2" ? "Tên thuốc" : "Tên dịch vụ",
                  "Nội dung cảnh báo",
                ].map((heading) => (
                  <th key={heading} className="whitespace-nowrap px-4 py-3 font-bold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {warnings.map((warning, index) => (
                <tr
                  key={`${source}-${warning.MA_LK}-${warning.detailIndex}-${index}`}
                  className="border-t border-slate-100 bg-rose-50/60 hover:bg-rose-100/50 align-top"
                >
                  <td className="px-4 py-3 font-mono font-bold">{warning.detailIndex}</td>
                  <td className="px-4 py-3 font-mono font-bold text-teal-800">
                    {warning.MA_LK || "—"}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {warning.HO_TEN || "Chưa có họ tên"}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold">{warning.MA_BN || "—"}</td>
                  <td className="px-4 py-3 font-mono">{warning.MA_DICH_VU || "—"}</td>
                  <td className="max-w-[260px] px-4 py-3 font-medium text-slate-800">
                    {warning.TEN_DICH_VU || "—"}
                  </td>
                  <td className="max-w-[520px] px-4 py-3 text-slate-700 font-semibold text-rose-800">
                    {warning.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
// LIBRARY VIEW (DEDICATED TAB)
// ---------------------------------------------------------------------------
function LibraryView({
  rules,
  onSaveRules,
  onAddRule,
  onRemoveRule,
  onExportBackup,
  onSendTelegramBackup,
  hasTelegramConfig,
}: {
  rules: ServiceRule[];
  onSaveRules: (rules: ServiceRule[]) => Promise<void>;
  onAddRule: (rule: ServiceRule) => Promise<void>;
  onRemoveRule: (code: string) => Promise<void>;
  onExportBackup: () => void;
  onSendTelegramBackup: () => void;
  hasTelegramConfig: boolean;
}) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "excluded" | "custom">("all");
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newRuleType, setNewRuleType] = useState<"exclude" | "limit">("exclude");
  const [newMinutes, setNewMinutes] = useState("120");

  // Inline editing state
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<"exclude" | "limit">("exclude");
  const [editMinutes, setEditMinutes] = useState("");

  // Testing tool simulator state
  const [testCode, setTestCode] = useState("");
  const [testDuration, setTestDuration] = useState("80");
  const [testResult, setTestResult] = useState<{
    matchedRule?: ServiceRule;
    appliedLimit: number | null;
    isExcluded: boolean;
    isWarning: boolean;
    overMinutes: number;
    message: string;
  } | null>(null);

  const filteredRules = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rules.filter((r) => {
      const matchSearch =
        !q || r.MA_DICH_VU.toLowerCase().includes(q) || r.TEN_DICH_VU.toLowerCase().includes(q);
      const matchFilter =
        filterType === "all" ||
        (filterType === "excluded" && r.maxMinutes === null) ||
        (filterType === "custom" && typeof r.maxMinutes === "number");
      return matchSearch && matchFilter;
    });
  }, [rules, search, filterType]);

  const excludedCount = useMemo(() => rules.filter((r) => r.maxMinutes === null).length, [rules]);
  const customLimitCount = useMemo(
    () => rules.filter((r) => typeof r.maxMinutes === "number").length,
    [rules],
  );

  const handleAddNew = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = newCode.trim();
    if (!cleanCode) return;
    const rule: ServiceRule = {
      MA_DICH_VU: cleanCode,
      TEN_DICH_VU: newName.trim(),
      maxMinutes: newRuleType === "exclude" ? null : Math.max(0, Number(newMinutes) || 70),
    };
    await onAddRule(rule);
    setNewCode("");
    setNewName("");
  };

  const startEdit = (rule: ServiceRule) => {
    setEditingCode(rule.MA_DICH_VU);
    setEditName(rule.TEN_DICH_VU);
    setEditType(rule.maxMinutes === null ? "exclude" : "limit");
    setEditMinutes(rule.maxMinutes === null ? "120" : String(rule.maxMinutes));
  };

  const saveEdit = async () => {
    if (!editingCode) return;
    const updated = rules.map((r) => {
      if (r.MA_DICH_VU === editingCode) {
        return {
          ...r,
          TEN_DICH_VU: editName.trim(),
          maxMinutes: editType === "exclude" ? null : Math.max(0, Number(editMinutes) || 70),
        };
      }
      return r;
    });
    await onSaveRules(updated);
    setEditingCode(null);
  };

  const handleRunTest = (e: React.FormEvent) => {
    e.preventDefault();
    const code = testCode.trim();
    const duration = Number(testDuration) || 0;
    const matched = rules.find((r) => r.MA_DICH_VU.toLowerCase() === code.toLowerCase());

    if (matched) {
      if (matched.maxMinutes === null) {
        setTestResult({
          matchedRule: matched,
          appliedLimit: null,
          isExcluded: true,
          isWarning: false,
          overMinutes: 0,
          message: `Dịch vụ [${matched.MA_DICH_VU}] được cấu hình LOẠI TRỪ khỏi cảnh báo thời lượng.`,
        });
      } else {
        const limit = matched.maxMinutes;
        const isWarning = duration > limit;
        const over = Math.max(0, duration - limit);
        setTestResult({
          matchedRule: matched,
          appliedLimit: limit,
          isExcluded: false,
          isWarning,
          overMinutes: over,
          message: isWarning
            ? `CẢNH BÁO: Vượt ${over} phút so với ngưỡng riêng ${limit} phút.`
            : `ĐẠT: Nằm trong ngưỡng riêng ${limit} phút.`,
        });
      }
    } else {
      const limit = DURATION_LIMIT_MINUTES;
      const isWarning = duration > limit;
      const over = Math.max(0, duration - limit);
      setTestResult({
        appliedLimit: limit,
        isExcluded: false,
        isWarning,
        overMinutes: over,
        message: isWarning
          ? `CẢNH BÁO (Mặc định): Vượt ${over} phút so với ngưỡng chuẩn ${limit} phút (dịch vụ chưa có trong thư viện).`
          : `ĐẠT (Mặc định): Nằm trong ngưỡng chuẩn ${limit} phút.`,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-teal-100 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-teal-700">
              Quản lý quy tắc dịch vụ
            </div>
            <h2 className="mt-1 text-2xl font-black text-slate-900">
              Thư viện Dịch vụ kỹ thuật & Vật tư y tế
            </h2>
            <p className="mt-1 text-sm text-slate-500 max-w-2xl">
              Cấu hình các dịch vụ đặc thù cần loại trừ cảnh báo thời lượng hoặc đặt ngưỡng thời
              gian thực hiện riêng. Dữ liệu được lưu trong trình duyệt và tự động áp dụng khi phân
              tích.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onExportBackup}
              className="rounded-xl border border-teal-600 bg-white px-4 py-2 text-xs font-bold text-teal-700 hover:bg-teal-50 shadow-sm"
            >
              📥 Xuất File Thư viện (.json)
            </button>
            {hasTelegramConfig && (
              <button
                onClick={onSendTelegramBackup}
                className="rounded-xl bg-[#229ED9] px-4 py-2 text-xs font-bold text-white hover:bg-[#1e8ec3] shadow-sm"
              >
                ✈️ Gửi Backup qua Telegram
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4">
            <div className="text-xs font-bold text-teal-800 uppercase">Tổng quy tắc</div>
            <div className="mt-1 text-2xl font-black text-teal-900">{rules.length}</div>
            <div className="mt-1 text-xs text-slate-500">Dịch vụ đã lưu trong thư viện</div>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
            <div className="text-xs font-bold text-amber-800 uppercase">Loại trừ hoàn toàn</div>
            <div className="mt-1 text-2xl font-black text-amber-900">{excludedCount}</div>
            <div className="mt-1 text-xs text-slate-500">Không bao giờ tạo cảnh báo thời lượng</div>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4">
            <div className="text-xs font-bold text-sky-800 uppercase">Ngưỡng riêng</div>
            <div className="mt-1 text-2xl font-black text-sky-900">{customLimitCount}</div>
            <div className="mt-1 text-xs text-slate-500">Áp dụng số phút tối đa tùy chỉnh</div>
          </div>
        </div>
      </div>

      {/* Grid 2 cột: Thêm mới & Simulator */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Form thêm mới */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <span>➕</span> Thêm dịch vụ vào thư viện
          </h3>
          <form onSubmit={handleAddNew} className="mt-4 space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Mã dịch vụ (MA_DICH_VU) <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
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
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="VD: Phẫu thuật nội soi ổ bụng, Chụp CT 128 dãy..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Quy tắc thời lượng</label>
              <div className="grid grid-cols-2 gap-2">
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
                  <span>Loại trừ cảnh báo</span>
                </label>
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
                  <span>Đặt ngưỡng riêng</span>
                </label>
              </div>
            </div>
            {newRuleType === "limit" && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ngưỡng thời gian tối đa (phút)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={newMinutes}
                  onChange={(e) => setNewMinutes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm font-bold text-slate-900 focus:border-teal-500 focus:outline-none"
                />
              </div>
            )}
            <button
              type="submit"
              className="w-full rounded-xl bg-teal-700 py-2.5 text-xs font-bold text-white hover:bg-teal-800 shadow-sm"
            >
              Lưu vào Thư viện
            </button>
          </form>
        </div>

        {/* Bộ mô phỏng / kiểm tra thử */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <span>🧪</span> Kiểm tra thử quy tắc (Simulator)
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Thử nghiệm nhanh xem một mã dịch vụ với thời lượng cụ thể sẽ cho kết quả Đạt hay Cảnh
            báo.
          </p>
          <form onSubmit={handleRunTest} className="mt-4 space-y-4 text-xs">
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
                    ? "CẢNH BÁO THỜI LƯỢNG"
                    : testResult.isExcluded
                      ? "ĐƯỢC LOẠI TRỪ"
                      : "ĐẠT YÊU CẦU"}
                </span>
              </div>
              <p className="leading-relaxed">{testResult.message}</p>
              <div className="mt-2 text-[11px] opacity-80">
                Ngưỡng áp dụng:{" "}
                <b>
                  {testResult.appliedLimit === null
                    ? "Loại trừ"
                    : `${testResult.appliedLimit} phút`}
                </b>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bảng danh sách thư viện */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
          <h3 className="font-bold text-slate-900">
            Danh sách dịch vụ trong thư viện ({filteredRules.length})
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
              <option value="custom">Chỉ ngưỡng riêng</option>
            </select>
          </div>
        </div>

        {filteredRules.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            {rules.length === 0
              ? "Thư viện hiện đang trống. Bạn có thể thêm dịch vụ mới ở form phía trên hoặc bấm 'Loại trừ DV' trong bảng cảnh báo XML3."
              : "Không tìm thấy dịch vụ nào phù hợp với từ khóa tìm kiếm."}
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-bold">STT</th>
                  <th className="px-4 py-3 font-bold">Mã dịch vụ</th>
                  <th className="px-4 py-3 font-bold">Tên dịch vụ</th>
                  <th className="px-4 py-3 font-bold">Quy tắc thời lượng</th>
                  <th className="px-4 py-3 font-bold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map((rule, idx) => {
                  const isEditing = editingCode === rule.MA_DICH_VU;
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
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full rounded-lg border border-teal-400 bg-white px-2 py-1 text-xs"
                          />
                        ) : (
                          rule.TEN_DICH_VU || (
                            <span className="text-slate-400 italic">(chưa có tên)</span>
                          )
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={editType}
                              onChange={(e) => setEditType(e.target.value as "exclude" | "limit")}
                              className="rounded-lg border border-teal-400 bg-white px-2 py-1 text-xs"
                            >
                              <option value="exclude">Loại trừ</option>
                              <option value="limit">Ngưỡng số phút</option>
                            </select>
                            {editType === "limit" && (
                              <input
                                type="number"
                                min="1"
                                value={editMinutes}
                                onChange={(e) => setEditMinutes(e.target.value)}
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
                            ⏱ ≤ {rule.maxMinutes} phút
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={saveEdit}
                              className="rounded-lg bg-teal-700 px-3 py-1 text-xs font-bold text-white hover:bg-teal-800"
                            >
                              Lưu
                            </button>
                            <button
                              onClick={() => setEditingCode(null)}
                              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => startEdit(rule)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => onRemoveRule(rule.MA_DICH_VU)}
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// SETTINGS, TELEGRAM & BACKUP VIEW (DEDICATED TAB)
// ---------------------------------------------------------------------------
function SettingsBackupView({
  telegramConfig,
  onSaveTelegramConfig,
  onTestTelegram,
  onExportLibraryBackup,
  onExportFullBackup,
  onSendTelegramBackup,
  onSendTelegramReport,
  hasAnalysis,
  onRestoreBackup,
  onResetAllDefaults,
}: {
  telegramConfig: TelegramConfig;
  onSaveTelegramConfig: (cfg: TelegramConfig) => void;
  onTestTelegram: (token: string, chatId: string) => Promise<{ ok: boolean; description?: string }>;
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
          parsed.type === "library" ? "Thư viện dịch vụ" : "Toàn bộ cấu hình"
        } (${parsed.itemCount} dịch vụ).`,
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
          Cấu hình Telegram, Sao lưu & Khôi phục
        </h2>
        <p className="mt-1 text-sm text-slate-500 max-w-3xl">
          Tùy chỉnh kết nối gửi báo cáo trực tiếp về kênh Telegram của bạn, tải file sao lưu thư
          viện hoặc toàn bộ cấu hình trang để dễ dàng chuyển sang máy khác.
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
                Xuất file JSON lưu trữ để lưu trữ dự phòng hoặc chia sẻ cấu hình.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-slate-800 text-xs">Backup Thư viện Dịch vụ</div>
                <div className="text-[11px] text-slate-500">
                  Chỉ sao lưu danh sách dịch vụ và quy tắc
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
                  Bao gồm thư viện, mã nhóm, cài đặt Telegram và độ rộng cột
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
        title="Kiểm tra thời gian trả kết quả XML3 & Thông tin thầu TT_THAU"
        description="Quy trình tự động kiểm tra chênh lệch thời gian NGAY_KQ - NGAY_TH_YL, kiểm tra TT_THAU XML2 và XML3 MA_NHOM 10/11."
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
          title="Rà soát & Báo cáo"
          text="Xem cảnh báo thời lượng > 70 phút, cảnh báo TT_THAU trên XML2/XML3, kéo thả chỉnh cột và gửi báo cáo qua Telegram hoặc xuất Excel."
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
                  "Bắt buộc không được để rỗng. Cảnh báo: 'XML2. Chi tiết thứ xxx: Thiếu thông tin TT_THAU'",
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
                  "Thời lượng = NGAY_KQ - NGAY_TH_YL. Cảnh báo khi > 70 phút hoặc vượt ngưỡng thư viện.",
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
