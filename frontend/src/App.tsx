import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Landing from './pages/Landing'
import TabBar from './components/TabBar'
import AuthGuard from './components/AuthGuard'
import ErrorBoundary from './components/ErrorBoundary'

const CreateAvatar = lazy(() => import('./pages/CreateAvatar'))
const Discover = lazy(() => import('./pages/Discover'))
const Chat = lazy(() => import('./pages/Chat'))
const Profile = lazy(() => import('./pages/Profile'))
const Conversations = lazy(() => import('./pages/Conversations'))
const LiveChat = lazy(() => import('./pages/LiveChat'))
const SharePreview = lazy(() => import('./pages/SharePreview'))
const Plaza = lazy(() => import('./pages/Plaza'))
const Graph = lazy(() => import('./pages/Graph'))
const Circles = lazy(() => import('./pages/Circles'))
const CircleDetail = lazy(() => import('./pages/CircleDetail'))
const DemoShowcase = lazy(() => import('./pages/DemoShowcase'))

const TAB_PAGES = ['/discover', '/circles', '/live', '/plaza', '/profile']

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-zinc-900 animate-avatar-breathe flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border border-zinc-700 opacity-30" />
        </div>
        <div className="w-12 h-[1px] bg-zinc-800 animate-glow-breathe" />
      </div>
    </div>
  )
}

function AnimatedRoutes() {
  const location = useLocation()
  const showTabBar = TAB_PAGES.some((p) => location.pathname === p)

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-black relative border-x border-zinc-900/50">
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <Routes location={location}>
            <Route path="/" element={<Landing />} />
            <Route path="/create" element={<CreateAvatar />} />
            <Route path="/demo" element={<DemoShowcase />} />
            <Route path="/discover" element={<AuthGuard><Discover /></AuthGuard>} />
            <Route path="/circles" element={<AuthGuard><Circles /></AuthGuard>} />
            <Route path="/circles/:id" element={<AuthGuard><CircleDetail /></AuthGuard>} />
            <Route path="/chat/:id" element={<AuthGuard><Chat /></AuthGuard>} />
            <Route path="/profile" element={<AuthGuard><Profile /></AuthGuard>} />
            <Route path="/live" element={<AuthGuard><Conversations /></AuthGuard>} />
            <Route path="/live-chat" element={<AuthGuard><LiveChat /></AuthGuard>} />
            <Route path="/share" element={<AuthGuard><SharePreview /></AuthGuard>} />
            <Route path="/plaza" element={<AuthGuard><Plaza /></AuthGuard>} />
            <Route path="/graph" element={<AuthGuard><Graph /></AuthGuard>} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      {showTabBar && <TabBar />}
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  )
}

export default App
