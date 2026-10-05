/**
 * E2E opcional: se omite si no hay DATABASE_URL / DB_HOST configurado.
 * Las pruebas de idempotencia/409/finalizar viven como unit tests en src/tracking/*.spec.ts.
 */
const hasDb =
  Boolean(process.env.DATABASE_URL) || Boolean(process.env.DB_HOST);

(hasDb ? describe : describe.skip)('TrackingModule (e2e)', () => {
  it('placeholder: requiere DB en vivo para flujo HTTP completo', () => {
    expect(hasDb).toBe(true);
  });
});
