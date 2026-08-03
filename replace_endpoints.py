import re

with open("server.js", "r", encoding="utf-8") as f:
    content = f.read()

# 1. /api/investigador/resumen
content = re.sub(
    r"app\.get\('/api/investigador/resumen', \(req, res\) => \{.*?\n\}\)",
    """app.get('/api/investigador/resumen', (req, res) => {
  const consolidated = dbManager.getConsolidatedTable()
  const evalsDict = {}
  consolidated.forEach(item => {
    evalsDict[item.dni] = dbManager.getEvaluadorByDni(item.dni)
  })
  return res.json({
    success: true,
    totalInvitaciones: consolidated.length,
    totalEvaluacionesIniciadas: consolidated.filter(i => i.respondidas > 0).length,
    evaluacionesCompletadas: consolidated.filter(i => i.estado === "Completado" || i.respondidas >= 100).length,
    invitaciones: consolidated,
    evaluaciones: evalsDict
  })
})""", content, flags=re.DOTALL
)

# 2. /api/investigador/editar-evaluador
content = re.sub(
    r"app\.post\('/api/investigador/editar-evaluador', \(req, res\) => \{.*?return res\.json\(\{\n    success: true,\n    mensaje: 'Perfil y datos del evaluador actualizados con éxito por el Investigador',\n    evaluacion: updatedEval,\n    invitacion: updatedInvite\n  \}\)\n\}\)",
    """app.post('/api/investigador/editar-evaluador', (req, res) => {
  const { codigoTarget, datosEvaluador } = req.body
  if (!codigoTarget || !datosEvaluador) {
    return res.status(400).json({ success: false, mensaje: 'Faltan datos obligatorios' })
  }

  const cleanTarget = codigoTarget.trim().toUpperCase()
  const cleanDni = (datosEvaluador.dni || cleanTarget).trim().toUpperCase()

  if (cleanTarget !== cleanDni && cleanTarget.startsWith('EXP-')) {
    dbManager.deleteEvaluador(cleanTarget)
  }

  const updated = dbManager.upsertEvaluador(cleanDni, datosEvaluador)

  return res.json({
    success: true,
    mensaje: 'Perfil y datos del evaluador actualizados con éxito por el Investigador',
    evaluacion: updated,
    invitacion: updated
  })
})""", content, flags=re.DOTALL
)

# Remove getConsolidatedInvitations
content = re.sub(
    r"// Función Auxiliar para Consolidar Evaluadores Únicos y sus Respuestas \(1 Fila por Evaluador Único\)\nconst getConsolidatedInvitations = \(invites, evals\) => \{.*?return result\n\}\n",
    "", content, flags=re.DOTALL
)

# 3. /api/invitaciones (GET)
content = re.sub(
    r"app\.get\('/api/invitaciones', \(req, res\) => \{.*?\n\}\)",
    """app.get('/api/invitaciones', (req, res) => {
  const result = dbManager.getConsolidatedTable()
  return res.json({ success: true, invitaciones: result })
})""", content, flags=re.DOTALL
)

# 4. /api/invitaciones/crear (POST)
content = re.sub(
    r"app\.post\('/api/invitaciones/crear', \(req, res\) => \{.*?\n\}\)",
    """app.post('/api/invitaciones/crear', (req, res) => {
  const { dni, nombreExperto, cargo, gradoAcademico, institucion, email } = req.body
  const cleanDni = (dni || '').trim().toUpperCase()
  if (!cleanDni) {
    return res.status(400).json({ success: false, mensaje: 'El DNI o Documento de Identidad del evaluador es obligatorio.' })
  }

  const newEvaluator = dbManager.upsertEvaluador(cleanDni, {
    dni: cleanDni,
    nombre: nombreExperto || 'Experto Validador',
    nombreExperto: nombreExperto || 'Experto Validador',
    cargo,
    gradoAcademico,
    institucion,
    email
  })

  return res.json({ success: true, mensaje: 'Evaluador registrado con éxito', invitación: newEvaluator, evaluacion: newEvaluator })
})""", content, flags=re.DOTALL
)

# 5. /api/invitaciones/:codigo (DELETE)
content = re.sub(
    r"app\.delete\('/api/invitaciones/:codigo', \(req, res\) => \{.*?return res\.status\(404\)\.json\(\{ success: false, mensaje: 'Registro no encontrado' \}\)\n\}\)",
    """app.delete('/api/invitaciones/:codigo', (req, res) => {
  const { codigo } = req.params
  const cleanCode = (codigo || '').trim().toUpperCase()
  const deleted = dbManager.deleteEvaluador(cleanCode)
  
  if (deleted) {
    return res.json({ success: true, mensaje: 'Evaluador o invitación eliminada correctamente' })
  }
  return res.status(404).json({ success: false, mensaje: 'Registro no encontrado' })
})""", content, flags=re.DOTALL
)

# 6. /api/evaluador/ingresar (POST)
content = re.sub(
    r"app\.post\('/api/evaluador/ingresar', \(req, res\) => \{.*?    evaluacion: evalData\n  \}\)\n\}\)",
    """app.post('/api/evaluador/ingresar', (req, res) => {
  const { codigo, dni } = req.body
  const cleanCode = (codigo || '').trim().toUpperCase()
  const cleanDni = (dni || '').trim().toUpperCase()

  let evalData = dbManager.getEvaluadorByDni(cleanCode)
  if (!evalData && cleanDni) {
    evalData = dbManager.getEvaluadorByDni(cleanDni)
  }
  
  if (!evalData && cleanDni) {
    evalData = dbManager.upsertEvaluador(cleanDni, {
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
})""", content, flags=re.DOTALL
)

# 7. /api/evaluacion/:key (GET)
content = re.sub(
    r"app\.get\('/api/evaluacion/:key', \(req, res\) => \{.*?return res\.json\(\{ success: false, message: 'No encontrado' \}\)\n\}\)",
    """app.get('/api/evaluacion/:key', (req, res) => {
  const { key } = req.params
  const cleanKey = (key || '').trim().toUpperCase()
  const ev = dbManager.getEvaluadorByDni(cleanKey)
  
  if (ev) {
    return res.json({ success: true, data: ev })
  }
  return res.json({ success: false, message: 'No encontrado' })
})""", content, flags=re.DOTALL
)

# 8. /api/evaluacion/save (POST)
content = re.sub(
    r"app\.post\('/api/evaluacion/save', \(req, res\) => \{.*?return res\.json\(\{ success: true, mensaje: 'Evaluación guardada exitosamente' \+ statusMsg, evaluacion: updatedEval \}\)\n\}\)",
    """app.post('/api/evaluacion/save', (req, res) => {
  const { codigo, payload } = req.body
  const cleanCode = (codigo || payload?.dni || '').trim().toUpperCase()
  
  if (!cleanCode) {
    return res.status(400).json({ success: false, mensaje: 'Falta la clave de identificación' })
  }

  const updated = dbManager.upsertEvaluador(cleanCode, payload || {})
  return res.json({ success: true, mensaje: 'Evaluación guardada exitosamente', evaluacion: updated })
})""", content, flags=re.DOTALL
)


with open("server.js", "w", encoding="utf-8") as f:
    f.write(content)

print("done")
