<template>
  <div
    class="grid grid-cols-[1fr_auto] sm:grid-cols-[2fr_1fr_auto] gap-4 items-center px-6 py-3.5 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-bloom-50/40 dark:hover:bg-gray-800/40 transition-colors group"
  >
    <!-- Flower name chip -->
    <button
      @click="$emit('edit')"
      class="flower-name-chip"
      :title="`Edit ${item.name}`"
    >
      <span class="text-lg">{{ emoji }}</span>
      <span class="font-medium text-gray-800 dark:text-gray-200">{{ item.name }}</span>
    </button>

    <!-- Quantity badge -->
    <div class="hidden sm:flex items-center gap-2">
      <span class="qty-badge">{{ item.quantity }}</span>
      <span class="text-xs text-gray-400 dark:text-gray-500">stem{{ item.quantity !== 1 ? 's' : '' }}</span>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        @click="$emit('edit')"
        class="action-btn hover:text-bloom-600 hover:bg-bloom-50 dark:hover:bg-bloom-950/30"
        aria-label="Edit"
      >
        ✏️
      </button>
      <button
        @click="$emit('delete')"
        class="action-btn hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
        aria-label="Delete"
      >
        🗑️
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FlowerItem } from '~/types'

const props = defineProps<{ item: FlowerItem }>()
defineEmits<{ edit: []; delete: [] }>()

const flowersStore = useFlowersStore()
const emoji = computed(() => flowersStore.findByName(props.item.name)?.emoji ?? '🌸')
</script>

<style scoped>
.flower-name-chip {
  @apply flex items-center gap-2.5 text-left rounded-xl px-3 py-1.5
    border border-transparent hover:border-bloom-200 dark:hover:border-bloom-700
    hover:bg-white dark:hover:bg-gray-900
    transition-all duration-150 w-fit max-w-full;
}
.qty-badge {
  @apply inline-flex items-center justify-center min-w-[2rem] h-7 px-2
    rounded-lg bg-bloom-100 dark:bg-bloom-950/30 text-bloom-700 dark:text-bloom-400
    text-sm font-bold;
}
.action-btn {
  @apply p-1.5 rounded-lg text-sm transition-all duration-150;
}
</style>
