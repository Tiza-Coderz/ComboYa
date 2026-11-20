/** Códigos cortos de pedido: CY-1234 (4 a 6 dígitos). */
export const PATRON_CODIGO = /^CY-\d{4,6}$/;

export function esCodigoValido(codigo: string): boolean {
  return PATRON_CODIGO.test(codigo);
}

/**
 * Acepta lo que escribe una persona ("cy 1234", "1234", "CY1234") y devuelve
 * el código canónico "CY-1234", o null si no tiene sentido.
 */
export function normalizarCodigo(entrada: string): string | null {
  const limpio = entrada.trim().toUpperCase().replace(/[\s_]/g, "");
  const m = /^(?:CY-?)?(\d{4,6})$/.exec(limpio);
  return m ? `CY-${m[1]}` : null;
}
