import React, { useState } from 'react';
import { api } from '../api/client';

export default function Login({ onAuthSuccess, showToast }) {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        const res = await api.register(formData);
        showToast('🎉 Account created successfully!');
        onAuthSuccess(res);
      } else {
        const res = await api.login({ email: formData.email, password: formData.password });
        showToast('🔓 Welcome back!');
        onAuthSuccess(res);
      }
    } catch (err) {
      showToast(`❌ ${err.message || 'Authentication failed'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Left side: Brand Showcase & Features */}
      <div className="auth-left animate-slide-in-left">
        <div style={{ maxWidth: '540px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <span style={{ fontSize: '38px' }}>🔮</span>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: 900, color: '#A78BFA', letterSpacing: '-0.5px' }}>WealthLens 2.0</h1>
              <p style={{ color: '#DDD6FE', fontSize: '14px', fontWeight: 600 }}>Master Financial Simulation Engine</p>
            </div>
          </div>

          <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '20px', lineHeight: 1.3 }}>
            Visualize your financial future with <span style={{ color: '#F472B6' }}>precision</span> & <span style={{ color: '#34D399' }}>confidence</span>.
          </h2>

          <p style={{ color: '#C4B5FD', fontSize: '15px', lineHeight: 1.6, marginBottom: '32px' }}>
            WealthLens projects your portfolio across a 50-year horizon, factoring in inflation, recurring goal outflows, multi-asset returns, and debt servicing.
          </p>

          {/* Feature Showcase Pills */}
          <div className="feature-pill animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <span style={{ fontSize: '24px' }}>📈</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: '#F3E8FF' }}>Dynamic Cashflow Forecasting</div>
              <div style={{ fontSize: '12px', color: '#C4B5FD' }}>Simulate real compounding returns vs discrete goal withdrawals over time.</div>
            </div>
          </div>

          <div className="feature-pill animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <span style={{ fontSize: '24px' }}>🎓</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: '#F3E8FF' }}>Recurring SWP & Step-Up Goals</div>
              <div style={{ fontSize: '12px', color: '#C4B5FD' }}>Model multi-year education fees & expenses with annual step-ups.</div>
            </div>
          </div>

          <div className="feature-pill animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <span style={{ fontSize: '24px' }}>🔐</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: '#F3E8FF' }}>Salt & SHA-256 Security</div>
              <div style={{ fontSize: '12px', color: '#C4B5FD' }}>Your account is secured with cryptographic salting and hashing.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Interactive Form */}
      <div className="auth-right animate-slide-in-right">
        <div className="auth-card">
          {/* Toggle Tabs */}
          <div style={{ display: 'flex', background: '#F3E8FF', padding: '4px', borderRadius: '50px', marginBottom: '28px' }}>
            <button
              type="button"
              onClick={() => setIsRegister(false)}
              style={{
                flex: 1, padding: '10px', borderRadius: '50px', border: 'none',
                fontWeight: 800, fontSize: '14px', cursor: 'pointer',
                background: !isRegister ? '#7C3AED' : 'transparent',
                color: !isRegister ? 'white' : '#6B5B95',
                transition: 'all 0.2s ease'
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsRegister(true)}
              style={{
                flex: 1, padding: '10px', borderRadius: '50px', border: 'none',
                fontWeight: 800, fontSize: '14px', cursor: 'pointer',
                background: isRegister ? '#7C3AED' : 'transparent',
                color: isRegister ? 'white' : '#6B5B95',
                transition: 'all 0.2s ease'
              }}
            >
              Register
            </button>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '22px', fontWeight: 900, color: '#2D1B69' }}>
              {isRegister ? 'Create Your Account 🚀' : 'Welcome Back! 👋'}
            </h3>
            <p style={{ fontSize: '13px', color: '#6B5B95', marginTop: '4px' }}>
              {isRegister ? 'Start tracking & planning your family wealth today.' : 'Sign in to access your investment profiles.'}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <div className="form-group animate-fade-in-up" style={{ marginBottom: '16px' }}>
                <label className="form-label">Username</label>
                <input
                  type="text"
                  name="username"
                  className="form-input"
                  placeholder="e.g. Anirudh"
                  value={formData.username}
                  onChange={handleChange}
                  required={isRegister}
                />
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Email Address</label>
              <input
                type="email"
                name="email"
                className="form-input"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                className="form-input"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-simulate"
              style={{ width: '100%', padding: '14px', fontSize: '16px', borderRadius: '50px' }}
              disabled={loading}
            >
              {loading ? 'Processing...' : isRegister ? 'Create Free Account 🚀' : 'Sign In To WealthLens 🔓'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
