# ☁️ Điện Máy Nguyên Hùng — Phiên bản Cloud (API cố định)

Phiên bản này chuyển backend sang **SQLite** để có thể deploy lên **Render/Railway** — cho bạn **link API + website cố định vĩnh viễn** (không đổi mỗi lần chạy như trycloudflare).

---

## ✅ Tính năng
- **Full website**: Trang khách hàng + Admin + Login + API — tất cả trên 1 link.
- **Database SQLite**: không cần tài khoản/tên miền, không cần thẻ tín dụng.
- **API cố định**: `/api/products`, `/api/orders`, `/api/login`, `/api/health`... chạy 24/7.

---

## 📁 Cấu trúc
```
cloud/
├── server.js          # Express + REST API (SQLite)
├── db.js              # Khởi tạo DB + seed dữ liệu mẫu
├── catalog-seed.js    # Sản phẩm mẫu cho thương hiệu
├── init-db.js         # Chạy lần đầu tạo DB
├── render.yaml        # Deploy Render (1 bấm)
├── package.json
└── public/            # Frontend (customer, admin, login, assets)
```

---

## 🖥️ Chạy thử trên máy (trước khi deploy)

```bash
cd web/cloud
npm install
node init-db.js      # tạo data.sqlite + seed
npm start            # chạy server
```

Mở: `http://localhost:10000`
- Trang khách: `http://localhost:10000/customer/khachhang.html`
- Trang admin: `http://localhost:10000/admin/admin.html` (admin / admin123)
- Health check: `http://localhost:10000/api/health`

---

## 🚀 Deploy lên Render (có link cố định — khuyến nghị)

### Cách 1: Deploy bằng Blueprint (nhanh nhất)
1. Đăng ký tài khoản miễn phí tại https://render.com
2. Đẩy code lên GitHub (repo chứa thư mục `cloud/`)
3. Vào Render → **New → Blueprint** → chọn repo → Render tự đọc `cloud/render.yaml` và deploy.
4. Chọn gói web service có trả phí (Blueprint mặc định `0.5c-512mb`) vì dữ liệu đơn hàng SQLite cần persistent disk.
5. Nhận link: `https://dienmay-nguyenhung-api.onrender.com`

### Cách 2: Deploy thủ công từ Dashboard
1. Render → **New → Web Service**.
2. Chọn repo GitHub (hoặc tải lên qua Blueprint).
3. **Root Directory**: `cloud`
4. **Build Command**: `npm install`
5. **Start Command**: `node server.js`
6. **Instance Type**: gói có trả phí hỗ trợ Persistent Disk.
7. Gắn **Persistent Disk** tại `/data`, sau đó Deploy và chờ vài phút → nhận link cố định.

> Blueprint đã gắn persistent disk và đặt `DB_PATH=/data/data.sqlite`. Render không hỗ trợ persistent disk trên web service miễn phí, nên không dùng gói Free cho website có đơn hàng. Khi tạo Blueprint, Render sẽ yêu cầu bạn nhập `INITIAL_ADMIN_PASSWORD`; hãy dùng mật khẩu mạnh và lưu ở nơi an toàn. Không cần đặt `JWT_SECRET` thủ công vì Render tự sinh secret riêng.

---

## 🚀 Deploy lên Railway (dữ liệu bền vững hơn)

1. Đăng ký https://railway.app (miễn phí, đôi khi cần thẻ xác minh $5).
2. **New Project** → chọn repo GitHub / upload thư mục.
3. Cài thêm **Volume** gắn vào đường dẫn `/data` (để SQLite lưu bền vững).
4. Set biến môi trường: `DB_PATH=/data/data.sqlite`
5. Nhận link: `https://<ten-du-an>.up.railway.app`

---

## 🔐 Tài khoản ban đầu
Tài khoản quản trị là `admin`; mật khẩu là giá trị `INITIAL_ADMIN_PASSWORD` bạn đặt lúc triển khai. Bản production không tạo tài khoản khách hàng mẫu. Khi chạy local ở chế độ development, vẫn có tài khoản thử nghiệm `admin/admin123` và `khachhang/kh123456`.

---

## 🔧 Cấu hình môi trường
Copy `.env.example` thành `.env` nếu cần:
```
PORT=10000
NODE_ENV=development
JWT_SECRET=your-long-random-secret
INITIAL_ADMIN_PASSWORD=your-strong-admin-password
# DB_PATH=/data/data.sqlite   # dùng khi deploy (Railway/Render có disk)
```

---

## ❓ So sánh với phiên bản trycloudflare
| | trycloudflare (cũ) | Cloud (này) |
|---|---|---|
| Link | đổi mỗi lần | **cố định vĩnh viễn** |
| Máy bạn | phải bật | **không cần bật** |
| Database | SQL Server trên máy | SQLite trên cloud |
| Chi phí | miễn phí | miễn phí (web free) |
| Dữ liệu | trên máy bạn | trên cloud |
