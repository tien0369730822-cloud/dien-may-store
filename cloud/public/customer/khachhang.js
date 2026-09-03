// ===== PRODUCT DATA (nạp từ Backend API) =====
let products = [];
const PRODUCT_CORNER_LOGO = '/assets/images/logo-nguyen-hung-product.png';

// Ảnh sản phẩm tương ứng với ID trong bảng products.
// Nếu API chưa có cột image, giao diện vẫn tự lấy ảnh từ danh sách này.
const PRODUCT_IMAGE_MAP = {
    1: '/assets/images/products/01-tu-lanh-inverter-500l.webp',
    2: '/assets/images/products/02-may-giat-cua-tren-9kg.webp',
    3: '/assets/images/products/03-dieu-hoa-12000btu-inverter.webp',
    4: '/assets/images/products/04-tv-smart-4k-55-inch.webp',
    5: '/assets/images/products/05-may-giat-cua-truoc-10kg.webp',
    6: '/assets/images/products/06-tu-lanh-mini-120l.webp',
    7: '/assets/images/products/07-dieu-hoa-9000btu.webp',
    8: '/assets/images/products/08-tv-qled-65-inch-4k.webp',
    9: '/assets/images/products/09-may-nuoc-nong-truc-tiep.webp',
    10: '/assets/images/products/10-bep-tu-doi-cao-cap.webp',
    11: '/assets/images/products/11-may-hut-bui-khong-day.webp',
    12: '/assets/images/products/12-may-nuoc-nong-gian-tiep-30l.webp'
};

const PRODUCT_BRAND_MAP = {
    1: 'SAMSUNG', 2: 'TOSHIBA', 3: 'DAIKIN', 4: 'SONY',
    5: 'LG', 6: 'PANASONIC', 7: 'SHARP', 8: 'SAMSUNG',
9: 'ARISTON', 10: 'HISENSE', 11: 'HXY', 12: 'FERROLI'
};

function inferBrand(product) {
    const fromApi = String(product.brand || '').trim();
    if (fromApi) return fromApi.toUpperCase();
    if (PRODUCT_BRAND_MAP[Number(product.id)]) return PRODUCT_BRAND_MAP[Number(product.id)];
const knownBrands = ['SAMSUNG', 'TOSHIBA', 'PANASONIC', 'HXY', 'HITACHI', 'PHILIPS', 'FERROLI', 'CUCKOO', 'ARISTON', 'DAIKIN', 'SHARP', 'SONY', 'HISENSE', 'AUX', 'LG'];
    const upperName = String(product.name || '').toUpperCase();
    return knownBrands.find(brand => upperName.includes(brand)) || 'KHÁC';
}

// Sửa hai tủ lạnh bị nhập nhầm thành máy lạnh trong dữ liệu cũ.
function normalizeRefrigeratorProduct(product) {
    const name = String(product.name || '');
    const upperName = name.toUpperCase();

    if (upperName.includes('NP-C100R1T36')) {
        return { ...product, name: name.replace(/Máy lạnh tủ đứng/i, 'Tủ lạnh'), category: 'Tủ Lạnh', image: '/assets/images/products/27-tu-lanh-electrolux.webp', specs: 'Dung tích: 500L; Kiểu tủ: Nhiều cửa; Làm lạnh: Đa chiều; Bảo hành: 24 tháng' };
    }
    if (upperName.includes('ZPNQ48GT3A0/ZUAD1')) {
        return { ...product, name: name.replace(/Máy lạnh tủ đứng/i, 'Tủ lạnh'), category: 'Tủ Lạnh', image: '/assets/images/products/25-tu-lanh-panasonic.webp', specs: 'Dung tích: 450L; Công nghệ: Inverter; Kiểu tủ: Nhiều cửa; Bảo hành: 24 tháng' };
    }
    return product;
}

// Nạp danh sách sản phẩm từ API
async function loadProductsFromAPI() {
    try {
        const res = await fetch('/api/products');
        const data = await res.json();
        if (data.success) {
            products = (data.products || []).map(p => normalizeRefrigeratorProduct({
                id: p.id,
                name: p.name,
                category: p.category || '',
                brand: inferBrand(p),
                price: p.price,
                oldPrice: p.old_price,
                discount: p.discount || 0,
                rating: p.rating,
                reviews: p.reviews,
                sales: p.sales || 0,
                icon: p.icon || 'fa-box',
                color: p.color || '#1976d2',
                image: p.image || PRODUCT_IMAGE_MAP[Number(p.id)] || '',
                specs: p.specs || '',
description: p.description || 'Sản phẩm điện máy chính hãng, chất lượng cao, bảo hành đầy đủ. Miễn phí vận chuyển toàn quốc.',
                stock: p.stock,
                status: p.status || 'active',
is_premium: p.is_premium || 0,
                is_hot: p.is_hot || 0,
                gift: p.gift || ''
            }));
            renderAllSections();
        }
    } catch (err) {
        console.error('Load products error:', err);
        showToast('Không thể tải sản phẩm từ máy chủ!', 'error');
    }
}

// Render toàn bộ các section sản phẩm
function renderAllSections() {
    renderProducts();
    renderPremiumSection();
    updateCartUI();
}

// ===== CART STATE =====
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];

// Bộ lọc đang áp dụng (từ thanh thương hiệu hoặc Mega Menu) để giữ nguyên khi
// render lại (vd: sau khi bấm yêu thích). { brand, search, category }
let currentProductFilter = { brand: 'all', search: '', category: '' };

// ===== CUSTOMER AUTH =====
function getCurrentCustomer() {
    try {
        const user = JSON.parse(sessionStorage.getItem('currentUser'));
        return user?.role === 'customer' ? user : null;
    } catch (e) {
        return null;
    }
}

function getCustomerToken() {
    if (!getCurrentCustomer()) return '';
    return localStorage.getItem('customerToken') || localStorage.getItem('token') || '';
}

function isCustomerLoggedIn() {
    return Boolean(getCurrentCustomer() && getCustomerToken());
}

function clearCustomerSession() {
    const customerToken = localStorage.getItem('customerToken');
    if (customerToken && localStorage.getItem('token') === customerToken) {
        localStorage.removeItem('token');
    }
    localStorage.removeItem('customerToken');

    const currentUser = getCurrentCustomer();
    if (currentUser) sessionStorage.removeItem('currentUser');
}

function updateCustomerAuthUI() {
    const user = getCurrentCustomer();
    const accountEl = document.getElementById('customerAccount');
    const logoutEl = document.getElementById('customerLogout');

    if (accountEl) {
        if (user && getCustomerToken()) {
            accountEl.innerHTML = `<i class="fas fa-user"></i> ${escapeHtml(user.fullname || 'Khách Hàng')}`;
            accountEl.href = '#';
        } else {
            accountEl.innerHTML = '<i class="fas fa-sign-in-alt"></i> Đăng nhập';
            accountEl.href = '../login/login.html?redirect=%2Fcustomer%2Fkhachhang.html';
        }
    }
    if (logoutEl) logoutEl.hidden = !user || !getCustomerToken();
}

