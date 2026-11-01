'use client'

import { Fragment, useEffect, useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Archive, Factory, Building, ShoppingBag, FlaskConical, Search, Eye, X, ChevronDown, ChevronRight, Maximize2 } from 'lucide-react'
import { type Product } from '@/lib/constants'
import { getAllProducts } from '@/lib/db'

// Tailwind cần class đầy đủ dạng chuỗi, nên khai báo sẵn ở đây
const WAREHOUSES = [
  { id: 'kho-vat-tu', name: 'Kho Vật Tư Nhà Máy', icon: Factory, text: 'text-blue-600', border: 'border-l-blue-600',
    tabOn: 'bg-blue-600 text-white border-blue-700', tabOff: 'bg-white text-blue-600 border-blue-200 hover:border-blue-400' },
  { id: 'kho-xay-dung', name: 'Kho Xây Dựng Cơ Bản', icon: Building, text: 'text-orange-500', border: 'border-l-orange-500',
    tabOn: 'bg-orange-500 text-white border-orange-600', tabOff: 'bg-white text-orange-500 border-orange-200 hover:border-orange-400' },
  { id: 'kho-phong-thi-nghiem', name: 'Kho Phòng Thí Nghiệm', icon: FlaskConical, text: 'text-purple-600', border: 'border-l-purple-600',
    tabOn: 'bg-purple-600 text-white border-purple-700', tabOff: 'bg-white text-purple-600 border-purple-200 hover:border-purple-400' },
  { id: 'kho-thuong-mai', name: 'Kho Thương Mại', icon: ShoppingBag, text: 'text-green-600', border: 'border-l-green-600',
    tabOn: 'bg-green-600 text-white border-green-700', tabOff: 'bg-white text-green-600 border-green-200 hover:border-green-400' },
]

const COLUMNS = [
  { label: 'STT', className: 'text-center w-16' },
  { label: 'Mã Hàng', className: 'text-left' },
  { label: 'Tên Hàng', className: 'text-left' },
  { label: 'Số Lượng', className: 'text-right' },
  { label: 'Có Hình Ảnh', className: 'text-center' },
  { label: 'Thông Tin', className: 'text-center' },
]

type Lightbox = { src: string; alt: string }

