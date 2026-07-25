"""
calculations.py
Pure-Python financial simulation engine for the Family Wealth Planning Dashboard.
No external dependencies required. All math is self-contained.
"""

from datetime import datetime
from typing import Optional


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _current_year() -> int:
    return datetime.now().year


def _fmt(value: float, currency: str = "INR") -> str:
    """Compact currency string used inside recommendation text."""
    v = abs(float(value))
    neg = "-" if float(value) < 0 else ""
    if currency == "INR":
        sym = "₹"
        if v >= 10_000_000:
            return f"{neg}{sym}{v / 10_000_000:.1f}Cr"
        if v >= 100_000:
            return f"{neg}{sym}{v / 100_000:.1f}L"
        return f"{neg}{sym}{v:,.0f}"
    else:
        sym = "$"
        if v >= 1_000_000:
            return f"{neg}{sym}{v / 1_000_000:.2f}M"
        if v >= 1_000:
            return f"{neg}{sym}{v / 1_000:.1f}K"
        return f"{neg}{sym}{v:,.0f}"


# ─────────────────────────────────────────────────────────────────────────────
# Core Math
# ─────────────────────────────────────────────────────────────────────────────

def calculate_future_value(pv: float, inflation_rate_pct: float, years: int) -> float:
    """Compound growth:  FV = PV × (1 + r)^t"""
    if years <= 0:
        return float(pv)
    return float(pv) * ((1.0 + inflation_rate_pct / 100.0) ** years)


def calculate_emi(principal: float, annual_rate_pct: float, tenure_years: int) -> float:
    """Monthly EMI = P × r(1+r)^n / ((1+r)^n − 1)"""
    if annual_rate_pct <= 0 or tenure_years <= 0 or principal <= 0:
        return 0.0
    r = annual_rate_pct / 100.0 / 12.0
    n = tenure_years * 12
    return principal * r * (1 + r) ** n / ((1 + r) ** n - 1)


def get_blended_return(assets: list) -> float:
    """Asset-value-weighted blended annual return (decimal, e.g. 0.10 = 10%)."""
    total = sum(float(a.get("value") or 0) for a in assets)
    if total <= 0:
        return 0.08  # sensible default when no assets supplied
    weighted = sum(
        float(a.get("value") or 0) * float(a.get("return_rate") or 0) / 100.0
        for a in assets
    )
    return weighted / total


# ─────────────────────────────────────────────────────────────────────────────
# Goal Outflow Schedule Builder
# ─────────────────────────────────────────────────────────────────────────────

def build_outflow_schedule(goals: list, base_year: int, end_year: int) -> dict:
    """
    Returns {year: total_outflow} for all goals over the simulation horizon.
    Lump-sum goals add a single FV at target_year.
    Recurring goals add an inflation-adjusted FV every N years.
    """
    schedule: dict[int, float] = {}

    for goal in goals:
        target_year = int(goal.get("target_year") or base_year + 5)
        pv    = float(goal.get("present_value") or 0)
        r_inf = float(goal.get("inflation_rate") or 6)
        gtype = goal.get("goal_type", "lump_sum")

        if gtype == "lump_sum":
            t  = max(0, target_year - base_year)
            fv = calculate_future_value(pv, r_inf, t)
            schedule[target_year] = schedule.get(target_year, 0.0) + fv

        elif gtype == "recurring":
            duration = max(1, int(goal.get("duration_years") or 1))
            step_up = float(goal.get("step_up_pct") or 0.0) / 100.0
            
            t = max(0, target_year - base_year)
            base_payout = calculate_future_value(pv, r_inf, t)
            
            for i in range(duration):
                year = target_year + i
                if year <= end_year:
                    payout = base_payout * ((1 + step_up) ** i)
                    schedule[year] = schedule.get(year, 0.0) + payout

    return schedule


# ─────────────────────────────────────────────────────────────────────────────
# Health Score (0 – 100)
# ─────────────────────────────────────────────────────────────────────────────

