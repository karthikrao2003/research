# Deployment Guide

This guide will help you deploy the Smart Nutrition app to production.

## Architecture

- **Frontend**: React + Vite (deploy to Vercel)
- **Backend**: FastAPI (deploy to Railway or Render)

## Step 1: Deploy Backend to Railway (Recommended)

### Option A: Railway (Easiest)

1. **Sign up/Login to Railway**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `research` repository
   - Select the `backend` folder

3. **Configure Environment Variables**
   - In Railway dashboard, go to "Variables"
   - Add these variables:
     ```
     MONGO_URI=your_mongodb_connection_string
     MONGO_DB_NAME=nutrition_app
     JWT_SECRET=your-secret-key-change-this
     JWT_EXPIRE_MIN=43200
     ```
   - For MongoDB, you can use MongoDB Atlas (free tier): https://www.mongodb.com/cloud/atlas

4. **Update Dataset Path**
   - You need to upload your CSV file to the backend
   - Update `backend/main.py` line 24 to use a relative path or upload to cloud storage
   - Or include the CSV in the repository

5. **Deploy**
   - Railway will automatically detect Python and install dependencies
   - It will run `python main.py` or use a `Procfile`
   - Copy the deployment URL (e.g., `https://your-app.railway.app`)

### Option B: Render

1. Go to https://render.com
2. Create a new "Web Service"
3. Connect your GitHub repo
4. Set:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Environment**: Python 3
5. Add environment variables (same as Railway)
6. Deploy and copy the URL

## Step 2: Update Backend CORS

Update `backend/main.py` to allow your Vercel frontend URL:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://your-app.vercel.app",  # Add your Vercel URL here
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Step 3: Deploy Frontend to Vercel

### Method 1: Vercel CLI (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Navigate to frontend folder**
   ```bash
   cd frontend
   ```

4. **Deploy**
   ```bash
   vercel
   ```
   - Follow the prompts
   - When asked for project settings, use defaults
   - Set root directory to `frontend` if asked

5. **Add Environment Variable**
   - Go to Vercel dashboard: https://vercel.com/dashboard
   - Select your project
   - Go to Settings → Environment Variables
   - Add:
     ```
     VITE_API_URL=https://your-backend.railway.app
     ```
   - Replace with your actual backend URL

6. **Redeploy**
   - After adding environment variable, go to Deployments
   - Click "Redeploy" on the latest deployment

### Method 2: Vercel Dashboard (GitHub Integration)

1. **Go to Vercel**
   - Visit https://vercel.com
   - Sign up/Login with GitHub

2. **Import Project**
   - Click "Add New Project"
   - Select your `research` repository
   - Configure:
     - **Framework Preset**: Vite
     - **Root Directory**: `frontend`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
     - **Install Command**: `npm install`

3. **Add Environment Variable**
   - In project settings, add:
     ```
     VITE_API_URL=https://your-backend.railway.app
     ```

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete

## Step 4: Update Frontend API URL

After deployment, your frontend will automatically use the `VITE_API_URL` environment variable.

## Step 5: Test Your Deployment

1. Visit your Vercel URL (e.g., `https://your-app.vercel.app`)
2. Try registering a new user
3. Test the nutrition prediction feature
4. Check if history is saving correctly

## Troubleshooting

### CORS Errors
- Make sure your backend CORS includes your Vercel URL
- Check that `allow_credentials=True` is set

### API Connection Issues
- Verify `VITE_API_URL` is set correctly in Vercel
- Check backend logs in Railway/Render dashboard
- Ensure backend is running and accessible

### MongoDB Connection
- Verify `MONGO_URI` is correct in backend environment variables
- Check MongoDB Atlas IP whitelist (should allow all IPs: `0.0.0.0/0`)

### Dataset Not Found
- Upload your CSV file to the backend repository
- Or use cloud storage (S3, etc.) and update the path in `main.py`

## Quick Commands

```bash
# Deploy frontend to Vercel
cd frontend
vercel

# Deploy frontend with production URL
vercel --prod

# View Vercel deployments
vercel ls
```

## Environment Variables Summary

### Frontend (Vercel)
- `VITE_API_URL`: Your backend URL

### Backend (Railway/Render)
- `MONGO_URI`: MongoDB connection string
- `MONGO_DB_NAME`: Database name (default: nutrition_app)
- `JWT_SECRET`: Secret key for JWT tokens
- `JWT_EXPIRE_MIN`: Token expiration in minutes
