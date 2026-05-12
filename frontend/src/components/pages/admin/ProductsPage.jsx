import React, { useState, useEffect, useCallback } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import apiClient from '../../../services/api';
import BaseAdminTable from './BaseAdminTable';

const formatPrice = (v) => v != null ? `₹${parseFloat(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—';

const StatusBadge = ({ isActive }) => (
  <span style={{
    backgroundColor: isActive ? '#ECFDF3' : '#FEF3F2',
    color: isActive ? '#027A48' : '#B42318',
    padding: '4px 10px',
    borderRadius: '13px',
    fontSize: '10px',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    border: `1px solid ${isActive ? '#ABEFC6' : '#FECDCA'}`,
  }}>
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#12B76A' : '#D92D20' }} />
    {isActive ? 'Active' : 'Inactive'}
  </span>
);

const StockBadge = ({ qty, threshold = 10 }) => {
  if (qty <= 0) return <span style={{ backgroundColor: '#FEF3F2', color: '#B42318', padding: '4px 10px', borderRadius: '13px', fontSize: '10px', fontWeight: 600, border: '1px solid #FECDCA' }}>Out of Stock</span>;
  if (qty <= threshold) return <span style={{ backgroundColor: '#FFFAEB', color: '#B54708', padding: '4px 10px', borderRadius: '13px', fontSize: '10px', fontWeight: 600, border: '1px solid #FEDF89' }}>Low ({qty})</span>;
  return <span style={{ backgroundColor: '#ECFDF3', color: '#027A48', padding: '4px 10px', borderRadius: '13px', fontSize: '10px', fontWeight: 600, border: '1px solid #ABEFC6' }}>{qty}</span>;
};

const ActionBtn = ({ onClick, danger, children }) => (
  <div
    onClick={onClick}
    style={{
      width: 32, height: 32,
      border: `1px solid ${danger ? '#FECDCA' : '#D0D5DD'}`,
      borderRadius: '6px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer',
      background: danger ? '#FEF3F2' : '#fff',
      color: danger ? '#B42318' : '#667085',
      boxShadow: '0 1px 2px rgba(16,24,40,0.05)',
    }}
  >
    {children}
  </div>
);

const DeleteModal = ({ target, onCancel, onConfirm }) => {
  if (!target) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 360, textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
        <h3 style={{ margin: '0 0 8px', color: '#111827', fontSize: 16, fontWeight: 700 }}>Delete Product?</h3>
        <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 20px' }}>
          Delete <strong>{target.title}</strong>? This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={onCancel} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #D0D5DD', cursor: 'pointer', background: '#fff', fontWeight: 600, color: '#344054' }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#D92D20', color: '#fff', fontWeight: 600 }}>Delete</button>
        </div>
      </div>
    </div>
  );
};


// ─── Shared variant-as-product row renderer ───────────────────────────────────
const VariantRow = ({ v, onEdit, onDelete, productType }) => {
  const imgUrl = v.images?.[0]?.image || null;
  const color = v.color || v.frame_color || v.lens_color || '—';
  const price = v.selling_price || v.base_price || v.sale_price || v.price || '—';
  return (
    <tr style={{ borderBottom: '1px solid #EAECF0', backgroundColor: '#fff' }}>
      <td style={{ padding: '14px 24px' }}>
        <input type="checkbox" onClick={e => e.stopPropagation()} style={{ cursor: 'pointer', accentColor: '#7F56D9' }} />
      </td>
      {/* Image + name */}
      <td style={{ padding: '14px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 6, overflow: 'hidden', background: '#F9FAFB', border: '1px solid #EAECF0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {imgUrl ? <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: 18, color: '#D0D5DD' }}>👓</span>}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#101828', fontSize: 13 }}>{v.product_name || '—'}</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace', marginTop: 2 }}>{v.sku || '—'}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: '14px 24px', color: '#667085', fontSize: 13 }}>{v.brand_name || '—'}</td>
      <td style={{ padding: '14px 24px', fontSize: 13 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {v.color_code && <span style={{ width: 12, height: 12, borderRadius: '50%', background: v.color_code, border: '1px solid #D0D5DD', flexShrink: 0 }} />}
          <span style={{ color: '#344054' }}>{color}</span>
        </div>
      </td>
      {productType === 'frame' && (
        <>
          <td style={{ padding: '14px 24px', color: '#667085', fontSize: 13 }}>{v.frame_size || '—'}</td>
          <td style={{ padding: '14px 24px', color: '#667085', fontSize: 13 }}>{v.frame_material || '—'}</td>
        </>
      )}
      <td style={{ padding: '14px 24px', fontSize: 13 }}><StockBadge qty={v.stock ?? 0} threshold={5} /></td>
      <td style={{ padding: '14px 24px', color: '#344054', fontWeight: 600, fontSize: 13 }}>{price !== '—' ? formatPrice(price) : '—'}</td>
      <td style={{ padding: '14px 24px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <ActionBtn onClick={() => onEdit(productType, v.product)}><Edit2 size={16} /></ActionBtn>
          <ActionBtn danger onClick={() => onDelete(v)}><Trash2 size={16} /></ActionBtn>
        </div>
      </td>
    </tr>
  );
};

// ─── Shared variants fetch hook ───────────────────────────────────────────────
const useVariantsTab = (productType) => {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ product_type: productType, page, page_size: perPage });
      if (searchQuery) params.append('search', searchQuery);
      const res = await apiClient.get(`/catalog/variants/?${params}`);
      const data = res.data;
      const results = data.results ?? (Array.isArray(data) ? data : []);
      setVariants(results);
      setTotal(data.count ?? results.length);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [productType, page, perPage, searchQuery]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { setPage(1); }, [searchQuery]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiClient.delete(`/catalog/variants/${deleteTarget.id}/`);
      setVariants(prev => prev.filter(v => v.id !== deleteTarget.id));
      setTotal(prev => prev - 1);
      setDeleteTarget(null);
    } catch { alert('Failed to delete variant'); }
  };

  return { variants, loading, total, page, setPage, perPage, setPerPage, searchQuery, setSearchQuery, deleteTarget, setDeleteTarget, confirmDelete };
};

// ─── Lenses Tab ───────────────────────────────────────────────────────────────
const LensesTab = ({ onAdd, onEdit }) => {
  const { variants, loading, total, page, setPage, perPage, setPerPage, searchQuery, setSearchQuery, deleteTarget, setDeleteTarget, confirmDelete } = useVariantsTab('lens');

  const columns = [
    { label: 'Product / SKU', key: 'name' },
    { label: 'Brand', key: 'brand' },
    { label: 'Color', key: 'color' },
    { label: 'Stock', key: 'stock' },
    { label: 'Price', key: 'price' },
    { label: 'Actions', key: 'actions', align: 'right' },
  ];

  return (
    <>
      <BaseAdminTable
        title="Lenses"
        subtitle={`${total} Variants`}
        searchQuery={searchQuery}
        onSearchChange={(v) => setSearchQuery(v)}
        onAdd={onAdd}
        addLabel="+ Add Lens"
        columns={columns}
        data={variants}
        loading={loading}
        renderRow={(v) => (
          <VariantRow key={v.id} v={v} productType="lens" onEdit={onEdit} onDelete={setDeleteTarget} />
        )}
        pagination={{ page, perPage, totalCount: total, onPageChange: setPage, onPerPageChange: (pp) => { setPerPage(pp); setPage(1); } }}
        emptyMessage="No lens variants found"
        emptyDescription="Add your first lens product to get started."
      />
      <DeleteModal target={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />
    </>
  );
};

// ─── Frames Tab ───────────────────────────────────────────────────────────────
const FramesTab = ({ onAdd, onEdit }) => {
  const { variants, loading, total, page, setPage, perPage, setPerPage, searchQuery, setSearchQuery, deleteTarget, setDeleteTarget, confirmDelete } = useVariantsTab('frame');

  const columns = [
    { label: 'Product / SKU', key: 'name' },
    { label: 'Brand', key: 'brand' },
    { label: 'Color', key: 'color' },
    { label: 'Size', key: 'size' },
    { label: 'Material', key: 'material' },
    { label: 'Stock', key: 'stock' },
    { label: 'Price', key: 'price' },
    { label: 'Actions', key: 'actions', align: 'right' },
  ];

  return (
    <>
      <BaseAdminTable
        title="Frames"
        subtitle={`${total} Variants`}
        searchQuery={searchQuery}
        onSearchChange={(v) => setSearchQuery(v)}
        onAdd={onAdd}
        addLabel="+ Add Frame"
        columns={columns}
        data={variants}
        loading={loading}
        renderRow={(v) => (
          <VariantRow key={v.id} v={v} productType="frame" onEdit={onEdit} onDelete={setDeleteTarget} />
        )}
        pagination={{ page, perPage, totalCount: total, onPageChange: setPage, onPerPageChange: (pp) => { setPerPage(pp); setPage(1); } }}
        emptyMessage="No frame variants found"
        emptyDescription="Add your first frame product to get started."
      />
      <DeleteModal target={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />
    </>
  );
};

// ─── Main Products Page ───────────────────────────────────────────────────────
const ProductsPage = ({ onAddNew, onEdit }) => {
  const [activeTab, setActiveTab] = useState('lenses');

  const tabStyle = (tab) => ({
    padding: '8px 20px',
    color: activeTab === tab ? '#7F56D9' : '#667085',
    fontWeight: activeTab === tab ? 700 : 500,
    cursor: 'pointer',
    fontSize: 14,
    background: activeTab === tab ? '#fff' : 'transparent',
    border: 'none',
    borderRadius: '5px',
    boxShadow: activeTab === tab ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
  });

  return (
    <div>
      {/* Pill-style tab switcher */}
      <div style={{ display: 'flex', background: '#F9FAFB', border: '1px solid #EAECF0', borderRadius: 8, padding: 2, width: 'fit-content', marginBottom: 20 }}>
        <button style={tabStyle('lenses')} onClick={() => setActiveTab('lenses')}>Lenses</button>
        <button style={tabStyle('frames')} onClick={() => setActiveTab('frames')}>Frames</button>
      </div>

      {activeTab === 'lenses' ? (
        <LensesTab onAdd={() => onAddNew('lens')} onEdit={onEdit} />
      ) : (
        <FramesTab onAdd={() => onAddNew('frame')} onEdit={onEdit} />
      )}
    </div>
  );
};

export default ProductsPage;
