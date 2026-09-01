# NsN_XMLcheck

**NsN_XMLcheck** là công cụ web độc lập của **Nguyễn Sơn Nam (Nsnnam)** để đọc file XML hồ sơ chứa 15 bảng, giải mã `NOIDUNGFILE` theo Base64, lấy các dòng `CHI_TIET_DVKT` của XML3, kiểm tra cảnh báo thời lượng (thời gian tối thiểu & tối đa) theo `MA_NHOM`, cảnh báo thông tin thầu `TT_THAU` trên XML2 và XML3, hỗ trợ quản lý thư viện dịch vụ & thuốc loại trừ độc lập, nhập/xuất file Excel mẫu danh mục, tùy biến ẩn/hiện và kéo thả độ rộng cột trên toàn bộ các tab, sao lưu backup và gửi báo cáo qua Telegram.

> Ứng dụng này **không liên quan đến tra cứu hoặc đánh giá mã ICD**. Dữ liệu được xử lý ngay trong trình duyệt và không tải lên máy chủ.

## Tính năng

| Nhóm        | Nội dung                                                                                                                                       |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Nạp dữ liệu | Chọn một hoặc nhiều file `.xml` XML1–XML15 Base64                                                                                              |
| Phân tích   | Giải mã `NOIDUNGFILE`, nhận diện XML3 và đọc `CHI_TIET_DVKT`                                                                                   |
| Thời lượng  | Tính `NGAY_KQ − NGAY_TH_YL`: cảnh báo khi **thời lượng ≤ 0 phút** (hoặc dưới thời gian tối thiểu) hoặc **> 70 phút** (hoặc vượt tối đa)        |
| Quy ước Min | Quy ước thời gian tối thiểu mặc định `> 0` phút (tối thiểu 1 phút); cho phép cấu hình ngưỡng tối thiểu riêng theo từng mã dịch vụ kỹ thuật   |
| Trình tự    | Kiểm tra `NGAY_YL → NGAY_TH_YL → NGAY_KQ` trên mọi mã nhóm; cảnh báo mốc ngược hoặc trùng                                                      |
| XML1        | Kiểm tra `SO_CCCD` có nội dung phải gồm 9–12 chữ số; đồng thời kiểm tra `MA_DKBD = MA_CSKCB` với `MA_DOITUONG_KCB` khác `1.1`                  |
| XML2        | Cột 15 `TT_THAU` bắt buộc không được để rỗng (trừ thuốc trong danh mục loại trừ); cảnh báo `XML2. Chi tiết thứ xxx: Thiếu thông tin TT_THAU` |
| Thuốc XML2  | Cho phép thêm các mã thuốc cần loại trừ khỏi cảnh báo TT_THAU ở XML2 vào Thư viện; có nút bấm loại trừ trực tiếp trên dòng cảnh báo XML2      |
| XML3        | Khi `MA_NHOM` bằng 10 hoặc 11 (VTYT), bắt buộc cột `TT_THAU` không để rỗng; cảnh báo `XML3: TT_THAU không được để trống khi mã nhóm bằng 10 hoặc 11` |
| XML4        | Với XML3 `MA_NHOM=2`, đối chiếu `MA_DICH_VU`/`NGAY_KQ`, cảnh báo thiếu `KET_LUAN`/`NGAY_KQ`, kèm mã và tên dịch vụ                             |
| Giường      | Cảnh báo khi cùng `MA_LK`, `MA_BN` có nhiều hơn một `MA_GIUONG` trong một ngày                                                                 |
| Tùy biến cột| Tùy chỉnh ẩn/hiện cột và kéo thả viền cột (resizable) trên **TẤT CẢ các tab** (XML1, XML2, XML3, XML4); tự động lưu cấu hình vào localStorage|
| Thư viện    | Quản lý quy tắc DVKT (thời gian tối thiểu & tối đa) và Thuốc loại trừ XML2 kèm bộ thử nghiệm (Simulator)                                     |
| Excel Import| Hỗ trợ **nhập file Excel** (.xlsx) nạp danh mục thư viện nhanh với 2 chế độ Gộp (Merge) hoặc Ghi đè (Overwrite)                                |
| Excel Mẫu   | Cho phép tải file Excel mẫu chuẩn (`mau_nhap_thu_vien_nsn_xmlcheck.xlsx`) để dễ dàng nhập liệu và xuất toàn bộ thư viện ra Excel              |
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
2. **Quy ước thời gian tối thiểu & tối đa**:
   - Mặc định thời gian thực hiện dịch vụ phải **`> 0 phút`** (tối thiểu 1 phút) và **`≤ 70 phút`**.
   - Trong Thư viện, bạn có thể thiết lập thời gian tối thiểu và tối đa riêng cho từng mã dịch vụ kỹ thuật.
3. **Nhập / Xuất Excel Thư viện**:
   - Bấm **`📥 Tải Excel mẫu`** để nhận file Excel chuẩn gồm 2 sheet (`DVKT_VTYT` và `THUOC_XML2`) có sẵn cột dữ liệu và ghi chú mẫu.
   - Điền dữ liệu và bấm **`📤 Nạp từ Excel`** để nạp danh mục hàng loạt vào hệ thống (lựa chọn chế độ Gộp hoặc Ghi đè).
   - Bấm **`📊 Xuất Excel Thư viện`** để xuất toàn bộ quy tắc ra file Excel.
4. **Tùy chỉnh cột đa tab**: Bấm **`⚙️ Tùy chỉnh cột`** ở bất kỳ tab nào để ẩn/hiện cột hoặc kéo thả viền tiêu đề cột để thay đổi kích thước.
5. **Cấu hình & Backup & Telegram**: Nhập Token và Chat ID để gửi báo cáo Excel và file backup qua Telegram.

## Bảo mật dữ liệu

Ứng dụng xử lý file bằng API trình duyệt, không gửi nội dung XML lên server. Không commit file XML thật, dữ liệu bệnh án, `.env`, token hoặc thông tin định danh nhạy cảm vào Git.

## Phiên bản

Phiên bản hiện tại: **1.9.0** · ngày **2026-09-01** · múi giờ **Asia/Ho_Chi_Minh (GMT+7)**. Xem [CHANGELOG.md](CHANGELOG.md) để biết lịch sử thay đổi.

## Tác giả và hỗ trợ

Tác giả: **Nguyễn Sơn Nam (Nsnnam)** · [GitHub](https://github.com/Nsnnam). Xem [SUPPORT.md](SUPPORT.md) nếu muốn ủng hộ dự án.
