# Phase 6 Critical Fixes

## Issue 1: AnalyzeButton Wrong Endpoint

**File:** `src/components/ai/AnalyzeButton.tsx`
**Line:** 34
**Severity:** CRITICAL

### Current Code:
```typescript
const handleAnalyze = async () => {
  setLoading(true)
  setShowModal(true)

  try {
    const response = await fetch('/api/ai/analyze', {  // WRONG ENDPOINT
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        analysisType: 'on-demand',
        ...(type === 'goal' ? { goalIds: [id] } : { journalEntryIds: [id] }),
      }),
    })
```

### Fixed Code:
```typescript
const handleAnalyze = async () => {
  setLoading(true)
  setShowModal(true)

  try {
    // Route to correct endpoint based on type
    const endpoint = type === 'goal'
      ? '/api/ai/analyze-goal'
      : '/api/ai/analyze-journal'

    // Also fix request body to match backend expectations
    const requestBody = type === 'goal'
      ? { goalId: id }
      : { journalId: id }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })
```

### Explanation:
- Backend has separate endpoints: `/api/ai/analyze-goal` and `/api/ai/analyze-journal`
- Backend expects `goalId` or `journalId` in request body (not `goalIds`/`journalEntryIds`)
- Need conditional routing based on the `type` prop

---

## Issue 2: Insights Page POST to GET-Only Route

**File:** `src/app/(dashboard)/insights/page.tsx`
**Line:** 93
**Severity:** CRITICAL

### Option A: Add POST Handler (Recommended)

Backend change - `src/app/api/ai/insights/route.ts`:

Add this handler before the existing GET export:

```typescript
/**
 * POST /api/ai/insights
 * Generate new weekly/monthly insights (called from UI generate button)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, data: null, error: { message: 'Unauthorized', status: 401 } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const timeline = (body.timeline ?? 'week') as 'week' | 'month';

    // Force refresh to generate new insights (ignore cache)
    const forceRefresh = true;

    // Call GET handler logic directly
    const getRequest = new NextRequest(
      new URL(`?timeline=${timeline}&refresh=true`, request.url),
      { method: 'GET' }
    );

    return GET(getRequest);
  } catch (error) {
    console.error('POST /api/ai/insights error:', error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
          status: 500,
        },
      },
      { status: 500 }
    );
  }
}
```

Frontend change - `src/app/(dashboard)/insights/page.tsx` (no change needed):
```typescript
// Line 93 stays as-is, now it will work:
const response = await fetch('/api/ai/insights', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    timeline: timeline === 'week' ? 'weekly' : 'monthly',
  }),
})
```

### Option B: Change to GET (Alternative)

Frontend change only:
```typescript
// Replace lines 89-101:
const handleGenerateInsights = async () => {
  setGenerating(true)

  try {
    const response = await fetch(`/api/ai/insights?timeline=${timeline}&refresh=true`, {
      method: 'GET',
    })
    // ... rest stays same
```

**Recommendation:** Use Option A (add POST) for better REST semantics - GET for fetching, POST for generating.

---

## Issue 3: Wrong Pagination Parameter

**File:** `src/app/(dashboard)/insights/page.tsx`
**Line:** 61
**Severity:** MEDIUM

### Current Code:
```typescript
const fetchAnalyses = useCallback(async () => {
  try {
    const response = await fetch('/api/ai/analyses?limit=10')  // WRONG PARAMETER
```

### Fixed Code:
```typescript
const fetchAnalyses = useCallback(async () => {
  try {
    const response = await fetch('/api/ai/analyses?page=1&pageSize=10')  // CORRECT PARAMETERS
```

### Explanation:
- Backend API uses `page` and `pageSize` query parameters
- `page` starts at 1 (not 0)
- `pageSize` has bounds: min 1, max 50
- `limit` parameter doesn't exist

---

## Issue 4: Add Request Timeout (Optional but Recommended)

**File:** `src/components/ai/AnalyzeButton.tsx`
**Severity:** MEDIUM

Add this helper function near the top:

```typescript
// Helper to add timeout to fetch requests
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 60000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

Update handleAnalyze to use it:

```typescript
const response = await fetchWithTimeout(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(requestBody),
}, 60000)  // 60 second timeout
```

Similar change for Insights page:

```typescript
const fetchInsights = useCallback(async () => {
  try {
    const response = await fetchWithTimeout(
      `/api/ai/insights?timeline=${timeline}`,
      { method: 'GET' },
      60000
    )
    // ... rest stays same
}, [timeline])
```

---

## Issue 5: Add Retry Mechanism (Optional but Recommended)

**File:** `src/components/ai/AnalyzeButton.tsx`
**Severity:** MEDIUM

Add error state to component:

```typescript
const [error, setError] = useState<string | null>(null)

const handleAnalyze = async () => {
  setLoading(true)
  setShowModal(true)
  setError(null)  // Clear previous error

  // ... rest of code, in catch block:

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to analyze. Please try again.'
    setError(errorMsg)  // Store error
    showToast(errorMsg, 'error')
    setShowModal(false)
  }
}

// Add retry handler:
const handleRetry = () => {
  setError(null)
  handleAnalyze()
}
```

Update modal to show retry button on error:

```typescript
{showModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    {/* ... backdrop ... */}
    <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl">
      {loading ? (
        <div className="p-6">
          <AnalysisLoadingState />
        </div>
      ) : error ? (
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Analysis Failed</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={handleRetry} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Retry
            </button>
            <button onClick={handleClose} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      ) : analysis ? (
        <AnalysisDisplay analysis={analysis} onClose={handleClose} />
      ) : null}
    </div>
  </div>
)}
```

---

## Summary of Changes

| File | Issue | Type | Fixes |
|------|-------|------|-------|
| AnalyzeButton.tsx | Wrong endpoint | CRITICAL | Add conditional routing |
| insights/route.ts | No POST handler | CRITICAL | Add POST handler |
| insights/page.tsx | Wrong parameter | MEDIUM | Fix pagination params |
| AnalyzeButton.tsx | No timeout | MEDIUM | Add fetchWithTimeout |
| AnalyzeButton.tsx | No retry | MEDIUM | Add retry button |

---

## Implementation Order

1. **First:** Fix critical issues (#1 and #2) - blocks all functionality
2. **Second:** Fix medium issues - improves UX
3. **Test:** Manually test all analyze flows
4. **Deploy:** After QA Round 2 verification

Estimated total time: 45-60 minutes including testing.
