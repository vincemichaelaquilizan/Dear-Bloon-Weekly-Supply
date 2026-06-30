// stores/orders.ts

import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import type { Order, FlowerItem, AddOnItem, SessionSummary, SessionFlowerTally } from '~/types'

export const useOrdersStore = defineStore('orders', () => {
  const client = useSupabaseClient<any>()

  const orders = ref<Order[]>([])
  const loading = ref(false)

  // ── Helpers ───────────────────────────────────────────────────
  function rowToOrder(row: any): Order {
    return {
      id: row.id,
      sessionId: row.session_id,
      clientName: row.client_name,
      flowerItems: row.flower_items ?? [],
      hasCard: row.has_card,
      paymentMode: row.payment_mode,
      deliveryMode: row.delivery_mode,
      clientPlatform: row.client_platform,
      status: row.status ?? 'requested',
      deliveryFee: row.delivery_fee !== undefined && row.delivery_fee !== null ? Number(row.delivery_fee) : 0,
      selectedAddOns: Array.isArray(row.selected_addons)
        ? row.selected_addons.map((item: any) => ({
            id: item.id,
            addonId: item.addonId,
            label: item.label,
            description: item.description ?? undefined,
            price: item.price !== undefined && item.price !== null ? Number(item.price) : 0,
            quantity: item.quantity !== undefined && item.quantity !== null ? Number(item.quantity) : 0,
          }))
        : [],
      orderNotes: row.order_notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  // ── Load ──────────────────────────────────────────────────────
  async function load() {
    loading.value = true

    try {
      const { data, error } = await client
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      orders.value = (data ?? []).map(rowToOrder)
    } catch (err) {
      console.error('Failed to load orders:', err)
    } finally {
      loading.value = false
    }
  }

  async function loadBySession(sessionId: string) {
    loading.value = true

    try {
      const { data, error } = await client
        .from('orders')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Merge into orders, avoiding duplicates
      const incoming = (data ?? []).map(rowToOrder)
      const existingIds = new Set(orders.value.map(o => o.id))
      for (const o of incoming) {
        if (!existingIds.has(o.id)) orders.value.push(o)
      }
    } catch (err) {
      console.error('Failed to load orders for session:', err)
    } finally {
      loading.value = false
    }
  }

  // ── Getters ───────────────────────────────────────────────────
  function getOrder(id: string): Order | undefined {
    return orders.value.find(o => o.id === id)
  }

  function getOrdersBySession(sessionId: string): Order[] {
    return orders.value.filter(o => o.sessionId === sessionId)
  }

  function totalFlowers(order: Order): number {
    return order.flowerItems.reduce((sum, f) => sum + f.quantity, 0)
  }

  function sessionFlowerBreakdown(sessionId: string): SessionFlowerTally[] {
    const map = new Map<string, number>()
    for (const order of getOrdersBySession(sessionId))
      for (const item of order.flowerItems)
        map.set(item.name, (map.get(item.name) ?? 0) + item.quantity)
    return Array.from(map.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
  }

  function sessionSummary(sessionId: string): Omit<SessionSummary, 'session'> {
    const breakdown = sessionFlowerBreakdown(sessionId)
    return {
      orderCount: getOrdersBySession(sessionId).length,
      totalFlowers: breakdown.reduce((s, f) => s + f.total, 0),
      flowerBreakdown: breakdown,
    }
  }

  // ── Mutations ─────────────────────────────────────────────────
  async function createOrder(sessionId: string, clientName: string): Promise<Order | null> {
    const now = new Date().toISOString()

    const payload = {
      id: uuidv4(),
      session_id: sessionId,
      client_name: clientName.trim() || 'Unnamed Client',
      flower_items: [],
      has_card: null,
      payment_mode: '',
      delivery_mode: '',
      client_platform: '',
      status: 'requested',
      delivery_fee: 0,
      order_notes: '',
      selected_addons: [],
      created_at: now,
      updated_at: now,
    }

    const { data, error } = await client
      .from('orders')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('Failed to create order:', error)
      return null
    }

    const order = rowToOrder(data)
    orders.value.unshift(order)
    return order
  }

  async function updateOrderName(id: string, clientName: string) {
    const o = getOrder(id)
    if (!o) return

    const updatedAt = new Date().toISOString()

    const { error } = await client
      .from('orders')
      .update({ client_name: clientName, updated_at: updatedAt })
      .eq('id', id)

    if (error) { console.error('Failed to update order name:', error); return }

    o.clientName = clientName
    o.updatedAt = updatedAt
  }

  async function updateOrderMeta(
    id: string,
    patch: Partial<Pick<Order, 'hasCard' | 'paymentMode' | 'deliveryMode' | 'clientPlatform' | 'orderNotes' | 'status' | 'deliveryFee' | 'selectedAddOns'>>
  ) {
    const o = getOrder(id)
    if (!o) return

    const updatedAt = new Date().toISOString()

    const dbPatch: Record<string, any> = { updated_at: updatedAt }
    if (patch.hasCard !== undefined)       dbPatch.has_card = patch.hasCard
    if (patch.paymentMode !== undefined)   dbPatch.payment_mode = patch.paymentMode
    if (patch.deliveryMode !== undefined)  dbPatch.delivery_mode = patch.deliveryMode
    if (patch.clientPlatform !== undefined) dbPatch.client_platform = patch.clientPlatform
    if (patch.orderNotes !== undefined)    dbPatch.order_notes = patch.orderNotes
    if (patch.status !== undefined)        dbPatch.status = patch.status
    if (patch.deliveryFee !== undefined)   dbPatch.delivery_fee = patch.deliveryFee
    if (patch.selectedAddOns !== undefined) dbPatch.selected_addons = patch.selectedAddOns

    const { error } = await client
      .from('orders')
      .update(dbPatch)
      .eq('id', id)

    if (error) { console.error('Failed to update order meta:', error); return }

    Object.assign(o, patch)
    o.updatedAt = updatedAt
  }

  async function deleteOrder(id: string) {
    const { error } = await client.from('orders').delete().eq('id', id)
    if (error) { console.error('Failed to delete order:', error); return }
    orders.value = orders.value.filter(o => o.id !== id)
  }

  async function deleteOrdersBySession(sessionId: string) {
    const { error } = await client.from('orders').delete().eq('session_id', sessionId)
    if (error) { console.error('Failed to delete orders by session:', error); return }
    orders.value = orders.value.filter(o => o.sessionId !== sessionId)
  }

  // ── Flower items ──────────────────────────────────────────────
  async function addFlowerItem(orderId: string, name: string, quantity: number): Promise<FlowerItem | null> {
    const order = getOrder(orderId)
    if (!order) return null

    const normalized = toTitleCase(name)
    const existing = order.flowerItems.find(f => f.name.toLowerCase() === normalized.toLowerCase())

    if (existing) {
      existing.quantity += quantity
    } else {
      order.flowerItems.push({ id: uuidv4(), name: normalized, quantity })
    }

    const updatedAt = new Date().toISOString()

    const { error } = await client
      .from('orders')
      .update({ flower_items: order.flowerItems, updated_at: updatedAt })
      .eq('id', orderId)

    if (error) { console.error('Failed to add flower item:', error); return null }

    order.updatedAt = updatedAt
    return existing ?? order.flowerItems[order.flowerItems.length - 1]
  }

  async function updateFlowerItem(orderId: string, itemId: string, patch: Partial<FlowerItem>) {
    const order = getOrder(orderId)
    if (!order) return

    const item = order.flowerItems.find(f => f.id === itemId)
    if (!item) return

    if (patch.name !== undefined) item.name = toTitleCase(patch.name)
    if (patch.quantity !== undefined) item.quantity = Math.max(0, patch.quantity)

    const updatedAt = new Date().toISOString()

    const { error } = await client
      .from('orders')
      .update({ flower_items: order.flowerItems, updated_at: updatedAt })
      .eq('id', orderId)

    if (error) { console.error('Failed to update flower item:', error); return }

    order.updatedAt = updatedAt
  }

  async function deleteFlowerItem(orderId: string, itemId: string) {
    const order = getOrder(orderId)
    if (!order) return

    order.flowerItems = order.flowerItems.filter(f => f.id !== itemId)

    const updatedAt = new Date().toISOString()

    const { error } = await client
      .from('orders')
      .update({ flower_items: order.flowerItems, updated_at: updatedAt })
      .eq('id', orderId)

    if (error) { console.error('Failed to delete flower item:', error); return }

    order.updatedAt = updatedAt
  }

  async function addAddOnItem(orderId: string, addon: Pick<AddOnItem, 'addonId' | 'label' | 'description' | 'price'>, quantity: number): Promise<AddOnItem | null> {
    const order = getOrder(orderId)
    if (!order) return null

    const existing = order.selectedAddOns.find(item => item.addonId === addon.addonId)
    if (existing) {
      existing.quantity += quantity
    } else {
      order.selectedAddOns.push({
        id: uuidv4(),
        addonId: addon.addonId,
        label: addon.label,
        description: addon.description,
        price: addon.price,
        quantity,
      })
    }

    const updatedAt = new Date().toISOString()

    const { error } = await client
      .from('orders')
      .update({ selected_addons: order.selectedAddOns, updated_at: updatedAt })
      .eq('id', orderId)

    if (error) { console.error('Failed to add add-on item:', error); return null }

    order.updatedAt = updatedAt
    return existing ?? order.selectedAddOns[order.selectedAddOns.length - 1]
  }

  async function updateAddOnItem(orderId: string, itemId: string, patch: Partial<AddOnItem>) {
    const order = getOrder(orderId)
    if (!order) return

    const item = order.selectedAddOns.find(i => i.id === itemId)
    if (!item) return

    if (patch.quantity !== undefined) item.quantity = Math.max(1, patch.quantity)
    if (patch.label !== undefined) item.label = patch.label
    if (patch.description !== undefined) item.description = patch.description
    if (patch.price !== undefined) item.price = patch.price

    const updatedAt = new Date().toISOString()

    const { error } = await client
      .from('orders')
      .update({ selected_addons: order.selectedAddOns, updated_at: updatedAt })
      .eq('id', orderId)

    if (error) { console.error('Failed to update add-on item:', error); return }

    order.updatedAt = updatedAt
  }

  async function deleteAddOnItem(orderId: string, itemId: string) {
    const order = getOrder(orderId)
    if (!order) return

    order.selectedAddOns = order.selectedAddOns.filter(i => i.id !== itemId)

    const updatedAt = new Date().toISOString()

    const { error } = await client
      .from('orders')
      .update({ selected_addons: order.selectedAddOns, updated_at: updatedAt })
      .eq('id', orderId)

    if (error) { console.error('Failed to delete add-on item:', error); return }

    order.updatedAt = updatedAt
  }

  // ── Excel Export ──────────────────────────────────────────────
  async function exportSessionToExcel(sessionId: string, sessionName: string) {
    if (!import.meta.client) return
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    wb.creator = 'Dear Bloom'
    wb.created = new Date()

    const sessionOrders = getOrdersBySession(sessionId)
    const breakdown = sessionFlowerBreakdown(sessionId)

    const ws1 = wb.addWorksheet('Orders Detail')

    ws1.mergeCells('A1:J1')
    const titleCell = ws1.getCell('A1')
    titleCell.value = `📋 Session: ${sessionName}`
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF7C3AED' } }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } }
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' }
    ws1.getRow(1).height = 28

    ws1.mergeCells('A2:J2')
    const dateCell = ws1.getCell('A2')
    dateCell.value = `Exported: ${new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
    dateCell.font = { italic: true, size: 10, color: { argb: 'FF6B7280' } }
    dateCell.alignment = { horizontal: 'center' }
    ws1.getRow(2).height = 18

    ws1.addRow([])

    const headers = ['#', 'Client Name', 'Has Card', 'Payment Mode', 'Delivery Mode', 'Platform', 'Delivery Status', 'Flower', 'Qty', 'Notes']
    const headerRow = ws1.addRow(headers)
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB03260' } }
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
      cell.border = {
        bottom: { style: 'medium', color: { argb: 'FF7C3AED' } },
        right: { style: 'thin', color: { argb: 'FFF3E8F2' } },
        top: { style: 'thin', color: { argb: 'FFF3E8F2' } },
      }
    })
    ws1.getRow(4).height = 22

    let clientNum = 0
    const platformLabel = (p: string) => ({ threads: 'Threads', facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', viber: 'Viber', whatsapp: 'WhatsApp', walk_in: 'Walk-in', other: 'Other' }[p] ?? p)
    const paymentLabel = (p: string) => ({ cash: 'Cash', gcash: 'GCash', maya: 'Maya', bank_transfer: 'Bank Transfer', credit_card: 'Credit Card' }[p] ?? p)
    const deliveryLabel = (d: string) => ({ pickup: 'Pick-up', delivery: 'Delivery (Lalamove)', rush_delivery: 'Rush Delivery' }[d] ?? d)
    const statusOptions = ['None', 'Deliver', 'Received']
    const cardOptions = ['None', 'Yes', 'No']
    const paymentOptions = ['Cash', 'GCash', 'Maya', 'Bank Transfer', 'Credit Card', '—']
    const deliveryOptions = ['Pick-up', 'Delivery (Lalamove)', 'Rush Delivery', '—']
    const platformOptions = ['Threads', 'Facebook', 'Instagram', 'TikTok', 'Viber', 'WhatsApp', 'Walk-in', 'Other', '—']

    for (const order of sessionOrders) {
      clientNum++
      const flowers = order.flowerItems
      const startRow = ws1.rowCount + 1

      const cardValue = order.hasCard === null ? 'None' : order.hasCard ? 'Yes' : 'No'
      const paymentValue = paymentLabel(order.paymentMode) || '—'
      const deliveryValue = deliveryLabel(order.deliveryMode) || '—'
      const platformValue = platformLabel(order.clientPlatform) || '—'
      const statusValue = 'None'

      if (flowers.length === 0) {
        const row = ws1.addRow([clientNum, order.clientName, cardValue, paymentValue, deliveryValue, platformValue, statusValue, '(no flowers)', '', order.orderNotes || ''])
        styleDataRow(row, clientNum, ws1)
      } else {
        flowers.forEach((flower, fi) => {
          const row = ws1.addRow([
            fi === 0 ? clientNum : '',
            fi === 0 ? order.clientName : '',
            fi === 0 ? cardValue : '',
            fi === 0 ? paymentValue : '',
            fi === 0 ? deliveryValue : '',
            fi === 0 ? platformValue : '',
            fi === 0 ? statusValue : '',
            flower.name, flower.quantity,
            fi === 0 ? (order.orderNotes || '') : '',
          ])
          styleDataRow(row, clientNum, ws1)
          const qtyCell = row.getCell(9)
          qtyCell.font = { bold: true, color: { argb: 'FF7C3AED' } }
          qtyCell.alignment = { horizontal: 'center' }
        })

        if (flowers.length > 1) {
          const endRow = startRow + flowers.length - 1
          for (const col of [1, 2, 3, 4, 5, 6, 7, 10]) {
            try { ws1.mergeCells(startRow, col, endRow, col) } catch {}
            const cell = ws1.getCell(startRow, col)
            cell.alignment = { vertical: 'middle', horizontal: col === 2 ? 'left' : 'center', wrapText: true }
          }
        }
      }
    }

    const firstDataRow = 5
    const lastDataRow = ws1.rowCount
    for (let rowIndex = firstDataRow; rowIndex <= lastDataRow; rowIndex++) {
      const row = ws1.getRow(rowIndex)
      for (const col of [3, 4, 5, 6, 7]) {
        const cell = row.getCell(col)
        if (!cell) continue
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [
            col === 3 ? `"${cardOptions.join(',')}"` :
            col === 4 ? `"${paymentOptions.join(',')}"` :
            col === 5 ? `"${deliveryOptions.join(',')}"` :
            col === 6 ? `"${platformOptions.join(',')}"` :
            `"${statusOptions.join(',')}"`
          ],
          showErrorMessage: true,
          errorTitle: 'Invalid value',
          error: 'Choose a value from the dropdown.',
        }
      }
    }

    const grandTotal = breakdown.reduce((s, f) => s + f.total, 0)
    const totalFlowersRow = ws1.addRow(['', '', '', '', '', '', 'Total Flowers', grandTotal, '', ''])
    totalFlowersRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'medium', color: { argb: 'FFB03260' } },
        bottom: { style: 'medium', color: { argb: 'FFB03260' } },
        left: { style: 'thin', color: { argb: 'FFF3E8F2' } },
        right: { style: 'thin', color: { argb: 'FFF3E8F2' } },
      }
    })
    totalFlowersRow.getCell(7).alignment = { horizontal: 'left' }
    totalFlowersRow.getCell(8).font = { bold: true, color: { argb: 'FFFFFFFF' } }

    ws1.columns = [{ width: 5 }, { width: 22 }, { width: 11 }, { width: 18 }, { width: 22 }, { width: 16 }, { width: 16 }, { width: 20 }, { width: 7 }, { width: 28 }]
    ws1.getRow(1).height = 24
    ws1.getRow(2).height = 18
    ws1.getRow(3).height = 8

    const ws2 = wb.addWorksheet('Flower Tally')
    ws2.mergeCells('A1:C1')
    const t2 = ws2.getCell('A1')
    t2.value = `🌸 Flower Tally — ${sessionName}`
    t2.font = { bold: true, size: 14, color: { argb: 'FF7C3AED' } }
    t2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7ECFF' } }
    t2.alignment = { horizontal: 'center', vertical: 'middle' }
    ws2.getRow(1).height = 28
    ws2.addRow([])
    const th2 = ws2.addRow(['Flower', 'Total Stems', 'Share %'])
    th2.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB03260' } }
      cell.alignment = { horizontal: 'center' }
      cell.border = {
        bottom: { style: 'medium', color: { argb: 'FF7C3AED' } },
        top: { style: 'thin', color: { argb: 'FFF3E8F2' } },
      }
    })
    ws2.getRow(3).height = 20
    breakdown.forEach((item, i) => {
      const row = ws2.addRow([item.name, item.total, grandTotal > 0 ? `${((item.total / grandTotal) * 100).toFixed(1)}%` : '0%'])
      const isEven = i % 2 === 0
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFF8FC' : 'FFFFFFFF' } }
        cell.alignment = { horizontal: 'center' }
        cell.border = { bottom: { style: 'hair', color: { argb: 'FFEDE9FE' } } }
      })
      row.getCell(1).alignment = { horizontal: 'left' }
      row.getCell(1).font = { bold: true }
      row.getCell(2).font = { bold: true, color: { argb: 'FFE05A9B' } }
    })
    ws2.addRow([])
    const totalRow = ws2.addRow(['TOTAL', grandTotal, '100%'])
    totalRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } }
      cell.alignment = { horizontal: 'center' }
      cell.border = {
        top: { style: 'medium', color: { argb: 'FFB03260' } },
      }
    })
    totalRow.getCell(1).alignment = { horizontal: 'left' }
    ws2.columns = [{ width: 24 }, { width: 14 }, { width: 12 }]

    const ws3 = wb.addWorksheet('Session Summary')
    ws3.mergeCells('A1:B1')
    const ts3 = ws3.getCell('A1')
    ts3.value = 'Session Summary'
    ts3.font = { bold: true, size: 13, color: { argb: 'FF7C3AED' } }
    ts3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7ECFF' } }
    ts3.alignment = { horizontal: 'center' }
    ws3.getRow(1).height = 24
    ws3.addRow([])
    const summaryRows = [
      ['Session Name', sessionName],
      ['Export Date', new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })],
      ['Total Clients', sessionOrders.length],
      ['Total Flower Types', breakdown.length],
      ['Total Stems', grandTotal],
    ]
    summaryRows.forEach(([label, val], index) => {
      const row = ws3.addRow([label, val])
      row.getCell(1).font = { bold: true, color: { argb: 'FF6B7280' } }
      row.getCell(2).font = { bold: true, size: 11, color: { argb: index === 4 ? 'FF7C3AED' : 'FF111827' } }
      row.height = 18
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: index % 2 === 0 ? 'FFFFF8FC' : 'FFFFFFFF' } }
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFF3E8F2' } } }
      })
    })
    ws3.columns = [{ width: 22 }, { width: 32 }]

    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `DearBloom-${sessionName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function exportAllToExcel() {
    if (!import.meta.client) return
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    wb.creator = 'Dear Bloom'

    const ws = wb.addWorksheet('All Orders')
    ws.mergeCells('A1:K1')
    const t = ws.getCell('A1')
    t.value = '🌸 Dear Bloom — All Orders'
    t.font = { bold: true, size: 14, color: { argb: 'FFE05A9B' } }
    t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF0F7' } }
    t.alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(1).height = 28
    ws.addRow([])

    const statusOptions = ['None', 'Deliver', 'Received']
    const cardOptions = ['None', 'Yes', 'No']
    const paymentOptions = ['Cash', 'GCash', 'Maya', 'Bank Transfer', 'Credit Card', '—']
    const deliveryOptions = ['Pick-up', 'Delivery (Lalamove)', 'Rush Delivery', '—']
    const platformOptions = ['Threads', 'Facebook', 'Instagram', 'TikTok', 'Viber', 'WhatsApp', 'Walk-in', 'Other', '—']

    const hRow = ws.addRow(['Session', 'Client', 'Has Card', 'Payment', 'Delivery', 'Platform', 'Delivery Status', 'Flower', 'Qty', 'Notes', 'Date'])
    hRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB03260' } }
      cell.alignment = { horizontal: 'center' }
      cell.border = {
        bottom: { style: 'medium', color: { argb: 'FF7C3AED' } },
        top: { style: 'thin', color: { argb: 'FFF3E8F2' } },
      }
    })
    ws.getRow(3).height = 20

    const sessionsStore = useSessionsStore()
    let i = 0
    let grandFlowerTotal = 0
    for (const order of orders.value) {
      const sessionName = sessionsStore.getSession(order.sessionId)?.name ?? order.sessionId.slice(0, 8)
      const flowers = order.flowerItems.length ? order.flowerItems : [{ name: '—', quantity: 0, id: '' }]
      for (const f of flowers) {
        grandFlowerTotal += f.quantity || 0
        const row = ws.addRow([
          sessionName, order.clientName,
          order.hasCard === null ? 'None' : order.hasCard ? 'Yes' : 'No',
          order.paymentMode || '—', order.deliveryMode || '—',
          order.clientPlatform || '—', 'None', f.name, f.quantity || '',
          order.orderNotes || '',
          new Date(order.createdAt).toLocaleDateString('en-PH'),
        ])
        const even = i % 2 === 0
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: even ? 'FFFFF8FC' : 'FFFFFFFF' } }
          cell.border = {
            bottom: { style: 'hair', color: { argb: 'FFEDE9FE' } },
            right: { style: 'thin', color: { argb: 'FFFCE7F3' } },
          }
        })
      }
      i++
    }

    const firstDataRow = 4
    const lastDataRow = ws.rowCount
    for (let rowIndex = firstDataRow; rowIndex <= lastDataRow; rowIndex++) {
      const row = ws.getRow(rowIndex)
      for (const col of [3, 4, 5, 6, 7]) {
        const cell = row.getCell(col)
        if (!cell) continue
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [
            col === 3 ? `"${cardOptions.join(',')}"` :
            col === 4 ? `"${paymentOptions.join(',')}"` :
            col === 5 ? `"${deliveryOptions.join(',')}"` :
            col === 6 ? `"${platformOptions.join(',')}"` :
            `"${statusOptions.join(',')}"`
          ],
          showErrorMessage: true,
          errorTitle: 'Invalid value',
          error: 'Choose a value from the dropdown.',
        }
      }
    }

    const totalSummaryRow = ws.addRow(['', '', '', '', '', '', 'Total Flowers', grandFlowerTotal, '', '', ''])
    totalSummaryRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'medium', color: { argb: 'FFB03260' } },
        bottom: { style: 'medium', color: { argb: 'FFB03260' } },
        left: { style: 'thin', color: { argb: 'FFF3E8F2' } },
        right: { style: 'thin', color: { argb: 'FFF3E8F2' } },
      }
    })
    totalSummaryRow.getCell(7).alignment = { horizontal: 'left' }
    totalSummaryRow.getCell(8).font = { bold: true, color: { argb: 'FFFFFFFF' } }

    ws.columns = [{ width: 20 }, { width: 22 }, { width: 10 }, { width: 16 }, { width: 22 }, { width: 14 }, { width: 16 }, { width: 20 }, { width: 7 }, { width: 28 }, { width: 14 }]

    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `DearBloom-AllOrders-${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  return {
    orders,
    loading,
    load,
    loadBySession,
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
    addAddOnItem,
    updateAddOnItem,
    deleteAddOnItem,
    exportSessionToExcel,
    exportAllToExcel,
  }
})

// ── Helpers ───────────────────────────────────────────────────
function toTitleCase(str: string): string {
  return str.trim().replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

function styleDataRow(row: any, clientNum: number, ws: any) {
  const isEven = clientNum % 2 === 0
  row.eachCell((cell: any) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFF8FC' : 'FFFFFFFF' } }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFF3E8F2' } },
      bottom: { style: 'hair', color: { argb: 'FFEDE9FE' } },
      left: { style: 'thin', color: { argb: 'FFF3E8F2' } },
      right: { style: 'thin', color: { argb: 'FFFCE7F3' } },
    }
    cell.alignment = { vertical: 'middle', wrapText: true }
  })
  row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' }
}