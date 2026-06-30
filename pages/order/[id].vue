<!--pages/order/[id].vue-->
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
      <button @click="handleExport" class="btn-ghost text-sm">⬇ Export Excel</button>
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
              :key="String(opt.value)"
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
            <option value="maya">📱 Maya</option>
            <option value="bank_transfer">🏦 Bank Transfer</option>
            <option value="credit_card">💳 Credit Card</option>
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
            <option value="delivery">🚚 Delivery (Lalamove)</option>
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
            <option value="threads">Threads</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="viber">Viber</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="walk_in">Walk-in</option>
            <option value="other">Other</option>
          </select>
        </div>
        
          <!-- Status -->
          <div>
            <label class="form-label">Status</label>
            <select
              v-model="statusModel"
              class="input w-full mt-1"
              @change="saveStatus"
            >
              <option value="requested">Requested</option>
              <option value="delivered">Delivered</option>
              <option value="received">Received</option>
            </select>
          </div>
      </div>

      <p class="text-xs text-gray-400 dark:text-gray-600 mt-4">
        Created {{ formatDate(order.createdAt) }} · Last updated {{ formatDate(order.updatedAt) }}
      </p>

      <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="text-xs text-gray-500">Subtotal</div>
          <div class="font-semibold text-lg">{{ formatCurrency(subtotal) }}</div>
        </div>
        <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg" v-if="deliveryModel === 'delivery'">
          <div class="text-xs text-gray-500">Delivery Fee (Lalamove)</div>
          <div class="flex gap-2 mt-1">
            <input v-model.number="deliveryFeeModel" @blur="saveDeliveryFee" type="number" min="0" step="0.25" class="input" />
            <button @click="saveDeliveryFee" class="btn-ghost">Save</button>
          </div>
        </div>
        <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="text-xs text-gray-500">Total</div>
          <div class="font-semibold text-lg">{{ formatCurrency(total) }}</div>
        </div>
      </div>
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

    <!-- Add-ons -->
    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-bloom-100 dark:border-gray-800 shadow-petal overflow-hidden mb-4">
      <div class="grid grid-cols-[1fr_auto] gap-4 px-6 py-3 bg-bloom-50/60 dark:bg-gray-800/60 border-b border-bloom-100 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        <span>Add-ons</span>
        <span class="text-right">Price / Qty</span>
      </div>
      <div class="p-6 space-y-4">
        <div class="grid gap-3 sm:grid-cols-[1.75fr_auto_80px]">
          <select v-model="selectedAddOnId" class="input w-full">
            <option value="">— Select add-on —</option>
            <option v-for="addon in addons" :key="addon.id" :value="addon.id">
              {{ addon.label }} — {{ formatCurrency(addon.price || 0) }}
            </option>
          </select>
          <input v-model.number="addOnQuantity" type="number" min="1" class="input" />
          <button @click="addSelectedAddOn" :disabled="!selectedAddOnId" class="btn-primary">Add</button>
        </div>

        <div v-if="order.selectedAddOns.length === 0" class="text-sm text-gray-500">No add-ons selected.</div>

        <div v-else class="space-y-3">
          <div
            v-for="item in order.selectedAddOns"
            :key="item.id"
            class="grid grid-cols-[1fr_auto_auto] gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
          >
            <div>
              <div class="font-medium text-gray-800 dark:text-gray-100">{{ item.label }}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">{{ item.description || 'No description' }}</div>
              <div class="text-sm text-gray-600 dark:text-gray-400">{{ formatCurrency(item.price) }} each</div>
            </div>
            <div class="flex items-center gap-2">
              <label class="sr-only">Quantity</label>
              <input
                v-model.number="item.quantity"
                @change="saveAddOnQuantity(item)"
                type="number"
                min="1"
                class="input w-20"
              />
            </div>
            <div class="flex items-center justify-end gap-2">
              <button @click="removeAddOn(item.id)" class="btn-ghost text-sm">Remove</button>
            </div>
          </div>
        </div>
      </div>
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
import type { FlowerItem, AddOnItem } from '~/types'

const route = useRoute()
const orderId = route.params.id as string
const ordersStore = useOrdersStore()
const sessionsStore = useSessionsStore()
const addonsStore = useAddonsStore()

onMounted(async () => {
  await sessionsStore.load()
  await ordersStore.loadBySession(route.params.id as string)
  await addonsStore.load()
})

