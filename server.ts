import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import multer from 'multer';
import { Server as SocketIOServer } from 'socket.io';
import pg from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { INITIAL_USERS } from './src/data/initialData';

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

// Parse ALLOWED_ORIGINS list from environment variable
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const isOriginAllowed = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
) => {
  // Allow requests without Origin header (same-origin, local tools, mobile webviews)
  if (!origin) {
    return callback(null, true);
  }

  // If ALLOWED_ORIGINS is empty, permit all origins in dev/preview environments
  if (allowedOrigins.length === 0) {
    return callback(null, true);
  }

  const cleanOrigin = origin.trim().replace(/\/+$/, '');
  // Allow only if origin is explicitly present in ALLOWED_ORIGINS
  if (allowedOrigins.includes(cleanOrigin)) {
    return callback(null, true);
  }

  // Otherwise reject
  return callback(null, false);
};

// Middleware
app.use(
  cors({
    origin: isOriginAllowed,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// Bearer Token & Authentication Helpers
const AUTH_SECRET = process.env.SESSION_SECRET || 'smart-cleaning-operations-secret-2026';

function generateAuthToken(user: { id: string; role: string; name: string; username?: string }): string {
  const payload = {
    userId: user.id,
    role: user.role,
    name: user.name,
    username: user.username,
    iat: Date.now(),
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  };
  const dataB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(dataB64).digest('base64url');
  return `${dataB64}.${sig}`;
}

function verifyAuthToken(token: string): any | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [dataB64, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(dataB64).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(dataB64, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function extractToken(req: Request): string | null {
  // 1. Support Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  // 2. Support Cookie: sco_auth_token=<token>
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)sco_auth_token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

// Token middleware to attach decoded user if present
app.use((req: Request, _res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (token) {
    const verified = verifyAuthToken(token);
    if (verified) {
      (req as any).user = verified;
    }
  }
  next();
});

// Serve uploaded static files
app.use('/uploads', express.static(uploadsDir));

// PWA: Serve service worker with Cache-Control: no-cache
const publicDir = path.resolve(process.cwd(), 'public');

app.get('/sw.js', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Content-Type', 'application/javascript');
  const swPath = path.join(publicDir, 'sw.js');
  if (fs.existsSync(swPath)) {
    res.sendFile(swPath);
  } else {
    res.status(404).send('Service worker not found');
  }
});

// PWA: Serve manifest with Content-Type: application/manifest+json
app.get(['/manifest.webmanifest', '/manifest.json'], (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  const manifestPath = path.join(publicDir, 'manifest.webmanifest');
  if (fs.existsSync(manifestPath)) {
    res.sendFile(manifestPath);
  } else {
    res.status(404).json({ error: 'Manifest not found' });
  }
});

// Serve public directory assets (icons, splash, etc.)
app.use(express.static(publicDir));

// Socket.IO Server
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: isOriginAllowed,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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
      connectionTimeoutMillis: 3000,
    });

    pool.on('error', (err: any) => {
      console.log('[PostgreSQL] Background pool event:', err?.code || err?.message || 'client notice');
    });
  } catch (err: any) {
    console.log('[PostgreSQL] Could not initialize pool, switching to in-memory store:', err?.code || err?.message || 'unknown');
    useMemoryFallback = true;
    pool = null;
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
  } catch (err: any) {
    console.log(`[PostgreSQL] Remote database unreachable (${err?.code || err?.message || 'ECONNREFUSED'}). Switching to in-memory store.`);
    try {
      await pool.end().catch(() => {});
    } catch {
      // ignore
    }
    pool = null;
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

// Helper to get users list safely
async function getUsersList(): Promise<any[]> {
  try {
    if (!useMemoryFallback && pool) {
      const result = await pool.query(
        "SELECT data FROM records WHERE collection = 'users' ORDER BY updated_at ASC"
      );
      if (result.rows.length > 0) {
        return result.rows.map((r) => r.data);
      }
    } else {
      const colMap = memoryStore.get('users');
      if (colMap && colMap.size > 0) {
        return Array.from(colMap.values());
      }
    }
  } catch (err) {
    console.warn('[getUsersList] Notice:', err);
  }
  return INITIAL_USERS;
}

// REST Endpoints

// 0. Authentication Endpoints (Supports Bearer token in Authorization header & Cookies)
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { identifier, password, userId } = req.body || {};
  const users = await getUsersList();

  let matchedUser: any = null;

  // Instant login by userId
  if (userId) {
    matchedUser = users.find((u) => u.id === userId);
  } else if (identifier) {
    const cleanId = String(identifier).trim().toLowerCase();
    matchedUser = users.find(
      (u) =>
        (u.username && u.username.toLowerCase() === cleanId) ||
        (u.email && u.email.toLowerCase() === cleanId)
    );

    if (matchedUser) {
      const cleanPass = String(password || '').trim();
      const expectedPassword =
        matchedUser.password ||
        (matchedUser.role === 'admin'
          ? 'admin123'
          : matchedUser.role === 'supervisor'
          ? 'spv123'
          : matchedUser.role === 'petugas'
          ? 'petugas123'
          : 'klien123');

      if (expectedPassword !== cleanPass) {
        return res.status(401).json({
          success: false,
          error: 'Password salah. Silakan periksa kembali kata sandi Anda.',
        });
      }
    }
  }

  if (!matchedUser) {
    return res.status(401).json({
      success: false,
      error: 'Akun tidak ditemukan. Periksa kembali Username atau Email Anda.',
    });
  }

  // Generate signed Bearer token
  const token = generateAuthToken(matchedUser);

  // Set HTTP-only compatible cookie as well for dual-mode support (browser cookie + Bearer header)
  res.setHeader(
    'Set-Cookie',
    `sco_auth_token=${encodeURIComponent(
      token
    )}; Path=/; Max-Age=2592000; SameSite=None; Secure`
  );

  return res.json({
    success: true,
    token,
    tokenType: 'Bearer',
    user: {
      id: matchedUser.id,
      name: matchedUser.name,
      username: matchedUser.username,
      email: matchedUser.email,
      role: matchedUser.role,
      assignedProjectIds: matchedUser.assignedProjectIds,
    },
  });
});

app.get('/api/auth/me', async (req: Request, res: Response) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ authenticated: false, error: 'Token otentikasi tidak ditemukan.' });
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return res.status(401).json({ authenticated: false, error: 'Token tidak sah atau sudah kedaluwarsa.' });
  }

  const users = await getUsersList();
  const user = users.find((u) => u.id === payload.userId) || {
    id: payload.userId,
    name: payload.name,
    role: payload.role,
    username: payload.username,
  };

  return res.json({
    authenticated: true,
    user,
    token,
  });
});

app.post('/api/auth/logout', (_req: Request, res: Response) => {
  res.setHeader(
    'Set-Cookie',
    'sco_auth_token=; Path=/; Max-Age=0; SameSite=None; Secure'
  );
  return res.json({ success: true, message: 'Berhasil keluar' });
});

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
  (upload.single('file') as any)(req, res, (err: any) => {
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
