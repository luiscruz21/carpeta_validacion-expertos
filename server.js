import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001
// Detectar si está corriendo en Vercel o entorno Serverless
const IS_VERCEL = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
const DATA_DIR = IS_VERCEL ? '/tmp' : path.join(__dirname, 'db_data')

const EVAL_FILE = path.join(DATA_DIR, 'evaluaciones.json')
const INVITE_FILE = path.join(DATA_DIR, 'invitaciones.json')
const REVOCADOS_FILE = path.join(DATA_DIR, 'revocados.json')
const CUSTOM_PREGUNTAS_FILE = path.join(DATA_DIR, 'preguntas_custom.json')
const DEFAULT_PREGUNTAS_FILE = path.join(__dirname, 'src', 'preguntas.json')

const PIN_INVESTIGADOR_OFICIAL = "2026"

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Variables en memoria para persistencia fluida en Serverless (Vercel)
let memoryInvites = null
let memoryEvals = null
let memoryRevocados = null
let memoryPreguntas = null

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
} catch (e) {
  console.warn("No se pudo crear directorio DATA_DIR:", e.message)
}

const readJson = (filePath, defaultVal = null) => {
  if (filePath === INVITE_FILE && memoryInvites !== null) return memoryInvites
  if (filePath === EVAL_FILE && memoryEvals !== null) return memoryEvals
  if (filePath === REVOCADOS_FILE && memoryRevocados !== null) return memoryRevocados
  if (filePath === CUSTOM_PREGUNTAS_FILE && memoryPreguntas !== null) return memoryPreguntas

  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(raw)
      if (filePath === INVITE_FILE) memoryInvites = parsed
      if (filePath === EVAL_FILE) memoryEvals = parsed
      if (filePath === REVOCADOS_FILE) memoryRevocados = parsed
      if (filePath === CUSTOM_PREGUNTAS_FILE) memoryPreguntas = parsed
      return parsed
    }
  } catch (err) {
    console.warn(`Error leyendo ${filePath}:`, err.message)
  }

  // Si no existía en /tmp (Vercel), intentamos leer la plantilla inicial de db_data
  if (IS_VERCEL) {
    try {
      const baseFile = path.join(__dirname, 'db_data', path.basename(filePath))
      if (fs.existsSync(baseFile)) {
        const raw = fs.readFileSync(baseFile, 'utf-8')
        const parsed = JSON.parse(raw)
        if (filePath === INVITE_FILE) memoryInvites = parsed
        if (filePath === EVAL_FILE) memoryEvals = parsed
        if (filePath === REVOCADOS_FILE) memoryRevocados = parsed
        if (filePath === CUSTOM_PREGUNTAS_FILE) memoryPreguntas = parsed
        return parsed
      }
    } catch (e) {}
  }

  return defaultVal
}

const writeJson = (filePath, data) => {
  if (filePath === INVITE_FILE) memoryInvites = data
  if (filePath === EVAL_FILE) memoryEvals = data
  if (filePath === REVOCADOS_FILE) memoryRevocados = data
  if (filePath === CUSTOM_PREGUNTAS_FILE) memoryPreguntas = data

  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.warn(`Autoguardado en disco omitido para ${filePath}:`, err.message)
  }
}

// -------------------------------------------------------------
// ENDPOINTS DE PREGUNTAS (OBTENER Y GUARDAR EDICIONES DEL INVESTIGADOR)
// -------------------------------------------------------------
app.get('/api/preguntas', (req, res) => {
  let preguntas = readJson(CUSTOM_PREGUNTAS_FILE)
  if (!preguntas) {
    preguntas = readJson(DEFAULT_PREGUNTAS_FILE) || { VI: [], VD: [] }
  }
  return res.json({ success: true, preguntas })
})

