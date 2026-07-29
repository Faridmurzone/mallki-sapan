import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../services/database.js';
import { AppError } from '../middleware/error-handler.js';

const router = Router();

// Nivel minimo del tanque (%) para permitir el riego.
// Por debajo de esto la bomba trabajaria en seco -> se bloquea (RN-01).
const MIN_TANK_LEVEL_PCT = 15;

// Devuelve el nivel de tanque mas bajo reportado por algun sensor water_level.
// null si no hay sensores de nivel o no tienen lectura todavia.
async function getLowestTankLevel(): Promise<number | null> {
  const levelSensors = await prisma.sensor.findMany({
    where: { type: 'water_level', lastValue: { not: null } },
    select: { lastValue: true },
  });
  if (levelSensors.length === 0) return null;
  return Math.min(...levelSensors.map(s => s.lastValue as number));
}

// Schemas de validación
const createZoneSchema = z.object({
  name: z.string().min(1),
  isActive: z.boolean().default(true),
});

const createEventSchema = z.object({
  trigger: z.enum(['scheduled', 'ai_decision', 'manual']),
  duration: z.number().positive(),
  waterVolume: z.number().positive(),
  zoneIds: z.array(z.string()).min(1),
});

// =====================================
// ZONAS DE RIEGO
// =====================================

// GET /api/irrigation/zones - Obtener todas las zonas
router.get('/zones', async (_req, res) => {
  const zones = await prisma.irrigationZone.findMany({
    orderBy: { name: 'asc' },
  });

  res.json(zones);
});

// POST /api/irrigation/zones - Crear zona
router.post('/zones', async (req, res) => {
  const data = createZoneSchema.parse(req.body);

  const zone = await prisma.irrigationZone.create({
    data,
  });

  res.status(201).json(zone);
});

// PUT /api/irrigation/zones/:id - Actualizar zona
router.put('/zones/:id', async (req, res) => {
  const data = createZoneSchema.partial().parse(req.body);

  const zone = await prisma.irrigationZone.update({
    where: { id: req.params.id },
    data,
  });

  res.json(zone);
});

// DELETE /api/irrigation/zones/:id - Eliminar zona
router.delete('/zones/:id', async (req, res) => {
  await prisma.irrigationZone.delete({
    where: { id: req.params.id },
  });

  res.status(204).send();
});

// =====================================
// EVENTOS DE RIEGO
// =====================================

// GET /api/irrigation/events - Obtener eventos de riego
router.get('/events', async (req, res) => {
  const days = parseInt(req.query.days as string) || 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const events = await prisma.irrigationEvent.findMany({
    where: {
      startedAt: { gte: since },
    },
    include: {
      zones: {
        include: {
          zone: true,
        },
      },
    },
    orderBy: { startedAt: 'desc' },
  });

  // Transformar respuesta
  const result = events.map(event => ({
    ...event,
    timestamp: event.startedAt,
    zones: event.zones.map(ez => ez.zone.name),
  }));

  res.json(result);
});

// GET /api/irrigation/events/:id - Obtener evento por ID
router.get('/events/:id', async (req, res) => {
  const event = await prisma.irrigationEvent.findUnique({
    where: { id: req.params.id },
    include: {
      zones: {
        include: { zone: true },
      },
    },
  });

  if (!event) {
    throw new AppError(404, 'Evento de riego no encontrado');
  }

  res.json({
    ...event,
    timestamp: event.startedAt,
    zones: event.zones.map(ez => ez.zone.name),
  });
});

// POST /api/irrigation/events - Crear evento de riego
router.post('/events', async (req, res) => {
  const { zoneIds, ...data } = createEventSchema.parse(req.body);

  // Verificar que las zonas existen
  const zones = await prisma.irrigationZone.findMany({
    where: { id: { in: zoneIds } },
  });

  if (zones.length !== zoneIds.length) {
    throw new AppError(400, 'Una o más zonas no encontradas');
  }

  const event = await prisma.irrigationEvent.create({
    data: {
      ...data,
      endedAt: new Date(Date.now() + data.duration * 60 * 1000),
      zones: {
        create: zoneIds.map(zoneId => ({ zoneId })),
      },
    },
    include: {
      zones: {
        include: { zone: true },
      },
    },
  });

  res.status(201).json({
    ...event,
    timestamp: event.startedAt,
    zones: event.zones.map(ez => ez.zone.name),
  });
});

