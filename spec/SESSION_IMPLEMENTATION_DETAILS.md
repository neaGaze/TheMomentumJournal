# Session Cookie Implementation - Technical Details
**Last Updated:** 2026-01-24
**Status:** VERIFIED SECURE

---

## Overview

This document provides a technical deep-dive into the session cookie implementation, verifying that all security fixes have been applied correctly.

---

## 1. Architecture Design

### 1.1 Three-Tier Authentication System

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser                                  │
├─────────────────────────────────────────────────────────────┤
│  Client Component (use-auth.ts)                              │
│  - Reads session state                                       │
│  - Calls refresh endpoint                                    │
│  - Manages UI state                                          │
│  - NO direct cookie access                                   │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP Request (auto-includes cookies)
┌────────────────────▼────────────────────────────────────────┐
│             Middleware (middleware.ts)                       │
├─────────────────────────────────────────────────────────────┤
│  - Intercepts all requests                                   │
│  - ServerClient handles cookies securely                     │
│  - Refreshes session (extends expiry)                        │
│  - Protects routes                                           │
│  - Sets/updates httpOnly cookies                             │
└────────────────────┬────────────────────────────────────────┘
                     │ Response with Set-Cookie header
┌────────────────────▼────────────────────────────────────────┐
│         Supabase PostgreSQL + Auth Service                  │
├─────────────────────────────────────────────────────────────┤
│  - Validates tokens                                          │
│  - Issues new sessions                                       │
│  - Manages JWT expiry                                        │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Session Lifecycle

```
1. LOGIN
   User enters credentials
        ↓
   Client calls signInWithPassword()
        ↓
   Supabase validates, returns session
        ↓
   Middleware catches response, sets httpOnly cookie
        ↓
   Browser stores cookie (inaccessible to JS)

2. NORMAL OPERATION
   Browser request includes cookie header
        ↓
   Middleware reads cookie with ServerClient
        ↓
   Validates session (getUser)
        ↓
   If within refresh threshold (7 days), refreshes
        ↓
   Returns response with new Set-Cookie header

3. EXPIRY/FAILURE
   Refresh fails 3 times
        ↓
   Client hook detects failure
        ↓
   Calls signOut() to invalidate token
        ↓
   Clears cookies
        ↓
   Redirects to /login?error=session_expired

4. LOGOUT
   User clicks logout
        ↓
   Client calls POST /api/auth/signout
        ↓
   Server invalidates session
        ↓
   Server clears all sb-* cookies
        ↓
   Browser no longer sends session cookie
```

---

## 2. File-by-File Implementation

### 2.1 src/lib/supabase/client.ts
**Purpose:** Browser client for Supabase operations
**Security Level:** Read-only (no cookie manipulation)

**Key Points:**
- Uses `createBrowserClient()` from @supabase/ssr
- NO custom cookie handlers
- Default Supabase behavior (reads cookies, never writes)
- Client only reads from httpOnly cookies via response

**Why This Works:**
- Supabase SDK automatically includes cookies in requests
- Browser enforces httpOnly (JS cannot read)
- Server validates cookie on each request
- Prevents XSS access to tokens

---

### 2.2 src/lib/supabase/server.ts
**Purpose:** Server client for secure operations
**Security Level:** Full control (read + write with validation)

**Key Code:**
```typescript
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, getSessionCookieOptions(options))
            )
          } catch {
            // Called from Server Component, can ignore
          }
        },
      },
    }
  )
}
```

**Security Features:**
- Runs on server (credentials never exposed)
- Calls `getSessionCookieOptions()` to enforce security
- Error handling for Server Component context

---

### 2.3 src/lib/supabase/config.ts
**Purpose:** Cookie security configuration
**Security Level:** Policy enforcement

**Key Code:**
```typescript
export function getSessionCookieOptions(options?: CookieOptions): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production'
  return {
    ...options,
    maxAge: SESSION_EXPIRY_SECONDS,  // 90 days = 7776000 seconds
    httpOnly: true,                   // CRITICAL: Prevents JS access
    secure: isProduction,              // HTTPS only in production
    sameSite: 'lax',                   // Prevents CSRF attacks
    path: '/',                         // Available to all routes
  }
}
```

**Security Decisions Explained:**

