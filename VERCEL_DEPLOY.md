# Deploy to Vercel - Complete Guide

This guide will help you deploy both frontend and backend to Vercel.

## Prerequisites

1. ✅ CSV file uploaded to `backend/researchdataset.csv` in your GitHub repo
2. ✅ MongoDB Atlas account (free tier works)
3. ✅ GitHub repository with your code

## Step 1: Prepare Your Repository

Make sure your repository structure looks like this:

```
research/
├── api/
│   └── index.py          # Vercel serverless function handler
├── backend/
│   ├── main.py           # FastAPI application
│   ├── requirements.txt  # Python dependencies
│   └── researchdataset.csv  # Your CSV file (uploaded)
├── frontend/
│   ├── src/
│   ├── package.json
│   └── ...
├── vercel.json           # Vercel configuration
└── README.md
```

## Step 2: Get MongoDB Connection String

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up/login (free tier)
3. Create a new cluster (free M0)
4. Click "Connect" → "Connect your application"
5. Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)
6. Replace `<password>` with your actual password
7. Add `?retryWrites=true&w=majority` at the end

## Step 3: Deploy to Vercel

### Option A: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Navigate to project root
cd C:\Research

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

### Option B: Using Vercel Website

1. Go to https://vercel.com
2. Sign up/Login with GitHub
3. Click "Add New Project"
4. Import your `research` repository
5. Vercel will auto-detect the configuration from `vercel.json`

## Step 4: Configure Environment Variables

After deployment, configure environment variables in Vercel:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add these variables:

```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGO_DB_NAME=nutrition_app
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRE_MIN=43200
DATASET_PATH=./backend/researchdataset.csv
```

**Important**: Replace `username`, `password`, and `cluster` with your actual MongoDB Atlas values.

## Step 5: Redeploy

After adding environment variables:

1. Go to Vercel Dashboard → Deployments
2. Click the three dots (⋯) on the latest deployment
3. Click "Redeploy"
4. Wait for deployment to complete

## Step 6: Test Your Deployment

Visit your Vercel URL (e.g., `https://your-project.vercel.app`) and test:

- ✅ Frontend loads correctly
- ✅ User registration works
- ✅ Login works
- ✅ Food search works
- ✅ Nutrition predictions work
- ✅ History saves correctly

## API Endpoints

Your API will be available at:
- `https://your-project.vercel.app/api/foods`
- `https://your-project.vercel.app/api/predict`
- `https://your-project.vercel.app/api/auth/register`
- `https://your-project.vercel.app/api/auth/login`
- `https://your-project.vercel.app/api/history`

## Troubleshooting

### Build Fails

**Error: "Module not found"**
- Make sure all dependencies are in `backend/requirements.txt`
- Check that `mangum` is included

**Error: "Dataset CSV not found"**
- Verify `researchdataset.csv` is in `backend/` folder
- Check file name matches exactly (case-sensitive)
- Ensure file is committed to GitHub

### API Returns 500 Error

**Check Vercel Function Logs:**
1. Go to Vercel Dashboard → Your Project → Functions
2. Click on a function to see logs
3. Look for error messages

**Common Issues:**
- MongoDB connection failed → Check `MONGO_URI` is correct
- Missing environment variables → Verify all variables are set
- CSV path wrong → Check `DATASET_PATH` matches file location

### CORS Errors

- Frontend and backend are on same domain, so CORS should work automatically
- If issues persist, check `ALLOWED_ORIGINS` in backend code

### MongoDB Connection Issues

1. **IP Whitelist**: In MongoDB Atlas → Network Access → Add IP Address → Allow Access from Anywhere (`0.0.0.0/0`)
2. **Database User**: Make sure database user has read/write permissions
3. **Connection String**: Verify it's correct and includes password

## File Structure for Vercel

```
research/
├── api/
│   └── index.py              # Serverless function handler
├── backend/
│   ├── main.py               # FastAPI app
│   ├── requirements.txt      # Python deps
│   └── researchdataset.csv   # Dataset
├── frontend/
│   ├── src/
│   ├── dist/                 # Built files (auto-generated)
│   └── package.json
└── vercel.json               # Vercel config
```

## Environment Variables Summary

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/` |
| `MONGO_DB_NAME` | Database name | `nutrition_app` |
| `JWT_SECRET` | Secret for JWT tokens | `your-secret-key` |
| `JWT_EXPIRE_MIN` | Token expiration (minutes) | `43200` |
| `DATASET_PATH` | Path to CSV file | `./backend/researchdataset.csv` |

## Updating Your Deployment

After making changes:

```bash
# Commit and push to GitHub
git add .
git commit -m "Your changes"
git push

# Vercel will auto-deploy, or manually:
vercel --prod
```

## Cost

- **Vercel**: Free tier includes:
  - 100GB bandwidth/month
  - Serverless functions (generous limits)
  - Automatic HTTPS
  
- **MongoDB Atlas**: Free tier (M0) includes:
  - 512MB storage
  - Shared RAM and vCPU
  - Perfect for development/small apps

## Support

If you encounter issues:
1. Check Vercel Function Logs
2. Check MongoDB Atlas logs
3. Verify environment variables
4. Ensure CSV file is in correct location

Your app should now be live! 🎉
