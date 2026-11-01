// ==========================================
// TRANG ĐĂNG NHẬP - Login Page
// ==========================================
// Trang đầu tiên khi mở hệ thống.
// Gồm:
// - Widget thời tiết + ngày tháng (góc trái trên)
// - Form đăng nhập (nửa trái màn hình)
// - Logo + tên công ty (nửa phải màn hình)
// - Hiệu ứng sóng nước (phía dưới)
//
// ĐĂNG NHẬP:
// - Kiểm tra username/password trong localStorage 'accounts'
// - Nếu chưa có dữ liệu → dùng danh sách tài khoản mặc định
// - Tài khoản admin: admin / admin123
//
// RESPONSIVE:
// - Desktop: chia 2 phần trái/phải
// - Mobile: logo trên, form dưới
//
// THỜI TIẾT:
// - Gọi Open-Meteo API (miễn phí, không cần API key)
// - Vị trí: Long An (lat=10.536, lon=106.413)
// ==========================================

'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { getAccountByCredentials } from '@/lib/db'

// ------------------------------------------
// COMPONENT: Widget Thời Tiết
// Hiển thị ngày tháng năm + thời tiết tại Long An
// Gọi API Open-Meteo (miễn phí, không cần key)
// ------------------------------------------
function WeatherWidget() {
  const [weather, setWeather] = useState<any>(null)
  const [currentDate, setCurrentDate] = useState('')
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    // Cập nhật ngày tháng
    const updateDateTime = () => {
      const now = new Date()
      setCurrentDate(now.toLocaleDateString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }))
      setCurrentTime(now.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit'
      }))
    }
    updateDateTime()
    const timer = setInterval(updateDateTime, 60000) // Cập nhật mỗi phút

    // Gọi API thời tiết cho Long An
    fetch('https://api.open-meteo.com/v1/forecast?latitude=10.536&longitude=106.413&current=temperature_2m,weather_code,relative_humidity_2m&timezone=Asia%2FHo_Chi_Minh')
      .then(res => res.json())
      .then(data => {
        if (data.current) setWeather(data.current)
      })
      .catch(() => {}) // Nếu lỗi thì bỏ qua, chỉ hiện ngày tháng

    return () => clearInterval(timer)
  }, [])

  // ------------------------------------------
  // Chuyển WMO weather code thành text + icon tiếng Việt
  // Tham khảo: https://open-meteo.com/en/docs
  // ------------------------------------------
  const getWeatherInfo = (code: number) => {
    if (code <= 1) return { text: 'Trời quang', icon: '☀️' }
    if (code <= 3) return { text: 'Có mây', icon: '⛅' }
    if (code <= 48) return { text: 'Sương mù', icon: '🌫️' }
    if (code <= 57) return { text: 'Mưa phùn', icon: '🌧️' }
    if (code <= 67) return { text: 'Mưa', icon: '🌧️' }
    if (code <= 77) return { text: 'Mưa tuyết', icon: '🌨️' }
    if (code <= 82) return { text: 'Mưa rào', icon: '🌦️' }
    return { text: 'Giông bão', icon: '⛈️' }
  }

  return (
    <div className="absolute top-4 left-4 z-10 bg-white/85 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-white/50 max-w-[260px]">
      {/* Ngày tháng năm */}
      <p className="text-sm font-medium text-gray-700 capitalize">{currentDate}</p>
      <p className="text-xs text-gray-500">{currentTime}</p>

      {/* Thông tin thời tiết (nếu API trả về) */}
      {weather && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
          <span className="text-2xl">{getWeatherInfo(weather.weather_code).icon}</span>
          <div>
            <p className="text-lg font-bold text-gray-800">{Math.round(weather.temperature_2m)}°C</p>
            <p className="text-xs text-gray-500">
              {getWeatherInfo(weather.weather_code).text} • Độ ẩm {weather.relative_humidity_2m}%
            </p>
          </div>
        </div>
      )}
      <p className="text-xs text-gray-400 mt-1">📍 Long An, Việt Nam</p>
    </div>
  )
}

