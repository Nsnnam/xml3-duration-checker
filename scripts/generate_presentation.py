import sys
import os
import pptx
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def create_deck(output_path):
    prs = pptx.Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    NAVY = RGBColor(15, 23, 42)      # #0F172A
    TEAL = RGBColor(13, 148, 136)    # #0D9488
    ROSE = RGBColor(225, 29, 72)     # #E11D48
    AMBER = RGBColor(217, 119, 6)    # #D97706
    PURPLE = RGBColor(147, 51, 234)  # #9333EA
    SLATE_DARK = RGBColor(51, 65, 85)# #334155
    SLATE_LIGHT = RGBColor(241, 245, 249) # #F1F5F9
    WHITE = RGBColor(255, 255, 255)
    MUTED = RGBColor(100, 116, 139)

    def add_header(slide, title_text, category_text="BÁO CÁO CHUYÊN ĐỀ THANH QUYẾT TOÁN BHYT"):
        # Header banner
        header_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.733), Inches(0.9))
        tf = header_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        
        p_cat = tf.paragraphs[0]
        p_cat.text = category_text.upper()
        p_cat.font.size = Pt(10)
        p_cat.font.bold = True
        p_cat.font.color.rgb = TEAL

        p_title = tf.add_paragraph()
        p_title.text = title_text
        p_title.font.size = Pt(22)
        p_title.font.bold = True
        p_title.font.color.rgb = NAVY

    def add_card(slide, left, top, width, height, bg_color=WHITE, border_color=None):
        shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        shape.fill.solid()
        shape.fill.fore_color.rgb = bg_color
        if border_color:
            shape.line.color.rgb = border_color
            shape.line.width = Pt(1.5)
        else:
            shape.line.fill.background()
        return shape

    # =========================================================================
    # SLIDE 1: TITLE SLIDE
    # =========================================================================
    s1 = prs.slides.add_slide(prs.slide_layouts[6])
    # Background
    bg1 = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
    bg1.fill.solid()
    bg1.fill.fore_color.rgb = NAVY
    bg1.line.fill.background()

    # Title box
    tbox = s1.shapes.add_textbox(Inches(1.0), Inches(1.8), Inches(11.333), Inches(3.8))
    tf1 = tbox.text_frame
    tf1.word_wrap = True

    p0 = tf1.paragraphs[0]
    p0.text = "BỆNH VIỆN HỮU NGHỊ LẠC VIỆT · HỘI ĐỒNG CHUYÊN MÔN BHYT"
    p0.font.size = Pt(13)
    p0.font.bold = True
    p0.font.color.rgb = TEAL
    p0.space_after = Pt(14)

    p1 = tf1.add_paragraph()
    p1.text = "RÀ SOÁT CẢNH BÁO TIỀN GIƯỜNG, GIƯỜNG NẰM GHÉP (KT251)\nVÀ HƯỚNG DẪN KHỐI CHUYÊN MÔN ĐIỀU DƯỠNG LÂM SÀNG"
    p1.font.size = Pt(26)
    p1.font.bold = True
    p1.font.color.rgb = WHITE
    p1.space_after = Pt(18)

    p2 = tf1.add_paragraph()
    p2.text = "Phân tích dữ liệu thực tế 55.458 dòng XML3 (01/11 - 20/11/2026) · Nhận diện các nhóm lỗi cốt lõi & Giải pháp xử lý triệt để"
    p2.font.size = Pt(14)
    p2.font.color.rgb = RGBColor(203, 213, 225)
    p2.space_after = Pt(24)

    p3 = tf1.add_paragraph()
    p3.text = "Báo cáo: Ban Giám đốc & Trưởng các Khoa Lâm sàng | Thực hiện: Nguyễn Sơn Nam (Nsnnam) | Hệ thống NsN_XMLcheck v2.17.0"
    p3.font.size = Pt(11)
    p3.font.color.rgb = TEAL

    # =========================================================================
    # SLIDE 2: CĂN CỨ PHÁP LÝ & QUY ĐỊNH XUẤT TOÁN KT251
    # =========================================================================
    s2 = prs.slides.add_slide(prs.slide_layouts[6])
    add_header(s2, "CĂN CỨ PHÁP LÝ & QUY ĐỊNH GIÁM ĐỊNH XUẤT TOÁN BHYT (KT251)")

    # 3 Cards
    cards_data = [
        ("THÔNG TƯ 39/2024/TT-BYT", "Quy định tỷ lệ giường ghép", [
            "Sửa đổi Điều 4c Thông tư số 35/2016/TT-BYT.",
            "Tại cùng một thời điểm, nếu người bệnh nằm ghép:",
            "• Ghép 2 người/giường: Thanh toán tối đa 50% tiền ngày giường.",
            "• Ghép từ 3 người trở lên: Thanh toán tối đa 33% tiền ngày giường.",
            "Nếu cơ sở KCB đề nghị thanh toán 100% -> Bị xuất toán toàn bộ phần chênh lệch!"
        ], TEAL),
        ("CÔNG VĂN & HƯỚNG DẪN BHXH", "Quy tắc kiểm tra KT251", [
            "Thời gian nằm trùng > 4 giờ (240 phút) trong cùng 1 ngày dương lịch trên cùng mã giường được tính là NẰM GHÉP.",
            "Kiểm tra cross-patient: Đối chiếu giữa các bệnh nhân khác nhau cùng mã khoa và cùng mã giường.",
            "Công thức tính xuất toán:",
            "Tiền xuất toán = SL x Đơn giá x Mức hưởng x (TYLE_TT - Tỷ lệ quy định)/100."
        ], ROSE),
        ("CƠ CHẾ GIÁM ĐỊNH TỰ ĐỘNG", "Rủi ro xuất toán hệ thống", [
            "Cổng Giám định BHYT quét tự động 100% dữ liệu XML3.",
            "Bất kỳ sự trùng lặp nào về mã giường hoặc trùng mốc thời gian đều bị hệ thống gắn cờ KT251 ngay lập tức.",
            "Dữ liệu 9 tháng đầu năm 2026: BHXH đã gửi thông báo xuất toán 3,47 TỶ ĐỒNG tiền giường ghép tại cơ sở!",
            "Cần rà soát và chuẩn hóa trước khi đẩy cổng."
        ], AMBER)
    ]

    for i, (ctitle, csub, points, color) in enumerate(cards_data):
        cx = Inches(0.8 + i * 3.95)
        cy = Inches(1.5)
        cw = Inches(3.8)
        ch = Inches(5.4)
        add_card(s2, cx, cy, cw, ch, WHITE, color)

        tb = s2.shapes.add_textbox(cx + Inches(0.25), cy + Inches(0.2), cw - Inches(0.5), ch - Inches(0.4))
        tf = tb.text_frame
        tf.word_wrap = True
        
        p = tf.paragraphs[0]
        p.text = ctitle
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = color
        
        p_sub = tf.add_paragraph()
        p_sub.text = csub
        p_sub.font.size = Pt(11)
        p_sub.font.bold = True
        p_sub.font.color.rgb = NAVY
        p_sub.space_after = Pt(12)

        for pt in points:
            pp = tf.add_paragraph()
            pp.text = pt
            pp.font.size = Pt(11)
            pp.font.color.rgb = SLATE_DARK
            pp.space_after = Pt(8)

    # =========================================================================
    # SLIDE 3: TỔNG QUAN DỮ LIỆU THỰC TẾ 20 NGÀY THÁNG 11/2026
    # =========================================================================
    s3 = prs.slides.add_slide(prs.slide_layouts[6])
    add_header(s3, "TỔNG QUAN DỮ LIỆU RÀ SOÁT THỰC TẾ (01/11 - 20/11/2026)")

    # 4 Stat KPI boxes
    kpis = [
        ("55.458", "TỔNG SỐ BẢN GHI XML3", "Dữ liệu chi phí toàn viện 20 ngày", TEAL),
        ("5.643", "CHI PHÍ NGÀY GIƯỜNG", "Nhóm 14 & 15 (1.371 bệnh nhân nội trú)", NAVY),
        ("580 dòng", "BỊ XUẤT TOÁN (ĐÃ GIỮ 546 CA)", "Giữ 1 giường cao nhất/0đ XT, xuất toán giường sau", ROSE),
        ("120.340.125 đ", "NGUY CƠ XUẤT TOÁN KT251", "Giảm 19,2 triệu đ so với cách tính thô ban đầu", ROSE)
    ]
    for i, (val, title, note, color) in enumerate(kpis):
        cx = Inches(0.8 + i * 2.95)
        cy = Inches(1.5)
        cw = Inches(2.85)
        ch = Inches(1.8)
        add_card(s3, cx, cy, cw, ch, WHITE, color)

        tb = s3.shapes.add_textbox(cx + Inches(0.15), cy + Inches(0.15), cw - Inches(0.3), ch - Inches(0.3))
        tf = tb.text_frame
        tf.word_wrap = True
        
        p = tf.paragraphs[0]
        p.text = val
        p.font.size = Pt(20)
        p.font.bold = True
        p.font.color.rgb = color
        
        p2 = tf.add_paragraph()
        p2.text = title
        p2.font.size = Pt(10)
        p2.font.bold = True
        p2.font.color.rgb = NAVY
        p2.space_after = Pt(4)

        p3 = tf.add_paragraph()
        p3.text = note
        p3.font.size = Pt(9)
        p3.font.color.rgb = MUTED

    # Bottom summary card
    add_card(s3, Inches(0.8), Inches(3.55), Inches(11.733), Inches(3.35), RGBColor(248, 250, 252), TEAL)
    tb_bot = s3.shapes.add_textbox(Inches(1.1), Inches(3.75), Inches(11.133), Inches(3.0))
    tf_bot = tb_bot.text_frame
    tf_bot.word_wrap = True

    p_bh = tf_bot.paragraphs[0]
    p_bh.text = "ĐÁNH GIÁ SƠ BỘ TÌNH HÌNH THANH QUYẾT TOÁN TIỀN GIƯỜNG THÁNG 11/2026:"
    p_bh.font.size = Pt(13)
    p_bh.font.bold = True
    p_bh.font.color.rgb = NAVY
    p_bh.space_after = Pt(8)

    notes = [
        "• Áp dụng chuẩn quy tắc giám định thực tế: Giữ lại 01 giường cao nhất/vào trước (546 giường, 0 đ xuất toán), chỉ xuất toán các giường phía sau (580 giường, 120.340.125 đ).",
        "• Lỗi giường gối đầu liên tiếp nhiều ngày chiếm đa số tuyệt đối (1.027 dòng vi phạm): Do thói quen xếp giường chồng chéo khi bệnh nhân cũ chưa ra viện đã xếp bệnh nhân mới vào cùng mã giường.",
        "• Có 428 lượt trùng mốc phút 12:00 cùng BN: Phân loại cảnh báo thủ tục (0 đ xuất toán trực tiếp), hỗ trợ nút bấm tự động lùi 1 phút (12:01).",
        "• Kê giường vượt quá giờ ra viện (NGAY_KQ > NGAY_RA): Là cảnh báo thủ tục hành chính, không xuất toán nếu không có BN khác nằm đè lên.",
        "• Phát hiện sai sót từ file BHXH (KT251): Có 451 ca trùng < 4h bị gắn cờ sai quy định nghiệp vụ công văn số 20261110_TAILIEUHUONGDAN; Bệnh viện có đầy đủ cơ sở yêu cầu hủy xuất toán!",
        "• Cần chuẩn hóa dữ liệu ngay để bảo toàn hơn 120 TRIỆU ĐỒNG chi phí ngày giường tháng 11/2026!"
    ]
    for n in notes:
        pn = tf_bot.add_paragraph()
        pn.text = n
        pn.font.size = Pt(11)
        pn.font.color.rgb = SLATE_DARK
        pn.space_after = Pt(6)

    # =========================================================================
    # SLIDE 4: PHÂN TÍCH 4 NHÓM LỖI CỐT LÕI
    # =========================================================================
    s4 = prs.slides.add_slide(prs.slide_layouts[6])
    add_header(s4, "PHÂN TÍCH 4 NHÓM LỖI CỐT LÕI VỀ TIỀN GIƯỜNG THƯỜNG GẶP")

    issues = [
        ("1. GIƯỜNG GỐI ĐẦU NHIỀU NGÀY", "1.020 dòng (90,9% lỗi)", ROSE, [
            "Hiện tượng: BN A vào từ 01/11 ra 10/11, BN B vào từ 05/11 ra 15/11. Cả 2 được xếp chung mã giường H001 tại cùng 1 khoa.",
            "Hậu quả: Từ ngày 05/11 đến 10/11 (6 ngày liên tiếp), hệ thống BHYT xác định nằm ghép 2 người suốt 24h/ngày. Xuất toán 50% tiền giường của cả 2 bệnh nhân trong suốt 6 ngày!",
            "Nguyên nhân: Điều dưỡng không kiểm tra mã giường thực tế khi gán trên phần mềm HIS."
        ]),
        ("2. GIƯỜNG GHÉP TRONG NGÀY (> 4H)", "102 dòng (9,1% lỗi)", AMBER, [
            "Hiện tượng: 2 bệnh nhân nằm cùng 1 mã giường trong ngày dương lịch có thời gian giao thoa nhau > 240 phút (4 giờ).",
            "Hậu quả: Bị áp mức thanh toán 50% (ghép 2 người) hoặc 33% (ghép 3+ người). Đơn vị đề nghị 100% sẽ bị xuất toán phần chênh lệch.",
            "Thường gặp: Khi bệnh nhân cũ chuẩn bị ra viện (buổi chiều) nhưng bệnh nhân mới đã vào nằm từ trưa mà không tách mã giường phụ."
        ]),
        ("3. TRÙNG PHÚT CHUYỂN TIẾP (CÙNG BN)", "428 lượt vi phạm", TEAL, [
            "Hiện tượng: Dòng ngày giường trước kết thúc lúc 12:00, dòng ngày sau bắt đầu đúng 12:00 (hoặc cùng là 07:53).",
            "Hậu quả: Tại thời điểm 12:00, bệnh nhân bị tính là đang nằm đồng thời 2 ngày giường hoặc trùng mốc giờ kê y lệnh.",
            "Hướng sửa chuẩn: Dòng sau bắt đầu từ 12:01 (+1 phút) hoặc dòng trước kết thúc lúc 11:59 (-1 phút)."
        ]),
        ("4. CHỒNG LẤN GIỜ GIƯỜNG CÙNG BN", "90 lượt vi phạm", PURPLE, [
            "Hiện tượng: Dòng sau bắt đầu trước khi dòng trước kết thúc (ví dụ dòng 1 đến 14:00 nhưng dòng 2 đã ghi bắt đầu từ 13:00).",
            "Hậu quả: Trùng thời gian nằm giường của cùng một người bệnh tại 2 khoa khác nhau hoặc cùng khoa.",
            "Nguyên nhân: Khi chuyển khoa hoặc chuyển buồng, điều dưỡng khoa nhận kê giờ trước giờ khoa chuyển bàn giao."
        ])
    ]

    for i, (ititle, isub, icolor, idesc) in enumerate(issues):
        col = i % 2
        row = i // 2
        ix = Inches(0.8 + col * 5.95)
        iy = Inches(1.5 + row * 2.8)
        iw = Inches(5.75)
        ih = Inches(2.6)
        add_card(s4, ix, iy, iw, ih, WHITE, icolor)

        tb = s4.shapes.add_textbox(ix + Inches(0.2), iy + Inches(0.15), iw - Inches(0.4), ih - Inches(0.3))
        tf = tb.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = ititle
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = icolor

        p_s = tf.add_paragraph()
        p_s.text = isub
        p_s.font.size = Pt(10)
        p_s.font.bold = True
        p_s.font.color.rgb = NAVY
        p_s.space_after = Pt(6)

        for d in idesc:
            pd = tf.add_paragraph()
            pd.text = d
            pd.font.size = Pt(10)
            pd.font.color.rgb = SLATE_DARK
            pd.space_after = Pt(4)

    # =========================================================================
    # SLIDE 5: THỐNG KÊ CHI TIẾT THEO KHOA LÂM SÀNG
    # =========================================================================
    s5 = prs.slides.add_slide(prs.slide_layouts[6])
    add_header(s5, "THỐNG KÊ NGUY CƠ XUẤT TOÁN THEO KHOA LÂM SÀNG (19 NGÀY T11/2026)")

    # Table with department breakdown
    rows = 12
    cols = 6
    left = Inches(0.8)
    top = Inches(1.5)
    width = Inches(11.733)
    height = Inches(5.3)

    table_shape = s5.shapes.add_table(rows, cols, left, top, width, height)
    tbl = table_shape.table
    tbl.columns[0].width = Inches(1.8) # Khoa
    tbl.columns[1].width = Inches(1.8) # Tổng dòng lỗi
    tbl.columns[2].width = Inches(2.2) # Gối đầu >= 2 ngày
    tbl.columns[3].width = Inches(1.5) # Số BN
    tbl.columns[4].width = Inches(1.6) # Số mã giường
    tbl.columns[5].width = Inches(2.833) # Tiền nguy cơ xuất toán

    headers = ["Khoa điều trị", "Tổng dòng lỗi", "Gối đầu liên tiếp", "Số BN liên quan", "Số mã giường", "Nguy cơ xuất toán (VNĐ)"]
    for col_idx, h in enumerate(headers):
        cell = tbl.cell(0, col_idx)
        cell.text = h
        cell.fill.solid()
        cell.fill.fore_color.rgb = NAVY
        for p in cell.text_frame.paragraphs:
            p.font.size = Pt(11)
            p.font.bold = True
            p.font.color.rgb = WHITE
            p.alignment = PP_ALIGN.CENTER

    dept_rows = [
        ("Khoa K33 (Nội/YHCT)", "322 dòng", "312 dòng (97%)", "86 BN", "27 giường", "39.445.000 đ"),
        ("Khoa K02 (HSCC/Cấp cứu)", "327 dòng", "254 dòng (78%)", "129 BN", "24 giường", "37.106.300 đ"),
        ("Khoa K33.2 (Nội 2)", "189 dòng", "187 dòng (99%)", "44 BN", "17 giường", "23.152.500 đ"),
        ("Khoa K19.2 (Ngoại 2)", "149 dòng", "138 dòng (93%)", "57 BN", "16 giường", "18.192.700 đ"),
        ("Khoa K19.1 (Ngoại 1)", "90 dòng", "78 dòng (87%)", "42 BN", "12 giường", "10.249.100 đ"),
        ("Khoa K18 (Chấn thương)", "28 dòng", "10 dòng", "24 BN", "10 giường", "3.430.000 đ"),
        ("Khoa K03.2", "26 dòng", "10 dòng", "18 BN", "6 giường", "2.743.000 đ"),
        ("Khoa K27", "24 dòng", "16 dòng", "22 BN", "8 giường", "2.653.800 đ"),
        ("Khoa K1631", "18 dòng", "18 dòng", "12 BN", "6 giường", "1.522.800 đ"),
        ("Khoa K18.1 & K03.1", "10 dòng", "4 dòng", "10 BN", "4 giường", "1.070.250 đ"),
        ("TỔNG CỘNG TOÀN VIỆN", "1.183 dòng", "1.027 dòng (86,8%)", "444 BN", "130 giường", "139.565.450 đ")
    ]

    for r_idx, row_vals in enumerate(dept_rows):
        is_total = r_idx == len(dept_rows) - 1
        for c_idx, val in enumerate(row_vals):
            cell = tbl.cell(r_idx + 1, c_idx)
            cell.text = val
            cell.fill.solid()
            if is_total:
                cell.fill.fore_color.rgb = RGBColor(254, 226, 226) # rose-100
            elif r_idx % 2 == 1:
                cell.fill.fore_color.rgb = SLATE_LIGHT
            else:
                cell.fill.fore_color.rgb = WHITE
                
            for p in cell.text_frame.paragraphs:
                p.font.size = Pt(10)
                if is_total:
                    p.font.bold = True
                    p.font.color.rgb = ROSE
                elif c_idx == 0:
                    p.font.bold = True
                    p.font.color.rgb = NAVY
                elif c_idx == 5:
                    p.font.bold = True
                    p.font.color.rgb = ROSE
                else:
                    p.font.color.rgb = SLATE_DARK
                if c_idx > 0:
                    p.alignment = PP_ALIGN.RIGHT

    # =========================================================================
    # SLIDE 6: ĐIỂM NÓNG CÁC BUỒNG / GIƯỜNG VI PHẠM ĐIỂN HÌNH
    # =========================================================================
    s6 = prs.slides.add_slide(prs.slide_layouts[6])
    add_header(s6, "ĐIỂM NÓNG: CÁC MÃ GIƯỜNG VI PHẠM GỐI ĐẦU ĐIỂN HÌNH")

    hotspots = [
        ("KHOA K33 · MÃ GIƯỜNG H010", "Gối đầu liên tiếp 11 ngày (6 BN cùng nằm)", ROSE, [
            "• BN Nghiêm Văn Thêm (LK 2354045) và BN Nguyễn Văn Đen (LK 2354063) cùng được xếp giường H010.",
            "• Thời gian trùng nhau: Kéo dài liên tục suốt 11 ngày (từ 20/10 đến 30/10/2026).",
            "• Tổng cộng 30 dòng chi phí giường bị ảnh hưởng trên giường này với 6 bệnh nhân luân phiên.",
            "• Tiền nguy cơ xuất toán: 3.626.000 đ riêng cho giường H010!"
        ]),
        ("KHOA K02 · MÃ GIƯỜNG H006 & H018", "HSCC: Gối đầu liên tiếp 6 ngày", ROSE, [
            "• BN Lê Thị Phúc (LK 2351031) và BN Phan Thị Duyên (LK 2355702) cùng nằm giường H006 suốt 6 ngày.",
            "• Giường H018 (Khoa K02): Có tới 8 bệnh nhân khác nhau được xếp trùng vào giường này (29 dòng lỗi).",
            "• Tiền nguy cơ xuất toán riêng 2 giường: H016 (3,2 triệu đ) và H018 (2,95 triệu đ).",
            "• Khoa Cấp cứu / HSCC có lưu lượng bệnh nhân biến động cao nhưng chưa có quy trình trả giường trên phần mềm."
        ]),
        ("KHOA K33.2 & K19.2", "Gối đầu 100% thời gian nằm viện", AMBER, [
            "• Khoa K33.2: 100% dòng lỗi đều là giường gối đầu liên tiếp nhiều ngày (187 / 187 dòng).",
            "• Giường H016 (Khoa K33.2): 23 dòng chi phí gối đầu liên tục giữa 3 bệnh nhân, xuất toán 3.212.565 đ.",
            "• Khoa K19.2 (Ngoại 2): Giường H001 và H004 liên tục gối đầu giữa các bệnh nhân phẫu thuật.",
            "• Dẫn chứng rõ ràng việc phân bổ giường chỉ mang tính hình thức trên giấy tờ/phần mềm!"
        ])
    ]

    for i, (htitle, hsub, hcolor, hdesc) in enumerate(hotspots):
        hx = Inches(0.8 + i * 3.95)
        hy = Inches(1.5)
        hw = Inches(3.8)
        hh = Inches(5.4)
        add_card(s6, hx, hy, hw, hh, WHITE, hcolor)

        tb = s6.shapes.add_textbox(hx + Inches(0.2), hy + Inches(0.2), hw - Inches(0.4), hh - Inches(0.4))
        tf = tb.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = htitle
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = hcolor

        p_s = tf.add_paragraph()
        p_s.text = hsub
        p_s.font.size = Pt(11)
        p_s.font.bold = True
        p_s.font.color.rgb = NAVY
        p_s.space_after = Pt(12)

        for d in hdesc:
            pd = tf.add_paragraph()
            pd.text = d
            pd.font.size = Pt(10)
            pd.font.color.rgb = SLATE_DARK
            pd.space_after = Pt(8)

    # =========================================================================
    # SLIDE 7: NGUYÊN NHÂN GỐC RỄ
    # =========================================================================
    s7 = prs.slides.add_slide(prs.slide_layouts[6])
    add_header(s7, "PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE ANALYSIS)")

    causes = [
        ("1. QUY TRÌNH QUẢN LÝ BUỒNG GIƯỜNG", TEAL, [
            "• Chưa có bước 'Trả giường' hoặc 'Kiểm tra trạng thái trống' trước khi gán giường cho BN mới.",
            "• Điều dưỡng thường chọn theo thói quen danh sách các mã giường quen thuộc (H001, H002, H010...).",
            "• Khi bệnh nhân ra viện hoặc chuyển khoa, hồ sơ chưa được đóng trên HIS khiến mã giường vẫn bị 'chiếm dụng' trên hệ thống điện tử."
        ]),
        ("2. THÓI QUEN NHẬP THỜI GIAN TRÒN GIỜ", AMBER, [
            "• 428 trường hợp trùng mốc số phút chuyển tiếp (12:00 -> 12:00, 07:53 -> 07:53).",
            "• Nhân viên nhập liệu có thói quen copy paste giờ hoặc chọn giờ tròn, không để ý nguyên tắc mốc thời gian không được giao cắt.",
            "• Phần mềm HIS chưa có cảnh báo tức thời (real-time validation) khi điều dưỡng nhập giờ trùng."
        ]),
        ("3. ĐIỀU CHUYỂN BỆNH NHÂN ĐAN XEN", PURPLE, [
            "• Bệnh nhân chuyển từ HSCC sang Khoa Nội/Ngoại nhưng giờ bắt đầu tại khoa mới lại sớm hơn giờ kết thúc tại khoa cũ.",
            "• Thiếu sự phối hợp bàn giao giờ chốt viện phí giữa điều dưỡng 2 khoa lâm sàng.",
            "• Dẫn đến lỗi nằm 2 giường cùng lúc tại 2 khoa khác nhau."
        ]),
        ("4. KHÂU RÀ SOÁT TRƯỚC KHI ĐẨY CỔNG", ROSE, [
            "• Trước đây, bệnh viện chưa có công cụ kiểm tra chéo (cross-patient checking) giữa các file XML3.",
            "• Chỉ kiểm tra lỗi nội bộ từng bệnh nhân riêng lẻ nên KHÔNG THỂ phát hiện được việc 2 bệnh nhân nằm trùng mã giường.",
            "• Chỉ đến khi BHXH gửi kết quả cảnh báo KT251 về thì mới phát hiện số tiền xuất toán khổng lồ."
        ])
    ]

    for i, (ctitle, ccolor, citems) in enumerate(causes):
        cx = Inches(0.8 + (i % 2) * 5.95)
        cy = Inches(1.5 + (i // 2) * 2.8)
        cw = Inches(5.75)
        ch = Inches(2.6)
        add_card(s7, cx, cy, cw, ch, WHITE, ccolor)

        tb = s7.shapes.add_textbox(cx + Inches(0.2), cy + Inches(0.15), cw - Inches(0.4), ch - Inches(0.3))
        tf = tb.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = ctitle
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = ccolor
        p.space_after = Pt(8)

        for it in citems:
            pi = tf.add_paragraph()
            pi.text = it
            pi.font.size = Pt(10)
            pi.font.color.rgb = SLATE_DARK
            pi.space_after = Pt(6)

    # =========================================================================
    # SLIDE 8: HƯỚNG DẪN KHỐI CHUYÊN MÔN - NGUYÊN TẮC CHUẨN HÓA
    # =========================================================================
    s8 = prs.slides.add_slide(prs.slide_layouts[6])
    add_header(s8, "HƯỚNG DẪN KHỐI CHUYÊN MÔN: NGUYÊN TẮC CHUẨN HÓA KÊ GIƯỜNG")

    guidelines = [
        ("QUY TẮC 1: NGUYÊN TẮC '1 PHÚT CHUYỂN TIẾP'", TEAL, [
            "• Tuyệt đối KHÔNG kê giờ kết thúc ngày trước bằng đúng giờ bắt đầu ngày sau (12:00 -> 12:00).",
            "• CÔNG THỨC CHUẨN: Ngày trước kết thúc lúc 12:00, Ngày sau phải bắt đầu từ 12:01 (+1 phút).",
            "• Hoặc ngày trước kết thúc lúc 11:59 (-1 phút), ngày sau bắt đầu lúc 12:00.",
            "• Áp dụng tương tự khi chuyển khoa: Giờ nhận tại khoa mới phải sau giờ bàn giao tại khoa cũ ít nhất 1 phút."
        ]),
        ("QUY TẮC 2: QUẢN LÝ MÃ GIƯỜNG TUYỆT ĐỐI KHÔNG TRÙNG", ROSE, [
            "• Nguyên tắc 1 giường - 1 bệnh nhân: Mỗi mã giường tại khoa chỉ được gắn cho 1 bệnh nhân trong cùng khoảng thời gian.",
            "• Khi bệnh nhân cũ ra viện: Phải hoàn tất thủ tục xuất khoa trên HIS trước khi gán giường đó cho bệnh nhân mới.",
            "• Trường hợp bệnh nhân cũ ra viện buổi chiều (15h) và bệnh nhân mới vào buổi sáng (9h): Bệnh nhân mới phải được xếp vào giường khác hoặc mã giường tạm."
        ]),
        ("QUY TẮC 3: XỬ LÝ KHI QUÁ TẢI PHẢI GHÉP GIƯỜNG", AMBER, [
            "• Khi khoa thực sự quá tải và phải nằm ghép: Bắt buộc phải điều chỉnh tỷ lệ thanh toán TYLE_TT ngay trên HIS.",
            "• Nằm ghép 2 người: Đặt TYLE_TT = 50%.",
            "• Nằm ghép 3 người trở lên: Đặt TYLE_TT = 33%.",
            "• Khi chủ động kê đúng tỷ lệ 50% hoặc 33%, BHYT sẽ chấp nhận thanh toán hợp lệ và KHÔNG XUẤT TOÁN!"
        ])
    ]

    for i, (gtitle, gcolor, gitems) in enumerate(guidelines):
        gx = Inches(0.8 + i * 3.95)
        gy = Inches(1.5)
        gw = Inches(3.8)
        gh = Inches(5.4)
        add_card(s8, gx, gy, gw, gh, WHITE, gcolor)

        tb = s8.shapes.add_textbox(gx + Inches(0.2), gy + Inches(0.2), gw - Inches(0.4), gh - Inches(0.4))
        tf = tb.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = gtitle
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = gcolor
        p.space_after = Pt(12)

        for git in gitems:
            pg = tf.add_paragraph()
            pg.text = git
            pg.font.size = Pt(10)
            pg.font.color.rgb = SLATE_DARK
            pg.space_after = Pt(8)

    # =========================================================================
    # SLIDE 9: GIẢI PHÁP VỚI ỨNG DỤNG NsN_XMLcheck v2.17.0
    # =========================================================================
    s9 = prs.slides.add_slide(prs.slide_layouts[6])
    add_header(s9, "ỨNG DỤNG CÔNG CỤ NsN_XMLcheck v2.17.0 TRONG KIỂM SOÁT BHYT")

    features = [
        ("RÀ SOÁT TỰ ĐỘNG & GIỮ LẠI 1 GIƯỜNG", "Chuẩn hóa theo thực tế giám định BHYT", [
            "• Tự động gom cụm bệnh nhân trùng giường: Giữ lại 01 giường cao nhất/vào trước (0đ XT).",
            "• Chỉ tính xuất toán cho giường thứ 2 trở đi: Giúp phản ánh đúng thực tế, giảm thiểu 50% số tiền phạt thô.",
            "• Phân định rõ cảnh báo thủ tục hành chính: Giờ kê giường vượt giờ ra viện (NGAY_KQ > NGAY_RA) không bị tính xuất toán phạt tiền.",
            "• Quét tự động 55.000+ dòng XML3 trong vòng dưới 7 giây chuẩn GMT+7."
        ]),
        ("BÁO CÁO & INFOGRAPHICS TƯƠNG TÁC", "Trực quan sinh động - Lọc đa chiều tức thì", [
            "• Xuất Infographic HTML độc lập: Lọc cùng lúc theo Loại lỗi, Khoa phòng, Mức độ rủi ro (Xuất toán vs Cảnh báo).",
            "• TÍCH HỢP XUẤT EXCEL TRỰC TIẾP TỪ INFOGRAPHIC: Cho phép tải file Excel đối chiếu chuẩn ngay trên trình duyệt.",
            "• Giao diện mã màu chuyên biệt: Đỏ (bị xuất toán), Xanh ngọc (giữ lại 0đ), Cam (vượt giờ ra), Tím (trùng phút).",
            "• Hỗ trợ chọn dải hồ sơ bằng phím Shift hoặc Ctrl để sửa hàng loạt cực nhanh."
        ]),
        ("THAO TÁC HÀNG LOẠT & TỰ ĐỘNG HÓA", "Tiết kiệm 95% thời gian xử lý thủ công", [
            "• Nút sửa nhanh 1 phút: '+1p vào TH_YL' và '-1p ở NGAY_KQ'.",
            "• Nút 1 chạm: '🏥 Đặt NGAY_KQ = Giờ ra viện' chuẩn hóa thời gian kết thúc với XML1.",
            "• 2 nút áp tỷ lệ giường ghép tự động: 'Giảm tỷ lệ về 50% (Ghép 2)' và 'Giảm về 33% (Ghép 3+)'.",
            "• Xuất kế hoạch sửa nạp tự động vào tiện ích VNPT-HIS Extension không cần nhập tay."
        ])
    ]

    for i, (ftitle, fsub, fitems) in enumerate(features):
        fx = Inches(0.8 + i * 3.95)
        fy = Inches(1.5)
        fw = Inches(3.8)
        fh = Inches(5.4)
        add_card(s9, fx, fy, fw, fh, WHITE, TEAL)

        tb = s9.shapes.add_textbox(fx + Inches(0.2), fy + Inches(0.2), fw - Inches(0.4), fh - Inches(0.4))
        tf = tb.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = ftitle
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = TEAL

        p_s = tf.add_paragraph()
        p_s.text = fsub
        p_s.font.size = Pt(10)
        p_s.font.bold = True
        p_s.font.color.rgb = NAVY
        p_s.space_after = Pt(12)

        for fit in fitems:
            pf = tf.add_paragraph()
            pf.text = fit
            pf.font.size = Pt(10)
            pf.font.color.rgb = SLATE_DARK
            pf.space_after = Pt(8)

    # =========================================================================
    # SLIDE 10: KIẾN NGHỊ BAN GIÁM ĐỐC & KẾ HOẠCH HÀNH ĐỘNG
    # =========================================================================
    s10 = prs.slides.add_slide(prs.slide_layouts[6])
    add_header(s10, "KIẾN NGHỊ BAN GIÁM ĐỐC & KẾ HOẠCH HÀNH ĐỘNG CẤP BÁCH")

    plans = [
        ("1. HÀNH ĐỘNG NGAY TRONG TUẦN", ROSE, [
            "• Sử dụng công cụ NsN_XMLcheck v2.17.0 để rà soát toàn bộ dữ liệu XML3 tháng 11/2026.",
            "• Với 1.027 dòng giường gối đầu liên tiếp: Yêu cầu các khoa K33, K02, K33.2, K19.2 kiểm tra bệnh án gốc, điều chỉnh mã giường đúng thực tế.",
            "• Kiến nghị BHXH loại trừ 451 ca trùng < 4h: Căn cứ hướng dẫn số 20261110_TAILIEUHUONGDAN để bảo toàn chi phí.",
            "• Với 428 ca trùng phút: Áp dụng quy tắc cộng 1 phút (+1p) cho giờ bắt đầu ngày giường sau.",
            "• Bảo toàn hơn 120 TRIỆU ĐỒNG chi phí ngày giường không bị cơ quan BHXH xuất toán."
        ]),
        ("2. HOÀN THIỆN QUY TRÌNH NỘI BỘ", AMBER, [
            "• Ban hành Quy định chuẩn hóa kê ngày giường & chuyển khoa trong toàn viện.",
            "• Bắt buộc điều dưỡng phải xác nhận 'Bệnh nhân đã ra viện / Trả giường' trên phần mềm trước khi tiếp nhận bệnh nhân mới vào mã giường đó.",
            "• Kiểm soát giờ ra viện: Đảm bảo NGAY_KQ kết thúc kê giường luôn <= NGAY_RA trên hồ sơ XML1.",
            "• Giao phòng KHTH và Điều dưỡng trưởng kiểm tra xác suất hằng tuần."
        ]),
        ("3. ĐỀ NGHỊ ĐƠN VỊ PHẦN MỀM HIS", TEAL, [
            "• Đề nghị đối tác VNPT-HIS bổ sung cảnh báo chặn (hard validation): Cảnh báo khi xếp bệnh nhân vào mã giường đang có người nằm.",
            "• Tự động mặc định giờ chuyển tiếp ngày giường cộng 1 phút (ví dụ 12:01 thay vì 12:00).",
            "• Tích hợp tính năng tự động gợi ý tỷ lệ 50% hoặc 33% khi phát hiện quá tải ghép giường."
        ])
    ]

    for i, (ptitle, pcolor, pitems) in enumerate(plans):
        px = Inches(0.8 + i * 3.95)
        py = Inches(1.5)
        pw = Inches(3.8)
        ph = Inches(5.4)
        add_card(s10, px, py, pw, ph, WHITE, pcolor)

        tb = s10.shapes.add_textbox(px + Inches(0.2), py + Inches(0.2), pw - Inches(0.4), ph - Inches(0.4))
        tf = tb.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = ptitle
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = pcolor
        p.space_after = Pt(12)

        for pit in pitems:
            pp = tf.add_paragraph()
            pp.text = pit
            pp.font.size = Pt(11)
            pp.font.color.rgb = SLATE_DARK
            pp.space_after = Pt(8)

    prs.save(output_path)
    print(f"Presentation saved successfully to: {output_path}")

if __name__ == "__main__":
    out_file = sys.argv[1] if len(sys.argv) > 1 else "Bao_cao_giuong_ghep_va_tien_giuong_BHXH.pptx"
    create_deck(out_file)
