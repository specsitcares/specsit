import React from 'react';
import { Link } from 'react-router-dom';
import { useHomeData } from '../../../context/HomeDataContext';

const BlogSection = () => {
  const home = useHomeData();
  const section = home?.sections?.our_blog || {};
  const data = (home?.blogs || []).map(b => ({
    tag: b.category, title: b.title, excerpt: b.excerpt, slug: b.slug || b.id, image: b.thumbnail,
  }));
  if (data.length === 0) return null;

  return (
    <section className="blog-section" id="blog-section">
      <div className="blog-section__header">
        {section.title && <h2 className="blog-section__title">{section.title}</h2>}
        {section.subtitle && <p className="blog-section__subtitle">{section.subtitle}</p>}
      </div>
      <div className="blog-section__grid">
        {data.map((p, i) => (
          <Link key={i} to={`/blog/${p.slug}`} className="blog-card">
            <div className="blog-card__img" style={p.image ? { backgroundImage: `url(${p.image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined} />
            <div className="blog-card__body">
              {p.tag && <span className="blog-card__tag">{p.tag}</span>}
              <h3 className="blog-card__title">{p.title}</h3>
              <p className="blog-card__excerpt">{p.excerpt}</p>
              <span className="blog-card__read">Read Article →</span>
            </div>
          </Link>
        ))}
      </div>
      <div className="blog-section__footer">
        <Link to="/blog" className="blog-section__view-all">View All Posts</Link>
      </div>
    </section>
  );
};

export default BlogSection;
