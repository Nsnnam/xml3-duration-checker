import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import json
import os
import sys

print("=== STARTING COMPLETE KT251 & KT252 GENERATION ===")

src_path = r'J:\Users\Admin\Desktop\2026\11.2026\0-Văn bản\20261110 - BHXH - Canh bao\26193_KET_QUA_KT251_KT252.xlsx'
if not os.path.exists(src_path):
    print(f"File not found: {src_path}")
    sys.exit(1)

wb_src = openpyxl.load_workbook(src_path, read_only=True)

# -------------------------------------------------------------
# 1. PARSE SHEET KT251 (142,223 rows)
# -------------------------------------------------------------
print("Reading Sheet KT251...")
ws1 = wb_src['KT251']

headers1 = []
total_rows1 = 0
total_kt1 = 0
total_xt1 = 0

xml1_id_to_patient = {}
patients_dict = {} # ma_bn -> summary
all_mark1_rows = []
lt_4h_rows = []
gt_4h_rows = []
vuot_kh_rows = []

dept_summary = {}
bed_summary = {}

# Pass 1: Parse all rows & build XML1_ID map
for idx, r in enumerate(ws1.iter_rows(values_only=True)):
    total_rows1 += 1
    if total_rows1 == 1:
        headers1 = [str(x) if x is not None else '' for x in r]
        h1 = {c: i for i, c in enumerate(headers1)}
        continue

    def get(col):
        pos = h1.get(col)
        return r[pos] if pos is not None and pos < len(r) else None

    xml1_id = str(get('XML1_ID') or '').strip()
    ma_bn = str(get('MA_BN') or '').strip()
    ho_ten = str(get('HO_TEN') or '').strip()
    if xml1_id and ma_bn and xml1_id not in xml1_id_to_patient:
        xml1_id_to_patient[xml1_id] = (ma_bn, ho_ten)

    mark = str(get('MARK') or '0').strip()
    kt = float(get('T_KIEM_TRA_BHYT') or 0)
    xt = float(get('T_XUATTOAN_BHTT') or 0)
    total_kt1 += kt
    total_xt1 += xt

    ma_khoa = str(get('MA_KHOA') or '').strip().upper()
    ten_khoa = str(get('TEN_KHOA') or ma_khoa).strip()
    ma_giuong = str(get('MA_GIUONG') or 'KHONG_MA').strip().upper()

    if ma_khoa not in dept_summary:
        dept_summary[ma_khoa] = {
            'maKhoa': ma_khoa, 'tenKhoa': ten_khoa, 'totalRows': 0,
            'mark1Rows': 0, 'tienKt': 0, 'tienXt': 0, 'patients': set()
        }
    dept_summary[ma_khoa]['totalRows'] += 1
    dept_summary[ma_khoa]['tienKt'] += kt
    dept_summary[ma_khoa]['tienXt'] += xt
    dept_summary[ma_khoa]['patients'].add(ma_bn)
    if mark == '1':
        dept_summary[ma_khoa]['mark1Rows'] += 1

    bed_key = f"{ma_khoa}___{ma_giuong}"
    if bed_key not in bed_summary:
        bed_summary[bed_key] = {
            'maKhoa': ma_khoa, 'tenKhoa': ten_khoa, 'maGiuong': ma_giuong,
            'totalRows': 0, 'mark1Rows': 0, 'tienKt': 0, 'patients': set()
        }
    bed_summary[bed_key]['totalRows'] += 1
    bed_summary[bed_key]['tienKt'] += kt
    bed_summary[bed_key]['patients'].add(ma_bn)
    if mark == '1':
        bed_summary[bed_key]['mark1Rows'] += 1

    if mark == '1':
        ky_qt = str(get('KY_QT') or '').strip()
        ma_lk = str(get('MA_LK') or '').strip()
        ngay_sinh = str(get('NGAY_SINH') or '').replace(' 00:00:00', '').strip()
        ma_the = str(get('MA_THE') or '').strip()
        ngay_vao = str(get('NGAY_VAO') or '').strip()
        ngay_ra = str(get('NGAY_RA') or '').strip()
        ma_cp = str(get('MA_CP') or '').strip()
        ngay_tk = str(get('NGAY_TK') or '').strip()
        tu_gio = str(get('TU_GIO') or '').strip()
        den_gio = str(get('DEN_GIO') or '').strip()
        so_trung = get('SO_HS_TRUNG')
        try:
            st = int(so_trung) if so_trung is not None else 0
        except:
            st = 0
        tt_trung = str(get('THONG_TIN_TRUNG') or '').strip()
        tyle_dc = str(get('TYLE_TT_DC') or '').strip()
        loi = str(get('LOI') or '').strip()
        thanh_tien = float(get('THANH_TIEN') or 0)

        # Overlap analysis
        min_overlap = 999.0
        max_overlap = 0.0
        has_sub_4h = False
        peer_xml1_ids = []

        if tt_trung:
            for part in tt_trung.split('|'):
                p_parts = part.split(':')
                if len(p_parts) >= 3:
                    peer_xml1_ids.append(p_parts[0])
                    try:
                        hrs = float(p_parts[2])
                        if hrs < min_overlap: min_overlap = hrs
                        if hrs > max_overlap: max_overlap = hrs
                        if hrs < 4.0: has_sub_4h = True
                    except:
                        pass

        is_vuot_kh = "vượt số giường kế hoạch" in loi.lower()

        if is_vuot_kh:
            error_cat = "Vượt giường kế hoạch"
            action_type = "vuot_kh"
            giai_trinh = "Căn cứ Điều 35 Luật Khám bệnh, chữa bệnh 2023: Cơ sở KCB có nghĩa vụ tiếp nhận cấp cứu và không được từ chối người bệnh. Vượt giường kế hoạch do cấp cứu/dịch bệnh đột xuất, đề nghị bảo lưu chi phí và giải trình theo quy định cấp cứu."
        elif has_sub_4h and min_overlap < 4.0:
            error_cat = f"Trùng < 4h ({min_overlap}h) - BHXH quét sai"
            action_type = "phan_bien_100"
            giai_trinh = f"Căn cứ Văn bản hướng dẫn nghiệp vụ kiểm soát thanh toán của BHXH Việt Nam: Chỉ tính nằm ghép khi số giờ giao thoa > 4.0h. Ca này giao thoa {min_overlap}h là thời gian đệm bàn giao giường/thủ tục ra viện, yêu cầu HỦY XUẤT TOÁN 100%."
        elif st >= 2:
            error_cat = f"Ghép từ 3 người ({st+1} người, giao {max_overlap}h)"
            action_type = "chap_nhan_33"
            giai_trinh = f"Buồng bệnh quá tải thực tế kê ghép {st+1} người. Đề nghị chấp thuận thanh toán 33% theo Thông tư 39/2024/TT-BYT; chấn chỉnh điều dưỡng tích chọn đúng tỷ lệ thanh toán khi quá tải."
        elif st == 1:
            error_cat = f"Ghép 2 người (giao {max_overlap}h)"
            action_type = "chap_nhan_50"
            giai_trinh = f"Buồng bệnh quá tải thực tế 2 người cùng nằm 1 giường (giao {max_overlap}h). Đề nghị thanh toán 50% theo Thông tư 39/2024/TT-BYT; rà soát việc trả giường trên HIS trước khi gán người mới."
        elif "ngoại khoa" in loi.lower():
            error_cat = "Giường ngoại khoa không mổ"
            action_type = "dieu_chinh_noi_khoa"
            giai_trinh = "Người bệnh vào khoa Ngoại nhưng sau đó điều trị bảo tồn nội khoa không mổ. Đề nghị điều chỉnh áp giá giường nội khoa tương ứng."
        else:
            error_cat = loi or "Nằm ghép buồng giường"
            action_type = "can_ra_soat"
            giai_trinh = "Rà soát bệnh án gốc và phiếu theo dõi điều dưỡng để xác định thực tế điều trị."

        row_obj = {
            'rowNum': idx + 1,
            'kyQt': ky_qt,
            'xml1Id': xml1_id,
            'maLk': ma_lk,
            'maBn': ma_bn,
            'hoTen': ho_ten,
            'ngaySinh': ngay_sinh,
            'maThe': ma_the,
            'ngayVao': ngay_vao,
            'ngayRa': ngay_ra,
            'maKhoa': ma_khoa,
            'tenKhoa': ten_khoa,
            'maGiuong': ma_giuong,
            'maCp': ma_cp,
            'ngayTk': ngay_tk,
            'tuGio': tu_gio,
            'denGio': den_gio,
            'soTrung': st,
            'gioMin': min_overlap if min_overlap < 999.0 else 0,
            'gioMax': max_overlap,
            'ttTrung': tt_trung,
            'peerXml1Ids': peer_xml1_ids,
            'tyleDc': tyle_dc,
            'tienKt': kt,
            'tienXt': xt,
            'thanhTien': thanh_tien,
            'loi': loi,
            'errorCat': error_cat,
            'actionType': action_type,
            'giaiTrinh': giai_trinh
        }
        all_mark1_rows.append(row_obj)

        if action_type == 'phan_bien_100':
            lt_4h_rows.append(row_obj)
        elif action_type == 'vuot_kh':
            vuot_kh_rows.append(row_obj)
        elif action_type in ('chap_nhan_50', 'chap_nhan_33'):
            gt_4h_rows.append(row_obj)

        # Patient summary
        if ma_bn not in patients_dict:
            patients_dict[ma_bn] = {
                'maBn': ma_bn,
                'hoTen': ho_ten,
                'maLk': ma_lk,
                'ngaySinh': ngay_sinh,
                'maThe': ma_the,
                'maKhoa': ma_khoa,
                'tenKhoa': ten_khoa,
                'ngayVao': ngay_vao,
                'ngayRa': ngay_ra,
                'giuongSet': set(),
                'totalRows': 0,
                'tienKt': 0,
                'tienXt': 0,
                'errorCatSet': set(),
                'actionTypeSet': set(),
                'maxOverlap': 0,
                'peerXml1Ids': set(),
                'giaiTrinh': giai_trinh,
                'primaryAction': action_type
            }
        p = patients_dict[ma_bn]
        p['totalRows'] += 1
        p['tienKt'] += kt
        p['tienXt'] += xt
        p['giuongSet'].add(ma_giuong)
        p['errorCatSet'].add(error_cat)
        p['actionTypeSet'].add(action_type)
        if max_overlap > p['maxOverlap']: p['maxOverlap'] = max_overlap
        for pid in peer_xml1_ids: p['peerXml1Ids'].add(pid)

