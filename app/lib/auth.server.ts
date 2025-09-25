import { createSupabaseServerClient } from './supabase'

export async function requireUserId(request: Request) {
  const supabase = createSupabaseServerClient(request)
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new Response('Unauthorized', { status: 401 })
  }
  
  return user.id
}

export async function requireAdmin(request: Request) {
  const supabase = createSupabaseServerClient(request)
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new Response('Unauthorized', { status: 401 })
  }
  
  // 관리자 이메일 확인
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || []
  if (!adminEmails.includes(user.email || '')) {
    throw new Response('Forbidden - Admin access required', { status: 403 })
  }
  
  return user
}

export async function getUser(request: Request) {
  const supabase = createSupabaseServerClient(request)
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    return null
  }
  
  return user
}

export async function isAdmin(request: Request) {
  try {
    await requireAdmin(request)
    return true
  } catch {
    return false
  }
}