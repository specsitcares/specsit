import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../../../services/api';
import BlogArticle from '../blog/BlogArticle';

const STATUS_PILL = {
    published: { bg: '#ECFDF3', color: '#027A48', dot: '#12B76A', label: 'Published' },
    draft: { bg: '#F2F4F7', color: '#475467', dot: '#98A2B3', label: 'Draft' },
};

/** In-admin preview of a blog post — renders the storefront article without
 *  leaving the admin dashboard. */
const BlogPreview = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [post, setPost] = useState(null);
    const [related, setRelated] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        setPost(null);
        apiClient.get(`/cms/blogs/${id}/`, { cache: false })
            .then(res => {
                setPost(res.data);
                return apiClient.get('/cms/blogs/', { cache: false });
            })
            .then(res => setRelated(res?.data?.results || res?.data || []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div style={{ padding: 60, fontFamily: 'Roboto, sans-serif', color: '#667085' }}>Loading preview…</div>;
    if (!post) return <div style={{ padding: 60, fontFamily: 'Roboto, sans-serif', color: '#B42318' }}>Could not load this post.</div>;

    const pill = STATUS_PILL[post.status] || STATUS_PILL.draft;

    return (
        <div style={{ fontFamily: 'Roboto, sans-serif' }}>
            {/* Admin breadcrumb bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 26px', borderBottom: '1px solid #EAECF0', background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#64748B' }}>
                    <span style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/settings/cms/blogs')}>Posts</span>
                    &nbsp;/&nbsp;
                    <span style={{ color: '#101828', fontWeight: 600 }}>Preview</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: pill.bg, color: pill.color, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 12 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: pill.dot }} />
                        {pill.label}
                    </span>
                </div>
                <span style={{ fontSize: 13, color: '#98A2B3' }}>This is how the article appears on the storefront.</span>
            </div>

            {/* Storefront article, rendered inside the admin shell */}
            <BlogArticle
                post={post}
                related={related}
                backTo="/admin/settings/cms/blogs"
                backLabel="← All Posts"
                getPostPath={(p) => `/admin/settings/cms/blogs/${p.id}/preview`}
                shareUrl={`${window.location.origin}/blog/${post.slug || post.id}`}
                onEdit={() => navigate(`/admin/settings/cms/blogs/${post.id}/edit`)}
            />
        </div>
    );
};

export default BlogPreview;
