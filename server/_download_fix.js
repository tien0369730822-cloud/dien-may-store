// Tải lại 2 ảnh 29, 30 (bị lỗi nhỏ) từ các URL chưa dùng
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const DEST_DIR = path.resolve(__dirname, '..', 'assets', 'images', 'products');

// 2 ảnh thay thế (chưa dùng trong 28 ảnh đã tải) - ảnh máy giặt thật
const FIX = [
    {
        title: 'That washing machine has to last for a long time 8e10762v.jpg',
        url: 'https://upload.wikimedia.org/wikipedia/commons/8/87/That_washing_machine_has_to_last_for_a_long_time_8e10762v.jpg'
    },
    {
        title: 'Water entered a washing machine, Sanyo ASW-B60V(WG) 20060514.jpg',
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Water_entered_a_washing_machine%2C_Sanyo_ASW-B60V%28WG%29_20060514.jpg/960px-Water_entered_a_washing_machine%2C_Sanyo_ASW-B60V%28WG%29_20060514.jpg'
    }
];

function curlDownload(url, dest, retries = 5) {
    return new Promise((resolve, reject) => {
        const args = ['-s', '-o', dest, '-w', '%{http_code}', '-A',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            '-L', '--max-time', '60', url];
        execFile('curl.exe', args, { timeout: 70000 }, (err, stdout) => {
            const code = (stdout || '').trim();
            if (code === '200') {
                const size = fs.statSync(dest).size;
                if (size < 10000) { reject(new Error('Ảnh quá nhỏ: ' + size + 'B')); return; }
                resolve(size);
                return;
            }
            if (retries > 0) {
                const wait = 8000 + Math.floor(Math.random() * 5000);
                console.log('   (' + code + ' - chờ ' + Math.round(wait / 1000) + 's rồi thử lại...)');
                setTimeout(() => curlDownload(url, dest, retries - 1).then(resolve).catch(reject), wait);
            } else {
                reject(new Error('HTTP ' + code + ' hết lượt thử'));
            }
        });
    });
}

(async () => {
    if (!fs.existsSync(DEST_DIR)) fs.mkdirSync(DEST_DIR, { recursive: true });
    for (let i = 0; i < FIX.length; i++) {
        const num = 29 + i;
        const dest = path.join(DEST_DIR, 'real-may-giat-' + String(num).padStart(2, '0') + '.jpg');
        try {
            const size = await curlDownload(FIX[i].url, dest);
            console.log('✔ real-may-giat-' + String(num).padStart(2, '0') + '.jpg (' + (size / 1024).toFixed(0) + 'KB) <- ' + FIX[i].title);
        } catch (err) {
            console.error('✘ real-may-giat-' + String(num).padStart(2, '0') + ': ' + err.message);
        }
    }
    console.log('Xong.');
})();
