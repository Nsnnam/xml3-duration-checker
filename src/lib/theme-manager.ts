/**
 * Quản lý kho giao diện (Themes) và font chữ tiếng Việt cho NsN_XMLcheck.
 * Múi giờ chuẩn: Asia/Ho_Chi_Minh (GMT+7) · Tác giả: Nguyễn Sơn Nam (Nsnnam).
 */

export type ThemeId =
  "clinical-teal" | "cyber-digital" | "luxury-obsidian" | "ocean-digital" | "pure-minimalist";

export type FontId = "be-vietnam-pro" | "inter" | "plus-jakarta-sans" | "lexend" | "roboto";

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  tagline: string;
  category: "light" | "dark" | "cyber";
  previewColors: {
    bg: string;
    card: string;
    primary: string;
    accent: string;
    text: string;
  };
  variables: Record<string, string>;
}

export interface FontConfig {
  id: FontId;
  name: string;
  subname: string;
  family: string;
  isPrimary?: boolean;
}

export const THEME_CONFIGS: Record<ThemeId, ThemeConfig> = {
  "clinical-teal": {
    id: "clinical-teal",
    name: "Chuẩn Y tế Hiện đại (Clinical Teal)",
    tagline: "Giao diện sáng thanh thoát, chuẩn mực bệnh viện quốc tế, dịu mắt và tương phản cao",
    category: "light",
    previewColors: {
      bg: "#f8fafc",
      card: "#ffffff",
      primary: "#0f766e",
      accent: "#10b981",
      text: "#0f172a",
    },
    variables: {
      "--app-bg": "#f8fafc",
      "--app-card-bg": "#ffffff",
      "--app-card-border": "#e2e8f0",
      "--app-card-shadow": "0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)",
      "--app-header-bg": "linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #059669 100%)",
      "--app-header-text": "#ffffff",
      "--app-header-subtext": "#ccfbf1",
      "--app-title-color": "#0f172a",
      "--app-text": "#0f172a",
      "--app-text-muted": "#64748b",
      "--app-primary": "#0f766e",
      "--app-primary-hover": "#115e59",
      "--app-primary-text": "#ffffff",
      "--app-secondary-bg": "#f1f5f9",
      "--app-secondary-border": "#cbd5e1",
      "--app-secondary-text": "#334155",
      "--app-accent": "#0d9488",
      "--app-table-th-bg": "#f1f5f9",
      "--app-table-th-text": "#334155",
      "--app-table-tr-hover": "#f8fafc",
      "--app-table-border": "#e2e8f0",
      "--app-badge-warning-bg": "#fef2f2",
      "--app-badge-warning-border": "#fecaca",
      "--app-badge-warning-text": "#b91c1c",
      "--app-badge-ok-bg": "#f0fdf4",
      "--app-badge-ok-border": "#bbf7d0",
      "--app-badge-ok-text": "#15803d",
      "--app-glow": "none",
    },
  },
  "cyber-digital": {
    id: "cyber-digital",
    name: "Kỹ thuật số Y tế (Cyber Digital Neon)",
    tagline: "Giao diện tối công nghệ cao 4.0, phát sáng Cyan & Emerald, chuẩn phòng điều hành số",
    category: "cyber",
    previewColors: {
      bg: "#070b14",
      card: "#0f172a",
      primary: "#06b6d4",
      accent: "#10b981",
      text: "#f8fafc",
    },
    variables: {
      "--app-bg": "#070b14",
      "--app-card-bg": "#0f172a",
      "--app-card-border": "#1e293b",
      "--app-card-shadow": "0 0 20px -5px rgba(6, 182, 212, 0.15)",
      "--app-header-bg": "linear-gradient(135deg, #091224 0%, #0b1c3d 50%, #0d2847 100%)",
      "--app-header-text": "#f8fafc",
      "--app-header-subtext": "#38bdf8",
      "--app-title-color": "#f8fafc",
      "--app-text": "#f1f5f9",
      "--app-text-muted": "#94a3b8",
      "--app-primary": "#06b6d4",
      "--app-primary-hover": "#0891b2",
      "--app-primary-text": "#080e1a",
      "--app-secondary-bg": "#1e293b",
      "--app-secondary-border": "#334155",
      "--app-secondary-text": "#e2e8f0",
      "--app-accent": "#10b981",
      "--app-table-th-bg": "#141f36",
      "--app-table-th-text": "#38bdf8",
      "--app-table-tr-hover": "#162544",
      "--app-table-border": "#1e293b",
      "--app-badge-warning-bg": "rgba(239, 68, 68, 0.15)",
      "--app-badge-warning-border": "rgba(239, 68, 68, 0.4)",
      "--app-badge-warning-text": "#fca5a5",
      "--app-badge-ok-bg": "rgba(16, 185, 129, 0.15)",
      "--app-badge-ok-border": "rgba(16, 185, 129, 0.4)",
      "--app-badge-ok-text": "#6ee7b7",
      "--app-glow": "0 0 15px rgba(6, 182, 212, 0.35)",
    },
  },
  "luxury-obsidian": {
    id: "luxury-obsidian",
    name: "Đẳng cấp Doanh nghiệp (Luxury Obsidian Gold)",
    tagline: "Đen than chì sang trọng, điểm nhấn Vàng hổ phách & Chàm tím cao cấp",
    category: "dark",
    previewColors: {
      bg: "#0a0e17",
      card: "#121826",
      primary: "#f59e0b",
      accent: "#6366f1",
      text: "#f8fafc",
    },
    variables: {
      "--app-bg": "#0a0e17",
      "--app-card-bg": "#121826",
      "--app-card-border": "#1f293d",
      "--app-card-shadow": "0 4px 20px -2px rgba(0, 0, 0, 0.5)",
      "--app-header-bg": "linear-gradient(135deg, #111827 0%, #1e1b4b 60%, #312e81 100%)",
      "--app-header-text": "#ffffff",
      "--app-header-subtext": "#fde68a",
      "--app-title-color": "#f8fafc",
      "--app-text": "#f1f5f9",
      "--app-text-muted": "#94a3b8",
      "--app-primary": "#f59e0b",
      "--app-primary-hover": "#d97706",
      "--app-primary-text": "#0f172a",
      "--app-secondary-bg": "#1e293b",
      "--app-secondary-border": "#334155",
      "--app-secondary-text": "#f1f5f9",
      "--app-accent": "#6366f1",
      "--app-table-th-bg": "#172033",
      "--app-table-th-text": "#fbbf24",
      "--app-table-tr-hover": "#1c273e",
      "--app-table-border": "#243048",
      "--app-badge-warning-bg": "rgba(244, 63, 94, 0.18)",
      "--app-badge-warning-border": "rgba(244, 63, 94, 0.45)",
      "--app-badge-warning-text": "#fda4af",
      "--app-badge-ok-bg": "rgba(245, 158, 11, 0.15)",
      "--app-badge-ok-border": "rgba(245, 158, 11, 0.4)",
      "--app-badge-ok-text": "#fcd34d",
      "--app-glow": "0 0 15px rgba(245, 158, 11, 0.3)",
    },
  },
  "ocean-digital": {
    id: "ocean-digital",
    name: "Xanh Đại Dương Kỹ Thuật Số (Ocean Breeze)",
    tagline: "Tone xanh biển sâu tươi mát, êm dịu cho mắt khi làm việc với khối lượng dữ liệu lớn",
    category: "light",
    previewColors: {
      bg: "#f0f7ff",
      card: "#ffffff",
      primary: "#0284c7",
      accent: "#0ea5e9",
      text: "#0c4a6e",
    },
    variables: {
      "--app-bg": "#f0f7ff",
      "--app-card-bg": "#ffffff",
      "--app-card-border": "#bae6fd",
      "--app-card-shadow": "0 2px 8px -2px rgba(2, 132, 199, 0.12)",
      "--app-header-bg": "linear-gradient(135deg, #0369a1 0%, #0284c7 60%, #0ea5e9 100%)",
      "--app-header-text": "#ffffff",
      "--app-header-subtext": "#e0f2fe",
      "--app-title-color": "#0c4a6e",
      "--app-text": "#0f172a",
      "--app-text-muted": "#0369a1",
      "--app-primary": "#0284c7",
      "--app-primary-hover": "#0369a1",
      "--app-primary-text": "#ffffff",
      "--app-secondary-bg": "#e0f2fe",
      "--app-secondary-border": "#7dd3fc",
      "--app-secondary-text": "#0369a1",
      "--app-accent": "#0284c7",
      "--app-table-th-bg": "#e0f2fe",
      "--app-table-th-text": "#0369a1",
      "--app-table-tr-hover": "#f0f9ff",
      "--app-table-border": "#e0f2fe",
      "--app-badge-warning-bg": "#fef2f2",
      "--app-badge-warning-border": "#fecaca",
      "--app-badge-warning-text": "#b91c1c",
      "--app-badge-ok-bg": "#f0fdf4",
      "--app-badge-ok-border": "#bbf7d0",
      "--app-badge-ok-text": "#15803d",
      "--app-glow": "none",
    },
  },
  "pure-minimalist": {
    id: "pure-minimalist",
    name: "Trắng Tối giản Hiện đại (Pure Minimalist)",
    tagline:
      "Thiết kế tối giản phong cách Bắc Âu, viền khói mảnh mai, tập trung tối đa vào thông số",
    category: "light",
    previewColors: {
      bg: "#f9fafb",
      card: "#ffffff",
      primary: "#1e293b",
      accent: "#2563eb",
      text: "#111827",
    },
    variables: {
      "--app-bg": "#f9fafb",
      "--app-card-bg": "#ffffff",
      "--app-card-border": "#e5e7eb",
      "--app-card-shadow": "0 1px 3px 0 rgb(0 0 0 / 0.05)",
      "--app-header-bg": "linear-gradient(135deg, #111827 0%, #1e293b 60%, #334155 100%)",
      "--app-header-text": "#ffffff",
      "--app-header-subtext": "#cbd5e1",
      "--app-title-color": "#111827",
      "--app-text": "#111827",
      "--app-text-muted": "#6b7280",
      "--app-primary": "#1e293b",
      "--app-primary-hover": "#0f172a",
      "--app-primary-text": "#ffffff",
      "--app-secondary-bg": "#f3f4f6",
      "--app-secondary-border": "#d1d5db",
      "--app-secondary-text": "#374151",
      "--app-accent": "#2563eb",
      "--app-table-th-bg": "#f3f4f6",
      "--app-table-th-text": "#111827",
      "--app-table-tr-hover": "#f9fafb",
      "--app-table-border": "#e5e7eb",
      "--app-badge-warning-bg": "#fef2f2",
      "--app-badge-warning-border": "#fecaca",
      "--app-badge-warning-text": "#b91c1c",
      "--app-badge-ok-bg": "#f0fdf4",
      "--app-badge-ok-border": "#bbf7d0",
      "--app-badge-ok-text": "#15803d",
      "--app-glow": "none",
    },
  },
};

