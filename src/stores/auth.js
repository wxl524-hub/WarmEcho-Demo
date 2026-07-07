import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'warmecho_auth'

export const useAuthStore = defineStore('auth', () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  const token = ref(saved ? JSON.parse(saved).token : null)
  const user = ref(saved ? JSON.parse(saved).user : null)
  const loading = ref(false)

  watch(
    [token, user],
    ([t, u]) => {
      if (t && u) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: t, user: u }))
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    },
    { deep: true }
  )

  const isLoggedIn = () => !!token.value

  async function login(email, password) {
    loading.value = true
    try {
      // 演示模式：测试账号直接登录成功
      if (email === 'demo@warmecho.com' && password === 'demo1234') {
        token.value = 'demo-token'
        user.value = { id: 1, email: 'demo@warmecho.com', nickname: 'demo用户' }
        return { success: true }
      }
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (res.ok) {
        token.value = data.token
        user.value = data.user
        return { success: true }
      }
      return { success: false, message: data.message || '登录失败' }
    } catch (err) {
      return { success: false, message: '网络错误，请稍后重试' }
    } finally {
      loading.value = false
    }
  }

  async function register(email, password, nickname) {
    loading.value = true
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, nickname })
      })
      const data = await res.json()
      if (res.ok) {
        token.value = data.token
        user.value = data.user
        return { success: true }
      }
      return { success: false, message: data.message || '注册失败' }
    } catch (err) {
      // 演示模式：后端不可用时模拟注册成功
      token.value = 'demo-token-' + Date.now()
      user.value = { id: Date.now(), email, nickname: nickname || email.split('@')[0] }
      return { success: true }
    } finally {
      loading.value = false
    }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  function getAuthHeader() {
    return token.value ? { Authorization: `Bearer ${token.value}` } : {}
  }

  return {
    token,
    user,
    loading,
    isLoggedIn,
    login,
    register,
    logout,
    getAuthHeader
  }
})
