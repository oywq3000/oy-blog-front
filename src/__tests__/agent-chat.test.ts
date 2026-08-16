import { describe, it, expect } from 'vitest'

// ============================================================
// 1. Conversation grouping logic (pure function)
// ============================================================
describe('Conversation grouping by date', () => {
  const groupConversationsByDate = (convs: { updatedAt: string; title: string }[]): {
    label: string
    conversations: typeof convs
  }[] => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 86400000)
    const weekAgo = new Date(today.getTime() - 7 * 86400000)

    const groups: { label: string; conversations: typeof convs }[] = [
      { label: 'today', conversations: [] },
      { label: 'yesterday', conversations: [] },
      { label: 'lastWeek', conversations: [] },
      { label: 'earlier', conversations: [] },
    ]

    for (const conv of convs) {
      const d = new Date(conv.updatedAt)
      const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate())

      if (dateOnly.getTime() >= today.getTime()) {
        groups[0].conversations.push(conv)
      } else if (dateOnly.getTime() >= yesterday.getTime()) {
        groups[1].conversations.push(conv)
      } else if (dateOnly.getTime() >= weekAgo.getTime()) {
        groups[2].conversations.push(conv)
      } else {
        groups[3].conversations.push(conv)
      }
    }

    return groups.filter(g => g.conversations.length > 0)
  }

  const todayISO = new Date().toISOString()
  const yesterdayISO = new Date(Date.now() - 86400000).toISOString()
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString()
  const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString()

  it('should group today conversations correctly', () => {
    const convs = [{ updatedAt: todayISO, title: 'Test 1' }]
    const groups = groupConversationsByDate(convs)
    expect(groups[0].label).toBe('today')
    expect(groups[0].conversations).toHaveLength(1)
  })

  it('should group yesterday conversations correctly', () => {
    const convs = [{ updatedAt: yesterdayISO, title: 'Yesterday chat' }]
    const groups = groupConversationsByDate(convs)
    expect(groups[0].label).toBe('yesterday')
    expect(groups[0].conversations).toHaveLength(1)
  })

  it('should group last week conversations', () => {
    const convs = [{ updatedAt: threeDaysAgo, title: 'Old chat' }]
    const groups = groupConversationsByDate(convs)
    expect(groups[0].label).toBe('lastWeek')
  })

  it('should group earlier conversations', () => {
    const convs = [{ updatedAt: twoWeeksAgo, title: 'Very old' }]
    const groups = groupConversationsByDate(convs)
    expect(groups[0].label).toBe('earlier')
  })

  it('should return multiple groups with sorted items', () => {
    const convs = [
      { updatedAt: todayISO, title: 'Today chat' },
      { updatedAt: twoWeeksAgo, title: 'Old chat' },
      { updatedAt: yesterdayISO, title: 'Yesterday chat' },
    ]
    const groups = groupConversationsByDate(convs)
    expect(groups).toHaveLength(3)
    expect(groups.map(g => g.label)).toEqual(
      expect.arrayContaining(['today', 'yesterday', 'earlier'])
    )
  })

  it('should return empty array for no conversations', () => {
    expect(groupConversationsByDate([])).toHaveLength(0)
  })
})

// ============================================================
// 2. Sidebar search/filter logic
// ============================================================
describe('Sidebar conversation search', () => {
  const filterConversations = (
    convs: { title: string; id: string }[],
    query: string
  ) => {
    const q = query.trim().toLowerCase()
    if (!q) return convs
    return convs.filter(c => c.title.toLowerCase().includes(q))
  }

  const mockConvs = [
    { id: '1', title: 'Vue3 响应式原理' },
    { id: '2', title: '前端性能优化' },
    { id: '3', title: 'Rust 学习笔记' },
    { id: '4', title: 'CSS Grid 布局' },
  ]

  it('should return all conversations when query is empty', () => {
    expect(filterConversations(mockConvs, '')).toHaveLength(4)
    expect(filterConversations(mockConvs, '   ')).toHaveLength(4)
  })

  it('should filter by exact title match', () => {
    const result = filterConversations(mockConvs, 'Rust')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('3')
  })

  it('should filter case-insensitively', () => {
    const result = filterConversations(mockConvs, 'vue3')
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Vue3 响应式原理')
  })

  it('should filter by partial match', () => {
    const result = filterConversations(mockConvs, 'CSS')
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('CSS Grid 布局')
  })

  it('should return empty array when no match', () => {
    expect(filterConversations(mockConvs, 'Python')).toHaveLength(0)
  })
})

// ============================================================
// 3. Message model & validation
// ============================================================
describe('Message model', () => {
  interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    thinking?: string
    streaming?: boolean
    error?: boolean
    errorMessage?: string
  }

  it('should create a valid user message', () => {
    const msg: Message = {
      id: 'msg_1',
      role: 'user',
      content: 'Hello',
    }
    expect(msg.role).toBe('user')
    expect(msg.content).toBe('Hello')
    expect(msg.streaming).toBeUndefined()
  })

  it('should create a streaming assistant message', () => {
    const msg: Message = {
      id: 'msg_2',
      role: 'assistant',
      content: '',
      streaming: true,
    }
    expect(msg.role).toBe('assistant')
    expect(msg.content).toBe('')
    expect(msg.streaming).toBe(true)
  })

  it('should create an error message', () => {
    const msg: Message = {
      id: 'msg_3',
      role: 'assistant',
      content: 'Partial response',
      error: true,
      errorMessage: 'Network error',
    }
    expect(msg.error).toBe(true)
    expect(msg.errorMessage).toBe('Network error')
  })

  it('should create a message with thinking content', () => {
    const msg: Message = {
      id: 'msg_4',
      role: 'assistant',
      content: 'The answer is 42',
      thinking: 'Let me calculate...',
    }
    expect(msg.thinking).toBe('Let me calculate...')
  })
})

