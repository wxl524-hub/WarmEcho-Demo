<template>
  <div class="calm-quote">
    <p class="quote-text">
      {{ displayText }}
      <span class="quote-cursor" :class="{ 'cursor-blink': isTyping }">|</span>
    </p>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  text: {
    type: String,
    required: true
  },
  speed: {
    type: Number,
    default: 80
  }
})

const displayText = ref('')
const isTyping = ref(true)
let timer = null
let index = 0

onMounted(() => {
  timer = setInterval(() => {
    if (index < props.text.length) {
      displayText.value += props.text[index]
      index++
    } else {
      isTyping.value = false
      clearInterval(timer)
      timer = null
    }
  }, props.speed)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
})
</script>

<style scoped>
.calm-quote {
  width: 100%;
  text-align: center;
}

.quote-text {
  font-family: var(--font-heading);
  font-size: var(--text-xl);
  line-height: 1.8;
  color: var(--color-ink);
  font-weight: 400;
  letter-spacing: 0.03em;
}

.quote-cursor {
  display: inline;
  font-weight: 300;
  color: var(--color-primary);
}

.cursor-blink {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}
</style>