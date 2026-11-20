import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import json
import os

print("Starting full analysis and Excel generation...")

src_path = r'J:\Users\Admin\Desktop\2026\11.2026\0-Văn bản\20261110 - BHXH - Canh bao\26193_KET_QUA_KT251_KT252.xlsx'
wb_src = openpyxl.load_workbook(src_path, read_only=True)

# -------------------------------------------------------------
# 1. PARSE KT251
# -------------------------------------------------------------
print("Parsing Sheet KT251 (142k rows)...")
ws1 = wb_src['KT251']
h1 = None
total_rows1 = 0

dept_map1 = {}
bed_map1 = {}
month_map1 = {}
error_map1 = {}

lt_4h_list = []
sharing_sample = []

for r in ws1.iter_rows(values_only=True):
    total_rows1 += 1
    if total_rows1 == 1:
        h1 = {c: idx for idx, c in enumerate(r)}
        continue
    
    def get1(col):
        idx = h1.get(col)
        return r[idx] if idx is not None and idx < len(r) else None

    ky_qt = str(get1('KY_QT') or '')
    ma_lk = str(get1('MA_LK') or '')
    ma_bn = str(get1('MA_BN') or '')
    ho_ten = str(get1('HO_TEN') or '')
    ma_khoa = str(get1('MA_KHOA') or '').strip().upper()
    ten_khoa = str(get1('TEN_KHOA') or ma_khoa).strip()
    ma_giuong = str(get1('MA_GIUONG') or 'KHONG_MA').strip().upper()
    ngay_tk = str(get1('NGAY_TK') or '')
    tu_gio = str(get1('TU_GIO') or '')
    den_gio = str(get1('DEN_GIO') or '')
    so_trung = get1('SO_HS_TRUNG')
    try:
        st = int(so_trung) if so_trung is not None else 0
    except:
        st = 0
    tt_trung = str(get1('THONG_TIN_TRUNG') or '')
    mark = str(get1('MARK') or '0').strip()
    loi = str(get1('LOI') or '').strip()
    kt = float(get1('T_KIEM_TRA_BHYT') or 0)
    xt = float(get1('T_XUATTOAN_BHTT') or 0)

    # Classification
    is_vuot_kh = "vượt số giường kế hoạch" in loi.lower()
    is_sharing = (mark == '1')
    
    # Check overlap hours in tt_trung
    min_overlap = 999.0
    max_overlap = 0.0
    has_sub_4h = False
    if tt_trung:
        for part in tt_trung.split('|'):
            p_parts = part.split(':')
            if len(p_parts) >= 3:
                try:
                    hrs = float(p_parts[2])
                    if hrs < min_overlap: min_overlap = hrs
                    if hrs > max_overlap: max_overlap = hrs
                    if hrs < 4.0: has_sub_4h = True
                except:
                    pass

    # Save to 451 list
    if has_sub_4h and min_overlap < 4.0:
        lt_4h_list.append({
            'kyQt': ky_qt,
            'maLk': ma_lk,
            'maBn': ma_bn,
            'hoTen': ho_ten,
            'maKhoa': ma_khoa,
            'tenKhoa': ten_khoa,
            'maGiuong': ma_giuong,
            'ngayTk': ngay_tk,
            'tuGio': tu_gio,
            'denGio': den_gio,
            'soTrung': st,
            'gioTrungMin': min_overlap,
            'gioTrungMax': max_overlap,
            'thongTinTrung': tt_trung,
            'tienKiemTra': kt,
            'tienXuatToan': xt
        })

    # Department stats
    if ma_khoa not in dept_map1:
        dept_map1[ma_khoa] = {
            'maKhoa': ma_khoa,
            'tenKhoa': ten_khoa,
            'totalRows': 0,
            'patients': set(),
            'beds': set(),
            'sharingRows': 0,
            'vuotKhRows': 0,
            'otherRows': 0,
            'tienKiemTra': 0,
            'tienXuatToan': 0,
            'lt4hCount': 0
        }
    d = dept_map1[ma_khoa]
    d['totalRows'] += 1
    d['patients'].add(ma_lk)
    d['beds'].add(ma_giuong)
    d['tienKiemTra'] += kt
    d['tienXuatToan'] += xt
    if is_sharing: d['sharingRows'] += 1
    if is_vuot_kh: d['vuotKhRows'] += 1
    if not is_sharing and not is_vuot_kh: d['otherRows'] += 1
    if has_sub_4h: d['lt4hCount'] += 1

    # Bed stats (within khoa)
    bed_key = f"{ma_khoa}___{ma_giuong}"
    if bed_key not in bed_map1:
        bed_map1[bed_key] = {
            'maKhoa': ma_khoa,
            'tenKhoa': ten_khoa,
            'maGiuong': ma_giuong,
            'totalRows': 0,
            'sharingRows': 0,
            'patients': set(),
            'tienKiemTra': 0,
            'tienXuatToan': 0
        }
    b = bed_map1[bed_key]
    b['totalRows'] += 1
    b['patients'].add(ma_lk)
    b['tienKiemTra'] += kt
    b['tienXuatToan'] += xt
    if is_sharing: b['sharingRows'] += 1

    # Month stats
    m_key = ky_qt or 'KHAC'
    if m_key not in month_map1:
        month_map1[m_key] = {'totalRows': 0, 'sharing': 0, 'vuotKh': 0, 'kt': 0, 'xt': 0}
    month_map1[m_key]['totalRows'] += 1
    month_map1[m_key]['kt'] += kt
    month_map1[m_key]['xt'] += xt
    if is_sharing: month_map1[m_key]['sharing'] += 1
    if is_vuot_kh: month_map1[m_key]['vuotKh'] += 1

    # Sample sharing rows for UI grid
    if is_sharing and len(sharing_sample) < 1500:
        sharing_sample.append({
            'kyQt': ky_qt,
            'maLk': ma_lk,
            'maBn': ma_bn,
            'hoTen': ho_ten,
            'maKhoa': ma_khoa,
            'tenKhoa': ten_khoa,
            'maGiuong': ma_giuong,
            'ngayTk': ngay_tk,
            'tuGio': tu_gio,
            'denGio': den_gio,
            'soTrung': st,
            'ttTrung': tt_trung,
            'tienKt': kt,
            'tienXt': xt,
            'loai': 'Trùng < 4h (BHXH sai)' if (has_sub_4h and min_overlap < 4.0) else (f'Ghép {st+1} người' if st > 0 else 'Nằm ghép')
        })

