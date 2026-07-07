<template>
  <div class="onboarding-page">
    <div class="onboarding-container">
      <button v-if="currentStep > 0" class="skip-btn" @click="finish">跳过</button>

      <div class="slides-container">
        <div class="slides-track" :style="{ transform: `translateX(-${currentStep * (100 / 3)}%)` }">
          <!-- 第1页：欢迎 -->
          <div class="slide">
            <div class="slide-emoji">🌙</div>
            <h2 class="slide-title">欢迎来到暖声</h2>
            <p class="slide-desc">
              一个温暖的情绪树洞<br />
              在这里，你可以放心地说心里话<br />
              没有人知道你是谁
            </p>
          </div>

          <!-- 第2页：功能介绍 -->
          <div class="slide">
            <div class="slide-emoji">💬</div>
            <h2 class="slide-title">AI 温暖陪伴</h2>
            <p class="slide-desc">
              难过、焦虑、孤独的时候<br />
              暖声 AI 会认真听你说<br />
              给你温柔的回应和陪伴
            </p>
            <div class="feature-tags">
              <span class="feature-tag">😔 难过</span>
              <span class="feature-tag">😰 焦虑</span>
              <span class="feature-tag">😢 孤独</span>
              <span class="feature-tag">😫 压力大</span>
            </div>
          </div>

          <!-- 第3页：社区 -->
          <div class="slide">
            <div class="slide-emoji">🌠</div>
            <h2 class="slide-title">回声墙 · 温暖相遇</h2>
            <p class="slide-desc">
              在树洞广场分享你的故事<br />
              也可以给陌生人一句温暖的话<br />
              我们都是彼此的光
            </p>
            <div class="feature-tags">
              <span class="feature-tag">匿名发布</span>
              <span class="feature-tag">温暖回应</span>
              <span class="feature-tag">安全审核</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 指示点 -->
      <div class="dots">
        <span
          v-for="(_, i) in 3"
          :key="i"
          class="dot"
          :class="{ active: currentStep === i }"
        ></span>
      </div>

      <!-- 底部按钮 -->
      <div class="bottom-actions">
        <button
          v-if="currentStep < 2"
          class="next-btn"
          @click="nextStep"
        >
          下一步 →
        </button>
        <button
          v-else
          class="start-btn"
          @click="finish"
        >
          开始使用 ✨
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const currentStep = ref(0)
const isTransitioning = ref(false)

function nextStep() {
  if (isTransitioning.value) return
  if (currentStep.value >= 2) return
  
  isTransitioning.value = true
  currentStep.value++
  
  setTimeout(() => {
    isTransitioning.value = false
  }, 400)
}

function finish() {
  if (isTransitioning.value) return
  localStorage.setItem('warmecho_onboarding_done', '1')
  router.push('/')
}
</script>

<style scoped>
.onboarding-page {
  min-height: 100vh;
  background: linear-gradient(180deg, var(--color-bg) 0%, #FEF3C7 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.onboarding-container {
  width: 100%;
  max-width: 480px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  padding: 40px 24px 32px;
}

.skip-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  background: none;
  border: none;
  color: var(--color-muted);
  font-size: var(--text-sm);
  cursor: pointer;
  padding: 8px 12px;
  border-radius: var(--radius-full);
  transition: all 0.2s;
  z-index: 10;
}

.skip-btn:hover {
  background: var(--color-primary-pale);
  color: var(--color-primary);
}

.slides-container {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.slides-track {
  display: flex;
  width: 300%;
  height: 100%;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide {
  width: 33.333%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 20px;
}

.slide-emoji {
  font-size: 5rem;
  margin-bottom: 24px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.slide-title {
  font-family: var(--font-heading);
  font-size: var(--text-2xl);
  color: var(--color-ink);
  margin-bottom: 16px;
  font-weight: 600;
}

.slide-desc {
  font-size: var(--text-base);
  color: var(--color-ink-secondary);
  line-height: 1.8;
  margin-bottom: 24px;
}

.feature-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.feature-tag {
  padding: 6px 14px;
  background: var(--color-primary-pale);
  color: var(--color-primary);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: 500;
}

.dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-rule);
  transition: all 0.3s;
}

.dot.active {
  width: 24px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
}

.bottom-actions {
  display: flex;
  justify-content: center;
}

.next-btn,
.start-btn {
  padding: 14px 48px;
  border-radius: var(--radius-full);
  font-size: var(--text-base);
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.3s;
}

.next-btn {
  background: var(--color-bg-surface);
  color: var(--color-primary);
  border: 2px solid var(--color-primary);
}

.next-btn:hover {
  transform: scale(1.05);
  background: var(--color-primary-pale);
}

.start-btn {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
  color: #fff;
  box-shadow: 0 4px 20px rgba(217, 119, 6, 0.4);
}

.start-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 24px rgba(217, 119, 6, 0.5);
}

@media (max-width: 360px) {
  .slide-emoji {
    font-size: 4rem;
  }

  .slide-title {
    font-size: var(--text-xl);
  }

  .next-btn,
  .start-btn {
    padding: 12px 36px;
    font-size: var(--text-sm);
  }
}
</style>