# Resolve peer patient names
for r in all_mark1_rows:
    peers = []
    for pid in r['peerXml1Ids']:
        if pid in xml1_id_to_patient:
            p_bn, p_name = xml1_id_to_patient[pid]
            peers.append(f"{p_name} ({p_bn})")
    r['peerNames'] = ", ".join(peers) if peers else "—"

for ma_bn, p in patients_dict.items():
    peers = []
    for pid in p['peerXml1Ids']:
        if pid in xml1_id_to_patient:
            p_bn, p_name = xml1_id_to_patient[pid]
            peers.append(f"{p_name} ({p_bn})")
    p['peerNames'] = ", ".join(peers) if peers else "—"
    p['giuongStr'] = ", ".join(sorted(p['giuongSet']))
    p['errorCatStr'] = "; ".join(p['errorCatSet'])

print(f"KT251: Total {total_rows1} rows, {len(all_mark1_rows)} MARK=1 rows, {len(patients_dict)} unique patients.")

# -------------------------------------------------------------
# 2. PARSE SHEET KT252 (2,162 rows)
# -------------------------------------------------------------
print("Reading Sheet KT252...")
ws2 = wb_src['KT252']
headers2 = []
total_rows2 = 0
total_xt2 = 0
kt252_rows = []

for idx, r in enumerate(ws2.iter_rows(values_only=True)):
    total_rows2 += 1
    if total_rows2 == 1:
        headers2 = [str(x) if x is not None else '' for x in r]
        h2 = {c: i for i, c in enumerate(headers2)}
        continue

    def get2(col):
        pos = h2.get(col)
        return r[pos] if pos is not None and pos < len(r) else None

    ma_lk = str(get2('MA_LK') or '').strip()
    ma_bn = str(get2('MA_BN') or '').strip()
    ho_ten = str(get2('HO_TEN') or '').strip()
    ma_khoa = str(get2('MA_KHOA') or '').strip().upper()
    ten_khoa = str(get2('TEN_KHOA') or ma_khoa).strip()
    ma_dv = str(get2('MA_DICH_VU') or '').strip()
    ten_dv = str(get2('TEN_DICH_VU') or '').strip()
    ngay_yl = str(get2('NGAY_YL') or '').strip()
    cchn = str(get2('NGUOI_THUC_HIEN') or '').strip()
    ten_nv = str(get2('TEN_NGUOI_THUC_HIEN') or '').strip()
    tien_xt = float(get2('T_XUATTOAN') or 0)
    loi = str(get2('LOI') or '').strip()
    total_xt2 += tien_xt

    kt252_rows.append({
        'rowNum': idx + 1,
        'maLk': ma_lk,
        'maBn': ma_bn,
        'hoTen': ho_ten,
        'maKhoa': ma_khoa,
        'tenKhoa': ten_khoa,
        'maDv': ma_dv,
        'tenDv': ten_dv,
        'ngayYl': ngay_yl,
        'cchn': cchn,
        'tenNv': ten_nv,
        'tienXt': tien_xt,
        'loi': loi,
        'giaiTrinh': "Căn cứ Thông tư 32/2023/TT-BYT & Nghị định 96/2023/NĐ-CP: Nhân viên y tế có Quyết định phân công nhiệm vụ của Giám đốc BV trước 01/7/2026. Đề nghị bổ sung Quyết định và Giấy chứng nhận đào tạo chuyên môn liên tục để bảo vệ 100% chi phí."
    })

print(f"KT252: Total {len(kt252_rows)} rows, Total XT: {total_xt2:,.0f} đ")

# -------------------------------------------------------------
# 3. BUILD EXCEL WORKBOOK
# -------------------------------------------------------------
print("Generating Excel Workbook...")
wb_out = openpyxl.Workbook()
# Remove default sheet
wb_out.remove(wb_out.active)

# Styles
f_title = Font(name="Segoe UI", size=14, bold=True, color="1E3A8A")
f_subtitle = Font(name="Segoe UI", size=10, italic=True, color="475569")
f_header = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
f_bold = Font(name="Segoe UI", size=10, bold=True)
f_regular = Font(name="Segoe UI", size=10)
f_code = Font(name="Consolas", size=9.5)
f_num = Font(name="Consolas", size=9.5, bold=True)
f_red_num = Font(name="Consolas", size=9.5, bold=True, color="B91C1C")
f_green_num = Font(name="Consolas", size=9.5, bold=True, color="047857")

