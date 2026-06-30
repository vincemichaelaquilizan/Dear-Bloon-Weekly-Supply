<template>
  <div class="animate-fade-in">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="font-serif text-3xl text-gray-900 dark:text-white">Add-ons</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {{ filteredAddons.length }} {{ filteredAddons.length === 1 ? 'add-on' : 'add-ons' }}
        </p>
      </div>
      <div class="flex items-center gap-3">
        <input v-model="searchQuery" placeholder="Search add-ons…" class="input text-sm" />
        <button @click="openAdd" class="btn-primary">+ Add Add-on</button>
      </div>
    </div>

    <div v-if="addons.length === 0" class="text-center py-20">
      <div class="text-6xl mb-4">✨</div>
      <h2 class="font-serif text-2xl text-gray-700 dark:text-gray-300 mb-2">No add-ons yet</h2>
      <p class="text-gray-500 dark:text-gray-400 mb-6">Create add-ons and choose them inside each order.</p>
      <button @click="openAdd" class="btn-primary">+ Add Add-on</button>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <div
        v-for="addon in filteredAddons"
        :key="addon.id"
        class="flower-card group"
      >
        <div class="flex flex-col gap-2">
          <span class="font-medium text-gray-800 dark:text-gray-200 truncate">{{ addon.label }}</span>
          <p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{{ addon.description || 'No description provided.' }}</p>
          <span class="text-sm text-gray-500">{{ formatCurrency(addon.price || 0) }}</span>
        </div>
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            @click="openEdit(addon)"
            class="icon-btn text-gray-400 hover:text-bloom-600"
            aria-label="Edit"
          >✏️</button>
          <button
            @click="confirmDelete(addon.id)"
            class="icon-btn text-gray-400 hover:text-red-500"
            aria-label="Delete"
          >🗑️</button>
        </div>
      </div>
    </div>

    <ModalDialog :open="showModal" @close="closeModal" :title="editTarget ? 'Edit Add-on' : 'Add Add-on'">
      <div class="space-y-4">
        <div>
          <label class="form-label">Label</label>
          <input
            v-model="form.label"
            type="text"
            placeholder="e.g. Ribbon, Delivery Box"
            class="input w-full"
            ref="nameInput"
            @keydown.enter="save"
          />
        </div>
        <div>
          <label class="form-label">Description</label>
          <textarea
            v-model="form.description"
            rows="3"
            class="input w-full resize-none"
            placeholder="Write a short description"
          ></textarea>
        </div>
        <div>
          <label class="form-label">Price (PHP)</label>
          <input v-model.number="form.price" type="number" min="0" step="0.25" class="input w-full" />
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button @click="closeModal" class="btn-ghost">Cancel</button>
          <button @click="save" class="btn-primary" :disabled="!form.label.trim()">
            {{ editTarget ? 'Save' : 'Add' }}
          </button>
        </div>
      </div>
    </ModalDialog>

    <ConfirmDialog
      :open="showDeleteConfirm"
      title="Remove Add-on"
      message="Remove this add-on from the catalogue? It will no longer be available to select in orders."
      confirm-label="Remove"
      @confirm="doDelete"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { GlobalAddon } from '~/types'

const addonsStore = useAddonsStore()
const { addons } = storeToRefs(addonsStore)

onMounted(async () => {
  await addonsStore.load()
})

const showModal = ref(false)
const editTarget = ref<GlobalAddon | null>(null)
const form = reactive({ label: '', description: '', price: 0 })
const nameInput = ref<HTMLInputElement | null>(null)
const searchQuery = ref('')

const filteredAddons = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return addons.value
  return addons.value.filter(addon => addon.label.toLowerCase().includes(q) || addon.description?.toLowerCase().includes(q))
})

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v)
}

function openAdd() {
  editTarget.value = null
  form.label = ''
  form.description = ''
  form.price = 0
  showModal.value = true
  nextTick(() => nameInput.value?.focus())
}

function openEdit(addon: GlobalAddon) {
  editTarget.value = addon
  form.label = addon.label
  form.description = addon.description ?? ''
  form.price = addon.price ?? 0
  showModal.value = true
  nextTick(() => nameInput.value?.focus())
}

function closeModal() {
  showModal.value = false
  editTarget.value = null
}

async function save() {
  if (!form.label.trim()) return
  if (editTarget.value) {
    await addonsStore.updateAddon(editTarget.value.id, { label: form.label, description: form.description, price: form.price })
  } else {
    await addonsStore.addAddon(form.label, form.description, form.price)
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
  if (deleteTargetId.value) await addonsStore.deleteAddon(deleteTargetId.value)
  showDeleteConfirm.value = false
  deleteTargetId.value = null
}

useSeoMeta({ title: 'Add-ons — Bloom' })
</script>

<style scoped>
.flower-card {
  @apply flex flex-col justify-between gap-3 bg-white dark:bg-gray-900 border border-bloom-100 dark:border-gray-800 rounded-xl px-4 py-4 shadow-sm hover:shadow-petal hover:border-bloom-200 dark:hover:border-bloom-700 transition-all duration-150;
}
.icon-btn {
  @apply p-1 rounded text-base leading-none transition-all;
}
</style>
