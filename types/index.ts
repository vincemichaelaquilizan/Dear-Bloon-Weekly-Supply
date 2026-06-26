export interface FlowerItem {
  id: string
  name: string         // normalized, e.g. "Gerbera"
  quantity: number
}

export interface Order {
  id: string
  sessionId: string    // which session this order belongs to
  clientName: string
  flowerItems: FlowerItem[]
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
