<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-50 dark:from-gray-900 dark:to-gray-800 px-4">
    <div class="w-full max-w-md">
      <!-- Logo/Header -->
      <div class="text-center mb-8">
        <h1 class="font-serif text-4xl text-gray-900 dark:text-white mb-2">Dear Bloom</h1>
        <p class="text-gray-600 dark:text-gray-400">Flower Request Manager</p>
      </div>

      <!-- Form Card -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h2 class="font-serif text-2xl text-gray-900 dark:text-white mb-6">Sign In</h2>

        <!-- Error Message -->
        <div
          v-if="errorMessage"
          class="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm"
        >
          {{ errorMessage }}
        </div>

        <!-- Form -->
        <form @submit.prevent="handleLogin" class="space-y-4">
          <!-- Username Input -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Username</label>
            <input
              v-model="username"
              type="text"
              placeholder="DearBloom_Admin"
              required
              class="input w-full"
              :disabled="isLoading"
              autocomplete="username"
            />
          </div>

          <!-- Password Input -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
            <input
              v-model="password"
              type="password"
              placeholder="••••••••"
              required
              class="input w-full"
              :disabled="isLoading"
              autocomplete="current-password"
            />
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="isLoading"
            class="btn-primary w-full mt-6"
          >
            {{ isLoading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
})

const client = useSupabaseClient()

const username = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

/**
 * Maps a username to the internal Supabase email.
 * Supabase Auth is email-based, so we store usernames
 * as email prefixes: DearBloom_Admin → dearbloom.admin@dearbloom.com
 */
const usernameToEmail = (input: string): string => {
  const map: Record<string, string> = {
    'dearbloom_admin': 'dearbloom.admin@dearbloom.com',
  }
  return map[input.toLowerCase()] ?? input
}

const handleLogin = async () => {
  errorMessage.value = ''
  isLoading.value = true

  try {
    const email = usernameToEmail(username.value.trim())

    const { error } = await client.auth.signInWithPassword({
      email,
      password: password.value,
    })

    if (error) {
      errorMessage.value = 'Invalid username or password.'
      return
    }

    await navigateTo('/')
  } catch (err) {
    errorMessage.value = 'An error occurred. Please try again.'
    console.error(err)
  } finally {
    isLoading.value = false
  }
}
</script>
