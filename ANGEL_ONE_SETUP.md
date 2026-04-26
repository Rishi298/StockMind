# Angel One SmartAPI Integration Guide

## Step 1: Register App in Angel One Console

1. Log into your Angel One broker account
2. Go to **API & Integration** → **My Apps**
3. Click **Add New App**
4. Fill in the form:
   - **App Name**: StockMind Terminal
   - **App Type**: Web App
   - **Redirect URL**: `https://overfull-disaster-calorie.ngrok-free.dev/api/auth/callback`
   - **Primary Static IP**: Leave blank or `0.0.0.0` (since ngrok IPs rotate)
   - **Permissions**: Select `quote` and `historical` data access

5. **IMPORTANT**: After registering, Angel One will generate:
   - **Client ID** (API Key)
   - **Client Secret**
   - Save these immediately

## Step 2: Configure Environment Variables

Edit `.env.local` with your credentials:

```env
# From Angel One App Registration
NEXT_PUBLIC_ANGEL_ONE_CLIENT_ID=your_client_id_here
ANGEL_ONE_CLIENT_SECRET=your_client_secret_here
ANGEL_ONE_API_TOKEN=your_auth_token_from_login
ANGEL_ONE_REDIRECT_URL=https://overfull-disaster-calorie.ngrok-free.dev/api/auth/callback
NEXT_PUBLIC_APP_URL=https://overfull-disaster-calerie.ngrok-free.dev
```

## Step 3: Start ngrok Tunnel

Keep ngrok running in one terminal:

```bash
npx ngrok http 3000
```

Make note of the forwarding HTTPS URL (e.g., `https://abc-123.ngrok-free.dev`)

## Step 4: Start Dev Server

In another terminal:

```bash
npm run dev
```

The app will be available at:
- Local: `http://localhost:3000`
- Public: `https://overfull-disaster-calorie.ngrok-free.dev`

## Step 5: Test Authentication Flow

1. Visit `https://overfull-disaster-calorie.ngrok-free.dev/api/auth/login`
2. You'll be redirected to Angel One login
3. After login, Angel One redirects to `/api/auth/callback` with auth code
4. The callback handler exchanges code for JWT token
5. Token is stored in secure HTTP-only cookie
6. You're redirected to `/screener`

## API Endpoints Supported

### Quote Data
- **GET** `/api/quote/[ticker]` - Live price quote

### Screener
- **GET** `/api/screener` - Bulk screener with all stocks

### Deep Dive Analysis
- **GET** `/api/analyze/[ticker]` - Full analysis with all 6 agents

## Troubleshooting

### "Redirect URL not allowed"
- Ensure the URL in `.env.local` matches Angel One console exactly
- Include the `/api/auth/callback` path

### "No authorization code received"
- Check that Angel One redirects to correct ngrok URL
- Verify Primary Static IP is set to `0.0.0.0`

### "Token exchange failed"
- Verify `ANGEL_ONE_CLIENT_SECRET` is correct
- Check Angel One API base URL in requests

### ngrok URL keeps changing
- Free ngrok tunnels get new URLs on restart
- Either use ngrok paid plan for fixed URL, or update Angel One console each time

## Next Steps

1. Get your Angel One Client ID and Secret
2. Update `.env.local` with credentials
3. Keep ngrok tunnel running
4. Run `npm run dev`
5. Test the /screener endpoint with live Angel One data
