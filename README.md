# XML3 Duration Checker

Công cụ web độc lập của **Nguyễn Sơn Nam (Nsnnam)** để đọc file XML hồ sơ chứa 15 bảng, giải mã `NOIDUNGFILE` theo Base64, lấy các dòng `CHI_TIET_DVKT` của XML3 và cảnh báo dịch vụ có thời gian từ `NGAY_TH_YL` đến `NGAY_KQ` vượt quá 70 phút.

> Ứng dụng này **không liên quan đến tra cứu hoặc đánh giá mã ICD**. Dữ liệu được xử lý ngay trong trình duyệt và không tải lên máy chủ.

## Tính năng

| Nhóm | Nội dung |
|---|---|
| Nạp dữ liệu | Chọn một hoặc nhiều file `.xml` XML1–XML15 Base64 |
| Phân tích | Giải mã `NOIDUNGFILE`, nhận diện XML3 và đọc `CHI_TIET_DVKT` |
| Nghiệp vụ | Tính `NGAY_KQ − NGAY_TH_YL` theo phút; cảnh báo khi kết quả **lớn hơn 70 phút** |
| Chi tiết | Hiển thị file, `MA_LK`, `STT`, mã/tên dịch vụ, khoa, hai mốc thời gian, số phút và phần vượt ngưỡng |
| Báo cáo | Xuất XLSX gồm các sheet `Tóm tắt`, `Chi tiết`, `Nhật ký` |
| Phát hành | Bản web portable và single HTML offline |

## Cài đặt và chạy

Yêu cầu Node.js 18+.

```bash
npm install
npm run dev
```

Mở địa chỉ Vite hiển thị trong terminal. Build production:

```bash
npm run build
npm run build:offline
```

Artifact được tạo tại `releases/web/` và `releases/single-page/xml3-duration-checker.html`. Có thể mở file single HTML trực tiếp bằng trình duyệt.

## Sử dụng trực tiếp trên web

Ứng dụng được xuất bản tại **[https://nsnnam.github.io/xml3-duration-checker/](https://nsnnam.github.io/xml3-duration-checker/)**. GitHub Actions sẽ tự build và cập nhật GitHub Pages mỗi khi có commit mới vào nhánh `main`. File single HTML nằm tại `releases/single-page/xml3-duration-checker.html` trong repo để tải về và sử dụng offline.

## Hướng dẫn nhanh

Chọn file XML hồ sơ, bấm **Phân tích XML3**, sau đó xem các dòng trong bảng **Cảnh báo chi tiết theo dịch vụ**. Mặc định bảng chỉ hiển thị dòng vượt ngưỡng; bỏ chọn **Chỉ cảnh báo** để xem toàn bộ bản ghi XML3. Dùng **Xuất XLSX** để lưu báo cáo.

Các trường nghiệp vụ lấy theo file mô tả `3176.xls`, sheet `Bang 3_DVKT, VTYT`: `NGAY_TH_YL` là trường 38 và `NGAY_KQ` là trường 39. Đúng 70 phút được xem là đạt; chỉ thời lượng `> 70` phút mới cảnh báo. Dòng thiếu, sai định dạng hoặc có thời lượng âm được thống kê riêng, không tự kết luận đạt.

## Bảo mật dữ liệu

Ứng dụng xử lý file bằng API trình duyệt, không gửi nội dung XML lên server. Không commit file XML thật, dữ liệu bệnh án, `.env`, token hoặc thông tin định danh nhạy cảm vào Git.

## Cấu trúc chính

| Đường dẫn | Vai trò |
|---|---|
| `src/lib/xml3-duration.ts` | Giải mã Base64, phân tích XML3 và tính phút |
| `src/lib/export.ts` | Xuất báo cáo XLSX |
| `src/routes/index.tsx` | Giao diện upload, dashboard và cảnh báo |
| `scripts/build-releases.mjs` | Build web portable và single HTML |
| `docs/` | Tài liệu và QR ủng hộ |

## Phiên bản

Phiên bản hiện tại: **1.0.2** · ngày **2026-08-28** · múi giờ **Asia/Ho_Chi_Minh (GMT+7)**. Xem [CHANGELOG.md](CHANGELOG.md) để biết lịch sử thay đổi.

## Tác giả và hỗ trợ

Tác giả: **Nguyễn Sơn Nam (Nsnnam)** · [GitHub](https://github.com/Nsnnam). Xem [SUPPORT.md](SUPPORT.md) nếu muốn ủng hộ dự án.

## Giấy phép

Repo phục vụ nghiệp vụ y tế/nội bộ và được tạo ở chế độ private. Không phát hành hoặc chia sẻ dữ liệu đầu vào thực tế.
