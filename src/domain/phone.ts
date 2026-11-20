/** Quita espacios, guiones, puntos y paréntesis. Conserva un "+" inicial. */
export function limpiarTelefono(entrada: string): string {
  const t = entrada.trim();
  const mas = t.startsWith("+") ? "+" : "";
  return mas + t.replace(/\D/g, "");
}

/**
 * Teléfono en Cuba → 8 dígitos locales. Acepta "+53 5 234 5678", "0053…", "52345678".
 * Devuelve null si no es válido: los móviles empiezan por 5 y los fijos de
 * La Habana por 7.
 */
export function normalizarTelefonoCuba(entrada: string): string | null {
  let d = limpiarTelefono(entrada).replace(/^\+/, "");
  if (d.startsWith("0053")) d = d.slice(4);
  else if (d.startsWith("53") && d.length === 10) d = d.slice(2);
  return /^[57]\d{7}$/.test(d) ? d : null;
}

/** Número internacional sin "+" para wa.me. Un número cubano de 8 dígitos recibe el 53. */
export function telefonoParaWhatsApp(telefono: string): string {
  const d = limpiarTelefono(telefono).replace(/^\+/, "");
  return /^[57]\d{7}$/.test(d) ? `53${d}` : d;
}

/** "52345678" → "5234 5678"; otros formatos se devuelven tal cual. */
export function formatearTelefonoCuba(telefono: string): string {
  return /^\d{8}$/.test(telefono) ? `${telefono.slice(0, 4)} ${telefono.slice(4)}` : telefono;
}
