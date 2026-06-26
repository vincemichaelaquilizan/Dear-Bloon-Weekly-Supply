import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import type { Order, FlowerItem, SessionSummary, SessionFlowerTally } from '~/types'

const STORAGE_KEY = 'bloom_orders'

export const useOrdersStore = defineStore('orders', () => {
  const orders = ref<Order[]>([])

  // ── Persistence ──────────────────────────────────────────────
  function load() {
    if (import.meta.client) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) orders.value = JSON.parse(raw)
      } catch { orders.value = [] }
    }
  }

  function save() {
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders.value))
    }
  }

  watch(orders, save, { deep: true })

  // ── Getters ──────────────────────────────────────────────────
  function getOrder(id: string): Order | undefined {
    return orders.value.find(o => o.id === id)
  }

  function getOrdersBySession(sessionId: string): Order[] {
    return orders.value.filter(o => o.sessionId === sessionId)
  }

  function totalFlowers(order: Order): number {
    return order.flowerItems.reduce((sum, f) => sum + f.quantity, 0)
  }

  /** Aggregate per-flower totals across all orders in a session */
  function sessionFlowerBreakdown(sessionId: string): SessionFlowerTally[] {
    const map = new Map<string, number>()
    for (const order of getOrdersBySession(sessionId)) {
      for (const item of order.flowerItems) {
        const key = item.name.toLowerCase()
        map.set(key, (map.get(key) ?? 0) + item.quantity)
      }
    }
    return Array.from(map.entries())
      .map(([key, total]) => ({ name: toTitleCase(key), total }))
      .sort((a, b) => b.total - a.total)
  }

  function sessionSummary(sessionId: string): Omit<SessionSummary, 'session'> {
    const sessionOrders = getOrdersBySession(sessionId)
    const breakdown = sessionFlowerBreakdown(sessionId)
    const totalFlowersCount = breakdown.reduce((s, f) => s + f.total, 0)
    return {
      orderCount: sessionOrders.length,
      totalFlowers: totalFlowersCount,
      flowerBreakdown: breakdown,
    }
  }

  // ── Mutations ────────────────────────────────────────────────
  function createOrder(sessionId: string, clientName: string): Order {
    const now = new Date().toISOString()
    const order: Order = {
      id: uuidv4(),
      sessionId,
      clientName: clientName.trim() || 'Unnamed Client',
      flowerItems: [],
      createdAt: now,
      updatedAt: now,
    }
    orders.value.unshift(order)
    return order
  }

  function updateOrderName(id: string, clientName: string) {
    const order = getOrder(id)
    if (!order) return
    order.clientName = clientName
    order.updatedAt = new Date().toISOString()
  }

  function deleteOrder(id: string) {
    orders.value = orders.value.filter(o => o.id !== id)
  }

  function deleteOrdersBySession(sessionId: string) {
    orders.value = orders.value.filter(o => o.sessionId !== sessionId)
  }

  // ── Flower items ─────────────────────────────────────────────
  function addFlowerItem(orderId: string, name: string, quantity: number): FlowerItem {
    const order = getOrder(orderId)
    if (!order) throw new Error('Order not found')
    const normalized = toTitleCase(name)
    const existing = order.flowerItems.find(f => f.name.toLowerCase() === normalized.toLowerCase())
    if (existing) {
      existing.quantity += quantity
      order.updatedAt = new Date().toISOString()
      return existing
    }
    const item: FlowerItem = { id: uuidv4(), name: normalized, quantity }
    order.flowerItems.push(item)
    order.updatedAt = new Date().toISOString()
    return item
  }

  function updateFlowerItem(orderId: string, itemId: string, patch: Partial<FlowerItem>) {
    const order = getOrder(orderId)
    if (!order) return
    const item = order.flowerItems.find(f => f.id === itemId)
    if (!item) return
    if (patch.name !== undefined) item.name = toTitleCase(patch.name)
    if (patch.quantity !== undefined) item.quantity = Math.max(0, patch.quantity)
    order.updatedAt = new Date().toISOString()
  }

  function deleteFlowerItem(orderId: string, itemId: string) {
    const order = getOrder(orderId)
    if (!order) return
    order.flowerItems = order.flowerItems.filter(f => f.id !== itemId)
    order.updatedAt = new Date().toISOString()
  }

  // ── Export ───────────────────────────────────────────────────
  function exportOrderToCSV(orderId: string): string {
    const order = getOrder(orderId)
    if (!order) return ''
    const rows = [
      ['Client Name', 'Flower', 'Quantity'],
      ...order.flowerItems.map(f => [order.clientName, f.name, String(f.quantity)])
    ]
    return rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
  }

  function exportSessionToCSV(sessionId: string, sessionName: string): string {
    const sessionOrders = getOrdersBySession(sessionId)
    const rows = [['Session', 'Client Name', 'Flower', 'Quantity']]
    for (const order of sessionOrders) {
      for (const f of order.flowerItems) {
        rows.push([sessionName, order.clientName, f.name, String(f.quantity)])
      }
    }
    // Append breakdown summary
    rows.push([])
    rows.push(['--- Session Tally ---', '', '', ''])
    rows.push(['Flower', 'Total Quantity', '', ''])
    for (const t of sessionFlowerBreakdown(sessionId)) {
      rows.push([t.name, String(t.total), '', ''])
    }
    return rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
  }

  function exportAllToCSV(): string {
    const rows = [['Session ID', 'Client Name', 'Flower', 'Quantity', 'Created At']]
    for (const order of orders.value) {
      for (const f of order.flowerItems) {
        rows.push([order.sessionId.slice(0, 8), order.clientName, f.name, String(f.quantity), order.createdAt])
      }
    }
    return rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
  }

  function downloadCSV(csv: string, filename: string) {
    if (!import.meta.client) return
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return {
    orders,
    load,
    getOrder,
    getOrdersBySession,
    totalFlowers,
    sessionFlowerBreakdown,
    sessionSummary,
    createOrder,
    updateOrderName,
    deleteOrder,
    deleteOrdersBySession,
    addFlowerItem,
    updateFlowerItem,
    deleteFlowerItem,
    exportOrderToCSV,
    exportSessionToCSV,
    exportAllToCSV,
    downloadCSV,
  }
})

function toTitleCase(str: string): string {
  return str.trim().replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}
