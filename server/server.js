// ============================================================
// ĐIỆN MÁY NGUYÊN HÙNG - BACKEND SERVER
// File: server/server.js
// Công nghệ: Node.js + Express + SQL Server (mssql) + JWT + bcrypt
// ============================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const sql = require('mssql');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// ============================================================
// CẤU HÌNH
// ============================================================
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'dienmay_nguyenhung_secret_key_2026';

// Cấu hình Telegram Bot
// Lấy từ BotFather (https://t.me/BotFather): tạo bot -> nhận token
// Chat ID: gửi tin nhắn cho bot rồi lấy từ @userinfobot hoặc GetUpdates
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const TELEGRAM_ENABLED = Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);

// Cấu hình kết nối SQL Server (dùng login dienmay_user được tạo trong file SQL)
const DB_CONFIG = {
    server: process.env.DB_SERVER || 'LAPTOP-31RCR7Q9\\SQLEXPRESS',
    port: parseInt(process.env.DB_PORT || '1433', 10),
    database: process.env.DB_NAME || 'dienmay_nguyenhung',
    user: process.env.DB_USER || 'dienmay_user',
    password: process.env.DB_PASSWORD || 'admin123',
    options: {
        encrypt: false,       // Local SQL Server, không cần encrypt
        trustServerCertificate: true, // Tự tin vào self-signed certificate
        enableArithAbort: true,
        requestTimeout: 30000
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ============================================================
// KẾT NỐI DATABASE
// ============================================================
const pool = new sql.ConnectionPool(DB_CONFIG);

async function checkConnection() {
    try {
await pool.connect();
        console.log('✅ Kết nối SQL Server thành công!');
        await ensurePasswordsHashed();
        await ensureOrderSchema();
        await ensureProductCatalogSchema();
        return true;
    } catch (err) {
        console.error('❌ Không thể kết nối SQL Server:', err.message);
        console.error('   → Vui lòng kiểm tra:');
        console.error('     1. SQL Server đã khởi động (SQL Server Configuration Manager)');
        console.error('     2. Đã import & chạy file SQL/nguyên hùng.sql (tạo DB + login dienmay_user)');
        console.error('     3. Thông tin kết nối trong DB_CONFIG đúng');
        console.error('     4. Tên server: LAPTOP-31RCR7Q9\\SQLEXPRESS');
        return false;
    }
}

// Hàm lấy 1 connection từ pool (mssql)
async function getConn() {
    if (!pool.connected) {
        await pool.connect();
    }
    return pool;
}

// Tự động mã hóa password plain text (từ file SQL) thành bcrypt hash
async function ensurePasswordsHashed() {
    try {
        const request = pool.request();
        const result = await request.query(
            "SELECT id, username, password FROM users WHERE password NOT LIKE '$2%'"
        );
        for (const row of result.recordset) {
            const hash = await bcrypt.hash(row.password, 10);
            const upd = pool.request();
            await upd.input('password', sql.NVarChar, hash)
                     .input('id', sql.Int, row.id)
                     .query('UPDATE users SET password = @password WHERE id = @id');
            console.log(`🔒 Đã mã hóa mật khẩu cho user "${row.username}"`);
        }
    } catch (err) {
        // Bảng users chưa tồn tại - bỏ qua
        console.log('ℹ️ Bảng users chưa có dữ liệu hoặc chưa tồn tại.');
    }
}

// Tự động đảm bảo bảng orders có đủ cột cần thiết (PaymentMethod, ConfirmedAt, ConfirmedBy)
// và CHECK constraint chứa giá trị 'Đã xác nhận'.
// Chạy khi khởi động, an toàn với dữ liệu hiện có (không xóa, không DROP).
async function ensureOrderSchema() {
    try {
        const conn = await getConn();

        // 1. Thêm cột PaymentMethod nếu chưa có
        await conn.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.orders') AND name = N'PaymentMethod')
            BEGIN
                ALTER TABLE dbo.orders ADD PaymentMethod NVARCHAR(50) NOT NULL DEFAULT N'COD';
            END
        `);

        // 2. Thêm cột ConfirmedAt nếu chưa có
        await conn.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.orders') AND name = N'ConfirmedAt')
            BEGIN
                ALTER TABLE dbo.orders ADD ConfirmedAt DATETIME2 NULL;
            END
        `);

        // 3. Thêm cột ConfirmedBy nếu chưa có
        await conn.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.orders') AND name = N'ConfirmedBy')
            BEGIN
                ALTER TABLE dbo.orders ADD ConfirmedBy NVARCHAR(100) NULL;
            END
        `);

        // 4. Xóa các CHECK constraint cũ trên bảng orders (nếu có)
        await conn.request().query(`
            DECLARE @constraint_name NVARCHAR(200);
            DECLARE @drop_sql NVARCHAR(400);
            DECLARE cur CURSOR FOR
                SELECT name FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.orders');
            OPEN cur;
            FETCH NEXT FROM cur INTO @constraint_name;
            WHILE @@FETCH_STATUS = 0
            BEGIN
                SET @drop_sql = N'ALTER TABLE dbo.orders DROP CONSTRAINT ' + QUOTENAME(@constraint_name);
                EXEC sp_executesql @drop_sql;
                FETCH NEXT FROM cur INTO @constraint_name;
            END
            CLOSE cur;
            DEALLOCATE cur;
        `);

        // 5. Tạo lại CHECK constraint với giá trị 'Đã xác nhận'
        await conn.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.orders') AND name = N'CK_orders_status')
            BEGIN
                ALTER TABLE dbo.orders ADD CONSTRAINT CK_orders_status CHECK (status IN (N'Chờ xác nhận', N'Đã xác nhận', N'Đang giao', N'Đã giao', N'Đã hủy'));
            END
        `);

        console.log('✅ Đã đảm bảo cấu trúc bảng orders (PaymentMethod, ConfirmedAt, ConfirmedBy, status "Đã xác nhận").');
    } catch (err) {
        console.error('⚠️ Không thể tự động bổ sung cấu trúc bảng orders:', err.message);
        console.error('   → Vui lòng chạy file SQL/them_don_hang.sql trong SSMS.');
    }
}

// ============================================================
// AUTH MIDDLEWARE
// ============================================================
function authRequired(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Phiên đăng nhập hết hạn' });
    }
}

function adminRequired(req, res, next) {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
    }
    next();
}

