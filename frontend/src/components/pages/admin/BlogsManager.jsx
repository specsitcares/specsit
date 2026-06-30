import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, UploadCloud } from 'lucide-react';
import apiClient from '../../../services/api';

const PURPLE = '#7F56D9';
const BORDER = '#D0D5DD';
const PAGE_SIZE = 5;
const inputStyle = { width: '100%', boxSizing: 'border-box', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', color: '#101828' };
const blank = () => ({ id: null, title: '', category: '', author: '', excerpt: '', content: '', status: 'draft', published_date: '', is_featured: false, _file: null });

const Toggle = ({ on, onChange, disabled }) => (
    <div onClick={() => !disabled && onChange(!on)} style={{ width: 40, height: 22, borderRadius: 11, background: on ? PURPLE : BORDER, position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .15s', boxShadow: '0 1px 2px rgba(16,24,40,.2)' }} />
    </div>
);
const Badge = ({ status }) => {
    const pub = status === 'published';
    return <span style={{ background: pub ? '#ECFDF3' : '#F2F4F7', color: pub ? '#027A48' : '#475467', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: pub ? '#12B76A' : '#98A2B3' }} />{pub ? 'Published' : 'Draft'}</span>;
};

const BlogsManager = () => {
    const navigate = useNavigate();
    const [section, setSection] = useState(null);
    const [title, setTitle] = useState('Latest from the Blog');
    const [maxVisible, setMaxVisible] = useState(4);
    const [sort, setSort] = useState('latest');
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const fileRef = useRef(null);

    const load = async () => {
        setLoading(true);
        try {
            const [secRes, blogRes] = await Promise.all([
                apiClient.get('/cms/home-sections/', { cache: false }),
                apiClient.get('/cms/blogs/', { cache: false }),
            ]);
            const sec = (secRes.data.results || secRes.data || []).find(s => s.key === 'our_blog');
            if (sec) { setSection(sec); setTitle(sec.title || 'Latest from the Blog'); setMaxVisible(sec.max_visible || 4); setSort(sec.sort || 'latest'); }
            setBlogs(blogRes.data.results || blogRes.data || []);
        } catch { /* toast */ } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const saveSection = async (statusVal) => {
        if (!section) return;
        await apiClient.patch(`/cms/home-sections/${section.id}/`, {
            title, max_visible: Number(maxVisible) || null, sort,
            is_published: statusVal === 'published', status: statusVal,
        });
    };

    const toggleFeatured = async (b) => {
        setBlogs(prev => prev.map(x => x.id === b.id ? { ...x, is_featured: !b.is_featured } : x));
        try { await apiClient.patch(`/cms/blogs/${b.id}/`, { is_featured: !b.is_featured }); }
        catch { setBlogs(prev => prev.map(x => x.id === b.id ? b : x)); }
    };

    const removeBlog = async (b) => {
        if (!window.confirm(`Delete "${b.title}"?`)) return;
        try { await apiClient.delete(`/cms/blogs/${b.id}/`); await load(); } catch { /* toast */ }
    };

    const saveBlog = async () => {
        if (!editing.title.trim()) return;
        setSaving(true);
        try {
            const fd = new FormData();
            ['title', 'category', 'author', 'excerpt', 'content', 'status'].forEach(f => fd.append(f, editing[f] ?? ''));
            fd.append('is_featured', !!editing.is_featured);
            if (editing.published_date) fd.append('published_date', editing.published_date);
            if (editing._file) fd.append('thumbnail', editing._file);
            if (editing.id) await apiClient.patch(`/cms/blogs/${editing.id}/`, fd);
            else await apiClient.post('/cms/blogs/', fd);
            setEditing(null);
            await load();
        } catch { /* toast */ } finally { setSaving(false); }
    };

    const totalPages = Math.max(1, Math.ceil(blogs.length / PAGE_SIZE));
    const paginated = blogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <div style={{ fontFamily: 'Roboto, sans-serif', padding: '24px 26px 90px' }}>
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 8 }}>
                <span style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/settings/cms')}>Homepage Management</span> &nbsp;›&nbsp; <span style={{ color: '#101828', fontWeight: 600 }}>Our Blog</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#101828' }}>Our Blog</h1>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#667085' }}>Manage and publish blog posts for the homepage.</p>
                </div>
                <button onClick={() => setEditing(blank())} style={{ display: 'flex', alignItems: 'center', gap: 6, background: PURPLE, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <Plus size={16} /> Add blog
                </button>
            </div>

            {/* Section Settings */}
            <div style={{ border: '1px solid #EAECF0', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#101828' }}>Section Settings</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 6 }}>Section Title</label>
                        <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 6 }}>Max Visible</label>
                        <input type="number" min="1" style={inputStyle} value={maxVisible} onChange={e => setMaxVisible(e.target.value)} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 6 }}>Sort Order</label>
                        <select style={{ ...inputStyle, background: '#fff' }} value={sort} onChange={e => setSort(e.target.value)}>
                            <option value="latest">Latest</option>
                            <option value="oldest">Oldest</option>
                            <option value="featured">Featured first</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Blog table */}
            <div style={{ border: '1px solid #EAECF0', borderRadius: 12, overflow: 'hidden' }}>
                {loading ? <div style={{ padding: 50, textAlign: 'center', color: '#667085' }}>Loading…</div> : blogs.length === 0 ? (
                    <div style={{ padding: 50, textAlign: 'center', color: '#98A2B3', fontSize: 13 }}>No blog posts yet. Click “Add blog”.</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #EAECF0' }}>
                                {['Thumbnail', 'Title', 'Category', 'Author', 'Date', 'Status', 'Featured', 'Actions'].map(c => (
                                    <th key={c} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{c}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.map(b => (
                                <tr key={b.id} style={{ borderBottom: '1px solid #F2F4F7' }}>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ width: 48, height: 36, borderRadius: 6, background: '#F2F4F7', overflow: 'hidden' }}>
                                            {b.thumbnail && <img src={b.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#101828', maxWidth: 320 }}>{b.title}</td>
                                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#475467' }}>{b.category || '—'}</td>
                                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#475467' }}>{b.author || '—'}</td>
                                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#667085', whiteSpace: 'nowrap' }}>{b.published_date ? new Date(b.published_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                                    <td style={{ padding: '12px 16px' }}><Badge status={b.status} /></td>
                                    <td style={{ padding: '12px 16px' }}><Toggle on={b.is_featured} onChange={() => toggleFeatured(b)} /></td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button onClick={() => setEditing({ ...blank(), ...b, published_date: b.published_date || '', _file: null })} title="Edit" style={{ width: 30, height: 30, border: `1px solid ${BORDER}`, borderRadius: 7, background: '#fff', cursor: 'pointer', color: '#475467', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil size={14} /></button>
                                            <button onClick={() => removeBlog(b)} title="Delete" style={{ width: 30, height: 30, border: '1px solid #FECACA', borderRadius: 7, background: '#FEF2F2', cursor: 'pointer', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {blogs.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #F2F4F7' }}>
                        <span style={{ fontSize: 13, color: '#667085' }}>Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, blogs.length)} of {blogs.length} posts</span>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 14px', border: `1px solid ${BORDER}`, borderRadius: 8, background: '#fff', fontSize: 13, fontWeight: 600, cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1, fontFamily: 'inherit' }}>Previous</button>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '6px 14px', border: 'none', borderRadius: 8, background: PURPLE, color: '#fff', fontSize: 13, fontWeight: 600, cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1, fontFamily: 'inherit' }}>Next</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #EAECF0', padding: '14px 26px', display: 'flex', justifyContent: 'flex-end', gap: 12, zIndex: 50 }}>
                <button onClick={() => navigate('/admin/settings/cms')} style={{ background: 'none', border: 'none', color: '#D92D20', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={() => saveSection('draft')} style={{ padding: '10px 18px', border: `1px solid ${BORDER}`, borderRadius: 8, background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Save as Draft</button>
                <button onClick={() => saveSection('published')} style={{ padding: '10px 20px', border: 'none', borderRadius: 8, background: PURPLE, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Publish Now</button>
            </div>

            {/* Add / edit blog modal */}
            {editing && (
                <div onClick={() => setEditing(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(16,24,40,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: 24, fontFamily: 'Roboto, sans-serif' }}>
                        <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>{editing.id ? 'Edit Blog' : 'Add Blog'}</h3>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 6 }}>Title</label>
                        <input style={{ ...inputStyle, marginBottom: 14 }} value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                            <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 6 }}>Category</label><input style={inputStyle} value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })} /></div>
                            <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 6 }}>Author</label><input style={inputStyle} value={editing.author} onChange={e => setEditing({ ...editing, author: e.target.value })} /></div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                            <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 6 }}>Date</label><input type="date" style={inputStyle} value={editing.published_date || ''} onChange={e => setEditing({ ...editing, published_date: e.target.value })} /></div>
                            <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 6 }}>Status</label><select style={{ ...inputStyle, background: '#fff' }} value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value })}><option value="draft">Draft</option><option value="published">Published</option></select></div>
                        </div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 6 }}>Excerpt</label>
                        <textarea rows={2} style={{ ...inputStyle, marginBottom: 14, resize: 'vertical' }} value={editing.excerpt} onChange={e => setEditing({ ...editing, excerpt: e.target.value })} />
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 6 }}>Content</label>
                        <textarea rows={4} style={{ ...inputStyle, marginBottom: 14, resize: 'vertical' }} value={editing.content} onChange={e => setEditing({ ...editing, content: e.target.value })} />
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 6 }}>Thumbnail</label>
                        <div onClick={() => fileRef.current?.click()} style={{ border: `1.5px dashed ${BORDER}`, borderRadius: 10, padding: (editing._file || editing.thumbnail) ? 0 : '22px', textAlign: 'center', cursor: 'pointer', background: '#F9FAFB', overflow: 'hidden', marginBottom: 16 }}>
                            {(editing._file || editing.thumbnail) ? <img src={editing._file ? URL.createObjectURL(editing._file) : editing.thumbnail} alt="" style={{ maxHeight: 140, maxWidth: '100%', objectFit: 'contain' }} /> : <><UploadCloud size={20} style={{ color: '#475467' }} /><div style={{ fontSize: 13, color: '#475467', marginTop: 6 }}>Drop image, or <span style={{ color: PURPLE, fontWeight: 600 }}>browse</span></div></>}
                            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setEditing({ ...editing, _file: e.target.files?.[0] || null })} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                            <Toggle on={editing.is_featured} onChange={v => setEditing({ ...editing, is_featured: v })} />
                            <span style={{ fontSize: 13, color: '#344054', fontWeight: 600 }}>Featured</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                            <button onClick={() => setEditing(null)} style={{ padding: '10px 16px', border: `1px solid ${BORDER}`, borderRadius: 8, background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                            <button onClick={saveBlog} disabled={saving || !editing.title.trim()} style={{ padding: '10px 18px', border: 'none', borderRadius: 8, background: PURPLE, color: '#fff', fontSize: 14, fontWeight: 600, cursor: (saving || !editing.title.trim()) ? 'not-allowed' : 'pointer', opacity: (saving || !editing.title.trim()) ? 0.7 : 1, fontFamily: 'inherit' }}>{saving ? 'Saving…' : 'Save Blog'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BlogsManager;
