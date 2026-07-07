import { ref, onMounted, onUnmounted, computed } from 'vue'

const STORAGE_KEY = 'warmecho_theme_mode'

// 全局共享状态（同一会话内多组件实例共享）
const mode = ref('auto') // 'auto' | 'day' | 'night'
const isNight = ref(false)
let timer = null

function applyTheme() {
  let night
  if (mode.value === 'auto') {
    const h = new Date().getHours()
    // 22:00 - 02:00 视为深夜
    night = h >= 22 || h < 2
  } else {
    night = mode.value === 'night'
  }
  isNight.value = night
  document.documentElement.setAttribute('data-theme', night ? 'night' : 'day')
}

function loadMode() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'auto' || saved === 'day' || saved === 'night') {
    mode.value = saved
  }
}

function persistMode() {
  localStorage.setItem(STORAGE_KEY, mode.value)
}

export function useTheme() {
  onMounted(() => {
    loadMode()
    applyTheme()
    // 每 5 分钟检查一次时间
    if (!timer) {
      timer = setInterval(() => {
        if (mode.value === 'auto') applyTheme()
      }, 5 * 60 * 1000)
    }
  })

  onUnmounted(() => {
    // 不在 onUnmounted 清 timer，因为多组件共享；
    // 单页应用生命周期内常驻即可
  })

  function setMode(next) {
    mode.value = next
    persistMode()
    applyTheme()
  }

  function toggleManual() {
    // 手动切换：在 day/night 之间翻
    setMode(isNight.value ? 'day' : 'night')
  }

  return {
    mode,
    isNight,
    setMode,
    toggleManual
  }
}
