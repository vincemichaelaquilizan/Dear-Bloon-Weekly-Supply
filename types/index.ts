export interface FlowerItem {
  id: string
  name: string         // normalized, e.g. "Gerbera"
  quantity: number
}

export type PaymentMode = 'cash' | 'gcash' | 'card' | 'bank_transfer' | ''
export type DeliveryMode = 'pickup' | 'delivery' | 'rush_delivery' | ''
export type ClientPlatform = 'walk_in' | 'facebook' | 'instagram' | 'viber' | 'online_store' | 'other' | ''

export interface Order {
  id: string
  sessionId: string    // which session this order belongs to
  clientName: string
  flowerItems: FlowerItem[]
  hasCard: boolean | null        // does the client want a card?
  paymentMode: PaymentMode       // mode of payment
  deliveryMode: DeliveryMode     // mode of delivery
  clientPlatform: ClientPlatform // where the client came from
  createdAt: string
  updatedAt: string
}

export interface Session {
  id: string
  name: string         // e.g. "Saturday Walk-in", "Wedding June 28"
  createdAt: string
  updatedAt: string
}

/** Aggregated per-flower totals across a whole session */
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
}

export interface ParsedFlowerInput {
  quantity: number
  name: string
}
