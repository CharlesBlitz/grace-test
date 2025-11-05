import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth.helper';
import { cleanupTestUser } from '../helpers/database.helper';

test.describe('User Registration Flow', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  test.afterEach(async () => {
    await cleanupTestUser(testEmail);
  });

  test('should successfully register a new elder user', async ({ page }) => {
    const authHelper = new AuthHelper(page);

    await page.goto('/signup');
    await expect(page).toHaveTitle(/Grace Companion/);

    await page.fill('input[name="name"]', 'Test Elder');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);

    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/register/);
  });

  test('should show validation errors for invalid email', async ({ page }) => {
    await page.goto('/signup');

    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', testPassword);

    await page.click('button[type="submit"]');

    await expect(page.locator('text=Invalid email')).toBeVisible();
  });

  test('should show validation errors for weak password', async ({ page }) => {
    await page.goto('/signup');

    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', '123');

    await page.click('button[type="submit"]');

    await expect(page.locator('text=/password/i')).toBeVisible();
  });

  test('should navigate to voice setup after initial registration', async ({ page }) => {
    await page.goto('/signup');

    await page.fill('input[name="name"]', 'Test Elder Voice');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);

    await page.click('button[type="submit"]');

    await page.waitForURL(/\/register\/voice/);
    await expect(page.locator('text=/voice/i')).toBeVisible();
  });
});
