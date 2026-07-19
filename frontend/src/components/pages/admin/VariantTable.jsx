import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Edit, Trash2, Grid, MoreVertical, ChevronLeft, ChevronRight, Hash, Box, Edit2 } from 'lucide-react';
import apiClient from '../../../services/api';
import FormModal from './FormModal';
import BaseAdminTable from './BaseAdminTable';

const VariantTable = () => {
  const [variants, setVariants]   = useState([]);
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [formMode, setFormMode]   = useState('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage]           = useState(1);
  const [perPage, setPerPage]     = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [varRes, prodRes] = await Promise.all([
        apiClient.get('/catalog/variants/'),
        apiClient.get('/catalog/products/?admin=true')
      ]);
      setVariants(Array.isArray(varRes.data) ? varRes.data : (varRes.data.results || []));
      setProducts(Array.isArray(prodRes.data) ? prodRes.data : (prodRes.data.results || []));
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const bulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} variant(s)?`)) return;
    await Promise.all([...selectedIds].map(id => apiClient.delete(`/catalog/variants/${id}/`).catch(() => {})));
    setSelectedIds(new Set());
    fetchData();
  };

  const bulkActions = [
    { label: 'Delete Selected', variant: 'danger', icon: Trash2, onClick: bulkDelete },
  ];

  const handleCreateClick = () => { setFormMode('create'); setSelectedVariant(null); setShowForm(true); };
  const handleEditClick   = (v) => { setFormMode('edit');   setSelectedVariant(v);    setShowForm(true); };

  const handleFormSubmit = async (formData) => {
    const data = new FormData();
    Object.keys(formData).forEach(k => {
      if (formData[k] != null) {
        if (k === 'image' && typeof formData[k] === 'string') return;
        data.append(k, formData[k]);
      }
    });
    if (formMode === 'create') await apiClient.post('/catalog/variants/', data);
    else await apiClient.patch(`/catalog/variants/${selectedVariant.id}/`, data);
    await fetchData();
  };

  const handleFormDelete = async (id) => {
    await apiClient.delete(`/catalog/variants/${id}/`);
    await fetchData();
  };

  const filtered = variants.filter(v =>
    [v.product_name, v.sku, v.color, v.barcode].some(val => val?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const columns = [
    { label: 'Product', key: 'product', sortable: true },
    { label: 'Category', key: 'category', sortable: true },
    { label: 'Attributes', key: 'attributes' },
    { label: 'SKU Code', key: 'sku', sortable: true },
    { label: 'Barcode', key: 'barcode' },
    { label: 'Inventory', key: 'inventory', sortable: true },
    { label: 'Price Adj.', key: 'price', sortable: true },
    { label: 'Action', key: 'action', align: 'right' }
  ];

  const renderRow = (v, idx, { isSelected, onToggle } = {}) => (
    <tr key={v.id || idx} style={{ borderBottom: '1px solid #EAECF0', backgroundColor: isSelected ? '#F9F5FF' : '#fff' }}>
      <td style={{ padding: '16px 24px' }}>
        <input type="checkbox" checked={!!isSelected} onChange={onToggle} style={{ cursor: 'pointer', borderRadius: '3px', accentColor: '#7F56D9' }} />
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 6, background: '#F9FAFB', border: '1px solid #EAECF0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {v.image ? <img src={v.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Grid size={18} color="#D0D5DD" />}
          </div>
          <div style={{ fontWeight: 600, color: '#101828', fontSize: '11px' }}>{v.product_name || 'N/A'}</div>
        </div>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <span style={{ fontSize: '11px', color: '#475467' }}>{v.category_name || '—'}</span>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {v.color && (
             <span style={{ 
               padding: '2px 8px', fontSize: '9px', background: 'white', 
               border: '1px solid #D0D5DD', borderRadius: '3px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600, color: '#344054'
             }}>
               <div style={{ width: 8, height: 8, borderRadius: '50%', background: (v.color_code || v.color || '').toLowerCase(), border: '1px solid #EAECF0' }} />
               {v.color}
             </span>
          )}
        </div>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <code style={{ background: '#F9FAFB', border: '1px solid #EAECF0', padding: '4px 8px', borderRadius: '5px', fontFamily: 'monospace', fontSize: '10px', color: '#344054', fontWeight: 600 }}>
          {v.sku}
        </code>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <span style={{ fontSize: '11px', color: '#344054', fontWeight: 600 }}>{v.barcode || '—'}</span>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Box size={14} color={v.stock > 10 ? '#12B76A' : '#F79009'} />
          <span style={{ fontSize: '10px', fontWeight: 600, color: v.stock <= 10 ? '#B54708' : '#101828' }}>
            {v.stock} pcs
          </span>
        </div>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#101828' }}>₹{v.price_adjustment ? Number(v.price_adjustment).toLocaleString('en-IN') : '0'}</span>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <div
            onClick={() => handleEditClick(v)}
            style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
            title="Edit Variant"
          >
            <Edit2 size={16} />
          </div>
          <div
            onClick={() => { setSelectedVariant(v); setFormMode('edit'); setShowForm(true); }}
            style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
            title="Delete Variant"
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
        title="Product Variants"
        count={filtered.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAdd={handleCreateClick}
        addLabel="Add Variant"
        columns={columns}
        data={paginated}
        loading={loading}
        renderRow={renderRow}
        selectedIds={selectedIds}
        onSelectIds={setSelectedIds}
        bulkActions={bulkActions}
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
          <div style={{ display: 'flex', gap: '13px' }}>
             <div style={{ fontSize: '11px', color: '#667085' }}>Variant attributes filters coming soon.</div>
          </div>
        }
      />

      <FormModal isOpen={showForm} onClose={() => setShowForm(false)} onSubmit={handleFormSubmit}
        onDelete={handleFormDelete} mode={formMode} title="Variant"
        fields=[
          { name: 'product', label: 'Product', type: 'select', options: products.map(p => ({ value: p.id, label: p.title })) },
          { name: 'sku', label: 'SKU Code', type: 'text' },
          { name: 'barcode', label: 'Barcode', type: 'text' },
          { name: 'color', label: 'Color', type: 'text' },
          { name: 'stock', label: 'Stock Quantity', type: 'number' },
          { name: 'price_adjustment', label: 'Price Adjustment (₹)', type: 'number' },
          { name: 'image', label: 'Variant Side Image', type: 'file' }
        ]}
        initialData={selectedVariant || {}} />
    </>
  );
};

export default VariantTable;
