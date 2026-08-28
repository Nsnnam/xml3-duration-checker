# Changelog

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
