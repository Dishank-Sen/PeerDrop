# Upstash Redis Connection Fix

## Problem
When deploying to Render with Upstash Redis, you get:
```
TypeError: Invalid protocol
```

## Root Cause
Upstash Redis uses `rediss://` protocol (secure Redis) which requires TLS configuration in the node-redis client.

## Solution Applied
Updated `/backend/src/connect/redis.ts` to detect and configure TLS for secure Redis connections:

```typescript
const isSecureRedis = REDIS_URL.startsWith("rediss://");

export const redis = createClient({
    url: REDIS_URL,
    socket: isSecureRedis ? {
        tls: true,
        rejectUnauthorized: false // Upstash requires this
    } : undefined
});
```

## How to Deploy on Render + Upstash

### 1. Create Upstash Redis Database
1. Go to [upstash.com](https://upstash.com)
2. Sign up (free tier available)
3. Click **"Create Database"**
4. Choose a name and region
5. **Copy the connection string** from dashboard

### 2. Format the Redis URL Correctly

Upstash shows multiple connection formats. You need the **Redis URL** (not REST API):

✅ **Correct format:**
```
rediss://default:AbCdEfGhIjKlMnOpQrStUvWxYz1234567890@us1-merry-camel-12345.upstash.io:6379
```

❌ **Wrong format (REST API):**
```
https://us1-merry-camel-12345.upstash.io
```

**Where to find it:**
- Dashboard → Your Database → "Redis Connect" tab
- Look for the string starting with `rediss://`

### 3. Deploy on Render

1. Go to [render.com](https://render.com)
2. Create **New Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name:** peerdrop-backend
   - **Root Directory:** `backend`
   - **Environment:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`

5. **Environment Variables:**
   ```
   REDIS_URL=rediss://default:your-password@your-region.upstash.io:6379
   NODE_ENV=production
   ```

6. Click **"Create Web Service"**

### 4. Verify Deployment

Once deployed, check logs for:
```
✅ Redis connected to rediss://default:****@your-region.upstash.io:6379
Server running on port 10000
```

### 5. Update Frontend

Get your Render backend URL (e.g., `https://peerdrop-backend.onrender.com`)

```bash
cd frontend
echo "VITE_WS_URL=wss://peerdrop-backend.onrender.com/ws" > .env.production
npm run build
```

Deploy frontend to Vercel/Netlify with this environment variable.

## Testing the Fix Locally

To test with Upstash locally:

```bash
cd backend
export REDIS_URL="rediss://default:password@region.upstash.io:6379"
npm run dev
```

You should see:
```
✅ Redis connected to rediss://default:****@region.upstash.io:6379
```

## Common Issues

### Issue: "Connection timeout"
- **Cause:** Upstash database is sleeping (free tier)
- **Solution:** Wait 30 seconds for cold start, then retry

### Issue: "Authentication failed"
- **Cause:** Wrong password in connection string
- **Solution:** Copy the full `rediss://` URL from Upstash dashboard

### Issue: "ENOTFOUND"
- **Cause:** Wrong host/region in URL
- **Solution:** Double-check the URL from Upstash dashboard

## Alternative: Local Redis

If you want to test without Upstash:

```bash
# Install Redis locally
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis

# Then use local URL
export REDIS_URL="redis://localhost:6379"
```

## Cost

**Upstash Free Tier:**
- 10,000 commands per day
- 256 MB storage
- Perfect for development and small projects

**Render Free Tier:**
- 750 hours/month (enough for 1 service)
- Sleeps after 15 minutes of inactivity
- Cold starts take ~30 seconds

## Need Help?

Check:
1. Render logs: Dashboard → Logs tab
2. Test Redis connection: Use Redis CLI or Upstash dashboard
3. Backend health: `curl https://your-app.onrender.com/health`

## Deployment Complete! 🚀

Your backend is now configured to work with Upstash Redis on Render.
