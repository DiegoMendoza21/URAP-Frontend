'use client';

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  cerrarSesion,
  consultarSesion,
  iniciarSesion,
  type DatosInicioSesion,
  type UsuarioAutenticado,
} from '@/api/autenticacion';
import { ErrorApi, mensajeParaUsuario } from '@/api/cliente';
import { alInvalidarseLaSesion } from './eventos';

export type EstadoSesion =
  | { estado: 'verificando' }
  | { estado: 'autenticado'; usuario: UsuarioAutenticado }
  | { estado: 'anonimo'; aviso?: string }
  | { estado: 'sin-conexion'; mensaje: string };

interface ContextoSesion {
  sesion: EstadoSesion;
  /** Consulta al servidor si hay una sesión válida. */
  verificar: () => void;
  /** Lanza ErrorApi si las credenciales no sirven o el usuario está inactivo. */
  iniciar: (datos: DatosInicioSesion) => Promise<void>;
  cerrar: () => Promise<void>;
}

const Contexto = createContext<ContextoSesion | null>(null);

/** Canal entre pestañas: al cerrar la sesión en una, las demás también salen. */
const CANAL_SESION = 'urap-sesion';
const MENSAJE_SESION_CERRADA = 'sesion-cerrada';

const AVISO_SESION_INVALIDA =
  'Su sesión venció o se cerró. Inicie sesión de nuevo.';
const AVISO_CERRADA_EN_OTRA_PESTANA =
  'La sesión se cerró en otra pestaña. Inicie sesión de nuevo.';

/**
 * Estado de la sesión en el navegador. El token no pasa por aquí: vive en una cookie httpOnly
 * que solo maneja el servidor de Next. Ocultar pantallas según la sesión es presentación; la
 * autorización real la hace el backend en cada petición.
 */
export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<EstadoSesion>({
    estado: 'verificando',
  });
  const verificacionEnCurso = useRef(false);

  const verificar = useCallback(() => {
    if (verificacionEnCurso.current) {
      return;
    }
    verificacionEnCurso.current = true;
    setSesion((actual) =>
      actual.estado === 'verificando' ? actual : { estado: 'verificando' },
    );
    consultarSesion()
      .then((usuario) => setSesion({ estado: 'autenticado', usuario }))
      .catch((error: unknown) => {
        // Un 401 ya lo atendió el aviso de sesión inválida (ver eventos.ts).
        if (error instanceof ErrorApi && error.estado === 401) {
          return;
        }
        // Sin red no se cierra la sesión: se ofrece reintentar.
        setSesion({
          estado: 'sin-conexion',
          mensaje: mensajeParaUsuario(error),
        });
      })
      .finally(() => {
        verificacionEnCurso.current = false;
      });
  }, []);

  const iniciar = useCallback(async (datos: DatosInicioSesion) => {
    const { usuario } = await iniciarSesion(datos);
    setSesion({ estado: 'autenticado', usuario });
  }, []);

  const cerrar = useCallback(async () => {
    try {
      await cerrarSesion();
    } catch {
      // El servidor de Next borra la cookie aunque el backend no responda; si ni siquiera
      // hubo red, la cookie vence sola con el token.
    }
    if (typeof BroadcastChannel !== 'undefined') {
      const canal = new BroadcastChannel(CANAL_SESION);
      canal.postMessage(MENSAJE_SESION_CERRADA);
      canal.close();
    }
    setSesion({ estado: 'anonimo' });
  }, []);

  useEffect(
    () =>
      alInvalidarseLaSesion(() =>
        setSesion({ estado: 'anonimo', aviso: AVISO_SESION_INVALIDA }),
      ),
    [],
  );

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') {
      return;
    }
    const canal = new BroadcastChannel(CANAL_SESION);
    canal.onmessage = (evento: MessageEvent) => {
      if (evento.data === MENSAJE_SESION_CERRADA) {
        setSesion({ estado: 'anonimo', aviso: AVISO_CERRADA_EN_OTRA_PESTANA });
      }
    };
    return () => canal.close();
  }, []);

  const valor = useMemo(
    () => ({ sesion, verificar, iniciar, cerrar }),
    [sesion, verificar, iniciar, cerrar],
  );
  return <Contexto value={valor}>{children}</Contexto>;
}

export function useSesion(): ContextoSesion {
  const contexto = use(Contexto);
  if (!contexto) {
    throw new Error('useSesion debe usarse dentro de ProveedorSesion.');
  }
  return contexto;
}