// ── Data ──────────────────────────────────────────────────────
const flowersStore = useFlowersStore()
const order = computed(() => ordersStore.getOrder(orderId))
const totalFlowers = computed(() => order.value ? ordersStore.totalFlowers(order.value) : 0)
const addons = computed(() => addonsStore.addons)
const selectedAddOnId = ref('')
const addOnQuantity = ref(1)
const sessionName = computed(() => {
  if (!order.value) return 'Session'
  return sessionsStore.getSession(order.value.sessionId)?.name ?? 'Session'
})

const subtotal = computed(() => {
  if (!order.value) return 0
  const flowerTotal = order.value.flowerItems.reduce((s, f) => {
    const p = flowersStore.findByName(f.name)?.price ?? 0
    return s + (p * (f.quantity || 0))
  }, 0)
  const addonTotal = order.value.selectedAddOns.reduce((s, a) => s + (a.price * (a.quantity || 0)), 0)
  return flowerTotal + addonTotal
})

const deliveryFeeModel = ref(0)
watch(order, o => { if (o) deliveryFeeModel.value = (o as any).deliveryFee ?? 0 }, { immediate: true })
async function saveDeliveryFee() {
  await ordersStore.updateOrderMeta(orderId, { deliveryFee: Number(deliveryFeeModel.value) })
}

const total = computed(() => subtotal.value + (Number(deliveryFeeModel.value) || 0))

async function addSelectedAddOn() {
  if (!selectedAddOnId.value || !order.value) return
  const addon = addons.value.find(a => a.id === selectedAddOnId.value)
  if (!addon) return
  await ordersStore.addAddOnItem(orderId, {
    addonId: addon.id,
    label: addon.label,
    description: addon.description,
    price: addon.price ?? 0,
  }, Number(addOnQuantity.value || 1))
  selectedAddOnId.value = ''
  addOnQuantity.value = 1
}

async function saveAddOnQuantity(item: AddOnItem) {
  if (!order.value) return
  await ordersStore.updateAddOnItem(orderId, item.id, { quantity: Number(item.quantity || 1) })
}

async function removeAddOn(itemId: string) {
  await ordersStore.deleteAddOnItem(orderId, itemId)
}

function formatCurrency(v: number | { value?: number }) {
  const val = typeof v === 'number' ? v : (v && (v as any).value) || 0
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val)
}

// ── Client name ───────────────────────────────────────────────
const clientNameModel = ref('')
watch(order, o => { if (o) clientNameModel.value = o.clientName }, { immediate: true })

async function saveClientName() {
  await ordersStore.updateOrderName(orderId, clientNameModel.value)
}

// ── Has Card ──────────────────────────────────────────────────
const cardOptions = [
  { label: 'Yes', value: true as boolean | null },
  { label: 'No',  value: false as boolean | null },
]

async function setHasCard(val: boolean | null) {
  const next = order.value?.hasCard === val ? null : val
  await ordersStore.updateOrderMeta(orderId, { hasCard: next })
}

// ── Payment ───────────────────────────────────────────────────
const paymentModel = ref('')
watch(order, o => { if (o) paymentModel.value = o.paymentMode }, { immediate: true })
async function savePayment() {
  await ordersStore.updateOrderMeta(orderId, { paymentMode: paymentModel.value as any })
}

// ── Delivery ──────────────────────────────────────────────────
const deliveryModel = ref('')
watch(order, o => { if (o) deliveryModel.value = o.deliveryMode }, { immediate: true })
async function saveDelivery() {
  await ordersStore.updateOrderMeta(orderId, { deliveryMode: deliveryModel.value as any })
}

// ── Platform ──────────────────────────────────────────────────
const platformModel = ref('')
watch(order, o => { if (o) platformModel.value = o.clientPlatform }, { immediate: true })
async function savePlatform() {
  await ordersStore.updateOrderMeta(orderId, { clientPlatform: platformModel.value as any })
}

// ── Status ───────────────────────────────────────────────────
const statusModel = ref('requested')
watch(order, o => { if (o) statusModel.value = (o as any).status ?? 'requested' }, { immediate: true })
async function saveStatus() {
  await ordersStore.updateOrderMeta(orderId, { status: statusModel.value as any })
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

async function doDeleteItem() {
  if (deleteItemId.value) await ordersStore.deleteFlowerItem(orderId, deleteItemId.value)
  showDeleteItem.value = false
  deleteItemId.value = null
}

// ── Export ────────────────────────────────────────────────────
function handleExport() {
  if (!order.value) return
  ordersStore.exportSessionToExcel(order.value.sessionId, sessionName.value)
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
