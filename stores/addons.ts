import { defineStore } from 'pinia'
import { ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { GlobalAddon } from '~/types'

export const useAddonsStore = defineStore('addons', () => {
  const client = useSupabaseClient<any>()

  const addons = ref<GlobalAddon[]>([])
  const loading = ref(false)

  function rowToAddon(row: any): GlobalAddon {
    return {
      id: row.id,
      label: row.label,
      description: row.description ?? undefined,
      price: row.price !== undefined && row.price !== null ? Number(row.price) : 0,
    }
  }

  async function load() {
    loading.value = true
    try {
      const { data, error } = await client
        .from('addons')
        .select('*')
        .order('label', { ascending: true })

      if (error) throw error
      addons.value = (data ?? []).map(rowToAddon)
    } catch (err) {
      console.error('Failed to load add-ons:', err)
    } finally {
      loading.value = false
    }
  }

  function findByLabel(label: string): GlobalAddon | undefined {
    return addons.value.find(addon => addon.label.toLowerCase() === label.toLowerCase())
  }

  async function addAddon(label: string, description = '', price = 0): Promise<GlobalAddon | null> {
    const normalized = toTitleCase(label)
    const existing = findByLabel(normalized)
    if (existing) return existing

    const payload = {
      id: uuidv4(),
      label: normalized,
      description: description.trim(),
      price: price ?? 0,
    }

    const { data, error } = await client
      .from('addons')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('Failed to add add-on:', error)
      const addon: GlobalAddon = { id: payload.id, label: normalized, description: payload.description, price: payload.price }
      addons.value.push(addon)
      return addon
    }

    const addon: GlobalAddon = {
      id: data.id,
      label: data.label,
      description: data.description ?? undefined,
      price: data.price !== undefined && data.price !== null ? Number(data.price) : 0,
    }

    addons.value.push(addon)
    return addon
  }

  async function updateAddon(id: string, patch: Partial<GlobalAddon>) {
    const addon = addons.value.find(a => a.id === id)
    if (!addon) return

    const updates: Record<string, any> = {}
    if (patch.label !== undefined) updates.label = toTitleCase(patch.label)
    if (patch.description !== undefined) updates.description = patch.description
    if (patch.price !== undefined) updates.price = patch.price

    const { error } = await client
      .from('addons')
      .update(updates)
      .eq('id', id)

    if (error) {
      console.error('Failed to update add-on:', error)
      return
    }

    if (updates.label) addon.label = updates.label
    if (updates.description !== undefined) addon.description = updates.description
    if (updates.price !== undefined) addon.price = updates.price
  }

  async function deleteAddon(id: string) {
    const { error } = await client
      .from('addons')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Failed to delete add-on:', error)
      return
    }

    const index = addons.value.findIndex(a => a.id === id)
    if (index !== -1) addons.value.splice(index, 1)
  }

  return {
    addons,
    loading,
    load,
    findByLabel,
    addAddon,
    updateAddon,
    deleteAddon,
  }
})

function toTitleCase(str: string): string {
  return str
    .trim()
    .replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}
