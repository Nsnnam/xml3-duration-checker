import { useMemo, useState } from "react";
import { exportXml3Report } from "../lib/export";
import { APP_META } from "../lib/meta";
import { formatTimestampForFilename, formatXmlDateTime } from "../lib/timezone";
import {
  DEFAULT_GROUP_CODES,
  DURATION_LIMIT_MINUTES,
  analyzeXml3Files,
  type BatchAnalysis,
  type Xml3Record,
} from "../lib/xml3-duration";
import coffeeQr from "../assets/coffee-qr.jpg";

type View = "checker" | "guide" | "about" | "support";

export function HomePage() {
  const [view, setView] = useState<View>("checker");
  const [files, setFiles] = useState<File[]>([]);
  const [analysis, setAnalysis] = useState<BatchAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [onlyWarnings, setOnlyWarnings] = useState(true);
  const [groupFilterText, setGroupFilterText] = useState(DEFAULT_GROUP_CODES.join(", "));
  const [notice, setNotice] = useState("");
  const groupCodes = useMemo(
    () =>
      groupFilterText
        .split(",")
        .map((code) => code.trim())
        .filter(Boolean),
    [groupFilterText],
  );

  const filteredRecords = useMemo(
    () =>
      analysis
        ? analysis.records.filter((record) => groupCodes.includes(record.MA_NHOM.trim()))
        : [],
    [analysis, groupCodes],
  );
  const filteredWarnings = useMemo(
    () => filteredRecords.filter((record) => record.status === "warning" || record.hasOrderWarning),
    [filteredRecords],
  );
  const records = onlyWarnings ? filteredWarnings : filteredRecords;

  async function runAnalysis() {
    if (!files.length) {
      setNotice("Hãy chọn ít nhất một file XML trước khi phân tích.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      setAnalysis(await analyzeXml3Files(files));
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

  return (
    <div className="min-h-screen bg-[#f5faf9] text-slate-900">
      <header className="border-b border-teal-900/10 bg-gradient-to-r from-[#0f766e] via-[#0d9488] to-[#0891b2] text-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-5 md:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-content-center rounded-2xl bg-white/15 text-2xl shadow-inner">
              ⏱
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight md:text-2xl">
                XML3 Duration Checker
              </h1>
              <p className="mt-1 text-xs text-teal-50 md:text-sm">
                Kiểm tra thời gian thực hiện dịch vụ đến khi trả kết quả
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs md:flex">
            <span className="rounded-full bg-white/15 px-3 py-1.5">Bảng 3 · DVKT, VTYT</span>
            <span className="rounded-full bg-white/15 px-3 py-1.5">
              Ngưỡng {DURATION_LIMIT_MINUTES} phút
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1.5">GMT+7</span>
          </div>
        </div>
      </header>

      <nav className="border-b border-slate-200 bg-white/90 shadow-sm">
        <div className="mx-auto flex max-w-[1440px] gap-1 overflow-x-auto px-4 md:px-8">
          {[
            ["checker", "Kiểm tra thời gian"],
            ["guide", "Hướng dẫn"],
            ["about", "Phiên bản & tác giả"],
            ["support", "Mời cà phê"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key as View)}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${view === key ? "border-teal-600 text-teal-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 md:py-8">
        {view === "checker" && (
          <CheckerView
            files={files}
            analysis={analysis}
            records={records}
            filteredRecords={filteredRecords}
            filteredWarnings={filteredWarnings}
            groupCodes={groupCodes}
            onlyWarnings={onlyWarnings}
            busy={busy}
            notice={notice}
            onAddFiles={addFiles}
            onRemoveFile={(name) =>
              setFiles((current) => current.filter((file) => file.name !== name))
            }
            onClear={clearAll}
            onAnalyze={runAnalysis}
            groupFilterText={groupFilterText}
            onGroupFilterTextChange={setGroupFilterText}
            onToggleWarnings={setOnlyWarnings}
            onExport={() => analysis && exportXml3Report(analysis, filteredRecords)}
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

function CheckerView({
  files,
  analysis,
  records,
  filteredRecords,
  filteredWarnings,
  groupCodes,
  onlyWarnings,
  busy,
  notice,
  onAddFiles,
  onRemoveFile,
  onClear,
  onAnalyze,
  groupFilterText,
  onGroupFilterTextChange,
  onToggleWarnings,
  onExport,
}: {
  files: File[];
  analysis: BatchAnalysis | null;
  records: Xml3Record[];
  filteredRecords: Xml3Record[];
  filteredWarnings: Xml3Record[];
  groupCodes: string[];
  onlyWarnings: boolean;
  busy: boolean;
  notice: string;
  onAddFiles: (files: FileList | null) => void;
  onRemoveFile: (name: string) => void;
  onClear: () => void;
  onAnalyze: () => void;
  groupFilterText: string;
  onGroupFilterTextChange: (value: string) => void;
  onToggleWarnings: (value: boolean) => void;
  onExport: () => void;
}) {
  return (
    <div className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-3xl border border-teal-100 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-5 flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-content-center rounded-2xl bg-teal-50 text-2xl">
              📤
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Nạp file XML chứa 15 bảng</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Công cụ giải mã nội dung <b>NOIDUNGFILE</b> theo Base64, lấy riêng <b>XML3</b> và
                đọc các dòng <b>CHI_TIET_DVKT</b>. Dữ liệu chỉ xử lý trong trình duyệt.
              </p>
            </div>
          </div>
          <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/50 px-4 text-center transition hover:border-teal-500 hover:bg-teal-50">
            <span className="text-3xl">＋</span>
            <span className="mt-2 text-sm font-semibold text-teal-800">
              Chọn hoặc thêm nhiều file XML
            </span>
            <span className="mt-1 text-xs text-slate-500">
              XML1–XML15 Base64 · không tải dữ liệu lên máy chủ
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
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label
              className="block text-xs font-bold uppercase tracking-wide text-slate-500"
              htmlFor="group-filter"
            >
              Mã nhóm áp dụng cảnh báo (MA_NHOM · cột 6)
            </label>
            <input
              id="group-filter"
              value={groupFilterText}
              onChange={(event) => onGroupFilterTextChange(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none ring-teal-500 focus:ring-2"
              placeholder="Ví dụ: 2, 3, 8, 18"
              aria-describedby="group-filter-help"
            />
            <p id="group-filter-help" className="mt-2 text-xs text-slate-500">
              Mặc định: <b>2, 3, 8, 18</b>. Nhập các mã cách nhau bằng dấu phẩy; chỉ các dòng thuộc
              nhóm này được đưa vào bảng và báo cáo.
            </p>
          </div>
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate font-mono text-xs">{file.name}</span>
                  <button
                    className="shrink-0 text-xs font-semibold text-rose-600 hover:underline"
                    onClick={() => onRemoveFile(file.name)}
                  >
                    Gỡ
                  </button>
                </div>
              ))}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={busy}
                  onClick={onAnalyze}
                >
                  {busy ? "Đang phân tích…" : "Phân tích XML3"}
                </button>
                <button
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  onClick={onClear}
                >
                  Xóa dữ liệu
                </button>
              </div>
            </div>
          )}
          {notice && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice}</p>
          )}
        </div>

        <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm md:p-8">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-content-center rounded-2xl bg-white/10 text-xl">
              ⚙
            </div>
            <h2 className="text-lg font-bold">Quy tắc kiểm tra</h2>
          </div>
          <div className="mt-6 space-y-4 text-sm leading-6 text-slate-300">
            <Rule label="Mã nhóm" value="2 · 3 · 8 · 18 mặc định" />
            <Rule label="Trình tự" value="NGAY_YL → NGAY_TH_YL → NGAY_KQ" />
            <Rule label="Công thức" value="NGAY_KQ − NGAY_TH_YL" />
            <Rule
              label="Cảnh báo"
              value={`Nhóm đã chọn và > ${DURATION_LIMIT_MINUTES} phút`}
              danger
            />
          </div>
          <p className="mt-7 border-t border-white/10 pt-5 text-xs leading-5 text-slate-400">
            Đúng 70 phút vẫn là đạt; chỉ những dòng có thời lượng{" "}
            <b className="text-white">&gt; 70 phút</b> mới được đánh dấu cảnh báo.
          </p>
        </div>
      </section>

      {analysis && (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            <Metric label="File đã nạp" value={analysis.files.length} />
            <Metric label="FILEHOSO XML3" value={analysis.tableFiles} tone="teal" />
            <Metric label="Dòng theo nhóm" value={filteredRecords.length} tone="teal" />
            <Metric label="Cảnh báo đang lọc" value={filteredWarnings.length} tone="rose" />
            <Metric
              label="Sai thứ tự"
              value={filteredRecords.filter((record) => record.hasOrderWarning).length}
              tone="rose"
            />
            <Metric
              label="Thiếu thời gian"
              value={filteredRecords.filter((record) => record.status === "missing").length}
              tone="amber"
            />
            <Metric
              label="Thời gian lỗi"
              value={filteredRecords.filter((record) => record.status === "invalid").length}
              tone="amber"
            />
            <Metric
              label="Thời gian âm"
              value={filteredRecords.filter((record) => record.status === "negative").length}
              tone="slate"
            />
          </section>

          <section className="overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-rose-50 to-white px-5 py-4 md:flex-row md:items-center md:px-6">
              <div>
                <h2 className="font-bold text-rose-900">Cảnh báo chi tiết theo dịch vụ</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Đang lọc MA_NHOM: {groupCodes.length ? groupCodes.join(", ") : "(chưa nhập nhóm)"}
                  . Thời gian hiển thị MM/DD/YYYY HH:mm; kiểm tra NGAY_YL → NGAY_TH_YL → NGAY_KQ.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={onlyWarnings}
                    onChange={(event) => onToggleWarnings(event.target.checked)}
                  />{" "}
                  Chỉ cảnh báo
                </label>
                <button
                  disabled={!analysis.records.length}
                  onClick={onExport}
                  className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Xuất XLSX
                </button>
              </div>
            </div>
            {records.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-500">
                Không có dòng phù hợp với bộ lọc hiện tại.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1180px] w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      {[
                        "Trạng thái",
                        "File · MA_LK",
                        "STT",
                        "Dịch vụ / vật tư",
                        "Mã nhóm",
                        "Khoa",
                        "NGAY_YL",
                        "NGAY_TH_YL",
                        "NGAY_KQ",
                        "Số phút",
                        "Vượt ngưỡng",
                        "Chi tiết",
                      ].map((heading) => (
                        <th key={heading} className="whitespace-nowrap px-4 py-3 font-bold">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record, index) => (
                      <WarningRow
                        key={`${record.fileName}-${record.MA_LK}-${record.STT}-${index}`}
                        record={record}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
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

function Rule({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
      <span className="text-slate-400">{label}</span>
      <b className={danger ? "text-rose-300" : "text-white"}>{value}</b>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "blue",
}: {
  label: string;
  value: number;
  tone?: "blue" | "teal" | "rose" | "amber" | "slate";
}) {
  const colors = {
    blue: "border-sky-200",
    teal: "border-teal-300",
    rose: "border-rose-300",
    amber: "border-amber-300",
    slate: "border-slate-300",
  };
  return (
    <div className={`rounded-2xl border-t-4 ${colors[tone]} bg-white px-4 py-3 shadow-sm`}>
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-black text-slate-800">{value.toLocaleString("vi-VN")}</div>
    </div>
  );
}

function WarningRow({ record }: { record: Xml3Record }) {
  const isWarning = record.status === "warning" || record.hasOrderWarning;
  const label = record.hasOrderWarning
    ? "SAI THỨ TỰ"
    : record.status === "warning"
      ? "CẢNH BÁO"
      : record.status === "ok"
        ? "ĐẠT"
        : record.status.toUpperCase();
  return (
    <tr
      className={`border-t border-slate-100 align-top ${isWarning ? "bg-rose-50/60" : "hover:bg-slate-50"}`}
    >
      <td className="px-4 py-3">
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-black ${isWarning ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600"}`}
        >
          {label}
        </span>
      </td>
      <td className="max-w-[220px] px-4 py-3">
        <div className="truncate font-mono text-[11px] text-slate-500">{record.fileName}</div>
        <div className="mt-1 font-semibold text-slate-800">{record.MA_LK || "(trống)"}</div>
      </td>
      <td className="px-4 py-3 font-mono">{record.STT || "—"}</td>
      <td className="max-w-[260px] px-4 py-3">
        <div className="font-semibold text-slate-800">
          {record.TEN_DICH_VU || record.TEN_VAT_TU || "(chưa có tên)"}
        </div>
        <div className="mt-1 font-mono text-[11px] text-slate-500">
          DV: {record.MA_DICH_VU || "—"} · VT: {record.MA_VAT_TU || "—"}
        </div>
      </td>
      <td className="px-4 py-3 font-mono">{record.MA_NHOM || "—"}</td>
      <td className="px-4 py-3">{record.MA_KHOA || "—"}</td>
      <td className="whitespace-nowrap px-4 py-3 font-mono">
        {formatXmlDateTime(record.NGAY_YL) || record.NGAY_YL || "—"}
      </td>
      <td className="whitespace-nowrap px-4 py-3 font-mono">
        {formatXmlDateTime(record.NGAY_TH_YL) || record.NGAY_TH_YL || "—"}
      </td>
      <td className="whitespace-nowrap px-4 py-3 font-mono">
        {formatXmlDateTime(record.NGAY_KQ) || record.NGAY_KQ || "—"}
      </td>
      <td className="px-4 py-3 text-right font-black text-slate-800">
        {record.durationMinutes === null ? "—" : record.durationMinutes.toLocaleString("vi-VN")}
      </td>
      <td className="px-4 py-3 text-right font-bold text-rose-700">
        {isWarning && record.durationMinutes !== null
          ? `${(record.durationMinutes - DURATION_LIMIT_MINUTES).toLocaleString("vi-VN")} phút`
          : "—"}
      </td>
      <td className="max-w-[210px] px-4 py-3 text-slate-600">{record.detail}</td>
    </tr>
  );
}

function GuideView() {
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageTitle
        eyebrow="Hướng dẫn sử dụng"
        title="Kiểm tra thời gian trả kết quả XML3"
        description="Quy trình này chỉ kiểm tra chênh lệch thời gian của dịch vụ trong Bảng 3, không thực hiện tra cứu hay đánh giá mã ICD."
      />
      <section className="grid gap-4 md:grid-cols-3">
        <GuideCard
          number="01"
          title="Chọn file XML"
          text="Chọn một hoặc nhiều file XML hồ sơ có các FILEHOSO được mã hóa Base64."
        />
        <GuideCard
          number="02"
          title="Phân tích XML3"
          text="Bấm Phân tích XML3. Công cụ tự giải mã NOIDUNGFILE và tìm CHI_TIET_DVKT."
        />
        <GuideCard
          number="03"
          title="Rà soát cảnh báo"
          text="Lọc theo MA_NHOM (mặc định 2, 3, 8, 18), cảnh báo NGAY_KQ − NGAY_TH_YL > 70 phút và cảnh báo nếu NGAY_YL → NGAY_TH_YL → NGAY_KQ bị ngược."
        />
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-bold text-slate-900">Các trường được sử dụng</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">Trường</th>
                <th className="px-3 py-3">Vị trí Bảng 3</th>
                <th className="px-3 py-3">Vai trò</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["MA_NHOM", "6", "Mã nhóm dùng để lọc cảnh báo; mặc định 2, 3, 8, 18"],
                ["NGAY_YL", "37", "Thời điểm chỉ định"],
                ["NGAY_TH_YL", "38", "Thời điểm thực hiện / bắt đầu tính"],
                ["NGAY_KQ", "39", "Thời điểm trả kết quả / kết thúc tính"],
                ["MA_LK, STT", "1–2", "Định danh hồ sơ và dòng dịch vụ"],
                ["MA_DICH_VU, MA_VAT_TU", "3, 5", "Mã dịch vụ và vật tư liên quan"],
                ["TEN_DICH_VU, TEN_VAT_TU", "9, 8", "Tên hiển thị chi tiết"],
              ].map(([field, position, role]) => (
                <tr key={field} className="border-t border-slate-100">
                  <td className="px-3 py-3 font-mono font-semibold text-teal-700">{field}</td>
                  <td className="px-3 py-3">{position}</td>
                  <td className="px-3 py-3 text-slate-600">{role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm leading-6 text-amber-900">
        <b>Lưu ý dữ liệu:</b> File được xử lý tại trình duyệt hiện tại; không upload lên server.
        Thời gian XML dạng
        <b>yyyymmddhhmm</b> được hiển thị thành <b>MM/DD/YYYY HH:mm</b>. Nếu thiếu hoặc sai định
        dạng mốc thời gian, hoặc thứ tự <b>NGAY_YL → NGAY_TH_YL → NGAY_KQ</b> bị ngược, dòng sẽ được
        cảnh báo để kiểm tra.
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
        description="Công cụ độc lập dành cho rà soát thời lượng dịch vụ kỹ thuật và vật tư y tế trong XML3."
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
        <h2 className="font-bold">Lịch sử phiên bản</h2>
        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm">
          <div className="font-bold text-teal-700">v1.0.0 · 2026-08-28</div>
          <p className="mt-1 text-slate-600">
            Khởi tạo công cụ kiểm tra thời gian thực hiện–trả kết quả XML3.
          </p>
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
