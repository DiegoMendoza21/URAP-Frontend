import type { CambioParametro, Parametro } from '@/api/parametros';
import { formatoNumero, type TextoParametro, valorConUnidad } from './textos';

/*
 * El valor que el administrador está editando, antes de guardarlo (HU-03-07). Aquí solo se
 * comprueba lo evidente para no pedir una confirmación inútil (un número fuera del rango que
 * envió el backend, una lista vacía): las reglas las valida el backend, y su mensaje se muestra
 * junto al campo.
 */

export interface Fila {
  /** Solo para React: no cambia al reordenar ni al editar. */
  clave: number;
  texto: string;
}

export type Borrador =
  | { tipo: 'entero'; texto: string }
  | { tipo: 'booleano'; encendido: boolean }
  | { tipo: 'lista'; filas: Fila[]; nuevo: string };

let ultimaClave = 0;

export function nuevaFila(texto: string): Fila {
  ultimaClave += 1;
  return { clave: ultimaClave, texto };
}

export function borradorDe(parametro: Parametro): Borrador {
  switch (parametro.tipoDato) {
    case 'entero':
      return { tipo: 'entero', texto: parametro.valor ?? '' };
    case 'booleano':
      return { tipo: 'booleano', encendido: parametro.valor === 'si' };
    case 'lista':
      return {
        tipo: 'lista',
        filas: parametro.elementos.map(nuevaFila),
        nuevo: '',
      };
  }
}

const limpiar = (texto: string) => texto.trim().replace(/\s+/g, ' ');

/** Los elementos del borrador de una lista: sin renglones vacíos, con el que quedó por agregar. */
export function elementosDe(
  borrador: Extract<Borrador, { tipo: 'lista' }>,
): string[] {
  return [...borrador.filas.map((fila) => fila.texto), borrador.nuevo]
    .map(limpiar)
    .filter((texto) => texto !== '');
}

export function hayCambios(parametro: Parametro, borrador: Borrador): boolean {
  switch (borrador.tipo) {
    case 'entero':
      return borrador.texto.trim() !== (parametro.valor ?? '');
    case 'booleano':
      return (borrador.encendido ? 'si' : 'no') !== parametro.valor;
    case 'lista': {
      const elementos = elementosDe(borrador);
      return (
        parametro.valor === null ||
        elementos.length !== parametro.elementos.length ||
        elementos.some((texto, indice) => texto !== parametro.elementos[indice])
      );
    }
  }
}

export type Preparado =
  | { cambio: CambioParametro; pregunta: string; error?: never }
  | { error: string; cambio?: never; pregunta?: never };

const comillas = (textos: string[]) =>
  textos.map((texto) => `«${texto}»`).join(', ');

/** Lo que se envía al backend y la pregunta de la confirmación, o por qué no se puede enviar. */
export function preparar(
  parametro: Parametro,
  texto: TextoParametro,
  borrador: Borrador,
): Preparado {
  switch (borrador.tipo) {
    case 'entero': {
      const valor = borrador.texto.trim();
      if (valor === '') {
        return { error: 'Escriba un número.' };
      }
      if (!/^\d+$/.test(valor)) {
        return {
          error: 'Escriba un número entero, sin puntos, comas ni signos.',
        };
      }
      const cantidad = Number(valor);
      const { minimo, maximo } = parametro;
      if (
        (minimo !== null && cantidad < minimo) ||
        (maximo !== null && cantidad > maximo)
      ) {
        return {
          error: `Escriba un número entre ${formatoNumero(minimo ?? 0)} y ${formatoNumero(maximo ?? cantidad)}.`,
        };
      }
      const antes =
        parametro.valor === null
          ? ''
          : ` de ${valorConUnidad(parametro.valor, texto)}`;
      return {
        cambio: { valor },
        pregunta: `¿Cambiar «${texto.titulo}»${antes} a ${valorConUnidad(String(cantidad), texto)}?`,
      };
    }
    case 'booleano': {
      const efecto = borrador.encendido ? texto.encendido : texto.apagado;
      return {
        cambio: { valor: borrador.encendido ? 'si' : 'no' },
        pregunta: `¿${borrador.encendido ? 'Encender' : 'Apagar'} «${texto.titulo}»?${efecto ? ` ${efecto}` : ''}`,
      };
    }
    case 'lista': {
      const elementos = elementosDe(borrador);
      if (elementos.length === 0 && !parametro.admiteVacia) {
        return { error: 'La lista debe tener al menos un elemento.' };
      }
      const quitados = parametro.elementos.filter(
        (elemento) => !elementos.includes(elemento),
      );
      const agregados = elementos.filter(
        (elemento) => !parametro.elementos.includes(elemento),
      );
      const partes = [
        agregados.length > 0 ? `Se agrega: ${comillas(agregados)}.` : '',
        quitados.length > 0 ? `Se quita: ${comillas(quitados)}.` : '',
        agregados.length === 0 && quitados.length === 0
          ? 'Solo cambia el orden.'
          : '',
      ].filter(Boolean);
      return {
        cambio: { elementos },
        pregunta: `¿Guardar la lista de «${texto.titulo}»? ${partes.join(' ')}`,
      };
    }
  }
}
