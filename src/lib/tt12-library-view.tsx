import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  type CskcbUnit,
  type Tt12UnitData,
  type Tt12Bang6ThietBi,
  type Tt12Bang1KhoaPhong,
  type Tt12Bang2NhanLuc,
  type Tt12Bang3Thuoc,
  type Tt12Bang4VatTu,
  type Tt12Bang5DichVu,
  loadTt12Catalogs,
  saveTt12Catalogs,
  upsertUnitInfo,
  deleteUnitCatalog,
  saveUnitTableData,
  exportTt12TemplateExcel,
  exportTt12UnitToExcel,
  importTt12FromExcel,
  loadExcludedDepts,
  saveExcludedDepts,
  DEFAULT_EXCLUDED_DEPTS,
} from "./tt12-library.ts";
import { DEFAULT_TT12_CATALOGS } from "./tt12-default-data.ts";
import { matchesTextFilter } from "./timezone.ts";

export type Tt12RowItem =
  | Tt12Bang1KhoaPhong
  | Tt12Bang2NhanLuc
  | Tt12Bang3Thuoc
  | Tt12Bang4VatTu
  | Tt12Bang5DichVu
  | Tt12Bang6ThietBi;

export function Tt12LibraryView({ onRefreshXmlAudit }: { onRefreshXmlAudit?: () => void }) {
  const [catalogs, setCatalogs] = useState<Record<string, Tt12UnitData>>(loadTt12Catalogs);
  const unitList = useMemo(() => Object.values(catalogs), [catalogs]);

  const [selectedMaCskcb, setSelectedMaCskcb] = useState<string>(() => {
    return unitList[0]?.unit.maCskcb || "26066";
  });

  const currentUnitData = useMemo(() => {
    return (
      catalogs[selectedMaCskcb] || {
        unit: {
          maCskcb: selectedMaCskcb,
          tenCskcb: `Cơ sở KCB ${selectedMaCskcb}`,
          capKcb: "co_ban",
        },
        bang1: [],
        bang2: [],
        bang3: [],
        bang4: [],
        bang5: [],
        bang6: [],
      }
    );
  }, [catalogs, selectedMaCskcb]);

  const [tableTab, setTableTab] = useState<
    "bang1" | "bang2" | "bang3" | "bang4" | "bang5" | "bang6"
  >("bang6");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 40;

  // Multi-select & Shift-click state
  const [selectedItems, setSelectedItems] = useState<Set<Tt12RowItem>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

  // Khi đổi đơn vị hoặc đổi tab bảng hoặc tìm kiếm -> reset selection
  useEffect(() => {
    setSelectedItems(new Set());
    setLastClickedIndex(null);
  }, [selectedMaCskcb, tableTab, searchQuery]);

  // Cấu hình mã khoa loại trừ (QĐ 5937 / K01)
  const [excludedDepts, setExcludedDepts] = useState<string[]>(loadExcludedDepts);
  const [isExcludedDeptsModalOpen, setIsExcludedDeptsModalOpen] = useState(false);
  const [newDeptCode, setNewDeptCode] = useState("");

  // Modal thêm/sửa đơn vị
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [unitFormMa, setUnitFormMa] = useState("");
  const [unitFormTen, setUnitFormTen] = useState("");
  const [unitFormCap, setUnitFormCap] = useState<"co_ban" | "chuyen_sau" | "ban_dau">("co_ban");
  const [unitFormGhiChu, setUnitFormGhiChu] = useState("");

  // Modal thêm dòng mới cho Bảng 6 (Thiết bị)
  const [isAddMachineModalOpen, setIsAddMachineModalOpen] = useState(false);
  const [newTenTb, setNewTenTb] = useState("");
  const [newKyHieu, setNewKyHieu] = useState("");
  const [newMaMay, setNewMaMay] = useState("");
  const [newCongTySx, setNewCongTySx] = useState("");
  const [newTuNgay, setNewTuNgay] = useState("");
  const [newDenNgay, setNewDenNgay] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showNotice = (text: string, type: "success" | "error" = "success") => {
    setNotice({ text, type });
    setTimeout(() => setNotice(null), 4500);
  };

  const handleOpenAddUnit = () => {
    setModalMode("add");
    setUnitFormMa("");
    setUnitFormTen("");
    setUnitFormCap("co_ban");
    setUnitFormGhiChu("");
    setIsUnitModalOpen(true);
  };

  const handleOpenEditUnit = () => {
    setModalMode("edit");
    setUnitFormMa(currentUnitData.unit.maCskcb);
    setUnitFormTen(currentUnitData.unit.tenCskcb);
    setUnitFormCap(currentUnitData.unit.capKcb || "co_ban");
    setUnitFormGhiChu(currentUnitData.unit.ghiChu || "");
    setIsUnitModalOpen(true);
  };

  const handleSaveUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitFormMa.trim() || !unitFormTen.trim()) {
      showNotice("Vui lòng điền đầy đủ Mã CSKCB và Tên cơ sở khám chữa bệnh.", "error");
      return;
    }
    const unit: CskcbUnit = {
      maCskcb: unitFormMa.trim(),
      tenCskcb: unitFormTen.trim(),
      capKcb: unitFormCap,
      ghiChu: unitFormGhiChu.trim(),
    };
    upsertUnitInfo(unit);
    const updated = loadTt12Catalogs();
    setCatalogs(updated);
    setSelectedMaCskcb(unit.maCskcb);
    setIsUnitModalOpen(false);
    showNotice(`Đã lưu thông tin cơ sở khám chữa bệnh ${unit.maCskcb} (${unit.tenCskcb}).`);
    onRefreshXmlAudit?.();
  };

  const handleDeleteUnit = () => {
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa đơn vị ${currentUnitData.unit.maCskcb} (${currentUnitData.unit.tenCskcb}) cùng toàn bộ 6 bảng danh mục của đơn vị này?`,
      )
    ) {
      return;
    }
    deleteUnitCatalog(currentUnitData.unit.maCskcb);
    const updated = loadTt12Catalogs();
    setCatalogs(updated);
    const remaining = Object.keys(updated);
    if (remaining.length > 0) {
      setSelectedMaCskcb(remaining[0]);
    }
    showNotice(`Đã xóa đơn vị ${currentUnitData.unit.maCskcb}.`);
    onRefreshXmlAudit?.();
  };

  const handleResetToDefault = () => {
    if (
      !window.confirm(
        "Khôi phục danh mục Thông tư 12 mặc định (26066 - BVĐK Lạc Việt Phúc Yên, 26193 - BVHN Lạc Việt)? Dữ liệu tùy biến sẽ được làm mới.",
      )
    ) {
      return;
    }
    saveTt12Catalogs(DEFAULT_TT12_CATALOGS);
    setCatalogs(DEFAULT_TT12_CATALOGS);
    setSelectedMaCskcb("26066");
    showNotice("Đã khôi phục danh mục Thông tư 12 về dữ liệu gốc.");
    onRefreshXmlAudit?.();
  };

  const handleImportExcelFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await importTt12FromExcel(file, selectedMaCskcb);
      if (res.success) {
        const updated = loadTt12Catalogs();
        setCatalogs(updated);
        if (res.unitMaCskcb) setSelectedMaCskcb(res.unitMaCskcb);
        showNotice(res.message, "success");
        onRefreshXmlAudit?.();
      } else {
        showNotice(res.message, "error");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showNotice(`Lỗi nạp file: ${msg}`, "error");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleExportUnitExcel = async () => {
    try {
      await exportTt12UnitToExcel(currentUnitData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showNotice(`Lỗi xuất Excel: ${msg}`, "error");
    }
  };

  // Thao tác với danh sách mã khoa loại trừ (QĐ 5937 / K01)
  const handleAddExcludedDept = (e: React.FormEvent) => {
    e.preventDefault();
    const code = newDeptCode.trim().toUpperCase();
    if (!code) return;
    if (excludedDepts.includes(code)) {
      showNotice(`Mã khoa '${code}' đã có trong danh sách loại trừ.`, "error");
      return;
    }
    const updated = [...excludedDepts, code];
    saveExcludedDepts(updated);
    setExcludedDepts(updated);
    setNewDeptCode("");
    showNotice(`Đã thêm mã khoa '${code}' vào danh sách loại trừ cảnh báo Bảng 1.`);
    onRefreshXmlAudit?.();
  };

  const handleRemoveExcludedDept = (code: string) => {
    const updated = excludedDepts.filter((d) => d !== code);
    saveExcludedDepts(updated);
    setExcludedDepts(updated);
    showNotice(`Đã xóa mã khoa '${code}' khỏi danh sách loại trừ.`);
    onRefreshXmlAudit?.();
  };

  const handleResetExcludedDepts = () => {
    saveExcludedDepts([...DEFAULT_EXCLUDED_DEPTS]);
    setExcludedDepts([...DEFAULT_EXCLUDED_DEPTS]);
    showNotice("Đã khôi phục danh sách mã khoa loại trừ mặc định (K01 - QĐ 5937).");
    onRefreshXmlAudit?.();
  };

  // Thêm thiết bị vào Bảng 6
  const handleAddMachine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaMay.trim()) {
      showNotice("Vui lòng nhập Mã máy chuẩn (MA_MAY).", "error");
      return;
    }
    const newRecord: Tt12Bang6ThietBi = {
      stt: currentUnitData.bang6.length + 1,
      tenTb: newTenTb.trim() || newMaMay.trim(),
      kyHieu: newKyHieu.trim(),
      maMay: newMaMay.trim(),
      congTySx: newCongTySx.trim(),
      tuNgay: newTuNgay.trim(),
      denNgay: newDenNgay.trim(),
      maCskcb: currentUnitData.unit.maCskcb,
    };
    const updated = [newRecord, ...currentUnitData.bang6];
    saveUnitTableData(currentUnitData.unit.maCskcb, "bang6", updated);
    setCatalogs(loadTt12Catalogs());
    setIsAddMachineModalOpen(false);
    setNewTenTb("");
    setNewKyHieu("");
    setNewMaMay("");
    setNewCongTySx("");
    setNewTuNgay("");
    setNewDenNgay("");
    showNotice(`Đã thêm máy '${newRecord.maMay}' vào Bảng 6 của đơn vị.`);
    onRefreshXmlAudit?.();
  };

  // Xóa 1 dòng duy nhất (dùng object reference trực tiếp)
  const handleDeleteSingleItem = (
    tab: "bang1" | "bang2" | "bang3" | "bang4" | "bang5" | "bang6",
    targetItem: Tt12RowItem,
  ) => {
    let desc = "";
    if (tab === "bang6") {
      const t = targetItem as Tt12Bang6ThietBi;
      desc = `máy '${t.maMay}' (${t.tenTb})`;
    } else if (tab === "bang1") {
      const t = targetItem as Tt12Bang1KhoaPhong;
      desc = `khoa '${t.maKhoa}' (${t.tenKhoa})`;
    } else if (tab === "bang2") {
      const t = targetItem as Tt12Bang2NhanLuc;
      desc = `nhân viên '${t.hoTen}' (CCHN: ${t.macchn})`;
    } else if (tab === "bang3") {
      const t = targetItem as Tt12Bang3Thuoc;
      desc = `thuốc '${t.maThuoc}' (${t.tenThuoc})`;
    } else if (tab === "bang4") {
      const t = targetItem as Tt12Bang4VatTu;
      desc = `vật tư '${t.maVatTu}' (${t.tenVatTu})`;
    } else if (tab === "bang5") {
      const t = targetItem as Tt12Bang5DichVu;
      desc = `dịch vụ '${t.maDichVu}' (${t.tenDichVu})`;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${desc} khỏi danh mục?`)) return;

    const currentList = (currentUnitData[tab] || []) as Tt12RowItem[];
    const updated = currentList.filter((item) => item !== targetItem);
    saveUnitTableData(currentUnitData.unit.maCskcb, tab, updated as never);
    setCatalogs(loadTt12Catalogs());
    const nextSelected = new Set(selectedItems);
    nextSelected.delete(targetItem);
    setSelectedItems(nextSelected);
    showNotice(`Đã xóa thành công ${desc}.`);
    onRefreshXmlAudit?.();
  };

  // Filter dữ liệu bảng đang chọn (hỗ trợ tiếng Việt có dấu, không dấu, multi-word, NFC/NFD)
  const filteredData = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) {
      if (tableTab === "bang6") return currentUnitData.bang6;
      if (tableTab === "bang1") return currentUnitData.bang1;
      if (tableTab === "bang2") return currentUnitData.bang2;
      if (tableTab === "bang3") return currentUnitData.bang3;
      if (tableTab === "bang4") return currentUnitData.bang4;
      if (tableTab === "bang5") return currentUnitData.bang5;
      return [];
    }
    if (tableTab === "bang6") {
      return currentUnitData.bang6.filter(
        (m) =>
          matchesTextFilter(m.maMay, q) ||
          matchesTextFilter(m.tenTb, q) ||
          matchesTextFilter(m.kyHieu, q) ||
          matchesTextFilter(m.soLuuHanh, q) ||
          matchesTextFilter(m.congTySx, q),
      );
    }
    if (tableTab === "bang1") {
      return currentUnitData.bang1.filter(
        (d) =>
          matchesTextFilter(d.maKhoa, q) ||
          matchesTextFilter(d.tenKhoa, q) ||
          matchesTextFilter(d.banKham, q),
      );
    }
    if (tableTab === "bang2") {
      return currentUnitData.bang2.filter(
        (d) =>
          matchesTextFilter(d.hoTen, q) ||
          matchesTextFilter(d.macchn, q) ||
          matchesTextFilter(d.maKhoa, q) ||
          matchesTextFilter(d.phamViCm, q),
      );
    }
    if (tableTab === "bang3") {
      return currentUnitData.bang3.filter(
        (d) =>
          matchesTextFilter(d.maThuoc, q) ||
          matchesTextFilter(d.tenThuoc, q) ||
          matchesTextFilter(d.tenHoatChat, q),
      );
    }
    if (tableTab === "bang4") {
      return currentUnitData.bang4.filter(
        (d) =>
          matchesTextFilter(d.maVatTu, q) ||
          matchesTextFilter(d.tenVatTu, q) ||
          matchesTextFilter(d.maHieu, q),
      );
    }
    if (tableTab === "bang5") {
      return currentUnitData.bang5.filter(
        (d) => matchesTextFilter(d.maDichVu, q) || matchesTextFilter(d.tenDichVu, q),
      );
    }
    return [];
  }, [currentUnitData, tableTab, searchQuery]);

  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE) || 1;
  const pagedData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredData.slice(start, start + PAGE_SIZE);
  }, [filteredData, page]);

  // Kiểm tra trạng thái chọn tất cả trên trang hiện tại
  const isAllPageSelected =
    pagedData.length > 0 && pagedData.every((item) => selectedItems.has(item));

  // Toggle chọn tất cả trên trang hiện tại
  const handleToggleSelectAllPage = () => {
    const next = new Set(selectedItems);
    if (isAllPageSelected) {
      pagedData.forEach((item) => next.delete(item));
    } else {
      pagedData.forEach((item) => next.add(item));
    }
    setSelectedItems(next);
  };

  // Click chọn 1 dòng kèm hỗ trợ Shift-click chọn dải
  const handleToggleRowItem = (item: Tt12RowItem, idxOnPage: number, e: React.MouseEvent) => {
    const next = new Set(selectedItems);
    if (e.shiftKey && lastClickedIndex !== null) {
      const start = Math.min(lastClickedIndex, idxOnPage);
      const end = Math.max(lastClickedIndex, idxOnPage);
      for (let i = start; i <= end; i++) {
        const target = pagedData[i] as Tt12RowItem | undefined;
        if (target) next.add(target);
      }
    } else {
      if (next.has(item)) {
        next.delete(item);
      } else {
        next.add(item);
      }
      setLastClickedIndex(idxOnPage);
    }
    setSelectedItems(next);
  };

  // Xóa các dòng đã chọn
  const handleDeleteSelected = () => {
    const count = selectedItems.size;
    if (count === 0) return;
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa ${count} dòng đã chọn khỏi Bảng danh mục của cơ sở ${currentUnitData.unit.maCskcb}?`,
      )
    ) {
      return;
    }
    const currentList = (currentUnitData[tableTab] || []) as Tt12RowItem[];
    const updated = currentList.filter((item) => !selectedItems.has(item));
    saveUnitTableData(currentUnitData.unit.maCskcb, tableTab, updated as never);
    setCatalogs(loadTt12Catalogs());
    setSelectedItems(new Set());
    setLastClickedIndex(null);
    showNotice(`Đã xóa thành công ${count} dòng đã chọn khỏi danh mục.`);
    onRefreshXmlAudit?.();
  };

  // Xóa toàn bộ dữ liệu của Bảng hiện tại
  const handleClearEntireTable = () => {
    const count = currentUnitData[tableTab]?.length || 0;
    if (count === 0) {
      showNotice("Bảng này hiện đang rỗng, không có dữ liệu để xóa.", "error");
      return;
    }
    const tabTitles: Record<string, string> = {
      bang1: "Bảng 1 (Bộ phận chuyên môn / Khoa phòng)",
      bang2: "Bảng 2 (Nhân lực KCB / CCHN)",
      bang3: "Bảng 3 (Thuốc & Chế phẩm máu)",
      bang4: "Bảng 4 (Vật tư y tế)",
      bang5: "Bảng 5 (Dịch vụ kỹ thuật)",
      bang6: "Bảng 6 (Trang thiết bị y tế / Mã máy)",
    };
    const title = tabTitles[tableTab] || tableTab;
    if (
      !window.confirm(
        `⚠️ CẢNH BÁO QUAN TRỌNG:\n\nBạn có chắc chắn muốn XÓA TOÀN BỘ ${count.toLocaleString(
          "vi-VN",
        )} dòng trong ${title} của cơ sở ${currentUnitData.unit.maCskcb} (${currentUnitData.unit.tenCskcb})?\n\nToàn bộ dữ liệu của bảng này sẽ bị xóa trắng ([]).`,
      )
    ) {
      return;
    }
    saveUnitTableData(currentUnitData.unit.maCskcb, tableTab, []);
    setCatalogs(loadTt12Catalogs());
    setSelectedItems(new Set());
    setLastClickedIndex(null);
    showNotice(`Đã xóa sạch toàn bộ ${count.toLocaleString("vi-VN")} dòng trong ${title}.`);
    onRefreshXmlAudit?.();
  };

  return (
    <div className="space-y-6">
      {/* Toast Notice */}
      {notice && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-2xl px-5 py-3 shadow-2xl border text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${
            notice.type === "success"
              ? "bg-emerald-600 text-white border-emerald-700"
              : "bg-rose-600 text-white border-rose-700"
          }`}
        >
          <span>{notice.type === "success" ? "✅" : "⚠️"}</span>
          <span>{notice.text}</span>
        </div>
      )}

      {/* HEADER SECTION: Chọn CSKCB & Các thao tác danh mục */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-teal-700 dark:text-cyan-400">
              <span>🏥 HỆ THỐNG DANH MỤC THÔNG TƯ 12</span>
              <span className="rounded-md bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 px-2 py-0.5 font-bold">
                Quyết định 3276 / TT 01/2025
              </span>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
              Thư viện 6 Bảng Danh mục theo từng Cơ sở KCB (MA_CSKCB)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-2xl">
              Khi đẩy XML lên rà soát, hệ thống tự động đọc mã đơn vị (MA_CSKCB) và đối chiếu trực
              tiếp với 6 bảng danh mục của chính đơn vị đó: kiểm tra mã máy MA_MAY (Bảng 6), mã khoa
              (Bảng 1), CCHN bác sĩ (Bảng 2)...
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsExcludedDeptsModalOpen(true)}
              className="rounded-xl border border-amber-500/80 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 text-xs font-bold text-amber-900 dark:text-amber-300 hover:bg-amber-100 shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              title="Cấu hình danh sách mã khoa loại trừ cảnh báo (ví dụ K01 theo Quyết định 5937/QĐ-BYT)"
            >
              <span>🏛️ Mã khoa loại trừ (QĐ 5937)</span>
              <span className="rounded-md bg-amber-200 dark:bg-amber-900 px-1.5 py-0.2 text-[11px] font-black">
                {excludedDepts.length}
              </span>
            </button>
            <button
              type="button"
              onClick={exportTt12TemplateExcel}
              className="rounded-xl border border-teal-600 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-800 hover:bg-teal-100 shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              title="Tải file Excel mẫu gồm 6 sheet chuẩn Thông tư 12"
            >
              <span>📋 Tải mẫu Excel 6 bảng</span>
            </button>
            <button
              type="button"
              onClick={handleExportUnitExcel}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              title="Xuất toàn bộ danh mục 6 bảng của cơ sở này ra Excel"
            >
              <span>📊 Xuất Excel CSKCB này</span>
            </button>
            <label className="rounded-xl bg-teal-700 hover:bg-teal-800 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs flex items-center gap-1.5 transition cursor-pointer">
              <span>📥 Nạp Excel TT12</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleImportExcelFile}
              />
            </label>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition cursor-pointer"
              title="Khôi phục danh mục mẫu gốc (26066 Phúc Yên & 26193 Lạc Việt)"
            >
              <span>🔄 Khôi phục mẫu gốc</span>
            </button>
          </div>
        </div>

        {/* Thanh chọn đơn vị & Thẻ thông tin đơn vị */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">
              Chọn cơ sở KCB:
            </span>
            <select
              value={selectedMaCskcb}
              onChange={(e) => {
                setSelectedMaCskcb(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-black text-teal-800 dark:text-cyan-400 shadow-xs focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              {unitList.map((u) => (
                <option key={u.unit.maCskcb} value={u.unit.maCskcb}>
                  {u.unit.maCskcb} — {u.unit.tenCskcb}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleOpenAddUnit}
              className="rounded-xl border border-teal-600 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-800 hover:bg-teal-100 transition cursor-pointer"
            >
              + Thêm CSKCB mới
            </button>
            <button
              type="button"
              onClick={handleOpenEditUnit}
              className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition cursor-pointer"
            >
              ✏️ Sửa thông tin
            </button>
            {unitList.length > 1 && (
              <button
                type="button"
                onClick={handleDeleteUnit}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
              >
                🗑️ Xóa đơn vị
              </button>
            )}
          </div>

          {/* Badge cấp KCB & thống kê */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`px-2.5 py-1 rounded-lg font-black text-[11px] shadow-2xs ${
                currentUnitData.unit.capKcb === "co_ban"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : currentUnitData.unit.capKcb === "chuyen_sau"
                    ? "bg-purple-100 text-purple-800 border border-purple-200"
                    : "bg-blue-100 text-blue-800 border border-blue-200"
              }`}
            >
              {currentUnitData.unit.capKcb === "co_ban"
                ? "⭐ CẤP CƠ BẢN"
                : currentUnitData.unit.capKcb === "chuyen_sau"
                  ? "🌟 CẤP CHUYÊN SÂU"
                  : "🌱 CẤP BAN ĐẦU"}
            </span>
            <span className="text-slate-500 font-medium">
              Cập nhật:{" "}
              {currentUnitData.updatedAt
                ? new Date(currentUnitData.updatedAt).toLocaleDateString("vi-VN")
                : "Mặc định"}
            </span>
          </div>
        </div>

        {/* 6 Tabs con tương ứng 6 bảng Thông tư 12 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              setTableTab("bang6");
              setPage(1);
            }}
            className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
              tableTab === "bang6"
                ? "bg-purple-700 text-white border-purple-800 shadow-md ring-2 ring-purple-400"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
            }`}
          >
            <div className="text-[11px] font-black uppercase opacity-80 flex items-center justify-between">
              <span>Bảng 6 (MAU_06)</span>
              <span>⚡ RÀ SOÁT</span>
            </div>
            <div className="text-sm font-black mt-1">Trang thiết bị (MA_MAY)</div>
            <div className="text-xs font-bold mt-2 opacity-90">
              {currentUnitData.bang6.length} thiết bị / máy
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setTableTab("bang1");
              setPage(1);
            }}
            className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
              tableTab === "bang1"
                ? "bg-teal-700 text-white border-teal-800 shadow-md ring-2 ring-teal-400"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
            }`}
          >
            <div className="text-[11px] font-black uppercase opacity-80">Bảng 1 (MAU_01)</div>
            <div className="text-sm font-black mt-1">Bộ phận chuyên môn</div>
            <div className="text-xs font-bold mt-2 opacity-90">
              {currentUnitData.bang1.length} khoa phòng
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setTableTab("bang2");
              setPage(1);
            }}
            className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
              tableTab === "bang2"
                ? "bg-blue-700 text-white border-blue-800 shadow-md ring-2 ring-blue-400"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
            }`}
          >
            <div className="text-[11px] font-black uppercase opacity-80">Bảng 2 (MAU_02)</div>
            <div className="text-sm font-black mt-1">Nhân lực KCB (CCHN)</div>
            <div className="text-xs font-bold mt-2 opacity-90">
              {currentUnitData.bang2.length} bác sĩ / nhân viên
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setTableTab("bang3");
              setPage(1);
            }}
            className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
              tableTab === "bang3"
                ? "bg-emerald-700 text-white border-emerald-800 shadow-md ring-2 ring-emerald-400"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
            }`}
          >
            <div className="text-[11px] font-black uppercase opacity-80">Bảng 3 (MAU_03)</div>
            <div className="text-sm font-black mt-1">Thuốc &amp; Chế phẩm máu</div>
            <div className="text-xs font-bold mt-2 opacity-90">
              {currentUnitData.bang3.length} thuốc
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setTableTab("bang4");
              setPage(1);
            }}
            className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
              tableTab === "bang4"
                ? "bg-sky-700 text-white border-sky-800 shadow-md ring-2 ring-sky-400"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
            }`}
          >
            <div className="text-[11px] font-black uppercase opacity-80">Bảng 4 (MAU_04)</div>
            <div className="text-sm font-black mt-1">Vật tư y tế</div>
            <div className="text-xs font-bold mt-2 opacity-90">
              {currentUnitData.bang4.length} vật tư
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setTableTab("bang5");
              setPage(1);
            }}
            className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
              tableTab === "bang5"
                ? "bg-indigo-700 text-white border-indigo-800 shadow-md ring-2 ring-indigo-400"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
            }`}
          >
            <div className="text-[11px] font-black uppercase opacity-80">Bảng 5 (MAU_05)</div>
            <div className="text-sm font-black mt-1">Dịch vụ kỹ thuật</div>
            <div className="text-xs font-bold mt-2 opacity-90">
              {currentUnitData.bang5.length} dịch vụ
            </div>
          </button>
        </div>
      </div>

      {/* BODY SECTION: Nội dung chi tiết của Bảng đang chọn */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-6 space-y-4">
        {/* Search & Actions toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder={`Tìm kiếm trong ${
                tableTab === "bang6"
                  ? "Bảng 6 (Mã máy, Tên TB, Model...)"
                  : tableTab === "bang1"
                    ? "Bảng 1 (Mã khoa, Tên khoa...)"
                    : tableTab === "bang2"
                      ? "Bảng 2 (Họ tên, CCHN, Phạm vi...)"
                      : tableTab === "bang3"
                        ? "Bảng 3 (Mã thuốc, Tên thuốc, Hoạt chất...)"
                        : tableTab === "bang4"
                          ? "Bảng 4 (Mã vật tư, Tên VT...)"
                          : "Bảng 5 (Mã DVKT, Tên DVKT...)"
              }`}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold px-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500">
              Hiển thị: {filteredData.length.toLocaleString("vi-VN")} dòng
            </span>

            {/* Nút Xóa toàn bộ Bảng */}
            <button
              type="button"
              onClick={handleClearEntireTable}
              className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 px-3 py-1.5 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              title="Xóa trắng toàn bộ dữ liệu của bảng này"
            >
              <span>🗑️ Xóa toàn bộ Bảng</span>
            </button>

            {tableTab === "bang6" && (
              <button
                type="button"
                onClick={() => setIsAddMachineModalOpen(true)}
                className="rounded-xl bg-purple-700 hover:bg-purple-800 text-white px-3.5 py-1.5 text-xs font-bold shadow-xs transition flex items-center gap-1 cursor-pointer"
              >
                <span>+ Thêm thiết bị / Mã máy</span>
              </button>
            )}
          </div>
        </div>

        {/* Floating / Toolbar khi có dòng được chọn */}
        {selectedItems.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-rose-800 dark:text-rose-200">
                ✅ Đã chọn {selectedItems.size} dòng
              </span>
              <span className="text-[11px] text-rose-600 dark:text-rose-300 hidden sm:inline">
                (Mẹo: Giữ phím{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono font-bold">
                  Shift
                </kbd>{" "}
                khi bấm ô chọn để chọn nhanh cả dải)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 text-xs font-bold shadow-sm transition flex items-center gap-1 cursor-pointer"
              >
                <span>🗑️ Xóa {selectedItems.size} dòng đã chọn</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedItems(new Set())}
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition cursor-pointer"
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          {tableTab === "bang6" && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-purple-700 text-white font-bold">
                  <th className="py-2.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={handleToggleSelectAllPage}
                      className="cursor-pointer"
                      title="Chọn tất cả trên trang này"
                    />
                  </th>
                  <th className="py-2.5 px-3 w-12 text-center">STT</th>
                  <th className="py-2.5 px-3 min-w-[200px]">MÃ MÁY CHUẨN (MA_MAY)</th>
                  <th className="py-2.5 px-3 min-w-[220px]">TÊN THIẾT BỊ Y TẾ</th>
                  <th className="py-2.5 px-3 min-w-[120px]">MODEL / KÝ HIỆU</th>
                  <th className="py-2.5 px-3 min-w-[140px]">HIỆU LỰC TỪ</th>
                  <th className="py-2.5 px-3 min-w-[140px]">HẾT HẠN HIỆU LỰC</th>
                  <th className="py-2.5 px-3 min-w-[120px]">SỐ LƯU HÀNH</th>
                  <th className="py-2.5 px-3 min-w-[140px]">CÔNG TY SX</th>
                  <th className="py-2.5 px-3 w-16 text-center">XÓA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 font-medium">
                {pagedData.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 font-bold">
                      Không có thiết bị y tế nào phù hợp với tìm kiếm trong Bảng 6.
                    </td>
                  </tr>
                ) : (
                  (pagedData as Tt12Bang6ThietBi[]).map((item, idx) => {
                    const realIdx = (page - 1) * PAGE_SIZE + idx;
                    const isSelected = selectedItems.has(item);
                    return (
                      <tr
                        key={item.maMay + idx}
                        className={`transition ${isSelected ? "bg-purple-100/70 dark:bg-purple-950/40" : "hover:bg-purple-50/50"}`}
                      >
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onClick={(e) => handleToggleRowItem(item, idx, e)}
                            onChange={() => {}}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3 text-center text-slate-400 font-mono">
                          {realIdx + 1}
                        </td>
                        <td className="py-2 px-3 font-mono font-black text-purple-700 dark:text-purple-300">
                          {item.maMay}
                        </td>
                        <td className="py-2 px-3 text-slate-800 dark:text-slate-100 font-semibold">
                          {item.tenTb}
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                          {item.kyHieu || "—"}
                        </td>
                        <td className="py-2 px-3 text-emerald-700 dark:text-emerald-400 font-mono">
                          {item.tuNgay || "—"}
                        </td>
                        <td className="py-2 px-3 text-rose-700 dark:text-rose-400 font-mono font-bold">
                          {item.denNgay || "—"}
                        </td>
                        <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                          {item.soLuuHanh || "—"}
                        </td>
                        <td className="py-2 px-3 text-slate-500 text-[11px]">
                          {item.congTySx || item.nuocSx || "—"}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteSingleItem("bang6", item)}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded-lg transition cursor-pointer"
                            title="Xóa máy này"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {tableTab === "bang1" && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-teal-700 text-white font-bold">
                  <th className="py-2.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={handleToggleSelectAllPage}
                      className="cursor-pointer"
                      title="Chọn tất cả trên trang này"
                    />
                  </th>
                  <th className="py-2.5 px-3 w-12 text-center">STT</th>
                  <th className="py-2.5 px-3 min-w-[130px]">MÃ KHOA</th>
                  <th className="py-2.5 px-3 min-w-[220px]">TÊN KHOA PHÒNG</th>
                  <th className="py-2.5 px-3 min-w-[100px]">BÀN KHÁM</th>
                  <th className="py-2.5 px-3 min-w-[100px]">GIƯỜNG PĐ</th>
                  <th className="py-2.5 px-3 min-w-[100px]">GIƯỜNG TK</th>
                  <th className="py-2.5 px-3 min-w-[120px]">TỪ NGÀY</th>
                  <th className="py-2.5 px-3 min-w-[120px]">ĐẾN NGÀY</th>
                  <th className="py-2.5 px-3 w-16 text-center">XÓA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 font-medium">
                {pagedData.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 font-bold">
                      Chưa có dữ liệu khoa phòng trong Bảng 1.
                    </td>
                  </tr>
                ) : (
                  (pagedData as Tt12Bang1KhoaPhong[]).map((item, idx) => {
                    const realIdx = (page - 1) * PAGE_SIZE + idx;
                    const isSelected = selectedItems.has(item);
                    return (
                      <tr
                        key={item.maKhoa + idx}
                        className={`transition ${isSelected ? "bg-teal-100/70 dark:bg-teal-950/40" : "hover:bg-teal-50/50"}`}
                      >
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onClick={(e) => handleToggleRowItem(item, idx, e)}
                            onChange={() => {}}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3 text-center text-slate-400 font-mono">
                          {realIdx + 1}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-teal-800 dark:text-teal-300">
                          {item.maKhoa}
                        </td>
                        <td className="py-2 px-3 text-slate-800 dark:text-slate-100 font-semibold">
                          {item.tenKhoa}
                        </td>
                        <td className="py-2 px-3 text-slate-600">{item.banKham || "—"}</td>
                        <td className="py-2 px-3 font-mono">{item.giuongPd ?? "—"}</td>
                        <td className="py-2 px-3 font-mono">{item.giuongTk ?? "—"}</td>
                        <td className="py-2 px-3 text-slate-500 font-mono">{item.tuNgay || "—"}</td>
                        <td className="py-2 px-3 text-slate-500 font-mono">
                          {item.denNgay || "—"}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteSingleItem("bang1", item)}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded-lg transition cursor-pointer"
                            title="Xóa khoa này"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {tableTab === "bang2" && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-blue-700 text-white font-bold">
                  <th className="py-2.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={handleToggleSelectAllPage}
                      className="cursor-pointer"
                      title="Chọn tất cả trên trang này"
                    />
                  </th>
                  <th className="py-2.5 px-3 w-12 text-center">STT</th>
                  <th className="py-2.5 px-3 min-w-[180px]">HỌ VÀ TÊN</th>
                  <th className="py-2.5 px-3 min-w-[150px]">SỐ CCHN BÁC SĨ</th>
                  <th className="py-2.5 px-3 min-w-[100px]">MÃ KHOA</th>
                  <th className="py-2.5 px-3 min-w-[160px]">CHỨC DANH</th>
                  <th className="py-2.5 px-3 min-w-[200px]">PHẠM VI CHUYÊN MÔN</th>
                  <th className="py-2.5 px-3 w-16 text-center">XÓA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 font-medium">
                {pagedData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                      Chưa có dữ liệu nhân lực KCB trong Bảng 2.
                    </td>
                  </tr>
                ) : (
                  (pagedData as Tt12Bang2NhanLuc[]).map((item, idx) => {
                    const realIdx = (page - 1) * PAGE_SIZE + idx;
                    const isSelected = selectedItems.has(item);
                    return (
                      <tr
                        key={item.macchn + idx}
                        className={`transition ${isSelected ? "bg-blue-100/70 dark:bg-blue-950/40" : "hover:bg-blue-50/50"}`}
                      >
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onClick={(e) => handleToggleRowItem(item, idx, e)}
                            onChange={() => {}}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3 text-center text-slate-400 font-mono">
                          {realIdx + 1}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                          {item.hoTen}
                        </td>
                        <td className="py-2 px-3 font-mono font-black text-blue-700 dark:text-blue-300">
                          {item.macchn || "—"}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600">{item.maKhoa || "—"}</td>
                        <td className="py-2 px-3 text-slate-600">{item.chucDanhNn || "—"}</td>
                        <td className="py-2 px-3 text-slate-500 text-[11px]">
                          {item.phamViCm || "—"}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteSingleItem("bang2", item)}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded-lg transition cursor-pointer"
                            title="Xóa nhân sự này"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {tableTab === "bang3" && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-emerald-700 text-white font-bold">
                  <th className="py-2.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={handleToggleSelectAllPage}
                      className="cursor-pointer"
                      title="Chọn tất cả trên trang này"
                    />
                  </th>
                  <th className="py-2.5 px-3 w-12 text-center">STT</th>
                  <th className="py-2.5 px-3 min-w-[120px]">MÃ THUỐC</th>
                  <th className="py-2.5 px-3 min-w-[220px]">TÊN THUỐC</th>
                  <th className="py-2.5 px-3 min-w-[200px]">TÊN HOẠT CHẤT</th>
                  <th className="py-2.5 px-3 min-w-[100px]">HÀM LƯỢNG</th>
                  <th className="py-2.5 px-3 min-w-[80px] text-center">ĐVT</th>
                  <th className="py-2.5 px-3 min-w-[100px]">ĐƯỜNG DÙNG</th>
                  <th className="py-2.5 px-3 min-w-[120px]">SỐ ĐĂNG KÝ</th>
                  <th className="py-2.5 px-3 min-w-[110px] text-right">ĐƠN GIÁ (VNĐ)</th>
                  <th className="py-2.5 px-3 w-16 text-center">XÓA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 font-medium">
                {pagedData.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400 font-bold">
                      Chưa có dữ liệu thuốc trong Bảng 3.
                    </td>
                  </tr>
                ) : (
                  (pagedData as Tt12Bang3Thuoc[]).map((item, idx) => {
                    const realIdx = (page - 1) * PAGE_SIZE + idx;
                    const isSelected = selectedItems.has(item);
                    return (
                      <tr
                        key={item.maThuoc + idx}
                        className={`transition ${isSelected ? "bg-emerald-100/70 dark:bg-emerald-950/40" : "hover:bg-emerald-50/50"}`}
                      >
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onClick={(e) => handleToggleRowItem(item, idx, e)}
                            onChange={() => {}}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3 text-center text-slate-400 font-mono">
                          {realIdx + 1}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-emerald-800 dark:text-emerald-300">
                          {item.maThuoc}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                          {item.tenThuoc}
                        </td>
                        <td className="py-2 px-3 text-slate-600">{item.tenHoatChat || "—"}</td>
                        <td className="py-2 px-3 text-slate-600">{item.hamLuong || "—"}</td>
                        <td className="py-2 px-3 text-center text-slate-600">
                          {item.donViTinh || "—"}
                        </td>
                        <td className="py-2 px-3 text-slate-600">{item.duongDung || "—"}</td>
                        <td className="py-2 px-3 font-mono text-slate-500 text-[11px]">
                          {item.soDangKy || "—"}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                          {item.donGia != null ? item.donGia.toLocaleString("vi-VN") : "—"}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteSingleItem("bang3", item)}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded-lg transition cursor-pointer"
                            title="Xóa thuốc này"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {tableTab === "bang4" && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-sky-700 text-white font-bold">
                  <th className="py-2.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={handleToggleSelectAllPage}
                      className="cursor-pointer"
                      title="Chọn tất cả trên trang này"
                    />
                  </th>
                  <th className="py-2.5 px-3 w-12 text-center">STT</th>
                  <th className="py-2.5 px-3 min-w-[160px]">MÃ VẬT TƯ</th>
                  <th className="py-2.5 px-3 min-w-[240px]">TÊN VẬT TƯ Y TẾ</th>
                  <th className="py-2.5 px-3 min-w-[180px]">NHÓM VẬT TƯ</th>
                  <th className="py-2.5 px-3 min-w-[130px]">MÃ HIỆU / QUY CÁCH</th>
                  <th className="py-2.5 px-3 min-w-[140px]">HÃNG / NƯỚC SX</th>
                  <th className="py-2.5 px-3 min-w-[80px] text-center">ĐVT</th>
                  <th className="py-2.5 px-3 min-w-[110px] text-right">ĐƠN GIÁ (VNĐ)</th>
                  <th className="py-2.5 px-3 w-16 text-center">XÓA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 font-medium">
                {pagedData.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 font-bold">
                      Chưa có dữ liệu vật tư y tế trong Bảng 4.
                    </td>
                  </tr>
                ) : (
                  (pagedData as Tt12Bang4VatTu[]).map((item, idx) => {
                    const realIdx = (page - 1) * PAGE_SIZE + idx;
                    const isSelected = selectedItems.has(item);
                    return (
                      <tr
                        key={item.maVatTu + idx}
                        className={`transition ${isSelected ? "bg-sky-100/70 dark:bg-sky-950/40" : "hover:bg-sky-50/50"}`}
                      >
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onClick={(e) => handleToggleRowItem(item, idx, e)}
                            onChange={() => {}}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3 text-center text-slate-400 font-mono">
                          {realIdx + 1}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-sky-800 dark:text-sky-300">
                          {item.maVatTu}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                          {item.tenVatTu}
                        </td>
                        <td className="py-2 px-3 text-slate-600 text-[11px]">
                          {item.nhomVatTu || "—"}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {item.maHieu || item.quyCach || "—"}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {item.hangSx || item.nuocSx
                            ? `${item.hangSx || ""}${item.nuocSx ? ` (${item.nuocSx})` : ""}`
                            : "—"}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-600">
                          {item.donViTinh || "—"}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-sky-700">
                          {item.donGia != null ? item.donGia.toLocaleString("vi-VN") : "—"}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteSingleItem("bang4", item)}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded-lg transition cursor-pointer"
                            title="Xóa vật tư này"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {tableTab === "bang5" && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-indigo-700 text-white font-bold">
                  <th className="py-2.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={handleToggleSelectAllPage}
                      className="cursor-pointer"
                      title="Chọn tất cả trên trang này"
                    />
                  </th>
                  <th className="py-2.5 px-3 w-12 text-center">STT</th>
                  <th className="py-2.5 px-3 min-w-[130px]">MÃ DVKT</th>
                  <th className="py-2.5 px-3 min-w-[280px]">TÊN DỊCH VỤ KỸ THUẬT</th>
                  <th className="py-2.5 px-3 min-w-[200px]">TÊN GIÁ DVKT</th>
                  <th className="py-2.5 px-3 min-w-[110px] text-right">ĐƠN GIÁ (VNĐ)</th>
                  <th className="py-2.5 px-3 min-w-[180px]">QUYẾT ĐỊNH / GHI CHÚ</th>
                  <th className="py-2.5 px-3 w-16 text-center">XÓA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 font-medium">
                {pagedData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                      Chưa có dữ liệu dịch vụ kỹ thuật trong Bảng 5.
                    </td>
                  </tr>
                ) : (
                  (pagedData as Tt12Bang5DichVu[]).map((item, idx) => {
                    const realIdx = (page - 1) * PAGE_SIZE + idx;
                    const isSelected = selectedItems.has(item);
                    return (
                      <tr
                        key={item.maDichVu + idx}
                        className={`transition ${isSelected ? "bg-indigo-100/70 dark:bg-indigo-950/40" : "hover:bg-indigo-50/50"}`}
                      >
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onClick={(e) => handleToggleRowItem(item, idx, e)}
                            onChange={() => {}}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3 text-center text-slate-400 font-mono">
                          {realIdx + 1}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-indigo-800 dark:text-indigo-300">
                          {item.maDichVu}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                          {item.tenDichVu}
                        </td>
                        <td className="py-2 px-3 text-slate-600 text-[11px]">
                          {item.tenDvktGia || "—"}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-indigo-700">
                          {item.donGia != null ? item.donGia.toLocaleString("vi-VN") : "—"}
                        </td>
                        <td className="py-2 px-3 text-slate-500 text-[11px]">
                          {item.qdDvkt || item.ghiChu || item.quyTrinh || "—"}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteSingleItem("bang5", item)}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded-lg transition cursor-pointer"
                            title="Xóa dịch vụ này"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-bold text-slate-500">
              Trang {page} / {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                ◀ Trước
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                Sau ▶
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL CẤU HÌNH MÃ KHOA LOẠI TRỪ (QĐ 5937 / K01) */}
      {isExcludedDeptsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-start justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏛️</span>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Mã khoa loại trừ cảnh báo (QĐ 5937)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Theo Quyết định số 5937/QĐ-BYT (Phụ lục 5), mã <strong>K01</strong> là{" "}
                  <strong>Khoa Khám bệnh</strong>. Các mã khoa trong danh sách này sẽ không bị cảnh
                  báo lỗi nếu chưa được khai báo trong Bảng 1 Thông tư 12.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsExcludedDeptsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Danh sách badge mã khoa hiện hành */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Các mã khoa đang được loại trừ:
              </label>
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 min-h-[56px]">
                {excludedDepts.length === 0 ? (
                  <span className="text-xs text-slate-400 italic">
                    Chưa có mã khoa nào được loại trừ.
                  </span>
                ) : (
                  excludedDepts.map((d) => (
                    <span
                      key={d}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs font-mono font-black shadow-2xs"
                    >
                      <span>{d}</span>
                      {d === "K01" && (
                        <span className="font-sans text-[10px] font-normal text-amber-700 dark:text-amber-300">
                          (Khám bệnh - QĐ 5937)
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveExcludedDept(d)}
                        className="text-rose-500 hover:text-rose-700 font-bold ml-1 text-sm cursor-pointer"
                        title="Xóa mã khoa này"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Form thêm mã khoa */}
            <form onSubmit={handleAddExcludedDept} className="space-y-3 pt-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Thêm mã khoa mới cần loại trừ:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newDeptCode}
                  onChange={(e) => setNewDeptCode(e.target.value)}
                  placeholder="Ví dụ: K01, K00, K02..."
                  className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 uppercase focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  + Thêm
                </button>
              </div>
            </form>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleResetExcludedDepts}
                className="text-xs text-slate-500 hover:text-amber-700 font-semibold underline cursor-pointer"
              >
                Khôi phục mặc định (K01)
              </button>
              <button
                type="button"
                onClick={() => setIsExcludedDeptsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM / SỬA CSKCB */}
      {isUnitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-start justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {modalMode === "add"
                    ? "Thêm Cơ sở Khám chữa bệnh mới"
                    : "Sửa thông tin Cơ sở KCB"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thiết lập mã đơn vị và cấp chuyên môn kỹ thuật theo Luật BHYT
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsUnitModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUnit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">
                  Mã cơ sở KCB (MA_CSKCB) (*):
                </label>
                <input
                  type="text"
                  required
                  disabled={modalMode === "edit"}
                  value={unitFormMa}
                  onChange={(e) => setUnitFormMa(e.target.value)}
                  placeholder="Ví dụ: 26066, 26193..."
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono font-bold focus:ring-2 focus:ring-teal-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">
                  Tên cơ sở khám chữa bệnh (*):
                </label>
                <input
                  type="text"
                  required
                  value={unitFormTen}
                  onChange={(e) => setUnitFormTen(e.target.value)}
                  placeholder="Ví dụ: Bệnh viện Đa khoa Lạc Việt..."
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-bold focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">
                  Cấp chuyên môn kỹ thuật KCB (theo Luật BHYT sửa đổi):
                </label>
                <select
                  value={unitFormCap}
                  onChange={(e) =>
                    setUnitFormCap(e.target.value as "co_ban" | "chuyen_sau" | "ban_dau")
                  }
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-bold text-teal-800 dark:text-cyan-400 focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="co_ban">
                    Cấp cơ bản (áp dụng quy tắc 1.15 ➔ 1.16 theo TT 01/2025)
                  </option>
                  <option value="chuyen_sau">
                    Cấp chuyên sâu (áp dụng quy tắc 1.17 theo Phụ lục I)
                  </option>
                  <option value="ban_dau">Cấp ban đầu (mã đối tượng 1.11)</option>
                </select>
                <p className="mt-1 text-[11px] text-slate-400">
                  Cơ sở cấp cơ bản: Người bệnh tự đến KCB có mã bệnh Phụ lục II TT 01/2025 sẽ chuyển
                  sang mã 1.16 để bảo đảm quyền lợi 100% chi phí KCB BHYT.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">Ghi chú:</label>
                <input
                  type="text"
                  value={unitFormGhiChu}
                  onChange={(e) => setUnitFormGhiChu(e.target.value)}
                  placeholder="Ghi chú địa bàn, tuyến..."
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUnitModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold shadow-xs cursor-pointer"
                >
                  Lưu đơn vị
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL THÊM THIẾT BỊ BẢNG 6 */}
      {isAddMachineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-start justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Thêm Thiết bị y tế / Mã máy (Bảng 6)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đơn vị: {currentUnitData.unit.maCskcb} — {currentUnitData.unit.tenCskcb}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddMachineModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMachine} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">
                  Mã máy chuẩn (MA_MAY) (*):
                </label>
                <input
                  type="text"
                  required
                  value={newMaMay}
                  onChange={(e) => setNewMaMay(e.target.value)}
                  placeholder="Ví dụ: CL.3[vontuco].310228, XQ.3[vaynganhang].SN123..."
                  className="w-full rounded-xl border border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-900/30 p-2.5 font-mono font-black text-purple-900 dark:text-purple-200 focus:ring-2 focus:ring-purple-500"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Cấu trúc chuẩn Thông tư 12: [Mã nhóm 2-4 ký tự].[3[nguồn vốn]].[Serial]
                </p>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">
                  Tên thiết bị y tế:
                </label>
                <input
                  type="text"
                  value={newTenTb}
                  onChange={(e) => setNewTenTb(e.target.value)}
                  placeholder="Ví dụ: Máy chụp cắt lớp vi tính CT Scanner 16 lát..."
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-bold focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">
                    Model / Ký hiệu:
                  </label>
                  <input
                    type="text"
                    value={newKyHieu}
                    onChange={(e) => setNewKyHieu(e.target.value)}
                    placeholder="Ví dụ: Access CT, PRK-7000..."
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">
                    Công ty sản xuất:
                  </label>
                  <input
                    type="text"
                    value={newCongTySx}
                    onChange={(e) => setNewCongTySx(e.target.value)}
                    placeholder="Ví dụ: PHILIPS, Shimadzu..."
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">
                    Hiệu lực từ ngày (YYYYMMDD):
                  </label>
                  <input
                    type="text"
                    value={newTuNgay}
                    onChange={(e) => setNewTuNgay(e.target.value)}
                    placeholder="Ví dụ: 20240101"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">
                    Hết hạn hiệu lực (YYYYMMDD):
                  </label>
                  <input
                    type="text"
                    value={newDenNgay}
                    onChange={(e) => setNewDenNgay(e.target.value)}
                    placeholder="Ví dụ: 20261231"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono font-bold text-rose-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddMachineModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold shadow-xs cursor-pointer"
                >
                  Lưu thiết bị
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
