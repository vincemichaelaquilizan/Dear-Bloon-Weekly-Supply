<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
const { init } = useTheme()
const ordersStore = useOrdersStore()
const flowersStore = useFlowersStore()
const sessionsStore = useSessionsStore()

onMounted(() => {
  init()
  sessionsStore.load()
  ordersStore.load()
  flowersStore.load()
})
</script>
