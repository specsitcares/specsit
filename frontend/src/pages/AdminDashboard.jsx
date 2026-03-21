import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/admin.css';

const AdminDashboard = () => {
    const [activeApp, setActiveApp] = useState('Catalog');
    const [subView, setSubView] = useState('Overview');
    const [loading, setLoading] = useState(false);

    // Core data hooks
    const [stats, setStats] = useState({ revenue: 0, orders: 0, stock: 0 });

    const apps = [
        { name: 'Core', icon: '📊', views: ['Dashboard', 'Analytics', 'System Config'] },
        { name: 'Catalog', icon: '🕶️', views: ['Products', 'Inventory', 'Brands', 'Addons', 'Categories'] },
        { name: 'Sales', icon: '💰', views: ['Orders', 'Coupons', 'Cart Logs', 'Wishlists'] },
        { name: 'Operations', icon: '🚚', views: ['Shipments', 'Payments', 'Prescriptions'] },
        { name: 'Customer', icon: '🤝', views: ['Reviews', 'Queries', 'Employees', 'Geolocation'] },
    ];

    useEffect(() => {
        // Initial sync
    }, []);

    const renderNavbar = () => (
        <header className="admin-navbar">
            <div className="navbar-brand">
                <div className="navbar-logo">S</div>
                <h1>SPECTSQ<span className="logo-accent">HQ</span></h1>
            </div>

            <nav className="navbar-menu">
                {apps.map(app => (
                    <button
                        key={app.name}
                        onClick={() => { setActiveApp(app.name); setSubView(app.views[0]); }}
                        className={`nav-link ${activeApp === app.name ? 'active' : ''}`}
                    >
                        {app.icon} {app.name}
                    </button>
                ))}
            </nav>

            <div className="navbar-status">
                <span>STATUS: <span className="status-online">ONLINE</span></span>
                <div className="user-avatar"></div>
            </div>
        </header>
    );

    const renderSubNav = () => (
        <div className="admin-subnav">
            {apps.find(a => a.name === activeApp)?.views.map(view => (
                <button
                    key={view}
                    onClick={() => setSubView(view)}
                    className={`subnav-link ${subView === view ? 'active' : ''}`}
                >
                    {view}
                </button>
            ))}
        </div>
    );

    return (
        <div className="admin-layout">
            {renderNavbar()}
            {renderSubNav()}

            <main className="admin-main">
                <div className="admin-header">
                    <h2>{activeApp} <span className="header-accent">/</span> {subView}</h2>
                    <p>System Command Portal - Real-time Data Sync Active</p>
                </div>

                {/* Dashboard / Analytics View */}
                {activeApp === 'Core' && subView === 'Dashboard' && (
                    <div className="stats-grid">
                        {[
                            { label: 'GROSS REVENUE', value: '$124,500', trend: '+12%', color: '#22c55e' },
                            { label: 'ACTIVE MISSIONS', value: '42', trend: '-2', color: '#f59e0b' },
                            { label: 'UNIQUE VISITORS', value: '1,280', trend: '+240', color: '#0ea5e9' },
                            { label: 'STOCK HEALTH', value: '94%', trend: 'STABLE', color: '#6366f1' }
                        ].map((card, i) => (
                            <div key={i} className="stat-card">
                                <div className="stat-header">
                                    <span className="stat-label">{card.label}</span>
                                    <span className="stat-trend" style={{ color: card.color }}>{card.trend}</span>
                                </div>
                                <div className="stat-value">{card.value}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Generic Table Placeholder for other views */}
                {!(activeApp === 'Core' && subView === 'Dashboard') && (
                    <div className="admin-table-card">
                        <div className="table-toolbar">
                            <div className="table-search-group">
                                <input placeholder={`Search ${subView}...`} className="table-search" />
                                <select className="table-actions">
                                    <option>Bulk Actions</option>
                                </select>
                            </div>
                            <button className="premium-btn">+ New {subView.slice(0, -1)}</button>
                        </div>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Entity Name</th>
                                        <th>Status</th>
                                        <th>Last Updated</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <tr key={i}>
                                            <td className="table-id">#00{i}</td>
                                            <td className="table-name">{subView} Record Entry {i}</td>
                                            <td><span className="table-badge">ACTIVE</span></td>
                                            <td className="table-date">2024-03-10</td>
                                            <td><button className="table-action">MODIFY</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminDashboard;
