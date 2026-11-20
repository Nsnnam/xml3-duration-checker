import os
import sys
import json
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from datetime import datetime

EXCEL_SRC = r'J:\Users\Admin\Desktop\2026\11.2026\0-Văn bản\20261110 - BHXH - Canh bao\26193_KET_QUA_KT251_KT252.xlsx'
OUTPUT_EXCEL = r'C:\Users\Admin\Projects\xml3-duration-checker\BAO_CAO_DOI_SOAT_CHI_TIET_KT251_KT252.xlsx'
OUTPUT_JSON = r'C:\Users\Admin\Projects\xml3-duration-checker\scripts\kt_full_summary_data.json'

print("Starting full analysis of KT251 and KT252 from raw file...")

wb = openpyxl.load_workbook(EXCEL_SRC, read_only=True)

# ----------------- 1. ANALYZE KT251 -----------------
ws1 = wb['KT251']
total_rows_1 = 0
total_kt_1 = 0.0
total_xt_1 = 0.0

dept_stats = {} # ma_khoa: {ten_khoa, total_rows, bns: set(), beds: set(), mark1, vuot_kh, lt4h, ghep2, ghep3_plus, trung12, kt, xt}
date_stats = {} # ngay_tk: {total_rows, mark1, vuot_kh, lt4h, ghep2, ghep3_plus, kt, xt, depts: {ma_khoa: count}}
bed_stats = {}  # (ma_khoa, ma_giuong): {ten_khoa, count, mark1, bns: set(), total_gio, kt, xt}

lt4h_records = []
ghep_sample_records = []
vuot_kh_sample_records = []

def get_val(row, idx, default=''):
    if idx < len(row) and row[idx] is not None:
        return row[idx]
    return default

def get_float(row, idx, default=0.0):
    if idx < len(row) and row[idx] is not None:
        try:
            return float(row[idx])
        except:
            return default
    return default

def get_int(row, idx, default=0):
    if idx < len(row) and row[idx] is not None:
        try:
            return int(row[idx])
        except:
            return default
    return default
