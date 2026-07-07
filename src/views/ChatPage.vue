<template>
  <div class="chat-page">
    <header class="chat-header glass">
      <button class="back-btn" @click="goBack">←</button>
      <span class="header-title">暖声</span>
      <div class="header-right">
        <!-- 音色选择器 -->
        <button
          v-if="tts.supported"
          class="voice-selector-btn"
          :title="'选择语音: ' + currentVoiceLabel"
          @click="showVoicePicker = !showVoicePicker"
        >
          <img
            v-if="currentVoiceAvatar"
            :src="currentVoiceAvatar"
            :alt="currentVoiceLabel"
            class="selector-avatar-img"
          />
          <span v-else>{{ currentVoiceEmoji }}</span>
        </button>
        <!-- 自动语音开关 -->
        <button
          v-if="tts.supported"
          class="voice-toggle"
          :class="{ 'voice-on': tts.enabled.value }"
          :title="tts.enabled.value ? '关闭自动语音陪伴' : '开启自动语音陪伴'"
          @click="tts.toggleEnabled()"
        >
          {{ tts.enabled.value ? '🔊' : '🔈' }}
        </button>
        <span class="header-time">{{ currentTime }}</span>
      </div>
    </header>

    <!-- 音色选择弹层 -->
    <div v-if="showVoicePicker" class="voice-picker-overlay" @click.self="showVoicePicker = false">
      <div class="voice-picker-panel">
        <div class="voice-picker-header">
          <span class="voice-picker-title">选择语音陪伴</span>
          <button class="voice-picker-close" @click="showVoicePicker = false">✕</button>
        </div>
        <div class="voice-list">
          <div
            v-for="voice in voiceList"
            :key="voice.id"
            class="voice-item"
            :class="{ 'voice-active': tts.currentVoice === voice.id }"
            @click="selectVoice(voice.id)"
          >
            <img
              :src="voice.avatar"
              :alt="voice.name"
              class="voice-avatar-img"
              loading="lazy"
            />
            <div class="voice-info">
              <div class="voice-name">{{ voice.name }}</div>
              <div class="voice-desc">{{ voice.label }} · {{ voice.style }}</div>
            </div>
            <div v-if="tts.currentVoice === voice.id" class="voice-check">✓</div>
          </div>
        </div>
        <!-- 试听按钮 -->
        <div class="voice-preview-bar">
          <button class="preview-btn" @click="previewVoice" :disabled="previewing">
            {{ previewing ? '播放中...' : '试听当前音色' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="!authStore.isLoggedIn()" class="guest-hint-bar">
      <span class="guest-hint-icon">💡</span>
      <span class="guest-hint-text">当前为游客模式，数据仅保存在浏览器本地，清缓存可能丢失</span>
      <router-link to="/login" class="guest-hint-link">登录保存</router-link>
    </div>

    <!-- 对话展示区 -->
    <div class="chat-messages" ref="messagesContainer">
      <TransitionGroup name="message">
        <div
          v-for="msg in chatStore.messages"
          :key="msg.id"
          class="message-wrapper"
          :class="'msg-' + msg.role"
        >
          <!-- 情绪标签 -->
          <span v-if="msg.emotion && msg.role === 'user'" class="emotion-badge">
            {{ msg.emotion }}
          </span>
          <MessageBubble
            :message="msg"
            :isLast="msg === chatStore.messages[chatStore.messages.length - 1]"
          />
        </div>
      </TransitionGroup>

      <!-- 加载中 -->
      <div v-if="chatStore.loading" class="message-wrapper msg-assistant">
        <div class="typing-bubble">
          <span class="typing-text">正在输入</span>
          <div class="dot-typing">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>

      <!-- 底部操作按钮 -->
      <div v-if="showActionButtons" class="action-buttons">
        <button class="action-btn" @click="focusInput">
          💬 再说说
        </button>
        <button class="action-btn action-btn-calm" @click="goCalm">
          🌙 休息一下
        </button>
        <button class="action-btn action-btn-help" @click="goResources">
          🌿 需要更多支持
        </button>
      </div>
    </div>

    <!-- 底部输入区 -->
    <div class="chat-input-area glass">
      <!-- 语音实时识别文字（录音中显示） -->
      <div v-if="stt.isRecording.value" class="voice-recording-bar">
        <span class="recording-dot"></span>
        <span class="recording-text">{{ stt.transcript.value || '正在聆听…说出你想说的' }}</span>
      </div>

      <!-- 情绪标签选择栏 -->
      <div v-if="!stt.isRecording.value" class="emotion-tags hide-scrollbar">
        <EmotionTag
          v-for="tag in emotionTags"
          :key="tag.id"
          :emotion="tag"
          :selected="chatStore.currentEmotion === tag.id"
          @select="handleEmotionSelect(tag)"
        />
      </div>

      <!-- 输入行 -->
      <div class="input-row">
        <button
          v-if="stt.supported"
          class="mic-btn"
          :class="{ 'mic-recording': stt.isRecording.value }"
          :title="stt.isRecording.value ? '停止录音' : '语音倾诉'"
          @click="toggleMic"
        >
          {{ stt.isRecording.value ? '⏹' : '🎤' }}
        </button>
        <textarea
          ref="inputRef"
          class="chat-textarea"
          v-model="inputText"
          placeholder="在这里写下你想说的话..."
          @keydown="handleKeydown"
          @input="autoResize"
          rows="1"
        ></textarea>
        <button
          class="send-btn"
          :disabled="!inputText.trim() || chatStore.loading"
          @click="sendMessage"
        >
          🚀
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from '../stores/chat.js'
import { useAuthStore } from '../stores/auth.js'
import { useTTS } from '../composables/useTTS.js'
import { useSTT } from '../composables/useSTT.js'
import MessageBubble from '../components/MessageBubble.vue'
import EmotionTag from '../components/EmotionTag.vue'

const router = useRouter()
const chatStore = useChatStore()
const authStore = useAuthStore()
const tts = useTTS()
const stt = useSTT()

const inputText = ref('')
const inputRef = ref(null)
const messagesContainer = ref(null)
const currentTime = ref('')
let timeInterval = null

// 语音选择器
const showVoicePicker = ref(false)
const voiceList = ref([])
const previewing = ref(false)

// 当前音色标签
const currentVoiceLabel = computed(() => {
  const voice = voiceList.value.find(v => v.id === tts.currentVoice.value)
  return voice ? voice.name : 'vivi'
})

const currentVoiceEmoji = computed(() => {
  const voice = voiceList.value.find(v => v.id === tts.currentVoice.value)
  if (!voice) return '👩'
  return voice.gender === 'female' ? '👩' : '👨'
})

const currentVoiceAvatar = computed(() => {
  const voice = voiceList.value.find(v => v.id === tts.currentVoice.value)
  return voice ? voice.avatar : ''
})

// 加载音色列表
async function loadVoices() {
  const voices = await tts.getVoices()
  voiceList.value = voices
}

function selectVoice(voiceId) {
  tts.setVoice(voiceId)
  showVoicePicker.value = false
}

async function previewVoice() {
  if (previewing.value) return
  previewing.value = true
  await tts.speak('你好，我是暖声，很高兴认识你。希望我的陪伴能带给你温暖和力量。', 'preview', tts.currentVoice.value)
  // 2秒后重置状态（音频播放结束或出错）
  setTimeout(() => {
    previewing.value = false
  }, 3000)
}

// 情绪标签列表
const emotionTags = [
  { id: 'sad', label: '难过', emoji: '😔' },
  { id: 'anxious', label: '焦虑', emoji: '😰' },
  { id: 'irritated', label: '烦躁', emoji: '😤' },
  { id: 'lonely', label: '孤独', emoji: '😢' },
  { id: 'stressed', label: '压力大', emoji: '😫' },
  { id: 'insomnia', label: '失眠', emoji: '😴' }
]

// 显示操作按钮
const showActionButtons = computed(() => {
  const msgs = chatStore.messages
  if (msgs.length === 0) return false
  const lastMsg = msgs[msgs.length - 1]
  return lastMsg.role === 'assistant' && !chatStore.loading
})

// 时间更新
function updateTime() {
  const now = new Date()
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  currentTime.value = `${h}:${m}`
}

onMounted(() => {
  updateTime()
  timeInterval = setInterval(updateTime, 1000)
  scrollToBottom()
  loadVoices()
  if (authStore.isLoggedIn()) {
    chatStore.syncFromCloud()
  }
})

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval)
  // 离开对话页时停止语音播放和录音
  tts.stop()
  stt.stop()
})

