import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../../services/api';
import '../../../styles/home.css';

const PAGE_SIZE = 6;

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

const BlogListingPage = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    window.scrollTo(0, 0);
    apiClient.get('/cms/blogs/')
      .then(res => setBlogs(res.data.results || res.data || []))
      .catch(() => setBlogs([]))
      .finally(() => setLoading(false));
  }, []);

  const featured = blogs.find(b => b.is_featured) || blogs[0];
  const rest = blogs.filter(b => b !== featured);
  const shown = rest.slice(0, visible);

  return (
    <div className="blog-page">
      {/* Hero */}
      <div className="blog-page__hero">
        <h1 className="blog-section__title">Insights &amp; Ideas</h1>
        <p className="blog-section__subtitle">Insights, styling tips, and expert advice to help you choose, wear, and care for your eyewear.</p>
      </div>

      {loading ? (
        <div className="blog-page__empty">Loading articles…</div>
      ) : blogs.length === 0 ? (
        <div className="blog-page__empty">No articles published yet — check back soon.</div>
      ) : (
        <>
          {/* Featured post */}
          {featured && (
            <Link to={`/blog/${featured.slug || featured.id}`} className="blog-page__featured">
              <div
                className="blog-page__featured-img"
                style={featured.thumbnail ? { backgroundImage: `url(${featured.thumbnail})` } : undefined}
              />
              <div className="blog-page__featured-body">
                {featured.category && <span className="blog-card__tag">{featured.category}</span>}
                <h2 className="blog-page__featured-title">{featured.title}</h2>
                <p className="blog-page__featured-excerpt">{featured.excerpt}</p>
                <div className="blog-page__author">
                  <span className="blog-page__author-avatar">{(featured.author || 'S').trim().charAt(0).toUpperCase()}</span>
                  <span className="blog-page__author-meta">
                    <span className="blog-page__author-name">{featured.author || 'Specsit Editorial'}</span>
                    <span className="blog-page__author-date">{fmtDate(featured.published_date)}</span>
                  </span>
                </div>
              </div>
            </Link>
          )}

          {/* Post grid — same cards as the homepage blog section */}
          {shown.length > 0 && (
            <div className="blog-page__grid">
              {shown.map(p => (
                <Link key={p.id} to={`/blog/${p.slug || p.id}`} className="blog-card">
                  <div className="blog-card__img" style={p.thumbnail ? { backgroundImage: `url(${p.thumbnail})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined} />
                  <div className="blog-card__body">
                    {p.category && <span className="blog-card__tag">{p.category}</span>}
                    <h3 className="blog-card__title">{p.title}</h3>
                    <p className="blog-card__excerpt">{p.excerpt}</p>
                    <div className="blog-page__card-footer">
                      <span className="blog-card__read">Read Article →</span>
                      <span className="blog-page__card-date">{fmtDate(p.published_date)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Load more */}
          {visible < rest.length && (
            <div className="blog-page__footer">
              <button className="blog-page__load-more" onClick={() => setVisible(v => v + PAGE_SIZE)}>
                Load More Articles
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BlogListingPage;
