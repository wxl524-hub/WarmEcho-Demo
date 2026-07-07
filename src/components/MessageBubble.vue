<template>
  <div
    class="message-bubble"
    :class="['bubble-' + message.role]"
  >
    <div class="bubble-content">{{ message.content }}</div>
    <div class="bubble-footer">
      <span class="bubble-time">{{ formatTime(message.time) }}</span>
      <button
        v-if="message.role === 'assistant' && tts.supported"
        class="speak-btn"
        :class="{ 'speaking': tts.isPlaying.value && tts.currentId.value === message.id }"
        :title="speakingNow ? '停止播放' : '播放语音'"
        @click.stop="toggleSpeak"
      >
        {{ speakingNow ? '⏸' : '🔊' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTTS } from '../composables/useTTS.js'

const props = defineProps({
  message: {
    type: Object,
    required: true,
    default: () => ({ role: 'user', content: '', time: '', emotion: null })
  },
  isLast: {
    type: Boolean,
    default: false
  }
})

const tts = useTTS()

const speakingNow = computed(
  () => tts.isPlaying.value && tts.currentId.value === props.message.id
)

function toggleSpeak() {
  if (speakingNow.value) {
    tts.stop()
  } else {
    tts.speak(props.message.content, props.message.id)
  }
}

function formatTime(isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}
</script>

<style scoped>
.message-bubble {
  max-width: 80%;
  padding: 12px 16px;
  border-radius: var(--radius-xl);
  box-shadow: 0 2px 8px rgba(45, 42, 38, 0.06);
  word-break: break-word;
}

.bubble-system {
  background: var(--color-bg-alt);
  color: var(--color-ink-secondary);
  max-width: 90%;
  font-size: var(--text-sm);
  border-radius: var(--radius-xl);
  text-align: center;
  align-self: center;
}

.bubble-user {
  background: var(--color-bg-surface);
  color: var(--color-ink);
  border-radius: var(--radius-xl) var(--radius-xl) var(--radius-sm) var(--radius-xl);
  align-self: flex-end;
}

.bubble-assistant {
  background: var(--color-primary);
  color: #fff;
  border-radius: var(--radius-xl) var(--radius-xl) var(--radius-xl) var(--radius-sm);
  align-self: flex-start;
}

.bubble-content {
  font-size: var(--text-base);
  line-height: 1.6;
}

.bubble-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 6px;
}

.bubble-time {
  font-size: var(--text-xs);
  color: var(--color-muted);
}

.bubble-assistant .bubble-time {
  color: rgba(255, 255, 255, 0.75);
}

.bubble-user .bubble-time {
  color: var(--color-muted);
}

.speak-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0 2px;
  opacity: 0.7;
  transition: all 0.2s;
  line-height: 1;
}

.bubble-assistant .speak-btn {
  color: #fff;
}

.bubble-user .speak-btn,
.bubble-system .speak-btn {
  color: var(--color-ink-secondary);
}

.speak-btn:hover {
  opacity: 1;
  transform: scale(1.2);
}

.speak-btn.speaking {
  opacity: 1;
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.25); }
}
</style>