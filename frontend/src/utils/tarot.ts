export interface TarotCard {
  id: string
  name: string
  symbol: string
  meaning: string
  keywords: string[]
  svgPath: string
  viewBox: string
}

export const MAJOR_ARCANA: TarotCard[] = [
  {
    id: 'fool',
    name: '愚人',
    symbol: '0',
    meaning: '新的开始，无限可能',
    keywords: ['开始', '尝试', '探索', '冒险', '第一次', '出发', '旅行', '未知', '好奇', '勇敢'],
    svgPath: 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 4c.5 0 1 .5 1 1s-.5 1-1 1-1-.5-1-1 .5-1 1-1zm-3 8l3-4 3 4',
    viewBox: '0 0 24 24',
  },
  {
    id: 'magician',
    name: '魔术师',
    symbol: 'I',
    meaning: '掌控与创造',
    keywords: ['创造', '技术', '能力', '掌控', '资源', '工具', '实现', '方法', '手段', '技巧', '代码', '编程', 'AI', '产品'],
    svgPath: 'M4 12c0-3 3.5-4 8-4s8 1 8 4-3.5 4-8 4-8-1-8-4z M12 4v2 M12 18v2 M12 10v4',
    viewBox: '0 0 24 24',
  },
  {
    id: 'priestess',
    name: '女祭司',
    symbol: 'II',
    meaning: '直觉与深层感知',
    keywords: ['直觉', '感觉', '潜意识', '秘密', '神秘', '内心', '感知', '灵感', '梦', '预感', '第六感'],
    svgPath: 'M15 5a7 7 0 01-6 14 7 7 0 106-14z',
    viewBox: '0 0 24 24',
  },
  {
    id: 'emperor',
    name: '皇帝',
    symbol: 'IV',
    meaning: '秩序与理性',
    keywords: ['规则', '秩序', '权威', '结构', '管理', '理性', '逻辑', '控制', '领导', '决策', '制度', '系统'],
    svgPath: 'M12 3l8 9-8 9-8-9z M12 7v10 M8 12h8',
    viewBox: '0 0 24 24',
  },
  {
    id: 'chariot',
    name: '战车',
    symbol: 'VII',
    meaning: '意志与突破',
    keywords: ['突破', '前进', '意志', '决心', '胜利', '目标', '努力', '坚持', '拼搏', '速度', '方向', '创业', '奋斗'],
    svgPath: 'M12 4l6 8H6z M12 12v8 M8 20h8',
    viewBox: '0 0 24 24',
  },
  {
    id: 'strength',
    name: '力量',
    symbol: 'VIII',
    meaning: '内在勇气',
    keywords: ['勇气', '力量', '坚强', '耐心', '克服', '面对', '挑战', '强大', '内心', '战胜', '压力'],
    svgPath: 'M4 12c0-3 3.5-4 8-4s8 1 8 4-3.5 4-8 4-8-1-8-4z M8 9c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5',
    viewBox: '0 0 24 24',
  },
  {
    id: 'hermit',
    name: '隐者',
    symbol: 'IX',
    meaning: '独处与智慧',
    keywords: ['独处', '思考', '智慧', '内省', '安静', '孤独', '沉淀', '反思', '顿悟', '哲学', '本质', '深度'],
    svgPath: 'M12 4v4 M10 4h4 M9 8l3 12 3-12 M12 12l-2 2 M12 14l2 2',
    viewBox: '0 0 24 24',
  },
  {
    id: 'wheel',
    name: '命运之轮',
    symbol: 'X',
    meaning: '转折与因果',
    keywords: ['命运', '变化', '转折', '机遇', '循环', '因果', '巧合', '时机', '运气', '周期', '规律'],
    svgPath: 'M12 3a9 9 0 100 18 9 9 0 000-18z M12 7v10 M7 12h10 M8.5 8.5l7 7 M15.5 8.5l-7 7',
    viewBox: '0 0 24 24',
  },
  {
    id: 'justice',
    name: '正义',
    symbol: 'XI',
    meaning: '真相与抉择',
    keywords: ['公平', '正义', '选择', '判断', '取舍', '真相', '对错', '价值', '原则', '底线', '道德'],
    svgPath: 'M12 3v18 M5 8h14 M5 8l2 6h0 M19 8l-2 6h0 M7 14a3 2 0 100-0 M17 14a3 2 0 110-0',
    viewBox: '0 0 24 24',
  },
  {
    id: 'tower',
    name: '塔',
    symbol: 'XVI',
    meaning: '颠覆与觉醒',
    keywords: ['颠覆', '打破', '觉醒', '危机', '改变', '崩塌', '重建', '真相', '震撼', '认知', '冲击'],
    svgPath: 'M8 21l4-18 4 18 M6 21h12 M10 9h4 M9 13h6 M14 5l3-2 M15 7l2-1',
    viewBox: '0 0 24 24',
  },
  {
    id: 'star',
    name: '星星',
    symbol: 'XVII',
    meaning: '希望与灵感',
    keywords: ['希望', '未来', '灵感', '梦想', '理想', '美好', '光', '信念', '可能', '愿景', '想象'],
    svgPath: 'M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6.4-4.8-6.4 4.8 2.4-7.2-6-4.8h7.6z',
    viewBox: '0 0 24 24',
  },
  {
    id: 'moon',
    name: '月亮',
    symbol: 'XVIII',
    meaning: '潜意识与幻象',
    keywords: ['情绪', '不安', '迷茫', '幻想', '夜', '恐惧', '潜意识', '暧昧', '不确定', '阴影'],
    svgPath: 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z',
    viewBox: '0 0 24 24',
  },
  {
    id: 'sun',
    name: '太阳',
    symbol: 'XIX',
    meaning: '光明与生命力',
    keywords: ['快乐', '成功', '活力', '阳光', '热情', '乐观', '自信', '能量', '温暖', '真实', '开心'],
    svgPath: 'M12 8a4 4 0 100 8 4 4 0 000-8z M12 2v2 M12 20v2 M4.93 4.93l1.41 1.41 M17.66 17.66l1.41 1.41 M2 12h2 M20 12h2 M4.93 19.07l1.41-1.41 M17.66 6.34l1.41-1.41',
    viewBox: '0 0 24 24',
  },
  {
    id: 'world',
    name: '世界',
    symbol: 'XXI',
    meaning: '圆满与整合',
    keywords: ['完成', '圆满', '世界', '整合', '成就', '旅程', '终点', '全局', '宏观', '格局', '视野'],
    svgPath: 'M12 3a9 9 0 100 18 9 9 0 000-18z M12 3c-2 3-3 6-3 9s1 6 3 9 M12 3c2 3 3 6 3 9s-1 6-3 9 M3 12h18',
    viewBox: '0 0 24 24',
  },
  {
    id: 'temperance',
    name: '节制',
    symbol: 'XIV',
    meaning: '平衡与融合',
    keywords: ['平衡', '调和', '中庸', '融合', '和谐', '节制', '耐心', '适度', '包容', '协调'],
    svgPath: 'M8 4l4 8-4 8 M16 4l-4 8 4 8 M8 12h8',
    viewBox: '0 0 24 24',
  },
  {
    id: 'death',
    name: '重生',
    symbol: 'XIII',
    meaning: '蜕变与新生',
    keywords: ['结束', '蜕变', '放下', '转变', '告别', '重新', '断舍离', '新生', '过去', '释然'],
    svgPath: 'M12 3v8 M8 7l4 4 4-4 M6 15a6 3 0 1012 0 M6 15c0 3 2.7 6 6 6s6-3 6-6',
    viewBox: '0 0 24 24',
  },
]

