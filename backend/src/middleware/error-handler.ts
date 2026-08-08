import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('Error:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      statusCode: err.statusCode,
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Error de validación',
      details: err.errors,
      statusCode: 400,
    });
  }

  // Errores de body-parser: los tira express.raw/json antes de llegar a la
  // ruta y traen su propio status. Sin esto, un JPEG demasiado grande de la
  // cámara devolvía 500 y el dispositivo lo reintentaba para siempre.
  const bodyParserError = err as { status?: number; statusCode?: number; type?: string };
  const parserStatus = bodyParserError.status ?? bodyParserError.statusCode;

  if (typeof parserStatus === 'number' && parserStatus >= 400 && parserStatus < 500) {
    const message =
      bodyParserError.type === 'entity.too.large'
        ? 'La imagen supera el tamaño máximo permitido'
        : 'Cuerpo del pedido inválido';

    return res.status(parserStatus).json({
      error: message,
      statusCode: parserStatus,
    });
  }

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json({
      error: 'Error en la base de datos',
      statusCode: 400,
    });
  }

  return res.status(500).json({
    error: 'Error interno del servidor',
    statusCode: 500,
  });
}
