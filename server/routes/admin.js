import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { users, saveUsers } from './auth.js'
import { userMessages, saveChatMessages } from './chat.js'

const router = express.Router()

const JWT_SECRET = process.env.JWT_SECRET || 'warmecho_secret_key_2026'
const ADMIN_JWT_EXPIRES_IN = '1d'

// 预置管理员账户（开发阶段硬编码，生产环境应改为数据库 + 环境变量）
// 启动时动态生成 bcrypt hash，避免硬编码 hash 失效问题
const ADMIN_ACCOUNTS = [
  {
    id: 'admin-001',
    username: 'admin',
    passwordHash: null, // 启动时填充
    plainPassword: 'admin123', // 仅开发用，生产环境删除
    nickname: '超级管理员',
    role: 'super_admin'
  }
]

;(async () => {
  for (const a of ADMIN_ACCOUNTS) {
    if (!a.passwordHash && a.plainPassword) {
      a.passwordHash = await bcrypt.hash(a.plainPassword, 10)
    }
  }
})()

// 简易回声墙与资源存储（内存，开发阶段）
export const galleryItems = [
  { id: 'g1', content: '今天的阳光特别温柔，像有人在远处想着我。', mood: '温暖', author: '匿名', createdAt: new Date().toISOString(), visible: true },
  { id: 'g2', content: '难过的时候，记得给自己泡一杯热茶。', mood: '安慰', author: '小溪', createdAt: new Date().toISOString(), visible: true }
]

export const resourceItems = [
  { id: 'r1', title: '北京心理危机研究与干预中心', type: 'hotline', url: '', desc: '24小时心理援助热线：010-82951332', visible: true, createdAt: new Date().toISOString() },
  { id: 'r2', title: '豆瓣心理学书单', type: 'link', url: 'https://book.douban.com/tag/心理学', desc: '心理学经典与入门书籍聚合', visible: true, createdAt: new Date().toISOString() }
]

// 管理员认证中间件
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: '未授权' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: '需要管理员权限' })
    }
    req.admin = decoded
    next()
  } catch (err) {
    return res.status(403).json({ message: '无效的管理员 token' })
  }
}

// 管理员登录
router.post('/login', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ message: '请输入账号和密码' })
  }

  const admin = ADMIN_ACCOUNTS.find(a => a.username === username)
  if (!admin) {
    return res.status(401).json({ message: '账号或密码错误' })
  }

  const valid = await bcrypt.compare(password, admin.passwordHash)
  if (!valid) {
    return res.status(401).json({ message: '账号或密码错误' })
  }

  const token = jwt.sign(
    { adminId: admin.id, username: admin.username, role: 'admin' },
    JWT_SECRET,
    { expiresIn: ADMIN_JWT_EXPIRES_IN }
  )

  res.json({
    message: '登录成功',
    token,
    admin: { id: admin.id, username: admin.username, nickname: admin.nickname, role: admin.role }
  })
})

// 验证管理员 token 有效性
router.get('/me', authenticateAdmin, (req, res) => {
  const admin = ADMIN_ACCOUNTS.find(a => a.id === req.admin.adminId)
  if (!admin) {
    return res.status(404).json({ message: '管理员不存在' })
  }
  res.json({
    admin: {
      id: admin.id,
      username: admin.username,
      nickname: admin.nickname,
      role: admin.role
    }
  })
})

// ===== 数据看板 =====
router.get('/dashboard', authenticateAdmin, (req, res) => {
  const totalUsers = users.length
  const totalMessages = Object.values(userMessages).reduce((sum, arr) => sum + arr.length, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayMessages = Object.values(userMessages).reduce((sum, arr) => {
    return sum + arr.filter(m => new Date(m.time) >= today).length
  }, 0)

  // 最近 7 天每日消息数
  const weeklyStats = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const next = new Date(d)
    next.setDate(d.getDate() + 1)
    const count = Object.values(userMessages).reduce((sum, arr) => {
      return sum + arr.filter(m => {
        const t = new Date(m.time)
        return t >= d && t < next
      }).length
    }, 0)
    weeklyStats.push({
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      count
    })
  }

  // 情绪分布
  const emotionCounts = {}
  Object.values(userMessages).forEach(arr => {
    arr.forEach(m => {
      if (m.role === 'user' && m.emotion) {
        emotionCounts[m.emotion] = (emotionCounts[m.emotion] || 0) + 1
      }
    })
  })

  // 最近注册用户（最多 5 个）
  const recentUsers = [...users]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)
    .map(u => ({
      id: u.id,
      email: u.email,
      nickname: u.nickname,
      createdAt: u.createdAt
    }))

  res.json({
    totalUsers,
    totalMessages,
    todayMessages,
    totalGallery: galleryItems.length,
    totalResources: resourceItems.length,
    weeklyStats,
    emotionCounts,
    recentUsers
  })
})

