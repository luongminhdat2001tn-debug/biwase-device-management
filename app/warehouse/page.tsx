'use client'

import { useEffect, useRef, useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Package, Plus, Edit2, Trash2, Search, X, Save, Warehouse, Factory, ShoppingBag, Building, Upload, LogIn, LogOut, FlaskConical, RefreshCw } from 'lucide-react'
import { type Product, canAccessWarehouse } from '@/lib/constants'
import { getProductsByWarehouse, createProduct, updateProduct, deleteProduct, addHistoryEntry, uploadImage, findProductByCodeInWarehouse, normalizeProductCode, findProductByNameInWarehouse } from '@/lib/db'

const WAREHOUSES = [
  { id: 'kho-vat-tu', name: 'Kho Vật Tư Nhà Máy', icon: Factory, color: 'blue' },
  { id: 'kho-xay-dung', name: 'Kho Xây Dựng Cơ Bản', icon: Building, color: 'orange' },
  { id: 'kho-phong-thi-nghiem', name: 'Kho Phòng Thí Nghiệm', icon: FlaskConical, color: 'purple' },
  { id: 'kho-thuong-mai', name: 'Kho Thương Mại', icon: ShoppingBag, color: 'green' },
]

export default function WarehousePage() {
  const [user, setUser] = useState<any>(null)
  const [selectedWarehouse, setSelectedWarehouse] = useState('kho-vat-tu')
  const [searchTerm, setSearchTerm] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  // modalType: 'import' = nhập liệu mới, 'export' = xuất kho, 'addmore' = nhập kho số lượng
  const [modalType, setModalType] = useState<'import' | 'export' | 'addmore'>('import')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [exportCodeInput, setExportCodeInput] = useState('')
  const [foundProduct, setFoundProduct] = useState<Product | null>(null)
  const [exportQuantity, setExportQuantity] = useState(0)
  // Lý do xuất kho (bắt buộc) + lỗi đỏ inline cho số lượng / lý do
  const [exportReason, setExportReason] = useState('')
  const [exportQuantityError, setExportQuantityError] = useState('')
  const [exportReasonError, setExportReasonError] = useState('')
  // isSaving: chặn bấm nút nhiều lần
  const [isSaving, setIsSaving] = useState(false)

  // Trạng thái form nhập liệu mới
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    categoryName: '',
    unit: '',
    quantity: '' as any,
    weight: '' as any,
    weightUnit: 'kg',
    location: '',
    locationImage: '',
    productImage: '',
    importDate: new Date().toISOString().split('T')[0],
  })

  // Lỗi đỏ cho các trường bắt buộc trong form Nhập liệu
  // (hiện sau khi bấm Lưu, tự xóa từng ô khi user sửa lại)
  const [formErrors, setFormErrors] = useState<{
    code?: string; name?: string; categoryName?: string; unit?: string; quantity?: string
    weight?: string; weightUnit?: string; location?: string; importDate?: string
  }>({})

  // Checkbox "Chưa rõ": khối lượng chưa xác định -> 0 kg và khóa 2 ô nhập
  const [weightUnknown, setWeightUnknown] = useState(false)

  // Checkbox "Có danh mục": tick -> Danh mục bắt buộc; bỏ tick -> lưu chuỗi rỗng
  const [hasCategory, setHasCategory] = useState(false)

  // Xóa lỗi đỏ của 1 ô khi user bắt đầu sửa
  const clearFieldError = (field: keyof typeof formErrors) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  // Tick "Chưa rõ" -> khối lượng 0 kg và khóa 2 ô nhập (bỏ lỗi đỏ của 2 ô này)
  const handleToggleWeightUnknown = (checked: boolean) => {
    setWeightUnknown(checked)
    setFormData({ ...formData, weight: checked ? 0 : '' as any, weightUnit: checked ? 'Chưa rõ' : 'kg' })
    setFormErrors((prev) => {
      if (!prev.weight && !prev.weightUnit) return prev
      const next = { ...prev }
      delete next.weight
      delete next.weightUnit
      return next
    })
  }

  // Tick "Có danh mục" -> mở ô nhập + bắt buộc; bỏ tick -> xóa trắng, khóa ô, bỏ bắt buộc
  const handleToggleHasCategory = (checked: boolean) => {
    setHasCategory(checked)
    if (checked) return
    setFormData({ ...formData, categoryName: '' })
    clearFieldError('categoryName')
  }

  // Kiểm tra 8 trường bắt buộc, trả về object lỗi (rỗng = hợp lệ)
  const validateForm = () => {
    const errors: typeof formErrors = {}
    if (!String(formData.code || '').trim()) errors.code = 'Vui lòng nhập mã hàng'
    if (!String(formData.name || '').trim()) errors.name = 'Vui lòng nhập tên hàng'
    if (hasCategory && !String(formData.categoryName || '').trim()) errors.categoryName = 'Vui lòng nhập danh mục'
    if (!String(formData.unit || '').trim()) errors.unit = 'Vui lòng nhập đơn vị tính'
    if (formData.quantity === '' || formData.quantity === null || formData.quantity === undefined || Number(formData.quantity) <= 0) errors.quantity = 'Vui lòng nhập số lượng lớn hơn 0'
    if (!weightUnknown) {
      if (formData.weight === '' || formData.weight === null || formData.weight === undefined || Number(formData.weight) <= 0) errors.weight = 'Vui lòng nhập khối lượng lớn hơn 0'
      if (!String(formData.weightUnit || '').trim()) errors.weightUnit = 'Vui lòng nhập đơn vị khối lượng'
    }
    if (!String(formData.location || '').trim()) errors.location = 'Vui lòng nhập vị trí'
    if (!String(formData.importDate || '').trim()) errors.importDate = 'Vui lòng chọn ngày nhập liệu'
    return errors
  }

  // Trạng thái nhập kho số lượng
  const [addMoreCodeInput, setAddMoreCodeInput] = useState('')
  const [addMoreProduct, setAddMoreProduct] = useState<Product | null>(null)
  const [addMoreQuantity, setAddMoreQuantity] = useState(0)

  // File refs cho upload ảnh
  const [productImageFile, setProductImageFile] = useState<File | null>(null)
  const [locationImageFile, setLocationImageFile] = useState<File | null>(null)

  // ------------------------------------------
  // Trạng thái trùng mã trong kho HIỆN TẠI
  // (Mã hàng chỉ cần duy nhất trong cùng kho,
  // khác kho được phép trùng mã)
  // ------------------------------------------
  const [duplicateCode, setDuplicateCode] = useState(false)
  const [checkingCode, setCheckingCode] = useState(false)
  // Giữ mã mới nhất để bỏ kết quả cũ khi user gõ nhanh (tránh race)
  const latestCodeRef = useRef('')

  // Query DB kiểm tra mã đã tồn tại trong kho hiện tại chưa
  const checkDuplicateCodeInWarehouse = async (code: string) => {
    const normalized = normalizeProductCode(code)
    if (!normalized) { setDuplicateCode(false); return false }
    const requestKey = `${selectedWarehouse}||${normalized}`
    latestCodeRef.current = requestKey
    setCheckingCode(true)
    try {
      const found = await findProductByCodeInWarehouse(normalized, selectedWarehouse)
      // Chỉ nhận kết quả nếu user chưa gõ mã/kho khác trong lúc chờ
      if (latestCodeRef.current !== requestKey) return duplicateCode
      const isDup = !!found
      setDuplicateCode(isDup)
      return isDup
    } finally {
      setCheckingCode(false)
    }
  }

  // Live-check khi user gõ mã hàng (debounce 400ms để đỡ spam DB)
  // (chỉ dùng khi THÊM MỚI — sửa sản phẩm dùng modal riêng bên dưới)
  useEffect(() => {
    if (!isModalOpen || modalType !== 'import') return
    const code = formData.code
    if (!normalizeProductCode(code)) { setDuplicateCode(false); return }
    const t = setTimeout(() => { checkDuplicateCodeInWarehouse(code) }, 400)
    return () => clearTimeout(t)
  }, [formData.code, selectedWarehouse, isModalOpen, modalType])

  // ------------------------------------------
  // Trạng thái trùng tên trong kho HIỆN TẠI
  // (Tên hàng chỉ cần duy nhất trong cùng kho,
  // khác kho được phép trùng tên)
  // ------------------------------------------
  const [duplicateName, setDuplicateName] = useState(false)
  const [checkingName, setCheckingName] = useState(false)
  // Giữ tên mới nhất để bỏ kết quả cũ khi user gõ nhanh (tránh race)
  const latestNameRef = useRef('')

  // Query DB kiểm tra tên đã tồn tại trong kho hiện tại chưa
  const checkDuplicateName = async (name: string) => {
    const normalized = (name || '').trim()
    if (!normalized) { setDuplicateName(false); return false }
    const requestKey = `${selectedWarehouse}||${normalized.toLowerCase()}`
    latestNameRef.current = requestKey
    setCheckingName(true)
    try {
      const found = await findProductByNameInWarehouse(normalized, selectedWarehouse)
      // Chỉ nhận kết quả nếu user chưa gõ tên/kho khác trong lúc chờ
      if (latestNameRef.current !== requestKey) return duplicateName
      const isDup = !!found
      setDuplicateName(isDup)
      return isDup
    } finally {
      setCheckingName(false)
    }
  }

  // Live-check khi user gõ tên hàng (debounce 400ms để đỡ spam DB)
  useEffect(() => {
    if (!isModalOpen || modalType !== 'import') return
    const name = formData.name
    if (!(name || '').trim()) { setDuplicateName(false); return }
    const t = setTimeout(() => { checkDuplicateName(name) }, 400)
    return () => clearTimeout(t)
  }, [formData.name, selectedWarehouse, isModalOpen, modalType])

  // ------------------------------------------
  // Modal SỬA SẢN PHẨM TỒN KHO (di chuyển từ trang Tồn Kho)
  // - Không cho sửa số lượng
  // - 7 trường bắt buộc: mã, tên, đơn vị, khối lượng, đơn vị khối lượng, vị trí, ngày nhập
  // - Check trùng mã toàn hệ thống + trùng tên trong kho hiện tại
  // - editingProduct tái sử dụng state dòng trên (modal nhập liệu sẽ chỉ để thêm mới)
  // ------------------------------------------
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editFormData, setEditFormData] = useState({
    code: '', name: '', categoryName: '', unit: '', quantity: 0, weight: 0, weightUnit: 'kg', location: '', locationImage: '', productImage: '', importDate: ''
  })
  const [editProductImageFile, setEditProductImageFile] = useState<File | null>(null)
  const [editLocationImageFile, setEditLocationImageFile] = useState<File | null>(null)
  const [isEditSaving, setIsEditSaving] = useState(false)

  // Lỗi đỏ cho 7 trường bắt buộc trong form Sửa tồn kho
  // (hiện sau khi bấm Cập Nhật, tự xóa từng ô khi user sửa lại)
  const [editFormErrors, setEditFormErrors] = useState<{
    code?: string; name?: string; categoryName?: string; unit?: string
    weight?: string; weightUnit?: string; location?: string; importDate?: string
  }>({})

  // Checkbox "Chưa rõ" cho form Sửa (khối lượng 0 kg = chưa xác định)
  const [editWeightUnknown, setEditWeightUnknown] = useState(false)

  // Checkbox "Có danh mục" cho form Sửa
  const [editHasCategory, setEditHasCategory] = useState(false)

  // Xóa lỗi đỏ của 1 ô khi user bắt đầu sửa
  const clearEditFieldError = (field: keyof typeof editFormErrors) => {
    setEditFormErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  // Tick "Chưa rõ" -> khối lượng 0 kg và khóa 2 ô nhập (form Sửa)
  const handleToggleEditWeightUnknown = (checked: boolean) => {
    setEditWeightUnknown(checked)
    setEditFormData({ ...editFormData, weight: checked ? 0 : '' as any, weightUnit: checked ? 'Chưa rõ' : 'kg' })
    setEditFormErrors((prev) => {
      if (!prev.weight && !prev.weightUnit) return prev
      const next = { ...prev }
      delete next.weight
      delete next.weightUnit
      return next
    })
  }

  // Tick "Có danh mục" -> mở ô nhập + bắt buộc (form Sửa)
  const handleToggleEditHasCategory = (checked: boolean) => {
    setEditHasCategory(checked)
    if (checked) return
    setEditFormData({ ...editFormData, categoryName: '' })
    clearEditFieldError('categoryName')
  }

  // Kiểm tra 7 trường bắt buộc, trả về object lỗi (rỗng = hợp lệ)
  const validateEditForm = () => {
    const errors: typeof editFormErrors = {}
    if (!String(editFormData.code || '').trim()) errors.code = 'Vui lòng nhập mã hàng'
    if (!String(editFormData.name || '').trim()) errors.name = 'Vui lòng nhập tên hàng'
    if (editHasCategory && !String(editFormData.categoryName || '').trim()) errors.categoryName = 'Vui lòng nhập danh mục'
    if (!String(editFormData.unit || '').trim()) errors.unit = 'Vui lòng nhập đơn vị tính'
    if (!editWeightUnknown) {
      if (!editFormData.weight || Number(editFormData.weight) <= 0) errors.weight = 'Vui lòng nhập khối lượng lớn hơn 0'
      if (!String(editFormData.weightUnit || '').trim()) errors.weightUnit = 'Vui lòng nhập đơn vị khối lượng'
    }
    if (!String(editFormData.location || '').trim()) errors.location = 'Vui lòng nhập vị trí'
    if (!String(editFormData.importDate || '').trim()) errors.importDate = 'Vui lòng chọn ngày nhập liệu'
    return errors
  }

  // Trạng thái trùng mã + trùng tên trong kho hiện tại
  // khi sửa sản phẩm tồn kho. Giữ nguyên giá trị gốc thì cho qua,
  // đổi sang giá trị mới phải chưa tồn tại (trừ chính nó).
  const [editDuplicateCode, setEditDuplicateCode] = useState(false)
  const [editCheckingCode, setEditCheckingCode] = useState(false)
  const editLatestCodeRef = useRef('')
  const [editDuplicateName, setEditDuplicateName] = useState(false)
  const [editCheckingName, setEditCheckingName] = useState(false)
  const editLatestNameRef = useRef('')

  // Kiểm tra mã trùng trong kho hiện tại (bỏ qua chính SP đang sửa)
  const checkEditDuplicateCode = async (code: string) => {
    if (!editingProduct) { setEditDuplicateCode(false); return false }
    const normalized = normalizeProductCode(code)
    if (!normalized) { setEditDuplicateCode(false); return false }
    if (normalized === normalizeProductCode(editingProduct.code)) { setEditDuplicateCode(false); return false }
    const requestKey = `${selectedWarehouse}||${normalized}`
    editLatestCodeRef.current = requestKey
    setEditCheckingCode(true)
    try {
      const found = await findProductByCodeInWarehouse(normalized, selectedWarehouse)
      if (editLatestCodeRef.current !== requestKey) return editDuplicateCode
      const isDup = !!found && found.id !== editingProduct.id
      setEditDuplicateCode(isDup)
      return isDup
    } finally {
      setEditCheckingCode(false)
    }
  }

  // Kiểm tra tên trùng trong kho hiện tại (bỏ qua chính SP đang sửa)
  const checkEditDuplicateName = async (name: string) => {
    if (!editingProduct) { setEditDuplicateName(false); return false }
    const normalized = (name || '').trim()
    if (!normalized) { setEditDuplicateName(false); return false }
    if (normalized.toLowerCase() === (editingProduct.name || '').trim().toLowerCase()) { setEditDuplicateName(false); return false }
    const requestKey = `${selectedWarehouse}||${normalized.toLowerCase()}`
    editLatestNameRef.current = requestKey
    setEditCheckingName(true)
    try {
      const found = await findProductByNameInWarehouse(normalized, selectedWarehouse)
      if (editLatestNameRef.current !== requestKey) return editDuplicateName
      const isDup = !!found && found.id !== editingProduct.id
      setEditDuplicateName(isDup)
      return isDup
    } finally {
      setEditCheckingName(false)
    }
  }

  // Live-check khi sửa mã hàng (debounce 400ms)
  useEffect(() => {
    if (!isEditModalOpen || !editingProduct) return
    const code = editFormData.code
    if (!normalizeProductCode(code) || normalizeProductCode(code) === normalizeProductCode(editingProduct.code)) { setEditDuplicateCode(false); return }
    const t = setTimeout(() => { checkEditDuplicateCode(code) }, 400)
    return () => clearTimeout(t)
  }, [editFormData.code, selectedWarehouse, isEditModalOpen, editingProduct])

  // Live-check khi sửa tên hàng (debounce 400ms)
  useEffect(() => {
    if (!isEditModalOpen || !editingProduct) return
    const name = editFormData.name
    if (!(name || '').trim() || (name || '').trim().toLowerCase() === (editingProduct.name || '').trim().toLowerCase()) { setEditDuplicateName(false); return }
    const t = setTimeout(() => { checkEditDuplicateName(name) }, 400)
    return () => clearTimeout(t)
  }, [editFormData.name, selectedWarehouse, isEditModalOpen, editingProduct])

  // Load products từ Supabase khi chọn kho
  const loadProducts = async (warehouseId: string) => {
    setLoading(true)
    const data = await getProductsByWarehouse(warehouseId)
    setProducts(data)
    setLoading(false)
  }

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) { window.location.href = '/'; return }
    const parsed = JSON.parse(userData)
    setUser(parsed)
    // Kho mặc định = kho đầu tiên user được phép truy cập (theo thứ tự tab)
    const firstAccessible = WAREHOUSES.find(w => canAccessWarehouse(parsed, w.id))?.id || ''
    setSelectedWarehouse(firstAccessible)
    if (firstAccessible) loadProducts(firstAccessible)
  }, [])

  // Fallback: nếu kho đang chọn không còn được phép (đổi quyền giữa phiên),
  // chuyển về kho đầu tiên được phép
  useEffect(() => {
    if (!user) return
    if (!canAccessWarehouse(user, selectedWarehouse)) {
      const firstAccessible = WAREHOUSES.find(w => canAccessWarehouse(user, w.id))?.id || ''
      setSelectedWarehouse(firstAccessible)
    }
  }, [user])

  // Reload khi đổi kho (bỏ qua khi chưa có kho nào được phép)
  useEffect(() => {
    if (user && selectedWarehouse) loadProducts(selectedWarehouse)
  }, [selectedWarehouse])

  const filteredItems = products.filter(
    (item: Product) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const currentWarehouse = WAREHOUSES.find(w => w.id === selectedWarehouse)
  // Chỉ hiện tab của các kho user được phép truy cập (admin = tất cả)
  const visibleWarehouses = user
    ? WAREHOUSES.filter(w => canAccessWarehouse(user, w.id))
    : WAREHOUSES

  // ------------------------------------------
  // Mở modal Nhập liệu mới
  // ------------------------------------------
  const handleImport = () => {
    setModalType('import')
    setDuplicateCode(false)
    setDuplicateName(false)
    setIsSaving(false)
    setFormErrors({})
    setWeightUnknown(false)
    setHasCategory(false)
    setFormData({ code: '', name: '', categoryName: '', unit: '', quantity: '', weight: '', weightUnit: 'kg', location: '', locationImage: '', productImage: '', importDate: new Date().toISOString().split('T')[0] })
    setProductImageFile(null)
    setLocationImageFile(null)
    setIsModalOpen(true)
  }

  // ------------------------------------------
  // Mở modal Xuất kho
  // ------------------------------------------
  const handleExport = () => {
    setModalType('export')
    setExportCodeInput('')
    setFoundProduct(null)
    setExportQuantity(0)
    setExportReason('')
    setExportQuantityError('')
    setExportReasonError('')
    setIsModalOpen(true)
  }

  // ------------------------------------------
  // Mở modal Nhập Kho (cộng dồn số lượng cho SP đã có)
  // ------------------------------------------
  const handleAddMore = () => {
    setModalType('addmore')
    setAddMoreCodeInput('')
    setAddMoreProduct(null)
    setAddMoreQuantity(0)
    setIsModalOpen(true)
  }

  // Tìm sản phẩm khi nhập mã xuất kho
  const handleSearchExportCode = (code: string) => {
    const upperCode = code.toUpperCase()
    setExportCodeInput(upperCode)
    const product = products.find(p => p.code === upperCode)
    if (product) {
      setFoundProduct(product)
      setExportQuantity(0)
    } else {
      setFoundProduct(null)
      setExportQuantity(0)
    }
    // Đổi mã hàng = reset lý do + lỗi đỏ (tránh giữ lỗi của SP cũ)
    setExportReason('')
    setExportQuantityError('')
    setExportReasonError('')
  }

  // Tìm sản phẩm khi nhập mã để nhập kho
  const handleSearchAddMoreCode = (code: string) => {
    const upperCode = code.toUpperCase()
    setAddMoreCodeInput(upperCode)
    const product = products.find(p => p.code === upperCode)
    if (product) {
      setAddMoreProduct(product)
      setAddMoreQuantity(0)
    } else {
      setAddMoreProduct(null)
      setAddMoreQuantity(0)
    }
  }

  // Xác nhận xuất kho
  const handleConfirmExport = async () => {
    if (!foundProduct) { alert('Không tìm thấy sản phẩm!'); return }
    // Số lượng xuất: bắt buộc, > 0, không vượt tồn (lỗi đỏ inline, không alert)
    if (!exportQuantity || exportQuantity <= 0) { setExportQuantityError('Vui lòng nhập số lượng xuất lớn hơn 0!'); return }
    if (exportQuantity > foundProduct.quantity) {
      setExportQuantityError(`Số lượng tồn kho không đủ! Hiện có: ${foundProduct.quantity} ${foundProduct.unit}`)
      return
    }
    // Lý do xuất kho: bắt buộc (trống hoặc chỉ trắng = lỗi đỏ inline)
    if (!exportReason.trim()) { setExportReasonError('Vui lòng nhập lý do xuất kho!'); return }
    setIsSaving(true)
    await updateProduct(foundProduct.id, { quantity: foundProduct.quantity - exportQuantity })
    await addHistoryEntry({
      date: new Date().toLocaleDateString('vi-VN'),
      time: new Date().toLocaleTimeString('vi-VN'),
      warehouse: currentWarehouse?.name || '',
      productCode: foundProduct.code,
      productName: foundProduct.name,
      userName: user?.name || user?.username || '',
      action: 'Xuất kho',
      quantity: exportQuantity,
      details: `Xuất ${exportQuantity} ${foundProduct.unit} — Lý do: ${exportReason.trim()}`,
    })
    alert(`Đã xuất ${exportQuantity} ${foundProduct.unit} ${foundProduct.name}`)
    setIsModalOpen(false)
    setIsSaving(false)
    await loadProducts(selectedWarehouse)
  }

  // Xác nhận nhập kho số lượng
  const handleConfirmAddMore = async () => {
    if (!addMoreProduct) { alert('Không tìm thấy sản phẩm!'); return }
    if (addMoreQuantity <= 0) { alert('Số lượng nhập kho phải lớn hơn 0!'); return }
    setIsSaving(true)
    const newQty = addMoreProduct.quantity + addMoreQuantity
    await updateProduct(addMoreProduct.id, { quantity: newQty })
    await addHistoryEntry({
      date: new Date().toLocaleDateString('vi-VN'),
      time: new Date().toLocaleTimeString('vi-VN'),
      warehouse: currentWarehouse?.name || '',
      productCode: addMoreProduct.code,
      productName: addMoreProduct.name,
      userName: user?.name || user?.username || '',
      action: 'Nhập liệu',
      quantity: addMoreQuantity,
      details: `Nhập kho ${addMoreQuantity} ${addMoreProduct.unit} (tồn trước: ${addMoreProduct.quantity}, tồn sau: ${newQty})`,
    })
    alert(`Đã nhập kho ${addMoreQuantity} ${addMoreProduct.unit} vào ${addMoreProduct.name}. Tồn kho mới: ${newQty}`)
    setIsModalOpen(false)
    setIsSaving(false)
    await loadProducts(selectedWarehouse)
  }

  // Sửa sản phẩm (modal SỬA SẢN PHẨM TỒN KHO — không cho sửa số lượng)
  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    // Khối lượng <= 0 coi là "chưa rõ" -> tick sẵn checkbox, chuẩn hóa 0 kg
    const unknown = !(Number(product.weight) > 0)
    setEditWeightUnknown(unknown)
    // Danh mục đã có sẵn -> tick sẵn để không xóa mất dữ liệu khi lưu
    setEditHasCategory(!!(product.categoryName || '').trim())
    setEditFormData({
      code: product.code,
      name: product.name,
      categoryName: product.categoryName,
      unit: product.unit,
      quantity: product.quantity,
      weight: unknown ? 0 : product.weight,
      weightUnit: unknown ? 'Chưa rõ' : (product.weightUnit || 'kg'),
      location: product.location,
      locationImage: product.locationImage,
      productImage: product.productImage || '',
      importDate: product.importDate,
    })
    setEditProductImageFile(null)
    setEditLocationImageFile(null)
    setEditDuplicateCode(false)
    setEditDuplicateName(false)
    setEditCheckingCode(false)
    setEditCheckingName(false)
    editLatestCodeRef.current = ''
    editLatestNameRef.current = ''
    setEditFormErrors({})
    setIsEditModalOpen(true)
  }

  // Lưu chỉnh sửa từ modal Sửa Sản Phẩm Tồn Kho (giữ nguyên số lượng)
  const handleSaveEdit = async () => {
    if (!editingProduct) return
    setIsEditSaving(true)

    // Kiểm tra 7 trường bắt buộc trước -> hiện cảnh báo đỏ từng ô, chặn lưu
    const errors = validateEditForm()
    if (Object.keys(errors).length > 0) {
      setEditFormErrors(errors)
      setIsEditSaving(false)
      return
    }
    setEditFormErrors({})

    // Chặn trùng mã + trùng tên trong cùng kho
    // (giữ nguyên giá trị gốc thì cho qua, đổi sang giá trị đã tồn tại thì chặn)
    const codeDup = await checkEditDuplicateCode(editFormData.code)
    if (codeDup) {
      alert('Mã hàng này đã tồn tại trong kho này. Vui lòng kiểm tra lại')
      setIsEditSaving(false)
      return
    }
    const nameDup = await checkEditDuplicateName(editFormData.name)
    if (nameDup) {
      alert('Tên hàng này đã tồn tại. Vui lòng kiểm tra lại!')
      setIsEditSaving(false)
      return
    }

    // Upload ảnh mới nếu có
    let productImageUrl = editFormData.productImage
    let locationImageUrl = editFormData.locationImage

    if (editProductImageFile) {
      const url = await uploadImage(editProductImageFile, 'products')
      if (url) productImageUrl = url
    }
    if (editLocationImageFile) {
      const url = await uploadImage(editLocationImageFile, 'locations')
      if (url) locationImageUrl = url
    }

    // Ghi lại chi tiết thay đổi
    const changes: string[] = []
    const old = products.find(p => p.id === editingProduct.id)
    if (old) {
      if (old.weight !== editFormData.weight || (old.weightUnit || 'kg') !== editFormData.weightUnit) changes.push(`Khối lượng: ${old.weight} - ${old.weightUnit || 'kg'} → ${editFormData.weight} - ${editFormData.weightUnit}`)
      if (old.name !== editFormData.name) changes.push(`Tên: ${old.name} → ${editFormData.name}`)
      if (old.categoryName !== editFormData.categoryName) changes.push(`Danh mục: ${old.categoryName || '(trống)'} → ${editFormData.categoryName || '(trống)'}`)
      if (old.location !== editFormData.location) changes.push(`Vị trí: ${old.location} → ${editFormData.location}`)
      if (old.locationImage !== locationImageUrl) changes.push('Ảnh vị trí: đã cập nhật')
      if ((old.productImage || '') !== productImageUrl) changes.push('Ảnh sản phẩm: đã cập nhật')
    }

    // Cập nhật DB (giữ nguyên quantity)
    const ok = await updateProduct(editingProduct.id, {
      ...editFormData,
      productImage: productImageUrl,
      locationImage: locationImageUrl,
      quantity: editingProduct.quantity, // Giữ nguyên số lượng
    })

    if (!ok) {
      alert('❌ Cập nhật thất bại! Vui lòng thử lại.')
      setIsEditSaving(false)
      return
    }

    // Log lịch sử
    await addHistoryEntry({
      date: new Date().toLocaleDateString('vi-VN'),
      time: new Date().toLocaleTimeString('vi-VN'),
      warehouse: currentWarehouse?.name || '',
      productCode: editFormData.code,
      productName: editFormData.name,
      userName: user?.name || user?.username || '',
      action: 'Tồn kho',
      quantity: editFormData.quantity,
      details: changes.length > 0 ? changes.join(', ') : 'Không có thay đổi',
    })

    setIsEditSaving(false)
    await loadProducts(selectedWarehouse)
    setIsEditModalOpen(false)
    alert('✅ Cập nhật sản phẩm thành công!')
  }

  // Xóa sản phẩm (soft delete) + ghi lịch sử
  const handleDeleteProduct = async (product: Product) => {
    if (confirm(`Bạn có chắc chắn muốn xóa "${product.name}" khỏi tồn kho?`)) {
      await deleteProduct(product.id)
      await addHistoryEntry({
        date: new Date().toLocaleDateString('vi-VN'),
        time: new Date().toLocaleTimeString('vi-VN'),
        warehouse: currentWarehouse?.name || '',
        productCode: product.code,
        productName: product.name,
        userName: user?.name || user?.username || '',
        action: 'Xóa sản phẩm',
        quantity: product.quantity,
        details: `Xóa ${product.quantity} ${product.unit}`,
      })
      await loadProducts(selectedWarehouse)
    }
  }

  // Lưu sản phẩm (thêm mới hoặc cập nhật)
  const handleSave = async () => {
    // Kiểm tra 8 trường bắt buộc -> hiện cảnh báo đỏ từng ô, chặn lưu
    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }
    setFormErrors({})
    // Chặn trùng mã trong cùng kho (modal này chỉ để thêm mới;
    // sửa sản phẩm dùng modal "Sửa Sản Phẩm Tồn Kho" riêng)
    const dup = await checkDuplicateCodeInWarehouse(formData.code)
    if (dup) {
      alert('Mã hàng này đã tồn tại trong kho này. Vui lòng kiểm tra lại')
      return
    }
    // Chặn trùng tên trong cùng kho
    const nameDup = await checkDuplicateName(formData.name)
    if (nameDup) {
      alert('Tên hàng này đã tồn tại. Vui lòng kiểm tra lại!')
      return
    }

    setIsSaving(true)

    // Upload ảnh nếu có file mới
    let productImageUrl = formData.productImage
    let locationImageUrl = formData.locationImage

    if (productImageFile) {
      const url = await uploadImage(productImageFile, 'products')
      if (url) productImageUrl = url
    }
    if (locationImageFile) {
      const url = await uploadImage(locationImageFile, 'locations')
      if (url) locationImageUrl = url
    }

    // Thêm sản phẩm mới
    await createProduct({
      ...formData,
      productImage: productImageUrl,
      locationImage: locationImageUrl,
      warehouseId: selectedWarehouse,
    })

    // Log lịch sử nhập liệu
    await addHistoryEntry({
      date: new Date().toLocaleDateString('vi-VN'),
      time: new Date().toLocaleTimeString('vi-VN'),
      warehouse: currentWarehouse?.name || '',
      productCode: formData.code,
      productName: formData.name,
      userName: user?.name || user?.username || '',
      action: 'Nhập liệu',
      quantity: Number(formData.quantity) || 0,
      details: `Nhập ${formData.quantity} ${formData.unit}`,
    })
    setIsSaving(false)
    setIsModalOpen(false)
    await loadProducts(selectedWarehouse)
  }

  // Xử lý upload ảnh sản phẩm (modal SỬA SẢN PHẨM TỒN KHO)
  const handleEditProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setEditProductImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setEditFormData({ ...editFormData, productImage: reader.result as string })
      reader.readAsDataURL(file)
    }
  }

  // Xử lý upload ảnh vị trí (modal SỬA SẢN PHẨM TỒN KHO)
  const handleEditLocationImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setEditLocationImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setEditFormData({ ...editFormData, locationImage: reader.result as string })
      reader.readAsDataURL(file)
    }
  }

  // Xử lý upload ảnh vị trí
  const handleLocationImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLocationImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => { setFormData({ ...formData, locationImage: reader.result as string }) }
      reader.readAsDataURL(file)
    }
  }

  // Xử lý upload ảnh sản phẩm
  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProductImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => { setFormData({ ...formData, productImage: reader.result as string }) }
      reader.readAsDataURL(file)
    }
  }

  if (!user) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  const canImport = user?.isAdmin || (Array.isArray(user?.chucNang) ? user.chucNang : []).includes('nhap-lieu')
  const canExport = user?.isAdmin || (Array.isArray(user?.chucNang) ? user.chucNang : []).includes('xuat-kho')

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Quản Lý Kho</h1>
          </div>

          {/* Warehouse Tabs (chỉ kho được phép) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {visibleWarehouses.map((warehouse) => {
              const Icon = warehouse.icon
              const isSelected = selectedWarehouse === warehouse.id
              const colorClasses = {
                blue: isSelected ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-blue-600 border-blue-200 hover:border-blue-400',
                orange: isSelected ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-orange-500 border-orange-200 hover:border-orange-400',
                purple: isSelected ? 'bg-purple-600 text-white border-purple-700' : 'bg-white text-purple-600 border-purple-200 hover:border-purple-400',
                green: isSelected ? 'bg-green-600 text-white border-green-700' : 'bg-white text-green-600 border-green-200 hover:border-green-400',
              }
              return (
                <button
                  key={warehouse.id}
                  onClick={() => setSelectedWarehouse(warehouse.id)}
                  className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${colorClasses[warehouse.color as keyof typeof colorClasses]}`}
                >
                  <Icon className="w-8 h-8" />
                  <div className="text-left">
                    <p className="font-semibold">{warehouse.name}</p>
                    <p className={`text-sm ${isSelected ? 'opacity-80' : 'opacity-60'}`}>
                      {warehouse.id === selectedWarehouse ? products.length : '—'} sản phẩm
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Product Table (hoặc thông báo khi không có quyền kho nào) */}
          {visibleWarehouses.length === 0 ? (
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-8 text-center">
                <Warehouse className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-600 font-medium">Bạn không có quyền truy cập kho nào. Vui lòng liên hệ quản trị viên.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className={`border-l-4 ${currentWarehouse?.color === 'blue' ? 'border-l-blue-600' :
              currentWarehouse?.color === 'orange' ? 'border-l-orange-500' :
                currentWarehouse?.color === 'purple' ? 'border-l-purple-600' : 'border-l-green-600'
              }`}>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className={`flex items-center gap-2 ${currentWarehouse?.color === 'blue' ? 'text-blue-600' :
                    currentWarehouse?.color === 'orange' ? 'text-orange-500' :
                      currentWarehouse?.color === 'purple' ? 'text-purple-600' : 'text-green-600'
                    }`}>
                    {currentWarehouse && <currentWarehouse.icon className="w-5 h-5" />}
                    {currentWarehouse?.name}
                  </CardTitle>
                  <div className="flex gap-2 flex-wrap">
                    {canImport && (
                      <Button onClick={handleImport} className="bg-green-600 text-white hover:bg-green-700">
                        <LogIn className="h-4 w-4 mr-2" />
                        Nhập Liệu
                      </Button>
                    )}
                    {canImport && (
                      <Button onClick={handleAddMore} className="bg-blue-600 text-white hover:bg-blue-700">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Nhập Kho
                      </Button>
                    )}
                    {canExport && (
                      <Button onClick={handleExport} className="bg-orange-500 text-white hover:bg-orange-600">
                        <LogOut className="h-4 w-4 mr-2" />
                        Xuất Kho
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Tìm kiếm theo mã hàng hoặc tên hàng..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-2 border-gray-200"
                  />
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Mã Hàng</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Tên Hàng</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">ĐVT</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Số Lượng</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Khối Lượng</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Vị Trí</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Có Hình Ảnh</th>
                        {canImport && <th className="text-center py-3 px-4 font-semibold text-gray-700">Thao tác</th>}
                        {canImport && <th className="text-center py-3 px-4 font-semibold text-gray-700">Xóa</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={canImport ? 9 : 7} className="text-center py-8 text-gray-500">Đang tải...</td></tr>
                      ) : filteredItems.length === 0 ? (
                        <tr>
                          <td colSpan={canImport ? 9 : 7} className="text-center py-8 text-gray-500">
                            Không có sản phẩm nào
                          </td>
                        </tr>
                      ) : (
                        filteredItems.map((item) => (
                          <tr key={item.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <span className="font-mono font-medium text-blue-600">{item.code}</span>
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-medium text-gray-800">{item.name}</p>
                            </td>
                            <td className="py-3 px-4 text-gray-600">{item.unit}</td>
                            <td className="py-3 px-4 text-right font-medium text-gray-800">
                              {item.quantity.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right text-gray-600">
                              {item.weight} - {item.weightUnit || 'kg'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">{item.location}</span>
                                {item.locationImage && (
                                  <img src={item.locationImage} alt="Vị trí" className="w-8 h-8 object-cover rounded" />
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Checkbox checked={!!item.productImage} disabled />
                            </td>
                            {canImport && (
                              <td className="py-3 px-4 text-center">
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(item)} className="h-8 w-8 p-0 hover:bg-blue-100 text-blue-600" title="Sửa"><Edit2 className="h-4 w-4" /></Button>
                              </td>
                            )}
                            {canImport && (
                              <td className="py-3 px-4 text-center">
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteProduct(item)} className="h-8 w-8 p-0 hover:bg-red-100 text-red-600" title="Xóa"><Trash2 className="h-4 w-4" /></Button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ============================================================ */}
          {/* MODAL - Nhập Liệu (chỉ thêm mới; sửa dùng modal riêng)        */}
          {/* ============================================================ */}
          {isModalOpen && modalType === 'import' && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">
                    Nhập Liệu
                  </h2>
                  <button onClick={() => { setIsModalOpen(false); setFormErrors({}) }} className="p-1 hover:bg-gray-100 rounded">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">Danh mục {hasCategory && '*'}</label>
                      <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                        <Checkbox checked={hasCategory} onCheckedChange={(v) => handleToggleHasCategory(!!v)} />
                        Có danh mục
                      </label>
                    </div>
                    <Input
                      value={formData.categoryName}
                      onChange={(e) => { setFormData({ ...formData, categoryName: e.target.value }); clearFieldError('categoryName') }}
                      disabled={!hasCategory}
                      className={`border-2 ${formErrors.categoryName ? 'border-red-500 bg-red-50 focus:ring-red-400' : ''} ${!hasCategory ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    />
                    {formErrors.categoryName && (
                      <p className="text-red-600 text-xs mt-1 font-medium">⚠️ {formErrors.categoryName}</p>
                    )}
                  </div>

                  {/* Mã hàng - có cảnh báo trùng + cảnh báo đỏ thiếu bắt buộc */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mã hàng *</label>
                    <Input
                      value={formData.code}
                      onChange={(e) => { setFormData({ ...formData, code: e.target.value.toUpperCase() }); clearFieldError('code') }}
                      className={`border-2 ${duplicateCode || formErrors.code ? 'border-red-500 bg-red-50 focus:ring-red-400' : ''}`}
                    />
                    {formErrors.code && (
                      <p className="text-red-600 text-xs mt-1 font-medium">⚠️ {formErrors.code}</p>
                    )}
                    {checkingCode && !duplicateCode && (
                      <p className="text-gray-500 text-xs mt-1">Đang kiểm tra mã hàng...</p>
                    )}
                    {duplicateCode && (
                      <p className="text-red-600 text-xs mt-1 font-medium">⚠️ Mã hàng này đã tồn tại trong kho này. Vui lòng kiểm tra lại</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên hàng *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => { setFormData({ ...formData, name: e.target.value }); clearFieldError('name') }}
                      className={`border-2 ${duplicateName || formErrors.name ? 'border-red-500 bg-red-50 focus:ring-red-400' : ''}`}
                    />
                    {formErrors.name && (
                      <p className="text-red-600 text-xs mt-1 font-medium">⚠️ {formErrors.name}</p>
                    )}
                    {checkingName && !duplicateName && (
                      <p className="text-gray-500 text-xs mt-1">Đang kiểm tra tên hàng...</p>
                    )}
                    {duplicateName && (
                      <p className="text-red-600 text-xs mt-1 font-medium">⚠️ Tên hàng này đã tồn tại. Vui lòng kiểm tra lại!</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị tính *</label>
                    <Input
                      value={formData.unit}
                      onChange={(e) => { setFormData({ ...formData, unit: e.target.value }); clearFieldError('unit') }}
                      className={`border-2 ${formErrors.unit ? 'border-red-500 bg-red-50 focus:ring-red-400' : ''}`}
                    />
                    {formErrors.unit && (
                      <p className="text-red-600 text-xs mt-1 font-medium">⚠️ {formErrors.unit}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng *</label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={formData.quantity || ''}
                      onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setFormData({ ...formData, quantity: v ? parseInt(v) : '' as any }); clearFieldError('quantity') }}
                      className={`border-2 ${formErrors.quantity ? 'border-red-500 bg-red-50 focus:ring-red-400' : ''}`}
                    />
                    {formErrors.quantity && (
                      <p className="text-red-600 text-xs mt-1 font-medium">⚠️ {formErrors.quantity}</p>
                    )}
                  </div>

                  {/* Khối lượng + Đơn vị - 2 ô cạnh nhau */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">Khối lượng *</label>
                      <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                        <Checkbox checked={weightUnknown} onCheckedChange={(v) => handleToggleWeightUnknown(!!v)} />
                        Chưa rõ
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={formData.weight || ''}
                        onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, ''); setFormData({ ...formData, weight: v ? parseFloat(v) : '' as any }); clearFieldError('weight') }}
                        disabled={weightUnknown}
                        className={`border-2 flex-1 ${formErrors.weight ? 'border-red-500 bg-red-50 focus:ring-red-400' : ''} ${weightUnknown ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        placeholder="Nhập số lượng"
                      />
                      <Input
                        type="text"
                        value={formData.weightUnit}
                        onChange={(e) => { setFormData({ ...formData, weightUnit: e.target.value }); clearFieldError('weightUnit') }}
                        disabled={weightUnknown}
                        className={`border-2 w-28 ${formErrors.weightUnit ? 'border-red-500 bg-red-50 focus:ring-red-400' : ''} ${weightUnknown ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        placeholder="Đơn vị"
                      />
                    </div>
                    {formErrors.weight && (
                      <p className="text-red-600 text-xs mt-1 font-medium">⚠️ {formErrors.weight}</p>
                    )}
                    {formErrors.weightUnit && (
                      <p className="text-red-600 text-xs mt-1 font-medium">⚠️ {formErrors.weightUnit}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">VD: kg, g, lít, ml, chai, lon, bao...</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vị trí *</label>
                    <Input
                      value={formData.location}
                      onChange={(e) => { setFormData({ ...formData, location: e.target.value }); clearFieldError('location') }}
                      className={`border-2 ${formErrors.location ? 'border-red-500 bg-red-50 focus:ring-red-400' : ''}`}
                    />
                    {formErrors.location && (
                      <p className="text-red-600 text-xs mt-1 font-medium">⚠️ {formErrors.location}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày nhập liệu *</label>
                    <Input
                      type="date"
                      value={formData.importDate}
                      onChange={(e) => { setFormData({ ...formData, importDate: e.target.value }); clearFieldError('importDate') }}
                      className={`border-2 ${formErrors.importDate ? 'border-red-500 bg-red-50 focus:ring-red-400' : ''}`}
                    />
                    {formErrors.importDate && (
                      <p className="text-red-600 text-xs mt-1 font-medium">⚠️ {formErrors.importDate}</p>
                    )}
                  </div>

                  {/* Ảnh sản phẩm */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">📷 Ảnh sản phẩm</label>
                    <div className="flex gap-4 items-start">
                      <div className="flex-1">
                        <label className="flex items-center gap-2 px-4 py-3 bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                          <Upload className="w-5 h-5 text-blue-500" />
                          <span className="text-sm text-blue-600">Upload ảnh sản phẩm</span>
                          <input type="file" accept="image/*" onChange={handleProductImageUpload} className="hidden" />
                        </label>
                      </div>
                      {formData.productImage && (
                        <div className="relative">
                          <img src={formData.productImage} alt="Ảnh sản phẩm" className="w-24 h-24 object-cover rounded-lg border-2 border-blue-200" />
                          <button
                            onClick={() => setFormData({ ...formData, productImage: '' })}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ảnh vị trí kho */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">📍 Ảnh vị trí</label>
                    <div className="flex gap-4 items-start">
                      <div className="flex-1">
                        <label className="flex items-center gap-2 px-4 py-3 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors">
                          <Upload className="w-5 h-5 text-gray-500" />
                          <span className="text-sm text-gray-600">Upload ảnh vị trí</span>
                          <input type="file" accept="image/*" onChange={handleLocationImageUpload} className="hidden" />
                        </label>
                      </div>
                      {formData.locationImage && (
                        <div className="relative">
                          <img src={formData.locationImage} alt="Ảnh vị trí" className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200" />
                          <button
                            onClick={() => setFormData({ ...formData, locationImage: '' })}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" onClick={() => { setIsModalOpen(false); setFormErrors({}) }} className="flex-1">
                      Hủy
                    </Button>
                    <Button
                      onClick={handleSave}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={isSaving || checkingCode || duplicateCode || checkingName || duplicateName}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? 'Đang lưu...' : 'Nhập Liệu'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* MODAL - SỬA SẢN PHẨM TỒN KHO (SỐ LƯỢNG KHÔNG CHO SỬA)         */}
          {/* ============================================================ */}
          {isEditModalOpen && editingProduct && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Sửa Sản Phẩm Tồn Kho</h2>
                  <button onClick={() => setIsEditModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-700">
                  ⚠️ Lưu ý: Số lượng tồn kho KHÔNG được phép thay đổi tại đây.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">Danh mục {editHasCategory && '*'}</label>
                      <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                        <Checkbox checked={editHasCategory} onCheckedChange={(v) => handleToggleEditHasCategory(!!v)} />
                        Có danh mục
                      </label>
                    </div>
                    <Input value={editFormData.categoryName} onChange={(e) => { setEditFormData({ ...editFormData, categoryName: e.target.value }); clearEditFieldError('categoryName') }} disabled={!editHasCategory} className={`border-2 ${editFormErrors.categoryName ? 'border-red-500 bg-red-50' : ''} ${!editHasCategory ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
                    {editFormErrors.categoryName && (<p className="text-red-600 text-xs mt-1 font-medium">⚠️ {editFormErrors.categoryName}</p>)}
                  </div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Mã hàng *</label><Input value={editFormData.code} onChange={(e) => { setEditFormData({ ...editFormData, code: e.target.value }); clearEditFieldError('code') }} className={`border-2 ${editDuplicateCode || editFormErrors.code ? 'border-red-500 bg-red-50' : ''}`} />{editCheckingCode && !editDuplicateCode && !editFormErrors.code && (<p className="text-gray-500 text-xs mt-1">Đang kiểm tra...</p>)}{editDuplicateCode && (<p className="text-red-600 text-xs mt-1 font-medium">⚠️ Mã hàng này đã tồn tại trong kho này. Vui lòng kiểm tra lại</p>)}{editFormErrors.code && (<p className="text-red-600 text-xs mt-1 font-medium">⚠️ {editFormErrors.code}</p>)}</div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Tên hàng *</label><Input value={editFormData.name} onChange={(e) => { setEditFormData({ ...editFormData, name: e.target.value }); clearEditFieldError('name') }} className={`border-2 ${editDuplicateName || editFormErrors.name ? 'border-red-500 bg-red-50' : ''}`} />{editCheckingName && !editDuplicateName && !editFormErrors.name && (<p className="text-gray-500 text-xs mt-1">Đang kiểm tra...</p>)}{editDuplicateName && (<p className="text-red-600 text-xs mt-1 font-medium">⚠️ Tên hàng này đã tồn tại trong kho này. Vui lòng kiểm tra lại</p>)}{editFormErrors.name && (<p className="text-red-600 text-xs mt-1 font-medium">⚠️ {editFormErrors.name}</p>)}</div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị tính *</label><Input value={editFormData.unit} onChange={(e) => { setEditFormData({ ...editFormData, unit: e.target.value }); clearEditFieldError('unit') }} className={`border-2 ${editFormErrors.unit ? 'border-red-500 bg-red-50' : ''}`} />{editFormErrors.unit && (<p className="text-red-600 text-xs mt-1 font-medium">⚠️ {editFormErrors.unit}</p>)}</div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Số lượng (không thể sửa)</label><Input type="number" value={editFormData.quantity} className="border-2 bg-gray-100 cursor-not-allowed" disabled /></div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">Khối lượng *</label>
                      <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                        <Checkbox checked={editWeightUnknown} onCheckedChange={(v) => handleToggleEditWeightUnknown(!!v)} />
                        Chưa rõ
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <Input type="number" step="0.1" value={editFormData.weight} onChange={(e) => { setEditFormData({ ...editFormData, weight: Number(e.target.value) }); clearEditFieldError('weight') }} disabled={editWeightUnknown} className={`border-2 flex-1 ${editFormErrors.weight ? 'border-red-500 bg-red-50' : ''} ${editWeightUnknown ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
                      <Input type="text" value={editFormData.weightUnit} onChange={(e) => { setEditFormData({ ...editFormData, weightUnit: e.target.value }); clearEditFieldError('weightUnit') }} disabled={editWeightUnknown} className={`border-2 w-24 ${editFormErrors.weightUnit ? 'border-red-500 bg-red-50' : ''} ${editWeightUnknown ? 'bg-gray-100 cursor-not-allowed' : ''}`} placeholder="Đơn vị" />
                    </div>
                    {editFormErrors.weight && (<p className="text-red-600 text-xs mt-1 font-medium">⚠️ {editFormErrors.weight}</p>)}
                    {editFormErrors.weightUnit && (<p className="text-red-600 text-xs mt-1 font-medium">⚠️ {editFormErrors.weightUnit}</p>)}
                    <p className="text-xs text-gray-400 mt-1">VD: kg, g, lít, ml, chai...</p>
                  </div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Vị trí *</label><Input value={editFormData.location} onChange={(e) => { setEditFormData({ ...editFormData, location: e.target.value }); clearEditFieldError('location') }} className={`border-2 ${editFormErrors.location ? 'border-red-500 bg-red-50' : ''}`} />{editFormErrors.location && (<p className="text-red-600 text-xs mt-1 font-medium">⚠️ {editFormErrors.location}</p>)}</div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Ngày nhập liệu *</label><Input type="date" value={editFormData.importDate} onChange={(e) => { setEditFormData({ ...editFormData, importDate: e.target.value }); clearEditFieldError('importDate') }} className={`border-2 ${editFormErrors.importDate ? 'border-red-500 bg-red-50' : ''}`} />{editFormErrors.importDate && (<p className="text-red-600 text-xs mt-1 font-medium">⚠️ {editFormErrors.importDate}</p>)}</div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">📷 Ảnh sản phẩm</label>
                    <div className="flex gap-4 items-start">
                      <label className="flex items-center gap-2 px-4 py-3 bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors flex-1">
                        <Upload className="w-5 h-5 text-blue-500" /><span className="text-sm text-blue-600">Upload ảnh SP</span>
                        <input type="file" accept="image/*" onChange={handleEditProductImageUpload} className="hidden" />
                      </label>
                      {editFormData.productImage && (
                        <div className="relative">
                          <img src={editFormData.productImage} alt="Ảnh SP" className="w-24 h-24 object-cover rounded-lg border-2 border-blue-200" />
                          <button onClick={() => setEditFormData({ ...editFormData, productImage: '' })} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"><X className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">📍 Ảnh vị trí</label>
                    <div className="flex gap-4 items-start">
                      <label className="flex items-center gap-2 px-4 py-3 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors flex-1">
                        <Upload className="w-5 h-5 text-gray-500" /><span className="text-sm text-gray-600">Upload ảnh vị trí</span>
                        <input type="file" accept="image/*" onChange={handleEditLocationImageUpload} className="hidden" />
                      </label>
                      {editFormData.locationImage && (
                        <div className="relative">
                          <img src={editFormData.locationImage} alt="Ảnh vị trí" className="w-24 h-24 object-cover rounded-lg border-2" />
                          <button onClick={() => setEditFormData({ ...editFormData, locationImage: '' })} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"><X className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="flex-1">Hủy</Button>
                  <Button onClick={handleSaveEdit} className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={isEditSaving || editCheckingCode || editCheckingName || editDuplicateCode || editDuplicateName}>
                    <Save className="w-4 h-4 mr-2" /> {isEditSaving ? 'Đang cập nhật...' : 'Cập Nhật'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* MODAL - Xuất Kho                                              */}
          {/* ============================================================ */}
          {isModalOpen && modalType === 'export' && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-5xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Xuất Kho</h2>
                  <button onClick={() => { setIsModalOpen(false); setExportQuantityError(''); setExportReasonError('') }} className="p-1 hover:bg-gray-100 rounded">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nhập mã hàng cần xuất</label>
                    <Input
                      value={exportCodeInput}
                      onChange={(e) => handleSearchExportCode(e.target.value)}
                      placeholder="Nhập mã hàng (VD: VT001)"
                      className="border-2 text-xl font-bold tracking-wider"
                      style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
                      autoFocus
                    />
                  </div>

                  {exportCodeInput && !foundProduct && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                      <p className="text-red-600 font-medium">❌ Không tìm thấy sản phẩm có mã "{exportCodeInput}"</p>
                    </div>
                  )}

                  {foundProduct && (
                    <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
                      <p className="text-green-600 font-medium mb-4">✓ Tìm thấy sản phẩm</p>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-lg p-4 border-2">
                          <h3 className="font-bold text-blue-600 mb-3 text-lg border-b pb-2">THÔNG TIN SẢN PHẨM</h3>
                          <div className="space-y-2 text-sm">
                            {[
                              ['Mã hàng', foundProduct.code],
                              ['Tên hàng', foundProduct.name],
                              ['Đơn vị tính', foundProduct.unit],
                              ['Tồn kho', `${foundProduct.quantity.toLocaleString()} ${foundProduct.unit}`],
                              ['Khối lượng', `${foundProduct.weight} - ${foundProduct.weightUnit}`],
                              ['Vị trí', foundProduct.location],
                            ].map(([l, v]) => (
                              <div key={l} className="flex justify-between">
                                <span className="text-gray-500">{l}:</span>
                                <span className="font-medium">{v}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-4 border-2 border-orange-200">
                          <h3 className="font-bold text-orange-600 mb-3 text-lg border-b pb-2">THÔNG TIN XUẤT KHO</h3>
                          {foundProduct.locationImage && (
                            <div className="mb-4">
                              <img src={foundProduct.locationImage} alt={foundProduct.name} className="w-full h-48 object-cover rounded-lg border-2" />
                            </div>
                          )}
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Số lượng xuất * (Tồn: {foundProduct.quantity} {foundProduct.unit})
                              </label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={exportQuantity || ''}
                                onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setExportQuantity(v ? parseInt(v) : 0); if (exportQuantityError) setExportQuantityError('') }}
                                className={`border-2 text-lg ${exportQuantityError ? 'border-red-500 bg-red-50 focus:ring-red-400' : ''}`}
                              />
                              {exportQuantityError && (
                                <p className="text-red-600 text-xs mt-1 font-medium">⚠️ {exportQuantityError}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Lý do *
                              </label>
                              <Textarea
                                value={exportReason}
                                onChange={(e) => { setExportReason(e.target.value); if (exportReasonError) setExportReasonError('') }}
                                placeholder="Nhập lý do xuất kho..."
                                className={`border-2 ${exportReasonError ? 'border-red-500 bg-red-50 focus:ring-red-400' : ''}`}
                              />
                              {exportReasonError && (
                                <p className="text-red-600 text-xs mt-1 font-medium">⚠️ {exportReasonError}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-3">
                        <Button variant="outline" onClick={() => { setIsModalOpen(false); setExportQuantityError(''); setExportReasonError('') }} className="flex-1">Hủy</Button>
                        <Button onClick={handleConfirmExport} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" disabled={isSaving}>
                          <LogOut className="w-4 h-4 mr-2" />
                          {isSaving ? 'Đang xử lý...' : 'Xác Nhận Xuất Kho'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* MODAL - Nhập Kho Số Lượng (cho SP đã có sẵn trong kho)      */}
          {/* ============================================================ */}
          {isModalOpen && modalType === 'addmore' && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Nhập Kho Số Lượng</h2>
                  <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tìm sản phẩm theo mã hàng</label>
                    <Input
                      value={addMoreCodeInput}
                      onChange={(e) => handleSearchAddMoreCode(e.target.value)}
                      placeholder="Nhập mã hàng đã có trong kho"
                      className="border-2 text-lg font-bold tracking-wider"
                      style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
                      autoFocus
                    />
                  </div>

                  {addMoreCodeInput && !addMoreProduct && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                      <p className="text-red-600 font-medium">❌ Không tìm thấy sản phẩm có mã "{addMoreCodeInput}" trong kho này</p>
                    </div>
                  )}

                  {addMoreProduct && (
                    <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                      <p className="text-blue-600 font-medium mb-3">✓ Tìm thấy: <span className="font-bold">{addMoreProduct.name}</span></p>
                      <div className="bg-white rounded-lg p-3 mb-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Mã hàng:</span>
                          <span className="font-mono font-bold text-blue-600">{addMoreProduct.code}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Đơn vị tính:</span>
                          <span>{addMoreProduct.unit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Tồn kho hiện tại:</span>
                          <span className="font-bold text-green-600">{addMoreProduct.quantity.toLocaleString()} {addMoreProduct.unit}</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Số lượng nhập kho *
                        </label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={addMoreQuantity || ''}
                          onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setAddMoreQuantity(v ? parseInt(v) : 0) }}
                          className="border-2 text-lg"
                        />
                      </div>

                      {addMoreQuantity > 0 && (
                        <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-700">Tồn kho sau khi nhập:</span>
                            <span className="text-xl font-bold text-green-600">
                              {(addMoreProduct.quantity + addMoreQuantity).toLocaleString()} {addMoreProduct.unit}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex gap-3">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">Hủy</Button>
                        <Button onClick={handleConfirmAddMore} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={isSaving}>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          {isSaving ? 'Đang xử lý...' : 'Xác Nhận Nhập Kho'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
