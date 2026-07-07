import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import chatRouter from './routes/chat.js'
import { router as authRouter } from './routes/auth.js'
import { adminRouter } from './routes/admin.js'
import ttsRouter from './routes/tts.js'
import { galleryRouter } from './routes/gallery.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api/admin', adminRouter)
app.use('/api', chatRouter)
app.use('/api', ttsRouter)
app.use('/api/gallery', galleryRouter)

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`暖声服务已启动，端口: ${PORT}`)
  console.log(`API 地址: http://localhost:${PORT}/api`)
})