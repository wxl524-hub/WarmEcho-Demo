import { Router } from 'express'

const router = Router()

// 解析可选音色列表
function getVoices() {
  try {
    const voicesJson = process.env.TTS_VOICES
    if (voicesJson) {
      return JSON.parse(voicesJson)
    }
  } catch (e) {
    console.warn('解析 TTS_VOICES 失败:', e)
  }
  // 默认音色列表（拟人化名）
  return [
    { id: 'xiaonuan', name: '小暖', label: '温柔女声', gender: 'female', style: '温柔治愈', voice_type: 'zh_female_vv_uranus_bigtts', avatar: '/avatars/xiaonuan.jpg' },
    { id: 'zhiqiu', name: '知秋', label: '知性女声', gender: 'female', style: '知性温暖', voice_type: 'zh_female_cancan_uranus_bigtts', avatar: '/avatars/zhiqiu.jpg' },
    { id: 'achen', name: '阿沉', label: '沉稳男声', gender: 'male', style: '沉稳可靠', voice_type: 'zh_male_yunzhou_uranus_bigtts', avatar: '/avatars/achen.jpg' },
    { id: 'shenyan', name: '深言', label: '深情男声', gender: 'male', style: '深情内敛', voice_type: 'zh_male_qingcang_uranus_bigtts', avatar: '/avatars/shenyan.jpg' }
  ]
}

// 获取音色列表
router.get('/voices', (req, res) => {
  res.json({
    voices: getVoices(),
    default: process.env.TTS_VOICE_TYPE || 'zh_female_vv_uranus_bigtts'
  })
})

router.post('/tts', async (req, res) => {
  try {
    const { text, voice } = req.body

    if (!text) {
      return res.status(400).json({ error: '文本不能为空' })
    }

    const APP_ID = process.env.TTS_APP_ID
    const ACCESS_TOKEN = process.env.TTS_ACCESS_TOKEN
    const API_URL = process.env.TTS_API_URL || 'https://openspeech.bytedance.com/api/v3/tts/unidirectional'
    const DEFAULT_VOICE = process.env.TTS_VOICE_TYPE || 'zh_female_vv_uranus_bigtts'
    const RESOURCE_ID = process.env.TTS_RESOURCE_ID || 'seed-tts-2.0'

    if (!APP_ID || !ACCESS_TOKEN) {
      return res.status(503).json({
        error: '语音合成服务未配置',
        message: '请设置 TTS_APP_ID 和 TTS_ACCESS_TOKEN 环境变量'
      })
    }

    // 根据 voice id 查找对应的音色，或直接使用 voice_type
    let voiceType = DEFAULT_VOICE
    if (voice) {
      const voices = getVoices()
      const selected = voices.find(v => v.id === voice || v.voice_type === voice)
      if (selected) {
        voiceType = selected.voice_type
      } else if (voice.startsWith('zh_') || voice.startsWith('en_')) {
        // 直接传入 voice_type
        voiceType = voice
      }
    }

    const headers = {
      'Content-Type': 'application/json',
      'X-Api-App-Id': APP_ID,
      'X-Api-Access-Key': ACCESS_TOKEN,
      'X-Api-Resource-Id': RESOURCE_ID
    }

    const body = JSON.stringify({
      user: {
        uid: 'warmecho_user'
      },
      req_params: {
        text: text,
        speaker: voiceType,
        audio_params: {
          format: 'mp3',
          sample_rate: 24000,
          speech_rate: 0
        }
      }
    })

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: headers,
      body: body
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('TTS API 调用失败:', response.status, errorData)
      return res.status(response.status).json({
        error: '语音合成服务调用失败',
        message: errorData.message || '未知错误',
        status: response.status,
        code: errorData.code
      })
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let audioData = ''
    let done = false

    while (!done) {
      const { value, done: readerDone } = await reader.read()
      done = readerDone
      if (value) {
        const chunk = decoder.decode(value, { stream: !done })
        const lines = chunk.split('\n').filter(line => line.trim())
        for (const line of lines) {
          try {
            const data = JSON.parse(line)
            if (data.code === 0 && data.data) {
              audioData += data.data
            } else if (data.code === 20000000) {
              break
            }
          } catch (e) {
            console.warn('解析TTS响应失败:', e, line)
          }
        }
      }
    }

    if (!audioData) {
      console.error('TTS响应无音频数据')
      return res.status(500).json({
        error: '语音合成响应异常',
        message: '未获取到音频数据'
      })
    }

    res.json({
      audio: audioData,
      format: 'mp3',
      length: audioData.length
    })

  } catch (error) {
    console.error('TTS 调用异常:', error)
    res.status(500).json({
      error: '语音合成服务暂时不可用',
      message: error.message
    })
  }
})

export default router