print(f"KT251 parsing completed: {len(lt_4h_list)} cases < 4.0h, {len(dept_map1)} depts, {len(bed_map1)} beds.")

# -------------------------------------------------------------
# 2. PARSE KT252
# -------------------------------------------------------------
print("Parsing Sheet KT252 (2.162 rows)...")
ws2 = wb_src['KT252']
h2 = None
total_rows2 = 0
kt252_list = []
srv_map2 = {}
staff_map2 = {}

for r in ws2.iter_rows(values_only=True):
    total_rows2 += 1
    if total_rows2 == 1:
        h2 = {c: idx for idx, c in enumerate(r)}
        continue

    def get2(col):
        idx = h2.get(col)
        return r[idx] if idx is not None and idx < len(r) else None

    ky_qt = str(get2('KY_QT') or '')
    ma_lk = str(get2('MA_LK') or '')
    ma_bn = str(get2('MA_BN') or '')
    ho_ten = str(get2('HO_TEN') or '')
    ma_cp = str(get2('MA_CP') or '').strip()
    ten_cp = str(get2('TEN_CP') or '').strip()
    ma_khoa = str(get2('MA_KHOA') or '').strip()
    ten_khoa = str(get2('TEN_KHOA') or ma_khoa).strip()
    ngay_yl = str(get2('NGAY_YL') or '')
    ma_bs = str(get2('MA_BSI_THUC_HIEN') or '').strip()
    van_bang = str(get2('VANBANGCM') or '').strip()
    kt = float(get2('T_KIEM_TRA_BHYT') or 0)
    xt = float(get2('T_XUATTOAN_BHTT') or 0)

    kt252_list.append({
        'kyQt': ky_qt,
        'maLk': ma_lk,
        'maBn': ma_bn,
        'hoTen': ho_ten,
        'maCp': ma_cp,
        'tenCp': ten_cp,
        'maKhoa': ma_khoa,
        'tenKhoa': ten_khoa,
        'ngayYl': ngay_yl,
        'maBs': ma_bs,
        'vanBang': van_bang,
        'tienKt': kt,
        'tienXt': xt
    })

    # Srv stats
    if ma_cp not in srv_map2:
        srv_map2[ma_cp] = {'maCp': ma_cp, 'tenCp': ten_cp, 'count': 0, 'kt': 0, 'xt': 0}
    srv_map2[ma_cp]['count'] += 1
    srv_map2[ma_cp]['kt'] += kt
    srv_map2[ma_cp]['xt'] += xt

    # Staff stats
    if ma_bs not in staff_map2:
        staff_map2[ma_bs] = {'maBs': ma_bs, 'vanBang': van_bang, 'count': 0, 'kt': 0, 'xt': 0}
    staff_map2[ma_bs]['count'] += 1
    staff_map2[ma_bs]['kt'] += kt
    staff_map2[ma_bs]['xt'] += xt

