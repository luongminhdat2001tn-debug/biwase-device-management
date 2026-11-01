// ==========================================
// SUPABASE CLIENT - Kết nối đến Supabase
// ==========================================
// File này khởi tạo Supabase client dùng chung
// cho toàn bộ ứng dụng.
//
// CÁCH DÙNG:
//   import { supabase } from '@/lib/supabase'
//   const { data } = await supabase.from('accounts').select('*')
//
// CẤU HÌNH:
//   - NEXT_PUBLIC_SUPABASE_URL: URL project Supabase
//   - NEXT_PUBLIC_SUPABASE_ANON_KEY: anon/public key
//   - Cả 2 đều set trong .env.local
// ==========================================

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseKey)
