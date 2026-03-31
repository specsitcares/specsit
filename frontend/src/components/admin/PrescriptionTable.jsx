import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Edit, Trash2, FileText, MoreHorizontal, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import apiClient from '../../services/api';
import FormModal from './FormModal';

const PrescriptionTable = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedRx, setSelectedRx] = useState(null);
  const [formMode, setFormMode] = useState('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  useEffect(() => { fetchPrescriptions(); }, []);

  const fetchPrescriptions = async () => {
    try {
      const res = await apiClient.get('/catalog/prescriptions/');
      setPrescriptions(Array.isArray(res.data) ? res.data : (res.data.results || []));
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const handleCreateClick = () => { setFormMode('create'); setSelectedRx(null); setShowForm(true); };
  const handleEditClick   = (rx) => { setFormMode('edit');   setSelectedRx(rx);    setShowForm(true); };
  const handleDeleteClick = (rx) => { setFormMode('edit');   setSelectedRx(rx);    setShowForm(true); };

  const handleFormSubmit = async (formData) => {
    if (formMode === 'create') await apiClient.post('/catalog/prescriptions/', formData);
    else await apiClient.patch(`/catalog/prescriptions/${selectedRx.id}/`, formData);
    fetchPrescriptions();
  };

  const handleFormDelete = async (id) => {
    await apiClient.delete(`/catalog/prescriptions/${id}/`);
    fetchPrescriptions();
  };

  const filtered = prescriptions.filter(rx =>
    [rx.user_name, rx.vision_type, String(rx.id)].some(v => v?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (loading) return <div className="db-loading-state">Loading prescriptions…</div>;

  return (
    <div className="admin-table-wrapper">
      <div className="table-toolbar">
        <div>
          <div className="table-title">Optical Prescriptions</div>
          <div className="table-subtitle">{filtered.length} active prescriptions</div>
        </div>
        <div className="table-actions">
          <div className="table-search-box">
            <Search size={14} />
            <input type="text" placeholder="Search customer or type…" value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }} />
          </div>
          <button className="btn btn-outline"><Filter size={14} /> Filter</button>
          <button className="btn btn-primary" onClick={handleCreateClick}><Plus size={14} /> Add Prescription</button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}><input type="checkbox" /></th>
              <th>Customer</th>
              <th>Vision Type</th>
              <th>PD Distance</th>
              <th>Status</th>
              <th>Created</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(rx => (
              <tr key={rx.id}>
                <td><input type="checkbox" /></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--brand-50)', color: 'var(--brand-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={16} />
                    </div>
                    <div className="cell-text-primary">{rx.user_name || 'Anonymous'}</div>
                  </div>
                </td>
                <td><span className="cell-text-secondary">{rx.vision_type || '—'}</span></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Activity size={12} color="var(--gray-400)" />
                    <span className="cell-text-primary" style={{ fontSize: '13px' }}>{rx.pd_distance ? `${rx.pd_distance}mm` : '—'}</span>
                  </div>
                </td>
                <td>
                  <span className={`badge ${(rx.status_label || 'pending').toLowerCase() === 'approved' ? 'badge-success' : 'badge-warning'}`}>
                    <span className="badge-dot" />{rx.status_label || 'Pending'}
                  </span>
                </td>
                <td><span className="cell-text-secondary">{new Date(rx.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</span></td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                    <button className="row-action-btn edit" onClick={() => handleEditClick(rx)}><Edit size={14}/></button>
                    <button className="row-action-btn delete" onClick={() => handleDeleteClick(rx)}><Trash2 size={14}/></button>
                    <button className="row-action-btn"><MoreHorizontal size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-pagination">
        <div className="pagination-info">Showing {paginated.length} of {filtered.length}</div>
        <div className="pagination-controls">
          <button className="page-btn" disabled={page===1} onClick={() => setPage(p=>p-1)}><ChevronLeft size={14}/></button>
          <button className="page-btn" disabled={page>=totalPages||totalPages===0} onClick={() => setPage(p=>p+1)}><ChevronRight size={14}/></button>
        </div>
      </div>

      <FormModal isOpen={showForm} onClose={() => setShowForm(false)} onSubmit={handleFormSubmit}
        onDelete={handleFormDelete} mode={formMode} title="Prescription"
        fields={[
          { name: 'vision_type', label: 'Vision Type', type: 'select', options: [
            { label: 'Myopia', value: 'Myopia' }, { label: 'Hyperopia', value: 'Hyperopia' },
            { label: 'Astigmatism', value: 'Astigmatism' }, { label: 'Presbyopia', value: 'Presbyopia' }
          ], required: true },
          { name: 'pd_distance', label: 'PD Distance (mm)', type: 'number', required: true, step: 0.1, min: 0, max: 100 },
          { name: 'od_sphere', label: 'OD Sphere', type: 'number', step: 0.25 },
          { name: 'od_cylinder', label: 'OD Cylinder', type: 'number', step: 0.25 },
          { name: 'os_sphere', label: 'OS Sphere', type: 'number', step: 0.25 },
          { name: 'os_cylinder', label: 'OS Cylinder', type: 'number', step: 0.25 }
        ]}
        initialData={selectedRx || {}} />
    </div>
  );
};

export default PrescriptionTable;
