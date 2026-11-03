// ==========================================
// DATA ACCESS LAYER - Tầng truy cập dữ liệu
// ==========================================
// File này tập trung TẤT CẢ thao tác CRUD với Supabase.
// Các page component chỉ cần import và gọi hàm,
// KHÔNG trực tiếp gọi supabase.from() ở page.
//
// CÁC BẢNG:
//   - device_accounts: Tài khoản người dùng
//   - products: Sản phẩm trong kho
//   - devices: Thiết bị
//   - tasks: Công việc bảo trì thiết bị
//   - task_history_log: Lịch sử thao tác thiết bị / công việc
//
// STORAGE:
//   - Bucket 'images': Lưu ảnh sản phẩm + ảnh vị trí
// ==========================================

import { supabase } from './supabase'
import type { Account, Product, HistoryEntry, Device, Task } from './constants'

// ==========================================
// DEVICE_ACCOUNTS - Tài khoản
// ==========================================

/** Lấy tất cả tài khoản */
export async function getAccountsFromDB(): Promise<Account[]> {
  const { data, error } = await supabase
    .from('device_accounts')
    .select('*')
    .order('id', { ascending: true })
  if (error) { console.error('getDeviceAccounts error:', error); return [] }
  // Map snake_case từ DB sang camelCase cho frontend
  return (data || []).map(mapAccountFromDB)
}

/** Tìm tài khoản theo username + password (login) */
export async function getAccountByCredentials(username: string, password: string): Promise<Account | null> {
  const { data, error } = await supabase
    .from('device_accounts')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .eq('status', 'active')
    .single()
  if (error || !data) return null
  return mapAccountFromDB(data)
}

/** Tạo tài khoản mới */
export async function createAccount(account: Omit<Account, 'id'>): Promise<Account | null> {
  const { data, error } = await supabase
    .from('device_accounts')
    .insert(mapAccountToDB(account))
    .select()
    .single()
  if (error) { console.error('createAccount error:', error); return null }
  return mapAccountFromDB(data)
}

/** Cập nhật tài khoản */
export async function updateAccount(id: number, updates: Partial<Account>): Promise<boolean> {
  const dbUpdates: any = {}
  if (updates.username !== undefined) dbUpdates.username = updates.username
  if (updates.password !== undefined) dbUpdates.password = updates.password
  if (updates.name !== undefined) dbUpdates.name = updates.name
  if (updates.chucVu !== undefined) dbUpdates.chuc_vu = updates.chucVu
  if (updates.chucNang !== undefined) dbUpdates.chuc_nang = updates.chucNang
  if (updates.status !== undefined) dbUpdates.status = updates.status

  const { error } = await supabase
    .from('device_accounts')
    .update(dbUpdates)
    .eq('id', id)
  if (error) { console.error('updateAccount error:', error); return false }
  return true
}

/** Xóa tài khoản */
export async function deleteAccountFromDB(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('device_accounts')
    .delete()
    .eq('id', id)
  if (error) { console.error('deleteAccount error:', error); return false }
  return true
}

// ==========================================
// PRODUCTS - Sản phẩm trong kho
// ==========================================

/** Lấy sản phẩm theo kho (chỉ lấy chưa bị xóa) */
export async function getProductsByWarehouse(warehouseId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('warehouse_id', warehouseId)
    .eq('is_deleted', false)
    .order('name', { ascending: true })
  if (error) { console.error('getProducts error:', error); return [] }
  return (data || []).map(mapProductFromDB)
}

/** Lấy tất cả sản phẩm (cho tồn kho) */
export async function getAllProducts(): Promise<Record<string, Product[]>> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_deleted', false)
    .order('name', { ascending: true })
  if (error) { console.error('getAllProducts error:', error); return {} }

  // Gom theo warehouse_id
  const grouped: Record<string, Product[]> = {}
  for (const row of data || []) {
    const wid = row.warehouse_id
    if (!grouped[wid]) grouped[wid] = []
    grouped[wid].push(mapProductFromDB(row))
  }
  return grouped
}

