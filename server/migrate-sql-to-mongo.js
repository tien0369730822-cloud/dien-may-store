/**
 * ĐIỆN MÁY NGUYÊN HÙNG
 * Migration SQL Server -> MongoDB Atlas
 */

require('dotenv').config();

const dns = require('dns');
dns.setServers(['8.8.8.8']);

const sql = require('mssql/msnodesqlv8');
const { MongoClient } = require('mongodb');

const SQL_CONFIG = {
    server: process.env.DB_SERVER || 'LAPTOP-31RCR7Q9\\SQLEXPRESS',
    database: process.env.DB_NAME || 'dienmay_nguyenhung',

    driver: 'ODBC Driver 18 for SQL Server',

    options: {
        trustedConnection: true,
        trustServerCertificate: true
    }
};
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'dienmay-nguyenhung';

const TABLES = [
    'users',
    'categories',
    'products',
    'customers',
    'orders',
    'order_items',
    'settings'
];

function normalizeRow(row) {
    const result = {};

    for (const [key, value] of Object.entries(row)) {

        if (value instanceof Date) {
            result[key] = value;
        }
        else if (typeof value === 'bigint') {
            result[key] = Number(value);
        }
        else if (Buffer.isBuffer(value)) {
            result[key] = value.toString();
        }
        else {
            result[key] = value;
        }
    }

    return result;
}

async function readTable(pool, tableName) {

    console.log(`Đang đọc bảng: ${tableName}`);

    const result = await pool
        .request()
        .query(`SELECT * FROM dbo.[${tableName}]`);

    return result.recordset.map(normalizeRow);
}

async function importCollection(db, collectionName, rows) {

    const collection = db.collection(collectionName);

    // Xóa dữ liệu cũ trong MongoDB collection
    await collection.deleteMany({});

    if (rows.length === 0) {
        console.log(`  ${collectionName}: 0 dữ liệu`);
        return 0;
    }

    const BATCH_SIZE = 1000;

    let total = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {

        const batch = rows.slice(i, i + BATCH_SIZE);

        const result = await collection.insertMany(
            batch,
            { ordered: true }
        );

        total += result.insertedCount;
    }

    console.log(
        `  ${collectionName}: ${total} document`
    );

    return total;
}

async function createIndexes(db) {

    console.log('\nĐang tạo MongoDB indexes...');

    try {
        await db.collection('users').createIndex(
            { username: 1 },
            {
                unique: true,
                name: 'username_unique'
            }
        );
    } catch (error) {
        console.log('Không tạo được index users:', error.message);
    }

    try {
        await db.collection('products').createIndex(
            { category_id: 1 },
            {
                name: 'products_category_id'
            }
        );
    } catch (error) {}

    try {
        await db.collection('products').createIndex(
            { brand: 1 },
            {
                name: 'products_brand'
            }
        );
    } catch (error) {}

    try {
        await db.collection('orders').createIndex(
            { order_code: 1 },
            {
                unique: true,
                sparse: true,
                name: 'orders_order_code'
            }
        );
    } catch (error) {}

    try {
        await db.collection('settings').createIndex(
            { setting_key: 1 },
            {
                unique: true,
                sparse: true,
                name: 'settings_key'
            }
        );
    } catch (error) {}

    console.log('✓ Tạo indexes hoàn tất.');
}

async function main() {

    console.log('');
    console.log('==============================================');
    console.log(' ĐIỆN MÁY NGUYÊN HÙNG');
    console.log(' SQL SERVER -> MONGODB ATLAS');
    console.log('==============================================');
    console.log('');

    
    if (!MONGODB_URI) {
        throw new Error(
            'Thiếu MONGODB_URI trong file .env'
        );
    }

    let sqlPool = null;
    let mongoClient = null;

    try {

        // ==========================================
        // 1. SQL SERVER
        // ==========================================

        console.log('[1/4] Đang kết nối SQL Server...');

        sqlPool = await sql.connect(SQL_CONFIG);

        console.log('✓ SQL Server kết nối thành công.');
        console.log('');

        // ==========================================
        // 2. ĐỌC DỮ LIỆU
        // ==========================================

        console.log('[2/4] Đang đọc dữ liệu SQL Server...');
        console.log('');

        const data = {};

        for (const table of TABLES) {

            data[table] =
                await readTable(
                    sqlPool,
                    table
                );

            console.log(
                `✓ ${table}: ${data[table].length} dòng`
            );
        }

        console.log('');

        // ==========================================
        // 3. MONGODB ATLAS
        // ==========================================

        console.log('[3/4] Đang kết nối MongoDB Atlas...');

        mongoClient = new MongoClient(
            MONGODB_URI
        );

        await mongoClient.connect();

        const db =
            mongoClient.db(MONGODB_DB);

        await db.command({
            ping: 1
        });

        console.log(
            `✓ MongoDB Atlas kết nối thành công.`
        );

        console.log(
            `✓ Database: ${MONGODB_DB}`
        );

        console.log('');

        // ==========================================
        // 4. IMPORT
        // ==========================================

        console.log('[4/4] Đang chuyển dữ liệu...');
        console.log('');

        let total = 0;

        for (const table of TABLES) {

            total +=
                await importCollection(
                    db,
                    table,
                    data[table]
                );
        }

        await createIndexes(db);

        console.log('');
        console.log('==============================================');
        console.log(' MIGRATION HOÀN TẤT ✓');
        console.log('==============================================');
        console.log('');

        console.log(
            `Tổng document đã chuyển: ${total}`
        );

        console.log('');

        console.log('Dữ liệu MongoDB:');

        for (const table of TABLES) {

            console.log(
                `  ${table}: ${data[table].length}`
            );
        }

        console.log('');
        console.log(
            'SQL Server vẫn được giữ nguyên.'
        );

        console.log('');
        console.log(
            'Bạn có thể mở MongoDB Atlas để kiểm tra.'
        );

    } catch (error) {

        console.error('');
        console.error(
            '❌ MIGRATION THẤT BẠI'
        );

        console.error(
            'Lỗi:',
            error.message
        );

        if (error.code) {
            console.error(
                'Code:',
                error.code
            );
        }

        process.exitCode = 1;

    } finally {

        if (sqlPool) {

            try {
                await sqlPool.close();
            } catch {}
        }

        if (mongoClient) {

            try {
                await mongoClient.close();
            } catch {}
        }
    }
}

main();