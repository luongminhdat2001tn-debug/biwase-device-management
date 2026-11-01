-- ==========================================
-- SEED DATA - Dữ liệu mẫu cho demo
-- ==========================================
-- Chạy SAU KHI đã chạy schema.sql
-- ==========================================

-- ==========================================
-- 1. TÀI KHOẢN MẪU (6 tài khoản)
-- ==========================================
INSERT INTO accounts (username, password, name, chuc_vu, chuc_nang, status, is_admin) VALUES
  ('admin', 'admin123', 'Quản Trị Viên', 'Quản trị hệ thống', '{"xem-co-ban","nhap-lieu","xuat-kho","ton-kho","them-tai-khoan","quan-ly-nhan-su"}', 'active', true),
  ('kho', 'password123', 'Nguyễn Văn A', 'Nhân viên kho', '{"xem-co-ban","nhap-lieu"}', 'active', false),
  ('hr', 'password123', 'Trần Thị B', 'Nhân viên nhân sự', '{"xem-co-ban","quan-ly-nhan-su"}', 'active', false),
  ('ketoan', 'password123', 'Lê Văn C', 'Kế toán', '{"xem-co-ban","ton-kho"}', 'active', false),
  ('truongphong', 'password123', 'Phạm Thị D', 'Trưởng phòng', '{"xem-co-ban","xuat-kho"}', 'active', false),
  ('giamdoc', 'password123', 'Đặng Văn E', 'Giám đốc', '{"xem-co-ban","nhap-lieu","xuat-kho","ton-kho","them-tai-khoan","quan-ly-nhan-su"}', 'active', false);

-- ==========================================
-- 2. SẢN PHẨM KHO VẬT TƯ (5 sản phẩm)
-- ==========================================
INSERT INTO products (warehouse_id, code, name, unit, quantity, price_in, price_out, weight, location, import_date) VALUES
  ('kho-vat-tu', 'VT001', 'Ống PVC 50mm', 'cái', 250, 40000, 45000, 2.5, 'Kệ A1', '2024-01-15'),
  ('kho-vat-tu', 'VT002', 'Van cầu đôi', 'cái', 45, 100000, 120000, 1.2, 'Kệ A2', '2024-01-20'),
  ('kho-vat-tu', 'VT003', 'Bộ lọc nước', 'bộ', 120, 750000, 850000, 5, 'Kệ B1', '2024-02-01'),
  ('kho-vat-tu', 'VT004', 'Bơm nước 5KW', 'cái', 8, 3000000, 3500000, 25, 'Khu C', '2024-02-05'),
  ('kho-vat-tu', 'VT005', 'Thiết bị đo áp suất', 'cái', 30, 400000, 450000, 0.5, 'Kệ A3', '2024-02-10');

-- ==========================================
-- 3. SẢN PHẨM KHO XÂY DỰNG (4 sản phẩm)
-- ==========================================
INSERT INTO products (warehouse_id, code, name, unit, quantity, price_in, price_out, weight, location, import_date) VALUES
  ('kho-xay-dung', 'XD001', 'Xi măng PCB40', 'bao', 500, 85000, 95000, 50, 'Khu D', '2024-01-10'),
  ('kho-xay-dung', 'XD002', 'Thép phi 10', 'cây', 200, 160000, 180000, 8, 'Khu E', '2024-01-18'),
  ('kho-xay-dung', 'XD003', 'Gạch ống', 'viên', 10000, 1200, 1500, 2, 'Khu F', '2024-01-25'),
  ('kho-xay-dung', 'XD004', 'Cát xây dựng', 'm³', 50, 300000, 350000, 1500, 'Bãi G', '2024-02-03');

