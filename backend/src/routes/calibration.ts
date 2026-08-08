import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../services/database.js';
import { AppError } from '../middleware/error-handler.js';

const router = Router();

// Parametros de calibracion aceptados por tipo.
const phParamsSchema = z.object({
  voltageAt7: z.number(),
  voltageAt4: z.number(),
});
const ecParamsSchema = z.object({
  kValue: z.number().positive(),
});

const KEY_SCHEMAS: Record<string, z.ZodTypeAny> = {
  ph: phParamsSchema,
  ec: ecParamsSchema,
};

const upsertSchema = z.object({
  params: z.record(z.string(), z.any()),
  note: z.string().optional(),
});

// GET /api/calibration - Todas las calibraciones
router.get('/', async (_req, res) => {
  const items = await prisma.calibration.findMany({ orderBy: { key: 'asc' } });
  res.json(items);
});

// GET /api/calibration/:key - Calibracion de un parametro
router.get('/:key', async (req, res) => {
  const item = await prisma.calibration.findUnique({
    where: { key: req.params.key },
  });
  if (!item) {
    throw new AppError(404, `Sin calibracion para "${req.params.key}"`);
  }
  res.json(item);
});

// PUT /api/calibration/:key - Guardar/actualizar calibracion (upsert)
router.put('/:key', async (req, res) => {
  const key = req.params.key;
  const schema = KEY_SCHEMAS[key];
  if (!schema) {
    throw new AppError(400, `Parametro de calibracion desconocido: "${key}"`);
  }

  const { params, note } = upsertSchema.parse(req.body);
  // Validar la forma de params segun el tipo (ph/ec).
  const parsed = schema.safeParse(params);
  if (!parsed.success) {
    throw new AppError(400, `Parametros invalidos para "${key}": ${parsed.error.message}`);
  }

  const item = await prisma.calibration.upsert({
    where: { key },
    update: { params: parsed.data, note },
    create: { key, params: parsed.data, note },
  });

  res.json(item);
});

export default router;
