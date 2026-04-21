import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Edit, Trash2, Camera, MoreVertical, ChevronLeft, ChevronRight, User, Edit2 } from 'lucide-react';
import apiClient from '../../../services/api';
import FormModal from './FormModal';
import BaseAdminTable from './BaseAdminTable';

const UserFaceTable = () => {
  const [faces, setFaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedFace, setSelectedFace] = useState(null);
  const [formMode, setFormMode] = useState('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);

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
    try {
      if (formMode === 'create') await apiClient.post('/catalog/user-faces/', body);
      else await apiClient.put(`/catalog/user-faces/${selectedFace.id}/`, body);
      setShowForm(false);
      fetchFaces();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFormDelete = async (id) => {
    try {
      await apiClient.delete(`/catalog/user-faces/${id}/`);
      setShowForm(false);
      fetchFaces();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = faces.filter(f =>
    [f.user_name, f.pd_distance?.toString()].some(v => v?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const columns = [
    { label: 'Customer', key: 'customer', sortable: true },
    { label: 'Face Capture', key: 'face' },
    { label: 'PD Distance', key: 'pd', sortable: true },
    { label: 'Created', key: 'created', sortable: true },
    { label: 'Action', key: 'action', align: 'right' }
  ];

  const renderRow = (face, idx) => (
    <tr key={face.id || idx} style={{ borderBottom: '1px solid #EAECF0', backgroundColor: '#fff' }}>
      <td style={{ padding: '16px 24px' }}>
        <input type="checkbox" style={{ cursor: 'pointer', borderRadius: '4px', accentColor: '#7F56D9' }} />
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F4EBFF', color: '#7F56D9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={16} />
          </div>
          <div style={{ fontWeight: 600, color: '#101828', fontSize: '14px' }}>{face.user_name || 'N/A'}</div>
        </div>
      </td>
      <td style={{ padding: '16px 24px' }}>
        {face.image ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 60, height: 40, borderRadius: 8, overflow: 'hidden', border: '1px solid #EAECF0', background: '#F9FAFB' }}>
              <img src={face.image} alt="face" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#667085' }} title="View Fullsize"><Eye size={16}/></button>
          </div>
        ) : <span style={{ color: '#667085', fontSize: '14px' }}>—</span>}
      </td>
      <td style={{ padding: '16px 24px' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#344054' }}>{face.pd_distance ? `${face.pd_distance}mm` : '—'}</span>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <span style={{ fontSize: '13px', color: '#667085' }}>{new Date(face.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</span>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <div
            onClick={() => handleEditClick(face)}
            style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
            title="Edit Profile"
          >
            <Edit2 size={16} />
          </div>
          <div
            onClick={() => { setSelectedFace(face); setFormMode('edit'); setShowForm(true); }}
            style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
            title="Delete Profile"
          >
            <Trash2 size={16} />
          </div>
        </div>
      </td>
    </tr>
  );

  return (
    <>
      <BaseAdminTable
        title="VTO Face Captures"
        count={filtered.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAdd={handleCreateClick}
        addLabel="Capture New"
        columns={columns}
        data={paginated}
        loading={loading}
        renderRow={renderRow}
        pagination={{
          page,
          perPage,
          totalCount: filtered.length,
          onPageChange: setPage,
          onPerPageChange: setPerPage
        }}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        filterContent={
          <div style={{ display: 'flex', gap: '16px' }}>
             <div style={{ fontSize: '14px', color: '#667085' }}>No active filters available for face profiles.</div>
          </div>
        }
      />

      <FormModal
        isOpen={showForm} onClose={() => setShowForm(false)} onSubmit={handleFormSubmit}
        onDelete={handleFormDelete} mode={formMode} title="Face Capture"
        fields={[
          { name: 'pd_distance', label: 'PD Distance (mm)', type: 'number', required: true, step: 0.1 },
          { name: 'image', label: 'Face Image', type: 'file', accept: 'image/*' }
        ]}
        initialData={selectedFace || {}} />
    </>
  );
};

export default UserFaceTable;
