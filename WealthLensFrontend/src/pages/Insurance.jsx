import React, { useState, useEffect } from 'react';
import { api, fmt } from '../api/client';
import NumberInput from '../components/NumberInput';

export default function Insurance({ profileId, showToast }) {
  const [plans, setPlans] = useState([]);
  const [modal, setModal] = useState({ open: false, data: null });

  const loadPlans = () => {
    if (profileId) api.getInsurance(profileId).then(setPlans).catch(console.error);
  };

  useEffect(() => { loadPlans(); }, [profileId]);

  const totalIncome = plans.reduce((sum, p) => sum + p.annual_income, 0);
  const totalBonus = plans.reduce((sum, p) => sum + p.terminal_bonus, 0);

  const handleSave = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      name: fd.get('name'),
      annual_premium: Number(fd.get('annual_premium')),
      premium_end_year: Number(fd.get('premium_end_year')),
      income_start_year: Number(fd.get('income_start_year')),
      annual_income: Number(fd.get('annual_income')),
      income_end_year: Number(fd.get('income_end_year')),
      terminal_bonus: Number(fd.get('terminal_bonus')),
      death_benefit: Number(fd.get('death_benefit')),
      accidental_rider_amount: Number(fd.get('accidental_rider_amount'))
    };
    try {
      if (modal.data) await api.updateInsurance(profileId, modal.data.id, data);
      else await api.createInsurance(profileId, data);
      showToast('✅ Insurance saved!');
      setModal({ open: false, data: null });
      loadPlans();
    } catch (err) {
      showToast('❌ Error saving insurance');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this insurance plan?')) {
      try {
        await api.deleteInsurance(profileId, id);
        showToast('🗑️ Insurance deleted');
        loadPlans();
      } catch (err) {
        showToast('❌ Error deleting insurance');
      }
    }
  };

  return (
    <div className="clay-card card-gold">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '18px'}}>
        <h2 className="section-title" style={{margin:0}}>
          <span className="title-icon">🛡️</span> Insurance
          <span className="info-icon" data-tooltip="Track your life, health, and income insurance policies here.">i</span>
        </h2>
        <button className="btn-primary" onClick={() => setModal({open: true, data: null})}>➕ Add Plan</button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">💵 Guaranteed Income</div>
          <div className="kpi-value">{fmt(totalIncome)}</div>
          <div className="kpi-sub">Total Annual Income</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">🎁 Terminal Bonus</div>
          <div className="kpi-value">{fmt(totalBonus)}</div>
          <div className="kpi-sub">Expected Maturity</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">📋 Plan Count</div>
          <div className="kpi-value">{plans.length}</div>
        </div>
      </div>

      <div>
        {plans.map(plan => (
          <div key={plan.id} className="item-row">
            <div style={{flex: 1}}>
              <div className="item-name">{plan.name}</div>
              <div className="item-sub">
                Pays {fmt(plan.annual_income)}/yr ({plan.income_start_year} - {plan.income_end_year}) • Death Benefit: {fmt(plan.death_benefit)}
              </div>
            </div>
            <div style={{ paddingRight: '24px', textAlign: 'right' }}>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#2D1B69' }}>
                {fmt(plan.annual_premium)}<span style={{fontSize: '14px', color: '#9B8EC4'}}>/yr</span>
              </div>
              <div className="item-sub" style={{textTransform: 'uppercase', letterSpacing: '0.5px'}}>Premium (Till {plan.premium_end_year})</div>
            </div>
            <div className="item-actions">
              <button className="btn-icon" onClick={() => setModal({open: true, data: plan})}>✏️</button>
              <button className="btn-icon" onClick={() => handleDelete(plan.id)}>🗑️</button>
            </div>
          </div>
        ))}
        {plans.length === 0 && <div className="empty-state">No insurance plans found. Secure your family!</div>}
      </div>

      {modal.open && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3 className="modal-title">{modal.data ? '✏️ Edit Plan' : '➕ Add Plan'}</h3>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" name="name" defaultValue={modal.data?.name || ''} required />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Annual Premium</label>
                  <NumberInput name="annual_premium" defaultValue={modal.data?.annual_premium || 0} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Premium End Year</label>
                  <input className="form-input" type="number" name="premium_end_year" defaultValue={modal.data?.premium_end_year || new Date().getFullYear()+10} required />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Income Start Year</label>
                  <input className="form-input" type="number" name="income_start_year" defaultValue={modal.data?.income_start_year || new Date().getFullYear()+11} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Annual Income</label>
                  <NumberInput name="annual_income" defaultValue={modal.data?.annual_income || 0} required />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Income End Year</label>
                  <input className="form-input" type="number" name="income_end_year" defaultValue={modal.data?.income_end_year || new Date().getFullYear()+30} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Terminal Bonus</label>
                  <NumberInput name="terminal_bonus" defaultValue={modal.data?.terminal_bonus || 0} required />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Death Benefit</label>
                  <NumberInput name="death_benefit" defaultValue={modal.data?.death_benefit || 0} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Accidental Rider Amt</label>
                  <NumberInput name="accidental_rider_amount" defaultValue={modal.data?.accidental_rider_amount || 0} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setModal({open: false, data: null})}>Cancel</button>
                <button type="submit" className="btn-primary">Save Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
