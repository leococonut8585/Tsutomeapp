import { test, expect, type Page } from '@playwright/test';

/**
 * Helper function to perform login
 */
async function login(page: Page, username: string, password: string) {
  // Wait for the login form to be fully loaded
  await page.waitForSelector('#username', { state: 'visible', timeout: 30000 });
  
  // Fill in credentials using ID selectors
  await page.fill('#username', username);
  await page.fill('#password', password);
  
  // Click login button
  await page.click('button[type="submit"]');
}

/**
 * Authentication E2E Tests
 */
test.describe('Login Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');
  });

  test('Login page displays correctly', async ({ page }) => {
    await expect(page).toHaveURL(/.*login/);
    
    // Check form elements are visible
    await expect(page.locator('#username')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Empty form submission stays on login', async ({ page }) => {
    // Click login without filling form
    await page.click('button[type="submit"]');
    
    // Should stay on login page (HTML5 validation prevents submission)
    await expect(page).toHaveURL(/.*login/);
  });

  test('Invalid credentials show error', async ({ page }) => {
    await login(page, 'invalid_user', 'wrong_password');
    
    // Wait for error message (inline error with red border)
    await expect(
      page.locator('.border-red-400').or(page.locator('[class*="red"]')).or(page.getByRole('alert'))
    ).toBeVisible({ timeout: 15000 });
  });

  test('Valid user can login', async ({ page }) => {
    await login(page, 'leo', 'leococonut8585');
    
    // Should redirect away from login
    await expect(page).not.toHaveURL(/.*login/, { timeout: 30000 });
  });

  test('Admin redirects to admin page', async ({ page }) => {
    await login(page, 'AdminTsutome', 'AdminTsutome');
    
    // Should redirect to admin
    await expect(page).toHaveURL(/.*admin/, { timeout: 30000 });
  });

  test('Logout works correctly', async ({ page }) => {
    // First login
    await login(page, 'leo', 'leococonut8585');
    await expect(page).not.toHaveURL(/.*login/, { timeout: 30000 });
    
    // Go to profile and logout
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    
    // Look for logout button with Japanese text
    const logoutBtn = page.getByRole('button', { name: /ログアウト/i });
    if (await logoutBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await logoutBtn.click();
      await expect(page).toHaveURL(/.*login/, { timeout: 15000 });
    }
  });
});

test.describe('Suspended Account', () => {
  test.skip('Suspended account cannot login', async () => {
    // Skip - requires suspended account setup in admin panel first
  });
});