import { describe, expect, it } from 'vitest';
import { isReservedPath, MAX_PATH_LENGTH, normalisePath, RedirectRuleError, validateRedirect } from './redirect-rules.js';

describe('normalisePath', () => {
  it('canonicalises case, duplicate slashes and trailing slashes', () => {
    expect(normalisePath('/Business/Old-Slug/')).toBe('/business/old-slug');
    expect(normalisePath('  /blog//post  ')).toBe('/blog/post');
    expect(normalisePath('/')).toBe('/');
  });

  it('drops query strings and fragments so one stored path matches every variant', () => {
    expect(normalisePath('/business/cafe?utm_source=x')).toBe('/business/cafe');
    expect(normalisePath('/business/cafe#hours')).toBe('/business/cafe');
  });

  it('rejects anything that is not a site-relative path', () => {
    for (const value of ['https://evil.example/x', '//evil.example', 'business/cafe', '\\\\evil', '/a/../../etc', '/a b', '/a%2fb', '/<script>', '']) {
      expect(normalisePath(value), value).toBeNull();
    }
  });

  it('rejects paths longer than the stored column', () => {
    expect(normalisePath(`/${'a'.repeat(MAX_PATH_LENGTH)}`)).toBeNull();
  });
});

describe('isReservedPath', () => {
  it('covers admin, api and framework prefixes only', () => {
    expect(isReservedPath('/admin')).toBe(true);
    expect(isReservedPath('/api/v1/businesses')).toBe(true);
    expect(isReservedPath('/administrators-guide')).toBe(false);
    expect(isReservedPath('/business/cafe')).toBe(false);
  });
});

describe('validateRedirect', () => {
  it('returns the canonical pair', () => {
    expect(validateRedirect('/Business/Old/', '/business/new', 'permanent')).toEqual({ sourcePath: '/business/old', targetPath: '/business/new' });
  });

  it('drops the target for a gone entry', () => {
    expect(validateRedirect('/business/old', '/business/new', 'gone')).toEqual({ sourcePath: '/business/old', targetPath: null });
  });

  it('refuses self-redirects, the home page, reserved paths and cross-origin targets', () => {
    expect(() => validateRedirect('/business/a', '/business/a', 'permanent')).toThrow(RedirectRuleError);
    expect(() => validateRedirect('/', '/business/a', 'permanent')).toThrow(/home page/);
    expect(() => validateRedirect('/admin/x', '/business/a', 'permanent')).toThrow(/reserved/);
    expect(() => validateRedirect('/business/a', '/admin/x', 'permanent')).toThrow(/reserved/);
    expect(() => validateRedirect('/business/a', 'https://evil.example/b', 'permanent')).toThrow(/site-relative/);
    expect(() => validateRedirect('/business/a', null, 'permanent')).toThrow(/site-relative/);
  });
});
