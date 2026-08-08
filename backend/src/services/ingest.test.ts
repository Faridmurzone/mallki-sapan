import { describe, expect, it } from 'vitest';
import {
  buildDedupeKey,
  buildStorageKey,
  isValidCameraId,
  parseCapturedAt,
} from './ingest.js';

describe('isValidCameraId', () => {
  it('acepta identificadores con el formato esperado', () => {
    expect(isValidCameraId('esp32-cam-01')).toBe(true);
    expect(isValidCameraId('cam1')).toBe(true);
  });

  it('rechaza lo que permitiría escapar del directorio de storage', () => {
    // Este es el motivo de que la regex sea estricta: el cameraId termina
    // formando parte de la ruta del archivo que se escribe en disco.
    expect(isValidCameraId('../../etc/passwd')).toBe(false);
    expect(isValidCameraId('cam/../secret')).toBe(false);
    expect(isValidCameraId('cam\\win')).toBe(false);
    expect(isValidCameraId('..')).toBe(false);
  });

  it('rechaza mayúsculas, vacíos y demasiado cortos', () => {
    expect(isValidCameraId('ESP32-CAM')).toBe(false);
    expect(isValidCameraId('')).toBe(false);
    expect(isValidCameraId('ab')).toBe(false);
    expect(isValidCameraId('-empieza-con-guion')).toBe(false);
    expect(isValidCameraId('a'.repeat(65))).toBe(false);
  });
});

describe('parseCapturedAt', () => {
  it('interpreta una fecha ISO en UTC', () => {
    const d = parseCapturedAt('2026-08-07T23:15:00Z');
    expect(d?.toISOString()).toBe('2026-08-07T23:15:00.000Z');
  });

  it('devuelve null si falta o no es una fecha', () => {
    expect(parseCapturedAt(undefined)).toBeNull();
    expect(parseCapturedAt('')).toBeNull();
    expect(parseCapturedAt('mañana')).toBeNull();
  });

  it('descarta el reloj sin sincronizar en vez de rechazar la foto', () => {
    // La ESP32 arranca en 1970 hasta que NTP responde. Quien llama usa la
    // hora de recepción como respaldo: la foto se guarda igual.
    expect(parseCapturedAt('1970-01-01T00:00:00Z')).toBeNull();
  });

  it('descarta fechas futuras absurdas', () => {
    const dentroDeUnAnio = new Date(Date.now() + 365 * 24 * 3600_000);
    expect(parseCapturedAt(dentroDeUnAnio.toISOString())).toBeNull();
  });

  it('tolera un desfasaje chico hacia adelante', () => {
    const enDiezMinutos = new Date(Date.now() + 10 * 60_000);
    expect(parseCapturedAt(enDiezMinutos.toISOString())).not.toBeNull();
  });
});

describe('buildDedupeKey', () => {
  const base = {
    cameraId: 'esp32-cam-01',
    capturedAt: new Date('2026-08-07T23:15:00Z'),
    contentHash: 'a'.repeat(64),
  };

  it('un reintento de la misma captura da la misma clave', () => {
    expect(buildDedupeKey(base)).toBe(buildDedupeKey({ ...base }));
  });

  it('dos capturas distintas dan claves distintas', () => {
    const otra = { ...base, capturedAt: new Date('2026-08-07T23:16:00Z') };
    expect(buildDedupeKey(base)).not.toBe(buildDedupeKey(otra));
  });

  it('la misma captura en dos cámaras no colisiona', () => {
    const otraCamara = { ...base, cameraId: 'esp32-cam-02' };
    expect(buildDedupeKey(base)).not.toBe(buildDedupeKey(otraCamara));
  });

  it('X-Request-Id tiene prioridad sobre la hora de captura', () => {
    const clave = buildDedupeKey({ ...base, requestId: 'abc-123' });
    expect(clave).toContain('abc-123');
    expect(clave).not.toContain('2026-08-07');
  });

  it('sin reloj, cae al hash del contenido', () => {
    const sinReloj = { ...base, capturedAt: null };
    expect(buildDedupeKey(sinReloj)).toBe(`sha:esp32-cam-01:${'a'.repeat(64)}`);
  });

  it('sin reloj, dos imágenes distintas no se toman por duplicadas', () => {
    const a = buildDedupeKey({ ...base, capturedAt: null });
    const b = buildDedupeKey({ ...base, capturedAt: null, contentHash: 'b'.repeat(64) });
    expect(a).not.toBe(b);
  });
});

describe('buildStorageKey', () => {
  it('particiona por cámara y fecha', () => {
    const key = buildStorageKey({
      cameraId: 'esp32-cam-01',
      capturedAt: new Date('2026-08-07T23:15:00Z'),
      contentHash: 'abcdef0123456789'.repeat(4),
    });

    expect(key).toMatch(/^cameras\/esp32-cam-01\/2026\/08\/07\/.*\.jpg$/);
  });

  it('no genera caracteres inválidos para un nombre de archivo', () => {
    const key = buildStorageKey({
      cameraId: 'esp32-cam-01',
      capturedAt: new Date('2026-08-07T23:15:00.123Z'),
      contentHash: 'f'.repeat(64),
    });

    const nombre = key.split('/').pop() ?? '';
    expect(nombre).not.toMatch(/[:*?"<>|]/);
  });
});
