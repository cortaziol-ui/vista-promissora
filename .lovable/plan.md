

## Plan: Fix White Screen with Auto-Reset of Corrupted Data

### Root Cause

The white screen happens because corrupted data in `localStorage` causes runtime crashes. Specifically:

1. **`SalesPage.tsx` line 34**: `c.data.split('/')` crashes if `c.data` is undefined (no optional chaining like the context has)
2. **`loadFromStorage`**: Only checks `Array.isArray` but does not validate individual client objects — a single malformed record crashes the entire app
3. **No Error Boundary**: When any page crashes, the entire React tree unmounts to white

### Changes

**1. `src/contexts/SalesDataContext.tsx`** — Harden `loadFromStorage`
- Add a `validateCliente` function that checks each object has required fields (`data`, `nome`, `entrada`, `parcela1`, `parcela2`)
- If ANY item fails validation, discard the entire localStorage cache and fall back to defaults (auto-reset)
- Add a version key (`salesData_v2`) so old corrupted data from previous format is automatically ignored

**2. `src/pages/SalesPage.tsx`** — Add safe access
- Line 34: `c.data.split('/')` → `(c.data || '').split('/')`
- Same for line 43

**3. `src/App.tsx`** — Add global Error Boundary
- Create a class-based `ErrorBoundary` component that catches render errors
- On error: auto-clear all `salesData_*` keys from localStorage, show a brief message, then reload the page
- This is the ultimate safety net — if anything else crashes, the app self-heals

**4. `src/pages/FinancialPage.tsx`** — No changes needed (already uses safe access via context)

### Result
- App will never show a white screen again
- If data is corrupted, it silently resets to the 40 default clients
- User does not need to manually clear localStorage

