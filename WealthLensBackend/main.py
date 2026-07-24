from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uuid

from models import ProfileModel, AssetItem, GoalItem, SipItem, InsurancePlanItem, LoanItem
from database import init_db, get_profile, upsert_profile, get_all, insert_item, update_item, delete_item
from calculations import run_simulation

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    init_db()

@app.get("/")
def read_root():
    return {"message": "WealthLens API 2.0", "docs": "/docs"}

# --- Profile ---
@app.get("/api/profile", response_model=ProfileModel)
def read_profile():
    return get_profile()

@app.put("/api/profile")
def update_profile(profile: ProfileModel):
    upsert_profile(profile.model_dump())
    return {"message": "Profile updated successfully"}

# --- Assets ---
@app.get("/api/assets", response_model=list[AssetItem])
def get_assets():
    return get_all("assets")

@app.post("/api/assets", response_model=AssetItem)
def create_asset(item: AssetItem):
    if not item.id:
        item.id = str(uuid.uuid4())
    insert_item("assets", item.model_dump())
    return item

@app.put("/api/assets/{item_id}", response_model=AssetItem)
def update_asset(item_id: str, item: AssetItem):
    update_item("assets", item_id, item.model_dump())
    return item

@app.delete("/api/assets/{item_id}")
def delete_asset(item_id: str):
    delete_item("assets", item_id)
    return {"message": "Asset deleted"}

# --- Goals ---
@app.get("/api/goals", response_model=list[GoalItem])
def get_goals():
    return get_all("goals")

@app.post("/api/goals", response_model=GoalItem)
def create_goal(item: GoalItem):
    if not item.id:
        item.id = str(uuid.uuid4())
    insert_item("goals", item.model_dump())
    return item

@app.put("/api/goals/{item_id}", response_model=GoalItem)
def update_goal(item_id: str, item: GoalItem):
    update_item("goals", item_id, item.model_dump())
    return item

@app.delete("/api/goals/{item_id}")
def delete_goal(item_id: str):
    delete_item("goals", item_id)
    return {"message": "Goal deleted"}

# --- SIPs ---
@app.get("/api/sips", response_model=list[SipItem])
def get_sips():
    return get_all("sips")

@app.post("/api/sips", response_model=SipItem)
def create_sip(item: SipItem):
    if not item.id:
        item.id = str(uuid.uuid4())
    insert_item("sips", item.model_dump())
    return item

@app.put("/api/sips/{item_id}", response_model=SipItem)
def update_sip(item_id: str, item: SipItem):
    update_item("sips", item_id, item.model_dump())
    return item

@app.delete("/api/sips/{item_id}")
def delete_sip(item_id: str):
    delete_item("sips", item_id)
    return {"message": "SIP deleted"}

# --- Insurance ---
@app.get("/api/insurance", response_model=list[InsurancePlanItem])
def get_insurance():
    return get_all("insurance_plans")

@app.post("/api/insurance", response_model=InsurancePlanItem)
def create_insurance(item: InsurancePlanItem):
    if not item.id:
        item.id = str(uuid.uuid4())
    insert_item("insurance_plans", item.model_dump())
    return item

@app.put("/api/insurance/{item_id}", response_model=InsurancePlanItem)
def update_insurance(item_id: str, item: InsurancePlanItem):
    update_item("insurance_plans", item_id, item.model_dump())
    return item

@app.delete("/api/insurance/{item_id}")
def delete_insurance(item_id: str):
    delete_item("insurance_plans", item_id)
    return {"message": "Insurance deleted"}

# --- Loans ---
@app.get("/api/loans", response_model=list[LoanItem])
def get_loans():
    return get_all("loans")

@app.post("/api/loans", response_model=LoanItem)
def create_loan(item: LoanItem):
    if not item.id:
        item.id = str(uuid.uuid4())
    insert_item("loans", item.model_dump())
    return item

@app.put("/api/loans/{item_id}", response_model=LoanItem)
def update_loan(item_id: str, item: LoanItem):
    update_item("loans", item_id, item.model_dump())
    return item

@app.delete("/api/loans/{item_id}")
def delete_loan(item_id: str):
    delete_item("loans", item_id)
    return {"message": "Loan deleted"}

# --- Simulate ---
@app.post("/api/simulate")
def simulate():
    profile = get_profile()
    assets = get_all("assets")
    goals = get_all("goals")
    sips = get_all("sips")
    insurance = get_all("insurance_plans")
    loans = get_all("loans")
    
    return run_simulation(
        profile=profile,
        assets=assets,
        goals=goals,
        sips=sips,
        insurance_plans=insurance,
        loans=loans
    )