// POST /api/irrigation/start - Iniciar riego manual
router.post('/start', async (req, res) => {
  const { zoneIds, duration = 15 } = z.object({
    zoneIds: z.array(z.string()).min(1),
    duration: z.number().positive().default(15),
  }).parse(req.body);

  // Calcular volumen aproximado (3 litros por minuto por zona)
  const waterVolume = duration * 3 * zoneIds.length;

  const event = await prisma.irrigationEvent.create({
    data: {
      trigger: 'manual',
      duration,
      waterVolume,
      zones: {
        create: zoneIds.map(zoneId => ({ zoneId })),
      },
    },
    include: {
      zones: {
        include: { zone: true },
      },
    },
  });

  res.status(201).json({
    ...event,
    message: `Riego iniciado en ${event.zones.map(ez => ez.zone.name).join(', ')}`,
    zones: event.zones.map(ez => ez.zone.name),
  });
});

// POST /api/irrigation/stop - Detener riego
router.post('/stop', async (_req, res) => {
  // Buscar evento activo (sin endedAt o endedAt en el futuro)
  const activeEvent = await prisma.irrigationEvent.findFirst({
    where: {
      OR: [
        { endedAt: null },
        { endedAt: { gt: new Date() } },
      ],
    },
    orderBy: { startedAt: 'desc' },
  });

  if (!activeEvent) {
    throw new AppError(400, 'No hay riego activo');
  }

  const event = await prisma.irrigationEvent.update({
    where: { id: activeEvent.id },
    data: { endedAt: new Date() },
  });

  res.json({
    ...event,
    message: 'Riego detenido',
  });
});

// GET /api/irrigation/can-irrigate - Consultar si se puede regar (chequeo de nivel)
// Lo usa el firmware/dashboard antes de bombear. No crea evento.
router.get('/can-irrigate', async (_req, res) => {
  const level = await getLowestTankLevel();
  const allowed = level === null ? true : level >= MIN_TANK_LEVEL_PCT;

  res.json({
    allowed,
    level,
    minLevel: MIN_TANK_LEVEL_PCT,
    reason: level === null
      ? 'Sin sensor de nivel: no se puede verificar (se permite por defecto)'
      : allowed
        ? 'Nivel suficiente'
        : `Nivel ${level}% por debajo del minimo ${MIN_TANK_LEVEL_PCT}% - bomba bloqueada`,
  });
});

// POST /api/irrigation/auto - Riego automatico con regla de seguridad (RN-01)
// Verifica el nivel del tanque ANTES de crear el evento. Si esta por debajo
// del minimo responde 409 y NO riega. Usar para riego programado o por IA.
router.post('/auto', async (req, res) => {
  const { zoneIds, duration, trigger } = z.object({
    zoneIds: z.array(z.string()).min(1),
    duration: z.number().positive().default(15),
    trigger: z.enum(['scheduled', 'ai_decision', 'manual']).default('scheduled'),
  }).parse(req.body);

  const level = await getLowestTankLevel();
  if (level !== null && level < MIN_TANK_LEVEL_PCT) {
    throw new AppError(
      409,
      `Riego bloqueado: nivel del tanque ${level}% < minimo ${MIN_TANK_LEVEL_PCT}%. Rellenar el tanque.`,
    );
  }

  // Verificar que las zonas existen
  const zones = await prisma.irrigationZone.findMany({
    where: { id: { in: zoneIds } },
  });
  if (zones.length !== zoneIds.length) {
    throw new AppError(400, 'Una o más zonas no encontradas');
  }

  // Volumen aproximado (3 L/min por zona)
  const waterVolume = duration * 3 * zoneIds.length;

  const event = await prisma.irrigationEvent.create({
    data: {
      trigger,
      duration,
      waterVolume,
      endedAt: new Date(Date.now() + duration * 60 * 1000),
      zones: { create: zoneIds.map(zoneId => ({ zoneId })) },
    },
    include: { zones: { include: { zone: true } } },
  });

  res.status(201).json({
    ...event,
    tankLevel: level,
    message: `Riego automatico (${trigger}) en ${event.zones.map(ez => ez.zone.name).join(', ')}`,
    zones: event.zones.map(ez => ez.zone.name),
  });
});

// GET /api/irrigation/stats - Estadísticas de riego
router.get('/stats', async (req, res) => {
  const days = parseInt(req.query.days as string) || 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const events = await prisma.irrigationEvent.findMany({
    where: {
      startedAt: { gte: since },
    },
  });

  const stats = {
    totalEvents: events.length,
    totalWaterUsage: events.reduce((sum, e) => sum + e.waterVolume, 0),
    totalDuration: events.reduce((sum, e) => sum + e.duration, 0),
    byTrigger: {
      scheduled: events.filter(e => e.trigger === 'scheduled').length,
      ai_decision: events.filter(e => e.trigger === 'ai_decision').length,
      manual: events.filter(e => e.trigger === 'manual').length,
    },
    avgWaterPerDay: events.reduce((sum, e) => sum + e.waterVolume, 0) / days,
  };

  res.json(stats);
});

export default router;
