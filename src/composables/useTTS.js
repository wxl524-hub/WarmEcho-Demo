import { ref } from 'vue'

const isPlaying = ref(false)
const currentId = ref(null)
const enabled = ref(false)
const currentVoice = ref('xiaonuan') // 默认音色
let currentAudio = null

// 从 localStorage 读取用户选择的音色
function loadVoicePreference() {
  try {
    const saved = localStorage.getItem('warmecho_voice')
    if (saved) {
      currentVoice.value = saved
    }
  } catch (e) {
    console.warn('读取音色偏好失败:', e)
  }
}

loadVoicePreference()

function createAudioFromBase64(base64Data) {
  try {
    const cleanData = base64Data.startsWith('data:')
      ? base64Data.split(',')[1]
      : base64Data
    const byteCharacters = atob(cleanData)
    const byteArray = new Uint8Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteArray[i] = byteCharacters.charCodeAt(i)
    }
    const blob = new Blob([byteArray], { type: 'audio/mp3' })
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    return audio
  } catch (error) {
    console.error('音频转换失败:', error)
    return null
  }
}

function pickVoice() {
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return null
  const preferred = voices.find((v) => /zh(-CN|_CN)?/i.test(v.lang) && /female|女|xiao|ting/i.test(v.name))
  if (preferred) return preferred
  const zh = voices.find((v) => /zh/i.test(v.lang))
  return zh || voices[0]
}

export function useTTS() {
  const supported = typeof window !== 'undefined' && 'Audio' in window

  async function speak(text, messageId, voiceId) {
    if (!supported || !text) return

    if (isPlaying.value && currentId.value === messageId) {
      stop()
      return
    }
    stop()

    // 使用传入的 voiceId，或当前选择的音色
    const voice = voiceId || currentVoice.value

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text, voice })
      })

      if (!response.ok) {
        console.log('TTS API不可用，使用浏览器TTS')
        fallbackSpeak(text, messageId)
        return
      }

      const data = await response.json()

      if (!data.audio) {
        console.log('TTS响应无音频数据，使用浏览器TTS')
        fallbackSpeak(text, messageId)
        return
      }

      const audio = createAudioFromBase64(data.audio)
      if (!audio) {
        console.log('音频创建失败，使用浏览器TTS')
        fallbackSpeak(text, messageId)
        return
      }

      audio.onplay = () => {
        isPlaying.value = true
        currentId.value = messageId
      }

      audio.onended = () => {
        isPlaying.value = false
        currentId.value = null
        currentAudio = null
        if (audio.src) {
          URL.revokeObjectURL(audio.src)
        }
      }

      audio.onerror = () => {
        isPlaying.value = false
        currentId.value = null
        currentAudio = null
        if (audio.src) {
          URL.revokeObjectURL(audio.src)
        }
      }

      currentAudio = audio
      await audio.play()

    } catch (error) {
      console.log('TTS调用失败，使用浏览器TTS:', error)
      fallbackSpeak(text, messageId)
    }
  }

  function fallbackSpeak(text, messageId) {
    if (!('speechSynthesis' in window)) return

    const u = new SpeechSynthesisUtterance(text)
    const v = pickVoice()
    if (v) u.voice = v
    u.lang = v ? v.lang : 'zh-CN'
    u.rate = 0.95
    u.pitch = 1.05
    u.volume = 1

    u.onstart = () => {
      isPlaying.value = true
      currentId.value = messageId
    }
    u.onend = () => {
      isPlaying.value = false
      currentId.value = null
    }
    u.onerror = () => {
      isPlaying.value = false
      currentId.value = null
    }

    window.speechSynthesis.speak(u)
  }

  function stop() {
    if (!supported) return
    if (currentAudio) {
      currentAudio.pause()
      if (currentAudio.src) {
        URL.revokeObjectURL(currentAudio.src)
      }
      currentAudio = null
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    isPlaying.value = false
    currentId.value = null
  }

  function toggleEnabled() {
    enabled.value = !enabled.value
    if (!enabled.value) stop()
  }

  // 设置当前音色
  function setVoice(voiceId) {
    currentVoice.value = voiceId
    try {
      localStorage.setItem('warmecho_voice', voiceId)
    } catch (e) {
      console.warn('保存音色偏好失败:', e)
    }
  }

  // 获取音色列表
  async function getVoices() {
    try {
      const response = await fetch('/api/voices')
      if (response.ok) {
        const data = await response.json()
        return data.voices || []
      }
    } catch (e) {
      console.warn('获取音色列表失败:', e)
    }
    // 默认音色列表（拟人化名字 + 本地头像）
    const ts = Date.now()
    const base = import.meta.env.BASE_URL
    return [
      { id: 'xiaonuan', name: '小暖', label: '温柔女声', gender: 'female', style: '温柔治愈', avatar: base + 'avatars/xiaonuan.jpg?t=' + ts },
      { id: 'zhiqiu', name: '知秋', label: '知性女声', gender: 'female', style: '知性温暖', avatar: base + 'avatars/zhiqiu.jpg?t=' + ts },
      { id: 'achen', name: '阿沉', label: '沉稳男声', gender: 'male', style: '沉稳可靠', avatar: base + 'avatars/achen.jpg?t=' + ts },
      { id: 'shenyan', name: '深言', label: '深情男声', gender: 'male', style: '深情内敛', avatar: base + 'avatars/shenyan.jpg?t=' + ts }
    ]
  }

  return {
    supported,
    isPlaying,
    currentId,
    enabled,
    currentVoice,
    speak,
    stop,
    toggleEnabled,
    setVoice,
    getVoices
  }
}