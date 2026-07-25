"""
database.py — SQLite persistence layer for WealthLens 2.0 (Multi-profile)
"""
import sqlite3
import json
from pathlib import Path
from typing import Any, Optional

DB_PATH = Path(__file__).parent / "wealth.db"

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Create all tables with FKs and cascades."""
    conn = get_conn()
    c = conn.cursor()
    
    c.execute("""CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )""")
    
    c.execute("""CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        family_name TEXT NOT NULL DEFAULT 'My Family',
        current_age INTEGER DEFAULT 35,
        retirement_age INTEGER DEFAULT 60,
        life_expectancy INTEGER DEFAULT 85,
        annual_income REAL DEFAULT 0,
        savings_rate REAL DEFAULT 30,
        monthly_expenses_retirement REAL DEFAULT 60000,
        retirement_inflation_rate REAL DEFAULT 6.0,
        currency TEXT DEFAULT 'INR',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    )""")
    
    try:
        c.execute("ALTER TABLE profiles ADD COLUMN user_id TEXT")
    except Exception:
        pass

    try:
        c.execute("ALTER TABLE profiles ADD COLUMN retirement_inflation_rate REAL DEFAULT 6.0")
    except Exception:
        pass
    
    c.execute("""CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        name TEXT,
        asset_class TEXT DEFAULT 'equity',
        value REAL DEFAULT 0,
        return_rate REAL DEFAULT 8
    )""")
    
    c.execute("""CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        name TEXT,
        priority TEXT DEFAULT 'need',
        present_value REAL DEFAULT 0,
        target_year INTEGER DEFAULT 2030,
        inflation_rate REAL DEFAULT 6,
        goal_type TEXT DEFAULT 'lump_sum',
        duration_years INTEGER DEFAULT 1,
        step_up_pct REAL DEFAULT 0
    )""")
    
    c.execute("""CREATE TABLE IF NOT EXISTS sips (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        name TEXT,
        asset_class TEXT DEFAULT 'equity',
        monthly_amount REAL DEFAULT 0,
        step_up_pct REAL DEFAULT 0,
        return_rate REAL DEFAULT 12,
        start_year INTEGER DEFAULT 2026,
        end_year INTEGER
    )""")
    
    c.execute("""CREATE TABLE IF NOT EXISTS insurance_plans (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        name TEXT DEFAULT 'Insurance Plan',
        annual_premium REAL DEFAULT 0,
        premium_end_year INTEGER DEFAULT 2033,
        income_start_year INTEGER DEFAULT 2037,
        annual_income REAL DEFAULT 0,
        income_end_year INTEGER DEFAULT 2056,
        terminal_bonus REAL DEFAULT 0,
        death_benefit REAL DEFAULT 0,
        accidental_rider REAL DEFAULT 0
    )""")
    
    c.execute("""CREATE TABLE IF NOT EXISTS loans (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        name TEXT DEFAULT 'Home Loan',
        loan_type TEXT DEFAULT 'home',
        principal REAL DEFAULT 0,
        total_months INTEGER DEFAULT 240,
        roi_pct REAL DEFAULT 8.5,
        emis_paid INTEGER DEFAULT 0
    )""")
    
    c.execute("""CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_type TEXT NOT NULL,
        code TEXT NOT NULL,
        display_name TEXT NOT NULL,
        UNIQUE(category_type, code)
    )""")
    
    # Initialize settings if empty
    if c.execute("SELECT COUNT(*) FROM settings WHERE key='active_profile_id'").fetchone()[0] == 0:
        c.execute("INSERT INTO settings (key, value) VALUES ('active_profile_id', NULL)")
        
    # Seed categories if empty
    if c.execute("SELECT COUNT(*) FROM categories").fetchone()[0] == 0:
        default_categories = [
            ('asset_class', 'equity', 'Equity'),
            ('asset_class', 'debt', 'Debt'),
            ('asset_class', 'gold', 'Gold'),
            ('asset_class', 'real_estate', 'Real Estate'),
            ('goal_priority', 'critical', 'Critical'),
            ('goal_priority', 'need', 'Need'),
            ('goal_priority', 'want', 'Want'),
            ('loan_type', 'home', 'Home Loan'),
            ('loan_type', 'car', 'Car Loan'),
            ('loan_type', 'education', 'Education Loan'),
            ('loan_type', 'personal', 'Personal Loan'),
        ]
        c.executemany("INSERT INTO categories (category_type, code, display_name) VALUES (?, ?, ?)", default_categories)
        
    # Seed robust middle-class profile if no profiles exist
    if c.execute("SELECT COUNT(*) FROM profiles").fetchone()[0] == 0:
        import uuid
        import datetime
        now = datetime.datetime.now().isoformat()
        profile_id = str(uuid.uuid4())
        
        c.execute("""INSERT INTO profiles (id, family_name, current_age, retirement_age, life_expectancy, annual_income, savings_rate, monthly_expenses_retirement, retirement_inflation_rate, currency, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""", 
                     (profile_id, 'Sharma Family', 35, 60, 85, 2500000, 30, 80000, 6.0, 'INR', now, now))
        
        # Set as active
        c.execute("UPDATE settings SET value=? WHERE key='active_profile_id'", (profile_id,))
        
        # Seed Assets
        assets = [
            (str(uuid.uuid4()), profile_id, 'EPF Balance', 'debt', 2145000, 8.15),
            (str(uuid.uuid4()), profile_id, 'Equity Mutual Funds', 'equity', 3280000, 11.2),
            (str(uuid.uuid4()), profile_id, 'US Tech RSUs', 'equity', 1120000, 11.8),
            (str(uuid.uuid4()), profile_id, 'Emergency FD', 'debt', 475000, 6.8),
            (str(uuid.uuid4()), profile_id, 'Sovereign Gold Bonds', 'gold', 360000, 8.0)
        ]
        c.executemany("INSERT INTO assets (id, profile_id, name, asset_class, value, return_rate) VALUES (?, ?, ?, ?, ?, ?)", assets)
        
        # Seed Goals
        curr_year = datetime.datetime.now().year
        goals = [
            (str(uuid.uuid4()), profile_id, 'Dream Home Downpayment', 'need', 1850000, curr_year + 6, 5.5, 'lump_sum', 1, 0),
            (str(uuid.uuid4()), profile_id, 'Child Higher Education', 'critical', 1420000, curr_year + 12, 6.5, 'recurring', 4, 5.0),
            (str(uuid.uuid4()), profile_id, 'Car Upgrade', 'want', 780000, curr_year + 4, 5.0, 'lump_sum', 1, 0)
        ]
        c.executemany("INSERT INTO goals (id, profile_id, name, priority, present_value, target_year, inflation_rate, goal_type, duration_years, step_up_pct) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", goals)
        
        # Seed SIPs
        sips = [
            (str(uuid.uuid4()), profile_id, 'Nifty Index Fund SIP', 'equity', 22500, 1.5, 10.8, curr_year, curr_year + 5),
            (str(uuid.uuid4()), profile_id, 'Flexi Cap Fund SIP', 'equity', 14800, 1.0, 11.2, curr_year, curr_year + 5),
            (str(uuid.uuid4()), profile_id, 'PPF Monthly Contribution', 'debt', 8500, 1.0, 7.1, curr_year, curr_year + 5)
        ]
        c.executemany("INSERT INTO sips (id, profile_id, name, asset_class, monthly_amount, step_up_pct, return_rate, start_year, end_year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", sips)
        
        # Seed Loans
        loans = [
            (str(uuid.uuid4()), profile_id, 'Car Loan', 'car', 480000, 60, 8.5, 36)
        ]
        c.executemany("INSERT INTO loans (id, profile_id, name, loan_type, principal, total_months, roi_pct, emis_paid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", loans)
        
        # Seed Insurance Plans
        insurance = [
            (str(uuid.uuid4()), profile_id, 'Term Life & Pension Plan', 28000, curr_year + 12, curr_year + 15, 85000, curr_year + 28, 150000, 750000, 300000)
        ]
        c.executemany("INSERT INTO insurance_plans (id, profile_id, name, annual_premium, premium_end_year, income_start_year, annual_income, income_end_year, terminal_bonus, death_benefit, accidental_rider) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", insurance)
    conn.commit()
    conn.close()

# --- Active Profile Settings ---
def get_active_profile_id() -> Optional[str]:
    conn = get_conn()
    row = conn.execute("SELECT value FROM settings WHERE key='active_profile_id'").fetchone()
    conn.close()
    return row['value'] if row and row['value'] else None

def set_active_profile_id(profile_id: Optional[str]):
    conn = get_conn()
    conn.execute("UPDATE settings SET value=? WHERE key='active_profile_id'", (profile_id,))
    conn.commit()
    conn.close()

def get_categories() -> list[dict]:
    conn = get_conn()
    rows = conn.execute("SELECT * FROM categories ORDER BY category_type, id").fetchall()
    conn.close()
    return [dict(r) for r in rows]

# --- Profiles CRUD ---
def get_all_profiles() -> list[dict]:
    conn = get_conn()
    rows = conn.execute("SELECT id, family_name, created_at FROM profiles ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_profile(profile_id: str) -> Optional[dict]:
    conn = get_conn()
    row = conn.execute("SELECT * FROM profiles WHERE id=?", (profile_id,)).fetchone()
    conn.close()
    return dict(row) if row else None

def seed_profile_defaults(conn, profile_id: str):
    import uuid, datetime
    curr_year = datetime.datetime.now().year

    # Assets (Total ~73.8 Lakhs)
    assets = [
        (str(uuid.uuid4()), profile_id, 'EPF Balance', 'debt', 2145000, 8.15),
        (str(uuid.uuid4()), profile_id, 'Equity Mutual Funds', 'equity', 3280000, 11.2),
        (str(uuid.uuid4()), profile_id, 'US Tech RSUs', 'equity', 1120000, 11.8),
        (str(uuid.uuid4()), profile_id, 'Emergency FD', 'debt', 475000, 6.8),
        (str(uuid.uuid4()), profile_id, 'Sovereign Gold Bonds', 'gold', 360000, 8.0)
    ]
    conn.executemany("INSERT INTO assets (id, profile_id, name, asset_class, value, return_rate) VALUES (?, ?, ?, ?, ?, ?)", assets)

    # Goals
    goals = [
        (str(uuid.uuid4()), profile_id, 'Dream Home Downpayment', 'need', 1850000, curr_year + 6, 5.5, 'lump_sum', 1, 0),
        (str(uuid.uuid4()), profile_id, 'Child Higher Education', 'critical', 1420000, curr_year + 12, 6.5, 'recurring', 4, 5.0),
        (str(uuid.uuid4()), profile_id, 'Car Upgrade', 'want', 780000, curr_year + 4, 5.0, 'lump_sum', 1, 0)
    ]
    conn.executemany("INSERT INTO goals (id, profile_id, name, priority, present_value, target_year, inflation_rate, goal_type, duration_years, step_up_pct) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", goals)

    # SIPs (Total ~45.7k/month with step-ups)
    sips = [
        (str(uuid.uuid4()), profile_id, 'Nifty Index Fund SIP', 'equity', 22500, 1.5, 10.8, curr_year, curr_year + 5),
        (str(uuid.uuid4()), profile_id, 'Flexi Cap Fund SIP', 'equity', 14800, 1.0, 11.2, curr_year, curr_year + 5),
        (str(uuid.uuid4()), profile_id, 'PPF Monthly Contribution', 'debt', 8500, 1.0, 7.1, curr_year, curr_year + 5)
    ]
    conn.executemany("INSERT INTO sips (id, profile_id, name, asset_class, monthly_amount, step_up_pct, return_rate, start_year, end_year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", sips)

    # Loans
    loans = [
        (str(uuid.uuid4()), profile_id, 'Car Loan', 'car', 480000, 60, 8.5, 36)
    ]
    conn.executemany("INSERT INTO loans (id, profile_id, name, loan_type, principal, total_months, roi_pct, emis_paid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", loans)

    # Insurance
    insurance = [
        (str(uuid.uuid4()), profile_id, 'Term Life & Pension Plan', 28000, curr_year + 12, curr_year + 15, 85000, curr_year + 28, 150000, 750000, 300000)
    ]
    conn.executemany("INSERT INTO insurance_plans (id, profile_id, name, annual_premium, premium_end_year, income_start_year, annual_income, income_end_year, terminal_bonus, death_benefit, accidental_rider) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", insurance)


def create_profile(profile_id: str, data: dict):
    conn = get_conn()
    conn.execute("""INSERT INTO profiles 
        (id, user_id, family_name, current_age, retirement_age, life_expectancy, annual_income, savings_rate, monthly_expenses_retirement, retirement_inflation_rate, currency)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (profile_id, data.get('user_id'), data.get('family_name', 'My Profile'), data.get('current_age', 34),
         data.get('retirement_age', 60), data.get('life_expectancy', 82),
         data.get('annual_income', 2160000), data.get('savings_rate', 35.0),
         data.get('monthly_expenses_retirement', 40000), data.get('retirement_inflation_rate', 7.0),
         data.get('currency', 'INR'))
    )
    seed_profile_defaults(conn, profile_id)
    conn.commit()
    conn.close()

