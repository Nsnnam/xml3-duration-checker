# Hướng dẫn NsN_XMLcheck

## Phạm vi

**NsN_XMLcheck** là công cụ kiểm tra thời gian thực hiện–kết quả của dịch vụ kỹ thuật và vật tư y tế trong **Bảng XML3** (bao gồm cả quy ước thời gian tối thiểu và tối đa), đồng thời kiểm tra thông tin thầu `TT_THAU` trong **XML2** và **XML3**, định dạng CCCD trong **XML1** và kết luận trong **XML4**. Ứng dụng không tra cứu ICD, không sửa file nguồn và không gửi dữ liệu lên máy chủ.

## Cách thực hiện

1. Mở ứng dụng, chọn một hoặc nhiều file XML hồ sơ có XML1, XML2, XML3 và/hoặc XML4, sau đó bấm **Bắt đầu Phân tích XML**.
2. Công cụ tự động nối thông tin bệnh nhân giữa XML1 và XML3 bằng `MA_LK`.
3. Công cụ tìm các phần `FILEHOSO`, giải mã `NOIDUNGFILE` từ Base64 và thực hiện kiểm tra toàn bộ tiêu chí.

## Quy tắc kiểm tra thời lượng XML3

- Giao diện hỗ trợ 18 mã nhóm theo Phụ lục 3 QĐ 5937. Nhóm `2, 3, 8, 18` luôn bắt buộc kiểm tra thời lượng; các ô tích dùng để mở rộng thêm nhóm hiển thị.
- Trình tự bắt buộc: `NGAY_YL (chỉ định) → NGAY_TH_YL (thực hiện) → NGAY_KQ (kết quả)`.
- Công thức: `Số phút = NGAY_KQ - NGAY_TH_YL`.
- **Quy ước thời gian tối thiểu**: Mặc định thời gian thực hiện phải **`> 0 phút`** (tối thiểu 1 phút). Nếu `Số phút = 0` hoặc nhỏ hơn ngưỡng tối thiểu riêng của dịch vụ, hệ thống sẽ cảnh báo:
  - `Thời lượng 0 phút (yêu cầu thời gian > 0 phút)` hoặc
  - `Thời lượng X phút nhỏ hơn thời gian tối thiểu quy định (Y phút)`.
- **Quy ước thời gian tối đa**: Cảnh báo khi số phút **lớn hơn 70 phút** (hoặc vượt ngưỡng tối đa riêng được cấu hình trong Thư viện). Đúng 70 phút không bị cảnh báo.
- Cảnh báo **SAI THỨ TỰ** khi mốc thời gian bị ngược và **TRÙNG MỐC** khi các mốc trùng nhau.

## Quy tắc kiểm tra thông tin thầu TT_THAU & Danh mục Thuốc loại trừ

- **XML2 (Thuốc)**: Cột 15 `TT_THAU` bắt buộc không được để rỗng (null). Nếu để trống, hệ thống đưa ra cảnh báo: `XML2. Chi tiết thứ xxx: Thiếu thông tin TT_THAU`.
  - Nếu mã thuốc thuộc danh mục **Thuốc loại trừ XML2** đã được lưu trong Thư viện (hoặc bấm `🛡️ Loại trừ thuốc` trực tiếp trên dòng cảnh báo), hệ thống sẽ bỏ qua và không tạo cảnh báo.
- **XML3 (DVKT & VTYT)**: Với trường hợp mã nhóm ở cột 6 `MA_NHOM` bằng `10` hoặc `11` (Vật tư y tế), bắt buộc cột `TT_THAU` không được để rỗng (null). Nếu để trống, hệ thống đưa ra cảnh báo: `XML3: TT_THAU không được để trống khi mã nhóm bằng 10 hoặc 11`.

## Nhập / Xuất Excel Thư viện & File Mẫu

- **Tải Excel mẫu**: Bấm **`📥 Tải Excel mẫu`** để tải về file Excel chuẩn (`mau_nhap_thu_vien_nsn_xmlcheck.xlsx`) gồm 2 sheet:
  1. `DVKT_VTYT`: Cột `MA_DICH_VU`, `TEN_DICH_VU`, `THOI_GIAN_TOI_THIEU_PHUT`, `THOI_GIAN_TOI_DA_PHUT`, `LOAI_TRU_HOAN_TOAN`, `GHI_CHU`.
  2. `THUOC_XML2`: Cột `MA_THUOC`, `TEN_THUOC`, `LOAI_TRU_TT_THAU`, `GHI_CHU`.
- **Nạp danh mục từ Excel**: Bấm **`📤 Nạp từ Excel`** và chọn file Excel để nhập danh mục với 2 chế độ:
  - **Gộp (Merge)**: Thêm các dịch vụ mới, cập nhật dịch vụ trùng mã và giữ nguyên các dịch vụ cũ.
  - **Ghi đè (Overwrite)**: Xóa toàn bộ thư viện hiện tại và thay bằng dữ liệu trong file Excel.
- **Xuất Excel Thư viện**: Bấm **`📊 Xuất Excel Thư viện`** để xuất toàn bộ quy tắc ra file `.xlsx`.

