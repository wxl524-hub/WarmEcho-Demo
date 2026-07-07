import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useGalleryStore = defineStore('gallery', () => {
  const posts = ref([])
  const commentsMap = ref({}) // { postId: [comments] }
  const loading = ref(false)
  const error = ref(null)

  // 默认演示数据
  const demoPosts = [
    { id: 1, content: '最近工作压力好大，感觉每天都喘不过气。晚上睡不好，早上又起不来。来这里倾诉一下，希望能找到一点平静。', emotion: '焦虑', author: '匿名的小鹿', createdAt: '2026-07-06T10:30:00Z', comfortCount: 12 },
    { id: 2, content: '和最好的朋友吵架了，心里好难受。明明知道应该去道歉，但就是拉不下面子。也许我需要勇气。', emotion: '难过', author: '树洞里的猫', createdAt: '2026-07-05T18:20:00Z', comfortCount: 8 },
    { id: 3, content: '今天终于完成了拖延很久的报告！虽然过程很痛苦，但做完的那一刻真的松了一口气。为自己鼓掌👏', emotion: '开心', author: '努力的小鱼', createdAt: '2026-07-05T09:15:00Z', comfortCount: 15 },
    { id: 4, content: '一个人在外漂泊，中秋没法回家。看着窗外圆圆的月亮，突然特别想妈妈做的菜。', emotion: '孤独', author: '远方的旅人', createdAt: '2026-07-04T20:00:00Z', comfortCount: 20 },
    { id: 5, content: '被领导当众批评了，当时脸上火辣辣的。现在冷静下来想想，确实是自己疏忽了。下次要注意。', emotion: '沮丧', author: '职场新人', createdAt: '2026-07-04T14:10:00Z', comfortCount: 6 },
    { id: 6, content: '已经连续加班三周了，身体开始出现各种小毛病。提醒自己也提醒大家：工作重要，健康更重要。', emotion: '疲惫', author: '打工人', createdAt: '2026-07-03T22:45:00Z', comfortCount: 18 }
  ]

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
      // 演示模式：后端不可用时使用默认数据
      let result = [...demoPosts]
      if (params.emotion) {
        result = result.filter(p => p.emotion === params.emotion)
      }
      if (params.keyword) {
        const kw = params.keyword.toLowerCase()
        result = result.filter(p => p.content.toLowerCase().includes(kw) || p.author.toLowerCase().includes(kw))
      }
      posts.value = result
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
