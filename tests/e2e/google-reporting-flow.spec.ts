import { test, expect } from '@playwright/test';

test.describe('Google Reporting & Integrations End-to-End Workflow', () => {
  test.describe.configure({ mode: 'serial' });

  test('Agency Operator: login, integrations management, sync dispatch & reporting dashboard', async ({ page }, testInfo) => {
    // 1. Login as Agency Operator
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    await page.getByLabel(/work email/i).fill('operator@example.com');
    await page.getByLabel(/^password/i).fill('StrongPass123!Secure');
    await page.getByRole('button', { name: /sign in to workspace/i }).click();

    // 2. Organization Selection
    await expect(page).toHaveURL(/\/tenants/, { timeout: 15000 });
    await expect(page.getByText('ABC Dental')).toBeVisible();

    // 3. Navigate to ABC Dental Workspace
    await page.goto('/t/abc-dental');
    await expect(page).toHaveURL(/\/t\/abc-dental/);
    await expect(page.getByRole('heading', { name: /abc dental/i })).toBeVisible();

    // 4. Integrations Management Screen
    await page.goto('/t/abc-dental/integrations');
    await expect(page.getByRole('heading', { name: /google reporting integrations/i })).toBeVisible();

    // Assert Connection Card
    await expect(page.getByText('Google Workspace & Cloud Identity')).toBeVisible();
    await expect(page.getByText(/^connected$/i)).toBeVisible();
    await expect(page.getByRole('main').getByText('operator@example.com')).toBeVisible();

    // Save screenshot of Integrations Management
    await page.screenshot({ path: 'docs/screenshots/integrations-abc-dental.png', fullPage: true });

    // Test Sync Dispatch
    const syncButton = page.getByRole('button', { name: /trigger background sync/i });
    await expect(syncButton).toBeVisible();
    await syncButton.click();

    // Verify sync dispatch notification
    await expect(page.getByText(/synchronization dispatched/i)).toBeVisible({ timeout: 10000 });

    // 5. Reports & Analytics Dashboard
    await page.goto('/t/abc-dental/reports');
    await expect(page.getByRole('heading', { name: /performance & reporting/i })).toBeVisible();

    // Verify KPI Cards Render with Metrics
    await expect(page.getByText('Search Clicks (GSC)')).toBeVisible();
    await expect(page.getByText('Search Impressions')).toBeVisible();
    await expect(page.getByText('Average CTR & Position')).toBeVisible();
    await expect(page.getByText('Business Profile Views')).toBeVisible();
    await expect(page.getByText('Call-Button Clicks', { exact: true })).toBeVisible();
    await expect(page.getByText('Direction Requests', { exact: true })).toBeVisible();
    await expect(page.getByText('Website Visits', { exact: true })).toBeVisible();

    // Wait for data resolution & screenshot of All Locations
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'docs/screenshots/reports-abc-dental-all.png', fullPage: true });

    // Verify Location Filter: Select "Chennai - Anna Nagar"
    const locationSelect = page.locator('#report-location-selector');
    await locationSelect.selectOption({ index: 1 });

    // Wait for filtered data to load
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'docs/screenshots/reports-abc-dental-chennai.png', fullPage: true });

    // Select "Salem - Fairlands"
    await locationSelect.selectOption({ index: 2 });
    await page.waitForTimeout(500);

    // Switch back to "All Locations"
    await locationSelect.selectOption({ index: 0 });
    await page.waitForTimeout(500);

    // Verify Query Dimensions & Device Breakdown
    const dimensionHeader = page.getByText('Granular Dimension Analytics');
    if (testInfo.project.name === 'mobile') {
      await expect(dimensionHeader).toBeAttached();
    } else {
      await dimensionHeader.scrollIntoViewIfNeeded();
      await expect(dimensionHeader).toBeVisible();
      await expect(page.getByText('Top Queries')).toBeVisible();
      await expect(page.getByText('best dentist anna nagar')).toBeVisible();
    }

    // 6. Tenant Isolation: Verify unauthorized workspace access redirects to login
    await page.goto('/t/unauthorized-tenant/reports');
    await expect(page).toHaveURL(/\/login/);
  });

  test('Restricted Client Viewer: sees only assigned location (Chennai) without cross-location bleed', async ({
    page,
  }) => {
    // 1. Login as Restricted Viewer
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    await page.getByLabel(/work email/i).fill('viewer.chennai@abcdental.example');
    await page.getByLabel(/^password/i).fill('StrongPass123!Secure');
    await page.getByRole('button', { name: /sign in to workspace/i }).click();

    await expect(page).toHaveURL(/\/tenants/, { timeout: 15000 });

    // 2. Navigate to ABC Dental Reports
    await page.goto('/t/abc-dental/reports');
    await expect(page.getByRole('heading', { name: /performance & reporting/i })).toBeVisible();

    // Verify Restricted Viewer cannot see Salem
    const locationOptions = await page.locator('#report-location-selector').locator('option').allInnerTexts();
    expect(locationOptions.some((opt) => opt.includes('Salem'))).toBe(false);
    expect(locationOptions.some((opt) => opt.includes('Chennai'))).toBe(true);

    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'docs/screenshots/reports-restricted-viewer.png', fullPage: true });
  });
});
