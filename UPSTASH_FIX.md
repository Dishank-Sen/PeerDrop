# Upstash Redis Connection Fix

## Problems Fixed

### 1. TypeError: Invalid protocol
**Cause:** Upstash Redis uses `rediss://` protocol (secure Redis) which requires TLS configuration.

### 2. SocketClosedUnexpectedlyError: Socket closed unexpectedly
**Cause:** Improper TLS configuration or missing reconnection strategy.

## Solution Applied
Updated `/backend/src/connect/redis.ts` with proper TLS configuration and reconnection strategy:

```typescript
const isSecureRedis = REDIS_URL.startsWith("rediss://");

const reconnectStrategy = (retries: number) => {
    if (retries > 10) {
        return new Error('Max reconnection attempts reached');
    }
    return Math.min(retries * 100, 3000); // Exponential backoff
};

export const redis = createClient({
    url: REDIS_URL,
    socket: isSecureRedis ? {
        tls: true,
        rejectUnauthorized: true, // Proper certificate validation
        reconnectStrategy
    } : {
        reconnectStrategy
    }
});
```

**Key improvements:**
- ✅ Proper TLS configuration with certificate validation
- ✅ Automatic reconnection with exponential backoff
- ✅ Handles both `redis://` (local) and `rediss://` (Upstash) URLs

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

### Issue: "SocketClosedUnexpectedlyError"
- **Cause:** Missing TLS configuration or reconnection strategy
- **Solution:** Use the updated `redis.ts` with proper TLS settings (already fixed in this repo)

### Issue: "TypeError: Invalid protocol"
- **Cause:** Missing TLS configuration for `rediss://` URLs
- **Solution:** Already fixed - the code now auto-detects and configures TLS

### Issue: "Connection timeout"
- **Cause:** Upstash database is sleeping (free tier) or wrong URL
- **Solution:** Wait 30 seconds for cold start, verify the URL format

### Issue: "Authentication failed"
- **Cause:** Wrong password in connection string
- **Solution:** Copy the full `rediss://` URL from Upstash dashboard

### Issue: "ENOTFOUND"
- **Cause:** Wrong host/region in URL
- **Solution:** Double-check the URL from Upstash dashboard

### Issue: "Max reconnection attempts reached"
- **Cause:** Redis server is unreachable or credentials are wrong
- **Solution:** 
  1. Verify REDIS_URL is correct
  2. Test connection from Upstash dashboard
  3. Check Render logs for specific error messages

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