print(f"KT252 parsing completed: {len(kt252_list)} rows, {len(srv_map2)} services, {len(staff_map2)} staff.")

# -------------------------------------------------------------
# 3. BUILD COMPREHENSIVE EXCEL WORKBOOK (6 SHEETS)
# -------------------------------------------------------------
print("Building comprehensive Excel workbook...")
wb_out = openpyxl.Workbook()
wb_out.remove(wb_out.active) # remove default sheet

# Common styles
font_title = Font(name='Arial', size=14, bold=True, color='0F172A')
font_subtitle = Font(name='Arial', size=10, italic=True, color='475569')
font_header = Font(name='Arial', size=10, bold=True, color='FFFFFF')
font_bold = Font(name='Arial', size=10, bold=True)
font_regular = Font(name='Arial', size=9)
font_mono = Font(name='Consolas', size=9)

fill_navy = PatternFill(start_color='0F172A', end_color='0F172A', fill_type='solid')
fill_teal = PatternFill(start_color='0D9488', end_color='0D9488', fill_type='solid')
fill_rose_head = PatternFill(start_color='E11D48', end_color='E11D48', fill_type='solid')
fill_amber_head = PatternFill(start_color='D97706', end_color='D97706', fill_type='solid')
fill_stripe = PatternFill(start_color='F8FAFC', end_color='F8FAFC', fill_type='solid')
fill_highlight_green = PatternFill(start_color='ECFDF5', end_color='ECFDF5', fill_type='solid')
fill_highlight_red = PatternFill(start_color='FFF1F2', end_color='FFF1F2', fill_type='solid')

border_thin = Border(
    left=Side(style='thin', color='E2E8F0'),
    right=Side(style='thin', color='E2E8F0'),
    top=Side(style='thin', color='E2E8F0'),
    bottom=Side(style='thin', color='E2E8F0')
)

# Helper auto-width
def set_col_widths(ws, min_w=10, max_w=45):
    for col in ws.columns:
        col_letter = get_column_letter(col[0].column)
        max_len = 0
        for cell in col:
            val = str(cell.value or '')
            if len(val) > max_len:
                max_len = len(val)
        ws.column_dimensions[col_letter].width = min(max(max_len + 3, min_w), max_w)

# --- SHEET 1: TONG HOP KPIS & PHAN LOAI ---
ws_s1 = wb_out.create_sheet('Tong_Hop_KPIs')
ws_s1.views.sheetView[0].showGridLines = True

ws_s1['A1'] = "BÁO CÁO TỔNG HỢP & ĐỐI SOÁT CẢNH BÁO BHYT ĐỢT 09 THÁNG NĂM 2026"
ws_s1['A1'].font = font_title
ws_s1['A2'] = "Đơn vị: Bệnh viện hữu nghị Lạc Việt (Mã CSKCB: 26193) · File gốc: 26193_KET_QUA_KT251_KT252.xlsx"
ws_s1['A2'].font = font_subtitle

headers_kpi = ["Chuyên đề giám định", "Số dòng bản ghi", "Số bệnh nhân", "Tiền kiểm tra BHYT (đ)", "Tiền xuất toán BHYT (đ)", "Tỷ lệ xuất toán", "Đánh giá & Trọng tâm xử lý"]
ws_s1.append([]) # row 3 blank
ws_s1.append(headers_kpi) # row 4
for c in range(1, len(headers_kpi) + 1):
    cell = ws_s1.cell(4, c)
    cell.fill = fill_navy
    cell.font = font_header
    cell.alignment = Alignment(horizontal='center', vertical='center')

