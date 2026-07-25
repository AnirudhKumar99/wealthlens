import uuid
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import ProfileModel, AssetItem, GoalItem, SipItem, InsurancePlanItem, LoanItem, UserRegisterModel, UserLoginModel
from database import (
    init_db, get_active_profile_id, set_active_profile_id, get_all_profiles,
    get_profile, create_profile, update_profile, delete_profile,
    get_items, insert_item, update_item, delete_item, get_categories,
    create_user, get_user_by_email, get_user_by_id, get_profiles_by_user_id
)
from auth import hash_password, verify_password, create_access_token, decode_access_token
from calculations import run_simulation

app = FastAPI(title="WealthLens API 2.0 (Multi-Profile)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_db():
    init_db()

@app.get("/")
def read_root():
    return {"message": "WealthLens API 2.0 (Multi-Profile)", "docs": "/docs"}

@app.get("/api/categories")
def api_get_categories():
    return get_categories()

# --- Auth Routes ---
@app.post("/api/auth/register")
def api_register(payload: UserRegisterModel):
    existing = get_user_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    
    user_id = str(uuid.uuid4())
    pw_hash, salt = hash_password(payload.password)
    user = create_user(user_id, payload.username, payload.email, pw_hash, salt)
    
    # Auto-create a default profile for the new user
    profile_id = str(uuid.uuid4())
    create_profile(profile_id, {
        "user_id": user_id,
        "family_name": f"{payload.username}'s Wealth Profile",
        "current_age": 32,
        "retirement_age": 60,
        "life_expectancy": 85,
        "annual_income": 2400000,
        "savings_rate": 35,
        "monthly_expenses_retirement": 45000,
        "retirement_inflation_rate": 5.5,
        "currency": "INR"
    })
    set_active_profile_id(profile_id)
    
    token = create_access_token({"sub": user_id, "email": payload.email, "username": payload.username})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
        "active_profile_id": profile_id
    }

@app.post("/api/auth/login")
def api_login(payload: UserLoginModel):
    user = get_user_by_email(payload.email)
    if not user or not verify_password(payload.password, user["salt"], user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    
    user_profiles = get_profiles_by_user_id(user["id"])
    active_pid = user_profiles[0]["id"] if user_profiles else get_active_profile_id()
    if active_pid:
        set_active_profile_id(active_pid)
        
    token = create_access_token({"sub": user["id"], "email": user["email"], "username": user["username"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user["id"], "username": user["username"], "email": user["email"]},
        "active_profile_id": active_pid
    }

@app.get("/api/auth/me")
def api_auth_me(token: str = ""):
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user = get_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    profiles = get_profiles_by_user_id(user["id"])
    return {
        "user": user,
        "profiles": profiles
    }

# --- Profile Management ---
@app.get("/api/profiles/active")
def api_get_active_profile():
    pid = get_active_profile_id()
    return {"active_profile_id": pid}

@app.put("/api/profiles/active/{profile_id}")
def api_set_active_profile(profile_id: str):
    if not get_profile(profile_id):
        raise HTTPException(status_code=404, detail="Profile not found")
    set_active_profile_id(profile_id)
    return {"message": "Active profile updated", "active_profile_id": profile_id}

@app.get("/api/profiles")
def api_get_profiles():
    return get_all_profiles()

@app.post("/api/profiles")
def api_create_profile(data: ProfileModel):
    pid = str(uuid.uuid4())
    create_profile(pid, data.model_dump(exclude={"id"}))
    set_active_profile_id(pid)
    return {"message": "Profile created", "id": pid}

@app.put("/api/profiles/{profile_id}")
def api_update_profile(profile_id: str, data: ProfileModel):
    if not get_profile(profile_id):
        raise HTTPException(status_code=404, detail="Profile not found")
    update_profile(profile_id, data.model_dump(exclude={"id"}))
    return {"message": "Profile updated"}

@app.delete("/api/profiles/{profile_id}")
def api_delete_profile(profile_id: str):
    if not get_profile(profile_id):
        raise HTTPException(status_code=404, detail="Profile not found")
    delete_profile(profile_id)
    return {"message": "Profile deleted"}

@app.get("/api/profiles/{profile_id}")
def api_get_profile(profile_id: str):
    p = get_profile(profile_id)
    if not p:
        raise HTTPException(status_code=404, detail="Profile not found")
    return p


# --- Scoped CRUD Helpers ---
def scoped_crud(router, prefix, table_name, model_class):
    
    @router.get(f"/api/profiles/{{profile_id}}/{prefix}")
    def _get_all(profile_id: str):
        return get_items(table_name, profile_id)
        
    @router.post(f"/api/profiles/{{profile_id}}/{prefix}")
    def _create(profile_id: str, data: model_class):
        item_id = str(uuid.uuid4())
        dumped = data.model_dump()
        dumped['id'] = item_id
        dumped['profile_id'] = profile_id
        insert_item(table_name, dumped)
        return {"id": item_id, "message": "Created"}
        
    @router.put(f"/api/profiles/{{profile_id}}/{prefix}/{{item_id}}")
    def _update(profile_id: str, item_id: str, data: model_class):
        update_item(table_name, item_id, profile_id, data.model_dump())
        return {"message": "Updated"}
        
    @router.delete(f"/api/profiles/{{profile_id}}/{prefix}/{{item_id}}")
    def _delete(profile_id: str, item_id: str):
        delete_item(table_name, item_id, profile_id)
        return {"message": "Deleted"}

scoped_crud(app, "assets", "assets", AssetItem)
scoped_crud(app, "goals", "goals", GoalItem)
scoped_crud(app, "sips", "sips", SipItem)
scoped_crud(app, "insurance", "insurance_plans", InsurancePlanItem)
scoped_crud(app, "loans", "loans", LoanItem)


# --- Simulation ---
@app.post("/api/profiles/{profile_id}/simulate")
def api_simulate(profile_id: str):
    profile = get_profile(profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
        
    assets = get_items("assets", profile_id)
    goals = get_items("goals", profile_id)
    sips = get_items("sips", profile_id)
    insurance = get_items("insurance_plans", profile_id)
    loans = get_items("loans", profile_id)
    
    return run_simulation(
        profile=profile,
        assets=assets,
        goals=goals,
        sips=sips,
        insurance_plans=insurance,
        loans=loans
    )
