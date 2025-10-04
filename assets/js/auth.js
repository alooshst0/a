/**
 * نظام المصادقة وإدارة المستخدمين - الإصدار المصحح
 * @module auth
 */

import storage from './storage.js';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.sessionTimeout = 30 * 60 * 1000; // 30 دقيقة
        this.sessionTimer = null;
        this.init();
    }

    async init() {
        console.log('🔐 تهيئة نظام المصادقة...');
        
        // تحميل المستخدم الحالي من التخزين المحلي
        const savedUser = localStorage.getItem('erp_current_user');
        const sessionExpiry = localStorage.getItem('erp_session_expiry');
        
        console.log('💾 المستخدم المحفوظ:', savedUser);
        console.log('⏰ انتهاء الجلسة:', sessionExpiry);
        
        if (savedUser && sessionExpiry && Date.now() < parseInt(sessionExpiry)) {
            this.currentUser = JSON.parse(savedUser);
            this.startSessionTimer();
            console.log('✅ تم تحميل جلسة المستخدم:', this.currentUser.username);
        } else {
            this.clearSession();
            console.log('❌ لا توجد جلسة نشطة');
        }
    }

    /**
     * تسجيل الدخول
     */
    async login(username, password) {
        console.log('🔐 محاولة تسجيل دخول ل:', username);
        
        try {
            const users = await storage.getAll('users');
            console.log('👥 المستخدمون المتاحون:', users.map(u => u.username));
            
            const user = users.find(u => 
                u.username === username || u.email === username
            );

            if (!user) {
                console.error('❌ المستخدم غير موجود:', username);
                throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
            }

            console.log('✅ تم العثور على المستخدم:', user.username);

            // تحقق بسيط من كلمة المرور
            const isValid = password === user.password_hash;
            
            if (!isValid) {
                console.error('❌ كلمة المرور غير صحيحة');
                throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
            }

            if (user.status !== 'active') {
                console.error('❌ الحساب غير نشط');
                throw new Error('الحساب غير نشط');
            }

            this.currentUser = { ...user };
            delete this.currentUser.password_hash;

            // حفظ الجلسة
            localStorage.setItem('erp_current_user', JSON.stringify(this.currentUser));
            localStorage.setItem('erp_session_expiry', (Date.now() + this.sessionTimeout).toString());

            // بدء مؤقت الجلسة
            this.startSessionTimer();

            console.log('✅ تم تسجيل الدخول بنجاح:', this.currentUser.fullname);
            
            return this.currentUser;
        } catch (error) {
            console.error('❌ خطأ في تسجيل الدخول:', error);
            throw error;
        }
    }

    /**
     * تسجيل الخروج
     */
    async logout() {
        console.log('🚪 تسجيل الخروج...');
        
        if (this.currentUser) {
            console.log('👋 وداعاً', this.currentUser.fullname);
        }
        
        this.clearSession();
    }

    /**
     * بدء مؤقت الجلسة
     */
    startSessionTimer() {
        this.clearSessionTimer();
        
        this.sessionTimer = setTimeout(() => {
            console.log('⏰ انتهت الجلسة تلقائياً');
            this.logout();
            window.dispatchEvent(new CustomEvent('sessionExpired'));
        }, this.sessionTimeout);
        
        console.log('⏰ بدء مؤقت الجلسة:', this.sessionTimeout + ' مللي ثانية');
    }

    /**
     * مسح مؤقت الجلسة
     */
    clearSessionTimer() {
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
            this.sessionTimer = null;
        }
    }

    /**
     * مسح بيانات الجلسة
     */
    clearSession() {
        this.currentUser = null;
        this.clearSessionTimer();
        
        localStorage.removeItem('erp_current_user');
        localStorage.removeItem('erp_session_expiry');
        
        console.log('🧹 تم مسح بيانات الجلسة');
    }

    /**
     * التحقق من الصلاحيات
     */
    hasPermission(permission) {
        if (!this.currentUser) return false;

        const rolePermissions = this.getRolePermissions(this.currentUser.role);
        return rolePermissions.includes(permission) || rolePermissions.includes('*');
    }

    /**
     * الحصول على صلاحيات الدور
     */
    getRolePermissions(role) {
        const permissions = {
            'super_admin': ['*'],
            'admin': ['users.read', 'users.create', 'users.update', 'inventory.', 'sales.', 'purchases.', 'reports.'],
            'finance_manager': ['sales.read', 'purchases.read', 'reports.*'],
            'inventory_manager': ['inventory.*', 'purchases.read', 'reports.inventory'],
            'sales_manager': ['sales.*', 'inventory.read', 'reports.sales'],
            'cashier': ['sales.create', 'sales.read_own', 'inventory.read'],
            'auditor': ['reports.', 'audit.'],
            'viewer': ['reports.read']
        };

        return permissions[role] || [];
    }

    /**
     * التحقق من تسجيل الدخول
     */
    isAuthenticated() {
        return this.currentUser !== null;
    }

    /**
     * الحصول على المستخدم الحالي
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * تجديد الجلسة
     */
    refreshSession() {
        if (this.isAuthenticated()) {
            localStorage.setItem('erp_session_expiry', (Date.now() + this.sessionTimeout).toString());
            this.startSessionTimer();
        }
    }
}

// إنشاء نسخة وحيدة من مدير المصادقة
const auth = new AuthManager();

export default auth;