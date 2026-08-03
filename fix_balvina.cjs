const fs = require('fs')
const path = require('path')

const T_EVALUADORES = path.join(__dirname, 'db_data', 'tabla_evaluadores.json')
const T_RESPUESTAS = path.join(__dirname, 'db_data', 'tabla_evaluaciones_respuestas.json')
const T_HOJAS = path.join(__dirname, 'db_data', 'tabla_hojas_vida.json')

const T_EVAL_OLD = path.join(__dirname, 'db_data', 'evaluaciones.json')
const T_INV_OLD = path.join(__dirname, 'db_data', 'invitaciones.json')

function migrateData(file) {
  if (!fs.existsSync(file)) return
  let data = JSON.parse(fs.readFileSync(file, 'utf-8'))
  
  if (data['09091855']) {
    // Si ya existe 12121212, lo combinamos, dándole prioridad a lo que esté en 09091855 (que tiene las respuestas reales de Balvina)
    let existing = data['12121212'] || {}
    let toMove = data['09091855']
    
    // Cambiar las referencias internas
    toMove.dni = '12121212'
    if (toMove.codigo) toMove.codigo = '12121212'
    if (toMove.inviteCode) toMove.inviteCode = '12121212'
    
    data['12121212'] = { ...existing, ...toMove }
    delete data['09091855']
    
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8')
    console.log(`Migrated 09091855 to 12121212 in ${path.basename(file)}`)
  }
}

migrateData(T_EVALUADORES)
migrateData(T_RESPUESTAS)
migrateData(T_HOJAS)
migrateData(T_EVAL_OLD)
migrateData(T_INV_OLD)

console.log('done')
