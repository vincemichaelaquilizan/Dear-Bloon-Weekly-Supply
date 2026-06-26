<template>
  <div v-if="order" class="animate-fade-in">
    <!-- Back + actions -->
    <div class="flex items-center justify-between mb-6">
      <NuxtLink
        :to="`/session/${order.sessionId}`"
        class="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-bloom-600 dark:hover:text-bloom-400 transition-colors"
      >
        ← {{ sessionName }}
      </NuxtLink>
      <button @click="handleExport" class="btn-ghost text-sm">⬇ Export CSV</button>
    </div>

    <!-- Order header -->
    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-bloom-100 dark:border-gray-800 shadow-petal p-6 mb-6">
      <div class="flex flex-col sm:flex-row sm:items-center gap-4">
        <div class="flex-1">
          <label class="form-label">Client Name</label>
          <input
            v-model="clientNameModel"
            type="text"
            placeholder="Client name…"
            class="input text-xl font-medium w-full sm:max-w-xs"
            @blur="saveClientName"
            @keydown.enter="($event.target as HTMLInputElement).blur()"
          />
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <div class="tally-badge">
            <span class="tally-label">Flower Types</span>
            <span class="tally-value">{{ order.flowerItems.length }}</span>
          </div>
          <div class="tally-badge tally-badge-accent">
            <span class="tally-label">Total Flowers</span>
            <span class="tally-value text-bloom-600 dark:text-bloom-400">{{ totalFlowers }}</span>
          </div>
        </div>
      </div>

      <!-- Order meta fields -->
      <div class="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Has Card -->
        <div>
          <label class="form-label">Has Card?</label>
          <div class="flex gap-2 mt-1">
            <button
              v-for="opt in cardOptions"
              :key="opt.value"
              @click="setHasCard(opt.value)"
              :class="[
                'flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors',
                order.hasCard === opt.value
                  ? 'bg-bloom-500 text-white border-bloom-500'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-bloom-400'
              ]"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- Mode of Payment -->
        <div>
          <label class="form-label">Mode of Payment</label>
          <select
            v-model="paymentModel"
            class="input w-full mt-1"
            @change="savePayment"
          >
            <option value="">— Select —</option>
            <option value="cash">💵 Cash</option>
            <option value="gcash">📱 GCash</option>
            <option value="card">💳 Card</option>
            <option value="bank_transfer">🏦 Bank Transfer</option>
          </select>
        </div>

        <!-- Mode of Delivery -->
        <div>
          <label class="form-label">Mode of Delivery</label>
          <select
            v-model="deliveryModel"
            class="input w-full mt-1"
            @change="saveDelivery"
          >
            <option value="">— Select —</option>
            <option value="pickup">🛍️ Pick-up</option>
            <option value="delivery">🚚 Delivery</option>
            <option value="rush_delivery">⚡ Rush Delivery</option>
          </select>
        </div>

        <!-- Client Platform -->
        <div>
          <label class="form-label">Client Platform</label>
          <select
            v-model="platformModel"
            class="input w-full mt-1"
            @change="savePlatform"
          >
            <option value="">— Select —</option>
            <option value="walk_in">Threads</option>
            <option value="facebook">Facebook Meta</option>
            <option value="facebook">Tiktok</option>
            <option value="instagram">Instagram</option>
          </select>
        </div>
      </div>

      <p class="text-xs text-gray-400 dark:text-gray-600 mt-4">
        Created {{ formatDate(order.createdAt) }} · Last updated {{ formatDate(order.updatedAt) }}
      </p>
    </div>

    <!-- Flower table -->
    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-bloom-100 dark:border-gray-800 shadow-petal overflow-hidden mb-4">
      <div class="grid grid-cols-[1fr_auto] sm:grid-cols-[2fr_1fr_auto] gap-4 px-6 py-3 bg-bloom-50/60 dark:bg-gray-800/60 border-b border-bloom-100 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        <span>Flower</span>
        <span class="hidden sm:block">Quantity</span>
        <span class="sr-only">Actions</span>
      </div>

      <div v-if="order.flowerItems.length === 0" class="px-6 py-10 text-center">
        <div class="text-4xl mb-2">🌱</div>
        <p class="text-gray-400 dark:text-gray-500 text-sm">No flowers yet. Add one below.</p>
      </div>

      <TransitionGroup name="list" tag="div">
        <FlowerRow
          v-for="item in order.flowerItems"
          :key="item.id"
          :item="item"
          @edit="openEditModal(item)"
          @delete="confirmDeleteItem(item.id)"
        />
      </TransitionGroup>
    </div>

    <!-- Add flower input -->
    <FlowerInputRow :order-id="orderId" />
  </div>

  <!-- 404 -->
  <div v-else class="text-center py-20">
    <div class="text-5xl mb-4">🥀</div>
    <h2 class="font-serif text-2xl text-gray-700 dark:text-gray-300 mb-2">Order not found</h2>
    <NuxtLink to="/" class="btn-primary inline-flex mt-4">← Back to Sessions</NuxtLink>
  </div>

  <!-- Edit modal -->
  <FlowerEditModal
    v-if="editingItem"
    :open="showEditModal"
    :item="editingItem"
    :order-id="orderId"
    @close="showEditModal = false"
    @deleted="showEditModal = false"
  />

  <!-- Confirm delete item -->
  <ConfirmDialog
    :open="showDeleteItem"
    title="Remove Flower"
    message="Remove this flower from the order?"
    confirm-label="Remove"
    @confirm="doDeleteItem"
    @cancel="showDeleteItem = false"
  />
