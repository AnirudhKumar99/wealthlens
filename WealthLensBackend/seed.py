"""
seed.py — Populates wealth.db with realistic 'Sharma Family' profile.
Run this script to wipe existing db and re-seed.
"""
import uuid
import os
from database import DB_PATH, init_db, create_profile, insert_item, set_active_profile_id

if DB_PATH.exists():
    os.remove(DB_PATH)

print("DB removed. Initializing...")
init_db()

# Create main profile
profile_id = str(uuid.uuid4())
profile_data = {
    'family_name': 'Sharma Family',
    'current_age': 35,
    'retirement_age': 55,
    'life_expectancy': 85,
    'annual_income': 2400000, # 24L
    'savings_rate': 30,
    'monthly_expenses_retirement': 80000,
    'currency': 'INR'
}
create_profile(profile_id, profile_data)
set_active_profile_id(profile_id)
print(f"Created profile: Sharma Family (ID: {profile_id})")

# Assets
assets = [
    {'name': 'EPF', 'asset_class': 'debt', 'value': 1200000, 'return_rate': 8.1},
    {'name': 'Mutual Funds', 'asset_class': 'equity', 'value': 2500000, 'return_rate': 12.0},
    {'name': 'Emergency Fund (FD)', 'asset_class': 'debt', 'value': 500000, 'return_rate': 6.0},
    {'name': 'Physical Gold', 'asset_class': 'gold', 'value': 300000, 'return_rate': 7.0},
    {'name': 'Company Stocks (RSU)', 'asset_class': 'equity', 'value': 800000, 'return_rate': 15.0},
]
for a in assets:
    a['id'] = str(uuid.uuid4())
    a['profile_id'] = profile_id
    insert_item('assets', a)

# Goals
goals = [
    {'name': 'Child College Fund', 'priority': 'critical', 'present_value': 2000000, 'target_year': 2038, 'inflation_rate': 8, 'goal_type': 'lump_sum'},
    {'name': 'Europe Trip', 'priority': 'want', 'present_value': 500000, 'target_year': 2028, 'inflation_rate': 5, 'goal_type': 'lump_sum'},
    {'name': 'Car Upgrade', 'priority': 'need', 'present_value': 1200000, 'target_year': 2031, 'inflation_rate': 6, 'goal_type': 'lump_sum'},
    {'name': 'Kitchen Renovation', 'priority': 'want', 'present_value': 300000, 'target_year': 2029, 'inflation_rate': 6, 'goal_type': 'lump_sum'},
    {'name': 'Retirement Corpus Supplement', 'priority': 'critical', 'present_value': 10000000, 'target_year': 2046, 'inflation_rate': 6, 'goal_type': 'lump_sum'},
]
for g in goals:
    g['id'] = str(uuid.uuid4())
    g['profile_id'] = profile_id
    insert_item('goals', g)

# SIPs
sips = [
    {'name': 'Index Fund SIP', 'asset_class': 'equity', 'monthly_amount': 25000, 'step_up_pct': 10, 'return_rate': 12, 'start_year': 2026, 'end_year': 2046},
    {'name': 'Small Cap SIP', 'asset_class': 'equity', 'monthly_amount': 15000, 'step_up_pct': 5, 'return_rate': 14, 'start_year': 2026, 'end_year': 2036},
    {'name': 'PPF Contribution', 'asset_class': 'debt', 'monthly_amount': 12500, 'step_up_pct': 0, 'return_rate': 7.1, 'start_year': 2026, 'end_year': 2041},
    {'name': 'Gold ETF SIP', 'asset_class': 'gold', 'monthly_amount': 5000, 'step_up_pct': 5, 'return_rate': 8, 'start_year': 2026, 'end_year': 2036},
]
for s in sips:
    s['id'] = str(uuid.uuid4())
    s['profile_id'] = profile_id
    insert_item('sips', s)

# Insurance
insurance = [
    {'name': 'Term Life Insurance', 'annual_premium': 15000, 'premium_end_year': 2046, 'income_start_year': 2026, 'annual_income': 0, 'income_end_year': 2026, 'terminal_bonus': 0, 'death_benefit': 20000000, 'accidental_rider': 0},
    {'name': 'Guaranteed Income Plan', 'annual_premium': 100000, 'premium_end_year': 2033, 'income_start_year': 2038, 'annual_income': 150000, 'income_end_year': 2058, 'terminal_bonus': 500000, 'death_benefit': 1000000, 'accidental_rider': 0},
    {'name': 'Family Health Floater', 'annual_premium': 24000, 'premium_end_year': 2076, 'income_start_year': 2026, 'annual_income': 0, 'income_end_year': 2026, 'terminal_bonus': 0, 'death_benefit': 0, 'accidental_rider': 0},
    {'name': 'Parents Health Insurance', 'annual_premium': 45000, 'premium_end_year': 2046, 'income_start_year': 2026, 'annual_income': 0, 'income_end_year': 2026, 'terminal_bonus': 0, 'death_benefit': 0, 'accidental_rider': 0},
]
for i in insurance:
    i['id'] = str(uuid.uuid4())
    i['profile_id'] = profile_id
    insert_item('insurance_plans', i)

# Loans
loans = [
    {'name': 'Home Loan', 'loan_type': 'home', 'principal': 4500000, 'total_months': 240, 'roi_pct': 8.5, 'emis_paid': 24},
    {'name': 'Car Loan', 'loan_type': 'car', 'principal': 800000, 'total_months': 60, 'roi_pct': 9.2, 'emis_paid': 12},
    {'name': 'Education Loan', 'loan_type': 'education', 'principal': 500000, 'total_months': 84, 'roi_pct': 10.5, 'emis_paid': 6},
    {'name': 'Personal Loan', 'loan_type': 'personal', 'principal': 300000, 'total_months': 36, 'roi_pct': 14.0, 'emis_paid': 15},
]
for l in loans:
    l['id'] = str(uuid.uuid4())
    l['profile_id'] = profile_id
    insert_item('loans', l)

print("Database successfully seeded with realistic mock data.")
