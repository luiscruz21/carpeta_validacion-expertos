import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { generateDocxReport } from './generateDocxReport.js'
import { generateCronbachDocxReport } from './generateCronbachDocxReport.js'

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
const INVESTIGADOR_FILE = path.join(DATA_DIR, 'investigador.json')

const PIN_INVESTIGADOR_OFICIAL = "2026"

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Variables en memoria para persistencia fluida en Serverless (Vercel)
let memoryInvites = null
let memoryEvals = null
let memoryRevocados = null
let memoryPreguntas = null
let memoryInvestigador = null

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
} catch (e) {
  console.warn("No se pudo crear directorio DATA_DIR:", e.message)
}

const readJson = (filePath, defaultVal = null) => {
  if (IS_VERCEL) {
    if (filePath === INVITE_FILE && memoryInvites !== null) return memoryInvites
    if (filePath === EVAL_FILE && memoryEvals !== null) return memoryEvals
    if (filePath === REVOCADOS_FILE && memoryRevocados !== null) return memoryRevocados
    if (filePath === CUSTOM_PREGUNTAS_FILE && memoryPreguntas !== null) return memoryPreguntas
    if (filePath === INVESTIGADOR_FILE && memoryInvestigador !== null) return memoryInvestigador
  }

  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(raw)
      if (filePath === INVITE_FILE) memoryInvites = parsed
      if (filePath === EVAL_FILE) memoryEvals = parsed
      if (filePath === REVOCADOS_FILE) memoryRevocados = parsed
      if (filePath === CUSTOM_PREGUNTAS_FILE) memoryPreguntas = parsed
      if (filePath === INVESTIGADOR_FILE) memoryInvestigador = parsed
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
  if (filePath === INVESTIGADOR_FILE) memoryInvestigador = data

  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.warn(`Autoguardado en disco omitido para ${filePath}:`, err.message)
  }
}

// -------------------------------------------------------------
// ENDPOINTS DE PERFIL DEL INVESTIGADOR
// -------------------------------------------------------------
app.get('/api/investigador/perfil', (req, res) => {
  const perfil = readJson(INVESTIGADOR_FILE, {
    nombres: "Luis Alfonso",
    apellidos: "Cruz Gálvez",
    dni: "09091855",
    email: "luiscruz21@gmail.com",
    grado: "Doctor en Educación / Magíster en Ingeniería",
    tituloTesis: "Sistema Predictivo con Deep Learning para la Gestión de Riesgos en Proyectos de Infraestructura Pública registrados en INFOBRAS - Contraloría General de la República, Perú, 2020-2024",
    firmaImg: ""
  })
  return res.json({ success: true, perfil })
})

app.post('/api/investigador/perfil', (req, res) => {
  const { perfil } = req.body || {}
  if (!perfil) return res.status(400).json({ success: false, error: 'Sin datos' })
  writeJson(INVESTIGADOR_FILE, perfil)
  return res.json({ success: true, mensaje: 'Perfil del investigador guardado con éxito', perfil })
})

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
// ENDPOINT DE LOGIN Y CAMBIO DE PIN PARA INVESTIGADOR
// -------------------------------------------------------------
app.post('/api/investigador/login', (req, res) => {
  const { pin } = req.body
  const perfil = readJson(INVESTIGADOR_FILE) || {}
  const currentPin = perfil.pin || PIN_INVESTIGADOR_OFICIAL || '2026'

  if (pin === currentPin) {
    return res.json({ success: true, mensaje: 'Autenticación exitosa como Investigador' })
  }
  return res.status(401).json({ success: false, mensaje: 'Clave PIN incorrecta. Verifique la clave configurada en el Panel de Control.' })
})

app.post('/api/investigador/cambiar-pin', (req, res) => {
  const { pinActual, nuevoPin } = req.body
  if (!nuevoPin || nuevoPin.trim().length < 4) {
    return res.status(400).json({ success: false, mensaje: 'El nuevo PIN debe tener al menos 4 dígitos o caracteres.' })
  }
  const perfil = readJson(INVESTIGADOR_FILE) || {
    nombres: "Luis Alfonso",
    apellidos: "Cruz Gálvez",
    dni: "09091855",
    email: "luiscruz21@gmail.com",
    grado: "Doctor en Educación / Magíster en Ingeniería",
    tituloTesis: TITULO_TESIS_OFICIAL,
    pin: "2026"
  }
  const currentPin = perfil.pin || PIN_INVESTIGADOR_OFICIAL || '2026'
  if (pinActual !== currentPin) {
    return res.status(400).json({ success: false, mensaje: 'La clave PIN actual ingresada es incorrecta.' })
  }
  perfil.pin = nuevoPin.trim()
  writeJson(INVESTIGADOR_FILE, perfil)
  return res.json({ success: true, mensaje: 'Clave PIN del Investigador actualizada con éxito', pin: perfil.pin })
})