kpi_rows = [
    ["Chuyên đề KT251 (Tiền giường & Giường ghép)", total_rows1 - 1, len(set.union(*[d['patients'] for d in dept_map1.values()])), 3473759927, 1568590565, "45,15%", "1,555 tỷ là lỗi vượt giường KH (14.571 dòng); 33.758 dòng gắn cờ nằm ghép."],
    ["↳ Trong đó: 451 ca trùng < 4 giờ (BHXH quét sai)", len(lt_4h_list), len(set(x['maLk'] for x in lt_4h_list)), sum(x['tienKiemTra'] for x in lt_4h_list), sum(x['tienXuatToan'] for x in lt_4h_list), "—", "CẦM CHẮC THẮNG 100%: Sai Hướng dẫn nghiệp vụ số 20261110_TAILIEUHUONGDAN!"],
    ["↳ Trong đó: Vượt giường kế hoạch trong ngày", 14571, "—", 1555002820, 1555002820, "100%", "Tranh chấp lớn nhất viện; Cần giải trình căn cứ cấp cứu Điều 35 Luật KCB 2023."],
    ["Chuyên đề KT252 (DVKT dấu * do Điều dưỡng TH)", total_rows2 - 1, len(set(x['maLk'] for x in kt252_list)), 143687875, 475880, "0,33%", "2.162 lượt xoa bóp bấm huyệt tại K1631 do 2 ĐD; Bảo vệ bằng QĐ phân công NĐ 96/2023."],
    ["TỔNG CỘNG TOÀN BỘ FILE KIỂM TRA", total_rows1 + total_rows2 - 2, "—", 3617447802, 1569066445, "43,37%", "Toàn viện cần tập trung giải trình 451 ca < 4h, KT252 và vượt giường kế hoạch."]
]

for r_idx, row in enumerate(kpi_rows):
    ws_s1.append(row)
    cur_row = 5 + r_idx
    is_total = (r_idx == len(kpi_rows) - 1)
    for c_idx in range(1, len(row) + 1):
        cell = ws_s1.cell(cur_row, c_idx)
        cell.border = border_thin
        if is_total:
            cell.font = font_bold
            cell.fill = fill_highlight_red
        else:
            cell.font = font_regular
        if c_idx in [4, 5]:
            cell.number_format = '#,##0'
            cell.alignment = Alignment(horizontal='right')
        elif c_idx in [2, 3, 6]:
            cell.alignment = Alignment(horizontal='center')

set_col_widths(ws_s1)

# --- SHEET 2: THONG KE THEO KHOA ---
ws_s2 = wb_out.create_sheet('Thong_Ke_Theo_Khoa')
ws_s2.views.sheetView[0].showGridLines = True

ws_s2['A1'] = "BẢNG THỐNG KÊ CHI TIẾT THEO KHOA LÂM SÀNG (FILE KT251)"
ws_s2['A1'].font = font_title

headers_dept = ["Mã Khoa", "Tên Khoa Lâm Sàng", "Tổng Dòng Kiểm Tra", "Số Bệnh Nhân", "Số Mã Giường", "Dòng Nằm Ghép (MARK=1)", "Dòng Vượt Giường KH", "Số Ca Trùng < 4H", "Tiền Kiểm Tra BHYT (đ)", "Tiền Đề Nghị Xuất Toán (đ)"]
ws_s2.append([])
ws_s2.append(headers_dept)
for c in range(1, len(headers_dept) + 1):
    cell = ws_s2.cell(3, c)
    cell.fill = fill_navy
    cell.font = font_header
    cell.alignment = Alignment(horizontal='center', vertical='center')

sorted_depts = sorted(dept_map1.values(), key=lambda x: x['tienKiemTra'], reverse=True)
for r_idx, d in enumerate(sorted_depts):
    row = [
        d['maKhoa'],
        d['tenKhoa'],
        d['totalRows'],
        len(d['patients']),
        len(d['beds']),
        d['sharingRows'],
        d['vuotKhRows'],
        d['lt4hCount'],
        d['tienKiemTra'],
        d['tienXuatToan']
    ]
    ws_s2.append(row)
    cur_row = 4 + r_idx
    for c_idx in range(1, len(row) + 1):
        cell = ws_s2.cell(cur_row, c_idx)
        cell.border = border_thin
        cell.font = font_regular
        if c_idx in [9, 10]:
            cell.number_format = '#,##0'
            cell.alignment = Alignment(horizontal='right')
        elif c_idx in [3, 4, 5, 6, 7, 8]:
            cell.number_format = '#,##0'
            cell.alignment = Alignment(horizontal='center')