def _health_score(fi_ratio: float, savings_rate_pct: float, blended_r: float,
                  exhausted: bool, goal_details: list,
                  debt_to_asset_ratio: float = 0.0) -> int:
    score = 0

    # FI ratio  (0-25)
    if fi_ratio >= 1.5:
        score += 25
    elif fi_ratio >= 1.0:
        score += 17
    elif fi_ratio >= 0.7:
        score += 8

    # Savings rate (0-20)
    if savings_rate_pct >= 30:
        score += 20
    elif savings_rate_pct >= 20:
        score += 12
    elif savings_rate_pct >= 10:
        score += 4

    # Blended return (0-15)
    if blended_r >= 0.12:
        score += 15
    elif blended_r >= 0.10:
        score += 11
    elif blended_r >= 0.08:
        score += 7
    elif blended_r >= 0.06:
        score += 3

    # Portfolio longevity (0-15)
    if not exhausted:
        score += 15

    # Critical goals funded (0-10)
    critical = [g for g in goal_details if g["priority"] == "critical"]
    if critical:
        funded = sum(1 for g in critical if g["status"] == "funded")
        score += int(10 * funded / len(critical))
    else:
        score += 10

    # Debt health (0-15) — lower debt-to-asset ratio is better
    if debt_to_asset_ratio <= 0:
        score += 15
    elif debt_to_asset_ratio <= 0.15:
        score += 12
    elif debt_to_asset_ratio <= 0.30:
        score += 8
    elif debt_to_asset_ratio <= 0.50:
        score += 4
    # else: 0 — heavy debt burden

    return min(100, score)


# ─────────────────────────────────────────────────────────────────────────────
# Insurance Plan Guaranteed Income Helper
# ─────────────────────────────────────────────────────────────────────────────

def _compute_insurance_income(insurance_plans: list, year: int) -> float:
    """
    Guaranteed annual income from all active insurance plan income periods.
    Also adds terminal/maturity bonus in the final income year.
    """
    total = 0.0
    for plan in insurance_plans:
        start = int(plan.get("income_start_year") or 9999)
        end   = int(plan.get("income_end_year") or 0)
        if start <= year <= end:
            total += float(plan.get("annual_income") or 0)
        if year == end:
            total += float(plan.get("terminal_bonus") or 0)
    return total


# ─────────────────────────────────────────────────────────────────────────────
# SIP / Regular Investment Helper
# ─────────────────────────────────────────────────────────────────────────────

def _compute_sip_annual(sips: list, year: int, base_year: int) -> float:
    """
    Total annual SIP inflow active during a given simulation year.
    Supports annual step-up percentage compounding over active years.
    """
    total = 0.0
    for sip in sips:
        monthly   = float(sip.get("monthly_amount") or 0)
        sip_start = int(sip.get("start_year") or base_year)
        sip_end   = sip.get("end_year")
        step_up   = float(sip.get("step_up_pct") or 0.0) / 100.0

        is_active = year >= sip_start
        if sip_end is not None:
            is_active = is_active and year <= int(sip_end)

        if is_active and monthly > 0:
            years_active = max(0, year - sip_start)
            current_monthly = monthly * ((1.0 + step_up) ** years_active)
            total += current_monthly * 12.0
    return total


# ─────────────────────────────────────────────────────────────────────────────
# Loan Helper
# ─────────────────────────────────────────────────────────────────────────────

def _compute_loan_outflow_annual(loans: list, year: int, base_year: int) -> float:
    """
    Computes total annual EMI outflows for all active loans in the given year.
    An EMI is paid every month until `emis_paid + (months passed)` reaches `total_months`.
    """
    total = 0.0
    for loan in loans:
        principal = float(loan.get("principal") or 0)
        roi = float(loan.get("roi_pct") or 8.5)
        total_months = int(loan.get("total_months") or 240)
        emis_paid = int(loan.get("emis_paid") or 0)

        if principal <= 0 or total_months <= 0 or emis_paid >= total_months:
            continue

        emi = calculate_emi(principal, roi, total_months / 12.0)

        # Calculate how many months of this loan fall into the current simulation year.
        start_month_idx = (year - base_year) * 12
        end_month_idx = start_month_idx + 12

        active_months = 0
        for m in range(start_month_idx, end_month_idx):
            if emis_paid + m < total_months:
                active_months += 1

        total += emi * active_months

    return total


