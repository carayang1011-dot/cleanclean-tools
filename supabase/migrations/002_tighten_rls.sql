-- =============================================
-- 安全性加強：收緊 RLS 政策
-- =============================================

-- Drop old overly permissive request select policy
DROP POLICY IF EXISTS "requests_select" ON design_requests;

-- New: Requesters see own requests; designers see assigned + unassigned; admins see all
CREATE POLICY "requests_select_v2" ON design_requests FOR SELECT TO authenticated USING (
  requester_id = auth.uid()
  OR (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'designer')
    AND (designer_id = auth.uid() OR designer_id IS NULL)
  )
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Drop old overly permissive request update policy
DROP POLICY IF EXISTS "requests_update" ON design_requests;

-- New: Requesters can only update their own (limited fields via app logic);
-- Designers can update assigned requests; admins can update all
CREATE POLICY "requests_update_v2" ON design_requests FOR UPDATE TO authenticated USING (
  requester_id = auth.uid()
  OR (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'designer')
    AND designer_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Tighten admin profile update: prevent non-admin from updating others
DROP POLICY IF EXISTS "profiles_admin_update" ON profiles;
CREATE POLICY "profiles_admin_update_v2" ON profiles FOR UPDATE TO authenticated USING (
  auth.uid() = id
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Add insert policy for profiles (needed for setup page to create new profiles)
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (
  id = auth.uid()
);

-- Tighten storage: only allow authenticated users to read files in requests they can access
DROP POLICY IF EXISTS "Authenticated users can read" ON storage.objects;
CREATE POLICY "Authenticated users can read own files" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'design-files'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('designer', 'admin'))
    )
  );
