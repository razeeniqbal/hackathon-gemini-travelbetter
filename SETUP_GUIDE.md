# TravelOS Setup Guide (Supabase Version)

Welcome Razeen! This guide will help you set up the entire TravelOS stack in under 30 minutes.

---

## 🎯 Architecture Overview

```
Frontend (React + TypeScript)
    ↓
    ├─→ Supabase (PostgreSQL + PostGIS)
    │   - Direct database access
    │   - CRUD operations
    │   - File storage
    │
    └─→ AI Backend (Node.js + Express)
        - Gemini AI import
        - Route optimization
        - Clustering algorithms
```

---

## 📋 Prerequisites

- [ ] Node.js 18+ installed
- [ ] Git installed
- [ ] Code editor (VS Code recommended)
- [ ] Supabase account (free): https://supabase.com
- [ ] Google AI Studio account (free): https://aistudio.google.com

---

## Step 1: Supabase Setup (15 minutes)

### 1.1 Create Supabase Project

1. Go to https://supabase.com and sign up/login
2. Click "New Project"
3. Fill in:
   - **Name**: `travelos`
   - **Database Password**: (save this!)
   - **Region**: Choose closest to you
4. Wait 2-3 minutes for project to be created

### 1.2 Run Database Schema

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click "New Query"
3. Copy the entire content of `supabase/schema.sql`
4. Paste into the SQL editor
5. Click **Run** (or press Ctrl+Enter)
6. Wait for success message (should take 5-10 seconds)

✅ You should see tables created: `trips`, `days`, `activities`, `remix_links`

### 1.3 Get API Keys

1. Go to **Project Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` (long string)
   - **service_role key**: `eyJhbGc...` (different long string)

⚠️ **Keep these secret! Don't commit to git!**

---

## Step 2: Frontend Setup (5 minutes)

### 2.1 Install Supabase Client

```bash
# In project root (d:\personalproject\travelbetter)
npm install @supabase/supabase-js
```

### 2.2 Create Environment Variables

Create `.env.local` (if doesn't exist):

```bash
# In d:\personalproject\travelbetter\.env.local
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc... (your anon key)
VITE_API_URL=http://localhost:3001
```

Replace with your actual Supabase URL and anon key!

### 2.3 Test Frontend

```bash
npm run dev
```

Open http://localhost:5173 - frontend should load!

---

## Step 3: Backend Setup (10 minutes)

### 3.1 Install Dependencies

```bash
cd server
npm install
```

This installs:
- Express (web server)
- Google Gemini SDK
- Supabase client
- TypeScript

### 3.2 Get Google Gemini API Key

1. Go to https://aistudio.google.com/apikey
2. Click "Create API Key"
3. Copy the key (starts with `AIza...`)

### 3.3 Create Backend Environment Variables

Create `server/.env`:

```bash
# In d:\personalproject\travelbetter\server\.env
PORT=3001
NODE_ENV=development

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc... (your SERVICE ROLE key, not anon key!)

# Google Gemini
GEMINI_API_KEY=AIza... (your Gemini API key)

# CORS
FRONTEND_URL=http://localhost:5173
```

⚠️ Use **SERVICE_ROLE** key for backend (has admin access)

### 3.4 Start Backend Server

```bash
# In d:\personalproject\travelbetter\server
npm run dev
```

You should see:
```
🚀 TravelOS AI Server running on port 3001
📍 Health check: http://localhost:3001/health
```

Test it: Open http://localhost:3001/health in browser
Should return: `{"status":"ok","timestamp":"..."}`

---

## Step 4: Test Everything (5 minutes)

### 4.1 Test Database Connection

In Supabase SQL Editor, run:

```sql
SELECT * FROM trips;
```

Should return sample "Tokyo Adventure" trip (or empty if you removed it)

### 4.2 Test Import API

Use Postman or curl:

```bash
curl -X POST http://localhost:3001/api/import/text \
  -H "Content-Type: application/json" \
  -d '{"text":"Visit Tokyo Tower and Senso-ji Temple"}'
```

Should return extracted activities with coordinates!

### 4.3 Test Frontend → Supabase

Add this to `src/App.tsx` (temporarily):

```typescript
import { supabase } from './lib/supabase';

// Inside App component
useEffect(() => {
  async function testSupabase() {
    const { data, error } = await supabase.from('trips').select('*');
    console.log('Trips from Supabase:', data, error);
  }
  testSupabase();
}, []);
```

Check browser console - should see trips data!

---

## 🎉 You're All Set!

If all tests passed, you have:
- ✅ Supabase database with PostGIS
- ✅ Frontend connected to Supabase
- ✅ AI backend running with Gemini
- ✅ Clustering service ready

---

## Next Steps (Your Week 1 Tasks)

### Days 1-2 ✅ (DONE!)
You just completed this! 🎉

### Days 3-5: Build Import Features

**Your tasks (Razeen):**
1. ✅ Import service is already built (`server/src/services/geminiService.ts`)
2. ✅ Import routes are ready (`server/src/routes/import.ts`)
3. Now test each import method:
   - Text import
   - Image import
   - XHS link import
   - XHS screenshot import
   - AR scan

**Test with real data:**

```bash
# Text import
curl -X POST http://localhost:3001/api/import/text \
  -H "Content-Type: application/json" \
  -d '{"text":"3-day Tokyo trip: Day 1 visit Senso-ji Temple and Tokyo Skytree. Day 2 go to teamLab Borderless and Shibuya Crossing. Day 3 visit Mount Fuji."}'