app.post('/api/preguntas/guardar', (req, res) => {
  const { preguntas } = req.body
  if (!preguntas || !preguntas.VI || !preguntas.VD) {
    return res.status(400).json({ success: false, mensaje: 'Estructura de preguntas inválida' })
  }
  writeJson(CUSTOM_PREGUNTAS_FILE, preguntas)
  return res.json({ success: true, mensaje: 'Preguntas actualizadas y guardadas correctamente' })
})

// -------------------------------------------------------------
// ENDPOINT DE LOGIN PARA INVESTIGADOR (PIN: 2026)
// -------------------------------------------------------------
app.post('/api/investigador/login', (req, res) => {
  const { pin } = req.body
  if (pin === PIN_INVESTIGADOR_OFICIAL) {
    return res.json({ success: true, mensaje: 'Autenticación exitosa como Investigador' })
  }
  return res.status(401).json({ success: false, mensaje: 'Clave PIN incorrecta. La clave por defecto es 2026.' })
})

// GET Resumen Consolidado Completo para el Investigador
app.get('/api/investigador/resumen', (req, res) => {
  const invites = readJson(INVITE_FILE) || {}
  const evals = readJson(EVAL_FILE) || {}
  const evaluadoresList = Object.values(evals)

  return res.json({
    success: true,
    totalInvitaciones: Object.keys(invites).length,
    totalEvaluacionesIniciadas: evaluadoresList.length,
    evaluacionesCompletadas: evaluadoresList.filter(e => e.finalizado || Object.keys(e.respuestas || {}).length >= 100).length,
    invitaciones: Object.values(invites),
    evaluaciones: evals
  })
})

// GET Obtener todas las invitaciones
app.get('/api/invitaciones', (req, res) => {
  const invites = readJson(INVITE_FILE) || {}
  const evals = readJson(EVAL_FILE) || {}

  // Combinar invitaciones y evaluaciones para asegurar que todo evaluador aparezca
  const allKeys = new Set([...Object.keys(invites), ...Object.keys(evals)])
  const result = []

  allKeys.forEach(key => {
    const inv = invites[key] || {}
    const evalData = evals[key] || (inv.dni ? evals[inv.dni] : null)
    
    let nombreExperto = inv.nombreExperto || (evalData ? evalData.nombre : "Experto Validador")
    let cargo = inv.cargo || (evalData ? evalData.cargo : "Especialista Informante")
    let dni = inv.dni || (evalData ? evalData.dni : "")
    let creadoEn = inv.creadoEn || (evalData ? evalData.lastUpdated : new Date().toISOString())
    let lastUpdated = evalData?.lastUpdated || creadoEn

    let respondidas = 0
    let estado = inv.estado || "Pendiente"

    if (evalData) {
      const totalAnswered = Object.keys(evalData.respuestas || {}).filter(k => {
        const r = evalData.respuestas[k]
        return r && (r.likert || r.claridad || r.coherencia || r.relevancia || r.suficiencia)
      }).length
      respondidas = totalAnswered

      if (evalData.finalizado || totalAnswered >= 100) {
        estado = "Completado"
      } else if (totalAnswered > 0) {
        estado = "En Proceso"
      }
    }

    result.push({
      codigo: key,
      nombreExperto,
      cargo,
      dni,
      creadoEn,
      lastUpdated,
      estado,
      respondidas
    })
  })

  return res.json({ success: true, invitaciones: result })
})

// POST Crear una nueva invitación con código único
app.post('/api/invitaciones/crear', (req, res) => {
  const { nombreExperto, cargo } = req.body
  const invites = readJson(INVITE_FILE) || {}

  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
  const codigo = `EXP-${randomSuffix}`

  const newInvite = {
    codigo,
    nombreExperto: nombreExperto || "Experto Validador",
    cargo: cargo || "Especialista Informante",
    creadoEn: new Date().toISOString(),
    estado: "Pendiente",
    dni: ""
  }

  invites[codigo] = newInvite
  writeJson(INVITE_FILE, invites)

  return res.json({ success: true, mensaje: 'Invitación creada con éxito', invitación: newInvite })
})

