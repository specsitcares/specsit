import React, { useState, useEffect } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import apiClient from '../../../services/api';

const field = {
  label: { fontSize: '13px', fontWeight: 600, color: '#344054', marginBottom: '6px', display: 'block' },
  hint:  { fontSize: '12px', color: '#667085', marginTop: '4px' },
};

const PaymentSettings = () => {
  const [enabled, setEnabled] = useState(true);
  const [pct, setPct] = useState(50);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient.get('/sales/payments/settings/')
      .then(res => {
        setEnabled(res.data.partial_payment_enabled ?? true);
        setPct(res.data.partial_payment_percentage || 50);
      })
      .catch(() => setError('Failed to load payment settings.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setError('');
    setSaved(false);
    if (pct < 1 || pct > 99 || !Number.isInteger(Number(pct))) {
      setError('Percentage must be a whole number between 1 and 99.');
      return;
    }
    setSaving(true);
    try {
      await apiClient.put('/sales/payments/settings/', {
        partial_payment_enabled: enabled,
        partial_payment_percentage: Number(pct),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '200px', color: '#667085' }}>
        <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading…
      </div>
    );
  }

  const exampleTotal = 2000;
  const phase1 = Math.round(exampleTotal * pct) / 100;
  const phase2 = exampleTotal - phase1;

  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#101828', margin: 0 }}>Payment Settings</h1>
        <p style={{ fontSize: '14px', color: '#667085', marginTop: '4px' }}>
          Control whether customers can pay in instalments and configure the split.
        </p>
      </div>

      {/* Toggle card */}
      <div style={{ background: '#fff', border: '1px solid #EAECF0', borderRadius: '12px', padding: '20px 24px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#101828', marginBottom: '3px' }}>Partial Payment</div>
          <div style={{ fontSize: '13px', color: '#667085' }}>
            {enabled
              ? 'Customers can pay a portion now and the balance before dispatch.'
              : 'Partial payment is hidden — customers must pay in full or choose COD.'}
          </div>
        </div>
        <button
          onClick={() => setEnabled(v => !v)}
          role="switch"
          aria-checked={enabled}
          style={{
            flexShrink: 0,
            width: '48px', height: '26px',
            borderRadius: '13px',
            border: 'none',
            background: enabled ? '#68408D' : '#D0D5DD',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background 0.2s',
            padding: 0,
          }}
        >
          <span style={{
            position: 'absolute',
            top: '3px',
            left: enabled ? '25px' : '3px',
            width: '20px', height: '20px',
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            transition: 'left 0.2s',
          }} />
        </button>
      </div>

      {/* Split config card — greyed out when disabled */}
      <div style={{
        background: '#fff', border: '1px solid #EAECF0', borderRadius: '12px', padding: '24px', marginBottom: '20px',
        opacity: enabled ? 1 : 0.45,
        pointerEvents: enabled ? 'auto' : 'none',
        transition: 'opacity 0.2s',
      }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#101828', margin: '0 0 4px' }}>Upfront Payment Percentage</h2>
        <p style={{ fontSize: '13px', color: '#667085', margin: '0 0 20px' }}>
          The percentage of the order total charged immediately. The rest is collected before dispatch.
        </p>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <input
              type="range"
              min={10}
              max={90}
              step={5}
              value={pct}
              disabled={!enabled}
              onChange={e => setPct(Number(e.target.value))}
              style={{ flex: 1, accentColor: '#68408D', cursor: enabled ? 'pointer' : 'not-allowed' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: '80px' }}>
              <input
                type="number"
                min={1}
                max={99}
                value={pct}
                disabled={!enabled}
                onChange={e => setPct(Number(e.target.value))}
                style={{
                  width: '60px', padding: '8px 10px', border: '1px solid #D0D5DD',
                  borderRadius: '8px', fontSize: '15px', fontWeight: 700,
                  color: '#101828', textAlign: 'center', fontFamily: 'inherit',
                  background: enabled ? '#fff' : '#F9FAFB',
                }}
              />
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#101828' }}>%</span>
            </div>
          </div>
          <span style={field.hint}>Slider: 10–90% in 5% steps. Or type any whole number 1–99.</span>
        </div>

        {/* Live preview */}
        <div style={{ background: '#F9FAFB', border: '1px solid #EAECF0', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
            Preview — ₹{exampleTotal.toLocaleString('en-IN')} order
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: '#fff', border: '1px solid #D0D5DD', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: '#667085', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Pay Now ({pct}%)
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#68408D' }}>
                ₹{phase1.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '12px', color: '#667085', marginTop: '2px' }}>Charged via Razorpay today</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #D0D5DD', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: '#667085', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Balance ({100 - pct}%)
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#344054' }}>
                ₹{phase2.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '12px', color: '#667085', marginTop: '2px' }}>Collected before dispatch</div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEF3F2', border: '1px solid #FECDCA', borderRadius: '8px', padding: '12px 16px', color: '#B42318', fontSize: '13px', marginBottom: '16px' }}>
          {error}
        </div>
      )}
      {saved && (
        <div style={{ background: '#ECFDF3', border: '1px solid #ABEFC6', borderRadius: '8px', padding: '12px 16px', color: '#067647', fontSize: '13px', marginBottom: '16px' }}>
          Settings saved successfully.
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: saving ? '#D0D5DD' : '#68408D', color: '#fff',
          border: 'none', borderRadius: '8px', padding: '10px 20px',
          fontSize: '14px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
        }}
      >
        <Save size={16} />
        {saving ? 'Saving…' : 'Save Settings'}
      </button>
    </div>
  );
};

export default PaymentSettings;
