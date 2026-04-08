import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, Edit, AlertTriangle, Package, MoreVertical, ChevronLeft, ChevronRight, Box, Edit2 } from 'lucide-react';
import apiClient from '../../services/api';
import FormModal from './FormModal';
import BaseAdminTable from './BaseAdminTable';

const InventoryTable = () => {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [page, setPage]             = useState(1);
  const [perPage, setPerPage]       = useState(10);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { 
    fetchInventory(); 
    const interval = setInterval(fetchInventory, 5000); // 5s real-time poll
    return () => clearInterval(interval);
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await apiClient.get('/catalog/variants/');
      setVariants(Array.isArray(res.data) ? res.data : (res.data.results || []));
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const handleEditClick = (v) => { setSelectedVariant(v); setShowForm(true); };

  const handleFormSubmit = async (formData) => {
    try {
      await apiClient.patch(`/catalog/variants/${selectedVariant.id}/`, { stock: formData.stock });
      setShowForm(false);
      fetchInventory();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = variants.filter(v =>
    [v.product_name, v.sku, v.color].some(val => val?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const columns = [
    { label: 'Product Variant', key: 'variant', sortable: true },
    { label: 'SKU Reference', key: 'sku', sortable: true },
    { label: 'Current Stock', key: 'stock', sortable: true },
    { label: 'Health Status', key: 'health' },
    { label: 'Availability', key: 'availability', sortable: true },
    { label: 'Action', key: 'action', align: 'right' }
  ];

  const renderRow = (v, idx) => (
    <tr key={v.id || idx} style={{ borderBottom: '1px solid #EAECF0', backgroundColor: '#fff' }}>
      <td style={{ padding: '16px 24px' }}>
        <input type="checkbox" style={{ cursor: 'pointer', borderRadius: '4px', accentColor: '#7F56D9' }} />
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: '#F9FAFB', border: '1px solid #EAECF0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {v.image ? <img src={v.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Package size={20} color="#D0D5DD" />}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#101828', fontSize: '14px' }}>{v.product_name || 'N/A'}</div>
            <div style={{ fontSize: '12px', color: '#667085' }}>{v.color || 'Standard'}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#475467' }}>{v.sku}</span>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: '14px', color: '#101828' }}>{v.stock}</span>
          <Box size={14} color={v.stock > 10 ? '#D0D5DD' : '#F79009'} />
        </div>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <span style={{
          backgroundColor: v.stock <= 5 ? '#FEF3F2' : v.stock <= 20 ? '#FFFAEB' : '#ECFDF3',
          color: v.stock <= 5 ? '#B42318' : v.stock <= 20 ? '#B54708' : '#027A48',
          padding: '4px 10px',
          borderRadius: '16px',
          fontSize: '12px',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          border: `1px solid ${v.stock <= 5 ? '#FEE4E2' : v.stock <= 20 ? '#FEDF89' : '#ABEFC6'}`
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: v.stock <= 5 ? '#D92D20' : v.stock <= 20 ? '#F79009' : '#12B76A' }}></span>
          {v.stock <= 5 ? 'Critical' : v.stock <= 20 ? 'Low Stock' : 'Healthy'}
        </span>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <span style={{
          backgroundColor: v.stock > 0 ? '#F9F5FF' : '#F2F4F7',
          color: v.stock > 0 ? '#6941C6' : '#414651',
          padding: '4px 10px',
          borderRadius: '16px',
          fontSize: '12px',
          fontWeight: 600,
          border: `1px solid ${v.stock > 0 ? '#E9D7FE' : '#D0D5DD'}`
        }}>
          {v.stock > 0 ? 'Active' : 'Unlisted'}
        </span>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <div
            onClick={() => handleEditClick(v)}
            style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
            title="Adjust Stock"
          >
            <Edit2 size={16} />
          </div>
          <div
            style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
          >
            <MoreVertical size={16} />
          </div>
        </div>
      </td>
    </tr>
  );

  return (
    <>
      <BaseAdminTable
        title="Inventory Control"
        count={filtered.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
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
             <button className="btn btn-outline" onClick={fetchInventory} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, border: '1px solid #D0D5DD', background: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
               <RefreshCw size={14} /> Sync Warehouse
             </button>
          </div>
        }
      />

      <FormModal isOpen={showForm} onClose={() => setShowForm(false)} onSubmit={handleFormSubmit}
        mode="edit" title="Adjust Stock"
        fields={[
          { name: 'product_name', label: 'Product Name', type: 'text', readOnly: true },
          { name: 'sku', label: 'SKU Code', type: 'text', readOnly: true },
          { name: 'stock', label: 'Manual Stock Correction', type: 'number', required: true, min: 0 }
        ]}
        initialData={selectedVariant || {}} />
    </>
  );
};

export default InventoryTable;
