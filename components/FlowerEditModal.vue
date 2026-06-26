<template>
  <ModalDialog :open="open" @close="$emit('close')" title="Edit Flower">
    <div class="space-y-4">
      <!-- Quantity -->
      <div>
        <label class="form-label">Quantity</label>
        <div class="flex items-center gap-2">
          <button @click="form.quantity = Math.max(1, form.quantity - 1)" class="stepper-btn">−</button>
          <input
            v-model.number="form.quantity"
            type="number"
            min="1"
            class="input w-20 text-center"
          />
          <button @click="form.quantity++" class="stepper-btn">+</button>
          <span class="text-sm text-gray-500 dark:text-gray-400">stems</span>
        </div>
      </div>

      <!-- Flower Name -->
      <div>
        <label class="form-label">Flower Name</label>
        <div class="relative">
          <input
            v-model="form.name"
            type="text"
            placeholder="Flower name"
            class="input w-full"
            @input="showSugg = true"
          />
          <Transition name="dropdown">
            <div
              v-if="showSugg && suggestions.length > 0 && form.name"
              class="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-gray-900 rounded-xl border border-bloom-100 dark:border-gray-700 shadow-petal-lg overflow-hidden"
            >
              <button
                v-for="s in suggestions"
                :key="s.id"
                class="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-bloom-50 dark:hover:bg-gray-800 transition-colors"
                @mousedown.prevent="form.name = s.name; showSugg = false"
              >
                <span>{{ s.emoji || '🌸' }}</span> {{ s.name }}
              </button>
            </div>
          </Transition>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-between pt-2">
        <button @click="handleDelete" class="btn-danger">Remove</button>
        <div class="flex gap-2">
          <button @click="$emit('close')" class="btn-ghost">Cancel</button>
          <button @click="handleSave" class="btn-primary">Save</button>
        </div>
      </div>
    </div>
  </ModalDialog>
</template>

<script setup lang="ts">
import type { FlowerItem } from '~/types'

const props = defineProps<{
  open: boolean
  item: FlowerItem
  orderId: string
}>()
const emit = defineEmits<{ close: []; deleted: [] }>()

const ordersStore = useOrdersStore()
const flowersStore = useFlowersStore()

const form = reactive({ name: props.item.name, quantity: props.item.quantity })
const showSugg = ref(false)

watch(() => props.item, (item) => {
  form.name = item.name
  form.quantity = item.quantity
}, { immediate: true })

const suggestions = computed(() => flowersStore.suggest(form.name, 5))

function handleSave() {
  ordersStore.updateFlowerItem(props.orderId, props.item.id, {
    name: form.name,
    quantity: form.quantity,
  })
  emit('close')
}

function handleDelete() {
  ordersStore.deleteFlowerItem(props.orderId, props.item.id)
  emit('deleted')
}
</script>

<style scoped>
.stepper-btn {
  @apply w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700
    bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300
    hover:bg-bloom-50 dark:hover:bg-bloom-950/30 hover:border-bloom-300 dark:hover:border-bloom-700
    font-bold text-lg flex items-center justify-center transition-all;
}
.dropdown-enter-active,
.dropdown-leave-active { transition: all 0.15s ease; }
.dropdown-enter-from,
.dropdown-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