function showLoginRequired() {
    closeCart();
    closeCheckout();
    document.getElementById('loginRequiredOverlay')?.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLoginRequired() {
    document.getElementById('loginRequiredOverlay')?.classList.remove('active');
    document.body.style.overflow = '';
}

function goToLoginForCheckout() {
    const returnUrl = '/customer/khachhang.html?checkout=1';
    window.location.href = `../login/login.html?reason=checkout&redirect=${encodeURIComponent(returnUrl)}`;
}

// ===== UTILITY FUNCTIONS =====
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function renderStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

// ===== SEARCH TEXT HIGHLIGHT =====
function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function highlightText(text, query) {
    const safe = escapeHtml(text);
    if (!query) return safe;
    const q = query.trim();
    if (!q) return safe;
    const escapedRegex = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return safe.replace(new RegExp('(' + escapedRegex + ')', 'gi'), '<mark>$1</mark>');
}

function getProductVisualHTML(p, imageClass = 'product-photo', iconSize = '4rem') {
    const fallback = `<i class="fas ${p.icon} product-image-fallback" style="color:${p.color};font-size:${iconSize}"></i>`;
    if (!p.image) return fallback;

    return `${fallback}<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" class="${imageClass}" loading="lazy" onerror="this.style.display='none'">`;
}

function getProductCornerLogoHTML(extraClass = '') {
    const className = ['product-corner-logo', extraClass].filter(Boolean).join(' ');
    return `<img src="${PRODUCT_CORNER_LOGO}" alt="Điện Máy Nguyên Hùng" class="${className}" loading="lazy">`;
}

// ===== TOAST =====
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('toast-remove');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== PRODUCT CARD HTML =====
function getProductCardHTML(p) {
    const inCart = cart.find(c => c.id === p.id);
    const inFav = wishlist.includes(p.id);
    const warrantyBadge = p.category === 'Điều Hòa' || p.category === 'Tủ Lạnh' || p.category === 'Máy Giặt' ? 'Bảo hành 2 năm' : 'Bảo hành 12 tháng';
    return `
        <div class="product-card" data-id="${p.id}" role="button" tabindex="0"
             aria-label="Xem chi tiết ${escapeHtml(p.name)}"
             onclick="openProductFromCard(event, ${p.id})"
             onkeydown="openProductFromCardKey(event, ${p.id})">
<div class="product-image">
                ${getProductVisualHTML(p)}
                ${getProductCornerLogoHTML()}
                ${p.discount ? `<span class="product-discount"><span class="product-discount-percent">-${p.discount}%</span><span class="product-discount-tag">GIẢM</span></span>` : ''}
                <span class="product-warranty-badge"><i class="fas fa-shield-alt"></i> ${warrantyBadge}</span>
                <div class="product-actions">
                    <button class="product-action-btn ${inFav ? 'fav-active' : ''}" onclick="toggleWishlist(${p.id})" title="Yêu thích">
                        <i class="fas fa-heart"></i>
                    </button>
                    <button class="product-action-btn" onclick="quickView(${p.id})" title="Xem nhanh">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
            <div class="product-info">
                <div class="product-category">${p.brand} · ${p.category}</div>
                <div class="product-name">${p.name}</div>
                <div class="product-meta">
                    <span><i class="fas fa-tag"></i> ${getSpecificationRows(p.specs)[0].value}</span>
                    <span><i class="fas fa-shopping-bag"></i> Đã bán ${p.sales}</span>
                </div>
                <div class="product-price-row">
                    <span class="current-price">${p.price > 0 ? formatCurrency(p.price) : 'Liên hệ'}</span>
                    ${p.oldPrice ? `<span class="old-price">${formatCurrency(p.oldPrice)}</span>` : ''}
                    ${p.discount ? `<span class="discount-note">-${p.discount}%</span>` : ''}
                </div>
                <div class="product-rating">
                    <span class="stars">${renderStars(p.rating)}</span>
                    <span>${p.rating}</span>
                    <span>(${p.reviews} đánh giá)</span>
                </div>
                <button class="btn-add-cart" onclick="addToCart(${p.id})">
                    <i class="fas fa-shopping-bag"></i>
                    ${inCart ? 'Thêm nữa' : 'Thêm vào giỏ'}
                </button>
            </div>
        </div>
    `;
}

function openProductFromCard(event, productId) {
    if (event.target.closest('button, a, input, select')) return;
    quickView(productId);
}

function openProductFromCardKey(event, productId) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    quickView(productId);
}

// ===== RENDER FEATURED PRODUCTS (filter by brand / category / search) =====
function renderProducts(brand = 'all', search = '', category = '') {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    // Lưu lại bộ lọc hiện tại để giữ nguyên khi render lại (vd: sau khi yêu thích)
    currentProductFilter = { brand: brand || 'all', search: search || '', category: category || '' };
    // Tab "Tất cả ưu đãi" chỉ hiện hàng giảm giá. Khi chọn một hãng,
    // hiện toàn bộ sản phẩm của hãng: ưu đãi trước, giá gốc phía sau.
    let filtered = products.filter(p => p.status !== 'inactive');
    if (brand !== 'all') {
        filtered = filtered.filter(p => p.brand === brand);
    } else {
        filtered = filtered.filter(p => p.discount > 0);
    }
    if (category) {
        const cat = category.toLowerCase();
        filtered = filtered.filter(p =>
            String(p.category || '').toLowerCase() === cat ||
            String(p.category || '').toLowerCase().includes(cat) ||
            String(p.name || '').toLowerCase().includes(cat)
        );
    }
    if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q)
        );
    }
    filtered.sort((a, b) => b.discount - a.discount || a.price - b.price);

    const description = document.getElementById('productFilterDescription');
    if (description) {
        if (category) {
            description.textContent = `Có ${filtered.length} sản phẩm ${category} đang khuyến mãi`;
        } else if (brand === 'all') {
            description.textContent = `Có ${filtered.length} sản phẩm đang khuyến mãi`;
        } else {
            const discountedCount = filtered.filter(p => p.discount > 0).length;
            const regularCount = filtered.length - discountedCount;
            description.textContent = `${filtered.length} sản phẩm ${brand}: ${discountedCount} đang giảm giá, ${regularCount} giá gốc`;
        }
    }
    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-sub)">
                <i class="fas fa-box-open" style="font-size:4rem;margin-bottom:16px;display:block;opacity:0.4"></i>
                <p style="font-size:1.1rem;font-weight:500">Không tìm thấy sản phẩm phù hợp</p>
            </div>
        `;
        return;
    }
grid.innerHTML = filtered.map(p => getProductCardHTML(p)).join('');
}

// ===== SẢN PHẨM CAO CẤP (PREMIUM SECTION) =====
// Danh mục được phép hiển thị trong khu vực "Sản phẩm cao cấp".
// KHÔNG bao gồm: Điện thoại, Tablet, Âm thanh, Loa, Tai nghe, Nội thất, Bàn ghế, Sofa.
const PREMIUM_CATEGORIES = [
    { key: 'hot', label: 'Sản phẩm HOT', category: '', mode: 'hot', icon: 'fa-fire' },
    { key: 'maylanh', label: 'Máy lạnh', category: 'Điều Hòa', mode: 'category', icon: 'fa-wind' },
    { key: 'tivi', label: 'Tivi', category: 'TV', mode: 'category', icon: 'fa-tv' },
    { key: 'tulanh', label: 'Tủ lạnh', category: 'Tủ Lạnh', mode: 'category', icon: 'fa-snowflake' },
    { key: 'giadung', label: 'Gia dụng', category: 'Đồ Gia Dụng', mode: 'category', icon: 'fa-blender' },
    { key: 'maygiat', label: 'Máy giặt', category: 'Máy Giặt', mode: 'category', icon: 'fa-washer' }
];

// Vòng tròn danh mục: ảnh đại diện cho từng mục (dùng ảnh sản phẩm có sẵn).
const PREMIUM_CAT_IMAGES = {
    hot: '/assets/images/products/03-dieu-hoa-12000btu-inverter.webp',
    maylanh: '/assets/images/products/19-dieu-hoa-panasonic.webp',
    tivi: '/assets/images/products/04-tv-smart-4k-55-inch.webp',
    tulanh: '/assets/images/products/01-tu-lanh-inverter-500l.webp',
    giadung: '/assets/images/products/10-bep-tu-doi-cao-cap.webp',
    maygiat: '/assets/images/products/02-may-giat-cua-tren-9kg.webp'
};

// Các từ khóa danh mục BỊ LOẠI BỎ khỏi khu vực Sản phẩm cao cấp.
const PREMIUM_EXCLUDED_KEYWORDS = [
    'điện thoại', 'tablet', 'âm thanh', 'loa', 'tai nghe',
    'nội thất', 'bàn', 'ghế', 'sofa', 'phone', 'smartphone', 'ipad', 'speaker'
];

function isPremiumExcluded(p) {
    const haystack = `${p.category || ''} ${p.name || ''}`.toLowerCase();
    return PREMIUM_EXCLUDED_KEYWORDS.some(k => haystack.includes(k));
}

// Chọn danh mục đang hiển thị trong section cao cấp (mặc định: Sản phẩm HOT).
let activePremiumCategory = 'hot';

function getPremiumProducts(categoryKey) {
    const catDef = PREMIUM_CATEGORIES.find(c => c.key === categoryKey) || PREMIUM_CATEGORIES[0];
    const base = products.filter(p => p.status !== 'inactive' && !isPremiumExcluded(p));

    let list;
    if (catDef.mode === 'category') {
        list = base.filter(p => {
            const pc = String(p.category || '').toLowerCase();
            const target = String(catDef.category).toLowerCase();
            return pc === target || pc.includes(target) || String(p.name).toLowerCase().includes(target);
        });
    } else if (catDef.mode === 'hot') {
        // Sản phẩm HOT: giảm giá mạnh hoặc bán chạy (hoặc được đánh dấu is_hot).
        list = base.filter(p => p.discount >= 20 || p.sales >= 40 || p.is_hot === 1);
        list.sort((a, b) => (b.discount - a.discount) || (b.sales - a.sales));
    }

    // Ưu tiên sản phẩm cao cấp (is_premium) lên đầu, sắp theo giảm giá.
    if (catDef.mode === 'category') {
        list.sort((a, b) => (Number(b.is_premium) - Number(a.is_premium)) || (b.discount - a.discount) || (a.price - b.price));
    }
    return list || [];
}

// Thẻ sản phẩm cao cấp (bố cục riêng theo yêu cầu thiết kế).
function getPremiumProductCardHTML(p) {
    const specs = getSpecificationRows(p.specs)[0].value;
    // Sản phẩm cao cấp không giảm giá -> thay thanh giảm giá bằng dòng quà tặng (gift).
    const promo1 = p.discount ? `GIẢM ĐẾN ${p.discount}%` : 'TRẢ GÓP 0%';
    const promo2 = p.gift ? `KM: ${p.gift}` : 'TRẢ GÓP 0%';
    const inFav = wishlist.includes(p.id);
    return `
        <div class="premium-p-card" data-id="${p.id}" role="button" tabindex="0"
             aria-label="Xem chi tiết ${escapeHtml(p.name)}"
             onclick="openProductFromCard(event, ${p.id})"
             onkeydown="openProductFromCardKey(event, ${p.id})">
