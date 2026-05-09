import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Edit2, Trash2 } from 'lucide-react';
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

const VariantsRow = ({ product, colSpan }) => {
  const variants = product.variants || [];
  return (
    <tr style={{ backgroundColor: '#FAFAFF' }}>
      <td colSpan={colSpan} style={{ padding: '0 24px 16px 56px' }}>
        {variants.length === 0 ? (
          <p style={{ color: '#667085', fontSize: 13, margin: '12px 0' }}>No variants configured for this product.</p>
        ) : (
          <div style={{ border: '1px solid #E9D7FE', borderRadius: 8, overflow: 'hidden', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F4EBFF' }}>
                  {['SKU', 'Color', 'Size', 'Material', 'Stock', 'Price Adj.', 'Discount %'].map(h => (
                    <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6941C6', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {variants.map(v => (
                  <tr key={v.id} style={{ borderTop: '1px solid #E9D7FE', background: '#fff' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#344054', fontFamily: 'monospace', fontSize: 12 }}>{v.sku}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        {v.color_code && (
                          <span style={{ width: 14, height: 14, borderRadius: '50%', background: v.color_code, border: '1px solid #D0D5DD', flexShrink: 0 }} />
                        )}
                        <span style={{ color: '#344054' }}>{v.color || v.lens_color || v.frame_color || '—'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#667085' }}>{v.frame_size || '—'}</td>
                    <td style={{ padding: '10px 14px', color: '#667085' }}>{v.frame_material || '—'}</td>
                    <td style={{ padding: '10px 14px' }}><StockBadge qty={v.stock} threshold={5} /></td>
                    <td style={{ padding: '10px 14px', color: '#344054' }}>
                      {v.price_adjustment && parseFloat(v.price_adjustment) !== 0 ? `+${formatPrice(v.price_adjustment)}` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#344054' }}>
                      {v.discount_percent && parseFloat(v.discount_percent) > 0 ? `${parseFloat(v.discount_percent).toFixed(0)}%` : '0%'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </td>
    </tr>
  );
};

// ─── Lenses Tab ───────────────────────────────────────────────────────────────
const LensesTab = ({ onAdd, onEdit }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('-created_at');
  const [expandedRows, setExpandedRows] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    lens_type: [], min_price: '', max_price: '', stock_status: 'all', is_active: 'all',
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('product_type', 'lens');
      params.append('sort_by', sortBy);
      params.append('page', page);
      params.append('page_size', perPage);
      if (searchQuery) params.append('search', searchQuery);
      filters.lens_type.forEach(lt => params.append('lens_type', lt));
      if (filters.min_price) params.append('min_price', filters.min_price);
      if (filters.max_price) params.append('max_price', filters.max_price);
      if (filters.stock_status !== 'all') params.append('stock_status', filters.stock_status);
      if (filters.is_active !== 'all') params.append('is_active', filters.is_active);
      const res = await apiClient.get(`/catalog/products/?${params}`);
      const data = res.data;
      if (data.results) {
        setProducts(data.results);
        setTotal(data.count || data.results.length);
      } else {
        setProducts(Array.isArray(data) ? data : []);
        setTotal(Array.isArray(data) ? data.length : 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, sortBy, searchQuery, filters]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const toggleRow = (id) => setExpandedRows(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSort = (key) => {
    setSortBy(s => s === key ? `-${key}` : key);
    setPage(1);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiClient.delete(`/catalog/products/${deleteTarget.id}/`);
      setProducts(prev => prev.filter(p => p.id !== deleteTarget.id));
      setTotal(prev => prev - 1);
      setDeleteTarget(null);
    } catch { alert('Failed to delete product'); }
  };

  const toggleLensType = (lt) => {
    setFilters(f => ({ ...f, lens_type: f.lens_type.includes(lt) ? f.lens_type.filter(x => x !== lt) : [...f.lens_type, lt] }));
    setPage(1);
  };

  const TOTAL_COLS = 10; // checkbox col + 9 data cols

  const columns = [
    { label: 'Product Name', key: 'title', sortable: true, onSort: handleSort },
    { label: 'Lens Type', key: 'lens_type', sortable: true, onSort: handleSort },
    { label: 'Base Price', key: 'base_price', sortable: true, onSort: handleSort },
    { label: 'Selling Price', key: 'selling_price', sortable: true, onSort: handleSort },
    { label: 'Discount %', key: 'discount_percentage', sortable: true, onSort: handleSort },
    { label: 'Final Price', key: 'final_price', sortable: true, onSort: handleSort },
    { label: 'Stock', key: 'stock_quantity', sortable: true, onSort: handleSort },
    { label: 'Status', key: 'is_active', sortable: true, onSort: handleSort },
    { label: 'Actions', key: 'actions', align: 'right' },
  ];

  const renderRow = (p) => {
    const isExpanded = expandedRows.includes(p.id);
    const rowBg = isExpanded ? '#F9F5FF' : '#fff';
    return (
      <React.Fragment key={p.id}>
        <tr
          onClick={() => toggleRow(p.id)}
          style={{ borderBottom: '1px solid #EAECF0', backgroundColor: rowBg, cursor: 'pointer', transition: 'background 0.15s' }}
        >
          <td style={{ padding: '16px 24px', backgroundColor: rowBg }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: '#667085' }}>
                {isExpanded ? <ChevronDown size={14} strokeWidth={3} /> : <ChevronRight size={14} strokeWidth={3} />}
              </span>
              <input type="checkbox" onClick={e => e.stopPropagation()} style={{ cursor: 'pointer', accentColor: '#7F56D9' }} />
            </div>
          </td>
          <td style={{ padding: '16px 24px', fontWeight: 600, color: '#101828', backgroundColor: rowBg }}>
            <div>{p.title}</div>
            {p.sku && <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace', marginTop: 2 }}>{p.sku}</div>}
          </td>
          <td style={{ padding: '16px 24px', color: '#667085', backgroundColor: rowBg }}>{p.lens_type || '—'}</td>
          <td style={{ padding: '16px 24px', color: '#344054', backgroundColor: rowBg }}>{formatPrice(p.base_price)}</td>
          <td style={{ padding: '16px 24px', color: '#344054', backgroundColor: rowBg }}>{formatPrice(p.selling_price)}</td>
          <td style={{ padding: '16px 24px', color: '#344054', backgroundColor: rowBg }}>
            {p.discount_percentage && parseFloat(p.discount_percentage) > 0 ? `${parseFloat(p.discount_percentage).toFixed(0)}%` : '0%'}
          </td>
          <td style={{ padding: '16px 24px', fontWeight: 600, color: '#7F56D9', backgroundColor: rowBg }}>{formatPrice(p.final_price)}</td>
          <td style={{ padding: '16px 24px', backgroundColor: rowBg }}>
            <StockBadge
              qty={(p.variants || []).reduce((sum, v) => sum + (v.stock || 0), 0)}
              threshold={p.low_stock_threshold || 10}
            />
          </td>
          <td style={{ padding: '16px 24px', backgroundColor: rowBg }}><StatusBadge isActive={p.is_active} /></td>
          <td style={{ padding: '16px 24px', backgroundColor: rowBg }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <ActionBtn onClick={() => onEdit('lens', p.id)}><Edit2 size={16} /></ActionBtn>
              <ActionBtn danger onClick={() => setDeleteTarget(p)}><Trash2 size={16} /></ActionBtn>
            </div>
          </td>
        </tr>
        {isExpanded && <VariantsRow product={p} colSpan={TOTAL_COLS} />}
      </React.Fragment>
    );
  };

  const filterContent = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
      <div>
        <label style={{ display: 'block', textTransform: 'uppercase', fontSize: 10, fontWeight: 800, color: '#667085', marginBottom: 6, letterSpacing: '0.05em' }}>Lens Type</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {['Single Vision', 'Bifocal', 'Progressive'].map(lt => (
            <label key={lt} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: '#344054', fontWeight: 500 }}>
              <input type="checkbox" checked={filters.lens_type.includes(lt)} onChange={() => toggleLensType(lt)} style={{ accentColor: '#7F56D9' }} />
              {lt}
            </label>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div>
          <label style={{ display: 'block', textTransform: 'uppercase', fontSize: 10, fontWeight: 800, color: '#667085', marginBottom: 6, letterSpacing: '0.05em' }}>Min ₹</label>
          <input type="number" placeholder="0" value={filters.min_price}
            onChange={e => { setFilters(f => ({ ...f, min_price: e.target.value })); setPage(1); }}
            style={{ border: '1px solid #D0D5DD', borderRadius: 8, padding: '9px 12px', fontSize: 14, width: 90, outline: 'none' }} />
        </div>
        <div>
          <label style={{ display: 'block', textTransform: 'uppercase', fontSize: 10, fontWeight: 800, color: '#667085', marginBottom: 6, letterSpacing: '0.05em' }}>Max ₹</label>
          <input type="number" placeholder="Any" value={filters.max_price}
            onChange={e => { setFilters(f => ({ ...f, max_price: e.target.value })); setPage(1); }}
            style={{ border: '1px solid #D0D5DD', borderRadius: 8, padding: '9px 12px', fontSize: 14, width: 90, outline: 'none' }} />
        </div>
      </div>
      <div>
        <label style={{ display: 'block', textTransform: 'uppercase', fontSize: 10, fontWeight: 800, color: '#667085', marginBottom: 6, letterSpacing: '0.05em' }}>Stock</label>
        <select value={filters.stock_status} onChange={e => { setFilters(f => ({ ...f, stock_status: e.target.value })); setPage(1); }}
          style={{ border: '1px solid #D0D5DD', borderRadius: 8, padding: '9px 12px', fontSize: 14, background: '#fff', outline: 'none' }}>
          <option value="all">All</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
      </div>
      <div>
        <label style={{ display: 'block', textTransform: 'uppercase', fontSize: 10, fontWeight: 800, color: '#667085', marginBottom: 6, letterSpacing: '0.05em' }}>Status</label>
        <select value={filters.is_active} onChange={e => { setFilters(f => ({ ...f, is_active: e.target.value })); setPage(1); }}
          style={{ border: '1px solid #D0D5DD', borderRadius: 8, padding: '9px 12px', fontSize: 14, background: '#fff', outline: 'none' }}>
          <option value="all">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>
      <button
        onClick={() => { setFilters({ lens_type: [], min_price: '', max_price: '', stock_status: 'all', is_active: 'all' }); setPage(1); }}
        style={{ padding: '9px 16px', background: '#fff', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#344054', cursor: 'pointer' }}
      >Reset</button>
    </div>
  );

  return (
    <>
      <BaseAdminTable
        title="Lenses"
        subtitle={`${total} Products`}
        searchQuery={searchQuery}
        onSearchChange={(v) => { setSearchQuery(v); setPage(1); }}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        onAdd={onAdd}
        addLabel="+ Add Lens"
        filterContent={filterContent}
        columns={columns}
        data={products}
        loading={loading}
        renderRow={renderRow}
        pagination={{ page, perPage, totalCount: total, onPageChange: setPage, onPerPageChange: (pp) => { setPerPage(pp); setPage(1); } }}
        emptyMessage="No lenses found"
        emptyDescription="Add your first lens product to get started."
      />
      <DeleteModal target={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />
    </>
  );
};

// ─── Frames Tab ───────────────────────────────────────────────────────────────
const FramesTab = ({ onAdd, onEdit }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('-created_at');
  const [expandedRows, setExpandedRows] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    frame_style: [], frame_material: [], min_price: '', max_price: '', stock_status: 'all', is_active: 'all', brand_name: '',
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('product_type', 'frame');
      params.append('sort_by', sortBy);
      params.append('page', page);
      params.append('page_size', perPage);
      if (searchQuery) params.append('search', searchQuery);
      if (filters.brand_name) params.append('brand_name', filters.brand_name);
      filters.frame_style.forEach(fs => params.append('frame_style', fs));
      filters.frame_material.forEach(fm => params.append('frame_material', fm));
      if (filters.min_price) params.append('min_price', filters.min_price);
      if (filters.max_price) params.append('max_price', filters.max_price);
      if (filters.stock_status !== 'all') params.append('stock_status', filters.stock_status);
      if (filters.is_active !== 'all') params.append('is_active', filters.is_active);
      const res = await apiClient.get(`/catalog/products/?${params}`);
      const data = res.data;
      if (data.results) {
        setProducts(data.results);
        setTotal(data.count || data.results.length);
      } else {
        setProducts(Array.isArray(data) ? data : []);
        setTotal(Array.isArray(data) ? data.length : 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, sortBy, searchQuery, filters]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const toggleRow = (id) => setExpandedRows(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSort = (key) => {
    setSortBy(s => s === key ? `-${key}` : key);
    setPage(1);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiClient.delete(`/catalog/products/${deleteTarget.id}/`);
      setProducts(prev => prev.filter(p => p.id !== deleteTarget.id));
      setTotal(prev => prev - 1);
      setDeleteTarget(null);
    } catch { alert('Failed to delete product'); }
  };

  const toggleMulti = (key, val) => {
    setFilters(f => ({ ...f, [key]: f[key].includes(val) ? f[key].filter(x => x !== val) : [...f[key], val] }));
    setPage(1);
  };

  const TOTAL_COLS = 12; // checkbox col + 11 data cols

  const columns = [
    { label: 'Product Name', key: 'title', sortable: true, onSort: handleSort },
    { label: 'Brand', key: 'brand_name', sortable: true, onSort: handleSort },
    { label: 'Style', key: 'frame_type', sortable: true, onSort: handleSort },
    { label: 'Material', key: 'frame_material', sortable: true, onSort: handleSort },
    { label: 'Base Price', key: 'base_price', sortable: true, onSort: handleSort },
    { label: 'Selling Price', key: 'selling_price', sortable: true, onSort: handleSort },
    { label: 'Disc %', key: 'discount_percentage', sortable: true, onSort: handleSort },
    { label: 'Final Price', key: 'final_price', sortable: true, onSort: handleSort },
    { label: 'Stock', key: 'stock_quantity', sortable: true, onSort: handleSort },
    { label: 'Status', key: 'is_active', sortable: true, onSort: handleSort },
    { label: 'Actions', key: 'actions', align: 'right' },
  ];

  const renderRow = (p) => {
    const isExpanded = expandedRows.includes(p.id);
    const rowBg = isExpanded ? '#F9F5FF' : '#fff';
    // frame_style is not saved by form — fall back to frame_type (what the form actually saves)
    const styleVal = p.frame_type || p.frame_style || '—';
    // frame_material not saved at product level by form — fall back to first variant
    const materialVal = p.frame_material || p.variants?.[0]?.frame_material || '—';
    const brandVal = p.brand_display_name || p.brand_name || '—';
    return (
      <React.Fragment key={p.id}>
        <tr
          onClick={() => toggleRow(p.id)}
          style={{ borderBottom: '1px solid #EAECF0', backgroundColor: rowBg, cursor: 'pointer', transition: 'background 0.15s' }}
        >
          <td style={{ padding: '16px 24px', backgroundColor: rowBg }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: '#667085' }}>
                {isExpanded ? <ChevronDown size={14} strokeWidth={3} /> : <ChevronRight size={14} strokeWidth={3} />}
              </span>
              <input type="checkbox" onClick={e => e.stopPropagation()} style={{ cursor: 'pointer', accentColor: '#7F56D9' }} />
            </div>
          </td>
          <td style={{ padding: '16px 24px', fontWeight: 600, color: '#101828', backgroundColor: rowBg }}>
            <div>{p.title}</div>
            {p.sku && <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace', marginTop: 2 }}>{p.sku}</div>}
          </td>
          <td style={{ padding: '16px 24px', color: '#667085', backgroundColor: rowBg }}>{brandVal}</td>
          <td style={{ padding: '16px 24px', color: '#667085', backgroundColor: rowBg }}>{styleVal}</td>
          <td style={{ padding: '16px 24px', color: '#667085', backgroundColor: rowBg }}>{materialVal}</td>
          <td style={{ padding: '16px 24px', color: '#344054', backgroundColor: rowBg }}>{formatPrice(p.base_price)}</td>
          <td style={{ padding: '16px 24px', color: '#344054', backgroundColor: rowBg }}>{formatPrice(p.selling_price)}</td>
          <td style={{ padding: '16px 24px', color: '#344054', backgroundColor: rowBg }}>
            {p.discount_percentage && parseFloat(p.discount_percentage) > 0 ? `${parseFloat(p.discount_percentage).toFixed(0)}%` : '0%'}
          </td>
          <td style={{ padding: '16px 24px', fontWeight: 600, color: '#7F56D9', backgroundColor: rowBg }}>{formatPrice(p.final_price)}</td>
          <td style={{ padding: '16px 24px', backgroundColor: rowBg }}>
            <StockBadge
              qty={(p.variants || []).reduce((sum, v) => sum + (v.stock || 0), 0)}
              threshold={p.low_stock_threshold || 10}
            />
          </td>
          <td style={{ padding: '16px 24px', backgroundColor: rowBg }}><StatusBadge isActive={p.is_active} /></td>
          <td style={{ padding: '16px 24px', backgroundColor: rowBg }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <ActionBtn onClick={() => onEdit('frame', p.id)}><Edit2 size={16} /></ActionBtn>
              <ActionBtn danger onClick={() => setDeleteTarget(p)}><Trash2 size={16} /></ActionBtn>
            </div>
          </td>
        </tr>
        {isExpanded && <VariantsRow product={p} colSpan={TOTAL_COLS} />}
      </React.Fragment>
    );
  };

  const filterContent = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
      <div>
        <label style={{ display: 'block', textTransform: 'uppercase', fontSize: 10, fontWeight: 800, color: '#667085', marginBottom: 6, letterSpacing: '0.05em' }}>Brand</label>
        <input placeholder="e.g. Ray-Ban" value={filters.brand_name}
          onChange={e => { setFilters(f => ({ ...f, brand_name: e.target.value })); setPage(1); }}
          style={{ border: '1px solid #D0D5DD', borderRadius: 8, padding: '9px 12px', fontSize: 14, width: 140, outline: 'none' }} />
      </div>
      <div>
        <label style={{ display: 'block', textTransform: 'uppercase', fontSize: 10, fontWeight: 800, color: '#667085', marginBottom: 6, letterSpacing: '0.05em' }}>Frame Style</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Full Rim', 'Half Rim', 'Rimless', 'Cat Eye', 'Other'].map(fs => (
            <label key={fs} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: '#344054', fontWeight: 500 }}>
              <input type="checkbox" checked={filters.frame_style.includes(fs)} onChange={() => toggleMulti('frame_style', fs)} style={{ accentColor: '#7F56D9' }} />{fs}
            </label>
          ))}
        </div>
      </div>
      <div>
        <label style={{ display: 'block', textTransform: 'uppercase', fontSize: 10, fontWeight: 800, color: '#667085', marginBottom: 6, letterSpacing: '0.05em' }}>Material</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Acetate', 'Metal', 'Titanium', 'Plastic', 'Mixed'].map(fm => (
            <label key={fm} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: '#344054', fontWeight: 500 }}>
              <input type="checkbox" checked={filters.frame_material.includes(fm)} onChange={() => toggleMulti('frame_material', fm)} style={{ accentColor: '#7F56D9' }} />{fm}
            </label>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div>
          <label style={{ display: 'block', textTransform: 'uppercase', fontSize: 10, fontWeight: 800, color: '#667085', marginBottom: 6, letterSpacing: '0.05em' }}>Min ₹</label>
          <input type="number" placeholder="0" value={filters.min_price}
            onChange={e => { setFilters(f => ({ ...f, min_price: e.target.value })); setPage(1); }}
            style={{ border: '1px solid #D0D5DD', borderRadius: 8, padding: '9px 12px', fontSize: 14, width: 90, outline: 'none' }} />
        </div>
        <div>
          <label style={{ display: 'block', textTransform: 'uppercase', fontSize: 10, fontWeight: 800, color: '#667085', marginBottom: 6, letterSpacing: '0.05em' }}>Max ₹</label>
          <input type="number" placeholder="Any" value={filters.max_price}
            onChange={e => { setFilters(f => ({ ...f, max_price: e.target.value })); setPage(1); }}
            style={{ border: '1px solid #D0D5DD', borderRadius: 8, padding: '9px 12px', fontSize: 14, width: 90, outline: 'none' }} />
        </div>
      </div>
      <div>
        <label style={{ display: 'block', textTransform: 'uppercase', fontSize: 10, fontWeight: 800, color: '#667085', marginBottom: 6, letterSpacing: '0.05em' }}>Stock</label>
        <select value={filters.stock_status} onChange={e => { setFilters(f => ({ ...f, stock_status: e.target.value })); setPage(1); }}
          style={{ border: '1px solid #D0D5DD', borderRadius: 8, padding: '9px 12px', fontSize: 14, background: '#fff', outline: 'none' }}>
          <option value="all">All</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
      </div>
      <div>
        <label style={{ display: 'block', textTransform: 'uppercase', fontSize: 10, fontWeight: 800, color: '#667085', marginBottom: 6, letterSpacing: '0.05em' }}>Status</label>
        <select value={filters.is_active} onChange={e => { setFilters(f => ({ ...f, is_active: e.target.value })); setPage(1); }}
          style={{ border: '1px solid #D0D5DD', borderRadius: 8, padding: '9px 12px', fontSize: 14, background: '#fff', outline: 'none' }}>
          <option value="all">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>
      <button
        onClick={() => { setFilters({ frame_style: [], frame_material: [], min_price: '', max_price: '', stock_status: 'all', is_active: 'all', brand_name: '' }); setPage(1); }}
        style={{ padding: '9px 16px', background: '#fff', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#344054', cursor: 'pointer' }}
      >Reset</button>
    </div>
  );

  return (
    <>
      <BaseAdminTable
        title="Frames"
        subtitle={`${total} Products`}
        searchQuery={searchQuery}
        onSearchChange={(v) => { setSearchQuery(v); setPage(1); }}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        onAdd={onAdd}
        addLabel="+ Add Frame"
        filterContent={filterContent}
        columns={columns}
        data={products}
        loading={loading}
        renderRow={renderRow}
        pagination={{ page, perPage, totalCount: total, onPageChange: setPage, onPerPageChange: (pp) => { setPerPage(pp); setPage(1); } }}
        emptyMessage="No frames found"
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
