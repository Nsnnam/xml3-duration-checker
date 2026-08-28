# Changelog

## [1.3.0] — 2026-08-28

- Thu gọn đầy đủ 18 ô tích MA_NHOM theo Phụ lục 3 QĐ 5937; mặc định tích 2, 3, 8 và 18.
- Đọc XML1, nối với XML3 bằng MA_LK và ưu tiên hiển thị MA_BN cột 3, HO_TEN cột 4.
- Thêm tìm kiếm theo mã bệnh nhân, họ tên hoặc MA_LK; báo cáo XLSX cũng ưu tiên các trường bệnh nhân.

## [1.2.0] — 2026-08-28

- Thay ô nhập mã nhóm bằng các ô tích có tiêu đề: Nhóm 2 thuốc/vật tư y tế, Nhóm 3 xét nghiệm/CĐHA/TDCN, Nhóm 8 chi phí khác và Nhóm 18 theo dữ liệu đơn vị.
- Tách phạm vi: checkbox chỉ lọc cảnh báo thời lượng; cảnh báo sai thứ tự và trùng mốc áp dụng cho mọi MA_NHOM.
- Cảnh báo `NGAY_YL = NGAY_TH_YL = NGAY_KQ` và `NGAY_TH_YL = NGAY_KQ`.

## [1.1.0] — 2026-08-28

- Thêm tùy chọn lọc `MA_NHOM` với mặc định `2, 3, 8, 18`.
- Kiểm tra thứ tự `NGAY_YL → NGAY_TH_YL → NGAY_KQ` và cảnh báo từng mốc bị ngược.
- Hiển thị thời gian `yyyymmddhhmm` thành `MM/DD/YYYY HH:mm` trên bảng và báo cáo XLSX.

## [1.0.2] — 2026-08-28

- Bổ sung GitHub Actions tự build và xuất bản bản web portable lên GitHub Pages.
- Cập nhật README với đường dẫn sử dụng trực tiếp trên web.

## [1.0.1] — 2026-08-28

- Tinh giản dependency và loại bỏ toàn bộ scaffold ICD không dùng.
- Sửa bản build offline và cập nhật metadata phát hành.

## [1.0.0] — 2026-08-28

- Khởi tạo repo riêng `xml3-duration-checker`, tách khỏi `remix-icd-check`.
- Nhận nhiều file XML chứa 15 bảng và giải mã `NOIDUNGFILE` theo Base64.
- Đọc XML3 `CHI_TIET_DVKT`, tính `NGAY_KQ - NGAY_TH_YL` theo phút.
- Hiển thị cảnh báo chi tiết khi thời lượng lớn hơn 70 phút.
- Thêm thống kê dòng thiếu/sai/âm thời gian và xuất báo cáo XLSX.
- Thêm bản web portable, single HTML offline và màn hình Hướng dẫn, Phiên bản, Tác giả, Mời cà phê.
