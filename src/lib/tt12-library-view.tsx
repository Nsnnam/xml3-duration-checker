import React, { useState, useMemo, useRef } from "react";
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
} from "./tt12-library.ts";
import { DEFAULT_TT12_CATALOGS } from "./tt12-default-data.ts";

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

  const handleDeleteMachine = (idx: number) => {
    const item = currentUnitData.bang6[idx];
    if (!window.confirm(`Xóa mã máy '${item.maMay}' (${item.tenTb}) khỏi Bảng 6?`)) return;
    const updated = currentUnitData.bang6.filter((_, i) => i !== idx);
    saveUnitTableData(currentUnitData.unit.maCskcb, "bang6", updated);
    setCatalogs(loadTt12Catalogs());
    showNotice(`Đã xóa máy '${item.maMay}'.`);
    onRefreshXmlAudit?.();
  };

  // Filter dữ liệu bảng đang chọn
  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (tableTab === "bang6") {
      if (!q) return currentUnitData.bang6;
      return currentUnitData.bang6.filter(
        (m) =>
          m.maMay?.toLowerCase().includes(q) ||
          m.tenTb?.toLowerCase().includes(q) ||
          m.kyHieu?.toLowerCase().includes(q) ||
          m.soLuuHanh?.toLowerCase().includes(q) ||
          m.congTySx?.toLowerCase().includes(q),
      );
    }
    if (tableTab === "bang1") {
      if (!q) return currentUnitData.bang1;
      return currentUnitData.bang1.filter(
        (d) =>
          d.maKhoa?.toLowerCase().includes(q) ||
          d.tenKhoa?.toLowerCase().includes(q) ||
          d.banKham?.toLowerCase().includes(q),
      );
    }
    if (tableTab === "bang2") {
      if (!q) return currentUnitData.bang2;
      return currentUnitData.bang2.filter(
        (d) =>
          d.hoTen?.toLowerCase().includes(q) ||
          d.macchn?.toLowerCase().includes(q) ||
          d.maKhoa?.toLowerCase().includes(q) ||
          d.phamViCm?.toLowerCase().includes(q),
      );
    }
    if (tableTab === "bang3") {
      if (!q) return currentUnitData.bang3;
      return currentUnitData.bang3.filter(
        (d) =>
          d.maThuoc?.toLowerCase().includes(q) ||
          d.tenThuoc?.toLowerCase().includes(q) ||
          d.tenHoatChat?.toLowerCase().includes(q),
      );
    }
    if (tableTab === "bang4") {
      if (!q) return currentUnitData.bang4;
      return currentUnitData.bang4.filter(
        (d) =>
          d.maVatTu?.toLowerCase().includes(q) ||
          d.tenVatTu?.toLowerCase().includes(q) ||
          d.maHieu?.toLowerCase().includes(q),
      );
    }
    if (tableTab === "bang5") {
      if (!q) return currentUnitData.bang5;
      return currentUnitData.bang5.filter(
        (d) => d.maDichVu?.toLowerCase().includes(q) || d.tenDichVu?.toLowerCase().includes(q),
      );
    }
    return [];
  }, [currentUnitData, tableTab, searchQuery]);

  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE) || 1;
  const pagedData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredData.slice(start, start + PAGE_SIZE);
  }, [filteredData, page]);

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
                      : "danh mục..."
              }`}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold px-1"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">
              Hiển thị: {filteredData.length.toLocaleString("vi-VN")} dòng
            </span>
            {tableTab === "bang6" && (
              <button
                type="button"
                onClick={() => setIsAddMachineModalOpen(true)}
                className="rounded-xl bg-purple-700 hover:bg-purple-800 text-white px-3.5 py-2 text-xs font-bold shadow-xs transition flex items-center gap-1 cursor-pointer"
              >
                <span>+ Thêm thiết bị / Mã máy</span>
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          {tableTab === "bang6" && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-purple-700 text-white font-bold">
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
                    <td colSpan={9} className="py-8 text-center text-slate-400 font-bold">
                      Không có thiết bị y tế nào phù hợp với tìm kiếm trong Bảng 6.
                    </td>
                  </tr>
                ) : (
                  (pagedData as Tt12Bang6ThietBi[]).map((item, idx) => {
                    const realIdx = (page - 1) * PAGE_SIZE + idx;
                    return (
                      <tr key={item.maMay + idx} className="hover:bg-purple-50/50 transition">
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
                            onClick={() => handleDeleteMachine(realIdx)}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded-lg transition"
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
                  <th className="py-2.5 px-3 w-12 text-center">STT</th>
                  <th className="py-2.5 px-3 min-w-[130px]">MÃ KHOA</th>
                  <th className="py-2.5 px-3 min-w-[220px]">TÊN KHOA PHÒNG</th>
                  <th className="py-2.5 px-3 min-w-[100px]">BÀN KHÁM</th>
                  <th className="py-2.5 px-3 min-w-[100px]">GIƯỜNG PĐ</th>
                  <th className="py-2.5 px-3 min-w-[100px]">GIƯỜNG TK</th>
                  <th className="py-2.5 px-3 min-w-[120px]">TỪ NGÀY</th>
                  <th className="py-2.5 px-3 min-w-[120px]">ĐẾN NGÀY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 font-medium">
                {pagedData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                      Chưa có dữ liệu khoa phòng trong Bảng 1.
                    </td>
                  </tr>
                ) : (
                  (pagedData as Tt12Bang1KhoaPhong[]).map((item, idx) => (
                    <tr key={item.maKhoa + idx} className="hover:bg-teal-50/50 transition">
                      <td className="py-2 px-3 text-center text-slate-400 font-mono">
                        {(page - 1) * PAGE_SIZE + idx + 1}
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
                      <td className="py-2 px-3 text-slate-500 font-mono">{item.denNgay || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {tableTab === "bang2" && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-blue-700 text-white font-bold">
                  <th className="py-2.5 px-3 w-12 text-center">STT</th>
                  <th className="py-2.5 px-3 min-w-[180px]">HỌ VÀ TÊN</th>
                  <th className="py-2.5 px-3 min-w-[150px]">SỐ CCHN BÁC SĨ</th>
                  <th className="py-2.5 px-3 min-w-[100px]">MÃ KHOA</th>
                  <th className="py-2.5 px-3 min-w-[160px]">CHỨC DANH</th>
                  <th className="py-2.5 px-3 min-w-[200px]">PHẠM VI CHUYÊN MÔN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 font-medium">
                {pagedData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-bold">
                      Chưa có dữ liệu nhân lực KCB trong Bảng 2.
                    </td>
                  </tr>
                ) : (
                  (pagedData as Tt12Bang2NhanLuc[]).map((item, idx) => (
                    <tr key={item.macchn + idx} className="hover:bg-blue-50/50 transition">
                      <td className="py-2 px-3 text-center text-slate-400 font-mono">
                        {(page - 1) * PAGE_SIZE + idx + 1}
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {tableTab === "bang3" && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-emerald-700 text-white font-bold">
                  <th className="py-2.5 px-3 w-12 text-center">STT</th>
                  <th className="py-2.5 px-3 min-w-[120px]">MÃ THUỐC</th>
                  <th className="py-2.5 px-3 min-w-[220px]">TÊN THUỐC</th>
                  <th className="py-2.5 px-3 min-w-[200px]">TÊN HOẠT CHẤT</th>
                  <th className="py-2.5 px-3 min-w-[100px]">HÀM LƯỢNG</th>
                  <th className="py-2.5 px-3 min-w-[80px] text-center">ĐVT</th>
                  <th className="py-2.5 px-3 min-w-[100px]">ĐƯỜNG DÙNG</th>
                  <th className="py-2.5 px-3 min-w-[120px]">SỐ ĐĂNG KÝ</th>
                  <th className="py-2.5 px-3 min-w-[110px] text-right">ĐƠN GIÁ (VNĐ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 font-medium">
                {pagedData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 font-bold">
                      Chưa có dữ liệu thuốc trong Bảng 3.
                    </td>
                  </tr>
                ) : (
                  (pagedData as Tt12Bang3Thuoc[]).map((item, idx) => (
                    <tr key={item.maThuoc + idx} className="hover:bg-emerald-50/50 transition">
                      <td className="py-2 px-3 text-center text-slate-400 font-mono">
                        {(page - 1) * PAGE_SIZE + idx + 1}
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {tableTab === "bang4" && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-sky-700 text-white font-bold">
                  <th className="py-2.5 px-3 w-12 text-center">STT</th>
                  <th className="py-2.5 px-3 min-w-[160px]">MÃ VẬT TƯ</th>
                  <th className="py-2.5 px-3 min-w-[240px]">TÊN VẬT TƯ Y TẾ</th>
                  <th className="py-2.5 px-3 min-w-[180px]">NHÓM VẬT TƯ</th>
                  <th className="py-2.5 px-3 min-w-[130px]">MÃ HIỆU / QUY CÁCH</th>
                  <th className="py-2.5 px-3 min-w-[140px]">HÃNG / NƯỚC SX</th>
                  <th className="py-2.5 px-3 min-w-[80px] text-center">ĐVT</th>
                  <th className="py-2.5 px-3 min-w-[110px] text-right">ĐƠN GIÁ (VNĐ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 font-medium">
                {pagedData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                      Chưa có dữ liệu vật tư y tế trong Bảng 4.
                    </td>
                  </tr>
                ) : (
                  (pagedData as Tt12Bang4VatTu[]).map((item, idx) => (
                    <tr key={item.maVatTu + idx} className="hover:bg-sky-50/50 transition">
                      <td className="py-2 px-3 text-center text-slate-400 font-mono">
                        {(page - 1) * PAGE_SIZE + idx + 1}
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {tableTab === "bang5" && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-indigo-700 text-white font-bold">
                  <th className="py-2.5 px-3 w-12 text-center">STT</th>
                  <th className="py-2.5 px-3 min-w-[130px]">MÃ DVKT</th>
                  <th className="py-2.5 px-3 min-w-[280px]">TÊN DỊCH VỤ KỸ THUẬT</th>
                  <th className="py-2.5 px-3 min-w-[200px]">TÊN GIÁ DVKT</th>
                  <th className="py-2.5 px-3 min-w-[110px] text-right">ĐƠN GIÁ (VNĐ)</th>
                  <th className="py-2.5 px-3 min-w-[180px]">QUYẾT ĐỊNH / GHI CHÚ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 font-medium">
                {pagedData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-bold">
                      Chưa có dữ liệu dịch vụ kỹ thuật trong Bảng 5.
                    </td>
                  </tr>
                ) : (
                  (pagedData as Tt12Bang5DichVu[]).map((item, idx) => (
                    <tr key={item.maDichVu + idx} className="hover:bg-indigo-50/50 transition">
                      <td className="py-2 px-3 text-center text-slate-400 font-mono">
                        {(page - 1) * PAGE_SIZE + idx + 1}
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
                    </tr>
                  ))
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
                className="text-slate-400 hover:text-slate-600 font-bold"
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
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-bold text-teal-800 dark:text-cyan-400 focus:ring-2 focus:ring-teal-500"
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
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold shadow-xs"
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
                className="text-slate-400 hover:text-slate-600 font-bold"
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
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold shadow-xs"
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