## Tùy biến cột (Ẩn/Hiện & Kéo giãn) trên tất cả các tab

- Người dùng có thể bấm nút **`⚙️ Tùy chỉnh cột`** ở mọi tab cảnh báo (**XML1, XML2, XML3, XML4**) để chọn ẩn hoặc hiện bất kỳ cột nào.
- Kéo thả trực tiếp tại viền phải tiêu đề từng cột để điều chỉnh độ rộng linh hoạt. Kích thước và trạng thái ẩn/hiện được tự động lưu theo từng tab vào trình duyệt.

## Tra cứu & Xem hồ sơ 15 bảng XML

- Chuyển sang tab **`📂 Hồ sơ & Xem XML 15 bảng`** hoặc bấm biểu tượng **`📂`** cạnh cột `MA_LK` trên bảng cảnh báo để mở ngay hồ sơ bệnh nhân.
- Cho phép tra cứu bất kỳ bệnh nhân nào (cả bệnh nhân có cảnh báo lỗi và bệnh nhân sạch lỗi đạt chuẩn).
- Chọn xem từng bảng trong số **15 bảng XML** theo chuẩn BHYT QĐ 130 / QĐ 4210 (XML1: Tổng hợp KCB, XML2: Thuốc, XML3: DVKT & VTYT, XML4: Cận lâm sàng, XML5: Diễn biến lâm sàng, XML6: Phục hồi chức năng, XML7: Y học cổ truyền, XML8: Tóm tắt bệnh án, XML9: Giấy chứng sinh, XML10: Nghỉ dưỡng thai, XML11: Nghỉ việc BHXH, XML12: Chuyển tuyến, XML13: Hẹn khám lại, XML14: Bảng kê chi phí, XML15: Giám định & phản hồi).
- Hỗ trợ 2 chế độ hiển thị:
  - **Bảng dữ liệu (Data Grid)**: bảng trực quan có bộ lọc tìm kiếm nội bộ theo từng trường thông tin.
  - **Mã XML gốc (Raw XML)**: xem mã XML gốc có định dạng thụt lề, hỗ trợ nút **Sao chép** (Copy) và nút **Tải file XML**.

## Hovercard Xem nhanh Thông tin Bệnh nhân

- Khi di chuột (hover) vào bất kỳ dòng cảnh báo nào trong các tab **XML1, XML2, XML3, XML4**, một popup thông minh sẽ lập tức xuất hiện hiển thị:
  - Thông tin hành chính bệnh nhân (họ tên, giới tính, CCCD, số thẻ BHYT, nơi ĐKBĐ, chẩn đoán bệnh từ XML1).
  - Quá trình điều trị viện phí: Ngày vào viện (`NGAY_VAO`) và Ngày ra viện (`NGAY_RA`).
  - Đối với cảnh báo XML3: hiển thị chi tiết thời gian chỉ định (`NGAY_YL`), thực hiện (`NGAY_TH_YL`), trả kết quả (`NGAY_KQ`), tổng số phút thực hiện và so sánh với thời gian nằm viện.
  - Nội dung cảnh báo vi phạm chi tiết và nút **`🔍 Xem hồ sơ 15 bảng`** để nhảy thẳng sang hồ sơ bệnh nhân.

## Kho Giao diện (Theme Gallery) & Font chữ Tiếng Việt

- Bấm nút **`🎨 Giao diện & Font`** trên thanh điều hướng để mở bảng tùy biến phong cách:
  - **Kho giao diện hiện đại & kỹ thuật số**: 5 bộ theme preset được thiết kế hài hòa 100% về màu sắc giữa tiêu đề, bảng, thẻ và nút bấm:
    1. *Clinical Teal*: Chuẩn Y tế Hiện đại (Light, ngọc bích trang nhã).
    2. *Cyber Digital*: Kỹ thuật số Y tế Neon (Dark Obsidian 4.0, Cyan Neon phát quang).
    3. *Luxury Obsidian*: Doanh nghiệp Đẳng cấp (Dark Obsidian, Vàng Gold hoàng gia).
    4. *Ocean Digital*: Xanh Đại Dương Kỹ thuật số (Light, tươi mới, thanh thoát).
    5. *Pure Minimalist*: Trắng Tối giản Hiện đại (Slate xám tinh gọn).
  - **Bộ chọn Font chữ**: Với font chữ chủ đạo là **Be Vietnam Pro** (kèm Inter, Plus Jakarta Sans, Lexend, Roboto), hiển thị tiếng Việt sắc nét, chuẩn y tế và tự động lưu lựa chọn vào trình duyệt.

## Sao lưu (Backup) & Gửi Telegram

- Cho phép tải file backup JSON riêng cho Thư viện hoặc toàn bộ cấu hình trang (bao gồm cả cấu hình cột và thuốc loại trừ).
- Cho phép khôi phục (Restore) lại dữ liệu từ file backup JSON bất cứ lúc nào.
- Cấu hình Telegram với Bot Token và Chat ID để nhận file báo cáo Excel phân tích và file backup cấu hình trực tiếp qua Telegram.
