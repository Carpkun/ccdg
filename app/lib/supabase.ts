import { createClient } from '@supabase/supabase-js'
import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!

// 클라이언트 사이드용 Supabase 클라이언트
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 서버 사이드용 Supabase 클라이언트
export function createSupabaseServerClient(request: Request) {
  const cookies = parseCookieHeader(request.headers.get('Cookie') ?? '')

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookies.map(cookie => ({
          name: cookie.name,
          value: cookie.value || ''
        }))
      },
      setAll(cookiesToSet) {
        // 이 함수는 Response에서 쿠키를 설정할 때 사용됩니다
        cookiesToSet.forEach(({ name, value, options }) => {
          const serialized = serializeCookieHeader(name, value, options)
          // 실제 응답에서 쿠키를 설정하는 로직은 각 라우트에서 처리
        })
      }
    }
  })
}

// 관리자용 서비스 롤 키 클라이언트 (서버 사이드만)
export function createSupabaseAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('Admin client는 서버에서만 사용할 수 있습니다.')
  }

  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}