<template>
  <div class="privacy-page">
    <header class="privacy-header">
      <button class="back-btn" @click="goBack">←</button>
      <h2 class="privacy-title">🔒 隐私保护</h2>
    </header>

    <div class="privacy-content">
      <!-- 核心承诺 -->
      <section class="promise-card glass">
        <p class="promise-emoji">🤝</p>
        <h3 class="promise-title">你的秘密，安全在这里</h3>
        <p class="promise-text">
          暖声坚信：倾诉的前提是安全。我们采用「匿名 + 本地优先」的设计原则，
          让你可以毫无顾虑地说出心里话。
        </p>
      </section>

      <!-- 当前措施 -->
      <section class="measures-card glass">
        <h3 class="card-title">✅ 当前已实施</h3>
        <ul class="measure-list">
          <li>
            <span class="measure-icon">🆔</span>
            <div>
              <p class="measure-name">完全匿名</p>
              <p class="measure-desc">无需注册登录，不收集任何个人信息</p>
            </div>
          </li>
          <li>
            <span class="measure-icon">💾</span>
            <div>
              <p class="measure-name">本地优先 + 云端双备份</p>
              <p class="measure-desc">游客数据仅存本地；登录用户采用云端+本地双备份，换设备也不丢失</p>
            </div>
          </li>
          <li>
            <span class="measure-icon">🔇</span>
            <div>
              <p class="measure-name">API 降级保护</p>
              <p class="measure-desc">后端不可用时自动切换本地回复，不暴露错误细节</p>
            </div>
          </li>
          <li>
            <span class="measure-icon">🌙</span>
            <div>
              <p class="measure-name">回声墙匿名发布</p>
              <p class="measure-desc">所有公开内容均匿名，不可追溯到你</p>
            </div>
          </li>
        </ul>
      </section>

      <!-- 演进计划 -->
      <section class="roadmap-card glass">
        <h3 class="card-title">🚀 演进计划</h3>
        <div class="phase">
          <div class="phase-tag phase-2">Phase 2</div>
          <p class="phase-text">所有通信 HTTPS 加密；AI 变声处理，语音内容不可逆匿名化</p>
        </div>
        <div class="phase">
          <div class="phase-tag phase-3">Phase 3</div>
          <p class="phase-text">端到端加密方案，服务端仅转发密文；定期安全审计 + 渗透测试</p>
        </div>
      </section>

      <!-- 数据控制 -->
      <section class="data-card glass">
        <h3 class="card-title">📦 你的数据，你做主</h3>
        <p class="data-desc">你可以随时查看和删除自己的数据，操作不可恢复，请谨慎。</p>

        <div class="data-stats">
          <div class="stat-item">
            <span class="stat-label">聊天记录</span>
            <span class="stat-num">{{ stats.messageCount }} 条</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">我的发帖</span>
            <span class="stat-num">{{ myStats.myPosts }} 条</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">我的评论</span>
            <span class="stat-num">{{ myStats.myComments }} 条</span>
          </div>
        </div>

        <div class="data-actions-list">
          <button class="data-action-btn" @click="confirmAction('chat')">
            <span class="action-icon">💬</span>
            <div class="action-text">
              <span class="action-name">清除聊天记录</span>
              <span class="action-desc">{{ authStore.isLoggedIn() ? '删除云端+本地所有倾诉对话' : '删除本地所有倾诉对话' }}</span>
            </div>
          </button>
          <button class="data-action-btn" v-if="authStore.isLoggedIn()" @click="confirmAction('gallery')">
            <span class="action-icon">🌠</span>
            <div class="action-text">
              <span class="action-name">清除回声墙数据</span>
              <span class="action-desc">删除我发的所有帖子和评论</span>
            </div>
          </button>
          <button class="data-action-btn danger" v-if="authStore.isLoggedIn()" @click="confirmAction('all')">
            <span class="action-icon">🗑️</span>
            <div class="action-text">
              <span class="action-name">清除全部数据</span>
              <span class="action-desc">聊天记录 + 回声墙数据，全部删除</span>
            </div>
          </button>
        </div>
      </section>

      <!-- 确认对话框 -->
      <Transition name="fade">
        <div v-if="showConfirm" class="confirm-mask" @click.self="showConfirm = false">
          <div class="confirm-dialog glass">
            <p class="confirm-title">{{ confirmTitle }}</p>
            <p class="confirm-desc">{{ confirmDesc }}</p>
            <div class="confirm-actions">
              <button class="confirm-cancel" @click="showConfirm = false">再想想</button>
              <button class="confirm-ok" @click="executeClear">确认清除</button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from '../stores/chat.js'
import { useAuthStore } from '../stores/auth.js'

const router = useRouter()
const chatStore = useChatStore()
const authStore = useAuthStore()

const showConfirm = ref(false)
const pendingAction = ref('')  // 'chat' | 'gallery' | 'all'
const myStats = ref({ myPosts: 0, myComments: 0 })

const stats = computed(() => {
  return {
    messageCount: chatStore.messages.length
  }
})

// 加载用户的回声墙统计
onMounted(async () => {
  if (authStore.isLoggedIn()) {
    try {
      const res = await fetch('/api/gallery/my-stats', {
        headers: authStore.getAuthHeader()
      })
      if (res.ok) {
        myStats.value = await res.json()
      }
    } catch { /* ignore */ }
  }
})

const confirmConfig = {
  chat: {
    title: '清除聊天记录？',
    desc: '这将永久删除你的所有倾诉对话，无法恢复。'
  },
  gallery: {
    title: '清除回声墙数据？',
    desc: '这将永久删除你发的所有帖子和评论，无法恢复。'
  },
  all: {
    title: '清除全部数据？',
    desc: '这将永久删除你的聊天记录、回声墙帖子和评论，无法恢复。'
  }
}