// ===== 用户管理 =====
router.get('/users', authenticateAdmin, (req, res) => {
  const list = users.map(u => {
    const msgCount = (userMessages[u.id] || []).length
    return {
      id: u.id,
      email: u.email,
      nickname: u.nickname,
      createdAt: u.createdAt,
      messageCount: msgCount
    }
  })
  res.json({ users: list })
})

router.delete('/users/:id', authenticateAdmin, (req, res) => {
  const idx = users.findIndex(u => u.id === req.params.id)
  if (idx === -1) {
    return res.status(404).json({ message: '用户不存在' })
  }
  const removed = users.splice(idx, 1)[0]
  delete userMessages[removed.id]
  saveChatMessages()
  saveUsers()
  res.json({ message: '已删除用户' })
})

// ===== 倾诉记录管理 =====
router.get('/messages', authenticateAdmin, (req, res) => {
  // 返回所有用户的对话（按用户分组）
  const result = Object.entries(userMessages).map(([userId, msgs]) => {
    const user = users.find(u => u.id === userId)
    return {
      userId,
      nickname: user ? user.nickname : '未知用户',
      email: user ? user.email : '',
      messageCount: msgs.length,
      lastTime: msgs.length ? msgs[msgs.length - 1].time : null,
      messages: msgs
    }
  })
  res.json({ records: result })
})

router.get('/messages/:userId', authenticateAdmin, (req, res) => {
  const msgs = userMessages[req.params.userId] || []
  const user = users.find(u => u.id === req.params.userId)
  res.json({
    user: user ? { id: user.id, email: user.email, nickname: user.nickname } : null,
    messages: msgs
  })
})

router.delete('/messages/:userId', authenticateAdmin, (req, res) => {
  delete userMessages[req.params.userId]
  saveChatMessages()
  res.json({ message: '已清空该用户的倾诉记录' })
})

// ===== 回声墙管理 =====
router.get('/gallery', authenticateAdmin, (req, res) => {
  res.json({ items: galleryItems })
})

router.post('/gallery', authenticateAdmin, (req, res) => {
  const { content, mood, author, visible } = req.body
  if (!content) {
    return res.status(400).json({ message: '内容不能为空' })
  }
  const item = {
    id: `g-${Date.now()}`,
    content,
    mood: mood || '温暖',
    author: author || '匿名',
    visible: visible !== false,
    createdAt: new Date().toISOString()
  }
  galleryItems.push(item)
  res.status(201).json({ message: '已添加', item })
})

router.put('/gallery/:id', authenticateAdmin, (req, res) => {
  const item = galleryItems.find(g => g.id === req.params.id)
  if (!item) {
    return res.status(404).json({ message: '条目不存在' })
  }
  const { content, mood, author, visible } = req.body
  if (content !== undefined) item.content = content
  if (mood !== undefined) item.mood = mood
  if (author !== undefined) item.author = author
  if (visible !== undefined) item.visible = visible
  res.json({ message: '已更新', item })
})

router.delete('/gallery/:id', authenticateAdmin, (req, res) => {
  const idx = galleryItems.findIndex(g => g.id === req.params.id)
  if (idx === -1) {
    return res.status(404).json({ message: '条目不存在' })
  }
  galleryItems.splice(idx, 1)
  res.json({ message: '已删除' })
})

// ===== 资源管理 =====
router.get('/resources', authenticateAdmin, (req, res) => {
  res.json({ items: resourceItems })
})

router.post('/resources', authenticateAdmin, (req, res) => {
  const { title, type, url, desc, visible } = req.body
  if (!title) {
    return res.status(400).json({ message: '标题不能为空' })
  }
  const item = {
    id: `r-${Date.now()}`,
    title,
    type: type || 'link',
    url: url || '',
    desc: desc || '',
    visible: visible !== false,
    createdAt: new Date().toISOString()
  }
  resourceItems.push(item)
  res.status(201).json({ message: '已添加', item })
})

router.put('/resources/:id', authenticateAdmin, (req, res) => {
  const item = resourceItems.find(r => r.id === req.params.id)
  if (!item) {
    return res.status(404).json({ message: '条目不存在' })
  }
  const { title, type, url, desc, visible } = req.body
  if (title !== undefined) item.title = title
  if (type !== undefined) item.type = type
  if (url !== undefined) item.url = url
  if (desc !== undefined) item.desc = desc
  if (visible !== undefined) item.visible = visible
  res.json({ message: '已更新', item })
})

router.delete('/resources/:id', authenticateAdmin, (req, res) => {
  const idx = resourceItems.findIndex(r => r.id === req.params.id)
  if (idx === -1) {
    return res.status(404).json({ message: '条目不存在' })
  }
  resourceItems.splice(idx, 1)
  res.json({ message: '已删除' })
})

export { router as adminRouter, authenticateAdmin }
