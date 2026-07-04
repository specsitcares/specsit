import React, { useState, useMemo } from 'react';
import { X, Check } from 'lucide-react';

const NAVY = '#201A5C';
const PURPLE = '#68408D';

const buildPowers = (min, max) => {
  const lo = Number(min ?? -6), hi = Number(max ?? 4);
  const out = [];
  for (let v = lo; v <= hi + 1e-6; v += 0.25) {
    const r = Math.round(v * 100) / 100;
    out.push((r > 0 ? '+' : '') + r.toFixed(2));
  }
  return out;
};
const CYL = ['', '-0.75', '-1.25', '-1.75', '-2.25'];
const AXIS = ['', ...Array.from({ length: 37 }, (_, i) => String(i * 5))];
const BOXES = Array.from({ length: 12 }, (_, i) => String(i + 1));

const Dropdown = ({ value, onChange, options, disabled, placeholder = 'Select' }) => (
  <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
    style={{
      width: '100%', boxSizing: 'border-box', appearance: 'none',
      border: `1.5px solid ${disabled ? '#EDEBF3' : (value ? NAVY : '#E4E1EC')}`,
      borderRadius: 10, padding: '11px 30px 11px 14px', fontSize: 14, fontWeight: 600,
      color: disabled ? '#C7C3D4' : (value ? '#040205' : '#9A94AC'),
      background: `#fff url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${disabled ? '%23C7C3D4' : '%23201A5C'}' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>") no-repeat right 12px center`,
      cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
    }}>
    <option value="">{placeholder}</option>
    {options.filter(o => o !== '').map(o => <option key={o} value={o}>{o}</option>)}
  </select>
);

