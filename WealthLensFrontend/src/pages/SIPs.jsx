import React, { useState, useEffect } from 'react';
import { api, fmt } from '../api/client';

export default function SIPs({ showToast }) {
  const [sips, setSips] = useState([]);
  const [modal, setModal] = useState({ open: false, data: null });

  const loadSips = () => {
    api.getSips().then(setSips).catch(console.error);
  };

  useEffect(() => { loadSips(); }, []);

  const totalMonthly = sips.reduce((sum, sip) => sum + sip.monthly_amount, 0);
  const totalAnnual = totalMonthly * 12;

  const handleSave = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      name: fd.get('name'),
      asset_class: fd.get('asset_class'),
      monthly_amount: Number(fd.get('monthly_amount')),
      step_up_pct: Number(fd.get('step_up_pct')),
      return_rate: Number(fd.get('return_rate')),
      start_year: Number(fd.get('start_year')),
      end_year: fd.get('end_year') ? Number(fd.get('end_year')) : null
    };
    try {
      if (modal.data) await api.updateSip(modal.data.id, data);
      else await api.createSip(data);
      showToast('✅ SIP saved!');
      setModal({ open: false, data: null });
      loadSips();
    } catch (err) {
      showToast('❌ Error saving SIP');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this SIP?')) {
      try {
        await api.deleteSip(id);
        showToast('🗑️ SIP deleted');
        loadSips();
      } catch (err) {
        showToast('❌ Error deleting SIP');
      }
    }
  };

  return (
    <div className="clay-card card-rose">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '18px'}}>
        <h2 className="section-title" style={{margin:0}}><span className="title-icon">📈</span> SIPs</h2>
        <button className="btn-primary" onClick={() => setModal({open: true, data: null})}>➕ Add SIP</button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">📅 Monthly SIP</div>
          <div className="kpi-value">{fmt(totalMonthly)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">📆 Annual Total</div>
          <div className="kpi-value">{fmt(totalAnnual)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">🔄 SIP Count</div>
          <div className="kpi-value">{sips.length}</div>
        </div>
      </div>

      <div>
        {sips.map(sip => (
          <div key={sip.id} className="item-row">
            <div>
              <div className="item-name">{sip.name} <span className={`badge badge-${sip.asset_class.replace('_','-')}`}>{sip.asset_class}</span></div>
              <div className="item-sub">{fmt(sip.monthly_amount)}/mo • {sip.step_up_pct}% Step-up • {sip.return_rate}% Return</div>
            </div>
            <div className="item-actions">
              <button className="btn-icon" onClick={() => setModal({open: true, data: sip})}>✏️</button>
              <button className="btn-icon" onClick={() => handleDelete(sip.id)}>🗑️</button>
            </div>
          </div>
        ))}
        {sips.length === 0 && <div className="empty-state">No SIPs found. Start investing!</div>}
      </div>

      {modal.open && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3 className="modal-title">{modal.data ? '✏️ Edit SIP' : '➕ Add SIP'}</h3>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" name="name" defaultValue={modal.data?.name || ''} required />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Asset Class</label>
                  <select className="form-input" name="asset_class" defaultValue={modal.data?.asset_class || 'equity'}>
                    <option value="equity">Equity</option>
                    <option value="debt">Debt</option>
                    <option value="gold">Gold</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly Amount</label>
                  <input className="form-input" type="number" name="monthly_amount" defaultValue={modal.data?.monthly_amount || ''} required />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Step-up % / Year</label>
                  <input className="form-input" type="number" step="0.1" name="step_up_pct" defaultValue={modal.data?.step_up_pct || 0} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Return Rate (%)</label>
                  <input className="form-input" type="number" step="0.1" name="return_rate" defaultValue={modal.data?.return_rate || 12} required />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Start Year</label>
                  <input className="form-input" type="number" name="start_year" defaultValue={modal.data?.start_year || new Date().getFullYear()} required />
                </div>
                <div className="form-group">
                  <label className="form-label">End Year (Optional)</label>
                  <input className="form-input" type="number" name="end_year" defaultValue={modal.data?.end_year || ''} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setModal({open: false, data: null})}>Cancel</button>
                <button type="submit" className="btn-primary">Save SIP</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
