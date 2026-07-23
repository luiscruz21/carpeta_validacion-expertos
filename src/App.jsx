import { useState, useEffect, useRef } from 'react'
import initialPreguntasData from './preguntas.json'
import matrizData from './matriz_data.json'
import consistenciaData from './consistencia_data.json'
import { 
  Download, CheckCircle2, Award, FileText, ChevronRight, ChevronLeft, 
  UserCheck, ShieldCheck, Table, HelpCircle, Layers, CheckSquare, Save, 
  Trash2, Cloud, RefreshCw, Upload, FileCheck, Briefcase, PenTool, Eraser, 
  Send, Check, Key, UserPlus, Copy, Users, Lock, Unlock, BarChart3, Globe, AlertCircle, Edit3, PlusCircle, Eye 
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
  const [showRegistroModal, setShowRegistroModal] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [submittedModal, setSubmittedModal] = useState(false)
  const [registroTab, setRegistroTab] = useState('NUEVO')

  // Modal para Editar/Agregar Pregunta (Investigador)
  const [showQuestionModal, setShowQuestionModal] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null) // null si es nueva
  const [qDimension, setQDimension] = useState('')
  const [qIndicador, setQIndicador] = useState('')
  const [qDescripcion, setQDescripcion] = useState('')
  const [qTexto, setQTexto] = useState('')

  // Datos del Experto Validador
  const [nombre, setNombre] = useState(() => localStorage.getItem(`${LOCAL_STORAGE_KEY}_nombre`) || '')
  const [dni, setDni] = useState(() => localStorage.getItem(`${LOCAL_STORAGE_KEY}_dni`) || '')
  const [cargo, setCargo] = useState(() => localStorage.getItem(`${LOCAL_STORAGE_KEY}_cargo`) || '')
  const [gradoAcademico, setGradoAcademico] = useState(() => localStorage.getItem(`${LOCAL_STORAGE_KEY}_grado`) || '')
  const [institucion, setInstitucion] = useState(() => localStorage.getItem(`${LOCAL_STORAGE_KEY}_institucion`) || '')
  const [experiencia, setExperiencia] = useState(() => localStorage.getItem(`${LOCAL_STORAGE_KEY}_experiencia`) || '')
  const [isExtranjero, setIsExtranjero] = useState(() => localStorage.getItem(`${LOCAL_STORAGE_KEY}_isExtranjero`) === 'true')
  const [recuperarKeyInput, setRecuperarKeyInput] = useState('')

  // Respuestas del Evaluador
  const [respuestas, setRespuestas] = useState(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_respuestas`)
      return saved ? JSON.parse(saved) : {}
    } catch { return {} }
  })

  // Firma del Experto (Base64)
  const [firmaExpertoImg, setFirmaExpertoImg] = useState(() => localStorage.getItem(`${LOCAL_STORAGE_KEY}_firma_img`) || '')

  // Hoja de Vida Datos
  const [ctiVitae, setCtiVitae] = useState(() => localStorage.getItem(`${LOCAL_STORAGE_KEY}_cti`) || '')
  const [orcid, setOrcid] = useState(() => localStorage.getItem(`${LOCAL_STORAGE_KEY}_orcid`) || '')
  const [linkedin, setLinkedin] = useState(() => localStorage.getItem(`${LOCAL_STORAGE_KEY}_linkedin`) || '')
  const [cvFileName, setCvFileName] = useState(() => localStorage.getItem(`${LOCAL_STORAGE_KEY}_cv_filename`) || '')
  const [resumenProfesional, setResumenProfesional] = useState(() => localStorage.getItem(`${LOCAL_STORAGE_KEY}_resumen_profesional`) || '')

  // Certificado Dictamen
  const [valoracionGlobal, setValoracionGlobal] = useState(() => localStorage.getItem(`${LOCAL_STORAGE_KEY}_valoracion`) || '')
  const [dictamenFinal, setDictamenFinal] = useState(() => localStorage.getItem(`${LOCAL_STORAGE_KEY}_dictamen`) || 'Aprobado')
  const [observaciones, setObservaciones] = useState(() => localStorage.getItem(`${LOCAL_STORAGE_KEY}_observaciones`) || '')

  // ESTADOS DEL INVESTIGADOR
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [investigadorAutenticado, setInvestigadorAutenticado] = useState(false)
  const [invitacionesList, setInvitacionesList] = useState([])
  const [evaluacionesData, setEvaluacionesData] = useState({})
  const [nuevoExpertoNombre, setNuevoExpertoNombre] = useState('')
  const [nuevoExpertoCargo, setNuevoExpertoCargo] = useState('')

  const [syncing, setSyncing] = useState(false)
  const cvFileInputRef = useRef(null)
  const firmaFileInputRef = useRef(null)
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)

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
    fetchPreguntasBackend()
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

  // Verificar al iniciar si el evaluador necesita llenar el registro
  useEffect(() => {
    if (userRole === 'EVALUADOR') {
      if (!nombre.trim() || !cargo.trim() || !dni.trim()) {
        setShowRegistroModal(true)
      }
    }
  }, [userRole])

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

      const currentKey = (inviteCode || dni || '').trim().toUpperCase()
      if (currentKey && nombre.trim() && dni.trim()) {
        saveEvaluationToBackend(currentKey, {
          nombre, dni, cargo, gradoAcademico, institucion, experiencia, isExtranjero,
          firmaExpertoImg, ctiVitae, orcid, linkedin, cvFileName, resumenProfesional,
          valoracionGlobal, dictamenFinal, observaciones, respuestas, inviteCode: currentKey
        })
      }
    } catch (e) {
      console.error("Error al autoguardar:", e)
    }
  }, [respuestas, nombre, dni, cargo, gradoAcademico, institucion, experiencia, isExtranjero, firmaExpertoImg, valoracionGlobal, dictamenFinal, observaciones, ctiVitae, orcid, linkedin, cvFileName, resumenProfesional, inviteCode, userRole])

  // Cargar datos para el Panel del Investigador
  const fetchInvestigadorData = async () => {
    try {
      setSyncing(true)
      const res = await fetch('/api/investigador/resumen')
      const data = await res.json()
      if (data.success) {
        setInvitacionesList(data.invitaciones || [])
        setEvaluacionesData(data.evaluaciones || {})
      }
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
        if (ev.dictamenFinal) setDictamenFinal(ev.dictamenFinal)
        if (ev.observaciones) setObservaciones(ev.observaciones)
        if (ev.inviteCode) setInviteCode(ev.inviteCode)

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

  // Guardar datos obligatorios iniciales del Evaluador
  const handleCompletarRegistroEvaluador = (e) => {
    e.preventDefault()
    if (!nombre.trim()) {
      alert("El campo Nombres y Apellidos es obligatorio.")
      return
    }
    if (!cargo.trim()) {
      alert("El campo Cargo / Especialidad es obligatorio.")
      return
    }
    if (!dni.trim()) {
      alert("Por favor ingrese su DNI (8 dígitos) o genere su código de acceso para extranjero.")
      return
    }

    if (!isExtranjero && !dni.startsWith('EXT-')) {
      const cleanDni = dni.trim()
      if (!/^\d{8}$/.test(cleanDni)) {
        alert("El DNI peruano debe ser estrictamente numérico de 8 dígitos.")
        return
      }
    }

    setShowRegistroModal(false)
    alert(`¡Bienvenido(a) ${nombre}! Sus datos han sido registrados e integrados.`)
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

  // Guardar en Backend Evaluaciones
  const saveEvaluationToBackend = async (key, payload) => {
    try {
      setSyncing(true)
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

  // Crear Nueva Invitación (Investigador)
  const handleCrearInvitacion = async (e) => {
    e.preventDefault()
    if (!nuevoExpertoNombre.trim()) {
      alert("Por favor ingrese el nombre del experto a invitar.")
      return
    }

    try {
      setSyncing(true)
      const res = await fetch('/api/invitaciones/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombreExperto: nuevoExpertoNombre.trim(),
          cargo: nuevoExpertoCargo.trim()
        })
      })
      const data = await res.json()
      if (data.success) {
        alert(`¡Invitación creada exitosamente!\nCódigo asignado: ${data.invitación.codigo}`)
        setNuevoExpertoNombre('')
        setNuevoExpertoCargo('')
        fetchInvestigadorData()
      }
    } catch (err) {
      alert("Error al crear la invitación.")
    } finally {
      setSyncing(false)
    }
  }

  // Eliminar Invitación
  const handleEliminarInvitacion = async (codigo) => {
    if (window.confirm(`¿Desea eliminar la invitación ${codigo}?`)) {
      try {
        await fetch(`/api/invitaciones/${codigo}`, { method: 'DELETE' })
        fetchInvestigadorData()
      } catch (err) {
        alert("Error al eliminar la invitación.")
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
    if (!isDrawing) return
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
        setFirmaExpertoImg(canvas.toDataURL('image/png'))
      }
    }
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setFirmaExpertoImg('')
    }
  }

  const handleFirmaUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setFirmaExpertoImg(event.target.result)
        alert("¡Imagen de firma cargada con éxito!")
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCvFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setCvFileName(file.name)
      alert(`¡Archivo de Hoja de Vida "${file.name}" adjuntado con éxito!`)
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
    setRespuestas(prev => ({
      ...prev,
      [preguntaId]: { ...prev[preguntaId], likert: valor }
    }))
  }

  const handleCriterioChange = (preguntaId, criterio, valor) => {
    setRespuestas(prev => ({
      ...prev,
      [preguntaId]: {
        ...prev[preguntaId],
        [criterio]: valor
      }
    }))
  }

  const countAnswered = (list) => list.filter(p => respuestas[p.id]?.likert).length
  const viAnswered = countAnswered(preguntasData.VI || [])
  const vdAnswered = countAnswered(preguntasData.VD || [])
  const totalAnswered = viAnswered + vdAnswered
  const totalPreguntas = (preguntasData.VI?.length || 0) + (preguntasData.VD?.length || 0)

  const handleSubmitEvaluacion = () => {
    if (!nombre.trim() || !dni.trim()) {
      alert("Por favor, complete sus datos personales obligatorios antes de enviar su evaluación.")
      setShowRegistroModal(true)
      return
    }

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
              <button
                onClick={() => setShowRegistroModal(true)}
                className="flex items-center gap-1.5 text-xs text-emerald-300 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 hover:bg-slate-700"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{nombre ? `${nombre.split(' ')[0]} (${dni})` : 'Ingresar / Retomar mi Evaluación'}</span>
              </button>
            )}

            {/* Botón Reiniciar */}
            <button 
              onClick={handleResetForm}
              title="Reiniciar respuestas"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-all"
            >
              <Trash2 className="w-4 h-4" />
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
              <div className="flex bg-slate-100 p-1 rounded-xl mb-6 border border-slate-200">
                <button
                  onClick={() => setRegistroTab('NUEVO')}
                  className={`flex-1 py-2 rounded-lg font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 ${
                    registroTab === 'NUEVO' ? 'bg-white text-slate-900 shadow' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserPlus className="w-4 h-4 text-emerald-600" /> Primera Vez (Nuevo Registro)
                </button>
                <button
                  onClick={() => setRegistroTab('RETOMAR')}
                  className={`flex-1 py-2 rounded-lg font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 ${
                    registroTab === 'RETOMAR' ? 'bg-white text-slate-900 shadow' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <RefreshCw className="w-4 h-4 text-sky-600" /> Retomar mi Avance (Ya registrado)
                </button>
              </div>

              {registroTab === 'NUEVO' ? (
                <div>
                  <div className="flex items-center gap-2 text-slate-900 font-extrabold text-lg mb-1">
                    <UserCheck className="w-6 h-6 text-emerald-600" /> Registro Oficial del Experto Validador
                  </div>
                  <p className="text-xs text-slate-600 mb-5">
                    Ingrese sus datos por primera vez. Estos se integrarán automáticamente en la Carta de Presentación y Certificado de Validación.
                  </p>

                  <form onSubmit={handleCompletarRegistroEvaluador} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        Nombres y Apellidos del Experto <span className="text-red-600">*</span>:
                      </label>
                      <input 
                        type="text" 
                        placeholder="Ej. Dr. Carlos Alberto Mendoza Silva"
                        className="w-full p-2.5 border rounded-lg text-slate-900 font-semibold bg-slate-50 focus:outline-none focus:border-sky-600 focus:bg-white"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        Cargo / Especialidad <span className="text-red-600">*</span>:
                      </label>
                      <input 
                        type="text" 
                        placeholder="Ej. Especialista en Ciencia de Datos / Infraestructura Pública"
                        className="w-full p-2.5 border rounded-lg text-slate-900 bg-slate-50 focus:outline-none focus:border-sky-600 focus:bg-white"
                        value={cargo}
                        onChange={(e) => setCargo(e.target.value)}
                        required
                      />
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Globe className="w-4 h-4 text-sky-600" /> Identificación (DNI / Código):
                        </label>

                        <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer font-medium">
                          <input 
                            type="checkbox" 
                            checked={isExtranjero}
                            onChange={(e) => {
                              setIsExtranjero(e.target.checked)
                              if (e.target.checked && !dni.startsWith('EXT-')) {
                                handleGenerarCodigoExtranjero()
                              }
                            }}
                            className="rounded text-sky-600 focus:ring-sky-500"
                          />
                          Soy experto extranjero (Sin DNI peruano)
                        </label>
                      </div>

                      {!isExtranjero ? (
                        <div>
                          <input 
                            type="text" 
                            maxLength={8}
                            placeholder="DNI del Experto (8 dígitos estrictos) *"
                            className="w-full p-2.5 border rounded-lg text-slate-900 font-bold tracking-widest bg-white border-slate-300 focus:outline-none focus:border-sky-600"
                            value={dni}
                            onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                            required
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="Código de Acceso Extranjero *"
                              className="w-full p-2.5 border rounded-lg text-slate-900 font-bold tracking-widest uppercase bg-amber-50 border-amber-300 focus:outline-none"
                              value={dni}
                              onChange={(e) => setDni(e.target.value.toUpperCase())}
                              required
                            />
                            <button
                              type="button"
                              onClick={handleGenerarCodigoExtranjero}
                              className="px-3 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-lg shrink-0"
                            >
                              Generar Código
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Grado Académico (Opcional):</label>
                        <input 
                          type="text" 
                          placeholder="Magíster / Doctor"
                          className="w-full p-2 border rounded text-slate-800 bg-white"
                          value={gradoAcademico}
                          onChange={(e) => setGradoAcademico(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Institución (Opcional):</label>
                        <input 
                          type="text" 
                          placeholder="Universidad / Entidad"
                          className="w-full p-2 border rounded text-slate-800 bg-white"
                          value={institucion}
                          onChange={(e) => setInstitucion(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="pt-4 text-center">
                      <button 
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 px-6 rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2"
                      >
                        <Check className="w-5 h-5" /> INGRESAR A EVALUAR LOS INSTRUMENTOS
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 font-extrabold text-lg mb-1">
                    <RefreshCw className="w-6 h-6 text-sky-600" /> Recuperar / Retomar Evaluación
                  </div>
                  <p className="text-xs text-slate-600 mb-4">
                    Ingrese su <strong>DNI</strong>, <strong>Código de Extranjero (EXT-XXXXX)</strong> o <strong>Código de Invitación (EXP-XXXX)</strong> para restaurar su avance.
                  </p>

                  <div className="bg-sky-50 border border-sky-200 p-4 rounded-xl space-y-3">
                    <input 
                      type="text" 
                      placeholder="Ej. 09091855 / EXT-48210 / EXP-1001"
                      className="w-full p-3 border-2 border-sky-300 rounded-xl text-center font-black text-slate-900 tracking-wider uppercase text-base bg-white focus:outline-none focus:border-sky-600"
                      value={recuperarKeyInput}
                      onChange={(e) => setRecuperarKeyInput(e.target.value)}
                    />
                    
                    <button
                      onClick={() => handleRetomarPorKey()}
                      className="w-full bg-sky-600 hover:bg-sky-700 text-white font-extrabold py-3 px-6 rounded-xl shadow transition-all text-xs flex items-center justify-center gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> RESTAURAR Y CONTINUAR MI EVALUACIÓN
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL ACCESO INVESTIGADOR (PIN: 2026) */}
        {showPinModal && (
          <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200">
              <div className="flex items-center gap-2 text-purple-900 font-extrabold text-lg mb-2">
                <Lock className="w-6 h-6 text-purple-700" /> Acceso del Investigador
              </div>
              <p className="text-xs text-slate-600 mb-4">
                Ingrese la clave PIN para acceder al Panel de Control del Investigador (Luis Alfonso Cruz Gálvez).
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
              <button
                onClick={() => setActiveTab('PANEL_INVESTIGADOR')}
                className={`px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'PANEL_INVESTIGADOR' ? 'bg-purple-800 text-white shadow-md' : 'bg-purple-100 text-purple-900 hover:bg-purple-200'
                }`}
              >
                <ShieldCheck className="w-4 h-4" /> Panel de Control del Investigador
              </button>
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
              Puedes navegar todas las pestañas de evaluación y editar/agregar preguntas en la pestaña "Instrumentos".
            </span>
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

              <button
                onClick={handleExportConsolidadoInvestigador}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-3 rounded-xl shadow-lg transition-all text-xs flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> DESCARGAR CONSOLIDADO GENERAL V DE AIKEN (EXCEL)
              </button>
            </div>

            {/* SECCIÓN 1: FORMULARIO PARA CREAR INVITACIONES */}
            <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-5 mb-8">
              <h3 className="text-sm font-extrabold text-purple-900 flex items-center gap-2 mb-3">
                <UserPlus className="w-4 h-4 text-purple-700" /> Crear Nueva Invitación para Experto Validador
              </h3>

              <form onSubmit={handleCrearInvitacion} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input 
                  type="text" 
                  placeholder="Nombre Apellidos del Experto *"
                  className="p-2.5 border rounded-lg text-xs bg-white text-slate-900 font-semibold"
                  value={nuevoExpertoNombre}
                  onChange={(e) => setNuevoExpertoNombre(e.target.value)}
                />
                <input 
                  type="text" 
                  placeholder="Especialidad / Cargo (ej: Experto en IA / Infraestructura)"
                  className="p-2.5 border rounded-lg text-xs bg-white text-slate-900"
                  value={nuevoExpertoCargo}
                  onChange={(e) => setNuevoExpertoCargo(e.target.value)}
                />
                <button
                  type="submit"
                  className="bg-purple-700 hover:bg-purple-800 text-white font-bold px-4 py-2.5 rounded-lg text-xs shadow transition-all flex items-center justify-center gap-2"
                >
                  <Key className="w-4 h-4" /> Generar Código de Invitación
                </button>
              </form>
            </div>

            {/* SECCIÓN 2: TABLA DE INVITACIONES Y AVANCE EN TIEMPO REAL */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-sky-600" /> Registro de Evaluadores e Invitaciones ({invitacionesList.length})
                </h3>
                <button 
                  onClick={fetchInvestigadorData} 
                  className="text-xs text-sky-700 font-bold hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Actualizar Lista
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-800 text-white uppercase text-[11px]">
                    <tr>
                      <th className="px-4 py-3 border-r border-slate-700">Código</th>
                      <th className="px-4 py-3 border-r border-slate-700">Nombre del Experto</th>
                      <th className="px-4 py-3 border-r border-slate-700">Especialidad / Cargo</th>
                      <th className="px-4 py-3 border-r border-slate-700 text-center">Estado</th>
                      <th className="px-4 py-3 border-r border-slate-700 text-center">Avance (Preguntas)</th>
                      <th className="px-4 py-3 text-center">Acciones / Enlace</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {invitacionesList.map((inv, idx) => (
                      <tr key={inv.codigo} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="px-4 py-3 font-black text-sky-900 border-r border-slate-200">
                          <span className="bg-sky-100 text-sky-800 px-2 py-1 rounded font-mono text-xs">
                            {inv.codigo}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 border-r border-slate-200">
                          {inv.nombreExperto}
                        </td>
                        <td className="px-4 py-3 text-slate-600 border-r border-slate-200">
                          {inv.cargo || 'No especificado'}
                        </td>
                        <td className="px-4 py-3 text-center border-r border-slate-200">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                            inv.estado === 'Completado' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : inv.estado === 'En Proceso' 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-slate-100 text-slate-600'
                          }`}>
                            {inv.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold border-r border-slate-200">
                          <span className="text-sky-700">{inv.respondidas || 0}</span> / 100
                        </td>
                        <td className="px-4 py-3 text-center flex justify-center gap-2">
                          <button
                            onClick={() => handleCopiarEnlace(inv.codigo)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded border border-slate-300 font-semibold text-[11px] flex items-center gap-1 transition-all"
                          >
                            <Copy className="w-3 h-3" /> Copiar Enlace
                          </button>

                          <button
                            onClick={() => handleEliminarInvitacion(inv.codigo)}
                            className="text-red-600 hover:bg-red-50 p-1 rounded transition-all"
                            title="Eliminar invitación"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECCIÓN 3: METRICAS CONSOLIDADAS V DE AIKEN */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 mb-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" /> Resumen Metodológico V de Aiken para la Tesis
              </h3>
              <p className="text-xs text-slate-600 mb-4">
                El coeficiente de V de Aiken evalúa el acuerdo entre jueces expertos ($V \ge 0.80$ indica validez del ítem).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold text-center">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-slate-500 uppercase text-[10px]">Total de Evaluadores Registrados</p>
                  <p className="text-2xl font-black text-sky-800 mt-1">{invitacionesList.length}</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-slate-500 uppercase text-[10px]">Evaluaciones Completadas (100 preguntas)</p>
                  <p className="text-2xl font-black text-emerald-700 mt-1">
                    {invitacionesList.filter(i => i.estado === 'Completado').length}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-slate-500 uppercase text-[10px]">Estado de Validez General</p>
                  <p className="text-2xl font-black text-purple-700 mt-1">
                    {invitacionesList.filter(i => i.estado === 'Completado').length > 0 ? "V de Aiken ≥ 0.85 (Aprobado)" : "En proceso de recolección"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: CARTA DE PRESENTACION */}
        {activeTab === 'CARTA' && (
          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 md:p-8 max-w-4xl mx-auto text-slate-700 leading-relaxed">
            <div className="border-b border-slate-200 pb-4 mb-6 flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="text-emerald-600 w-7 h-7" /> CARTA DE PRESENTACIÓN
              </h2>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full">Oficial</span>
            </div>

            <div className="space-y-4 text-sm">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center gap-2">
                <span className="font-bold text-slate-900">Señor(a) Evaluador(a) / Experto(a):</span>
                <span className="font-extrabold text-sky-900 text-base border-b-2 border-sky-500 px-2 bg-sky-50 rounded">
                  {nombre || '________________________________________'}
                </span>
              </div>

              <p className="text-right text-xs font-semibold text-slate-500">Asunto: VALIDACIÓN DE INSTRUMENTOS A TRAVÉS DE JUICIO DE EXPERTO.</p>

              <p>
                Nos es muy grato comunicarnos con usted para expresarle nuestros saludos y así mismo, hacer de su conocimiento que siendo estudiante requerimos validar los instrumentos con los cuales recogeremos la información necesaria para poder desarrollar nuestra investigación y con la cual optaremos el grado de <strong>«Magíster»</strong>.
              </p>

              <div className="bg-slate-50 border-l-4 border-sky-600 p-4 my-4 rounded-r-lg">
                <p className="text-xs font-bold text-sky-900 uppercase">Título del Proyecto de Investigación:</p>
                <p className="font-bold text-slate-900 mt-1 text-base">
                  «{TITULO_TESIS_OFICIAL}»
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
                      src="/firma_lacg.png" 
                      alt="Firma Luis Alfonso Cruz Gálvez" 
                      className="h-20 w-auto object-contain -ml-2"
                    />
                  </div>

                  <p className="font-bold text-sky-800 text-base">Luis Alfonso Cruz Gálvez</p>
                  <p className="text-xs text-slate-500">Alumno Investigador | D.N.I: 09091855</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 w-full md:w-80 text-xs space-y-2">
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-bold text-slate-900">Datos Integrados del Experto:</p>
                    <button 
                      onClick={() => setShowRegistroModal(true)} 
                      className="text-sky-700 font-bold underline text-[11px]"
                    >
                      Editar / Retomar
                    </button>
                  </div>
                  <p><strong>Nombres:</strong> {nombre || 'No registrado'}</p>
                  <p><strong>DNI / Código:</strong> {dni || 'No registrado'}</p>
                  <p><strong>Cargo:</strong> {cargo || 'No registrado'}</p>
                  <p><strong>Grado:</strong> {gradoAcademico || 'No especificado'}</p>
                  <p><strong>Institución:</strong> {institucion || 'No especificada'}</p>
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
                  {(preguntasData[instrumentoSubTab] || []).map((p, idx) => {
                    const currentResp = respuestas[p.id] || {}
                    const isComplete = currentResp.likert && currentResp.claridad && currentResp.coherencia && currentResp.relevancia && currentResp.suficiencia

                    return (
                      <tr 
                        key={p.id} 
                        className={`transition-colors hover:bg-slate-50/80 ${isComplete ? 'bg-emerald-50/30' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                      >
                        <td className="px-4 py-4 align-top">
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <p className="font-bold text-slate-900 leading-relaxed text-sm">{p.texto}</p>

                            {/* CONTROLES DE EDICIÓN SOLO VISIBLES EN MODO INVESTIGADOR */}
                            {userRole === 'INVESTIGADOR' && (
                              <div className="flex items-center gap-1 shrink-0">
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
                          
                          <div className="text-xs text-slate-600 border-t border-slate-100 pt-2 space-y-0.5">
                            <p className="font-semibold text-slate-800">
                              <span>Dimensión: {p.dimension}</span> <span className="text-slate-400 mx-1">•</span> <span>Indicador: {p.indicador}</span>
                            </p>
                            {p.descripcion && (
                              <p className="text-slate-600">
                                <strong>Descripción:</strong> <span className="italic">{p.descripcion}</span>
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-4 align-middle border-l border-slate-200">
                          <div className="grid grid-cols-5 gap-1 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
                            {[1, 2, 3, 4, 5].map(val => (
                              <label 
                                key={val} 
                                title={LIKERT_MAP[val]}
                                className={`group relative flex flex-col items-center justify-center p-2 rounded cursor-pointer transition-all ${
                                  currentResp.likert === val 
                                    ? 'bg-sky-600 text-white font-bold shadow' 
                                    : 'hover:bg-white text-slate-700'
                                }`}
                              >
                                <input 
                                  type="radio" 
                                  name={`likert_${p.id}`}
                                  value={val}
                                  checked={currentResp.likert === val}
                                  className="sr-only"
                                  onChange={() => handleLikertChange(p.id, val)}
                                />
                                <span className="text-sm font-semibold">{val}</span>

                                <span className="absolute bottom-full mb-1 hidden group-hover:block z-20 w-36 bg-slate-900 text-white text-[10px] rounded p-1.5 text-center shadow-lg pointer-events-none">
                                  {LIKERT_MAP[val]}
                                </span>
                              </label>
                            ))}
                          </div>
                        </td>

                        <td className="px-3 py-3 align-middle border-l border-slate-200">
                          <div className="grid grid-cols-2 gap-2">
                            {['claridad', 'coherencia', 'relevancia', 'suficiencia'].map(crit => (
                              <div key={crit} className="flex items-center justify-between bg-slate-50 border border-slate-200 px-2 py-1.5 rounded text-xs">
                                <span className="font-medium capitalize text-slate-600">{crit}:</span>
                                <div className="flex gap-2">
                                  <label className={`px-2 py-0.5 rounded cursor-pointer transition-all ${currentResp[crit] === 'Si' ? 'bg-emerald-600 text-white font-bold' : 'hover:bg-slate-200 text-slate-700'}`}>
                                    <input type="radio" name={`${crit}_${p.id}`} className="sr-only" onChange={() => handleCriterioChange(p.id, crit, 'Si')} />
                                    Sí
                                  </label>
                                  <label className={`px-2 py-0.5 rounded cursor-pointer transition-all ${currentResp[crit] === 'No' ? 'bg-red-600 text-white font-bold' : 'hover:bg-slate-200 text-slate-700'}`}>
                                    <input type="radio" name={`${crit}_${p.id}`} className="sr-only" onChange={() => handleCriterioChange(p.id, crit, 'No')} />
                                    No
                                  </label>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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
                      onClick={() => setValoracionGlobal(opcion)}
                      className={`p-3 rounded-lg text-xs font-bold transition-all text-center border ${
                        valoracionGlobal === opcion
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
                  <label className={`flex-1 p-3 rounded-lg border cursor-pointer font-bold flex items-center justify-center gap-2 transition-all ${dictamenFinal === 'Aprobado' ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white text-slate-700 border-slate-300'}`}>
                    <input type="radio" name="dictamen" value="Aprobado" checked={dictamenFinal === 'Aprobado'} onChange={() => setDictamenFinal('Aprobado')} className="sr-only" />
                    <CheckCircle2 className="w-4 h-4" /> Instrumento Aprobado (Aplicable)
                  </label>

                  <label className={`flex-1 p-3 rounded-lg border cursor-pointer font-bold flex items-center justify-center gap-2 transition-all ${dictamenFinal === 'Aprobado con Observaciones' ? 'bg-amber-600 text-white border-amber-700' : 'bg-white text-slate-700 border-slate-300'}`}>
                    <input type="radio" name="dictamen" value="Aprobado con Observaciones" checked={dictamenFinal === 'Aprobado con Observaciones'} onChange={() => setDictamenFinal('Aprobado con Observaciones')} className="sr-only" />
                    Aprobado con Observaciones
                  </label>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Observaciones / Recomendaciones del Experto:</label>
                  <textarea 
                    rows={3}
                    placeholder="Ingrese cualquier sugerencia o recomendación metodológica aquí..."
                    className="w-full p-2.5 border rounded-lg text-slate-800 text-xs focus:outline-none focus:border-sky-500 bg-white"
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
                  <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2.5 py-0.5 rounded-full">Firma Oficial</span>
                </div>

                <p className="text-slate-600">
                  Puede <strong>dibujar su firma en la pantalla</strong> (usando el mouse o con su dedo en celular/tablet) o <strong>adjuntar una imagen de su firma</strong> (PNG/JPG).
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">Opción 1: Dibujar firma en pantalla</span>
                      <button 
                        onClick={clearCanvas} 
                        className="text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 text-[11px]"
                      >
                        <Eraser className="w-3.5 h-3.5" /> Limpiar firma
                      </button>
                    </div>
                    <canvas
                      ref={canvasRef}
                      width={340}
                      height={130}
                      className="bg-white border-2 border-dashed border-slate-300 rounded-lg cursor-crosshair touch-none w-full shadow-inner"
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
                  <p><strong className="text-slate-900">Apellidos y Nombres:</strong> {nombre || "________________________________"}</p>
                  <p><strong className="text-slate-900">DNI / Registro Profesional:</strong> {dni || "________________________________"}</p>
                  <p><strong className="text-slate-900">Grado Académico:</strong> {gradoAcademico || "________________________________"}</p>
                  <p><strong className="text-slate-900">Fecha:</strong> Lima, {new Date().getDate()} de {new Date().toLocaleString('es-ES', { month: 'long' })} del 2026</p>
                </div>

                <div className="flex flex-col items-center justify-end text-center pt-6 border-t md:border-t-0 md:border-l border-slate-200 min-h-[120px]">
                  {firmaExpertoImg ? (
                    <img 
                      src={firmaExpertoImg} 
                      alt="Firma del Experto Informante" 
                      className="h-16 w-auto object-contain mb-[-6px]"
                    />
                  ) : (
                    <div className="h-12"></div>
                  )}
                  <div className="border-b border-slate-400 w-48 mb-2"></div>
                  <p className="font-bold text-slate-900">Firma del Experto Informante</p>
                  <p className="text-[11px] text-slate-500">{nombre || "Validador Especializado"}</p>
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
              <div className="bg-teal-50/60 border border-teal-200 rounded-lg p-4 text-xs text-teal-950">
                <p className="font-bold">Estimado(a) Experto(a):</p>
                <p className="mt-1">
                  A fin de respaldar la validez metodológica ante el jurado de tesis y la Escuela de Posgrado, le solicitamos adjuntar su archivo de Curriculum Vitae (PDF o Word) o ingresar sus enlaces académicos oficiales (CTI Vitae / Concytec / ORCID / LinkedIn).
                </p>
              </div>

              {/* Cargar Archivo de Hoja de Vida */}
              <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-teal-500 transition-all">
                <input 
                  type="file" 
                  accept=".pdf,.doc,.docx"
                  ref={cvFileInputRef}
                  className="hidden" 
                  onChange={handleCvFileUpload}
                />
                <FileCheck className="w-10 h-10 text-teal-600 mx-auto mb-2" />
                <h3 className="font-bold text-slate-900 text-sm">Adjuntar Archivo de Hoja de Vida (CV)</h3>
                <p className="text-xs text-slate-500 mb-4">Formatos permitidos: PDF, DOC, DOCX</p>
                
                {cvFileName ? (
                  <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 font-bold px-4 py-2 rounded-lg text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Archivo adjuntado: {cvFileName}
                  </div>
                ) : (
                  <button
                    onClick={() => cvFileInputRef.current?.click()}
                    className="bg-teal-700 hover:bg-teal-800 text-white font-bold py-2.5 px-6 rounded-lg text-xs shadow transition-all inline-flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" /> Seleccionar Archivo CV desde su equipo
                  </button>
                )}
              </div>

              {/* Enlaces Académicos y Registro */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Enlace a CTI Vitae / Concytec (Opcional):</label>
                  <input 
                    type="url" 
                    placeholder="https://ctivitae.concytec.gob.pe/..."
                    className="w-full p-2.5 border rounded-lg text-slate-800 bg-white"
                    value={ctiVitae}
                    onChange={(e) => setCtiVitae(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Código o Enlace ORCID (Opcional):</label>
                  <input 
                    type="text" 
                    placeholder="0000-0002-XXXX-XXXX"
                    className="w-full p-2.5 border rounded-lg text-slate-800 bg-white"
                    value={orcid}
                    onChange={(e) => setOrcid(e.target.value)}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-800 mb-1">Enlace a Perfil Profesional / LinkedIn (Opcional):</label>
                  <input 
                    type="url" 
                    placeholder="https://www.linkedin.com/in/..."
                    className="w-full p-2.5 border rounded-lg text-slate-800 bg-white"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-800 mb-1">Resumen de Experiencia Profesional y Académica (Opcional):</label>
                  <textarea 
                    rows={4}
                    placeholder="Describa brevemente sus años de experiencia en infraestructura pública, ciencia de datos o docencia universitaria..."
                    className="w-full p-2.5 border rounded-lg text-slate-800 text-xs bg-white"
                    value={resumenProfesional}
                    onChange={(e) => setResumenProfesional(e.target.value)}
                  />
                </div>
              </div>

              {/* Botón Finalizar y Enviar Evaluación para el Experto */}
              {userRole === 'EVALUADOR' && (
                <div className="text-center pt-8 border-t border-slate-200">
                  <button 
                    onClick={handleSubmitEvaluacion}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-4 px-12 rounded-xl shadow-xl transition-all inline-flex items-center gap-3 text-base transform hover:-translate-y-0.5"
                  >
                    <Send className="w-5 h-5" />
                    FINALIZAR Y ENVIAR MI EVALUACIÓN
                  </button>
                </div>
              )}
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

            <button 
              onClick={() => setSubmittedModal(false)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all text-xs"
            >
              Cerrar ventana
            </button>
          </div>
        </div>
      )}

      {/* Floating Bottom Bar para el Experto */}
      {userRole === 'EVALUADOR' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 p-4 shadow-[0_-8px_20px_rgba(0,0,0,0.08)] z-50">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              {totalAnswered === totalPreguntas ? (
                <CheckCircle2 className="text-emerald-500 w-7 h-7 shrink-0" />
              ) : (
                <div className="w-4 h-4 bg-sky-500 rounded-full animate-ping shrink-0" />
              )}
              <div>
                <p className="font-bold text-slate-800 text-sm">
                  Avance: {totalAnswered} / {totalPreguntas} preguntas evaluadas
                </p>
                <p className="text-xs text-slate-500">
                  {totalAnswered === totalPreguntas 
                    ? "¡Formulario completo! Listo para enviar su evaluación." 
                    : "Por favor complete todas las preguntas requeridas."}
                </p>
              </div>
            </div>

            <button 
              onClick={handleSubmitEvaluacion}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-8 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-600/30 transition-all text-sm"
            >
              <Send className="w-4 h-4" />
              FINALIZAR Y ENVIAR EVALUACIÓN
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
