import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Brush } from 'recharts';
import { fmt, fmtShort } from '../api/client';

export default function Dashboard({ simulation }) {
  if (!simulation) {
    return (
      <div className="clay-card card-lavender empty-state">
        <div className="empty-icon">🚀</div>
        <div className="section-title" style={{justifyContent: 'center'}}>Welcome to WealthLens!</div>
        <p>Add your profile, assets, goals and SIPs — then hit <strong>"Run Simulation ⚡"</strong> to see your complete wealth health snapshot.</p>
        <p style={{marginTop: '10px', fontSize: '12px', color: '#6B5B95'}}>All data is saved locally in SQLite, so it persists across sessions.</p>
      </div>
    );
  }

  // Real API response shape: { summary, yearly_data, goal_details, asset_allocation, ... }
  const s = simulation.summary || {};
  const yearlyData = simulation.yearly_data || [];
  const goalDetails = simulation.goal_details || [];
  const recs = s.recommendations || [];

  const healthScore = s.health_score ?? 0;
  const healthColor = healthScore >= 70 ? '#059669' : healthScore >= 40 ? '#D97706' : '#DC2626';
  const healthLabel = healthScore >= 70 ? '🟢 Healthy' : healthScore >= 40 ? '🟡 Moderate' : '🔴 At Risk';

  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const safeScore = isNaN(healthScore) ? 0 : Math.max(0, Math.min(100, healthScore));
  const strokeDashoffset = circumference - (safeScore / 100) * circumference;

  const totalPortfolio = simulation.total_portfolio ?? 0;
  const portAtRetire = s.portfolio_at_retirement ?? 0;
  const fiRatio = s.fi_ratio ?? 0;
  const fiCorpusNeeded = s.fi_corpus_needed ?? 0;
  const lifeExp = s.life_expectancy ?? 85;
  const blendedReturn = simulation.blended_return ?? 0;
  const exhausted = s.portfolio_exhausted ?? false;
  const longevityAge = s.longevity_age;
  const yearsToFI = s.years_to_fi;
  const debtRatio = s.debt_to_asset_ratio ?? 0;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ backgroundColor: 'white', padding: '12px', border: '2px solid #E0D7FF', borderRadius: '14px', fontFamily: 'Nunito', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', minWidth: '200px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#6B5B95' }}>Year {label} (Age {data.age})</div>
          <div style={{ color: '#7C3AED', fontWeight: 'bold', fontSize: '15px' }}>💼 Portfolio: {fmt(data.portfolio_value)}</div>
          <div style={{ color: '#059669', fontSize: '13px', marginTop: '4px' }}>📈 Cumulative Invested: {fmt(data.cumulative_sip_inflows)}</div>
          <div style={{ color: '#DC2626', fontSize: '13px', marginTop: '4px' }}>🏦 Loan EMIs: {fmt(data.cumulative_loan_outflows)}</div>
          {data.is_retirement && data.retirement_outflow > 0 && (
            <div style={{ color: '#E11D48', fontSize: '13px', marginTop: '4px', fontWeight: '600' }}>
              🏖️ Retirement Expense: {fmt(data.retirement_outflow)}/yr
            </div>
          )}
          {data.goal_events && data.goal_events.length > 0 && (
            <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #E0D7FF', color: '#D97706', fontSize: '13px', fontWeight: 'bold' }}>
              {data.goal_events.map((g, idx) => (
                <div key={idx} style={{marginBottom: '6px'}}>
                  🎯 {g.name}
                  {g.outflow > 0 && (
                    <div style={{marginTop: '2px', marginLeft: '20px', color: '#B45309', fontSize: '12px', fontWeight: 'normal'}}>
                      Outflow: {fmt(g.outflow)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div style={{display:'flex', flexWrap: 'wrap', justifyContent:'space-between', alignItems:'center', gap: '10px', marginBottom: '18px'}}>
        <h2 className="section-title" style={{margin:0}}>
          <span className="title-icon">📊</span> Wealth Dashboard
          <span className="info-icon" data-tooltip="This is your master simulation. It aggregates all your assets, SIPs, and loans and projects them until life expectancy to test if you'll run out of money.">i</span>
        </h2>
      </div>

      {/* KPI Row */}
      <div className="kpi-grid" style={{marginBottom: '20px'}}>
        <div className="kpi-card card-peach">
          <div className="kpi-label">💼 Total Portfolio</div>
          <div className="kpi-value">{fmt(totalPortfolio)}</div>
          <div className="kpi-sub">{blendedReturn.toFixed(2)}% blended return</div>
        </div>

        <div className="kpi-card card-sky">
          <div className="kpi-label">🏖️ At Retirement</div>
          <div className={`kpi-value ${portAtRetire >= fiCorpusNeeded ? 'kpi-good' : 'kpi-warn'}`}>
            {fmt(portAtRetire)}
          </div>
          <div className="kpi-sub">FI target: {fmt(fiCorpusNeeded)}</div>
        </div>

        <div className="kpi-card card-rose">
          <div className="kpi-label">⚖️ FI Ratio (4% SWR)</div>
          <div className={`kpi-value ${fiRatio >= 1 ? 'kpi-good' : fiRatio >= 0.7 ? 'kpi-warn' : 'kpi-bad'}`}>
            {fiRatio.toFixed(2)}×
          </div>
          <div className="kpi-sub">{yearsToFI != null ? `FI in ${yearsToFI} yrs` : 'Below FI threshold'}</div>
        </div>

        <div className="kpi-card card-mint">
          <div className="kpi-label">⏳ Portfolio Longevity</div>
          <div className={`kpi-value ${!exhausted ? 'kpi-good' : 'kpi-bad'}`}>
            {exhausted ? `Age ${longevityAge} ⚠️` : `${lifeExp}+ ✓`}
          </div>
          <div className="kpi-sub">{exhausted ? `Shortfall at age ${longevityAge}` : 'Outlasts simulation'}</div>
        </div>

        <div className="kpi-card card-rose">
          <div className="kpi-label">🏦 Debt/Asset Ratio</div>
          <div className={`kpi-value ${debtRatio <= 0.2 ? 'kpi-good' : debtRatio <= 0.4 ? 'kpi-warn' : 'kpi-bad'}`}>
            {(debtRatio * 100).toFixed(2)}%
          </div>
          <div className="kpi-sub">{debtRatio > 0.4 ? 'High Debt Burden' : 'Healthy Leverage'}</div>
        </div>

      </div>

      {/* Secondary stats row */}
      <div className="grid-3" style={{marginBottom: '20px'}}>
        {/* Health Score Bar */}
        <div className="clay-card-sm card-lavender" style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '16px', marginBottom: 0}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px'}}>
            <div className="kpi-label" style={{marginBottom: 0}}>❤️ Wealth Health</div>
            <div style={{fontSize: '24px', fontWeight: '900', color: healthColor, lineHeight: 1}}>{safeScore}<span style={{fontSize: '14px', color: '#9B8EC4'}}>/100</span></div>
          </div>
          <div style={{width: '100%', height: '12px', background: '#E0D7FF', borderRadius: '10px', overflow: 'hidden'}}>
            <div style={{
              height: '100%',
              width: `${safeScore}%`,
              background: healthColor,
              borderRadius: '10px',
              transition: 'width 1s ease-in-out'
            }}></div>
          </div>
          <div style={{fontSize: '12px', fontWeight: '800', color: '#6B5B95', marginTop: '10px'}}>{healthLabel}</div>
        </div>
        <div className="clay-card-sm card-green" style={{marginBottom: 0}}>
          <div className="kpi-label">📈 SIP Monthly</div>
          <div className="kpi-value" style={{fontSize: '20px', color: '#059669'}}>
            {fmt(simulation.sip_summary?.total_monthly ?? 0)}
          </div>
          <div className="kpi-sub">{simulation.sip_summary?.count ?? 0} active SIPs</div>
        </div>
        <div className="clay-card-sm" style={{marginBottom: 0, background: 'linear-gradient(135deg, #FFF5EE, #FFE8D6)'}}>
          <div className="kpi-label">🛡️ Insurance Income</div>
          <div className="kpi-value" style={{fontSize: '20px', color: '#D97706'}}>
            {fmt(simulation.insurance_summary?.total_annual_income ?? 0)}
          </div>
          <div className="kpi-sub">{simulation.insurance_summary?.plan_count ?? 0} plans · /yr</div>
        </div>
      </div>

      {/* Portfolio Growth Chart */}
      <div className="clay-card-sm" style={{marginBottom: '20px'}}>
        <h3 className="item-name" style={{marginBottom: '14px', fontSize: '15px'}}>📈 Portfolio Growth Projection</h3>
        <div style={{height: '360px'}}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={yearlyData} margin={{top: 5, right: 10, left: 10, bottom: 5}}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="year"
                tick={{fontSize: 11, fill: '#6B5B95', fontFamily: 'Nunito'}}
                tickLine={false}
                axisLine={{stroke: '#F0EAFF'}}
              />
              <YAxis
                tickFormatter={(val) => fmtShort(val, s.currency)}
                tick={{fontSize: 11, fill: '#6B5B95', fontFamily: 'Nunito'}}
                tickLine={false}
                axisLine={{stroke: '#F0EAFF'}}
                width={70}
              />
              <Tooltip content={<CustomTooltip />} />
              {fiCorpusNeeded > 0 && (
                <ReferenceLine
                  y={fiCorpusNeeded}
                  stroke="#059669"
                  strokeDasharray="5 5"
                  label={{position: 'insideTopRight', value: '🎯 FI Target', fill: '#059669', fontSize: 11, fontFamily: 'Nunito'}}
                />
              )}
              <Line
                type="monotone"
                dataKey="portfolio_value"
                stroke="#7C3AED"
                strokeWidth={3}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  if (payload.goal_events && payload.goal_events.length > 0) {
                    return <circle cx={cx} cy={cy} r={7} fill="#D97706" stroke="white" strokeWidth={2} key={`dot-${payload.year}`} style={{filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))'}} />;
                  }
                  return null;
                }}
                activeDot={{r: 8, fill: '#7C3AED', stroke: 'white', strokeWidth: 2}}
              />
              <Line type="monotone" dataKey="cumulative_sip_inflows" stroke="#059669" strokeWidth={2} strokeDasharray="4 4" dot={false} activeDot={false} />
              <Line type="monotone" dataKey="cumulative_loan_outflows" stroke="#DC2626" strokeWidth={2} strokeDasharray="4 4" dot={false} activeDot={false} />
              <Brush dataKey="year" height={30} stroke="#7C3AED" fill="#F0EAFF" tickFormatter={(v) => ''} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Goal Status */}
      {goalDetails.length > 0 && (
        <div className="clay-card-sm" style={{marginBottom: '20px'}}>
          <h3 className="item-name" style={{marginBottom: '12px', fontSize: '15px'}}>🎯 Goal Status After Simulation</h3>
          {goalDetails.map((goal) => (
            <div key={goal.id} className="item-row" style={{marginBottom: '6px'}}>
              <div>
                <div className="item-name">{goal.name}</div>
                <div className="item-sub">Target {goal.target_year} · FV: {fmt(goal.future_value)}</div>
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                {goal.gap > 0 && <span style={{fontSize: '11px', color: '#9B8EC4'}}>Gap: {fmt(goal.gap)}</span>}
                <span className={`badge ${goal.status === 'funded' ? 'badge-funded' : goal.status === 'at_risk' ? 'badge-at-risk' : 'badge-critical'}`}>
                  {goal.status === 'funded' ? '✅ Funded' : goal.status === 'at_risk' ? '⚠️ At Risk' : '🔴 Critical'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {recs.length > 0 && (
        <div className="clay-card-sm">
          <h3 className="item-name" style={{marginBottom: '12px', fontSize: '15px'}}>💡 Smart Recommendations</h3>
          {recs.map((rec, idx) => (
            <div key={idx} className="rec-item">{rec}</div>
          ))}
        </div>
      )}
    </div>
  );
}