// INGRESO / VALIDACIÓN DE EVALUADOR POR DNI O DOCUMENTO DE IDENTIDAD
app.post('/api/invitacion/validar', (req, res) => {
  const { codigo } = req.body
  if (!codigo) {
    return res.status(400).json({ success: false, mensaje: 'Debe ingresar su DNI o Documento de Identidad.' })
  }
  const cleanCode = codigo.trim().toUpperCase()
  const invites = readJson(INVITE_FILE) || {}
  const evals = readJson(EVAL_FILE) || {}
  const revocados = readJson(REVOCADOS_FILE) || []

  if (revocados.includes(cleanCode)) {
    return res.status(403).json({
      success: false,
      revocado: true,
      mensaje: 'Acceso Denegado: Su acceso ha sido revocado por el Investigador Principal.'
    })
  }

  let invite = invites[cleanCode] || Object.values(invites).find(i => (i.codigo && i.codigo.trim().toUpperCase() === cleanCode) || (i.dni && i.dni.trim().toUpperCase() === cleanCode))
  let evalData = evals[cleanCode] || Object.values(evals).find(e => (e.codigo && e.codigo.trim().toUpperCase() === cleanCode) || (e.dni && e.dni.trim().toUpperCase() === cleanCode))

  return res.json({
    success: true,
    mensaje: 'DNI verificado con éxito',
    invitacion: invite || { codigo: cleanCode, dni: cleanCode },
    evaluacion: evalData || null
  })
})

// GET Resumen Consolidado Completo para el Investigador
app.get('/api/investigador/resumen', (req, res) => {
  const invites = readJson(INVITE_FILE) || {}
  const evals = readJson(EVAL_FILE) || {}
  const invitacionesConsolidadas = getConsolidatedInvitations(invites, evals)

  return res.json({
    success: true,
    totalInvitaciones: invitacionesConsolidadas.length,
    totalEvaluacionesIniciadas: invitacionesConsolidadas.filter(i => i.respondidas > 0).length,
    evaluacionesCompletadas: invitacionesConsolidadas.filter(i => i.estado === "Completado" || i.respondidas >= 100).length,
    invitaciones: invitacionesConsolidadas,
    evaluaciones: evals
  })
})

// GET / POST Descargar Informe Completo de Validación V de Aiken (.docx Word)
const handleDescargarDocxHandler = async (req, res) => {
  try {
    const invites = readJson(INVITE_FILE) || {}
    const evals = readJson(EVAL_FILE) || {}
    const perfil = readJson(INVESTIGADOR_FILE) || {}

    let preguntas = {}
    if (fs.existsSync(DEFAULT_PREGUNTAS_FILE)) {
      try {
        preguntas = JSON.parse(fs.readFileSync(DEFAULT_PREGUNTAS_FILE, 'utf8'))
      } catch (e) {}
    }

    const rawSel = req.query.evaluadores || (req.body && req.body.evaluadores)
    let selectedKeys = []
    if (typeof rawSel === 'string') {
      selectedKeys = rawSel.split(',').map(s => s.trim()).filter(Boolean)
    } else if (Array.isArray(rawSel)) {
      selectedKeys = rawSel
    }

    const docBuffer = await generateDocxReport(evals, invites, perfil, preguntas, selectedKeys)

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', 'attachment; filename="MODELO_V_DE_AIKEN_VALIDACION_DE_LOS_INSTRUMENTOS.docx"')
    return res.send(docBuffer)
  } catch (err) {
    console.error("Error generando informe Word:", err)
    return res.status(500).json({ success: false, mensaje: "Error al generar informe Word: " + err.message })
  }
}

app.get('/api/investigador/descargar-informe-docx', handleDescargarDocxHandler)
app.post('/api/investigador/descargar-informe-docx', handleDescargarDocxHandler)

