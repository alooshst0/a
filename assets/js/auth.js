/**
 * نظام المصادقة وإدارة المستخدمين - بدون ES Modules
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.sessionTimeout = 30 * 60 * 1000;
        this.sessionTimer = null;
        this.init();
    }

    async init() {
        const savedUser = localStorage.getItem('erp_current_user');
        const sessionExpiry = localStorage.getItem('erp_session_expiry');
        
        if (savedUser && sessionExpiry && Date.now() < parseInt(sessionExpiry)) {
            this.currentUser = JSON.parse(savedUser);
            this.startSessionTimer();
        } else {
            this.clearSession();
        }
    }

    async login(username, password) {
        try {
            const users = await window.storage.getAll('users');
            const user = users.find(u => 
                u.username === username || u.email === username
            );

            if (!user) {
                throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
            }

            const isValid = password === user.password_hash;
            
            if (!isValid) {
                throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
            }

            if (user.status !== 'active') {
                throw new Error('الحساب غير نشط');
            }

            this.currentUser = { ...user };
            delete this.currentUser.password_hash;

            localStorage.setItem('erp_current_user', JSON.stringify(this.currentUser));
            localStorage.setItem('erp_session_expiry', (Date.now() + this.sessionTimeout).toString());

            this.startSessionTimer();
            
            return this.currentUser;
        } catch (error) {
            console.error('خطأ في تسجيل الدخول:', error);
            throw error;
        }
    }

    async logout() {
        this.clearSession();
    }

    startSessionTimer() {
        this.clearSessionTimer();
        
        this.sessionTimer = setTimeout(() => {
            this.logout();
            window.dispatchEvent(new CustomEvent('sessionExpired'));
        }, this.sessionTimeout);
    }

    clearSessionTimer() {
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
            this.sessionTimer = null;
        }
    }

    clearSession() {
        this.currentUser = null;
        this.clearSessionTimer();
        
        localStorage.removeItem('erp_current_user');
        localStorage.removeItem('erp_session_expiry');
    }

    hasPermission(permission) {
        if (!this.currentUser) return false;

        const rolePermissions = this.getRolePermissions(this.currentUser.role);
        return rolePermissions.includes(permission) || rolePermissions.includes('*');
    }

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

    isAuthenticated() {
        return this.currentUser !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    refreshSession() {
        if (this.isAuthenticated()) {
            localStorage.setItem('erp_session_expiry', (Date.now() + this.sessionTimeout).toString());
            this.startSessionTimer();
        }
    }
}

// إنشاء نسخة عامة
window.auth = new AuthManager();
