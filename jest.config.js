export default {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    moduleNameMapping: {
        '\\.(css|less|scss)$': 'identity-obj-proxy'
    },
    transform: {},
    extensionsToTreatAsEsm: ['.js'],
    testMatch: ['/tests/unit//*.test.js'],
    collectCoverageFrom: [
        'assets/js//*.js',
        '!assets/js/main.js'
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70
        }
    }
};