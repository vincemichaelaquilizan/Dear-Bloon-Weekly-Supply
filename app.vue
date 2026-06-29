<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
const { init } = useTheme()
const client = useSupabaseClient()
const ordersStore = useOrdersStore()
const flowersStore = useFlowersStore()
const sessionsStore = useSessionsStore()

onMounted(async () => {
  init()

  // Only load store data when a session exists —
  // avoids unauthenticated Supabase queries before middleware redirects
  const { data: { session } } = await client.auth.getSession()
  if (session) {
    sessionsStore.load()
    ordersStore.load()
    flowersStore.load()
  }

  // Re-load stores whenever the auth state changes (e.g. after login/logout)
  client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      sessionsStore.load()
      ordersStore.load()
      flowersStore.load()
    }
  })
})
</script>
