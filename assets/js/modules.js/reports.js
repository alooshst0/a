/**
 * وحدة التقارير والتحليلات
 * @module reports
 */

import storage from '../storage.js';
import { formatCurrency, showToast, downloadData } from '../utils/helpers.js';

class ReportsModule {
    constructor() {
        this.sales = [];
        this.products = [];
        this.purchases = [];
        this.currentReport = 'sales';
    }

    async show(params = []) {
        await this.loadData();
        this.render();
        this.setupEventListeners();
    }

    async hide() {
        // تنظيف إن وجد
    }

    async loadData() {
        try {
            [this.sales, this.products, this.purchases] = await Promise.all([
                storage.getAll('sales'),
                storage.getAll('products'),
                storage.getAll('purchases')
            ]);
        } catch (error) {
            console.error('خطأ في تحميل بيانات التقارير:', error);
            showToast('فشل في تحميل بيانات التقارير', 'error');
        }
    }

    render() {
        const contentArea = document.getElementById('content-area');
        
        contentArea.innerHTML = `
            <div class="reports-module">
                <div class="module-header">
                    <h1>التقارير والتحليلات</h1>
                    <div class="header-actions">
                        <button class="btn-secondary" id="export-report-btn">
                            تصدير التقرير
                        </button>
                    </div>
                </div>

                <div class="tabs">
                    <div class="tab active" data-report="sales">تقارير المبيعات</div>
                    <div class="tab" data-report="inventory">تقارير المخزون</div>
                    <div class="tab" data-report="purchases">تقارير المشتريات</div>
                </div>

                <div class="report-filters">
                    <div class="filter-group">
                        <label for="date-from">من تاريخ</label>
                        <input type="date" id="date-from" class="neu-input">
                    </div>
                    <div class="filter-group">
                        <label for="date-to">إلى تاريخ</label>
                        <input type="date" id="date-to" class="neu-input">
                    </div>
                    <button class="btn-primary" id="apply-filters">تطبيق الفلاتر</button>
                </div>

                <div id="report-content">
                    ${this.renderSalesReport()}
                </div>
            </div>
        `;
    }

    renderSalesReport() {
        const filteredSales = this.filterDataByDate(this.sales);
        const salesByDate = this.groupSalesByDate(filteredSales);
        const topProducts = this.getTopProducts(filteredSales);

        return `
            <div class="sales-report">
                <div class="report-summary">
                    <div class="summary-card neu">
                        <h3>إجمالي المبيعات</h3>
                        <div class="summary-value">${formatCurrency(this.getTotalSales(filteredSales))}</div>
                    </div>
                    <div class="summary-card neu">
                        <h3>عدد الفواتير</h3>
                        <div class="summary-value">${filteredSales.length}</div>
                    </div>
                    <div class="summary-card neu">
                        <h3>متوسط قيمة الفاتورة</h3>
                        <div class="summary-value">${formatCurrency(this.getAverageSale(filteredSales))}</div>
                    </div>
                </div>

                <div class="report-charts">
                    <div class="chart-card neu">
                        <h3>المبيعات اليومية</h3>
                        <div class="chart-container">
                            ${this.renderSalesChart(salesByDate)}
                        </div>
                    </div>

                    <div class="chart-card neu">
                        <h3>أفضل المنتجات مبيعًا</h3>
                        <div class="chart-container">
                            ${this.renderTopProductsChart(topProducts)}
                        </div>
                    </div>
                </div>

                <div class="report-table">
                    <h3>تفاصيل المبيعات</h3>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>رقم الفاتورة</th>
                                    <th>التاريخ</th>
                                    <th>المجموع الفرعي</th>
                                    <th>الضريبة</th>
                                    <th>الإجمالي</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filteredSales.map(sale => `
                                    <tr>
                                        <td>${sale.id.slice(-6)}</td>
                                        <td>${new Date(sale.created_at).toLocaleDateString('ar-IQ')}</td>
                                        <td>${formatCurrency(sale.subtotal)}</td>
                                        <td>${formatCurrency(sale.tax_amount)}</td>
                                        <td>${formatCurrency(sale.total)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    filterDataByDate(data) {
        const dateFrom = document.getElementById('date-from')?.value;
        const dateTo = document.getElementById('date-to')?.value;

        if (!dateFrom && !dateTo) return data;

        return data.filter(item => {
            const itemDate = new Date(item.created_at || item.order_date);
            const fromDate = dateFrom ? new Date(dateFrom) : null;
            const toDate = dateTo ? new Date(dateTo) : null;

            if (fromDate && itemDate < fromDate) return false;
            if (toDate && itemDate > toDate) return false;
            
            return true;
        });
    }

    groupSalesByDate(sales) {
        const grouped = {};
        
        sales.forEach(sale => {
            const date = new Date(sale.created_at).toDateString();
            if (!grouped[date]) {
                grouped[date] = 0;
            }
            grouped[date] += sale.total;
        });

        return grouped;
    }

    getTopProducts(sales, limit = 5) {
        const productSales = {};
        
        sales.forEach(sale => {
            sale.items.forEach(item => {
                if (!productSales[item.productId]) {
                    productSales[item.productId] = {
                        quantity: 0,
                        revenue: 0,
                        product: this.products.find(p => p.id === item.productId)
                    };
                }
                productSales[item.productId].quantity += item.quantity;
                productSales[item.productId].revenue += item.quantity * item.unitPrice;
            });
        });

        return Object.values(productSales)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, limit);
    }

    getTotalSales(sales) {
        return sales.reduce((sum, sale) => sum + sale.total, 0);
    }

    getAverageSale(sales) {
        return sales.length > 0 ? this.getTotalSales(sales) / sales.length : 0;
    }

    renderSalesChart(salesByDate) {
        // في الإصدار النهائي، استخدم Chart.js
        const dates = Object.keys(salesByDate).slice(-7); // آخر 7 أيام
        const maxSale = Math.max(...Object.values(salesByDate));
        
        return `
            <div class="bar-chart">
                ${dates.map(date => {
                    const sale = salesByDate[date];
                    const height = maxSale > 0 ? (sale / maxSale) * 100 : 0;
                    
                    return `
                        <div class="bar-container">
                            <div class="bar" style="height: ${height}%"></div>
                            <div class="bar-label">${new Date(date).toLocaleDateString('ar-IQ', {day: 'numeric', month: 'short'})}</div>
                            <div class="bar-value">${formatCurrency(sale)}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    renderTopProductsChart(topProducts) {
        return `
            <div class="products-chart">
                ${topProducts.map(product => {
                    const productName = product.product?.name?.ar || 'منتج غير معروف';
                    const width = Math.min((product.revenue / (topProducts[0]?.revenue || 1)) * 100, 100);
                    
                    return `
                        <div class="product-row">
                            <div class="product-name">${productName}</div>
                            <div class="product-bar-container">
                                <div class="product-bar" style="width: ${width}%"></div>
                            </div>
                            <div class="product-value">${formatCurrency(product.revenue)}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    setupEventListeners() {
        // تبديل التقارير
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.currentReport = e.target.dataset.report;
                this.switchReport(this.currentReport);
            });
        });