// Bổ sung thương hiệu và danh sách sản phẩm khuyến mãi.
// Câu lệnh chỉ thêm dữ liệu còn thiếu, không xóa hoặc ghi đè đơn hàng/sản phẩm người dùng đã tạo.
async function ensureProductCatalogSchema() {
    try {
        const conn = await getConn();
        await conn.request().query(`
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.products') AND name = N'brand')
                ALTER TABLE dbo.products ADD brand NVARCHAR(60) NULL;

            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.products') AND name = N'image')
                ALTER TABLE dbo.products ADD image NVARCHAR(255) NULL;

            UPDATE dbo.products
            SET brand = CASE id
                WHEN 1 THEN N'SAMSUNG' WHEN 2 THEN N'TOSHIBA' WHEN 3 THEN N'DAIKIN'
                WHEN 4 THEN N'SONY' WHEN 5 THEN N'LG' WHEN 6 THEN N'PANASONIC'
                WHEN 7 THEN N'SHARP' WHEN 8 THEN N'SAMSUNG' WHEN 9 THEN N'ARISTON'
                WHEN 10 THEN N'BOSCH' WHEN 11 THEN N'ELECTROLUX' WHEN 12 THEN N'FERROLI'
                ELSE brand END
            WHERE id BETWEEN 1 AND 12 AND (brand IS NULL OR LTRIM(RTRIM(brand)) = N'');

            -- Giữ tên model và ảnh thật đồng bộ cho hai máy giặt cửa trên.
            UPDATE dbo.products
            SET name = N'Máy Giặt Cửa Trên LG Inverter 8Kg T2108VSPM',
                image = N'/assets/images/products/may-giat-lg-t2108vspm-8kg.jpg',
                specs = N'8Kg, Cửa trên, Smart Inverter, TurboDrum'
            WHERE name IN (N'Máy Giặt Cửa Trên LG 8Kg Inverter', N'Máy Giặt Cửa Trên LG Inverter 8Kg T2108VSPM');

            UPDATE dbo.products
            SET name = N'Máy Giặt Cửa Trên Sharp 7.2Kg ES-U72GV-G',
                image = N'/assets/images/products/may-giat-sharp-es-u72gv-g-7-2kg.jpg',
                specs = N'7.2Kg, Cửa trên, Lồng PUMP-UP, Dolphin Ag+'
            WHERE name IN (N'Máy Giặt Cửa Trên Sharp 7Kg', N'Máy Giặt Cửa Trên Sharp 7.2Kg ES-U72GV-G');

            IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE name = N'Máy Rửa Chén Bosch HDW-T5531B')
                INSERT dbo.products (category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
                VALUES (6,N'Máy Rửa Chén Bosch HDW-T5531B',N'BOSCH',6190000,9990000,38,24,N'active',N'Máy rửa chén dung tích lớn, nhiều chương trình rửa, tiết kiệm nước.',N'/assets/images/products/13-may-rua-chen-bosch.webp',N'fa-kitchen-set',N'#00695c',N'14 bộ, Inverter, Sấy khô',4.9,119,32);
            IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE name = N'Máy Lọc Không Khí LG PuriCare AS35')
                INSERT dbo.products (category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
                VALUES (6,N'Máy Lọc Không Khí LG PuriCare AS35',N'LG',4490000,7390000,39,30,N'active',N'Lọc bụi mịn và khử mùi cho không gian gia đình.',N'/assets/images/products/14-may-loc-khong-khi-lg.webp',N'fa-fan',N'#00695c',N'HEPA, Cảm biến bụi, 35m²',4.8,132,41);
            IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE name = N'Nồi Cơm Điện Cuckoo 1.8L')
                INSERT dbo.products (category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
                VALUES (6,N'Nồi Cơm Điện Cuckoo 1.8L',N'CUCKOO',799000,990000,19,45,N'active',N'Nồi cơm điện gia đình, lòng nồi chống dính, giữ ấm tốt.',N'/assets/images/products/15-noi-com-dien-cuckoo.webp',N'fa-bowl-rice',N'#00695c',N'1.8L, 700W, Giữ ấm',4.5,82,57);
            IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE name = N'Nồi Chiên Không Dầu Ferroli 6L')
                INSERT dbo.products (category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
                VALUES (6,N'Nồi Chiên Không Dầu Ferroli 6L',N'FERROLI',699000,1990000,65,27,N'active',N'Nồi chiên dung tích 6L, cửa kính quan sát, điều khiển tiện lợi.',N'/assets/images/products/16-noi-chien-khong-dau-ferroli.webp',N'fa-kitchen-set',N'#00695c',N'6L, 1500W, 60 phút',4.9,425,73);
            IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE name = N'Máy Sấy Tóc Philips 1000W')
                INSERT dbo.products (category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
                VALUES (6,N'Máy Sấy Tóc Philips 1000W',N'PHILIPS',269000,378000,29,60,N'active',N'Máy sấy tóc nhỏ gọn, nhiều mức nhiệt, bảo vệ tóc.',N'/assets/images/products/17-may-say-toc-philips.webp',N'fa-wind',N'#00695c',N'1000W, 2 tốc độ, Gọn nhẹ',4.9,148,88);
            IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE name = N'Quạt Đứng Sharp PJ-S40MV')
                INSERT dbo.products (category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
                VALUES (6,N'Quạt Đứng Sharp PJ-S40MV',N'SHARP',490000,850000,42,36,N'active',N'Quạt đứng vận hành êm, ba mức gió, chiều cao linh hoạt.',N'/assets/images/products/18-quat-dung-sharp.webp',N'fa-fan',N'#00695c',N'3 tốc độ, Hẹn giờ, 45W',4.9,233,64);

            IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE name = N'Máy Lạnh Panasonic Inverter 1 HP')
                INSERT dbo.products (category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
                VALUES (3,N'Máy Lạnh Panasonic Inverter 1 HP',N'PANASONIC',11890000,13990000,15,19,N'active',N'Máy lạnh Inverter làm lạnh nhanh, lọc khí và tiết kiệm điện.',N'/assets/images/products/19-dieu-hoa-panasonic.webp',N'fa-wind',N'#2e7d32',N'1 HP, Inverter, Lọc khí',4.9,533,54);
            IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE name = N'Máy Lạnh Samsung Inverter 1 HP')
                INSERT dbo.products (category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
                VALUES (3,N'Máy Lạnh Samsung Inverter 1 HP',N'SAMSUNG',6290000,10690000,41,22,N'active',N'Máy lạnh tiết kiệm điện, làm lạnh đều và vận hành êm.',N'/assets/images/products/20-dieu-hoa-samsung.webp',N'fa-wind',N'#2e7d32',N'1 HP, Digital Inverter, Gas R32',4.8,275,49);
            IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE name = N'Máy Lạnh Sharp Inverter 2 HP')
                INSERT dbo.products (category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
                VALUES (3,N'Máy Lạnh Sharp Inverter 2 HP',N'SHARP',12490000,15490000,19,16,N'active',N'Máy lạnh công suất lớn, phù hợp phòng khách và văn phòng.',N'/assets/images/products/21-dieu-hoa-sharp.webp',N'fa-wind',N'#2e7d32',N'2 HP, Inverter, Làm lạnh nhanh',5.0,98,37);

            IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE name = N'Sony BRAVIA Smart TV 4K 55 Inch')
                INSERT dbo.products (category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
                VALUES (4,N'Sony BRAVIA Smart TV 4K 55 Inch',N'SONY',17990000,21490000,16,14,N'active',N'Smart TV 4K hình ảnh sắc nét, âm thanh sống động.',N'/assets/images/products/22-tv-sony.webp',N'fa-tv',N'#e65100',N'55 inch, 4K, Google TV',4.9,224,38);
            IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE name = N'LG OLED AI 4K 55 Inch')
                INSERT dbo.products (category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
                VALUES (4,N'LG OLED AI 4K 55 Inch',N'LG',29790000,41400000,28,9,N'active',N'TV OLED AI màu đen sâu, thiết kế mỏng và hình ảnh cao cấp.',N'/assets/images/products/23-tv-lg-oled.webp',N'fa-tv',N'#e65100',N'55 inch, OLED, AI 4K',4.9,187,29);
            IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE name = N'Samsung QLED 4K 65 Inch')
                INSERT dbo.products (category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
                VALUES (4,N'Samsung QLED 4K 65 Inch',N'SAMSUNG',22900000,32250000,29,11,N'active',N'Smart TV QLED 4K màn hình lớn, màu sắc rực rỡ.',N'/assets/images/products/24-tv-samsung-qled.webp',N'fa-tv',N'#e65100',N'65 inch, QLED, Smart TV',4.8,199,35);

            IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE name = N'Tủ Lạnh Panasonic Inverter 495L')
                INSERT dbo.products (category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
                VALUES (1,N'Tủ Lạnh Panasonic Inverter 495L',N'PANASONIC',19990000,28990000,31,13,N'active',N'Tủ lạnh nhiều cửa, dung tích lớn, bảo quản thực phẩm tối ưu.',N'/assets/images/products/25-tu-lanh-panasonic.webp',N'fa-snowflake',N'#1976d2',N'495L, Inverter, 4 cửa',4.9,168,33);
            IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE name = N'Tủ Lạnh Bosch Inverter 605L')
                INSERT dbo.products (category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
                VALUES (1,N'Tủ Lạnh Bosch Inverter 605L',N'BOSCH',39990000,51900000,23,8,N'active',N'Tủ lạnh French Door cao cấp, không gian lưu trữ rộng.',N'/assets/images/products/26-tu-lanh-bosch.webp',N'fa-snowflake',N'#1976d2',N'605L, French Door, Inverter',5.0,91,20);
            IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE name = N'Tủ Lạnh Electrolux Inverter 496L')
                INSERT dbo.products (category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
                VALUES (1,N'Tủ Lạnh Electrolux Inverter 496L',N'ELECTROLUX',15990000,21990000,27,15,N'active',N'Tủ lạnh Inverter thiết kế hiện đại, làm lạnh đa chiều.',N'/assets/images/products/27-tu-lanh-electrolux.webp',N'fa-snowflake',N'#1976d2',N'496L, Inverter, Side by side',4.8,146,31);

            IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE name = N'Máy Giặt Bosch Inverter 8Kg')
                INSERT dbo.products (category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
                VALUES (2,N'Máy Giặt Bosch Inverter 8Kg',N'BOSCH',8490000,16330000,48,17,N'active',N'Máy giặt cửa trước êm ái, giặt sạch và tiết kiệm nước.',N'/assets/images/products/28-may-giat-bosch.webp',N'fa-washer',N'#c62828',N'8Kg, Cửa trước, Inverter',4.9,152,42);
            IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE name = N'Máy Giặt Panasonic Inverter 12Kg')
                INSERT dbo.products (category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
                VALUES (2,N'Máy Giặt Panasonic Inverter 12Kg',N'PANASONIC',14990000,17230000,13,12,N'active',N'Máy giặt dung tích lớn, phù hợp gia đình đông người.',N'/assets/images/products/29-may-giat-panasonic.webp',N'fa-washer',N'#c62828',N'12Kg, Inverter, Giặt nước nóng',4.8,113,34);
            IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE name = N'Máy Giặt LG Inverter 10Kg')
                INSERT dbo.products (category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
                VALUES (2,N'Máy Giặt LG Inverter 10Kg',N'LG',10990000,17170000,36,20,N'active',N'Máy giặt cửa trước AI, vận hành êm và bảo vệ sợi vải.',N'/assets/images/products/30-may-giat-lg.webp',N'fa-washer',N'#c62828',N'10Kg, AI DD, Inverter',4.9,207,51);
IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE name = N'Máy Giặt Hitachi Inverter 9.5Kg')
                INSERT dbo.products (category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
                VALUES (2,N'Máy Giặt Hitachi Inverter 9.5Kg',N'HITACHI',5990000,10990000,45,18,N'active',N'Máy giặt cửa trước Inverter, giặt sạch sâu và vận hành êm.',N'/assets/images/products/31-may-giat-hitachi.webp',N'fa-washer',N'#c62828',N'9.5Kg, Cửa trước, Inverter',4.8,176,46);

            -- ===== MÁY GIẶT CỬA TRÊN (9 sản phẩm) =====
            IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE name = N'Máy Giặt Cửa Trên Samsung 7Kg')
                INSERT dbo.products (category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
                VALUES (2,N'Máy Giặt Cửa Trên Samsung 7Kg',N'SAMSUNG',4290000,5850000,27,30,N'active',N'Máy giặt cửa trên tiết kiệm nước, lồng giặt chống khuẩn, giặt sạch và an toàn với vải.',N'/assets/images/products/02-may-giat-cua-tren-9kg.webp',N'fa-washer',N'#c62828',N'7Kg, Cửa trên, Lồng chống khuẩn',4.7,210,63);
            IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE name = N'Máy Giặt Cửa Trên LG Inverter 8Kg T2108VSPM')
                INSERT dbo.products (category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
                VALUES (2,N'Máy Giặt Cửa Trên LG Inverter 8Kg T2108VSPM',N'LG',4990000,7190000,31,26,N'active',N'Máy giặt cửa trên Inverter vận hành êm, tiết kiệm điện và giặt sạch hiệu quả.',N'/assets/images/products/may-giat-lg-t2108vspm-8kg.jpg',N'fa-washer',N'#c62828',N'8Kg, Cửa trên, Smart Inverter, TurboDrum',4.8,198,52);
            IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE name = N'Máy Giặt Cửa Trên Panasonic 7.5Kg')
                INSERT dbo.products (category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
                VALUES (2,N'Máy Giặt Cửa Trên Panasonic 7.5Kg',N'PANASONIC',4690000,6490000,28,24,N'active',N'Máy giặt cửa trên giặt sạch vết bẩn cứng đầu, lồng giặt bền bỉ và tiết kiệm nước.',N'/assets/images/products/02-may-giat-cua-tren-9kg.webp',N'fa-washer',N'#c62828',N'7.5Kg, Cửa trên, Giặt sạch sâu',4.7,185,55);
            IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE name = N'Máy Giặt Cửa Trên Toshiba 8Kg')
                INSERT dbo.products (category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
                VALUES (2,N'Máy Giặt Cửa Trên Toshiba 8Kg',N'TOSHIBA',4590000,6590000,30,22,N'active',N'Máy giặt cửa trên công nghệ tiết kiệm điện, giặt sạch và bảo vệ sợi vải tốt.',N'/assets/images/products/02-may-giat-cua-tren-9kg.webp',N'fa-washer',N'#c62828',N'8Kg, Cửa trên, Tiết kiệm điện',4.6,164,49);
            IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE name = N'Máy Giặt Cửa Trên Sharp 7.2Kg ES-U72GV-G')
                INSERT dbo.products (category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
                VALUES (2,N'Máy Giặt Cửa Trên Sharp 7.2Kg ES-U72GV-G',N'SHARP',3490000,4990000,30,35,N'active',N'Máy giặt cửa trên giá phải chăng, lồng giặt chống mục, vận hành ổn định.',N'/assets/images/products/may-giat-sharp-es-u72gv-g-7-2kg.jpg',N'fa-washer',N'#c62828',N'7.2Kg, Cửa trên, Lồng PUMP-UP, Dolphin Ag+',4.6,149,58);
            IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE name = N'Máy Giặt Cửa Trên Electrolux 8.5Kg')
                INSERT dbo.products (category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
                VALUES (2,N'Máy Giặt Cửa Trên Electrolux 8.5Kg',N'ELECTROLUX',5290000,7490000,29,20,N'active',N'Máy giặt cửa trên công nghệ hơi nước, giặt sạch và loại bỏ vi khuẩn hiệu quả.',N'/assets/images/products/02-may-giat-cua-tren-9kg.webp',N'fa-washer',N'#c62828',N'8.5Kg, Cửa trên, Công nghệ hơi nước',4.7,172,46);
            IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE name = N'Máy Giặt Cửa Trên Hitachi 7.5Kg')
                INSERT dbo.products (category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
                VALUES (2,N'Máy Giặt Cửa Trên Hitachi 7.5Kg',N'HITACHI',4790000,6790000,29,21,N'active',N'Máy giặt cửa trên giặt sạch sâu, vận hành êm ái và tiết kiệm nước vượt trội.',N'/assets/images/products/02-may-giat-cua-tren-9kg.webp',N'fa-washer',N'#c62828',N'7.5Kg, Cửa trên, Giặt sạch sâu',4.7,180,51);
            IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE name = N'Máy Giặt Cửa Trên Aqua 8Kg')
                INSERT dbo.products (category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
                VALUES (2,N'Máy Giặt Cửa Trên Aqua 8Kg',N'AQUA',4190000,5890000,29,28,N'active',N'Máy giặt cửa trên Nhật Bản, lồng giặt bền bỉ, giặt sạch và tiết kiệm điện.',N'/assets/images/products/02-may-giat-cua-tren-9kg.webp',N'fa-washer',N'#c62828',N'8Kg, Cửa trên, Công nghệ Nhật Bản',4.7,191,60);
            IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE name = N'Máy Giặt Cửa Trên Sanyo 9Kg')
                INSERT dbo.products (category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
                VALUES (2,N'Máy Giặt Cửa Trên Sanyo 9Kg',N'SANYO',4490000,6390000,30,25,N'active',N'Máy giặt cửa trên dung tích lớn, phù hợp gia đình đông người, giặt sạch hiệu quả.',N'/assets/images/products/02-may-giat-cua-tren-9kg.webp',N'fa-washer',N'#c62828',N'9Kg, Cửa trên, Dung tích lớn',4.6,158,44);
        `);

// Bổ sung cột is_premium và is_hot (sản phẩm cao cấp / sản phẩm hot).
        // Chỉ thêm nếu chưa tồn tại để tránh lỗi SQL khi chạy lại.
        await conn.request().query(`
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.products') AND name = N'is_premium')
                ALTER TABLE dbo.products ADD is_premium INT NOT NULL DEFAULT 0;
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.products') AND name = N'is_hot')
                ALTER TABLE dbo.products ADD is_hot INT NOT NULL DEFAULT 0;
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.products') AND name = N'gift')
                ALTER TABLE dbo.products ADD gift NVARCHAR(255) NULL;
        `);

        // Đánh dấu sản phẩm cao cấp (giá trị cao, dòng cao cấp) - chỉ UPDATE, không xóa/sửa dữ liệu.
        await conn.request().query(`
            UPDATE dbo.products SET is_premium = 1
            WHERE is_premium = 0 AND (
                name LIKE N'%QLED%' OR name LIKE N'%OLED%' OR name LIKE N'%OLED AI%'
                OR name LIKE N'%French Door%' OR name LIKE N'%Side by side%'
                OR name LIKE N'%Bếp Từ%' OR name LIKE N'%Bình Nóng Lạnh%'
                OR name LIKE N'%Máy Rửa Chén%' OR name LIKE N'%Máy Lạnh%'
                OR name LIKE N'%TV%' OR name LIKE N'%Tivi%'
            )
        `);

// Đánh dấu sản phẩm hot: giảm giá mạnh hoặc bán chạy (discount >= 30 hoặc sales >= 40).
        await conn.request().query(`
            UPDATE dbo.products SET is_hot = 1
            WHERE is_hot = 0 AND (discount >= 30 OR sales >= 40) AND status = N'active'
        `);

        // ===== SẢN PHẨM CAO CẤP MỚI (giá chục triệu, không giảm giá, tặng quà) =====
        // Thêm cột gift (quà tặng kèm) nếu chưa tồn tại.
        await conn.request().query(`
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.products') AND name = N'gift')
                ALTER TABLE dbo.products ADD gift NVARCHAR(255) NULL;
        `);

        // Danh sách sản phẩm cao cấp mới: discount = 0, old_price = NULL, is_premium = 1, kèm gift.
        // Chỉ thêm khi chưa tồn tại (theo tên). An toàn khi chạy lại.
        const PREMIUM_GIFT_PRODUCTS = [
            { category_id: 2, name: 'Máy Giặt LG Inverter 16Kg Cửa Trước AI', brand: 'LG', price: 33990000, stock: 8, description: 'Máy giặt cửa trước AI 16Kg, công nghệ Inverter tiết kiệm điện, giặt sạch và bảo vệ sợi vải tối ưu. Sản phẩm cao cấp chính hãng.', image: '/assets/images/products/30-may-giat-lg.webp', icon: 'fa-washer', color: '#c62828', specs: '16Kg, Cửa trước, AI DD, Inverter', rating: 4.9, reviews: 156, sales: 42, gift: 'Tặng 2 bịch bột giặt Ômô 3.3kg' },
            { category_id: 2, name: 'Máy Giặt Samsung Inverter 14Kg Cửa Trước', brand: 'SAMSUNG', price: 28990000, stock: 9, description: 'Máy giặt cửa trước 14Kg Inverter, công nghệ EcoBubble giặt sạch ở nhiệt độ thấp, tiết kiệm điện. Sản phẩm cao cấp chính hãng.', image: '/assets/images/products/02-may-giat-cua-tren-9kg.webp', icon: 'fa-washer', color: '#c62828', specs: '14Kg, Cửa trước, EcoBubble, Inverter', rating: 4.8, reviews: 132, sales: 38, gift: 'Tặng 2 bịch bột giặt Ômô 3.3kg' },
            { category_id: 1, name: 'Tủ Lạnh Samsung Family Hub 4 Cửa 700L', brand: 'SAMSUNG', price: 64900000, stock: 5, description: 'Tủ lạnh Family Hub 4 cửa 700L, màn hình cảm ứng, quản lý thực phẩm thông minh, tươi ngon lâu. Sản phẩm cao cấp chính hãng.', image: '/assets/images/products/01-tu-lanh-inverter-500l.webp', icon: 'fa-snowflake', color: '#1976d2', specs: '700L, 4 cửa, Family Hub, Inverter', rating: 5.0, reviews: 89, sales: 21, gift: 'Tặng bộ hộp đựng thực phẩm Bernon' },
            { category_id: 1, name: 'Tủ Lạnh LG InstaView Door-in-Door 600L', brand: 'LG', price: 52900000, stock: 6, description: 'Tủ lạnh LG InstaView 600L, đập nhẹ hai lần xem bên trong, công nghệ Door-in-Door tiện lợi. Sản phẩm cao cấp chính hãng.', image: '/assets/images/products/25-tu-lanh-panasonic.webp', icon: 'fa-snowflake', color: '#1976d2', specs: '600L, InstaView, Door-in-Door, Inverter', rating: 4.9, reviews: 104, sales: 27, gift: 'Tặng bộ chai lọ gia vị cao cấp' },
            { category_id: 3, name: 'Máy Lạnh Daikin Inverter 3 HP', brand: 'DAIKIN', price: 45900000, stock: 7, description: 'Máy lạnh Daikin Inverter 3 HP, làm lạnh nhanh, lọc khí, vận hành êm ái phù hợp phòng lớn. Sản phẩm cao cấp chính hãng.', image: '/assets/images/products/03-dieu-hoa-12000btu-inverter.webp', icon: 'fa-wind', color: '#2e7d32', specs: '3 HP, Inverter, Lọc khí, R32', rating: 4.9, reviews: 118, sales: 33, gift: 'Tặng bộ vệ sinh máy lạnh chuyên dụng' },
            { category_id: 3, name: 'Máy Lạnh Samsung Inverter 2.5 HP 360', brand: 'SAMSUNG', price: 34900000, stock: 8, description: 'Máy lạnh Samsung 360 2.5 HP, thiết kế tròn hiện đại, làm lạnh nhanh và đều mọi hướng. Sản phẩm cao cấp chính hãng.', image: '/assets/images/products/20-dieu-hoa-samsung.webp', icon: 'fa-wind', color: '#2e7d32', specs: '2.5 HP, 360 Cassette, Inverter', rating: 4.8, reviews: 96, sales: 29, gift: 'Tặng bộ vệ sinh máy lạnh chuyên dụng' },
            { category_id: 4, name: 'Tivi Sony OLED 4K 65 Inch', brand: 'SONY', price: 54900000, stock: 6, description: 'Tivi Sony OLED 4K 65 inch, hình ảnh màu đen sâu, sống động, âm thanh Acoustic Surface. Sản phẩm cao cấp chính hãng.', image: '/assets/images/products/22-tv-sony.webp', icon: 'fa-tv', color: '#e65100', specs: '65 inch, OLED, 4K, Google TV', rating: 5.0, reviews: 87, sales: 24, gift: 'Tặng loa soundbar Sony' },
            { category_id: 4, name: 'Tivi Samsung QLED 8K 75 Inch', brand: 'SAMSUNG', price: 84900000, stock: 4, description: 'Tivi Samsung QLED 8K 75 inch, màn hình siêu nét, công nghệ Quantum HDR, trải nghiệm điện ảnh đỉnh cao. Sản phẩm cao cấp chính hãng.', image: '/assets/images/products/24-tv-samsung-qled.webp', icon: 'fa-tv', color: '#e65100', specs: '75 inch, QLED, 8K, Smart TV', rating: 4.9, reviews: 64, sales: 18, gift: 'Tặng loa soundbar Samsung' },
            { category_id: 6, name: 'Robot Hút Bụi Lau Nhà Cao Cấp AI', brand: 'LG', price: 19900000, stock: 10, description: 'Robot hút bụi lau nhà AI, điều hướng thông minh, tự sạc, ứng dụng điều khiển. Sản phẩm cao cấp chính hãng.', image: '/assets/images/products/11-may-hut-bui-khong-day.webp', icon: 'fa-robot', color: '#00695c', specs: 'Hút + lau, AI, Điều khiển App', rating: 4.8, reviews: 77, sales: 31, gift: 'Tặng bộ phụ kiện lọc vi sinh' },
            { category_id: 6, name: 'Bếp Từ Đôi Cao Cấp Schott Ceran', brand: 'BOSCH', price: 24900000, stock: 8, description: 'Bếp từ đôi Bosch cao cấp, mặt kính Schott Ceran, công nghệ Inverter, cảm ứng nhạy. Sản phẩm cao cấp chính hãng.', image: '/assets/images/products/10-bep-tu-doi-cao-cap.webp', icon: 'fa-fire', color: '#00695c', specs: '2 bếp, 4000W, Schott Ceran, Inverter', rating: 4.9, reviews: 68, sales: 22, gift: 'Tặng bộ nồi chảo chống dính cao cấp' }
        ];

        // Giữ danh sách cũ để tham chiếu, nhưng không chèn lại vì catalog đã dùng model/ảnh thật.
        const SEED_LEGACY_PREMIUM_PRODUCTS = false;
        for (const p of SEED_LEGACY_PREMIUM_PRODUCTS ? PREMIUM_GIFT_PRODUCTS : []) {
            await conn.request()
                .input('category_id', sql.Int, p.category_id)
                .input('name', sql.NVarChar(150), p.name)
                .input('brand', sql.NVarChar(60), p.brand)
                .input('price', sql.Decimal(12, 0), p.price)
                .input('stock', sql.Int, p.stock)
                .input('description', sql.NVarChar(sql.MAX), p.description)
                .input('image', sql.NVarChar(255), p.image)
                .input('icon', sql.NVarChar(50), p.icon)
                .input('color', sql.NVarChar(20), p.color)
                .input('specs', sql.NVarChar(255), p.specs)
                .input('rating', sql.Decimal(2, 1), p.rating)
                .input('reviews', sql.Int, p.reviews)
                .input('sales', sql.Int, p.sales)
                .input('gift', sql.NVarChar(255), p.gift)
                .query(`
                    IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE name = @name)
                    BEGIN
                        INSERT INTO dbo.products
                            (category_id, name, brand, price, old_price, discount, stock, status, description, image, icon, color, specs, rating, reviews, sales, is_premium, is_hot, gift)
                        VALUES
                            (@category_id, @name, @brand, @price, NULL, 0, @stock, N'active', @description, @image, @icon, @color, @specs, @rating, @reviews, @sales, 1, 1, @gift)
                    END
                `);
        }
        console.log('✅ Không tạo lại danh sách cao cấp minh họa cũ.');

        // Catalog minh họa sinh hàng loạt đã được thay bằng sản phẩm/model thật.
        // Không seed lại để tránh tên giả và ảnh trùng xuất hiện sau khi restart.
        console.log('✅ Đang sử dụng catalog sản phẩm thật, không tạo lại dữ liệu minh họa.');
    } catch (err) {
        console.error('⚠️ Không thể tự động cập nhật danh mục khuyến mãi:', err.message);
        console.error('   → Vui lòng chạy file SQL/cap_nhat_thuong_hieu_khuyen_mai.sql trong SSMS.');
    }
}

