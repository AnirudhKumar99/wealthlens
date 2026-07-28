"""
models.py — Pydantic v2 request/response models for WealthLens 2.0
"""
from pydantic import BaseModel, Field
from typing import Optional


class UserRegisterModel(BaseModel):
    username: str = Field(min_length=2, max_length=50)
    email: str = Field(min_length=5)
    password: str = Field(min_length=4)


class UserLoginModel(BaseModel):
    email: str
    password: str


class ProfileModel(BaseModel):
    id: str = Field(default="")
    user_id: Optional[str] = Field(default="")
    family_name: str = Field(default="My Family")
    current_age: int = Field(default=35, ge=1, le=80)
    retirement_age: int = Field(default=60, ge=18, le=85)
    life_expectancy: int = Field(default=85, ge=30, le=90)
    annual_income: float = Field(default=0.0, ge=0)
    savings_rate: float = Field(default=30.0, ge=0, le=100)
    monthly_expenses_retirement: float = Field(default=60000.0, ge=0)
    retirement_inflation_rate: float = Field(default=6.0, ge=0, le=50)
    currency: str = Field(default="INR")


class AssetItem(BaseModel):
    id: str = Field(default="")
    profile_id: str = Field(default="")
    name: str = Field(default="")
    asset_class: str = Field(default="equity")
    value: float = Field(default=0.0, ge=0)
    return_rate: float = Field(default=8.0, ge=0, le=100)


class GoalItem(BaseModel):
    id: str = Field(default="")
    profile_id: str = Field(default="")
    name: str = Field(default="")
    priority: str = Field(default="need")
    present_value: float = Field(default=0.0, ge=0)
    target_year: int = Field(default=2030)
    inflation_rate: float = Field(default=6.0, ge=0, le=50)
    goal_type: str = Field(default="lump_sum")
    duration_years: Optional[int] = Field(default=1)
    step_up_pct: Optional[float] = Field(default=0.0)
    is_active: bool = Field(default=True)


class SipItem(BaseModel):
    id: str = Field(default="")
    profile_id: str = Field(default="")
    name: str = Field(default="")
    asset_class: str = Field(default="equity")
    monthly_amount: float = Field(default=0.0, ge=0)
    step_up_pct: float = Field(default=0.0, ge=0, le=100)
    return_rate: float = Field(default=12.0, ge=0, le=100)
    start_year: int = Field(default=2026)
    end_year: Optional[int] = Field(default=None)


class InsurancePlanItem(BaseModel):
    id: str = Field(default="")
    profile_id: str = Field(default="")
    name: str = Field(default="Insurance Plan")
    policy_type: str = Field(default="endowment")
    annual_premium: float = Field(default=0.0, ge=0)
    premium_end_year: int = Field(default=2033)
    income_start_year: int = Field(default=2037)
    annual_income: float = Field(default=0.0, ge=0)
    income_end_year: int = Field(default=2056)
    terminal_bonus: float = Field(default=0.0, ge=0)
    death_benefit: float = Field(default=0.0, ge=0)
    accidental_rider: float = Field(default=0.0, ge=0)
    annual_bonus_rate: float = Field(default=0.0, ge=0, le=100)
    is_compounded_bonus: bool = Field(default=False)


class LoanItem(BaseModel):
    id: str = Field(default="")
    profile_id: str = Field(default="")
    name: str = Field(default="Home Loan")
    loan_type: str = Field(default="home")
    principal: float = Field(default=0.0, ge=0)
    total_months: int = Field(default=240, ge=1)
    roi_pct: float = Field(default=8.5, ge=0, le=100)
    emis_paid: int = Field(default=0, ge=0)
