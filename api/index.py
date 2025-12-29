"""
Vercel serverless function handler for FastAPI backend
"""
import sys
import os

# Add backend directory to Python path
backend_path = os.path.join(os.path.dirname(__file__), '..', 'backend')
sys.path.insert(0, os.path.abspath(backend_path))

# Import the FastAPI app from backend
try:
    from main import app
    from mangum import Mangum
    
    # Create handler for Vercel serverless functions
    # lifespan="off" disables startup/shutdown events (not supported in serverless)
    handler = Mangum(app, lifespan="off")
except Exception as e:
    # Fallback handler for debugging
    def handler(request):
        return {
            "statusCode": 500,
            "body": f"Error importing app: {str(e)}"
        }
