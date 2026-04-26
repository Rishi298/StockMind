# Angel One Integration - Quick Start

## What's Ready ✓

- ✅ OAuth callback handler (`/api/auth/callback`)
- ✅ Login initiator (`/api/auth/login`)
- ✅ Angel One SmartAPI wrapper (`lib/angelone.ts`)
- ✅ Auth status component (`components/AuthStatus.tsx`)
- ✅ Environment config template (`.env.local`)

## What You Need To Do

### 1. Get Angel One Credentials

1. Log into Angel One broker account
2. Go to **API & Integration** → **My Apps**
3. Click **Add New App**
4. Enter:
   - **App Name**: StockMind Terminal
   - **Redirect URL**: `https://overfull-disaster-calorie.ngrok-free.dev/api/auth/callback`
   - Select **quote** and **historical** permissions

5. Angel One will show you:
   - Client ID (save this)
   - Client Secret (save this)

### 2. Configure Environment

Edit `.env.local`:

```env
NEXT_PUBLIC_ANGEL_ONE_CLIENT_ID=abc123xyz...
ANGEL_ONE_CLIENT_SECRET=def456uvw...
NEXT_PUBLIC_APP_URL=https://overfull-disaster-calorie.ngrok-free.dev
```

### 3. Start ngrok (keep running)

```bash
npx ngrok http 3000
```

### 4. Run Dev Server

```bash
npm run dev
```

### 5. Test

Visit: `http://localhost:3000`

Click **Connect Angel One** button → authenticate → redirects to /screener

## Important Notes

- **Free ngrok URLs rotate on restart** → Update Angel One console with new URL each time
- **Alternative**: Use ngrok static domain (paid plan) for permanent URL
- **Current State**: Yahoo Finance still works as fallback, Angel One will supplement
- **Redirect URL must be exact** - include `/api/auth/callback`

## Files Created

```
app/api/auth/login/route.ts         → OAuth initiator
app/api/auth/callback/route.ts      → Token exchange & storage
lib/angelone.ts                     → SmartAPI wrapper
components/AuthStatus.tsx           → Login button component
.env.local                          → Credentials config
```

## Next Phase (Optional)

After credentials are working:
- Switch API routes to use `angelone.ts` instead of `yahoo.ts`
- Update lib/universe.ts with Angel One exchange tokens
- Update screener to use Angel One batch quote API for faster loads

---

**Status**: Ready for Angel One credentials. Once you have them, update `.env.local` and restart dev server.
