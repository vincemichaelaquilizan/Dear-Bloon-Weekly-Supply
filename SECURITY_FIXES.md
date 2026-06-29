# Security Fixes Implementation Guide

This guide provides step-by-step code samples to address the critical vulnerabilities.

---

## 🚨 Fix #1: Secure Admin Credentials

### Step 1: Remove from Seed.sql
**File:** [Seed.sql](Seed.sql)

Replace the current seed file with environment-based approach:

```sql
-- Seed.sql - DO NOT include password
-- Password should be set via Supabase Dashboard or CLI only

-- Verify user exists (for testing/development only)
SELECT id, email FROM auth.users WHERE email = 'dearbloom.admin@dearbloom.com';
```

### Step 2: Update login.vue
**File:** [pages/login.vue](pages/login.vue#L95-L97)

Remove password hint:

```vue
<!-- BEFORE: -->
<input v-model="password" type="password" placeholder="••••••••" />

<!-- AFTER: -->
<input v-model="password" type="password" placeholder="Enter your password" />
```

### Step 3: Set Password in Supabase
1. Go to Supabase Dashboard → Authentication → Users
2. Find `dearbloom.admin@dearbloom.com`
3. Click → Reset Password
4. Set a strong password: `Min 12 chars, numbers, symbols, mixed case`
5. Remove Seed.sql from Git: `git rm Seed.sql && git commit -m "Remove credentials from repo"`
6. Clean Git history: Use `git filter-repo` or recreate repo

---

## 🔐 Fix #2: Add Data Isolation (User-Scoped Data)

### Step 1: Update Database Schema
**File:** [Schema.sql](Schema.sql)

Add this after the existing policy sections:

```sql
-- ── Add user_id to sessions ────────────────────────
ALTER TABLE sessions ADD COLUMN user_id UUID NOT NULL DEFAULT auth.uid();
ALTER TABLE sessions ADD CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- ── Add user_id to orders ────────────────────────
ALTER TABLE orders ADD COLUMN user_id UUID NOT NULL DEFAULT (SELECT user_id FROM sessions WHERE id = orders.session_id);
ALTER TABLE orders ADD CONSTRAINT fk_orders_session_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX idx_orders_user ON orders(user_id);

-- ── Drop old policies and create user-scoped ones ────────────────────────
-- SESSIONS POLICIES
DROP POLICY IF EXISTS "Auth read sessions" ON sessions;
DROP POLICY IF EXISTS "Auth insert sessions" ON sessions;
DROP POLICY IF EXISTS "Auth update sessions" ON sessions;
DROP POLICY IF EXISTS "Auth delete sessions" ON sessions;

CREATE POLICY "Users can read own sessions"
  ON sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create sessions"
  ON sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON sessions FOR DELETE
  USING (auth.uid() = user_id);

-- ORDERS POLICIES
DROP POLICY IF EXISTS "Auth read orders" ON orders;
DROP POLICY IF EXISTS "Auth insert orders" ON orders;
DROP POLICY IF EXISTS "Auth update orders" ON orders;
DROP POLICY IF EXISTS "Auth delete orders" ON orders;

CREATE POLICY "Users can read own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own orders"
  ON orders FOR DELETE
  USING (auth.uid() = user_id);

-- FLOWERS TABLE (shared across all users - no change needed)
-- Existing policies remain: any authenticated user can read/write
```

### Step 2: Test the Changes
```bash
# Connect to Supabase SQL editor and run the schema changes
# Then test in app - make sure you can still see your data
```

---

## 🛡️ Fix #3: Add Content Security Policy Headers

### Step 1: Update nuxt.config.ts
**File:** [nuxt.config.ts](nuxt.config.ts)

```typescript
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/supabase',
    '@pinia/nuxt',
  ],
  supabase: {
    redirect: false,
    clientOptions: {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'sb-auth',
      },
    },
  },
  css: ['~/assets/css/main.css'],
  typescript: {
    strict: true,
  },
  
  // ADD THIS SECTION ↓↓↓
  nitro: {
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'; base-uri 'self';",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), usb=(), payment=()',
    },
  },
  // ↑↑↑
  
  app: {
    head: {
      title: 'Dear Bloom — Flower Request Manager',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Manage flower requests and orders with ease.' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap' },
      ]
    }
  }
})
```

### Step 2: Test Headers
```bash
# Verify headers are set
curl -i http://localhost:3000 | grep -E "Content-Security-Policy|X-Content-Type-Options|X-Frame-Options"
```

---

## ✅ Fix #4: Add Input Validation

### Step 1: Create Validation Composable
**File:** Create `composables/useValidation.ts`

```typescript
// composables/useValidation.ts

export function useValidation() {
  const validateClientName = (name: string): { valid: boolean; error?: string } => {
    if (!name || typeof name !== 'string') {
      return { valid: false, error: 'Client name is required' }
    }

    const trimmed = name.trim()
    if (trimmed.length === 0) {
      return { valid: false, error: 'Client name cannot be empty' }
    }

    if (trimmed.length > 100) {
      return { valid: false, error: 'Client name must be less than 100 characters' }
    }

    // Allow: alphanumeric, spaces, hyphens, commas, periods, ampersands, apostrophes, parentheses
    if (!/^[a-zA-Z0-9\s\-,.&'()]+$/.test(trimmed)) {
      return { valid: false, error: 'Client name contains invalid characters' }
    }

    return { valid: true }
  }

  const validateFlowerName = (name: string): { valid: boolean; error?: string } => {
    if (!name || typeof name !== 'string') {
      return { valid: false, error: 'Flower name is required' }
    }

    const trimmed = name.trim()
    if (trimmed.length === 0) {
      return { valid: false, error: 'Flower name cannot be empty' }
    }

    if (trimmed.length > 50) {
      return { valid: false, error: 'Flower name must be less than 50 characters' }
    }

    if (!/^[a-zA-Z0-9\s\-,.&'()]+$/.test(trimmed)) {
      return { valid: false, error: 'Flower name contains invalid characters' }
    }

    return { valid: true }
  }

  const validateQuantity = (qty: any): { valid: boolean; error?: string } => {
    const num = parseInt(qty, 10)
    if (isNaN(num)) {
      return { valid: false, error: 'Quantity must be a number' }
    }

    if (num < 1) {
      return { valid: false, error: 'Quantity must be at least 1' }
    }

    if (num > 10000) {
      return { valid: false, error: 'Quantity cannot exceed 10,000' }
    }

    return { valid: true }
  }

  const validateOrderNotes = (notes: string): { valid: boolean; error?: string } => {
    if (notes === null || notes === undefined) {
      return { valid: true } // Optional field
    }

    if (typeof notes !== 'string') {
      return { valid: false, error: 'Notes must be text' }
    }

    if (notes.trim().length > 1000) {
      return { valid: false, error: 'Notes must be less than 1000 characters' }
    }

    return { valid: true }
  }

  return {
    validateClientName,
    validateFlowerName,
    validateQuantity,
    validateOrderNotes,
  }
}
```

### Step 2: Update stores/orders.ts
**File:** [stores/orders.ts](stores/orders.ts#L90-L105)

```typescript
// Add to imports:
import { useValidation } from '~/composables/useValidation'

export const useOrdersStore = defineStore('orders', () => {
  const client = useSupabaseClient<any>()
  const { validateClientName, validateFlowerName, validateQuantity } = useValidation()

  // ... existing code ...

  // Update createOrder function:
  async function createOrder(sessionId: string, clientName: string): Promise<Order | null> {
    // ADD VALIDATION
    const validation = validateClientName(clientName)
    if (!validation.valid) {
      console.error(validation.error)
      return null
    }

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
      order_notes: '',
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

  // Update addFlowerItem function:
  async function addFlowerItem(orderId: string, name: string, quantity: number): Promise<FlowerItem | null> {
    // ADD VALIDATION
    const nameValidation = validateFlowerName(name)
    if (!nameValidation.valid) {
      console.error(nameValidation.error)
      return null
    }

    const qtyValidation = validateQuantity(quantity)
    if (!qtyValidation.valid) {
      console.error(qtyValidation.error)
      return null
    }

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
})
```

---

## ⏱️ Fix #5: Add Rate Limiting

### Step 1: Create Rate Limit Composable
**File:** Create `composables/useRateLimit.ts`

```typescript
// composables/useRateLimit.ts

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

const rateLimitStore = new Map<string, number[]>()

export function useRateLimit(defaultConfig?: RateLimitConfig) {
  const config = {
    maxRequests: defaultConfig?.maxRequests ?? 10,
    windowMs: defaultConfig?.windowMs ?? 60000, // 1 minute
  }

  const check = (key: string): { allowed: boolean; remaining: number; resetIn: number } => {
    const now = Date.now()
    const timestamps = rateLimitStore.get(key) ?? []
    
    // Remove old timestamps outside window
    const recentTimestamps = timestamps.filter(t => now - t < config.windowMs)
    
    const allowed = recentTimestamps.length < config.maxRequests
    
    if (allowed) {
      recentTimestamps.push(now)
    }
    
    rateLimitStore.set(key, recentTimestamps)
    
    const oldestTimestamp = recentTimestamps[0] ?? now
    const resetIn = Math.max(0, oldestTimestamp + config.windowMs - now)
    const remaining = Math.max(0, config.maxRequests - recentTimestamps.length)
    
    return { allowed, remaining, resetIn }
  }

  const reset = (key: string) => {
    rateLimitStore.delete(key)
  }

  return { check, reset }
}
```

### Step 2: Update stores/orders.ts
**File:** [stores/orders.ts](stores/orders.ts#L90-L105)

```typescript
// Add to imports:
import { useRateLimit } from '~/composables/useRateLimit'

export const useOrdersStore = defineStore('orders', () => {
  const client = useSupabaseClient<any>()
  const { check: checkRateLimit } = useRateLimit({ maxRequests: 20, windowMs: 60000 }) // 20 per minute

  // ... existing code ...

  async function createOrder(sessionId: string, clientName: string): Promise<Order | null> {
    // ADD RATE LIMITING
    const userKey = `createOrder:${sessionId}`
    const limiter = checkRateLimit(userKey)
    
    if (!limiter.allowed) {
      console.error(`Rate limit exceeded. Try again in ${Math.ceil(limiter.resetIn / 1000)}s`)
      return null
    }

    // ... rest of function
  }

  async function addFlowerItem(orderId: string, name: string, quantity: number): Promise<FlowerItem | null> {
    // ADD RATE LIMITING
    const userKey = `addFlowerItem:${orderId}`
    const limiter = checkRateLimit(userKey)
    
    if (!limiter.allowed) {
      console.error(`Too many changes. Please wait.`)
      return null
    }

    // ... rest of function
  }
})
```

---

## 🧪 Testing the Fixes

### Test Data Isolation
```bash
# 1. Log in as admin
# 2. Create a session
# 3. Note the session_id
# 4. In browser console:
fetch('https://YOUR-PROJECT.supabase.co/rest/v1/sessions?id=eq.<session_id>', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
}).then(r => r.json())
# Should work - you own this session

# 5. Try with a different session_id you don't own:
# Should return empty or 404
```

### Test Rate Limiting
```bash
# Test creating multiple orders rapidly
for i in {1..30}; do
  curl -X POST http://localhost:3000/api/orders \
    -H "Content-Type: application/json" \
    -d '{"sessionId":"...", "clientName":"Test '$i'"}'
done
# After 20 requests, should start returning rate limit errors
```

### Test CSP Headers
1. Open DevTools (F12)
2. Go to Console
3. Paste: `console.log(document.currentScript?.getAttribute('nonce'))`
4. Try to inject script:
```javascript
const script = document.createElement('script');
script.textContent = 'alert("XSS")';
document.body.appendChild(script);
// Should be blocked by CSP
```

---

## Implementation Priority

**Do First (Today):**
- [ ] Change admin password
- [ ] Add nitro headers to nuxt.config.ts
- [ ] Test CSP headers are working

**Do This Week:**
- [ ] Add user_id columns to database
- [ ] Update RLS policies
- [ ] Create validation composable
- [ ] Add rate limiting

**Do This Sprint:**
- [ ] Remove Seed.sql credentials from Git history
- [ ] Add audit logging
- [ ] Update error handling

---

## Verification Checklist

After implementing these fixes:

- [ ] CSP headers appear in network requests
- [ ] Can still log in and create orders
- [ ] Rate limiting triggers after 20 requests/minute
- [ ] Input validation rejects invalid characters
- [ ] User can only see their own data
- [ ] Supabase RLS policies return errors for unauthorized access
- [ ] Console errors don't leak sensitive info
