import openpyxl
from collections import defaultdict

file_path = r'J:\Users\Admin\Desktop\2026\11.2026\0-Văn bản\20261110 - BHXH - Canh bao\26193_KET_QUA_KT251_KT252.xlsx'

wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
ws = wb['KT251']

header_map = {}
total_rows = 0
total_xuattoan = 0
total_thanhtien = 0
sample_groups = defaultdict(list)
loi_counter = defaultdict(int)

def get_val(row, col_name, default=None):
    idx = header_map.get(col_name)
    if idx is not None and idx < len(row):
        val = row[idx]
        return val if val is not None else default
    return default

for row_idx, row in enumerate(ws.iter_rows(values_only=True)):
    if row_idx == 0:
        header_map = {col_name: idx for idx, col_name in enumerate(row)}
        continue
    
    total_rows += 1
    ma_lk = str(get_val(row, 'MA_LK', ''))
    ma_giuong = str(get_val(row, 'MA_GIUONG', ''))
    ma_khoa = str(get_val(row, 'MA_KHOA', ''))
    thanh_tien = float(get_val(row, 'THANH_TIEN', 0) or 0)
    tien_xt = float(get_val(row, 'T_XUATTOAN_BHTT', 0) or 0)
    loi = str(get_val(row, 'LOI', ''))
    tt_trung = str(get_val(row, 'THONG_TIN_TRUNG', ''))
    so_hs_trung = get_val(row, 'SO_HS_TRUNG')
    mark = get_val(row, 'MARK')
    
    total_thanhtien += thanh_tien
    total_xuattoan += tien_xt
    loi_counter[loi] += 1
    
    # store distinct tt_trung groups
    if len(sample_groups) < 8 and tt_trung not in sample_groups:
        sample_groups[tt_trung] = []
    if tt_trung in sample_groups and len(sample_groups[tt_trung]) < 5:
        sample_groups[tt_trung].append({
            'MA_LK': ma_lk,
            'HO_TEN': get_val(row, 'HO_TEN'),
            'MA_GIUONG': ma_giuong,
            'MA_KHOA': ma_khoa,
            'NGAY_YL': str(get_val(row, 'NGAY_YL')),
            'NGAY_KQ': str(get_val(row, 'NGAY_KQ')),
            'THANH_TIEN': thanh_tien,
            'T_XUATTOAN_BHTT': tien_xt,
            'MARK': mark,
            'SO_HS_TRUNG': so_hs_trung,
            'THONG_TIN_TRUNG': tt_trung,
            'LOI': loi
        })

wb.close()

print(f"Total rows in KT251: {total_rows}")
print(f"Total THANH_TIEN: {total_thanhtien:,.0f} VND")
print(f"Total T_XUATTOAN_BHTT: {total_xuattoan:,.0f} VND")
print("\nLOI distribution:")
for k, v in loi_counter.items():
    print(f"  {k}: {v} rows")

print("\n--- SAMPLE TRUNG GROUPS ---")
for grp, items in sample_groups.items():
    print(f"\nGroup: {grp} (Count: {len(items)})")
    for it in items:
        print(f"  MA_LK: {it['MA_LK']} | BN: {it['HO_TEN']} | Khoa: {it['MA_KHOA']} | Giuong: {it['MA_GIUONG']} | YL: {it['NGAY_YL']} -> KQ: {it['NGAY_KQ']} | TT: {it['THANH_TIEN']:,.0f} | XT: {it['T_XUATTOAN_BHTT']:,.0f} | Mark: {it['MARK']}")
