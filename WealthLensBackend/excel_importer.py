"""
excel_importer.py — Excel workbook parser & data importer for WealthLens 2.0
Supports both Family Household import (multi-profile) and Single Profile import.
"""
import uuid
import io
from typing import Optional
import openpyxl

from database import (
    get_conn, create_profile, insert_item,
    get_profiles_by_user_id
)


def _safe_float(val, default=0.0):
    """Safely convert a cell value to float."""
    if val is None:
        return default
    try:
        # Handle percentage strings like "12.5%"
        if isinstance(val, str):
            val = val.strip().replace('%', '').replace(',', '').replace('₹', '')
            if not val:
                return default
        return float(val)
    except (ValueError, TypeError):
        return default


def _safe_int(val, default=0):
    """Safely convert a cell value to int."""
    if val is None:
        return default
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return default


def _safe_str(val, default=''):
    """Safely convert a cell value to string."""
    if val is None:
        return default
    return str(val).strip()


def _find_header_row(ws):
    """Find the row index where headers start (first row with 2+ non-empty cells)."""
    for row_idx, row in enumerate(ws.iter_rows(min_row=1, max_row=20, values_only=True), start=1):
        non_empty = sum(1 for cell in row if cell is not None and str(cell).strip())
        if non_empty >= 2:
            return row_idx
    return None


def _read_table(ws, start_row=None, expected_headers=None):
    """Read a table from a worksheet starting at the header row.
    Returns a list of dicts keyed by lowered/stripped header names."""
    if start_row is None:
        start_row = _find_header_row(ws)
    if start_row is None:
        return []

    # Read headers from the start_row
    header_row = []
    for cell in ws[start_row]:
        val = _safe_str(cell.value).lower().strip()
        # Remove emojis and special chars from headers
        for ch in ['🟣', '🔵', '🔷', '🟡', '💼', '📈', '🎯', '🏦', '🛡️', '👤', '📊', '📅']:
            val = val.replace(ch, '')
        header_row.append(val.strip())

    rows = []
    for row in ws.iter_rows(min_row=start_row + 1, values_only=True):
        if all(cell is None for cell in row):
            # Check if this is a section break (e.g. "🛡️ Household Insurance Policies")
            continue
        row_dict = {}
        for idx, val in enumerate(row):
            if idx < len(header_row) and header_row[idx]:
                row_dict[header_row[idx]] = val
        # Skip rows that look like section headers or are empty
        if not row_dict or all(v is None for v in row_dict.values()):
            continue
        rows.append(row_dict)
    return rows


def _find_section_start(ws, section_keyword):
    """Find the row where a section starts by looking for a keyword."""
    for row_idx, row in enumerate(ws.iter_rows(min_row=1, values_only=True), start=1):
        for cell in row:
            if cell and section_keyword.lower() in str(cell).lower():
                # Headers should be the next row with multiple columns
                for check_row in range(row_idx + 1, min(row_idx + 4, ws.max_row + 1)):
                    test_row = [_safe_str(c.value) for c in ws[check_row]]
                    non_empty = sum(1 for v in test_row if v)
                    if non_empty >= 3:
                        return check_row
    return None


