import { createRouter, createWebHistory } from 'vue-router'
import WelcomePage from '../views/WelcomePage.vue'
import ChatPage from '../views/ChatPage.vue'
import CalmPage from '../views/CalmPage.vue'
import GalleryPage from '../views/GalleryPage.vue'
import GrowthPage from '../views/GrowthPage.vue'
import PrivacyPage from '../views/PrivacyPage.vue'
import ResourcesPage from '../views/ResourcesPage.vue'
import LoginPage from '../views/LoginPage.vue'
import MyEchoPage from '../views/MyEchoPage.vue'
import OnboardingPage from '../views/OnboardingPage.vue'

const routes = [
  { path: '/', component: WelcomePage },
  { path: '/onboarding', component: OnboardingPage },
  { path: '/login', component: LoginPage },
  { path: '/chat', component: ChatPage },
  { path: '/calm', component: CalmPage },
  { path: '/gallery', component: GalleryPage },
  { path: '/my-echo', component: MyEchoPage },
  { path: '/growth', component: GrowthPage },
  { path: '/privacy', component: PrivacyPage },
  { path: '/resources', component: ResourcesPage }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router