function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export function matchTarot(text: string): TarotCard {
  const lower = text.toLowerCase()
  let bestCard = MAJOR_ARCANA[0]
  let bestScore = 0

  for (const card of MAJOR_ARCANA) {
    let score = 0
    for (const kw of card.keywords) {
      if (lower.includes(kw)) score += 1
    }
    if (score > bestScore) {
      bestScore = score
      bestCard = card
    }
  }

  if (bestScore === 0) {
    const hash = simpleHash(text)
    return MAJOR_ARCANA[hash % MAJOR_ARCANA.length]
  }

  return bestCard
}

export interface ConstellationStar {
  x: number
  y: number
  size: number
  brightness: number
}

export interface ConstellationLine {
  from: number
  to: number
  opacity: number
}

export function generateConstellation(text: string, width: number, height: number): {
  stars: ConstellationStar[]
  lines: ConstellationLine[]
} {
  const hash = simpleHash(text)
  const starCount = 12 + (hash % 8)
  const stars: ConstellationStar[] = []

  for (let i = 0; i < starCount; i++) {
    const seed = simpleHash(text + i.toString())
    stars.push({
      x: (seed % (width - 40)) + 20,
      y: ((seed >> 8) % (height - 40)) + 20,
      size: 0.5 + (seed % 3) * 0.4,
      brightness: 0.15 + ((seed >> 4) % 10) * 0.04,
    })
  }

  const lines: ConstellationLine[] = []
  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      const dx = stars[i].x - stars[j].x
      const dy = stars[i].y - stars[j].y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const threshold = Math.min(width, height) * 0.35
      if (dist < threshold) {
        lines.push({
          from: i,
          to: j,
          opacity: Math.max(0.02, 0.08 * (1 - dist / threshold)),
        })
      }
    }
  }

  return { stars, lines }
}

