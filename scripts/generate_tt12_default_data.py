import json, openpyxl, os

# 1. Load 26066 machines from MAU_06_26066_fix.xlsx
path_26066_m6 = r'J:\Users\Admin\Desktop\2026\03.2026\02032026 - - Thong tu 12\26066\MAU_06_26066_fix.xlsx'
wb6 = openpyxl.load_workbook(path_26066_m6, data_only=True)
ws6 = wb6.active
machines_26066 = []
for r in range(2, ws6.max_row+1):
    vals = [c.value for c in ws6[r]]
    if any(vals) and vals[7]: # MA_MAY
        machines_26066.append({
            'stt': vals[0] or len(machines_26066) + 1,
            'tenTb': str(vals[1] or '').strip(),
            'kyHieu': str(vals[2] or '').strip(),
            'congTySx': str(vals[3] or '').strip(),
            'nuocSx': str(vals[4] or '').strip(),
            'namSx': vals[5] or '',
            'namSd': vals[6] or '',
            'maMay': str(vals[7] or '').strip(),
            'soLuuHanh': str(vals[8] or '').strip(),
            'hdTu': str(vals[9] or '').strip() if vals[9] else '',
            'hdDen': str(vals[10] or '').strip() if vals[10] else '',
            'tuNgay': str(vals[11] or '').strip() if vals[11] else '',
            'denNgay': str(vals[12] or '').strip() if vals[12] else '',
            'maCskcb': '26066'
        })
print(f"Loaded {len(machines_26066)} machines for 26066.")

# 2. Load 26066 doctors from FileMau_Bang2_nhanluckcb OK.xlsx
path_26066_m2 = r'J:\Users\Admin\Desktop\2026\03.2026\02032026 - - Thong tu 12\26066\FileMau_Bang2_nhanluckcb OK.xlsx'
wb2 = openpyxl.load_workbook(path_26066_m2, data_only=True)
ws2 = wb2.active
doctors_26066 = []
for r in range(2, ws2.max_row+1):
    vals = [c.value for c in ws2[r]]
    if any(vals) and (vals[3] or vals[8]):
        doctors_26066.append({
            'stt': vals[0] or len(doctors_26066) + 1,
            'maKhoa': str(vals[1] or '').strip(),
            'tenKhoa': str(vals[2] or '').strip(),
            'hoTen': str(vals[3] or '').strip(),
            'gioiTinh': str(vals[4] or '').strip(),
            'soDinhDanh': str(vals[5] or '').strip(),
            'chucDanhNn': str(vals[6] or '').strip(),
            'viTri': str(vals[7] or '').strip(),
            'macchn': str(vals[8] or '').strip(),
            'ngayCapCchn': str(vals[9] or '').strip() if vals[9] else '',
            'noiCapCchn': str(vals[10] or '').strip() if vals[10] else '',
            'phamViCm': str(vals[11] or '').strip() if len(vals) > 11 and vals[11] else '',
            'maCskcb': '26066'
        })
print(f"Loaded {len(doctors_26066)} doctors for 26066.")

# 3. Load 26193 departments from FileMau_Bang1_Bo_phan_chuyen_mon.xlsx
path_26193_m1 = r'J:\Users\Admin\Desktop\2026\03.2026\02032026 - - Thong tu 12\26193\FileMau_Bang1_Bo_phan_chuyen_mon.xlsx'
wb1 = openpyxl.load_workbook(path_26193_m1, data_only=True)
ws1 = wb1.active
depts_26193 = []
for r in range(2, ws1.max_row+1):
    vals = [c.value for c in ws1[r]]
    if any(vals) and vals[1]: # MA_KHOA
        depts_26193.append({
            'stt': vals[0] or len(depts_26193) + 1,
            'maKhoa': str(vals[1] or '').strip(),
            'tenKhoa': str(vals[2] or '').strip(),
            'banKham': str(vals[3] or '').strip(),
            'giuongPd': int(vals[4]) if vals[4] is not None and str(vals[4]).isdigit() else None,
            'giuongTk': int(vals[5]) if vals[5] is not None and str(vals[5]).isdigit() else None,
            'giuongHstc': int(vals[6]) if len(vals) > 6 and vals[6] is not None and str(vals[6]).isdigit() else None,
            'giuongHscc': int(vals[7]) if len(vals) > 7 and vals[7] is not None and str(vals[7]).isdigit() else None,
            'tuNgay': str(vals[8] or '').strip() if len(vals) > 8 and vals[8] else '',
            'denNgay': str(vals[9] or '').strip() if len(vals) > 9 and vals[9] else '',
            'maCskcb': '26193'
        })
print(f"Loaded {len(depts_26193)} depts for 26193.")

# Generate TS content
ts_content = f"""/**
 * Dữ liệu mặc định ban đầu danh mục Thông tư 12 của các cơ sở khám chữa bệnh
 * Tác giả: Nguyễn Sơn Nam (Nsnnam)
 */
import type {{ Tt12UnitData }} from "./tt12-library.ts";

export const DEFAULT_TT12_CATALOGS: Record<string, Tt12UnitData> = {{
  "26066": {{
    unit: {{
      maCskcb: "26066",
      tenCskcb: "Bệnh viện Đa khoa Lạc Việt Phúc Yên",
      capKcb: "co_ban",
      ghiChu: "Cơ sở KCB cấp cơ bản - Phúc Yên, Vĩnh Phúc"
    }},
    bang1: [],
    bang2: {json.dumps(doctors_26066, ensure_ascii=False, indent=6)},
    bang3: [],
    bang4: [],
    bang5: [],
    bang6: {json.dumps(machines_26066, ensure_ascii=False, indent=6)},
    updatedAt: "2026-04-01T08:00:00+07:00"
  }},
  "26193": {{
    unit: {{
      maCskcb: "26193",
      tenCskcb: "Bệnh viện Hữu nghị Lạc Việt",
      capKcb: "co_ban",
      ghiChu: "Cơ sở KCB cấp cơ bản - Vĩnh Yên, Vĩnh Phúc"
    }},
    bang1: {json.dumps(depts_26193, ensure_ascii=False, indent=6)},
    bang2: [],
    bang3: [],
    bang4: [],
    bang5: [],
    bang6: [],
    updatedAt: "2026-04-01T08:00:00+07:00"
  }}
}};
"""

out_ts = r'C:\Users\Admin\Projects\xml3-duration-checker\src\lib\tt12-default-data.ts'
with open(out_ts, 'w', encoding='utf-8') as f:
    f.write(ts_content)

print(f"Generated {out_ts} successfully.")
