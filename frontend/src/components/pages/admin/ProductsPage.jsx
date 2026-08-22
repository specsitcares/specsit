import React, { useState, useEffect, useCallback } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import apiClient from '../../../services/api';
import BaseAdminTable from './BaseAdminTable';
import ContactLensManagement from './ContactLensManagement';

const formatPrice = (v) => v != null ? `₹${parseFloat(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—';

const StatusBadge = ({ isActive }) => (
  <span style={{
    backgroundColor: isActive ? '#ECFDF3' : '#FEF3F2',
    color: isActive ? '#027A48' : '#B42318',
    padding: '3px 8px',
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
  if (qty <= 0) return <span style={{ backgroundColor: '#FEF3F2', color: '#B42318', padding: '3px 8px', borderRadius: '13px', fontSize: '10px', fontWeight: 600, border: '1px solid #FECDCA' }}>Out of Stock</span>;
  if (qty <= threshold) return <span style={{ backgroundColor: '#FFFAEB', color: '#B54708', padding: '3px 8px', borderRadius: '13px', fontSize: '10px', fontWeight: 600, border: '1px solid #FEDF89' }}>Low ({qty})</span>;
  return <span style={{ backgroundColor: '#ECFDF3', color: '#027A48', padding: '3px 8px', borderRadius: '13px', fontSize: '10px', fontWeight: 600, border: '1px solid #ABEFC6' }}>{qty}</span>;
};

const ActionBtn = ({ onClick, danger, children }) => (
  <div
    onClick={onClick}
    style={{
      width: 28, height: 28,
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
  // This modal is only ever used for variant-row deletes (a "product" row in this
  // table is really one variant) — target has no .title, only product_name/color/sku.
  const name = target.product_name || target.title || 'this item';
  const color = target.color || target.frame_color || target.lens_color;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 360, textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
        <h3 style={{ margin: '0 0 8px', color: '#111827', fontSize: 16, fontWeight: 700 }}>Delete Variant?</h3>
        <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 20px' }}>
          Delete <strong>{name}</strong>{color ? <> — <strong>{color}</strong></> : null}{target.sku ? ` (SKU: ${target.sku})` : ''}? This cannot be undone.
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
  const discount = v.discount_percentage || 0;
  const gender = v.gender || '—';
  return (
    <tr style={{ borderBottom: '1px solid #EAECF0', backgroundColor: '#fff' }}>
      <td style={{ padding: '10px 16px' }}>
        <input type="checkbox" onClick={e => e.stopPropagation()} style={{ cursor: 'pointer', accentColor: '#7F56D9' }} />
      </td>
      {/* Image + name */}
      <td style={{ padding: '10px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 6, overflow: 'hidden', background: '#F9FAFB', border: '1px solid #EAECF0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {imgUrl ? <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: 15, color: '#D0D5DD' }}>👓</span>}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#101828', fontSize: 12 }}>{v.product_name || '—'}</div>
            <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'monospace', marginTop: 1 }}>{v.sku || '—'}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: '10px 16px', color: '#667085', fontSize: 11 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {v.brand_logo ? (
            <img
              src={v.brand_logo}
              alt={v.brand_name || 'Brand'}
              style={{ width: 18, height: 18, objectFit: 'contain', flexShrink: 0 }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : null}
          <span>{v.brand_name || '—'}</span>
        </div>
      </td>
      <td style={{ padding: '10px 16px', color: '#667085', fontSize: 11 }}>{v.category_name || '—'}</td>
      <td style={{ padding: '10px 16px', fontSize: 11 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {v.color_selection_method === 'palette' && v.palette_image ? (
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundImage: `url(${v.palette_image})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid #D0D5DD', flexShrink: 0 }} />
          ) : v.color_code ? (
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: v.color_code, border: '1px solid #D0D5DD', flexShrink: 0 }} />
          ) : null}
          <span style={{ color: '#344054' }}>{color}</span>
        </div>
      </td>
      {(productType === 'frame' || productType === 'eyeglasses' || productType === 'sunglasses') && (
        <>
          <td style={{ padding: '10px 16px', color: '#667085', fontSize: 11 }}>{v.barcode || '—'}</td>
          <td style={{ padding: '10px 16px', color: '#667085', fontSize: 11 }}>{v.frame_material || '—'}</td>
        </>
      )}
      <td style={{ padding: '10px 16px', fontSize: 11 }}><StockBadge qty={v.stock ?? 0} threshold={v.low_stock_threshold ?? 10} /></td>
      <td style={{ padding: '10px 16px', color: '#344054', fontWeight: 600, fontSize: 11 }}>{price !== '—' ? formatPrice(price) : '—'}</td>
      <td style={{ padding: '10px 16px', color: '#667085', fontSize: 11 }}>{discount}%</td>
      {productType !== 'accessory' && (
        <td style={{ padding: '10px 16px', color: '#667085', fontSize: 11 }}>{gender}</td>
      )}
      <td style={{ padding: '10px 16px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <ActionBtn onClick={() => onEdit(productType, v.product)}><Edit2 size={14} /></ActionBtn>
          <ActionBtn danger onClick={() => onDelete(v)}><Trash2 size={14} /></ActionBtn>
        </div>
      </td>
    </tr>
  );
};

