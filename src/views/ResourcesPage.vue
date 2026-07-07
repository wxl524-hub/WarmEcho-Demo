<template>
  <div class="resources-page">
    <header class="resources-header">
      <button class="back-btn" @click="goBack">←</button>
      <h2 class="resources-title">🌿 专业支持</h2>
    </header>

    <div class="resources-content">
      <!-- 紧急求助 -->
      <section class="emergency-card">
        <p class="emergency-emoji">🆘</p>
        <h3 class="emergency-title">如果你正在经历危机</h3>
        <p class="emergency-text">
          如果你有伤害自己的想法，请立即寻求帮助。你不必独自面对。
        </p>
        <div class="hotline-list">
          <a
            v-for="h in hotlines"
            :key="h.name"
            :href="`tel:${h.phone}`"
            class="hotline-item"
          >
            <p class="hotline-name">{{ h.name }}</p>
            <p class="hotline-desc">{{ h.desc }}</p>
            <span class="hotline-phone">📞 {{ h.phone }}</span>
          </a>
        </div>
      </section>

      <!-- 轻量级情绪自评 -->
      <section class="screening-card glass">
        <h3 class="card-title">📊 情绪轻量自评 (PHQ-2)</h3>
        <p class="screening-desc">
          过去两周里，你被以下情绪困扰的频率？（仅作参考，不能替代专业诊断）
        </p>

        <div
          v-for="(q, i) in screeningQuestions"
          :key="i"
          class="screening-question"
        >
          <p class="q-text">{{ i + 1 }}. {{ q.text }}</p>
          <div class="q-options">
            <button
              v-for="opt in 4"
              :key="opt"
              class="q-opt"
              :class="{ 'q-opt-active': answers[i] === opt - 1 }"
              @click="answers[i] = opt - 1"
            >
              {{ optLabels[opt - 1] }}
            </button>
          </div>
        </div>

        <button
          class="submit-btn"
          :disabled="!allAnswered"
          @click="submitScreening"
        >
          查看结果
        </button>

        <!-- 结果展示 -->
        <Transition name="fade">
          <div v-if="result" class="result-card" :class="`result-${result.level}`">
            <p class="result-score">总分：{{ result.score }} / 6</p>
            <p class="result-level">{{ result.levelText }}</p>
            <p class="result-advice">{{ result.advice }}</p>
          </div>
        </Transition>
      </section>

      <!-- 专业资源分类 -->
      <section class="resource-list-card glass">
        <h3 class="card-title">📚 专业资源</h3>

        <div v-for="cat in resourceCategories" :key="cat.title" class="resource-cat">
          <p class="cat-title">{{ cat.icon }} {{ cat.title }}</p>
          <ul class="cat-items">
            <li v-for="item in cat.items" :key="item.name">
              <a
                v-if="item.url"
                :href="item.url"
                class="resource-link"
                @click="handleResourceClick($event, item.url)"
              >
                <span class="resource-name">{{ item.name }}</span>
                <span class="resource-desc">{{ item.desc }}</span>
              </a>
              <div v-else class="resource-link">
                <span class="resource-name">{{ item.name }}</span>
                <span class="resource-desc">{{ item.desc }}</span>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <!-- 温馨提示 -->
      <section class="notice-card glass">
        <p class="notice-text">
          💛 暖声是一个情绪陪伴空间，不提供专业心理咨询服务。
          如果你感到持续困扰，请勇敢地寻求专业帮助——
          <strong>求助不是软弱，而是对自己的善待。</strong>
        </p>
      </section>

      <!-- 链接复制对话框 -->
      <Transition name="fade">
        <div v-if="linkModal.url" class="link-mask" @click.self="linkModal.url = ''">
          <div class="link-dialog glass">
            <p class="link-dialog-title">🔗 在浏览器中打开</p>
            <p class="link-dialog-desc">内置浏览器可能无法加载外部网站，请复制以下链接到系统浏览器打开：</p>
            <div class="link-url-box">
              <span class="link-url-text">{{ linkModal.url }}</span>
            </div>
            <div class="link-dialog-actions">
              <button class="link-copy-btn" @click="copyUrl">
                {{ linkModal.copied ? '✓ 已复制' : '📋 复制链接' }}
              </button>
              <button class="link-open-btn" @click="tryOpen">尝试打开</button>
              <button class="link-close-btn" @click="linkModal.url = ''">关闭</button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 链接复制对话框状态
const linkModal = reactive({
  url: '',
  copied: false
})

// 紧急热线
const hotlines = [
  {
    name: '全国心理援助热线',
    desc: '24 小时心理危机干预',
    phone: '400-161-9995'
  },
  {
    name: '北京心理危机研究与干预中心',
    desc: '24 小时自杀干预',
    phone: '010-82951332'
  },
  {
    name: '生命热线',
    desc: '24 小时生命守护',
    phone: '400-821-1215'
  }
]

// PHQ-2 简易筛查
const screeningQuestions = [
  { text: '做事时提不起劲或没有兴趣' },
  { text: '感到心情低落、沮丧或绝望' }
]

