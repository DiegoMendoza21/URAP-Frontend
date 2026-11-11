import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
// Node ejecuta el TypeScript de `textos.ts` quitándole los tipos: no hace falta compilar.
import {
  EVENTOS,
  nombreEvento,
  opcionesDeEvento,
  queHizo,
  tonoEvento,
} from './textos.ts';

/** Un registro como llega del backend, con lo que usan los textos. */
const registro = (evento, accion, entidad, idRegistro = null) => ({
  evento,
  accion,
  entidad,
  idRegistro,
});

describe('la etiqueta de un registro dice lo que pasó', () => {
  it('entrar y salir del sistema no son una «creación» ni una «modificación»', () => {
    assert.equal(nombreEvento('inicio_sesion'), 'Inicio de sesión');
    assert.equal(nombreEvento('cierre_sesion'), 'Cierre de sesión');
  });

  it('la revisión de un proyecto docente se lee con sus palabras', () => {
    assert.equal(nombreEvento('envio_revision'), 'Envío a revisión');
    assert.equal(nombreEvento('devolucion'), 'Devolución');
    assert.equal(nombreEvento('aprobacion'), 'Aprobación');
  });

  it('lo que no tiene nombre propio conserva el general', () => {
    assert.equal(nombreEvento('creacion'), 'Creación');
    assert.equal(nombreEvento('modificacion'), 'Modificación');
    assert.equal(nombreEvento('eliminacion'), 'Eliminación');
    assert.equal(nombreEvento('consulta_sensible'), 'Consulta sensible');
  });

  it('un evento que la pantalla todavía no conoce sale con su código en palabras', () => {
    assert.equal(nombreEvento('cambio_de_plan'), 'Cambio de plan');
    assert.equal(tonoEvento('cambio_de_plan'), 'neutro');
  });

  it('solo los eventos generales se llaman creación, modificación o eliminación', () => {
    const generales = ['creacion', 'modificacion', 'eliminacion'];
    for (const [codigo, { nombre }] of Object.entries(EVENTOS)) {
      if (!generales.includes(codigo)) {
        assert.doesNotMatch(nombre, /^(Creación|Modificación|Eliminación)$/);
      }
    }
  });
});

describe('el filtro «Acción» ofrece las mismas palabras que las etiquetas', () => {
  const opciones = opcionesDeEvento();

  it('hay una opción por evento, con el nombre de su etiqueta', () => {
    assert.deepEqual(
      opciones.map(({ codigo }) => codigo).sort(),
      Object.keys(EVENTOS).sort(),
    );
    for (const { codigo, nombre } of opciones) {
      assert.equal(nombre, nombreEvento(codigo));
    }
  });

  it('ningún nombre se repite: cada palabra elige un solo evento', () => {
    const nombres = opciones.map(({ nombre }) => nombre);
    assert.equal(new Set(nombres).size, nombres.length);
  });

  it('van en orden alfabético', () => {
    const nombres = opciones.map(({ nombre }) => nombre);
    assert.deepEqual(
      nombres,
      nombres.toSorted((a, b) => a.localeCompare(b, 'es')),
    );
  });
});

describe('la frase «Fulano …» de cada registro', () => {
  it('el inicio y el cierre de sesión no llevan el número de la sesión', () => {
    assert.equal(
      queHizo(registro('inicio_sesion', 'crear', 'sesion', 81)),
      'inició sesión',
    );
    assert.equal(
      queHizo(registro('cierre_sesion', 'actualizar', 'sesion', 81)),
      'cerró sesión',
    );
  });

  it('la revisión dice qué se hizo con el proyecto docente', () => {
    assert.equal(
      queHizo(registro('envio_revision', 'actualizar', 'proyecto_docente', 12)),
      'envió a revisión el proyecto docente n.º 12',
    );
    assert.equal(
      queHizo(registro('devolucion', 'actualizar', 'proyecto_docente', 12)),
      'devolvió el proyecto docente n.º 12',
    );
    assert.equal(
      queHizo(registro('aprobacion', 'aprobar', 'proyecto_docente', 12)),
      'aprobó el proyecto docente n.º 12',
    );
  });

  it('los eventos generales se dicen con el verbo y la entidad', () => {
    assert.equal(
      queHizo(registro('creacion', 'crear', 'rol', 4)),
      'creó el rol n.º 4',
    );
    assert.equal(
      queHizo(registro('modificacion', 'actualizar', 'proyecto_docente', 12)),
      'modificó el proyecto docente n.º 12',
    );
    assert.equal(
      queHizo(registro('consulta_sensible', 'consulta_sensible', 'auditoria')),
      'consultó la auditoría',
    );
  });

  it('los usuarios y sus roles', () => {
    assert.equal(
      queHizo(registro('bloqueo_usuario', 'actualizar', 'usuario', 5)),
      'bloqueó por intentos fallidos al usuario n.º 5',
    );
    assert.equal(
      queHizo(registro('inactivacion_usuario', 'actualizar', 'usuario', 5)),
      'inactivó al usuario n.º 5',
    );
    assert.equal(
      queHizo(registro('asignacion_rol', 'crear', 'usuario_rol', 30)),
      'asignó un rol a un usuario',
    );
    assert.equal(
      queHizo(registro('revocacion_rol', 'actualizar', 'usuario_rol', 30)),
      'revocó un rol de un usuario',
    );
  });

  it('una entidad o un evento desconocidos no dejan la frase en blanco', () => {
    assert.equal(
      queHizo(registro('cambio_de_plan', 'actualizar', 'plan_estudio', 2)),
      'modificó «plan estudio» n.º 2',
    );
  });
});