# ─────────────────────────────────────────────────────────────────────────────
# Loan Detail Builder
# ─────────────────────────────────────────────────────────────────────────────

def _build_loan_details(loans: list, base_year: int) -> list:
    """
    Compute detailed amortisation metrics for each loan:
    outstanding principal, interest breakdown, completion timeline.
    """
    details = []
    for loan in loans:
        principal    = float(loan.get("principal") or 0)
        roi          = float(loan.get("roi_pct") or 8.5)
        total_months = int(loan.get("total_months") or 240)
        emis_paid    = int(loan.get("emis_paid") or 0)

        if principal <= 0 or total_months <= 0 or emis_paid >= total_months:
            continue

        r_m              = roi / 100.0 / 12.0
        remaining_months = max(0, total_months - emis_paid)

        # Monthly EMI
        if r_m > 0:
            emi = principal * r_m * (1 + r_m) ** total_months / (
                (1 + r_m) ** total_months - 1
            )
        else:
            emi = principal / total_months if total_months > 0 else 0.0

        # Outstanding principal after `emis_paid` payments
        if r_m > 0 and remaining_months > 0:
            outstanding = principal * (
                (1 + r_m) ** total_months - (1 + r_m) ** emis_paid
            ) / ((1 + r_m) ** total_months - 1)
        elif remaining_months > 0:
            outstanding = principal - (emi * emis_paid)
        else:
            outstanding = 0.0
        outstanding = max(0.0, outstanding)

        # Total cost of the loan
        total_payment = emi * total_months
        total_interest = total_payment - principal

        # Paid so far
        amount_paid    = emi * emis_paid
        principal_paid = principal - outstanding
        interest_paid  = amount_paid - principal_paid

        # Remaining
        remaining_payment  = emi * remaining_months
        remaining_interest = max(0.0, total_interest - interest_paid)

        # Completion timeline
        completion_year = base_year + int(
            remaining_months / 12
        ) + (1 if remaining_months % 12 > 0 else 0)

        details.append({
            "id":                    loan.get("id", ""),
            "name":                  loan.get("name", ""),
            "loan_type":             loan.get("loan_type", "other"),
            "original_principal":    round(principal, 2),
            "outstanding_principal": round(outstanding, 2),
            "monthly_emi":           round(emi, 2),
            "annual_emi":            round(emi * 12, 2),
            "total_months":          total_months,
            "emis_paid":             emis_paid,
            "remaining_months":      remaining_months,
            "remaining_years":       round(remaining_months / 12.0, 1),
            "roi_pct":               roi,
            "total_payment":         round(total_payment, 2),
            "total_interest":        round(total_interest, 2),
            "principal_paid":        round(principal_paid, 2),
            "interest_paid":         round(interest_paid, 2),
            "remaining_payment":     round(remaining_payment, 2),
            "remaining_interest":    round(remaining_interest, 2),
            "completion_year":       completion_year,
            "progress_pct":          round(
                (emis_paid / total_months) * 100, 1
            ) if total_months > 0 else 100.0,
        })

    return details


# ─────────────────────────────────────────────────────────────────────────────
# Main Simulation Engine
# ─────────────────────────────────────────────────────────────────────────────

