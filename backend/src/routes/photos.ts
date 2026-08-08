import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../services/database.js';
import { storage } from '../services/storage.js';
import { claimNextPhotoForAnalysis, DEFAULT_STALE_AFTER_SEC } from '../services/photo-analysis.js';
import { buildIssueDedupeKey, normalizeCategoria, upsertAlert } from '../services/alerts.js';
import { AppError } from '../middleware/error-handler.js';

const router = Router();

// Schemas de validación
const createPhotoSchema = z.object({
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  cropId: z.string(),
  capturedAt: z.string().datetime().optional(),
});

const updatePhotoSchema = z.object({
  title: z.string().trim().max(120).nullable().optional(),
  cropId: z.string().nullable().optional(),
});

const createCommentSchema = z.object({
  body: z.string().trim().min(1, 'El comentario no puede estar vacío').max(2000),
  author: z.string().trim().max(80).optional(),
});

// Un problema puede venir como objeto {categoria, detalle} o como string
// suelto. Lo segundo es el formato viejo: se acepta y cae en "otro", que
// deduplica peor pero no rompe a nadie.
const issueSchema = z.preprocess(
  valor => (typeof valor === 'string' ? { categoria: 'otro', detalle: valor } : valor),
  z.object({
    // Sin z.enum a propósito: si la lista del ai-engine se adelanta a la del
    // backend, queremos "otro" y no un 400 que marque la foto como fallida.
    categoria: z.string().trim().max(40).optional(),
    detalle: z.string().trim().min(1).max(500),
  })
);

const createAnalysisSchema = z.object({
  // Entero a propósito: la columna es Int y un 87.5 rompería el insert.
  healthScore: z.number().int().min(0).max(100),
  growthStage: z.string().trim().min(1).max(80),
  issues: z.array(issueSchema).default([]),
  recommendations: z.array(z.string()).default([]),
});

const claimSchema = z.object({
  staleAfterSec: z.number().int().positive().max(86400).optional(),
});

const discardAnalysisSchema = z.object({
  reason: z.string().trim().max(500).optional(),
  // `failed` es un error del análisis; `skipped` es una foto que no daba para
  // analizar (de noche, movida, apuntando a la pared). Distinguirlos evita
  // leer como fallas del sistema lo que es sólo una foto sin plantas.
  status: z.enum(['failed', 'skipped']).default('failed'),
});

// GET /api/photos - Obtener todas las fotos
const ESTADOS_ANALISIS = ['pending', 'processing', 'done', 'failed', 'skipped'] as const;

router.get('/', async (req, res) => {
  const { cropId, cameraId, source, analysisStatus, limit } = req.query;

  const where: Record<string, unknown> = {};
  if (cropId) {
    where.cropId = cropId;
  }
  if (cameraId) {
    where.cameraId = cameraId;
  }
  if (source === 'camera' || source === 'manual') {
    where.source = source;
  }
  if (ESTADOS_ANALISIS.includes(analysisStatus as (typeof ESTADOS_ANALISIS)[number])) {
    where.analysisStatus = analysisStatus;
  }

  // Sin tope explícito devolvemos todo, que es lo que espera la galería. Con
  // ?limit, un valor fuera de rango se ignora en vez de romper la request.
  const tope = Number(limit);
  const take = Number.isInteger(tope) && tope > 0 ? Math.min(tope, 500) : undefined;

  const photos = await prisma.photo.findMany({
    where,
    include: {
      crop: {
        select: { id: true, name: true },
      },
      analysis: true,
    },
    orderBy: { capturedAt: 'desc' },
    take,
  });

  // Transformar respuesta. cropName puede ser null: las fotos ingestadas por
  // una cámara sin cultivo asociado no tienen crop.
  const result = photos.map(photo => ({
    ...photo,
    cropName: photo.crop?.name ?? null,
    aiAnalysis: photo.analysis,
  }));

  res.json(result);
});

