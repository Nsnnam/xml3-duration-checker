# Changelog

## [1.6.0] — 2026-08-31

- Thêm thư viện dịch vụ lưu trong trình duyệt: loại trừ hoàn toàn hoặc đặt ngưỡng thời gian riêng.
- Thêm nút `Loại trừ DV` và `Đặt ngưỡng` trực tiếp trong từng cảnh báo XML3; sau khi lưu tự phân tích lại toàn bộ dòng cùng `MA_DICH_VU`.

## [1.5.1] — 2026-08-31

- Đưa `Số phút` và `Vượt ngưỡng` lên ngay sau `MA_BN` trong bảng cảnh báo XML3 và báo cáo XLSX.

## [1.5.0] — 2026-08-31

- Bắt buộc giữ cảnh báo `NGAY_KQ − NGAY_TH_YL > 70` cho `MA_NHOM` 2, 3, 8 và 18, kể cả khi người dùng bỏ chọn nhóm trong bộ lọc mở rộng.
- Tách phép tính thời lượng khỏi `NGAY_YL`; thiếu `NGAY_YL` không còn làm mất cảnh báo khi `NGAY_TH_YL` và `NGAY_KQ` hợp lệ.
- Thêm cảnh báo XML1 khi `MA_DKBD = MA_CSKCB` nhưng `MA_DOITUONG_KCB` khác `1.1`, đồng thời thu gọn khu vực cấu hình sau khi phân tích.
- Đổi tên hiển thị ứng dụng thành `NsN_XMLcheck · v1.5.0`.

## [1.4.1] — 2026-08-30

- Bỏ qua cảnh báo XML1 khi `SO_CCCD` rỗng hoặc null; chỉ kiểm tra giá trị có nội dung và không đúng 9–12 chữ số.
- Bổ sung mã dịch vụ và tên dịch vụ vào bảng, nội dung cảnh báo và file XLSX của XML4.

## [1.4.0] — 2026-08-30

- Thêm kiểm tra XML1: `SO_CCCD` phải là chuỗi chỉ gồm 9–12 chữ số; cảnh báo hiển thị giá trị sai và thông tin `MA_LK`, `HO_TEN`, `MA_BN`.
- Thêm kiểm tra XML4: với XML3 `MA_NHOM=2`, đối chiếu `MA_DICH_VU` và `NGAY_KQ`, cảnh báo khi thiếu `KET_LUAN` hoặc `NGAY_KQ` theo đúng dòng XML4.
- Thêm cảnh báo XML3 khi một bệnh nhân có nhiều hơn một `MA_GIUONG` trong cùng ngày, xét theo `MA_LK`, `MA_BN` và ngày thực hiện/trả kết quả.
- Tách khu vực chi tiết thành các tab XML1, XML3 và XML4; thẻ thống kê có thể bấm để nhảy đến đúng tab/bộ lọc.
- Xuất XLSX riêng cho danh sách cảnh báo XML1/XML4; báo cáo XML3 tiếp tục có Tóm tắt, Chi tiết và Nhật ký.

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
