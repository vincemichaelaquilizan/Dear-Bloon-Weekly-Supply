// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/supabase',
    '@pinia/nuxt',
  ],
  // supabase: {
  //   redirect: false,
  //   clientOptions: {
  //     auth: {
  //       persistSession: true,       // store session in localStorage
  //       autoRefreshToken: true,     // keep the session alive automatically
  //       detectSessionInUrl: true,   // needed for magic links / OAuth callbacks
  //       storageKey: 'sb-auth',      // explicit key for reliable persistence
  //     },
  //   },
  // },
  css: ['~/assets/css/main.css'],
  typescript: {
    strict: true,
  },
  app: {
    head: {
      title: 'Dear Bloom — Flower Request Manager',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Manage flower requests and orders with ease.' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap' },
      ]
    }
  }
})