const optLabels = ['完全没有', '有几天', '一半以上时间', '几乎每天']

const answers = ref([null, null])

const allAnswered = computed(() => answers.value.every((a) => a !== null))

const result = ref(null)

function submitScreening() {
  if (!allAnswered.value) return
  const score = answers.value.reduce((s, a) => s + a, 0)
  let level, levelText, advice
  if (score <= 1) {
    level = 'low'
    levelText = '情绪状态良好 🌱'
    advice = '继续保持现在的生活节奏。感到情绪波动时，欢迎来暖声倾诉。'
  } else if (score <= 3) {
    level = 'mid'
    levelText = '轻度情绪困扰 🍂'
    advice = '建议多关注自我状态，尝试规律作息与适度运动。如果情绪持续两周以上，可考虑寻求学校或单位心理辅导。'
  } else {
    level = 'high'
    levelText = '建议寻求专业支持 💛'
    advice = '你的情绪困扰可能已经影响日常生活。强烈建议预约心理咨询师或前往正规医院心理科评估，你不必独自面对。'
  }
  result.value = { score, level, levelText, advice }
}

// 专业资源分类
const resourceCategories = [
  {
    title: '在线心理咨询',
    icon: '💬',
    items: [
      { name: '简单心理', desc: '专业心理咨询平台，可预约认证咨询师', url: 'https://www.jiandanxinli.com/' },
      { name: '壹心理', desc: '在线心理咨询与心理测评', url: 'https://www.xinli001.com/' },
      { name: '知乎心理', desc: '心理学科普与问答社区', url: 'https://www.zhihu.com/topic/19551432' }
    ]
  },
  {
    title: '公益与政府资源',
    icon: '🏛️',
    items: [
      { name: '12320 公共卫生热线', desc: '可转接心理援助', url: 'tel:12320' },
      { name: '12355 青少年服务台', desc: '面向青少年的心理与法律援助', url: 'tel:12355' },
      { name: '学校心理咨询中心', desc: '在校学生免费服务，请咨询辅导员', url: '' }
    ]
  },
  {
    title: '自助学习',
    icon: '📖',
    items: [
      { name: '壹心理测评', desc: '专业心理测评工具合集', url: 'https://www.xinli001.com/ceshi' },
      { name: '525心理网', desc: '心理学科普文章与自我成长资源', url: 'https://www.psy525.cn/' },
      { name: '心理学书单', desc: '豆瓣心理学标签下的高分书籍合集', url: 'https://book.douban.com/tag/心理学' }
    ]
  }
]

function goBack() {
  router.push('/')
}

// 处理资源链接点击：
// tel: 协议交给浏览器原生处理；http 链接弹出对话框让用户复制或打开
// （Trae 内置浏览器无法加载外部网站，直接跳转会白屏）
function handleResourceClick(e, url) {
  if (url.startsWith('tel:')) return
  e.preventDefault()
  linkModal.url = url
  linkModal.copied = false
}

// 复制链接到剪贴板
async function copyUrl() {
  try {
    await navigator.clipboard.writeText(linkModal.url)
    linkModal.copied = true
    setTimeout(() => { linkModal.copied = false }, 2000)
  } catch (_) {
    // 降级方案：用 execCommand
    const ta = document.createElement('textarea')
    ta.value = linkModal.url
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
      linkModal.copied = true
      setTimeout(() => { linkModal.copied = false }, 2000)
    } catch (_) {
      alert('复制失败，请手动选中链接复制：\n' + linkModal.url)
    }
    document.body.removeChild(ta)
  }
}

// 尝试在新窗口打开（外部浏览器中可用）
function tryOpen() {
  window.open(linkModal.url, '_blank', 'noopener')
}
</script>

<style scoped>
.resources-page {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  background-color: var(--color-bg);
  padding: 16px 16px 40px;
}

.resources-header {
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

.resources-title {
  font-family: var(--font-heading);
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--color-ink);
}

.resources-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 紧急求助卡 */
.emergency-card {
  background: linear-gradient(135deg, #FEF2F2, #FFF7ED);
  border: 1px solid rgba(225, 29, 72, 0.2);
  border-radius: var(--radius-xl);
  padding: 24px 20px;
  text-align: center;
}

.emergency-emoji {
  font-size: 2.5rem;
  margin-bottom: 8px;
}

.emergency-title {
  font-family: var(--font-heading);
  font-size: var(--text-xl);
  color: var(--color-accent);
  margin-bottom: 8px;
  font-weight: 600;
}

.emergency-text {
  font-size: var(--text-sm);
  color: var(--color-ink-secondary);
  line-height: 1.6;
  margin-bottom: 16px;
}

.hotline-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hotline-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  background: var(--color-bg-surface);
  padding: 12px 14px;
  border-radius: var(--radius-lg);
  text-decoration: none;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.hotline-item:hover {
  border-color: var(--color-accent);
  transform: translateX(2px);
}

.hotline-name {
  font-size: var(--text-sm);
  color: var(--color-ink);
  font-weight: 600;
  margin: 0;
}

.hotline-desc {
  font-size: var(--text-xs);
  color: var(--color-muted);
  margin: 0;
}

.hotline-phone {
  font-size: var(--text-sm);
  color: var(--color-accent);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  margin-top: 2px;
}

/* 通用卡片 */
.screening-card,
.resource-list-card,
.notice-card {
  border-radius: var(--radius-xl);
  padding: 20px 18px;
}

.card-title {
  font-size: var(--text-base);
  color: var(--color-ink);
  margin-bottom: 12px;
  font-weight: 600;
}

/* 筛查 */
.screening-desc {
  font-size: var(--text-xs);
  color: var(--color-ink-secondary);
  line-height: 1.6;
  margin-bottom: 14px;
}

.screening-question {
  margin-bottom: 14px;
}

.q-text {
  font-size: var(--text-sm);
  color: var(--color-ink);
  margin-bottom: 8px;
}

.q-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.q-opt {
  padding: 8px 6px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-rule);
  background: var(--color-bg);
  color: var(--color-ink-secondary);
  font-size: var(--text-xs);
  cursor: pointer;
  transition: all 0.2s;
}