// 监听消息变化，自动滚动到底部
watch(
  () => chatStore.messages.length,
  () => {
    nextTick(() => scrollToBottom())
  }
)

watch(
  () => chatStore.loading,
  (val) => {
    if (val) {
      nextTick(() => scrollToBottom())
    }
  }
)

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

function goBack() {
  router.push('/')
}

function goCalm() {
  router.push('/calm')
}

function goResources() {
  router.push('/resources')
}

function focusInput() {
  inputRef.value?.focus()
}

function handleEmotionSelect(tag) {
  if (chatStore.currentEmotion === tag.id) {
    chatStore.setEmotion('')
  } else {
    chatStore.setEmotion(tag.id)
  }
}

function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

function autoResize() {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'
  const maxHeight = 120 // 约4行
  el.style.height = Math.min(el.scrollHeight, maxHeight) + 'px'
}

// ===== 语音倾诉 =====
function toggleMic() {
  if (!stt.supported) return
  // 开始录音：清空输入框，避免混淆
  if (!stt.isRecording.value) {
    inputText.value = ''
  }
  stt.toggle((finalText) => {
    // 识别结束：把最终文字填入输入框，自动聚焦以便用户编辑/发送
    inputText.value = finalText
    nextTick(() => {
      inputRef.value?.focus()
      autoResize()
    })
  })
}

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || chatStore.loading) return

  const emotionTag = emotionTags.find((t) => t.id === chatStore.currentEmotion)
  const emotionLabel = emotionTag ? `${emotionTag.emoji} ${emotionTag.label}` : null

  // 添加用户消息
  chatStore.addMessage({
    role: 'user',
    content: text,
    emotion: emotionLabel
  })

  inputText.value = ''
  if (inputRef.value) {
    inputRef.value.style.height = 'auto'
  }

  // 显示加载状态
  chatStore.setLoading(true)

  await nextTick()
  scrollToBottom()

  // 尝试调用 API
  let replyContent = ''
  try {
    const historyMsgs = chatStore.messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content }))

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...authStore.getAuthHeader()
      },
      body: JSON.stringify({
        message: text,
        emotion: chatStore.currentEmotion,
        history: historyMsgs
      })
    })

    if (response.ok) {
      const data = await response.json()
      replyContent = data.reply || data.message || data.content
    } else {
      throw new Error('API error')
    }
  } catch (err) {
    replyContent = '抱歉，暖声暂时没能回应。请稍后再试一下。'
  }

  chatStore.setLoading(false)

  // 添加 AI 回复
  const aiMsg = chatStore.addMessage({
    role: 'assistant',
    content: replyContent
  })

  // 如果开启了自动语音陪伴，自动播放 AI 回复
  if (tts.enabled.value && tts.supported) {
    // 略延迟，等 DOM 渲染完
    setTimeout(() => {
      tts.speak(replyContent, aiMsg.id)
    }, 200)
  }

  await nextTick()
  scrollToBottom()
}
</script>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 480px;
  margin: 0 auto;
  background-color: var(--color-bg);
  position: relative;
}