// GET / POST Descargar Informe Exclusivo Alfa de Cronbach (.docx Word)
const handleDescargarCronbachDocxHandler = async (req, res) => {
  try {
    const invites = readJson(INVITE_FILE) || {}
    const evals = readJson(EVAL_FILE) || {}
    const perfil = readJson(INVESTIGADOR_FILE) || {}

    let preguntas = {}
    if (fs.existsSync(DEFAULT_PREGUNTAS_FILE)) {
      try {
        preguntas = JSON.parse(fs.readFileSync(DEFAULT_PREGUNTAS_FILE, 'utf8'))
      } catch (e) {}
    }

    const docBuffer = await generateCronbachDocxReport(evals, invites, perfil, preguntas)

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', 'attachment; filename="INFORME_CONFIABILIDAD_ALFA_DE_CRONBACH.docx"')
    return res.send(docBuffer)
  } catch (err) {
    console.error("Error generando informe Cronbach Word:", err)
    return res.status(500).json({ success: false, mensaje: "Error al generar informe Cronbach Word: " + err.message })
  }
}

app.get('/api/investigador/descargar-informe-cronbach', handleDescargarCronbachDocxHandler)
app.post('/api/investigador/descargar-informe-cronbach', handleDescargarCronbachDocxHandler)

// POST Editar Datos de Evaluador por parte del Investigador Principal
app.post('/api/investigador/editar-evaluador', (req, res) => {
  const { codigoTarget, datosEvaluador } = req.body
  if (!codigoTarget || !datosEvaluador) {
    return res.status(400).json({ success: false, mensaje: 'Faltan datos obligatorios' })
  }

  const cleanCode = codigoTarget.trim().toUpperCase()
  const evals = readJson(EVAL_FILE) || {}
  const invites = readJson(INVITE_FILE) || {}

  const existingEval = evals[cleanCode] || Object.values(evals).find(e => (e.codigo && e.codigo.trim().toUpperCase() === cleanCode) || (e.dni && e.dni.trim().toUpperCase() === cleanCode)) || {}
  const existingInvite = invites[cleanCode] || Object.values(invites).find(i => (i.codigo && i.codigo.trim().toUpperCase() === cleanCode) || (i.dni && i.dni.trim().toUpperCase() === cleanCode)) || {}

  const keyToUse = existingEval.codigo || existingInvite.codigo || cleanCode

  const fullNombre = datosEvaluador.nombre || existingEval.nombre || existingInvite.nombreExperto || "Experto Validador"
  const parts = fullNombre.split(' ')
  const nombres = datosEvaluador.nombresExperto || existingEval.nombresExperto || parts[0] || fullNombre
  const apellidos = datosEvaluador.apellidosExperto || existingEval.apellidosExperto || parts.slice(1).join(' ') || ""
  const cleanDni = datosEvaluador.dni || existingEval.dni || existingInvite.dni || keyToUse
  const cleanCargo = datosEvaluador.cargo || existingEval.cargo || existingInvite.cargo || "Especialista Informante"
  const cleanGrado = datosEvaluador.gradoAcademico || existingEval.gradoAcademico || existingInvite.gradoAcademico || "Magíster"
  const cleanInstitucion = datosEvaluador.institucion || existingEval.institucion || existingInvite.institucion || "Universidad de Procedencia"
  const cleanEmail = datosEvaluador.email || existingEval.email || existingInvite.email || ""

  const updatedEval = {
    ...existingEval,
    codigo: keyToUse,
    inviteCode: keyToUse,
    nombre: fullNombre,
    nombresExperto: nombres,
    apellidosExperto: apellidos,
    cargo: cleanCargo,
    gradoAcademico: cleanGrado,
    institucion: cleanInstitucion,
    dni: cleanDni,
    email: cleanEmail,
    lastUpdated: new Date().toISOString()
  }

  const updatedInvite = {
    ...existingInvite,
    codigo: keyToUse,
    nombreExperto: fullNombre,
    nombresExperto: nombres,
    apellidosExperto: apellidos,
    cargo: cleanCargo,
    gradoAcademico: cleanGrado,
    institucion: cleanInstitucion,
    email: cleanEmail,
    dni: cleanDni
  }

  // Guardar ÚNICAMENTE bajo la clave canónica del código para EVITAR DUPLICAR entradas
  evals[keyToUse] = updatedEval
  invites[keyToUse] = updatedInvite

  // Si existían claves alias alias creadas previamente por DNI, limpiarlas si no difieren
  if (cleanDni && cleanDni !== keyToUse) {
    if (invites[cleanDni]) delete invites[cleanDni]
    if (evals[cleanDni] && (!evals[cleanDni].respuestas || Object.keys(evals[cleanDni].respuestas).length === 0)) {
      delete evals[cleanDni]
    }
  }

  writeJson(EVAL_FILE, evals)
  writeJson(INVITE_FILE, invites)

  return res.json({
    success: true,
    mensaje: 'Perfil y datos del evaluador actualizados con éxito por el Investigador',
    evaluacion: updatedEval,
    invitacion: updatedInvite
  })
})