export default function InventoryPage() {
  const [ready, setReady] = useState(false)
  const [selectedWarehouse, setSelectedWarehouse] = useState(WAREHOUSES[0].id)
  const [searchTerm, setSearchTerm] = useState('')
  const [allProducts, setAllProducts] = useState<Record<string, Product[]>>({})
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [openCategory, setOpenCategory] = useState<string | null>(null) // accordion: chỉ mở 1 danh mục
  const [lightbox, setLightbox] = useState<Lightbox | null>(null)

  useEffect(() => {
    if (!localStorage.getItem('user')) { window.location.href = '/'; return }
    setReady(true)
    getAllProducts().then(setAllProducts)
  }, [])

  // Đóng lightbox bằng phím Esc
  useEffect(() => {
    if (!lightbox) return
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && setLightbox(null)
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lightbox])

  if (!ready) return <div className="flex items-center justify-center h-screen">Loading...</div>

  const warehouse = WAREHOUSES.find((w) => w.id === selectedWarehouse)!
  const keyword = searchTerm.trim().toLowerCase()
  const items = (allProducts[selectedWarehouse] || []).filter(
    (p) => p.name.toLowerCase().includes(keyword) || p.code.toLowerCase().includes(keyword)
  )

  // Sản phẩm có danh mục -> gom nhóm; không có danh mục -> hiển thị thành dòng riêng
  const groupMap = new Map<string, { name: string; total: number; items: Product[] }>()
  const standalone: Product[] = []
  for (const p of items) {
    const name = (p.categoryName || '').trim()
    if (!name) { standalone.push(p); continue }
    const group = groupMap.get(name) || { name, total: 0, items: [] }
    group.total += p.quantity
    group.items.push(p)
    groupMap.set(name, group)
  }
  const groups = Array.from(groupMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'vi'))

  const isOpen = (name: string) => keyword !== '' || openCategory === name // đang tìm kiếm -> mở hết
  const toggle = (name: string) => setOpenCategory((prev) => (prev === name ? null : name))

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
          <h1 className="mb-8 text-3xl font-bold text-gray-800">Tồn Kho</h1>

          {/* Warehouse tabs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {WAREHOUSES.map((w) => {
              const Icon = w.icon
              const selected = w.id === selectedWarehouse
              return (
                <button
                  key={w.id}
                  onClick={() => { setSelectedWarehouse(w.id); setOpenCategory(null) }}
                  className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${selected ? w.tabOn : w.tabOff}`}
                >
                  <Icon className="w-8 h-8" />
                  <div className="text-left">
                    <p className="font-semibold">{w.name}</p>
                    <p className={`text-sm ${selected ? 'opacity-80' : 'opacity-60'}`}>{allProducts[w.id]?.length || 0} sản phẩm</p>
                  </div>
                </button>
              )
            })}
          </div>

          <Card className={`border-l-4 ${warehouse.border}`}>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${warehouse.text}`}>
                <Archive className="w-5 h-5" /> {warehouse.name} - Tồn Kho
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Tìm kiếm theo mã hàng hoặc tên hàng..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-2 border-gray-200"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      {COLUMNS.map((col) => (
                        <th key={col.label} className={`py-3 px-4 font-semibold text-gray-700 ${col.className}`}>{col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={COLUMNS.length} className="text-center py-8 text-gray-500">
                          <Archive className="w-16 h-16 mx-auto mb-2 text-gray-300" />
                          <p>Không có sản phẩm tồn kho</p>
                        </td>
                      </tr>
                    ) : (
                      <>
                        {/* Danh mục: tên + tổng số lượng; bấm để mở/đóng các sản phẩm bên trong */}
                        {groups.map((group, index) => (
                          <Fragment key={group.name}>
                            <tr className={`border-b ${isOpen(group.name) ? 'bg-blue-100 hover:bg-blue-100' : 'bg-white hover:bg-gray-50'}`}>
                              <td className={`py-3 px-4 text-center text-gray-600 border-l-4 ${isOpen(group.name) ? 'border-l-blue-500' : 'border-l-transparent'}`}>{index + 1}</td>
                              <td colSpan={2} className="py-3 px-4">
                                <button
                                  onClick={() => toggle(group.name)}
                                  className="flex items-center gap-2 font-semibold text-gray-800 hover:text-blue-600"
                                  title={isOpen(group.name) ? 'Thu gọn' : 'Mở rộng'}
                                >
                                  {isOpen(group.name) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  {group.name}
                                </button>
                              </td>
                              <td className="py-3 px-4 text-right font-semibold text-gray-800">{group.total.toLocaleString()}</td>
                              <td colSpan={2} />
                            </tr>
                            {isOpen(group.name) &&
                              group.items.map((item, i) => (
                                <ProductRow key={item.id} item={item} index={i + 1} nested onView={setSelectedProduct} />
                              ))}
                          </Fragment>
                        ))}

                        {/* Sản phẩm không có danh mục */}
                        {standalone.map((item, i) => (
                          <ProductRow key={item.id} item={item} index={groups.length + i + 1} onView={setSelectedProduct} />
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {selectedProduct && (
            <DetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onZoom={setLightbox} />
          )}
          {selectedProduct && lightbox && <ImageLightbox image={lightbox} onClose={() => setLightbox(null)} />}
        </div>
      </div>
    </div>
  )
}

function ProductRow({ item, index, nested = false, onView }: { item: Product; index: number; nested?: boolean; onView: (p: Product) => void }) {
  return (
    <tr className={`border-b ${nested ? 'bg-blue-50 border-blue-100 hover:bg-blue-100/70' : 'hover:bg-gray-50'}`}>
      <td className={`py-3 px-4 text-center text-gray-600 ${nested ? 'border-l-4 border-l-blue-500' : ''}`}>{index}</td>
      <td className={`py-3 font-mono font-medium text-blue-600 ${nested ? 'pl-10 pr-4' : 'px-4'}`}>{item.code}</td>
      <td className="py-3 px-4 font-medium text-gray-800">{item.name}</td>
      <td className="py-3 px-4 text-right font-medium text-gray-800">{item.quantity.toLocaleString()} {item.unit}</td>
      <td className="py-3 px-4 text-center"><Checkbox checked={!!item.productImage} disabled /></td>
      <td className="py-3 px-4 text-center">
        <Button variant="ghost" size="sm" onClick={() => onView(item)} className="hover:bg-blue-100 text-blue-600">
          <Eye className="h-4 w-4 mr-1" /> Xem
        </Button>
      </td>
    </tr>
  )
}

function DetailModal({ product, onClose, onZoom }: { product: Product; onClose: () => void; onZoom: (image: Lightbox) => void }) {
  const images = [
    { src: product.productImage, label: '📷 Hình ảnh sản phẩm', alt: product.name, className: 'h-64 border-blue-200' },
    { src: product.locationImage, label: '📍 Ảnh vị trí kho', alt: 'Vị trí', className: 'h-48 border-gray-200' },
  ]
  const fields = [
    { label: 'Đơn vị tính', value: product.unit },
    { label: 'Số lượng tồn', value: `${product.quantity.toLocaleString()} ${product.unit}`, className: 'font-bold text-green-600' },
    { label: 'Khối lượng', value: `${product.weight} - ${product.weightUnit}` },
    { label: 'Vị trí', value: product.location },
    { label: 'Ngày nhập liệu', value: product.importDate, wide: true },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto border-2 border-sky-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">Thông Tin Sản Phẩm</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <div className="mb-4 p-4 bg-sky-50 rounded-xl border border-sky-200">
          <p className="text-lg font-bold text-gray-800">{product.name}</p>
          <p className="text-sm font-mono text-sky-600">{product.code}</p>
        </div>

        {images.map(({ src, label, alt, className }) =>
          src ? (
            <div key={label} className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">{label}</p>
                <Button variant="ghost" size="sm" onClick={() => onZoom({ src, alt })} className="text-blue-600 hover:bg-blue-100">
                  <Maximize2 className="h-4 w-4 mr-1" /> Xem ảnh
                </Button>
              </div>
              <img src={src} alt={alt} className={`w-full object-cover rounded-xl border-2 ${className}`} />
            </div>
          ) : null
        )}

        <div className="grid grid-cols-2 gap-4">
          {fields.map(({ label, value, className, wide }) => (
            <div key={label} className={`p-3 bg-gray-50 rounded-xl ${wide ? 'col-span-2' : ''}`}>
              <p className="text-sm text-gray-500 mb-1">{label}</p>
              <p className={className || 'font-medium'}>{value}</p>
            </div>
          ))}
        </div>

        <Button variant="outline" onClick={onClose} className="w-full mt-6">Đóng</Button>
      </div>
    </div>
  )
}

// Xem ảnh toàn bộ (bấm nền / X / Esc để đóng)
function ImageLightbox({ image, onClose }: { image: Lightbox; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg" title="Đóng">
        <X className="w-6 h-6 text-white" />
      </button>
      <img src={image.src} alt={image.alt} className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
    </div>
  )
}