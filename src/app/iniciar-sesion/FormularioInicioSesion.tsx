'use client';

import { useRouter } from 'next/navigation';
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from 'react';
import { ErrorApi, mensajeParaUsuario } from '@/api/cliente';
import { useSesion } from '@/sesion/ProveedorSesion';

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** El mismo límite del backend (IniciarSesionDto). */
const LONGITUD_MAXIMA_CONTRASENA = 128;

interface ErroresCampos {
  correo?: string;
  contrasena?: string;
}

interface Falla {
  mensaje: string;
  detalles?: string[];
  /**
   * 429: el acceso está bloqueado por un tiempo, por intentos fallidos de la cuenta o desde la
   * conexión (HU-01-04). No es un error en los datos, así que se muestra como aviso.
   */
  esBloqueo: boolean;
}

/** El mismo correo con otra forma de escribirlo (espacios, mayúsculas) cuenta como el mismo. */
function normalizarCorreo(correo: string): string {
  return correo.trim().toLowerCase();
}

const sinSuscripcion = () => () => {};

/** Campos del formulario que nunca deben quedar en la URL. */
const PARAMETROS_SENSIBLES = ['correo', 'contrasena'];

/**
 * Falso en el HTML del servidor y mientras React no ha tomado la página; verdadero después.
 * Antes de eso el formulario es HTML puro: si se enviara, lo haría el navegador por su cuenta,
 * sin `alEnviar`.
 */
function useHidratado(): boolean {
  return useSyncExternalStore(
    sinSuscripcion,
    () => true,
    () => false,
  );
}

/** Respuestas que significan que la contraseña escrita no sirvió y conviene borrarla. */
const ESTADOS_CONTRASENA_DESCARTADA = new Set([401, 429]);

/** Las mismas reglas del backend, para avisar antes de enviar (NFR-011). */
function validar(correo: string, contrasena: string): ErroresCampos {
  const errores: ErroresCampos = {};
  if (!correo.trim()) {
    errores.correo = 'Ingrese su correo institucional.';
  } else if (!FORMATO_CORREO.test(correo.trim())) {
    errores.correo = 'El correo institucional no es válido.';
  }
  if (!contrasena) {
    errores.contrasena = 'Ingrese su contraseña.';
  } else if (contrasena.length > LONGITUD_MAXIMA_CONTRASENA) {
    errores.contrasena = 'La contraseña no puede superar 128 caracteres.';
  }
  return errores;
}

/**
 * Inicio de sesión con correo institucional y contraseña (HU-01-01). Los errores del servidor
 * se muestran con su propio mensaje: el genérico de credenciales, que no dice cuál de los dos
 * datos falló, y el del usuario inactivo, que lo remite al administrador. El bloqueo temporal
 * (HU-01-04) se muestra como aviso, con los minutos que indica el backend.
 */
export function FormularioInicioSesion() {
  const { sesion } = useSesion();
  // Next conserva esta página montada al salir de ella (`cacheComponents`), con su estado. Sin
  // la clave, quien cerraba la sesión encontraba el formulario como lo dejó al entrar: con su
  // correo, su contraseña y el botón deshabilitado en «Ingresando…». La clave cambia al
  // iniciar la sesión y otra vez al salir, así que el formulario siempre empieza en blanco.
  return (
    <Formulario
      key={sesion.estado === 'autenticado' ? 'con-sesion' : 'sin-sesion'}
    />
  );
}

