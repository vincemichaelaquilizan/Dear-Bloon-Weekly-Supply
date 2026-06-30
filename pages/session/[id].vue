<template>
  <div v-if="session" class="animate-fade-in">
    <!-- Back + actions -->
    <div class="flex items-center justify-between mb-6">
      <NuxtLink to="/" class="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-bloom-600 dark:hover:text-bloom-400 transition-colors">
        ← All Sessions
      </NuxtLink>
      <button @click="handleExport" class="btn-ghost text-sm">⬇ Export Excel</button>
    </div>

    <!-- Session name header -->
    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-bloom-100 dark:border-gray-800 shadow-petal p-6 mb-6">
      <div class="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
        <div class="flex-1">
          <label class="form-label">Session Name</label>
          <input
            v-model="sessionNameModel"
            type="text"
            class="input text-xl font-medium w-full sm:max-w-sm"
            @blur="saveSessionName"
            @keydown.enter="($event.target as HTMLInputElement).blur()"
          />
        </div>
        <p class="text-xs text-gray-400 dark:text-gray-600 sm:text-right">
          Created {{ formatDate(session.createdAt) }}
        </p>
      </div>

      <!-- Session-level tally strip -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div class="tally-card">
          <span class="tally-label">Clients</span>
          <span class="tally-value">{{ summary.orderCount }}</span>
        </div>
        <div class="tally-card tally-card-accent">
          <span class="tally-label">Total Flowers</span>
          <span class="tally-value text-bloom-600 dark:text-bloom-400">{{ summary.totalFlowers }}</span>
        </div>
        <div class="tally-card col-span-2 sm:col-span-1">
          <span class="tally-label">Flower Types</span>
          <span class="tally-value">{{ summary.flowerBreakdown.length }}</span>
        </div>
      </div>
    </div>

    <!-- Per-flower breakdown panel -->
    <div v-if="summary.flowerBreakdown.length > 0" class="bg-white dark:bg-gray-900 rounded-2xl border border-bloom-100 dark:border-gray-800 shadow-petal p-5 mb-6">
      <h2 class="font-serif text-lg text-gray-800 dark:text-white mb-4">Flower Breakdown</h2>
      <div class="flex flex-wrap gap-2">
        <div
          v-for="item in summary.flowerBreakdown"
          :key="item.name"
          class="breakdown-chip"
        >
          <span class="text-base">{{ getEmoji(item.name) }}</span>
          <span class="font-semibold text-gray-800 dark:text-gray-200">{{ item.name }}</span>
          <span class="breakdown-qty">{{ item.total }}</span>
        </div>
      </div>
    </div>

    <!-- Clients / Orders section -->
    <div class="flex items-center justify-between mb-4">
      <h2 class="font-serif text-xl text-gray-800 dark:text-white">Clients</h2>
      <div class="flex items-center gap-3">
        <select v-model="filterStatus" class="input text-sm">
          <option value="all">All</option>
          <option value="requested">Requested</option>
          <option value="delivered">Delivered</option>
          <option value="received">Received</option>
        </select>
        <button @click="showNewOrderModal = true" class="btn-primary text-sm">+ Add Client</button>
      </div>
    </div>

    <div v-if="sessionOrders.length === 0" class="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-bloom-200 dark:border-bloom-900">
      <div class="text-4xl mb-2">🌱</div>
      <p class="text-gray-400 dark:text-gray-500">No clients yet. Add one to get started.</p>
    </div>

    <div v-else class="space-y-3">
      <ClientOrderRow
        v-for="order in sessionOrders"
        :key="order.id"
        :order="order"
        @delete="confirmDeleteOrder(order.id)"
      />
    </div>
  </div>

  <!-- 404 -->
  <div v-else class="text-center py-20">
    <div class="text-5xl mb-4">🥀</div>
    <h2 class="font-serif text-2xl text-gray-700 dark:text-gray-300 mb-2">Session not found</h2>
    <NuxtLink to="/" class="btn-primary inline-flex mt-4">← Back to Sessions</NuxtLink>
  </div>

  <!-- New Client Modal -->
  <ModalDialog :open="showNewOrderModal" @close="showNewOrderModal = false" title="Add Client">
    <div class="space-y-4">
      <div>
        <label class="form-label">Client Name</label>
        <input
          v-model="newClientName"
          type="text"
          placeholder="e.g. Sarah Johnson"
          class="input w-full"
          @keydown.enter="createOrder"
          ref="newOrderInput"
        />
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button @click="showNewOrderModal = false" class="btn-ghost">Cancel</button>
        <button @click="createOrder" class="btn-primary">Add Client</button>
      </div>
    </div>
  </ModalDialog>

  <!-- Confirm delete order -->
  <ConfirmDialog
    :open="showDeleteOrderConfirm"
    title="Remove Client"
    message="Remove this client and all their flower requests from the session?"
    confirm-label="Remove"
    @confirm="doDeleteOrder"
    @cancel="showDeleteOrderConfirm = false"
  />
