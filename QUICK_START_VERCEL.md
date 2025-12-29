# Quick Start: Deploy to Vercel (5 Minutes)

## ✅ What's Already Done

- ✅ API serverless function created (`api/index.py`)
- ✅ Vercel configuration ready (`vercel.json`)
- ✅ Frontend configured for production
- ✅ Backend adapted for serverless

## 🚀 Deploy in 3 Steps

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Configure for Vercel deployment"
git push
```

### Step 2: Deploy to Vercel

**Option A: CLI**
```bash
npm install -g vercel
vercel login
vercel
```

**Option B: Website**
1. Go to https://vercel.com
2. Import your GitHub repo
3. Click Deploy

### Step 3: Add Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

```
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority
MONGO_DB_NAME=nutrition_app
JWT_SECRET=your-secret-key-here
DATASET_PATH=./backend/researchdataset.csv
```

Then **Redeploy**!

## 📋 Checklist

- [ ] CSV file is in `backend/researchdataset.csv`
- [ ] MongoDB Atlas account created
- [ ] MongoDB connection string ready
- [ ] Code pushed to GitHub
- [ ] Deployed to Vercel
- [ ] Environment variables added
- [ ] Redeployed after adding env vars

## 🎯 That's It!

Your app will be live at: `https://your-project.vercel.app`

For detailed troubleshooting, see `VERCEL_DEPLOY.md`