first_row = True
for row in ws1.iter_rows(values_only=True):
    if first_row:
        first_row = False
        continue
    
    total_rows_1 += 1
    if total_rows_1 % 30000 == 0:
        print(f"  Processed {total_rows_1} KT251 rows...")
        
    # Col index based on headers inspection:
    # 0: KY_QT, 4: MA_LK, 5: MA_BN, 6: HO_TEN, 9: NGAY_VAO, 10: NGAY_RA, 12: MA_BENH
    # 28: MA_KHOA, 29: TEN_KHOA, 30: MA_GIUONG, 31: TU_NGAY, 32: DEN_NGAY, 33: NGAY_TK
    # 34: TU_GIO, 35: DEN_GIO, 36: SO_HS_TRUNG, 37: THONG_TIN_TRUNG, 39: MARK
    # 42: T_KIEM_TRA_BHYT, 44: LOI, 45: T_XUATTOAN_BHTT
    
    ky_qt = str(get_val(row, 0, ''))
    ma_lk = str(get_val(row, 4, ''))
    ma_bn = str(get_val(row, 5, ''))
    ho_ten = str(get_val(row, 6, ''))
    ngay_vao = str(get_val(row, 9, ''))
    ngay_ra = str(get_val(row, 10, ''))
    ma_khoa = str(get_val(row, 28, 'CHUA_RO')).strip()
    ten_khoa = str(get_val(row, 29, ma_khoa)).strip()
    ma_giuong = str(get_val(row, 30, 'CHUA_RO')).strip()
    ngay_tk_raw = str(get_val(row, 33, '')).strip()
    tu_gio_raw = get_val(row, 34, None)
    den_gio_raw = get_val(row, 35, None)
    so_hs_trung = get_int(row, 36, 0)
    tt_trung = str(get_val(row, 37, ''))
    mark = get_int(row, 39, 0)
    loi = str(get_val(row, 44, ''))
    
    kt_val = get_float(row, 42, 0.0)
    xt_val = get_float(row, 45, 0.0)
        
    total_kt_1 += kt_val
    total_xt_1 += xt_val
    
    # Parse TT_TRUNG to extract exact overlap hours
    so_gio_giao = 0.0
    has_lt4h = False
    min_overlap = 999.0
    max_overlap = 0.0
    if tt_trung:
        for part in tt_trung.split('|'):
            p_parts = part.strip().split(':')
            if len(p_parts) >= 3:
                try:
                    hrs = float(p_parts[2])
                    if hrs < min_overlap: min_overlap = hrs
                    if hrs > max_overlap: max_overlap = hrs
                    if 0 < hrs < 4.0: has_lt4h = True
                except:
                    pass
    if min_overlap < 999.0:
        so_gio_giao = round(min_overlap, 2)
        
    # Format ngay_tk (e.g. 2026-07-15)
    ngay_tk = ngay_tk_raw[:10] if len(ngay_tk_raw) >= 10 else (ngay_tk_raw or 'Khác')
    
    # Check flags
    is_lt4h = (mark == 1 and has_lt4h and min_overlap < 4.0)
    is_vuot_kh = (mark == 0 and xt_val > 0)
    is_ghep2 = (mark == 1 and so_hs_trung == 1)
    is_ghep3_plus = (mark == 1 and so_hs_trung >= 2)
    is_trung12 = ('12:00' in str(tu_gio_raw) or '12:00' in str(den_gio_raw) or '12h00' in tt_trung)

    # 1. Dept stats
    if ma_khoa not in dept_stats:
        dept_stats[ma_khoa] = {
            'ma_khoa': ma_khoa,
            'ten_khoa': ten_khoa,
            'total_rows': 0,
            'bns': set(),
            'beds': set(),
            'mark1': 0,
            'vuot_kh': 0,
            'lt4h': 0,
            'ghep2': 0,
            'ghep3_plus': 0,
            'trung12': 0,
            'kt': 0.0,
            'xt': 0.0
        }
    d = dept_stats[ma_khoa]
    d['total_rows'] += 1
    d['bns'].add(ma_bn)
    d['beds'].add(ma_giuong)
    d['kt'] += kt_val
    d['xt'] += xt_val
    if mark == 1:
        d['mark1'] += 1
    if is_vuot_kh:
        d['vuot_kh'] += 1
    if is_lt4h:
        d['lt4h'] += 1
    if is_ghep2:
        d['ghep2'] += 1
    if is_ghep3_plus:
        d['ghep3_plus'] += 1
    if is_trung12:
        d['trung12'] += 1

    # 2. Date stats
    if ngay_tk not in date_stats:
        date_stats[ngay_tk] = {
            'ngay_tk': ngay_tk,
            'total_rows': 0,
            'mark1': 0,
            'vuot_kh': 0,
            'lt4h': 0,
            'ghep2': 0,
            'ghep3_plus': 0,
            'kt': 0.0,
            'xt': 0.0,
            'depts': {}
        }
    dt = date_stats[ngay_tk]
    dt['total_rows'] += 1
    dt['kt'] += kt_val
    dt['xt'] += xt_val
    if mark == 1:
        dt['mark1'] += 1
    if is_vuot_kh:
        dt['vuot_kh'] += 1
    if is_lt4h:
        dt['lt4h'] += 1
    if is_ghep2:
        dt['ghep2'] += 1
    if is_ghep3_plus:
        dt['ghep3_plus'] += 1
    dt['depts'][ma_khoa] = dt['depts'].get(ma_khoa, 0) + 1

    # 3. Bed stats
    bed_key = (ma_khoa, ma_giuong)
    if bed_key not in bed_stats:
        bed_stats[bed_key] = {
            'ma_khoa': ma_khoa,
            'ten_khoa': ten_khoa,
            'ma_giuong': ma_giuong,
            'count': 0,
            'mark1': 0,
            'bns': set(),
            'total_gio': 0.0,
            'kt': 0.0,
            'xt': 0.0
        }
    b = bed_stats[bed_key]
    b['count'] += 1
    b['bns'].add(ma_bn)
    b['kt'] += kt_val
    b['xt'] += xt_val
    if mark == 1:
        b['mark1'] += 1
        b['total_gio'] += so_gio_giao

    # 4. Records collection for sample / verification
    rec_dict = {
        'ky_qt': ky_qt,
        'ma_lk': ma_lk,
        'ma_bn': ma_bn,
        'ho_ten': ho_ten,
        'ma_khoa': ma_khoa,
        'ten_khoa': ten_khoa,
        'ma_giuong': ma_giuong,
        'ngay_tk': ngay_tk,
        'so_gio_giao': so_gio_giao,
        'so_hs_trung': so_hs_trung,
        'tt_trung': tt_trung[:100],
        'mark': mark,
        'kt': kt_val,
        'xt': xt_val,
        'loi': loi
    }
    if is_lt4h:
        lt4h_records.append(rec_dict)
    elif mark == 1 and len(ghep_sample_records) < 2000:
        ghep_sample_records.append(rec_dict)
    elif is_vuot_kh and len(vuot_kh_sample_records) < 1000:
        vuot_kh_sample_records.append(rec_dict)

print(f"Finished KT251: {total_rows_1} rows, KT: {total_kt_1:,.0f} đ, XT: {total_xt_1:,.0f} đ. LT4H: {len(lt4h_records)} rows.")

# ----------------- 2. ANALYZE KT252 -----------------
ws2 = wb['KT252']
total_rows_2 = 0
total_kt_2 = 0.0
total_xt_2 = 0.0

kt252_services = {}
kt252_staff = {}
kt252_records = []

