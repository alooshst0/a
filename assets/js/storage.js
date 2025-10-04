/**
 * نظام التخزين المحلي - يدعم LocalStorage و IndexedDB
 * @module storage
 */

// في بداية الملف، تأكد من هذا الكود:
class StorageManager {
    constructor() {
        this.dbName = 'erp_pos_system';
        this.dbVersion = 1;
        this.db = null;
        this.useIndexedDB = 'indexedDB' in window;
        console.log('💾 نظام التخزين:', this.useIndexedDB ? 'IndexedDB' : 'LocalStorage');
        this.init();
    }

    async init() {
        try {
            if (this.useIndexedDB) {
                await this.initIndexedDB();
            } else {
                console.warn('⚠ IndexedDB غير مدعوم، سيتم استخدام LocalStorage فقط');
            }
        } catch (error) {
            console.error('❌ خطأ في تهيئة التخزين:', error);
        }
    }
}

    initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // إنشاء جداول البيانات
                const stores = [
                    'users', 'products', 'bom', 'sales', 'purchases', 
                    'customers', 'suppliers', 'warehouses', 'stock_movements',
                    'audit_logs', 'settings'
                ];
                
                stores.forEach(store => {
                    if (!db.objectStoreNames.contains(store)) {
                        const objectStore = db.createObjectStore(store, { keyPath: 'id' });
                        
                        // إنشاء فهارس للبحث السريع
                        if (store === 'products') {
                            objectStore.createIndex('sku', 'sku', { unique: true });
                            objectStore.createIndex('barcode', 'barcode', { unique: false });
                            objectStore.createIndex('category', 'category', { unique: false });
                        }
                        
                        if (store === 'sales') {
                            objectStore.createIndex('date', 'created_at', { unique: false });
                            objectStore.createIndex('customer_id', 'customer_id', { unique: false });
                        }
                    }
                });
            };
        });
    }

    /**
     * حفظ بيانات
     * @param {string} store - اسم المجموعة
     * @param {object} data - البيانات للحفظ
     * @returns {Promise}
     */
    async save(store, data) {
        if (this.useIndexedDB && this.db) {
            return this.saveToIndexedDB(store, data);
        } else {
            return this.saveToLocalStorage(store, data);
        }
    }

    /**
     * جلب بيانات
     * @param {string} store - اسم المجموعة
     * @param {string} id - المعرف (اختياري)
     * @returns {Promise}
     */
    async get(store, id = null) {
        if (this.useIndexedDB && this.db) {
            return this.getFromIndexedDB(store, id);
        } else {
            return this.getFromLocalStorage(store, id);
        }
    }

    /**
     * حذف بيانات
     * @param {string} store - اسم المجموعة
     * @param {string} id - المعرف
     * @returns {Promise}
     */
    async delete(store, id) {
        if (this.useIndexedDB && this.db) {
            return this.deleteFromIndexedDB(store, id);
        } else {
            return this.deleteFromLocalStorage(store, id);
        }
    }

    /**
     * جلب جميع البيانات من مجموعة
     * @param {string} store - اسم المجموعة
     * @returns {Promise}
     */
    async getAll(store) {
        if (this.useIndexedDB && this.db) {
            return this.getAllFromIndexedDB(store);
        } else {
            return this.getAllFromLocalStorage(store);
        }
    }

    // طرق IndexedDB
    async saveToIndexedDB(store, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([store], 'readwrite');
            const objectStore = transaction.objectStore(store);
            
            // تسجيل وقت التعديل
            if (Array.isArray(data)) {
                data.forEach(item => {
                    if (!item.created_at) item.created_at = new Date().toISOString();
                    item.updated_at = new Date().toISOString();
                });
            } else {
                if (!data.created_at) data.created_at = new Date().toISOString();
                data.updated_at = new Date().toISOString();
            }
            
            const request = Array.isArray(data) 
                ? Promise.all(data.map(item => {
                    return new Promise((res, rej) => {
                        const putRequest = objectStore.put(item);
                        putRequest.onsuccess = () => res(putRequest.result);
                        putRequest.onerror = () => rej(putRequest.error);
                    });
                }))
                : new Promise((res, rej) => {
                    const putRequest = objectStore.put(data);
                    putRequest.onsuccess = () => res(putRequest.result);
                    putRequest.onerror = () => rej(putRequest.error);
                });
            
            transaction.oncomplete = () => resolve(request);
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async getFromIndexedDB(store, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([store], 'readonly');
            const objectStore = transaction.objectStore(store);
            
            const request = id ? objectStore.get(id) : objectStore.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteFromIndexedDB(store, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([store], 'readwrite');
            const objectStore = transaction.objectStore(store);
            
            const request = objectStore.delete(id);
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllFromIndexedDB(store) {
        return this.getFromIndexedDB(store);
    }

    // طرق LocalStorage
    saveToLocalStorage(store, data) {
        return new Promise((resolve) => {
            const key = ${this.dbName}_${store};
            
            if (Array.isArray(data)) {
                // حفظ مجموعة من البيانات
                const existingData = this.getFromLocalStorage(store) || [];
                const newData = [...existingData];
                
                data.forEach(item => {
                    if (!item.id) item.id = this.generateId();
                    if (!item.created_at) item.created_at = new Date().toISOString();
                    item.updated_at = new Date().toISOString();
                    
                    const index = newData.findIndex(d => d.id === item.id);
                    if (index > -1) {
                        newData[index] = { ...newData[index], ...item };
                    } else {
                        newData.push(item);
                    }
                });
                
                localStorage.setItem(key, JSON.stringify(newData));
            } else {
                // حفظ عنصر واحد
                if (!data.id) data.id = this.generateId();
                if (!data.created_at) data.created_at = new Date().toISOString();
                data.updated_at = new Date().toISOString();
                
                const existingData = this.getFromLocalStorage(store) || [];
                const index = existingData.findIndex(d => d.id === data.id);
                
                if (index > -1) {
                    existingData[index] = { ...existingData[index], ...data };
                } else {
                    existingData.push(data);
                }
                
                localStorage.setItem(key, JSON.stringify(existingData));
            }
            
            resolve(data);
        });
    }

    getFromLocalStorage(store, id = null) {
        const key = ${this.dbName}_${store};
        const data = JSON.parse(localStorage.getItem(key) || '[]');
        
        if (id) {
            return data.find(item => item.id === id) || null;
        }
        
        return data;
    }

    deleteFromLocalStorage(store, id) {
        return new Promise((resolve) => {
            const key = ${this.dbName}_${store};
            const data = this.getFromLocalStorage(store);
            const filteredData = data.filter(item => item.id !== id);
            
            localStorage.setItem(key, JSON.stringify(filteredData));
            resolve(true);
        });
    }

    getAllFromLocalStorage(store) {
        return Promise.resolve(this.getFromLocalStorage(store));
    }

    /**
     * إنشاء معاملة (Transaction)
     * @param {Array} operations - قائمة العمليات
     * @returns {Promise}
     */
    async transaction(operations) {
        try {
            const results = [];
            
            for (const op of operations) {
                const { type, store, data, id } = op;
                
                switch (type) {
                    case 'save':
                        results.push(await this.save(store, data));
                        break;
                    case 'get':
                        results.push(await this.get(store, id));
                        break;
                    case 'delete':
                        results.push(await this.delete(store, id));
                        break;
                    default:
                        throw new Error(نوع العملية غير معروف: ${type});
                }
            }
            
            return results;
        } catch (error) {
            console.error('فشلت المعاملة:', error);
            throw error;
        }
    }

    /**
     * تصدير جميع البيانات
     * @returns {Promise}
     */
    async exportData() {
        const stores = [
            'users', 'products', 'bom', 'sales', 'purchases', 
            'customers', 'suppliers', 'warehouses', 'stock_movements',
            'audit_logs', 'settings'
        ];
        
        const data = {};
        
        for (const store of stores) {
            data[store] = await this.getAll(store);
        }
        
        data.exported_at = new Date().toISOString();
        data.version = this.dbVersion;
        
        return data;
    }

    /**
     * استيراد البيانات
     * @param {object} data - البيانات المستوردة
     * @returns {Promise}
     */
    async importData(data) {
        const stores = Object.keys(data).filter(key => 
            !['exported_at', 'version'].includes(key)
        );
        
        const operations = [];
        
        for (const store of stores) {
            if (Array.isArray(data[store])) {
                data[store].forEach(item => {
                    operations.push({
                        type: 'save',
                        store,
                        data: item
                    });
                });
            }
        }
        
        return this.transaction(operations);
    }

    /**
     * توليد معرف فريد
     * @returns {string}
     */
    generateId() {
        return ${Date.now()}_${Math.random().toString(36).substr(2, 9)};
    }
}

// إنشاء نسخة وحيدة من مدير التخزين
const storage = new StorageManager();

export default storage;