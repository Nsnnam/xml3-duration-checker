import React, { useState } from "react";
import {
  type WarningCategory,
  WARNING_CATEGORY_CONFIG,
  DEFAULT_WARNING_COLORS,
  saveWarningColors,
  resetWarningColors,
} from "./xml3-duration.ts";

const PRESET_PALETTES = [
  { name: "Đỏ hồng", hex: "#E11D48" },
  { name: "Cam tươi", hex: "#EA580C" },
  { name: "Hổ phách", hex: "#D97706" },
  { name: "Vàng đồng", hex: "#CA8A04" },
  { name: "Xanh lá", hex: "#16A34A" },
  { name: "Xanh ngọc", hex: "#0F766E" },
  { name: "Xanh dương", hex: "#0284C7" },
  { name: "Xanh lam", hex: "#2563EB" },
  { name: "Tím chàm", hex: "#4338CA" },
  { name: "Tím hoa cà", hex: "#7C3AED" },
  { name: "Hồng sen", hex: "#C026D3" },
  { name: "Nâu xám", hex: "#78716C" },
  { name: "Đen chì", hex: "#334155" },
];

export function WarningColorModal({
  isOpen,
  onClose,
  currentColors,
  onSaveColors,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentColors: Record<WarningCategory, string>;
  onSaveColors: (colors: Record<WarningCategory, string>) => void;
}) {
  const [colors, setColors] = useState<Record<WarningCategory, string>>({ ...currentColors });
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const categories: WarningCategory[] = [
    "overMax",
    "underMin",
    "dupMachine",
    "maMay",
    "ttThau",
    "order",
    "equal",
    "z000",
    "bed",
    "ketLuan",
    "cccd",
  ];

  const handleColorChange = (cat: WarningCategory, hex: string) => {
    setColors((prev) => ({ ...prev, [cat]: hex }));
  };

  const handleSave = () => {
    saveWarningColors(colors);
    onSaveColors(colors);
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 600);
  };

  const handleReset = () => {
    const defaults = resetWarningColors();
    setColors(defaults);
    onSaveColors(defaults);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-3xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 md:p-7 space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-teal-700 dark:text-cyan-400">
              Tùy biến cảnh báo
            </div>
            <h2 className="mt-0.5 text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>🎨</span> Tùy chỉnh màu sắc từng loại cảnh báo
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xl">
              Cấu hình màu sắc nhận diện riêng biệt cho từng loại cảnh báo. Màu sắc sẽ được áp dụng
              đồng bộ trên thanh Filter Chips, huy hiệu bảng dữ liệu và chi tiết bệnh nhân.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition cursor-pointer"
          >
            ✕ Đóng
          </button>
        </div>

        {/* Danh sách các loại cảnh báo */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categories.map((catKey) => {
              const meta = WARNING_CATEGORY_CONFIG[catKey];
              const currentColor = colors[catKey] || meta.defaultColor || "#E11D48";
              return (
                <div
                  key={catKey}
                  className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-3 flex flex-col justify-between gap-2.5 transition hover:shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-base">{meta.icon}</span>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                        {meta.label}
                      </span>
                    </div>
                    {/* Badge Xem trước */}
                    <span
                      style={{ backgroundColor: currentColor, borderColor: currentColor }}
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase text-white shadow-2xs whitespace-nowrap shrink-0"
                    >
                      {meta.badgeText}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={currentColor}
                        onChange={(e) => handleColorChange(catKey, e.target.value)}
                        className="h-7 w-8 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-600 bg-transparent p-0.5"
                        title="Chọn màu tự do"
                      />
                      <input
                        type="text"
                        value={currentColor}
                        onChange={(e) => handleColorChange(catKey, e.target.value)}
                        className="w-20 font-mono text-xs uppercase px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                        maxLength={7}
                      />
                    </div>

                    {/* Palette chọn nhanh */}
                    <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                      {PRESET_PALETTES.slice(0, 6).map((preset) => (
                        <button
                          key={preset.hex}
                          type="button"
                          onClick={() => handleColorChange(catKey, preset.hex)}
                          style={{ backgroundColor: preset.hex }}
                          className={`h-4 w-4 rounded-full border border-white/60 shadow-2xs hover:scale-115 transition ${
                            currentColor.toUpperCase() === preset.hex.toUpperCase()
                              ? "ring-2 ring-teal-500 scale-110"
                              : ""
                          }`}
                          title={preset.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-2xs"
          >
            🔄 Khôi phục màu mặc định
          </button>
          <div className="flex items-center gap-2">
            {savedNotice && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                ✅ Đã lưu cấu hình màu!
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="rounded-xl bg-teal-700 px-5 py-2 text-xs font-bold text-white hover:bg-teal-800 shadow-sm transition"
            >
              💾 Lưu màu sắc cảnh báo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