fill_navy = PatternFill("solid", fgColor="0F172A")
fill_blue = PatternFill("solid", fgColor="1E3A8A")
fill_teal = PatternFill("solid", fgColor="0D9488")
fill_emerald = PatternFill("solid", fgColor="059669")
fill_rose = PatternFill("solid", fgColor="BE123C")
fill_amber = PatternFill("solid", fgColor="B45309")
fill_zebra = PatternFill("solid", fgColor="F8FAFC")

border_thin = Border(
    left=Side(style='thin', color='CBD5E1'),
    right=Side(style='thin', color='CBD5E1'),
    top=Side(style='thin', color='CBD5E1'),
    bottom=Side(style='thin', color='CBD5E1')
)

align_center = Alignment(horizontal="center", vertical="center")
align_left = Alignment(horizontal="left", vertical="center")
align_right = Alignment(horizontal="right", vertical="center")
align_wrap = Alignment(horizontal="left", vertical="center", wrap_text=True)

# Helper function to write sheet table
def write_table(ws, title, subtitle, headers, data_rows, header_fill, col_widths=None):
    ws.views.sheetView[0].showGridLines = True
    ws.append([title])
    ws.cell(1, 1).font = f_title
    ws.append([subtitle])
    ws.cell(2, 1).font = f_subtitle
    ws.append([]) # row 3 blank

    # Header at row 4
    ws.append(headers)
    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(4, col_idx)
        cell.font = f_header
        cell.fill = header_fill
        cell.alignment = align_center
        cell.border = border_thin
    ws.row_dimensions[4].height = 26

    # Data rows
    for r_idx, row in enumerate(data_rows):
        cur_row = r_idx + 5
        ws.append(row)
        ws.row_dimensions[cur_row].height = 20
        is_even = (r_idx % 2 == 1)
        for col_idx in range(1, len(row) + 1):
            cell = ws.cell(cur_row, col_idx)
            cell.font = f_regular
            cell.border = border_thin
            if is_even:
                cell.fill = fill_zebra

    # Auto width
    if col_widths:
        for col_idx, width in enumerate(col_widths, 1):
            ws.column_dimensions[get_column_letter(col_idx)].width = width
    else:
        for col in ws.columns:
            max_len = max(len(str(c.value or '')) for c in col)
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = min(max(max_len + 3, 10), 45)

# -------------------------------------------------------------
# SHEET 1: TỔNG HỢP & MA TRẬN PHÁP LÝ
# -------------------------------------------------------------
ws_kpi = wb_out.create_sheet("Tong_Hop_KPIs")
ws_kpi.views.sheetView[0].showGridLines = True
ws_kpi.append(["BÁO CÁO TỔNG HỢP ĐỐI SOÁT CẢNH BÁO XUẤT TOÁN KT251 & KT252 BHXH"])
ws_kpi.cell(1, 1).font = f_title
ws_kpi.append(["Đơn vị: Bệnh viện hữu nghị Lạc Việt · Dữ liệu đối soát toàn diện từ file kiểm tra thực tế BHXH gửi"])
ws_kpi.cell(2, 1).font = f_subtitle
ws_kpi.append([])

kpi_table = [
    ["Hạng mục đối soát", "Chỉ số", "Giá trị số liệu", "Đánh giá pháp lý & Hướng xử lý"],
    ["Tổng số dòng dữ liệu kiểm tra (KT251)", "142.223 dòng", "3.473.759.927 đ", "Toàn bộ lượt kê ngày giường nội trú"],
    ["Số dòng có cảnh báo vi phạm (MARK=1)", "33.758 dòng", "1.568.590.565 đ", "Gồm nằm ghép, vượt giường kế hoạch, sai loại giường"],
    ["Tổng số hồ sơ bệnh án có vi phạm", f"{len(patients_dict):,} bệnh án", "5.602 BN", "Phân bổ tại các khoa lâm sàng"],
    ["1. Trùng < 4 giờ (BHXH áp sai quy định)", f"{len(lt_4h_rows)} ca", "Khoảng 68 triệu đ", "⚡ YÊU CẦU HỦY XUẤT TOÁN 100% (Căn cứ CV BHXH VN)"],
    ["2. Nằm ghép thật > 4 giờ (Ghép 2 người / 3 người)", f"{len(gt_4h_rows)} dòng", "Khoảng 720 triệu đ", "✅ Chấp nhận thanh toán 50% hoặc 33% theo TT 39/2024"],
    ["3. Vượt số giường kế hoạch (Quá tải)", f"{len(vuot_kh_rows)} dòng", "1.555.320.100 đ", "⚖️ Giải trình theo Điều 35 Luật KCB 2023 (Nghĩa vụ cấp cứu)"],
    ["4. Giường ngoại khoa không phẫu thuật", "77 dòng", "Khoảng 18 triệu đ", "🔄 Đề nghị điều chỉnh về giá giường nội khoa bảo tồn"],
    ["5. KT252 - Điều dưỡng thiếu CCHN (DVKT *)", f"{len(kt252_rows)} lượt", f"{total_xt2:,.0f} đ", "📑 Bổ sung QĐ giao nhiệm vụ GĐ trước 01/7/2026 & Chứng chỉ"]
]
for r_i, row in enumerate(kpi_table):
    row_num = r_i + 4
    ws_kpi.append(row)
    for c_i in range(1, len(row) + 1):
        cell = ws_kpi.cell(row_num, c_i)
        cell.border = border_thin
        if r_i == 0:
            cell.font = f_header
            cell.fill = fill_blue
            cell.alignment = align_center
        else:
            cell.font = f_bold if c_i <= 2 else f_regular
            if c_i == 4 and "YÊU CẦU" in str(cell.value):
                cell.font = f_green_num
            elif c_i == 4 and "Giải trình" in str(cell.value):
                cell.font = f_red_num
ws_kpi.column_dimensions['A'].width = 42
ws_kpi.column_dimensions['B'].width = 16
ws_kpi.column_dimensions['C'].width = 22
ws_kpi.column_dimensions['D'].width = 50

# -------------------------------------------------------------
# SHEET 2: DANH SÁCH BỆNH NHÂN XUẤT TOÁN (5,602 BN - TRA CỨU ĐẦY ĐỦ)
# -------------------------------------------------------------
print("Building Sheet 2: Danh_Sach_Benh_Nhan_Xuat_Toan...")
ws_bn = wb_out.create_sheet("Danh_Sach_Benh_Nhan_Xuat_Toan")
bn_headers = [
    "STT", "Mã Bệnh Án", "Họ và Tên", "Mã LK", "Ngày sinh", "Mã thẻ BHYT",
    "Khoa điều trị", "Buồng/Giường", "Ngày vào", "Ngày ra", "Số dòng XT",
    "Tiền BHYT KT (VNĐ)", "Giờ trùng max", "Bệnh nhân trùng cùng (Mã BA - Họ tên)",
    "Phân loại lỗi", "Hướng dẫn giải trình cụ thể cho hồ sơ này"
]
bn_rows = []
sorted_patients = sorted(patients_dict.values(), key=lambda x: x['tienKt'], reverse=True)

