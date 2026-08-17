import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://betsquad.pages.dev';

test.describe('FootballPoints public smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', error => console.error('PAGEERROR:', error.message));
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
    await expect(page.locator('body')).not.toContainText('Script error');
    await expect(page.locator('#app')).not.toBeEmpty();
  });

  test('main navigation buttons work', async ({ page }) => {
    for (const label of ['Home', 'Rooms', 'Rounds', 'Friendly', 'Leaderboard', 'Login']) {
      const button = page.getByRole('button', { name: label, exact: true }).first();
      await expect(button).toBeVisible();
      await button.click();
      await expect(page.locator('body')).not.toContainText('Script error');
      await expect(page.locator('#app')).not.toBeEmpty();
    }
  });

  test('login/register controls respond', async ({ page }) => {
    await page.getByRole('button', { name: 'Login', exact: true }).first().click();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.locator('#authMsg')).toContainText('Enter your email and password');
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await expect(page.locator('#authMsg')).toContainText('Enter your name, a valid email');
  });

  test('matches page loads and match-detail player selection controls work', async ({ page }) => {
    await page.evaluate(() => window.go('matches'));
    await expect(page.locator('main.wrap')).toBeVisible();
    await page.waitForFunction(() => Array.isArray(window.state?.fixtures) && window.state.fixtures.length > 0, null, { timeout: 30000 });
    const fixtureId = await page.evaluate(() => window.state.fixtures[0].id);
    await page.evaluate(id => window.openMatch(id), fixtureId);
    await expect(page.locator('text=Players for this match')).toBeVisible({ timeout: 10000 });
    const pick = page.getByRole('button', { name: /PICK$/ }).first();
    await expect(pick).toBeVisible({ timeout: 10000 });
    await pick.click();
    await expect(page.locator('text=✓ PICKED')).toBeVisible();
    await page.getByRole('button', { name: /✓ PICKED/ }).first().click();
    await expect(page.locator('body')).not.toContainText('Script error');
  });
});