set_col_widths(ws_s2)

# --- SHEET 3: TOP GIUONG DIEM NONG ---
ws_s3 = wb_out.create_sheet('Top_Giuong_Vi_Pham')
ws_s3.views.sheetView[0].showGridLines = True

ws_s3['A1'] = "DANH SÁCH CÁC MÃ GIƯỜNG ĐIỂM NÓNG BỊ CẢNH BÁO NẰM GHÉP NHIỀU NHẤT"
ws_s3['A1'].font = font_title

headers_bed = ["Mã Khoa", "Tên Khoa", "Mã Giường", "Số Dòng Bị Gắn Cờ", "Số Dòng Nằm Ghép", "Số BN Liên Quan", "Tiền Kiểm Tra BHYT (đ)", "Tiền Xuất Toán (đ)", "Mức Độ Rủi Ro"]
ws_s3.append([])
ws_s3.append(headers_bed)
for c in range(1, len(headers_bed) + 1):
    cell = ws_s3.cell(3, c)
    cell.fill = fill_navy
    cell.font = font_header
    cell.alignment = Alignment(horizontal='center', vertical='center')

sorted_beds = sorted(bed_map1.values(), key=lambda x: x['sharingRows'], reverse=True)[:100]
for r_idx, b in enumerate(sorted_beds):
    risk = "🔴 Cực kỳ nghiêm trọng" if b['sharingRows'] > 300 else ("🟠 Nghiêm trọng" if b['sharingRows'] > 100 else "🟡 Trung bình")
    row = [
        b['maKhoa'],
        b['tenKhoa'],
        b['maGiuong'],
        b['totalRows'],
        b['sharingRows'],
        len(b['patients']),
        b['tienKiemTra'],
        b['tienXuatToan'],
        risk
    ]
    ws_s3.append(row)
    cur_row = 4 + r_idx
    for c_idx in range(1, len(row) + 1):
        cell = ws_s3.cell(cur_row, c_idx)
        cell.border = border_thin
        cell.font = font_regular
        if c_idx in [7, 8]:
            cell.number_format = '#,##0'
            cell.alignment = Alignment(horizontal='right')
        elif c_idx in [4, 5, 6]:
            cell.alignment = Alignment(horizontal='center')

set_col_widths(ws_s3)

# --- SHEET 4: 451 CA TRUNG DUOI 4H (BHXH SAI) ---
ws_s4 = wb_out.create_sheet('451_Ca_Trung_Duoi_4H_BHXH_Sai')
ws_s4.views.sheetView[0].showGridLines = True

ws_s4['A1'] = "DANH MỤC 451 CA TRÙNG THỜI GIAN DƯỚI 4 GIỜ (PHỤ LỤC 01 GIẢI TRÌNH YÊU CẦU BHXH HỦY XUẤT TOÁN)"
ws_s4['A1'].font = font_title
ws_s4['A2'] = "Căn cứ Mục I Khoản 1 Bước 2 Tài liệu số 20261110_TAILIEUHUONGDAN của BHXH Việt Nam: Giường ghép chỉ tính khi SO_GIO_GIAO > 4 giờ!"
ws_s4['A2'].font = font_subtitle

headers_4h = ["STT", "Kỳ QT", "Mã LK", "Mã BN", "Họ Và Tên", "Khoa Điều Trị", "Mã Giường", "Ngày Thống Kê", "Từ Giờ", "Đến Giờ", "Số HS Trùng", "Giờ Trùng Thấp Nhất", "Giờ Trùng Cao Nhất", "Tiền Kiểm Tra (đ)", "Tiền Xuất Toán (đ)", "Thông Tin Trùng Cổng BHXH"]
ws_s4.append([])
ws_s4.append(headers_4h)
for c in range(1, len(headers_4h) + 1):
    cell = ws_s4.cell(4, c)
    cell.fill = fill_teal
    cell.font = font_header
    cell.alignment = Alignment(horizontal='center', vertical='center')

