import express from 'express'
import jwt from 'jsonwebtoken'
import OpenAI from 'openai'
import { users } from './auth.js'
import { loadJSON, saveJSON } from '../utils/jsonStore.js'

const router = express.Router()

const JWT_SECRET = process.env.JWT_SECRET || 'warmecho_secret_key_2026'

// ===== 初始种子数据 =====
const SEED_POSTS = [
  {
    id: 'p1',
    content: '今天的阳光特别温柔，像有人在远处想着我。下班路上看到夕阳，突然觉得活着也没那么难。',
    emotion: '😔 难过',
    authorId: 'system',
    authorName: '小溪',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    visible: true,
    aiChecked: true
  },
  {
    id: 'p2',
    content: '难过的时候，记得给自己泡一杯热茶。世界很大，烦恼很小，你比你想象中更坚强。',
    emotion: '😢 孤独',
    authorId: 'system',
    authorName: '听风',
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    visible: true,
    aiChecked: true
  },
  {
    id: 'p3',
    content: '搬来这个城市三个月了，还没交到一个真正能说话的朋友。每天下班回到空荡荡的出租屋，对着手机发呆。朋友圈里大家都在聚会，而我连一个可以发消息的人都找不到。',
    emotion: '😢 孤独',
    authorId: 'system',
    authorName: '远行',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    visible: true,
    aiChecked: true
  },
  {
    id: 'p4',
    content: '马上要考试了，复习了这么久还是觉得什么都没记住。晚上翻来覆去睡不着，脑子里全是乱七八糟的念头。我是不是不够努力？可是我真的已经很累了。',
    emotion: '😰 焦虑',
    authorId: 'system',
    authorName: '夜灯',
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    visible: true,
    aiChecked: true
  },
  {
    id: 'p5',
    content: '奶奶昨天给我打电话，说想我了。挂了电话眼泪就掉下来了。在外面工作这么久，回家的次数一只手数得过来。每次想到他们年纪大了，心里就说不出的难受。',
    emotion: '😔 难过',
    authorId: 'system',
    authorName: '归途',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    visible: true,
    aiChecked: true
  }
]

const SEED_COMMENTS = [
  { id: 'c1', postId: 'p1', content: '夕阳真的治愈，你也要好好的呀', authorId: 'system', authorName: '暖阳', createdAt: new Date(Date.now() - 3600000 * 3).toISOString(), flagged: false, aiChecked: true },
  { id: 'c2', postId: 'p1', content: '抱抱，活着就是最大的勇敢', authorId: 'system', authorName: '听风', createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), flagged: false, aiChecked: true },
  { id: 'c3', postId: 'p3', content: '我也有过这样的时期，后来加入了读书会，慢慢交到了朋友。你也可以的', authorId: 'system', authorName: '微光', createdAt: new Date(Date.now() - 3600000 * 8).toISOString(), flagged: false, aiChecked: true },
  { id: 'c4', postId: 'p4', content: '累了就休息一下，你不是机器', authorId: 'system', authorName: '云朵', createdAt: new Date(Date.now() - 3600000 * 10).toISOString(), flagged: false, aiChecked: true }
]

// ===== 数据存储（JSON文件持久化）=====
let galleryPosts = loadJSON('posts.json', null)
if (!galleryPosts || !Array.isArray(galleryPosts) || galleryPosts.length === 0) {
  galleryPosts = SEED_POSTS
  saveJSON('posts.json', galleryPosts)
}

let galleryComments = loadJSON('comments.json', null)
if (!galleryComments || !Array.isArray(galleryComments) || galleryComments.length === 0) {
  galleryComments = SEED_COMMENTS
  saveJSON('comments.json', galleryComments)
}

export { galleryPosts, galleryComments }

// 违规审核队列（AI检测出的待人工处理内容）
let moderationQueue = loadJSON('moderation_queue.json', [])
export { moderationQueue }

