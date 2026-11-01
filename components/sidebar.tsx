// ==========================================
// SIDEBAR - Thanh điều hướng bên trái
// ==========================================
// Thanh menu chính của hệ thống, hiển thị:
// - Logo và tên công ty BIWASE - Long An
// - Các mục menu điều hướng (Dashboard, Kho, Tồn kho...)
// - Thông tin người dùng đang đăng nhập
// - Nút đăng xuất
//
// RESPONSIVE:
// - Desktop (md+): Sidebar cố định bên trái, width 256px
// - Mobile (<md): Sidebar ẩn, hiện hamburger button
//   Khi bấm hamburger → sidebar trượt từ trái ra
//
// MÀU SẮC: Gradient xanh dương (sky-600 → sky-800)
// phù hợp với thương hiệu công ty nước
// ==========================================

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, Package, Users, LogOut as LogOut2, Archive, History, UserCog, Menu, X, Droplets } from 'lucide-react'
import Image from 'next/image'

// ------------------------------------------
// DANH SÁCH CÁC MỤC MENU
// Mỗi mục gồm: id, label (tên hiển thị), icon, href (đường dẫn)
// Thứ tự hiển thị từ trên xuống dưới
// ------------------------------------------
const MENU_ITEMS = [
  { id: 'dashboard', label: 'Thông Tin Nhân Viên', icon: User, href: '/dashboard' },
  { id: 'warehouse', label: 'Quản Lý Kho', icon: Package, href: '/warehouse' },
  { id: 'inventory', label: 'Tồn Kho', icon: Archive, href: '/inventory' },
  { id: 'history', label: 'Lịch Sử Kho', icon: History, href: '/history' },
  { id: 'account', label: 'Tài Khoản', icon: UserCog, href: '/account' },
]

export function Sidebar() {
  // pathname: đường dẫn hiện tại, dùng để xác định menu nào đang active
  const pathname = usePathname()

  // State quản lý sidebar trên mobile (mở/đóng)
  const [isOpen, setIsOpen] = useState(false)

  // State lưu tên người dùng đang đăng nhập
  const [userName, setUserName] = useState('User')

  // ------------------------------------------
  // Khi component mount: đọc thông tin user từ localStorage
  // để hiển thị tên thay vì text "User" mặc định
  // ------------------------------------------
  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        const parsed = JSON.parse(userData)
        setUserName(parsed.name || parsed.username || 'User')
      } catch {
        setUserName('User')
      }
    }
  }, [])

  // ------------------------------------------
  // Khi chuyển trang trên mobile: tự động đóng sidebar
  // ------------------------------------------
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // ------------------------------------------
  // Xử lý đăng xuất: xóa thông tin user và chuyển về trang login
  // ------------------------------------------
  const handleLogout = () => {
    localStorage.removeItem('user')
    window.location.href = '/'
  }

  return (
    <>
      {/* ====================================== */}
      {/* NÚT HAMBURGER - Chỉ hiện trên mobile  */}
      {/* Khi bấm sẽ mở/đóng sidebar            */}
      {/* ====================================== */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-[60] p-2 bg-sky-600 text-white rounded-lg shadow-lg hover:bg-sky-700 transition-colors"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* ====================================== */}
      {/* OVERLAY - Nền mờ khi sidebar mở (mobile) */}
      {/* Bấm vào overlay sẽ đóng sidebar         */}
      {/* ====================================== */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-[45] backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* ====================================== */}
      {/* SIDEBAR CHÍNH                          */}
      {/* Desktop: luôn hiện, fixed bên trái     */}
      {/* Mobile: ẩn mặc định, trượt ra khi mở  */}
      {/* ====================================== */}
      <div
        className={`
          h-screen w-64 fixed left-0 top-0 z-[50]
          flex flex-col
          bg-gradient-to-b from-sky-600 via-sky-700 to-sky-800
          shadow-2xl
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
      >
        {/* ====================================== */}
        {/* PHẦN LOGO + TÊN CÔNG TY               */}
        {/* Hiển thị logo BIWASE và tên công ty    */}
        {/* ====================================== */}
        <div className="p-5 border-b border-white/15 flex flex-col items-center justify-center">
          {/* Logo công ty */}
          <div className="bg-white rounded-2xl p-2 shadow-lg mb-3">
            <Image
              src="/logo.png"
              alt="BIWASE LONG AN"
              width={70}
              height={70}
              className="object-contain"
            />
          </div>
          {/* Tên công ty - cập nhật theo yêu cầu */}
          <p className="text-xs font-semibold text-white/90 text-center leading-tight">
            Công ty cổ phần nước
          </p>
          <p className="text-sm font-bold text-white text-center">
            BIWASE LONG AN
          </p>
        </div>

        {/* ====================================== */}
        {/* PHẦN MENU ĐIỀU HƯỚNG                   */}
        {/* Danh sách các trang trong hệ thống     */}
        {/* Menu active: nền trắng, chữ xanh       */}
        {/* Menu hover: nền trắng mờ               */}
        {/* ====================================== */}
        <nav className="flex-1 p-3 flex flex-col gap-1.5 overflow-y-auto">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon
            // Kiểm tra menu hiện tại có đang active không
            const isActive = pathname === item.href
            return (
              <Link key={item.id} href={item.href}>
                <button
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl
                    transition-all duration-200
                    ${isActive
                      ? 'bg-white text-sky-700 shadow-md font-semibold'
                      : 'text-white/80 hover:bg-white/15 hover:text-white'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-sky-600' : ''}`} />
                  <span className="text-sm">{item.label}</span>
                </button>
              </Link>
            )
          })}
        </nav>

        {/* ====================================== */}
        {/* PHẦN THÔNG TIN USER + ĐĂNG XUẤT        */}
        {/* Hiển thị tên người đăng nhập (lấy từ   */}
        {/* localStorage) và nút đăng xuất          */}
        {/* ====================================== */}
        <div className="p-3 border-t border-white/15 space-y-2">
          {/* Khung hiển thị tên user đang đăng nhập */}
          <div className="px-3 py-3 bg-white/10 rounded-xl backdrop-blur-sm">
            <p className="text-xs text-white/60">Đăng nhập như</p>
            <p className="text-sm font-semibold text-white truncate" id="user-name">
              {userName}
            </p>
          </div>
          {/* Nút đăng xuất */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-white/70 hover:bg-red-500/20 hover:text-red-200 transition-all duration-200"
          >
            <LogOut2 className="w-4 h-4" />
            <span className="text-sm">Đăng Xuất</span>
          </button>
        </div>
      </div>
    </>
  )
}
