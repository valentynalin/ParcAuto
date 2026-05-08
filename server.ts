import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import Database from 'better-sqlite3';
import fs from 'fs';
import cors from 'cors';

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'parc_auto.sqlite');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nr_inmatriculare TEXT UNIQUE,
    tip_auto TEXT,
    marca_model TEXT,
    utilizator TEXT,
    firma TEXT,
    serie_sasiu TEXT,
    an_fabricatie INTEGER,
    data_inmatriculare TEXT,
    decizie_conventii TEXT,
    
    -- Service
    service_data TEXT,
    km_bord INTEGER,
    km_revizie INTEGER,
    data_revizie TEXT,
    
    -- Documents
    rovinieta_start TEXT,
    rovinieta_expiry TEXT,
    itp_start TEXT,
    itp_expiry TEXT,
    rca_start TEXT,
    rca_expiry TEXT,
    casco_start TEXT,
    casco_expiry TEXT,
    
    -- Tires
    anvelope_dimensiuni TEXT,
    anvelope_vara_achizitie TEXT,
    anvelope_vara_schimbare TEXT,
    anvelope_iarna_achizitie TEXT,
    anvelope_iarna_schimbare TEXT
  )
`);

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(cors());

  // API Routes
  app.get('/api/vehicles', (req, res) => {
    try {
      const rows = db.prepare('SELECT * FROM vehicles').all();
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/vehicles', (req, res) => {
    const v = req.body;
    try {
      const stmt = db.prepare(`
        INSERT INTO vehicles (
          nr_inmatriculare, tip_auto, marca_model, utilizator, firma, serie_sasiu, 
          an_fabricatie, data_inmatriculare, decizie_conventii,
          service_data, km_bord, km_revizie, data_revizie,
          rovinieta_start, rovinieta_expiry, itp_start, itp_expiry,
          rca_start, rca_expiry, casco_start, casco_expiry,
          anvelope_dimensiuni, anvelope_vara_achizitie, anvelope_vara_schimbare,
          anvelope_iarna_achizitie, anvelope_iarna_schimbare
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const info = stmt.run(
        v.nr_inmatriculare, v.tip_auto, v.marca_model, v.utilizator, v.firma, v.serie_sasiu,
        v.an_fabricatie, v.data_inmatriculare, v.decizie_conventii,
        v.service_data, v.km_bord, v.km_revizie, v.data_revizie,
        v.rovinieta_start, v.rovinieta_expiry, v.itp_start, v.itp_expiry,
        v.rca_start, v.rca_expiry, v.casco_start, v.casco_expiry,
        v.anvelope_dimensiuni, v.anvelope_vara_achizitie, v.anvelope_vara_schimbare,
        v.anvelope_iarna_achizitie, v.anvelope_iarna_schimbare
      );
      res.json({ id: info.lastInsertRowid });
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: 'Vechile already exists or invalid data' });
    }
  });

  app.put('/api/vehicles/:id', (req, res) => {
    const v = req.body;
    const { id } = req.params;
    try {
      const stmt = db.prepare(`
        UPDATE vehicles SET
          nr_inmatriculare = ?, tip_auto = ?, marca_model = ?, utilizator = ?, firma = ?, serie_sasiu = ?, 
          an_fabricatie = ?, data_inmatriculare = ?, decizie_conventii = ?,
          service_data = ?, km_bord = ?, km_revizie = ?, data_revizie = ?,
          rovinieta_start = ?, rovinieta_expiry = ?, itp_start = ?, itp_expiry = ?,
          rca_start = ?, rca_expiry = ?, casco_start = ?, casco_expiry = ?,
          anvelope_dimensiuni = ?, anvelope_vara_achizitie = ?, anvelope_vara_schimbare = ?,
          anvelope_iarna_achizitie = ?, anvelope_iarna_schimbare = ?
        WHERE id = ?
      `);
      
      stmt.run(
        v.nr_inmatriculare, v.tip_auto, v.marca_model, v.utilizator, v.firma, v.serie_sasiu,
        v.an_fabricatie, v.data_inmatriculare, v.decizie_conventii,
        v.service_data, v.km_bord, v.km_revizie, v.data_revizie,
        v.rovinieta_start, v.rovinieta_expiry, v.itp_start, v.itp_expiry,
        v.rca_start, v.rca_expiry, v.casco_start, v.casco_expiry,
        v.anvelope_dimensiuni, v.anvelope_vara_achizitie, v.anvelope_vara_schimbare,
        v.anvelope_iarna_achizitie, v.anvelope_iarna_schimbare,
        id
      );
      res.json({ status: 'updated' });
    } catch (error) {
      res.status(500).json({ error: 'Update failed' });
    }
  });

  app.delete('/api/vehicles/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM vehicles WHERE id = ?').run(req.params.id);
      res.json({ status: 'deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Delete failed' });
    }
  });

  // Vite / Static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
