import { describe, expect, it } from 'vitest';
import { parseJpeg, InvalidJpegError } from './jpeg.js';

/**
 * JPEG mínimo real de 1x1 px, generado con `convert -size 1x1 xc:red out.jpg`.
 * Se usa como fixture para no depender de archivos externos.
 */
const JPEG_1X1 = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
    'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAHwAAAQUBAQEB' +
    'AQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1Fh' +
    'ByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZ' +
    'WmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXG' +
    'x8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/APn+v//Z',
  'base64'
);

describe('parseJpeg', () => {
  it('lee las dimensiones de un JPEG válido', () => {
    expect(parseJpeg(JPEG_1X1)).toEqual({ width: 1, height: 1 });
  });

  it('rechaza un buffer vacío', () => {
    expect(() => parseJpeg(Buffer.alloc(0))).toThrow(InvalidJpegError);
  });

  it('rechaza algo que no empieza con la firma JPEG', () => {
    // PNG: mismo tamaño, otra firma. Es el caso de un Content-Type mentido.
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
    expect(() => parseJpeg(png)).toThrow(/firma JPEG/);
  });

  it('rechaza una imagen truncada', () => {
    // Sin los últimos bytes falta el marcador de fin: es lo que queda cuando
    // se corta el WiFi a mitad del POST.
    const truncated = JPEG_1X1.subarray(0, JPEG_1X1.length - 10);
    expect(() => parseJpeg(truncated)).toThrow(/truncada/);
  });

  it('rechaza una firma válida sin datos detrás', () => {
    expect(() => parseJpeg(Buffer.from('ffd8ffd9', 'hex'))).toThrow(InvalidJpegError);
  });

  it('no confunde una tabla Huffman (FFC4) con un SOF', () => {
    // FFC4 cae en el rango C0-CF pero no lleva dimensiones. Si lo tomáramos
    // como SOF, leeríamos ancho y alto de bytes que son otra cosa.
    const conHuffman = Buffer.concat([
      Buffer.from('ffd8', 'hex'),
      Buffer.from('ffc40005aabbcc', 'hex'), // DHT de 5 bytes
      Buffer.from('ffd9', 'hex'),
    ]);
    expect(() => parseJpeg(conHuffman)).toThrow(/SOF/);
  });
});
