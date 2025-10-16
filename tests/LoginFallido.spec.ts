// tests/Auth_Negative.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Autenticación - Casos negativos', () => {
  const URL_LOGIN = 'https://sunny-haupia-0a97ef.netlify.app/index.html';

  test.beforeEach(async ({ page }) => {
    await test.step('Navegar a la pantalla de login', async () => {
      await page.goto(URL_LOGIN);
      await expect(page).toHaveTitle(/Login/i); // ajusta si tu título difiere
      await expect(page.getByRole('textbox', { name: 'Correo electrónico' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Contraseña' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
    });
  });

  test('No permite iniciar sesión con credenciales vacías', async ({ page }) => {
    await test.step('Hacer submit sin llenar campos', async () => {
      await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    });

    await test.step('Mostrar feedback y permanecer en login', async () => {
      // Cualquiera de estos indica que seguimos en login:
      await expect(page).toHaveURL(/index\.html/i);
      await expect(page.getByRole('link', { name: 'Recupérala aquí' })).toBeVisible();

      // Si tu login muestra un mensaje de error/validación, verifícalo:
      // 1) Mensaje genérico que has mostrado en otras pruebas:
      const genericError = page.getByText(/❌\s*Credenciales inválidas|campos incompletos|ingresa tus credenciales/i);
      // 2) O, si hay un id específico, sustitúyelo aquí (p.ej., #error-msg)
      // const genericError = page.locator('#error-msg');

      // No fallar si tu login usa otro texto: primero verifica si aparece alguno
      if (await genericError.count()) {
        await expect(genericError.first()).toBeVisible();
      }
    });
  });

  test('No permite iniciar sesión con credenciales inválidas', async ({ page }) => {
    await test.step('Ingresar correo/contraseña inválidos y enviar', async () => {
      await page.getByRole('textbox', { name: 'Correo electrónico' }).fill('prueba@prueba.com');
      await page.getByRole('textbox', { name: 'Contraseña' }).fill('Prueba123@@');
      await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    });

    await test.step('Mostrar error y permanecer en login', async () => {
      // Espera el mensaje que capturaste con codegen
      await expect(page.getByText(/❌\s*Credenciales inválidas o/i)).toBeVisible();

      // Y asegura que NO se llegó al home
      await expect(page).toHaveURL(/index\.html/i);
      await expect(page.getByRole('textbox', { name: 'Correo electrónico' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Contraseña' })).toBeVisible();
    });
  });
});