        // تطبيق الفلاتر
        document.getElementById('apply-filters').addEventListener('click', () => {
            this.loadReport();
        });

        // تصدير التقرير
        document.getElementById('export-report-btn').addEventListener('click', () => {
            this.exportReport();
        });
    }

    switchReport(reportType) {
        // تحديث التبويبات النشطة
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.report === reportType);
        });

        this.loadReport();
    }

    loadReport() {
        const content = document.getElementById('report-content');
        
        switch (this.currentReport) {
            case 'sales':
                content.innerHTML = this.renderSalesReport();
                break;
            case 'inventory':
                content.innerHTML = this.renderInventoryReport();
                break;
            case 'purchases':
                content.innerHTML = this.renderPurchasesReport();
                break;
        }

        this.setupEventListeners();
    }

    renderInventoryReport() {
        const lowStockProducts = this.products.filter(p => {
            const totalStock = Object.values(p.stock || {}).reduce((sum, qty) => sum + qty, 0);
            return totalStock <= p.reorder_point;
        });

        const totalInventoryValue = this.products.reduce((sum, product) => {
            const totalStock = Object.values(product.stock || {}).reduce((sum, qty) => sum + qty, 0);
            return sum + (totalStock * product.cost_price);
        }, 0);

        return `
            <div class="inventory-report">
                <div class="report-summary">
                    <div class="summary-card neu">
                        <h3>إجمالي قيمة المخزون</h3>
                        <div class="summary-value">${formatCurrency(totalInventoryValue)}</div>
                    </div>
                    <div class="summary-card neu">
                        <h3>عدد المنتجات</h3>
                        <div class="summary-value">${this.products.length}</div>
                    </div>
                    <div class="summary-card neu">
                        <h3>منتجات منخفضة المخزون</h3>
                        <div class="summary-value">${lowStockProducts.length}</div>
                    </div>
                </div>

                <div class="report-table">
                    <h3>المنتجات المنخفضة المخزون</h3>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>المنتج</th>
                                    <th>SKU</th>
                                    <th>المخزون الحالي</th>
                                    <th>نقطة إعادة الطلب</th>
                                    <th>سعر التكلفة</th>
                                    <th>قيمة المخزون</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${lowStockProducts.map(product => {
                                    const totalStock = Object.values(product.stock || {}).reduce((sum, qty) => sum + qty, 0);
                                    const stockValue = totalStock * product.cost_price;
                                    
                                    return `
                                        <tr>
                                            <td>${product.name?.ar}</td>
                                            <td>${product.sku}</td>
                                            <td class="${totalStock === 0 ? 'out-of-stock' : 'low-stock'}">${totalStock}</td>
                                            <td>${product.reorder_point}</td>
                                            <td>${formatCurrency(product.cost_price)}</td>
                                            <td>${formatCurrency(stockValue)}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    renderPurchasesReport() {
        const filteredPurchases = this.filterDataByDate(this.purchases);
        const totalPurchases = this.getTotalPurchases(filteredPurchases);

        return `
            <div class="purchases-report">
                <div class="report-summary">
                    <div class="summary-card neu">
                        <h3>إجمالي المشتريات</h3>
                        <div class="summary-value">${formatCurrency(totalPurchases)}</div>
                    </div>
                    <div class="summary-card neu">
                        <h3>عدد أوامر الشراء</h3>
                        <div class="summary-value">${filteredPurchases.length}</div>
                    </div>
                </div>

                <div class="report-table">
                    <h3>تفاصيل المشتريات</h3>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>رقم الأمر</th>
                                    <th>المورد</th>
                                    <th>التاريخ</th>
                                    <th>الحالة</th>
                                    <th>الإجمالي</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filteredPurchases.map(purchase => `
                                    <tr>
                                        <td>${purchase.po_number}</td>
                                        <td>${purchase.supplier_id}</td>
                                        <td>${new Date(purchase.order_date).toLocaleDateString('ar-IQ')}</td>
                                        <td>
                                            <span class="status-badge status-${purchase.status}">
                                                ${this.getPurchaseStatusText(purchase.status)}
                                            </span>
                                        </td>
                                        <td>${formatCurrency(purchase.total)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    getTotalPurchases(purchases) {
        return purchases.reduce((sum, purchase) => sum + purchase.total, 0);
    }

    getPurchaseStatusText(status) {
        const statusMap = {
            'pending': 'معلق',
            'received': 'مستلم',
            'cancelled': 'ملغى'
        };
        return statusMap[status] || status;
    }

    async exportReport() {
        try {
            let data, filename;
            
            switch (this.currentReport) {
                case 'sales':
                    data = this.prepareSalesExport();
                    filename = sales-report-${new Date().toISOString().split('T')[0]}.json;
                    break;
                case 'inventory':
                    data = this.prepareInventoryExport();
                    filename = inventory-report-${new Date().toISOString().split('T')[0]}.json;
                    break;
                case 'purchases':
                    data = this.preparePurchasesExport();
                    filename = purchases-report-${new Date().toISOString().split('T')[0]}.json;
                    break;
            }

            downloadData(JSON.stringify(data, null, 2), filename, 'application/json');
            showToast('تم تصدير التقرير بنجاح', 'success');
        } catch (error) {
            console.error('خطأ في تصدير التقرير:', error);
            showToast('فشل في تصدير التقرير', 'error');
        }
    }

    prepareSalesExport() {
        const filteredSales = this.filterDataByDate(this.sales);
        
        return {
            report_type: 'sales',
            generated_at: new Date().toISOString(),
            date_range: {
                from: document.getElementById('date-from')?.value,
                to: document.getElementById('date-to')?.value
            },
            summary: {
                total_sales: this.getTotalSales(filteredSales),
                invoice_count: filteredSales.length,
                average_sale: this.getAverageSale(filteredSales)
            },
            data: filteredSales
        };
    }

    prepareInventoryExport() {
        return {
            report_type: 'inventory',
            generated_at: new Date().toISOString(),
            summary: {
                total_products: this.products.length,
                total_value: this.products.reduce((sum, product) => {
                    const totalStock = Object.values(product.stock || {}).reduce((sum, qty) => sum + qty, 0);
                    return sum + (totalStock * product.cost_price);
                }, 0)
            },
            data: this.products
        };
    }

    preparePurchasesExport() {
        const filteredPurchases = this.filterDataByDate(this.purchases);
        
        return {
            report_type: 'purchases',
            generated_at: new Date().toISOString(),
            date_range: {
                from: document.getElementById('date-from')?.value,
                to: document.getElementById('date-to')?.value
            },
            summary: {
                total_purchases: this.getTotalPurchases(filteredPurchases),
                order_count: filteredPurchases.length
            },
            data: filteredPurchases
        };
    }
}

export default ReportsModule;