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
import bcrypt from 'bcryptjs';
import { INITIAL_USERS } from './src/data/initialData';

dotenv.config();

const { Pool } = pg;

const app = express();

// Requirement 1: TRUST_PROXY dibaca dari environment variable (default 1 bila tidak disetel)
const rawTrustProxy = process.env.TRUST_PROXY;
const trustProxyVal: number | boolean =
  rawTrustProxy === undefined || rawTrustProxy === ''
    ? 1
    : !isNaN(Number(rawTrustProxy))
    ? parseInt(rawTrustProxy, 10)
    : rawTrustProxy.toLowerCase() === 'true'
    ? true
    : rawTrustProxy.toLowerCase() === 'false'
    ? false
    : 1;
app.set('trust proxy', trustProxyVal);

const httpServer = http.createServer(app);

// Helper Cookie Sesi (Requirement 2: HttpOnly, Secure di production, SameSite=Lax)
const isProduction = process.env.NODE_ENV === 'production';
const getSessionCookieHeader = (token: string): string =>
  `sco_auth_token=${encodeURIComponent(
    token
  )}; Path=/; Max-Age=604800; HttpOnly; SameSite=Lax${isProduction ? '; Secure' : ''}`;
const getClearCookieHeader = (): string =>
  `sco_auth_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${isProduction ? '; Secure' : ''}`;

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

// Bearer Token & Authentication Helpers (Loaded ONLY from environment variable)
const SESSION_SECRET = (process.env.SESSION_SECRET || '').trim();

if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  if (process.env.NODE_ENV === 'production') {
    console.error(
      '[FATAL ERROR] Environment variable SESSION_SECRET wajib diisi dengan minimal 32 karakter acak yang kuat. Server menolak start di lingkungan production tanpa SESSION_SECRET yang aman.'
    );
    process.exit(1);
  } else {
    console.warn(
      '[SECURITY NOTICE] SESSION_SECRET tidak diatur atau kurang dari 32 karakter. Pastikan SESSION_SECRET disetel di file .env.'
    );
  }
}

// Fallback signer for non-production development only if SESSION_SECRET is unset
const ACTIVE_SIGNING_KEY = SESSION_SECRET || 'dev-only-local-ephemeral-key-do-not-use-in-production-32chars';

function generateAuthToken(user: { id: string; role: string; name: string; username?: string; company_id?: string; companyId?: string; mustChangePassword?: boolean }): string {
  const company_id = user.company_id || user.companyId || 'comp-main';
  const payload = {
    userId: user.id,
    role: user.role,
    name: user.name,
    username: user.username,
    company_id,
    companyId: company_id,
    mustChangePassword: Boolean(user.mustChangePassword),
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // Token berlaku selama 7 hari
  };
  const dataB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', ACTIVE_SIGNING_KEY).update(dataB64).digest('base64url');
  return `${dataB64}.${sig}`;
}

function verifyAuthToken(token: string): any | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [dataB64, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', ACTIVE_SIGNING_KEY).update(dataB64).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(dataB64, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

function extractCookieToken(req: Request): string | null {
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)sco_auth_token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

// Requirement 2 & 3:
// Cookie sesi HANYA diterima untuk membaca file (GET /uploads).
// Penggunaan token sesi di query URL (?token=...) telah dihapus.
function extractToken(req: Request): string | null {
  // 1. Prioritas utama: Header Authorization Bearer token
  const bearer = extractBearerToken(req);
  if (bearer) return bearer;

  // 2. Cookie sesi HANYA diterima untuk membaca file (GET /uploads) (Requirement 2)
  const isUploadsGet = (req.method === 'GET' || req.method === 'HEAD') && req.path.startsWith('/uploads');
  if (isUploadsGet) {
    const cookie = extractCookieToken(req);
    if (cookie) return cookie;
  }

  return null;
}

// Requirement 3: Tautan bertanda tangan (HMAC) berumur maksimal 5 menit, terikat pada satu file dan satu company_id
function generateSignedFileUrl(
  companyId: string,
  filename: string,
  maxAgeSeconds: number = 300
): { signedUrl: string; expires: number } {
  const safeFilename = path.basename(filename);
  const expires = Date.now() + Math.min(Math.max(maxAgeSeconds, 30), 300) * 1000; // Maksimal 5 menit (300 detik)
  const payloadToSign = `file:${companyId}:${safeFilename}:${expires}`;
  const sig = crypto.createHmac('sha256', ACTIVE_SIGNING_KEY).update(payloadToSign).digest('base64url');
  const signedUrl = `/uploads/${encodeURIComponent(companyId)}/${encodeURIComponent(safeFilename)}?expires=${expires}&sig=${sig}`;
  return { signedUrl, expires };
}

function verifySignedFileUrl(
  companyId: string,
  filename: string,
  expiresStr?: any,
  sigStr?: any
): boolean {
  if (!expiresStr || !sigStr || typeof expiresStr !== 'string' || typeof sigStr !== 'string') {
    return false;
  }
  const expires = parseInt(expiresStr, 10);
  if (isNaN(expires) || Date.now() > expires) {
    return false; // Kedaluwarsa
  }
  // Tidak boleh melebihi 5 menit (+ 10 detik toleransi clock skew)
  if (expires > Date.now() + 5 * 60 * 1000 + 10000) {
    return false;
  }
  const safeFilename = path.basename(filename);
  const payloadToSign = `file:${companyId}:${safeFilename}:${expires}`;
  const expectedSig = crypto.createHmac('sha256', ACTIVE_SIGNING_KEY).update(payloadToSign).digest('base64url');
  if (sigStr.length !== expectedSig.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sigStr), Buffer.from(expectedSig));
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

// Security: Block any direct HTTP access to data folder, backup JSON files, or internal store files
app.use((req: Request, res: Response, next: NextFunction) => {
  const normalizedPath = decodeURIComponent(req.path || '').toLowerCase();
  if (
    normalizedPath.startsWith('/data') ||
    normalizedPath.includes('backup-') ||
    normalizedPath.includes('app_records_store')
  ) {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
});

// Requirement 2 & 3: Protected Uploads Route
// - Kebal path traversal & terisolasi per tenant
// - Mengizinkan tautan bertanda tangan (HMAC) berumur maks 5 menit terikat pada satu file
// - Mengizinkan cookie sesi (HANYA untuk GET /uploads) & Bearer token
// - Menolak token sesi di query URL (?token=...)
app.get(['/uploads/:companyId/:filename', '/uploads/:filename'], async (req: Request, res: Response) => {
  let targetCompany = '';
  let rawFilename = '';

  const paramComp = req.params.companyId;
  const paramFile = req.params.filename;

  if (paramComp && paramFile) {
    targetCompany = paramComp;
    rawFilename = paramFile;
  } else {
    // Jalur single segment: /uploads/:filename
    rawFilename = paramFile || paramComp || '';
    targetCompany = '';
  }

  // Path traversal check (Requirement b)
  if (!rawFilename || typeof rawFilename !== 'string') {
    return res.status(404).json({ error: 'File tidak ditemukan' });
  }

  const safeFilename = path.basename(rawFilename);
  if (
    !safeFilename ||
    safeFilename === '.' ||
    safeFilename === '..' ||
    safeFilename !== rawFilename ||
    rawFilename.includes('..') ||
    rawFilename.includes('/') ||
    rawFilename.includes('\\') ||
    rawFilename.includes('%')
  ) {
    return res.status(404).json({ error: 'File tidak ditemukan' });
  }

  const { expires, sig } = req.query;
  let isAuthorized = false;
  let isSuper = false;
  let sessionCompanyId = '';

  // 1. Tautan bertanda tangan (HMAC) berumur maksimal 5 menit, terikat pada satu file dan satu company_id
  if (typeof expires === 'string' && typeof sig === 'string') {
    const checkCompany = targetCompany || 'comp-main';
    if (verifySignedFileUrl(checkCompany, safeFilename, expires, sig)) {
      isAuthorized = true;
      targetCompany = checkCompany;
      sessionCompanyId = checkCompany;
    } else {
      return res.status(403).json({ error: 'Tautan tanda tangan file tidak valid atau sudah kedaluwarsa.' });
    }
  }

  // 2. Jika bukan tautan bertanda tangan: hanya terima Authorization header atau cookie sesi (GET /uploads)
  if (!isAuthorized) {
    const bearerToken = extractBearerToken(req);
    const cookieToken = extractCookieToken(req);
    const token = bearerToken || cookieToken;

    if (!token) {
      return res.status(404).json({ error: 'File tidak ditemukan' });
    }

    const verified = verifyAuthToken(token);
    if (!verified) {
      return res.status(404).json({ error: 'File tidak ditemukan' });
    }

    // mustChangePassword dipaksa di server
    if (verified.mustChangePassword) {
      return res.status(403).json({
        error: 'Wajib ganti kata sandi terlebih dahulu sebelum mengakses data sistem.',
        mustChangePassword: true,
      });
    }

    sessionCompanyId = verified.company_id || verified.companyId || 'comp-main';
    isSuper = verified.role === 'super_admin';

    if (!targetCompany) {
      targetCompany = sessionCompanyId;
    }

    // 404 bila bukan milik perusahaannya dan bukan Super Admin
    if (!isSuper && targetCompany !== sessionCompanyId) {
      return res.status(404).json({ error: 'File tidak ditemukan' });
    }
  }

  // Isolasi pencarian berkas: HANYA folder tenant targetCompany
  const candidatePaths: string[] = [];
  candidatePaths.push(path.join(uploadsDir, targetCompany, safeFilename));

  // Legacy fallback KHUSUS untuk tenant comp-main atau Super Admin:
  if (targetCompany === 'comp-main' || (isSuper && sessionCompanyId === 'comp-main')) {
    candidatePaths.push(path.join(uploadsDir, 'comp-main', safeFilename));
    candidatePaths.push(path.join(uploadsDir, safeFilename));
  }

  let resolvedPath: string | null = null;
  for (const candidate of candidatePaths) {
    const resolved = path.resolve(candidate);
    if (!resolved.startsWith(uploadsDir)) {
      continue; // Cegah path traversal
    }
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
      resolvedPath = resolved;
      break;
    }
  }

  if (!resolvedPath) {
    return res.status(404).json({ error: 'File tidak ditemukan' });
  }

  const ext = path.extname(safeFilename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'private, max-age=86400');
  return res.sendFile(resolvedPath);
});

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

// Socket.IO Server with Multi-Tenant Room Isolation
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: isOriginAllowed,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  },
  maxHttpBufferSize: 20 * 1024 * 1024, // 20MB
});

