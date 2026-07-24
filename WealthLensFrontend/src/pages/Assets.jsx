import React, { useState, useEffect } from 'react';
import { api, fmt } from '../api/client';

export default function Assets({ showToast }) {
  const [assets, setAssets] = useState([]);
  const [modal, setModal] = useState({ open: false, data: null });

  const loadAssets = () => {
    api.getAssets().then(setAssets).catch(console.error);
  };

  useEffect(() => { loadAssets(); }, []);

  const totalValue = assets.reduce((sum, a) => sum + a.value, 0);
  const blendedReturn = totalValue > 0 ? assets.reduce((sum, a) => sum + (a.value * a.return_rate), 0) / totalValue : 0;

  const handleSave = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      name: fd.get('name'),
      asset_class: fd.get('asset_class'),
      value: Number(fd.get('value')),
      return_rate: Number(fd.get('return_rate'))
    };
    try {
      if (modal.data) await api.updateAsset(modal.data.id, data);
      else await api.createAsset(data);
      showToast('✅ Asset saved!');
      setModal({ open: false, data: null });
      loadAssets();
    } catch (err) {
      showToast('❌ Error saving asset');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this asset?')) {
      try {
        await api.deleteAsset(id);
        showToast('🗑️ Asset deleted');
        loadAssets();
      } catch (err) {
        showToast('❌ Error deleting asset');
      }
    }
  };

  return (
    <div className="clay-card card-peach">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '18px'}}>
        <h2 className="section-title" style={{margin:0}}><span className="title-icon">💼</span> Assets</h2>
        <button className="btn-primary" onClick={() => setModal({open: true, data: null})}>➕ Add Asset</button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">💰 Total Value</div>
          <div className="kpi-value">{fmt(totalValue)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">📈 Blended Return</div>
          <div className="kpi-value">{blendedReturn.toFixed(1)}%</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">🔢 Asset Count</div>
          <div className="kpi-value">{assets.length}</div>
        </div>
      </div>

      <div>
        {assets.map(asset => (
          <div key={asset.id} className="item-row">
            <div>
              <div className="item-name">{asset.name} <span className={`badge badge-${asset.asset_class.replace('_', '-')}`}>{asset.asset_class}</span></div>
              <div className="item-sub">{fmt(asset.value)} • {asset.return_rate}% Return</div>
            </div>
            <div className="item-actions">
              <button className="btn-icon" onClick={() => setModal({open: true, data: asset})}>✏️</button>
              <button className="btn-icon" onClick={() => handleDelete(asset.id)}>🗑️</button>
            </div>
          </div>
        ))}
        {assets.length === 0 && <div className="empty-state">No assets found. Add one!</div>}
      </div>

      {modal.open && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3 className="modal-title">{modal.data ? '✏️ Edit Asset' : '➕ Add Asset'}</h3>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" name="name" defaultValue={modal.data?.name || ''} required />
              </div>
              <div className="form-group">
                <label className="form-label">Asset Class</label>
                <select className="form-input" name="asset_class" defaultValue={modal.data?.asset_class || 'equity'}>
                  <option value="equity">Equity</option>
                  <option value="debt">Debt</option>
                  <option value="gold">Gold</option>
                  <option value="real_estate">Real Estate</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Value</label>
                <input className="form-input" type="number" name="value" defaultValue={modal.data?.value || ''} required />
              </div>
              <div className="form-group">
                <label className="form-label">Return Rate (%)</label>
                <input className="form-input" type="number" step="0.1" name="return_rate" defaultValue={modal.data?.return_rate || ''} required />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setModal({open: false, data: null})}>Cancel</button>
                <button type="submit" className="btn-primary">Save Asset</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