/* ===== 顶部导航栏 ===== */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid var(--color-rule);
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

.header-title {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--color-ink);
  flex: 1;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.voice-toggle {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: var(--color-bg-alt);
  border: 1px solid var(--color-rule);
  cursor: pointer;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  opacity: 0.7;
}

.voice-toggle:hover {
  opacity: 1;
  background: var(--color-primary-pale);
}

.voice-toggle.voice-on {
  background: var(--color-primary);
  border-color: var(--color-primary);
  opacity: 1;
  box-shadow: 0 0 0 3px var(--color-primary-pale);
  animation: voice-pulse 2s ease-in-out infinite;
}

@keyframes voice-pulse {
  0%, 100% { box-shadow: 0 0 0 3px var(--color-primary-pale); }
  50% { box-shadow: 0 0 0 6px var(--color-primary-pale); }
}

.header-time {
  font-size: var(--text-sm);
  color: var(--color-muted);
  font-variant-numeric: tabular-nums;
}

.guest-hint-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(245, 158, 11, 0.08);
  border-bottom: 1px solid rgba(245, 158, 11, 0.15);
  font-size: var(--text-xs);
}

.guest-hint-icon {
  font-size: 0.85rem;
}

.guest-hint-text {
  flex: 1;
  color: var(--color-primary);
  line-height: 1.4;
}

.guest-hint-link {
  color: var(--color-primary);
  font-weight: 600;
  text-decoration: none;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  transition: background 0.2s;
}

.guest-hint-link:hover {
  background: rgba(245, 158, 11, 0.15);
}

/* ===== 对话展示区 ===== */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-bottom: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-wrapper {
  display: flex;
  flex-direction: column;
}

.msg-system {
  align-items: center;
}

.msg-user {
  align-items: flex-end;
}

.msg-assistant {
  align-items: flex-start;
}

.emotion-badge {
  display: inline-block;
  background: var(--color-primary-pale);
  color: var(--color-primary);
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  margin-bottom: 4px;
  margin-left: 4px;
}

