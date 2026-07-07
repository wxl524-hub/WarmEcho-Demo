import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'
import { useAuthStore } from './auth.js'

const STORAGE_KEY = 'warmecho_chat_messages'
const ARCHIVE_KEY = 'warmecho_chat_archive' // 跨月归档历史

// 情绪标签 -> 简短名 映射（与 ChatPage emotionTags 对齐）
const EMOTION_MAP = {
  '😔 难过': { id: 'sad', label: '难过', emoji: '😔' },
  '😰 焦虑': { id: 'anxious', label: '焦虑', emoji: '😰' },
  '😤 烦躁': { id: 'irritated', label: '烦躁', emoji: '😤' },
  '😢 孤独': { id: 'lonely', label: '孤独', emoji: '😢' },
  '😫 压力大': { id: 'stressed', label: '压力大', emoji: '😫' },
  '😴 失眠': { id: 'insomnia', label: '失眠', emoji: '😴' }
}

// 解析 emotion 字段为情绪 id
function parseEmotionId(emotionLabel) {
  if (!emotionLabel) return null
  if (EMOTION_MAP[emotionLabel]) return EMOTION_MAP[emotionLabel].id
  // 兼容可能直接传 id 的情况
  const ids = Object.values(EMOTION_MAP).map((e) => e.id)
  if (ids.includes(emotionLabel)) return emotionLabel
  return null
}

