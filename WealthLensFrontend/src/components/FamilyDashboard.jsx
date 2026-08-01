import React, { useState } from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Brush } from 'recharts';
import { fmt, fmtShort } from '../api/client';

export default function FamilyDashboard({ familyData, onSelectProfile, onOpenImport }) {
  const [chartType, setChartType] = useState('area'); // 'area' or 'line'

  if (!familyData || !familyData.kpis) {
    return (
      <div className="clay-card card-lavender empty-state animate-fade-in-up" style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div className="empty-icon">🏠</div>
        <div className="section-title" style={{ justifyContent: 'center', fontSize: '22px' }}>Loading Family Household Hub...</div>
      </div>
    );
  }

  const kpis = familyData.kpis || {};
  const alloc = familyData.allocation || {};
  const members = familyData.member_cards || [];
  const trajectory = familyData.yearly_trajectory || [];

  const totalPortfolio = kpis.total_assets || 0;
  const netWorth = kpis.net_worth || 0;
  const totalSip = kpis.monthly_sip || 0;
  const totalDebt = kpis.total_debt || 0;
  const healthScore = kpis.health_score || 70;

  const healthColor = healthScore >= 70 ? '#059669' : healthScore >= 40 ? '#D97706' : '#DC2626';
  const healthLabel = healthScore >= 70 ? '🟢 Healthy' : healthScore >= 40 ? '🟡 Moderate' : '🔴 At Risk';

  // Allocation percentages
  const eqVal = alloc.equity || 0;
  const debtVal = alloc.debt || 0;
  const hybVal = alloc.hybrid || 0;
  const goldVal = alloc.gold || 0;

  const eqPct = totalPortfolio > 0 ? (eqVal / totalPortfolio * 100).toFixed(1) : 0;
  const debtPct = totalPortfolio > 0 ? (debtVal / totalPortfolio * 100).toFixed(1) : 0;
  const hybPct = totalPortfolio > 0 ? (hybVal / totalPortfolio * 100).toFixed(1) : 0;
  const goldPct = totalPortfolio > 0 ? (goldVal / totalPortfolio * 100).toFixed(1) : 0;

  const MEMBER_COLORS = ['#7C3AED', '#059669', '#D97706', '#0284C7', '#EC4899', '#8B5CF6'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ backgroundColor: 'white', padding: '14px', border: '2px solid #E0D7FF', borderRadius: '16px', fontFamily: 'Nunito', boxShadow: '0 8px 16px rgba(0,0,0,0.12)', minWidth: '240px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#6B5B95', fontSize: '13px' }}>
            📅 Year {label}
          </div>

          <div style={{ color: '#7C3AED', fontWeight: '900', fontSize: '16px', marginBottom: '8px', borderBottom: '1px solid #F0EAFF', paddingBottom: '6px' }}>
            🏠 Household Net Worth: {fmt(data.family_total)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {members.map((m, idx) => {
              const val = data[m.name] || 0;
              return (
                <div key={m.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', color: MEMBER_COLORS[idx % MEMBER_COLORS.length] }}>
                  <span>👤 {m.name} ({m.role}):</span>
                  <span style={{ marginLeft: '12px' }}>{fmt(val)}</span>
                </div>
              );
            })}
          </div>

          {data.goal_events && data.goal_events.length > 0 && (
            <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #E0D7FF', color: '#D97706', fontSize: '12px', fontWeight: 'bold' }}>
              {data.goal_events.map((g, idx) => (
                <div key={idx} style={{ marginBottom: '4px' }}>
                  🎯 {g.owner}: {g.name}
                  {g.outflow > 0 && (
                    <span style={{ color: '#B45309', marginLeft: '6px', fontSize: '11px', fontWeight: 'normal' }}>
                      ({fmt(g.outflow)})
                    </span>
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
    <div className="animate-fade-in-up">
      {/* Header Title */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          <span className="title-icon">🏠</span> Family Household Hub
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onOpenImport && (
            <button 
              className="btn-secondary" 
              onClick={onOpenImport}
              style={{ borderRadius: '50px', padding: '6px 16px', fontSize: '12px', border: '1.5px solid #93C5FD', color: '#2563EB', background: '#EFF6FF', fontWeight: 800 }}
            >
              📥 Import Excel (.xlsx)
            </button>
          )}
          <div className="badge badge-equity" style={{ fontSize: '13px', padding: '6px 14px' }}>
            👨‍👩‍👧‍👦 {kpis.total_members || 0} Family Members Linked
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="kpi-card card-peach">
          <div className="kpi-label">💼 Total Household Wealth</div>
          <div className="kpi-value" style={{ color: '#7C3AED' }}>{fmt(totalPortfolio)}</div>
          <div className="kpi-sub">{kpis.total_assets_count || 0} assets across family</div>
        </div>

        <div className="kpi-card card-mint">
          <div className="kpi-label">📈 Monthly Family SIPs</div>
          <div className="kpi-value" style={{ color: '#059669' }}>{fmt(totalSip)}/mo</div>
          <div className="kpi-sub">{kpis.total_sips_count || 0} active SIP plans</div>
        </div>

        <div className="kpi-card card-sky">
          <div className="kpi-label">🏦 Total Family Debt</div>
          <div className="kpi-value" style={{ color: totalDebt > 0 ? '#DC2626' : '#059669' }}>{fmt(totalDebt)}</div>
          <div className="kpi-sub">{kpis.total_loans_count || 0} active loans</div>
        </div>

        <div className="kpi-card card-lavender">
          <div className="kpi-label">❤️ Household Health</div>
          <div className="kpi-value" style={{ color: healthColor }}>{healthScore}/100</div>
          <div className="kpi-sub" style={{ fontWeight: 700, color: healthColor }}>{healthLabel}</div>
        </div>
      </div>

      {/* Trajectory Growth Chart with Timeline Zooming */}
      <div className="clay-card card-sky" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div className="section-title" style={{ margin: 0, fontSize: '18px' }}>
            <span>📊 Family Wealth Trajectory & Growth Projection</span>
            <span className="info-icon" data-tooltip="Use the slider at the bottom of the chart to zoom into specific decade timelines. Hover over any year to inspect member wealth contributions and goal events in Rupees.">i</span>
          </div>

          {/* Toggle buttons for Area vs Line */}
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.8)', padding: '4px', borderRadius: '50px', border: '1px solid #E0D7FF' }}>
            <button 
              className={`btn-secondary ${chartType === 'area' ? 'btn-primary' : ''}`}
              style={{ padding: '4px 14px', fontSize: '12px', borderRadius: '50px' }}
              onClick={() => setChartType('area')}
            >
              📊 Stacked Contribution
            </button>
            <button 
              className={`btn-secondary ${chartType === 'line' ? 'btn-primary' : ''}`}
              style={{ padding: '4px 14px', fontSize: '12px', borderRadius: '50px' }}
              onClick={() => setChartType('line')}
            >
              📈 Member Comparison
            </button>
          </div>
        </div>

        <div style={{ width: '100%', height: 380 }}>
          <ResponsiveContainer>
            {chartType === 'area' ? (
              <AreaChart data={trajectory} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  {members.map((m, idx) => {
                    const color = MEMBER_COLORS[idx % MEMBER_COLORS.length];
                    return (
                      <linearGradient key={m.name} id={`grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.85}/>
                        <stop offset="95%" stopColor={color} stopOpacity={0.3}/>
                      </linearGradient>
                    );
                  })}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0D7FF" />
                <XAxis dataKey="year" stroke="#6B5B95" tick={{ fill: '#6B5B95', fontSize: 12, fontFamily: 'Nunito' }} />
                <YAxis stroke="#6B5B95" tick={{ fill: '#6B5B95', fontSize: 12, fontFamily: 'Nunito' }} tickFormatter={(v) => fmtShort(v, 'INR')} width={70} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '8px' }} />
                
                {members.map((m, idx) => (
                  <Area
                    key={m.name}
                    type="monotone"
                    dataKey={m.name}
                    stackId="1"
                    name={`${m.name} (${m.role})`}
                    stroke={MEMBER_COLORS[idx % MEMBER_COLORS.length]}
                    fill={`url(#grad-${idx})`}
                    strokeWidth={2}
                  />
                ))}

                {/* Timeline Zoom Slider Brush */}
                <Brush dataKey="year" height={28} stroke="#7C3AED" fill="#F0EAFF" tickFormatter={() => ''} />
              </AreaChart>
            ) : (
              <LineChart data={trajectory} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0D7FF" />
                <XAxis dataKey="year" stroke="#6B5B95" tick={{ fill: '#6B5B95', fontSize: 12, fontFamily: 'Nunito' }} />
                <YAxis stroke="#6B5B95" tick={{ fill: '#6B5B95', fontSize: 12, fontFamily: 'Nunito' }} tickFormatter={(v) => fmtShort(v, 'INR')} width={70} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '8px' }} />
                
                <Line
                  type="monotone"
                  dataKey="family_total"
                  name="🏠 Household Total"
                  stroke="#2D1B69"
                  strokeWidth={3.5}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (payload.goal_events && payload.goal_events.length > 0) {
                      return <circle cx={cx} cy={cy} r={6} fill="#D97706" stroke="white" strokeWidth={2} key={`dot-${payload.year}`} style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))' }} />;
                    }
                    return null;
                  }}
                  activeDot={{ r: 8, fill: '#2D1B69', stroke: 'white', strokeWidth: 2 }}
                />
                
                {members.map((m, idx) => (
                  <Line
                    key={m.name}
                    type="monotone"
                    dataKey={m.name}
                    name={`${m.name} (${m.role})`}
                    stroke={MEMBER_COLORS[idx % MEMBER_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}

                {/* Timeline Zoom Slider Brush */}
                <Brush dataKey="year" height={28} stroke="#7C3AED" fill="#F0EAFF" tickFormatter={() => ''} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Family Members Grid */}
      <div className="clay-card card-lavender" style={{ marginBottom: '24px' }}>
        <div className="section-title" style={{ fontSize: '18px', marginBottom: '16px' }}>
          <span>👤 Family Members Breakdown</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {members.map(m => {
            const mScore = m.health_score ?? 70;
            const mColor = mScore >= 70 ? '#059669' : mScore >= 40 ? '#D97706' : '#DC2626';

            return (
              <div 
                key={m.id} 
                className="clay-card-sm card-mint"
                style={{ 
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  padding: '18px', transition: 'all 0.2s ease', cursor: 'pointer'
                }}
                onClick={() => onSelectProfile(m.id)}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 900, color: '#2D1B69' }}>{m.name}</span>
                    <span className="badge badge-equity" style={{ fontSize: '11px' }}>{m.role}</span>
                  </div>

                  <div style={{ fontSize: '12px', color: '#6B5B95', marginBottom: '12px' }}>
                    {m.current_age} yrs old · Retires at {m.retirement_age}
                  </div>

                  <div style={{ background: 'white', borderRadius: '12px', padding: '10px 12px', marginBottom: '12px', border: '1px solid #E0D7FF' }}>
                    <div style={{ fontSize: '11px', color: '#9B8EC4', textTransform: 'uppercase', fontWeight: 700 }}>Portfolio Value</div>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#7C3AED' }}>{fmt(m.portfolio_value)}</div>
                    <div style={{ fontSize: '11px', color: '#6B5B95', marginTop: '2px' }}>{m.asset_count} assets</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: mColor }}>
                    ❤️ {mScore}/100
                  </span>
                  <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                    View Profile →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Household Asset Allocation */}
      <div className="clay-card card-peach">
        <div className="section-title" style={{ fontSize: '18px', marginBottom: '14px' }}>
          <span>⚖️ Household Asset Allocation</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          <div style={{ background: 'white', padding: '14px', borderRadius: '14px', border: '1.5px solid #E0D7FF' }}>
            <div style={{ fontSize: '12px', color: '#6B5B95', fontWeight: 700 }}>🟣 Equity</div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: '#7C3AED' }}>{fmt(eqVal)}</div>
            <div style={{ fontSize: '11px', color: '#9B8EC4' }}>{eqPct}% of household</div>
          </div>

          <div style={{ background: 'white', padding: '14px', borderRadius: '14px', border: '1.5px solid #E0D7FF' }}>
            <div style={{ fontSize: '12px', color: '#6B5B95', fontWeight: 700 }}>🔵 Hybrid</div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: '#0C4A6E' }}>{fmt(hybVal)}</div>
            <div style={{ fontSize: '11px', color: '#9B8EC4' }}>{hybPct}% of household</div>
          </div>

          <div style={{ background: 'white', padding: '14px', borderRadius: '14px', border: '1.5px solid #E0D7FF' }}>
            <div style={{ fontSize: '12px', color: '#6B5B95', fontWeight: 700 }}>🔷 Debt</div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: '#1E40AF' }}>{fmt(debtVal)}</div>
            <div style={{ fontSize: '11px', color: '#9B8EC4' }}>{debtPct}% of household</div>
          </div>

          <div style={{ background: 'white', padding: '14px', borderRadius: '14px', border: '1.5px solid #E0D7FF' }}>
            <div style={{ fontSize: '12px', color: '#6B5B95', fontWeight: 700 }}>🟡 Gold</div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: '#92400E' }}>{fmt(goldVal)}</div>
            <div style={{ fontSize: '11px', color: '#9B8EC4' }}>{goldPct}% of household</div>
          </div>
        </div>
      </div>
    </div>
  );
}
