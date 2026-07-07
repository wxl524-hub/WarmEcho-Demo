<template>
  <div class="growth-page">
    <header class="growth-header">
      <button class="back-btn" @click="goBack">←</button>
      <h2 class="growth-title">📈 成长轨迹</h2>
      <span class="header-month">{{ monthLabel }}</span>
    </header>

    <div v-if="!authStore.isLoggedIn()" class="guest-block">
      <p class="guest-emoji">🔐</p>
      <p class="guest-title">登录后查看成长轨迹</p>
      <p class="guest-desc">为了确保你的数据安全留存，成长轨迹需要登录后才能查看。登录后，你的情绪记录将同步到云端，换设备也不会丢失。</p>
      <button class="primary-btn" @click="goLogin">去登录</button>
    </div>

    <div v-else>
      <div v-if="chatStore.monthCount === 0" class="empty-state">
        <p class="empty-emoji">🌱</p>
        <p class="empty-text">本月还没有倾诉记录</p>
        <p class="empty-hint">开始记录心情，暖声会陪你看见自己的情绪轨迹。</p>
        <button class="primary-btn" @click="goChat">开始倾诉</button>
      </div>

      <div v-else class="growth-content">
        <section class="stat-card glass">
          <div class="stat-row">
            <div class="stat-block">
              <span class="stat-label">本月倾诉</span>
              <span class="stat-value">{{ chatStore.monthCount }} 次</span>
            </div>
            <div class="stat-block">
              <span class="stat-label">上月倾诉</span>
              <span class="stat-value stat-muted">{{ chatStore.monthCompare.lastCount }} 次</span>
            </div>
            <div class="stat-block">
              <span class="stat-label">变化</span>
              <span class="stat-value" :class="trendClass">
                {{ trendText }}
              </span>
            </div>
          </div>
        </section>

        <section class="chart-card glass">
          <h3 class="card-title">最近 7 天倾诉趋势</h3>
          <svg class="trend-chart" :viewBox="`0 0 ${chartW} ${chartH}`" preserveAspectRatio="none">
            <line
              v-for="(g, i) in gridLines"
              :key="'g' + i"
              :x1="padding.left"
              :x2="chartW - padding.right"
              :y1="g.y"
              :y2="g.y"
              class="grid-line"
            />
            <polyline
              :points="linePoints"
              fill="none"
              class="trend-line"
            />
            <polygon
              :points="areaPoints"
              class="trend-area"
            />
            <circle
              v-for="(p, i) in dataPoints"
              :key="'p' + i"
              :cx="p.x"
              :cy="p.y"
              r="3.5"
              class="trend-dot"
            />
          </svg>
          <div class="x-labels">
            <span v-for="(d, i) in chatStore.weeklyTrend" :key="'l' + i">{{ d.label }}</span>
          </div>
        </section>

        <section class="emotion-card glass">
          <h3 class="card-title">本月情绪占比</h3>
          <div
            v-for="e in chatStore.monthEmotionStats"
            :key="e.id"
            class="emotion-row"
          >
            <span class="emotion-label">{{ e.emoji }} {{ e.label }}</span>
            <div class="bar-track">
              <div
                class="bar-fill"
                :style="{ width: e.percent + '%' }"
                :class="{ 'bar-dim': e.count === 0 }"
              ></div>
            </div>
            <span class="emotion-count">{{ e.count }} · {{ e.percent }}%</span>
          </div>
        </section>

        <section class="advice-card glass">
          <h3 class="card-title">💡 暖声的建议</h3>
          <p class="advice-text">{{ chatStore.growthAdvice }}</p>
          <div v-if="chatStore.dominantEmotion" class="dominant-tag">
            本月主导情绪：{{ chatStore.dominantEmotion.emoji }} {{ chatStore.dominantEmotion.label }}
          </div>
        </section>

        <div class="growth-actions">
          <button class="action-btn" @click="goChat">✍️ 继续倾诉</button>
          <button class="action-btn action-btn-calm" @click="goCalm">🌙 休息一下</button>
          <button class="action-btn action-btn-help" @click="goResources">🌿 专业支持</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from '../stores/chat.js'
import { useAuthStore } from '../stores/auth.js'

const router = useRouter()
const chatStore = useChatStore()
const authStore = useAuthStore()

