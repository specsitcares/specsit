import React, { useState, useMemo } from 'react';
import { X } from 'lucide-react';

const PURPLE = '#68408D';

// Build a list of dioptre options between min and max in 0.25 steps.
const buildPowers = (min, max) => {
  const lo = Number(min ?? -6), hi = Number(max ?? 4);
  const out = [];
  for (let v = lo; v <= hi + 1e-6; v += 0.25) {
    const r = Math.round(v * 100) / 100;
    out.push((r > 0 ? '+' : '') + r.toFixed(2));
  }
  return out;
};
const CYL = ['-0.75', '-1.25', '-1.75', '-2.25'];
const AXIS = Array.from({ length: 18 }, (_, i) => String((i + 1) * 10));
const ADD = ['+1.00', '+1.50', '+2.00', '+2.50'];

const Sel = ({ label, value, onChange, options, placeholder }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
    <span style={{ fontSize: 11, fontWeight: 600, color: '#71717A' }}>{label}</span>
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ border: '1px solid #EFEDF0', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', background: '#fff' }}>
      <option value="">{placeholder || '—'}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </label>
);

const ContactLensSelectModal = ({ lens, onClose, onAdd }) => {
  const ptype = (lens.power_type || '').toLowerCase();
  const isToric = ptype.includes('toric');
  const isMulti = ptype.includes('multi');
  const sphOpts = useMemo(() => buildPowers(lens.min_power, lens.max_power), [lens]);
  const bcOpts = Array.isArray(lens.base_curve) ? lens.base_curve.map(String) : [];

  const [eye, setEye] = useState({
    rSph: '', rCyl: '', rAxis: '', rAdd: '',
    lSph: '', lCyl: '', lAxis: '', lAdd: '',
    bc: bcOpts[0] || '', qty: 1,
  });
  const set = (k, v) => setEye(p => ({ ...p, [k]: v }));
  const [err, setErr] = useState('');

  const price = Number(lens.package_selling_price || lens.price || 0);

  const buildEye = (sph, cyl, axis, add) => {
    if (!sph) return '';
    let s = `SPH ${sph}`;
    if (isToric) s += ` CYL ${cyl || '—'} AXIS ${axis || '—'}`;
    if (isMulti) s += ` ADD ${add || '—'}`;
    return s;
  };

  const submit = () => {
    if (!eye.rSph || !eye.lSph) { setErr('Select power for both eyes.'); return; }
    const power = { right: buildEye(eye.rSph, eye.rCyl, eye.rAxis, eye.rAdd), left: buildEye(eye.lSph, eye.lCyl, eye.lAxis, eye.lAdd) };
    if (eye.bc) power.base_curve = eye.bc;
    onAdd(lens, power, Math.max(1, Number(eye.qty) || 1));
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(4,2,5,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #EFEDF0' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#040205' }}>{lens.name || lens.package_name || 'Contact Lens'}</div>
            <div style={{ fontSize: 12, color: '#71717A' }}>{[lens.brand_name, lens.power_type].filter(Boolean).join(' · ')}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717A' }}><X size={20} /></button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#040205', marginBottom: 8 }}>Right Eye (OD)</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Sel label="SPH (Power)" value={eye.rSph} onChange={v => set('rSph', v)} options={sphOpts} />
              {isToric && <Sel label="CYL" value={eye.rCyl} onChange={v => set('rCyl', v)} options={CYL} />}
              {isToric && <Sel label="Axis" value={eye.rAxis} onChange={v => set('rAxis', v)} options={AXIS} />}
              {isMulti && <Sel label="ADD" value={eye.rAdd} onChange={v => set('rAdd', v)} options={ADD} />}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#040205', marginBottom: 8 }}>Left Eye (OS)</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Sel label="SPH (Power)" value={eye.lSph} onChange={v => set('lSph', v)} options={sphOpts} />
              {isToric && <Sel label="CYL" value={eye.lCyl} onChange={v => set('lCyl', v)} options={CYL} />}
              {isToric && <Sel label="Axis" value={eye.lAxis} onChange={v => set('lAxis', v)} options={AXIS} />}
              {isMulti && <Sel label="ADD" value={eye.lAdd} onChange={v => set('lAdd', v)} options={ADD} />}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {bcOpts.length > 0 && <Sel label="Base Curve" value={eye.bc} onChange={v => set('bc', v)} options={bcOpts} />}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 110 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#71717A' }}>Boxes</span>
              <input type="number" min="1" value={eye.qty} onChange={e => set('qty', e.target.value)}
                style={{ border: '1px solid #EFEDF0', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit' }} />
            </label>
          </div>
          {err && <div style={{ fontSize: 12, color: '#DC2626' }}>{err}</div>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderTop: '1px solid #EFEDF0' }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#040205' }}>₹{(price * (Number(eye.qty) || 1)).toLocaleString('en-IN')}</span>
          <button onClick={submit} style={{ background: PURPLE, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactLensSelectModal;
