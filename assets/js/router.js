/**
 * الملف الرئيسي للتطبيق - بدون ES Modules
 */

class ERPApp {
    constructor() {
        this.modules = new Map();
        this.init();
    }

    async init() {
        try {
            await this.initializeData();
            this.registerModules();
            this.setupEventListeners();
            this.checkAuthentication();
        } catch (error) {
            console.error('خطأ في تهيئة التطبيق:', error);
            this.showToast('حدث خطأ في تحميل التطبيق', 'error');
        }
    }

    async initializeData() {
        const users = await window.storage.getAll('users');
        
        if (users.length === 0) {
            await this.createSeedData();
        }
    }

    async createSeedData() {
        const seedData = {
            users: [
                {
                    id: 'user_001',
                    username: 'admin',
                    email: 'admin@company.com',
                    password_hash: 'admin123',
                    role: 'super_admin',
                    fullname: 'مدير النظام',
                    status: 'active',
                    created_at: new Date().toISOString()
                }
            ],
            products: [
                {
                    id: 'prod_001',
                    sku: 'SKU-1001',
                    barcode: '1234567890123',
                    name: { ar: 'هاتف ذكي', en: 'Smartphone' },
                    type: 'finished',
                    category: 'إلكترونيات',
                    unit: 'قطعة',
                    cost_price: 500,
                    sale_price: 750,
                    tax_rate: 0.05,
                    reorder_point: 10,
                    stock: { 'warehouse_1': 25 },
                    attributes: { color: 'أسود', storage: '128GB' },
                    created_at: new Date().toISOString()
                }
            ],
            warehouses: [
                {
                    id: 'warehouse_1',
                    name: 'المستودع الرئيسي',
                    location: 'المركز الرئيسي',
                    manager: 'user_001',
                    capacity: 1000,
                    created_at: new Date().toISOString()
                }
            ]
        };

        for (const [store, data] of Object.entries(seedData)) {
            await window.storage.save(store, data);
        }
    }

    registerModules() {
        // سيتم تسجيل الوحدات هنا لاحقاً
        console.log('تم تسجيل الوحدات');
    }

    setupEventListeners() {
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });

        document.getElementById('sidebar-toggle').addEventListener('click', () => {
            this.toggleSidebar();
        });

        document.getElementById('user-menu-btn').addEventListener('click', () => {
            this.toggleUserMenu();
        });

        window.addEventListener('sessionExpired', () => {
            this.handleSessionExpired();
        });

        document.addEventListener('click', () => window.auth.refreshSession());
        document.addEventListener('keypress', () => window.auth.refreshSession());
    }

    async handleLogin() {
        const form = document.getElementById('login-form');
        const formData = new FormData(form);
        
        const username = formData.get('username');
        const password = formData.get('password');
        
        try {
            await window.auth.login(username, password);
            this.showApp();
            this.showToast('تم تسجيل الدخول بنجاح', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async handleLogout() {
        await window.auth.logout();
        this.showLogin();
        this.showToast('تم تسجيل الخروج', 'success');
    }

    handleSessionExpired() {
        this.showLogin();
        this.showToast('انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى', 'warning');
    }

    checkAuthentication() {
        if (window.auth.isAuthenticated()) {
            this.showApp();
        } else {
            this.showLogin();
        }
    }

    showApp() {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        
        const user = window.auth.getCurrentUser();
        if (user) {
            document.getElementById('user-greeting').textContent = 'مرحبًا، ' + user.fullname;
        }
    }

    showLogin() {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app').classList.add('hidden');
        document.getElementById('login-form').reset();
    }

    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        sidebar.classList.toggle('collapsed');
    }

    toggleUserMenu() {
        const dropdown = document.getElementById('user-dropdown');
        dropdown.classList.toggle('hidden');
    }

    showToast(message, type) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast ' + type;
        
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠';
        toast.innerHTML = '<span>' + icon + '</span><span>' + message + '</span>';
        
        container.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
        
        toast.addEventListener('click', () => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        });
    }
}

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    window.erpApp = new ERPApp();
});
