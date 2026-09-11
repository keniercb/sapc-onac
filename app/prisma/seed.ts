/**
 * SAPC-ONAC — Seeder Fase 0
 * Carga nomencladores oficiales (provincias, municipios, sexo, categorías, frentes, etc.)
 * extraídos del Excel "Nomencladores ONAC a Kenier.xlsx" + usuario admin demo.
 */
import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'

const prisma = new PrismaClient()

// Hash bcrypt simulado para SQLite (en prod: bcrypt real). Para demo, hash simple.
function hashPassword(plain: string): string {
  return 'bcrypt$' + createHash('sha256').update(plain).digest('hex')
}

async function main() {
  console.log('🗑️  Limpiando DB...')
  await prisma.auditoria.deleteMany()
  await prisma.notificacionDestinatario.deleteMany()
  await prisma.notificacion.deleteMany()
  await prisma.sesion.deleteMany()
  await prisma.historialPassword.deleteMany()
  await prisma.usuarioRol.deleteMany()
  await prisma.rolPermiso.deleteMany()
  await prisma.altasBaja.deleteMany()
  await prisma.trayectoriaRevolucionaria.deleteMany()
  await prisma.pension.deleteMany()
  await prisma.cuentaBancaria.deleteMany()
  await prisma.domicilio.deleteMany()
  await prisma.pensionado.deleteMany()
  await prisma.municipio.deleteMany()
  await prisma.provincia.deleteMany()
  await prisma.nomencladorValor.deleteMany()
  await prisma.nomenclador.deleteMany()
  await prisma.permiso.deleteMany()
  await prisma.rol.deleteMany()
  await prisma.usuario.deleteMany()

  // ===== Roles =====
  console.log('👥 Creando roles...')
  const roles = await Promise.all([
    prisma.rol.create({ data: { codigo: 'ADMINISTRADOR', nombre: 'Administrador del Sistema', esSistema: true }}),
    prisma.rol.create({ data: { codigo: 'OPERARIO', nombre: 'Operario de Atención', esSistema: true }}),
    prisma.rol.create({ data: { codigo: 'SUPERVISOR_TERRITORIAL', nombre: 'Supervisor Territorial', esSistema: true }}),
    prisma.rol.create({ data: { codigo: 'DIRECCION_NACIONAL', nombre: 'Dirección Nacional', esSistema: true }}),
    prisma.rol.create({ data: { codigo: 'ESP_NOMENCLADORES', nombre: 'Especialista de Nomencladores', esSistema: true }}),
    prisma.rol.create({ data: { codigo: 'AUDITOR', nombre: 'Auditor', esSistema: true }}),
  ])

  // ===== Permisos =====
  console.log('🔑 Creando permisos...')
  const modulos = ['pensionados', 'nomencladores', 'citas', 'necesidades', 'fallecimientos', 'reportes', 'auditoria', 'admin', 'usuarios']
  const acciones = ['read', 'create', 'update', 'delete', 'export']
  const permisos: Record<string, any> = {}
  for (const mod of modulos) {
    for (const acc of acciones) {
      const p = await prisma.permiso.create({ data: { codigo: `${mod}:${acc}`, nombre: `${acc} ${mod}`, modulo: mod }})
      permisos[`${mod}:${acc}`] = p
    }
  }

  // Asignar todos los permisos al admin
  const adminRol = roles[0]
  for (const p of Object.values(permisos)) {
    await prisma.rolPermiso.create({ data: { rolId: adminRol.id, permisoId: p.id }})
  }
  // Operario: read/create/update en pensionados, citas, necesidades
  const operarioPerms = ['pensionados:read','pensionados:create','pensionados:update','citas:read','citas:create','citas:update','necesidades:read','necesidades:create','necesidades:update','reportes:read']
  for (const code of operarioPerms) {
    await prisma.rolPermiso.create({ data: { rolId: roles[1].id, permisoId: permisos[code].id }})
  }
  // Esp. Nomencladores: full nomencladores
  const espPerms = ['nomencladores:read','nomencladores:create','nomencladores:update','nomencladores:delete','nomencladores:export']
  for (const code of espPerms) {
    await prisma.rolPermiso.create({ data: { rolId: roles[4].id, permisoId: permisos[code].id }})
  }

  // ===== Usuario admin demo =====
  console.log('👨‍💼 Creando usuario admin demo...')
  const admin = await prisma.usuario.create({
    data: {
      carnetIdentidad: '00000000000',
      nombres: 'Admin',
      apellidos: 'Sistema',
      nombreUsuario: 'admin',
      email: 'admin@onac.cu',
      passwordHash: hashPassword('admin123'),
      estado: 'ACTIVO',
    }
  })
  await prisma.usuarioRol.create({ data: { usuarioId: admin.id, rolId: adminRol.id }})
  await prisma.historialPassword.create({ data: { usuarioId: admin.id, passwordHash: hashPassword('admin123'), changedById: admin.id }})

  // ===== Nomencladores =====
  console.log('📋 Creando nomencladores...')
  const nomSexo = await prisma.nomenclador.create({ data: { codigo: 'sexo', nombre: 'Sexo' }})
  const nomColorPiel = await prisma.nomenclador.create({ data: { codigo: 'color_piel', nombre: 'Color de Piel' }})
  const nomEstadoSalud = await prisma.nomenclador.create({ data: { codigo: 'estado_salud', nombre: 'Estado de Salud' }})
  const nomEstadoCivil = await prisma.nomenclador.create({ data: { codigo: 'estado_civil', nombre: 'Estado Civil' }})
  const nomCategoria = await prisma.nomenclador.create({ data: { codigo: 'categoria', nombre: 'Categorías' }})
  const nomVinculoLaboral = await prisma.nomenclador.create({ data: { codigo: 'vinculo_laboral', nombre: 'Vínculo Laboral Actual' }})
  const nomTipoPension = await prisma.nomenclador.create({ data: { codigo: 'tipo_pension', nombre: 'Tipo de Pensión' }})
  const nomOtorgante = await prisma.nomenclador.create({ data: { codigo: 'otorgante', nombre: 'Otorgada Por' }})
  const nomFrenteEr = await prisma.nomenclador.create({ data: { codigo: 'frente_er', nombre: 'Frente del Ejército Rebelde' }})
  const nomGradoEr = await prisma.nomenclador.create({ data: { codigo: 'grado_er', nombre: 'Grado Militar Ejército Rebelde' }})
  const nomGradoFarMinint = await prisma.nomenclador.create({ data: { codigo: 'grado_far_minint', nombre: 'Grado Militar FAR/MININT' }})
  const nomCelula = await prisma.nomenclador.create({ data: { codigo: 'celula', nombre: 'Denominación de Célula' }})
  const nomAsociacion = await prisma.nomenclador.create({ data: { codigo: 'asociacion', nombre: 'Asociados a' }})
  const nomColumna = await prisma.nomenclador.create({ data: { codigo: 'columna', nombre: 'Columna Revolucionaria' }})
  const nomCausaAlta = await prisma.nomenclador.create({ data: { codigo: 'causa_alta', nombre: 'Causas de Alta' }})
  const nomCausaBaja = await prisma.nomenclador.create({ data: { codigo: 'causa_baja', nombre: 'Causas de Baja' }})
  const nomParentesco = await prisma.nomenclador.create({ data: { codigo: 'parentesco', nombre: 'Parentescos' }})

  // Sexo
  for (const [cod, desc, ord] of [['MASCULINO','Masculino',1],['FEMENINO','Femenino',2]] as [string,string,number][]) {
    await prisma.nomencladorValor.create({ data: { nomencladorId: nomSexo.id, codigo: cod, descripcion: desc, ordenVisualizacion: ord }})
  }
  // Color de piel
  for (const [cod, desc, ord] of [['BLANCA','Blanca',1],['NEGRA','Negra',2],['MESTIZA','Mestiza',3],['AMARILLA','Amarilla',4]] as [string,string,number][]) {
    await prisma.nomencladorValor.create({ data: { nomencladorId: nomColorPiel.id, codigo: cod, descripcion: desc, ordenVisualizacion: ord }})
  }
  // Estado de salud
  for (const [cod, desc, ord] of [['BUENO','Bueno',1],['REGULAR','Regular',2],['MALO','Malo',3]] as [string,string,number][]) {
    await prisma.nomencladorValor.create({ data: { nomencladorId: nomEstadoSalud.id, codigo: cod, descripcion: desc, ordenVisualizacion: ord }})
  }
  // Estado civil
  for (const [cod, desc, ord] of [['SOLTERO','Soltero',1],['CASADO','Casado',2],['VIUDO','Viudo',3],['DIVORCIADO','Divorciado',4]] as [string,string,number][]) {
    await prisma.nomencladorValor.create({ data: { nomencladorId: nomEstadoCivil.id, codigo: cod, descripcion: desc, ordenVisualizacion: ord }})
  }
  // Categorías
  const categorias = [
    ['EJERCITO_REBELDE','Ejército Rebelde'],
    ['LUCHA_CLANDESTINA','Lucha Clandestina'],
    ['PERSONAS_INVALIDEZ','Personas con Invalidez'],
    ['MILITARES_PENSIONADOS_FAR','Militares Pensionados en las FAR'],
    ['MILITARES_PENSIONADOS_SMA','Militares Pensionados llamados al SMA'],
    ['FAMILIARES_CAIDOS','Familiares de Caídos'],
    ['CONGO','Congo'],
  ]
  for (let i = 0; i < categorias.length; i++) {
    await prisma.nomencladorValor.create({ data: { nomencladorId: nomCategoria.id, codigo: categorias[i][0], descripcion: categorias[i][1], ordenVisualizacion: i+1 }})
  }
  // Vínculo laboral
  for (const [cod, desc, ord] of [['ESTATAL','Estatal',1],['NO_ESTATAL','No Estatal',2],['ESTUDIO','Estudio',3],['NO_TRABAJA','No Trabaja',4]] as [string,string,number][]) {
    await prisma.nomencladorValor.create({ data: { nomencladorId: nomVinculoLaboral.id, codigo: cod, descripcion: desc, ordenVisualizacion: ord }})
  }
  // Tipo de pensión
  for (const [cod, desc, ord] of [['ANTIGUEDAD','Antigüedad',1],['EDAD','Edad',2],['INVALIDEZ','Invalidez',3],['MUERTE','Muerte',4]] as [string,string,number][]) {
    await prisma.nomencladorValor.create({ data: { nomencladorId: nomTipoPension.id, codigo: cod, descripcion: desc, ordenVisualizacion: ord }})
  }
  // Otorgante
  for (const [cod, desc, ord] of [['FAR','FAR',1],['MININT','MININT',2],['MTSS','MTSS',3]] as [string,string,number][]) {
    await prisma.nomencladorValor.create({ data: { nomencladorId: nomOtorgante.id, codigo: cod, descripcion: desc, ordenVisualizacion: ord }})
  }
  // Frentes del Ejército Rebelde
  const frentes = [
    ['CENTRO_SUR_LAS_VILLAS','Centro Sur Las Villas'],
    ['II_FRENTE_ESCAMBRAY','II Frente Escambray'],
    ['FRENTE_HABANA_MATANZAS','Frente Habana - Matanzas'],
    ['III_FRENTE_MARIO_MUNOZ','III Frente Mario Muñoz'],
    ['FRENTE_CAMAGUEY','Frente de Camagüey'],
    ['I_JOSE_MARTI','I Frente José Martí'],
    ['II_FRENTE_FRANK_PAIS','II Frente Frank País'],
    ['IV_FRENTE_SIMON_BOLIVAR','IV Frente Simón Bolívar'],
    ['FRENTE_NORTE_VILLAS','Frente Norte de Las Villas'],
  ]
  for (let i = 0; i < frentes.length; i++) {
    await prisma.nomencladorValor.create({ data: { nomencladorId: nomFrenteEr.id, codigo: frentes[i][0], descripcion: frentes[i][1], ordenVisualizacion: i+1 }})
  }
  // Grados militares ER
  const gradosEr = [
    'SOLDADO','CABO','SARGENTO','SUBTENIENTE','TENIENTE','PRIMER_TENIENTE','CAPITAN','MAYOR',
    'TENIENTE_CORONEL','CORONEL','PRIMER_CORONEL','SUBOFICIAL','PRIMER_SUBOFICIAL',
    'COMANDANTE','GENERAL_DE_BRIGADA','GENERAL_DE_DIVISION','GENERAL_DE_EJERCITO'
  ]
  for (let i = 0; i < gradosEr.length; i++) {
    await prisma.nomencladorValor.create({ data: { nomencladorId: nomGradoEr.id, codigo: gradosEr[i], descripcion: gradosEr[i].replace(/_/g,' '), ordenVisualizacion: i+1 }})
  }
  // Asociaciones (incluye ACPDI)
  const asociaciones = ['ACPDI','ASOCIACION_COMBATIENTES','NINGUNA']
  for (let i = 0; i < asociaciones.length; i++) {
    await prisma.nomencladorValor.create({ data: { nomencladorId: nomAsociacion.id, codigo: asociaciones[i].replace(/ /g,'_'), descripcion: asociaciones[i], ordenVisualizacion: i+1 }})
  }
  // Células
  const celulas = [
    ['MOVIMIENTO_26_JULIO','Movimiento 26 de Julio'],
    ['DIRECTORIO_13_MARZO','Directorio 13 de Marzo'],
    ['JUVENTUD_SOCIALISTA','Juventud Socialista'],
    ['PARTIDO_SOCIALISTA_POPULAR','Partido Socialista Popular'],
  ]
  for (let i = 0; i < celulas.length; i++) {
    await prisma.nomencladorValor.create({ data: { nomencladorId: nomCelula.id, codigo: celulas[i][0], descripcion: celulas[i][1], ordenVisualizacion: i+1 }})
  }
  // Parentescos
  const parentescos = ['CONYUGE','HIJO','HIJA','PADRE','MADRE','HERMANO','HERMANA','TIO','TIA','SOBRINO','SOBRINA','PRIMO','PRIMA','OTRO']
  for (let i = 0; i < parentescos.length; i++) {
    await prisma.nomencladorValor.create({ data: { nomencladorId: nomParentesco.id, codigo: parentescos[i].toUpperCase(), descripcion: parentescos[i], ordenVisualizacion: i+1 }})
  }

  // ===== Provincias y municipios =====
  console.log('🗺️  Creando provincias y municipios...')
  const provinciasData: Record<string, string[]> = {
    'PINAR_DEL_RIO': ['Pinar del Río','Sandino','Mantua','Minas de Matahambre','Viñales','Los Palacios','Consolación del Sur','Pinar del Río','San Luis','San Juan y Martínez','Guane','La Palma'],
    'ARTEMISA': ['Artemisa','Mariel','Guanajay','Caimito','Bauta','San Antonio de los Baños','Güira de Melena','Alquízar','Artemisa','Candelaria','Bahía Honda','Santa Cruz del Norte'],
    'LA_HABANA': ['Playa','Plaza de la Revolución','Centro Habana','La Habana Vieja','Regla','Habana del Este','Guanabacoa','San Miguel del Padrón','Diez de Octubre','Cerro','Marianao','La Lisa','Boyeros','Arroyo Naranjo','Cotorro','Casablanca'],
    'MAYABEQUE': ['San José de las Lajas','Bejucal','Jaruco','Santa Cruz del Norte','Madruga','Nueva Paz','San Nicolás de Bari','Güines','Melena del Sur','Batabanó','Quivicán'],
    'MATANZAS': ['Matanzas','Cárdenas','Varadero','Martí','Colón','Perico','Jovellanos','Pedro Betancourt','Limonar','Unión de Reyes','Cienaga de Zapata','Calimete','Los Arabos'],
    'CIENFUEGOS': ['Cienfuegos','Aguada de Pasajeros','Rodas','Palmira','Lajas','Cruces','Abreus'],
    'VILLA_CLARA': ['Santa Clara','Sagua la Grande','Caibarién','Camajuaní','Remedios','Placetas','Encrucijada','Camajuani','Manicaragua','Quemado de Güines','Ranchuelo','Corralillo','Santo Domingo','Cifuentes'],
    'SANCTI_SPIRITUS': ['Sancti Spíritus','Trinidad','Cabaiguán','Yaguajay','Jatibonico','Ciego de Ávila','Fomento','Taguasco','La Sierpe'],
    'CIEGO_DE_AVILA': ['Ciego de Ávila','Morón','Chambas','Ciro Redondo','Venezuela','Baraguá','Primero de Enero','Florencia','Majagua','Bolívar'],
    'CAMAGUEY': ['Camagüey','Florida','Nuevitas','Vertientes','Guáimaro','Sibanicú','Esmeralda','Minas','Sierra de Cubitas','Najasa','Santa Cruz del Sur','Jimaguayú','Carlos Manuel de Céspedes'],
    'LAS_TUNAS': ['Las Tunas','Puerto Padre','Amancio','Jobabo','Colombia','Majibacoa','Jesús Menéndez','Manatí'],
    'HOLGUIN': ['Holguín','Banes','Antilla','Báguanos','Cacocum','Calixto García','Cueto','Frank País','Gibara','Mayarí','Moa','Rafael Freyre','Sagua de Tánamo','Urbano Noris','Frank País'],
    'GRANMA': ['Bayamo','Manzanillo','Jiguaní','Río Cauto','Yara','Campechuela','Media Luna','Niquero','Pilón','Bartolomé Masó','Cauto Cristo','Guisa','Cabo Cruz'],
    'SANTIAGO_DE_CUBA': ['Santiago de Cuba','Palma Soriano','San Luis','Contramaestre','Mella','San Miguel del Padrón','Songo - La Maya','Segundo Frente','Tercer Frente','Guama'],
    'GUANTANAMO': ['Guantánamo','Baracoa','Caimanera','El Salvador','Imías','Maisí','Manuel Tames','Niceto Pérez','San Antonio del Sur','Yateras'],
  }
  for (const [provCode, municipios] of Object.entries(provinciasData)) {
    const prov = await prisma.provincia.create({
      data: {
        codigo: provCode,
        nombre: provCode.split('_').map(w => w[0] + w.slice(1).toLowerCase()).join(' '),
        orden: Object.keys(provinciasData).indexOf(provCode) + 1,
      }
    })
    for (let i = 0; i < municipios.length; i++) {
      await prisma.municipio.create({
        data: {
          provinciaId: prov.id,
          codigo: `${provCode.substring(0,3)}_${i+1}`,
          nombre: municipios[i],
          orden: i+1,
        }
      })
    }
  }

  // ===== Pensionados demo =====
  console.log('👴 Creando pensionados demo...')
  const catEr = await prisma.nomencladorValor.findFirst({ where: { nomencladorId: nomCategoria.id, codigo: 'EJERCITO_REBELDE' }})
  const catLc = await prisma.nomencladorValor.findFirst({ where: { nomencladorId: nomCategoria.id, codigo: 'LUCHA_CLANDESTINA' }})
  const catCaido = await prisma.nomencladorValor.findFirst({ where: { nomencladorId: nomCategoria.id, codigo: 'FAMILIARES_CAIDOS' }})
  const sexoM = await prisma.nomencladorValor.findFirst({ where: { nomencladorId: nomSexo.id, codigo: 'MASCULINO' }})
  const sexoF = await prisma.nomencladorValor.findFirst({ where: { nomencladorId: nomSexo.id, codigo: 'FEMENINO' }})
  const pielBlanca = await prisma.nomencladorValor.findFirst({ where: { nomencladorId: nomColorPiel.id, codigo: 'BLANCA' }})
  const estadoCasado = await prisma.nomencladorValor.findFirst({ where: { nomencladorId: nomEstadoCivil.id, codigo: 'CASADO' }})
  const saludBueno = await prisma.nomencladorValor.findFirst({ where: { nomencladorId: nomEstadoSalud.id, codigo: 'BUENO' }})
  const provHabana = await prisma.provincia.findFirst({ where: { codigo: 'LA_HABANA' }})
  const municCentroHabana = await prisma.municipio.findFirst({ where: { provinciaId: provHabana?.id, nombre: 'Centro Habana' }})
  const tipoPensionAnt = await prisma.nomencladorValor.findFirst({ where: { nomencladorId: nomTipoPension.id, codigo: 'ANTIGUEDAD' }})
  const otorganteFar = await prisma.nomencladorValor.findFirst({ where: { nomencladorId: nomOtorgante.id, codigo: 'FAR' }})
  const frenteEscambray = await prisma.nomencladorValor.findFirst({ where: { nomencladorId: nomFrenteEr.id, codigo: 'II_FRENTE_ESCAMBRAY' }})
  const gradoCapitan = await prisma.nomencladorValor.findFirst({ where: { nomencladorId: nomGradoEr.id, codigo: 'CAPITAN' }})

  const pensionadosDemo = [
    { ci: '45020102345', nombres: 'Juan', primerApellido: 'Pérez', segundoApellido: 'García', conocidoPor: 'Juanito', sexo: sexoM, cat: catEr, caido: false, pension: 3200 },
    { ci: '48031506789', nombres: 'María', primerApellido: 'Rodríguez', segundoApellido: 'López', conocidoPor: 'Mari', sexo: sexoF, cat: catLc, caido: false, pension: 2800 },
    { ci: '51041203456', nombres: 'Pedro', primerApellido: 'Martínez', segundoApellido: 'Sánchez', conocidoPor: null, sexo: sexoM, cat: catEr, caido: false, pension: 3500 },
    { ci: '49072307890', nombres: 'Ana', primerApellido: 'Hernández', segundoApellido: 'Torres', conocidoPor: 'Anita', sexo: sexoF, cat: catCaido, caido: true, pension: 1900 },
    { ci: '53101804567', nombres: 'José', primerApellido: 'Gómez', segundoApellido: 'Díaz', conocidoPor: 'Pepe', sexo: sexoM, cat: catEr, caido: false, pension: 4100 },
  ]
  for (let i = 0; i < pensionadosDemo.length; i++) {
    const p = pensionadosDemo[i]
    const pensionado = await prisma.pensionado.create({
      data: {
        carnetIdentidad: p.ci,
        nombres: p.nombres,
        primerApellido: p.primerApellido,
        segundoApellido: p.segundoApellido,
        conocidoPor: p.conocidoPor,
        sexoId: p.sexo?.id,
        colorPielId: pielBlanca?.id,
        estadoCivilId: estadoCasado?.id,
        estadoSaludId: saludBueno?.id,
        telefono: `+53 5 ${10000000 + i}`,
        fechaNacimiento: new Date(1945 + i, i % 12, (i*3+5) % 28),
        categoriaId: p.cat?.id,
        territorioId: provHabana?.id,
        esCaido: p.caido,
        createdBy: admin.id,
        updatedBy: admin.id,
        observaciones: `Pensionado demo ${i+1}`,
        version: 1,
      }
    })
    // Domicilio
    await prisma.domicilio.create({
      data: {
        pensionadoId: pensionado.id,
        provinciaId: provHabana!.id,
        municipioId: municCentroHabana!.id,
        calle: `Calle ${String.fromCharCode(65 + i)} #${i+1}`,
        numero: `${i+1}`,
        entreCalle1: 'Calle 1',
        entreCalle2: 'Calle 2',
        telefono: `+53 7 ${8000000 + i}`,
        tipoDomicilio: 'HABITUAL',
        esPrincipal: true,
      }
    })
    // Cuenta bancaria
    await prisma.cuentaBancaria.create({
      data: {
        pensionadoId: pensionado.id,
        banco: 'Banco Popular de Ahorro',
        sucursal: 'Sucursal Centro Habana',
        numeroCuenta: `020000${10000000 + i}`,
        numeroControlBancario: `CB-${i+1000}`,
        tipoCuenta: 'AHORRO',
        esActiva: true,
        fechaApertura: new Date(2010, i, 15),
      }
    })
    // Pensión
    await prisma.pension.create({
      data: {
        pensionadoId: pensionado.id,
        tipoPensionId: tipoPensionAnt!.id,
        otorgadaPorId: otorganteFar!.id,
        cuantiaPmt: p.pension,
        fechaOtorgamiento: new Date(2015, i, 10),
        fechaInicio: new Date(2015, i, 10),
        esVigente: true,
      }
    })
    // Trayectoria
    await prisma.trayectoriaRevolucionaria.create({
      data: {
        pensionadoId: pensionado.id,
        frenteErId: frenteEscambray?.id,
        gradoMilitarErId: gradoCapitan?.id,
        numeroAcuerdoResolucion: `${1000+i}-15.10.${1990+i}`,
        fechaResolucion: new Date(1990+i, i%12, 15),
      }
    })
    // Alta inicial
    await prisma.altasBaja.create({
      data: {
        pensionadoId: pensionado.id,
        tipoMovimiento: 'ALTA',
        subtipo: 'INICIAL',
        fechaMovimiento: new Date(2015, i, 10),
        observaciones: 'Alta inicial automática',
      }
    })
  }

  // ===== Notificación demo =====
  console.log('🔔 Creando notificación demo...')
  const notif = await prisma.notificacion.create({
    data: {
      tipo: 'SISTEMA',
      titulo: 'Bienvenido al Sistema SAPC-ONAC',
      descripcion: 'La Fase 0 ha sido implementada exitosamente. Nomencladores y datos demo cargados.',
      prioridad: 'MEDIA',
      generadaPor: 'SISTEMA',
      urlDestino: '/dashboard',
      fechaCreacion: new Date(),
      fechaExpiracion: new Date(Date.now() + 90*24*60*60*1000),
    }
  })
  await prisma.notificacionDestinatario.create({
    data: {
      notificacionId: notif.id,
      tipoDestinatario: 'USUARIO',
      usuarioDestinatarioId: admin.id,
      usuarioEmisorId: admin.id,
      estado: 'PENDIENTE',
    }
  })

  console.log('✅ Seed completado')
  console.log('   • 6 roles, ~50 permisos')
  console.log('   • 1 usuario admin: admin / admin123')
  console.log('   • 16 nomencladores con valores')
  console.log('   • 15 provincias y ~150 municipios')
  console.log('   • 5 pensionados demo con domicilios, cuentas, pensiones, trayectoria')
  console.log('   • 1 notificación demo para el admin')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Error en seed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
