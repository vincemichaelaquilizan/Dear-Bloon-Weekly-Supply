export const config = {
  global: true,
}

export default defineNuxtRouteMiddleware(async (to) => {
  const client = useSupabaseClient()

  // getSession() returns { data: { session }, error }
  // session is a plain object (or null), NOT a ref
  const { data: { session } } = await client.auth.getSession()

  // Allow access to login page without authentication
  if (to.path === '/login') {
    if (session) {
      // Redirect already-authenticated users away from login
      return navigateTo('/')
    }
    return
  }

  // Require authentication for all other pages
  if (!session) {
    return navigateTo('/login')
  }
})
