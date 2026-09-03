// ============================================================
// ĐIỆN MÁY NGUYÊN HÙNG - CLOUD DB (SQLite)
// File: cloud/db.js
// Khởi tạo database SQLite, tạo 7 bảng + seed dữ liệu mẫu
// ============================================================
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { BRAND_CATALOG_SEED } = require('./catalog-seed');
const REAL_PRODUCTS_PATH = path.join(__dirname, 'real-products.json');
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.sqlite');

// Tạo thư mục chứa DB nếu chưa có
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ============================================================
// TẠO BẢNG
// ============================================================
db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    fullname TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin','customer')),
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT DEFAULT 'fa-tag',
    color TEXT DEFAULT '#1976d2',
    created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    brand TEXT,
    price REAL NOT NULL DEFAULT 0,
    old_price REAL DEFAULT NULL,
    discount INTEGER DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
    description TEXT,
    image TEXT,
    icon TEXT DEFAULT 'fa-box',
    color TEXT DEFAULT '#1976d2',
    specs TEXT,
    rating REAL DEFAULT 4.5,
    reviews INTEGER DEFAULT 0,
    sales INTEGER DEFAULT 0,
    is_premium INTEGER DEFAULT 0,
    is_hot INTEGER DEFAULT 0,
    gift TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    user_id INTEGER,
    reg_date TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_code TEXT NOT NULL UNIQUE,
    customer_id INTEGER,
    customer_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    note TEXT,
    PaymentMethod TEXT NOT NULL DEFAULT 'COD',
    item_count INTEGER DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Chờ xác nhận',
    ConfirmedAt TEXT,
    ConfirmedBy TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER,
    product_name TEXT NOT NULL,
    price REAL NOT NULL,
    qty INTEGER NOT NULL DEFAULT 1,
    line_total REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT,
    updated_at TEXT DEFAULT (datetime('now','localtime'))
);
`);

// ============================================================
// SEED DỮ LIỆU (chỉ chạy khi bảng rỗng)
// ============================================================
function seedIfEmpty() {
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount > 0) return;

  const seed = db.transaction(() => {
    // Production requires an admin password supplied as an environment secret.
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
    if (IS_PRODUCTION && !adminPassword) {
      throw new Error('INITIAL_ADMIN_PASSWORD must be configured before the first production start');
    }
    db.prepare(`INSERT INTO users (username, password, fullname, email, phone, role) VALUES
      (?,?,?,?,?,?)`).run('admin', bcrypt.hashSync(adminPassword || 'admin123', 12), 'Quản Trị Viên', 'admin@nguyenhung.vn', '0901.234.567', 'admin');
    if (!IS_PRODUCTION) {
      db.prepare(`INSERT INTO users (username, password, fullname, email, phone, role) VALUES
        (?,?,?,?,?,?)`).run('khachhang', bcrypt.hashSync('kh123456', 12), 'Khách Hàng', 'khachhang@nguyenhung.vn', '0987.654.321', 'customer');
    }

    // Categories
    const catStmt = db.prepare(`INSERT INTO categories (id, name, description, icon, color) VALUES (?,?,?,?,?)`);
    const cats = [
      [1,'Tủ Lạnh','Tủ lạnh, tủ đông, tủ mát','fa-snowflake','#1976d2'],
      [2,'Máy Giặt','Máy giặt, máy sấy, máy giặt sấy','fa-washer','#c62828'],
      [3,'Điều Hòa','Điều hòa, máy lạnh, máy lọc không khí','fa-wind','#2e7d32'],
      [4,'TV','Tivi, Smart TV, màn hình','fa-tv','#e65100'],
      [5,'Máy Nước Nóng','Máy nước nóng trực tiếp, gián tiếp','fa-hot-tub','#7b1fa2'],
      [6,'Đồ Gia Dụng','Bếp từ, máy hút bụi, đồ gia dụng khác','fa-blender','#00695c']
    ];
    for (const c of cats) catStmt.run(...c);

    // Products mẫu (12 sản phẩm)
    const prodStmt = db.prepare(`INSERT INTO products
      (id, category_id, name, price, old_price, discount, stock, status, description, icon, color, specs, rating, reviews, sales)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    const prods = [
      [1,1,'Tủ Lạnh Inverter 500L',15900000,18500000,14,25,'active','Tủ lạnh Inverter tiết kiệm điện, dung tích 500L, 2 cánh','fa-snowflake','#1976d2','Inverter, 500L, Tủ lạnh 2 cánh, Tiết kiệm điện',4.8,256,45],
      [2,2,'Máy Giặt Cửa Trên 9Kg',8500000,9900000,15,18,'active','Máy giặt cửa trên 9Kg, lồng nhựa, giặt nước nóng','fa-washer','#c62828','9Kg, Lồng nhựa, Giặt nước nóng, Tiết kiệm nước',4.7,189,38],
      [3,3,'Điều Hòa 12000BTU Inverter',12500000,14900000,16,30,'active','Điều hòa 12000BTU Inverter, gas R32, lọc khí','fa-wind','#2e7d32','12000BTU, Inverter, Gas R32, Lọc khí',4.9,312,52],
      [4,4,'TV Smart 4K 55 inch',18900000,22900000,18,12,'active','TV Smart 4K 55 inch, HDR, Android TV','fa-tv','#e65100','55 inch, 4K, HDR, Android TV, Smart Hub',4.8,178,27],
      [5,2,'Máy Giặt Cửa Trước 10Kg',11200000,13500000,17,0,'inactive','Máy giặt cửa trước 10Kg Inverter, sấy khô','fa-washer','#c62828','10Kg, Inverter, Cửa trước, Sấy khô',4.6,145,19],
      [6,1,'Tủ Lạnh Mini 120L',5200000,6200000,16,40,'active','Tủ lạnh mini 120L, 1 cánh, tiết kiệm điện','fa-snowflake','#1976d2','120L, Mini, 1 cánh, Tiết kiệm điện',4.5,98,33],
      [7,3,'Điều Hòa 9000BTU',8900000,10500000,15,35,'active','Điều hòa 9000BTU Inverter, gas R32, lọc bụi','fa-wind','#2e7d32','9000BTU, Inverter, Gas R32, Lọc bụi',4.7,210,41],
      [8,4,'TV QLED 65 inch 4K',25900000,29900000,14,8,'active','TV QLED 65 inch 4K, HDR10+, Smart TV','fa-tv','#e65100','65 inch, QLED, 4K, HDR10+, Smart TV',4.9,87,15],
      [9,5,'Máy Nước Nóng Trực Tiếp',3200000,3900000,18,50,'active','Máy nước nóng trực tiếp 3500W, chống giật','fa-hot-tub','#7b1fa2','Trực tiếp, 3500W, Chống giật, An toàn',4.6,156,63],
      [10,6,'Bếp Từ Đôi Cao Cấp',6800000,8200000,17,22,'active','Bếp từ đôi cảm ứng 4000W, tự động tắt','fa-blender','#00695c','Đôi, Cảm ứng, 4000W, Tự động tắt',4.7,92,23],
      [11,6,'Máy Hút Bụi Không Dây',4500000,5500000,18,28,'active','Máy hút bụi không dây 45 phút, HEPA, đa năng','fa-broom','#00695c','Không dây, 45 phút, HEPA, Đa năng',4.8,201,47],
      [12,5,'Máy Nước Nóng Gián Tiếp 30L',5800000,6900000,16,32,'active','Máy nước nóng gián tiếp 30L, 2500W','fa-hot-tub','#7b1fa2','Gián tiếp 30L, 2500W, Tiết kiệm điện',4.5,77,29]
    ];
    for (const p of prods) prodStmt.run(...p);

    // Gán brand cho 12 sản phẩm
    const brandMap = { 1:'SAMSUNG',2:'TOSHIBA',3:'DAIKIN',4:'SONY',5:'LG',6:'PANASONIC',7:'SHARP',8:'SAMSUNG',9:'ARISTON',10:'BOSCH',11:'ELECTROLUX',12:'FERROLI' };
    const updBrand = db.prepare('UPDATE products SET brand = ? WHERE id = ?');
    for (const [id, b] of Object.entries(brandMap)) updBrand.run(b, id);

    // Customers
    const custStmt = db.prepare(`INSERT INTO customers (id, name, email, phone, address, user_id) VALUES (?,?,?,?,?,?)`);
    const custs = [
      [1,'Nguyễn Văn An','an.nguyen@email.com','0901.234.567','123 Lê Lợi, Q1, TP.HCM',null],
      [2,'Trần Thị Bình','binh.tran@email.com','0902.345.678','456 Nguyễn Huệ, Q1, TP.HCM',null],
      [3,'Lê Văn Cường','cuong.le@email.com','0903.456.789','789 Võ Văn Tần, Q3, TP.HCM',null],
      [4,'Phạm Thị Dung','dung.pham@email.com','0904.567.890','321 Hai Bà Trưng, Q1, TP.HCM',null],
      [5,'Hoàng Văn Em','em.hoang@email.com','0905.678.901','654 Điện Biên Phủ, Bình Thạnh, TP.HCM',null]
    ];
    for (const c of custs) custStmt.run(...c);

    // Orders
    const ordStmt = db.prepare(`INSERT INTO orders
      (id, order_code, customer_id, customer_name, phone, email, address, item_count, total, status, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
    const ords = [
      [1,'DH001',1,'Nguyễn Văn An','0901.234.567','an.nguyen@email.com','123 Lê Lợi, Q1, TP.HCM',2,24400000,'Đã giao','2026-07-28 09:30:00'],
      [2,'DH002',2,'Trần Thị Bình','0902.345.678','binh.tran@email.com','456 Nguyễn Huệ, Q1, TP.HCM',1,12500000,'Đang giao','2026-07-27 14:15:00'],
      [3,'DH003',3,'Lê Văn Cường','0903.456.789','cuong.le@email.com','789 Võ Văn Tần, Q3, TP.HCM',3,38600000,'Chờ xác nhận','2026-07-26 10:45:00'],
      [4,'DH004',4,'Phạm Thị Dung','0904.567.890','dung.pham@email.com','321 Hai Bà Trưng, Q1, TP.HCM',1,11200000,'Đã giao','2026-07-25 16:20:00'],
      [5,'DH005',5,'Hoàng Văn Em','0905.678.901','em.hoang@email.com','654 Điện Biên Phủ, Bình Thạnh, TP.HCM',2,31400000,'Đã hủy','2026-07-24 11:00:00']
    ];
    for (const o of ords) ordStmt.run(...o);

    // Order items
    const itemStmt = db.prepare(`INSERT INTO order_items (id, order_id, product_id, product_name, price, qty, line_total) VALUES (?,?,?,?,?,?,?)`);
    const items = [
      [1,1,1,'Tủ Lạnh Inverter 500L',15900000,1,15900000],
      [2,1,2,'Máy Giặt Cửa Trên 9Kg',8500000,1,8500000],
      [3,2,3,'Điều Hòa 12000BTU Inverter',12500000,1,12500000],
      [4,3,4,'TV Smart 4K 55 inch',18900000,1,18900000],
      [5,3,1,'Tủ Lạnh Inverter 500L',15900000,1,15900000],
      [6,3,2,'Máy Giặt Cửa Trên 9Kg',8500000,1,8500000],
      [7,4,5,'Máy Giặt Cửa Trước 10Kg',11200000,1,11200000],
      [8,5,3,'Điều Hòa 12000BTU Inverter',12500000,1,12500000],
      [9,5,4,'TV Smart 4K 55 inch',18900000,1,18900000]
    ];
    for (const it of items) itemStmt.run(...it);

    // Settings
    const setStmt = db.prepare('INSERT INTO settings (setting_key, setting_value) VALUES (?,?)');
    setStmt.run('shopName','Điện Máy Nguyên Hùng');
    setStmt.run('shopAddress','Số 123, Đường Lê Lợi, TP. Hồ Chí Minh');
    setStmt.run('shopPhone','1900.123.456');
    setStmt.run('shopEmail','info@nguyenhung.vn');
  });

  seed();
}

// ============================================================
// HASH MẬT KHẨU PLAIN TEXT (như server.js cũ)
// ============================================================
function ensurePasswordsHashed() {
  const rows = db.prepare("SELECT id, username, password FROM users WHERE password NOT LIKE '$2%'").all();
  const upd = db.prepare('UPDATE users SET password = ? WHERE id = ?');
  for (const row of rows) {
    const hash = bcrypt.hashSync(row.password, 10);
    upd.run(hash, row.id);
    console.log(`🔒 Đã mã hóa mật khẩu cho user "${row.username}"`);
  }
}

// ============================================================
// SEED THƯƠNG HIỆU + SẢN PHẨM KHUYẾN MÃI (từ catalog-seed + premium)
// ============================================================
function ensureProductCatalog() {
  const existing = db.prepare('SELECT name FROM products').all();
  const existingNames = new Set(existing.map(r => r.name));

  // Sản phẩm premium tặng quà
  const PREMIUM = [
    { category_id: 2, name: 'Máy Giặt LG Inverter 16Kg Cửa Trước AI', brand: 'LG', price: 33990000, stock: 8, description: 'Máy giặt cửa trước AI 16Kg, công nghệ Inverter tiết kiệm điện, giặt sạch và bảo vệ sợi vải tối ưu. Sản phẩm cao cấp chính hãng.', image: '/assets/images/products/30-may-giat-lg.webp', icon: 'fa-washer', color: '#c62828', specs: '16Kg, Cửa trước, AI DD, Inverter', rating: 4.9, reviews: 156, sales: 42, gift: 'Tặng 2 bịch bột giặt Ômô 3.3kg' },
    { category_id: 2, name: 'Máy Giặt Samsung Inverter 14Kg Cửa Trước', brand: 'SAMSUNG', price: 28990000, stock: 9, description: 'Máy giặt cửa trước 14Kg Inverter, công nghệ EcoBubble giặt sạch ở nhiệt độ thấp, tiết kiệm điện. Sản phẩm cao cấp chính hãng.', image: '/assets/images/products/02-may-giat-cua-tren-9kg.webp', icon: 'fa-washer', color: '#c62828', specs: '14Kg, Cửa trước, EcoBubble, Inverter', rating: 4.8, reviews: 132, sales: 38, gift: 'Tặng 2 bịch bột giặt Ômô 3.3kg' },
    { category_id: 1, name: 'Tủ Lạnh Samsung Family Hub 4 Cửa 700L', brand: 'SAMSUNG', price: 64900000, stock: 5, description: 'Tủ lạnh Family Hub 4 cửa 700L, màn hình cảm ứng, quản lý thực phẩm thông minh, tươi ngon lâu. Sản phẩm cao cấp chính hãng.', image: '/assets/images/products/01-tu-lanh-inverter-500l.webp', icon: 'fa-snowflake', color: '#1976d2', specs: '700L, 4 cửa, Family Hub, Inverter', rating: 5.0, reviews: 89, sales: 21, gift: 'Tặng bộ hộp đựng thực phẩm Bernon' },
    { category_id: 1, name: 'Tủ Lạnh LG InstaView Door-in-Door 600L', brand: 'LG', price: 52900000, stock: 6, description: 'Tủ lạnh LG InstaView 600L, đập nhẹ hai lần xem bên trong, công nghệ Door-in-Door tiện lợi. Sản phẩm cao cấp chính hãng.', image: '/assets/images/products/25-tu-lanh-panasonic.webp', icon: 'fa-snowflake', color: '#1976d2', specs: '600L, InstaView, Door-in-Door, Inverter', rating: 4.9, reviews: 104, sales: 27, gift: 'Tặng bộ chai lọ gia vị cao cấp' },
    { category_id: 3, name: 'Máy Lạnh Daikin Inverter 3 HP', brand: 'DAIKIN', price: 45900000, stock: 7, description: 'Máy lạnh Daikin Inverter 3 HP, làm lạnh nhanh, lọc khí, vận hành êm ái phù hợp phòng lớn. Sản phẩm cao cấp chính hãng.', image: '/assets/images/products/03-dieu-hoa-12000btu-inverter.webp', icon: 'fa-wind', color: '#2e7d32', specs: '3 HP, Inverter, Lọc khí, R32', rating: 4.9, reviews: 118, sales: 33, gift: 'Tặng bộ vệ sinh máy lạnh chuyên dụng' },
    { category_id: 3, name: 'Máy Lạnh Samsung Inverter 2.5 HP 360', brand: 'SAMSUNG', price: 34900000, stock: 8, description: 'Máy lạnh Samsung 360 2.5 HP, thiết kế tròn hiện đại, làm lạnh nhanh và đều mọi hướng. Sản phẩm cao cấp chính hãng.', image: '/assets/images/products/20-dieu-hoa-samsung.webp', icon: 'fa-wind', color: '#2e7d32', specs: '2.5 HP, 360 Cassette, Inverter', rating: 4.8, reviews: 96, sales: 29, gift: 'Tặng bộ vệ sinh máy lạnh chuyên dụng' }
  ];

  const insertProduct = db.prepare(`INSERT INTO products
    (category_id, name, brand, price, old_price, discount, stock, status, description, image, icon, color, specs, rating, reviews, sales, is_premium, is_hot, gift)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

  for (const p of PREMIUM) {
    if (existingNames.has(p.name)) continue;
    insertProduct.run(p.category_id, p.name, p.brand, p.price, null, 0, p.stock, 'active', p.description, p.image, p.icon, p.color, p.specs, p.rating, p.reviews, p.sales, 1, 1, p.gift);
    existingNames.add(p.name);
  }

  // BRAND_CATALOG_SEED
  for (const product of BRAND_CATALOG_SEED) {
    if (existingNames.has(product.name)) continue;
    insertProduct.run(
      product.categoryId, product.name, product.brand, product.price, product.oldPrice,
      product.discount, product.stock, 'active', product.description, product.image,
      product.icon, product.color, product.specs, product.rating, product.reviews, product.sales, 0, 0, null
    );
    existingNames.add(product.name);
  }

  // Đánh dấu is_premium / is_hot
  db.prepare(`UPDATE products SET is_premium = 1 WHERE is_premium = 0 AND (
      name LIKE '%QLED%' OR name LIKE '%OLED%' OR name LIKE '%OLED AI%'
      OR name LIKE '%French Door%' OR name LIKE '%Side by side%'
      OR name LIKE '%Bếp Từ%' OR name LIKE '%Bình Nóng Lạnh%'
      OR name LIKE '%Máy Rửa Chén%' OR name LIKE '%Máy Lạnh%'
      OR name LIKE '%TV%' OR name LIKE '%Tivi%'
    )`).run();
  db.prepare(`UPDATE products SET is_hot = 1 WHERE is_hot = 0 AND (discount >= 30 OR sales >= 40) AND status = 'active'`).run();

  console.log('✅ Đã đảm bảo thương hiệu và sản phẩm khuyến mãi.');
}

