# The Momentum Journal

Goal tracking + journaling app with AI-powered insights using Claude.

## Features
- The app lets you set the goals on a yearly basis, monthly basis and weekly basis. 
- It should facilitate tracking of these goals by journaling. It can detect the sentiment of the journal and say whether you met the goals for the timeline or not.
- There should be a dashboard where it shows how you're making progress in your goals. It should show the statistics based on the timeline you choose (weekly, monthly, yearly). 
- There should be voice to text translation for both goal setting and journaling

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **AI:** Claude API (Anthropic)
- **Deployment:** Vercel

## Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Supabase Setup

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Go to SQL Editor → New Query
4. Copy contents of `supabase/migrations/20260103000000_initial_schema.sql` and run
5. Enable Email Auth:
   - Go to Authentication → Providers
   - Enable Email provider
   - Disable "Confirm email" for development (optional)
6. Get API keys:
   - Go to Settings → API
   - Copy `Project URL` and `anon public` key

### 3. Claude API Setup

1. Get API key from [console.anthropic.com](https://console.anthropic.com)
2. Create new API key

### 4. Environment Variables

Create `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Claude API
ANTHROPIC_API_KEY=sk-ant-your-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "initial setup"
git push origin main
```

### 2. Vercel Setup

1. Go to [vercel.com](https://vercel.com) and login with GitHub
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
5. Add Environment Variables (all 5 from `.env.local`)
6. Click Deploy

### 3. Update Supabase Site URL

After Vercel deployment:

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add Vercel URL to:
   - **Site URL:** `https://your-app.vercel.app`
   - **Redirect URLs:** `https://your-app.vercel.app/**`

### 4. Test Production

Visit your Vercel URL and test signup/login

## Database Schema

- **profiles** - User profiles (extends auth.users)
- **goals** - Long-term and short-term goals
- **journal_entries** - Daily/weekly journal entries (markdown)
- **journal_goal_mentions** - Links journals to goals
- **ai_analyses** - AI analysis results from Claude
- **weekly_insights** - Pre-generated weekly summaries

All tables protected by Row Level Security (RLS)

## Project Structure

```
src/
├── app/              # Next.js App Router pages
├── components/       # React components
├── lib/              # Utilities (Supabase, Claude, DB queries)
├── types/            # TypeScript types
└── hooks/            # Custom React hooks
```

## Features Roadmap

### Phase 1: Infrastructure ✅
- [x] Next.js setup
- [x] Supabase schema
- [x] Deployment config

### Phase 2: Auth
- [x] Supabase Auth integration
- [x] Login/Signup pages
- [x] Protected routes

### Phase 3: Goals CRUD
- [x] Create/edit/delete goals
- [x] Progress tracking
- [x] Filter by type/status

### Phase 4: Journal CRUD
- [x] Markdown editor
- [x] Mood tracking
- [x] Tag system

### Phase 5: Dashboard
- [x] Overview page
- [x] Sidebar navigation
- [x] Stats cards

### Phase 6: AI Analysis
- [ ] On-demand analysis
- [ ] Goal progress insights
- [ ] Recommendations

## License

MIT License - see LICENSE file
