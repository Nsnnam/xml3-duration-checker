# Tham chiếu nhãn MA_NHOM

Theo **Phụ lục 3 – Danh mục mã nhóm theo chi phí** trong [Quyết định 5937/QĐ-BYT năm 2021](https://thuvienphapluat.vn/van-ban/Bao-hiem/Quyet-dinh-5937-QD-BYT-2021-ma-dung-chung-quan-ly-chi-phi-kham-benh-bao-hiem-y-te-499189.aspx), các mã có mô tả là:

| Mã | Tên nhóm |
|---:|---|
| 1 | Xét nghiệm |
| 2 | Chẩn đoán hình ảnh |
| 3 | Thăm dò chức năng |
| 4 | Thuốc |
| 7 | Máu |
| 8 | Phẫu thuật |
| 10 | Vật tư y tế |
| 12 | Vận chuyển |
| 13 | Khám bệnh |
| 14 | Ngày giường bệnh ban ngày |
| 15 | Ngày giường bệnh điều trị nội trú |
| 16 | Ngày giường lưu |
| 17 | Chế phẩm máu |
| 18 | Thủ thuật |

Để giao diện cho phép chọn nhanh mã từ 1 đến 18, ứng dụng hiển thị đủ 18 ô tích. Các mã 5, 6, 9 và 11 không có dòng mô tả trong phần Phụ lục 3 được trích xuất từ tài liệu TT_12, nên dùng nhãn **Mã nhóm X (chưa có mô tả trong Phụ lục 3)** thay vì tự suy đoán tên nghiệp vụ.

Mặc định tích sẵn các mã `2, 3, 8, 18` theo yêu cầu nghiệp vụ. Các checkbox chỉ lọc cảnh báo thời lượng và các dòng thông thường; cảnh báo sai thứ tự hoặc trùng mốc thời gian vẫn kiểm tra trên mọi mã nhóm.

Nguồn đối chiếu bổ sung: [Quyết định 3176/QĐ-BYT năm 2024](https://luatvietnam.vn/y-te/quyet-dinh-3176-qd-byt-2024-sua-doi-quyet-dinh-4750-qd-byt-sua-doi-quy-dinh-chuan-du-lieu-dau-ra-370146-d1.html), văn bản cập nhật quy định chuẩn dữ liệu đầu ra XML.
