import { test, expect } from '@playwright/test';

const UNIQUE = Date.now();
const EMAIL = `e2e-${UNIQUE}@test.com`;
const PASSWORD = 'password123';
const ORG_NAME = `E2E Org ${UNIQUE}`;

test.describe('Authentication', () => {
  test('register → redirects to dashboard', async ({ page }) => {
    await page.goto('/register');

    await page.fill('[placeholder="My SaaS"]', ORG_NAME);
    await page.fill('[placeholder="Alice"]', 'E2E User');
    await page.fill('[placeholder="alice@company.com"]', EMAIL);
    await page.fill('[placeholder="8+ characters"]', PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard', { timeout: 10_000 });
    await expect(page.locator('#oai-root')).not.toBeVisible(); // widget not on dashboard
  });

  test('logout → redirects to login', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[placeholder="you@company.com"]', EMAIL);
    await page.fill('[placeholder="••••••••"]', PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard', { timeout: 10_000 });

    // Click sign out
    await page.click('button:has-text("Sign out")');
    await expect(page).toHaveURL('/login', { timeout: 5_000 });
  });

  test('login with wrong password shows error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[placeholder="you@company.com"]', EMAIL);
    await page.fill('[placeholder="••••••••"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Invalid email or password')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  test('unauthenticated /dashboard redirects to /login', async ({ page }) => {
    // Clear any stored auth
    await page.evaluate(() => localStorage.clear());
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login', { timeout: 5_000 });
  });
});
