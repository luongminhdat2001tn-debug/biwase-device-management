'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { History, Calendar, Search, X, FileSpreadsheet, Printer } from 'lucide-react'
import * as XLSX from 'xlsx'
import { type HistoryEntry, getAccessibleWarehouseIds } from '@/lib/constants'
import { getHistoryLog, getAllProducts } from '@/lib/db'
import type { RowData } from './preview-print-file'

// Danh sách các chức năng để lọc
const ACTION_OPTIONS = ['Tất cả', 'Nhập liệu', 'Xuất kho', 'Tồn kho']

// Map ID kho -> tên hiển thị dài, phải khớp từng ký tự với giá trị
// lưu trong history_log.warehouse (do trang warehouse/inventory ghi)
const WAREHOUSE_NAMES: Record<string, string> = {
  'kho-vat-tu': 'Kho Vật Tư Nhà Máy',
  'kho-xay-dung': 'Kho Xây Dựng Cơ Bản',
  'kho-phong-thi-nghiem': 'Kho Phòng Thí Nghiệm',
  'kho-thuong-mai': 'Kho Thương Mại',
}

// Map tên kho dài -> MÃ KHO in trên phiếu xuất kho
const WAREHOUSE_CODES: Record<string, string> = {
  'Kho Vật Tư Nhà Máy': 'VT',
  'Kho Xây Dựng Cơ Bản': 'XD',
  'Kho Phòng Thí Nghiệm': 'TN',
  'Kho Thương Mại': 'TM',
}

