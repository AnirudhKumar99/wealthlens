"""
main.py
FastAPI application entry point for the Family Wealth Planning Dashboard.
"""

from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field

from calculations import run_simulation

# ─── Application Setup ────────────────────────────────────────────────────────

app = FastAPI(
    title="Family Financial Lifecycle & Wealth Planning Dashboard",
    description=(
        "Production-ready family wealth simulator: dynamic goals, "
        "asset projection, inflation-adjusted compounding, and executive summaries."
    ),
    version="1.0.0",
)

BASE_DIR = Path(__file__).resolve().parent
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


# ─── Pydantic Request Models ──────────────────────────────────────────────────

class ProfileModel(BaseModel):
    family_name:                 str   = "My Family"
    current_age:                 int   = Field(35,      ge=1,   le=80)
    retirement_age:              int   = Field(60,      ge=18,  le=85)
    life_expectancy:             int   = Field(85,      ge=30,  le=90)
    annual_income:               float = Field(0.0,    ge=0)
    savings_rate:                float = Field(30.0,   ge=0,   le=100)
    monthly_expenses_retirement: float = Field(60000.0, ge=0)
    currency:                    str   = "INR"


class AssetItem(BaseModel):
    id:          str   = ""
    name:        str   = ""
    asset_class: str   = "equity"
    value:       float = Field(0.0, ge=0)
    return_rate: float = Field(8.0, ge=0, le=100)


class GoalItem(BaseModel):
    id:                  str           = ""
    name:                str           = ""
    priority:            str           = "need"
    present_value:       float         = Field(0.0, ge=0)
    target_year:         int           = 2030
    inflation_rate:      float         = Field(6.0, ge=0, le=50)
    goal_type:           str           = "lump_sum"
    recurring_frequency: Optional[int] = None


class SipItem(BaseModel):
    id:             str           = ""
    name:           str           = ""
    asset_class:    str           = "equity"
    monthly_amount: float         = Field(0.0, ge=0)
    step_up_pct:    float         = Field(0.0, ge=0, le=100)
    return_rate:    float         = Field(12.0, ge=0, le=100)
    start_year:     int           = 2026
    end_year:       Optional[int] = None


class InsurancePlanItem(BaseModel):
    id:                str           = ""
    name:              str           = "Insurance Plan"
    annual_premium:    float         = Field(0.0, ge=0)
    premium_end_year:  int           = 2033
    income_start_year: int           = 2037
    annual_income:     float         = Field(0.0, ge=0)
    income_end_year:   int           = 2056
    terminal_bonus:    float         = Field(0.0, ge=0)
    death_benefit:     float         = Field(0.0, ge=0)
    accidental_rider:  float         = Field(0.0, ge=0)


class SimulationRequest(BaseModel):
    profile:          ProfileModel
    assets:           List[AssetItem]          = []
    goals:            List[GoalItem]           = []
    sips:             List[SipItem]            = []
    insurance_plans:  List[InsurancePlanItem]  = []


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    """Serve the main planning dashboard."""
    return templates.TemplateResponse(
        "dashboard.html",
        {
            "request":    request,
            "page_title": "Family Wealth Planning Dashboard",
        },
    )


@app.post("/api/simulate")
async def simulate(payload: SimulationRequest):
    """
    Run the full year-by-year wealth simulation.

    Accepts a JSON payload with profile, assets, and goals.
    Returns yearly_data, goal_details, asset_allocation, and a summary KPI block.
    """
    return run_simulation(
        profile=payload.profile.model_dump(),
        assets=[a.model_dump() for a in payload.assets],
        goals=[g.model_dump()  for g in payload.goals],
        sips=[s.model_dump()   for s in payload.sips],
        insurance_plans=[p.model_dump() for p in payload.insurance_plans],
    )