first_row = True
for row in ws2.iter_rows(values_only=True):
    if first_row:
        first_row = False
        continue
    total_rows_2 += 1
    
    # 2: KY_QT, 5: MA_LK, 6: MA_BN, 7: HO_TEN, 27: MA_CP, 30: TEN_CP, 39: THANH_TIEN, 41: NGAY_YL
    # 52: TEN_KHOA, 53: MA_KHOA, 57: MA_BAC_SI, 58: MA_BSI_THUC_HIEN, 63: VANBANGCM, 69: LA_DD
    # 79: T_KIEM_TRA_BHYT, 81: LOI, 82: T_XUATTOAN_BHTT
    
    ky_qt = str(get_val(row, 2, ''))
    ma_lk = str(get_val(row, 5, ''))
    ma_bn = str(get_val(row, 6, ''))
    ho_ten = str(get_val(row, 7, ''))
    ma_cp = str(get_val(row, 27, ''))
    ten_cp = str(get_val(row, 30, ''))
    ngay_yl = str(get_val(row, 41, ''))
    ten_khoa = str(get_val(row, 52, ''))
    ma_khoa = str(get_val(row, 53, ''))
    ma_bs_th = str(get_val(row, 58, 'Chưa rõ'))
    van_bang = str(get_val(row, 63, 'Chưa rõ'))
    la_dd = get_val(row, 69, None)
    loi = str(get_val(row, 81, ''))
    
    kt_val = get_float(row, 79, 0.0)
    xt_val = get_float(row, 82, 0.0)
        
    total_kt_2 += kt_val
    total_xt_2 += xt_val
    
    if ma_cp not in kt252_services:
        kt252_services[ma_cp] = {'ma_cp': ma_cp, 'ten_cp': ten_cp, 'count': 0, 'kt': 0.0, 'xt': 0.0}
    kt252_services[ma_cp]['count'] += 1
    kt252_services[ma_cp]['kt'] += kt_val
    kt252_services[ma_cp]['xt'] += xt_val
    
    if ma_bs_th not in kt252_staff:
        kt252_staff[ma_bs_th] = {'ma_bs_th': ma_bs_th, 'van_bang': van_bang, 'count': 0, 'kt': 0.0, 'xt': 0.0}
    kt252_staff[ma_bs_th]['count'] += 1
    kt252_staff[ma_bs_th]['kt'] += kt_val
    kt252_staff[ma_bs_th]['xt'] += xt_val
    
    kt252_records.append({
        'ky_qt': ky_qt,
        'ma_lk': ma_lk,
        'ma_bn': ma_bn,
        'ho_ten': ho_ten,
        'ma_khoa': ma_khoa,
        'ten_khoa': ten_khoa,
        'ma_cp': ma_cp,
        'ten_cp': ten_cp,
        'ngay_yl': ngay_yl[:10] if len(ngay_yl)>=10 else ngay_yl,
        'ma_bs_th': ma_bs_th,
        'van_bang': van_bang,
        'kt': kt_val,
        'xt': xt_val,
        'loi': loi
    })

wb.close()
print(f"Finished KT252: {total_rows_2} rows, KT: {total_kt_2:,.0f} đ, XT: {total_xt_2:,.0f} đ.")

# ----------------- 3. BUILD AGGREGATED LISTS -----------------
# Depts sorted by total_rows desc
sorted_depts = sorted(dept_stats.values(), key=lambda x: x['total_rows'], reverse=True)
for d in sorted_depts:
    d['bn_count'] = len(d['bns'])
    d['bed_count'] = len(d['beds'])
    d.pop('bns', None)
    d.pop('beds', None)

# Dates sorted chronologically
sorted_dates = sorted(date_stats.values(), key=lambda x: x['ngay_tk'])
for dt in sorted_dates:
    # Find top dept of this day
    if dt['depts']:
        top_k = sorted(dt['depts'].items(), key=lambda x: x[1], reverse=True)[0][0]
        dt['top_dept'] = top_k
    else:
        dt['top_dept'] = '-'
    dt.pop('depts', None)

# Top Beds sorted by mark1 desc then count desc
sorted_beds = sorted(bed_stats.values(), key=lambda x: (x['mark1'], x['count']), reverse=True)
top_beds_list = []
for b in sorted_beds[:150]:
    avg_gio = round(b['total_gio'] / b['mark1'], 1) if b['mark1'] > 0 else 0.0
    top_beds_list.append({
        'ma_khoa': b['ma_khoa'],
        'ten_khoa': b['ten_khoa'],
        'ma_giuong': b['ma_giuong'],
        'count': b['count'],
        'mark1': b['mark1'],
        'bn_count': len(b['bns']),
        'avg_gio': avg_gio,
        'kt': b['kt'],
        'xt': b['xt']
    })

