const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '')

// --- Token management ---

export function getToken(): string | null {
  return localStorage.getItem('uchat_token')
}

export function setToken(token: string) {
  localStorage.setItem('uchat_token', token)
}

export function clearToken() {
  localStorage.removeItem('uchat_token')
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' }
}

// --- Auth ---

export async function register(
  inviteCode: string,
  nickname: string,
  password: string,
  avatarConfig: Record<string, unknown> | object,
  answers?: Record<string, string>
) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invite_code: inviteCode, nickname, password, avatar_config: avatarConfig, answers: answers || {} }),
  })
  if (!res.ok) throw new Error((await res.json()).detail || 'Registration failed')
  const data = await res.json()
  setToken(data.token)
  return data
}

export async function login(nickname: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname, password }),
  })
  if (!res.ok) throw new Error((await res.json()).detail || '用户不存在')
  const data = await res.json()
  setToken(data.token)
  return data
}

export async function guestLogin(nickname: string, avatarConfig: Record<string, unknown> | object) {
  const res = await fetch(`${API_BASE}/api/auth/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname, avatar_config: avatarConfig }),
  })
  if (!res.ok) throw new Error((await res.json()).detail || 'Guest login failed')
  const data = await res.json()
  setToken(data.token)
  return data
}

// --- User ---

export async function getMe() {
  const res = await fetch(`${API_BASE}/api/users/me`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Not authenticated')
  return res.json()
}

export async function updateProfile(data: { nickname?: string; avatar_config?: Record<string, unknown> | object }) {
  const res = await fetch(`${API_BASE}/api/users/me`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function getMyStats() {
  const res = await fetch(`${API_BASE}/api/users/me/stats`, { headers: authHeaders() })
  if (!res.ok) return { conversations: 0, circles: 0, invited: 0 }
  return res.json()
}

export async function getMyGraph() {
  const res = await fetch(`${API_BASE}/api/users/me/graph`, { headers: authHeaders() })
  if (!res.ok) return { nodes: [], edges: [] }
  return res.json()
}

// --- AI ---

export async function fetchAIPersonas() {
  const res = await fetch(`${API_BASE}/api/ai/personas`)
  return res.json()
}

export async function sendAIMessage(
  personaId: string,
  message: string,
  history: { role: string; content: string }[]
) {
  const res = await fetch(`${API_BASE}/api/ai/chat`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ persona_id: personaId, message, history }),
  })
  return res
}

export async function getAIImpression(answers: Record<string, string>): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/api/ai/impression`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ answers }),
    })
    const data = await res.json()
    return data.impression || '独特的视角，等待被看见。'
  } catch {
    return '独特的视角，等待被看见。'
  }
}

export async function suggestReply(messages: { role: string; content: string }[]): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/api/ai/suggest-reply`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ messages }),
    })
    const data = await res.json()
    return data.reply || ''
  } catch {
    return ''
  }
}

// --- File Upload ---

export async function uploadFile(file: File): Promise<{ url: string; type: string }> {
  const formData = new FormData()
  formData.append('file', file)
  const token = getToken()
  const res = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  if (!res.ok) throw new Error((await res.json()).detail || 'Upload failed')
  return res.json()
}

// --- Insights ---

export async function generateInsight(conversationId: string): Promise<{ id: string; content: string; created_at: string }> {
  const res = await fetch(`${API_BASE}/api/conversations/${conversationId}/insight`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to generate insight')
  return res.json()
}

export async function getConversationInsight(conversationId: string): Promise<{ id: string; content: string; created_at: string } | null> {
  const res = await fetch(`${API_BASE}/api/conversations/${conversationId}/insight`, { headers: authHeaders() })
  if (!res.ok) return null
  return res.json()
}

export async function getMyInsights(): Promise<Array<{ id: string; content: string; conversation_id: string; created_at: string; peer: { user_id: string; nickname: string; avatar_config: any } | null }>> {
  const res = await fetch(`${API_BASE}/api/users/me/insights`, { headers: authHeaders() })
  if (!res.ok) return []
  return res.json()
}

// --- Conversations ---

export async function getConversations() {
  const res = await fetch(`${API_BASE}/api/conversations`, { headers: authHeaders() })
  if (!res.ok) return []
  return res.json()
}

export async function createConversation(type: 'direct' | 'ai' | 'group', opts: {
  peer_id?: string
  ai_persona?: string
  name?: string
}) {
  const res = await fetch(`${API_BASE}/api/conversations`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ type, ...opts }),
  })
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create conversation')
  return res.json()
}

export async function getMessages(conversationId: string, before?: string, limit = 30) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (before) params.set('before', before)
  const res = await fetch(
    `${API_BASE}/api/conversations/${conversationId}/messages?${params}`,
    { headers: authHeaders() }
  )
  if (!res.ok) return []
  return res.json()
}

export async function sendMessage(conversationId: string, content: string, type = 'text') {
  const res = await fetch(`${API_BASE}/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ content, type }),
  })
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to send message')
  return res.json()
}

