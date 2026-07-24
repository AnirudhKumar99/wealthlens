import React, { useState, useEffect } from 'react';
import { api, fmt } from '../api/client';

export default function Profile({ showToast }) {
  const [profile, setProfile] = useState({
    family_name: '', current_age: 30, retire_at: 60, life_expectancy: 90,
    annual_income: 0, monthly_retirement_expenses: 0, currency: 'INR'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProfile().then(data => {
      if (data) setProfile(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleSave = async () => {
    try {
      await api.updateProfile(profile);
      showToast('✅ Profile saved!');
    } catch (err) {
      showToast('❌ Error saving profile');
    }
  };

  if (loading) return <div className="clay-card card-mint"><p>Loading...</p></div>;

  const fiCorpus = profile.monthly_retirement_expenses * 12 * 25;
  const yearsToRetire = profile.retire_at - profile.current_age;

  return (
    <div className="clay-card card-mint">
      <h2 className="section-title"><span className="title-icon">👤</span> Family Profile</h2>
      
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Family Name</label>
          <input className="form-input" name="family_name" value={profile.family_name} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label className="form-label">Currency</label>
          <select className="form-input" name="currency" value={profile.currency} onChange={handleChange}>
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
          </select>
        </div>
      </div>

      <div className="grid-3">
        <div className="form-group">
          <label className="form-label">Current Age</label>
          <input className="form-input" type="number" name="current_age" value={profile.current_age} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label className="form-label">Retire At Age</label>
          <input className="form-input" type="number" name="retire_at" value={profile.retire_at} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label className="form-label">Life Expectancy</label>
          <input className="form-input" type="number" name="life_expectancy" value={profile.life_expectancy} onChange={handleChange} />
        </div>
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Annual Income ({profile.currency})</label>
          <input className="form-input" type="number" name="annual_income" value={profile.annual_income} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label className="form-label">Monthly Retirement Expenses ({profile.currency})</label>
          <input className="form-input" type="number" name="monthly_retirement_expenses" value={profile.monthly_retirement_expenses} onChange={handleChange} />
        </div>
      </div>

      <div className="clay-card-sm card-mint" style={{margin: '20px 0'}}>
        <div className="grid-2">
          <div>
            <div className="kpi-label">🎯 FI Corpus Needed</div>
            <div className="kpi-value">{fmt(fiCorpus, profile.currency)}</div>
          </div>
          <div>
            <div className="kpi-label">⏳ Years to Retirement</div>
            <div className="kpi-value">{yearsToRetire > 0 ? yearsToRetire : 0} Years</div>
          </div>
        </div>
      </div>

      <button className="btn-primary" onClick={handleSave}>💾 Save Profile</button>
    </div>
  );
}
