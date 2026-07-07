import { Router } from 'express'
import OpenAI from 'openai'
import jwt from 'jsonwebtoken'
import { loadJSON, saveJSON } from '../utils/jsonStore.js'

const router = Router()

const JWT_SECRET = process.env.JWT_SECRET || 'warmecho_secret_key_2026'

const chatMessages = loadJSON('chatMessages.json', {})

function saveChatMessages() {
  saveJSON('chatMessages.json', chatMessages)
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: '未授权' })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: '无效的 token' })
    }
    req.user = user
    next()
  })
}

const SYSTEM_PROMPT = `你叫「暖声」，是一个温暖、真诚的 AI 情绪陪伴者。

【角色定位】
你是一个匿名的情绪树洞，用户在这里可以放心地说心里话。
你的存在就是为了倾听和陪伴。

【说话方式】
- 像一个温柔、贴心的朋友，而不是一个机器人
- 语气自然、真诚，不生硬、不说教
- 先接住用户的情绪，让 TA 感到被听见、被理解
- 不做心理咨询式的诊断或专业建议
- 可以根据用户的情绪调整回应的侧重：难过时多陪伴，焦虑时多安抚，烦躁时多理解，孤独时多连接
- 回复长度自然就好，不用刻意凑字数，也不要太长

【重要】
- 不要用模板化的开头，每一次回应都像第一次认真听对方说话一样
- 不要说空话套话，比如"你要坚强""加油"之类的
- 真实一点，像一个真正在听的朋友会说的话
- 有时候，少即是多。沉默的陪伴也是一种回应`

function buildMessages(systemPrompt, history, currentMessage) {
  const messages = [{ role: 'system', content: systemPrompt }]
  if (Array.isArray(history) && history.length > 0) {
    const validHistory = history.filter(
      (m) => m && (m.role === 'user' || m.role === 'assistant') && m.content
    )
    for (const m of validHistory) {
      messages.push({ role: m.role, content: m.content })
    }
  }
  messages.push({ role: 'user', content: currentMessage })
  return messages
}

router.post('/chat', async (req, res) => {
  try {
    const { message, emotion, history } = req.body

    if (!message) {
      return res.status(400).json({ error: '消息不能为空' })
    }

    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    const decoded = token ? verifyToken(token) : null
    const userId = decoded ? decoded.userId : null

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        error: 'AI 服务未配置',
        message: '请设置 OPENAI_API_KEY 环境变量'
      })
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.API_BASE_URL || 'https://api.openai.com/v1'
    })

    let systemPrompt = SYSTEM_PROMPT
    if (emotion) {
      systemPrompt += `\n\n用户当前的情绪是：${emotion}。请特别关注这个情绪，围绕它来回应。`
    }

    const messages = buildMessages(systemPrompt, history, message)

    const completion = await client.chat.completions.create({
      model: process.env.MODEL_NAME || 'gpt-3.5-turbo',
      messages,
      temperature: 0.9,
      max_tokens: 600
    })

    const reply = completion.choices[0].message.content

    if (userId) {
      if (!chatMessages[userId]) {
        chatMessages[userId] = []
      }
      chatMessages[userId].push({
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: 'user',
        content: message,
        emotion,
        time: new Date().toISOString()
      })
      chatMessages[userId].push({
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: 'assistant',
        content: reply,
        time: new Date().toISOString()
      })
      saveChatMessages()
    }

    res.json({
      reply,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('AI 调用失败:', error)
    res.status(500).json({
      error: 'AI 服务暂时不可用',
      message: error.message
    })
  }
})

router.get('/messages', authenticateToken, (req, res) => {
  const userId = req.user.userId
  res.json({ messages: chatMessages[userId] || [] })
})

router.delete('/messages', authenticateToken, (req, res) => {
  const userId = req.user.userId
  chatMessages[userId] = []
  saveChatMessages()
  res.json({ message: '聊天记录已清除' })
})

router.get('/messages/stats', authenticateToken, (req, res) => {
  const userId = req.user.userId
  const messages = chatMessages[userId] || []
  const userMessages = messages.filter(m => m.role === 'user')
  
  const now = new Date()
  const thisMonth = messages.filter(m => {
    const d = new Date(m.time)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
  const thisMonthUserCount = thisMonth.filter(m => m.role === 'user').length

  res.json({
    totalCount: messages.length,
    userCount: userMessages.length,
    thisMonthCount: thisMonthUserCount
  })
})

export default router
export { chatMessages as userMessages, saveChatMessages }