export default function HistoryPage() {
  const [user, setUser] = useState<any>(null)
  const [historyLog, setHistoryLog] = useState<HistoryEntry[]>([])
  // Map mã SP (lowercase) -> ĐVT để in phiếu (tra từ bảng products)
  const [unitMap, setUnitMap] = useState<Record<string, string>>({})
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  // Bộ lọc mới
  const [filterCode, setFilterCode] = useState('')
  const [filterName, setFilterName] = useState('')
  const [filterWarehouse, setFilterWarehouse] = useState('')
  const [filterAction, setFilterAction] = useState('Tất cả')

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) { window.location.href = '/'; return }
    setUser(JSON.parse(userData))
    getHistoryLog().then(data => setHistoryLog(data))
    // Tải ĐVT sản phẩm để map khi in phiếu (MÃ KHO tra từ WAREHOUSE_CODES)
    // Key = "tên kho|mã hàng" vì mã hàng chỉ duy nhất trong từng kho
    getAllProducts().then(grouped => {
      const map: Record<string, string> = {}
      Object.entries(grouped).forEach(([warehouseId, items]) => {
        const warehouseName = WAREHOUSE_NAMES[warehouseId] || warehouseId
        items.forEach(p => {
          if (p.code) map[`${warehouseName}|${p.code.trim().toLowerCase()}`] = p.unit
        })
      })
      setUnitMap(map)
    })
  }, [])

  // Danh sách kho mà tài khoản được phép truy cập (theo chucNang trong session)
  const accessibleWarehouses = useMemo(() => {
    const ids = getAccessibleWarehouseIds(user)
    return ids.map((id) => ({ id, name: WAREHOUSE_NAMES[id] || id }))
  }, [user])
  // Tập tên kho được phép (để ẩn cứng dòng không có quyền)
  const accessibleNames = useMemo(() => new Set(accessibleWarehouses.map((w) => w.name)), [accessibleWarehouses])
  const hasAllWarehouses = accessibleWarehouses.length === 4
  // Giá trị mặc định: đủ 4 kho hoặc 2-3 kho -> "Tất cả" (gộp trong phạm vi cho phép);
  // 1 kho -> kho đó; 0 kho -> rỗng
  const defaultWarehouseFilter = useMemo(() => {
    if (accessibleWarehouses.length === 0) return ''
    if (accessibleWarehouses.length === 1) return accessibleWarehouses[0].name
    return 'Tất cả'
  }, [accessibleWarehouses])

  // Đồng bộ giá trị mặc định sau khi user load xong (chỉ 1 lần, không ghi đè lựa chọn tay)
  const warehouseInitRef = useRef(false)
  useEffect(() => {
    if (user && !warehouseInitRef.current) {
      warehouseInitRef.current = true
      setFilterWarehouse(defaultWarehouseFilter)
    }
  }, [user, defaultWarehouseFilter])

  // ------------------------------------------
  // Lọc kết hợp: ngày, mã SP, tên SP, chức năng
  // Dữ liệu từ Supabase đã sắp xếp mới nhất lên đầu
  // KHÔNG dùng .reverse() để giữ nguyên thứ tự
  // ------------------------------------------
  // Parse "YYYY-MM-DD" (từ <input type="date">) thành local midnight.
  // new Date("2026-09-25") parse theo UTC -> lệch 7h ở VN, làm mất ngày trùng.
  const parseDateInputAsLocal = (s: string): Date => {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  // Parse ngày của entry ("d/m/yyyy" từ vi-VN hoặc "yyyy-mm-dd") thành local midnight
  const parseEntryDate = (s: string): Date => {
    const str = s.trim()
    if (str.includes('/')) {
      const [d, m, y] = str.split('/').map(Number)
      return new Date(y, m - 1, d)
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      return parseDateInputAsLocal(str.slice(0, 10))
    }
    const d = new Date(str)
    d.setHours(0, 0, 0, 0)
    return d
  }
  const filteredHistory = historyLog.filter((entry) => {
    // Lọc theo khoảng ngày (so sánh theo ngày local, bao gồm cả biên)
    if (dateFrom || dateTo) {
      const entryDate = parseEntryDate(entry.date)
      entryDate.setHours(0, 0, 0, 0)
      if (dateFrom) {
        const from = parseDateInputAsLocal(dateFrom)
        from.setHours(0, 0, 0, 0)
        if (entryDate < from) return false
      }
      if (dateTo) {
        const to = parseDateInputAsLocal(dateTo)
        to.setHours(23, 59, 59, 999)
        if (entryDate > to) return false
      }
    }

    // Lọc theo mã sản phẩm
    if (filterCode && !entry.productCode.toLowerCase().includes(filterCode.toLowerCase())) return false

    // Lọc theo tên sản phẩm
    if (filterName && !entry.productName.toLowerCase().includes(filterName.toLowerCase())) return false

    // Lọc theo kho: lớp 1 ẩn cứng kho không có quyền, lớp 2 theo dropdown (khớp chính xác)
    if (!hasAllWarehouses && !accessibleNames.has(entry.warehouse)) return false
    if (filterWarehouse && filterWarehouse !== 'Tất cả' && entry.warehouse !== filterWarehouse) return false

    // Lọc theo chức năng
    if (filterAction !== 'Tất cả' && entry.action !== filterAction) return false

    return true
  })

  const hasFilter = dateFrom || dateTo || filterCode || filterName || filterWarehouse !== defaultWarehouseFilter || filterAction !== 'Tất cả'

  const clearAllFilters = () => {
    setDateFrom('')
    setDateTo('')
    setFilterCode('')
    setFilterName('')
    setFilterWarehouse(defaultWarehouseFilter)
    setFilterAction('Tất cả')
  }

  const handleExportExcel = () => {
    const data = filteredHistory.map((entry, index) => ({
      'STT': index + 1,
      'Ngày': entry.date,
      'Thời gian': entry.time,
      'Họ và tên': entry.userName,
      'Kho lưu': entry.warehouse,
      'Mã SP': entry.productCode,
      'Tên SP': entry.productName,
      'Chức năng': entry.action,
      'Thông tin': entry.details || `${entry.action} ${entry.quantity} sản phẩm`,
    }))

    const ws = XLSX.utils.json_to_sheet(data)

    ws['!cols'] = [
      { wch: 5 },
      { wch: 14 },
      { wch: 10 },
      { wch: 20 },
      { wch: 16 },
      { wch: 14 },
      { wch: 24 },
      { wch: 12 },
      { wch: 40 },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Lịch sử kho')

    const fileName = `LichSuKho_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  // Mở phiếu xuất kho ở tab mới (dữ liệu = filteredHistory hiện tại)
  // MÃ KHO tra từ WAREHOUSE_CODES theo tên kho, ĐVT tra từ products, NỘI DUNG = details
  const handlePrintPhieu = () => {
    const rows: RowData[] = filteredHistory.map((entry, index) => ({
      id: index,
      wh: WAREHOUSE_CODES[entry.warehouse] ?? entry.warehouse,
      code: entry.productCode,
      name: entry.productName,
      unit: unitMap[`${entry.warehouse}|${(entry.productCode || '').trim().toLowerCase()}`] || '—',
      qty: entry.quantity,
      note: entry.details || `${entry.action} ${entry.quantity} sản phẩm`,
    }))
    sessionStorage.setItem('phieu-xuat-kho', JSON.stringify(rows))
    window.open('/history/print', '_blank')
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'Nhập liệu': return 'bg-green-100 text-green-700'
      case 'Xuất kho': return 'bg-orange-100 text-orange-700'
      case 'Tồn kho': return 'bg-blue-100 text-blue-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  if (!user) return <div className="flex items-center justify-center h-screen">Loading...</div>

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
          <div className="mb-8"><h1 className="text-3xl font-bold text-gray-800">Lịch Sử Kho</h1></div>

          {/* Bộ lọc tổng hợp */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Hàng 1: Lọc theo ngày */}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Lọc theo ngày:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Từ:</label>
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border-2 w-44" />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Đến:</label>
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border-2 w-44" />
                  </div>
                </div>

                {/* Hàng 2: Lọc theo mã, tên, chức năng */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Lọc thêm:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 whitespace-nowrap">Mã SP:</label>
                    <Input
                      value={filterCode}
                      onChange={(e) => setFilterCode(e.target.value)}
                      placeholder="Nhập mã sản phẩm..."
                      className="border-2 w-40"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 whitespace-nowrap">Tên SP:</label>
                    <Input
                      value={filterName}
                      onChange={(e) => setFilterName(e.target.value)}
                      placeholder="Nhập tên sản phẩm..."
                      className="border-2 w-48"
                    />
                  </div>                
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 whitespace-nowrap">Kho Lưu:</label>
                    <select
                      value={filterWarehouse}
                      onChange={(e) => setFilterWarehouse(e.target.value)}
                      className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                      {accessibleWarehouses.length === 0 ? (
                        <option value="">Không có quyền</option>
                      ) : (
                        <>
                          {accessibleWarehouses.length > 1 && (
                            <option value="Tất cả">Tất cả</option>
                          )}
                          {accessibleWarehouses.map((w) => (
                            <option key={w.id} value={w.name}>{w.name}</option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>                    
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 whitespace-nowrap">Chức năng:</label>
                    <select
                      value={filterAction}
                      onChange={(e) => setFilterAction(e.target.value)}
                      className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                      {ACTION_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  {hasFilter && (
                    <Button variant="outline" size="sm" onClick={clearAllFilters} className="flex items-center gap-1">
                      <X className="w-3 h-3" />
                      Xóa bộ lọc
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* History Table */}
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <History className="w-5 h-5" /> Lịch Sử Hoạt Động ({filteredHistory.length} bản ghi)
                </CardTitle>
                {filteredHistory.length > 0 && (
                  <div className="flex gap-2">
                    <Button onClick={handlePrintPhieu} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white cursor-pointer">
                      <Printer className="w-4 h-4" /> Xuất Phiếu Kho
                    </Button>
                    <Button onClick={handleExportExcel} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white cursor-pointer">
                      <FileSpreadsheet className="w-4 h-4" /> Xuất Excel
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left py-3 px-3 font-semibold text-gray-700 whitespace-nowrap">Ngày/tháng/năm</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Thời gian</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700 min-w-[140px]">Họ và tên</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Kho lưu</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Mã SP</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Tên SP</th>
                      <th className="text-center py-3 px-3 font-semibold text-gray-700">Chức năng</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700 min-w-[200px]">Thông tin chức năng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-gray-500">
                          <History className="w-16 h-16 mx-auto mb-2 text-gray-300" />
                          <p>{hasFilter ? 'Không có bản ghi nào phù hợp với bộ lọc' : 'Chưa có lịch sử hoạt động'}</p>
                        </td>
                      </tr>
                    ) : (
                      // Dữ liệu từ Supabase đã order DESC (mới nhất lên đầu) — KHÔNG reverse
                      filteredHistory.map((entry, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-3 text-gray-700 whitespace-nowrap">{entry.date}</td>
                          <td className="py-3 px-3 text-gray-600">{entry.time}</td>
                          <td className="py-3 px-3 text-gray-700 font-medium">{entry.userName}</td>
                          <td className="py-3 px-3 text-gray-700">{entry.warehouse}</td>
                          <td className="py-3 px-3"><span className="font-mono font-medium text-blue-600">{entry.productCode}</span></td>
                          <td className="py-3 px-3 font-medium text-gray-800">{entry.productName}</td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getActionColor(entry.action)}`}>{entry.action}</span>
                          </td>
                          <td className="py-3 px-3 text-gray-600 text-sm">
                            {entry.details || `${entry.action} ${entry.quantity} sản phẩm`}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