</template>

<script setup lang="ts">
const route = useRoute()
const sessionId = route.params.id as string
const sessionsStore = useSessionsStore()
const ordersStore = useOrdersStore()
const flowersStore = useFlowersStore()
const router = useRouter()

onMounted(async () => {
  await sessionsStore.load()
  await ordersStore.loadBySession(sessionId)
  await flowersStore.load()
})

const session = computed(() => sessionsStore.getSession(sessionId))
const filterStatus = ref('all')
const sessionOrders = computed(() => {
  const all = ordersStore.getOrdersBySession(sessionId)
  // sort: requested (top), received (middle), delivered (last)
  const sorted = all.slice().sort((a, b) => {
    const orderRank = (s: string) => s === 'requested' ? 0 : s === 'received' ? 1 : 2
    return orderRank((a as any).status ?? 'requested') - orderRank((b as any).status ?? 'requested')
  })
  if (!filterStatus.value || filterStatus.value === 'all') return sorted
  return sorted.filter(o => ((o as any).status ?? 'requested') === filterStatus.value)
})
const summary = computed(() => ordersStore.sessionSummary(sessionId))

const sessionNameModel = ref('')
watch(session, s => { if (s) sessionNameModel.value = s.name }, { immediate: true })

async function saveSessionName() {
  await sessionsStore.updateSession(sessionId, sessionNameModel.value)
}

function getEmoji(name: string): string {
  return flowersStore.findByName(name)?.emoji ?? '🌸'
}

// New order
const showNewOrderModal = ref(false)
const newClientName = ref('')
const newOrderInput = ref<HTMLInputElement | null>(null)

watch(showNewOrderModal, val => {
  if (val) { newClientName.value = ''; nextTick(() => newOrderInput.value?.focus()) }
})

async function createOrder() {
  const order = await ordersStore.createOrder(sessionId, newClientName.value)
  if (!order) return
  await sessionsStore.touchSession(sessionId)
  showNewOrderModal.value = false
  router.push(`/order/${order.id}`)
}

// Delete order
const showDeleteOrderConfirm = ref(false)
const deleteOrderId = ref<string | null>(null)

function confirmDeleteOrder(id: string) {
  deleteOrderId.value = id
  showDeleteOrderConfirm.value = true
}

async function doDeleteOrder() {
  if (deleteOrderId.value) await ordersStore.deleteOrder(deleteOrderId.value)
  showDeleteOrderConfirm.value = false
  deleteOrderId.value = null
}

function handleExport() {
  if (!session.value) return
  ordersStore.exportSessionToExcel(sessionId, session.value.name)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

useSeoMeta({ title: computed(() => `${session.value?.name ?? 'Session'} — Bloom`) })
</script>

<style scoped>
.tally-card {
  @apply flex flex-col items-center justify-center px-4 py-3 rounded-xl
    bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700;
}
.tally-card-accent {
  @apply bg-bloom-50 dark:bg-bloom-950/30 border-bloom-200 dark:border-bloom-800;
}
.tally-label {
  @apply text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold;
}
.tally-value {
  @apply text-3xl font-bold text-gray-800 dark:text-white mt-0.5;
}
.breakdown-chip {
  @apply inline-flex items-center gap-2 px-3 py-2 rounded-xl
    bg-bloom-50 dark:bg-bloom-950/30 border border-bloom-100 dark:border-bloom-900
    text-sm transition-all hover:shadow-petal hover:border-bloom-300;
}
.breakdown-qty {
  @apply inline-flex items-center justify-center min-w-[1.75rem] h-6 px-1.5
    rounded-lg bg-bloom-600 text-white text-xs font-bold ml-1;
}
</style>
