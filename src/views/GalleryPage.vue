<template>
  <div class="gallery-page">
    <div class="gallery-header glass">
      <button class="back-btn" @click="goBack">←</button>
      <h2 class="gallery-title">🌠 树洞广场</h2>
      <div class="header-actions">
        <button v-if="authStore.isLoggedIn()" class="my-echo-btn" @click="$router.push('/my-echo')">📝 我的</button>
        <button v-if="authStore.isLoggedIn()" class="refresh-btn" @click="loadAll">↻</button>
      </div>
    </div>

    <!-- 未登录提示 -->
    <div v-if="!authStore.isLoggedIn()" class="guest-block">
      <p class="guest-emoji">🔐</p>
      <p class="guest-title">登录后访问树洞广场</p>
      <p class="guest-desc">为了确保交流环境的安全与友善，树洞广场需要登录后才能访问。登录后你可以浏览他人的倾诉，也可以留下温暖的安慰。</p>
      <button class="primary-btn" @click="goLogin">去登录</button>
    </div>

    <div v-else>
      <p class="gallery-desc">这里的每一段倾诉，都是一颗星星。✨</p>

      <!-- 搜索和筛选栏 -->
      <div class="search-filter-bar">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchKeyword"
            type="text"
            class="search-input"
            placeholder="搜索内容或笔名…"
            @input="debouncedSearch"
          />
          <button v-if="searchKeyword" class="search-clear" @click="clearSearch">✕</button>
        </div>
        <div class="emotion-filter-bar hide-scrollbar">
          <button
            class="filter-chip"
            :class="{ active: filterEmotion === '' }"
            @click="setFilter('')"
          >
            全部
          </button>
          <button
            v-for="tag in filterEmotions"
            :key="tag.id"
            class="filter-chip"
            :class="{ active: filterEmotion === tag.id }"
            @click="setFilter(tag.id)"
          >
            {{ tag.emoji }} {{ tag.label }}
          </button>
        </div>
      </div>

      <!-- 加载中 -->
      <div v-if="galleryStore.loading" class="loading-state">
        <div class="dot-typing"><span></span><span></span><span></span></div>
        <p>加载中…</p>
      </div>

      <!-- 帖子列表 -->
      <div v-else-if="galleryStore.posts.length > 0" class="gallery-masonry">
        <div
          v-for="item in galleryStore.posts"
          :key="item.id"
          class="gallery-card"
        >
          <div class="card-header">
            <span class="card-author">{{ item.authorName }}</span>
            <span class="card-emotion" :style="{ background: getEmotionColor(item.emotion) }">
              {{ item.emotion }}
            </span>
          </div>
          <p class="card-content-preview">{{ truncate(item.content, 50) }}</p>
          <span class="card-time">{{ formatRelative(item.createdAt) }}</span>

          <div class="card-footer">
            <button
              class="like-btn"
              :class="{ liked: item.liked }"
              @click.stop="handleLike(item)"
            >
              <span class="like-icon">{{ item.liked ? '❤️' : '🤍' }}</span>
              <span class="like-count">{{ item.likeCount || 0 }}</span>
            </button>
            <button class="comfort-toggle" @click="openDetail(item)">
              💬 {{ item.comfortCount || 0 }}
            </button>
            <button v-if="item.content.length > 50" class="view-full-btn" @click="openDetail(item)">
              全文 →
            </button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <p class="empty-emoji">🌌</p>
        <p class="empty-text">还没有人分享故事</p>
        <p class="empty-hint">做第一个说出心声的人吧</p>
      </div>

      <!-- 底部发帖按钮 -->
      <button class="fab-btn" @click="showPostModal = true">✏️</button>

      <!-- 发帖弹层 -->
      <div v-if="showPostModal" class="post-modal-overlay" @click.self="showPostModal = false">
        <div class="post-modal-panel">
          <div class="post-modal-header">
            <span class="post-modal-title">写下你的心声</span>
            <button class="post-modal-close" @click="showPostModal = false">✕</button>
          </div>
          <div class="post-modal-body">
            <!-- 情绪选择 -->
            <div class="post-emotion-tags">
              <button
                v-for="tag in postEmotions"
                :key="tag.id"
                class="post-emotion-tag"
                :class="{ 'tag-active': postEmotion === tag.id }"
                @click="postEmotion = postEmotion === tag.id ? '' : tag.id"
              >
                {{ tag.emoji }} {{ tag.label }}
              </button>
            </div>
            <!-- 内容输入 -->
            <textarea
              v-model="postContent"
              class="post-textarea"
              placeholder="在这里写下你想说的话，会有温暖的人回应你…"
              maxlength="500"
              rows="5"
            ></textarea>
            <div class="post-char-count">{{ postContent.length }}/500</div>
          </div>
          <div class="post-modal-footer">
            <button class="post-cancel-btn" @click="showPostModal = false">取消</button>
            <button
              class="post-submit-btn"
              :disabled="!postContent.trim() || postSubmitting"
              @click="submitPost"
            >
              {{ postSubmitting ? '发布中…' : '发布' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 帖子详情弹层 -->
      <div v-if="detailPost" class="detail-overlay" @click.self="closeDetail">
        <div class="detail-panel">
          <div class="detail-header">
            <span class="detail-title">帖子详情</span>
            <button class="detail-close" @click="closeDetail">✕</button>
          </div>
          <div class="detail-body">
            <!-- 帖子全文 -->
            <div class="detail-post">
              <div class="detail-post-meta">
                <span class="detail-author">{{ detailPost.authorName }}</span>
                <span class="card-emotion" :style="{ background: getEmotionColor(detailPost.emotion) }">
                  {{ detailPost.emotion }}
                </span>
              </div>
              <p class="detail-content-full">{{ detailPost.content }}</p>
              <span class="detail-time">{{ formatRelative(detailPost.createdAt) }}</span>
            </div>

            <!-- 分隔线 -->
            <div class="detail-divider">
              <span>{{ detailPost.comfortCount || 0 }} 条温暖回应</span>
            </div>

            <!-- 评论列表 -->
            <div v-if="commentLoading" class="comment-loading">加载评论…</div>
            <div v-else-if="galleryStore.getCommentsForPost(detailPost.id).length > 0" class="detail-comment-list">
              <div
                v-for="c in galleryStore.getCommentsForPost(detailPost.id)"
                :key="c.id"
                class="comfort-item"
              >
                <span class="comfort-author">{{ c.authorName }}</span>
                <p class="comfort-text">{{ c.content }}</p>
                <span class="comfort-time">{{ formatRelative(c.createdAt) }}</span>
              </div>
            </div>
            <p v-else class="comfort-empty">还没有人留下安慰，做第一个温暖的人吧 ✨</p>
          </div>

          <!-- 评论输入 -->
          <div class="detail-input-bar">
            <input
              v-model="commentDraft[detailPost.id]"
              class="comfort-input"
              placeholder="留下一句温暖的话…"
              maxlength="200"
              @keydown.enter="submitComment(detailPost.id)"
            />
            <button
              class="comfort-send"
              :disabled="!commentDraft[detailPost.id]?.trim() || commentSubmitting"
              @click="submitComment(detailPost.id)"
            >
              💌
            </button>
          </div>
        </div>
      </div>

      <!-- Toast 提示 -->
      <Transition name="toast">
        <div v-if="toastMsg" class="toast" :class="toastType">
          {{ toastMsg }}
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGalleryStore } from '../stores/gallery.js'
import { useAuthStore } from '../stores/auth.js'

const router = useRouter()
const galleryStore = useGalleryStore()
const authStore = useAuthStore()

const detailPost = ref(null)
const commentDraft = reactive({})
const commentLoading = ref(false)
const commentSubmitting = ref(false)

// 发帖相关
const showPostModal = ref(false)
const postContent = ref('')
const postEmotion = ref('')
const postSubmitting = ref(false)

// 搜索筛选相关
const searchKeyword = ref('')
const filterEmotion = ref('')
let searchTimer = null

const filterEmotions = [
  { id: 'sad', label: '难过', emoji: '😔' },
  { id: 'anxious', label: '焦虑', emoji: '😰' },
  { id: 'irritated', label: '烦躁', emoji: '😤' },
  { id: 'lonely', label: '孤独', emoji: '😢' },
  { id: 'stressed', label: '压力大', emoji: '😫' },
  { id: 'insomnia', label: '失眠', emoji: '😴' }
]

function debouncedSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    loadAll()
  }, 300)
}