const monthLabel = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}年${now.getMonth() + 1}月`
})

// 折线图尺寸
const chartW = 320
const chartH = 140
const padding = { left: 24, right: 12, top: 12, bottom: 20 }

const maxCount = computed(() => {
  const max = Math.max(...chatStore.weeklyTrend.map((d) => d.count), 1)
  // 至少为 1，且向上取整到 2 的倍数
  return Math.max(max, 2)
})

// 数据点坐标
const dataPoints = computed(() => {
  const data = chatStore.weeklyTrend
  const n = data.length
  const innerW = chartW - padding.left - padding.right
  const innerH = chartH - padding.top - padding.bottom
  return data.map((d, i) => {
    const x = padding.left + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1))
    const y = padding.top + innerH - (d.count / maxCount.value) * innerH
    return { x, y, count: d.count, label: d.label }
  })
})

const linePoints = computed(() =>
  dataPoints.value.map((p) => `${p.x},${p.y}`).join(' ')
)

const areaPoints = computed(() => {
  const pts = dataPoints.value
  if (pts.length === 0) return ''
  const baseY = chartH - padding.bottom
  const first = `${pts[0].x},${baseY}`
  const last = `${pts[pts.length - 1].x},${baseY}`
  return [first, ...pts.map((p) => `${p.x},${p.y}`), last].join(' ')
})

const gridLines = computed(() => {
  const innerH = chartH - padding.top - padding.bottom
  return [0, 0.5, 1].map((t) => ({
    y: padding.top + innerH * t
  }))
})

const trendText = computed(() => {
  const cmp = chatStore.monthCompare
  if (cmp.trend === 'up') return `↑ ${cmp.diff}`
  if (cmp.trend === 'down') return `↓ ${Math.abs(cmp.diff)}`
  return '持平'
})

const trendClass = computed(() => {
  const t = chatStore.monthCompare.trend
  if (t === 'up') return 'trend-up'
  if (t === 'down') return 'trend-down'
  return 'trend-flat'
})

function goBack() {
  router.push('/')
}

function goChat() {
  router.push('/chat')
}

function goCalm() {
  router.push('/calm')
}

function goResources() {
  router.push('/resources')
}

function goLogin() {
  router.push('/login')
}
</script>

<style scoped>
.growth-page {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  background-color: var(--color-bg);
  padding: 16px 16px 40px;
}

.growth-header {
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

.growth-title {
  font-family: var(--font-heading);
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--color-ink);
  flex: 1;
}

.header-month {
  font-size: var(--text-sm);
  color: var(--color-muted);
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
}

.empty-emoji {
  font-size: 4rem;
  margin-bottom: 16px;
  animation: sway 3s ease-in-out infinite;
}

@keyframes sway {
  0%, 100% { transform: rotate(-5deg); }
  50% { transform: rotate(5deg); }
}

.empty-text {
  font-size: var(--text-lg);
  color: var(--color-ink);
  margin-bottom: 8px;
  font-weight: 500;
}

.empty-hint {
  font-size: var(--text-sm);
  color: var(--color-ink-secondary);
  line-height: 1.6;
  margin-bottom: 24px;
  max-width: 280px;
}

.guest-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
}

.guest-emoji {
  font-size: 4rem;
  margin-bottom: 16px;
}

.guest-title {
  font-size: var(--text-lg);
  color: var(--color-ink);
  margin-bottom: 8px;
  font-weight: 500;
}

.guest-desc {
  font-size: var(--text-sm);
  color: var(--color-ink-secondary);
  line-height: 1.6;
  margin-bottom: 24px;
  max-width: 280px;
}

.primary-btn {
  background: var(--color-primary);
  color: #fff;
  padding: 12px 36px;
  border-radius: var(--radius-full);
  font-size: var(--text-base);
  border: none;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(217, 119, 6, 0.35);
}

.primary-btn:hover {
  background: var(--color-primary-light);
  transform: scale(1.05);
}

/* 内容区 */
.growth-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stat-card,
.chart-card,
.emotion-card,
.advice-card {
  border-radius: var(--radius-xl);
  padding: 20px 18px;
}

.card-title {
  font-size: var(--text-base);
  color: var(--color-ink-secondary);
  margin-bottom: 14px;
  font-weight: 500;
}

/* 统计行 */
.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.stat-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--color-muted);
  margin-bottom: 4px;
}

.stat-value {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--color-ink);
  font-variant-numeric: tabular-nums;
}

.stat-muted {
  color: var(--color-muted);
  font-weight: 500;
}

.trend-up {
  color: var(--color-accent);
}

.trend-down {
  color: var(--color-primary-light);
}

.trend-flat {
  color: var(--color-muted);
}

/* 折线图 */
.trend-chart {
  width: 100%;
  height: 140px;
  display: block;
}

.grid-line {
  stroke: var(--color-rule);
  stroke-width: 0.5;
  stroke-dasharray: 2 2;
}

.trend-line {
  stroke: var(--color-primary);
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
  fill: none;
}

.trend-area {
  fill: var(--color-primary-pale);
  stroke: none;
}

.trend-dot {
  fill: var(--color-primary);
  stroke: var(--color-bg-surface);
  stroke-width: 1.5;
}

.x-labels {
  display: flex;
  justify-content: space-between;
  padding: 4px 12px 0;
  font-size: var(--text-xs);
  color: var(--color-muted);
  font-variant-numeric: tabular-nums;
}

/* 情绪占比 */
.emotion-row {
  display: grid;
  grid-template-columns: 80px 1fr 70px;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.emotion-label {
  font-size: var(--text-sm);
  color: var(--color-ink);
}

.bar-track {
  height: 8px;
  background: var(--color-bg-alt);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-light));
  border-radius: var(--radius-full);
  transition: width 0.6s ease;
}

.bar-dim {
  background: var(--color-rule);
}

.emotion-count {
  font-size: var(--text-xs);
  color: var(--color-muted);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* 建议 */
.advice-text {
  font-size: var(--text-base);
  line-height: 1.8;
  color: var(--color-ink);
  margin-bottom: 12px;
}

.dominant-tag {
  display: inline-block;
  padding: 4px 12px;
  background: var(--color-primary-pale);
  color: var(--color-primary);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
}

/* 底部操作 */
.growth-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 12px;
}

.action-btn {
  padding: 10px 20px;
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  border: none;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.7);
  color: var(--color-ink);
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(45, 42, 38, 0.06);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(45, 42, 38, 0.1);
}

.action-btn-calm {
  background: var(--color-primary-pale);
  color: var(--color-primary);
}

.action-btn-help {
  background: rgba(34, 197, 94, 0.12);
  color: #15803D;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.action-btn-help:hover {
  background: rgba(34, 197, 94, 0.2);
  color: #166534;
}
</style>