def parse_family_excel(file_bytes: bytes) -> dict:
    """
    Parse a Family Household Master Report Excel file.
    Returns structured data ready for database insertion.
    """
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), read_only=True, data_only=True)
    result = {
        "members": [],
        "assets": [],
        "sips": [],
        "goals": [],
        "loans": [],
        "insurance": []
    }

    # --- Parse Members from Executive Summary sheet ---
    summary_sheet = None
    for name in wb.sheetnames:
        if 'executive' in name.lower() or 'summary' in name.lower():
            summary_sheet = wb[name]
            break

    if summary_sheet:
        member_start = _find_section_start(summary_sheet, 'family member')
        if member_start is None:
            member_start = _find_section_start(summary_sheet, 'member breakdown')
        if member_start:
            members_data = _read_table(summary_sheet, start_row=member_start)
            for m in members_data:
                name_val = _safe_str(m.get('family member', m.get('name', '')))
                if not name_val or 'total' in name_val.lower():
                    continue
                result["members"].append({
                    "family_name": name_val,
                    "role": _safe_str(m.get('relationship / role', m.get('role', 'Family Member'))),
                    "current_age": _safe_int(m.get('age', 35)),
                    "retirement_age": _safe_int(m.get('retirement target', m.get('retirement age', 60))),
                })

    # --- Parse Assets sheet ---
    assets_sheet = None
    for name in wb.sheetnames:
        if 'asset' in name.lower():
            assets_sheet = wb[name]
            break

    if assets_sheet:
        assets_data = _read_table(assets_sheet)
        for a in assets_data:
            owner = _safe_str(a.get('family member', ''))
            name_val = _safe_str(a.get('asset name', a.get('name', '')))
            if not name_val:
                continue
            ret_rate = _safe_float(a.get('expected return rate (%)', a.get('return rate', a.get('return rate (%)', 8))))
            # If return rate came as a decimal (e.g. 0.12 for 12%), convert
            if 0 < ret_rate < 1:
                ret_rate = ret_rate * 100
            result["assets"].append({
                "owner": owner,
                "name": name_val,
                "asset_class": _safe_str(a.get('asset class', 'equity')).lower(),
                "value": _safe_float(a.get('current value (₹)', a.get('current value', a.get('value', 0)))),
                "return_rate": ret_rate
            })

    # --- Parse SIPs sheet ---
    sips_sheet = None
    for name in wb.sheetnames:
        if 'sip' in name.lower():
            sips_sheet = wb[name]
            break

    if sips_sheet:
        sips_data = _read_table(sips_sheet)
        for s in sips_data:
            owner = _safe_str(s.get('family member', ''))
            name_val = _safe_str(s.get('sip / investment name', s.get('sip name', s.get('name', ''))))
            if not name_val:
                continue
            step_up = _safe_float(s.get('step-up rate (%)', s.get('step_up_pct', 0)))
            if 0 < step_up < 1:
                step_up = step_up * 100
            ret_rate = _safe_float(s.get('return rate (%)', s.get('return_rate', 12)))
            if 0 < ret_rate < 1:
                ret_rate = ret_rate * 100
            end_y = s.get('end year', None)
            if end_y and str(end_y).lower().strip() in ('forever', 'none', '-', ''):
                end_y = None
            elif end_y:
                end_y = _safe_int(end_y)
            result["sips"].append({
                "owner": owner,
                "name": name_val,
                "asset_class": _safe_str(s.get('asset class', 'equity')).lower(),
                "monthly_amount": _safe_float(s.get('monthly amount (₹)', s.get('monthly amount', s.get('monthly_amount', 0)))),
                "step_up_pct": step_up,
                "return_rate": ret_rate,
                "start_year": _safe_int(s.get('start year', s.get('start_year', 2026))),
                "end_year": end_y
            })

    # --- Parse Goals sheet ---
    goals_sheet = None
    for name in wb.sheetnames:
        if 'goal' in name.lower():
            goals_sheet = wb[name]
            break

    if goals_sheet:
        goals_data = _read_table(goals_sheet)
        for g in goals_data:
            owner = _safe_str(g.get('family member', ''))
            name_val = _safe_str(g.get('goal name', g.get('name', '')))
            if not name_val:
                continue
            inf_rate = _safe_float(g.get('inflation rate (%)', g.get('inflation_rate', 6)))
            if 0 < inf_rate < 1:
                inf_rate = inf_rate * 100
            result["goals"].append({
                "owner": owner,
                "name": name_val,
                "priority": _safe_str(g.get('priority', 'need')).lower(),
                "present_value": _safe_float(g.get('present value (₹)', g.get('present value', g.get('present_value', 0)))),
                "target_year": _safe_int(g.get('target year', g.get('target_year', 2030))),
                "goal_type": _safe_str(g.get('goal type', g.get('goal_type', 'lump_sum'))).lower().replace(' ', '_'),
                "inflation_rate": inf_rate
            })

    # --- Parse Insurance & Loans sheet ---
    il_sheet = None
    for name in wb.sheetnames:
        if 'insurance' in name.lower() or 'loan' in name.lower():
            il_sheet = wb[name]
            break

    if il_sheet:
        # Find loans section
        loans_start = _find_section_start(il_sheet, 'loan')
        if loans_start is None:
            loans_start = _find_section_start(il_sheet, 'liabilit')
        if loans_start:
            loans_data = _read_table(il_sheet, start_row=loans_start)
            for l in loans_data:
                # Stop if we hit the insurance section
                first_val = _safe_str(list(l.values())[0] if l else '')
                if 'insurance' in first_val.lower() or 'policy' in first_val.lower():
                    break
                owner = _safe_str(l.get('family member', ''))
                name_val = _safe_str(l.get('loan name', l.get('name', '')))
                if not name_val:
                    continue
                roi = _safe_float(l.get('roi (%)', l.get('roi_pct', 8.5)))
                if 0 < roi < 1:
                    roi = roi * 100
                result["loans"].append({
                    "owner": owner,
                    "name": name_val,
                    "loan_type": _safe_str(l.get('loan type', l.get('loan_type', 'home'))).lower(),
                    "principal": _safe_float(l.get('principal (₹)', l.get('principal', 0))),
                    "roi_pct": roi,
                    "total_months": _safe_int(l.get('total months', l.get('total_months', 240))),
                    "emis_paid": _safe_int(l.get('emis paid', l.get('emis_paid', 0)))
                })

        # Find insurance section
        ins_start = _find_section_start(il_sheet, 'insurance polic')
        if ins_start is None:
            ins_start = _find_section_start(il_sheet, 'insurance')
        if ins_start:
            ins_data = _read_table(il_sheet, start_row=ins_start)
            for ins in ins_data:
                owner = _safe_str(ins.get('family member', ''))
                name_val = _safe_str(ins.get('policy name', ins.get('name', '')))
                if not name_val:
                    continue
                income_period = _safe_str(ins.get('income period', ''))
                inc_start = None
                inc_end = None
                if ' - ' in income_period:
                    parts = income_period.split(' - ')
                    inc_start = _safe_int(parts[0]) if parts[0].strip() != '-' else None
                    inc_end = _safe_int(parts[1]) if len(parts) > 1 and parts[1].strip() != '-' else None
                result["insurance"].append({
                    "owner": owner,
                    "name": name_val,
                    "annual_premium": _safe_float(ins.get('annual premium (₹)', ins.get('annual_premium', 0))),
                    "premium_end_year": _safe_int(ins.get('premium end year', ins.get('premium_end_year', 2035))),
                    "income_start_year": inc_start,
                    "annual_income": _safe_float(ins.get('annual income (₹)', ins.get('annual_income', 0))),
                    "income_end_year": inc_end,
                    "death_benefit": _safe_float(ins.get('death benefit (₹)', ins.get('death_benefit', 0)))
                })

    wb.close()
    return result


