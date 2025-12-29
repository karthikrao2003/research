# Smart Nutrition - ML-Based Nutrition Adequacy Checker

A full-stack nutrition calculator with ML predictions, user authentication, and history tracking.

## Features

- 🧠 ML-based nutrition adequacy prediction using Random Forest
- 🔐 User authentication with JWT tokens
- 📊 Track nutrition history and predictions
- 🍎 Search and filter food items
- 📈 Real-time nutrition calculations

## Project Structure

```
/
├── backend/
│   ├── main.py              # FastAPI backend
│   ├── requirements.txt    # Python dependencies
│   ├── Procfile            # Railway/Render deployment
│   └── .env.example        # Environment variables template
├── frontend/
│   ├── src/
│   │   └── App.jsx         # React frontend
│   ├── vercel.json         # Vercel configuration
│   └── .env.example        # Frontend env variables
└── DEPLOYMENT.md           # Detailed deployment guide
```

## Backend Setup

1.  **Navigate into the backend directory:**
    ```bash
    cd backend
    ```
    *All subsequent backend commands must be run from this directory.*

2.  **Create a virtual environment:**
    ```bash
    python -m venv venv
    ```

3.  **Activate the virtual environment:**
    -   On Windows:
        ```bash
        .\venv\Scripts\activate
        ```
    -   On macOS/Linux:
        ```bash
        source venv/bin/activate
        ```

4.  **Install the dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

5.  **Run the backend server:**
    ```bash
    uvicorn main:app --reload
    ```

The backend will be running at `http://127.0.0.1:8000`.

## Frontend Setup

1.  **Navigate into the frontend directory:**
    ```bash
    cd frontend
    ```
    *All subsequent frontend commands must be run from this directory.*

2.  **Install the dependencies:**
    ```bash
    npm install
    ```

3.  **Run the frontend development server:**
    ```bash
    npm run dev
    ```

The frontend will be running at `http://localhost:5173`.

## Quick Deployment to Vercel

### Prerequisites
1. Backend deployed to Railway or Render (see [DEPLOYMENT.md](./DEPLOYMENT.md))
2. Vercel account (free tier works)

### Steps

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy Frontend**
   ```bash
   cd frontend
   vercel
   ```

4. **Add Environment Variable**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `VITE_API_URL` = `https://your-backend-url.railway.app`

5. **Redeploy**
   - In Vercel dashboard, go to Deployments → Redeploy

### Alternative: Deploy via GitHub

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Set:
   - **Root Directory**: `frontend`
   - **Framework**: Vite
5. Add environment variable `VITE_API_URL`
6. Deploy!

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).
