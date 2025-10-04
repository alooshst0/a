/**
 * دوال مساعدة - بدون ES Modules
 */

function showToast(message, type, duration) {
    if (!type) type = 'success';
    if (!duration) duration = 5000;
    
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠';
    toast.innerHTML = '<span>' + icon + '</span><span>' + message + '</span>';
    
    container.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, duration);
    
    toast.addEventListener('click', () => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    });
}

function formatCurrency(amount, currency) {
    if (!currency) currency = 'IQD';
    return new Intl.NumberFormat('ar-IQ', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0
    }).format(amount);
}

function formatDate(date, locale) {
    if (!locale) locale = 'ar-IQ';
    return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(new Date(date));
}

function generateId(prefix) {
    if (!prefix) prefix = '';
    return prefix + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// جعل الدوال متاحة globally
window.showToast = showToast;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.generateId = generateId;
