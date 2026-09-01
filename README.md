# NsN_XMLcheck

**NsN_XMLcheck** là công cụ web độc lập của **Nguyễn Sơn Nam (Nsnnam)** để đọc file XML hồ sơ chứa 15 bảng, giải mã `NOIDUNGFILE` theo Base64, lấy các dòng `CHI_TIET_DVKT` của XML3 và lọc cảnh báo thời lượng theo `MA_NHOM` và cảnh báo dịch vụ có thời gian từ `NGAY_TH_YL` đến `NGAY_KQ` vượt quá 70 phút, sai thứ tự hoặc trùng mốc.

> Ứng dụng này **không liên quan đến tra cứu hoặc đánh giá mã ICD**. Dữ liệu được xử lý ngay trong trình duyệt và không tải lên máy chủ.

## Tính năng

| Nhóm        | Nội dung                                                                                                                                       |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Nạp dữ liệu | Chọn một hoặc nhiều file `.xml` XML1–XML15 Base64                                                                                              |
| Phân tích   | Giải mã `NOIDUNGFILE`, nhận diện XML3 và đọc `CHI_TIET_DVKT`                                                                                   |
| Nghiệp vụ   | Bắt buộc tính `NGAY_KQ − NGAY_TH_YL` theo phút và cảnh báo khi **lớn hơn 70 phút** cho `MA_NHOM` 2, 3, 8, 18; ô tích dùng để mở rộng thêm nhóm |
| Trình tự    | Kiểm tra `NGAY_YL → NGAY_TH_YL → NGAY_KQ` trên mọi mã nhóm; cảnh báo mốc ngược hoặc trùng                                                      |
| XML1        | Kiểm tra `SO_CCCD` có nội dung phải gồm 9–12 chữ số; đồng thời kiểm tra `MA_DKBD = MA_CSKCB` với `MA_DOITUONG_KCB` khác `1.1`                  |
| XML4        | Với XML3 `MA_NHOM=2`, đối chiếu `MA_DICH_VU`/`NGAY_KQ`, cảnh báo thiếu `KET_LUAN`/`NGAY_KQ`, kèm mã và tên dịch vụ                             |
| Giường      | Cảnh báo khi cùng `MA_LK`, `MA_BN` có nhiều hơn một `MA_GIUONG` trong một ngày                                                                 |
| Nhãn nhóm   | Đủ mã 1–18 theo Phụ lục 3 QĐ 5937; mặc định tích 2, 3, 8, 18                                                                                   |
| Bệnh nhân   | Nối XML1 và XML3 bằng `MA_LK`; cố định ưu tiên `MA_LK`, `HO_TEN`, `MA_BN` trong các dòng cảnh báo                                              |
| Chi tiết    | Tách tab XML1/XML3/XML4; thẻ thống kê có thể bấm để nhảy đến tab/bộ lọc tương ứng                                                              |
| Thư viện DV | Lưu cục bộ dịch vụ loại trừ hoặc ngưỡng riêng; thêm trực tiếp từ cảnh báo và tự cập nhật các dòng cùng mã dịch vụ                              |
| Báo cáo     | Xuất XLSX XML3 gồm `Tóm tắt`, `Chi tiết`, `Nhật ký`; xuất riêng danh sách cảnh báo XML1/XML4                                                   |
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

Chọn file XML hồ sơ, tích thêm các nhóm `MA_NHOM` nếu cần, bấm **Phân tích XML3**, sau đó tìm theo `MA_BN`, `HO_TEN` hoặc `MA_LK` trong bảng **Cảnh báo chi tiết theo dịch vụ**. Các nhóm 2, 3, 8, 18 luôn được kiểm tra thời lượng và không bị ẩn khi bỏ chọn bộ lọc; sau khi phân tích, khu vực import và quy tắc tự thu gọn để ưu tiên phần kết quả; bộ lọc tab và loại cảnh báo cũng được reset về cảnh báo XML3 để không che các dòng thời lượng. Mặc định bảng chỉ hiển thị dòng cảnh báo; bỏ chọn **Chỉ cảnh báo** để xem toàn bộ bản ghi thuộc nhóm đã chọn và mọi dòng có cảnh báo trình tự/trùng mốc. Dùng **Xuất XLSX** để lưu báo cáo XML3 hoặc danh sách cảnh báo của tab XML1/XML4 đang mở.

