// tests/Inventory_Delete_One.stable.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Inventario — eliminar un producto (estable)', () => {
  const URL_LOGIN = 'https://sunny-haupia-0a97ef.netlify.app/index.html';
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'alejo32421@gmail.com';
  const ADMIN_PASS  = process.env.ADMIN_PASS  ?? 'Checha680';

  test('Borrar el primer producto y verificar que la tabla disminuye', async ({ page }) => {
    await test.step('Login como Administrador', async () => {
      await page.goto(URL_LOGIN);
      await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
      await page.getByRole('textbox', { name: 'Correo electrónico' }).fill(ADMIN_EMAIL);
      await page.getByRole('textbox', { name: 'Contraseña' }).fill(ADMIN_PASS);
      await page.getByRole('button', { name: 'Iniciar sesión' }).click();
      await expect(page.getByRole('heading', { name: /Pagina principal/i })).toBeVisible();
    });

    await test.step('Ir a Inventario y preparar entorno (sin animaciones)', async () => {
      await page.getByRole('link', { name: 'Inventario' }).click();

      // Quita animaciones de SweetAlert para estabilizar headless
      await page.addStyleTag({ content: `
        .swal2-show, .swal2-hide { animation: none !important; transition: none !important; }
      `});

      // Limpia cualquier filtro
      const search = page.locator('#busquedaProducto');
      if (await search.isVisible()) await search.fill('');

      // Espera a que la tabla esté presente
      await expect(page.locator('#tablaProductos tbody')).toBeVisible();

      // Espera a que “haya algo clickeable” o que no haya productos
      await page.waitForFunction(() => {
        const rows = document.querySelectorAll('#tablaProductos tbody tr').length;
        const anyTrash = !!document.querySelector('#tablaProductos tbody tr td .icon');
        return rows === 0 || anyTrash;
      }, null, { timeout: 8000 });
    });

    const rows = page.locator('#tablaProductos tbody tr');

    await test.step('Verificar que exista al menos 1 fila; si no, saltar', async () => {
      const count = await rows.count();
      if (count === 0) test.skip(true, 'No hay productos para borrar.');
      await expect(rows).toHaveCount(count); // estado estable inicial
    });

    await test.step('Eliminar la primera fila (click en el ícono 🗑️ dentro de la fila)', async () => {
      const before = await rows.count();

      // Selecciona el botón de borrar de la PRIMERA fila (última celda -> span.icon con 🗑️)
      const firstDeleteBtn = rows.first().locator('td:last-child .icon', { hasText: '🗑️' });
      await firstDeleteBtn.waitFor({ state: 'visible' });
      await firstDeleteBtn.click();

      // SweetAlert confirm
      await expect(page.getByRole('heading', { name: '¿Estás seguro?' })).toBeVisible({ timeout: 8000 });
      await page.getByRole('button', { name: 'Sí, eliminar' }).click();

      // SweetAlert éxito
      await expect(page.getByRole('heading', { name: '¡Eliminado!' })).toBeVisible({ timeout: 8000 });
      await page.getByRole('button', { name: 'OK' }).click();

      // Espera a que el número de filas disminuya (Firestore -> re-render)
      await expect
        .poll(async () => await rows.count(), {
          message: 'Esperando a que disminuya el número de filas tras eliminar',
          intervals: [100, 200, 300, 500, 800],
          timeout: 8000,
        })
        .toBeLessThan(before);
    });
  });
});
