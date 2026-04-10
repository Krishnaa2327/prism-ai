import { test, expect, Page } from '@playwright/test';

const UNIQUE = Date.now();
const EMAIL = `aiconf-${UNIQUE}@test.com`;
const PASSWORD = 'password123';

async function login(page: Page) {
  await page.goto('/register');
  await page.fill('[placeholder="My SaaS"]', `AI Conf Org ${UNIQUE}`);
  await page.fill('[placeholder="Alice"]', 'AI User');
  await page.fill('[placeholder="alice@company.com"]', EMAIL);
  await page.fill('[placeholder="8+ characters"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard', { timeout: 10_000 });
}

test.describe('AI Config settings', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/settings/ai');
  });

  test('save button is disabled when instructions unchanged', async ({ page }) => {
    const saveBtn = page.locator('button:has-text("Save changes")');
    await expect(saveBtn).toBeDisabled();
  });

  test('typing enables save button', async ({ page }) => {
    await page.fill('textarea', 'Be extra helpful to new users.');
    const saveBtn = page.locator('button:has-text("Save changes")');
    await expect(saveBtn).toBeEnabled();
  });

  test('saving instructions shows "Saved" confirmation', async ({ page }) => {
    await page.fill('textarea', `Test instruction ${UNIQUE}`);
    await page.click('button:has-text("Save changes")');
    await expect(page.locator('text=✓ Saved')).toBeVisible({ timeout: 5_000 });
  });

  test('discard button resets textarea', async ({ page }) => {
    await page.fill('textarea', 'something temporary');
    await page.click('button:has-text("Discard")');
    const value = await page.locator('textarea').inputValue();
    expect(value).not.toBe('something temporary');
  });
});
