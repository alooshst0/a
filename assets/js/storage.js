/**
 * نظام التخزين المحلي - بدون ES Modules
 */

class StorageManager {
    constructor() {
        this.dbName = 'erp_pos_system';
        this.dbVersion = 1;
        this.db = null;
        this.useIndexedDB = 'indexedDB' in window;
        this.init();
    }

    async init() {
        if (this.useIndexedDB) {
            await this.initIndexedDB();
        } else {
            console.warn('IndexedDB غير مدعوم، سيتم استخدام LocalStorage فقط');
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
                
                const stores = [
                    'users', 'products', 'bom', 'sales', 'purchases', 
                    'customers', 'suppliers', 'warehouses', 'stock_movements',
                    'audit_logs', 'settings'
                ];
                
                stores.forEach(store => {
                    if (!db.objectStoreNames.contains(store)) {
                        const objectStore = db.createObjectStore(store, { keyPath: 'id' });
                        
                        if (store === 'products') {
                            objectStore.createIndex('sku', 'sku', { unique: true });
                            objectStore.createIndex('barcode', 'barcode', { unique: false });
                        }
                    }
                });
            };
        });
    }

    async save(store, data) {
        if (this.useIndexedDB && this.db) {
            return this.saveToIndexedDB(store, data);
        } else {
            return this.saveToLocalStorage(store, data);
        }
    }

    async get(store, id = null) {
        if (this.useIndexedDB && this.db) {
            return this.getFromIndexedDB(store, id);
        } else {
            return this.getFromLocalStorage(store, id);
        }
    }

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

    async getAllFromIndexedDB(store) {
        return this.getFromIndexedDB(store);
    }

    // طرق LocalStorage
    saveToLocalStorage(store, data) {
        return new Promise((resolve) => {
            const key = ${this.dbName}_${store};
            
            if (Array.isArray(data)) {
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

    getAllFromLocalStorage(store) {
        return Promise.resolve(this.getFromLocalStorage(store));
    }

    generateId() {
        return ${Date.now()}_${Math.random().toString(36).substr(2, 9)};
    }

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
}

// إنشاء نسخة عامة بدل export
window.storage = new StorageManager();
