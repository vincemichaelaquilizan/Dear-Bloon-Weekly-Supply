export interface FlowerItem {
  id: string
  name: string
  quantity: number
}

export type PaymentMode = 'cash' | 'gcash' | 'maya' | 'bank_transfer' | 'credit_card' | string
export type DeliveryMode = 'pickup' | 'delivery' | 'rush_delivery' | string
export type ClientPlatform = 'threads' | 'facebook' | 'instagram' | 'tiktok' | 'viber' | 'whatsapp' | 'walk_in' | 'other' | string

export type OrderStatus = 'requested' | 'delivered' | 'received' | string

export interface Order {
  id: string
  sessionId: string
  clientName: string
  flowerItems: FlowerItem[]
  hasCard: boolean | null
  paymentMode: PaymentMode
  deliveryMode: DeliveryMode
  clientPlatform: ClientPlatform
  status: OrderStatus
  deliveryFee?: number
  selectedAddOns: AddOnItem[]
  orderNotes: string           
  createdAt: string
  updatedAt: string
}

export interface Session {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface SessionFlowerTally {
  name: string
  emoji?: string
  total: number
}

export interface SessionSummary {
  session: Session
  orderCount: number
  totalFlowers: number
  flowerBreakdown: SessionFlowerTally[]
}

export interface GlobalFlower {
  id: string
  name: string
  color?: string
  emoji?: string
  price?: number
}

export interface GlobalAddon {
  id: string
  label: string
  description?: string
  price?: number
}

export interface AddOnItem {
  id: string
  addonId: string
  label: string
  description?: string
  price: number
  quantity: number
}

export interface ParsedFlowerInput {
  quantity: number
  name: string
}