const EyeCheck = ({ label, on, onToggle }) => (
  <button type="button" onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
    <span style={{ width: 22, height: 22, borderRadius: 6, background: on ? NAVY : '#fff', border: `1.5px solid ${on ? NAVY : '#D6D2E0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {on && <Check size={14} color="#fff" strokeWidth={3} />}
    </span>
    <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.4, color: '#201A5C' }}>{label}</span>
  </button>
);

const Radio = ({ on, onClick, children }) => (
  <button type="button" onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
    <span style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${on ? NAVY : '#D6D2E0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {on && <span style={{ width: 11, height: 11, borderRadius: '50%', background: NAVY }} />}
    </span>
    <span style={{ fontSize: 16, fontWeight: 700, color: '#201A5C' }}>{children}</span>
  </button>
);

const Row = ({ title, sub, right, left, rDisabled, lDisabled, options, placeholder }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', gap: 14, alignItems: 'center', marginBottom: 14 }}>
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#040205' }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: '#9A94AC' }}>{sub}</div>}
    </div>
    <Dropdown value={right.value} onChange={right.set} options={options} disabled={rDisabled} placeholder={placeholder} />
    <Dropdown value={left.value} onChange={left.set} options={options} disabled={lDisabled} placeholder={placeholder} />
  </div>
);

const ContactLensSelectModal = ({ lens, onClose, onAdd, asDrawer = false }) => {
  const sphOpts = useMemo(() => buildPowers(lens.min_power, lens.max_power), [lens]);
  const perBox = lens.lenses_per_box || 30;
  const price = Number(lens.package_selling_price || lens.price || 0);

  const [mode, setMode] = useState('manual'); // 'manual' | 'later'
  const [rOn, setROn] = useState(true);
  const [lOn, setLOn] = useState(true);
  const [f, setF] = useState({ rSph: '', rCyl: '', rAxis: '', rBox: '1', lSph: '', lCyl: '', lAxis: '', lBox: '1' });
  const set = (k) => (v) => setF(p => ({ ...p, [k]: v }));
  const [err, setErr] = useState('');

  const boxes = mode === 'later' ? 1 : ((rOn ? Number(f.rBox) || 0 : 0) + (lOn ? Number(f.lBox) || 0 : 0)) || 1;
  const total = price * boxes;

  const eyeStr = (sph, cyl, axis, box) => {
    let s = `SPH ${sph || '—'}`;
    if (cyl) s += ` CYL ${cyl}`;
    if (axis) s += ` AXIS ${axis}`;
    s += ` × ${box} box`;
    return s;
  };

  const submit = () => {
    if (mode === 'later') {
      onAdd(lens, { mode: 'later', right: 'Power to be submitted later', left: '' }, 1);
      return;
    }
    if (!rOn && !lOn) { setErr('Select at least one eye.'); return; }
    if ((rOn && !f.rSph) || (lOn && !f.lSph)) { setErr('Select spherical power for the chosen eye(s).'); return; }
    const power = { mode: 'manual' };
    if (rOn) power.right = eyeStr(f.rSph, f.rCyl, f.rAxis, f.rBox);
    if (lOn) power.left = eyeStr(f.lSph, f.lCyl, f.lAxis, f.lBox);
    onAdd(lens, power, boxes);
  };

  const outerStyle = asDrawer
    ? { position: 'fixed', inset: 0, background: 'rgba(4,2,5,0.5)', display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end', zIndex: 2000 }
    : { position: 'fixed', inset: 0, background: 'rgba(4,2,5,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 };
  const innerStyle = asDrawer
    ? { background: '#fff', width: '100%', maxWidth: 520, height: '100vh', overflowY: 'auto', fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: '-8px 0 32px rgba(16,24,40,0.18)', display: 'flex', flexDirection: 'column' }
    : { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', flexDirection: 'column' };

  const manual = mode === 'manual';

  return (
    <div onClick={onClose} style={outerStyle}>
      <div onClick={e => e.stopPropagation()} style={innerStyle}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #EFEDF0' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#040205' }}>{lens.name || lens.package_name || 'Contact Lens'}</div>
            <div style={{ fontSize: 12, color: '#71717A' }}>{[lens.brand_name, lens.power_type].filter(Boolean).join(' · ')}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717A' }}><X size={22} /></button>
        </div>

        <div style={{ padding: 24, flex: 1 }}>
          {/* Card */}
          <div style={{ border: '1px solid #EFEDF0', borderRadius: 16, padding: 22, boxShadow: '0 4px 20px rgba(16,24,40,0.05)' }}>
            <div style={{ marginBottom: 20 }}>
              <Radio on={manual} onClick={() => { setMode('manual'); setErr(''); }}>Enter power Manually</Radio>
            </div>

            {/* Eye header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', gap: 14, alignItems: 'center', marginBottom: 16 }}>
              <span />
              <EyeCheck label="RIGHT" on={manual && rOn} onToggle={() => manual && setROn(v => !v)} />
              <EyeCheck label="LEFT" on={manual && lOn} onToggle={() => manual && setLOn(v => !v)} />
            </div>

            <Row title="Spherical" sub="SPH" options={sphOpts} placeholder="Select"
              right={{ value: f.rSph, set: set('rSph') }} left={{ value: f.lSph, set: set('lSph') }}
              rDisabled={!manual || !rOn} lDisabled={!manual || !lOn} />
            <Row title="Cylindrical" sub="CYL" options={CYL} placeholder="Select"
              right={{ value: f.rCyl, set: set('rCyl') }} left={{ value: f.lCyl, set: set('lCyl') }}
              rDisabled={!manual || !rOn} lDisabled={!manual || !lOn} />
            <Row title="Axis" sub="0–180" options={AXIS} placeholder="Select"
              right={{ value: f.rAxis, set: set('rAxis') }} left={{ value: f.lAxis, set: set('lAxis') }}
              rDisabled={!manual || !rOn} lDisabled={!manual || !lOn} />
            <Row title="No. of Boxes" sub={`${perBox} lens/box`} options={BOXES} placeholder="1"
              right={{ value: f.rBox, set: set('rBox') }} left={{ value: f.lBox, set: set('lBox') }}
              rDisabled={!manual || !rOn} lDisabled={!manual || !lOn} />

            <div style={{ borderTop: '1px solid #EFEDF0', margin: '8px 0 18px' }} />

            <Radio on={mode === 'later'} onClick={() => { setMode('later'); setErr(''); }}>I will submit power later</Radio>
          </div>

          {err && <div style={{ fontSize: 13, color: '#DC2626', marginTop: 12 }}>{err}</div>}
        </div>

        {/* footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderTop: '1px solid #EFEDF0' }}>
          <div>
            <div style={{ fontSize: 12, color: '#71717A' }}>{boxes} box{boxes !== 1 ? 'es' : ''}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#040205' }}>₹{total.toLocaleString('en-IN')}</div>
          </div>
          <button onClick={submit} style={{ background: PURPLE, color: '#fff', border: 'none', borderRadius: 12, padding: '13px 30px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactLensSelectModal;
