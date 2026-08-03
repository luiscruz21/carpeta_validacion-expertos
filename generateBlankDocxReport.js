import * as docx from 'docx'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const { 
  Document, Packer, Paragraph, Table, TableRow, TableCell, 
  TextRun, WidthType, AlignmentType, HeadingLevel, PageOrientation, convertMillimetersToTwip
} = docx

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function generateBlankDocxReport(perfilInvestigador = {}, preguntasData = {}) {
  const viList = preguntasData.VI || []
  const vdList = preguntasData.VD || []
  const allPreguntas = [...viList, ...vdList]

  // Cargar Matrices locales
  let consistenciaData = []
  let matrizData = { VI: [], VD: [] }
  try {
    const consistenciaRaw = fs.readFileSync(path.join(__dirname, 'src', 'consistencia_data.json'), 'utf8')
    consistenciaData = JSON.parse(consistenciaRaw)
  } catch (e) {
    console.error("Error leyendo consistencia_data.json", e)
  }
  try {
    const matrizRaw = fs.readFileSync(path.join(__dirname, 'src', 'matriz_data.json'), 'utf8')
    matrizData = JSON.parse(matrizRaw)
  } catch (e) {
    console.error("Error leyendo matriz_data.json", e)
  }

  const children = []

  // TÍTULO PRINCIPAL DEL INFORME
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({
          text: "EXPEDIENTE DE VALIDACIÓN DE INSTRUMENTOS DE INVESTIGACIÓN",
          bold: true,
          size: 28,
          color: "1A365D",
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
          text: perfilInvestigador.tituloTesis || "___________________________________________________________________________________",
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
        new TextRun({ text: (perfilInvestigador.nombres ? `${perfilInvestigador.nombres} ${perfilInvestigador.apellidos}` : "___________________________________"), size: 20, font: "Arial" })
      ]
    })
  )

  // FICHA DE VALIDACIÓN Y DATOS DEL EXPERTO
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 150 },
      children: [
        new TextRun({
          text: "I. DATOS GENERALES DEL JUEZ EVALUADOR",
          bold: true,
          size: 24,
          color: "1A365D",
          font: "Arial"
        })
      ]
    }),
    new Paragraph({ spacing: { after: 150 }, children: [
      new TextRun({ text: "Nombres y Apellidos: ", bold: true, size: 20, font: "Arial" }),
      new TextRun({ text: "_______________________________________________________", size: 20, font: "Arial" })
    ]}),
    new Paragraph({ spacing: { after: 150 }, children: [
      new TextRun({ text: "DNI: ", bold: true, size: 20, font: "Arial" }),
      new TextRun({ text: "___________________________", size: 20, font: "Arial" })
    ]}),
    new Paragraph({ spacing: { after: 150 }, children: [
      new TextRun({ text: "Grado Académico: ", bold: true, size: 20, font: "Arial" }),
      new TextRun({ text: "_______________________________________________________", size: 20, font: "Arial" })
    ]}),
    new Paragraph({ spacing: { after: 150 }, children: [
      new TextRun({ text: "Cargo / Ocupación: ", bold: true, size: 20, font: "Arial" }),
      new TextRun({ text: "_______________________________________________________", size: 20, font: "Arial" })
    ]}),
    new Paragraph({ spacing: { after: 300 }, children: [
      new TextRun({ text: "Institución donde labora: ", bold: true, size: 20, font: "Arial" }),
      new TextRun({ text: "__________________________________________________", size: 20, font: "Arial" })
    ]})
  )

  // SECCION: MATRIZ DE CONSISTENCIA
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: true,
      spacing: { before: 300, after: 150 },
      children: [
        new TextRun({
          text: "II. MATRIZ DE CONSISTENCIA",
          bold: true,
          size: 24,
          color: "1A365D",
          font: "Arial"
        })
      ]
    })
  )

  const consistenciaRows = [
    new TableRow({
      children: [
        new TableCell({ shading: { fill: "1A365D" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Nivel", bold: true, color: "FFFFFF", size: 16, font: "Arial" })] })] }),
        new TableCell({ shading: { fill: "1A365D" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Problemas de Investigación", bold: true, color: "FFFFFF", size: 16, font: "Arial" })] })] }),
        new TableCell({ shading: { fill: "1A365D" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Objetivos de Investigación", bold: true, color: "FFFFFF", size: 16, font: "Arial" })] })] }),
        new TableCell({ shading: { fill: "1A365D" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Hipótesis de Investigación", bold: true, color: "FFFFFF", size: 16, font: "Arial" })] })] }),
        new TableCell({ shading: { fill: "1A365D" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Variables y Dimensiones", bold: true, color: "FFFFFF", size: 16, font: "Arial" })] })] }),
        new TableCell({ shading: { fill: "1A365D" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Técnicas e Instrumentos", bold: true, color: "FFFFFF", size: 16, font: "Arial" })] })] })
      ]
    })
  ]

  consistenciaData.forEach(item => {
    consistenciaRows.push(new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.tipo || '', size: 14, font: "Arial" })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.problema || '', size: 14, font: "Arial" })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.objetivo || '', size: 14, font: "Arial" })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.hipotesis || '', size: 14, font: "Arial" })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.variables || '', size: 14, font: "Arial" })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.tecnica || '', size: 14, font: "Arial" })] })] })
      ]
    }))
  })

  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: consistenciaRows }), new Paragraph({ spacing: { before: 200, after: 200 } }))

  // SECCION: MATRIZ DE OPERACIONALIZACIÓN
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: true,
      spacing: { before: 300, after: 150 },
      children: [
        new TextRun({
          text: "III. MATRIZ DE OPERACIONALIZACIÓN DE VARIABLES",
          bold: true,
          size: 24,
          color: "1A365D",
          font: "Arial"
        })
      ]
    })
  )

  const buildMatrizTable = (dataArray, title) => {
    const rows = [
      new TableRow({
        children: [
          new TableCell({ columnSpan: 7, shading: { fill: "E2E8F0" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: title, bold: true, size: 18, font: "Arial" })] })] })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ shading: { fill: "2B6CB0" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Dimensión", bold: true, color: "FFFFFF", size: 14, font: "Arial" })] })] }),
          new TableCell({ shading: { fill: "2B6CB0" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Indicador", bold: true, color: "FFFFFF", size: 14, font: "Arial" })] })] }),
          new TableCell({ shading: { fill: "2B6CB0" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Definición Operacional", bold: true, color: "FFFFFF", size: 14, font: "Arial" })] })] }),
          new TableCell({ shading: { fill: "2B6CB0" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Sustento Teórico", bold: true, color: "FFFFFF", size: 14, font: "Arial" })] })] }),
          new TableCell({ shading: { fill: "2B6CB0" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Validez del Constructo", bold: true, color: "FFFFFF", size: 14, font: "Arial" })] })] }),
          new TableCell({ shading: { fill: "2B6CB0" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Técnica e Instrumento", bold: true, color: "FFFFFF", size: 14, font: "Arial" })] })] }),
          new TableCell({ shading: { fill: "2B6CB0" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Escala", bold: true, color: "FFFFFF", size: 14, font: "Arial" })] })] })
        ]
      })
    ]

    dataArray.forEach(dim => {
      dim.indicadores.forEach((ind, i) => {
        rows.push(new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: i === 0 ? dim.dimension : '', size: 14, font: "Arial", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ind.nombre || '', size: 14, font: "Arial" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ind.definicion || '', size: 14, font: "Arial" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ind.sustento || '', size: 14, font: "Arial", italic: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ind.validez || '', size: 14, font: "Arial" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${ind.tecnica} / ${ind.instrumento}`, size: 14, font: "Arial" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ind.escala || '', size: 14, font: "Arial" })] })] })
          ]
        }))
      })
    })
    return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows })
  }

  if (matrizData.VI && matrizData.VI.length > 0) {
    children.push(buildMatrizTable(matrizData.VI, "VARIABLE INDEPENDIENTE (VI): Arquitectura Predictiva con Deep Learning"))
    children.push(new Paragraph({ spacing: { after: 300 } }))
  }
  if (matrizData.VD && matrizData.VD.length > 0) {
    children.push(buildMatrizTable(matrizData.VD, "VARIABLE DEPENDIENTE (VD): Gestión de Riesgos"))
    children.push(new Paragraph({ spacing: { after: 300 } }))
  }

  // ESCALA LIKERT Y CUESTIONARIO
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: true,
      spacing: { before: 300, after: 150 },
      children: [
        new TextRun({
          text: "IV. INSTRUCCIONES Y ESCALA DE EVALUACIÓN",
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
          text: "Por favor, evalúe cada ítem marcando con un aspa (X) o un check (✓) en las columnas respectivas. Para la calificación final del ítem, utilice la siguiente Escala Likert del 1 al 5:",
          size: 20,
          font: "Arial"
        })
      ]
    })
  )

  const likertTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({ shading: { fill: "1A365D" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Puntaje", bold: true, color: "FFFFFF", size: 20, font: "Arial" })] })] }),
          new TableCell({ shading: { fill: "1A365D" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Descripción (Escala Likert)", bold: true, color: "FFFFFF", size: 20, font: "Arial" })] })] })
        ]
      }),
      new TableRow({ children: [new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "1", size: 20, font: "Arial" })]})] }), new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Totalmente en Desacuerdo", size: 20, font: "Arial" })]})] })] }),
      new TableRow({ children: [new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "2", size: 20, font: "Arial" })]})] }), new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "En Desacuerdo", size: 20, font: "Arial" })]})] })] }),
      new TableRow({ children: [new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "3", size: 20, font: "Arial" })]})] }), new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Ni de Acuerdo ni en Desacuerdo", size: 20, font: "Arial" })]})] })] }),
      new TableRow({ children: [new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "4", size: 20, font: "Arial" })]})] }), new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "De Acuerdo", size: 20, font: "Arial" })]})] })] }),
      new TableRow({ children: [new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "5", size: 20, font: "Arial" })]})] }), new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Totalmente de Acuerdo", size: 20, font: "Arial" })]})] })] }),
    ]
  })
  children.push(likertTable, new Paragraph({ spacing: { before: 200, after: 200 } }))

  // CUESTIONARIO (MATRIZ EN BLANCO)
  const headerCells = [
    new TableCell({ shading: { fill: "1A365D" }, width: { size: 40, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Ítem / Pregunta", bold: true, color: "FFFFFF", size: 16, font: "Arial" })] })] }),
    new TableCell({ shading: { fill: "2B6CB0" }, width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Claridad\n(Sí / No)", bold: true, color: "FFFFFF", size: 14, font: "Arial" })] })] }),
    new TableCell({ shading: { fill: "2B6CB0" }, width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Coherencia\n(Sí / No)", bold: true, color: "FFFFFF", size: 14, font: "Arial" })] })] }),
    new TableCell({ shading: { fill: "2B6CB0" }, width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Relevancia\n(Sí / No)", bold: true, color: "FFFFFF", size: 14, font: "Arial" })] })] }),
    new TableCell({ shading: { fill: "2B6CB0" }, width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Suficiencia\n(Sí / No)", bold: true, color: "FFFFFF", size: 14, font: "Arial" })] })] }),
    new TableCell({ shading: { fill: "2C7A7B" }, width: { size: 20, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Escala Likert\n(1 - 5)", bold: true, color: "FFFFFF", size: 14, font: "Arial" })] })] })
  ]

  const questionRows = []
  questionRows.push(new TableRow({ children: headerCells }))

  allPreguntas.forEach((p, index) => {
    if (index === 0) {
       questionRows.push(new TableRow({
         children: [
           new TableCell({
             columnSpan: 6,
             shading: { fill: "E2E8F0" },
             children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `VARIABLE INDEPENDIENTE (VI): Arquitectura Predictiva con Deep Learning`, bold: true, size: 16, font: "Arial" })]})]
           })
         ]
       }))
    } else if (index === viList.length && vdList.length > 0) {
       questionRows.push(new TableRow({
         children: [
           new TableCell({
             columnSpan: 6,
             shading: { fill: "E2E8F0" },
             children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `VARIABLE DEPENDIENTE (VD): Gestión de Riesgos`, bold: true, size: 16, font: "Arial" })]})]
           })
         ]
       }))
    }

    questionRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${p.id}: ${p.texto || ''}`, size: 16, font: "Arial" })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "     /     ", size: 16, font: "Arial" })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "     /     ", size: 16, font: "Arial" })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "     /     ", size: 16, font: "Arial" })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "     /     ", size: 16, font: "Arial" })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "[1]  [2]  [3]  [4]  [5]", size: 16, font: "Arial" })] })] }),
        ]
      })
    )
  })

  const instrumentTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: questionRows
  })

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 150 },
      children: [
        new TextRun({
          text: "V. CUESTIONARIO DE VALIDACIÓN",
          bold: true,
          size: 24,
          color: "1A365D",
          font: "Arial"
        })
      ]
    }),
    instrumentTable
  )

  // DICTAMEN FINAL Y FIRMA
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: true,
      spacing: { before: 300, after: 150 },
      children: [
        new TextRun({
          text: "VI. CONSTANCIA Y DICTAMEN DE VALIDACIÓN",
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
          text: "El que suscribe, en su calidad de experto, habiendo analizado la estructura teórica, matriz de operacionalización e instrumento de recolección de datos, emite el siguiente dictamen de validez de contenido:",
          size: 20,
          font: "Arial"
        })
      ]
    }),
    new Paragraph({
      spacing: { before: 100, after: 100 },
      children: [
        new TextRun({ text: "[   ] APLICABLE", size: 20, font: "Arial" })
      ]
    }),
    new Paragraph({
      spacing: { before: 100, after: 100 },
      children: [
        new TextRun({ text: "[   ] APLICABLE DESPUÉS DE CORREGIR", size: 20, font: "Arial" })
      ]
    }),
    new Paragraph({
      spacing: { before: 100, after: 300 },
      children: [
        new TextRun({ text: "[   ] NO APLICABLE", size: 20, font: "Arial" })
      ]
    }),
    new Paragraph({
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({ text: "Observaciones Adicionales (Opcional):", bold: true, size: 20, font: "Arial" })
      ]
    }),
    new Paragraph({ spacing: { after: 150 }, children: [new TextRun({ text: "____________________________________________________________________________________________________________________", size: 16, font: "Arial" })]}),
    new Paragraph({ spacing: { after: 150 }, children: [new TextRun({ text: "____________________________________________________________________________________________________________________", size: 16, font: "Arial" })]}),
    new Paragraph({ spacing: { after: 500 }, children: [new TextRun({ text: "____________________________________________________________________________________________________________________", size: 16, font: "Arial" })]}),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 500 },
      children: [
        new TextRun({ text: "_______________________________________", size: 20, font: "Arial" })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "FIRMA DEL EXPERTO", bold: true, size: 20, font: "Arial" })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "DNI: ____________________", size: 18, font: "Arial" })
      ]
    })
  )

  // Crear Documento Word
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
              width: convertMillimetersToTwip(297),
              height: convertMillimetersToTwip(210)
            },
            margin: {
              top: convertMillimetersToTwip(12.7),
              bottom: convertMillimetersToTwip(12.7),
              left: convertMillimetersToTwip(12.7),
              right: convertMillimetersToTwip(12.7)
            }
          }
        },
        children
      }
    ]
  })

  // Generar Buffer del archivo .docx
  return await Packer.toBuffer(doc)
}