export function getThoughtZodiac(messages: { content: string }[]): {
  expression: string
  depth: string
} {
  const allText = messages.map(m => m.content).join(' ')
  const len = allText.length

  const signs = ['白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼']
  const hash = simpleHash(allText)

  const expressionTraits: Record<string, string[]> = {
    '射手': ['探索', '尝试', '冒险', '旅行', '哲学', '自由'],
    '双子': ['多样', '交流', '好奇', '变化', '灵活', '想法'],
    '水瓶': ['创新', '未来', '独特', '技术', 'AI', '颠覆', '互联网'],
    '天秤': ['平衡', '美', '和谐', '公平', '设计', '审美'],
    '狮子': ['自信', '创造', '领导', '表达', '热情', '舞台'],
    '白羊': ['行动', '直接', '开始', '勇敢', '竞争', '速度'],
  }

  const depthTraits: Record<string, string[]> = {
    '天蝎': ['深度', '本质', '真相', '穿透', '极致', '核心', '洞察'],
    '摩羯': ['规划', '系统', '长期', '务实', '目标', '结构'],
    '双鱼': ['感受', '共情', '想象', '艺术', '情感', '灵魂'],
    '处女': ['细节', '分析', '完美', '逻辑', '准确', '优化'],
    '巨蟹': ['温暖', '关怀', '记忆', '安全', '信任', '归属'],
    '金牛': ['稳定', '价值', '品质', '积累', '感官', '享受'],
  }

  let bestExpr = signs[hash % signs.length]
  let bestExprScore = 0
  for (const [sign, keywords] of Object.entries(expressionTraits)) {
    const score = keywords.filter(kw => allText.includes(kw)).length
    if (score > bestExprScore) { bestExprScore = score; bestExpr = sign }
  }

  let bestDepth = signs[(hash >> 4) % signs.length]
  let bestDepthScore = 0
  for (const [sign, keywords] of Object.entries(depthTraits)) {
    const score = keywords.filter(kw => allText.includes(kw)).length
    if (score > bestDepthScore) { bestDepthScore = score; bestDepth = sign }
  }

  if (bestExpr === bestDepth) {
    const fallbacks = len > 200 ? ['天蝎', '摩羯', '双鱼'] : ['射手', '双子', '水瓶']
    bestDepth = fallbacks.find(s => s !== bestExpr) || '天蝎'
  }

  return { expression: bestExpr, depth: bestDepth }
}
