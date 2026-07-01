# 🔮 Holistic Wealth Dashboard

A state-of-the-art, interactive **Financial Independence & Retirement Planning Dashboard** built with Python (FastAPI), Alpine.js, and Chart.js. Designed to model real-world family wealth trajectories, track multi-asset portfolios, simulate step-up SIPs, and evaluate long-term financial longevity against life goals and inflation.

---

## ✨ Key Features

- 📈 **Dynamic Year-by-Year Wealth Engine**: Simulates cash flows, portfolio growth, and withdrawals from current age up to life expectancy (Age 90 max).
- 🚀 **Step-Up SIP Compounding**: Models regular investments (Mutual Funds, PPF, NPS) with customizable annual step-up growth rates and live annuity future-value previews.
- 🏛️ **Multi-Asset Class Portfolio**: Track equity, debt, real estate, gold, liquid funds, and crypto with weighted-average blended return calculation.
- 🎯 **Goal-Based Cash Flow Modeling**: Plan for major life milestones (higher education, weddings, house upgrades, vacations) with inflation-adjusted present and future values. Supports both one-time lump-sum and recurring goals.
- 🛡️ **Guaranteed Income & Insurance Integration**: Incorporate long-term insurance plans, SWP equivalents, terminal bonuses, and tax-free income payouts directly into post-retirement cash flows.
- 🩺 **Algorithm-Driven Health Score (0–100)**: Evaluates family financial readiness across five vital dimensions:
  - **FI Ratio** (Corpus vs. 25x Annual Retirement Expenses)
  - **Effective Savings Rate %**
  - **Blended Portfolio Return**
  - **Portfolio Longevity** (Exhaustion Age)
  - **Critical Goal Readiness**
- 🎨 **Premium Glassmorphic UI**: Built with modern dark-mode aesthetics, responsive layouts, micro-animations, and interactive Chart.js visualizations.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.10+, FastAPI, Uvicorn, Pydantic
- **Frontend Logic**: Alpine.js (Reactive UI state & real-time client-side previews)
- **Styling**: Tailwind CSS & Vanilla CSS Design Tokens (`custom.css`)
- **Charts & Visualizations**: Chart.js (`charts.js`)
- **Templating**: Jinja2 (`dashboard.html`)

---

## 🚀 Quick Start & Setup

Follow these simple steps to run the application locally on your machine:

### 1. Clone the Repository
```bash
git clone https://github.com/AnirudhKumar99/Holistic-Wealth-Dashboard.git
cd Holistic-Wealth-Dashboard
```

### 2. Create a Virtual Environment (Recommended)
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Application Server
```bash
uvicorn main:app --reload --port 8000
```

### 5. Open in Browser
Navigate to your web browser and open:
👉 **[http://localhost:8000](http://localhost:8000)**

---

## 🧮 Project Structure & Modules

```text
├── main.py              # FastAPI server, API endpoints (/api/simulate), and Pydantic schemas
├── calculations.py      # Core simulation engine, compounding logic, and health grading algorithm
├── requirements.txt     # Python dependency definitions
├── static/
│   ├── css/custom.css   # Custom glassmorphic design system and UI animations
│   └── js/charts.js     # Chart.js initialization and responsive rendering handlers
└── templates/
    ├── base.html        # HTML layout shell and CDN inclusions
    └── dashboard.html   # Main reactive dashboard interface (Alpine.js data store)
```

---

## 📊 Default Profile Preset (90/100 Health Score)

Out of the box, the dashboard initializes with a healthy **90/100** benchmark financial profile:
- **Timeline**: Age 30 → Retire at 50 → Model up to Age 85
- **Annual Income**: ₹30 Lakhs | Target Retirement Expense: ₹1 Lakh / mo
- **Current Assets**: ₹1 Crore across Equity MFs (11%) and PPF (7%)
- **Active SIPs**: ₹75,000 / mo total contribution (30% savings rate) featuring 5% annual step-up
- **Milestones**: Critical higher education goal 100% funded alongside house renovation and vacation goals

---

## 📝 License

This project is open-source and available under the MIT License.
