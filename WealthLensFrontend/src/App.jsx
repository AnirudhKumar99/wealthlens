import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api/client';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Assets from './pages/Assets';
import Goals from './pages/Goals';
import SIPs from './pages/SIPs';
import Insurance from './pages/Insurance';
import Loans from './pages/Loans';
import ProfileSwitcher from './components/ProfileSwitcher';

const TABS = [
  {id:'dashboard',label:'Dashboard',icon:'🏠'},
  {id:'profile',label:'Profile',icon:'👤'},
  {id:'assets',label:'Assets',icon:'💼'},
  {id:'goals',label:'Goals',icon:'🎯'},
  {id:'sips',label:'SIPs',icon:'📈'},
  {id:'insurance',label:'Insurance',icon:'🛡️'},
  {id:'loans',label:'Loans',icon:'🏦'}
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  
  // Profile State
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [categories, setCategories] = useState([]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const loadProfiles = useCallback(async () => {
    try {
      const allCats = await api.getCategories();
      setCategories(allCats);
      
      const all = await api.getProfiles();
      setProfiles(all);
      
      const activeRes = await api.getActiveProfile();
      let pid = activeRes.active_profile_id;
      
      if (!pid && all.length > 0) {
        pid = all[0].id;
        await api.setActiveProfile(pid);
      }
      
      setActiveProfileId(pid);
    } catch (err) {
      console.error(err);
      showToast('❌ Failed to load profiles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const handleProfileChange = (newId) => {
    setActiveProfileId(newId);
    setSimulation(null); // Clear simulation for previous profile
    setActiveTab('dashboard');
  };

  const runSimulation = async () => {
    if (!activeProfileId) return;
    setLoading(true);
    try {
      const res = await api.simulate(activeProfileId);
      setSimulation(res);
      setActiveTab('dashboard');
      showToast('⚡ Simulation complete!');
    } catch (err) {
      showToast('❌ Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (!activeProfileId) {
      return (
        <div className="clay-card card-lavender empty-state">
          <div className="empty-icon">👤</div>
          <p>Please create or select a profile to continue.</p>
        </div>
      );
    }
    
    switch (activeTab) {
      case 'dashboard': return <Dashboard simulation={simulation} />;
      case 'profile': return <Profile profileId={activeProfileId} showToast={showToast} onProfileDeleted={loadProfiles} />;
      case 'assets': return <Assets profileId={activeProfileId} showToast={showToast} categories={categories} />;
      case 'goals': return <Goals profileId={activeProfileId} showToast={showToast} categories={categories} />;
      case 'sips': return <SIPs profileId={activeProfileId} showToast={showToast} categories={categories} />;
      case 'insurance': return <Insurance profileId={activeProfileId} showToast={showToast} categories={categories} />;
      case 'loans': return <Loans profileId={activeProfileId} showToast={showToast} categories={categories} />;
      default: return null;
    }
  };

  if (loading && !profiles.length) {
    return <div style={{padding: 40, textAlign: 'center'}}>Loading...</div>;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">💰</span>
            <div>
              <div className="logo-text">WealthLens</div>
              <div className="logo-subtitle">Family Wealth Planner</div>
            </div>
            {simulation && simulation.summary && (
              <span
                className={`badge ${
                  simulation.summary.health_score >= 70 ? 'badge-funded'
                  : simulation.summary.health_score >= 40 ? 'badge-at-risk'
                  : 'badge-critical'
                }`}
                style={{marginLeft: 10, fontSize: '12px', padding: '4px 12px'}}
              >
                ❤️ Score: {simulation.summary.health_score}/100
              </span>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <ProfileSwitcher 
              profiles={profiles} 
              activeProfileId={activeProfileId} 
              onChange={handleProfileChange}
              onRefresh={loadProfiles}
            />
            <button className="btn-simulate" onClick={runSimulation} disabled={loading || !activeProfileId}>
              {loading ? 'Wait...' : 'Run Simulation 🚀'}
            </button>
          </div>
        </div>
      </header>
      
      <main className="content-shell">
        <nav className="tab-bar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
        
        {renderContent()}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
