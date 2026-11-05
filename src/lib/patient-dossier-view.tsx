import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  type PatientDossier,
  type Xml3Record,
  type ValidationWarning,
  XML_TABLE_META,
  ALL_XML_TABLE_KEYS,
  formatXmlString,
  extractPrimaryDiagnosis,
  XML1_FIELD_LABELS,
} from "./xml3-duration.ts";
import { formatXmlDateTime, formatXmlDate } from "./timezone.ts";

const COMMON_FIELD_LABELS: Record<string, string> = {
  STT: "Số thứ tự",
  MA_LK: "Mã liên kết",
  MA_BN: "Mã bệnh nhân",
  HO_TEN: "Họ và tên",
  MA_DICH_VU: "Mã dịch vụ kỹ thuật / cận lâm sàng",
  TEN_DICH_VU: "Tên dịch vụ kỹ thuật",
  MA_THUOC: "Mã thuốc",
  TEN_THUOC: "Tên thuốc",
  MA_VAT_TU: "Mã vật tư y tế",
  TEN_VAT_TU: "Tên vật tư y tế",
  MA_NHOM: "Mã nhóm BHYT",
  MA_KHOA: "Mã khoa",
  MA_GIUONG: "Mã giường bệnh",
  MA_BAC_SI: "Mã bác sĩ chỉ định",
  NGUOI_THUC_HIEN: "Người thực hiện",
  NGAY_YL: "Ngày giờ y lệnh",
  NGAY_TH_YL: "Ngày giờ thực hiện y lệnh",
  NGAY_KQ: "Ngày giờ có kết quả",
  MA_MAY: "Mã máy thực hiện (XX.3[xxx].Z)",
  MA_HIEU_SP: "Mã hiệu sản phẩm",
  TT_THAU: "Thông tin thầu",
  KET_LUAN: "Kết luận cận lâm sàng",
  GIA_TRI: "Chỉ số / Giá trị kết quả",
  MO_TA: "Mô tả hình ảnh / chi tiết CLS",
  DON_VI_TINH: "Đơn vị tính",
  SO_LUONG: "Số lượng",
  DON_GIA: "Đơn giá",
  DON_GIA_BV: "Đơn giá bệnh viện",
  TYLE_TT: "Tỷ lệ thanh toán",
  THANH_TIEN: "Thành tiền",
  THANH_TIEN_BV: "Thành tiền bệnh viện",
  T_TRANTT: "Trần thanh toán",
  T_BHTT: "Tiền bảo hiểm thanh toán",
  T_BNCCT: "Tiền bệnh nhân cùng chi trả",
  T_BNTT: "Tiền bệnh nhân tự trả",
  T_NGOAIDS: "Tiền ngoài danh sách BHYT",
  T_NGUONKHAC: "Tiền nguồn khác",
  MA_BENH: "Mã bệnh ICD-10",
  MA_BENH_YHCT: "Mã bệnh YHCT",
  TEN_BENH: "Tên bệnh",
  HAM_LUONG: "Hàm lượng",
  DUONG_DUNG: "Đường dùng",
  DANG_BAO_CHE: "Dạng bào chế",
  LIEU_DUNG: "Liều dùng",
  SO_DANG_KY: "Số đăng ký",
  SO_CCCD: "Số CCCD / Định danh",
};

function getFieldLabel(key: string): string {
  const k = key.toUpperCase();
  return XML1_FIELD_LABELS[k] || COMMON_FIELD_LABELS[k] || key;
}

type RowWarningInfo = {
  hasWarning: boolean;
  messages: string[];
  xml3Record?: Xml3Record;
  warningObj?: ValidationWarning;
};

function getRowWarningInfo(
  tableKey: string,
  row: Record<string, string>,
  rowIndex: number,
  dossier: PatientDossier | null,
): RowWarningInfo {
  if (!dossier) return { hasWarning: false, messages: [] };

  const messages: string[] = [];
  let matchedRecord: Xml3Record | undefined;
  let matchedWarning: ValidationWarning | undefined;

  const stt = row.STT?.trim();
  const maDv = (row.MA_DICH_VU || row.MA_VAT_TU || row.MA_THUOC)?.trim();

  if (tableKey === "XML3") {
    // 1. Khớp với xml3Records
    if (dossier.xml3Records && dossier.xml3Records.length > 0) {
      matchedRecord = dossier.xml3Records.find((rec) => {
        if (stt && rec.STT === stt) return true;
        if (maDv && (rec.MA_DICH_VU === maDv || rec.MA_VAT_TU === maDv)) return true;
        return false;
      });
    }

    if (matchedRecord) {
      if (matchedRecord.status === "warning") {
        messages.push(`Vượt thời lượng: ${matchedRecord.durationMinutes} phút (giới hạn <= 70p)`);
      }
      if (
        matchedRecord.hasEqualWarning ||
        (Boolean(matchedRecord.NGAY_TH_YL) &&
          Boolean(matchedRecord.NGAY_KQ) &&
          matchedRecord.NGAY_TH_YL === matchedRecord.NGAY_KQ)
      ) {
        messages.push("Trùng giờ thực hiện và trả kết quả (0 phút)");
      }
      if (matchedRecord.hasOrderWarning) {
        messages.push("Sai thứ tự: Giờ thực hiện sớm hơn giờ y lệnh");
      }
      if (matchedRecord.hasDuplicateMachineWarning) {
        messages.push("Trùng thời gian thực hiện trên cùng mã máy");
      }
      if (matchedRecord.hasMaMayWarning) {
        messages.push("Mã máy không đúng chuẩn XX.3[xxx].Z");
      }
      if (matchedRecord.hasTtThauWarning) {
        messages.push("Thiếu hoặc sai thông tin thầu");
      }
      if (matchedRecord.hasBedWarning) {
        messages.push("Cảnh báo giường bệnh");
      }
    }

    // 2. Khớp với warnings của XML3
    for (const w of dossier.warnings) {
      if (w.source === "XML3") {
        const matchByStt = stt && String(w.detailIndex) === stt;
        const matchByDv = maDv && w.MA_DICH_VU === maDv;
        if (matchByStt || matchByDv) {
          if (!messages.includes(w.message)) {
            messages.push(w.message);
          }
          if (!matchedWarning) matchedWarning = w;
          if (!matchedRecord && w.record) matchedRecord = w.record;
        }
      }
    }
  } else if (tableKey === "XML4") {
    for (const w of dossier.warnings) {
      if (w.source === "XML4") {
        const matchByStt = stt && String(w.detailIndex) === stt;
        const matchByDv = maDv && w.MA_DICH_VU === maDv;
        const matchByIndex = String(w.detailIndex) === String(rowIndex + 1);
        if (matchByStt || matchByDv || matchByIndex) {
          if (!messages.includes(w.message)) messages.push(w.message);
          if (!matchedWarning) matchedWarning = w;
        }
      }
    }
    // Kiểm tra trực tiếp thiếu KET_LUAN
    const ketLuan = row.KET_LUAN ? String(row.KET_LUAN).trim() : "";
    if (!ketLuan || ketLuan === "-") {
      const msg = "Thiếu kết luận cận lâm sàng (KET_LUAN trống)";
      if (!messages.includes(msg)) messages.push(msg);
      if (!matchedWarning) {
        matchedWarning = {
          source: "XML4",
          detailIndex: Number(stt || rowIndex + 1),
          MA_LK: dossier.maLk,
          HO_TEN: dossier.patient?.HO_TEN || "",
          MA_BN: dossier.patient?.MA_BN || "",
          MA_DICH_VU: row.MA_DICH_VU || "",
          TEN_DICH_VU: row.TEN_DICH_VU || "",
          message: msg,
          giaTri: row.GIA_TRI,
          patient: dossier.patient,
        };
      }
    }
  } else {
    // Các bảng khác
    for (const w of dossier.warnings) {
      if (w.source === tableKey) {
        const matchByStt = stt && String(w.detailIndex) === stt;
        const matchByDv = maDv && w.MA_DICH_VU === maDv;
        const matchByIndex = String(w.detailIndex) === String(rowIndex + 1);
        if (matchByStt || matchByDv || matchByIndex) {
          if (!messages.includes(w.message)) messages.push(w.message);
          if (!matchedWarning) matchedWarning = w;
        }
      }
    }
  }

  return {
    hasWarning: messages.length > 0,
    messages,
    xml3Record: matchedRecord,
    warningObj: matchedWarning,
  };
}

