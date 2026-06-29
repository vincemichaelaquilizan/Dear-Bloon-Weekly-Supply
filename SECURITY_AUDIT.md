# Security Audit Report — Dear Bloom Flower App
**Date:** 2026-06-29  
**Severity Levels:** 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

---

## Executive Summary
This Nuxt.js/Vue 3 application demonstrates solid foundational security practices with Supabase RLS and parameterized queries. However, **3 critical issues** and several medium-risk vulnerabilities were identified that require immediate attention.

---

## 🔴 CRITICAL VULNERABILITIES

### 1. **Hardcoded Credentials in Seed.sql**
**File:** [Seed.sql](Seed.sql#L10-L11)  
**Risk:** Credential exposure, unauthorized access  
**Issue:** Default admin password is stored in plain text in the repository:
```sql
-- Creates the default admin account:
--   Email:    dearbloom.admin@dearbloom.com
--   Password: DearBloom_Admin2026!
```

**Impact:** 
- Credentials visible in Git history forever
- Anyone with repo access can log in as admin
- No way to revoke/rotate without code change

**Fix:**
```bash
# 1. IMMEDIATE: Change password in Supabase Dashboard
# 2. Remove/redact credentials from repository
# 3. Use environment variables or Supabase CLI for seeding
# 4. Consider using Magic Links instead of passwords
# 5. Run: git filter-repo to remove from history (risky but necessary)
```

**Recommended Approach:**
```sql
-- Seed.sql (REMOVE PASSWORD - use Supabase dashboard or CLI instead)
-- Alternate: Use a .env file (git-ignored)
```

---

### 2. **No Data Isolation Between Users**
**Files:** [Schema.sql](Schema.sql#L27-L31), [stores/orders.ts](stores/orders.ts#L28-L39)  
**Risk:** Unauthorized data access, data leakage  
**Issue:** RLS policies only check if user is authenticated, not which user owns the data:
```sql
-- CURRENT (INSECURE):
create policy "Auth read sessions"
  on sessions for select
  using (auth.uid() is not null);  -- ❌ Any logged-in user can read ANY session
```

**Impact:**
- User A can view/edit User B's orders and sessions
- Single admin account masks this, but scales dangerously
- No data separation if multi-user is added later

**Fix:**
```sql
-- Add user_id column to sessions and orders tables
ALTER TABLE sessions ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE orders ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;

-- Updated RLS policies:
create policy "Users can only read own sessions"
  on sessions for select
  using (auth.uid() = user_id);

create policy "Users can only update own sessions"
  on sessions for update
  using (auth.uid() = user_id);

-- Repeat for all tables (orders, flowers - if per-user)
```

---

### 3. **Missing Content Security Policy (CSP) Headers**
**File:** [nuxt.config.ts](nuxt.config.ts)  
**Risk:** XSS attacks, clickjacking, data exfiltration  
**Issue:** No HTTP security headers configured

**Impact:**
- Script injection attacks possible
- Clickjacking/framing attacks
- External resource loading not restricted

**Fix:**
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  // ... existing config
  nitro: {
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co; frame-ancestors 'none';",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    }
  }
})
```

---

## 🟠 HIGH SEVERITY ISSUES

### 4. **Insufficient Input Validation**
**Files:** [pages/order/[id].vue](pages/order/[id].vue#L30-L40), [stores/flowers.ts](stores/flowers.ts#L42-L51)  
**Risk:** Data injection, unexpected behavior  
**Issue:** Minimal validation on user input fields

**Examples:**
- Client names: only `.trim()` applied
- Flower names: only `.trim()` and title case
- No max length checks
- No XSS payload detection
- No rate limiting on operations

**Fix:**
```typescript
// Create validation utilities
export const validateClientName = (name: string): string => {
  const sanitized = name.trim().slice(0, 100); // Max 100 chars
  if (!/^[a-zA-Z0-9\s\-,.&'()]+$/.test(sanitized)) {
    throw new Error('Invalid characters in client name');
  }
  return sanitized;
};

export const validateFlowerName = (name: string): string => {
  const sanitized = name.trim().slice(0, 50); // Max 50 chars
  if (!/^[a-zA-Z0-9\s\-,.&'()]+$/.test(sanitized)) {
    throw new Error('Invalid characters in flower name');
  }
  return sanitized;
};

export const validateNotes = (notes: string): string => {
  return notes.trim().slice(0, 1000); // Max 1000 chars
};

// Usage:
async function updateOrderName(id: string, clientName: string) {
  const validated = validateClientName(clientName);
  // proceed with validated data
}
```

---

### 5. **Insecure Session Storage**
**File:** [nuxt.config.ts](nuxt.config.ts#L11-L17)  
**Risk:** XSS leading to token theft, token persistence  
**Issue:** Auth tokens stored in localStorage with persistence enabled:
```typescript
storageKey: 'sb-auth',      // ❌ Accessible to JavaScript
persistSession: true,       // ❌ Persists even after browser close
```

**Impact:**
- Any XSS vulnerability leads to token theft
- Tokens stored indefinitely on client
- No ability to revoke session client-side

**Fix:**
```typescript
// nuxt.config.ts
supabase: {
  clientOptions: {
    auth: {
      persistSession: true,       // Keep if needed for UX
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Use secure httpOnly cookies instead (requires server middleware)
      storage: {
        getItem: (key) => localStorage.getItem(key),
        setItem: (key, value) => localStorage.setItem(key, value),
        removeItem: (key) => localStorage.removeItem(key),
      },
    },
  },
},

// Add server-side middleware to validate tokens
export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'sb-auth');
  if (!token) return;
  // Verify token signature and expiry
});
```

---

### 6. **No Rate Limiting**
**Files:** [stores/orders.ts](stores/orders.ts#L90-L105), [stores/flowers.ts](stores/flowers.ts#L31-L52)  
**Risk:** DoS attacks, brute force, spam  
**Issue:** No rate limiting on create/update/delete operations

**Impact:**
- Attacker can create 10,000 orders in seconds
- No protection against spam or abuse
- Supabase bill could spike unexpectedly

**Fix:**
```typescript
// composables/useRateLimit.ts
export function useRateLimit(key: string, limit: number = 5, window: number = 60000) {
  const store = new Map<string, number[]>();
  
  return {
    isAllowed: (): boolean => {
      const now = Date.now();
      const timestamps = store.get(key) ?? [];
      const recent = timestamps.filter(t => now - t < window);
      
      if (recent.length < limit) {
        recent.push(now);
        store.set(key, recent);
        return true;
      }
      return false;
    }
  };
}

