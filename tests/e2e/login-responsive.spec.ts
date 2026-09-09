import { test, expect } from '@playwright/test';

test.describe('Responsive Enterprise Login Page', () => {
  test('renders correctly across mobile, tablet, and desktop viewports', async ({ page }, testInfo) => {
    await page.goto('/login');
    await page.waitForSelector('form');

    // Basic accessibility and content assertions
    await expect(page.getByLabel(/work email/i)).toBeVisible();
    await expect(page.getByLabel(/^password/i)).toBeVisible();
    const submitButton = page.getByRole('button', { name: /sign in to workspace/i });
    await expect(submitButton).toBeVisible();

    // Verify minimum touch target height (>= 44px)
    const buttonBox = await submitButton.boundingBox();
    expect(buttonBox).not.toBeNull();
    if (buttonBox) {
      expect(buttonBox.height).toBeGreaterThanOrEqual(44);
    }

    // Viewport-specific responsive layout assertions
    if (testInfo.project.name === 'desktop') {
      // Desktop two-column layout: left brand column is visible
      const brandHeading = page.getByRole('heading', {
        name: /unified intelligence for multi-location enterprise brands/i,
      });
      await expect(brandHeading).toBeVisible();
    } else {
      // Mobile & Tablet: left sidebar is collapsed / hidden
      const brandAside = page.locator('aside');
      await expect(brandAside).toBeHidden();

      // Ensure no horizontal overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBe(false);
    }

    // Capture responsive screenshot artifact
    await page.screenshot({
      path: `tests/e2e/screenshots/${testInfo.project.name}-login.png`,
      fullPage: true,
    });
  });

  test('validates required fields and demonstrates client validation', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('form');

    const submitButton = page.getByRole('button', { name: /sign in to workspace/i });
    await submitButton.click();

    // Field level validation messages appear
    await expect(page.getByText(/email address is required/i)).toBeVisible();
    await expect(page.getByText(/password is required/i)).toBeVisible();

    // Input attributes update with aria-invalid
    const emailInput = page.getByLabel(/work email/i);
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true');
  });

  test('toggles password visibility with accessible button', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('form');

    const passwordInput = page.getByLabel(/^password/i);
    const toggleButton = page.getByRole('button', { name: /show password/i });

    await expect(passwordInput).toHaveAttribute('type', 'password');
    await toggleButton.click();

    await expect(passwordInput).toHaveAttribute('type', 'text');
    await expect(page.getByRole('button', { name: /hide password/i })).toBeVisible();
  });
});
