<template>
  <div class="myecho-page">
    <header class="myecho-header">
      <button class="back-btn" @click="goBack">←</button>
      <h2 class="myecho-title">📝 我的回声</h2>
    </header>

    <div v-if="!authStore.isLoggedIn()" class="guest-block">
      <p class="guest-emoji">🔐</p>
      <p class="guest-title">登录后查看</p>
      <p class="guest-desc">你的帖子和评论需要登录后才能管理。</p>
      <button class="primary-btn" @click="$router.push('/login')">去登录</button>
    </div>

    <div v-else class="myecho-content">
      <!-- Tab 切换 -->
      <div class="tab-bar">
        <button class="tab-btn" :class="{ active: activeTab === 'posts' }" @click="activeTab = 'posts'">
          我的帖子 ({{ myPosts.length }})
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'comments' }" @click="activeTab = 'comments'">
          我的评论 ({{ myComments.length }})
        </button>
      </div>

      <!-- 帖子列表 -->
      <div v-if="activeTab === 'posts'" class="item-list">
        <div v-if="loading" class="loading-state">
          <div class="dot-typing"><span></span><span></span><span></span></div>
          <p>加载中…</p>
        </div>
        <div v-else-if="myPosts.length === 0" class="empty-state">
          <p class="empty-emoji">🍃</p>
          <p class="empty-text">你还没有发过帖子</p>
          <p class="empty-hint">去回声墙分享你的心声吧</p>
        </div>
        <div v-for="post in myPosts" :key="post.id" class="item-card glass">
          <div class="item-header">
            <span class="item-emotion">{{ post.emotion }}</span>
            <span class="item-time">{{ formatTime(post.createdAt) }}</span>
            <span v-if="post.editedAt" class="item-edited">已编辑</span>
          </div>

          <!-- 编辑模式 -->
          <div v-if="editingId === post.id && editingType === 'post'" class="edit-area">
            <textarea v-model="editContent" class="edit-textarea" rows="4" maxlength="500"></textarea>
            <div class="edit-actions">
              <button class="edit-cancel" @click="cancelEdit" :disabled="editLoading">取消</button>
              <button class="edit-save" @click="saveEdit('post', post.id)" :disabled="editLoading">
                {{ editLoading ? '保存中…' : '保存' }}
              </button>
            </div>
          </div>
          <p v-else class="item-content">{{ post.content }}</p>

          <div class="item-footer">
            <span class="item-stat">💬 {{ post.comfortCount }} 人想说</span>
            <div class="item-actions">
              <button class="action-btn edit-btn" @click="startEdit('post', post.id, post.content)">编辑</button>
              <button class="action-btn delete-btn" @click="confirmDelete('post', post.id)">删除</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 评论列表 -->
      <div v-if="activeTab === 'comments'" class="item-list">
        <div v-if="loading" class="loading-state">
          <div class="dot-typing"><span></span><span></span><span></span></div>
          <p>加载中…</p>
        </div>
        <div v-else-if="myComments.length === 0" class="empty-state">
          <p class="empty-emoji">🍃</p>
          <p class="empty-text">你还没有发过评论</p>
          <p class="empty-hint">去回声墙给别人一些温暖的回应吧</p>
        </div>
        <div v-for="comment in myComments" :key="comment.id" class="item-card glass">
          <div class="item-header">
            <span class="item-ref">回复：{{ comment.postPreview }}</span>
            <span class="item-time">{{ formatTime(comment.createdAt) }}</span>
            <span v-if="comment.editedAt" class="item-edited">已编辑</span>
          </div>

          <div v-if="editingId === comment.id && editingType === 'comment'" class="edit-area">
            <textarea v-model="editContent" class="edit-textarea" rows="2" maxlength="200"></textarea>
            <div class="edit-actions">
              <button class="edit-cancel" @click="cancelEdit" :disabled="editLoading">取消</button>
              <button class="edit-save" @click="saveEdit('comment', comment.id)" :disabled="editLoading">
                {{ editLoading ? '保存中…' : '保存' }}
              </button>
            </div>
          </div>
          <p v-else class="item-content">{{ comment.content }}</p>

          <div class="item-footer">
            <div class="item-actions">
              <button class="action-btn edit-btn" @click="startEdit('comment', comment.id, comment.content)">编辑</button>
              <button class="action-btn delete-btn" @click="confirmDelete('comment', comment.id)">删除</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 删除确认 -->
    <Transition name="fade">
      <div v-if="showDeleteConfirm" class="confirm-mask" @click.self="showDeleteConfirm = false">
        <div class="confirm-dialog glass">
          <p class="confirm-title">确认删除？</p>
          <p class="confirm-desc">删除后无法恢复{{ deleteType === 'post' ? '，帖子下的评论也会一并删除' : '' }}。</p>
          <div class="confirm-actions">
              <button class="confirm-cancel" @click="showDeleteConfirm = false" :disabled="deleteLoading">取消</button>
              <button class="confirm-ok" @click="executeDelete" :disabled="deleteLoading">
                {{ deleteLoading ? '删除中…' : '删除' }}
              </button>
            </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const router = useRouter()
const authStore = useAuthStore()

const activeTab = ref('posts')
const myPosts = ref([])
const myComments = ref([])
const editingId = ref(null)
const editingType = ref('')
const editContent = ref('')
const editLoading = ref(false)
const deleteLoading = ref(false)
const loading = ref(false)
const showDeleteConfirm = ref(false)
const deleteType = ref('')
const deleteId = ref('')

