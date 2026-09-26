# Changelog

## [2.3.1] — 2026-09-26

- Bổ sung quy tắc kiểm tra cảnh báo trường CCCD (`SO_CCCD` / `CCCD`) trong bảng XML1: cảnh báo khi có độ dài dưới 12 ký tự (ví dụ: số CMND 9 số cũ hoặc nhập thiếu số) hoặc sai định dạng (chuẩn 12 chữ số).
- Hiển thị rõ mã trường `SO_CCCD` và tên trường `Số CCCD / Định danh` trong bảng cảnh báo XML1 và khi xuất file Excel cảnh báo.

## [2.3.0] — 2026-09-14

- Cải tiến tra cứu hồ sơ bệnh nhân: Nhấn vào badge cảnh báo để hiển thị danh sách các bảng lỗi, tô nổi bật các tab XML có lỗi kèm số lượng lỗi và nút chuyển trực tiếp đến từng bảng XML.
- Trích xuất Chẩn đoán chính từ cột 26 CHAN_DOAN_RV trong bảng XML1, lấy mã bệnh đầu tiên trước dấu chấm phẩy (;) kèm mô tả.
- Bỏ popup hover khi di chuột; bổ sung nút nhỏ '👁️ Xem' tại ô trạng thái của dòng cảnh báo để mở modal chi tiết bệnh nhân cố định giữa màn hình, hỗ trợ bôi đen copy văn bản, nút sao chép tóm tắt và mở nhanh hồ sơ 15 bảng.
- Phân loại cảnh báo theo 8 nhóm màu sắc trực quan (Vượt max, Thiếu min/≤0, Mã máy, TT_THAU, Trình tự/Trùng, Mã Z00.0, Giường, Kết luận XML4) và tích hợp thanh Filter Chips lọc nhanh trên bảng dữ liệu.
- Khắc phục triệt để thanh cuộn ngang trong bảng tra cứu hồ sơ: loại bỏ container lồng nhau gây trôi scrollbar xuống tận đáy trang; bổ sung thanh cuộn ngang phụ ở đỉnh bảng, nút trượt ngang nhanh (◀ Sang trái / Sang phải ▶) và ghim cố định cột số thứ tự bên trái.
- Ẩn mặc định lưới 16 thẻ thống kê cồng kềnh phía trên để tối ưu tối đa không gian hiển thị, đưa bảng cảnh báo lên ngay đầu màn hình và tránh trùng lặp thông tin với thanh phân loại lỗi.

## [2.2.0] — 2026-09-14

- Rà soát và kiểm tra bắt buộc mã máy (cột 44 MA_MAY trong Bảng 3 XML3) đối với 3,471 dịch vụ kỹ thuật theo danh mục bắt buộc (so sánh cột 3 MA_DICH_VU).
- Cảnh báo khi dịch vụ bắt buộc bị để trống cột MA_MAY hoặc sai nguyên tắc chuẩn XX.3[xxx].Z (ví dụ: HH.3[vaynganhang].SN123).
- Cảnh báo cấu trúc sai đối với dịch vụ không nằm trong danh mục nhưng có khai báo MA_MAY.
- Tích hợp tab '🔬 DVKT bắt buộc mã máy' trong Thư viện quản lý với Simulator kiểm tra nhanh, phân trang tìm kiếm 3,471 DVKT, thêm/sửa/xóa, khôi phục mặc định, xuất/nhập file Excel 3 sheet đồng bộ và sao lưu JSON.
- Cập nhật hiển thị cột MA_MAY trong tab cảnh báo XML3, chỉ dẫn badge cảnh báo, metric tổng quan XML3 · MÃ_MÁY, xuất Excel chi tiết và gửi báo cáo Telegram.

## [2.1.0] — 2026-09-14

- Thêm cảnh báo kiểm tra tất cả các cột mã bệnh (MA_BENH, MA_BENH_CHINH, MA_BENH_KT, MA_BENHKEMTHEO, MA_BENH_YHCT...) của tất cả các bảng XML: cảnh báo mã khám sức khỏe Z00.0 không được thanh toán BHYT (định dạng chuẩn: 'XML xx. Chi tiết thứ x: Mã bệnh  'Z00.0' là mã khám sức khỏe không được thanh toán BHYT.').
- Hỗ trợ hiển thị tab cảnh báo linh hoạt cho tất cả các bảng XML (XML1 đến XML15), tùy chỉnh ẩn/hiện và độ rộng cột đồng bộ.
- Cập nhật metric tổng quan 'Mã bệnh Z00.0', xuất báo cáo Excel chi tiết và gửi thông báo Telegram bao gồm chỉ tiêu Z00.0.

## [2.0.0] — 2026-09-14

