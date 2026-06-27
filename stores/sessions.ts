import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import type { Session } from '~/types'

export const useSessionsStore = defineStore('sessions', () => {
  const client = useSupabaseClient<any>()
  const sessions = ref<Session[]>([])
  const loaded = ref(false)

  function rowToSession(row: any): Session {
    return {
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  async function load() {
    if (loaded.value) return

    try {
      const { data, error } = await client
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      sessions.value = (data ?? []).map(rowToSession)
    } catch (err) {
      console.error('Failed to load sessions:', err)
      sessions.value = []
    } finally {
      loaded.value = true
    }
  }

  function getSession(id: string): Session | undefined {
    return sessions.value.find(s => s.id === id)
  }

  async function createSession(name: string): Promise<Session | null> {
    const now = new Date().toISOString()

    const payload = {
      id: uuidv4(),
      name: name.trim() || 'Unnamed Session',
      created_at: now,
      updated_at: now,
    }

    const { data, error } = await client
      .from('sessions')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('Failed to create session:', error)
      return null
    }

    const session = rowToSession(data)
    sessions.value.unshift(session)
    return session
  }

  async function updateSession(id: string, name: string) {
    const session = getSession(id)
    if (!session) return

    const updatedAt = new Date().toISOString()

    const { error } = await client
      .from('sessions')
      .update({ name: name.trim() || session.name, updated_at: updatedAt })
      .eq('id', id)

    if (error) {
      console.error('Failed to update session:', error)
      return
    }

    session.name = name.trim() || session.name
    session.updatedAt = updatedAt
  }

  async function deleteSession(id: string) {
    const { error } = await client.from('sessions').delete().eq('id', id)
    if (error) {
      console.error('Failed to delete session:', error)
      return
    }

    sessions.value = sessions.value.filter(s => s.id !== id)
  }

  async function touchSession(id: string) {
    const session = getSession(id)
    if (!session) return

    const updatedAt = new Date().toISOString()

    const { error } = await client
      .from('sessions')
      .update({ updated_at: updatedAt })
      .eq('id', id)

    if (error) {
      console.error('Failed to touch session:', error)
      return
    }

    session.updatedAt = updatedAt
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