// DELETE Eliminar una invitación o evaluador registrado
app.delete('/api/invitaciones/:codigo', (req, res) => {
  const { codigo } = req.params
  const cleanCode = (codigo || '').trim().toUpperCase()
  const invites = readJson(INVITE_FILE) || {}
  const evals = readJson(EVAL_FILE) || {}
  const revocados = readJson(REVOCADOS_FILE) || []

  let found = false

  if (invites[cleanCode]) {
    if (invites[cleanCode].dni && !revocados.includes(invites[cleanCode].dni.trim().toUpperCase())) {
      revocados.push(invites[cleanCode].dni.trim().toUpperCase())
    }
    delete invites[cleanCode]
    found = true
  }

  if (evals[cleanCode]) {
    if (evals[cleanCode].dni && !revocados.includes(evals[cleanCode].dni.trim().toUpperCase())) {
      revocados.push(evals[cleanCode].dni.trim().toUpperCase())
    }
    delete evals[cleanCode]
    found = true
  }

  Object.keys(evals).forEach(k => {
    if (k.toUpperCase() === cleanCode || (evals[k].dni && evals[k].dni.toUpperCase() === cleanCode)) {
      if (evals[k].dni && !revocados.includes(evals[k].dni.trim().toUpperCase())) {
        revocados.push(evals[k].dni.trim().toUpperCase())
      }
      delete evals[k]
      found = true
    }
  })

  Object.keys(invites).forEach(k => {
    if (k.toUpperCase() === cleanCode || (invites[k].dni && invites[k].dni.toUpperCase() === cleanCode)) {
      delete invites[k]
      found = true
    }
  })

  if (!revocados.includes(cleanCode)) {
    revocados.push(cleanCode)
  }

  writeJson(INVITE_FILE, invites)
  writeJson(EVAL_FILE, evals)
  writeJson(REVOCADOS_FILE, revocados)

  if (found) {
    return res.json({ success: true, mensaje: 'Evaluador o invitación eliminada correctamente' })
  }
  return res.status(404).json({ success: false, mensaje: 'Registro no encontrado' })
})

// GENERADOR DE CÓDIGO PARA EXTRANJEROS
app.post('/api/evaluador/extranjero-codigo', (req, res) => {
  const randomExt = Math.floor(10000 + Math.random() * 90000)
  const codigoExtranjero = `EXT-${randomExt}`
  return res.json({ success: true, codigo: codigoExtranjero })
})

// ENDPOINTS PARA EVALUADORES (VALIDACIÓN Y GUARDADO)
app.post('/api/evaluador/ingresar', (req, res) => {
  const { codigo, dni } = req.body
  const invites = readJson(INVITE_FILE) || {}
  const evals = readJson(EVAL_FILE) || {}
  const revocados = readJson(REVOCADOS_FILE) || []

  const cleanCode = (codigo || '').trim().toUpperCase()
  const cleanDni = (dni || '').trim()

  if (revocados.includes(cleanCode) || (cleanDni && revocados.includes(cleanDni.toUpperCase()))) {
    return res.status(403).json({
      success: false,
      revocado: true,
      mensaje: 'Acceso Denegado: Su registro o invitación ha sido retirado del sistema por el Investigador.'
    })
  }

  let invite = invites[cleanCode]
  
  if (!invite && cleanDni) {
    invite = Object.values(invites).find(i => i.dni === cleanDni)
  }

  if (!invite && cleanDni) {
    invite = {
      codigo: cleanCode || `ACC-${cleanDni}`,
      nombreExperto: "",
      cargo: "",
      creadoEn: new Date().toISOString(),
      estado: "En Proceso",
      dni: cleanDni
    }
  }

  const evalData = evals[cleanCode] || (cleanDni ? evals[cleanCode] : null) || null

  return res.json({
    success: true,
    invitacion: invite || { codigo: cleanCode || 'DIRECTO' },
    evaluacion: evalData
  })
})

