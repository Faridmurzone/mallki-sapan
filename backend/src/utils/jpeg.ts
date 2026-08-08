/**
 * Validación y lectura de dimensiones de un JPEG, sin dependencias.
 *
 * El body de la ingesta viene de un dispositivo en la red local sin
 * autenticación, así que lo tratamos como entrada no confiable: antes de
 * guardar nada verificamos que efectivamente sea un JPEG y no cualquier cosa
 * con Content-Type mentido.
 */

/** Un JPEG siempre empieza con SOI (FF D8) seguido de un marcador. */
const SOI = 0xffd8;

/**
 * Marcadores Start Of Frame: llevan alto y ancho. Se excluyen a propósito
 * C4 (tablas Huffman), C8 (reservado) y CC (aritmético), que comparten el
 * rango C0–CF pero no son SOF.
 */
function isStartOfFrame(marker: number): boolean {
  return (
    (marker >= 0xc0 && marker <= 0xcf) &&
    marker !== 0xc4 &&
    marker !== 0xc8 &&
    marker !== 0xcc
  );
}

export interface JpegInfo {
  width: number;
  height: number;
}

export class InvalidJpegError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidJpegError';
  }
}

/**
 * Verifica que el buffer sea un JPEG y devuelve sus dimensiones.
 * Lanza InvalidJpegError si no lo es.
 *
 * Recorre la cadena de segmentos hasta encontrar el SOF. No decodifica la
 * imagen: sólo lee las cabeceras, que es lo que necesitamos para guardar
 * metadata y para descartar basura.
 */
export function parseJpeg(buf: Buffer): JpegInfo {
  if (buf.length < 4) {
    throw new InvalidJpegError('El cuerpo es demasiado corto para ser un JPEG');
  }

  if (buf.readUInt16BE(0) !== SOI) {
    throw new InvalidJpegError('No empieza con la firma JPEG (FF D8)');
  }

  // Un JPEG completo termina en EOI (FF D9). Si falta, la transferencia se
  // cortó a la mitad: mejor rechazarla que guardar una imagen truncada.
  if (buf.readUInt16BE(buf.length - 2) !== 0xffd9) {
    throw new InvalidJpegError('La imagen está truncada: falta el marcador de fin');
  }

  let offset = 2;

  while (offset < buf.length - 1) {
    if (buf[offset] !== 0xff) {
      throw new InvalidJpegError(`Segmento mal formado en el byte ${offset}`);
    }

    const marker = buf[offset + 1];
    offset += 2;

    // Los marcadores de relleno (FF) y los standalone no llevan longitud.
    if (marker === 0xff) {
      offset -= 1;
      continue;
    }
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }

    if (offset + 2 > buf.length) {
      throw new InvalidJpegError('Segmento cortado antes de su longitud');
    }

    const segmentLength = buf.readUInt16BE(offset);

    if (segmentLength < 2 || offset + segmentLength > buf.length) {
      throw new InvalidJpegError(`Longitud de segmento inválida en el byte ${offset}`);
    }

    if (isStartOfFrame(marker)) {
      // SOF: [longitud 2][precisión 1][alto 2][ancho 2]
      if (segmentLength < 7) {
        throw new InvalidJpegError('Segmento SOF incompleto');
      }

      const height = buf.readUInt16BE(offset + 3);
      const width = buf.readUInt16BE(offset + 5);

      if (width === 0 || height === 0) {
        throw new InvalidJpegError('La imagen declara dimensiones en cero');
      }

      return { width, height };
    }

    offset += segmentLength;
  }

  throw new InvalidJpegError('No se encontró la cabecera de dimensiones (SOF)');
}
