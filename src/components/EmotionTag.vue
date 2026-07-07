<template>
  <button
    class="emotion-tag"
    :class="{ 'emotion-selected': selected }"
    @click="$emit('select')"
  >
    {{ emotion.emoji }} {{ emotion.label }}
  </button>
</template>

<script setup>
defineProps({
  emotion: {
    type: Object,
    required: true,
    default: () => ({ id: '', label: '', emoji: '' })
  },
  selected: {
    type: Boolean,
    default: false
  }
})

defineEmits(['select'])
</script>

<style scoped>
.emotion-tag {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--color-bg-alt);
  color: var(--color-ink-secondary);
  border: none;
  white-space: nowrap;
  flex-shrink: 0;
}

.emotion-tag:hover {
  background: var(--color-primary-pale);
  color: var(--color-primary);
}

.emotion-selected {
  background: var(--color-primary);
  color: #fff;
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(217, 119, 6, 0.35);
}

.emotion-selected:hover {
  background: var(--color-primary);
  color: #fff;
}
</style>