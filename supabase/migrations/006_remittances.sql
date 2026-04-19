-- 006_remittances.sql
-- 匯款管理表（歷史資料 + 新增）

CREATE TABLE IF NOT EXISTS remittances (
  id           BIGSERIAL PRIMARY KEY,
  month        TEXT NOT NULL,              -- "115.04" 民國年.月格式
  due_date     TEXT,                       -- 原文如 "4/10前"（允許非日期）
  paid_date    DATE,                       -- 實際付款日
  confirmed    BOOLEAN DEFAULT FALSE,      -- 勞報單/文件已確認
  invoice      TEXT,                       -- 發票/單號/勞報單說明
  amount       NUMERIC(12,2),              -- 金額
  bank_info    TEXT,                       -- 匯款資訊（多行原文）
  content      TEXT NOT NULL,             -- 對象/內容說明
  notes        TEXT,                       -- 備註
  account_name TEXT,                       -- 受款戶名（從 bank_info 解析）
  collab_name  TEXT,                       -- 合作對象名稱
  is_paid      BOOLEAN DEFAULT FALSE,      -- 是否已付款
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 防止重複 seed（同月份同列序號視為同一筆，用 content + month + amount 作 unique）
CREATE UNIQUE INDEX IF NOT EXISTS remittances_dedup
  ON remittances (month, content, COALESCE(amount, -1));

-- RLS
ALTER TABLE remittances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "remittances_select" ON remittances;
DROP POLICY IF EXISTS "remittances_insert" ON remittances;
DROP POLICY IF EXISTS "remittances_update" ON remittances;
DROP POLICY IF EXISTS "remittances_delete" ON remittances;

-- 所有登入使用者可讀
CREATE POLICY "remittances_select" ON remittances
  FOR SELECT USING (true);

-- 所有登入使用者可新增（透過 API 驗證身份）
CREATE POLICY "remittances_insert" ON remittances
  FOR INSERT WITH CHECK (true);

-- 所有登入使用者可更新
CREATE POLICY "remittances_update" ON remittances
  FOR UPDATE USING (true);

-- 所有登入使用者可刪除
CREATE POLICY "remittances_delete" ON remittances
  FOR DELETE USING (true);

-- updated_at 自動更新
CREATE OR REPLACE FUNCTION update_remittances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS remittances_updated_at ON remittances;
CREATE TRIGGER remittances_updated_at
  BEFORE UPDATE ON remittances
  FOR EACH ROW EXECUTE FUNCTION update_remittances_updated_at();