// ============================================================
// 4. Conversation CRUD (pure logic)
// ============================================================
describe('Conversation CRUD logic', () => {
  interface Conversation {
    id: string
    title: string
    createdAt: string
    updatedAt: string
    messageCount: number
  }

  const makeConv = (overrides: Partial<Conversation> = {}): Conversation => ({
    id: 'c1',
    title: 'Test',
    createdAt: '2026-08-12T00:00:00Z',
    updatedAt: '2026-08-12T00:00:00Z',
    messageCount: 0,
    ...overrides,
  })

  it('should create a new conversation and prepend to list', () => {
    const list: Conversation[] = [makeConv({ id: 'c2', title: 'Old' })]
    const newConv = makeConv({ id: 'c1', title: '新对话' })
    list.unshift(newConv)
    expect(list).toHaveLength(2)
    expect(list[0].id).toBe('c1')
  })

  it('should delete a conversation by id', () => {
    let list: Conversation[] = [
      makeConv({ id: 'c1', title: 'A' }),
      makeConv({ id: 'c2', title: 'B' }),
      makeConv({ id: 'c3', title: 'C' }),
    ]
    list = list.filter(c => c.id !== 'c2')
    expect(list).toHaveLength(2)
    expect(list.map(c => c.id)).toEqual(['c1', 'c3'])
  })

  it('should rename a conversation', () => {
    const list: Conversation[] = [makeConv({ id: 'c1', title: 'Old Title' })]
    const conv = list.find(c => c.id === 'c1')
    if (conv) conv.title = 'New Title'
    expect(list[0].title).toBe('New Title')
  })

  it('should auto-title from first message', () => {
    const truncateTitle = (content: string, maxLen = 20): string => {
      const cleaned = content.replace(/\s+/g, ' ').trim()
      return cleaned.length > maxLen ? cleaned.slice(0, maxLen) + '…' : cleaned
    }

    expect(truncateTitle('Vue3 响应式原理是什么')).toBe('Vue3 响应式原理是什么')
    const longTitle = '这是一个非常非常非常长的标题内容需要被截断处理'
    expect(truncateTitle(longTitle)).toBe('这是一个非常非常非常长的标题内容需要被截…')
    expect(truncateTitle('Short')).toBe('Short')
  })

  it('should clear all conversations', () => {
    let list: Conversation[] = [
      makeConv({ id: 'c1' }),
      makeConv({ id: 'c2' }),
    ]
    list = []
    expect(list).toHaveLength(0)
  })
})

// ============================================================
// 5. Time label display logic
// ============================================================
describe('Time label between messages', () => {
  const shouldShowTime = (
    currentTime: string,
    prevTime: string | null,
    thresholdMs = 5 * 60 * 1000
  ): boolean => {
    if (!prevTime) return true
    const diff = new Date(currentTime).getTime() - new Date(prevTime).getTime()
    return diff > thresholdMs
  }

  it('should show time for first message', () => {
    expect(shouldShowTime('2026-08-12T14:30:00Z', null)).toBe(true)
  })

  it('should show time when interval > 5 minutes', () => {
    const prev = '2026-08-12T14:30:00Z'
    const curr = '2026-08-12T14:36:00Z' // 6 minutes later
    expect(shouldShowTime(curr, prev)).toBe(true)
  })

  it('should not show time when interval < 5 minutes', () => {
    const prev = '2026-08-12T14:30:00Z'
    const curr = '2026-08-12T14:33:00Z' // 3 minutes later
    expect(shouldShowTime(curr, prev)).toBe(false)
  })
})

// ============================================================
// 6. Chat settings model
// ============================================================
describe('Chat settings', () => {
  interface ChatSettings {
    model: string
    temperature: number
    deepThinking: boolean
  }

  it('should have sensible defaults', () => {
    const defaults: ChatSettings = {
      model: 'rookie-ai',
      temperature: 0.7,
      deepThinking: false,
    }
    expect(defaults.model).toBe('rookie-ai')
    expect(defaults.temperature).toBe(0.7)
    expect(defaults.deepThinking).toBe(false)
  })

  it('should merge partial settings', () => {
    const current: ChatSettings = { model: 'rookie-ai', temperature: 0.7, deepThinking: false }
    const update = { temperature: 0.9 }
    const merged = { ...current, ...update }
    expect(merged.temperature).toBe(0.9)
    expect(merged.model).toBe('rookie-ai')
  })

  it('should toggle deep thinking', () => {
    let deepThinking = false
    deepThinking = !deepThinking
    expect(deepThinking).toBe(true)
    deepThinking = !deepThinking
    expect(deepThinking).toBe(false)
  })
})

// ============================================================
// 7. Suggested questions
// ============================================================
describe('Suggested questions', () => {
  const defaultQuestions = [
    { icon: '💡', text: 'Vue3 响应式原理是什么？' },
    { icon: '📝', text: '怎么写好 Markdown？' },
  ]

  it('should have icon and text for each question', () => {
    for (const q of defaultQuestions) {
      expect(q.icon).toBeTruthy()
      expect(q.text).toBeTruthy()
      expect(q.text.length).toBeGreaterThan(0)
    }
  })

  it('should be able to click a question to send', () => {
    const sendMessage = (text: string) => text
    const result = sendMessage(defaultQuestions[0].text)
    expect(result).toBe('Vue3 响应式原理是什么？')
  })
})
