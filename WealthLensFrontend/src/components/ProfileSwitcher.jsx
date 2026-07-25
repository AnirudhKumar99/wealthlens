import React, { useState } from 'react';
import { api } from '../api/client';

export default function ProfileSwitcher({ profiles, activeProfileId, onChange, onRefresh }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  
  const activeProfile = profiles.find(p => p.id === activeProfileId);
  
  const handleSwitch = async (id) => {
    await api.setActiveProfile(id);
    setIsOpen(false);
    onChange(id);
  };
  
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await api.createProfile({ family_name: newName });
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
        👤 {activeProfile ? activeProfile.family_name : 'Select Profile'} ▾
      </button>
      
      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '8px',
          background: 'white', borderRadius: '16px', border: '2px solid #E0D7FF',
          boxShadow: '4px 4px 0px rgba(0,0,0,0.06)', minWidth: '220px', zIndex: 1000,
          overflow: 'hidden'
        }}>
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
              {p.id === activeProfileId ? '✓ ' : ''}{p.family_name}
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
                  placeholder="Family Name"
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