// 已处理的违规记录
let resolvedModeration = loadJSON('moderation_resolved.json', [])
export { resolvedModeration }

// 用户违规记录：{ userId: [{ time, reason, type }] }
const userViolations = loadJSON('violations.json', {})
// 封禁用户：{ userId: { until: ISOString, reason: string, email: string } }
let bannedUsers = loadJSON('banned_users.json', {})
export { bannedUsers }
// 封禁邮箱集合：用于注册时拦截
let bannedEmails = new Set(loadJSON('banned_emails.json', []))
export { bannedEmails }

// 帖子点赞：{ postId: [userId1, userId2, ...] }
const postLikes = loadJSON('post_likes.json', {})
function savePostLikes() { saveJSON('post_likes.json', postLikes) }

function savePosts() { saveJSON('posts.json', galleryPosts) }
function saveComments() { saveJSON('comments.json', galleryComments) }
function saveModerationQueue() { saveJSON('moderation_queue.json', moderationQueue) }
function saveResolvedModeration() { saveJSON('moderation_resolved.json', resolvedModeration) }
function saveViolations() { saveJSON('violations.json', userViolations) }
function saveBannedUsers() { saveJSON('banned_users.json', bannedUsers); saveJSON('banned_emails.json', Array.from(bannedEmails)) }

// ===== 敏感词库 =====
const SENSITIVE_WORDS = {
  辱骂人身: [
    '傻逼', '傻逼', '操你', '滚蛋', '废物', '贱人', '婊子',
    '丑八怪', '丑死了', '垃圾人', '人渣', '废物', '没用的东西',
    '弱智', '白痴', '脑残', '智障', '死胖子', '肥猪',
    '脑子有病', '神经病', '心理变态', '变态', '疯子', '精神病',
    '不要脸', '下贱', '贱货', '畜生', '狗东西', '混蛋', '王八蛋',
    'sb', 'fuck', 'shit', 'bitch', 'damn', 'asshole', 'cunt',
    '恶心', '垃圾', '蠢货', '笨蛋', '傻瓜', '呆逼'
  ],
  暴力威胁: [
    '去死', '杀人', '杀了你', '弄死你', '打死你', '砍死你',
    '你怎么不去死', '去死吧', '跳楼', '上吊', '割腕', '自杀方法',
    '自杀教程', '怎么自杀', '自殺', '自杀吧', '一起死',
    '攻击', '打人', '暴力', '威胁', '弄死', '搞死',
    '持刀', '带刀', '报复社会', '同归于尽'
  ],
  色情低俗: [
    '强奸', '色情', '裸体', '嫖娼', '卖淫', '约炮', '一夜情',
    '性交', '做爱', '草逼', '操逼', '舔逼', '口交', '肛交',
    '色图', '黄图', '黄色', '毛片', 'av', 'a片',
    '自慰', '手淫', '打飞机', '撸管', '胸大', '骚逼',
    '浪货', '荡妇', '破处', '处女', '处男', '包养',
    'porn', 'sex', 'nude', 'naked', 'sexy'
  ],
  违法毒品: [
    '毒品', '吸毒', '贩毒', '买毒', '卖毒', '冰毒', '海洛因',
    '大麻', '摇头丸', 'k粉', '可卡因', '吗啡', '罂粟',
    '赌博', '赌钱', '赌球', '赌场', '彩票代理', '时时彩',
    '诈骗', '骗子', '骗钱', '传销', '非法集资', '洗钱'
  ],
  歧视攻击: [
    '农村人', '乡下人', '外地人', '北姑', '捞仔', '捞妹',
    '死残废', '瘸子', '瞎子', '聋子', '哑巴', '痴呆',
    '同性恋恶心', '死基佬', '死拉拉', '人妖', '变态狂',
    '河南人偷', '东北人都是', '上海人小气', '北京人装逼',
    'nigger', 'nigga', 'chink', 'jap', 'kike', 'spic'
  ],
  引战挑唆: [
    '不服来战', '约架', '单挑', '群殴', '打一架',
    '骂死他', '喷死他', '人肉他', '网暴', '网络暴力',
    '举报他', '投诉死', '搞死他', '让他出名',
    '活该', '报应', '早该死', '死了最好'
  ],
  自伤引导: [
    '自残', '割腕方法', '自杀技巧', '无痛自杀', '快速自杀',
    '一起自杀', '相约自杀', '自杀群', '厌世自杀',
    '活着没意思', '不如死了', '想死', '不想活了',
    '解脱', '离开这个世界', '结束生命', '自我了结'
  ]
}