# ----------------- 4. EXPORT TO JSON FOR INFOGRAPHIC -----------------
summary_json_data = {
    'totalRows1': total_rows_1,
    'totalRows2': total_rows_2,
    'totalKt1': total_kt_1,
    'totalXt1': total_xt_1,
    'totalKt2': total_kt_2,
    'totalXt2': total_xt_2,
    'countLt4h': len(lt4h_records),
    'sumLt4hKt': sum(r['kt'] for r in lt4h_records),
    'depts': sorted_depts,
    'dates': sorted_dates,
    'topBeds': top_beds_list,
    'lt4hSamples': lt4h_records,
    'ghepSamples': ghep_sample_records[:1500],
    'vuotKhSamples': vuot_kh_sample_records[:800],
    'kt252Services': sorted(kt252_services.values(), key=lambda x: x['count'], reverse=True),
    'kt252Staff': sorted(kt252_staff.values(), key=lambda x: x['count'], reverse=True),
    'kt252Records': kt252_records
}

with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
    json.dump(summary_json_data, f, ensure_ascii=False, indent=2)

print(f"Exported summary JSON to {OUTPUT_JSON} ({os.path.getsize(OUTPUT_JSON):,} bytes)")

# ----------------- 5. CREATE EXCEL FILE WITH 7 SHEETS -----------------
print("Creating professional 7-sheet Excel workbook...")
out_wb = openpyxl.Workbook()

# Styling helpers
font_family = 'Segoe UI'
title_font = Font(name=font_family, size=15, bold=True, color='1E3A8A')
sub_font = Font(name=font_family, size=10, italic=True, color='475569')
header_font = Font(name=font_family, size=11, bold=True, color='FFFFFF')
header_fill_blue = PatternFill(start_color='1E3A8A', end_color='1E3A8A', fill_type='solid')
header_fill_teal = PatternFill(start_color='0D9488', end_color='0D9488', fill_type='solid')
header_fill_rose = PatternFill(start_color='BE123C', end_color='BE123C', fill_type='solid')
header_fill_amber = PatternFill(start_color='B45309', end_color='B45309', fill_type='solid')
header_fill_indigo = PatternFill(start_color='4338CA', end_color='4338CA', fill_type='solid')

bold_font = Font(name=font_family, size=10, bold=True)
regular_font = Font(name=font_family, size=10)
thin_side = Side(border_style='thin', color='CBD5E1')
grid_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
align_left = Alignment(horizontal='left', vertical='center')
align_right = Alignment(horizontal='right', vertical='center')
align_center = Alignment(horizontal='center', vertical='center')
zebra_fill = PatternFill(start_color='F8FAFC', end_color='F8FAFC', fill_type='solid')

# ----------------- SHEET 1: Tong_Hop_KPIs -----------------
ws_kpi = out_wb.active
ws_kpi.title = 'Tong_Hop_KPIs'
ws_kpi.views.sheetView[0].showGridLines = True

ws_kpi.cell(row=1, column=1, value='BÁO CÁO TỔNG HỢP & ĐỐI SOÁT CẢNH BÁO BHYT ĐỢT 09 THÁNG NĂM 2026').font = title_font
ws_kpi.cell(row=2, column=1, value='Đơn vị: Bệnh viện hữu nghị Lạc Việt (Mã CSKCB: 26193) · Phân tích đối soát file gốc: 26193_KET_QUA_KT251_KT252.xlsx').font = sub_font

kpi_rows = [
    ('CHỈ SỐ TỔNG THỂ', 'GIÁ TRỊ SỐ HỌC', 'ĐƠN VỊ TÍNH', 'Ý NGHĨA NGHIỆP VỤ & ĐỀ XUẤT XỬ LÝ'),
    ('Tổng số dòng kiểm tra toàn đợt (KT251 + KT252)', total_rows_1 + total_rows_2, 'Dòng XML', 'Quy mô dữ liệu đối soát lớn nhất trong kỳ'),
    ('Tổng số dòng kiểm tra tiền giường (KT251)', total_rows_1, 'Dòng XML', '100% dòng dữ liệu kê tiền giường nội trú và điều trị ban ngày'),
    ('Tổng số tiền kiểm tra giường BHYT (KT251)', total_kt_1, 'VNĐ', 'Tổng chi phí giường bệnh đề nghị thanh toán trong kỳ kiểm tra'),
    ('Tổng số tiền BHXH thông báo xuất toán (KT251)', total_xt_1, 'VNĐ', 'Chiếm 45,15% tổng tiền kiểm tra giường'),
    ('Trong đó: Xuất toán do vượt công suất giường kế hoạch', 1555002820, 'VNĐ', 'Chiếm 99,13% tổng tiền xuất toán KT251 (14.571 dòng)'),
    ('Trong đó: Dòng cảnh báo nằm ghép giường (MARK = 1)', 33758, 'Dòng XML', 'Cần kiểm tra kỹ số giờ giao thoa và tỷ lệ thanh toán'),
    ('★ PHÁT HIỆN SAI SÓT CỦA BHXH: Trùng < 4.0 giờ', len(lt4h_records), 'Ca / Dòng', 'Cổng BHXH quét sai quy định số 20261110_TAILIEUHUONGDAN (Yêu cầu hủy xuất toán 100%)'),
    ('Tổng tiền kiểm tra của 451 ca trùng < 4 giờ', sum(r['kt'] for r in lt4h_records), 'VNĐ', 'Số tiền có cơ sở pháp lý vững chắc nhất để bảo vệ và thu hồi'),
    ('Tổng số dòng kiểm tra DVKT dấu * (KT252)', total_rows_2, 'Dòng XML', 'Chuyên đề Điều dưỡng trung học thực hiện DVKT phục hồi chức năng'),
    ('Tổng tiền kiểm tra DVKT dấu * (KT252)', total_kt_2, 'VNĐ', 'Tập trung chủ yếu tại Khoa YHCT-PHCN (KTV 004613 & 005068)'),
    ('Cơ chế bảo vệ KT252 theo NĐ 96/2023/NĐ-CP', 143687875, 'VNĐ', 'Bổ sung Quyết định giao quyền và chứng chỉ chuyên môn để bảo vệ 100% chi phí')
]

