import React, { useState, useEffect } from 'react';
import { Package, Archive, CheckCircle, AlertTriangle, XCircle, Trash2, ChevronDown, ChevronRight, Edit } from 'lucide-react';
import apiClient from '../../../services/api';
import FormModal from './FormModal';
import BaseAdminTable from './BaseAdminTable';

const STATUS_OPTS = [
  { key: 'all', label: 'All Status' },
  { key: 'in', label: 'In Stock' },
  { key: 'low', label: 'Low Stock' },
  { key: 'out', label: 'Out of Stock' },
];

const InventoryTable = ({ initialFilter = 'all' }) => {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupsData, setGroupsData] = useState([]);
  const [activeGroup, setActiveGroup] = useState('frame');
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState(initialFilter);
  const [showForm, setShowForm] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [expandedRows, setExpandedRows] = useState([]);

  const toggleRow = (id) => {
    setExpandedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  useEffect(() => {
    fetchGroups();
    fetchInventory();
  }, []);

  useEffect(() => {
    // whenever category changes, re-fetch inventory for that category
    fetchInventory();
  }, [activeCategory]);

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

  const fetchInventory = async () => {
    try {
      let url = '/catalog/variants/?page_size=1000&admin=true';
      if (activeCategory) url += `&category=${encodeURIComponent(activeCategory)}`;
      const res = await apiClient.get(url);
      setVariants(Array.isArray(res.data) ? res.data : (res.data.results || []));
    } catch { } finally { setLoading(false); }
  };

  const handleEditClick = (v, sizeName = null) => {
    if (sizeName) {
      const rawVal = v.stock_by_size[sizeName];
      let actualQty = 0;
      let isListed = true;
      if (typeof rawVal === 'string' && rawVal.startsWith('U:')) {
          isListed = false;
          actualQty = parseInt(rawVal.replace('U:', ''), 10) || 0;
      } else {
          isListed = true;
          actualQty = parseInt(rawVal, 10) || 0;
      }
      setSelectedVariant({
        ...v,
        stock: actualQty,
        _sizeName: sizeName,
        _isListed: isListed
      });
    } else {
      setSelectedVariant(v);
    }
    setShowForm(true);
  };
  const handleFormSubmit = async (fd) => {
    try {
      if (selectedVariant._sizeName) {
        // Edit stock for a specific size
        const stockVal = Number(fd.stock);
        const finalVal = selectedVariant._isListed ? stockVal : `U:${stockVal}`;
        const updatedSizes = { ...selectedVariant.stock_by_size, [selectedVariant._sizeName]: finalVal };
        await apiClient.patch(`/catalog/variants/${selectedVariant.id}/`, { stock_by_size: JSON.stringify(updatedSizes) });
      } else {
        // Edit overall stock
        await apiClient.patch(`/catalog/variants/${selectedVariant.id}/`, { stock: fd.stock });
      }
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

  const handleToggleSizeListed = async (v, sizeName) => {
    const rawVal = v.stock_by_size[sizeName];
    let qty = 0;
    let currentlyListed = true;
    
    if (typeof rawVal === 'string' && rawVal.startsWith('U:')) {
        currentlyListed = false;
        qty = parseInt(rawVal.replace('U:', ''), 10) || 0;
    } else {
        currentlyListed = true;
        qty = parseInt(rawVal, 10) || 0;
    }
    
    const newVal = currentlyListed ? `U:${qty}` : qty;
    const updatedSizes = { ...v.stock_by_size, [sizeName]: newVal };
    
    // Optimistic update
    setVariants(prev => prev.map(x => x.id === v.id ? { ...x, stock_by_size: updatedSizes } : x));
    
    try {
      await apiClient.patch(`/catalog/variants/${v.id}/`, { stock_by_size: JSON.stringify(updatedSizes) });
    } catch (err) {
      // Roll back
      setVariants(prev => prev.map(x => x.id === v.id ? { ...x, stock_by_size: v.stock_by_size } : x));
    }
  };

  const bulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} variant(s)?`)) return;
    await Promise.all([...selectedIds].map(id => apiClient.delete(`/catalog/variants/${id}/`).catch(() => { })));
    setSelectedIds(new Set());
    fetchInventory();
  };

  // ── KPI ──
  const totalSKUs = variants.length;
  const inStockCount = variants.filter(v => v.stock > 0).length;
  const lowStockCount = variants.filter(v => v.stock > 0 && v.stock <= 20).length;
  const outOfStockCount = variants.filter(v => v.stock <= 0).length;

  const statCards = [
    { label: 'Total SKUs', value: totalSKUs.toLocaleString(), Icon: Archive, trend: null },
    { label: 'In stock', value: `${inStockCount.toLocaleString()} variants`, Icon: CheckCircle, trend: 'up' },
    { label: 'Low stock', value: `${lowStockCount.toLocaleString()} variants`, Icon: AlertTriangle, trend: 'down' },
    { label: 'Out of stock', value: `${outOfStockCount.toLocaleString()} variants`, Icon: XCircle, trend: 'down' },
  ];

  // ── Filter + search ──
  const byStock = variants.filter(v => {
    if (stockFilter === 'in') return v.stock > 0;
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
    if (stock <= 0) return '#D92D20';
    if (stock <= 20) return '#F79009';
    return '#34C759';
  };

  const getImage = (v) => v.images?.[0]?.image || null;

  // ── Columns ──
  const columns = [
    { label: 'Product', key: 'product' },
    { label: 'SKU Code', key: 'sku' },
    { label: 'Variant', key: 'color' },
    { label: 'Current Stock', key: 'stock', sortable: true },
    { label: 'Threshold', key: 'threshold' },
    { label: 'Last Restocked', key: 'last_restocked' },
    { label: 'Last Sold', key: 'last_sold' },
    { label: 'Listed', key: 'is_listed' },
    { label: 'Action', key: 'action' },
  ];

  const CELL = { padding: '0 13px', height: 51, verticalAlign: 'middle' };
  const TXT = { fontSize: 13, color: '#040205', fontWeight: 400 };

  const renderRow = (v) => {
    const imgSrc = getImage(v);
    const dot = getStockDot(v.stock ?? 0);
    const threshold = v.low_stock_threshold ?? 20;
    const isSelected = selectedIds.has(v.id);
    const isExpanded = expandedRows.includes(v.id);

    // Check if we have size data
    const sizes = v.stock_by_size || {};
    const hasSizes = Object.keys(sizes).length > 0;

    return (
      <React.Fragment key={v.id}>
        <tr style={{ borderBottom: '1px solid #e0e0e0', background: isSelected || isExpanded ? '#F9F5FF' : '#fff' }}>

          {/* Checkbox — handled by BaseAdminTable via isSelected/onToggle but we wire it manually */}
          <td style={{ ...CELL, width: 60 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div onClick={(e) => { e.stopPropagation(); toggleRow(v.id); }} style={{ color: '#667085', cursor: 'pointer', width: 14 }}>
                {isExpanded ? <ChevronDown size={14} strokeWidth={3} /> : <ChevronRight size={14} strokeWidth={3} />}
              </div>
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
            </div>
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

        {/* Sub-rows for each size */}
        {isExpanded && hasSizes && Object.entries(sizes).map(([sizeName, rawQty], index) => {
          const isLast = index === Object.keys(sizes).length - 1;
          
          let qty = 0;
          let isSizeListed = true;
          if (typeof rawQty === 'string' && rawQty.startsWith('U:')) {
              isSizeListed = false;
              qty = parseInt(rawQty.replace('U:', ''), 10) || 0;
          } else {
              isSizeListed = true;
              qty = parseInt(rawQty, 10) || 0;
          }
          
          return (
            <tr key={`${v.id}-${sizeName}`} style={{ borderBottom: isLast ? '1px solid #e0e0e0' : '1px solid #EAECF0', background: '#F9FAFB' }}>
              {/* Checkbox column - empty but indented to show hierarchy */}
              <td style={{ ...CELL, width: 60, paddingLeft: 24 }}>
                <div style={{ width: 16, height: 16, borderLeft: '2px solid #D0D5DD', borderBottom: '2px solid #D0D5DD', borderBottomLeftRadius: 4, marginTop: -16 }} />
              </td>

              {/* Product - Showing Size instead */}
              <td style={{ ...CELL, minWidth: 176 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ padding: '4px 10px', background: '#F4EBFF', color: '#7F56D9', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                    Size: {sizeName}
                  </div>
                </div>
              </td>

              {/* SKU */}
              <td style={{ ...CELL, minWidth: 112 }}>
                <span style={{ ...TXT, fontFamily: 'monospace', color: '#667085' }}>{v.sku ? `${v.sku}-${sizeName.charAt(0).toUpperCase()}` : '—'}</span>
              </td>

              {/* Variant */}
              <td style={{ ...CELL, minWidth: 104 }}>
                <span style={{ ...TXT, color: '#667085' }}>{v.color || 'Standard'}</span>
              </td>

              {/* Current Stock */}
              <td style={{ ...CELL, minWidth: 96 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 16, height: 16, borderRadius: '50%', background: getStockDot(qty), flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ ...TXT, fontWeight: 600 }}>{qty}</span>
                </div>
              </td>

              {/* Threshold */}
              <td style={{ ...CELL, minWidth: 80 }}>
                <span style={{ ...TXT, color: '#667085' }}>{threshold}</span>
              </td>

              {/* Last Restocked */}
              <td style={{ ...CELL, minWidth: 112 }}>
                <span style={{ ...TXT, color: '#667085' }}>
                  {v.last_restocked ? new Date(v.last_restocked).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </span>
              </td>

              {/* Last Sold */}
              <td style={{ ...CELL, minWidth: 96 }}>
                <span style={{ ...TXT, color: '#667085' }}>
                  {v.last_sold ? new Date(v.last_sold).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </span>
              </td>

              {/* Listed toggle */}
              <td style={{ ...CELL, minWidth: 80 }}>
                <div
                  onClick={() => handleToggleSizeListed(v, sizeName)}
                  style={{
                    width: 36, height: 20, borderRadius: 10, position: 'relative', cursor: 'pointer',
                    background: isSizeListed ? '#7F56D9' : '#D0D5DD',
                    transition: 'background 0.2s',
                    flexShrink: 0,
                    display: 'inline-block',
                  }}
                >
                  <span style={{
                    position: 'absolute', top: 2, left: isSizeListed ? 18 : 2,
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
                    onClick={() => handleEditClick(v, sizeName)}
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
        })}

        {/* Sub-row for Standard Size if no sizes exist */}
        {isExpanded && !hasSizes && (
          <tr style={{ borderBottom: '1px solid #e0e0e0', background: '#F9FAFB' }}>
            <td style={{ ...CELL, width: 60, paddingLeft: 24 }}>
              <div style={{ width: 16, height: 16, borderLeft: '2px solid #D0D5DD', borderBottom: '2px solid #D0D5DD', borderBottomLeftRadius: 4, marginTop: -16 }} />
            </td>
            <td style={{ ...CELL, minWidth: 176 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ padding: '4px 10px', background: '#F2F4F7', color: '#344054', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                  Standard Size
                </div>
              </div>
            </td>
            <td style={{ ...CELL, minWidth: 112 }}><span style={{ ...TXT, fontFamily: 'monospace', color: '#667085' }}>{v.sku || '—'}</span></td>
            <td style={{ ...CELL, minWidth: 104 }}><span style={{ ...TXT, color: '#667085' }}>{v.color || 'Standard'}</span></td>
            <td style={{ ...CELL, minWidth: 96 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', background: dot, flexShrink: 0, display: 'inline-block' }} />
                <span style={{ ...TXT, fontWeight: 600 }}>{v.stock ?? 0}</span>
              </div>
            </td>
            <td style={{ ...CELL, minWidth: 80 }}><span style={{ ...TXT, color: '#667085' }}>{threshold}</span></td>
            <td colSpan={4}></td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  const statusLabel = STATUS_OPTS.find(o => o.key === stockFilter)?.label || 'Stock Status';

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Group tabs */}
      <div style={{ display: 'flex', background: '#F9FAFB', border: '1px solid #EAECF0', borderRadius: 8, padding: 4, gap: 8, marginBottom: 12 }}>
        {groupsData.map(g => (
          <button key={g.key} onClick={() => setActiveGroup(g.key)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: activeGroup === g.key ? '#fff' : 'transparent', cursor: 'pointer', color: activeGroup === g.key ? '#7F56D9' : '#667085' }}>{g.label}</button>
        ))}
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(groupsData.find(g => g.key === activeGroup)?.categories || []).map(cat => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.name)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #E6E6E6', background: activeCategory === cat.name ? '#fff' : 'transparent', cursor: 'pointer' }}>{cat.name}</button>
        ))}
      </div>
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
          { name: 'product_name', label: 'Product Name', type: 'text', readOnly: true },
          { name: 'sku', label: 'SKU Code', type: 'text', readOnly: true },
          { name: 'stock', label: 'Stock Quantity', type: 'number', required: true, min: 0 },
        ]}
        initialData={selectedVariant || {}}
      />
    </div>
  );
};

export default InventoryTable;
