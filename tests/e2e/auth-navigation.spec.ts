import { test, expect } from '@playwright/test';

test.describe('Enterprise Auth & Security Navigation Guards', () => {
  test('forgot password page renders accessible form and navigates back to login', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible();

    const emailInput = page.getByLabel(/work email/i);
    await expect(emailInput).toBeVisible();

    const backLink = page.getByRole('link', { name: /back to sign in/i });
    await backLink.click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('reset password page displays invalid link alert when token parameter is missing', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page.getByRole('heading', { name: /invalid recovery link/i })).toBeVisible();

    const requestLink = page.getByRole('link', { name: /request new recovery link/i });
    await expect(requestLink).toBeVisible();
    await requestLink.click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test('unauthenticated access to /tenants redirects to /login', async ({ page }) => {
    await page.goto('/tenants');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated access to /t/acme-corp redirects to /login', async ({ page }) => {
    await page.goto('/t/acme-corp');
    await expect(page).toHaveURL(/\/login/);
  });
});