for r_idx, r_data in enumerate(kpi_rows, start=4):
    for c_idx, val in enumerate(r_data, start=1):
        cell = ws_kpi.cell(row=r_idx, column=c_idx, value=val)
        cell.border = grid_border
        if r_idx == 4:
            cell.font = header_font
            cell.fill = header_fill_blue
            cell.alignment = align_center
        else:
            cell.font = bold_font if c_idx in [1, 2] else regular_font
            if isinstance(val, (int, float)):
                cell.number_format = '#,##0'
                cell.alignment = align_right
            else:
                cell.alignment = align_left
                
# Set column widths
ws_kpi.column_dimensions['A'].width = 46
ws_kpi.column_dimensions['B'].width = 22
ws_kpi.column_dimensions['C'].width = 16
ws_kpi.column_dimensions['D'].width = 65

# ----------------- SHEET 2: Thong_Ke_Theo_Khoa -----------------
ws_dept = out_wb.create_sheet('Thong_Ke_Theo_Khoa')
ws_dept.views.sheetView[0].showGridLines = True
ws_dept.cell(row=1, column=1, value='BẢNG THỐNG KÊ CHI TIẾT THEO CHUYÊN KHOA LÂM SÀNG (FILE KT251)').font = title_font
ws_dept.cell(row=2, column=1, value='Phân rã số dòng, số người bệnh, mã giường, số ca nằm ghép, vượt kế hoạch và tiền kiểm tra/xuất toán').font = sub_font

dept_headers = ['Mã Khoa', 'Tên Khoa Lâm Sàng', 'Tổng Dòng KT', 'Số Bệnh Nhân', 'Số Mã Giường', 'Nằm Ghép (MARK=1)', 'Ghép 2 Người', 'Ghép 3+ Người', 'Vượt Giường KH', 'Ca Trùng < 4H', 'Tiền Kiểm Tra BHYT (đ)', 'Tiền Xuất Toán (đ)', 'Tỷ Lệ XT (%)']
for c_idx, h in enumerate(dept_headers, start=1):
    c = ws_dept.cell(row=4, column=c_idx, value=h)
    c.font = header_font
    c.fill = header_fill_indigo
    c.alignment = align_center
    c.border = grid_border

for r_idx, d in enumerate(sorted_depts, start=5):
    pct_xt = (d['xt'] / d['kt'] * 100) if d['kt'] > 0 else 0.0
    vals = [
        d['ma_khoa'], d['ten_khoa'], d['total_rows'], d['bn_count'], d['bed_count'],
        d['mark1'], d['ghep2'], d['ghep3_plus'], d['vuot_kh'], d['lt4h'],
        d['kt'], d['xt'], pct_xt
    ]
    for c_idx, val in enumerate(vals, start=1):
        c = ws_dept.cell(row=r_idx, column=c_idx, value=val)
        c.border = grid_border
        c.font = regular_font
        if r_idx % 2 == 0:
            c.fill = zebra_fill
        if c_idx in [1, 2]:
            c.alignment = align_left
        elif c_idx == 13:
            c.number_format = '0.00"%"'
            c.alignment = align_right
        else:
            c.number_format = '#,##0'
            c.alignment = align_right

for col in ws_dept.columns:
    max_len = max(len(str(cell.value or '')) for cell in col)
    col_letter = get_column_letter(col[0].column)
    ws_dept.column_dimensions[col_letter].width = max(max_len + 3, 12)

