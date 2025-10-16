// tests/Auth_Basic.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Autenticación - flujo básico', () => {
  const URL_LOGIN = 'https://sunny-haupia-0a97ef.netlify.app/index.html';
  const EMAIL = process.env.E2E_USER_EMAIL ?? 'alejo32421@gmail.com';
  const PASSWORD = process.env.E2E_USER_PASSWORD ?? 'Checha680';

  test('Login exitoso, ver home, logout y ver link de recuperación', async ({ page }) => {

    await test.step('Navegar al login y validar elementos base', async () => {
      await page.goto(URL_LOGIN);
      await expect(page).toHaveTitle(/Login/i);
      await expect(page.getByRole('textbox', { name: 'Correo electrónico' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Contraseña' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
    });

    await test.step('Ingresar credenciales y enviar', async () => {
      await page.getByRole('textbox', { name: 'Correo electrónico' }).fill(EMAIL);
      await page.getByRole('textbox', { name: 'Contraseña' }).fill(PASSWORD);
      await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    });

    await test.step('Validar que carga la página principal', async () => {
      const mainHeading = page.getByRole('heading', { name: 'Pagina principal' });
      await expect(mainHeading).toBeVisible();
      // Si tu app cambia URL o título, puedes reforzar:
      // await expect(page).toHaveURL(/dashboard|home|principal/i);
      // await expect(page).toHaveTitle(/(Home|Principal)/i);
    });

    await test.step('Cerrar sesión', async () => {
      await page.getByRole('link', { name: 'Cerrar sesión' }).click();
    });

    await test.step('Validar retorno al login y link de recuperación', async () => {
      await expect(page).toHaveURL(/index\.html/i);
      await expect(page.getByText('¿Olvidaste tu contraseña?')).toBeVisible();
    });
  });
});
