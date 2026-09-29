-- =========================================================================
-- RAJAWALI SMART CLEANING OPERATIONS - SUPABASE DATABASE SCHEMA
-- =========================================================================
-- Jalankan skrip SQL ini di Supabase Dashboard -> SQL Editor -> New Query -> Run
-- =========================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLE: TASKS (Tugas Pembersihan)
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    title TEXT NOT NULL,
    area_id TEXT,
    area_name TEXT NOT NULL,
    cleaner_id TEXT,
    cleaner_name TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    deadline_time TEXT,
    scheduled_time TEXT,
    completed_time TEXT,
    completed_at TIMESTAMPTZ,
    photo_before TEXT,
    photo_progress TEXT,
    photo_after TEXT,
    photo_proof TEXT,
    notes TEXT,
    remarks TEXT,
    checklist_items JSONB DEFAULT '[]'::jsonb,
    supplies_used JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLE: COMPLAINTS (Komplain & Tiket Bantuan)
CREATE TABLE IF NOT EXISTS public.complaints (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    ticket_no TEXT,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    category TEXT DEFAULT 'kebersihan',
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'open',
    reporter_name TEXT,
    reporter_role TEXT,
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_to TEXT,
    photos JSONB DEFAULT '[]'::jsonb,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLE: DAMAGE_REPORTS (Laporan Kerusakan Fasilitas)
CREATE TABLE IF NOT EXISTS public.damage_reports (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    ticket_no TEXT,
    area_name TEXT NOT NULL,
    item_name TEXT NOT NULL,
    description TEXT,
    severity TEXT DEFAULT 'sedang',
    status TEXT DEFAULT 'menunggu_verifikasi',
    reporter_name TEXT,
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    photo_urls JSONB DEFAULT '[]'::jsonb,
    repair_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLE: SPECIAL_JOBS (Special Job & Pekerjaan Khusus)
CREATE TABLE IF NOT EXISTS public.special_jobs (
    id TEXT PRIMARY KEY,
    ticket_no TEXT NOT NULL,
    project_id TEXT,
    title TEXT NOT NULL,
    work_description TEXT,
    work_method TEXT,
    location TEXT,
    floor TEXT,
    frequency TEXT,
    pic_name TEXT,
    scheduled_date TEXT,
    status TEXT DEFAULT 'draft',
    photo_before TEXT,
    photo_progress TEXT,
    photo_after TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLE: MASTER_CLEANING_PROGRAMS (Master Cleaning Program Periodic)
CREATE TABLE IF NOT EXISTS public.master_cleaning_programs (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    month INTEGER,
    year INTEGER,
    work_description TEXT NOT NULL,
    work_method TEXT,
    location TEXT,
    category TEXT DEFAULT 'periodic',
    frequency TEXT,
    pic_name TEXT,
    days JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.damage_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_cleaning_programs ENABLE ROW LEVEL SECURITY;

-- Allow anonymous & authenticated reads/writes for operational client app
CREATE POLICY "Public full access tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access complaints" ON public.complaints FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access damage_reports" ON public.damage_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access special_jobs" ON public.special_jobs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access master_cleaning_programs" ON public.master_cleaning_programs FOR ALL USING (true) WITH CHECK (true);

-- 8. ENABLE REALTIME ON KEY OPERATIONAL TABLES
-- Fitur Realtime Supabase agar update langsung broadcast ke semua device & Vercel
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.tasks, 
    public.complaints, 
    public.damage_reports, 
    public.special_jobs,
    public.master_cleaning_programs;
COMMIT;
