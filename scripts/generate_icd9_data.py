import openpyxl
import json
import os

excel_path = r"J:\Users\Admin\Desktop\2024\12.2024\19122024 - Mã hóa dịch vụ theo thông tư 21\Phu  lục 3 - Danh mục chuyển đổi mã Danh mục kỹ thuật Tương đương với ICD-9 CM Volume 3.xlsx"
print(f"Loading {excel_path}...")
wb = openpyxl.load_workbook(excel_path, read_only=True, data_only=True)
ws = wb.active

entries = []
seen = set()

for i, row in enumerate(ws.iter_rows(values_only=True)):
    if i <= 2:
        continue
    ma_td = str(row[2]).strip() if row[2] is not None else ""
    ten_21 = str(row[3]).strip() if row[3] is not None else ""
    ma_icd9 = str(row[6]).strip() if row[6] is not None else ""
    ten_icd9 = str(row[7]).strip() if row[7] is not None else ""
    chuyen_khoa = str(row[1]).strip() if row[1] is not None else ""

    if ma_td and ma_icd9:
        if ma_td not in seen:
            seen.add(ma_td)
            entries.append({
                "maDichVu": ma_td,
                "tenDichVu": ten_21,
                "maIcd9": ma_icd9,
                "tenIcd9": ten_icd9,
                "chuyenKhoa": chuyen_khoa
            })

print(f"Total unique entries: {len(entries)}")

out_path = r"C:\Users\Admin\Projects\xml3-duration-checker\src\lib\icd9-cm-services-data.ts"

with open(out_path, "w", encoding="utf-8") as f:
    f.write("/**\n")
    f.write(" * Danh mục chuyển đổi giữa danh mục kỹ thuật tương đương và phân loại phẫu thuật, thủ thuật quốc tế ICD-9-CM\n")
    f.write(" * Căn cứ Phụ lục 3 (Quyết định số 5937/QĐ-BYT / Thông tư số 21/2020/TT-BYT của Bộ trưởng Bộ Y tế)\n")
    f.write(f" * Tổng cộng: {len(entries):,} DVKT được mã hóa tương đương ICD-9-CM Volume 3\n")
    f.write(" */\n\n")
    f.write("export type Icd9ServiceMapping = {\n")
    f.write("  maDichVu: string;\n")
    f.write("  tenDichVu: string;\n")
    f.write("  maIcd9: string;\n")
    f.write("  tenIcd9: string;\n")
    f.write("  chuyenKhoa?: string;\n")
    f.write("};\n\n")
    f.write("export const ICD9_SERVICES_STORAGE_KEY = \"nsn-xmlcheck-icd9-services\";\n\n")
    f.write("export const DEFAULT_ICD9_CM_SERVICES: Icd9ServiceMapping[] = ")
    json.dump(entries, f, ensure_ascii=False, indent=2)
    f.write(";\n\n")
    f.write("let cachedIcd9Map: Map<string, Icd9ServiceMapping> | null = null;\n\n")
    f.write("export function getIcd9LookupMap(customList?: Icd9ServiceMapping[]): Map<string, Icd9ServiceMapping> {\n")
    f.write("  if (customList && customList.length > 0) {\n")
    f.write("    const map = new Map<string, Icd9ServiceMapping>();\n")
    f.write("    for (const item of customList) {\n")
    f.write("      if (item.maDichVu && !map.has(item.maDichVu.trim())) {\n")
    f.write("        map.set(item.maDichVu.trim(), item);\n")
    f.write("      }\n")
    f.write("    }\n")
    f.write("    return map;\n")
    f.write("  }\n")
    f.write("  if (!cachedIcd9Map) {\n")
    f.write("    cachedIcd9Map = new Map<string, Icd9ServiceMapping>();\n")
    f.write("    for (const item of DEFAULT_ICD9_CM_SERVICES) {\n")
    f.write("      if (item.maDichVu && !cachedIcd9Map.has(item.maDichVu.trim())) {\n")
    f.write("        cachedIcd9Map.set(item.maDichVu.trim(), item);\n")
    f.write("      }\n")
    f.write("    }\n")
    f.write("  }\n")
    f.write("  return cachedIcd9Map;\n")
    f.write("}\n\n")
    f.write("export function findIcd9Mapping(\n")
    f.write("  maDichVu: string | undefined | null,\n")
    f.write("  customList?: Icd9ServiceMapping[],\n")
    f.write("): Icd9ServiceMapping | undefined {\n")
    f.write("  if (!maDichVu) return undefined;\n")
    f.write("  const cleanCode = maDichVu.trim();\n")
    f.write("  const map = getIcd9LookupMap(customList);\n")
    f.write("  return map.get(cleanCode);\n")
    f.write("}\n\n")
    f.write("export function loadIcd9Services(): Icd9ServiceMapping[] {\n")
    f.write("  try {\n")
    f.write("    const raw = localStorage.getItem(ICD9_SERVICES_STORAGE_KEY);\n")
    f.write("    if (!raw) return DEFAULT_ICD9_CM_SERVICES;\n")
    f.write("    const parsed = JSON.parse(raw);\n")
    f.write("    if (Array.isArray(parsed) && parsed.length > 0) {\n")
    f.write("      return parsed;\n")
    f.write("    }\n")
    f.write("    return DEFAULT_ICD9_CM_SERVICES;\n")
    f.write("  } catch {\n")
    f.write("    return DEFAULT_ICD9_CM_SERVICES;\n")
    f.write("  }\n")
    f.write("}\n\n")
    f.write("export function saveIcd9Services(list: Icd9ServiceMapping[]): void {\n")
    f.write("  try {\n")
    f.write("    localStorage.setItem(ICD9_SERVICES_STORAGE_KEY, JSON.stringify(list));\n")
    f.write("    cachedIcd9Map = null;\n")
    f.write("  } catch (err) {\n")
    f.write("    console.error(\"Lỗi khi lưu danh mục ICD9-CM:\", err);\n")
    f.write("  }\n")
    f.write("}\n\n")
    f.write("export function resetIcd9Services(): Icd9ServiceMapping[] {\n")
    f.write("  localStorage.removeItem(ICD9_SERVICES_STORAGE_KEY);\n")
    f.write("  cachedIcd9Map = null;\n")
    f.write("  return DEFAULT_ICD9_CM_SERVICES;\n")
    f.write("}\n")

print(f"Generated {out_path} ({os.path.getsize(out_path):,} bytes)")