function Formulario() {
  const { sesion, iniciar } = useSesion();
  // Con la sesión ya iniciada solo falta que cargue el panel.
  const entrando = sesion.estado === 'autenticado';
  const router = useRouter();
  const id = useId();
  const refCorreo = useRef<HTMLInputElement>(null);
  const refContrasena = useRef<HTMLInputElement>(null);
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [errores, setErrores] = useState<ErroresCampos>({});
  const [falla, setFalla] = useState<Falla | null>(null);
  const [enviando, setEnviando] = useState(false);
  /**
   * Correo con el que el backend respondió 429. Mientras siga escrito, reenviar solo repetiría
   * el aviso del bloqueo, así que «Ingresar» queda deshabilitado hasta que cambie el correo.
   */
  const [correoBloqueado, setCorreoBloqueado] = useState<string | null>(null);
  const bloqueado =
    correoBloqueado !== null && normalizarCorreo(correo) === correoBloqueado;

  const aviso = sesion.estado === 'anonimo' ? sesion.aviso : undefined;
  const hidratado = useHidratado();

  // Una URL que ya trae credenciales (un marcador o el historial de antes de este arreglo) se
  // limpia al cargar: la contraseña no debe seguir a la vista en la barra de direcciones.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (
      PARAMETROS_SENSIBLES.some((parametro) => url.searchParams.has(parametro))
    ) {
      PARAMETROS_SENSIBLES.forEach((parametro) =>
        url.searchParams.delete(parametro),
      );
      window.history.replaceState(window.history.state, '', url);
    }
  }, []);

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    // Se lee lo que muestran los campos: lo escrito antes de que React tomara la página está
    // en el DOM, no en el estado.
    const correo = refCorreo.current?.value ?? '';
    const contrasena = refContrasena.current?.value ?? '';
    setCorreo(correo);
    setContrasena(contrasena);
    const nuevos = validar(correo, contrasena);
    setErrores(nuevos);
    if (nuevos.correo) {
      refCorreo.current?.focus();
      return;
    }
    if (nuevos.contrasena) {
      refContrasena.current?.focus();
      return;
    }

    if (bloqueado) {
      return;
    }
    setFalla(null);
    setEnviando(true);
    try {
      await iniciar({ correo: correo.trim(), contrasena });
      router.replace('/');
    } catch (error) {
      const estado = error instanceof ErrorApi ? error.estado : undefined;
      setFalla({
        mensaje: mensajeParaUsuario(error),
        detalles: error instanceof ErrorApi ? error.detalles : undefined,
        esBloqueo: estado === 429,
      });
      setEnviando(false);
      if (estado === 429) {
        setCorreoBloqueado(normalizarCorreo(correo));
      }
      // Sin respuesta del servidor la contraseña no se probó: se conserva para reintentar.
      if (estado !== undefined && ESTADOS_CONTRASENA_DESCARTADA.has(estado)) {
        setContrasena('');
        if (estado === 401) {
          refContrasena.current?.focus();
        }
      }
    }
  }

  const claseCampo =
    'block w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base focus:border-marca focus:outline-2 focus:outline-marca/30 aria-invalid:border-red-600';

  return (
    // Dos defensas para que la contraseña nunca viaje en la URL si el formulario se envía antes
    // de que cargue JavaScript (el método por defecto de un <form> es GET):
    // - «Ingresar» está deshabilitado hasta que React toma la página, y un formulario con su
    //   botón de envío deshabilitado tampoco se envía con Enter;
    // - method="post": si de todos modos el navegador lo enviara, los datos van en el cuerpo y
    //   no en la URL, el historial ni los registros del servidor.
    <form
      method="post"
      action="/iniciar-sesion"
      noValidate
      onSubmit={alEnviar}
      aria-labelledby={`${id}-titulo`}
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <h2 id={`${id}-titulo`} className="text-xl font-semibold">
        Iniciar sesión
      </h2>

      {aviso && (
        <p
          role="status"
          className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          {aviso}
        </p>
      )}

      {falla && (
        <div
          role="alert"
          className={`rounded-lg px-3 py-2 text-sm ${
            falla.esBloqueo
              ? 'bg-amber-50 text-amber-900'
              : 'bg-red-50 text-red-800'
          }`}
        >
          <p>{falla.mensaje}</p>
          {falla.detalles && falla.detalles.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {falla.detalles.map((detalle) => (
                <li key={detalle}>{detalle}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor={`${id}-correo`} className="block text-sm font-medium">
          Correo institucional
        </label>
        <input
          ref={refCorreo}
          id={`${id}-correo`}
          name="correo"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={correo}
          onChange={(evento) => setCorreo(evento.target.value)}
          aria-invalid={Boolean(errores.correo)}
          aria-describedby={errores.correo ? `${id}-error-correo` : undefined}
          className={claseCampo}
        />
        {errores.correo && (
          <p id={`${id}-error-correo`} className="text-sm text-red-700">
            {errores.correo}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor={`${id}-contrasena`}
          className="block text-sm font-medium"
        >
          Contraseña
        </label>
        <div className="relative">
          <input
            ref={refContrasena}
            id={`${id}-contrasena`}
            name="contrasena"
            type={mostrarContrasena ? 'text' : 'password'}
            autoComplete="current-password"
            value={contrasena}
            onChange={(evento) => setContrasena(evento.target.value)}
            aria-invalid={Boolean(errores.contrasena)}
            aria-describedby={
              errores.contrasena ? `${id}-error-contrasena` : undefined
            }
            className={`${claseCampo} pr-24`}
          />
          <button
            type="button"
            onClick={() => setMostrarContrasena((anterior) => !anterior)}
            aria-pressed={mostrarContrasena}
            aria-controls={`${id}-contrasena`}
            className="absolute inset-y-0 right-0 rounded-r-lg px-3 text-sm font-medium text-marca focus-visible:outline-2 focus-visible:outline-marca"
          >
            {mostrarContrasena ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        {errores.contrasena && (
          <p id={`${id}-error-contrasena`} className="text-sm text-red-700">
            {errores.contrasena}
          </p>
        )}
      </div>

      <noscript>
        <p
          role="status"
          className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          Para ingresar, active JavaScript en su navegador.
        </p>
      </noscript>

      <button
        type="submit"
        disabled={!hidratado || enviando || entrando || bloqueado}
        className="w-full rounded-lg bg-marca px-4 py-3 font-semibold text-white hover:bg-marca-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca disabled:cursor-not-allowed disabled:opacity-60"
      >
        {!hidratado
          ? 'Cargando…'
          : enviando || entrando
            ? 'Ingresando…'
            : 'Ingresar'}
      </button>
    </form>
  );
}
