import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { loadJSON, saveJSON } from '../utils/jsonStore.js'

const router = express.Router()

const JWT_SECRET = process.env.JWT_SECRET || 'warmecho_secret_key_2026'
const JWT_EXPIRES_IN = '7d'

export const users = loadJSON('users.json', [])

// JWT 黑名单（封禁时加入，使已有 token 失效）
export const tokenBlacklist = new Set()

function saveUsers() {
  saveJSON('users.json', users)
}

async function initTestUser() {
  const testEmail = 'test@warmecho.com'
  const existing = users.find(u => u.email === testEmail)
  if (!existing) {
    const hashedPassword = await bcrypt.hash('123456', 10)
    users.push({
      id: 'test_user_001',
      email: testEmail,
      password: hashedPassword,
      nickname: '暖声用户',
      createdAt: new Date().toISOString()
    })
    saveUsers()
    console.log('测试用户已创建: test@warmecho.com / 123456')
  }
}

initTestUser()

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: '未授权' })
  }

  // 检查 token 是否在黑名单中
  if (tokenBlacklist.has(token)) {
    return res.status(403).json({ message: '账号已被封禁，token已失效' })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: '无效的 token' })
    }
    req.user = user
    req.token = token
    next()
  })
}

router.post('/register', async (req, res) => {
  const { email, password, nickname } = req.body

  if (!email || !password || !nickname) {
    return res.status(400).json({ message: '请填写完整信息' })
  }

  // 检查邮箱是否被封禁
  try {
    const { bannedEmails } = await import('./gallery.js')
    if (bannedEmails.has(email)) {
      return res.status(423).json({ message: '该邮箱已被封禁，无法注册' })
    }
  } catch {
    // gallery.js 可能尚未加载，忽略
  }

  const existingUser = users.find(u => u.email === email)
  if (existingUser) {
    return res.status(400).json({ message: '该邮箱已被注册' })
  }

  const hashedPassword = await bcrypt.hash(password, 10)
  const user = {
    id: Date.now().toString(),
    email,
    password: hashedPassword,
    nickname,
    createdAt: new Date().toISOString()
  }
  users.push(user)
  saveUsers()

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

  res.status(201).json({
    message: '注册成功',
    token,
    user: { id: user.id, email: user.email, nickname: user.nickname }
  })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: '请填写邮箱和密码' })
  }

  const user = users.find(u => u.email === email)
  if (!user) {
    return res.status(401).json({ message: '邮箱或密码错误' })
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    return res.status(401).json({ message: '邮箱或密码错误' })
  }

  // 检查用户是否被封禁
  try {
    const { bannedUsers } = await import('./gallery.js')
    const ban = bannedUsers[user.id]
    if (ban) {
      const now = new Date()
      if (now < new Date(ban.until)) {
        return res.status(423).json({
          message: '该账号已被封禁',
          banUntil: ban.until,
          reason: ban.reason
        })
      }
    }
  } catch {
    // gallery.js 可能尚未加载，忽略
  }

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

  res.json({
    message: '登录成功',
    token,
    user: { id: user.id, email: user.email, nickname: user.nickname }
  })
})

router.get('/me', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.userId)
  if (!user) {
    return res.status(404).json({ message: '用户不存在' })
  }
  res.json({ user: { id: user.id, email: user.email, nickname: user.nickname } })
})

export { router, authenticateToken, saveUsers }