function RowDetailModal({
  isOpen,
  onClose,
  tableKey,
  rowIndex,
  totalRows,
  headers,
  row,
  warningInfo,
  onOpenDirectEdit,
  onPrev,
  onNext,
}: {
  isOpen: boolean;
  onClose: () => void;
  tableKey: string;
  rowIndex: number;
  totalRows: number;
  headers: string[];
  row: Record<string, string>;
  warningInfo?: RowWarningInfo;
  onOpenDirectEdit?: (target: {
    record?: Xml3Record;
    warning?: ValidationWarning;
    source: string;
  }) => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const [filter, setFilter] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  if (!isOpen || !row) return null;

  const displayEntries = headers
    .map((h) => ({
      key: h,
      label: getFieldLabel(h),
      val: row[h] ?? "",
    }))
    .filter((it) => {
      if (!filter) return true;
      const q = filter.toLowerCase();
      return (
        it.key.toLowerCase().includes(q) ||
        it.label.toLowerCase().includes(q) ||
        String(it.val).toLowerCase().includes(q)
      );
    });

  const handleCopyKey = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(JSON.stringify(row, null, 2));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-teal-50 to-white dark:from-slate-800 dark:to-slate-900 px-6 py-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <span>🔍</span>
              <span>
                Chi tiết dòng #{rowIndex} / {totalRows} · {tableKey}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {XML_TABLE_META[tableKey]?.title || tableKey} — Toàn bộ {headers.length} trường dữ
              liệu
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 dark:border-slate-700 p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 transition"
          >
            ✕
          </button>
        </div>

        {/* Cảnh báo lỗi trên dòng (nếu có) */}
        {warningInfo && warningInfo.hasWarning && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/60 px-6 py-2.5 text-xs text-rose-900 dark:text-rose-200">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base shrink-0">⚠️</span>
              <div className="min-w-0">
                <div className="font-bold">
                  Phát hiện {warningInfo.messages.length} cảnh báo lỗi trên dòng này:
                </div>
                <div className="text-[11px] text-rose-700 dark:text-rose-300 font-medium truncate">
                  {warningInfo.messages.join(" • ")}
                </div>
              </div>
            </div>
            {onOpenDirectEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDirectEdit({
                    record: warningInfo.xml3Record,
                    warning: warningInfo.warningObj,
                    source: tableKey,
                  });
                }}
                className="shrink-0 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold px-3 py-1.5 shadow-sm transition flex items-center gap-1.5"
              >
                <span>✏️</span> Sửa dòng này
              </button>
            )}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-6 py-2.5 text-xs">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Lọc tên trường hoặc giá trị..."
            className="w-64 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!onPrev || rowIndex <= 1}
              onClick={onPrev}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              ◀ Dòng trước
            </button>
            <button
              type="button"
              disabled={!onNext || rowIndex >= totalRows}
              onClick={onNext}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Dòng sau ▶
            </button>
            <button
              type="button"
              onClick={handleCopyAll}
              className="rounded-lg bg-teal-700 text-white px-3 py-1 text-xs font-bold hover:bg-teal-800 shadow-xs"
            >
              {copiedAll ? "✓ Đã chép JSON!" : "📋 Chép cả dòng (JSON)"}
            </button>
          </div>
        </div>

        {/* Entries list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {displayEntries.map((it) => (
            <div
              key={it.key}
              className="group flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-3 hover:bg-teal-50/40 dark:hover:bg-slate-800/70 transition"
            >
              <div className="min-w-[220px]">
                <div className="font-mono font-bold text-teal-800 dark:text-cyan-400 text-xs">
                  {it.key}
                </div>
                {it.label && it.label !== it.key && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{it.label}</div>
                )}
              </div>
              <div className="flex-1 flex items-center justify-between gap-2">
                <div className="font-mono text-xs text-slate-800 dark:text-slate-200 break-words whitespace-normal selection:bg-teal-200">
                  {it.val ? it.val : <span className="text-slate-400 italic">(trống)</span>}
                </div>
                {it.val && (
                  <button
                    type="button"
                    onClick={() => handleCopyKey(it.key, it.val)}
                    className="opacity-0 group-hover:opacity-100 transition rounded px-2 py-0.5 text-[10px] font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-teal-700 shadow-xs whitespace-nowrap"
                    title="Sao chép giá trị này"
                  >
                    {copiedKey === it.key ? "✓ Đã chép" : "Chép"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-6 py-3 flex justify-between items-center text-xs text-slate-500">
          <span>💡 Mẹo: Bấm phím mũi tên hoặc nút trước/sau để duyệt nhanh các dòng.</span>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 dark:bg-slate-700 px-4 py-1.5 font-bold text-white hover:bg-slate-900"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

export function PatientDossierView({
  dossiers,
  selectedMaLk,
  onSelectPatient,
  onBackToChecker,
  onOpenDirectEdit,
}: {
  dossiers: PatientDossier[];
  selectedMaLk: string | null;
  onSelectPatient: (maLk: string) => void;
  onBackToChecker: () => void;
  onOpenDirectEdit?: (target: {
    record?: Xml3Record;
    warning?: ValidationWarning;
    source: string;
  }) => void;
}) {
  const [patientSearch, setPatientSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "warnings" | "clean">("all");
  const [activeTableKey, setActiveTableKey] = useState<string>("XML1");
  const [viewMode, setViewMode] = useState<"table" | "raw">("table");
  const [tableSearch, setTableSearch] = useState("");
  const [onlyWarningRows, setOnlyWarningRows] = useState(false);
  const [showWarningPanel, setShowWarningPanel] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [showFullPatientInfo, setShowFullPatientInfo] = useState(false);
  const [patientFieldSearch, setPatientFieldSearch] = useState("");
  const [copiedPatientField, setCopiedPatientField] = useState<string | null>(null);
  const [copiedAllDossierAdmin, setCopiedAllDossierAdmin] = useState(false);
  const [detailRowIndex, setDetailRowIndex] = useState<number | null>(null);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);

  // Lọc danh sách bệnh nhân
  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    return dossiers.filter((d) => {
      // Filter status
      if (statusFilter === "warnings" && !d.hasWarnings) return false;
      if (statusFilter === "clean" && d.hasWarnings) return false;

      // Filter query
      if (!q) return true;
      const p = d.patient;
      return (
        d.maLk.toLowerCase().includes(q) ||
        (p?.HO_TEN && p.HO_TEN.toLowerCase().includes(q)) ||
        (p?.MA_BN && p.MA_BN.toLowerCase().includes(q)) ||
        (p?.SO_CCCD && p.SO_CCCD.toLowerCase().includes(q)) ||
        (p?.MA_THE_BHYT && p.MA_THE_BHYT.toLowerCase().includes(q)) ||
        (p?.MA_BENH && p.MA_BENH.toLowerCase().includes(q)) ||
        (p?.TEN_BENH && p.TEN_BENH.toLowerCase().includes(q))
      );
    });
  }, [dossiers, patientSearch, statusFilter]);

  // Bệnh nhân đang được chọn
  const activeDossier = useMemo(() => {
    if (!dossiers.length) return null;
    if (selectedMaLk) {
      const found = dossiers.find((d) => d.maLk === selectedMaLk);
      if (found) return found;
    }
    return filteredPatients[0] || dossiers[0] || null;
  }, [dossiers, selectedMaLk, filteredPatients]);

  // Đếm theo trạng thái
  const counts = useMemo(() => {
    const warningCount = dossiers.filter((d) => d.hasWarnings).length;
    return {
      all: dossiers.length,
      warnings: warningCount,
      clean: dossiers.length - warningCount,
    };
  }, [dossiers]);

  // Dữ liệu bảng hiện tại
  const currentTableData = activeDossier?.tables[activeTableKey];

  // Đếm số dòng có cảnh báo trong bảng hiện tại
  const currentTableWarningRowCount = useMemo(() => {
    if (!currentTableData?.rows || !activeDossier) return 0;
    return currentTableData.rows.reduce((count, row, idx) => {
      const info = getRowWarningInfo(activeTableKey, row, idx, activeDossier);
      return info.hasWarning ? count + 1 : count;
    }, 0);
  }, [currentTableData, activeTableKey, activeDossier]);

  // Lọc dòng trong bảng dữ liệu (kết hợp tìm kiếm & chỉ hiện dòng cảnh báo)
  const filteredTableRows = useMemo(() => {
    if (!currentTableData?.rows) return [];
    const q = tableSearch.trim().toLowerCase();

    const mapped = currentTableData.rows.map((row, idx) => ({
      row,
      originalIndex: idx,
      warningInfo: getRowWarningInfo(activeTableKey, row, idx, activeDossier),
    }));

    let result = mapped;
    if (onlyWarningRows) {
      result = result.filter((item) => item.warningInfo.hasWarning);
    }

    if (q) {
      result = result.filter(
        (item) =>
          Object.values(item.row).some((val) => String(val).toLowerCase().includes(q)) ||
          item.warningInfo.messages.some((m) => m.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [currentTableData, tableSearch, onlyWarningRows, activeTableKey, activeDossier]);

  // Tổng hợp toàn bộ các trường hành chính XML1 của bệnh nhân hiện tại
  const dossierAdminFields = useMemo(() => {
    if (!activeDossier) return [];
    const map = new Map<string, string>();
    const xml1Row = activeDossier.tables["XML1"]?.rows[0];
    if (xml1Row) {
      for (const [k, v] of Object.entries(xml1Row)) {
        if (v !== undefined && v !== null && v !== "") {
          map.set(k.toUpperCase(), String(v));
        }
      }
    }
    if (activeDossier.patient?.rawFields) {
      for (const [k, v] of Object.entries(activeDossier.patient.rawFields)) {
        if (v !== undefined && v !== null && v !== "") {
          map.set(k.toUpperCase(), String(v));
        }
      }
    }
    const p = activeDossier.patient;
    const knownFields: Array<[string, string | undefined]> = [
      ["MA_LK", activeDossier.maLk],
      ["MA_BN", p?.MA_BN],
      ["HO_TEN", p?.HO_TEN],
      ["SO_CCCD", p?.SO_CCCD],
      ["NGAY_SINH", p?.NGAY_SINH],
      [
        "GIOI_TINH",
        p?.GIOI_TINH === "1" ? "1 (Nam)" : p?.GIOI_TINH === "2" ? "2 (Nữ)" : p?.GIOI_TINH,
      ],
      ["DIA_CHI", p?.DIA_CHI],
      ["MA_THE_BHYT", p?.MA_THE_BHYT],
      ["MA_DKBD", p?.MA_DKBD],
      ["GT_THE_TU", p?.GT_THE_TU],
      ["GT_THE_DEN", p?.GT_THE_DEN],
      ["MIEN_CUNG_CT", p?.MIEN_CUNG_CT],
      ["NAM_NAM_LIEN_TUC", p?.NAM_NAM_LIEN_TUC],
      ["MA_DOITUONG_KCB", p?.MA_DOITUONG_KCB],
      ["MA_CSKCB", p?.MA_CSKCB],
      ["MA_NOI_CHUYEN", p?.MA_NOI_CHUYEN],
      ["MA_TAI_NAN", p?.MA_TAI_NAN],
      ["NGAY_VAO", p?.NGAY_VAO],
      ["NGAY_RA", p?.NGAY_RA],
      ["SO_NGAY_DTRI", p?.SO_NGAY_DTRI],
      ["MA_KHOA", p?.MA_KHOA],
      ["KET_QUA_DTRI", p?.KET_QUA_DTRI],
      ["TINH_TRANG_RV", p?.TINH_TRANG_RV],
      ["CHAN_DOAN_VAO", p?.CHAN_DOAN_VAO],
      ["CHAN_DOAN_RV", p?.CHAN_DOAN_RV],
      ["MA_BENH", p?.MA_BENH || p?.MA_BENH_CHINH],
      ["TEN_BENH", p?.TEN_BENH],
      ["MA_BENHKEMTHEO", p?.MA_BENHKEMTHEO],
      ["MA_QUOCTICH", p?.MA_QUOCTICH],
      ["MA_DANTOC", p?.MA_DANTOC],
      ["MA_KHUVUC", p?.MA_KHUVUC],
      ["NGHE_NGHIEP", p?.NGHE_NGHIEP],
      ["NOI_LAM_VIEC", p?.NOI_LAM_VIEC],
      ["CAN_NANG", p?.CAN_NANG],
      ["NGAY_TTOAN", p?.NGAY_TTOAN],
      ["TIEN_TONG", p?.TIEN_TONG],
      ["TIEN_BHYT", p?.TIEN_BHYT],
      ["TIEN_BNTT", p?.TIEN_BNTT],
    ];
    for (const [k, v] of knownFields) {
      if (v && !map.has(k)) {
        map.set(k, v);
      }
    }
    return Array.from(map.entries()).map(([key, value]) => ({
      key,
      label: XML1_FIELD_LABELS[key] || key,
      value,
    }));
  }, [activeDossier]);

  const filteredDossierAdminFields = useMemo(() => {
    const q = patientFieldSearch.trim().toLowerCase();
    if (!q) return dossierAdminFields;
    return dossierAdminFields.filter(
      (f) =>
        f.key.toLowerCase().includes(q) ||
        f.label.toLowerCase().includes(q) ||
        f.value.toLowerCase().includes(q),
    );
  }, [dossierAdminFields, patientFieldSearch]);

  const formatAdminValue = (key: string, val: string): { display: string; raw: string } => {
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

  const handleCopyPatientField = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedPatientField(key);
    setTimeout(() => setCopiedPatientField(null), 1500);
  };

  const handleCopyAllDossierAdmin = () => {
    if (!activeDossier) return;
    const text = [
      `=== THÔNG TIN HÀNH CHÍNH BỆNH NHÂN (XML1) ===`,
      `Mã LK: ${activeDossier.maLk}`,
      `Bệnh nhân: ${activeDossier.patient?.HO_TEN || "—"}`,
      ...dossierAdminFields.map((f) => `${f.label} [${f.key}]: ${f.value}`),
    ].join("\n");
    navigator.clipboard.writeText(text);
    setCopiedAllDossierAdmin(true);
    setTimeout(() => setCopiedAllDossierAdmin(false), 2000);
  };

  // Cập nhật độ rộng scroll của bảng khi đổi tab, tìm kiếm hoặc đổi chế độ xem
  useEffect(() => {
    if (tableContainerRef.current) {
      setTableScrollWidth(tableContainerRef.current.scrollWidth);
      tableContainerRef.current.scrollLeft = 0;
      if (topScrollRef.current) {
        topScrollRef.current.scrollLeft = 0;
      }
    }
  }, [activeTableKey, filteredTableRows, viewMode]);

  const handleScrollTable = () => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (topScrollRef.current && tableContainerRef.current) {
      topScrollRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
    }
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  const handleScrollTop = () => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (tableContainerRef.current && topScrollRef.current) {
      tableContainerRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  const handleScrollHorizontally = (offset: number) => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  const handleCopyRawXml = () => {
    if (!currentTableData?.rawXml) return;
    navigator.clipboard.writeText(currentTableData.rawXml);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleDownloadTableXml = () => {
    if (!currentTableData?.rawXml || !activeDossier) return;
    const blob = new Blob([currentTableData.rawXml], { type: "text/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeTableKey}_${activeDossier.maLk}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!dossiers.length) {
    return (
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center shadow-sm">
        <span className="text-4xl">📂</span>
        <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
          Chưa có hồ sơ XML nào được nạp
        </h3>
        <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
          Vui lòng chuyển sang tab <b>Kiểm tra thời gian</b> và nạp các file XML hồ sơ bệnh án để
          tra cứu và đối chiếu 15 bảng XML chi tiết.
        </p>
        <button
          onClick={onBackToChecker}
          className="mt-4 rounded-xl bg-teal-700 dark:bg-cyan-500 px-5 py-2 text-xs font-bold text-white hover:bg-teal-800 shadow-sm"
        >
          ← Đến trang nạp file XML
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Banner Thu gọn */}
      <div className="rounded-2xl border border-teal-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📋</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Tra cứu &amp; Xem XML Hồ sơ Bệnh nhân (15 bảng BHYT)
                </h2>
                <span className="rounded-md bg-teal-100 dark:bg-cyan-900/60 text-teal-800 dark:text-cyan-300 px-2 py-0.5 text-[10px] font-bold">
                  {dossiers.length} hồ sơ
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Đối chiếu 15 tab XML chuẩn Bộ Y tế · Xem chi tiết từng trường dữ liệu &amp; XML gốc
              </p>
            </div>
          </div>
          <button
            onClick={onBackToChecker}
            className="self-start sm:self-auto rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-xs transition"
          >
            ← Quay lại Cảnh báo
          </button>
        </div>
      </div>

      {/* Main Grid: 2 cột (Danh sách BN & Chi tiết 15 bảng) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Cột trái: Danh sách bệnh nhân (4 cột) */}
        <div className="lg:col-span-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col h-[calc(100vh-140px)] min-h-[620px]">
          {/* Ô tìm kiếm bệnh nhân */}
          <div className="space-y-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Tìm mã BN, họ tên, mã LK, CCCD, BHYT..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3.5 py-2 pl-8 text-xs text-slate-900 dark:text-slate-100 focus:border-teal-500 focus:outline-none"
              />
              <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</span>
              {patientSearch && (
                <button
                  onClick={() => setPatientSearch("")}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Bộ lọc tình trạng */}
            <div className="flex gap-1">
              <button
                onClick={() => setStatusFilter("all")}
                className={`flex-1 rounded-lg py-1 text-[11px] font-bold transition ${
                  statusFilter === "all"
                    ? "bg-slate-800 dark:bg-slate-700 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                Tất cả ({counts.all})
              </button>
              <button
                onClick={() => setStatusFilter("warnings")}
                className={`flex-1 rounded-lg py-1 text-[11px] font-bold transition ${
                  statusFilter === "warnings"
                    ? "bg-rose-600 text-white"
                    : "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100"
                }`}
              >
                ⚠️ Có lỗi ({counts.warnings})
              </button>
              <button
                onClick={() => setStatusFilter("clean")}
                className={`flex-1 rounded-lg py-1 text-[11px] font-bold transition ${
                  statusFilter === "clean"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100"
                }`}
              >
                ✅ Đạt ({counts.clean})
              </button>
            </div>
          </div>

          {/* Danh sách cuộn */}
          <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredPatients.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Không tìm thấy bệnh nhân phù hợp
              </div>
            ) : (
              filteredPatients.map((d) => {
                const isSelected = activeDossier?.maLk === d.maLk;
                const p = d.patient;
                const tableCount = Object.keys(d.tables).length;
                return (
                  <div
                    key={d.maLk}
                    onClick={() => onSelectPatient(d.maLk)}
                    className={`cursor-pointer rounded-2xl border p-3 transition-all duration-150 ${
                      isSelected
                        ? "border-teal-600 dark:border-cyan-400 bg-teal-50/50 dark:bg-cyan-950/20 shadow-sm"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {p?.HO_TEN || "(Chưa có tên)"}
                      </div>
                      {d.hasWarnings ? (
                        <span className="rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-2 py-0.5 text-[10px] font-bold whitespace-nowrap">
                          ⚠️ {d.warningCount} lỗi
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold whitespace-nowrap">
                          ✅ Đạt
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      <span>LK: {d.maLk}</span>
                      {p?.MA_BN && <span>· BN: {p.MA_BN}</span>}
                    </div>

                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                      <span>
                        Vào: <b>{formatXmlDate(p?.NGAY_VAO) || "—"}</b>
                      </span>
                      <span className="rounded-md bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 font-bold text-slate-700 dark:text-slate-200">
                        {tableCount}/15 bảng
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Cột phải: Chi tiết hồ sơ 15 bảng (8 cột) */}
        <div className="lg:col-span-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col h-[calc(100vh-140px)] min-h-[620px] overflow-hidden">
          {activeDossier ? (
            <div className="flex flex-col h-full space-y-4">
              {/* Thẻ hành chính tổng hợp bệnh nhân (gọn gàng, tối ưu chiều cao) */}
              <div className="rounded-2xl border border-teal-200/70 dark:border-cyan-900/60 bg-gradient-to-r from-teal-50/60 to-slate-50 dark:from-slate-800/80 dark:to-slate-800/40 p-3 sm:p-3.5 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 border-b border-teal-100 dark:border-slate-700/60 pb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🧑‍⚕️</span>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        {activeDossier.patient?.HO_TEN || "(Bệnh nhân chưa có tên)"}
                      </h3>
                      {activeDossier.patient?.GIOI_TINH && (
                        <span className="rounded-md bg-teal-100 dark:bg-cyan-900/60 text-teal-800 dark:text-cyan-300 px-1.5 py-0.2 text-[11px] font-bold">
                          {activeDossier.patient.GIOI_TINH === "1"
                            ? "Nam"
                            : activeDossier.patient.GIOI_TINH === "2"
                              ? "Nữ"
                              : activeDossier.patient.GIOI_TINH}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-2.5 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                      <span>
                        Mã LK: <b>{activeDossier.maLk}</b>
                      </span>
                      {activeDossier.patient?.MA_BN && (
                        <span>
                          · Mã BN: <b>{activeDossier.patient.MA_BN}</b>
                        </span>
                      )}
                      {activeDossier.patient?.NGAY_SINH && (
                        <span>· NS: {formatXmlDate(activeDossier.patient.NGAY_SINH)}</span>
                      )}
                      {activeDossier.patient?.SO_CCCD && (
                        <span>· CCCD: {activeDossier.patient.SO_CCCD}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeDossier.hasWarnings ? (
                      <button
                        type="button"
                        onClick={() => setShowWarningPanel((prev) => !prev)}
                        className={`rounded-xl px-2.5 py-1 text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer border ${
                          showWarningPanel
                            ? "bg-rose-600 text-white border-rose-700"
                            : "bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200"
                        }`}
                        title="Nhấn để xem danh sách các bảng lỗi và chuyển nhanh tới bảng bị cảnh báo"
                      >
                        <span>⚠️</span>
                        <span>{activeDossier.warningCount} cảnh báo</span>
                        <span className="text-[10px] opacity-80 font-normal">
                          {showWarningPanel ? "▲ Đóng" : "▼ Xem"}
                        </span>
                      </button>
                    ) : (
                      <div className="rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <span>✅</span>
                        <span>Đạt chuẩn</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Các trường trọng tâm compact */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 px-2.5 py-1.5">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                      📥 Vào viện
                    </span>
                    <b className="font-mono text-xs text-emerald-950 dark:text-emerald-200">
                      {formatXmlDateTime(activeDossier.patient?.NGAY_VAO) || "—"}
                    </b>
                  </div>
                  <div className="rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/40 px-2.5 py-1.5">
                    <span className="text-[10px] uppercase font-bold text-sky-700 dark:text-sky-400 block">
                      📤 Ra viện
                    </span>
                    <b className="font-mono text-xs text-sky-950 dark:text-sky-200">
                      {formatXmlDateTime(activeDossier.patient?.NGAY_RA) || "—"}
                    </b>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                      🪪 Thẻ BHYT
                    </span>
                    <div className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                      {activeDossier.patient?.MA_THE_BHYT || "—"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                      🩺 Chẩn đoán chính
                    </span>
                    {(() => {
                      const xml1ChanDoan = activeDossier.tables["XML1"]?.rows[0]?.CHAN_DOAN_RV;
                      const diag = extractPrimaryDiagnosis(
                        activeDossier.patient?.CHAN_DOAN_RV || xml1ChanDoan,
                        activeDossier.patient?.MA_BENH,
                        activeDossier.patient?.TEN_BENH,
                      );
                      return (
                        <div
                          className="font-bold text-xs text-teal-800 dark:text-cyan-300 truncate"
                          title={diag.full ? `${diag.code} - ${diag.full}` : diag.code || "—"}
                        >
                          {diag.code ? (
                            <span className="flex items-center gap-1 truncate">
                              <span className="rounded bg-teal-100 dark:bg-cyan-900/60 text-teal-900 dark:text-cyan-200 px-1 py-0.2 font-mono font-black text-[10px]">
                                {diag.code}
                              </span>
                              {diag.full && diag.full !== diag.code && (
                                <span className="font-normal text-slate-600 dark:text-slate-300 truncate text-[11px]">
                                  {diag.full.replace(diag.code, "").replace(/^[\s:-]+/, "")}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">—</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Nút bật/tắt xem toàn bộ thông tin hành chính XML1 */}
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-teal-100 dark:border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => setShowFullPatientInfo((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-teal-300 dark:border-cyan-800 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-teal-800 dark:text-cyan-300 hover:bg-teal-50 dark:hover:bg-slate-700/80 transition shadow-xs cursor-pointer"
                    title="Bật/tắt hiển thị toàn bộ các trường thông tin hành chính từ bảng XML1"
                  >
                    <span>📋</span>
                    <span>
                      {showFullPatientInfo
                        ? "▲ Thu gọn thông tin hành chính"
                        : "📋 Xem toàn bộ thông tin hành chính (XML1) ▼"}
                    </span>
                    <span className="text-[10px] opacity-70">
                      ({dossierAdminFields.length} trường)
                    </span>
                  </button>

                  {showFullPatientInfo && (
                    <button
                      type="button"
                      onClick={handleCopyAllDossierAdmin}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition shadow-xs cursor-pointer"
                    >
                      <span>
                        {copiedAllDossierAdmin ? "✅ Đã sao chép!" : "📋 Sao chép toàn bộ XML1"}
                      </span>
                    </button>
                  )}
                </div>

                {/* Bảng chi tiết toàn bộ thông tin hành chính XML1 khi mở rộng */}
                {showFullPatientInfo && (
                  <div className="mt-3 rounded-2xl border border-teal-200 dark:border-cyan-900/60 bg-white dark:bg-slate-900 p-3.5 space-y-3 animate-in fade-in shadow-xs">
                    {/* Header ô tìm kiếm */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={patientFieldSearch}
                          onChange={(e) => setPatientFieldSearch(e.target.value)}
                          placeholder="Tìm nhanh trường hành chính (VD: cccd, địa chỉ, nghề nghiệp, tiền, chẩn đoán, khoa...)"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 pl-8 text-xs text-slate-900 dark:text-slate-100 focus:border-teal-500 focus:outline-none"
                        />
                        <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs">🔍</span>
                        {patientFieldSearch && (
                          <button
                            type="button"
                            onClick={() => setPatientFieldSearch("")}
                            className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-600 text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        Hiển thị <b>{filteredDossierAdminFields.length}</b>/
                        {dossierAdminFields.length} trường
                      </span>
                    </div>

                    {/* Danh sách các trường hành chính dạng bảng cuộn */}
                    <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300">
                          <tr>
                            <th className="px-3 py-2 w-1/3">Tên thông tin</th>
                            <th className="px-2.5 py-2 w-1/4">Thẻ XML</th>
                            <th className="px-3 py-2">Giá trị</th>
                            <th className="px-2 py-2 w-10 text-center">Sao chép</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-xs">
                          {filteredDossierAdminFields.length === 0 ? (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-3 py-8 text-center text-slate-400 italic font-sans"
                              >
                                Không tìm thấy trường hành chính nào khớp với từ khóa
                              </td>
                            </tr>
                          ) : (
                            filteredDossierAdminFields.map((f) => {
                              const formatted = formatAdminValue(f.key, f.value);
                              const isCopied = copiedPatientField === f.key;
                              return (
                                <tr
                                  key={f.key}
                                  className="hover:bg-teal-50/50 dark:hover:bg-slate-800/60 transition-colors"
                                >
                                  <td className="px-3 py-2 font-sans font-semibold text-slate-800 dark:text-slate-200">
                                    {f.label}
                                  </td>
                                  <td className="px-2.5 py-2 text-[11px] text-teal-700 dark:text-cyan-400 font-bold">
                                    {f.key}
                                  </td>
                                  <td className="px-3 py-2 text-slate-900 dark:text-slate-100 break-all select-all font-medium">
                                    {formatted.display}
                                  </td>
                                  <td className="px-2 py-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleCopyPatientField(f.key, f.value)}
                                      className="p-1 rounded text-slate-400 hover:text-teal-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                                      title={`Sao chép ${f.key}: ${f.value}`}
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

                {/* Danh sách các cảnh báo (khi bấm vào nút cảnh báo phía trên) */}
                {showWarningPanel && activeDossier.hasWarnings && (
                  <div className="mt-3 rounded-2xl border border-rose-300 dark:border-rose-800 bg-rose-50/90 dark:bg-rose-950/50 p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-rose-200 dark:border-rose-900/80 pb-1.5">
                      <span className="font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                        <span>⚠️</span> Danh sách bảng XML có cảnh báo (
                        {activeDossier.warnings.length} lỗi):
                      </span>
                      <button
                        onClick={() => setShowWarningPanel(false)}
                        className="text-rose-700 hover:text-rose-900 text-xs font-bold px-1"
                      >
                        ✕ Đóng
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {activeDossier.warnings.map((w, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-3 p-2 rounded-xl bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-900/50 shadow-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="rounded-md bg-rose-600 text-white font-mono font-bold px-2 py-0.5 text-[10px] whitespace-nowrap">
                              {w.source}
                            </span>
                            <span className="font-mono text-slate-500 text-[11px] whitespace-nowrap">
                              #{w.detailIndex}
                            </span>
                            <span className="text-slate-800 dark:text-slate-200 text-xs truncate">
                              {w.message}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTableKey(w.source);
                              setViewMode("table");
                              setTableSearch("");
                            }}
                            className="rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200 px-2.5 py-1 text-[11px] font-bold whitespace-nowrap shadow-xs transition"
                          >
                            Xem bảng {w.source} →
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Thanh 15 Tab Bảng XML */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800 scrollbar-thin">
                {ALL_XML_TABLE_KEYS.map((tableKey) => {
                  const meta = XML_TABLE_META[tableKey];
                  const hasData = Boolean(activeDossier.tables[tableKey]);
                  const rowCount = activeDossier.tables[tableKey]?.rows?.length ?? 0;
                  const isActive = activeTableKey === tableKey;
                  const tableWarnings = activeDossier.warnings.filter((w) => w.source === tableKey);
                  const hasWarning = tableWarnings.length > 0;

                  let tabClasses = "";
                  if (isActive) {
                    if (hasWarning) {
                      tabClasses =
                        "bg-rose-600 text-white shadow-md ring-2 ring-rose-400 font-black";
                    } else {
                      tabClasses = "bg-teal-700 dark:bg-cyan-500 text-white shadow-sm font-bold";
                    }
                  } else if (hasWarning) {
                    tabClasses =
                      "bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-bold";
                  } else if (hasData) {
                    tabClasses =
                      "bg-teal-50 dark:bg-slate-800 text-teal-900 dark:text-teal-200 hover:bg-teal-100 font-bold";
                  } else {
                    tabClasses =
                      "bg-slate-100 dark:bg-slate-800/40 text-slate-400 hover:bg-slate-200/60";
                  }

                  return (
                    <button
                      key={tableKey}
                      onClick={() => {
                        setActiveTableKey(tableKey);
                        setTableSearch("");
                      }}
                      className={`whitespace-nowrap px-3 py-2 rounded-xl text-xs transition flex items-center gap-1.5 ${tabClasses}`}
                      title={
                        hasWarning
                          ? `${tableKey} có ${tableWarnings.length} cảnh báo lỗi`
                          : undefined
                      }
                    >
                      <span>{hasWarning ? "⚠️" : meta?.icon || "📄"}</span>
                      <span>{tableKey}</span>
                      {hasWarning && (
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider ${
                            isActive ? "bg-white text-rose-700" : "bg-rose-600 text-white"
                          }`}
                        >
                          {tableWarnings.length} lỗi
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          isActive
                            ? "bg-white/20 text-white"
                            : hasWarning
                              ? "bg-rose-200/70 text-rose-900"
                              : hasData
                                ? "bg-teal-200/80 dark:bg-teal-900 text-teal-800 dark:text-teal-200"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                        }`}
                      >
                        {rowCount}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Nội dung bảng XML đang chọn */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-3">
                {currentTableData ? (
                  <>
                    {/* Header thông tin bảng & công cụ */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{XML_TABLE_META[activeTableKey]?.icon}</span>
                          <span>{XML_TABLE_META[activeTableKey]?.title || activeTableKey}</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {XML_TABLE_META[activeTableKey]?.desc} ·{" "}
                          <b>{currentTableData.rows.length}</b> dòng dữ liệu
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Chuyển chế độ xem */}
                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 flex bg-slate-100 dark:bg-slate-800 text-xs">
                          <button
                            onClick={() => setViewMode("table")}
                            className={`px-3 py-1 rounded-lg font-bold transition ${
                              viewMode === "table"
                                ? "bg-white dark:bg-slate-700 text-teal-800 dark:text-cyan-300 shadow-sm"
                                : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                            }`}
                          >
                            📊 Bảng dữ liệu
                          </button>
                          <button
                            onClick={() => setViewMode("raw")}
                            className={`px-3 py-1 rounded-lg font-bold transition ${
                              viewMode === "raw"
                                ? "bg-white dark:bg-slate-700 text-teal-800 dark:text-cyan-300 shadow-sm"
                                : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                            }`}
                          >
                            📄 XML Gốc
                          </button>
                        </div>

                        {/* Thao tác Copy / Tải */}
                        <button
                          onClick={handleCopyRawXml}
                          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-sm"
                        >
                          {copyFeedback ? "✅ Đã chép!" : "📋 Sao chép XML"}
                        </button>
                        <button
                          onClick={handleDownloadTableXml}
                          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-sm"
                        >
                          💾 Tải .xml
                        </button>
                      </div>
                    </div>

                    {/* Lọc trong bảng, Checkbox chỉ hiện cảnh báo & Nút cuộn nhanh */}
                    {viewMode === "table" && currentTableData.rows.length > 0 && (
                      <div className="flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[200px]">
                          <input
                            type="text"
                            value={tableSearch}
                            onChange={(e) => setTableSearch(e.target.value)}
                            placeholder={`Lọc nhanh trong bảng ${activeTableKey}...`}
                            className="w-full max-w-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                          />

                          {/* Checkbox: Chỉ hiện dòng cảnh báo */}
                          <label
                            className={`flex items-center gap-1.5 cursor-pointer rounded-xl border px-2.5 py-1.5 text-xs font-bold transition select-none ${
                              onlyWarningRows
                                ? "bg-rose-600 text-white border-rose-700 shadow-xs ring-2 ring-rose-300"
                                : currentTableWarningRowCount > 0
                                  ? "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800 hover:bg-rose-100"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60"
                            }`}
                            title={
                              currentTableWarningRowCount > 0
                                ? `Lọc chỉ hiển thị ${currentTableWarningRowCount} dòng có cảnh báo lỗi trong bảng ${activeTableKey}`
                                : `Bảng ${activeTableKey} không có dòng cảnh báo lỗi nào`
                            }
                          >
                            <input
                              type="checkbox"
                              checked={onlyWarningRows}
                              disabled={currentTableWarningRowCount === 0}
                              onChange={(e) => setOnlyWarningRows(e.target.checked)}
                              className="rounded border-rose-400 text-rose-600 focus:ring-rose-500 cursor-pointer"
                            />
                            <span>⚠️ Chỉ hiện dòng cảnh báo ({currentTableWarningRowCount})</span>
                          </label>

                          <span className="text-xs text-slate-400 whitespace-nowrap">
                            Hiển thị <b>{filteredTableRows.length}</b>/
                            {currentTableData.rows.length} dòng ·{" "}
                            <span className="text-teal-700 dark:text-cyan-400 font-semibold">
                              💡 Click đúp xem chi tiết
                            </span>
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-500 font-semibold hidden sm:inline">
                            ↔ Cuộn cột:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleScrollHorizontally(-350)}
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-xs"
                            title="Cuộn bảng sang trái 350px"
                          >
                            ◀ Sang trái
                          </button>
                          <button
                            type="button"
                            onClick={() => handleScrollHorizontally(350)}
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-xs"
                            title="Cuộn bảng sang phải 350px"
                          >
                            Sang phải ▶
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Thanh cuộn ngang phụ ở đỉnh bảng: Kéo ngang ngay lập tức mà không cần cuộn xuống */}
                    {viewMode === "table" && tableScrollWidth > 0 && (
                      <div
                        ref={topScrollRef}
                        onScroll={handleScrollTop}
                        className="overflow-x-auto overflow-y-hidden border border-b-0 border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-900 rounded-t-2xl scrollbar-thin h-3.5"
                        title="Thanh cuộn ngang phụ: Kéo để xem các cột bên phải ngay lập tức"
                      >
                        <div style={{ width: `${tableScrollWidth}px`, height: "1px" }} />
                      </div>
                    )}

                    {/* Vùng hiển thị Data Grid hoặc Raw XML: cuộn dọc & ngang cùng một container */}
                    <div
                      ref={tableContainerRef}
                      onScroll={handleScrollTable}
                      className={`flex-1 min-h-0 overflow-x-auto overflow-y-auto border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 ${
                        viewMode === "table" && tableScrollWidth > 0
                          ? "rounded-b-2xl border-t-0"
                          : "rounded-2xl"
                      }`}
                    >
                      {viewMode === "table" ? (
                        currentTableData.rows.length === 0 ? (
                          <div className="p-8 text-center text-xs text-slate-400">
                            Bảng này không có bản ghi nào.
                          </div>
                        ) : (
                          <table className="w-full text-xs text-left border-collapse min-w-max">
                            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 text-[11px] font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 shadow-xs select-none">
                              <tr>
                                <th className="px-3 py-2.5 w-14 text-center sticky left-0 bg-slate-100 dark:bg-slate-900 z-20 border-r border-slate-200 dark:border-slate-800">
                                  #
                                </th>
                                {onOpenDirectEdit && (
                                  <th className="px-2 py-2.5 w-16 text-center border-r border-slate-200 dark:border-slate-800">
                                    Sửa
                                  </th>
                                )}
                                {currentTableData.headers.map((h) => (
                                  <th
                                    key={h}
                                    className="px-3 py-2.5 font-mono whitespace-nowrap border-r border-slate-200 dark:border-slate-800 last:border-r-0"
                                  >
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                              {filteredTableRows.map((item) => {
                                const { row, originalIndex, warningInfo } = item;
                                const isWarn = warningInfo.hasWarning;

                                return (
                                  <tr
                                    key={originalIndex}
                                    onDoubleClick={() => setDetailRowIndex(originalIndex)}
                                    className={`transition cursor-pointer select-text ${
                                      isWarn
                                        ? "bg-rose-50/80 dark:bg-rose-950/45 text-rose-950 dark:text-rose-100 hover:bg-rose-100/90 dark:hover:bg-rose-900/60 font-medium border-l-4 border-l-rose-500"
                                        : "hover:bg-teal-50/60 dark:hover:bg-slate-800/80"
                                    }`}
                                    title={
                                      isWarn
                                        ? `⚠️ CẢNH BÁO LỖI:\n${warningInfo.messages.join("\n")}\n\n💡 Click đúp để xem chi tiết / sửa trực tiếp`
                                        : "💡 Click đúp để xem chi tiết toàn bộ các trường của dòng này"
                                    }
                                  >
                                    <td
                                      className={`px-3 py-2 text-center font-mono text-[11px] sticky left-0 z-10 border-r ${
                                        isWarn
                                          ? "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 font-bold border-rose-200 dark:border-rose-900 shadow-xs"
                                          : "bg-white dark:bg-slate-950 text-slate-400 border-slate-100 dark:border-slate-800/60"
                                      }`}
                                    >
                                      <div className="flex items-center justify-center gap-1">
                                        {isWarn && <span className="text-xs">⚠️</span>}
                                        <span>{originalIndex + 1}</span>
                                      </div>
                                    </td>
                                    {onOpenDirectEdit && (
                                      <td className="px-2 py-1.5 text-center border-r border-slate-100 dark:border-slate-800/60 whitespace-nowrap">
                                        {isWarn ? (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onOpenDirectEdit({
                                                record: warningInfo.xml3Record,
                                                warning: warningInfo.warningObj,
                                                source: activeTableKey,
                                              });
                                            }}
                                            className="rounded-lg bg-teal-700 hover:bg-teal-800 text-white px-2 py-0.5 text-[10px] font-bold shadow-xs transition"
                                            title="Sửa trực tiếp dòng cảnh báo này"
                                          >
                                            ✏️ Sửa
                                          </button>
                                        ) : (
                                          <span className="text-slate-300 dark:text-slate-700 text-[10px]">
                                            —
                                          </span>
                                        )}
                                      </td>
                                    )}
                                    {currentTableData.headers.map((h) => (
                                      <td
                                        key={h}
                                        className={`px-3 py-2 font-mono whitespace-nowrap border-r max-w-[280px] truncate ${
                                          isWarn
                                            ? "border-rose-100 dark:border-rose-900/50"
                                            : "border-slate-100 dark:border-slate-800/60"
                                        } last:border-r-0`}
                                        title={row[h]}
                                      >
                                        {row[h] || "—"}
                                      </td>
                                    ))}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )
                      ) : (
                        /* Chế độ xem Raw XML */
                        <pre className="p-4 text-xs font-mono leading-5 text-slate-800 dark:text-cyan-300 whitespace-pre-wrap overflow-auto h-full selection:bg-teal-200">
                          {formatXmlString(currentTableData.rawXml)}
                        </pre>
                      )}
                    </div>
                  </>
                ) : (
                  /* Bảng không có dữ liệu */
                  <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center">
                    <span className="text-3xl opacity-40">📄</span>
                    <h4 className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                      Không tìm thấy dữ liệu bảng {activeTableKey}
                    </h4>
                    <p className="mt-1 text-xs text-slate-400 max-w-sm">
                      Hồ sơ XML của bệnh nhân này không chứa bảng {activeTableKey} (
                      {XML_TABLE_META[activeTableKey]?.shortName}).
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
              Chọn bệnh nhân bên trái để xem hồ sơ 15 bảng XML
            </div>
          )}
        </div>
      </div>

      {/* Modal Xem chi tiết dòng khi click đúp */}
      {detailRowIndex !== null && currentTableData && currentTableData.rows[detailRowIndex] && (
        <RowDetailModal
          isOpen={true}
          onClose={() => setDetailRowIndex(null)}
          tableKey={activeTableKey}
          rowIndex={detailRowIndex + 1}
          totalRows={currentTableData.rows.length}
          headers={currentTableData.headers}
          row={currentTableData.rows[detailRowIndex]}
          warningInfo={getRowWarningInfo(
            activeTableKey,
            currentTableData.rows[detailRowIndex],
            detailRowIndex,
            activeDossier,
          )}
          onOpenDirectEdit={onOpenDirectEdit}
          onPrev={detailRowIndex > 0 ? () => setDetailRowIndex(detailRowIndex - 1) : undefined}
          onNext={
            detailRowIndex < currentTableData.rows.length - 1
              ? () => setDetailRowIndex(detailRowIndex + 1)
              : undefined
          }
        />
      )}
    </div>
  );
}
