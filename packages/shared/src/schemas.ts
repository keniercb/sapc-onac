/**
 * Schemas Zod compartidos para validación de formularios y API.
 * Usados tanto en apps/web (formularios) como en apps/api (validación de entrada).
 */
import { z } from 'zod'

export const carnetIdentidadSchema = z
  .string()
  .length(11, 'Carnet de identidad debe tener 11 dígitos')
  .regex(/^\d{11}$/, 'Carnet debe contener solo dígitos')

export const pensionadoCreateSchema = z.object({
  carnetIdentidad: carnetIdentidadSchema,
  numeroSerieCertifico: z.string().optional().nullable(),
  nombres: z.string().min(1, 'Nombres es obligatorio'),
  primerApellido: z.string().min(1, 'Primer apellido es obligatorio'),
  segundoApellido: z.string().optional().nullable(),
  conocidoPor: z.string().optional().nullable(),
  sexoId: z.string().uuid().optional().nullable(),
  colorPielId: z.string().uuid().optional().nullable(),
  estadoCivilId: z.string().uuid().optional().nullable(),
  estadoSaludId: z.string().uuid().optional().nullable(),
  telefono: z.string().optional().nullable(),
  fechaNacimiento: z.string().datetime().optional().nullable(),
  categoriaId: z.string().uuid().optional().nullable(),
  territorioId: z.string().uuid().optional().nullable(),
  esCaido: z.boolean().optional().default(false),
  observaciones: z.string().optional().nullable(),
})

export const loginSchema = z.object({
  username: z.string().min(1, 'Usuario es obligatorio'),
  password: z.string().min(1, 'Contraseña es obligatoria'),
})

export const changePasswordSchema = z
  .object({
    actual: z.string().min(1, 'Contraseña actual es obligatoria'),
    nueva: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Al menos 1 mayúscula')
      .regex(/[a-z]/, 'Al menos 1 minúscula')
      .regex(/[0-9]/, 'Al menos 1 dígito')
      .regex(/[^A-Za-z0-9]/, 'Al menos 1 símbolo'),
    confirmacion: z.string().min(1, 'Confirme la nueva contraseña'),
  })
  .refine((data) => data.nueva === data.confirmacion, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmacion'],
  })

export type PensionadoCreate = z.infer<typeof pensionadoCreateSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