// 把所有敏感词扁平化为一个数组
const ALL_SENSITIVE_WORDS = Object.values(SENSITIVE_WORDS).flat()

// 内容审核（敏感词匹配）
function moderateContent(text) {
  const lowerText = text.toLowerCase()
  const matched = []
  const categories = new Set()

  for (const [category, words] of Object.entries(SENSITIVE_WORDS)) {
    for (const word of words) {
      const lowerWord = word.toLowerCase()
      if (lowerText.includes(lowerWord)) {
        matched.push(word)
        categories.add(category)
      }
    }
  }

  return {
    passed: matched.length === 0,
    matchedWords: matched,
    categories: [...categories]
  }
}

// ===== AI 内容审核 =====
let aiClient = null
function getAIClient() {
  if (!aiClient && process.env.OPENAI_API_KEY) {
    aiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.API_BASE_URL || 'https://api.openai.com/v1'
    })
  }
  return aiClient
}

const AI_MODERATION_PROMPT = `你是一个内容安全审核员，负责审核一个心理陪伴社区的帖子和评论。
社区的目标是提供安全、温暖、支持性的情绪倾诉空间。

请判断以下内容是否违反社区规范。违规类型包括：
1. 人身攻击/辱骂
2. 暴力威胁/伤害他人
3. 色情低俗内容
4. 违法/毒品/赌博
5. 歧视/仇恨言论（地域、性别、性取向、残障等）
6. 煽动对立/引战
7. 自伤/自杀引导（注意：用户表达"我很难过想不开"等情绪倾诉是正常的，不算违规；只有教人自杀方法、约死、鼓励自残才算违规）
8. 广告/垃圾信息

请用JSON格式回复：
{
  "violation": true/false,
  "category": "违规类型或null",
  "severity": "low/medium/high",
  "reason": "简短说明原因"
}

只返回JSON，不要其他文字。`

async function aiModerateContent(content, type = 'post') {
  const client = getAIClient()
  if (!client) {
    return { violation: false, reason: 'AI服务未配置' }
  }

  try {
    const completion = await client.chat.completions.create({
      model: process.env.MODEL_NAME || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: AI_MODERATION_PROMPT },
        { role: 'user', content: `内容类型：${type}\n内容：${content}` }
      ],
      temperature: 0.1,
      max_tokens: 300
    })

    const raw = completion.choices[0].message.content.trim()
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return { violation: false, reason: 'AI返回格式异常' }
  } catch (error) {
    console.error('AI审核失败:', error.message)
    return { violation: false, reason: 'AI审核失败' }
  }
}

// ===== AI 定期巡检 =====
const AI_CHECK_INTERVAL = process.env.AI_CHECK_INTERVAL
  ? parseInt(process.env.AI_CHECK_INTERVAL) * 60 * 1000
  : 60 * 60 * 1000 // 默认每小时巡检一次

let lastCheckTime = new Date(0).toISOString()