/** Chuẩn hóa mã hàng để so sánh trùng (bỏ trắng thừa, đưa về chữ hoa) */
export function normalizeProductCode(code: string): string {
  return (code || '').trim().toUpperCase()
}

/** Tìm sản phẩm theo mã trong MỘT kho (bỏ qua bản ghi đã xóa mềm) */
export async function findProductByCodeInWarehouse(code: string, warehouseId: string): Promise<{ id: number } | null> {
  const normalized = normalizeProductCode(code)
  if (!normalized || !warehouseId) return null
  // ilike (không wildcard) = so sánh chính xác, không phân biệt hoa/thường
  const { data, error } = await supabase
    .from('products')
    .select('id')
    .eq('warehouse_id', warehouseId)
    .ilike('code', normalized)
    .eq('is_deleted', false)
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return { id: (data as any).id as number }
}

/** Tìm sản phẩm theo tên trong MỘT kho (bỏ qua bản ghi đã xóa mềm) */
export async function findProductByNameInWarehouse(name: string, warehouseId: string): Promise<{ id: number } | null> {
  const normalized = (name || '').trim()
  if (!normalized || !warehouseId) return null
  // ilike (không wildcard) = so sánh chính xác, không phân biệt hoa/thường
  const { data, error } = await supabase
    .from('products')
    .select('id')
    .eq('warehouse_id', warehouseId)
    .ilike('name', normalized)
    .eq('is_deleted', false)
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return { id: (data as any).id as number }
}

/** Tạo sản phẩm mới (nhập liệu) */
export async function createProduct(product: Omit<Product, 'id'> & { warehouseId: string }): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .insert({
      warehouse_id: product.warehouseId,
      code: product.code,
      name: product.name,
      category_name: product.categoryName,
      unit: product.unit,
      quantity: product.quantity,
      weight: product.weight,
      weight_unit: product.weightUnit || 'kg',
      location: product.location,
      location_image_url: product.locationImage || null,
      product_image_url: product.productImage || null,
      import_date: product.importDate || null,
    })
    .select()
    .single()
  if (error) { console.error('createProduct error:', error); return null }
  return mapProductFromDB(data)
}

/** Cập nhật sản phẩm */
export async function updateProduct(id: number, updates: Partial<Product>): Promise<boolean> {
  const dbUpdates: any = {}
  if (updates.code !== undefined) dbUpdates.code = updates.code
  if (updates.name !== undefined) dbUpdates.name = updates.name
  if (updates.categoryName !== undefined) dbUpdates.category_name = updates.categoryName
  if (updates.unit !== undefined) dbUpdates.unit = updates.unit
  if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity
  if (updates.weight !== undefined) dbUpdates.weight = updates.weight
  if (updates.weightUnit !== undefined) dbUpdates.weight_unit = updates.weightUnit
  if (updates.location !== undefined) dbUpdates.location = updates.location
  if (updates.locationImage !== undefined) dbUpdates.location_image_url = updates.locationImage
  if (updates.productImage !== undefined) dbUpdates.product_image_url = updates.productImage
  if (updates.importDate !== undefined) dbUpdates.import_date = updates.importDate

  const { error } = await supabase
    .from('products')
    .update(dbUpdates)
    .eq('id', id)
  if (error) { console.error('updateProduct error:', error); return false }
  return true
}

/** Xóa sản phẩm (soft delete) */
export async function deleteProduct(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('products')
    .update({ is_deleted: true })
    .eq('id', id)
  if (error) { console.error('deleteProduct error:', error); return false }
  return true
}

// ==========================================
// DEVICES - Thiết bị
// ==========================================

/** Chuẩn hóa mã thiết bị (bỏ trắng thừa, chữ hoa) */
function normalizeDeviceId(deviceId: string): string {
  return (deviceId || '').trim().toUpperCase()
}

/** Lấy tất cả thiết bị */
export async function getDevices(): Promise<Device[]> {
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .order('name', { ascending: true })
  if (error) { console.error('getDevices error:', error); return [] }
  return (data || []).map(mapDeviceFromDB)
}

