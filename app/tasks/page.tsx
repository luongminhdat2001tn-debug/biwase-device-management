'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ClipboardList, Plus, Edit2, Trash2, Search, X, Save, AlertCircle, Upload } from 'lucide-react'
import type { Task, Device } from '@/lib/constants'
import { getTasks, getDevices, createTask, updateTask, deleteTask, uploadImage } from '@/lib/db'

type FormFields = 'deviceId' | 'taskName' | 'taskDescription' | 'expiredAt' | 'maintainedImageUrl'

// Ngày hôm nay dạng yyyy-mm-dd theo giờ máy
// (không dùng toISOString vì sẽ lệch ngày khi múi giờ dương vào sáng sớm)
const todayISO = () => new Date().toLocaleDateString('en-CA')

// Số ngày còn lại từ hôm nay đến hạn (0 = hôm nay, 1 = ngày mai)
const calcRemainingDays = (date: string) => {
  if (!date) return null
  const diff = new Date(`${date}T00:00:00`).getTime() - new Date(`${todayISO()}T00:00:00`).getTime()
  return Math.round(diff / 86400000)
}

export default function TasksPage() {
  const [user, setUser] = useState<any>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form dùng chung cho thêm mới và sửa (deviceId giữ dạng string cho autocomplete)
  const [formData, setFormData] = useState({ deviceId: '', taskName: '', taskDescription: '', expiredAt: '' })
  // File ảnh mới chọn (null = giữ ảnh cũ khi sửa)
  const [imageFile, setImageFile] = useState<File | null>(null)
  // Preview hiển thị: URL đã lưu hoặc data URL của file mới chọn
  const [imagePreview, setImagePreview] = useState('')
  // Ô autocomplete thiết bị: text đang gõ + trạng thái mở danh sách
  const [deviceQuery, setDeviceQuery] = useState('')
  const [isDeviceListOpen, setIsDeviceListOpen] = useState(false)
  // Lỗi đỏ từng ô (hiện sau khi bấm Lưu, tự xóa khi user sửa lại)
  const [formErrors, setFormErrors] = useState<Partial<Record<FormFields, string>>>({})

  const loadData = async () => {
    setLoading(true)
    const [taskList, deviceList] = await Promise.all([getTasks(), getDevices()])
    setTasks(taskList)
    setDevices(deviceList)
    setLoading(false)
  }

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) { window.location.href = '/'; return }
    setUser(JSON.parse(userData))
    loadData()
  }, [])

  // Quyền xem/thêm/sửa/xóa: admin hoặc có chức năng 'quan-ly-cong-viec'
  const perms = Array.isArray(user?.chucNang) ? user.chucNang : [user?.chucNang || '']
  const canManage = !!user && (user.isAdmin || perms.includes('quan-ly-cong-viec'))

  // Tên thiết bị lấy từ danh sách đã tải; thiết bị không còn thì hiện "—"
  const deviceName = (id: number) => devices.find((d) => d.id === id)?.name || '—'

  // Autocomplete thiết bị: lọc theo mã hoặc tên, đang chọn thì focus hiện tất cả
  const deviceLabel = (d: Device) => `${d.deviceId} — ${d.name}`
  const selectedDevice = devices.find((d) => String(d.id) === formData.deviceId)
  const deviceSearch = selectedDevice && deviceQuery === deviceLabel(selectedDevice) ? '' : deviceQuery
  const filteredDevices = devices.filter((d) => {
    const q = deviceSearch.trim().toLowerCase()
    return !q || d.deviceId.toLowerCase().includes(q) || d.name.toLowerCase().includes(q)
  })
  const remainingDays = calcRemainingDays(formData.expiredAt)

  const keyword = searchTerm.trim().toLowerCase()
  const filteredTasks = tasks.filter(
    (t) => t.taskName.toLowerCase().includes(keyword) || deviceName(t.deviceId).toLowerCase().includes(keyword)
  )

  // Xóa lỗi đỏ của 1 ô khi user bắt đầu sửa
  const clearFieldError = (field: FormFields) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  // Chọn ảnh -> preview ngay bằng FileReader (chỉ upload khi bấm Lưu)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    clearFieldError('maintainedImageUrl')
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview('')
    clearFieldError('maintainedImageUrl')
  }

  // Chọn thiết bị từ danh sách gợi ý
  const selectDevice = (d: Device) => {
    setFormData((prev) => ({ ...prev, deviceId: String(d.id) }))
    setDeviceQuery(deviceLabel(d))
    clearFieldError('deviceId')
    setIsDeviceListOpen(false)
  }

  const handleAdd = () => {
    setEditingTask(null)
    setFormData({ deviceId: '', taskName: '', taskDescription: '', expiredAt: '' })
    setDeviceQuery('')
    setIsDeviceListOpen(false)
    setImageFile(null)
    setImagePreview('')
    setFormErrors({})
    setIsSaving(false)
    setIsModalOpen(true)
  }

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setFormData({
      deviceId: String(task.deviceId),
      taskName: task.taskName,
      taskDescription: task.taskDescription,
      // <input type="date"> cần yyyy-mm-dd
      expiredAt: task.expiredAt.slice(0, 10),
    })
    const device = devices.find((d) => d.id === task.deviceId)
    setDeviceQuery(device ? deviceLabel(device) : '')
    setIsDeviceListOpen(false)
    setImageFile(null)
    setImagePreview(task.maintainedImageUrl)
    setFormErrors({})
    setIsSaving(false)
    setIsModalOpen(true)
  }

  // Kiểm tra các trường bắt buộc, trả về object lỗi (rỗng = hợp lệ)
  const validate = () => {
    const errors: typeof formErrors = {}
    if (!formData.deviceId) errors.deviceId = 'Vui lòng chọn thiết bị từ danh sách'
    if (!formData.taskName.trim()) errors.taskName = 'Vui lòng nhập tên công việc'
    if (!formData.taskDescription.trim()) errors.taskDescription = 'Vui lòng nhập mô tả'
    if (!formData.expiredAt) errors.expiredAt = 'Vui lòng chọn hạn hoàn thành'
    else if (formData.expiredAt < todayISO()) errors.expiredAt = 'Hạn hoàn thành không được trước hôm nay'
    // Ảnh bảo trì bắt buộc: phải có file mới hoặc ảnh đã lưu
    if (!imageFile && !imagePreview) errors.maintainedImageUrl = 'Vui lòng chọn ảnh bảo trì'
    return errors
  }

  const handleSave = async () => {
    // Chặn bấm Lưu nhiều lần trong lúc đang upload/ghi DB
    if (isSaving) return
    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }
    setFormErrors({})
    setIsSaving(true)

    try {
      const uploadedImage = imageFile ? await uploadImage(imageFile, 'tasks') : null
      // Có chọn file mà upload lỗi thì dừng, không ghi DB
      if (imageFile && !uploadedImage) {
        alert('❌ Upload ảnh thất bại! Vui lòng thử lại.')
        return
      }

      const values = {
        deviceId: Number(formData.deviceId),
        taskName: formData.taskName.trim(),
        taskDescription: formData.taskDescription.trim(),
        remainingDay: remainingDays ?? 0,
        expiredAt: formData.expiredAt,
        maintainedImageUrl: uploadedImage ?? imagePreview,
      }
      const ok = editingTask ? await updateTask(editingTask.id, values) : !!(await createTask(values))
      if (!ok) {
        alert('❌ Lưu thất bại! Vui lòng thử lại.')
        return
      }
      await loadData()
      setIsModalOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  // Xóa cứng công việc (bảng tasks không có cột is_deleted)
  const handleDelete = async (task: Task) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa công việc "${task.taskName}"?`)) return
    if (!(await deleteTask(task.id))) {
      alert('❌ Xóa thất bại! Vui lòng thử lại.')
      return
    }
    await loadData()
  }

  if (!user) return <div className="flex items-center justify-center h-screen">Loading...</div>

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Quản Lý Công Việc</h1>
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
                    <ClipboardList className="w-5 h-5" /> Danh Sách Công Việc
                  </CardTitle>
                  <Button onClick={handleAdd} className="bg-blue-600 text-white hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" /> Thêm Công Việc
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Tìm kiếm theo tên công việc hoặc thiết bị..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-2 border-gray-200"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Thiết Bị</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Tên Công Việc</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Mô Tả</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Ngày Tạo</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={5} className="text-center py-8 text-gray-500">Đang tải...</td></tr>
                      ) : filteredTasks.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-8 text-gray-500">Không có công việc nào</td></tr>
                      ) : (
                        filteredTasks.map((task) => (
                          <tr key={task.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 text-gray-700">{deviceName(task.deviceId)}</td>
                            <td className="py-3 px-4"><p className="font-medium text-gray-800">{task.taskName}</p></td>
                            <td className="py-3 px-4 text-gray-600">
                              {task.taskDescription.length > 80 ? `${task.taskDescription.slice(0, 80)}…` : task.taskDescription}
                            </td>
                            <td className="py-3 px-4 text-gray-600">{task.createdAt}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(task)} className="h-8 w-8 p-0 hover:bg-blue-100 text-blue-600" title="Sửa">
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(task)} className="h-8 w-8 p-0 hover:bg-red-100 text-red-600" title="Xóa">
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

          {/* Modal Thêm/Sửa Công Việc */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">
                    {editingTask ? 'Sửa Công Việc' : 'Thêm Công Việc'}
                  </h2>
                  <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Thiết bị - autocomplete */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Thiết bị *</label>
                    <div
                      className="relative"
                      // Chỉ đóng khi focus rời khỏi cả ô nhập + danh sách (Tab vào option vẫn được)
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDeviceListOpen(false)
                      }}
                    >
                      <Input
                        value={deviceQuery}
                        onChange={(e) => {
                          setDeviceQuery(e.target.value)
                          // Gõ lại sau khi đã chọn -> bắt buộc chọn lại từ danh sách
                          if (formData.deviceId) setFormData({ ...formData, deviceId: '' })
                          clearFieldError('deviceId')
                          setIsDeviceListOpen(true)
                        }}
                        onFocus={() => setIsDeviceListOpen(true)}
                        placeholder="Tìm theo mã hoặc tên thiết bị..."
                        role="combobox"
                        aria-expanded={isDeviceListOpen}
                        aria-controls="device-options"
                        aria-autocomplete="list"
                        className={`border-2 ${formErrors.deviceId ? 'border-red-500 bg-red-50 focus:ring-red-400' : ''}`}
                      />
                      {isDeviceListOpen && (
                        <div id="device-options" role="listbox" className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto bg-white border-2 border-gray-200 rounded-md shadow-lg">
                          {filteredDevices.length === 0 ? (
                            <p className="px-3 py-2 text-sm text-gray-500">Không tìm thấy thiết bị</p>
                          ) : (
                            filteredDevices.map((d) => (
                              <button
                                key={d.id}
                                type="button"
                                role="option"
                                aria-selected={String(d.id) === formData.deviceId}
                                onClick={() => selectDevice(d)}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${String(d.id) === formData.deviceId ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                              >
                                {deviceLabel(d)}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    {devices.length === 0 && (
                      <p className="text-amber-600 text-xs mt-1">Chưa có thiết bị nào. Vui lòng thêm thiết bị trước.</p>
                    )}
                    {formErrors.deviceId && (
                      <p className="text-red-600 text-xs mt-1 font-medium">⚠️ {formErrors.deviceId}</p>
                    )}
                  </div>

                  {/* Hạn hoàn thành */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hạn hoàn thành *</label>
                    <input
                      type="date"
                      min={todayISO()}
                      value={formData.expiredAt}
                      onChange={(e) => {
                        setFormData({ ...formData, expiredAt: e.target.value })
                        clearFieldError('expiredAt')
                      }}
                      className={`w-full border-2 rounded-md p-2 ${formErrors.expiredAt ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                    />
                    {formErrors.expiredAt && (
                      <p className="text-red-600 text-xs mt-1 font-medium">⚠️ {formErrors.expiredAt}</p>
                    )}
                    <label className="block text-sm font-medium text-gray-700 mb-1 mt-3">Số ngày còn lại</label>
                    <Input
                      value={remainingDays === null ? '—' : String(remainingDays)}
                      disabled
                      className="border-2 bg-gray-100 cursor-not-allowed"
                    />
                  </div>

                  {/* Tên công việc */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên công việc *</label>
                    <Input
                      value={formData.taskName}
                      onChange={(e) => {
                        setFormData({ ...formData, taskName: e.target.value })
                        clearFieldError('taskName')
                      }}
                      className={`border-2 ${formErrors.taskName ? 'border-red-500 bg-red-50 focus:ring-red-400' : ''}`}
                    />
                    {formErrors.taskName && (
                      <p className="text-red-600 text-xs mt-1 font-medium">⚠️ {formErrors.taskName}</p>
                    )}
                  </div>

                  {/* Mô tả */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả *</label>
                    <textarea
                      value={formData.taskDescription}
                      onChange={(e) => {
                        setFormData({ ...formData, taskDescription: e.target.value })
                        clearFieldError('taskDescription')
                      }}
                      className={`w-full border-2 rounded-md p-2 min-h-24 ${formErrors.taskDescription ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                    />
                    {formErrors.taskDescription && (
                      <p className="text-red-600 text-xs mt-1 font-medium">⚠️ {formErrors.taskDescription}</p>
                    )}
                  </div>

                  {/* Ảnh bảo trì */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">📷 Ảnh bảo trì *</label>
                    <div className="flex gap-4 items-start">
                      <label className={`flex items-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors flex-1 ${formErrors.maintainedImageUrl ? 'bg-red-50 border-red-300 hover:bg-red-100' : 'bg-blue-50 border-blue-300 hover:bg-blue-100'}`}>
                        <Upload className={`w-5 h-5 ${formErrors.maintainedImageUrl ? 'text-red-500' : 'text-blue-500'}`} />
                        <span className={`text-sm ${formErrors.maintainedImageUrl ? 'text-red-600' : 'text-blue-600'}`}>Upload ảnh bảo trì</span>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                      {imagePreview && (
                        <div className="relative">
                          <img src={imagePreview} alt="Ảnh bảo trì" className="w-24 h-24 object-cover rounded-lg border-2 border-blue-200" />
                          <button onClick={clearImage} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"><X className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>
                    {formErrors.maintainedImageUrl && (
                      <p className="text-red-600 text-xs mt-1 font-medium">⚠️ {formErrors.maintainedImageUrl}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">Hủy</Button>
                  <Button onClick={handleSave} disabled={isSaving} className="flex-1 bg-blue-600 hover:bg-blue-700">
                    <Save className="w-4 h-4 mr-2" />{editingTask ? 'Cập Nhật' : 'Tạo Mới'}
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
