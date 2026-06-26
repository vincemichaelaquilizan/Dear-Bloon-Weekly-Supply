import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import type { Order, FlowerItem, SessionSummary, SessionFlowerTally, PaymentMode, DeliveryMode, ClientPlatform } from '~/types'

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

  // Auto-load on store creation (fixes refresh not restoring data)
  if (import.meta.client) {
    load()
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
      hasCard: null,
      paymentMode: '',
      deliveryMode: '',
      clientPlatform: '',
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

  function updateOrderMeta(
    id: string,
    patch: Partial<Pick<Order, 'hasCard' | 'paymentMode' | 'deliveryMode' | 'clientPlatform'>>
  ) {
    const order = getOrder(id)
    if (!order) return
    Object.assign(order, patch)
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
    const meta = [
      ['Client Name', order.clientName],
      ['Has Card', order.hasCard === null ? '' : order.hasCard ? 'Yes' : 'No'],
      ['Payment Mode', order.paymentMode],
      ['Delivery Mode', order.deliveryMode],
      ['Client Platform', order.clientPlatform],
      [],
      ['Flower', 'Quantity'],
      ...order.flowerItems.map(f => [f.name, String(f.quantity)])
    ]
    return meta.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  }

  function exportSessionToCSV(sessionId: string, sessionName: string): string {
    const sessionOrders = getOrdersBySession(sessionId)
    const rows = [['Session', 'Client Name', 'Has Card', 'Payment', 'Delivery', 'Platform', 'Flower', 'Quantity']]
    for (const order of sessionOrders) {
      for (const f of order.flowerItems) {
        rows.push([
          sessionName,
          order.clientName,
          order.hasCard === null ? '' : order.hasCard ? 'Yes' : 'No',
          order.paymentMode,
          order.deliveryMode,
          order.clientPlatform,
          f.name,
          String(f.quantity),
        ])
      }
    }
    rows.push([])
    rows.push(['--- Session Tally ---', '', '', '', '', '', '', ''])
    rows.push(['Flower', 'Total Quantity', '', '', '', '', '', ''])
    for (const t of sessionFlowerBreakdown(sessionId)) {
      rows.push([t.name, String(t.total), '', '', '', '', '', ''])
    }
    return rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
  }

  function exportAllToCSV(): string {
    const rows = [['Session ID', 'Client Name', 'Has Card', 'Payment', 'Delivery', 'Platform', 'Flower', 'Quantity', 'Created At']]
    for (const order of orders.value) {
      for (const f of order.flowerItems) {
        rows.push([
          order.sessionId.slice(0, 8),
          order.clientName,
          order.hasCard === null ? '' : order.hasCard ? 'Yes' : 'No',
          order.paymentMode,
          order.deliveryMode,
          order.clientPlatform,
          f.name,
          String(f.quantity),
          order.createdAt,
        ])
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
    updateOrderMeta,
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
