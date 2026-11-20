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

xt_rows = []
xt_by_loi = defaultdict(lambda: {'count': 0, 'tien_xt': 0, 'thanhtien': 0})
trung_giuong_rows = []

for row_idx, row in enumerate(ws.iter_rows(values_only=True)):
    if row_idx == 0:
        header_map = {col_name: idx for idx, col_name in enumerate(row)}
        continue
    
    tien_xt = float(get_val(row, 'T_XUATTOAN_BHTT', 0) or 0)
    thanh_tien = float(get_val(row, 'THANH_TIEN', 0) or 0)
    loi = str(get_val(row, 'LOI', ''))
    mark = get_val(row, 'MARK')
    so_hs_trung = get_val(row, 'SO_HS_TRUNG')
    tt_trung = str(get_val(row, 'THONG_TIN_TRUNG', ''))
    
    if tien_xt > 0:
        xt_by_loi[loi]['count'] += 1
        xt_by_loi[loi]['tien_xt'] += tien_xt
        xt_by_loi[loi]['thanhtien'] += thanh_tien
        if len(xt_rows) < 10:
            xt_rows.append({
                'MA_LK': get_val(row, 'MA_LK'),
                'HO_TEN': get_val(row, 'HO_TEN'),
                'MA_KHOA': get_val(row, 'MA_KHOA'),
                'MA_GIUONG': get_val(row, 'MA_GIUONG'),
                'NGAY_YL': str(get_val(row, 'NGAY_YL')),
                'NGAY_KQ': str(get_val(row, 'NGAY_KQ')),
                'THANH_TIEN': thanh_tien,
                'T_XUATTOAN_BHTT': tien_xt,
                'MARK': mark,
                'SO_HS_TRUNG': so_hs_trung,
                'THONG_TIN_TRUNG': tt_trung,
                'LOI': loi
            })
            
    # Check rows that have SO_HS_TRUNG > 1 or MARK == 1 or MARK == 2
    if so_hs_trung and int(so_hs_trung) > 1:
        if len(trung_giuong_rows) < 15:
            trung_giuong_rows.append({
                'MA_LK': get_val(row, 'MA_LK'),
                'HO_TEN': get_val(row, 'HO_TEN'),
                'MA_KHOA': get_val(row, 'MA_KHOA'),
                'MA_GIUONG': get_val(row, 'MA_GIUONG'),
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

print("=== T_XUATTOAN_BHTT BY LOI ===")
for k, v in xt_by_loi.items():
    print(f"Lỗi: '{k}' -> {v['count']} dòng | Tiền XT: {v['tien_xt']:,.0f} VND | Thành tiền: {v['thanhtien']:,.0f} VND")

print("\n=== SAMPLE ROWS WITH T_XUATTOAN_BHTT > 0 ===")
for r in xt_rows:
    print(f"LK: {r['MA_LK']} | {r['HO_TEN']} | Khoa: {r['MA_KHOA']} | G: {r['MA_GIUONG']} | {r['NGAY_YL']} -> {r['NGAY_KQ']} | TT: {r['THANH_TIEN']:,.0f} | XT: {r['T_XUATTOAN_BHTT']:,.0f} | Mark: {r['MARK']} | Trùng: {r['SO_HS_TRUNG']} | Lỗi: {r['LOI']}")

print("\n=== SAMPLE ROWS WITH SO_HS_TRUNG > 1 ===")
for r in trung_giuong_rows:
    print(f"LK: {r['MA_LK']} | {r['HO_TEN']} | Khoa: {r['MA_KHOA']} | G: {r['MA_GIUONG']} | {r['NGAY_YL']} -> {r['NGAY_KQ']} | TT: {r['THANH_TIEN']:,.0f} | XT: {r['T_XUATTOAN_BHTT']:,.0f} | Mark: {r['MARK']} | Trùng: {r['SO_HS_TRUNG']} | TT_TRUNG: {r['THONG_TIN_TRUNG'][:50]}")
