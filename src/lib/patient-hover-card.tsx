import React, { useEffect, useState } from "react";
import {
  type PatientInfo,
  type Xml3Record,
  extractPrimaryDiagnosis,
  getXml3RecordCategory,
  WARNING_CATEGORY_CONFIG,
} from "./xml3-duration.ts";
import { formatXmlDateTime, formatXmlDate } from "./timezone.ts";

export interface HoverCardData {
  maLk: string;
  patient?: PatientInfo;
  record?: Xml3Record;
  warningMessage?: string;
  source?: string;
  x?: number;
  y?: number;
}

export function PatientHoverCard({
  hoverData,
  onClose,
  onOpenDossier,
}: {
  hoverData: HoverCardData;
  onClose: () => void;
  onOpenDossier: (maLk: string) => void;
}) {
  const { patient, record, warningMessage, maLk } = hoverData;
  const [copied, setCopied] = useState(false);

  // Lắng nghe phím ESC để đóng modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const durationStr =
    record?.durationMinutes !== null && record?.durationMinutes !== undefined
      ? `${record.durationMinutes} phút`
      : null;

  // Trích xuất chẩn đoán chính từ cột 26 trong bảng XML1 CHAN_DOAN_RV
  const diagnosis = extractPrimaryDiagnosis(
    patient?.CHAN_DOAN_RV,
    patient?.MA_BENH,
    patient?.TEN_BENH,
  );

  const category = record ? getXml3RecordCategory(record) : "all";
  const catMeta = WARNING_CATEGORY_CONFIG[category];

  const handleCopySummary = () => {
    const lines = [
      `THÔNG TIN BỆNH NHÂN [Mã LK: ${maLk}]`,
      `Họ và tên: ${patient?.HO_TEN || record?.HO_TEN || "—"}`,
      `Mã BN: ${patient?.MA_BN || "—"} | Giới tính: ${patient?.GIOI_TINH === "1" ? "Nam" : patient?.GIOI_TINH === "2" ? "Nữ" : patient?.GIOI_TINH || "—"}`,
      `Ngày sinh: ${formatXmlDate(patient?.NGAY_SINH) || "—"} | CCCD: ${patient?.SO_CCCD || "—"}`,
      `Thẻ BHYT: ${patient?.MA_THE_BHYT || "—"} (Nơi ĐKBD: ${patient?.MA_DKBD || "—"})`,
      `Vào viện: ${formatXmlDateTime(patient?.NGAY_VAO) || "—"} | Ra viện: ${formatXmlDateTime(patient?.NGAY_RA) || "—"}`,
      `Chẩn đoán chính (CHAN_DOAN_RV): ${diagnosis.code || "—"} ${diagnosis.full && diagnosis.full !== diagnosis.code ? `(${diagnosis.full})` : ""}`,
    ];

    if (record) {
      lines.push(
        `---`,
        `DỊCH VỤ XML3: ${record.TEN_DICH_VU || record.TEN_VAT_TU || record.MA_DICH_VU} (Nhóm: ${record.MA_NHOM || "—"})`,
        `Mã máy (MA_MAY): ${record.MA_MAY || "(trống)"}`,
        `Chỉ định (NGAY_YL): ${formatXmlDateTime(record.NGAY_YL) || "—"}`,
        `Thực hiện (NGAY_TH_YL): ${formatXmlDateTime(record.NGAY_TH_YL) || "—"}`,
        `Trả KQ (NGAY_KQ): ${formatXmlDateTime(record.NGAY_KQ) || "—"}`,
        `Thời lượng: ${durationStr || "—"}`,
      );
    }

    if (warningMessage) {
      lines.push(`---`, `CẢNH BÁO: ${warningMessage}`);
    }

    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[520px] max-w-[96vw] max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-5 text-xs text-slate-800 dark:text-slate-100 select-text animate-in zoom-in-95"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🧑‍⚕️</span>
              <span className="font-black text-base text-slate-900 dark:text-white">
                {patient?.HO_TEN || record?.HO_TEN || "Bệnh nhân (chưa rõ tên)"}
              </span>
              {patient?.GIOI_TINH && (
                <span className="rounded-md bg-teal-100 dark:bg-cyan-950/60 text-teal-800 dark:text-cyan-300 px-2 py-0.5 text-[11px] font-bold">
                  {patient.GIOI_TINH === "1"
                    ? "Nam"
                    : patient.GIOI_TINH === "2"
                      ? "Nữ"
                      : patient.GIOI_TINH}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
              <span>
                Mã LK: <b className="text-slate-800 dark:text-slate-200">{maLk}</b>
              </span>
              {patient?.MA_BN && (
                <span>
                  · Mã BN: <b className="text-slate-800 dark:text-slate-200">{patient.MA_BN}</b>
                </span>
              )}
              {patient?.NGAY_SINH && <span>· NS: {formatXmlDate(patient.NGAY_SINH)}</span>}
              {patient?.SO_CCCD && <span>· CCCD: {patient.SO_CCCD}</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition font-bold"
            title="Đóng (phím Esc)"
          >
            ✕
          </button>
        </div>

        {/* Hành chính & Đợt điều trị (XML1) */}
        <div className="mt-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 space-y-2.5">
          <div className="text-[11px] font-black uppercase tracking-wider text-teal-800 dark:text-cyan-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span>🏥</span> Thông tin đợt điều trị (XML1)
            </span>
            {patient?.MA_THE_BHYT && (
              <span className="font-mono text-slate-600 dark:text-slate-300 font-bold">
                BHYT: {patient.MA_THE_BHYT}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40 p-2.5">
              <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold block uppercase">
                📥 Ngày vào viện:
              </span>
              <b className="font-mono text-xs text-emerald-950 dark:text-emerald-200 mt-0.5 block">
                {formatXmlDateTime(patient?.NGAY_VAO) || "—"}
              </b>
            </div>
            <div className="rounded-xl bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-900/40 p-2.5">
              <span className="text-[10px] text-sky-800 dark:text-sky-300 font-bold block uppercase">
                📤 Ngày ra viện:
              </span>
              <b className="font-mono text-xs text-sky-950 dark:text-sky-200 mt-0.5 block">
                {formatXmlDateTime(patient?.NGAY_RA) || "—"}
              </b>
            </div>
          </div>

          {/* Chẩn đoán chính lấy từ cột 26 CHAN_DOAN_RV */}
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 text-xs">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">
              🩺 Chẩn đoán chính (Cột 26 CHAN_DOAN_RV):
            </div>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              {diagnosis.code ? (
                <>
                  <span className="rounded-lg bg-teal-100 dark:bg-cyan-900/60 text-teal-900 dark:text-cyan-200 px-2 py-0.5 font-mono font-black text-xs">
                    {diagnosis.code}
                  </span>
                  {diagnosis.full && diagnosis.full !== diagnosis.code && (
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {diagnosis.full.replace(diagnosis.code, "").replace(/^[\s:-]+/, "")}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-slate-400 italic">(Không có thông tin chẩn đoán)</span>
              )}
            </div>
          </div>
        </div>

        {/* Mốc thời gian DVKT (XML3) */}
        {record && (
          <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 space-y-2">
            <div className="text-[11px] font-black uppercase tracking-wider text-teal-800 dark:text-cyan-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>⏱️</span> Mốc thời gian DVKT (XML3)
              </span>
              {durationStr && (
                <span className="font-mono font-bold text-xs rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 px-2 py-0.5">
                  Thời lượng: {durationStr}
                </span>
              )}
            </div>
            <div className="space-y-1.5 font-mono text-xs bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">1. Chỉ định (NGAY_YL):</span>
                <b className="text-slate-900 dark:text-slate-100">
                  {formatXmlDateTime(record.NGAY_YL) || "—"}
                </b>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">
                  2. Thực hiện (NGAY_TH_YL):
                </span>
                <b className="text-slate-900 dark:text-slate-100">
                  {formatXmlDateTime(record.NGAY_TH_YL) || "—"}
                </b>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">
                  3. Trả kết quả (NGAY_KQ):
                </span>
                <b className="text-slate-900 dark:text-slate-100">
                  {formatXmlDateTime(record.NGAY_KQ) || "—"}
                </b>
              </div>
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-300 flex flex-col gap-1 pt-0.5">
              <div>
                Dịch vụ: <b>{record.TEN_DICH_VU || record.TEN_VAT_TU || record.MA_DICH_VU}</b> (Nhóm{" "}
                {record.MA_NHOM || "—"})
              </div>
              {record.MA_MAY && (
                <div className="font-mono text-[11px] text-indigo-700 dark:text-indigo-300">
                  Mã máy: <b>{record.MA_MAY}</b>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chi tiết nội dung cảnh báo */}
        {warningMessage && (
          <div className="mt-3 rounded-2xl border border-rose-300 dark:border-rose-900/60 bg-rose-50/90 dark:bg-rose-950/40 p-3.5 text-rose-950 dark:text-rose-200 text-xs leading-relaxed">
            <div className="font-bold flex items-center justify-between gap-1 mb-1">
              <span className="flex items-center gap-1.5">
                <span>⚠️</span> Chi tiết nội dung cảnh báo:
              </span>
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-black ${catMeta.badgeClass}`}
              >
                {catMeta.badgeText}
              </span>
            </div>
            <div className="font-medium bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/40 break-words select-all">
              {warningMessage}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleCopySummary}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition shadow-xs flex items-center gap-1.5"
          >
            <span>{copied ? "✅ Đã sao chép!" : "📋 Sao chép tóm tắt"}</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenDossier(maLk);
              }}
              className="rounded-xl bg-teal-700 dark:bg-cyan-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-teal-800 shadow-sm flex items-center gap-1.5 transition"
            >
              <span>🔍 Xem hồ sơ 15 bảng →</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
