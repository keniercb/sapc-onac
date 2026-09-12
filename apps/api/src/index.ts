/**
 * SAPC-ONAC Backend API — Entry point
 * Hono framework running on Bun, NestJS-style architecture.
 *
 * En producción (Fase 1+): este código se migraría a NestJS real
 * manteniendo la misma estructura de módulos/controllers/services.
 *
 * Puerto: 4000 (fijo, requerido por el gateway Caddy)
 */
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { authModule } from './modules/auth/auth.module'
import { pensionadosModule } from './modules/pensionados/pensionados.module'
import { nomencladoresModule } from './modules/nomencladores/nomencladores.module'
import { notificacionesModule } from './modules/notificaciones/notificaciones.module'
import { usuariosModule } from './modules/usuarios/usuarios.module'
import { citasModule } from './modules/citas/citas.module'
import { reportesModule } from './modules/reportes/reportes.module'
import { errorHandler } from './common/middleware/error-handler'
import { authMiddleware } from './common/middleware/auth-middleware'

const app = new Hono()

// Middlewares globales
app.use('*', logger())
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://21.0.14.195:3000'],
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}))
app.use('*', errorHandler)

// Health check
app.get('/health', (c) => c.json({ ok: true, service: 'sapc-api', version: '0.2.0', timestamp: new Date().toISOString() }))

// Rutas públicas (sin auth) - prefijo /backend para evitar colisión con Next.js
app.route('/backend/auth', authModule.publicRoutes)

// Rutas protegidas (con auth middleware)
const protectedApp = new Hono()
protectedApp.use('*', authMiddleware)
protectedApp.route('/backend/auth', authModule.protectedRoutes)
protectedApp.route('/backend/pensionados', pensionadosModule.routes)
protectedApp.route('/backend/nomencladores', nomencladoresModule.routes)
protectedApp.route('/backend/notificaciones', notificacionesModule.routes)
protectedApp.route('/backend/usuarios', usuariosModule.routes)
protectedApp.route('/backend/citas', citasModule.routes)
protectedApp.route('/backend/reportes', reportesModule.routes)

app.route('/', protectedApp)

const PORT = 4000
console.log(`🚀 SAPC-ONAC Backend API escuchando en http://localhost:${PORT}`)

export default {
  port: PORT,
  fetch: app.fetch,
}
