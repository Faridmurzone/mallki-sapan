import { createHash } from 'node:crypto';

/**
 * Identificador de cámara. Estricto a propósito: este valor se usa para armar
 * la clave del objeto en el storage, así que cualquier cosa que permita "..",
 * "/" o "\" sería un path traversal.
 */
export const CAMERA_ID_PATTERN = /^[a-z0-9][a-z0-9-]{2,63}$/;

export function isValidCameraId(value: string): boolean {
  return CAMERA_ID_PATTERN.test(value);
}

/** Tamaño máximo aceptado por imagen. */
export const MAX_IMAGE_BYTES = Number(process.env.MAX_IMAGE_BYTES || 2 * 1024 * 1024);

export function sha256Hex(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

/**
 * Interpreta el header X-Captured-At.
 *
 * Devuelve null si falta o no es una fecha válida, en vez de rechazar el
 * pedido: la ESP32 puede no haber sincronizado por NTP todavía, y perder la
 * hora exacta es mucho mejor que perder la foto. Quien llama usa la hora de
 * recepción como respaldo.
 */
export function parseCapturedAt(raw: string | undefined): Date | null {
  if (!raw) return null;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;

  // Un reloj sin sincronizar arranca en 1970 y a veces manda fechas futuras
  // absurdas. Una hora de tolerancia hacia adelante cubre desfasajes normales.
  const year = parsed.getUTCFullYear();
  if (year < 2020 || parsed.getTime() > Date.now() + 3600_000) return null;

  return parsed;
}

/**
 * Clave de deduplicación: es lo que hace idempotente el POST de ingesta.
 *
 * El caso que resuelve: la cámara manda una foto, el backend la guarda, y la
 * respuesta se pierde por un corte de WiFi. La cámara reintenta el mismo POST.
 * Sin esta clave tendríamos la misma foto dos veces.
 *
 * Prioridad:
 *  1. X-Request-Id, si el dispositivo lo manda: es lo más explícito.
 *  2. cameraId + instante de captura: una cámara no puede sacar dos fotos en
 *     el mismo milisegundo, así que identifica la captura de forma natural.
 *  3. cameraId + hash del contenido: respaldo para cuando no hay reloj. Dos
 *     capturas distintas casi nunca dan el mismo hash; dos reintentos, siempre.
 */
export function buildDedupeKey(params: {
  cameraId: string;
  requestId?: string;
  capturedAt: Date | null;
  contentHash: string;
}): string {
  const { cameraId, requestId, capturedAt, contentHash } = params;

  if (requestId) return `req:${cameraId}:${requestId}`;
  if (capturedAt) return `cap:${cameraId}:${capturedAt.toISOString()}`;

  return `sha:${cameraId}:${contentHash}`;
}

/**
 * Clave del objeto en el storage. Se particiona por cámara y fecha para que
 * el directorio no termine con decenas de miles de archivos planos.
 */
export function buildStorageKey(params: {
  cameraId: string;
  capturedAt: Date;
  contentHash: string;
}): string {
  const { cameraId, capturedAt, contentHash } = params;

  const yyyy = capturedAt.getUTCFullYear();
  const mm = String(capturedAt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(capturedAt.getUTCDate()).padStart(2, '0');
  const stamp = capturedAt.toISOString().replace(/[:.]/g, '-');

  return `cameras/${cameraId}/${yyyy}/${mm}/${dd}/${stamp}_${contentHash.slice(0, 12)}.jpg`;
}
