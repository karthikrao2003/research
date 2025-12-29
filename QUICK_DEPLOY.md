# Quick Vercel Deployment Guide

## 🚀 Step-by-Step: Deploy to Vercel (5 minutes)

### Step 1: Deploy Backend First (Railway - Free)

1. **Go to Railway**: https://railway.app
2. **Sign up** with GitHub
3. **New Project** → **Deploy from GitHub repo**
4. **Select your `research` repo**
5. **Set Root Directory** to `backend`
6. **Add Environment Variables**:
   ```
   MONGO_URI=your_mongodb_atlas_connection_string
   MONGO_DB_NAME=nutrition_app
   JWT_SECRET=your-secret-key-here
   DATASET_PATH=./researchdataset.csv
   ALLOWED_ORIGINS=https://your-app.vercel.app
   ```
7. **Upload your CSV file** to the `backend` folder in your repo
8. **Copy your Railway URL** (e.g., `https://your-app.railway.app`)

### Step 2: Deploy Frontend to Vercel

#### Option A: Using Vercel CLI (Easiest)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Navigate to frontend
cd frontend

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Y
# - Which scope? (select your account)
# - Link to existing project? N
# - Project name? (press enter for default)
# - Directory? ./ (press enter)
# - Override settings? N
```

After deployment:
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add: `VITE_API_URL` = `https://your-backend.railway.app`
5. Go to **Deployments** → Click **Redeploy**

#### Option B: Using Vercel Website

1. Go to https://vercel.com
2. **Add New Project**
3. **Import** your GitHub `research` repository
4. **Configure**:
   - Framework Preset: **Vite**
   - Root Directory: **frontend**
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. **Add Environment Variable**:
   - Name: `VITE_API_URL`
   - Value: `https://your-backend.railway.app`
6. Click **Deploy**

### Step 3: Update Backend CORS

After you get your Vercel URL, update backend environment variable:

1. Go to Railway dashboard
2. Your project → **Variables**
3. Update `ALLOWED_ORIGINS`:
   ```
   ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:5173
   ```
4. Railway will auto-redeploy

### Step 4: Test!

Visit your Vercel URL and test:
- ✅ User registration
- ✅ Login
- ✅ Nutrition predictions
- ✅ History tracking

## 📝 Important Notes

1. **MongoDB**: Use MongoDB Atlas (free): https://www.mongodb.com/cloud/atlas
   - Create cluster → Get connection string → Add to Railway

2. **CSV File**: Upload `researchdataset.csv` to your `backend` folder in GitHub

3. **Environment Variables**: 
   - Frontend (Vercel): `VITE_API_URL`
   - Backend (Railway): `MONGO_URI`, `JWT_SECRET`, etc.

## 🐛 Troubleshooting

**CORS Error?**
- Check `ALLOWED_ORIGINS` includes your Vercel URL
- Make sure URL has `https://` not `http://`

**API Not Working?**
- Verify `VITE_API_URL` is set in Vercel
- Check Railway logs for backend errors
- Ensure backend is running (check Railway dashboard)

**MongoDB Connection Failed?**
- Verify `MONGO_URI` is correct
- Check MongoDB Atlas IP whitelist (allow all: `0.0.0.0/0`)

## 🎉 Done!

Your app should now be live at: `https://your-app.vercel.app`
