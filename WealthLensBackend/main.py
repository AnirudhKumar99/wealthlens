import uuid
from typing import Optional
from fastapi import FastAPI, HTTPException, Header, Query
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from models import ProfileModel, AssetItem, GoalItem, SipItem, InsurancePlanItem, LoanItem, UserRegisterModel, UserLoginModel
from database import (
    init_db, get_active_profile_id, set_active_profile_id, get_all_profiles,
    get_profile, create_profile, update_profile, delete_profile,
    get_items, insert_item, update_item, delete_item, get_categories,
    create_user, get_user_by_email, get_user_by_id, get_profiles_by_user_id,
    get_family_summary_data
)
from auth import hash_password, verify_password, create_access_token, decode_access_token
from calculations import run_simulation
from excel_exporter import generate_financial_excel_report

app = FastAPI(title="WealthLens API 2.0 (Multi-Profile)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

# --- Auth Helpers ---
def get_user_id_from_header(authorization: Optional[str] = Header(None)) -> Optional[str]:
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        payload = decode_access_token(token)
        if payload:
            return payload.get("sub")
    return None

def verify_user_profile_access(profile_id: str, user_id: Optional[str]) -> dict:
    profile = get_profile(profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    if user_id and profile.get("user_id") and profile.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied to this profile")
    return profile

# --- Auth Routes ---
@app.post("/api/auth/register")
def api_register(payload: UserRegisterModel):
    existing = get_user_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    
    user_id = str(uuid.uuid4())
    pw_hash, salt = hash_password(payload.password)
    user = create_user(user_id, payload.username, payload.email, pw_hash, salt)
    
    # Automatically create a fresh, clean default profile for this user (NO sample data seeded)
    pid = str(uuid.uuid4())
    create_profile(pid, {
        "user_id": user_id,
        "family_name": f"{payload.username}'s Wealth Profile",
        "current_age": 34,
        "retirement_age": 60,
        "life_expectancy": 82,
        "annual_income": 0,
        "savings_rate": 30.0,
        "monthly_expenses_retirement": 40000,
        "retirement_inflation_rate": 6.0,
        "currency": "INR"
    }, seed_defaults=False)
    
    token = create_access_token({"sub": user_id, "email": payload.email, "username": payload.username})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
        "active_profile_id": pid
    }

@app.post("/api/auth/login")
def api_login(payload: UserLoginModel):
    user = get_user_by_email(payload.email)
    if not user or not verify_password(payload.password, user["salt"], user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    
    user_profiles = get_profiles_by_user_id(user["id"])
    if not user_profiles:
        pid = str(uuid.uuid4())
        create_profile(pid, {
            "user_id": user["id"],
            "family_name": f"{user['username']}'s Wealth Profile",
            "current_age": 34,
            "retirement_age": 60,
            "life_expectancy": 82,
            "annual_income": 0,
            "savings_rate": 30.0,
            "monthly_expenses_retirement": 40000,
            "retirement_inflation_rate": 6.0,
            "currency": "INR"
        }, seed_defaults=False)
        active_pid = pid
        user_profiles = get_profiles_by_user_id(user["id"])
    else:
        active_pid = user_profiles[0]["id"]
        
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
def api_get_active_profile(authorization: Optional[str] = Header(None)):
    uid = get_user_id_from_header(authorization)
    if uid:
        user_profs = get_profiles_by_user_id(uid)
        if user_profs:
            return {"active_profile_id": user_profs[0]["id"]}
    pid = get_active_profile_id()
    return {"active_profile_id": pid}

@app.put("/api/profiles/active/{profile_id}")
def api_set_active_profile(profile_id: str, authorization: Optional[str] = Header(None)):
    uid = get_user_id_from_header(authorization)
    verify_user_profile_access(profile_id, uid)
    if not uid:
        set_active_profile_id(profile_id)
    return {"message": "Active profile updated", "active_profile_id": profile_id}

@app.get("/api/profiles")
def api_get_profiles(authorization: Optional[str] = Header(None)):
    uid = get_user_id_from_header(authorization)
    if uid:
        return get_profiles_by_user_id(uid)
    # Unauthenticated / guest mode
    all_profs = get_all_profiles()
    return [p for p in all_profs if not p.get("user_id")]

@app.post("/api/profiles")
def api_create_profile(data: ProfileModel, authorization: Optional[str] = Header(None)):
    uid = get_user_id_from_header(authorization)
    user_id = data.user_id or uid
            
    pid = str(uuid.uuid4())
    pdata = data.model_dump(exclude={"id"})
    if user_id:
        pdata["user_id"] = user_id
    create_profile(pid, pdata, seed_defaults=False)
    if not user_id:
        set_active_profile_id(pid)
    return {"message": "Profile created", "id": pid}

@app.put("/api/profiles/{profile_id}")
def api_update_profile(profile_id: str, data: ProfileModel, authorization: Optional[str] = Header(None)):
    uid = get_user_id_from_header(authorization)
    verify_user_profile_access(profile_id, uid)
    update_profile(profile_id, data.model_dump(exclude={"id"}))
    return {"message": "Profile updated"}

@app.delete("/api/profiles/{profile_id}")
def api_delete_profile(profile_id: str, authorization: Optional[str] = Header(None)):
    uid = get_user_id_from_header(authorization)
    verify_user_profile_access(profile_id, uid)
    delete_profile(profile_id)
    return {"message": "Profile deleted"}

@app.get("/api/profiles/{profile_id}")
def api_get_profile(profile_id: str, authorization: Optional[str] = Header(None)):
    uid = get_user_id_from_header(authorization)
    return verify_user_profile_access(profile_id, uid)


# --- Scoped CRUD Helpers ---
def scoped_crud(router, prefix, table_name, model_class):
    
    @router.get(f"/api/profiles/{{profile_id}}/{prefix}")
    def _get_all(profile_id: str, authorization: Optional[str] = Header(None)):
        uid = get_user_id_from_header(authorization)
        verify_user_profile_access(profile_id, uid)
        return get_items(table_name, profile_id)
        
    @router.post(f"/api/profiles/{{profile_id}}/{prefix}")
    def _create(profile_id: str, data: model_class, authorization: Optional[str] = Header(None)):
        uid = get_user_id_from_header(authorization)
        verify_user_profile_access(profile_id, uid)
        item_id = str(uuid.uuid4())
        dumped = data.model_dump()
        dumped['id'] = item_id
        dumped['profile_id'] = profile_id
        insert_item(table_name, dumped)
        return {"id": item_id, "message": "Created"}
        
    @router.put(f"/api/profiles/{{profile_id}}/{prefix}/{{item_id}}")
    def _update(profile_id: str, item_id: str, data: model_class, authorization: Optional[str] = Header(None)):
        uid = get_user_id_from_header(authorization)
        verify_user_profile_access(profile_id, uid)
        update_item(table_name, item_id, profile_id, data.model_dump())
        return {"message": "Updated"}
        
    @router.delete(f"/api/profiles/{{profile_id}}/{prefix}/{{item_id}}")
    def _delete(profile_id: str, item_id: str, authorization: Optional[str] = Header(None)):
        uid = get_user_id_from_header(authorization)
        verify_user_profile_access(profile_id, uid)
        delete_item(table_name, item_id, profile_id)
        return {"message": "Deleted"}

scoped_crud(app, "assets", "assets", AssetItem)
scoped_crud(app, "goals", "goals", GoalItem)
scoped_crud(app, "sips", "sips", SipItem)
scoped_crud(app, "insurance", "insurance_plans", InsurancePlanItem)
scoped_crud(app, "loans", "loans", LoanItem)


# --- Simulation ---
@app.post("/api/profiles/{profile_id}/simulate")
def api_simulate(profile_id: str, authorization: Optional[str] = Header(None)):
    uid = get_user_id_from_header(authorization)
    profile = verify_user_profile_access(profile_id, uid)
        
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


# --- Family Household Summary ---
@app.get("/api/family/summary")
def api_get_family_summary(authorization: Optional[str] = Header(None)):
    uid = get_user_id_from_header(authorization)
    if not uid:
        raise HTTPException(status_code=401, detail="Authentication required for family summary")
    
    summary = get_family_summary_data(uid)
    profiles = summary["profiles"]
    combined_assets = summary["combined_assets"]
    combined_goals = summary["combined_goals"]
    combined_sips = summary["combined_sips"]
    combined_insurance = summary["combined_insurance"]
    combined_loans = summary["combined_loans"]

    member_cards = []
    total_assets_val = sum(float(a.get("value", 0)) for a in combined_assets)
    total_debt_val = sum(float(l.get("principal", 0)) for l in combined_loans)
    total_monthly_sip = sum(float(s.get("monthly_amount", 0)) for s in combined_sips)
    net_worth = total_assets_val - total_debt_val

    alloc = {"equity": 0.0, "debt": 0.0, "hybrid": 0.0, "gold": 0.0, "real_estate": 0.0, "other": 0.0}
    for a in combined_assets:
        ac = a.get("asset_class", "other")
        alloc[ac] = alloc.get(ac, 0.0) + float(a.get("value", 0))

    health_scores = []
    for p in profiles:
        pid = p["id"]
        p_assets = [a for a in combined_assets if a.get("profile_id") == pid]
        p_goals = [g for g in combined_goals if g.get("profile_id") == pid]
        p_sips = [s for s in combined_sips if s.get("profile_id") == pid]
        p_insurance = [i for i in combined_insurance if i.get("profile_id") == pid]
        p_loans = [l for l in combined_loans if l.get("profile_id") == pid]
        
        sim = run_simulation(p, p_assets, p_goals, p_sips, p_insurance, p_loans)
        score = sim.get("health_score", 70)
        health_scores.append(score)
        
        p_val = sum(float(a.get("value", 0)) for a in p_assets)
        p_sip = sum(float(s.get("monthly_amount", 0)) for s in p_sips)
        
        member_cards.append({
            "id": pid,
            "name": p.get("family_name", "Member"),
            "role": p.get("role", "Family Member"),
            "portfolio_value": p_val,
            "monthly_sip": p_sip,
            "asset_count": len(p_assets),
            "goal_count": len(p_goals),
            "health_score": score,
            "current_age": p.get("current_age", 35),
            "retirement_age": p.get("retirement_age", 60)
        })

    avg_health_score = int(sum(health_scores) / len(health_scores)) if health_scores else 75

    return {
        "user_id": uid,
        "kpis": {
            "net_worth": net_worth,
            "total_assets": total_assets_val,
            "total_debt": total_debt_val,
            "monthly_sip": total_monthly_sip,
            "health_score": avg_health_score,
            "total_members": len(profiles),
            "total_assets_count": len(combined_assets),
            "total_goals_count": len(combined_goals),
            "total_sips_count": len(combined_sips),
            "total_insurance_count": len(combined_insurance),
            "total_loans_count": len(combined_loans)
        },
        "allocation": alloc,
        "member_cards": member_cards,
        "combined_assets": combined_assets,
        "combined_goals": combined_goals,
        "combined_sips": combined_sips,
        "combined_insurance": combined_insurance,
        "combined_loans": combined_loans
    }


# --- Excel Export ---
@app.get("/api/profiles/{profile_id}/export-excel")
def api_export_excel(profile_id: str, token: Optional[str] = Query(None), authorization: Optional[str] = Header(None)):
    uid = get_user_id_from_header(authorization)
    if not uid and token:
        payload = decode_access_token(token)
        if payload:
            uid = payload.get("sub")

    profile = verify_user_profile_access(profile_id, uid)
        
    assets = get_items("assets", profile_id)
    goals = get_items("goals", profile_id)
    sips = get_items("sips", profile_id)
    insurance = get_items("insurance_plans", profile_id)
    loans = get_items("loans", profile_id)
    
    sim_result = run_simulation(
        profile=profile,
        assets=assets,
        goals=goals,
        sips=sips,
        insurance_plans=insurance,
        loans=loans
    )

    excel_stream = generate_financial_excel_report(
        profile=profile,
        assets=assets,
        goals=goals,
        sips=sips,
        insurance_plans=insurance,
        loans=loans,
        sim_result=sim_result
    )

    family_slug = (profile.get("family_name") or "Family").replace(" ", "_")
    filename = f"WealthLens_Report_{family_slug}.xlsx"

    return Response(
        content=excel_stream.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
