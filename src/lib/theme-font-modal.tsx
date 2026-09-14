import React from "react";
import {
  THEME_CONFIGS,
  FONT_CONFIGS,
  type ThemeId,
  type FontId,
  saveTheme,
  saveFont,
} from "./theme-manager.ts";

export function ThemeFontModal({
  isOpen,
  onClose,
  currentTheme,
  currentFont,
  onSelectTheme,
  onSelectFont,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeId;
  currentFont: FontId;
  onSelectTheme: (id: ThemeId) => void;
  onSelectFont: (id: FontId) => void;
}) {
  if (!isOpen) return null;

  const handlePickTheme = (id: ThemeId) => {
    onSelectTheme(id);
    saveTheme(id);
  };

  const handlePickFont = (id: FontId) => {
    onSelectFont(id);
    saveFont(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-teal-700 dark:text-cyan-400">
              Tùy biến diện mạo
            </div>
            <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
              Kho Giao diện &amp; Tùy chọn Font chữ
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Chọn giao diện kỹ thuật số hoặc hiện đại để đồng bộ toàn bộ bố cục, màu sắc các nút
              bấm, thẻ và bảng; cùng các font chữ tối ưu chuẩn tiếng Việt.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 dark:border-slate-700 p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-bold"
          >
            ✕ Đóng
          </button>
        </div>

        {/* Section 1: Kho Giao diện */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>🎨</span> Kho Giao diện Đồng bộ (Themes)
            </h3>
            <span className="text-[11px] text-teal-700 dark:text-cyan-400 font-semibold">
              Tự động áp dụng và lưu mặc định
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.values(THEME_CONFIGS).map((theme) => {
              const isActive = currentTheme === theme.id;
              return (
                <div
                  key={theme.id}
                  onClick={() => handlePickTheme(theme.id)}
                  className={`cursor-pointer rounded-2xl border-2 p-4 transition-all duration-200 relative flex flex-col justify-between ${
                    isActive
                      ? "border-teal-600 dark:border-cyan-400 bg-teal-50/30 dark:bg-cyan-950/20 shadow-lg scale-[1.02]"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/60 hover:shadow-md"
                  }`}
                >
                  <div>
                    {/* Header preview strip */}
                    <div
                      style={{ background: theme.variables["--app-header-bg"] }}
                      className="h-10 w-full rounded-xl flex items-center justify-between px-3 shadow-inner"
                    >
                      <span className="text-[11px] font-bold text-white tracking-wide">
                        NsN_XMLcheck
                      </span>
                      <span className="h-3 w-3 rounded-full bg-white/40" />
                    </div>

                    {/* Color palette dots */}
                    <div className="mt-3 flex items-center gap-2">
                      <span
                        className="h-5 w-5 rounded-full border border-black/10 shadow-sm"
                        style={{ backgroundColor: theme.previewColors.bg }}
                        title="Màu nền"
                      />
                      <span
                        className="h-5 w-5 rounded-full border border-black/10 shadow-sm"
                        style={{ backgroundColor: theme.previewColors.card }}
                        title="Màu Card"
                      />
                      <span
                        className="h-5 w-5 rounded-full border border-black/10 shadow-sm"
                        style={{ backgroundColor: theme.previewColors.primary }}
                        title="Màu chính"
                      />
                      <span
                        className="h-5 w-5 rounded-full border border-black/10 shadow-sm"
                        style={{ backgroundColor: theme.previewColors.accent }}
                        title="Màu điểm nhấn"
                      />
                      <span className="ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {theme.category === "cyber"
                          ? "Kỹ thuật số"
                          : theme.category === "dark"
                            ? "Chế độ tối"
                            : "Sáng dịu"}
                      </span>
                    </div>

                    <h4 className="mt-3 font-bold text-sm text-slate-900 dark:text-white">
                      {theme.name}
                    </h4>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {theme.tagline}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-400">
                      {isActive ? "Đang áp dụng" : "Bấm để chọn"}
                    </span>
                    {isActive ? (
                      <span className="rounded-lg bg-teal-700 dark:bg-cyan-500 px-2.5 py-1 text-[11px] font-bold text-white">
                        ✓ Mặc định
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 font-semibold hover:text-slate-900 dark:hover:text-white">
                        Áp dụng →
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Tùy chọn Font chữ Tiếng Việt */}
        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>🔤</span> Lựa chọn Font Chữ Tiếng Việt (Font chủ đạo: Be Vietnam Pro)
            </h3>
            <span className="text-[11px] text-slate-500">
              Hỗ trợ đầy đủ dấu tiếng Việt &amp; số liệu
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.values(FONT_CONFIGS).map((font) => {
              const isSelected = currentFont === font.id;
              return (
                <div
                  key={font.id}
                  onClick={() => handlePickFont(font.id)}
                  style={{ fontFamily: font.family }}
                  className={`cursor-pointer rounded-2xl border-2 p-4 transition-all duration-200 ${
                    isSelected
                      ? "border-teal-600 dark:border-cyan-400 bg-teal-50/40 dark:bg-cyan-950/20 shadow-md"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {font.name}
                    </span>
                    {font.isPrimary && (
                      <span className="rounded-full bg-teal-100 dark:bg-cyan-900/60 text-teal-800 dark:text-cyan-300 px-2 py-0.5 text-[10px] font-bold">
                        Chủ đạo
                      </span>
                    )}
                    {isSelected && !font.isPrimary && (
                      <span className="text-teal-700 dark:text-cyan-400 font-bold text-xs">
                        ✓ Chọn
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {font.subname}
                  </p>

                  <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 p-2.5 text-xs text-slate-700 dark:text-slate-300 leading-snug border border-slate-100 dark:border-slate-800">
                    <div>Kiểm tra thời gian XML3: 70 phút.</div>
                    <div className="mt-0.5 text-[11px] text-slate-500 font-mono">
                      0123456789 · BHYT QĐ130
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="rounded-xl bg-teal-700 dark:bg-cyan-500 px-6 py-2.5 text-xs font-bold text-white hover:bg-teal-800 dark:hover:bg-cyan-600 shadow-sm"
          >
            Hoàn tất &amp; Lưu cấu hình
          </button>
        </div>
      </div>
    </div>
  );
}
