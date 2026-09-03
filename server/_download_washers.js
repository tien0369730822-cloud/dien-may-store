// Tải 30 ảnh máy giặt THẬT từ Wikimedia Commons dùng curl.exe (tránh rate-limit của Node)
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const DEST_DIR = path.resolve(__dirname, '..', 'assets', 'images', 'products');
const LIST_FILE = path.join(__dirname, '_washer_image_list.json');

const list = JSON.parse(fs.readFileSync(LIST_FILE, 'utf8'));

const EXCLUDE_TITLES = [
    /pump/i, /media symbols/i, /without front/i, /details/i,
    /1968/i, /1970/i, /wringer/i, /bendix/i, /melbourne museum/i,
    /EFTA/i, /hotel/i, /laundry room/i, /doorway/i, /laundromat/i,
    /water entered/i, /that washing machine has to last/i
];

function isAcceptable(title) {
    return !EXCLUDE_TITLES.some(re => re.test(title));
}

function pickUrls() {
    const prioritized = list.filter(r => isAcceptable(r.title));
    const rest = list.filter(r => !isAcceptable(r.title));
    const chosen = prioritized.slice(0, 30);
    if (chosen.length < 30) {
        for (const r of rest) {
            if (chosen.length >= 30) break;
            if (!chosen.some(c => c.url === r.url)) chosen.push(r);
        }
    }
    return chosen;
}

function cleanUrl(url) {
    try {
        const u = new URL(url);
        u.search = '';
        return u.toString();
    } catch (e) {
        return url;
    }
}

function curlDownload(url, dest, retries = 4) {
    return new Promise((resolve, reject) => {
        const args = ['-s', '-o', dest, '-w', '%{http_code}', '-A',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            '-L', '--max-time', '60', url];
        execFile('curl.exe', args, { timeout: 70000 }, (err, stdout) => {
            const code = (stdout || '').trim();
            if (code === '200') {
                const size = fs.statSync(dest).size;
                if (size < 1000) { reject(new Error('Ảnh quá nhỏ')); return; }
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

async function main() {
    if (!fs.existsSync(DEST_DIR)) fs.mkdirSync(DEST_DIR, { recursive: true });
    const chosen = pickUrls();
    console.log('Sẽ tải ' + chosen.length + ' ảnh.\n');
    let ok = 0;
    for (let i = 0; i < chosen.length; i++) {
        const r = chosen[i];
        const dest = path.join(DEST_DIR, 'real-may-giat-' + String(i + 1).padStart(2, '0') + '.jpg');
        try {
            const clean = cleanUrl(r.url);
            const size = await curlDownload(clean, dest);
            console.log('✔ ' + (i + 1) + '. real-may-giat-' + String(i + 1).padStart(2, '0') + '.jpg (' + (size / 1024).toFixed(0) + 'KB) <- ' + r.title);
            ok++;
        } catch (err) {
            console.error('✘ ' + (i + 1) + '. Lỗi: ' + err.message + ' <- ' + r.title);
        }
        await new Promise(res => setTimeout(res, 2500));
    }
    console.log('\nHoàn tất: ' + ok + '/' + chosen.length + ' ảnh đã tải về ' + DEST_DIR);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