// Đồng bộ catalog model/giá thật đã chốt từ nguồn công khai.
// Upsert theo ID để giữ nguyên liên kết giỏ hàng và chi tiết đơn hàng.
function syncRealProductCatalog() {
  if (!fs.existsSync(REAL_PRODUCTS_PATH)) return false;
  const products = JSON.parse(fs.readFileSync(REAL_PRODUCTS_PATH, 'utf8'));
  if (!Array.isArray(products) || products.length === 0) return false;

  const upsert = db.prepare(`INSERT INTO products
    (id, category_id, name, brand, price, old_price, discount, stock, status, description, image, icon, color, specs, rating, reviews, sales, updated_at)
    VALUES (@id,@categoryId,@name,@brand,@price,@oldPrice,@discount,20,'active',@description,@image,@icon,@color,@specs,4.8,0,0,datetime('now','localtime'))
    ON CONFLICT(id) DO UPDATE SET
      category_id=excluded.category_id, name=excluded.name, brand=excluded.brand,
      price=excluded.price, old_price=excluded.old_price, discount=excluded.discount,
      description=excluded.description, image=excluded.image, icon=excluded.icon, specs=excluded.specs,
      color=excluded.color, status='active', updated_at=datetime('now','localtime')`);
  const icons = { 1: 'fa-snowflake', 2: 'fa-washer', 3: 'fa-wind', 4: 'fa-tv' };
  const colors = { 1: '#1976d2', 2: '#c62828', 3: '#2e7d32', 4: '#e65100' };
  db.transaction(() => {
    db.prepare("UPDATE products SET status = 'inactive' WHERE UPPER(COALESCE(brand, '')) = 'ELECTROLUX'").run();
    for (const product of products) {
      upsert.run({
        ...product,
        oldPrice: product.oldPrice || null,
        description: product.price > 0
          ? `${product.name} chính hãng. Dữ liệu đồng bộ lúc ${product.syncedAt}.`
          : `${product.name} chính hãng. HXY chưa công bố giá; vui lòng liên hệ để được tư vấn.`,
        specs: product.specs || null,
        icon: icons[product.categoryId] || 'fa-box',
        color: colors[product.categoryId] || '#1976d2'
      });
    }
  })();
  console.log(`✅ Đã đồng bộ ${products.length} sản phẩm theo giá thật Gia Khang.`);
  return true;
}

// ============================================================
// KHỞI TẠO
// ============================================================
seedIfEmpty();
ensurePasswordsHashed();
if (!syncRealProductCatalog()) ensureProductCatalog();

module.exports = db;
