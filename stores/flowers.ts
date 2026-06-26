import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import type { GlobalFlower } from '~/types'

const STORAGE_KEY = 'bloom_global_flowers'

const DEFAULT_FLOWERS: GlobalFlower[] = [
  { id: uuidv4(), name: 'Rose', emoji: '🌹' },
  { id: uuidv4(), name: 'Gerbera', emoji: '🌸' },
  { id: uuidv4(), name: 'Tulip', emoji: '🌷' },
  { id: uuidv4(), name: 'Sunflower', emoji: '🌻' },
  { id: uuidv4(), name: 'Lily', emoji: '💐' },
  { id: uuidv4(), name: 'Orchid', emoji: '🌺' },
  { id: uuidv4(), name: 'Daisy', emoji: '🌼' },
  { id: uuidv4(), name: 'Carnation', emoji: '🌸' },
  { id: uuidv4(), name: 'Peony', emoji: '🌸' },
  { id: uuidv4(), name: 'Lavender', emoji: '💜' },
]

export const useFlowersStore = defineStore('flowers', () => {
  const flowers = ref<GlobalFlower[]>([])

  function load() {
    if (import.meta.client) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          flowers.value = JSON.parse(raw)
        } else {
          flowers.value = DEFAULT_FLOWERS
          save()
        }
      } catch {
        flowers.value = DEFAULT_FLOWERS
      }
    }
  }

  function save() {
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(flowers.value))
    }
  }

  watch(flowers, save, { deep: true })

  const flowerNames = computed(() => flowers.value.map(f => f.name))

  function findByName(name: string): GlobalFlower | undefined {
    return flowers.value.find(f => f.name.toLowerCase() === name.toLowerCase())
  }

  function addFlower(name: string, emoji?: string): GlobalFlower {
    const normalized = toTitleCase(name)
    const existing = findByName(normalized)
    if (existing) return existing
    const flower: GlobalFlower = { id: uuidv4(), name: normalized, emoji }
    flowers.value.push(flower)
    return flower
  }

  function updateFlower(id: string, patch: Partial<GlobalFlower>) {
    const f = flowers.value.find(f => f.id === id)
    if (!f) return
    if (patch.name) f.name = toTitleCase(patch.name)
    if (patch.emoji !== undefined) f.emoji = patch.emoji
  }

  function deleteFlower(id: string) {
    flowers.value = flowers.value.filter(f => f.id !== id)
  }

  function suggest(query: string, limit = 8): GlobalFlower[] {
    if (!query.trim()) return flowers.value.slice(0, limit)
    const q = query.toLowerCase()
    return flowers.value
      .filter(f => f.name.toLowerCase().includes(q))
      .slice(0, limit)
  }

  return { flowers, flowerNames, load, findByName, addFlower, updateFlower, deleteFlower, suggest }
})

function toTitleCase(str: string): string {
  return str.trim().replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}