Trong bảng cảnh báo XML3, thứ tự ưu tiên là `MA_LK`, `HO_TEN`, `MA_BN`, tiếp theo ngay là `Số phút` và `Vượt ngưỡng`; báo cáo XLSX dùng cùng thứ tự. Mỗi dòng có nút **Loại trừ DV** hoặc **Đặt ngưỡng**. Loại trừ sẽ bỏ cảnh báo thời lượng của mã dịch vụ đó; ngưỡng riêng chỉ cảnh báo khi số phút vượt giá trị đã cấu hình. Quy tắc được lưu trong localStorage của trình duyệt và áp dụng lại cho toàn bộ dòng cùng `MA_DICH_VU`. Các trường nghiệp vụ lấy theo file mô tả `3176.xls`, sheet `Bang 3_DVKT, VTYT`: `MA_NHOM` là trường 6, `NGAY_YL` là trường 37, `NGAY_TH_YL` là trường 38 và `NGAY_KQ` là trường 39. XML1 cung cấp `MA_BN` ở cột 3 và `HO_TEN` ở cột 4; hai bảng được nối bằng `MA_LK`. Đúng 70 phút được xem là đạt; chỉ thời lượng `> 70` phút mới cảnh báo. Chuỗi `yyyymmddhhmm` được hiển thị thành `MM/DD/YYYY HH:mm`. `SO_CCCD` rỗng/null được bỏ qua; giá trị có nội dung nhưng sai định dạng sẽ cảnh báo. Nếu `MA_DKBD = MA_CSKCB` và `MA_DOITUONG_KCB` khác `1.1`, XML1 cảnh báo `MA_DKBD phải khác MA_CSKCB cho đối tượng khác 1.1`. Dòng thiếu, sai định dạng, thời lượng âm, sai trình tự, trùng mốc hoặc trùng giường được thống kê riêng, không tự kết luận đạt. Các tab XML1 và XML4 hiển thị cảnh báo theo từng chi tiết; XML4 kèm mã dịch vụ và tên dịch vụ; có thể xuất riêng danh sách cảnh báo của tab đang mở.

## Bảo mật dữ liệu

Ứng dụng xử lý file bằng API trình duyệt, không gửi nội dung XML lên server. Không commit file XML thật, dữ liệu bệnh án, `.env`, token hoặc thông tin định danh nhạy cảm vào Git.

## Cấu trúc chính

| Đường dẫn                    | Vai trò                                                  |
| ---------------------------- | -------------------------------------------------------- |
| `src/lib/xml3-duration.ts`   | Giải mã Base64, lọc nhóm, kiểm tra trình tự và tính phút |
| `src/lib/export.ts`          | Xuất báo cáo XLSX                                        |
| `src/routes/index.tsx`       | Giao diện upload, dashboard và cảnh báo                  |
| `scripts/build-releases.mjs` | Build web portable và single HTML                        |
| `docs/`                      | Tài liệu và QR ủng hộ                                    |

## Phiên bản

Phiên bản hiện tại: **1.6.0** · ngày **2026-08-31** · múi giờ **Asia/Ho_Chi_Minh (GMT+7)**. Xem [CHANGELOG.md](CHANGELOG.md) để biết lịch sử thay đổi.

## Tác giả và hỗ trợ

Tác giả: **Nguyễn Sơn Nam (Nsnnam)** · [GitHub](https://github.com/Nsnnam). Xem [SUPPORT.md](SUPPORT.md) nếu muốn ủng hộ dự án.

## Giấy phép

Repo phục vụ nghiệp vụ y tế/nội bộ; bản web công khai chỉ xử lý file trong trình duyệt và không tải dữ liệu lên server. Không phát hành hoặc chia sẻ dữ liệu đầu vào thực tế.
