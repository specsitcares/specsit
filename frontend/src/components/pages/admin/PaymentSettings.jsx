import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Eye, EyeOff } from 'lucide-react';
import apiClient from '../../../services/api';

const field = {
  label: { fontSize: '10px', fontWeight: 600, color: '#344054', marginBottom: '5px', display: 'block' },
  hint:  { fontSize: '10px', color: '#667085', marginTop: '3px' },
};

const Toggle = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    role="switch"
    aria-checked={checked}
    style={{
      flexShrink: 0,
      width: '38px', height: '21px',
      borderRadius: '10px',
      border: 'none',
      background: checked ? '#68408D' : '#D0D5DD',
      cursor: 'pointer',
      position: 'relative',
      transition: 'background 0.2s',
      padding: 0,
    }}
  >
    <span style={{
      position: 'absolute',
      top: '3px',
      left: checked ? '20px' : '3px',
      width: '16px', height: '16px',
      borderRadius: '50%',
      background: '#fff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      transition: 'left 0.2s',
    }} />
  </button>
);

const PaymentSettings = () => {
  const [codEnabled, setCodEnabled] = useState(true);
  const [onlineEnabled, setOnlineEnabled] = useState(true);
  const [partialEnabled, setPartialEnabled] = useState(true);
  const [pct, setPct] = useState(50);
  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [hasKeySecret, setHasKeySecret] = useState(false);
  const [isSandbox, setIsSandbox] = useState(true);
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient.get('/sales/payments/settings/')
      .then(res => {
        setCodEnabled(res.data.cod_enabled ?? true);
        setOnlineEnabled(res.data.online_payment_enabled ?? true);
        setPartialEnabled(res.data.partial_payment_enabled ?? true);
        setPct(res.data.partial_payment_percentage || 50);
        setKeyId(res.data.key_id || '');
        setHasKeySecret(res.data.has_key_secret || false);
        setIsSandbox(res.data.is_sandbox ?? true);
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
      const payload = {
        cod_enabled: codEnabled,
        online_payment_enabled: onlineEnabled,
        partial_payment_enabled: partialEnabled,
        partial_payment_percentage: Number(pct),
        is_sandbox: isSandbox,
        key_id: keyId.trim(),
      };
      if (keySecret.trim()) payload.key_secret = keySecret.trim();
      await apiClient.put('/sales/payments/settings/', payload);
      setKeySecret('');
      setHasKeySecret(true);
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '160px', color: '#667085' }}>
        <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading…
      </div>
    );
  }

  const exampleTotal = 2000;
  const phase1 = Math.round(exampleTotal * pct) / 100;
  const phase2 = exampleTotal - phase1;

  return (
    <div style={{ maxWidth: '480px' }}>
      <div style={{ marginBottom: '22px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#101828', margin: 0 }}>Payment Settings</h1>
        <p style={{ fontSize: '11px', color: '#667085', marginTop: '3px' }}>
          Control which payment methods are available to customers at checkout.
        </p>
      </div>

      {/* COD toggle card */}
      <div style={{ background: '#fff', border: '1px solid #EAECF0', borderRadius: '10px', padding: '20px 24px', marginBottom: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '19px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#101828', marginBottom: '3px' }}>Cash on Delivery (COD)</div>
          <div style={{ fontSize: '10px', color: '#667085' }}>
            {codEnabled
              ? 'Customers can choose to pay cash upon delivery.'
              : 'COD is hidden — customers cannot pay on delivery.'}
          </div>
        </div>
        <Toggle checked={codEnabled} onChange={setCodEnabled} />
      </div>

      {/* Full online payment toggle card */}
      <div style={{ background: '#fff', border: '1px solid #EAECF0', borderRadius: '10px', padding: '20px 24px', marginBottom: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '19px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#101828', marginBottom: '3px' }}>Full Online Payment</div>
          <div style={{ fontSize: '10px', color: '#667085' }}>
            {onlineEnabled
              ? 'Customers can pay the full amount online via Razorpay.'
              : 'Full online payment is hidden — customers cannot pay the full amount online.'}
          </div>
        </div>
        <Toggle checked={onlineEnabled} onChange={setOnlineEnabled} />
      </div>

      {/* Partial payment toggle card */}
      <div style={{ background: '#fff', border: '1px solid #EAECF0', borderRadius: '10px', padding: '20px 24px', marginBottom: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '19px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#101828', marginBottom: '3px' }}>Partial Payment</div>
          <div style={{ fontSize: '10px', color: '#667085' }}>
            {partialEnabled
              ? 'Customers can pay a portion now and the balance before dispatch.'
              : 'Partial payment is hidden — customers must pay in full or choose COD.'}
          </div>
        </div>
        <Toggle checked={partialEnabled} onChange={setPartialEnabled} />
      </div>

      {/* Split config card — greyed out when disabled */}
      <div style={{
        background: '#fff', border: '1px solid #EAECF0', borderRadius: '10px', padding: '19px', marginBottom: '16px',
        opacity: partialEnabled ? 1 : 0.45,
        pointerEvents: partialEnabled ? 'auto' : 'none',
        transition: 'opacity 0.2s',
      }}>
        <h2 style={{ fontSize: '12px', fontWeight: 700, color: '#101828', margin: '0 0 4px' }}>Upfront Payment Percentage</h2>
        <p style={{ fontSize: '10px', color: '#667085', margin: '0 0 20px' }}>
          The percentage of the order total charged immediately. The rest is collected before dispatch.
        </p>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '13px' }}>
            <input
              type="range"
              min={10}
              max={90}
              step={5}
              value={pct}
              disabled={!partialEnabled}
              onChange={e => setPct(Number(e.target.value))}
              style={{ flex: 1, accentColor: '#68408D', cursor: partialEnabled ? 'pointer' : 'not-allowed' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', minWidth: '64px' }}>
              <input
                type="number"
                min={1}
                max={99}
                value={pct}
                disabled={!partialEnabled}
                onChange={e => setPct(Number(e.target.value))}
                style={{
                  width: '48px', padding: '8px 10px', border: '1px solid #D0D5DD',
                  borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                  color: '#101828', textAlign: 'center', fontFamily: 'inherit',
                  background: partialEnabled ? '#fff' : '#F9FAFB',
                }}
              />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#101828' }}>%</span>
            </div>
          </div>
          <span style={field.hint}>Slider: 10–90% in 5% steps. Or type any whole number 1–99.</span>
        </div>

        {/* Live preview */}
        <div style={{ background: '#F9FAFB', border: '1px solid #EAECF0', borderRadius: '8px', padding: '13px' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
            Preview — ₹{exampleTotal.toLocaleString('en-IN')} order
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ background: '#fff', border: '1px solid #D0D5DD', borderRadius: '6px', padding: '10px' }}>
              <div style={{ fontSize: '9px', color: '#667085', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Pay Now ({pct}%)
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#68408D' }}>
                ₹{phase1.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '10px', color: '#667085', marginTop: '2px' }}>Charged via Razorpay today</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #D0D5DD', borderRadius: '6px', padding: '10px' }}>
              <div style={{ fontSize: '9px', color: '#667085', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Balance ({100 - pct}%)
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#344054' }}>
                ₹{phase2.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '10px', color: '#667085', marginTop: '2px' }}>Collected before dispatch</div>
            </div>
          </div>
        </div>
      </div>

      {/* Razorpay API Keys card */}
      <div style={{ background: '#fff', border: '1px solid #EAECF0', borderRadius: '10px', padding: '19px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 700, color: '#101828', margin: 0 }}>Razorpay API Keys</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '10px', color: '#667085' }}>Sandbox mode</span>
            <Toggle checked={isSandbox} onChange={setIsSandbox} />
          </div>
        </div>
        <p style={{ fontSize: '10px', color: '#667085', margin: '0 0 16px' }}>
          {isSandbox ? 'Using test keys — no real charges.' : 'Live mode — real transactions enabled.'}
        </p>

        {/* Key ID */}
        <div style={{ marginBottom: '12px' }}>
          <label style={field.label}>Key ID</label>
          <input
            type="text"
            value={keyId}
            onChange={e => setKeyId(e.target.value)}
            placeholder="rzp_test_... or rzp_live_..."
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '9px 12px', border: '1px solid #D0D5DD',
              borderRadius: '6px', fontSize: '12px', color: '#101828',
              fontFamily: 'monospace', outline: 'none', background: '#fff',
            }}
          />
        </div>

        {/* Key Secret */}
        <div>
          <label style={field.label}>
            Key Secret
            {hasKeySecret && <span style={{ fontWeight: 400, color: '#667085', marginLeft: 6 }}>(configured — leave blank to keep)</span>}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showSecret ? 'text' : 'password'}
              value={keySecret}
              onChange={e => setKeySecret(e.target.value)}
              placeholder={hasKeySecret ? '••••••••••••••••' : 'Enter key secret...'}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '9px 36px 9px 12px', border: '1px solid #D0D5DD',
                borderRadius: '6px', fontSize: '12px', color: '#101828',
                fontFamily: 'monospace', outline: 'none', background: '#fff',
              }}
            />
            <button
              type="button"
              onClick={() => setShowSecret(s => !s)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#667085', display: 'flex', padding: 0 }}
            >
              {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <span style={field.hint}>Stored securely. Never exposed in API responses.</span>
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEF3F2', border: '1px solid #FECDCA', borderRadius: '6px', padding: '12px 16px', color: '#B42318', fontSize: '10px', marginBottom: '13px' }}>
          {error}
        </div>
      )}
      {saved && (
        <div style={{ background: '#ECFDF3', border: '1px solid #ABEFC6', borderRadius: '6px', padding: '12px 16px', color: '#067647', fontSize: '10px', marginBottom: '13px' }}>
          Settings saved successfully.
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: saving ? '#D0D5DD' : '#68408D', color: '#fff',
          border: 'none', borderRadius: '6px', padding: '10px 20px',
          fontSize: '11px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
        }}
      >
        <Save size={16} />
        {saving ? 'Saving…' : 'Save Settings'}
      </button>
    </div>
  );
};

export default PaymentSettings;
