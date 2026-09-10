-- Migration: Add pharmacy schedule tables and update pharmacies table
-- Adds: county_id, removes working_hours text field dependency (keeps for backwards compat)

-- Add county_id to pharmacies (references counties by external ID from iran-locations.json)
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS county_id integer;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS county_name text;

-- ==========================================
-- PHARMACY OPENING HOURS (Weekly Schedule)
-- ==========================================
CREATE TABLE IF NOT EXISTS pharmacy_opening_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  opens_at text NOT NULL,
  closes_at text NOT NULL,
  is_24_hours boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opening_hours_pharmacy ON pharmacy_opening_hours(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_opening_hours_day ON pharmacy_opening_hours(day_of_week);

-- ==========================================
-- PHARMACY SCHEDULE EXCEPTIONS (Date-specific)
-- ==========================================
CREATE TABLE IF NOT EXISTS pharmacy_schedule_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  jalali_date text NOT NULL,
  status text NOT NULL CHECK (status IN ('CLOSED', 'SPECIAL_HOURS', 'TWENTY_FOUR_HOURS')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_pharmacy ON pharmacy_schedule_exceptions(pharmacy_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_exceptions_unique ON pharmacy_schedule_exceptions(pharmacy_id, jalali_date);

-- ==========================================
-- PHARMACY SCHEDULE EXCEPTION HOURS
-- ==========================================
CREATE TABLE IF NOT EXISTS pharmacy_schedule_exception_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_id uuid NOT NULL REFERENCES pharmacy_schedule_exceptions(id) ON DELETE CASCADE,
  opens_at text NOT NULL,
  closes_at text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exception_hours_exception ON pharmacy_schedule_exception_hours(exception_id);
