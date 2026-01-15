import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../services/database.js';
import { AppError } from '../middleware/error-handler.js';

const router = Router();

// Schemas de validación
const createAlertSchema = z.object({
  type: z.enum(['pest', 'disease', 'irrigation', 'nutrition', 'environmental', 'growth']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string().min(1),
  message: z.string().min(1),
  cropId: z.string().optional(),
  aiRecommendation: z.string().optional(),
});

// GET /api/alerts - Obtener todas las alertas
router.get('/', async (req, res) => {
  const { severity, type, unreadOnly } = req.query;

  const where: Record<string, unknown> = {};

  if (severity) {
    where.severity = severity;
  }
  if (type) {
    where.type = type;
  }
  if (unreadOnly === 'true') {
    where.isRead = false;
  }

  const alerts = await prisma.alert.findMany({
    where,
    include: {
      crop: {
        select: { id: true, name: true },
      },
    },
    orderBy: [
      { isRead: 'asc' },
      { severity: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  // Transformar respuesta para incluir cropName
  const result = alerts.map(alert => ({
    ...alert,
    cropName: alert.crop?.name,
    timestamp: alert.createdAt,
  }));

  res.json(result);
});

// GET /api/alerts/:id - Obtener alerta por ID
router.get('/:id', async (req, res) => {
  const alert = await prisma.alert.findUnique({
    where: { id: req.params.id },
    include: {
      crop: true,
    },
  });

  if (!alert) {
    throw new AppError(404, 'Alerta no encontrada');
  }

  res.json({
    ...alert,
    cropName: alert.crop?.name,
    timestamp: alert.createdAt,
  });
});

// POST /api/alerts - Crear alerta
router.post('/', async (req, res) => {
  const data = createAlertSchema.parse(req.body);

  const alert = await prisma.alert.create({
    data,
    include: {
      crop: {
        select: { id: true, name: true },
      },
    },
  });

  res.status(201).json({
    ...alert,
    cropName: alert.crop?.name,
    timestamp: alert.createdAt,
  });
});

// PATCH /api/alerts/:id/read - Marcar como leída
router.patch('/:id/read', async (req, res) => {
  const alert = await prisma.alert.update({
    where: { id: req.params.id },
    data: { isRead: true },
  });

  res.json(alert);
});

// PATCH /api/alerts/read-all - Marcar todas como leídas
router.patch('/read-all', async (_req, res) => {
  await prisma.alert.updateMany({
    where: { isRead: false },
    data: { isRead: true },
  });

  res.json({ message: 'Todas las alertas marcadas como leídas' });
});

// DELETE /api/alerts/:id - Eliminar alerta
router.delete('/:id', async (req, res) => {
  await prisma.alert.delete({
    where: { id: req.params.id },
  });

  res.status(204).send();
});

export default router;
