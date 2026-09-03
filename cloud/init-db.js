// ============================================================
// ĐIỆN MÁY NGUYÊN HÙNG - KHỞI TẠO DATABASE SQLite
// File: cloud/init-db.js
// Chạy lần đầu để tạo file data.sqlite và seed dữ liệu mẫu.
// Cách dùng: node init-db.js
// ============================================================
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./db');

console.log('✅ Database SQLite đã sẵn sàng.');
console.log('   Các bảng: users, categories, products, customers, orders, order_items, settings');

// Kiểm tra nhanh
const counts = {
  users: db.prepare('SELECT COUNT(*) AS c FROM users').get().c,
  categories: db.prepare('SELECT COUNT(*) AS c FROM categories').get().c,
  products: db.prepare('SELECT COUNT(*) AS c FROM products').get().c,
  customers: db.prepare('SELECT COUNT(*) AS c FROM customers').get().c,
  orders: db.prepare('SELECT COUNT(*) AS c FROM orders').get().c,
  order_items: db.prepare('SELECT COUNT(*) AS c FROM order_items').get().c,
  settings: db.prepare('SELECT COUNT(*) AS c FROM settings').get().c
};
console.log('   Số dòng dữ liệu:', JSON.stringify(counts));
console.log('   Tài khoản admin: admin / giá trị INITIAL_ADMIN_PASSWORD (hoặc admin123 ở development)');
