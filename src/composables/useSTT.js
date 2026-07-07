import { ref } from 'vue'

// 全局共享状态
const isRecording = ref(false)
const transcript = ref('') // 实时识别文本
const supported = typeof window !== 'undefined'
  && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

let recognition = null

function getRecognitionCtor() {
  if (!supported) return null
  return window.SpeechRecognition || window.webkitSpeechRecognition
}

export function useSTT() {
  function start(onFinal) {
    if (!supported) {
      console.warn('当前浏览器不支持语音识别')
      return
    }
    stop()

    const Ctor = getRecognitionCtor()
    recognition = new Ctor()
    recognition.lang = 'zh-CN'
    recognition.continuous = false   // 单次模式
    recognition.interimResults = true // 返回中间结果

    recognition.onstart = () => {
      isRecording.value = true
      transcript.value = ''
    }

    recognition.onresult = (event) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) {
          final += r[0].transcript
        } else {
          interim += r[0].transcript
        }
      }
      if (final) {
        transcript.value = final
        if (typeof onFinal === 'function') onFinal(final)
      } else {
        transcript.value = interim
      }
    }

    recognition.onerror = (e) => {
      console.warn('语音识别错误:', e.error)
      isRecording.value = false
    }

    recognition.onend = () => {
      isRecording.value = false
    }

    recognition.start()
  }

  function stop() {
    if (recognition) {
      try {
        recognition.stop()
      } catch (_) {
        /* ignore */
      }
      recognition = null
    }
    isRecording.value = false
  }

  function toggle(onFinal) {
    if (isRecording.value) {
      stop()
    } else {
      start(onFinal)
    }
  }

  return {
    supported,
    isRecording,
    transcript,
    start,
    stop,
    toggle
  }
}