/* ===== 加载中气泡 ===== */
.typing-bubble {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-primary);
  padding: 12px 16px;
  border-radius: var(--radius-xl) var(--radius-xl) var(--radius-sm) var(--radius-xl);
  max-width: 80%;
  box-shadow: 0 2px 8px rgba(45, 42, 38, 0.08);
}

.typing-text {
  font-size: var(--text-sm);
  color: #fff;
}

.typing-bubble .dot-typing span {
  background-color: #fff;
}

/* ===== 底部操作按钮 ===== */
.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  padding: 8px 0 16px;
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

/* ===== 底部输入区 ===== */
.chat-input-area {
  position: sticky;
  bottom: 0;
  padding: 12px 16px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  border-top: 1px solid var(--color-rule);
}

.emotion-tags {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 10px;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.emotion-tags::-webkit-scrollbar {
  display: none;
}

.input-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.chat-textarea {
  flex: 1;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-rule);
  padding: 10px 14px;
  font-size: var(--text-base);
  resize: none;
  outline: none;
  background: rgba(255, 255, 255, 0.7);
  color: var(--color-ink);
  line-height: 1.5;
  max-height: 120px;
  transition: border-color 0.2s;
}

.chat-textarea:focus {
  border-color: var(--color-primary);
}

.chat-textarea::placeholder {
  color: var(--color-muted);
}

.send-btn {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: #fff;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(217, 119, 6, 0.35);
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.1);
  background: var(--color-primary-light);
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.45);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== 语音倾诉 ===== */
.mic-btn {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: var(--color-bg-alt);
  color: var(--color-ink-secondary);
  border: 1px solid var(--color-rule);
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}

.mic-btn:hover {
  background: var(--color-primary-pale);
  color: var(--color-primary);
}

.mic-btn.mic-recording {
  background: var(--color-accent);
  color: #fff;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 4px rgba(225, 29, 72, 0.18);
  animation: mic-pulse 1.6s ease-in-out infinite;
}

@keyframes mic-pulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(225, 29, 72, 0.18); }
  50% { box-shadow: 0 0 0 9px rgba(225, 29, 72, 0.12); }
}

.voice-recording-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: var(--radius-lg);
  background: var(--color-accent-light);
  color: #fff;
  font-size: var(--text-sm);
  margin-bottom: 8px;
  animation: fade-in 0.3s ease;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.recording-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #fff;
  animation: blink-rec 1s ease-in-out infinite;
  flex-shrink: 0;
}

@keyframes blink-rec {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.recording-text {
  flex: 1;
  line-height: 1.4;
}

/* ===== 音色选择器 ===== */
.voice-selector-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  background: var(--color-bg-alt);
  border: 1px solid var(--color-rule);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  opacity: 0.85;
  padding: 0;
  overflow: hidden;
}

.voice-selector-btn:hover {
  opacity: 1;
  border-color: var(--color-primary);
  transform: scale(1.08);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.selector-avatar-img {
  width: 100%;
  height: 100%;
  border-radius: var(--radius-full);
  object-fit: cover;
}

/* 弹层遮罩 */
.voice-picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: fade-in 0.2s ease;
}

/* 弹层面板 */
.voice-picker-panel {
  background: #fff;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  width: 100%;
  max-width: 480px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  animation: slide-up 0.3s ease;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
}

@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.voice-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-rule);
}

.voice-picker-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-ink);
}

.voice-picker-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: var(--color-muted);
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  transition: color 0.2s;
}

.voice-picker-close:hover {
  color: var(--color-ink);
}

/* 音色列表 */
.voice-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 16px;
}

.voice-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 12px;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;
}

.voice-item:hover {
  background: var(--color-bg-alt);
}

.voice-item.voice-active {
  background: var(--color-primary-pale);
  border: 1px solid var(--color-primary);
}

.voice-avatar-img {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-full);
  object-fit: cover;
  flex-shrink: 0;
  border: 2px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
}

.voice-info {
  flex: 1;
}

.voice-name {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-ink);
  margin-bottom: 2px;
}

.voice-desc {
  font-size: var(--text-sm);
  color: var(--color-muted);
}

.voice-check {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  flex-shrink: 0;
}

/* 试听按钮栏 */
.voice-preview-bar {
  padding: 12px 20px 20px;
  border-top: 1px solid var(--color-rule);
}

.preview-btn {
  width: 100%;
  padding: 12px;
  border-radius: var(--radius-lg);
  background: var(--color-primary);
  color: #fff;
  border: none;
  font-size: var(--text-base);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.preview-btn:hover:not(:disabled) {
  background: var(--color-primary-light);
}

.preview-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>