// Función Auxiliar para Consolidar Evaluadores Únicos y sus Respuestas (1 Fila por Invitación/DNI)
const getConsolidatedInvitations = (invites, evals) => {
  const result = []
  const seenCodes = new Set()
  const seenDnis = new Set()

  // 1. Procesar todas las invitaciones creadas por el Investigador
  Object.keys(invites).forEach(code => {
    const inv = invites[code] || {}
    const cleanCode = code.trim().toUpperCase()
    const cleanInvDni = (inv.dni || '').trim().toUpperCase()

    const matchingEval = evals[cleanCode] || Object.values(evals).find(e => {
      const eInvite = (e.inviteCode || '').trim().toUpperCase()
      const eCode = (e.codigo || '').trim().toUpperCase()
      const eDni = (e.dni || '').trim().toUpperCase()
      if (eInvite && eInvite === cleanCode) return true
      if (eCode && eCode === cleanCode) return true
      if (cleanInvDni && cleanInvDni !== '' && cleanInvDni !== 'SIN REGISTRAR' && eDni && eDni === cleanInvDni) return true
      return false
    })

    const finalDni = (inv.dni && inv.dni !== cleanCode) ? inv.dni : (matchingEval?.dni || (cleanCode.length === 8 ? cleanCode : 'Sin registrar'))
    const cleanFinalDni = finalDni.trim().toUpperCase()

    // DEDUPLICACIÓN STRICTA: Si este DNI o Código ya fue procesado, no duplicar la fila
    if (seenCodes.has(cleanCode)) return
    if (cleanFinalDni && cleanFinalDni !== 'SIN REGISTRAR' && cleanFinalDni !== '' && !cleanFinalDni.startsWith('EXP-') && seenDnis.has(cleanFinalDni)) return

    let finalNombre = (matchingEval?.nombre && matchingEval.nombre !== "Experto Validador") ? matchingEval.nombre : (inv.nombreExperto || "Experto Validador")
    let finalCargo = (matchingEval?.cargo && matchingEval.cargo !== "Especialista Informante") ? matchingEval.cargo : (inv.cargo || "Especialista Informante")
    let finalGrado = matchingEval?.gradoAcademico || inv.gradoAcademico || "Magíster"
    let finalInstitucion = matchingEval?.institucion || matchingEval?.estudios || inv.institucion || "Universidad de Procedencia"
    let finalEmail = matchingEval?.email || inv.email || ""
    let finalNombresExperto = matchingEval?.nombresExperto || inv.nombresExperto || ""
    let finalApellidosExperto = matchingEval?.apellidosExperto || inv.apellidosExperto || ""

    const respuestas = matchingEval?.respuestas || {}
    const totalAnswered = Object.keys(respuestas).filter(k => {
      const r = respuestas[k]
      return r && (r.likert || r.claridad || r.coherencia || r.relevancia || r.suficiencia)
    }).length

    const isFullyCompleted = cleanCode === '09091855' || matchingEval?.finalizado || totalAnswered >= 100
    let estado = isFullyCompleted ? "Completado" : (totalAnswered > 0 ? "En Proceso" : "Pendiente")

    const item = {
      codigo: cleanCode,
      nombreExperto: finalNombre,
      nombre: finalNombre,
      nombresExperto: finalNombresExperto,
      apellidosExperto: finalApellidosExperto,
      cargo: finalCargo,
      gradoAcademico: finalGrado,
      institucion: finalInstitucion,
      email: finalEmail,
      dni: finalDni,
      creadoEn: inv.creadoEn || new Date().toISOString(),
      estado,
      respondidas: isFullyCompleted ? Math.max(totalAnswered, 100) : totalAnswered
    }

    seenCodes.add(cleanCode)
    if (cleanFinalDni && cleanFinalDni !== 'SIN REGISTRAR' && cleanFinalDni !== '' && !cleanFinalDni.startsWith('EXP-')) {
      seenDnis.add(cleanFinalDni)
    }

    result.push(item)
  })

  // 2. Agregar cualquier evaluación adicional que no estuviera agrupada
  Object.keys(evals).forEach(key => {
    const cleanKey = key.trim().toUpperCase()
    const ev = evals[cleanKey] || {}
    const inviteCode = (ev.inviteCode || '').trim().toUpperCase()
    const evDni = (ev.dni || '').trim().toUpperCase()

    if (seenCodes.has(cleanKey) || (inviteCode && seenCodes.has(inviteCode))) return
    if (evDni && evDni !== 'SIN REGISTRAR' && evDni !== '' && !evDni.startsWith('EXP-') && seenDnis.has(evDni)) return
    if (cleanKey === '09091855') return

    const respuestas = ev.respuestas || {}
    const totalAnswered = Object.keys(respuestas).filter(k => {
      const r = respuestas[k]
      return r && (r.likert || r.claridad || r.coherencia || r.relevancia || r.suficiencia)
    }).length
    const estado = (ev.finalizado || totalAnswered >= 100) ? "Completado" : (totalAnswered > 0 ? "En Proceso" : "Pendiente")

    const item = {
      codigo: cleanKey,
      nombreExperto: ev.nombre || "Experto Validador",
      nombre: ev.nombre || "Experto Validador",
      nombresExperto: ev.nombresExperto || "",
      apellidosExperto: ev.apellidosExperto || "",
      cargo: ev.cargo || "Especialista Informante",
      gradoAcademico: ev.gradoAcademico || "Magíster",
      institucion: ev.institucion || ev.estudios || "Universidad de Procedencia",
      email: ev.email || "",
      dni: ev.dni || cleanKey,
      creadoEn: ev.creadoEn || new Date().toISOString(),
      estado,
      respondidas: totalAnswered
    }

    seenCodes.add(cleanKey)
    if (evDni && evDni !== 'SIN REGISTRAR' && evDni !== '' && !evDni.startsWith('EXP-')) {
      seenDnis.add(evDni)
    }

    result.push(item)
  })

  return result
}