def update_profile(profile_id: str, data: dict):
    conn = get_conn()
    conn.execute("""UPDATE profiles SET
        family_name=?, current_age=?, retirement_age=?, life_expectancy=?,
        annual_income=?, savings_rate=?, monthly_expenses_retirement=?, retirement_inflation_rate=?, currency=?,
        updated_at=datetime('now')
        WHERE id=?""",
        (data.get('family_name', 'My Family'), data.get('current_age', 35),
         data.get('retirement_age', 60), data.get('life_expectancy', 85),
         data.get('annual_income', 0), data.get('savings_rate', 30),
         data.get('monthly_expenses_retirement', 60000), data.get('retirement_inflation_rate', 6.0),
         data.get('currency', 'INR'),
         profile_id)
    )
    conn.commit()
    conn.close()

def delete_profile(profile_id: str):
    conn = get_conn()
    # This will cascade delete assets, goals, etc. because of ON DELETE CASCADE
    conn.execute("DELETE FROM profiles WHERE id=?", (profile_id,))
    # Clear active if we deleted the active one
    active = conn.execute("SELECT value FROM settings WHERE key='active_profile_id'").fetchone()
    if active and active['value'] == profile_id:
        conn.execute("UPDATE settings SET value=NULL WHERE key='active_profile_id'")
    conn.commit()
    conn.close()

