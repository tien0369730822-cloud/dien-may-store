# 🏪 ĐIỆN MÁY NGUYÊN HÙNG - BACKEND SERVER

Backend server cho hệ thống quản lý bán hàng Điện Máy Nguyên Hùng.
Công nghệ: **Node.js + Express + SQL Server (mssql) + JWT + bcrypt**

---

## 📋 Yêu cầu

- **Node.js** v18+ (đã cài: v24.18.0)
- **SQL Server** (đã cài: `LAPTOP-31RCR7Q9\SQLEXPRESS`)
- **SQL Server Management Studio (SSMS)** để import file SQL

---

## 📲 Cấu hình thông báo Telegram khi có đơn mới

Không cần chạy lại SQL. Telegram chỉ cần cấu hình một lần trong thư mục `server`:

1. Mở Telegram, tìm **@BotFather**, gửi `/newbot` và làm theo hướng dẫn để nhận Bot Token.
2. Mở bot vừa tạo, bấm **Start** rồi gửi cho bot một tin nhắn bất kỳ, ví dụ `xin chào`.
3. Trong PowerShell, thay `<BOT_TOKEN>` bằng token vừa nhận rồi chạy:

```powershell
Invoke-RestMethod "https://api.telegram.org/bot<BOT_TOKEN>/getUpdates" | ConvertTo-Json -Depth 10
```

4. Trong kết quả, tìm `message` → `chat` → `id`. Đây là `TELEGRAM_CHAT_ID`.
5. Mở Terminal tại thư mục `server`, chạy:

```powershell
Copy-Item .env.example .env
```

6. Mở file `.env` vừa tạo và điền:

```env
TELEGRAM_BOT_TOKEN=token_lay_tu_BotFather
TELEGRAM_CHAT_ID=chat_id_vua_tim_duoc
```

7. Cài package và khởi động lại server:

```powershell
npm install
npm start
```

Khi Terminal hiện `Telegram: Đã cấu hình, sẵn sàng nhận đơn mới`, hãy tạo một đơn thử ở trang khách hàng. Sau khi đơn được lưu vào SQL, bot sẽ gửi mã đơn, khách hàng, số điện thoại, địa chỉ, sản phẩm và tổng tiền về Telegram.

> Không gửi Bot Token cho người khác và không đăng file `.env` lên mạng. Nếu Telegram tạm thời lỗi, đơn vẫn được lưu và vẫn xuất hiện ở trang Admin.

---
## 🚀 Cài đặt & Chạy

### Nếu bạn đang cập nhật website hiện có

Không chạy lại `SQL/nguyên hùng.sql` vì file đó dùng để tạo mới toàn bộ database.

1. Mở SSMS và chạy file `SQL/them_don_hang.sql` một lần. File này chỉ bổ sung cấu trúc đơn hàng, không xóa dữ liệu.
2. Dừng server cũ bằng `Ctrl + C` trong cửa sổ Terminal đang chạy Node.js.
3. Chạy lại server bằng các lệnh:

```bash
cd server
npm install
npm start
```

4. Mở lại `http://localhost:5000`, đăng nhập Admin và nhấn `Ctrl + F5` để trình duyệt tải JavaScript mới.

> Lỗi bảng đơn hàng trống đã được sửa trong `admin/admin.js`: mọi API Admin giờ tự động gửi JWT. Đơn mới được tải ngay khi vào trang và tự kiểm tra lại mỗi 5 giây.

> Trang đầu tiên hiện là trang khách hàng. Khách được xem sản phẩm và thêm giỏ hàng mà chưa cần đăng nhập. Khi bấm `Tạo Đơn Hàng`, hệ thống mới yêu cầu đăng nhập bằng `khachhang / kh123456`, sau đó tự quay lại phần tạo đơn. Không cần chạy thêm SQL cho thay đổi này.

### Bước 1: Import Database

1. Mở **SQL Server Management Studio (SSMS)**
2. Đăng nhập bằng **Windows Authentication** vào server `LAPTOP-31RCR7Q9\SQLEXPRESS`
3. Mở file `SQL/nguyên hùng.sql`
4. Bấm **Execute** (F5) để chạy toàn bộ script

Script sẽ tự động:
- Tạo database `dienmay_nguyenhung`
- Tạo **login `dienmay_user`** (mật khẩu: `admin123`)
- Tạo 7 bảng: users, categories, products, customers, orders, order_items, settings
- Chèn dữ liệu mẫu (users, categories, 12 sản phẩm, 5 khách hàng, 5 đơn hàng, settings)