def run_simulation(profile: dict, assets: list, goals: list,
                   sips: list = None, insurance_plans: list = None, loans: list = None) -> dict:
    """
    Year-by-year wealth simulation from current_age → life_expectancy (max 90).

    Each year:
      1. Compound portfolio at blended asset return
      2. Add annual savings + active SIP contributions (pre-retirement only)
      3. Add guaranteed insurance plan income (when in active income years)
      4. Subtract discrete goal outflows (schedule)
      5. Subtract retirement living expenses (post-retirement, 6% inflation-adjusted)

    Returns rich JSON consumed directly by the frontend.
    """
    base_year = _current_year()
    currency  = profile.get("currency", "INR")

    # Profile
    start_age     = int(profile.get("current_age") or 35)
    retire_age    = int(profile.get("retirement_age") or 60)
    life_exp      = min(int(profile.get("life_expectancy") or 85), 90)
    annual_income = float(profile.get("annual_income") or 0)
    monthly_exp_today = float(profile.get("monthly_expenses_retirement") or 60_000)
    retire_inf        = float(profile.get("retirement_inflation_rate") or 6.0) / 100.0

    # Inflate present value retirement expense to starting expense at retirement age
    yrs_to_retire = max(0, retire_age - start_age)
    monthly_exp_r_start = monthly_exp_today * ((1 + retire_inf) ** yrs_to_retire)

    # Derive effective savings strictly from listed SIPs / regular investments
    total_annual_sips = sum(float(s.get("monthly_amount") or 0) * 12.0 for s in (sips or []))
    effective_savings_pct = (total_annual_sips / annual_income) if annual_income > 0 else 0.0
    annual_savings = 0.0  # Avoid double counting; all contributions come from explicit SIPs/plans

    end_age  = max(life_exp, retire_age + 1)
    end_year = base_year + (end_age - start_age)

    # Portfolio
    blended_r    = get_blended_return(assets)
    portfolio    = sum(float(a.get("value") or 0) for a in assets)
    initial_port = portfolio

    # Goal outflow schedule
    outflow_sched = build_outflow_schedule(goals, base_year, end_year)

    # ── Simulation loop ──────────────────────────────────────────
    yearly_data: list[dict] = []
    cumulative_out      = 0.0
    cumulative_loan_out = 0.0
    cumulative_sip_in   = 0.0
    port_at_retire  = 0.0
    longevity_year  = None   # None = portfolio survives the entire simulation window
    longevity_age   = None
    exhausted       = False

    for i in range(end_age - start_age + 1):
        age  = start_age + i
        year = base_year + i

        # 1. Compound existing portfolio
        portfolio = portfolio * (1 + blended_r)

        # 2. Active SIP contributions (pre-retirement only)
        annual_sip = 0.0
        if age < retire_age:
            annual_sip = _compute_sip_annual(sips or [], year, base_year)
            portfolio += annual_sip
            cumulative_sip_in += annual_sip

        # 3. Guaranteed insurance plan income (active for any year in income window)
        ins_income = _compute_insurance_income(insurance_plans or [], year)
        portfolio += ins_income

        # 4. Loan EMI outflows
        loan_out = _compute_loan_outflow_annual(loans or [], year, base_year)
        cumulative_loan_out += loan_out

        # 5. Discrete goal outflows from schedule
        goal_out = float(outflow_sched.get(year, 0.0))

        # 6. Retirement living expenses — inflated to retirement age then compounded annually
        retire_out = 0.0
        if age >= retire_age:
            yrs_retired = age - retire_age
            retire_out = monthly_exp_r_start * 12 * ((1 + retire_inf) ** yrs_retired)

        total_out   = goal_out + retire_out + loan_out
        portfolio  -= total_out
        cumulative_out += total_out

        # Snapshot portfolio at exact retirement age
        if age == retire_age:
            port_at_retire = max(portfolio, 0.0)

        # Track first year of portfolio exhaustion
        if portfolio <= 0 and not exhausted:
            longevity_year = year
            longevity_age  = age
            exhausted      = True

        # Track goals triggering this year
        year_goals = []
        for g in (goals or []):
            start = int(g.get("target_year") or year)
            gtype = g.get("goal_type", "lump_sum")
            duration = int(g.get("duration_years") or 1) if gtype == "recurring" else 1
            if start <= year < start + duration:
                # Add year indicator if recurring
                year_label = f" (Yr {year - start + 1}/{duration})" if duration > 1 else ""
                name = g.get("name", "Goal")
                priority = g.get("priority", "need")
                
                pv = float(g.get("present_value") or 0)
                r_inf = float(g.get("inflation_rate") or 6)
                t = max(0, start - base_year)
                base_payout = calculate_future_value(pv, r_inf, t)
                
                if gtype == "recurring":
                    step_up = float(g.get("step_up_pct") or 0.0) / 100.0
                    i = year - start
                    outflow = base_payout * ((1 + step_up) ** i)
                else:
                    outflow = base_payout
                    
                year_goals.append({
                    "name": f"{name}{year_label} ({priority})",
                    "outflow": round(outflow, 2)
                })

        yearly_data.append({
            "year":                     year,
            "age":                      age,
            "portfolio_value":          round(max(portfolio, 0), 2),
            "loan_outflow":             round(loan_out, 2),
            "goal_outflow":             round(goal_out, 2),
            "retirement_outflow":       round(retire_out, 2),
            "annual_outflow":           round(total_out, 2),
            "cumulative_outflows":      round(cumulative_out, 2),
            "cumulative_loan_outflows": round(cumulative_loan_out, 2),
            "cumulative_sip_inflows":   round(cumulative_sip_in, 2),
            "goal_events":              year_goals,
            "is_solvent":              portfolio > 0,
            "is_retirement":           age >= retire_age,
        })

        # Portfolio exhausted — fill remaining years with zeros
        if portfolio <= 0:
            for j in range(i + 1, end_age - start_age + 1):
                a2, y2 = start_age + j, base_year + j
                fo = float(outflow_sched.get(y2, 0.0))
                cumulative_out += fo
                yearly_data.append({
                    "year": y2, "age": a2,
                    "portfolio_value":          0,
                    "loan_outflow":             0.0,
                    "goal_outflow":             round(fo, 2),
                    "retirement_outflow":       0.0,
                    "annual_outflow":           round(fo, 2),
                    "cumulative_outflows":      round(cumulative_out, 2),
                    "cumulative_loan_outflows": round(cumulative_loan_out, 2),
                    "cumulative_sip_inflows":   round(cumulative_sip_in, 2),
                    "goal_event":               None,
                    "is_solvent":              False,
                    "is_retirement":           a2 >= retire_age,
                })
            break

    # ── Derived KPIs ─────────────────────────────────────────────
    annual_exp_at_retire = monthly_exp_r_start * 12
    fi_corpus_needed     = annual_exp_at_retire * 25          # 4% Safe Withdrawal Rate on inflated retirement expense
    fi_ratio             = round(port_at_retire / fi_corpus_needed, 3) if fi_corpus_needed > 0 else 0.0
    total_corpus_req  = sum(outflow_sched.values())
    surplus           = port_at_retire - fi_corpus_needed

    # Years until pre-retirement portfolio first crosses FI threshold
    years_to_fi: Optional[int] = None
    for d in yearly_data:
        if d["age"] < retire_age and d["portfolio_value"] >= fi_corpus_needed:
            years_to_fi = d["year"] - base_year
            break

    # ── Loan analytics ───────────────────────────────────────────
    loan_details         = _build_loan_details(loans or [], base_year)
    total_outstanding    = sum(d["outstanding_principal"] for d in loan_details)
    total_rem_interest   = sum(d["remaining_interest"] for d in loan_details)
    total_rem_payment    = sum(d["remaining_payment"] for d in loan_details)
    debt_to_asset_ratio  = round(total_outstanding / initial_port, 3) if initial_port > 0 else 0.0

    # ── Goal details & recommendations ───────────────────────────
    goal_details = _build_goal_details(
        goals, base_year, yearly_data,
        blended_r, initial_port, annual_savings, retire_age, start_age,
    )
    health = _health_score(
        fi_ratio, effective_savings_pct * 100, blended_r,
        exhausted, goal_details, debt_to_asset_ratio,
    )
    recs   = _recommendations(
        exhausted, longevity_age, fi_ratio,
        port_at_retire, fi_corpus_needed, blended_r,
        effective_savings_pct * 100, goal_details, currency,
        debt_to_asset_ratio, total_outstanding,
    )

    return {
        "yearly_data":  yearly_data,
        "goal_details": goal_details,
        "asset_allocation": [
            {
                "name":        a.get("name", ""),
                "asset_class": a.get("asset_class", "other"),
                "value":       float(a.get("value") or 0),
            }
            for a in assets
            if float(a.get("value") or 0) > 0
        ],
        "summary": {
            "portfolio_exhausted":       exhausted,
            "longevity_year":            longevity_year,
            "longevity_age":             longevity_age,
            "life_expectancy":           life_exp,
            "simulation_end_age":        end_age,
            "portfolio_at_retirement":   round(port_at_retire, 2),
            "fi_corpus_needed":          round(fi_corpus_needed, 2),
            "total_corpus_required":     round(total_corpus_req, 2),
            "surplus_at_retirement":     round(surplus, 2),
            "fi_ratio":                  fi_ratio,
            "years_to_fi":               years_to_fi,
            "blended_return_pct":        round(blended_r * 100, 2),
            "effective_savings_rate_pct": round(effective_savings_pct * 100, 1),
            "health_score":              health,
            "recommendations":           recs,
            "debt_to_asset_ratio":       debt_to_asset_ratio,
            "total_outstanding_debt":    round(total_outstanding, 2),
            "total_debt_service":        round(cumulative_loan_out, 2),
        },
        "blended_return": round(blended_r * 100, 2),
        "total_portfolio": round(initial_port, 2),
        "sip_summary": {
            "total_monthly": round(
                sum(float(s.get("monthly_amount") or 0) for s in (sips or [])), 2
            ),
            "total_annual": round(
                sum(float(s.get("monthly_amount") or 0) for s in (sips or [])) * 12, 2
            ),
            "count": len([s for s in (sips or []) if float(s.get("monthly_amount") or 0) > 0]),
        },
        "insurance_summary": {
            "total_annual_income": round(
                sum(float(p.get("annual_income") or 0) for p in (insurance_plans or [])), 2
            ),
            "total_terminal_bonus": round(
                sum(float(p.get("terminal_bonus") or 0) for p in (insurance_plans or [])), 2
            ),
            "plan_count": len(insurance_plans or []),
        },
        "loan_summary": {
            "total_monthly_emi":          round(sum(d["monthly_emi"] for d in loan_details), 2),
            "total_annual_emi":           round(sum(d["annual_emi"] for d in loan_details), 2),
            "total_outstanding_principal": round(total_outstanding, 2),
            "total_remaining_interest":   round(total_rem_interest, 2),
            "total_remaining_payment":    round(total_rem_payment, 2),
            "total_original_principal":   round(
                sum(d["original_principal"] for d in loan_details), 2
            ),
            "total_interest_overall":     round(
                sum(d["total_interest"] for d in loan_details), 2
            ),
            "debt_to_asset_ratio":        debt_to_asset_ratio,
            "count":                      len(loans or []),
            "details":                    loan_details,
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# Goal Detail Builder
# ─────────────────────────────────────────────────────────────────────────────

def _build_goal_details(
    goals, base_year, yearly_data,
    blended_r, initial_port, annual_savings, retire_age, start_age,
) -> list:
    port_map = {d["year"]: d["portfolio_value"] for d in yearly_data}
    details  = []

    for goal in goals:
        target_year = int(goal.get("target_year") or base_year + 5)
        yrs  = max(0, target_year - base_year)
        pv   = float(goal.get("present_value") or 0)
        r    = float(goal.get("inflation_rate") or 6)
        gtype = goal.get("goal_type", "lump_sum")
        
        base_fv = calculate_future_value(pv, r, yrs)
        if gtype == "recurring":
            duration = max(1, int(goal.get("duration_years") or 1))
            step_up = float(goal.get("step_up_pct") or 0.0) / 100.0
            fv = 0.0
            discounted_cost = 0.0
            for i in range(duration):
                cash_flow = base_fv * ((1 + step_up) ** i)
                fv += cash_flow
                discounted_cost += cash_flow / ((1 + blended_r) ** i)
        else:
            fv = base_fv
            discounted_cost = base_fv
            
        port = port_map.get(target_year, 0.0)

        # Status: funded if portfolio ≥ discounted cost at target year
        if port >= discounted_cost:
            status = "funded"
        elif port >= discounted_cost * 0.5:
            status = "at_risk"
        else:
            status = "critical"

        details.append({
            "id":                  goal.get("id", ""),
            "name":                goal.get("name", ""),
            "priority":            goal.get("priority", "want"),
            "present_value":       round(pv, 2),
            "future_value":        round(fv, 2),
            "target_year":         target_year,
            "years_away":          yrs,
            "status":              status,
            "goal_type":           goal.get("goal_type", "lump_sum"),
            "portfolio_at_target": round(port, 2),
            "gap":                 round(max(0.0, discounted_cost - port), 2),
        })

    prio = {"critical": 0, "need": 1, "want": 2}
    details.sort(key=lambda x: (prio.get(x["priority"], 2), x["target_year"]))
    return details


# ─────────────────────────────────────────────────────────────────────────────
# Recommendation Engine
# ─────────────────────────────────────────────────────────────────────────────

def _recommendations(
    exhausted: bool, longevity_age: int, fi_ratio: float,
    port_at_retire: float, fi_corpus_needed: float, blended_r: float,
    savings_rate_pct: float, goal_details: list, currency: str,
    debt_to_asset_ratio: float = 0.0, total_outstanding: float = 0.0,
) -> list[str]:
    recs = []

    if exhausted:
        recs.append(
            f"⚠️ CRITICAL: Portfolio is exhausted at age {longevity_age}. "
            "Increase your savings rate immediately or defer discretionary goals to extend runway."
        )

    shortfall = fi_corpus_needed - port_at_retire
    if fi_ratio < 0.7:
        recs.append(
            f"📉 Significant retirement shortfall of {_fmt(shortfall, currency)} detected. "
            f"Top up your monthly SIP by {_fmt(shortfall / 240, currency)} to bridge the gap over 20 years."
        )
    elif fi_ratio < 1.0:
        recs.append(
            "⚡ Retirement corpus is slightly below the 25× target. Stay invested in equity "
            "for 2–3 additional years before de-risking to debt/hybrid funds."
        )
    elif fi_ratio >= 1.5:
        recs.append(
            "✅ Retirement corpus is well-funded. Explore NPS Tier II, REITs, international ETFs, "
            "or begin a legacy/estate planning strategy."
        )

    if blended_r < 0.07:
        recs.append(
            f"📊 Blended portfolio return of {blended_r * 100:.1f}% is below the 7% long-term benchmark. "
            "Shift 10–20% more allocation toward diversified equity mutual funds for stronger compounding."
        )

    if savings_rate_pct < 20:
        recs.append(
            f"💰 Savings rate of {savings_rate_pct:.0f}% is below the recommended 20–30%. "
            "Automate SIP transfers on salary credit day to enforce financial discipline."
        )

    critical_at_risk = [
        d for d in goal_details
        if d["priority"] == "critical" and d["status"] in ("at_risk", "critical")
    ]
    for d in critical_at_risk[:2]:  # cap at 2 goal-specific recommendations
        monthly_needed = d["future_value"] / max(1, d["years_away"] * 12)
        recs.append(
            f"🎯 Critical goal '{d['name']}' is at risk (FV: {_fmt(d['future_value'], currency)}). "
            f"Start a dedicated goal-based SIP of {_fmt(monthly_needed, currency)}/month today."
        )

    if debt_to_asset_ratio > 0.4:
        recs.append(
            f"🏦 DEBT ALERT: Debt-to-asset ratio of {debt_to_asset_ratio*100:.0f}% is high. "
            f"Outstanding debt of {_fmt(total_outstanding, currency)} exceeds 40% of portfolio. "
            "Prioritise aggressive debt repayment or prepayment of highest-rate loans."
        )
    elif debt_to_asset_ratio > 0.2:
        recs.append(
            f"📋 Moderate debt burden ({debt_to_asset_ratio*100:.0f}% debt-to-asset). "
            "Build an accelerated repayment plan to free up cash flow for investments."
        )

    if not recs:
        recs.append(
            "✅ Excellent financial health across all metrics! "
            "Review annually, rebalance to target allocation, and update goals as life evolves."
        )

    return recs
