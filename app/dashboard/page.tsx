'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Card, CardContent } from '@/components/ui/card'
import { User } from 'lucide-react'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) { window.location.href = '/'; return }
    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)
  }, [])

  if (!user) return <div className="flex items-center justify-center h-screen">Loading...</div>

  const displayName = user.name

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
          <div className="mb-8"><h1 className="text-3xl font-bold text-gray-800">Thông Tin Nhân Viên</h1></div>

          {/* Profile Header */}
          <Card className="mb-6 overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-sky-500 to-blue-600 relative">
              <div className="absolute -bottom-12 left-8">
                <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-lg border-4 border-white">
                  <User className="w-12 h-12 text-sky-600" />
                </div>
              </div>
            </div>
            <CardContent className="pt-16 pb-6 px-8">
              <h2 className="text-2xl font-bold text-gray-800">{displayName}</h2>
              <p className="text-sky-600 font-medium">{user.chucVu}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
