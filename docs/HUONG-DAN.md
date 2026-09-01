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

## Quy tắc kiểm tra thông tin thầu TT_THAU

- **XML2 (Thuốc)**: Cột 15 `TT_THAU` bắt buộc không được để rỗng (null). Nếu để trống, hệ thống đưa ra cảnh báo: `XML2. Chi tiết thứ xxx: Thiếu thông tin TT_THAU` (với `xxx` là số thứ tự chi tiết).
- **XML3 (DVKT & VTYT)**: Với trường hợp mã nhóm ở cột 6 `MA_NHOM` bằng `10` hoặc `11` (Vật tư y tế), bắt buộc cột `TT_THAU` không được để rỗng (null). Nếu để trống, hệ thống đưa ra cảnh báo: `XML3: TT_THAU không được để trống khi mã nhóm bằng 10 hoặc 11`.

## Tối ưu giao diện & Kéo thả cột

- Cột Chi tiết được thu ngắn gọn gàng và cột Dịch vụ/Vật tư được kéo dài thêm giúp giao diện hiển thị thoáng đãng và dễ đọc.
- Bảng hiển thị hỗ trợ kéo thả trực tiếp tại đường viền tiêu đề cột để thay đổi độ rộng theo ý muốn. Kích thước tùy chỉnh được tự động lưu vào trình duyệt. Có nút `↺ Cột mặc định` để khôi phục nhanh.

## Thư viện dịch vụ (Tab riêng)

- Quản lý danh mục dịch vụ loại trừ khỏi cảnh báo hoặc đặt số phút tối đa riêng.
- Hỗ trợ thêm mới, tìm kiếm, lọc và chỉnh sửa trực tiếp (inline edit) tên dịch vụ cũng như quy tắc.
- Tích hợp bộ công cụ **Simulator** giúp kiểm tra thử ngay lập tức một mã dịch vụ với số phút bất kỳ.

## Sao lưu (Backup) & Gửi Telegram

- Cho phép tải file backup JSON riêng cho Thư viện dịch vụ hoặc toàn bộ cấu hình trang.
- Cho phép khôi phục (Restore) lại dữ liệu từ file backup JSON bất cứ lúc nào.
- Cấu hình Telegram với Bot Token và Chat ID để nhận file báo cáo Excel phân tích và file backup cấu hình trực tiếp qua Telegram.
