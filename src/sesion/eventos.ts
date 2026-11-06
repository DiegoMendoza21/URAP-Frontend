/**
 * Aviso de que la sesión dejó de valer: el servidor respondió 401 a una petición que la
 * exigía (token vencido, sesión revocada o usuario inactivo). Lo emite el cliente de la API y
 * lo atiende ProveedorSesion, que devuelve al usuario a la pantalla de inicio de sesión.
 */
const oyentes = new Set<() => void>();

export function alInvalidarseLaSesion(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

export function avisarSesionInvalida(): void {
  for (const oyente of oyentes) {
    oyente();
  }
}