<div class="premium-p-top">
                <span class="premium-p-installment"><i class="fas fa-credit-card"></i> Trả góp 0%</span>
                <span class="premium-p-badge"><i class="fas fa-gem"></i> Sản phẩm cao cấp</span>
            </div>
            <div class="premium-p-image">
                ${getProductVisualHTML(p, 'premium-p-photo', '3.4rem')}
                ${getProductCornerLogoHTML('premium-corner-logo')}
                ${p.discount ? `<span class="premium-p-discount">-${p.discount}%</span>` : ''}
                <button class="premium-p-fav ${inFav ? 'fav-active' : ''}" onclick="toggleWishlist(${p.id})" title="Yêu thích">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
            <div class="premium-p-promo">
                <span class="premium-p-promo-item premium-p-promo-main">${promo1}</span>
                <span class="premium-p-promo-item">${promo2}</span>
            </div>
            <div class="premium-p-body">
                <div class="premium-p-cat">${p.brand} · ${p.category}</div>
                <div class="premium-p-name">${p.name}</div>
                <div class="premium-p-spec"><i class="fas fa-tag"></i> ${escapeHtml(specs)}</div>
                <div class="premium-p-price">
                    <span class="premium-p-current">${formatCurrency(p.price)}</span>
                    ${p.oldPrice ? `<span class="premium-p-old">${formatCurrency(p.oldPrice)}</span>` : ''}
                    ${p.discount ? `<span class="premium-p-off">-${p.discount}%</span>` : ''}
                </div>
                <div class="premium-p-rating">
                    <span class="stars">${renderStars(p.rating)}</span> ${p.rating} (${p.reviews})
                </div>
                <button class="premium-p-add" onclick="addToCart(${p.id})">
                    <i class="fas fa-shopping-bag"></i> Thêm vào giỏ
                </button>
            </div>
        </div>
    `;
}

// Render danh sách (carousel) cho danh mục cao cấp đang chọn.
function renderPremiumCarousel() {
    const track = document.getElementById('premiumTrack');
    if (!track) return;
    const list = getPremiumProducts(activePremiumCategory);
    if (list.length === 0) {
        track.innerHTML = `
            <div class="premium-empty">
                <i class="fas fa-box-open"></i>
                <p>Chưa có sản phẩm phù hợp</p>
            </div>
        `;
        return;
    }
    // Hiển thị tối đa 10 sản phẩm để carousel gọn, không tràn.
    track.innerHTML = list.slice(0, 10).map(p => getPremiumProductCardHTML(p)).join('');
}

// Render vòng tròn danh mục + set active.
function renderPremiumCategories() {
    const row = document.getElementById('premiumCats');
    if (!row) return;
    row.innerHTML = PREMIUM_CATEGORIES.map(c => `
        <button type="button" class="premium-cat ${c.key === activePremiumCategory ? 'active' : ''}"
                data-premium-key="${c.key}" onclick="setPremiumCategory('${c.key}')">
            <span class="premium-cat-img">
                <img src="${escapeHtml(PREMIUM_CAT_IMAGES[c.key])}" alt="${escapeHtml(c.label)}" loading="lazy">
                <i class="fas ${c.icon}"></i>
            </span>
            <span class="premium-cat-name">${escapeHtml(c.label)}</span>
        </button>
    `).join('');
}

// Đổi danh mục cao cấp.
function setPremiumCategory(key) {
    activePremiumCategory = key;
    renderPremiumCategories();
    renderPremiumCarousel();
}

// Trượt carousel cao cấp.
function scrollPremium(direction) {
    const scroller = document.getElementById('premiumTrack');
    if (!scroller) return;
    const child = scroller.querySelector('.premium-p-card');
    const step = child ? child.offsetWidth + 12 : 260;
    scroller.scrollBy({ left: direction * step, behavior: 'smooth' });
}

// Render toàn bộ phần cao cấp.
function renderPremiumSection() {
    renderPremiumCategories();
    renderPremiumCarousel();
}

// ===== CART FUNCTIONS =====
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    if (!(product.price > 0)) {
        showToast(`Sản phẩm "${product.name}" chưa công bố giá. Vui lòng liên hệ để được tư vấn.`, 'info');
        return;
    }
    const existing = cart.find(c => c.id === productId);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ id: productId, name: product.name, price: product.price, icon: product.icon, color: product.color, qty: 1 });
    }
    saveCart();
    updateCartUI();
    showToast(`Đã thêm "${product.name}" vào giỏ hàng!`);
}

function removeFromCart(productId) {
    cart = cart.filter(c => c.id !== productId);
    saveCart();
    updateCartUI();
}

function updateQty(productId, delta) {
    const item = cart.find(c => c.id === productId);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
        removeFromCart(productId);
        return;
    }
    saveCart();
    updateCartUI();
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartUI() {
    const count = cart.reduce((sum, c) => sum + c.qty, 0);
    const cartCountEl = document.getElementById('cartCount');
    const cartHeaderCount = document.getElementById('cartHeaderCount');
    if (cartCountEl) cartCountEl.textContent = count;
    if (cartHeaderCount) cartHeaderCount.textContent = count;

    const container = document.getElementById('cartItems');
    const footer = document.getElementById('cartFooter');
    const totalEl = document.getElementById('cartTotal');

    if (cart.length === 0) {
        if (container) {
            container.innerHTML = `
                <div class="cart-empty">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Giỏ hàng của bạn đang trống</p>
                    <button class="btn-continue" id="continueShopping">Tiếp tục mua sắm</button>
                </div>
            `;
            document.getElementById('continueShopping')?.addEventListener('click', closeCart);
        }
        if (footer) footer.style.display = 'none';
        if (totalEl) totalEl.textContent = '0₫';
        return;
    }

    const total = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
    if (totalEl) totalEl.textContent = formatCurrency(total);
    if (footer) footer.style.display = 'block';

    if (container) {
        container.innerHTML = cart.map(c => `
            <div class="cart-item">
                <div class="cart-item-icon">
                    <i class="fas ${c.icon}" style="color:${c.color}"></i>
                </div>
                <div class="cart-item-details">
                    <div class="cart-item-name">${c.name}</div>
                    <div class="cart-item-price">${formatCurrency(c.price)}</div>
                    <div class="cart-item-actions">
                        <button class="qty-btn" onclick="updateQty(${c.id}, -1)"><i class="fas fa-minus"></i></button>
                        <span class="cart-item-qty">${c.qty}</span>
                        <button class="qty-btn" onclick="updateQty(${c.id}, 1)"><i class="fas fa-plus"></i></button>
                        <button class="cart-item-remove" onclick="removeFromCart(${c.id})">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// ===== WISHLIST =====
function toggleWishlist(productId) {
    const idx = wishlist.indexOf(productId);
    if (idx > -1) {
        wishlist.splice(idx, 1);
        showToast('Đã xóa khỏi danh sách yêu thích', 'info');
    } else {
        wishlist.push(productId);
        showToast('Đã thêm vào danh sách yêu thích!');
    }
localStorage.setItem('wishlist', JSON.stringify(wishlist));
    updateWishlistUI();
    // Render lại danh sách giảm giá để cập nhật trạng thái nút yêu thích,
    // giữ nguyên bộ lọc thương hiệu / tìm kiếm / danh mục đang áp dụng.
    renderProducts(currentProductFilter.brand, currentProductFilter.search, currentProductFilter.category);
}

function updateWishlistUI() {
    const el = document.getElementById('wishlistCount');
    if (el) el.textContent = wishlist.length;
}

function getSpecificationRows(specs) {
    const parts = String(specs || '')
        .split(/[;,]/)
        .map(item => item.trim())
        .filter(Boolean);

    if (parts.length === 0) {
        return [{ label: 'Thông tin', value: 'Đang cập nhật' }];
    }

    return parts.map((part, index) => {
        const separator = part.indexOf(':');
        if (separator > 0) {
            return {
                label: part.slice(0, separator).trim(),
                value: part.slice(separator + 1).trim() || 'Đang cập nhật'
            };
        }
        return { label: `Thông số ${index + 1}`, value: part };
    });
}

function getSpecificationHTML(product) {
    return getSpecificationRows(product.specs).map(row => `
        <div class="pm-spec-row">
            <dt>${escapeHtml(row.label)}</dt>
            <dd>${escapeHtml(row.value)}</dd>
        </div>
    `).join('');
}

