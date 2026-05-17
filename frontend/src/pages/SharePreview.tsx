import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import html2canvas from 'html2canvas'
import ShareCard from '../components/ShareCard'
import MatchCard from '../components/MatchCard'
import ChatHighlightCard from '../components/ChatHighlightCard'
import LiveChatHighlightCard from '../components/LiveChatHighlightCard'
import GraphShareCard from '../components/GraphShareCard'
import { AvatarConfig } from '../components/AnimatedAvatar'
import { getAIImpression } from '../services/api'

interface UserData {
  nickname: string
  avatar: AvatarConfig
  answers: Record<string, string>
}

const DEFAULT_AVATAR: AvatarConfig = {
  face: 'oval', hair: 'wolf-cut', hairColor: '#a1a1aa',
  eyebrows: 'natural', eyes: 'almond', mouth: 'calm', ears: 'normal',
}

const MATCH_PEER: UserData = {
  nickname: '阿拉斯加',
  avatar: { face: 'square', hair: 'spiky', hairColor: '#d4d4d8', eyebrows: 'thick', eyes: 'almond', mouth: 'calm', ears: 'normal' },
  answers: { field: '科技/互联网', interest: 'AI 与未来' },
}

const SPARK_AVATAR: AvatarConfig = {
  face: 'oval', hair: 'side-part', hairColor: '#e4e4e7',
  eyebrows: 'natural', eyes: 'almond', mouth: 'calm', ears: 'normal',
}

const DEFAULT_IMPRESSION = '在安静和热闹之间，找到了自己的节奏。'

type CardType = 'personal' | 'match' | 'ai-chat' | 'highlight' | 'graph'