async function runAIPatrol() {
  const client = getAIClient()
  if (!client) {
    return
  }

  const sinceTime = lastCheckTime
  lastCheckTime = new Date().toISOString()

  // 检查新帖子
  const uncheckedPosts = galleryPosts.filter(p => !p.aiChecked && new Date(p.createdAt) > new Date(sinceTime))
  for (const post of uncheckedPosts) {
    const result = await aiModerateContent(post.content, 'post')
    post.aiChecked = true

    if (result.violation) {
      post.visible = false
      moderationQueue.push({
        id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'post',
        targetId: post.id,
        content: post.content,
        authorId: post.authorId,
        authorName: post.authorName,
        aiCategory: result.category,
        severity: result.severity,
        aiReason: result.reason,
        createdAt: new Date().toISOString(),
        status: 'pending'
      })

      // 严重违规直接记录违规次数
      if (result.severity === 'high' && post.authorId !== 'system') {
        const author = users.find(u => u.id === post.authorId)
        recordViolation(post.authorId, `AI检测: ${result.category} - ${result.reason}`, author?.email)
      }
    }

    // 避免API调用过快
    await new Promise(r => setTimeout(r, 500))
  }

  // 检查新评论
  const uncheckedComments = galleryComments.filter(c => !c.aiChecked && new Date(c.createdAt) > new Date(sinceTime))
  for (const comment of uncheckedComments) {
    const result = await aiModerateContent(comment.content, 'comment')
    comment.aiChecked = true

    if (result.violation) {
      comment.flagged = true
      moderationQueue.push({
        id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'comment',
        targetId: comment.id,
        postId: comment.postId,
        content: comment.content,
        authorId: comment.authorId,
        authorName: comment.authorName,
        aiCategory: result.category,
        severity: result.severity,
        aiReason: result.reason,
        createdAt: new Date().toISOString(),
        status: 'pending'
      })

      if (result.severity === 'high' && comment.authorId !== 'system') {
        const author = users.find(u => u.id === comment.authorId)
        recordViolation(comment.authorId, `AI检测: ${result.category} - ${result.reason}`, author?.email)
      }
    }

    await new Promise(r => setTimeout(r, 500))
  }

  savePosts()
  saveComments()
  saveModerationQueue()
}

// 启动巡检定时器
if (process.env.OPENAI_API_KEY) {
  setInterval(runAIPatrol, AI_CHECK_INTERVAL)
}

// ===== 封禁 / 违规管理 =====
function checkBanStatus(userId) {
  const ban = bannedUsers[userId]
  if (!ban) return { banned: false }
  if (new Date() > new Date(ban.until)) {
    delete bannedUsers[userId]
    return { banned: false }
  }
  return {
    banned: true,
    until: ban.until,
    reason: ban.reason
  }
}

function recordViolation(userId, reason, email) {
  if (!userViolations[userId]) {
    userViolations[userId] = []
  }
  const now = new Date()
  userViolations[userId] = userViolations[userId].filter(
    v => now - new Date(v.time) < 24 * 3600000
  )
  userViolations[userId].push({ time: now.toISOString(), reason })
  saveViolations()

  const count = userViolations[userId].length
  if (count >= 3) {
    const banUntil = new Date(now.getTime() + 24 * 3600000)
    bannedUsers[userId] = { until: banUntil.toISOString(), reason: `24小时内违规${count}次，自动封禁24小时`, email: email || '' }
    if (email) bannedEmails.add(email)
    userViolations[userId] = []
    saveBannedUsers()
    saveViolations()
    return { banned: true, until: banUntil.toISOString() }
  }
  return { banned: false, violationCount: count }
}

// ===== 认证中间件 =====
function softAuth(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET)
      req.user = decoded
      req.token = token
    } catch {
      // token无效，不拦截
    }
  }
  next()
}

async function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) {
    return res.status(401).json({ message: '请先登录' })
  }

  // 检查 token 黑名单
  try {
    const { tokenBlacklist } = await import('./auth.js')
    if (tokenBlacklist.has(token)) {
      return res.status(403).json({ message: '账号已被封禁，请重新登录' })
    }
  } catch { /* ignore */ }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    req.token = token

    // 检查用户是否被封禁
    const ban = checkBanStatus(decoded.userId)
    if (ban.banned) {
      // 将 token 加入黑名单，使其立即失效
      try {
        const { tokenBlacklist } = await import('./auth.js')
        tokenBlacklist.add(token)
      } catch { /* ignore */ }
      return res.status(423).json({
        message: '你已被封禁',
        banUntil: ban.until,
        reason: ban.reason
      })
    }

    next()
  } catch {
    return res.status(403).json({ message: '无效的 token' })
  }
}

