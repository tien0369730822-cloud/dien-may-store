// Script tạm: liệt kê sản phẩm Máy Giặt trong DB kèm ảnh hiện tại
const path = require('path');
const sql = require('mssql');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const DB_CONFIG = {
    server: process.env.DB_SERVER || 'LAPTOP-31RCR7Q9\\SQLEXPRESS',
    port: parseInt(process.env.DB_PORT || '1433', 10),
    database: process.env.DB_NAME || 'dienmay_nguyenhung',
    user: process.env.DB_USER || 'dienmay_user',
    password: process.env.DB_PASSWORD || 'admin123',
    options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true, requestTimeout: 30000 }
};

async function main() {
    const pool = new sql.ConnectionPool(DB_CONFIG);
    try {
        await pool.connect();
        console.log('✅ Kết nối DB thành công\n');
        const result = await pool.request().query(`
            SELECT p.id, p.name, p.brand, p.image, c.name AS category
            FROM products p JOIN categories c ON p.category_id = c.id
            WHERE c.name = N'Máy Giặt' OR p.name LIKE N'%Máy Giặt%'
            ORDER BY p.id ASC
        `);
        console.log(`Tổng sản phẩm máy giặt: ${result.recordset.length}\n`);
        for (const r of result.recordset) {
            console.log(`ID=${r.id} | ${r.brand} | ${r.name} | ${r.image}`);
        }
        const imgCount = await pool.request().query(`
            SELECT image, COUNT(*) AS cnt FROM products
            WHERE name LIKE N'%Máy Giặt%' GROUP BY image
        `);
        console.log('\n--- Nhóm theo ảnh ---');
        for (const r of imgCount.recordset) {
            console.log(`${r.cnt}x | ${r.image}`);
        }
    } catch (err) {
        console.error('Lỗi:', err.message);
    } finally {
        await pool.close();
    }
}
main();

