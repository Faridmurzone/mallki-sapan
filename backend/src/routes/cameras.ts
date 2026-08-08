import { Router, raw } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '../services/database.js';
import { storage } from '../services/storage.js';
import { AppError } from '../middleware/error-handler.js';
import { parseJpeg, InvalidJpegError } from '../utils/jpeg.js';
import {
  MAX_IMAGE_BYTES,
  MIN_CAPTURE_INTERVAL_SEC,
  MAX_CAPTURE_INTERVAL_SEC,
  buildDedupeKey,
  buildStorageKey,
  clampCaptureInterval,
  isValidCameraId,
  parseCapturedAt,
  sha256Hex,
} from '../services/ingest.js';

const router = Router();

/**
 * Alta automática de cámaras desconocidas.
 *
 * Hoy el endpoint no tiene autenticación (decisión explícita para la primera
 * etapa), así que dar de alta sola una cámara no agrega una vía de abuso que
 * no exista ya. Cuando se sume la API key por dispositivo, esto pasa a false
 * y una cámara sin registrar tiene que recibir 404.
 */
const AUTO_REGISTER = process.env.CAMERA_AUTOREGISTER !== 'false';

// GET /api/cameras - Listar cámaras registradas
router.get('/', async (_req, res) => {
  const cameras = await prisma.camera.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      crop: { select: { id: true, name: true } },
      _count: { select: { photos: true } },
    },
  });

  res.json(
    cameras.map(camera => ({
      ...camera,
      cropName: camera.crop?.name ?? null,
      photoCount: camera._count.photos,
    }))
  );
});

const updateCameraSchema = z.object({
  name: z.string().trim().max(80).nullable().optional(),
  isActive: z.boolean().optional(),
  captureIntervalSec: z
    .number()
    .int()
    .min(MIN_CAPTURE_INTERVAL_SEC)
    .max(MAX_CAPTURE_INTERVAL_SEC)
    .optional(),
  cropId: z.string().nullable().optional(),
});

/**
 * GET /api/cameras/:cameraId/config - Config que el dispositivo consulta
 *
 * La cámara pega acá cada minuto, incluso estando en pausa: si sólo preguntara
 * al subir una foto, una vez pausada no habría forma de reactivarla desde la
 * web y habría que reiniciarla a mano.
 *
 * Respuesta chica a propósito, la parsea un ESP32 sin librería de JSON.
 */
router.get('/:cameraId/config', async (req, res) => {
  const { cameraId } = req.params;

  if (!isValidCameraId(cameraId)) {
    throw new AppError(400, 'cameraId inválido');
  }

  const now = new Date();

  // Con el alta automática activada, este endpoint también sirve para que una
  // cámara recién flasheada aparezca en la web antes de su primera foto.
  const camera = AUTO_REGISTER
    ? await prisma.camera.upsert({
        where: { id: cameraId },
        update: { lastSeenAt: now },
        create: { id: cameraId, lastSeenAt: now },
      })
    : await prisma.camera.findUnique({ where: { id: cameraId } });

  if (!camera) {
    throw new AppError(404, 'Cámara no registrada');
  }

  if (!AUTO_REGISTER) {
    // El upsert ya lo hizo en la otra rama; acá hay que marcarlo aparte.
    await prisma.camera.update({ where: { id: cameraId }, data: { lastSeenAt: now } });
  }

  res.json({
    enabled: camera.isActive,
    captureIntervalSec: camera.captureIntervalSec,
  });
});

// PATCH /api/cameras/:cameraId - Editar la cámara desde la web
router.patch('/:cameraId', async (req, res) => {
  const { cameraId } = req.params;

  if (!isValidCameraId(cameraId)) {
    throw new AppError(400, 'cameraId inválido');
  }

  const data = updateCameraSchema.parse(req.body);

  const camera = await prisma.camera.findUnique({ where: { id: cameraId } });
  if (!camera) {
    throw new AppError(404, 'Cámara no encontrada');
  }

  // Un cropId inexistente rompería con un error de FK poco legible.
  if (data.cropId) {
    const crop = await prisma.crop.findUnique({ where: { id: data.cropId } });
    if (!crop) {
      throw new AppError(404, 'Cultivo no encontrado');
    }
  }

  const updated = await prisma.camera.update({
    where: { id: cameraId },
    data: {
      ...data,
      name: data.name === '' ? null : data.name,
      ...(data.captureIntervalSec !== undefined && {
        captureIntervalSec: clampCaptureInterval(data.captureIntervalSec),
      }),
    },
    include: { crop: { select: { id: true, name: true } } },
  });

  res.json({ ...updated, cropName: updated.crop?.name ?? null });
});

