import {
  type SesionCalendario,
  textoAtraso,
  textoRestante,
} from '@/api/sesiones';
import { Insignia } from './Estados';

/**
 * Las insignias de una sesión: su alerta (RF-23, decidida por el backend), si es hoy, si es
 * festivo, su tipo y si ya está diligenciada (RF-20). Las usan el calendario y el registro.
 */
export function InsigniasSesion({
  sesion,
  esHoy,
}: {
  sesion: SesionCalendario;
  esHoy: boolean;
}) {
  const esFestivo = sesion.tipo?.codigo === 'festivo';
  return (
    <div className="flex flex-wrap gap-1.5">
      {sesion.alerta === 'vencida' && (
        <Insignia tono="peligro">
          Vencida
          {sesion.diasAtraso ? ` · ${textoAtraso(sesion.diasAtraso)}` : ''}
        </Insignia>
      )}
      {sesion.alerta === 'incumplida' && (
        <Insignia tono="peligro">
          Incumplida
          {sesion.diasAtraso ? ` · ${textoAtraso(sesion.diasAtraso)}` : ''}
        </Insignia>
      )}
      {sesion.alerta === 'por_vencer' && sesion.diasRestantes !== null && (
        <Insignia tono="advertencia">
          Por vencer · {textoRestante(sesion.diasRestantes)}
        </Insignia>
      )}
      {esHoy && <Insignia tono="marca">Hoy</Insignia>}
      {sesion.festivo && (
        <Insignia tono="informativo">Festivo · {sesion.festivo}</Insignia>
      )}
      {/* RF-21: un festivo en el que el docente sí dictó clase lo dice; los demás tipos, su nombre. */}
      {sesion.tipo &&
        !esFestivo &&
        (sesion.tipo.codigo !== 'clase' || sesion.festivo) && (
          <Insignia>{sesion.tipo.nombre}</Insignia>
        )}
      {sesion.diligenciada && <Insignia>Diligenciada</Insignia>}
    </div>
  );
}

/**
 * «2 temas · 1 ausente», el resumen de una sesión registrada (RF-20, p6; RF-22, p6). Un parcial
 * o una actividad no llevan temas (RF-21): su resumen es solo la asistencia.
 */
export function resumenRegistro(sesion: {
  numeroTemas: number;
  numeroAusentes: number;
}): string {
  const temas =
    sesion.numeroTemas === 1 ? '1 tema' : `${sesion.numeroTemas} temas`;
  const ausentes =
    sesion.numeroAusentes === 0
      ? 'sin ausentes'
      : sesion.numeroAusentes === 1
        ? '1 ausente'
        : `${sesion.numeroAusentes} ausentes`;
  return sesion.numeroTemas === 0 ? ausentes : `${temas} · ${ausentes}`;
}
