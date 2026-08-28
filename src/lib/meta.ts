export const APP_META = {
  name: "XML3 Duration Checker",
  version: "1.1.0",
  date: "2026-08-28",
  author: "Nguyễn Sơn Nam (Nsnnam)",
  github: "https://github.com/Nsnnam/xml3-duration-checker",
  timezone: "Asia/Ho_Chi_Minh",
  changelog: [
    {
      version: "1.1.0",
      date: "2026-08-28",
      changes: [
        "Thêm lọc MA_NHOM, kiểm tra thứ tự NGAY_YL → NGAY_TH_YL → NGAY_KQ và định dạng MM/DD/YYYY HH:mm.",
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
