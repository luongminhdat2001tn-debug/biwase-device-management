// ==========================================
// CONSTANTS - Hằng số dùng chung toàn hệ thống
// ==========================================
// File này chứa các giá trị cố định được sử dụng
// xuyên suốt ứng dụng: interface, danh sách chức năng,
// và các helper functions.
//
// LƯU Ý: Sau khi migrate sang Supabase, file này
// chỉ chứa TYPES + CONSTANTS, không còn localStorage.
// Tất cả CRUD operations đã chuyển sang lib/db.ts
// ==========================================

// ------------------------------------------
// DANH SÁCH CHỨC NĂNG (QUYỀN) TRONG HỆ THỐNG
// Mỗi tài khoản có thể có 1 hoặc nhiều chức năng
// ------------------------------------------
export const CHUC_NANG_LIST = [
  { id: 'xem-co-ban', name: 'Xem thông tin cơ bản', description: 'Xem tất cả thông tin, không thao tác' },
  { id: 'nhap-lieu', name: 'Nhập liệu', description: 'Có thể nhập hàng vào kho' },
  { id: 'xuat-kho', name: 'Xuất kho', description: 'Có thể xuất hàng ra khỏi kho' },
  { id: 'ton-kho', name: 'Tồn kho', description: 'Có thể chỉnh sửa thông tin sản phẩm tồn kho' },
  { id: 'them-tai-khoan', name: 'Thêm tài khoản', description: 'Có thể thêm/sửa/xóa tài khoản' },
  { id: 'kho-vat-tu', name: 'Kho Vật Tư Nhà Máy', description: 'Có quyền truy cập kho vật tư của nhà máy' },
  { id: 'kho-xay-dung', name: 'Kho Xây Dựng Cơ Bản', description: 'Có quyền truy cập kho xây dựng cơ bản' },
  { id: 'kho-phong-thi-nghiem', name: 'Kho Phòng Thí Nghiệm', description: 'Có quyền truy cập kho phòng thí nghiệm' },
  { id: 'kho-thuong-mai', name: 'Kho Thương Mại', description: 'Có quyền truy cập kho thương mại' },
]

// ------------------------------------------
// DANH SÁCH CÁC KHO
// ------------------------------------------
export const WAREHOUSES = [
  { id: 'kho-vat-tu', name: 'Kho Vật Tư', icon: '🔧', color: 'bg-blue-500' },
  { id: 'kho-xay-dung', name: 'Kho Xây Dựng', icon: '🏗️', color: 'bg-orange-500' },
  { id: 'kho-thuong-mai', name: 'Kho Thương Mại', icon: '🛒', color: 'bg-green-500' },
  { id: 'kho-phong-thi-nghiem', name: 'Kho Phòng Thí Nghiệm', icon: '🔬', color: 'bg-purple-500' },
]

// ------------------------------------------
// INTERFACE TÀI KHOẢN
// ------------------------------------------
export interface Account {
  id: number
  username: string
  password: string
  name: string
  chucVu: string
  chucNang: string[]    // Mảng các quyền (cho phép multi-select checkbox)
  status: 'active' | 'inactive'
  createdAt: string
  isAdmin?: boolean     // Đánh dấu tài khoản admin (không thể xóa)
}

// ------------------------------------------
// INTERFACE SẢN PHẨM TRONG KHO
// ------------------------------------------
export interface Product {
  id: number
  code: string
  name: string
  categoryName: string   // Danh mục hàng (bắt buộc)
  unit: string
  quantity: number
  weight: number
  weightUnit?: string     // Đơn vị trọng lượng (kg, g, lít, ml, chai...)
  location: string
  locationImage: string   // URL ảnh vị trí (Supabase Storage)
  productImage: string    // URL ảnh sản phẩm (Supabase Storage)
  importDate: string
}

// ------------------------------------------
// INTERFACE LỊCH SỬ KHO
// ------------------------------------------
export interface HistoryEntry {
  date: string
  time: string
  warehouse: string
  productCode: string
  productName: string
  userName: string
  action: string            // 'Nhập liệu' | 'Xuất kho' | 'Tồn kho'
  quantity: number
  details: string           // Chi tiết thao tác
}

// ------------------------------------------
// HELPER: Lấy tên chức năng từ ID
// ------------------------------------------
export function getChucNangName(id: string): string {
  return CHUC_NANG_LIST.find(c => c.id === id)?.name || id
}

// ------------------------------------------
// HELPER: Kiểm tra quyền từ session user (localStorage)
// Dùng cho client-side permission check nhanh
// ------------------------------------------
export function hasPermissionFromSession(permission: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    const userData = localStorage.getItem('user')
    if (!userData) return false
    const user = JSON.parse(userData)
    const chucNang = Array.isArray(user.chucNang) ? user.chucNang : [user.chucNang || '']
    return chucNang.includes(permission)
  } catch {
    return false
  }
}

// ------------------------------------------
// HELPER: Kiểm tra quyền truy cập kho (ID kho = ID quyền kho)
// Admin luôn thấy tất cả kho; tài khoản thường cần ID kho trong chucNang
// ------------------------------------------
export function canAccessWarehouse(user: { isAdmin?: boolean; chucNang?: string[] | string } | null | undefined, warehouseId: string): boolean {
  if (!user) return false
  if (user.isAdmin) return true
  const chucNang = Array.isArray(user.chucNang) ? user.chucNang : [user.chucNang || '']
  return chucNang.includes(warehouseId)
}

// ------------------------------------------
// HELPER: Danh sách ID kho mà user được phép truy cập
// (theo thứ tự tab trong trang warehouse; Admin = tất cả)
// ------------------------------------------
export function getAccessibleWarehouseIds(user: { isAdmin?: boolean; chucNang?: string[] | string } | null | undefined): string[] {
  const warehouseIds = ['kho-vat-tu', 'kho-xay-dung', 'kho-phong-thi-nghiem', 'kho-thuong-mai']
  return warehouseIds.filter((id) => canAccessWarehouse(user, id))
}
