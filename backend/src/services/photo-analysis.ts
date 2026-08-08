import type { Photo } from '@prisma/client';
import { prisma } from './database.js';

/**
 * Cuánto puede quedarse una foto en `processing` antes de considerar que el
 * worker que la tomó se murió y se la puede volver a tomar.
 */
export const DEFAULT_STALE_AFTER_SEC = 900; // 15 minutos

export interface ClaimResult {
  photo: Photo;
  /** Cuántas fotos más viejas se descartaron al tomar ésta. */
  skipped: number;
}

/**
 * Predicado de "esta foto se puede tomar": o está pendiente, o quedó colgada
 * en `processing` de un worker que no volvió.
 *
 * Se usa dos veces a propósito — para elegir la candidata y como guarda del
 * UPDATE — y ahí está la atomicidad: Postgres reevalúa el WHERE después de
 * tomar el lock de la fila, así que si otro worker se adelantó, el UPDATE
 * afecta 0 filas en lugar de pisarlo.
 */
function claimable(staleCutoff: Date) {
  return [
    { analysisStatus: 'pending' as const },
    { analysisStatus: 'processing' as const, analysisStartedAt: { lt: staleCutoff } },
    { analysisStatus: 'processing' as const, analysisStartedAt: null },
  ];
}

/**
 * Toma la foto **más reciente** que esté esperando análisis y descarta las
 * pendientes más viejas.
 *
 * Descartar no es perder información: con una cámara sacando una foto por
 * minuto y un análisis por hora, las intermedias muestran la misma planta un
 * rato antes. Analizar la última y marcar el resto `skipped` mantiene la cola
 * acotada; sin eso crecería 60 filas por hora para siempre.
 *
 * Devuelve null si no hay nada para analizar.
 */
export async function claimNextPhotoForAnalysis(
  staleAfterSec: number = DEFAULT_STALE_AFTER_SEC
): Promise<ClaimResult | null> {
  const staleCutoff = new Date(Date.now() - staleAfterSec * 1000);

  return prisma.$transaction(async tx => {
    const candidate = await tx.photo.findFirst({
      where: { OR: claimable(staleCutoff) },
      orderBy: { capturedAt: 'desc' },
    });

    if (!candidate) return null;

    const claimed = await tx.photo.updateMany({
      where: { id: candidate.id, OR: claimable(staleCutoff) },
      data: { analysisStatus: 'processing', analysisStartedAt: new Date(), analysisError: null },
    });

    // Otro worker la tomó entre el SELECT y el UPDATE: que reintente en el
    // próximo ciclo en vez de analizar dos veces la misma foto.
    if (claimed.count === 0) return null;

    const { count: skipped } = await tx.photo.updateMany({
      where: { analysisStatus: 'pending', capturedAt: { lt: candidate.capturedAt } },
      data: { analysisStatus: 'skipped' },
    });

    const photo = await tx.photo.findUniqueOrThrow({ where: { id: candidate.id } });
    return { photo, skipped };
  });
}
