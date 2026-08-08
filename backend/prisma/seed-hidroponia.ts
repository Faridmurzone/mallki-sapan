/**
 * Seed de datos hidropónicos (aditivo e idempotente).
 *
 * Crea/reemplaza los sensores de la solución nutritiva con 24h de lecturas
 * (para que el dashboard y los gráficos tengan datos), calibraciones de pH/EC,
 * una zona de riego, dos programaciones y un par de alertas de ejemplo.
 *
 * Correr:  npm run db:seed:hidro   (o: pnpm db:seed:hidro)
 */
import { PrismaClient, SensorType, SensorStatus } from '@prisma/client';

const prisma = new PrismaClient();

const round2 = (n: number) => Math.round(n * 100) / 100;

function statusFor(type: SensorType, v: number): SensorStatus {
  if (type === 'ph') {
    if (v < 5 || v > 8) return 'critical';
    if (v < 5.5 || v > 7.5) return 'warning';
  } else if (type === 'ec') {
    if (v < 0.8 || v > 2.8) return 'critical';
    if (v < 1.0 || v > 2.4) return 'warning';
  } else if (type === 'water_level') {
    if (v < 15) return 'critical';
    if (v < 30) return 'warning';
  } else if (type === 'temperature') {
    if (v < 10 || v > 35) return 'critical';
    if (v < 15 || v > 30) return 'warning';
  }
  return 'normal';
}

// Definición de cada sensor y cómo generar su serie de 24h.
interface HydroDef {
  name: string;
  type: SensorType;
  unit: string;
  base?: number;
  jitter?: number;
  drain?: boolean;
}

const HYDRO: HydroDef[] = [
  { name: 'pH Solución', type: 'ph', unit: 'pH', base: 6.1, jitter: 0.25 },
  { name: 'Temperatura del Agua', type: 'temperature', unit: '°C', base: 21.5, jitter: 1.8 },
  { name: 'EC / Nutrientes', type: 'ec', unit: 'mS/cm', base: 1.8, jitter: 0.18 },
  { name: 'Nivel del Tanque', type: 'water_level', unit: '%', drain: true },
];

async function main() {
  console.log('🌱 Seed hidropónico...\n');

  const names = HYDRO.map((h) => h.name);
  // Cascada elimina las lecturas asociadas.
  await prisma.sensor.deleteMany({ where: { name: { in: names } } });
  await prisma.calibration.deleteMany({ where: { key: { in: ['ph', 'ec'] } } });
  await prisma.irrigationSchedule.deleteMany({
    where: { name: { in: ['Riego matutino', 'Riego vespertino'] } },
  });

  const now = Date.now();
  const POINTS = 48; // cada 30 min durante 24h

  for (const h of HYDRO) {
    const readings: { value: number; timestamp: Date }[] = [];
    let level = 95;
    for (let i = POINTS; i >= 0; i--) {
      const timestamp = new Date(now - i * 30 * 60 * 1000);
      let value: number;
      if (h.drain) {
        level -= 0.7 + Math.random() * 0.6; // baja de a poco
        if (level < 22) level = 95; // rellenado del tanque
        value = level;
      } else {
        value = h.base! + Math.sin(i / 6) * h.jitter! + (Math.random() - 0.5) * h.jitter! * 0.5;
      }
      readings.push({ value: round2(value), timestamp });
    }
    const last = readings[readings.length - 1].value;
    const sensor = await prisma.sensor.create({
      data: {
        name: h.name,
        type: h.type,
        unit: h.unit,
        lastValue: last,
        lastUpdate: new Date(),
        status: statusFor(h.type, last),
      },
    });
    await prisma.sensorReading.createMany({
      data: readings.map((r) => ({ sensorId: sensor.id, value: r.value, timestamp: r.timestamp })),
    });
    console.log(`   📡 ${h.name}: ${readings.length} lecturas (últ. ${last} ${h.unit}, ${sensor.status})`);
  }

  // Calibraciones
  await prisma.calibration.create({
    data: { key: 'ph', params: { voltageAt7: 2.5, voltageAt4: 3.04 }, note: 'seed' },
  });
  await prisma.calibration.create({
    data: { key: 'ec', params: { kValue: 1.0 }, note: 'seed' },
  });
  console.log('   🧪 calibraciones pH y EC');

  // Zona + programaciones
  let zona = await prisma.irrigationZone.findFirst({ where: { name: 'Tubo 1' } });
  if (!zona) zona = await prisma.irrigationZone.create({ data: { name: 'Tubo 1' } });
  await prisma.irrigationSchedule.create({
    data: { name: 'Riego matutino', time: '06:00', duration: 15, days: [], zoneIds: [zona.id], enabled: true },
  });
  await prisma.irrigationSchedule.create({
    data: { name: 'Riego vespertino', time: '18:00', duration: 20, days: [1, 3, 5], zoneIds: [zona.id], enabled: true },
  });
  console.log('   ⏰ zona "Tubo 1" + 2 programaciones');

  // Alertas de ejemplo
  await prisma.alert.createMany({
    data: [
      {
        type: 'irrigation', severity: 'medium',
        title: 'Nivel del tanque bajando',
        message: 'El nivel del tanque está por debajo del 30%. Considerá rellenar pronto.',
        aiRecommendation: 'Rellená el tanque; verificá que la bomba no trabaje en seco.',
      },
      {
        type: 'nutrition', severity: 'low',
        title: 'EC en el límite inferior',
        message: 'La EC ronda 1.0 mS/cm; los nutrientes podrían estar diluyéndose.',
        aiRecommendation: 'Agregá solución nutritiva en dosis chica y volvé a medir.',
      },
    ],
  });
  console.log('   ⚠ 2 alertas de ejemplo\n');

  console.log('✅ Seed hidropónico listo.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