// POST /api/photos/analysis/claim - El worker de IA toma la próxima foto.
//
// Va antes que /:id: Express resuelve por orden de registro y si no,
// "analysis" entraría como id de foto.
router.post('/analysis/claim', async (req, res) => {
  const { staleAfterSec } = claimSchema.parse(req.body ?? {});

  const result = await claimNextPhotoForAnalysis(staleAfterSec ?? DEFAULT_STALE_AFTER_SEC);

  // 204 y no 404: "no hay nada para analizar" es el caso normal del worker,
  // no un error que valga la pena loguear cada minuto.
  if (!result) {
    return res.status(204).send();
  }

  res.json(result);
});

// GET /api/photos/:id - Obtener foto por ID
router.get('/:id', async (req, res) => {
  const photo = await prisma.photo.findUnique({
    where: { id: req.params.id },
    include: {
      crop: true,
      analysis: true,
      comments: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!photo) {
    throw new AppError(404, 'Foto no encontrada');
  }

  res.json({
    ...photo,
    cropName: photo.crop?.name ?? null,
    aiAnalysis: photo.analysis,
  });
});

// PATCH /api/photos/:id - Editar título o cultivo desde la web
router.patch('/:id', async (req, res) => {
  const data = updatePhotoSchema.parse(req.body);

  const photo = await prisma.photo.findUnique({ where: { id: req.params.id } });
  if (!photo) {
    throw new AppError(404, 'Foto no encontrada');
  }

  if (data.cropId) {
    const crop = await prisma.crop.findUnique({ where: { id: data.cropId } });
    if (!crop) {
      throw new AppError(404, 'Cultivo no encontrado');
    }
  }

  const updated = await prisma.photo.update({
    where: { id: req.params.id },
    data: {
      ...data,
      // Un título en blanco es no tener título, no un título vacío.
      title: data.title === '' ? null : data.title,
    },
    include: { crop: { select: { id: true, name: true } } },
  });

  res.json({ ...updated, cropName: updated.crop?.name ?? null });
});

// ---------------------------------------------------------------- comentarios

// GET /api/photos/:id/comments
router.get('/:id/comments', async (req, res) => {
  const comments = await prisma.photoComment.findMany({
    where: { photoId: req.params.id },
    orderBy: { createdAt: 'asc' },
  });

  res.json(comments);
});

// POST /api/photos/:id/comments
router.post('/:id/comments', async (req, res) => {
  const data = createCommentSchema.parse(req.body);

  const photo = await prisma.photo.findUnique({ where: { id: req.params.id } });
  if (!photo) {
    throw new AppError(404, 'Foto no encontrada');
  }

  const comment = await prisma.photoComment.create({
    data: { photoId: req.params.id, ...data },
  });

  res.status(201).json(comment);
});

// DELETE /api/photos/:id/comments/:commentId
router.delete('/:id/comments/:commentId', async (req, res) => {
  // El where lleva las dos claves a propósito: con sólo el commentId se podría
  // borrar un comentario de otra foto pasando cualquier id en la ruta.
  const { count } = await prisma.photoComment.deleteMany({
    where: { id: req.params.commentId, photoId: req.params.id },
  });

  if (count === 0) {
    throw new AppError(404, 'Comentario no encontrado');
  }

  res.status(204).send();
});

// POST /api/photos - Crear foto
router.post('/', async (req, res) => {
  const data = createPhotoSchema.parse(req.body);

  // Verificar que el cultivo existe
  const crop = await prisma.crop.findUnique({
    where: { id: data.cropId },
  });

  if (!crop) {
    throw new AppError(404, 'Cultivo no encontrado');
  }

  const photo = await prisma.photo.create({
    data: {
      ...data,
      capturedAt: data.capturedAt ? new Date(data.capturedAt) : new Date(),
    },
    include: {
      crop: {
        select: { id: true, name: true },
      },
    },
  });

  res.status(201).json({
    ...photo,
    cropName: photo.crop?.name ?? null,
  });
});

// POST /api/photos/:id/analysis - Agregar análisis de IA
router.post('/:id/analysis', async (req, res) => {
  const data = createAnalysisSchema.parse(req.body);

  const photo = await prisma.photo.findUnique({
    where: { id: req.params.id },
    include: { analysis: true },
  });

  if (!photo) {
    throw new AppError(404, 'Foto no encontrada');
  }

  // En PhotoAnalysis se guarda sólo el detalle: la categoría existe para
  // deduplicar alertas, no es algo que el usuario quiera leer.
  const datosAnalisis = { ...data, issues: data.issues.map(i => i.detalle) };

  // Si ya tiene análisis, actualizarlo
  let analysis;
  if (photo.analysis) {
    analysis = await prisma.photoAnalysis.update({
      where: { photoId: req.params.id },
      data: {
        ...datosAnalisis,
        analyzedAt: new Date(),
      },
    });
  } else {
    analysis = await prisma.photoAnalysis.create({
      data: {
        photoId: req.params.id,
        ...datosAnalisis,
      },
    });
  }

  // Si hay issues, crear alertas
  if (data.issues.length > 0) {
    const photoWithCrop = await prisma.photo.findUnique({
      where: { id: req.params.id },
      include: { crop: true },
    });

    const dondeSeDetecto = photoWithCrop?.crop?.name
      ?? (photoWithCrop?.cameraId ? `la cámara ${photoWithCrop.cameraId}` : 'la huerta');

    for (const issue of data.issues) {
      const categoria = normalizeCategoria(issue.categoria);

      // upsert y no create: el análisis corre cada hora y un problema real no
      // se arregla solo, así que crear una alerta por detección llenaría la
      // pantalla con la misma noticia repetida.
      await upsertAlert({
        dedupeKey: buildIssueDedupeKey(categoria, {
          cropId: photoWithCrop?.cropId,
          cameraId: photoWithCrop?.cameraId,
        }),
        type: 'growth',
        severity: data.healthScore < 50 ? 'high' : data.healthScore < 70 ? 'medium' : 'low',
        title: `Problema detectado en ${dondeSeDetecto}`,
        message: issue.detalle,
        cropId: photoWithCrop?.cropId,
        aiRecommendation: data.recommendations.join('. ') || null,
      });
    }
  }

  await prisma.photo.update({
    where: { id: req.params.id },
    data: { analysisStatus: 'done', analysisError: null },
  });

  res.status(201).json(analysis);
});

// POST /api/photos/:id/analysis/discard - El worker no produjo un análisis.
//
// Sin esto, una foto que rompe el análisis queda en `processing` hasta que
// vence el plazo de stale y se la vuelve a tomar, una y otra vez.
router.post('/:id/analysis/discard', async (req, res) => {
  const { reason, status } = discardAnalysisSchema.parse(req.body ?? {});

  const { count } = await prisma.photo.updateMany({
    where: { id: req.params.id },
    data: { analysisStatus: status, analysisError: reason ?? null },
  });

  if (count === 0) {
    throw new AppError(404, 'Foto no encontrada');
  }

  res.status(204).send();
});

// DELETE /api/photos/:id - Eliminar foto
router.delete('/:id', async (req, res) => {
  const photo = await prisma.photo.findUnique({ where: { id: req.params.id } });

  if (!photo) {
    throw new AppError(404, 'Foto no encontrada');
  }

  // Primero la fila: si fallara, no queremos haber borrado ya el archivo y
  // dejar la galería con una imagen rota. Los comentarios caen por cascade.
  await prisma.photo.delete({ where: { id: req.params.id } });

  // El objeto después, en best-effort. Que quede un archivo suelto es molesto;
  // que falle el borrado entero por eso, peor.
  if (photo.storageKey) {
    try {
      await storage.remove(photo.storageKey);
    } catch (err) {
      console.warn(`[photos] no se pudo borrar el objeto ${photo.storageKey}:`, err);
    }
  }

  res.status(204).send();
});

export default router;
