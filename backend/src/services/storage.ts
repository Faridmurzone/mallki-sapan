import { createWriteStream } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

/**
 * Puerto de almacenamiento de objetos.
 *
 * Las imágenes no van a la base: la base guarda sólo la metadata y la clave
 * del objeto. Hoy hay un único driver (disco local) y esta interfaz es la
 * costura para sumar GCS o S3 sin tocar la ruta de ingesta.
 */
export interface StoragePort {
  /** Guarda el objeto y devuelve la clave con la que se lo recupera. */
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** URL con la que el frontend puede mostrar la imagen. */
  publicUrl(key: string): string;
  /** Borra un objeto. Se usa para no dejar huérfanos si falla el insert. */
  remove(key: string): Promise<void>;
}

/**
 * Driver de disco local. Pensado para desarrollo y para una instalación
 * chica en una sola máquina, que es el caso de la huerta hoy.
 */
export class LocalStorage implements StoragePort {
  constructor(
    private readonly rootDir: string,
    private readonly baseUrl: string
  ) {}

  private absolutePath(key: string): string {
    const full = path.resolve(this.rootDir, key);
    const root = path.resolve(this.rootDir);

    // Defensa en profundidad: la clave se arma a partir del cameraId, que ya
    // viene validado con una regex estricta, pero si esa validación cambiara
    // no queremos escribir fuera del directorio de storage.
    if (full !== root && !full.startsWith(root + path.sep)) {
      throw new Error('La clave del objeto apunta fuera del directorio de storage');
    }

    return full;
  }

  async put(key: string, body: Buffer, _contentType: string): Promise<void> {
    const full = this.absolutePath(key);
    await mkdir(path.dirname(full), { recursive: true });
    await pipeline(Readable.from(body), createWriteStream(full));
  }

  publicUrl(key: string): string {
    return `${this.baseUrl.replace(/\/$/, '')}/${key.split(path.sep).join('/')}`;
  }

  async remove(key: string): Promise<void> {
    try {
      await unlink(this.absolutePath(key));
    } catch (err) {
      // Si ya no está, el objetivo se cumplió igual.
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }
}

/** Directorio donde el driver local escribe. Lo sirve app.ts como estático. */
export const LOCAL_STORAGE_DIR =
  process.env.STORAGE_DIR || path.resolve(process.cwd(), 'storage');

const PUBLIC_BASE_URL =
  process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;

/**
 * Driver activo. Sólo existe `local`; cuando haya bucket, acá se agrega el
 * caso `gcs` implementando StoragePort.
 */
export const storage: StoragePort = new LocalStorage(
  LOCAL_STORAGE_DIR,
  `${PUBLIC_BASE_URL}/storage`
);
