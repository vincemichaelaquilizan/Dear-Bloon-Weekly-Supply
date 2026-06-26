import type { ParsedFlowerInput } from '~/types'

/**
 * Parse user input like:
 *   "3 gerbera", "gerbera 3", "3x gerbera", "3× gerbera", "gerbera×3", "3xgerbera"
 * Returns { quantity, name } or null if unparseable.
 */
export function useFlowerParser() {
  function parse(input: string): ParsedFlowerInput | null {
    const raw = input.trim()
    if (!raw) return null

    // Pattern 1: number (x/×)? name  — e.g. "3 gerbera", "3x gerbera", "3×gerbera"
    const leadingNum = raw.match(/^(\d+)\s*[x×]?\s+([a-zA-Z].*)$/i)
    if (leadingNum) {
      return { quantity: parseInt(leadingNum[1], 10), name: leadingNum[2].trim() }
    }

    // Pattern 2: number directly attached with x — e.g. "3xgerbera"
    const attachedX = raw.match(/^(\d+)[x×]([a-zA-Z].+)$/i)
    if (attachedX) {
      return { quantity: parseInt(attachedX[1], 10), name: attachedX[2].trim() }
    }

    // Pattern 3: name (x/×)? number — e.g. "gerbera 3", "gerbera×3"
    const trailingNum = raw.match(/^([a-zA-Z][^0-9]*?)\s*[x×]?\s*(\d+)$/i)
    if (trailingNum) {
      return { quantity: parseInt(trailingNum[2], 10), name: trailingNum[1].trim() }
    }

    // Pattern 4: just a name, no number → quantity = 1
    const justName = raw.match(/^([a-zA-Z][a-zA-Z\s]*)$/)
    if (justName) {
      return { quantity: 1, name: justName[1].trim() }
    }

    return null
  }

  return { parse }
}