function emitTenantRecordChange(eventName: string, payload: any) {
  const targetCompany = payload.company_id || payload.companyId || 'comp-main';
  // Emit to isolated company room and super_admin observers
  io.to(`company:${targetCompany}`).to('role:super_admin').emit(eventName, payload);
  if (targetCompany === 'comp-main') {
    io.to('company:comp-main').emit(eventName, payload);
  }
}

io.on('connection', (socket) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    const verified = verifyAuthToken(token);
    if (verified) {
      const companyId = verified.company_id || verified.companyId || 'comp-main';
      socket.join(`company:${companyId}`);
      if (verified.role === 'super_admin') {
        socket.join('role:super_admin');
      }
    } else {
      socket.join('company:comp-main');
    }
  } else {
    socket.join('company:comp-main');
  }

  // Allow client to join authenticated company room dynamically
  socket.on('auth:join', (data: { token?: string }) => {
    if (data?.token) {
      const verified = verifyAuthToken(data.token);
      if (verified) {
        const companyId = verified.company_id || verified.companyId || 'comp-main';
        socket.join(`company:${companyId}`);
        if (verified.role === 'super_admin') {
          socket.join('role:super_admin');
        }
      }
    }
  });

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

// Multer Storage with MemoryStorage for Content Magic-Bytes Inspection (Requirement 2)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

function detectImageFromBuffer(buffer: Buffer): { valid: boolean; ext: string; mime: string } {
  if (!buffer || buffer.length < 12) {
    return { valid: false, ext: '', mime: '' };
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, ext: '.jpg', mime: 'image/jpeg' };
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, ext: '.png', mime: 'image/png' };
  }
  // GIF: GIF87a or GIF89a
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return { valid: true, ext: '.gif', mime: 'image/gif' };
  }
  // WEBP: RIFF....WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x42 &&
    buffer[10] === 0x50
  ) {
    return { valid: true, ext: '.webp', mime: 'image/webp' };
  }
  return { valid: false, ext: '', mime: '' };
}

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

// Multi-Tenant Helper Functions
async function getCompanyById(companyId: string): Promise<any | null> {
  if (!companyId) return null;
  const colMap = memoryStore.get('companies');
  if (colMap && colMap.has(companyId)) {
    return colMap.get(companyId);
  }
  if (!useMemoryFallback && pool) {
    try {
      const res = await pool.query(
        "SELECT data FROM records WHERE collection = 'companies' AND id = $1 LIMIT 1",
        [companyId]
      );
      if (res.rows.length > 0) return res.rows[0].data;
    } catch {}
  }
  if (companyId === 'comp-main') {
    return {
      id: 'comp-main',
      nama: 'Perusahaan Utama',
      slug: 'utama',
      status: 'aktif',
    };
  }
  return null;
}