// ===== QUICK VIEW / PRODUCT DETAIL MODAL =====
function quickView(productId) {
    const p = products.find(pr => pr.id === productId);
    if (!p) return;
    const overlay = document.getElementById('productModalOverlay');
    const body = document.getElementById('productModalBody');
    const inFav = wishlist.includes(p.id);
    const inCart = cart.find(c => c.id === p.id);
    const warrantyBadge = p.category === 'Điều Hòa' || p.category === 'Tủ Lạnh' || p.category === 'Máy Giặt' ? 'Bảo hành 2 năm' : 'Bảo hành 12 tháng';

    body.innerHTML = `
        <div class="pm-visual">
${getProductVisualHTML(p, 'pm-product-photo', '6rem')}
            ${getProductCornerLogoHTML('pm-corner-logo')}
            ${p.discount ? `<span class="pm-discount"><span class="pm-discount-percent">-${p.discount}%</span><span class="pm-discount-tag">GIẢM</span></span>` : ''}
        </div>
        <div class="pm-info">
            <div class="pm-category">${p.brand} · ${p.category}</div>
            <h2 class="pm-name">${p.name}</h2>
            <div class="pm-rating">
                <span class="stars" style="font-size:1.1rem">${renderStars(p.rating)}</span>
                <span>${p.rating} (${p.reviews} đánh giá)</span>
                <span style="margin-left:auto;color:var(--text-sub)">Đã bán ${p.sales}</span>
            </div>
            <div class="pm-price-row">
                <span class="pm-price">${p.price > 0 ? formatCurrency(p.price) : 'Liên hệ'}</span>
                ${p.oldPrice ? `<span class="pm-old-price">${formatCurrency(p.oldPrice)}</span>` : ''}
                ${p.discount ? `<span class="pm-save">Tiết kiệm ${formatCurrency(p.oldPrice - p.price)}</span>` : ''}
            </div>
            <div class="pm-meta">
                <div class="pm-meta-item"><i class="fas fa-microchip"></i> <span>${getSpecificationRows(p.specs)[0].value}</span></div>
                <div class="pm-meta-item"><i class="fas fa-tag"></i> <span>${p.category}</span></div>
                <div class="pm-meta-item"><i class="fas fa-bolt"></i> <span>Tiết kiệm điện</span></div>
                <div class="pm-meta-item"><i class="fas fa-shield-alt"></i> <span>${warrantyBadge}</span></div>
            </div>
            <div class="pm-badges">
                <span class="pm-badge guarantee"><i class="fas fa-shield-alt"></i> ${warrantyBadge}</span>
                <span class="pm-badge installment"><i class="fas fa-credit-card"></i> Trả góp 0%</span>
            </div>
            <p class="pm-desc">${p.description || 'Sản phẩm điện máy chính hãng, chất lượng cao, bảo hành đầy đủ. Miễn phí vận chuyển toàn quốc.'}</p>
            <section class="pm-specs" aria-label="Thông số kỹ thuật sản phẩm">
                <h3><i class="fas fa-list-check"></i> Thông số kỹ thuật</h3>
                <dl class="pm-spec-list">${getSpecificationHTML(p)}</dl>
            </section>
            <div class="pm-actions">
                <button class="pm-add-cart" onclick="addToCartFromModal(${p.id})">
                    <i class="fas fa-shopping-bag"></i> ${inCart ? 'Thêm vào giỏ' : 'Thêm vào giỏ hàng'}
                </button>
                <button class="pm-fav ${inFav ? 'fav-active' : ''}" onclick="toggleWishlist(${p.id}); quickView(${p.id})" title="Yêu thích">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
        </div>
    `;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function addToCartFromModal(productId) {
    addToCart(productId);
    quickView(productId); // refresh modal
}

function closeProductModal() {
    document.getElementById('productModalOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

// ===== CART SIDEBAR =====
function openCart() {
    document.getElementById('cartSidebar').classList.add('active');
    document.getElementById('cartOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    document.getElementById('cartSidebar').classList.remove('active');
    document.getElementById('cartOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

// ===== CHECKOUT =====
function openCheckout() {
    if (cart.length === 0) {
        showToast('Giỏ hàng trống! Vui lòng thêm sản phẩm', 'warning');
        return;
    }
    if (!isCustomerLoggedIn()) {
        showLoginRequired();
        return;
    }
    closeCart();
    const container = document.getElementById('checkoutItems');
    if (container) {
        container.innerHTML = cart.map(c => `
            <div class="checkout-item">
                <span>${c.name} x ${c.qty}</span>
                <span>${formatCurrency(c.price * c.qty)}</span>
            </div>
        `).join('');
    }
    const total = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
    const totalEl = document.getElementById('checkoutTotal');
    if (totalEl) totalEl.textContent = formatCurrency(total);
    document.getElementById('checkoutOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCheckout() {
    document.getElementById('checkoutOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

function submitOrder(e) {
    e.preventDefault();
    if (!isCustomerLoggedIn()) {
        showLoginRequired();
        return;
    }
    const name = document.getElementById('checkoutName').value.trim();
    const phone = document.getElementById('checkoutPhone').value.trim();
    const address = document.getElementById('checkoutAddress').value.trim();
    if (!name || !phone || !address) {
        showToast('Vui lòng điền đầy đủ thông tin', 'error');
        return;
    }

    // Chuẩn bị dữ liệu đơn hàng gửi lên server
    const orderPayload = {
        customer_name: name,
        phone: phone,
        address: address,
        email: document.getElementById('checkoutEmail').value.trim(),
        note: document.getElementById('checkoutNote').value.trim(),
        payment_method: document.getElementById('checkoutPayment').value,
        items: cart.map(c => ({
            product_id: c.id,
            qty: c.qty
        }))
    };

    const submitBtn = document.querySelector('.btn-submit-order');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
    }

    fetch('/api/orders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + getCustomerToken()
        },
        body: JSON.stringify(orderPayload)
    })
    .then(async res => {
        const data = await res.json().catch(() => ({ success: false, message: 'Lỗi phản hồi từ server' }));
        if (res.status === 401 || res.status === 403) {
            clearCustomerSession();
            updateCustomerAuthUI();
            showLoginRequired();
            const authError = new Error('Vui lòng đăng nhập lại để tạo đơn hàng');
            authError.isAuthError = true;
            throw authError;
        }
        if (!res.ok) {
            throw new Error(data.message || 'Lỗi đặt hàng');
        }
        return data;
    })
    .then(data => {
        if (data.success) {
            cart = [];
            saveCart();
            updateCartUI();
            closeCheckout();
            showToast(`🎉 Tạo đơn hàng thành công! Mã đơn: ${data.orderCode}. Chờ Admin xác nhận.`, 'success');
            document.getElementById('checkoutForm').reset();
        } else {
            showToast(data.message || 'Đặt hàng thất bại', 'error');
        }
    })
    .catch(err => {
        if (!err.isAuthError) {
            showToast(err.message || 'Không thể kết nối đến máy chủ!', 'error');
        }
    })
    .finally(() => {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> Tạo Đơn Hàng';
        }
    });
}

// ===== SEARCH SUGGESTIONS & HISTORY =====
const SEARCH_HISTORY_KEY = 'customerSearchHistory';

function getSearchHistory() {
    try { return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY)) || []; } catch (e) { return []; }
}

function saveSearchHistory(history) {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, 8)));
}

function addSearchHistory(query) {
    const q = query.trim();
    if (!q) return;
    let history = getSearchHistory();
    history = history.filter(h => h.toLowerCase() !== q.toLowerCase());
    history.unshift(q);
    saveSearchHistory(history);
}

function clearSearchHistory() {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
    closeSearchDropdown();
}

function renderSearchDropdown() {
    const input = document.getElementById('searchInput');
    const dropdown = document.getElementById('searchDropdown');
    if (!input || !dropdown) return;
    const query = input.value.trim().toLowerCase();
    const history = getSearchHistory();
    let html = '';

    if (query) {
        const matches = products.filter(p =>
            p.discount > 0 && p.status !== 'inactive' && (
                p.name.toLowerCase().includes(query) ||
                p.category.toLowerCase().includes(query) ||
                p.brand.toLowerCase().includes(query)
            )
        ).slice(0, 5);
        if (matches.length > 0) {
            html += '<div class="search-dropdown-section">';
            html += '<div class="search-dropdown-section-title">Gợi ý sản phẩm</div>';
            matches.forEach(p => {
                html += `
                    <div class="search-dropdown-item" data-product-id="${p.id}">
                        <div class="search-dropdown-item-icon product"><i class="fas ${p.icon}"></i></div>
                        <div class="search-dropdown-item-info">
                            <div class="search-dropdown-item-name">${highlightText(p.name, input.value)}</div>
                            <div class="search-dropdown-item-desc">${highlightText(p.brand, input.value)} · ${highlightText(p.category, input.value)} - ${formatCurrency(p.price)}</div>
                        </div>
                        <span class="search-dropdown-item-tag">${p.category}</span>
                    </div>
                `;
            });
            html += '</div>';
        } else {
            html += '<div class="search-dropdown-empty">Không tìm thấy sản phẩm phù hợp</div>';
        }
        const matchedHistory = history.filter(h => h.toLowerCase().includes(query)).slice(0, 3);
        if (matchedHistory.length > 0) {
            html += '<div class="search-dropdown-section">';
            html += '<div class="search-dropdown-section-title">Lịch sử tìm kiếm</div>';
            matchedHistory.forEach(h => {
                html += `
                    <div class="search-dropdown-item" data-history="${h.replace(/"/g, '"')}">
                        <div class="search-dropdown-item-icon history"><i class="fas fa-history"></i></div>
                        <div class="search-dropdown-item-info">
                            <div class="search-dropdown-item-name">${h}</div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }
    } else {
        if (history.length > 0) {
            html += '<div class="search-dropdown-section">';
            html += '<div class="search-dropdown-section-title">Lịch sử tìm kiếm</div>';
            history.forEach(h => {
                html += `
                    <div class="search-dropdown-item" data-history="${h.replace(/"/g, '"')}">
                        <div class="search-dropdown-item-icon history"><i class="fas fa-history"></i></div>
                        <div class="search-dropdown-item-info">
                            <div class="search-dropdown-item-name">${h}</div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            html += '<div class="search-dropdown-history-clear"><button id="clearSearchHistoryBtn">Xóa lịch sử tìm kiếm</button></div>';
        } else {
            html += '<div class="search-dropdown-empty">Gõ để tìm kiếm sản phẩm</div>';
        }
    }
    dropdown.innerHTML = html;
    dropdown.classList.add('active');
}

