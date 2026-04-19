-- =============================================
-- 淨淨設計需求管理系統 - 初始資料庫結構
-- =============================================

-- Profiles 表（對應 auth.users）
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'requester'
                CHECK (role IN ('requester', 'designer', 'admin')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 新用戶自動建立 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'requester')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Channels 表（行銷渠道）
CREATE TABLE IF NOT EXISTS channels (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  sort_order    INTEGER DEFAULT 0,
  default_sizes JSONB
);

-- Design Requests 表（核心需求表）
CREATE TABLE IF NOT EXISTS design_requests (
  id              SERIAL PRIMARY KEY,
  channel_id      INTEGER REFERENCES channels(id),
  activity_period TEXT,
  activity_name   TEXT NOT NULL,
  purpose         TEXT NOT NULL,
  size_spec       TEXT,
  quantity        INTEGER DEFAULT 1,
  copywriting     TEXT,
  product_info    TEXT,
  reference_urls  TEXT[],
  deadline        DATE,
  requester_id    UUID REFERENCES profiles(id),
  designer_id     UUID REFERENCES profiles(id),
  status          TEXT DEFAULT 'pending'
                    CHECK (status IN ('pending','in_progress','review','revision','completed')),
  priority        TEXT DEFAULT 'normal'
                    CHECK (priority IN ('urgent','high','normal','low')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Request Files 表
CREATE TABLE IF NOT EXISTS request_files (
  id          SERIAL PRIMARY KEY,
  request_id  INTEGER REFERENCES design_requests(id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  file_url    TEXT NOT NULL,
  file_type   TEXT DEFAULT 'deliverable'
                CHECK (file_type IN ('deliverable','reference','revision')),
  uploaded_by UUID REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Comments 表
CREATE TABLE IF NOT EXISTS comments (
  id          SERIAL PRIMARY KEY,
  request_id  INTEGER REFERENCES design_requests(id) ON DELETE CASCADE,
  author_id   UUID REFERENCES profiles(id),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Status History 表（狀態變更時間軸）
CREATE TABLE IF NOT EXISTS status_history (
  id          SERIAL PRIMARY KEY,
  request_id  INTEGER REFERENCES design_requests(id) ON DELETE CASCADE,
  old_status  TEXT,
  new_status  TEXT NOT NULL,
  changed_by  UUID REFERENCES profiles(id),
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- updated_at 自動觸發
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_design_requests_updated ON design_requests;
CREATE TRIGGER trg_design_requests_updated
  BEFORE UPDATE ON design_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 狀態變更自動記錄
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO status_history (request_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_status ON design_requests;
CREATE TRIGGER trg_log_status
  AFTER UPDATE OF status ON design_requests
  FOR EACH ROW EXECUTE FUNCTION log_status_change();

-- =============================================
-- Row Level Security
-- =============================================

ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels       ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_files  ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_admin_update" ON profiles FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Channels（所有人可讀，管理員可寫）
CREATE POLICY "channels_select" ON channels FOR SELECT TO authenticated USING (true);
CREATE POLICY "channels_admin_all" ON channels FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Design Requests
CREATE POLICY "requests_select" ON design_requests FOR SELECT TO authenticated USING (
  requester_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('designer','admin'))
);
CREATE POLICY "requests_insert" ON design_requests FOR INSERT TO authenticated WITH CHECK (
  requester_id = auth.uid()
);
CREATE POLICY "requests_update" ON design_requests FOR UPDATE TO authenticated USING (
  requester_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('designer','admin'))
);
CREATE POLICY "requests_delete_admin" ON design_requests FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Request Files
CREATE POLICY "files_select" ON request_files FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM design_requests dr WHERE dr.id = request_id
    AND (dr.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('designer','admin')))
  )
);
CREATE POLICY "files_insert" ON request_files FOR INSERT TO authenticated WITH CHECK (
  uploaded_by = auth.uid()
);

-- Comments
CREATE POLICY "comments_select" ON comments FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM design_requests dr WHERE dr.id = request_id
    AND (dr.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('designer','admin')))
  )
);
CREATE POLICY "comments_insert" ON comments FOR INSERT TO authenticated WITH CHECK (
  author_id = auth.uid()
);

-- Status History
CREATE POLICY "status_history_select" ON status_history FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM design_requests dr WHERE dr.id = request_id
    AND (dr.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('designer','admin')))
  )
);

-- =============================================
-- Storage Bucket
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'design-files',
  'design-files',
  false,
  52428800, -- 50MB
  ARRAY['image/jpeg','image/png','image/gif','image/webp','application/pdf',
        'application/zip','image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'design-files');

CREATE POLICY "Authenticated users can read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'design-files');

CREATE POLICY "Users can delete own files" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'design-files' AND auth.uid()::text = (storage.foldername(name))[1]
  );