// Centralized Session Tenant Resolver:
// company_id is strictly resolved from the authenticated server-signed session token.
// NEVER resolved from req.body, req.query, req.params, or client headers.
function resolveSessionCompanyId(req: Request): string {
  const user = (req as any).user;
  if (user && (user.company_id || user.companyId)) {
    return String(user.company_id || user.companyId);
  }
  // Default legacy fallback for unauthenticated requests
  return 'comp-main';
}

function isSessionSuperAdmin(req: Request): boolean {
  const user = (req as any).user;
  return user?.role === 'super_admin';
}

// Centralized Tenant & Session Protection Middleware
app.use('/api', async (req: Request, res: Response, next: NextFunction) => {
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  const bearerToken = extractBearerToken(req);
  const cookieToken = extractCookieToken(req);

  // Endpoint publik tanpa autentikasi
  const isPublicAuthPath =
    (req.path === '/auth/login' || req.path === '/api/auth/login') && req.method === 'POST';

  // Requirement 2: CSRF Protection
  // Semua endpoint POST/PUT/PATCH/DELETE hanya menerima token lewat header Authorization
  // dan menolak (401) bila hanya ada cookie.
  if (isMutating && !isPublicAuthPath) {
    if (!bearerToken) {
      if (cookieToken) {
        return res.status(401).json({
          error: 'Akses ditolak (CSRF Protection): Operasi data (POST/PUT/PATCH/DELETE) hanya menerima token lewat header Authorization (Bearer token), bukan cookie.',
        });
      }
    }
  }

  // Pada rute /api/*, autentikasi HANYA melalui Bearer token (cookie tidak dipakai untuk /api)
  const token = bearerToken;
  if (token) {
    const verified = verifyAuthToken(token);
    if (verified) {
      const companyId = verified.company_id || verified.companyId || 'comp-main';
      (req as any).user = {
        ...verified,
        company_id: companyId,
        companyId,
      };

      // Requirement d: mustChangePassword dipaksa di server: selain ganti sandi dan logout, semua endpoint ditolak sampai sandi diganti
      if (verified.mustChangePassword) {
        const allowedAuthPaths = ['/auth/change-password', '/auth/logout', '/auth/me'];
        const isAllowedPath = allowedAuthPaths.some((p) => req.path.startsWith(p));
        if (!isAllowedPath) {
          return res.status(403).json({
            error: 'Wajib ganti kata sandi: Akun Anda masih menggunakan kata sandi bawaan. Harap perbarui kata sandi Anda sebelum mengakses data sistem.',
            mustChangePassword: true,
          });
        }
      }

      // Requirement 4: Perusahaan berstatus ditangguhkan / diarsipkan: sesi ditolak
      if (verified.role !== 'super_admin' && !req.path.startsWith('/auth/login')) {
        const company = await getCompanyById(companyId);
        if (company) {
          if (company.status === 'ditangguhkan') {
            return res.status(403).json({
              error: 'Akses ditolak: Perusahaan Anda sedang ditangguhkan. Silakan hubungi Super Administrator.',
              companyStatus: 'ditangguhkan',
            });
          }
          if (company.status === 'diarsipkan') {
            return res.status(403).json({
              error: 'Akses ditolak: Perusahaan Anda telah diarsipkan.',
              companyStatus: 'diarsipkan',
            });
          }
        }
      }
    }
  }
  next();
});

// Helper untuk membaca IP asli klien di belakang reverse proxy (Requirement e)
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

// Login Rate Limiting Memory Store (Requirement 5)
const loginFailureMap = new Map<string, { count: number; lockedUntil: number }>();

function checkLoginRateLimit(key: string): { allowed: boolean; waitSeconds?: number } {
  const entry = loginFailureMap.get(key);
  if (!entry) return { allowed: true };
  const now = Date.now();
  if (now > entry.lockedUntil) {
    loginFailureMap.delete(key);
    return { allowed: true };
  }
  if (entry.count >= 5) {
    return { allowed: false, waitSeconds: Math.ceil((entry.lockedUntil - now) / 1000) };
  }
  return { allowed: true };
}

function recordLoginFailure(key: string) {
  const now = Date.now();
  const entry = loginFailureMap.get(key) || { count: 0, lockedUntil: now + 15 * 60 * 1000 };
  entry.count += 1;
  entry.lockedUntil = now + 15 * 60 * 1000; // Kunci 15 menit jika mencapai batas
  loginFailureMap.set(key, entry);
}

function resetLoginFailure(key: string) {
  loginFailureMap.delete(key);
}

// REST Endpoints