function customerRequired(req, res, next) {
    if (req.user?.role !== 'customer') {
        return res.status(403).json({ success: false, message: 'Vui lòng đăng nhập bằng tài khoản khách hàng' });
    }
    next();
}

// ============================================================
// HELPER: Format dữ liệu
// ============================================================
function toNumber(value) {
    const n = Number(value);
    return isNaN(n) ? 0 : n;
}

// ============================================================
// TELEGRAM NOTIFICATION (thông báo đơn hàng mới)
// Dùng Telegram Bot API - không cần package bổ sung (dùng fetch của Node 18+)
// ============================================================
async function sendTelegramNotification(message) {
    if (!TELEGRAM_ENABLED) {
        console.log('ℹ️ Telegram chưa được cấu hình. Bỏ qua gửi thông báo.');
        return false;
    }
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(8000),
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML',
                link_preview_options: { is_disabled: true }
            })
        });
        const data = await res.json();
        if (data.ok) {
            console.log('✅ Đã gửi thông báo Telegram thành công.');
            return true;
        } else {
            console.error('❌ Telegram API lỗi:', data.description || 'Unknown error');
            return false;
        }
    } catch (err) {
        console.error('❌ Không thể gửi thông báo Telegram:', err.message);
        return false;
    }
}

function formatVND(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Dữ liệu khách hàng có thể chứa ký tự <, >, & nên phải escape trước khi gửi HTML.
function escapeTelegramHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Tạo nội dung thông báo đơn hàng mới gửi lên Telegram
function buildOrderTelegramMessage({ orderCode, customerName, phone, email, address, note, paymentMethod, total, items }) {
    const lines = [];
    lines.push('🛒 <b>ĐƠN HÀNG MỚI</b>');
    lines.push('');
    lines.push(`🧾 Mã đơn: <b>${escapeTelegramHtml(orderCode)}</b>`);
    lines.push(`👤 Khách hàng: ${escapeTelegramHtml(customerName)}`);
    lines.push(`📞 SĐT: ${escapeTelegramHtml(phone)}`);
    if (email) lines.push(`✉️ Email: ${escapeTelegramHtml(email)}`);
    lines.push(`🏠 Địa chỉ: ${escapeTelegramHtml(address || '—')}`);
    lines.push(`💳 Thanh toán: ${escapeTelegramHtml(paymentMethod || 'COD')}`);
    lines.push('');
    lines.push('<b>Sản phẩm:</b>');
    for (const item of items) {
        lines.push(`  • ${escapeTelegramHtml(item.name)} x${item.qty} = ${formatVND(item.line_total)}`);
    }
    if (note) lines.push(`\n📝 Ghi chú: ${escapeTelegramHtml(note)}`);
    lines.push('');
    lines.push(`💰 Tổng cộng: <b>${formatVND(total)}</b>`);
    lines.push(`⏰ ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
    return lines.join('\n');
}

function mapProductRow(row) {
    return {
        id: row.id,
        category_id: row.category_id,
        name: row.name,
        price: toNumber(row.price),
        old_price: row.old_price != null ? toNumber(row.old_price) : null,
        discount: toNumber(row.discount),
        stock: toNumber(row.stock),
        status: row.status,
        description: row.description,
        brand: row.brand || null,
        image: row.image,
        icon: row.icon,
        color: row.color,
        specs: row.specs,
        rating: parseFloat(row.rating) || 4.5,
        reviews: toNumber(row.reviews),
sales: toNumber(row.sales),
is_premium: toNumber(row.is_premium),
        is_hot: toNumber(row.is_hot),
        gift: row.gift || '',
        category: row.category_name || ''
    };
}

function mapOrderRow(row) {
    return {
        id: row.id,
        order_code: row.order_code,
        customer_id: row.customer_id,
        customer: row.customer_name,
        phone: row.phone,
        email: row.email,
        address: row.address,
        note: row.note,
        item_count: toNumber(row.item_count),
        total: toNumber(row.total),
        status: row.status,
        payment_method: row.PaymentMethod || row.payment_method || null,
        confirmed_at: row.ConfirmedAt || row.confirmed_at || null,
        confirmed_by: row.ConfirmedBy || row.confirmed_by || null,
        date: row.created_at,
        items: row.items ? JSON.parse(row.items) : []
    };
}

// ============================================================
// API: AUTH
// ============================================================
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
        }

        const conn = await getConn();
        const result = await conn.request()
            .input('username', sql.NVarChar, username)
            .query('SELECT id, username, password, fullname, email, phone, role FROM users WHERE username = @username');

        if (result.recordset.length === 0) {
            return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
        }

        const user = result.recordset[0];
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                fullname: user.fullname,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// ============================================================
// API: REGISTER (đăng ký tài khoản khách hàng)
// ============================================================
app.post('/api/register', async (req, res) => {
    try {
        const { fullname, username, email, phone, password } = req.body;

        // Kiểm tra dữ liệu bắt buộc
        if (!fullname || !username || !password) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ họ tên, tên đăng nhập và mật khẩu' });
        }
        if (String(password).length < 6) {
            return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' });
        }

        const conn = await getConn();

        // Kiểm tra tên đăng nhập đã tồn tại chưa
        const check = await conn.request()
            .input('username', sql.NVarChar, username.trim())
            .query('SELECT id FROM users WHERE username = @username');
        if (check.recordset.length > 0) {
            return res.status(409).json({ success: false, message: 'Tên đăng nhập đã tồn tại' });
        }

        // Kiểm tra email đã tồn tại chưa (nếu có)
        if (email) {
            const emailCheck = await conn.request()
                .input('email', sql.NVarChar, email.trim())
                .query('SELECT id FROM users WHERE email = @email');
            if (emailCheck.recordset.length > 0) {
                return res.status(409).json({ success: false, message: 'Email đã được sử dụng' });
            }
        }

        // Mã hóa mật khẩu bằng bcrypt
        const hashedPassword = await bcrypt.hash(password, 10);

        // Thêm tài khoản mới (role mặc định = customer)
        const insertResult = await conn.request()
            .input('fullname', sql.NVarChar, fullname.trim())
            .input('username', sql.NVarChar, username.trim())
            .input('email', sql.NVarChar, email ? email.trim() : null)
            .input('phone', sql.NVarChar, phone ? phone.trim() : null)
            .input('password', sql.NVarChar, hashedPassword)
            .input('role', sql.NVarChar, 'customer')
            .query(`
                INSERT INTO users (fullname, username, email, phone, password, role)
                OUTPUT INSERTED.id
                VALUES (@fullname, @username, @email, @phone, @password, @role)
            `);

        const newUserId = insertResult.recordset[0].id;

        // Tự động tạo JWT để đăng nhập luôn sau khi đăng ký
        const token = jwt.sign(
            { id: newUserId, username: username.trim(), role: 'customer' },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.status(201).json({
            success: true,
            message: 'Đăng ký thành công!',
            token,
            user: {
                id: newUserId,
                username: username.trim(),
                fullname: fullname.trim(),
                email: email ? email.trim() : null,
                phone: phone ? phone.trim() : null,
                role: 'customer'
            }
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ success: false, message: 'Lỗi server khi đăng ký' });
    }
});

// ============================================================
// API: DASHBOARD (admin)
// ============================================================
app.get('/api/dashboard', authRequired, adminRequired, async (req, res) => {
    try {
        const conn = await getConn();
        const statsResult = await conn.request().query(`
            SELECT
                (SELECT COUNT(*) FROM products) AS total_products,
                (SELECT COUNT(*) FROM orders) AS total_orders,
                (SELECT COUNT(*) FROM customers) AS total_customers,
                (SELECT ISNULL(SUM(total),0) FROM orders WHERE status <> 'Đã hủy') AS total_revenue
        `);
        const stats = statsResult.recordset[0];

        const recentResult = await conn.request().query(`
            SELECT TOP 5 o.id, o.order_code, o.customer_name, o.item_count, o.total, o.status, o.created_at
            FROM orders o
            ORDER BY o.created_at DESC
        `);

        const topResult = await conn.request().query(`
            SELECT TOP 5 product_name, SUM(qty) AS total_qty, SUM(line_total) AS revenue
            FROM order_items
            GROUP BY product_name
            ORDER BY total_qty DESC
        `);

        res.json({
            success: true,
            stats: {
                total_products: toNumber(stats.total_products),
                total_orders: toNumber(stats.total_orders),
                total_customers: toNumber(stats.total_customers),
                total_revenue: toNumber(stats.total_revenue)
            },
            recent_orders: recentResult.recordset,
            top_products: topResult.recordset
        });
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// ============================================================
// API: PRODUCTS
// ============================================================

// Lấy danh sách sản phẩm (không cần đăng nhập cho trang khách hàng)
app.get('/api/products', async (req, res) => {
    try {
        const { category, brand, search, premium, hot } = req.query;
        let sql = `
            SELECT p.*, c.name AS category_name
            FROM products p
            JOIN categories c ON p.category_id = c.id
            WHERE 1=1
        `;
        const request = pool.request();
        if (category && category !== 'all') {
            sql += ' AND c.name = @category';
            request.input('category', sql.NVarChar, category);
        }
        if (brand && brand !== 'all') {
            sql += ' AND p.brand = @brand';
            request.input('brand', sql.NVarChar, brand);
        }
        if (premium === '1') {
            sql += ' AND ISNULL(p.is_premium, 0) = 1';
        }
        if (hot === '1') {
            sql += ' AND ISNULL(p.is_hot, 0) = 1';
        }
        if (search) {
            sql += ' AND (p.name LIKE @search OR p.brand LIKE @search OR CONVERT(NVARCHAR(20), p.id) LIKE @search)';
            request.input('search', sql.NVarChar, `%${search}%`);
        }
        sql += ' ORDER BY p.id ASC';

        const result = await request.query(sql);
        res.json({ success: true, products: result.recordset.map(mapProductRow) });
    } catch (err) {
        console.error('Get products error:', err);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Lấy 1 sản phẩm theo id
app.get('/api/products/:id', async (req, res) => {
    try {
        const conn = await getConn();
        const result = await conn.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                SELECT p.*, c.name AS category_name
                FROM products p JOIN categories c ON p.category_id = c.id
                WHERE p.id = @id
            `);
        if (result.recordset.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        res.json({ success: true, product: mapProductRow(result.recordset[0]) });
    } catch (err) {
        console.error('Get product error:', err);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Thêm sản phẩm (admin)
app.post('/api/products', authRequired, adminRequired, async (req, res) => {
    try {
        const {
            name, category_id, price, old_price, discount, stock,
            status, description, brand, image, icon, color, specs, rating, reviews, sales
        } = req.body;

        if (!name || !category_id) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin sản phẩm' });
        }

        const conn = await getConn();
        const result = await conn.request()
            .input('name', sql.NVarChar, name)
            .input('category_id', sql.Int, category_id)
            .input('price', sql.Decimal(12,0), toNumber(price))
            .input('old_price', sql.Decimal(12,0), old_price || null)
            .input('discount', sql.Int, toNumber(discount))
            .input('stock', sql.Int, toNumber(stock))
            .input('status', sql.NVarChar, status || 'active')
            .input('description', sql.NVarChar(sql.MAX), description || null)
            .input('brand', sql.NVarChar, brand || null)
            .input('image', sql.NVarChar, image || null)
            .input('icon', sql.NVarChar, icon || 'fa-box')
            .input('color', sql.NVarChar, color || '#1976d2')
            .input('specs', sql.NVarChar, specs || null)
            .input('rating', sql.Decimal(2,1), rating || 4.5)
            .input('reviews', sql.Int, toNumber(reviews))
            .input('sales', sql.Int, toNumber(sales))
            .query(`
                INSERT INTO products
                (name, category_id, price, old_price, discount, stock, status, description, brand, image, icon, color, specs, rating, reviews, sales)
                OUTPUT INSERTED.id
                VALUES
                (@name, @category_id, @price, @old_price, @discount, @stock, @status, @description, @brand, @image, @icon, @color, @specs, @rating, @reviews, @sales)
            `);

        const newId = result.recordset[0].id;
        const getResult = await conn.request()
            .input('id', sql.Int, newId)
            .query('SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = @id');
        res.status(201).json({ success: true, product: mapProductRow(getResult.recordset[0]) });
    } catch (err) {
        console.error('Create product error:', err);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Cập nhật sản phẩm (admin)
app.put('/api/products/:id', authRequired, adminRequired, async (req, res) => {
    try {
        const {
            name, category_id, price, old_price, discount, stock,
            status, description, brand, image, icon, color, specs, rating, reviews, sales
        } = req.body;

        const conn = await getConn();
        await conn.request()
            .input('name', sql.NVarChar, name)
            .input('category_id', sql.Int, category_id)
            .input('price', sql.Decimal(12,0), toNumber(price))
            .input('old_price', sql.Decimal(12,0), old_price || null)
            .input('discount', sql.Int, toNumber(discount))
            .input('stock', sql.Int, toNumber(stock))
            .input('status', sql.NVarChar, status || 'active')
            .input('description', sql.NVarChar(sql.MAX), description || null)
            .input('brand', sql.NVarChar, brand || null)
            .input('image', sql.NVarChar, image || null)
            .input('icon', sql.NVarChar, icon || 'fa-box')
            .input('color', sql.NVarChar, color || '#1976d2')
            .input('specs', sql.NVarChar, specs || null)
            .input('rating', sql.Decimal(2,1), rating || 4.5)
            .input('reviews', sql.Int, toNumber(reviews))
            .input('sales', sql.Int, toNumber(sales))
            .input('id', sql.Int, req.params.id)
            .query(`
                UPDATE products SET
                    name = @name, category_id = @category_id, price = @price, old_price = @old_price,
                    discount = @discount, stock = @stock, status = @status, description = @description,
                    brand = @brand, image = @image, icon = @icon, color = @color, specs = @specs, rating = @rating,
                    reviews = @reviews, sales = @sales
                WHERE id = @id
            `);

        const getResult = await conn.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = @id');
        if (getResult.recordset.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        res.json({ success: true, product: mapProductRow(getResult.recordset[0]) });
    } catch (err) {
        console.error('Update product error:', err);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Xóa sản phẩm (admin)
app.delete('/api/products/:id', authRequired, adminRequired, async (req, res) => {
    try {
        const conn = await getConn();
        const result = await conn.request()
            .input('id', sql.Int, req.params.id)
            .query('DELETE FROM products WHERE id = @id');
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        }
        res.json({ success: true, message: 'Đã xóa sản phẩm' });
    } catch (err) {
        console.error('Delete product error:', err);
        res.status(500).json({ success: false, message: 'Không thể xóa sản phẩm đang có trong đơn hàng' });
    }
});

// ============================================================
// API: CATEGORIES
// ============================================================

app.get('/api/categories', async (req, res) => {
    try {
        const conn = await getConn();
        const result = await conn.request().query(`
            SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
            FROM categories c
            ORDER BY c.id ASC
        `);
        res.json({
            success: true,
            categories: result.recordset.map(r => ({
                id: r.id,
                name: r.name,
                description: r.description,
                icon: r.icon,
                color: r.color,
                count: toNumber(r.product_count)
            }))
        });
    } catch (err) {
        console.error('Get categories error:', err);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

app.post('/api/categories', authRequired, adminRequired, async (req, res) => {
    try {
        const { name, description, icon, color } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Thiếu tên danh mục' });
        const conn = await getConn();
        const result = await conn.request()
            .input('name', sql.NVarChar, name)
            .input('description', sql.NVarChar, description || null)
            .input('icon', sql.NVarChar, icon || 'fa-tag')
            .input('color', sql.NVarChar, color || '#1976d2')
            .query('INSERT INTO categories (name, description, icon, color) OUTPUT INSERTED.id VALUES (@name, @description, @icon, @color)');
        res.status(201).json({ success: true, id: result.recordset[0].id, name, description, icon, color, count: 0 });
    } catch (err) {
        console.error('Create category error:', err);
        if (err.number === 2627 || err.number === 2601) {
            return res.status(400).json({ success: false, message: 'Danh mục đã tồn tại' });
        }
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

app.put('/api/categories/:id', authRequired, adminRequired, async (req, res) => {
    try {
        const { name, description, icon, color } = req.body;
        const conn = await getConn();
        await conn.request()
            .input('name', sql.NVarChar, name)
            .input('description', sql.NVarChar, description || null)
            .input('icon', sql.NVarChar, icon || 'fa-tag')
            .input('color', sql.NVarChar, color || '#1976d2')
            .input('id', sql.Int, req.params.id)
            .query('UPDATE categories SET name = @name, description = @description, icon = @icon, color = @color WHERE id = @id');
        res.json({ success: true, message: 'Đã cập nhật danh mục' });
    } catch (err) {
        console.error('Update category error:', err);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

app.delete('/api/categories/:id', authRequired, adminRequired, async (req, res) => {
    try {
        const conn = await getConn();
        const countResult = await conn.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT COUNT(*) AS cnt FROM products WHERE category_id = @id');
        const cnt = toNumber(countResult.recordset[0].cnt);
        if (cnt > 0) {
            return res.status(400).json({ success: false, message: 'Không thể xóa danh mục đang có sản phẩm' });
        }
        await conn.request()
            .input('id', sql.Int, req.params.id)
            .query('DELETE FROM categories WHERE id = @id');
        res.json({ success: true, message: 'Đã xóa danh mục' });
    } catch (err) {
        console.error('Delete category error:', err);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// ============================================================
// API: ORDERS
// ============================================================

// Lấy danh sách đơn hàng (kèm items)
// Hỗ trợ: ?status= (lọc theo trạng thái), ?search= (tìm theo mã đơn, tên khách, SĐT)
app.get('/api/orders', authRequired, async (req, res) => {
    try {
        const { status, search } = req.query;
        const conn = await getConn();
        const request = conn.request();

        let where = ' WHERE 1=1';
        if (status) {
            where += ' AND o.status = @status';
            request.input('status', sql.NVarChar, status);
        }
        if (search) {
            where += ` AND (o.order_code LIKE @search OR o.customer_name LIKE @search OR o.phone LIKE @search)`;
            request.input('search', sql.NVarChar, `%${search}%`);
        }

        const query = `
            SELECT o.*,
                (SELECT ISNULL((
                    SELECT product_id, product_name AS [name], price, qty, line_total
                    FROM order_items oi
                    WHERE oi.order_id = o.id
                    FOR JSON PATH
                ), '[]')) AS items
            FROM orders o
            ${where}
            ORDER BY o.created_at DESC
        `;

        const result = await request.query(query);
        res.json({ success: true, orders: result.recordset.map(mapOrderRow) });
    } catch (err) {
        console.error('Get orders error:', err);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Lấy chi tiết 1 đơn hàng + danh sách sản phẩm trong đơn
app.get('/api/orders/:id', authRequired, async (req, res) => {
    try {
        const conn = await getConn();
        const result = await conn.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                SELECT o.*,
                    (SELECT ISNULL((
                        SELECT product_id, product_name AS [name], price, qty, line_total
                        FROM order_items oi
                        WHERE oi.order_id = o.id
                        FOR JSON PATH
                    ), '[]')) AS items
                FROM orders o
                WHERE o.id = @id
            `);
        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }
        res.json({ success: true, order: mapOrderRow(result.recordset[0]) });
    } catch (err) {
        console.error('Get order detail error:', err);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Tạo đơn hàng mới (khách hàng thanh toán)
// - Kiểm tra giỏ hàng không rỗng, số lượng > 0
// - Đọc giá thật từ SQL Server (không tin tưởng giá frontend gửi lên)
// - Tự tính tổng tiền ở backend
// - Tạo mã đơn duy nhất
// - Thêm Orders + OrderDetails trong cùng 1 SQL transaction (rollback nếu lỗi)
app.post('/api/orders', authRequired, customerRequired, async (req, res) => {
    let transaction;
    try {
        const { customer_name, phone, email, address, note, payment_method, items } = req.body;

        if (!customer_name || !phone || !address) {
            return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin' });
        }
        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Giỏ hàng trống' });
        }
        // Kiểm tra số lượng > 0 và có product_id hợp lệ
        for (const item of items) {
            if (!item.product_id) {
                return res.status(400).json({ success: false, message: 'Sản phẩm không hợp lệ' });
            }
            const qty = toNumber(item.qty);
            if (qty <= 0) {
                return res.status(400).json({ success: false, message: 'Số lượng sản phẩm phải lớn hơn 0' });
            }
        }

        const conn = await getConn();
        transaction = new sql.Transaction(conn);
        await transaction.begin();

        // Đọc giá thật của từng sản phẩm từ DB
        const productIds = items.map(i => i.product_id);
        const placeholders = productIds.map((_, idx) => `@p${idx}`).join(',');
        const priceReq = transaction.request();
        productIds.forEach((pid, idx) => priceReq.input(`p${idx}`, sql.Int, pid));
        const priceResult = await priceReq.query(`
            SELECT id, name, price FROM products
            WHERE id IN (${placeholders})
        `);
        const priceMap = {};
        priceResult.recordset.forEach(r => { priceMap[r.id] = { name: r.name, price: toNumber(r.price) }; });

        // Kiểm tra mọi sản phẩm đều tồn tại
        let itemCount = 0;
        let total = 0;
        const orderItems = [];
        for (const item of items) {
            const pid = item.product_id;
            const real = priceMap[pid];
            if (!real) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: `Sản phẩm ${pid} không tồn tại` });
            }
            const qty = toNumber(item.qty);
            const lineTotal = real.price * qty;
            itemCount += qty;
            total += lineTotal;
            orderItems.push({ product_id: pid, name: real.name, price: real.price, qty, line_total: lineTotal });
        }

        // Tạo mã đơn duy nhất (DH + 6 chữ số ngẫu nhiên, kiểm tra trùng)
        let orderCode = '';
        for (let attempt = 0; attempt < 10; attempt++) {
            const candidate = 'DH' + String(Math.floor(100000 + Math.random() * 900000));
            const check = await transaction.request()
                .input('code', sql.NVarChar, candidate)
                .query('SELECT COUNT(*) AS c FROM orders WHERE order_code = @code');
            if (toNumber(check.recordset[0].c) === 0) {
                orderCode = candidate;
                break;
            }
        }
        if (!orderCode) {
            await transaction.rollback();
            return res.status(500).json({ success: false, message: 'Không thể tạo mã đơn hàng, thử lại' });
        }

        // Tìm hoặc tạo khách hàng
        let customerId = null;
        const custResult = await transaction.request()
            .input('phone', sql.NVarChar, phone)
            .query('SELECT id FROM customers WHERE phone = @phone');
        if (custResult.recordset.length > 0) {
            customerId = custResult.recordset[0].id;
        } else {
            const newCust = await transaction.request()
                .input('name', sql.NVarChar, customer_name)
                .input('email', sql.NVarChar, email || null)
                .input('phone', sql.NVarChar, phone)
                .input('address', sql.NVarChar, address || null)
                .query('INSERT INTO customers (name, email, phone, address) OUTPUT INSERTED.id VALUES (@name, @email, @phone, @address)');
            customerId = newCust.recordset[0].id;
        }

        // Tạo đơn hàng (trạng thái ban đầu: Chờ xác nhận)
        const orderResult = await transaction.request()
            .input('order_code', sql.NVarChar, orderCode)
            .input('customer_id', sql.Int, customerId)
            .input('customer_name', sql.NVarChar, customer_name)
            .input('phone', sql.NVarChar, phone)
            .input('email', sql.NVarChar, email || null)
            .input('address', sql.NVarChar, address || null)
            .input('note', sql.NVarChar(sql.MAX), note || null)
            .input('payment_method', sql.NVarChar, payment_method || 'COD')
            .input('item_count', sql.Int, itemCount)
            .input('total', sql.Decimal(14,0), total)
            .input('status', sql.NVarChar, 'Chờ xác nhận')
            .query(`INSERT INTO orders (order_code, customer_id, customer_name, phone, email, address, note, PaymentMethod, item_count, total, status)
                    OUTPUT INSERTED.id
                    VALUES (@order_code, @customer_id, @customer_name, @phone, @email, @address, @note, @payment_method, @item_count, @total, @status)`);
        const orderId = orderResult.recordset[0].id;

        // Tạo chi tiết đơn hàng (giá thật từ DB)
        for (const item of orderItems) {
            await transaction.request()
                .input('order_id', sql.Int, orderId)
                .input('product_id', sql.Int, item.product_id)
                .input('product_name', sql.NVarChar, item.name)
                .input('price', sql.Decimal(12,0), item.price)
                .input('qty', sql.Int, item.qty)
                .input('line_total', sql.Decimal(14,0), item.line_total)
                .query(`INSERT INTO order_items (order_id, product_id, product_name, price, qty, line_total)
                        VALUES (@order_id, @product_id, @product_name, @price, @qty, @line_total)`);
            // Tăng số lượng bán
            await transaction.request()
                .input('qty', sql.Int, item.qty)
                .input('product_id', sql.Int, item.product_id)
                .query('UPDATE products SET sales = sales + @qty WHERE id = @product_id');
        }

        await transaction.commit();
        transaction = null;

        // Đơn đã được lưu thành công trước, sau đó mới gửi Telegram.
        // Nếu Telegram lỗi thì đơn vẫn tồn tại trong SQL và vẫn hiện ở trang Admin.
        const telegramMessage = buildOrderTelegramMessage({
            orderCode,
            customerName: customer_name,
            phone,
            email,
            address,
            note,
            paymentMethod: payment_method || 'COD',
            total,
            items: orderItems
        });
        const telegramNotified = await sendTelegramNotification(telegramMessage);

        res.status(201).json({
            success: true,
            orderId: orderId,
            orderCode: orderCode,
            status: 'Chờ xác nhận',
            telegramNotified,
            message: 'Đặt hàng thành công!'
        });
    } catch (err) {
        if (transaction) {
            try { await transaction.rollback(); } catch (e) {}
        }
        console.error('Create order error:', err);
        res.status(500).json({ success: false, message: 'Lỗi server khi tạo đơn hàng' });
    }
});

// Xác nhận đơn hàng (admin) - chỉ khi đơn đang "Chờ xác nhận"
// - Cập nhật Status thành "Đã xác nhận"
// - Ghi ConfirmedAt = thời gian hiện tại, ConfirmedBy = tài khoản admin
// - Dùng UPDATE có điều kiện WHERE status = 'Chờ xác nhận' để chống xác nhận 2 lần
app.post('/api/orders/:id/confirm', authRequired, adminRequired, async (req, res) => {
    let transaction;
    try {
        const conn = await getConn();
        transaction = new sql.Transaction(conn);
        await transaction.begin();

        // Kiểm tra đơn tồn tại
        const checkResult = await transaction.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT id, status FROM orders WHERE id = @id');
        if (checkResult.recordset.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }
        if (checkResult.recordset[0].status !== 'Chờ xác nhận') {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Đơn hàng không ở trạng thái chờ xác nhận' });
        }

const adminName = req.user.username || 'Admin';
        const result = await transaction.request()
            .input('status', sql.NVarChar, 'Đã xác nhận')
            .input('confirmedBy', sql.NVarChar, adminName)
            .input('id', sql.Int, req.params.id)
            .query(`
                UPDATE orders
                SET status = @status,
                    ConfirmedAt = GETDATE(),
                    ConfirmedBy = @confirmedBy,
                    updated_at = GETDATE()
                WHERE id = @id AND status = N'Chờ xác nhận'
            `);

        if (result.rowsAffected[0] === 0) {
            // Không cập nhật được -> ai đó đã xác nhận trước đó
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Đơn hàng đã được xác nhận trước đó' });
        }

        await transaction.commit();

        // Lấy trạng thái mới sau khi thành công
        const newResult = await conn.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT status, ConfirmedAt, ConfirmedBy FROM orders WHERE id = @id');
        const updated = newResult.recordset[0];

        res.json({
            success: true,
            message: 'Đã xác nhận đơn hàng',
            order_id: req.params.id,
            status: updated.status,
            confirmed_at: updated.ConfirmedAt,
            confirmed_by: updated.ConfirmedBy
        });
    } catch (err) {
        if (transaction) {
            try { await transaction.rollback(); } catch (e) {}
        }
        console.error('Confirm order error:', err);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Cập nhật trạng thái đơn hàng (admin)
app.put('/api/orders/:id', authRequired, adminRequired, async (req, res) => {
    try {
        const { status } = req.body;
const validStatuses = ['Chờ xác nhận', 'Đã xác nhận', 'Đang giao', 'Đã giao', 'Đã hủy'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
        }
        const conn = await getConn();
        await conn.request()
            .input('status', sql.NVarChar, status)
            .input('id', sql.Int, req.params.id)
            .query('UPDATE orders SET status = @status WHERE id = @id');
        res.json({ success: true, message: 'Đã cập nhật trạng thái đơn hàng' });
    } catch (err) {
        console.error('Update order error:', err);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// ============================================================
// API: CUSTOMERS
// ============================================================

app.get('/api/customers', authRequired, adminRequired, async (req, res) => {
    try {
        const { search } = req.query;
        let sql = 'SELECT * FROM customers WHERE 1=1';
        const request = pool.request();
        if (search) {
            sql += ' AND (name LIKE @search OR phone LIKE @search OR email LIKE @search)';
            request.input('search', sql.NVarChar, `%${search}%`);
        }
        sql += ' ORDER BY id ASC';
        const result = await request.query(sql);
        res.json({
            success: true,
            customers: result.recordset.map(c => ({
                id: c.id,
                name: c.name,
                email: c.email,
                phone: c.phone,
                address: c.address,
                regDate: c.reg_date
            }))
        });
    } catch (err) {
        console.error('Get customers error:', err);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// ============================================================
// API: USERS (quản lý tài khoản khách hàng đã đăng ký)
// ============================================================

// Danh sách tài khoản khách hàng đăng ký trên web (bảng users, role=customer)
// Hỗ trợ: ?search= (tìm theo username/fullname/email/phone)
app.get('/api/users', authRequired, adminRequired, async (req, res) => {
    try {
        const { search } = req.query;
        const conn = await getConn();
        const request = conn.request();

        let where = ` WHERE role = 'customer'`;
        if (search) {
            where += ` AND (username LIKE @search OR fullname LIKE @search OR email LIKE @search OR phone LIKE @search)`;
            request.input('search', sql.NVarChar, `%${search}%`);
        }

        const query = `
            SELECT id, username, fullname, email, phone, role, created_at,
                (SELECT COUNT(*) FROM customers c WHERE c.phone = u.phone) AS has_orders
            FROM users u
            ${where}
            ORDER BY created_at DESC, id DESC
        `;

        const result = await request.query(query);
        const users = result.recordset.map(u => ({
            id: u.id,
            username: u.username,
            fullname: u.fullname,
            email: u.email,
            phone: u.phone,
            role: u.role,
            created_at: u.created_at,
            has_orders: u.has_orders > 0
        }));

        // users mới đăng ký: trong 7 ngày gần đây
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

        res.json({
            success: true,
            users: users,
            new_users: users.filter(u => new Date(u.created_at) >= sevenDaysAgo)
        });
    } catch (err) {
        console.error('Get users error:', err);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// ============================================================
// API: REGISTRATIONS (danh sách tài khoản khách hàng đã đăng ký)
// - Lấy toàn bộ user role 'customer' từ bảng users
// - Kèm is_new (đăng ký trong 7 ngày gần đây) để admin lọc nhanh
// ============================================================
app.get('/api/registrations', authRequired, adminRequired, async (req, res) => {
    try {
        const { search } = req.query;
        const conn = await getConn();
        const request = conn.request();

        let where = " WHERE role = 'customer'";
        if (search) {
            where += ` AND (username LIKE @search OR fullname LIKE @search OR email LIKE @search OR phone LIKE @search)`;
            request.input('search', sql.NVarChar, `%${search}%`);
        }

        const query = `
            SELECT
                id, username, fullname, email, phone, role, created_at,
                CASE WHEN created_at >= DATEADD(day, -7, GETDATE()) THEN 1 ELSE 0 END AS is_new
            FROM users
            ${where}
            ORDER BY created_at DESC
        `;

        const result = await request.query(query);
        const registrations = result.recordset.map(r => ({
            id: r.id,
            username: r.username,
            fullname: r.fullname,
            email: r.email || null,
            phone: r.phone || null,
            role: r.role,
            created_at: r.created_at,
            is_new: toNumber(r.is_new) === 1
        }));

        res.json({ success: true, registrations });
    } catch (err) {
        console.error('Get registrations error:', err);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// ============================================================
// API: SETTINGS
// ============================================================

app.get('/api/settings', async (req, res) => {
    try {
        const conn = await getConn();
        const result = await conn.request().query('SELECT setting_key, setting_value FROM settings');
        const settings = {};
        result.recordset.forEach(r => { settings[r.setting_key] = r.setting_value; });
        res.json({ success: true, settings });
    } catch (err) {
        console.error('Get settings error:', err);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

app.put('/api/settings', authRequired, adminRequired, async (req, res) => {
    try {
        const { shopName, shopAddress, shopPhone, shopEmail } = req.body;
        const entries = { shopName, shopAddress, shopPhone, shopEmail };
        const conn = await getConn();
        for (const [key, value] of Object.entries(entries)) {
            if (value !== undefined) {
                await conn.request()
                    .input('setting_key', sql.NVarChar, key)
                    .input('setting_value', sql.NVarChar(sql.MAX), value)
                    .query(`
                        IF EXISTS (SELECT 1 FROM settings WHERE setting_key = @setting_key)
                            UPDATE settings SET setting_value = @setting_value, updated_at = GETDATE() WHERE setting_key = @setting_key
                        ELSE
                            INSERT INTO settings (setting_key, setting_value) VALUES (@setting_key, @setting_value)
                    `);
            }
        }
        res.json({ success: true, message: 'Đã lưu cài đặt' });
    } catch (err) {
        console.error('Save settings error:', err);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// ============================================================
// SERVE STATIC FRONTEND
// ============================================================
const WEB_ROOT = path.resolve(__dirname, '..');

// Serve các thư mục frontend
app.use('/login', express.static(path.join(WEB_ROOT, 'login')));
// Dùng giao diện admin production đã hoàn thiện (cùng phiên bản với cloud deploy).
app.use('/admin', express.static(path.join(WEB_ROOT, 'cloud', 'public', 'admin')));
app.use('/customer', express.static(path.join(WEB_ROOT, 'customer')));
app.use('/logo', express.static(path.join(WEB_ROOT, 'logo')));
app.use('/assets', express.static(path.join(WEB_ROOT, 'assets')));
app.use('/img', express.static(path.join(WEB_ROOT, 'img')));

// Trang đầu tiên là trang khách hàng; đăng nhập chỉ bắt buộc khi tạo đơn.
app.get('/', (req, res) => {
    res.redirect('/customer/khachhang.html');
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ success: true, status: 'ok', time: new Date().toISOString() });
});

// 404 cho API
app.use('/api', (req, res) => {
    res.status(404).json({ success: false, message: 'API không tồn tại' });
});

// ============================================================
// KHỞI ĐỘNG SERVER
// ============================================================
function getLanAddresses() {
    try {
        return Object.values(os.networkInterfaces())
            .flat()
            .filter(address => address && address.family === 'IPv4' && !address.internal)
            .map(address => address.address);
    } catch (error) {
        console.warn('  ⚠️ Không tự đọc được IP LAN. Hãy chạy ipconfig để xem IPv4 Address.');
        return [];
    }
}

function startServer() {
    return app.listen(PORT, '0.0.0.0', async () => {
        console.log('==============================================');
        console.log('  🏪 ĐIỆN MÁY NGUYÊN HÙNG - BACKEND SERVER');
        console.log('==============================================');
        console.log(`  🔗 http://localhost:${PORT}`);
        console.log(`  📋 Admin:  http://localhost:${PORT}/admin/admin.html`);
        console.log(`  🛒 Khách:  http://localhost:${PORT}/customer/khachhang.html`);
        getLanAddresses().forEach(address => {
            console.log(`  📱 Điện thoại: http://${address}:${PORT}/customer/khachhang.html`);
        });
        console.log(TELEGRAM_ENABLED
            ? '  📲 Telegram: Đã cấu hình, sẵn sàng nhận đơn mới'
            : '  📲 Telegram: Chưa cấu hình TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID');
        console.log('==============================================');
        await checkConnection();
    });
}

if (require.main === module) {
    startServer();
}

module.exports = {
    app,
    startServer,
    sendTelegramNotification,
    buildOrderTelegramMessage,
    escapeTelegramHtml
};