const confirmTitle = computed(() => confirmConfig[pendingAction.value]?.title || '')
const confirmDesc = computed(() => confirmConfig[pendingAction.value]?.desc || '')

function confirmAction(action) {
  pendingAction.value = action
  showConfirm.value = true
}

async function executeClear() {
  const action = pendingAction.value
  showConfirm.value = false

  if (action === 'chat' || action === 'all') {
    chatStore.clearMessages()
    if (authStore.isLoggedIn()) {
      try {
        await chatStore.clearCloudMessages()
      } catch { /* ignore */ }
    }
  }

  if ((action === 'gallery' || action === 'all') && authStore.isLoggedIn()) {
    try {
      await fetch('/api/gallery/my-data', {
        method: 'DELETE',
        headers: authStore.getAuthHeader()
      })
      myStats.value = { myPosts: 0, myComments: 0 }
    } catch { /* ignore */ }
  }

  router.push('/')
}

function goBack() {
  router.push('/')
}
</script>

<style scoped>
.privacy-page {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  background-color: var(--color-bg);
  padding: 16px 16px 40px;
}

.privacy-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-top: 8px;
}

.back-btn {
  font-size: 1.4rem;
  color: var(--color-ink);
  padding: 4px 8px;
  border-radius: var(--radius-md);
  transition: background 0.2s;
  background: none;
  border: none;
  cursor: pointer;
}

.back-btn:hover {
  background: var(--color-primary-pale);
}

.privacy-title {
  font-family: var(--font-heading);
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--color-ink);
}

.privacy-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.promise-card,
.measures-card,
.roadmap-card,
.data-card {
  border-radius: var(--radius-xl);
  padding: 20px 18px;
}

/* 承诺卡片 */
.promise-card {
  text-align: center;
  background: linear-gradient(135deg, var(--color-primary-pale), var(--color-bg-surface));
}

.promise-emoji {
  font-size: 2.5rem;
  margin-bottom: 8px;
}

.promise-title {
  font-family: var(--font-heading);
  font-size: var(--text-xl);
  color: var(--color-ink);
  margin-bottom: 8px;
  font-weight: 600;
}

.promise-text {
  font-size: var(--text-sm);
  color: var(--color-ink-secondary);
  line-height: 1.7;
}

/* 通用卡片标题 */
.card-title {
  font-size: var(--text-base);
  color: var(--color-ink);
  margin-bottom: 14px;
  font-weight: 600;
}

/* 措施列表 */
.measure-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.measure-list li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px dashed var(--color-rule);
}

.measure-list li:last-child {
  border-bottom: none;
}

.measure-icon {
  font-size: 1.4rem;
  flex-shrink: 0;
}

.measure-name {
  font-size: var(--text-sm);
  color: var(--color-ink);
  font-weight: 500;
  margin-bottom: 2px;
}

.measure-desc {
  font-size: var(--text-xs);
  color: var(--color-ink-secondary);
  line-height: 1.5;
}

/* 演进计划 */
.phase {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 12px;
}

.phase:last-child {
  margin-bottom: 0;
}

.phase-tag {
  flex-shrink: 0;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;
  color: #fff;
}

.phase-2 {
  background: var(--color-primary);
}

.phase-3 {
  background: var(--color-accent);
}

.phase-text {
  font-size: var(--text-sm);
  color: var(--color-ink-secondary);
  line-height: 1.6;
}

/* 数据控制 */
.data-desc {
  font-size: var(--text-sm);
  color: var(--color-ink-secondary);
  line-height: 1.6;
  margin-bottom: 14px;
}

.data-stats {
  display: flex;
  justify-content: space-around;
  background: var(--color-bg-alt);
  border-radius: var(--radius-lg);
  padding: 12px;
  margin-bottom: 14px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--color-muted);
}

.stat-num {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-ink);
  font-variant-numeric: tabular-nums;
}

.data-actions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.data-action-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-rule);
  background: var(--color-bg-alt);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  width: 100%;
}

.data-action-btn:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-pale);
}

.data-action-btn.danger:hover {
  border-color: var(--color-accent);
  background: rgba(225, 29, 72, 0.08);
}

.action-icon {
  font-size: 1.3rem;
  flex-shrink: 0;
}

.action-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.action-name {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-ink);
}

.data-action-btn.danger .action-name {
  color: var(--color-accent);
}

.action-desc {
  font-size: var(--text-xs);
  color: var(--color-muted);
}

/* 确认对话框 */
.confirm-mask {
  position: fixed;
  inset: 0;
  background: rgba(45, 42, 38, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 24px;
}

.confirm-dialog {
  max-width: 320px;
  width: 100%;
  background: var(--color-bg-surface);
  border-radius: var(--radius-xl);
  padding: 24px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(45, 42, 38, 0.2);
}

.confirm-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-ink);
  margin-bottom: 8px;
}

.confirm-desc {
  font-size: var(--text-sm);
  color: var(--color-ink-secondary);
  line-height: 1.6;
  margin-bottom: 18px;
}

.confirm-actions {
  display: flex;
  gap: 10px;
}

.confirm-cancel,
.confirm-ok {
  flex: 1;
  padding: 10px;
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  font-size: var(--text-sm);
  transition: all 0.2s;
}

.confirm-cancel {
  background: var(--color-bg-alt);
  color: var(--color-ink-secondary);
}

.confirm-cancel:hover {
  background: var(--color-rule);
}

.confirm-ok {
  background: var(--color-accent);
  color: #fff;
}

.confirm-ok:hover {
  background: #BE123C;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
