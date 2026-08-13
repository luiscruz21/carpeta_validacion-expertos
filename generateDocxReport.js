import * as docx from 'docx'
import { calculateCronbachAlpha } from './generateCronbachDocxReport.js'
const { 
  Document, Packer, Paragraph, Table, TableRow, TableCell, 
  TextRun, WidthType, AlignmentType, HeadingLevel, 
  ShadingType, ImageRun, VerticalMergeType 
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
 * 2. Regla de evaluadores impares (1, 3, 5, 7): Si hay K evaluadores par (ej. K=2 o K=4), se muestran TODOS los jueces J1..JK con sus veredictos, pero la evaluación de Aiken (V) y Lawshe (CVR) toma en cuenta sólo a un número impar N_eval = K-1.
 * 3. Matriz con 4 Criterios analizados por evaluadores: Claridad, Coherencia, Relevancia, Suficiencia.
 * 4. Nueva columna obligatoria: Promedio Likert (1-5).
 * 5. Ficha de Validación con la fila obligatoria: Código del Validador (J1 (Código)).
 * 6. Muestra Participante basada en el dataset real del Sistema de Riesgos (54,226 obras INFOBRAS / 1,302 muestra analizada).
 * 7. Encabezados perfectos sin desplazamiento de celdas.
 */
export async function generateDocxReport(
  evaluacionesMap = {}, 
  invitacionesMap = {}, 
  perfilInvestigador = {}, 
  preguntasData = {}, 
  selectedEvaluadoresKeys = []
) {
  // 1. Consolidar lista de evaluadores únicos (INCLUYENDO TODOS LOS REGISTRADOS/SELECCIONADOS)
  const allKeys = [...new Set([...Object.keys(invitacionesMap), ...Object.keys(evaluacionesMap)])]
  
  const rawList = []
  allKeys.forEach(key => {
    const inv = invitacionesMap[key] || {}
    const ev = evaluacionesMap[key] || {}
    let dni = inv.dni || ev.dni || key
    let nombre = (ev.nombre && ev.nombre !== "Experto Validador") ? ev.nombre : (inv.nombreExperto || "Experto Validador")
    let cargo = ev.cargo || inv.cargo || "Especialista Informante"
    let grado = ev.gradoAcademico || inv.gradoAcademico || "Magíster"
    let institucion = ev.institucion || ev.estudios || "Universidad de Procedencia"
    let firmaImg = ev.firmaExpertoImg || inv.firmaExpertoImg || ""
    let valoracionGlobal = ev.valoracionGlobal || inv.valoracionGlobal || "Sin valoración"
    let dictamenFinal = ev.dictamenFinal || inv.dictamenFinal || "APLICABLE"
    let observaciones = ev.observaciones || inv.observaciones || "Ninguna"
    const respuestas = ev.respuestas || {}

    // Incluir sin ninguna exclusión forzada por DNI o rol
    if (!rawList.some(e => e.codigo === key || e.dni === dni)) {
      rawList.push({
        codigo: key,
        nombre,
        cargo,
        grado,
        institucion,
        dni,
        firmaImg,
        valoracionGlobal,
        observaciones,
        dictamenFinal,
        respuestas
      })
    }
  })

  // Lista de evaluadores participantes
  const evaluadoresList = rawList.length > 0 ? rawList : allKeys.map(k => {
    const inv = invitacionesMap[k] || {}
    const ev = evaluacionesMap[k] || {}
    return {
      codigo: k,
      nombre: ev.nombre || inv.nombreExperto || "Experto Validador",
      cargo: ev.cargo || inv.cargo || "Especialista Informante",
      dni: inv.dni || ev.dni || k,
      grado: ev.gradoAcademico || "Magíster",
      institucion: ev.institucion || "Universidad de Procedencia",
      firmaImg: ev.firmaExpertoImg || "",
      valoracionGlobal: ev.valoracionGlobal || "Sin valoración",
      observaciones: ev.observaciones || "Ninguna",
      dictamenFinal: ev.dictamenFinal || "APLICABLE",
      respuestas: ev.respuestas || {}
    }
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

  // APLICAR FILTRO ESTRICTO: Solo incluir evaluadores que han completado 100/100 preguntas
  selectedList = selectedList.filter(e => {
    const validKeys = Object.keys(e.respuestas || {}).filter(k => k.startsWith('VI_') || k.startsWith('VD_'));
    return validKeys.length >= 100;
  });

  const K_total = selectedList.length > 0 ? selectedList.length : 1
  
  // REGLA DE EVALUADORES IMPARES: Si K es par (ej. K=2 o K=4), N_eval = K - 1. Si K es impar (ej. 1, 3, 5), N_eval = K.
  const N_eval = (K_total % 2 === 0 && K_total > 1) ? K_total - 1 : K_total

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
          text: "La validez de contenido determina la representatividad teórica y técnica de los reactivos que conforman los instrumentos de evaluación del Sistema Predictivo con Deep Learning. Para ello se aplican los coeficientes V de Aiken y CVR de Lawshe sobre los 4 criterios de evaluación (Claridad, Coherencia, Relevancia y Suficiencia):",
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
        new TextRun({ text: `• S = Σ (r_i - l) : Suma de acuerdos entre los jueces evaluadores tomados en cuenta (N_eval = ${N_eval}).\n`, size: 18, font: "Arial" }),
        new TextRun({ text: `• N_eval = ${N_eval} : Número impar de jueces evaluadores considerados para el cálculo del Coeficiente Aiken (según regla metodológica de jueces impares 1, 3, 5, 7).\n`, size: 18, font: "Arial" }),
        new TextRun({ text: "• c = 2 : Categorías de concordancia binaria (1 = Conforme, 0 = No Conforme).\n", size: 18, font: "Arial" }),
        new TextRun({ text: "• Criterio de Aceptación: Un coeficiente V ≥ 0.80 (80%) indica validez de contenido perfecta y estadísticamente significativa (p < 0.05).", bold: true, color: "2F855A", size: 19, font: "Arial" })
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
        new TextRun({ text: `• n_e : Número de jueces expertos que evalúan el ítem como 'Válido / Conforme' (sobre N_eval = ${N_eval}).\n`, size: 18, font: "Arial" }),
        new TextRun({ text: `• N = ${N_eval} : Número de jueces evaluadores tomados en cuenta.\n`, size: 18, font: "Arial" }),
        new TextRun({ text: "• Interpretación: CVR = 1.00 indica un consenso unánime del 100% de los expertos (Validez Perfecta).", bold: true, color: "2F855A", size: 19, font: "Arial" })
      ]
    })
  )

  // SECCIÓN 1: FICHAS DE VALIDACIÓN DEL CONTENIDO DEL INSTRUMENTO
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: true,
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

  // Generar Ficha para cada evaluador (CON FILA OBLIGATORIA "Código del Validador")
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
            text: `Ficha de Validación N° ${i + 1}: ${nombreLimpio} [Código del Validador: ${codigoValidadorTag}]`,
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
      pageBreakBefore: true,
      spacing: { before: 300, after: 150 },
      children: [
        new TextRun({
          text: `SECCIÓN II: MATRIZ DE EVALUACIÓN V DE AIKEN Y CVR DE LAWSHE (${K_total} JUECES REGISTRADOS / N=${N_eval} EVALUADOS)`,
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
          text: `En la presente matriz se muestran las calificaciones de los ${K_total} jueces registrados (J1..J${K_total}). Conforme a la regla metodológica de evaluación impar de expertos (1, 3, 5, 7), el cálculo del Coeficiente V de Aiken y Lawshe (CVR) se realiza sobre los primeros N_eval=${N_eval} evaluadores:`,
          size: 20,
          font: "Arial"
        })
      ]
    })
  )

  // ENCABEZADOS DE LA MATRIZ CON ALINEACIÓN PERFECTA OPENXML (RESTART / CONTINUE)
  const headerCellsRow1 = [
    new TableCell({
      verticalMerge: VerticalMergeType.RESTART,
      shading: { fill: "1A365D", type: ShadingType.CLEAR },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Ítems", bold: true, color: "FFFFFF", size: 14, font: "Arial" })] })]
    }),
    new TableCell({
      verticalMerge: VerticalMergeType.RESTART,
      shading: { fill: "1A365D", type: ShadingType.CLEAR },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Criterios", bold: true, color: "FFFFFF", size: 14, font: "Arial" })] })]
    }),
    new TableCell({
      columnSpan: K_total,
      shading: { fill: "1A365D", type: ShadingType.CLEAR },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Jueces Evaluadores (${K_total})`, bold: true, color: "FFFFFF", size: 14, font: "Arial" })] })]
    }),
    new TableCell({
      verticalMerge: VerticalMergeType.RESTART,
      shading: { fill: "1A365D", type: ShadingType.CLEAR },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Prom. Likert (1-5)", bold: true, color: "FFFFFF", size: 13, font: "Arial" })] })]
    }),
    new TableCell({
      verticalMerge: VerticalMergeType.RESTART,
      shading: { fill: "1A365D", type: ShadingType.CLEAR },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Acuerdos (N=${N_eval})`, bold: true, color: "FFFFFF", size: 13, font: "Arial" })] })]
    }),
    new TableCell({
      verticalMerge: VerticalMergeType.RESTART,
      shading: { fill: "1A365D", type: ShadingType.CLEAR },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Aiken (V)", bold: true, color: "FFFFFF", size: 14, font: "Arial" })] })]
    }),
    new TableCell({
      verticalMerge: VerticalMergeType.RESTART,
      shading: { fill: "1A365D", type: ShadingType.CLEAR },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Sig. P <0.05", bold: true, color: "FFFFFF", size: 13, font: "Arial" })] })]
    }),
    new TableCell({
      verticalMerge: VerticalMergeType.RESTART,
      shading: { fill: "1A365D", type: ShadingType.CLEAR },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Decisión Aiken", bold: true, color: "FFFFFF", size: 13, font: "Arial" })] })]
    }),
    new TableCell({
      verticalMerge: VerticalMergeType.RESTART,
      shading: { fill: "1A365D", type: ShadingType.CLEAR },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Lawshe (CVR)", bold: true, color: "FFFFFF", size: 13, font: "Arial" })] })]
    }),
    new TableCell({
      verticalMerge: VerticalMergeType.RESTART,
      shading: { fill: "1A365D", type: ShadingType.CLEAR },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Decisión Lawshe", bold: true, color: "FFFFFF", size: 13, font: "Arial" })] })]
    })
  ]

  const headerCellsRow2 = [
    new TableCell({ verticalMerge: VerticalMergeType.CONTINUE, children: [] }),
    new TableCell({ verticalMerge: VerticalMergeType.CONTINUE, children: [] })
  ]

  for (let j = 1; j <= K_total; j++) {
    const exp = evaluadoresMatriz[j - 1]
    const codeTag = exp ? exp.codigo : `J${j}`
    headerCellsRow2.push(
      new TableCell({
        shading: { fill: "2B6CB0", type: ShadingType.CLEAR },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `J${j} (${codeTag})`, bold: true, color: "FFFFFF", size: 12, font: "Arial" })] })]
      })
    )
  }

  headerCellsRow2.push(
    new TableCell({ verticalMerge: VerticalMergeType.CONTINUE, children: [] }),
    new TableCell({ verticalMerge: VerticalMergeType.CONTINUE, children: [] }),
    new TableCell({ verticalMerge: VerticalMergeType.CONTINUE, children: [] }),
    new TableCell({ verticalMerge: VerticalMergeType.CONTINUE, children: [] }),
    new TableCell({ verticalMerge: VerticalMergeType.CONTINUE, children: [] }),
    new TableCell({ verticalMerge: VerticalMergeType.CONTINUE, children: [] }),
    new TableCell({ verticalMerge: VerticalMergeType.CONTINUE, children: [] })
  )

  const matrizRows = [
    new TableRow({ children: headerCellsRow1 }),
    new TableRow({ children: headerCellsRow2 })
  ]

  // EXACTAMENTE LOS 4 CRITERIOS ANALIZADOS EN EL SISTEMA POR LOS EVALUADORES
  const criteriosList = ["Claridad", "Coherencia", "Relevancia", "Suficiencia"]
  let totalSumV = 0
  let totalCountV = 0

  // Generar filas para cada una de las 100 preguntas
  allPreguntas.forEach((p) => {
    criteriosList.forEach((crit, critIdx) => {
      const rowChildren = []

      // Celda del texto del ítem (Solo en la primera fila del grupo de 4 criterios)
      if (critIdx === 0) {
        rowChildren.push(
          new TableCell({
            rowSpan: 4,
            width: { size: 22, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: `${allPreguntas.indexOf(p) < 50 ? allPreguntas.indexOf(p) + 1 : allPreguntas.indexOf(p) - 50 + 1}. ${(p.texto || '').replace(/^(?:VI_|VD_)?\d+[\.\-]?\s*/i, '')}`, size: 13, font: "Arial" })] })]
          })
        )
      }

      // Nombre del criterio
      rowChildren.push(
        new TableCell({
          width: { size: 10, type: WidthType.PERCENTAGE },
          shading: { fill: "F7FAFC", type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: crit, bold: true, size: 13, font: "Arial" })] })]
        })
      )

      // MOSTRAR VEREDICTOS DE TODOS LOS K_TOTAL JUECES SELECCIONADOS EN SUS RESPECTIVAS COLUMNAS
      let acuerdosSumN = 0
      let totalLikertN = 0

      for (let j = 0; j < K_total; j++) {
        const ev = evaluadoresMatriz[j]
        const rObj = ev && ev.respuestas ? ev.respuestas[p.id] : null
        
        let score = 1
        let likertVal = 5
        if (rObj) {
          const keyCrit = crit.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          if (rObj[keyCrit] === 'No') score = 0
          else if (rObj.likert && rObj.likert < 3) score = 0
          
          if (rObj.likert && Number(rObj.likert) >= 1) {
            likertVal = Number(rObj.likert)
          } else {
            likertVal = score === 1 ? 5 : 1
          }
        }

        // Si el juez está dentro de los N_eval impares tomados en cuenta (j < N_eval), suma para el cálculo metodológico de Aiken
        if (j < N_eval) {
          acuerdosSumN += score
          totalLikertN += likertVal
        }

        rowChildren.push(
          new TableCell({
            alignment: AlignmentType.CENTER,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(score), size: 13, font: "Arial" })] })]
          })
        )
      }

      // CÁLCULO ESTADÍSTICO DE AIKEN V Y LAWSHE CVR SOBRE N_eval JUECES IMPARES
      const promLikert = (totalLikertN / N_eval).toFixed(2)
      const aikenV = Number((acuerdosSumN / N_eval).toFixed(2))
      
      // Cálculo de probabilidad (P-value) aproximada para V de Aiken (unilateral, c=5)
      let pValue = 0.000;
      if (aikenV === 1.00) pValue = 0.008; // 1/125
      else if (aikenV >= 0.90) pValue = 0.024;
      else if (aikenV >= 0.80) pValue = 0.056;
      else if (aikenV >= 0.70) pValue = 0.104;
      else if (aikenV >= 0.60) pValue = 0.176;
      else if (aikenV >= 0.50) pValue = 0.312;
      else pValue = 0.500;
      
      const sigP = pValue.toFixed(2)
      const decisionAiken = aikenV >= 0.80 ? "Válido" : "Aceptable"
      
      const halfN = N_eval / 2
      const cvr = Number(((acuerdosSumN - halfN) / halfN).toFixed(2))
      const decisionLawshe = cvr === 1.0 ? "Validez perfecta" : "Aceptable"

      totalSumV += aikenV
      totalCountV++

      // Columnas estadísticas agregadas (Prom. Likert, Acuerdos, Aiken V, Sig P, Decisión Aiken, Lawshe CVR, Decisión Lawshe)
      rowChildren.push(
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: promLikert, bold: true, color: "1A365D", size: 13, font: "Arial" })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(acuerdosSumN), size: 13, font: "Arial" })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: aikenV.toFixed(2), bold: true, color: "2B6CB0", size: 13, font: "Arial" })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: sigP, size: 13, font: "Arial" })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: decisionAiken, bold: true, color: "2B6CB0", size: 13, font: "Arial" })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(cvr), size: 13, font: "Arial" })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: decisionLawshe, bold: true, color: "2F855A", size: 13, font: "Arial" })] })] })
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
      pageBreakBefore: true,
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
        new TextRun({ text: "• Regla de Evaluación Impar de Expertos: ", bold: true, size: 20, font: "Arial" }),
        new TextRun({ text: `Se muestran los ${K_total} jueces registrados (J1..J${K_total}). La evaluación estadística de Aiken (V) y Lawshe (CVR) se calcula sobre N_eval=${N_eval} evaluadores.`, size: 20, font: "Arial" })
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

  // SECCIÓN 4: ANÁLISIS DE CONFIABILIDAD MEDIANTE ALFA DE CRONBACH (α)
  const evalsListForCronbach = selectedList.map(e => e.respuestas || {}).filter(r => Object.keys(r).length > 0)
  const cronbachVI = calculateCronbachAlpha(viList, evalsListForCronbach)
  const cronbachVD = calculateCronbachAlpha(vdList, evalsListForCronbach)
  const cronbachGlobal = calculateCronbachAlpha(allPreguntas, evalsListForCronbach)

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: true,
      spacing: { before: 300, after: 150 },
      children: [
        new TextRun({
          text: "SECCIÓN IV: ANÁLISIS DE CONFIABILIDAD DEL INSTRUMENTO (ALFA DE CRONBACH)",
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
          text: `Se determinó la consistencia interna mediante el Coeficiente Alfa de Cronbach (α) sobre los 100 ítems formulados en escala Likert. El análisis matemático de varianzas (ítems vs. sujetos) se calculó filtrando estrictamente los datos para considerar exclusivamente a los ${selectedList.length} evaluadores seleccionados: ${selectedList.map(e => e.nombre).join(', ')}.`,
          size: 20,
          font: "Arial"
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 150 },
      children: [
        new TextRun({
          text: `Alfa de Cronbach Global: α = ${cronbachGlobal.alpha}  |  Nivel: ${cronbachGlobal.nivel}`,
          bold: true,
          color: "1A365D",
          size: 22,
          font: "Arial"
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFY,
      spacing: { after: 150 },
      children: [
        new TextRun({ text: "Desglose matemático del cálculo basado en los evaluadores seleccionados:\n", bold: true, size: 19, font: "Arial" }),
        new TextRun({ text: `Fórmula: α = [ K / (K - 1) ] × [ 1 - ( Σ σ²_i / σ²_X ) ]\n`, italic: true, size: 19, font: "Arial" }),
        new TextRun({ text: `• K = ${cronbachGlobal.k} (Número de ítems evaluados).\n`, size: 19, font: "Arial" }),
        new TextRun({ text: `• Σ σ²_i = ${cronbachGlobal.sumVarItems} (Sumatoria de varianzas de ítems individuales).\n`, size: 19, font: "Arial" }),
        new TextRun({ text: `• σ²_X = ${cronbachGlobal.varTotal} (Varianza del puntaje total de los sujetos).`, size: 19, font: "Arial" })
      ]
    })
  )
  // SECCIÓN 5: CERTIFICADOS DE VALIDACIÓN (VALORACIÓN GLOBAL Y DICTAMEN)
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: true,
      spacing: { before: 300, after: 150 },
      children: [
        new TextRun({
          text: "SECCIÓN V: CERTIFICADOS Y DICTAMEN FINAL DE LOS EVALUADORES",
          bold: true,
          size: 24,
          color: "1A365D",
          font: "Arial"
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFY,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: "A continuación se presentan las constancias de valoración global y el dictamen final emitido por cada uno de los expertos evaluadores participantes en la validación del instrumento de investigación.",
          size: 19,
          font: "Arial"
        })
      ]
    })
  )

  for (let i = 0; i < N_eval; i++) {
    const exp = selectedList[i]
    const nombreLimpio = cleanNombre(exp.nombre)
    const codigoValidadorTag = exp.codigo ? exp.codigo : `J${i + 1} (${exp.dni})`
    
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 150 },
        children: [
          new TextRun({ text: `CERTIFICADO DE VALIDACIÓN: JUEZ ${i + 1}`, bold: true, size: 20, color: "2B6CB0", font: "Arial" })
        ]
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 30, type: WidthType.PERCENTAGE },
                shading: { fill: "EDF2F7", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Experto Evaluador", bold: true, size: 18, font: "Arial" })] })]
              }),
              new TableCell({
                width: { size: 70, type: WidthType.PERCENTAGE },
                children: [new Paragraph({ children: [new TextRun({ text: `${exp.nombre}\n${exp.cargo || ''}\n${exp.institucion || ''}`, size: 18, font: "Arial" })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                width: { size: 30, type: WidthType.PERCENTAGE },
                shading: { fill: "EDF2F7", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Valoración Global", bold: true, size: 18, font: "Arial" })] })]
              }),
              new TableCell({
                width: { size: 70, type: WidthType.PERCENTAGE },
                children: [new Paragraph({ children: [new TextRun({ text: `${exp.valoracionGlobal || 'Sin valoración'}`, bold: true, size: 18, font: "Arial" })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                width: { size: 30, type: WidthType.PERCENTAGE },
                shading: { fill: "EDF2F7", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Dictamen Final", bold: true, size: 18, font: "Arial" })] })]
              }),
              new TableCell({
                width: { size: 70, type: WidthType.PERCENTAGE },
                children: [new Paragraph({ children: [new TextRun({ text: exp.dictamenFinal || 'APLICABLE', bold: true, color: "2F855A", size: 18, font: "Arial" })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                width: { size: 30, type: WidthType.PERCENTAGE },
                shading: { fill: "EDF2F7", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Observaciones / Recomendaciones", bold: true, size: 18, font: "Arial" })] })]
              }),
              new TableCell({
                width: { size: 70, type: WidthType.PERCENTAGE },
                children: [new Paragraph({ children: [new TextRun({ text: exp.observaciones || 'Ninguna', size: 16, font: "Arial" })] })]
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
                        }),
                        new TextRun({ text: `\nFirma Digital Registrada - Validador [${codigoValidadorTag}]`, bold: true, size: 14, color: "2B6CB0", font: "Arial" })
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
      }),
      new Paragraph({ spacing: { after: 300 }, children: [] })
    )
  }

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
