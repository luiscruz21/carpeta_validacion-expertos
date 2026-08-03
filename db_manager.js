import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const IS_VERCEL = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
const DATA_DIR = IS_VERCEL ? '/tmp' : path.join(__dirname, 'db_data')
const BASE_DB_DIR = path.join(__dirname, 'db_data')

const T_INVESTIGADORES = path.join(DATA_DIR, 'tabla_investigadores.json')
const T_EVALUADORES = path.join(DATA_DIR, 'tabla_evaluadores.json')
const T_RESPUESTAS = path.join(DATA_DIR, 'tabla_evaluaciones_respuestas.json')
const T_HOJAS_VIDA = path.join(DATA_DIR, 'tabla_hojas_de_vida.json')

// Invalidador de caché para Vercel (Fuerza la copia de db_data a /tmp si hay nueva versión)
const CACHE_VERSION = 'v3-jorge-fix'
if (IS_VERCEL) {
  try {
    const versionFile = path.join(DATA_DIR, 'cache_version.txt')
    if (!fs.existsSync(versionFile) || fs.readFileSync(versionFile, 'utf-8') !== CACHE_VERSION) {
      if (fs.existsSync(BASE_DB_DIR)) {
        fs.cpSync(BASE_DB_DIR, DATA_DIR, { recursive: true, force: true })
      }
      fs.writeFileSync(versionFile, CACHE_VERSION)
      console.log('Vercel /tmp/ cache purgado y actualizado con la nueva base de datos.')
    }
  } catch (e) {
    console.error('Error invalidando caché de Vercel:', e)
  }
}

// Helper para lectura segura
const readTable = (filePath, defaultVal = {}) => {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    }
    const baseFile = path.join(BASE_DB_DIR, path.basename(filePath))
    if (fs.existsSync(baseFile)) {
      return JSON.parse(fs.readFileSync(baseFile, 'utf-8'))
    }
  } catch (e) {
    console.warn(`Error leyendo tabla ${filePath}:`, e.message)
  }
  return defaultVal
}

