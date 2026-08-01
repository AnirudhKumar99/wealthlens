import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import FamilyDashboard from './components/FamilyDashboard';

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
  const [familyData, setFamilyData] = useState(null);
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
              if (prev === 'family' || (prev && userProfs.some(p => p.id === prev))) return prev;
              return userProfs.length > 1 ? 'family' : userProfs[0].id;
            });
          } else {
            setActiveProfileId(null);
          }

          try {
            const famSummary = await api.getFamilySummary();
            setFamilyData(famSummary);
          } catch (e) {
            console.error(e);
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
    setFamilyData(null);
    showToast('👋 Logged out successfully');
  };

  const runSimulation = useCallback(async (quiet = false, customToastMsg = '') => {
    if (!activeProfileId) return;
    if (activeProfileId === 'family') {
      try {
        const famSummary = await api.getFamilySummary();
        setFamilyData(famSummary);
        if (customToastMsg) showToast(`${customToastMsg} & Family Hub updated! 🏠`);
      } catch (e) {
        console.error(e);
      }
      return;
    }
    if (!quiet) setLoading(true);
    try {
      const res = await api.simulate(activeProfileId);
      setSimulation(res);
      const famSummary = await api.getFamilySummary();
      setFamilyData(famSummary);
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

  const triggerSimulationUpdate = async (toastMsg = '') => {
    await runSimulation(true, toastMsg);
    await loadProfiles();
  };

  const handleProfileChange = (newProfileId) => {
    setActiveProfileId(newProfileId);
  };

  const handleExportExcel = async () => {
    if (!activeProfileId) return;
    try {
      showToast('⏳ Generating Excel report...');
      if (activeProfileId === 'family') {
        await api.exportFamilyExcel();
      } else {
        await api.exportExcel(activeProfileId);
      }
      showToast('✅ Report downloaded!');
    } catch (e) {
      console.error(e);
      showToast('❌ Export failed');
    }
  };

  // --- Import Excel ---
  const importFileRef = useRef(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importDragOver, setImportDragOver] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleImportFile = async (file) => {
    if (!file) return;
    if (!file.name.endsWith('.xlsx')) {
      showToast('❌ Only .xlsx files are supported');
      return;
    }
    setImporting(true);
    try {
      showToast('⏳ Importing data from Excel...');
      let result;
      if (activeProfileId === 'family' || !activeProfileId) {
        result = await api.importFamilyExcel(file);
      } else {
        result = await api.importExcel(activeProfileId, file);
      }
      showToast(`✅ ${result.message}`);
      setShowImportModal(false);
      // Refresh everything
      await loadProfiles();
      if (activeProfileId && activeProfileId !== 'family') {
        await runSimulation(false);
      }
    } catch (e) {
      console.error(e);
      showToast('❌ Import failed: ' + (e.message || 'Unknown error'));
    } finally {
      setImporting(false);
      if (importFileRef.current) importFileRef.current.value = '';
    }
  };

  const handleCreateDemoProfile = async () => {
    setLoading(true);
    try {
      await api.createProfile({
        family_name: 'Sample Profile',
        role: 'Self',
        current_age: 34,
        retirement_age: 60,
        life_expectancy: 82,
        annual_income: 2160000,
        savings_rate: 35.0,
        monthly_expenses_retirement: 40000,
        retirement_inflation_rate: 7.0,
        currency: 'INR'
      });
      showToast('🎉 Profile created!');
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
    
    const isFamilyMode = activeProfileId === 'family';
    const effectiveProfileId = isFamilyMode ? (profiles[0]?.id || null) : activeProfileId;
    
    let component = null;
    switch (activeTab) {
      case 'dashboard': 
        component = isFamilyMode 
          ? <FamilyDashboard familyData={familyData} onSelectProfile={setActiveProfileId} onOpenImport={() => setShowImportModal(true)} />
          : <Dashboard simulation={simulation} onOpenImport={() => setShowImportModal(true)} />; 
        break;
      case 'profile': 
        component = <Profile profileId={effectiveProfileId} showToast={(msg) => triggerSimulationUpdate(msg)} onProfileDeleted={loadProfiles} />; 
        break;
      case 'assets': 
        component = <Assets profileId={effectiveProfileId} isFamilyMode={isFamilyMode} familyData={familyData} showToast={(msg) => triggerSimulationUpdate(msg)} categories={categories} />; 
        break;
      case 'goals': 
        component = <Goals profileId={effectiveProfileId} isFamilyMode={isFamilyMode} familyData={familyData} showToast={(msg) => triggerSimulationUpdate(msg)} categories={categories} />; 
        break;
      case 'sips': 
        component = <SIPs profileId={effectiveProfileId} isFamilyMode={isFamilyMode} familyData={familyData} showToast={(msg) => triggerSimulationUpdate(msg)} categories={categories} />; 
        break;
      case 'insurance': 
        component = <Insurance profileId={effectiveProfileId} isFamilyMode={isFamilyMode} familyData={familyData} showToast={(msg) => triggerSimulationUpdate(msg)} categories={categories} />; 
        break;
      case 'loans': 
        component = <Loans profileId={effectiveProfileId} isFamilyMode={isFamilyMode} familyData={familyData} showToast={(msg) => triggerSimulationUpdate(msg)} categories={categories} />; 
        break;
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
                📤 Export (.xlsx)
              </button>
            )}
            <button 
              className="btn-secondary" 
              onClick={() => setShowImportModal(true)}
              title="Import data from an Excel report"
              style={{ borderRadius: '50px', padding: '7px 14px', fontSize: '12px', border: '1.5px solid #93C5FD', flexShrink: 0, color: '#2563EB', background: '#EFF6FF' }}
            >
              📥 Import (.xlsx)
            </button>
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

      {/* Import Excel Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => !importing && setShowImportModal(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#1e1e2e', borderRadius: '16px', padding: '32px', maxWidth: '480px', width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <h2 style={{ margin: '0 0 8px', fontSize: '20px', color: '#e0e0e0' }}>
              📥 Import Excel Report
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#888' }}>
              {activeProfileId === 'family' || !activeProfileId
                ? 'Upload a Family Household Master Report to create/update all profiles and their data.'
                : 'Upload an Excel report to add data into the current profile.'}
            </p>

            <div
              onDragOver={e => { e.preventDefault(); setImportDragOver(true); }}
              onDragLeave={() => setImportDragOver(false)}
              onDrop={e => { e.preventDefault(); setImportDragOver(false); handleImportFile(e.dataTransfer.files[0]); }}
              onClick={() => !importing && importFileRef.current?.click()}
              style={{
                border: `2px dashed ${importDragOver ? '#6366f1' : 'rgba(255,255,255,0.15)'}`,
                borderRadius: '12px', padding: '48px 24px', textAlign: 'center',
                cursor: importing ? 'wait' : 'pointer', transition: 'all 0.2s',
                background: importDragOver ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)'
              }}
            >
              {importing ? (
                <>
                  <div style={{ fontSize: '36px', marginBottom: '12px' }}>⏳</div>
                  <p style={{ color: '#a78bfa', fontSize: '14px', margin: 0 }}>Importing data...</p>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '36px', marginBottom: '12px' }}>📁</div>
                  <p style={{ color: '#aaa', fontSize: '14px', margin: '0 0 4px' }}>Drag & drop your <strong>.xlsx</strong> file here</p>
                  <p style={{ color: '#666', fontSize: '12px', margin: 0 }}>or click to browse</p>
                </>
              )}
            </div>

            <input
              ref={importFileRef}
              type="file"
              accept=".xlsx"
              style={{ display: 'none' }}
              onChange={e => handleImportFile(e.target.files[0])}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
              <button
                onClick={() => setShowImportModal(false)}
                disabled={importing}
                style={{
                  padding: '8px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent', color: '#888', cursor: 'pointer', fontSize: '13px'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
