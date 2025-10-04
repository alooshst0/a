/**
 * نظام التوجيه للوحدات
 * @module router
 */

class Router {
    constructor() {
        this.routes = new Map();
        this.currentModule = null;
        this.init();
    }

    init() {
        // التعامل مع تغيير الهاش
        window.addEventListener('hashchange', () => this.handleRouteChange());
        
        // التعامل مع تحميل الصفحة
        window.addEventListener('DOMContentLoaded', () => this.handleRouteChange());
    }

    /**
     * تسجيل وحدة
     * @param {string} path - المسار
     * @param {object} module - الوحدة
     */
    register(path, module) {
        this.routes.set(path, module);
    }

    /**
     * التعامل مع تغيير المسار
     */
    async handleRouteChange() {
        const hash = window.location.hash.slice(1) || 'dashboard';
        const [path, ...params] = hash.split('/');
        
        await this.navigate(path, params);
    }

    /**
     * التنقل لوحدة
     * @param {string} path - المسار
     * @param {Array} params - المعاملات
     */
    async navigate(path, params = []) {
        try {
            // إخفاء الوحدة الحالية
            if (this.currentModule && typeof this.currentModule.hide === 'function') {
                await this.currentModule.hide();
            }

            // البحث عن الوحدة المطلوبة
            const module = this.routes.get(path);
            
            if (!module) {
                await this.showError('الصفحة غير موجودة');
                return;
            }

            // تحديث العنوان
            document.getElementById('page-title').textContent = this.getPageTitle(path);
            
            // تحديث القائمة النشطة
            this.updateActiveNav(path);
            
            // تحميل الوحدة
            this.currentModule = module;
            
            if (typeof module.show === 'function') {
                await module.show(params);
            }
        } catch (error) {
            console.error('خطأ في التنقل:', error);
            await this.showError('حدث خطأ أثناء تحميل الصفحة');
        }
    }

    /**
     * الحصول على عنوان الصفحة
     * @param {string} path - المسار
     * @returns {string}
     */
    getPageTitle(path) {
        const titles = {
            'dashboard': 'لوحة التحكم',
            'inventory': 'إدارة المخزون',
            'bom': 'قائمة المواد',
            'sales': 'نقطة البيع',
            'purchases': 'المشتريات',
            'reports': 'التقارير',
            'users': 'إدارة المستخدمين',
            'backup': 'النسخ الاحتياطي'
        };
        
        return titles[path] || 'النظام';
    }

    /**
     * تحديث القائمة النشطة
     * @param {string} path - المسار
     */
    updateActiveNav(path) {
        // إزالة النشط من جميع العناصر
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // إضافة النشط للعنصر الحالي
        const activeLink = document.querySelector([data-module="${path}"]);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    /**
     * عرض خطأ
     * @param {string} message - رسالة الخطأ
     */
    async showError(message) {
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = `
            <div class="card text-center">
                <h2>⚠ خطأ</h2>
                <p>${message}</p>
                <button onclick="window.location.hash = 'dashboard'" class="btn-primary mt-4">
                    العودة للرئيسية
                </button>
            </div>
        `;
    }

    /**
     * إنشاء رابط
     * @param {string} path - المسار
     * @returns {string}
     */
    createLink(path) {
        return #${path};
    }
}

// إنشاء نسخة وحيدة من الموجه
const router = new Router();

export default router;