### Bước 2: Cài dependencies

```bash
cd server
npm install
```

### Bước 3: Chạy server

```bash
cd server
npm start
```

Server chạy tại: **http://localhost:5000**

---

## 🔑 Tài khoản đăng nhập

| Vai trò  | Username    | Password   | Vào trang |
|----------|-------------|------------|-----------|
| Admin    | `admin`     | `admin123` | `/admin/admin.html` |
| Khách hàng | `khachhang` | `kh123456` | `/customer/khachhang.html` |

> Mật khẩu trong DB là dạng plain text, server **tự động mã hóa bcrypt** khi khởi động lần đầu.

---

## 🧠 Cấu hình kết nối SQL Server

Cấu hình mặc định trong `server/server.js`:

| Biến môi trường | Giá trị mặc định | Mô tả |
|----------------|------------------|--------|
| `DB_SERVER` | `LAPTOP-31RCR7Q9\SQLEXPRESS` | Tên server SQL |
| `DB_PORT` | `1433` | Cổng SQL Server |
| `DB_NAME` | `dienmay_nguyenhung` | Tên database |
| `DB_USER` | `dienmay_user` | SQL login |
| `DB_PASSWORD` | `admin123` | Mật khẩu SQL login |
| `PORT` | `5000` | Cổng server Node |

> Nếu bạn đổi mật khẩu login `dienmay_user`, hãy cập nhật `DB_PASSWORD` tương ứng.

---

## 🔌 Danh sách API

### Auth
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/login` | Đăng nhập, trả JWT token |

### Dashboard (admin)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/dashboard` | Thống kê tổng quan (sản phẩm, đơn hàng, doanh thu, khách hàng) |

### Sản phẩm
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/products` | Danh sách sản phẩm |
| GET | `/api/products/:id` | Chi tiết sản phẩm |
| POST | `/api/products` | Thêm sản phẩm (admin) |
| PUT | `/api/products/:id` | Cập nhật sản phẩm (admin) |
| DELETE | `/api/products/:id` | Xóa sản phẩm (admin) |

### Danh mục
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/categories` | Danh sách danh mục |
| POST | `/api/categories` | Thêm danh mục (admin) |
| PUT | `/api/categories/:id` | Cập nhật danh mục (admin) |
| DELETE | `/api/categories/:id` | Xóa danh mục (admin) |

### Đơn hàng
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/orders` | Danh sách đơn hàng (Admin) |
| GET | `/api/orders/:id` | Chi tiết đơn hàng (Admin) |
| POST | `/api/orders` | Tạo đơn hàng mới (khách hàng) |
| POST | `/api/orders/:id/confirm` | Xác nhận đơn đang chờ (Admin) |
| PUT | `/api/orders/:id` | Cập nhật trạng thái (admin) |

### Khách hàng
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/customers` | Danh sách khách hàng (admin) |

### Cài đặt
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/settings` | Lấy cài đặt cửa hàng |
| PUT | `/api/settings` | Lưu cài đặt (admin) |

### Hệ thống
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/health` | Kiểm tra server hoạt động |

---

## 🚨 Xử lý sự cố

### Lỗi "Login failed for user 'dienmay_user'"
→ Bạn chưa chạy file SQL. Mở SSMS → chạy `SQL/nguyên hùng.sql` → Execute.

### Lỗi "Cannot connect to SQL Server"
→ Kiểm tra SQL Server đã khởi động chưa (SQL Server Configuration Manager → SQL Server Browser).
→ Kiểm tra tên server có đúng `LAPTOP-31RCR7Q9\SQLEXPRESS` không.

### Lỗi "Cannot find module 'mssql'"
→ Chạy `npm install` trong thư mục `server`.

---

## 📁 Cấu trúc thư mục

```
d:/web/
├── index.html                     # Trang chủ (chuyển hướng login)
├── login/                         # Trang đăng nhập
├── admin/                         # Trang quản trị
├── customer/                      # Trang khách hàng
├── logo/                          # Hình ảnh logo
├── SQL/
│   └── nguyên hùng.sql            # Script tạo database SQL Server
└── server/
    ├── server.js                  # Backend server
    ├── package.json               # Cấu hình npm
    └── README.md                  # Tài liệu này
