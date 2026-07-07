<template>
  <div class="calm-page">
    <div class="calm-content">
      <!-- 安抚语录区域 -->
      <div class="calm-card glass">
        <CalmQuote :text="currentQuote" :speed="80" />
      </div>

      <!-- 统计信息 -->
      <p class="calm-info">🌌 今晚有 <strong>{{ peopleCount }}</strong> 个人在这里倾诉过，你并不孤单。</p>

      <!-- 底部按钮 -->
      <div class="calm-actions">
        <button class="calm-btn btn-glass" @click="goGallery">💫 听听别人的故事</button>
        <button class="calm-btn btn-glass" @click="goChat">✍️ 再写写</button>
        <button class="calm-btn btn-glass" @click="goGrowth">📈 看看成长轨迹</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import CalmQuote from '../components/CalmQuote.vue'

const router = useRouter()

const quotes = [
  '你已经很棒了，能撑到今天。',
  '有时候停下来，也是一种前进。',
  '你的感受很重要，值得被听见。',
  '允许自己不开心，也是爱自己的一种方式。',
  '世界很大，你很小，但你的感受，就是你的全世界。',
  '别怕，月光会照亮每一个失眠的人。',
  '你不需要一直坚强，脆弱也是你的一部分。',
  '今天的不开心，就到此为止吧。',
  '深呼吸，你已经在慢慢变好了。',
  '万物皆有裂痕，那是光照进来的地方。'
]

const currentQuote = quotes[Math.floor(Math.random() * quotes.length)]
const peopleCount = Math.floor(Math.random() * 401) + 100 // 100-500

function goGallery() {
  router.push('/gallery')
}

function goChat() {
  router.push('/chat')
}

function goGrowth() {
  router.push('/growth')
}
</script>

<style scoped>
.calm-page {
  min-height: 100vh;
  background: linear-gradient(180deg, var(--color-bg) 0%, #4A3B2A 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
}

.calm-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 400px;
}

.calm-card {
  width: 100%;
  border-radius: var(--radius-xl);
  padding: 40px 30px;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  margin-bottom: 30px;
}

.calm-info {
  color: rgba(255, 248, 240, 0.85);
  font-size: var(--text-sm);
  text-align: center;
  margin-bottom: 30px;
  line-height: 1.6;
}

.calm-info strong {
  color: var(--color-primary-light);
  font-weight: 600;
}

.calm-actions {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
}

.calm-btn {
  padding: 12px 24px;
  border-radius: var(--radius-full);
  font-size: var(--text-base);
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.calm-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
}
</style>