function clearSearch() {
  searchKeyword.value = ''
  loadAll()
}

function setFilter(emotionId) {
  filterEmotion.value = emotionId
  loadAll()
}

async function handleLike(post) {
  if (!authStore.isLoggedIn()) return
  try {
    const res = await fetch(`/api/gallery/posts/${post.id}/like`, {
      method: 'POST',
      headers: authStore.getAuthHeader()
    })
    if (res.ok) {
      const data = await res.json()
      post.liked = data.liked
      post.likeCount = data.likeCount
    }
  } catch { /* ignore */ }
}

// Toast
const toastMsg = ref('')
const toastType = ref('info')
let toastTimer = null

function showToast(msg, type = 'info') {
  toastMsg.value = msg
  toastType.value = type
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMsg.value = ''
  }, 3500)
}

const postEmotions = [
  { id: 'sad', label: '难过', emoji: '😔' },
  { id: 'anxious', label: '焦虑', emoji: '😰' },
  { id: 'irritated', label: '烦躁', emoji: '😤' },
  { id: 'lonely', label: '孤独', emoji: '😢' },
  { id: 'stressed', label: '压力大', emoji: '😫' },
  { id: 'insomnia', label: '失眠', emoji: '😴' }
]

// 情绪标签 -> 显示文本映射
const EMOTION_LABELS = {
  sad: '😔 难过',
  anxious: '😰 焦虑',
  irritated: '😤 烦躁',
  lonely: '😢 孤独',
  stressed: '😫 压力大',
  insomnia: '😴 失眠'
}