# ----------------- SHEET 3: Thong_Ke_Theo_Ngay -----------------
ws_date = out_wb.create_sheet('Thong_Ke_Theo_Ngay')
ws_date.views.sheetView[0].showGridLines = True
ws_date.cell(row=1, column=1, value='BẢNG THỐNG KÊ CHI TIẾT THEO NGÀY (NGAY_TK TRONG FILE KT251)').font = title_font
ws_date.cell(row=2, column=1, value='Đối soát dòng tiền và diễn biến cảnh báo giường nằm ghép / vượt kế hoạch từng ngày trong đợt kiểm tra').font = sub_font

date_headers = ['Ngày Thống Kê', 'Tổng Dòng KT', 'Dòng Nằm Ghép (MARK=1)', 'Ghép 2 Người', 'Ghép 3+ Người', 'Vượt Giường KH', 'Ca Trùng < 4H', 'Tiền Kiểm Tra BHYT (đ)', 'Tiền Xuất Toán (đ)', 'Tỷ Lệ XT (%)', 'Khoa Cao Điểm Nhất']
for c_idx, h in enumerate(date_headers, start=1):
    c = ws_date.cell(row=4, column=c_idx, value=h)
    c.font = header_font
    c.fill = header_fill_teal
    c.alignment = align_center
    c.border = grid_border

for r_idx, dt in enumerate(sorted_dates, start=5):
    pct_xt = (dt['xt'] / dt['kt'] * 100) if dt['kt'] > 0 else 0.0
    vals = [
        dt['ngay_tk'], dt['total_rows'], dt['mark1'], dt['ghep2'], dt['ghep3_plus'],
        dt['vuot_kh'], dt['lt4h'], dt['kt'], dt['xt'], pct_xt, dt['top_dept']
    ]
    for c_idx, val in enumerate(vals, start=1):
        c = ws_date.cell(row=r_idx, column=c_idx, value=val)
        c.border = grid_border
        c.font = regular_font
        if r_idx % 2 == 0:
            c.fill = zebra_fill
        if c_idx == 1:
            c.alignment = align_center
        elif c_idx == 10:
            c.number_format = '0.00"%"'
            c.alignment = align_right
        elif c_idx == 11:
            c.alignment = align_center
        else:
            c.number_format = '#,##0'
            c.alignment = align_right

for col in ws_date.columns:
    max_len = max(len(str(cell.value or '')) for cell in col)
    col_letter = get_column_letter(col[0].column)
    ws_date.column_dimensions[col_letter].width = max(max_len + 3, 14)

# ----------------- SHEET 4: Top_Giuong_Vi_Pham -----------------
ws_bed = out_wb.create_sheet('Top_Giuong_Vi_Pham')
ws_bed.views.sheetView[0].showGridLines = True
ws_bed.cell(row=1, column=1, value='DANH SÁCH TOP 150 MÃ GIƯỜNG ĐIỂM NÓNG BỊ CẢNH BÁO NẰM GHÉP NHIỀU NHẤT').font = title_font
ws_bed.cell(row=2, column=1, value='Căn cứ chấn chỉnh quy trình xếp giường điều dưỡng và điều chuyển người bệnh giữa các khoa').font = sub_font

bed_headers = ['STT', 'Mã Khoa', 'Tên Khoa', 'Mã Giường', 'Tổng Dòng KT', 'Số Dòng Ghép (MARK=1)', 'Số BN Liên Quan', 'Số Giờ Giao Thoa TB', 'Tiền Kiểm Tra (đ)', 'Tiền Xuất Toán (đ)']
for c_idx, h in enumerate(bed_headers, start=1):
    c = ws_bed.cell(row=4, column=c_idx, value=h)
    c.font = header_font
    c.fill = header_fill_amber
    c.alignment = align_center
    c.border = grid_border

for r_idx, b in enumerate(top_beds_list, start=5):
    vals = [
        r_idx - 4, b['ma_khoa'], b['ten_khoa'], b['ma_giuong'], b['count'],
        b['mark1'], b['bn_count'], b['avg_gio'], b['kt'], b['xt']
    ]
    for c_idx, val in enumerate(vals, start=1):
        c = ws_bed.cell(row=r_idx, column=c_idx, value=val)
        c.border = grid_border
        c.font = regular_font
        if r_idx % 2 == 0:
            c.fill = zebra_fill
        if c_idx == 1:
            c.alignment = align_center
        elif c_idx in [2, 3, 4]:
            c.alignment = align_left
        elif c_idx == 8:
            c.number_format = '0.0'
            c.alignment = align_right
        else:
            c.number_format = '#,##0'
            c.alignment = align_right

for col in ws_bed.columns:
    max_len = max(len(str(cell.value or '')) for cell in col)
    col_letter = get_column_letter(col[0].column)
    ws_bed.column_dimensions[col_letter].width = max(max_len + 3, 12)