/** Tìm thiết bị theo mã (không phân biệt hoa/thường) */
export async function findDeviceByDeviceId(deviceId: string): Promise<{ id: number } | null> {
  const normalized = normalizeDeviceId(deviceId)
  if (!normalized) return null
  // ilike không có wildcard = so sánh chính xác, không phân biệt hoa/thường.
  // Escape % _ \ để chúng không bị hiểu là ký tự đại diện.
  const { data, error } = await supabase
    .from('devices')
    .select('id')
    .ilike('device_id', normalized.replace(/[%_\\]/g, '\\$&'))
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return { id: (data as any).id as number }
}

/** Tạo thiết bị mới (created_at do DB tự sinh) */
export async function createDevice(device: Omit<Device, 'id' | 'createdAt'>): Promise<Device | null> {
  const { data, error } = await supabase
    .from('devices')
    .insert({
      device_id: normalizeDeviceId(device.deviceId),
      name: device.name.trim(),
      manufacturer: device.manufacturer.trim(),
      location: device.location.trim(),
    })
    .select()
    .single()
  if (error) { console.error('createDevice error:', error); return null }
  return mapDeviceFromDB(data)
}

/** Cập nhật thiết bị */
export async function updateDevice(id: number, updates: Partial<Device>): Promise<boolean> {
  const dbUpdates: any = {}
  if (updates.deviceId !== undefined) dbUpdates.device_id = normalizeDeviceId(updates.deviceId)
  if (updates.name !== undefined) dbUpdates.name = updates.name.trim()
  if (updates.manufacturer !== undefined) dbUpdates.manufacturer = updates.manufacturer.trim()
  if (updates.location !== undefined) dbUpdates.location = updates.location.trim()

  const { error } = await supabase
    .from('devices')
    .update(dbUpdates)
    .eq('id', id)
  if (error) { console.error('updateDevice error:', error); return false }
  return true
}

/** Xóa thiết bị (xóa cứng - bảng devices không có cột is_deleted) */
export async function deleteDevice(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('devices')
    .delete()
    .eq('id', id)
  if (error) { console.error('deleteDevice error:', error); return false }
  return true
}

// ==========================================
// TASKS - Công việc bảo trì thiết bị
// ==========================================

/** Lấy tất cả công việc (mới nhất trước) */
export async function getTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) { console.error('getTasks error:', error); return [] }
  return (data || []).map(mapTaskFromDB)
}

/** Tạo công việc mới (created_at/updated_at do DB tự sinh) */
export async function createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      device_id: task.deviceId,
      task_name: task.taskName.trim(),
      task_description: task.taskDescription.trim(),
      remaining_day: task.remainingDay,
      maintained_image_url: task.maintainedImageUrl,
      expired_at: task.expiredAt,
    })
    .select()
    .single()
  if (error) { console.error('createTask error:', error); return null }
  return mapTaskFromDB(data)
}

/** Cập nhật công việc (luôn cập nhật updated_at) */
export async function updateTask(id: number, updates: Partial<Task>): Promise<boolean> {
  const dbUpdates: any = { updated_at: new Date().toISOString() }
  if (updates.deviceId !== undefined) dbUpdates.device_id = updates.deviceId
  if (updates.taskName !== undefined) dbUpdates.task_name = updates.taskName.trim()
  if (updates.taskDescription !== undefined) dbUpdates.task_description = updates.taskDescription.trim()
  if (updates.remainingDay !== undefined) dbUpdates.remaining_day = updates.remainingDay
  if (updates.maintainedImageUrl !== undefined) dbUpdates.maintained_image_url = updates.maintainedImageUrl
  if (updates.expiredAt !== undefined) dbUpdates.expired_at = updates.expiredAt

  const { error } = await supabase
    .from('tasks')
    .update(dbUpdates)
    .eq('id', id)
  if (error) { console.error('updateTask error:', error); return false }
  return true
}

/** Xóa công việc (xóa cứng - bảng tasks không có cột is_deleted) */
export async function deleteTask(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
  if (error) { console.error('deleteTask error:', error); return false }
  return true
}