async function loadAll() {
  await galleryStore.fetchPosts({
    emotion: filterEmotion.value,
    keyword: searchKeyword.value
  })
}

onMounted(() => {
  if (authStore.isLoggedIn()) {
    loadAll()
  }
})

async function openDetail(post) {
  detailPost.value = post
  commentLoading.value = true
  await galleryStore.fetchComments(post.id)
  commentLoading.value = false
}

function closeDetail() {
  detailPost.value = null
}

function truncate(text, maxLen) {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '…'
}

async function submitComment(postId) {
  const text = (commentDraft[postId] || '').trim()
  if (!text) return
  commentSubmitting.value = true
  const result = await galleryStore.addComment(postId, text, authStore.getAuthHeader())
  commentSubmitting.value = false

  if (result.success) {
    commentDraft[postId] = ''
    showToast('评论成功，感谢你的温暖', 'success')
  } else {
    showToast(result.message || '评论失败', 'error')
  }
}

async function submitPost() {
  const text = postContent.value.trim()
  if (!text) return
  postSubmitting.value = true

  const emotionLabel = postEmotion.value ? EMOTION_LABELS[postEmotion.value] : '✨ 随心'
  const result = await galleryStore.createPost(text, emotionLabel, authStore.getAuthHeader())
  postSubmitting.value = false

  if (result.success) {
    postContent.value = ''
    postEmotion.value = ''
    showPostModal.value = false
    showToast('发布成功，你的声音已被听见', 'success')
  } else {
    showToast(result.message || '发布失败', 'error')
  }
}

function getEmotionColor(emotion) {
  const colors = {
    '😔 难过': 'rgba(139, 126, 114, 0.18)',
    '😰 焦虑': 'rgba(217, 119, 6, 0.18)',
    '😢 孤独': 'rgba(92, 85, 75, 0.18)',
    '😫 压力大': 'rgba(225, 29, 72, 0.15)',
    '😴 失眠': 'rgba(139, 126, 114, 0.22)',
    '😤 烦躁': 'rgba(251, 113, 133, 0.18)',
    '✨ 随心': 'rgba(245, 158, 11, 0.2)'
  }
  return colors[emotion] || 'rgba(217, 119, 6, 0.15)'
}

