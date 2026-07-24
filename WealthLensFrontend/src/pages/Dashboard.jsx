import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { fmt } from '../api/client';

export default function Dashboard({ simulation }) {
  if (!simulation) {
    return (
      <div className="clay-card card-lavender empty-state">
        <div className="empty-icon">🚀</div>
        <div className="section-title" style={{justifyContent: 'center'}}>No Simulation Data</div>
        <p>Run your first simulation to see your wealth health!</p>
        <p style={{marginTop: '10px', fontSize: '12px', color: '#6B5B95'}}>Click the "Run Simulation 🚀" button in the header.</p>
      </div>
    );
  }

  const { metrics, yearly_data, recommendations, health_score } = simulation;
  
  const healthColor = health_score >= 70 ? '#059669' : health_score >= 40 ? '#D97706' : '#DC2626';
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (health_score / 100) * circumference;

  return (
    <div className="clay-card card-lavender">
      <h2 className="section-title"><span className="title-icon">🏠</span> Dashboard</h2>
      
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">💼 Total Portfolio</div>
          <div className="kpi-value">{fmt(metrics?.current_portfolio_value || 0)}</div>
          <div className="kpi-sub">Current Value</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">🏖️ At Retirement</div>
          <div className="kpi-value">{fmt(metrics?.portfolio_at_retirement || 0)}</div>
          <div className="kpi-sub">Projected Corpus</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">⚖️ FI Ratio</div>
          <div className={`kpi-value ${metrics?.fi_ratio >= 1 ? 'kpi-good' : metrics?.fi_ratio >= 0.5 ? 'kpi-warn' : 'kpi-bad'}`}>
            {(metrics?.fi_ratio || 0).toFixed(2)}x
          </div>
          <div className="kpi-sub">Target: {fmt(metrics?.fi_corpus_needed || 0)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">⏳ Portfolio Longevity</div>
          <div className={`kpi-value ${metrics?.portfolio_lasts_until_age >= (metrics?.life_expectancy || 90) ? 'kpi-good' : 'kpi-warn'}`}>
            Age {metrics?.portfolio_lasts_until_age || '--'}
          </div>
          <div className="kpi-sub">Expected to last</div>
        </div>
        <div className="kpi-card" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px'}}>
          <div className="health-gauge-wrap">
            <div className="health-ring">
              <svg width="120" height="120">
                <circle cx="60" cy="60" r={radius} fill="transparent" stroke="#E0D7FF" strokeWidth="12" />
                <circle cx="60" cy="60" r={radius} fill="transparent" stroke={healthColor} strokeWidth="12" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{transition: 'stroke-dashoffset 1s ease-in-out'}} />
              </svg>
              <div className="health-ring-label">
                <span className="health-score-num">{health_score}</span>
                <span className="health-score-sub">SCORE</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="clay-card-sm" style={{marginBottom: '20px', height: '300px'}}>
        <h3 className="item-name" style={{marginBottom: '10px'}}>📈 Portfolio Growth</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={yearly_data || []}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="year" tick={{fontSize: 12, fill: '#6B5B95'}} tickLine={false} axisLine={{stroke: '#F0EAFF'}} />
            <YAxis tickFormatter={(val) => fmt(val)} tick={{fontSize: 12, fill: '#6B5B95'}} tickLine={false} axisLine={{stroke: '#F0EAFF'}} width={80} />
            <Tooltip formatter={(value) => [fmt(value), 'Portfolio Value']} labelStyle={{color: '#2D1B69', fontWeight: 'bold'}} />
            <ReferenceLine y={metrics?.fi_corpus_needed} stroke="#059669" strokeDasharray="3 3" label={{position: 'top', value: 'FI Target', fill: '#059669', fontSize: 12}} />
            <Line type="monotone" dataKey="portfolio_value" stroke="#7C3AED" strokeWidth={3} dot={false} activeDot={{r: 6}} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {recommendations && recommendations.length > 0 && (
        <div className="clay-card-sm">
          <h3 className="item-name" style={{marginBottom: '10px'}}>💡 Recommendations</h3>
          {recommendations.map((rec, idx) => (
            <div key={idx} className="rec-item">
              <span style={{fontSize: '16px'}}>📌</span>
              <div>{rec}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
