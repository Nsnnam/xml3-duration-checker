import React from "react";
import type { PatientInfo, Xml3Record } from "./xml3-duration.ts";
import { formatXmlDateTime, formatXmlDate } from "./timezone.ts";

export interface HoverCardData {
  maLk: string;
  patient?: PatientInfo;
  record?: Xml3Record;
  warningMessage?: string;
  source?: string;
  x: number;
  y: number;
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

  const durationStr =
    record?.durationMinutes !== null && record?.durationMinutes !== undefined
      ? `${record.durationMinutes} phút`
      : null;

  return (
    <div
      style={{
        position: "fixed",
        left: `${hoverData.x}px`,
        top: `${hoverData.y}px`,
        zIndex: 9999,
      }}
      className="w-[430px] max-w-[95vw] rounded-2xl border border-teal-500/30 dark:border-cyan-500/40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl p-4 text-xs text-slate-800 dark:text-slate-100 transition-all duration-150 animate-in fade-in zoom-in-95 pointer-events-auto"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base">🧑‍⚕️</span>
            <span className="font-bold text-sm text-teal-800 dark:text-teal-300">
              {patient?.HO_TEN || record?.HO_TEN || "Bệnh nhân (chưa rõ tên)"}
            </span>
            {patient?.GIOI_TINH && (
              <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                {patient.GIOI_TINH === "1"
                  ? "Nam"
                  : patient.GIOI_TINH === "2"
                    ? "Nữ"
                    : patient.GIOI_TINH}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span>
              Mã LK: <b className="text-slate-700 dark:text-slate-200">{maLk}</b>
            </span>
            {patient?.MA_BN && (
              <span>
                · Mã BN: <b className="text-slate-700 dark:text-slate-200">{patient.MA_BN}</b>
              </span>
            )}
            {patient?.NGAY_SINH && <span>· NS: {formatXmlDate(patient.NGAY_SINH)}</span>}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold px-1"
          title="Đóng popup"
        >
          ✕
        </button>
      </div>

      {/* Hành chính & Đợt điều trị (XML1) */}
      <div className="mt-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-2.5 space-y-1.5">
        <div className="text-[10px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-400 flex items-center gap-1">
          <span>🏥</span> Thông tin đợt điều trị (XML1)
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-1.5">
            <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-semibold block">
              📥 Ngày vào viện:
            </span>
            <b className="font-mono text-emerald-900 dark:text-emerald-200">
              {formatXmlDateTime(patient?.NGAY_VAO) || "—"}
            </b>
          </div>
          <div className="rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 p-1.5">
            <span className="text-[10px] text-sky-800 dark:text-sky-300 font-semibold block">
              📤 Ngày ra viện:
            </span>
            <b className="font-mono text-sky-900 dark:text-sky-200">
              {formatXmlDateTime(patient?.NGAY_RA) || "—"}
            </b>
          </div>
        </div>
        {patient?.MA_THE_BHYT && (
          <div className="text-[11px] text-slate-600 dark:text-slate-300 font-mono">
            Thẻ BHYT: <b className="text-slate-800 dark:text-slate-100">{patient.MA_THE_BHYT}</b>
            {patient.MA_DKBD && <span> (Nơi ĐKBD: {patient.MA_DKBD})</span>}
          </div>
        )}
        {patient?.TEN_BENH && (
          <div className="text-[11px] text-slate-600 dark:text-slate-300">
            Chẩn đoán:{" "}
            <span className="text-slate-800 dark:text-slate-100 font-medium">
              {patient.TEN_BENH}
            </span>
            {patient.MA_BENH && (
              <span className="font-mono font-bold text-teal-700 dark:text-teal-400">
                {" "}
                ({patient.MA_BENH})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Mốc thời gian DVKT (XML3) */}
      {record && (
        <div className="mt-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-2.5 space-y-1.5">
          <div className="text-[10px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-400 flex items-center justify-between">
            <span className="flex items-center gap-1">⏱️ Mốc thời gian DVKT (XML3)</span>
            {durationStr && (
              <span className="font-mono font-bold text-xs text-amber-700 dark:text-amber-400">
                Thời lượng: {durationStr}
              </span>
            )}
          </div>
          <div className="space-y-1 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">1. Chỉ định (NGAY_YL):</span>
              <b className="text-slate-800 dark:text-slate-200">
                {formatXmlDateTime(record.NGAY_YL) || "—"}
              </b>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">2. Thực hiện (NGAY_TH_YL):</span>
              <b className="text-slate-800 dark:text-slate-200">
                {formatXmlDateTime(record.NGAY_TH_YL) || "—"}
              </b>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">3. Trả kết quả (NGAY_KQ):</span>
              <b className="text-slate-800 dark:text-slate-200">
                {formatXmlDateTime(record.NGAY_KQ) || "—"}
              </b>
            </div>
          </div>
          <div className="pt-1 text-[11px] text-slate-600 dark:text-slate-300">
            Dịch vụ: <b>{record.TEN_DICH_VU || record.TEN_VAT_TU || record.MA_DICH_VU}</b> (Nhóm{" "}
            {record.MA_NHOM || "—"})
          </div>
        </div>
      )}

      {/* Chi tiết cảnh báo */}
      {warningMessage && (
        <div className="mt-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/40 p-2.5 text-rose-900 dark:text-rose-200 text-[11px] leading-relaxed">
          <div className="font-bold flex items-center gap-1 mb-0.5 text-xs">
            <span>⚠️</span> Nội dung cảnh báo:
          </div>
          <div>{warningMessage}</div>
        </div>
      )}

      {/* Footer link to Dossier */}
      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
        <span className="text-[10px] text-slate-400">Di chuột ra ngoài để đóng</span>
        <button
          onClick={() => onOpenDossier(maLk)}
          className="rounded-lg bg-teal-700 dark:bg-teal-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-teal-800 shadow-sm flex items-center gap-1 transition"
        >
          <span>🔍 Xem hồ sơ 15 bảng</span>
        </button>
      </div>
    </div>
  );
}
