import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

const Layout = () => {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />
            <main style={{ flex: '1 0 auto', padding: '20px' }}>
                <Outlet />
            </main>
            <Footer />
        </div>
    );
};

export default Layout;
