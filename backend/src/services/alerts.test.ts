import { describe, expect, it } from 'vitest';
import { buildIssueDedupeKey, normalizeCategoria, shouldFold } from './alerts.js';

const AHORA = new Date('2026-08-08T12:00:00Z');
const UN_DIA = 86400;

function haceHoras(horas: number) {
  return new Date(AHORA.getTime() - horas * 3600 * 1000);
}

describe('shouldFold', () => {
  it('se pliega sobre una alerta sin leer por vieja que sea', () => {
    // Nadie la atendió todavía: apilarle otra encima no agrega información,
    // sólo ensucia la pantalla.
    expect(shouldFold({ isRead: false, createdAt: haceHoras(72) }, AHORA, UN_DIA)).toBe(true);
  });

  it('se pliega sobre una alerta leída si es reciente', () => {
    expect(shouldFold({ isRead: true, createdAt: haceHoras(3) }, AHORA, UN_DIA)).toBe(true);
  });

  it('crea una nueva si la leída ya es vieja', () => {
    // Que el problema siga un día después de que lo miraste es una novedad:
    // no se resolvió, y eso merece avisar de nuevo.
    expect(shouldFold({ isRead: true, createdAt: haceHoras(25) }, AHORA, UN_DIA)).toBe(false);
  });

  it('respeta una ventana a medida', () => {
    const previa = { isRead: true, createdAt: haceHoras(2) };
    expect(shouldFold(previa, AHORA, 3600)).toBe(false); // ventana de 1h
    expect(shouldFold(previa, AHORA, 10800)).toBe(true); // ventana de 3h
  });
});

describe('normalizeCategoria', () => {
  it('acepta las categorías conocidas', () => {
    expect(normalizeCategoria('clorosis')).toBe('clorosis');
    expect(normalizeCategoria('  RAICES ')).toBe('raices');
  });

  it('cae en "otro" ante cualquier cosa rara', () => {
    // Tolerante a propósito: si la lista del ai-engine se adelanta a la del
    // backend, preferimos deduplicar peor antes que rechazar el análisis.
    expect(normalizeCategoria('categoria_que_no_existe')).toBe('otro');
    expect(normalizeCategoria('')).toBe('otro');
    expect(normalizeCategoria(undefined)).toBe('otro');
  });
});

describe('buildIssueDedupeKey', () => {
  it('separa el mismo problema en cultivos distintos', () => {
    // Dos tubos con clorosis son dos problemas, no el mismo repetido.
    const a = buildIssueDedupeKey('clorosis', { cropId: 'lechuga' });
    const b = buildIssueDedupeKey('clorosis', { cropId: 'albahaca' });
    expect(a).not.toBe(b);
  });

  it('separa problemas distintos en el mismo cultivo', () => {
    expect(buildIssueDedupeKey('clorosis', { cropId: 'lechuga' })).not.toBe(
      buildIssueDedupeKey('plaga', { cropId: 'lechuga' })
    );
  });

  it('usa la cámara cuando la foto no tiene cultivo', () => {
    expect(buildIssueDedupeKey('algas', { cropId: null, cameraId: 'esp32-cam-01' })).toBe(
      'foto:esp32-cam-01:algas'
    );
  });

  it('es estable entre análisis sucesivos del mismo ámbito', () => {
    // Esto es lo que hace que la deduplicación funcione: la clave no depende
    // del texto que escribe el modelo, que cambia en cada foto.
    expect(buildIssueDedupeKey('clorosis', { cropId: 'lechuga' })).toBe(
      buildIssueDedupeKey('clorosis', { cropId: 'lechuga', cameraId: 'otra-camara' })
    );
  });
});
