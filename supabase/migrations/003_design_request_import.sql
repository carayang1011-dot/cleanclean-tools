-- =============================================
-- 歷史資料匯入欄位 + RLS 調整
-- =============================================

ALTER TABLE design_requests
  ADD COLUMN IF NOT EXISTS requester_name      TEXT,
  ADD COLUMN IF NOT EXISTS designer_name       TEXT,
  ADD COLUMN IF NOT EXISTS imported_from_sheet TEXT,
  ADD COLUMN IF NOT EXISTS source_row          INTEGER;

-- 讓 admin 可以 insert 歷史資料（requester_id 可為 NULL 或他人）
DROP POLICY IF EXISTS "requests_insert" ON design_requests;
CREATE POLICY "requests_insert" ON design_requests FOR INSERT TO authenticated WITH CHECK (
  requester_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
