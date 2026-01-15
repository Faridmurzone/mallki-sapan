import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../services/database.js';
import { AppError } from '../middleware/error-handler.js';

const router = Router();

// Schemas de validación
const createPhotoSchema = z.object({
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  cropId: z.string(),
  capturedAt: z.string().datetime().optional(),
});

const createAnalysisSchema = z.object({
  healthScore: z.number().min(0).max(100),
  growthStage: z.string(),
  issues: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
});

// GET /api/photos - Obtener todas las fotos
router.get('/', async (req, res) => {
  const { cropId } = req.query;

  const where: Record<string, unknown> = {};
  if (cropId) {
    where.cropId = cropId;
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

  // Transformar respuesta
  const result = photos.map(photo => ({
    ...photo,
    cropName: photo.crop.name,
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
    },
  });

  if (!photo) {
    throw new AppError(404, 'Foto no encontrada');
  }

  res.json({
    ...photo,
    cropName: photo.crop.name,
    aiAnalysis: photo.analysis,
  });
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
    cropName: photo.crop.name,
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

    for (const issue of data.issues) {
      await prisma.alert.create({
        data: {
          type: 'growth',
          severity: data.healthScore < 50 ? 'high' : data.healthScore < 70 ? 'medium' : 'low',
          title: `Problema detectado en ${photoWithCrop?.crop.name}`,
          message: issue,
          cropId: photoWithCrop?.cropId,
          aiRecommendation: data.recommendations.join('. '),
        },
      });
    }
  }

  res.status(201).json(analysis);
});

// DELETE /api/photos/:id - Eliminar foto
router.delete('/:id', async (req, res) => {
  await prisma.photo.delete({
    where: { id: req.params.id },
  });

  res.status(204).send();
});

export default router;
