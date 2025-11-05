import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth.helper';
import {
  createTestUser,
  cleanupTestUser,
  createTestOrganization,
  cleanupTestOrganization,
} from '../helpers/database.helper';

test.describe('Care Plan Management', () => {
  const testEmail = `org-admin-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  let organizationId: string;

  test.beforeEach(async () => {
    const org = await createTestOrganization({
      name: 'Test Care Home',
      type: 'care_home',
    });
    organizationId = org.id;

    await createTestUser({
      email: testEmail,
      name: 'Test Org Admin',
      role: 'organization_admin',
    });
  });

  test.afterEach(async () => {
    await cleanupTestUser(testEmail);
    await cleanupTestOrganization(organizationId);
  });

  test('should display care plans list', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    await authHelper.login({
      email: testEmail,
      password: testPassword,
    });

    await page.goto('/organization/care-plans');

    await expect(page.locator('h1')).toContainText(/care plan/i);
  });

  test('should navigate to create care plan page', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    await authHelper.login({
      email: testEmail,
      password: testPassword,
    });

    await page.goto('/organization/care-plans');
    await page.click('text=Create Care Plan');

    await expect(page).toHaveURL(/\/organization\/care-plans\/create/);
  });

  test('should show AI assistant for care plan creation', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    await authHelper.login({
      email: testEmail,
      password: testPassword,
    });

    await page.goto('/organization/care-plans/create');

    await expect(page.locator('text=/AI.*assist/i')).toBeVisible();
  });
});
