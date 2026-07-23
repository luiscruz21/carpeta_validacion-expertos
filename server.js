import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001
const DATA_DIR = path.join(__dirname, 'db_data')
const EVAL_FILE = path.join(DATA_DIR, 'evaluaciones.json')
const INVITE_FILE = path.join(DATA_DIR, 'invitaciones.json')
const CUSTOM_PREGUNTAS_FILE = path.join(DATA_DIR, 'preguntas_custom.json')
const DEFAULT_PREGUNTAS_FILE = path.join(__dirname, 'src', 'preguntas.json')

const PIN_INVESTIGADOR_OFICIAL = "2026"

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

if (!fs.existsSync(EVAL_FILE)) {
  fs.writeFileSync(EVAL_FILE, JSON.stringify({}, null, 2))
}

if (!fs.existsSync(INVITE_FILE)) {
  const defaultInvites = {
    "EXP-1001": {
      codigo: "EXP-1001",
      nombreExperto: "Dr. Experto 1 - Sistemas",
      cargo: "Especialista en IA & Deep Learning",
      creadoEn: new Date().toISOString(),
      estado: "Pendiente",
      dni: ""
    },
    "EXP-1002": {
      codigo: "EXP-1002",
      nombreExperto: "Mg. Experto 2 - Gestión de Riesgos",
      cargo: "Especialista en Infraestructura Pública",
      creadoEn: new Date().toISOString(),
      estado: "Pendiente",
      dni: ""
    }
  }
  fs.writeFileSync(INVITE_FILE, JSON.stringify(defaultInvites, null, 2))
}

const readJson = (filePath) => {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const writeJson = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
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

  const updatedInvites = Object.values(invites).map(inv => {
    const evalData = evals[inv.codigo] || (inv.dni ? evals[inv.dni] : null)
    let estado = "Pendiente"
    let respondidas = 0
    let lastUpdated = inv.creadoEn

    if (evalData) {
      const totalAnswered = Object.keys(evalData.respuestas || {}).filter(k => evalData.respuestas[k]?.likert).length
      respondidas = totalAnswered
      lastUpdated = evalData.lastUpdated || inv.creadoEn
      if (evalData.finalizado || totalAnswered >= 100) {
        estado = "Completado"
      } else if (totalAnswered > 0) {
        estado = "En Proceso"
      }
    }

    return {
      ...inv,
      estado,
      respondidas,
      lastUpdated
    }
  })

  return res.json({ success: true, invitaciones: updatedInvites })
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

// DELETE Eliminar una invitación
app.delete('/api/invitaciones/:codigo', (req, res) => {
  const { codigo } = req.params
  const invites = readJson(INVITE_FILE) || {}
  if (invites[codigo]) {
    delete invites[codigo]
    writeJson(INVITE_FILE, invites)
    return res.json({ success: true, mensaje: 'Invitación eliminada' })
  }
  return res.status(404).json({ success: false, mensaje: 'Código no encontrado' })
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

  const cleanCode = (codigo || '').trim().toUpperCase()
  const cleanDni = (dni || '').trim()

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
  const cleanKey = key.trim().toUpperCase()
  const found = evals[cleanKey] || Object.values(evals).find(e => e.dni === key.trim())
  
  if (found) {
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

  const cleanCode = codigo.trim().toUpperCase()
  
  evals[cleanCode] = {
    ...payload,
    codigo: cleanCode,
    lastUpdated: new Date().toISOString()
  }

  if (invites[cleanCode]) {
    if (payload.dni) invites[cleanCode].dni = payload.dni
    if (payload.nombre) invites[cleanCode].nombreExperto = payload.nombre
    if (payload.cargo) invites[cleanCode].cargo = payload.cargo
    writeJson(INVITE_FILE, invites)
  }

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