</template>

<script setup lang="ts">
import type { FlowerItem } from '~/types'

const route = useRoute()
const orderId = route.params.id as string
const ordersStore = useOrdersStore()
const sessionsStore = useSessionsStore()

// ── Data ──────────────────────────────────────────────────────
const order = computed(() => ordersStore.getOrder(orderId))
const totalFlowers = computed(() => order.value ? ordersStore.totalFlowers(order.value) : 0)
const sessionName = computed(() => {
  if (!order.value) return 'Session'
  return sessionsStore.getSession(order.value.sessionId)?.name ?? 'Session'
})

// ── Client name ───────────────────────────────────────────────
const clientNameModel = ref('')
watch(order, o => { if (o) clientNameModel.value = o.clientName }, { immediate: true })

function saveClientName() {
  ordersStore.updateOrderName(orderId, clientNameModel.value)
}

// ── Has Card ──────────────────────────────────────────────────
const cardOptions = [
  { label: 'Yes', value: true as boolean | null },
  { label: 'No',  value: false as boolean | null },
]

function setHasCard(val: boolean | null) {
  // Toggle off if same value is clicked
  const next = order.value?.hasCard === val ? null : val
  ordersStore.updateOrderMeta(orderId, { hasCard: next })
}

// ── Payment ───────────────────────────────────────────────────
const paymentModel = ref('')
watch(order, o => { if (o) paymentModel.value = o.paymentMode }, { immediate: true })
function savePayment() {
  ordersStore.updateOrderMeta(orderId, { paymentMode: paymentModel.value as any })
}

// ── Delivery ──────────────────────────────────────────────────
const deliveryModel = ref('')
watch(order, o => { if (o) deliveryModel.value = o.deliveryMode }, { immediate: true })
function saveDelivery() {
  ordersStore.updateOrderMeta(orderId, { deliveryMode: deliveryModel.value as any })
}

// ── Platform ──────────────────────────────────────────────────
const platformModel = ref('')
watch(order, o => { if (o) platformModel.value = o.clientPlatform }, { immediate: true })
function savePlatform() {
  ordersStore.updateOrderMeta(orderId, { clientPlatform: platformModel.value as any })
}

// ── Edit modal ────────────────────────────────────────────────
const showEditModal = ref(false)
const editingItem = ref<FlowerItem | null>(null)

function openEditModal(item: FlowerItem) {
  editingItem.value = { ...item }
  showEditModal.value = true
}

// ── Delete item ───────────────────────────────────────────────
const showDeleteItem = ref(false)
const deleteItemId = ref<string | null>(null)

function confirmDeleteItem(id: string) {
  deleteItemId.value = id
  showDeleteItem.value = true
}

function doDeleteItem() {
  if (deleteItemId.value) ordersStore.deleteFlowerItem(orderId, deleteItemId.value)
  showDeleteItem.value = false
  deleteItemId.value = null
}

// ── Export ────────────────────────────────────────────────────
function handleExport() {
  const csv = ordersStore.exportOrderToCSV(orderId)
  ordersStore.downloadCSV(csv, `bloom-order-${order.value?.clientName ?? orderId}.csv`)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

useSeoMeta({ title: computed(() => `${order.value?.clientName ?? 'Order'} — Bloom`) })
</script>

<style scoped>
.tally-badge {
  @apply flex flex-col items-center px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 min-w-[80px];
}
.tally-badge-accent {
  @apply bg-bloom-50 dark:bg-bloom-950/30 border-bloom-200 dark:border-bloom-800;
}
.tally-label {
  @apply text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold;
}
.tally-value {
  @apply text-2xl font-bold text-gray-800 dark:text-white mt-0.5;
}
.list-enter-active, .list-leave-active { transition: all 0.2s ease; }
.list-enter-from { opacity: 0; transform: translateY(-6px); }
.list-leave-to { opacity: 0; transform: translateX(8px); }
</style>
