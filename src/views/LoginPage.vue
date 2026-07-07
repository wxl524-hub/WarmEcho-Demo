<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-header">
        <div class="logo-heart">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="40" height="40">
            <defs>
              <linearGradient id="heartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#FFB5A7" />
                <stop offset="100%" style="stop-color:#D97706" />
              </linearGradient>
            </defs>
            <path d="M23.6 4c-2.6 0-4.8 1.3-6.2 3.3C16.2 5.3 14 4 11.4 4 7.3 4 4 7.3 4 11.4c0 7.6 12 15.6 12 15.6s12-8 12-15.6C28 7.3 27.7 4 23.6 4z" fill="url(#heartGrad)"/>
          </svg>
        </div>
        <h1>暖声</h1>
        <p>AI 情绪陪伴树洞</p>
      </div>

      <div class="login-tabs">
        <button 
          class="tab-btn" 
          :class="{ active: isLoginMode }"
          @click="isLoginMode = true"
        >
          登录
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: !isLoginMode }"
          @click="isLoginMode = false"
        >
          注册
        </button>
      </div>

      <form class="login-form" @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>邮箱</label>
          <input 
            type="email" 
            v-model="form.email" 
            placeholder="请输入邮箱"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label>密码</label>
          <input 
            type="password" 
            v-model="form.password" 
            placeholder="请输入密码"
            class="form-input"
          />
        </div>

        <div v-if="!isLoginMode" class="form-group">
          <label>昵称</label>
          <input 
            type="text" 
            v-model="form.nickname" 
            placeholder="请输入昵称"
            class="form-input"
          />
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <button type="submit" class="submit-btn" :disabled="authStore.loading">
          <span v-if="authStore.loading">处理中...</span>
          <span v-else>{{ isLoginMode ? '登录' : '注册' }}</span>
        </button>
      </form>

      <div class="demo-account">
        <div class="demo-title">测试账号</div>
        <div class="demo-row">
          <span class="demo-label">邮箱</span>
          <span class="demo-value">demo@warmecho.com</span>
        </div>
        <div class="demo-row">
          <span class="demo-label">密码</span>
          <span class="demo-value">demo1234</span>
        </div>
      </div>

      <div class="guest-hint">
        <span>不想注册？</span>
        <router-link to="/" class="guest-link">以游客身份使用</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const isLoginMode = ref(true)
const error = ref('')

const form = reactive({
  email: '',
  password: '',
  nickname: ''
})

async function handleSubmit() {
  error.value = ''
  
  if (!form.email || !form.password) {
    error.value = '请填写邮箱和密码'
    return
  }
  
  if (!isLoginMode.value && !form.nickname) {
    error.value = '请填写昵称'
    return
  }

  let result
  if (isLoginMode.value) {
    result = await authStore.login(form.email, form.password)
  } else {
    result = await authStore.register(form.email, form.password, form.nickname)
  }

  if (result.success) {
    router.push('/')
  } else {
    error.value = result.message
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-bg) 0%, #FEF3C7 100%);
  padding: 20px;
}

.login-container {
  background: white;
  border-radius: var(--radius-lg);
  padding: 40px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 10px 40px rgba(217, 119, 6, 0.1);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo-heart {
  margin-bottom: 16px;
}

.login-header h1 {
  font-family: var(--font-heading);
  font-size: var(--text-lg);
  color: var(--color-primary);
  margin: 0 0 8px 0;
}

.login-header p {
  font-size: var(--text-sm);
  color: var(--color-muted);
  margin: 0;
}

.login-tabs {
  display: flex;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--color-border);
}

.tab-btn {
  flex: 1;
  padding: 12px;
  background: none;
  border: none;
  font-size: var(--text-sm);
  color: var(--color-muted);
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
}

.tab-btn.active {
  color: var(--color-primary);
  font-weight: 600;
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 10%;
  right: 10%;
  height: 2px;
  background: var(--color-primary);
  border-radius: 1px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: var(--text-xs);
  color: var(--color-ink);
  font-weight: 500;
}

.form-input {
  padding: 12px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  background: var(--color-bg);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.1);
}

.error-message {
  color: var(--color-danger);
  font-size: var(--text-xs);
  text-align: center;
  padding: 8px;
  background: rgba(239, 68, 68, 0.05);
  border-radius: var(--radius-sm);
}

.submit-btn {
  padding: 14px;
  background: linear-gradient(135deg, var(--color-primary) 0%, #F59E0B 100%);
  border: none;
  border-radius: var(--radius-md);
  color: white;
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
}

.submit-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.submit-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.guest-hint {
  margin-top: 24px;
  text-align: center;
  font-size: var(--text-xs);
  color: var(--color-muted);
}

.guest-link {
  color: var(--color-primary);
  text-decoration: none;
  margin-left: 4px;
  font-weight: 500;
}

.guest-link:hover {
  text-decoration: underline;
}

.demo-account {
  margin-top: 20px;
  padding: 14px 16px;
  background: linear-gradient(135deg, #FFF9F2 0%, #FEF3C7 100%);
  border: 1px dashed var(--color-primary);
  border-radius: var(--radius-md);
  text-align: center;
}

.demo-title {
  font-size: var(--text-xs);
  color: var(--color-primary);
  font-weight: 600;
  margin-bottom: 8px;
}

.demo-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  font-size: var(--text-xs);
  margin-bottom: 4px;
}

.demo-row:last-child {
  margin-bottom: 0;
}

.demo-label {
  color: var(--color-muted);
}

.demo-value {
  color: var(--color-ink);
  font-weight: 500;
  font-family: monospace;
  background: white;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}
</style>
