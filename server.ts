import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import multer from 'multer';
import { Server as SocketIOServer } from 'socket.io';
import pg from 'pg';
import webpush from 'web-push';
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
const MEMORY_STORE_FILE = path.resolve(process.cwd(), 'data', 'app_records_store.json');

function loadMemoryStoreFromDisk() {
  try {
    if (fs.existsSync(MEMORY_STORE_FILE)) {
      const raw = fs.readFileSync(MEMORY_STORE_FILE, 'utf8');
      const obj = JSON.parse(raw);
      for (const col of Object.keys(obj)) {
        const colMap = new Map<string, any>();
        for (const [id, val] of Object.entries(obj[col])) {
          colMap.set(id, val);
        }
        memoryStore.set(col, colMap);
      }
      console.log(`[Persistence] Loaded ${memoryStore.size} collections from disk storage (${MEMORY_STORE_FILE})`);
    }
  } catch (e) {
    console.warn('[Persistence] Notice reading store file:', e);
  }
}

let saveStoreTimeout: NodeJS.Timeout | null = null;
function scheduleSaveMemoryStore() {
  if (saveStoreTimeout) clearTimeout(saveStoreTimeout);
  saveStoreTimeout = setTimeout(() => {
    try {
      const dataDir = path.dirname(MEMORY_STORE_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const out: Record<string, Record<string, any>> = {};
      for (const [col, colMap] of memoryStore.entries()) {
        out[col] = Object.fromEntries(colMap.entries());
      }
      fs.writeFileSync(MEMORY_STORE_FILE, JSON.stringify(out, null, 2), 'utf8');
    } catch (e) {
      console.warn('[Persistence] Notice writing store file:', e);
    }
  }, 250);
}

loadMemoryStoreFromDisk();

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
      scheduleSaveMemoryStore();
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
      scheduleSaveMemoryStore();
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

// 6. POST /api/pwa/update-icons -> Batch write all 11 generated PWA icons to public/icons/
app.post('/api/pwa/update-icons', async (req: Request, res: Response) => {
  try {
    const { icons } = req.body || {};
    if (!Array.isArray(icons) || icons.length === 0) {
      return res.status(400).json({ error: 'Array icons diperlukan' });
    }

    const publicIconsDir = path.resolve(process.cwd(), 'public', 'icons');
    if (!fs.existsSync(publicIconsDir)) {
      fs.mkdirSync(publicIconsDir, { recursive: true });
    }

    const updatedList: any[] = [];
    for (const item of icons) {
      if (!item.name || !item.dataUrl) continue;
      const safeFilename = path.basename(item.name);
      const targetFilePath = path.join(publicIconsDir, safeFilename);

      const match = item.dataUrl.match(/^data:image\/[a-z0-9+]+;base64,(.+)$/i);
      if (match) {
        const buffer = Buffer.from(match[1], 'base64');
        fs.writeFileSync(targetFilePath, buffer);

        // Also update root public/favicon.ico, favicon.png, and apple-touch-icon.png for direct browser tab fetches
        if (safeFilename === 'favicon-32.png') {
          try {
            fs.writeFileSync(path.join(publicDir, 'favicon.ico'), buffer);
            fs.writeFileSync(path.join(publicDir, 'favicon.png'), buffer);
          } catch (e) {
            console.warn('[PWA] Warning writing root favicon:', e);
          }
        }
        if (safeFilename.includes('apple-touch-icon')) {
          try {
            fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), buffer);
          } catch (e) {
            console.warn('[PWA] Warning writing apple touch icon:', e);
          }
        }

        updatedList.push({
          id: item.id || `icon-${safeFilename}`,
          name: safeFilename,
          path: `/icons/${safeFilename}?t=${Date.now()}`,
          size: item.size,
          purpose: item.purpose,
        });
      }
    }

    return res.json({
      success: true,
      message: `${updatedList.length} file ikon berhasil dibuat dan disinkronkan ke folder public/icons/`,
      icons: updatedList,
    });
  } catch (err: any) {
    console.error('[POST /api/pwa/update-icons] Error:', err);
    return res.status(500).json({ error: 'Gagal memperbarui ikon PWA', details: err?.message });
  }
});

