# Hướng dẫn XML3 Duration Checker

## Phạm vi

Ứng dụng chỉ kiểm tra thời gian của dịch vụ kỹ thuật và vật tư y tế trong **Bảng XML3**. Ứng dụng không tra cứu ICD, không sửa file nguồn và không gửi dữ liệu lên máy chủ.

## Cách thực hiện

Mở ứng dụng, chọn một hoặc nhiều file XML hồ sơ có XML1, XML3 và/hoặc XML4, sau đó bấm **Phân tích XML3**. Công cụ nối thông tin bệnh nhân giữa XML1 và XML3 bằng `MA_LK`. Công cụ tìm các phần `FILEHOSO` có `LOAIHOSO=XML3`, giải mã `NOIDUNGFILE` từ Base64 và đọc các phần tử `CHI_TIET_DVKT`.

Giao diện hiển thị gọn 18 ô tích theo Phụ lục 3 QĐ 5937: `1 Xét nghiệm`, `2 Chẩn đoán hình ảnh`, `3 Thăm dò chức năng`, `4 Thuốc`, `5–6 chưa có mô tả`, `7 Máu`, `8 Phẫu thuật`, `9 chưa có mô tả`, `10 Vật tư y tế`, `11 chưa có mô tả`, `12 Vận chuyển`, `13 Khám bệnh`, `14 Ngày giường bệnh ban ngày`, `15 Ngày giường bệnh điều trị nội trú`, `16 Ngày giường lưu`, `17 Chế phẩm máu`, `18 Thủ thuật`. Mặc định tích `2, 3, 8, 18`. Các ô tích chỉ lọc cảnh báo thời lượng; cảnh báo trình tự và trùng mốc vẫn kiểm tra trên mọi `MA_NHOM`.

Quy trình thời gian được kiểm tra theo thứ tự bắt buộc:

```text
NGAY_YL (chỉ định) → NGAY_TH_YL (thực hiện) → NGAY_KQ (kết quả)
```

Với mỗi dòng thuộc nhóm đã chọn, công thức là:

```text
Số phút = NGAY_KQ - NGAY_TH_YL
```

Nếu số phút lớn hơn 70, dòng được đánh dấu **CẢNH BÁO**. Đúng 70 phút không bị cảnh báo. Hai trường được đọc theo mô tả sheet `Bang 3_DVKT, VTYT` trong file `3176.xls`: `MA_NHOM` là vị trí 6, `NGAY_YL` là vị trí 37, `NGAY_TH_YL` là vị trí 38 và `NGAY_KQ` là vị trí 39. Chuỗi XML `yyyymmddhhmm` được hiển thị thành `MM/DD/YYYY HH:mm`.

## Xử lý ngoại lệ

Dòng thiếu một trong ba mốc được đánh dấu `missing`. Dòng có định dạng ngày giờ không đọc được được đánh dấu `invalid`. Dòng có thời điểm kết quả sớm hơn thời điểm thực hiện được đánh dấu `negative`. Nếu `NGAY_TH_YL` sớm hơn `NGAY_YL`, hoặc `NGAY_KQ` sớm hơn `NGAY_TH_YL`, dòng được đánh dấu **SAI THỨ TỰ**. Nếu `NGAY_YL = NGAY_TH_YL = NGAY_KQ` hoặc `NGAY_TH_YL = NGAY_KQ`, dòng được đánh dấu **TRÙNG MỐC**. Các cảnh báo này không phụ thuộc mã nhóm.

## Kiểm lỗi XML1, XML4 và giường

XML1 được kiểm tra ở trường `SO_CCCD`: giá trị có nội dung phải chỉ gồm 9–12 chữ số. Giá trị rỗng hoặc null được bỏ qua, không tạo cảnh báo. Khi sai, tab XML1 hiển thị thông báo theo dạng `XML 1. Chi tiết thứ 1: SO_CCCD không đúng định dạng. Giá trị sai: ...`.

Với mỗi dòng XML3 có `MA_NHOM=2`, công cụ đối chiếu `MA_DICH_VU` và `NGAY_KQ` với XML4. Nếu bản ghi XML4 tương ứng thiếu `KET_LUAN` hoặc `NGAY_KQ`, tab XML4 hiển thị cảnh báo theo đúng số chi tiết XML4, kèm mã dịch vụ và tên dịch vụ lấy từ XML3. Ngoài ra, nếu cùng `MA_LK`, `MA_BN` có hơn một `MA_GIUONG` trong cùng ngày của khoảng thực hiện–trả kết quả, dòng XML3 được cảnh báo `XML3. Chi tiết thứ [xx]: Số lượng giường trong ngày lớn hơn 01.`.

## Báo cáo

Khu vực chi tiết được chia thành ba tab XML1, XML3 và XML4. Các thẻ thống kê có thể bấm để tự động chuyển đến tab hoặc bộ lọc tương ứng. Ba trường cố định ưu tiên trong dòng cảnh báo là `MA_LK`, `HO_TEN`, `MA_BN`, lấy thông tin bệnh nhân từ XML1.

Nút **Xuất XLSX** ở tab XML3 tạo ba sheet: `Tóm tắt` cho chỉ số tổng hợp, `Chi tiết` cho các dòng XML3 theo bộ lọc hiện tại và `Nhật ký` cho thông tin giải mã/phân tích. Ở tab XML1 hoặc XML4, nút này xuất riêng danh sách cảnh báo của tab đang mở. Tên file theo múi giờ `Asia/Ho_Chi_Minh`.

## An toàn

Chỉ mở file từ nguồn tin cậy. Không lưu file XML có dữ liệu bệnh án thật trong repo, issue, log công khai hoặc thư mục release.
