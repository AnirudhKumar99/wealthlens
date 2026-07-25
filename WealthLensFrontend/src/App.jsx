import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api/client';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Assets from './pages/Assets';
import Goals from './pages/Goals';
import SIPs from './pages/SIPs';
import Insurance from './pages/Insurance';
import Loans from './pages/Loans';
import Login from './pages/Login';
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
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  
  // Auth State
  const [token, setToken] = useState(localStorage.getItem('wealthlens_token') || '');
  const [user, setUser] = useState(null);

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

      if (token) {
        try {
          const authMe = await api.getMe(token);
          setUser(authMe.user);
          const userProfs = authMe.profiles || [];
          setProfiles(userProfs);
          
          if (userProfs.length > 0) {
            setActiveProfileId(userProfs[0].id);
          } else {
            const activeRes = await api.getActiveProfile();
            setActiveProfileId(activeRes.active_profile_id);
          }
        } catch {
          // Token expired or invalid
          localStorage.removeItem('wealthlens_token');
          setToken('');
          setUser(null);
        }
      } else {
        const all = await api.getProfiles();
        setProfiles(all);
        const activeRes = await api.getActiveProfile();
        let pid = activeRes.active_profile_id;
        if (!pid && all.length > 0) {
          pid = all[0].id;
          await api.setActiveProfile(pid);
        }
        setActiveProfileId(pid);
      }
    } catch (err) {
      console.error(err);
      showToast('❌ Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const handleAuthSuccess = (authRes) => {
    localStorage.setItem('wealthlens_token', authRes.access_token);
    setToken(authRes.access_token);
    setUser(authRes.user);
    if (authRes.active_profile_id) {
      setActiveProfileId(authRes.active_profile_id);
    }
    loadProfiles();
  };

  const handleLogout = () => {
    localStorage.removeItem('wealthlens_token');
    setToken('');
    setUser(null);
    setSimulation(null);
    showToast('👋 Logged out successfully');
  };

  const runSimulation = useCallback(async (quiet = false, customToastMsg = '') => {
    if (!activeProfileId) return;
    if (!quiet) setLoading(true);
    try {
      const res = await api.simulate(activeProfileId);
      setSimulation(res);
      if (customToastMsg) {
        showToast(`${customToastMsg} & Dashboard updated! 📊`);
      } else if (!quiet) {
        showToast('⚡ Simulation complete!');
      }
    } catch (err) {
      if (!quiet) showToast('❌ Simulation failed');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [activeProfileId]);

  // Auto-run simulation whenever active profile changes or loads
  useEffect(() => {
    if (activeProfileId) {
      runSimulation(true);
    }
  }, [activeProfileId, runSimulation]);

  const handleProfileChange = (newId) => {
    setActiveProfileId(newId);
    setActiveTab('dashboard');
  };

  const triggerSimulationUpdate = (msg) => {
    runSimulation(true, msg);
  };

  const handleCreateDefaultProfile = async (name) => {
    setLoading(true);
    try {
      const res = await api.createProfile({
        user_id: user ? user.id : '',
        family_name: name || 'My Wealth Profile',
        current_age: 34,
        retirement_age: 60,
        life_expectancy: 82,
        annual_income: 2160000,
        savings_rate: 35.0,
        monthly_expenses_retirement: 36500,
        retirement_inflation_rate: 5.2,
        currency: 'INR'
      });
      showToast('🎉 Profile created & auto-populated!');
      await loadProfiles();
    } catch {
      showToast('❌ Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (!activeProfileId) {
      return (
        <div className="clay-card card-lavender empty-state animate-fade-in-up" style={{ padding: '54px 36px', textAlign: 'center' }}>
          <div className="empty-icon" style={{ fontSize: '56px', marginBottom: '16px' }}>🔮</div>
          <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#2D1B69', marginBottom: '12px' }}>Welcome to WealthLens!</h2>
          <p style={{ fontSize: '15px', color: '#6B5B95', maxWidth: '540px', margin: '0 auto 28px', lineHeight: 1.6 }}>
            No profile selected. Create a new investment profile or select an existing one from the top bar to unlock live wealth projections, cashflow simulations, and goal planning.
          </p>
          <button 
            className="btn-simulate"
            onClick={() => handleCreateDefaultProfile(`${user ? user.username : 'My'}'s Investment Profile`)}
            style={{ padding: '14px 32px', fontSize: '15px', borderRadius: '50px' }}
          >
            ➕ Create Profile & Start Simulation
          </button>
        </div>
      );
    }
    
    let component = null;
    switch (activeTab) {
      case 'dashboard': component = <Dashboard simulation={simulation} />; break;
      case 'profile': component = <Profile profileId={activeProfileId} showToast={(msg) => triggerSimulationUpdate(msg)} onProfileDeleted={loadProfiles} />; break;
      case 'assets': component = <Assets profileId={activeProfileId} showToast={(msg) => triggerSimulationUpdate(msg)} categories={categories} />; break;
      case 'goals': component = <Goals profileId={activeProfileId} showToast={(msg) => triggerSimulationUpdate(msg)} categories={categories} />; break;
      case 'sips': component = <SIPs profileId={activeProfileId} showToast={(msg) => triggerSimulationUpdate(msg)} categories={categories} />; break;
      case 'insurance': component = <Insurance profileId={activeProfileId} showToast={(msg) => triggerSimulationUpdate(msg)} categories={categories} />; break;
      case 'loans': component = <Loans profileId={activeProfileId} showToast={(msg) => triggerSimulationUpdate(msg)} categories={categories} />; break;
      default: component = null;
    }

    return (
      <div key={`${activeTab}-${activeProfileId}`} className="animate-slide-in-right">
        {component}
      </div>
    );
  };

  if (loading && !profiles.length) {
    return <div style={{padding: 40, textAlign: 'center'}}>Loading...</div>;
  }

  if (!token && !user) {
    return <Login onAuthSuccess={handleAuthSuccess} showToast={showToast} />;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">🔮</span>
            <div>
              <div className="logo-text">WealthLens</div>
              <div className="logo-subtitle">{user ? `Welcome, ${user.username}` : 'Family Wealth Planner'}</div>
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
            <button 
              className="btn-secondary" 
              onClick={handleLogout}
              style={{ borderRadius: '50px', padding: '8px 16px', fontSize: '13px', border: '1.5px solid #E0D7FF' }}
            >
              Logout 🔒
            </button>
          </div>
        </div>
      </header>
      
      <main className="content-shell">
        <nav className="tab-bar">
          {TABS.map(tab => {
            const isDisabled = !activeProfileId && tab.id !== 'dashboard';
            return (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => {
                  if (!isDisabled) setActiveTab(tab.id);
                }}
                disabled={isDisabled}
                style={{
                  opacity: isDisabled ? 0.45 : 1,
                  cursor: isDisabled ? 'not-allowed' : 'pointer'
                }}
                title={isDisabled ? 'Please create or select a profile first' : ''}
              >
                <span className="tab-icon">{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </nav>
        
        {renderContent()}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
