'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserCog, Plus, Edit2, Trash2, Search, X, Save, Shield, Check, AlertCircle } from 'lucide-react'
import { CHUC_NANG_LIST, getChucNangName, type Account } from '@/lib/constants'
import { getAccountsFromDB, createAccount, updateAccount, deleteAccountFromDB } from '@/lib/db'

export default function AccountPage() {
  const [user, setUser] = useState<any>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    chucVu: '',
    chucNang: ['xem-co-ban'] as string[],
    status: 'active' as 'active' | 'inactive',
  })

  // Load tài khoản từ Supabase
  const loadAccounts = async () => {
    const data = await getAccountsFromDB()
    setAccounts(data)
  }

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) { window.location.href = '/'; return }
    const parsed = JSON.parse(userData)
    setUser(parsed)
    loadAccounts()
  }, [])

  const canManageAccounts = () => {
    if (!user) return false
    const perms = Array.isArray(user.chucNang) ? user.chucNang : [user.chucNang || '']
    return perms.includes('them-tai-khoan') || user.isAdmin
  }
  const hasAccountPermission = canManageAccounts()

  const filteredAccounts = accounts.filter(
    (acc) => acc.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Toggle checkbox chức năng
  const toggleChucNang = (id: string) => {
    setFormData(prev => ({
      ...prev,
      chucNang: prev.chucNang.includes(id)
        ? prev.chucNang.filter(c => c !== id)
        : [...prev.chucNang, id]
    }))
  }

  const handleAdd = () => {
    setEditingAccount(null)
    setFormData({ username: '', password: '', name: '', chucVu: '', chucNang: ['xem-co-ban'], status: 'active' })
    setIsModalOpen(true)
  }

  const handleEdit = (account: Account) => {
    setEditingAccount(account)
    setFormData({
      username: account.username,
      password: account.password,
      name: account.name,
      chucVu: account.chucVu,
      chucNang: Array.isArray(account.chucNang) ? account.chucNang : [account.chucNang || 'xem-co-ban'],
      status: account.status,
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (accountId: number) => {
    const acc = accounts.find(a => a.id === accountId)
    if (acc?.isAdmin) { alert('Không thể xóa tài khoản Admin!'); return }
    if (confirm('Bạn có chắc chắn muốn xóa tài khoản này?')) {
      await deleteAccountFromDB(accountId)
      await loadAccounts()
    }
  }

  const handleSave = async () => {
    if (!formData.username || !formData.password || !formData.name) {
      alert('Vui lòng điền đầy đủ thông tin!'); return
    }
    if (editingAccount) {
      await updateAccount(editingAccount.id, formData)
    } else {
      if (accounts.some(a => a.username === formData.username)) {
        alert('Tên đăng nhập đã tồn tại!'); return
      }
      await createAccount({ ...formData, createdAt: new Date().toISOString().split('T')[0] })
    }
    await loadAccounts()
    setIsModalOpen(false)
  }

  if (!user) return <div className="flex items-center justify-center h-screen">Loading...</div>

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Quản Lý Tài Khoản</h1>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Tổng tài khoản</p><p className="text-2xl font-bold text-gray-800">{accounts.length}</p></div><UserCog className="w-10 h-10 text-blue-500" /></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Đang hoạt động</p><p className="text-2xl font-bold text-green-600">{accounts.filter(a => a.status === 'active').length}</p></div><Check className="w-10 h-10 text-green-500" /></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Tạm khóa</p><p className="text-2xl font-bold text-red-600">{accounts.filter(a => a.status === 'inactive').length}</p></div><AlertCircle className="w-10 h-10 text-red-500" /></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Số chức năng</p><p className="text-2xl font-bold text-sky-600">{CHUC_NANG_LIST.length}</p></div><Shield className="w-10 h-10 text-sky-500" /></div></CardContent></Card>
          </div>

          {/* Account Table */}
          <Card className="border-l-4 border-l-blue-600">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="flex items-center gap-2 text-blue-600">
                  <UserCog className="w-5 h-5" /> Danh Sách Tài Khoản
                </CardTitle>
                {hasAccountPermission && <Button onClick={handleAdd} className="bg-blue-600 text-white hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" /> Thêm Tài Khoản
                </Button>}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input placeholder="Tìm kiếm theo họ và tên..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 border-2 border-gray-200" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Họ và tên</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Tên đăng nhập</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Chức vụ</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Chức năng</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Ngày</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Trạng thái</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccounts.map((account) => (
                      <tr key={account.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-800">{account.name}</p>
                          {account.isAdmin && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Admin</span>}
                        </td>
                        <td className="py-3 px-4"><span className="font-mono font-medium text-blue-600">{account.username}</span></td>
                        <td className="py-3 px-4 text-gray-700">{account.chucVu}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {(Array.isArray(account.chucNang) ? account.chucNang : [account.chucNang]).map((cn: string) => (
                              <span key={cn} className="px-1.5 py-0.5 bg-sky-100 text-sky-700 rounded text-xs font-medium">{getChucNangName(cn)}</span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{account.createdAt}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${account.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {account.status === 'active' ? 'Hoạt động' : 'Tạm khóa'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {hasAccountPermission && (
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(account)} className="h-8 w-8 p-0 hover:bg-blue-100 text-blue-600"><Edit2 className="h-4 w-4" /></Button>
                              {!account.isAdmin && (
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(account.id)} className="h-8 w-8 p-0 hover:bg-red-100 text-red-600"><Trash2 className="h-4 w-4" /></Button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Danh sách chức năng */}
          <Card className="mt-6 border-l-4 border-l-sky-600">
            <CardHeader><CardTitle className="flex items-center gap-2 text-sky-600"><Shield className="w-5 h-5" /> Danh Sách Chức Năng</CardTitle></CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {CHUC_NANG_LIST.map((cn) => (
                  <div key={cn.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="font-semibold text-gray-800">{cn.name}</p>
                    <p className="text-sm text-gray-500 mt-1">{cn.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Modal Add/Edit Account */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">{editingAccount ? 'Sửa Tài Khoản' : 'Thêm Tài Khoản'}</h2>
                  <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập *</label>
                    <Input value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="border-2" disabled={!!editingAccount} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu *</label>
                    <Input type="text" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="border-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên *</label>
                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="border-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chức vụ</label>
                    <Input value={formData.chucVu} onChange={(e) => setFormData({ ...formData, chucVu: e.target.value })} className="border-2" />
                  </div>

                  {/* Checkbox chức năng (multi-select) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Chức năng (có thể chọn nhiều)</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {CHUC_NANG_LIST.map((cn) => (
                        <label key={cn.id} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${formData.chucNang.includes(cn.id) ? 'border-sky-500 bg-sky-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          <input
                            type="checkbox"
                            checked={formData.chucNang.includes(cn.id)}
                            onChange={() => toggleChucNang(cn.id)}
                            className="w-4 h-4 accent-sky-600 cursor-pointer"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-800">{cn.name}</p>
                            <p className="text-xs text-gray-500">{cn.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })} className="w-full p-2 border-2 rounded-lg">
                      <option value="active">Hoạt động</option>
                      <option value="inactive">Tạm khóa</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">Hủy</Button>
                  <Button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700"><Save className="w-4 h-4 mr-2" />{editingAccount ? 'Cập Nhật' : 'Tạo Mới'}</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
