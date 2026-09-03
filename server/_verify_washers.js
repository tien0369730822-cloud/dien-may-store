// Kiểm tra: 30/30 máy giặt có ảnh JPEG thật, khác nhau, HTTP 200
const http = require('http');

const PORTS = [5000, 3000, 8080, 8000, 4000, 9000];
const WASHER_IDS = [2, 5, 28, 29, 30, 31, 33, 39, 45, 51, 57, 63, 69, 75, 81, 87, 93, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 162, 172];

function httpGet(port, path) {
    return new Promise((resolve) => {
        const req = http.get({ host: 'localhost', port, path, timeout: 8000 }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
        });
        req.on('error', () => resolve(null));
        req.on('timeout', () => { req.destroy(); resolve(null); });
    });
}

async function findServer() {
    for (const port of PORTS) {
        const health = await httpGet(port, '/api/health');
        if (health && health.status === 200) {
            console.log('✅ Server tìm thấy tại port ' + port);
            return port;
        }
    }
    console.log('⚠️ Không tìm thấy server đang chạy (ports: ' + PORTS.join(',') + ')');
    return null;
}

async function main() {
    const port = await findServer();
    if (!port) {
        console.log('\nServer chưa chạy. Khởi động server rồi chạy lại để kiểm tra API.');
        console.log('Có thể chạy: cd web/server && node server.js');
        return;
    }

    // Lấy danh sách sản phẩm
    const prodRes = await httpGet(port, '/api/products');
    let products = [];
    if (prodRes && prodRes.status === 200) {
        try { products = JSON.parse(prodRes.body).products || []; } catch (e) {}
    }
    const washerProducts = products.filter(p => WASHER_IDS.includes(p.id));
    console.log('\nSản phẩm máy giặt từ API: ' + washerProducts.length + '/30');

    // Kiểm tra ảnh khác nhau
    const imageSet = new Set();
    let missingImg = 0;
    for (const p of washerProducts) {
        const img = p.image || '';
        imageSet.add(img);
        if (!img.includes('real-may-giat-')) missingImg++;
    }
    console.log('Số ảnh khác nhau: ' + imageSet.size + '/30');
    console.log('Ảnh không phải ảnh thật (real-may-giat): ' + missingImg);

    // Kiểm tra HTTP 200 cho từng ảnh
    let ok = 0, fail = [];
    for (const img of imageSet) {
        const res = await httpGet(port, img);
        if (res && res.status === 200 && (res.headers['content-type'] || '').includes('jpeg')) {
            ok++;
        } else {
            fail.push(img + ' -> ' + (res ? res.status + '/' + res.headers['content-type'] : 'no-response'));
        }
    }
    console.log('\nẢnh HTTP 200 + JPEG: ' + ok + '/' + imageSet.size);
    if (fail.length) {
        console.log('Lỗi:');
        fail.forEach(f => console.log('  ' + f));
    }
}
main();
