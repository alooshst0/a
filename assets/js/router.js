/**
 * نظام التوجيه للوحدات - بدون ES Modules
 */

class Router {
    constructor() {
        this.routes = new Map();
        this.currentModule = null;
        this.init();
    }

    init() {
        window.addEventListener('hashchange', () => this.handleRouteChange());
        window.addEventListener('DOMContentLoaded', () => this.handleRouteChange());
    }

    register(path, module) {
        this.routes.set(path, module);
    }

    async handleRouteChange() {
        const hash = window.location.hash.slice(1) || 'dashboard';
        const [path, ...params] = hash.split('/');
        
        await this.navigate(path, params);
    }

    async navigate(path, params = []) {
        try {
            if (this.currentModule && typeof this.currentModule.hide === 'function') {
                await this.currentModule.hide();
            }

            const module = this.routes.get(path);
            
            if (!module) {
                await this.showError('الصفحة غير موجودة');
                return;
            }

            document.getElementById('page-title').textContent = this.getPageTitle(path);
            this.updateActiveNav(path);
            
            this.currentModule = module;
            
            if (typeof module.show === 'function') {
                await module.show(params);
            }
        } catch (error) {
            console.error('خطأ في التنقل:', error);
            await this.showError('حدث خطأ أثناء تحميل الصفحة');
        }
    }

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

    updateActiveNav(path) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector('[data-module="' + path + '"]');
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

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

    createLink(path) {
        return '#' + path;
    }
}

// إنشاء نسخة عامة
window.router = new Router();