def import_family_excel(user_id: str, file_bytes: bytes) -> dict:
    """
    Import a Family Household Master Excel report into the database.
    Creates/matches profiles and inserts all items.
    Returns summary stats.
    """
    parsed = parse_family_excel(file_bytes)

    # Get existing profiles for user
    existing_profiles = get_profiles_by_user_id(user_id)
    profile_map = {}  # name -> profile_id
    for p in existing_profiles:
        profile_map[p["family_name"].strip().lower()] = p["id"]

    # Create any missing profiles from parsed members
    for member in parsed["members"]:
        key = member["family_name"].strip().lower()
        if key not in profile_map:
            new_id = str(uuid.uuid4())
            create_profile(new_id, {
                "user_id": user_id,
                "family_name": member["family_name"],
                "role": member.get("role", "Family Member"),
                "current_age": member.get("current_age", 35),
                "retirement_age": member.get("retirement_age", 60),
            }, seed_defaults=False)
            profile_map[key] = new_id

    # If no members parsed from summary, create profiles from asset/sip owner names
    all_owners = set()
    for section in [parsed["assets"], parsed["sips"], parsed["goals"], parsed["loans"], parsed["insurance"]]:
        for item in section:
            owner = item.get("owner", "").strip()
            if owner:
                all_owners.add(owner)

    for owner in all_owners:
        key = owner.strip().lower()
        if key not in profile_map:
            new_id = str(uuid.uuid4())
            create_profile(new_id, {
                "user_id": user_id,
                "family_name": owner,
                "role": "Family Member",
            }, seed_defaults=False)
            profile_map[key] = new_id

    # If still no profiles, create a default one
    if not profile_map:
        new_id = str(uuid.uuid4())
        create_profile(new_id, {
            "user_id": user_id,
            "family_name": "My Profile",
            "role": "Self",
        }, seed_defaults=False)
        profile_map["my profile"] = new_id

    # Helper to resolve owner name to profile_id
    def resolve_profile(owner_name):
        key = owner_name.strip().lower()
        if key in profile_map:
            return profile_map[key]
        # Fuzzy match: check if any existing profile name contains the owner
        for pname, pid in profile_map.items():
            if key in pname or pname in key:
                return pid
        # Default to first profile
        return list(profile_map.values())[0]

    counts = {"assets": 0, "sips": 0, "goals": 0, "loans": 0, "insurance": 0, "profiles": len(profile_map)}

    # Insert assets
    for a in parsed["assets"]:
        pid = resolve_profile(a["owner"])
        insert_item("assets", {
            "id": str(uuid.uuid4()),
            "profile_id": pid,
            "name": a["name"],
            "asset_class": a["asset_class"],
            "value": a["value"],
            "return_rate": a["return_rate"]
        })
        counts["assets"] += 1

    # Insert SIPs
    for s in parsed["sips"]:
        pid = resolve_profile(s["owner"])
        data = {
            "id": str(uuid.uuid4()),
            "profile_id": pid,
            "name": s["name"],
            "asset_class": s["asset_class"],
            "monthly_amount": s["monthly_amount"],
            "step_up_pct": s["step_up_pct"],
            "return_rate": s["return_rate"],
            "start_year": s["start_year"],
        }
        if s.get("end_year"):
            data["end_year"] = s["end_year"]
        insert_item("sips", data)
        counts["sips"] += 1

    # Insert goals
    for g in parsed["goals"]:
        pid = resolve_profile(g["owner"])
        insert_item("goals", {
            "id": str(uuid.uuid4()),
            "profile_id": pid,
            "name": g["name"],
            "priority": g["priority"],
            "present_value": g["present_value"],
            "target_year": g["target_year"],
            "goal_type": g["goal_type"],
            "inflation_rate": g["inflation_rate"]
        })
        counts["goals"] += 1

    # Insert loans
    for l in parsed["loans"]:
        pid = resolve_profile(l["owner"])
        insert_item("loans", {
            "id": str(uuid.uuid4()),
            "profile_id": pid,
            "name": l["name"],
            "loan_type": l["loan_type"],
            "principal": l["principal"],
            "roi_pct": l["roi_pct"],
            "total_months": l["total_months"],
            "emis_paid": l["emis_paid"]
        })
        counts["loans"] += 1

    # Insert insurance
    for ins in parsed["insurance"]:
        pid = resolve_profile(ins["owner"])
        data = {
            "id": str(uuid.uuid4()),
            "profile_id": pid,
            "name": ins["name"],
            "annual_premium": ins["annual_premium"],
            "premium_end_year": ins["premium_end_year"],
            "annual_income": ins["annual_income"],
            "death_benefit": ins["death_benefit"]
        }
        if ins.get("income_start_year"):
            data["income_start_year"] = ins["income_start_year"]
        if ins.get("income_end_year"):
            data["income_end_year"] = ins["income_end_year"]
        insert_item("insurance_plans", data)
        counts["insurance"] += 1

    return counts


