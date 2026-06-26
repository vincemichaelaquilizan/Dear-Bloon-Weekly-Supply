<template>
  <div class="min-h-screen bg-bloom-50 dark:bg-gray-950 font-sans transition-colors duration-200">
    <header class="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-bloom-100 dark:border-gray-800">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-2 group">
          <span class="text-2xl">🌸</span>
          <span class="font-serif text-xl text-bloom-700 dark:text-bloom-300 group-hover:text-bloom-600 transition-colors">Dear Bloom</span>
        </NuxtLink>
        <nav class="flex items-center gap-1">
          <NuxtLink to="/" class="nav-link" active-class="nav-link-active" exact>Sessions</NuxtLink>
          <NuxtLink to="/flowers" class="nav-link" active-class="nav-link-active">Flowers</NuxtLink>
        </nav>
        <button @click="toggle" class="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-bloom-50 dark:hover:bg-gray-800 transition-colors">
          <span v-if="isDark">☀️</span>
          <span v-else>🌙</span>
        </button>
      </div>
    </header>
    <main class="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <slot />
    </main>
  </div>
</template>
<script setup lang="ts">
const { isDark, toggle } = useTheme()
</script>
<style scoped>
.nav-link {
  @apply px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400
    hover:text-bloom-600 dark:hover:text-bloom-400 hover:bg-bloom-50 dark:hover:bg-gray-800 transition-all duration-150;
}
.nav-link-active {
  @apply text-bloom-700 dark:text-bloom-300 bg-bloom-50 dark:bg-gray-800;
}
</style>
