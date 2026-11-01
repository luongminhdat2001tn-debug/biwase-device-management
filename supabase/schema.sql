-- ==========================================
-- SCHEMA SQL - Tạo bảng cho Supabase
-- ==========================================
-- Chạy script này trong Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query → Paste → Run)
-- ==========================================

-- 1. Bảng tài khoản
CREATE TABLE IF NOT EXISTS accounts (
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

-- 2. Bảng sản phẩm kho
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  warehouse_id VARCHAR(50) NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  unit VARCHAR(50) DEFAULT '',
  quantity INTEGER DEFAULT 0,
  weight DECIMAL(10,2) DEFAULT 0,
  location VARCHAR(100) DEFAULT '',
  location_image_url TEXT,
  product_image_url TEXT,
  import_date DATE,
  category_name VARCHAR(200) NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
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

-- 4. Bảng nhân viên
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  ho_ten VARCHAR(100) NOT NULL,
  ngay_sinh DATE,
  gioi_tinh VARCHAR(10),
  cccd VARCHAR(20),
  ngay_cap_cccd DATE,
  noi_cap_cccd VARCHAR(100),
  ngay_thu_viec DATE,
  ngay_chinh_thuc DATE,
  ngay_het_hd DATE,
  loai_hd VARCHAR(50),
  trinh_do VARCHAR(50),
  chuyen_nganh VARCHAR(100),
  truong_dao_tao VARCHAR(100),
  nam_tot_nghiep VARCHAR(10),
  dia_chi TEXT,
  username VARCHAR(50),
  ghi_chu TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- INDEX cho tìm kiếm nhanh
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_products_warehouse ON products(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_products_deleted ON products(is_deleted);
CREATE INDEX IF NOT EXISTS idx_employees_username ON employees(username);
CREATE INDEX IF NOT EXISTS idx_history_created ON history_log(created_at DESC);

-- ==========================================
-- RLS (Row Level Security) - Tắt cho demo
-- ==========================================
-- Trong môi trường demo, tắt RLS để đơn giản
-- Production: nên bật RLS + policies phù hợp
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE history_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Policy cho phép anon key đọc/ghi tất cả (demo only)
CREATE POLICY "Allow all for anon" ON accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON history_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON employees FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- DỮ LIỆU MẪU BAN ĐẦU
-- ==========================================
-- Tạo tài khoản Admin mặc định để đăng nhập lần đầu
-- (bao gồm cả 4 quyền kho để admin luôn thấy đủ tab)
INSERT INTO accounts (username, password, name, chuc_vu, chuc_nang, status, is_admin)
VALUES ('admin', 'admin', 'Quản Trị Viên', 'Giám đốc', '{"them-tai-khoan","quan-ly-nhan-su","nhap-lieu","xuat-kho","ton-kho","kho-vat-tu","kho-xay-dung","kho-phong-thi-nghiem","kho-thuong-mai"}', 'active', true)
ON CONFLICT (username) DO NOTHING;

-- ==========================================
-- MIGRATION 1 LẦN: Đổi ID quyền kho cũ sang ID mới (khớp tab kho)
-- Chạy 1 lần trong SQL Editor nếu DB đã có tài khoản dùng ID cũ
-- ==========================================
-- UPDATE accounts SET chuc_nang = array_replace(chuc_nang, 'kho-vat-tu-nha-may', 'kho-vat-tu');
-- UPDATE accounts SET chuc_nang = array_replace(chuc_nang, 'kho-xay-dung-co-ban', 'kho-xay-dung');
