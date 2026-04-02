import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Edit, Trash2, Package, Plus, MoreHorizontal, ChevronLeft, ChevronRight, X } from 'lucide-react';
import apiClient from '../../services/api';
import ProductDetailsForm from './ProductDetailsForm';

const ProductTable = () => {
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showMultiStepForm, setShowMultiStepForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage]           = useState(1);
  const PER_PAGE = 10;

  useEffect(() => { 
    if (!showMultiStepForm) {
      fetchData(); 
    }
  }, [showMultiStepForm]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/catalog/products/');
      setProducts(Array.isArray(res.data) ? res.data : (res.data.results || []));
    } catch (err) { 
      console.error('Fetch error', err); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleCreateClick = () => {
    setSelectedProduct(null);
    setShowMultiStepForm(true);
  };

  const handleEditClick = async (p) => {
    setLoading(true);
    try {
      // Fetch full product details including variants for editing
      const res = await apiClient.get(`/catalog/products/${p.id}/`);
      setSelectedProduct(res.data);
      setShowMultiStepForm(true);
    } catch (err) {
      console.error('Failed to fetch product details', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = async (id) => {
    if (window.confirm('Are you sure you want to delete this product? This will remove all variants and images.')) {
      try {
        await apiClient.delete(`/catalog/products/${id}/`);
        fetchData();
      } catch (err) {
        console.error('Delete failed', err);
      }
    }
  };

  const filtered = products.filter(p =>
    [p.title, p.category_name, p.brand_name, String(p.id)]
      .some(v => v?.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // If showing the multi-step form, render it instead of the table list
  if (showMultiStepForm) {
    return (
      <ProductDetailsForm 
        onBack={() => setShowMultiStepForm(false)} 
        editProduct={selectedProduct}
      />
    );
  }

  if (loading) return <div className="db-loading-state">Syncing catalog data...</div>;

  return (
    <div className="admin-table-wrapper" style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="table-toolbar">
        <div>
          <div className="table-title">Product Catalog</div>
          <div className="table-subtitle">{filtered.length} products total in your inventory</div>
        </div>
        <div className="table-actions">
          <div className="table-search-box">
            <Search size={14} />
            <input 
              type="text" 
              placeholder="Search by ID, name or brand…" 
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }} 
            />
          </div>
          <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={14} /> Refine
          </button>
          <button className="btn btn-primary" onClick={handleCreateClick} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} strokeWidth={3} /> Add New Product
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}><input type="checkbox" /></th>
              <th>Product Details</th>
              <th>Primary Category</th>
              <th>Brand / Manufacturer</th>
              <th>Base Value</th>
              <th>Live Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={7}>
                <div className="empty-state" style={{ padding: '64px 0' }}>
                  <div className="empty-state-icon" style={{ background: '#F9FAFB', border: '1px solid #EAECF0' }}><Package size={32} color="#D0D5DD" /></div>
                  <div className="empty-state-title" style={{ marginTop: '16px' }}>No products found</div>
                  <div className="empty-state-desc">Try adjusting your search or add a new eyewear model.</div>
                </div>
              </td></tr>
            ) : paginated.map(p => (
              <tr key={p.id} className="row-hover-effect">
                <td><input type="checkbox" /></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="table-img-placeholder" style={{ width: 48, height: 48, borderRadius: 10, background: '#F2F4F7', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #EAECF0' }}>
                      {p.main_image
                        ? <img src={p.main_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        : <Package size={20} color="#98A2B3" />}
                    </div>
                    <div>
                      <div className="cell-text-primary" style={{ fontWeight: 700 }}>{p.title}</div>
                      <div className="cell-text-secondary" style={{ fontSize: '12px' }}>SKU: PRD-{p.id} {p.is_featured && <span style={{ color: '#FDB022' }}>★</span>}</div>
                    </div>
                  </div>
                </td>
                <td><span className="badge badge-neutral" style={{ background: '#F2F4F7', color: '#344054', border: 'none' }}>{p.category_name || 'Sunglasses'}</span></td>
                <td><span className="cell-text-secondary" style={{ fontWeight: 600, color: '#475467' }}>{p.brand_name || 'Ray-Ban'}</span></td>
                <td><div className="cell-text-primary" style={{ color: '#7F56D9', fontWeight: 700 }}>₹{Number(p.base_price || 0).toLocaleString('en-IN')}</div></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.is_active ? '#12B76A' : '#D0D5DD' }}></div>
                     <span style={{ fontSize: '14px', fontWeight: 600, color: p.is_active ? '#027A48' : '#344054' }}>
                       {p.is_active ? 'Published' : 'Draft'}
                     </span>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button className="row-action-btn edit" onClick={() => handleEditClick(p)} title="Edit Specification"><Edit size={16} /></button>
                    <button className="row-action-btn delete" onClick={() => handleDeleteClick(p.id)} title="Delete Product"><Trash2 size={16} /></button>
                    <button className="row-action-btn" title="More Options"><MoreHorizontal size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-pagination">
        <div className="pagination-info">Page {page} of {totalPages || 1} • {filtered.length} Results</div>
        <div className="pagination-controls">
          <button className="page-btn" disabled={page===1} onClick={() => setPage(p=>p-1)}><ChevronLeft size={16}/></button>
          {[...Array(totalPages)].map((_, i) => (
             <button 
               key={i+1} 
               className={`page-btn ${page === i+1 ? 'active' : ''}`}
               onClick={() => setPage(i+1)}
             >
               {i+1}
             </button>
          )).slice(0, 5)}
          <button className="page-btn" disabled={page>=totalPages||totalPages===0} onClick={() => setPage(p=>p+1)}><ChevronRight size={16}/></button>
        </div>
      </div>
    </div>
  );
};

export default ProductTable;