export const FONT_CONFIGS: Record<FontId, FontConfig> = {
  "be-vietnam-pro": {
    id: "be-vietnam-pro",
    name: "Be Vietnam Pro",
    subname: "Font chủ đạo · Tối ưu hoàn hảo cho Tiếng Việt",
    family: "'Be Vietnam Pro', system-ui, -apple-system, sans-serif",
    isPrimary: true,
  },
  inter: {
    id: "inter",
    name: "Inter",
    subname: "Chuẩn giao diện phần mềm quốc tế",
    family: "'Inter', system-ui, -apple-system, sans-serif",
  },
  "plus-jakarta-sans": {
    id: "plus-jakarta-sans",
    name: "Plus Jakarta Sans",
    subname: "Thanh lịch, hiện đại, sắc nét",
    family: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
  },
  lexend: {
    id: "lexend",
    name: "Lexend",
    subname: "Tối ưu cho việc đọc nhanh số liệu & bảng biểu",
    family: "'Lexend', system-ui, -apple-system, sans-serif",
  },
  roboto: {
    id: "roboto",
    name: "Roboto",
    subname: "Kinh điển, rõ ràng và ổn định",
    family: "'Roboto', system-ui, -apple-system, sans-serif",
  },
};

const STORAGE_THEME_KEY = "nsn-xmlcheck-theme-v2";
const STORAGE_FONT_KEY = "nsn-xmlcheck-font-v2";

