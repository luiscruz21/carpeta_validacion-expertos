// Node 18+ has native fetch

const FIREBASE_URL = "https://tesis-expertos-default-rtdb.firebaseio.com";

// Tablas principales en Firebase
const T_EVALUADORES = 'tabla_evaluadores';
const T_RESPUESTAS = 'tabla_evaluaciones_respuestas';
const T_HOJAS_VIDA = 'tabla_hojas_de_vida';

export const readTable = async (tableName, defaultVal = {}) => {
  try {
    const res = await fetch(`${FIREBASE_URL}/${tableName}.json`);
    if (res.ok) {
      const data = await res.json();
      return data !== null ? data : defaultVal;
    }
  } catch (e) {
    console.error(`Error leyendo ${tableName} de Firebase:`, e.message);
  }
  return defaultVal;
};

export const writeTable = async (tableName, data) => {
  try {
    await fetch(`${FIREBASE_URL}/${tableName}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (e) {
    console.error(`Error escribiendo en ${tableName} de Firebase:`, e.message);
  }
};

export const getEvaluadorByDni = async (dni) => {
  if (!dni) return null;
  const cleanDni = dni.trim().toUpperCase();
  
  const evaluadores = await readTable(T_EVALUADORES, {});
  const respuestas = await readTable(T_RESPUESTAS, {});
  const hojas = await readTable(T_HOJAS_VIDA, {});

  const ev = evaluadores[cleanDni] || Object.values(evaluadores).find(e => e.dni === cleanDni || e.codigo === cleanDni);
  if (!ev) return null;

  const resObj = respuestas[ev.dni] || respuestas[cleanDni] || {};
  const hojaObj = hojas[ev.dni] || hojas[cleanDni] || {};

  return {
    ...ev,
    respuestas: resObj.respuestas || {},
    finalizado: !!resObj.finalizado,
    ...hojaObj
  };
};

export const upsertEvaluador = async (dni, data) => {
  if (!dni) return null;
  const cleanDni = dni.trim().toUpperCase();
  const evaluadores = await readTable(T_EVALUADORES, {});

  const existing = evaluadores[cleanDni] || {};
  const fullNombre = (data.nombre || data.nombreExperto || existing.nombre || "Experto Validador").trim();
  const parts = fullNombre.split(' ');

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
  };

  // Eliminar duplicados
  const normName = fullNombre.toLowerCase().replace(/^(dr\.|dra\.|ing\.|lic\.|mg\.)\s*/i, '').trim();
  Object.keys(evaluadores).forEach(k => {
    if (k === cleanDni) return;
    const item = evaluadores[k];
    const itemNorm = (item.nombre || '').toLowerCase().replace(/^(dr\.|dra\.|ing\.|lic\.|mg\.)\s*/i, '').trim();
    if (itemNorm === normName && normName !== 'experto validador' && normName !== '') {
      delete evaluadores[k];
    }
  });

  evaluadores[cleanDni] = updated;
  await writeTable(T_EVALUADORES, evaluadores);

  if (data.respuestas) {
    await saveRespuestas(cleanDni, data.respuestas, data.finalizado);
  }

  if (data.ctiVitae !== undefined || data.orcid !== undefined || data.linkedin !== undefined || data.cvFileName !== undefined || data.resumenProfesional !== undefined || data.experienciaDetallada !== undefined || data.firmaExpertoImg !== undefined) {
    await saveHojaDeVida(cleanDni, data);
  }

  return await getEvaluadorByDni(cleanDni);
};

export const saveRespuestas = async (dni, respuestas, finalizado = false) => {
  if (!dni) return;
  const cleanDni = dni.trim().toUpperCase();
  const tableResp = await readTable(T_RESPUESTAS, {});

  tableResp[cleanDni] = {
    dni: cleanDni,
    respuestas: respuestas || {},
    finalizado: !!finalizado,
    actualizadoEn: new Date().toISOString()
  };

  await writeTable(T_RESPUESTAS, tableResp);
};

export const saveHojaDeVida = async (dni, cvData) => {
  if (!dni) return;
  const cleanDni = dni.trim().toUpperCase();
  const tableHojas = await readTable(T_HOJAS_VIDA, {});
  const existing = tableHojas[cleanDni] || {};

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
  };

  await writeTable(T_HOJAS_VIDA, tableHojas);
};

export const deleteEvaluador = async (dni) => {
  if (!dni) return false;
  const cleanDni = dni.trim().toUpperCase();
  
  const evaluadores = await readTable(T_EVALUADORES, {});
  const obj = evaluadores[cleanDni] || Object.values(evaluadores).find(e => e.codigo === cleanDni);
  
  if (obj) {
    const targetDni = obj.dni;
    delete evaluadores[targetDni];
    await writeTable(T_EVALUADORES, evaluadores);
    
    // También limpiamos sus respuestas y hoja de vida
    const tableResp = await readTable(T_RESPUESTAS, {});
    if (tableResp[targetDni]) {
      delete tableResp[targetDni];
      await writeTable(T_RESPUESTAS, tableResp);
    }

    const tableHojas = await readTable(T_HOJAS_VIDA, {});
    if (tableHojas[targetDni]) {
      delete tableHojas[targetDni];
      await writeTable(T_HOJAS_VIDA, tableHojas);
    }
    
    return true;
  }
  return false;
};

export const getConsolidatedTable = async () => {
  const evaluadores = await readTable(T_EVALUADORES, {});
  const tableResp = await readTable(T_RESPUESTAS, {});
  
  return Object.values(evaluadores).map(ev => {
    const resp = tableResp[ev.dni] || {};
    const answeredCount = resp.respuestas ? Object.keys(resp.respuestas).length : 0;
    
    return {
      ...ev,
      respondidas: answeredCount,
      estado: resp.finalizado ? 'Completado' : (answeredCount > 0 ? 'En Proceso' : 'Pendiente')
    };
  });
};
