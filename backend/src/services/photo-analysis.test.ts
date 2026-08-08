import { beforeEach, describe, expect, it, vi } from 'vitest';

// La lógica de claim vive en una transacción de Prisma: lo que se prueba acá
// es la coreografía (qué se elige, con qué guarda se actualiza, qué se
// descarta), no Postgres. La atomicidad real la da el WHERE del UPDATE, que
// Postgres reevalúa después de tomar el lock de la fila.
const findFirst = vi.fn();
const updateMany = vi.fn();
const findUniqueOrThrow = vi.fn();

vi.mock('./database.js', () => ({
  prisma: {
    $transaction: (fn: (tx: unknown) => unknown) =>
      fn({ photo: { findFirst, updateMany, findUniqueOrThrow } }),
  },
}));

const { claimNextPhotoForAnalysis } = await import('./photo-analysis.js');

const FOTO = { id: 'foto-nueva', capturedAt: new Date('2026-08-08T12:00:00Z') };

beforeEach(() => {
  vi.clearAllMocks();
  findUniqueOrThrow.mockResolvedValue({ ...FOTO, analysisStatus: 'processing' });
});

describe('claimNextPhotoForAnalysis', () => {
  it('toma la foto más reciente y descarta las pendientes más viejas', async () => {
    findFirst.mockResolvedValue(FOTO);
    updateMany
      .mockResolvedValueOnce({ count: 1 }) // el claim
      .mockResolvedValueOnce({ count: 7 }); // las descartadas

    const result = await claimNextPhotoForAnalysis();

    expect(result?.photo.id).toBe('foto-nueva');
    expect(result?.skipped).toBe(7);

    // Se elige la más reciente, no la más vieja: la última foto es la que
    // mejor describe cómo está la planta ahora.
    expect(findFirst.mock.calls[0][0].orderBy).toEqual({ capturedAt: 'desc' });

    const [claim, descarte] = updateMany.mock.calls;
    expect(claim[0].data.analysisStatus).toBe('processing');
    expect(claim[0].data.analysisStartedAt).toBeInstanceOf(Date);
    expect(descarte[0]).toMatchObject({
      where: { analysisStatus: 'pending', capturedAt: { lt: FOTO.capturedAt } },
      data: { analysisStatus: 'skipped' },
    });
  });

  it('no descarta nada si otro worker se adelantó', async () => {
    findFirst.mockResolvedValue(FOTO);
    updateMany.mockResolvedValueOnce({ count: 0 }); // la guarda del UPDATE falló

    expect(await claimNextPhotoForAnalysis()).toBeNull();

    // Clave: sólo se llamó al claim. Si acá hubiera un segundo updateMany,
    // estaríamos marcando fotos como descartadas sin haber tomado ninguna.
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('devuelve null cuando no hay nada para analizar', async () => {
    findFirst.mockResolvedValue(null);

    expect(await claimNextPhotoForAnalysis()).toBeNull();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('vuelve a tomar las que quedaron colgadas en processing', async () => {
    findFirst.mockResolvedValue(FOTO);
    updateMany.mockResolvedValue({ count: 1 });

    await claimNextPhotoForAnalysis(60);

    // El worker que se muere deja la foto en `processing` para siempre; el
    // corte por antigüedad es lo que permite recuperarla.
    const condiciones = findFirst.mock.calls[0][0].where.OR;
    expect(condiciones).toContainEqual({ analysisStatus: 'pending' });
    expect(condiciones).toContainEqual({
      analysisStatus: 'processing',
      analysisStartedAt: null,
    });

    const colgada = condiciones.find(
      (c: { analysisStartedAt?: { lt?: Date } }) => c.analysisStartedAt?.lt
    );
    const corte = colgada.analysisStartedAt.lt as Date;
    expect(Date.now() - corte.getTime()).toBeGreaterThanOrEqual(60_000);
  });
});