// ─── Shared variants fetch hook ───────────────────────────────────────────────
const useVariantsTab = ({ productType, category }) => {
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
      const params = new URLSearchParams({ page, page_size: perPage });
      if (productType) params.append('product_type', productType);
      if (category) params.append('category', category);
      if (searchQuery) params.append('search', searchQuery);
      const res = await apiClient.get(`/catalog/variants/?${params}`);
      const data = res.data;
      const results = data.results ?? (Array.isArray(data) ? data : []);
      setVariants(results);
      setTotal(data.count ?? results.length);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [productType, category, page, perPage, searchQuery]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { setPage(1); }, [searchQuery]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      // Block deleting a product's last remaining variant from the list view —
      // mirrors the guard already in the product form's own "Remove Variant"
      // button, which never lets a product drop to zero variants.
      if (deleteTarget.product) {
        try {
          const prodRes = await apiClient.get(`/catalog/products/${deleteTarget.product}/`, { cache: false });
          const variantCount = (prodRes.data?.variants || []).length;
          if (variantCount <= 1) {
            alert('This is the only variant left on this product. Delete the whole product instead, or add another variant first.');
            setDeleteTarget(null);
            return;
          }
        } catch { /* if the check itself fails, fall through to the delete attempt below */ }
      }
      await apiClient.delete(`/catalog/variants/${deleteTarget.id}/`);
      setDeleteTarget(null);
      fetch(); // Re-fetch to sync counts and data
    } catch { alert('Failed to delete variant'); }
  };

  return { variants, loading, total, page, setPage, perPage, setPerPage, searchQuery, setSearchQuery, deleteTarget, setDeleteTarget, confirmDelete };
};

