// ==========================================
// ROOT LAYOUT - Layout gốc của toàn bộ ứng dụng
// ==========================================
// Font chữ: Sử dụng font Roboto (theo yêu cầu)
// Ngôn ngữ: Tiếng Việt (lang="vi")
// Analytics: Tích hợp Vercel Analytics
// ==========================================

import React from "react"
import type { Metadata } from 'next'
import { Roboto } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

// Cấu hình font Roboto với các weight cần thiết
// subsets 'latin' và 'vietnamese' để hỗ trợ tiếng Việt
const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
})

// Metadata SEO cho trang web
export const metadata: Metadata = {
  title: 'Công ty cổ phần nước BIWASE - LONG AN | Hệ Thống Quản Lý',
  description: 'Hệ thống quản lý Công ty cổ phần nước BIWASE - LONG AN - Quản lý kho, nhân sự và hoạt động công ty',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi">
      <body className={`${roboto.className} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
