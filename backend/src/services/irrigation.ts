import { prisma } from './database.js';

// Nivel mínimo del tanque (%) para permitir el riego. Por debajo la bomba
// trabajaría en seco -> se bloquea (regla RN-01).
export const MIN_TANK_LEVEL_PCT = 15;

export type IrrigationTrigger = 'scheduled' | 'ai_decision' | 'manual';

// Nivel de tanque más bajo reportado por algún sensor water_level.
// null si no hay sensores de nivel o no tienen lectura todavía.
export async function getLowestTankLevel(): Promise<number | null> {
  const levelSensors = await prisma.sensor.findMany({
    where: { type: 'water_level', lastValue: { not: null } },
    select: { lastValue: true },
  });
  if (levelSensors.length === 0) return null;
  return Math.min(...levelSensors.map((s) => s.lastValue as number));
}

// Error de dominio: el tanque está por debajo del mínimo seguro.
export class TankTooLowError extends Error {
  constructor(public level: number) {
    super(
      `Riego bloqueado: nivel del tanque ${level}% < mínimo ${MIN_TANK_LEVEL_PCT}%. Rellenar el tanque.`,
    );
    this.name = 'TankTooLowError';
  }
}

// Error de dominio: alguna zona no existe.
export class ZoneNotFoundError extends Error {
  constructor() {
    super('Una o más zonas no encontradas');
    this.name = 'ZoneNotFoundError';
  }
}

// Ejecuta un riego: verifica nivel, valida zonas y crea el evento.
// Lo usan tanto la ruta /api/irrigation/auto como el scheduler.
export async function runIrrigation(opts: {
  zoneIds: string[];
  duration: number;
  trigger: IrrigationTrigger;
}) {
  const { zoneIds, duration, trigger } = opts;

  const level = await getLowestTankLevel();
  if (level !== null && level < MIN_TANK_LEVEL_PCT) {
    throw new TankTooLowError(level);
  }

  const zones = await prisma.irrigationZone.findMany({
    where: { id: { in: zoneIds } },
  });
  if (zones.length !== zoneIds.length) {
    throw new ZoneNotFoundError();
  }

  // Volumen aproximado (3 L/min por zona).
  const waterVolume = duration * 3 * zoneIds.length;

  const event = await prisma.irrigationEvent.create({
    data: {
      trigger,
      duration,
      waterVolume,
      endedAt: new Date(Date.now() + duration * 60 * 1000),
      zones: { create: zoneIds.map((zoneId) => ({ zoneId })) },
    },
    include: { zones: { include: { zone: true } } },
  });

  return { event, level };
}
