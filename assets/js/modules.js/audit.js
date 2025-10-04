/**
 * نظام سجلات التدقيق
 * @module audit
 */

import storage from './storage.js';

/**
 * تسجيل عملية تدقيق
 * @param {string} userId - معرف المستخدم
 * @param {string} action - العملية
 * @param {string} resource - المورد
 * @param {any} oldValue - القيمة القديمة
 * @param {any} newValue - القيمة الجديدة
 */
export async function audit(userId, action, resource, oldValue, newValue) {
    try {
        const log = {
            id: generateId('audit_'),
            user_id: userId,
            action,
            resource,
            old_value: oldValue,
            new_value: newValue,
            timestamp: new Date().toISOString(),
            ip: await getClientIP(),
            user_agent: navigator.userAgent
        };
        
        await storage.save('audit_logs', log);
    } catch (error) {
        console.error('فشل في تسجيل التدقيق:', error);
    }
}

/**
 * الحصول على IP العميل
 * @returns {Promise<string>}
 */
async function getClientIP() {
    try {
        // في المتصفح، لا يمكن الحصول على IP الحقيقي
        // هذا مجرد محاكاة
        return 'local';
    } catch (error) {
        return 'unknown';
    }
}

/**
 * الحصول على سجلات التدقيق
 * @param {object} filters - عوامل التصفية
 * @returns {Promise}
 */
export async function getAuditLogs(filters = {}) {
    try {
        let logs = await storage.getAll('audit_logs');
        
        // تطبيق عوامل التصفية
        if (filters.user_id) {
            logs = logs.filter(log => log.user_id === filters.user_id);
        }
        
        if (filters.action) {
            logs = logs.filter(log => log.action === filters.action);
        }
        
        if (filters.resource) {
            logs = logs.filter(log => log.resource === filters.resource);
        }
        
        if (filters.start_date) {
            logs = logs.filter(log => new Date(log.timestamp) >= new Date(filters.start_date));
        }
        
        if (filters.end_date) {
            logs = logs.filter(log => new Date(log.timestamp) <= new Date(filters.end_date));
        }
        
        // الترتيب حسب التاريخ (الأحدث أولاً)
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        return logs;
    } catch (error) {
        console.error('فشل في جلب سجلات التدقيق:', error);
        return [];
    }
}

/**
 * تصدير سجلات التدقيق
 * @param {object} filters - عوامل التصفية
 * @returns {Promise}
 */
export async function exportAuditLogs(filters = {}) {
    const logs = await getAuditLogs(filters);
    const users = await storage.getAll('users');
    
    // إضافة معلومات المستخدم
    const enrichedLogs = logs.map(log => {
        const user = users.find(u => u.id === log.user_id);
        return {
            ...log,
            user_name: user ? user.fullname : 'مستخدم غير معروف',
            user_role: user ? user.role : 'غير معروف'
        };
    });
    
    return enrichedLogs;
}