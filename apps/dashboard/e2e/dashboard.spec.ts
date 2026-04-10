import { test, expect, Page } from '@playwright/test';

const UNIQUE = Date.now();
const EMAIL = `dash-${UNIQUE}@test.com`;
const PASSWORD = 'password123';

// Shared login helper
async function login(page: Page) {
  await page.goto('/register');
  await page.fill('[placeholder="My SaaS"]', `Dash Org ${UNIQUE}`);
  await page.fill('[placeholder="Alice"]', 'Dash User');
  await page.fill('[placeholder="alice@company.com"]', EMAIL);
  await page.fill('[placeholder="8+ characters"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard', { timeout: 10_000 });
}

test.describe('Dashboard pages', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('dashboard shows 4 metric cards', async ({ page }) => {
    const cards = page.locator('.bg-white.rounded-xl.border');
    await expect(cards).toHaveCount(4, { timeout: 8_000 });
  });

  test('sidebar navigation works', async ({ page }) => {
    await page.click('text=Conversations');
    await expect(page).toHaveURL('/conversations');

    await page.click('text=Analytics');
    await expect(page).toHaveURL('/analytics');

    await page.click('text=AI Config');
    await expect(page).toHaveURL('/settings/ai');

    await page.click('text=Widget');
    await expect(page).toHaveURL('/settings/widget');

    await page.click('text=Billing');
    await expect(page).toHaveURL('/settings/billing');
  });

  test('conversations page shows table or empty state', async ({ page }) => {
    await page.goto('/conversations');
    // Either shows a table header or the empty state message
    const hasTable = await page.locator('table').isVisible();
    const hasEmpty = await page.locator('text=No conversations yet').isVisible();
    expect(hasTable || hasEmpty).toBe(true);
  });

  test('analytics page loads charts section', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page.locator('text=Conversations per day')).toBeVisible({ timeout: 8_000 });
  });

  test('AI config page shows save button', async ({ page }) => {
    await page.goto('/settings/ai');
    await expect(page.locator('button:has-text("Save changes")')).toBeVisible();
  });

  test('widget page shows API key and snippet', async ({ page }) => {
    await page.goto('/settings/widget');
    await expect(page.locator('text=API Key')).toBeVisible();
    await expect(page.locator('text=Copy snippet')).toBeVisible({ timeout: 8_000 });
  });

  test('billing page shows current plan', async ({ page }) => {
    await page.goto('/settings/billing');
    await expect(page.locator('text=Current plan')).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('text=Available plans')).toBeVisible();
  });
});
