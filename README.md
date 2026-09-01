# NsN_XMLcheck

**NsN_XMLcheck** là công cụ web độc lập của **Nguyễn Sơn Nam (Nsnnam)** để đọc file XML hồ sơ chứa 15 bảng, giải mã `NOIDUNGFILE` theo Base64, lấy các dòng `CHI_TIET_DVKT` của XML3, kiểm tra cảnh báo thời lượng theo `MA_NHOM`, cảnh báo thông tin thầu `TT_THAU` trên XML2 và XML3, hỗ trợ quản lý thư viện dịch vụ & thuốc loại trừ độc lập, tùy biến ẩn/hiện và kéo thả độ rộng cột trên toàn bộ các tab, sao lưu backup và gửi báo cáo qua Telegram.

> Ứng dụng này **không liên quan đến tra cứu hoặc đánh giá mã ICD**. Dữ liệu được xử lý ngay trong trình duyệt và không tải lên máy chủ.

## Tính năng

| Nhóm        | Nội dung                                                                                                                                       |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Nạp dữ liệu | Chọn một hoặc nhiều file `.xml` XML1–XML15 Base64                                                                                              |
| Phân tích   | Giải mã `NOIDUNGFILE`, nhận diện XML3 và đọc `CHI_TIET_DVKT`                                                                                   |
| Nghiệp vụ   | Bắt buộc tính `NGAY_KQ − NGAY_TH_YL` theo phút và cảnh báo khi **lớn hơn 70 phút** cho `MA_NHOM` 2, 3, 8, 18; ô tích dùng để mở rộng thêm nhóm |
| Trình tự    | Kiểm tra `NGAY_YL → NGAY_TH_YL → NGAY_KQ` trên mọi mã nhóm; cảnh báo mốc ngược hoặc trùng                                                      |
| XML1        | Kiểm tra `SO_CCCD` có nội dung phải gồm 9–12 chữ số; đồng thời kiểm tra `MA_DKBD = MA_CSKCB` với `MA_DOITUONG_KCB` khác `1.1`                  |
| XML2        | Cột 15 `TT_THAU` bắt buộc không được để rỗng (trừ thuốc trong danh mục loại trừ); cảnh báo `XML2. Chi tiết thứ xxx: Thiếu thông tin TT_THAU` |
| Thuốc XML2  | Cho phép thêm các mã thuốc cần loại trừ khỏi cảnh báo TT_THAU ở XML2 vào Thư viện; có nút bấm loại trừ trực tiếp trên dòng cảnh báo XML2      |
| XML3        | Khi `MA_NHOM` bằng 10 hoặc 11 (VTYT), bắt buộc cột `TT_THAU` không để rỗng; cảnh báo `XML3: TT_THAU không được để trống khi mã nhóm bằng 10 hoặc 11` |
| XML4        | Với XML3 `MA_NHOM=2`, đối chiếu `MA_DICH_VU`/`NGAY_KQ`, cảnh báo thiếu `KET_LUAN`/`NGAY_KQ`, kèm mã và tên dịch vụ                             |
| Giường      | Cảnh báo khi cùng `MA_LK`, `MA_BN` có nhiều hơn một `MA_GIUONG` trong một ngày                                                                 |
| Tùy biến cột| Tùy chỉnh ẩn/hiện cột và kéo thả viền cột (resizable) trên **TẤT CẢ các tab** (XML1, XML2, XML3, XML4); tự động lưu cấu hình vào localStorage|
| Thư viện    | Tab riêng quản lý 2 danh mục: Quy tắc dịch vụ kỹ thuật (loại trừ/ngưỡng phút) & Danh mục thuốc loại trừ XML2 kèm bộ thử nghiệm (Simulator)    |
| Backup      | Xuất file sao lưu Thư viện (.json) hoặc Cấu hình toàn trang (.json); hỗ trợ khôi phục (Restore) trực tiếp từ file backup                       |
| Telegram    | Cấu hình Bot Token & Chat ID: kiểm tra kết nối, gửi file báo cáo Excel và file backup trực tiếp về kênh Telegram                                |
| Báo cáo     | Xuất XLSX XML3 gồm `Tóm tắt`, `Chi tiết`, `Nhật ký`; xuất riêng danh sách cảnh báo XML1/XML2/XML4                                             |
| Phát hành   | Bản web portable và single HTML offline                                                                                                        |

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