-- ==========================================
-- 4. SẢN PHẨM KHO THƯƠNG MẠI (4 sản phẩm)
-- ==========================================
INSERT INTO products (warehouse_id, code, name, unit, quantity, price_in, price_out, weight, location, import_date) VALUES
  ('kho-thuong-mai', 'TM001', 'Đồng hồ nước DN15', 'cái', 150, 200000, 250000, 0.8, 'Kệ TM1', '2024-01-12'),
  ('kho-thuong-mai', 'TM002', 'Đồng hồ nước DN20', 'cái', 100, 300000, 350000, 1, 'Kệ TM1', '2024-01-22'),
  ('kho-thuong-mai', 'TM003', 'Bình lọc nước gia đình', 'bộ', 50, 1000000, 1200000, 3, 'Kệ TM2', '2024-01-28'),
  ('kho-thuong-mai', 'TM004', 'Máy bơm mini', 'cái', 25, 750000, 850000, 5, 'Kệ TM3', '2024-02-06');

-- ==========================================
-- 5. SẢN PHẨM KHO PHÒNG THÍ NGHIỆM (3 sản phẩm)
-- ==========================================
INSERT INTO products (warehouse_id, code, name, unit, quantity, price_in, price_out, weight, location, import_date) VALUES
  ('kho-phong-thi-nghiem', 'TN001', 'Bộ test pH nước', 'bộ', 80, 150000, 180000, 0.3, 'Kệ TN1', '2024-01-14'),
  ('kho-phong-thi-nghiem', 'TN002', 'Hóa chất xử lý nước Chlorine', 'kg', 200, 50000, 65000, 1, 'Khu TN2', '2024-01-20'),
  ('kho-phong-thi-nghiem', 'TN003', 'Máy đo độ đục', 'cái', 10, 2500000, 3000000, 2, 'Kệ TN1', '2024-02-01');

-- ==========================================
-- 6. NHÂN VIÊN MẪU (5 nhân viên)
-- ==========================================
INSERT INTO employees (ho_ten, ngay_sinh, gioi_tinh, cccd, ngay_cap_cccd, noi_cap_cccd, ngay_thu_viec, ngay_chinh_thuc, ngay_het_hd, loai_hd, trinh_do, chuyen_nganh, truong_dao_tao, nam_tot_nghiep, dia_chi, username) VALUES
  ('Nguyễn Văn A', '1990-05-12', 'Nam', '079012345678', '2021-03-15', 'CA Long An', '2023-01-10', '2023-04-10', '2026-04-10', 'Chính thức', 'Đại học', 'Quản lý môi trường', 'ĐH Cần Thơ', '2014', 'Huyện Đức Hòa, Long An', 'kho'),
  ('Trần Thị B', '1992-08-22', 'Nữ', '079087654321', '2021-05-20', 'CA TP.HCM', '2022-06-01', '2022-09-01', '2026-09-01', 'Chính thức', 'Thạc sĩ', 'Kế toán tài chính', 'ĐH Kinh tế TP.HCM', '2016', 'Quận 7, TP.HCM', 'hr'),
  ('Lê Văn C', '1988-02-14', 'Nam', '079011223344', '2020-01-10', 'CA Long An', '2020-03-15', '2020-06-15', '2026-06-15', 'Chính thức', 'Đại học', 'Kế toán', 'ĐH Kinh tế TP.HCM', '2012', 'Châu Thành, Long An', 'ketoan'),
  ('Phạm Thị D', '1985-11-30', 'Nữ', '079055667788', '2019-07-22', 'CA Long An', '2018-01-10', '2018-04-10', '2026-04-15', 'Chính thức', 'Thạc sĩ', 'Quản trị kinh doanh', 'ĐH Kinh tế TP.HCM', '2010', 'TP. Tân An, Long An', 'truongphong'),
  ('Đặng Văn E', '1980-07-04', 'Nam', '079099887766', '2019-01-05', 'CA Long An', '2015-01-01', '2015-04-01', '2027-01-01', 'Chính thức', 'Tiến sĩ', 'Kỹ thuật môi trường', 'ĐH Bách Khoa TP.HCM', '2006', 'TP. Tân An, Long An', 'giamdoc');

-- ==========================================
-- 7. STORAGE POLICY (chạy riêng nếu cần)
-- ==========================================
-- Cho phép upload/đọc ảnh từ bucket 'images'
-- Bucket cần tạo thủ công trong Supabase Dashboard:
--   Storage → New Bucket → 'images' → Public: ON
