import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Edit, Trash2, Package, Plus, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import apiClient from '../../services/api';
import FormModal from './FormModal';

const ProductTable = ({ onAddProduct, onEditProduct }) => {
  const [products, setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formMode, setFormMode]   = useState('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage]           = useState(1);
  const PER_PAGE = 10;

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, brandRes] = await Promise.all([
        apiClient.get('/catalog/products/'),
        apiClient.get('/catalog/categories/'),
        apiClient.get('/catalog/brands/')
      ]);
      setProducts(Array.isArray(prodRes.data) ? prodRes.data : (prodRes.data.results || []));
      setCategories(Array.isArray(catRes.data) ? catRes.data : (catRes.data.results || []));
      setBrands(Array.isArray(brandRes.data) ? brandRes.data : (brandRes.data.results || []));
    } catch (err) { console.error('Fetch error', err); }
    finally { setLoading(false); }
  };

  const fetchProducts = async () => {
    const res = await apiClient.get('/catalog/products/');
    setProducts(Array.isArray(res.data) ? res.data : (res.data.results || []));
  };

  const productFormFields = [
    { name: 'title',       label: 'Product Name',    type: 'text',     required: true },
    { name: 'description', label: 'Description',     type: 'textarea', rows: 3 },
    { name: 'category',    label: 'Category',        type: 'select',   options: categories.map(c => ({ value: c.id, label: c.name })), required: true },
    { name: 'brand',       label: 'Brand',           type: 'select',   options: brands.map(b => ({ value: b.id, label: b.name })), required: true },
    { name: 'base_price',  label: 'Base Price (₹)',  type: 'number',   required: true, min: 0, step: 100 },
    { name: 'gender',      label: 'Gender',          type: 'select',   options: [{ value: 'Men', label: 'Men' }, { value: 'Women', label: 'Women' }, { value: 'Unisex', label: 'Unisex' }] },
    { name: 'glass_type',  label: 'Glass Type',      type: 'select',   options: [{ value: 'Eyeglasses', label: 'Eyeglasses' }, { value: 'Sunglasses', label: 'Sunglasses' }, { value: 'Reading Glasses', label: 'Reading Glasses' }] },
    { name: 'main_image',  label: 'Main Image',      type: 'file',     accept: 'image/*' },
    { name: 'is_featured', label: 'Featured',        type: 'checkbox' },
    { name: 'is_active',   label: 'Active',          type: 'checkbox', defaultValue: true },
  ];

  const handleCreateClick = () => { if (onAddProduct) { onAddProduct(); } else { setFormMode('create'); setSelectedProduct(null); setShowForm(true); } };
  const handleEditClick   = (p) => { if (onEditProduct) { onEditProduct(p); } else { setFormMode('edit'); setSelectedProduct(p); setShowForm(true); } };
  const handleDeleteClick = (p) => { setFormMode('edit'); setSelectedProduct(p); setShowForm(true); };

  const handleFormSubmit = async (formData) => {
    const data = new FormData();
    Object.keys(formData).forEach(k => {
      if (formData[k] != null) {
        if (k === 'main_image' && typeof formData[k] === 'string') return;
        data.append(k, formData[k]);
      }
    });
    if (formMode === 'create') await apiClient.post('/catalog/products/', data);
    else await apiClient.patch(`/catalog/products/${selectedProduct.id}/`, data);
    fetchProducts();
  };

  const handleFormDelete = async (id) => {
    await apiClient.delete(`/catalog/products/${id}/`);
    fetchProducts();
  };

  const filtered   = products.filter(p =>
    [p.title, p.category_name, p.brand_name, String(p.id)]
      .some(v => v?.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (loading) return <div className="db-loading-state">Loading catalog…</div>;

  return (
    <div className="admin-table-wrapper">
      <div className="table-toolbar">
        <div>
          <div className="table-title">Product Catalog</div>
          <div className="table-subtitle">{filtered.length} products</div>
        </div>
        <div className="table-actions">
          <div className="table-search-box">
            <Search size={14} />
            <input type="text" placeholder="Search products…" value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }} />
          </div>
          <button className="btn btn-outline"><Filter size={14} /> Filter</button>
          <button className="btn btn-outline"><Download size={14} /> Export</button>
          <button className="btn btn-primary" onClick={handleCreateClick}><Plus size={14} /> Add Product</button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}><input type="checkbox" /></th>
              <th>Product</th>
              <th>Category</th>
              <th>Brand</th>
              <th>Price</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={7}>
                <div className="empty-state">
                  <div className="empty-state-icon"><Package size={22} /></div>
                  <div className="empty-state-title">No products found</div>
                  <div className="empty-state-desc">Add your first product to get started.</div>
                </div>
              </td></tr>
            ) : paginated.map(p => (
              <tr key={p.id}>
                <td><input type="checkbox" /></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                      {p.main_image
                        ? <img src={p.main_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        : <Package size={18} color="var(--brand-700)" />}
                    </div>
                    <div>
                      <div className="cell-text-primary">{p.title}</div>
                      <div className="cell-text-secondary">#{p.id} {p.is_featured && '⭐'}</div>
                    </div>
                  </div>
                </td>
                <td><span className="cell-text-secondary">{p.category_name || '—'}</span></td>
                <td><span className="cell-text-secondary">{p.brand_name || '—'}</span></td>
                <td><div className="cell-text-primary">₹{Number(p.base_price || 0).toLocaleString('en-IN')}</div></td>
                <td>
                  <span className={`badge ${p.is_active ? 'badge-success' : 'badge-neutral'}`}>
                    <span className="badge-dot" />{p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                    <button className="row-action-btn edit" onClick={() => handleEditClick(p)}><Edit size={14} /></button>
                    <button className="row-action-btn delete" onClick={() => handleDeleteClick(p)}><Trash2 size={14} /></button>
                    <button className="row-action-btn"><MoreHorizontal size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-pagination">
        <div className="pagination-info">Showing {paginated.length ? (page-1)*PER_PAGE+1 : 0}–{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length}</div>
        <div className="pagination-controls">
          <button className="page-btn" disabled={page===1} onClick={() => setPage(p=>p-1)}><ChevronLeft size={14}/></button>
          {Array.from({length: Math.min(totalPages,5)},(_,i)=>i+1).map(n=>(
            <button key={n} className={`page-btn ${page===n?'active':''}`} onClick={()=>setPage(n)}>{n}</button>
          ))}
          <button className="page-btn" disabled={page>=totalPages||totalPages===0} onClick={()=>setPage(p=>p+1)}><ChevronRight size={14}/></button>
        </div>
      </div>

      <FormModal isOpen={showForm} onClose={() => setShowForm(false)} onSubmit={handleFormSubmit}
        onDelete={handleFormDelete} mode={formMode} title="Product" fields={productFormFields} initialData={selectedProduct || {}} />
    </div>
  );
};

export default ProductTable;
