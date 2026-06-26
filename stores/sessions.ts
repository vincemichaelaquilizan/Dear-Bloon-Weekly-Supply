import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import type { Session } from '~/types'

const STORAGE_KEY = 'bloom_sessions'

export const useSessionsStore = defineStore('sessions', () => {
  const sessions = ref<Session[]>([])
  const loaded = ref(false)

  function load() {
    if (!import.meta.client || loaded.value) return

    try {
      const raw = localStorage.getItem(STORAGE_KEY)

      if (raw) {
        sessions.value = JSON.parse(raw)
      }
    } catch (err) {
      console.error('Failed to load sessions:', err)
      sessions.value = []
    } finally {
      loaded.value = true
    }
  }

  function save() {
    if (!import.meta.client || !loaded.value) return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.value))
    } catch (err) {
      console.error('Failed to save sessions:', err)
    }
  }

  watch(
    sessions,
    () => {
      save()
    },
    { deep: true }
  )

  function getSession(id: string): Session | undefined {
    return sessions.value.find(s => s.id === id)
  }

  function createSession(name: string): Session {
    const now = new Date().toISOString()

    const session: Session = {
      id: uuidv4(),
      name: name.trim() || 'Unnamed Session',
      createdAt: now,
      updatedAt: now,
    }

    sessions.value.unshift(session)

    return session
  }

  function updateSession(id: string, name: string) {
    const session = getSession(id)
    if (!session) return

    session.name = name.trim() || session.name
    session.updatedAt = new Date().toISOString()
  }

  function deleteSession(id: string) {
    sessions.value = sessions.value.filter(s => s.id !== id)
  }

  function touchSession(id: string) {
    const session = getSession(id)
    if (!session) return

    session.updatedAt = new Date().toISOString()
  }

  return {
    sessions,
    load,
    getSession,
    createSession,
    updateSession,
    deleteSession,
    touchSession,
  }
})