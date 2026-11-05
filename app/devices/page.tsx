'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { HardDrive, Plus, Edit2, Trash2, Search, X, Save, AlertCircle } from 'lucide-react'
import type { Device } from '@/lib/constants'
import { getDevices, findDeviceByDeviceId, createDevice, updateDevice, deleteDevice, addHistoryEntry } from '@/lib/db'

export default function DevicesPage() {
  const [user, setUser] = useState<any>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDevice, setEditingDevice] = useState<Device | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form dùng chung cho thêm mới và sửa
  const [formData, setFormData] = useState({ deviceId: '', name: '', manufacturer: '', location: '' })
  // Lỗi đỏ từng ô (hiện sau khi bấm Lưu, tự xóa khi user sửa lại)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof typeof formData, string>>>({})

  const loadDevices = async () => {
    setLoading(true)
    setDevices(await getDevices())
    setLoading(false)
  }

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) { window.location.href = '/'; return }
    setUser(JSON.parse(userData))
    loadDevices()
  }, [])

  // Quyền xem/thêm/sửa/xóa: admin hoặc có chức năng 'quan-ly-thiet-bi'
  const perms = Array.isArray(user?.chucNang) ? user.chucNang : [user?.chucNang || '']
  const canManage = !!user && (user.isAdmin || perms.includes('quan-ly-thiet-bi'))

  const keyword = searchTerm.trim().toLowerCase()
  const filteredDevices = devices.filter(
    (d) => d.deviceId.toLowerCase().includes(keyword) || d.name.toLowerCase().includes(keyword)
  )

  // Xóa lỗi đỏ của 1 ô khi user bắt đầu sửa
  const clearFieldError = (field: keyof typeof formData) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const handleAdd = () => {
    setEditingDevice(null)
    setFormData({ deviceId: '', name: '', manufacturer: '', location: '' })
    setFormErrors({})
    setIsSaving(false)
    setIsModalOpen(true)
  }

  const handleEdit = (device: Device) => {
    setEditingDevice(device)
    setFormData({
      deviceId: device.deviceId,
      name: device.name,
      manufacturer: device.manufacturer,
      location: device.location,
    })
    setFormErrors({})
    setIsSaving(false)
    setIsModalOpen(true)
  }

  // Kiểm tra 4 trường bắt buộc, trả về object lỗi (rỗng = hợp lệ)
  const validate = () => {
    const errors: typeof formErrors = {}
    if (!formData.deviceId.trim()) errors.deviceId = 'Vui lòng nhập mã thiết bị'
    if (!formData.name.trim()) errors.name = 'Vui lòng nhập tên thiết bị'
    if (!formData.manufacturer.trim()) errors.manufacturer = 'Vui lòng nhập nhà sản xuất'
    if (!formData.location.trim()) errors.location = 'Vui lòng nhập vị trí'
    return errors
  }

  const handleSave = async () => {
    // Chặn bấm Lưu nhiều lần trong lúc đang kiểm tra/ghi DB (tránh tạo trùng mã)
    if (isSaving) return
    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }
    setFormErrors({})
    setIsSaving(true)

    try {
      // Mã thiết bị không được trùng (bỏ qua chính thiết bị đang sửa)
      const normalized = formData.deviceId.trim().toUpperCase()
      const existing = await findDeviceByDeviceId(normalized)
      if (existing && existing.id !== editingDevice?.id) {
        alert('Mã thiết bị này đã tồn tại. Vui lòng kiểm tra lại')
        return
      }

      const values = {
        deviceId: normalized,
        name: formData.name.trim(),
        manufacturer: formData.manufacturer.trim(),
        location: formData.location.trim(),
      }
      const ok = editingDevice ? await updateDevice(editingDevice.id, values) : !!(await createDevice(values))
      if (!ok) {
        alert('❌ Lưu thất bại! Vui lòng thử lại.')
        return
      }
      // Ghi lịch sử (lỗi log không chặn thao tác chính)
      await addHistoryEntry({
        taskName: values.name,
        userName: user?.name || user?.username || '',
        action: 'Thiết bị',
        details: `${editingDevice ? 'Cập nhật' : 'Thêm'} thiết bị ${values.deviceId}`,
      })
      await loadDevices()
      setIsModalOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  // Xóa cứng thiết bị (bảng devices không có cột is_deleted)
  const handleDelete = async (device: Device) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa "${device.name}"?\n\nLưu ý: Xóa thiết bị này, các mục công việc liên quan cũng sẽ bị xóa ở trang Quản Lý Thiết Bị`)) return
    if (!(await deleteDevice(device.id))) {
      alert('❌ Xóa thất bại! Vui lòng thử lại.')
      return
    }
    // Ghi lịch sử (lỗi log không chặn thao tác chính)
    await addHistoryEntry({
      taskName: device.name,
      userName: user?.name || user?.username || '',
      action: 'Thiết bị',
      details: `Xóa thiết bị ${device.deviceId}`,
    })
    await loadDevices()
  }

  // Ô nhập dùng chung cho 4 trường trong modal
  const renderField = (key: keyof typeof formData, label: string) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label} *</label>
      <Input
        value={formData[key]}
        onChange={(e) => {
          setFormData({ ...formData, [key]: key === 'deviceId' ? e.target.value.toUpperCase() : e.target.value })
          clearFieldError(key)
        }}
        className={`border-2 ${formErrors[key] ? 'border-red-500 bg-red-50 focus:ring-red-400' : ''}`}
      />
      {formErrors[key] && (
        <p className="text-red-600 text-xs mt-1 font-medium">⚠️ {formErrors[key]}</p>
      )}
    </div>
  )

  if (!user) return <div className="flex items-center justify-center h-screen">Loading...</div>

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Quản Lý Thiết Bị</h1>
          </div>

          {!canManage ? (
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-600 font-medium">
                  Bạn không có quyền truy cập trang này. Vui lòng liên hệ quản trị viên.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-l-4 border-l-blue-600">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="flex items-center gap-2 text-blue-600">
                    <HardDrive className="w-5 h-5" /> Danh Sách Thiết Bị
                  </CardTitle>
                  <Button onClick={handleAdd} className="bg-blue-600 text-white hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" /> Thêm Thiết Bị
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Tìm kiếm theo mã hoặc tên thiết bị..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-2 border-gray-200"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Mã Thiết Bị</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Tên Thiết Bị</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Nhà Sản Xuất</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Vị Trí</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Ngày Tạo</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={6} className="text-center py-8 text-gray-500">Đang tải...</td></tr>
                      ) : filteredDevices.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-8 text-gray-500">Không có thiết bị nào</td></tr>
                      ) : (
                        filteredDevices.map((device) => (
                          <tr key={device.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <span className="font-mono font-medium text-blue-600">{device.deviceId}</span>
                            </td>
                            <td className="py-3 px-4"><p className="font-medium text-gray-800">{device.name}</p></td>
                            <td className="py-3 px-4 text-gray-700">{device.manufacturer}</td>
                            <td className="py-3 px-4 text-gray-600">{device.location}</td>
                            <td className="py-3 px-4 text-gray-600">{device.createdAt}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(device)} className="h-8 w-8 p-0 hover:bg-blue-100 text-blue-600" title="Sửa">
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(device)} className="h-8 w-8 p-0 hover:bg-red-100 text-red-600" title="Xóa">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Modal Thêm/Sửa Thiết Bị */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">
                    {editingDevice ? 'Sửa Thiết Bị' : 'Thêm Thiết Bị'}
                  </h2>
                  <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  {renderField('deviceId', 'Mã thiết bị')}
                  {renderField('name', 'Tên thiết bị')}
                  {renderField('manufacturer', 'Nhà sản xuất')}
                  {renderField('location', 'Vị trí')}
                </div>

                <div className="flex gap-3 mt-6">
                  <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">Hủy</Button>
                  <Button onClick={handleSave} disabled={isSaving} className="flex-1 bg-blue-600 hover:bg-blue-700">
                    <Save className="w-4 h-4 mr-2" />{editingDevice ? 'Cập Nhật' : 'Tạo Mới'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
