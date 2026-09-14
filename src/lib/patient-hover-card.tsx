import React, { useEffect, useState, useMemo } from "react";
import {
  type PatientInfo,
  type Xml3Record,
  extractPrimaryDiagnosis,
  getXml3RecordCategory,
  WARNING_CATEGORY_CONFIG,
  XML1_FIELD_LABELS,
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
  const [showFullAdminInfo, setShowFullAdminInfo] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedAllAdmin, setCopiedAllAdmin] = useState(false);

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

  // Chuẩn bị toàn bộ các trường hành chính XML1
  const allAdminFields = useMemo(() => {
    if (!patient) return [];
    const map = new Map<string, string>();
    if (patient.rawFields) {
      for (const [k, v] of Object.entries(patient.rawFields)) {
        if (v !== undefined && v !== null && v !== "") {
          map.set(k.toUpperCase(), String(v));
        }
      }
    }
    const knownFields: Array<[string, string | undefined]> = [
      ["MA_LK", patient.MA_LK],
      ["MA_BN", patient.MA_BN],
      ["HO_TEN", patient.HO_TEN],
      ["SO_CCCD", patient.SO_CCCD],
      ["NGAY_SINH", patient.NGAY_SINH],
      [
        "GIOI_TINH",
        patient.GIOI_TINH === "1"
          ? "1 (Nam)"
          : patient.GIOI_TINH === "2"
            ? "2 (Nữ)"
            : patient.GIOI_TINH,
      ],
      ["DIA_CHI", patient.DIA_CHI],
      ["MA_THE_BHYT", patient.MA_THE_BHYT],
      ["MA_DKBD", patient.MA_DKBD],
      ["GT_THE_TU", patient.GT_THE_TU],
      ["GT_THE_DEN", patient.GT_THE_DEN],
      ["MIEN_CUNG_CT", patient.MIEN_CUNG_CT],
      ["NAM_NAM_LIEN_TUC", patient.NAM_NAM_LIEN_TUC],
      ["MA_DOITUONG_KCB", patient.MA_DOITUONG_KCB],
      ["MA_CSKCB", patient.MA_CSKCB],
      ["MA_NOI_CHUYEN", patient.MA_NOI_CHUYEN],
      ["MA_TAI_NAN", patient.MA_TAI_NAN],
      ["NGAY_VAO", patient.NGAY_VAO],
      ["NGAY_RA", patient.NGAY_RA],
      ["SO_NGAY_DTRI", patient.SO_NGAY_DTRI],
      ["MA_KHOA", patient.MA_KHOA],
      ["KET_QUA_DTRI", patient.KET_QUA_DTRI],
      ["TINH_TRANG_RV", patient.TINH_TRANG_RV],
      ["CHAN_DOAN_VAO", patient.CHAN_DOAN_VAO],
      ["CHAN_DOAN_RV", patient.CHAN_DOAN_RV],
      ["MA_BENH", patient.MA_BENH || patient.MA_BENH_CHINH],
      ["TEN_BENH", patient.TEN_BENH],
      ["MA_BENHKEMTHEO", patient.MA_BENHKEMTHEO],
      ["MA_QUOCTICH", patient.MA_QUOCTICH],
      ["MA_DANTOC", patient.MA_DANTOC],
      ["MA_KHUVUC", patient.MA_KHUVUC],
      ["NGHE_NGHIEP", patient.NGHE_NGHIEP],
      ["NOI_LAM_VIEC", patient.NOI_LAM_VIEC],
      ["CAN_NANG", patient.CAN_NANG],
      ["NGAY_TTOAN", patient.NGAY_TTOAN],
      ["TIEN_TONG", patient.TIEN_TONG],
      ["TIEN_BHYT", patient.TIEN_BHYT],
      ["TIEN_BNTT", patient.TIEN_BNTT],
    ];
    for (const [key, val] of knownFields) {
      if (val && !map.has(key)) {
        map.set(key, val);
      }
    }
    return Array.from(map.entries()).map(([key, value]) => ({
      key,
      label: XML1_FIELD_LABELS[key] || key,
      value,
    }));
  }, [patient]);

  const filteredAdminFields = useMemo(() => {
    const q = adminSearch.trim().toLowerCase();
    if (!q) return allAdminFields;
    return allAdminFields.filter(
      (f) =>
        f.key.toLowerCase().includes(q) ||
        f.label.toLowerCase().includes(q) ||
        f.value.toLowerCase().includes(q),
    );
  }, [allAdminFields, adminSearch]);

  const formatFieldValue = (key: string, val: string): { display: string; raw: string } => {
    if (!val) return { display: "—", raw: "" };
    if (
      key.startsWith("NGAY_") ||
      key.endsWith("_TU") ||
      key.endsWith("_DEN") ||
      key.includes("LIEN_TUC") ||
      key.includes("CUNG_CT")
    ) {
      const formatted = formatXmlDateTime(val) || formatXmlDate(val);
      if (formatted && formatted !== val) {
        return { display: `${formatted} (${val})`, raw: val };
      }
    }
    if (key.startsWith("TIEN_") && !isNaN(Number(val))) {
      const num = Number(val);
      return { display: `${num.toLocaleString("vi-VN")} đ`, raw: val };
    }
    return { display: val, raw: val };
  };

  const handleCopyField = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const handleCopyAllAdmin = () => {
    const text = allAdminFields.map((f) => `${f.label} [${f.key}]: ${f.value}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopiedAllAdmin(true);
    setTimeout(() => setCopiedAllAdmin(false), 2000);
  };

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
        className={`${
          showFullAdminInfo ? "w-[720px]" : "w-[540px]"
        } max-w-[96vw] max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-5 text-xs text-slate-800 dark:text-slate-100 select-text transition-all duration-200 animate-in zoom-in-95`}
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

          {/* Nút bật/tắt xem toàn bộ thông tin hành chính */}
          <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-200/80 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setShowFullAdminInfo((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-teal-300 dark:border-cyan-800 bg-white dark:bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-teal-800 dark:text-cyan-300 hover:bg-teal-50 dark:hover:bg-cyan-950/40 transition shadow-2xs cursor-pointer"
            >
              <span>
                {showFullAdminInfo
                  ? "▲ Thu gọn thông tin hành chính"
                  : "📋 Xem toàn bộ thông tin hành chính (XML1) ▼"}
              </span>
            </button>
            {showFullAdminInfo && (
              <button
                type="button"
                onClick={handleCopyAllAdmin}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-[10px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-2xs"
              >
                <span>{copiedAllAdmin ? "✅ Đã sao chép!" : "📋 Sao chép toàn bộ"}</span>
              </button>
            )}
          </div>

          {/* Bảng chi tiết toàn bộ thông tin hành chính khi mở rộng */}
          {showFullAdminInfo && (
            <div className="rounded-xl border border-teal-200 dark:border-cyan-900/60 bg-white dark:bg-slate-900 p-3 space-y-2 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    placeholder="Tìm nhanh trường (VD: cccd, nghề nghiệp, tiền, chẩn đoán, khoa...)"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 pl-7 text-[11px] text-slate-800 dark:text-slate-100 focus:border-teal-500 focus:outline-none"
                  />
                  <span className="absolute left-2 top-1.5 text-slate-400 text-xs">🔍</span>
                  {adminSearch && (
                    <button
                      type="button"
                      onClick={() => setAdminSearch("")}
                      className="absolute right-2 top-1 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {filteredAdminFields.length}/{allAdminFields.length} trường
                </span>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="px-2.5 py-1.5 w-1/3">Tên thông tin</th>
                      <th className="px-2 py-1.5 w-1/4">Thẻ XML</th>
                      <th className="px-2.5 py-1.5">Giá trị</th>
                      <th className="px-1.5 py-1.5 w-8 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                    {filteredAdminFields.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-3 py-6 text-center text-slate-400 italic font-sans"
                        >
                          Không tìm thấy trường nào khớp với từ khóa
                        </td>
                      </tr>
                    ) : (
                      filteredAdminFields.map((f) => {
                        const formatted = formatFieldValue(f.key, f.value);
                        const isCopied = copiedField === f.key;
                        return (
                          <tr
                            key={f.key}
                            className="hover:bg-teal-50/50 dark:hover:bg-slate-800/60 transition-colors"
                          >
                            <td className="px-2.5 py-1.5 font-sans font-semibold text-slate-800 dark:text-slate-200">
                              {f.label}
                            </td>
                            <td className="px-2 py-1.5 text-[10px] text-teal-700 dark:text-cyan-400 font-bold">
                              {f.key}
                            </td>
                            <td className="px-2.5 py-1.5 text-slate-900 dark:text-slate-100 break-all select-all font-medium">
                              {formatted.display}
                            </td>
                            <td className="px-1.5 py-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleCopyField(f.key, f.value)}
                                className="p-1 rounded text-slate-400 hover:text-teal-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                                title="Sao chép giá trị này"
                              >
                                {isCopied ? "✅" : "📋"}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
