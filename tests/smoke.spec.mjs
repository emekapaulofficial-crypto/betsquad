import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://betsquad.pages.dev';
const TEST_FIXTURE = {
  id: 'accdb633-a2fa-46a1-aa68-f0154e9427eb',
  home_team: 'Arsenal',
  away_team: 'Coventry City',
  kickoff_at: '2026-08-21T19:00:00Z'
};
const TEST_PLAYERS = [
  { id: 'smoke-gk-1', name: 'Smoke GK', club: 'Arsenal', position: 'GK', photo_url: null },
  { id: 'smoke-def-1', name: 'Smoke DEF', club: 'Arsenal', position: 'DEF', photo_url: null },
  { id: 'smoke-mid-1', name: 'Smoke MID', club: 'Arsenal', position: 'MID', photo_url: null },
  { id: 'smoke-st-1', name: 'Smoke ST', club: 'Coventry City', position: 'ST', photo_url: null }
];

async function waitForLogoOverlayToFinish(page) {
  const overlay = page.locator('#fp-logo-overlay');
  if (await overlay.count()) await expect(overlay).toBeHidden({ timeout: 10000 });
}

test.describe('FootballPoints public smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', error => console.error('PAGEERROR:', error.message));
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
    await expect(page.locator('body')).not.toContainText('Script error');
    await expect(page.locator('#app')).not.toBeEmpty();
    await waitForLogoOverlayToFinish(page);
  });

  test('main navigation buttons work', async ({ page }) => {
    for (const label of ['Home', 'Games', 'Rooms', 'Rounds', 'Friendly', 'Leaderboard', 'Login']) {
      const button = page.getByRole('button', { name: label, exact: true }).first();
      await expect(button).toBeVisible();
      await button.click();
      await waitForLogoOverlayToFinish(page);
      await expect(page.locator('body')).not.toContainText('Script error');
      await expect(page.locator('#app')).not.toBeEmpty();
    }
  });

  test('games hub renders all three games', async ({ page }) => {
    await page.getByRole('button', { name: 'Games', exact: true }).first().click();
    await expect(page.getByText('Games', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Whot', { exact: true })).toBeVisible();
    await expect(page.getByText('Dice', { exact: true })).toBeVisible();
    await expect(page.getByText('Snooker', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Find a room', exact: true })).toHaveCount(3);
  });

  test('login/register controls respond', async ({ page }) => {
    await page.getByRole('button', { name: 'Login', exact: true }).first().click();
    await waitForLogoOverlayToFinish(page);
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.locator('#authMsg')).toContainText('Enter your email and password');
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await expect(page.locator('#authMsg')).toContainText('Enter your name, a valid email');
  });

  test('matches route and match-detail player selection controls work', async ({ page }) => {
    await page.evaluate(() => window.go('matches'));
    await waitForLogoOverlayToFinish(page);
    await expect(page.locator('main.wrap')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Script error');

    await page.route('**/rest/v1/players*', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TEST_PLAYERS) });
    });

    await page.evaluate(async fixture => {
      window.state.fixtures = [fixture];
      await window.openMatch(fixture.id);
    }, TEST_FIXTURE);

    await waitForLogoOverlayToFinish(page);
    await expect(page.locator('text=Players for this match')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Arsenal', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Coventry City', { exact: true }).first()).toBeVisible();

    const pick = page.getByRole('button', { name: /PICK$/ }).first();
    await expect(pick).toBeVisible({ timeout: 10000 });
    await pick.click();
    await expect(page.locator('text=✓ PICKED')).toBeVisible();
    await page.getByRole('button', { name: /✓ PICKED/ }).first().click();
    await expect(page.locator('body')).not.toContainText('Script error');
  });
});