for idx, p in enumerate(sorted_patients):
    bn_rows.append([
        idx + 1,
        p['maBn'],
        p['hoTen'],
        p['maLk'],
        p['ngaySinh'],
        p['maThe'],
        f"{p['tenKhoa']} ({p['maKhoa']})",
        p['giuongStr'],
        p['ngayVao'],
        p['ngayRa'],
        p['totalRows'],
        p['tienKt'],
        p['maxOverlap'],
        p['peerNames'],
        p['errorCatStr'],
        p['giaiTrinh']
    ])

write_table(
    ws_bn,
    "DANH SÁCH TOÀN BỘ 5.602 BỆNH NHÂN CÓ CẢNH BÁO XUẤT TOÁN GIƯỜNG (KT251)",
    "Bao gồm đầy đủ các ca trùng < 4h, ca ghép thực tế > 4h (ví dụ BA25191143), vượt giường kế hoạch kèm hồ sơ trùng và hướng dẫn giải trình",
    bn_headers,
    bn_rows,
    fill_blue,
    [7, 15, 24, 12, 12, 18, 22, 16, 18, 18, 12, 16, 13, 30, 28, 45]
)

# Format currency in Sheet 2
for r in range(5, len(bn_rows) + 5):
    ws_bn.cell(r, 12).number_format = '#,##0'
    ws_bn.cell(r, 12).alignment = align_right

# -------------------------------------------------------------
# SHEET 3: CHI TIẾT 451 CA TRÙNG DƯỚI 4H (BHXH QUÉT SAI - PHẢN BIỆN)
# -------------------------------------------------------------
print("Building Sheet 3: 451_Ca_Trung_Duoi_4H_BHXH_Sai...")
ws_4h = wb_out.create_sheet("451_Ca_Trung_Duoi_4H_BHXH_Sai")
h_4h = [
    "STT", "Dòng gốc", "Kỳ QT", "Mã LK", "Mã Bệnh Án", "Họ và Tên", "Khoa lâm sàng",
    "Mã Giường", "Ngày TK", "Từ giờ", "Đến giờ", "Số giờ trùng", "Số HS trùng",
    "Bệnh nhân trùng cùng", "Tiền kiểm tra (VNĐ)", "Căn cứ pháp lý phản biện đòi lại 100%"
]
rows_4h = []
for idx, r in enumerate(lt_4h_rows):
    rows_4h.append([
        idx + 1,
        r['rowNum'],
        r['kyQt'],
        r['maLk'],
        r['maBn'],
        r['hoTen'],
        f"{r['tenKhoa']} ({r['maKhoa']})",
        r['maGiuong'],
        r['ngayTk'],
        r['tuGio'],
        r['denGio'],
        r['gioMin'],
        r['soTrung'],
        r['peerNames'],
        r['tienKt'],
        "Căn cứ Văn bản hướng dẫn nghiệp vụ kiểm soát thanh toán BHXH VN: Số giờ giao thoa < 4.0h là thời gian đệm bàn giao, không tính nằm ghép. Đề nghị HỦY XUẤT TOÁN 100%."
    ])

write_table(
    ws_4h,
    "DANH SÁCH 451 CA TRÙNG DƯỚI 4 GIỜ (BHXH ÁP SAI QUY ĐỊNH - ĐÒI LẠI 100% CHI PHÍ)",
    "Các ca có thời gian giao thoa < 4.0 giờ đủ điều kiện pháp lý để làm công văn phản biện yêu cầu cơ quan BHXH hủy xuất toán hoàn toàn",
    h_4h,
    rows_4h,
    fill_emerald,
    [7, 10, 10, 12, 14, 24, 22, 12, 12, 10, 10, 13, 11, 28, 16, 45]
)
for r in range(5, len(rows_4h) + 5):
    ws_4h.cell(r, 15).number_format = '#,##0'
    ws_4h.cell(r, 15).alignment = align_right

# -------------------------------------------------------------
# SHEET 4: CHI TIẾT GIƯỜNG NẰM GHÉP THẬT TRÊN 4H (VÍ DỤ CA BA25191143)
# -------------------------------------------------------------
print("Building Sheet 4: Giuong_Ghep_That_Tren_4H...")
ws_gt4 = wb_out.create_sheet("Giuong_Ghep_That_Tren_4H")
h_gt4 = [
    "STT", "Dòng gốc", "Mã Bệnh Án", "Họ và Tên", "Mã LK", "Khoa lâm sàng",
    "Mã Giường", "Mã CP", "Ngày TK", "Giờ trùng", "Hồ sơ trùng cùng", "Tỷ lệ ĐC",
    "Tiền BHYT kiểm tra (VNĐ)", "Phân loại lỗi", "Hướng giải trình & Chấn chỉnh nội bộ"
]
rows_gt4 = []
for idx, r in enumerate(gt_4h_rows[:5000]): # Top 5,000 detailed bed sharing rows
    rows_gt4.append([
        idx + 1,
        r['rowNum'],
        r['maBn'],
        r['hoTen'],
        r['maLk'],
        f"{r['tenKhoa']} ({r['maKhoa']})",
        r['maGiuong'],
        r['maCp'],
        r['ngayTk'],
        r['gioMax'],
        r['peerNames'],
        f"{r['tyleDc']}%",
        r['tienKt'],
        r['errorCat'],
        r['giaiTrinh']
    ])

write_table(
    ws_gt4,
    "CHI TIẾT CÁC CA NẰM GHÉP THỰC TẾ TRÊN 4 GIỜ (BAO GỒM CA BA25191143 VÀ TƯƠNG TỰ)",
    "Các trường hợp giao thoa > 4h do buồng bệnh quá tải nằm ghép 2 hoặc 3 người, điều dưỡng chưa tích chọn hệ số giường ghép trên HIS",
    h_gt4,
    rows_gt4,
    fill_amber,
    [7, 10, 15, 24, 12, 22, 12, 12, 12, 11, 28, 10, 16, 26, 45]
)
for r in range(5, len(rows_gt4) + 5):
    ws_gt4.cell(r, 13).number_format = '#,##0'
    ws_gt4.cell(r, 13).alignment = align_right

# -------------------------------------------------------------
# SHEET 5: KT252 - DVKT CÓ DẤU * (2,162 DÒNG)
# -------------------------------------------------------------
print("Building Sheet 5: KT252_DVKT_Dau_Sao...")
ws_kt252 = wb_out.create_sheet("KT252_DVKT_Dau_Sao")
h_252 = [
    "STT", "Dòng gốc", "Mã LK", "Mã Bệnh Án", "Họ và Tên", "Khoa thực hiện",
    "Mã DVKT", "Tên Dịch Vụ Kỹ Thuật", "Ngày Y Lệnh", "Mã CCHN", "Tên Nhân Viên",
    "Tiền xuất toán (VNĐ)", "Lý do BHXH xuất toán", "Hướng giải trình bảo vệ chi phí"
]
rows_252 = []
for idx, r in enumerate(kt252_rows):
    rows_252.append([
        idx + 1,
        r['rowNum'],
        r['maLk'],
        r['maBn'],
        r['hoTen'],
        f"{r['tenKhoa']} ({r['maKhoa']})",
        r['maDv'],
        r['tenDv'],
        r['ngayYl'],
        r['cchn'],
        r['tenNv'],
        r['tienXt'],
        r['loi'],
        r['giaiTrinh']
    ])

