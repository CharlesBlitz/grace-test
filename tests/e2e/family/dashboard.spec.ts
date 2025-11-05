import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth.helper';
import { createTestUser, cleanupTestUser } from '../helpers/database.helper';

test.describe('Family Dashboard Access', () => {
  const testEmail = `family-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  test.beforeEach(async () => {
    await createTestUser({
      email: testEmail,
      name: 'Test Family Member',
      role: 'family',
    });
  });

  test.afterEach(async () => {
    await cleanupTestUser(testEmail);
  });

  test('should access family dashboard after login', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    await authHelper.login({
      email: testEmail,
      password: testPassword,
    });

    await page.goto('/nok-dashboard');

    await expect(page).toHaveURL('/nok-dashboard');
    await expect(page.locator('h1')).toContainText(/dashboard/i);
  });

  test('should display wellness reports section', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    await authHelper.login({
      email: testEmail,
      password: testPassword,
    });

    await page.goto('/nok-dashboard/wellness-reports');

    await expect(page.locator('text=/wellness|report/i')).toBeVisible();
  });

  test('should display messages section', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    await authHelper.login({
      email: testEmail,
      password: testPassword,
    });

    await page.goto('/nok-dashboard/messages');

    await expect(page.locator('text=/message/i')).toBeVisible();
  });

  test('should access medication reports', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    await authHelper.login({
      email: testEmail,
      password: testPassword,
    });

    await page.goto('/nok-dashboard/medication-reports');

    await expect(page).toHaveURL('/nok-dashboard/medication-reports');
  });
});
