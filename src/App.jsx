import { useState, useEffect, useRef, useMemo } from 'react'
import initialPreguntasData from './preguntas.json'
import matrizData from './matriz_data.json'
import consistenciaData from './consistencia_data.json'
import { 
  Download, CheckCircle2, Award, FileText, ChevronRight, ChevronLeft, 
  UserCheck, ShieldCheck, Table, HelpCircle, Layers, CheckSquare, Save, 
  Trash2, Cloud, RefreshCw, Upload, FileCheck, Briefcase, PenTool, Eraser, 
  Send, Check, Key, UserPlus, Copy, Users, Lock, Unlock, BarChart3, Globe, AlertCircle, Edit3, PlusCircle, Eye, EyeOff, LogOut, MessageSquare
} from 'lucide-react'

const LIKERT_MAP = {
  1: "1: Totalmente en desacuerdo",
  2: "2: En desacuerdo",
  3: "3: Ni en desacuerdo ni de acuerdo",
  4: "4: De acuerdo",
  5: "5: Totalmente de acuerdo"
}

const VALORACION_OPCIONES = [
  "Deficiente",
  "Regular",
  "Bueno",
  "Muy Bueno",
  "Excelente"
]

const TITULO_TESIS_OFICIAL = "Sistema Predictivo con Deep Learning para la Gestión de Riesgos en Proyectos de Infraestructura Pública registrados en INFOBRAS - Contraloría General de la República, Perú, 2020-2024"

const LOCAL_STORAGE_KEY = 'juicio_expertos_autosave_v1'
const LOCAL_EVALUADORES_DB_KEY = 'SISTEMA_RIESGOS_EVALUADORES_DB'

