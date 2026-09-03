// Thu thập 30 ảnh máy giặt THẬT từ Wikimedia Commons
// Dùng API chính thức, chỉ nhận ảnh JPEG, lọc tiêu đề không phù hợp
const fs = require('fs');
const path = require('path');

const API = 'https://commons.wikimedia.org/w/api.php';
const QUERIES = [
    'front-load washing machine',
    'washing machine front load',
    'front loader washing machine',
    'washing machine laundry room',
    'top-load washing machine',
    'washing machine home appliance',
    'washing machine modern',
    'automatic washing machine',
    'washing machine white',
    'washing machine in bathroom'
];

// Tiêu đề cần loại bỏ (ảnh không phải máy giặt hoàn chỉnh / ảnh minh họa)
const BAD_KEYWORDS = [
    'broken', 'without front', 'hose', 'advert', 'drawing', 'diagram', 'cutaway',
    'interior', 'inside', 'motor', 'schematic', 'icon', 'logo', 'vector', 'cartoon',
    'manual', 'old', 'vintage', '1950', '1960', '1970', '1980', 'maytag 1933',
    'newspaper', 'repair', 'parts', 'spare', 'dust', 'dirty', 'laundromat coin'
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function isGoodResult(title, mime) {
    if (mime !== 'image/jpeg') return false;
    const t = title.toLowerCase();
    if (BAD_KEYWORDS.some(k => t.includes(k))) return false;
    if (!t.includes('washing machine') && !t.includes('washer')) return false;
    return true;
}

async function fetchImages(query) {
    const params = new URLSearchParams({
        action: 'query',
        generator: 'search',
        gsrsearch: query,
        gsrlimit: 20,
        gsrnamespace: '6',
        prop: 'imageinfo',
        iiprop: 'url|size|mime',
        iiurlwidth: '800',
        format: 'json'
    });
    const url = `${API}?${params.toString()}`;
    const res = await fetch(url, {
        headers: { 'User-Agent': 'DienMayNguyenHung/1.0 (product demo image download)' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} cho query "${query}"`);
    const data = await res.json();
    const pages = data.query?.pages || {};
    const results = [];
    for (const p of Object.values(pages)) {
        const ii = p.imageinfo?.[0];
        if (!ii) continue;
        if (isGoodResult(p.title, ii.mime)) {
            results.push({ title: p.title, url: ii.thumburl || ii.url, width: ii.thumbwidth });
        }
    }
    return results;
}

async function main() {
    const all = [];
    const seen = new Set();
    for (const q of QUERIES) {
        try {
            const res = await fetchImages(q);
            console.log(`Query "${q}" -> ${res.length} ảnh phù hợp`);
            for (const r of res) {
                if (!seen.has(r.url)) {
                    seen.add(r.url);
                    all.push(r);
                }
            }
        } catch (err) {
            console.error('Lỗi query:', err.message);
        }
        await sleep(400); // tránh quá tải API
    }
    console.log(`\nTổng ảnh thu được: ${all.length}`);
    const output = path.join(__dirname, '_washer_image_list.json');
    fs.writeFileSync(output, JSON.stringify(all.slice(0, 40), null, 2));
    console.log(`Đã lưu danh sách -> ${output}`);
    for (let i = 0; i < Math.min(all.length, 40); i++) {
        console.log(`${i + 1}. ${all[i].title}`);
        console.log(`   ${all[i].url}`);
    }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

