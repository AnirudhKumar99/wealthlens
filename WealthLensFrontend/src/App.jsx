import React, { useState } from 'react';
import { api } from './api/client';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Assets from './pages/Assets';
import Goals from './pages/Goals';
import SIPs from './pages/SIPs';
import Insurance from './pages/Insurance';
import Loans from './pages/Loans';

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

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const runSimulation = async () => {
    setLoading(true);
    try {
      const res = await api.simulate();
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
    switch (activeTab) {
      case 'dashboard': return <Dashboard simulation={simulation} />;
      case 'profile': return <Profile showToast={showToast} />;
      case 'assets': return <Assets showToast={showToast} />;
      case 'goals': return <Goals showToast={showToast} />;
      case 'sips': return <SIPs showToast={showToast} />;
      case 'insurance': return <Insurance showToast={showToast} />;
      case 'loans': return <Loans showToast={showToast} />;
      default: return null;
    }
  };

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
            {simulation && (
              <span className={`badge ${simulation.health_score >= 70 ? 'badge-funded' : simulation.health_score >= 40 ? 'badge-at-risk' : 'badge-critical'}`} style={{marginLeft: 10}}>
                Score: {simulation.health_score}
              </span>
            )}
          </div>
          <button className="btn-simulate" onClick={runSimulation} disabled={loading}>
            {loading ? 'Running...' : 'Run Simulation 🚀'}
          </button>
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