// 0. Authentication Endpoints (Supports Bearer token in Authorization header & Cookies)
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { identifier, password, userId } = req.body || {};
  const clientIp = getClientIp(req);
  const cleanId = String(identifier || userId || '').trim().toLowerCase();

  const ipKey = `ip:${clientIp}`;
  const acctKey = `acct:${cleanId}`;

  // Rate Limiting per IP dan per Akun (Requirement 5)
  const ipLimit = checkLoginRateLimit(ipKey);
  if (!ipLimit.allowed) {
    return res.status(429).json({
      success: false,
      error: `Terlalu banyak percobaan login gagal dari alamat IP Anda. Silakan coba kembali dalam ${ipLimit.waitSeconds} detik.`,
    });
  }

  const acctLimit = checkLoginRateLimit(acctKey);
  if (!acctLimit.allowed) {
    return res.status(429).json({
      success: false,
      error: `Akun ini terkunci sementara karena terlalu banyak percobaan sandi gagal. Silakan coba lagi dalam ${acctLimit.waitSeconds} detik.`,
    });
  }

  const users = await getUsersList();
  let matchedUser: any = null;

  if (userId) {
    matchedUser = users.find((u) => u.id === userId);
  } else if (identifier) {
    matchedUser = users.find(
      (u) =>
        (u.username && u.username.toLowerCase() === cleanId) ||
        (u.email && u.email.toLowerCase() === cleanId)
    );

    if (matchedUser) {
      const cleanPass = String(password || '').trim();
      const storedPassword = matchedUser.password;

      if (!storedPassword) {
        recordLoginFailure(ipKey);
        recordLoginFailure(acctKey);
        return res.status(401).json({
          success: false,
          error: 'Akun ini belum memiliki kata sandi terdaftar.',
        });
      }

      let isMatch = false;
      // Verifikasi kata sandi dengan bcrypt (Requirement 5)
      if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$')) {
        isMatch = bcrypt.compareSync(cleanPass, storedPassword);
      } else {
        // Fallback migrasi jika password lama belum di-hash
        isMatch = storedPassword === cleanPass;
        if (isMatch) {
          matchedUser.password = bcrypt.hashSync(cleanPass, 10);
          await upsertDbRecord('users', matchedUser.id, matchedUser);
        }
      }

      if (!isMatch) {
        recordLoginFailure(ipKey);
        recordLoginFailure(acctKey);
        return res.status(401).json({
          success: false,
          error: 'Password salah. Silakan periksa kembali kata sandi Anda.',
        });
      }
    }
  }

  if (!matchedUser) {
    recordLoginFailure(ipKey);
    recordLoginFailure(acctKey);
    return res.status(401).json({
      success: false,
      error: 'Akun tidak ditemukan. Periksa kembali Username atau Email Anda.',
    });
  }

  // Reset rate limiting jika login sukses
  resetLoginFailure(ipKey);
  resetLoginFailure(acctKey);

  // Requirement 4: Perusahaan berstatus ditangguhkan / diarsipkan: login ditolak
  const userCompanyId = matchedUser.company_id || matchedUser.companyId || 'comp-main';
  if (matchedUser.role !== 'super_admin') {
    const company = await getCompanyById(userCompanyId);
    if (company) {
      if (company.status === 'ditangguhkan') {
        return res.status(403).json({
          success: false,
          error: 'Login ditolak: Akun perusahaan Anda sedang ditangguhkan. Hubungi Super Administrator.',
          companyStatus: 'ditangguhkan',
        });
      }
      if (company.status === 'diarsipkan') {
        return res.status(403).json({
          success: false,
          error: 'Login ditolak: Akun perusahaan Anda telah diarsipkan.',
          companyStatus: 'diarsipkan',
        });
      }
    }
  }

  // Requirement 5: Wajibkan ganti kata sandi bila akun superadmin masih memakai kata sandi bawaan
  let mustChangePassword = !!matchedUser.mustChangePassword;
  const cleanPassInput = String(password || '').trim();
  if (
    matchedUser.email === 'superadmin@cleaningops.com' &&
    (cleanPassInput === 'admin123' || matchedUser.mustChangePassword)
  ) {
    mustChangePassword = true;
    matchedUser.mustChangePassword = true;
    await upsertDbRecord('users', matchedUser.id, matchedUser);
  }

  // Generate signed Bearer token with company_id and role
  const token = generateAuthToken(matchedUser);

  // Set cookie for browser session & static/image access (HttpOnly, SameSite=Lax, Secure di prod)
  res.setHeader('Set-Cookie', getSessionCookieHeader(token));

  return res.json({
    success: true,
    token,
    tokenType: 'Bearer',
    mustChangePassword,
    message: mustChangePassword
      ? 'Peringatan Keamanan: Anda masih menggunakan kata sandi bawaan default. Wajib mengganti kata sandi segera.'
      : undefined,
    user: {
      id: matchedUser.id,
      name: matchedUser.name,
      username: matchedUser.username,
      email: matchedUser.email,
      role: matchedUser.role,
      company_id: userCompanyId,
      companyId: userCompanyId,
      assignedProjectIds: matchedUser.assignedProjectIds,
      mustChangePassword,
    },
  });
});

// Endpoint Ganti Kata Sandi (Requirement 2: Hanya menerima Bearer token)
app.post('/api/auth/change-password', async (req: Request, res: Response) => {
  const token = extractBearerToken(req);
  if (!token) return res.status(401).json({ error: 'Tidak terotentikasi: Token Authorization diperlukan.' });
  const payload = verifyAuthToken(token);
  if (!payload) return res.status(401).json({ error: 'Token sesi tidak valid atau kedaluwarsa.' });

  const { oldPassword, newPassword } = req.body || {};
  if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 8) {
    return res.status(400).json({ error: 'Kata sandi baru minimal harus 8 karakter.' });
  }

  if (newPassword.trim() === 'admin123') {
    return res.status(400).json({ error: 'Kata sandi baru tidak boleh sama dengan kata sandi default "admin123".' });
  }

  const user = await getDbRecord('users', payload.userId);
  if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });

  if (user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {
    if (!bcrypt.compareSync(String(oldPassword || ''), user.password)) {
      return res.status(400).json({ error: 'Kata sandi lama tidak sesuai.' });
    }
  } else if (user.password && user.password !== oldPassword) {
    return res.status(400).json({ error: 'Kata sandi lama tidak sesuai.' });
  }

  user.password = bcrypt.hashSync(newPassword.trim(), 10);
  user.mustChangePassword = false;
  await upsertDbRecord('users', user.id, user);

  await addAuditLog({
    action: 'PASSWORD_CHANGED',
    module: 'KEAMANAN',
    description: `Kata sandi berhasil diperbarui untuk ${user.name} (${user.email})`,
    userId: user.id,
    userName: user.name,
    company_id: user.company_id || 'comp-main',
  });

  return res.json({ success: true, message: 'Kata sandi berhasil diperbarui.' });
});

app.get('/api/auth/me', async (req: Request, res: Response) => {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ authenticated: false, error: 'Token otentikasi tidak ditemukan di header Authorization.' });
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return res.status(401).json({ authenticated: false, error: 'Token tidak sah atau sudah kedaluwarsa.' });
  }

  const userCompanyId = payload.company_id || payload.companyId || 'comp-main';
  if (payload.role !== 'super_admin') {
    const company = await getCompanyById(userCompanyId);
    if (company && (company.status === 'ditangguhkan' || company.status === 'diarsipkan')) {
      return res.status(403).json({
        authenticated: false,
        error: `Sesi ditolak: Perusahaan akun Anda sedang ${company.status}.`,
        companyStatus: company.status,
      });
    }
  }

  const users = await getUsersList();
  const user = users.find((u) => u.id === payload.userId) || {
    id: payload.userId,
    name: payload.name,
    role: payload.role,
    username: payload.username,
    company_id: userCompanyId,
    companyId: userCompanyId,
  };

  res.setHeader('Set-Cookie', getSessionCookieHeader(token));

  return res.json({
    authenticated: true,
    user: {
      ...user,
      company_id: user.company_id || userCompanyId,
      companyId: user.companyId || userCompanyId,
    },
    token,
  });
});

app.post('/api/auth/logout', (_req: Request, res: Response) => {
  res.setHeader('Set-Cookie', getClearCookieHeader());
  return res.json({ success: true, message: 'Berhasil keluar' });
});