// 生成匿名笔名
const PEN_NAMES = ['小溪', '远行', '夜灯', '归途', '微光', '暖阳', '听风', '云朵', '星河', '晚秋', '初雪', '青竹', '南风', '月白', '远山', '朝露', '暮云', '清欢']
function getRandomPenName() {
  return PEN_NAMES[Math.floor(Math.random() * PEN_NAMES.length)]
}

// ===== 路由 =====

// 获取帖子列表
router.get('/posts', softAuth, (req, res) => {
  const { emotion, keyword, sort } = req.query
  const userId = req.user?.userId
  
  let posts = galleryPosts.filter(p => p.visible)
  
  if (emotion && emotion !== 'all') {
    posts = posts.filter(p => p.emotion && p.emotion.includes(emotion))
  }
  
  if (keyword && keyword.trim()) {
    const kw = keyword.trim().toLowerCase()
    posts = posts.filter(p => 
      p.content.toLowerCase().includes(kw) ||
      (p.authorName && p.authorName.toLowerCase().includes(kw))
    )
  }
  
  let result = posts
    .map(p => {
      const likes = postLikes[p.id] || []
      return {
        ...p,
        comfortCount: galleryComments.filter(c => c.postId === p.id && !c.flagged).length,
        likeCount: likes.length,
        liked: userId ? likes.includes(userId) : false
      }
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  if (sort === 'hot') {
    result = result.sort((a, b) => (b.likeCount + b.comfortCount * 2) - (a.likeCount + a.comfortCount * 2))
  }

  res.json({ posts: result })
})

// 获取帖子详情（含评论）
router.get('/posts/:id', softAuth, (req, res) => {
  const post = galleryPosts.find(p => p.id === req.params.id && p.visible)
  if (!post) {
    return res.status(404).json({ message: '帖子不存在' })
  }
  const comments = galleryComments
    .filter(c => c.postId === post.id && !c.flagged)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

  res.json({
    post: { ...post, comfortCount: comments.length },
    comments
  })
})

// 获取帖子评论
router.get('/posts/:id/comments', softAuth, (req, res) => {
  const comments = galleryComments
    .filter(c => c.postId === req.params.id && !c.flagged)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  res.json({ comments })
})

// 点赞/取消点赞
router.post('/posts/:id/like', requireAuth, (req, res) => {
  const postId = req.params.id
  const userId = req.user.userId

  const post = galleryPosts.find(p => p.id === postId && p.visible)
  if (!post) {
    return res.status(404).json({ message: '帖子不存在' })
  }

  if (!postLikes[postId]) {
    postLikes[postId] = []
  }

  const index = postLikes[postId].indexOf(userId)
  let liked = false

  if (index > -1) {
    postLikes[postId].splice(index, 1)
  } else {
    postLikes[postId].push(userId)
    liked = true
  }

  savePostLikes()

  res.json({
    liked,
    likeCount: postLikes[postId].length
  })
})

// 用户发帖
router.post('/posts', requireAuth, (req, res) => {
  const { content, emotion } = req.body
  const userId = req.user.userId

  if (!content || !content.trim()) {
    return res.status(400).json({ message: '内容不能为空' })
  }
  if (content.length > 500) {
    return res.status(400).json({ message: '内容不能超过500字' })
  }

  const banStatus = checkBanStatus(userId)
  if (banStatus.banned) {
    return res.status(423).json({
      message: `你已被暂时封禁，无法发布内容`,
      banUntil: banStatus.until,
      reason: banStatus.reason
    })
  }

  // 敏感词审核
  const moderation = moderateContent(content)
  if (!moderation.passed) {
    const violation = recordViolation(userId, `发帖敏感词: ${moderation.matchedWords.join(', ')}`, req.user.email)
    if (violation.banned) {
      return res.status(423).json({
        message: '因多次发布违规内容，你已被封禁24小时',
        banUntil: violation.until
      })
    }
    return res.status(422).json({
      message: `内容包含不当用词，请修改后发布`,
      violationCount: violation.violationCount,
      categories: moderation.categories
    })
  }

  const post = {
    id: `p-${Date.now()}`,
    content: content.trim(),
    emotion: emotion || '✨ 随心',
    authorId: userId,
    authorName: getRandomPenName(),
    createdAt: new Date().toISOString(),
    visible: true,
    aiChecked: false
  }
  galleryPosts.push(post)
  savePosts()

  res.status(201).json({ message: '发布成功', post })
})

// 用户评论
router.post('/posts/:id/comments', requireAuth, (req, res) => {
  const { content } = req.body
  const userId = req.user.userId
  const postId = req.params.id

  if (!content || !content.trim()) {
    return res.status(400).json({ message: '评论内容不能为空' })
  }
  if (content.length > 200) {
    return res.status(400).json({ message: '评论不能超过200字' })
  }

  const post = galleryPosts.find(p => p.id === postId && p.visible)
  if (!post) {
    return res.status(404).json({ message: '帖子不存在' })
  }

  const banStatus = checkBanStatus(userId)
  if (banStatus.banned) {
    return res.status(423).json({
      message: `你已被暂时封禁，无法评论`,
      banUntil: banStatus.until,
      reason: banStatus.reason
    })
  }

  // 敏感词审核
  const moderation = moderateContent(content)
  if (!moderation.passed) {
    const violation = recordViolation(userId, `评论敏感词: ${moderation.matchedWords.join(', ')}`, req.user.email)
    if (violation.banned) {
      return res.status(423).json({
        message: '因多次发布违规内容，你已被封禁24小时',
        banUntil: violation.until
      })
    }
    return res.status(422).json({
      message: `评论包含不当用词，请修改后发送`,
      violationCount: violation.violationCount,
      categories: moderation.categories
    })
  }

  const comment = {
    id: `c-${Date.now()}`,
    postId,
    content: content.trim(),
    authorId: userId,
    authorName: getRandomPenName(),
    createdAt: new Date().toISOString(),
    flagged: false,
    aiChecked: false
  }
  galleryComments.push(comment)
  saveComments()

  res.status(201).json({ message: '评论成功', comment })
})

// 删除自己的帖子
router.delete('/posts/:id', requireAuth, (req, res) => {
  const userId = req.user.userId
  const postId = req.params.id

  const idx = galleryPosts.findIndex(p => p.id === postId)
  if (idx === -1) {
    return res.status(404).json({ message: '帖子不存在' })
  }
  if (galleryPosts[idx].authorId !== userId) {
    return res.status(403).json({ message: '只能删除自己的帖子' })
  }

  galleryPosts.splice(idx, 1)
  // 同时删除该帖子的所有评论
  for (let i = galleryComments.length - 1; i >= 0; i--) {
    if (galleryComments[i].postId === postId) {
      galleryComments.splice(i, 1)
    }
  }
  savePosts()
  saveComments()

  res.json({ message: '删除成功' })
})

// 删除自己的评论
router.delete('/comments/:id', requireAuth, (req, res) => {
  const userId = req.user.userId
  const commentId = req.params.id

  const idx = galleryComments.findIndex(c => c.id === commentId)
  if (idx === -1) {
    return res.status(404).json({ message: '评论不存在' })
  }
  if (galleryComments[idx].authorId !== userId) {
    return res.status(403).json({ message: '只能删除自己的评论' })
  }

  const postId = galleryComments[idx].postId
  galleryComments.splice(idx, 1)
  saveComments()

  res.json({ message: '删除成功' })
})

// 获取当前用户的回声墙数据统计
router.get('/my-stats', requireAuth, (req, res) => {
  const userId = req.user.userId
  const myPosts = galleryPosts.filter(p => p.authorId === userId).length
  const myComments = galleryComments.filter(c => c.authorId === userId).length
  res.json({ myPosts, myComments })
})

// 删除当前用户所有回声墙数据
router.delete('/my-data', requireAuth, (req, res) => {
  const userId = req.user.userId

  // 删除自己的帖子（及其评论）
  const myPostIds = galleryPosts.filter(p => p.authorId === userId).map(p => p.id)
  for (let i = galleryPosts.length - 1; i >= 0; i--) {
    if (galleryPosts[i].authorId === userId) {
      galleryPosts.splice(i, 1)
    }
  }
  // 删除帖子关联的所有评论（包括别人评论的）
  for (let i = galleryComments.length - 1; i >= 0; i--) {
    if (myPostIds.includes(galleryComments[i].postId) || galleryComments[i].authorId === userId) {
      galleryComments.splice(i, 1)
    }
  }
  savePosts()
  saveComments()

  res.json({ message: '回声墙数据已清除' })
})

// 获取当前用户所有帖子和评论
router.get('/my-posts', requireAuth, (req, res) => {
  const userId = req.user.userId
  const myPosts = galleryPosts
    .filter(p => p.authorId === userId && p.visible)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(p => ({
      ...p,
      comfortCount: galleryComments.filter(c => c.postId === p.id && !c.flagged).length
    }))
  const myComments = galleryComments
    .filter(c => c.authorId === userId && !c.flagged)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(c => {
      const post = galleryPosts.find(p => p.id === c.postId)
      return {
        ...c,
        postPreview: post ? post.content.slice(0, 30) + (post.content.length > 30 ? '...' : '') : '帖子已删除',
        postEmotion: post?.emotion || ''
      }
    })
  res.json({ posts: myPosts, comments: myComments })
})

// 编辑自己的帖子
router.put('/posts/:id', requireAuth, (req, res) => {
  const userId = req.user.userId
  const { content, emotion } = req.body
  const postId = req.params.id

  const post = galleryPosts.find(p => p.id === postId)
  if (!post) {
    return res.status(404).json({ message: '帖子不存在' })
  }
  if (post.authorId !== userId) {
    return res.status(403).json({ message: '只能编辑自己的帖子' })
  }

  if (!content || !content.trim()) {
    return res.status(400).json({ message: '内容不能为空' })
  }
  if (content.length > 500) {
    return res.status(400).json({ message: '内容不能超过500字' })
  }

  // 敏感词审核
  const moderation = moderateContent(content)
  if (!moderation.passed) {
    return res.status(422).json({
      message: '内容包含不当用词，请修改',
      categories: moderation.categories
    })
  }

  post.content = content.trim()
  if (emotion) post.emotion = emotion
  post.editedAt = new Date().toISOString()
  post.aiChecked = false
  savePosts()

  res.json({ message: '编辑成功', post })
})

// 编辑自己的评论
router.put('/comments/:id', requireAuth, (req, res) => {
  const userId = req.user.userId
  const { content } = req.body
  const commentId = req.params.id

  const comment = galleryComments.find(c => c.id === commentId)
  if (!comment) {
    return res.status(404).json({ message: '评论不存在' })
  }
  if (comment.authorId !== userId) {
    return res.status(403).json({ message: '只能编辑自己的评论' })
  }

  if (!content || !content.trim()) {
    return res.status(400).json({ message: '内容不能为空' })
  }
  if (content.length > 200) {
    return res.status(400).json({ message: '评论不能超过200字' })
  }

  const moderation = moderateContent(content)
  if (!moderation.passed) {
    return res.status(422).json({
      message: '评论包含不当用词，请修改',
      categories: moderation.categories
    })
  }

  comment.content = content.trim()
  comment.editedAt = new Date().toISOString()
  comment.aiChecked = false
  saveComments()

  res.json({ message: '编辑成功', comment })
})

// ===== 管理员审核 API =====

// 获取审核队列
router.get('/admin/queue', (req, res) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ message: '未授权' })
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    if (decoded.role !== 'admin') return res.status(403).json({ message: '无管理员权限' })
  } catch {
    return res.status(403).json({ message: '无效token' })
  }

  res.json({
    pending: moderationQueue.filter(m => m.status === 'pending'),
    resolved: resolvedModeration.slice(-50).reverse()
  })
})

