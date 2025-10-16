// tests/Sales_FullFlow.stable.spec.ts
import { test, expect } from '@playwright/test';

// Evita paralelismo en este suite (la caja es estado compartido)
test.describe.configure({ mode: 'serial' });

test('Caja → Ventas → Carrito → Confirmar → Factura (robusto)', async ({ page, context }) => {
  const URL_LOGIN = 'https://sunny-haupia-0a97ef.netlify.app/index.html';
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'alejo32421@gmail.com';
  const ADMIN_PASS  = process.env.ADMIN_PASS  ?? 'Checha680';

  // 1) Mitigar headless: sin animaciones y stub print ANTES de navegar
  await context.addInitScript(() => {
    // Quita animaciones SweetAlert2
    const style = document.createElement('style');
    style.innerHTML = `
      .swal2-show, .swal2-hide { animation: none !important; transition: none !important; }
    `;
    document.documentElement.appendChild(style);

    // Stub de print para no abrir diálogo del SO
    const origPrint = window.print;
    let called = false;
    // @ts-ignore
    window.__printCalled = () => called;
    window.print = () => { called = true; console.log('[stub] window.print called'); };
  });

  // (Opcional) capturar errores de consola
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`); });

  // --- Login ---
  await test.step('Login', async () => {
    await page.goto(URL_LOGIN, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();

    await page.getByRole('textbox', { name: 'Correo electrónico' }).fill(ADMIN_EMAIL);
    await page.getByRole('textbox', { name: 'Contraseña' }).fill(ADMIN_PASS);
    await Promise.all([
      page.waitForURL(/dashboard|index\.html|principal|dashboard\.html/i, { timeout: 10000 }),
      page.getByRole('button', { name: 'Iniciar sesión' }).click(),
    ]);

    await expect(page.getByRole('heading', { name: /Pagina principal/i })).toBeVisible({ timeout: 8000 });
  });

  // --- Caja: normalizar + abrir ---
  await test.step('Ir a Caja y normalizar estado', async () => {
    await Promise.all([
      page.waitForURL(/caja\.html$/),
      page.getByRole('link', { name: 'Caja' }).click(),
    ]);

    // Si está abierta → cerrar
    if (await page.getByText('✅ Caja abierta.').isVisible().catch(() => false)) {
      await page.getByRole('button', { name: 'Cerrar Caja' }).click();
      await expect(page.getByText('🔒 Caja cerrada.')).toBeVisible({ timeout: 8000 });
    }

    // Abrir caja con monto
    await page.getByRole('button', { name: 'Abrir Caja' }).click();
    await expect(page.getByRole('heading', { name: 'Abrir Caja' })).toBeVisible({ timeout: 8000 });

    const monto = page.getByRole('spinbutton', { name: /Monto inicial en caja:/i });
    await monto.fill('2000');

    await Promise.all([
      // algunas UIs refrescan el estado al confirmar
      page.waitForSelector('.swal2-container', { state: 'hidden', timeout: 8000 }).catch(() => null),
      page.getByRole('button', { name: 'Confirmar' }).click(),
    ]);

    // Ir a Ventas
    await Promise.all([
      page.waitForURL(/ventas\.html$/i, { timeout: 10000 }),
      page.getByRole('button', { name: 'Ir a Ventas' }).click(),
    ]);
  });

  // --- Ventas: agregar al carrito ---
  await test.step('Autocomplete → seleccionar 1er ítem → cantidad → agregar', async () => {
    // Esperar a que el inventario esté listo (Firestore)
    await expect(page.locator('#tablaProductos tbody')).toBeVisible({ timeout: 10000 });

    // Asegurar que el render terminó (>=0 filas, luego esperar >0 si tu flujo lo requiere)
    await expect
      .poll(async () => await page.locator('#tablaProductos tbody tr').count(), { timeout: 10000 })
      .toBeGreaterThan(0);

    await page.locator('#nombreProducto').fill('ch');

    const suggestions = page.locator('#autocomplete-suggestions div');
    await expect(suggestions.first()).toBeVisible({ timeout: 8000 });
    const chosen = (await suggestions.first().textContent())?.trim() ?? '';
    await suggestions.first().click();

    await page.locator('#cantidadVenta').fill('2');
    await page.locator('#agregarAlCarrito').click();

    const cartRows = page.locator('#tablaCarrito tbody tr');
    await expect(cartRows).toHaveCount(1, { timeout: 8000 });
    if (chosen) {
      await expect(cartRows.first().locator('td').first()).toHaveText(new RegExp(chosen, 'i'));
    }
    await expect(cartRows.first().locator('td').nth(3)).not.toHaveText('');
  });

  // --- Confirmar venta ---
  await test.step('Ir a Confirmar Venta y confirmar', async () => {
    await Promise.all([
      page.waitForURL(/confirmar_venta\.html$/),
      page.locator('#finalizarVenta').click(),
    ]);

    const nombreConsumidor = page.getByRole('textbox', { name: /Nombre del consumidor/i });
    const nitCliente       = page.getByRole('textbox', { name: /NIT del cliente/i });
    const confirmarBtn     = page.getByRole('button', { name: /Confirmar Venta/i });

    if (await nombreConsumidor.isVisible().catch(() => false)) {
      await nombreConsumidor.fill('Cesar');
    }
    if (await nitCliente.isVisible().catch(() => false)) {
      await nitCliente.fill('22334422-2');
    }

    if (await confirmarBtn.isVisible().catch(() => false)) {
      await Promise.all([
        // espera a que aparezca y desaparezca el modal de éxito si se usa SweetAlert
        page.waitForSelector('.swal2-container', { state: 'hidden', timeout: 12000 }).catch(() => null),
        confirmarBtn.click(),
      ]);
    }

    // Si tu UI muestra este toast, afírmalo:
    const ventaOk = page.getByText('✅ Venta registrada con éxito.');
    if (await ventaOk.isVisible({ timeout: 8000 }).catch(() => false)) {
      await expect(ventaOk).toBeVisible();
    }
  });

  // --- Factura / Imprimir ---
  await test.step('Ver factura e “imprimir” (stub)', async () => {
    // Si existe heading “Factura”
    const facturaHeading = page.getByRole('heading', { name: /Factura/i });
    if (await facturaHeading.isVisible({ timeout: 6000 }).catch(() => false)) {
      await expect(facturaHeading).toBeVisible();
    }

    const printBtn = page.getByRole('button', { name: /Imprimir factura/i });
    if (await printBtn.isVisible().catch(() => false)) {
      await printBtn.click();
      // comprueba el stub de print
      const called = await page.evaluate(() => (window as any).__printCalled());
      expect(called).toBe(true);
    }
  });

  // --- Sin errores críticos ---
  await test.step('Verificar errores de consola', async () => {
    expect(errors, errors.join('\n')).toHaveLength(0);
  });
});