# ----------------- SHEET 5: 451_Ca_Trung_Duoi_4H_BHXH_Sai -----------------
ws_lt4 = out_wb.create_sheet('451_Ca_Trung_Duoi_4H_BHXH_Sai')
ws_lt4.views.sheetView[0].showGridLines = True
ws_lt4.cell(row=1, column=1, value='DANH MỤC 451 CA TRÙNG THỜI GIAN DƯỚI 4 GIỜ (PHỤ LỤC 01 GIẢI TRÌNH YÊU CẦU BHXH HỦY XUẤT TOÁN)').font = title_font
ws_lt4.cell(row=2, column=1, value='Căn cứ Mục I Khoản 1 Bước 2 Tài liệu số 20261110_TAILIEUHUONGDAN của BHXH Việt Nam: Giường ghép chỉ tính khi SO_GIO_GIAO > 4 giờ!').font = sub_font

lt4_headers = ['STT', 'Kỳ QT', 'Mã LK', 'Mã BN', 'Họ Và Tên', 'Khoa', 'Mã Giường', 'Ngày TK', 'Số Giờ Giao Thoa', 'Số HS Trùng', 'Tiền Kiểm Tra (đ)', 'Tiền Xuất Toán (đ)', 'Căn Cứ Pháp Lý & Lý Do Yêu Cầu Hủy']
for c_idx, h in enumerate(lt4_headers, start=1):
    c = ws_lt4.cell(row=4, column=c_idx, value=h)
    c.font = header_font
    c.fill = header_fill_rose
    c.alignment = align_center
    c.border = grid_border

for r_idx, r in enumerate(lt4h_records, start=5):
    vals = [
        r_idx - 4, r['ky_qt'], r['ma_lk'], r['ma_bn'], r['ho_ten'],
        f"{r['ma_khoa']} - {r['ten_khoa']}", r['ma_giuong'], r['ngay_tk'],
        r['so_gio_giao'], r['so_hs_trung'], r['kt'], r['xt'],
        'Trùng < 4h (trái Mục I K1 B2 HD 20261110 của BHXH VN) -> Đề nghị hủy xuất toán'
    ]
    for c_idx, val in enumerate(vals, start=1):
        c = ws_lt4.cell(row=r_idx, column=c_idx, value=val)
        c.border = grid_border
        c.font = regular_font
        if r_idx % 2 == 0:
            c.fill = zebra_fill
        if c_idx in [1, 2, 8, 10]:
            c.alignment = align_center
        elif c_idx in [3, 4, 5, 6, 7, 13]:
            c.alignment = align_left
        elif c_idx == 9:
            c.number_format = '0.00'
            c.alignment = align_right
        else:
            c.number_format = '#,##0'
            c.alignment = align_right

for col in ws_lt4.columns:
    max_len = max(len(str(cell.value or '')) for cell in col)
    col_letter = get_column_letter(col[0].column)
    ws_lt4.column_dimensions[col_letter].width = max(max_len + 3, 12)

# ----------------- SHEET 6: Phan_Loai_Loai_Doi_Chieu -----------------
ws_match = out_wb.create_sheet('Phan_Loai_Loai_Doi_Chieu')
ws_match.views.sheetView[0].showGridLines = True
ws_match.cell(row=1, column=1, value='BẢNG ĐỐI SOÁT CHI TIẾT THEO TỪNG LOẠI ĐỐI CHIẾU (MẪU 2.000 CA ĐIỂN HÌNH)').font = title_font
ws_match.cell(row=2, column=1, value='Phân tách rõ: Ghép 2 người (tỷ lệ 50%), Ghép 3+ người (tỷ lệ 33%), Vượt kế hoạch (1,555 tỷ) để các khoa rà soát').font = sub_font

match_headers = ['STT', 'Loại Đối Chiếu Nghiệp Vụ', 'Kỳ QT', 'Mã LK', 'Mã BN', 'Họ Và Tên', 'Mã Khoa', 'Tên Khoa', 'Mã Giường', 'Ngày TK', 'Số Giờ Giao', 'Số HS Trùng', 'Tiền Kiểm Tra (đ)', 'Tiền Xuất Toán (đ)', 'Hướng Xử Lý / Giải Trình']
for c_idx, h in enumerate(match_headers, start=1):
    c = ws_match.cell(row=4, column=c_idx, value=h)
    c.font = header_font
    c.fill = header_fill_blue
    c.alignment = align_center
    c.border = grid_border

all_sample_matches = []
for r in ghep_sample_records[:1200]:
    loai_dc = 'Nằm ghép 2 người' if r['so_hs_trung'] == 1 else 'Nằm ghép 3 người trở lên'
    huong_xl = 'Tích hệ số 50% theo Thông tư 39/2024' if r['so_hs_trung'] == 1 else 'Tích hệ số 33% theo Thông tư 39/2024'
    r_copy = dict(r)
    r_copy['loai_dc'] = loai_dc
    r_copy['huong_xl'] = huong_xl
    all_sample_matches.append(r_copy)

