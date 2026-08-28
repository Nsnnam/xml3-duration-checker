# AGENTS.md — XML3 Duration Checker

## Quy tắc chính

Ứng dụng dùng giao diện tiếng Việt, múi giờ `Asia/Ho_Chi_Minh (GMT+7)` và tác giả **Nguyễn Sơn Nam (Nsnnam)**. Không commit token, `.env`, file XML thật hoặc dữ liệu bệnh án.

Nghiệp vụ phải giữ đúng công thức do người dùng yêu cầu: `NGAY_KQ - NGAY_TH_YL`, tính theo phút và chỉ cảnh báo khi kết quả **lớn hơn 70**. Không tự đổi thành điều kiện `>= 70`.

## Kiểm tra trước commit

```bash
npm run build
npm run build:offline
npx eslint src spa scripts --no-cache
npx tsc --noEmit
node --experimental-strip-types scripts/check-xml3-duration.mjs
```

Repo nội bộ/y tế mặc định private. Artifact chính nằm tại `releases/web/` và `releases/single-page/xml3-duration-checker.html`.