function closeSearchDropdown() {
    const dropdown = document.getElementById('searchDropdown');
    if (dropdown) dropdown.classList.remove('active');
}

function syncBrandFilters(brand) {
    document.querySelectorAll('.nav-cat').forEach(link => {
        link.classList.toggle('active', link.dataset.brand === brand);
    });
    document.querySelectorAll('.brand-filter-card').forEach(card => {
        card.classList.toggle('active', card.dataset.brand === brand);
    });
}

function performSearch(query) {
    const input = document.getElementById('searchInput');
    if (!input) return;
    input.value = query;
    // Tìm kiếm trên toàn bộ sản phẩm giảm giá, đưa thương hiệu về "Tất cả".
    syncBrandFilters('all');
    addSearchHistory(query);
    renderProducts('all', query);
    closeSearchDropdown();
    document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
}

// ===== MEGA MENU (Danh mục sản phẩm) =====
// 9 danh mục chính. KHÔNG chứa Điện thoại / Tablet.
// Mỗi mục con có thể là: {type:'link', label, icon},
// {type:'product', label, icon, category} (lọc theo danh mục thật từ DB),
// {type:'search', label, icon, query} (dùng từ khóa tìm kiếm).
const MEGA_MENU = [
    {
        id: 'hot',
        name: 'Chương trình Hot',
        icon: 'fa-fire',
        color: '#E31E24',
items: [
            { type: 'search', label: 'Sản phẩm đang giảm giá', icon: 'fa-tags', query: '', image: '/assets/images/products/04-tv-smart-4k-55-inch.webp' },
            { type: 'search', label: 'Giảm giá đến 50%', icon: 'fa-percent', query: 'giảm giá', image: '/assets/images/products/03-dieu-hoa-12000btu-inverter.webp' },
            { type: 'search', label: 'Trả góp 0%', icon: 'fa-credit-card', query: 'trả góp', image: '/assets/images/products/08-tv-qled-65-inch-4k.webp' },
            { type: 'search', label: 'Quà tặng hấp dẫn', icon: 'fa-gift', query: 'quà tặng', image: '/assets/images/products/15-noi-com-dien-cuckoo.webp' },
            { type: 'search', label: 'Sản phẩm mới', icon: 'fa-star', query: 'mới', image: '/assets/images/products/06-tu-lanh-mini-120l.webp' },
            { type: 'search', label: 'Xả kho giá tốt', icon: 'fa-box-open', query: 'xả kho', image: '/assets/images/products/11-may-hut-bui-khong-day.webp' },
            { type: 'search', label: 'Ưu đãi thành viên', icon: 'fa-user-check', query: '', image: '/assets/images/products/07-dieu-hoa-9000btu.webp' },
            { type: 'search', label: 'Miễn phí giao hàng', icon: 'fa-truck', query: '', image: '/assets/images/products/02-may-giat-cua-tren-9kg.webp' }
        ]
    },
    {
        id: 'premium',
        name: 'Sản phẩm cao cấp',
        icon: 'fa-gem',
        color: '#7B1FA2',
items: [
            { type: 'product', label: 'Tivi cao cấp', icon: 'fa-tv', category: 'TV', image: '/assets/images/products/04-tv-smart-4k-55-inch.webp' },
            { type: 'product', label: 'Tủ lạnh cao cấp', icon: 'fa-snowflake', category: 'Tủ Lạnh', image: '/assets/images/products/01-tu-lanh-inverter-500l.webp' },
            { type: 'product', label: 'Máy lạnh cao cấp', icon: 'fa-wind', category: 'Điều Hòa', image: '/assets/images/products/03-dieu-hoa-12000btu-inverter.webp' },
            { type: 'product', label: 'Máy giặt cao cấp', icon: 'fa-washer', category: 'Máy Giặt', image: '/assets/images/products/02-may-giat-cua-tren-9kg.webp' },
            { type: 'product', label: 'Thiết bị nhà bếp cao cấp', icon: 'fa-kitchen-set', category: 'Đồ Gia Dụng', image: '/assets/images/products/10-bep-tu-doi-cao-cap.webp' }
        ]
    },
    {
        id: 'electronics',
        name: 'Điện tử – Điện lạnh',
        icon: 'fa-tv',
        color: '#E65100',
items: [
            { type: 'product', label: 'Tivi', icon: 'fa-tv', category: 'TV', image: '/assets/images/products/04-tv-smart-4k-55-inch.webp' },
            { type: 'product', label: 'Máy lạnh', icon: 'fa-wind', category: 'Điều Hòa', image: '/assets/images/products/03-dieu-hoa-12000btu-inverter.webp' },
            { type: 'product', label: 'Tủ lạnh', icon: 'fa-snowflake', category: 'Tủ Lạnh', image: '/assets/images/products/01-tu-lanh-inverter-500l.webp' },
            { type: 'product', label: 'Máy giặt', icon: 'fa-washer', category: 'Máy Giặt', image: '/assets/images/products/02-may-giat-cua-tren-9kg.webp' },
            { type: 'product', label: 'Máy sấy quần áo', icon: 'fa-wind', category: 'Máy Giặt', image: '/assets/images/products/05-may-giat-cua-truoc-10kg.webp' },
            { type: 'product', label: 'Tủ đông', icon: 'fa-snowflake', category: 'Tủ Lạnh', image: '/assets/images/products/06-tu-lanh-mini-120l.webp' },
            { type: 'product', label: 'Tủ mát', icon: 'fa-snowflake', category: 'Tủ Lạnh', image: '/assets/images/products/25-tu-lanh-panasonic.webp' },
            { type: 'product', label: 'Máy nước nóng', icon: 'fa-hot-tub', category: 'Máy Nước Nóng', image: '/assets/images/products/12-may-nuoc-nong-gian-tiep-30l.webp' }
        ]
    },
    {
        id: 'small-appliance',
        name: 'Điện gia dụng',
        icon: 'fa-blender',
        color: '#00695C',
items: [
            { type: 'product', label: 'Nồi cơm điện', icon: 'fa-bowl-rice', category: 'Đồ Gia Dụng', image: '/assets/images/products/15-noi-com-dien-cuckoo.webp' },
            { type: 'product', label: 'Nồi chiên không dầu', icon: 'fa-kitchen-set', category: 'Đồ Gia Dụng', image: '/assets/images/products/16-noi-chien-khong-dau-ferroli.webp' },
            { type: 'product', label: 'Bếp điện từ', icon: 'fa-fire', category: 'Đồ Gia Dụng', image: '/assets/images/products/10-bep-tu-doi-cao-cap.webp' },
            { type: 'product', label: 'Lò vi sóng', icon: 'fa-fire-burner', category: 'Đồ Gia Dụng', image: '/assets/images/products/10-bep-tu-doi-cao-cap.webp' },
            { type: 'product', label: 'Máy xay sinh tố', icon: 'fa-blender', category: 'Đồ Gia Dụng', image: '/assets/images/products/15-noi-com-dien-cuckoo.webp' },
            { type: 'product', label: 'Máy hút bụi', icon: 'fa-broom', category: 'Đồ Gia Dụng', image: '/assets/images/products/11-may-hut-bui-khong-day.webp' },
            { type: 'product', label: 'Quạt điện', icon: 'fa-fan', category: 'Điều Hòa', image: '/assets/images/products/18-quat-dung-sharp.webp' },
            { type: 'product', label: 'Máy lọc không khí', icon: 'fa-fans', category: 'Đồ Gia Dụng', image: '/assets/images/products/14-may-loc-khong-khi-lg.webp' }
        ]
    },
    {
        id: 'home',
        name: 'Gia dụng',
        icon: 'fa-house-chimney',
        color: '#2E7D32',
items: [
            { type: 'product', label: 'Bình đun siêu tốc', icon: 'fa-mug-hot', category: 'Đồ Gia Dụng', image: '/assets/images/products/15-noi-com-dien-cuckoo.webp' },
            { type: 'product', label: 'Máy lọc nước', icon: 'fa-droplet', category: 'Đồ Gia Dụng', image: '/assets/images/products/14-may-loc-khong-khi-lg.webp' },
            { type: 'product', label: 'Cây nước nóng lạnh', icon: 'fa-faucet-drip', category: 'Đồ Gia Dụng', image: '/assets/images/products/12-may-nuoc-nong-gian-tiep-30l.webp' },
            { type: 'product', label: 'Bàn ủi', icon: 'fa-iron', category: 'Đồ Gia Dụng', image: '/assets/images/products/10-bep-tu-doi-cao-cap.webp' },
            { type: 'product', label: 'Máy sấy tóc', icon: 'fa-wind', category: 'Đồ Gia Dụng', image: '/assets/images/products/17-may-say-toc-philips.webp' },
            { type: 'product', label: 'Đồ dùng nhà bếp', icon: 'fa-utensils', category: 'Đồ Gia Dụng', image: '/assets/images/products/16-noi-chien-khong-dau-ferroli.webp' }
        ]
    },
    {
        id: 'accessory',
        name: 'Phụ kiện',
        icon: 'fa-plug',
        color: '#1976D2',
items: [
            { type: 'search', label: 'Giá treo tivi', icon: 'fa-tv', query: 'giá treo', image: '/assets/images/products/04-tv-smart-4k-55-inch.webp' },
            { type: 'search', label: 'Dây cáp', icon: 'fa-cable-car', query: 'cáp', image: '/assets/images/products/08-tv-qled-65-inch-4k.webp' },
            { type: 'search', label: 'Ổ cắm điện', icon: 'fa-plug', query: 'ổ cắm', image: '/assets/images/products/10-bep-tu-doi-cao-cap.webp' },
            { type: 'search', label: 'Remote', icon: 'fa-remote', query: 'remote', image: '/assets/images/products/04-tv-smart-4k-55-inch.webp' },
            { type: 'product', label: 'Phụ kiện máy lạnh', icon: 'fa-wind', category: 'Điều Hòa', image: '/assets/images/products/03-dieu-hoa-12000btu-inverter.webp' },
            { type: 'product', label: 'Phụ kiện máy giặt', icon: 'fa-washer', category: 'Máy Giặt', image: '/assets/images/products/02-may-giat-cua-tren-9kg.webp' },
            { type: 'product', label: 'Phụ kiện tủ lạnh', icon: 'fa-snowflake', category: 'Tủ Lạnh', image: '/assets/images/products/01-tu-lanh-inverter-500l.webp' }
        ]
    },
    {
        id: 'other',
        name: 'Sản phẩm khác',
        icon: 'fa-box',
        color: '#64748B',
items: [
            { type: 'search', label: 'Các sản phẩm điện máy khác', icon: 'fa-box-open', query: '', image: '/assets/images/products/10-bep-tu-doi-cao-cap.webp' }
        ]
    },
    {
        id: 'furniture',
        name: 'Nội thất',
        icon: 'fa-couch',
        color: '#8D6E63',
        items: [
            { type: 'search', label: 'Bàn', icon: 'fa-table', query: 'bàn', image: '/assets/images/products/10-bep-tu-doi-cao-cap.webp' },
            { type: 'search', label: 'Ghế', icon: 'fa-chair', query: 'ghế', image: '/assets/images/products/16-noi-chien-khong-dau-ferroli.webp' },
            { type: 'search', label: 'Tủ', icon: 'fa-warehouse', query: 'tủ', image: '/assets/images/products/01-tu-lanh-inverter-500l.webp' },
            { type: 'search', label: 'Kệ tivi', icon: 'fa-tv', query: 'kệ', image: '/assets/images/products/04-tv-smart-4k-55-inch.webp' },
            { type: 'search', label: 'Nội thất phòng khách', icon: 'fa-couch', query: 'nội thất', image: '/assets/images/products/08-tv-qled-65-inch-4k.webp' },
            { type: 'search', label: 'Nội thất nhà bếp', icon: 'fa-kitchen-set', query: 'nội thất', image: '/assets/images/products/10-bep-tu-doi-cao-cap.webp' }
        ]
    },
    {
        id: 'consult',
        name: 'Tư vấn – Khuyến mãi',
        icon: 'fa-circle-info',
        color: '#1D4ED8',
        items: [
            { type: 'link', label: 'Tin khuyến mãi', icon: 'fa-bullhorn', image: '/assets/images/products/04-tv-smart-4k-55-inch.webp' },
            { type: 'link', label: 'Tư vấn chọn sản phẩm', icon: 'fa-comments', image: '/assets/images/products/03-dieu-hoa-12000btu-inverter.webp' },
            { type: 'link', label: 'Hướng dẫn sử dụng', icon: 'fa-book-open', image: '/assets/images/products/01-tu-lanh-inverter-500l.webp' },
            { type: 'link', label: 'Chính sách bảo hành', icon: 'fa-shield-halved', image: '/assets/images/products/02-may-giat-cua-tren-9kg.webp' },
            { type: 'link', label: 'Chính sách đổi trả', icon: 'fa-rotate-left', image: '/assets/images/products/06-tu-lanh-mini-120l.webp' },
            { type: 'link', label: 'Liên hệ hỗ trợ', icon: 'fa-headset', image: '/assets/images/products/07-dieu-hoa-9000btu.webp' }
        ]
    }
];