async function loadMyData() {
  if (!authStore.isLoggedIn()) return
  loading.value = true
  try {
    const res = await fetch('/api/gallery/my-posts', {
      headers: authStore.getAuthHeader()
    })
    if (res.ok) {
      const data = await res.json()
      myPosts.value = data.posts
      myComments.value = data.comments
    }
  } catch { /* ignore */ }
  finally {
    loading.value = false
  }
}

onMounted(loadMyData)

function formatTime(isoStr) {
  const d = new Date(isoStr)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前'
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

function startEdit(type, id, content) {
  editingType.value = type
  editingId.value = id
  editContent.value = content
}

function cancelEdit() {
  editingId.value = null
  editingType.value = ''
  editContent.value = ''
}

async function saveEdit(type, id) {
  if (!editContent.value.trim() || editLoading.value) return
  editLoading.value = true
  try {
    const endpoint = type === 'post'
      ? `/api/gallery/posts/${id}`
      : `/api/gallery/comments/${id}`

    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authStore.getAuthHeader() },
      body: JSON.stringify({ content: editContent.value })
    })
    const data = await res.json()
    if (res.ok) {
      cancelEdit()
      await loadMyData()
    } else {
      alert(data.message || '编辑失败')
    }
  } catch {
    alert('网络错误')
  } finally {
    editLoading.value = false
  }
}

function confirmDelete(type, id) {
  deleteType.value = type
  deleteId.value = id
  showDeleteConfirm.value = true
}

async function executeDelete() {
  if (deleteLoading.value) return
  deleteLoading.value = true
  const endpoint = deleteType.value === 'post'
    ? `/api/gallery/posts/${deleteId.value}`
    : `/api/gallery/comments/${deleteId.value}`

  try {
    const res = await fetch(endpoint, {
      method: 'DELETE',
      headers: authStore.getAuthHeader()
    })
    if (res.ok) {
      showDeleteConfirm.value = false
      await loadMyData()
    }
  } catch { /* ignore */ }
  finally {
    deleteLoading.value = false
  }
}

function goBack() {
  router.push('/gallery')
}
</script>

<style scoped>
.myecho-page {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  background-color: var(--color-bg);
  padding: 16px 16px 40px;
}

.myecho-header {
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

.myecho-title {
  font-family: var(--font-heading);
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--color-ink);
}

.guest-block {
  text-align: center;
  padding: 60px 24px;
}

.guest-emoji {
  font-size: 3rem;
  margin-bottom: 12px;
}

.guest-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-ink);
  margin-bottom: 8px;
}

.guest-desc {
  font-size: var(--text-sm);
  color: var(--color-ink-secondary);
  margin-bottom: 24px;
}

.primary-btn {
  padding: 10px 32px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: #fff;
  border: none;
  font-size: var(--text-base);
  cursor: pointer;
  transition: all 0.2s;
}

.primary-btn:hover {
  opacity: 0.9;
}

/* Tab 栏 */
.tab-bar {
  display: flex;
  gap: 0;
  background: var(--color-bg-alt);
  border-radius: var(--radius-full);
  padding: 3px;
  margin-bottom: 16px;
}

.tab-btn {
  flex: 1;
  padding: 8px 12px;
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  background: transparent;
  color: var(--color-muted);
}

.tab-btn.active {
  background: var(--color-primary);
  color: #fff;
}

/* 项目列表 */
.item-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 0;
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
  padding: 40px 0;
  color: var(--color-muted);
  font-size: var(--text-sm);
}

.empty-emoji {
  font-size: 2.5rem;
  margin-bottom: 8px;
}

.empty-text {
  font-size: var(--text-base);
  color: var(--color-ink);
  font-weight: 500;
  margin-bottom: 4px;
}

.empty-hint {
  font-size: var(--text-xs);
  color: var(--color-muted);
}

.item-card {
  border-radius: var(--radius-xl);
  padding: 16px;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.item-emotion {
  font-size: var(--text-xs);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: var(--color-primary-pale);
  color: var(--color-primary);
}

.item-ref {
  font-size: var(--text-xs);
  color: var(--color-muted);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-time {
  font-size: var(--text-xs);
  color: var(--color-muted);
}

.item-edited {
  font-size: var(--text-xs);
  color: var(--color-primary);
  opacity: 0.7;
}

.item-content {
  font-size: var(--text-sm);
  color: var(--color-ink);
  line-height: 1.7;
  margin-bottom: 10px;
  white-space: pre-wrap;
}

/* 编辑区域 */
.edit-area {
  margin-bottom: 10px;
}

.edit-textarea {
  width: 100%;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  padding: 10px;
  font-size: var(--text-sm);
  line-height: 1.6;
  background: var(--color-bg);
  color: var(--color-ink);
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;
}

.edit-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-pale);
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.edit-cancel, .edit-save {
  padding: 6px 16px;
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-cancel {
  background: var(--color-bg-alt);
  color: var(--color-ink-secondary);
}

.edit-save {
  background: var(--color-primary);
  color: #fff;
}

/* 底部操作 */
.item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.item-stat {
  font-size: var(--text-xs);
  color: var(--color-muted);
}

.item-actions {
  display: flex;
  gap: 6px;
}

.action-btn {
  font-size: var(--text-xs);
  padding: 4px 10px;
  border-radius: var(--radius-full);
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-btn {
  background: var(--color-primary-pale);
  color: var(--color-primary);
}

.edit-btn:hover {
  background: var(--color-primary);
  color: #fff;
}

.delete-btn {
  background: transparent;
  color: var(--color-accent);
  border: 1px solid var(--color-accent);
  opacity: 0.7;
}

.delete-btn:hover {
  background: var(--color-accent);
  color: #fff;
  opacity: 1;
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

.confirm-cancel, .confirm-ok {
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
