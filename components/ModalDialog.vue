<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal-backdrop" @click.self="$emit('close')">
        <div class="modal-panel animate-slide-up" role="dialog" :aria-label="title">
          <!-- Header -->
          <div class="flex items-center justify-between mb-5">
            <h2 class="font-serif text-xl text-gray-900 dark:text-white">{{ title }}</h2>
            <button
              @click="$emit('close')"
              class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <!-- Content -->
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{ open: boolean; title: string }>()
defineEmits<{ close: [] }>()

// Trap body scroll when open
watch(() => useAttrs().open, (val) => {
  if (import.meta.client) document.body.style.overflow = val ? 'hidden' : ''
}, { immediate: true })

onUnmounted(() => {
  if (import.meta.client) document.body.style.overflow = ''
})
</script>

<style scoped>
.modal-backdrop {
  @apply fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4;
}
.modal-panel {
  @apply w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-petal-lg
    border border-bloom-100 dark:border-gray-800 p-6;
}
.modal-enter-active,
.modal-leave-active { transition: all 0.2s ease; }
.modal-enter-from,
.modal-leave-to { opacity: 0; }
</style>