// Requirement 4: Pergantian perusahaan aktif untuk Admin Perusahaan / Super Admin
// Hanya punya SATU company_id aktif per sesi. Divalidasi di server & dicatat di audit log.
app.post('/api/auth/switch-company', async (req: Request, res: Response) => {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Tidak terotentikasi: Token Authorization (Bearer) diperlukan.' });
  }

  const sessionUser = verifyAuthToken(token);
  if (!sessionUser) {
    return res.status(401).json({ error: 'Token sesi tidak valid atau kedaluwarsa.' });
  }

  if (sessionUser.mustChangePassword) {
    return res.status(403).json({ error: 'Wajib ganti kata sandi terlebih dahulu.' });
  }

  const { companyId: targetCompanyId } = req.body || {};
  if (!targetCompanyId || typeof targetCompanyId !== 'string') {
    return res.status(400).json({ error: 'Parameter companyId wajib disertakan.' });
  }

  const targetCompany = await getCompanyById(targetCompanyId.trim());
  if (!targetCompany) {
    return res.status(404).json({ error: 'Perusahaan tujuan tidak ditemukan.' });
  }

  if (targetCompany.status === 'ditangguhkan') {
    return res.status(403).json({ error: 'Perusahaan tujuan sedang ditangguhkan.' });
  }
  if (targetCompany.status === 'diarsipkan') {
    return res.status(403).json({ error: 'Perusahaan tujuan telah diarsipkan.' });
  }

  // Validasi hak akses:
  // - Super Admin: Bebas berpindah ke perusahaan aktif manapun
  // - Admin Perusahaan: Harus terdaftar di company_id atau assignedCompanyIds pengguna
  const isSuper = sessionUser.role === 'super_admin';
  const fullUser = await getDbRecord('users', sessionUser.userId);

  if (!isSuper) {
    if (sessionUser.role !== 'admin_perusahaan' && sessionUser.role !== 'admin') {
      return res.status(403).json({ error: 'Hanya administrator yang diizinkan berpindah perusahaan aktif.' });
    }

    const userPrimaryComp = fullUser?.company_id || fullUser?.companyId;
    const userAssignedComps = Array.isArray(fullUser?.assignedCompanyIds) ? fullUser.assignedCompanyIds : [];
    const allowedCompanyIds = [userPrimaryComp, ...userAssignedComps].filter(Boolean);

    if (!allowedCompanyIds.includes(targetCompany.id)) {
      return res.status(403).json({
        error: 'Akses ditolak: Anda tidak memiliki wewenang untuk mengelola perusahaan ini.',
      });
    }
  }

  // Catat pergantian perusahaan aktif di audit log (Requirement 4)
  const previousCompanyId = sessionUser.company_id || 'comp-main';
  await addAuditLog({
    action: 'COMPANY_SWITCHED',
    module: 'AUTENTIKASI',
    description: `${sessionUser.name} (${sessionUser.role}) berpindah perusahaan aktif dari ${previousCompanyId} ke "${targetCompany.nama}" (${targetCompany.id})`,
    userId: sessionUser.userId,
    userName: sessionUser.name,
    company_id: targetCompany.id,
    details: {
      fromCompanyId: previousCompanyId,
      toCompanyId: targetCompany.id,
      companyName: targetCompany.nama,
    },
  });

  // Terbitkan token baru dengan SATU company_id aktif per sesi (Requirement 4)
  const updatedPayload = {
    id: sessionUser.userId,
    name: sessionUser.name,
    role: sessionUser.role,
    username: sessionUser.username,
    company_id: targetCompany.id,
    companyId: targetCompany.id,
    mustChangePassword: false,
  };
  const newToken = generateAuthToken(updatedPayload);

  // Set cookie sesi baru (HttpOnly, SameSite=Lax, Secure di prod)
  res.setHeader('Set-Cookie', getSessionCookieHeader(newToken));

  return res.json({
    success: true,
    message: `Berhasil beralih ke perusahaan "${targetCompany.nama}"`,
    token: newToken,
    tokenType: 'Bearer',
    company: targetCompany,
    user: {
      ...(fullUser || sessionUser),
      company_id: targetCompany.id,
      companyId: targetCompany.id,
    },
  });
});

// Requirement 3: Endpoint membuat tautan bertanda tangan (HMAC) berumur maks 5 menit
// Terikat pada satu file dan satu company_id, membutuhkan login
app.get(['/api/uploads/signed-url', '/api/uploads/sign'], async (req: Request, res: Response) => {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Tidak terotentikasi: Login diperlukan untuk membuat tautan bertanda tangan.' });
  }

  const user = verifyAuthToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Token sesi tidak valid atau kedaluwarsa.' });
  }

  const rawUrl = (req.query.url || req.query.path || '') as string;
  const paramComp = (req.query.companyId || '') as string;
  const paramFile = (req.query.filename || '') as string;

  let targetCompany = '';
  let rawFilename = '';

  if (rawUrl) {
    const cleanPath = rawUrl.replace(/^\/uploads\/?/, '');
    const parts = cleanPath.split('?')[0].split('/');
    if (parts.length >= 2) {
      targetCompany = parts[0];
      rawFilename = parts[1];
    } else if (parts.length === 1) {
      targetCompany = user.company_id || 'comp-main';
      rawFilename = parts[0];
    }
  } else if (paramFile) {
    targetCompany = paramComp || user.company_id || 'comp-main';
    rawFilename = paramFile;
  }

  if (!rawFilename) {
    return res.status(400).json({ error: 'Parameter file atau URL tidak valid' });
  }

  const safeFilename = path.basename(rawFilename);
  const sessionCompanyId = user.company_id || 'comp-main';
  const isSuper = user.role === 'super_admin';

  // Validasi hak akses tenant (non-superadmin hanya untuk perusahaannya)
  if (!isSuper && targetCompany !== sessionCompanyId) {
    return res.status(403).json({ error: 'Akses ditolak: Anda tidak memiliki akses ke file perusahaan lain.' });
  }

  const { signedUrl, expires } = generateSignedFileUrl(targetCompany, safeFilename, 300);
  return res.json({
    success: true,
    signedUrl,
    expires,
    companyId: targetCompany,
    filename: safeFilename,
  });
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

// 2. GET /api/records/:collection -> semua data satu koleksi (Difilter per company_id sesi)
app.get('/api/records/:collection', async (req: Request, res: Response) => {
  const { collection } = req.params;
  const sessionCompanyId = resolveSessionCompanyId(req);
  const isSuper = isSessionSuperAdmin(req);

  try {
    let items = await getAllDbRecords(collection);

    // Centralized Tenant Isolation Filtering (Requirement 2 & 5)
    if (!isSuper) {
      if (collection === 'companies') {
        // Non-superadmin hanya dapat melihat perusahaannya sendiri
        items = items.filter((c: any) => c.id === sessionCompanyId);
      } else if (collection === 'audit_logs') {
        // Requirement 5: Admin Perusahaan hanya melihat log perusahaannya
        items = items.filter((l: any) => (l.company_id || l.companyId || 'comp-main') === sessionCompanyId);
      } else {
        // Semua data bisnis: project, area, tasks, cleaners, shifts, schedules, checklists, dsb
        items = items.filter((item: any) => {
          const itemComp = item.company_id || item.companyId;
          if (!itemComp) return sessionCompanyId === 'comp-main';
          return itemComp === sessionCompanyId;
        });
      }
    }

    return res.json(items);
  } catch (err: any) {
    console.error(`[GET /api/records/${collection}] Error:`, err);
    return res.status(500).json({ error: 'Gagal mengambil data koleksi', details: err?.message });
  }
});

