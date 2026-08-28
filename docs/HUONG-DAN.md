# Hướng dẫn XML3 Duration Checker

## Phạm vi

Ứng dụng chỉ kiểm tra thời gian của dịch vụ kỹ thuật và vật tư y tế trong **Bảng XML3**. Ứng dụng không tra cứu ICD, không sửa file nguồn và không gửi dữ liệu lên máy chủ.

## Cách thực hiện

Mở ứng dụng, chọn một hoặc nhiều file XML hồ sơ, sau đó bấm **Phân tích XML3**. Công cụ tìm các phần `FILEHOSO` có `LOAIHOSO=XML3`, giải mã `NOIDUNGFILE` từ Base64 và đọc các phần tử `CHI_TIET_DVKT`.

Mặc định giao diện chọn các nhóm `2, 3, 8, 18` bằng ô tích: **Nhóm 2 – Chi phí thuốc, vật tư y tế**, **Nhóm 3 – Chi phí xét nghiệm, chẩn đoán hình ảnh, thăm dò chức năng**, **Nhóm 8 – Chi phí khác** và **Nhóm 18 – theo dữ liệu đơn vị**. Các ô tích chỉ lọc cảnh báo thời lượng; cảnh báo trình tự và trùng mốc vẫn kiểm tra trên mọi `MA_NHOM`.

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

## Báo cáo

Nút **Xuất XLSX** tạo ba sheet: `Tóm tắt` cho các chỉ số tổng hợp, `Chi tiết` cho toàn bộ dòng theo bộ lọc hiện tại, và `Nhật ký` cho thông tin giải mã/phân tích. Tên file theo múi giờ `Asia/Ho_Chi_Minh`.

## An toàn

Chỉ mở file từ nguồn tin cậy. Không lưu file XML có dữ liệu bệnh án thật trong repo, issue, log công khai hoặc thư mục release.