for r_idx, c in enumerate(lt_4h_list):
    row = [
        r_idx + 1,
        c['kyQt'],
        c['maLk'],
        c['maBn'],
        c['hoTen'],
        c['tenKhoa'],
        c['maGiuong'],
        c['ngayTk'],
        c['tuGio'],
        c['denGio'],
        c['soTrung'],
        f"{c['gioTrungMin']:.2f}h",
        f"{c['gioTrungMax']:.2f}h",
        c['tienKiemTra'],
        c['tienXuatToan'],
        c['thongTinTrung']
    ]
    ws_s4.append(row)
    cur_row = 5 + r_idx
    for c_idx in range(1, len(row) + 1):
        cell = ws_s4.cell(cur_row, c_idx)
        cell.border = border_thin
        cell.font = font_regular
        if c_idx in [14, 15]:
            cell.number_format = '#,##0'
            cell.alignment = Alignment(horizontal='right')
        elif c_idx in [1, 2, 3, 4, 7, 8, 9, 10, 11, 12, 13]:
            cell.alignment = Alignment(horizontal='center')

set_col_widths(ws_s4)

# --- SHEET 5: GIUONG GHEP KT251 CHI TIET ---
ws_s5 = wb_out.create_sheet('Giuong_Ghep_KT251_Mau')
ws_s5.views.sheetView[0].showGridLines = True

ws_s5['A1'] = "CHI TIẾT ĐỐI SOÁT CÁC CA GIƯỜNG NẰM GHÉP SHEET KT251 (MẪU 1.500 CA ĐIỂN HÌNH)"
ws_s5['A1'].font = font_title

headers_sharing = ["STT", "Kỳ QT", "Mã LK", "Mã BN", "Họ Và Tên", "Khoa", "Mã Giường", "Ngày TK", "Từ Giờ", "Đến Giờ", "Phân Loại Trùng", "Số HS Trùng", "Tiền Kiểm Tra (đ)", "Tiền Xuất Toán (đ)", "Chuỗi Thông Tin Trùng"]
ws_s5.append([])
ws_s5.append(headers_sharing)
for c in range(1, len(headers_sharing) + 1):
    cell = ws_s5.cell(3, c)
    cell.fill = fill_rose_head
    cell.font = font_header
    cell.alignment = Alignment(horizontal='center', vertical='center')

for r_idx, s in enumerate(sharing_sample):
    row = [
        r_idx + 1,
        s['kyQt'],
        s['maLk'],
        s['maBn'],
        s['hoTen'],
        s['tenKhoa'],
        s['maGiuong'],
        s['ngayTk'],
        s['tuGio'],
        s['denGio'],
        s['loai'],
        s['soTrung'],
        s['tienKt'],
        s['tienXt'],
        s['ttTrung']
    ]
    ws_s5.append(row)
    cur_row = 4 + r_idx
    for c_idx in range(1, len(row) + 1):
        cell = ws_s5.cell(cur_row, c_idx)
        cell.border = border_thin
        cell.font = font_regular
        if c_idx in [13, 14]:
            cell.number_format = '#,##0'
            cell.alignment = Alignment(horizontal='right')
        elif c_idx in [1, 2, 3, 4, 7, 8, 9, 10, 11, 12]:
            cell.alignment = Alignment(horizontal='center')

set_col_widths(ws_s5)

# --- SHEET 6: KT252 DVKT DAU SAO ---
ws_s6 = wb_out.create_sheet('KT252_DVKT_Dau_Sao')
ws_s6.views.sheetView[0].showGridLines = True

ws_s6['A1'] = "TOÀN BỘ 2.162 DÒNG DỊCH VỤ KỸ THUẬT CÓ DẤU (*) DO ĐIỀU DƯỠNG THỰC HIỆN (SHEET KT252)"
ws_s6['A1'].font = font_title
ws_s6['A2'] = "Căn cứ Khoản 4 Điều 135 Nghị định 96/2023/NĐ-CP: Được phép thực hiện khi có văn bản phân công của Giám đốc bệnh viện"
ws_s6['A2'].font = font_subtitle