// 处理违规内容（删除/恢复/封禁）
router.post('/admin/moderate/:id', (req, res) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ message: '未授权' })
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    if (decoded.role !== 'admin') return res.status(403).json({ message: '无管理员权限' })
  } catch {
    return res.status(403).json({ message: '无效token' })
  }

  const { action, banHours = 24 } = req.body
  const item = moderationQueue.find(m => m.id === req.params.id)
  if (!item) {
    return res.status(404).json({ message: '审核项不存在' })
  }

  if (action === 'delete') {
    if (item.type === 'post') {
      const post = galleryPosts.find(p => p.id === item.targetId)
      if (post) post.visible = false
    } else if (item.type === 'comment') {
      const comment = galleryComments.find(c => c.id === item.targetId)
      if (comment) comment.flagged = true
    }
    item.status = 'deleted'
  } else if (action === 'restore') {
    if (item.type === 'post') {
      const post = galleryPosts.find(p => p.id === item.targetId)
      if (post) post.visible = true
    } else if (item.type === 'comment') {
      const comment = galleryComments.find(c => c.id === item.targetId)
      if (comment) comment.flagged = false
    }
    item.status = 'restored'
  } else if (action === 'ban') {
    const banUntil = new Date(Date.now() + banHours * 3600000)
    const author = users.find(u => u.id === item.authorId)
    const authorEmail = author?.email || ''
    bannedUsers[item.authorId] = {
      until: banUntil.toISOString(),
      reason: `管理员封禁：${item.aiReason || '违规内容'}`,
      email: authorEmail
    }
    if (authorEmail) bannedEmails.add(authorEmail)
    item.status = 'banned'
  } else if (action === 'ignore') {
    item.status = 'ignored'
  } else {
    return res.status(400).json({ message: '无效操作' })
  }

  resolvedModeration.push({
    ...item,
    action,
    handledAt: new Date().toISOString()
  })
  const idx = moderationQueue.findIndex(m => m.id === req.params.id)
  if (idx > -1) moderationQueue.splice(idx, 1)

  savePosts()
  saveComments()
  saveModerationQueue()
  saveResolvedModeration()
  if (action === 'ban') saveBannedUsers()

  res.json({ message: '处理成功', item })
})

// 手动触发AI巡检
router.post('/admin/patrol', async (req, res) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ message: '未授权' })
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    if (decoded.role !== 'admin') return res.status(403).json({ message: '无管理员权限' })
  } catch {
    return res.status(403).json({ message: '无效token' })
  }

  if (!getAIClient()) {
    return res.status(500).json({ message: 'AI服务未配置' })
  }

  runAIPatrol()
  res.json({ message: 'AI巡检已启动，请稍后查看审核队列' })
})

// 获取封禁用户列表
router.get('/admin/banned', (req, res) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ message: '未授权' })
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    if (decoded.role !== 'admin') return res.status(403).json({ message: '无管理员权限' })
  } catch {
    return res.status(403).json({ message: '无效token' })
  }

  const now = new Date()
  const activeBans = []
  for (const [userId, ban] of Object.entries(bannedUsers)) {
    if (now < new Date(ban.until)) {
      activeBans.push({ userId, ...ban })
    }
  }
  res.json({ banned: activeBans })
})

export { router as galleryRouter, runAIPatrol, userViolations }
