import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../services/database.js';
import { AppError } from '../middleware/error-handler.js';

const router = Router();

// Schemas de validación
const createSensorSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['humidity_soil', 'humidity_air', 'temperature', 'light', 'ph']),
  unit: z.string().min(1),
});

const createReadingSchema = z.object({
  value: z.number(),
  timestamp: z.string().datetime().optional(),
});

// GET /api/sensors - Obtener todos los sensores
router.get('/', async (_req, res) => {
  const sensors = await prisma.sensor.findMany({
    orderBy: { name: 'asc' },
  });
  res.json(sensors);
});

// GET /api/sensors/:id - Obtener sensor por ID
router.get('/:id', async (req, res) => {
  const sensor = await prisma.sensor.findUnique({
    where: { id: req.params.id },
    include: {
      readings: {
        orderBy: { timestamp: 'desc' },
        take: 100,
      },
    },
  });

  if (!sensor) {
    throw new AppError(404, 'Sensor no encontrado');
  }

  res.json(sensor);
});

// POST /api/sensors - Crear sensor
router.post('/', async (req, res) => {
  const data = createSensorSchema.parse(req.body);

  const sensor = await prisma.sensor.create({
    data,
  });

  res.status(201).json(sensor);
});

// PUT /api/sensors/:id - Actualizar sensor
router.put('/:id', async (req, res) => {
  const data = createSensorSchema.partial().parse(req.body);

  const sensor = await prisma.sensor.update({
    where: { id: req.params.id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });

  res.json(sensor);
});

// DELETE /api/sensors/:id - Eliminar sensor
router.delete('/:id', async (req, res) => {
  await prisma.sensor.delete({
    where: { id: req.params.id },
  });

  res.status(204).send();
});

// POST /api/sensors/:id/readings - Agregar lectura
router.post('/:id/readings', async (req, res) => {
  const { value, timestamp } = createReadingSchema.parse(req.body);

  const sensor = await prisma.sensor.findUnique({
    where: { id: req.params.id },
  });

  if (!sensor) {
    throw new AppError(404, 'Sensor no encontrado');
  }

  // Determinar el status basado en el valor
  let status: 'normal' | 'warning' | 'critical' = 'normal';

  if (sensor.type === 'humidity_soil') {
    if (value < 30 || value > 80) status = 'critical';
    else if (value < 40 || value > 70) status = 'warning';
  } else if (sensor.type === 'temperature') {
    if (value < 10 || value > 35) status = 'critical';
    else if (value < 15 || value > 30) status = 'warning';
  } else if (sensor.type === 'ph') {
    if (value < 5 || value > 8) status = 'critical';
    else if (value < 5.5 || value > 7.5) status = 'warning';
  }

  // Crear lectura y actualizar sensor
  const [reading] = await prisma.$transaction([
    prisma.sensorReading.create({
      data: {
        sensorId: req.params.id,
        value,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      },
    }),
    prisma.sensor.update({
      where: { id: req.params.id },
      data: {
        lastValue: value,
        lastUpdate: new Date(),
        status,
      },
    }),
  ]);

  res.status(201).json(reading);
});

// GET /api/sensors/:id/readings - Obtener lecturas de un sensor
router.get('/:id/readings', async (req, res) => {
  const hours = parseInt(req.query.hours as string) || 24;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const readings = await prisma.sensorReading.findMany({
    where: {
      sensorId: req.params.id,
      timestamp: { gte: since },
    },
    orderBy: { timestamp: 'asc' },
  });

  res.json(readings);
});

export default router;
