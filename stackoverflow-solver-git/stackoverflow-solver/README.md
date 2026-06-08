# StackSolve – AI DevOps Q&A

AI-powered technical problem solver. Paste any error or DevOps question and get a structured answer with root cause, solution, gotchas, and Stack Overflow references.

---

## Deploy in 5 minutes (Vercel — free)

### Step 1: Get your Anthropic API key
1. Go to https://console.anthropic.com
2. Click **API Keys** → **Create Key**
3. Copy the key (starts with `sk-ant-...`)

### Step 2: Push to GitHub
```bash
git init
git add .
git commit -m "initial"
gh repo create stackoverflow-solver --public --push
# OR create repo on github.com and push manually
```

### Step 3: Deploy to Vercel
1. Go to https://vercel.com → **Add New Project**
2. Import your GitHub repo
3. In **Environment Variables**, add:
   - Key: `ANTHROPIC_API_KEY`
   - Value: your key from Step 1
4. Click **Deploy**

Vercel gives you a public URL like `https://stackoverflow-solver.vercel.app`

---

## Install on your phone (PWA)

### iPhone (Safari):
1. Open your Vercel URL in **Safari**
2. Tap the **Share** button (box with arrow)
3. Tap **"Add to Home Screen"**
4. Tap **Add**

### Android (Chrome):
1. Open your Vercel URL in **Chrome**
2. Tap the **three dots** menu
3. Tap **"Add to Home Screen"**
4. Tap **Add**

The app installs like a native app — fullscreen, no browser UI.

---

## Run locally

```bash
npm install
# Create .env.local with:
# ANTHROPIC_API_KEY=sk-ant-your-key-here
npm run dev
# Open http://localhost:3000
```

---

## Features
- Mobile-first, PWA installable
- Root cause diagnosis
- Full solution with syntax-highlighted code
- Watch Out gotchas tab
- Stack Overflow reference links
- Question history (in-session)
- Pre-loaded DevOps examples (ECS, ECR, Terraform, Docker, GitHub Actions)
