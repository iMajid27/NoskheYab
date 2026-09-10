-- نسخه یاب - Seed Data
-- Run after 001_initial_schema.sql

-- ==========================================
-- PROVINCES
-- ==========================================
INSERT INTO provinces (name) VALUES
  ('تهران'),
  ('اصفهان'),
  ('فارس'),
  ('خراسان رضوی'),
  ('گیلان'),
  ('آذربایجان شرقی'),
  ('مازندران')
ON CONFLICT DO NOTHING;

-- ==========================================
-- CITIES
-- ==========================================
INSERT INTO cities (name, province_id)
  SELECT 'تهران', id FROM provinces WHERE name = 'تهران'
  WHERE NOT EXISTS (SELECT 1 FROM cities WHERE name = 'تهران' AND province_id = (SELECT id FROM provinces WHERE name = 'تهران'));
INSERT INTO cities (name, province_id)
  SELECT 'کرج', id FROM provinces WHERE name = 'تهران'
  WHERE NOT EXISTS (SELECT 1 FROM cities WHERE name = 'کرج' AND province_id = (SELECT id FROM provinces WHERE name = 'تهران'));
INSERT INTO cities (name, province_id)
  SELECT 'اسلام‌شهر', id FROM provinces WHERE name = 'تهران'
  WHERE NOT EXISTS (SELECT 1 FROM cities WHERE name = 'اسلام‌شهر' AND province_id = (SELECT id FROM provinces WHERE name = 'تهران'));

INSERT INTO cities (name, province_id)
  SELECT 'اصفهان', id FROM provinces WHERE name = 'اصفهان'
  WHERE NOT EXISTS (SELECT 1 FROM cities WHERE name = 'اصفهان' AND province_id = (SELECT id FROM provinces WHERE name = 'اصفهان'));
INSERT INTO cities (name, province_id)
  SELECT 'کاشان', id FROM provinces WHERE name = 'اصفهان'
  WHERE NOT EXISTS (SELECT 1 FROM cities WHERE name = 'کاشان' AND province_id = (SELECT id FROM provinces WHERE name = 'اصفهان'));

INSERT INTO cities (name, province_id)
  SELECT 'شیراز', id FROM provinces WHERE name = 'فارس'
  WHERE NOT EXISTS (SELECT 1 FROM cities WHERE name = 'شیراز' AND province_id = (SELECT id FROM provinces WHERE name = 'فارس'));

INSERT INTO cities (name, province_id)
  SELECT 'مشهد', id FROM provinces WHERE name = 'خراسان رضوی'
  WHERE NOT EXISTS (SELECT 1 FROM cities WHERE name = 'مشهد' AND province_id = (SELECT id FROM provinces WHERE name = 'خراسان رضوی'));

INSERT INTO cities (name, province_id)
  SELECT 'رشت', id FROM provinces WHERE name = 'گیلان'
  WHERE NOT EXISTS (SELECT 1 FROM cities WHERE name = 'رشت' AND province_id = (SELECT id FROM provinces WHERE name = 'گیلان'));

INSERT INTO cities (name, province_id)
  SELECT 'تبریز', id FROM provinces WHERE name = 'آذربایجان شرقی'
  WHERE NOT EXISTS (SELECT 1 FROM cities WHERE name = 'تبریز' AND province_id = (SELECT id FROM provinces WHERE name = 'آذربایجان شرقی'));

INSERT INTO cities (name, province_id)
  SELECT 'ساری', id FROM provinces WHERE name = 'مازندران'
  WHERE NOT EXISTS (SELECT 1 FROM cities WHERE name = 'ساری' AND province_id = (SELECT id FROM provinces WHERE name = 'مازندران'));

-- ==========================================
-- INITIAL ADMIN USER
-- Phone: 09361342824
-- Password: admin123 (change immediately after first login)
-- Password hash is for "admin123" - generated with bcrypt cost 10
-- ==========================================
INSERT INTO users (phone, username, password_hash, role)
VALUES ('09361342824', 'admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'SUPER_ADMIN')
ON CONFLICT (phone) DO NOTHING;

-- ==========================================
-- SITE CONTENT DEFAULTS
-- ==========================================
INSERT INTO site_content (page_key, title, body) VALUES
  ('about', 'درباره نسخه یاب', 'نسخه یاب سامانه‌ای برای مسیریابی نسخه‌های دارویی است که بیماران را به داروخانه‌های نزدیک متصل می‌کند. هدف ما سرعت بخشیدن به فرآیند تأمین دارو و افزایش شفافیت در قیمت‌ها و موجودی داروخانه‌ها است.'),
  ('contact', 'تماس با نسخه یاب', 'برای تماس با تیم پشتیبانی نسخه یاب می‌توانید از راه‌های زیر استفاده کنید.')
ON CONFLICT (page_key) DO NOTHING;

-- ==========================================
-- SITE SETTINGS DEFAULTS (contact info)
-- ==========================================
INSERT INTO site_settings (key, value) VALUES
  ('contact_phone', '02112345678'),
  ('contact_mobile', '09123456789'),
  ('contact_address', 'تهران، خیابان ولیعصر، پلاک ۱۲۳'),
  ('contact_email', 'info@nuskheyab.ir'),
  ('contact_working_hours', 'شنبه تا پنجشنبه، ۸ صبح تا ۸ شب')
ON CONFLICT (key) DO NOTHING;