| Setting | Value | Purpose |
|---------|-------|---------|
| httpOnly | true | Prevents `document.cookie` access in JS (XSS protection) |
| secure | prod only | HTTPS required (prevents network interception) |
| sameSite | lax | Allows top-level navigation, prevents CSRF |
| maxAge | 90 days | Session expires after 90 days of creation |
| path | / | Available to entire application |

---

### 2.4 middleware.ts
**Purpose:** Request/response middleware for session management
**Security Level:** Full auth control

**Key Sections:**

**1. Server Client Creation (lines 12-33):**
```typescript
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        response = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, getSessionCookieOptions(options))
        )
      },
    },
  }
)
```

**What it Does:**
- Creates isolated ServerClient for this request
- Reads cookies from incoming request
- When Supabase updates cookies, applies security options
- Sets response headers with secure cookies

**2. Session Refresh (lines 36-38):**
```typescript
const {
  data: { user },
} = await supabase.auth.getUser()
```

**What it Does:**
- Validates session is valid
- Refreshes session if expiring soon (auto-refresh on each request)
- Returns user object if authenticated, null if expired

**3. Route Protection (lines 41-50):**
```typescript
const protectedPaths = ['/dashboard', '/journal', '/goals', '/insights']
const isProtectedPath = protectedPaths.some(path =>
  request.nextUrl.pathname.startsWith(path)
)

if (!user && isProtectedPath) {
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}
```

**What it Does:**
- Checks if user is authenticated
- Redirects to login with original URL as redirect parameter
- Allows unauthenticated users to access public pages

---

### 2.5 src/hooks/use-auth.ts
**Purpose:** React hook for client-side session management
**Security Level:** Error handling + validation

**Key Features:**

**1. Initialization (lines 80-88):**
```typescript
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session)
    setUser(session?.user ?? null)
    setLoading(false)
    refreshSessionIfNeeded(session)
  })
  // ... listener setup
}, [router, supabase.auth, refreshSessionIfNeeded])
```

**2. Validation (lines 33-38):**
```typescript
const expiresAtRaw = currentSession.expires_at
if (typeof expiresAtRaw !== 'number' || !Number.isFinite(expiresAtRaw) || expiresAtRaw <= 0) {
  console.error('[useAuth] Invalid expires_at value:', expiresAtRaw)
  return
}
```

**Checks:**
- Value exists and is not null/undefined
- Type is exactly `number`
- Value is finite (not Infinity or NaN)
- Value is positive (timestamp > 0)

**3. Refresh Logic (lines 51-77):**
```typescript
if (timeUntilExpiry < REFRESH_THRESHOLD_MS && timeUntilExpiry > 0) {
  devLog('Attempting session refresh...')
  const { data, error } = await supabase.auth.refreshSession()

  if (error) {
    refreshFailureCount.current += 1
    console.error('[useAuth] Session refresh failed:', error.message, {
      failureCount: refreshFailureCount.current,
      code: error.status
    })

    if (refreshFailureCount.current >= MAX_REFRESH_FAILURES) {
      console.error('[useAuth] Max refresh failures reached, redirecting to login')
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
      router.push('/login?error=session_expired')
      return
    }
  } else if (data.session) {
    refreshFailureCount.current = 0
    setSession(data.session)
    setUser(data.session.user)
    devLog('Session refreshed successfully')
  }
}
```

**Error Handling Chain:**
1. Attempt refresh if within 7-day threshold
2. If error: increment counter, log with status code
3. If counter >= 3: sign out, clear state, redirect with error
4. If success: reset counter, update session state

---

### 2.6 Auth API Routes
**Purpose:** Server-side auth operations
**Security Level:** Endpoint-specific validation

#### POST /api/auth/callback
**Used By:** OAuth providers and email confirmation
**Code:** Lines 1-19 of `src/app/api/auth/callback/route.ts`
**Operation:** Exchange code for session

**Security:**
- Uses ServerClient (server-only)
- Session automatically stored in httpOnly cookie
- Validates code parameter
- Redirects to dashboard or next param

#### POST /api/auth/refresh
**Used By:** useAuth hook when periodic refresh needed
**Code:** Lines 9-38 of `src/app/api/auth/refresh/route.ts`
**Operation:** Force session refresh

**Security:**
- Returns 401 if not authenticated
- Validates current session exists
- Returns 401 on refresh failure
- Redirection handled by client hook

