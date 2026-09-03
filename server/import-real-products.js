const fs = require('fs');
const path = require('path');
const sql = require('mssql');
require('dotenv').config();

const SOURCES = [
    { categoryId: 4, url: 'https://dienmaygiakhang.vn/product-category/dien-tu/tivi/', filterIds: [2432, 2551, 2431, 2550, 2548, 2547, 2545, 2544] },
    { categoryId: 1, url: 'https://dienmaygiakhang.vn/product-category/dien-lanh/tu-lanh/' },
    { categoryId: 3, url: 'https://dienmaygiakhang.vn/product-category/dien-lanh/may-lanh/' },
    { categoryId: 2, url: 'https://dienmaygiakhang.vn/product-category/dien-lanh/may-giat/may-giat-cua-truoc/' },
    { categoryId: 2, url: 'https://dienmaygiakhang.vn/product-category/dien-lanh/may-giat/may-giat-cua-tren/' }
];
const HISENSE_SOURCES = [
    { categoryId: 4, url: 'https://dienmaygiakhang.vn/product-category/dien-tu/tivi/tivi-hisense/' },
    { categoryId: 1, url: 'https://dienmaygiakhang.vn/product-category/dien-lanh/tu-lanh/tu-lanh-hisense/' },
    { categoryId: 2, url: 'https://dienmaygiakhang.vn/product-category/dien-lanh/may-giat/may-giat-hisense/' }
];

const DB_CONFIG = {
    server: process.env.DB_SERVER || 'localhost\\SQLEXPRESS',
    database: process.env.DB_NAME || 'dienmay_nguyenhung',
    user: process.env.DB_USER || 'dienmay_user',
    password: process.env.DB_PASSWORD || 'admin123',
    options: { encrypt: false, trustServerCertificate: true },
    pool: { max: 5, min: 0, idleTimeoutMillis: 30000 }
};

