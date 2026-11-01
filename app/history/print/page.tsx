'use client'

import { useEffect, useState } from 'react'
import PreviewPrintFile, { type RowData } from '../preview-print-file'

// Trang in phiếu xuất kho (mở ở tab mới từ trang history)
// Dữ liệu được truyền qua sessionStorage key 'phieu-xuat-kho'
export default function HistoryPrintPage() {
  const [rows, setRows] = useState<RowData[] | null>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('phieu-xuat-kho')
      if (!raw) { setRows([]); return }
      const parsed = JSON.parse(raw)
      setRows(Array.isArray(parsed) ? parsed : [])
    } catch {
      setRows([])
    }
  }, [])

  if (rows === null) {
    return <div className="flex items-center justify-center h-screen">Đang tải phiếu...</div>
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Không có dữ liệu để in. Vui lòng quay lại trang Lịch Sử Kho và bấm &quot;Xuất Phiếu Kho&quot;.
      </div>
    )
  }

  return <PreviewPrintFile rows={rows} />
}
