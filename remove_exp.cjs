const fs = require('fs')
const path = require('path')

const evaluadoresFile = path.join(__dirname, 'db_data', 'tabla_evaluadores.json')
const evaluacionesFile = path.join(__dirname, 'db_data', 'evaluaciones.json')
const invitacionesFile = path.join(__dirname, 'db_data', 'invitaciones.json')

function updateJson(file) {
  if (!fs.existsSync(file)) return
  let data = JSON.parse(fs.readFileSync(file, 'utf-8'))
  if (data['EXP-RM99']) {
    delete data['EXP-RM99']
  }
  
  if (file === evaluadoresFile) {
    data['31680729'] = {
      "dni": "31680729",
      "codigo": "31680729",
      "nombre": "Rosa Karol Moore Torres",
      "nombreExperto": "Rosa Karol Moore Torres",
      "nombresExperto": "Rosa Karol",
      "apellidosExperto": "Moore Torres",
      "cargo": "Licenciada en Administración",
      "gradoAcademico": "Doctora",
      "institucion": "Universidad Nacional Mayor de San Marcos",
      "email": "kmooret@unmsm.edu.pe",
      "creadoEn": "2026-07-26T09:00:00.000Z",
      "estado": "Pendiente",
      "respondidas": 0,
      "respuestas": {}
    }
  }

  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8')
}

updateJson(evaluadoresFile)
updateJson(evaluacionesFile)
updateJson(invitacionesFile)
console.log('done')
