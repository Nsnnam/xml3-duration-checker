export const APP_META = {
  name: "NsN_XMLcheck",
  title: "NsN_XMLcheck",
  description:
    "Kiểm tra thời gian (tối thiểu > 0 & tối đa), TT_THAU XML2/XML3, MA_MAY chuẩn XX.3[xxx].Z & trùng thời gian máy, cảnh báo Z00.0/Z30.1 (KHHGĐ) & Hồ sơ 15 bảng BHYT",
  version: "2.12.0",
  date: "2026-11-10",
  author: "Nguyễn Sơn Nam (Nsnnam)",
  github: "https://github.com/Nsnnam/xml3-duration-checker",
  timezone: "Asia/Ho_Chi_Minh",
  changelog: [
    {
      version: "2.12.0",
      date: "2026-11-10",
      changes: [
        "Quản lý chọn xóa từng hoặc nhiều kế hoạch sửa: Bổ sung checkbox từng dòng và checkbox chọn tất cả trong bảng Kế hoạch sửa (CorrectionPlanModal), kèm thanh thao tác nhanh '🗑️ Xóa các mục đã chọn (X)' và '✕ Bỏ chọn' song song với nút xóa lẻ từng mục.",
        "Tùy chọn Reset XML của dòng sai về ban đầu (khi chưa tạo kế hoạch sửa): Cho phép hủy can thiệp kế hoạch sửa và khôi phục về dữ liệu XML gốc ban đầu ngay tại DirectEditModal (nút '↺ Khôi phục về ban đầu' ở banner và footer), trên bảng cảnh báo XML3 (nút icon '↺' cạnh nút '✓ Đã sửa'), trên thanh Bulk Action Toolbar XML3 (nút '↺ Khôi phục ban đầu (X)'), trên các bảng cảnh báo XML khác (ValidationTable) và trong giao diện tra cứu hồ sơ 15 bảng (PatientDossierView).",
      ],
    },
    {
      version: "2.11.5",
      date: "2026-11-10",
      changes: [
        "Cho phép bỏ trống trường SO_CCCD (xóa toàn bộ thông tin) ở XML1 và lưu vào Kế hoạch sửa: Bổ sung nút gợi ý '🗑️ Bỏ trống / Xóa thông tin SO_CCCD', gỡ bỏ chặn validation bắt buộc nhập khi xóa trắng trường CCCD, tự động điền lý do xóa rỗng và hiển thị trạng thái '(xóa rỗng / để trống)' trực quan trên Kế hoạch sửa và bảng 15 tab XML.",
      ],
    },
    {
      version: "2.11.4",
      date: "2026-11-07",
      changes: [
        "Chuẩn hóa giao diện modal Sửa trực tiếp: Loại bỏ nút 'Lưu vào kế hoạch' bị trùng lặp ở hàng tiêu đề label, chỉ giữ lại một nút '💾 Lưu vào kế hoạch sửa' duy nhất đặt trực quan ngay cạnh ô nhập giá trị mới thay thế.",
      ],
    },
    {
      version: "2.11.3",
      date: "2026-11-06",
      changes: [
        "Tạo thêm nút 'Lưu vào kế hoạch sửa' ngay cạnh tiêu đề và ô nhập Giá trị mới thay thế trong Modal Sửa trực tiếp: Tiết kiệm tối đa thao tác, người dùng lưu ngay sau khi nhập hoặc chọn gợi ý nhanh mà không cần cuộn chuột xuống đáy modal.",
        "Đồng bộ hóa dữ liệu đã sửa hàng loạt trên toàn bộ hệ thống: Khi đã tích sửa hàng loạt, mở hồ sơ bệnh nhân lên (kể cả từ hồ sơ thứ 2 trở đi trong danh sách tích hoặc mở từ trang Tra cứu 15 bảng XML) sẽ tự động hiển thị đầy đủ thông tin đã sửa, bao gồm mốc giờ dự kiến sau sửa, thời lượng sau sửa, ô nhập hiển thị giá trị mới thay thế và banner xanh lá thông báo đã lập kế hoạch.",
        "Hiển thị trực quan kết quả đã sửa trên bảng cảnh báo XML3 và trang xem 15 bảng XML: Gạch ngang thời gian cũ và hiển thị giờ mới kèm dấu tick ✓ màu xanh lá đậm; tính lại thời lượng mới và hiển thị badge 'Đạt chuẩn ✓'; dòng đã sửa đổi màu xanh ngọc nhẹ với viền trái xanh lá nổi bật.",
        "Loại bỏ hoàn toàn icon bút chì bị nhân đôi trên nút 'Đã sửa': Chỉ hiển thị duy nhất ký hiệu '✓ Đã sửa' khi dòng đã được lập kế hoạch.",
      ],
    },
    {
      version: "2.11.2",
      date: "2026-11-06",
      changes: [
        "Đổi màu sắc trực quan nổi bật cho dòng đã sửa xong: Dòng đã được thêm vào Kế hoạch sửa (isPlanned) tự động chuyển sang màu nền xanh ngọc nhẹ (emerald-50) kèm viền trái màu xanh lá đậm (border-l-4 border-l-emerald-500), phân biệt rõ ràng và trực quan hoàn toàn với các dòng lỗi màu hồng (rose-50).",
        "Chuẩn hóa nút trạng thái 'Đã sửa': Loại bỏ triệt để icon bút chì thứ 2 bị nhân đôi thừa, chuyển sang định dạng chuyên nghiệp '✓ Đã sửa' (hoặc '✏️ Sửa' khi chưa lập kế hoạch).",
        "Nâng cấp thanh công cụ Hiệu chỉnh đồng thời (Bulk Action Toolbar): Bổ sung mốc rút ngắn nhanh '8p' (bên cạnh 10p, 15p, 20p, 30p, 45p, 60p), bổ sung nút thông minh '🎯 Theo cấu hình quy tắc từng DV' tự động áp dụng ngưỡng tối đa maxMinutes theo đúng cấu hình Thư viện dịch vụ của từng dòng, và bổ sung nút '⏱️ Trừ lùi giờ TH (-10p)' chuyên xử lý hàng loạt các ca trùng giờ (0 phút).",
        "Đóng băng đầu trang (Freeze Pane / Sticky Header): Cố định thanh thao tác hàng loạt (Bulk Action Toolbar) và toàn bộ hàng tiêu đề cột (kèm dòng lọc tìm kiếm) trên cùng khi cuộn dọc bảng danh sách, áp dụng đồng bộ cho cả bảng XML3 và các bảng cảnh báo XML1, XML2, XML4, XML5, XML7.",
      ],
    },
    {
      version: "2.11.1",
      date: "2026-11-06",
      changes: [
        "Khắc phục triệt để lỗi lệch múi giờ (UTC+7) trong hàm tính toán thời gian addMinutesToXmlDateTime: Sử dụng phương thức UTC chuẩn hóa (getUTCFullYear, getUTCHours, getUTCMinutes), loại bỏ hoàn toàn hiện tượng bị cộng dư 7 giờ (420 phút) trên máy tính người dùng Việt Nam.",
        "Chuẩn hóa nghiệp vụ gợi ý cộng giờ cho ca vượt thời lượng: Căn cứ chính xác vào mốc thời gian thực hiện y lệnh (NGAY_TH_YL) để cộng thêm phút ra giờ trả kết quả (NGAY_KQ), ví dụ NGAY_TH_YL 12:07 ➔ NGAY_KQ thành 12:17 (+10p điện tim) hoặc 12:15 (+8p chuẩn).",
        "Bổ sung nút gợi ý '⭐ Chuẩn (+8p)' bên cạnh nút '⭐ Điện tim (+10p)' trong modal Sửa trực tiếp và tự động điền giá trị chuẩn xác ngay khi mở modal.",
      ],
    },
    {
      version: "2.11.0",
      date: "2026-11-05",
      changes: [
        "Thêm quy tắc kiểm tra XML7 (Dữ liệu giấy ra viện): Bắt buộc thời gian nghỉ ngoại trú NGOAITRU_TUNGAY không được nhỏ hơn ngày ra viện NGAY_RA. Tự động so sánh mốc ngày YYYYMMDD và phát hiện các ca vi phạm.",
        "Gợi ý sửa thông minh XML7: Tự động tính toán mốc ngày hợp lệ = ngày ra viện NGAY_RA + 1 ngày (ví dụ ra viện ngày 04/11 thì ngoại trú bắt đầu từ 05/11), cung cấp nút '⚡ Đặt +1 ngày sau ra viện' trong modal Sửa trực tiếp.",
        "Mở rộng Sửa trực tiếp mọi dòng (XML 1 - 15) trong Hồ sơ Bệnh nhân: Thêm nút tích '✏️ Cho phép sửa mọi dòng (XML 1 - 15)' trên toolbar bảng XML. Khi bật, người dùng có thể bấm nút Sửa trên bất kỳ dòng nào (kể cả dòng đạt chuẩn không có cảnh báo) và chọn bất kỳ trường thông tin nào trong 15 bảng XML để đưa vào Kế hoạch sửa.",
        "Tích hợp nút Sửa trong modal Chi tiết dòng (click đúp) hỗ trợ đầy đủ chế độ sửa mọi dòng.",
        "Cập nhật định nghĩa cột bảng XML7 trên trang Cảnh báo, đồng bộ dữ liệu xuất JSON/Excel cho VNPT-HIS Extension.",
      ],
    },
    {
      version: "2.10.1",
      date: "2026-11-05",
      changes: [
        "Ẩn nút '⚡ Tự động tạo kế hoạch' trên giao diện chính và modal Kế hoạch sửa để tránh thao tác bấm nhầm làm ghi đè nội dung người dùng đang hiệu chỉnh thủ công hoặc sửa hàng loạt.",
        "Khắc phục triệt để lỗi hiển thị mã nguồn JavaScript dạng text khi mở trực tiếp file HTML offline (single-page) trên Chrome/Edge qua giao thức file:///.",
        "Tối ưu hóa thứ tự script trong file build offline: Đặt inline script ở cuối body giúp DOM khởi tạo hoàn tất trước khi app mount.",
        "Cập nhật tài liệu và hướng dẫn sử dụng phiên bản v2.10.1.",
      ],
    },
    {
      version: "2.10.0",
      date: "2026-11-05",
      changes: [
        "Nâng cấp gợi ý sửa tự động nhanh trong modal Sửa trực tiếp: Với các ca trùng giờ thực hiện và trả kết quả (0 phút), căn cứ vào giờ kết quả trừ lùi 8-10 phút (kèm mốc 15p, 20p) để tự động sửa giờ thực hiện y lệnh (NGAY_TH_YL). Với các ca vượt thời lượng (> 70 phút), căn cứ vào giờ thực hiện y lệnh cộng thêm giờ phút tương ứng (+10p điện tim/nhanh, +15p, +20p, +30p, +45p, +60p) để điền vào giờ kết quả (NGAY_KQ). Hiển thị trực quan mốc giờ sau khi điều chỉnh ngay trên nhãn nút (➔ HH:mm).",
        "Tối ưu trang Tra cứu Hồ sơ Bệnh nhân (15 bảng BHYT): Tự động phát hiện và highlight màu nền đỏ nhạt nổi bật kèm viền trái đỏ đối với tất cả các dòng có cảnh báo/lỗi. Cột số thứ tự (#) hiển thị icon cảnh báo ⚠️ kèm tooltip chi tiết các lỗi của dòng đó.",
        "Bộ lọc chỉ hiện dòng cảnh báo (Checkbox): Bổ sung nút tích '⚠️ Chỉ hiện dòng cảnh báo (X)' trên toolbar bảng XML để lọc tức thì các dòng lỗi trên các bảng có nhiều dữ liệu (XML3, XML4...).",
        "Tích hợp nút Sửa trực tiếp ✏️ ngay trên dòng lỗi trong bảng XML và trong modal Xem chi tiết dòng (click đúp) để lập kế hoạch sửa nhanh mà không cần chuyển trang.",
        "Tối ưu layout gọn gàng, tăng diện tích bảng dữ liệu: Thu gọn header banner và thẻ hành chính bệnh nhân, mở rộng chiều cao bảng XML thêm hơn 120px giúp người dùng quan sát được nhiều dòng dữ liệu cùng lúc mà không phải cuộn tìm liên tục.",
      ],
    },
    {
      version: "2.9.0",
      date: "2026-11-04",
      changes: [
        "Sửa đồng thời hàng loạt (Batch Edit) theo từng tab lỗi: Bổ sung thanh công cụ thao tác hàng loạt kèm checkbox chọn từng dịch vụ hoặc toàn bộ bảng. Hỗ trợ giảm nhanh thời lượng theo các mốc 10p, 15p, 20p, 30p, 45p, 60p hoặc tùy chọn phút; sao chép hàng loạt giá trị GIA_TRI sang KET_LUAN cho XML4; đồng bộ NGAY_YL = NGAY_TH_YL cho công khám/dịch vụ.",
        "Khắc phục triệt để lỗi cuộn ngang bảng Kế hoạch sửa: Tích hợp thanh cuộn ngang phụ ở đỉnh bảng (Top Scrollbar) đồng bộ 2 chiều với bảng dữ liệu chính, thêm 2 nút điều hướng cuộn nhanh (◀ Cuộn trái / Cuộn phải ▶), mở rộng chiều rộng bảng lên 1550px đảm bảo đối chiếu trọn vẹn tất cả các cột.",
        "Hiển thị phiên bản v2.9.0 trực quan trên Header Badge và giao diện ứng dụng.",
      ],
    },
    {
      version: "2.8.0",
      date: "2026-11-04",
      changes: [
        "Tính năng Sửa trực tiếp dòng XML bị cảnh báo (Direct Edit): Bổ sung nút '✏️ Sửa' trực tiếp trên từng dòng dữ liệu bị cảnh báo (XML3 WarningRow và XML1, XML2, XML4 ValidationTable). Cung cấp hộp thoại sửa nhanh với các gợi ý thông minh (Rút ngắn thời lượng 30p/60p, Dịch mốc máy +5p/+10p, Chuẩn hóa 12 số CCCD, Mẫu kết luận XML4).",
        "Quản lý Kế hoạch chỉnh sửa tự động (Correction Plan): Thư viện quản lý kế hoạch sửa đổi tập trung, hỗ trợ lưu trữ cục bộ, nút '⚡ Tự tạo kế hoạch' quét và tự động sinh toàn bộ kế hoạch sửa tối ưu cho hàng trăm hồ sơ cùng lúc.",
        "Xuất Kế hoạch chỉnh sửa ra JSON và Excel: Hỗ trợ xuất file JSON chuẩn định dạng cho Chrome Extension 'vncare-xml130-auto-editor' và file Excel XLSX 2 sheet chuyên nghiệp để theo dõi, đối soát.",
        "Tích hợp huy hiệu 'Đã sửa ✏️' ngay trên bảng dữ liệu để người dùng dễ dàng nhận biết các dòng đã được lập lịch sửa đổi.",
      ],
    },
    {
      version: "2.7.0",
      date: "2026-10-26",
      changes: [
        "Bật bộ lọc cột và tìm kiếm trực tiếp trên tiêu đề: Thêm nút '🔍 Bộ lọc cột' trên toolbar cho phép bật/tắt hàng input tìm kiếm ngay dưới hàng tiêu đề bảng (thead cố định). Từng cột có ô tìm kiếm/lọc riêng biệt.",
        "Bộ lọc trạng thái & số phút thông minh: Cột Trạng thái hỗ trợ dropdown chọn nhanh các nhãn chuẩn (ĐẠT, VƯỢT MAX, TRÙNG MÁY, MÃ MÁY, TT_THAU, SAI THỨ TỰ, TRÙNG MỐC, GIƯỜNG, Z00.0, Z30.1, THIẾU/LỖI). Cột Số phút và Vượt ngưỡng hỗ trợ cú pháp so sánh toán tử thông minh (>70, <=0, >=50, =0, v.v.).",
        "Bộ lọc chuỗi & tìm kiếm ô trống: Cột TT_THAU và Mã máy hỗ trợ tìm kiếm từ khóa hoặc gõ 'trống'/'rỗng' để lọc nhanh các dòng chưa có dữ liệu. Tất cả các cột văn bản hỗ trợ tìm kiếm không phân biệt hoa/thường và tiếng Việt không dấu.",
        "Sắp xếp trực tiếp trên tiêu đề cột (Sort): Click trực tiếp vào tiêu đề cột để luân chuyển sắp xếp: Tăng dần (▲) ➔ Giảm dần (▼) ➔ Hủy sắp xếp (↕). Đảm bảo không xung đột với thao tác kéo thả chỉnh độ rộng cột (ResizableTh).",
        "Nút xóa lọc & hủy xếp nhanh: Tự động hiển thị nút '✕ Xóa lọc' (kèm số lượng bộ lọc đang kích hoạt) và nút '↕ Hủy xếp' khi có sắp xếp hoặc lọc đang áp dụng.",
        "Áp dụng đồng bộ cho tất cả các bảng: Hỗ trợ đầy đủ cho bảng chính XML3 và toàn bộ các bảng cảnh báo liên quan XML1, XML2, XML4 (ValidationTable).",
      ],
    },
    {
      version: "2.6.0",
      date: "2026-10-24",
      changes: [
        "Tùy chỉnh màu sắc cảnh báo: Bổ sung bảng cấu hình màu sắc riêng biệt cho từng loại/nhóm cảnh báo (12 nhóm: Vượt max, Thiếu min, Trùng máy, Mã máy, TT_THAU, Sai thứ tự, Trùng mốc, Z00.0/Z30.1, Giường, Kết luận XML4, CCCD XML1). Hỗ trợ Color picker trực quan, bảng màu gợi ý nhanh (palette), xem trước badge và lưu trữ bền vững qua localStorage.",
        "Bộ lọc phân loại lỗi toàn diện: Nâng cấp thanh Filter Chips hiển thị đầy đủ 12 nhóm lỗi, tích hợp swatch màu sắc tùy chỉnh, đếm số lượng lỗi tức thời và hỗ trợ chuyển tab tự động (ví dụ bấm CCCD chuyển XML1, bấm Kết luận chuyển XML4, bấm Z00.0 chuyển XML1/XML3).",
        "Chi tiết đối chiếu trùng máy trong modal Xem (👁️): Trực quan hóa danh sách các bản ghi bị trùng (phân biệt rõ Cùng bệnh nhân / Khác bệnh nhân, thời điểm thực hiện, họ tên, mã BN, mã LK, tên dịch vụ kỹ thuật, kèm nút mở nhanh hồ sơ 15 bảng).",
        "Xuất riêng file Excel đối chiếu trùng máy: Bổ sung tính năng xuất file Excel đối chiếu chuyên sâu ('Doi_chieu_trung_ma_may_XML3.xlsx') gồm 2 sheet: Sheet Tóm tắt các máy bị trùng và Sheet Đối chiếu chi tiết (đầy đủ các cột đối soát BHYT, phân biệt Cùng/Khác BN, gom nhóm và tô màu xen kẽ giữa các cụm trùng).",
        "Loại trừ kiểm tra trùng máy với MA_NHOM = 1: Bỏ qua kiểm tra và cảnh báo trùng thời gian thực hiện trên cùng mã máy đối với các dịch vụ khám bệnh / tiền khám có mã nhóm bằng 1.",
        "Loại trừ cảnh báo mã máy với MA_NHOM = 10: Bỏ qua kiểm tra và cảnh báo mã máy (bắt buộc rỗng / sai định dạng chuẩn) cũng như cảnh báo trùng máy đối với vật tư đi kèm dịch vụ kỹ thuật có mã nhóm bằng 10.",
      ],
    },
    {
      version: "2.5.0",
      date: "2026-10-24",
      changes: [
        "Bổ sung rà soát và cảnh báo đối với dữ liệu XML3 bị trùng thời gian trên cùng một mã máy: Cảnh báo 'DVKT trùng thời gian thực hiện y lệnh cho một hoặc nhiều người bệnh trên cùng mã máy' khi có từ 2 bản ghi DVKT trở lên có cùng MA_MAY và trùng thời điểm NGAY_TH_YL (hỗ trợ kiểm tra cross-record và cross-patient/cross-file toàn bộ đợt phân tích).",
        "Hiển thị huy hiệu 'TRÙNG MÁY' nổi bật trên bảng cảnh báo, Metric đếm riêng 'Trùng máy XML3', tích hợp vào nhóm lọc mã máy, xuất trạng thái TRÙNG MÁY và tô vàng trên file báo cáo Excel.",
        "Khắc phục triệt để lỗi 'Failed to fetch' khi gửi Telegram: Hỗ trợ cấu hình tùy chỉnh Telegram API Endpoint / Reverse Proxy trong cài đặt, diễn giải chi tiết nguyên nhân nhà mạng chặn tên miền api.telegram.org và hướng dẫn người dùng kết nối thông suốt.",
      ],
    },
    {
      version: "2.4.0",
      date: "2026-09-28",
      changes: [
        "Bổ sung cảnh báo mã bệnh Z30.1 (Đặt dụng cụ tránh thai): Căn cứ Khoản 10 Điều 23 Luật Bảo hiểm y tế (dịch vụ Kế hoạch hóa gia đình không thuộc phạm vi thanh toán của quỹ BHYT). Tự động rà soát trên tất cả các bảng XML (từ XML1 đến XML15), bao gồm mã bệnh chính, mã bệnh kèm theo, mã bệnh YHCT và cột chẩn đoán văn bản (CHAN_DOAN_RV, CHAN_DOAN_VAO).",
        "Định dạng thông báo chuẩn: 'XML xx. Chi tiết thứ x: Mã bệnh  'Z30.1' là mã đặt dụng cụ tránh thai (KHHGĐ) không được thanh toán BHYT.'",
        "Đồng bộ tích hợp cảnh báo Z30.1 vào nhóm cảnh báo ICD (Z00.0 / Z30.1), thanh lọc Filter Chips, huy hiệu cảnh báo (Badge Z30.1), xuất báo cáo Excel chi tiết và thông báo Telegram.",
      ],
    },
    {
      version: "2.3.1",
      date: "2026-09-26",
      changes: [
        "Bổ sung quy tắc kiểm tra cảnh báo trường CCCD (SO_CCCD / CCCD) trong bảng XML1: cảnh báo khi có độ dài dưới 12 ký tự (ví dụ: số CMND 9 số cũ hoặc nhập thiếu số) hoặc sai định dạng (chuẩn 12 chữ số).",
        "Hiển thị rõ mã trường SO_CCCD và tên trường 'Số CCCD / Định danh' trong bảng cảnh báo XML1 và khi xuất file Excel cảnh báo.",
      ],
    },
    {
      version: "2.3.0",
      date: "2026-09-14",
      changes: [
        "Cải tiến tra cứu hồ sơ bệnh nhân: Nhấn vào badge cảnh báo để hiển thị danh sách các bảng lỗi, tô nổi bật các tab XML có lỗi kèm số lượng lỗi và nút chuyển trực tiếp đến từng bảng XML.",
        "Trích xuất Chẩn đoán chính từ cột 26 CHAN_DOAN_RV trong bảng XML1, lấy mã bệnh đầu tiên trước dấu chấm phẩy (;) kèm mô tả.",
        "Bỏ popup hover khi di chuột; bổ sung nút nhỏ '👁️ Xem' tại ô trạng thái của dòng cảnh báo để mở modal chi tiết bệnh nhân cố định giữa màn hình, hỗ trợ bôi đen copy văn bản, nút sao chép tóm tắt và mở nhanh hồ sơ 15 bảng.",
        "Phân loại cảnh báo theo 8 nhóm màu sắc trực quan (Vượt max, Thiếu min/≤0, Mã máy, TT_THAU, Trình tự/Trùng, Mã Z00.0, Giường, Kết luận XML4) và tích hợp thanh Filter Chips lọc nhanh trên bảng dữ liệu.",
        "Khắc phục triệt để thanh cuộn ngang trong bảng tra cứu hồ sơ: loại bỏ container lồng nhau gây trôi scrollbar xuống tận đáy trang; bổ sung thanh cuộn ngang phụ ở đỉnh bảng, nút trượt ngang nhanh (◀ Sang trái / Sang phải ▶) và ghim cố định cột số thứ tự bên trái.",
        "Ẩn mặc định lưới 16 thẻ thống kê cồng kềnh phía trên để tối ưu tối đa không gian hiển thị, đưa bảng cảnh báo lên ngay đầu màn hình và tránh trùng lặp thông tin với thanh phân loại lỗi.",
      ],
    },
    {
      version: "2.2.0",
      date: "2026-09-14",
      changes: [
        "Rà soát và kiểm tra bắt buộc mã máy (cột 44 MA_MAY trong Bảng 3 XML3) đối với 3,471 dịch vụ kỹ thuật theo danh mục bắt buộc (so sánh cột 3 MA_DICH_VU).",
        "Cảnh báo khi dịch vụ bắt buộc bị để trống cột MA_MAY hoặc sai nguyên tắc chuẩn XX.3[xxx].Z (ví dụ: HH.3[vaynganhang].SN123).",
        "Cảnh báo cấu trúc sai đối với dịch vụ không nằm trong danh mục nhưng có khai báo MA_MAY.",
        "Tích hợp tab '🔬 DVKT bắt buộc mã máy' trong Thư viện quản lý với Simulator kiểm tra nhanh, phân trang tìm kiếm 3,471 DVKT, thêm/sửa/xóa, khôi phục mặc định, xuất/nhập file Excel 3 sheet đồng bộ và sao lưu JSON.",
        "Cập nhật hiển thị cột MA_MAY trong tab cảnh báo XML3, chỉ dẫn badge cảnh báo, metric tổng quan XML3 · MÃ_MÁY, xuất Excel chi tiết và gửi báo cáo Telegram.",
      ],
    },
    {
      version: "2.1.0",
      date: "2026-09-14",
      changes: [
        "Thêm cảnh báo kiểm tra tất cả các cột mã bệnh (MA_BENH, MA_BENH_CHINH, MA_BENH_KT, MA_BENHKEMTHEO, MA_BENH_YHCT...) của tất cả các bảng XML: cảnh báo mã khám sức khỏe Z00.0 không được thanh toán BHYT (định dạng chuẩn: 'XML xx. Chi tiết thứ x: Mã bệnh  'Z00.0' là mã khám sức khỏe không được thanh toán BHYT.').",
        "Hỗ trợ hiển thị tab cảnh báo linh hoạt cho tất cả các bảng XML (XML1 đến XML15), tùy chỉnh ẩn/hiện và độ rộng cột đồng bộ.",
        "Cập nhật metric tổng quan 'Mã bệnh Z00.0', xuất báo cáo Excel chi tiết và gửi thông báo Telegram bao gồm chỉ tiêu Z00.0.",
      ],
    },
    {
      version: "2.0.0",
      date: "2026-09-14",
      changes: [
        "Sửa định dạng ngày giờ hiển thị theo chuẩn Việt Nam: DD/MM/YYYY HH:mm thay vì bị đảo MM/DD/YYYY.",
        "Thêm popup hovercard khi rê chuột vào bất kỳ dòng cảnh báo lỗi XML nào: hiển thị tức thời thông tin hành chính bệnh nhân (từ XML1), ngày vào/ngày ra viện, chi tiết mốc thời gian XML3 (NGAY_YL, NGAY_TH_YL, NGAY_KQ, số phút thực hiện) và nội dung cảnh báo.",
        "Bổ sung hệ thống Kho Giao diện (Theme Gallery) kỹ thuật số & hiện đại đẳng cấp (Clinical Teal, Cyber Digital Neon 4.0, Luxury Obsidian Gold, Ocean Digital, Pure Minimalist) đồng bộ 100% màu sắc bố cục.",
        "Tích hợp bộ chọn Font chữ tiếng Việt với Be Vietnam Pro là font chủ đạo mặc định (kèm Inter, Plus Jakarta Sans, Lexend, Roboto), lưu cấu hình vào localStorage.",
        "Bổ sung module 'Hồ sơ & Xem XML 15 bảng': tìm kiếm và xem hồ sơ từng bệnh nhân (cả BN có lỗi và không có lỗi), phân tách chi tiết theo 15 tab chuẩn BHYT QĐ 130/4210, hỗ trợ 2 chế độ Data Grid (bảng dữ liệu lọc tìm kiếm) và Raw XML (cú pháp XML gốc, sao chép, tải về).",
      ],
    },
    {
      version: "1.9.0",
      date: "2026-09-01",
      changes: [
        "Bổ sung quy ước thời gian tối thiểu (mặc định > 0 phút hoặc cấu hình riêng theo dịch vụ) trong thư viện và khi đánh giá XML3; cảnh báo khi thời lượng dưới ngưỡng tối thiểu.",
        "Hỗ trợ nhập (Import) danh mục Thư viện bằng file Excel (.xlsx): hỗ trợ 2 chế độ Gộp (Merge) hoặc Ghi đè (Overwrite).",
        "Hỗ trợ xuất file Excel mẫu chuẩn (Template) với đầy đủ định dạng và ghi chú hướng dẫn để dễ dàng điền dữ liệu nạp vào hệ thống.",
        "Hỗ trợ xuất toàn bộ Thư viện dịch vụ kỹ thuật và danh mục thuốc ra file Excel nhiều sheet.",
      ],
    },
    {
      version: "1.8.0",
      date: "2026-09-01",
      changes: [
        "Thêm bộ cấu hình tùy chỉnh thêm/ẩn/hiện các cột và kéo thả thay đổi kích thước cột trên TẤT CẢ các tab cảnh báo (XML1, XML2, XML3, XML4); tự động lưu cấu hình theo từng tab vào localStorage.",
        "Thêm danh mục Thuốc loại trừ khỏi cảnh báo TT_THAU ở XML2 vào Thư viện: hỗ trợ thêm/sửa/xóa thuốc, tìm kiếm, thử nghiệm quy tắc (Simulator).",
        "Thêm nút 'Loại trừ thuốc' trực tiếp trên từng dòng cảnh báo XML2 để loại trừ nhanh và tự động phân tích lại.",
        "Cập nhật hệ thống Backup và gửi Telegram đồng bộ cả thư viện thuốc loại trừ và cấu hình hiển thị cột toàn trang.",
      ],
    },
    {
      version: "1.7.0",
      date: "2026-09-01",
      changes: [
        "Chuyển Thư viện dịch vụ sang tab riêng độc lập: cho phép thêm, chỉnh sửa trực tiếp, tìm kiếm và kiểm tra thử quy tắc thời lượng.",
        "Thêm kiểm tra XML2 cột 15 TT_THAU bắt buộc không để trống: cảnh báo 'XML2. Chi tiết thứ xxx: Thiếu thông tin TT_THAU' kèm tab hiển thị và xuất Excel riêng.",
        "Thêm kiểm tra XML3 với MA_NHOM 10 và 11 bắt buộc cột TT_THAU không để trống: cảnh báo 'XML3: TT_THAU không được để trống khi mã nhóm bằng 10 hoặc 11'.",
        "Tối ưu độ rộng cột bảng XML3: thu gọn cột Chi tiết, mở rộng cột Dịch vụ/Vật tư, hỗ trợ kéo thả chỉnh độ rộng cột và tự động lưu cấu hình.",
        "Thêm chức năng tạo file backup Thư viện và backup Cấu hình toàn trang, khôi phục từ file backup JSON.",
        "Tích hợp cấu hình Telegram: gửi tin nhắn kiểm tra, gửi báo cáo Excel và file backup trực tiếp về kênh Telegram.",
      ],
    },
    {
      version: "1.6.1",
      date: "2026-08-31",
      changes: [
        "Tối ưu bảng cảnh báo XML3: trạng thái CẢNH BÁO rút gọn thành CB, Chi tiết đứng cạnh Vượt ngưỡng, Dịch vụ/Vật tư mở rộng và File/STT chuyển về cuối.",
      ],
    },
    {
      version: "1.6.0",
      date: "2026-08-31",
      changes: [
        "Thêm thư viện dịch vụ lưu cục bộ: loại trừ dịch vụ hoặc đặt ngưỡng thời gian riêng; có thể thêm trực tiếp từ từng cảnh báo và tự phân tích lại toàn bộ dòng cùng mã dịch vụ.",
      ],
    },
    {
      version: "1.5.2",
      date: "2026-08-31",
      changes: [
        "Reset tab XML3 và bộ lọc loại cảnh báo về Cảnh báo sau mỗi lần bấm Phân tích để không che các cảnh báo thời lượng bằng trạng thái lọc cũ.",
      ],
    },
    {
      version: "1.5.1",
      date: "2026-08-31",
      changes: [
        "Đưa Số phút và Vượt ngưỡng lên ngay sau MA_BN trong bảng cảnh báo XML3 và báo cáo XLSX.",
      ],
    },
    {
      version: "1.5.0",
      date: "2026-08-31",
      changes: [
        "Bắt buộc giữ cảnh báo thời lượng >70 phút cho MA_NHOM 2, 3, 8, 18; không phụ thuộc việc bỏ chọn bộ lọc nhóm.",
        "Thêm cảnh báo XML1 khi MA_DKBD = MA_CSKCB nhưng MA_DOITUONG_KCB khác 1.1; thu gọn vùng điều khiển sau phân tích.",
      ],
    },
    {
      version: "1.4.1",
      date: "2026-08-30",
      changes: [
        "Bỏ qua SO_CCCD rỗng/null; bổ sung mã dịch vụ và tên dịch vụ trong bảng, nội dung và XLSX cảnh báo XML4.",
      ],
    },
    {
      version: "1.4.0",
      date: "2026-08-30",
      changes: [
        "Thêm kiểm tra SO_CCCD XML1 từ 9–12 chữ số và cảnh báo thiếu KET_LUAN/NGAY_KQ XML4 khi XML3 MA_NHOM=2.",
        "Thêm cảnh báo quá một MA_GIUONG trong cùng ngày theo MA_LK và MA_BN; giao diện tab XML1/XML3/XML4 và thẻ thống kê có thể bấm để lọc.",
        "Xuất XLSX riêng theo từng tab cảnh báo, đồng thời giữ báo cáo XML3 đầy đủ và bản single HTML offline.",
      ],
    },
    {
      version: "1.3.0",
      date: "2026-08-28",
      changes: [
        "Đủ 18 mã nhóm QĐ 5937, mặc định 2/3/8/18; nối MA_BN/HO_TEN XML1 với XML3 bằng MA_LK và thêm tìm kiếm bệnh nhân.",
      ],
    },
  ],
  coffee: {
    title: "Mời cà phê",
    blurb: "Nếu công cụ giúp bạn tiết kiệm thời gian, hãy ủng hộ tác giả một tách cà phê nhé!",
    accountName: "NGUYEN SON NAM",
    accountNumber: "8855989777",
    bank: "BIDV — PGD Nguyễn Tất Thành",
  },
} as const;
