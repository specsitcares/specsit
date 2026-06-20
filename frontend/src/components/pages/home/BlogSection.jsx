import React from 'react';
import { Link } from 'react-router-dom';

const posts = [
  {
    tag: 'Style Guide',
    title: 'How to Choose Frames That Fit Your Face Shape',
    excerpt: 'Understand how different frame styles complement your face shape — from bold to minimal — and find what enhances your look effortlessly.',
    slug: 'choose-frames-face-shape',
  },
  {
    tag: 'Eye Care',
    title: 'Finding the Perfect Fit: Comfort Meets Style',
    excerpt: 'A well-fitted pair of glasses makes all the difference. Learn how to pick frames that feel as good as they look.',
    slug: 'custom-prescription-lenses',
  },
];

const BlogSection = () => (
  <section className="blog-section" id="blog-section">
    <div className="blog-section__header">
      <h2 className="blog-section__title">Our Blog</h2>
      <p className="blog-section__subtitle">Insights, styling tips, and expert advice to help you choose, wear, and care for your eyewear.</p>
    </div>
    <div className="blog-section__grid">
      {posts.map((p, i) => (
        <Link key={i} to={`/blog/${p.slug}`} className="blog-card">
          <div className="blog-card__img" />
          <div className="blog-card__body">
            <span className="blog-card__tag">{p.tag}</span>
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

export default BlogSection;
