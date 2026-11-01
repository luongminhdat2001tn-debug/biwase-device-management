-- ==========================================
-- SCHEMA SQL - Tạo bảng cho Supabase
-- ==========================================
-- Chạy script này trong Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query → Paste → Run)
-- ==========================================

-- 1. Bảng tài khoản
CREATE TABLE IF NOT EXISTS device_accounts (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  chuc_vu VARCHAR(100) DEFAULT '',
  chuc_nang TEXT[] DEFAULT '{"xem-co-ban"}',
  status VARCHAR(20) DEFAULT 'active',
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Bảng thiết bị
CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  manufacturer VARCHAR(200) NOT NULL,
  location VARCHAR(200) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Bảng lịch sử kho
CREATE TABLE IF NOT EXISTS history_log (
  id SERIAL PRIMARY KEY,
  date VARCHAR(20),
  time VARCHAR(20),
  warehouse VARCHAR(100),
  product_code VARCHAR(50),
  product_name VARCHAR(200),
  user_name VARCHAR(100),
  action VARCHAR(50),
  quantity INTEGER DEFAULT 0,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ==========================================
-- INDEX cho tìm kiếm nhanh
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_products_warehouse ON products(warehouse_id);

-- ==========================================
-- RLS (Row Level Security) - Tắt cho demo
-- ==========================================
-- Trong môi trường demo, tắt RLS để đơn giản
-- Production: nên bật RLS + policies phù hợp
ALTER TABLE device_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- Policy cho phép anon key đọc/ghi tất cả (demo only)
CREATE POLICY "Allow all for anon" ON device_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON devices FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- DỮ LIỆU MẪU BAN ĐẦU
-- ==========================================
-- Tạo tài khoản Admin mặc định để đăng nhập lần đầu
-- (bao gồm cả 4 quyền kho để admin luôn thấy đủ tab)
INSERT INTO device_accounts (username, password, name, chuc_vu, chuc_nang, status, is_admin)
VALUES ('admin', 'admin12345678@', 'Quản Trị Viên', 'Quản Trị Viên', '{"quan-ly-thiet-bi"}', 'active', true)
ON CONFLICT (username) DO NOTHING;
