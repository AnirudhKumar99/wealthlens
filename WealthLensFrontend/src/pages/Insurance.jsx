import React, { useState, useEffect } from 'react';
import { api, fmt } from '../api/client';
import NumberInput from '../components/NumberInput';

export default function Insurance({ profileId, showToast }) {
  const [plans, setPlans] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState({ open: false, data: null });
  const [isCompounded, setIsCompounded] = useState(false);

  const loadData = () => {
    if (profileId) {
      api.getInsurance(profileId).then(setPlans).catch(console.error);
    }
    api.getCategories().then(setCategories).catch(console.error);
  };

  useEffect(() => { loadData(); }, [profileId]);

  const filteredPlans = filter === 'all' 
    ? plans 
    : plans.filter(p => (p.policy_type || 'endowment') === filter);

  const totalIncome = plans.reduce((sum, p) => sum + (p.annual_income || 0), 0);
  const totalBonus = plans.reduce((sum, p) => sum + (p.terminal_bonus || 0), 0);

  const handleOpenModal = (plan = null) => {
    setIsCompounded(plan ? Boolean(plan.is_compounded_bonus) : false);
    setModal({ open: true, data: plan });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      name: fd.get('name'),
      policy_type: fd.get('policy_type') || 'endowment',
      annual_premium: Number(fd.get('annual_premium')),
      premium_end_year: Number(fd.get('premium_end_year')),
      income_start_year: Number(fd.get('income_start_year')),
      annual_income: Number(fd.get('annual_income')),
      income_end_year: Number(fd.get('income_end_year')),
      terminal_bonus: Number(fd.get('terminal_bonus')),
      death_benefit: Number(fd.get('death_benefit')),
      accidental_rider: Number(fd.get('accidental_rider_amount')),
      annual_bonus_rate: Number(fd.get('annual_bonus_rate') || 0),
      is_compounded_bonus: isCompounded
    };
    try {
      if (modal.data) await api.updateInsurance(profileId, modal.data.id, data);
      else await api.createInsurance(profileId, data);
      showToast('✅ Insurance saved!');
      setModal({ open: false, data: null });
      loadData();
    } catch (err) {
      showToast('❌ Error saving insurance');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this insurance plan?')) {
      try {
        await api.deleteInsurance(profileId, id);
        showToast('🗑️ Insurance deleted');
        loadData();
      } catch (err) {
        showToast('❌ Error deleting insurance');
      }
    }
  };

  const getPolicyBadge = (ptype) => {
    switch(ptype) {
      case 'term_life': return 'badge-debt';
      case 'endowment': return 'badge-gold';
      case 'guaranteed_income': return 'badge-funded';
      case 'ulip': return 'badge-equity';
      default: return 'badge-gold';
    }
  };

  return (
    <div className="clay-card card-gold">
      <div style={{display:'flex', flexWrap: 'wrap', justifyContent:'space-between', alignItems:'center', gap: '10px', marginBottom: '18px'}}>
        <h2 className="section-title" style={{margin:0}}>
          <span className="title-icon">🛡️</span> Insurance
          <span className="info-icon" data-tooltip="Track your Term Life, Endowment, ULIP, and Guaranteed Income insurance policies here.">i</span>
        </h2>
        <div style={{display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap'}}>
          <select 
            className="form-input" 
            style={{padding: '0 16px', borderRadius: '50px', width: 'auto', minWidth: '160px', height: '38px'}} 
            value={filter} 
            onChange={e => setFilter(e.target.value)}
          >
            <option value="all">All Policies ({plans.length})</option>
            {categories.filter(c => c.category_type === 'policy_type').map(c => (
              <option key={c.code} value={c.code}>{c.display_name}</option>
            ))}
          </select>
          <button className="btn-primary" onClick={() => handleOpenModal(null)}>➕ Add Plan</button>
        </div>
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
          <div className="kpi-value">{filteredPlans.length}</div>
        </div>
      </div>

      <div>
        {filteredPlans.map(plan => {
          const ptype = plan.policy_type || 'endowment';
          const ptypeName = categories.find(c => c.category_type === 'policy_type' && c.code === ptype)?.display_name || ptype.replace('_', ' ').toUpperCase();
          
          return (
            <div key={plan.id} className="item-row">
              <div className="item-main">
                <div className="item-name-group">
                  <span className="item-name">{plan.name}</span>
                  <span className={`badge ${getPolicyBadge(ptype)}`}>
                    {ptypeName}
                  </span>
                  {plan.annual_bonus_rate > 0 && (
                    <span className="badge badge-funded" style={{fontSize: '10px'}}>
                      {plan.is_compounded_bonus ? '📈 Compounding' : '➕ Simple'} {plan.annual_bonus_rate}% Bonus
                    </span>
                  )}
                </div>
                <div className="item-sub">
                  Pays {fmt(plan.annual_income)}/yr ({plan.income_start_year} - {plan.income_end_year}) • Death Benefit: {fmt(plan.death_benefit)}
                </div>
              </div>
              <div className="item-meta">
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#2D1B69' }}>
                    {fmt(plan.annual_premium)}<span style={{fontSize: '13px', color: '#9B8EC4'}}>/yr</span>
                  </div>
                  <div className="item-sub" style={{textTransform: 'uppercase', letterSpacing: '0.5px'}}>Premium (Till {plan.premium_end_year})</div>
                </div>
                <div className="item-actions">
                  <button className="btn-icon" onClick={() => handleOpenModal(plan)}>✏️</button>
                  <button className="btn-icon" onClick={() => handleDelete(plan.id)}>🗑️</button>
                </div>
              </div>
            </div>
          );
        })}
        {filteredPlans.length === 0 && <div className="empty-state">No insurance plans found for this filter. Secure your family!</div>}
      </div>

      {modal.open && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3 className="modal-title">{modal.data ? '✏️ Edit Plan' : '➕ Add Plan'}</h3>
            <form onSubmit={handleSave}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input className="form-input" name="name" defaultValue={modal.data?.name || ''} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Policy Type</label>
                  <select className="form-input" name="policy_type" defaultValue={modal.data?.policy_type || 'endowment'}>
                    <option value="term_life">Term Life Insurance</option>
                    <option value="endowment">Endowment / Participating Plan</option>
                    <option value="guaranteed_income">Guaranteed Income Plan</option>
                    <option value="ulip">ULIP Plan</option>
                    <option value="health_other">Health / Other Insurance</option>
                  </select>
                </div>
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
                  <label className="form-label">Terminal / Maturity Bonus</label>
                  <NumberInput name="terminal_bonus" defaultValue={modal.data?.terminal_bonus || 0} required />
                </div>
              </div>

              <div className="grid-2" style={{alignItems: 'center'}}>
                <div className="form-group">
                  <label className="form-label">Annual Bonus Rate (%/yr)</label>
                  <input className="form-input" type="number" step="0.1" name="annual_bonus_rate" defaultValue={modal.data?.annual_bonus_rate || 0} placeholder="e.g. 4.5" />
                </div>
                <div className="form-group" style={{display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '18px'}}>
                  <input 
                    type="checkbox" 
                    id="is_compounded"
                    checked={isCompounded} 
                    onChange={e => setIsCompounded(e.target.checked)}
                    style={{width: '18px', height: '18px', cursor: 'pointer', accentColor: '#7C3AED'}}
                  />
                  <label htmlFor="is_compounded" style={{fontSize: '12px', fontWeight: 800, color: '#2D1B69', cursor: 'pointer'}}>
                    Compounding Bonus (Adds & Compounds Yearly)
                  </label>
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Death Benefit (Sum Assured)</label>
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
