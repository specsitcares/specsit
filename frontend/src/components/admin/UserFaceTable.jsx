import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Edit, Trash2, Camera, MoreHorizontal, ChevronLeft, ChevronRight, User } from 'lucide-react';
import apiClient from '../../services/api';
import FormModal from './FormModal';

const UserFaceTable = () => {
  const [faces, setFaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedFace, setSelectedFace] = useState(null);
  const [formMode, setFormMode] = useState('create');
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  useEffect(() => { fetchFaces(); }, []);

  const fetchFaces = async () => {
    try {
      const res = await apiClient.get('/catalog/user-faces/');
      setFaces(Array.isArray(res.data) ? res.data : (res.data.results || []));
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const handleCreateClick = () => { setFormMode('create'); setSelectedFace(null); setShowForm(true); };
  const handleEditClick   = (face) => { setFormMode('edit');   setSelectedFace(face);    setShowForm(true); };

  const handleFormSubmit = async (formData) => {
    const body = new FormData();
    Object.keys(formData).forEach(k => {
      if (formData[k] != null && formData[k] !== '') body.append(k, formData[k]);
    });
    if (formMode === 'create') await apiClient.post('/catalog/user-faces/', body);
    else await apiClient.put(`/catalog/user-faces/${selectedFace.id}/`, body);
    fetchFaces();
  };

  const handleFormDelete = async (id) => {
    await apiClient.delete(`/catalog/user-faces/${id}/`);
    fetchFaces();
  };

  const totalPages = Math.ceil(faces.length / PER_PAGE);
  const paginated  = faces.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (loading) return <div className="db-loading-state">Loading face captures…</div>;

  return (
    <div className="admin-table-wrapper">
      <div className="table-toolbar">
        <div>
          <div className="table-title">VTO Face Captures</div>
          <div className="table-subtitle">{faces.length} virtual try-on profiles</div>
        </div>
        <div className="table-actions">
           <button className="btn btn-outline"><Filter size={14} /> Filter</button>
           <button className="btn btn-primary" onClick={handleCreateClick}>
             <Camera size={14} /> Capture New
           </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}><input type="checkbox" /></th>
              <th>Customer</th>
              <th>Face Capture</th>
              <th>PD Distance</th>
              <th>Created</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={6}><div className="empty-state">No face captures yet.</div></td></tr>
            ) : paginated.map(face => (
              <tr key={face.id}>
                <td><input type="checkbox" /></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gray-100)', color: 'var(--gray-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={16} />
                    </div>
                    <div className="cell-text-primary">{face.user_name || 'N/A'}</div>
                  </div>
                </td>
                <td>
                  {face.image ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: 60, height: 40, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--gray-100)', background: 'var(--gray-25)' }}>
                        <img src={face.image} alt="face" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <button className="row-action-btn" title="View Fullsize"><Eye size={14}/></button>
                    </div>
                  ) : '—'}
                </td>
                <td><span className="cell-text-primary" style={{ fontSize: '13px' }}>{face.pd_distance ? `${face.pd_distance}mm` : '—'}</span></td>
                <td><span className="cell-text-secondary">{new Date(face.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</span></td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                    <button className="row-action-btn edit" onClick={() => handleEditClick(face)}><Edit size={14}/></button>
                    <button className="row-action-btn delete" onClick={() => { setSelectedFace(face); setFormMode('edit'); setShowForm(true); }}><Trash2 size={14}/></button>
                    <button className="row-action-btn"><MoreHorizontal size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-pagination">
        <div className="pagination-info">Showing {paginated.length} of {faces.length} captures</div>
        <div className="pagination-controls">
          <button className="page-btn" disabled={page===1} onClick={() => setPage(p=>p-1)}><ChevronLeft size={14}/></button>
          <button className="page-btn active">{page}</button>
          <button className="page-btn" disabled={page>=totalPages||totalPages===0} onClick={() => setPage(p=>p+1)}><ChevronRight size={14}/></button>
        </div>
      </div>

      <FormModal
        isOpen={showForm} onClose={() => setShowForm(false)} onSubmit={handleFormSubmit}
        onDelete={handleFormDelete} mode={formMode} title="Face Capture"
        fields={[
          { name: 'pd_distance', label: 'PD Distance (mm)', type: 'number', required: true, step: 0.1 },
          { name: 'image', label: 'Face Image', type: 'file', accept: 'image/*' }
        ]}
        initialData={selectedFace || {}} />
    </div>
  );
};

export default UserFaceTable;