let activeMegaCategory = 'hot';

function getMegaSubItemHTML(item) {
    const icon = item.icon || 'fa-circle';
    const visual = item.image
        ? `<span class="mega-subitem-thumb"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.label)}" loading="lazy"></span>`
        : `<i class="fas ${icon}"></i>`;
    return `<a href="#" class="mega-subitem" data-filter="${escapeHtml(item.category || '')}" data-query="${escapeHtml(item.query || '')}" data-label="${escapeHtml(item.label)}" data-type="${item.type}">
        ${visual}
        <span>${escapeHtml(item.label)}</span>
    </a>`;
}

// ===== CHƯƠNG TRÌNH HOT =====
// Mỗi chương trình khuyến mãi trong menu "Chương trình Hot" sẽ hiển thị
// đúng 6 sản phẩm phù hợp (thay vì tìm kiếm theo từ khóa không có kết quả).
const HOT_PROGRAMS = {
    'Sản phẩm đang giảm giá': { label: 'Sản phẩm đang giảm giá', filter: p => p.discount > 0 },
    'Giảm giá đến 50%': { label: 'Giảm giá đến 50%', filter: p => p.discount >= 40 },
    'Trả góp 0%': { label: 'Trả góp 0%', filter: p => p.price >= 10000000 },
    'Quà tặng hấp dẫn': { label: 'Quà tặng hấp dẫn', filter: p => Boolean(p.gift) },
    'Sản phẩm mới': { label: 'Sản phẩm mới', filter: () => true, isNewest: true },
    'Xả kho giá tốt': { label: 'Xả kho giá tốt', filter: p => p.discount >= 30 || p.price <= 5000000 },
    'Ưu đãi thành viên': { label: 'Ưu đãi thành viên', filter: p => p.discount > 0 },
    'Miễn phí giao hàng': { label: 'Miễn phí giao hàng', filter: p => p.discount > 0 }
};