# Image import (need base64 encoded image)
# Screenshot XHS, convert to base64, then:
curl -X POST http://localhost:3001/api/import/xhs-screenshot \
  -H "Content-Type: application/json" \
  -d '{"base64Image":"data:image/jpeg;base64,/9j/4AAQ..."}'
```

**Coordinate with Fattah:**
- Fattah will focus on XHS specific parsing
- You focus on general import + AR scanning
- Both test with Postman/Insomnia

---

## 📁 Project Structure

```
d:\personalproject\travelbetter\
├── src/                          # Frontend (React)
│   ├── lib/
│   │   └── supabase.ts           # ✅ Supabase client
│   ├── services/
│   │   └── tripService.ts        # ✅ CRUD operations
│   ├── types/
│   │   └── database.ts           # ✅ TypeScript types
│   └── App.tsx
│
├── server/                       # Backend (Node.js)
│   ├── src/
│   │   ├── index.ts              # ✅ Express server
│   │   ├── routes/
│   │   │   ├── import.ts         # ✅ Import endpoints
│   │   │   └── routing.ts        # ✅ Clustering endpoints
│   │   └── services/
│   │       ├── geminiService.ts  # ✅ AI import logic
│   │       └── clusteringService.ts # ✅ PostGIS clustering
│   ├── package.json
│   └── .env                      # Your API keys here!
│
└── supabase/
    └── schema.sql                # ✅ Database schema
```

---

## 🐛 Troubleshooting

### Frontend can't connect to Supabase

**Error**: "Missing Supabase environment variables"

**Fix**:
1. Check `.env.local` exists in project root
2. Restart dev server: `npm run dev`
3. Environment variables must start with `VITE_`

### Backend won't start

**Error**: "Cannot find module"

**Fix**:
```bash
cd server
rm -rf node_modules
npm install
```

**Error**: "Supabase connection failed"

**Fix**:
- Check `server/.env` has correct `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
- Use SERVICE_ROLE key, not anon key!

### Gemini API fails

**Error**: "API key invalid"

**Fix**:
1. Go to https://aistudio.google.com/apikey
2. Create new API key
3. Update `server/.env` with new key
4. Restart backend: `npm run dev`

**Error**: "Rate limit exceeded"

**Fix**:
- Free tier has limits (15 requests per minute)
- Wait a minute and try again
- Or upgrade to paid tier

### PostGIS functions not found

**Error**: "function get_activities_near_hotel does not exist"

**Fix**:
- Re-run the entire `supabase/schema.sql` in Supabase SQL Editor
- Make sure no errors during schema creation

---

## 💡 Pro Tips

### 1. Use Supabase Table Editor
- Go to Supabase Dashboard → Table Editor
- Visually see your data
- Manually edit/delete rows during testing

### 2. Check Backend Logs
```bash
# In server terminal
# Watch for errors when testing APIs
```

### 3. Use Supabase SQL Editor for Debugging
```sql
-- See all trips with activity count
SELECT
  t.*,
  COUNT(DISTINCT d.id) as day_count,
  COUNT(a.id) as activity_count
FROM trips t
LEFT JOIN days d ON t.id = d.trip_id
LEFT JOIN activities a ON d.id = a.day_id
GROUP BY t.id;

-- Test PostGIS distance calculation
SELECT
  place_name,
  distance_from_hotel,
  ST_X(location::geometry) as lng,
  ST_Y(location::geometry) as lat
FROM activities
WHERE distance_from_hotel IS NOT NULL
ORDER BY distance_from_hotel;
```

### 4. Git Ignore Secrets
Make sure `.env` and `.env.local` are in `.gitignore`:

```bash
# Check .gitignore includes:
.env
.env.local
server/.env
```

---

## 📚 Useful Resources

### Supabase
- Docs: https://supabase.com/docs
- PostGIS guide: https://supabase.com/docs/guides/database/extensions/postgis
- TypeScript types: https://supabase.com/docs/guides/api/generating-types

### Google Gemini
- API docs: https://ai.google.dev/docs
- Model info: https://ai.google.dev/models/gemini

### PostGIS
- Distance functions: https://postgis.net/docs/ST_Distance.html
- Geography type: https://postgis.net/docs/geography.html

---

## 🚀 Quick Start Checklist

Day 1 (Today):
- [x] Create Supabase project
- [x] Run database schema
- [x] Get API keys
- [x] Install frontend dependencies
- [x] Install backend dependencies
- [x] Create .env files
- [x] Test everything works

Day 2:
- [ ] Test all import endpoints with real data
- [ ] Coordinate with Fattah on XHS parsing
- [ ] Test clustering with sample trip
- [ ] Fix any bugs

Day 3-5:
- [ ] Implement import UI (Jason's task)
- [ ] Connect frontend import to your backend
- [ ] Test end-to-end: Frontend → AI Backend → Supabase
- [ ] Move to Week 2 tasks!

---

## 🆘 Need Help?

**Backend Issues**: Tag @Fattah (he's also working on backend)
**Frontend Connection**: Tag @Jason or @Kai
**Supabase Issues**: Check Supabase docs or ask team
**Gemini API**: Check Google AI Studio docs

---

**You're ready to build! 🎉**

Start with testing the import APIs, then move to connecting with the frontend. Remember: the CRUD operations are already handled by Supabase's auto-generated APIs - you only need to focus on AI import and clustering logic!

Good luck! 🚀
