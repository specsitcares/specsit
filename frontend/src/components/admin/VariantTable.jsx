import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Edit, Trash2, Grid, MoreHorizontal, ChevronLeft, ChevronRight, Hash, Box } from 'lucide-react';
import apiClient from '../../services/api';
import FormModal from './FormModal';

const VariantTable = () => {
  const [variants, setVariants]   = useState([]);
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [formMode, setFormMode]   = useState('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage]           = useState(1);
  const PER_PAGE = 10;

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [varRes, prodRes] = await Promise.all([
        apiClient.get('/catalog/variants/'),
        apiClient.get('/catalog/products/')
      ]);
      setVariants(Array.isArray(varRes.data) ? varRes.data : (varRes.data.results || []));
      setProducts(Array.isArray(prodRes.data) ? prodRes.data : (prodRes.data.results || []));
    } catch { /* silent */ } finally { setLoading(false); }
  };

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
    fetchData();
  };

  const handleFormDelete = async (id) => {
    await apiClient.delete(`/catalog/variants/${id}/`);
    fetchData();
  };

  const filtered = variants.filter(v =>
    [v.product_name, v.sku, v.color, v.size].some(val => val?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (loading) return <div className="db-loading-state">Loading product variants…</div>;

  return (
    <div className="admin-table-wrapper">
      <div className="table-toolbar">
        <div>
          <div className="table-title">Product Variants</div>
          <div className="table-subtitle">{filtered.length} active SKUs</div>
        </div>
        <div className="table-actions">
           <div className="table-search-box">
             <Search size={14} />
             <input type="text" placeholder="Search variants…" value={searchQuery}
               onChange={e => { setSearchQuery(e.target.value); setPage(1); }} />
           </div>
           <button className="btn btn-primary" onClick={handleCreateClick}><Plus size={14} /> Add Variant</button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}><input type="checkbox" /></th>
              <th>Product</th>
              <th>Attributes</th>
              <th>SKU Code</th>
              <th>Inventory</th>
              <th>Price Adj.</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(v => (
              <tr key={v.id}>
                <td><input type="checkbox" /></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--gray-25)', border: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {v.image ? <img src={v.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Grid size={16} color="var(--gray-300)" />}
                    </div>
                    <div className="cell-text-primary" style={{ fontSize: '13px' }}>{v.product_name || 'N/A'}</div>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {v.size && <span className="badge badge-neutral" style={{ padding: '1px 6px', fontSize: '10px' }}>{v.size}</span>}
                    {v.color && (
                       <span className="badge badge-outline" style={{ 
                         padding: '1px 6px', fontSize: '10px', background: 'white', 
                         border: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', gap: '4px' 
                       }}>
                         <div style={{ width: 8, height: 8, borderRadius: '50%', background: v.color.toLowerCase(), border: '1px solid var(--gray-100)' }} />
                         {v.color}
                       </span>
                    )}
                  </div>
                </td>
                <td><code>{v.sku}</code></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Box size={14} color={v.stock > 10 ? 'var(--success-500)' : 'var(--warning-500)'} />
                    <span className={`cell-text-primary ${v.stock <= 10 ? 'badge-warning' : ''}`} style={{ fontSize: '13px', background: 'none' }}>
                      {v.stock} pcs
                    </span>
                  </div>
                </td>
                <td><span className="cell-text-primary">₹{v.price_adjustment ? Number(v.price_adjustment).toLocaleString('en-IN') : '0'}</span></td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                    <button className="row-action-btn edit" onClick={() => handleEditClick(v)}><Edit size={14}/></button>
                    <button className="row-action-btn delete" onClick={() => { setSelectedVariant(v); setFormMode('edit'); setShowForm(true); }}><Trash2 size={14}/></button>
                    <button className="row-action-btn"><MoreHorizontal size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-pagination">
        <div className="pagination-info">Page {page} of {totalPages || 1}</div>
        <div className="pagination-controls">
          <button className="page-btn" disabled={page===1} onClick={() => setPage(p=>p-1)}><ChevronLeft size={14}/></button>
          <button className="page-btn active">{page}</button>
          <button className="page-btn" disabled={page>=totalPages||totalPages===0} onClick={() => setPage(p=>p+1)}><ChevronRight size={14}/></button>
        </div>
      </div>

      <FormModal isOpen={showForm} onClose={() => setShowForm(false)} onSubmit={handleFormSubmit}
        onDelete={handleFormDelete} mode={formMode} title="Variant"
        fields={[
          { name: 'product', label: 'Product', type: 'select', options: products.map(p => ({ value: p.id, label: p.title })), required: true },
          { name: 'sku', label: 'SKU Code', type: 'text', required: true },
          { name: 'color', label: 'Color', type: 'text', required: true },
          { name: 'size', label: 'Size (e.g. 52mm)', type: 'text' },
          { name: 'stock', label: 'Stock Quantity', type: 'number', required: true },
          { name: 'price_adjustment', label: 'Price Adjustment (₹)', type: 'number' },
          { name: 'image', label: 'Variant Side Image', type: 'file' }
        ]}
        initialData={selectedVariant || {}} />
    </div>
  );
};

export default VariantTable;
