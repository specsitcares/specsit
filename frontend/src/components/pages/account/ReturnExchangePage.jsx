import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../../../services/api';
import AccountSidebar from './AccountSidebar';
import '../../../styles/return_exchange.css';

const STEPS = ['Select Type', 'Choose Product', 'Pickup Details', 'Confirm'];
const TIME_SLOTS = ['9 AM – 12 PM', '12 PM – 3 PM', '3 PM – 6 PM', '6 PM – 9 PM'];

// Figma reasons → backend ReturnRequest.reason enum
const REASONS = [
  { id: 'damaged', label: 'Product damaged or defective upon arrival', sub: 'Item received broken or with a manufacturing fault', reason: 'defective' },
  { id: 'incorrect', label: 'Incorrect item sent', sub: 'Product received does not match this order', reason: 'wrong_item' },
  { id: 'delayed', label: 'Delivery delayed beyond the promised date', sub: 'Package delivered later than the expected timeframe', reason: 'other' },
  { id: 'packaging', label: 'Packaging damaged during shipment', sub: 'Box crushed causing damage to the contents', reason: 'defective' },
  { id: 'accessories', label: 'Accessories missing from the package', sub: 'Package lacks essential parts or components', reason: 'other' },
];

const inr = (v) => `₹${parseFloat(v || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const ReturnExchangePage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState(null);

  const [type, setType] = useState('replacement'); // refund | replacement
  const [tab, setTab] = useState('same');           // same | browse
  const [colour, setColour] = useState('');
  const [size, setSize] = useState('');
  const [lens, setLens] = useState('');
  const [reasonId, setReasonId] = useState('damaged');
  const [pickupDay, setPickupDay] = useState(0);
  const [slot, setSlot] = useState(TIME_SLOTS[0]);
  const [notes, setNotes] = useState('');
  const [bankInfo, setBankInfo] = useState(null); // saved bank account from /accounts/me/
  const [photos, setPhotos] = useState([]); // File[]
  const [photoErr, setPhotoErr] = useState(null);
  const photoInputRef = React.useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false); // inline catalog iframe (browse exchange)

  // The embedded catalog iframe posts back when the exchange is placed — take the
  // customer to their order from the top window.
  useEffect(() => {
    const onMsg = (e) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'lo-exchange-done') navigate(`/orders/${orderId}`);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [orderId]);

  // The line item being returned/exchanged (defaults to the only/first item).
  const item = (order?.items || []).find(i => String(i.id) === String(selectedItemId)) || (order?.items || [])[0] || {};
  const multiItem = (order?.items || []).length > 1;

  useEffect(() => {
    let alive = true;
    apiClient.get(`/sales/orders/${orderId}/`)
      .then(res => {
        if (!alive) return;
        setOrder(res.data);
        setSelectedItemId(prev => prev ?? (res.data.items || [])[0]?.id ?? null);
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    // A saved bank account is a prerequisite for any return/exchange — send the
    // customer to add one first, then bring them right back here.
    apiClient.get('/accounts/me/')
      .then(res => {
        if (!alive) return;
        setBankInfo(res.data);
        if (!res.data.has_bank_account) {
          navigate(`/account-info?next=${encodeURIComponent(`/orders/${orderId}/return`)}&reason=return`, { replace: true });
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [orderId]);

  // Fetch the product for the SELECTED item so exchange options come from its variants.
  useEffect(() => {
    let alive = true;
    const pid = item?.product_id;
    if (!pid) { setProduct(null); return; }
    apiClient.get(`/catalog/products/${pid}/`)
      .then(pr => { if (alive) setProduct(pr.data); })
      .catch(() => { if (alive) setProduct(null); });
    return () => { alive = false; };
  }, [item?.product_id]);

  // Reset the exchange selections whenever the chosen item changes, so they reseed.
  useEffect(() => { setColour(''); setSize(''); setLens(''); }, [selectedItemId]);

  // Seed exchange selections from the originally-ordered variant / first available option
  useEffect(() => {
    if (!product || !order) return;
    const variants = product.variants || [];
    const it = item;
    const orig = variants.find(v => String(v.id) === String(it.variant));
    const sizes = new Set();
    variants.forEach(v => Object.keys(v.stock_by_size || {}).forEach(k => sizes.add(k)));
    setColour(c => c || orig?.color || orig?.frame_color || variants[0]?.color || variants[0]?.frame_color || '');
    setSize(s => s || [...sizes][0] || '');
    setLens(l => l || orig?.lens_color || variants.find(v => v.lens_color)?.lens_color || '');
  }, [product, order]);

  const pickupDays = Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + 1 + i);
    return { label: i === 0 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short' }), sub: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }), date: d };
  });

  if (loading) {
    return (
      <div className="account-page"><div className="account-body">
        <AccountSidebar active="orders" />
        <div className="account-content"><div style={{ padding: 80, textAlign: 'center', color: '#98a2b3' }}>Loading…</div></div>
      </div></div>
    );
  }
  if (!order) {
    return (
      <div className="account-page"><div className="account-body">
        <AccountSidebar active="orders" />
        <div className="account-content"><div style={{ padding: 80, textAlign: 'center', color: '#d92d20' }}>Order not found.</div></div>
      </div></div>
    );
  }

  const addr = order.shipping_address_detail || {};
  const orderLabel = `#LO-${String(order.id).padStart(7, '0')}`;
  const isExchange = type === 'replacement';
  // COD / partial orders have no original online instrument to credit back to,
  // so a cash refund is paid out to the customer's saved bank account.
  const isOnlineOnly = ['complete_online', 'ONLINE'].includes(order.payment_method);
  const needsRefundDestination = !isExchange && !isOnlineOnly;
  const hasBankAccount = !!bankInfo?.has_bank_account;
  const maskedAcct = bankInfo?.bank_account_number
    ? `•••• ${String(bankInfo.bank_account_number).slice(-4)}` : '';
  // order_status can lag behind actual delivery — trust the authoritative flag plus
  // any other delivered signal (tracking / delivery_date / all items delivered).
  const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, '_');
  const isDelivered = order.is_delivered
    || norm(order.order_status) === 'delivered'
    || norm(order.tracking?.current_status) === 'delivered'
    || !!order.delivery_date
    || ((order.items || []).length > 0 && (order.items || []).every(it => norm(it.status) === 'delivered'));
  const existing = (order.return_requests || [])[0];

  const productName = item.variant_name || 'Product';
  const brandName = item.brand_name || product?.brand_display_name || '';

  // Real exchange options derived from the product's variants
  const variants = product?.variants || [];
  const colourOpts = [];
  const seenColour = new Set();
  variants.forEach(v => {
    const name = v.color || v.frame_color;
    if (name && !seenColour.has(name)) {
      seenColour.add(name);
      colourOpts.push({ name, hex: v.color_code || '#cbd2d9', price: Number(v.selling_price || v.base_price || 0) });
    }
  });
  const sizeSet = new Set();
  variants.forEach(v => Object.keys(v.stock_by_size || {}).forEach(s => sizeSet.add(s)));
  const sizeOpts = [...sizeSet];
  const lensSet = new Set();
  variants.forEach(v => { if (v.lens_color) lensSet.add(v.lens_color); });
  const lensOpts = [...lensSet];

  const origPrice = Number(item.unit_price || item.price_at_purchase || 0);
  const selectedColour = colourOpts.find(c => c.name === colour);
  const newPrice = selectedColour ? selectedColour.price : origPrice;
  const priceDiff = Math.round(newPrice - origPrice);
  const priceDiffLabel = priceDiff === 0 ? 'No extra charge' : (priceDiff > 0 ? `+${inr(priceDiff)}` : `− ${inr(Math.abs(priceDiff))}`);

  const selectionParts = [colour, size && `Size ${size}`, lens].filter(Boolean);
  const newItemDesc = `${productName}${selectionParts.length ? ` (${[colour, size, lens].filter(Boolean).join(' / ')})` : ''}`;

  const addPhotos = (fileList) => {
    setPhotoErr(null);
    const incoming = Array.from(fileList || []);
    const next = [...photos];
    for (const f of incoming) {
      if (next.length >= 5) { setPhotoErr('You can upload up to 5 photos.'); break; }
      if (!/^image\/(jpeg|png)$/.test(f.type)) { setPhotoErr('Only JPG or PNG images are allowed.'); continue; }
      if (f.size > 5 * 1024 * 1024) { setPhotoErr('Each photo must be 5 MB or smaller.'); continue; }
      next.push(f);
    }
    setPhotos(next);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };
  const removePhoto = (idx) => setPhotos(photos.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!isDelivered) { setError('Returns & exchanges are available only after delivery.'); return; }
    if (!hasBankAccount) {
      setError('Please add a bank account in your Account Information before requesting a return or exchange.');
      return;
    }
    const chosen = REASONS.find(r => r.id === reasonId);
    const day = pickupDays[pickupDay];
    const desc = isExchange
      ? `Exchange request. New selection: ${colour} / Size ${size} / ${lens}. Reason: ${chosen.label}. Pickup: ${day.label} ${fmtDate(day.date)}, ${slot}.${notes ? ` Notes: ${notes}` : ''}`
      : `Return for refund. Reason: ${chosen.label}. Pickup: ${day.label} ${fmtDate(day.date)}, ${slot}.${notes ? ` Notes: ${notes}` : ''}`;

    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('request_type', type);
      if (item.id) fd.append('order_item_id', item.id);
      fd.append('reason', chosen.reason);
      fd.append('description', desc);
      if (isExchange) {
        fd.append('replacement_sku', `${colour}/${size}/${lens}`);
        if (priceDiff > 0) fd.append('replacement_price_difference', String(priceDiff));
      }
      photos.forEach(p => fd.append('photos', p));
      await apiClient.post(`/sales/orders/${orderId}/request_return/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess(true);
    } catch (e) {
      setError(e.response?.data?.detail || 'Could not submit your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /* Step indicator progress */
  const stepDone = [true, isExchange ? !!(colour && size && lens) : true, !!slot, false];
  const currentStep = success ? 4 : (isExchange ? 1 : 2);

  return (
    <div className="account-page">
      <div className="account-body">
        <AccountSidebar active="orders" />
        <div className="account-content">
          <div className="rx-wrap">

            <div className="rx-crumbs">
              <Link to="/orders">Orders</Link><span>/</span>
              <Link to={`/orders/${orderId}`}>Order Details</Link><span>/</span>
              <span className="active">Return and Exchange</span>
            </div>
            <h1 className="rx-title">Return or Exchange</h1>

            {/* Step indicator */}
            <div className="rx-steps">
              {STEPS.map((label, i) => (
                <React.Fragment key={label}>
                  <div className="rx-step">
                    <div className={`rx-step-dot ${i < currentStep ? 'done' : ''} ${i === currentStep ? 'active' : ''}`}>{i + 1}</div>
                    <span className={`rx-step-label ${i <= currentStep ? 'active' : ''}`}>{label}</span>
                  </div>
                  {i < STEPS.length - 1 && <div className={`rx-step-line ${i < currentStep ? 'done' : ''}`} />}
                </React.Fragment>
              ))}
            </div>

            {success ? (
              <div className="rx-card">
                <div className="rx-success">
                  <div className="rx-success-emoji">✅</div>
                  <p className="rx-success-title">{isExchange ? 'Exchange' : 'Return'} request submitted</p>
                  <p className="rx-success-sub">We've received your request for order {orderLabel}. Our team will review it and arrange pickup.</p>
                  <button className="rx-btn rx-btn--primary" onClick={() => navigate(`/orders/${orderId}`)}>Back to Order</button>
                </div>
              </div>
            ) : (
              <>
                {/* Item picker — when the order has more than one item */}
                {multiItem && (
                  <div className="rx-card">
                    <h3 className="rx-card-title">Which item?</h3>
                    <p className="rx-card-sub">This order has multiple items. Choose the one you'd like to return or exchange.</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {(order.items || []).map(it => {
                        const active = String(it.id) === String(selectedItemId);
                        const price = Number(it.unit_price || it.price_at_purchase || 0);
                        return (
                          <button key={it.id} type="button" onClick={() => setSelectedItemId(it.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', padding: 12, borderRadius: 10, cursor: 'pointer', background: active ? '#f9f5ff' : '#fff', border: `1px solid ${active ? '#68408d' : '#e5e7eb'}` }}>
                            <span style={{ width: 18, height: 18, borderRadius: 9, flexShrink: 0, border: `2px solid ${active ? '#68408d' : '#d1d5db'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {active && <span style={{ width: 9, height: 9, borderRadius: 5, background: '#68408d' }} />}
                            </span>
                            <span style={{ width: 46, height: 46, borderRadius: 8, overflow: 'hidden', background: '#f3f4f6', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {it.variant_image ? <img src={it.variant_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 20 }}>👓</span>}
                            </span>
                            <span style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#101828' }}>{it.variant_name || it.variant_sku || 'Item'}</span>
                              <span style={{ display: 'block', fontSize: 12, color: '#667085' }}>{it.variant_sku || ''}{it.quantity > 1 ? ` · Qty ${it.quantity}` : ''}</span>
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#101828', whiteSpace: 'nowrap' }}>{inr(price)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Product */}
                <div className="rx-card rx-prod">
                  <div className="rx-prod-inner">
                    <div className="rx-prod-img">
                      {item.variant_image ? <img src={item.variant_image} alt={productName} /> : <span style={{ fontSize: 26 }}>👓</span>}
                    </div>
                    <div>
                      {brandName && <span className="rx-prod-brand">{brandName}</span>}
                      <h3 className="rx-prod-name">{productName}</h3>
                      <p className="rx-prod-meta">Order {orderLabel}{order.delivery_date ? ` · Delivered ${fmtDate(order.delivery_date)}` : ''}</p>
                    </div>
                    {isDelivered && <span className="rx-prod-badge">DELIVERED</span>}
                  </div>
                </div>

                {existing && (
                  <div className="rx-policy" style={{ background: '#f4ebff', borderColor: '#e9d7fe' }}>
                    <p className="rx-policy-title" style={{ color: '#42307d' }}>A request already exists for this order</p>
                    <p className="rx-policy-text" style={{ color: '#68408d' }}>
                      {existing.request_type === 'replacement' ? 'Exchange' : 'Return'} · {existing.status}. Submitting again may be rejected.
                    </p>
                  </div>
                )}

                {/* Bank account is required for any return or exchange */}
                {!hasBankAccount && (
                  <div className="rx-policy" style={{ background: '#fffaeb', borderColor: '#fedf89' }}>
                    <p className="rx-policy-title" style={{ color: '#b54708' }}>Add a bank account to continue</p>
                    <p className="rx-policy-text" style={{ color: '#b54708' }}>
                      Returns and exchanges require a bank account on your profile — refunds are sent there. <Link to="/account-info" style={{ color: '#68408d', fontWeight: 600 }}>Add bank account →</Link>
                    </p>
                  </div>
                )}

                {/* What would you like to do */}
                <div className="rx-card">
                  <h3 className="rx-card-title">What would you like to do?</h3>
                  <p className="rx-card-sub">Choose return for refund or exchange for a different product.</p>
                  <div className="rx-choices">
                    <button type="button" className={`rx-choice ${type === 'refund' ? 'active' : ''}`} onClick={() => setType('refund')}>
                      <span className="rx-radio" />
                      <span>
                        <span className="rx-choice-label">Return for Refund</span>
                        <span className="rx-choice-desc">Get your money back to the original payment method</span>
                        <span className="rx-choice-note">Refund in 5–7 business days</span>
                      </span>
                    </button>
                    <button type="button" className={`rx-choice ${type === 'replacement' ? 'active' : ''}`} onClick={() => setType('replacement')}>
                      <span className="rx-radio" />
                      <span>
                        <span className="rx-choice-label">Exchange for Another Product</span>
                        <span className="rx-choice-desc">Swap for a different colour, frame size, or lens type</span>
                        <span className="rx-choice-note">Exchange within 15 days of delivery</span>
                      </span>
                    </button>
                  </div>
                </div>

                {/* Refund destination — COD/partial orders are refunded to the saved bank account */}
                {needsRefundDestination && hasBankAccount && (
                  <div className="rx-card">
                    <h3 className="rx-card-title">Refund Destination</h3>
                    <p className="rx-card-sub">This order was paid by Cash on Delivery, so your {inr(order.total_amount)} refund will be transferred to your saved bank account.</p>
                    {hasBankAccount ? (
                      <div className="rx-selbanner" style={{ background: '#f6fef9', borderColor: '#a6f4c5' }}>
                        <div>
                          <div className="rx-selbanner-title">{bankInfo.bank_account_name}{bankInfo.bank_name ? ` · ${bankInfo.bank_name}` : ''}</div>
                          <div className="rx-selbanner-text">A/C {maskedAcct} · IFSC {bankInfo.bank_ifsc}</div>
                        </div>
                        <Link to="/account-info" className="rx-selbanner-right" style={{ color: '#68408d', fontWeight: 600 }}>Change</Link>
                      </div>
                    ) : (
                      <div className="rx-policy" style={{ background: '#fffaeb', borderColor: '#fedf89' }}>
                        <p className="rx-policy-title" style={{ color: '#b54708' }}>No bank account on file</p>
                        <p className="rx-policy-text" style={{ color: '#b54708' }}>
                          Add a bank account to receive your refund. <Link to="/account-info" style={{ color: '#68408d', fontWeight: 600 }}>Add bank account →</Link>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Choose new product (exchange only) */}
                {isExchange && (
                  <div className="rx-card">
                    <h3 className="rx-card-title">Choose Your New Product</h3>
                    <p className="rx-card-sub">Select what you'd like instead — same model with different options, or pick something new.</p>
                    <div className="rx-tabs">
                      <button className={`rx-tab ${tab === 'same' ? 'active' : ''}`} onClick={() => setTab('same')}>Same Model, Different Options</button>
                      <button className={`rx-tab ${tab === 'browse' ? 'active' : ''}`} onClick={() => setTab('browse')}>Browse Different Products</button>
                    </div>

                    {tab === 'browse' ? (
                      <>
                        <p style={{ fontSize: 13, color: '#667085', marginBottom: 12 }}>
                          Prefer a completely different frame? Browse the catalog below — only items priced ₹{Math.round(origPrice).toLocaleString('en-IN')} or above are shown. Pick one, pay any difference, and you're done — all right here.
                        </p>
                        {catalogOpen ? (
                          <iframe
                            title="Browse catalog"
                            src={`/products?replace_order=${orderId}&min_price=${Math.round(origPrice)}&order_item=${item.id}&embed=1`}
                            style={{ width: '100%', height: '72vh', border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff' }}
                          />
                        ) : (
                          <button type="button" className="rx-btn rx-btn--primary" style={{ maxWidth: 240 }} onClick={() => setCatalogOpen(true)}>Browse the catalog →</button>
                        )}
                      </>
                    ) : colourOpts.length === 0 && sizeOpts.length === 0 ? (
                      <p style={{ fontSize: 13, color: '#667085' }}>
                        No alternate options are available for this product. Use <strong>Browse Different Products</strong> to pick another frame.
                      </p>
                    ) : (
                      <>
                        {colourOpts.length > 0 && (
                          <div className="rx-group">
                            <div className="rx-group-label">Frame Colour</div>
                            <div className="rx-swatches">
                              {colourOpts.map(c => (
                                <button key={c.name} type="button" className={`rx-swatch ${colour === c.name ? 'active' : ''}`} onClick={() => setColour(c.name)}>
                                  <span className="rx-swatch-dot" style={{ background: c.hex }} />
                                  <span className="rx-swatch-name">{c.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {sizeOpts.length > 0 && (
                          <div className="rx-group">
                            <div className="rx-group-label">Frame Size</div>
                            <div className="rx-pills">
                              {sizeOpts.map(s => (
                                <button key={s} type="button" className={`rx-pill ${size === s ? 'active' : ''}`} onClick={() => setSize(s)}>
                                  <div className="rx-pill-main">{s}</div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {lensOpts.length > 0 && (
                          <div className="rx-group">
                            <div className="rx-group-label">Lens Colour</div>
                            <div className="rx-lens-grid">
                              {lensOpts.map(name => (
                                <button key={name} type="button" className={`rx-lens ${lens === name ? 'active' : ''}`} onClick={() => setLens(name)}>
                                  <div className="rx-lens-main">{name}</div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="rx-selbanner">
                          <div>
                            <div className="rx-selbanner-title">Your exchange selection</div>
                            <div className="rx-selbanner-text">{[productName, ...selectionParts].filter(Boolean).join(' · ')}</div>
                          </div>
                          <span className="rx-selbanner-right">{priceDiffLabel}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Reason */}
                <div className="rx-card">
                  <h3 className="rx-card-title">Reason for {isExchange ? 'Exchange' : 'Return'}</h3>
                  <p className="rx-card-sub">Tell us why you'd like to {isExchange ? 'exchange' : 'return'} this product.</p>
                  <div className="rx-reasons">
                    {REASONS.map(r => (
                      <button key={r.id} type="button" className={`rx-choice rx-reason ${reasonId === r.id ? 'active' : ''}`} onClick={() => setReasonId(r.id)}>
                        <span className="rx-radio" />
                        <span>
                          <span className="rx-choice-label">{r.label}</span>
                          <span className="rx-choice-desc">{r.sub}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Support your request — photos + description */}
                <div className="rx-card">
                  <h3 className="rx-card-title">Support Your Request</h3>
                  <p className="rx-card-sub">Add photos of the issue and describe the problem (optional but recommended)</p>

                  <input ref={photoInputRef} type="file" accept="image/jpeg,image/png" multiple
                    style={{ display: 'none' }} onChange={e => addPhotos(e.target.files)} />
                  <button type="button" className="rx-upload" onClick={() => photoInputRef.current?.click()}>
                    <span className="rx-upload-icon">🖼️</span>
                    <span>
                      <span className="rx-upload-title">Upload photos of the issue</span>
                      <span className="rx-upload-sub">JPG, PNG · Max 5 MB each · Up to 5 photos</span>
                    </span>
                  </button>

                  {photos.length > 0 && (
                    <div className="rx-thumbs">
                      {photos.map((p, i) => (
                        <div key={i} className="rx-thumb">
                          <img src={URL.createObjectURL(p)} alt={`photo ${i + 1}`} />
                          <button type="button" className="rx-thumb-x" onClick={() => removePhoto(i)}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {photoErr && <p className="rx-error" style={{ marginTop: 8 }}>{photoErr}</p>}

                  <textarea className="rx-desc" value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Describe the issue in detail (e.g. right lens scratched on arrival, frame bent at hinge)…" rows={3} />
                </div>

                {/* Pickup & re-delivery */}
                <div className="rx-card">
                  <h3 className="rx-card-title">Pickup &amp; Re-delivery</h3>
                  <p className="rx-card-sub">We'll collect your current item and {isExchange ? 'deliver the new one' : 'process your refund'}.</p>
                  <div className="rx-addr-cols">
                    <div className="rx-addr">
                      <p className="rx-addr-head rx-addr-head--from">📦 Pickup From</p>
                      <p className="rx-addr-name">{addr.full_name || order.customer_name}</p>
                      <p className="rx-addr-line">{addr.street}<br />{[addr.city, addr.state].filter(Boolean).join(', ')} {addr.pin_code}</p>
                    </div>
                    {isExchange && (
                      <div className="rx-addr rx-addr--to">
                        <p className="rx-addr-head rx-addr-head--to">🚚 Deliver New Item To</p>
                        <p className="rx-addr-name">{addr.full_name || order.customer_name}</p>
                        <p className="rx-addr-line">{addr.street}<br />{[addr.city, addr.state].filter(Boolean).join(', ')} {addr.pin_code}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Schedule pickup */}
                <div className="rx-card">
                  <h3 className="rx-card-title">Schedule Pickup</h3>
                  <p className="rx-card-sub">Select your preferred pickup date and time slot.</p>
                  <div className="rx-pills" style={{ marginBottom: 14 }}>
                    {pickupDays.map((d, i) => (
                      <button key={i} type="button" className={`rx-pill ${pickupDay === i ? 'active' : ''}`} onClick={() => setPickupDay(i)}>
                        <div className="rx-pill-main">{d.label}</div>
                        <div className="rx-pill-sub">{d.sub}</div>
                      </button>
                    ))}
                  </div>
                  <div className="rx-pills">
                    {TIME_SLOTS.map(s => (
                      <button key={s} type="button" className={`rx-pill ${slot === s ? 'active' : ''}`} onClick={() => setSlot(s)} style={{ minWidth: 110 }}>
                        <div className="rx-pill-main" style={{ fontSize: 13 }}>{s}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Policy */}
                <div className="rx-policy">
                  <p className="rx-policy-title">{isExchange ? 'Exchange' : 'Return'} Policy</p>
                  <p className="rx-policy-text">
                    {isExchange
                      ? 'Exchanges are allowed within 15 days of delivery. Items must be unused, in their original packaging, and include all accessories. Prescription lenses can only be exchanged if they are defective.'
                      : 'Returns are accepted within 10 days of delivery. Items must be unused and in their original packaging. Refunds are issued to your original payment method within 5–7 business days.'}
                  </p>
                </div>

                {/* Summary */}
                <div className="rx-card">
                  <h3 className="rx-card-title">{isExchange ? 'Exchange' : 'Return'} Summary</h3>
                  <div style={{ marginTop: 10 }}>
                    <div className="rx-sum-row"><span>Original Item</span><span>{productName}</span></div>
                    {isExchange
                      ? <>
                          <div className="rx-sum-row"><span>New Item</span><span>{newItemDesc}</span></div>
                          <div className="rx-sum-row"><span>Price Difference</span><span className={priceDiff <= 0 ? 'rx-free' : ''}>{priceDiff === 0 ? '₹0 · Same price variant' : priceDiffLabel}</span></div>
                        </>
                      : <div className="rx-sum-row"><span>Refund Amount</span><span>{inr(order.total_amount)}</span></div>}
                  </div>
                </div>

                {/* Actions */}
                <div className="rx-actions">
                  {error && <span className="rx-error">{error}</span>}
                  <button className="rx-btn rx-btn--primary" onClick={handleSubmit} disabled={submitting || !hasBankAccount}>
                    {submitting ? 'Submitting…' : `Confirm ${isExchange ? 'Exchange' : 'Return'} Request`}
                  </button>
                  <button className="rx-btn rx-btn--ghost" onClick={() => navigate(`/orders/${orderId}`)}>Cancel</button>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default ReturnExchangePage;
