# =========================
# JUPYTER NUTRITION APP
# (SEARCH + MULTI FOOD + GRAMS + ML RANDOM FOREST)
# =========================

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder

from fastapi import FastAPI
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "nutrition_app")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALG = "HS256"
JWT_EXPIRE_MIN = int(os.getenv("JWT_EXPIRE_MIN", "43200"))

# Lazy MongoDB/auth imports to keep server starting even if packages aren’t installed
def _lazy_mongo():
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        return AsyncIOMotorClient(MONGO_URI)[MONGO_DB_NAME] if MONGO_URI else None
    except Exception:
        return None

def _lazy_auth_deps():
    try:
        from fastapi import Depends, HTTPException
        from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
        from passlib.context import CryptContext
        from jose import jwt, JWTError
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        bearer = HTTPBearer(auto_error=False)

        def _require_db():
            db = _lazy_mongo()
            if db is None:
                raise HTTPException(status_code=503, detail="MongoDB is not configured. Set MONGO_URI env var.")
            return db

        def _create_token(user_id: str, email: str) -> str:
            now = datetime.now(timezone.utc)
            payload = {
                "sub": user_id,
                "email": email,
                "iat": int(now.timestamp()),
                "exp": int((now + timedelta(minutes=JWT_EXPIRE_MIN)).timestamp()),
            }
            return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

        async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)) -> Dict[str, Any]:
            db = _require_db()
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

        return Depends, HTTPException, get_current_user, _require_db, _create_token
    except Exception:
        # If any auth lib is missing, return stubs that raise 503
        def stub_get_current_user(*args, **kwargs):
            raise HTTPException(status_code=503, detail="Auth libraries not installed. Install motor, passlib, python-jose.")
        return lambda: None, HTTPException, stub_get_current_user, lambda: None, lambda *a, **k: ""

# Resolve lazily at import time
_Depends, _HTTPException, get_current_user, _require_db, _create_token = _lazy_auth_deps()

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
    db = _require_db()
    email = req.email.strip().lower()
    if not email or not req.password:
        raise _HTTPException(status_code=400, detail="Email and password required")
    existing = await db.users.find_one({"email": email})
    if existing:
        raise _HTTPException(status_code=409, detail="Email already registered")
    user_id = f"u_{os.urandom(8).hex()}"
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    password_hash = pwd_context.hash(req.password)
    await db.users.insert_one({"_id": user_id, "email": email, "password_hash": password_hash, "created_at": datetime.utcnow()})
    token = _create_token(user_id, email)
    return {"token": token, "user": {"id": user_id, "email": email}}


@app.post("/auth/login")
async def login(req: LoginRequest):
    db = _require_db()
    email = req.email.strip().lower()
    user = await db.users.find_one({"email": email})
    if not user:
        raise _HTTPException(status_code=401, detail="Invalid credentials")
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    if not pwd_context.verify(req.password, user.get("password_hash", "")):
        raise _HTTPException(status_code=401, detail="Invalid credentials")
    token = _create_token(user["_id"], user["email"])
    return {"token": token, "user": {"id": user["_id"], "email": user["email"]}}


@app.post("/history")
async def create_history(req: HistoryCreateRequest, user: Dict[str, Any] = _Depends(get_current_user)):
    db = _require_db()
    doc = {
        "user_id": user["_id"],
        "kind": req.kind,
        "payload": req.payload,
        "created_at": datetime.utcnow(),
    }
    await db.history.insert_one(doc)
    return {"ok": True}


@app.get("/history")
async def list_history(kind: Optional[str] = None, limit: int = 50, user: Dict[str, Any] = _Depends(get_current_user)):
    db = _require_db()
    q: Dict[str, Any] = {"user_id": user["_id"]}
    if kind:
        q["kind"] = kind
    limit = max(1, min(int(limit), 200))
    cursor = db.history.find(q, {"_id": 0}).sort("created_at", -1).limit(limit)
    items = [doc async for doc in cursor]
    return {"items": items}
