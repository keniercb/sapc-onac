/**
 * Cliente HTTP centralizado para llamar al backend SAPC-ONAC.
 *
 * En el sandbox: usa http://localhost:4000/backend
 * En producción: usa NEXT_PUBLIC_API_URL (p. ej. https://api.onac.cu/backend)
 *
 * Maneja cookies automáticamente (credentials: 'include') y normaliza errores.
 *
 * CORS: el backend permite http://localhost:3000 y la red interna.
 */
import { toast } from 'sonner'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

function buildUrl(path: string): string {
  // path empieza con '/'
  return `${API_BASE}/backend${path}`
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public detalles?: string[]) {
    super(message)
  }
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = buildUrl(path)
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  if (res.status === 401) {
    const data = await res.json().catch(() => ({}))
    throw new ApiError(401, data.error || 'No autenticado')
  }

  if (!res.ok) {
    let data: any = {}
    try { data = await res.json() } catch { /* ignore */ }

    if (res.status === 403) {
      toast.error('No tiene permisos para realizar esta acción')
    } else if (res.status === 422) {
      toast.error('Datos inválidos', {
        description: Array.isArray(data.detalles) ? data.detalles.join(', ') : data.error,
      })
    } else if (res.status >= 500) {
      toast.error('Error del servidor', {
        description: 'Intente nuevamente en unos minutos.',
      })
    } else if (res.status !== 401) {
      toast.error(data.error || `Error HTTP ${res.status}`)
    }

    throw new ApiError(res.status, data.error || `Error HTTP ${res.status}`, data.detalles)
  }

  return res.json()
}

export const api = {
  get: <T = any>(path: string) => apiFetch<T>(path, { method: 'GET' }),
  post: <T = any>(path: string, body?: any) =>
    apiFetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T = any>(path: string, body?: any) =>
    apiFetch<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T = any>(path: string, body?: any) =>
    apiFetch<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = any>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
}