/**
 * POST /api/cameras/:cameraId/images - Ingesta de una imagen desde la cámara
 *
 * Recibe el JPEG crudo en el body (no multipart, no base64).
 *
 *   Content-Type: image/jpeg
 *   X-Camera-Id:   esp32-cam-01     (opcional, tiene que coincidir con la URL)
 *   X-Captured-At: 2026-08-07T23:15:00Z  (opcional; si falta, se usa la hora de recepción)
 *   X-Request-Id:  <uuid>           (opcional, para deduplicar reintentos)
 *
 * Es idempotente: si el mismo POST llega dos veces —típicamente porque la
 * respuesta se perdió y el dispositivo reintentó— la segunda vez devuelve
 * 200 con el registro que ya existía, en lugar de duplicar la foto.
 */
router.post(
  '/:cameraId/images',
  raw({ type: 'image/jpeg', limit: MAX_IMAGE_BYTES }),
  async (req, res) => {
    const { cameraId } = req.params;

    if (!isValidCameraId(cameraId)) {
      throw new AppError(
        400,
        'cameraId inválido: se esperan 3 a 64 caracteres entre minúsculas, números y guiones'
      );
    }

    // Si el dispositivo manda el header, tiene que decir lo mismo que la URL.
    // Discrepar es señal de un cliente mal configurado y preferimos que se
    // entere ahora y no cuando las fotos aparezcan bajo la cámara equivocada.
    const headerCameraId = req.get('x-camera-id');
    if (headerCameraId && headerCameraId !== cameraId) {
      throw new AppError(400, 'X-Camera-Id no coincide con el cameraId de la URL');
    }

    // Con `type: 'image/jpeg'`, si el Content-Type es otro el body queda sin
    // parsear en vez de fallar, así que hay que chequearlo explícitamente.
    const body = req.body;
    if (!Buffer.isBuffer(body)) {
      throw new AppError(415, 'Se espera Content-Type: image/jpeg con el JPEG crudo en el body');
    }
    if (body.length === 0) {
      throw new AppError(400, 'El cuerpo del pedido está vacío');
    }

    let dimensions;
    try {
      dimensions = parseJpeg(body);
    } catch (err) {
      if (err instanceof InvalidJpegError) {
        throw new AppError(400, `Imagen inválida: ${err.message}`);
      }
      throw err;
    }

    const receivedAt = new Date();
    const capturedAt = parseCapturedAt(req.get('x-captured-at'));
    const contentHash = sha256Hex(body);

    const dedupeKey = buildDedupeKey({
      cameraId,
      requestId: req.get('x-request-id') || undefined,
      capturedAt,
      contentHash,
    });

    // Reintento de algo que ya guardamos: cortamos antes de tocar el storage.
    const existing = await prisma.photo.findUnique({ where: { dedupeKey } });
    if (existing) {
      return res.status(200).json({
        ok: true,
        imageId: existing.id,
        receivedAt: existing.createdAt.toISOString(),
        duplicate: true,
      });
    }

    const camera = AUTO_REGISTER
      ? await prisma.camera.upsert({
          where: { id: cameraId },
          update: { lastSeenAt: receivedAt },
          create: { id: cameraId, lastSeenAt: receivedAt },
        })
      : await prisma.camera.findUnique({ where: { id: cameraId } });

    if (!camera) {
      throw new AppError(404, 'Cámara no registrada');
    }
    if (!camera.isActive) {
      throw new AppError(403, 'La cámara está desactivada');
    }

    const effectiveCapturedAt = capturedAt ?? receivedAt;
    const storageKey = buildStorageKey({
      cameraId,
      capturedAt: effectiveCapturedAt,
      contentHash,
    });

    await storage.put(storageKey, body, 'image/jpeg');

    let photo;
    try {
      photo = await prisma.photo.create({
        data: {
          url: storage.publicUrl(storageKey),
          source: 'camera',
          cameraId: camera.id,
          cropId: camera.cropId,
          capturedAt: effectiveCapturedAt,
          storageKey,
          sizeBytes: body.length,
          width: dimensions.width,
          height: dimensions.height,
          contentHash,
          dedupeKey,
          analysisStatus: 'pending',
        },
      });
    } catch (err) {
      // Dos reintentos en paralelo pueden pasar juntos el findUnique de arriba.
      // El índice único es el que decide; el que pierde devuelve el registro
      // del que ganó en lugar de un error.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const winner = await prisma.photo.findUnique({ where: { dedupeKey } });
        if (winner) {
          await storage.remove(storageKey).catch(() => {});
          return res.status(200).json({
            ok: true,
            imageId: winner.id,
            receivedAt: winner.createdAt.toISOString(),
            duplicate: true,
          });
        }
      }

      // Si el insert falla el objeto ya está escrito: lo borramos para no
      // dejar archivos sin registro en la base.
      await storage.remove(storageKey).catch(() => {});
      throw err;
    }

    // Trazabilidad sin datos pesados: nunca logueamos el contenido de la imagen.
    console.info(
      `[ingest] cámara=${cameraId} foto=${photo.id} ${body.length}B ` +
        `${dimensions.width}x${dimensions.height} capturada=${effectiveCapturedAt.toISOString()}`
    );

    res.status(201).json({
      ok: true,
      imageId: photo.id,
      receivedAt: photo.createdAt.toISOString(),
    });
  }
);

export default router;