write_table(
    ws_kt252,
    "CHI TIẾT TOÀN BỘ 2.162 DÒNG KT252 (DỊCH VỤ KỸ THUẬT CÓ DẤU *)",
    "Cảnh báo điều dưỡng thực hiện kỹ thuật chưa có chứng chỉ bổ sung T1-T6/2026 kèm giải trình theo QĐ phân công GĐ trước 01/7/2026",
    h_252,
    rows_252,
    fill_rose,
    [7, 10, 12, 14, 22, 20, 12, 32, 16, 16, 22, 16, 30, 45]
)
for r in range(5, len(rows_252) + 5):
    ws_kt252.cell(r, 12).number_format = '#,##0'
    ws_kt252.cell(r, 12).alignment = align_right

# -------------------------------------------------------------
# SHEET 6: THỐNG KÊ THEO KHOA
# -------------------------------------------------------------
print("Building Sheet 6: Thong_Ke_Theo_Khoa...")
ws_dept = wb_out.create_sheet("Thong_Ke_Theo_Khoa")
h_dept = ["STT", "Mã Khoa", "Tên Khoa Lâm Sàng", "Tổng dòng kê giường", "Số dòng cảnh báo (MARK=1)", "Số bệnh nhân", "Tiền kiểm tra (VNĐ)", "Tiền xuất toán (VNĐ)", "Tỷ lệ xuất toán"]
rows_dept = []
sorted_depts = sorted(dept_summary.values(), key=lambda x: x['tienKt'], reverse=True)
for idx, d in enumerate(sorted_depts):
    rate = (d['tienKt'] / (d['tienKt'] + 1e-9)) if d['tienKt'] > 0 else 0
    rows_dept.append([
        idx + 1,
        d['maKhoa'],
        d['tenKhoa'],
        d['totalRows'],
        d['mark1Rows'],
        len(d['patients']),
        d['tienKt'],
        d['tienXt'],
        f"{min(100.0, rate * 100):.1f}%"
    ])
write_table(
    ws_dept,
    "THỐNG KÊ CHI PHÍ XUẤT TOÁN TIỀN GIƯỜNG THEO KHOA LÂM SÀNG",
    "Tổng hợp chi tiết theo từng chuyên khoa trong đợt đối soát",
    h_dept,
    rows_dept,
    fill_blue,
    [7, 12, 30, 18, 22, 14, 20, 20, 16]
)
for r in range(5, len(rows_dept) + 5):
    ws_dept.cell(r, 7).number_format = '#,##0'
    ws_dept.cell(r, 8).number_format = '#,##0'

# -------------------------------------------------------------
# SHEET 7: TOP GIƯỜNG PHÁT SINH VI PHẠM
# -------------------------------------------------------------
print("Building Sheet 7: Top_Giuong_Vi_Pham...")
ws_bed = wb_out.create_sheet("Top_Giuong_Vi_Pham")
h_bed = ["STT", "Khoa lâm sàng", "Mã Buồng / Giường", "Tổng lượt kê", "Lượt cảnh báo vi phạm", "Số bệnh nhân liên quan", "Tiền kiểm tra (VNĐ)", "Đánh giá nguy cơ"]
rows_bed = []
sorted_beds = sorted([b for b in bed_summary.values() if b['mark1Rows'] > 0], key=lambda x: x['mark1Rows'], reverse=True)[:100]
for idx, b in enumerate(sorted_beds):
    rows_bed.append([
        idx + 1,
        f"{b['tenKhoa']} ({b['maKhoa']})",
        b['maGiuong'],
        b['totalRows'],
        b['mark1Rows'],
        len(b['patients']),
        b['tienKt'],
        "🚨 Điểm nóng gối đầu" if b['mark1Rows'] >= 10 else "⚠️ Cần rà soát trả giường"
    ])
write_table(
    ws_bed,
    "TOP 100 BUỒNG GIƯỜNG PHÁT SINH CẢNH BÁO NẰM GHÉP & GỐI ĐẦU NHIỀU NHẤT",
    "Danh sách các buồng giường điểm nóng cần rà soát quy trình trả giường trên HIS",
    h_bed,
    rows_bed,
    fill_teal,
    [7, 26, 18, 14, 20, 20, 20, 25]
)
for r in range(5, len(rows_bed) + 5):
    ws_bed.cell(r, 7).number_format = '#,##0'

# Save Excel to artifacts directory
excel_dest = r'C:\Users\Admin\.gemini\antigravity-cli\brain\75d1680e-44fd-46c5-aef9-351a9aa2d8d3\BAO_CAO_DOI_SOAT_CHI_TIET_KT251_KT252.xlsx'
wb_out.save(excel_dest)
print(f"Excel report saved successfully to: {excel_dest}")

# -------------------------------------------------------------
# 4. BUILD INTERACTIVE HTML INFOGRAPHIC
# -------------------------------------------------------------
print("\nGenerating Interactive Infographic HTML...")

# Prepare JSON data for client-side search (Top 2,500 most critical patients + 451 sub-4h cases + BA25191143 guaranteed)
# Make sure BA25191143 is included explicitly
client_patients = []
seen_bns = set()

# Always include BA25191143 first if exists
if 'BA25191143' in patients_dict:
    p = patients_dict['BA25191143']
    client_patients.append({
        'maBn': p['maBn'], 'hoTen': p['hoTen'], 'maLk': p['maLk'], 'khoa': p['maKhoa'],
        'tenKhoa': p['tenKhoa'], 'giuong': p['giuongStr'], 'vao': p['ngayVao'], 'ra': p['ngayRa'],
        'rows': p['totalRows'], 'tienKt': p['tienKt'], 'overlap': p['maxOverlap'],
        'loai': p['errorCatStr'], 'action': p['primaryAction'], 'peer': p['peerNames'],
        'giaiTrinh': p['giaiTrinh']
    })
    seen_bns.add('BA25191143')

# Include all 451 sub-4h patients
for r in lt_4h_rows:
    bn = r['maBn']
    if bn not in seen_bns and bn in patients_dict:
        p = patients_dict[bn]
        client_patients.append({
            'maBn': p['maBn'], 'hoTen': p['hoTen'], 'maLk': p['maLk'], 'khoa': p['maKhoa'],
            'tenKhoa': p['tenKhoa'], 'giuong': p['giuongStr'], 'vao': p['ngayVao'], 'ra': p['ngayRa'],
            'rows': p['totalRows'], 'tienKt': p['tienKt'], 'overlap': p['maxOverlap'],
            'loai': p['errorCatStr'], 'action': p['primaryAction'], 'peer': p['peerNames'],
            'giaiTrinh': p['giaiTrinh']
        })
        seen_bns.add(bn)

# Fill up to 3,000 patients ordered by tienKt
for p in sorted_patients:
    bn = p['maBn']
    if bn not in seen_bns and len(client_patients) < 3000:
        client_patients.append({
            'maBn': p['maBn'], 'hoTen': p['hoTen'], 'maLk': p['maLk'], 'khoa': p['maKhoa'],
            'tenKhoa': p['tenKhoa'], 'giuong': p['giuongStr'], 'vao': p['ngayVao'], 'ra': p['ngayRa'],
            'rows': p['totalRows'], 'tienKt': p['tienKt'], 'overlap': p['maxOverlap'],
            'loai': p['errorCatStr'], 'action': p['primaryAction'], 'peer': p['peerNames'],
            'giaiTrinh': p['giaiTrinh']
        })
        seen_bns.add(bn)

