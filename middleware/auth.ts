export const config = {
  global: true,
}

export default defineNuxtRouteMiddleware(async (to) => {
  const sessionState = useSupabaseSession()
  let session = sessionState.value

  if (!session) {
    const client = useSupabaseClient()
    const { data } = await client.auth.getSession()
    session = data.session
    if (session) {
      sessionState.value = session
    }
  }

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
