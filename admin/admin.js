 // ============================================================
// ADMIN - ĐIỆN MÁY NGUYÊN HÙNG (Kết nối Backend API)
// ============================================================

// ===== DỮ LIỆU TOÀN CỤC (được nạp từ API) =====
let AppData = {
    products: [],
    categories: [],
    orders: [],
    customers: [],
    users: []
};

// ===== API HELPER (tự động gửi token Admin) =====
function getToken() {
    return localStorage.getItem('adminToken') || localStorage.getItem('token') || '';
}

function apiHeaders(json = true) {
    const headers = {};
    if (json) headers['Content-Type'] = 'application/json';
    const token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return headers;
}

async function apiFetch(url, options = {}) {
    // Tự động gắn JWT cho mọi API của trang Admin. Trước đây các lệnh
    // tải đơn hàng, khách hàng và dashboard không gửi Authorization,
    // server trả 401 nhưng giao diện lại chỉ hiển thị bảng trống.
    const headers = new Headers(options.headers || {});
    const token = getToken();
    if (token && !headers.has('Authorization')) {
        headers.set('Authorization', 'Bearer ' + token);
    }
    if (options.body != null && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({ success: false, message: 'Lỗi phản hồi từ server' }));
    if (!res.ok) {
        if (res.status === 401) {
            const adminToken = localStorage.getItem('adminToken');
            if (adminToken && localStorage.getItem('token') === adminToken) {
                localStorage.removeItem('token');
            }
            localStorage.removeItem('adminToken');
            sessionStorage.removeItem('currentUser');
            window.location.href = '../login/login.html';
        }
        throw new Error(data.message || 'Lỗi máy chủ');
    }
    return data;
}

// ===== UTILITY FUNCTIONS =====
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function formatDate(date) {
    if (!date) return '—';
    return new Date(date).toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function getStatusBadge(status) {
    const map = {
        'active': '<span class="status-badge active"><i class="fas fa-circle"></i> Hoạt động</span>',
        'inactive': '<span class="status-badge inactive"><i class="fas fa-circle"></i> Ngưng</span>',
        'Chờ xác nhận': '<span class="status-badge pending"><i class="fas fa-clock"></i> Chờ xác nhận</span>',
        'Đã xác nhận': '<span class="status-badge delivered"><i class="fas fa-check-circle"></i> Đã xác nhận</span>',
        'Đang giao': '<span class="status-badge shipping"><i class="fas fa-truck"></i> Đang giao</span>',
        'Đã giao': '<span class="status-badge delivered"><i class="fas fa-check-circle"></i> Đã giao</span>',
        'Đã hủy': '<span class="status-badge cancelled"><i class="fas fa-times-circle"></i> Đã hủy</span>'
    };
    return map[status] || `<span class="status-badge">${status}</span>`;
}

// ===== TOAST NOTIFICATION =====
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('toast-remove');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== MODAL =====
function openModal(title, content) {
    const overlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    modalTitle.textContent = title;
    modalBody.innerHTML = content;
    overlay.classList.add('active');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

// ===== TAB SWITCHING =====
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const targetContent = document.getElementById(tabId);
    const targetNav = document.querySelector(`[data-tab="${tabId}"]`);
    if (targetContent) targetContent.classList.add('active');
    if (targetNav) targetNav.classList.add('active');
    renderAllData();
}

// ===== LOAD DATA FROM API =====
// Dùng Promise.allSettled để 1 API lỗi không làm mất toàn bộ dữ liệu admin
async function loadAllData() {
    try {
        const results = await Promise.allSettled([
            apiFetch('/api/products'),
            apiFetch('/api/categories'),
            apiFetch('/api/orders'),
            apiFetch('/api/customers'),
            apiFetch('/api/dashboard')
        ]);

        const productsRes = results[0].status === 'fulfilled' ? results[0].value : { products: [] };
        const categoriesRes = results[1].status === 'fulfilled' ? results[1].value : { categories: [] };
        const ordersRes = results[2].status === 'fulfilled' ? results[2].value : { orders: [] };
        const customersRes = results[3].status === 'fulfilled' ? results[3].value : { customers: [] };
        const dashboardRes = results[4].status === 'fulfilled' ? results[4].value : {};

        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                const apiNames = ['sản phẩm', 'danh mục', 'đơn hàng', 'khách hàng', 'dashboard'];
                console.error(`Không thể tải ${apiNames[index]}:`, result.reason);
            }
        });
        if (results[2].status === 'rejected') {
            showToast('Không thể tải đơn hàng: ' + results[2].reason.message, 'error');
        }

        // Nếu tất cả đều lỗi -> báo lỗi
        if (results.every(r => r.status === 'rejected')) {
            showToast('Không thể tải dữ liệu từ máy chủ!', 'error');
            return;
        }

        AppData.products = productsRes.products || [];
        AppData.categories = categoriesRes.categories || [];
        AppData.orders = ordersRes.orders || [];
        AppData.customers = customersRes.customers || [];

        // Ghi nhận các id đơn hàng đã tồn tại để không toast khi poll lần đầu
        knownOrderIds = new Set((ordersRes.orders || []).map(o => o.id));

        // Map sản phẩm theo cấu trúc frontend cũ (category name)
        AppData.products = AppData.products.map(p => ({
            id: p.id,
            name: p.name,
            category: p.category || '',
            brand: p.brand || '',
            price: p.price,
            stock: p.stock,
            status: p.status,
            description: p.description || '',
            image: p.image || null,
            sales: p.sales || 0,
            old_price: p.old_price,
            discount: p.discount,
            icon: p.icon || 'fa-box',
            color: p.color || '#1976d2',
            specs: p.specs || '',
            rating: p.rating,
            reviews: p.reviews
        }));

        // Map categories
        AppData.categories = AppData.categories.map(c => ({
            id: c.id,
            name: c.name,
            description: c.description || '',
            count: c.count || 0
        }));

    // Map orders
        AppData.orders = AppData.orders.map(o => ({
            id: o.id,
            order_code: o.order_code,
            customer: o.customer,
            phone: o.phone,
            email: o.email,
            itemCount: o.item_count,
            total: o.total,
            date: o.date,
            status: o.status,
            address: o.address,
            note: o.note,
            payment_method: o.payment_method,
            confirmed_at: o.confirmed_at,
            confirmed_by: o.confirmed_by,
            items: o.items || []
        }));

        // Map customers
        AppData.customers = AppData.customers.map(c => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            address: c.address,
            regDate: c.regDate
        }));

        // Dashboard
        if (dashboardRes.stats) {
            AppData.dashboard = dashboardRes.stats;
            AppData.recentOrders = dashboardRes.recent_orders || [];
            AppData.topProducts = dashboardRes.top_products || [];
        }

        populateCategoryFilter();
        renderAllData();
    } catch (err) {
        console.error('Load data error:', err);
        showToast('Không thể tải dữ liệu từ máy chủ: ' + err.message, 'error');
    }
}

