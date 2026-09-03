-- ============================================================
-- ĐIỆN MÁY NGUYÊN HÙNG - HỆ THỐNG QUẢN LÝ BÁN HÀNG
-- File: SQL/nguyên hùng.sql
-- Phiên bản: 2.0 (SQL Server)
-- DBMS: SQL Server 2019+ (dùng với SQL Server Management Studio)
-- ============================================================

-- ============================================================
-- 1. TẠO DATABASE
-- ============================================================
IF DB_ID(N'dienmay_nguyenhung') IS NOT NULL
BEGIN
    ALTER DATABASE dienmay_nguyenhung SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE dienmay_nguyenhung;
END
GO

CREATE DATABASE dienmay_nguyenhung;
GO

USE dienmay_nguyenhung;
GO

-- ============================================================
-- 1b. TẠO SQL LOGIN + USER cho ứng dụng (server.js sử dụng)
--     username: dienmay_user / password: admin123
--     (Chạy trong master để tạo login)
-- ============================================================
USE [master]
GO
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = N'dienmay_user')
BEGIN
    CREATE LOGIN dienmay_user WITH PASSWORD = N'admin123';
END
GO
USE [dienmay_nguyenhung]
GO
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = N'dienmay_user')
BEGIN
    CREATE USER dienmay_user FOR LOGIN dienmay_user;
END
GO
ALTER ROLE db_owner ADD MEMBER dienmay_user;
GO

-- ============================================================
-- 2. TẠO CÁC BẢNG
-- ============================================================

-- 2.1. Bảng người dùng (đăng nhập hệ thống)
CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(50) NOT NULL UNIQUE,
    password NVARCHAR(255) NOT NULL,
    fullname NVARCHAR(100) NOT NULL,
    email NVARCHAR(100),
    phone NVARCHAR(20),
    role NVARCHAR(10) NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
GO

-- 2.2. Bảng danh mục sản phẩm
CREATE TABLE categories (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL UNIQUE,
    description NVARCHAR(255),
    icon NVARCHAR(50) DEFAULT 'fa-tag',
    color NVARCHAR(20) DEFAULT '#1976d2',
    created_at DATETIME2 DEFAULT GETDATE()
);
GO

-- 2.3. Bảng sản phẩm
CREATE TABLE products (
    id INT IDENTITY(1,1) PRIMARY KEY,
    category_id INT NOT NULL,
    name NVARCHAR(150) NOT NULL,
    brand NVARCHAR(60),
    price DECIMAL(12, 0) NOT NULL DEFAULT 0,
    old_price DECIMAL(12, 0) DEFAULT NULL,
    discount INT DEFAULT 0,
    stock INT NOT NULL DEFAULT 0,
    status NVARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    description NVARCHAR(MAX),
    image NVARCHAR(255),
    icon NVARCHAR(50) DEFAULT 'fa-box',
    color NVARCHAR(20) DEFAULT '#1976d2',
    specs NVARCHAR(255),
    rating DECIMAL(2, 1) DEFAULT 4.5,
    reviews INT DEFAULT 0,
    sales INT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE NO ACTION
);
GO

