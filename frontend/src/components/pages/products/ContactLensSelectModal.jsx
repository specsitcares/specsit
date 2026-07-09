import React, { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import './LensSelectionAside.css'; // reuse the frame lens-selection power-grid styling

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
const CYL = ['-0.75', '-1.25', '-1.75', '-2.25'];
const AXIS = Array.from({ length: 37 }, (_, i) => String(i * 5));
const BOXES = Array.from({ length: 12 }, (_, i) => String(i + 1));

const Check = ({ on }) => (
  <span className={`lsa-manual-checkbox__box${on ? ' lsa-manual-checkbox__box--checked' : ''}`}>
    {on && (
      <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
        <path d="M1 4L4 7L10 1" stroke="#FEFCFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )}
  </span>
);

/* A single grey power-grid <select>, styled like the frame flow */
const GSelect = ({ value, onChange, options, disabled, placeholder = '—' }) => (
  <select
    className="lsa-power-grid__select"
    value={value}
    disabled={disabled}
    onChange={e => onChange(e.target.value)}
    style={disabled ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
  >
    <option value="">{placeholder}</option>
    {options.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
);

const ContactLensSelectModal = ({ lens, onClose, onAdd, asDrawer = false, actionMode = 'cart' }) => {
  const sphOpts = useMemo(() => buildPowers(lens.min_power, lens.max_power), [lens]);
  const perBox = lens.lenses_per_box || 30;
  const price = Number(lens.package_selling_price || lens.price || 0);

  const [later, setLater] = useState(false);
  const [hasCyl, setHasCyl] = useState((lens.power_type || '').toLowerCase() === 'toric');
  const [rOn, setROn] = useState(true);
  const [lOn, setLOn] = useState(true);
  const [f, setF] = useState({ rSph: '', rCyl: '', rAxis: '', rBox: '1', lSph: '', lCyl: '', lAxis: '', lBox: '1' });
  const set = (k) => (v) => setF(p => ({ ...p, [k]: v }));
  const [err, setErr] = useState('');

  const boxes = later ? 1 : ((rOn ? Number(f.rBox) || 0 : 0) + (lOn ? Number(f.lBox) || 0 : 0)) || 1;
  const total = price * boxes;

  const eyeStr = (sph, cyl, axis, box) => {
    let s = `SPH ${sph || '—'}`;
    if (hasCyl && cyl) s += ` CYL ${cyl}`;
    if (hasCyl && axis) s += ` AXIS ${axis}`;
    s += ` × ${box} box`;
    return s;
  };

  const submit = () => {
    if (later) {
      onAdd(lens, { mode: 'later', right: 'Power to be submitted later', left: '' }, 1);
      return;
    }
    if (!rOn && !lOn) { setErr('Select at least one eye.'); return; }
    if ((rOn && !f.rSph) || (lOn && !f.lSph)) { setErr('Select spherical (SPH) power for the chosen eye(s).'); return; }
    const power = { mode: 'manual' };
    if (rOn) power.right = eyeStr(f.rSph, f.rCyl, f.rAxis, f.rBox);
    if (lOn) power.left = eyeStr(f.lSph, f.lCyl, f.lAxis, f.lBox);
    onAdd(lens, power, boxes);
  };

  const outerStyle = asDrawer
    ? { position: 'fixed', inset: 0, background: 'rgba(4,2,5,0.5)', display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end', zIndex: 2000 }
    : { position: 'fixed', inset: 0, background: 'rgba(4,2,5,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 };
  const innerStyle = asDrawer
    ? { background: '#FEFCFF', width: '100%', maxWidth: 480, height: '100vh', overflowY: 'auto', fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: '-8px 0 32px rgba(16,24,40,0.18)', display: 'flex', flexDirection: 'column' }
    : { background: '#FEFCFF', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', flexDirection: 'column' };

  // Two eye rows built from the same template
  const EyeRow = ({ label, on, setOn, sph, cyl, axis, box }) => {
    const dis = !on || later;
    return (
      <div className="lsa-power-grid__row lsa-power-grid__row--border" style={{ alignItems: 'center' }}>
        <div className="lsa-power-grid__eye" style={{ flex: '0 0 70px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: later ? 'default' : 'pointer' }}>
            <input type="checkbox" checked={on} disabled={later} onChange={e => setOn(e.target.checked)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
            <Check on={on && !later} />
            <span className="lsa-power-grid__eye-main">{label}</span>
          </label>
        </div>
        <div className="lsa-power-grid__cell">
          <GSelect value={sph.value} onChange={sph.set} options={sphOpts} disabled={dis} />
        </div>
        {hasCyl && (
          <div className="lsa-power-grid__cell">
            <GSelect value={cyl.value} onChange={cyl.set} options={CYL} disabled={dis} />
          </div>
        )}
        {hasCyl && (
          <div className="lsa-power-grid__cell lsa-power-grid__cell--axis">
            <GSelect value={axis.value} onChange={axis.set} options={AXIS} disabled={dis} placeholder="0" />
          </div>
        )}
        <div className="lsa-power-grid__cell">
          <GSelect value={box.value} onChange={box.set} options={BOXES} disabled={dis} placeholder="1" />
        </div>
      </div>
    );
  };

  return (
    <div onClick={onClose} style={outerStyle}>
      <div onClick={e => e.stopPropagation()} style={innerStyle}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #EFEDF0' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#040205' }}>{lens.name || lens.package_name || 'Contact Lens'}</div>
            <div style={{ fontSize: 11, color: '#71717A' }}>{[lens.brand_name, lens.power_type].filter(Boolean).join(' · ')}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717A' }}><X size={20} /></button>
        </div>

        <div style={{ padding: 22, flex: 1 }}>
          {/* sub-heading */}
          <div className="lsa-manual-header" style={{ marginBottom: 14 }}>
            <h3 className="lsa-manual-title">Enter Power Manually</h3>
            <p className="lsa-manual-sub">Please provide your latest prescription details accurately.</p>
          </div>

          {/* toggle: cylindrical */}
          <div className="lsa-manual-toggles" style={{ marginBottom: 14 }}>
            <label className="lsa-manual-checkbox">
              <input type="checkbox" className="lsa-manual-checkbox__native" checked={hasCyl} disabled={later} onChange={e => setHasCyl(e.target.checked)} />
              <Check on={hasCyl} />
              <span className="lsa-manual-checkbox__label">I have cylindrical (CYL / AXIS) power</span>
            </label>
          </div>

          {/* power grid */}
          <div className="lsa-power-grid">
            <div className="lsa-power-grid__header">
              <div className="lsa-power-grid__hcell lsa-power-grid__hcell--eye" style={{ flex: '0 0 70px' }}>EYE</div>
              <div className="lsa-power-grid__hcell">SPH</div>
              {hasCyl && <div className="lsa-power-grid__hcell">CYL</div>}
              {hasCyl && <div className="lsa-power-grid__hcell lsa-power-grid__hcell--axis">AXIS</div>}
              <div className="lsa-power-grid__hcell">BOXES</div>
            </div>

            <EyeRow label="RIGHT" on={rOn} setOn={setROn}
              sph={{ value: f.rSph, set: set('rSph') }} cyl={{ value: f.rCyl, set: set('rCyl') }}
              axis={{ value: f.rAxis, set: set('rAxis') }} box={{ value: f.rBox, set: set('rBox') }} />
            <EyeRow label="LEFT" on={lOn} setOn={setLOn}
              sph={{ value: f.lSph, set: set('lSph') }} cyl={{ value: f.lCyl, set: set('lCyl') }}
              axis={{ value: f.lAxis, set: set('lAxis') }} box={{ value: f.lBox, set: set('lBox') }} />
          </div>

          <div style={{ fontSize: 11, color: '#9A94AC', marginTop: 8 }}>{perBox} lenses per box</div>

          {/* submit later */}
          <label className="lsa-manual-checkbox" style={{ marginTop: 16 }}>
            <input type="checkbox" className="lsa-manual-checkbox__native" checked={later} onChange={e => { setLater(e.target.checked); setErr(''); }} />
            <Check on={later} />
            <span className="lsa-manual-checkbox__label">I will submit my power later</span>
          </label>

          {err && <div style={{ fontSize: 12, color: '#DC2626', marginTop: 12 }}>{err}</div>}
        </div>

        {/* footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderTop: '1px solid #EFEDF0' }}>
          <div>
            <div style={{ fontSize: 11, color: '#71717A' }}>{boxes} box{boxes !== 1 ? 'es' : ''}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#040205' }}>₹{total.toLocaleString('en-IN')}</div>
          </div>
          <button onClick={submit} style={{ background: PURPLE, color: '#fff', border: 'none', borderRadius: 12, padding: '13px 30px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {actionMode === 'buy' ? 'Buy Now' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactLensSelectModal;
