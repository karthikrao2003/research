# Fix 404 Error on Vercel

## The Problem
You're getting a 404 error because Vercel needs specific configuration in the UI.

## Solution: Update Vercel Project Settings

### Step 1: Go to Project Settings
1. In Vercel Dashboard, click on your project
2. Go to **Settings** tab
3. Scroll to **Build & Development Settings**

### Step 2: Configure Build Settings

**Root Directory:** Leave as `./` (root)

**Framework Preset:** Select **"Other"** or **"Vite"**

**Build Command:** 
```
cd frontend && npm install && npm run build
```

**Output Directory:** 
```
frontend/dist
```

**Install Command:**
```
cd frontend && npm install
```

### Step 3: Verify Environment Variables

Make sure these are set in **Settings → Environment Variables**:

```
MONGO_URI=mongodb+srv://karthikrao608:kira123@cluster.mongodb.net/?retryWrites=true&w=majority
MONGO_DB_NAME=nutrition_app
JWT_SECRET=change-this-to-a-long-random-secret
DATASET_PATH=./backend/researchdataset.csv
```

**Important:** Make sure your MongoDB URI includes the full connection string with database name and options.

### Step 4: Redeploy

1. Go to **Deployments** tab
2. Click the **three dots (⋯)** on the latest deployment
3. Click **Redeploy**
4. Make sure **"Use existing Build Cache"** is **UNCHECKED**

## Alternative: Use Vercel CLI

If the UI doesn't work, try deploying via CLI:

```bash
cd C:\Research
vercel --prod
```

## Check Deployment Logs

1. Go to **Deployments** tab
2. Click on the latest deployment
3. Check **Build Logs** for any errors
4. Check **Function Logs** for API errors

## Common Issues

### Frontend not building?
- Check that `frontend/package.json` exists
- Verify `npm run build` works locally
- Check build logs in Vercel

### API returning 404?
- Verify `api/index.py` exists
- Check that `api/requirements.txt` exists
- Look at Function Logs in Vercel

### CSV file not found?
- Make sure `researchdataset.csv` is in `backend/` folder
- Verify it's committed to GitHub
- Check `DATASET_PATH` environment variable

## Test After Redeploy

1. Visit your Vercel URL
2. Check browser console (F12) for errors
3. Try accessing `/api/foods` directly
4. Test registration/login
