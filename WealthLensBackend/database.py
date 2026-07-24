"""
database.py — SQLite persistence layer for WealthLens 2.0
"""
import sqlite3
import json
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).parent / "wealth.db"

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Create all tables and seed default profile."""
    conn = get_conn()
    c = conn.cursor()
    
    c.execute("""CREATE TABLE IF NOT EXISTS profile (
        id INTEGER PRIMARY KEY,
        family_name TEXT DEFAULT 'My Family',
        current_age INTEGER DEFAULT 35,
        retirement_age INTEGER DEFAULT 60,
        life_expectancy INTEGER DEFAULT 85,
        annual_income REAL DEFAULT 0,
        savings_rate REAL DEFAULT 30,
        monthly_expenses_retirement REAL DEFAULT 60000,
        currency TEXT DEFAULT 'INR'
    )""")
    
    c.execute("""CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        name TEXT,
        asset_class TEXT DEFAULT 'equity',
        value REAL DEFAULT 0,
        return_rate REAL DEFAULT 8
    )""")
    
    c.execute("""CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        name TEXT,
        priority TEXT DEFAULT 'need',
        present_value REAL DEFAULT 0,
        target_year INTEGER DEFAULT 2030,
        inflation_rate REAL DEFAULT 6,
        goal_type TEXT DEFAULT 'lump_sum',
        recurring_frequency INTEGER
    )""")
    
    c.execute("""CREATE TABLE IF NOT EXISTS sips (
        id TEXT PRIMARY KEY,
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
        name TEXT DEFAULT 'Home Loan',
        loan_type TEXT DEFAULT 'home',
        principal REAL DEFAULT 0,
        total_months INTEGER DEFAULT 240,
        roi_pct REAL DEFAULT 8.5,
        emis_paid INTEGER DEFAULT 0
    )""")
    
    # Seed default profile if empty
    if c.execute('SELECT COUNT(*) FROM profile').fetchone()[0] == 0:
        c.execute("""INSERT INTO profile (family_name, current_age, retirement_age, life_expectancy,
            annual_income, savings_rate, monthly_expenses_retirement, currency)
            VALUES ('My Family', 35, 60, 85, 0, 30, 60000, 'INR')""")
    
    conn.commit()
    conn.close()


def get_profile() -> dict:
    conn = get_conn()
    row = conn.execute('SELECT * FROM profile WHERE id=1').fetchone()
    conn.close()
    return dict(row) if row else {}


def upsert_profile(data: dict):
    conn = get_conn()
    conn.execute("""UPDATE profile SET
        family_name=?, current_age=?, retirement_age=?, life_expectancy=?,
        annual_income=?, savings_rate=?, monthly_expenses_retirement=?, currency=?
        WHERE id=1""",
        (data.get('family_name', 'My Family'), data.get('current_age', 35),
         data.get('retirement_age', 60), data.get('life_expectancy', 85),
         data.get('annual_income', 0), data.get('savings_rate', 30),
         data.get('monthly_expenses_retirement', 60000), data.get('currency', 'INR'))
    )
    conn.commit()
    conn.close()


def get_all(table: str) -> list[dict]:
    conn = get_conn()
    rows = conn.execute(f'SELECT * FROM {table}').fetchall()
    conn.close()
    return [dict(r) for r in rows]


def insert_item(table: str, data: dict):
    conn = get_conn()
    cols = ', '.join(data.keys())
    placeholders = ', '.join(['?'] * len(data))
    conn.execute(f'INSERT INTO {table} ({cols}) VALUES ({placeholders})', list(data.values()))
    conn.commit()
    conn.close()


def update_item(table: str, item_id: str, data: dict):
    conn = get_conn()
    sets = ', '.join([f'{k}=?' for k in data.keys() if k != 'id'])
    vals = [v for k, v in data.items() if k != 'id'] + [item_id]
    conn.execute(f'UPDATE {table} SET {sets} WHERE id=?', vals)
    conn.commit()
    conn.close()


def delete_item(table: str, item_id: str):
    conn = get_conn()
    conn.execute(f'DELETE FROM {table} WHERE id=?', (item_id,))
    conn.commit()
    conn.close()