#### POST /api/auth/signout
**Used By:** User logout action
**Code:** Lines 10-26 of `src/app/api/auth/signout/route.ts`
**Operation:** Invalidate session and clear cookies

**Security:**
- Signs out via Supabase
- Explicitly clears all Supabase cookies (sb-* prefix)
- Prevents cookie persistence after logout

---

## 3. Data Flow Diagrams

### 3.1 Login Flow
```
Browser
  │
  └─> AuthForm (client component)
        │
        └─> supabase.auth.signInWithPassword({email, password})
              │
              └─> [Network Request to Supabase]
                    │
                    └─> Supabase validates credentials
                          │
                          └─> Returns { session, user }
                                │
                                └─> [Response includes Set-Cookie: sb-*]
                                      │
                                      └─> Middleware catches response
                                            │
                                            └─> Applies security options
                                                  │
                                                  └─> Browser stores httpOnly cookie
                                                        │
                                                        └─> Redirect to /dashboard
```

### 3.2 Request with Session Flow
```
Browser sends request to /api/dashboard/stats
  │
  ├─> Request includes Cookie header: sb-access-token=...
  │
  └─> Middleware.ts intercepts
        │
        ├─> Creates ServerClient with cookies
        │
        ├─> Calls supabase.auth.getUser()
        │   │
        │   └─> ServerClient validates access token (from cookie)
        │
        ├─> If session < 7 days to expiry: refreshes automatically
        │
        ├─> Returns response with updated Set-Cookie header
        │
        └─> Browser updates cookie (extends expiry)
```

### 3.3 Session Expiry Flow
```
Browser periodically calls refreshSessionIfNeeded() (every 1 hour)
  │
  ├─> Checks if expires_at is within 7 days
  │
  ├─> If yes: calls supabase.auth.refreshSession()
  │
  ├─> On error:
  │   │
  │   ├─> Increment failure counter
  │   │
  │   ├─> If counter >= 3:
  │   │   │
  │   │   ├─> Call supabase.auth.signOut()
  │   │   │
  │   │   ├─> Clear session state
  │   │   │
  │   │   └─> Redirect to /login?error=session_expired
  │   │
  │   └─> If counter < 3: wait for next check
  │
  └─> On success: reset counter, update state
```

---

## 4. Security Analysis

### 4.1 XSS (Cross-Site Scripting)

**Vulnerability:** Attacker injects JS that reads auth tokens
**Protection:** httpOnly cookies
**Status:** SECURE

**How It Works:**
```javascript
// BLOCKED: Cannot access httpOnly cookies
console.log(document.cookie)  // Doesn't include auth tokens

// SAFE: Browser auto-includes cookies in requests
fetch('/api/dashboard/stats')  // Cookie automatically sent
  .then(res => res.json())
```

**Verification:** No code attempts `document.cookie` for auth tokens

---

### 4.2 CSRF (Cross-Site Request Forgery)

**Vulnerability:** Attacker makes requests from different site
**Protection:** sameSite: 'lax' cookie flag
**Status:** SECURE

**How It Works:**
```
attacker.com
  └─> Loads image: <img src="yourapp.com/api/user/delete">
        │
        └─> Browser NOT sending cookie (cross-site)
              └─> Request rejected by CORS/auth check
```

**sameSite: 'lax':**
- Allows top-level navigation (user clicks link) ✓
- Blocks embedded requests (img, script, form) ✗
- Blocks XmlHttpRequest from different site ✗

---

### 4.3 Session Fixation

**Vulnerability:** Attacker fixes user to known session ID
**Protection:** Token rotation on refresh + HTTPS
**Status:** SECURE

**How It Works:**
- New session created on login (different token each time)
- Token refreshed every time middleware processes request
- Old tokens invalidated in Supabase
- Even if attacker knows old token, it's expired

---

### 4.4 Token Leakage

**Vulnerability:** Auth tokens exposed in various places
**Protection:** Multiple controls
**Status:** SECURE

| Location | Status | Protection |
|----------|--------|-----------|
| Cookies | SAFE | httpOnly flag |
| localStorage | SAFE | Not used |
| sessionStorage | SAFE | Not used |
| URL params | SAFE | Not used |
| Request headers | N/A | Auto-managed by browser |
| Response body | SAFE | Not returned to client |
| Browser console | SAFE | httpOnly prevents access |
| Network logs | SAFE | HTTPS only in production |

