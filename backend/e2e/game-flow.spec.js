const { test, expect } = require('@playwright/test');

test('a player can register, play a teams round, and reach the results screen', async ({ page }) => {
  await page.addInitScript(() => {
    window.__API_URL__ = 'http://127.0.0.1:3000/api';
  });

  const username = `e2e${Date.now()}`;
  await page.goto('/index.html');
  await page.getByRole('link', { name: /jugar/i }).click();
  await expect(page).toHaveURL(/select-mode\.html$/);
  await page.locator('.mode-card').first().click();
  await expect(page).toHaveURL(/login\.html$/);

  await page.getByRole('button', { name: 'Registrarse' }).click();
  await page.locator('#regUsername').fill(username);
  await page.locator('#regPassword').fill('password123');
  await page.getByRole('button', { name: /crear cuenta/i }).click();
  await expect(page).toHaveURL(/index\.html\?registered=1$/);

  await page.getByRole('link', { name: /jugar/i }).click();
  await page.locator('.mode-card').first().click();
  await expect(page).toHaveURL(/game\.html$/);
  await expect(page.locator('.option-btn').first()).toBeVisible();

  for (let question = 0; question < 10; question += 1) {
    await page.locator('.option-btn').first().click();
    if (question < 9) {
      await expect(page.locator('#progressLabel')).toHaveText(`${question + 2} / 10`, { timeout: 5_000 });
    }
  }

  await expect(page).toHaveURL(/results\.html$/, { timeout: 10_000 });
  await expect(page.locator('#resultLabel')).toHaveText('respuestas correctas');
  await expect(page.locator('#resultScore')).toHaveText(/\d+/);
});
