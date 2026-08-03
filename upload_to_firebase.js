import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIREBASE_URL = "https://tesis-expertos-default-rtdb.firebaseio.com";
const DB_DATA_DIR = path.join(__dirname, 'db_data');

async function uploadFile(fileName) {
  const filePath = path.join(DB_DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${fileName}, not found.`);
    return;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    const tableName = fileName.replace('.json', '');
    
    console.log(`Uploading ${tableName}...`);
    const res = await fetch(`${FIREBASE_URL}/${tableName}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (res.ok) {
      console.log(`✅ Successfully uploaded ${tableName}`);
    } else {
      console.error(`❌ Failed to upload ${tableName}: ${res.statusText}`);
    }
  } catch(e) {
    console.error(`Error uploading ${fileName}:`, e.message);
  }
}

async function uploadDefaultPreguntas() {
  const filePath = path.join(__dirname, 'src', 'preguntas.json');
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  await fetch(`${FIREBASE_URL}/preguntas.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  console.log(`✅ Successfully uploaded preguntas`);
}

async function runMigration() {
  console.log("Starting migration to Firebase...");
  const files = [
    'tabla_evaluadores.json',
    'tabla_evaluaciones_respuestas.json',
    'tabla_hojas_de_vida.json',
    'investigador.json',
    'evaluaciones.json',
    'invitaciones.json',
    'revocados.json',
    'preguntas_custom.json'
  ];
  
  for (const file of files) {
    await uploadFile(file);
  }
  await uploadDefaultPreguntas();
  
  console.log("Migration complete!");
}

runMigration();
