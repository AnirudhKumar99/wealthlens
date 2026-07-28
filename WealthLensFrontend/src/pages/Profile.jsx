import React, { useState, useEffect } from 'react';
import { api, fmt } from '../api/client';
import NumberInput from '../components/NumberInput';

export default function Profile({ profileId, showToast, onProfileDeleted }) {
  const [form, setForm] = useState({
    family_name: '', current_age: 35, retirement_age: 60, life_expectancy: 85,
    annual_income: 0, savings_rate: 30, monthly_expenses_retirement: 60000,
    retirement_inflation_rate: 6.0, currency: 'INR'
  });

  useEffect(() => {
    if (profileId) {
      api.getProfile(profileId).then(data => {
        if(data) setForm(data);
      });
    }
  }, [profileId]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.updateProfile(profileId, form);
      showToast('✅ Profile saved!');
    } catch {
      showToast('❌ Error saving profile');
    }
  };
  
  const handleDelete = async () => {
    if(window.confirm('Are you sure? This will delete the profile and all associated assets, goals, and plans.')) {
      await api.deleteProfile(profileId);
      showToast('🗑️ Profile deleted');
      onProfileDeleted();
    }
  };

  const mRetExp = Number(form.monthly_expenses_retirement) || 0;
  const currAge = Number(form.current_age) || 35;
  const retAge = Number(form.retirement_age) || 60;
  const retInf = (Number(form.retirement_inflation_rate) || 6) / 100;
  const yrsToRetire = Math.max(0, retAge - currAge);
  
  const mRetExpAtRetire = mRetExp * Math.pow(1 + retInf, yrsToRetire);
  const annualExpAtRetire = mRetExpAtRetire * 12;
  const fiCorpusNeeded = annualExpAtRetire * 25;

  return (
    <div className="clay-card card-mint">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <h2 className="section-title" style={{margin: 0}}>
          <span className="title-icon">👤</span> Family Profile
          <span className="info-icon" data-tooltip="Set your baseline details like age, income, and retirement targets to ground your financial simulation.">i</span>
        </h2>
        <button className="btn-danger" onClick={handleDelete}>Delete Profile</button>
      </div>

      <div className="grid-2">
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Profile Name</label>
            <input name="family_name" value={form.family_name} onChange={handleChange} className="form-input" required />
          </div>
          
          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Current Age</label>
              <input type="number" name="current_age" value={form.current_age} onChange={handleChange} className="form-input" required />
            </div>
            <div className="form-group">
              <label className="form-label">Retire At</label>
              <input type="number" name="retirement_age" value={form.retirement_age} onChange={handleChange} className="form-input" required />
            </div>
            <div className="form-group">
              <label className="form-label">Life Expectancy</label>
              <input type="number" name="life_expectancy" value={form.life_expectancy} onChange={handleChange} className="form-input" required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Annual Income</label>
            <NumberInput name="annual_income" value={form.annual_income} onChange={handleChange} required currency={form.currency} />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Monthly Expenses in Retirement (PV)</label>
              <NumberInput name="monthly_expenses_retirement" value={form.monthly_expenses_retirement} onChange={handleChange} required currency={form.currency} />
            </div>
            <div className="form-group">
              <label className="form-label">Post-Retirement Inflation (%)</label>
              <input type="number" step="0.01" name="retirement_inflation_rate" value={form.retirement_inflation_rate ?? 6.0} onChange={handleChange} className="form-input" required />
            </div>
          </div>

          <div style={{marginTop: '20px'}}>
            <button type="submit" className="btn-primary">Save Profile 💾</button>
          </div>
        </form>

        <div>
          <div className="clay-card-sm card-sky">
            <div className="kpi-label">🎯 FI Corpus Needed</div>
            <div className="kpi-value" style={{color: '#059669', fontSize: '32px'}}>{fmt(fiCorpusNeeded, form.currency)}</div>
            <div className="kpi-sub">Based on 4% safe withdrawal rule ({fmt(annualExpAtRetire, form.currency)}/yr at Age {retAge})</div>
            
            <div className="divider"></div>
            
            <div className="kpi-label">⏳ Years to Retirement</div>
            <div className="kpi-value">{yrsToRetire > 0 ? yrsToRetire : 0} Years</div>
          </div>
        </div>
      </div>
    </div>
  );
}
