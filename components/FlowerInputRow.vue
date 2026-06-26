<template>
  <div class="relative">
    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-bloom-300 dark:border-bloom-800 p-4">
      <div class="flex items-center gap-3">
        <span class="text-xl shrink-0">➕</span>
        <div class="relative flex-1" ref="containerRef">
          <input
            v-model="inputValue"
            type="text"
            placeholder='Add flower… e.g. "3 roses" or "gerbera 5"'
            class="input w-full pr-24"
            @keydown.enter="submitInput"
            @keydown.escape="clearInput"
            @keydown.arrow-down.prevent="moveSuggestion(1)"
            @keydown.arrow-up.prevent="moveSuggestion(-1)"
            @input="onInput"
            @focus="showSuggestions = true"
            ref="inputRef"
          />
          <!-- Submit hint -->
          <kbd
            v-if="inputValue"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 font-mono border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5"
          >↵</kbd>

          <!-- Suggestions dropdown -->
          <Transition name="dropdown">
            <div
              v-if="showSuggestions && suggestions.length > 0"
              class="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white dark:bg-gray-900 rounded-xl border border-bloom-100 dark:border-gray-700 shadow-petal-lg overflow-hidden"
            >
              <button
                v-for="(s, i) in suggestions"
                :key="s.id"
                class="suggestion-item"
                :class="{ 'suggestion-item-active': selectedSuggestion === i }"
                @mousedown.prevent="pickSuggestion(s.name)"
              >
                <span>{{ s.emoji || '🌸' }}</span>
                <span>{{ s.name }}</span>
              </button>
            </div>
          </Transition>
        </div>

        <button
          @click="submitInput"
          :disabled="!inputValue.trim()"
          class="btn-primary shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>

      <!-- Parse preview -->
      <div v-if="parsed" class="mt-2.5 ml-9 flex items-center gap-2">
        <span class="text-xs text-gray-400 dark:text-gray-500">Will add:</span>
        <span class="inline-flex items-center gap-1.5 text-xs bg-leaf-50 dark:bg-leaf-950/30 text-leaf-700 dark:text-leaf-400 border border-leaf-200 dark:border-leaf-800 rounded-full px-2.5 py-0.5 font-medium">
          ✓ {{ parsed.quantity }}× {{ parsed.name }}
        </span>
      </div>
      <div v-else-if="inputValue.trim()" class="mt-2.5 ml-9">
        <span class="text-xs text-red-400">Couldn't parse — try "3 roses" or "gerbera 5"</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GlobalFlower } from '~/types'

const props = defineProps<{ orderId: string }>()

const ordersStore = useOrdersStore()
const flowersStore = useFlowersStore()
const { parse } = useFlowerParser()

const inputValue = ref('')
const showSuggestions = ref(false)
const selectedSuggestion = ref(-1)
const inputRef = ref<HTMLInputElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)

const parsed = computed(() => {
  if (!inputValue.value.trim()) return null
  return parse(inputValue.value)
})

const suggestions = computed<GlobalFlower[]>(() => {
  if (!inputValue.value.trim()) return flowersStore.flowers.slice(0, 8)
  const namePart = parse(inputValue.value)?.name ?? inputValue.value
  return flowersStore.suggest(namePart, 6)
})

function onInput() {
  showSuggestions.value = true
  selectedSuggestion.value = -1
}

function moveSuggestion(dir: 1 | -1) {
  if (!showSuggestions.value) return
  const max = suggestions.value.length - 1
  selectedSuggestion.value = Math.max(-1, Math.min(max, selectedSuggestion.value + dir))
}

function pickSuggestion(name: string) {
  const q = parsed.value?.quantity ?? 1
  inputValue.value = `${q} ${name}`
  showSuggestions.value = false
  selectedSuggestion.value = -1
  nextTick(() => inputRef.value?.focus())
}

function submitInput() {
  if (selectedSuggestion.value >= 0 && suggestions.value[selectedSuggestion.value]) {
    pickSuggestion(suggestions.value[selectedSuggestion.value].name)
    return
  }

  const result = parse(inputValue.value)
  if (!result) return

  ordersStore.addFlowerItem(props.orderId, result.name, result.quantity)
  // Also register to global catalogue
  flowersStore.addFlower(result.name)
  clearInput()
}

function clearInput() {
  inputValue.value = ''
  showSuggestions.value = false
  selectedSuggestion.value = -1
}

// Close suggestions on outside click
onMounted(() => {
  document.addEventListener('click', (e) => {
    if (!containerRef.value?.contains(e.target as Node)) {
      showSuggestions.value = false
    }
  })
})
</script>

<style scoped>
.suggestion-item {
  @apply flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300
    hover:bg-bloom-50 dark:hover:bg-gray-800 transition-colors text-left;
}
.suggestion-item-active {
  @apply bg-bloom-50 dark:bg-gray-800;
}
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
