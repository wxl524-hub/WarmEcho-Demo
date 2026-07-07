<template>
  <div class="app-global">
    <router-view v-slot="{ Component }">
      <Transition name="fade" mode="out-in">
        <component :is="Component" />
      </Transition>
    </router-view>
  </div>
</template>

<script setup>
import { useTheme } from './composables/useTheme.js'

// 应用启动即应用主题（深夜模式自动切换）
useTheme()
</script>

<style scoped>
.app-global {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  background-color: var(--color-bg);
  position: relative;
  overflow: hidden;
}
</style>