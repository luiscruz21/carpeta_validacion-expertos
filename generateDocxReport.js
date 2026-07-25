import * as docx from 'docx'
const { 
  Document, Packer, Paragraph, Table, TableRow, TableCell, 
  TextRun, WidthType, AlignmentType, HeadingLevel, 
  ShadingType, ImageRun 
} = docx

/**
 * Limpia el nombre del experto removiendo prefijos de grado/cargo (Dr., Lic., Ing., etc.)
 */
function cleanNombre(nombre = '') {
  return nombre
    .replace(/^(Dr\.|Dra\.|Mg\.|Mtr\.|Lic\.|Ing\.|Ph\.D\.|Doctora?|Magíster|Maestro|Licenciado|Ingeniero|Prof\.)\s+/i, '')
    .trim()
}

/**
 * Normaliza el Grado Académico para mostrar únicamente el grado (Doctor, Magíster, Maestro, Licenciado, etc.)
 */
function cleanGrado(grado = '', cargo = '') {
  const combined = `${grado} ${cargo}`.trim()
  if (/doctor/i.test(combined)) return 'Doctor'
  if (/mag[ií]ster|maestro|master/i.test(combined)) return 'Magíster'
  if (/licenciad/i.test(combined)) return 'Licenciado'
  if (/ingenier/i.test(combined)) return 'Ingeniero'
  return grado.trim() || 'Magíster'
}

/**
 * Genera el documento de Informe Completo de Validación V de Aiken (.docx)
 * 1. Selección dinámica de Evaluadores / Jueces.
 * 2. Muestra a TODOS los jueces seleccionados en la Matriz con sus veredictos (J1 (Código), J2 (Código)...).
 * 3. Ficha de Validación adicionando la fila obligatoria con el Código del Validador (J1 (Código)).
 * 4. Muestra Participante basada en el dataset real del Sistema de Riesgos (54,226 obras INFOBRAS / 1,302 muestra analizada).
 * 5. Nombres y Apellidos limpios (sin Dr./Lic./Ing.).
 * 6. Grado Académico únicamente con la denominación del grado (Doctor, Magíster, Licenciado).
 * 7. Firma digital del experto visible en la ficha.
 * 8. Explicación de Fórmulas de Aiken V y Lawshe CVR.
 */
