import React, { useState, useEffect } from 'react';
import { api, fmt } from '../api/client';
import NumberInput from '../components/NumberInput';

export default function Assets({ profileId, showToast, categories = [] }) {
  const [assets, setAssets] = useState([]);
  const [modal, setModal] = useState({ open: false, data: null });
  const [filter, setFilter] = useState('all');

  const loadAssets = () => {
    if (profileId) api.getAssets(profileId).then(setAssets).catch(console.error);
  };

  useEffect(() => { loadAssets(); }, [profileId]);

  const filteredAssets = filter === 'all' ? assets : assets.filter(a => a.asset_class === filter);
  const totalValue = filteredAssets.reduce((sum, a) => sum + a.value, 0);
  const blendedReturn = totalValue > 0 ? filteredAssets.reduce((sum, a) => sum + (a.value * a.return_rate), 0) / totalValue : 0;

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
      if (modal.data) await api.updateAsset(profileId, modal.data.id, data);
      else await api.createAsset(profileId, data);
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
        await api.deleteAsset(profileId, id);
        showToast('🗑️ Asset deleted');
        loadAssets();
      } catch (err) {
        showToast('❌ Error deleting asset');
      }
    }
  };

  return (
    <div className="clay-card card-peach">
      <div style={{display:'flex', flexWrap: 'wrap', justifyContent:'space-between', alignItems:'center', gap: '10px', marginBottom: '18px'}}>
        <h2 className="section-title" style={{margin:0}}>
          <span className="title-icon">💼</span> Assets
          <span className="info-icon" data-tooltip="Track all your investments, properties, and cash balances here. These compound over time to build your wealth.">i</span>
        </h2>
        <div style={{display: 'flex', gap: '10px', flexWrap: 'nowrap', alignItems: 'center'}}>
          <select className="form-input" style={{padding: '0 16px', borderRadius: '50px', minWidth: '130px', height: '38px'}} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All Classes</option>
            {categories.filter(c => c.category_type === 'asset_class').map(c => (
              <option key={c.code} value={c.code}>{c.display_name}</option>
            ))}
          </select>
          <button className="btn-primary" style={{height: '38px', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap'}} onClick={() => setModal({open: true, data: null})}>➕ Add Asset</button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">💰 Total Value</div>
          <div className="kpi-value">{fmt(totalValue)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">📈 Blended Return</div>
          <div className="kpi-value">{blendedReturn.toFixed(2)}%</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">🔢 Asset Count</div>
          <div className="kpi-value">{assets.length}</div>
        </div>
      </div>

      <div>
        {filteredAssets.map(asset => (
          <div key={asset.id} className="item-row">
            <div style={{flex: 1}}>
              <div className="item-name">{asset.name}</div>
              <div className="item-sub">Return Rate: {asset.return_rate}% / yr</div>
            </div>
            <div style={{ paddingRight: '24px', textAlign: 'right', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '130px', textAlign: 'right' }}>
                <span className={`badge badge-${asset.asset_class.replace('_', '-')}`}>
                  {categories.find(c => c.category_type === 'asset_class' && c.code === asset.asset_class)?.display_name || asset.asset_class}
                </span>
              </div>
              <div style={{ minWidth: '130px', textAlign: 'right' }}>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#2D1B69' }}>
                  {fmt(asset.value)}
                </div>
                <div className="item-sub" style={{textTransform: 'uppercase', letterSpacing: '0.5px'}}>Current Value</div>
              </div>
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
                  {categories.filter(c => c.category_type === 'asset_class').map(c => (
                    <option key={c.code} value={c.code}>{c.display_name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Value</label>
                <NumberInput name="value" defaultValue={modal.data?.value || ''} required />
              </div>
              <div className="form-group">
                <label className="form-label">Return Rate (%)</label>
                <input className="form-input" type="number" step="0.01" name="return_rate" defaultValue={modal.data?.return_rate || ''} required />
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