// GET Obtener todas las invitaciones (Consolidadas y agrupadas por Evaluador)
app.get('/api/invitaciones', (req, res) => {
  const invites = readJson(INVITE_FILE) || {}
  const evals = readJson(EVAL_FILE) || {}
  const result = getConsolidatedInvitations(invites, evals)
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
    const kClean = k.toUpperCase()
    if (kClean === cleanCode || (evals[k].dni && evals[k].dni.toUpperCase() === cleanCode) || (/^\d+$/.test(kClean) && (cleanCode.startsWith(kClean) || kClean.startsWith(cleanCode)))) {
      if (evals[k].dni && !revocados.includes(evals[k].dni.trim().toUpperCase())) {
        revocados.push(evals[k].dni.trim().toUpperCase())
      }
      delete evals[k]
      found = true
    }
  })

  Object.keys(invites).forEach(k => {
    const kClean = k.toUpperCase()
    if (kClean === cleanCode || (invites[k].dni && invites[k].dni.toUpperCase() === cleanCode) || (/^\d+$/.test(kClean) && (cleanCode.startsWith(kClean) || kClean.startsWith(cleanCode)))) {
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
  const invites = readJson(INVITE_FILE) || {}
  const revocados = readJson(REVOCADOS_FILE) || []

  const cleanKey = key.trim().toUpperCase()

  if (revocados.includes(cleanKey)) {
    return res.status(403).json({
      success: false,
      revocado: true,
      mensaje: 'Acceso Denegado: Este registro fue eliminado por el Investigador.'
    })
  }

  let foundEval = evals[cleanKey] || Object.values(evals).find(e => 
    (e.codigo && e.codigo.trim().toUpperCase() === cleanKey) || 
    (e.inviteCode && e.inviteCode.trim().toUpperCase() === cleanKey) ||
    (e.dni && e.dni.trim().toUpperCase() === cleanKey)
  )

  let foundInvite = invites[cleanKey] || Object.values(invites).find(i => 
    (i.codigo && i.codigo.trim().toUpperCase() === cleanKey) || 
    (i.dni && i.dni.trim().toUpperCase() === cleanKey)
  )

  if (foundEval || foundInvite) {
    const merged = {
      ...(foundInvite || {}),
      ...(foundEval || {}),
      nombre: (foundEval && foundEval.nombre) || (foundInvite && foundInvite.nombreExperto) || "Experto Validador",
      nombresExperto: (foundEval && foundEval.nombresExperto) || (foundInvite && foundInvite.nombresExperto) || "",
      apellidosExperto: (foundEval && foundEval.apellidosExperto) || (foundInvite && foundInvite.apellidosExperto) || "",
      cargo: (foundEval && foundEval.cargo) || (foundInvite && foundInvite.cargo) || "Especialista Informante",
      gradoAcademico: (foundEval && foundEval.gradoAcademico) || (foundInvite && foundInvite.gradoAcademico) || "Magíster",
      institucion: (foundEval && (foundEval.institucion || foundEval.estudios)) || (foundInvite && foundInvite.institucion) || "Universidad de Procedencia",
      email: (foundEval && foundEval.email) || (foundInvite && foundInvite.email) || "",
      dni: (foundEval && foundEval.dni) || (foundInvite && foundInvite.dni) || cleanKey,
      codigo: cleanKey,
      inviteCode: cleanKey
    }

    if (merged.dni && revocados.includes(merged.dni.trim().toUpperCase())) {
      return res.status(403).json({
        success: false,
        revocado: true,
        mensaje: 'Acceso Denegado: Este registro fue eliminado por el Investigador.'
      })
    }
    return res.json({ success: true, data: merged })
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

  // Determinar clave canónica (Invitation Code como clave principal)
  let targetKey = cleanCode
  if (payload.inviteCode && payload.inviteCode.trim().toUpperCase().startsWith('EXP-')) {
    targetKey = payload.inviteCode.trim().toUpperCase()
  }

  const existingEval = evals[targetKey] || evals[cleanCode] || {}

  // Determinar nombre, cargo y DNI sin sobrescribir datos reales
  let finalNombre = (payload.nombre && payload.nombre !== "Experto Validador") ? payload.nombre : (existingEval.nombre || payload.nombre || "Experto Validador")
  let finalCargo = payload.cargo || existingEval.cargo || "Especialista Informante"
  let finalDni = payload.dni || existingEval.dni || cleanCode

  if (targetKey === 'EXP-23TJ' || cleanCode === 'EXP-23TJ') {
    if (!payload.nombre || payload.nombre === "Experto Validador") {
      finalNombre = existingEval.nombre || "Marco Antonio Tipismana Neyra"
    }
    targetKey = "EXP-23TJ"
  }

  // Fusionar respuestas antiguas y nuevas para NUNCA perder respuestas, a menos que sea un nuevo registro o reset explicito
  const isReset = payload.isNuevoRegistro || (payload.respuestas && Object.keys(payload.respuestas).length === 0)
  const mergedRespuestas = isReset ? (payload.respuestas || {}) : {
    ...(existingEval.respuestas || {}),
    ...(payload.respuestas || {})
  }

  // Recalcular avance y estado del evaluador
  const totalAnswered = Object.keys(mergedRespuestas).filter(k => {
    const r = mergedRespuestas[k]
    return r && (r.likert || r.claridad || r.coherencia || r.relevancia || r.suficiencia)
  }).length

  const nuevoEstado = (payload.finalizado || existingEval.finalizado || totalAnswered >= 100) ? "Completado" : (totalAnswered > 0 ? "En Proceso" : "Pendiente")

  const updatedPayload = {
    ...existingEval,
    ...payload,
    nombre: finalNombre,
    cargo: finalCargo,
    dni: finalDni,
    respuestas: mergedRespuestas,
    codigo: targetKey,
    inviteCode: targetKey,
    lastUpdated: new Date().toISOString()
  }

  // Guardar bajo la clave canónica de invitación
  evals[targetKey] = updatedPayload

  // Si la clave ingresada fue el DNI y es diferente del targetKey, eliminar la clave duplicada standalone
  if (cleanCode !== targetKey && /^\d{8}$/.test(cleanCode)) {
    delete evals[cleanCode]
    delete invites[cleanCode]
  }

  // Actualizar o crear objeto de invitación sincronizado
  invites[targetKey] = {
    codigo: targetKey,
    nombreExperto: finalNombre,
    cargo: finalCargo,
    dni: finalDni,
    creadoEn: invites[targetKey]?.creadoEn || new Date().toISOString(),
    estado: nuevoEstado,
    respondidas: totalAnswered
  }

  writeJson(INVITE_FILE, invites)
  writeJson(EVAL_FILE, evals)

  return res.json({ 
    success: true, 
    mensaje: 'Evaluación guardada correctamente', 
    data: updatedPayload,
    lastUpdated: updatedPayload.lastUpdated,
    respondidas: totalAnswered,
    estado: nuevoEstado
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
