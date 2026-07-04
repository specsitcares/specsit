import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Bold, Italic, Underline, Heading1, Heading2, Heading3,
    List, ListOrdered, Quote, Link2, Image as ImageIcon, Code,
    RotateCcw, RotateCw, ChevronDown, UploadCloud, X,
} from 'lucide-react';
import apiClient from '../../../services/api';

const PURPLE = '#7F56D9';
const BORDER = '#E5E7EB';
const inputStyle = { width: '100%', boxSizing: 'border-box', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', color: '#101828' };
const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/[\s-]+/g, '-').replace(/^-+|-+$/g, '');

const DEFAULT_CATEGORIES = ['Eyewear', 'Style', 'Guides', 'Lens Care', 'News'];

const blank = {
    title: '', slug: '', category: '', author: '', excerpt: '', content: '',
    tags: '', visibility: 'public', status: 'draft', is_featured: false,
    published_date: '', seo_title: '', seo_description: '', thumbnail: null,
};

const Toggle = ({ on, onChange }) => (
    <div onClick={() => onChange(!on)} style={{ width: 40, height: 22, borderRadius: 11, background: on ? PURPLE : '#D0D5DD', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background .15s' }}>
        <div style={{ position: 'absolute', top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .15s', boxShadow: '0 1px 2px rgba(16,24,40,.2)' }} />
    </div>
);

const SideCard = ({ title, action, children }) => (
    <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.03)', overflow: 'hidden', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#101828' }}>{title}</span>
            {action}
        </div>
        <div style={{ padding: '0 16px 16px' }}>{children}</div>
    </div>
);

const sideSelect = { border: 'none', background: 'transparent', fontSize: 14, fontWeight: 600, color: '#101828', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'right', outline: 'none' };

const BlogPostEditor = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = !!id;

    const [b, setB] = useState(blank);
    const [file, setFile] = useState(null);
    const [slugTouched, setSlugTouched] = useState(false);
    const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
    const [tagInput, setTagInput] = useState('');
    const [seoOpen, setSeoOpen] = useState(false);
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const editorRef = useRef(null);
    const fileRef = useRef(null);

    useEffect(() => {
        // Existing categories feed the sidebar checklist.
        apiClient.get('/cms/blogs/', { cache: false })
            .then(res => {
                const list = res.data.results || res.data || [];
                setCategories(prev => [...new Set([...prev, ...list.map(x => x.category).filter(Boolean)])]);
            })
            .catch(() => { });
        if (isEdit) {
            apiClient.get(`/cms/blogs/${id}/`, { cache: false })
                .then(res => {
                    setB({ ...blank, ...res.data, published_date: res.data.published_date || '' });
                    setSlugTouched(true);
                    setCategories(prev => res.data.category && !prev.includes(res.data.category) ? [...prev, res.data.category] : prev);
                    if (editorRef.current) editorRef.current.innerHTML = res.data.content || '';
                })
                .catch(() => { })
                .finally(() => setLoading(false));
        }
    }, [id, isEdit]);

    // Push loaded content into the contentEditable once it exists.
    useEffect(() => {
        if (!loading && editorRef.current && editorRef.current.innerHTML !== (b.content || '')) {
            editorRef.current.innerHTML = b.content || '';
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading]);

    const set = (f, v) => setB(prev => ({ ...prev, [f]: v }));

    const setTitle = (v) => {
        setB(prev => ({ ...prev, title: v, slug: (!slugTouched && !isEdit) ? slugify(v) : prev.slug }));
    };

    const exec = (cmd, val = null) => {
        editorRef.current?.focus();
        document.execCommand(cmd, false, val);
    };
    const insertLink = () => {
        const url = window.prompt('Link URL (https://…)');
        if (url) exec('createLink', url);
    };
    const insertImage = () => {
        const url = window.prompt('Image URL (https://…)');
        if (url) exec('insertImage', url);
    };

    const tags = (b.tags || '').split(',').map(t => t.trim()).filter(Boolean);
    const addTag = () => {
        const t = tagInput.trim().replace(/,+$/, '');
        if (t && !tags.includes(t)) set('tags', [...tags, t].join(', '));
        setTagInput('');
    };
    const removeTag = (t) => set('tags', tags.filter(x => x !== t).join(', '));

    const addCategory = () => {
        const c = window.prompt('New category name');
        if (!c || !c.trim()) return;
        const name = c.trim();
        setCategories(prev => prev.includes(name) ? prev : [...prev, name]);
        set('category', name);
    };

    const save = async (statusVal) => {
        if (!b.title.trim()) { window.alert('Please enter a post title.'); return; }
        setSaving(true);
        try {
            const fd = new FormData();
            ['title', 'category', 'author', 'excerpt', 'tags', 'visibility', 'seo_title', 'seo_description'].forEach(f => fd.append(f, b[f] ?? ''));
            fd.append('slug', slugify(b.slug || ''));
            fd.append('content', editorRef.current ? editorRef.current.innerHTML : (b.content || ''));
            fd.append('status', statusVal);
            fd.append('is_featured', !!b.is_featured);
            const date = b.published_date || (statusVal === 'published' ? new Date().toISOString().slice(0, 10) : '');
            if (date) fd.append('published_date', date);
            if (file) fd.append('thumbnail', file);
            if (isEdit) await apiClient.patch(`/cms/blogs/${id}/`, fd);
            else await apiClient.post('/cms/blogs/', fd);
            navigate('/admin/settings/cms/blogs');
        } catch { /* toast */ } finally { setSaving(false); }
    };

    const thumbPreview = file ? URL.createObjectURL(file) : b.thumbnail;

    const toolbarGroups = [
        [
            { Icon: Bold, title: 'Bold', run: () => exec('bold') },
            { Icon: Italic, title: 'Italic', run: () => exec('italic') },
            { Icon: Underline, title: 'Underline', run: () => exec('underline') },
        ],
        [
            { Icon: Heading1, title: 'Heading 1', run: () => exec('formatBlock', 'H1') },
            { Icon: Heading2, title: 'Heading 2', run: () => exec('formatBlock', 'H2') },
            { Icon: Heading3, title: 'Heading 3', run: () => exec('formatBlock', 'H3') },
        ],
        [
            { Icon: List, title: 'Bullet list', run: () => exec('insertUnorderedList') },
            { Icon: ListOrdered, title: 'Numbered list', run: () => exec('insertOrderedList') },
            { Icon: Quote, title: 'Quote', run: () => exec('formatBlock', 'BLOCKQUOTE') },
        ],
        [
            { Icon: Link2, title: 'Insert link', run: insertLink },
            { Icon: ImageIcon, title: 'Insert image', run: insertImage },
            { Icon: Code, title: 'Code block', run: () => exec('formatBlock', 'PRE') },
        ],
        [
            { Icon: RotateCcw, title: 'Undo', run: () => exec('undo') },
            { Icon: RotateCw, title: 'Redo', run: () => exec('redo') },
        ],
    ];

    if (loading) return <div style={{ padding: 60, fontFamily: 'Roboto, sans-serif', color: '#667085' }}>Loading…</div>;

    return (
        <div style={{ fontFamily: 'Roboto, sans-serif', padding: '0 0 40px' }}>
            <style>{`
                .blog-editor-body:empty:before { content: attr(data-placeholder); color: #9CA3AF; }
                .blog-editor-body:focus { outline: none; }
                .blog-editor-body h1 { font-size: 30px; margin: 8px 0; color: #1a1a1a; }
                .blog-editor-body h2 { font-size: 24px; margin: 8px 0; color: #1a1a1a; }
                .blog-editor-body h3 { font-size: 19px; margin: 8px 0; color: #1a1a1a; }
                .blog-editor-body blockquote { border-left: 4px solid #F84416; background: #FFF7ED; margin: 8px 0; padding: 14px 20px; font-style: italic; font-size: 17px; color: #1a1a1a; }
                .blog-editor-body pre { background: #F2F4F7; border-radius: 8px; padding: 12px 16px; font-family: Consolas, monospace; font-size: 13px; overflow-x: auto; white-space: pre-wrap; }
                .blog-editor-body img { max-width: 100%; border-radius: 8px; }
                .blog-editor-body a { color: ${PURPLE}; }
                .blog-tool-btn:hover { background: #F4EBFF; }
            `}</style>

            {/* Top bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 26px', borderBottom: '1px solid #EAECF0', background: '#fff', position: 'sticky', top: 0, zIndex: 40 }}>
                <div style={{ fontSize: 13, color: '#767676' }}>
                    <span style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/settings/cms/blogs')}>Posts</span>
                    &nbsp;/&nbsp;
                    <span style={{ color: '#101828', fontWeight: 600 }}>{isEdit ? 'Edit Post' : 'New Post'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span title="Preview page coming soon" style={{ fontSize: 14, fontWeight: 600, color: '#98A2B3', textDecoration: 'underline', cursor: 'not-allowed' }}>Preview</span>
                    <button disabled={saving} onClick={() => save('draft')} style={{ height: 40, padding: '0 16px', border: `1px solid ${BORDER}`, borderRadius: 10, background: '#fff', fontSize: 14, fontWeight: 600, color: '#101828', cursor: 'pointer', fontFamily: 'inherit' }}>Save Draft</button>
                    <button disabled={saving} onClick={() => save('published')} style={{ height: 40, padding: '0 16px', border: 'none', borderRadius: 10, background: PURPLE, color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>{saving ? 'Saving…' : 'Publish'}</button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', padding: '24px 26px 0' }}>
                {/* Center column */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <input
                        value={b.title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Enter post title..."
                        style={{ width: '100%', boxSizing: 'border-box', border: 'none', borderBottom: '1px solid #EAECF0', outline: 'none', fontSize: 40, fontWeight: 700, color: '#1a1a1a', padding: '0 0 12px', fontFamily: 'inherit', background: 'transparent' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                        <span style={{ color: '#767676' }}>{window.location.origin}/blogs/</span>
                        <input
                            value={b.slug}
                            onChange={e => { setSlugTouched(true); set('slug', e.target.value); }}
                            onBlur={e => set('slug', slugify(e.target.value))}
                            placeholder="post-slug"
                            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: PURPLE, textDecoration: 'underline', fontFamily: 'inherit', minWidth: 60, width: `${Math.max(8, b.slug.length)}ch` }}
                        />
                    </div>

                    {/* Toolbar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 52, padding: '0 12px', borderBottom: '1px solid #EAECF0', flexWrap: 'wrap' }}>
                        {toolbarGroups.map((grp, gi) => (
                            <React.Fragment key={gi}>
                                {gi > 0 && <div style={{ width: 1, height: 24, background: '#E5E7EB' }} />}
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {grp.map(({ Icon, title, run }) => (
                                        <button key={title} title={title} className="blog-tool-btn"
                                            onMouseDown={e => e.preventDefault()} onClick={run}
                                            style={{ width: 32, height: 32, border: 'none', borderRadius: 8, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475467' }}>
                                            <Icon size={18} />
                                        </button>
                                    ))}
                                </div>
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Editor body */}
                    <div
                        ref={editorRef}
                        className="blog-editor-body"
                        contentEditable
                        suppressContentEditableWarning
                        data-placeholder="Start writing your post…"
                        style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, minHeight: 480, padding: 32, fontSize: 16, lineHeight: 1.7, color: '#575757', width: '100%', boxSizing: 'border-box' }}
                    />

                    {/* SEO & Metadata */}
                    <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
                        <div onClick={() => setSeoOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', cursor: 'pointer', borderBottom: seoOpen ? '1px solid #EAECF0' : 'none' }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#101828' }}>SEO &amp; Metadata</span>
                            <ChevronDown size={18} style={{ color: '#667085', transform: seoOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
                        </div>
                        {seoOpen && (
                            <div style={{ padding: 20 }}>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#667085', marginBottom: 6 }}>Excerpt</label>
                                <textarea rows={2} style={{ ...inputStyle, marginBottom: 14, resize: 'vertical' }} value={b.excerpt} onChange={e => set('excerpt', e.target.value)} placeholder="Short summary shown on blog cards…" />
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#667085', marginBottom: 6 }}>SEO Title</label>
                                <input style={{ ...inputStyle, marginBottom: 14 }} value={b.seo_title} onChange={e => set('seo_title', e.target.value)} />
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#667085', marginBottom: 6 }}>SEO Description</label>
                                <textarea rows={2} style={{ ...inputStyle, resize: 'vertical' }} value={b.seo_description} onChange={e => set('seo_description', e.target.value)} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Right sidebar */}
                <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <SideCard title="Publish">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 14, color: '#767676' }}>Status:</span>
                                <select style={sideSelect} value={b.status} onChange={e => set('status', e.target.value)}>
                                    <option value="draft">Draft</option>
                                    <option value="published">Published</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 14, color: '#767676' }}>Visibility:</span>
                                <select style={sideSelect} value={b.visibility} onChange={e => set('visibility', e.target.value)}>
                                    <option value="public">Public</option>
                                    <option value="private">Private</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                <span style={{ fontSize: 14, color: '#767676', flexShrink: 0 }}>Publish date:</span>
                                <input type="date" value={b.published_date || ''} onChange={e => set('published_date', e.target.value)}
                                    style={{ border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: '#101828', fontFamily: 'inherit', textAlign: 'right', outline: 'none', cursor: 'pointer', minWidth: 0 }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 14, color: '#767676' }}>Featured:</span>
                                <Toggle on={!!b.is_featured} onChange={v => set('is_featured', v)} />
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button disabled={saving} onClick={() => save('draft')} style={{ flex: 1, height: 40, border: `1px solid ${BORDER}`, borderRadius: 10, background: '#fff', fontSize: 14, fontWeight: 600, color: '#101828', cursor: 'pointer', fontFamily: 'inherit' }}>Save Draft</button>
                                <button disabled={saving} onClick={() => save('published')} style={{ flex: 1, height: 40, border: 'none', borderRadius: 10, background: PURPLE, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Publish</button>
                            </div>
                        </div>
                    </SideCard>

                    <SideCard title="Featured Image">
                        <div onClick={() => fileRef.current?.click()} style={{ border: `1px dashed ${thumbPreview ? BORDER : '#D0D5DD'}`, borderRadius: 10, height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', overflow: 'hidden', background: '#fff' }}>
                            {thumbPreview ? (
                                <img src={thumbPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <>
                                    <UploadCloud size={24} style={{ color: '#475467' }} />
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#101828' }}>Click to upload featured image</span>
                                    <span style={{ fontSize: 12, color: '#767676' }}>PNG, JPG up to 5MB</span>
                                </>
                            )}
                            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} />
                        </div>
                    </SideCard>

                    <SideCard title="Categories" action={
                        <button onClick={addCategory} style={{ height: 28, padding: '0 10px', border: 'none', borderRadius: 8, background: '#F4EBFF', color: PURPLE, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>+</button>
                    }>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {categories.map(c => {
                                const on = b.category === c;
                                return (
                                    <div key={c} onClick={() => set('category', on ? '' : c)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                                        <span style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${on ? PURPLE : '#E5E7EB'}`, background: on ? PURPLE : '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>{on ? '✓' : ''}</span>
                                        <span style={{ fontSize: 14, color: '#1a1a1a' }}>{c}</span>
                                    </div>
                                );
                            })}
                            <span onClick={addCategory} style={{ fontSize: 13, fontWeight: 600, color: PURPLE, cursor: 'pointer' }}>+ Add New Category</span>
                        </div>
                    </SideCard>

                    <SideCard title="Tags">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {tags.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {tags.map(t => (
                                        <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F4EBFF', borderRadius: 999, padding: '6px 10px', fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>
                                            {t}
                                            <X size={12} style={{ cursor: 'pointer', color: '#667085' }} onClick={() => removeTag(t)} />
                                        </span>
                                    ))}
                                </div>
                            )}
                            <input
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
                                onBlur={addTag}
                                placeholder="Add a tag..."
                                style={{ ...inputStyle, height: 44, borderRadius: 10 }}
                            />
                        </div>
                    </SideCard>

                    <SideCard title="Author">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F4EBFF', color: PURPLE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
                                {(b.author || 'A').trim().charAt(0).toUpperCase()}
                            </div>
                            <input style={{ ...inputStyle, flex: 1 }} value={b.author} onChange={e => set('author', e.target.value)} placeholder="Author name" />
                        </div>
                    </SideCard>
                </div>
            </div>
        </div>
    );
};

export default BlogPostEditor;