const DEST_DIR = path.resolve(__dirname, '..', 'assets', 'images', 'products', 'gia-khang');
const CATALOG_OUTPUTS = [
    path.resolve(__dirname, 'real-products.json'),
    path.resolve(__dirname, '..', 'cloud', 'real-products.json')
];
// Giữ nguyên ID để không ảnh hưởng khóa ngoại/chi tiết đơn hàng,
// nhưng thay toàn bộ catalog hiện có bằng tên/model và ảnh thật.
const FIRST_PRODUCT_ID = 1;
const LAST_PRODUCT_ID = 180;
const PROMOTION_PRODUCT_COUNT = 40;
const FEATURED_TV_PROMOTION_COUNT = 10;
const TV_BRANDS_WITH_DISCOUNT_CAP = new Set(['SAMSUNG', 'TOSHIBA', 'LG', 'SONY']);
const PROMOTION_BRANDS = ['SAMSUNG', 'LG', 'PANASONIC', 'SONY', 'TOSHIBA', 'SHARP', 'DAIKIN', 'HITACHI', 'HISENSE', 'AQUA'];
const MIN_PROMOTIONS_PER_BRAND = 2;
const EXCLUDED_BRANDS = new Set(['ELECTROLUX']);
const TV_ONLY_MODE = process.argv.includes('--tv-only');
const ADD_HISENSE_MODE = process.argv.includes('--add-hisense');
const ADD_CHOLON_MODE = process.argv.includes('--add-cholon');
const ADD_OTHER_SOURCES_MODE = process.argv.includes('--add-other-sources');
const SYNC_CATALOG_DB_MODE = process.argv.includes('--sync-catalog-db');
const ADD_ALL_HISENSE_MODE = process.argv.includes('--add-all-hisense');
const CHOLON_HISENSE_SITEMAPS = [
    { categoryId: 4, url: 'https://dienmaycholon.com/sitemap/sitemap_tivi.xml' },
    { categoryId: 2, url: 'https://dienmaycholon.com/sitemap/sitemap_may_giat.xml' },
    { categoryId: 1, url: 'https://dienmaycholon.com/sitemap/sitemap_tu_lanh.xml' },
    { categoryId: 3, url: 'https://dienmaycholon.com/sitemap/sitemap_may_lanh.xml' }
];
const CHOLON_HISENSE_PRODUCTS = [
    { categoryId: 4, name: 'Smart Tivi Hisense Full HD 40 Inch 40A4Q', price: 5290000, productUrl: 'https://dienmaycholon.com/tivi/smart-tivi-hisense-full-hd-40-inch-40a4q', specs: '40 inch; Full HD; Smart TV; DTS Virtual:X' },
    { categoryId: 4, name: 'Smart Tivi Hisense QLED 4K 43 Inch 43Q6Q', price: 8490000, productUrl: 'https://dienmaycholon.com/tivi/smart-tivi-hisense-qled-4k-43-inch-43q6q', specs: '43 inch; 4K QLED; Smart TV' },
    { categoryId: 1, name: 'Tủ Lạnh Hisense Inverter 544 Lít RS708N4EBU', price: 11890000, productUrl: 'https://dienmaycholon.com/tu-lanh/tu-lanh-hisense-inverter-544-lit-rs708n4ebu', specs: '544 lít; Inverter; Side by Side' },
    { categoryId: 1, name: 'Tủ Lạnh Hisense Inverter 424 Lít RT549N4EBU', price: 8990000, productUrl: 'https://dienmaycholon.com/tu-lanh/tu-lanh-hisense-inverter-424-lit-rt549n4ebu', specs: '424 lít; Inverter; Làm lạnh đa chiều' },
    { categoryId: 2, name: 'Máy Giặt Hisense 10.5 Kg WT105GE30', price: 3990000, productUrl: 'https://dienmaycholon.com/may-giat/may-giat-hisense-105-kg-wt105ge30', specs: '10.5 kg; Cửa trên; Giặt AI' },
    { categoryId: 2, name: 'Máy Giặt Hisense Inverter 9 Kg WF90N1Y', price: 4490000, productUrl: 'https://dienmaycholon.com/may-giat/may-giat-hisense-inverter-9-kg-wf90n1y', specs: '9 kg; Cửa trước; Inverter Pro; Giặt hơi nước' },
    { categoryId: 3, name: 'Máy Lạnh Hisense 1 HP AS-10CR4RYDDJ02', price: 4490000, productUrl: 'https://dienmaycholon.com/may-lanh/may-lanh-hisense-1-hp-as10cr4ryddj02', specs: '1 HP; Fast Cooling; Bộ lọc HEPA; Gas R32' },
    { categoryId: 3, name: 'Máy Lạnh Hisense 1.5 HP AS-12CR4RVEDJ01', price: 4990000, productUrl: 'https://dienmaycholon.com/may-lanh/may-lanh-hisense-15-hp-as12cr4rvedj01', specs: '1.5 HP; Làm lạnh nhanh; Gas R32' }
].map(product => ({ ...product, brand: 'HISENSE', oldPrice: null, discount: 0 }));
const OTHER_SOURCE_PRODUCTS = [
    { categoryId: 4, name: 'Hikers Smart TV 32 Inch HD HK32A500A', brand: 'HIKERS', price: 3690000, productUrl: 'https://fptshop.com.vn/tivi/hikers-smart-tv-hk-a500?sku=00924762', specs: '32 inch; HD; Android 12; 60 Hz; Điều khiển giọng nói' },
    { categoryId: 4, name: 'Hikers Smart TV 43 Inch Full HD HK43A500FA', brand: 'HIKERS', price: 4690000, productUrl: 'https://fptshop.com.vn/tivi/hikers-smart-tv-hk-a500?sku=00924763', specs: '43 inch; Full HD; Android 12; 60 Hz; Điều khiển giọng nói' },
    { categoryId: 4, name: 'Tivi Thông Minh HXY 50 Inch H50B650UC UHD 4K Smart Coolita', brand: 'HXY', price: 6490000, productUrl: 'https://haiphitech.vn/products/tivi-thong-minh-hxy-h50b650uc-uhd', specs: '50 inch; 4K UHD; Smart Coolita 1.0; Dolby; 1GB + 4GB' },
    { categoryId: 4, name: 'Tivi Thông Minh HXY 55 Inch H55B650UC UHD 4K Smart Coolita', brand: 'HXY', price: 7490000, productUrl: 'https://haiphitech.vn/products/tivi-thong-minh-hxy-h55b650uc-uhd', specs: '55 inch; 4K UHD; Smart Coolita 1.0; Dolby; 1GB + 4GB' },
    { categoryId: 4, name: 'Tivi Thông Minh HXY 70 Inch H70B650UA UHD 4K Android', brand: 'HXY', price: 0, productUrl: 'https://hxyvn.com.vn/tivi-th%C3%B4ng-minh-hxy-70', specs: '70 inch; 4K UHD; Android; Điều khiển giọng nói; Bảo hành chính hãng' }
].map(product => ({ ...product, oldPrice: null, discount: 0 }));
const EXTERNAL_PRODUCTS = [
    { categoryId: 4, name: 'Smart Tivi HIKERS 4K 55 Inch HK55A500UA', brand: 'HIKERS', price: 8990000, imageUrl: 'https://cdn11.dienmaycholon.vn/filewebdmclnew/DMCL21/Picture/Apro/Apro_product_38508/smart-tivi-hikers-4k-55-inch-hk55a500ua-main--845.png', productUrl: 'https://dienmaycholon.com/tivi/smart-tivi-hikers-4k-55-inch-hk55a500ua', specs: '55 inch; 4K UHD; Smart TV; Bảo hành chính hãng' },
    { categoryId: 4, name: 'Smart Tivi HIKERS 4K 65 Inch HK65A500UA', brand: 'HIKERS', price: 10990000, imageUrl: 'https://cdn11.dienmaycholon.vn/filewebdmclnew/DMCL21/Picture/Apro/Apro_product_38509/smart-tivi-hikers-4k-65-inch-hk65a500ua-main--463.png', productUrl: 'https://dienmaycholon.com/tivi/smart-tivi-hikers-4k-65-inch-hk65a500ua', specs: '65 inch; 4K UHD; Smart TV; Bảo hành chính hãng' },
    { categoryId: 4, name: 'Tivi thông minh HXY 32 Inch H32B650C HD Smart Coolita', brand: 'HXY', price: 0, imageUrl: 'https://w.ladicdn.com/s900x800/58a98202b922a2f61a1bc8a8/32-colita-20250221073838-jnu-w.png', productUrl: 'https://www.hxy.com.vn/san-pham', specs: '32 inch; HD; Coolita 1.0; Dolby; Bảo hành 24 tháng' },
    { categoryId: 4, name: 'Tivi thông minh HXY 43 Inch H43B650FC FHD Smart Coolita', brand: 'HXY', price: 0, imageUrl: 'https://w.ladicdn.com/s900x800/58a98202b922a2f61a1bc8a8/43-colita-20250221073838-s96w8.png', productUrl: 'https://www.hxy.com.vn/san-pham', specs: '43 inch; Full HD; Coolita 1.0; Dolby; Bảo hành 24 tháng' },
    { categoryId: 4, name: 'Tivi thông minh HXY 43 Inch H43B650FA FHD Android 14', brand: 'HXY', price: 0, imageUrl: 'https://w.ladicdn.com/s600x600/58a98202b922a2f61a1bc8a8/43-inch-3-20250306081236-edg9-.jpg', productUrl: 'https://www.hxy.com.vn/san-pham', specs: '43 inch; Full HD; Android 14; Dolby; Bảo hành 24 tháng' },
    { categoryId: 4, name: 'Tivi thông minh HXY 50 Inch H50B650UA UHD 4K Android 14', brand: 'HXY', price: 0, imageUrl: 'https://w.ladicdn.com/s900x800/58a98202b922a2f61a1bc8a8/50-androi-20250221073838---bwf.png', productUrl: 'https://www.hxy.com.vn/san-pham', specs: '50 inch; 4K UHD; Android 14; Dolby; Bảo hành 24 tháng' },
    { categoryId: 4, name: 'Tivi thông minh HXY 55 Inch H55B650UA UHD 4K Android 14', brand: 'HXY', price: 0, imageUrl: 'https://w.ladicdn.com/s900x800/58a98202b922a2f61a1bc8a8/55-androi-20250221073838-fihsd.png', productUrl: 'https://www.hxy.com.vn/san-pham', specs: '55 inch; 4K UHD; Android 14; Dolby; Bảo hành 24 tháng' },
    { categoryId: 4, name: 'Tivi thông minh HXY 65 Inch H65B650UA UHD 4K Android 14', brand: 'HXY', price: 0, imageUrl: 'https://w.ladicdn.com/s550x550/58a98202b922a2f61a1bc8a8/65-inch-2-20250306082023--cugd.jpg', productUrl: 'https://www.hxy.com.vn/san-pham', specs: '65 inch; 4K UHD; Android 14; Dolby; Bảo hành 24 tháng' },
    { categoryId: 4, name: 'Tivi thông minh HXY 32 Inch H32B650A HD Android 14', brand: 'HXY', price: 0, imageUrl: 'https://w.ladicdn.com/s600x600/58a98202b922a2f61a1bc8a8/32-inch-4-20250306081716-1-9tj.jpg', productUrl: 'https://www.hxy.com.vn/san-pham', specs: '32 inch; HD; Android 14; Dolby; Bảo hành 24 tháng' }
].map(product => ({ ...product, oldPrice: null, discount: 0 }));