- Sửa định dạng ngày giờ hiển thị theo chuẩn Việt Nam: `DD/MM/YYYY HH:mm` và `DD/MM/YYYY` (thay vì bị hiển thị đảo `MM/DD/YYYY`).
- Thêm chức năng Popup Hovercard thông tin bệnh nhân: khi rê chuột vào bất kỳ dòng cảnh báo lỗi XML nào (XML1, XML2, XML3, XML4), popup hiển thị tức thời thông tin hành chính bệnh nhân (họ tên, giới tính, CCCD, BHYT, địa chỉ, chẩn đoán bệnh từ XML1), ngày vào viện (`NGAY_VAO`), ngày ra viện (`NGAY_RA`), chi tiết các mốc thời gian XML3 (`NGAY_YL`, `NGAY_TH_YL`, `NGAY_KQ`, số phút thực hiện) và nội dung cảnh báo chi tiết, kèm nút mở trực tiếp hồ sơ bệnh nhân.
- Bổ sung hệ thống Kho Giao diện (Theme Gallery) kỹ thuật số & hiện đại đẳng cấp: 5 theme preset chuẩn hóa toàn bộ bố cục trang (Clinical Teal, Cyber Digital Neon 4.0, Luxury Obsidian Gold, Ocean Digital, Pure Minimalist), đảm bảo 100% hài hòa màu sắc thẻ, nút bấm, bảng và thanh điều hướng.
- Bổ sung bộ tùy chọn Font chữ tiếng Việt: với font chủ đạo mặc định là **Be Vietnam Pro** (kèm Inter, Plus Jakarta Sans, Lexend, Roboto), tự động lưu và khôi phục từ `localStorage`.
- Bổ sung module **Hồ sơ & Xem XML 15 bảng**: cho phép tìm kiếm và xem hồ sơ chi tiết của từng bệnh nhân (bao gồm cả bệnh nhân có cảnh báo và bệnh nhân không có lỗi), phân tách theo 15 tab chuẩn bảng BHYT QĐ 130/QĐ 4210, cung cấp 2 chế độ hiển thị:
  - **Bảng dữ liệu (Data Grid)**: bảng dữ liệu chi tiết có bộ lọc tìm kiếm nhanh theo trường nội bộ và đếm số bản ghi.
  - **Mã XML gốc (Raw XML)**: hiển thị định dạng cú pháp XML gốc có thụt đầu dòng, hỗ trợ sao chép toàn bộ (Copy) và tải file XML về máy.

## [1.9.0] — 2026-09-01

- Bổ sung quy ước thời gian tối thiểu (mặc định > 0 phút hoặc cấu hình riêng theo dịch vụ) trong thư viện và khi đánh giá XML3; cảnh báo khi thời lượng dưới ngưỡng tối thiểu.
- Hỗ trợ nhập (Import) danh mục Thư viện bằng file Excel (.xlsx): hỗ trợ 2 chế độ Gộp (Merge) hoặc Ghi đè (Overwrite).
- Hỗ trợ xuất file Excel mẫu chuẩn (Template) với đầy đủ định dạng và ghi chú hướng dẫn để dễ dàng điền dữ liệu nạp vào hệ thống.
- Hỗ trợ xuất toàn bộ Thư viện dịch vụ kỹ thuật và danh mục thuốc ra file Excel nhiều sheet.

## [1.8.0] — 2026-09-01

- Thêm bộ cấu hình tùy chỉnh thêm/ẩn/hiện các cột và kéo thả thay đổi kích thước cột trên TẤT CẢ các tab cảnh báo (XML1, XML2, XML3, XML4); tự động lưu cấu hình theo từng tab vào localStorage.
- Thêm danh mục Thuốc loại trừ khỏi cảnh báo TT_THAU ở XML2 vào Thư viện: hỗ trợ thêm/sửa/xóa thuốc, tìm kiếm, thử nghiệm quy tắc (Simulator).
- Thêm nút 'Loại trừ thuốc' trực tiếp trên từng dòng cảnh báo XML2 để loại trừ nhanh và tự động phân tích lại.
- Cập nhật hệ thống Backup và gửi Telegram đồng bộ cả thư viện thuốc loại trừ và cấu hình hiển thị cột toàn trang.

## [1.7.0] — 2026-09-01

- Chuyển Thư viện dịch vụ sang một tab riêng độc lập: cho phép thêm mới, chỉnh sửa trực tiếp (tên dịch vụ, loại trừ/ngưỡng số phút), tìm kiếm/lọc và có bộ công cụ kiểm tra thử quy tắc (Simulator).
- Thêm kiểm tra XML2: cột 15 `TT_THAU` bắt buộc không được để rỗng (null), nếu rỗng đưa ra cảnh báo `XML2. Chi tiết thứ xxx: Thiếu thông tin TT_THAU` kèm tab cảnh báo XML2 và xuất file Excel riêng.
- Thêm kiểm tra XML3: với trường hợp mã nhóm ở cột 6 `MA_NHOM` bằng `10` hoặc `11` thì bắt buộc cột `TT_THAU` không được rỗng (null), nếu rỗng đưa ra cảnh báo `XML3: TT_THAU không được để trống khi mã nhóm bằng 10 hoặc 11`.
- Tối ưu giao diện bảng cảnh báo XML3: thu ngắn cột Chi tiết, mở rộng cột Dịch vụ/Vật tư, bổ sung cột TT_THAU, hỗ trợ kéo thả viền cột (resizable columns) và tự động lưu cấu hình độ rộng vào localStorage.
- Thêm tính năng Sao lưu & Khôi phục: tạo file backup Thư viện dịch vụ (.json) hoặc file backup Cấu hình toàn trang (.json), hỗ trợ nạp lại file backup (Restore) trực tiếp.
- Tích hợp gửi báo cáo qua Telegram: hỗ trợ cấu hình Bot Token, Chat ID, nút kiểm tra kết nối, gửi file báo cáo Excel và gửi file backup trực tiếp về kênh Telegram.

## [1.6.1] — 2026-08-31

- Tối ưu bảng cảnh báo XML3: trạng thái CẢNH BÁO rút gọn thành CB, Chi tiết đứng cạnh Vượt ngưỡng, Dịch vụ/Vật tư mở rộng và File/STT chuyển về cuối.

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