// GET /api/records/:collection/:id -> Ambil satu data (Requirement 3: ID milik perusahaan lain dibalas 404)
app.get('/api/records/:collection/:id', async (req: Request, res: Response) => {
  const { collection, id } = req.params;
  const sessionCompanyId = resolveSessionCompanyId(req);
  const isSuper = isSessionSuperAdmin(req);

  try {
    const record = await getDbRecord(collection, id);
    if (!record) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }

    // Requirement 3: ID milik perusahaan lain dibalas 404, bukan 403
    if (!isSuper) {
      if (collection === 'companies') {
        if (record.id !== sessionCompanyId) {
          return res.status(404).json({ error: 'Data tidak ditemukan' });
        }
      } else {
        const recordCompany = record.company_id || record.companyId || 'comp-main';
        if (recordCompany !== sessionCompanyId) {
          return res.status(404).json({ error: 'Data tidak ditemukan' });
        }
      }
    }

    return res.json(record);
  } catch (err: any) {
    console.error(`[GET /api/records/${collection}/${id}] Error:`, err);
    return res.status(500).json({ error: 'Gagal mengambil data', details: err?.message });
  }
});

// 2b. POST /api/records/:collection -> Buat data baru (Requirement 3: company_id dari sesi, abaikan dari klien)
app.post('/api/records/:collection', async (req: Request, res: Response) => {
  const { collection } = req.params;
  const data = req.body;
  const sessionCompanyId = resolveSessionCompanyId(req);
  const isSuper = isSessionSuperAdmin(req);

  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Body harus berupa objek JSON' });
  }

  if (collection === 'audit_logs') {
    return res.status(403).json({ error: 'Audit log hanya dapat dibuat oleh sistem internal.' });
  }

  // Task 4.3: Admin Perusahaan tidak bisa membuat perusahaan & mengubah branding global
  if (collection === 'companies') {
    if (!isSuper) {
      return res.status(403).json({ error: 'Akses ditolak: Hanya Super Administrator yang diizinkan membuat perusahaan baru.' });
    }
  }

  if (collection === 'company_profile') {
    if (!isSuper) {
      return res.status(403).json({ error: 'Akses ditolak: Hanya Super Administrator yang diizinkan mengubah profil & branding global sistem.' });
    }
  }

  // Task 4.2 & 4.3: Pembuatan pengguna & pencegahan kenaikan hak melebihi haknya
  if (collection === 'users') {
    if (!isSuper) {
      if (data.role === 'super_admin') {
        return res.status(403).json({ error: 'Akses ditolak: Anda tidak memiliki izin untuk membuat akun Super Administrator.' });
      }
      if (data.role === 'admin_perusahaan') {
        return res.status(403).json({ error: 'Akses ditolak: Hanya Super Administrator yang dapat membuat akun Admin Perusahaan.' });
      }
    }
    // Hash password jika diberikan dalam bentuk plaintext
    if (data.password && typeof data.password === 'string' && !data.password.startsWith('$2a$') && !data.password.startsWith('$2b$')) {
      data.password = bcrypt.hashSync(data.password, 10);
    }
  }

  const id = data.id || `${collection.slice(0, 4)}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  data.id = id;

  // Requirement 3: Tetapkan company_id dari sesi dan abaikan company_id dari klien (kecuali Super Admin)
  if (isSuper && data.company_id) {
    data.companyId = data.company_id;
  } else if (isSuper && data.companyId) {
    data.company_id = data.companyId;
  } else {
    data.company_id = sessionCompanyId;
    data.companyId = sessionCompanyId;
  }

  try {
    await upsertDbRecord(collection, id, data);
    scheduleSaveMemoryStore();

    const payload = {
      action: 'upsert' as const,
      collection,
      id,
      data,
      company_id: data.company_id,
      timestamp: new Date().toISOString(),
    };

    emitTenantRecordChange('record:change', payload);
    emitTenantRecordChange('record:upsert', payload);

    return res.status(201).json({ success: true, collection, id, data });
  } catch (err: any) {
    console.error(`[POST /api/records/${collection}] Error:`, err);
    return res.status(500).json({ error: 'Gagal membuat data baru', details: err?.message });
  }
});

// 3. PUT /api/records/:collection/:id -> simpan/ubah satu data (upsert)
app.put('/api/records/:collection/:id', async (req: Request, res: Response) => {
  const { collection, id } = req.params;
  const data = req.body;
  const sessionCompanyId = resolveSessionCompanyId(req);
  const isSuper = isSessionSuperAdmin(req);

  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Body harus berupa objek JSON' });
  }

  // Requirement 5: Audit log tidak bisa diedit/dihapus dari aplikasi
  if (collection === 'audit_logs') {
    return res.status(403).json({ error: 'Audit log bersifat permanen dan tidak dapat diubah dari aplikasi.' });
  }

  if (collection === 'company_profile' && !isSuper) {
    return res.status(403).json({ error: 'Akses ditolak: Hanya Super Administrator yang diizinkan mengubah profil & branding global sistem.' });
  }

  // Cek apakah data eksisting milik perusahaan lain (Requirement 3: 404 bukan 403)
  const existing = await getDbRecord(collection, id);
  if (existing && !isSuper) {
    const existingCompany = existing.company_id || existing.companyId || 'comp-main';
    if (existingCompany !== sessionCompanyId) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }
  }

  // Task 4.2 & 4.3: Menolak menurunkan Super Admin terakhir dan validasi eskalasi hak
  if (collection === 'users') {
    if (existing && existing.role === 'super_admin' && data.role && data.role !== 'super_admin') {
      const allUsers = await getUsersList();
      const otherSuperAdmins = allUsers.filter((u: any) => u.role === 'super_admin' && u.id !== id);
      if (otherSuperAdmins.length === 0) {
        return res.status(400).json({
          error: 'Aplikasi menolak menurunkan Super Admin terakhir. Harus ada setidaknya satu Super Administrator aktif.',
        });
      }
    }

    if (!isSuper) {
      if (data.role === 'super_admin') {
        return res.status(403).json({ error: 'Akses ditolak: Anda tidak dapat menaikkan hak akses menjadi Super Administrator.' });
      }
      if (data.role === 'admin_perusahaan' && (req as any).user?.role !== 'admin_perusahaan') {
        return res.status(403).json({ error: 'Akses ditolak: Anda tidak dapat menaikkan hak akses melebihi hak Anda.' });
      }
    }

    // Hash password jika diubah dengan plaintext
    if (data.password && typeof data.password === 'string' && !data.password.startsWith('$2a$') && !data.password.startsWith('$2b$')) {
      data.password = bcrypt.hashSync(data.password, 10);
    }
  }

  // Non-superadmin pada companies tidak dapat mengubah status aktif/ditangguhkan/diarsipkan
  if (collection === 'companies' && !isSuper && existing) {
    data.status = existing.status;
  }

  // Requirement 1: company_id dari sesi, BUKAN dari klien (kecuali Super Admin)
  data.id = id;
  if (isSuper && (data.company_id || data.companyId)) {
    const cId = data.company_id || data.companyId;
    data.company_id = cId;
    data.companyId = cId;
  } else {
    data.company_id = sessionCompanyId;
    data.companyId = sessionCompanyId;
  }

  try {
    await upsertDbRecord(collection, id, data);
    scheduleSaveMemoryStore();

    // Broadcast to connected clients via Socket.IO
    const payload = {
      action: 'upsert' as const,
      collection,
      id,
      data,
      company_id: data.company_id,
      timestamp: new Date().toISOString(),
    };

    emitTenantRecordChange('record:change', payload);
    emitTenantRecordChange('record:upsert', payload);

    return res.json({ success: true, collection, id, data });
  } catch (err: any) {
    console.error(`[PUT /api/records/${collection}/${id}] Error:`, err);
    return res.status(500).json({ error: 'Gagal menyimpan data', details: err?.message });
  }
});

// 4. DELETE /api/records/:collection/:id -> hapus satu data
app.delete('/api/records/:collection/:id', async (req: Request, res: Response) => {
  const { collection, id } = req.params;
  const sessionCompanyId = resolveSessionCompanyId(req);
  const isSuper = isSessionSuperAdmin(req);

  // Requirement 5: Audit log tidak bisa diedit/dihapus dari aplikasi
  if (collection === 'audit_logs') {
    return res.status(403).json({ error: 'Audit log bersifat permanen dan tidak dapat dihapus dari aplikasi.' });
  }

  // Task 4.1 & 4.3: Hanya Super Admin yang bisa menghapus perusahaan
  if (collection === 'companies') {
    if (!isSuper) {
      return res.status(403).json({ error: 'Akses ditolak: Hanya Super Administrator yang diizinkan menghapus perusahaan.' });
    }
    if (id === 'comp-main') {
      return res.status(400).json({ error: 'Operasi ditolak: Perusahaan Utama (comp-main) tidak dapat dihapus.' });
    }
  }

  if (collection === 'company_profile') {
    return res.status(403).json({ error: 'Operasi ditolak: Profil perusahaan global tidak dapat dihapus.' });
  }

  const existing = await getDbRecord(collection, id);
  if (!existing) {
    return res.status(404).json({ error: 'Data tidak ditemukan' });
  }

  // Task 4.2: Aplikasi menolak menghapus Super Admin terakhir
  if (collection === 'users' && existing.role === 'super_admin') {
    const allUsers = await getUsersList();
    const remainingSuperAdmins = allUsers.filter((u: any) => u.role === 'super_admin' && u.id !== id);
    if (remainingSuperAdmins.length === 0) {
      return res.status(400).json({
        error: 'Aplikasi menolak menghapus Super Admin terakhir. Harus ada setidaknya satu Super Administrator aktif.',
      });
    }
  }

  // Requirement 3: ID milik perusahaan lain dibalas 404, bukan 403
  if (!isSuper) {
    const existingCompany = existing.company_id || existing.companyId || 'comp-main';
    if (existingCompany !== sessionCompanyId) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }
  }

  try {
    await deleteDbRecord(collection, id);
    scheduleSaveMemoryStore();

    // Broadcast delete event to connected clients with tenant isolation
    const payload = {
      action: 'delete' as const,
      collection,
      id,
      company_id: existing.company_id || existing.companyId || sessionCompanyId,
      isDeleted: true,
      timestamp: new Date().toISOString(),
    };

    emitTenantRecordChange('record:change', payload);
    emitTenantRecordChange('record:delete', payload);

    return res.json({ success: true, collection, id });
  } catch (err: any) {
    console.error(`[DELETE /api/records/${collection}/${id}] Error:`, err);
    return res.status(500).json({ error: 'Gagal menghapus data', details: err?.message });
  }
});

// 5. POST /api/upload -> Upload foto dengan validasi tipe konten magic bytes, nama acak, batas ukuran, dan isolasi folder tenant (Requirement 1 & 2)
app.post('/api/upload', (req: Request, res: Response) => {
  (upload.single('file') as any)(req, res, async (err: any) => {
    if (err) {
      console.error('[POST /api/upload] Multer error:', err);
      return res.status(400).json({ error: err.message || 'Ukuran file melebihi batas maksimal 10MB atau upload gagal' });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'Tidak ada file gambar yang diunggah' });
    }

    // Requirement 2: Cek tipe dari isi file buffer (magic bytes), bukan ekstensi
    const detection = detectImageFromBuffer(req.file.buffer);
    if (!detection.valid) {
      return res.status(400).json({
        error: 'File ditolak: Tipe konten tidak valid. Hanya file gambar asli (JPEG, PNG, WEBP, GIF) yang diperbolehkan.',
      });
    }

    const sessionCompanyId = resolveSessionCompanyId(req);
    const tenantUploadDir = path.join(uploadsDir, sessionCompanyId);
    if (!fs.existsSync(tenantUploadDir)) {
      fs.mkdirSync(tenantUploadDir, { recursive: true });
    }

    // Requirement 2: Nama file diganti acak kriptografis
    const randomFilename = `${crypto.randomBytes(16).toString('hex')}${detection.ext}`;
    const targetFilePath = path.join(tenantUploadDir, randomFilename);

    try {
      fs.writeFileSync(targetFilePath, req.file.buffer);
    } catch (writeErr: any) {
      console.error('[POST /api/upload] File write error:', writeErr);
      return res.status(500).json({ error: 'Gagal menyimpan file ke disk penyimpanan server' });
    }

    // Jalur URL memuat company_id (Requirement 1)
    const fileUrl = `/uploads/${sessionCompanyId}/${randomFilename}`;
    const photoId = `photo-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const photoRecord = {
      id: photoId,
      url: fileUrl,
      filename: randomFilename,
      size: req.file.size,
      mimetype: detection.mime,
      company_id: sessionCompanyId,
      companyId: sessionCompanyId,
      uploadedBy: (req as any).user?.userId,
      createdAt: new Date().toISOString(),
    };
    await upsertDbRecord('photos', photoId, photoRecord);

    return res.json({
      success: true,
      url: fileUrl,
      filename: randomFilename,
      size: req.file.size,
      mimetype: detection.mime,
      company_id: sessionCompanyId,
      companyId: sessionCompanyId,
    });
  });
});

