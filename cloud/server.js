// ============================================================
// ĐIỆN MÁY NGUYÊN HÙNG - CLOUD BACKEND (SQLite)
// File: cloud/server.js
// Công nghệ: Node.js + Express + SQLite (better-sqlite3) + JWT + bcrypt
// Deploy lên Render/Railway để có API cố định
// ============================================================
const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const db = require('./db');

// ============================================================
// CẤU HÌNH
// ============================================================
const PORT = process.env.PORT || 10000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || (IS_PRODUCTION ? null : 'development-only-change-before-production');

if (IS_PRODUCTION && !JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured when NODE_ENV=production');
}

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  if (IS_PRODUCTION) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
app.use(express.json({ limit: '10mb' }));

// The frontend and API are served from this same application, so no public
// cross-origin access is required. Limit repeated login/registration attempts.
const authAttempts = new Map();
function authRateLimit(req, res, next) {
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 15;
  const entry = authAttempts.get(key);
  if (!entry || now - entry.startedAt >= windowMs) {
    authAttempts.set(key, { startedAt: now, count: 1 });
    return next();
  }
  entry.count += 1;
  if (entry.count > maxAttempts) {
    res.setHeader('Retry-After', String(Math.ceil((windowMs - (now - entry.startedAt)) / 1000)));
    return res.status(429).json({ success: false, message: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.' });
  }
  next();
}

// ============================================================
// HELPER
// ============================================================
function toNumber(value) {
  const n = Number(value);
  return isNaN(n) ? 0 : n;
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

function mapOrderRow(row, items) {
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
    payment_method: row.PaymentMethod || null,
    confirmed_at: row.ConfirmedAt || null,
    confirmed_by: row.ConfirmedBy || null,
    date: row.created_at,
    items: items || []
  };
}

function getOrderItems(orderId) {
  return db.prepare('SELECT product_id, product_name AS name, price, qty, line_total FROM order_items WHERE order_id = ?').all(orderId);
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

function customerRequired(req, res, next) {
  if (req.user?.role !== 'customer') {
    return res.status(403).json({ success: false, message: 'Vui lòng đăng nhập bằng tài khoản khách hàng' });
  }
  next();
}

// ============================================================
// API: AUTH
// ============================================================
app.post('/api/login', authRateLimit, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
    }
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }
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
      user: { id: user.id, username: user.username, fullname: user.fullname, email: user.email, phone: user.phone, role: user.role }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ============================================================
// API: REGISTER
// ============================================================
app.post('/api/register', authRateLimit, async (req, res) => {
  try {
    const { fullname, username, email, phone, password } = req.body;
    if (!fullname || !username || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ họ tên, tên đăng nhập và mật khẩu' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }
    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
    if (exists) {
      return res.status(409).json({ success: false, message: 'Tên đăng nhập đã tồn tại' });
    }
    if (email) {
      const emailExists = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim());
      if (emailExists) {
        return res.status(409).json({ success: false, message: 'Email đã được sử dụng' });
      }
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const info = db.prepare(`INSERT INTO users (fullname, username, email, phone, password, role) VALUES (?,?,?,?,?,?)`)
      .run(fullname.trim(), username.trim(), email ? email.trim() : null, phone ? phone.trim() : null, hashedPassword, 'customer');
    const newUserId = info.lastInsertRowid;
    const token = jwt.sign(
      { id: newUserId, username: username.trim(), role: 'customer' },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công!',
      token,
      user: { id: newUserId, username: username.trim(), fullname: fullname.trim(), email: email ? email.trim() : null, phone: phone ? phone.trim() : null, role: 'customer' }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server khi đăng ký' });
  }
});

// ============================================================
// API: DASHBOARD
// ============================================================
app.get('/api/dashboard', authRequired, adminRequired, (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM products) AS total_products,
        (SELECT COUNT(*) FROM orders) AS total_orders,
        (SELECT COUNT(*) FROM customers) AS total_customers,
        (SELECT COALESCE(SUM(total),0) FROM orders WHERE status <> 'Đã hủy') AS total_revenue
    `).get();

    const recent_orders = db.prepare(`
      SELECT id, order_code, customer_name, item_count, total, status, created_at
      FROM orders
      ORDER BY created_at DESC, id DESC
      LIMIT 5
    `).all();

    const top_products = db.prepare(`
      SELECT product_name, SUM(qty) AS total_qty, SUM(line_total) AS revenue
      FROM order_items
      GROUP BY product_name
      ORDER BY total_qty DESC
      LIMIT 5
    `).all();

    res.json({
      success: true,
      stats: {
        total_products: toNumber(stats.total_products),
        total_orders: toNumber(stats.total_orders),
        total_customers: toNumber(stats.total_customers),
        total_revenue: toNumber(stats.total_revenue)
      },
      recent_orders,
      top_products
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ============================================================
// API: PRODUCTS
// ============================================================
app.get('/api/products', (req, res) => {
  try {
    const { category, brand, search, premium, hot } = req.query;
    let sql = `SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE 1=1`;
    const params = [];
    if (category && category !== 'all') { sql += ' AND c.name = ?'; params.push(category); }
    if (brand && brand !== 'all') { sql += ' AND p.brand = ?'; params.push(brand); }
    if (premium === '1') { sql += ' AND COALESCE(p.is_premium,0) = 1'; }
    if (hot === '1') { sql += ' AND COALESCE(p.is_hot,0) = 1'; }
    if (search) { sql += ' AND (p.name LIKE ? OR p.brand LIKE ? OR CAST(p.id AS TEXT) LIKE ?)'; const s = `%${search}%`; params.push(s, s, s); }
    sql += ' ORDER BY p.id ASC';
    const products = db.prepare(sql).all(...params);
    res.json({ success: true, products: products.map(mapProductRow) });
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.get('/api/products/:id', (req, res) => {
  try {
    const product = db.prepare(`SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = ?`).get(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    res.json({ success: true, product: mapProductRow(product) });
  } catch (err) {
    console.error('Get product error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.post('/api/products', authRequired, adminRequired, (req, res) => {
  try {
    const { name, category_id, price, old_price, discount, stock, status, description, brand, image, icon, color, specs, rating, reviews, sales } = req.body;
    if (!name || !category_id) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin sản phẩm' });
    }
    const info = db.prepare(`INSERT INTO products
      (name, category_id, price, old_price, discount, stock, status, description, brand, image, icon, color, specs, rating, reviews, sales)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(name, category_id, toNumber(price), old_price || null, toNumber(discount), toNumber(stock), status || 'active', description || null, brand || null, image || null, icon || 'fa-box', color || '#1976d2', specs || null, rating || 4.5, toNumber(reviews), toNumber(sales));
    const newId = info.lastInsertRowid;
    const product = db.prepare(`SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = ?`).get(newId);
    res.status(201).json({ success: true, product: mapProductRow(product) });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.put('/api/products/:id', authRequired, adminRequired, (req, res) => {
  try {
    const { name, category_id, price, old_price, discount, stock, status, description, brand, image, icon, color, specs, rating, reviews, sales } = req.body;
    db.prepare(`UPDATE products SET
      name=?, category_id=?, price=?, old_price=?, discount=?, stock=?, status=?, description=?, brand=?, image=?, icon=?, color=?, specs=?, rating=?, reviews=?, sales=?, updated_at=datetime('now','localtime')
      WHERE id=?`)
      .run(name, category_id, toNumber(price), old_price || null, toNumber(discount), toNumber(stock), status || 'active', description || null, brand || null, image || null, icon || 'fa-box', color || '#1976d2', specs || null, rating || 4.5, toNumber(reviews), toNumber(sales), req.params.id);
    const product = db.prepare(`SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = ?`).get(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    res.json({ success: true, product: mapProductRow(product) });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.delete('/api/products/:id', authRequired, adminRequired, (req, res) => {
  try {
    const info = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    if (info.changes === 0) {
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
app.get('/api/categories', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
      FROM categories c
      ORDER BY c.id ASC
    `).all();
    res.json({
      success: true,
      categories: categories.map(r => ({
        id: r.id, name: r.name, description: r.description, icon: r.icon, color: r.color, count: toNumber(r.product_count)
      }))
    });
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.post('/api/categories', authRequired, adminRequired, (req, res) => {
  try {
    const { name, description, icon, color } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Thiếu tên danh mục' });
    const info = db.prepare('INSERT INTO categories (name, description, icon, color) VALUES (?,?,?,?)')
      .run(name, description || null, icon || 'fa-tag', color || '#1976d2');
    res.status(201).json({ success: true, id: info.lastInsertRowid, name, description, icon, color, count: 0 });
  } catch (err) {
    console.error('Create category error:', err);
    if (String(err.message).includes('UNIQUE')) {
      return res.status(400).json({ success: false, message: 'Danh mục đã tồn tại' });
    }
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.put('/api/categories/:id', authRequired, adminRequired, (req, res) => {
  try {
    const { name, description, icon, color } = req.body;
    db.prepare('UPDATE categories SET name=?, description=?, icon=?, color=? WHERE id=?')
      .run(name, description || null, icon || 'fa-tag', color || '#1976d2', req.params.id);
    res.json({ success: true, message: 'Đã cập nhật danh mục' });
  } catch (err) {
    console.error('Update category error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.delete('/api/categories/:id', authRequired, adminRequired, (req, res) => {
  try {
    const cnt = db.prepare('SELECT COUNT(*) AS c FROM products WHERE category_id = ?').get(req.params.id).c;
    if (cnt > 0) {
      return res.status(400).json({ success: false, message: 'Không thể xóa danh mục đang có sản phẩm' });
    }
    db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Đã xóa danh mục' });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ============================================================
// API: ORDERS
// ============================================================
app.get('/api/orders', authRequired, (req, res) => {
  try {
    const { status, search } = req.query;
    let sql = 'SELECT o.* FROM orders o';
    const params = [];
    if (req.user.role !== 'admin') {
      sql += ' INNER JOIN customers c ON o.customer_id = c.id WHERE c.user_id = ?';
      params.push(req.user.id);
    } else {
      sql += ' WHERE 1=1';
    }
    if (status) { sql += ' AND o.status = ?'; params.push(status); }
    if (search) { sql += ' AND (o.order_code LIKE ? OR o.customer_name LIKE ? OR o.phone LIKE ?)'; const s = `%${search}%`; params.push(s, s, s); }
    sql += ' ORDER BY o.created_at DESC, o.id DESC';
    const rows = db.prepare(sql).all(...params);
    const orders = rows.map(r => mapOrderRow(r, getOrderItems(r.id)));
    res.json({ success: true, orders });
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.get('/api/orders/:id', authRequired, (req, res) => {
  try {
    const order = req.user.role === 'admin'
      ? db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)
      : db.prepare('SELECT o.* FROM orders o INNER JOIN customers c ON o.customer_id = c.id WHERE o.id = ? AND c.user_id = ?').get(req.params.id, req.user.id);
    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    res.json({ success: true, order: mapOrderRow(order, getOrderItems(order.id)) });
  } catch (err) {
    console.error('Get order detail error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.post('/api/orders', authRequired, customerRequired, (req, res) => {
  try {
    const { customer_name, phone, email, address, note, payment_method, items } = req.body;
    if (!customer_name || !phone || !address) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin' });
    }
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Giỏ hàng trống' });
    }
    for (const item of items) {
      if (!item.product_id) return res.status(400).json({ success: false, message: 'Sản phẩm không hợp lệ' });
      if (toNumber(item.qty) <= 0) return res.status(400).json({ success: false, message: 'Số lượng sản phẩm phải lớn hơn 0' });
    }

    // Đọc giá thật từ DB
    const getProduct = db.prepare('SELECT id, name, price FROM products WHERE id = ?');
    let itemCount = 0;
    let total = 0;
    const orderItems = [];
    for (const item of items) {
      const real = getProduct.get(item.product_id);
      if (!real) return res.status(400).json({ success: false, message: `Sản phẩm ${item.product_id} không tồn tại` });
      const qty = toNumber(item.qty);
      const lineTotal = toNumber(real.price) * qty;
      itemCount += qty;
      total += lineTotal;
      orderItems.push({ product_id: real.id, name: real.name, price: toNumber(real.price), qty, line_total: lineTotal });
    }

    // Tạo mã đơn duy nhất
    let orderCode = '';
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = 'DH' + String(Math.floor(100000 + Math.random() * 900000));
      const exists = db.prepare('SELECT COUNT(*) AS c FROM orders WHERE order_code = ?').get(candidate).c;
      if (exists === 0) { orderCode = candidate; break; }
    }
    if (!orderCode) return res.status(500).json({ success: false, message: 'Không thể tạo mã đơn hàng, thử lại' });

    // Transaction
    const createOrder = db.transaction(() => {
      // Mỗi đơn của khách phải gắn với chính tài khoản đã đăng nhập.
      let customerId = null;
      const cust = db.prepare('SELECT id FROM customers WHERE user_id = ?').get(req.user.id);
      if (cust) {
        customerId = cust.id;
        db.prepare('UPDATE customers SET name = ?, email = ?, phone = ?, address = ? WHERE id = ?')
          .run(customer_name, email || null, phone, address || null, customerId);
      } else {
        customerId = db.prepare('INSERT INTO customers (name, email, phone, address, user_id) VALUES (?,?,?,?,?)')
          .run(customer_name, email || null, phone, address || null, req.user.id).lastInsertRowid;
      }

      const orderInfo = db.prepare(`INSERT INTO orders
        (order_code, customer_id, customer_name, phone, email, address, note, PaymentMethod, item_count, total, status)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
        .run(orderCode, customerId, customer_name, phone, email || null, address || null, note || null, payment_method || 'COD', itemCount, total, 'Chờ xác nhận');
      const orderId = orderInfo.lastInsertRowid;

      const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, product_name, price, qty, line_total) VALUES (?,?,?,?,?,?)');
      const updSales = db.prepare('UPDATE products SET sales = sales + ? WHERE id = ?');
      for (const item of orderItems) {
        insertItem.run(orderId, item.product_id, item.name, item.price, item.qty, item.line_total);
        updSales.run(item.qty, item.product_id);
      }
      return orderId;
    });

    const orderId = createOrder();

    res.status(201).json({
      success: true,
      orderId: orderId,
      orderCode: orderCode,
      status: 'Chờ xác nhận',
      message: 'Đặt hàng thành công!'
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server khi tạo đơn hàng' });
  }
});

app.post('/api/orders/:id/confirm', authRequired, adminRequired, (req, res) => {
  try {
    const order = db.prepare('SELECT id, status FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    if (order.status !== 'Chờ xác nhận') {
      return res.status(400).json({ success: false, message: 'Đơn hàng không ở trạng thái chờ xác nhận' });
    }
    const adminName = req.user.username || 'Admin';
    const info = db.prepare(`UPDATE orders SET status='Đã xác nhận', ConfirmedAt=datetime('now','localtime'), ConfirmedBy=?, updated_at=datetime('now','localtime') WHERE id=? AND status='Chờ xác nhận'`)
      .run(adminName, req.params.id);
    if (info.changes === 0) {
      return res.status(400).json({ success: false, message: 'Đơn hàng đã được xác nhận trước đó' });
    }
    const updated = db.prepare('SELECT status, ConfirmedAt, ConfirmedBy FROM orders WHERE id = ?').get(req.params.id);
    res.json({
      success: true,
      message: 'Đã xác nhận đơn hàng',
      order_id: req.params.id,
      status: updated.status,
      confirmed_at: updated.ConfirmedAt,
      confirmed_by: updated.ConfirmedBy
    });
  } catch (err) {
    console.error('Confirm order error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.put('/api/orders/:id', authRequired, adminRequired, (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Chờ xác nhận', 'Đã xác nhận', 'Đang giao', 'Đã giao', 'Đã hủy'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
    }
    db.prepare(`UPDATE orders SET status=?, updated_at=datetime('now','localtime') WHERE id=?`).run(status, req.params.id);
    res.json({ success: true, message: 'Đã cập nhật trạng thái đơn hàng' });
  } catch (err) {
    console.error('Update order error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ============================================================
// API: CUSTOMERS
// ============================================================
app.get('/api/customers', authRequired, adminRequired, (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM customers WHERE 1=1';
    const params = [];
    if (search) { sql += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)'; const s = `%${search}%`; params.push(s, s, s); }
    sql += ' ORDER BY id ASC';
    const customers = db.prepare(sql).all(...params);
    res.json({
      success: true,
      customers: customers.map(c => ({ id: c.id, name: c.name, email: c.email, phone: c.phone, address: c.address, regDate: c.reg_date }))
    });
  } catch (err) {
    console.error('Get customers error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ============================================================
// API: SETTINGS
// ============================================================
app.get('/api/settings', (req, res) => {
  try {
    const rows = db.prepare('SELECT setting_key, setting_value FROM settings').all();
    const settings = {};
    rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
    res.json({ success: true, settings });
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.put('/api/settings', authRequired, adminRequired, (req, res) => {
  try {
    const { shopName, shopAddress, shopPhone, shopEmail } = req.body;
    const entries = { shopName, shopAddress, shopPhone, shopEmail };
    const upsert = db.prepare(`
      INSERT INTO settings (setting_key, setting_value, updated_at) VALUES (?,?,datetime('now','localtime'))
      ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value, updated_at=excluded.updated_at
    `);
    for (const [key, value] of Object.entries(entries)) {
      if (value !== undefined) upsert.run(key, value);
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
const WEB_ROOT = path.join(__dirname, 'public');

const staticOptions = { maxAge: IS_PRODUCTION ? '7d' : 0, etag: true };
app.use('/login', express.static(path.join(WEB_ROOT, 'login'), staticOptions));
app.use('/admin', express.static(path.join(WEB_ROOT, 'admin'), staticOptions));
app.use('/customer', express.static(path.join(WEB_ROOT, 'customer'), staticOptions));
app.use('/logo', express.static(path.join(WEB_ROOT, 'logo'), staticOptions));
app.use('/assets', express.static(path.join(WEB_ROOT, 'assets'), staticOptions));
app.use('/img', express.static(path.join(WEB_ROOT, 'img'), staticOptions));

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
function startServer() {
  return app.listen(PORT, '0.0.0.0', () => {
    console.log('==============================================');
    console.log('  🏪 ĐIỆN MÁY NGUYÊN HÙNG - CLOUD SERVER');
    console.log('==============================================');
    console.log(`  🔗 API + Web: http://localhost:${PORT}`);
    console.log(`  📋 Admin:  http://localhost:${PORT}/admin/admin.html`);
    console.log(`  🛒 Khách:  http://localhost:${PORT}/customer/khachhang.html`);
    console.log('==============================================');
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