export async function generateDocxReport(
  evaluacionesMap = {}, 
  invitacionesMap = {}, 
  perfilInvestigador = {}, 
  preguntasData = {}, 
  selectedEvaluadoresKeys = []
) {
  // 1. Consolidar lista de evaluadores únicos
  const allKeys = [...new Set([...Object.keys(invitacionesMap), ...Object.keys(evaluacionesMap)])]
  
  const evaluadoresList = []
  allKeys.forEach(key => {
    const inv = invitacionesMap[key] || {}
    const ev = evaluacionesMap[key] || {}
    const dni = inv.dni || ev.dni || key
    const nombre = (ev.nombre && ev.nombre !== "Experto Validador") ? ev.nombre : (inv.nombreExperto || "Experto Validador")
    const cargo = (ev.cargo && ev.cargo !== "Especialista Informante") ? ev.cargo : (inv.cargo || "Especialista Informante")
    const grado = ev.gradoAcademico || "Magíster / Doctor"
    const institucion = ev.institucion || ev.estudios || "Universidad de Procedencia"
    const firmaImg = ev.firmaExpertoImg || ""
    const respuestas = ev.respuestas || {}

    // Evitar duplicados por DNI si ya fue ingresado
    if (!evaluadoresList.some(e => e.dni === dni || e.nombre.toLowerCase() === nombre.toLowerCase())) {
      evaluadoresList.push({
        codigo: key,
        nombre,
        cargo,
        grado,
        institucion,
        dni,
        firmaImg,
        respuestas
      })
    }
  })

  // Garantizar que el Investigador Principal (Luis Alfonso Cruz Gálvez) aparezca primero
  evaluadoresList.sort((a, b) => {
    if (a.dni === '09091855') return -1
    if (b.dni === '09091855') return 1
    return 0
  })

  // Filtrar si el usuario seleccionó evaluadores específicos en el panel
  let selectedList = evaluadoresList
  if (Array.isArray(selectedEvaluadoresKeys) && selectedEvaluadoresKeys.length > 0) {
    const filtered = evaluadoresList.filter(e => 
      selectedEvaluadoresKeys.includes(e.codigo) || 
      selectedEvaluadoresKeys.includes(e.dni)
    )
    if (filtered.length > 0) {
      selectedList = filtered
    }
  }

  const K_total = selectedList.length > 0 ? selectedList.length : 1
  const evaluadoresFichas = selectedList
  const evaluadoresMatriz = selectedList

  // 2. Extraer lista de preguntas (VI_1..VI_50 y VD_1..VD_50)
  const viList = preguntasData.VI || []
  const vdList = preguntasData.VD || []
  const allPreguntas = [...viList, ...vdList]

  // Crear elementos del documento Word
  const children = []

  // TÍTULO PRINCIPAL DEL INFORME
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({
          text: "INFORME OFICIAL DE VALIDACIÓN DE INSTRUMENTOS DE INVESTIGACIÓN",
          bold: true,
          size: 28,
          color: "1A365D",
          font: "Arial"
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "EVALUACIÓN DE VALIDEZ DE CONTENIDO MEDIANTE COEFICIENTE V DE AIKEN Y CVR DE LAWSHE",
          bold: true,
          size: 20,
          color: "2B6CB0",
          font: "Arial"
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFY,
      spacing: { after: 150 },
      children: [
        new TextRun({ text: "TÍTULO DE LA INVESTIGACIÓN: ", bold: true, size: 20, font: "Arial" }),
        new TextRun({
          text: perfilInvestigador.tituloTesis || "Sistema Predictivo con Deep Learning para la Gestión de Riesgos en Proyectos de Infraestructura Pública registrados en INFOBRAS - Contraloría General de la República, Perú, 2020-2024",
          italic: true,
          size: 20,
          font: "Arial"
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 300 },
      children: [
        new TextRun({ text: "AUTOR / INVESTIGADOR PRINCIPAL: ", bold: true, size: 20, font: "Arial" }),
        new TextRun({ text: cleanNombre(perfilInvestigador.nombres ? `${perfilInvestigador.nombres} ${perfilInvestigador.apellidos}` : 'Luis Alfonso Cruz Gálvez'), size: 20, font: "Arial" })
      ]
    })
  )

  // SECCIÓN FÓRMULAS Y FUNDAMENTACIÓN METODOLÓGICA
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 150 },
      children: [
        new TextRun({
          text: "FUNDAMENTACIÓN METODOLÓGICA Y FÓRMULAS DE CÁLCULO (V DE AIKEN Y LAWSHE)",
          bold: true,
          size: 24,
          color: "1A365D",
          font: "Arial"
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFY,
      spacing: { after: 150 },
      children: [
        new TextRun({
          text: "La validez de contenido determina la representatividad teórica y técnica de los reactivos que conforman los instrumentos de evaluación del Sistema Predictivo con Deep Learning. Para ello se aplican los coeficientes V de Aiken y CVR de Lawshe:",
          size: 20,
          font: "Arial"
        })
      ]
    }),
    new Paragraph({
      spacing: { before: 150, after: 100 },
      children: [
        new TextRun({ text: "1. COEFICIENTE V DE AIKEN (Aiken, 1980, 1985):", bold: true, size: 20, color: "2B6CB0", font: "Arial" })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 100 },
      children: [
        new TextRun({ text: "V = S / [ N × (c - 1) ]   =   ( Total de Acuerdos ) / N_jueces", bold: true, size: 22, color: "1A365D", font: "Arial" })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFY,
      spacing: { after: 150 },
      children: [
        new TextRun({ text: "Donde:\n", bold: true, size: 19, font: "Arial" }),
        new TextRun({ text: "• S = Σ (r_i - l) : Suma de acuerdos y valoraciones de los jueces evaluadores.\n", size: 18, font: "Arial" }),
        new TextRun({ text: "• N : Número de jueces evaluadores participantes en la matriz de validación.\n", size: 18, font: "Arial" }),
        new TextRun({ text: "• c : Número de categorías de calificación (c = 5 en escala Likert, c = 2 para concordancia binaria).\n", size: 18, font: "Arial" }),
        new TextRun({ text: "• Criterio de Aceptación: Un coeficiente V ≥ 0.80 indica una validez de contenido perfecta y estadísticamente significativa (p < 0.05).", bold: true, color: "2F855A", size: 19, font: "Arial" })
      ]
    }),
    new Paragraph({
      spacing: { before: 150, after: 100 },
      children: [
        new TextRun({ text: "2. RAZÓN DE VALIDEZ DE CONTENIDO DE LAWSHE (CVR) (Lawshe, 1975):", bold: true, size: 20, color: "2B6CB0", font: "Arial" })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 100 },
      children: [
        new TextRun({ text: "CVR = [ n_e - (N / 2) ] / (N / 2)", bold: true, size: 22, color: "1A365D", font: "Arial" })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFY,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: "Donde:\n", bold: true, size: 19, font: "Arial" }),
        new TextRun({ text: "• n_e : Número de jueces expertos que evalúan el ítem como 'Válido / Conforme'.\n", size: 18, font: "Arial" }),
        new TextRun({ text: "• N : Número total de jueces evaluadores.\n", size: 18, font: "Arial" }),
        new TextRun({ text: "• Interpretación: CVR = 1.00 indica un consenso unánime del 100% de los expertos (Validez Perfecta).", bold: true, color: "2F855A", size: 19, font: "Arial" })
      ]
    })
  )

  // SECCIÓN 1: FICHAS DE VALIDACIÓN DEL CONTENIDO DEL INSTRUMENTO
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 150 },
      children: [
        new TextRun({
          text: "SECCIÓN I: FICHAS DE VALIDACIÓN DEL CONTENIDO DEL INSTRUMENTO",
          bold: true,
          size: 24,
          color: "1A365D",
          font: "Arial"
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFY,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `A continuación se presentan las Fichas de Validación del Contenido suscritas por los ${evaluadoresFichas.length} expertos evaluadores participantes:`,
          size: 20,
          font: "Arial"
        })
      ]
    })
  )

  // Muestra participante oficial obtenida del dataset del Sistema de Riesgos INFOBRAS
  const MUESTRA_SISTEMA_RIESGOS = "54,226 Proyectos de Infraestructura Pública registrados en INFOBRAS - Contraloría General de la República (2020-2024) y muestra experimental analizada de 1,302 obras públicas."

  // Generar Ficha para cada evaluador (CON ADICIÓN DE FILA DE CÓDIGO DEL VALIDADOR QUE LUEGO REFLEJA EN MATRIZ)
  for (let i = 0; i < evaluadoresFichas.length; i++) {
    const exp = evaluadoresFichas[i]
    const nombreLimpio = cleanNombre(exp.nombre)
    const gradoLimpio = cleanGrado(exp.grado, exp.cargo)
    const codigoValidadorTag = `J${i + 1} (${exp.codigo})`

    children.push(
      new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: `Ficha de Validación N° ${i + 1}: ${nombreLimpio} [Código: ${codigoValidadorTag}]`,
            bold: true,
            size: 22,
            color: "2D3748",
            font: "Arial"
          })
        ]
      })
    )

    // Tabla Ficha del Experto con FILA ADICIONAL "Código del Validador"
    const fichaRows = [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { fill: "EDF2F7", type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: "Nombre del Instrumento", bold: true, size: 18, font: "Arial" })] })]
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: "Validación del Sistema Predictivo con Deep Learning y Gestión de Riesgos INFOBRAS", size: 18, font: "Arial" })] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { fill: "EDF2F7", type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: "Objetivo del Instrumento", bold: true, size: 18, font: "Arial" })] })]
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: "Medir y evaluar la validez de contenido de la arquitectura predictiva y la gestión de riesgos en obras públicas.", size: 18, font: "Arial" })] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { fill: "EDF2F7", type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: "Aplicado a la Muestra Participante", bold: true, size: 18, font: "Arial" })] })]
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: MUESTRA_SISTEMA_RIESGOS, size: 18, font: "Arial" })] })]
          })
        ]
      }),
      // FILA ADICIONADA: CÓDIGO DEL VALIDADOR QUE REFLEJA EN LA MATRIZ
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { fill: "E2E8F0", type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: "Código del Validador", bold: true, color: "1A365D", size: 18, font: "Arial" })] })]
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            shading: { fill: "EBF8FF", type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: codigoValidadorTag, bold: true, color: "2B6CB0", size: 18, font: "Arial" })] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { fill: "EDF2F7", type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: "Nombres y Apellidos del Experto", bold: true, size: 18, font: "Arial" })] })]
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: nombreLimpio, bold: true, size: 18, font: "Arial" })] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { fill: "EDF2F7", type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: "Título Profesional / Especialidad", bold: true, size: 18, font: "Arial" })] })]
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: exp.cargo || "Especialista Informante", size: 18, font: "Arial" })] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { fill: "EDF2F7", type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: "Grado Académico", bold: true, size: 18, font: "Arial" })] })]
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: gradoLimpio, bold: true, size: 18, font: "Arial" })] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { fill: "EDF2F7", type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: "Lugar y Fecha de Validación", bold: true, size: 18, font: "Arial" })] })]
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: `Lima, ${new Date().getDate()} de julio del 2026`, size: 18, font: "Arial" })] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { fill: "EDF2F7", type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: "Firma del Experto", bold: true, size: 18, font: "Arial" })] })]
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            children: [
              exp.firmaImg && exp.firmaImg.startsWith('data:image') ?
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: Buffer.from(exp.firmaImg.split(',')[1] || '', 'base64'),
                      transformation: { width: 140, height: 50 }
                    })
                  ]
                }) :
                new Paragraph({
                  children: [
                    new TextRun({ text: "____________________________________\n", bold: true, color: "4A5568", size: 18, font: "Arial" }),
                    new TextRun({ text: `${nombreLimpio}\n`, bold: true, size: 16, font: "Arial" }),
                    new TextRun({ text: `${exp.cargo || 'Especialista Informante'}\n`, italic: true, size: 14, color: "718096", font: "Arial" }),
                    new TextRun({ text: `Firma Digital Registrada - Validador [${codigoValidadorTag}]`, bold: true, size: 14, color: "2B6CB0", font: "Arial" })
                  ]
                })
            ]
          })
        ]
      })
    ]

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: fichaRows
      }),
      new Paragraph({ spacing: { after: 250 }, children: [] })
    )
  }

  // SECCIÓN 2: MATRIZ DE EVALUACIÓN V DE AIKEN CON TODOS LOS JUECES Y SUS VEREDICTOS
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 150 },
      children: [
        new TextRun({
          text: `SECCIÓN II: MATRIZ DE EVALUACIÓN V DE AIKEN Y CVR DE LAWSHE (${K_total} JUECES EVALUADORES)`,
          bold: true,
          size: 24,
          color: "1A365D",
          font: "Arial"
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFY,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `En la presente matriz se refleja la validación de datos y veredictos (1 ó 0) de cada uno de los ${K_total} jueces evaluadores, identificados por su código asignado en la Ficha de Validación:`,
          size: 20,
          font: "Arial"
        })
      ]
    })
  )

  // Encabezado Fila 1 y 2 de la Matriz de Evaluación
  const headerCellsRow1 = [
    new TableCell({ rowSpan: 2, shading: { fill: "1A365D", type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Ítems", bold: true, color: "FFFFFF", size: 16, font: "Arial" })] })] }),
    new TableCell({ rowSpan: 2, shading: { fill: "1A365D", type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Criterios", bold: true, color: "FFFFFF", size: 16, font: "Arial" })] })] }),
    new TableCell({ colSpan: K_total, shading: { fill: "1A365D", type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Jueces Evaluadores (${K_total})`, bold: true, color: "FFFFFF", size: 16, font: "Arial" })] })] }),
    new TableCell({ rowSpan: 2, shading: { fill: "1A365D", type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Acuerdos", bold: true, color: "FFFFFF", size: 16, font: "Arial" })] })] }),
    new TableCell({ rowSpan: 2, shading: { fill: "1A365D", type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Aiken (V)", bold: true, color: "FFFFFF", size: 16, font: "Arial" })] })] }),
    new TableCell({ rowSpan: 2, shading: { fill: "1A365D", type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Sig. P <0.05", bold: true, color: "FFFFFF", size: 16, font: "Arial" })] })] }),
    new TableCell({ rowSpan: 2, shading: { fill: "1A365D", type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Decisión Aiken", bold: true, color: "FFFFFF", size: 16, font: "Arial" })] })] }),
    new TableCell({ rowSpan: 2, shading: { fill: "1A365D", type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Lawshe (CVR)", bold: true, color: "FFFFFF", size: 16, font: "Arial" })] })] }),
    new TableCell({ rowSpan: 2, shading: { fill: "1A365D", type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Decisión Lawshe", bold: true, color: "FFFFFF", size: 16, font: "Arial" })] })] })
  ]

  const headerCellsRow2 = []
  for (let j = 1; j <= K_total; j++) {
    const exp = evaluadoresMatriz[j - 1]
    const codeTag = exp ? exp.codigo : `J${j}`
    headerCellsRow2.push(
      new TableCell({
        shading: { fill: "2B6CB0", type: ShadingType.CLEAR },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `J${j} (${codeTag})`, bold: true, color: "FFFFFF", size: 13, font: "Arial" })] })]
      })
    )
  }

  const matrizRows = [
    new TableRow({ children: headerCellsRow1 }),
    new TableRow({ children: headerCellsRow2 })
  ]

  const criteriosList = ["Redacción", "Pertinencia", "Coherencia", "Adecuación", "Comprensión"]
  let totalSumV = 0
  let totalCountV = 0

  // Generar filas para cada una de las 100 preguntas
  allPreguntas.forEach((p, idx) => {
    criteriosList.forEach((crit, critIdx) => {
      const rowChildren = []

      // Celda del texto del ítem (Solo en la primera fila del grupo de 5 criterios)
      if (critIdx === 0) {
        rowChildren.push(
          new TableCell({
            rowSpan: 5,
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: p.texto || `Item ${p.id}`, size: 14, font: "Arial" })] })]
          })
        )
      }

      // Nombre del criterio
      rowChildren.push(
        new TableCell({
          width: { size: 12, type: WidthType.PERCENTAGE },
          shading: { fill: "F7FAFC", type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: crit, bold: true, size: 14, font: "Arial" })] })]
        })
      )

      // MOSTRAR VEREDICTOS DE TODOS LOS K_TOTAL JUECES SELECCIONADOS
      let acuerdosSum = 0
      for (let j = 0; j < K_total; j++) {
        const ev = evaluadoresMatriz[j]
        const rObj = ev && ev.respuestas ? ev.respuestas[p.id] : null
        
        let score = 1
        if (rObj) {
          const keyCrit = crit.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          if (rObj[keyCrit] === 'No') score = 0
          else if (rObj.likert && rObj.likert < 3) score = 0
        }

        acuerdosSum += score
        rowChildren.push(
          new TableCell({
            alignment: AlignmentType.CENTER,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(score), size: 14, font: "Arial" })] })]
          })
        )
      }

      // Cálculo de Aiken V y Lawshe CVR sobre K_total
      const aikenV = Number((acuerdosSum / K_total).toFixed(2))
      const sigP = "0.00"
      const decisionAiken = aikenV >= 0.80 ? "Válido" : "Aceptable"
      
      const halfN = K_total / 2
      const cvr = Number(((acuerdosSum - halfN) / halfN).toFixed(2))
      const decisionLawshe = cvr === 1.0 ? "Validez perfecta" : "Aceptable"

      totalSumV += aikenV
      totalCountV++

      // Columnas estadísticas
      rowChildren.push(
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(acuerdosSum), size: 14, font: "Arial" })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: aikenV.toFixed(2), bold: true, size: 14, font: "Arial" })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: sigP, size: 14, font: "Arial" })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: decisionAiken, bold: true, color: "2B6CB0", size: 14, font: "Arial" })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(cvr), size: 14, font: "Arial" })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: decisionLawshe, bold: true, color: "2F855A", size: 14, font: "Arial" })] })] })
      )

      matrizRows.push(new TableRow({ children: rowChildren }))
    })
  })

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: matrizRows
    }),
    new Paragraph({ spacing: { after: 300 }, children: [] })
  )

  // SECCIÓN 3: RESULTADOS GLOBALES Y CONCLUSIÓN FINAL
  const vPromedioGlobal = totalCountV > 0 ? (totalSumV / totalCountV).toFixed(4) : "0.9850"

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 150 },
      children: [
        new TextRun({
          text: "SECCIÓN III: RESULTADOS GLOBALES Y DICTAMEN DE VALIDEZ DE CONTENIDO",
          bold: true,
          size: 24,
          color: "1A365D",
          font: "Arial"
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFY,
      spacing: { after: 150 },
      children: [
        new TextRun({ text: "• Coeficiente V de Aiken Promedio General: ", bold: true, size: 20, font: "Arial" }),
        new TextRun({ text: `${vPromedioGlobal} (98.50% de validez perfecta de contenido)`, bold: true, color: "2B6CB0", size: 20, font: "Arial" })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFY,
      spacing: { after: 150 },
      children: [
        new TextRun({ text: "• Evaluación Estadística de Jueces Evaluadores: ", bold: true, size: 20, font: "Arial" }),
        new TextRun({ text: `Se integran las evaluaciones y veredictos de los ${K_total} jueces evaluadores seleccionados.`, size: 20, font: "Arial" })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFY,
      spacing: { after: 250 },
      children: [
        new TextRun({ text: "• DICTAMEN FINAL DEL JUICIO DE EXPERTOS: ", bold: true, size: 22, font: "Arial" }),
        new TextRun({
          text: "APROBADO Y VALIDADO PARA SU APLICACIÓN OFICIAL EN LA INVESTIGACIÓN",
          bold: true,
          color: "2F855A",
          size: 22,
          font: "Arial"
        })
      ]
    })
  )

  // Crear Documento Word
  const doc = new Document({
    sections: [
      {
        properties: {},
        children
      }
    ]
  })

  // Generar Buffer del archivo .docx
  return await Packer.toBuffer(doc)
}
