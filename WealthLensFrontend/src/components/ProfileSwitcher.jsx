import React, { useState } from 'react';
import { api } from '../api/client';

export default function ProfileSwitcher({ profiles, activeProfileId, onChange, onRefresh, triggerCreate, onResetTrigger }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  
  React.useEffect(() => {
    if (triggerCreate) {
      setIsOpen(true);
      setIsCreating(true);
      if (onResetTrigger) onResetTrigger();
    }
  }, [triggerCreate, onResetTrigger]);

  const isFamily = activeProfileId === 'family';
  const activeProfile = profiles.find(p => p.id === activeProfileId);
  const activeLabel = isFamily ? '🏠 Family Overview' : (activeProfile ? `👤 ${activeProfile.family_name}` : 'Select Profile');
  
  const handleSwitch = async (id) => {
    if (id !== 'family') {
      await api.setActiveProfile(id);
    }
    setIsOpen(false);
    onChange(id);
  };
  
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await api.createProfile({
      family_name: newName,
      role: 'Family Member',
      current_age: 34,
      retirement_age: 60,
      life_expectancy: 82,
      annual_income: 0,
      savings_rate: 30.0,
      monthly_expenses_retirement: 40000,
      retirement_inflation_rate: 6.0,
      currency: 'INR'
    });
    setNewName('');
    setIsCreating(false);
    setIsOpen(false);
    await onRefresh();
    onChange(res.id);
  };
  
  return (
    <div style={{ position: 'relative' }}>
      <button 
        className="btn-secondary" 
        style={{ padding: '6px 14px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {activeLabel} ▾
      </button>
      
      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '8px',
          background: 'white', borderRadius: '16px', border: '2px solid #E0D7FF',
          boxShadow: '4px 4px 0px rgba(0,0,0,0.06)', minWidth: '220px', zIndex: 1000,
          overflow: 'hidden'
        }}>
          {profiles.length > 1 && (
            <button
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px',
                background: activeProfileId === 'family' ? '#EDE9FE' : 'transparent',
                border: 'none', borderBottom: '2px solid #E0D7FF',
                cursor: 'pointer', fontFamily: 'Nunito', fontWeight: '800', color: '#7C3AED'
              }}
              onClick={() => handleSwitch('family')}
            >
              {activeProfileId === 'family' ? '✓ ' : ''}🏠 Family Overview (All)
            </button>
          )}

          {profiles.map(p => (
            <button
              key={p.id}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px',
                background: p.id === activeProfileId ? '#F0EBFF' : 'transparent',
                border: 'none', borderBottom: '1px solid #F0EAFF',
                cursor: 'pointer', fontFamily: 'Nunito', fontWeight: '700', color: '#2D1B69'
              }}
              onClick={() => handleSwitch(p.id)}
            >
              {p.id === activeProfileId ? '✓ ' : ''}{p.family_name} <span style={{fontSize: '11px', color: '#9B8EC4', fontWeight: '600'}}>({p.role || 'Member'})</span>
            </button>
          ))}
          
          <div style={{ padding: '10px' }}>
            {isCreating ? (
              <form onSubmit={handleCreate} style={{ display: 'flex', gap: '6px' }}>
                <input 
                  type="text" 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)}
                  className="form-input" 
                  style={{ padding: '6px 10px', fontSize: '13px' }}
                  placeholder="Profile Name"
                  autoFocus
                />
                <button type="submit" className="btn-primary" style={{ padding: '6px 10px' }}>✓</button>
              </form>
            ) : (
              <button 
                className="btn-secondary" 
                style={{ width: '100%', fontSize: '12px', borderStyle: 'dashed' }}
                onClick={() => setIsCreating(true)}
              >
                ＋ New Profile
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
