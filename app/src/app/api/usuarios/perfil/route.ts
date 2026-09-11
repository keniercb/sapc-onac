/**
 * SAPC-ONAC — API Perfil de usuario
 * GET /api/usuarios/perfil — devuelve el perfil del usuario autenticado
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

const SESSION_COOKIE = 'sapc_session'

export async function GET() {
  const cookieStore = await cookies()
  const tokenId = cookieStore.get(SESSION_COOKIE)?.value
  if (!tokenId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const sesion = await db.sesion.findFirst({
    where: { tokenId, estado: 'ACTIVA' },
    include: {
      usuario: {
        include: {
          rolAsignaciones: {
            include: { rol: true },
            where: { fechaFin: null },
          },
          territorio: true,
        }
      }
    }
  })

  if (!sesion || Date.now() - sesion.fechaInicio.getTime() > 30 * 60 * 1000) {
    return NextResponse.json({ error: 'Sesión expirada' }, { status: 401 })
  }

  const u = sesion.usuario
  return NextResponse.json({
    id: u.id,
    carnetIdentidad: u.carnetIdentidad,
    nombres: u.nombres,
    apellidos: u.apellidos,
    nombreUsuario: u.nombreUsuario,
    email: u.email,
    estado: u.estado,
    ultimoLogin: u.ultimoLogin,
    fechaCreacion: u.fechaCreacion,
    territorio: u.territorio ? { id: u.territorio.id, nombre: u.territorio.nombre } : null,
    roles: u.rolAsignaciones.map(ur => ({ codigo: ur.rol.codigo, nombre: ur.rol.nombre })),
  })
}