1. **Phân tích XML**: Chọn file XML hồ sơ, bấm **Bắt đầu Phân tích XML**. Công cụ tự động liên kết bệnh nhân từ XML1, kiểm tra thời lượng XML3, kiểm tra thông tin thầu TT_THAU trên XML2 và XML3, kiểm tra KET_LUAN XML4 và kiểm tra ngày giường.
2. **Tùy chỉnh cột đa tab**:
   - Bấm nút **`⚙️ Tùy chỉnh cột`** ở bất kỳ tab nào (XML1, XML2, XML3, XML4) để chọn các cột muốn ẩn hoặc hiển thị.
   - Rê chuột vào viền phải của tiêu đề bất kỳ cột nào và kéo thả để thay đổi độ rộng theo ý muốn.
   - Mọi tùy chỉnh hiển thị và kích thước cột được tự động lưu vào trình duyệt cho từng tab.
3. **Thư viện dịch vụ & Thuốc**:
   - Chuyển sang tab **Thư viện** để quản lý quy tắc DVKT (loại trừ hoặc đặt số phút tối đa) và danh mục thuốc loại trừ XML2.
   - Có thể bấm **`🛡️ Loại trừ thuốc`** trực tiếp trên từng dòng cảnh báo XML2 để thêm nhanh thuốc vào danh mục loại trừ.
   - Sử dụng bộ **Simulator** để thử nghiệm nhanh quy tắc cho dịch vụ hoặc thuốc.
4. **Cấu hình & Backup & Telegram**: Chuyển sang tab **Cấu hình & Backup** để cấu hình Bot Telegram (nhập Token & Chat ID), xuất file backup JSON hoặc nạp file backup để khôi phục cấu hình.

## Bảo mật dữ liệu

Ứng dụng xử lý file bằng API trình duyệt, không gửi nội dung XML lên server. Không commit file XML thật, dữ liệu bệnh án, `.env`, token hoặc thông tin định danh nhạy cảm vào Git.

## Cấu trúc chính

| Đường dẫn                    | Vai trò                                                            |
| ---------------------------- | ------------------------------------------------------------------ |
| `src/lib/xml3-duration.ts`   | Giải mã Base64, kiểm tra thời lượng XML3, kiểm tra TT_THAU XML2/3  |
| `src/lib/export.ts`          | Xuất báo cáo XLSX và tạo workbook cho Telegram                     |
| `src/lib/telegram.ts`        | Tích hợp Telegram API gửi tin nhắn, báo cáo Excel & file backup     |
| `src/lib/backup.ts`          | Tạo và khôi phục file sao lưu JSON thư viện, thuốc & cấu hình cột  |
| `src/routes/index.tsx`       | Giao diện chính đa tab: Kiểm tra, Thư viện, Cấu hình & Backup      |
| `scripts/build-releases.mjs` | Build web portable và single HTML                                  |
| `docs/`                      | Tài liệu và QR ủng hộ                                              |

## Phiên bản

Phiên bản hiện tại: **1.8.0** · ngày **2026-09-01** · múi giờ **Asia/Ho_Chi_Minh (GMT+7)**. Xem [CHANGELOG.md](CHANGELOG.md) để biết lịch sử thay đổi.

## Tác giả và hỗ trợ

Tác giả: **Nguyễn Sơn Nam (Nsnnam)** · [GitHub](https://github.com/Nsnnam). Xem [SUPPORT.md](SUPPORT.md) nếu muốn ủng hộ dự án.

## Giấy phép

Repo phục vụ nghiệp vụ y tế/nội bộ; bản web công khai chỉ xử lý file trong trình duyệt và không tải dữ liệu lên server. Không phát hành hoặc chia sẻ dữ liệu đầu vào thực tế.
