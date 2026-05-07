import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Filter, Download,
  ChevronDown, ChevronRight, ChevronLeft,
  ArrowUpDown, Package
} from 'lucide-react';
import AdminLoadingState from './AdminLoadingState';

const BulkBar = ({ count, actions, onClear }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 24px', background: '#F4EBFF',
    borderBottom: '1px solid #D6BBFB',
  }}>
    <span style={{ fontSize: 13, fontWeight: 700, color: '#6941C6', minWidth: 90 }}>
      {count} selected
    </span>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {actions.map((a, i) => (
        <button key={i} onClick={a.onClick} style={{
          padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          border: a.variant === 'danger' ? '1px solid #FDA29B' : a.variant === 'success' ? '1px solid #ABEFC6' : a.variant === 'warning' ? '1px solid #FEDF89' : '1px solid #D6BBFB',
          background: a.variant === 'danger' ? '#FEF3F2' : a.variant === 'success' ? '#ECFDF3' : a.variant === 'warning' ? '#FFFAEB' : '#fff',
          color: a.variant === 'danger' ? '#B42318' : a.variant === 'success' ? '#027A48' : a.variant === 'warning' ? '#B54708' : '#6941C6',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          {a.icon && <a.icon size={13} />} {a.label}
        </button>
      ))}
    </div>
    <button onClick={onClear} style={{ marginLeft: 'auto', fontSize: 12, color: '#667085', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
      Clear selection
    </button>
  </div>
);

const BaseAdminTable = ({
  title,
  subtitle,
  count,
  searchQuery,
  onSearchChange,
  onSearchEnter,
  showFilters,
  setShowFilters,
  onExport,
  onAdd,
  addLabel = 'Add New',
  filterContent,
  columns,
  data = [],
  loading,
  renderRow,
  pagination = {
    page: 1,
    perPage: 10,
    totalCount: 0,
    onPageChange: () => {},
    onPerPageChange: () => {}
  },
  emptyMessage = "No records yet",
  emptyDescription = "Records will appear here once they are added.",
  analyticsCards = null,
  selectedIds = null,
  onSelectIds = null,
  bulkActions = [],
}) => {
  const searchInputRef = useRef(null);
  const [goToInputVal, setGoToInputVal] = useState(String(pagination.page));

  useEffect(() => {
    const handleGlobalKey = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  useEffect(() => {
    setGoToInputVal(String(pagination.page));
  }, [pagination.page]);

  const totalPages = Math.ceil(pagination.totalCount / pagination.perPage) || 1;

  if (loading) return (
    <div style={{ padding: '24px' }}>
      <AdminLoadingState loading={true} label={title?.toLowerCase() || 'data'} />
    </div>
  );

  return (
    <div className="orders-page-container-v3" style={{ padding: '0px' }}>
      
      {/* Analytics Cards Row */}
      {analyticsCards && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          {analyticsCards}
        </div>
      )}

      <div className="orders-table-card-v2" style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: '12px', overflow: 'hidden' }}>
        {/* Table Header Section */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e0e0e0', backgroundColor: '#fff' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 500, color: '#040205', margin: 0 }}>
                {title}
              </h3>
              {subtitle && (
                <span style={{ backgroundColor: '#F4EBFF', color: '#7F56D9', fontSize: '12px', padding: '2px 10px', borderRadius: '16px', fontWeight: 600 }}>
                  {subtitle}
                </span>
              )}
              {count !== undefined && (
                <span style={{ backgroundColor: '#F4EBFF', color: '#7F56D9', fontSize: '12px', padding: '3px 12px', borderRadius: '20px', fontWeight: 600 }}>
                  {count} Orders
                </span>
              )}
            </div>

            <div className="table-actions-container" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
              {/* Search Box */}
              <div className="table-search-box" style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: '1', minWidth: '40px', maxWidth: '320px' }}>
                <Search size={18} style={{ position: 'absolute', left: 14, color: '#667085', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Search here..."
                  value={searchQuery}
                  onChange={e => onSearchChange(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && onSearchEnter && onSearchEnter()}
                  ref={searchInputRef}
                  className="responsive-search-input"
                  style={{
                    width: '100%',
                    padding: '10px 48px 10px 42px',
                    border: '1px solid #D0D5DD',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: '#fff',
                    outline: 'none',
                    fontWeight: 500,
                    color: '#101828',
                    boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)'
                  }}
                />
                <div className="desktop-only" style={{ position: 'absolute', right: 12, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', border: '1px solid #e0e0e0', borderRadius: '6px', backgroundColor: '#F9FAFB', fontSize: '12px', color: '#667085', fontWeight: 600 }}>
                  <span style={{ fontSize: '10px' }}>⌘</span> K
                </div>
              </div>

              {/* Action Buttons */}
              {onAdd && (
                <button
                  onClick={onAdd}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', border: '1px solid #7F56D9', borderRadius: '8px', backgroundColor: '#7F56D9', fontSize: '14px', fontWeight: 600, color: '#fff', cursor: 'pointer', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
                >
                  <span className="desktop-only">{addLabel}</span>
                </button>
              )}

              {setShowFilters && (
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="btn-collapse-on-search"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', border: '1px solid #D0D5DD', borderRadius: '8px', backgroundColor: showFilters ? '#F9FAFB' : '#fff', fontSize: '14px', fontWeight: 600, color: '#344054', cursor: 'pointer', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
                >
                  <Filter size={18} color="#667085" />
                  <span className="desktop-only">Filter</span>
                </button>
              )}

              {onExport && (
                <button
                  className="btn-collapse-on-search"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff', fontSize: '14px', fontWeight: 500, color: '#344054', cursor: 'pointer' }}
                  onClick={onExport}
                >
                  <Download size={16} color="#667085" />
                  <span className="desktop-only">Export Data</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds && selectedIds.size > 0 && (
          <BulkBar
            count={selectedIds.size}
            actions={bulkActions}
            onClear={() => onSelectIds(new Set())}
          />
        )}

        {/* Integrated Filter Bar */}
        {showFilters && filterContent && (
          <div style={{
            padding: '16px 24px',
            backgroundColor: '#F9FAFB',
            borderBottom: '1px solid #EAECF0',
            animation: 'slideDown 0.2s ease-out'
          }}>
            {filterContent}
          </div>
        )}

        {/* Table Content */}
        <div className="overflow-x-auto scrollbar-hide">
          <table className="figma-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #e0e0e0' }}>
                <th style={{ padding: '12px 16px', width: 40, textAlign: 'left' }}>
                  {selectedIds ? (
                    <input
                      type="checkbox"
                      style={{ cursor: 'pointer', borderRadius: '4px', accentColor: '#7F56D9' }}
                      checked={data.length > 0 && data.every(item => selectedIds.has(item.id))}
                      ref={el => { if (el) el.indeterminate = data.some(item => selectedIds.has(item.id)) && !data.every(item => selectedIds.has(item.id)); }}
                      onChange={e => {
                        const next = new Set(selectedIds);
                        if (e.target.checked) data.forEach(item => next.add(item.id));
                        else data.forEach(item => next.delete(item.id));
                        onSelectIds(next);
                      }}
                    />
                  ) : (
                    <input type="checkbox" style={{ cursor: 'pointer', borderRadius: '4px', accentColor: '#7F56D9' }} />
                  )}
                </th>
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    onClick={() => col.onSort && col.onSort(col.key)}
                    style={{
                      padding: '12px 16px',
                      fontSize: '13px',
                      color: '#697177',
                      fontWeight: 500,
                      textAlign: col.align || 'left',
                      textTransform: 'none',
                      width: col.width,
                      whiteSpace: 'nowrap',
                      cursor: col.onSort ? 'pointer' : 'default',
                      userSelect: col.onSort ? 'none' : 'auto',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start', gap: 4 }}>
                      {col.label} {col.sortable && <ArrowUpDown size={12} color="#697177" />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody style={{ backgroundColor: '#fff' }}>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#667085' }}>
                        <Package size={24} />
                      </div>
                      <div style={{ fontWeight: 600, color: '#101828' }}>{emptyMessage}</div>
                      <div style={{ fontSize: '14px', color: '#667085' }}>{emptyDescription}</div>
                    </div>
                  </td>
                </tr>
              ) : data.map((item, idx) => renderRow(item, idx, selectedIds ? {
                  isSelected: selectedIds.has(item.id),
                  onToggle: () => {
                    const next = new Set(selectedIds);
                    if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
                    onSelectIds(next);
                  },
                } : {}))}
            </tbody>
          </table>
        </div>

        {/* Pagination Strip */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #e0e0e0', backgroundColor: '#fff', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: 600, color: '#344054' }}>
            <span>Rows per Page</span>
            <div style={{ position: 'relative' }}>
              <select
                value={pagination.perPage}
                onChange={(e) => pagination.onPerPageChange(Number(e.target.value))}
                style={{ padding: '8px 32px 8px 12px', border: '1px solid #D0D5DD', borderRadius: '8px', fontSize: '14px', fontWeight: 600, backgroundColor: '#fff', appearance: 'none', cursor: 'pointer', outline: 'none', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#667085' }} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              disabled={pagination.page === 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '14px', color: pagination.page === 1 ? '#D0D5DD' : '#344054', fontWeight: 600, cursor: pagination.page === 1 ? 'default' : 'pointer', background: 'none', border: '1px solid #D0D5DD', borderRadius: '8px', padding: '6px 12px', outline: 'none' }}
            >
              <ChevronLeft size={16} /> Prev
            </button>

            <div style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3, '...', totalPages].map((n, i) => (
                <button
                  key={i}
                  onClick={() => typeof n === 'number' && pagination.onPageChange(n)}
                  style={{
                    width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px',
                    background: pagination.page === n ? '#F4EBFF' : 'transparent',
                    color: pagination.page === n ? '#7F56D9' : '#475467',
                    fontWeight: pagination.page === n ? 700 : 500,
                    border: 'none', cursor: typeof n === 'number' ? 'pointer' : 'default', outline: 'none'
                  }}
                >
                  {n}
                </button>
              ))}
            </div>

            <button
              disabled={pagination.page >= totalPages || totalPages === 0}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '14px', color: (pagination.page >= totalPages || totalPages === 0) ? '#D0D5DD' : '#344054', fontWeight: 600, cursor: (pagination.page >= totalPages || totalPages === 0) ? 'default' : 'pointer', background: 'none', border: '1px solid #D0D5DD', borderRadius: '8px', padding: '6px 12px', outline: 'none' }}
            >
              Next <ChevronRight size={16} />
            </button>

            <span style={{ color: '#D0D5DD', margin: '0 8px' }}>/</span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '14px', color: '#344054', fontWeight: 600 }}>Go to Page</span>
              <input
                type="text"
                value={goToInputVal}
                onChange={(e) => setGoToInputVal(e.target.value)}
                style={{ width: '40px', padding: '6px', border: '1px solid #D0D5DD', borderRadius: '8px', textAlign: 'center', fontSize: '14px', fontWeight: 600 }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const p = parseInt(goToInputVal);
                    if (p >= 1 && p <= totalPages) pagination.onPageChange(p);
                  }
                }}
              />
              <button
                onClick={() => {
                  const p = parseInt(goToInputVal);
                  if (p >= 1 && p <= totalPages) pagination.onPageChange(p);
                }}
                style={{ color: '#344054', fontWeight: 700, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}
              >
                Go <ChevronRight size={14} /></button>
            </div>
          </div>

          <div style={{ fontSize: '14px', fontWeight: 500, color: '#475467' }}>
            {pagination.totalCount === 0 ? 'Showing 0 of 0' : `Showing ${(pagination.page - 1) * pagination.perPage + 1} - ${Math.min(pagination.page * pagination.perPage, pagination.totalCount)} of ${pagination.totalCount}`}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BaseAdminTable;