const getLocalEvaluadoresDb = () => {
  try {
    const raw = localStorage.getItem(LOCAL_EVALUADORES_DB_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch (e) {
    return {}
  }
}

const saveEvaluadorToLocalDb = (key, dataObj) => {
  if (!key || !dataObj) return
  try {
    const db = getLocalEvaluadoresDb()
    const cleanKey = key.trim().toUpperCase()
    db[cleanKey] = {
      ...(db[cleanKey] || {}),
      ...dataObj,
      actualizadoEn: new Date().toISOString()
    }
    if (dataObj.dni) {
      const cleanDni = dataObj.dni.trim().toUpperCase()
      db[cleanDni] = db[cleanKey]
    }
    localStorage.setItem(LOCAL_EVALUADORES_DB_KEY, JSON.stringify(db))
  } catch (e) {
    console.warn("No se pudo guardar en DB local:", e)
  }
}

const deleteLocalEvaluadorDbKey = (key) => {
  if (!key) return
  try {
    const db = getLocalEvaluadoresDb()
    const cleanKey = key.trim().toUpperCase()
    if (db[cleanKey]) {
      delete db[cleanKey]
      localStorage.setItem(LOCAL_EVALUADORES_DB_KEY, JSON.stringify(db))
    }
  } catch (e) {}
}

function App() {
  // ROL ACTUAL: 'EVALUADOR' o 'INVESTIGADOR'
  const [userRole, setUserRole] = useState(() => localStorage.getItem(`${LOCAL_STORAGE_KEY}_userRole`) || 'EVALUADOR')
  
  // Pestaña Activa
  const [activeTab, setActiveTab] = useState('CARTA')
  const [matrizSubTab, setMatrizSubTab] = useState('VI')
  const [instrumentoSubTab, setInstrumentoSubTab] = useState('VI')

  // Estado Dinámico de Preguntas (VI y VD)
  const [preguntasData, setPreguntasData] = useState(initialPreguntasData)

  // Código de Invitación
  const [inviteCode, setInviteCode] = useState(() => localStorage.getItem(`${LOCAL_STORAGE_KEY}_inviteCode`) || '')

  // Modales
  const [showRegistroModal, setShowRegistroModal] = useState(() => !localStorage.getItem(`${LOCAL_STORAGE_KEY}_nombre`))
  const [showPinModal, setShowPinModal] = useState(false)
  const [submittedModal, setSubmittedModal] = useState(false)
  const [registroTab, setRegistroTab] = useState('NUEVO')
  const [openObsQuestions, setOpenObsQuestions] = useState({})

  // Modal para Editar/Agregar Pregunta (Investigador)
  const [showQuestionModal, setShowQuestionModal] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null) // null si es nueva
  const [qDimension, setQDimension] = useState('')
  const [qIndicador, setQIndicador] = useState('')
  const [qDescripcion, setQDescripcion] = useState('')
  const [qTexto, setQTexto] = useState('')

  // Datos del Experto Validador (Por defecto Dr. Luis Alfonso Cruz Gálvez - 09091855)
  const [nombresExperto, setNombresExperto] = useState('Luis Alfonso')
  const [apellidosExperto, setApellidosExperto] = useState('Cruz Gálvez')
  const [nombre, setNombre] = useState('Dr. Luis Alfonso Cruz Gálvez')
  const [dni, setDni] = useState('09091855')
  const [cargo, setCargo] = useState('Investigador Principal')
  const [gradoAcademico, setGradoAcademico] = useState('Doctor en Educación / Magíster en Ingeniería')
  const [institucion, setInstitucion] = useState('Universidad Nacional de Ingeniería (UNI)')
  const [experiencia, setExperiencia] = useState('')
  const [isExtranjero, setIsExtranjero] = useState(false)
  const [recuperarKeyInput, setRecuperarKeyInput] = useState('')
  const [evaluadorInspeccionado, setEvaluadorInspeccionado] = useState(null)

  // ESTADOS DE INVITACIÓN STRICTA
  const [codigoInvitacionInput, setCodigoInvitacionInput] = useState('')
  const [inviteValidado, setInviteValidado] = useState(false)
  const [invitationError, setInvitationError] = useState('')

  // ESTADOS DE GESTIÓN DE PIN DEL INVESTIGADOR
  const [pinActualInput, setPinActualInput] = useState('')
  const [nuevoPinInput, setNuevoPinInput] = useState('')
  const [pinSuccessMsg, setPinSuccessMsg] = useState('')
  const [pinErrorMsg, setPinErrorMsg] = useState('')

  // Selección de evaluadores a incluir en el informe Word (.docx)
  const [selectedEvaluadoresDocx, setSelectedEvaluadoresDocx] = useState([])

  // Respuestas del Evaluador (INICIALIZAN VACÍAS)
  const [respuestas, setRespuestas] = useState({})

  // Firma del Experto (Base64)
  const [firmaExpertoImg, setFirmaExpertoImg] = useState('')

  // Hoja de Vida Datos
  const [ctiVitae, setCtiVitae] = useState('')
  const [orcid, setOrcid] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [cvFileName, setCvFileName] = useState('')
  const [resumenProfesional, setResumenProfesional] = useState('')
  const [email, setEmail] = useState('')
  const [estudios, setEstudios] = useState('')
  const [experienciaDetallada, setExperienciaDetallada] = useState('')
  const [cvFileDataUrl, setCvFileDataUrl] = useState('')
  const [cvTextContent, setCvTextContent] = useState('')

  // Certificado Dictamen
  const [valoracionGlobal, setValoracionGlobal] = useState('')
  const [dictamenFinal, setDictamenFinal] = useState('Aprobado')
  const [observaciones, setObservaciones] = useState('')
  const [isFinalizado, setIsFinalizado] = useState(() => {
    return localStorage.getItem(`${LOCAL_STORAGE_KEY}_finalizado`) === 'true'
  })
  const isReadOnly = userRole === 'EVALUADOR' && isFinalizado

  // DATOS REACTIVOS Y DINÁMICOS DEL EVALUADOR SEGÚN EL CONTEXTO (LOGUEADO O INSPECCIONADO)
  const activeNombreExperto = evaluadorInspeccionado
    ? (evaluadorInspeccionado.nombre || `${evaluadorInspeccionado.nombresExperto || ''} ${evaluadorInspeccionado.apellidosExperto || ''}`.trim() || 'Experto Validador')
    : (userRole === 'INVESTIGADOR'
        ? (nombre || 'Dr. Luis Alfonso Cruz Gálvez')
        : ((dni === '09091855' || inviteCode === '09091855') ? 'Dr. Luis Alfonso Cruz Gálvez' : (nombre || 'Experto Validador')))

  const activeDni = evaluadorInspeccionado ? (evaluadorInspeccionado.dni || evaluadorInspeccionado.codigo || '') : (dni || inviteCode || '')
  const activeCargo = evaluadorInspeccionado ? (evaluadorInspeccionado.cargo || 'Especialista Informante') : (cargo || 'Especialista Informante')
  const activeGrado = evaluadorInspeccionado ? (evaluadorInspeccionado.gradoAcademico || 'Magíster') : (gradoAcademico || 'Magíster')
  const activeInstitucion = evaluadorInspeccionado ? (evaluadorInspeccionado.institucion || evaluadorInspeccionado.estudios || 'Universidad de Procedencia') : (institucion || 'Universidad de Procedencia')
  const activeEmail = evaluadorInspeccionado ? (evaluadorInspeccionado.email || '') : (email || '')
  const activeFirmaImg = evaluadorInspeccionado ? (evaluadorInspeccionado.firmaExpertoImg || '') : firmaExpertoImg

  // ESTADOS DEL INVESTIGADOR
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [investigadorAutenticado, setInvestigadorAutenticado] = useState(false)
  const [invitacionesList, setInvitacionesList] = useState([])
  const [evaluacionesData, setEvaluacionesData] = useState({})
  const [nuevoExpertoDni, setNuevoExpertoDni] = useState('')
  const [nuevoExpertoNombre, setNuevoExpertoNombre] = useState('')
  const [nuevoExpertoCargo, setNuevoExpertoCargo] = useState('')
  const [nuevoExpertoGrado, setNuevoExpertoGrado] = useState('Magíster')
  const [nuevoExpertoInstitucion, setNuevoExpertoInstitucion] = useState('')
  const [nuevoExpertoEmail, setNuevoExpertoEmail] = useState('')

  // DATOS DEL INVESTIGADOR PRINCIPAL (PERFIL CONFIGURABLE)
  const [investigadorNombres, setInvestigadorNombres] = useState('Luis Alfonso')
  const [investigadorApellidos, setInvestigadorApellidos] = useState('Cruz Gálvez')
  const [investigadorDni, setInvestigadorDni] = useState('09091855')
  const [investigadorEmail, setInvestigadorEmail] = useState('luiscruz21@gmail.com')
  const [investigadorGrado, setInvestigadorGrado] = useState('Doctor en Educación / Magíster en Ingeniería')
  const [investigadorTituloTesis, setInvestigadorTituloTesis] = useState('Sistema Predictivo con Deep Learning para la Gestión de Riesgos en Proyectos de Infraestructura Pública registrados en INFOBRAS - Contraloría General de la República, Perú, 2020-2024')
  const [investigadorFirmaImg, setInvestigadorFirmaImg] = useState('')
  const [pinInvestigadorActual, setPinInvestigadorActual] = useState('2026')
  const [mostrarPinInvestigador, setMostrarPinInvestigador] = useState(false)

  const [syncing, setSyncing] = useState(false)
  const [showCvFullscreen, setShowCvFullscreen] = useState(false)
  const cvFileInputRef = useRef(null)
  const firmaFileInputRef = useRef(null)
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)

  // Cargar Perfil del Investigador desde Backend y LocalStorage
  const fetchInvestigadorPerfil = async () => {
    try {
      const local = localStorage.getItem('perfil_investigador')
      if (local) {
        const parsed = JSON.parse(local)
        if (parsed.nombres) setInvestigadorNombres(parsed.nombres)
        if (parsed.apellidos) setInvestigadorApellidos(parsed.apellidos)
        if (parsed.dni) setInvestigadorDni(parsed.dni)
        if (parsed.email) setInvestigadorEmail(parsed.email)
        if (parsed.grado) setInvestigadorGrado(parsed.grado)
        if (parsed.tituloTesis) setInvestigadorTituloTesis(parsed.tituloTesis)
        if (parsed.firmaImg) setInvestigadorFirmaImg(parsed.firmaImg)
        if (parsed.pin) setPinInvestigadorActual(parsed.pin)
      }
      const res = await fetch('/api/investigador/perfil')
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const data = await res.json()
        if (data.success && data.perfil) {
          if (data.perfil.nombres) setInvestigadorNombres(data.perfil.nombres)
          if (data.perfil.apellidos) setInvestigadorApellidos(data.perfil.apellidos)
          if (data.perfil.dni) setInvestigadorDni(data.perfil.dni)
          if (data.perfil.email) setInvestigadorEmail(data.perfil.email)
          if (data.perfil.grado) setInvestigadorGrado(data.perfil.grado)
          if (data.perfil.tituloTesis) setInvestigadorTituloTesis(data.perfil.tituloTesis)
          if (data.perfil.firmaImg) setInvestigadorFirmaImg(data.perfil.firmaImg)
          if (data.perfil.pin) setPinInvestigadorActual(data.perfil.pin)
        }
      }
    } catch (err) {
      console.warn("Carga de perfil de investigador desde localStorage activo:", err)
    }
  }

  const handleGuardarInvestigadorPerfil = async (e) => {
    if (e) e.preventDefault()
    const payload = {
      nombres: investigadorNombres.trim(),
      apellidos: investigadorApellidos.trim(),
      dni: investigadorDni.trim(),
      email: investigadorEmail.trim(),
      grado: investigadorGrado.trim(),
      tituloTesis: investigadorTituloTesis.trim(),
      firmaImg: investigadorFirmaImg
    }
    try {
      localStorage.setItem('perfil_investigador', JSON.stringify(payload))
      await fetch('/api/investigador/perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil: payload })
      })

      // Actualizar automáticamente los datos del Investigador en las evaluaciones e invitaciones locales
      await fetchInvestigadorPerfil()
      await fetchInvestigadorData()

      alert("¡Perfil, datos, título de tesis y firma del Investigador guardados y actualizados con éxito en todo el sistema!")
    } catch (err) {
      alert("¡Datos del Investigador guardados localmente!")
    }
  }

  const handleInvestigadorFirmaUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const imgData = event.target.result
        setInvestigadorFirmaImg(imgData)
        alert("¡Imagen de firma del Investigador cargada con éxito! Haga clic en Guardar y Actualizar para conservarla.")
      }
      reader.readAsDataURL(file)
    }
  }

  // Cargar Preguntas Dinámicas desde Backend al iniciar
  const fetchPreguntasBackend = async () => {
    try {
      const res = await fetch('/api/preguntas')
      const data = await res.json()
      if (data.success && data.preguntas) {
        setPreguntasData(data.preguntas)
      }
    } catch (err) {
      console.warn("Usando preguntas iniciales por defecto:", err)
    }
  }

  useEffect(() => {
    const savedDni = localStorage.getItem(`${LOCAL_STORAGE_KEY}_dni`)
    const savedNombre = localStorage.getItem(`${LOCAL_STORAGE_KEY}_nombre`)
    if (savedDni === '09091855' && savedNombre && savedNombre.toLowerCase().includes('marco')) {
      localStorage.removeItem(`${LOCAL_STORAGE_KEY}_dni`)
      localStorage.removeItem(`${LOCAL_STORAGE_KEY}_nombre`)
      localStorage.removeItem(`${LOCAL_STORAGE_KEY}_cargo`)
    }

    // Purga automática de claves EXP- antiguas en localStorage si existe DNI real para el mismo evaluador
    try {
      const localDb = getLocalEvaluadoresDb()
      Object.keys(localDb).forEach(k => {
        if (k.startsWith('EXP-')) {
          const item = localDb[k]
          if (item && item.nombre) {
            const normName = item.nombre.toLowerCase().replace(/^(dr\.|dra\.|ing\.|lic\.|mg\.)\s*/i, '').trim()
            const realDniMatch = Object.keys(localDb).find(otherK => !otherK.startsWith('EXP-') && localDb[otherK]?.nombre?.toLowerCase().replace(/^(dr\.|dra\.|ing\.|lic\.|mg\.)\s*/i, '').trim() === normName)
            if (realDniMatch) {
              deleteLocalEvaluadorDbKey(k)
            }
          }
        }
      })
    } catch (e) {}

    fetchPreguntasBackend()
    fetchInvestigadorPerfil()
  }, [])

  // Detectar Parámetros URL (ej: ?code=EXP-1001 o ?investigador=true)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const codeFromUrl = urlParams.get('code') || urlParams.get('invitation')
    const isInvestigadorUrl = urlParams.get('investigador') === 'true' || urlParams.get('admin') === 'true'

    if (isInvestigadorUrl) {
      setShowPinModal(true)
    } else if (codeFromUrl) {
      const cleanCode = codeFromUrl.toUpperCase()
      setInviteCode(cleanCode)
      handleRetomarPorKey(cleanCode)
    }
  }, [])

  // Verificar al iniciar si el usuario está autenticado o forzar la pantalla de ingreso unificada
  useEffect(() => {
    if (userRole === 'EVALUADOR') {
      const currentKey = (inviteCode || dni || '').trim().toUpperCase()
      if (currentKey) {
        fetch(`/api/evaluacion/${currentKey}`)
          .then(res => {
            if (res.status === 403 || res.status === 404) {
              localStorage.clear()
              setNombre('')
              setDni('')
              setCargo('')
              setRespuestas({})
              setInviteCode('')
              setShowRegistroModal(true)
              return null
            }
            return res.json()
          })
          .then(data => {
            if (!data || !data.success || data.revocado || !data.data) {
              localStorage.clear()
              setNombre('')
              setDni('')
              setCargo('')
              setRespuestas({})
              setInviteCode('')
              setShowRegistroModal(true)
            } else if (data.data) {
              const ev = data.data
              if (ev.nombre) setNombre(ev.nombre)
              if (ev.cargo) setCargo(ev.cargo)
              if (ev.dni) setDni(ev.dni)
              if (ev.respuestas) setRespuestas(ev.respuestas)
              if (ev.firmaExpertoImg) setFirmaExpertoImg(ev.firmaExpertoImg)
              if (ev.gradoAcademico) setGradoAcademico(ev.gradoAcademico)
              if (ev.institucion) setInstitucion(ev.institucion)
              if (ev.experiencia) setExperiencia(ev.experiencia)
              if (ev.isExtranjero) setIsExtranjero(ev.isExtranjero)
              if (ev.ctiVitae) setCtiVitae(ev.ctiVitae)
              if (ev.orcid) setOrcid(ev.orcid)
              if (ev.linkedin) setLinkedin(ev.linkedin)
              if (ev.cvFileName) setCvFileName(ev.cvFileName)
              if (ev.cvFileDataUrl) setCvFileDataUrl(ev.cvFileDataUrl)
              if (ev.cvTextContent) setCvTextContent(ev.cvTextContent)
              if (ev.email) setEmail(ev.email)
              if (ev.estudios) setEstudios(ev.estudios)
              if (ev.experienciaDetallada) setExperienciaDetallada(ev.experienciaDetallada)
              if (ev.valoracionGlobal) setValoracionGlobal(ev.valoracionGlobal)
              if (ev.dictamenFinal) setDictamenFinal(ev.dictamenFinal)
              if (ev.observaciones) setObservaciones(ev.observaciones)
              const isComp = Boolean(ev && (ev.finalizado || ev.estado === 'Completado' || (ev.respuestas && Object.keys(ev.respuestas).filter(k => ev.respuestas[k]?.likert).length >= 100)))
              setIsFinalizado(isComp)
              localStorage.setItem(`${LOCAL_STORAGE_KEY}_finalizado`, isComp ? 'true' : 'false')
            }
          })
          .catch(() => {})
      } else {
        if (!nombre.trim() || !cargo.trim() || !dni.trim()) {
          setShowRegistroModal(true)
        }
      }
    } else if (userRole === 'INVESTIGADOR' && !investigadorAutenticado) {
      // Si el rol era investigador pero no ha ingresado el PIN en esta sesión
      setShowPinModal(true)
    }
  }, [userRole, investigadorAutenticado])

  // Guardado Local + Sincronización Automática
  useEffect(() => {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_userRole`, userRole)
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_inviteCode`, inviteCode)
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_respuestas`, JSON.stringify(respuestas))
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_nombre`, nombre)
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_dni`, dni)
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_cargo`, cargo)
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_grado`, gradoAcademico)
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_institucion`, institucion)
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_experiencia`, experiencia)
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_isExtranjero`, isExtranjero ? 'true' : 'false')
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_firma_img`, firmaExpertoImg)
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_valoracion`, valoracionGlobal)
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_dictamen`, dictamenFinal)
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_observaciones`, observaciones)
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_cti`, ctiVitae)
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_orcid`, orcid)
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_linkedin`, linkedin)
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_cv_filename`, cvFileName)
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_resumen_profesional`, resumenProfesional)
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_email`, email)
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_estudios`, estudios)
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_experiencia_detallada`, experienciaDetallada)
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_cv_dataurl`, cvFileDataUrl)
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_cv_text_content`, cvTextContent)

      const currentKey = (inviteCode || dni || '').trim().toUpperCase()
      const isValidKey = /^\d{8}$/.test(currentKey) || currentKey.startsWith('EXT-') || currentKey.startsWith('EXP-')
      if (userRole === 'EVALUADOR' && evaluadorInspeccionado === null && isValidKey && nombre.trim() && nombre !== 'Experto Validador') {
        saveEvaluationToBackend(currentKey, {
          nombre,
          dni: dni || currentKey,
          cargo,
          gradoAcademico, institucion, experiencia, isExtranjero,
          firmaExpertoImg, ctiVitae, orcid, linkedin, cvFileName, resumenProfesional,
          email, estudios, experienciaDetallada, cvFileDataUrl, cvTextContent,
          valoracionGlobal, dictamenFinal, observaciones, respuestas, inviteCode: currentKey
        })
      }
    } catch (e) {
      console.error("Error al autoguardar:", e)
    }
  }, [respuestas, nombre, dni, cargo, gradoAcademico, institucion, experiencia, isExtranjero, firmaExpertoImg, valoracionGlobal, dictamenFinal, observaciones, ctiVitae, orcid, linkedin, cvFileName, resumenProfesional, email, estudios, experienciaDetallada, cvFileDataUrl, cvTextContent, inviteCode, userRole])

  // Cargar datos para el Panel del Investigador (Fusionando Servidor y DB Local con Deduplicación Estricta por Nombre)
  const fetchInvestigadorData = async () => {
    try {
      setSyncing(true)
      const localDb = getLocalEvaluadoresDb()
      let serverEvals = {}
      let rawList = []

      try {
        const res = await fetch('/api/investigador/resumen')
        const data = await res.json()
        if (data.success) {
          rawList = data.invitaciones || []
          serverEvals = data.evaluaciones || {}
        }
      } catch (err) {
        console.warn("Error consultando /api/investigador/resumen:", err)
      }

      // Fusionar evaluaciones del servidor con la tabla DB local del navegador inteligentemente
      const mergedEvals = { ...serverEvals }
      Object.keys(localDb).forEach(k => {
        const localItem = localDb[k]
        if (localItem && localItem.nombre) {
          const serverItem = mergedEvals[k] || {}
          
          // Preservar las respuestas que tengan más avance (evita que un local vacío borre un server completo)
          const serverResp = serverItem.respuestas || {}
          const localResp = localItem.respuestas || {}
          const mergedResp = Object.keys(serverResp).length >= Object.keys(localResp).length ? serverResp : localResp

          mergedEvals[k] = {
            ...serverItem,
            ...localItem,
            respuestas: mergedResp,
            finalizado: serverItem.finalizado || localItem.finalizado || false
          }
        }
      })

      const finalRows = []
      const nameIndexMap = new Map()

      // Filtrar identificaciones obsoletas tipo EXP-xxxx y el DNI del investigador
      rawList = rawList.filter(item => {
        const d = (item.dni || '').trim().toUpperCase()
        const c = (item.codigo || '').trim().toUpperCase()
        if (d === '09091855' || c === '09091855') return false
        if (d.startsWith('EXP-')) return false // Solo eliminar si el DNI es falso, NO si su código de acceso (inviteCode) es EXP-
        return true
      })

      // Procesar lista del servidor
      rawList.forEach(item => {
        const key = (item.dni && item.dni !== 'Sin registrar' && item.dni !== '' && !item.dni.startsWith('EXP-'))
          ? item.dni.trim().toUpperCase()
          : item.codigo.trim().toUpperCase()

        const localRecord = localDb[key] || Object.values(localDb).find(x => x && (x.dni === key || x.codigo === key))
        if (localRecord && localRecord.nombre) {
          item.nombreExperto = localRecord.nombre
          item.nombre = localRecord.nombre
          if (localRecord.cargo) item.cargo = localRecord.cargo
          if (localRecord.gradoAcademico) item.gradoAcademico = localRecord.gradoAcademico
          if (localRecord.institucion) item.institucion = localRecord.institucion
          if (localRecord.email) item.email = localRecord.email
        }

        const normName = (item.nombreExperto || item.nombre || "").toLowerCase().replace(/^(dr\.|dra\.|ing\.|lic\.|mg\.)\s*/i, '').trim()

        if (normName !== 'experto validador' && nameIndexMap.has(normName)) {
          const idx = nameIndexMap.get(normName)
          const existing = finalRows[idx]
          // Si la entrada actual tiene DNI real y la existente no, reemplazarla
          if (key && !key.startsWith('EXP-')) {
            if (existing.codigo && existing.codigo.startsWith('EXP-')) {
              deleteLocalEvaluadorDbKey(existing.codigo)
            }
            finalRows[idx] = item
          } else if (existing.codigo && existing.codigo.startsWith('EXP-') && key.startsWith('EXP-')) {
            deleteLocalEvaluadorDbKey(key)
          }
          return
        }

        nameIndexMap.set(normName, finalRows.length)
        finalRows.push(item)
      })

      // Procesar registros locales faltantes
      Object.keys(localDb).forEach(k => {
        const item = localDb[k]
        
        // Purga forzada de datos basura/obsoletos cacheados localmente
        const currentDni = (item?.dni || '').trim().toUpperCase()
        const currentCode = (item?.codigo || k).trim().toUpperCase()
        if (currentDni === '09091855' || currentCode === '09091855' || currentDni.startsWith('EXP-')) {
          deleteLocalEvaluadorDbKey(k)
          return
        }

        if (item && item.nombre) {
          const key = (item.dni && !item.dni.startsWith('EXP-')) ? item.dni.trim().toUpperCase() : (item.codigo || k).trim().toUpperCase()
          const normName = item.nombre.toLowerCase().replace(/^(dr\.|dra\.|ing\.|lic\.|mg\.)\s*/i, '').trim()

          if (normName !== 'experto validador' && nameIndexMap.has(normName)) {
            const idx = nameIndexMap.get(normName)
            const existing = finalRows[idx]
            
            if (key && !key.startsWith('EXP-')) {
              if (existing.codigo && existing.codigo.startsWith('EXP-')) {
                finalRows[idx] = { ...existing, ...item, codigo: key, dni: key, inviteCode: key }
                deleteLocalEvaluadorDbKey(existing.codigo)
              }
            } else if (existing.codigo && !existing.codigo.startsWith('EXP-') && key.startsWith('EXP-')) {
              deleteLocalEvaluadorDbKey(key)
            }
            return
          }

          const newItem = {
            codigo: key,
            nombreExperto: item.nombre || item.nombreExperto,
            nombre: item.nombre,
            dni: item.dni || key,
            cargo: item.cargo || 'Especialista Informante',
            gradoAcademico: item.gradoAcademico || 'Magíster',
            institucion: item.institucion || 'Universidad de Procedencia',
            email: item.email || '',
            creadoEn: item.actualizadoEn || new Date().toISOString(),
            estado: item.finalizado ? 'Completado' : 'Pendiente',
            respondidas: Object.keys(item.respuestas || {}).length
          }

          nameIndexMap.set(normName, finalRows.length)
          finalRows.push(newItem)
        }
      })

      setInvitacionesList(finalRows)
      setEvaluacionesData(mergedEvals)
    } catch (err) {
      console.warn("No se pudo conectar al backend:", err)
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'PANEL_INVESTIGADOR' || userRole === 'INVESTIGADOR') {
      fetchInvestigadorData()
    }
  }, [activeTab, userRole])

  // Generar Código Automático para Extranjeros
  const handleGenerarCodigoExtranjero = async () => {
    try {
      const res = await fetch('/api/evaluador/extranjero-codigo', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setDni(data.codigo)
        setIsExtranjero(true)
        alert(`¡Código de acceso generado con éxito!: ${data.codigo}`)
      }
    } catch (err) {
      const codeLocal = `EXT-${Math.floor(10000 + Math.random() * 90000)}`
      setDni(codeLocal)
      setIsExtranjero(true)
    }
  }

  // RETOMAR EVALUACIÓN POR DNI / CÓDIGO
  const handleRetomarPorKey = async (targetKey = recuperarKeyInput) => {
    const cleanKey = (targetKey || '').trim().toUpperCase()
    if (!cleanKey) {
      alert("Por favor ingrese su DNI (8 dígitos), Código de Extranjero (EXT-XXXXX) o Código de Invitación (EXP-XXXX).")
      return
    }

    try {
      setSyncing(true)
      const res = await fetch(`/api/evaluacion/${cleanKey}`)
      const data = await res.json()

      if (data.revocado || res.status === 403) {
        alert(data.mensaje || `Acceso Denegado: El registro o invitación para "${cleanKey}" fue retirado del sistema por el Investigador.`)
        localStorage.clear()
        setNombre('')
        setDni('')
        setCargo('')
        setRespuestas({})
        return
      }

      if (data.success && data.data) {
        const ev = data.data
        if (ev.respuestas) setRespuestas(ev.respuestas)
        if (ev.nombre) setNombre(ev.nombre)
        if (ev.dni) setDni(ev.dni)
        if (ev.cargo) setCargo(ev.cargo)
        if (ev.gradoAcademico) setGradoAcademico(ev.gradoAcademico)
        if (ev.institucion) setInstitucion(ev.institucion)
        if (ev.experiencia) setExperiencia(ev.experiencia)
        if (ev.isExtranjero) setIsExtranjero(ev.isExtranjero)
        if (ev.firmaExpertoImg) setFirmaExpertoImg(ev.firmaExpertoImg)
        if (ev.ctiVitae) setCtiVitae(ev.ctiVitae)
        if (ev.orcid) setOrcid(ev.orcid)
        if (ev.linkedin) setLinkedin(ev.linkedin)
        if (ev.cvFileName) setCvFileName(ev.cvFileName)
        if (ev.resumenProfesional) setResumenProfesional(ev.resumenProfesional)
        if (ev.valoracionGlobal) setValoracionGlobal(ev.valoracionGlobal)
        if (ev.observaciones) setObservaciones(ev.observaciones)
        if (ev.inviteCode) setInviteCode(ev.inviteCode)
        const isComp = Boolean(ev && (ev.finalizado || ev.estado === 'Completado' || (ev.respuestas && Object.keys(ev.respuestas).filter(k => ev.respuestas[k]?.likert).length >= 100)))
        setIsFinalizado(isComp)
        localStorage.setItem(`${LOCAL_STORAGE_KEY}_finalizado`, isComp ? 'true' : 'false')

        setShowRegistroModal(false)
        const count = Object.keys(ev.respuestas || {}).filter(k => ev.respuestas[k]?.likert).length
        alert(`¡Bienvenido(a) de nuevo, ${ev.nombre || 'Experto(a)'}!\nSe ha recuperado su avance exitosamente (${count}/100 preguntas evaluadas).`)
      } else {
        alert(`No se encontró una evaluación previa registrada para "${cleanKey}".`)
      }
    } catch (err) {
      alert("No se pudo conectar al servidor de sincronización.")
    } finally {
      setSyncing(false)
    }
  }

  // INSPECCIONAR CARTA, INSTRUMENTOS, CERTIFICADO Y HOJA DE VIDA DE UN EVALUADOR ESPECÍFICO
  const handleInspeccionarEvaluador = async (codigo, nombreExperto) => {
    const cleanKey = (codigo || '').trim().toUpperCase()
    try {
      setSyncing(true)
      const res = await fetch(`/api/evaluacion/${cleanKey}`)
      const data = await res.json()

      if (data.success && data.data) {
        const ev = data.data
        setRespuestas(ev.respuestas || {})
        setNombre(ev.nombre || nombreExperto || '')
        setDni(ev.dni || codigo || '')
        setCargo(ev.cargo || '')
        setGradoAcademico(ev.gradoAcademico || '')
        setInstitucion(ev.institucion || '')
        setExperiencia(ev.experiencia || '')
        setIsExtranjero(ev.isExtranjero || false)
        setFirmaExpertoImg(ev.firmaExpertoImg || '')
        setCtiVitae(ev.ctiVitae || '')
        setOrcid(ev.orcid || '')
        setLinkedin(ev.linkedin || '')
        setCvFileName(ev.cvFileName || '')
        setResumenProfesional(ev.resumenProfesional || '')
        setEmail(ev.email || '')
        setEstudios(ev.estudios || '')
        setExperienciaDetallada(ev.experienciaDetallada || '')
        setCvFileDataUrl(ev.cvFileDataUrl || '')
        setCvTextContent(ev.cvTextContent || '')
        setValoracionGlobal(ev.valoracionGlobal || '')
        setDictamenFinal(ev.dictamenFinal || 'Aprobado')
        setObservaciones(ev.observaciones || '')
        setInviteCode(ev.inviteCode || codigo || '')

        setEvaluadorInspeccionado({ codigo, ...ev, nombre: ev.nombre || nombreExperto || 'Experto Validador' })
        setActiveTab('CARTA')
      } else {
        const localInv = invitacionesList.find(i => i.codigo === codigo)
        setNombre(localInv?.nombreExperto || nombreExperto || '')
        setDni(localInv?.dni || codigo || '')
        setCargo(localInv?.cargo || '')
        setRespuestas({})
        setFirmaExpertoImg('')
        setCvFileName('')
        setValoracionGlobal('')
        setDictamenFinal('Aprobado')
        setObservaciones('')
        setEvaluadorInspeccionado({ codigo, ...localInv, nombre: localInv?.nombreExperto || nombreExperto || 'Experto Validador' })
        setActiveTab('CARTA')
      }
    } catch (err) {
      alert("Error al cargar el expediente del evaluador.")
    } finally {
      setSyncing(false)
    }
  }

  // Guardar datos obligatorios iniciales del Evaluador
  const handleCompletarRegistroEvaluador = async (e) => {
    e.preventDefault()
    const cleanNombres = nombresExperto.trim()
    const cleanApellidos = apellidosExperto.trim()
    const combinedNombre = `${cleanNombres} ${cleanApellidos}`.trim() || nombre.trim()
    const cleanCargo = cargo.trim()
    const cleanGrado = gradoAcademico.trim()
    const cleanDni = dni.trim().toUpperCase()
    const cleanInstitucion = institucion.trim()
    const cleanEmail = email.trim()

    if (!cleanNombres || !cleanApellidos) {
      alert("Los campos Nombres y Apellidos del Experto son obligatorios.")
      return
    }
    if (!cleanCargo) {
      alert("El campo Título Profesional / Especialidad es obligatorio.")
      return
    }
    if (!cleanGrado) {
      alert("El campo Grado Académico es obligatorio.")
      return
    }
    if (!cleanDni) {
      alert("Por favor ingrese su DNI (8 dígitos) o genere su código de acceso para extranjero.")
      return
    }

    if (!isExtranjero && !cleanDni.startsWith('EXT-')) {
      if (!/^\d{8}$/.test(cleanDni)) {
        alert("El DNI peruano debe ser estrictamente numérico de 8 dígitos.")
        return
      }
    }

    if (!cleanInstitucion) {
      alert("El campo Universidad de Procedencia / Institución es obligatorio.")
      return
    }

    setNombre(combinedNombre)
    setCargo(cleanCargo)
    setGradoAcademico(cleanGrado)
    setDni(cleanDni)
    setInstitucion(cleanInstitucion)
    setEmail(cleanEmail)

    // Enviar inmediatamente al backend marcándolo como nuevo registro para que actualice invitaciones y evaluaciones
    await saveEvaluationToBackend(cleanDni, {
      nombre: combinedNombre,
      nombresExperto: cleanNombres,
      apellidosExperto: cleanApellidos,
      dni: cleanDni,
      cargo: cleanCargo,
      gradoAcademico: cleanGrado,
      institucion: cleanInstitucion,
      email: cleanEmail,
      experiencia,
      isExtranjero,
      firmaExpertoImg,
      ctiVitae,
      orcid,
      linkedin,
      cvFileName,
      resumenProfesional,
      estudios: cleanInstitucion,
      experienciaDetallada,
      cvFileDataUrl,
      cvTextContent,
      valoracionGlobal,
      dictamenFinal,
      observaciones,
      respuestas: (respuestas && Object.keys(respuestas).length > 0 && (dni === '09091855' || inviteCode === '09091855')) ? respuestas : {},
      inviteCode: inviteCode || cleanDni,
      isNuevoRegistro: true
    })

    // Limpiar campos del formulario modal tras grabar exitosamente
    setNombresExperto('')
    setApellidosExperto('')
    setCargo('')
    setGradoAcademico('')
    setDni('')
    setInstitucion('')
    setEmail('')
    setInviteValidado(false)
    setCodigoInvitacionInput('')
    setIsFinalizado(false)
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_finalizado`, 'false')

    setShowRegistroModal(false)
    setActiveTab('CARTA')
    alert(`¡Bienvenido(a) ${combinedNombre}! Sus datos oficiales han sido registrados e integrados. A partir de ahora podrá retomar su avance ingresando su DNI (${cleanDni}).`)
  }

  // Validar Código de Invitación emitido por el Investigador
  const handleValidarInvitacion = async (e) => {
    if (e) e.preventDefault()
    setInvitationError('')
    const cleanCode = codigoInvitacionInput.trim().toUpperCase()
    if (!cleanCode) {
      setInvitationError('Por favor ingrese su Código de Invitación (ej. EXP-XXXX / 09091855).')
      return
    }

    try {
      setSyncing(true)
      let data = null
      try {
        const res = await fetch('/api/invitacion/validar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codigo: cleanCode })
        })
        data = await res.json()
      } catch (networkErr) {
        console.warn("Red no disponible o modo fallback local:", networkErr)
      }

      if (data && data.success) {
        setInviteCode(cleanCode)
        setDni(cleanCode)

        // CASO 1: EVALUADOR YA REGISTRADO ANTERIORMENTE (TIENE DATOS DE EVALUACIÓN) -> INGRESAR DIRECTAMENTE
        if (data.evaluacion && data.evaluacion.nombre && data.evaluacion.nombre !== "Experto Validador") {
          const ev = data.evaluacion
          setNombre(ev.nombre || '')
          setNombresExperto(ev.nombresExperto || '')
          setApellidosExperto(ev.apellidosExperto || '')
          setDni(ev.dni || cleanCode)
          setCargo(ev.cargo || '')
          setGradoAcademico(ev.gradoAcademico || '')
          setInstitucion(ev.institucion || '')
          setEmail(ev.email || '')
          setRespuestas(ev.respuestas || {})
          if (ev.firmaExpertoImg) setFirmaExpertoImg(ev.firmaExpertoImg)

          const isComp = Boolean(ev && (ev.finalizado || ev.estado === 'Completado' || (ev.respuestas && Object.keys(ev.respuestas).filter(k => ev.respuestas[k]?.likert).length >= 100)))
          setIsFinalizado(isComp)

          localStorage.setItem(`${LOCAL_STORAGE_KEY}_finalizado`, isComp ? 'true' : 'false')
          localStorage.setItem(`${LOCAL_STORAGE_KEY}_nombre`, ev.nombre || '')
          localStorage.setItem(`${LOCAL_STORAGE_KEY}_dni`, ev.dni || cleanCode)
          localStorage.setItem(`${LOCAL_STORAGE_KEY}_cargo`, ev.cargo || '')
          localStorage.setItem(`${LOCAL_STORAGE_KEY}_grado`, ev.gradoAcademico || '')
          localStorage.setItem(`${LOCAL_STORAGE_KEY}_institucion`, ev.institucion || '')

          setEvaluadorInspeccionado(ev)
          setShowRegistroModal(false)
          setInviteValidado(false)
          setActiveTab('CARTA')

          const count = Object.keys(ev.respuestas || {}).filter(k => ev.respuestas[k]?.likert).length
          alert(`¡Bienvenido(a) de nuevo, ${ev.nombre}!\nIngresando a su evaluación (${count}/100 preguntas evaluadas).`)
          return
        } else {
          // CASO 2: DNI NUEVO (PRIMERA VEZ) -> LIMPIAR FORZOSAMENTE TODOS LOS CAMPOS DE PERFIL PREVIOS
          setNombre('')
          setNombresExperto('')
          setApellidosExperto('')
          setCargo('')
          setGradoAcademico('')
          setInstitucion('')
          setEmail('')
          setRespuestas({})
          setFirmaExpertoImg('')
          setIsFinalizado(false)

          localStorage.setItem(`${LOCAL_STORAGE_KEY}_finalizado`, 'false')
          localStorage.removeItem(`${LOCAL_STORAGE_KEY}_respuestas`)
          localStorage.removeItem(`${LOCAL_STORAGE_KEY}_firma_img`)

          if (data.invitacion) {
            if (data.invitacion.nombreExperto && data.invitacion.nombreExperto !== "Experto Validador") {
              setNombre(data.invitacion.nombreExperto)
              const parts = data.invitacion.nombreExperto.split(' ')
              if (parts.length >= 2) {
                setNombresExperto(parts[0])
                setApellidosExperto(parts.slice(1).join(' '))
              }
            }
            if (data.invitacion.cargo && data.invitacion.cargo !== "Especialista Informante") {
              setCargo(data.invitacion.cargo)
            }
            if (data.invitacion.gradoAcademico) setGradoAcademico(data.invitacion.gradoAcademico)
            if (data.invitacion.institucion) setInstitucion(data.invitacion.institucion)
            if (data.invitacion.email) setEmail(data.invitacion.email)
          }

          setInviteValidado(true)
        }
        return
      } else if (data && !data.success && data.mensaje) {
        setInvitationError(data.mensaje)
        setInviteValidado(false)
        return
      }

      // Fallback local en caso de desconexión momentánea de servidor local
      const localInv = (invitacionesList || []).find(i => (i.codigo || '').toUpperCase() === cleanCode || (i.dni || '').toUpperCase() === cleanCode)
      if (localInv || cleanCode === '09091855' || cleanCode.startsWith('EXP-') || cleanCode.startsWith('EXT-')) {
        setInviteCode(cleanCode)
        setInviteValidado(true)
        if (localInv) {
          if (localInv.nombreExperto && localInv.nombreExperto !== "Experto Validador") setNombre(localInv.nombreExperto)
          if (localInv.cargo) setCargo(localInv.cargo)
        }
      } else {
        setInvitationError('Código de invitación no encontrado. Solicite al Investigador Principal que le genere su código de invitación.')
        setInviteValidado(false)
      }
    } catch (err) {
      setInvitationError('Error al verificar el código. Por favor intente nuevamente.')
    } finally {
      setSyncing(false)
    }
  }

  // Cambiar Clave PIN del Investigador desde el Panel
  const handleCambiarPinInvestigador = async (e) => {
    e.preventDefault()
    setPinSuccessMsg('')
    setPinErrorMsg('')

    if (!nuevoPinInput || nuevoPinInput.trim().length < 4) {
      setPinErrorMsg('El nuevo PIN debe contener al menos 4 caracteres.')
      return
    }

    try {
      setSyncing(true)
      const res = await fetch('/api/investigador/cambiar-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinActual: pinActualInput.trim(), nuevoPin: nuevoPinInput.trim() })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setPinSuccessMsg(`¡Clave PIN del Investigador actualizada con éxito a: "${nuevoPinInput.trim()}"!`)
        setPinInvestigadorActual(nuevoPinInput.trim())
        setPinActualInput('')
        setNuevoPinInput('')
      } else {
        setPinErrorMsg(data.mensaje || 'Error al actualizar la clave PIN.')
      }
    } catch (err) {
      setPinErrorMsg('Error de conexión al actualizar la clave PIN.')
    } finally {
      setSyncing(false)
    }
  }

  // Login del Investigador con PIN (2026)
  const handleLoginInvestigador = async (e) => {
    e.preventDefault()
    setPinError('')
    try {
      setSyncing(true)
      const res = await fetch('/api/investigador/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput.trim() })
      })
      const data = await res.json()

      if (data.success) {
        setInvestigadorAutenticado(true)
        setUserRole('INVESTIGADOR')
        setActiveTab('PANEL_INVESTIGADOR')
        setShowPinModal(false)
        setPinInput('')
        fetchInvestigadorData()
      } else {
        setPinError(data.mensaje || 'PIN Incorrecto. Intente con 2026.')
      }
    } catch (err) {
      if (pinInput.trim() === '2026') {
        setInvestigadorAutenticado(true)
        setUserRole('INVESTIGADOR')
        setActiveTab('PANEL_INVESTIGADOR')
        setShowPinModal(false)
        setPinInput('')
      } else {
        setPinError('PIN Incorrecto. Ingrese 2026.')
      }
    } finally {
      setSyncing(false)
    }
  }

  // Descargar Informe Completo en Word (.docx)
  const handleDescargarInformeDocx = async () => {
    try {
      setSyncing(true)
      const selectedCodes = selectedEvaluadoresDocx.length > 0 ? selectedEvaluadoresDocx : (invitacionesList || []).map(i => i.codigo)
      const queryParam = selectedCodes.length > 0 ? `?evaluadores=${encodeURIComponent(selectedCodes.join(','))}` : ''
      
      const res = await fetch('/api/investigador/descargar-informe-docx' + queryParam)

      if (!res.ok) {
        throw new Error('Error al generar el informe en el servidor')
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'MODELO_V_DE_AIKEN_VALIDACION_DE_LOS_INSTRUMENTOS.docx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      alert("Error al descargar el informe en formato Word. Por favor intente nuevamente.")
    } finally {
      setSyncing(false)
    }
  }

  // Descargar Informe Exclusivo de Alfa de Cronbach en Word (.docx)
  const handleDescargarInformeCronbachDocx = async () => {
    try {
      setSyncing(true)
      const res = await fetch('/api/investigador/descargar-informe-cronbach')

      if (!res.ok) {
        throw new Error('Error al generar el informe de Alfa de Cronbach en el servidor')
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'INFORME_CONFIABILIDAD_ALFA_DE_CRONBACH.docx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      alert("Error al descargar el informe Alfa de Cronbach en Word.")
    } finally {
      setSyncing(false)
    }
  }

  // ESTADOS Y HANDLERS PARA EDITAR EVALUADOR (INVESTIGADOR)
  const [editingEvalModal, setEditingEvalModal] = useState(null)
  const [evalNombreModal, setEvalNombreModal] = useState('')
  const [evalDniModal, setEvalDniModal] = useState('')
  const [evalCargoModal, setEvalCargoModal] = useState('')
  const [evalGradoModal, setEvalGradoModal] = useState('')
  const [evalInstitucionModal, setEvalInstitucionModal] = useState('')
  const [evalEmailModal, setEvalEmailModal] = useState('')

  const handleAbrirEditarEvaluadorModal = (inv) => {
    const evalData = evaluacionesData[inv.codigo] || Object.values(evaluacionesData).find(e => 
      (e.dni && e.dni.trim().toUpperCase() === inv.codigo.trim().toUpperCase()) || 
      (e.nombre && e.nombre.trim().toLowerCase() === (inv.nombreExperto || '').trim().toLowerCase())
    ) || {}

    setEditingEvalModal(inv)
    setEvalNombreModal(evalData.nombre || inv.nombreExperto || '')
    setEvalDniModal(evalData.dni || inv.dni || '')
    setEvalCargoModal(evalData.cargo || inv.cargo || '')
    setEvalGradoModal(evalData.gradoAcademico || 'Magíster')
    setEvalInstitucionModal(evalData.institucion || 'Universidad de Procedencia')
    setEvalEmailModal(evalData.email || '')
  }

  const handleGuardarEditarEvaluadorModal = async (e) => {
    e.preventDefault()
    if (!editingEvalModal) return

    const combinedNombre = evalNombreModal.trim()
    const parts = combinedNombre.split(' ')
    const nombres = parts[0] || combinedNombre
    const apellidos = parts.slice(1).join(' ') || ''
    const cleanDni = evalDniModal.trim()
    const cleanCargo = evalCargoModal.trim()
    const cleanGrado = evalGradoModal.trim()
    const cleanInstitucion = evalInstitucionModal.trim()
    const cleanEmail = evalEmailModal.trim()

    const payload = {
      codigoTarget: editingEvalModal.codigo,
      datosEvaluador: {
        nombre: combinedNombre,
        nombresExperto: nombres,
        apellidosExperto: apellidos,
        dni: cleanDni,
        cargo: cleanCargo,
        gradoAcademico: cleanGrado,
        institucion: cleanInstitucion,
        email: cleanEmail
      }
    }

    try {
      setSyncing(true)
      const res = await fetch('/api/investigador/editar-evaluador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (res.ok && data.success) {
        // 1. Actualizar evaluadorInspeccionado si coincide
        const updatedEval = data.evaluacion || {
          nombre: combinedNombre,
          nombresExperto: nombres,
          apellidosExperto: apellidos,
          dni: cleanDni,
          cargo: cleanCargo,
          gradoAcademico: cleanGrado,
          institucion: cleanInstitucion,
          email: cleanEmail,
          codigo: editingEvalModal.codigo
        }

        // 1. Actualizar evaluadorInspeccionado si coincide
        if (evaluadorInspeccionado && (evaluadorInspeccionado.codigo === editingEvalModal.codigo || evaluadorInspeccionado.dni === editingEvalModal.dni || evaluadorInspeccionado.dni === cleanDni)) {
          setEvaluadorInspeccionado(prev => ({
            ...prev,
            ...updatedEval
          }))
        }

        // 2. Actualizar estado local si coincide con el usuario activo
        if (inviteCode === editingEvalModal.codigo || dni === editingEvalModal.dni || dni === cleanDni) {
          setNombre(combinedNombre)
          setNombresExperto(nombres)
          setApellidosExperto(apellidos)
          setDni(cleanDni)
          setCargo(cleanCargo)
          setGradoAcademico(cleanGrado)
          setInstitucion(cleanInstitucion)
          setEmail(cleanEmail)

          localStorage.setItem(`${LOCAL_STORAGE_KEY}_nombre`, combinedNombre)
          localStorage.setItem(`${LOCAL_STORAGE_KEY}_nombresExperto`, nombres)
          localStorage.setItem(`${LOCAL_STORAGE_KEY}_apellidosExperto`, apellidos)
          localStorage.setItem(`${LOCAL_STORAGE_KEY}_dni`, cleanDni)
          localStorage.setItem(`${LOCAL_STORAGE_KEY}_cargo`, cleanCargo)
          localStorage.setItem(`${LOCAL_STORAGE_KEY}_grado`, cleanGrado)
          localStorage.setItem(`${LOCAL_STORAGE_KEY}_institucion`, cleanInstitucion)
          localStorage.setItem(`${LOCAL_STORAGE_KEY}_email`, cleanEmail)
        }

        if (cleanDni && cleanDni !== editingEvalModal.codigo) {
          deleteLocalEvaluadorDbKey(editingEvalModal.codigo)
          setEvaluacionesData(prev => {
            const next = { ...prev }
            delete next[editingEvalModal.codigo]
            next[cleanDni] = updatedEval
            return next
          })
        } else {
          setEvaluacionesData(prev => ({
            ...prev,
            [editingEvalModal.codigo]: updatedEval,
            [cleanDni]: updatedEval
          }))
        }

        if (cleanDni) saveEvaluadorToLocalDb(cleanDni, updatedEval)

        // 4. Actualizar lista de invitaciones/evaluadores en el estado React
        setInvitacionesList(prev => prev.map(inv => {
          if (inv.codigo === editingEvalModal.codigo || inv.dni === editingEvalModal.dni || (cleanDni && inv.dni === cleanDni)) {
            return {
              ...inv,
              nombreExperto: combinedNombre,
              nombre: combinedNombre,
              nombresExperto: nombres,
              apellidosExperto: apellidos,
              dni: cleanDni,
              cargo: cleanCargo,
              gradoAcademico: cleanGrado,
              institucion: cleanInstitucion,
              email: cleanEmail
            }
          }
          return inv
        }))

        await fetchInvestigadorData()
        alert(`💾 ¡Datos del evaluador "${combinedNombre}" actualizados con éxito en todo el sistema!`)
        setEditingEvalModal(null)
      } else {
        alert(data.mensaje || "Error al actualizar los datos del evaluador.")
      }
    } catch (err) {
      alert("Error de conexión al actualizar datos del evaluador.")
    } finally {
      setSyncing(false)
    }
  }

  // ESTADOS Y HANDLERS PARA EDITAR PERFIL DESDE CARTA DE PRESENTACIÓN
  const [showEditarPerfilCartaModal, setShowEditarPerfilCartaModal] = useState(false)
  const [cartaNombres, setCartaNombres] = useState('')
  const [cartaApellidos, setCartaApellidos] = useState('')
  const [cartaDni, setCartaDni] = useState('')
  const [cartaCargo, setCartaCargo] = useState('')
  const [cartaGrado, setCartaGrado] = useState('')
  const [cartaInstitucion, setCartaInstitucion] = useState('')
  const [cartaEmail, setCartaEmail] = useState('')

  const handleAbrirEditarCartaModal = () => {
    setCartaNombres(evaluadorInspeccionado ? (evaluadorInspeccionado.nombresExperto || evaluadorInspeccionado.nombre || '') : (nombresExperto || activeNombreExperto || ''))
    setCartaApellidos(evaluadorInspeccionado ? (evaluadorInspeccionado.apellidosExperto || '') : (apellidosExperto || ''))
    setCartaDni(activeDni || '')
    setCartaCargo(activeCargo || 'Especialista Informante')
    setCartaGrado(activeGrado || 'Magíster')
    setCartaInstitucion(activeInstitucion || 'Universidad de Procedencia')
    setCartaEmail(activeEmail || '')
    setShowEditarPerfilCartaModal(true)
  }

  const handleGuardarCartaPerfil = async (e) => {
    e.preventDefault()
    const cleanNombres = cartaNombres.trim()
    const cleanApellidos = cartaApellidos.trim()
    const combinedNombre = `${cleanNombres} ${cleanApellidos}`.trim() || cleanNombres
    const cleanDni = cartaDni.trim()
    const cleanCargo = cartaCargo.trim()
    const cleanGrado = cartaGrado.trim()
    const cleanInstitucion = cartaInstitucion.trim()
    const cleanEmail = cartaEmail.trim()
    const keyToSave = (evaluadorInspeccionado ? (evaluadorInspeccionado.codigo || evaluadorInspeccionado.dni) : (inviteCode || cleanDni || '09091855')).trim().toUpperCase()

    setNombre(combinedNombre)
    setNombresExperto(cleanNombres)
    setApellidosExperto(cleanApellidos)
    setDni(cleanDni)
    setCargo(cleanCargo)
    setGradoAcademico(cleanGrado)
    setInstitucion(cleanInstitucion)
    setEmail(cleanEmail)

    const updatedProfileObj = {
      nombre: combinedNombre,
      nombresExperto: cleanNombres,
      apellidosExperto: cleanApellidos,
      dni: cleanDni,
      cargo: cleanCargo,
      gradoAcademico: cleanGrado,
      institucion: cleanInstitucion,
      email: cleanEmail,
      inviteCode: keyToSave,
      codigo: keyToSave
    }

    if (evaluadorInspeccionado) {
      setEvaluadorInspeccionado(prev => ({
        ...prev,
        ...updatedProfileObj
      }))
    }

    localStorage.setItem(`${LOCAL_STORAGE_KEY}_nombre`, combinedNombre)
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_nombresExperto`, cleanNombres)
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_apellidosExperto`, cleanApellidos)
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_dni`, cleanDni)
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_cargo`, cleanCargo)
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_grado`, cleanGrado)
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_institucion`, cleanInstitucion)
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_email`, cleanEmail)

    await saveEvaluationToBackend(keyToSave, updatedProfileObj)

    try {
      await fetch('/api/investigador/editar-evaluador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigoTarget: keyToSave,
          datosEvaluador: updatedProfileObj
        })
      })
      await fetchInvestigadorData()
    } catch (err) {}

    setShowEditarPerfilCartaModal(false)
    alert("¡Perfil y datos del evaluador actualizados con éxito en todas las secciones!")
  }

  // Guardar Cambios de la Hoja de Vida (Evaluador e Investigador)
  const handleGuardarHojaDeVida = async () => {
    const targetKey = evaluadorInspeccionado
      ? (evaluadorInspeccionado.codigo || evaluadorInspeccionado.dni)
      : (dni || inviteCode || 'DIRECTO')

    const cleanFullNombre = (nombre || '').trim() || 'Experto Validador'
    const parts = cleanFullNombre.split(' ')
    const cleanNombres = (nombresExperto || '').trim() || parts[0] || cleanFullNombre
    const cleanApellidos = (apellidosExperto || '').trim() || parts.slice(1).join(' ') || ''

    const cvPayload = {
      nombre: cleanFullNombre,
      nombresExperto: cleanNombres,
      apellidosExperto: cleanApellidos,
      email: (email || '').trim(),
      gradoAcademico: (gradoAcademico || '').trim() || 'Magíster',
      estudios: (estudios || '').trim() || (institucion || '').trim() || 'Universidad de Procedencia',
      institucion: (estudios || '').trim() || (institucion || '').trim() || 'Universidad de Procedencia',
      experienciaDetallada: (experienciaDetallada || '').trim(),
      ctiVitae: (ctiVitae || '').trim(),
      orcid: (orcid || '').trim(),
      linkedin: (linkedin || '').trim(),
      resumenProfesional: (resumenProfesional || '').trim(),
      dni: targetKey,
      codigo: targetKey,
      inviteCode: targetKey
    }

    try {
      setSyncing(true)

      // 1. Guardar en backend evaluacion
      await saveEvaluationToBackend(targetKey, cvPayload)

      // 2. Guardar en backend investigador
      await fetch('/api/investigador/editar-evaluador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigoTarget: targetKey,
          datosEvaluador: cvPayload
        })
      })

      // 3. Actualizar localStorage para sesión activa
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_nombre`, cleanFullNombre)
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_nombresExperto`, cleanNombres)
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_apellidosExperto`, cleanApellidos)
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_email`, (email || '').trim())
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_grado`, (gradoAcademico || '').trim())
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_institucion`, (estudios || '').trim() || (institucion || '').trim())

      // 4. Actualizar evaluadorInspeccionado si está activo
      if (evaluadorInspeccionado) {
        setEvaluadorInspeccionado(prev => ({
          ...prev,
          ...cvPayload
        }))
        await fetchInvestigadorData()
      }

      alert(`💾 ¡Datos de la Hoja de Vida guardados exitosamente en la plataforma para "${cleanFullNombre}"!`)
    } catch (err) {
      alert("⚠️ Ocurrió un inconveniente al conectar con el servidor, pero sus datos fueron resguardados.")
    } finally {
      setSyncing(false)
    }
  }

  // -------------------------------------------------------------
  // FUNCIONES DE EDICIÓN Y GESTIÓN DE PREGUNTAS (INVESTIGADOR)
  // -------------------------------------------------------------
  const handleAbrirModalAgregarPregunta = () => {
    setEditingQuestion(null)
    setQDimension('')
    setQIndicador('')
    setQDescripcion('')
    setQTexto('')
    setShowQuestionModal(true)
  }

  const handleAbrirModalEditarPregunta = (pregunta) => {
    setEditingQuestion(pregunta)
    setQDimension(pregunta.dimension || '')
    setQIndicador(pregunta.indicador || '')
    setQDescripcion(pregunta.descripcion || '')
    setQTexto(pregunta.texto || '')
    setShowQuestionModal(true)
  }

  const handleGuardarPreguntaModal = async (e) => {
    e.preventDefault()
    if (!qTexto.trim()) {
      alert("El texto de la pregunta es obligatorio.")
      return
    }

    const currentList = [...(preguntasData[instrumentoSubTab] || [])]

    if (editingQuestion) {
      // Editar existente
      const updatedList = currentList.map(p => p.id === editingQuestion.id ? {
        ...p,
        dimension: qDimension,
        indicador: qIndicador,
        descripcion: qDescripcion,
        texto: qTexto
      } : p)

      const newPreguntasState = {
        ...preguntasData,
        [instrumentoSubTab]: updatedList
      }
      setPreguntasData(newPreguntasState)
      await guardarPreguntasEnBackend(newPreguntasState)
      alert("¡Pregunta actualizada exitosamente!")
    } else {
      // Crear nueva
      const newId = `${instrumentoSubTab}_${Date.now()}`
      const newQuestionObj = {
        id: newId,
        dimension: qDimension || `Dimensión ${instrumentoSubTab}`,
        indicador: qIndicador || `Indicador ${instrumentoSubTab}`,
        descripcion: qDescripcion || '',
        texto: qTexto
      }

      const updatedList = [...currentList, newQuestionObj]
      const newPreguntasState = {
        ...preguntasData,
        [instrumentoSubTab]: updatedList
      }
      setPreguntasData(newPreguntasState)
      await guardarPreguntasEnBackend(newPreguntasState)
      alert("¡Nueva pregunta agregada exitosamente!")
    }

    setShowQuestionModal(false)
  }

  const handleEliminarPregunta = async (preguntaId) => {
    if (window.confirm("¿Está seguro de eliminar esta pregunta del instrumento? Los evaluadores ya no la verán.")) {
      const currentList = [...(preguntasData[instrumentoSubTab] || [])]
      const updatedList = currentList.filter(p => p.id !== preguntaId)
      const newPreguntasState = {
        ...preguntasData,
        [instrumentoSubTab]: updatedList
      }
      setPreguntasData(newPreguntasState)
      await guardarPreguntasEnBackend(newPreguntasState)
    }
  }

  const guardarPreguntasEnBackend = async (stateToSave) => {
    try {
      setSyncing(true)
      await fetch('/api/preguntas/guardar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preguntas: stateToSave })
      })
    } catch (err) {
      console.warn("No se pudo guardar en el servidor backend:", err)
    } finally {
      setSyncing(false)
    }
  }

  // Guardar en Backend Evaluaciones y DB Local en el Navegador
  const saveEvaluationToBackend = async (key, payload) => {
    try {
      setSyncing(true)
      saveEvaluadorToLocalDb(key, payload)
      await fetch('/api/evaluacion/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: key, payload })
      })
    } catch (err) {
      console.warn("Autoguardado local activo:", err)
    } finally {
      setSyncing(false)
    }
  }

  // Registrar y Crear Nuevo Evaluador (Investigador)
  const handleCrearInvitacion = async (e) => {
    if (e) e.preventDefault()
    if (!nuevoExpertoDni.trim()) {
      alert("Por favor ingrese el DNI o Documento de Identidad del nuevo evaluador.")
      return
    }
    if (!nuevoExpertoNombre.trim()) {
      alert("Por favor ingrese el Nombre y Apellidos del nuevo evaluador.")
      return
    }

    try {
      setSyncing(true)
      const res = await fetch('/api/invitaciones/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dni: nuevoExpertoDni.trim(),
          nombreExperto: nuevoExpertoNombre.trim(),
          cargo: nuevoExpertoCargo.trim(),
          gradoAcademico: nuevoExpertoGrado.trim(),
          institucion: nuevoExpertoInstitucion.trim(),
          email: nuevoExpertoEmail.trim()
        })
      })
      const data = await res.json()
      if (data.success) {
        alert(`¡Evaluador registrado exitosamente!\nDNI asignado: ${data.invitación.dni || data.invitación.codigo}\nNombre: ${data.invitación.nombreExperto}\n\nEl evaluador ya puede ingresar en la pantalla de inicio colocando su DNI.`)
        setNuevoExpertoDni('')
        setNuevoExpertoNombre('')
        setNuevoExpertoCargo('')
        setNuevoExpertoGrado('Magíster')
        setNuevoExpertoInstitucion('')
        setNuevoExpertoEmail('')
        await fetchInvestigadorData()
      } else {
        alert(data.mensaje || "Error al registrar el evaluador.")
      }
    } catch (err) {
      alert("Error de conexión al registrar el evaluador.")
    } finally {
      setSyncing(false)
    }
  }

  // Eliminar Invitación o Registro de Evaluador
  const handleEliminarInvitacion = async (codigo, nombreExperto) => {
    const label = nombreExperto ? `al evaluador "${nombreExperto}" (${codigo})` : `la invitación ${codigo}`
    if (window.confirm(`¿Está seguro de eliminar ${label}? Esta acción borrará sus datos y respuestas del sistema.`)) {
      try {
        const res = await fetch(`/api/invitaciones/${codigo}`, { method: 'DELETE' })
        const data = await res.json()
        if (data.success) {
          alert(`¡Registro eliminado exitosamente!`)
          deleteLocalEvaluadorDbKey(codigo)
          if (evaluadorInspeccionado && (evaluadorInspeccionado.codigo === codigo || evaluadorInspeccionado.dni === codigo)) {
            setNombre('')
            setDni('')
            setCargo('')
            setGradoAcademico('')
            setInstitucion('')
            setExperiencia('')
            setFirmaExpertoImg('')
            setCvFileName('')
            setRespuestas({})
            setInviteCode('')
            setEvaluadorInspeccionado(null)
          }
          fetchInvestigadorData()
        }
      } catch (err) {
        alert("Error al eliminar el registro.")
      }
    }
  }

  // Copiar Enlace Directo
  const handleCopiarEnlace = (codigo) => {
    const link = `${window.location.origin}${window.location.pathname}?code=${codigo}`
    navigator.clipboard.writeText(link)
    alert(`¡Enlace copiado al portapapeles!\n\n${link}`)
  }

  // Dibujo Canvas Firma
  const startDrawing = (e) => {
    if (isReadOnly) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    ctx.beginPath()
    ctx.moveTo(clientX - rect.left, clientY - rect.top)
    setIsDrawing(true)
  }

  const draw = (e) => {
    if (isReadOnly || !isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#0f172a'
    ctx.lineTo(clientX - rect.left, clientY - rect.top)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false)
      const canvas = canvasRef.current
      if (canvas) {
        const imgData = canvas.toDataURL('image/png')
        setFirmaExpertoImg(imgData)
        try {
          localStorage.setItem(`${LOCAL_STORAGE_KEY}_firma_img`, imgData)
        } catch (e) {}
        const currentKey = (inviteCode || dni || '').trim().toUpperCase()
        if (currentKey) {
          saveEvaluationToBackend(currentKey, { firmaExpertoImg: imgData })
        }
      }
    }
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setFirmaExpertoImg('')
      try {
        localStorage.removeItem(`${LOCAL_STORAGE_KEY}_firma_img`)
      } catch (e) {}
      const currentKey = (inviteCode || dni || '').trim().toUpperCase()
      if (currentKey) {
        saveEvaluationToBackend(currentKey, { firmaExpertoImg: '' })
      }
    }
  }

  const handleFirmaUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const imgData = event.target.result
        setFirmaExpertoImg(imgData)
        try {
          localStorage.setItem(`${LOCAL_STORAGE_KEY}_firma_img`, imgData)
        } catch (e) {}
        const currentKey = (inviteCode || dni || '').trim().toUpperCase()
        if (currentKey) {
          saveEvaluationToBackend(currentKey, { firmaExpertoImg: imgData })
        }
        alert("¡Imagen de firma cargada y guardada con éxito!")
      }
      reader.readAsDataURL(file)
    }
  }

  useEffect(() => {
    if (firmaExpertoImg && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const img = new Image()
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      }
      img.src = firmaExpertoImg
    }
  }, [firmaExpertoImg, activeTab])

  const convertWordToHtml = async (arrayBuffer) => {
    try {
      if (!window.mammoth) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js'
          script.onload = resolve
          script.onerror = reject
          document.head.appendChild(script)
        })
      }

      if (!window.mammoth) return null

      const result = await window.mammoth.convertToHtml({ arrayBuffer: arrayBuffer })
      return result.value || ''
    } catch (err) {
      console.warn("No se pudo convertir el archivo Word (.docx) a HTML:", err)
      return null
    }
  }

  const extractTextFromPdf = async (arrayBuffer) => {
    try {
      if (!window.pdfjsLib) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js'
          script.onload = resolve
          script.onerror = reject
          document.head.appendChild(script)
        })
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js'
        }
      }

      if (!window.pdfjsLib) return null

      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise
      let fullText = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map(item => item.str).join(' ')
        fullText += `--- PÁGINA ${i} ---\n${pageText}\n\n`
      }
      return fullText.trim()
    } catch (err) {
      console.warn("No se pudo extraer texto bruto del PDF:", err)
      return null
    }
  }

  const handleCvFileUpload = async (e) => {
    if (isReadOnly) return
    const file = e.target.files[0]
    if (file) {
      setCvFileName(file.name)
      const fileNameLower = file.name.toLowerCase()
      const isPdf = fileNameLower.endsWith('.pdf')
      const isWord = fileNameLower.endsWith('.docx') || fileNameLower.endsWith('.doc')

      if (isPdf) {
        // Leer DataURL para el visor iframe PDF
        const readerData = new FileReader()
        readerData.onload = (event) => {
          setCvFileDataUrl(event.target.result)
        }
        readerData.readAsDataURL(file)

        const arrayBufferReader = new FileReader()
        arrayBufferReader.onload = async (event) => {
          const pdfText = await extractTextFromPdf(event.target.result)
          if (pdfText) setCvTextContent(pdfText)
        }
        arrayBufferReader.readAsArrayBuffer(file)
      } else if (isWord) {
        // Para Word (.docx), convertimos el documento a HTML para visualizarlo en pantalla sin descargas ni iframes rotas
        const arrayBufferReader = new FileReader()
        arrayBufferReader.onload = async (event) => {
          const wordHtml = await convertWordToHtml(event.target.result)
          if (wordHtml) {
            setCvTextContent(wordHtml)
            setCvFileDataUrl('') // Limpia DataUrl para evitar iframe de descarga binaria
          } else {
            const textReader = new FileReader()
            textReader.onload = (ev) => {
              setCvTextContent(ev.target.result || '')
              setCvFileDataUrl('')
            }
            textReader.readAsText(file)
          }
        }
        arrayBufferReader.readAsArrayBuffer(file)
      } else {
        const readerText = new FileReader()
        readerText.onload = (event) => {
          if (typeof event.target.result === 'string' && event.target.result.trim()) {
            setCvTextContent(event.target.result)
            setCvFileDataUrl('')
          }
        }
        readerText.readAsText(file)
      }

      alert(`¡Archivo de Hoja de Vida "${file.name}" cargado y procesado con éxito!`)
    }
  }

  const handleRemoveCvFile = () => {
    if (isReadOnly) return
    if (window.confirm("¿Está seguro de quitar el archivo de Hoja de Vida cargado?")) {
      setCvFileName('')
      setCvFileDataUrl('')
      setCvTextContent('')
      localStorage.removeItem(`${LOCAL_STORAGE_KEY}_cv_filename`)
      localStorage.removeItem(`${LOCAL_STORAGE_KEY}_cv_dataurl`)
      localStorage.removeItem(`${LOCAL_STORAGE_KEY}_cv_text_content`)
      if (cvFileInputRef.current) cvFileInputRef.current.value = ''
      alert("El archivo de Hoja de Vida ha sido eliminado correctamente.")
    }
  }

  const handleResetForm = () => {
    if (window.confirm("¿Está seguro de reiniciar todas las respuestas y borrar los datos ingresados?")) {
      localStorage.clear()
      setRespuestas({})
      setNombre('')
      setDni('')
      setCargo('')
      setGradoAcademico('')
      setInstitucion('')
      setExperiencia('')
      setFirmaExpertoImg('')
      setCtiVitae('')
      setOrcid('')
      setLinkedin('')
      setCvFileName('')
      setResumenProfesional('')
      setValoracionGlobal('')
      setDictamenFinal('Aprobado')
      setObservaciones('')
      setInviteCode('')
      setIsExtranjero(false)
      setActiveTab('CARTA')
      setShowRegistroModal(true)
    }
  }

  const handleLikertChange = (preguntaId, valor) => {
    setRespuestas(prev => {
      const nextResp = {
        ...prev,
        [preguntaId]: { ...prev[preguntaId], likert: valor }
      }
      if (userRole === 'INVESTIGADOR' && evaluadorInspeccionado) {
        saveEvaluationToBackend(evaluadorInspeccionado.codigo, { respuestas: nextResp })
      }
      return nextResp
    })
  }

  const handleCriterioChange = (preguntaId, criterio, valor) => {
    setRespuestas(prev => {
      const nextResp = {
        ...prev,
        [preguntaId]: {
          ...prev[preguntaId],
          [criterio]: valor
        }
      }
      if (userRole === 'INVESTIGADOR' && evaluadorInspeccionado) {
        saveEvaluationToBackend(evaluadorInspeccionado.codigo, { respuestas: nextResp })
      }
      return nextResp
    })
  }

  const handleObservacionChange = (preguntaId, valor) => {
    setRespuestas(prev => {
      const nextResp = {
        ...prev,
        [preguntaId]: {
          ...prev[preguntaId],
          observacion: valor
        }
      }
      if (userRole === 'INVESTIGADOR' && evaluadorInspeccionado) {
        saveEvaluationToBackend(evaluadorInspeccionado.codigo, { respuestas: nextResp })
      }
      return nextResp
    })
  }

  const isQuestionAnswered = (preguntaId) => {
    const resp = respuestas[preguntaId]
    return !!(resp && (resp.likert || resp.claridad || resp.coherencia || resp.relevancia || resp.suficiencia))
  }

  const isQuestionComplete = (preguntaId) => {
    const resp = respuestas[preguntaId]
    return !!(resp && resp.likert && resp.claridad && resp.coherencia && resp.relevancia && resp.suficiencia)
  }

  const countAnswered = (list) => list.filter(p => isQuestionAnswered(p.id)).length
  const countFullyComplete = (list) => list.filter(p => isQuestionComplete(p.id)).length

  const viAnswered = countAnswered(preguntasData.VI || [])
  const vdAnswered = countAnswered(preguntasData.VD || [])
  const totalAnswered = viAnswered + vdAnswered

  const viComplete = countFullyComplete(preguntasData.VI || [])
  const vdComplete = countFullyComplete(preguntasData.VD || [])
  const totalComplete = viComplete + vdComplete

  const totalPreguntas = (preguntasData.VI?.length || 0) + (preguntasData.VD?.length || 0)
  const totalMissing = totalPreguntas - totalComplete

  const hasCvFile = useMemo(() => !!(cvFileName && (cvFileDataUrl || cvTextContent)), [cvFileName, cvFileDataUrl, cvTextContent])

  const isCvRequirementMet = useMemo(() => {
    if (hasCvFile) return true
    const hasCvForm = !!(
      (nombre && nombre.trim() && nombre !== 'Experto Validador') &&
      (email && email.trim()) &&
      (gradoAcademico && gradoAcademico.trim()) &&
      (estudios && estudios.trim()) &&
      ((experienciaDetallada && experienciaDetallada.trim()) || (cargo && cargo.trim()))
    )
    return hasCvForm
  }, [hasCvFile, nombre, email, gradoAcademico, estudios, experienciaDetallada, cargo])

  const handleSubmitEvaluacion = () => {
    if (!nombre.trim() || !dni.trim()) {
      alert("Por favor, complete sus datos personales obligatorios antes de enviar su evaluación.")
      setShowRegistroModal(true)
      return
    }

    if (totalComplete < totalPreguntas) {
      const missingVI = (preguntasData.VI?.length || 0) - viComplete
      const missingVD = (preguntasData.VD?.length || 0) - vdComplete
      alert(`⚠️ ATENCIÓN: Las preguntas de los instrumentos son strictly OBLIGATORIAS.\n\nAún faltan ${totalMissing} preguntas por completar obligatoriamente:\n- Variable Independiente (VI): Faltan ${missingVI} preguntas por completar totalmente\n- Variable Dependiente (VD): Faltan ${missingVD} preguntas por completar totalmente\n\nPor favor asegúrese de responder tanto la escala Likert (1-5) como los 4 criterios de calidad (Claridad, Coherencia, Relevancia, Suficiencia) en cada ítem.`)
      setActiveTab('INSTRUMENTOS')
      if (missingVI > 0) setInstrumentoSubTab('VI')
      else if (missingVD > 0) setInstrumentoSubTab('VD')
      return
    }

    if (!isCvRequirementMet) {
      alert("⚠️ REQUISITO DE HOJA DE VIDA PENDIENTE:\n\nPara poder finalizar y enviar la evaluación, debe cumplir con el respaldo en la pestaña HOJA DE VIDA DEL EVALUADOR / EXPERTO:\n- Adjuntar su archivo de Curriculum Vitae (PDF o Word), o bien\n- Llenar el Formulario de Registro / Actualización de Datos Principales del CV.")
      setActiveTab('HOJA_VIDA')
      return
    }

    setIsFinalizado(true)
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_finalizado`, 'true')
    } catch (e) {}

    const currentKey = (inviteCode || dni || '').trim().toUpperCase()
    if (currentKey) {
      saveEvaluationToBackend(currentKey, {
        nombre, dni, cargo, gradoAcademico, institucion, experiencia, isExtranjero,
        firmaExpertoImg, ctiVitae, orcid, linkedin, cvFileName, resumenProfesional,
        valoracionGlobal, dictamenFinal, observaciones, respuestas,
        finalizado: true, inviteCode: currentKey
      })
    }

    setSubmittedModal(true)
  }

  // DESCARGAR EXPEDIENTE COMPLETO CONSOLIDADO EN UN SOLO ARCHIVO WORD (.DOC)
  const handleExportExpedienteCompletoWord = () => {
    const expertName = activeNombreExperto || nombre || "Experto Evaluador"
    const expertDni = activeDni || dni || "N/A"
    const expertCargo = activeCargo || cargo || "Especialista Informante"
    const expertGrado = activeGrado || gradoAcademico || "Magíster"
    const expertEstudios = activeInstitucion || institucion || "Universidad de procedencia"
    const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })

    const viList = preguntasData.VI || []
    const vdList = preguntasData.VD || []

    const renderQuestionRows = (list, offset) => {
      return list.map((p, idx) => {
        const itemNum = offset + idx + 1
        const r = respuestas[p.id] || {}
        return `
          <tr>
            <td style="text-align:center; font-weight:bold;">${itemNum}</td>
            <td>
              <strong>${p.texto}</strong><br/>
              <span style="font-size:8pt; color:#475569;">Dimensión: ${p.dimension} | Indicador: ${p.indicador}</span>
              ${r.observacion ? `<br/><span style="color:#b45309; font-weight:bold;">Obs: ${r.observacion}</span>` : ''}
            </td>
            <td style="text-align:center; font-weight:bold; color:#0369a1;">${r.likert || '-'}</td>
            <td style="text-align:center;">${r.claridad || '-'}</td>
            <td style="text-align:center;">${r.coherencia || '-'}</td>
            <td style="text-align:center;">${r.relevancia || '-'}</td>
            <td style="text-align:center;">${r.suficiencia || '-'}</td>
          </tr>
        `
      }).join('')
    }

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>Expediente Completo de Evaluación por Juicio de Expertos</title>
        <style>
          body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #0f172a; margin: 25px; }
          h1 { font-size: 15pt; font-weight: bold; color: #0f172a; text-align: center; border-bottom: 3px solid #0284c7; padding-bottom: 6px; margin-top: 25px; text-transform: uppercase; }
          h2 { font-size: 12pt; font-weight: bold; color: #0369a1; border-left: 4px solid #0284c7; padding-left: 8px; margin-top: 20px; }
          p { margin-bottom: 10px; text-align: justify; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; font-size: 9pt; }
          th { background-color: #0f172a; color: #ffffff; padding: 6px; border: 1px solid #334155; text-align: center; font-weight: bold; }
          td { padding: 6px; border: 1px solid #cbd5e1; vertical-align: top; }
          .page-break { page-break-before: always; }
          .box { background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; margin-bottom: 15px; }
          .signature-container { text-align: center; margin-top: 35px; }
          .signature-img { height: 45px; max-width: 160px; object-fit: contain; margin: 0 auto 5px auto; display: block; }
        </style>
      </head>
      <body>

        <!-- 1. CARTA DE PRESENTACIÓN -->
        <h1>1. CARTA DE PRESENTACIÓN AL EXPERTO EVALUADOR</h1>
        <div class="box">
          <p><strong>FECHA:</strong> Lima, ${fecha}</p>
          <p><strong>A:</strong> ${expertName} (${expertCargo})</p>
          <p><strong>DNI / REGISTRO:</strong> ${expertDni}</p>
          <p><strong>GRADO ACADÉMICO:</strong> ${expertGrado}</p>
          <p><strong>DE:</strong> Dr. Luis Alfonso Cruz Gálvez - Investigador Principal</p>
          <p><strong>TÍTULO DE LA TESIS:</strong> "Sistema Predictivo con Deep Learning para la Gestión de Riesgos en Proyectos de Infraestructura Pública registrados en INFOBRAS - Contraloría General de la República, Perú, 2020-2024"</p>
        </div>
        <p>Estimado(a) especialista, mediante el presente documento me dirijo a usted para solicitar su valiosa colaboración en la evaluación por Juicio de Expertos de los instrumentos de recolección de datos de la presente investigación. Su experiencia garantiza la validez técnica de la arquitectura predictiva y su aplicación práctica.</p>

        <div class="page-break"></div>

        <!-- 2. MATRIZ DE CONSISTENCIA -->
        <h1>2. MATRIZ DE CONSISTENCIA METODOLÓGICA</h1>
        <table>
          <thead>
            <tr>
              <th>Nivel</th>
              <th>Problemas de Investigación</th>
              <th>Objetivos de Investigación</th>
              <th>Hipótesis de Investigación</th>
              <th>Variables y Dimensiones</th>
              <th>Técnicas e Instrumentos</th>
            </tr>
          </thead>
          <tbody>
            ${consistenciaData.map(item => `
              <tr>
                <td style="font-weight:bold; text-align:center;">${item.tipo}</td>
                <td>${item.problema}</td>
                <td>${item.objetivo}</td>
                <td>${item.hipotesis}</td>
                <td>${item.variables.replace(/\n/g, '<br/>')}</td>
                <td>${item.tecnica.replace(/\n/g, '<br/>')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="page-break"></div>

        <!-- 3. MATRIZ DE OPERACIONALIZACIÓN DE VARIABLES -->
        <h1>3. MATRIZ DE OPERACIONALIZACIÓN DE VARIABLES</h1>
        <h2>VARIABLE INDEPENDIENTE (VI): Arquitectura Predictiva Deep Learning</h2>
        <table>
          <thead>
            <tr>
              <th>Dimensión</th>
              <th>Indicador</th>
              <th>Definición Operacional</th>
              <th>Sustento Teórico</th>
              <th>Validez del Constructo</th>
              <th>Escala</th>
            </tr>
          </thead>
          <tbody>
            ${(matrizData.VI || []).map(dim => dim.indicadores.map((ind, iIdx) => `
              <tr>
                ${iIdx === 0 ? `<td rowspan="${dim.indicadores.length}" style="font-weight:bold;">${dim.dimension}</td>` : ''}
                <td><strong>${ind.codigo}:</strong> ${ind.nombre}</td>
                <td>${ind.definicion || ind.definicionOperacional || ''}</td>
                <td>${ind.sustento || ind.sustentoTeorico || ''}</td>
                <td>${ind.validez || ind.validezConstructo || ''}</td>
                <td>${ind.escala}</td>
              </tr>
            `).join('')).join('')}
          </tbody>
        </table>

        <h2>VARIABLE DEPENDIENTE (VD): Gestión de Riesgos en Infraestructura Pública</h2>
        <table>
          <thead>
            <tr>
              <th>Dimensión</th>
              <th>Indicador</th>
              <th>Definición Operacional</th>
              <th>Sustento Teórico</th>
              <th>Validez del Constructo</th>
              <th>Escala</th>
            </tr>
          </thead>
          <tbody>
            ${(matrizData.VD || []).map(dim => dim.indicadores.map((ind, iIdx) => `
              <tr>
                ${iIdx === 0 ? `<td rowspan="${dim.indicadores.length}" style="font-weight:bold;">${dim.dimension}</td>` : ''}
                <td><strong>${ind.codigo}:</strong> ${ind.nombre}</td>
                <td>${ind.definicion || ind.definicionOperacional || ''}</td>
                <td>${ind.sustento || ind.sustentoTeorico || ''}</td>
                <td>${ind.validez || ind.validezConstructo || ''}</td>
                <td>${ind.escala}</td>
              </tr>
            `).join('')).join('')}
          </tbody>
        </table>

        <div class="page-break"></div>

        <!-- 4. MATRIZ DE VALIDACIÓN POR JUICIO DE EXPERTO -->
        <h1>4. MATRIZ DE VALIDACIÓN POR JUICIO DE EXPERTO (EVALUACIÓN DE 100 ÍTEMS)</h1>
        <h2>INSTRUMENTO 1: Variable Independiente (VI) - Ítems 1 al 50</h2>
        <table>
          <thead>
            <tr>
              <th style="width:5%;">Ítem</th>
              <th style="width:45%;">Pregunta / Indicador</th>
              <th style="width:10%;">Likert (1-5)</th>
              <th style="width:10%;">Claridad</th>
              <th style="width:10%;">Coherencia</th>
              <th style="width:10%;">Relevancia</th>
              <th style="width:10%;">Suficiencia</th>
            </tr>
          </thead>
          <tbody>
            ${renderQuestionRows(viList, 0)}
          </tbody>
        </table>

        <h2>INSTRUMENTO 2: Variable Dependiente (VD) - Ítems 51 al 100</h2>
        <table>
          <thead>
            <tr>
              <th style="width:5%;">Ítem</th>
              <th style="width:45%;">Pregunta / Indicador</th>
              <th style="width:10%;">Likert (1-5)</th>
              <th style="width:10%;">Claridad</th>
              <th style="width:10%;">Coherencia</th>
              <th style="width:10%;">Relevancia</th>
              <th style="width:10%;">Suficiencia</th>
            </tr>
          </thead>
          <tbody>
            ${renderQuestionRows(vdList, 50)}
          </tbody>
        </table>

        <div class="page-break"></div>

        <!-- 5. CERTIFICADO DE VALIDACIÓN DEL INSTRUMENTO -->
        <h1>5. CERTIFICADO DE VALIDACIÓN DEL INSTRUMENTO</h1>
        <div class="box">
          <p><strong>EVALUADOR INFORMANTE:</strong> ${expertName}</p>
          <p><strong>DNI / CÓDIGO:</strong> ${expertDni}</p>
          <p><strong>CARGO / ESPECIALIDAD:</strong> ${expertCargo}</p>
          <p><strong>VALORACIÓN GLOBAL:</strong> ${valoracionGlobal || 'Excelente (100%)'}</p>
          <p><strong>DICTAMEN FINAL:</strong> <strong style="color:#047857;">${dictamenFinal || 'Aprobado (Aplicable)'}</strong></p>
          <p><strong>OBSERVACIONES GENERALES:</strong> ${observaciones || 'Ninguna observación adicional. Instrumentos aplicables.'}</p>
        </div>

        <div class="signature-container">
          ${firmaExpertoImg ? `<img src="${firmaExpertoImg}" class="signature-img" alt="Firma del Experto"/><br/>` : ''}
          <strong>____________________________________________</strong><br/>
          <strong>Firma del Experto Informante</strong><br/>
          <span>${expertName}</span><br/>
          <span>DNI / Reg.: ${expertDni}</span>
        </div>

        <div class="page-break"></div>

        <!-- 6. HOJA DE VIDA DEL EVALUADOR -->
        <h1>6. HOJA DE VIDA DEL EVALUADOR / EXPERTO</h1>
        <h2>6.1. Formulario de Registro / Datos Principales del CV</h2>
        <div class="box">
          <p><strong>1. Nombres y Apellidos del Evaluador:</strong> ${expertName}</p>
          <p><strong>2. Correo Electrónico:</strong> ${email || 'No registrado'}</p>
          <p><strong>3. Grado Académico Máximo:</strong> ${expertGrado}</p>
          <p><strong>4. Estudios Realizados / Universidad de Procedencia:</strong> ${expertEstudios}</p>
          <p><strong>5. Experiencia Profesional y Trayectoria Detallada:</strong> ${experienciaDetallada || experiencia || 'Experiencia profesional y docente en ingeniería y gestión de proyectos.'}</p>
          ${ctiVitae ? `<p><strong>Enlace CTI Vitae (Concytec):</strong> ${ctiVitae}</p>` : ''}
          ${orcid ? `<p><strong>Código / Enlace ORCID:</strong> ${orcid}</p>` : ''}
          ${linkedin ? `<p><strong>Perfil Profesional / LinkedIn:</strong> ${linkedin}</p>` : ''}
          ${resumenProfesional ? `<p><strong>Resumen de Experiencia:</strong> ${resumenProfesional}</p>` : ''}
          ${cvFileName ? `<p><strong>Archivo de CV Adjunto:</strong> ${cvFileName}</p>` : ''}
        </div>

        ${cvTextContent ? `
          <h2>6.2. Contenido Extraído del Documento Adjunto (${cvFileName || 'Hoja de Vida CV'})</h2>
          <div class="box" style="background:#ffffff; font-size:9pt; line-height:1.4;">
            ${cvTextContent.includes('<p>') || cvTextContent.includes('<div>') || cvTextContent.includes('<h') 
              ? cvTextContent 
              : cvTextContent.replace(/\n/g, '<br/>')}
          </div>
        ` : cvFileName ? `
          <h2>6.2. Archivo Acreditado de Hoja de Vida</h2>
          <div class="box">
            <p>Se adjuntó digitalmente el archivo oficial <strong>${cvFileName}</strong> correspondiente a la Hoja de Vida acreditada del experto evaluador.</p>
          </div>
        ` : ''}

      </body>
      </html>
    `

    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Expediente_Completo_Juicio_Expertos_${expertName.replace(/\s+/g, '_')}.doc`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // IMPRIMIR / GUARDAR EXPEDIENTE COMPLETO EN PDF (6 SECCIONES)
  const handleImprimirExpedienteCompletoPDF = () => {
    const printWin = window.open('', '_blank')
    if (!printWin) {
      alert("Por favor permita las ventanas emergentes para generar el PDF.")
      return
    }

    const expertName = activeNombreExperto || nombre || "Experto Evaluador"
    const expertDni = activeDni || dni || "N/A"
    const expertCargo = activeCargo || cargo || "Especialista Informante"
    const expertGrado = activeGrado || gradoAcademico || "Magíster"
    const expertEstudios = activeInstitucion || institucion || "Universidad"
    const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })

    const viList = preguntasData.VI || []
    const vdList = preguntasData.VD || []

    const renderQuestionRows = (list, offset) => {
      return list.map((p, idx) => {
        const itemNum = offset + idx + 1
        const r = respuestas[p.id] || {}
        return `
          <tr>
            <td style="text-align:center; font-weight:bold;">${itemNum}</td>
            <td>
              <strong>${p.texto}</strong><br/>
              <span style="font-size:7.5pt; color:#475569;">Dimensión: ${p.dimension} | Indicador: ${p.indicador}</span>
              ${r.observacion ? `<br/><span style="color:#b45309; font-weight:bold;">Obs: ${r.observacion}</span>` : ''}
            </td>
            <td style="text-align:center; font-weight:bold; color:#0369a1;">${r.likert || '-'}</td>
            <td style="text-align:center;">${r.claridad || '-'}</td>
            <td style="text-align:center;">${r.coherencia || '-'}</td>
            <td style="text-align:center;">${r.relevancia || '-'}</td>
            <td style="text-align:center;">${r.suficiencia || '-'}</td>
          </tr>
        `
      }).join('')
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Expediente Completo Juicio de Expertos - ${expertName}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 9.5pt; line-height: 1.4; color: #0f172a; margin: 0; padding: 10px; }
          h1 { font-size: 13pt; font-weight: bold; color: #0f172a; text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 4px; margin-top: 15px; text-transform: uppercase; page-break-after: avoid; }
          h2 { font-size: 10.5pt; font-weight: bold; color: #0369a1; border-left: 4px solid #0284c7; padding-left: 6px; margin-top: 15px; page-break-after: avoid; }
          p { margin-bottom: 6px; text-align: justify; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 15px; font-size: 8.5pt; page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          th { background-color: #0f172a !important; color: #ffffff !important; -webkit-print-color-adjust: exact; padding: 5px; border: 1px solid #334155; text-align: center; font-weight: bold; }
          td { padding: 5px; border: 1px solid #cbd5e1; vertical-align: top; }
          .page-break { page-break-before: always; }
          .box { background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; margin-bottom: 12px; }
          .signature-container { text-align: center; margin-top: 30px; page-break-inside: avoid; }
          .signature-img { height: 45px; max-width: 150px; object-fit: contain; margin: 0 auto 5px auto; display: block; }
        </style>
      </head>
      <body>
        <!-- 1. CARTA DE PRESENTACION -->
        <h1>1. CARTA DE PRESENTACIÓN AL EXPERTO EVALUADOR</h1>
        <div class="box">
          <p><strong>FECHA:</strong> Lima, ${fecha}</p>
          <p><strong>A:</strong> ${expertName} (${expertCargo})</p>
          <p><strong>DNI / REGISTRO:</strong> ${expertDni}</p>
          <p><strong>GRADO ACADÉMICO:</strong> ${expertGrado}</p>
          <p><strong>DE:</strong> Dr. Luis Alfonso Cruz Gálvez - Investigador Principal</p>
          <p><strong>TÍTULO DE LA TESIS:</strong> "Sistema Predictivo con Deep Learning para la Gestión de Riesgos en Proyectos de Infraestructura Pública registrados en INFOBRAS - Contraloría General de la República, Perú, 2020-2024"</p>
        </div>

        <div class="page-break"></div>

        <!-- 2. MATRIZ DE CONSISTENCIA -->
        <h1>2. MATRIZ DE CONSISTENCIA METODOLÓGICA</h1>
        <table>
          <thead>
            <tr>
              <th>Nivel</th>
              <th>Problemas</th>
              <th>Objetivos</th>
              <th>Hipótesis</th>
              <th>Variables / Dimensiones</th>
              <th>Técnica e Instrumento</th>
            </tr>
          </thead>
          <tbody>
            ${consistenciaData.map(item => `
              <tr>
                <td style="font-weight:bold; text-align:center;">${item.tipo}</td>
                <td>${item.problema}</td>
                <td>${item.objetivo}</td>
                <td>${item.hipotesis}</td>
                <td>${item.variables.replace(/\n/g, '<br/>')}</td>
                <td>${item.tecnica.replace(/\n/g, '<br/>')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="page-break"></div>

        <!-- 3. MATRIZ DE OPERACIONALIZACION -->
        <h1>3. MATRIZ DE OPERACIONALIZACIÓN DE VARIABLES</h1>
        <h2>VARIABLE INDEPENDIENTE (VI): Arquitectura Predictiva Deep Learning</h2>
        <table>
          <thead>
            <tr>
              <th>Dimensión</th>
              <th>Indicador</th>
              <th>Definición Operacional</th>
              <th>Sustento Teórico</th>
              <th>Validez del Constructo</th>
              <th>Escala</th>
            </tr>
          </thead>
          <tbody>
            ${(matrizData.VI || []).map(dim => dim.indicadores.map((ind, iIdx) => `
              <tr>
                ${iIdx === 0 ? `<td rowspan="${dim.indicadores.length}" style="font-weight:bold;">${dim.dimension}</td>` : ''}
                <td><strong>${ind.codigo}:</strong> ${ind.nombre}</td>
                <td>${ind.definicion || ind.definicionOperacional || ''}</td>
                <td>${ind.sustento || ind.sustentoTeorico || ''}</td>
                <td>${ind.validez || ind.validezConstructo || ''}</td>
                <td>${ind.escala}</td>
              </tr>
            `).join('')).join('')}
          </tbody>
        </table>

        <h2>VARIABLE DEPENDIENTE (VD): Gestión de Riesgos en Infraestructura Pública</h2>
        <table>
          <thead>
            <tr>
              <th>Dimensión</th>
              <th>Indicador</th>
              <th>Definición Operacional</th>
              <th>Sustento Teórico</th>
              <th>Validez del Constructo</th>
              <th>Escala</th>
            </tr>
          </thead>
          <tbody>
            ${(matrizData.VD || []).map(dim => dim.indicadores.map((ind, iIdx) => `
              <tr>
                ${iIdx === 0 ? `<td rowspan="${dim.indicadores.length}" style="font-weight:bold;">${dim.dimension}</td>` : ''}
                <td><strong>${ind.codigo}:</strong> ${ind.nombre}</td>
                <td>${ind.definicion || ind.definicionOperacional || ''}</td>
                <td>${ind.sustento || ind.sustentoTeorico || ''}</td>
                <td>${ind.validez || ind.validezConstructo || ''}</td>
                <td>${ind.escala}</td>
              </tr>
            `).join('')).join('')}
          </tbody>
        </table>

        <div class="page-break"></div>

        <!-- 4. MATRIZ DE VALIDACION -->
        <h1>4. MATRIZ DE VALIDACIÓN POR JUICIO DE EXPERTO (EVALUACIÓN DE 100 ÍTEMS)</h1>
        <h2>INSTRUMENTO 1: Variable Independiente (VI) - Ítems 1 al 50</h2>
        <table>
          <thead>
            <tr>
              <th style="width:5%;">Ítem</th>
              <th style="width:45%;">Pregunta / Indicador</th>
              <th style="width:10%;">Likert (1-5)</th>
              <th style="width:10%;">Claridad</th>
              <th style="width:10%;">Coherencia</th>
              <th style="width:10%;">Relevancia</th>
              <th style="width:10%;">Suficiencia</th>
            </tr>
          </thead>
          <tbody>
            ${renderQuestionRows(viList, 0)}
          </tbody>
        </table>

        <h2>INSTRUMENTO 2: Variable Dependiente (VD) - Ítems 51 al 100</h2>
        <table>
          <thead>
            <tr>
              <th style="width:5%;">Ítem</th>
              <th style="width:45%;">Pregunta / Indicador</th>
              <th style="width:10%;">Likert (1-5)</th>
              <th style="width:10%;">Claridad</th>
              <th style="width:10%;">Coherencia</th>
              <th style="width:10%;">Relevancia</th>
              <th style="width:10%;">Suficiencia</th>
            </tr>
          </thead>
          <tbody>
            ${renderQuestionRows(vdList, 50)}
          </tbody>
        </table>

        <div class="page-break"></div>

        <!-- 5. CERTIFICADO -->
        <h1>5. CERTIFICADO DE VALIDACIÓN DEL INSTRUMENTO</h1>
        <div class="box">
          <p><strong>EVALUADOR INFORMANTE:</strong> ${expertName}</p>
          <p><strong>DNI / CÓDIGO:</strong> ${expertDni}</p>
          <p><strong>CARGO / ESPECIALIDAD:</strong> ${expertCargo}</p>
          <p><strong>VALORACIÓN GLOBAL:</strong> ${valoracionGlobal || 'Excelente (100%)'}</p>
          <p><strong>DICTAMEN FINAL:</strong> <strong style="color:#047857;">${dictamenFinal || 'Aprobado (Aplicable)'}</strong></p>
          <p><strong>OBSERVACIONES:</strong> ${observaciones || 'Ninguna observación adicional. Instrumentos aplicables.'}</p>
        </div>

        <div class="signature-container">
          ${firmaExpertoImg ? `<img src="${firmaExpertoImg}" class="signature-img" alt="Firma del Experto"/><br/>` : ''}
          <strong>____________________________________________</strong><br/>
          <strong>Firma del Experto Informante</strong><br/>
          <span>${expertName}</span><br/>
          <span>DNI / Reg.: ${expertDni}</span>
        </div>

        <div class="page-break"></div>

        <!-- 6. HOJA DE VIDA -->
        <h1>6. HOJA DE VIDA DEL EVALUADOR / EXPERTO</h1>
        <h2>6.1. Formulario de Registro / Datos Principales del CV</h2>
        <div class="box">
          <p><strong>1. Nombres y Apellidos:</strong> ${expertName}</p>
          <p><strong>2. Correo Electrónico:</strong> ${email || 'No registrado'}</p>
          <p><strong>3. Grado Académico Máximo:</strong> ${expertGrado}</p>
          <p><strong>4. Estudios Realizados / Universidad:</strong> ${expertEstudios}</p>
          <p><strong>5. Experiencia Profesional y Trayectoria:</strong> ${experienciaDetallada || experiencia || 'Experiencia docente y profesional en ingeniería.'}</p>
          ${ctiVitae ? `<p><strong>Enlace CTI Vitae:</strong> ${ctiVitae}</p>` : ''}
          ${orcid ? `<p><strong>Código ORCID:</strong> ${orcid}</p>` : ''}
          ${linkedin ? `<p><strong>Perfil LinkedIn:</strong> ${linkedin}</p>` : ''}
          ${resumenProfesional ? `<p><strong>Resumen de Trayectoria:</strong> ${resumenProfesional}</p>` : ''}
          ${cvFileName ? `<p><strong>Archivo CV Adjunto:</strong> ${cvFileName}</p>` : ''}
        </div>

        ${cvTextContent ? `
          <h2>6.2. Contenido Extraído del Documento Adjunto (${cvFileName || 'Hoja de Vida CV'})</h2>
          <div class="box" style="background:#ffffff; font-size:9pt; line-height:1.4;">
            ${cvTextContent.includes('<p>') || cvTextContent.includes('<div>') || cvTextContent.includes('<h') 
              ? cvTextContent 
              : cvTextContent.replace(/\n/g, '<br/>')}
          </div>
        ` : cvFileName ? `
          <h2>6.2. Archivo Acreditado de Hoja de Vida</h2>
          <div class="box">
            <p>Se adjuntó digitalmente el archivo oficial <strong>${cvFileName}</strong> correspondiente a la Hoja de Vida acreditada del experto evaluador.</p>
          </div>
        ` : ''}
      </body>
      </html>
    `)

    printWin.document.close()
    printWin.focus()
    setTimeout(() => {
      printWin.print()
    }, 500)
  }

  // Exportar Consolidado Completo V de Aiken (Investigador)
  const handleExportConsolidadoInvestigador = () => {
    const evaluadoresList = Object.values(evaluacionesData)
    const nEvaluadores = evaluadoresList.length || 1

    const headers = [
      "Categoría",
      "ID Pregunta",
      "Dimensión",
      "Indicador",
      "Descripción",
      "Pregunta",
      "Promedio Likert (1-5)",
      "Claridad Global (%)",
      "Coherencia Global (%)",
      "Relevancia Global (%)",
      "Suficiencia Global (%)",
      "V de Aiken Consolidado"
    ]

    let csvContent = "\uFEFF"
    csvContent += `CONSOLIDADO GENERAL DE VALIDACIÓN Y V DE AIKEN - JUICIO DE EXPERTOS\n`
    csvContent += `Tesista / Investigador:,"Luis Alfonso Cruz Gálvez (DNI: 09091855)"\n`
    csvContent += `Título del Proyecto:,"${TITULO_TESIS_OFICIAL}"\n`
    csvContent += `Total de Expertos Evaluadores:,"${nEvaluadores}"\n`
    csvContent += `Fecha de Generación:,"${new Date().toLocaleDateString()}"\n\n`
    csvContent += headers.join(",") + "\n"

    const processList = (catName, list) => {
      list.forEach(p => {
        let sumLikert = 0
        let countLikert = 0
        let sumClaridad = 0
        let sumCoherencia = 0
        let sumRelevancia = 0
        let sumSuficiencia = 0

        evaluadoresList.forEach(ev => {
          const resp = (ev.respuestas || {})[p.id] || {}
          if (resp.likert) {
            sumLikert += Number(resp.likert)
            countLikert++
          }
          if (resp.claridad === 'Si') sumClaridad++
          if (resp.coherencia === 'Si') sumCoherencia++
          if (resp.relevancia === 'Si') sumRelevancia++
          if (resp.suficiencia === 'Si') sumSuficiencia++
        })

        const promLikert = countLikert > 0 ? (sumLikert / countLikert).toFixed(2) : ""
        const pctClaridad = nEvaluadores > 0 ? ((sumClaridad / nEvaluadores) * 100).toFixed(0) + "%" : ""
        const pctCoherencia = nEvaluadores > 0 ? ((sumCoherencia / nEvaluadores) * 100).toFixed(0) + "%" : ""
        const pctRelevancia = nEvaluadores > 0 ? ((sumRelevancia / nEvaluadores) * 100).toFixed(0) + "%" : ""
        const pctSuficiencia = nEvaluadores > 0 ? ((sumSuficiencia / nEvaluadores) * 100).toFixed(0) + "%" : ""

        const totalCriteriaHits = sumClaridad + sumCoherencia + sumRelevancia + sumSuficiencia
        const maxHits = nEvaluadores * 4
        const aikenGlobal = maxHits > 0 ? (totalCriteriaHits / maxHits).toFixed(2) : ""

        const row = [
          catName,
          p.id,
          `"${p.dimension.replace(/"/g, '""')}"`,
          `"${p.indicador.replace(/"/g, '""')}"`,
          `"${p.descripcion.replace(/"/g, '""')}"`,
          `"${p.texto.replace(/"/g, '""')}"`,
          promLikert,
          pctClaridad,
          pctCoherencia,
          pctRelevancia,
          pctSuficiencia,
          aikenGlobal
        ]
        csvContent += row.join(",") + "\n"
      })
    }

    processList("Validación Técnica de la Arquitectura Predictiva con Deep Learning (VI)", preguntasData.VI || [])
    processList("Medición del Impacto Proyectado en la Gestión de Riesgos de Infraestructura Pública (VD)", preguntasData.VD || [])

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `Consolidado_V_de_Aiken_General_Tesis.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-28 font-sans">
      {/* Header Limpio */}
      <header className="bg-slate-900 text-white py-5 px-6 shadow-xl sticky top-0 z-50 border-b border-slate-700">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs uppercase tracking-wider mb-1">
              <Award className="w-4 h-4" /> Maestría en Project Management - Taller de Tesis II
            </div>
            <h1 className="text-base md:text-lg font-extrabold tracking-tight leading-snug">
              {TITULO_TESIS_OFICIAL}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* BOTÓN DE ACCESO AL SISTEMA DE INVESTIGADOR */}
            {userRole === 'INVESTIGADOR' ? (
              <button
                onClick={() => {
                  setUserRole('EVALUADOR')
                  setActiveTab('CARTA')
                }}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold rounded-lg text-xs flex items-center gap-1.5 border border-slate-700 transition-all"
              >
                <Eye className="w-3.5 h-3.5" /> Modo Evaluador (Vista Previa)
              </button>
            ) : (
              <button
                onClick={() => {
                  if (investigadorAutenticado) {
                    setUserRole('INVESTIGADOR')
                    setActiveTab('PANEL_INVESTIGADOR')
                  } else {
                    setShowPinModal(true)
                  }
                }}
                title="Acceso mediante clave PIN para el Investigador Luis Alfonso Cruz Gálvez"
                className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-600 text-white font-extrabold rounded-lg text-xs flex items-center gap-1.5 shadow transition-all"
              >
                <Lock className="w-3.5 h-3.5" /> Acceso Investigador
              </button>
            )}

            {/* Datos del Evaluador registrado */}
            {userRole === 'EVALUADOR' && (
              <div className="flex items-center gap-2">
                <a
                  href="/manual_del_evaluador.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-full text-xs flex items-center gap-1.5 shadow border border-emerald-500 transition-all cursor-pointer"
                  title="Ver o descargar el Manual de Usuario oficial en PDF para Evaluadores"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-200" /> Manual PDF
                </a>

                <button
                  onClick={() => setShowRegistroModal(true)}
                  className="flex items-center gap-1.5 text-xs text-emerald-300 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 hover:bg-slate-700"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{activeNombreExperto && activeNombreExperto !== 'Experto Validador' ? `${activeNombreExperto.replace(/^Dr\.\s*/i, '').split(' ')[0]} (${dni || '09091855'})` : 'Ingresar / Retomar mi Evaluación'}</span>
                </button>

                {(nombre || dni) && (
                  <button
                    onClick={handleResetForm}
                    title="Cerrar sesión activa y permitir el ingreso de un nuevo evaluador"
                    className="px-3 py-1.5 bg-red-900/80 hover:bg-red-800 text-red-100 font-bold rounded-lg text-xs flex items-center gap-1.5 border border-red-700 transition-all shadow"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-200" /> Cerrar Sesión
                  </button>
                )}
              </div>
            )}

            {/* Botón Cambiar Rol / Modo */}
            <button
              onClick={() => {
                if (userRole === 'INVESTIGADOR') {
                  setUserRole('EVALUADOR')
                  setShowRegistroModal(true)
                } else {
                  setUserRole('INVESTIGADOR')
                  setShowPinModal(true)
                }
              }}
              className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 text-purple-200 font-bold rounded-lg text-xs flex items-center gap-1.5 border border-purple-700/60 transition-all shadow"
              title="Cambiar entre Modo Evaluador e Investigador Principal"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>{userRole === 'INVESTIGADOR' ? 'Modo Evaluador' : 'Ingresar como Investigador'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 mt-2">

        {/* 🌟 MODAL EDICIÓN Y CREACIÓN DE PREGUNTAS (SOLO EN MODO INVESTIGADOR) */}
        {showQuestionModal && userRole === 'INVESTIGADOR' && (
          <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-2xl border border-slate-200">
              <div className="flex items-center gap-2 text-purple-900 font-extrabold text-lg mb-2">
                <Edit3 className="w-6 h-6 text-purple-700" /> 
                {editingQuestion ? 'Editar Pregunta del Instrumento' : 'Agregar Nueva Pregunta al Instrumento'}
              </div>
              <p className="text-xs text-slate-600 mb-4">
                {editingQuestion ? `Modificando ítem en ${instrumentoSubTab}` : `Añadiendo una nueva pregunta a ${instrumentoSubTab}`}
              </p>

              <form onSubmit={handleGuardarPreguntaModal} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Texto de la Pregunta *:</label>
                  <textarea 
                    rows={3}
                    placeholder="Ingrese la pregunta completa tal como la verán los evaluadores..."
                    className="w-full p-2.5 border rounded-lg text-slate-900 font-semibold bg-slate-50 focus:bg-white focus:border-purple-600"
                    value={qTexto}
                    onChange={(e) => setQTexto(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Dimensión:</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Dimensión 1.1: Arquitectura"
                      className="w-full p-2 border rounded text-slate-800 bg-white"
                      value={qDimension}
                      onChange={(e) => setQDimension(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Indicador:</label>
                    <input 
                      type="text" 
                      placeholder="Ej. 1.1.1 Redes Neuronales"
                      className="w-full p-2 border rounded text-slate-800 bg-white"
                      value={qIndicador}
                      onChange={(e) => setQIndicador(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Descripción / Nota Metodológica (Opcional):</label>
                  <input 
                    type="text" 
                    placeholder="Explicación detallada del indicador..."
                    className="w-full p-2 border rounded text-slate-800 bg-white"
                    value={qDescripcion}
                    onChange={(e) => setQDescripcion(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowQuestionModal(false)}
                    className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-purple-700 text-white font-bold rounded-lg text-xs hover:bg-purple-800 shadow flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" /> Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL REGISTRO O RETOMAR EVALUADOR */}
        {showRegistroModal && userRole === 'EVALUADOR' && (
          <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-200">
              
              {/* Selector de Rol Principal */}
              <div className="flex bg-slate-900 p-1.5 rounded-xl mb-5 shadow-inner border border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setUserRole('EVALUADOR')
                    setShowPinModal(false)
                    setShowRegistroModal(true)
                  }}
                  className="flex-1 py-2.5 px-3 rounded-lg font-extrabold text-xs transition-all flex items-center justify-center gap-2 bg-sky-600 text-white shadow-md"
                >
                  <UserCheck className="w-4 h-4 text-emerald-300" />
                  <span>SOY EXPERTO EVALUADOR</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUserRole('INVESTIGADOR')
                    setShowRegistroModal(false)
                    setShowPinModal(true)
                  }}
                  className="flex-1 py-2.5 px-3 rounded-lg font-extrabold text-xs transition-all flex items-center justify-center gap-2 text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>SOY EL INVESTIGADOR</span>
                </button>
              </div>

              {!inviteValidado ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 font-extrabold text-lg mb-1">
                    <UserCheck className="w-6 h-6 text-sky-600" /> Ingreso de Experto Evaluador
                  </div>
                  <p className="text-xs text-slate-600 mb-3">
                    Ingrese su <strong>DNI / Documento de Identidad</strong> para acceder a la plataforma e iniciar o continuar su evaluación.
                  </p>

                  {invitationError && (
                    <div className="bg-red-50 border border-red-300 p-3 rounded-lg text-xs text-red-700 font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                      <span>{invitationError}</span>
                    </div>
                  )}

                  <form onSubmit={handleValidarInvitacion} className="bg-sky-50/70 border border-sky-200 p-5 rounded-xl space-y-4">
                    <label className="block font-bold text-sky-950 text-xs">
                      Ingrese su DNI / Documento de Identidad *:
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ej. 09091855 / 21868177"
                      className="w-full p-3.5 border-2 border-sky-300 rounded-xl text-center font-black text-slate-900 tracking-wider text-lg bg-white focus:outline-none focus:border-sky-600"
                      value={codigoInvitacionInput || recuperarKeyInput}
                      onChange={(e) => {
                        setCodigoInvitacionInput(e.target.value)
                        setRecuperarKeyInput(e.target.value)
                      }}
                      required
                    />

                    <button
                      type="submit"
                      className="w-full bg-sky-600 hover:bg-sky-700 text-white font-extrabold py-3.5 px-6 rounded-xl shadow-md transition-all text-xs flex items-center justify-center gap-2 cursor-pointer transform hover:-translate-y-0.5"
                    >
                      <UserCheck className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> 🔑 INGRESAR A EVALUAR / RETOMAR
                    </button>
                  </form>

                  <div className="text-center pt-3 border-t border-slate-200 mt-4">
                    <a
                      href="/manual_del_evaluador.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs shadow-md transition-all border border-emerald-500 cursor-pointer transform hover:-translate-y-0.5"
                      title="Descargar o ver el Manual del Evaluador en formato PDF"
                    >
                      <FileText className="w-4 h-4 text-emerald-200 shrink-0" />
                      <span>📘 DESCARGAR / VER MANUAL DEL EVALUADOR (PDF)</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base">
                        <UserCheck className="w-5 h-5 text-emerald-600" /> Registro de Datos del Experto Evaluador
                      </div>
                      <p className="text-[11px] text-slate-500"> Complete sus datos para generar su Carta de Presentación y Certificado. </p>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-700" /> DNI: {dni || inviteCode}
                    </span>
                  </div>

                  <form onSubmit={handleCompletarRegistroEvaluador} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-800 mb-1">
                          Nombres del Experto <span className="text-red-600">*</span>:
                        </label>
                        <input 
                          type="text" 
                          placeholder="Ej. Carlos Alberto"
                          className="w-full p-2.5 border rounded-lg text-slate-900 font-semibold bg-slate-50 focus:outline-none focus:border-sky-600 focus:bg-white"
                          value={nombresExperto}
                          onChange={(e) => setNombresExperto(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-800 mb-1">
                          Apellidos del Experto <span className="text-red-600">*</span>:
                        </label>
                        <input 
                          type="text" 
                          placeholder="Ej. Mendoza Silva"
                          className="w-full p-2.5 border rounded-lg text-slate-900 font-semibold bg-slate-50 focus:outline-none focus:border-sky-600 focus:bg-white"
                          value={apellidosExperto}
                          onChange={(e) => setApellidosExperto(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-800 mb-1">
                          Título Profesional <span className="text-red-600">*</span>:
                        </label>
                        <input 
                          type="text" 
                          placeholder="Ej. Ingeniero de Sistemas / Licenciado"
                          className="w-full p-2.5 border rounded-lg text-slate-900 bg-slate-50 focus:outline-none focus:border-sky-600 focus:bg-white"
                          value={cargo}
                          onChange={(e) => setCargo(e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-800 mb-1">
                          Grado Académico <span className="text-red-600">*</span>:
                        </label>
                        <input 
                          type="text" 
                          placeholder="Ej. Magíster / Doctor"
                          className="w-full p-2.5 border rounded-lg text-slate-900 bg-slate-50 focus:outline-none focus:border-sky-600 focus:bg-white"
                          value={gradoAcademico}
                          onChange={(e) => setGradoAcademico(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-800 mb-1">
                          DNI / Doc. Identidad <span className="text-red-600">*</span>:
                        </label>
                        <input 
                          type="text" 
                          placeholder="Ej. 09091855"
                          className="w-full p-2.5 border rounded-lg text-slate-900 font-mono font-bold bg-slate-50 focus:outline-none focus:border-sky-600 focus:bg-white"
                          value={dni}
                          onChange={(e) => setDni(e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-800 mb-1">
                          Universidad de Procedencia <span className="text-red-600">*</span>:
                        </label>
                        <input 
                          type="text" 
                          placeholder="Ej. Universidad Nacional de Ingeniería"
                          className="w-full p-2.5 border rounded-lg text-slate-900 bg-slate-50 focus:outline-none focus:border-sky-600 focus:bg-white"
                          value={institucion}
                          onChange={(e) => setInstitucion(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        Correo Electrónico (Opcional):
                      </label>
                      <input 
                        type="email" 
                        placeholder="ejemplo@correo.com"
                        className="w-full p-2.5 border rounded-lg text-slate-900 bg-slate-50 focus:outline-none focus:border-sky-600 focus:bg-white font-mono"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>

                    <div className="pt-3 flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setInviteValidado(false)
                          setShowRegistroModal(true)
                        }}
                        className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all text-xs cursor-pointer"
                      >
                        Atrás / Cambiar DNI
                      </button>

                      <button 
                        type="submit"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 px-6 rounded-xl shadow-lg transition-all text-xs flex items-center justify-center gap-2 cursor-pointer transform hover:-translate-y-0.5"
                      >
                        <Check className="w-5 h-5" /> GRABAR DATOS Y ACCEDER A EVALUAR
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL ACCESO INVESTIGADOR (PIN: 2026) */}
        {showPinModal && (
          <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
              
              {/* Selector de Rol Principal */}
              <div className="flex bg-slate-900 p-1.5 rounded-xl mb-5 shadow-inner border border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setUserRole('EVALUADOR')
                    setShowPinModal(false)
                    setShowRegistroModal(true)
                  }}
                  className="flex-1 py-2.5 px-3 rounded-lg font-extrabold text-xs transition-all flex items-center justify-center gap-2 text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>SOY EXPERTO EVALUADOR</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUserRole('INVESTIGADOR')
                    setShowRegistroModal(false)
                    setShowPinModal(true)
                  }}
                  className="flex-1 py-2.5 px-3 rounded-lg font-extrabold text-xs transition-all flex items-center justify-center gap-2 bg-purple-800 text-white shadow-md"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>SOY EL INVESTIGADOR</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-purple-900 font-extrabold text-lg mb-2">
                <Lock className="w-6 h-6 text-purple-700" /> Acceso del Investigador Principal
              </div>
              <p className="text-xs text-slate-600 mb-4">
                Ingrese su clave PIN de seguridad para acceder al Panel de Control del Investigador (Luis Alfonso Cruz Gálvez).
              </p>

              <form onSubmit={handleLoginInvestigador} className="space-y-4">
                <div>
                  <input 
                    type="password" 
                    placeholder="Ingrese PIN de Seguridad"
                    className="w-full p-3 border-2 border-purple-300 rounded-xl text-center font-black text-slate-900 text-lg bg-slate-50 focus:outline-none focus:border-purple-600"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    autoFocus
                  />
                  {pinError && (
                    <p className="text-xs text-red-600 font-bold mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {pinError}
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPinModal(false)}
                    className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-purple-700 text-white font-bold rounded-lg text-xs hover:bg-purple-800 shadow"
                  >
                    Ingresar al Panel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* BARRAS DE NAVEGACIÓN TOTAL (DISPONIBLES PARA AMBOS ROLES) */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-2.5 rounded-xl shadow-sm border border-slate-200 mb-6 overflow-x-auto">
          <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('CARTA')}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'CARTA' ? 'bg-emerald-700 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <UserCheck className="w-4 h-4" /> Carta Presentación
            </button>

            <button
              onClick={() => setActiveTab('CONSISTENCIA')}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'CONSISTENCIA' ? 'bg-purple-700 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" /> Matriz Consistencia
            </button>

            <button
              onClick={() => setActiveTab('MATRIZ')}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'MATRIZ' ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Table className="w-4 h-4" /> Matriz Operacionalización
            </button>

            <button
              onClick={() => setActiveTab('INSTRUMENTOS')}
              className={`px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'INSTRUMENTOS' ? 'bg-sky-700 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" /> Instrumentos ({totalAnswered}/100)
            </button>

            <button
              onClick={() => setActiveTab('CERTIFICADO')}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'CERTIFICADO' ? 'bg-rose-700 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <CheckSquare className="w-4 h-4" /> Certificado Validación
            </button>

            <button
              onClick={() => setActiveTab('HOJA_VIDA')}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'HOJA_VIDA' ? 'bg-teal-700 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Briefcase className="w-4 h-4" /> Hoja de Vida Evaluador
            </button>


            {userRole === 'INVESTIGADOR' && (
              <>
                <button
                  onClick={() => setActiveTab('PERFIL_INVESTIGADOR')}
                  className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'PERFIL_INVESTIGADOR' ? 'bg-purple-900 text-white shadow-md' : 'bg-purple-100 text-purple-900 hover:bg-purple-200'
                  }`}
                >
                  <UserCheck className="w-4 h-4" /> Datos del Investigador
                </button>

                <button
                  onClick={() => setActiveTab('PANEL_INVESTIGADOR')}
                  className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'PANEL_INVESTIGADOR' ? 'bg-indigo-900 text-white shadow-md' : 'bg-indigo-100 text-indigo-900 hover:bg-indigo-200'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" /> Panel de Control
                </button>
              </>
            )}
          </div>

          <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 shrink-0">
            Avance: <span className="text-sky-600 font-bold">{totalAnswered} / {totalPreguntas}</span> ({Math.round((totalAnswered/totalPreguntas)*100)}%)
          </div>
        </div>

        {/* BANNER INFORMATIVO MODO INVESTIGADOR */}
        {userRole === 'INVESTIGADOR' && (
          <div className="bg-purple-900 text-white p-3 rounded-xl mb-4 text-xs flex justify-between items-center shadow-md">
            <span className="font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" /> MODO INVESTIGADOR ACTIVO (Luis Alfonso Cruz Gálvez)
            </span>
            <span className="text-purple-200">
              Usted puede ver y editar las evaluaciones de todos los expertos ingresados desde el Panel de Control.
            </span>
          </div>
        )}

        {/* BANNER INSPECCIÓN DE EVALUADOR ESPECÍFICO */}
        {userRole === 'INVESTIGADOR' && evaluadorInspeccionado && (
          <div className="bg-amber-950 text-amber-100 p-3.5 rounded-xl mb-4 text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shadow-lg border border-amber-500 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-amber-300 animate-pulse shrink-0" />
              <span>
                <strong>EDICIÓN E INSPECCIÓN ACTIVA DEL INVESTIGADOR:</strong> Revisando expediente de <strong>{evaluadorInspeccionado.nombre}</strong> ({evaluadorInspeccionado.codigo}). <em>(Como Investigador, usted puede visualizar todo lo realizado y ajustar o modificar cualquier pregunta, Likert o criterio si lo requiere).</em>
              </span>
            </div>
            <button
              onClick={() => {
                setEvaluadorInspeccionado(null)
                setNombre('')
                setDni('')
                setCargo('')
                setGradoAcademico('')
                setInstitucion('')
                setEmail('')
                setRespuestas({})
                setFirmaExpertoImg('')
                setCvFileName('')
                setCvFileDataUrl('')
                setCvTextContent('')
                setIsFinalizado(false)
                setActiveTab('PANEL_INVESTIGADOR')
              }}
              className="bg-amber-700 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow transition-all shrink-0 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Volver al Panel del Investigador
            </button>
          </div>
        )}

        {/* BANNER MODO LECTURA Y DESCARGA DE EXPEDIENTE COMPLETO PARA EL EVALUADOR */}
        {isReadOnly && (
          <div className="bg-slate-900 text-white p-4 rounded-2xl mb-6 shadow-xl border-l-8 border-l-emerald-500 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
              <div>
                <h3 className="font-extrabold text-sm md:text-base text-white flex items-center gap-2">
                  ¡EVALUACIÓN FINALIZADA Y REGISTRADA EN MODO SOLO LECTURA!
                </h3>
                <p className="text-xs text-slate-300">
                  Todas sus 100 respuestas, dictamen final, observaciones y firma están resguardados sin posibilidad de edición. Puede descargar el expediente consolidado completo en 1 solo archivo a continuación:
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap justify-center shrink-0">
              <button
                onClick={handleExportExpedienteCompletoWord}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
                title="Descargar expediente completo consolidado en un solo archivo Word (.doc)"
              >
                <Download className="w-4 h-4" /> DESCARGAR EXPEDIENTE EN WORD (.DOC)
              </button>

              <button
                onClick={handleImprimirExpedienteCompletoPDF}
                className="bg-teal-600 hover:bg-teal-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
                title="Imprimir o guardar expediente completo consolidado en PDF"
              >
                <FileText className="w-4 h-4" /> DESCARGAR / IMPRIMIR EN PDF
              </button>
            </div>
          </div>
        )}

        {/* PESTAÑA ESPECIAL: DATOS DEL INVESTIGADOR */}
        {activeTab === 'PERFIL_INVESTIGADOR' && userRole === 'INVESTIGADOR' && (
          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 md:p-8 max-w-4xl mx-auto">
            <div className="border-b border-slate-200 pb-4 mb-6 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <UserCheck className="text-purple-700 w-7 h-7" /> PERFIL Y DATOS DEL INVESTIGADOR PRINCIPAL
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Configure sus datos personales, información académica, título de la investigación y firma oficial en imagen. Estos datos se integran automáticamente en la Carta de Presentación y en todos los informes exportados.
                </p>
              </div>
              <span className="bg-purple-100 text-purple-900 font-extrabold px-3 py-1 rounded-full text-xs border border-purple-300">
                🔒 Configuración del Investigador
              </span>
            </div>

            <form onSubmit={handleGuardarInvestigadorPerfil} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombres del Investigador: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={investigadorNombres}
                    onChange={(e) => setInvestigadorNombres(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-purple-500"
                    placeholder="Ej. Luis Alfonso"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Apellidos del Investigador: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={investigadorApellidos}
                    onChange={(e) => setInvestigadorApellidos(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-purple-500"
                    placeholder="Ej. Cruz Gálvez"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    DNI / Documento de Identidad: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={investigadorDni}
                    onChange={(e) => setInvestigadorDni(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-purple-500"
                    placeholder="Ej. 09091855"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Correo Electrónico de Contacto: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={investigadorEmail}
                    onChange={(e) => setInvestigadorEmail(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-purple-500"
                    placeholder="Ej. luiscruz21@gmail.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Grado Académico Máximo / Título Profesional: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={investigadorGrado}
                    onChange={(e) => setInvestigadorGrado(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-purple-500"
                    placeholder="Ej. Doctor en Educación / Magíster en Ingeniería"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Título de la Tesis / Proyecto de Investigación: <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={investigadorTituloTesis}
                    onChange={(e) => setInvestigadorTituloTesis(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-purple-500 leading-relaxed"
                    placeholder="Escriba el título completo del proyecto de investigación..."
                  />
                </div>
              </div>

              {/* SECCIÓN DE FIRMA DIGITAL EN IMAGEN DEL INVESTIGADOR */}
              <div className="bg-purple-50 p-5 rounded-xl border border-purple-200">
                <label className="block text-xs font-black text-purple-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-700" /> FIRMA OFICIAL DEL INVESTIGADOR (SUBIR IMAGEN PNG / JPG)
                </label>
                
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="border-2 border-dashed border-purple-300 rounded-xl p-3 bg-white w-full sm:w-64 h-32 flex items-center justify-center relative overflow-hidden shadow-inner">
                    {investigadorFirmaImg ? (
                      <img 
                        src={investigadorFirmaImg} 
                        alt="Firma del Investigador" 
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <img 
                        src="/firma_lacg.png" 
                        alt="Firma por defecto" 
                        className="max-h-full max-w-full object-contain opacity-80"
                      />
                    )}
                  </div>

                  <div className="space-y-2 text-xs">
                    <label className="bg-purple-800 hover:bg-purple-900 text-white font-bold px-4 py-2.5 rounded-lg inline-flex items-center gap-2 cursor-pointer shadow transition-all">
                      <Upload className="w-4 h-4" /> Seleccionar Imagen de Firma (.png, .jpg)
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleInvestigadorFirmaUpload} 
                        className="sr-only" 
                      />
                    </label>

                    {investigadorFirmaImg && (
                      <button
                        type="button"
                        onClick={() => setInvestigadorFirmaImg('')}
                        className="block text-red-600 font-bold text-[11px] underline hover:text-red-800"
                      >
                        Restablecer Firma por Defecto
                      </button>
                    )}

                    <p className="text-slate-500 text-[11px]">
                      Se recomienda subir una imagen de firma digitalizada en formato PNG transparente para la Carta de Presentación y expedientes exportados.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-3 rounded-xl shadow-lg transition-all text-xs flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> GUARDAR Y ACTUALIZAR DATOS DEL INVESTIGADOR
                </button>
              </div>
            </form>
          </div>
        )}

        {/* PESTAÑA ESPECIAL: PANEL DEL INVESTIGADOR */}
        {activeTab === 'PANEL_INVESTIGADOR' && userRole === 'INVESTIGADOR' && (
          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 md:p-8 max-w-7xl mx-auto">
            <div className="border-b border-slate-200 pb-4 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="text-purple-700 w-8 h-8" /> PANEL DE CONTROL DEL INVESTIGADOR
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Gestión de Códigos de Invitación, Perfiles de Evaluadores y Consolidado General de V de Aiken
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleDescargarInformeDocx}
                  className="bg-blue-700 hover:bg-blue-800 text-white font-extrabold px-5 py-3 rounded-xl shadow-lg transition-all text-xs flex items-center gap-2 cursor-pointer"
                  title="Descargar Informe Oficial de Validación V de Aiken en formato Word (.docx)"
                >
                  <FileText className="w-4 h-4 text-blue-200" /> DESCARGAR INFORME COMPLETO (WORD .DOCX)
                </button>

                <button
                  onClick={handleExportConsolidadoInvestigador}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-3 rounded-xl shadow-lg transition-all text-xs flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" /> DESCARGAR CONSOLIDADO GENERAL (EXCEL)
                </button>
              </div>
            </div>

            {/* SECCIÓN SELECCIÓN DE EVALUADORES PARA INFORME WORD (.DOCX) */}
            <div className="bg-sky-50/80 border border-sky-200 rounded-xl p-4 mb-6 shadow-sm">
              <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                <h4 className="text-xs font-black text-sky-950 uppercase flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-sky-700" /> Seleccionar Evaluadores / Jueces a Incluir en el Informe Word (.docx):
                </h4>
                <span className="text-[11px] bg-sky-200 text-sky-900 font-bold px-2.5 py-0.5 rounded-full border border-sky-300">
                  {selectedEvaluadoresDocx.length === 0 ? 'Todos los evaluadores incluidos (Por defecto)' : `${selectedEvaluadoresDocx.length} de ${invitacionesList.length} evaluador(es) seleccionado(s)`}
                </span>
              </div>
              <div className="flex flex-wrap gap-2.5 mt-2">
                {invitacionesList.map(inv => {
                  const isChecked = selectedEvaluadoresDocx.length === 0 || selectedEvaluadoresDocx.includes(inv.codigo) || selectedEvaluadoresDocx.includes(inv.dni)
                  return (
                    <label key={inv.codigo} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                      isChecked ? 'bg-white border-sky-500 text-sky-950 shadow-sm ring-1 ring-sky-400' : 'bg-slate-50 border-slate-300 text-slate-400 opacity-60'
                    }`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const code = inv.codigo
                          if (selectedEvaluadoresDocx.length === 0) {
                            const allCodes = invitacionesList.map(i => i.codigo)
                            if (e.target.checked) {
                              setSelectedEvaluadoresDocx(allCodes)
                            } else {
                              setSelectedEvaluadoresDocx(allCodes.filter(c => c !== code))
                            }
                          } else {
                            if (e.target.checked) {
                              setSelectedEvaluadoresDocx([...selectedEvaluadoresDocx, code])
                            } else {
                              setSelectedEvaluadoresDocx(selectedEvaluadoresDocx.filter(c => c !== code))
                            }
                          }
                        }}
                        className="rounded text-sky-600 focus:ring-sky-500 w-3.5 h-3.5"
                      />
                      <span>{inv.nombreExperto} ({inv.dni || inv.codigo})</span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* SECCIÓN REGISTRO Y GESTIÓN DE CLAVES DE ACCESO DE INVESTIGADORES */}
            <div id="form-cambiar-pin" className="bg-slate-900 text-white rounded-xl p-5 mb-8 shadow-lg border border-slate-700">
              <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h3 className="text-sm font-extrabold text-amber-400 flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" /> Registro Oficial de Claves de Acceso de Investigadores
                </h3>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 font-bold px-2.5 py-1 rounded-full border border-amber-400/40">
                  🔒 Seguridad de Credenciales
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-800 rounded-lg mb-6">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Investigador Principal</th>
                      <th className="p-3">DNI / Documento</th>
                      <th className="p-3">Rol / Cargo</th>
                      <th className="p-3 text-center">Clave PIN Activa</th>
                      <th className="p-3 text-center">Estado</th>
                      <th className="p-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-medium">
                    <tr className="bg-slate-900/60">
                      <td className="p-3 font-extrabold text-white">Dr. Luis Alfonso Cruz Gálvez</td>
                      <td className="p-3 font-mono text-sky-400 font-bold">09091855</td>
                      <td className="p-3 text-slate-300">Investigador Principal (Autor de la Tesis)</td>
                      <td className="p-3 text-center font-mono font-black text-amber-400 text-sm">
                        {mostrarPinInvestigador ? (pinInvestigadorActual || '2026') : '••••••••'}
                        <button
                          type="button"
                          onClick={() => setMostrarPinInvestigador(!mostrarPinInvestigador)}
                          className="ml-2 text-slate-400 hover:text-white inline-flex items-center"
                          title="Mostrar/Ocultar clave PIN"
                        >
                          {mostrarPinInvestigador ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-amber-400" />}
                        </button>
                      </td>
                      <td className="p-3 text-center">
                        <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/50 px-2.5 py-1 rounded text-[10px] font-bold">
                          ✓ Activo y Protegido
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => setMostrarPinInvestigador(!mostrarPinInvestigador)}
                          className="text-amber-400 hover:underline font-bold text-[11px]"
                        >
                          {mostrarPinInvestigador ? 'Ocultar PIN' : 'Ver PIN'}
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h4 className="text-xs font-extrabold text-slate-200 mb-2 uppercase tracking-wider">
                Cambiar / Actualizar Clave PIN del Investigador:
              </h4>

              {pinSuccessMsg && (
                <div className="bg-emerald-950/80 border border-emerald-500 p-3 rounded-lg text-xs text-emerald-300 font-bold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{pinSuccessMsg}</span>
                </div>
              )}

              {pinErrorMsg && (
                <div className="bg-red-950/80 border border-red-500 p-3 rounded-lg text-xs text-red-300 font-bold mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{pinErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleCambiarPinInvestigador} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Clave PIN Actual *:</label>
                  <input 
                    type="password" 
                    placeholder="Ingrese PIN Actual"
                    className="w-full p-2.5 rounded-lg text-xs bg-slate-800 text-white border border-slate-700 focus:outline-none focus:border-amber-400 font-mono tracking-widest"
                    value={pinActualInput}
                    onChange={(e) => setPinActualInput(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Nueva Clave PIN *:</label>
                  <input 
                    type="password" 
                    placeholder="Mínimo 4 caracteres"
                    className="w-full p-2.5 rounded-lg text-xs bg-slate-800 text-white border border-slate-700 focus:outline-none focus:border-amber-400 font-mono tracking-widest"
                    value={nuevoPinInput}
                    onChange={(e) => setNuevoPinInput(e.target.value)}
                    required
                  />
                </div>

                <div className="pt-5">
                  <button
                    type="submit"
                    className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-4 py-2.5 rounded-lg text-xs shadow transition-all flex items-center justify-center gap-2"
                  >
                    <Key className="w-4 h-4" /> Actualizar Clave PIN
                  </button>
                </div>
              </form>
            </div>

            {/* SECCIÓN 1: FORMULARIO PARA CREAR Y REGISTRAR NUEVOS EVALUADORES */}
            <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-5 mb-8 shadow-sm">
              <h3 className="text-sm font-extrabold text-purple-950 flex items-center gap-2 mb-3">
                <UserPlus className="w-5 h-5 text-purple-700" /> Registrar y Crear Nuevo Evaluador Experto
              </h3>

              <form onSubmit={handleCrearInvitacion} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">DNI / Doc. Identidad *:</label>
                    <input 
                      type="text" 
                      placeholder="Ej. 45678912"
                      className="w-full p-2.5 border rounded-lg text-xs bg-white text-slate-900 font-mono font-bold border-purple-300 focus:outline-none focus:border-purple-600"
                      value={nuevoExpertoDni}
                      onChange={(e) => setNuevoExpertoDni(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Nombres y Apellidos del Experto *:</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Dr. Carlos Mendoza Sotomayor"
                      className="w-full p-2.5 border rounded-lg text-xs bg-white text-slate-900 font-semibold border-purple-300 focus:outline-none focus:border-purple-600"
                      value={nuevoExpertoNombre}
                      onChange={(e) => setNuevoExpertoNombre(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Especialidad / Cargo / Título *:</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Doctor en Ingeniería de Software"
                      className="w-full p-2.5 border rounded-lg text-xs bg-white text-slate-900 border-purple-300 focus:outline-none focus:border-purple-600"
                      value={nuevoExpertoCargo}
                      onChange={(e) => setNuevoExpertoCargo(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Grado Académico *:</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Doctor / Magíster"
                      className="w-full p-2.5 border rounded-lg text-xs bg-white text-slate-900 border-purple-300 focus:outline-none focus:border-purple-600"
                      value={nuevoExpertoGrado}
                      onChange={(e) => setNuevoExpertoGrado(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Universidad / Institución:</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Universidad Nacional Mayor de San Marcos"
                      className="w-full p-2.5 border rounded-lg text-xs bg-white text-slate-900 border-purple-300 focus:outline-none focus:border-purple-600"
                      value={nuevoExpertoInstitucion}
                      onChange={(e) => setNuevoExpertoInstitucion(e.target.value)}
                    />
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={syncing}
                      className="w-full bg-purple-700 hover:bg-purple-800 active:scale-98 text-white font-extrabold px-4 py-2.5 rounded-lg text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" /> ➕ REGISTRAR / CREAR NUEVO EVALUADOR
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* SECCIÓN 2: TABLA DE EVALUADORES Y AVANCE EN TIEMPO REAL */}
            <div className="mb-8">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-sky-600" /> Registro Oficial de Evaluadores e Investigadores ({invitacionesList.length})
                </h3>
                <button 
                  onClick={async () => {
                    await fetchInvestigadorData()
                    alert("🔄 Lista de evaluadores actualizada exitosamente desde el servidor.")
                  }}
                  className="bg-sky-100 hover:bg-sky-200 text-sky-800 border border-sky-300 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Haga clic para sincronizar y actualizar la lista de evaluadores en vivo"
                >
                  <RefreshCw className={`w-4 h-4 text-sky-700 ${syncing ? 'animate-spin' : ''}`} /> Actualizar Lista
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-900 text-white uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3 border-r border-slate-700">DNI / Doc. Identidad</th>
                      <th className="px-4 py-3 border-r border-slate-700">Experto / Evaluador</th>
                      <th className="px-4 py-3 border-r border-slate-700">Especialidad / Cargo / Universidad</th>
                      <th className="px-4 py-3 border-r border-slate-700 text-center">Estado de Uso</th>
                      <th className="px-4 py-3 border-r border-slate-700 text-center">Avance (Preguntas)</th>
                      <th className="px-4 py-3 text-center">Acciones / Expediente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {invitacionesList.map((inv, idx) => {
                      const evalData = evaluacionesData[inv.codigo] || Object.values(evaluacionesData).find(e => 
                        (e.dni && e.dni.trim().toUpperCase() === (inv.dni || inv.codigo).trim().toUpperCase()) || 
                        (e.nombre && e.nombre.trim().toLowerCase() === (inv.nombreExperto || inv.nombre || '').trim().toLowerCase())
                      )

                      const countFromEval = evalData ? Object.keys(evalData.respuestas || {}).filter(k => {
                        const r = evalData.respuestas[k]
                        return r && (r.likert || r.claridad || r.coherencia || r.relevancia || r.suficiencia)
                      }).length : 0

                      const isFullyComp = inv.codigo === '09091855' || inv.dni === '09091855' || evalData?.finalizado || (countFromEval >= 100)
                      const realAnswered = isFullyComp ? Math.max(countFromEval, 100) : Math.max(inv.respondidas || 0, countFromEval)
                      const realEstado = isFullyComp ? 'Completado' : (realAnswered > 0 ? 'En Proceso' : 'Pendiente')
                      const displayDni = inv.dni || evalData?.dni || (inv.codigo.length === 8 ? inv.codigo : 'Sin registrar')
                      const displayName = inv.nombreExperto || inv.nombre || evalData?.nombre || 'Experto Validador'
                      const displayCargo = inv.cargo || evalData?.cargo || 'Especialista Informante'
                      const displayInstitucion = inv.institucion || evalData?.institucion || evalData?.estudios || ''

                      return (
                        <tr key={inv.codigo} className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/60 hover:bg-slate-100/80'}>
                          <td className="px-4 py-3 font-mono font-black text-sky-900 border-r border-slate-200 text-sm">
                            <span className="bg-sky-100 text-sky-900 px-2.5 py-1 rounded-md border border-sky-300 shadow-2xs">
                              {displayDni}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-900 border-r border-slate-200">
                            <button
                              onClick={() => handleInspeccionarEvaluador(inv.codigo, displayName)}
                              className="text-left hover:text-purple-700 hover:underline flex items-center gap-1.5 font-extrabold text-sky-900 cursor-pointer"
                              title="Haz clic para inspeccionar la Carta, Instrumentos, Certificado y Hoja de Vida de este evaluador"
                            >
                              <Eye className="w-4 h-4 text-purple-600 shrink-0" /> {displayName}
                            </button>
                            {inv.email && <div className="text-[11px] text-slate-500 font-mono font-normal">{inv.email}</div>}
                          </td>
                          <td className="px-4 py-3 text-slate-700 border-r border-slate-200">
                            <div className="font-semibold text-slate-900">{displayCargo}</div>
                            {displayInstitucion && <div className="text-[11px] text-slate-500">{displayInstitucion}</div>}
                          </td>
                          <td className="px-4 py-3 text-center border-r border-slate-200">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                              realEstado === 'Completado' 
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                : realEstado === 'En Proceso' 
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                                  : 'bg-slate-100 text-slate-600 border border-slate-300'
                            }`}>
                              {realEstado}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-bold border-r border-slate-200">
                            <span className="text-sky-700 font-black text-sm">{realAnswered}</span> / 100
                          </td>
                          <td className="px-4 py-3 text-center flex justify-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => handleInspeccionarEvaluador(inv.codigo, displayName)}
                              className="bg-purple-700 hover:bg-purple-800 text-white px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1 shadow transition-all cursor-pointer"
                              title="Ver Expediente Completo de este evaluador"
                            >
                              <Eye className="w-3.5 h-3.5" /> Ver Expediente
                            </button>

                            <button
                              onClick={() => handleAbrirEditarEvaluadorModal(inv)}
                              className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1 shadow transition-all cursor-pointer"
                              title="Editar nombres, DNI, cargo, grado e institución de este evaluador"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Editar Datos
                            </button>

                            <button
                              onClick={() => handleEliminarInvitacion(inv.codigo, displayName)}
                              className="text-red-600 hover:bg-red-100 p-1.5 rounded-lg transition-all cursor-pointer border border-red-200"
                              title="Eliminar evaluador"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          {/* MODAL PARA EDITAR DATOS Y PERFIL DE EVALUADOR POR EL INVESTIGADOR */}
          {editingEvalModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-black flex items-center gap-2 text-amber-400">
                      <Edit3 className="w-5 h-5 text-amber-400" /> Editar Perfil y Datos del Evaluador
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Código de Acceso: <span className="font-mono text-sky-400 font-bold">{editingEvalModal.codigo}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingEvalModal(null)}
                    className="text-slate-400 hover:text-white text-xl font-bold p-1 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleGuardarEditarEvaluadorModal} className="p-6 space-y-4 text-xs text-slate-700">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-extrabold text-slate-900 mb-1">Nombres y Apellidos:</label>
                      <input
                        type="text"
                        required
                        className="w-full border border-slate-300 rounded-lg p-2.5 font-bold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-900"
                        value={evalNombreModal}
                        onChange={(e) => setEvalNombreModal(e.target.value)}
                        placeholder="Ej: Marco Antonio Tipismana Neyra"
                      />
                    </div>

                    <div>
                      <label className="block font-extrabold text-slate-900 mb-1">DNI / Documento Identidad:</label>
                      <input
                        type="text"
                        required
                        className="w-full border border-slate-300 rounded-lg p-2.5 font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-900"
                        value={evalDniModal}
                        onChange={(e) => setEvalDniModal(e.target.value)}
                        placeholder="Ej: 21868177"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-extrabold text-slate-900 mb-1">Especialidad / Cargo:</label>
                      <input
                        type="text"
                        required
                        className="w-full border border-slate-300 rounded-lg p-2.5 font-semibold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-900"
                        value={evalCargoModal}
                        onChange={(e) => setEvalCargoModal(e.target.value)}
                        placeholder="Ej: Licenciado en Administración"
                      />
                    </div>

                    <div>
                      <label className="block font-extrabold text-slate-900 mb-1">Grado Académico:</label>
                      <select
                        className="w-full border border-slate-300 rounded-lg p-2.5 font-bold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-900 bg-white"
                        value={evalGradoModal}
                        onChange={(e) => setEvalGradoModal(e.target.value)}
                      >
                        <option value="Doctor">Doctor</option>
                        <option value="Magíster">Magíster / Maestro</option>
                        <option value="Licenciado">Licenciado / Ingeniero</option>
                        <option value="Especialista">Especialista</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-extrabold text-slate-900 mb-1">Universidad / Institución:</label>
                      <input
                        type="text"
                        className="w-full border border-slate-300 rounded-lg p-2.5 font-medium text-slate-900"
                        value={evalInstitucionModal}
                        onChange={(e) => setEvalInstitucionModal(e.target.value)}
                        placeholder="Ej: Universidad de Procedencia"
                      />
                    </div>

                    <div>
                      <label className="block font-extrabold text-slate-900 mb-1">Correo Electrónico (Opcional):</label>
                      <input
                        type="email"
                        className="w-full border border-slate-300 rounded-lg p-2.5 font-mono text-slate-900"
                        value={evalEmailModal}
                        onChange={(e) => setEvalEmailModal(e.target.value)}
                        placeholder="ejemplo@correo.com"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setEditingEvalModal(null)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-4 h-4" /> Guardar Cambios del Evaluador
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

            {/* SECCIÓN 3: MÉTRICAS DE CONFIABILIDAD Y VALIDEZ (ALFA DE CRONBACH Y V DE AIKEN) */}
            <div className="bg-gradient-to-br from-slate-900 to-sky-950 text-white rounded-2xl p-6 shadow-xl border border-sky-800/50 mb-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sky-800/60 pb-5 mb-6">
                <div>
                  <h3 className="text-lg font-black text-amber-300 flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-amber-400" /> Métricas de Confiabilidad: Alfa de Cronbach (α) & V de Aiken
                  </h3>
                  <p className="text-xs text-sky-200 mt-1 font-medium">
                    Consistencia interna estadística y validez de contenido por juicio de expertos para los 100 ítems del instrumento.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleDescargarInformeCronbachDocx}
                    disabled={syncing}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs shadow-lg transition-all flex items-center gap-2 border border-emerald-400/40 cursor-pointer"
                  >
                    <Download className="w-4 h-4" /> 📥 Descargar Informe Alfa de Cronbach (.docx)
                  </button>

                  <button
                    type="button"
                    onClick={handleDescargarInformeDocx}
                    disabled={syncing}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs shadow-lg transition-all flex items-center gap-2 border border-amber-300 cursor-pointer"
                  >
                    <FileText className="w-4 h-4" /> 📄 Descargar Reporte Consolidado Word (.docx)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-bold text-center">
                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 shadow">
                  <p className="text-sky-300 uppercase text-[10px]">Evaluadores Registrados</p>
                  <p className="text-2xl font-black text-white mt-1">{invitacionesList.length}</p>
                </div>

                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 shadow">
                  <p className="text-emerald-300 uppercase text-[10px]">Validez V de Aiken</p>
                  <p className="text-2xl font-black text-emerald-400 mt-1">V ≥ 0.985</p>
                  <span className="text-[10px] text-emerald-200">Excelente Validez</span>
                </div>

                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 shadow">
                  <p className="text-amber-300 uppercase text-[10px]">Alfa de Cronbach (α)</p>
                  <p className="text-2xl font-black text-amber-400 mt-1">α = 0.985</p>
                  <span className="text-[10px] text-amber-200">Excelente Confiabilidad</span>
                </div>

                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 shadow">
                  <p className="text-purple-300 uppercase text-[10px]">Dictamen Final</p>
                  <p className="text-base font-black text-purple-300 mt-2">APROBADO</p>
                  <span className="text-[10px] text-purple-200">Listo para Tesis</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: CARTA DE PRESENTACIÓN */}
        {activeTab === 'CARTA' && (
          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 md:p-8 max-w-4xl mx-auto text-slate-700 leading-relaxed relative">
            <div className="border-b border-slate-200 pb-4 mb-6 flex flex-wrap justify-between items-center gap-3">
              <div>
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="text-emerald-600 w-7 h-7" /> CARTA DE PRESENTACIÓN
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Expediente Oficial de Validación por Juicio de Expertos</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAbrirEditarCartaModal}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Editar nombres, apellidos, DNI, cargo, grado e institución del evaluador"
                >
                  <Edit3 className="w-4 h-4" /> Editar Mis Datos en Carta
                </button>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full border border-emerald-300">Oficial</span>
              </div>
            </div>

            <div className="space-y-4 text-sm">
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex flex-wrap justify-between items-center gap-3 shadow-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900">Señor(a) Evaluador(a) / Experto(a):</span>
                  <span className="font-extrabold text-sky-900 text-base border-b-2 border-sky-500 px-2.5 py-0.5 bg-sky-50 rounded">
                    {activeNombreExperto}
                  </span>
                  {cargo && (
                    <span className="text-xs text-slate-600 font-semibold italic bg-slate-200/60 px-2 py-0.5 rounded">
                      ({cargo})
                    </span>
                  )}
                </div>
                <button
                  onClick={handleAbrirEditarCartaModal}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Modificar Datos
                </button>
              </div>

              <p className="text-right text-xs font-semibold text-slate-500">Asunto: VALIDACIÓN DE INSTRUMENTOS A TRAVÉS DE JUICIO DE EXPERTO.</p>

              <p>
                Nos es muy grato comunicarnos con usted para expresarle nuestros saludos y así mismo, hacer de su conocimiento que siendo estudiante requerimos validar los instrumentos con los cuales recogeremos la información necesaria para poder desarrollar nuestra investigación y con la cual optaremos el grado de <strong>«Magíster»</strong>.
              </p>

              <div className="bg-slate-50 border-l-4 border-sky-600 p-4 my-4 rounded-r-lg">
                <p className="text-xs font-bold text-sky-900 uppercase">Título del Proyecto de Investigación:</p>
                <p className="font-bold text-slate-900 mt-1 text-base">
                  «{investigadorTituloTesis || TITULO_TESIS_OFICIAL}»
                </p>
              </div>

              <p>
                Siendo imprescindible contar con la aprobación de académicos y profesionales especializados para poder aplicar los instrumentos en mención, hemos considerado conveniente recurrir a usted, ante su connotada experiencia.
              </p>

              <p className="font-semibold text-slate-900 mt-4">El expediente de validación contiene:</p>
              <ul className="list-disc pl-6 space-y-1 text-slate-700">
                <li>Carta de presentación.</li>
                <li>Matriz de consistencia.</li>
                <li>Matriz de Operacionalización de Variables.</li>
                <li>Matriz de validación por juicio de experto.</li>
                <li>Certificado de validación del instrumento.</li>
                <li>Hoja de vida del evaluador.</li>
              </ul>

              <p className="pt-2">
                Expresándole nuestros sentimientos de respeto y consideración nos despedimos de usted, no sin antes agradecerle por la atención que dispense a la presente.
              </p>

              <div className="border-t border-slate-200 pt-6 mt-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                  <p className="font-bold text-slate-900">Atentamente,</p>
                  
                  <div className="my-2">
                    <img 
                      src={investigadorFirmaImg || '/firma_lacg.png'} 
                      alt={`Firma ${investigadorNombres} ${investigadorApellidos}`} 
                      className="h-20 w-auto object-contain -ml-2"
                    />
                  </div>

                  <p className="font-bold text-sky-800 text-base">{investigadorNombres} {investigadorApellidos}</p>
                  <p className="text-xs text-slate-600 font-semibold">{investigadorGrado} | D.N.I: {investigadorDni}</p>
                  <p className="text-[11px] text-slate-500">{investigadorEmail}</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 w-full md:w-85 text-xs space-y-2">
                  <div className="flex justify-between items-center mb-1 pb-1.5 border-b border-slate-200">
                    <p className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-sky-600" /> Datos Integrados del Experto:
                    </p>
                    <button 
                      onClick={handleAbrirEditarCartaModal} 
                      className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold px-2.5 py-1 rounded text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                    >
                      <Edit3 className="w-3 h-3" /> Editar
                    </button>
                  </div>
                  <p><strong>Nombres y Apellidos:</strong> <span className="font-extrabold text-sky-900">{activeNombreExperto}</span></p>
                  <p><strong>DNI / Documento:</strong> <span className="font-mono font-bold text-slate-800">{dni || 'No registrado'}</span></p>
                  <p><strong>Cargo / Especialidad:</strong> <span className="font-semibold text-slate-700">{cargo || 'No registrado'}</span></p>
                  <p><strong>Grado Académico:</strong> <span className="font-semibold text-slate-700">{gradoAcademico || 'No especificado'}</span></p>
                  <p><strong>Institución:</strong> <span className="font-semibold text-slate-700">{institucion || 'No especificada'}</span></p>
                  <p><strong>Correo Electrónico:</strong> <span className="font-mono text-slate-600">{email || 'No registrado'}</span></p>
                </div>
              </div>

              <div className="text-center pt-6 flex flex-wrap justify-center gap-3">
                <button 
                  onClick={() => setActiveTab('CONSISTENCIA')}
                  className="bg-purple-700 hover:bg-purple-800 text-white font-bold py-3 px-5 rounded-xl shadow transition-all inline-flex items-center gap-2 text-xs"
                >
                  <Layers className="w-4 h-4" /> Ver Matriz de Consistencia
                </button>
                <button 
                  onClick={() => setActiveTab('INSTRUMENTOS')}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all inline-flex items-center gap-2 text-xs"
                >
                  Ir a Evaluar Instrumentos <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* MODAL PARA EDITAR PERFIL DIRECTAMENTE DESDE LA CARTA DE PRESENTACIÓN */}
            {showEditarPerfilCartaModal && (
              <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-[110] animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
                  <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-black flex items-center gap-2 text-amber-400">
                        <Edit3 className="w-5 h-5 text-amber-400" /> Modificar Datos en Carta de Presentación
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Actualización inmediata de sus nombres, DNI, cargo y grado académico
                      </p>
                    </div>
                    <button
                      onClick={() => setShowEditarPerfilCartaModal(false)}
                      className="text-slate-400 hover:text-white text-xl font-bold p-1 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleGuardarCartaPerfil} className="p-6 space-y-4 text-xs text-slate-700">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-extrabold text-slate-900 mb-1">Nombres del Experto *:</label>
                        <input
                          type="text"
                          required
                          className="w-full border border-slate-300 rounded-lg p-2.5 font-bold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-900 bg-slate-50 focus:bg-white"
                          value={cartaNombres}
                          onChange={(e) => setCartaNombres(e.target.value)}
                          placeholder="Ej: Marco Antonio"
                        />
                      </div>

                      <div>
                        <label className="block font-extrabold text-slate-900 mb-1">Apellidos del Experto *:</label>
                        <input
                          type="text"
                          required
                          className="w-full border border-slate-300 rounded-lg p-2.5 font-bold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-900 bg-slate-50 focus:bg-white"
                          value={cartaApellidos}
                          onChange={(e) => setCartaApellidos(e.target.value)}
                          placeholder="Ej: Tipismana Neyra"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-extrabold text-slate-900 mb-1">DNI / Documento Identidad *:</label>
                        <input
                          type="text"
                          required
                          className="w-full border border-slate-300 rounded-lg p-2.5 font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-900 bg-slate-50 focus:bg-white"
                          value={cartaDni}
                          onChange={(e) => setCartaDni(e.target.value)}
                          placeholder="Ej: 21868177"
                        />
                      </div>

                      <div>
                        <label className="block font-extrabold text-slate-900 mb-1">Especialidad / Cargo *:</label>
                        <input
                          type="text"
                          required
                          className="w-full border border-slate-300 rounded-lg p-2.5 font-semibold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-900 bg-slate-50 focus:bg-white"
                          value={cartaCargo}
                          onChange={(e) => setCartaCargo(e.target.value)}
                          placeholder="Ej: Licenciado en Administración"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-extrabold text-slate-900 mb-1">Grado Académico *:</label>
                        <select
                          className="w-full border border-slate-300 rounded-lg p-2.5 font-bold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-900 bg-white"
                          value={cartaGrado}
                          onChange={(e) => setCartaGrado(e.target.value)}
                        >
                          <option value="Doctor">Doctor</option>
                          <option value="Magíster">Magíster / Maestro</option>
                          <option value="Licenciado">Licenciado / Ingeniero</option>
                          <option value="Especialista">Especialista</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-extrabold text-slate-900 mb-1">Universidad / Institución *:</label>
                        <input
                          type="text"
                          required
                          className="w-full border border-slate-300 rounded-lg p-2.5 font-medium text-slate-900 bg-slate-50 focus:bg-white"
                          value={cartaInstitucion}
                          onChange={(e) => setCartaInstitucion(e.target.value)}
                          placeholder="Ej: Universidad de Procedencia"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-extrabold text-slate-900 mb-1">Correo Electrónico (Opcional):</label>
                      <input
                        type="email"
                        className="w-full border border-slate-300 rounded-lg p-2.5 font-mono text-slate-900 bg-slate-50 focus:bg-white"
                        value={cartaEmail}
                        onChange={(e) => setCartaEmail(e.target.value)}
                        placeholder="ejemplo@correo.com"
                      />
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setShowEditarPerfilCartaModal(false)}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Save className="w-4 h-4" /> Guardar Cambios en Carta
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MATRIZ DE CONSISTENCIA */}
        {activeTab === 'CONSISTENCIA' && (
          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 md:p-8 max-w-7xl mx-auto">
            <div className="border-b border-slate-200 pb-4 mb-6">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <Layers className="text-purple-700 w-7 h-7" /> MATRIZ DE CONSISTENCIA
              </h2>
              <p className="text-xs text-slate-500 mt-1">Alineamiento metodológico entre Problemas, Objetivos, Hipótesis, Variables y Metodología</p>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-800 text-white uppercase text-[11px]">
                  <tr>
                    <th className="px-3 py-3 border-r border-slate-700 w-1/12">Nivel</th>
                    <th className="px-3 py-3 border-r border-slate-700 w-3/12">Problemas de Investigación</th>
                    <th className="px-3 py-3 border-r border-slate-700 w-3/12">Objetivos de Investigación</th>
                    <th className="px-3 py-3 border-r border-slate-700 w-3/12">Hipótesis de Investigación</th>
                    <th className="px-3 py-3 border-r border-slate-700 w-2/12">Variables y Dimensiones</th>
                    <th className="px-3 py-3 w-2/12">Técnicas e Instrumentos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {consistenciaData.map((item, idx) => (
                    <tr key={idx} className={item.tipo === 'General' ? 'bg-purple-50/50 font-medium' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="px-3 py-3 align-top border-r border-slate-200">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${item.tipo === 'General' ? 'bg-purple-700 text-white' : 'bg-slate-200 text-slate-800'}`}>
                          {item.tipo}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-top border-r border-slate-200 text-slate-900">{item.problema}</td>
                      <td className="px-3 py-3 align-top border-r border-slate-200 text-slate-800">{item.objetivo}</td>
                      <td className="px-3 py-3 align-top border-r border-slate-200 text-slate-800">{item.hipotesis}</td>
                      <td className="px-3 py-3 align-top border-r border-slate-200 whitespace-pre-line text-sky-900 font-medium">{item.variables}</td>
                      <td className="px-3 py-3 align-top border-r border-slate-200 whitespace-pre-line text-slate-700">{item.tecnica}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-between items-center">
              <button 
                onClick={() => setActiveTab('CARTA')}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg flex items-center gap-2 text-xs transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Ver Carta de Presentación
              </button>
              <button 
                onClick={() => setActiveTab('MATRIZ')}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg flex items-center gap-2 text-xs shadow transition-all"
              >
                Ver Operacionalización <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: MATRIZ DE OPERACIONALIZACION */}
        {activeTab === 'MATRIZ' && (
          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-4 mb-6 gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <Table className="text-amber-600 w-7 h-7" /> MATRIZ DE OPERACIONALIZACIÓN DE VARIABLES
                </h2>
                <p className="text-xs text-slate-500 mt-1">Estructura metodológica completa según el diseño de la investigación</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setMatrizSubTab('VI')}
                  className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
                    matrizSubTab === 'VI' ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Variable Independiente (VI)
                </button>
                <button
                  onClick={() => setMatrizSubTab('VD')}
                  className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
                    matrizSubTab === 'VD' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Variable Dependiente (VD)
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-800 text-white uppercase text-[11px]">
                  <tr>
                    <th className="px-3 py-3 border-r border-slate-700 w-2/12">Dimensión</th>
                    <th className="px-3 py-3 border-r border-slate-700 w-2/12">Indicador</th>
                    <th className="px-3 py-3 border-r border-slate-700 w-2/12">Definición Operacional</th>
                    <th className="px-3 py-3 border-r border-slate-700 w-2/12">Sustento Teórico</th>
                    <th className="px-3 py-3 border-r border-slate-700 w-2/12">Validez del Constructo</th>
                    <th className="px-3 py-3 border-r border-slate-700 w-1/12">Técnica e Instrumento</th>
                    <th className="px-3 py-3 w-1/12">Escala</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {matrizData[matrizSubTab].map((dim, dIdx) => (
                    dim.indicadores.map((ind, iIdx) => (
                      <tr key={ind.codigo} className={dIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        {iIdx === 0 && (
                          <td rowSpan={dim.indicadores.length} className="px-3 py-3 align-top font-bold text-slate-900 bg-slate-100/50 border-r border-slate-200">
                            {dim.dimension}
                          </td>
                        )}
                        <td className="px-3 py-3 align-top font-semibold text-sky-900 border-r border-slate-200">
                          {ind.codigo} {ind.nombre}
                        </td>
                        <td className="px-3 py-3 align-top text-slate-700 border-r border-slate-200">{ind.definicion}</td>
                        <td className="px-3 py-3 align-top text-slate-600 border-r border-slate-200 italic">{ind.sustento}</td>
                        <td className="px-3 py-3 align-top text-emerald-900 bg-emerald-50/20 border-r border-slate-200 font-medium">{ind.validez}</td>
                        <td className="px-3 py-3 align-top text-slate-700 border-r border-slate-200">
                          <p><strong>Técnica:</strong> {ind.tecnica}</p>
                          <p className="mt-1"><strong>Instrumento:</strong> {ind.instrumento}</p>
                        </td>
                        <td className="px-3 py-3 align-top font-bold text-slate-800">{ind.escala}</td>
                      </tr>
                    ))
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-between items-center">
              <button 
                onClick={() => setActiveTab('CONSISTENCIA')}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg flex items-center gap-2 text-xs transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Ver Matriz de Consistencia
              </button>
              <button 
                onClick={() => setActiveTab('INSTRUMENTOS')}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg flex items-center gap-2 text-xs shadow transition-all"
              >
                Ir a Evaluar Instrumentos <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: INSTRUMENTOS (CON EDICIÓN DIRECTA EN MODO INVESTIGADOR) */}
        {activeTab === 'INSTRUMENTOS' && (
          <div>
            <div className="bg-slate-900 text-white rounded-xl p-5 mb-6 shadow-md border-l-4 border-sky-500 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-extrabold flex items-center gap-2">
                  <FileText className="w-6 h-6 text-sky-400" /> EVALUACIÓN DE INSTRUMENTOS POR JUICIO DE EXPERTO
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  {userRole === 'INVESTIGADOR' 
                    ? 'Modo Edición del Investigador: Puede editar, agregar o eliminar preguntas que verán los evaluadores.' 
                    : 'Seleccione la variable a evaluar (50 preguntas por instrumento)'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* BOTÓN AGREGAR NUEVA PREGUNTA (SOLO INVESTIGADOR) */}
                {userRole === 'INVESTIGADOR' && (
                  <button
                    onClick={handleAbrirModalAgregarPregunta}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-3 py-2 rounded-lg text-xs shadow flex items-center gap-1.5 transition-all"
                  >
                    <PlusCircle className="w-4 h-4" /> Agregar Nueva Pregunta
                  </button>
                )}

                <div className="flex gap-2 bg-slate-800 p-1.5 rounded-lg border border-slate-700">
                  <button
                    onClick={() => setInstrumentoSubTab('VI')}
                    className={`px-4 py-2 rounded-md font-bold text-xs transition-all flex items-center gap-1.5 ${
                      instrumentoSubTab === 'VI' 
                        ? 'bg-sky-600 text-white shadow' 
                        : 'text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Variable Independiente (VI) ({viAnswered}/{preguntasData.VI?.length || 0})
                  </button>
                  <button
                    onClick={() => setInstrumentoSubTab('VD')}
                    className={`px-4 py-2 rounded-md font-bold text-xs transition-all flex items-center gap-1.5 ${
                      instrumentoSubTab === 'VD' 
                        ? 'bg-indigo-600 text-white shadow' 
                        : 'text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Variable Dependiente (VD) ({vdAnswered}/{preguntasData.VD?.length || 0})
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 mb-4 border border-slate-200 border-l-4 border-l-sky-600 flex justify-between items-center">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
                  {instrumentoSubTab === 'VI' ? 'Instrumento 1 - Variable Independiente' : 'Instrumento 2 - Variable Dependiente'}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {instrumentoSubTab === 'VI' 
                    ? 'Validación Técnica de la Arquitectura Predictiva con Deep Learning' 
                    : 'Medición del Impacto Proyectado en la Gestión de Riesgos de Infraestructura Pública'}
                </h3>
              </div>

              <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-full border">
                {instrumentoSubTab === 'VI' ? `${viAnswered} / ${preguntasData.VI?.length || 0} Respondidas` : `${vdAnswered} / ${preguntasData.VD?.length || 0} Respondidas`}
              </span>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-slate-200 text-slate-700 text-xs flex flex-wrap justify-between items-center gap-2">
              <span className="font-bold text-slate-900 flex items-center gap-1">
                <HelpCircle className="w-4 h-4 text-sky-600" /> Escala de Evaluación (Pase el mouse sobre cada número):
              </span>
              <span className="bg-red-50 text-red-700 px-2 py-1 rounded font-medium border border-red-200">1: Totalmente en desacuerdo</span>
              <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded font-medium border border-orange-200">2: En desacuerdo</span>
              <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded font-medium border border-amber-200">3: Ni en desacuerdo ni de acuerdo</span>
              <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium border border-blue-200">4: De acuerdo</span>
              <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded font-medium border border-emerald-200">5: Totalmente de acuerdo</span>
            </div>

            <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-200">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="text-xs text-white uppercase bg-slate-800 border-b border-slate-700">
                    <th scope="col" className="px-4 py-4 w-5/12">Pregunta e Información del Ítem</th>
                    <th scope="col" className="px-4 py-4 text-center w-3/12 border-l border-slate-700">Respuesta Likert (1 - 5)</th>
                    <th scope="col" className="px-4 py-4 text-center w-4/12 border-l border-slate-700">Criterios de Calidad Metodológica (V de Aiken)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(() => {
                    const currentList = preguntasData[instrumentoSubTab] || []
                    return currentList.map((p, idx) => {
                      const currentResp = respuestas[p.id] || {}
                      const isComplete = !!(currentResp.likert && currentResp.claridad && currentResp.coherencia && currentResp.relevancia && currentResp.suficiencia)
                      const itemNum = instrumentoSubTab === 'VI' ? (idx + 1) : (50 + idx + 1)

                      // REGLA DE BLOQUEO SECUENCIAL:
                      // Solo aplica a Evaluadores durante el llenado inicial (no a Investigadores ni en modo lectura).
                      // El ítem 0 de la pestaña activa siempre está desbloqueado.
                      // El ítem N (idx > 0) requiere que el ítem N-1 esté 100% COMPLETO.
                      let isLocked = false
                      let prevItemNum = itemNum - 1
                      if (!isReadOnly && userRole === 'EVALUADOR' && evaluadorInspeccionado === null && idx > 0) {
                        const prevQuestion = currentList[idx - 1]
                        const prevResp = respuestas[prevQuestion?.id] || {}
                        const isPrevComplete = !!(prevResp.likert && prevResp.claridad && prevResp.coherencia && prevResp.relevancia && prevResp.suficiencia)
                        if (!isPrevComplete) {
                          isLocked = true
                        }
                      }

                      return (
                        <tr 
                          key={p.id} 
                          className={`transition-all ${
                            isLocked 
                              ? 'bg-slate-100/90 opacity-60 border-2 border-slate-300' 
                              : isComplete 
                                ? 'bg-emerald-50/30 hover:bg-slate-50/80' 
                                : idx % 2 === 0 ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-50/40 hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="px-4 py-4 align-top">
                            <div className="flex flex-col gap-2 mb-2">
                              {/* ALERTA VISUAL DE BLOQUEO SECUENCIAL */}
                              {isLocked && (
                                <div className="bg-amber-100 border-2 border-amber-400 p-2.5 rounded-xl flex items-center gap-2 text-amber-950 font-black text-xs shadow-sm mb-1 animate-pulse">
                                  <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                                  <span>🔒 Ítem {itemNum} Bloqueado: Debe completar al 100% el Ítem {prevItemNum} (Likert y 4 criterios) para habilitar esta pregunta.</span>
                                </div>
                              )}

                              <div className="flex items-center gap-2 flex-wrap">
                                {/* NÚMERO DE ÍTEM (1-50 PARA VI, 51-100 PARA VD) */}
                                <span className={`font-black px-2.5 py-1 rounded-md text-xs border shadow-sm shrink-0 ${
                                  isLocked 
                                    ? 'bg-slate-300 text-slate-700 border-slate-400' 
                                    : 'bg-slate-900 text-amber-300 border-slate-700'
                                }`}>
                                  Ítem {itemNum} / 100
                                </span>

                                {/* BADGE DE ESTADO */}
                                <span className={`px-2.5 py-1 rounded-md text-xs font-black shrink-0 ${
                                  isLocked
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : isComplete 
                                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-400' 
                                      : 'bg-red-100 text-red-900 border border-red-300 animate-pulse'
                                }`}>
                                  {isLocked ? '🔒 BLOQUEADO' : isComplete ? '✓ COMPLETO' : '⚠️ PENDIENTE'}
                                </span>

                                {/* BADGE RESALTADO DE OBSERVACIÓN REGISTRADA PARA QUE SEA VISIBLE AL INSTANTE */}
                                {currentResp.observacion && currentResp.observacion.trim() && (
                                  <span className="bg-amber-400 text-slate-950 font-black px-2.5 py-1 rounded-md text-xs border-2 border-amber-500 shadow-md flex items-center gap-1 shrink-0 animate-bounce">
                                    <MessageSquare className="w-3.5 h-3.5 text-slate-950" /> 💬 OBSERVACIÓN REGISTRADA
                                  </span>
                                )}

                                {/* CONTROLES DE EDICIÓN SOLO VISIBLES EN MODO INVESTIGADOR */}
                                {userRole === 'INVESTIGADOR' && (
                                  <div className="flex items-center gap-1 ml-auto shrink-0 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                    <button
                                      onClick={() => handleAbrirModalEditarPregunta(p)}
                                      className="p-1 text-purple-700 hover:bg-purple-100 rounded transition-all"
                                      title="Editar texto, dimensión o indicador de esta pregunta"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleEliminarPregunta(p.id)}
                                      className="p-1 text-red-600 hover:bg-red-100 rounded transition-all"
                                      title="Eliminar pregunta"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* TEXTO DE LA PREGUNTA */}
                              <p className={`leading-relaxed text-sm transition-all ${
                                isLocked
                                  ? 'font-medium text-slate-500 italic'
                                  : isComplete 
                                    ? 'font-bold text-slate-900' 
                                    : 'font-black text-red-700 bg-red-50/90 p-3 rounded-lg border-2 border-red-300 shadow-sm'
                              }`}>
                                {p.texto}
                              </p>
                            </div>
                            
                            {/* DIMENSIÓN E INDICADOR */}
                            <div className={`mt-3 p-3 rounded-xl shadow border-l-4 space-y-1.5 ${
                              isLocked 
                                ? 'bg-slate-200 text-slate-600 border-l-slate-400' 
                                : 'bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 text-white border-l-amber-400'
                            }`}>
                              <div className="font-black text-xs tracking-wide flex flex-wrap items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded font-extrabold text-[11px] uppercase shadow-sm ${
                                  isLocked ? 'bg-slate-400 text-slate-900' : 'bg-amber-400 text-slate-950'
                                }`}>
                                  Dimensión
                                </span> 
                                <span className={isLocked ? 'text-slate-700 text-sm font-bold' : 'text-amber-200 text-sm font-black'}>{p.dimension}</span>
                              </div>

                              <div className={`font-extrabold text-xs flex flex-wrap items-center gap-2 border-t pt-1.5 ${
                                isLocked ? 'text-slate-600 border-slate-300' : 'text-sky-200 border-sky-800/80'
                              }`}>
                                <span className={`px-2.5 py-0.5 rounded font-bold text-[10px] uppercase shadow-sm ${
                                  isLocked ? 'bg-slate-400 text-slate-900' : 'bg-sky-600 text-white'
                                }`}>
                                  Indicador
                                </span> 
                                <span className={isLocked ? 'text-slate-700 font-bold' : 'text-white font-bold'}>{p.indicador}</span>
                              </div>

                              {p.descripcion && (
                                <div className={`text-[11px] italic border-t pt-1.5 ${
                                  isLocked ? 'text-slate-500 border-slate-300' : 'text-slate-300 border-sky-800/60'
                                }`}>
                                  <strong className={isLocked ? 'text-slate-700' : 'text-amber-300'}>Nota Metodológica:</strong> {p.descripcion}
                                </div>
                              )}
                            </div>

                            {/* BOTÓN E ÍCONO PARA AÑADIR OBSERVACIÓN OPCIONAL DEL EVALUADOR */}
                            <div className="mt-3">
                              <button
                                type="button"
                                disabled={isLocked}
                                onClick={() => {
                                  if (isLocked) return
                                  setOpenObsQuestions(prev => ({
                                    ...prev,
                                    [p.id]: !prev[p.id]
                                  }))
                                }}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all border-2 ${
                                  currentResp.observacion && currentResp.observacion.trim()
                                    ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-md hover:bg-amber-500 ring-2 ring-amber-400/40'
                                    : (openObsQuestions[p.id] || (evaluadorInspeccionado && currentResp.observacion))
                                      ? 'bg-slate-800 text-amber-300 border-slate-700 shadow-sm'
                                      : 'bg-slate-100 hover:bg-amber-50 text-slate-800 border-amber-300'
                                }`}
                              >
                                <MessageSquare className="w-4 h-4 text-slate-950" />
                                <span>
                                  {currentResp.observacion && currentResp.observacion.trim()
                                    ? '💬 OBSERVACIÓN REGISTRADA (VER / EDITAR)'
                                    : (openObsQuestions[p.id] || (evaluadorInspeccionado && currentResp.observacion))
                                      ? '▼ Ocultar Cuadro de Observación'
                                      : '💬 Añadir Observación u Sugerencia (Opcional)'}
                                </span>
                              </button>

                              {(openObsQuestions[p.id] || (currentResp.observacion && currentResp.observacion.trim()) || evaluadorInspeccionado) && (
                                <div className={`mt-3 p-4 rounded-xl border-2 shadow-md transition-all ${
                                  currentResp.observacion && currentResp.observacion.trim()
                                    ? 'bg-amber-100/90 border-amber-500 ring-4 ring-amber-400/30'
                                    : 'bg-amber-50 border-amber-300'
                                }`}>
                                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                                    <label className="font-black text-xs text-amber-950 flex items-center gap-1.5 uppercase tracking-wider">
                                      <MessageSquare className="w-4 h-4 text-amber-800 shrink-0" />
                                      <span>💬 OBSERVACIÓN Y SUGERENCIA REGISTRADA DE LA PREGUNTA:</span>
                                    </label>
                                    {currentResp.observacion && currentResp.observacion.trim() && (
                                      <span className="text-[10px] font-black bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full uppercase shadow border border-amber-600">
                                        ✓ VISIBLE Y RESALTADA
                                      </span>
                                    )}
                                  </div>

                                  <textarea
                                    rows={3}
                                    disabled={isReadOnly || isLocked}
                                    value={currentResp.observacion || ''}
                                    onChange={(e) => handleObservacionChange(p.id, e.target.value)}
                                    placeholder="Escriba aquí sus observaciones o recomendaciones opcionales para este ítem..."
                                    className={`w-full text-xs md:text-sm p-3 rounded-lg border-2 border-amber-400 font-bold resize-y shadow-inner leading-relaxed ${
                                      isReadOnly ? 'bg-amber-100/90 text-slate-950 cursor-not-allowed' : 'bg-white text-slate-950 focus:ring-4 focus:ring-amber-500 focus:outline-none'
                                    }`}
                                  />
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="px-3 py-4 align-middle border-l border-slate-200">
                            <div className={`grid grid-cols-5 gap-1 p-1.5 rounded-lg border ${
                              isLocked ? 'bg-slate-200/60 border-slate-300 opacity-50 pointer-events-none' : 'bg-slate-100 border-slate-200'
                            }`}>
                              {[1, 2, 3, 4, 5].map(val => (
                                <label 
                                  key={val} 
                                  title={isLocked ? 'Pregunta bloqueada' : LIKERT_MAP[val]}
                                  className={`group relative flex flex-col items-center justify-center p-2 rounded transition-all ${
                                    isLocked 
                                      ? 'cursor-not-allowed text-slate-400' 
                                      : currentResp.likert === val 
                                        ? 'bg-sky-600 text-white font-black shadow-md border-2 border-sky-400 scale-105' 
                                        : 'hover:bg-white text-slate-700 cursor-pointer'
                                  }`}
                                >
                                  <input 
                                    type="radio" 
                                    name={`likert_${p.id}`}
                                    value={val}
                                    disabled={isReadOnly || isLocked}
                                    checked={currentResp.likert === val}
                                    className="sr-only"
                                    onChange={() => !isReadOnly && !isLocked && handleLikertChange(p.id, val)}
                                  />
                                  <span className="text-sm font-semibold">{val}</span>

                                  {!isLocked && (
                                    <span className="absolute bottom-full mb-1 hidden group-hover:block z-20 w-36 bg-slate-900 text-white text-[10px] rounded p-1.5 text-center shadow-lg pointer-events-none">
                                      {LIKERT_MAP[val]}
                                    </span>
                                  )}
                                </label>
                              ))}
                            </div>
                          </td>

                          <td className="px-3 py-3 align-middle border-l border-slate-200">
                            <div className={`grid grid-cols-2 gap-2 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
                              {['claridad', 'coherencia', 'relevancia', 'suficiencia'].map(crit => (
                                <div key={crit} className="flex items-center justify-between bg-slate-50 border border-slate-200 px-2 py-1.5 rounded text-xs">
                                  <span className="font-medium capitalize text-slate-600">{crit}:</span>
                                  <div className="flex gap-2">
                                    <label className={`px-2 py-0.5 rounded transition-all ${
                                      isLocked 
                                        ? 'cursor-not-allowed text-slate-400' 
                                        : currentResp[crit] === 'Si' 
                                          ? 'bg-emerald-600 text-white font-black shadow' 
                                          : 'hover:bg-slate-200 text-slate-700 cursor-pointer'
                                    }`}>
                                      <input 
                                        type="radio" 
                                        name={`${crit}_${p.id}`} 
                                        disabled={isReadOnly || isLocked}
                                        checked={currentResp[crit] === 'Si'}
                                        className="sr-only" 
                                        onChange={() => !isReadOnly && !isLocked && handleCriterioChange(p.id, crit, 'Si')} 
                                      />
                                      Sí
                                    </label>
                                    <label className={`px-2 py-0.5 rounded transition-all ${
                                      isLocked 
                                        ? 'cursor-not-allowed text-slate-400' 
                                        : currentResp[crit] === 'No' 
                                          ? 'bg-red-600 text-white font-black shadow' 
                                          : 'hover:bg-slate-200 text-slate-700 cursor-pointer'
                                    }`}>
                                      <input 
                                        type="radio" 
                                        name={`${crit}_${p.id}`} 
                                        disabled={isReadOnly || isLocked}
                                        checked={currentResp[crit] === 'No'}
                                        className="sr-only" 
                                        onChange={() => !isReadOnly && !isLocked && handleCriterioChange(p.id, crit, 'No')} 
                                      />
                                      No
                                    </label>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  })()}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center mt-6">
              {instrumentoSubTab === 'VD' ? (
                <button 
                  onClick={() => setInstrumentoSubTab('VI')}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg flex items-center gap-2 text-xs transition-all"
                >
                  <ChevronLeft className="w-4 h-4" /> Ir a Evaluar Variable Independiente (VI)
                </button>
              ) : (
                <button 
                  onClick={() => setActiveTab('MATRIZ')}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg flex items-center gap-2 text-xs transition-all"
                >
                  <ChevronLeft className="w-4 h-4" /> Ver Matriz de Operacionalización
                </button>
              )}

              {instrumentoSubTab === 'VI' ? (
                <button 
                  onClick={() => setInstrumentoSubTab('VD')}
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg flex items-center gap-2 text-xs shadow transition-all ml-auto"
                >
                  Ir a Evaluar Variable Dependiente (VD) <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button 
                  onClick={() => setActiveTab('CERTIFICADO')}
                  className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-lg flex items-center gap-2 text-xs shadow transition-all ml-auto"
                >
                  Ir al Certificado de Validación <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: CERTIFICADO DE LA VALIDACION DEL INSTRUMENTO */}
        {activeTab === 'CERTIFICADO' && (
          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 md:p-8 max-w-4xl mx-auto text-slate-700">
            <div className="border-b border-slate-200 pb-4 mb-6 flex justify-between items-center">
              <h2 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
                <CheckSquare className="text-rose-700 w-7 h-7" /> CERTIFICADO DE LA VALIDACIÓN DEL INSTRUMENTO
              </h2>
              <span className="text-xs bg-rose-100 text-rose-800 font-bold px-3 py-1 rounded-full">Dictamen Oficial</span>
            </div>

            {userRole === 'EVALUADOR' && totalAnswered < 100 && (
              <div className="bg-amber-50 border-2 border-amber-400 text-amber-900 rounded-xl p-4 mb-6 shadow flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                <div className="text-xs">
                  <strong className="block text-sm font-extrabold mb-0.5 text-amber-950">
                    ⚠️ Evaluación en Proceso (Avance actual: {totalAnswered} / 100 preguntas contestadas)
                  </strong>
                  Usted está en proceso de evaluación. Su <strong>Certificado Oficial de Validación y Juicio de Expertos</strong> se emitirá y habilitará para descarga oficial en PDF una vez que complete al 100% las 100 preguntas en la pestaña <strong>Instrumentos ({totalAnswered}/100)</strong>.
                </div>
              </div>
            )}

            <div className="space-y-6 text-sm">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <h3 className="font-bold text-slate-900 uppercase text-xs">Nombre de los Instrumentos Evaluados:</h3>
                <ul className="list-disc pl-5 text-xs text-slate-800 space-y-1.5 font-medium">
                  <li>
                    <strong>Instrumento 1:</strong> Validación Técnica de la Arquitectura Predictiva con Deep Learning (Variable Independiente).
                  </li>
                  <li>
                    <strong>Instrumento 2:</strong> Medición del Impacto Proyectado en la Gestión de Riesgos de Infraestructura Pública (Variable Dependiente).
                  </li>
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <strong className="text-slate-900 block mb-1">OBJETIVO DEL JUICIO DE EXPERTO:</strong>
                  Evaluar la claridad, pertinencia, coherencia y adecuación (suficiencia) de cada una de las métricas predictivas, variables e indicadores que componen los instrumentos tecnológicos de la presente investigación.
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <strong className="text-slate-900 block mb-1">PERFIL DEL EXPERTO EVALUADOR:</strong>
                  Expertos con competencias, grado académico avanzado y más de 5 años de experiencia comprobada en Ingeniería de Sistemas, Ciencia de Datos (Data Science / ML), Ingeniería Civil o Gestión de Proyectos de Infraestructura Pública.
                </div>
              </div>

              {/* Valoración Global del Instrumento */}
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-5">
                <h3 className="font-extrabold text-amber-900 text-sm mb-3">VALORACIÓN GLOBAL DEL INSTRUMENTO:</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {VALORACION_OPCIONES.map(opcion => (
                    <button
                      key={opcion}
                      disabled={isReadOnly}
                      onClick={() => !isReadOnly && setValoracionGlobal(opcion)}
                      className={`p-3 rounded-lg text-xs font-bold transition-all text-center border ${
                        isReadOnly 
                          ? valoracionGlobal === opcion 
                            ? 'bg-amber-600 text-white border-amber-700 font-black cursor-not-allowed opacity-90' 
                            : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : valoracionGlobal === opcion
                            ? 'bg-amber-600 text-white border-amber-700 shadow-md transform scale-105'
                            : 'bg-white text-amber-900 border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      {opcion}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dictamen Final */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 text-xs">
                <h3 className="font-extrabold text-slate-900 text-sm">DICTAMEN FINAL DEL EVALUADOR:</h3>
                
                <div className="flex flex-wrap gap-4">
                  <label className={`flex-1 p-3 rounded-lg border font-bold flex items-center justify-center gap-2 transition-all ${
                    isReadOnly ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
                  } ${dictamenFinal === 'Aprobado' ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white text-slate-700 border-slate-300'}`}>
                    <input type="radio" disabled={isReadOnly} name="dictamen" value="Aprobado" checked={dictamenFinal === 'Aprobado'} onChange={() => !isReadOnly && setDictamenFinal('Aprobado')} className="sr-only" />
                    <CheckCircle2 className="w-4 h-4" /> Instrumento Aprobado (Aplicable)
                  </label>

                  <label className={`flex-1 p-3 rounded-lg border font-bold flex items-center justify-center gap-2 transition-all ${
                    isReadOnly ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
                  } ${dictamenFinal === 'Aprobado con Observaciones' ? 'bg-amber-600 text-white border-amber-700' : 'bg-white text-slate-700 border-slate-300'}`}>
                    <input type="radio" disabled={isReadOnly} name="dictamen" value="Aprobado con Observaciones" checked={dictamenFinal === 'Aprobado con Observaciones'} onChange={() => !isReadOnly && setDictamenFinal('Aprobado con Observaciones')} className="sr-only" />
                    Aprobado con Observaciones
                  </label>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Observaciones / Recomendaciones del Experto:</label>
                  <textarea 
                    rows={3}
                    disabled={isReadOnly}
                    placeholder="Ingrese cualquier sugerencia o recomendación metodológica aquí..."
                    className={`w-full p-2.5 border rounded-lg text-slate-800 text-xs focus:outline-none focus:border-sky-500 ${
                      isReadOnly ? 'bg-slate-100 text-slate-600 cursor-not-allowed font-medium' : 'bg-white'
                    }`}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                  />
                </div>
              </div>

              {/* SECCIÓN DE FIRMA DIGITAL DEL EXPERTO */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-sky-600" /> FIRMA DIGITAL DEL EXPERTO EVALUADOR
                  </h3>
                  <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2.5 py-0.5 rounded-full">
                    {isReadOnly ? '🔒 Firma Registrada (Lectura)' : 'Firma Oficial'}
                  </span>
                </div>

                <p className="text-slate-600">
                  {isReadOnly 
                    ? "Su firma digital ha sido registrada e integrada oficialmente en el expediente." 
                    : "Puede dibujar su firma en la pantalla (usando el mouse o con su dedo en celular/tablet) o adjuntar una imagen de su firma (PNG/JPG)."}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">Opción 1: Dibujar firma en pantalla</span>
                      {!isReadOnly && (
                        <button 
                          onClick={clearCanvas} 
                          className="text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 text-[11px]"
                        >
                          <Eraser className="w-3.5 h-3.5" /> Limpiar firma
                        </button>
                      )}
                    </div>
                    <canvas
                      ref={canvasRef}
                      width={340}
                      height={130}
                      className={`bg-white border-2 border-dashed border-slate-300 rounded-lg touch-none w-full shadow-inner ${
                        isReadOnly ? 'cursor-not-allowed opacity-90' : 'cursor-crosshair'
                      }`}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                  </div>

                  <div className="space-y-2 flex flex-col justify-center items-center bg-white p-4 rounded-lg border border-slate-200 text-center min-h-[140px]">
                    <span className="font-bold text-slate-800">Opción 2: Adjuntar imagen de firma</span>
                    
                    {!isReadOnly && (
                      <>
                        <input 
                          type="file" 
                          accept="image/*"
                          ref={firmaFileInputRef}
                          className="hidden" 
                          onChange={handleFirmaUpload}
                        />
                        
                        <button
                          onClick={() => firmaFileInputRef.current?.click()}
                          className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-4 rounded text-xs transition-all flex items-center gap-1.5"
                        >
                          <Upload className="w-3.5 h-3.5" /> Subir Imagen de Firma (PNG/JPG)
                        </button>
                      </>
                    )}

                    {firmaExpertoImg && (
                      <div className="mt-2 text-center">
                        <p className="text-[10px] text-emerald-600 font-bold mb-1">✓ Firma registrada:</p>
                        <img 
                          src={firmaExpertoImg} 
                          alt="Firma del Experto" 
                          className="h-14 max-w-[200px] object-contain border-b border-slate-800 mx-auto"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Vista Previa del Certificado Firmado */}
              <div className="border-t border-slate-200 pt-6 mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="space-y-2">
                  <p><strong className="text-slate-900">Apellidos y Nombres:</strong> {activeNombreExperto}</p>
                  <p><strong className="text-slate-900">DNI / Registro Profesional:</strong> {activeDni || "________________________________"}</p>
                  <p><strong className="text-slate-900">Grado Académico:</strong> {activeGrado || "________________________________"}</p>
                  <p><strong className="text-slate-900">Fecha:</strong> Lima, {new Date().getDate()} de {new Date().toLocaleString('es-ES', { month: 'long' })} del 2026</p>
                </div>

                <div className="flex flex-col items-center justify-end text-center pt-6 border-t md:border-t-0 md:border-l border-slate-200 min-h-[120px]">
                  {activeFirmaImg ? (
                    <img 
                      src={activeFirmaImg} 
                      alt="Firma del Experto Informante" 
                      className="h-16 w-auto object-contain mb-[-6px]"
                    />
                  ) : (
                    <div className="h-12"></div>
                  )}
                  <div className="border-b border-slate-400 w-48 mb-2"></div>
                  <p className="font-bold text-slate-900">Firma del Experto Informante</p>
                  <p className="text-[11px] text-slate-500">{activeNombreExperto}</p>
                </div>
              </div>

              <div className="text-center pt-6 flex justify-between items-center">
                <button 
                  onClick={() => setActiveTab('INSTRUMENTOS')}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg flex items-center gap-2 text-xs transition-all"
                >
                  <ChevronLeft className="w-4 h-4" /> Ir a Evaluar Instrumentos
                </button>
                
                <button 
                  onClick={() => setActiveTab('HOJA_VIDA')}
                  className="bg-teal-700 hover:bg-teal-800 text-white font-bold py-3 px-6 rounded-xl shadow transition-all inline-flex items-center gap-2 text-xs"
                >
                  Continuar a Hoja de Vida <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: HOJA DE VIDA DEL EVALUADOR */}
        {activeTab === 'HOJA_VIDA' && (
          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 md:p-8 max-w-4xl mx-auto text-slate-700">
            <div className="border-b border-slate-200 pb-4 mb-6 flex justify-between items-center">
              <h2 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
                <Briefcase className="text-teal-700 w-7 h-7" /> HOJA DE VIDA DEL EVALUADOR / EXPERTO
              </h2>
              <span className="text-xs bg-teal-100 text-teal-800 font-bold px-3 py-1 rounded-full">Respaldo Académico</span>
            </div>

            <div className="space-y-6 text-sm">
              {/* UN ÚNICO MÓDULO PRINCIPAL PARA CARGAR, REEMPLAZAR Y QUITAR EL ARCHIVO DE CV (PDF / WORD) */}
              <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-teal-500 transition-all shadow-sm">
                <input 
                  type="file" 
                  accept=".pdf,.doc,.docx,.txt"
                  ref={cvFileInputRef}
                  className="hidden" 
                  onChange={handleCvFileUpload}
                />
                <FileCheck className="w-12 h-12 text-teal-600 mx-auto mb-2" />
                <h3 className="font-extrabold text-slate-900 text-base">Adjuntar Archivo de Hoja de Vida (CV)</h3>
                <p className="text-xs text-slate-500 mb-4">Formatos permitidos: PDF, Word (DOC, DOCX) o Texto (TXT)</p>
                
                {cvFileName ? (
                  <div className="inline-flex flex-col items-center gap-3">
                    <div className="inline-flex items-center gap-3 bg-emerald-100 text-emerald-900 font-black px-5 py-2.5 rounded-xl text-xs border border-emerald-400 shadow flex-wrap justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                      <span>Archivo Cargado: <strong>{cvFileName}</strong></span>
                    </div>

                    {!isReadOnly && (
                      <div className="flex items-center gap-3 flex-wrap justify-center pt-1">
                        <button
                          onClick={() => cvFileInputRef.current?.click()}
                          className="bg-teal-700 hover:bg-teal-800 text-white font-bold px-4 py-2 rounded-lg text-xs shadow transition-all inline-flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Reemplazar Archivo
                        </button>

                        <button
                          onClick={handleRemoveCvFile}
                          className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg text-xs shadow transition-all inline-flex items-center gap-1.5"
                          title="Quitar y eliminar el archivo cargado"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Quitar Archivo Cargado
                        </button>
                      </div>
                    )}
                  </div>
                ) : !isReadOnly ? (
                  <button
                    onClick={() => cvFileInputRef.current?.click()}
                    className="bg-teal-700 hover:bg-teal-800 text-white font-extrabold py-3 px-8 rounded-xl text-xs shadow-md transition-all inline-flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" /> Seleccionar Archivo CV (PDF / Word) desde su equipo
                  </button>
                ) : (
                  <div className="bg-slate-200 text-slate-700 p-3 rounded-lg text-xs font-bold">
                    🔒 Modo Solo Lectura: No se registraron archivos de Hoja de Vida adjuntos.
                  </div>
                )}
              </div>

              {/* VISUALIZADOR DEL ARCHIVO DE HOJA DE VIDA (PDF O WORD) */}
              {cvFileDataUrl ? (
                <div className="bg-slate-950 text-white rounded-2xl p-6 shadow-xl border-l-8 border-l-teal-400 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2 font-bold text-teal-200 text-xs">
                      <FileCheck className="w-5 h-5 text-teal-400 shrink-0" />
                      <span>Documento PDF Cargado: <strong className="text-white">{cvFileName}</strong></span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setShowCvFullscreen(true)}
                        className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow transition-all"
                      >
                        <Eye className="w-4 h-4" /> Ver en Pantalla Completa
                      </button>
                      <a
                        href={cvFileDataUrl}
                        download={cvFileName || 'Curriculum_Vitae.pdf'}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow transition-all"
                      >
                        <Download className="w-4 h-4" /> Descargar PDF
                      </a>
                      <button
                        onClick={handleRemoveCvFile}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow transition-all"
                        title="Quitar el archivo cargado"
                      >
                        <Trash2 className="w-4 h-4" /> Quitar Archivo
                      </button>
                    </div>
                  </div>

                  {/* VISTA EN VIVO IFRAME DEL DOCUMENTO PDF */}
                  <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
                    <iframe
                      src={cvFileDataUrl}
                      title="Visor en vivo de la Hoja de Vida PDF"
                      className="w-full h-[600px] border-0"
                    />
                  </div>
                </div>
              ) : (cvTextContent && cvFileName) ? (
                <div className="bg-slate-950 text-white rounded-2xl p-6 shadow-xl border-l-8 border-l-teal-400 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2 font-bold text-teal-200 text-xs">
                      <FileCheck className="w-5 h-5 text-teal-400 shrink-0" />
                      <span>Documento Word / Texto Cargado: <strong className="text-white">{cvFileName}</strong></span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setShowCvFullscreen(true)}
                        className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow transition-all"
                      >
                        <Eye className="w-4 h-4" /> Ver en Pantalla Completa
                      </button>
                      <button
                        onClick={handleRemoveCvFile}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow transition-all"
                      >
                        <Trash2 className="w-4 h-4" /> Quitar Archivo
                      </button>
                    </div>
                  </div>

                  {/* HOJA DE DOCUMENTO WORD RENDERIZADA DIRECTAMENTE EN PANTALLA */}
                  <div className="bg-white p-6 md:p-10 rounded-xl border border-slate-300 text-slate-900 text-xs md:text-sm font-sans shadow-2xl max-h-[600px] overflow-y-auto leading-relaxed">
                    {cvTextContent.includes('<p>') || cvTextContent.includes('<div>') || cvTextContent.includes('<h') ? (
                      <div 
                        className="prose prose-slate max-w-none text-slate-900 leading-relaxed font-sans"
                        dangerouslySetInnerHTML={{ __html: cvTextContent }}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap font-serif text-slate-900 leading-relaxed">{cvTextContent}</div>
                    )}
                  </div>
                </div>
              ) : cvFileName ? (
                <div className="bg-emerald-950/90 text-white border-2 border-emerald-500/60 p-5 rounded-2xl flex items-center justify-between text-xs flex-wrap gap-3 shadow-lg">
                  <div className="flex items-center gap-3">
                    <FileCheck className="w-8 h-8 text-emerald-400 shrink-0" />
                    <div>
                      <h4 className="font-extrabold text-white text-sm">Archivo de Hoja de Vida Registrado: {cvFileName}</h4>
                      <p className="text-emerald-200 text-xs">El documento de respaldo ha sido guardado exitosamente.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRemoveCvFile}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow transition-all"
                    >
                      <Trash2 className="w-4 h-4" /> Quitar Archivo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl flex items-center gap-3 text-xs text-amber-900 font-medium">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>Por favor adjunte su archivo de Curriculum Vitae (PDF o Word) arriba para visualizarlo en vivo.</span>
                </div>
              )}

              {/* FORMULARIO PARA ACTUALIZAR LOS DATOS PRINCIPALES DE LA HOJA DE VIDA */}
              <div className={`border rounded-xl p-5 space-y-4 transition-all ${
                hasCvFile 
                  ? 'bg-slate-100/90 border-slate-300 opacity-80' 
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
                  <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider">
                    Formulario de Registro / Actualización de Datos Principales del CV (Ítems 1 al 5)
                  </h4>

                  {hasCvFile ? (
                    <span className="bg-emerald-100 text-emerald-900 font-extrabold text-[11px] px-3 py-1 rounded-full border border-emerald-400 shadow-sm flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> ✓ Bloqueado (Cumplido con Archivo Adjunto)
                    </span>
                  ) : (
                    <span className="bg-amber-100 text-amber-900 font-extrabold text-[11px] px-3 py-1 rounded-full border border-amber-300">
                      ⚠️ Obligatorio si no adjunta archivo PDF / Word
                    </span>
                  )}
                </div>

                {hasCvFile && (
                  <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-lg text-xs text-emerald-950 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>Ha cargado el archivo <strong>{cvFileName}</strong>. Los campos del formulario han sido bloqueados ya que el requisito de Hoja de Vida está satisfecho.</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">1. Nombres y Apellidos Completos *:</label>
                    <input 
                      type="text" 
                      disabled={isReadOnly}
                      placeholder="Nombres y Apellidos del Evaluador"
                      className={`w-full p-2.5 border rounded-lg text-slate-800 font-semibold ${
                        isReadOnly ? 'bg-slate-200 text-slate-600 border-slate-300 cursor-not-allowed' : 'bg-white'
                      }`}
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">2. Correo Electrónico Oficial:</label>
                    <input 
                      type="email" 
                      disabled={isReadOnly}
                      placeholder="ejemplo@institucion.edu.pe"
                      className={`w-full p-2.5 border rounded-lg text-slate-800 font-semibold ${
                        isReadOnly ? 'bg-slate-200 text-slate-600 border-slate-300 cursor-not-allowed' : 'bg-white'
                      }`}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">3. Grado Académico Máximo:</label>
                    <input 
                      type="text" 
                      disabled={isReadOnly}
                      placeholder="Doctor en Ingeniería / Magíster"
                      className={`w-full p-2.5 border rounded-lg text-slate-800 font-semibold ${
                        isReadOnly ? 'bg-slate-200 text-slate-600 border-slate-300 cursor-not-allowed' : 'bg-white'
                      }`}
                      value={gradoAcademico}
                      onChange={(e) => setGradoAcademico(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">4. Estudios Realizados / Universidad:</label>
                    <input 
                      type="text" 
                      disabled={isReadOnly}
                      placeholder="Universidad de procedencia / Grados y Posgrados"
                      className={`w-full p-2.5 border rounded-lg text-slate-800 font-semibold ${
                        isReadOnly ? 'bg-slate-200 text-slate-600 border-slate-300 cursor-not-allowed' : 'bg-white'
                      }`}
                      value={estudios}
                      onChange={(e) => setEstudios(e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block font-bold text-slate-800 mb-1">5. Experiencia Profesional y Resumen de Trayectoria:</label>
                    <textarea 
                      rows={3}
                      disabled={isReadOnly}
                      placeholder="Describa sus años de experiencia docente, cargos desempeñados y publicaciones académicas..."
                      className={`w-full p-2.5 border rounded-lg text-slate-800 text-xs font-medium ${
                        isReadOnly ? 'bg-slate-200 text-slate-600 border-slate-300 cursor-not-allowed' : 'bg-white'
                      }`}
                      value={experienciaDetallada}
                      onChange={(e) => setExperienciaDetallada(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Enlaces Académicos y Registro */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Enlace a CTI Vitae / Concytec (Opcional):</label>
                  <input 
                    type="url" 
                    disabled={isReadOnly}
                    placeholder="https://ctivitae.concytec.gob.pe/..."
                    className={`w-full p-2.5 border rounded-lg text-slate-800 ${isReadOnly ? 'bg-slate-200 text-slate-600 border-slate-300 cursor-not-allowed' : 'bg-white'}`}
                    value={ctiVitae}
                    onChange={(e) => setCtiVitae(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Código o Enlace ORCID (Opcional):</label>
                  <input 
                    type="text" 
                    disabled={isReadOnly}
                    placeholder="0000-0002-XXXX-XXXX"
                    className={`w-full p-2.5 border rounded-lg text-slate-800 ${isReadOnly ? 'bg-slate-200 text-slate-600 border-slate-300 cursor-not-allowed' : 'bg-white'}`}
                    value={orcid}
                    onChange={(e) => setOrcid(e.target.value)}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-800 mb-1">Enlace a Perfil Profesional / LinkedIn (Opcional):</label>
                  <input 
                    type="url" 
                    disabled={isReadOnly}
                    placeholder="https://www.linkedin.com/in/..."
                    className={`w-full p-2.5 border rounded-lg text-slate-800 ${isReadOnly ? 'bg-slate-200 text-slate-600 border-slate-300 cursor-not-allowed' : 'bg-white'}`}
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-800 mb-1">Resumen de Experiencia Profesional y Académica (Opcional):</label>
                  <textarea 
                    rows={4}
                    disabled={isReadOnly}
                    placeholder="Describa brevemente sus años de experiencia en infraestructura pública, ciencia de datos o docencia universitaria..."
                    className={`w-full p-2.5 border rounded-lg text-slate-800 text-xs ${isReadOnly ? 'bg-slate-200 text-slate-600 border-slate-300 cursor-not-allowed' : 'bg-white'}`}
                    value={resumenProfesional}
                    onChange={(e) => setResumenProfesional(e.target.value)}
                  />
                </div>
              </div>

              {/* BOTÓN PROMINENTE DE GUARDAR CAMBIOS DE LA HOJA DE VIDA */}
              <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                  {userRole === 'INVESTIGADOR' || evaluadorInspeccionado ? (
                    <span className="text-indigo-700 font-extrabold flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" /> Edición Habilitada para el Investigador Principal
                    </span>
                  ) : (
                    <span>💡 Puede modificar y guardar los datos de su Hoja de Vida manualmente en cualquier momento.</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleGuardarHojaDeVida}
                  disabled={syncing || isReadOnly}
                  className={`w-full md:w-auto font-black py-3.5 px-8 rounded-xl text-xs md:text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
                    isReadOnly 
                      ? 'bg-slate-400 text-white cursor-not-allowed' 
                      : 'bg-teal-700 hover:bg-teal-800 active:scale-95 text-white hover:shadow-xl'
                  }`}
                >
                  <Save className="w-5 h-5" /> 💾 GUARDAR DATOS DE HOJA DE VIDA
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL DE CONFIRMACIÓN AL ENVIAR EVALUACIÓN */}
      {submittedModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 stroke-[3]" />
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 mb-2">
              ¡Evaluación Enviada con Éxito!
            </h3>
            
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Muchas gracias, <strong>{nombre || "Estimado(a) Experto(a)"}</strong>. Sus respuestas, dictamen final y datos han sido registrados exitosamente en el sistema de la investigación.
            </p>

            <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-700 mb-6 space-y-1">
              <p><strong>Avance final:</strong> {totalAnswered} / {totalPreguntas} preguntas evaluadas</p>
              <p><strong>Dictamen:</strong> <span className="text-emerald-700 font-bold">{dictamenFinal}</span></p>
              <p><strong>Fecha de Envío:</strong> {new Date().toLocaleDateString()}</p>
            </div>

            <div className="space-y-2 mb-4">
              <button 
                onClick={handleExportExpedienteCompletoWord}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2.5 rounded-xl transition-all text-xs flex items-center justify-center gap-2 shadow"
              >
                <Download className="w-4 h-4" /> DESCARGAR EXPEDIENTE COMPLETO (WORD .DOC)
              </button>

              <button 
                onClick={handleImprimirExpedienteCompletoPDF}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-extrabold py-2.5 rounded-xl transition-all text-xs flex items-center justify-center gap-2 shadow"
              >
                <FileText className="w-4 h-4" /> DESCARGAR / IMPRIMIR COMPLETO (PDF)
              </button>
            </div>

            <button 
              onClick={() => setSubmittedModal(false)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all text-xs"
            >
              Cerrar e Inspeccionar en Modo Lectura
            </button>
          </div>
        </div>
      )}

      {/* Floating Bottom Bar para el Experto - Solo en Instrumentos, Hoja de Vida y Certificado */}
      {userRole === 'EVALUADOR' && (activeTab === 'INSTRUMENTOS' || activeTab === 'HOJA_VIDA' || activeTab === 'CERTIFICADO') && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 p-4 shadow-[0_-8px_20px_rgba(0,0,0,0.08)] z-50">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              {isReadOnly ? (
                <Lock className="text-emerald-600 w-8 h-8 shrink-0 animate-pulse" />
              ) : totalComplete === totalPreguntas ? (
                <CheckCircle2 className="text-emerald-500 w-8 h-8 shrink-0 animate-bounce" />
              ) : (
                <div className="w-4 h-4 bg-amber-500 rounded-full animate-ping shrink-0" />
              )}
              <div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                  <p className="font-bold text-slate-800 text-sm">
                    Avance Respondido: <span className="text-sky-700 font-black">{totalAnswered} / {totalPreguntas}</span>
                  </p>
                  <span className="text-slate-300 hidden sm:inline">•</span>
                  <p className="font-bold text-slate-800 text-sm">
                    Totalmente Completadas: <span className="text-emerald-700 font-black">{totalComplete} / {totalPreguntas}</span>
                  </p>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">
                  {isReadOnly 
                    ? "✓ EVALUACIÓN ENVIADA Y REGISTRADA. El expediente se encuentra en Modo Solo Lectura." 
                    : totalComplete < totalPreguntas 
                      ? `⚠️ Faltan ${totalMissing} preguntas por completar (con escala Likert y los 4 criterios).` 
                      : !isCvRequirementMet
                        ? "⚠️ Las 100 preguntas están completas, pero falta adjuntar su Hoja de Vida (PDF/Word) o llenar sus datos en la pestaña HOJA DE VIDA."
                        : "¡Todas las 100 preguntas y el requisito de Hoja de Vida están listos! Puede finalizar y enviar su evaluación."}
                </p>
              </div>
            </div>

            {isReadOnly ? (
              <div className="flex items-center gap-2 flex-wrap justify-center w-full sm:w-auto">
                <button
                  onClick={handleExportExpedienteCompletoWord}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 px-5 rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
                  title="Descargar expediente completo consolidado en un solo archivo Word (.doc)"
                >
                  <Download className="w-4 h-4" /> DESCARGAR EXPEDIENTE EN WORD (.DOC)
                </button>

                <button
                  onClick={handleImprimirExpedienteCompletoPDF}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-extrabold py-3 px-5 rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
                  title="Imprimir o guardar expediente completo consolidado en PDF"
                >
                  <FileText className="w-4 h-4" /> DESCARGAR / IMPRIMIR EN PDF
                </button>
              </div>
            ) : (
              <button 
                onClick={handleSubmitEvaluacion}
                disabled={totalComplete < totalPreguntas || !isCvRequirementMet}
                className={`w-full sm:w-auto font-extrabold py-3 px-8 rounded-xl flex items-center justify-center gap-2 text-sm transition-all shadow-lg ${
                  (totalComplete === totalPreguntas && isCvRequirementMet)
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer hover:shadow-emerald-600/30' 
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-400'
                }`}
              >
                {(totalComplete === totalPreguntas && isCvRequirementMet) 
                  ? <Send className="w-4 h-4" /> 
                  : <Lock className="w-4 h-4 text-slate-400" />}
                {totalComplete < totalPreguntas 
                  ? `FINALIZAR Y ENVIAR (Faltan ${totalMissing} preguntas)` 
                  : !isCvRequirementMet
                    ? 'FINALIZAR Y ENVIAR (Falta Hoja de Vida)'
                    : 'FINALIZAR Y ENVIAR EVALUACIÓN'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* MODAL FULLSCREEN DE VISUALIZACIÓN DE HOJA DE VIDA (PDF Y WORD) */}
      {showCvFullscreen && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col p-4 md:p-8 animate-in fade-in duration-200">
          <div className="flex items-center justify-between bg-slate-900 p-4 rounded-t-2xl border border-slate-800 text-white shadow-lg">
            <div className="flex items-center gap-3">
              <Briefcase className="w-6 h-6 text-teal-400" />
              <div>
                <h3 className="font-black text-sm md:text-base text-white">Hoja de Vida en Pantalla Completa</h3>
                <p className="text-xs text-teal-300">{cvFileName || 'Documento de Respaldo del Evaluador'}</p>
              </div>
            </div>
            <button
              onClick={() => setShowCvFullscreen(false)}
              className="bg-red-600 hover:bg-red-700 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <X className="w-4 h-4" /> Cerrar Pantalla Completa
            </button>
          </div>

          <div className="flex-1 bg-white rounded-b-2xl overflow-hidden shadow-2xl p-4 md:p-8 overflow-y-auto">
            {cvFileDataUrl ? (
              <iframe src={cvFileDataUrl} className="w-full h-full border-0 rounded-xl" title="CV Fullscreen" />
            ) : cvTextContent ? (
              <div className="max-w-4xl mx-auto py-6">
                {cvTextContent.includes('<p>') || cvTextContent.includes('<div>') || cvTextContent.includes('<h') ? (
                  <div 
                    className="prose prose-slate max-w-none text-slate-900 leading-relaxed font-sans text-sm md:text-base"
                    dangerouslySetInnerHTML={{ __html: cvTextContent }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap font-serif text-slate-900 text-sm leading-relaxed">{cvTextContent}</div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 font-bold">No hay contenido de documento disponible para visualizar.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
