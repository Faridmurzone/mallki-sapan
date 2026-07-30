import { prisma } from './database.js';
import { runIrrigation, TankTooLowError } from './irrigation.js';

// Scheduler simple: cada minuto revisa las programaciones habilitadas cuyo
// horario coincide con el minuto actual y las ejecuta (respetando el nivel
// del tanque). No necesita cron externo.
export function startScheduler(): void {
  setInterval(() => {
    tick().catch((e) => console.error('Scheduler tick error:', e));
  }, 60_000);
  console.log('⏰ Scheduler de riego programado activo (revisa cada 60s)');
}

async function tick(): Promise<void> {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const day = now.getDay(); // 0 (dom) .. 6 (sáb)

  const schedules = await prisma.irrigationSchedule.findMany({
    where: { enabled: true, time },
  });

  for (const s of schedules) {
    // días vacío = todos los días
    if (s.days.length > 0 && !s.days.includes(day)) continue;
    // evitar doble disparo dentro del mismo minuto
    if (s.lastRun && now.getTime() - s.lastRun.getTime() < 60_000) continue;

    try {
      await runIrrigation({ zoneIds: s.zoneIds, duration: s.duration, trigger: 'scheduled' });
      await prisma.irrigationSchedule.update({
        where: { id: s.id },
        data: { lastRun: now },
      });
      console.log(`💧 Riego programado "${s.name}" ejecutado (${s.duration} min)`);
    } catch (e) {
      if (e instanceof TankTooLowError) {
        console.warn(`⚠ Riego programado "${s.name}" bloqueado: ${e.message}`);
      } else {
        console.error(`Error ejecutando riego "${s.name}":`, e);
      }
    }
  }
}
