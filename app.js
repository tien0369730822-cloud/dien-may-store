// Sample Products Data
const products = {
    'all': [
        { id: 1, name: 'Tủ lạnh Samsung 450L', category: 'tu-lanh', price: 12500000, icon: '❄️' },
        { id: 2, name: 'Máy lạnh LG 1.5HP', category: 'may-lanh', price: 8900000, icon: '❄️' },
        { id: 3, name: 'Máy giặt LG 9kg', category: 'may-giat', price: 7500000, icon: '🧺' },
        { id: 4, name: 'Tivi Samsung 55 inch', category: 'tivi', price: 18900000, icon: '📺' },
        { id: 5, name: 'Tủ lạnh LG Double Door', category: 'tu-lanh', price: 14900000, icon: '❄️' },
        { id: 6, name: 'Máy lạnh Daikin 2.5HP', category: 'may-lanh', price: 12500000, icon: '❄️' },
        { id: 7, name: 'Máy giặt Samsung 11kg', category: 'may-giat', price: 9800000, icon: '🧺' },
        { id: 8, name: 'Tivi LG 65 inch OLED', category: 'tivi', price: 28900000, icon: '📺' },
        { id: 9, name: 'Camera thông minh Xiaomi', category: 'nha-thong-minh', price: 1500000, icon: '🏠' },
        { id: 10, name: 'Loa thông minh Google Home', category: 'nha-thong-minh', price: 2500000, icon: '🏠' },
        { id: 11, name: 'Tủ lạnh Panasonic 400L', category: 'tu-lanh', price: 11500000, icon: '❄️' },
        { id: 12, name: 'Máy lạnh Midea 1.0HP', category: 'may-lanh', price: 6500000, icon: '❄️' },
    ],
    'tu-lanh': [
        { id: 1, name: 'Tủ lạnh Samsung 450L', category: 'tu-lanh', price: 12500000, icon: '❄️' },
        { id: 5, name: 'Tủ lạnh LG Double Door', category: 'tu-lanh', price: 14900000, icon: '❄️' },
        { id: 11, name: 'Tủ lạnh Panasonic 400L', category: 'tu-lanh', price: 11500000, icon: '❄️' },
    ],
    'may-lanh': [
        { id: 2, name: 'Máy lạnh LG 1.5HP', category: 'may-lanh', price: 8900000, icon: '❄️' },
        { id: 6, name: 'Máy lạnh Daikin 2.5HP', category: 'may-lanh', price: 12500000, icon: '❄️' },
        { id: 12, name: 'Máy lạnh Midea 1.0HP', category: 'may-lanh', price: 6500000, icon: '❄️' },
    ],
    'may-giat': [
        { id: 3, name: 'Máy giặt LG 9kg', category: 'may-giat', price: 7500000, icon: '🧺' },
        { id: 7, name: 'Máy giặt Samsung 11kg', category: 'may-giat', price: 9800000, icon: '🧺' },
    ],
    'tivi': [
        { id: 4, name: 'Tivi Samsung 55 inch', category: 'tivi', price: 18900000, icon: '📺' },
        { id: 8, name: 'Tivi LG 65 inch OLED', category: 'tivi', price: 28900000, icon: '📺' },
    ],
    'nha-thong-minh': [
        { id: 9, name: 'Camera thông minh Xiaomi', category: 'nha-thong-minh', price: 1500000, icon: '🏠' },
        { id: 10, name: 'Loa thông minh Google Home', category: 'nha-thong-minh', price: 2500000, icon: '🏠' },
    ]
};

// Cart Management
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let users = JSON.parse(localStorage.getItem('users')) || [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    updateCartUI();
    showCategory('all');
    updateUserUI();
});

// Show Products by Category
function showCategory(category) {
    const productsGrid = document.getElementById('productsGrid');
    const productTitle = document.getElementById('productTitle');
    const categoryNames = {
        'all': 'Tất cả sản phẩm',
        'tu-lanh': 'Tủ lạnh',
        'may-lanh': 'Máy lạnh',
        'may-giat': 'Máy giặt',
        'tivi': 'Tivi',
        'nha-thong-minh': 'Nhà thông minh'
    };

    productTitle.textContent = categoryNames[category] || 'Tất cả sản phẩm';
    const categoryProducts = products[category] || products['all'];

    productsGrid.innerHTML = categoryProducts.map(product => `
        <div class="product-card">
            <div class="product-image">${product.icon}</div>
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-price">${formatPrice(product.price)}</div>
                <div class="product-rating">⭐⭐⭐⭐⭐ (125)</div>
                <button class="btn-add-cart" onclick="addToCart(${product.id}, '${product.name}', ${product.price})">Thêm vào giỏ</button>
            </div>
        </div>
    `).join('');
}

// Format Price
function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
}

// Add to Cart
function addToCart(id, name, price) {
    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id, name, price, quantity: 1 });
    }
    saveCart();
    updateCartUI();
    alert(`${name} đã được thêm vào giỏ hàng!`);
}