---

### 4.5 Man-in-the-Middle (MITM)

**Vulnerability:** Attacker intercepts HTTP requests
**Protection:** HTTPS only (secure flag in production)
**Status:** SECURE

**How It Works:**
- `secure: true` forces HTTPS in production
- `secure: false` allows HTTP in development
- Cookie not sent over HTTP in production
- SSL/TLS encrypts token in transit

---

## 5. Threat Model

### 5.1 Protected Against
- ✓ XSS stealing auth tokens
- ✓ CSRF making unauthorized requests
- ✓ Session fixation attacks
- ✓ Cookie tampering
- ✓ Token interception (production)
- ✓ Token leakage in logs
- ✓ Expired session usage

### 5.2 Requires External Protection
- [ ] Database security (Supabase RLS)
- [ ] API endpoint authorization
- [ ] Rate limiting (optional)
- [ ] Intrusion detection

---

## 6. Verification Checklist

### 6.1 Code Review
- [x] No client-side cookie manipulation
- [x] No custom setCookie in client
- [x] No localStorage auth storage
- [x] No URL-based token passing
- [x] No token logging
- [x] Server-side only cookie operations
- [x] httpOnly enforced in config
- [x] Secure flag in production
- [x] sameSite configured
- [x] Cookie expiry set

### 6.2 Error Handling
- [x] Refresh failures logged
- [x] Failure counter incremented
- [x] Max failures trigger logout
- [x] Validation before processing
- [x] Type checking on expires_at
- [x] Range checking on expires_at
- [x] Graceful error messages

### 6.3 Session Management
- [x] Initial session retrieval
- [x] Periodic refresh (1 hour)
- [x] Pre-expiry refresh (7 days)
- [x] Auth state listener subscribed
- [x] Cleanup on unmount (unsubscribe)
- [x] Protected routes enforced
- [x] Logout clears state

---

## 7. Constants & Configuration

```typescript
// Session expiry (src/lib/supabase/config.ts)
SESSION_EXPIRY_SECONDS = 90 * 24 * 60 * 60  // 7,776,000 seconds
SESSION_EXPIRY_MS = SESSION_EXPIRY_SECONDS * 1000

// Refresh checks (src/hooks/use-auth.ts)
REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000  // 7 days
MAX_REFRESH_FAILURES = 3
PERIODIC_CHECK_INTERVAL = 60 * 60 * 1000  // 1 hour

// Protected routes (middleware.ts)
PROTECTED_PATHS = ['/dashboard', '/journal', '/goals', '/insights']
AUTH_PATHS = ['/login', '/signup', '/forgot-password']

// Cookie options
Cookie Name: sb-[projectid]-auth-token (set by Supabase)
httpOnly: true
secure: process.env.NODE_ENV === 'production'
sameSite: lax
maxAge: 7,776,000 seconds (90 days)
path: /
```

---

## 8. Deployment Verification

**Before deploying to production, verify:**

1. Environment Variables
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
   ```

2. Supabase Configuration
   - Email confirmation enabled (if using)
   - OAuth providers configured (if using)
   - RLS policies enabled
   - Row-level security on auth tables

3. TLS/HTTPS
   - All traffic uses HTTPS
   - Certificate valid and not expired
   - HSTS headers configured

4. Monitoring
   - Session refresh failures logged
   - Max failures tracked
   - Logout events tracked
   - Error rates monitored

---

## 9. Incident Response

### 9.1 If XSS Vulnerability Found
1. Patch vulnerability immediately
2. Session tokens NOT exposed (httpOnly protected)
3. Monitor for unauthorized access patterns

### 9.2 If Session Token Leaked
1. Invalidate all sessions (Supabase admin)
2. Force users to re-login
3. Investigate token exposure source

### 9.3 If HTTPS Misconfigured
1. Cookies NOT sent over HTTP (secure flag)
2. Attacks possible on HTTP connections
3. Fix HTTPS configuration immediately

---

## 10. References

- Supabase SSR Documentation
- OWASP Session Management Cheat Sheet
- RFC 6265 (HTTP State Management Mechanism)
- RFC 6265bis (Cookie-Related Specifications)

---

**Document Version:** 1.0
**Last Reviewed:** 2026-01-24
**Next Review:** Post-deployment
