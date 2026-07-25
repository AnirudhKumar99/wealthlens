# 🔮 WealthLens 2.0 — Multi-Profile Family Wealth Planner & Simulation Platform

A state-of-the-art, interactive **Multi-Profile Wealth Planning & Financial Independence (FI) Simulation Platform** built with **React (Vite)**, **Python (FastAPI)**, and **SQLite**.

WealthLens 2.0 empowers users to model real-world family wealth trajectories, simulate step-up SIP compounding, manage multi-asset portfolios, track debt payoff, evaluate insurance payouts, and calculate financial readiness across multiple customizable profiles.

---

## 🌐 Live Production Deployments

- 📱 **Frontend Web App (Vercel)**: [https://wealthlens-frontend-gules.vercel.app](https://wealthlens-frontend-gules.vercel.app)
- ⚡ **Backend REST API (Railway)**: [https://wealthlens-backend-production-c607.up.railway.app](https://wealthlens-backend-production-c607.up.railway.app)
- 📖 **Interactive OpenAPI Docs**: [https://wealthlens-backend-production-c607.up.railway.app/docs](https://wealthlens-backend-production-c607.up.railway.app/docs)

---

## ✨ Key Features & Enhancements

- 🔐 **Split-Screen Authentication & Bank-Grade Security**: PBKDF2-HMAC-SHA256 password hashing with 16-byte random salt & JWT session tokens.
- 👤 **Multi-Profile Portfolio Switcher**: Create and toggle between multiple independent family wealth profiles (e.g. *Personal*, *Family*, *Parents*) with 1-click header switcher.
- ⚡ **Real-Time Auto-Simulation Engine**: Automatic background calculation updates and live toast notifications on every asset edit, goal update, SIP tweak, or loan repayment.
- 📈 **Bounded Realistic Compounding Math**: Real-world future-value compounding with step-up limits and present-value inflation adjustments (`retirement_inflation_rate` default 7.0%).
- 📊 **Interactive Recharts Visualizations**: Dynamic lifetime growth curves comparing net worth trajectory against required safe withdrawal FI target corpus (**₹6.96 Crore**).
- 🩺 **Algorithm-Driven Health Score (0–100)**: Evaluates family readiness across 6 key metrics:
  - **FI Ratio** (Corpus vs 25× Inflation-Adjusted Retirement Expenses)
  - **Savings Rate %** (Target 30-40%)
  - **Blended Portfolio Return Rate**
  - **Portfolio Longevity & Exhaustion Age**
  - **Debt-to-Asset Ratio**
  - **Critical Goal Funding Readiness**
- 🎨 **Claymorphic & Soft Lavender Aesthetic**: Premium UI built with `Nunito` typography, glassmorphism, responsive grid cards, pastel section tints, and zero generic colors.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 18, Vite 8 |
| **Data Visualizations** | Recharts |
| **Styling & Design System** | Custom Claymorphic CSS, Google Fonts (`Nunito`) |
| **Backend API** | Python 3.11+, FastAPI, Uvicorn |
| **Database & Persistence** | SQLite (`wealth.db`) |
| **Security & Auth** | PBKDF2-HMAC-SHA256, PyJWT, Passlib |
| **Frontend Hosting** | Vercel (Global Edge CDN) |
| **Backend Hosting** | Railway (Containerized Service) |

---

## 📁 Repository Structure

```text
PersonalFinance/
├── WealthLensBackend/
│   ├── main.py              # FastAPI server, endpoints, CORS & router handlers
│   ├── calculations.py      # Simulation compounding engine, health score math & recs
│   ├── database.py          # SQLite database connection layer & profile seeding
│   ├── models.py            # Pydantic v2 schemas & request validation models
│   ├── auth.py              # PBKDF2-HMAC-SHA256 hashing & JWT authentication
│   ├── Procfile             # Railway web service start configuration
│   └── requirements.txt     # Python dependencies (FastAPI, Uvicorn, PyJWT, Passlib)
│
└── WealthLensFrontend/
    ├── src/
    │   ├── api/client.js    # API fetch wrapper with Bearer Token & dynamic VITE_API_BASE_URL
    │   ├── components/      # ProfileSwitcher, Login, and UI components
    │   ├── pages/           # Dashboard, Profile, Assets, Goals, SIPs, Insurance, Loans
    │   ├── App.jsx          # Primary layout shell, tab navigation & global state
    │   └── main.jsx         # Vite React entrypoint
    ├── vercel.json          # Vercel Single Page Application rewrite rules
    └── package.json         # React & Vite frontend dependencies
```

---

## 📊 Default Benchmark Profile Preset

Newly initialized profiles auto-populate with realistic financial parameters:

- **Timeline**: Current Age 34 → Retire at Age 60 → Life Expectancy 82 (26 Years to Retirement)
- **Annual Income**: ₹21,60,000 | **Savings Rate**: 35%
- **Monthly Expenses at Retirement (PV)**: ₹40,000/month (@ 7.0% inflation)
- **Calculated FI Corpus Required**: **₹6,96,88,235** (Based on 4% safe withdrawal rule at Age 60)
- **Initial Asset Portfolio (₹73.8 Lakhs Total)**:
  - EPF Balance: ₹21,45,000 (8.15% return)
  - Equity Mutual Funds: ₹32,80,000 (11.2% return)
  - US Tech RSUs: ₹11,20,000 (11.8% return)
  - Emergency FD: ₹4,75,000 (6.8% return)
  - Sovereign Gold Bonds: ₹3,60,000 (8.0% return)
- **Monthly SIPs (₹45,800/month Total)**:
  - Nifty Index Fund SIP: ₹22,500/mo (1.5% step-up, 10.8% return)
  - Flexi Cap Growth SIP: ₹14,800/mo (1.0% step-up, 11.2% return)
  - PPF Monthly Contribution: ₹8,500/mo (1.0% step-up, 7.1% return)
- **Baseline Health Score**: **`72 / 100` (🟢 Healthy & Fully Funded)**
- **Max Portfolio Trajectory**: Bounded realistically to **₹9.98 Crore**

---

## 🚀 Local Development Setup

### 1. Clone the Repository
```bash
git clone https://github.com/AnirudhKumar99/wealthlens.git
cd wealthlens
```

### 2. Run the Backend (Python FastAPI)
```bash
cd WealthLensBackend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Backend API will run at: **`http://localhost:8000`** (Docs at `http://localhost:8000/docs`)

### 3. Run the Frontend (React Vite)
In a separate terminal window:
```bash
cd WealthLensFrontend
npm install
npm run dev
```
Frontend App will run at: **`http://localhost:5173`**

---

## 📝 License

This project is open-source under the MIT License.
