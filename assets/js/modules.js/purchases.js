/**
 * وحدة إدارة المشتريات
 * @module purchases
 */

import storage from '../storage.js';
import auth from '../auth.js';
import { showToast, formatCurrency, generateId } from '../utils/helpers.js';
import { audit } from '../utils/audit.js';

class PurchasesModule {
    constructor() {
        this.purchases = [];
        this.suppliers = [];
        this.products = [];
    }

    async show(params = []) {
        await this.loadData();
        this.render();
        this.setupEventListeners();
    }

    async hide() {
        this.cleanupEventListeners();
    }

    async loadData() {
        try {
            this.purchases = await storage.getAll('purchases');
            this.suppliers = await storage.getAll('suppliers');
            this.products = await storage.getAll('products');
        } catch (error) {
            console.error('خطأ في تحميل بيانات المشتريات:', error);
            showToast('فشل في تحميل بيانات المشتريات', 'error');
        }
    }

    render() {
        const contentArea = document.getElementById('content-area');
        
        contentArea.innerHTML = `
            <div class="purchases-module">
                <div class="module-header">
                    <h1>إدارة المشتريات</h1>
                    <div class="header-actions">
                        <button class="btn-primary" id="add-purchase-btn">
                            إضافة أمر شراء
                        </button>
                        <button class="btn-secondary" id="add-supplier-btn">
                            إضافة مورد
                        </button>
                    </div>
                </div>

                <div class="tabs">
                    <div class="tab active" data-tab="purchases">أوامر الشراء</div>
                    <div class="tab" data-tab="suppliers">الموردين</div>
                </div>

                <div id="purchases-content">
                    ${this.renderPurchasesView()}
                </div>
            </div>
        `;
    }

