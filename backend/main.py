# =========================
# JUPYTER NUTRITION APP
# (SEARCH + MULTI FOOD + GRAMS + ML RANDOM FOREST)
# =========================

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv()

# =========================
# 1. LOAD DATASET
# =========================

DATASET_PATH = r"C:\Users\karth\OneDrive\Documents\researchdataset.csv"
foods_df = pd.read_csv(DATASET_PATH)

REQUIRED_COLUMNS = [
    "name", "protein_g", "iron_mg",
    "b12_mcg", "omega3_g", "cal_kcal"
]

missing = set(REQUIRED_COLUMNS) - set(foods_df.columns)
if missing:
    raise ValueError(f"Missing columns in dataset: {missing}")

foods_df = foods_df[REQUIRED_COLUMNS].fillna(0)
ALL_FOODS = sorted(foods_df["name"].unique())

app = FastAPI()

# CORS configuration - allow all localhost origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# MONGODB CONNECTION SETUP
# =========================

MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "nutrition_app")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALG = "HS256"
JWT_EXPIRE_MIN = int(os.getenv("JWT_EXPIRE_MIN", "43200"))

# Global MongoDB client and database
mongo_client = None
mongo_db = None

async def connect_to_mongo():
    """Initialize MongoDB connection"""
    global mongo_client, mongo_db
    
    if not MONGO_URI:
        print("WARNING: MONGO_URI not set. MongoDB features will be disabled.")
        return False
    
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        
        print(f"Connecting to MongoDB: {MONGO_URI.split('@')[-1] if '@' in MONGO_URI else MONGO_URI}")
        mongo_client = AsyncIOMotorClient(
            MONGO_URI,
            serverSelectionTimeoutMS=5000,  # 5 second timeout
            connectTimeoutMS=5000
        )
        mongo_db = mongo_client[MONGO_DB_NAME]
        
        # Test the connection
        await mongo_client.admin.command('ping')
        print(f"✓ Successfully connected to MongoDB database: {MONGO_DB_NAME}")
        
        # Create indexes for better performance
        try:
            await mongo_db.users.create_index("email", unique=True)
            await mongo_db.history.create_index("user_id")
            await mongo_db.history.create_index([("user_id", 1), ("created_at", -1)])
            print("✓ Database indexes created/verified")
        except Exception as e:
            print(f"Note: Index creation warning: {e}")
        
        return True
    except Exception as e:
        print(f"✗ Failed to connect to MongoDB: {e}")
        print("  Make sure MongoDB is running and MONGO_URI is correct in .env file")
        mongo_client = None
        mongo_db = None
        return False

async def close_mongo_connection():
    """Close MongoDB connection"""
    global mongo_client, mongo_db
    if mongo_client:
        mongo_client.close()
        print("MongoDB connection closed")
        mongo_client = None
        mongo_db = None

def get_db():
    """Get MongoDB database instance"""
    if mongo_db is None:
        raise HTTPException(
            status_code=503,
            detail="MongoDB is not connected. Please check MONGO_URI configuration and ensure MongoDB is running."
        )
    return mongo_db

# =========================
# AUTHENTICATION SETUP
# =========================

