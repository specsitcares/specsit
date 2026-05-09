import React, { useState } from 'react';
import BaseAdminTable from './BaseAdminTable';
import FormModal from './FormModal';
import apiClient from '../../../services/api';

const CMS_MODELS = [
    { key: 'announcement', label: 'Announcements', endpoint: '/cms/announcements/' },
    { key: 'hero', label: 'Hero Slides', endpoint: '/cms/hero-slides/' },
    { key: 'editorial', label: 'Editorial Sections', endpoint: '/cms/editorial-sections/' },
    { key: 'benefit', label: 'Benefits', endpoint: '/cms/benefits/' },
    { key: 'section_title', label: 'Section Titles', endpoint: '/cms/section-titles/' },
];

const CmsManagement = () => {
    const [activeModel, setActiveModel] = useState(CMS_MODELS[0]);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get(activeModel.endpoint);
            setData(res.data);
        } catch (err) {
            console.error('Failed to fetch CMS data', err);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData();
    }, [activeModel]);

    const getColumns = () => {
        switch (activeModel.key) {
            case 'announcement':
                return [
                    { label: 'Text', key: 'text' },
                    { label: 'Active', key: 'is_active' },
                ];
            case 'hero':
                return [
                    { label: 'Title', key: 'title' },
                    { label: 'Order', key: 'order' },
                    { label: 'Active', key: 'is_active' },
                ];
            case 'editorial':
                return [
                    { label: 'Title', key: 'title' },
                    { label: 'Order', key: 'order' },
                    { label: 'Active', key: 'is_active' },
                ];
            case 'benefit':
                return [
                    { label: 'Title', key: 'title' },
                    { label: 'Order', key: 'order' },
                ];
            case 'section_title':
                return [
                    { label: 'Section', key: 'section_key' },
                    { label: 'Title', key: 'title' },
                ];
            default:
                return [];
        }
    };

    const renderRow = (item, idx) => (
        <tr key={item.id || idx} style={{ borderBottom: '1px solid #EAECF0' }}>
            <td style={{ padding: '16px 24px' }}><input type="checkbox" /></td>
            {getColumns().map(col => (
                <td key={col.key} style={{ padding: '16px 24px', fontSize: '11px', color: '#475467' }}>
                    {String(item[col.key] ?? '')}
                </td>
            ))}
            <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                <button 
                    onClick={() => { setEditingItem(item); setShowModal(true); }}
                    style={{ color: '#7F56D9', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer' }}
                >
                    Edit
                </button>
            </td>
        </tr>
    );

    return (
        <div className="cms-management-container" style={{ padding: '26px' }}>
            <div style={{ marginBottom: '19px', display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
                {CMS_MODELS.map(model => (
                    <button
                        key={model.key}
                        onClick={() => setActiveModel(model)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: activeModel.key === model.key ? '1px solid #7F56D9' : '1px solid #D0D5DD',
                            backgroundColor: activeModel.key === model.key ? '#F9F5FF' : '#fff',
                            color: activeModel.key === model.key ? '#7F56D9' : '#344054',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {model.label}
                    </button>
                ))}
            </div>

            <BaseAdminTable
                title={activeModel.label}
                subtitle="CMS Content"
                data={data}
                loading={loading}
                columns={[...getColumns(), { label: 'Actions', key: 'actions', align: 'right' }]}
                renderRow={renderRow}
                onAdd={() => { setEditingItem(null); setShowModal(true); }}
                addLabel={`Add ${activeModel.label.slice(0, -1)}`}
            />

            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', padding: '26px', borderRadius: '13px', width: '100%', maxWidth: '400px' }}>
                        <h3 style={{ marginBottom: '19px' }}>{editingItem ? 'Edit' : 'Add'} {activeModel.label}</h3>
                        <p style={{ color: '#667085', fontSize: '11px', marginBottom: '19px' }}>
                            Full CRUD coming soon. For now, please use the Django Admin for deep edits.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={() => setShowModal(false)} style={{ padding: '10px 16px', border: '1px solid #D0D5DD', borderRadius: '6px', background: '#fff' }}>Cancel</button>
                            <a 
                                href="/admin-django/" 
                                target="_blank" 
                                style={{ padding: '10px 16px', background: '#7F56D9', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 }}
                            >
                                Open Django Admin
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CmsManagement;
