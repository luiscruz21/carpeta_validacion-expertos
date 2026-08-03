import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { generateDocxReport } from './generateDocxReport.js'
import { generateCronbachDocxReport } from './generateCronbachDocxReport.js'
import * as dbManager from './db_manager.js'
import { readTable, writeTable } from './db_manager.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

const PIN_INVESTIGADOR_OFICIAL = "2026"

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// -------------------------------------------------------------
// ENDPOINTS DE PERFIL DEL INVESTIGADOR
// -------------------------------------------------------------
app.get('/api/investigador/perfil', async (req, res) => {
  const perfil = await readTable('investigador', {
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

app.post('/api/investigador/perfil', async (req, res) => {
  const { perfil } = req.body || {}
  if (!perfil) return res.status(400).json({ success: false, error: 'Sin datos' })
  await writeTable('investigador', perfil)
  return res.json({ success: true, mensaje: 'Perfil del investigador guardado con éxito', perfil })
})

// -------------------------------------------------------------
// ENDPOINTS DE PREGUNTAS
// -------------------------------------------------------------
app.get('/api/preguntas', async (req, res) => {
  let preguntas = await readTable('preguntas_custom', null)
  if (!preguntas) {
    preguntas = await readTable('preguntas', { VI: [], VD: [] }) // default from upload
  }
  return res.json({ success: true, preguntas })
})

app.post('/api/preguntas/guardar', async (req, res) => {
  const { preguntas } = req.body
  if (!preguntas || !preguntas.VI || !preguntas.VD) {
    return res.status(400).json({ success: false, mensaje: 'Estructura de preguntas inválida' })
  }
  await writeTable('preguntas_custom', preguntas)
  return res.json({ success: true, mensaje: 'Preguntas actualizadas y guardadas correctamente' })
})

// -------------------------------------------------------------
// LOGIN INVESTIGADOR
// -------------------------------------------------------------
app.post('/api/investigador/login', async (req, res) => {
  const { pin } = req.body
  const perfil = await readTable('investigador', {})
  const currentPin = perfil.pin || PIN_INVESTIGADOR_OFICIAL || '2026'

  if (pin === currentPin) {
    return res.json({ success: true, mensaje: 'Autenticación exitosa como Investigador' })
  }
  return res.status(401).json({ success: false, mensaje: 'Clave PIN incorrecta. Verifique la clave configurada en el Panel de Control.' })
})

app.post('/api/investigador/cambiar-pin', async (req, res) => {
  const { pinActual, nuevoPin } = req.body
  if (!nuevoPin || nuevoPin.trim().length < 4) {
    return res.status(400).json({ success: false, mensaje: 'El nuevo PIN debe tener al menos 4 dígitos o caracteres.' })
  }
  const perfil = await readTable('investigador', {})
  const currentPin = perfil.pin || PIN_INVESTIGADOR_OFICIAL || '2026'
  if (pinActual !== currentPin) {
    return res.status(400).json({ success: false, mensaje: 'La clave PIN actual ingresada es incorrecta.' })
  }
  perfil.pin = nuevoPin.trim()
  await writeTable('investigador', perfil)
  return res.json({ success: true, mensaje: 'Clave PIN del Investigador actualizada con éxito', pin: perfil.pin })
})

// INGRESO / VALIDACIÓN DE EVALUADOR POR DNI O DOCUMENTO DE IDENTIDAD
app.post('/api/invitacion/validar', async (req, res) => {
  const { codigo } = req.body
  if (!codigo) {
    return res.status(400).json({ success: false, mensaje: 'Debe ingresar su DNI o Documento de Identidad.' })
  }
  const cleanCode = codigo.trim().toUpperCase()
  const revocados = await readTable('revocados', [])

  if (revocados.includes(cleanCode)) {
    return res.status(403).json({
      success: false,
      revocado: true,
      mensaje: 'Acceso Denegado: Su acceso ha sido revocado por el Investigador Principal.'
    })
  }

  const evalData = await dbManager.getEvaluadorByDni(cleanCode)

  return res.json({
    success: true,
    mensaje: 'DNI verificado con éxito',
    invitacion: evalData || { codigo: cleanCode, dni: cleanCode },
    evaluacion: evalData || null
  })
})

// GET Resumen Consolidado Completo para el Investigador
app.get('/api/investigador/resumen', async (req, res) => {
  const consolidated = await dbManager.getConsolidatedTable()
  const evalsDict = {}
  for (const item of consolidated) {
    evalsDict[item.dni] = await dbManager.getEvaluadorByDni(item.dni)
  }
  return res.json({
    success: true,
    totalInvitaciones: consolidated.length,
    totalEvaluacionesIniciadas: consolidated.filter(i => i.respondidas > 0).length,
    evaluacionesCompletadas: consolidated.filter(i => i.estado === "Completado" || i.respondidas >= 100).length,
    invitaciones: consolidated,
    evaluaciones: evalsDict
  })
})

// DOCX HANDLERS
const handleDescargarDocxHandler = async (req, res) => {
  try {
    const invites = await readTable('invitaciones', {})
    const evals = await readTable('evaluaciones', {})
    const perfil = await readTable('investigador', {})
    let preguntas = await readTable('preguntas', {})

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

const handleDescargarCronbachDocxHandler = async (req, res) => {
  try {
    const invites = await readTable('invitaciones', {})
    const evals = await readTable('evaluaciones', {})
    const perfil = await readTable('investigador', {})
    let preguntas = await readTable('preguntas', {})

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

// POST Editar Datos de Evaluador
app.post('/api/investigador/editar-evaluador', async (req, res) => {
  const { codigoTarget, datosEvaluador } = req.body
  if (!codigoTarget || !datosEvaluador) {
    return res.status(400).json({ success: false, mensaje: 'Faltan datos obligatorios' })
  }

  const cleanTarget = codigoTarget.trim().toUpperCase()
  const cleanDni = (datosEvaluador.dni || cleanTarget).trim().toUpperCase()

  if (cleanTarget !== cleanDni && cleanTarget.startsWith('EXP-')) {
    await dbManager.deleteEvaluador(cleanTarget)
  }

  const updated = await dbManager.upsertEvaluador(cleanDni, datosEvaluador)

  return res.json({
    success: true,
    mensaje: 'Perfil y datos del evaluador actualizados con éxito por el Investigador',
    evaluacion: updated,
    invitacion: updated
  })
})

app.get('/api/invitaciones', async (req, res) => {
  const result = await dbManager.getConsolidatedTable()
  return res.json({ success: true, invitaciones: result })
})

app.post('/api/invitaciones/crear', async (req, res) => {
  const { dni, nombreExperto, cargo, gradoAcademico, institucion, email } = req.body
  const cleanDni = (dni || '').trim().toUpperCase()
  if (!cleanDni) {
    return res.status(400).json({ success: false, mensaje: 'El DNI o Documento de Identidad del evaluador es obligatorio.' })
  }

  const newEvaluator = await dbManager.upsertEvaluador(cleanDni, {
    dni: cleanDni,
    nombre: nombreExperto || 'Experto Validador',
    nombreExperto: nombreExperto || 'Experto Validador',
    cargo,
    gradoAcademico,
    institucion,
    email
  })

  return res.json({ success: true, mensaje: 'Evaluador registrado con éxito', invitación: newEvaluator, evaluacion: newEvaluator })
})

app.delete('/api/invitaciones/:codigo', async (req, res) => {
  const { codigo } = req.params
  const cleanCode = (codigo || '').trim().toUpperCase()
  const deleted = await dbManager.deleteEvaluador(cleanCode)
  
  if (deleted) {
    return res.json({ success: true, mensaje: 'Evaluador o invitación eliminada correctamente' })
  }
  return res.status(404).json({ success: false, mensaje: 'Registro no encontrado' })
})

app.post('/api/evaluador/extranjero-codigo', (req, res) => {
  const randomExt = Math.floor(10000 + Math.random() * 90000)
  const codigoExtranjero = `EXT-${randomExt}`
  return res.json({ success: true, codigo: codigoExtranjero })
})

app.post('/api/evaluador/ingresar', async (req, res) => {
  const { codigo, dni } = req.body
  const cleanCode = (codigo || '').trim().toUpperCase()
  const cleanDni = (dni || '').trim().toUpperCase()

  let evalData = await dbManager.getEvaluadorByDni(cleanCode)
  if (!evalData && cleanDni) {
    evalData = await dbManager.getEvaluadorByDni(cleanDni)
  }
  
  if (!evalData && cleanDni) {
    evalData = await dbManager.upsertEvaluador(cleanDni, {
      dni: cleanDni,
      codigo: cleanCode || cleanDni,
      nombre: 'Experto Validador',
      nombreExperto: 'Experto Validador'
    })
  }

  return res.json({
    success: true,
    invitacion: evalData || { codigo: cleanCode || 'DIRECTO' },
    evaluacion: evalData
  })
})

app.get('/api/evaluacion/:key', async (req, res) => {
  const { key } = req.params
  const cleanKey = (key || '').trim().toUpperCase()
  const ev = await dbManager.getEvaluadorByDni(cleanKey)
  
  if (ev) {
    return res.json({ success: true, data: ev })
  }
  return res.json({ success: false, message: 'No encontrado' })
})

app.post('/api/evaluacion/save', async (req, res) => {
  const { codigo, payload } = req.body
  if (!codigo) {
    return res.status(400).json({ success: false, mensaje: 'Falta la clave de identificación' })
  }
  const cleanCode = codigo.trim().toUpperCase()
  
  // Como estamos usando la nueva arquitectura, vamos a usar upsertEvaluador de db_manager
  // En lugar de tocar evals e invites a mano
  let targetKey = cleanCode
  if (payload.inviteCode && payload.inviteCode.trim().toUpperCase().startsWith('EXP-')) {
    targetKey = payload.inviteCode.trim().toUpperCase()
  }

  const existingEval = await dbManager.getEvaluadorByDni(targetKey) || await dbManager.getEvaluadorByDni(cleanCode) || {}
  
  let finalNombre = (payload.nombre && payload.nombre !== "Experto Validador") ? payload.nombre : (existingEval.nombre || payload.nombre || "Experto Validador")
  let finalCargo = payload.cargo || existingEval.cargo || "Especialista Informante"
  let finalDni = payload.dni || existingEval.dni || cleanCode

  const isReset = payload.isNuevoRegistro || (payload.respuestas && Object.keys(payload.respuestas).length === 0)
  const mergedRespuestas = isReset ? (payload.respuestas || {}) : {
    ...(existingEval.respuestas || {}),
    ...(payload.respuestas || {})
  }

  const totalAnswered = Object.keys(mergedRespuestas).filter(k => {
    const r = mergedRespuestas[k]
    return r && (r.likert || r.claridad || r.coherencia || r.relevancia || r.suficiencia)
  }).length

  const nuevoEstado = (payload.finalizado || existingEval.finalizado || totalAnswered >= 100)

  const updatedPayload = {
    ...existingEval,
    ...payload,
    nombre: finalNombre,
    cargo: finalCargo,
    dni: finalDni,
    respuestas: mergedRespuestas,
    codigo: targetKey,
    inviteCode: targetKey,
    finalizado: nuevoEstado,
    lastUpdated: new Date().toISOString()
  }

  // Usamos el manager para guardar limpiamente
  const finalUpdated = await dbManager.upsertEvaluador(finalDni, updatedPayload)

  return res.json({ 
    success: true, 
    mensaje: 'Evaluación guardada correctamente', 
    data: finalUpdated,
    lastUpdated: finalUpdated.actualizadoEn,
    respondidas: finalUpdated.respondidas || totalAnswered,
    estado: finalUpdated.estado || (nuevoEstado ? "Completado" : "En Proceso")
  })
})

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
