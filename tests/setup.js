/**
 * إعدادات الاختبارات
 */

// Mock للـ localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock للـ IndexedDB
global.indexedDB = {
    open: jest.fn(),
};

// Mock للـ window
global.window = {
    location: {
        hash: ''
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
};