def import_single_profile_excel(profile_id: str, file_bytes: bytes) -> dict:
    """
    Import an Excel report into a single existing profile.
    Reads all sheets and inserts items into the given profile.
    Returns summary stats.
    """
    parsed = parse_family_excel(file_bytes)
    counts = {"assets": 0, "sips": 0, "goals": 0, "loans": 0, "insurance": 0}

    # Insert all items into the single profile regardless of owner column
    for a in parsed["assets"]:
        insert_item("assets", {
            "id": str(uuid.uuid4()),
            "profile_id": profile_id,
            "name": a["name"],
            "asset_class": a["asset_class"],
            "value": a["value"],
            "return_rate": a["return_rate"]
        })
        counts["assets"] += 1

    for s in parsed["sips"]:
        data = {
            "id": str(uuid.uuid4()),
            "profile_id": profile_id,
            "name": s["name"],
            "asset_class": s["asset_class"],
            "monthly_amount": s["monthly_amount"],
            "step_up_pct": s["step_up_pct"],
            "return_rate": s["return_rate"],
            "start_year": s["start_year"],
        }
        if s.get("end_year"):
            data["end_year"] = s["end_year"]
        insert_item("sips", data)
        counts["sips"] += 1

    for g in parsed["goals"]:
        insert_item("goals", {
            "id": str(uuid.uuid4()),
            "profile_id": profile_id,
            "name": g["name"],
            "priority": g["priority"],
            "present_value": g["present_value"],
            "target_year": g["target_year"],
            "goal_type": g["goal_type"],
            "inflation_rate": g["inflation_rate"]
        })
        counts["goals"] += 1

    for l in parsed["loans"]:
        insert_item("loans", {
            "id": str(uuid.uuid4()),
            "profile_id": profile_id,
            "name": l["name"],
            "loan_type": l["loan_type"],
            "principal": l["principal"],
            "roi_pct": l["roi_pct"],
            "total_months": l["total_months"],
            "emis_paid": l["emis_paid"]
        })
        counts["loans"] += 1

    for ins in parsed["insurance"]:
        data = {
            "id": str(uuid.uuid4()),
            "profile_id": profile_id,
            "name": ins["name"],
            "annual_premium": ins["annual_premium"],
            "premium_end_year": ins["premium_end_year"],
            "annual_income": ins["annual_income"],
            "death_benefit": ins["death_benefit"]
        }
        if ins.get("income_start_year"):
            data["income_start_year"] = ins["income_start_year"]
        if ins.get("income_end_year"):
            data["income_end_year"] = ins["income_end_year"]
        insert_item("insurance_plans", data)
        counts["insurance"] += 1

    return counts
