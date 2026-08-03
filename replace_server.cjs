const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// Replace /api/investigador/resumen
code = code.replace(/app\.get\('\/api\/investigador\/resumen', \(req, res\) => \{[\s\S]*?\/\/ GET Obtener todas las invitaciones/m,
`app.get('/api/investigador/resumen', (req, res) => {
  const consolidated = dbManager.getConsolidatedTable()
  const evalsDict = {}
  consolidated.forEach(item => {
    evalsDict[item.dni] = dbManager.getEvaluadorByDni(item.dni)
  })
  return res.json({
    success: true,
    invitaciones: consolidated,
    evaluaciones: evalsDict
  })
})

// GET Obtener todas las invitaciones`);

// Replace /api/investigador/editar-evaluador
code = code.replace(/app\.post\('\/api\/investigador\/editar-evaluador', \(req, res\) => \{[\s\S]*?\/\/ Función Auxiliar para Consolidar Evaluadores/m,
`app.post('/api/investigador/editar-evaluador', (req, res) => {
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
})

// Función Auxiliar para Consolidar Evaluadores`);

// Remove getConsolidatedInvitations entirely
code = code.replace(/\/\/ Función Auxiliar para Consolidar Evaluadores Únicos[\s\S]*?return result\n\}\n/m, '');

// Replace /api/invitaciones
code = code.replace(/app\.get\('\/api\/invitaciones', \(req, res\) => \{[\s\S]*?return res\.json\(\{ success: true, invitaciones: result \}\)\n\}\)/m,
`app.get('/api/invitaciones', (req, res) => {
  const result = dbManager.getConsolidatedTable()
  return res.json({ success: true, invitaciones: result })
})`);

// Replace /api/invitaciones/crear
code = code.replace(/app\.post\('\/api\/invitaciones\/crear', \(req, res\) => \{[\s\S]*?\/\/ DELETE Eliminar una invitación/m,
`app.post('/api/invitaciones/crear', (req, res) => {
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
})

// DELETE Eliminar una invitación`);

// Replace /api/invitaciones/:codigo (DELETE)
code = code.replace(/app\.delete\('\/api\/invitaciones\/:codigo', \(req, res\) => \{[\s\S]*?\/\/ GENERADOR DE CÓDIGO/m,
`app.delete('/api/invitaciones/:codigo', (req, res) => {
  const { codigo } = req.params
  const cleanCode = (codigo || '').trim().toUpperCase()
  const deleted = dbManager.deleteEvaluador(cleanCode)
  
  if (deleted) {
    return res.json({ success: true, mensaje: 'Evaluador o invitación eliminada correctamente' })
  }
  return res.status(404).json({ success: false, mensaje: 'Registro no encontrado' })
})

// GENERADOR DE CÓDIGO`);

// Replace /api/evaluador/ingresar
code = code.replace(/app\.post\('\/api\/evaluador\/ingresar', \(req, res\) => \{[\s\S]*?\/\/ GET Consulta por DNI/m,
`app.post('/api/evaluador/ingresar', (req, res) => {
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
})

// GET Consulta por DNI`);

// Replace /api/evaluacion/:key
code = code.replace(/app\.get\('\/api\/evaluacion\/:key', \(req, res\) => \{[\s\S]*?\/\/ POST Guardar\/Actualizar evaluación/m,
`app.get('/api/evaluacion/:key', (req, res) => {
  const { key } = req.params
  const cleanKey = (key || '').trim().toUpperCase()
  const ev = dbManager.getEvaluadorByDni(cleanKey)
  
  if (ev) {
    return res.json({ success: true, data: ev })
  }
  return res.json({ success: false, message: 'No encontrado' })
})

// POST Guardar/Actualizar evaluación`);

// Replace /api/evaluacion/save
code = code.replace(/app\.post\('\/api\/evaluacion\/save', \(req, res\) => \{[\s\S]*?\/\/ START SERVER/m,
`app.post('/api/evaluacion/save', (req, res) => {
  const { codigo, payload } = req.body
  const cleanCode = (codigo || payload?.dni || '').trim().toUpperCase()
  
  if (!cleanCode) {
    return res.status(400).json({ success: false, mensaje: 'Falta la clave de identificación' })
  }

  const updated = dbManager.upsertEvaluador(cleanCode, payload || {})
  return res.json({ success: true, mensaje: 'Evaluación guardada exitosamente', evaluacion: updated })
})

// START SERVER`);

fs.writeFileSync('server.js', code);
console.log('server.js updated successfully!');
