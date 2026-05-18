import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import AnimatedAvatar, { AvatarConfig } from './AnimatedAvatar'
import { useGlobalSocket } from '../contexts/SocketContext'

function getUserAvatar(): AvatarConfig | null {
  try {
    const stored = localStorage.getItem('uchat_user')
    if (stored) {
      const data = JSON.parse(stored)
      return data.avatar || data.avatar_config || null
    }
  } catch { /* ignore */ }
  return null
}

const TABS = [
  {
    path: '/discover',
    label: '发现',
    badge: 0,
    icon: (active: boolean) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#52525b'} strokeWidth="1.8">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    path: '/circles',
    label: '圈子',
    badge: 0,
    icon: (active: boolean) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#52525b'} strokeWidth="1.8">
        <circle cx="9" cy="12" r="5" />
        <circle cx="15" cy="12" r="5" />
        <circle cx="12" cy="8" r="5" />
      </svg>
    ),
  },
  {
    path: '/live',
    label: '对话',
    badge: 0,
    icon: (active: boolean) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#52525b'} strokeWidth="1.8">
        <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    path: '/plaza',
    label: '广场',
    badge: 0,
    live: true,
    icon: (active: boolean) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#52525b'} strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    path: '/profile',
    label: '我的',
    badge: 0,
    useAvatar: true,
    icon: (active: boolean) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#52525b'} strokeWidth="1.8">
        <circle cx="12" cy="8" r="4" />
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" />
      </svg>
    ),
  },
]

export default function TabBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { unreadCount } = useGlobalSocket()
  const [userAvatar, setUserAvatar] = useState<AvatarConfig | null>(null)

  useEffect(() => {
    setUserAvatar(getUserAvatar())
    const onStorage = () => setUserAvatar(getUserAvatar())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-black/90 backdrop-blur-md border-t border-zinc-900 z-50">
      <div className="flex items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {TABS.map((tab) => {
          const active = location.pathname === tab.path || location.pathname.startsWith(tab.path + '/')
          const showAvatar = 'useAvatar' in tab && tab.useAvatar && userAvatar
          return (
            <motion.button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              whileTap={{ scale: 0.85 }}
              className="flex flex-col items-center gap-0.5 py-1 px-4 relative"
            >
              <div className="relative">
                {showAvatar ? (
                  <div className={`rounded-full ${active ? 'ring-1 ring-white/80 ring-offset-1 ring-offset-black' : 'opacity-60'}`}>
                    <AnimatedAvatar config={userAvatar} size={22} />
                  </div>
                ) : (
                  tab.icon(active)
                )}
                {tab.path === '/live' && unreadCount > 0 && (
                  <div className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full bg-white flex items-center justify-center">
                    <span className="text-[9px] font-medium text-black px-1">{unreadCount}</span>
                  </div>
                )}
                {'live' in tab && tab.live && !active && (
                  <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </div>
              <span className={`text-[10px] ${active ? 'text-white' : 'text-zinc-600'}`}>
                {tab.label}
              </span>
              {active && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-white"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