try:
    from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
    import bcrypt
    from jose import jwt, JWTError
    
    bearer = HTTPBearer(auto_error=False)
    
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt, ensuring it's within 72-byte limit"""
        if not password:
            raise ValueError("Password cannot be empty")
        
        # Convert to string and encode to bytes
        pwd_str = str(password)
        pwd_bytes = pwd_str.encode('utf-8')
        
        # Truncate to 72 bytes if needed (bcrypt limit)
        if len(pwd_bytes) > 72:
            pwd_bytes = pwd_bytes[:72]
            # Remove any incomplete UTF-8 sequences at the end
            while len(pwd_bytes) > 0 and (pwd_bytes[-1] & 0xC0) == 0x80:
                pwd_bytes = pwd_bytes[:-1]
        
        # Hash using bcrypt directly
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(pwd_bytes, salt)
        return hashed.decode('utf-8')
    
    def verify_password(password: str, password_hash: str) -> bool:
        """Verify a password against a hash, ensuring it's within 72-byte limit"""
        if not password or not password_hash:
            return False
        
        try:
            # Convert to string and encode to bytes
            pwd_str = str(password)
            pwd_bytes = pwd_str.encode('utf-8')
            
            # Truncate to 72 bytes if needed (bcrypt limit)
            if len(pwd_bytes) > 72:
                pwd_bytes = pwd_bytes[:72]
                # Remove any incomplete UTF-8 sequences at the end
                while len(pwd_bytes) > 0 and (pwd_bytes[-1] & 0xC0) == 0x80:
                    pwd_bytes = pwd_bytes[:-1]
            
            # Verify using bcrypt directly
            hash_bytes = password_hash.encode('utf-8')
            return bcrypt.checkpw(pwd_bytes, hash_bytes)
        except Exception:
            return False
    
    def create_token(user_id: str, email: str) -> str:
        """Create JWT token for user"""
        now = datetime.now(timezone.utc)
        payload = {
            "sub": user_id,
            "email": email,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(minutes=JWT_EXPIRE_MIN)).timestamp()),
        }
        return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)
    
    async def get_current_user(
        creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)
    ) -> Dict[str, Any]:
        """Get current authenticated user from JWT token"""
        db = get_db()
        
        if creds is None or not creds.credentials:
            raise HTTPException(status_code=401, detail="Missing bearer token")
        
        try:
            payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(status_code=401, detail="Invalid token")
            
            user = await db.users.find_one({"_id": user_id}, {"password_hash": 0})
            if not user:
                raise HTTPException(status_code=401, detail="User not found")
            
            return user
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")
    
    # Auth dependencies available
    auth_available = True
    
except ImportError as e:
    print(f"WARNING: Auth libraries not fully installed: {e}")
    print("  Install: pip install motor bcrypt python-jose")
    auth_available = False
    bearer = None
    
    # Create stub functions
    def hash_password(*args, **kwargs):
        raise HTTPException(status_code=503, detail="Auth libraries not installed")
    
    def verify_password(*args, **kwargs):
        raise HTTPException(status_code=503, detail="Auth libraries not installed")
    
    def create_token(*args, **kwargs):
        raise HTTPException(status_code=503, detail="Auth libraries not installed")
    
    async def get_current_user(*args, **kwargs):
        raise HTTPException(status_code=503, detail="Auth libraries not installed")

# =========================
# STARTUP/SHUTDOWN EVENTS
# =========================

@app.on_event("startup")
async def startup_event():
    """Initialize MongoDB connection on startup"""
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_event():
    """Close MongoDB connection on shutdown"""
    await close_mongo_connection()

# =========================
# 2. CREATE TRAINING DATA (AUTO-LABEL USING NAR)
# =========================

def generate_label(row, weight=60):
    protein_req = weight * 1.32
    iron_req = weight * 0.094
    b12_req = weight * 0.028
    omega3_req = 1.1

    nars = [
        row["protein_g"] / protein_req if protein_req else 0,
        row["iron_mg"] / iron_req if iron_req else 0,
        row["b12_mcg"] / b12_req if b12_req else 0,
        row["omega3_g"] / omega3_req if omega3_req else 0
    ]

    return "Adequate" if all(v >= 1 for v in nars) else "Inadequate"

foods_df["adequacy"] = foods_df.apply(generate_label, axis=1)


def compute_requirements(weight: float) -> Dict[str, float]:
    return {
        "protein_g": float(weight) * 1.32,
        "iron_mg": float(weight) * 0.094,
        "b12_mcg": float(weight) * 0.028,
        "omega3_g": 1.1,
    }


def compute_deficits(totals: Dict[str, float], reqs: Dict[str, float]) -> Dict[str, float]:
    deficits: Dict[str, float] = {}
    for k, req in reqs.items():
        have = float(totals.get(k, 0) or 0)
        missing_amt = float(req) - have
        if missing_amt > 0:
            deficits[k] = missing_amt
    return deficits

# =========================
# 3. TRAIN RANDOM FOREST (ONCE)
# =========================

FEATURES = ["protein_g", "iron_mg", "b12_mcg", "omega3_g", "cal_kcal"]
X = foods_df[FEATURES]
y = foods_df["adequacy"]

encoder = LabelEncoder()
y_encoded = encoder.fit_transform(y)

rf_model = RandomForestClassifier(
    n_estimators=200,
    max_depth=8,
    random_state=42
)

rf_model.fit(X, y_encoded)

# =========================
# 4. ML PREDICTION FUNCTION (GRAM-BASED)
# =========================

