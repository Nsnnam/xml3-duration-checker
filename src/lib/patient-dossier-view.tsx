import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  type PatientDossier,
  XML_TABLE_META,
  ALL_XML_TABLE_KEYS,
  formatXmlString,
  extractPrimaryDiagnosis,
  XML1_FIELD_LABELS,
} from "./xml3-duration.ts";
import { formatXmlDateTime, formatXmlDate } from "./timezone.ts";

export function PatientDossierView({
  dossiers,
  selectedMaLk,
  onSelectPatient,
  onBackToChecker,
}: {
  dossiers: PatientDossier[];
  selectedMaLk: string | null;
  onSelectPatient: (maLk: string) => void;
  onBackToChecker: () => void;
}) {
  const [patientSearch, setPatientSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "warnings" | "clean">("all");
  const [activeTableKey, setActiveTableKey] = useState<string>("XML1");
  const [viewMode, setViewMode] = useState<"table" | "raw">("table");
  const [tableSearch, setTableSearch] = useState("");
  const [showWarningPanel, setShowWarningPanel] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [showFullPatientInfo, setShowFullPatientInfo] = useState(false);
  const [patientFieldSearch, setPatientFieldSearch] = useState("");
  const [copiedPatientField, setCopiedPatientField] = useState<string | null>(null);
  const [copiedAllDossierAdmin, setCopiedAllDossierAdmin] = useState(false);

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

  // Lọc dòng trong bảng dữ liệu
  const filteredTableRows = useMemo(() => {
    if (!currentTableData?.rows) return [];
    const q = tableSearch.trim().toLowerCase();
    if (!q) return currentTableData.rows;
    return currentTableData.rows.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(q)),
    );
  }, [currentTableData, tableSearch]);

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
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-teal-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-teal-700 dark:text-cyan-400">
              Tra cứu hồ sơ &amp; Đối chiếu dữ liệu
            </div>
            <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
              Tra cứu &amp; Xem XML Hồ sơ Bệnh nhân (15 bảng BHYT)
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-3xl">
              Xem toàn diện tất cả hồ sơ bệnh nhân (cả bệnh nhân có lỗi và không có lỗi), diễn giải
              chi tiết từng bảng XML theo 15 tab chuẩn Bộ Y tế, có hỗ trợ xem mã XML gốc.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToChecker}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-sm"
            >
              ← Quay lại Cảnh báo
            </button>
          </div>
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
              {/* Thẻ hành chính tổng hợp bệnh nhân */}
              <div className="rounded-2xl border border-teal-200/70 dark:border-cyan-900/60 bg-gradient-to-r from-teal-50/60 to-slate-50 dark:from-slate-800/80 dark:to-slate-800/40 p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-teal-100 dark:border-slate-700/60 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🧑‍⚕️</span>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">
                        {activeDossier.patient?.HO_TEN || "(Bệnh nhân chưa có tên)"}
                      </h3>
                      {activeDossier.patient?.GIOI_TINH && (
                        <span className="rounded-lg bg-teal-100 dark:bg-cyan-900/60 text-teal-800 dark:text-cyan-300 px-2 py-0.5 text-xs font-bold">
                          {activeDossier.patient.GIOI_TINH === "1"
                            ? "Nam"
                            : activeDossier.patient.GIOI_TINH === "2"
                              ? "Nữ"
                              : activeDossier.patient.GIOI_TINH}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs font-mono text-slate-600 dark:text-slate-300">
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
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer border ${
                          showWarningPanel
                            ? "bg-rose-600 text-white border-rose-700"
                            : "bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200"
                        }`}
                        title="Nhấn để xem danh sách các bảng lỗi và chuyển nhanh tới bảng bị cảnh báo"
                      >
                        <span>⚠️</span>
                        <span>{activeDossier.warningCount} cảnh báo cần rà soát</span>
                        <span className="text-[10px] opacity-80 font-normal">
                          {showWarningPanel ? "▲ Đóng" : "▼ Xem các bảng lỗi"}
                        </span>
                      </button>
                    ) : (
                      <div className="rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <span>✅</span>
                        <span>Hồ sơ đạt chuẩn (không có cảnh báo)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Các trường trọng tâm */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 p-2">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                      📥 Ngày vào viện
                    </span>
                    <b className="font-mono text-xs text-emerald-950 dark:text-emerald-200">
                      {formatXmlDateTime(activeDossier.patient?.NGAY_VAO) || "—"}
                    </b>
                  </div>
                  <div className="rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/40 p-2">
                    <span className="text-[10px] uppercase font-bold text-sky-700 dark:text-sky-400 block">
                      📤 Ngày ra viện
                    </span>
                    <b className="font-mono text-xs text-sky-950 dark:text-sky-200">
                      {formatXmlDateTime(activeDossier.patient?.NGAY_RA) || "—"}
                    </b>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                      🪪 Thẻ BHYT &amp; ĐKBD
                    </span>
                    <div className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                      {activeDossier.patient?.MA_THE_BHYT || "—"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2">
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
                              <span className="rounded bg-teal-100 dark:bg-cyan-900/60 text-teal-900 dark:text-cyan-200 px-1.5 py-0.2 font-mono font-black text-[11px]">
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
                <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-teal-100 dark:border-slate-700/60">
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

                    {/* Lọc trong bảng & Nút cuộn nhanh */}
                    {viewMode === "table" && currentTableData.rows.length > 0 && (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                          <input
                            type="text"
                            value={tableSearch}
                            onChange={(e) => setTableSearch(e.target.value)}
                            placeholder={`Lọc nhanh trong bảng ${activeTableKey}...`}
                            className="w-full max-w-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                          />
                          <span className="text-xs text-slate-400 whitespace-nowrap">
                            Hiển thị {filteredTableRows.length}/{currentTableData.rows.length} dòng
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
                                <th className="px-3 py-2.5 w-12 text-center sticky left-0 bg-slate-100 dark:bg-slate-900 z-20 border-r border-slate-200 dark:border-slate-800">
                                  #
                                </th>
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
                              {filteredTableRows.map((row, idx) => (
                                <tr
                                  key={idx}
                                  className="hover:bg-teal-50/40 dark:hover:bg-slate-800/60 transition"
                                >
                                  <td className="px-3 py-2 text-center text-slate-400 font-mono text-[11px] sticky left-0 bg-white dark:bg-slate-950 z-10 border-r border-slate-100 dark:border-slate-800/60">
                                    {idx + 1}
                                  </td>
                                  {currentTableData.headers.map((h) => (
                                    <td
                                      key={h}
                                      className="px-3 py-2 font-mono whitespace-nowrap border-r border-slate-100 dark:border-slate-800/60 last:border-r-0 max-w-[280px] truncate"
                                      title={row[h]}
                                    >
                                      {row[h] || "—"}
                                    </td>
                                  ))}
                                </tr>
                              ))}
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
    </div>
  );
}