// ==========================================
// HISTORY LOG - Lịch sử thao tác thiết bị / công việc
// ==========================================

/** Lấy toàn bộ lịch sử */
export async function getHistoryLog(): Promise<HistoryEntry[]> {
  const { data, error } = await supabase
    .from('task_history_log')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) { console.error('getHistoryLog error:', error); return [] }
  return (data || []).map(mapHistoryFromDB)
}

// ==========================================
// IMAGE UPLOAD - Upload ảnh lên Supabase Storage
// ==========================================

/** Upload file ảnh, trả về public URL */
export async function uploadImage(file: File, folder: string = 'products'): Promise<string | null> {
  // Tạo tên file unique bằng timestamp
  const fileExt = file.name.split('.').pop()
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

  const { error } = await supabase.storage
    .from('images')
    .upload(fileName, file, { cacheControl: '3600', upsert: false })
  if (error) { console.error('uploadImage error:', error); return null }

  // Lấy public URL
  const { data } = supabase.storage.from('images').getPublicUrl(fileName)
  return data.publicUrl
}

/** Xóa ảnh từ Storage (dựa trên URL) */
export async function deleteImage(url: string): Promise<void> {
  if (!url || !url.includes('/storage/v1/object/public/images/')) return
  const path = url.split('/storage/v1/object/public/images/')[1]
  if (path) {
    await supabase.storage.from('images').remove([path])
  }
}

// ==========================================
// MAPPERS - Chuyển đổi snake_case ↔ camelCase
// ==========================================
// Supabase PostgreSQL dùng snake_case (chuc_vu)
// Frontend React dùng camelCase (chucVu)
// Các hàm map dưới đây chuyển đổi 2 chiều
// ==========================================

function mapAccountFromDB(row: any): Account {
  return {
    id: row.id,
    username: row.username,
    password: row.password,
    name: row.name,
    chucVu: row.chuc_vu || '',
    chucNang: row.chuc_nang || ['xem-co-ban'],
    status: row.status || 'active',
    createdAt: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : '',
    isAdmin: row.is_admin || false,
  }
}

function mapAccountToDB(acc: any): any {
  return {
    username: acc.username,
    password: acc.password,
    name: acc.name,
    chuc_vu: acc.chucVu || '',
    chuc_nang: acc.chucNang || ['xem-co-ban'],
    status: acc.status || 'active',
    is_admin: acc.isAdmin || false,
  }
}

function mapProductFromDB(row: any): Product {
  return {
    id: row.id,
    code: row.code || '',
    name: row.name || '',
    categoryName: row.category_name || '',
    unit: row.unit || '',
    quantity: row.quantity || 0,
    weight: parseFloat(row.weight) || 0,
    weightUnit: row.weight_unit || 'kg',
    location: row.location || '',
    locationImage: row.location_image_url || '',
    productImage: row.product_image_url || '',
    importDate: row.import_date || '',
  }
}

function mapDeviceFromDB(row: any): Device {
  return {
    id: row.id,
    deviceId: row.device_id || '',
    name: row.name || '',
    manufacturer: row.manufacturer || '',
    location: row.location || '',
    createdAt: row.created_at ? new Date(row.created_at).toLocaleDateString('vi-VN') : '',
  }
}

function mapTaskFromDB(row: any): Task {
  return {
    id: row.id,
    deviceId: row.device_id,
    taskName: row.task_name || '',
    taskDescription: row.task_description || '',
    remainingDay: row.remaining_day ?? 0,
    maintainedImageUrl: row.maintained_image_url || '',
    expiredAt: row.expired_at || '',
    createdAt: row.created_at ? new Date(row.created_at).toLocaleDateString('vi-VN') : '',
    updatedAt: row.updated_at ? new Date(row.updated_at).toLocaleDateString('vi-VN') : '',
  }
}

function mapHistoryFromDB(row: any): HistoryEntry {
  return {
    date: row.date || '',
    time: row.time || '',
    taskName: row.task_name || '',
    userName: row.user_name || '',
    action: row.action || '',
    details: row.details || '',
  }
}