import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import apiClient from '../../../services/api';
import BlogArticle from './BlogArticle';
import '../../../styles/home.css';

const BlogDetailPage = () => {
  const { slug } = useParams();

  const [post, setPost] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    setPost(null);
    apiClient.get(`/cms/blogs/${slug}/`, { cache: false })
      .then(res => {
        setPost(res.data);
        return apiClient.get('/cms/blogs/');
      })
      .then(res => setRelated(res?.data?.results || res?.data || []))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (post?.seo_title || post?.title) document.title = post.seo_title || post.title;
  }, [post]);

  if (loading) return <div className="blog-page"><div className="blog-page__empty">Loading article…</div></div>;
  if (!post) {
    return (
      <div className="blog-page">
        <div className="blog-page__empty">
          Article not found. <Link to="/blog" className="blog-detail__back">← All Posts</Link>
        </div>
      </div>
    );
  }

  // Public article page — no edit affordances; admins edit via the in-admin preview.
  return <BlogArticle post={post} related={related} />;
};

export default BlogDetailPage;
