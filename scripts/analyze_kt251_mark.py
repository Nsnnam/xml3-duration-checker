import openpyxl
from collections import Counter

file_path = r'J:\Users\Admin\Desktop\2026\11.2026\0-Văn bản\20261110 - BHXH - Canh bao\26193_KET_QUA_KT251_KT252.xlsx'

wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
ws = wb['KT251']

header_map = {}
def get_val(row, col_name, default=None):
    idx = header_map.get(col_name)
    if idx is not None and idx < len(row):
        val = row[idx]
        return val if val is not None else default
    return default

mark_counter = Counter()
so_hs_trung_counter = Counter()
mark_vs_xt = Counter()

# Let's inspect the first group with SO_HS_TRUNG > 1
target_group = None
group_details = []

for row_idx, row in enumerate(ws.iter_rows(values_only=True)):
    if row_idx == 0:
        header_map = {col_name: idx for idx, col_name in enumerate(row)}
        continue
    
    mark = get_val(row, 'MARK')
    so_trung = get_val(row, 'SO_HS_TRUNG')
    tien_xt = float(get_val(row, 'T_XUATTOAN_BHTT', 0) or 0)
    tt_trung = str(get_val(row, 'THONG_TIN_TRUNG', ''))
    
    mark_counter[mark] += 1
    so_hs_trung_counter[so_trung] += 1
    mark_vs_xt[(mark, tien_xt > 0)] += 1
    
    if target_group is None and tt_trung and '|' in tt_trung:
        target_group = tt_trung
    if tt_trung == target_group:
        group_details.append({
            'MA_LK': get_val(row, 'MA_LK'),
            'HO_TEN': get_val(row, 'HO_TEN'),
            'MA_GIUONG': get_val(row, 'MA_GIUONG'),
            'NGAY_YL': str(get_val(row, 'NGAY_YL')),
            'NGAY_KQ': str(get_val(row, 'NGAY_KQ')),
            'THANH_TIEN': float(get_val(row, 'THANH_TIEN', 0) or 0),
            'T_XUATTOAN_BHTT': tien_xt,
            'MARK': mark,
            'MARK_LK': get_val(row, 'MARK_LK'),
            'LOI': get_val(row, 'LOI')
        })

wb.close()

print("MARK counter:", mark_counter)
print("SO_HS_TRUNG counter:", so_hs_trung_counter)
print("MARK vs (tien_xt > 0):", mark_vs_xt)

print(f"\nTarget group '{target_group}':")
for r in group_details:
    print(r)
