/**
 * وحدة لوحة التحكم
 * @module dashboard
 */

import storage from '../storage.js';
import { formatCurrency, showToast } from '../utils/helpers.js';

class DashboardModule {
    constructor() {
        this.stats = {};
        this.recentSales = [];
        this.lowStockProducts = [];
    }

    async show() {
        await this.loadData();
        this.render();
        this.setupEventListeners();
    }

    async hide() {
        // تنظيف إن وجد
    }

    async loadData() {
        try {
            const [products, sales, purchases] = await Promise.all([
                storage.getAll('products'),
                storage.getAll('sales'),
                storage.getAll('purchases')
            ]);

            // حساب الإحصائيات
            this.calculateStats(products, sales, purchases);
            this.getRecentSales(sales);
            this.getLowStockProducts(products);
        } catch (error) {
            console.error('خطأ في تحميل بيانات لوحة التحكم:', error);
            showToast('فشل في تحميل بيانات اللوحة', 'error');
        }
    }

    calculateStats(products, sales, purchases) {
        const today = new Date().toDateString();
        const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // المبيعات اليومية
        const todaySales = sales.filter(s => 
            new Date(s.created_at).toDateString() === today
        );
        
        // المبيعات الأسبوعية
        const weeklySales = sales.filter(s => 
            new Date(s.created_at) >= lastWeek
        );

        this.stats = {
            totalSales: sales.reduce((sum, s) => sum + s.total, 0),
            todaySales: todaySales.reduce((sum, s) => sum + s.total, 0),
            weeklySales: weeklySales.reduce((sum, s) => sum + s.total, 0),
            totalProducts: products.length,
            lowStockCount: products.filter(p => {
                const totalStock = Object.values(p.stock || {}).reduce((sum, qty) => sum + qty, 0);
                return totalStock <= p.reorder_point;
            }).length,
            totalCustomers: 0, // يمكن إضافته لاحقًا
            pendingOrders: purchases.filter(p => p.status === 'pending').length
        };
    }

    getRecentSales(sales) {
        this.recentSales = sales
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5);
    }

    getLowStockProducts(products) {
        this.lowStockProducts = products
            .filter(p => {
                const totalStock = Object.values(p.stock || {}).reduce((sum, qty) => sum + qty, 0);
                return totalStock <= p.reorder_point;
            })
            .slice(0, 5);
    }

    render() {
        const contentArea = document.getElementById('content-area');
        
        contentArea.innerHTML = `
            <div class="dashboard-module">
                <div class="module-header">
                    <h1>لوحة التحكم</h1>
                    <div class="header-actions">
                        <button class="btn-secondary" id="refresh-dashboard">
                            تحديث البيانات
                        </button>
                    </div>
                </div>

                <!-- بطاقات الإحصائيات -->
                <div class="dashboard-grid">
                    <div class="kpi-card neu">
                        <div class="kpi-icon">💰</div>
                        <div class="kpi-value">${formatCurrency(this.stats.todaySales || 0)}</div>
                        <div class="kpi-label">المبيعات اليوم</div>
                    </div>

                    <div class="kpi-card neu">
                        <div class="kpi-icon">📈</div>
                        <div class="kpi-value">${formatCurrency(this.stats.weeklySales || 0)}</div>
                        <div class="kpi-label">المبيعات الأسبوعية</div>
                    </div>

                    <div class="kpi-card neu">
                        <div class="kpi-icon">📦</div>
                        <div class="kpi-value">${this.stats.totalProducts || 0}</div>
                        <div class="kpi-label">إجمالي المنتجات</div>
                    </div>

                    <div class="kpi-card neu">
                        <div class="kpi-icon">⚠</div>
                        <div class="kpi-value">${this.stats.lowStockCount || 0}</div>
                        <div class="kpi-label">منتجات منخفضة المخزون</div>
                    </div>
                </div>

                <!-- الشبكة السفلية -->
                <div class="dashboard-lower-grid">
                    <div class="dashboard-card neu">
                        <div class="card-header">
                            <h3>أحدث المبيعات</h3>
                            <a href="#sales" class="btn-secondary">عرض الكل</a>
                        </div>
                        <div class="card-content">
                            ${this.renderRecentSales()}
                        </div>
                    </div>

                    <div class="dashboard-card neu">
                        <div class="card-header">
                            <h3>منتجات منخفضة المخزون</h3>
                            <a href="#inventory" class="btn-secondary">عرض الكل</a>
                        </div>
                        <div class="card-content">
                            ${this.renderLowStockProducts()}
                        </div>
                    </div>
                </div>

                <!-- مخطط سريع -->
                <div class="dashboard-card neu">
                    <div class="card-header">
                        <h3>نظرة سريعة على الأداء</h3>
                    </div>
                    <div class="card-content">
                        <div class="quick-stats">
                            <div class="quick-stat">
                                <span class="stat-label">إجمالي المبيعات:</span>
                                <span class="stat-value">${formatCurrency(this.stats.totalSales || 0)}</span>
                            </div>
                            <div class="quick-stat">
                                <span class="stat-label">الطلبات المعلقة:</span>
                                <span class="stat-value">${this.stats.pendingOrders || 0}</span>
                            </div>
                            <div class="quick-stat">
                                <span class="stat-label">العملاء:</span>
                                <span class="stat-value">${this.stats.totalCustomers || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderRecentSales() {
        if (this.recentSales.length === 0) {
            return '<p class="no-data">لا توجد مبيعات حديثة</p>';
        }

        return `
            <div class="recent-sales">
                ${this.recentSales.map(sale => `
                    <div class="sale-item">
                        <div class="sale-info">
                            <strong>فاتورة #${sale.id.slice(-6)}</strong>
                            <span class="sale-date">${new Date(sale.created_at).toLocaleDateString('ar-IQ')}</span>
                        </div>
                        <div class="sale-amount">${formatCurrency(sale.total)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderLowStockProducts() {
        if (this.lowStockProducts.length === 0) {
            return '<p class="no-data">لا توجد منتجات منخفضة المخزون</p>';
        }

        return `
            <div class="low-stock-list">
                ${this.lowStockProducts.map(product => {
                    const totalStock = Object.values(product.stock || {}).reduce((sum, qty) => sum + qty, 0);
                    return `
                        <div class="stock-item">
                            <div class="product-info">
                                <strong>${product.name?.ar || product.name}</strong>
                                <span class="product-sku">${product.sku}</span>
                            </div>
                            <div class="stock-level ${totalStock === 0 ? 'out-of-stock' : 'low-stock'}">
                                ${totalStock}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    setupEventListeners() {
        document.getElementById('refresh-dashboard')?.addEventListener('click', async () => {
            await this.loadData();
            this.render();
            this.setupEventListeners();
            showToast('تم تحديث البيانات', 'success');
        });
    }
}

export default DashboardModule;