// Save Cart
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Update Cart UI
function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');

    cartCount.textContent = cart.length;

    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">Giỏ hàng trống</p>';
        cartTotal.textContent = '0 đ';
    } else {
        cartItems.innerHTML = cart.map((item, index) => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${formatPrice(item.price)}</div>
                </div>
                <div class="cart-item-actions">
                    <div class="cart-item-qty">
                        <button onclick="decreaseQty(${index})">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="increaseQty(${index})">+</button>
                    </div>
                    <button class="cart-item-remove" onclick="removeFromCart(${index})">Xóa</button>
                </div>
            </div>
        `).join('');

        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cartTotal.textContent = formatPrice(total);
    }
}

// Increase Quantity
function increaseQty(index) {
    cart[index].quantity += 1;
    saveCart();
    updateCartUI();
}

// Decrease Quantity
function decreaseQty(index) {
    if (cart[index].quantity > 1) {
        cart[index].quantity -= 1;
    } else {
        removeFromCart(index);
    }
    saveCart();
    updateCartUI();
}

// Remove from Cart
function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
}

// Open/Close Cart
function openCart() {
    document.getElementById('cartSidebar').classList.add('open');
}

function closeCart() {
    document.getElementById('cartSidebar').classList.remove('open');
}

// Toggle User Menu
function toggleUserMenu() {
    const userMenu = document.getElementById('userMenu');
    userMenu.classList.toggle('show');
}

// Close menu when clicking elsewhere
document.addEventListener('click', function(event) {
    const userMenu = document.getElementById('userMenu');
    const userIcon = document.querySelector('.user-icon');
    if (!userMenu.contains(event.target) && !userIcon.contains(event.target)) {
        userMenu.classList.remove('show');
    }
});

// Update User UI
function updateUserUI() {
    const userMenu = document.getElementById('userMenu');
    if (currentUser) {
        userMenu.innerHTML = `
            <a href="#">Chào, ${currentUser.name}!</a>
            <a href="#" onclick="handleLogout()">Đăng xuất</a>
        `;
        document.querySelector('.user-icon').textContent = '👤';
    }
}

// Login Modal
function openLoginModal() {
    document.getElementById('loginModal').classList.add('show');
    document.getElementById('userMenu').classList.remove('show');
}

function closeLoginModal() {
    document.getElementById('loginModal').classList.remove('show');
}

function openRegisterModal() {
    document.getElementById('registerModal').classList.add('show');
    document.getElementById('userMenu').classList.remove('show');
}

function closeRegisterModal() {
    document.getElementById('registerModal').classList.remove('show');
}

// Switch between Login and Register
function switchToRegister() {
    closeLoginModal();
    openRegisterModal();
}

function switchToLogin() {
    closeRegisterModal();
    openLoginModal();
}

// Handle Register
function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;

    if (password !== confirmPassword) {
        alert('Mật khẩu không khớp!');
        return;
    }

    if (users.some(user => user.email === email)) {
        alert('Email này đã được đăng ký!');
        return;
    }

    users.push({ name, email, password });
    localStorage.setItem('users', JSON.stringify(users));
    alert('Đăng ký thành công! Vui lòng đăng nhập.');
    closeRegisterModal();
    openLoginModal();
}

// Handle Login
function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        closeLoginModal();
        updateUserUI();
        alert(`Chào mừng, ${user.name}!`);
    } else {
        alert('Email hoặc mật khẩu không chính xác!');
    }
}

// Handle Logout
function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    document.getElementById('userMenu').classList.remove('show');
    updateUserUI();
    alert('Đã đăng xuất thành công!');
}

// Checkout
function goToCheckout() {
    if (cart.length === 0) {
        alert('Giỏ hàng trống!');
        return;
    }

    if (!currentUser) {
        alert('Vui lòng đăng nhập để thanh toán!');
        openLoginModal();
        return;
    }

    closeCart();
    openCheckoutModal();
}

function openCheckoutModal() {
    document.getElementById('checkoutModal').classList.add('show');
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('checkoutTotal').textContent = formatPrice(total);
    document.getElementById('customerName').value = currentUser.name;
    document.getElementById('customerEmail').value = currentUser.email;
}

function closeCheckoutModal() {
    document.getElementById('checkoutModal').classList.remove('show');
}

// Handle Checkout
function handleCheckout(event) {
    event.preventDefault();
    const name = document.getElementById('customerName').value;
    const email = document.getElementById('customerEmail').value;
    const phone = document.getElementById('customerPhone').value;
    const address = document.getElementById('customerAddress').value;

    if (!phone || !address) {
        alert('Vui lòng điền đầy đủ thông tin!');
        return;
    }

    const orderDetails = {
        customer: { name, email, phone, address },
        items: cart,
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        orderDate: new Date().toLocaleString('vi-VN')
    };

    let orders = JSON.parse(localStorage.getItem('orders')) || [];
    orders.push(orderDetails);
    localStorage.setItem('orders', JSON.stringify(orders));

    alert('Thanh toán thành công!\n\nChúng tôi sẽ liên hệ với bạn sớm để xác nhận đơn hàng.');
    cart = [];
    saveCart();
    updateCartUI();
    closeCheckoutModal();
}

// Close modals when clicking outside
window.onclick = function(event) {
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const checkoutModal = document.getElementById('checkoutModal');

    if (event.target === loginModal) loginModal.classList.remove('show');
    if (event.target === registerModal) registerModal.classList.remove('show');
    if (event.target === checkoutModal) closeCheckoutModal();
};