export async function markRead(conversationId: string) {
  await fetch(`${API_BASE}/api/conversations/${conversationId}/read`, {
    method: 'POST',
    headers: authHeaders(),
  })
}

// --- Circles ---

export async function createCircle(data: { name: string; description?: string; category?: string; color?: string; icon?: string }) {
  const res = await fetch(`${API_BASE}/api/circles`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create circle')
  return res.json()
}

export async function getCircles() {
  const res = await fetch(`${API_BASE}/api/circles`, { headers: authHeaders() })
  if (!res.ok) return []
  return res.json()
}

export async function getCircle(circleId: string) {
  const res = await fetch(`${API_BASE}/api/circles/${circleId}`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Circle not found')
  return res.json()
}

export async function joinCircle(circleId: string) {
  const res = await fetch(`${API_BASE}/api/circles/${circleId}/join`, {
    method: 'POST',
    headers: authHeaders(),
  })
  return res.json()
}

export async function leaveCircle(circleId: string) {
  const res = await fetch(`${API_BASE}/api/circles/${circleId}/leave`, {
    method: 'POST',
    headers: authHeaders(),
  })
  return res.json()
}

export async function getCirclePosts(circleId: string, before?: string, limit = 20) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (before) params.set('before', before)
  const res = await fetch(
    `${API_BASE}/api/circles/${circleId}/posts?${params}`,
    { headers: authHeaders() }
  )
  if (!res.ok) return []
  return res.json()
}

export async function createCirclePost(circleId: string, content: string) {
  const res = await fetch(`${API_BASE}/api/circles/${circleId}/posts`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ content }),
  })
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create post')
  return res.json()
}

export async function likeCirclePost(postId: string) {
  const res = await fetch(`${API_BASE}/api/circles/posts/${postId}/like`, {
    method: 'POST',
    headers: authHeaders(),
  })
  return res.json()
}

// --- Plaza ---

export async function getPlazaSnippets(page = 1, limit = 10) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  const res = await fetch(`${API_BASE}/api/plaza/snippets?${params}`, { headers: authHeaders() })
  if (!res.ok) return []
  return res.json()
}

export async function likePlazaSnippet(snippetId: string) {
  const res = await fetch(`${API_BASE}/api/plaza/snippets/${snippetId}/like`, {
    method: 'POST',
    headers: authHeaders(),
  })
  return res.json()
}

export async function getPlazaTopics() {
  const res = await fetch(`${API_BASE}/api/plaza/topics`, { headers: authHeaders() })
  if (!res.ok) return []
  return res.json()
}

export async function joinPlazaTopic(topicId: string) {
  const res = await fetch(`${API_BASE}/api/plaza/topics/${topicId}/join`, {
    method: 'POST',
    headers: authHeaders(),
  })
  return res.json()
}

// --- Match ---

export async function getRecommendations() {
  const res = await fetch(`${API_BASE}/api/match/recommendations`, { headers: authHeaders() })
  return res.json()
}

// --- Invites ---

export async function validateInvite(code: string) {
  const res = await fetch(`${API_BASE}/api/invites/validate/${code}`)
  return res.json()
}

export async function getMyInviteCodes() {
  const res = await fetch(`${API_BASE}/api/invites/my-codes`, { headers: authHeaders() })
  if (!res.ok) return []
  return res.json()
}
