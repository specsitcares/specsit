import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Edit, Trash2, Package, Plus, MoreVertical, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
import apiClient from '../../../services/api';
import ProductDetailsForm from './ProductDetailsForm';
import BaseAdminTable from './BaseAdminTable';

const ProductTable = () => {
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showMultiStepForm, setShowMultiStepForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage]           = useState(1);
  const [perPage, setPerPage]     = useState(10);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { 
    if (!showMultiStepForm) {
      fetchData();
    }
  }, [showMultiStepForm]);

  const fetchData = async () => {
    try {
      const res = await apiClient.get('/catalog/products/?admin=true');
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
        const res = await apiClient.delete(`/catalog/products/${id}/`);
        // 200 = soft-deleted (has order history), 204 = hard-deleted
        if (res.data?.detail) {
          alert(res.data.detail);
        }
        fetchData();
      } catch (err) {
        const status = err.response?.status;
        const detail = err.response?.data?.detail || err.message || 'Unknown error';
        console.error('Delete failed', status, detail, err);
        alert(`Failed to delete product: ${status ? `(${status}) ` : ''}${detail}`);
      }
    }
  };

  const filtered = products.filter(p =>
    [p.title, p.category_name, p.brand_name, String(p.id)]
      .some(v => v?.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  if (showMultiStepForm) {
    return (
      <ProductDetailsForm 
        onBack={() => setShowMultiStepForm(false)} 
        editProduct={selectedProduct}
      />
    );
  }

  const columns = [
    { label: 'Product Details', key: 'details', sortable: true },
    { label: 'Primary Category', key: 'category', sortable: true },
    { label: 'Brand / Manufacturer', key: 'brand', sortable: true },
    { label: 'Base Value', key: 'price', sortable: true },
    { label: 'Live Status', key: 'status', sortable: true },
    { label: 'discount', key: 'percentage', sortable: true},
    { label: 'Action', key: 'action', align: 'right' },
    { label: 'Gender', key: 'gender'}
  ];

  const renderRow = (p, idx) => (
    <tr key={p.id || idx} style={{ borderBottom: '1px solid #EAECF0', backgroundColor: '#fff' }}>
      <td style={{ padding: '16px 24px' }}>
        <input type="checkbox" style={{ cursor: 'pointer', borderRadius: '3px', accentColor: '#7F56D9' }} />
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 10, background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #EAECF0', overflow: 'hidden' }}>
            {p.main_image
              ? <img src={p.main_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <Package size={24} color="#D0D5DD" />}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#101828', fontSize: '11px' }}>{p.title}</div>
            <div style={{ fontSize: '10px', color: '#667085' }}>SKU: PRD-{p.id} {p.is_featured && <span style={{ color: '#FDB022' }}>★</span>}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <span style={{ backgroundColor: '#F2F4F7', color: '#344054', padding: '4px 10px', borderRadius: '13px', fontSize: '10px', fontWeight: 600 }}>
          {p.category_name || 'Sunglasses'}
        </span>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <span style={{ fontWeight: 600, color: '#475467', fontSize: '11px' }}>{p.brand_name || 'Ray-Ban'}</span>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ color: '#7F56D9', fontWeight: 700, fontSize: '11px' }}>₹{Number(p.base_price || 0).toLocaleString('en-IN')}</div>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
           <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.is_active ? '#12B76A' : '#D0D5DD' }}></div>
           <span style={{ fontSize: '11px', fontWeight: 600, color: p.is_active ? '#027A48' : '#344054' }}>
             {p.is_active ? 'Published' : 'Draft'}
           </span>
        </div>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <span style={{ fontWeight: 600, color: '#475467', fontSize: '11px' }}>{p.discount_percentage || 0}%</span>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <div
            onClick={() => handleEditClick(p)}
            style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
            title="Edit Specifications"
          >
            <Edit2 size={16} />
          </div>
          <div
            onClick={() => handleDeleteClick(p.id)}
            style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
            title="Delete Product"
          >
            <Trash2 size={16} />
          </div>
        </div>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <span style={{ fontWeight: 600, color: '#475467', fontSize: '11px' }}>{p.gender || 'Unisex'}</span>
      </td>
    </tr>
  );

  return (
    <BaseAdminTable
      title="Product Catalog"
      count={filtered.length}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onAdd={handleCreateClick}
      addLabel="Add New Product"
      columns={columns}
      data={paginated}
      loading={loading}
      discount={discount_percentage}
      gender={gender}
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
        <div style={{ display: 'flex', gap: '13px' }}>
           <div style={{ fontSize: '11px', color: '#667085' }}>No active filters available for catalog.</div>
        </div>
      }
    />
  );
};

export default ProductTable;