// Usage in store:
async function createOrder(sessionId: string, clientName: string) {
  const limiter = useRateLimit(`order:${sessionId}`, 10, 60000); // 10 per minute
  if (!limiter.isAllowed()) {
    throw new Error('Too many requests. Please wait.');
  }
  // proceed
}
```

---

## 🟡 MEDIUM SEVERITY ISSUES

### 7. **No CORS Configuration**
**File:** [nuxt.config.ts](nuxt.config.ts)  
**Risk:** Cross-site request forgery, unauthorized API access  
**Issue:** No explicit CORS headers configured for API requests

**Fix:**
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  // ...
  nitro: {
    headers: {
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '3600',
    }
  }
})
```

---

### 8. **JSONB Type Allows Unexpected Fields**
**Files:** [Schema.sql](Schema.sql#L53), [stores/orders.ts](stores/orders.ts#L220-L228)  
**Risk:** Data injection, schema inconsistency  
**Issue:** `flower_items` stored as JSONB without schema validation:
```sql
flower_items     jsonb not null default '[]',  -- ❌ No type constraint
```

**Impact:**
- Malicious data could be injected directly into JSONB
- Schema inconsistency makes data unreliable

**Fix:**
```sql
-- Add CHECK constraint to validate JSONB structure
ALTER TABLE orders ADD CONSTRAINT valid_flower_items CHECK (
  flower_items @> '[]'::jsonb AND
  jsonb_typeof(flower_items) = 'array' AND
  (SELECT COUNT(*) FROM jsonb_array_elements(flower_items) WHERE NOT (
    elem->>'id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND
    elem->>'name' IS NOT NULL AND
    (elem->>'quantity')::int > 0
  )) = 0
);
```

---

### 9. **Verbose Console Errors**
**Files:** [stores/orders.ts](stores/orders.ts#L37-L40), [stores/flowers.ts](stores/flowers.ts#L20-L22)  
**Risk:** Information disclosure, error analysis  
**Issue:** Full error objects logged to console:
```typescript
catch (err) {
  console.error('Failed to load orders:', err)  // ❌ Logs full error object
}
```

**Impact:**
- Stack traces visible in browser DevTools
- Could leak system information
- Helps attackers understand architecture

**Fix:**
```typescript
// composables/useErrorHandler.ts
export function useErrorHandler() {
  return {
    handle: (error: any, context: string) => {
      // Log to secure logging service (Sentry, etc.)
      if (import.meta.client) {
        console.error(`${context}: An error occurred`); // Generic message
        // Send full error to secure logging
        // logToSentry(error);
      } else {
        console.error(error); // Safe to log on server
      }
    }
  };
}

// Usage:
catch (err) {
  useErrorHandler().handle(err, 'Failed to load orders');
}
```

---

### 10. **No Audit Logging**
**Files:** All store files  
**Risk:** Accountability, forensics, compliance  
**Issue:** No logging of who did what and when

**Fix:**
```sql
-- Add audit log table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add trigger to auto-log
CREATE FUNCTION log_audit() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, table_name, record_id, changes)
  VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(NEW));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_audit AFTER INSERT OR UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION log_audit();
CREATE TRIGGER sessions_audit AFTER INSERT OR UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION log_audit();
```

---

## 🟢 LOW SEVERITY / RECOMMENDATIONS

### 11. **Missing Environment Variable Validation**
- No validation that `SUPABASE_URL` and `SUPABASE_KEY` exist at runtime
- Add startup validation check

### 12. **No Password Policy**
- If multi-user is added, enforce strong passwords
- Implement minimum 12 characters, special characters, etc.

### 13. **Magic Link Authentication**
- Consider replacing password auth with Magic Links for better UX and security
- Easier to use, harder to compromise

### 14. **Database Backup Strategy**
- Ensure Supabase backups are enabled
- Test restore procedures

### 15. **Dependencies Audit**
Run periodic dependency security checks:
```bash
npm audit
npm outdated
```

---

## Security Checklist

- [ ] Change admin password immediately
- [ ] Remove credentials from Seed.sql and Git history
- [ ] Implement data isolation with user_id columns
- [ ] Add CSP and security headers
- [ ] Implement input validation utilities
- [ ] Add rate limiting
- [ ] Configure CORS properly
- [ ] Add JSONB constraints
- [ ] Implement error handler
- [ ] Add audit logging
- [ ] Review Supabase RLS policies with user_id
- [ ] Enable MFA for admin account
- [ ] Set up HTTPS/TLS (verify with Supabase)
- [ ] Regular security audits quarterly

---

## Testing Recommendations

```bash
# Run security tests
npm audit
npm audit --audit-level=moderate

# Test authentication
# - Try accessing routes without token
# - Try modifying other users' data (once multi-user exists)
# - Try XSS payloads: <script>alert('xss')</script>
# - Try SQL injection: "'; DROP TABLE sessions; --"

# Load testing for rate limiting
ab -n 1000 -c 10 http://localhost:3000/api/orders
```

---

## Timeline & Priority

**Immediate (Today):**
1. Change admin password
2. Update RLS policies with user_id (if multi-user planned)

**Short-term (This week):**
1. Add CSP headers
2. Remove credentials from repo
3. Implement input validation

**Medium-term (This sprint):**
1. Add rate limiting
2. Add audit logging
3. Improve error handling

**Long-term (Next quarter):**
1. Consider multi-user architecture
2. Implement audit log dashboard
3. Add automated security testing to CI/CD

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security](https://supabase.com/docs/guides/auth)
- [Vue Security Best Practices](https://vuejs.org/guide/best-practices/security.html)
- [CSP Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

**Report Generated:** 2026-06-29  
**Auditor:** GitHub Copilot Security Audit  
**Status:** ⚠️ Requires Immediate Action
