import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer style={{ borderTop: '2px solid #000', padding: '50px 0', marginTop: '100px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '40px' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>SPECTSIT</h2>
                    <p>Experience the next gen vision ops. High grade precision frames for every mission.</p>
                </div>
                <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>QUICK LINKS</h3>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        <li><Link to="/">Home</Link></li>
                        <li><Link to="/products">Catalog</Link></li>
                        <li><Link to="/admin">Admin</Link></li>
                    </ul>
                </div>
                <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>SUPPORT</h3>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        <li><Link to="/shipping">Shipping Focus</Link></li>
                        <li><Link to="/returns">Return Ops</Link></li>
                    </ul>
                </div>
                <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>STAY SYNCED</h3>
                    <input type="email" placeholder="Mission Email" style={{ padding: '10px', width: '100%', marginBottom: '10px' }} />
                    <button style={{ padding: '10px 20px', width: '100%' }}>JOIN SQUAD</button>
                </div>
            </div>
            <p style={{ marginTop: '50px', fontSize: '12px', color: '#666' }}>© 2024 SPECTSIT LABS. ALL CORE SYSTEMS STABLE.</p>
        </footer>
    );
};

export default Footer;