// ─── Lenses Tab ───────────────────────────────────────────────────────────────
const LensesTab = ({ onAdd, onEdit }) => {
  const { variants, loading, total, page, setPage, perPage, setPerPage, searchQuery, setSearchQuery, deleteTarget, setDeleteTarget, confirmDelete } = useVariantsTab({ productType: 'lens' });

  const columns = [
    { label: 'Product / SKU', key: 'name' },
    { label: 'Brand', key: 'brand' },
    { label: 'Category', key: 'category' },
    { label: 'Color', key: 'color' },
    { label: 'Stock', key: 'stock' },
    { label: 'Price', key: 'price' },
    { label: 'Discount %', key: 'discount' },
    { label: 'Gender', key: 'gender' },
    { label: 'Actions', key: 'actions', align: 'right' },
  ];

  return (
    <>
      <BaseAdminTable
        title="Contact Lenses"
        count={total}
        countLabel="Variants"
        searchQuery={searchQuery}
        onSearchChange={(v) => setSearchQuery(v)}
        onAdd={onAdd}
        addLabel="+ Add Contact Lens"
        columns={columns}
        data={variants}
        loading={loading}
        renderRow={(v) => (
          <VariantRow key={v.id} v={v} productType="lens" onEdit={onEdit} onDelete={setDeleteTarget} />
        )}
        pagination={{ page, perPage, totalCount: total, onPageChange: setPage, onPerPageChange: (pp) => { setPerPage(pp); setPage(1); } }}
        emptyMessage="No contact lens variants found"
        emptyDescription="Add your first contact lens product to get started."
      />
      <DeleteModal target={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />
    </>
  );
};

// ─── Category Tab ─────────────────────────────────────────────────────────────
const CategoryTab = ({ title, categoryName, onAdd, onEdit, productType = 'frame' }) => {
  const { variants, loading, total, page, setPage, perPage, setPerPage, searchQuery, setSearchQuery, deleteTarget, setDeleteTarget, confirmDelete } = useVariantsTab({ productType, category: categoryName });

  const columns = [
    { label: 'Product / SKU', key: 'name' },
    { label: 'Brand', key: 'brand' },
    { label: 'Category', key: 'category' },
    { label: 'Color', key: 'color' },
    ...(productType === 'frame' || productType === 'eyeglasses' || productType === 'sunglasses' ? [
      { label: 'Barcode', key: 'barcode' },
      { label: 'Material', key: 'material' },
    ] : []),
    { label: 'Stock', key: 'stock' },
    { label: 'Price', key: 'price' },
    { label: 'Discount %', key: 'discount' },
    ...(productType === 'accessory' ? [] : [{ label: 'Gender', key: 'gender' }]),
    { label: 'Actions', key: 'actions', align: 'right' },
  ];

  return (
    <>
      <BaseAdminTable
        title={title}
        count={total}
        countLabel="Variants"
        searchQuery={searchQuery}
        onSearchChange={(v) => setSearchQuery(v)}
        onAdd={onAdd}
        addLabel={`+ Add ${title}`}
        columns={columns}
        data={variants}
        loading={loading}
        renderRow={(v) => (
          <VariantRow key={v.id} v={v} productType={productType} onEdit={onEdit} onDelete={setDeleteTarget} />
        )}
        pagination={{ page, perPage, totalCount: total, onPageChange: setPage, onPerPageChange: (pp) => { setPerPage(pp); setPage(1); } }}
        emptyMessage={`No ${title.toLowerCase()} variants found`}
        emptyDescription={`Add your first ${title.toLowerCase()} product to get started.`}
      />
      <DeleteModal target={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />
    </>
  );
};

// ─── Main Products Page ───────────────────────────────────────────────────────
const ProductsPage = ({ onAddNew, onEdit }) => {
  const [groupsData, setGroupsData] = useState([]);
  const [activeGroup, setActiveGroup] = useState('frame');
  const [activeCategory, setActiveCategory] = useState(null);

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

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await apiClient.get('/catalog/categories/groups/');
        setGroupsData(res.data || []);
        if (res.data && res.data.length) {
          const grp = res.data.find(g => g.key === activeGroup) || res.data[0];
          setActiveGroup(grp.key);
          setActiveCategory((grp.categories && grp.categories[0] && grp.categories[0].name) || null);
        }
      } catch (e) { console.error(e); }
    };
    fetchGroups();
  }, []);

  useEffect(() => {
    // when activeGroup changes ensure activeCategory exists
    const grp = groupsData.find(g => g.key === activeGroup);
    if (grp) setActiveCategory((grp.categories && grp.categories[0] && grp.categories[0].name) || null);
  }, [activeGroup, groupsData]);

  return (
    <div>
      {/* Group tabs */}
      <div style={{ display: 'flex', background: '#F9FAFB', border: '1px solid #EAECF0', borderRadius: 8, padding: 4, gap: 8, marginBottom: 12 }}>
        {groupsData.map(g => (
          <button key={g.key} onClick={() => setActiveGroup(g.key)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: activeGroup === g.key ? '#fff' : 'transparent', cursor: 'pointer', color: activeGroup === g.key ? '#7F56D9' : '#667085' }}>{g.label}</button>
        ))}
      </div>

      {/* Category tabs for selected group */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(groupsData.find(g => g.key === activeGroup)?.categories || []).map(cat => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.name)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #E6E6E6', background: activeCategory === cat.name ? '#fff' : 'transparent', cursor: 'pointer' }}>{cat.name}</button>
        ))}
      </div>

      {/* Content for the selected category/group */}
      {activeGroup === 'lens' ? (
        <ContactLensManagement />
      ) : activeGroup === 'accessory' ? (
        <CategoryTab
          title={activeCategory || 'Accessories'}
          categoryName={activeCategory}
          productType="accessory"
          onAdd={() => onAddNew(`accessory?category=${encodeURIComponent(activeCategory || '')}`)}
          onEdit={onEdit}
        />
      ) : (
        <CategoryTab
          title={activeCategory || 'Category'}
          categoryName={activeCategory}
          onAdd={() => onAddNew(`frame?category=${encodeURIComponent(activeCategory || '')}`)}
          onEdit={onEdit}
        />
      )}
    </div>
  );
};

export default ProductsPage;
