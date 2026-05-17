export interface ModerationResult {
  safe: boolean
  reason?: 'sexual' | 'political' | 'violent' | 'spam' | 'other'
  message?: string
}

// Base64-encoded pattern groups to avoid plain-text sensitive words in source
// Each entry: base64(word) — decoded at runtime for matching
const SEXUAL_PATTERNS = [
  'g+e/gA==', '5aaT5aWz', '5LiK5bqK', '57qm54iu', '5byA5oi/', '6KOk5L2T',
  '6Imy5oOF', '6buE54mH', '5YGa54ix', '6IOW5LiL', '4piF4piF4piF',
  '6Imy5q+N', 'c2V4', 'bnVkZQ==', 'cG9ybg==',
].map(b => atob(b))

const POLITICAL_PATTERNS = [
  '+mUU4pa3', '5YWt5Zub', '5q+b5rO95Lic', '5paH6Z2p', '5rOV6L2u5Yqf',
  '5Lmg6L+R5bmz', '6YKT5bCP5bmz', '5YWx5Lqn5YWa', '5rSq56eR', '5Y+N5YWx',
  '57uP57u/', '5rKm6Zm3', '5rOV6L2u', '5YWo6IO95',
].map(b => { try { return atob(b) } catch { return '' } }).filter(Boolean)

const VIOLENT_PATTERNS = [
  '5p2A5Lq6', '5pq06Kqo', '54K45by5', '5q275LiA5Liq', 'c3VpY2lkZQ==',
  '6Ieq5p2A', '5omp5Yiw', '5by55q2s',
].map(b => { try { return atob(b) } catch { return '' } }).filter(Boolean)

const SPAM_PATTERNS = [
  '5Yqg5b6u5L+h', 'V2VDaGF0', '5LqM57u0', '5YWN6LS5',
  '6LWa6ZKx', '5Yiw5omL', '6L2s6LSm',
].map(b => { try { return atob(b) } catch { return '' } }).filter(Boolean)

const REASON_MESSAGES: Record<string, string> = {
  sexual: '消息包含不当内容，请注意文明用语',
  political: '消息包含敏感内容，请修改后重试',
  violent: '消息包含暴力相关内容，请修改',
  spam: '消息疑似广告或诈骗信息，请确认',
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s​‌‍﻿]/g, '')
    .replace(/[，。！？、；：""''【】（）《》…—·\-_.!?,;:'"()\[\]{}]/g, '')
}

function matchPatterns(text: string, patterns: string[]): boolean {
  const norm = normalize(text)
  return patterns.some(p => {
    const np = normalize(p)
    return np.length > 0 && norm.includes(np)
  })
}

export function moderateContent(text: string): ModerationResult {
  if (!text || text.trim().length === 0) return { safe: true }

  if (matchPatterns(text, SEXUAL_PATTERNS)) {
    return { safe: false, reason: 'sexual', message: REASON_MESSAGES.sexual }
  }
  if (matchPatterns(text, POLITICAL_PATTERNS)) {
    return { safe: false, reason: 'political', message: REASON_MESSAGES.political }
  }
  if (matchPatterns(text, VIOLENT_PATTERNS)) {
    return { safe: false, reason: 'violent', message: REASON_MESSAGES.violent }
  }
  if (matchPatterns(text, SPAM_PATTERNS)) {
    return { safe: false, reason: 'spam', message: REASON_MESSAGES.spam }
  }

  return { safe: true }
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function moderateContentAsync(text: string): Promise<ModerationResult> {
  try {
    const res = await fetch(`${API_BASE}/api/moderation/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    })
    if (!res.ok) return { safe: true }
    return await res.json()
  } catch {
    return { safe: true }
  }
}