function decodeHtml(value) {
    return value
        .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
        .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
        .replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'")
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ').trim();
}

function slugify(value) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90);
}

function inferBrand(name) {
    const brands = ['SAMSUNG', 'TOSHIBA', 'PANASONIC', 'ELECTROLUX', 'HITACHI', 'HISENSE', 'CASPER', 'DAIKIN', 'SHARP', 'SONY', 'XIAOMI', 'AQUA', 'BOSCH', 'LG', 'TCL'];
    const upper = name.toUpperCase();
    return brands.find(brand => upper.includes(brand)) || 'KHÁC';
}

function isTvOver70Inches(product) {
    if (product.categoryId !== 4) return false;
    const match = product.name.match(/(\d{2,3})\s*(?:inch|inches|\")/i);
    return match ? Number(match[1]) > 70 : false;
}

function parseMoney(value) {
    const amount = Number(String(value || '').replace(/[^0-9]/g, ''));
    return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function extractProducts(html, categoryId) {
    const products = [];
    const pattern = /<a[^>]+href="([^"]*\/san-pham\/[^"]+)"[^>]+aria-label="([^"]+)"[^>]*>\s*<img[^>]+src="(https:\/\/dienmaygiakhang\.vn\/wp-content\/uploads\/[^"]+)"/gi;
    const matches = [...html.matchAll(pattern)];
    for (let index = 0; index < matches.length; index++) {
        const productMatch = matches[index];
        const blockEnd = matches[index + 1]?.index || Math.min(html.length, productMatch.index + 12000);
        const block = html.slice(productMatch.index, blockEnd);

        const name = decodeHtml(productMatch[2]);
        const imageUrl = decodeHtml(productMatch[3]).replace(/-\d+x\d+(?=\.[a-z]+$)/i, '');
        const priceHtml = (block.match(/<span class="price">([\s\S]*?)<\/span>\s*<\/span>/i) || [])[1] || '';
        const oldPrice = parseMoney((priceHtml.match(/<del[\s\S]*?<bdi>([\d,.]+)/i) || [])[1]);
        const salePrice = parseMoney((priceHtml.match(/<ins[\s\S]*?<bdi>([\d,.]+)/i) || [])[1]);
        const onlyPrice = parseMoney((priceHtml.match(/<bdi>([\d,.]+)/i) || [])[1]);
        const price = salePrice || onlyPrice;
        if (!price) continue;

        const discount = oldPrice && oldPrice > price
            ? Math.round((1 - price / oldPrice) * 100)
            : 0;
        products.push({
            categoryId,
            name,
            brand: inferBrand(name),
            productUrl: decodeHtml(productMatch[1]),
            imageUrl,
            price,
            oldPrice: oldPrice && oldPrice > price ? oldPrice : null,
            discount
        });
    }
    return products;
}

function applyPromotionPolicy(products) {
    const eligible = products.filter(product => product.oldPrice && product.discount > 0);
    const balancedPromotions = PROMOTION_BRANDS.flatMap(brand =>
        eligible
            .filter(product => product.brand === brand)
            .sort((a, b) => b.discount - a.discount)
            .slice(0, MIN_PROMOTIONS_PER_BRAND)
    );
    const featuredTvs = eligible
        .filter(product => product.categoryId === 4 && TV_BRANDS_WITH_DISCOUNT_CAP.has(product.brand))
        .sort((a, b) => b.discount - a.discount)
        .slice(0, FEATURED_TV_PROMOTION_COUNT);
    const featuredSet = new Set([...balancedPromotions, ...featuredTvs]);
    const remaining = eligible
        .filter(product => !featuredSet.has(product))
        .sort((a, b) => b.discount - a.discount)
        .slice(0, Math.max(0, PROMOTION_PRODUCT_COUNT - featuredSet.size));
    const promoted = new Set([...featuredSet, ...remaining]);

    for (const product of products) {
        if (!promoted.has(product)) {
            product.oldPrice = null;
            product.discount = 0;
            continue;
        }
        if (product.categoryId === 4 && TV_BRANDS_WITH_DISCOUNT_CAP.has(product.brand) && product.discount > 20) {
            product.discount = 20;
            product.oldPrice = Math.round((product.price / 0.8) / 10000) * 10000;
        }
    }
    return products;
}

async function downloadImage(product, index) {
    const response = await fetch(product.imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${product.imageUrl}`);
    const type = response.headers.get('content-type') || '';
    const ext = type.includes('png') ? '.png' : type.includes('webp') ? '.webp' : '.jpg';
    const filename = `${String(index + 1).padStart(3, '0')}-${slugify(product.name)}${ext}`;
    const destination = path.join(DEST_DIR, filename);
    fs.writeFileSync(destination, Buffer.from(await response.arrayBuffer()));
    return `/assets/images/products/gia-khang/${filename}`;
}

async function readOpenGraphImage(productUrl) {
    const response = await fetch(productUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) throw new Error(`Không đọc được ${productUrl}: HTTP ${response.status}`);
    const html = await response.text();
    const match = html.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)/i)
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/i);
    if (!match) throw new Error(`Không tìm thấy ảnh sản phẩm tại ${productUrl}`);
    return decodeHtml(match[1]);
}

async function readCholonProduct(productUrl, categoryId) {
    const response = await fetch(productUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) return null;
    const html = await response.text();
    if (!/"availability"\s*:\s*"https:\/\/schema\.org\/InStock"/i.test(html)) return null;
    const title = (html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i) || [])[1];
    const imageUrl = (html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i) || [])[1];
    const price = Number((html.match(/"priceCurrency"\s*:\s*"VND"\s*,\s*"price"\s*:\s*"?(\d+)/i) || [])[1]);
    if (!title || !imageUrl || !Number.isFinite(price) || price <= 0) return null;
    const product = {
        categoryId, name: decodeHtml(title), brand: 'HISENSE', price,
        oldPrice: null, discount: 0, imageUrl: decodeHtml(imageUrl), productUrl,
        specs: categoryId === 4 ? 'Smart TV Hisense chính hãng' : null
    };
    return isTvOver70Inches(product) ? null : product;
}

async function main() {
    fs.mkdirSync(DEST_DIR, { recursive: true });

    if (ADD_ALL_HISENSE_MODE) {
        const currentCatalog = JSON.parse(fs.readFileSync(CATALOG_OUTPUTS[0], 'utf8'));
        const existingUrls = new Set(currentCatalog.map(product => String(product.sourceUrl || '').replace(/\/$/, '')));
        const existingModels = new Set(currentCatalog.filter(product => product.brand === 'HISENSE').map(product => {
            const matches = String(product.name).toUpperCase().match(/[A-Z]{0,4}\d+[A-Z0-9-]*/g);
            return matches ? matches[matches.length - 1] : product.name.toUpperCase();
        }));
        const candidates = [];
        for (const sitemap of CHOLON_HISENSE_SITEMAPS) {
            const response = await fetch(sitemap.url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            if (!response.ok) throw new Error(`Không đọc được sitemap ${sitemap.url}: HTTP ${response.status}`);
            const xml = await response.text();
            const urls = [...xml.matchAll(/<loc>([^<]*hisense[^<]*)<\/loc>/gi)].map(match => decodeHtml(match[1]));
            for (const url of urls) candidates.push({ url, categoryId: sitemap.categoryId });
        }
        const found = [];
        for (let offset = 0; offset < candidates.length; offset += 8) {
            const batch = await Promise.all(candidates.slice(offset, offset + 8).map(item => readCholonProduct(item.url, item.categoryId).catch(() => null)));
            found.push(...batch.filter(Boolean));
            console.log(`Đã kiểm tra ${Math.min(offset + 8, candidates.length)}/${candidates.length} trang HISENSE`);
        }
        const additions = found.filter(product => {
            if (existingUrls.has(product.productUrl.replace(/\/$/, ''))) return false;
            const matches = product.name.toUpperCase().match(/[A-Z]{0,4}\d+[A-Z0-9-]*/g);
            const model = matches ? matches[matches.length - 1] : product.name.toUpperCase();
            if (existingModels.has(model)) return false;
            existingModels.add(model);
            return true;
        });
        let nextId = Math.max(...currentCatalog.map(product => product.id)) + 1;
        const syncedAt = new Date().toISOString();
        for (const product of additions) {
            product.id = nextId++;
            product.localImage = await downloadImage(product, product.id - 1);
            console.log(`[${product.id}] ${product.name}`);
        }
        const newRows = additions.map(product => ({
            id: product.id, categoryId: product.categoryId, name: product.name, brand: product.brand,
            price: product.price, oldPrice: null, discount: 0, image: product.localImage,
            sourceUrl: product.productUrl, specs: product.specs, syncedAt
        }));
        const updatedCatalog = [...currentCatalog, ...newRows];
        for (const output of CATALOG_OUTPUTS) fs.writeFileSync(output, `${JSON.stringify(updatedCatalog, null, 2)}\n`, 'utf8');
        console.log(`Hoàn tất catalog: thêm ${additions.length} model HISENSE còn bán và hợp lệ.`);
        return;
    }

    if (SYNC_CATALOG_DB_MODE) {
        const catalog = JSON.parse(fs.readFileSync(CATALOG_OUTPUTS[0], 'utf8'));
        const pool = await sql.connect(DB_CONFIG);
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            for (const product of catalog) {
                await new sql.Request(transaction)
                    .input('id', sql.Int, product.id).input('categoryId', sql.Int, product.categoryId)
                    .input('name', sql.NVarChar(200), product.name).input('brand', sql.NVarChar(60), product.brand)
                    .input('image', sql.NVarChar(500), product.image).input('price', sql.Decimal(18, 2), product.price)
                    .input('oldPrice', sql.Decimal(18, 2), product.oldPrice).input('discount', sql.Int, product.discount || 0)
                    .input('specs', sql.NVarChar(sql.MAX), product.specs || null)
                    .query(`IF EXISTS (SELECT 1 FROM products WHERE id=@id)
                      UPDATE products SET category_id=@categoryId,name=@name,brand=@brand,price=@price,old_price=@oldPrice,
                        discount=@discount,image=@image,specs=@specs,status='active',updated_at=GETDATE() WHERE id=@id
                      ELSE BEGIN
                        SET IDENTITY_INSERT products ON;
                        INSERT INTO products (id,category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
                        VALUES (@id,@categoryId,@name,@brand,@price,@oldPrice,@discount,20,'active',@name + N' chính hãng.',@image,
                        CASE @categoryId WHEN 1 THEN 'fa-snowflake' WHEN 2 THEN 'fa-washer' WHEN 3 THEN 'fa-wind' ELSE 'fa-tv' END,
                        '#1976d2',@specs,4.8,0,0);
                        SET IDENTITY_INSERT products OFF;
                      END`);
            }
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        } finally {
            await pool.close();
        }
        console.log(`Hoàn tất: đã upsert ${catalog.length} sản phẩm từ catalog vào database của API.`);
        return;
    }

    if (ADD_CHOLON_MODE || ADD_OTHER_SOURCES_MODE) {
        const currentCatalog = JSON.parse(fs.readFileSync(CATALOG_OUTPUTS[0], 'utf8'));
        const existingUrls = new Set(currentCatalog.map(product => product.sourceUrl));
        const sourceProducts = ADD_OTHER_SOURCES_MODE ? OTHER_SOURCE_PRODUCTS : CHOLON_HISENSE_PRODUCTS;
        const additions = sourceProducts.filter(product => !existingUrls.has(product.productUrl));
        let nextId = Math.max(...currentCatalog.map(product => product.id)) + 1;
        const syncedAt = new Date().toISOString();
        for (const product of additions) {
            product.id = nextId++;
            product.imageUrl = await readOpenGraphImage(product.productUrl);
            product.localImage = await downloadImage(product, product.id - 1);
            console.log(`[${product.id}] ${product.name}`);
        }
        const newRows = additions.map(product => ({
            id: product.id, categoryId: product.categoryId, name: product.name, brand: product.brand,
            price: product.price, oldPrice: null, discount: 0, image: product.localImage,
            sourceUrl: product.productUrl, specs: product.specs, syncedAt
        }));
        const updatedCatalog = [...currentCatalog, ...newRows];
        for (const output of CATALOG_OUTPUTS) fs.writeFileSync(output, `${JSON.stringify(updatedCatalog, null, 2)}\n`, 'utf8');

        if (additions.length) {
            const pool = await sql.connect(DB_CONFIG);
            const transaction = new sql.Transaction(pool);
            await transaction.begin();
            try {
                for (const product of additions) {
                    await new sql.Request(transaction)
                        .input('id', sql.Int, product.id).input('categoryId', sql.Int, product.categoryId)
                        .input('name', sql.NVarChar(200), product.name).input('brand', sql.NVarChar(60), product.brand)
                        .input('image', sql.NVarChar(500), product.localImage).input('price', sql.Decimal(18, 2), product.price)
                        .input('specs', sql.NVarChar(sql.MAX), product.specs)
                        .query(`SET IDENTITY_INSERT products ON;
                          IF NOT EXISTS (SELECT 1 FROM products WHERE id=@id)
                          INSERT INTO products (id,category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
                          VALUES (@id,@categoryId,@name,@brand,@price,NULL,0,20,'active',@name + N' chính hãng.',@image,
                          CASE @categoryId WHEN 1 THEN 'fa-snowflake' WHEN 2 THEN 'fa-washer' WHEN 3 THEN 'fa-wind' ELSE 'fa-tv' END,
                          CASE @categoryId WHEN 1 THEN '#1976d2' WHEN 2 THEN '#c62828' WHEN 3 THEN '#00897b' ELSE '#e65100' END,@specs,4.8,0,0);
                          SET IDENTITY_INSERT products OFF;`);
                }
                await transaction.commit();
            } catch (error) {
                await transaction.rollback();
                throw error;
            } finally {
                await pool.close();
            }
        }
        console.log(ADD_OTHER_SOURCES_MODE
            ? `Hoàn tất: đã thêm ${additions.length} sản phẩm từ các nguồn đối chiếu khác.`
            : `Hoàn tất: đã thêm ${additions.length} sản phẩm HISENSE từ Điện Máy Chợ Lớn; HIKERS đã đủ 2 mẫu hiện có.`);
        return;
    }
    const collected = [];
    const sourceBuckets = [];
    const seenNames = new Set();
    const seenImages = new Set();

    const activeSources = ADD_HISENSE_MODE ? HISENSE_SOURCES : SOURCES;
    for (const source of activeSources) {
        const products = [];
        const pageUrls = source.filterIds
            ? source.filterIds.map(id => `${source.url}?filtero-kich-thuoc-tivi=${id}`)
            : [source.url];
        for (const pageUrl of pageUrls) {
            const response = await fetch(pageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            if (!response.ok) throw new Error(`Không đọc được ${pageUrl}: HTTP ${response.status}`);
            products.push(...extractProducts(await response.text(), source.categoryId));
        }
        const bucket = [];
        for (const product of products) {
            const nameKey = product.name.toLowerCase();
            if (seenNames.has(nameKey) || seenImages.has(product.imageUrl)) continue;
            seenNames.add(nameKey);
            seenImages.add(product.imageUrl);
            if (!EXCLUDED_BRANDS.has(product.brand) && !isTvOver70Inches(product)) {
                collected.push(product);
                bucket.push(product);
            }
        }
        sourceBuckets.push(bucket);
        console.log(`Đã đọc ${products.length} sản phẩm từ ${source.url}`);
    }

    if (ADD_HISENSE_MODE) {
        const currentCatalog = JSON.parse(fs.readFileSync(CATALOG_OUTPUTS[0], 'utf8'));
        const existingNames = new Set(currentCatalog.map(product => product.name.toLowerCase()));
        const pendingRows = currentCatalog.filter(product => product.id > 189 && product.brand === 'HISENSE');
        const additions = pendingRows.length === 9
            ? pendingRows.map(product => ({ ...product, localImage: product.image, productUrl: product.sourceUrl }))
            : [4, 1, 2].flatMap(categoryId =>
                collected
                    .filter(product => product.brand === 'HISENSE' && product.categoryId === categoryId && !existingNames.has(product.name.toLowerCase()))
                    .slice(0, 3)
            );
        if (additions.length !== 9) throw new Error(`Chỉ tìm được ${additions.length}/9 sản phẩm HISENSE mới.`);

        if (pendingRows.length !== 9) {
            let nextId = Math.max(...currentCatalog.map(product => product.id)) + 1;
            const syncedAt = new Date().toISOString();
            for (const product of additions) {
                product.id = nextId++;
                product.oldPrice = null;
                product.discount = 0;
                product.localImage = await downloadImage(product, product.id - 1);
            }
            const newRows = additions.map(product => ({
                id: product.id, categoryId: product.categoryId, name: product.name, brand: product.brand,
                price: product.price, oldPrice: null, discount: 0, image: product.localImage,
                sourceUrl: product.productUrl, specs: product.specs || null, syncedAt
            }));
            const updatedCatalog = [...currentCatalog, ...newRows];
            for (const output of CATALOG_OUTPUTS) fs.writeFileSync(output, `${JSON.stringify(updatedCatalog, null, 2)}\n`, 'utf8');
        }

        const pool = await sql.connect(DB_CONFIG);
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            for (const product of additions) {
                await new sql.Request(transaction)
                    .input('id', sql.Int, product.id).input('categoryId', sql.Int, product.categoryId)
                    .input('name', sql.NVarChar(200), product.name).input('brand', sql.NVarChar(60), product.brand)
                    .input('image', sql.NVarChar(500), product.localImage).input('price', sql.Decimal(18, 2), product.price)
                    .query(`SET IDENTITY_INSERT products ON;
                      IF NOT EXISTS (SELECT 1 FROM products WHERE id=@id)
                      INSERT INTO products (id,category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,rating,reviews,sales)
                      VALUES (@id,@categoryId,@name,@brand,@price,NULL,0,20,'active',@name + N' chính hãng.',@image,
                      CASE @categoryId WHEN 1 THEN 'fa-snowflake' WHEN 2 THEN 'fa-washer' ELSE 'fa-tv' END,
                      CASE @categoryId WHEN 1 THEN '#1976d2' WHEN 2 THEN '#c62828' ELSE '#e65100' END,4.8,0,0);
                      SET IDENTITY_INSERT products OFF;`);
            }
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        } finally {
            await pool.close();
        }
        console.log('Hoàn tất: đã thêm 3 TV, 3 tủ lạnh và 3 máy giặt HISENSE.');
        return;
    }

    if (TV_ONLY_MODE) {
        const currentCatalog = JSON.parse(fs.readFileSync(CATALOG_OUTPUTS[0], 'utf8'));
        const oversized = currentCatalog.filter(product => isTvOver70Inches(product));
        const retainedNames = new Set(currentCatalog.filter(product => !isTvOver70Inches(product)).map(product => product.name.toLowerCase()));
        const replacements = collected
            .filter(product => product.categoryId === 4 && !isTvOver70Inches(product) && !retainedNames.has(product.name.toLowerCase()))
            .slice(0, oversized.length);
        if (replacements.length !== oversized.length) {
            throw new Error(`Chỉ tìm được ${replacements.length}/${oversized.length} TV từ 70 inch trở xuống để thay thế.`);
        }

        for (let index = 0; index < replacements.length; index++) {
            const previous = oversized[index];
            const product = replacements[index];
            product.id = previous.id;
            if (previous.discount > 0) {
                product.discount = Math.min(product.discount || 20, 20);
                product.oldPrice = Math.round((product.price / (1 - product.discount / 100)) / 10000) * 10000;
            } else {
                product.discount = 0;
                product.oldPrice = null;
            }
            product.localImage = await downloadImage(product, product.id - 1);
        }

        const replacementById = new Map(replacements.map(product => [product.id, product]));
        const syncedAt = new Date().toISOString();
        const updatedCatalog = currentCatalog.map(existing => {
            const product = replacementById.get(existing.id);
            if (!product) return existing;
            return {
                id: existing.id, categoryId: 4, name: product.name, brand: product.brand,
                price: product.price, oldPrice: product.oldPrice, discount: product.discount,
                image: product.localImage, sourceUrl: product.productUrl, specs: product.specs || null, syncedAt
            };
        });
        for (const output of CATALOG_OUTPUTS) fs.writeFileSync(output, `${JSON.stringify(updatedCatalog, null, 2)}\n`, 'utf8');

        const pool = await sql.connect(DB_CONFIG);
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            for (const product of replacements) {
                await new sql.Request(transaction)
                    .input('id', sql.Int, product.id).input('name', sql.NVarChar(200), product.name)
                    .input('brand', sql.NVarChar(60), product.brand).input('image', sql.NVarChar(500), product.localImage)
                    .input('price', sql.Decimal(18, 2), product.price).input('oldPrice', sql.Decimal(18, 2), product.oldPrice)
                    .input('discount', sql.Int, product.discount)
                    .query(`UPDATE products SET category_id=4,name=@name,brand=@brand,image=@image,price=@price,
                      old_price=@oldPrice,discount=@discount,status='active',updated_at=GETDATE() WHERE id=@id`);
            }
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        } finally {
            await pool.close();
        }
        console.log(`Hoàn tất: đã thay đúng ${replacements.length} TV trên 70 inch, không thay đổi nhóm sản phẩm khác.`);
        return;
    }

    const targetCount = LAST_PRODUCT_ID - FIRST_PRODUCT_ID + 1;
    if (collected.length < targetCount) {
        throw new Error(`Chỉ tìm thấy ${collected.length}/${targetCount} sản phẩm có ảnh riêng; dừng để tránh gán ảnh trùng.`);
    }

    const perSource = Math.floor(targetCount / SOURCES.length);
    const selected = sourceBuckets.flatMap(bucket => bucket.slice(0, perSource));
    const selectedNames = new Set(selected.map(product => product.name.toLowerCase()));
    for (const product of collected) {
        if (selected.length >= targetCount) break;
        const key = product.name.toLowerCase();
        if (selectedNames.has(key)) continue;
        selected.push(product);
        selectedNames.add(key);
    }
    if (selected.length !== targetCount) {
        throw new Error(`Không thể chia đều catalog: chọn được ${selected.length}/${targetCount} sản phẩm.`);
    }
    applyPromotionPolicy(selected);
    const catalogProducts = [...selected, ...EXTERNAL_PRODUCTS];
    for (let index = 0; index < catalogProducts.length; index++) {
        catalogProducts[index].localImage = await downloadImage(catalogProducts[index], index);
        console.log(`[${index + 1}/${catalogProducts.length}] ${catalogProducts[index].name}`);
    }

    const syncedAt = new Date().toISOString();
    const catalog = catalogProducts.map((product, index) => ({
        id: FIRST_PRODUCT_ID + index,
        categoryId: product.categoryId,
        name: product.name,
        brand: product.brand,
        price: product.price,
        oldPrice: product.oldPrice,
        discount: product.discount,
        image: product.localImage,
        sourceUrl: product.productUrl,
        specs: product.specs || null,
        syncedAt
    }));
    for (const output of CATALOG_OUTPUTS) {
        fs.writeFileSync(output, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
    }

    const pool = await sql.connect(DB_CONFIG);
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
        for (let index = 0; index < catalogProducts.length; index++) {
            const product = catalogProducts[index];
            const id = FIRST_PRODUCT_ID + index;
            const request = new sql.Request(transaction);
            await request.input('id', sql.Int, id)
                .input('categoryId', sql.Int, product.categoryId)
                .input('name', sql.NVarChar(200), product.name)
                .input('brand', sql.NVarChar(60), product.brand)
                .input('image', sql.NVarChar(500), product.localImage)
                .input('price', sql.Decimal(18, 2), product.price)
                .input('oldPrice', sql.Decimal(18, 2), product.oldPrice)
                .input('discount', sql.Int, product.discount)
                .input('specs', sql.NVarChar(sql.MAX), product.specs || null)
                .input('description', sql.NVarChar(sql.MAX), `${product.name} chính hãng. Hình ảnh sản phẩm thực tế được đối chiếu theo đúng model.`)
                .query(`IF EXISTS (SELECT 1 FROM products WHERE id=@id)
                  UPDATE products SET category_id=@categoryId, name=@name, brand=@brand, image=@image,
                    price=@price, old_price=@oldPrice, discount=@discount,
                    specs=COALESCE(@specs,specs), description=@description, status='active', updated_at=GETDATE() WHERE id=@id
                  ELSE INSERT INTO products (id,category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
                    VALUES (@id,@categoryId,@name,@brand,@price,@oldPrice,@discount,20,'active',@description,@image,'fa-tv','#e65100',@specs,4.8,0,0)`);
        }
        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw error;
    } finally {
        await pool.close();
    }
    console.log(`Hoàn tất: đã đồng bộ ${catalogProducts.length} sản phẩm thật.`);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