-- 2.4. Bảng khách hàng
CREATE TABLE customers (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    email NVARCHAR(100),
    phone NVARCHAR(20),
    address NVARCHAR(255),
    user_id INT NULL,
    reg_date DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT fk_customers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
GO

-- 2.5. Bảng đơn hàng
CREATE TABLE orders (
    id INT IDENTITY(1,1) PRIMARY KEY,
    order_code NVARCHAR(20) NOT NULL UNIQUE,
    customer_id INT NULL,
    customer_name NVARCHAR(100) NOT NULL,
    phone NVARCHAR(20),
    email NVARCHAR(100),
    address NVARCHAR(255),
    note NVARCHAR(MAX),
    PaymentMethod NVARCHAR(50) NOT NULL DEFAULT N'COD',
    item_count INT DEFAULT 0,
    total DECIMAL(14, 0) NOT NULL DEFAULT 0,
    status NVARCHAR(20) NOT NULL DEFAULT N'Chờ xác nhận',
    ConfirmedAt DATETIME2 NULL,
    ConfirmedBy NVARCHAR(100) NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT CK_orders_status CHECK (status IN (N'Chờ xác nhận', N'Đã xác nhận', N'Đang giao', N'Đã giao', N'Đã hủy')),
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);
GO

-- 2.6. Bảng chi tiết đơn hàng
CREATE TABLE order_items (
    id INT IDENTITY(1,1) PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NULL,
    product_name NVARCHAR(150) NOT NULL,
    price DECIMAL(12, 0) NOT NULL,
    qty INT NOT NULL DEFAULT 1,
    line_total DECIMAL(14, 0) NOT NULL DEFAULT 0,
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);
GO

-- 2.7. Bảng cài đặt hệ thống
CREATE TABLE settings (
    id INT IDENTITY(1,1) PRIMARY KEY,
    setting_key NVARCHAR(50) NOT NULL UNIQUE,
    setting_value NVARCHAR(MAX),
    updated_at DATETIME2 DEFAULT GETDATE()
);
GO

-- ============================================================
-- 3. DỮ LIỆU MẪU
-- ============================================================

-- 3.1. Người dùng (mật khẩu dạng PLAIN TEXT, server tự mã hóa bcrypt)
-- Mật khẩu ứng dụng được lưu dưới dạng bcrypt (cost 12), không seed plaintext.
INSERT INTO users (username, password, fullname, email, phone, role) VALUES
(N'admin', N'$2a$12$qCy/9ePtcAY5P94Y5BWzT.LrdrdpQyavnBqFoJGiXyf.6v3flEoXa', N'Quản Trị Viên', N'admin@nguyenhung.vn', N'0901.234.567', N'admin'),
(N'khachhang', N'$2a$12$z1WVF77cpJpgbJiKJHiu4.VJmjQyc7GvGrw5uyANKe2ikYJdi2IFq', N'Khách Hàng', N'khachhang@nguyenhung.vn', N'0987.654.321', N'customer');
GO

-- 3.2. Danh mục
SET IDENTITY_INSERT categories ON;
INSERT INTO categories (id, name, description, icon, color) VALUES
(1, N'Tủ Lạnh', N'Tủ lạnh, tủ đông, tủ mát', N'fa-snowflake', N'#1976d2'),
(2, N'Máy Giặt', N'Máy giặt, máy sấy, máy giặt sấy', N'fa-washer', N'#c62828'),
(3, N'Điều Hòa', N'Điều hòa, máy lạnh, máy lọc không khí', N'fa-wind', N'#2e7d32'),
(4, N'TV', N'Tivi, Smart TV, màn hình', N'fa-tv', N'#e65100'),
(5, N'Máy Nước Nóng', N'Máy nước nóng trực tiếp, gián tiếp', N'fa-hot-tub', N'#7b1fa2'),
(6, N'Đồ Gia Dụng', N'Bếp từ, máy hút bụi, đồ gia dụng khác', N'fa-blender', N'#00695c');
SET IDENTITY_INSERT categories OFF;
GO

-- 3.3. Sản phẩm (12 sản phẩm khớp với dữ liệu frontend hiện tại)
SET IDENTITY_INSERT products ON;
INSERT INTO products (id, category_id, name, price, old_price, discount, stock, status, description, icon, color, specs, rating, reviews, sales) VALUES
(1, 1, N'Tủ Lạnh Inverter 500L', 15900000, 18500000, 14, 25, N'active', N'Tủ lạnh Inverter tiết kiệm điện, dung tích 500L, 2 cánh', N'fa-snowflake', N'#1976d2', N'Inverter, 500L, Tủ lạnh 2 cánh, Tiết kiệm điện', 4.8, 256, 45),
(2, 2, N'Máy Giặt Cửa Trên 9Kg', 8500000, 9900000, 15, 18, N'active', N'Máy giặt cửa trên 9Kg, lồng nhựa, giặt nước nóng', N'fa-washer', N'#c62828', N'9Kg, Lồng nhựa, Giặt nước nóng, Tiết kiệm nước', 4.7, 189, 38),
(3, 3, N'Điều Hòa 12000BTU Inverter', 12500000, 14900000, 16, 30, N'active', N'Điều hòa 12000BTU Inverter, gas R32, lọc khí', N'fa-wind', N'#2e7d32', N'12000BTU, Inverter, Gas R32, Lọc khí', 4.9, 312, 52),
(4, 4, N'TV Smart 4K 55 inch', 18900000, 22900000, 18, 12, N'active', N'TV Smart 4K 55 inch, HDR, Android TV', N'fa-tv', N'#e65100', N'55 inch, 4K, HDR, Android TV, Smart Hub', 4.8, 178, 27),
(5, 2, N'Máy Giặt Cửa Trước 10Kg', 11200000, 13500000, 17, 0, N'inactive', N'Máy giặt cửa trước 10Kg Inverter, sấy khô', N'fa-washer', N'#c62828', N'10Kg, Inverter, Cửa trước, Sấy khô', 4.6, 145, 19),
(6, 1, N'Tủ Lạnh Mini 120L', 5200000, 6200000, 16, 40, N'active', N'Tủ lạnh mini 120L, 1 cánh, tiết kiệm điện', N'fa-snowflake', N'#1976d2', N'120L, Mini, 1 cánh, Tiết kiệm điện', 4.5, 98, 33),
(7, 3, N'Điều Hòa 9000BTU', 8900000, 10500000, 15, 35, N'active', N'Điều hòa 9000BTU Inverter, gas R32, lọc bụi', N'fa-wind', N'#2e7d32', N'9000BTU, Inverter, Gas R32, Lọc bụi', 4.7, 210, 41),
(8, 4, N'TV QLED 65 inch 4K', 25900000, 29900000, 14, 8, N'active', N'TV QLED 65 inch 4K, HDR10+, Smart TV', N'fa-tv', N'#e65100', N'65 inch, QLED, 4K, HDR10+, Smart TV', 4.9, 87, 15),
(9, 5, N'Máy Nước Nóng Trực Tiếp', 3200000, 3900000, 18, 50, N'active', N'Máy nước nóng trực tiếp 3500W, chống giật', N'fa-hot-tub', N'#7b1fa2', N'Trực tiếp, 3500W, Chống giật, An toàn', 4.6, 156, 63),
(10, 6, N'Bếp Từ Đôi Cao Cấp', 6800000, 8200000, 17, 22, N'active', N'Bếp từ đôi cảm ứng 4000W, tự động tắt', N'fa-blender', N'#00695c', N'Đôi, Cảm ứng, 4000W, Tự động tắt', 4.7, 92, 23),
(11, 6, N'Máy Hút Bụi Không Dây', 4500000, 5500000, 18, 28, N'active', N'Máy hút bụi không dây 45 phút, HEPA, đa năng', N'fa-broom', N'#00695c', N'Không dây, 45 phút, HEPA, Đa năng', 4.8, 201, 47),
(12, 5, N'Máy Nước Nóng Gián Tiếp 30L', 5800000, 6900000, 16, 32, N'active', N'Máy nước nóng gián tiếp 30L, 2500W', N'fa-hot-tub', N'#7b1fa2', N'Gián tiếp 30L, 2500W, Tiết kiệm điện', 4.5, 77, 29);
SET IDENTITY_INSERT products OFF;
GO

-- Gán thương hiệu cho 12 sản phẩm ban đầu. Sản phẩm khuyến mãi bổ sung
-- sẽ được thêm an toàn khi server khởi động hoặc khi chạy file
-- SQL/cap_nhat_thuong_hieu_khuyen_mai.sql.
UPDATE products
SET brand = CASE id
    WHEN 1 THEN N'SAMSUNG' WHEN 2 THEN N'TOSHIBA' WHEN 3 THEN N'DAIKIN'
    WHEN 4 THEN N'SONY' WHEN 5 THEN N'LG' WHEN 6 THEN N'PANASONIC'
    WHEN 7 THEN N'SHARP' WHEN 8 THEN N'SAMSUNG' WHEN 9 THEN N'ARISTON'
    WHEN 10 THEN N'BOSCH' WHEN 11 THEN N'ELECTROLUX' WHEN 12 THEN N'FERROLI'
END
WHERE id BETWEEN 1 AND 12;
GO

-- 3.4. Khách hàng
SET IDENTITY_INSERT customers ON;
INSERT INTO customers (id, name, email, phone, address, user_id) VALUES
(1, N'Nguyễn Văn An', N'an.nguyen@email.com', N'0901.234.567', N'123 Lê Lợi, Q1, TP.HCM', NULL),
(2, N'Trần Thị Bình', N'binh.tran@email.com', N'0902.345.678', N'456 Nguyễn Huệ, Q1, TP.HCM', NULL),
(3, N'Lê Văn Cường', N'cuong.le@email.com', N'0903.456.789', N'789 Võ Văn Tần, Q3, TP.HCM', NULL),
(4, N'Phạm Thị Dung', N'dung.pham@email.com', N'0904.567.890', N'321 Hai Bà Trưng, Q1, TP.HCM', NULL),
(5, N'Hoàng Văn Em', N'em.hoang@email.com', N'0905.678.901', N'654 Điện Biên Phủ, Bình Thạnh, TP.HCM', NULL);
SET IDENTITY_INSERT customers OFF;
GO

-- 3.5. Đơn hàng
SET IDENTITY_INSERT orders ON;
INSERT INTO orders (id, order_code, customer_id, customer_name, phone, email, address, item_count, total, status, created_at) VALUES
(1, N'DH001', 1, N'Nguyễn Văn An', N'0901.234.567', N'an.nguyen@email.com', N'123 Lê Lợi, Q1, TP.HCM', 2, 24400000, N'Đã giao', '2026-07-28 09:30:00'),
(2, N'DH002', 2, N'Trần Thị Bình', N'0902.345.678', N'binh.tran@email.com', N'456 Nguyễn Huệ, Q1, TP.HCM', 1, 12500000, N'Đang giao', '2026-07-27 14:15:00'),
(3, N'DH003', 3, N'Lê Văn Cường', N'0903.456.789', N'cuong.le@email.com', N'789 Võ Văn Tần, Q3, TP.HCM', 3, 38600000, N'Chờ xác nhận', '2026-07-26 10:45:00'),
(4, N'DH004', 4, N'Phạm Thị Dung', N'0904.567.890', N'dung.pham@email.com', N'321 Hai Bà Trưng, Q1, TP.HCM', 1, 11200000, N'Đã giao', '2026-07-25 16:20:00'),
(5, N'DH005', 5, N'Hoàng Văn Em', N'0905.678.901', N'em.hoang@email.com', N'654 Điện Biên Phủ, Bình Thạnh, TP.HCM', 2, 31400000, N'Đã hủy', '2026-07-24 11:00:00');
SET IDENTITY_INSERT orders OFF;
GO

-- 3.6. Chi tiết đơn hàng
SET IDENTITY_INSERT order_items ON;
INSERT INTO order_items (id, order_id, product_id, product_name, price, qty, line_total) VALUES
-- DH001
(1, 1, 1, N'Tủ Lạnh Inverter 500L', 15900000, 1, 15900000),
(2, 1, 2, N'Máy Giặt Cửa Trên 9Kg', 8500000, 1, 8500000),
-- DH002
(3, 2, 3, N'Điều Hòa 12000BTU Inverter', 12500000, 1, 12500000),
-- DH003
(4, 3, 4, N'TV Smart 4K 55 inch', 18900000, 1, 18900000),
(5, 3, 1, N'Tủ Lạnh Inverter 500L', 15900000, 1, 15900000),
(6, 3, 2, N'Máy Giặt Cửa Trên 9Kg', 8500000, 1, 8500000),
-- DH004
(7, 4, 5, N'Máy Giặt Cửa Trước 10Kg', 11200000, 1, 11200000),
-- DH005
(8, 5, 3, N'Điều Hòa 12000BTU Inverter', 12500000, 1, 12500000),
(9, 5, 4, N'TV Smart 4K 55 inch', 18900000, 1, 18900000);
SET IDENTITY_INSERT order_items OFF;
GO

-- 3.7. Cài đặt hệ thống
INSERT INTO settings (setting_key, setting_value) VALUES
(N'shopName', N'Điện Máy Nguyên Hùng'),
(N'shopAddress', N'Số 123, Đường Lê Lợi, TP. Hồ Chí Minh'),
(N'shopPhone', N'1900.123.456'),
(N'shopEmail', N'info@nguyenhung.vn');
GO

-- ============================================================
-- 4. TRUY VẤN HỖ TRỢ (Ví dụ)
-- ============================================================

-- 4.1. Danh sách sản phẩm kèm tên danh mục
-- SELECT p.id, p.name, p.price, p.stock, p.status, c.name AS category
-- FROM products p JOIN categories c ON p.category_id = c.id
-- ORDER BY p.id;

-- 4.2. Thống kê doanh thu theo trạng thái đơn hàng
-- SELECT status, COUNT(*) AS total_orders, SUM(total) AS revenue
-- FROM orders GROUP BY status;

-- 4.3. Sản phẩm bán chạy nhất
-- SELECT TOP 5 product_name, SUM(qty) AS total_qty, SUM(line_total) AS revenue
-- FROM order_items GROUP BY product_name ORDER BY total_qty DESC;

-- 4.4. Tổng quan dashboard
-- SELECT
--   (SELECT COUNT(*) FROM products) AS total_products,
--   (SELECT COUNT(*) FROM orders) AS total_orders,
--   (SELECT COUNT(*) FROM customers) AS total_customers,
--   (SELECT ISNULL(SUM(total),0) FROM orders WHERE status <> 'Đã hủy') AS total_revenue;

-- ============================================================
-- HOÀN TẤT
-- ============================================================
