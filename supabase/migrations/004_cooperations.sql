-- 004_cooperations.sql
-- KOC/KOL 合作紀錄表

CREATE TABLE IF NOT EXISTS cooperations (
  id                   BIGSERIAL PRIMARY KEY,
  data_source          TEXT,
  is_paid              TEXT DEFAULT '否',
  cooperation_type     TEXT,
  tier                 TEXT,
  year                 INTEGER,
  start_date           DATE,
  end_date             DATE,
  raw_date_text        TEXT,
  creator_name         TEXT NOT NULL,
  platform             TEXT,
  social_url           TEXT,
  product              TEXT,
  group_buy_system     TEXT,
  content_format       TEXT,
  owner                TEXT,
  status               TEXT DEFAULT '招募中',
  discount             TEXT,
  commission_rate      NUMERIC(6,4),
  fee_excl_tax         INTEGER,
  fee_incl_tax         INTEGER,
  order_count          INTEGER,
  revenue_excl_tax     INTEGER,
  commission_excl_tax  INTEGER,
  aov                  INTEGER,
  ad_authorization     TEXT,
  quote_note           TEXT,
  shipping_info        TEXT,
  bank_info            TEXT,
  paid_amount          INTEGER,
  paid_date            DATE,
  labor_report_no      TEXT,
  paid_match_note      TEXT,
  is_potential_duplicate BOOLEAN DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE cooperations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cooperations_select" ON cooperations;
DROP POLICY IF EXISTS "cooperations_insert" ON cooperations;
DROP POLICY IF EXISTS "cooperations_update" ON cooperations;
DROP POLICY IF EXISTS "cooperations_delete" ON cooperations;

CREATE POLICY "cooperations_select" ON cooperations FOR SELECT USING (true);
CREATE POLICY "cooperations_insert" ON cooperations FOR INSERT WITH CHECK (true);
CREATE POLICY "cooperations_update" ON cooperations FOR UPDATE USING (true);
CREATE POLICY "cooperations_delete" ON cooperations FOR DELETE USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS cooperations_year_idx        ON cooperations (year);
CREATE INDEX IF NOT EXISTS cooperations_status_idx      ON cooperations (status);
CREATE INDEX IF NOT EXISTS cooperations_owner_idx       ON cooperations (owner);
CREATE INDEX IF NOT EXISTS cooperations_creator_idx     ON cooperations (creator_name);
CREATE INDEX IF NOT EXISTS cooperations_start_date_idx  ON cooperations (start_date DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_cooperations_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS cooperations_updated_at ON cooperations;
CREATE TRIGGER cooperations_updated_at
  BEFORE UPDATE ON cooperations
  FOR EACH ROW EXECUTE FUNCTION update_cooperations_updated_at();