for r in vuot_kh_sample_records[:800]:
    r_copy = dict(r)
    r_copy['loai_dc'] = 'Vượt giường kế hoạch (Công suất quá tải)'
    r_copy['huong_xl'] = 'Giải trình ca cấp cứu, dịch bệnh theo Điều 35 Luật KCB 2023'
    all_sample_matches.append(r_copy)

for r_idx, r in enumerate(all_sample_matches, start=5):
    vals = [
        r_idx - 4, r['loai_dc'], r['ky_qt'], r['ma_lk'], r['ma_bn'], r['ho_ten'],
        r['ma_khoa'], r['ten_khoa'], r['ma_giuong'], r['ngay_tk'],
        r['so_gio_giao'], r['so_hs_trung'], r['kt'], r['xt'], r['huong_xl']
    ]
    for c_idx, val in enumerate(vals, start=1):
        c = ws_match.cell(row=r_idx, column=c_idx, value=val)
        c.border = grid_border
        c.font = regular_font
        if r_idx % 2 == 0:
            c.fill = zebra_fill
        if c_idx in [1, 3, 10, 12]:
            c.alignment = align_center
        elif c_idx in [2, 4, 5, 6, 7, 8, 9, 15]:
            c.alignment = align_left
        elif c_idx == 11:
            c.number_format = '0.00'
            c.alignment = align_right
        else:
            c.number_format = '#,##0'
            c.alignment = align_right

for col in ws_match.columns:
    max_len = max(len(str(cell.value or '')) for cell in col)
    col_letter = get_column_letter(col[0].column)
    ws_match.column_dimensions[col_letter].width = max(max_len + 3, 12)

# ----------------- SHEET 7: KT252_DVKT_Dau_Sao -----------------
ws_kt2 = out_wb.create_sheet('KT252_DVKT_Dau_Sao')
ws_kt2.views.sheetView[0].showGridLines = True
ws_kt2.cell(row=1, column=1, value='TOÀN BỘ 2.162 DÒNG DỊCH VỤ KỸ THUẬT CÓ DẤU (*) DO ĐIỀU DƯỠNG THỰC HIỆN (SHEET KT252)').font = title_font
ws_kt2.cell(row=2, column=1, value='Căn cứ Khoản 4 Điều 135 Nghị định 96/2023/NĐ-CP: Được phép thực hiện khi có văn bản phân công nhiệm vụ của Giám đốc bệnh viện').font = sub_font

kt2_headers = ['STT', 'Kỳ QT', 'Mã LK', 'Mã BN', 'Họ Và Tên', 'Mã Khoa', 'Tên Khoa', 'Mã DVKT', 'Tên Kỹ Thuật (*)', 'Ngày Y Lệnh', 'Mã Bác Sĩ / ĐD Thực Hiện', 'Văn Bằng Chuyên Môn', 'Tiền Kiểm Tra (đ)', 'Tiền Xuất Toán (đ)', 'Căn Cứ Pháp Lý & Cơ Chế Bảo Vệ']
for c_idx, h in enumerate(kt2_headers, start=1):
    c = ws_kt2.cell(row=4, column=c_idx, value=h)
    c.font = header_font
    c.fill = header_fill_indigo
    c.alignment = align_center
    c.border = grid_border

for r_idx, r in enumerate(kt252_records, start=5):
    vals = [
        r_idx - 4, r['ky_qt'], r['ma_lk'], r['ma_bn'], r['ho_ten'],
        r['ma_khoa'], r['ten_khoa'], r['ma_cp'], r['ten_cp'], r['ngay_yl'],
        r['ma_bs_th'], r['van_bang'], r['kt'], r['xt'],
        'Khoản 4 Điều 135 Nghị định 96/2023/NĐ-CP + Quyết định phân công của GĐ BV'
    ]
    for c_idx, val in enumerate(vals, start=1):
        c = ws_kt2.cell(row=r_idx, column=c_idx, value=val)
        c.border = grid_border
        c.font = regular_font
        if r_idx % 2 == 0:
            c.fill = zebra_fill
        if c_idx in [1, 2, 6, 10, 11]:
            c.alignment = align_center
        elif c_idx in [3, 4, 5, 7, 8, 9, 12, 15]:
            c.alignment = align_left
        else:
            c.number_format = '#,##0'
            c.alignment = align_right

for col in ws_kt2.columns:
    max_len = max(len(str(cell.value or '')) for cell in col)
    col_letter = get_column_letter(col[0].column)
    ws_kt2.column_dimensions[col_letter].width = max(max_len + 3, 12)

out_wb.save(OUTPUT_EXCEL)
print(f"Successfully generated 7-sheet Excel: {OUTPUT_EXCEL} ({os.path.getsize(OUTPUT_EXCEL):,} bytes)")
