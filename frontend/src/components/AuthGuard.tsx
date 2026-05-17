import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getToken, getMe } from '../services/api'

let cachedAuthStatus: 'checking' | 'authed' | 'denied' = 'checking'
let cachedToken: string | null = null

function syncUserToLocalStorage(apiUser: { user_id: string; nickname: string; avatar_config?: unknown; invite_code?: string }) {
  try {
    const existing = JSON.parse(localStorage.getItem('uchat_user') || '{}')
    const merged = {
      ...existing,
      id: apiUser.user_id,
      nickname: apiUser.nickname,
      avatar: apiUser.avatar_config || existing.avatar || existing.avatar_config,
      invite_code: apiUser.invite_code,
    }
    localStorage.setItem('uchat_user', JSON.stringify(merged))
  } catch { /* ignore */ }
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'authed' | 'denied'>(cachedAuthStatus)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      cachedAuthStatus = 'denied'
      cachedToken = null
      setStatus('denied')
      return
    }
    if (cachedAuthStatus === 'authed' && cachedToken === token) {
      setStatus('authed')
      return
    }
    getMe().then((user) => {
      syncUserToLocalStorage(user)
      cachedAuthStatus = 'authed'
      cachedToken = token
      setStatus('authed')
    }).catch(() => {
      cachedAuthStatus = 'denied'
      cachedToken = null
      setStatus('denied')
    })
  }, [])

  if (status === 'checking') return null
  if (status === 'denied') return <Navigate to="/" replace />
  return <>{children}</>
}
