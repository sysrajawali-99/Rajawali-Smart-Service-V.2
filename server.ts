import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import multer from 'multer';
import { Server as SocketIOServer } from 'socket.io';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const app = express();
const httpServer = http.createServer(app);

// Configuration
const PORT = parseInt(process.env.PORT || '3000', 10);
const uploadsDir = path.resolve(process.cwd(), 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// Serve uploaded static files
app.use('/uploads', express.static(uploadsDir));

// Socket.IO Server
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
  maxHttpBufferSize: 20 * 1024 * 1024, // 20MB
});

io.on('connection', (socket) => {
  socket.emit('backend:status', {
    connected: true,
    socketId: socket.id,
    timestamp: new Date().toISOString(),
  });
});

// Database Setup
let pool: pg.Pool | null = null;
let useMemoryFallback = false;
const memoryStore = new Map<string, Map<string, any>>();

if (process.env.DATABASE_URL) {
  try {
    const isLocal =
      process.env.DATABASE_URL.includes('localhost') ||
      process.env.DATABASE_URL.includes('127.0.0.1');

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    });
  } catch (err) {
    console.warn('[PostgreSQL] Could not initialize pool, using in-memory store:', err);
    useMemoryFallback = true;
  }
} else {
  console.log('[PostgreSQL] DATABASE_URL not configured. Running in-memory fallback store.');
  useMemoryFallback = true;
}

async function initDatabase() {
  if (!pool || useMemoryFallback) {
    console.log('[PostgreSQL] Operating with fast in-memory store');
    return;
  }

  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS records (
          collection TEXT NOT NULL,
          id TEXT NOT NULL,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          PRIMARY KEY (collection, id)
        );
      `);
      console.log('[PostgreSQL] Table "records" initialized successfully (one row per item)');
    } finally {
      client.release();
    }
  } catch (err) {
    console.warn('[PostgreSQL] Connection failed, switching to in-memory fallback:', err);
    useMemoryFallback = true;
  }
}

// Multer Storage for Photo Uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const originalExt = path.extname(file.originalname).toLowerCase();
    const ext = originalExt && originalExt.length <= 5 ? originalExt : '.jpg';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `photo-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar yang diizinkan'));
    }
  },
});

// REST Endpoints

// 1. Health check & status
app.get('/api/status', async (_req: Request, res: Response) => {
  let dbStatus = useMemoryFallback ? 'in-memory (no DATABASE_URL or unreachable)' : 'connected (PostgreSQL)';
  let totalRecords = 0;

  if (!useMemoryFallback && pool) {
    try {
      const countRes = await pool.query('SELECT COUNT(*) as count FROM records');
      totalRecords = parseInt(countRes.rows[0].count, 10);
    } catch {
      dbStatus = 'error querying postgres';
    }
  } else {
    for (const col of memoryStore.values()) {
      totalRecords += col.size;
    }
  }

  res.json({
    status: 'OK',
    database: dbStatus,
    totalRecords,
    socketClients: io.engine.clientsCount,
    timestamp: new Date().toISOString(),
  });
});

// 2. GET /api/records/:collection -> semua data satu koleksi
app.get('/api/records/:collection', async (req: Request, res: Response) => {
  const { collection } = req.params;

  try {
    if (!useMemoryFallback && pool) {
      const result = await pool.query(
        'SELECT data FROM records WHERE collection = $1 ORDER BY updated_at ASC',
        [collection]
      );
      const items = result.rows.map((r) => r.data);
      return res.json(items);
    }

    const colMap = memoryStore.get(collection);
    const items = colMap ? Array.from(colMap.values()) : [];
    return res.json(items);
  } catch (err: any) {
    console.error(`[GET /api/records/${collection}] Error:`, err);
    return res.status(500).json({ error: 'Gagal mengambil data koleksi', details: err?.message });
  }
});

// 3. PUT /api/records/:collection/:id -> simpan/ubah satu data (upsert)
app.put('/api/records/:collection/:id', async (req: Request, res: Response) => {
  const { collection, id } = req.params;
  const data = req.body;

  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Body harus berupa objek JSON' });
  }

  // Ensure record has the id field consistent
  data.id = id;

  try {
    if (!useMemoryFallback && pool) {
      await pool.query(
        `INSERT INTO records (collection, id, data, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (collection, id)
         DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [collection, id, JSON.stringify(data)]
      );
    } else {
      if (!memoryStore.has(collection)) {
        memoryStore.set(collection, new Map());
      }
      memoryStore.get(collection)!.set(id, data);
    }

    // Broadcast to ALL connected clients via Socket.IO
    const payload = {
      action: 'upsert' as const,
      collection,
      id,
      data,
      timestamp: new Date().toISOString(),
    };

    io.emit('record:change', payload);
    io.emit('record:upsert', payload);

    return res.json({ success: true, collection, id, data });
  } catch (err: any) {
    console.error(`[PUT /api/records/${collection}/${id}] Error:`, err);
    return res.status(500).json({ error: 'Gagal menyimpan data', details: err?.message });
  }
});

// 4. DELETE /api/records/:collection/:id -> hapus satu data
app.delete('/api/records/:collection/:id', async (req: Request, res: Response) => {
  const { collection, id } = req.params;

  try {
    if (!useMemoryFallback && pool) {
      await pool.query('DELETE FROM records WHERE collection = $1 AND id = $2', [collection, id]);
    } else {
      memoryStore.get(collection)?.delete(id);
    }

    // Broadcast delete event to all connected clients
    const payload = {
      action: 'delete' as const,
      collection,
      id,
      isDeleted: true,
      timestamp: new Date().toISOString(),
    };

    io.emit('record:change', payload);
    io.emit('record:delete', payload);

    return res.json({ success: true, collection, id });
  } catch (err: any) {
    console.error(`[DELETE /api/records/${collection}/${id}] Error:`, err);
    return res.status(500).json({ error: 'Gagal menghapus data', details: err?.message });
  }
});

// 5. POST /api/upload -> upload foto via Multer, kembalikan URL /uploads/...
app.post('/api/upload', (req: Request, res: Response) => {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      console.error('[POST /api/upload] Multer error:', err);
      return res.status(400).json({ error: err.message || 'Upload gagal' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada file gambar yang diunggah' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    return res.json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  });
});

// Start Server & Vite / Production Static Serving
async function startServer() {
  await initDatabase();

  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    console.log('[Server] Starting in PRODUCTION mode');
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));

    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
        return next();
      }
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    console.log('[Server] Starting in DEVELOPMENT mode with Vite middlewares');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Smart Cleaning Operations running on http://0.0.0.0:${PORT}`);
    console.log(`[Server] Socket.IO server active on port ${PORT}`);
    console.log(`[Server] Static uploads available at /uploads/`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