def predict_adequacy_ml(weight, food_grams):
    totals = {
        "protein_g": 0,
        "iron_mg": 0,
        "b12_mcg": 0,
        "omega3_g": 0,
        "cal_kcal": 0
    }

    for food, grams in food_grams.items():
        row = foods_df.loc[foods_df["name"] == food].iloc[0]
        factor = grams / 100

        totals["protein_g"] += row["protein_g"] * factor
        totals["iron_mg"] += row["iron_mg"] * factor
        totals["b12_mcg"] += row["b12_mcg"] * factor
        totals["omega3_g"] += row["omega3_g"] * factor
        totals["cal_kcal"] += row["cal_kcal"] * factor

    features = pd.DataFrame([totals])
    pred = rf_model.predict(features)[0]
    label = encoder.inverse_transform([pred])[0]

    return totals, label


class PredictRequest(BaseModel):
    weight: float = Field(..., gt=0)
    food_grams: Dict[str, float]


class CalculateRequest(BaseModel):
    weight: float = Field(..., gt=0)
    foods: List[str] = []
    food_grams: Optional[Dict[str, float]] = None


class RegisterRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class HistoryCreateRequest(BaseModel):
    kind: str = Field(..., pattern="^(predict|search)$")
    payload: Dict[str, Any]

@app.get("/foods")
def get_foods():
    return {"foods": ALL_FOODS}


@app.post("/predict")
def predict(request: PredictRequest):
    totals, label = predict_adequacy_ml(request.weight, request.food_grams)
    reqs = compute_requirements(request.weight)
    deficits = compute_deficits(totals, reqs)
    return {
        "weight": request.weight,
        "food_grams": request.food_grams,
        "totals": totals,
        "requirements": reqs,
        "deficits": deficits,
        "status": label,
    }


@app.post("/calculate")
def calculate(request: CalculateRequest):
    if request.food_grams is not None:
        food_grams = request.food_grams
    else:
        food_grams = {f: 100 for f in request.foods}

    totals, label = predict_adequacy_ml(request.weight, food_grams)
    reqs = compute_requirements(request.weight)
    deficits = compute_deficits(totals, reqs)
    return {
        "weight": request.weight,
        "selected_foods": request.foods,
        "food_grams": food_grams,
        "totals": totals,
        "requirements": reqs,
        "deficits": deficits,
        "status": label,
    }


@app.post("/auth/register")
async def register(req: RegisterRequest):
    """Register a new user"""
    if not auth_available:
        raise HTTPException(status_code=503, detail="Authentication is not available. Check MongoDB connection and dependencies.")
    
    db = get_db()
    email = req.email.strip().lower()
    
    if not email or not req.password:
        raise HTTPException(status_code=400, detail="Email and password required")
    
    # Check if user already exists
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    
    # Create user
    user_id = f"u_{os.urandom(8).hex()}"
    password_hash = hash_password(req.password)
    
    await db.users.insert_one({
        "_id": user_id,
        "email": email,
        "password_hash": password_hash,
        "created_at": datetime.now(timezone.utc)
    })
    
    token = create_token(user_id, email)
    
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": email
        }
    }


@app.post("/auth/login")
async def login(req: LoginRequest):
    """Login existing user"""
    if not auth_available:
        raise HTTPException(status_code=503, detail="Authentication is not available. Check MongoDB connection and dependencies.")
    
    db = get_db()
    email = req.email.strip().lower()
    
    # Find user
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(req.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Generate token
    token = create_token(user["_id"], user["email"])
    
    return {
        "token": token,
        "user": {
            "id": user["_id"],
            "email": user["email"]
        }
    }


@app.post("/history")
async def create_history(
    req: HistoryCreateRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a history entry for the authenticated user"""
    db = get_db()
    doc = {
        "user_id": user["_id"],
        "kind": req.kind,
        "payload": req.payload,
        "created_at": datetime.now(timezone.utc),
    }
    await db.history.insert_one(doc)
    return {"ok": True}


@app.get("/history")
async def list_history(
    kind: Optional[str] = None,
    limit: int = 50,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Get history entries for the authenticated user"""
    db = get_db()
    q: Dict[str, Any] = {"user_id": user["_id"]}
    if kind:
        q["kind"] = kind
    
    limit = max(1, min(int(limit), 200))
    cursor = db.history.find(q, {"_id": 0}).sort("created_at", -1).limit(limit)
    items = [doc async for doc in cursor]
    return {"items": items}