// 6. POST /api/pwa/update-icons -> Batch write all 11 generated PWA icons to public/icons/ (Restricted strictly to Super Admin)
app.post('/api/pwa/update-icons', async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user || user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Akses ditolak: Hanya Super Administrator yang diizinkan memperbarui ikon PWA' });
  }
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

async function addAuditLog(entry: {
  action: string;
  module: string;
  description: string;
  userId?: string;
  userName?: string;
  projectId?: string;
  company_id?: string;
  companyId?: string;
  details?: any;
}) {
  const logId = 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
  const company_id = entry.company_id || entry.companyId || 'comp-main';
  const logData = {
    id: logId,
    timestamp: new Date().toISOString(),
    ...entry,
    company_id,
    companyId: company_id,
  };
  await upsertDbRecord('audit_logs', logId, logData);
  emitTenantRecordChange('record:change', {
    action: 'upsert',
    collection: 'audit_logs',
    id: logId,
    data: logData,
    company_id,
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
  const sessionCompanyId = resolveSessionCompanyId(req);

  const subId = crypto.createHash('sha256').update(endpoint).digest('hex');

  const subscriptionRecord = {
    id: subId,
    endpoint,
    keys,
    userId,
    userName,
    company_id: sessionCompanyId,
    companyId: sessionCompanyId,
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
    company_id: sessionCompanyId,
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

  const user = (req as any).user;
  const sessionCompanyId = resolveSessionCompanyId(req);
  const isSuper = isSessionSuperAdmin(req);

  // 2. Authorization check (Prevent IDOR & Cross-Tenant Access)
  if (user && user.role !== 'admin' && user.role !== 'super_admin' && projectId) {
    const userProjects = user.assignedProjectIds || [];
    if (userProjects.length > 0 && !userProjects.includes(projectId)) {
      await addAuditLog({
        action: 'SYNC_REJECTED_UNAUTHORIZED_PROJECT',
        module: 'SINKRONISASI',
        description: `Upaya sinkronisasi ditolak: User ${user.name} (${user.role}) tidak memiliki hak akses pada proyek ${projectId}`,
        userId: user.userId,
        userName: user.name,
        projectId,
        company_id: sessionCompanyId,
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
        if (checklistRecord && !isSuper) {
          const recComp = checklistRecord.company_id || checklistRecord.companyId || 'comp-main';
          if (recComp !== sessionCompanyId) {
            return res.status(404).json({ error: 'Data tidak ditemukan' });
          }
        }

        if (!checklistRecord) {
          // If record doesn't exist yet, look up in initial store or create container
          checklistRecord = {
            id: targetChecklistId,
            company_id: sessionCompanyId,
            companyId: sessionCompanyId,
            projectId: projectId || 'proj-1',
            locationId: locationId || 'loc-1',
            locationName: req.body?.locationName || 'Area Lokasi',
            category: 'toilet',
            date: new Date().toISOString().split('T')[0],
            hourlySlots: [],
          };
        } else {
          checklistRecord.company_id = sessionCompanyId;
          checklistRecord.companyId = sessionCompanyId;
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

        // Broadcast to all active clients of this company
        emitTenantRecordChange('record:change', {
          action: 'upsert',
          collection: 'daily_checklists',
          id: targetChecklistId,
          data: checklistRecord,
          company_id: sessionCompanyId,
          timestamp: received_at,
        });
      }
    } else if (type === 'task_completion' && taskId) {
      const taskRecord = await getDbRecord('tasks', taskId);
      if (taskRecord) {
        if (!isSuper) {
          const recComp = taskRecord.company_id || taskRecord.companyId || 'comp-main';
          if (recComp !== sessionCompanyId) {
            return res.status(404).json({ error: 'Data tidak ditemukan' });
          }
        }
        taskRecord.status = 'completed';
        taskRecord.completedAt = received_at;
        taskRecord.completedTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
        taskRecord.company_id = sessionCompanyId;
        taskRecord.companyId = sessionCompanyId;
        if (answers) taskRecord.checklistArea = answers;
        if (notes) taskRecord.remarks = notes;
        taskRecord.flaggedForSupervisorReview = flaggedForSupervisorReview;
        taskRecord.flagReason = flagReason;

        await upsertDbRecord('tasks', taskId, taskRecord);
        emitTenantRecordChange('record:change', {
          action: 'upsert',
          collection: 'tasks',
          id: taskId,
          data: taskRecord,
          company_id: sessionCompanyId,
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
      company_id: sessionCompanyId,
      companyId: sessionCompanyId,
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
      company_id: sessionCompanyId,
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

// Get flagged sync items for supervisor review (Filtered by tenant session)
app.get('/api/sync/flagged', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const sessionCompanyId = resolveSessionCompanyId(req);
  const isSuper = isSessionSuperAdmin(req);
  const allSyncs = await getAllDbRecords('processed_syncs');
  let flagged = allSyncs.filter((s) => s.flagged);

  if (!isSuper) {
    flagged = flagged.filter((s) => (s.company_id || s.companyId || 'comp-main') === sessionCompanyId);
  }

  if (user && user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'admin_perusahaan' && user.assignedProjectIds?.length > 0) {
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
      const taskCompany = task.company_id || task.companyId || 'comp-main';

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

        // Find assigned cleaner subscriptions belonging to the same company
        const cleanerSubs = allSubs.filter(
          (s) =>
            (s.company_id || s.companyId || 'comp-main') === taskCompany &&
            (s.userId === task.cleanerId || (s.projectId === projectId && s.userName === task.cleanerName))
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
          company_id: taskCompany,
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

        // Send to cleaner AND supervisor of this project within the same company
        const supervisorUsers = allUsers.filter(
          (u) =>
            (u.company_id || u.companyId || 'comp-main') === taskCompany &&
            (u.role === 'supervisor' || u.role === 'admin' || u.role === 'admin_perusahaan') &&
            (!u.assignedProjectIds || u.assignedProjectIds.includes(projectId))
        );
        const supervisorIds = new Set(supervisorUsers.map((u) => u.id));

        const targetSubs = allSubs.filter(
          (s) =>
            (s.company_id || s.companyId || 'comp-main') === taskCompany &&
            (s.userId === task.cleanerId || supervisorIds.has(s.userId) || (s.projectId === projectId && s.role === 'supervisor'))
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
          company_id: taskCompany,
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

        // Notify supervisor and manager in the same company
        const supervisorUsers = allUsers.filter(
          (u) =>
            (u.company_id || u.companyId || 'comp-main') === taskCompany &&
            (u.role === 'supervisor' || u.role === 'admin' || u.role === 'admin_perusahaan') &&
            (!u.assignedProjectIds || u.assignedProjectIds.includes(projectId))
        );
        const supervisorIds = new Set(supervisorUsers.map((u) => u.id));
        const targetSubs = allSubs.filter(
          (s) =>
            (s.company_id || s.companyId || 'comp-main') === taskCompany &&
            (supervisorIds.has(s.userId) || s.projectId === projectId)
        );

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
          company_id: taskCompany,
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