// GET Consulta por DNI / Código
app.get('/api/evaluacion/:key', (req, res) => {
  const { key } = req.params
  const evals = readJson(EVAL_FILE) || {}
  const revocados = readJson(REVOCADOS_FILE) || []

  const cleanKey = key.trim().toUpperCase()

  if (revocados.includes(cleanKey)) {
    return res.status(403).json({
      success: false,
      revocado: true,
      mensaje: 'Acceso Denegado: Este registro fue eliminado por el Investigador.'
    })
  }

  const found = evals[cleanKey] || Object.values(evals).find(e => e.dni === key.trim())
  
  if (found) {
    if (found.dni && revocados.includes(found.dni.trim().toUpperCase())) {
      return res.status(403).json({
        success: false,
        revocado: true,
        mensaje: 'Acceso Denegado: Este registro fue eliminado por el Investigador.'
      })
    }
    return res.json({ success: true, data: found })
  }
  return res.json({ success: false, message: 'No encontrado' })
})

// POST Guardar/Actualizar evaluación
app.post('/api/evaluacion/save', (req, res) => {
  const { codigo, payload } = req.body
  if (!codigo) {
    return res.status(400).json({ success: false, mensaje: 'Falta la clave de identificación' })
  }

  const evals = readJson(EVAL_FILE) || {}
  const invites = readJson(INVITE_FILE) || {}
  let revocados = readJson(REVOCADOS_FILE) || []

  const cleanCode = codigo.trim().toUpperCase()
  
  if (payload && payload.isNuevoRegistro) {
    revocados = revocados.filter(k => k !== cleanCode && k !== (payload.dni || '').trim().toUpperCase())
    writeJson(REVOCADOS_FILE, revocados)
  }

  evals[cleanCode] = {
    ...payload,
    codigo: cleanCode,
    lastUpdated: new Date().toISOString()
  }

  // Si la invitación no existía previamente para este evaluador, la registramos automáticamente
  if (!invites[cleanCode]) {
    invites[cleanCode] = {
      codigo: cleanCode,
      nombreExperto: payload.nombre || "Experto Validador",
      cargo: payload.cargo || "Especialista Informante",
      dni: payload.dni || "",
      creadoEn: new Date().toISOString(),
      estado: payload.finalizado ? "Completado" : "En Proceso"
    }
  } else {
    if (payload.dni) invites[cleanCode].dni = payload.dni
    if (payload.nombre) invites[cleanCode].nombreExperto = payload.nombre
    if (payload.cargo) invites[cleanCode].cargo = payload.cargo
    if (payload.finalizado) invites[cleanCode].estado = "Completado"
  }

  // Buscar también por DNI para actualizar sincronizadamente
  if (payload.dni) {
    const cleanDni = payload.dni.trim().toUpperCase()
    if (invites[cleanDni]) {
      invites[cleanDni].nombreExperto = payload.nombre
      invites[cleanDni].cargo = payload.cargo
    }
    if (evals[cleanDni]) {
      evals[cleanDni].nombre = payload.nombre
      evals[cleanDni].cargo = payload.cargo
    }
  }

  writeJson(INVITE_FILE, invites)
  writeJson(EVAL_FILE, evals)

  return res.json({ 
    success: true, 
    mensaje: 'Evaluación guardada correctamente', 
    lastUpdated: evals[cleanCode].lastUpdated 
  })
})

// -------------------------------------------------------------
// SERVIR FRONTEND EN PRODUCCIÓN (DIST) DESDE SERVIDOR EXPRESS
// -------------------------------------------------------------
const DIST_DIR = path.join(__dirname, 'dist')
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR))
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(DIST_DIR, 'index.html'))
    }
    next()
  })
}

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor listo para Nube / Local en http://0.0.0.0:${PORT}`)
  })
}

export default app
