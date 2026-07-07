import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useGalleryStore = defineStore('gallery', () => {
  const posts = ref([])
  const commentsMap = ref({}) // { postId: [comments] }
  const loading = ref(false)
  const error = ref(null)

  // 拉取帖子列表
  async function fetchPosts(params = {}) {
    loading.value = true
    error.value = null
    try {
      const query = new URLSearchParams()
      if (params.emotion) query.set('emotion', params.emotion)
      if (params.keyword) query.set('keyword', params.keyword)
      const url = `/api/gallery/posts${query.toString() ? '?' + query.toString() : ''}`
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok) {
        posts.value = data.posts
      } else {
        error.value = data.message || '加载失败'
      }
    } catch {
      error.value = '网络错误'
    } finally {
      loading.value = false
    }
  }

  // 拉取某帖子的评论
  async function fetchComments(postId) {
    try {
      const res = await fetch(`/api/gallery/posts/${postId}/comments`)
      const data = await res.json()
      if (res.ok) {
        commentsMap.value[postId] = data.comments
      }
    } catch {
      // 静默失败
    }
  }

  // 发帖
  async function createPost(content, emotion, authHeader) {
    const res = await fetch('/api/gallery/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ content, emotion })
    })
    const data = await res.json()
    if (res.ok) {
      posts.value.unshift(data.post)
      return { success: true }
    }
    return { success: false, message: data.message, status: res.status, data }
  }

  // 评论
  async function addComment(postId, content, authHeader) {
    const res = await fetch(`/api/gallery/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ content })
    })
    const data = await res.json()
    if (res.ok) {
      if (!commentsMap.value[postId]) {
        commentsMap.value[postId] = []
      }
      commentsMap.value[postId].push(data.comment)
      // 更新帖子评论数
      const post = posts.value.find(p => p.id === postId)
      if (post) {
        post.comfortCount = (post.comfortCount || 0) + 1
      }
      return { success: true }
    }
    return { success: false, message: data.message, status: res.status, data }
  }

  function getCommentsForPost(postId) {
    return commentsMap.value[postId] || []
  }

  return {
    posts,
    commentsMap,
    loading,
    error,
    fetchPosts,
    fetchComments,
    createPost,
    addComment,
    getCommentsForPost
  }
})
