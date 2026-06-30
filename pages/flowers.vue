<template>
  <div class="animate-fade-in">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="font-serif text-3xl text-gray-900 dark:text-white">Flower Catalogue</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {{ filteredFlowers.length }} unique {{ filteredFlowers.length === 1 ? 'flower' : 'flowers' }}
        </p>
      </div>
      <div class="flex items-center gap-3">
        <input v-model="searchQuery" placeholder="Search flowers…" class="input text-sm" />
        <button @click="openAdd" class="btn-primary">+ Add Flower</button>
      </div>
    </div>

    <!-- Empty -->
    <div v-if="flowers.length === 0" class="text-center py-20">
      <div class="text-6xl mb-4">🌱</div>
      <h2 class="font-serif text-2xl text-gray-700 dark:text-gray-300 mb-2">No flowers yet</h2>
      <button @click="openAdd" class="btn-primary mt-4">+ Add Flower</button>
    </div>

    <!-- Flower Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      <div
        v-for="flower in filteredFlowers"
        :key="flower.id"
        class="flower-card group"
      >
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <span class="text-2xl">{{ flower.emoji || '🌸' }}</span>
          <div class="flex flex-col">
            <span class="font-medium text-gray-800 dark:text-gray-200 truncate">{{ flower.name }}</span>
            <span class="text-sm text-gray-500">{{ formatCurrency(flower.price || 0) }} / stem</span>
          </div>
        </div>
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            @click="openEdit(flower)"
            class="icon-btn text-gray-400 hover:text-bloom-600"
            aria-label="Edit"
          >✏️</button>
          <button
            @click="confirmDelete(flower.id)"
            class="icon-btn text-gray-400 hover:text-red-500"
            aria-label="Delete"
          >🗑️</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Add/Edit Modal -->
  <ModalDialog :open="showModal" @close="closeModal" :title="editTarget ? 'Edit Flower' : 'Add Flower'">
    <div class="space-y-4">
      <div>
        <label class="form-label">Flower Name</label>
        <input
          v-model="form.name"
          type="text"
          placeholder="e.g. Gerbera"
          class="input w-full"
          ref="nameInput"
          @keydown.enter="save"
        />
      </div>
      <div>
        <label class="form-label">Emoji (optional)</label>
        <input
          v-model="form.emoji"
          type="text"
          placeholder="🌸"
          class="input w-full"
          maxlength="2"
        />
      </div>
      <div>
        <label class="form-label">Price per stem (PHP)</label>
        <input v-model.number="form.price" type="number" min="0" step="0.25" class="input w-full" />
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button @click="closeModal" class="btn-ghost">Cancel</button>
        <button @click="save" class="btn-primary" :disabled="!form.name.trim()">
          {{ editTarget ? 'Save' : 'Add' }}
        </button>
      </div>
    </div>
  </ModalDialog>

  <!-- Confirm Delete -->
  <ConfirmDialog
    :open="showDeleteConfirm"
    title="Remove Flower"
    message="Remove this flower from the catalogue? It won't affect existing orders."
    confirm-label="Remove"
    @confirm="doDelete"
    @cancel="showDeleteConfirm = false"
  />
</template>

<script setup lang="ts">
import type { GlobalFlower } from '~/types'

const flowersStore = useFlowersStore()
const { flowers } = storeToRefs(flowersStore)

onMounted(async () => {
  await flowersStore.load()
})

const showModal = ref(false)
const editTarget = ref<GlobalFlower | null>(null)
const form = reactive({ name: '', emoji: '', price: 0 })
const nameInput = ref<HTMLInputElement | null>(null)
const searchQuery = ref('')

const filteredFlowers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return flowers.value
  return flowers.value.filter(f => f.name.toLowerCase().includes(q))
})

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v)
}

function openAdd() {
  editTarget.value = null
  form.name = ''
  form.emoji = ''
  form.price = 0
  showModal.value = true
  nextTick(() => nameInput.value?.focus())
}

function openEdit(flower: GlobalFlower) {
  editTarget.value = flower
  form.name = flower.name
  form.emoji = flower.emoji ?? ''
  form.price = flower.price ?? 0
  showModal.value = true
  nextTick(() => nameInput.value?.focus())
}

function closeModal() {
  showModal.value = false
  editTarget.value = null
}

async function save() {
  if (!form.name.trim()) return
  if (editTarget.value) {
    await flowersStore.updateFlower(editTarget.value.id, { name: form.name, emoji: form.emoji || undefined, price: form.price })
  } else {
    await flowersStore.addFlower(form.name, form.emoji || undefined, form.price)
  }
  closeModal()
}

const showDeleteConfirm = ref(false)
const deleteTargetId = ref<string | null>(null)

function confirmDelete(id: string) {
  deleteTargetId.value = id
  showDeleteConfirm.value = true
}

async function doDelete() {
  if (deleteTargetId.value) await flowersStore.deleteFlower(deleteTargetId.value)
  showDeleteConfirm.value = false
  deleteTargetId.value = null
}

useSeoMeta({ title: 'Flower Catalogue — Bloom' })
</script>

<style scoped>
.flower-card {
  @apply flex items-center gap-3 bg-white dark:bg-gray-900 border border-bloom-100 dark:border-gray-800
    rounded-xl px-4 py-3 shadow-sm hover:shadow-petal hover:border-bloom-200 dark:hover:border-bloom-700
    transition-all duration-150;
}
.icon-btn {
  @apply p-1 rounded text-base leading-none transition-all;
}
</style>
