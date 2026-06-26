<template>
  <div class="animate-fade-in">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <h1 class="font-serif text-3xl text-gray-900 dark:text-white">Sessions</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {{ sessions.length }} {{ sessions.length === 1 ? 'session' : 'sessions' }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button v-if="sessions.length > 0" @click="handleExportAll" class="btn-ghost">
          ⬇ Export All
        </button>
        <button @click="showNewModal = true" class="btn-primary">+ New Session</button>
      </div>
    </div>

    <!-- Search -->
    <div v-if="sessions.length > 0" class="mb-6">
      <div class="relative max-w-sm">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">🔍</span>
        <input v-model="searchQuery" type="text" placeholder="Search sessions…" class="input pl-9 w-full" />
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="sessions.length === 0" class="text-center py-20">
      <div class="text-6xl mb-4">💐</div>
      <h2 class="font-serif text-2xl text-gray-700 dark:text-gray-300 mb-2">No sessions yet</h2>
      <p class="text-gray-500 dark:text-gray-400 mb-6">Create a session to start grouping client orders.</p>
      <button @click="showNewModal = true" class="btn-primary">+ New Session</button>
    </div>

    <!-- No results -->
    <div v-else-if="filteredSessions.length === 0" class="text-center py-16">
      <div class="text-4xl mb-3">🌾</div>
      <p class="text-gray-500 dark:text-gray-400">No sessions match "<strong>{{ searchQuery }}</strong>"</p>
    </div>

    <!-- Sessions list -->
    <div v-else class="space-y-4">
      <SessionCard
        v-for="session in filteredSessions"
        :key="session.id"
        :session="session"
        @delete="confirmDelete(session.id)"
        @export="handleExportSession(session.id)"
      />
    </div>
  </div>

  <!-- New Session Modal -->
  <ModalDialog :open="showNewModal" @close="showNewModal = false" title="New Session">
    <div class="space-y-4">
      <div>
        <label class="form-label">Session Name</label>
        <input
          v-model="newName"
          type="text"
          placeholder="e.g. Saturday Walk-in, Wedding June 28"
          class="input w-full"
          @keydown.enter="createSession"
          ref="newInput"
        />
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button @click="showNewModal = false" class="btn-ghost">Cancel</button>
        <button @click="createSession" class="btn-primary">Create Session</button>
      </div>
    </div>
  </ModalDialog>

  <!-- Confirm delete -->
  <ConfirmDialog
    :open="showDeleteConfirm"
    title="Delete Session"
    message="This will permanently delete the session and all its client orders. This cannot be undone."
    confirm-label="Delete"
    @confirm="doDelete"
    @cancel="showDeleteConfirm = false"
  />
</template>

<script setup lang="ts">
const sessionsStore = useSessionsStore()
const ordersStore = useOrdersStore()
const router = useRouter()

const { sessions } = storeToRefs(sessionsStore)

const searchQuery = ref('')
const showNewModal = ref(false)
const newName = ref('')
const newInput = ref<HTMLInputElement | null>(null)
const showDeleteConfirm = ref(false)
const deleteTargetId = ref<string | null>(null)

const filteredSessions = computed(() => {
  if (!searchQuery.value.trim()) return sessions.value
  const q = searchQuery.value.toLowerCase()
  return sessions.value.filter(s => s.name.toLowerCase().includes(q))
})

watch(showNewModal, (val) => {
  if (val) { newName.value = ''; nextTick(() => newInput.value?.focus()) }
})

function createSession() {
  const session = sessionsStore.createSession(newName.value)
  showNewModal.value = false
  router.push(`/session/${session.id}`)
}

function confirmDelete(id: string) {
  deleteTargetId.value = id
  showDeleteConfirm.value = true
}

function doDelete() {
  if (deleteTargetId.value) {
    ordersStore.deleteOrdersBySession(deleteTargetId.value)
    sessionsStore.deleteSession(deleteTargetId.value)
  }
  showDeleteConfirm.value = false
  deleteTargetId.value = null
}

function handleExportSession(id: string) {
  const session = sessionsStore.getSession(id)
  if (!session) return
  const csv = ordersStore.exportSessionToCSV(id, session.name)
  ordersStore.downloadCSV(csv, `bloom-${session.name}.csv`)
}

function handleExportAll() {
  const csv = ordersStore.exportAllToCSV()
  ordersStore.downloadCSV(csv, 'bloom-all-sessions.csv')
}

useSeoMeta({ title: 'Sessions — Bloom' })
</script>
