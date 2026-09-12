/**
 * Módulo de Autenticación — Controller / Routes
 * En NestJS: @Controller('auth') con @Post('login'), @Delete('logout'), @Get('me').
 */
import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { authService } from './auth.service'

export const authModule = {
  // Rutas públicas (sin auth middleware)
  publicRoutes: new Hono()
    .post('/login', async (c) => {
      const body = await c.req.json()
      const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
      const userAgent = c.req.header('user-agent') || undefined
      const result = await authService.login(body.username, body.password, ip, userAgent)
      c.header('Set-Cookie', `sapc_session=${result.token}; HttpOnly; Path=/; Max-Age=${result.maxAge}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`)
      return c.json({ user: result.user })
    }),

  // Rutas protegidas (con auth middleware aplicado)
  protectedRoutes: new Hono()
    .get('/me', async (c) => {
      const user = c.get('user')
      return c.json({ user })
    })
    .delete('/logout', async (c) => {
      const tokenId = getCookie(c, 'sapc_session')
      if (tokenId) await authService.logout(tokenId)
      c.header('Set-Cookie', 'sapc_session=; HttpOnly; Path=/; Max-Age=0')
      return c.json({ ok: true })
    }),
}
