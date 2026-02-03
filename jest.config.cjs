/** @type {import('jest').Config} */
module.exports = {
    // テスト環境をブラウザ（dom）にする設定
    testEnvironment: 'jest-environment-jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],

    // TypeScriptとJSXの変換設定（Babelを使用）
    transform: {
        '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['@babel/preset-env', ['@babel/preset-react', { runtime: 'automatic' }], '@babel/preset-typescript'] }]
    },

    // CSS/アセットのモック
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js'
    },

    // テストファイルのパターン
    testMatch: ['**/__tests__/**/*.test.(ts|tsx|js|jsx)'],

    // node_modulesを変換から除外
    transformIgnorePatterns: [
        '/node_modules/'
    ],

    // モジュール拡張子
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json']
};
