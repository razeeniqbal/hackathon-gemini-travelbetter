# 🚀 Razeen - Quick Start Guide

Hey Razeen! Everything is set up for you. Follow these steps to get started:

---

## ✅ What's Already Done

I've created:
- ✅ **Supabase database schema** with PostGIS ([supabase/schema.sql](supabase/schema.sql))
- ✅ **Frontend Supabase client** ([src/lib/supabase.ts](src/lib/supabase.ts))
- ✅ **Trip service** with all CRUD operations ([src/services/tripService.ts](src/services/tripService.ts))
- ✅ **AI backend** with Express ([server/](server/))
- ✅ **Import endpoints** for text, image, XHS, AR ([server/src/routes/import.ts](server/src/routes/import.ts))
- ✅ **Clustering service** with PostGIS ([server/src/services/clusteringService.ts](server/src/services/clusteringService.ts))
- ✅ **Complete setup guide** ([SETUP_GUIDE.md](SETUP_GUIDE.md))

---

## 🎯 Your Next Steps (30 minutes)

### Step 1: Create Supabase Project (5 min)

1. Go to https://supabase.com
2. Sign up/login
3. Click "New Project"
   - Name: `travelos`
   - Database Password: (save this!)
   - Region: Choose closest to you
4. Wait 2-3 minutes

### Step 2: Run Database Schema (3 min)

1. In Supabase dashboard → **SQL Editor**
2. Copy all content from `supabase/schema.sql`
3. Paste and click **Run**
4. Wait for success ✅

### Step 3: Get API Keys (2 min)

1. Supabase → **Project Settings** → **API**
2. Copy:
   - Project URL
   - anon public key
   - service_role key

### Step 4: Setup Environment Variables (5 min)

**Frontend** - Update `.env.local`:
```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co  # Your URL
VITE_SUPABASE_ANON_KEY=eyJhbGc...  # Your anon key
VITE_API_URL=http://localhost:3001
```

**Backend** - Create `server/.env`:
```bash
PORT=3001
NODE_ENV=development

SUPABASE_URL=https://xxxxx.supabase.co  # Same URL
SUPABASE_SERVICE_KEY=eyJhbGc...  # Use SERVICE ROLE key!

GEMINI_API_KEY=AIzaSyCc1UsTnybMBNHt5mR18oYOHm3L122-7D0  # Already have this

FRONTEND_URL=http://localhost:5173
```

### Step 5: Install & Run (10 min)

**Frontend**:
```bash
# In d:\personalproject\travelbetter
npm install @supabase/supabase-js
npm run dev
```

**Backend**:
```bash
# In d:\personalproject\travelbetter\server
npm install
npm run dev
```

### Step 6: Test It Works (5 min)

**Test 1**: Open http://localhost:5173 (frontend loads)

**Test 2**: Open http://localhost:3001/health (returns `{"status":"ok"}`)

**Test 3**: Test import API:
```bash
curl -X POST http://localhost:3001/api/import/text \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"Visit Tokyo Tower and Senso-ji Temple\"}"
```

Should return extracted activities! ✨

---

## 📁 Key Files You'll Work With

### Backend (Your Focus)
- `server/src/services/geminiService.ts` - AI import logic ⭐
- `server/src/services/clusteringService.ts` - Hotel clustering ⭐
- `server/src/routes/import.ts` - Import endpoints
- `server/src/routes/routing.ts` - Routing endpoints

### Frontend (Reference)
- `src/lib/supabase.ts` - Supabase client
- `src/services/tripService.ts` - CRUD operations
- `src/types/database.ts` - TypeScript types

---

## 🎯 Your Week 1 Tasks

### Days 1-2 (Setup) ✅
You'll complete this today by following steps above!

### Days 3-5 (AI Import Testing)

**Your Focus**:
1. Test text import with various inputs
2. Test image import with screenshots
3. Test AR scanning
4. Work with Fattah on XHS import
5. Fix any bugs in import logic

**Test Cases**:
```bash
# Text import
curl -X POST http://localhost:3001/api/import/text \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"3-day Tokyo trip: Day 1 visit Senso-ji Temple and Tokyo Skytree\"}"

# Image import (after converting image to base64)
curl -X POST http://localhost:3001/api/import/image \
  -H "Content-Type: application/json" \
  -d "{\"base64Image\":\"data:image/jpeg;base64,/9j/4AAQ...\"}"

# XHS link
curl -X POST http://localhost:3001/api/import/xhs-link \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://www.xiaohongshu.com/explore/...\"}"
```

---

## 🆘 Common Issues

### "Missing Supabase environment variables"
- Check `.env.local` exists and has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart dev server: Ctrl+C then `npm run dev`

### Backend won't start
```bash
cd server
rm -rf node_modules
npm install
npm run dev
```

### "API key invalid" (Gemini)
- I already added your Gemini API key, but if it fails:
- Go to https://aistudio.google.com/apikey
- Create new key
- Update `server/.env`

---

## 💬 Team Coordination

**Talk to Fattah about**:
- XHS parsing logic (he's focusing on this)
- Splitting work on import endpoints
- Testing with real XHS content

**Talk to Jason about**:
- Frontend connection to your APIs
- What data format he needs from import endpoints

**Talk to Kai about**:
- UI for import (text input, file upload)
- Loading states and error handling

---

## 📖 Full Documentation

For detailed info, see:
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Complete setup instructions
- **[TEAM_PLAN_GENERAL.md](TEAM_PLAN_GENERAL.md)** - Full 3-week plan

---

## 🎉 Ready to Start!

1. Follow Steps 1-6 above (30 min)
2. Read `SETUP_GUIDE.md` for details
3. Start testing import APIs
4. Coordinate with team in daily standup

**You got this! 🚀**

Any questions? Check the setup guide or ask the team!

---

**Pro Tip**: Supabase handles all CRUD operations automatically! You only need to focus on:
1. AI import (Gemini API calls)
2. Clustering (PostGIS queries)

Everything else (create trip, add activities, etc.) works via Supabase's auto-generated APIs! 🎊