// Hiển thị đúng 6 sản phẩm cho chương trình khuyến mãi tương ứng.
function renderHotPromo(label) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    const promo = HOT_PROGRAMS[label];
    if (!promo) return;

    currentProductFilter = { brand: 'all', search: promo.label, category: '' };

    let list = products.filter(p => p.status !== 'inactive' && promo.filter(p));
    if (promo.isNewest) {
        list.sort((a, b) => b.id - a.id);
    } else {
        list.sort((a, b) => b.discount - a.discount || b.sales - a.sales);
    }
    list = list.slice(0, 6);

    const description = document.getElementById('productFilterDescription');
    if (description) {
        description.textContent = `Chương trình "${promo.label}" – ${list.length} sản phẩm ưu đãi`;
    }

    if (list.length === 0) {
        grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-sub)">
                <i class="fas fa-box-open" style="font-size:4rem;margin-bottom:16px;display:block;opacity:0.4"></i>
                <p style="font-size:1.1rem;font-weight:500">Không tìm thấy sản phẩm phù hợp</p>
            </div>
        `;
        return;
    }
    grid.innerHTML = list.map(p => getProductCardHTML(p)).join('');
}

function renderMegaSidebar() {
    const sidebar = document.getElementById('megaMenuSidebar');
    if (!sidebar) return;
    sidebar.innerHTML = MEGA_MENU.map(cat => `
        <button type="button" class="mega-cat ${cat.id === activeMegaCategory ? 'active' : ''}" data-mega="${cat.id}" data-name="${escapeHtml(cat.name)}">
            <span class="mega-cat-icon"><i class="fas ${cat.icon}" style="color:${cat.color}"></i></span>
            <span class="mega-cat-name">${escapeHtml(cat.name)}</span>
            <span class="mega-cat-arrow"><i class="fas fa-chevron-right"></i></span>
        </button>
    `).join('');
}

function renderMegaPanel(categoryId) {
    const panel = document.getElementById('megaMenuPanel');
    if (!panel) return;
    const cat = MEGA_MENU.find(c => c.id === categoryId) || MEGA_MENU[0];
    activeMegaCategory = cat.id;
    panel.innerHTML = `
        <div class="mega-panel-head">
            <span class="mega-panel-icon"><i class="fas ${cat.icon}" style="color:${cat.color}"></i></span>
            <h3>${escapeHtml(cat.name)}</h3>
        </div>
        <div class="mega-panel-grid">
            ${cat.items.map(getMegaSubItemHTML).join('')}
        </div>
    `;
    // Đồng bộ trạng thái active ở sidebar
    renderMegaSidebar();
}

function openMegaMenu() {
    const menu = document.getElementById('megaMenu');
    if (menu) {
        menu.classList.add('active');
        menu.setAttribute('aria-hidden', 'false');
    }
    const btn = document.getElementById('categoryBtn');
    if (btn) {
        btn.classList.add('active');
        btn.setAttribute('aria-expanded', 'true');
    }
}

function closeMegaMenu() {
    const menu = document.getElementById('megaMenu');
    if (menu) {
        menu.classList.remove('active');
        menu.setAttribute('aria-hidden', 'true');
    }
    const btn = document.getElementById('categoryBtn');
    if (btn) {
        btn.classList.remove('active');
        btn.setAttribute('aria-expanded', 'false');
    }
}

function toggleMegaMenu() {
    const menu = document.getElementById('megaMenu');
    if (menu && menu.classList.contains('active')) {
        closeMegaMenu();
    } else {
        openMegaMenu();
    }
}

// Chọn danh mục từ menu: lọc sản phẩm thật từ DB và đóng menu.
function selectMegaSubItem(item) {
    const type = item.dataset.type;
    const category = item.dataset.filter || '';
    const query = item.dataset.query || '';
    const label = item.dataset.label || '';

    // Đưa bộ lọc thương hiệu về "Tất cả"
    syncBrandFilters('all');
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';

    if (type === 'link') {
        // Các mục tư vấn / chính sách: cuộn xuống khu vực phù hợp hoặc thông báo.
        showToast('Vui lòng xem thêm thông tin tại khu vực bên dưới.', 'info');
        document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
    } else if (activeMegaCategory === 'hot' && HOT_PROGRAMS[label]) {
        // Chương trình Hot: hiển thị đúng 6 sản phẩm cho chương trình đã chọn.
        renderHotPromo(label);
        document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
    } else {
        // product: lọc theo category; search: lọc theo query
        if (category) {
            renderProducts('all', '', category);
        } else {
            renderProducts('all', query);
        }
        document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
    }

    closeMegaMenu();
    closeMobileMenu();
}

// ===== MOBILE MEGA MENU (drawer + accordion) =====
function renderMobileMenu() {
    const body = document.getElementById('mobileMegaMenuBody');
    if (!body) return;
    body.innerHTML = MEGA_MENU.map(cat => `
        <div class="mobile-mm-group">
            <button type="button" class="mobile-mm-toggle" data-mobile-cat="${cat.id}">
                <span class="mobile-mm-icon"><i class="fas ${cat.icon}" style="color:${cat.color}"></i></span>
                <span class="mobile-mm-name">${escapeHtml(cat.name)}</span>
                <span class="mobile-mm-arrow"><i class="fas fa-chevron-down"></i></span>
            </button>
            <div class="mobile-mm-sub" data-mobile-sub="${cat.id}">
                ${cat.items.map(getMegaSubItemHTML).join('')}
            </div>
        </div>
    `).join('');
}

function openMobileMenu() {
    const drawer = document.getElementById('mobileMegaMenu');
    const overlay = document.getElementById('mobileMenuOverlay');
    if (drawer) {
        drawer.classList.add('active');
        drawer.setAttribute('aria-hidden', 'false');
    }
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
    const drawer = document.getElementById('mobileMegaMenu');
    const overlay = document.getElementById('mobileMenuOverlay');
    if (drawer) {
        drawer.classList.remove('active');
        drawer.setAttribute('aria-hidden', 'true');
    }
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

function initMegaMenu() {
    renderMegaSidebar();
    renderMegaPanel(activeMegaCategory);
    renderMobileMenu();

    // Nút mở menu (desktop & mobile)
    document.getElementById('categoryBtn')?.addEventListener('click', function(e) {
        e.stopPropagation();
        if (window.innerWidth <= 768) {
            openMobileMenu();
        } else {
            toggleMegaMenu();
        }
    });

    // Sidebar: hover/click đổi panel
    document.getElementById('megaMenuSidebar')?.addEventListener('mouseover', function(e) {
        const btn = e.target.closest('.mega-cat');
        if (btn && btn.dataset.mega !== activeMegaCategory) {
            renderMegaPanel(btn.dataset.mega);
        }
    });
    document.getElementById('megaMenuSidebar')?.addEventListener('click', function(e) {
        const btn = e.target.closest('.mega-cat');
        if (btn) {
            renderMegaPanel(btn.dataset.mega);
        }
    });

    // Panel: click mục con
    document.getElementById('megaMenuPanel')?.addEventListener('click', function(e) {
        const item = e.target.closest('.mega-subitem');
        if (item) {
            e.preventDefault();
            selectMegaSubItem(item);
        }
    });

    // Mobile: accordion + click mục con
    document.getElementById('mobileMegaMenuBody')?.addEventListener('click', function(e) {
        const toggle = e.target.closest('.mobile-mm-toggle');
        if (toggle) {
            const cat = toggle.dataset.mobileCat;
            const sub = document.querySelector(`[data-mobile-sub="${cat}"]`);
            const group = toggle.closest('.mobile-mm-group');
            if (sub) sub.classList.toggle('open');
            if (group) group.classList.toggle('open');
            return;
        }
        const item = e.target.closest('.mega-subitem');
        if (item) {
            e.preventDefault();
            selectMegaSubItem(item);
        }
    });

    // Đóng khi bấm ra ngoài (desktop)
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) return;
        const menu = document.getElementById('megaMenu');
        const btn = document.getElementById('categoryBtn');
        if (menu && menu.classList.contains('active') &&
            !e.target.closest('.mega-menu') && !e.target.closest('#categoryBtn')) {
            closeMegaMenu();
        }
    });

    // Nhấn Escape để đóng
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeMegaMenu();
            closeMobileMenu();
        }
    });

    // Đóng drawer mobile
    document.getElementById('mobileMenuClose')?.addEventListener('click', closeMobileMenu);
    document.getElementById('mobileMenuOverlay')?.addEventListener('click', closeMobileMenu);
}

// ===== INITIALIZATION =====
const HOME_HERO_BANNERS = [
    { image: '/assets/images/hero-slider/01-smart-tv-cao-cap.png', eyebrow: 'ĐIỆN MÁY NGUYÊN HƯNG', title: 'SMART TV ĐỈNH CAO GIẢI TRÍ', text: 'Hình ảnh sống động, thiết kế sang trọng, bảo hành chính hãng.', category: 'TV' },
    { image: '/assets/images/hero-slider/02-may-lanh-mat-lanh.png', eyebrow: 'MÁT LẠNH TỨC THÌ', title: 'MÁY LẠNH TIẾT KIỆM ĐIỆN', text: 'Không gian trong lành, vận hành êm ái cho cả gia đình.', category: 'Điều Hòa' },
    { image: '/assets/images/hero-slider/03-tu-lanh-cao-cap.png', eyebrow: 'GIỮ TRỌN TƯƠI NGON', title: 'TỦ LẠNH INVERTER CAO CẤP', text: 'Dung tích lớn, bảo quản tối ưu, nâng tầm căn bếp Việt.', category: 'Tủ Lạnh' },
    { image: '/assets/images/hero-slider/04-may-giat-inverter.png', eyebrow: 'CHĂM SÓC QUẦN ÁO', title: 'MÁY GIẶT INVERTER ÊM ÁI', text: 'Giặt sạch sâu, bảo vệ sợi vải và tiết kiệm điện nước.', category: 'Máy Giặt' },
    { image: '/assets/images/hero-slider/05-may-giat-say.png', eyebrow: 'GIẶT SẤY TOÀN DIỆN', title: 'SẠCH KHÔ NHANH CHÓNG', text: 'Giải pháp giặt sấy hiện đại cho nhịp sống tiện nghi.', category: 'Máy Giặt' },
    { image: '/assets/images/hero-slider/06-cong-nghe-gia-dinh.png', eyebrow: 'CÔNG NGHỆ CHO MỌI NHÀ', title: 'NÂNG TẦM KHÔNG GIAN SỐNG', text: 'Thiết bị hiện đại, đồng bộ và tinh tế trong từng chi tiết.', category: '' },
    { image: '/assets/images/hero-slider/07-tv-gia-tot.png', eyebrow: 'HIKERS · HXY', title: 'TV THÔNG MINH GIÁ DỄ TIẾP CẬN', text: 'Đủ kích thước 32–70 inch, giải trí thuận tiện mỗi ngày.', category: 'TV' },
    { image: '/assets/images/hero-slider/08-gia-dung-nha-bep.png', eyebrow: 'GIA DỤNG TIỆN NGHI', title: 'CĂN BẾP ẤM ÁP, HIỆN ĐẠI', text: 'Thiết bị thiết thực giúp việc nhà nhẹ nhàng hơn.', category: '' },
    { image: '/assets/images/hero-slider/09-giao-hang-lap-dat.png', eyebrow: 'DỊCH VỤ TẬN TÂM', title: 'GIAO HÀNG & LẮP ĐẶT NHANH', text: 'Hỗ trợ chuyên nghiệp, an tâm từ lúc chọn mua đến sử dụng.', category: '' },
    { image: '/assets/images/hero-slider/10-dai-tiec-uu-dai.png', eyebrow: 'ĐẠI TIỆC ĐIỆN MÁY', title: 'ƯU ĐÃI TỐT CHO GIA ĐÌNH', text: 'Khám phá sản phẩm chính hãng với mức giá hấp dẫn.', category: '' }
];

function initHomeHeroSlider() {
    const slider = document.getElementById('homeHeroSlider');
    const slidesHost = document.getElementById('homeHeroSlides');
    const dotsHost = document.getElementById('homeHeroDots');
    if (!slider || !slidesHost || !dotsHost) return;
    slidesHost.innerHTML = HOME_HERO_BANNERS.map((banner, index) => `
        <article class="home-banner-slide${index === 0 ? ' active' : ''}" aria-hidden="${index !== 0}">
            <img src="${banner.image}" alt="${banner.title}" ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}>
            <div class="home-banner-copy">
                <small>${banner.eyebrow}</small><h2>${banner.title}</h2><p>${banner.text}</p>
                <a href="#products-section" data-hero-category="${banner.category}">Xem sản phẩm <i class="fas fa-arrow-right"></i></a>
            </div>
        </article>`).join('');
    dotsHost.innerHTML = HOME_HERO_BANNERS.map((_, index) => `<button type="button" class="home-banner-dot${index === 0 ? ' active' : ''}" data-hero-dot="${index}" aria-label="Xem banner ${index + 1}"></button>`).join('');
    const slides = [...slidesHost.children];
    const dots = [...dotsHost.children];
    let current = 0;
    let timer;
    const show = index => {
        current = (index + slides.length) % slides.length;
        slides.forEach((slide, i) => { slide.classList.toggle('active', i === current); slide.setAttribute('aria-hidden', i !== current); });
        dots.forEach((dot, i) => dot.classList.toggle('active', i === current));
    };
    const start = () => { clearInterval(timer); timer = setInterval(() => show(current + 1), 5000); };
    slider.querySelector('[data-hero-prev]')?.addEventListener('click', () => { show(current - 1); start(); });
    slider.querySelector('[data-hero-next]')?.addEventListener('click', () => { show(current + 1); start(); });
    dots.forEach(dot => dot.addEventListener('click', () => { show(Number(dot.dataset.heroDot)); start(); }));
    slidesHost.addEventListener('click', event => {
        const link = event.target.closest('[data-hero-category]');
        if (!link) return;
        const category = link.dataset.heroCategory;
        if (category) { event.preventDefault(); syncBrandFilters('all'); renderProducts('all', '', category); document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' }); }
    });
    document.addEventListener('visibilitychange', () => document.hidden ? clearInterval(timer) : start());
    start();
}

document.addEventListener('DOMContentLoaded', function() {
    initHomeHeroSlider();
// Trang khách hàng luôn mở cho khách xem sản phẩm; chỉ yêu cầu đăng nhập khi tạo đơn.
    loadProductsFromAPI();
    updateCartUI();
    updateWishlistUI();
updateCustomerAuthUI();
    initMegaMenu();

    // ===== EVENT LISTENERS =====

// "Xem tất cả" trong khu vực Sản phẩm cao cấp: cuộn xuống danh sách khuyến mãi.
    document.getElementById('premiumViewAll')?.addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
    });

    // Nút trượt trái/phải của carousel Sản phẩm cao cấp.
    document.getElementById('premiumPrev')?.addEventListener('click', function() { scrollPremium(-1); });
    document.getElementById('premiumNext')?.addEventListener('click', function() { scrollPremium(1); });

    // Brand navigation
    document.querySelectorAll('.nav-cat').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const brand = this.dataset.brand || 'all';
            syncBrandFilters(brand);
            renderProducts(brand, document.getElementById('searchInput')?.value || '');
            document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
        });
    });

    // Brand filter cards
    document.querySelectorAll('.brand-filter-card').forEach(card => {
        card.addEventListener('click', function() {
            const brand = this.dataset.brand || 'all';
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.value = '';
            syncBrandFilters(brand);
            renderProducts(brand, '');
            document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
        });
    });

    // Search
    const searchInput = document.getElementById('searchInput');
    const searchDropdown = document.getElementById('searchDropdown');

    if (searchInput) {
        searchInput.addEventListener('input', renderSearchDropdown);
        searchInput.addEventListener('focus', function() {
            renderSearchDropdown();
        });
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const query = this.value.trim();
                if (query) performSearch(query);
                else closeSearchDropdown();
            }
        });
    }

    document.getElementById('searchBtn')?.addEventListener('click', function() {
        const query = searchInput?.value?.trim();
        if (query) performSearch(query);
        else closeSearchDropdown();
    });

    if (searchDropdown) {
        searchDropdown.addEventListener('click', function(e) {
            const item = e.target.closest('.search-dropdown-item');
            if (item) {
                if (item.dataset.productId) {
                    const product = products.find(p => p.id == item.dataset.productId);
                    if (product) performSearch(product.name);
                } else if (item.dataset.history) {
                    performSearch(item.dataset.history);
                }
            }
            const clearBtn = e.target.closest('#clearSearchHistoryBtn');
            if (clearBtn) {
                clearSearchHistory();
                renderSearchDropdown();
            }
        });

        document.addEventListener('click', function(e) {
            if (!e.target.closest('.search-wrapper')) {
                closeSearchDropdown();
            }
        });
    }

    // Cart
    document.getElementById('cartBtn')?.addEventListener('click', openCart);
    document.getElementById('cartClose')?.addEventListener('click', closeCart);
    document.getElementById('cartOverlay')?.addEventListener('click', closeCart);

    // Checkout
    document.getElementById('checkoutBtn')?.addEventListener('click', openCheckout);
    document.getElementById('checkoutClose')?.addEventListener('click', closeCheckout);
    document.getElementById('checkoutOverlay')?.addEventListener('click', function(e) {
        if (e.target === this) closeCheckout();
    });
    document.getElementById('checkoutForm')?.addEventListener('submit', submitOrder);

    // Continue shopping
    document.addEventListener('click', function(e) {
        if (e.target.id === 'continueShopping') closeCart();
    });

    // Product modal close
    document.getElementById('productModalClose')?.addEventListener('click', closeProductModal);
    document.getElementById('productModalOverlay')?.addEventListener('click', function(e) {
        if (e.target === this) closeProductModal();
    });

    // Account / Logout
    const user = getCurrentCustomer();
    const accountEl = document.getElementById('customerAccount');
    accountEl?.addEventListener('click', function(e) {
        if (isCustomerLoggedIn()) e.preventDefault();
    });

    const logoutOverlay = document.getElementById('logoutConfirmOverlay');
    const logoutCancelBtn = document.getElementById('logoutCancelBtn');
    const logoutConfirmBtn = document.getElementById('logoutConfirmBtn');

    document.getElementById('customerLogout')?.addEventListener('click', function(e) {
        e.preventDefault();
        if (isCustomerLoggedIn() && logoutOverlay) logoutOverlay.classList.add('active');
    });

    logoutCancelBtn?.addEventListener('click', function() {
        if (logoutOverlay) logoutOverlay.classList.remove('active');
    });

    logoutConfirmBtn?.addEventListener('click', function() {
        clearCustomerSession();
        if (logoutOverlay) logoutOverlay.classList.remove('active');
        updateCustomerAuthUI();
        showToast('Đã đăng xuất. Bạn vẫn có thể tiếp tục xem sản phẩm.', 'info');
    });

    logoutOverlay?.addEventListener('click', function(e) {
        if (e.target === this) this.classList.remove('active');
    });

    // Thông báo yêu cầu đăng nhập khi khách muốn tạo đơn.
    document.getElementById('loginRequiredCancelBtn')?.addEventListener('click', closeLoginRequired);
    document.getElementById('loginRequiredConfirmBtn')?.addEventListener('click', goToLoginForCheckout);
    document.getElementById('loginRequiredOverlay')?.addEventListener('click', function(e) {
        if (e.target === this) closeLoginRequired();
    });

    // Sau khi đăng nhập thành công, tự quay lại và mở đúng phần tạo đơn hàng.
    const pageParams = new URLSearchParams(window.location.search);
    if (pageParams.get('checkout') === '1') {
        window.history.replaceState({}, '', window.location.pathname);
        if (isCustomerLoggedIn()) {
            setTimeout(openCheckout, 0);
        } else {
            showLoginRequired();
        }
    }

    // Hero button scroll
    document.querySelector('.hero-btn')?.addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
    });

    document.querySelector('.hero-btn-secondary')?.addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
    });

    // Back to top
    const backToTopBtn = document.getElementById('backToTop');
    if (backToTopBtn) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 500) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        });
        backToTopBtn.addEventListener('click', function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Header shadow on scroll
    const header = document.getElementById('siteHeader');
    if (header) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 60) {
                header.classList.add('sticky');
            } else {
                header.classList.remove('sticky');
            }
        });
    }
});
