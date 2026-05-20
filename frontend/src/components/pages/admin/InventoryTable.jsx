import React, { useState, useEffect } from 'react';
import { Package, Archive, CheckCircle, AlertTriangle, XCircle, Trash2, ChevronDown, Edit } from 'lucide-react';
import apiClient from '../../../services/api';
import FormModal from './FormModal';
import BaseAdminTable from './BaseAdminTable';

const STATUS_OPTS = [
  { key: 'all', label: 'All Status'   },
  { key: 'in',  label: 'In Stock'     },
  { key: 'low', label: 'Low Stock'    },
  { key: 'out', label: 'Out of Stock' },
];

const InventoryTable = ({ initialFilter = 'all' }) => {
  const [variants, setVariants]               = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [searchQuery, setSearchQuery]         = useState('');
  const [stockFilter, setStockFilter]         = useState(initialFilter);
  const [showForm, setShowForm]               = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [page, setPage]                       = useState(1);
  const [perPage, setPerPage]                 = useState(10);
  const [selectedIds, setSelectedIds]         = useState(new Set());

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await apiClient.get('/catalog/variants/?page_size=1000&admin=true');
      setVariants(Array.isArray(res.data) ? res.data : (res.data.results || []));
    } catch { } finally { setLoading(false); }
  };

  const handleEditClick  = (v) => { setSelectedVariant(v); setShowForm(true); };
  const handleFormSubmit = async (fd) => {
    try {
      await apiClient.patch(`/catalog/variants/${selectedVariant.id}/`, { stock: fd.stock });
      setShowForm(false);
      fetchInventory();
    } catch (err) { console.error(err); }
  };

  const handleToggleListed = async (v) => {
    const newVal = !v.is_listed;
    setVariants(prev => prev.map(x => x.id === v.id ? { ...x, is_listed: newVal } : x));
    try {
      await apiClient.patch(`/catalog/variants/${v.id}/`, { is_listed: newVal });
    } catch (err) {
      // Roll back on failure
      setVariants(prev => prev.map(x => x.id === v.id ? { ...x, is_listed: v.is_listed } : x));
    }
  };

  const bulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} variant(s)?`)) return;
    await Promise.all([...selectedIds].map(id => apiClient.delete(`/catalog/variants/${id}/`).catch(() => {})));
    setSelectedIds(new Set());
    fetchInventory();
  };

  // ── KPI ──
  const totalSKUs       = variants.length;
  const inStockCount    = variants.filter(v => v.stock > 0).length;
  const lowStockCount   = variants.filter(v => v.stock > 0 && v.stock <= 20).length;
  const outOfStockCount = variants.filter(v => v.stock <= 0).length;

  const statCards = [
    { label: 'Total SKUs',   value: totalSKUs.toLocaleString(),                     Icon: Archive,       trend: null   },
    { label: 'In stock',     value: `${inStockCount.toLocaleString()} variants`,    Icon: CheckCircle,   trend: 'up'   },
    { label: 'Low stock',    value: `${lowStockCount.toLocaleString()} variants`,   Icon: AlertTriangle, trend: 'down' },
    { label: 'Out of stock', value: `${outOfStockCount.toLocaleString()} variants`, Icon: XCircle,       trend: 'down' },
  ];

  // ── Filter + search ──
  const byStock = variants.filter(v => {
    if (stockFilter === 'in')  return v.stock > 0;
    if (stockFilter === 'low') return v.stock > 0 && v.stock <= 20;
    if (stockFilter === 'out') return v.stock <= 0;
    return true;
  });

  const filtered = byStock.filter(v =>
    [v.product_name, v.sku, v.color].some(val => val?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  // ── Helpers ──
  const getStockDot = (stock) => {
    if (stock <= 0)  return '#D92D20';
    if (stock <= 20) return '#F79009';
    return '#34C759';
  };

  const getImage = (v) => v.images?.[0]?.image || null;

  // ── Columns ──
  const columns = [
    { label: 'Product',        key: 'product' },
    { label: 'SKU Code',       key: 'sku'     },
    { label: 'Variant',        key: 'color'   },
    { label: 'Current Stock',  key: 'stock',  sortable: true },
    { label: 'Threshold',      key: 'threshold' },
    { label: 'Last Restocked', key: 'last_restocked' },
    { label: 'Last Sold',      key: 'last_sold' },
    { label: 'Listed',         key: 'is_listed' },
    { label: 'Action',         key: 'action'  },
  ];

  const CELL = { padding: '0 13px', height: 51, verticalAlign: 'middle' };
  const TXT  = { fontSize: 13, color: '#040205', fontWeight: 400 };

  const renderRow = (v) => {
    const imgSrc    = getImage(v);
    const dot       = getStockDot(v.stock ?? 0);
    const threshold = v.low_stock_threshold ?? 20;
    const isSelected = selectedIds.has(v.id);
    return (
      <tr key={v.id} style={{ borderBottom: '1px solid #e0e0e0', background: isSelected ? '#F9F5FF' : '#fff' }}>

        {/* Checkbox — handled by BaseAdminTable via isSelected/onToggle but we wire it manually */}
        <td style={{ ...CELL, width: 35 }}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {
              setSelectedIds(prev => {
                const next = new Set(prev);
                next.has(v.id) ? next.delete(v.id) : next.add(v.id);
                return next;
              });
            }}
            style={{ accentColor: '#7F56D9', cursor: 'pointer' }}
          />
        </td>

        {/* Product */}
        <td style={{ ...CELL, minWidth: 176 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 3, border: '1px solid #e0e0e0', overflow: 'hidden', flexShrink: 0, background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {imgSrc ? <img src={imgSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={14} color="#D0D5DD" />}
            </div>
            <div>
              <div style={{ ...TXT, fontWeight: 500 }}>{v.product_name || '—'}</div>
              <div style={{ fontSize: 11, color: '#697177', marginTop: 2 }}>Brand: {v.brand_name || '—'}</div>
            </div>
          </div>
        </td>

        {/* SKU */}
        <td style={{ ...CELL, minWidth: 112 }}>
          <span style={{ ...TXT, fontFamily: 'monospace' }}>{v.sku || '—'}</span>
        </td>

        {/* Variant */}
        <td style={{ ...CELL, minWidth: 104 }}>
          <span style={{ ...TXT }}>{v.color || 'Standard'}</span>
        </td>

        {/* Current Stock */}
        <td style={{ ...CELL, minWidth: 96 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 16, height: 16, borderRadius: '50%', background: dot, flexShrink: 0, display: 'inline-block' }} />
            <span style={{ ...TXT }}>{v.stock ?? 0}</span>
          </div>
        </td>

        {/* Threshold */}
        <td style={{ ...CELL, minWidth: 80 }}>
          <span style={{ ...TXT }}>{threshold}</span>
        </td>

        {/* Last Restocked */}
        <td style={{ ...CELL, minWidth: 112 }}>
          <span style={{ ...TXT }}>
            {v.last_restocked ? new Date(v.last_restocked).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
          </span>
        </td>

        {/* Last Sold */}
        <td style={{ ...CELL, minWidth: 96 }}>
          <span style={{ ...TXT }}>
            {v.last_sold ? new Date(v.last_sold).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
          </span>
        </td>

        {/* Listed toggle */}
        <td style={{ ...CELL, minWidth: 80 }}>
          <div
            onClick={() => handleToggleListed(v)}
            style={{
              width: 36, height: 20, borderRadius: 10, position: 'relative', cursor: 'pointer',
              background: v.is_listed ? '#7F56D9' : '#D0D5DD',
              transition: 'background 0.2s',
              flexShrink: 0,
              display: 'inline-block',
            }}
          >
            <span style={{
              position: 'absolute', top: 2, left: v.is_listed ? 18 : 2,
              width: 16, height: 16, borderRadius: '50%', background: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              transition: 'left 0.2s',
            }} />
          </div>
        </td>

        {/* Action */}
        <td style={{ ...CELL, minWidth: 100 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => handleEditClick(v)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '6px 12px',
                border: '1px solid #D0D5DD',
                borderRadius: 6,
                background: '#ffffff',
                fontSize: 13,
                fontWeight: 500,
                color: '#344054',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F9FAFB';
                e.currentTarget.style.borderColor = '#C7CCD0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = '#D0D5DD';
              }}
            >
              <Edit size={14} color="#475467" />
              Edit
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const statusLabel = STATUS_OPTS.find(o => o.key === stockFilter)?.label || 'Stock Status';

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Title */}
      <h1 style={{ fontSize: 19, fontWeight: 700, color: '#040205', marginBottom: 16 }}>
        Inventory Management
      </h1>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 19, marginBottom: 22 }}>
        {statCards.map(({ label, value, Icon, trend }, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ width: 32, height: 32, background: '#F9F5FF', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={16} color="#7F56D9" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#697177' }}>{label}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#040205', lineHeight: '22px' }}>{value}</span>
                {trend && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: trend === 'up' ? '#147f27' : '#931334', display: 'flex', alignItems: 'center', gap: 3 }}>
                    {trend === 'up' ? '↗' : '↘'} vs last period
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table — reuse BaseAdminTable for header, table, pagination */}
      <BaseAdminTable
        title="Inventory"
        searchQuery={searchQuery}
        onSearchChange={(q) => { setSearchQuery(q); setPage(1); }}
        columns={columns}
        data={paginated}
        loading={loading}
        renderRow={renderRow}
        selectedIds={selectedIds}
        onSelectIds={setSelectedIds}
        bulkActions={[{ label: 'Delete Selected', variant: 'danger', icon: Trash2, onClick: bulkDelete }]}
        pagination={{
          page,
          perPage,
          totalCount: filtered.length,
          onPageChange: setPage,
          onPerPageChange: (n) => { setPerPage(n); setPage(1); },
        }}
        showFilters
        filterContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#344054' }}>Stock Status:</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {STATUS_OPTS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => { setStockFilter(opt.key); setPage(1); }}
                  style={{
                    padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    border: stockFilter === opt.key ? '1px solid #7F56D9' : '1px solid #D0D5DD',
                    background: stockFilter === opt.key ? '#F4EBFF' : '#fff',
                    color: stockFilter === opt.key ? '#7F56D9' : '#344054',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        }
        emptyMessage="No inventory found"
        emptyDescription="Variants will appear here once products are added."
      />

      <FormModal
        isOpen={showForm} onClose={() => setShowForm(false)} onSubmit={handleFormSubmit}
        mode="edit" title="Adjust Stock"
        fields={[
          { name: 'product_name', label: 'Product Name',   type: 'text',   readOnly: true },
          { name: 'sku',          label: 'SKU Code',        type: 'text',   readOnly: true },
          { name: 'stock',        label: 'Stock Quantity',  type: 'number', required: true, min: 0 },
        ]}
        initialData={selectedVariant || {}}
      />
    </div>
  );
};

export default InventoryTable;