.q-opt:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.q-opt-active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.submit-btn {
  width: 100%;
  margin-top: 8px;
  padding: 12px;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: #fff;
  border: none;
  cursor: pointer;
  font-size: var(--text-base);
  transition: all 0.2s;
}

.submit-btn:hover:not(:disabled) {
  background: var(--color-primary-light);
}

.submit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.result-card {
  margin-top: 14px;
  padding: 16px;
  border-radius: var(--radius-lg);
  text-align: center;
}

.result-low {
  background: rgba(34, 197, 94, 0.12);
}

.result-mid {
  background: var(--color-primary-pale);
}

.result-high {
  background: rgba(225, 29, 72, 0.12);
}

.result-score {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-ink);
  margin-bottom: 4px;
  font-variant-numeric: tabular-nums;
}

.result-level {
  font-size: var(--text-base);
  color: var(--color-ink);
  margin-bottom: 8px;
  font-weight: 500;
}

.result-advice {
  font-size: var(--text-sm);
  color: var(--color-ink-secondary);
  line-height: 1.7;
  text-align: left;
}

/* 资源分类 */
.resource-cat {
  margin-bottom: 18px;
}

.resource-cat:last-child {
  margin-bottom: 0;
}

.cat-title {
  font-size: var(--text-sm);
  color: var(--color-primary);
  font-weight: 600;
  margin-bottom: 8px;
}

.cat-items {
  list-style: none;
  padding: 0;
  margin: 0;
}

.cat-items li {
  margin-bottom: 6px;
}

.resource-link {
  display: flex;
  flex-direction: column;
  padding: 10px 12px;
  background: var(--color-bg-alt);
  border-radius: var(--radius-md);
  text-decoration: none;
  transition: all 0.2s;
}

a.resource-link:hover {
  background: var(--color-primary-pale);
  transform: translateX(2px);
}

.resource-name {
  font-size: var(--text-sm);
  color: var(--color-ink);
  font-weight: 500;
  margin-bottom: 2px;
}

.resource-desc {
  font-size: var(--text-xs);
  color: var(--color-muted);
}

/* 提示卡 */
.notice-card {
  background: linear-gradient(135deg, var(--color-primary-pale), var(--color-bg-surface));
}

.notice-text {
  font-size: var(--text-sm);
  color: var(--color-ink-secondary);
  line-height: 1.8;
}

.notice-text strong {
  color: var(--color-primary);
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* 链接复制对话框 */
.link-mask {
  position: fixed;
  inset: 0;
  background: rgba(45, 42, 38, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 24px;
}

.link-dialog {
  max-width: 340px;
  width: 100%;
  background: var(--color-bg-surface);
  border-radius: var(--radius-xl);
  padding: 24px 20px;
  box-shadow: 0 10px 40px rgba(45, 42, 38, 0.2);
}

.link-dialog-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-ink);
  margin-bottom: 8px;
  text-align: center;
}

.link-dialog-desc {
  font-size: var(--text-xs);
  color: var(--color-ink-secondary);
  line-height: 1.6;
  margin-bottom: 14px;
  text-align: center;
}

.link-url-box {
  background: var(--color-bg-alt);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  margin-bottom: 14px;
  word-break: break-all;
  border: 1px solid var(--color-rule);
}

.link-url-text {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-primary);
  user-select: all;
}

.link-dialog-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.link-copy-btn,
.link-open-btn,
.link-close-btn {
  width: 100%;
  padding: 10px;
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  font-size: var(--text-sm);
  transition: all 0.2s;
}

.link-copy-btn {
  background: var(--color-primary);
  color: #fff;
}

.link-copy-btn:hover {
  background: var(--color-primary-light);
}

.link-open-btn {
  background: var(--color-bg-alt);
  color: var(--color-ink-secondary);
}

.link-open-btn:hover {
  background: var(--color-rule);
}

.link-close-btn {
  background: transparent;
  color: var(--color-muted);
}

.link-close-btn:hover {
  color: var(--color-ink);
}
</style>
