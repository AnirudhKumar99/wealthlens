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
  const [triggerCreateProfile, setTriggerCreateProfile] = useState(false);
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
            setActiveProfileId(prev => {
              if (prev && userProfs.some(p => p.id === prev)) return prev;
              return userProfs[userProfs.length - 1].id;
            });
          } else {
            setActiveProfileId(null);
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
    setSimulation(null);
    if (authRes.active_profile_id) {
      setActiveProfileId(authRes.active_profile_id);
    } else {
      setActiveProfileId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('wealthlens_token');
    setToken('');
    setUser(null);
    setProfiles([]);
    setActiveProfileId(null);
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
    } else {
      setSimulation(null);
    }
  }, [activeProfileId, runSimulation]);

  const handleProfileChange = (newId) => {
    setSimulation(null);
    setActiveProfileId(newId);
    setActiveTab('dashboard');
  };

  const handleExportExcel = async () => {
    if (!activeProfileId) {
      showToast('❌ Please select or create a profile first');
      return;
    }
    try {
      showToast('📥 Generating Excel report...');
      await api.exportExcel(activeProfileId);
      showToast('✅ Report downloaded successfully!');
    } catch (err) {
      console.error(err);
      showToast('❌ Failed to export Excel report');
    }
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
        monthly_expenses_retirement: 40000,
        retirement_inflation_rate: 7.0,
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
            onClick={() => setTriggerCreateProfile(true)}
            style={{ padding: '14px 32px', fontSize: '15px', borderRadius: '50px' }}
          >
            ＋ Create Profile & Start Simulation
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
          <div className="header-left">
            <div className="logo">
              <span className="logo-icon">🔮</span>
              <div>
                <div className="logo-text">WealthLens</div>
                <div className="logo-subtitle">{user ? `Welcome, ${user.username}` : 'Family Wealth Planner'}</div>
              </div>
            </div>
            {simulation && simulation.summary && (
              <span
                className={`badge ${
                  simulation.summary.health_score >= 70 ? 'badge-funded'
                  : simulation.summary.health_score >= 40 ? 'badge-at-risk'
                  : 'badge-critical'
                }`}
                style={{fontSize: '12px', padding: '4px 10px', flexShrink: 0}}
              >
                ❤️ Score: {simulation.summary.health_score}/100
              </span>
            )}
          </div>
          
          <div className="header-right">
            <ProfileSwitcher 
              profiles={profiles} 
              activeProfileId={activeProfileId} 
              onChange={handleProfileChange}
              onRefresh={loadProfiles}
              triggerCreate={triggerCreateProfile}
              onResetTrigger={() => setTriggerCreateProfile(false)}
            />
            {activeProfileId && (
              <button 
                className="btn-secondary" 
                onClick={handleExportExcel}
                title="Download 6-sheet Excel Financial Report"
                style={{ borderRadius: '50px', padding: '7px 14px', fontSize: '12px', border: '1.5px solid #A7F3D0', flexShrink: 0, color: '#059669', background: '#ECFDF5' }}
              >
                📥 Export (.xlsx)
              </button>
            )}
            <button 
              className="btn-secondary" 
              onClick={handleLogout}
              style={{ borderRadius: '50px', padding: '7px 14px', fontSize: '12px', border: '1.5px solid #E0D7FF', flexShrink: 0 }}
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
