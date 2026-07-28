import React, { useState, useEffect } from 'react';
import { api, fmt } from '../api/client';
import NumberInput from '../components/NumberInput';

export default function Goals({ profileId, showToast, categories = [] }) {
  const [goals, setGoals] = useState([]);
  const [modal, setModal] = useState({ open: false, data: null });
  const [goalType, setGoalType] = useState('lump_sum');
  const [filter, setFilter] = useState('all');
  const currentYear = new Date().getFullYear();

  const loadGoals = () => {
    if (!profileId) return;
    api.getGoals(profileId).then(data => {
      const sorted = data.sort((a,b) => {
        const pMap = { critical: 1, need: 2, want: 3 };
        if (pMap[a.priority] !== pMap[b.priority]) return pMap[a.priority] - pMap[b.priority];
        return a.target_year - b.target_year;
      });
      setGoals(sorted);
    }).catch(console.error);
  };

  useEffect(() => { loadGoals(); }, [profileId]);

  const calculateEstimatedFV = (goal) => {
    const yrs = Math.max(0, goal.target_year - currentYear);
    const pv = goal.present_value || 0;
    const r = (goal.inflation_rate || 6) / 100;
    const baseFv = pv * Math.pow(1 + r, yrs);
    
    if (goal.goal_type === 'recurring') {
      const duration = goal.duration_years || 1;
      const stepUp = (goal.step_up_pct || 0) / 100;
      let fv = 0;
      for (let i = 0; i < duration; i++) {
        fv += baseFv * Math.pow(1 + stepUp, i);
      }
      return fv;
    }
    return baseFv;
  };

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
      duration_years: fd.get('goal_type') === 'recurring' ? Number(fd.get('duration_years')) : 1,
      step_up_pct: fd.get('goal_type') === 'recurring' ? Number(fd.get('step_up_pct')) : 0
    };
    try {
      if (modal.data) await api.updateGoal(profileId, modal.data.id, data);
      else await api.createGoal(profileId, data);
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
        await api.deleteGoal(profileId, id);
        showToast('🗑️ Goal deleted');
        loadGoals();
      } catch (err) {
        showToast('❌ Error deleting goal');
      }
    }
  };

  return (
    <div className="clay-card card-sky">
      <div style={{display:'flex', flexWrap: 'wrap', justifyContent:'space-between', alignItems:'center', gap: '10px', marginBottom: '18px'}}>
        <h2 className="section-title" style={{margin:0}}>
          <span className="title-icon">🎯</span> Goals
          <span className="info-icon" data-tooltip="Map out your future expenses like buying a house, children's education, or vacations.">i</span>
        </h2>
        <div style={{display: 'flex', gap: '10px', flexWrap: 'nowrap', alignItems: 'center'}}>
          <select className="form-input" style={{padding: '0 16px', borderRadius: '50px', minWidth: '130px', height: '38px'}} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All Priorities</option>
            {categories.filter(c => c.category_type === 'goal_priority').map(c => (
              <option key={c.code} value={c.code}>{c.display_name}</option>
            ))}
          </select>
          <button className="btn-primary" style={{height: '38px', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap'}} onClick={() => { setGoalType('lump_sum'); setModal({open: true, data: null}); }}>➕ Add Goal</button>
        </div>
      </div>

      <div>
        {(filter === 'all' ? goals : goals.filter(g => g.priority === filter)).map(goal => (
          <div key={goal.id} className="item-row">
            <div style={{flex: 1}}>
              <div className="item-name">{goal.name}</div>
              <div className="item-sub">
                Target Year: {goal.target_year} ({goal.target_year - currentYear} yrs)
                {goal.goal_type === 'recurring' && ` • Recurring for ${goal.duration_years || 1} yrs @ ${goal.step_up_pct || 0}% step-up`}
              </div>
            </div>
            <div style={{ paddingRight: '24px', textAlign: 'right', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '130px', textAlign: 'right' }}>
                <span className={`badge ${goal.priority==='critical'?'badge-critical':goal.priority==='need'?'badge-at-risk':'badge-funded'}`}>
                  {categories.find(c => c.category_type === 'goal_priority' && c.code === goal.priority)?.display_name || goal.priority}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#2D1B69' }}>
                  {fmt(goal.present_value)}
                </div>
                <div className="item-sub" style={{textTransform: 'uppercase', letterSpacing: '0.5px'}}>Present Value</div>
                <div style={{ fontSize: '11px', color: '#9B8EC4', marginTop: '4px', fontWeight: 600 }}>
                  Est FV: {fmt(calculateEstimatedFV(goal))}
                </div>
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
                    {categories.filter(c => c.category_type === 'goal_priority').map(c => (
                      <option key={c.code} value={c.code}>{c.display_name}</option>
                    ))}
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
                <NumberInput name="present_value" defaultValue={modal.data?.present_value || ''} required />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Target Year</label>
                  <input className="form-input" type="number" name="target_year" defaultValue={modal.data?.target_year || currentYear+5} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Inflation Rate (%)</label>
                  <input className="form-input" type="number" step="0.01" name="inflation_rate" defaultValue={modal.data?.inflation_rate || 6} required />
                </div>
              </div>
              {goalType === 'recurring' && (
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Duration (Years)</label>
                    <input className="form-input" type="number" name="duration_years" defaultValue={modal.data?.duration_years || 4} required={goalType === 'recurring'} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Step-Up (%)</label>
                    <input className="form-input" type="number" step="0.01" name="step_up_pct" defaultValue={modal.data?.step_up_pct || 10} required={goalType === 'recurring'} />
                  </div>
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
