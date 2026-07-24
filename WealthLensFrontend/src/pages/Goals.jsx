import React, { useState, useEffect } from 'react';
import { api, fmt } from '../api/client';

export default function Goals({ showToast }) {
  const [goals, setGoals] = useState([]);
  const [modal, setModal] = useState({ open: false, data: null });
  const [goalType, setGoalType] = useState('lump_sum');
  const currentYear = new Date().getFullYear();

  const loadGoals = () => {
    api.getGoals().then(data => {
      const sorted = data.sort((a,b) => {
        const pMap = { critical: 1, need: 2, want: 3 };
        if (pMap[a.priority] !== pMap[b.priority]) return pMap[a.priority] - pMap[b.priority];
        return a.target_year - b.target_year;
      });
      setGoals(sorted);
    }).catch(console.error);
  };

  useEffect(() => { loadGoals(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      name: fd.get('name'),
      priority: fd.get('priority'),
      present_value: Number(fd.get('present_value')),
      target_year: Number(fd.get('target_year')),
      inflation_rate: Number(fd.get('inflation_rate')),
      goal_type: fd.get('goal_type'),
      recurring_frequency_years: fd.get('goal_type') === 'recurring' ? Number(fd.get('recurring_frequency_years')) : null
    };
    try {
      if (modal.data) await api.updateGoal(modal.data.id, data);
      else await api.createGoal(data);
      showToast('✅ Goal saved!');
      setModal({ open: false, data: null });
      loadGoals();
    } catch (err) {
      showToast('❌ Error saving goal');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this goal?')) {
      try {
        await api.deleteGoal(id);
        showToast('🗑️ Goal deleted');
        loadGoals();
      } catch (err) {
        showToast('❌ Error deleting goal');
      }
    }
  };

  return (
    <div className="clay-card card-sky">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '18px'}}>
        <h2 className="section-title" style={{margin:0}}><span className="title-icon">🎯</span> Goals</h2>
        <button className="btn-primary" onClick={() => { setGoalType('lump_sum'); setModal({open: true, data: null}); }}>➕ Add Goal</button>
      </div>

      <div>
        {goals.map(goal => (
          <div key={goal.id} className="item-row">
            <div>
              <div className="item-name">
                {goal.name} 
                <span className={`badge ${goal.priority==='critical'?'badge-critical':goal.priority==='need'?'badge-at-risk':'badge-funded'}`} style={{marginLeft:'6px'}}>
                  {goal.priority}
                </span>
              </div>
              <div className="item-sub">
                PV: {fmt(goal.present_value)} • Year: {goal.target_year} ({goal.target_year - currentYear} yrs)
                {goal.goal_type === 'recurring' && ` • Recurring every ${goal.recurring_frequency_years} yrs`}
              </div>
            </div>
            <div className="item-actions">
              <button className="btn-icon" onClick={() => { setGoalType(goal.goal_type); setModal({open: true, data: goal}); }}>✏️</button>
              <button className="btn-icon" onClick={() => handleDelete(goal.id)}>🗑️</button>
            </div>
          </div>
        ))}
        {goals.length === 0 && <div className="empty-state">No goals found. Plan your future!</div>}
      </div>

      {modal.open && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3 className="modal-title">{modal.data ? '✏️ Edit Goal' : '➕ Add Goal'}</h3>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" name="name" defaultValue={modal.data?.name || ''} required />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-input" name="priority" defaultValue={modal.data?.priority || 'need'}>
                    <option value="critical">Critical</option>
                    <option value="need">Need</option>
                    <option value="want">Want</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Goal Type</label>
                  <select className="form-input" name="goal_type" value={goalType} onChange={(e) => setGoalType(e.target.value)}>
                    <option value="lump_sum">Lump Sum</option>
                    <option value="recurring">Recurring</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Present Value</label>
                <input className="form-input" type="number" name="present_value" defaultValue={modal.data?.present_value || ''} required />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Target Year</label>
                  <input className="form-input" type="number" name="target_year" defaultValue={modal.data?.target_year || currentYear+5} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Inflation Rate (%)</label>
                  <input className="form-input" type="number" step="0.1" name="inflation_rate" defaultValue={modal.data?.inflation_rate || 6} required />
                </div>
              </div>
              {goalType === 'recurring' && (
                <div className="form-group">
                  <label className="form-label">Recurring Frequency (Years)</label>
                  <input className="form-input" type="number" name="recurring_frequency_years" defaultValue={modal.data?.recurring_frequency_years || 1} required={goalType === 'recurring'} />
                </div>
              )}
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setModal({open: false, data: null})}>Cancel</button>
                <button type="submit" className="btn-primary">Save Goal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
