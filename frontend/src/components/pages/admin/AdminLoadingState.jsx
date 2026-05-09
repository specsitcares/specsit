import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

/* Skeleton bar — shimmer animation via admin.css */
const Skel = ({ w = '100%', h = 14 }) => (
  <div className="admin-skeleton-cell" style={{ width: w, height: h }} />
);

/* One skeleton row mimicking a table row */
const SkeletonRow = ({ cols }) => (
  <tr>
    {cols.map((w, i) => (
      <td key={i} style={{ padding: '14px 16px' }}>
        <Skel w={w} />
      </td>
    ))}
  </tr>
);

/* Full skeleton table body */
const SkeletonTable = ({ rows = 7, colWidths = ['40%', '20%', '15%', '15%', '10%'] }) => (
  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} style={{ borderBottom: '1px solid #F2F4F7' }}>
          {colWidths.map((w, j) => (
            <td key={j} style={{ padding: '14px 16px' }}>
              <Skel w={w} h={j === 0 ? 15 : 13} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

/* ── Main component ─────────────────────────────────────────── */
const AdminLoadingState = ({
  loading,
  error,
  onRetry,
  children,
  rows = 7,
  colWidths,
  /* Pass label to describe what's loading, e.g. "orders" */
  label = 'data',
}) => {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!loading) { setSlow(false); return; }
    const t = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(t);
  }, [loading]);

  if (error) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '64px 24px', gap: 16, textAlign: 'center',
      }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FEF3F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertCircle size={24} color="#D92D20" />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#101828', marginBottom: 4 }}>
            Failed to load {label}
          </div>
          <div style={{ fontSize: 13, color: '#667085' }}>
            Check your connection or try again.
          </div>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#68408D', color: '#fff', border: 'none',
              borderRadius: 8, padding: '8px 18px', fontSize: 13,
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} /> Retry
          </button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        {/* Skeleton table */}
        <div style={{ background: '#fff', border: '1px solid #EAECF0', borderRadius: 12, overflow: 'hidden' }}>
          {/* Fake header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #F2F4F7', display: 'flex', gap: 16 }}>
            <Skel w="96px" h={13} />
            <Skel w="64px" h={13} />
            <Skel w="80px" h={13} />
          </div>
          <SkeletonTable rows={rows} colWidths={colWidths} />
        </div>

        {/* Slow-load notice */}
        {slow && (
          <div style={{
            marginTop: 20, display: 'flex', alignItems: 'center', gap: 10,
            background: '#FFFAEB', border: '1px solid #FEC84B',
            borderRadius: 10, padding: '12px 16px',
          }}>
            <RefreshCw size={15} color="#B54708" style={{ animation: 'admin-shimmer 1.4s ease-in-out infinite', flexShrink: 0 }} />
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#B54708' }}>
                Still loading {label}…
              </span>
              <span style={{ fontSize: 12, color: '#92400E', marginLeft: 6 }}>
                The database may be warming up. This usually resolves in a few seconds.
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return children;
};

export default AdminLoadingState;
