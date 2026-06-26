<template>
  <div class="animate-fade-in">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="font-serif text-3xl text-gray-900 dark:text-white">Flower Catalogue</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {{ flowers.length }} unique {{ flowers.length === 1 ? 'flower' : 'flowers' }}
        </p>
      </div>
      <button @click="openAdd" class="btn-primary">+ Add Flower</button>
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
        v-for="flower in flowers"
        :key="flower.id"
        class="flower-card group"
      >
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <span class="text-2xl">{{ flower.emoji || '🌸' }}</span>
          <span class="font-medium text-gray-800 dark:text-gray-200 truncate">{{ flower.name }}</span>
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

const showModal = ref(false)
const editTarget = ref<GlobalFlower | null>(null)
const form = reactive({ name: '', emoji: '' })
const nameInput = ref<HTMLInputElement | null>(null)

function openAdd() {
  editTarget.value = null
  form.name = ''
  form.emoji = ''
  showModal.value = true
  nextTick(() => nameInput.value?.focus())
}

function openEdit(flower: GlobalFlower) {
  editTarget.value = flower
  form.name = flower.name
  form.emoji = flower.emoji ?? ''
  showModal.value = true
  nextTick(() => nameInput.value?.focus())
}

function closeModal() {
  showModal.value = false
  editTarget.value = null
}

function save() {
  if (!form.name.trim()) return
  if (editTarget.value) {
    flowersStore.updateFlower(editTarget.value.id, { name: form.name, emoji: form.emoji || undefined })
  } else {
    flowersStore.addFlower(form.name, form.emoji || undefined)
  }
  closeModal()
}

const showDeleteConfirm = ref(false)
const deleteTargetId = ref<string | null>(null)

function confirmDelete(id: string) {
  deleteTargetId.value = id
  showDeleteConfirm.value = true
}

function doDelete() {
  if (deleteTargetId.value) flowersStore.deleteFlower(deleteTargetId.value)
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
