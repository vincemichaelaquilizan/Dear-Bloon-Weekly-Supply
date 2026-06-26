<template>
  <div class="order-card group animate-pop">
    <NuxtLink :to="`/order/${order.id}`" class="block flex-1 min-w-0">
      <!-- Card Header -->
      <div class="flex items-start justify-between mb-3">
        <h3 class="font-semibold text-gray-900 dark:text-white truncate pr-2 text-base">
          {{ order.clientName }}
        </h3>
        <!-- Tally Pill -->
        <span class="tally-pill shrink-0">
          🌸 {{ totalFlowers }}
        </span>
      </div>

      <!-- Flower Preview Chips -->
      <div class="flex flex-wrap gap-1.5 mb-3 min-h-[28px]">
        <span
          v-for="item in previewItems"
          :key="item.id"
          class="flower-chip"
        >
          {{ item.quantity }}× {{ item.name }}
        </span>
        <span v-if="extraCount > 0" class="flower-chip flower-chip-more">
          +{{ extraCount }} more
        </span>
        <span v-if="order.flowerItems.length === 0" class="text-xs text-gray-400 dark:text-gray-600 italic">
          No flowers yet
        </span>
      </div>

      <!-- Meta -->
      <p class="text-xs text-gray-400 dark:text-gray-600">
        {{ formatDate(order.createdAt) }}
      </p>
    </NuxtLink>

    <!-- Action buttons — show on hover -->
    <div class="flex gap-1 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        @click.prevent="$emit('export')"
        class="flex-1 text-xs py-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-bloom-50 dark:hover:bg-gray-800 hover:text-bloom-600 transition-all"
      >
        ⬇ Export
      </button>
      <button
        @click.prevent="$emit('delete')"
        class="flex-1 text-xs py-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-all"
      >
        🗑 Delete
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Order } from '~/types'

const props = defineProps<{ order: Order }>()
defineEmits<{ delete: []; export: [] }>()

const ordersStore = useOrdersStore()
const totalFlowers = computed(() => ordersStore.totalFlowers(props.order))

const PREVIEW_LIMIT = 4
const previewItems = computed(() => props.order.flowerItems.slice(0, PREVIEW_LIMIT))
const extraCount = computed(() => Math.max(0, props.order.flowerItems.length - PREVIEW_LIMIT))

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<style scoped>
.order-card {
  @apply flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-bloom-100 dark:border-gray-800
    shadow-sm hover:shadow-petal-lg hover:border-bloom-200 dark:hover:border-bloom-800
    p-5 transition-all duration-200 cursor-pointer;
}
.tally-pill {
  @apply inline-flex items-center gap-1 text-xs font-semibold bg-bloom-50 dark:bg-bloom-950/30
    text-bloom-700 dark:text-bloom-400 border border-bloom-200 dark:border-bloom-800
    rounded-full px-2.5 py-0.5;
}
.flower-chip {
  @apply inline-flex items-center text-xs bg-petal-50 dark:bg-gray-800 text-petal-700 dark:text-petal-300
    border border-petal-200 dark:border-gray-700 rounded-full px-2.5 py-0.5 font-medium;
}
.flower-chip-more {
  @apply bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700;
}
</style>