// Helper para escritura atómica en tmp y db_data/
const writeTable = (filePath, data) => {
  try {
    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (e) {
    console.warn(`Error escribiendo en ${filePath}:`, e.message)
  }

  try {
    const baseFile = path.join(BASE_DB_DIR, path.basename(filePath))
    if (baseFile !== filePath) {
      if (!fs.existsSync(BASE_DB_DIR)) {
        fs.mkdirSync(BASE_DB_DIR, { recursive: true })
      }
      fs.writeFileSync(baseFile, JSON.stringify(data, null, 2), 'utf-8')
    }
  } catch (e) {
    console.warn(`Error escribiendo base db_data/${path.basename(filePath)}:`, e.message)
  }
}

// Migración de datos legacy (evaluaciones.json e invitaciones.json)
export const initDataTables = () => {
  const evaluadores = readTable(T_EVALUADORES, {})
  const legacyInvs = readTable(path.join(DATA_DIR, 'invitaciones.json'), {})
  const legacyEvals = readTable(path.join(DATA_DIR, 'evaluaciones.json'), {})

  let changed = false

  // Migrar invitaciones y evaluaciones antiguas
  const allKeys = new Set([...Object.keys(legacyInvs), ...Object.keys(legacyEvals)])
  allKeys.forEach(key => {
    const inv = legacyInvs[key] || {}
    const ev = legacyEvals[key] || {}

    const dniCandidate = (inv.dni || ev.dni || key).trim().toUpperCase()
    const cleanDni = (dniCandidate && dniCandidate !== 'SIN REGISTRAR' && !dniCandidate.startsWith('EXP-')) ? dniCandidate : key.trim().toUpperCase()
    const fullNombre = (ev.nombre || inv.nombreExperto || "Experto Validador").trim()

    if (!evaluadores[cleanDni]) {
      evaluadores[cleanDni] = {
        dni: cleanDni,
        codigo: cleanDni,
        nombre: fullNombre,
        nombreExperto: fullNombre,
        nombresExperto: ev.nombresExperto || inv.nombresExperto || fullNombre.split(' ')[0] || fullNombre,
        apellidosExperto: ev.apellidosExperto || inv.apellidosExperto || fullNombre.split(' ').slice(1).join(' ') || "",
        cargo: ev.cargo || inv.cargo || "Especialista Informante",
        gradoAcademico: ev.gradoAcademico || inv.gradoAcademico || "Magíster",
        institucion: ev.institucion || ev.estudios || inv.institucion || "Universidad de Procedencia",
        email: ev.email || inv.email || "",
        creadoEn: inv.creadoEn || ev.creadoEn || new Date().toISOString(),
        estado: ev.finalizado ? 'Completado' : 'Pendiente'
      }
      changed = true
    }

    if (ev.respuestas && Object.keys(ev.respuestas).length > 0) {
      const respuestas = readTable(T_RESPUESTAS, {})
      respuestas[cleanDni] = {
        dni: cleanDni,
        respuestas: ev.respuestas,
        finalizado: !!ev.finalizado,
        actualizadoEn: new Date().toISOString()
      }
      writeTable(T_RESPUESTAS, respuestas)
    }

    if (ev.ctiVitae || ev.orcid || ev.linkedin || ev.cvFileName || ev.resumenProfesional || ev.experienciaDetallada) {
      const hojas = readTable(T_HOJAS_VIDA, {})
      hojas[cleanDni] = {
        dni: cleanDni,
        ctiVitae: ev.ctiVitae || "",
        orcid: ev.orcid || "",
        linkedin: ev.linkedin || "",
        cvFileName: ev.cvFileName || "",
        resumenProfesional: ev.resumenProfesional || "",
        experienciaDetallada: ev.experienciaDetallada || "",
        firmaExpertoImg: ev.firmaExpertoImg || ""
      }
      writeTable(T_HOJAS_VIDA, hojas)
    }
  })

  if (changed || !fs.existsSync(T_EVALUADORES)) {
    writeTable(T_EVALUADORES, evaluadores)
  }
}

// Inicializar tablas al importar
initDataTables()

// API DE TABLA DE EVALUADORES
export const getEvaluadorByDni = (dni) => {
  if (!dni) return null
  const cleanDni = dni.trim().toUpperCase()
  const evaluadores = readTable(T_EVALUADORES, {})
  const respuestas = readTable(T_RESPUESTAS, {})
  const hojas = readTable(T_HOJAS_VIDA, {})

  const ev = evaluadores[cleanDni] || Object.values(evaluadores).find(e => e.dni === cleanDni || e.codigo === cleanDni)
  if (!ev) return null

  const resObj = respuestas[ev.dni] || respuestas[cleanDni] || {}
  const hojaObj = hojas[ev.dni] || hojas[cleanDni] || {}

  return {
    ...ev,
    respuestas: resObj.respuestas || {},
    finalizado: !!resObj.finalizado,
    ...hojaObj
  }
}

export const upsertEvaluador = (dni, data) => {
  if (!dni) return null
  const cleanDni = dni.trim().toUpperCase()
  const evaluadores = readTable(T_EVALUADORES, {})

  const existing = evaluadores[cleanDni] || {}
  const fullNombre = (data.nombre || data.nombreExperto || existing.nombre || "Experto Validador").trim()
  const parts = fullNombre.split(' ')

  const updated = {
    ...existing,
    dni: cleanDni,
    codigo: cleanDni,
    nombre: fullNombre,
    nombreExperto: fullNombre,
    nombresExperto: (data.nombresExperto || existing.nombresExperto || parts[0] || fullNombre).trim(),
    apellidosExperto: (data.apellidosExperto || existing.apellidosExperto || parts.slice(1).join(' ') || "").trim(),
    cargo: (data.cargo || existing.cargo || "Especialista Informante").trim(),
    gradoAcademico: (data.gradoAcademico || existing.gradoAcademico || "Magíster").trim(),
    institucion: (data.institucion || data.estudios || existing.institucion || "Universidad de Procedencia").trim(),
    email: (data.email || existing.email || "").trim(),
    creadoEn: existing.creadoEn || new Date().toISOString(),
    actualizadoEn: new Date().toISOString()
  }

  // Eliminar cualquier entrada duplicada por nombre antiguo
  const normName = fullNombre.toLowerCase().replace(/^(dr\.|dra\.|ing\.|lic\.|mg\.)\s*/i, '').trim()
  Object.keys(evaluadores).forEach(k => {
    if (k === cleanDni) return
    const item = evaluadores[k]
    const itemNorm = (item.nombre || '').toLowerCase().replace(/^(dr\.|dra\.|ing\.|lic\.|mg\.)\s*/i, '').trim()
    if (itemNorm === normName && normName !== 'experto validador' && normName !== '') {
      delete evaluadores[k]
    }
  })

  evaluadores[cleanDni] = updated
  writeTable(T_EVALUADORES, evaluadores)

  if (data.respuestas) {
    saveRespuestas(cleanDni, data.respuestas, data.finalizado)
  }

  if (data.ctiVitae !== undefined || data.orcid !== undefined || data.linkedin !== undefined || data.cvFileName !== undefined || data.resumenProfesional !== undefined || data.experienciaDetallada !== undefined || data.firmaExpertoImg !== undefined) {
    saveHojaDeVida(cleanDni, data)
  }

  return getEvaluadorByDni(cleanDni)
}

export const saveRespuestas = (dni, respuestas, finalizado = false) => {
  if (!dni) return
  const cleanDni = dni.trim().toUpperCase()
  const tableResp = readTable(T_RESPUESTAS, {})

  tableResp[cleanDni] = {
    dni: cleanDni,
    respuestas: respuestas || {},
    finalizado: !!finalizado,
    actualizadoEn: new Date().toISOString()
  }

  writeTable(T_RESPUESTAS, tableResp)
}

export const saveHojaDeVida = (dni, cvData) => {
  if (!dni) return
  const cleanDni = dni.trim().toUpperCase()
  const tableHojas = readTable(T_HOJAS_VIDA, {})
  const existing = tableHojas[cleanDni] || {}

  tableHojas[cleanDni] = {
    ...existing,
    dni: cleanDni,
    ctiVitae: cvData.ctiVitae !== undefined ? cvData.ctiVitae : (existing.ctiVitae || ""),
    orcid: cvData.orcid !== undefined ? cvData.orcid : (existing.orcid || ""),
    linkedin: cvData.linkedin !== undefined ? cvData.linkedin : (existing.linkedin || ""),
    cvFileName: cvData.cvFileName !== undefined ? cvData.cvFileName : (existing.cvFileName || ""),
    resumenProfesional: cvData.resumenProfesional !== undefined ? cvData.resumenProfesional : (existing.resumenProfesional || ""),
    experienciaDetallada: cvData.experienciaDetallada !== undefined ? cvData.experienciaDetallada : (existing.experienciaDetallada || ""),
    firmaExpertoImg: cvData.firmaExpertoImg !== undefined ? cvData.firmaExpertoImg : (existing.firmaExpertoImg || ""),
    actualizadoEn: new Date().toISOString()
  }

  writeTable(T_HOJAS_VIDA, tableHojas)
}

export const deleteEvaluador = (dni) => {
  if (!dni) return false
  const cleanDni = dni.trim().toUpperCase()
  const evaluadores = readTable(T_EVALUADORES, {})
  const respuestas = readTable(T_RESPUESTAS, {})
  const hojas = readTable(T_HOJAS_VIDA, {})

  let deleted = false
  if (evaluadores[cleanDni]) {
    delete evaluadores[cleanDni]
    deleted = true
  }
  if (respuestas[cleanDni]) {
    delete respuestas[cleanDni]
    deleted = true
  }
  if (hojas[cleanDni]) {
    delete hojas[cleanDni]
    deleted = true
  }

  // Buscar por alias
  Object.keys(evaluadores).forEach(k => {
    if (evaluadores[k].dni === cleanDni || k === cleanDni) {
      delete evaluadores[k]
      deleted = true
    }
  })

  if (deleted) {
    writeTable(T_EVALUADORES, evaluadores)
    writeTable(T_RESPUESTAS, respuestas)
    writeTable(T_HOJAS_VIDA, hojas)
  }

  return deleted
}

export const getConsolidatedTable = () => {
  const evaluadores = readTable(T_EVALUADORES, {})
  const respuestas = readTable(T_RESPUESTAS, {})
  const result = []
  const seenDnis = new Set()
  const nameMap = new Map()

  Object.keys(evaluadores).forEach(dniKey => {
    const ev = evaluadores[dniKey]
    const cleanDni = ev.dni ? ev.dni.trim().toUpperCase() : dniKey.trim().toUpperCase()
    const normName = (ev.nombre || ev.nombreExperto || "").toLowerCase().replace(/^(dr\.|dra\.|ing\.|lic\.|mg\.)\s*/i, '').trim()

    const resObj = respuestas[cleanDni] || respuestas[dniKey] || {}
    const respuestasDict = resObj.respuestas || {}

    const totalAnswered = Object.keys(respuestasDict).filter(k => {
      const r = respuestasDict[k]
      return r && (r.likert || r.claridad || r.coherencia || r.relevancia || r.suficiencia)
    }).length

    const isFullyCompleted = cleanDni === '09091855' || resObj.finalizado || totalAnswered >= 100
    const estado = isFullyCompleted ? "Completado" : (totalAnswered > 0 ? "En Proceso" : "Pendiente")

    const item = {
      codigo: cleanDni,
      dni: cleanDni,
      nombreExperto: ev.nombre || ev.nombreExperto || "Experto Validador",
      nombre: ev.nombre || ev.nombreExperto || "Experto Validador",
      nombresExperto: ev.nombresExperto || "",
      apellidosExperto: ev.apellidosExperto || "",
      cargo: ev.cargo || "Especialista Informante",
      gradoAcademico: ev.gradoAcademico || "Magíster",
      institucion: ev.institucion || "Universidad de Procedencia",
      email: ev.email || "",
      creadoEn: ev.creadoEn || new Date().toISOString(),
      estado,
      respondidas: isFullyCompleted ? Math.max(totalAnswered, 100) : totalAnswered
    }

    if (normName !== 'experto validador' && nameMap.has(normName)) {
      const existingIdx = nameMap.get(normName)
      if (cleanDni && !cleanDni.startsWith('EXP-')) {
        result[existingIdx] = item
      }
      return
    }

    if (cleanDni === '09091855') return

    if (seenDnis.has(cleanDni)) return
    seenDnis.add(cleanDni)
    nameMap.set(normName, result.length)
    result.push(item)
  })

  return result
}

// PERFIL DEL INVESTIGADOR
export const getInvestigadorPerfil = () => {
  return readTable(T_INVESTIGADORES, {
    nombres: "Luis Alfonso",
    apellidos: "Cruz Gálvez",
    dni: "09091855",
    email: "luiscruz21@gmail.com",
    grado: "Doctor en Educación / Magíster en Ingeniería",
    tituloTesis: "Sistema Predictivo con Deep Learning para la Gestión de Riesgos en Proyectos de Infraestructura Pública registrados en INFOBRAS - Contraloría General de la República, Perú, 2020-2024",
    firmaImg: ""
  })
}

export const saveInvestigadorPerfil = (perfil) => {
  const current = getInvestigadorPerfil()
  const updated = {
    ...current,
    ...perfil,
    actualizadoEn: new Date().toISOString()
  }
  writeTable(T_INVESTIGADORES, updated)
  return updated
}