function formatRelative(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min}分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}小时前`
  const day = Math.floor(hr / 24)
  return `${day}天前`
}

function goBack() {
  router.push('/')
}

function goLogin() {
  router.push('/login')
}
</script>

<style scoped>
.gallery-page {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  background-color: var(--color-bg);
  padding-bottom: 80px;
  position: relative;
}

.gallery-header {
  display: flex;
  align-items: center;
  gap: 12px;
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

.gallery-title {
  font-family: var(--font-heading);
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--color-ink);
  flex: 1;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.my-echo-btn {
  font-size: var(--text-xs);
  color: var(--color-primary);
  background: var(--color-primary-pale);
  border: none;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  transition: all 0.2s;
  font-weight: 500;
}

.my-echo-btn:hover {
  background: var(--color-primary);
  color: #fff;
}

.refresh-btn {
  font-size: 1.2rem;
  color: var(--color-ink-secondary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-md);
  transition: background 0.2s;
}

.refresh-btn:hover {
  background: var(--color-primary-pale);
}

.gallery-desc {
  color: var(--color-primary);
  font-size: var(--text-sm);
  padding: 16px 16px 8px;
}

/* 搜索筛选栏 */
.search-filter-bar {
  padding: 0 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-rule);
  border-radius: var(--radius-full);
  padding: 0 14px;
  transition: border-color 0.2s;
}

.search-box:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-pale);
}

.search-icon {
  font-size: 0.9rem;
  opacity: 0.5;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  padding: 10px 0;
  font-size: var(--text-sm);
  color: var(--color-ink);
  min-width: 0;
}

.search-input::placeholder {
  color: var(--color-muted);
}

.search-clear {
  background: none;
  border: none;
  color: var(--color-muted);
  font-size: 0.8rem;
  cursor: pointer;
  padding: 4px;
  flex-shrink: 0;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.search-clear:hover {
  opacity: 1;
}

.emotion-filter-bar {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.filter-chip {
  flex-shrink: 0;
  padding: 6px 14px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-rule);
  background: var(--color-bg-surface);
  color: var(--color-ink-secondary);
  font-size: var(--text-xs);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.filter-chip:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.filter-chip.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

/* ===== 未登录 ===== */
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

/* ===== 加载/空状态 ===== */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 0;
  color: var(--color-muted);
  font-size: var(--text-sm);
}

.dot-typing {
  display: flex;
  gap: 4px;
}

.dot-typing span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  animation: dot-bounce 1.4s infinite ease-in-out;
}

.dot-typing span:nth-child(2) { animation-delay: 0.2s; }
.dot-typing span:nth-child(3) { animation-delay: 0.4s; }

@keyframes dot-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

.empty-state {
  text-align: center;
  padding: 80px 24px;
}

.empty-emoji {
  font-size: 3.5rem;
  margin-bottom: 12px;
}

.empty-text {
  font-size: var(--text-lg);
  color: var(--color-ink);
  font-weight: 500;
  margin-bottom: 4px;
}

.empty-hint {
  font-size: var(--text-sm);
  color: var(--color-muted);
}

/* ===== 帖子瀑布流 ===== */
.gallery-masonry {
  column-count: 1;
  column-gap: 12px;
  padding: 0 16px;
}

.gallery-card {
  background: var(--color-bg-surface);
  border-radius: var(--radius-xl);
  padding: 16px;
  box-shadow: 0 2px 12px rgba(45, 42, 38, 0.06);
  margin-bottom: 12px;
  break-inside: avoid;
  transition: transform 0.2s, box-shadow 0.2s;
}

.gallery-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(45, 42, 38, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.card-author {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-ink);
}

.card-emotion {
  display: inline-block;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  color: var(--color-ink);
}

.card-content-preview {
  font-size: var(--text-sm);
  line-height: 1.6;
  color: var(--color-ink);
  margin: 8px 0;
  word-break: break-word;
}

.card-time {
  display: block;
  color: var(--color-muted);
  font-size: var(--text-xs);
  margin-top: 6px;
}

.card-footer {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.like-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 0;
  transition: all 0.2s;
}

.like-btn:hover {
  transform: scale(1.1);
}

.like-btn.liked .like-icon {
  animation: heart-beat 0.4s ease;
}

@keyframes heart-beat {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.3); }
}

.like-icon {
  font-size: 1rem;
}

.like-count {
  font-size: var(--text-xs);
  color: var(--color-muted);
}

.like-btn.liked .like-count {
  color: var(--color-accent);
}

.comfort-toggle {
  background: transparent;
  border: none;
  color: var(--color-primary);
  font-size: var(--text-xs);
  cursor: pointer;
  padding: 4px 0;
  transition: opacity 0.2s;
}

.comfort-toggle:hover {
  opacity: 0.75;
}

.view-full-btn {
  background: transparent;
  border: none;
  color: var(--color-primary);
  font-size: var(--text-xs);
  cursor: pointer;
  padding: 4px 0;
  transition: opacity 0.2s;
  font-weight: 500;
  margin-left: auto;
}

.view-full-btn:hover {
  opacity: 0.75;
}

/* ===== 帖子详情弹层 ===== */
.detail-overlay {
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

.detail-panel {
  background: #fff;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  width: 100%;
  max-width: 480px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  animation: slide-up 0.3s ease;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-rule);
  flex-shrink: 0;
}

.detail-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-ink);
}

.detail-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: var(--color-muted);
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  transition: color 0.2s;
}

.detail-close:hover {
  color: var(--color-ink);
}

.detail-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.detail-post {
  margin-bottom: 16px;
}

.detail-post-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.detail-author {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-ink);
}

.detail-content-full {
  font-size: var(--text-base);
  line-height: 1.8;
  color: var(--color-ink);
  margin: 8px 0;
  word-break: break-word;
}

.detail-time {
  display: block;
  color: var(--color-muted);
  font-size: var(--text-xs);
  margin-top: 8px;
}

.detail-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 0 12px;
  color: var(--color-muted);
  font-size: var(--text-xs);
}

.detail-divider::before,
.detail-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-rule);
}

.detail-comment-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ===== 评论通用样式 ===== */
.comment-loading {
  font-size: var(--text-xs);
  color: var(--color-muted);
  text-align: center;
  padding: 12px 0;
}

.comfort-item {
  background: var(--color-bg-alt);
  border-radius: var(--radius-md);
  padding: 10px 12px;
}

.comfort-author {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-ink-secondary);
  margin-bottom: 4px;
  display: block;
}

.comfort-text {
  font-size: var(--text-sm);
  color: var(--color-ink);
  line-height: 1.5;
  margin-bottom: 4px;
}

.comfort-time {
  font-size: 0.65rem;
  color: var(--color-muted);
}

.comfort-empty {
  font-size: var(--text-xs);
  color: var(--color-muted);
  text-align: center;
  padding: 8px 0;
}

.detail-input-bar {
  display: flex;
  gap: 8px;
  padding: 12px 20px 20px;
  border-top: 1px solid var(--color-rule);
  flex-shrink: 0;
}

.comfort-input {
  flex: 1;
  border: 1px solid var(--color-rule);
  border-radius: var(--radius-full);
  padding: 8px 14px;
  font-size: var(--text-sm);
  background: var(--color-bg);
  color: var(--color-ink);
  outline: none;
  transition: border-color 0.2s;
}

.comfort-input:focus {
  border-color: var(--color-primary);
}

.comfort-input::placeholder {
  color: var(--color-muted);
}

.comfort-send {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.comfort-send:hover:not(:disabled) {
  background: var(--color-primary-light);
  transform: scale(1.1);
}

.comfort-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ===== 悬浮发帖按钮 ===== */
.fab-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  border: none;
  font-size: 1.4rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(217, 119, 6, 0.4);
  transition: all 0.3s;
  z-index: 50;
}

.fab-btn:hover {
  transform: scale(1.1) rotate(10deg);
  box-shadow: 0 6px 24px rgba(217, 119, 6, 0.5);
}

.fab-btn:active {
  transform: scale(1.05);
}

/* ===== 发帖弹层 ===== */
.post-modal-overlay {
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

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.post-modal-panel {
  background: #fff;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  width: 100%;
  max-width: 480px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  animation: slide-up 0.3s ease;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
}

@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.post-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-rule);
}

.post-modal-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-ink);
}

.post-modal-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: var(--color-muted);
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  transition: color 0.2s;
}

.post-modal-close:hover {
  color: var(--color-ink);
}

.post-modal-body {
  padding: 16px 20px;
  flex: 1;
  overflow-y: auto;
}

.post-emotion-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.post-emotion-tag {
  padding: 6px 14px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-rule);
  background: var(--color-bg);
  color: var(--color-ink-secondary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all 0.2s;
}

.post-emotion-tag:hover {
  border-color: var(--color-primary);
}

.post-emotion-tag.tag-active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.post-textarea {
  width: 100%;
  border: 1px solid var(--color-rule);
  border-radius: var(--radius-lg);
  padding: 14px;
  font-size: var(--text-base);
  resize: none;
  outline: none;
  background: rgba(255, 255, 255, 0.7);
  color: var(--color-ink);
  line-height: 1.6;
  font-family: inherit;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.post-textarea:focus {
  border-color: var(--color-primary);
}

.post-textarea::placeholder {
  color: var(--color-muted);
}

.post-char-count {
  text-align: right;
  font-size: var(--text-xs);
  color: var(--color-muted);
  margin-top: 4px;
}

.post-modal-footer {
  display: flex;
  gap: 12px;
  padding: 12px 20px 20px;
  border-top: 1px solid var(--color-rule);
}

.post-cancel-btn {
  flex: 1;
  padding: 12px;
  border-radius: var(--radius-lg);
  background: var(--color-bg-alt);
  color: var(--color-ink-secondary);
  border: none;
  font-size: var(--text-base);
  cursor: pointer;
  transition: background 0.2s;
}

.post-cancel-btn:hover {
  background: var(--color-rule);
}

.post-submit-btn {
  flex: 2;
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

.post-submit-btn:hover:not(:disabled) {
  background: var(--color-primary-light);
}

.post-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== Toast ===== */
.toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  z-index: 200;
  max-width: 90%;
  text-align: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.toast.info {
  background: var(--color-ink);
  color: #fff;
}

.toast.success {
  background: #16a34a;
  color: #fff;
}

.toast.error {
  background: #dc2626;
  color: #fff;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}
</style>
