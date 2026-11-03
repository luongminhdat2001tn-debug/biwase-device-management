'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ClipboardList, Plus, Edit2, Trash2, Search, X, Save, AlertCircle } from 'lucide-react'
import type { Task, Device } from '@/lib/constants'
import { getTasks, getDevices, createTask, updateTask, deleteTask, uploadImage } from '@/lib/db'

type FormFields = 'deviceId' | 'taskName' | 'taskDescription' | 'expiredAt' | 'imageBefore' | 'imageAfter'

export default function TasksPage() {
  const [user, setUser] = useState<any>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form dùng chung cho thêm mới và sửa (deviceId giữ dạng string cho <select>)
  const [formData, setFormData] = useState({ deviceId: '', taskName: '', taskDescription: '', expiredAt: '' })
  // File ảnh mới chọn (null = giữ ảnh cũ khi sửa)
  const [imageBeforeFile, setImageBeforeFile] = useState<File | null>(null)
  const [imageAfterFile, setImageAfterFile] = useState<File | null>(null)
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

  const handleAdd = () => {
    setEditingTask(null)
    setFormData({ deviceId: '', taskName: '', taskDescription: '', expiredAt: '' })
    setImageBeforeFile(null)
    setImageAfterFile(null)
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
    setImageBeforeFile(null)
    setImageAfterFile(null)
    setFormErrors({})
    setIsSaving(false)
    setIsModalOpen(true)
  }

  // Kiểm tra các trường bắt buộc, trả về object lỗi (rỗng = hợp lệ)
  const validate = () => {
    const errors: typeof formErrors = {}
    if (!formData.deviceId) errors.deviceId = 'Vui lòng chọn thiết bị'
    if (!formData.taskName.trim()) errors.taskName = 'Vui lòng nhập tên công việc'
    if (!formData.taskDescription.trim()) errors.taskDescription = 'Vui lòng nhập mô tả'
    if (!formData.expiredAt) errors.expiredAt = 'Vui lòng chọn hạn hoàn thành'
    // Ảnh trước chỉ bắt buộc khi tạo mới; khi sửa giữ ảnh cũ nếu không chọn file
    if (!editingTask && !imageBeforeFile) errors.imageBefore = 'Vui lòng chọn ảnh trước'
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
      const uploadedBefore = imageBeforeFile ? await uploadImage(imageBeforeFile, 'tasks') : null
      const uploadedAfter = imageAfterFile ? await uploadImage(imageAfterFile, 'tasks') : null
      // Có chọn file mà upload lỗi thì dừng, không ghi DB
      if ((imageBeforeFile && !uploadedBefore) || (imageAfterFile && !uploadedAfter)) {
        alert('❌ Upload ảnh thất bại! Vui lòng thử lại.')
        return
      }

      const values = {
        deviceId: Number(formData.deviceId),
        taskName: formData.taskName.trim(),
        taskDescription: formData.taskDescription.trim(),
        expiredAt: formData.expiredAt,
        imageBefore: uploadedBefore ?? editingTask?.imageBefore ?? '',
        imageAfter: uploadedAfter ?? editingTask?.imageAfter ?? '',
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
              <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">
                    {editingTask ? 'Sửa Công Việc' : 'Thêm Công Việc'}
                  </h2>
                  <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Thiết bị */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Thiết bị *</label>
                    <select
                      value={formData.deviceId}
                      onChange={(e) => {
                        setFormData({ ...formData, deviceId: e.target.value })
                        clearFieldError('deviceId')
                      }}
                      className={`w-full border-2 rounded-md p-2 ${formErrors.deviceId ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white'}`}
                    >
                      <option value="">Chọn thiết bị</option>
                      {devices.map((d) => (
                        <option key={d.id} value={String(d.id)}>{d.deviceId} — {d.name}</option>
                      ))}
                    </select>
                    {devices.length === 0 && (
                      <p className="text-amber-600 text-xs mt-1">Chưa có thiết bị nào. Vui lòng thêm thiết bị trước.</p>
                    )}
                    {formErrors.deviceId && (
                      <p className="text-red-600 text-xs mt-1 font-medium">⚠️ {formErrors.deviceId}</p>
                    )}
                  </div>

                  {/* Tên công việc */}
                  <div>
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
                  <div>
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

                  {/* Ảnh trước */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ảnh trước *</label>
                    {editingTask?.imageBefore && !imageBeforeFile && (
                      <img src={editingTask.imageBefore} alt="Ảnh trước" className="h-16 w-16 object-cover rounded border mb-2" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        setImageBeforeFile(e.target.files?.[0] || null)
                        clearFieldError('imageBefore')
                      }}
                      className={`w-full border-2 rounded-md p-2 ${formErrors.imageBefore ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                    />
                    {formErrors.imageBefore && (
                      <p className="text-red-600 text-xs mt-1 font-medium">⚠️ {formErrors.imageBefore}</p>
                    )}
                  </div>

                  {/* Ảnh sau (không bắt buộc) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ảnh sau</label>
                    {editingTask?.imageAfter && !imageAfterFile && (
                      <img src={editingTask.imageAfter} alt="Ảnh sau" className="h-16 w-16 object-cover rounded border mb-2" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageAfterFile(e.target.files?.[0] || null)}
                      className="w-full border-2 border-gray-200 rounded-md p-2"
                    />
                  </div>

                  {/* Hạn hoàn thành */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hạn hoàn thành *</label>
                    <input
                      type="date"
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
