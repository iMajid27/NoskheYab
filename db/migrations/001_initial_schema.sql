-- نسخه یاب - Complete Database Schema
-- Standard PostgreSQL - No Supabase dependencies

-- ==========================================
-- ENUMS
-- ==========================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('PATIENT', 'PHARMACY_ADMIN', 'PHARMACY_USER', 'ADMIN', 'SUPER_ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE request_status AS ENUM ('PENDING', 'UNDER_REVIEW', 'HAS_OFFERS', 'PARTIAL_ACCEPTED', 'FULLY_ACCEPTED', 'EXPIRED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE offer_status AS ENUM ('PENDING', 'PUBLISHED', 'REVOKED', 'ACCEPTED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('AWAITING_PAYMENT', 'PAID', 'REJECTED_OUT_OF_STOCK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pharmacy_status AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==========================================
-- USERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  username text UNIQUE,
  password_hash text,
  role user_role NOT NULL DEFAULT 'PATIENT',
  national_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- ==========================================
-- PROVINCES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS provinces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ==========================================
-- CITIES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  province_id uuid NOT NULL REFERENCES provinces(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cities_province ON cities(province_id);

-- ==========================================
-- PHARMACIES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS pharmacies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  license_number text UNIQUE NOT NULL,
  city_id uuid NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  province text NOT NULL,
  technical_manager_name text,
  technical_manager_national_id text,
  technical_manager_mobile text,
  phone text,
  address text,
  postal_code text,
  working_hours text,
  status pharmacy_status NOT NULL DEFAULT 'PENDING_APPROVAL',
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pharmacies_city ON pharmacies(city_id);
CREATE INDEX IF NOT EXISTS idx_pharmacies_owner ON pharmacies(owner_id);
CREATE INDEX IF NOT EXISTS idx_pharmacies_status ON pharmacies(status);

-- ==========================================
-- PHARMACY DOCUMENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS pharmacy_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  object_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_docs_pharmacy ON pharmacy_documents(pharmacy_id);

-- ==========================================
-- PRESCRIPTIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tracking_code text NOT NULL,
  city_id uuid NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  status request_status NOT NULL DEFAULT 'PENDING',
  parent_id uuid REFERENCES prescriptions(id) ON DELETE CASCADE,
  patient_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_city ON prescriptions(city_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_parent ON prescriptions(parent_id);

-- ==========================================
-- PRESCRIPTION ITEMS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS prescription_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  name text NOT NULL,
  requested_qty integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prescription_items_rx ON prescription_items(prescription_id);

-- ==========================================
-- PHARMACY RESPONSES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS pharmacy_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  prescription_id uuid NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  status offer_status NOT NULL DEFAULT 'PENDING',
  pharmacist_note text,
  generated_note text,
  total_price double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_responses_rx ON pharmacy_responses(prescription_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_responses_pharmacy ON pharmacy_responses(pharmacy_id);

-- ==========================================
-- RESPONSE ITEMS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS response_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_response_id uuid NOT NULL REFERENCES pharmacy_responses(id) ON DELETE CASCADE,
  prescription_item_id uuid NOT NULL REFERENCES prescription_items(id) ON DELETE CASCADE,
  medicine_name text NOT NULL,
  available_qty integer NOT NULL DEFAULT 0,
  unit_price double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_response_items_response ON response_items(pharmacy_response_id);

-- ==========================================
-- ORDERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_response_id uuid UNIQUE NOT NULL REFERENCES pharmacy_responses(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount double precision NOT NULL DEFAULT 0,
  status order_status NOT NULL DEFAULT 'AWAITING_PAYMENT',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_patient ON orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_orders_response ON orders(pharmacy_response_id);

-- ==========================================
-- OTP CODES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at);

-- ==========================================
-- SITE CONTENT TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text UNIQUE NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