// ===== LOAD ORDERS + DASHBOARD (dùng cho auto-refresh) =====
// Biến theo dõi các id đơn hàng đã biết để phát hiện đơn mới
let knownOrderIds = new Set();

function mapOrder(o) {
    return {
        id: o.id,
        order_code: o.order_code,
        customer: o.customer,
        phone: o.phone,
        email: o.email,
        itemCount: o.item_count,
        total: o.total,
        date: o.date,
        status: o.status,
        address: o.address,
        note: o.note,
        payment_method: o.payment_method,
        confirmed_at: o.confirmed_at,
        confirmed_by: o.confirmed_by,
        items: o.items || []
    };
}

// Cập nhật badge "Đơn Hàng" = số đơn PENDING (Chờ xác nhận)
function updateOrderBadge() {
    const pendingCount = AppData.orders.filter(o => o.status === 'Chờ xác nhận').length;
    const badge = document.getElementById('orderCount');
    if (badge) {
        badge.textContent = pendingCount;
        badge.style.display = pendingCount > 0 ? '' : 'none';
    }
}

async function loadOrdersAndDashboard() {
    try {
        const results = await Promise.allSettled([
            apiFetch('/api/orders'),
            apiFetch('/api/dashboard')
        ]);
        const ordersRes = results[0].status === 'fulfilled' ? results[0].value : null;
        const dashboardRes = results[1].status === 'fulfilled' ? results[1].value : null;

        if (results[0].status === 'rejected') {
            console.error('Không thể tự động làm mới đơn hàng:', results[0].reason);
        }

        if (ordersRes) {
            // Phát hiện đơn hàng mới để hiện toast
            const newOrders = (ordersRes.orders || []).filter(o => !knownOrderIds.has(o.id));
            AppData.orders = (ordersRes.orders || []).map(mapOrder);
            knownOrderIds = new Set((ordersRes.orders || []).map(o => o.id));

            newOrders.forEach(o => {
                if (o.status === 'Chờ xác nhận') {
                    showToast(`Có đơn hàng mới: ${o.order_code}`, 'info');
                }
            });
        }
        if (dashboardRes && dashboardRes.stats) {
            AppData.dashboard = dashboardRes.stats;
            AppData.recentOrders = dashboardRes.recent_orders || [];
            AppData.topProducts = dashboardRes.top_products || [];
        }
        updateOrderBadge();
        renderOrders();
        renderDashboard();
    } catch (err) {
        console.error('Refresh orders error:', err);
    }
}

