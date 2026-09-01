# Hướng dẫn NsN_XMLcheck

## Phạm vi

**NsN_XMLcheck** là công cụ kiểm tra thời gian thực hiện–kết quả của dịch vụ kỹ thuật và vật tư y tế trong **Bảng XML3**, đồng thời kiểm tra thông tin thầu `TT_THAU` trong **XML2** và **XML3**, định dạng CCCD trong **XML1** và kết luận trong **XML4**. Ứng dụng không tra cứu ICD, không sửa file nguồn và không gửi dữ liệu lên máy chủ.

## Cách thực hiện

1. Mở ứng dụng, chọn một hoặc nhiều file XML hồ sơ có XML1, XML2, XML3 và/hoặc XML4, sau đó bấm **Bắt đầu Phân tích XML**.
2. Công cụ tự động nối thông tin bệnh nhân giữa XML1 và XML3 bằng `MA_LK`.
3. Công cụ tìm các phần `FILEHOSO`, giải mã `NOIDUNGFILE` từ Base64 và thực hiện kiểm tra toàn bộ tiêu chí.

## Quy tắc kiểm tra thời lượng XML3

- Giao diện hỗ trợ 18 mã nhóm theo Phụ lục 3 QĐ 5937. Nhóm `2, 3, 8, 18` luôn bắt buộc kiểm tra thời lượng; các ô tích dùng để mở rộng thêm nhóm hiển thị.
- Trình tự bắt buộc: `NGAY_YL (chỉ định) → NGAY_TH_YL (thực hiện) → NGAY_KQ (kết quả)`.
- Công thức: `Số phút = NGAY_KQ - NGAY_TH_YL`.
- Cảnh báo khi số phút **lớn hơn 70 phút** (hoặc vượt ngưỡng riêng được cấu hình trong Thư viện). Đúng 70 phút không bị cảnh báo.
- Cảnh báo **SAI THỨ TỰ** khi mốc thời gian bị ngược và **TRÙNG MỐC** khi các mốc trùng nhau.

## Quy tắc kiểm tra thông tin thầu TT_THAU & Danh mục Thuốc loại trừ

- **XML2 (Thuốc)**: Cột 15 `TT_THAU` bắt buộc không được để rỗng (null). Nếu để trống, hệ thống đưa ra cảnh báo: `XML2. Chi tiết thứ xxx: Thiếu thông tin TT_THAU`.
  - Nếu mã thuốc thuộc danh mục **Thuốc loại trừ XML2** đã được lưu trong Thư viện (hoặc bấm `🛡️ Loại trừ thuốc` trực tiếp trên dòng cảnh báo), hệ thống sẽ bỏ qua và không tạo cảnh báo.
- **XML3 (DVKT & VTYT)**: Với trường hợp mã nhóm ở cột 6 `MA_NHOM` bằng `10` hoặc `11` (Vật tư y tế), bắt buộc cột `TT_THAU` không được để rỗng (null). Nếu để trống, hệ thống đưa ra cảnh báo: `XML3: TT_THAU không được để trống khi mã nhóm bằng 10 hoặc 11`.

## Tùy biến cột (Ẩn/Hiện & Kéo giãn) trên tất cả các tab

- Người dùng có thể bấm nút **`⚙️ Tùy chỉnh cột`** ở mọi tab cảnh báo (**XML1, XML2, XML3, XML4**) để chọn ẩn hoặc hiện bất kỳ cột nào.
- Kéo thả trực tiếp tại viền phải tiêu đề từng cột để điều chỉnh độ rộng linh hoạt. Kích thước và trạng thái ẩn/hiện được tự động lưu theo từng tab vào trình duyệt.

## Thư viện Dịch vụ & Thuốc

- **Tab Dịch vụ kỹ thuật & VTYT**: Thêm mới, chỉnh sửa inline tên dịch vụ, loại trừ hoặc đặt ngưỡng thời gian riêng, kèm bộ công cụ **Simulator** thử nghiệm số phút.
- **Tab Thuốc loại trừ XML2**: Quản lý danh mục các mã thuốc không cần báo thiếu `TT_THAU` trong XML2, kèm bộ thử nghiệm mã thuốc.

## Sao lưu (Backup) & Gửi Telegram

- Cho phép tải file backup JSON riêng cho Thư viện hoặc toàn bộ cấu hình trang (bao gồm cả cấu hình cột và thuốc loại trừ).
- Cho phép khôi phục (Restore) lại dữ liệu từ file backup JSON bất cứ lúc nào.
- Cấu hình Telegram với Bot Token và Chat ID để nhận file báo cáo Excel phân tích và file backup cấu hình trực tiếp qua Telegram.
