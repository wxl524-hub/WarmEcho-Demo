<template>
  <div class="welcome-container">
    <button class="theme-toggle" @click="toggleManual" :title="isNight ? '切换到日间模式' : '切换到深夜模式'">
      {{ isNight ? '☀️' : '🌙' }}
    </button>
    
    <div class="auth-badge" v-if="authStore.isLoggedIn()">
      <span class="user-nickname">{{ authStore.user.nickname }}</span>
      <button class="logout-btn" @click="handleLogout">退出</button>
    </div>
    <router-link to="/login" class="auth-link" v-else>
      登录/注册
    </router-link>
    
    <div class="welcome-content">
      <h1 class="welcome-title">暖声 🌙</h1>
      <p class="welcome-subtitle">{{ greeting }}</p>
      <p class="welcome-desc">{{ desc }}</p>
      <button class="welcome-btn" @click="goChat">开始倾诉 💬</button>
      <button class="onboard-btn" @click="goOnboarding">❓ 什么是暖声？</button>
      <div class="welcome-extras">
        <button class="extra-link" @click="goGrowth">📈 成长轨迹</button>
        <button class="extra-link" @click="goGallery">🌠 回声墙</button>
        <button class="extra-link" @click="goResources">🌿 专业支持</button>
        <button class="extra-link" @click="goPrivacy">🔒 隐私保护</button>
      </div>
    </div>
    <p class="welcome-footer">所有内容匿名处理 · 你的秘密安全在这里 · <a href="#" @click.prevent="goPrivacy">了解隐私保护</a></p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from '../composables/useTheme.js'
import { useAuthStore } from '../stores/auth.js'

const router = useRouter()
const { isNight, toggleManual } = useTheme()
const authStore = useAuthStore()

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h >= 22 || h < 2) return '夜深了，让每一次倾诉，都有回响'
  if (h < 6) return '凌晨好，让每一次倾诉，都有回响'
  if (h < 18) return '让每一次倾诉，都有回响'
  return '傍晚好，让每一次倾诉，都有回响'
})

const desc = computed(() => {
  if (isNight.value) return '这里没有人知道你是谁，只说你想说的。深夜的暖声，陪你到天亮。'
  return '这里没有人知道你是谁，只说你想说的。'
})

function goChat() {
  router.push('/chat')
}

function goGrowth() {
  router.push('/growth')
}

function goGallery() {
  router.push('/gallery')
}

function goResources() {
  router.push('/resources')
}

function goPrivacy() {
  router.push('/privacy')
}

function goOnboarding() {
  router.push('/onboarding')
}

function handleLogout() {
  authStore.logout()
}
</script>

<style scoped>
.welcome-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 40px 24px;
  position: relative;
  text-align: center;
}

.auth-badge {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-bg-alt);
  padding: 6px 12px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-rule);
}

.user-nickname {
  font-size: var(--text-xs);
  color: var(--color-primary);
  font-weight: 500;
}

.logout-btn {
  font-size: var(--text-xs);
  color: var(--color-muted);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}

.logout-btn:hover {
  background: var(--color-danger-pale);
  color: var(--color-danger);
}

.auth-link {
  position: absolute;
  top: 20px;
  right: 20px;
  font-size: var(--text-xs);
  color: var(--color-primary);
  text-decoration: none;
  padding: 6px 12px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-primary);
  transition: all 0.2s;
}

.auth-link:hover {
  background: var(--color-primary);
  color: white;
}

.theme-toggle {
  position: absolute;
  top: 20px;
  left: 20px;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: var(--color-bg-alt);
  border: 1px solid var(--color-rule);
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-toggle:hover {
  transform: rotate(20deg) scale(1.1);
  background: var(--color-primary-pale);
}

.welcome-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: fadeInDown 0.8s ease-out;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.welcome-title {
  font-family: var(--font-heading);
  font-size: var(--text-4xl);
  font-weight: 600;
  color: var(--color-ink);
  letter-spacing: 0.05em;
}

.welcome-subtitle {
  font-size: var(--text-xl);
  color: var(--color-primary);
  margin-top: 12px;
  font-weight: 500;
}

.welcome-desc {
  margin-top: 8px;
  font-size: var(--text-base);
  color: var(--color-ink-secondary);
  max-width: 280px;
  line-height: 1.6;
}

.welcome-btn {
  margin-top: 40px;
  background-color: var(--color-primary);
  color: #fff;
  border-radius: var(--radius-full);
  padding: 14px 48px;
  font-size: var(--text-xl);
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(217, 119, 6, 0.35);
  font-weight: 500;
}

.welcome-btn:hover {
  transform: scale(1.05);
  background-color: var(--color-primary-light);
  box-shadow: 0 6px 20px rgba(217, 119, 6, 0.45);
}

.welcome-btn:active {
  transform: scale(0.98);
}

.onboard-btn {
  margin-top: 16px;
  background: transparent;
  color: var(--color-primary);
  border: 2px solid var(--color-primary);
  border-radius: var(--radius-full);
  padding: 10px 32px;
  font-size: var(--text-base);
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
}

.onboard-btn:hover {
  background: var(--color-primary);
  color: #fff;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.3);
}

.welcome-extras {
  margin-top: 20px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  max-width: 280px;
}

.extra-link {
  padding: 8px 12px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  background: transparent;
  color: var(--color-ink-secondary);
  border: 1px solid var(--color-rule);
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.extra-link:hover {
  background: var(--color-primary-pale);
  color: var(--color-primary);
  border-color: var(--color-primary);
  transform: translateY(-1px);
}

.highlight-link {
  color: var(--color-primary);
  border-color: var(--color-primary);
  font-weight: 500;
  grid-column: 1 / -1;
}

.highlight-link:hover {
  background: var(--color-primary);
  color: #fff;
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.35);
}

.welcome-footer {
  position: absolute;
  bottom: 24px;
  left: 24px;
  right: 24px;
  font-size: var(--text-xs);
  color: var(--color-muted);
  text-align: center;
  line-height: 1.6;
}

.welcome-footer a {
  color: var(--color-primary);
  text-decoration: none;
}

.welcome-footer a:hover {
  text-decoration: underline;
}
</style>