// ===== RENDER PRODUCTS =====
function renderProducts() {
    const tbody = document.getElementById('productsBody');
    const filter = document.getElementById('productCategoryFilter')?.value || '';
    const search = document.getElementById('productSearch')?.value?.toLowerCase() || '';

    let filtered = AppData.products.filter(p => {
        const matchCategory = !filter || p.category === filter;
        const matchSearch = !search || p.name.toLowerCase().includes(search) || p.brand.toLowerCase().includes(search) || String(p.id).toLowerCase().includes(search);
        return matchCategory && matchSearch;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Không tìm thấy sản phẩm nào</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(p => `
        <tr>
            <td><strong>${p.id}</strong></td>
            <td>${p.name}</td>
            <td>${p.brand ? `${p.brand} · ` : ''}${p.category}</td>
            <td>${formatCurrency(p.price)}</td>
            <td>${p.stock}</td>
            <td>${getStatusBadge(p.status)}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon edit" onclick="editProduct(${p.id})" title="Sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete" onclick="deleteProduct(${p.id})" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ===== ADD PRODUCT MODAL =====
function showAddProductModal() {
    const cats = AppData.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    const content = `
        <form id="productForm">
            <div class="form-group">
                <label>Tên sản phẩm</label>
                <input type="text" class="form-input" id="pName" required placeholder="Nhập tên sản phẩm">
            </div>
            <div class="form-group">
                <label>Thương hiệu</label>
                <input type="text" class="form-input" id="pBrand" required placeholder="Ví dụ: SAMSUNG, LG, SONY">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Danh mục</label>
                    <select class="form-select" id="pCategory">
                        ${cats}
                    </select>
                </div>
                <div class="form-group">
                    <label>Giá bán</label>
                    <input type="number" class="form-input" id="pPrice" required placeholder="0">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Giá cũ (để hiện khuyến mãi)</label>
                    <input type="number" class="form-input" id="pOldPrice" placeholder="0">
                </div>
                <div class="form-group">
                    <label>% Giảm giá</label>
                    <input type="number" class="form-input" id="pDiscount" placeholder="0">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Số lượng</label>
                    <input type="number" class="form-input" id="pStock" value="0" min="0">
                </div>
                <div class="form-group">
                    <label>Trạng thái</label>
                    <select class="form-select" id="pStatus">
                        <option value="active">Hoạt động</option>
                        <option value="inactive">Ngưng</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Mô tả</label>
                <textarea class="form-textarea" id="pDescription" placeholder="Nhập mô tả sản phẩm"></textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Hủy</button>
                <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Thêm sản phẩm</button>
            </div>
        </form>
    `;
    openModal('Thêm Sản Phẩm Mới', content);

    document.getElementById('productForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const newProduct = {
            name: document.getElementById('pName').value.trim(),
            brand: document.getElementById('pBrand').value.trim().toUpperCase(),
            category_id: parseInt(document.getElementById('pCategory').value),
            price: parseInt(document.getElementById('pPrice').value),
            old_price: parseInt(document.getElementById('pOldPrice').value) || null,
            discount: parseInt(document.getElementById('pDiscount').value) || 0,
            stock: parseInt(document.getElementById('pStock').value),
            status: document.getElementById('pStatus').value,
            description: document.getElementById('pDescription').value.trim()
        };
        try {
            await apiFetch('/api/products', {
                method: 'POST',
                headers: apiHeaders(),
                body: JSON.stringify(newProduct)
            });
            closeModal();
            showToast('Đã thêm sản phẩm thành công!');
            loadAllData();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

async function editProduct(id) {
    const product = AppData.products.find(p => String(p.id) === String(id));
    if (!product) return;

    const cats = AppData.categories.map(c => {
        const selected = c.name === product.category ? 'selected' : '';
        return `<option value="${c.id}" ${selected}>${c.name}</option>`;
    }).join('');

    const content = `
        <form id="productForm">
            <div class="form-group">
                <label>Tên sản phẩm</label>
                <input type="text" class="form-input" id="pName" value="${product.name}" required>
            </div>
            <div class="form-group">
                <label>Thương hiệu</label>
                <input type="text" class="form-input" id="pBrand" value="${product.brand || ''}" required>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Danh mục</label>
                    <select class="form-select" id="pCategory">${cats}</select>
                </div>
                <div class="form-group">
                    <label>Giá bán</label>
                    <input type="number" class="form-input" id="pPrice" value="${product.price}" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Giá cũ</label>
                    <input type="number" class="form-input" id="pOldPrice" value="${product.old_price || ''}">
                </div>
                <div class="form-group">
                    <label>% Giảm giá</label>
                    <input type="number" class="form-input" id="pDiscount" value="${product.discount || 0}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Số lượng</label>
                    <input type="number" class="form-input" id="pStock" value="${product.stock}" min="0">
                </div>
                <div class="form-group">
                    <label>Trạng thái</label>
                    <select class="form-select" id="pStatus">
                        <option value="active" ${product.status === 'active' ? 'selected' : ''}>Hoạt động</option>
                        <option value="inactive" ${product.status === 'inactive' ? 'selected' : ''}>Ngưng</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Mô tả</label>
                <textarea class="form-textarea" id="pDescription">${product.description || ''}</textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Hủy</button>
                <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Cập nhật</button>
            </div>
        </form>
    `;
    openModal('Sửa Sản Phẩm', content);

    document.getElementById('productForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const updated = {
            name: document.getElementById('pName').value.trim(),
            brand: document.getElementById('pBrand').value.trim().toUpperCase(),
            category_id: parseInt(document.getElementById('pCategory').value),
            price: parseInt(document.getElementById('pPrice').value),
            old_price: parseInt(document.getElementById('pOldPrice').value) || null,
            discount: parseInt(document.getElementById('pDiscount').value) || 0,
            stock: parseInt(document.getElementById('pStock').value),
            status: document.getElementById('pStatus').value,
            description: document.getElementById('pDescription').value.trim(),
            image: product.image || null,
            icon: product.icon,
            color: product.color,
            specs: product.specs,
            rating: product.rating,
            reviews: product.reviews,
            sales: product.sales
        };
        try {
            await apiFetch('/api/products/' + id, {
                method: 'PUT',
                headers: apiHeaders(),
                body: JSON.stringify(updated)
            });
            closeModal();
            showToast('Đã cập nhật sản phẩm!');
            loadAllData();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

async function deleteProduct(id) {
    if (confirm('Bạn có chắc muốn xóa sản phẩm này?')) {
        try {
            await apiFetch('/api/products/' + id, {
                method: 'DELETE',
                headers: apiHeaders()
            });
            showToast('Đã xóa sản phẩm!', 'warning');
            loadAllData();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }
}

// ===== RENDER CATEGORIES =====
function renderCategories() {
    const tbody = document.getElementById('categoriesBody');
    if (AppData.categories.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Chưa có danh mục nào</td></tr>';
        return;
    }
    tbody.innerHTML = AppData.categories.map(c => `
        <tr>
            <td><strong>${c.id}</strong></td>
            <td>${c.name}</td>
            <td>${c.description || '—'}</td>
            <td>${c.count}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon edit" onclick="editCategory(${c.id})" title="Sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete" onclick="deleteCategory(${c.id})" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function showAddCategoryModal() {
    const content = `
        <form id="categoryForm">
            <div class="form-group">
                <label>Tên danh mục</label>
                <input type="text" class="form-input" id="cName" required placeholder="VD: Tủ Lạnh">
            </div>
            <div class="form-group">
                <label>Mô tả</label>
                <textarea class="form-textarea" id="cDescription" placeholder="Mô tả danh mục"></textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Hủy</button>
                <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Thêm danh mục</button>
            </div>
        </form>
    `;
    openModal('Thêm Danh Mục', content);

    document.getElementById('categoryForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        try {
            await apiFetch('/api/categories', {
                method: 'POST',
                headers: apiHeaders(),
                body: JSON.stringify({
                    name: document.getElementById('cName').value.trim(),
                    description: document.getElementById('cDescription').value.trim()
                })
            });
            closeModal();
            showToast('Đã thêm danh mục!');
            loadAllData();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

async function editCategory(id) {
    const cat = AppData.categories.find(c => String(c.id) === String(id));
    if (!cat) return;
    const content = `
        <form id="categoryForm">
            <div class="form-group">
                <label>Tên danh mục</label>
                <input type="text" class="form-input" id="cName" value="${cat.name}" required>
            </div>
            <div class="form-group">
                <label>Mô tả</label>
                <textarea class="form-textarea" id="cDescription">${cat.description || ''}</textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Hủy</button>
                <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Cập nhật</button>
            </div>
        </form>
    `;
    openModal('Sửa Danh Mục', content);
    document.getElementById('categoryForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        try {
            await apiFetch('/api/categories/' + id, {
                method: 'PUT',
                headers: apiHeaders(),
                body: JSON.stringify({
                    name: document.getElementById('cName').value.trim(),
                    description: document.getElementById('cDescription').value.trim()
                })
            });
            closeModal();
            showToast('Đã cập nhật danh mục!');
            loadAllData();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

async function deleteCategory(id) {
    if (confirm('Bạn có chắc muốn xóa danh mục này?')) {
        try {
            await apiFetch('/api/categories/' + id, {
                method: 'DELETE',
                headers: apiHeaders()
            });
            showToast('Đã xóa danh mục!', 'warning');
            loadAllData();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }
}

// ===== RENDER ORDERS =====
function renderOrders() {
    const tbody = document.getElementById('ordersBody');
    const filter = document.getElementById('orderStatusFilter')?.value || '';
    const search = document.getElementById('orderSearch')?.value?.toLowerCase() || '';

    let filtered = AppData.orders.filter(o => {
        const matchStatus = !filter || o.status === filter;
        const matchSearch = !search ||
            o.order_code.toLowerCase().includes(search) ||
            o.customer.toLowerCase().includes(search) ||
            (o.phone || '').toLowerCase().includes(search);
        return matchStatus && matchSearch;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Không tìm thấy đơn hàng nào</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(o => `
        <tr>
            <td><strong>${o.order_code}</strong></td>
            <td>${o.customer}</td>
            <td>${o.itemCount}</td>
            <td>${formatCurrency(o.total)}</td>
            <td>${formatDate(o.date)}</td>
            <td>${getStatusBadge(o.status)}</td>
            <td>
                <div class="action-btns">
                    ${o.status === 'Chờ xác nhận' ? `
                    <button class="btn btn-success btn-sm btn-confirm-order" id="confirmBtn-${o.id}" onclick="confirmOrder(${o.id})" title="Xác nhận đơn hàng">
                        <i class="fas fa-check"></i> Xác nhận đơn
                    </button>` : ''}
                    <button class="btn-icon view" onclick="viewOrder(${o.id})" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon edit" onclick="editOrder(${o.id})" title="Sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ===== XÁC NHẬN ĐƠN HÀNG (mở hộp thoại xác nhận) =====
function confirmOrder(id) {
    const order = AppData.orders.find(o => String(o.id) === String(id));
    if (!order) return;
    const content = `
        <div style="text-align:center;padding:8px 0 4px">
            <div style="font-size:3rem;margin-bottom:12px;color:#16a34a"><i class="fas fa-check-circle"></i></div>
            <p style="font-size:1.05rem;color:var(--gray-700);margin-bottom:8px">
                Bạn có chắc muốn xác nhận đơn <strong>${order.order_code}</strong> không?
            </p>
            <p style="font-size:0.9rem;color:var(--gray-500)">Sau khi xác nhận, đơn sẽ chuyển sang trạng thái "Đã xác nhận".</p>
        </div>
        <div class="form-actions" style="justify-content:center">
            <button class="btn btn-secondary" onclick="closeModal()"><i class="fas fa-times"></i> Hủy</button>
            <button class="btn btn-success" id="confirmOrderBtn" onclick="doConfirmOrder(${id})">
                <i class="fas fa-check"></i> Xác nhận
            </button>
        </div>
    `;
    openModal('Xác Nhận Đơn Hàng', content);
}

// Thực hiện gọi API xác nhận (khóa nút chống bấm nhiều lần)
async function doConfirmOrder(id) {
    const btn = document.getElementById('confirmOrderBtn') || document.getElementById('confirmBtn-' + id);
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
    }
    try {
        const data = await apiFetch('/api/orders/' + id + '/confirm', {
            method: 'POST',
            headers: apiHeaders()
        });
        // Cập nhật trạng thái ngay tại chỗ không cần tải lại trang
        const orderObj = AppData.orders.find(o => String(o.id) === String(id));
        if (orderObj) {
            orderObj.status = data.status || 'Đã xác nhận';
        }
        closeModal();
        updateOrderBadge();
        renderOrders();
        renderDashboard();
        showToast('Đã xác nhận đơn hàng!');
    } catch (err) {
        showToast(err.message, 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Xác nhận';
        }
    }
}

function viewOrder(id) {
    const order = AppData.orders.find(o => String(o.id) === String(id));
    if (!order) return;
    const items = order.items || [];
    const itemsHtml = items.map(item => `
        <tr>
            <td>${item.name}</td>
            <td>${formatCurrency(item.price)}</td>
            <td>${item.qty}</td>
            <td>${formatCurrency(item.price * item.qty)}</td>
        </tr>
    `).join('') || '<tr><td colspan="4">Không có chi tiết</td></tr>';

    const content = `
        <div style="margin-bottom:16px">
            <p><strong>Mã đơn hàng:</strong> ${order.order_code}</p>
            <p><strong>Khách hàng:</strong> ${order.customer}</p>
            <p><strong>Số điện thoại:</strong> ${order.phone || '—'}</p>
            <p><strong>Email:</strong> ${order.email || '—'}</p>
            <p><strong>Ngày đặt:</strong> ${formatDate(order.date)}</p>
            <p><strong>Trạng thái:</strong> ${getStatusBadge(order.status)}</p>
            <p><strong>Địa chỉ:</strong> ${order.address || '—'}</p>
            <p><strong>Thanh toán:</strong> ${order.payment_method || 'COD'}</p>
            <p><strong>Ghi chú:</strong> ${order.note || '—'}</p>
            ${order.confirmed_at ? `<p><strong>Đã xác nhận lúc:</strong> ${formatDate(order.confirmed_at)} (${order.confirmed_by || 'Admin'})</p>` : ''}
        </div>
        <table class="data-table">
            <thead><tr><th>Sản phẩm</th><th>Đơn giá</th><th>SL</th><th>Thành tiền</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
            <tfoot>
                <tr style="font-weight:700;background:var(--gray-50)">
                    <td colspan="3" style="text-align:right">Tổng cộng:</td>
                    <td>${formatCurrency(order.total)}</td>
                </tr>
            </tfoot>
        </table>
        <div class="form-actions">
            <button class="btn btn-secondary" onclick="closeModal()">Đóng</button>
        </div>
    `;
    openModal(`Chi Tiết Đơn Hàng #${order.order_code}`, content);
}

function editOrder(id) {
    const order = AppData.orders.find(o => String(o.id) === String(id));
    if (!order) return;
const statuses = ['Chờ xác nhận', 'Đã xác nhận', 'Đang giao', 'Đã giao', 'Đã hủy'];
    const options = statuses.map(s => 
        `<option value="${s}" ${s === order.status ? 'selected' : ''}>${s}</option>`
    ).join('');
    const content = `
        <form id="orderForm">
            <div class="form-group">
                <label>Mã đơn hàng</label>
                <input type="text" class="form-input" value="${order.order_code}" disabled>
            </div>
            <div class="form-group">
                <label>Khách hàng</label>
                <input type="text" class="form-input" value="${order.customer}" disabled>
            </div>
            <div class="form-group">
                <label>Trạng thái</label>
                <select class="form-select" id="oStatus">${options}</select>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Hủy</button>
                <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Cập nhật</button>
            </div>
        </form>
    `;
    openModal('Cập Nhật Đơn Hàng', content);
    document.getElementById('orderForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        try {
            await apiFetch('/api/orders/' + id, {
                method: 'PUT',
                headers: apiHeaders(),
                body: JSON.stringify({ status: document.getElementById('oStatus').value })
            });
            closeModal();
            showToast('Đã cập nhật đơn hàng!');
            loadAllData();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

// ===== RENDER CUSTOMERS =====
function renderCustomers() {
    const tbody = document.getElementById('customersBody');
    const search = document.getElementById('customerSearch')?.value?.toLowerCase() || '';
    let filtered = AppData.customers.filter(c => 
        !search || c.name.toLowerCase().includes(search) || (c.phone || '').includes(search) || (c.email || '').toLowerCase().includes(search)
    );
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Không tìm thấy khách hàng nào</td></tr>';
        return;
    }
    tbody.innerHTML = filtered.map(c => `
        <tr>
            <td><strong>${c.id}</strong></td>
            <td>${c.name}</td>
            <td>${c.email || '—'}</td>
            <td>${c.phone || '—'}</td>
            <td>${c.address || '—'}</td>
            <td>${formatDate(c.regDate)}</td>
            <td>
                <button class="btn-icon view" onclick="viewCustomer(${c.id})" title="Xem">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function viewCustomer(id) {
    const c = AppData.customers.find(cu => String(cu.id) === String(id));
    if (!c) return;
    const orderHistory = AppData.orders.filter(o => o.customer === c.name);
    const orderHtml = orderHistory.length > 0 
        ? orderHistory.map(o => `<p>• ${o.order_code} - ${formatCurrency(o.total)} - ${getStatusBadge(o.status)}</p>`).join('')
        : '<p>Chưa có đơn hàng</p>';

    const content = `
        <div style="margin-bottom:16px">
            <p><strong>Mã KH:</strong> ${c.id}</p>
            <p><strong>Họ tên:</strong> ${c.name}</p>
            <p><strong>Email:</strong> ${c.email || '—'}</p>
            <p><strong>SĐT:</strong> ${c.phone || '—'}</p>
            <p><strong>Địa chỉ:</strong> ${c.address || '—'}</p>
            <p><strong>Ngày đăng ký:</strong> ${formatDate(c.regDate)}</p>
        </div>
        <h4 style="margin-bottom:8px">Lịch sử mua hàng</h4>
        <div style="background:var(--gray-50);padding:12px;border-radius:8px">
            ${orderHtml}
        </div>
        <div class="form-actions">
            <button class="btn btn-secondary" onclick="closeModal()">Đóng</button>
        </div>
    `;
    openModal(`Thông Tin Khách Hàng - ${c.name}`, content);
}

// ===== QUẢN LÝ ĐĂNG KÝ (registered customer accounts) =====
let currentRegTab = 'all';

function switchRegTab(tab) {
    currentRegTab = tab;
    document.querySelectorAll('.sub-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.subtab === tab);
    });
    const allTable = document.getElementById('regAllTable');
    const newTable = document.getElementById('regNewTable');
    if (allTable) allTable.style.display = tab === 'all' ? '' : 'none';
    if (newTable) newTable.style.display = tab === 'new' ? '' : 'none';
    renderRegistrations();
}

// Nạp danh sách tài khoản khách hàng đã đăng ký
async function loadRegistrations(search = '') {
    try {
        const query = search ? '?search=' + encodeURIComponent(search) : '';
        const data = await apiFetch('/api/registrations' + query);
        AppData.users = (data.registrations || []).map(u => ({
            id: u.id,
            username: u.username,
            fullname: u.fullname,
            email: u.email,
            phone: u.phone,
            created_at: u.created_at,
            is_new: u.is_new === true,
            role: u.role
        }));
        renderRegistrations();
        return true;
    } catch (err) {
        console.error('Load registrations error:', err);
        return false;
    }
}

// Tải lại danh sách đăng ký theo yêu cầu, không reload toàn bộ trang.
async function refreshRegistrations() {
    const button = document.getElementById('refreshRegistrationsBtn');
    const search = document.getElementById('regSearch')?.value.trim() || '';

    if (button) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Đang Làm Mới...';
    }

    const loaded = await loadRegistrations(search);
    showToast(
        loaded ? 'Danh sách đăng ký đã được làm mới!' : 'Không thể làm mới danh sách đăng ký.',
        loaded ? 'success' : 'error'
    );

    if (button) {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-sync-alt"></i> Làm Mới';
    }
}

function renderRegistrations() {
    const allBody = document.getElementById('regAllBody');
    const newBody = document.getElementById('regNewBody');
    const allCount = document.getElementById('allRegCount');
    const newCount = document.getElementById('newUsersCount');
    const navBadge = document.getElementById('newRegCount');

    const search = (document.getElementById('regSearch')?.value || '').toLowerCase();
    let allUsers = AppData.users;
    if (search) {
        allUsers = allUsers.filter(u =>
            (u.fullname || '').toLowerCase().includes(search) ||
            (u.username || '').toLowerCase().includes(search) ||
            (u.email || '').toLowerCase().includes(search) ||
            (u.phone || '').toLowerCase().includes(search)
        );
    }
    const newUsers = allUsers.filter(u => u.is_new);

    // Cập nhật số lượng
    if (allCount) allCount.textContent = allUsers.length;
    if (newCount) newCount.textContent = newUsers.length;
    if (navBadge) {
        navBadge.textContent = newUsers.length;
        navBadge.style.display = newUsers.length > 0 ? '' : 'none';
    }

    const rowsFor = (users) => {
        if (users.length === 0) {
            return '<tr><td colspan="8" class="empty-state">Chưa có khách hàng nào đăng ký</td></tr>';
        }
        return users.map(u => `
            <tr>
                <td><strong>${u.id}</strong></td>
                <td>${u.fullname}</td>
                <td>${u.username}</td>
                <td>${u.email || '—'}</td>
                <td>${u.phone || '—'}</td>
                <td>${formatDate(u.created_at)}</td>
                <td>${u.is_new
                    ? '<span class="reg-badge new"><i class="fas fa-user-plus"></i> Mới</span>'
                    : '<span class="reg-badge active"><i class="fas fa-circle"></i> Hoạt động</span>'}</td>
                <td>
                    <button class="btn-icon view" onclick="viewRegisteredUser(${u.id})" title="Xem">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    };

    if (allBody) allBody.innerHTML = rowsFor(allUsers);
    if (newBody) newBody.innerHTML = rowsFor(newUsers);
}

function viewRegisteredUser(id) {
    const u = AppData.users.find(x => String(x.id) === String(id));
    if (!u) return;
    const content = `
        <div style="margin-bottom:16px">
            <p><strong>Mã:</strong> ${u.id}</p>
            <p><strong>Họ tên:</strong> ${u.fullname}</p>
            <p><strong>Username:</strong> ${u.username}</p>
            <p><strong>Email:</strong> ${u.email || '—'}</p>
            <p><strong>SĐT:</strong> ${u.phone || '—'}</p>
            <p><strong>Ngày đăng ký:</strong> ${formatDate(u.created_at)}</p>
            <p><strong>Trạng thái:</strong> ${u.is_new
                ? '<span class="reg-badge new"><i class="fas fa-user-plus"></i> Mới</span>'
                : '<span class="reg-badge active"><i class="fas fa-circle"></i> Hoạt động</span>'}</p>
        </div>
        <div class="form-actions">
            <button class="btn btn-secondary" onclick="closeModal()">Đóng</button>
        </div>
    `;
    openModal('Thông Tin Tài Khoản Đăng Ký', content);
}

// ===== RENDER DASHBOARD =====
function renderDashboard() {
    const totalProducts = AppData.products.length;
    const totalOrders = AppData.orders.length;
    const totalRevenue = AppData.orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalCustomers = AppData.customers.length;

document.getElementById('statProducts').textContent = totalProducts;
    document.getElementById('statOrders').textContent = totalOrders;
    document.getElementById('statRevenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('statCustomers').textContent = totalCustomers;
    document.getElementById('productCount').textContent = totalProducts;

    // Badge "Đơn Hàng" = số đơn PENDING (Chờ xác nhận)
    updateOrderBadge();

    // Recent Orders
    const recentOrders = AppData.orders.slice(0, 5);
    const recentBody = document.getElementById('recentOrdersBody');
    if (recentOrders.length === 0) {
        recentBody.innerHTML = '<tr><td colspan="5" class="empty-state">Chưa có đơn hàng nào</td></tr>';
    } else {
        recentBody.innerHTML = recentOrders.map(o => `
            <tr>
                <td><strong>${o.order_code}</strong></td>
                <td>${o.customer}</td>
                <td>${o.itemCount} SP</td>
                <td>${formatCurrency(o.total)}</td>
                <td>${getStatusBadge(o.status)}</td>
            </tr>
        `).join('');
    }

    // Top Products
    const topProducts = [...AppData.products].sort((a, b) => b.sales - a.sales).slice(0, 5);
    const topContainer = document.getElementById('topProducts');
    if (topProducts.length === 0) {
        topContainer.innerHTML = '<p class="empty-state">Chưa có dữ liệu</p>';
    } else {
        topContainer.innerHTML = topProducts.map((p, i) => `
            <div class="top-product-item">
                <div class="top-product-rank">${i + 1}</div>
                <div class="top-product-info">
                    <div class="top-product-name">${p.name}</div>
                    <div class="top-product-sales">${p.sales} đã bán</div>
                </div>
                <div class="top-product-price">${formatCurrency(p.price)}</div>
            </div>
        `).join('');
    }
}

// ===== RENDER ALL =====
function renderAllData() {
    renderDashboard();
    renderProducts();
    renderCategories();
    renderOrders();
    renderCustomers();
    renderRegistrations();
}

// ===== POPULATE CATEGORY FILTER =====
function populateCategoryFilter() {
    const select = document.getElementById('productCategoryFilter');
    select.innerHTML = '<option value="">Tất cả danh mục</option>' + 
        AppData.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
}

// ===== SAVE SETTINGS =====
async function saveSettings() {
    const settings = {
        shopName: document.getElementById('shopName').value,
        shopAddress: document.getElementById('shopAddress').value,
        shopPhone: document.getElementById('shopPhone').value,
        shopEmail: document.getElementById('shopEmail').value
    };
    try {
        await apiFetch('/api/settings', {
            method: 'PUT',
            headers: apiHeaders(),
            body: JSON.stringify(settings)
        });
        showToast('Đã lưu cài đặt!');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function loadSettings() {
    try {
        const data = await apiFetch('/api/settings');
        const s = data.settings || {};
        if (s.shopName) document.getElementById('shopName').value = s.shopName;
        if (s.shopAddress) document.getElementById('shopAddress').value = s.shopAddress;
        if (s.shopPhone) document.getElementById('shopPhone').value = s.shopPhone;
        if (s.shopEmail) document.getElementById('shopEmail').value = s.shopEmail;
    } catch (err) {
        console.error('Load settings error:', err);
    }
}

// ===== EXPORT PRODUCTS =====
function exportProducts() {
    let csv = 'Mã SP,Tên Sản Phẩm,Danh Mục,Giá,Số Lượng,Trạng Thái\n';
    AppData.products.forEach(p => {
        csv += `${p.id},"${p.name}",${p.category},${p.price},${p.stock},${p.status}\n`;
    });
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'danh_sach_san_pham.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Đã xuất danh sách sản phẩm!');
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    // Check login
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!currentUser || currentUser.role !== 'admin') {
        window.location.href = '../login/login.html';
        return;
    }
    const adminDisplayName = currentUser.fullname || 'Quản Trị Viên';
    document.getElementById('headerAdminName').textContent = adminDisplayName;
    document.getElementById('welcomeAdminName').textContent = adminDisplayName;

// Load data from API
    loadAllData();
    loadRegistrations();
    loadSettings();

// ===== AUTO REFRESH: Hiện đơn hàng mới từ khách hàng mỗi 5 giây (polling) =====
    const REFRESH_INTERVAL = 5000;
    setInterval(() => {
        // Chỉ làm mới đơn hàng + dashboard để không gián đoạn thao tác của admin
        loadOrdersAndDashboard();
    }, REFRESH_INTERVAL);

    // ===== EVENT LISTENERS =====

    // Sidebar toggle
    document.getElementById('toggleSidebar').addEventListener('click', function() {
        document.getElementById('sidebar').classList.toggle('collapsed');
    });

    // Mobile toggle
    document.getElementById('mobileToggle').addEventListener('click', function() {
        document.getElementById('sidebar').classList.toggle('mobile-open');
    });

    // Navigation
    document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const tab = this.dataset.tab;
            switchTab(tab);
            document.getElementById('sidebar').classList.remove('mobile-open');
        });
    });

    // View all links
    document.querySelectorAll('.view-all').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            switchTab(this.dataset.tab);
        });
    });

    // Modal close
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalOverlay').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });

    // Add product
    document.getElementById('addProductBtn').addEventListener('click', showAddProductModal);

    // Add category
    document.getElementById('addCategoryBtn').addEventListener('click', showAddCategoryModal);

    // Product filter/search
    document.getElementById('productCategoryFilter').addEventListener('change', () => renderProducts());
    document.getElementById('productSearch').addEventListener('input', () => renderProducts());

    // Order filter/search
    document.getElementById('orderStatusFilter').addEventListener('change', () => renderOrders());
    document.getElementById('orderSearch').addEventListener('input', () => renderOrders());

// Customer search
    document.getElementById('customerSearch').addEventListener('input', () => renderCustomers());

    // Registrations search + sub-tab switching
    const regSearchEl = document.getElementById('regSearch');
    if (regSearchEl) regSearchEl.addEventListener('input', () => renderRegistrations());
    document.getElementById('refreshRegistrationsBtn')?.addEventListener('click', refreshRegistrations);
    document.querySelectorAll('.sub-tab').forEach(btn => {
        btn.addEventListener('click', function() {
            switchRegTab(this.dataset.subtab);
        });
    });

    // Export products
    document.getElementById('exportProductsBtn').addEventListener('click', exportProducts);

    // Save settings
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);

    // Logout with custom confirmation modal
    const logoutOverlay = document.getElementById('logoutConfirmOverlay');
    const logoutCancelBtn = document.getElementById('logoutCancelBtn');
    const logoutConfirmBtn = document.getElementById('logoutConfirmBtn');

    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        logoutOverlay.classList.add('active');
    });

    logoutCancelBtn.addEventListener('click', function() {
        logoutOverlay.classList.remove('active');
    });

    logoutConfirmBtn.addEventListener('click', function() {
        const adminToken = localStorage.getItem('adminToken');
        if (adminToken && localStorage.getItem('token') === adminToken) {
            localStorage.removeItem('token');
        }
        localStorage.removeItem('adminToken');
        sessionStorage.removeItem('currentUser');
        window.location.href = '../login/login.html';
    });

    logoutOverlay.addEventListener('click', function(e) {
        if (e.target === this) {
            logoutOverlay.classList.remove('active');
        }
    });

    // ===== GLOBAL SEARCH WITH DROPDOWN =====
    const searchInput = document.getElementById('globalSearch');
    const searchDropdown = document.getElementById('searchDropdown');
    const SEARCH_HISTORY_KEY = 'adminSearchHistory';
    const MAX_HISTORY = 10;

    function getSearchHistory() {
        try {
            return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY)) || [];
        } catch {
            return [];
        }
    }

    function saveSearchHistory(query) {
        let history = getSearchHistory();
        history = history.filter(h => h.toLowerCase() !== query.toLowerCase());
        history.unshift(query);
        if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
    }

    function clearSearchHistory() {
        localStorage.removeItem(SEARCH_HISTORY_KEY);
        renderSearchDropdown(searchInput.value.trim());
    }

    function renderSearchDropdown(query) {
        const trimmed = query.trim().toLowerCase();
        searchDropdown.innerHTML = '';
        searchDropdown.classList.remove('active');

        if (!trimmed && getSearchHistory().length === 0) return;

        let html = '';

        if (!trimmed) {
            const history = getSearchHistory();
            if (history.length > 0) {
                html += '<div class="search-dropdown-section">';
                html += '<div class="search-dropdown-section-title"><i class="fas fa-clock"></i> Tìm kiếm gần đây</div>';
                history.forEach(h => {
                    const escaped = h.replace(/'/g, "\\'");
                    html += `
                        <div class="search-dropdown-item" onclick="document.getElementById('globalSearch').value='${escaped}'; document.getElementById('globalSearch').dispatchEvent(new Event('input'));">
                            <div class="search-dropdown-item-icon history">
                                <i class="fas fa-history"></i>
                            </div>
                            <div class="search-dropdown-item-info">
                                <div class="search-dropdown-item-name">${h}</div>
                            </div>
                            <i class="fas fa-arrow-up" style="color:var(--gray-400);font-size:0.75rem"></i>
                        </div>
                    `;
                });
                html += '<div class="search-dropdown-history-clear"><button onclick="clearSearchHistory(); event.stopPropagation();">Xóa lịch sử tìm kiếm</button></div>';
                html += '</div>';
            }
            searchDropdown.innerHTML = html;
            if (html) searchDropdown.classList.add('active');
            return;
        }

        let hasResults = false;

        // Search products
        const products = AppData.products.filter(p =>
            p.name.toLowerCase().includes(trimmed) ||
            String(p.id).toLowerCase().includes(trimmed) ||
            p.category.toLowerCase().includes(trimmed)
        );
        if (products.length > 0) {
            hasResults = true;
            html += '<div class="search-dropdown-section">';
            html += '<div class="search-dropdown-section-title"><i class="fas fa-box"></i> Sản phẩm</div>';
            products.slice(0, 5).forEach(p => {
                html += `
                    <div class="search-dropdown-item" data-type="product" data-id="${p.id}">
                        <div class="search-dropdown-item-icon product">
                            <i class="fas fa-box"></i>
                        </div>
                        <div class="search-dropdown-item-info">
                            <div class="search-dropdown-item-name">${p.name}</div>
                            <div class="search-dropdown-item-desc">${p.id} - ${formatCurrency(p.price)}</div>
                        </div>
                        <span class="search-dropdown-item-tag product">${p.category}</span>
                    </div>
                `;
            });
            if (products.length > 5) {
                html += `<div class="search-dropdown-item" data-type="viewall-products">
                    <div class="search-dropdown-item-info" style="text-align:center">
                        <div class="search-dropdown-item-name" style="color:var(--primary)">Xem tất cả ${products.length} sản phẩm</div>
                    </div>
                </div>`;
            }
            html += '</div>';
        }

        // Search orders
        const orders = AppData.orders.filter(o =>
            o.order_code.toLowerCase().includes(trimmed) ||
            o.customer.toLowerCase().includes(trimmed)
        );
        if (orders.length > 0) {
            hasResults = true;
            html += '<div class="search-dropdown-section">';
            html += '<div class="search-dropdown-section-title"><i class="fas fa-shopping-cart"></i> Đơn hàng</div>';
            orders.slice(0, 5).forEach(o => {
                html += `
                    <div class="search-dropdown-item" data-type="order" data-id="${o.id}">
                        <div class="search-dropdown-item-icon order">
                            <i class="fas fa-shopping-cart"></i>
                        </div>
                        <div class="search-dropdown-item-info">
                            <div class="search-dropdown-item-name">${o.order_code} - ${o.customer}</div>
                            <div class="search-dropdown-item-desc">${formatCurrency(o.total)} - ${o.status}</div>
                        </div>
                        <span class="search-dropdown-item-tag order">${o.status}</span>
                    </div>
                `;
            });
            if (orders.length > 5) {
                html += `<div class="search-dropdown-item" data-type="viewall-orders">
                    <div class="search-dropdown-item-info" style="text-align:center">
                        <div class="search-dropdown-item-name" style="color:var(--primary)">Xem tất cả ${orders.length} đơn hàng</div>
                    </div>
                </div>`;
            }
            html += '</div>';
        }

        // Search customers
        const customers = AppData.customers.filter(c =>
            c.name.toLowerCase().includes(trimmed) ||
            (c.phone || '').includes(trimmed) ||
            (c.email || '').toLowerCase().includes(trimmed) ||
            String(c.id).toLowerCase().includes(trimmed)
        );
        if (customers.length > 0) {
            hasResults = true;
            html += '<div class="search-dropdown-section">';
            html += '<div class="search-dropdown-section-title"><i class="fas fa-users"></i> Khách hàng</div>';
            customers.slice(0, 5).forEach(c => {
                html += `
                    <div class="search-dropdown-item" data-type="customer" data-id="${c.id}">
                        <div class="search-dropdown-item-icon customer">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="search-dropdown-item-info">
                            <div class="search-dropdown-item-name">${c.name}</div>
                            <div class="search-dropdown-item-desc">${c.phone || ''} - ${c.email || ''}</div>
                        </div>
                        <span class="search-dropdown-item-tag customer">KH</span>
                    </div>
                `;
            });
            if (customers.length > 5) {
                html += `<div class="search-dropdown-item" data-type="viewall-customers">
                    <div class="search-dropdown-item-info" style="text-align:center">
                        <div class="search-dropdown-item-name" style="color:var(--primary)">Xem tất cả ${customers.length} khách hàng</div>
                    </div>
                </div>`;
            }
            html += '</div>';
        }

        // No results
        if (!hasResults) {
            html += '<div class="search-dropdown-empty"><i class="fas fa-search" style="margin-right:8px;opacity:0.5"></i> Không tìm thấy kết quả cho "<strong>' + query + '</strong>"</div>';
        }

        searchDropdown.innerHTML = html;
        searchDropdown.classList.add('active');
    }

    searchInput.addEventListener('input', function() {
        renderSearchDropdown(this.value);
    });

    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const query = this.value.trim();
            if (query) {
                saveSearchHistory(query);
                const productMatch = AppData.products.find(p => p.name.toLowerCase() === query.toLowerCase() || String(p.id).toLowerCase() === query.toLowerCase());
                const orderMatch = AppData.orders.find(o => o.order_code.toLowerCase() === query.toLowerCase());
                const customerMatch = AppData.customers.find(c => c.name.toLowerCase() === query.toLowerCase() || (c.phone || '').includes(query));

                if (productMatch) {
                    switchTab('products');
                    document.getElementById('productSearch').value = query;
                    renderProducts();
                } else if (orderMatch) {
                    switchTab('orders');
                    document.getElementById('orderSearch').value = query;
                    renderOrders();
                } else if (customerMatch) {
                    switchTab('customers');
                    document.getElementById('customerSearch').value = query;
                    renderCustomers();
                } else {
                    renderSearchDropdown(query);
                }
                searchDropdown.classList.remove('active');
            }
        }
    });

    searchDropdown.addEventListener('click', function(e) {
        const item = e.target.closest('.search-dropdown-item');
        if (!item) return;
        const type = item.dataset.type;
        const id = item.dataset.id;

        if (type === 'product') {
            saveSearchHistory(searchInput.value);
            switchTab('products');
            document.getElementById('productSearch').value = searchInput.value;
            renderProducts();
        } else if (type === 'order') {
            saveSearchHistory(searchInput.value);
            switchTab('orders');
            document.getElementById('orderSearch').value = searchInput.value;
            renderOrders();
        } else if (type === 'customer') {
            saveSearchHistory(searchInput.value);
            switchTab('customers');
            document.getElementById('customerSearch').value = searchInput.value;
            renderCustomers();
        } else if (type === 'viewall-products') {
            switchTab('products');
        } else if (type === 'viewall-orders') {
            switchTab('orders');
        } else if (type === 'viewall-customers') {
            switchTab('customers');
        }

        searchDropdown.classList.remove('active');
    });

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-box')) {
            searchDropdown.classList.remove('active');
        }
    });
});

