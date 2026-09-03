document.addEventListener('DOMContentLoaded', function() {
    const loginParams = new URLSearchParams(window.location.search);
    const redirectTarget = loginParams.get('redirect');
    const loginReason = loginParams.get('reason');

    function getSafeCustomerRedirect() {
        if (!redirectTarget) return '../customer/khachhang.html';
        try {
            const target = new URL(redirectTarget, window.location.origin);
            if (target.origin === window.location.origin && target.pathname.startsWith('/customer/')) {
                return target.pathname + target.search + target.hash;
            }
        } catch (e) {}
        return '../customer/khachhang.html';
    }

    // ===== TOGGLE PASSWORD VISIBILITY =====
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    const toggleRegPassword = document.getElementById('toggleRegPassword');
    const regPasswordInput = document.getElementById('regPassword');
    if (toggleRegPassword && regPasswordInput) {
        toggleRegPassword.addEventListener('click', function() {
            const type = regPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            regPasswordInput.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    // ===== TAB SWITCHING (Đăng nhập / Đăng ký) =====
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const panelLogin = document.getElementById('panelLogin');
    const panelRegister = document.getElementById('panelRegister');

    function switchTab(tab) {
        const isLogin = tab === 'login';
        if (tabLogin) tabLogin.classList.toggle('active', isLogin);
        if (tabRegister) tabRegister.classList.toggle('active', !isLogin);
        if (panelLogin) panelLogin.classList.toggle('hidden', !isLogin);
        if (panelRegister) panelRegister.classList.toggle('hidden', isLogin);
    }

    if (tabLogin) tabLogin.addEventListener('click', function() { switchTab('login'); });
    if (tabRegister) tabRegister.addEventListener('click', function() { switchTab('register'); });
    if (document.getElementById('switchToRegister')) {
        document.getElementById('switchToRegister').addEventListener('click', function(e) {
            e.preventDefault();
            switchTab('register');
        });
    }
    if (document.getElementById('switchToLogin')) {
        document.getElementById('switchToLogin').addEventListener('click', function(e) {
            e.preventDefault();
            switchTab('login');
        });
    }

    // ===== LOGIN FORM SUBMISSION =====
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    // Thông báo đơn giản khi khách chưa đăng nhập muốn tạo đơn (không hiện tài khoản/mật khẩu mặc định)
    if (loginReason === 'checkout' && loginForm) {
        const notice = document.createElement('div');
        notice.className = 'login-redirect-notice';
        notice.innerHTML = `
            <i class="fas fa-shopping-cart"></i>
            <div>
                <strong>Bạn chưa đăng nhập</strong>
                <span>Vui lòng đăng nhập hoặc đăng ký để tiếp tục tạo đơn hàng.</span>
            </div>
        `;
        loginForm.insertAdjacentElement('beforebegin', notice);
    }

    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();
            const remember = document.getElementById('remember')?.checked || false;

            // Validation
            if (!username || !password) {
                showLoginError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu');
                return;
            }

            if (password.length < 6) {
                showLoginError('Mật khẩu phải có ít nhất 6 ký tự');
                return;
            }

            hideLoginError();

            // Gọi API đăng nhập từ backend
            const submitBtn = loginForm.querySelector('.login-btn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đăng nhập...';
            }

            fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    // Lưu token + thông tin user
                    localStorage.setItem('token', data.token);
                    if (data.user.role === 'admin') {
                        localStorage.setItem('adminToken', data.token);
                    } else {
                        localStorage.setItem('customerToken', data.token);
                    }
                    if (remember) {
                        localStorage.setItem('rememberedUser', username);
                    }
                    sessionStorage.setItem('currentUser', JSON.stringify(data.user));

                    if (data.user.role === 'admin') {
                        window.location.href = '../admin/admin.html';
                    } else {
                        window.location.href = getSafeCustomerRedirect();
                    }
                } else {
                    showLoginError(data.message || 'Tên đăng nhập hoặc mật khẩu không đúng');
                    resetLoginBtn();
                }
            })
            .catch(() => {
                showLoginError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra server đang chạy.');
                resetLoginBtn();
            });
        });

        function resetLoginBtn() {
            const btn = loginForm.querySelector('.login-btn');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Đăng Nhập';
            }
        }

        // Auto-fill remembered user
        const rememberedUser = localStorage.getItem('rememberedUser');
        if (rememberedUser) {
            document.getElementById('username').value = rememberedUser;
            document.getElementById('remember').checked = true;
        }
    }

    function showLoginError(message) {
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
            setTimeout(() => {
                errorMessage.style.animation = 'shake 0.5s ease';
                setTimeout(() => {
                    errorMessage.style.animation = '';
                }, 500);
            }, 10);
        }
    }

    function hideLoginError() {
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }
    }

    // ===== REGISTER FORM SUBMISSION =====
    const registerForm = document.getElementById('registerForm');
    const registerError = document.getElementById('registerError');

    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const fullname = document.getElementById('regFullname').value.trim();
            const username = document.getElementById('regUsername').value.trim();
            const email = document.getElementById('regEmail').value.trim();
            const phone = document.getElementById('regPhone').value.trim();
            const password = document.getElementById('regPassword').value.trim();

            // Validation
            if (!fullname || !username || !password) {
                showRegisterError('Vui lòng nhập đầy đủ họ tên, tên đăng nhập và mật khẩu');
                return;
            }
            if (password.length < 6) {
                showRegisterError('Mật khẩu phải có ít nhất 6 ký tự');
                return;
            }

            hideRegisterError();

            const submitBtn = registerForm.querySelector('.login-btn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đăng ký...';
            }

            fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullname, username, email, phone, password })
            })
            .then(res => res.json().catch(() => ({ success: false, message: 'Lỗi phản hồi từ máy chủ' })))
            .then(data => {
                if (data.success) {
                    // Lưu token + thông tin user
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('customerToken', data.token);
                    sessionStorage.setItem('currentUser', JSON.stringify(data.user));
                    showToast('Đăng ký thành công! Đang chuyển hướng...');
                    setTimeout(() => {
                        window.location.href = getSafeCustomerRedirect();
                    }, 800);
                } else {
                    showRegisterError(data.message || 'Đăng ký thất bại');
                    resetRegisterBtn();
                }
            })
            .catch(() => {
                showRegisterError('Không thể kết nối đến máy chủ. Vui lòng thử lại.');
                resetRegisterBtn();
            });
        });

        function resetRegisterBtn() {
            const btn = registerForm.querySelector('.login-btn');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-user-plus"></i> Đăng Ký';
            }
        }
    }

    function showRegisterError(message) {
        if (registerError) {
            registerError.textContent = message;
            registerError.style.display = 'block';
            setTimeout(() => {
                registerError.style.animation = 'shake 0.5s ease';
                setTimeout(() => {
                    registerError.style.animation = '';
                }, 500);
            }, 10);
        }
    }

    function hideRegisterError() {
        if (registerError) {
            registerError.style.display = 'none';
        }
    }

    // ===== TOAST =====
    function showToast(message, type = 'success') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('toast-remove');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Add shake animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
        .toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .toast {
            background: #22c55e;
            color: #fff;
            padding: 14px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            font-size: 0.95rem;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideIn 0.3s ease;
        }
        .toast i { font-size: 1.1rem; }
        .toast-remove { opacity: 0; transform: translateX(30px); transition: all 0.3s ease; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(style);
});
