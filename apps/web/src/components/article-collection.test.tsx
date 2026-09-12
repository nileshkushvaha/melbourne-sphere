// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PostCard as PostCardData } from '@/lib/api';
import { ArticleCollection, BlogEmptyState } from './article-collection';
import { articleColumns } from './page-shell';
import { post } from '@/test/post-fixture';

const many = (count: number): PostCardData[] => Array.from({ length: count }, (_, index) => post({ id: `p${index}`, slug: `article-${index}`, title: `Article ${index}` }));

describe('articleColumns', () => {
  it('never collapses a row to one full-width column', () => {
    // A single card spanning the 1520px content width is what turned a missing
    // cover into an 850px-tall block on the archive pages.
    for (const count of [1, 2, 3, 12]) expect(articleColumns(count)).not.toContain('grid-cols-1 ');
    expect(articleColumns(1)).toBe('sm:grid-cols-2');
  });

  it('stops at three columns, so a headline still has room to say something', () => {
    expect(articleColumns(3)).toContain('lg:grid-cols-3');
    expect(articleColumns(24)).toBe(articleColumns(3));
    expect(articleColumns(24)).not.toContain('grid-cols-4');
  });
});

describe('ArticleCollection', () => {
  it('gives a lone article the lead layout rather than a stretched grid card', () => {
    const { container } = render(<ArticleCollection posts={many(1)} label="Articles" />);
    // No list wrapper: one article is not a collection to walk through.
    expect(container.querySelector('ul')).toBeNull();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Article 0');
    expect(container.querySelector('.lg\\:grid-cols-\\[minmax\\(0\\,1\\.05fr\\)_minmax\\(0\\,1fr\\)\\]')).toBeInTheDocument();
  });

  it('lists several articles as a named grid at two and three columns', () => {
    const two = render(<ArticleCollection posts={many(2)} label="Articles in City guides" />);
    expect(screen.getByRole('list', { name: 'Articles in City guides' }).className).toContain('sm:grid-cols-2');
    expect(two.container.querySelectorAll('li')).toHaveLength(2);
    two.unmount();

    render(<ArticleCollection posts={many(5)} label="Articles" />);
    expect(screen.getByRole('list', { name: 'Articles' }).className).toContain('lg:grid-cols-3');
  });

  it('passes the archive`s "do not repeat the category" rule through to every card', () => {
    render(<ArticleCollection posts={many(3)} label="Articles" showCategory={false} />);
    expect(screen.queryByText('City guides')).toBeNull();
  });

  it('renders nothing at all when there is nothing to list, so the caller decides what to say', () => {
    const { container } = render(<ArticleCollection posts={[]} label="Articles" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('BlogEmptyState', () => {
  it('states the case and offers a way onwards when there is one', () => {
    render(<BlogEmptyState message="No stories have been published in this category yet." action={{ href: '/blog', label: 'Browse all stories' }} />);
    expect(screen.getByText('No stories have been published in this category yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse all stories' })).toHaveAttribute('href', '/blog');
  });

  it('offers no action when there is nowhere useful to send the reader', () => {
    render(<BlogEmptyState message="No articles have been published yet." />);
    expect(screen.queryByRole('link')).toBeNull();
  });
});
