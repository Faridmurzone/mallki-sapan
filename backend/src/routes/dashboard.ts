import { Router } from 'express';
import { prisma } from '../services/database.js';

const router = Router();

// GET /api/dashboard/stats - Estadísticas del dashboard
router.get('/stats', async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Ejecutar consultas en paralelo
  const [
    crops,
    activeAlerts,
    todayIrrigation,
    latestSensors,
  ] = await Promise.all([
    // Total de cultivos y salud promedio
    prisma.crop.findMany({
      select: { healthScore: true },
    }),
    // Alertas activas (no leídas)
    prisma.alert.count({
      where: { isRead: false },
    }),
    // Uso de agua hoy
    prisma.irrigationEvent.findMany({
      where: {
        startedAt: { gte: today },
      },
      select: { waterVolume: true },
    }),
    // Últimos valores de sensores
    prisma.sensor.findMany({
      where: {
        type: { in: ['humidity_soil', 'temperature'] },
      },
      select: { type: true, lastValue: true },
    }),
  ]);

  // Calcular estadísticas
  const totalCrops = crops.length;
  const healthyPercentage = totalCrops > 0
    ? Math.round(crops.reduce((sum, c) => sum + c.healthScore, 0) / totalCrops)
    : 0;

  const waterUsageToday = todayIrrigation.reduce((sum, e) => sum + e.waterVolume, 0);

  const soilSensors = latestSensors.filter(s => s.type === 'humidity_soil' && s.lastValue !== null);
  const avgSoilHumidity = soilSensors.length > 0
    ? Math.round(soilSensors.reduce((sum, s) => sum + (s.lastValue || 0), 0) / soilSensors.length * 10) / 10
    : 0;

  const tempSensor = latestSensors.find(s => s.type === 'temperature');
  const currentTemperature = tempSensor?.lastValue || 0;

  res.json({
    totalCrops,
    healthyPercentage,
    activeAlerts,
    waterUsageToday,
    avgSoilHumidity,
    currentTemperature,
  });
});

// GET /api/dashboard/sensor-history - Historial de sensores para gráficos
router.get('/sensor-history', async (req, res) => {
  const hours = parseInt(req.query.hours as string) || 24;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  // Obtener sensores por tipo
  const sensors = await prisma.sensor.findMany({
    where: {
      type: { in: ['humidity_soil', 'humidity_air', 'temperature', 'light'] },
    },
    include: {
      readings: {
        where: { timestamp: { gte: since } },
        orderBy: { timestamp: 'asc' },
      },
    },
  });

  // Agrupar por tipo
  const history: Record<string, Array<{ timestamp: string; value: number }>> = {
    soilHumidity: [],
    temperature: [],
    airHumidity: [],
    light: [],
  };

  const typeMapping: Record<string, string> = {
    humidity_soil: 'soilHumidity',
    temperature: 'temperature',
    humidity_air: 'airHumidity',
    light: 'light',
  };

  for (const sensor of sensors) {
    const key = typeMapping[sensor.type];
    if (key && sensor.readings.length > 0) {
      // Si ya hay datos para este tipo, promediarlos
      if (history[key].length === 0) {
        history[key] = sensor.readings.map(r => ({
          timestamp: r.timestamp.toISOString(),
          value: Math.round(r.value * 10) / 10,
        }));
      }
    }
  }

  res.json(history);
});

// GET /api/dashboard/recent-activity - Actividad reciente
router.get('/recent-activity', async (_req, res) => {
  const [recentAlerts, recentIrrigation, recentPhotos] = await Promise.all([
    prisma.alert.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        crop: { select: { name: true } },
      },
    }),
    prisma.irrigationEvent.findMany({
      take: 5,
      orderBy: { startedAt: 'desc' },
      include: {
        zones: { include: { zone: true } },
      },
    }),
    prisma.photo.findMany({
      take: 5,
      orderBy: { capturedAt: 'desc' },
      include: {
        crop: { select: { name: true } },
        analysis: true,
      },
    }),
  ]);

  res.json({
    alerts: recentAlerts.map(a => ({
      ...a,
      cropName: a.crop?.name,
      timestamp: a.createdAt,
    })),
    irrigation: recentIrrigation.map(e => ({
      ...e,
      timestamp: e.startedAt,
      zones: e.zones.map(ez => ez.zone.name),
    })),
    photos: recentPhotos.map(p => ({
      ...p,
      cropName: p.crop.name,
      aiAnalysis: p.analysis,
    })),
  });
});

export default router;
