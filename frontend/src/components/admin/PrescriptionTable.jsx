import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Edit, Trash2, FileText, MoreVertical, ChevronLeft, ChevronRight, Activity, Edit2 } from 'lucide-react';
import apiClient from '../../services/api';
import FormModal from './FormModal';
import BaseAdminTable from './BaseAdminTable';

const PrescriptionTable = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedRx, setSelectedRx] = useState(null);
  const [formMode, setFormMode] = useState('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { fetchPrescriptions(); }, []);

  const fetchPrescriptions = async () => {
    try {
      const res = await apiClient.get('/catalog/prescriptions/');
      setPrescriptions(Array.isArray(res.data) ? res.data : (res.data.results || []));
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const handleCreateClick = () => { setFormMode('create'); setSelectedRx(null); setShowForm(true); };
  const handleEditClick   = (rx) => { setFormMode('edit');   setSelectedRx(rx);    setShowForm(true); };

  const handleFormSubmit = async (formData) => {
    try {
      if (formMode === 'create') await apiClient.post('/catalog/prescriptions/', formData);
      else await apiClient.patch(`/catalog/prescriptions/${selectedRx.id}/`, formData);
      setShowForm(false);
      fetchPrescriptions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFormDelete = async (id) => {
    try {
      await apiClient.delete(`/catalog/prescriptions/${id}/`);
      setShowForm(false);
      fetchPrescriptions();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = prescriptions.filter(rx =>
    [rx.user_name, rx.vision_type, String(rx.id)].some(v => v?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const columns = [
    { label: 'Customer', key: 'customer', sortable: true },
    { label: 'Vision Type', key: 'vision', sortable: true },
    { label: 'PD Distance', key: 'pd', sortable: true },
    { label: 'Status', key: 'status', sortable: true },
    { label: 'Created', key: 'created', sortable: true },
    { label: 'Action', key: 'action', align: 'right' }
  ];

  const renderRow = (rx, idx) => (
    <tr key={rx.id || idx} style={{ borderBottom: '1px solid #EAECF0', backgroundColor: '#fff' }}>
      <td style={{ padding: '16px 24px' }}>
        <input type="checkbox" style={{ cursor: 'pointer', borderRadius: '4px', accentColor: '#7F56D9' }} />
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#F4EBFF', color: '#7F56D9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={18} />
          </div>
          <div style={{ fontWeight: 600, color: '#101828', fontSize: '14px' }}>{rx.user_name || 'Anonymous'}</div>
        </div>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <span style={{ fontSize: '14px', color: '#475467' }}>{rx.vision_type || '—'}</span>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Activity size={14} color="#667085" />
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#344054' }}>{rx.pd_distance ? `${rx.pd_distance}mm` : '—'}</span>
        </div>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <span style={{
          backgroundColor: (rx.status_label || 'pending').toLowerCase() === 'approved' ? '#ECFDF3' : '#FFFAEB',
          color: (rx.status_label || 'pending').toLowerCase() === 'approved' ? '#027A48' : '#B54708',
          padding: '4px 10px',
          borderRadius: '16px',
          fontSize: '12px',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          border: `1px solid ${(rx.status_label || 'pending').toLowerCase() === 'approved' ? '#ABEFC6' : '#FEDF89'}`
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: (rx.status_label || 'pending').toLowerCase() === 'approved' ? '#12B76A' : '#F79009' }}></span>
          {rx.status_label || 'Pending'}
        </span>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <span style={{ fontSize: '13px', color: '#667085' }}>{new Date(rx.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</span>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <div
            onClick={() => handleEditClick(rx)}
            style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
            title="Edit Prescription"
          >
            <Edit2 size={16} />
          </div>
          <div
            onClick={() => handleEditClick(rx)}
            style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
            title="Delete Prescription"
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
        title="Optical Prescriptions"
        count={filtered.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAdd={handleCreateClick}
        addLabel="Add Prescription"
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
             <div style={{ fontSize: '14px', color: '#667085' }}>Prescription filters coming soon.</div>
          </div>
        }
      />

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
    </>
  );
};

export default PrescriptionTable;
