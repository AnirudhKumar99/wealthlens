import React, { useState, useEffect } from 'react';
import { api, fmt } from '../api/client';
import NumberInput from '../components/NumberInput';

export default function SIPs({ profileId, showToast, categories = [] }) {
  const [sips, setSips] = useState([]);
  const [modal, setModal] = useState({ open: false, data: null });
  const [filter, setFilter] = useState('all');

  const loadSips = () => {
    if (!profileId) return;
    api.getSips(profileId).then(setSips).catch(console.error);
  };

  useEffect(() => { loadSips(); }, [profileId]);

  const filteredSips = filter === 'all' ? sips : sips.filter(s => s.asset_class === filter);
  const totalMonthly = filteredSips.reduce((sum, sip) => sum + sip.monthly_amount, 0);
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
      if (modal.data) await api.updateSip(profileId, modal.data.id, data);
      else await api.createSip(profileId, data);
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
        await api.deleteSip(profileId, id);
        showToast('🗑️ SIP deleted');
        loadSips();
      } catch (err) {
        showToast('❌ Error deleting SIP');
      }
    }
  };

  return (
    <div className="clay-card card-rose">
      <div style={{display:'flex', flexWrap: 'wrap', justifyContent:'space-between', alignItems:'center', gap: '10px', marginBottom: '18px'}}>
        <h2 className="section-title" style={{margin:0}}>
          <span className="title-icon">📈</span> SIPs
          <span className="info-icon" data-tooltip="Log your Systematic Investment Plans to project your recurring monthly wealth building.">i</span>
        </h2>
        <div style={{display: 'flex', gap: '10px', flexWrap: 'nowrap', alignItems: 'center'}}>
          <select className="form-input" style={{padding: '0 16px', borderRadius: '50px', minWidth: '130px', height: '38px'}} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All Classes</option>
            {categories.filter(c => c.category_type === 'asset_class').map(c => (
              <option key={c.code} value={c.code}>{c.display_name}</option>
            ))}
          </select>
          <button className="btn-primary" style={{height: '38px', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap'}} onClick={() => setModal({open: true, data: null})}>➕ Add SIP</button>
        </div>
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
        {filteredSips.map(sip => (
          <div key={sip.id} className="item-row">
            <div style={{flex: 1}}>
              <div className="item-name">{sip.name}</div>
              <div className="item-sub">
                From {sip.start_year} to {sip.end_year || 'Forever'} • {sip.return_rate}% Return • {sip.step_up_pct}% Step-up
              </div>
            </div>
            <div style={{ paddingRight: '24px', textAlign: 'right', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '130px', textAlign: 'right' }}>
                <span className={`badge badge-${sip.asset_class.replace('_', '-')}`}>
                  {categories.find(c => c.category_type === 'asset_class' && c.code === sip.asset_class)?.display_name || sip.asset_class}
                </span>
              </div>
              <div style={{ minWidth: '130px', textAlign: 'right' }}>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#2D1B69' }}>
                  {fmt(sip.monthly_amount)}<span style={{fontSize: '14px', color: '#9B8EC4'}}>/mo</span>
                </div>
                <div className="item-sub" style={{textTransform: 'uppercase', letterSpacing: '0.5px'}}>SIP Amount</div>
              </div>
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
                  {categories.filter(c => c.category_type === 'asset_class').map(c => (
                    <option key={c.code} value={c.code}>{c.display_name}</option>
                  ))}
                </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly Amount</label>
                  <NumberInput name="monthly_amount" defaultValue={modal.data?.monthly_amount || ''} required />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Step-up % / Year</label>
                  <input className="form-input" type="number" step="0.01" name="step_up_pct" defaultValue={modal.data?.step_up_pct || 0} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Return Rate (%)</label>
                  <input className="form-input" type="number" step="0.01" name="return_rate" defaultValue={modal.data?.return_rate || 12} required />
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
