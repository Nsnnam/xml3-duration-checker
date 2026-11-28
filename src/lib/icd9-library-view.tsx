import { useState, useMemo } from "react";
import {
  DEFAULT_ICD9_CM_SERVICES,
  loadIcd9Services,
  saveIcd9Services,
  resetIcd9Services,
  type Icd9ServiceMapping,
} from "./icd9-cm-services-data.ts";
import { exportIcd9MappingsToExcel } from "./library-excel.ts";
import { removeVietnameseTones } from "./timezone.ts";

const PAGE_SIZE = 50;

export function Icd9LibraryView({ onRefreshXmlAudit }: { onRefreshXmlAudit?: () => void }) {
  const [mappings, setMappings] = useState<Icd9ServiceMapping[]>(() => loadIcd9Services());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");

  // Thêm mới
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMaDv, setNewMaDv] = useState("");
  const [newTenDv, setNewTenDv] = useState("");
  const [newMaIcd9, setNewMaIcd9] = useState("");
  const [newTenIcd9, setNewTenIcd9] = useState("");
  const [newChuyenKhoa, setNewChuyenKhoa] = useState("");

  // Sửa
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editTenDv, setEditTenDv] = useState("");
  const [editMaIcd9, setEditMaIcd9] = useState("");
  const [editTenIcd9, setEditTenIcd9] = useState("");
  const [editChuyenKhoa, setEditChuyenKhoa] = useState("");

  // Danh sách chuyên khoa
  const specialties = useMemo(() => {
    const set = new Set<string>();
    for (const m of mappings) {
      if (m.chuyenKhoa && m.chuyenKhoa.trim()) {
        set.add(m.chuyenKhoa.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "vi"));
  }, [mappings]);

  // Bộ lọc
  const filteredList = useMemo(() => {
    let result = mappings;
    if (selectedSpecialty !== "all") {
      result = result.filter((m) => m.chuyenKhoa?.trim() === selectedSpecialty);
    }
    const query = searchTerm.trim().toLowerCase();
    if (query) {
      const qNoTone = removeVietnameseTones(query);
      result = result.filter((m) => {
        const text =
          `${m.maDichVu} ${m.tenDichVu} ${m.maIcd9} ${m.tenIcd9} ${m.chuyenKhoa || ""}`.toLowerCase();
        const textNoTone = removeVietnameseTones(text);
        return text.includes(query) || textNoTone.includes(qNoTone);
      });
    }
    return result;
  }, [mappings, selectedSpecialty, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredList.slice(start, start + PAGE_SIZE);
  }, [filteredList, currentPage]);

  const handleExportExcel = async () => {
    try {
      await exportIcd9MappingsToExcel(
        filteredList.length < mappings.length ? filteredList : mappings,
        filteredList.length < mappings.length
          ? "DanhMuc_AnhXa_DVKT_ICD9_CM_DaLoc"
          : "DanhMuc_AnhXa_DVKT_ICD9_CM_TT21",
      );
      setNotice("✅ Đã xuất danh mục ICD-9-CM thành công ra file Excel!");
    } catch (err) {
      setNotice(`❌ Lỗi xuất Excel: ${err instanceof Error ? err.message : "Không xác định"}`);
    }
  };

  const handleResetDefault = () => {
    if (
      !confirm(
        "Bạn có chắc muốn khôi phục danh mục ánh xạ về nguyên bản 8,033 DVKT theo Phụ lục 3 Thông tư 21/2020/TT-BYT?",
      )
    ) {
      return;
    }
    const reset = resetIcd9Services();
    setMappings(reset);
    setPage(1);
    setNotice("✅ Đã khôi phục danh mục nguyên bản 8,033 DVKT!");
    onRefreshXmlAudit?.();
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaDv.trim() || !newMaIcd9.trim()) {
      alert("Vui lòng nhập Mã DVKT và Mã ICD-9-CM!");
      return;
    }
    const newItem: Icd9ServiceMapping = {
      maDichVu: newMaDv.trim(),
      tenDichVu: newTenDv.trim() || newMaDv.trim(),
      maIcd9: newMaIcd9.trim(),
      tenIcd9: newTenIcd9.trim() || newMaIcd9.trim(),
      chuyenKhoa: newChuyenKhoa.trim() || undefined,
    };
    const next = [newItem, ...mappings.filter((x) => x.maDichVu !== newItem.maDichVu)];
    setMappings(next);
    saveIcd9Services(next);
    setNewMaDv("");
    setNewTenDv("");
    setNewMaIcd9("");
    setNewTenIcd9("");
    setNewChuyenKhoa("");
    setShowAddForm(false);
    setNotice(`✅ Đã thêm quy tắc ánh xạ ICD-9 cho dịch vụ [${newItem.maDichVu}]!`);
    onRefreshXmlAudit?.();
  };

  const handleSaveEdit = (code: string) => {
    const next = mappings.map((m) => {
      if (m.maDichVu === code) {
        return {
          ...m,
          tenDichVu: editTenDv.trim() || m.tenDichVu,
          maIcd9: editMaIcd9.trim() || m.maIcd9,
          tenIcd9: editTenIcd9.trim() || m.tenIcd9,
          chuyenKhoa: editChuyenKhoa.trim() || undefined,
        };
      }
      return m;
    });
    setMappings(next);
    saveIcd9Services(next);
    setEditingCode(null);
    setNotice(`✅ Đã cập nhật ánh xạ ICD-9 cho dịch vụ [${code}]!`);
    onRefreshXmlAudit?.();
  };

  const handleDelete = (code: string) => {
    if (!confirm(`Xóa dịch vụ [${code}] khỏi danh mục ánh xạ ICD-9-CM?`)) return;
    const next = mappings.filter((m) => m.maDichVu !== code);
    setMappings(next);
    saveIcd9Services(next);
    setNotice(`✓ Đã xóa ánh xạ của dịch vụ [${code}].`);
    onRefreshXmlAudit?.();
  };

  return (
    <div className="space-y-6">
      {notice && (
        <div className="flex items-center justify-between rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs font-bold text-emerald-900 animate-in fade-in">
          <span>{notice}</span>
          <button
            onClick={() => setNotice("")}
            className="text-emerald-700 hover:text-emerald-900 ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Grid thống kê & Thẻ thông tin */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
          <div className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
            Tổng DVKT tương đương ICD-9-CM
          </div>
          <div className="mt-1 text-2xl font-black text-emerald-950">
            {mappings.length.toLocaleString("vi-VN")}
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Căn cứ Phụ lục 3 Thông tư 21/2020/TT-BYT của Bộ Y tế
          </div>
        </div>

        <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4">
          <div className="text-xs font-bold text-teal-800 uppercase tracking-wide">
            Quy chuẩn cột MA_PTTT_QT
          </div>
          <div className="mt-1 text-sm font-black text-teal-950 font-mono">
            XML3: Cột 52 · XML1: Cột 36
          </div>
          <div className="mt-1 text-xs text-slate-600">
            XML1 tổng hợp danh sách các mã từ XML3, phân cách bằng dấu ";"
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Thao tác danh mục
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Xuất báo cáo Excel hoặc khôi phục 8,033 mã gốc
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 text-xs font-bold shadow-xs transition flex items-center gap-1 cursor-pointer"
            >
              <span>📥</span> Xuất Excel
            </button>
            <button
              type="button"
              onClick={handleResetDefault}
              className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <span>🔄</span> Khôi phục gốc
            </button>
          </div>
        </div>
      </div>

      {/* Thanh công cụ tìm kiếm & Thêm mới */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            <div className="relative flex-1 min-w-[220px]">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm mã DV, tên DV, mã ICD-9 (vd 88.73, 96.56) hoặc chuyên khoa..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={selectedSpecialty}
              onChange={(e) => {
                setSelectedSpecialty(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-emerald-500 focus:outline-none"
            >
              <option value="all">Tất cả chuyên khoa ({specialties.length})</option>
              {specialties.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm((p) => !p)}
            className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>{showAddForm ? "✕ Đóng form" : "＋ Thêm ánh xạ mới"}</span>
          </button>
        </div>

        {/* Form Thêm mới */}
        {showAddForm && (
          <form
            onSubmit={handleAddSubmit}
            className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs animate-in fade-in"
          >
            <div>
              <label className="block font-bold text-slate-700 mb-1">Mã DVKT (*)</label>
              <input
                type="text"
                required
                value={newMaDv}
                onChange={(e) => setNewMaDv(e.target.value)}
                placeholder="VD: 01.0115.0297"
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tên dịch vụ kỹ thuật</label>
              <input
                type="text"
                value={newTenDv}
                onChange={(e) => setNewTenDv(e.target.value)}
                placeholder="Tên kỹ thuật tương đương..."
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Mã ICD-9-CM (*)</label>
              <input
                type="text"
                required
                value={newMaIcd9}
                onChange={(e) => setNewMaIcd9(e.target.value)}
                placeholder="VD: 88.73, 96.56..."
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs font-bold text-emerald-800"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tên theo ICD-9-CM Volume 3
              </label>
              <input
                type="text"
                value={newTenIcd9}
                onChange={(e) => setNewTenIcd9(e.target.value)}
                placeholder="Tên PTTT ICD-9..."
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block font-bold text-slate-700 mb-1">Chuyên khoa</label>
                <input
                  type="text"
                  value={newChuyenKhoa}
                  onChange={(e) => setNewChuyenKhoa(e.target.value)}
                  placeholder="VD: Ngoại khoa..."
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 font-bold shadow-xs cursor-pointer shrink-0"
              >
                Lưu
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Bảng danh sách ánh xạ */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="relative overflow-x-auto max-h-[560px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-700 sticky top-0 z-10 select-none shadow-xs border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5 w-12 text-center">STT</th>
                <th className="px-3 py-2.5 w-36">Mã DVKT</th>
                <th className="px-3 py-2.5">Tên kỹ thuật tương đương</th>
                <th className="px-3 py-2.5 w-28 text-center">Mã ICD-9</th>
                <th className="px-3 py-2.5">Tên ICD-9-CM Volume 3</th>
                <th className="px-3 py-2.5 w-36">Chuyên khoa</th>
                <th className="px-3 py-2.5 w-24 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                    Không tìm thấy kỹ thuật nào phù hợp với từ khóa "{searchTerm}".
                  </td>
                </tr>
              ) : (
                pageItems.map((item, idx) => {
                  const isEditing = editingCode === item.maDichVu;
                  const rowNum = (currentPage - 1) * PAGE_SIZE + idx + 1;
                  return (
                    <tr
                      key={item.maDichVu}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isEditing ? "bg-emerald-50/60" : ""
                      }`}
                    >
                      <td className="px-3 py-2 text-center font-mono text-slate-400 font-semibold">
                        {rowNum}
                      </td>
                      <td className="px-3 py-2 font-mono font-bold text-teal-800">
                        {item.maDichVu}
                      </td>
                      <td className="px-3 py-2 text-slate-900 font-medium">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editTenDv}
                            onChange={(e) => setEditTenDv(e.target.value)}
                            className="w-full rounded border border-emerald-400 bg-white px-2 py-1 text-xs"
                          />
                        ) : (
                          item.tenDichVu
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editMaIcd9}
                            onChange={(e) => setEditMaIcd9(e.target.value)}
                            className="w-20 rounded border border-emerald-400 bg-white px-1.5 py-1 text-xs font-mono font-bold text-center"
                          />
                        ) : (
                          <span className="inline-block rounded-md bg-emerald-100 px-2 py-0.5 font-mono font-black text-emerald-900 text-xs">
                            {item.maIcd9}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editTenIcd9}
                            onChange={(e) => setEditTenIcd9(e.target.value)}
                            className="w-full rounded border border-emerald-400 bg-white px-2 py-1 text-xs"
                          />
                        ) : (
                          item.tenIcd9
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-500 font-medium">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editChuyenKhoa}
                            onChange={(e) => setEditChuyenKhoa(e.target.value)}
                            className="w-full rounded border border-emerald-400 bg-white px-1.5 py-1 text-xs"
                          />
                        ) : (
                          item.chuyenKhoa || "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(item.maDichVu)}
                              className="rounded bg-emerald-700 hover:bg-emerald-800 text-white px-2 py-1 text-[11px] font-bold shadow-2xs"
                            >
                              Lưu
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCode(null)}
                              className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCode(item.maDichVu);
                                setEditTenDv(item.tenDichVu);
                                setEditMaIcd9(item.maIcd9);
                                setEditTenIcd9(item.tenIcd9);
                                setEditChuyenKhoa(item.chuyenKhoa || "");
                              }}
                              className="rounded border border-slate-200 bg-white hover:bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.maDichVu)}
                              className="rounded border border-rose-200 bg-white hover:bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600"
                            >
                              Xóa
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            <div>
              Hiển thị <b>{(currentPage - 1) * PAGE_SIZE + 1}</b> -{" "}
              <b>{Math.min(currentPage * PAGE_SIZE, filteredList.length)}</b> trong tổng số{" "}
              <b>{filteredList.length.toLocaleString("vi-VN")}</b> DVKT
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage(1)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
              >
                Đầu
              </button>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
              >
                Trước
              </button>
              <span className="px-2 font-bold text-slate-800">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
              >
                Sau
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(totalPages)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
              >
                Cuối
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
