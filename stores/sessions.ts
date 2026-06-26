import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import type { Session } from '~/types'

const STORAGE_KEY = 'bloom_sessions'

export const useSessionsStore = defineStore('sessions', () => {
  const sessions = ref<Session[]>([])

  function load() {
    if (import.meta.client) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) sessions.value = JSON.parse(raw)
      } catch { sessions.value = [] }
    }
  }

  function save() {
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.value))
    }
  }

  watch(sessions, save, { deep: true })

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
    const s = getSession(id)
    if (!s) return
    s.name = name.trim() || s.name
    s.updatedAt = new Date().toISOString()
  }

  function deleteSession(id: string) {
    sessions.value = sessions.value.filter(s => s.id !== id)
  }

  function touchSession(id: string) {
    const s = getSession(id)
    if (s) s.updatedAt = new Date().toISOString()
  }

  return { sessions, load, getSession, createSession, updateSession, deleteSession, touchSession }
})