export const useChatStore = defineStore('chat', () => {
  // 从 localStorage 恢复消息
  const savedMessages = localStorage.getItem(STORAGE_KEY)
  const initialMessages = savedMessages
    ? JSON.parse(savedMessages)
    : [
        {
          id: 'sys-1',
          role: 'system',
          content: '嘿，你来了 ☺️ 我在这里，随时可以听你说。',
          time: new Date().toISOString(),
          emotion: null
        }
      ]

  const messages = ref(initialMessages)
  const currentEmotion = ref('')
  const loading = ref(false)

  // 持久化到 localStorage
  watch(
    messages,
    (val) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
    },
    { deep: true }
  )

  function addMessage(message) {
    const msg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: message.role || 'user',
      content: message.content,
      time: message.time || new Date().toISOString(),
      emotion: message.emotion || null
    }
    messages.value.push(msg)
    return msg
  }

  function setEmotion(emotion) {
    currentEmotion.value = emotion
  }

  function setLoading(val) {
    loading.value = val
  }

  function clearMessages() {
    messages.value = []
    localStorage.removeItem(STORAGE_KEY)
  }

  // ===== 云端同步 =====
  let syncing = false

  async function syncFromCloud() {
    const authStore = useAuthStore()
    if (!authStore.isLoggedIn()) return false

    if (syncing) return false
    syncing = true

    try {
      const res = await fetch('/api/messages', {
        headers: authStore.getAuthHeader()
      })
      if (res.ok) {
        const data = await res.json()
        const cloudMessages = data.messages || []
        
        if (cloudMessages.length > 0) {
          const localUserMessages = messages.value.filter(m => m.role === 'user').length
          const cloudUserMessages = cloudMessages.filter(m => m.role === 'user').length
          
          if (cloudUserMessages > localUserMessages) {
            const welcomeMsg = messages.value.find(m => m.role === 'system')
            const merged = welcomeMsg ? [welcomeMsg, ...cloudMessages] : cloudMessages
            messages.value = merged
          }
        }
        return true
      }
    } catch (err) {
      console.error('从云端同步聊天记录失败:', err)
    } finally {
      syncing = false
    }
    return false
  }

  async function clearCloudMessages() {
    const authStore = useAuthStore()
    if (!authStore.isLoggedIn()) return false

    try {
      const res = await fetch('/api/messages', {
        method: 'DELETE',
        headers: authStore.getAuthHeader()
      })
      return res.ok
    } catch (err) {
      console.error('清除云端聊天记录失败:', err)
      return false
    }
  }

  async function getCloudStats() {
    const authStore = useAuthStore()
    if (!authStore.isLoggedIn()) return null

    try {
      const res = await fetch('/api/messages/stats', {
        headers: authStore.getAuthHeader()
      })
      if (res.ok) {
        return await res.json()
      }
    } catch (err) {
      console.error('获取云端统计失败:', err)
    }
    return null
  }

  // ===== 成长轨迹统计 =====

  // 当前月份的倾诉消息（仅 user 角色）
  const monthUserMessages = computed(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    return messages.value.filter((msg) => {
      if (msg.role !== 'user') return false
      const d = new Date(msg.time)
      return d.getFullYear() === y && d.getMonth() === m
    })
  })

  // 本月倾诉次数
  const monthCount = computed(() => monthUserMessages.value.length)

  // 各情绪占比
  const monthEmotionStats = computed(() => {
    const counts = {}
    let total = 0
    monthUserMessages.value.forEach((msg) => {
      const eid = parseEmotionId(msg.emotion)
      if (eid) {
        counts[eid] = (counts[eid] || 0) + 1
        total++
      }
    })
    // 转为带百分比、emoji、label 的数组
    return Object.entries(EMOTION_MAP).map(([, info]) => {
      const c = counts[info.id] || 0
      return {
        id: info.id,
        label: info.label,
        emoji: info.emoji,
        count: c,
        percent: total > 0 ? Math.round((c / total) * 100) : 0
      }
    }).sort((a, b) => b.count - a.count)
  })

  // 主导情绪（占比最高）
  const dominantEmotion = computed(() => {
    const list = monthEmotionStats.value.filter((e) => e.count > 0)
    return list.length > 0 ? list[0] : null
  })

  // 最近 7 天每日倾诉次数（用于折线图）
  const weeklyTrend = computed(() => {
    const days = []
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      d.setHours(0, 0, 0, 0)
      const next = new Date(d)
      next.setDate(d.getDate() + 1)
      const count = messages.value.filter((msg) => {
        if (msg.role !== 'user') return false
        const t = new Date(msg.time)
        return t >= d && t < next
      }).length
      days.push({
        date: d,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        count
      })
    }
    return days
  })

  // 与上月对比（倾诉次数变化）
  const monthCompare = computed(() => {
    const now = new Date()
    const thisY = now.getFullYear()
    const thisM = now.getMonth()
    const lastM = thisM === 0 ? 11 : thisM - 1
    const lastY = thisM === 0 ? thisY - 1 : thisY

    const lastCount = messages.value.filter((msg) => {
      if (msg.role !== 'user') return false
      const d = new Date(msg.time)
      return d.getFullYear() === lastY && d.getMonth() === lastM
    }).length

    const diff = monthCount.value - lastCount
    return {
      lastCount,
      diff,
      trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
    }
  })

  // AI 个性化建议（基于主导情绪的本地规则，无需 API）
  const growthAdvice = computed(() => {
    const dom = dominantEmotion.value
    if (!dom) {
      return '本月还没有倾诉记录，开始记录心情，暖声会陪你看见自己的情绪轨迹。'
    }
    const adviceMap = {
      sad: '本月你常感到难过。允许自己低落，但也可以试着每天记下一件小事——哪怕是今天的阳光。慢慢地，你会发现光一直在。',
      anxious: '焦虑在本月频繁出现。试试深呼吸：吸气 4 秒，屏住 7 秒，呼气 8 秒。当你感到失控时，回到当下，脚踩实地。',
      irritated: '本月烦躁情绪较多。愤怒常常是疲惫的信号，给自己一些"什么都不做"的时间，也是善待自己。',
      lonely: '孤独感在反复出现。但你在暖声留下了这些字，就说明你愿意被听见。这本身就是连接的开始。',
      stressed: '压力一直跟着你。试着把"必须"换成"可以选择"，把"我应该"换成"我可以"。你不是任务清单，你是一个人。',
      insomnia: '失眠在本月打扰了你。睡前试试写下脑中盘旋的事——把它们从心里搬到纸上，让大脑得以休息。'
    }
    return adviceMap[dom.id] || '继续保持倾诉，情绪会被你慢慢看清。'
  })

  return {
    messages,
    currentEmotion,
    loading,
    addMessage,
    setEmotion,
    setLoading,
    clearMessages,
    // 云端同步
    syncFromCloud,
    clearCloudMessages,
    getCloudStats,
    // 成长轨迹
    monthCount,
    monthEmotionStats,
    dominantEmotion,
    weeklyTrend,
    monthCompare,
    growthAdvice
  }
})