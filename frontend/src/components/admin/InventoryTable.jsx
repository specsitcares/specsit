import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, Edit, AlertTriangle, Package, MoreHorizontal, ChevronLeft, ChevronRight, Box } from 'lucide-react';
import apiClient from '../../services/api';
import FormModal from './FormModal';

const InventoryTable = () => {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [page, setPage]             = useState(1);
  const PER_PAGE = 10;

  useEffect(() => { fetchInventory(); }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/catalog/variants/');
      setVariants(Array.isArray(res.data) ? res.data : (res.data.results || []));
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const handleEditClick = (v) => { setSelectedVariant(v); setShowForm(true); };

  const handleFormSubmit = async (formData) => {
    await apiClient.patch(`/catalog/variants/${selectedVariant.id}/`, { stock: formData.stock });
    fetchInventory();
  };

  const filtered = variants.filter(v =>
    [v.product_name, v.sku, v.color].some(val => val?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (loading) return <div className="db-loading-state">Syncing inventory warehouse…</div>;

  return (
    <div className="admin-table-wrapper">
      <div className="table-toolbar">
        <div>
          <div className="table-title">Inventory Control</div>
          <div className="table-subtitle">{filtered.length} unique stock items</div>
        </div>
        <div className="table-actions">
           <div className="table-search-box">
             <Search size={14} />
             <input type="text" placeholder="Search SKU or Product…" value={searchQuery}
               onChange={e => { setSearchQuery(e.target.value); setPage(1); }} />
           </div>
           <button className="btn btn-outline" onClick={fetchInventory}><RefreshCw size={14} /> Sync</button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}><input type="checkbox" /></th>
              <th>Product Variant</th>
              <th>SKU Reference</th>
              <th>Current Stock</th>
              <th>Health Status</th>
              <th>Availability</th>
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
                      {v.image ? <img src={v.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Package size={16} color="var(--gray-300)" />}
                    </div>
                    <div>
                      <div className="cell-text-primary" style={{ fontSize: '13px' }}>{v.product_name || 'N/A'}</div>
                      <div className="cell-text-secondary">{v.color || 'Standard'}</div>
                    </div>
                  </div>
                </td>
                <td><code style={{ fontSize: '12px' }}>{v.sku}</code></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="cell-text-primary" style={{ fontWeight: 700, fontSize: '14px' }}>{v.stock}</span>
                    <Box size={14} color={v.stock > 10 ? 'var(--gray-300)' : 'var(--warning-500)'} />
                  </div>
                </td>
                <td>
                  {v.stock <= 5 ? (
                    <span className="badge badge-error">
                      <AlertTriangle size={10} style={{ marginRight: 4 }} /> Critical Low
                    </span>
                  ) : v.stock <= 20 ? (
                    <span className="badge badge-warning">Low Stock</span>
                  ) : (
                    <span className="badge badge-success">Healthy</span>
                  )}
                </td>
                <td>
                   <span className={`badge ${v.stock > 0 ? 'badge-info' : 'badge-neutral'}`}>
                     {v.stock > 0 ? 'Active' : 'Unlisted'}
                   </span>
                </td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                    <button className="row-action-btn edit" onClick={() => handleEditClick(v)} title="Adjust Stock"><Edit size={14}/></button>
                    <button className="row-action-btn"><MoreHorizontal size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-pagination">
        <div className="pagination-info">Showing {paginated.length} items</div>
        <div className="pagination-controls">
          <button className="page-btn" disabled={page===1} onClick={() => setPage(p=>p-1)}><ChevronLeft size={14}/></button>
          <button className="page-btn active">{page}</button>
          <button className="page-btn" disabled={page>=totalPages||totalPages===0} onClick={() => setPage(p=>p+1)}><ChevronRight size={14}/></button>
        </div>
      </div>

      <FormModal isOpen={showForm} onClose={() => setShowForm(false)} onSubmit={handleFormSubmit}
        mode="edit" title="Adjust Stock"
        fields={[
          { name: 'product_name', label: 'Product Name', type: 'text', readOnly: true },
          { name: 'sku', label: 'SKU Code', type: 'text', readOnly: true },
          { name: 'stock', label: 'Manual Stock Correction', type: 'number', required: true, min: 0 }
        ]}
        initialData={selectedVariant || {}} />
    </div>
  );
};

export default InventoryTable;
