import { test, expect } from '@playwright/test';

async function login(page, username, password) {
  await page.waitForSelector('#username', { state: 'visible', timeout: 30000 });
  await page.fill('#username', username);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
}

test.describe('Admin Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await login(page, 'AdminTsutome', 'AdminTsutome');
    await expect(page).toHaveURL(/.*admin/, { timeout: 30000 });
  });

  test('displays admin dashboard', async ({ page }) => {
    await expect(page.locator('table').first()).toBeVisible({ timeout: 15000 });
  });

  test('shows user list', async ({ page }) => {
    await expect(page.getByText('@leo').first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Admin Access Control', () => {
  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/.*login/, { timeout: 15000 });
  });
});