    renderPurchasesView() {
        return `
            <div class="purchases-view">
                <div class="view-actions">
                    <div class="search-box">
                        <input type="text" id="purchase-search" placeholder="بحث في أوامر الشراء..." class="neu-input">
                    </div>
                    <div class="filters">
                        <select id="status-filter" class="neu-input">
                            <option value="">جميع الحالات</option>
                            <option value="pending">معلق</option>
                            <option value="received">مستلم</option>
                            <option value="cancelled">ملغى</option>
                        </select>
                    </div>
                </div>

                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>رقم الأمر</th>
                                <th>المورد</th>
                                <th>التاريخ</th>
                                <th>المجموع</th>
                                <th>الحالة</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.renderPurchasesTable()}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderPurchasesTable() {
        return this.purchases.map(purchase => {
            const supplier = this.suppliers.find(s => s.id === purchase.supplier_id);
            
            return `
                <tr>
                    <td>${purchase.po_number}</td>
                    <td>${supplier?.name || 'مورد غير معروف'}</td>
                    <td>${new Date(purchase.order_date).toLocaleDateString('ar-IQ')}</td>
                    <td>${formatCurrency(purchase.total)}</td>
                    <td>
                        <span class="status-badge status-${purchase.status}">
                            ${this.getStatusText(purchase.status)}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon view-purchase" data-id="${purchase.id}">👁</button>
                            <button class="btn-icon edit-purchase" data-id="${purchase.id}">✏</button>
                            ${purchase.status === 'pending' ? 
                                <button class="btn-icon receive-purchase" data-id="${purchase.id}">📥</button> : ''
                            }
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    getStatusText(status) {
        const statusMap = {
            'pending': 'معلق',
            'received': 'مستلم',
            'cancelled': 'ملغى'
        };
        return statusMap[status] || status;
    }

    setupEventListeners() {
        // التبويبات
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetTab = e.target.dataset.tab;
                this.switchTab(targetTab);
            });
        });

        // إضافة أمر شراء
        document.getElementById('add-purchase-btn').addEventListener('click', () => {
            this.showPurchaseForm();
        });

        // إجراءات أوامر الشراء
        document.querySelectorAll('.view-purchase').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const purchaseId = e.target.closest('button').dataset.id;
                this.viewPurchase(purchaseId);
            });
        });

        document.querySelectorAll('.receive-purchase').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const purchaseId = e.target.closest('button').dataset.id;
                this.receivePurchase(purchaseId);
            });
        });
    }

    switchTab(tabName) {
        // تحديث التبويبات النشطة
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // تحديث المحتوى
        const content = document.getElementById('purchases-content');
        if (tabName === 'suppliers') {
            content.innerHTML = this.renderSuppliersView();
        } else {
            content.innerHTML = this.renderPurchasesView();
        }

        this.setupEventListeners();
    }

    renderSuppliersView() {
        return `
            <div class="suppliers-view">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>اسم المورد</th>
                                <th>الهاتف</th>
                                <th>البريد الإلكتروني</th>
                                <th>رقم السجل</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.suppliers.map(supplier => `
                                <tr>
                                    <td>${supplier.name}</td>
                                    <td>${supplier.phone}</td>
                                    <td>${supplier.email}</td>
                                    <td>${supplier.tax_number}</td>
                                    <td>
                                        <div class="action-buttons">
                                            <button class="btn-icon edit-supplier" data-id="${supplier.id}">✏</button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async showPurchaseForm(purchaseId = null) {
        const purchase = purchaseId ? this.purchases.find(p => p.id === purchaseId) : null;
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal neu" style="max-width: 800px;">
                <div class="modal-header">
                    <h2>${purchase ? 'تعديل أمر الشراء' : 'إضافة أمر شراء جديد'}</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <form id="purchase-form" class="modal-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="purchase-supplier">المورد</label>
                            <select id="purchase-supplier" required class="neu-input">
                                <option value="">اختر المورد</option>
                                ${this.suppliers.map(s => `
                                    <option value="${s.id}" ${purchase?.supplier_id === s.id ? 'selected' : ''}>
                                        ${s.name}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="purchase-date">تاريخ الطلب</label>
                            <input type="date" id="purchase-date" required class="neu-input" 
                                   value="${purchase?.order_date ? purchase.order_date.split('T')[0] : new Date().toISOString().split('T')[0]}">
                        </div>
                    </div>

                    <div class="form-group">
                        <label>المنتجات</label>
                        <div id="purchase-items">
                            ${purchase ? this.renderPurchaseItems(purchase.items) : this.renderEmptyPurchaseItems()}
                        </div>
                        <button type="button" class="btn-secondary" id="add-purchase-item">إضافة منتج</button>
                    </div>

                    <div class="purchase-summary">
                        <div class="summary-row">
                            <span>المجموع الفرعي:</span>
                            <span id="purchase-subtotal">0.00</span>
                        </div>
                        <div class="summary-row">
                            <span>الضريبة:</span>
                            <span id="purchase-tax">0.00</span>
                        </div>
                        <div class="summary-row total">
                            <span>الإجمالي:</span>
                            <span id="purchase-total">0.00</span>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn-secondary" id="cancel-purchase-form">إلغاء</button>
                        <button type="submit" class="btn-primary">${purchase ? 'تحديث' : 'إضافة'}</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        this.setupPurchaseFormListeners(modal, purchase);
        this.calculatePurchaseTotal();
    }

    renderPurchaseItems(items = []) {
        if (items.length === 0) {
            return this.renderEmptyPurchaseItems();
        }

        return items.map((item, index) => {
            const product = this.products.find(p => p.id === item.product_id);
            return `
                <div class="purchase-item-row" data-index="${index}">
                    <select name="product" class="neu-input" required>
                        <option value="">اختر المنتج</option>
                        ${this.products.map(p => `
                            <option value="${p.id}" ${item.product_id === p.id ? 'selected' : ''}>
                                ${p.name?.ar} (${p.sku})
                            </option>
                        `).join('')}
                    </select>
                    <input type="number" name="quantity" step="1" required 
                           class="neu-input" placeholder="الكمية" value="${item.quantity}">
                    <input type="number" name="price" step="0.01" required 
                           class="neu-input" placeholder="السعر" value="${item.unit_price}">
                    <button type="button" class="btn-icon remove-purchase-item">🗑</button>
                </div>
            `;
        }).join('');
    }

    renderEmptyPurchaseItems() {
        return `
            <div class="purchase-item-row" data-index="0">
                <select name="product" class="neu-input" required>
                    <option value="">اختر المنتج</option>
                    ${this.products.map(p => `
                        <option value="${p.id}">${p.name?.ar} (${p.sku})</option>
                    `).join('')}
                </select>
                <input type="number" name="quantity" step="1" required 
                       class="neu-input" placeholder="الكمية" value="1">
                <input type="number" name="price" step="0.01" required 
                       class="neu-input" placeholder="السعر" value="0">
                <button type="button" class="btn-icon remove-purchase-item">🗑</button>
            </div>
        `;
    }

    setupPurchaseFormListeners(modal, purchase) {
        modal.querySelector('.modal-close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.querySelector('#cancel-purchase-form').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.querySelector('#add-purchase-item').addEventListener('click', () => {
            this.addPurchaseItemRow(modal);
        });

        // إعادة حساب الإجمالي عند تغيير القيم
        modal.querySelectorAll('input[name="quantity"], input[name="price"]').forEach(input => {
            input.addEventListener('input', () => {
                this.calculatePurchaseTotal();
            });
        });

        modal.querySelector('#purchase-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.savePurchase(purchase?.id);
            document.body.removeChild(modal);
        });
    }

    addPurchaseItemRow(modal) {
        const itemsContainer = modal.querySelector('#purchase-items');
        const newIndex = itemsContainer.children.length;
        
        const newRow = document.createElement('div');
        newRow.className = 'purchase-item-row';
        newRow.setAttribute('data-index', newIndex);
        newRow.innerHTML = `
            <select name="product" class="neu-input" required>
                <option value="">اختر المنتج</option>
                ${this.products.map(p => `
                    <option value="${p.id}">${p.name?.ar} (${p.sku})</option>
                `).join('')}
            </select>
            <input type="number" name="quantity" step="1" required 
                   class="neu-input" placeholder="الكمية" value="1">
            <input type="number" name="price" step="0.01" required 
                   class="neu-input" placeholder="السعر" value="0">
            <button type="button" class="btn-icon remove-purchase-item">🗑</button>
        `;

        itemsContainer.appendChild(newRow);

        // إعداد معالجات الأحداث للصف الجديد
        newRow.querySelector('.remove-purchase-item').addEventListener('click', () => {
            if (itemsContainer.children.length > 1) {
                newRow.remove();
                this.calculatePurchaseTotal();
            }
        });

        newRow.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', () => {
                this.calculatePurchaseTotal();
            });
        });
    }

    calculatePurchaseTotal() {
        const form = document.getElementById('purchase-form');
        if (!form) return;

        let subtotal = 0;
        
        form.querySelectorAll('.purchase-item-row').forEach(row => {
            const quantity = parseFloat(row.querySelector('input[name="quantity"]').value) || 0;
            const price = parseFloat(row.querySelector('input[name="price"]').value) || 0;
            subtotal += quantity * price;
        });

        const tax = subtotal * 0.05; // افتراضي 5%
        const total = subtotal + tax;

        document.getElementById('purchase-subtotal').textContent = formatCurrency(subtotal);
        document.getElementById('purchase-tax').textContent = formatCurrency(tax);
        document.getElementById('purchase-total').textContent = formatCurrency(total);
    }

    async savePurchase(purchaseId = null) {
        const form = document.getElementById('purchase-form');
        const supplierId = document.getElementById('purchase-supplier').value;
        const orderDate = document.getElementById('purchase-date').value;
        
        // جمع العناصر
        const items = [];
        form.querySelectorAll('.purchase-item-row').forEach(row => {
            const productSelect = row.querySelector('select[name="product"]');
            const quantityInput = row.querySelector('input[name="quantity"]');
            const priceInput = row.querySelector('input[name="price"]');
            
            if (productSelect.value && quantityInput.value && priceInput.value) {
                items.push({
                    product_id: productSelect.value,
                    quantity: parseInt(quantityInput.value),
                    unit_price: parseFloat(priceInput.value)
                });
            }
        });

        if (items.length === 0) {
            showToast('يجب إضافة منتج واحد على الأقل', 'error');
            return;
        }

        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const tax = subtotal * 0.05;
        const total = subtotal + tax;

        const purchaseData = {
            supplier_id: supplierId,
            order_date: orderDate,
            items: items,
            subtotal: subtotal,
            tax_amount: tax,
            total: total,
            status: 'pending'
        };

        try {
            if (purchaseId) {
                purchaseData.id = purchaseId;
                await storage.save('purchases', purchaseData);
                await audit(auth.getCurrentUser().id, 'UPDATE', 'purchases', 
                           this.purchases.find(p => p.id === purchaseId), purchaseData);
                showToast('تم تحديث أمر الشراء بنجاح', 'success');
            } else {
                purchaseData.id = generateId('pur_');
                purchaseData.po_number = PO-${Date.now()};
                purchaseData.created_at = new Date().toISOString();
                purchaseData.created_by = auth.getCurrentUser().id;
                
                await storage.save('purchases', purchaseData);
                await audit(auth.getCurrentUser().id, 'CREATE', 'purchases', null, purchaseData);
                showToast('تم إضافة أمر الشراء بنجاح', 'success');
            }

            await this.loadData();
            this.render();
            this.setupEventListeners();
        } catch (error) {
            console.error('خطأ في حفظ أمر الشراء:', error);
            showToast('فشل في حفظ أمر الشراء', 'error');
        }
    }

    async receivePurchase(purchaseId) {
        try {
            const purchase = this.purchases.find(p => p.id === purchaseId);
            if (!purchase) return;

            // تحديث حالة الأمر
            purchase.status = 'received';
            purchase.received_at = new Date().toISOString();
            
            // تحديث المخزون
            const stockUpdates = [];
            for (const item of purchase.items) {
                const product = this.products.find(p => p.id === item.product_id);
                if (product) {
                    const warehouseId = 'warehouse_1'; // يمكن جعله قابل للتحديد
                    const newStock = (product.stock[warehouseId] || 0) + item.quantity;
                    
                    stockUpdates.push({
                        type: 'save',
                        store: 'products',
                        data: {
                            ...product,
                            stock: {
                                ...product.stock,
                                [warehouseId]: newStock
                            }
                        }
                    });

                    // تسجيل حركة المخزون
                    const movement = {
                        id: generateId('mov_'),
                        product_id: item.product_id,
                        warehouse_id: warehouseId,
                        type: 'in',
                        quantity: item.quantity,
                        reference: purchase.id,
                        reference_type: 'purchase',
                        created_by: auth.getCurrentUser().id,
                        created_at: new Date().toISOString()
                    };
                    
                    stockUpdates.push({
                        type: 'save',
                        store: 'stock_movements',
                        data: movement
                    });
                }
            }

            // حفظ التحديثات في معاملة
            await storage.transaction([
                { type: 'save', store: 'purchases', data: purchase },
                ...stockUpdates
            ]);

            await audit(auth.getCurrentUser().id, 'UPDATE', 'purchases', 
                       this.purchases.find(p => p.id === purchaseId), purchase);

            showToast('تم استلام الأمر وتحديث المخزون', 'success');
            
            await this.loadData();
            this.render();
            this.setupEventListeners();
        } catch (error) {
            console.error('خطأ في استلام الأمر:', error);
            showToast('فشل في استلام الأمر', 'error');
        }
    }

    viewPurchase(purchaseId) {
        const purchase = this.purchases.find(p => p.id === purchaseId);
        const supplier = this.suppliers.find(s => s.id === purchase.supplier_id);
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal neu">
                <div class="modal-header">
                    <h2>تفاصيل أمر الشراء</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="purchase-details">
                    <div class="detail-group">
                        <label>رقم الأمر:</label>
                        <span>${purchase.po_number}</span>
                    </div>
                    <div class="detail-group">
                        <label>المورد:</label>
                        <span>${supplier?.name || 'غير معروف'}</span>
                    </div>
                    <div class="detail-group">
                        <label>تاريخ الطلب:</label>
                        <span>${new Date(purchase.order_date).toLocaleDateString('ar-IQ')}</span>
                    </div>
                    <div class="detail-group">
                        <label>الحالة:</label>
                        <span class="status-badge status-${purchase.status}">
                            ${this.getStatusText(purchase.status)}
                        </span>
                    </div>
                    
                    <h3>المنتجات</h3>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>المنتج</th>
                                    <th>الكمية</th>
                                    <th>سعر الوحدة</th>
                                    <th>المجموع</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${purchase.items.map(item => {
                                    const product = this.products.find(p => p.id === item.product_id);
                                    return `
                                        <tr>
                                            <td>${product?.name?.ar || 'منتج غير معروف'}</td>
                                            <td>${item.quantity}</td>
                                            <td>${formatCurrency(item.unit_price)}</td>
                                            <td>${formatCurrency(item.quantity * item.unit_price)}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="purchase-totals">
                        <div class="total-row">
                            <span>المجموع الفرعي:</span>
                            <span>${formatCurrency(purchase.subtotal)}</span>
                        </div>
                        <div class="total-row">
                            <span>الضريبة:</span>
                            <span>${formatCurrency(purchase.tax_amount)}</span>
                        </div>
                        <div class="total-row total">
                            <span>الإجمالي:</span>
                            <span>${formatCurrency(purchase.total)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.modal-close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    }

    cleanupEventListeners() {
        // تنظيف المعالجات
    }
}

export default PurchasesModule;