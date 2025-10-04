/**
 * الملف الرئيسي للتطبيق - الإصدار المصحح
 * @module main
 */

import auth from './auth.js';
import router from './router.js';
import storage from './storage.js';
import { showToast } from './utils/helpers.js';

class ERPApp {
    constructor() {
        this.init();
    }

    async init() {
        try {
            console.log('🚀 بدء تحميل التطبيق...');
            
            // إعداد معالجات الأحداث أولاً
            this.setupEventListeners();
            
            // تهيئة البيانات
            await this.initializeData();
            
            // التحقق من المصادقة
            this.checkAuthentication();
            
            console.log('✅ التطبيق جاهز للاستخدام');
            
        } catch (error) {
            console.error('❌ خطأ في تحميل التطبيق:', error);
            this.showError('حدث خطأ في تحميل التطبيق: ' + error.message);
        }
    }

    /**
     * تهيئة البيانات الأولية
     */
    async initializeData() {
        try {
            const users = await storage.getAll('users');
            console.log('👥 عدد المستخدمين:', users.length);
            
            if (users.length === 0) {
                console.log('📝 إنشاء بيانات أولية...');
                await this.createSeedData();
            }
        } catch (error) {
            console.error('خطأ في تهيئة البيانات:', error);
        }
    }

    /**
     * إنشاء بيانات أولية
     */
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

        // حفظ البيانات الأولية
        for (const [store, data] of Object.entries(seedData)) {
            await storage.save(store, data);
            console.log(✅ تم حفظ ${data.length} عنصر في ${store});
        }
    }

    /**
     * إعداد معالجات الأحداث
     */
    setupEventListeners() {
        // تسجيل الدخول
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
            console.log('✅ تم إعداد معالج تسجيل الدخول');
        }

        // تسجيل الخروج
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }

        // انتهاء الجلسة
        window.addEventListener('sessionExpired', () => {
            this.handleSessionExpired();
        });

        console.log('✅ تم إعداد جميع معالجات الأحداث');
    }

    /**
     * التعامل مع تسجيل الدخول
     */
    async handleLogin() {
        const form = document.getElementById('login-form');
        const formData = new FormData(form);
        
        const username = formData.get('username');
        const password = formData.get('password');
        
        console.log('🔐 محاولة تسجيل دخول:', username);
        
        try {
            const user = await auth.login(username, password);
            console.log('✅ تم تسجيل الدخول بنجاح:', user.fullname);
            
            this.showApp();
            showToast('تم تسجيل الدخول بنجاح', 'success');
            
        } catch (error) {
            console.error('❌ فشل تسجيل الدخول:', error.message);
            showToast(error.message, 'error');
        }
    }

    /**
     * التعامل مع تسجيل الخروج
     */
    async handleLogout() {
        await auth.logout();
        this.showLogin();
        showToast('تم تسجيل الخروج', 'success');
    }

    /**
     * التعامل مع انتهاء الجلسة
     */
    handleSessionExpired() {
        this.showLogin();
        showToast('انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى', 'warning');
    }

    /**
     * التحقق من المصادقة
     */
    checkAuthentication() {
        console.log('🔍 التحقق من المصادقة...');
        
        if (auth.isAuthenticated()) {
            console.log('✅ المستخدم مسجل الدخول بالفعل');
            this.showApp();
        } else {
            console.log('❌ المستخدم غير مسجل الدخول');
            this.showLogin();
        }
    }

    /**
     * عرض واجهة التطبيق
     */
    showApp() {
        console.log('🖥 عرض واجهة التطبيق...');
        
        const loginScreen = document.getElementById('login-screen');
        const appScreen = document.getElementById('app');
        
        if (loginScreen && appScreen) {
            loginScreen.classList.add('hidden');
            appScreen.classList.remove('hidden');
            
            // تحديث ترحيب المستخدم
            const user = auth.getCurrentUser();
            if (user) {
                const greeting = document.getElementById('user-greeting');
                if (greeting) {
                    greeting.textContent = مرحبًا، ${user.fullname};
                }
            }
            
            console.log('✅ تم عرض واجهة التطبيق بنجاح');
        } else {
            console.error('❌ عناصر HTML غير موجودة');
        }
    }

    /**
     * عرض شاشة تسجيل الدخول
     */
    showLogin() {
        console.log('🔐 عرض شاشة تسجيل الدخول...');
        
        const loginScreen = document.getElementById('login-screen');
        const appScreen = document.getElementById('app');
        
        if (loginScreen && appScreen) {
            loginScreen.classList.remove('hidden');
            appScreen.classList.add('hidden');
            
            // مسح النموذج
            const loginForm = document.getElementById('login-form');
            if (loginForm) {
                loginForm.reset();
            }
            
            console.log('✅ تم عرض شاشة تسجيل الدخول');
        }
    }

    /**
     * عرض خطأ
     */
    showError(message) {
        const contentArea = document.getElementById('content-area');
        if (contentArea) {
            contentArea.innerHTML = `
                <div class="card text-center">
                    <h2>⚠ خطأ</h2>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="btn-primary mt-4">
                        إعادة تحميل الصفحة
                    </button>
                </div>
            `;
        }
    }
}

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 تم تحميل DOM بالكامل');
    window.erpApp = new ERPApp();
});

export default ERPApp;