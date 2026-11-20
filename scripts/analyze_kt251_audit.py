import openpyxl
from collections import defaultdict

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

total_kiem_tra_bhyt = 0
total_xuattoan_bhtt = 0
trung_kiem_tra_bhyt = 0
trung_xuattoan_bhtt = 0

rows_trung = 0
rows_trung_with_kiemtra = 0
rows_trung_with_xuattoan = 0

# Check overlap duration in THONG_TIN_TRUNG
duration_under_4h = 0
duration_4h_to_24h = 0

for row_idx, row in enumerate(ws.iter_rows(values_only=True)):
    if row_idx == 0:
        header_map = {col_name: idx for idx, col_name in enumerate(row)}
        continue
    
    t_kt = float(get_val(row, 'T_KIEM_TRA_BHYT', 0) or 0)
    t_xt = float(get_val(row, 'T_XUATTOAN_BHTT', 0) or 0)
    so_trung = get_val(row, 'SO_HS_TRUNG')
    tt_trung = str(get_val(row, 'THONG_TIN_TRUNG', ''))
    
    total_kiem_tra_bhyt += t_kt
    total_xuattoan_bhtt += t_xt
    
    if so_trung and int(so_trung) >= 1:
        rows_trung += 1
        trung_kiem_tra_bhyt += t_kt
        trung_xuattoan_bhtt += t_xt
        if t_kt > 0:
            rows_trung_with_kiemtra += 1
        if t_xt > 0:
            rows_trung_with_xuattoan += 1
            
        # parse hours in tt_trung (e.g. 2962410365:16891105614:15.97)
        if tt_trung:
            for part in tt_trung.split('|'):
                subparts = part.strip().split(':')
                if len(subparts) == 3:
                    try:
                        h = float(subparts[2])
                        if h < 4.0:
                            duration_under_4h += 1
                        else:
                            duration_4h_to_24h += 1
                    except:
                        pass

wb.close()

print(f"Total T_KIEM_TRA_BHYT: {total_kiem_tra_bhyt:,.0f} VND")
print(f"Total T_XUATTOAN_BHTT: {total_xuattoan_bhtt:,.0f} VND")
print(f"Rows with SO_HS_TRUNG >= 1: {rows_trung}")
print(f"  Trung with T_KIEM_TRA_BHYT > 0: {rows_trung_with_kiemtra} (Sum: {trung_kiem_tra_bhyt:,.0f} VND)")
print(f"  Trung with T_XUATTOAN_BHTT > 0: {rows_trung_with_xuattoan} (Sum: {trung_xuattoan_bhtt:,.0f} VND)")
print(f"Overlaps < 4h: {duration_under_4h}")
print(f"Overlaps >= 4h: {duration_4h_to_24h}")
