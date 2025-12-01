import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E テスト設定
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // テストディレクトリ
  testDir: './e2e',
  
  // テストファイルパターン
  testMatch: '**/*.spec.ts',
  
  // 並列実行
  fullyParallel: true,
  
  // CIでは再試行しない
  retries: process.env.CI ? 2 : 0,
  
  // CI環境では並列ワーカー数を制限
  workers: process.env.CI ? 1 : undefined,
  
  // レポーター設定
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  
  // 共通設定
  use: {
    // 本番環境に対してテスト実行
    baseURL: process.env.E2E_BASE_URL || 'https://tsutomeapp.com',
    
    // トレース（テスト失敗時に収集）
    trace: 'on-first-retry',
    
    // スクリーンショット（テスト失敗時）
    screenshot: 'only-on-failure',
    
    // ビデオ録画（テスト失敗時）
    video: 'on-first-retry',
    
    // タイムアウト
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  // グローバルタイムアウト
  timeout: 60000,
  
  // 期待値のタイムアウト
  expect: {
    timeout: 10000,
  },

  // プロジェクト（ブラウザ）設定
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});