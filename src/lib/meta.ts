export const APP_META = {
  name: "NsN_XMLcheck",
  version: "1.7.0",
  date: "2026-09-01",
  author: "Nguyễn Sơn Nam (Nsnnam)",
  github: "https://github.com/Nsnnam/xml3-duration-checker",
  timezone: "Asia/Ho_Chi_Minh",
  changelog: [
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
