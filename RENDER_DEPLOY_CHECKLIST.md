# Render + Upstash Deployment Checklist

## ✅ Pre-Deployment

- [ ] Push latest changes to GitHub
  ```bash
  git push origin main
  ```

- [ ] Verify backend builds successfully
  ```bash
  cd backend && npm run build
  ```

## 🗄️ Upstash Redis Setup

1. **Create Database:**
   - Go to https://console.upstash.com/redis
   - Click "Create Database"
   - Choose name and region (closest to your Render region)
   - Select **Free** tier

2. **Copy Connection String:**
   - Click on your database
   - Go to "Details" tab
   - Copy the **TLS (SSL) URL** - it should start with `rediss://`
   - Example: `rediss://default:AbC123...@us1-proper-fish-12345.upstash.io:6379`

## 🚀 Render Backend Setup

1. **Create Web Service:**
   - Go to https://dashboard.render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repo

2. **Configure Service:**
   ```
   Name: peerdrop-backend
   Region: Oregon (US West) or closest to you
   Branch: main
   Root Directory: backend
   Runtime: Node
   Build Command: npm install && npm run build
   Start Command: npm start
   ```

3. **Set Environment Variables:**
   Click "Environment" → "Add Environment Variable"
   
   ```
   REDIS_URL = rediss://default:your-password@region.upstash.io:6379
   NODE_ENV = production
   ```
   
   **Important:** Make sure to use the FULL URL from Upstash including:
   - Protocol: `rediss://` (with double 's')
   - Username: `default`
   - Password: (from Upstash dashboard)
   - Host: `region.upstash.io`
   - Port: `6379`

4. **Choose Plan:**
   - Select **Free** tier (sufficient for testing)
   - Click "Create Web Service"

## 🔍 Verify Deployment

1. **Check Build Logs:**
   - Wait for deployment to complete (~2-3 minutes)
   - Check "Logs" tab for errors
   - Look for: `✅ Redis connected to rediss://...`

2. **Test Health Endpoint:**
   ```bash
   curl https://your-app.onrender.com/health
   ```
   Should return: `{"status":"ok"}`

3. **Test WebSocket:**
   Open browser console at your frontend and run:
   ```javascript
   const ws = new WebSocket('wss://your-app.onrender.com/ws')
   ws.onopen = () => console.log('✅ Connected!')
   ws.onerror = (e) => console.error('❌ Error:', e)
   ```

## 🌐 Frontend Deployment

1. **Update Environment Variable:**
   ```bash
   cd frontend
   echo "VITE_WS_URL=wss://your-app.onrender.com/ws" > .env.production
   ```

2. **Deploy to Vercel:**
   ```bash
   npm i -g vercel
   vercel --prod
   ```
   
   Or deploy to Netlify:
   ```bash
   npm i -g netlify-cli
   npm run build
   netlify deploy --prod --dir=dist
   ```

3. **Set Environment Variable in Platform:**
   - Vercel: Project Settings → Environment Variables
   - Netlify: Site Settings → Build & Deploy → Environment
   
   Add:
   ```
   VITE_WS_URL = wss://your-app.onrender.com/ws
   ```

## 🧪 Full Integration Test

1. Open your deployed frontend
2. Click "Create Room"
3. Copy the room ID
4. Open in incognito/another browser
5. Enter the room ID and join
6. Try sending a file
7. Verify successful transfer

## ❌ Troubleshooting

### Error: "Socket closed unexpectedly"
✅ **Already fixed** in the latest code. Make sure you've pushed and redeployed.

### Error: "Authentication failed"
❌ Wrong REDIS_URL format or password
✅ Copy the complete URL from Upstash dashboard

### Error: "Connection timeout"
❌ Upstash database is cold starting (free tier)
✅ Wait 30 seconds and refresh

### Build fails on Render
❌ Check Node.js version compatibility
✅ Render uses Node 18+ by default, which is correct

### WebSocket connection fails
❌ Wrong WebSocket URL or CORS issue
✅ Verify `VITE_WS_URL` starts with `wss://` (not `ws://`)
✅ Check Render logs for connection errors

### "Redis connection error" in logs
❌ Invalid REDIS_URL
✅ Must be format: `rediss://default:password@host:6379`
✅ Check for extra spaces or line breaks in environment variable

## 📊 Monitoring

**Render Dashboard:**
- Check "Metrics" tab for CPU/Memory usage
- Monitor "Logs" for errors
- Free tier sleeps after 15 min inactivity

**Upstash Dashboard:**
- Monitor "Metrics" for command count
- Free tier limit: 10,000 commands/day
- Check connection status

## 💰 Cost Summary

| Service | Plan | Cost |
|---------|------|------|
| Render Web Service | Free | $0 (sleeps after 15 min) |
| Upstash Redis | Free | $0 (10K commands/day) |
| Vercel/Netlify | Free | $0 (hobby tier) |
| **Total** | | **$0/month** |

**Note:** Free tier limitations:
- Render: Cold starts (~30 sec) after 15 min inactivity
- Upstash: 10,000 Redis commands per day
- Vercel/Netlify: Bandwidth limits on free tier

## 🎉 Success Criteria

- [ ] Backend deploys without errors
- [ ] Redis connection successful in logs
- [ ] Health endpoint returns `{"status":"ok"}`
- [ ] WebSocket connection works
- [ ] Frontend can create/join rooms
- [ ] File transfer completes successfully
- [ ] No errors in browser console

## 📝 Next Steps

Once deployed:
1. Test with real users
2. Monitor Render logs for errors
3. Check Upstash command usage
4. Consider upgrading to paid tiers if traffic increases

## 🆘 Need Help?

- Check `UPSTASH_FIX.md` for detailed troubleshooting
- Review Render logs: Dashboard → Logs
- Test Redis: Upstash Dashboard → CLI
- Check WebSocket: Browser DevTools → Network → WS tab
