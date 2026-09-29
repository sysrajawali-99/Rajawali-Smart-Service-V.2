-- =========================================================================
-- RAJAWALI SMART CLEANING OPERATIONS - SUPABASE DATABASE SCHEMA
-- =========================================================================
-- Jalankan seluruh skrip SQL ini di Supabase Dashboard:
-- SQL Editor -> New Query -> Tempel (Paste) -> Run
-- =========================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLE: TASKS (Tugas Pembersihan Lapangan)
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

-- 3. TABLE: COMPLAINTS (Keluhan / Tiket Bantuan)
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
    reported_at TEXT,
    assigned_to TEXT,
    photos JSONB DEFAULT '[]'::jsonb,
    resolved_at TEXT,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLE: DAMAGE_REPORTS (Laporan Kerusakan Fasilitas & Aset)
CREATE TABLE IF NOT EXISTS public.damage_reports (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    ticket_no TEXT,
    area_name TEXT NOT NULL,
    item_name TEXT NOT NULL,
    description TEXT,
    severity TEXT DEFAULT 'sedang',
    status TEXT DEFAULT 'dilaporkan',
    reporter_name TEXT,
    reported_at TEXT,
    photo_urls JSONB DEFAULT '[]'::jsonb,
    repair_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLE: SPECIAL_JOBS (Pekerjaan Khusus / By Request)
CREATE TABLE IF NOT EXISTS public.special_jobs (
    id TEXT PRIMARY KEY,
    ticket_no TEXT NOT NULL,
    project_id TEXT,
    title TEXT NOT NULL,
    work_description TEXT,
    work_method TEXT,
    location TEXT,
    floor TEXT,
    frequency TEXT DEFAULT 'Special',
    pic_name TEXT,
    scheduled_date TEXT,
    status TEXT DEFAULT 'requested',
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

-- 7. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.damage_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_cleaning_programs ENABLE ROW LEVEL SECURITY;

-- 8. POLICIES (Full Access untuk Operasional Web App)
DROP POLICY IF EXISTS "Public full access tasks" ON public.tasks;
CREATE POLICY "Public full access tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access complaints" ON public.complaints;
CREATE POLICY "Public full access complaints" ON public.complaints FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access damage_reports" ON public.damage_reports;
CREATE POLICY "Public full access damage_reports" ON public.damage_reports FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access special_jobs" ON public.special_jobs;
CREATE POLICY "Public full access special_jobs" ON public.special_jobs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access master_cleaning_programs" ON public.master_cleaning_programs;
CREATE POLICY "Public full access master_cleaning_programs" ON public.master_cleaning_programs FOR ALL USING (true) WITH CHECK (true);

-- 9. ENABLE SUPABASE REALTIME PUBLICATION
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE 
      public.tasks, 
      public.complaints, 
      public.damage_reports, 
      public.special_jobs, 
      public.master_cleaning_programs;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;
