/**
 * Borrador de la carga de evidencias en sessionStorage: el RAP, la descripción, la fecha y la
 * sesión. Así no se pierde la descripción si la carga falla (RF-24, p5), si la sesión vence a
 * mitad del formulario o si el teléfono recarga la página al volver de la cámara, algo que
 * Android hace cuando le falta memoria. Los archivos no se guardan: hay que volver a elegirlos.
 *
 * Vive solo en esta pestaña y se borra al cargar con éxito. Si el navegador no deja usar el
 * almacenamiento (modo privado), el formulario funciona igual, sin borrador.
 */
export interface Borrador {
  idRap: number | null;
  descripcion: string;
  fecha: string;
  idSesion: number | null;
}

const clave = (idProyecto: number) => `urap:evidencias:${idProyecto}`;

export function borradorVacio(): Borrador {
  return { idRap: null, descripcion: '', fecha: hoyLocal(), idSesion: null };
}

export function leerBorrador(idProyecto: number): Borrador {
  try {
    const guardado = sessionStorage.getItem(clave(idProyecto));
    if (!guardado) {
      return borradorVacio();
    }
    const datos = JSON.parse(guardado) as Partial<Borrador>;
    return {
      idRap: typeof datos.idRap === 'number' ? datos.idRap : null,
      descripcion:
        typeof datos.descripcion === 'string' ? datos.descripcion : '',
      fecha:
        typeof datos.fecha === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(datos.fecha)
          ? datos.fecha
          : hoyLocal(),
      idSesion: typeof datos.idSesion === 'number' ? datos.idSesion : null,
    };
  } catch {
    return borradorVacio();
  }
}

export function guardarBorrador(idProyecto: number, borrador: Borrador): void {
  try {
    sessionStorage.setItem(clave(idProyecto), JSON.stringify(borrador));
  } catch {
    // Sin almacenamiento disponible: el formulario sigue funcionando sin borrador.
  }
}

/** Fecha de hoy en el reloj del dispositivo (AAAA-MM-DD). */
export function hoyLocal(ahora = new Date()): string {
  const dosDigitos = (numero: number) => String(numero).padStart(2, '0');
  return `${ahora.getFullYear()}-${dosDigitos(ahora.getMonth() + 1)}-${dosDigitos(ahora.getDate())}`;
}