export function loadSavedTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(STORAGE_THEME_KEY);
    if (saved && saved in THEME_CONFIGS) return saved as ThemeId;
  } catch {
    // ignore
  }
  return "clinical-teal";
}

export function saveTheme(id: ThemeId): void {
  try {
    localStorage.setItem(STORAGE_THEME_KEY, id);
  } catch {
    // ignore
  }
}

export function loadSavedFont(): FontId {
  try {
    const saved = localStorage.getItem(STORAGE_FONT_KEY);
    if (saved && saved in FONT_CONFIGS) return saved as FontId;
  } catch {
    // ignore
  }
  return "be-vietnam-pro";
}

export function saveFont(id: FontId): void {
  try {
    localStorage.setItem(STORAGE_FONT_KEY, id);
  } catch {
    // ignore
  }
}

/**
 * Áp dụng theme và font vào toàn bộ document root.
 */
export function applyThemeAndFont(themeId: ThemeId, fontId: FontId): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const theme = THEME_CONFIGS[themeId] ?? THEME_CONFIGS["clinical-teal"];
  const font = FONT_CONFIGS[fontId] ?? FONT_CONFIGS["be-vietnam-pro"];

  // Set data attribute
  root.setAttribute("data-theme", themeId);
  root.setAttribute("data-font", fontId);

  // Dark class toggle
  if (theme.category === "dark" || theme.category === "cyber") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  // Apply theme custom properties
  for (const [key, value] of Object.entries(theme.variables)) {
    root.style.setProperty(key, value);
  }

  // Apply font family
  root.style.setProperty("--app-font-family", font.family);
  document.body.style.fontFamily = font.family;
}
