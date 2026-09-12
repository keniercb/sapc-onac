/**
 * Manejador de errores global.
 * En NestJS: sería un ExceptionFilter global con @Catch().
 */
import { Context, Next } from 'hono'

export async function errorHandler(c: Context, next: Next) {
  try {
    await next()
  } catch (err: any) {
    console.error('[API Error]', err)
    const status = err.status || 500
    const message = err.message || 'Error interno del servidor'
    return c.json({ error: message }, status)
  }
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export const badRequest = (msg: string) => new HttpError(400, msg)
export const unauthorized = (msg = 'No autenticado') => new HttpError(401, msg)
export const forbidden = (msg = 'Sin permisos') => new HttpError(403, msg)
export const notFound = (msg = 'No encontrado') => new HttpError(404, msg)
export const conflict = (msg: string) => new HttpError(409, msg)
export const unprocessable = (msg: string) => new HttpError(422, msg)
