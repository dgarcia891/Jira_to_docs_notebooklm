module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    setupFiles: ['./tests/setup.cjs'],
    roots: ['<rootDir>/tests']
};