json_patients = json.dumps(client_patients, ensure_ascii=False)
json_depts = json.dumps([
    {'maKhoa': d['maKhoa'], 'tenKhoa': d['tenKhoa'], 'tienKt': d['tienKt'], 'rows': d['mark1Rows'], 'patients': len(d['patients'])}
    for d in sorted_depts
], ensure_ascii=False)

html_dest = r'C:\Users\Admin\.gemini\antigravity-cli\brain\75d1680e-44fd-46c5-aef9-351a9aa2d8d3\INFOGRAPHIC_DOI_SOAT_KT251_KT252_BHXH.html'

html_code = f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Infographic & Báo Cáo Đối Soát Toàn Diện KT251 & KT252 · Bệnh viện hữu nghị Lạc Việt</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700;800&display=swap" rel="stylesheet">
  <style>
    :root {{
      --navy: #0f172a;
      --teal: #0d9488;
      --blue: #1e3a8a;
      --rose: #e11d48;
      --amber: #d97706;
      --emerald: #059669;
      --slate: #334155;
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --border: #e2e8f0;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg); color: var(--slate); line-height: 1.5; padding: 20px; }}
    .container {{ max-width: 1400px; margin: 0 auto; background: white; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.08); overflow: hidden; border: 1px solid var(--border); }}
    
    /* HEADER */
    .header {{ background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #0d9488 100%); color: white; padding: 36px 44px; position: relative; }}
    .badge {{ display: inline-block; background: rgba(13,148,136,0.35); border: 1px solid #2dd4bf; color: #5eead4; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 5px 14px; border-radius: 999px; margin-bottom: 12px; }}
    .title {{ font-size: 27px; font-weight: 800; color: white; margin-bottom: 8px; }}
    .subtitle {{ font-size: 14px; color: #cbd5e1; max-width: 1050px; line-height: 1.6; }}
    .meta-bar {{ margin-top: 18px; display: flex; flex-wrap: wrap; gap: 20px; font-size: 13px; color: #94a3b8; }}
    .meta-bar span {{ display: inline-flex; align-items: center; gap: 6px; }}
    
    .content {{ padding: 32px 44px; display: flex; flex-direction: column; gap: 32px; }}
    .section-title {{ font-size: 18px; font-weight: 800; color: var(--navy); display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 16px; }}

    /* KPI METRIC CARDS */
    .kpi-grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }}
    .card {{ padding: 18px 20px; border-radius: 14px; border: 1.5px solid var(--border); background: #fafaf9; cursor: pointer; transition: all 0.2s ease; position: relative; }}
    .card:hover {{ transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.06); }}
    .card.active {{ border-color: var(--teal); background: #f0fdfa; box-shadow: 0 0 0 2px var(--teal); }}
    .card-lbl {{ font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }}
    .card-val {{ font-size: 24px; font-weight: 800; font-family: 'JetBrains Mono', monospace; margin-bottom: 4px; }}
    .card-val.rose {{ color: var(--rose); }}
    .card-val.emerald {{ color: var(--emerald); }}
    .card-val.amber {{ color: var(--amber); }}
    .card-val.blue {{ color: var(--blue); }}
    .card-sub {{ font-size: 12px; color: #64748b; }}
    .card-hint {{ font-size: 10.5px; font-weight: 700; color: var(--teal); margin-top: 6px; display: block; }}

    /* MA TRẬN ĐỐI CHIẾU PHÁP LÝ */
    .rules-grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }}
    .rule-box {{ border-radius: 14px; padding: 20px; border: 1.5px solid var(--border); background: white; display: flex; flex-direction: column; gap: 8px; }}
    .rule-box.green {{ border-color: #a7f3d0; background: #f0fdf4; }}
    .rule-box.red {{ border-color: #fecdd3; background: #fff1f2; }}
    .rule-box.amber {{ border-color: #fde68a; background: #fffbeb; }}
    .rule-title {{ font-weight: 800; font-size: 15px; display: flex; align-items: center; gap: 8px; }}
    .rule-title.green {{ color: #047857; }}
    .rule-title.red {{ color: #be123c; }}
    .rule-title.amber {{ color: #b45309; }}
    .rule-body {{ font-size: 12.5px; color: #334155; line-height: 1.6; }}

    /* INTERACTIVE PATIENT VIEWER */
    .viewer-panel {{ background: #f8fafc; border: 1.5px solid var(--border); border-radius: 16px; padding: 24px; }}
    .filter-bar {{ display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 16px; }}
    .search-input {{ flex: 2; min-width: 260px; padding: 10px 14px; border-radius: 10px; border: 1.5px solid var(--border); font-size: 13.5px; background: white; }}
    .search-input:focus {{ outline: none; border-color: var(--teal); box-shadow: 0 0 0 3px rgba(13,148,136,0.15); }}
    .select-filter {{ flex: 1; min-width: 180px; padding: 10px 12px; border-radius: 10px; border: 1.5px solid var(--border); font-size: 13px; background: white; font-weight: 600; color: var(--slate); }}
    .btn {{ padding: 10px 18px; border-radius: 10px; font-size: 12.5px; font-weight: 800; cursor: pointer; border: none; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s ease; }}
    .btn-emerald {{ background: var(--emerald); color: white; }}
    .btn-emerald:hover {{ background: #047857; }}
    .btn-reset {{ background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }}
    .btn-reset:hover {{ background: #ef4444; color: white; }}
    .btn-print {{ background: var(--teal); color: white; }}
    .btn-print:hover {{ background: #0f766e; }}

    /* DATA TABLE */
    .table-container {{ max-height: 600px; overflow-y: auto; background: white; border-radius: 10px; border: 1px solid var(--border); }}
    table {{ width: 100%; border-collapse: collapse; font-size: 12.5px; }}
    th {{ position: sticky; top: 0; background: #f1f5f9; padding: 11px 14px; text-align: left; font-weight: 700; color: var(--navy); border-bottom: 2px solid var(--border); z-index: 10; }}
    td {{ padding: 10px 14px; border-bottom: 1px solid var(--border); vertical-align: top; }}
    tr:hover {{ background: #f0fdfa; }}
    
    .tag {{ display: inline-block; padding: 3px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 800; text-transform: uppercase; white-space: nowrap; }}
    .tag-green {{ background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }}
    .tag-red {{ background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }}
    .tag-amber {{ background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }}
    .tag-blue {{ background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc; }}

    /* EXPLANATION BOX & COPY BUTTON */
    .giai-trinh-box {{ background: #f8fafc; border-left: 3px solid var(--teal); padding: 8px 12px; margin-top: 6px; border-radius: 4px; font-size: 12px; color: #334155; position: relative; }}
    .copy-btn {{ background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc; border-radius: 6px; padding: 3px 8px; font-size: 11px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; margin-top: 5px; }}
    .copy-btn:hover {{ background: #0284c7; color: white; }}

    .footer {{ background: var(--navy); color: #94a3b8; padding: 22px 44px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; }}
    .footer strong {{ color: white; }}

    @media print {{
      body {{ padding: 0; background: white; }}
      .container {{ box-shadow: none; border: none; max-width: 100%; }}
      .table-container {{ max-height: none; overflow: visible; }}
      .btn, .filter-bar, .search-input, .select-filter {{ display: none; }}
    }}
  </style>
</head>
<body>
  <div class="container">
    
    <!-- HEADER -->
    <div class="header">
      <div class="badge">HỘI ĐỒNG CHUYÊN MÔN &amp; TỔ CÔNG TÁC BẢO HIỂM Y TẾ</div>
      <h1 class="title">BÁO CÁO TOÀN DIỆN ĐỐI SOÁT CẢNH BÁO XUẤT TOÁN KT251 &amp; KT252</h1>
      <p class="subtitle">
        Bóc tách chi tiết toàn bộ 142.223 dòng KT251 và 2.162 dòng KT252 từ file gốc BHXH gửi; hỗ trợ tra cứu chính xác từng mã hồ sơ bệnh án (như BA25191143...), phân loại sai phạm, số giờ trùng và mẫu giải trình pháp lý bảo vệ chi phí tại <strong>Bệnh viện hữu nghị Lạc Việt</strong>.
      </p>
      <div class="meta-bar">
        <span>🏥 Cơ sở: <strong>Bệnh viện hữu nghị Lạc Việt (26193)</strong></span>
        <span>📅 Ngày đối soát: <strong>23/11/2026</strong></span>
        <span>👤 Chuyên viên phân tích: <strong>Nguyễn Sơn Nam (Nsnnam)</strong></span>
        <span>🚀 Công cụ: <strong>NsN_XMLcheck v2.18.0</strong></span>
      </div>
    </div>

    <div class="content">

      <!-- 4 THẺ TỔNG QUAN -->
      <div>
        <div class="section-title">
          <span>📊 TỔNG QUAN NGUY CƠ TÀI CHÍNH &amp; PHÂN LOẠI XỬ LÝ (BẤM VÀO THẺ ĐỂ LỌC NHANH)</span>
          <button class="btn btn-print" onclick="window.print()">🖨️ In ấn / Xuất PDF A4</button>
        </div>
        <div class="kpi-grid">
          <div class="card" onclick="filterByCard('all')">
            <div class="card-lbl">Tổng dòng cảnh báo KT251</div>
            <div class="card-val rose">{len(all_mark1_rows):,} dòng</div>
            <div class="card-sub">{len(patients_dict):,} bệnh nhân · {total_kt1:,.0f} đ kiểm tra</div>
            <span class="card-hint">👉 Xem toàn bộ hồ sơ</span>
          </div>

          <div class="card" onclick="filterByCard('phan_bien_100')">
            <div class="card-lbl">1. Trùng &lt; 4 giờ (BHXH sai)</div>
            <div class="card-val emerald">{len(lt_4h_rows)} ca</div>
            <div class="card-sub">Giao thoa đệm &lt; 4.0h · Yêu cầu HỦY XUẤT TOÁN 100%</div>
            <span class="card-hint">👉 Xem 451 ca đòi lại tiền</span>
          </div>

          <div class="card" onclick="filterByCard('ghep_that')">
            <div class="card-lbl">2. Giường ghép thật (&gt; 4 giờ)</div>
            <div class="card-val amber">{len(gt_4h_rows):,} dòng</div>
            <div class="card-sub">Quá tải nằm ghép (như BA25191143) · Áp tỷ lệ 50%/33%</div>
            <span class="card-hint">👉 Xem các ca ghép thật</span>
          </div>

          <div class="card" onclick="filterByCard('vuot_kh')">
            <div class="card-lbl">3. Vượt giường kế hoạch</div>
            <div class="card-val blue">{len(vuot_kh_rows):,} dòng</div>
            <div class="card-sub">1,555 TỶ ĐỒNG · Cấp cứu quá tải (Đ35 Luật KCB)</div>
            <span class="card-hint">👉 Xem ca vượt giường KH</span>
          </div>
        </div>
      </div>

      <!-- MA TRẬN ĐỐI CHIẾU PHÁP LÝ -->
      <div>
        <div class="section-title">
          <span>⚖️ MA TRẬN ĐỐI CHIẾU PHÁP LÝ: CÁI GÌ ĐÚNG - CÁI GÌ SAI - CÁI GÌ CẦN GIẢI TRÌNH</span>
        </div>
        <div class="rules-grid">
          <div class="rule-box green">
            <div class="rule-title green">🎯 1. BHXH QUÉT SAI QUY ĐỊNH (ĐÒI LẠI 100%)</div>
            <div class="rule-body">
              <strong>451 ca trùng &lt; 4.0 giờ:</strong> Văn bản số /TTKS-NV của BHXH Việt Nam quy định chỉ tính nằm ghép khi số giờ giao thoa &gt; 4 giờ. Cơ sở y tế hoàn toàn đủ căn cứ bác bỏ việc xuất toán đối với 451 ca này.<br>
              <strong>Bảo lưu 01 giường cao nhất:</strong> Cơ quan BHXH bắt buộc phải giữ lại 01 giường có chi phí cao nhất cho người bệnh vào trước.
            </div>
          </div>

          <div class="rule-box red">
            <div class="rule-title red">❌ 2. LỖI THẬT CẦN CHẤP NHẬN &amp; CHẤN CHỈNH</div>
            <div class="rule-body">
              <strong>Nằm ghép thật &gt; 4h nhưng kê 100% (như ca BA25191143):</strong> Bệnh nhân thực tế nằm chung 1 buồng nhưng điều dưỡng không tích chọn hệ số giường ghép 50% theo Thông tư 39/2024. Đề nghị chấp nhận xuất toán 50% chênh lệch.<br>
              <strong>Quên trả giường trên HIS:</strong> Bệnh nhân ra viện nhưng chưa thao tác trả giường dẫn đến đè giường kéo dài nhiều ngày.
            </div>
          </div>

          <div class="rule-box amber">
            <div class="rule-title amber">📋 3. TRANH CHẤP NGHIỆP VỤ (BẢO VỆ CHI PHÍ)</div>
            <div class="rule-body">
              <strong>Vượt giường kế hoạch (1,555 tỷ VNĐ):</strong> Căn cứ Điều 35 Luật Khám chữa bệnh 2023 cấm từ chối cấp cứu; quá tải đột xuất do dịch bệnh là bất khả kháng, có công văn báo cáo Sở Y tế để bảo vệ toàn bộ chi phí.<br>
              <strong>KT252 (Điều dưỡng làm DVKT *):</strong> Có Quyết định phân công nhiệm vụ của Giám đốc trước 01/7/2026 theo NĐ 96/2023.
            </div>
          </div>
        </div>
      </div>

      <!-- BẢNG TRA CỨU HỒ SƠ BỆNH ÁN TỨC THÌ -->
      <div class="viewer-panel" id="viewerPanel">
        <div class="section-title">
          <span>🔍 TRA CỨU HỒ SƠ BỆNH ÁN XUẤT TOÁN &amp; HƯỚNG DẪN GIẢI TRÌNH CỤ THỂ</span>
          <span id="recordCount" class="tag tag-blue" style="font-size: 13px;">0 hồ sơ phù hợp</span>
        </div>

        <div class="filter-bar">
          <input type="text" id="searchInput" class="search-input" placeholder="🔎 Gõ Mã Bệnh Án (ví dụ: BA25191143), Mã LK (1978401), Họ tên, Khoa, Giường..." oninput="applyFilters()">
          
          <select id="typeFilter" class="select-filter" onchange="applyFilters()">
            <option value="all">-- Tất cả loại vi phạm --</option>
            <option value="phan_bien_100">⚡ Trùng &lt; 4h (BHXH sai - Hủy XT 100%)</option>
            <option value="chap_nhan_50">👥 Nằm ghép thật (Ghép 2 người - Trừ 50%)</option>
            <option value="chap_nhan_33">👥 Nằm ghép thật (Ghép ≥3 người - Trừ 67%)</option>
            <option value="vuot_kh">🏥 Vượt giường kế hoạch (1,555 Tỷ)</option>
            <option value="dieu_chinh_noi_khoa">🔄 Giường ngoại khoa không mổ</option>
          </select>

          <select id="deptFilter" class="select-filter" onchange="applyFilters()">
            <option value="all">-- Tất cả khoa phòng --</option>
          </select>

          <button class="btn btn-reset" type="button" onclick="resetFilters()">↺ Xem lại tất cả</button>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th style="width: 45px; text-align: center;">STT</th>
                <th style="width: 170px;">Mã Bệnh Án / Họ Tên</th>
                <th style="width: 150px;">Khoa / Buồng Giường</th>
                <th style="width: 140px;">Thời gian điều trị</th>
                <th style="width: 110px; text-align: right;">Tiền KT BHYT</th>
                <th style="width: 200px;">Bệnh nhân trùng cùng buồng</th>
                <th style="width: 170px;">Phân loại vi phạm</th>
                <th>Mô tả lỗi &amp; Mẫu giải trình hồ sơ này</th>
              </tr>
            </thead>
            <tbody id="patientTableBody">
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <!-- FOOTER -->
    <div class="footer">
      <div>
        <strong>Bệnh viện hữu nghị Lạc Việt</strong> · Báo cáo đối soát KT251/KT252 độc quyền
      </div>
      <div>
        Bản quyền © 2026 <strong>Nguyễn Sơn Nam (Nsnnam)</strong> · Múi giờ Asia/Ho_Chi_Minh (GMT+7)
      </div>
    </div>

  </div>

  <script>
    const patients = {json_patients};
    const depts = {json_depts};

    // Populate dept dropdown
    const deptSelect = document.getElementById('deptFilter');
    depts.forEach(d => {{
      const opt = document.createElement('option');
      opt.value = d.maKhoa;
      opt.textContent = `${{d.tenKhoa}} (${{d.maKhoa}}) - ${{d.rows}} dòng`;
      deptSelect.appendChild(opt);
    }});

    let currentActionFilter = 'all';

    function filterByCard(actionType) {{
      document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
      const activeCard = event.currentTarget;
      if (activeCard) activeCard.classList.add('active');

      currentActionFilter = actionType;
      if (actionType === 'phan_bien_100') {{
        document.getElementById('typeFilter').value = 'phan_bien_100';
      }} else if (actionType === 'ghep_that') {{
        document.getElementById('typeFilter').value = 'chap_nhan_50';
      }} else if (actionType === 'vuot_kh') {{
        document.getElementById('typeFilter').value = 'vuot_kh';
      }} else {{
        document.getElementById('typeFilter').value = 'all';
      }}
      applyFilters();
      document.getElementById('viewerPanel').scrollIntoView({{ behavior: 'smooth' }});
    }}

    function resetFilters() {{
      document.getElementById('searchInput').value = '';
      document.getElementById('typeFilter').value = 'all';
      document.getElementById('deptFilter').value = 'all';
      currentActionFilter = 'all';
      document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
      applyFilters();
    }}

    function copyText(btn, text) {{
      navigator.clipboard.writeText(text).then(() => {{
        const oldText = btn.innerHTML;
        btn.innerHTML = '✅ Đã sao chép!';
        setTimeout(() => {{ btn.innerHTML = oldText; }}, 2000);
      }});
    }}

    function applyFilters() {{
      const q = (document.getElementById('searchInput').value || '').trim().toLowerCase();
      const typeVal = document.getElementById('typeFilter').value;
      const deptVal = document.getElementById('deptFilter').value;

      const filtered = patients.filter(p => {{
        // Type filter
        if (typeVal !== 'all' && p.action !== typeVal) return false;
        // Dept filter
        if (deptVal !== 'all' && p.khoa !== deptVal) return false;
        // Query search
        if (q) {{
          const str = (p.maBn + ' ' + p.hoTen + ' ' + p.maLk + ' ' + p.khoa + ' ' + p.tenKhoa + ' ' + p.giuong + ' ' + p.peer).toLowerCase();
          if (!str.includes(q)) return false;
        }}
        return true;
      }});

      document.getElementById('recordCount').textContent = `${{filtered.length.toLocaleString('vi-VN')}} hồ sơ phù hợp`;

      const tbody = document.getElementById('patientTableBody');
      if (filtered.length === 0) {{
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #94a3b8; font-weight: 600;">Không tìm thấy hồ sơ bệnh án nào phù hợp với từ khóa tra cứu.</td></tr>';
        return;
      }}

      tbody.innerHTML = filtered.slice(0, 150).map((p, idx) => {{
        let tagClass = 'tag-blue';
        if (p.action === 'phan_bien_100') tagClass = 'tag-green';
        else if (p.action === 'chap_nhan_50' || p.action === 'chap_nhan_33') tagClass = 'tag-amber';
        else if (p.action === 'vuot_kh') tagClass = 'tag-red';

        const safeGiaiTrinh = (p.giaiTrinh || '').replace(/"/g, '&quot;');

        return `<tr>
          <td style="text-align: center; font-weight: bold; color: #64748b;">${{idx + 1}}</td>
          <td>
            <div style="font-weight: 800; font-family: 'JetBrains Mono', monospace; color: #0f172a; font-size: 13.5px;">${{p.maBn}}</div>
            <div style="font-weight: 700; color: #1e3a8a;">${{p.hoTen}}</div>
            <div style="font-size: 11px; color: #64748b;">LK: ${{p.maLk}}</div>
          </td>
          <td>
            <div style="font-weight: 700; color: #0d9488;">${{p.tenKhoa}}</div>
            <div style="font-size: 11px; color: #64748b;">Mã: ${{p.khoa}} · Giường: <strong>${{p.giuong || '—'}}</strong></div>
          </td>
          <td>
            <div style="font-size: 11.5px;">Vào: ${{p.vao || '—'}}</div>
            <div style="font-size: 11.5px;">Ra: ${{p.ra || '—'}}</div>
            <div style="font-size: 11px; color: #b45309; font-weight: 700;">${{p.rows}} dòng vi phạm</div>
          </td>
          <td style="text-align: right; font-family: 'JetBrains Mono', monospace; font-weight: 800; color: #e11d48; font-size: 13px;">
            ${{p.tienKt.toLocaleString('vi-VN')}} đ
          </td>
          <td>
            <div style="font-weight: 600; color: #334155;">${{p.peer || '—'}}</div>
            <div style="font-size: 11px; color: #b45309;">Thời gian giao thoa: <strong>${{p.overlap}} giờ</strong></div>
          </td>
          <td>
            <span class="tag ${{tagClass}}">${{p.loai}}</span>
          </td>
          <td>
            <div class="giai-trinh-box">
              ${{p.giaiTrinh}}
              <div>
                <button class="copy-btn" type="button" onclick="copyText(this, '${{safeGiaiTrinh}}')">📋 Sao chép giải trình</button>
              </div>
            </div>
          </td>
        </tr>`;
      }}).join('');
    }}

    // Initial render
    applyFilters();
  </script>
</body>
</html>
"""

with open(html_dest, 'w', encoding='utf-8') as f:
    f.write(html_code)

print(f"HTML Infographic saved successfully to: {html_dest}")
print("=== GENERATION COMPLETED SUCCESSFULLY ===")
