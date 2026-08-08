import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../services/database.js';
import { storage } from '../services/storage.js';
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

const createAnalysisSchema = z.object({
  healthScore: z.number().min(0).max(100),
  growthStage: z.string(),
  issues: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
});

// GET /api/photos - Obtener todas las fotos
router.get('/', async (req, res) => {
  const { cropId, cameraId, source } = req.query;

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

  const photos = await prisma.photo.findMany({
    where,
    include: {
      crop: {
        select: { id: true, name: true },
      },
      analysis: true,
    },
    orderBy: { capturedAt: 'desc' },
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

  // Si ya tiene análisis, actualizarlo
  let analysis;
  if (photo.analysis) {
    analysis = await prisma.photoAnalysis.update({
      where: { photoId: req.params.id },
      data: {
        ...data,
        analyzedAt: new Date(),
      },
    });
  } else {
    analysis = await prisma.photoAnalysis.create({
      data: {
        photoId: req.params.id,
        ...data,
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
      await prisma.alert.create({
        data: {
          type: 'growth',
          severity: data.healthScore < 50 ? 'high' : data.healthScore < 70 ? 'medium' : 'low',
          title: `Problema detectado en ${dondeSeDetecto}`,
          message: issue,
          cropId: photoWithCrop?.cropId,
          aiRecommendation: data.recommendations.join('. '),
        },
      });
    }
  }

  await prisma.photo.update({
    where: { id: req.params.id },
    data: { analysisStatus: 'done' },
  });

  res.status(201).json(analysis);
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
