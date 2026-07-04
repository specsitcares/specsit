import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Twitter, Linkedin, Facebook, Link2, Pencil } from 'lucide-react';
import '../../../styles/home.css';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

const ShareIcons = ({ shareUrl }) => {
  const url = shareUrl || (typeof window !== 'undefined' ? window.location.href : '');
  const enc = encodeURIComponent(url);
  const icons = [
    { Icon: Twitter, title: 'Share on X', href: `https://twitter.com/intent/tweet?url=${enc}` },
    { Icon: Linkedin, title: 'Share on LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc}` },
    { Icon: Facebook, title: 'Share on Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${enc}` },
  ];
  return (
    <div className="blog-detail__share-icons">
      {icons.map(({ Icon, title, href }) => (
        <a key={title} href={href} target="_blank" rel="noreferrer" title={title} className="blog-detail__share-icon"><Icon size={18} /></a>
      ))}
      <button title="Copy link" className="blog-detail__share-icon" onClick={() => navigator.clipboard?.writeText(url)}><Link2 size={18} /></button>
    </div>
  );
};

/**
 * Presentational blog article (header, content + ToC sidebar, related posts).
 * Used by the public /blog/:slug page and the in-admin preview.
 */
const BlogArticle = ({
  post,
  related = [],
  backTo = '/blog',
  backLabel = '← All Posts',
  getPostPath = (p) => `/blog/${p.slug || p.id}`,
  shareUrl,
  onEdit,
}) => {
  const [activeSection, setActiveSection] = useState(0);

  // Inject anchor ids into content headings and build the "On this page" ToC.
  const { html, toc } = useMemo(() => {
    if (!post?.content) return { html: post?.excerpt ? `<p>${post.excerpt}</p>` : '', toc: [] };
    const doc = new DOMParser().parseFromString(post.content, 'text/html');
    const heads = [...doc.querySelectorAll('h1, h2, h3')];
    const items = heads.map((h, i) => {
      h.id = `section-${i + 1}`;
      return { id: h.id, text: h.textContent };
    });
    return { html: doc.body.innerHTML, toc: items };
  }, [post]);

  const relatedPosts = useMemo(() => {
    if (!post) return [];
    const others = related.filter(b => b.id !== post.id);
    const sameCat = others.filter(b => b.category && b.category === post.category);
    const rest = others.filter(b => !sameCat.includes(b));
    return [...sameCat, ...rest].slice(0, 3);
  }, [related, post]);

  if (!post) return null;

  return (
    <div className="blog-page blog-detail">
      <Link to={backTo} className="blog-detail__back">{backLabel}</Link>

      {/* Article header */}
      <header className="blog-detail__header">
        {post.category && <span className="blog-detail__category">{post.category}</span>}
        <h1 className="blog-detail__title">{post.title}</h1>
        <div className="blog-detail__meta-row">
          <div className="blog-page__author">
            <span className="blog-page__author-avatar">{(post.author || 'S').trim().charAt(0).toUpperCase()}</span>
            <span className="blog-detail__byline">
              <span className="blog-page__author-name">{post.author || 'Specsit Editorial'}</span>
              {post.published_date && <span className="blog-page__author-date"> · {fmtDate(post.published_date)}</span>}
            </span>
          </div>
          {onEdit && (
            <button className="blog-detail__edit-btn" onClick={onEdit}>
              <Pencil size={14} /> Edit Blog
            </button>
          )}
        </div>
      </header>

      {/* Content + sidebar */}
      <div className="blog-detail__layout">
        <div className="blog-detail__main">
          {post.thumbnail && (
            <div className="blog-detail__hero-img" style={{ backgroundImage: `url(${post.thumbnail})` }} />
          )}
          {/* Content is authored as HTML in the admin blog editor */}
          <article className="blog-detail__content" dangerouslySetInnerHTML={{ __html: html }} />
          {(post.tags || '').trim() && (
            <div className="blog-detail__tags">
              {post.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                <span key={t} className="blog-card__tag">{t}</span>
              ))}
            </div>
          )}
        </div>

        <aside className="blog-detail__sidebar">
          {toc.length > 0 && (
            <div className="blog-detail__toc">
              <span className="blog-detail__sidebar-label">On this page</span>
              {toc.map((item, i) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={`blog-detail__toc-link${activeSection === i ? ' blog-detail__toc-link--active' : ''}`}
                  onClick={(e) => { e.preventDefault(); setActiveSection(i); document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                >
                  {i + 1}. {item.text}
                </a>
              ))}
            </div>
          )}
          <div className="blog-detail__share">
            <span className="blog-detail__sidebar-label">Share article</span>
            <ShareIcons shareUrl={shareUrl} />
          </div>
        </aside>
      </div>

      {/* Related articles */}
      {relatedPosts.length > 0 && (
        <section className="blog-detail__related">
          <h2 className="blog-detail__related-title">Related Articles</h2>
          <div className="blog-page__grid">
            {relatedPosts.map(p => (
              <Link key={p.id} to={getPostPath(p)} className="blog-card">
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
        </section>
      )}
    </div>
  );
};

export default BlogArticle;
