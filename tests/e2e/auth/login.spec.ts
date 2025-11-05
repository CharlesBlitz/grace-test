import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth.helper';
import { createTestUser, cleanupTestUser } from '../helpers/database.helper';

test.describe('User Login Flow', () => {
  const testEmail = `login-test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  test.beforeEach(async () => {
    await createTestUser({
      email: testEmail,
      name: 'Test Login User',
      role: 'elder',
    });
  });

  test.afterEach(async () => {
    await cleanupTestUser(testEmail);
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    const authHelper = new AuthHelper(page);

    await authHelper.login({
      email: testEmail,
      password: testPassword,
    });

    await expect(page).toHaveURL('/');
    expect(await authHelper.isLoggedIn()).toBe(true);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'WrongPassword123!');

    await page.click('button[type="submit"]');

    await expect(page.locator('text=/invalid|incorrect/i')).toBeVisible();
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('/wellness');

    await expect(page).toHaveURL(/\/login/);
  });

  test('should remember redirect path after login', async ({ page }) => {
    await page.goto('/wellness');
    await expect(page).toHaveURL(/\/login\?redirect/);

    const authHelper = new AuthHelper(page);
    await authHelper.login({
      email: testEmail,
      password: testPassword,
    });

    await expect(page).toHaveURL('/wellness');
  });
});
