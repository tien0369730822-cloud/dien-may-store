// Gán 30 ảnh máy giặt THẬT (JPEG) cho 30 sản phẩm máy giặt trong DB theo thứ tự ID
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

// Danh sách ID 30 sản phẩm máy giặt (theo thứ tự tăng dần)
const WASHER_IDS = [2, 5, 28, 29, 30, 31, 33, 39, 45, 51, 57, 63, 69, 75, 81, 87, 93, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 162, 172];

function imagePath(i) {
    return '/assets/images/products/real-may-giat-' + String(i).padStart(2, '0') + '.jpg';
}

async function main() {
    const pool = new sql.ConnectionPool(DB_CONFIG);
    try {
        await pool.connect();
        console.log('✅ Kết nối DB thành công\n');

        // Kiểm tra các ID có tồn tại và là máy giặt
        const ids = WASHER_IDS.join(',');
        const check = await pool.request().query(`
            SELECT p.id, p.name, p.brand, p.image, c.name AS category
            FROM products p JOIN categories c ON p.category_id = c.id
            WHERE p.id IN (${ids})
            ORDER BY p.id ASC
        `);
        console.log('Sản phẩm máy giặt tìm được: ' + check.recordset.length + '/30\n');

        // Cập nhật từng sản phẩm
        let updated = 0;
        for (let idx = 0; idx < WASHER_IDS.length; idx++) {
            const id = WASHER_IDS[idx];
            const img = imagePath(idx + 1);
            const result = await pool.request()
                .input('image', sql.NVarChar, img)
                .input('id', sql.Int, id)
                .query('UPDATE products SET image = @image WHERE id = @id');
            if (result.rowsAffected[0] > 0) {
                updated++;
            }
        }
        console.log('✅ Đã cập nhật ảnh cho ' + updated + '/30 sản phẩm');

        // Xác nhận kết quả
        const verify = await pool.request().query(`
            SELECT p.id, p.name, p.brand, p.image
            FROM products p
            WHERE p.id IN (${ids})
            ORDER BY p.id ASC
        `);
        console.log('\n--- Xác nhận sau khi cập nhật ---');
        for (const r of verify.recordset) {
            console.log('ID=' + r.id + ' | ' + r.brand + ' | ' + r.image);
        }
    } catch (err) {
        console.error('Lỗi:', err.message);
    } finally {
        await pool.close();
    }
}
main();
