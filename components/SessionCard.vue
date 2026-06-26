<template>
  <div class="session-card group">
    <NuxtLink :to="`/session/${session.id}`" class="block flex-1 min-w-0">
      <!-- Top row -->
      <div class="flex items-start justify-between gap-3 mb-4">
        <h3 class="font-serif text-xl text-gray-900 dark:text-white leading-tight">{{ session.name }}</h3>
        <span class="text-xs text-gray-400 dark:text-gray-600 shrink-0 mt-1">{{ formatDate(session.createdAt) }}</span>
      </div>

      <!-- Summary tally row -->
      <div class="flex items-center gap-3 mb-4">
        <div class="summary-pill">
          👤 {{ summary.orderCount }} {{ summary.orderCount === 1 ? 'client' : 'clients' }}
        </div>
        <div class="summary-pill summary-pill-accent">
          🌸 {{ summary.totalFlowers }} flowers
        </div>
        <div class="summary-pill">
          🌿 {{ summary.flowerBreakdown.length }} types
        </div>
      </div>

      <!-- Per-flower breakdown chips -->
      <div class="flex flex-wrap gap-1.5 min-h-[26px]">
        <span
          v-for="item in visibleBreakdown"
          :key="item.name"
          class="breakdown-chip"
        >
          {{ getEmoji(item.name) }} {{ item.name }}
          <span class="breakdown-qty">{{ item.total }}</span>
        </span>
        <span v-if="extraCount > 0" class="breakdown-chip breakdown-chip-more">
          +{{ extraCount }} more
        </span>
        <span v-if="summary.flowerBreakdown.length === 0" class="text-xs text-gray-400 dark:text-gray-600 italic">
          No flowers yet
        </span>
      </div>
    </NuxtLink>

    <!-- Hover actions -->
    <div class="flex gap-1 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity">
      <button @click.prevent="$emit('export')" class="action-btn hover:text-bloom-600 hover:bg-bloom-50 dark:hover:bg-bloom-950/30">
        ⬇ Export
      </button>
      <button @click.prevent="$emit('delete')" class="action-btn hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
        🗑 Delete
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Session } from '~/types'

const props = defineProps<{ session: Session }>()
defineEmits<{ delete: []; export: [] }>()

const ordersStore = useOrdersStore()
const flowersStore = useFlowersStore()

const summary = computed(() => ordersStore.sessionSummary(props.session.id))

const PREVIEW_LIMIT = 5
const visibleBreakdown = computed(() => summary.value.flowerBreakdown.slice(0, PREVIEW_LIMIT))
const extraCount = computed(() => Math.max(0, summary.value.flowerBreakdown.length - PREVIEW_LIMIT))

function getEmoji(name: string): string {
  return flowersStore.findByName(name)?.emoji ?? '🌸'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<style scoped>
.session-card {
  @apply flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-bloom-100 dark:border-gray-800
    shadow-sm hover:shadow-petal-lg hover:border-bloom-200 dark:hover:border-bloom-800
    p-6 transition-all duration-200 cursor-pointer;
}
.summary-pill {
  @apply inline-flex items-center gap-1 text-xs font-medium bg-gray-100 dark:bg-gray-800
    text-gray-600 dark:text-gray-400 rounded-full px-2.5 py-1;
}
.summary-pill-accent {
  @apply bg-bloom-50 dark:bg-bloom-950/30 text-bloom-700 dark:text-bloom-400
    border border-bloom-200 dark:border-bloom-800;
}
.breakdown-chip {
  @apply inline-flex items-center gap-1.5 text-xs bg-petal-50 dark:bg-gray-800
    text-petal-700 dark:text-petal-300 border border-petal-100 dark:border-gray-700
    rounded-full px-2.5 py-0.5 font-medium;
}
.breakdown-chip-more {
  @apply bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700;
}
.breakdown-qty {
  @apply inline-flex items-center justify-center min-w-[1.25rem] h-4 px-1
    rounded bg-bloom-600 text-white text-[10px] font-bold;
}
.action-btn {
  @apply flex-1 text-xs py-1.5 rounded-lg text-gray-500 dark:text-gray-400 transition-all text-center;
}
</style>
