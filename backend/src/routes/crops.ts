import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../services/database.js';
import { AppError } from '../middleware/error-handler.js';

const router = Router();

// Schemas de validación
const createCropSchema = z.object({
  name: z.string().min(1),
  variety: z.string().min(1),
  plantedDate: z.string().datetime(),
  expectedHarvestDate: z.string().datetime(),
  location: z.string().min(1),
  imageUrl: z.string().optional(),
  notes: z.string().optional(),
  sensorIds: z.array(z.string()).optional(),
});

const updateCropSchema = createCropSchema.partial().extend({
  currentStage: z.enum(['germination', 'seedling', 'vegetative', 'flowering', 'fruiting', 'harvest']).optional(),
  healthScore: z.number().min(0).max(100).optional(),
});

// GET /api/crops - Obtener todos los cultivos
router.get('/', async (_req, res) => {
  const crops = await prisma.crop.findMany({
    include: {
      sensors: {
        include: {
          sensor: true,
        },
      },
      _count: {
        select: {
          alerts: { where: { isRead: false } },
          photos: true,
        },
      },
    },
    orderBy: { plantedDate: 'desc' },
  });

  // Transformar respuesta
  const result = crops.map(crop => ({
    ...crop,
    sensors: crop.sensors.map(cs => cs.sensor),
    activeAlerts: crop._count.alerts,
    photoCount: crop._count.photos,
  }));

  res.json(result);
});

// GET /api/crops/:id - Obtener cultivo por ID
router.get('/:id', async (req, res) => {
  const crop = await prisma.crop.findUnique({
    where: { id: req.params.id },
    include: {
      sensors: {
        include: {
          sensor: {
            include: {
              readings: {
                orderBy: { timestamp: 'desc' },
                take: 24,
              },
            },
          },
        },
      },
      alerts: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      photos: {
        include: { analysis: true },
        orderBy: { capturedAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!crop) {
    throw new AppError(404, 'Cultivo no encontrado');
  }

  // Transformar respuesta
  const result = {
    ...crop,
    sensors: crop.sensors.map(cs => cs.sensor),
  };

  res.json(result);
});

// POST /api/crops - Crear cultivo
router.post('/', async (req, res) => {
  const { sensorIds, ...data } = createCropSchema.parse(req.body);

  const crop = await prisma.crop.create({
    data: {
      ...data,
      plantedDate: new Date(data.plantedDate),
      expectedHarvestDate: new Date(data.expectedHarvestDate),
      sensors: sensorIds ? {
        create: sensorIds.map(sensorId => ({ sensorId })),
      } : undefined,
    },
    include: {
      sensors: {
        include: { sensor: true },
      },
    },
  });

  res.status(201).json({
    ...crop,
    sensors: crop.sensors.map(cs => cs.sensor),
  });
});

// PUT /api/crops/:id - Actualizar cultivo
router.put('/:id', async (req, res) => {
  const { sensorIds, ...data } = updateCropSchema.parse(req.body);

  // Si se proporcionan sensorIds, actualizar relaciones
  if (sensorIds) {
    await prisma.cropSensor.deleteMany({
      where: { cropId: req.params.id },
    });
  }

  const crop = await prisma.crop.update({
    where: { id: req.params.id },
    data: {
      ...data,
      plantedDate: data.plantedDate ? new Date(data.plantedDate) : undefined,
      expectedHarvestDate: data.expectedHarvestDate ? new Date(data.expectedHarvestDate) : undefined,
      sensors: sensorIds ? {
        create: sensorIds.map(sensorId => ({ sensorId })),
      } : undefined,
    },
    include: {
      sensors: {
        include: { sensor: true },
      },
    },
  });

  res.json({
    ...crop,
    sensors: crop.sensors.map(cs => cs.sensor),
  });
});

// DELETE /api/crops/:id - Eliminar cultivo
router.delete('/:id', async (req, res) => {
  await prisma.crop.delete({
    where: { id: req.params.id },
  });

  res.status(204).send();
});

export default router;