# --- Generic Profile-Scoped Item CRUD ---
def get_items(table: str, profile_id: str) -> list[dict]:
    conn = get_conn()
    rows = conn.execute(f"SELECT * FROM {table} WHERE profile_id=?", (profile_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def insert_item(table: str, data: dict):
    conn = get_conn()
    cols = ', '.join(data.keys())
    placeholders = ', '.join(['?'] * len(data))
    conn.execute(f"INSERT INTO {table} ({cols}) VALUES ({placeholders})", list(data.values()))
    conn.commit()
    conn.close()

def update_item(table: str, item_id: str, profile_id: str, data: dict):
    conn = get_conn()
    # Exclude id and profile_id from update
    update_data = {k: v for k, v in data.items() if k not in ('id', 'profile_id')}
    sets = ', '.join([f"{k}=?" for k in update_data.keys()])
    vals = list(update_data.values()) + [item_id, profile_id]
    conn.execute(f"UPDATE {table} SET {sets} WHERE id=? AND profile_id=?", vals)
    conn.commit()
    conn.close()

def delete_item(table: str, item_id: str, profile_id: str):
    conn = get_conn()
    conn.execute(f"DELETE FROM {table} WHERE id=? AND profile_id=?", (item_id, profile_id))
    conn.commit()
    conn.close()

# --- User CRUD ---
def create_user(user_id: str, username: str, email: str, password_hash: str, salt: str) -> dict:
    conn = get_conn()
    conn.execute("INSERT INTO users (id, username, email, password_hash, salt) VALUES (?, ?, ?, ?, ?)",
                 (user_id, username, email, password_hash, salt))
    conn.commit()
    conn.close()
    return {"id": user_id, "username": username, "email": email}

def get_user_by_email(email: str) -> Optional[dict]:
    conn = get_conn()
    row = conn.execute("SELECT * FROM users WHERE LOWER(email)=LOWER(?)", (email,)).fetchone()
    conn.close()
    return dict(row) if row else None

def get_user_by_id(user_id: str) -> Optional[dict]:
    conn = get_conn()
    row = conn.execute("SELECT id, username, email, created_at FROM users WHERE id=?", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else None

def get_profiles_by_user_id(user_id: str) -> list[dict]:
    conn = get_conn()
    rows = conn.execute("SELECT * FROM profiles WHERE user_id=? ORDER BY created_at DESC", (user_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]
