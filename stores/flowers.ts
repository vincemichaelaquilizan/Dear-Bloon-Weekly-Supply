import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { GlobalFlower } from '~/types'

export const useFlowersStore = defineStore('flowers', () => {
  const client = useSupabaseClient<any>()

  const flowers = ref<GlobalFlower[]>([])
  const loading = ref(false)

  // ── Load ──────────────────────────────────────────────────────
  async function load() {
    loading.value = true

    try {
      const { data, error } = await client
        .from('flowers')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error

      flowers.value = (data ?? []).map(row => ({
        id: row.id,
        name: row.name,
        emoji: row.emoji ?? undefined,
      }))
    } catch (err) {
      console.error('Failed to load flowers:', err)
    } finally {
      loading.value = false
    }
  }

  // ── Getters ───────────────────────────────────────────────────
  const flowerNames = computed(() => flowers.value.map(f => f.name))

  function findByName(name: string): GlobalFlower | undefined {
    return flowers.value.find(
      f => f.name.toLowerCase() === name.toLowerCase()
    )
  }

  function suggest(query: string, limit = 8): GlobalFlower[] {
    if (!query.trim()) return flowers.value.slice(0, limit)

    const q = query.toLowerCase()
    return flowers.value
      .filter(f => f.name.toLowerCase().includes(q))
      .slice(0, limit)
  }

  // ── Mutations ─────────────────────────────────────────────────
  async function addFlower(name: string, emoji?: string): Promise<GlobalFlower> {
    const normalized = toTitleCase(name)

    const existing = findByName(normalized)
    if (existing) return existing

    const payload = {
      id: uuidv4(),
      name: normalized,
      emoji: emoji ?? null,
    }

    const { data, error } = await client
      .from('flowers')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('Failed to add flower:', error)
      const flower: GlobalFlower = { id: payload.id, name: normalized, emoji }
      flowers.value.push(flower)
      return flower
    }

    const flower: GlobalFlower = {
      id: data.id,
      name: data.name,
      emoji: data.emoji ?? undefined,
    }

    flowers.value.push(flower)
    return flower
  }

  async function updateFlower(id: string, patch: Partial<GlobalFlower>) {
    const flower = flowers.value.find(f => f.id === id)
    if (!flower) return

    const updates: Record<string, any> = {}
    if (patch.name !== undefined) updates.name = toTitleCase(patch.name)
    if (patch.emoji !== undefined) updates.emoji = patch.emoji

    const { error } = await client
      .from('flowers')
      .update(updates)
      .eq('id', id)

    if (error) {
      console.error('Failed to update flower:', error)
      return
    }

    if (updates.name) flower.name = updates.name
    if (updates.emoji !== undefined) flower.emoji = updates.emoji
  }

  async function deleteFlower(id: string) {
    const { error } = await client
      .from('flowers')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Failed to delete flower:', error)
      return
    }

    const index = flowers.value.findIndex(f => f.id === id)
    if (index !== -1) flowers.value.splice(index, 1)
  }

  return {
    flowers,
    flowerNames,
    loading,
    load,
    findByName,
    addFlower,
    updateFlower,
    deleteFlower,
    suggest,
  }
})

function toTitleCase(str: string): string {
  return str
    .trim()
    .replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}