import { test, expect } from '@playwright/test';

async function login(page, username, password) {
  await page.waitForSelector('#username', { state: 'visible', timeout: 30000 });
  await page.fill('#username', username);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
}

test.describe('Tasks - Tsutome', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await login(page, 'leo', 'leococonut8585');
    await expect(page).not.toHaveURL(/.*login/, { timeout: 30000 });
  });

  test('dashboard displays correctly', async ({ page }) => {
    await expect(page.locator('main').first()).toBeVisible({ timeout: 15000 });
  });

  test('navigation works', async ({ page }) => {
    await expect(page.locator('nav').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Profile', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await login(page, 'leo', 'leococonut8585');
    await expect(page).not.toHaveURL(/.*login/, { timeout: 30000 });
  });

  test('profile page is accessible', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.locator('main').first()).toBeVisible({ timeout: 15000 });
  });
});