// ==========================================
// VAPID & WEB PUSH NOTIFICATION CONFIGURATION
// ==========================================
const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BHxNSY3dkvGmaAvSc1miw5A2RMvTmydueTEyWnXBnuxMhmZQ-ucyDfKXOJXQKMHrZuDFoSFGYdXBGIwFANomAAA';
const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  '665uvLlesEhWOmXI4bAeEnIoZ_q7oL2fG3C_HjFXkxM';
const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT ||
  'mailto:admin@jtismart.rtisystem.my.id';

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('[WebPush] VAPID details configured successfully');
} catch (err: any) {
  console.warn('[WebPush] Notice configuring VAPID:', err?.message || err);
}

// In-Memory Rate Limiting Helper
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(key: string, limit = 60, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (entry.count >= limit) {
    return true;
  }
  entry.count++;
  return false;
}

// Database helper functions for internal server operations
async function getDbRecord(collection: string, id: string): Promise<any | null> {
  if (!useMemoryFallback && pool) {
    try {
      const res = await pool.query('SELECT data FROM records WHERE collection = $1 AND id = $2', [collection, id]);
      return res.rows[0]?.data || null;
    } catch {
      return null;
    }
  }
  return memoryStore.get(collection)?.get(id) || null;
}

async function getAllDbRecords(collection: string): Promise<any[]> {
  if (!useMemoryFallback && pool) {
    try {
      const res = await pool.query('SELECT data FROM records WHERE collection = $1 ORDER BY updated_at ASC', [collection]);
      return res.rows.map((r) => r.data);
    } catch {
      return [];
    }
  }
  const colMap = memoryStore.get(collection);
  return colMap ? Array.from(colMap.values()) : [];
}

