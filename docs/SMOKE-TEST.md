# Smoke test 2026-08-28

Đã chạy ứng dụng tại `http://127.0.0.1:5174/` và nạp file XML3 mẫu có `NOIDUNGFILE` Base64.

| Kiểm tra | Kết quả |
|---|---|
| Nhận file XML | Đạt |
| Nhận diện `LOAIHOSO=XML3` | 1 FILEHOSO |
| Đọc `CHI_TIET_DVKT` | 3 dòng |
| Dòng đúng 70 phút | Đạt, không hiển thị trong bộ lọc chỉ cảnh báo |
| Dòng 71 phút | Cảnh báo, hiển thị 71 phút và vượt 1 phút |
| Dòng thời gian âm | Thống kê riêng 1 dòng |
| Lỗi giải mã / thiếu thời gian | 0 |
| UI | Hiển thị đúng tiêu đề, quy tắc, metric và bảng cảnh báo |

File mẫu chỉ dùng để kiểm thử cục bộ và không được đưa vào commit.

## Kiểm tra bổ sung

Tab **Hướng dẫn** hiển thị đúng quy trình ba bước, xác nhận Bảng 3, vị trí trường 38/39 và cảnh báo không liên quan ICD. Nút **Xuất XLSX** đã tạo thành công file `20260828-082135_XML3_duration.xlsx` trong thư mục tải xuống của trình duyệt.

Tab **Phiên bản & tác giả** hiển thị v1.0.0, ngày phát hành, tác giả, GMT+7 và link repo mới. Tab **Mời cà phê** hiển thị đúng một QR cùng thông tin `NGUYEN SON NAM · 8855989777 · BIDV — PGD Nguyễn Tất Thành`.

## Xuất bản web

Sau khi repo được chuyển public và chọn **GitHub Actions** trong Settings → Pages, workflow `Deploy XML3 Duration Checker` run `33134285900` hoàn tất thành công ở cả job build và deploy. URL công khai đã kiểm tra được: `https://nsnnam.github.io/xml3-duration-checker/`, hiển thị đúng tiêu đề `XML3 Duration Checker — Cảnh báo quá 70 phút`, màn hình upload XML3 và công thức NGAY_KQ − NGAY_TH_YL.
