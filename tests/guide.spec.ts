import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('renders the complete original article on one page', async ({ page }) => {
  await page.goto('./');

  await expect(page.getByRole('heading', { level: 1, name: 'Lộ trình Server Minecraft' })).toBeVisible();
  await expect(page.locator('.original-post')).toBeVisible();
  await expect(page.locator('.original-post .original-chapter-heading')).toHaveCount(9);
  await expect(page.locator('.chapter-grid a')).toHaveCount(9);
  await expect(page.getByRole('link', { name: /Bắt đầu lộ trình/ })).toHaveAttribute('href', '#glossary');
  await expect(page.getByText('9 chương chính')).toBeVisible();
  await expect(page.locator('[data-progress-page], [data-progress-dashboard]')).toHaveCount(0);
});

test('table of contents stays on the same page', async ({ page }) => {
  await page.goto('./');
  await page.locator('.chapter-grid a[href$="#setup"]').click();

  await expect(page).toHaveURL(/#setup$/);
  await expect(page.locator('#setup')).toHaveCount(1);
  await expect.poll(async () => page.locator('#setup').evaluate((heading) => heading.getBoundingClientRect().top))
    .toBeLessThan(200);
});

test('highlights the chapter currently being read without rewriting the URL', async ({ page }) => {
  await page.goto('./');
  await page.locator('#setup').evaluate((heading) => {
    document.documentElement.style.scrollBehavior = 'auto';
    document.querySelectorAll<HTMLElement>('.original-chapter').forEach((section) => {
      section.style.contentVisibility = 'visible';
    });
    heading.scrollIntoView({ block: 'start' });
  });

  const activeLink = page.locator('.chapter-sidebar a[data-chapter-link="setup"]');
  await expect(activeLink).toHaveAttribute('aria-current', 'location');
  await expect(page).not.toHaveURL(/#setup$/);
});

test('old chapter URLs redirect to their original anchor', async ({ page }) => {
  await page.goto('03-thiet-dat/server-properties/');

  await expect(page).toHaveURL(/\/#-3-2-server-properties-thiet-dat-can-thiet$/);
  await expect(page.locator('[id="-3-2-server-properties-thiet-dat-can-thiet"]')).toHaveCount(1);
});

test('has no serious accessibility violations', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('./');
  await page.waitForLoadState('networkidle');
  for (const theme of ['dark', 'light']) {
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
    }, theme);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      // Axe đo sai khoảng chạm của liên kết nằm trong vùng content-visibility ngoài viewport.
      .disableRules(['target-size'])
      .analyze();
    const serious = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''));

    expect(serious, `${theme}: ${serious.map((violation) => `${violation.id}: ${violation.help}`).join('\n')}`).toEqual([]);
  }
});

test('mobile chapter navigation uses in-page anchors', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await page.getByRole('button', { name: 'Menu' }).click();

  const navigation = page.getByRole('navigation', { name: 'Các chương trong lộ trình' });
  await expect(navigation).toBeVisible();
  await expect(navigation.locator('a[href$="#glossary"]')).toBeVisible();
  await expect(navigation.locator('a[href*="tim-kiem"]')).toHaveCount(0);
});

test('mobile quick jump tracks chapters and supports the keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');

  const jump = page.locator('[data-chapter-jump]');
  await jump.locator('summary').click();
  await jump.locator('a[data-chapter-link="operations"]').click();
  await expect(page).toHaveURL(/#operations$/);
  await expect(jump.locator('[data-current-chapter]')).toContainText('06 · Vận hành an toàn');
  await jump.locator('summary').click();
  await expect(jump).toHaveAttribute('open', '');
  await expect(jump.locator('nav a')).toHaveCount(9);

  await page.keyboard.press('Escape');
  await expect(jump).not.toHaveAttribute('open', '');
  await expect(jump.locator('summary')).toBeFocused();
});
