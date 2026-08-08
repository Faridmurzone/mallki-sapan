import type { Alert, AlertSeverity, AlertType } from '@prisma/client';
import { prisma } from './database.js';

/**
 * Cuánto vale una alerta ya leída antes de volver a avisar por lo mismo.
 *
 * Si el problema sigue después de un día, que aparezca una alerta nueva es
 * información: no es la misma noticia de ayer, es "esto no se resolvió".
 */
export const DEFAULT_DEDUPE_WINDOW_SEC = 86400; // 24 horas

/** De menor a mayor. Se usa para no bajarle la severidad a una alerta abierta. */
const ORDEN_SEVERIDAD: AlertSeverity[] = ['low', 'medium', 'high', 'critical'];

function laPeor(a: AlertSeverity, b: AlertSeverity): AlertSeverity {
  return ORDEN_SEVERIDAD.indexOf(a) >= ORDEN_SEVERIDAD.indexOf(b) ? a : b;
}

export interface AlertaDeduplicada {
  /** Qué cuenta como "la misma alerta". Ver buildIssueDedupeKey(). */
  dedupeKey: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  cropId?: string | null;
  aiRecommendation?: string | null;
  windowSec?: number;
}

export interface ResultadoUpsert {
  alert: Alert;
  /** false si se plegó sobre una alerta que ya existía. */
  created: boolean;
}

/**
 * Crea la alerta, o la pliega sobre una equivalente que ya exista.
 *
 * El análisis de fotos corre cada hora y un problema real no se arregla solo:
 * sin esto, unas hojas amarillas generan 24 alertas idénticas por día y la
 * pantalla de alertas deja de servir para nada.
 *
 * Se pliega cuando la alerta previa sigue **sin leer** (nadie la atendió
 * todavía, no tiene sentido apilar otra) o cuando es reciente. Si ya fue leída
 * y es vieja, se crea una nueva: que el problema siga un día después es una
 * novedad y merece avisar de nuevo.
 *
 * No hay transacción a propósito: por acá pasa un solo escritor (un análisis
 * por hora), así que el costo de serializar no compra nada.
 */
export async function upsertAlert(datos: AlertaDeduplicada): Promise<ResultadoUpsert> {
  const { dedupeKey, windowSec = DEFAULT_DEDUPE_WINDOW_SEC, ...alerta } = datos;

  const previa = await prisma.alert.findFirst({
    where: { dedupeKey },
    orderBy: { createdAt: 'desc' },
  });

  if (previa && shouldFold(previa, new Date(), windowSec)) {
    const alert = await prisma.alert.update({
      where: { id: previa.id },
      data: {
        // Se refrescan el detalle y la recomendación: el análisis nuevo mira
        // una foto más reciente y describe mejor cómo está el problema hoy.
        message: alerta.message,
        aiRecommendation: alerta.aiRecommendation ?? previa.aiRecommendation,
        // Sólo escala: si empeoró queremos enterarnos, pero que una lectura
        // más benévola le baje el tono a una alerta abierta la escondería.
        severity: laPeor(previa.severity, alerta.severity),
        occurrences: { increment: 1 },
        // isRead queda como está a propósito: volver a marcarla sin leer cada
        // hora es exactamente el spam que estamos sacando.
      },
    });
    return { alert, created: false };
  }

  const alert = await prisma.alert.create({ data: { ...alerta, dedupeKey } });
  return { alert, created: true };
}

/** Decide si una alerta nueva se pliega sobre `previa`. Puro, para poder testearlo. */
export function shouldFold(
  previa: Pick<Alert, 'isRead' | 'createdAt'>,
  ahora: Date,
  windowSec: number
): boolean {
  if (!previa.isRead) return true; // nadie la atendió: no apiles otra encima
  return previa.createdAt.getTime() > ahora.getTime() - windowSec * 1000;
}

/**
 * Categorías de problema que puede reportar el análisis de fotos.
 *
 * El texto de cada problema lo escribe un modelo y cambia de una vez a otra
 * ("puntas amarillas" / "amarilleo en las puntas"), así que no sirve para
 * deduplicar. La categoría sí: es un conjunto cerrado que el modelo elige.
 */
export const CATEGORIAS_PROBLEMA = [
  'clorosis',
  'manchas',
  'plaga',
  'marchitez',
  'crecimiento_lento',
  'quemadura',
  'algas',
  'raices',
  'otro',
] as const;

export type CategoriaProblema = (typeof CATEGORIAS_PROBLEMA)[number];

/**
 * Lleva lo que haya mandado el cliente a una categoría conocida.
 *
 * Tolerante a propósito: si la lista del ai-engine se adelanta a la del
 * backend, preferimos una alerta bajo "otro" antes que un 400 que deje la
 * foto marcada como fallida por una diferencia cosmética.
 */
export function normalizeCategoria(valor: string | undefined): CategoriaProblema {
  const slug = (valor ?? '').trim().toLowerCase();
  return (CATEGORIAS_PROBLEMA as readonly string[]).includes(slug)
    ? (slug as CategoriaProblema)
    : 'otro';
}

/**
 * Clave de deduplicación de un problema detectado en una foto.
 *
 * El ámbito es el cultivo si la foto tiene uno; si no, la cámara. Dos tubos
 * distintos con clorosis son dos problemas distintos, no el mismo repetido.
 */
export function buildIssueDedupeKey(
  categoria: CategoriaProblema,
  ambito: { cropId?: string | null; cameraId?: string | null }
): string {
  return `foto:${ambito.cropId ?? ambito.cameraId ?? 'huerta'}:${categoria}`;
}
