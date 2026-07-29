import React from 'react';
import { fmt } from '../api/client';

export default function FamilyDashboard({ familyData, onSelectProfile }) {
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
  const reVal = alloc.real_estate || 0;

  const eqPct = totalPortfolio > 0 ? (eqVal / totalPortfolio * 100).toFixed(1) : 0;
  const debtPct = totalPortfolio > 0 ? (debtVal / totalPortfolio * 100).toFixed(1) : 0;
  const hybPct = totalPortfolio > 0 ? (hybVal / totalPortfolio * 100).toFixed(1) : 0;
  const goldPct = totalPortfolio > 0 ? (goldVal / totalPortfolio * 100).toFixed(1) : 0;

  return (
    <div className="animate-fade-in-up">
      {/* Title */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          <span className="title-icon">🏠</span> Family Household Hub
        </h2>
        <div className="badge badge-equity" style={{ fontSize: '13px', padding: '6px 14px' }}>
          👨‍👩‍👧‍👦 {kpis.total_members || 0} Family Members Linked
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
