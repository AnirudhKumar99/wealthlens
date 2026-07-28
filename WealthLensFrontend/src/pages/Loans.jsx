import React, { useState, useEffect } from 'react';
import { api, fmt } from '../api/client';
import NumberInput from '../components/NumberInput';

export default function Loans({ profileId, showToast, categories = [] }) {
  const [loans, setLoans] = useState([]);
  const [modal, setModal] = useState({ open: false, data: null });
  const [filter, setFilter] = useState('all');

  const loadLoans = () => {
    if (profileId) api.getLoans(profileId).then(setLoans).catch(console.error);
  };

  useEffect(() => { loadLoans(); }, [profileId]);

  const filteredLoans = filter === 'all' ? loans : loans.filter(l => l.loan_type === filter);
  const totalPrincipal = filteredLoans.reduce((sum, l) => sum + l.principal, 0);
  
  const calculateEMI = (principal, roiPct, months) => {
    if (!principal || !months) return 0;
    if (roiPct === 0) return principal / months;
    const r = roiPct / 1200;
    return principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
  };

  const calculateOutstanding = (principal, roiPct, totalMonths, emisPaid) => {
    if (emisPaid >= totalMonths) return 0;
    const emi = calculateEMI(principal, roiPct, totalMonths);
    if (roiPct === 0) return principal - (emi * emisPaid);
    const r = roiPct / 1200;
    return principal * (Math.pow(1 + r, totalMonths) - Math.pow(1 + r, emisPaid)) / (Math.pow(1 + r, totalMonths) - 1);
  };

  const totalEMI = filteredLoans.reduce((sum, l) => sum + calculateEMI(l.principal, l.roi_pct, l.total_months), 0);
  const totalOutstanding = filteredLoans.reduce((sum, l) => sum + calculateOutstanding(l.principal, l.roi_pct, l.total_months, l.emis_paid), 0);

  const handleSave = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      name: fd.get('name'),
      loan_type: fd.get('loan_type'),
      principal: Number(fd.get('principal')),
      total_months: Number(fd.get('total_months')),
      roi_pct: Number(fd.get('roi_pct')),
      emis_paid: Number(fd.get('emis_paid'))
    };
    try {
      if (modal.data) await api.updateLoan(profileId, modal.data.id, data);
      else await api.createLoan(profileId, data);
      showToast('✅ Loan saved!');
      setModal({ open: false, data: null });
      loadLoans();
    } catch (err) {
      showToast('❌ Error saving loan');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this loan?')) {
      try {
        await api.deleteLoan(profileId, id);
        showToast('🗑️ Loan deleted');
        loadLoans();
      } catch (err) {
        showToast('❌ Error deleting loan');
      }
    }
  };

  return (
    <div className="clay-card card-green">
      <div style={{display:'flex', flexWrap: 'wrap', justifyContent:'space-between', alignItems:'center', gap: '10px', marginBottom: '18px'}}>
        <h2 className="section-title" style={{margin:0}}>
          <span className="title-icon">🏦</span> Loans
          <span className="info-icon" data-tooltip="Track your active debt. EMI payments will automatically pull from your projected cash flow.">i</span>
        </h2>
        <div style={{display: 'flex', gap: '10px', flexWrap: 'nowrap', alignItems: 'center'}}>
          <select className="form-input" style={{padding: '0 16px', borderRadius: '50px', minWidth: '130px', height: '38px'}} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All Types</option>
            {categories.filter(c => c.category_type === 'loan_type').map(c => (
              <option key={c.code} value={c.code}>{c.display_name}</option>
            ))}
          </select>
          <button className="btn-primary" style={{height: '38px', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap'}} onClick={() => setModal({open: true, data: null})}>➕ Add Loan</button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">📉 Total Debt</div>
          <div className="kpi-value">{fmt(totalOutstanding)}</div>
          <div className="kpi-sub">Current Outstanding</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">📊 Original Loan</div>
          <div className="kpi-value">{fmt(totalPrincipal)}</div>
          <div className="kpi-sub">Total Sanctioned</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">💸 Monthly EMI</div>
          <div className="kpi-value">{fmt(totalEMI)}</div>
          <div className="kpi-sub">Total Outflow</div>
        </div>
      </div>

      <div>
        {filteredLoans.map(loan => {
          const emi = calculateEMI(loan.principal, loan.roi_pct, loan.total_months);
          const progress = Math.min(100, Math.max(0, (loan.emis_paid / loan.total_months) * 100));
          const remainingMonths = loan.total_months - loan.emis_paid;
          const currentYear = new Date().getFullYear();
          const completionYear = currentYear + Math.ceil(remainingMonths / 12);
          
          return (
            <div key={loan.id} className="item-row" style={{flexDirection: 'column', alignItems: 'stretch'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                <div style={{flex: 1}}>
                  <div className="item-name">{loan.name}</div>
                  <div className="item-sub">
                    {loan.roi_pct}% ROI • {loan.emis_paid} / {loan.total_months} EMIs Paid • {fmt(emi)}/mo • Ends: {completionYear}
                  </div>
                </div>
                <div style={{ paddingRight: '24px', textAlign: 'right', display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ width: '130px', textAlign: 'right' }}>
                    <span className="badge badge-debt">
                      {categories.find(c => c.category_type === 'loan_type' && c.code === loan.loan_type)?.display_name || loan.loan_type}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#DC2626' }}>
                      {fmt(loan.principal)}
                    </div>
                    <div className="item-sub" style={{textTransform: 'uppercase', letterSpacing: '0.5px'}}>Principal</div>
                  </div>
                </div>
                <div className="item-actions">
                  <button className="btn-icon" onClick={() => setModal({open: true, data: loan})}>✏️</button>
                  <button className="btn-icon" onClick={() => handleDelete(loan.id)}>🗑️</button>
                </div>
              </div>
              <div className="progress-bar-wrap">
                <div className="progress-bar-fill" style={{width: `${progress}%`, background: '#10B981'}}></div>
              </div>
              <div style={{fontSize: '10px', textAlign: 'right', marginTop: '4px', color: '#6B5B95', fontWeight: 'bold'}}>{progress.toFixed(1)}% Paid</div>
            </div>
          );
        })}
        {loans.length === 0 && <div className="empty-state">No loans found. Keep it up!</div>}
      </div>

      {modal.open && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3 className="modal-title">{modal.data ? '✏️ Edit Loan' : '➕ Add Loan'}</h3>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" name="name" defaultValue={modal.data?.name || ''} required />
              </div>
              <div className="form-group">
                <label className="form-label">Loan Type</label>
                <select className="form-input" name="loan_type" defaultValue={modal.data?.loan_type || 'home'}>
                  {categories.filter(c => c.category_type === 'loan_type').map(c => (
                    <option key={c.code} value={c.code}>{c.display_name}</option>
                  ))}
                </select>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Principal Amount</label>
                  <NumberInput name="principal" defaultValue={modal.data?.principal || ''} required />
                </div>
                <div className="form-group">
                  <label className="form-label">ROI (%)</label>
                  <input className="form-input" type="number" step="0.01" name="roi_pct" defaultValue={modal.data?.roi_pct || 9} required />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Total Months</label>
                  <input className="form-input" type="number" name="total_months" defaultValue={modal.data?.total_months || 60} required />
                </div>
                <div className="form-group">
                  <label className="form-label">EMIs Paid</label>
                  <input className="form-input" type="number" name="emis_paid" defaultValue={modal.data?.emis_paid || 0} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setModal({open: false, data: null})}>Cancel</button>
                <button type="submit" className="btn-primary">Save Loan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
