import type { BlogTermKind } from '@/api/blog';

export interface EditorialTermsConfig {
  kind: BlogTermKind;
  title: string;
  singular: string;
  intro: string;
}

export const BLOG_CATEGORIES_CONFIG: EditorialTermsConfig = {
  kind: 'blog-categories',
  title: 'Blog categories',
  singular: 'Category',
  intro: 'Each article has exactly one category. Landing content is written in Markdown and sanitised before it is stored.',
};

export const BLOG_TAGS_CONFIG: EditorialTermsConfig = {
  kind: 'blog-tags',
  title: 'Blog tags',
  singular: 'Tag',
  intro: 'Optional labels. A tag without landing content is not indexed by search engines.',
};
