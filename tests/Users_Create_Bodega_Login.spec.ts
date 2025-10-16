// tests/Users_Create_Bodega_Login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Usuarios - Crear usuario de Bodega, cerrar sesión y entrar con ese usuario', () => {
  const URL_LOGIN = 'https://sunny-haupia-0a97ef.netlify.app/index.html';

  // Credenciales del admin (usa variables de entorno si las tienes)
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'alejo32421@gmail.com';
  const ADMIN_PASS  = process.env.ADMIN_PASS  ?? 'Checha680';

  // Datos del nuevo usuario de bodega (únicos por corrida)
  const runId = Date.now();
  const NEW_NAME  = `Usuario de prueba ${runId}`;
  const NEW_EMAIL = `bodega.${runId}@prueba.com`.toLowerCase();
  const NEW_PHONE = '23232323';
  const NEW_PASS  = 'Test12345.'; // cumple “mínimo 8”

  test('Flujo: crear usuario Bodega → logout → login con el nuevo', async ({ page }) => {

    await test.step('Abrir login y validar elementos base', async () => {
      await page.goto(URL_LOGIN);
      await expect(page.getByRole('textbox', { name: 'Correo electrónico' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Contraseña' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
    });

    await test.step('Iniciar sesión como Administrador', async () => {
      await page.getByRole('textbox', { name: 'Correo electrónico' }).fill(ADMIN_EMAIL);
      await page.getByRole('textbox', { name: 'Contraseña' }).fill(ADMIN_PASS);
      await page.getByRole('button', { name: 'Iniciar sesión' }).click();

      // Verifica Home y rol en el header
      await expect(page.getByRole('heading', { name: /Pagina principal/i })).toBeVisible();
      await expect(page.locator('#rol-logueado')).toContainText(/Administrador/i);
    });

    await test.step('Ir a "Usuarios" y validar pantalla', async () => {
      await page.getByRole('link', { name: 'Usuarios' }).click();
      await expect(page.getByRole('heading', { name: /Gestión de Usuarios/i })).toBeVisible();
      // Campos visibles
      await expect(page.getByRole('textbox', { name: /Nombre completo/i })).toBeVisible();
      await expect(page.getByRole('textbox', { name: /Correo electrónico/i })).toBeVisible();
      await expect(page.getByRole('textbox', { name: /Contraseña/i })).toBeVisible();
      await expect(page.getByRole('textbox', { name: /Confirmar contraseña/i })).toBeVisible();
      await expect(page.locator('#rol')).toBeVisible();
      await expect(page.locator('#estado')).toBeVisible();
    });

    await test.step('Completar formulario y guardar usuario de Bodega', async () => {
      await page.getByRole('textbox', { name: /Nombre completo/i }).fill(NEW_NAME);
      await page.getByRole('textbox', { name: /Correo electrónico/i }).fill(NEW_EMAIL);
      await page.getByPlaceholder('Teléfono').fill(NEW_PHONE);
      await page.getByRole('textbox', { name: /Contraseña \(mínimo 8/i }).fill(NEW_PASS);
      await page.getByRole('textbox', { name: /Confirmar contraseña/i }).fill(NEW_PASS);
      await page.locator('#rol').selectOption('Bodega');
      await page.locator('#estado').selectOption('activo');

      await page.getByRole('button', { name: /Guardar Usuario/i }).click();

      // Muchas pantallas usan SweetAlert; validamos si aparece éxito y lo cerramos.
      const successHeading = page.getByRole('heading', { name: /guardado|creado|actualizado|éxito/i });
      if (await successHeading.isVisible({ timeout: 5000 }).catch(() => false)) {
        await page.getByRole('button', { name: 'OK' }).click();
      }

      // Heurística: si hay una tabla/lista, podrías validar que el correo aparece.
      // (Coméntalo si tu UI no lo muestra)
      // await expect(page.getByText(NEW_EMAIL, { exact: false })).toBeVisible();
    });

    await test.step('Cerrar sesión del Administrador', async () => {
      await page.getByRole('link', { name: 'Cerrar sesión' }).click();
      await expect(page).toHaveURL(/index\.html/i);
      await expect(page.getByText(/¿Olvidaste tu contraseña\?/i)).toBeVisible();
    });

    await test.step('Iniciar sesión con el nuevo usuario de Bodega', async () => {
      await page.getByRole('textbox', { name: 'Correo electrónico' }).fill(NEW_EMAIL);
      await page.getByRole('textbox', { name: 'Contraseña' }).fill(NEW_PASS);
      await page.getByRole('button', { name: 'Iniciar sesión' }).click();

      // Validar que entró y que el rol mostrado es Bodega
      await expect(page.getByRole('heading', { name: /Pagina principal/i })).toBeVisible();
      await expect(page.locator('#rol-logueado')).toContainText(/Bodega/i);
    });

    await test.step('(Opcional) Verificar restricciones de rol', async () => {
      // Según tu HTML, algunos links se ocultan según data-rol.
      // Puedes verificar la visibilidad de un enlace permitido y/o la ausencia de uno prohibido.
      // Ejemplo: Inventario permitido para "Bodega"
      await expect(page.getByRole('link', { name: 'Inventario' })).toBeVisible();

      // Ejemplo: Usuarios permitido solo para Administrador (puede estar oculto)
      // Si existe y está oculto por CSS display:none, Playwright igual lo ve en el DOM.
      // Aquí validamos que NO sea visible (si tu UI lo oculta).
      const usuariosLink = page.getByRole('link', { name: 'Usuarios' });
      if (await usuariosLink.count()) {
        await expect(usuariosLink).not.toBeVisible();
      }
    });
  });
});