// ------------------------------------------
// COMPONENT CHÍNH: Trang Đăng Nhập
// ------------------------------------------
export default function LoginPage() {
  const [signInUsername, setSignInUsername] = useState('')
  const [signInPassword, setSignInPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // ------------------------------------------
  // XỬ LÝ ĐĂNG NHẬP
  // 1. Gọi Supabase tìm tài khoản theo username + password
  // 2. Nếu đúng → lưu session vào localStorage → chuyển trang
  // 3. Nếu sai → hiển thị lỗi
  // ------------------------------------------
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Tìm tài khoản khớp username + password từ Supabase
      const account = await getAccountByCredentials(signInUsername, signInPassword)

      if (account) {
        // Đăng nhập thành công: lưu session
        localStorage.setItem('user', JSON.stringify(account))
        window.location.href = '/dashboard'
      } else {
        setError('Tên đăng nhập hoặc mật khẩu không đúng!')
      }
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full">
      {/* ====================================== */}
      {/* CONTAINER CHÍNH                        */}
      {/* Desktop: 2 phần (form trái + logo phải)*/}
      {/* Mobile: xếp dọc (logo trên + form dưới)*/}
      {/* ====================================== */}
      <div
        className="relative bg-white overflow-hidden w-full min-h-screen flex flex-col md:flex-row"
        id="container"
      >
        {/* ====================================== */}
        {/* WIDGET THỜI TIẾT + NGÀY THÁNG          */}
        {/* Góc trái trên, hiển thị thời tiết       */}
        {/* tại khu vực Long An                     */}
        {/* ====================================== */}
        <WeatherWidget />

        {/* ====================================== */}
        {/* HIỆU ỨNG SÓNG NƯỚC - Phía dưới        */}
        {/* 5 lớp sóng xanh dương chồng lên nhau  */}
        {/* Hiệu ứng chuyển động qua lại liên tục */}
        {/* ====================================== */}
        <div className="absolute bottom-0 left-0 w-full h-full overflow-hidden pointer-events-none z-[2]">
          {/* Sóng 1 - xanh đậm nhất */}
          <svg className="absolute bottom-0 -left-[25%] w-[150%] h-[35%] wave-animation wave-1" viewBox="0 0 1440 320" preserveAspectRatio="none">
            <path fill="#1e40af" d="M0,32L40,58.7C80,85,160,139,240,154.7C320,171,400,149,480,122.7C560,96,640,64,720,74.7C800,85,880,139,960,154.7C1040,171,1120,149,1200,128C1280,107,1360,85,1400,74.7L1440,64L1440,320L1400,320C1360,320,1280,320,1200,320C1120,320,1040,320,960,320C880,320,800,320,720,320C640,320,560,320,480,320C400,320,320,320,240,320C160,320,80,320,40,320L0,320Z"></path>
          </svg>
          {/* Sóng 2 - xanh vừa */}
          <svg className="absolute bottom-0 -left-[25%] w-[150%] h-[30%] wave-animation wave-2" viewBox="0 0 1440 320" preserveAspectRatio="none">
            <path fill="#2563eb" d="M0,64L40,96C80,128,160,192,240,197.3C320,203,400,149,480,128C560,107,640,117,720,138.7C800,160,880,192,960,186.7C1040,181,1120,139,1200,122.7C1280,107,1360,117,1400,122.7L1440,128L1440,320L1400,320C1360,320,1280,320,1200,320C1120,320,1040,320,960,320C880,320,800,320,720,320C640,320,560,320,480,320C400,320,320,320,240,320C160,320,80,320,40,320L0,320Z"></path>
          </svg>
          {/* Sóng 3 - xanh nhạt */}
          <svg className="absolute bottom-0 -left-[25%] w-[150%] h-[25%] wave-animation wave-3" viewBox="0 0 1440 320" preserveAspectRatio="none">
            <path fill="#3b82f6" d="M0,96L40,117.3C80,139,160,181,240,186.7C320,192,400,160,480,144C560,128,640,128,720,149.3C800,171,880,213,960,213.3C1040,213,1120,171,1200,149.3C1280,128,1360,128,1400,128L1440,128L1440,320L1400,320C1360,320,1280,320,1200,320C1120,320,1040,320,960,320C880,320,800,320,720,320C640,320,560,320,480,320C400,320,320,320,240,320C160,320,80,320,40,320L0,320Z"></path>
          </svg>
          {/* Sóng 4 - xanh sky */}
          <svg className="absolute bottom-0 -left-[25%] w-[150%] h-[18%] wave-animation wave-4" viewBox="0 0 1440 320" preserveAspectRatio="none">
            <path fill="#60a5fa" d="M0,128L40,149.3C80,171,160,213,240,218.7C320,224,400,192,480,176C560,160,640,160,720,176C800,192,880,224,960,224C1040,224,1120,192,1200,170.7C1280,149,1360,139,1400,133.3L1440,128L1440,320L1400,320C1360,320,1280,320,1200,320C1120,320,1040,320,960,320C880,320,800,320,720,320C640,320,560,320,480,320C400,320,320,320,240,320C160,320,80,320,40,320L0,320Z"></path>
          </svg>
          {/* Sóng 5 - xanh nhạt nhất */}
          <svg className="absolute bottom-0 -left-[25%] w-[150%] h-[12%] wave-animation wave-5" viewBox="0 0 1440 320" preserveAspectRatio="none">
            <path fill="#93c5fd" d="M0,160L40,176C80,192,160,224,240,229.3C320,235,400,213,480,192C560,171,640,149,720,160C800,171,880,213,960,218.7C1040,224,1120,192,1200,176C1280,160,1360,160,1400,160L1440,160L1440,320L1400,320C1360,320,1280,320,1200,320C1120,320,1040,320,960,320C880,320,800,320,720,320C640,320,560,320,480,320C400,320,320,320,240,320C160,320,80,320,40,320L0,320Z"></path>
          </svg>
        </div>

        {/* ====================================== */}
        {/* PHẦN LOGO + TÊN CÔNG TY (bên phải)    */}
        {/* Desktop: nửa phải, Mobile: phía trên   */}
        {/* Logo phóng to theo yêu cầu             */}
        {/* Chữ đẩy lên cao để tránh bị sóng che   */}
        {/* ====================================== */}
        <div
          className="md:order-2 md:w-1/2 w-full flex flex-col items-center justify-start px-8 text-center z-[3] py-8 md:py-0 md:pt-12"
          style={{ paddingBottom: '260px' }}
        >
          {/* Logo công ty - phóng to theo yêu cầu */}
          <div className="mb-6 md:mb-12">
            <Image
              src="/logo.png"
              alt="Công Ty Cổ Phần Nước BIWASE Long An"
              width={220}
              height={220}
              className="object-contain drop-shadow-lg w-[160px] h-[160px] md:w-[280px] md:h-[280px] lg:w-[340px] lg:h-[340px]"
            />
          </div>
          {/* Dòng chữ "Chào mừng" */}
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-8 tracking-tight text-gray-800">
            Chào mừng
          </h1>
          {/* Tên công ty - cập nhật theo yêu cầu */}
          <p className="text-xl md:text-3xl lg:text-4xl leading-relaxed tracking-wide mb-2 md:mb-4 font-bold text-gray-800">
            Công Ty Cổ Phần Nước BIWASE LONG AN
          </p>
          {/* Slogan */}
          <p className="text-base md:text-xl lg:text-2xl leading-8 tracking-wide opacity-70 font-light italic text-gray-600">
            Chất lượng tạo nên niềm tin
          </p>
        </div>

        {/* ====================================== */}
        {/* FORM ĐĂNG NHẬP (bên trái)              */}
        {/* Desktop: nửa trái, Mobile: phía dưới   */}
        {/* Gồm: username, password, nút đăng nhập */}
        {/* ====================================== */}
        <div className="md:order-1 md:w-1/2 w-full flex items-center justify-center z-[3] px-4 pb-8 md:pb-0">
          <form
            onSubmit={handleSignIn}
            className="bg-white/90 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none rounded-2xl md:rounded-none p-6 md:p-0 shadow-xl md:shadow-none flex flex-col items-center justify-center w-full max-w-[400px] mx-auto relative z-10"
          >
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Đăng Nhập</h1>

            {/* Thông báo lỗi khi đăng nhập sai */}
            {error && (
              <div className="w-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm mb-3">
                {error}
              </div>
            )}

            {/* Ô nhập tên đăng nhập */}
            <div className="relative w-full my-3">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </span>
              <input
                type="text"
                placeholder="Tên đăng nhập"
                value={signInUsername}
                onChange={(e) => setSignInUsername(e.target.value)}
                className="bg-gray-100 border-none py-3.5 pl-12 pr-5 text-base rounded-lg w-full outline-none focus:ring-2 focus:ring-[#0ea5e9]"
              />
            </div>

            {/* Ô nhập mật khẩu (có nút hiện/ẩn) */}
            <div className="relative w-full my-3">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Mật khẩu"
                value={signInPassword}
                onChange={(e) => setSignInPassword(e.target.value)}
                className="bg-gray-100 border-none py-3.5 pl-12 pr-12 text-base rounded-lg w-full outline-none focus:ring-2 focus:ring-[#0ea5e9]"
              />
              {/* Nút hiện/ẩn mật khẩu */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
              </button>
            </div>

            {/* Nhớ mật khẩu + Quên mật khẩu */}
            <div className="flex items-center justify-between w-full my-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-[#0284c7] cursor-pointer" />
                <span className="text-sm text-gray-700 font-medium">Nhớ mật khẩu</span>
              </label>
              <a href="#" className="text-sm font-semibold text-[#0284c7] hover:text-[#0369a1] hover:underline transition-colors">Quên mật khẩu?</a>
            </div>

            {/* Nút đăng nhập */}
            <button
              type="submit"
              className="bg-[#0284c7] text-white text-sm py-3.5 px-14 border border-transparent rounded-lg font-semibold tracking-wider uppercase mt-3 cursor-pointer hover:bg-[#0369a1] transition-colors w-full md:w-auto"
            >
              Đăng Nhập
            </button>
          </form>
        </div>
      </div>

      {/* ====================================== */}
      {/* CSS ANIMATION CHO HIỆU ỨNG SÓNG NƯỚC  */}
      {/* 5 sóng di chuyển với tốc độ khác nhau  */}
      {/* tạo hiệu ứng sóng biển chân thực       */}
      {/* ====================================== */}
      <style jsx>{`
        @keyframes waveFlow {
          0% { transform: translateX(-15%); }
          100% { transform: translateX(15%); }
        }
        .wave-animation { animation: waveFlow linear infinite alternate; }
        .wave-1 { animation-duration: 4s; }
        .wave-2 { animation-duration: 3s; animation-delay: 0.5s; }
        .wave-3 { animation-duration: 3.5s; animation-delay: 0.2s; }
        .wave-4 { animation-duration: 2.5s; animation-delay: 0.7s; }
        .wave-5 { animation-duration: 3.2s; animation-delay: 0.3s; }
      `}</style>
    </div>
  )
}
