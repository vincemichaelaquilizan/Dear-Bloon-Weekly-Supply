<template>
  <div class="client-row group">
    <NuxtLink :to="`/order/${order.id}`" class="flex items-center gap-4 flex-1 min-w-0">
      <!-- Avatar initial -->
      <div class="avatar shrink-0">{{ initial }}</div>

      <!-- Name + flower chips -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1.5">
          <span class="font-semibold text-gray-900 dark:text-white truncate">{{ order.clientName }}</span>
          <span class="tally-pill shrink-0">🌸 {{ totalFlowers }}</span>
        </div>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="item in previewItems"
            :key="item.id"
            class="flower-chip"
          >
            {{ item.quantity }}× {{ item.name }}
          </span>
          <span v-if="extraCount > 0" class="flower-chip flower-chip-more">+{{ extraCount }}</span>
          <span v-if="order.flowerItems.length === 0" class="text-xs text-gray-400 dark:text-gray-600 italic">No flowers yet</span>
        </div>
      </div>
    </NuxtLink>

    <!-- Delete -->
    <button
      @click="$emit('delete')"
      class="shrink-0 p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all"
      aria-label="Remove client"
    >
      🗑️
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Order } from '~/types'

const props = defineProps<{ order: Order }>()
defineEmits<{ delete: [] }>()

const ordersStore = useOrdersStore()

const totalFlowers = computed(() => ordersStore.totalFlowers(props.order))
const initial = computed(() => props.order.clientName.trim()[0]?.toUpperCase() ?? '?')

const PREVIEW = 3
const previewItems = computed(() => props.order.flowerItems.slice(0, PREVIEW))
const extraCount = computed(() => Math.max(0, props.order.flowerItems.length - PREVIEW))
</script>

<style scoped>
.client-row {
  @apply flex items-center gap-3 bg-white dark:bg-gray-900 rounded-2xl
    border border-bloom-100 dark:border-gray-800 shadow-sm
    hover:shadow-petal hover:border-bloom-200 dark:hover:border-bloom-700
    px-5 py-4 transition-all duration-150 cursor-pointer;
}
.avatar {
  @apply w-10 h-10 rounded-full bg-bloom-100 dark:bg-bloom-950/40
    text-bloom-700 dark:text-bloom-300 font-bold text-sm
    flex items-center justify-center shrink-0;
}
.tally-pill {
  @apply inline-flex items-center text-xs font-semibold
    bg-bloom-50 dark:bg-bloom-950/30 text-bloom-700 dark:text-bloom-400
    border border-bloom-200 dark:border-bloom-800 rounded-full px-2 py-0.5;
}
.flower-chip {
  @apply inline-flex items-center text-xs bg-petal-50 dark:bg-gray-800
    text-petal-700 dark:text-petal-300 border border-petal-100 dark:border-gray-700
    rounded-full px-2 py-0.5 font-medium;
}
.flower-chip-more {
  @apply bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700;
}
</style>