export default function SharePreview() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialCard = (['personal', 'match', 'ai-chat', 'highlight', 'graph'] as const).includes(searchParams.get('card') as CardType)
    ? searchParams.get('card') as CardType
    : 'personal'
  const [cardType, setCardType] = useState<CardType>(initialCard)
  const [saving, setSaving] = useState(false)
  const [impression, setImpression] = useState(DEFAULT_IMPRESSION)
  const [screenshotMode, setScreenshotMode] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const [userData, setUserData] = useState<UserData | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('uchat_user')
    if (stored) {
      try { setUserData(JSON.parse(stored)) } catch { /* ignore */ }
    }
  }, [])

  useEffect(() => {
    if (!userData?.answers || Object.keys(userData.answers).length === 0) return
    getAIImpression(userData.answers).then((text) => setImpression(text))
  }, [userData])

  const nickname = userData?.nickname || '匿名用户'
  const avatar = userData?.avatar || DEFAULT_AVATAR
  const answers = userData?.answers || {}
  const tags = [answers.field, answers.interest, answers.energy, answers.style].filter(Boolean)
  const [inviteCode] = useState(() => 'UCHT' + Math.random().toString(36).substring(2, 6).toUpperCase())

  const getWeChatCaption = useCallback((type: CardType): string => {
    const code = inviteCode
    const base = `邀请码 ${code} → uchat.app`
    const tagHint = tags.length > 0 ? tags[0] : ''
    switch (type) {
      case 'personal': return `AI 说我是「${tagHint || '独特视角的人'}」— 你猜你是什么？\n\nµChat · 信任链社交，不刷屏，只深聊\n${base}`
      case 'match': return `刚在 µChat 遇到一个聊了 ${Math.floor(5 + Math.random() * 15)} 分钟都停不下来的人\n\n一次有深度的对话 > 一百个点赞\n${base}`
      case 'ai-chat': return `和 AI 聊了一个让我重新思考的问题…\n\n好的产品让你忘记技术，只记住对话\nµChat ${base}`
      case 'highlight': return `"说得好像你偷看了我日记"\n\n— 在 µChat 的一段真实对话\n${base}`
      case 'graph': return `我的社交网络已覆盖 24 人 ✦ 每个连接都经过信任验证\n\nµChat · 亚熟人社交\n${base}`
    }
  }, [inviteCode, tags])

  const handleSave = useCallback(async () => {
    if (!cardRef.current || saving) return
    setSaving(true)
    setSaveSuccess(false)
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#000000',
        scale: 2,
        useCORS: true,
      })
      const link = document.createElement('a')
      link.download = `uchat-${nickname}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      try { await navigator.clipboard.writeText(getWeChatCaption(cardType)) } catch { /* clipboard may fail */ }
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 8000)
    } catch { /* save failed silently */ }
    setSaving(false)
  }, [saving, nickname, cardType, getWeChatCaption])

  return (
    <div className="min-h-screen bg-black flex flex-col items-center py-8 px-4">
      {/* Screenshot mode overlay */}
      <AnimatePresence>
        {screenshotMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setScreenshotMode(false)}
            className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center"
          >
            <div ref={cardRef} className="rounded-2xl overflow-hidden">
              {cardType === 'personal' ? (
                <ShareCard nickname={nickname} avatar={avatar} tags={tags} impression={impression} inviteCode={inviteCode} />
              ) : cardType === 'match' ? (
                <MatchCard
                  userA={{ nickname, avatar, tags }}
                  userB={{ nickname: MATCH_PEER.nickname, avatar: MATCH_PEER.avatar, tags: [MATCH_PEER.answers.field || '', MATCH_PEER.answers.interest || ''].filter(Boolean) }}
                  sharedTopics={5} topics={['你们对 AI 的未来有什么看法？', '推荐一个最近改变你想法的内容']} inviteCode={inviteCode}
                />
              ) : cardType === 'ai-chat' ? (
                <ChatHighlightCard
                  personaName="Spark" personaAvatar={SPARK_AVATAR} userAvatar={avatar}
                  messages={[
                    { content: '你觉得什么样的社交产品才值得用？', role: 'user' },
                    { content: '能让人忘记界面，只记住对话的那种。好产品应该像空气一样自然。', role: 'assistant' },
                    { content: '有道理，技术是手段不是目的', role: 'user' },
                    { content: '完全同意。最好的技术是让人感觉不到技术的存在。', role: 'assistant' },
                  ]}
                  topic="产品与设计" inviteCode={inviteCode}
                />
              ) : cardType === 'highlight' ? (
                <LiveChatHighlightCard
                  userA={{ name: nickname, avatar }} userB={{ name: MATCH_PEER.nickname, avatar: MATCH_PEER.avatar }}
                  messageCount={18} chemistryLabel="高度默契"
                  highlight="好的产品应该让人忘记技术的存在，只感受到人与人的温度"
                  topic="AI 与科技" duration="42 分钟" inviteCode={inviteCode}
                />
              ) : (
                <GraphShareCard nickname={nickname} avatar={avatar} connections={{ degree1: 3, degree2: 4, degree3: 1 }} totalReach={24} inviteCode={inviteCode} />
              )}
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-zinc-600 text-[11px] mt-6"
            >
              截图保存 · 点击任意处返回
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="w-full max-w-[430px] flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="text-zinc-500 text-sm">&larr; 返回</button>
        <h1 className="text-sm font-medium text-zinc-300">分享卡片</h1>
        <div className="w-12" />
      </div>

      {/* Card type tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto max-w-full px-2 pb-1">
        <button
          onClick={() => setCardType('personal')}
          className={`px-4 py-2 rounded-full text-xs transition-all flex-shrink-0 ${
            cardType === 'personal'
              ? 'bg-zinc-800 text-white border border-zinc-700'
              : 'text-zinc-500 border border-zinc-800'
          }`}
        >
          个人名片
        </button>
        <button
          onClick={() => setCardType('match')}
          className={`px-4 py-2 rounded-full text-xs transition-all flex-shrink-0 ${
            cardType === 'match'
              ? 'bg-zinc-800 text-white border border-zinc-700'
              : 'text-zinc-500 border border-zinc-800'
          }`}
        >
          社交链接卡
        </button>
        <button
          onClick={() => setCardType('ai-chat')}
          className={`px-4 py-2 rounded-full text-xs transition-all flex-shrink-0 ${
            cardType === 'ai-chat'
              ? 'bg-zinc-800 text-white border border-zinc-700'
              : 'text-zinc-500 border border-zinc-800'
          }`}
        >
          AI 对话
        </button>
        <button
          onClick={() => setCardType('highlight')}
          className={`px-4 py-2 rounded-full text-xs transition-all flex-shrink-0 ${
            cardType === 'highlight'
              ? 'bg-zinc-800 text-white border border-zinc-700'
              : 'text-zinc-500 border border-zinc-800'
          }`}
        >
          实时精华
        </button>
        <button
          onClick={() => setCardType('graph')}
          className={`px-4 py-2 rounded-full text-xs transition-all flex-shrink-0 ${
            cardType === 'graph'
              ? 'bg-zinc-800 text-white border border-zinc-700'
              : 'text-zinc-500 border border-zinc-800'
          }`}
        >
          社交图谱
        </button>
      </div>

      {/* Card */}
      <motion.div
        key={cardType}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-zinc-800/50"
        ref={cardRef}
      >
        {cardType === 'personal' ? (
          <ShareCard
            nickname={nickname}
            avatar={avatar}
            tags={tags}
            impression={impression}
            inviteCode={inviteCode}
          />
        ) : cardType === 'match' ? (
          <MatchCard
            userA={{ nickname, avatar, tags }}
            userB={{
              nickname: MATCH_PEER.nickname,
              avatar: MATCH_PEER.avatar,
              tags: [MATCH_PEER.answers.field || '', MATCH_PEER.answers.interest || ''].filter(Boolean),
            }}
            sharedTopics={5}
            topics={[
              '你们对 AI 的未来有什么看法？',
              '推荐一个最近改变你想法的内容',
            ]}
            inviteCode={inviteCode}
          />
        ) : cardType === 'ai-chat' ? (
          <ChatHighlightCard
            personaName="Spark"
            personaAvatar={SPARK_AVATAR}
            userAvatar={avatar}
            messages={[
              { content: '你觉得什么样的社交产品才值得用？', role: 'user' },
              { content: '能让人忘记界面，只记住对话的那种。好产品应该像空气一样自然。', role: 'assistant' },
              { content: '有道理，技术是手段不是目的', role: 'user' },
              { content: '完全同意。最好的技术是让人感觉不到技术的存在。', role: 'assistant' },
            ]}
            topic="产品与设计"
            inviteCode={inviteCode}
          />
        ) : cardType === 'highlight' ? (
          <LiveChatHighlightCard
            userA={{ name: nickname, avatar }}
            userB={{ name: MATCH_PEER.nickname, avatar: MATCH_PEER.avatar }}
            messageCount={18}
            chemistryLabel="高度默契"
            highlight="好的产品应该让人忘记技术的存在，只感受到人与人的温度"
            topic="AI 与科技"
            duration="42 分钟"
            inviteCode={inviteCode}
          />
        ) : (
          <GraphShareCard
            nickname={nickname}
            avatar={avatar}
            connections={{ degree1: 3, degree2: 4, degree3: 1 }}
            totalReach={24}
            inviteCode={inviteCode}
          />
        )}
      </motion.div>

      {/* Invite link copy */}
      <div className="mt-6 w-full max-w-[340px]">
        <div className="flex items-center gap-2 px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-zinc-600 mb-0.5">邀请链接</p>
            <p className="text-[12px] text-zinc-400 truncate font-mono">
              uchat.app/?code={inviteCode}
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              navigator.clipboard.writeText(`https://uchat.app/?code=${inviteCode}`).then(() => {
                setLinkCopied(true)
                setTimeout(() => setLinkCopied(false), 2000)
              }).catch(() => {})
            }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
              linkCopied ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-300'
            }`}
          >
            {linkCopied ? '已复制' : '复制'}
          </motion.button>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-5 text-center max-w-[300px]">
        <p className="text-zinc-300 text-sm font-medium mb-2">一键保存 + 复制文案</p>
        <p className="text-zinc-500 text-xs leading-relaxed">
          图片和朋友圈文案同时就绪，分享只需三步
        </p>
      </div>

      {/* Success toast with WeChat guide */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 w-full max-w-[340px]"
          >
            <div className="p-4 bg-zinc-900/95 border border-zinc-800 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-[12px] text-white font-medium">图片已保存，文案已复制</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5 text-[9px] text-zinc-400 font-medium">1</span>
                  <p className="text-[11px] text-zinc-500">打开微信 → 发现 → 朋友圈</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5 text-[9px] text-zinc-400 font-medium">2</span>
                  <p className="text-[11px] text-zinc-500">从相册选择刚保存的图片</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5 text-[9px] text-zinc-400 font-medium">3</span>
                  <p className="text-[11px] text-zinc-500">长按文字框粘贴文案，发布</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="mt-6 flex gap-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSave}
          disabled={saving}
          className={`px-6 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50 ${
            saveSuccess
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-white text-black'
          }`}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
              生成中
            </span>
          ) : saveSuccess ? '图片 + 文案已就绪' : '保存并复制文案'}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setScreenshotMode(true)}
          className="px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 text-sm font-medium"
        >
          截图模式
        </motion.button>
      </div>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate('/create')}
        className="mt-3 text-[12px] text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        修改形象
      </motion.button>
    </div>
  )
}
