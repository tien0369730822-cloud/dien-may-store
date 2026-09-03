# TODO: Chuyển website sang SQLite + Deploy Cloud (API cố định)

## Mục tiêu
- Deploy full website (khách + admin + login) + API lên cloud
- Có link API cố định vĩnh viễn (Render/Railway)
- Database chuyển sang SQLite (không cần tài khoản/tên miền)

## Các bước
- [x] Tạo `web/cloud/package.json` (deps: better-sqlite3, express, cors, bcryptjs, jsonwebtoken, dotenv)
- [x] Tạo `web/cloud/db.js` — khởi tạo SQLite, tạo 7 bảng + seed dữ liệu mẫu
- [x] Tạo `web/cloud/server.js` — REST API Express + better-sqlite3 (chuyển toàn bộ SQL sang SQLite)
- [x] Copy frontend (customer/admin/login/assets/logo/img) vào `web/cloud/public/`
- [x] Tạo `web/cloud/init-db.js` — tạo DB file khi khởi động
- [x] Tạo `render.yaml` để deploy lên Render
- [x] Tạo `web/cloud/README.md` + hướng dẫn tạo tài khoản deploy
- [x] Kiểm tra syntax tất cả file JS (node --check) — PASS
- [ ] Deploy lên Render/Railway và xác nhận link API cố định
- [ ] (Lưu ý) better-sqlite3 cần Node 20/Linux (Render/Railway OK); máy Windows+Node 24 này không compile được
