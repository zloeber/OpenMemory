# API Key Authentication Support - Changes Summary

## Overview

Added support for API key authentication to the test suite. Tests now automatically detect and use API keys when the OpenMemory server requires authentication.

## Changes Made

### 1. Test File Updates (`api-endpoints.test.ts`)

#### Added API Key Configuration
```typescript
const API_KEY = process.env.OM_API_KEY || process.env.OPENMEMORY_API_KEY || env.api_key || "";
```

Tests now check for API key in this order:
1. `OM_API_KEY` environment variable
2. `OPENMEMORY_API_KEY` environment variable  
3. `env.api_key` from server config
4. Empty string (no auth) as fallback

#### Added Helper Function
```typescript
function getHeaders(contentType: string = "application/json"): Record<string, string> {
    const headers: Record<string, string> = {
        "Content-Type": contentType
    };
    if (API_KEY) {
        headers["x-api-key"] = API_KEY;
    }
    return headers;
}
```

This helper:
- Creates standard HTTP headers
- Automatically includes `x-api-key` header if API key is set
- Used by all test requests

#### Updated All HTTP Requests

**Before:**
```typescript
const response = await fetch(`${API_URL}/memory/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ... })
});
```

**After:**
```typescript
const response = await fetch(`${API_URL}/memory/add`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ ... })
});
```

All 39+ test functions updated to use `getHeaders()`.

#### Added API Key Status Display

Test output now shows:
```
🧪 OpenMemory API Endpoint Tests
==================================================
Test namespace: test-1234567890
Second namespace: test-alt-1234567890
API Key: ✓ Configured

🔍 Checking if server is ready...
```

Or if not set:
```
API Key: ✗ Not set (using OM_API_KEY or OPENMEMORY_API_KEY)
```

### 2. Documentation Updates

#### QUICKSTART.md
- Added "API Key Authentication" section
- Updated "Run Tests" to include API key setup step
- Shows both environment variable options

#### README.md  
- Added "API Authentication" section
- Explains how to set API key
- Shows authentication error example
- Lists the priority order for API key detection

#### TROUBLESHOOTING.md
- **NEW:** Added 401 authentication errors as first troubleshooting item
- Shows multiple ways to set API key
- Explains how to test API key manually with curl
- Added API key to Environment Variables Checklist
- Added API key to Quick Fixes Summary table
- Added API key to Test Environment Template

## How to Use

### Running Tests with Authentication

```bash
# Option 1: Export to shell
export OM_API_KEY="your-api-key-here"
npm test

# Option 2: Alternative environment variable
export OPENMEMORY_API_KEY="your-api-key-here"
npm test

# Option 3: Inline
OM_API_KEY="your-api-key-here" npm test
```

### Running Tests without Authentication

If server doesn't require authentication:
```bash
npm test
```

Tests will work with or without API key - it's automatically detected.

## Testing the Changes

### With Authentication Required

1. **Start server with API key:**
   ```bash
   cd backend
   OM_API_KEY="test-key-123" npm run dev
   ```

2. **Run tests with matching API key:**
   ```bash
   OM_API_KEY="test-key-123" npm test
   ```

3. **Expected output:**
   ```
   API Key: ✓ Configured
   ✓ GET /health
   ✓ GET /sectors
   ✓ POST /memory/add
   ...
   ✅ Passed: 39/39
   ```

### Without Authentication

1. **Start server without API key:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Run tests:**
   ```bash
   npm test
   ```

3. **Expected output:**
   ```
   API Key: ✗ Not set (using OM_API_KEY or OPENMEMORY_API_KEY)
   ✓ GET /health
   ✓ GET /sectors
   ✓ POST /memory/add
   ...
   ✅ Passed: 39/39
   ```

## Backward Compatibility

✅ **Fully backward compatible**
- Tests work with or without API key
- No breaking changes to test execution
- Existing test scripts continue to work
- API key is optional unless server requires it

## Error Messages

### Before (without API key when required):
```
❌ POST /memory/add: Memory add failed: 401 - {"error":"authentication_required","message":"API key required"}
```

### After (with API key):
```
✓ POST /memory/add
```

## Files Modified

1. **backend/tests/api-endpoints.test.ts**
   - Added API_KEY constant
   - Added getHeaders() helper function
   - Updated 39+ test functions to use getHeaders()
   - Added API key status to test output

2. **backend/tests/QUICKSTART.md**
   - Added API Key Authentication section
   - Updated Run Tests instructions

3. **backend/tests/README.md**
   - Added API Authentication section
   - Added usage examples
   - Added error example

4. **backend/tests/TROUBLESHOOTING.md**
   - Added 401 authentication errors section (first item)
   - Updated environment variables checklist
   - Updated quick fixes table
   - Updated test environment template

## Configuration Priority

API key is detected in this order:

1. **OM_API_KEY** environment variable (primary)
2. **OPENMEMORY_API_KEY** environment variable (alternative)
3. **env.api_key** from server config (fallback)
4. **Empty string** (no authentication)

This allows flexibility in how API keys are provided.

## Benefits

✅ **Automatic detection** - No code changes needed, just set env var  
✅ **Multiple sources** - Supports two environment variable names  
✅ **Clear status** - Shows API key status when tests start  
✅ **Better errors** - Authentication errors now documented  
✅ **Flexible** - Works with or without authentication  
✅ **Consistent** - All requests use same header helper  

## Next Steps

1. Set your API key: `export OM_API_KEY="your-key"`
2. Run tests: `npm test`
3. All 39 tests should pass! 🎉

## Questions?

- See `QUICKSTART.md` for quick setup
- See `TROUBLESHOOTING.md` for authentication errors
- See `README.md` for detailed API authentication docs
