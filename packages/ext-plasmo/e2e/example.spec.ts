import { test, expect } from '@playwright/test';

test('scaffold test', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page).toHaveTitle(/Example Domain/);
});

// TODO: To test the extension proper:
// 1. Build the extension: pnpm build
// 2. Load it in Playwright using args:
//    args: [
//      `--disable-extensions-except=${pathToExtension}`,
//      `--load-extension=${pathToExtension}`,
//    ],