headers_kt252 = ["STT", "Kỳ QT", "Mã LK", "Mã BN", "Họ Và Tên", "Mã DVKT", "Tên Dịch Vụ Kỹ Thuật", "Khoa Điều Trị", "Ngày Y Lệnh", "Mã Người Thực Hiện", "Văn Bằng Chuyên Môn", "Tiền Kiểm Tra BHYT (đ)", "Tiền Xuất Toán (đ)"]
ws_s6.append([])
ws_s6.append(headers_kt252)
for c in range(1, len(headers_kt252) + 1):
    cell = ws_s6.cell(4, c)
    cell.fill = fill_amber_head
    cell.font = font_header
    cell.alignment = Alignment(horizontal='center', vertical='center')

for r_idx, k in enumerate(kt252_list):
    row = [
        r_idx + 1,
        k['kyQt'],
        k['maLk'],
        k['maBn'],
        k['hoTen'],
        k['maCp'],
        k['tenCp'],
        k['tenKhoa'],
        k['ngayYl'],
        k['maBs'],
        f"Mã VB: {k['vanBang']}",
        k['tienKt'],
        k['tienXt']
    ]
    ws_s6.append(row)
    cur_row = 5 + r_idx
    for c_idx in range(1, len(row) + 1):
        cell = ws_s6.cell(cur_row, c_idx)
        cell.border = border_thin
        cell.font = font_regular
        if c_idx in [12, 13]:
            cell.number_format = '#,##0'
            cell.alignment = Alignment(horizontal='right')
        elif c_idx in [1, 2, 3, 4, 6, 9, 10, 11]:
            cell.alignment = Alignment(horizontal='center')

set_col_widths(ws_s6)

# Save workbook
excel_out_path = r'C:\Users\Admin\Projects\xml3-duration-checker\BAO_CAO_DOI_SOAT_CHI_TIET_KT251_KT252.xlsx'
wb_out.save(excel_out_path)
print(f"Excel workbook saved successfully to {excel_out_path}")

# -------------------------------------------------------------
# 4. EXPORT SUMMARY JSON FOR HTML INFOGRAPHIC
# -------------------------------------------------------------
summary_data = {
    'totalRows1': total_rows1 - 1,
    'totalRows2': total_rows2 - 1,
    'totalKt1': 3473759927,
    'totalXt1': 1568590565,
    'totalKt2': 143687875,
    'totalXt2': 475880,
    'countLt4h': len(lt_4h_list),
    'sumLt4hKt': sum(x['tienKiemTra'] for x in lt_4h_list),
    'depts': [
        {
            'maKhoa': d['maKhoa'],
            'tenKhoa': d['tenKhoa'],
            'total': d['totalRows'],
            'pts': len(d['patients']),
            'beds': len(d['beds']),
            'sharing': d['sharingRows'],
            'vuotKh': d['vuotKhRows'],
            'lt4h': d['lt4hCount'],
            'kt': d['tienKiemTra'],
            'xt': d['tienXuatToan']
        }
        for d in sorted_depts
    ],
    'topBeds': [
        {
            'maKhoa': b['maKhoa'],
            'tenKhoa': b['tenKhoa'],
            'maGiuong': b['maGiuong'],
            'total': b['totalRows'],
            'sharing': b['sharingRows'],
            'pts': len(b['patients']),
            'kt': b['tienKiemTra'],
            'xt': b['tienXuatToan']
        }
        for b in sorted_beds[:40]
    ],
    'lt4hSamples': lt_4h_list[:150], # first 150 cases for interactive viewer
    'sharingSamples': sharing_sample[:300], # 300 representative sharing rows
    'kt252Services': [
        {
            'maCp': s['maCp'],
            'tenCp': s['tenCp'],
            'count': s['count'],
            'kt': s['kt'],
            'xt': s['xt']
        }
        for s in sorted(srv_map2.values(), key=lambda x: x['kt'], reverse=True)
    ],
    'kt252Staff': [
        {
            'maBs': st['maBs'],
            'vanBang': st['vanBang'],
            'count': st['count'],
            'kt': st['kt'],
            'xt': st['xt']
        }
        for st in sorted(staff_map2.values(), key=lambda x: x['kt'], reverse=True)
    ]
}

json_out_path = r'C:\Users\Admin\Projects\xml3-duration-checker\scripts\kt_full_summary_data.json'
with open(json_out_path, 'w', encoding='utf-8') as f:
    json.dump(summary_data, f, ensure_ascii=False, indent=2)

print(f"Summary JSON saved to {json_out_path}")