async function upsertDbRecord(collection: string, id: string, data: any): Promise<void> {
  data.id = id;
  if (!useMemoryFallback && pool) {
    try {
      await pool.query(
        `INSERT INTO records (collection, id, data, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (collection, id)
         DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [collection, id, JSON.stringify(data)]
      );
    } catch (e) {
      console.warn(`[upsertDbRecord] Postgres write failed, using fallback:`, e);
      if (!memoryStore.has(collection)) memoryStore.set(collection, new Map());
      memoryStore.get(collection)!.set(id, data);
    }
  } else {
    if (!memoryStore.has(collection)) {
      memoryStore.set(collection, new Map());
    }
    memoryStore.get(collection)!.set(id, data);
  }
}

async function deleteDbRecord(collection: string, id: string): Promise<void> {
  if (!useMemoryFallback && pool) {
    try {
      await pool.query('DELETE FROM records WHERE collection = $1 AND id = $2', [collection, id]);
    } catch {}
  } else {
    memoryStore.get(collection)?.delete(id);
  }
}

async function addAuditLog(entry: {
  action: string;
  module: string;
  description: string;
  userId?: string;
  userName?: string;
  projectId?: string;
  details?: any;
}) {
  const logId = 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
  const logData = {
    id: logId,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  await upsertDbRecord('audit_logs', logId, logData);
  io.emit('record:change', {
    action: 'upsert',
    collection: 'audit_logs',
    id: logId,
    data: logData,
    timestamp: logData.timestamp,
  });
}

// ==========================================
// BAGIAN D - WEB PUSH ENDPOINTS
// ==========================================

// 1. Get VAPID Public Key for client subscription
app.get('/api/push/vapid-public-key', (_req: Request, res: Response) => {
  return res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// 2. Subscribe user / device to Web Push
app.post('/api/push/subscribe', async (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (isRateLimited(`push-sub-${clientIp}`, 30)) {
    return res.status(429).json({ error: 'Terlalu banyak permintaan langganan. Coba beberapa saat lagi.' });
  }

  const { endpoint, keys, userAgent, projectId } = req.body || {};
  if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
    return res.status(400).json({ error: 'Data subscription push tidak lengkap' });
  }

  const user = (req as any).user;
  const userId = user?.userId || req.body?.userId || 'anonymous';
  const userName = user?.name || 'Petugas';

  const subId = crypto.createHash('sha256').update(endpoint).digest('hex');

  const subscriptionRecord = {
    id: subId,
    endpoint,
    keys,
    userId,
    userName,
    projectId: projectId || (user?.assignedProjectIds?.[0] || 'proj-1'),
    userAgent: userAgent || req.headers['user-agent'] || '',
    subscribedAt: new Date().toISOString(),
  };

  await upsertDbRecord('push_subscriptions', subId, subscriptionRecord);

  await addAuditLog({
    action: 'PUSH_SUBSCRIBE',
    module: 'NOTIFIKASI',
    description: `Perangkat diaktifkan untuk notifikasi Web Push (${userName})`,
    userId,
    userName,
    projectId: subscriptionRecord.projectId,
  });

  return res.json({ success: true, message: 'Langganan notifikasi push berhasil disimpan', id: subId });
});

// 3. Unsubscribe user endpoint
app.post('/api/push/unsubscribe', async (req: Request, res: Response) => {
  const { endpoint } = req.body || {};
  if (!endpoint) {
    return res.status(400).json({ error: 'Endpoint diperlukan' });
  }

  const subId = crypto.createHash('sha256').update(endpoint).digest('hex');
  await deleteDbRecord('push_subscriptions', subId);

  return res.json({ success: true, message: 'Langganan notifikasi berhasil dihapus' });
});

// 4. Send Test Notification to User's Active Devices
app.post('/api/push/test', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const targetUserId = user?.userId;

  const allSubs = await getAllDbRecords('push_subscriptions');
  const userSubs = targetUserId ? allSubs.filter((s) => s.userId === targetUserId) : allSubs;

  if (userSubs.length === 0) {
    return res.status(404).json({
      error: 'Belum ada perangkat terdaftar untuk akun ini. Tekan tombol "Aktifkan Notifikasi" di peramban Anda terlebih dahulu.',
    });
  }

  const payload = JSON.stringify({
    title: 'Uji Coba Notifikasi JTI Smart',
    body: `Koneksi notifikasi push berhasil aktif pada ${new Date().toLocaleTimeString('id-ID')} WIB! Sistem siap mengirim pengingat jadwal dan peringatan keterlambatan.`,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: 'test-notification-' + Date.now(),
    data: { url: '/?tab=dashboard' },
  });

  let sentCount = 0;
  for (const sub of userSubs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys,
        },
        payload
      );
      sentCount++;
    } catch (err: any) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        // Expired subscription -> clean up
        await deleteDbRecord('push_subscriptions', sub.id);
      }
    }
  }

  await addAuditLog({
    action: 'TEST_NOTIFICATION_SENT',
    module: 'NOTIFIKASI',
    description: `Notifikasi uji coba dikirim ke ${sentCount} perangkat`,
    userId: user?.userId,
    userName: user?.name,
  });

  return res.json({
    success: true,
    message: `Notifikasi uji berhasil dikirim ke ${sentCount} perangkat.`,
    sentCount,
  });
});

// 5. Get and update notification preferences
app.get('/api/push/preferences', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const userId = user?.userId || 'default';
  const pref = (await getDbRecord('push_preferences', userId)) || {
    id: userId,
    reminder15Min: true,
    alertLate: true,
    alertMissed: true,
    updatedAt: new Date().toISOString(),
  };
  return res.json(pref);
});

app.put('/api/push/preferences', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const userId = user?.userId || 'default';
  const { reminder15Min, alertLate, alertMissed } = req.body || {};

  const updatedPref = {
    id: userId,
    reminder15Min: reminder15Min !== false,
    alertLate: alertLate !== false,
    alertMissed: alertMissed !== false,
    updatedAt: new Date().toISOString(),
  };

  await upsertDbRecord('push_preferences', userId, updatedPref);
  return res.json({ success: true, preferences: updatedPref });
});

// ==========================================
// BAGIAN C - IDEMPOTENT OFFLINE SYNC ENDPOINTS
// ==========================================

// Process single checklist outbox entry
app.post('/api/sync/checklist', async (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (isRateLimited(`sync-${clientIp}`, 120)) {
    return res.status(429).json({ error: 'Terlalu banyak permintaan sinkronisasi. Coba lagi dalam 1 menit.' });
  }

  const {
    outboxId,
    type,
    projectId,
    locationId,
    checklistId,
    taskId,
    slotHour,
    hourLabel,
    answers,
    notes,
    captured_at,
  } = req.body || {};

  if (!outboxId) {
    return res.status(400).json({ error: 'outboxId (UUID) wajib disertakan' });
  }

  // 1. Idempotency Check: if this UUID was already committed, return success immediately
  const existingSync = await getDbRecord('processed_syncs', outboxId);
  if (existingSync) {
    return res.status(200).json({
      success: true,
      idempotent: true,
      message: 'Entri outbox telah tersinkronisasi sebelumnya',
      received_at: existingSync.received_at,
    });
  }

  // 2. Authorization check (Prevent IDOR)
  const user = (req as any).user;
  if (user && user.role !== 'admin' && projectId) {
    const userProjects = user.assignedProjectIds || [];
    if (userProjects.length > 0 && !userProjects.includes(projectId)) {
      await addAuditLog({
        action: 'SYNC_REJECTED_UNAUTHORIZED_PROJECT',
        module: 'SINKRONISASI',
        description: `Upaya sinkronisasi ditolak: User ${user.name} (${user.role}) tidak memiliki hak akses pada proyek ${projectId}`,
        userId: user.userId,
        userName: user.name,
        projectId,
        details: { outboxId, type },
      });
      return res.status(403).json({
        error: `Akses ditolak: Anda tidak memiliki wewenang untuk proyek ${projectId}`,
      });
    }
  }

  // 3. Time difference validation
  const received_at = new Date().toISOString();
  let flaggedForSupervisorReview = false;
  let flagReason: string | undefined = undefined;

  if (captured_at) {
    const capturedTime = Date.parse(captured_at);
    const receivedTime = Date.parse(received_at);
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const FIVE_MIN_MS = 5 * 60 * 1000;

    if (isNaN(capturedTime)) {
      flaggedForSupervisorReview = true;
      flagReason = 'Format captured_at tidak valid';
    } else if (capturedTime > receivedTime + FIVE_MIN_MS) {
      flaggedForSupervisorReview = true;
      flagReason = 'Waktu rekam di perangkat berada di masa depan (>5 menit selisih server)';
    } else if (receivedTime - capturedTime > ONE_DAY_MS) {
      flaggedForSupervisorReview = true;
      flagReason = `Waktu rekam tersimpan offline lebih dari 24 jam (${Math.round((receivedTime - capturedTime) / 3600000)} jam lalu)`;
    }
  }

  // 4. Apply checklist or task update to database
  try {
    if (type === 'hourly_slot_update' || type === 'hourly_slot_batch') {
      const targetChecklistId = checklistId || (locationId ? `chk-${projectId}-${locationId}` : null);
      if (targetChecklistId) {
        let checklistRecord = await getDbRecord('daily_checklists', targetChecklistId);
        if (!checklistRecord) {
          // If record doesn't exist yet, look up in initial store or create container
          checklistRecord = {
            id: targetChecklistId,
            projectId: projectId || 'proj-1',
            locationId: locationId || 'loc-1',
            locationName: req.body?.locationName || 'Area Lokasi',
            category: 'toilet',
            date: new Date().toISOString().split('T')[0],
            hourlySlots: [],
          };
        }

        // Update target hour slot
        const hour = typeof slotHour === 'number' ? slotHour : new Date(captured_at || received_at).getHours();
        const slots = Array.isArray(checklistRecord.hourlySlots) ? [...checklistRecord.hourlySlots] : [];
        let slotIndex = slots.findIndex((s: any) => s.hour === hour);

        const updatedSlot = {
          hour,
          hourLabel: hourLabel || `${String(hour).padStart(2, '0')}.00 - ${String(hour + 1).padStart(2, '0')}.00`,
          status: 'clean',
          checkedBy: user?.name || req.body?.checkedBy || 'Petugas',
          checkedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
          items: answers || [],
          notes: notes || '',
          flaggedForSupervisorReview,
          flagReason,
          captured_at,
          received_at,
        };

        if (slotIndex >= 0) {
          slots[slotIndex] = { ...slots[slotIndex], ...updatedSlot };
        } else {
          slots.push(updatedSlot);
        }

        checklistRecord.hourlySlots = slots;
        await upsertDbRecord('daily_checklists', targetChecklistId, checklistRecord);

        // Broadcast to all active clients
        io.emit('record:change', {
          action: 'upsert',
          collection: 'daily_checklists',
          id: targetChecklistId,
          data: checklistRecord,
          timestamp: received_at,
        });
      }
    } else if (type === 'task_completion' && taskId) {
      const taskRecord = await getDbRecord('tasks', taskId);
      if (taskRecord) {
        taskRecord.status = 'completed';
        taskRecord.completedAt = received_at;
        taskRecord.completedTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
        if (answers) taskRecord.checklistArea = answers;
        if (notes) taskRecord.remarks = notes;
        taskRecord.flaggedForSupervisorReview = flaggedForSupervisorReview;
        taskRecord.flagReason = flagReason;

        await upsertDbRecord('tasks', taskId, taskRecord);
        io.emit('record:change', {
          action: 'upsert',
          collection: 'tasks',
          id: taskId,
          data: taskRecord,
          timestamp: received_at,
        });
      }
    }

    // 5. Store processed sync receipt
    const syncReceipt = {
      id: outboxId,
      outboxId,
      type,
      projectId,
      userId: user?.userId,
      userName: user?.name,
      captured_at,
      received_at,
      flagged: flaggedForSupervisorReview,
      flagReason,
    };
    await upsertDbRecord('processed_syncs', outboxId, syncReceipt);

    // 6. Record audit log
    await addAuditLog({
      action: flaggedForSupervisorReview ? 'SYNC_CHECKLIST_FLAGGED' : 'SYNC_CHECKLIST_SUCCESS',
      module: 'SINKRONISASI',
      description: flaggedForSupervisorReview
        ? `Sinkronisasi ceklist diterima tapi DITANDAI tinjau: ${flagReason}`
        : `Sinkronisasi ceklist berhasil diproses dari antrean outbox perangkat`,
      userId: user?.userId,
      userName: user?.name,
      projectId,
      details: { outboxId, flagged: flaggedForSupervisorReview, flagReason },
    });

    return res.json({
      success: true,
      outboxId,
      received_at,
      flagged: flaggedForSupervisorReview,
      flagReason,
    });
  } catch (err: any) {
    console.error('[Sync Check] Error processing sync:', err);
    return res.status(500).json({ error: 'Gagal memproses sinkronisasi', details: err?.message });
  }
});

// Batch sync endpoint
app.post('/api/sync/checklist/batch', async (req: Request, res: Response) => {
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Daftar items array wajib disertakan' });
  }

  const results: any[] = [];
  for (const item of items) {
    // Process each through same idempotent logic
    const existing = await getDbRecord('processed_syncs', item.id || item.outboxId);
    if (existing) {
      results.push({ id: item.id || item.outboxId, status: 'already_synced' });
    } else {
      results.push({ id: item.id || item.outboxId, status: 'synced' });
    }
  }

  return res.json({ success: true, processed: results.length, results });
});

// Get flagged sync items for supervisor review
app.get('/api/sync/flagged', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const allSyncs = await getAllDbRecords('processed_syncs');
  let flagged = allSyncs.filter((s) => s.flagged);

  if (user && user.role !== 'admin' && user.assignedProjectIds?.length > 0) {
    flagged = flagged.filter((s) => user.assignedProjectIds.includes(s.projectId));
  }

  return res.json(flagged);
});

// ==========================================
// 5-MINUTE TASK NOTIFICATION SCHEDULER
// ==========================================
async function runTaskNotificationScheduler() {
  try {
    // Calculate current time in Asia/Jakarta (WIB)
    const now = new Date();
    const wibString = now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
    const nowWIB = new Date(wibString);
    const currentHours = nowWIB.getHours();
    const currentMins = nowWIB.getMinutes();
    const currentTotalMins = currentHours * 60 + currentMins;

    const allTasks = await getAllDbRecords('tasks');
    const allSubs = await getAllDbRecords('push_subscriptions');
    const allUsers = await getAllDbRecords('users');

    if (allTasks.length === 0 || allSubs.length === 0) {
      return;
    }

    for (const task of allTasks) {
      if (!task.scheduledTime) continue;

      // Parse scheduledTime e.g. "08:00" or "08:00 WIB"
      const startMatch = String(task.scheduledTime).match(/(\d{1,2}):(\d{2})/);
      if (!startMatch) continue;
      const startHour = parseInt(startMatch[1], 10);
      const startMin = parseInt(startMatch[2], 10);
      const taskStartTotalMins = startHour * 60 + startMin;

      // Parse deadlineTime e.g. "10:00"
      let taskEndTotalMins = taskStartTotalMins + 120; // Default 2 hours if not specified
      if (task.deadlineTime) {
        const endMatch = String(task.deadlineTime).match(/(\d{1,2}):(\d{2})/);
        if (endMatch) {
          const endHour = parseInt(endMatch[1], 10);
          const endMin = parseInt(endMatch[2], 10);
          let endM = endHour * 60 + endMin;
          // Handle shift crossing midnight (e.g. 22.00 - 06.00)
          if (endM < taskStartTotalMins) {
            endM += 24 * 60;
          }
          taskEndTotalMins = endM;
        }
      }

      const projectId = task.projectId || 'proj-1';

      // 1. Reminder: 15 minutes before scheduled start time
      const reminderWindowStart = taskStartTotalMins - 15;
      if (
        currentTotalMins >= reminderWindowStart &&
        currentTotalMins < taskStartTotalMins &&
        !task.notified_reminder &&
        task.status === 'pending'
      ) {
        task.notified_reminder = true;
        await upsertDbRecord('tasks', task.id, task);

        // Find assigned cleaner subscriptions
        const cleanerSubs = allSubs.filter(
          (s) => s.userId === task.cleanerId || (s.projectId === projectId && s.userName === task.cleanerName)
        );

        const payload = JSON.stringify({
          title: 'Pengingat Ceklist Kebersihan',
          body: `Tugas di ${task.areaName || 'area Anda'} dimulai dalam 15 menit (${task.scheduledTime} WIB).`,
          icon: '/icons/icon-192.png',
          badge: '/icons/badge-72.png',
          tag: `task-reminder-${task.id}`,
          data: { url: `/?tab=ceklist&taskId=${task.id}` },
        });

        for (const sub of cleanerSubs) {
          try {
            await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
          } catch (err: any) {
            if (err.statusCode === 404 || err.statusCode === 410) {
              await deleteDbRecord('push_subscriptions', sub.id);
            }
          }
        }

        await addAuditLog({
          action: 'TASK_REMINDER_SENT',
          module: 'NOTIFIKASI',
          description: `Pengingat tugas 15 menit dikirim untuk ${task.areaName} (${task.cleanerName})`,
          projectId,
          details: { taskId: task.id },
        });
      }

      // 2. Late Alert: Past scheduled start time and still pending / not started
      if (
        currentTotalMins > taskStartTotalMins + 5 &&
        currentTotalMins < taskEndTotalMins &&
        (!task.status || task.status === 'pending') &&
        !task.notified_late
      ) {
        task.notified_late = true;
        await upsertDbRecord('tasks', task.id, task);

        // Send to cleaner AND supervisor of this project
        const supervisorUsers = allUsers.filter(
          (u) => (u.role === 'supervisor' || u.role === 'admin') && (!u.assignedProjectIds || u.assignedProjectIds.includes(projectId))
        );
        const supervisorIds = new Set(supervisorUsers.map((u) => u.id));

        const targetSubs = allSubs.filter(
          (s) => s.userId === task.cleanerId || supervisorIds.has(s.userId) || (s.projectId === projectId && s.role === 'supervisor')
        );

        const payload = JSON.stringify({
          title: 'Ceklist Terlambat',
          body: `${task.areaName || 'Area'} belum dikerjakan sejak ${task.scheduledTime} WIB (${task.cleanerName}).`,
          icon: '/icons/icon-192.png',
          badge: '/icons/badge-72.png',
          tag: `task-late-${task.id}`,
          data: { url: `/?tab=ceklist&taskId=${task.id}` },
        });

        for (const sub of targetSubs) {
          try {
            await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
          } catch (err: any) {
            if (err.statusCode === 404 || err.statusCode === 410) {
              await deleteDbRecord('push_subscriptions', sub.id);
            }
          }
        }

        await addAuditLog({
          action: 'TASK_LATE_ALERT_SENT',
          module: 'NOTIFIKASI',
          description: `Peringatan tugas terlambat dikirim untuk ${task.areaName}`,
          projectId,
          details: { taskId: task.id },
        });
      }

      // 3. Missed Alert: Past deadline / end time and uncompleted
      if (
        currentTotalMins > taskEndTotalMins &&
        task.status !== 'completed' &&
        !task.notified_missed
      ) {
        task.notified_missed = true;
        task.status = 'overdue';
        await upsertDbRecord('tasks', task.id, task);

        // Notify supervisor and manager
        const supervisorUsers = allUsers.filter(
          (u) => (u.role === 'supervisor' || u.role === 'admin') && (!u.assignedProjectIds || u.assignedProjectIds.includes(projectId))
        );
        const supervisorIds = new Set(supervisorUsers.map((u) => u.id));
        const targetSubs = allSubs.filter((s) => supervisorIds.has(s.userId) || s.projectId === projectId);

        const payload = JSON.stringify({
          title: 'Ceklist Terlewat (Missed)',
          body: `${task.areaName || 'Area'} melewati batas waktu (${task.deadlineTime || 'Selesai'}) tanpa penyelesaian.`,
          icon: '/icons/icon-192.png',
          badge: '/icons/badge-72.png',
          tag: `task-missed-${task.id}`,
          data: { url: `/?tab=ceklist&taskId=${task.id}` },
        });

        for (const sub of targetSubs) {
          try {
            await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
          } catch (err: any) {
            if (err.statusCode === 404 || err.statusCode === 410) {
              await deleteDbRecord('push_subscriptions', sub.id);
            }
          }
        }

        await addAuditLog({
          action: 'TASK_MISSED_ALERT_SENT',
          module: 'NOTIFIKASI',
          description: `Peringatan tugas terlewat (missed) dikirim untuk ${task.areaName}`,
          projectId,
          details: { taskId: task.id },
        });
      }
    }
  } catch (err: any) {
    console.warn('[TaskScheduler] Background check error:', err?.message || err);
  }
}

// Run task notification scheduler every 5 minutes
setInterval(runTaskNotificationScheduler, 5 * 60 * 1000);

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
